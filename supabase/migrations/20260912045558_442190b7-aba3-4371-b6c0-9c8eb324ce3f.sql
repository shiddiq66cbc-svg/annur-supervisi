CREATE OR REPLACE FUNCTION public.claim_admin_if_none()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Tidak terautentikasi'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, description)
  VALUES (_uid, 'role_bootstrap', 'user_roles', _uid, 'Administrator pertama sistem ditetapkan');
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.claim_admin_if_none() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_none() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Tidak memiliki kewenangan'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, description)
  VALUES (auth.uid(), 'role_change', 'user_roles', _user_id, 'Peran pengguna diubah menjadi ' || _role::text);
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(UUID, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_audit(_action TEXT, _entity TEXT DEFAULT NULL, _entity_id UUID DEFAULT NULL, _description TEXT DEFAULT NULL, _metadata JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.audit_logs (user_id, actor_name, action, entity, entity_id, description, metadata)
  VALUES (auth.uid(), (SELECT full_name FROM public.profiles WHERE id = auth.uid()), _action, _entity, _entity_id, _description, COALESCE(_metadata,'{}'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.log_audit(TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated;