-- db/migrate_locations_table_safe.sql
-- Purpose: Move locations into a DB-managed table and seed initial values.
-- Safe to run multiple times.

BEGIN;

-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure updated_at trigger exists (fn_set_updated_at is used elsewhere in this project)
DO $$
BEGIN
  IF to_regprocedure('public.fn_set_updated_at()') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'trg_set_updated_at_locations'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_set_updated_at_locations BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE PROCEDURE public.fn_set_updated_at()';
    END IF;
  END IF;
END
$$;

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "locations_select_authenticated" ON public.locations;
CREATE POLICY "locations_select_authenticated" ON public.locations
  FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "locations_superadmin_select_all" ON public.locations;
CREATE POLICY "locations_superadmin_select_all" ON public.locations
  FOR SELECT TO authenticated
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "locations_superadmin_insert" ON public.locations;
CREATE POLICY "locations_superadmin_insert" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "locations_superadmin_update" ON public.locations;
CREATE POLICY "locations_superadmin_update" ON public.locations
  FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "locations_superadmin_delete" ON public.locations;
CREATE POLICY "locations_superadmin_delete" ON public.locations
  FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- Seed initial values (from lib/locations.ts)
INSERT INTO public.locations (name)
VALUES
  ('ASC-BLAST CARE-IYANA-IPAJA'),
  ('ASC-BREVA-SANGO'),
  ('ASC-EJIGBO-EJIGBO'),
  ('ASC-G-CARE-IYANA-IPAJA'),
  ('ASC-INNIVE-ALABA'),
  ('ASC-JUMIKE-MERAN'),
  ('ASC-MWH-ADENIYI JONES'),
  ('ASC-SGV-AGBADO'),
  ('ASC-SULIT HUB-AYOBO'),
  ('ASC-SULIT HUB-SANGO'),
  ('ASC-TECHWITCH -AKOWONJO'),
  ('ASC-VANAPLUS-OJUORE')
ON CONFLICT (name) DO UPDATE SET
  is_active = EXCLUDED.is_active;

COMMIT;
