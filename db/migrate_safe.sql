-- Safe, non-destructive migration script for existing database
-- This script only adds missing items and won't drop/delete any existing data

-- ============================================
-- 1. CREATE ENUMS (if not exist)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_progress_step') THEN
    CREATE TYPE public.shipment_progress_step AS ENUM ('pending','in_transit','out_for_delivery','delivered');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_status') THEN
    CREATE TYPE public.shipment_status AS ENUM ('draft','created','confirmed','in_transit','delivered','cancelled','returned');
  END IF;
END
$$;

-- ============================================
-- 2. CREATE TABLES (if not exist)
-- ============================================

-- Table: public.users
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

-- Table: public.shipments
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  sender_name text,
  sender_contact jsonb,
  receiver_name text,
  receiver_contact jsonb,
  items_description text,
  weight numeric,
  origin_location text,
  destination text,
  package_image_bucket text,
  package_image_path text,
  package_image_url text,
  tracking_number text UNIQUE,
  status public.shipment_status DEFAULT 'created'::public.shipment_status,
  progress_step public.shipment_progress_step DEFAULT 'pending'::public.shipment_progress_step,
  metadata jsonb DEFAULT '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: public.shipment_events
CREATE TABLE IF NOT EXISTS public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid,
  event_type text,
  description text,
  location text,
  created_by uuid,
  event_time timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table: public.shipment_attachments
CREATE TABLE IF NOT EXISTS public.shipment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid,
  bucket text,
  path text,
  url text,
  filename text,
  size_bytes integer,
  mime_type text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table: public.shipment_event_type_map
CREATE TABLE IF NOT EXISTS public.shipment_event_type_map (
  event_type text PRIMARY KEY,
  progress_step public.shipment_progress_step
);

-- ============================================
-- 3. ADD MISSING COLUMNS (safe - only if not exist)
-- ============================================
DO $$
BEGIN
  -- Add progress_step to shipments if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shipments' AND column_name = 'progress_step') THEN
    ALTER TABLE public.shipments ADD COLUMN progress_step public.shipment_progress_step DEFAULT 'pending'::public.shipment_progress_step;
  END IF;

  -- Add location to shipment_events if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shipment_events' AND column_name = 'location') THEN
    ALTER TABLE public.shipment_events ADD COLUMN location text;
  END IF;

  -- Add role to users if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role text DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'superadmin'::text]));
  END IF;

  -- Add location to users if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'location') THEN
    ALTER TABLE public.users ADD COLUMN location text;
  END IF;
END
$$;

-- Ensure role constraint accepts superadmin (safe)
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

-- ============================================
-- 4. ADD FOREIGN KEYS (safe - only if not exist)
-- ============================================
DO $$
BEGIN
  -- shipment_events -> shipments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shipment_events_shipment_id_fkey' AND table_name = 'shipment_events'
  ) THEN
    ALTER TABLE public.shipment_events
      ADD CONSTRAINT shipment_events_shipment_id_fkey 
      FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;
  END IF;

  -- shipment_attachments -> shipments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shipment_attachments_shipment_id_fkey' AND table_name = 'shipment_attachments'
  ) THEN
    ALTER TABLE public.shipment_attachments
      ADD CONSTRAINT shipment_attachments_shipment_id_fkey 
      FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;
  END IF;

  -- shipments -> auth.users (user_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shipments_user_id_fkey' AND table_name = 'shipments'
  ) THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT shipments_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- shipment_events -> auth.users (created_by)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shipment_events_created_by_fkey' AND table_name = 'shipment_events'
  ) THEN
    ALTER TABLE public.shipment_events
      ADD CONSTRAINT shipment_events_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- ============================================
-- 5. CREATE INDEXES (safe - IF NOT EXISTS)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments(created_at);
CREATE INDEX IF NOT EXISTS idx_shipments_progress_step ON public.shipments(progress_step);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON public.shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_event_time ON public.shipment_events(event_time);
CREATE INDEX IF NOT EXISTS idx_shipment_attachments_shipment_id ON public.shipment_attachments(shipment_id);

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================

-- Create (or ensure) a sequence used for non-repeating 7-digit tracking IDs
CREATE SEQUENCE IF NOT EXISTS shipment_tracking_seq START 100000;

-- Bound the sequence so we never repeat within 7 digits.
-- This guarantees uniqueness for 9,999,999 generated IDs (no cycling).
ALTER SEQUENCE shipment_tracking_seq MINVALUE 1 MAXVALUE 9999999 NO CYCLE;

