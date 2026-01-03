-- db/migrate_rls_admin_shipments_select_safe.sql
-- Purpose: Restore shipment visibility for admin staff without granting update powers.
-- Safe to run multiple times.
--
-- Summary:
-- - Admin + SuperAdmin can SELECT all shipments/events/attachments.
-- - Regular users remain location-scoped (origin_location/destination must match profile location).
-- - Shipment UPDATE remains SuperAdmin-only (handled in other migrations/policies).

-- SHIPMENTS: SELECT policy for staff
DO $$
BEGIN
  IF to_regclass('public.shipments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY';

    -- Drop any previous variants of the select policy.
    EXECUTE 'DROP POLICY IF EXISTS "shipments_select_location_or_superadmin" ON public.shipments';
    EXECUTE 'DROP POLICY IF EXISTS "shipments_select_location_or_admin" ON public.shipments';

    -- Staff can read all; otherwise location-scoped.
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

-- SHIPMENT EVENTS: SELECT policy for staff
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

-- SHIPMENT ATTACHMENTS: SELECT policy for staff
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
