-- ============================================================
-- FIX AUTH PROVISIONING
-- MTs Annur 1
-- ============================================================

-- Hapus trigger lama jika ternyata pernah dibuat.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Hapus fungsi lama yang masih menggunakan teachers.email_hint.
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Fungsi baru:
-- Setiap Auth User baru otomatis mendapatkan profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    nip,
    is_active
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      ''
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'nip',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = EXCLUDED.email,
    nip = COALESCE(EXCLUDED.nip, public.profiles.nip),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Trigger Auth → Profile.
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Fungsi hanya boleh digunakan oleh sistem Auth.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