-- Function to get current user id
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT auth.uid();
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

-- Function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Function to get current user's assigned location
CREATE OR REPLACE FUNCTION public.current_user_location() RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT u.location FROM public.users u WHERE u.id = auth.uid();
$$;

-- Function to set updated_at timestamp
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to generate tracking number
CREATE OR REPLACE FUNCTION public.fn_generate_tracking_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val bigint;
  prefix text := 'CRY';
  modulus bigint := 10000000; -- 10^7
  multiplier bigint := 48271; -- coprime with 10^7
  scrambled bigint;
  digits text;
BEGIN
  IF NEW.tracking_number IS NOT NULL AND NEW.tracking_number <> '' AND NEW.tracking_number <> 'not-assigned' THEN
    RETURN NEW;
  END IF;

  seq_val := nextval('shipment_tracking_seq');

  -- Generate a 7-digit, non-repeating value by applying a bijection over 0..9,999,999.
  -- With the sequence bounded to 1..9,999,999 and NO CYCLE, this will not repeat.
  scrambled := (multiplier * seq_val) % modulus;
  digits := lpad(scrambled::text, 7, '0');

  -- Example: CRY-123-4567  (CRY-{3 digits}-{4 digits})
  NEW.tracking_number := prefix || '-' || substr(digits, 1, 3) || '-' || substr(digits, 4, 4);
  RETURN NEW;
END;
$$;

-- Function to sync progress_step from events
CREATE OR REPLACE FUNCTION public.fn_sync_shipment_progress_step()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mapped_step public.shipment_progress_step;
BEGIN
  -- Look up the progress_step from the event_type_map
  SELECT progress_step INTO mapped_step
  FROM public.shipment_event_type_map
  WHERE event_type = NEW.event_type;
  
  -- If found, update the shipment's progress_step
  IF mapped_step IS NOT NULL THEN
    UPDATE public.shipments
    SET progress_step = mapped_step, updated_at = now()
    WHERE id = NEW.shipment_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 8. CREATE TRIGGERS (drop first if exist, then create)
-- ============================================
DROP TRIGGER IF EXISTS trg_set_updated_at_shipments ON public.shipments;
CREATE TRIGGER trg_set_updated_at_shipments
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_users ON public.users;
CREATE TRIGGER trg_set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_generate_tracking_number ON public.shipments;
CREATE TRIGGER trg_generate_tracking_number
  BEFORE INSERT ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_tracking_number();

DROP TRIGGER IF EXISTS trg_sync_progress_step_on_event ON public.shipment_events;
CREATE TRIGGER trg_sync_progress_step_on_event
  AFTER INSERT ON public.shipment_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_shipment_progress_step();

-- ============================================
-- 9. SEED EVENT TYPE MAP (upsert)
-- ============================================
INSERT INTO public.shipment_event_type_map (event_type, progress_step) VALUES
  ('pending', 'pending'),
  ('in_transit', 'in_transit'),
  ('out_for_delivery', 'out_for_delivery'),
  ('delivered', 'delivered'),
  ('created', 'pending'),
  ('confirmed', 'pending'),
  ('picked_up', 'in_transit'),
  ('departed', 'in_transit'),
  ('arrived', 'in_transit'),
  ('customs', 'in_transit')
ON CONFLICT (event_type) DO UPDATE SET progress_step = EXCLUDED.progress_step;

-- ============================================
-- 10. RLS POLICIES - Users
-- ============================================
DROP POLICY IF EXISTS "Users: select own profile" ON public.users;
CREATE POLICY "Users: select own profile" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users: update own profile" ON public.users;
CREATE POLICY "Users: update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users: insert own profile" ON public.users;
CREATE POLICY "Users: insert own profile" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- SuperAdmin can view all users
DROP POLICY IF EXISTS "Users: admin select all" ON public.users;
DROP POLICY IF EXISTS "Users: superadmin select all" ON public.users;
CREATE POLICY "Users: superadmin select all" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_superadmin());

-- ============================================
-- 11. RLS POLICIES - Shipments
-- ============================================
DROP POLICY IF EXISTS "Shipments: select own" ON public.shipments;
DROP POLICY IF EXISTS "Shipments: admin select all" ON public.shipments;
DROP POLICY IF EXISTS "shipments_select_authenticated" ON public.shipments;
DROP POLICY IF EXISTS "shipments_select_location_or_admin" ON public.shipments;

-- Allow SELECT only for shipments sent from or to the user's location;
-- admins/superadmins can read all shipments.
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
  );

