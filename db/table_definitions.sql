create table public.shipment_attachments (
  shipment_id uuid null,
  bucket text null,
  path text null,
  url text null,
  filename text null,
  size_bytes integer null,
  mime_type text null,
  id uuid not null default gen_random_uuid (),
  meta jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint shipment_attachments_pkey primary key (id),
  constraint shipment_attachments_shipment_id_fkey foreign KEY (shipment_id) references shipments (id)
) TABLESPACE pg_default;

create index IF not exists idx_shipment_attachments_shipment_id on public.shipment_attachments using btree (shipment_id) TABLESPACE pg_default;

--------

create table public.shipment_event_type_map (
  event_type text not null,
  progress_step public.shipment_progress_step null,
  constraint shipment_event_type_map_pkey primary key (event_type)
) TABLESPACE pg_default;

------

create table public.shipment_events (
  shipment_id uuid null,
  event_type text null,
  description text null,
  location text null,
  created_by uuid null,
  id uuid not null default gen_random_uuid (),
  event_time timestamp with time zone null default now(),
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint shipment_events_pkey primary key (id),
  constraint shipment_events_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint shipment_events_shipment_id_fkey foreign KEY (shipment_id) references shipments (id)
) TABLESPACE pg_default;

create index IF not exists idx_shipment_events_shipment_id on public.shipment_events using btree (shipment_id) TABLESPACE pg_default;

create index IF not exists idx_shipment_events_event_time on public.shipment_events using btree (event_time) TABLESPACE pg_default;

create trigger trg_sync_progress_step_on_event
after INSERT on shipment_events for EACH row
execute FUNCTION fn_sync_shipment_progress_step ();

-------------

create table public.shipments (
  progress_step public.shipment_progress_step null default 'pending'::shipment_progress_step,
  id uuid not null default gen_random_uuid (),
  status public.shipment_status null default 'created'::shipment_status,
  metadata jsonb null default '{}'::jsonb,
  user_id uuid null,
  sender_name text null,
  sender_contact jsonb null,
  receiver_name text null,
  receiver_contact jsonb null,
  items_description text null,
  weight numeric null,
  origin_location text null,
  destination text null,
  package_image_bucket text null,
  package_image_path text null,
  package_image_url text null,
  tracking_number text null,
  deleted_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint shipments_pkey primary key (id),
  constraint shipments_tracking_number_key unique (tracking_number),
  constraint shipments_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_shipments_user_id on public.shipments using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_shipments_tracking_number on public.shipments using btree (tracking_number) TABLESPACE pg_default;

create index IF not exists idx_shipments_created_at on public.shipments using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_shipments_progress_step on public.shipments using btree (progress_step) TABLESPACE pg_default;

create index IF not exists idx_shipments_status on public.shipments using btree (status) TABLESPACE pg_default;

create trigger trg_generate_tracking_number BEFORE INSERT on shipments for EACH row
execute FUNCTION fn_generate_tracking_number ();

create trigger trg_set_updated_at_shipments BEFORE
update on shipments for EACH row
execute FUNCTION fn_set_updated_at ();

--------------------

-- Enable Row Level Security for shipments and add policies
alter table public.shipments enable row level security;

-- Allow service role to perform all actions (server-side operations)
do $$
begin
  create policy "Service role can manage shipments"
  on public.shipments
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
exception when duplicate_object then
  null;
end $$;

-- Allow authenticated users to insert rows for themselves
do $$
begin
  create policy "Authenticated users can insert own shipments"
  on public.shipments
  for insert
  with check (user_id = auth.uid());
exception when duplicate_object then
  null;
end $$;

-- Allow authenticated users to select their own shipments
do $$
begin
  create policy "shipments_select_location_or_admin"
  on public.shipments
  for select
  to authenticated
  using (true);
exception when duplicate_object then
  null;
end $$;

-- Optional: allow authenticated users to update their own shipments (if needed later)
do $$
begin
  create policy "Authenticated users can update own shipments"
  on public.shipments
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
exception when duplicate_object then
  null;
end $$;

-- Handle uniqueness: keep uniqueness for real tracking numbers, but allow NULL or 'not-assigned'
do $$
begin
  -- Drop existing unique constraint if present
  begin
    alter table public.shipments drop constraint shipments_tracking_number_key;
  exception when undefined_object then
    -- Constraint does not exist; ignore
    null;
  end;

  -- Create partial unique index
  create unique index if not exists uniq_shipments_tracking_number_non_placeholder
  on public.shipments (tracking_number)
  where tracking_number is not null and tracking_number <> 'not-assigned';
end $$;

--------------

create table public.users (
  id uuid not null,
  email text null,
  full_name text null,
  last_sign_in_at timestamp with time zone null,
  role text null default 'user'::text,
  location text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_role_check check ((role = any (array['user'::text, 'admin'::text, 'superadmin'::text])))
) TABLESPACE pg_default;

create trigger trg_set_updated_at_users BEFORE
update on users for EACH row
execute FUNCTION fn_set_updated_at ();

----------

create view public.v_shipments_history_list as
select
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
from
  shipments s
  left join lateral (
    select
      se.event_time as latest_event_time,
      se.event_type as latest_event_type,
      se.description as latest_event_description,
      se.location as latest_event_location
    from
      shipment_events se
    where
      se.shipment_id = s.id
    order by
      se.event_time desc
    limit
      1
  ) le on true;

----------

-- View used by tracking API with latest event and core shipment fields
create or replace view public.v_shipments_with_latest_event as
select
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
  le.latest_event_location
from
  shipments s
  left join lateral (
    select
      se.event_time as latest_event_time,
      se.event_type as latest_event_type,
      se.description as latest_event_description,
      se.location as latest_event_location
    from
      shipment_events se
    where
      se.shipment_id = s.id
    order by
      se.event_time desc
    limit 1
  ) le on true;


------
-- Storage RLS Policies for package-images bucket
-- Policy: Allow authenticated users to upload/insert files to package-images bucket
CREATE POLICY "Authenticated users can upload to package-images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'package-images'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to read/select files from package-images bucket
CREATE POLICY "Authenticated users can read from package-images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'package-images'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their files in package-images bucket
CREATE POLICY "Authenticated users can update files in package-images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'package-images'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their files in package-images bucket
CREATE POLICY "Authenticated users can delete files in package-images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'package-images'
  AND auth.role() = 'authenticated'
);