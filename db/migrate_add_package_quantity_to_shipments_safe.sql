-- Adds package_quantity to public.shipments and updates dependent views.
-- Safe to run multiple times.

BEGIN;

-- 1) Add the column
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS package_quantity integer;

-- 2) Backfill existing rows
UPDATE public.shipments
SET package_quantity = 1
WHERE package_quantity IS NULL;

-- 3) Enforce constraints
ALTER TABLE public.shipments
  ALTER COLUMN package_quantity SET DEFAULT 1;

ALTER TABLE public.shipments
  ALTER COLUMN package_quantity SET NOT NULL;

-- Ensure positive quantities (use NOT VALID then validate for safety on large tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shipments_package_quantity_positive'
  ) THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT shipments_package_quantity_positive
      CHECK (package_quantity >= 1) NOT VALID;

    ALTER TABLE public.shipments
      VALIDATE CONSTRAINT shipments_package_quantity_positive;
  END IF;
END $$;

-- 4) Update views that are used by APIs/UI

-- IMPORTANT: Postgres does not allow CREATE OR REPLACE VIEW to change
-- existing view column order/names. Drop then recreate to avoid 42P16.
DROP VIEW IF EXISTS public.v_shipments_history_list CASCADE;
DROP VIEW IF EXISTS public.v_shipments_with_latest_event CASCADE;

-- View used by history lists (latest event fields)
CREATE VIEW public.v_shipments_history_list AS
SELECT
  s.id,
  s.user_id,
  s.tracking_number,
  s.origin_location,
  s.destination,
  s.items_description,
  s.weight,
  s.status,
  s.progress_step,
  s.created_at,
  le.latest_event_time,
  le.latest_event_type,
  le.latest_event_description,
  le.latest_event_location,
  s.package_quantity
FROM
  public.shipments s
  LEFT JOIN LATERAL (
    SELECT
      se.event_time AS latest_event_time,
      se.event_type AS latest_event_type,
      se.description AS latest_event_description,
      se.location AS latest_event_location
    FROM
      public.shipment_events se
    WHERE
      se.shipment_id = s.id
    ORDER BY
      se.event_time DESC
    LIMIT 1
  ) le ON true;

-- View used by tracking API (latest event + core shipment fields)
CREATE VIEW public.v_shipments_with_latest_event AS
SELECT
  s.id,
  s.user_id,
  s.tracking_number,
  s.sender_name,
  s.receiver_name,
  s.origin_location,
  s.destination,
  s.items_description,
  s.weight,
  s.package_image_url,
  s.status,
  s.progress_step,
  s.metadata,
  s.created_at,
  s.updated_at,
  le.latest_event_time,
  le.latest_event_type,
  le.latest_event_description,
  le.latest_event_location,
  s.package_quantity
FROM
  public.shipments s
  LEFT JOIN LATERAL (
    SELECT
      se.event_time AS latest_event_time,
      se.event_type AS latest_event_type,
      se.description AS latest_event_description,
      se.location AS latest_event_location
    FROM
      public.shipment_events se
    WHERE
      se.shipment_id = s.id
    ORDER BY
      se.event_time DESC
    LIMIT 1
  ) le ON true;

GRANT SELECT ON public.v_shipments_history_list TO authenticated;
GRANT SELECT ON public.v_shipments_with_latest_event TO authenticated;

COMMIT;
