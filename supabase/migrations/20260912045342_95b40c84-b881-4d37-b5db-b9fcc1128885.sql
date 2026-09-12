-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','kepala_madrasah','supervisor','guru');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  nip TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_kepala()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'kepala_madrasah');
$$;

CREATE POLICY "profil sendiri dibaca" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin_or_kepala());
CREATE POLICY "profil sendiri diubah" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin kelola profil" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin hapus profil" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "peran dibaca sendiri" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_kepala());
CREATE POLICY "admin kelola peran" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ACADEMIC YEARS
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_years TO authenticated;
GRANT ALL ON public.academic_years TO service_role;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ay_updated BEFORE UPDATE ON public.academic_years FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "tahun dibaca semua" ON public.academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin kelola tahun" ON public.academic_years FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SUBJECTS
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "mapel dibaca semua" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin kelola mapel" ON public.subjects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- CLASSES
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_level SMALLINT,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, academic_year_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_classes_updated BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "kelas dibaca semua" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin kelola kelas" ON public.classes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SUPERVISORS
CREATE TABLE public.supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  nip TEXT,
  position TEXT,
  order_no SMALLINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisors TO authenticated;
GRANT ALL ON public.supervisors TO service_role;
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sup_updated BEFORE UPDATE ON public.supervisors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.current_supervisor_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.supervisors WHERE user_id = auth.uid() LIMIT 1;
$$;

-- TEACHERS
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  nip TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_teachers_user ON public.teachers(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_teachers_updated BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ASSIGNMENTS
CREATE TABLE public.supervision_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES public.supervisors(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, academic_year_id)
);
CREATE INDEX idx_assign_supervisor ON public.supervision_assignments(supervisor_id);
CREATE INDEX idx_assign_teacher ON public.supervision_assignments(teacher_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervision_assignments TO authenticated;
GRANT ALL ON public.supervision_assignments TO service_role;
ALTER TABLE public.supervision_assignments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_assign_updated BEFORE UPDATE ON public.supervision_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_supervisor_of(_teacher_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.supervision_assignments a
    JOIN public.supervisors s ON s.id = a.supervisor_id
    WHERE a.teacher_id = _teacher_id AND s.user_id = auth.uid()
  );
$$;

CREATE POLICY "guru baca data sendiri" ON public.teachers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_kepala() OR public.is_supervisor_of(id));
CREATE POLICY "admin kelola guru" ON public.teachers FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "supervisor dibaca" ON public.supervisors FOR SELECT TO authenticated
  USING (
    public.is_admin_or_kepala()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.supervision_assignments a
      JOIN public.teachers t ON t.id = a.teacher_id
      WHERE a.supervisor_id = supervisors.id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "admin kelola supervisor" ON public.supervisors FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "assignment dibaca" ON public.supervision_assignments FOR SELECT TO authenticated
  USING (
    public.is_admin_or_kepala()
    OR teacher_id = public.current_teacher_id()
    OR supervisor_id = public.current_supervisor_id()
  );
CREATE POLICY "admin kelola assignment" ON public.supervision_assignments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit dibaca admin kepala" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin_or_kepala());
CREATE POLICY "audit ditulis pengguna" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- SYSTEM SETTINGS
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "pengaturan dibaca semua" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin kelola pengaturan" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- AUTO PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- tautkan akun ke data guru/supervisor bila email cocok
  UPDATE public.teachers SET user_id = NEW.id WHERE lower(email_hint) = lower(NEW.email) AND user_id IS NULL;
  RETURN NEW;
END; $$;
