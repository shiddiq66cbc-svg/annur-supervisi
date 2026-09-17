-- ============================================================
-- PUBLIC LOGIN LIST
-- Hanya informasi minimum untuk dropdown login.
-- Tidak membuka tabel profiles secara langsung kepada anon.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_login_users()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.email
  FROM public.profiles p
  INNER JOIN public.user_roles ur
    ON ur.user_id = p.id
  WHERE
    ur.role = 'guru'
    AND p.is_active = true
    AND p.email IS NOT NULL
  ORDER BY p.full_name;
$$;

REVOKE ALL
ON FUNCTION public.get_login_users()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_login_users()
TO anon, authenticated;
