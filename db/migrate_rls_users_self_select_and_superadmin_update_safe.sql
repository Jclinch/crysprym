-- db/migrate_rls_users_self_select_and_superadmin_update_safe.sql
-- Purpose: Fix staff dashboards failing to load due to `public.users` RLS.
-- Safe to run multiple times.
--
-- What it does:
-- - Ensures authenticated users can SELECT their own profile row (needed for role checks)
-- - Ensures superadmins can UPDATE any user row (needed for location/role edits)

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'public.users does not exist; skipping users RLS policy updates.';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';

  -- Allow any authenticated user to read ONLY their own profile row.
  EXECUTE 'DROP POLICY IF EXISTS "Users: select own profile" ON public.users';
  EXECUTE '
    CREATE POLICY "Users: select own profile" ON public.users
    FOR SELECT TO authenticated
    USING (id = auth.uid())
  ';

  -- Allow superadmin to update any user row (location/role maintenance).
  EXECUTE 'DROP POLICY IF EXISTS "Users: superadmin update all" ON public.users';
  EXECUTE '
    CREATE POLICY "Users: superadmin update all" ON public.users
    FOR UPDATE TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin())
  ';
END
$$;
