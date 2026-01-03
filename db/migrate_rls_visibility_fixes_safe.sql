-- db/migrate_rls_visibility_fixes_safe.sql
-- Purpose: Non-destructive RLS fixes to restore visibility of shipments and allow
--          profiles to be read/updated appropriately.
-- Safe to run multiple times.
--
-- Fixes included:
-- 1) Allow every authenticated user to SELECT their own row in public.users
--    (needed for role-based routing and API role checks).
-- 2) Allow superadmin to UPDATE users (needed for editing existing users' location).
-- 3) Ensure shipments/events/attachments SELECT policies exist and allow
--    admin/superadmin to read all shipments.

-- USERS: enable RLS + policies
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';

    -- Self profile read (role checks depend on this)
    EXECUTE 'DROP POLICY IF EXISTS "Users: self select" ON public.users';
    EXECUTE 'CREATE POLICY "Users: self select" ON public.users FOR SELECT TO authenticated USING (id = auth.uid())';

    -- SuperAdmin can view all users
    EXECUTE 'DROP POLICY IF EXISTS "Users: superadmin select all" ON public.users';
    EXECUTE 'CREATE POLICY "Users: superadmin select all" ON public.users FOR SELECT TO authenticated USING (public.is_superadmin())';

    -- SuperAdmin can update users (e.g., location edits)
    EXECUTE 'DROP POLICY IF EXISTS "Users: superadmin update all" ON public.users';
    EXECUTE 'CREATE POLICY "Users: superadmin update all" ON public.users FOR UPDATE TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())';
  END IF;
END
$$;

-- SHIPMENTS: enable RLS + SELECT policy
DO $$
BEGIN
  IF to_regclass('public.shipments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY';

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

-- SHIPMENT EVENTS: enable RLS + SELECT policy
DO $$
BEGIN
  IF to_regclass('public.shipment_events') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY';

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

-- SHIPMENT ATTACHMENTS: enable RLS + SELECT policy
DO $$
BEGIN
  IF to_regclass('public.shipment_attachments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipment_attachments ENABLE ROW LEVEL SECURITY';

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
