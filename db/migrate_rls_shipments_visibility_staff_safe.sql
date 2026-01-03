-- db/migrate_rls_shipments_visibility_staff_safe.sql
-- Purpose: Fix staff shipment visibility + allow SuperAdmin to update users.
-- Safe to run multiple times.
--
-- What this migration does:
-- - Ensures authenticated users can SELECT their own profile row in public.users
--   (required for role checks and helper functions).
-- - Ensures superadmin can SELECT and UPDATE all users (for location edits).
-- - Ensures shipments/events/attachments can be SELECTed by:
--     * superadmin: all rows
--     * everyone else: rows matching their location (origin_location OR destination)
-- - Adds a shipments UPDATE policy for superadmin (needed for shipment management modal).

-- USERS
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';

    -- Any authenticated user can read their own profile.
    EXECUTE 'DROP POLICY IF EXISTS "Users: self select" ON public.users';
    EXECUTE 'CREATE POLICY "Users: self select" ON public.users FOR SELECT TO authenticated USING (id = auth.uid())';

    -- SuperAdmin can view all users.
    EXECUTE 'DROP POLICY IF EXISTS "Users: superadmin select all" ON public.users';
    EXECUTE 'CREATE POLICY "Users: superadmin select all" ON public.users FOR SELECT TO authenticated USING (public.is_superadmin())';

    -- SuperAdmin can update users (e.g., location edits).
    EXECUTE 'DROP POLICY IF EXISTS "Users: superadmin update all" ON public.users';
    EXECUTE 'CREATE POLICY "Users: superadmin update all" ON public.users FOR UPDATE TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())';
  END IF;
END
$$;

-- SHIPMENTS
DO $$
BEGIN
  IF to_regclass('public.shipments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY';

    -- Replace select policy with one that guarantees superadmin sees all,
    -- and other users are location-scoped.
    EXECUTE 'DROP POLICY IF EXISTS "shipments_select_location_or_admin" ON public.shipments';
    EXECUTE 'DROP POLICY IF EXISTS "shipments_select_location_or_superadmin" ON public.shipments';

    EXECUTE '
      CREATE POLICY "shipments_select_location_or_superadmin" ON public.shipments
      FOR SELECT TO authenticated
      USING (
        public.is_superadmin()
        OR (
          public.current_user_location() IS NOT NULL
          AND (
            origin_location = public.current_user_location()
            OR destination = public.current_user_location()
          )
        )
      )
    ';

    -- SuperAdmin can update shipments (used by shipment management modal).
    EXECUTE 'DROP POLICY IF EXISTS "shipments_update_superadmin" ON public.shipments';
    EXECUTE '
      CREATE POLICY "shipments_update_superadmin" ON public.shipments
      FOR UPDATE TO authenticated
      USING (public.is_superadmin())
      WITH CHECK (public.is_superadmin())
    ';
  END IF;
END
$$;

-- SHIPMENT EVENTS
DO $$
BEGIN
  IF to_regclass('public.shipment_events') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Shipment events: select authenticated" ON public.shipment_events';
    EXECUTE '
      CREATE POLICY "Shipment events: select authenticated" ON public.shipment_events
      FOR SELECT TO authenticated
      USING (
        public.is_superadmin()
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

-- SHIPMENT ATTACHMENTS
DO $$
BEGIN
  IF to_regclass('public.shipment_attachments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipment_attachments ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Shipment attachments: select authenticated" ON public.shipment_attachments';
    EXECUTE '
      CREATE POLICY "Shipment attachments: select authenticated" ON public.shipment_attachments
      FOR SELECT TO authenticated
      USING (
        public.is_superadmin()
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
