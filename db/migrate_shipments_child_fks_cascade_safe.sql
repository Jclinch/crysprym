-- Safe migration: ensure shipments child FKs cascade
-- Fixes deletion failures like:
--   update or delete on table "shipments" violates foreign key constraint
--   "shipment_events_shipment_id_fkey" on table "shipment_events"
--
-- Run in Supabase SQL editor as a DB admin.

BEGIN;

-- shipment_events(shipment_id) -> shipments(id)
ALTER TABLE public.shipment_events
  DROP CONSTRAINT IF EXISTS shipment_events_shipment_id_fkey;

ALTER TABLE public.shipment_events
  ADD CONSTRAINT shipment_events_shipment_id_fkey
  FOREIGN KEY (shipment_id)
  REFERENCES public.shipments(id)
  ON DELETE CASCADE;

-- shipment_attachments(shipment_id) -> shipments(id)
ALTER TABLE public.shipment_attachments
  DROP CONSTRAINT IF EXISTS shipment_attachments_shipment_id_fkey;

ALTER TABLE public.shipment_attachments
  ADD CONSTRAINT shipment_attachments_shipment_id_fkey
  FOREIGN KEY (shipment_id)
  REFERENCES public.shipments(id)
  ON DELETE CASCADE;

COMMIT;
