import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRoleName = "admin" | "kepala_madrasah" | "supervisor" | "guru";

const ROLES: AppRoleName[] = ["admin", "kepala_madrasah", "supervisor", "guru"];
const BAN_FOREVER = "876000h";

export type UserRow = {
  id: string;
  fullName: string;
  email: string | null;
  role: AppRoleName | null;
  isActive: boolean;
  nip: string | null;
  phone: string | null;
  keterangan: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListInput = {
  search?: string;
  role?: AppRoleName | "all";
  status?: "all" | "aktif" | "nonaktif";
  page?: number;
  perPage?: number;
  all?: boolean;
};

async function getAdminClient(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("FORBIDDEN");
}

async function audit(
  context: { supabase: any },
  action: string,
  options: { entity?: string; entityId?: string; description?: string; metadata?: unknown } = {},
) {
  try {
    await context.supabase.rpc("log_audit", {
      _action: action,
      _entity: options.entity ?? "users",
      ...(options.entityId ? { _entity_id: options.entityId } : {}),
      ...(options.description ? { _description: options.description } : {}),
      ...(options.metadata ? { _metadata: options.metadata } : {}),
    });
  } catch {
    /* audit tidak boleh menghentikan operasi utama */
  }
}

/** Mengambil seluruh pengguna (profil + peran + metadata auth). */
async function loadAll(admin: any): Promise<UserRow[]> {
  const [{ data: profiles, error }, { data: roles }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, nip, phone, keterangan, is_active, created_at, updated_at")
      .order("created_at", { ascending: true }),
    admin.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw error;

  const roleMap = new Map<string, AppRoleName>(
    (roles ?? []).map((r: any) => [r.user_id as string, r.role as AppRoleName]),
  );

  const lastSignIn = new Map<string, string | null>();
  for (let page = 1; page <= 10; page++) {
    const { data, error: authError } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (authError) break;
    for (const u of data.users) lastSignIn.set(u.id, u.last_sign_in_at ?? null);
    if (data.users.length < 200) break;
  }

  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name ?? "",
    email: p.email ?? null,
    role: roleMap.get(p.id) ?? null,
    isActive: Boolean(p.is_active),
    nip: p.nip ?? null,
    phone: p.phone ?? null,
    keterangan: p.keterangan ?? null,
    lastSignInAt: lastSignIn.get(p.id) ?? null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

function applyFilter(rows: UserRow[], input: ListInput): UserRow[] {
  const q = (input.search ?? "").trim().toLowerCase();
  return rows.filter((r) => {
    if (input.role && input.role !== "all" && r.role !== input.role) return false;
    if (input.status === "aktif" && !r.isActive) return false;
    if (input.status === "nonaktif" && r.isActive) return false;
    if (!q) return true;
    return [r.fullName, r.email, r.nip, r.phone, r.role]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
}

async function countActiveAdmins(admin: any): Promise<string[]> {
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  const ids = (roles ?? []).map((r: any) => r.user_id as string);
  if (ids.length === 0) return [];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .in("id", ids)
    .eq("is_active", true);
  return (profiles ?? []).map((p: any) => p.id as string);
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ListInput) => input ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const admin = await getAdminClient();
    const all = await loadAll(admin);
    const filtered = applyFilter(all, data);
    if (data.all) return { rows: filtered, total: filtered.length, page: 1 };
    const perPage = Math.min(Math.max(data.perPage ?? 10, 5), 100);
    const page = Math.max(data.page ?? 1, 1);
    const start = (page - 1) * perPage;
    return { rows: filtered.slice(start, start + perPage), total: filtered.length, page };
  });

export type CreateInput = {
  fullName: string;
  email: string;
  password: string;
  role: AppRoleName;
  isActive: boolean;
  nip?: string | null;
  phone?: string | null;
  keterangan?: string | null;
};

function validasi(input: CreateInput): string | null {
  if (!input.fullName?.trim()) return "Nama lengkap wajib diisi.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email ?? "")) return "Format e-mail tidak valid.";
  if (!ROLES.includes(input.role)) return "Peran tidak dikenal.";
  if (!input.password || input.password.length < 8)
    return "Kata sandi minimal 8 karakter.";
  if (!/[A-Za-z]/.test(input.password) || !/[0-9]/.test(input.password))
    return "Kata sandi harus memuat huruf dan angka.";
  return null;
}

async function buatSatuUser(admin: any, input: CreateInput) {
  const email = input.email.trim().toLowerCase();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() },
    ...(input.isActive ? {} : { ban_duration: BAN_FOREVER }),
  });
  if (error || !created?.user) {
    const msg = String(error?.message ?? "");
    if (/already|exists|registered/i.test(msg)) throw new Error("E-mail sudah digunakan oleh user lain.");
    throw new Error("Tidak dapat membuat akun authentication.");
  }
  const uid = created.user.id;
  try {
    const { error: profileError } = await admin.from("profiles").upsert({
      id: uid,
      full_name: input.fullName.trim(),
      email,
      nip: input.nip?.trim() || null,
      phone: input.phone?.trim() || null,
      keterangan: input.keterangan?.trim() || null,
      is_active: input.isActive,
    });
    if (profileError) throw profileError;
    await admin.from("user_roles").delete().eq("user_id", uid);
    const { error: roleError } = await admin
      .from("user_roles")
      .insert({ user_id: uid, role: input.role });
    if (roleError) throw roleError;
  } catch (e) {
    // Cleanup: jangan tinggalkan akun yatim.
    await admin.auth.admin.deleteUser(uid);
    throw new Error("Gagal membuat akun. Silakan periksa data dan coba lagi.");
  }
  return uid;
}

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const pesan = validasi(data);
    if (pesan) throw new Error(pesan);
    const admin = await getAdminClient();
    const uid = await buatSatuUser(admin, data);
    await audit(context as any, "CREATE_USER", {
      entityId: uid,
      description: `Akun ${data.email} dibuat dengan peran ${data.role}`,
      metadata: { email: data.email, role: data.role, status: data.isActive ? "aktif" : "nonaktif" },
    });
    return { id: uid };
  });

export type UpdateInput = {
  id: string;
  fullName: string;
  email: string;
  role: AppRoleName;
  isActive: boolean;
  nip?: string | null;
  phone?: string | null;
  keterangan?: string | null;
  password?: string | null;
};

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (!data.fullName?.trim()) throw new Error("Nama lengkap wajib diisi.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email ?? "")) throw new Error("Format e-mail tidak valid.");
    if (!ROLES.includes(data.role)) throw new Error("Peran tidak dikenal.");
    if (data.password) {
      if (data.password.length < 8) throw new Error("Kata sandi minimal 8 karakter.");
      if (!/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password))
        throw new Error("Kata sandi harus memuat huruf dan angka.");
    }

    const admin = await getAdminClient();
    const adminAktif = await countActiveAdmins(admin);
    const menghilangkanAdmin =
      adminAktif.includes(data.id) &&
      adminAktif.length <= 1 &&
      (data.role !== "admin" || !data.isActive);
    if (menghilangkanAdmin)
      throw new Error("Operasi ditolak. Sistem harus memiliki minimal satu Administrator aktif.");

    const { data: sebelum } = await admin
      .from("profiles")
      .select("email, is_active")
      .eq("id", data.id)
      .maybeSingle();
    const { data: peranLama } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.id)
      .maybeSingle();

    const email = data.email.trim().toLowerCase();
    const authPatch: Record<string, unknown> = {};
    if (email !== (sebelum?.email ?? "").toLowerCase()) {
      authPatch['email'] = email;
      authPatch['email_confirm'] = true;
    }
    if (data.password) authPatch['password'] = data.password;
    authPatch['ban_duration'] = data.isActive ? "none" : BAN_FOREVER;
    const { error: authError } = await admin.auth.admin.updateUserById(data.id, authPatch);
    if (authError) {
      if (/already|exists|registered/i.test(String(authError.message)))
        throw new Error("E-mail sudah digunakan oleh user lain.");
      throw new Error("Gagal memperbarui akun authentication.");
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: data.fullName.trim(),
        email,
        nip: data.nip?.trim() || null,
        phone: data.phone?.trim() || null,
        keterangan: data.keterangan?.trim() || null,
        is_active: data.isActive,
      })
      .eq("id", data.id);
    if (profileError) throw new Error("Gagal menyimpan data profil.");

    const lama = (peranLama?.role as AppRoleName | undefined) ?? null;
    if (lama !== data.role) {
      await admin.from("user_roles").delete().eq("user_id", data.id);
      await admin.from("user_roles").insert({ user_id: data.id, role: data.role });
      await audit(context as any, "role_change", {
        entityId: data.id,
        description: `Peran ${data.email} diubah dari ${lama ?? "tidak ada"} menjadi ${data.role}`,
        metadata: { role_lama: lama, role_baru: data.role },
      });
    }
    if (!data.isActive) await admin.auth.admin.signOut(data.id, "global").catch(() => {});

    await audit(context as any, "UPDATE_USER", {
      entityId: data.id,
      description: `Akun ${email} diperbarui`,
      metadata: {
        email,
        role: data.role,
        status: data.isActive ? "aktif" : "nonaktif",
        password_diubah: Boolean(data.password),
      },
    });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const admin = await getAdminClient();
    const adminAktif = await countActiveAdmins(admin);
    if (adminAktif.includes(data.id) && adminAktif.length <= 1)
      throw new Error("Operasi ditolak. Sistem harus memiliki minimal satu Administrator aktif.");

    const { data: profil } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.id)
      .maybeSingle();

    // Lepaskan tautan akun dari data guru/supervisor agar riwayat supervisi tetap utuh.
    await admin.from("teachers").update({ user_id: null }).eq("user_id", data.id);
    await admin.from("supervisors").update({ user_id: null }).eq("user_id", data.id);

    await audit(context as any, "DELETE_USER", {
      entityId: data.id,
      description: `Akun ${profil?.email ?? data.id} (${profil?.full_name ?? "-"}) dihapus`,
      metadata: { email: profil?.email ?? null },
    });

    const { error } = await admin.auth.admin.deleteUser(data.id);
    if (error) throw new Error("Gagal menghapus akun. Tidak ada perubahan yang dilakukan.");
    return { ok: true };
  });

