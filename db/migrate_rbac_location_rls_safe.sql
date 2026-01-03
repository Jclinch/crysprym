-- db/migrate_rbac_location_rls_safe.sql
-- Purpose: Non-destructive RBAC + location + RLS hardening.
-- Safe to run multiple times.
--
-- What it does:
-- - Ensures public.users exists, and has role + location columns
-- - Ensures role constraint accepts: user, admin, superadmin
-- - Creates helper functions: is_admin, is_superadmin, current_user_location
-- - Enables RLS and (re)creates SELECT policies for users/shipments/events/attachments

-- 1) Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Ensure public.users table exists (non-destructive)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  last_sign_in_at timestamptz,
  role text DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'superadmin'::text])),
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Add role/location columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN role text DEFAULT 'user'::text
      CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'superadmin'::text]));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.users ADD COLUMN location text;
  END IF;
END
$$;

-- 4) Ensure role constraint accepts superadmin (safe)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check
      CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'superadmin'::text]));
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END
$$;

-- 5) Keep updated_at in sync on users
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_updated_at_users ON public.users';
    EXECUTE 'CREATE TRIGGER trg_set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.fn_set_updated_at()';
  END IF;
END
$$;

-- 6) Helper functions used by RLS
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_location() RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT u.location FROM public.users u WHERE u.id = auth.uid();
$$;

-- 7) RLS: public.users
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';

    -- SuperAdmin can view all users
    EXECUTE 'DROP POLICY IF EXISTS "Users: admin select all" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS "Users: superadmin select all" ON public.users';
    EXECUTE 'CREATE POLICY "Users: superadmin select all" ON public.users FOR SELECT TO authenticated USING (public.is_superadmin())';

    -- SuperAdmin can update users (e.g., role/location management)
    EXECUTE 'DROP POLICY IF EXISTS "Users: superadmin update all" ON public.users';
    EXECUTE 'CREATE POLICY "Users: superadmin update all" ON public.users FOR UPDATE TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())';
  END IF;
END
$$;

-- 8) RLS: Shipments SELECT policy (location-based for users; admin/superadmin can read all)
DO $$
BEGIN
  IF to_regclass('public.shipments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Shipments: select own" ON public.shipments';
    EXECUTE 'DROP POLICY IF EXISTS "Shipments: admin select all" ON public.shipments';
    EXECUTE 'DROP POLICY IF EXISTS "shipments_select_authenticated" ON public.shipments';
    EXECUTE 'DROP POLICY IF EXISTS "shipments_select_location_or_admin" ON public.shipments';

    EXECUTE '
      CREATE POLICY "shipments_select_location_or_admin" ON public.shipments
      FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR (
          public.current_user_location() IS NOT NULL
          AND (
            origin_location = public.current_user_location()
            OR destination = public.current_user_location()
          )
        )
      )
    ';
  END IF;
END
$$;

-- 9) RLS: Shipment Events SELECT policy
DO $$
BEGIN
  IF to_regclass('public.shipment_events') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Shipment events: select by shipment owner" ON public.shipment_events';
    EXECUTE 'DROP POLICY IF EXISTS "Shipment events: select authenticated" ON public.shipment_events';

    EXECUTE '
      CREATE POLICY "Shipment events: select authenticated" ON public.shipment_events
      FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.shipments s
          WHERE s.id = shipment_events.shipment_id
            AND public.current_user_location() IS NOT NULL
            AND (
              s.origin_location = public.current_user_location()
              OR s.destination = public.current_user_location()
            )
        )
      )
    ';
  END IF;
END
$$;

-- 10) RLS: Shipment Attachments SELECT policy
DO $$
BEGIN
  IF to_regclass('public.shipment_attachments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipment_attachments ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Shipment attachments: select by shipment owner" ON public.shipment_attachments';
    EXECUTE 'DROP POLICY IF EXISTS "Shipment attachments: select authenticated" ON public.shipment_attachments';

    EXECUTE '
      CREATE POLICY "Shipment attachments: select authenticated" ON public.shipment_attachments
      FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.shipments s
          WHERE s.id = shipment_attachments.shipment_id
            AND public.current_user_location() IS NOT NULL
            AND (
              s.origin_location = public.current_user_location()
              OR s.destination = public.current_user_location()
            )
        )
      )
    ';
  END IF;
END
$$;

-- 11) Promote a specific account to SuperAdmin (safe upsert)
-- Note: This expects the auth user to already exist in auth.users.
DO $$
BEGIN
  -- If profile row exists (email present), update it.
  IF to_regclass('public.users') IS NOT NULL THEN
    UPDATE public.users
      SET role = 'superadmin', updated_at = now()
    WHERE lower(email) = lower('officialsunnyugwu@gmail.com');
  END IF;

  -- If the auth user exists, ensure a profile row exists + is superadmin.
  IF to_regclass('auth.users') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    INSERT INTO public.users (id, email, role, created_at, updated_at)
    SELECT au.id, au.email, 'superadmin', now(), now()
    FROM auth.users au
    WHERE lower(au.email) = lower('officialsunnyugwu@gmail.com')
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          role = 'superadmin',
          updated_at = now();
  END IF;
END
$$;
