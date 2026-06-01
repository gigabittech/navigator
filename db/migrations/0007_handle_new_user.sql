-- ============================================================
-- Navigator — auto-provision a profile on signup
-- 0007_handle_new_user.sql
-- ============================================================
-- profiles.id references auth.users(id) but nothing created the row, so a
-- freshly signed-up user had no profile until something inserted one. Because
-- the profiles RLS only allows a user to insert their OWN row, a race or a
-- missed client call left users unable to own children. This trigger creates
-- the profile row server-side, atomically, the moment auth.users gets a row.
--
-- No new tables — RLS stays as configured in 0002.
-- ============================================================

-- Insert a matching profiles row whenever a new auth user is created.
-- SECURITY DEFINER so it runs with the privileges needed to write profiles
-- regardless of the (absent) session context during signup.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    -- Prefer a name supplied in signup metadata; fall back to NULL.
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fire once per new auth user. Drop first so the migration is re-runnable.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