export type ImportRow = CreateInput & { baris: number };

export const importUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: ImportRow[] }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (data.rows.length > 100)
      throw new Error("File melebihi batas 100 user per proses. Silakan pecah menjadi beberapa file.");
    const admin = await getAdminClient();

    const hasil: { baris: number; email: string; nama: string; ok: boolean; pesan: string }[] = [];
    for (const row of data.rows) {
      const pesan = validasi(row);
      if (pesan) {
        hasil.push({ baris: row.baris, email: row.email, nama: row.fullName, ok: false, pesan });
        continue;
      }
      try {
        await buatSatuUser(admin, row);
        hasil.push({ baris: row.baris, email: row.email, nama: row.fullName, ok: true, pesan: "Berhasil" });
      } catch (e) {
        hasil.push({
          baris: row.baris,
          email: row.email,
          nama: row.fullName,
          ok: false,
          pesan: e instanceof Error ? e.message : "Gagal membuat akun.",
        });
      }
    }
    const berhasil = hasil.filter((h) => h.ok).length;
    await audit(context as any, "IMPORT_USERS", {
      description: `Import users: ${berhasil} berhasil, ${hasil.length - berhasil} gagal`,
      metadata: { total: hasil.length, berhasil, gagal: hasil.length - berhasil },
    });
    return { hasil, total: hasil.length, berhasil, gagal: hasil.length - berhasil };
  });

export const logExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { format: string; jumlah: number; filter: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await audit(context as any, "EXPORT_USERS", {
      description: `Export ${data.format} sebanyak ${data.jumlah} data`,
      metadata: { format: data.format, jumlah: data.jumlah, filter: data.filter },
    });
    return { ok: true };
  });

export const resetUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { konfirmasi: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (data.konfirmasi !== "RESET USERS") throw new Error("Konfirmasi reset tidak sesuai.");
    const admin = await getAdminClient();

    const { data: peranAdmin } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const idAdmin = new Set((peranAdmin ?? []).map((r: any) => r.user_id as string));
    const { data: semua } = await admin.from("profiles").select("id, is_active");
    const target = (semua ?? []).filter((p: any) => !idAdmin.has(p.id) && p.is_active);

    await audit(context as any, "USER_RESET_STARTED", {
      description: "Reset seluruh user non-administrator dimulai",
      metadata: { total_user: (semua ?? []).length, target: target.length },
    });

    let dinonaktifkan = 0;
    try {
      for (const p of target) {
        const { error } = await admin.from("profiles").update({ is_active: false }).eq("id", p.id);
        if (error) continue;
        await admin.auth.admin.updateUserById(p.id, { ban_duration: BAN_FOREVER }).catch(() => {});
        await admin.auth.admin.signOut(p.id, "global").catch(() => {});
        dinonaktifkan++;
      }
    } catch (e) {
      await audit(context as any, "USER_RESET_FAILED", {
        description: "Reset users gagal",
        metadata: { dinonaktifkan },
      });
      throw new Error("Reset gagal. Tidak ada perubahan yang dilakukan.");
    }

    await audit(context as any, "USER_RESET_COMPLETED", {
      description: `Reset users selesai: ${dinonaktifkan} akun dinonaktifkan`,
      metadata: { total_sebelum: (semua ?? []).length, dinonaktifkan },
    });
    return { dinonaktifkan, total: (semua ?? []).length };
  });
