import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "kepala_madrasah" | "supervisor" | "guru";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  kepala_madrasah: "Kepala Madrasah",
  supervisor: "Supervisor Akademik",
  guru: "Guru",
};

export type CurrentUser = {
  userId: string;
  email: string | null;
  fullName: string;
  nip: string | null;
  phone: string | null;
  role: AppRole | null;
  teacherId: string | null;
  supervisorId: string | null;
};

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const user = userData.user;

  // Pastikan baris profil ada (dibuat aman di sisi database).
  await supabase.rpc("ensure_profile", {});

  const [profileRes, roleRes, teacherRes, supervisorRes] = await Promise.all([
    supabase.from("profiles").select("full_name, nip, phone, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("supervisors").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: profileRes.data?.email ?? user.email ?? null,
    fullName: profileRes.data?.full_name || (user.email ?? "").split("@")[0] || "Pengguna",
    nip: profileRes.data?.nip ?? null,
    phone: profileRes.data?.phone ?? null,
    role: (roleRes.data?.role as AppRole | undefined) ?? null,
    teacherId: teacherRes.data?.id ?? null,
    supervisorId: supervisorRes.data?.id ?? null,
  };
}

export const currentUserQuery = {
  queryKey: ["current-user"] as const,
  queryFn: fetchCurrentUser,
  staleTime: 30_000,
};

export function useCurrentUser() {
  return useQuery(currentUserQuery);
}

/** Mendengarkan perubahan sesi sekali saja (dipasang di route root). */
export function useAuthListener(onChange: () => void) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      onChange();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, onChange]);
}

export async function logAudit(
  action: string,
  options: { entity?: string; entityId?: string; description?: string } = {},
) {
  try {
    await supabase.rpc("log_audit", {
      _action: action,
      _entity: options.entity,
      _entity_id: options.entityId,
      _description: options.description,
      _metadata: {},
    });
  } catch {
    // Log audit tidak boleh menghentikan alur pengguna.
  }
}

export function pesanKesalahan(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (/invalid login credentials/i.test(message)) return "E-mail atau kata sandi salah.";
    if (/email not confirmed/i.test(message)) return "E-mail belum dikonfirmasi. Silakan periksa kotak masuk Anda.";
    if (/already registered/i.test(message)) return "E-mail ini sudah terdaftar.";
    if (/rate limit|too many/i.test(message)) return "Terlalu banyak percobaan. Silakan coba beberapa saat lagi.";
    if (/password/i.test(message) && /weak|short|least/i.test(message))
      return "Kata sandi terlalu lemah. Gunakan minimal 8 karakter.";
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}