DROP POLICY IF EXISTS "Shipments: insert own" ON public.shipments;
CREATE POLICY "Shipments: insert own" ON public.shipments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Shipments: update own" ON public.shipments;
CREATE POLICY "Shipments: update own" ON public.shipments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Shipments: delete own" ON public.shipments;
CREATE POLICY "Shipments: delete own" ON public.shipments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admin policies for shipments
DROP POLICY IF EXISTS "Shipments: admin select all" ON public.shipments;
CREATE POLICY "Shipments: admin select all" ON public.shipments
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Shipments: admin update all" ON public.shipments;
CREATE POLICY "Shipments: admin update all" ON public.shipments
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Shipments: admin delete all" ON public.shipments;
CREATE POLICY "Shipments: admin delete all" ON public.shipments
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================
-- 12. RLS POLICIES - Shipment Events
-- ============================================
DROP POLICY IF EXISTS "Shipment events: select by shipment owner" ON public.shipment_events;
DROP POLICY IF EXISTS "Shipment events: select authenticated" ON public.shipment_events;

CREATE POLICY "Shipment events: select authenticated" ON public.shipment_events
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.shipments s
      WHERE s.id = shipment_id
        AND public.current_user_location() IS NOT NULL
        AND (s.origin_location = public.current_user_location() OR s.destination = public.current_user_location())
    )
  );

DROP POLICY IF EXISTS "Shipment events: insert by shipment owner or creator" ON public.shipment_events;
CREATE POLICY "Shipment events: insert by shipment owner or creator" ON public.shipment_events
  FOR INSERT TO authenticated
  WITH CHECK (
    (created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shipment events: update by owner/creator" ON public.shipment_events;
CREATE POLICY "Shipment events: update by owner/creator" ON public.shipment_events
  FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shipment events: delete by owner/creator" ON public.shipment_events;
CREATE POLICY "Shipment events: delete by owner/creator" ON public.shipment_events
  FOR DELETE TO authenticated
  USING (
    (created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.user_id = auth.uid()
    )
  );

-- Admin policies for events
DROP POLICY IF EXISTS "Shipment events: admin select all" ON public.shipment_events;
CREATE POLICY "Shipment events: admin select all" ON public.shipment_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Shipment events: admin insert" ON public.shipment_events;
CREATE POLICY "Shipment events: admin insert" ON public.shipment_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Shipment events: admin update" ON public.shipment_events;
CREATE POLICY "Shipment events: admin update" ON public.shipment_events
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- ============================================
-- 13. RLS POLICIES - Shipment Attachments
-- ============================================
DROP POLICY IF EXISTS "Shipment attachments: select by shipment owner" ON public.shipment_attachments;
DROP POLICY IF EXISTS "Shipment attachments: select authenticated" ON public.shipment_attachments;

CREATE POLICY "Shipment attachments: select authenticated" ON public.shipment_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.shipments s
      WHERE s.id = shipment_id
        AND public.current_user_location() IS NOT NULL
        AND (s.origin_location = public.current_user_location() OR s.destination = public.current_user_location())
    )
  );

DROP POLICY IF EXISTS "Shipment attachments: insert by shipment owner" ON public.shipment_attachments;
CREATE POLICY "Shipment attachments: insert by shipment owner" ON public.shipment_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shipment attachments: update by shipment owner" ON public.shipment_attachments;
CREATE POLICY "Shipment attachments: update by shipment owner" ON public.shipment_attachments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shipment attachments: delete by shipment owner" ON public.shipment_attachments;
CREATE POLICY "Shipment attachments: delete by shipment owner" ON public.shipment_attachments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.user_id = auth.uid()
    )
  );

-- Admin policies for attachments
DROP POLICY IF EXISTS "Shipment attachments: admin select all" ON public.shipment_attachments;
CREATE POLICY "Shipment attachments: admin select all" ON public.shipment_attachments
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ============================================
-- 14. CREATE VIEW FOR SHIPMENT HISTORY (replace if exists)
-- ============================================
CREATE OR REPLACE VIEW public.v_shipments_history_list AS
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
  le.latest_event_location
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

-- Grant access to the view
GRANT SELECT ON public.v_shipments_history_list TO authenticated;

-- ============================================
-- 15. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.shipments TO authenticated;
GRANT ALL ON public.shipment_events TO authenticated;
GRANT ALL ON public.shipment_attachments TO authenticated;
GRANT SELECT ON public.shipment_event_type_map TO authenticated;

-- Done!
-- This script is safe to run multiple times on an existing database.
