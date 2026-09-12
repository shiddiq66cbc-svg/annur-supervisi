DROP FUNCTION IF EXISTS public.handle_new_user();

-- Membuat/menyegarkan profil pengguna yang sedang masuk
CREATE OR REPLACE FUNCTION public.ensure_profile(_full_name TEXT DEFAULT NULL)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _email TEXT;
  _row public.profiles;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (_uid, COALESCE(_full_name, split_part(COALESCE(_email,''), '@', 1)), _email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.ensure_profile(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin_or_kepala() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_kepala() TO authenticated;
REVOKE ALL ON FUNCTION public.current_teacher_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_teacher_id() TO authenticated;
REVOKE ALL ON FUNCTION public.current_supervisor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_supervisor_id() TO authenticated;
REVOKE ALL ON FUNCTION public.is_supervisor_of(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_supervisor_of(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;