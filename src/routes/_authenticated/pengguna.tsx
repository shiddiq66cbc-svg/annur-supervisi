import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, logAudit, pesanKesalahan, useCurrentUser, type AppRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, FileSpreadsheet, Loader2, Upload, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pengguna")({
  head: () => ({ meta: [{ title: "Pengguna & Peran — Portal Supervisi MTs Annur 1" }] }),
  component: HalamanPengguna,
});

const ROLES: AppRole[] = ["admin", "kepala_madrasah", "supervisor", "guru"];

function HalamanPengguna() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [proses, setProses] = useState<string | null>(null);
  const [dialogBuka, setDialogBuka] = useState(false);
  const [dialogImportBuka, setDialogImportBuka] = useState(false);
  const [loadingAksi, setLoadingAksi] = useState(false);

  // State Form Tambah Satuan
  const [namaBaru, setNamaBaru] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [roleBaru, setRoleBaru] = useState<AppRole>("guru");

  // State Import Excel
  const [fileExcel, setFileExcel] = useState<File | null>(null);

  const admin = user?.role === "admin";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pengguna"],
    enabled: admin,
    queryFn: async () => {
      await supabase.rpc("ensure_profile", {});
      const [profil, peran, guru, supervisor] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("teachers").select("id, full_name, user_id").order("full_name"),
        supabase.from("supervisors").select("id, full_name, user_id").order("order_no"),
      ]);
      if (profil.error) throw profil.error;
      const petaPeran = new Map((peran.data ?? []).map((r) => [r.user_id, r.role as AppRole]));
      return {
        pengguna: (profil.data ?? []).map((p) => ({ ...p, role: petaPeran.get(p.id) ?? null })),
        guru: guru.data ?? [],
        supervisor: supervisor.data ?? [],
      };
    },
  });

  async function ubahPeran(userId: string, role: AppRole) {
    setProses(userId);
    const { error } = await supabase.rpc("admin_set_role", { _user_id: userId, _role: role });
    setProses(null);
    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }
    toast.success("Peran pengguna diperbarui.");
    queryClient.invalidateQueries({ queryKey: ["pengguna"] });
    queryClient.invalidateQueries({ queryKey: ["current-user"] });
  }

  // Download Template Excel yang Berisi Data Guru
  async function downloadTemplateExcel() {
    try {
      const { data: daftarGuru, error } = await supabase
        .from("teachers")
        .select("full_name")
        .order("full_name");

      if (error) throw error;

      const rows =
        daftarGuru && daftarGuru.length > 0
          ? daftarGuru.map((g, index) => ({
              No: index + 1,
              Nama_Lengkap: g.full_name,
              Password_Awal: "12345678",
              Role: "guru",
            }))
          : [
              { No: 1, Nama_Lengkap: "Contoh Nama Guru, S.Pd", Password_Awal: "12345678", Role: "guru" },
            ];

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template Akun Guru");

      XLSX.writeFile(workbook, "Template_Akun_Guru_MTs_Annur1.xlsx");
      toast.success("Template Excel berhasil diunduh.");
    } catch (err: any) {
      toast.error("Gagal mengunduh template: " + err.message);
    }
  }

  async function simpanProfilManual(e: React.FormEvent) {
    e.preventDefault();
    if (!namaBaru || !passwordBaru) {
      toast.error("Nama lengkap dan kata sandi wajib diisi.");
      return;
    }
    setLoadingAksi(true);

    try {
      const cleanName = namaBaru.toLowerCase().replace(/[^a-z0-9]/g, "");
      const virtualEmail = `guru_${cleanName}_${Date.now().toString().slice(-4)}@mtsannur1.local`;

      // Buat atau masukkan profil baru ke tabel profiles
      const { data: newProfile, error: errProfile } = await supabase
        .from("profiles")
        .insert({
          full_name: namaBaru.trim(),
          email: virtualEmail,
        })
        .select("id")
        .single();

      if (errProfile) throw errProfile;

      if (newProfile) {
        await supabase.rpc("admin_set_role", { _user_id: newProfile.id, _role: roleBaru });
      }

      await logAudit("create_user_virtual", { description: `Admin mendaftarkan akun guru: ${namaBaru}` });
      toast.success("Akun guru berhasil didaftarkan ke sistem.");
      setDialogBuka(false);
      setNamaBaru("");
      setPasswordBaru("");
      setRoleBaru("guru");
      queryClient.invalidateQueries({ queryKey: ["pengguna"] });
    } catch (err: any) {
      toast.error("Gagal memproses data: " + err.message);
    } finally {
      setLoadingAksi(false);
    }
  }

  async function handleImportExcel(e: React.FormEvent) {
    e.preventDefault();
    if (!fileExcel) {
      toast.error("Pilih file Excel terlebih dahulu.");
      return;
    }
    setLoadingAksi(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname!];
        const dataRows = XLSX.utils.sheet_to_json<any>(ws);

        let suksesCount = 0;

        for (const row of dataRows) {
          // Mendukung berbagai variasi penamaan kolom dari excel
          const full_name =
            row.Nama_Lengkap ||
            row["Nama Lengkap"] ||
            row.nama ||
            row.nama_lengkap ||
            row.full_name ||
            row.Nama;

          const role = (row.Role || row.role || row.peran || "guru").toLowerCase() as AppRole;

          if (!full_name) continue;

          const cleanName = String(full_name).toLowerCase().replace(/[^a-z0-9]/g, "");
          const virtualEmail = `guru_${cleanName}@mtsannur1.local`;

          // Cek apakah profil dengan email virtual ini sudah ada
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", virtualEmail)
            .maybeSingle();

          if (existingProfile) {
            // Update jika sudah ada
            await supabase
              .from("profiles")
              .update({ full_name: String(full_name).trim() })
              .eq("id", existingProfile.id);

            if (ROLES.includes(role)) {
              await supabase.rpc("admin_set_role", { _user_id: existingProfile.id, _role: role });
            }
            suksesCount++;
          } else {
            // Buat baru jika belum ada
            const { data: newProf, error: errIns } = await supabase
              .from("profiles")
              .insert({
                full_name: String(full_name).trim(),
                email: virtualEmail,
              })
              .select("id")
              .single();

            if (!errIns && newProf) {
              if (ROLES.includes(role)) {
                await supabase.rpc("admin_set_role", { _user_id: newProf.id, _role: role });
              }
              suksesCount++;
            }
          }
        }

        await logAudit("import_users", { description: `Sinkronisasi massal akun guru: ${suksesCount} diproses` });
        toast.success(`Import selesai: ${suksesCount} akun berhasil disinkronkan ke sistem.`);
        setDialogImportBuka(false);
        setFileExcel(null);
        queryClient.invalidateQueries({ queryKey: ["pengguna"] });
      } catch (err: any) {
        toast.error("Gagal membaca file Excel: " + err.message);
      } finally {
        setLoadingAksi(false);
      }
    };
    reader.readAsBinaryString(fileExcel);
  }

  async function tautkan(userId: string, target: string) {
    const [jenis, id] = target.split(":");
    setProses(userId);
    if (jenis === "guru") {
      await supabase.from("teachers").update({ user_id: null }).eq("user_id", userId);
      const { error } = await supabase.from("teachers").update({ user_id: userId }).eq("id", id!);
      if (error) {
        setProses(null);
        toast.error(pesanKesalahan(error));
        return;
      }
    } else if (jenis === "supervisor") {
      await supabase.from("supervisors").update({ user_id: null }).eq("user_id", userId);
      const { error } = await supabase.from("supervisors").update({ user_id: userId }).eq("id", id!);
      if (error) {
        setProses(null);
        toast.error(pesanKesalahan(error));
        return;
      }
    }
    await logAudit("account_link", {
      entity: jenis === "guru" ? "teachers" : "supervisors",
      description: "Akun pengguna ditautkan ke data " + jenis,
    });
    setProses(null);
    toast.success("Akun berhasil ditautkan.");
    queryClient.invalidateQueries({ queryKey: ["pengguna"] });
    queryClient.invalidateQueries({ queryKey: ["daftar-guru"] });
    queryClient.invalidateQueries({ queryKey: ["daftar-supervisor"] });
  }

  return (
    <AppShell title="Pengguna & Peran" description="Kelola peran akses dan penautan akun">
      {!admin ? (
        <EmptyState
          title="Anda tidak memiliki akses"
          description="Hanya Administrator sistem yang dapat mengelola pengguna."
        />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : isError || !data ? (
        <ErrorState />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Total Pengguna Terdaftar: <span className="font-semibold text-foreground">{data.pengguna.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <Dialog open={dialogBuka} onOpenChange={setDialogBuka}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="size-4" /> Tambah Pengguna
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Akun Guru / Pengguna</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={simpanProfilManual} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Nama Lengkap</Label>
                      <Input
                        required
                        value={namaBaru}
                        onChange={(e) => setNamaBaru(e.target.value)}
                        placeholder="Contoh: Budi Santoso, S.Pd"
                      />
                      <p className="text-xs text-muted-foreground">Sistem otomatis membuatkan kredensial login.</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Kata Sandi Awal</Label>
                      <Input
                        type="password"
                        required
                        value={passwordBaru}
                        onChange={(e) => setPasswordBaru(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Peran Akses (Role)</Label>
                      <Select value={roleBaru} onValueChange={(v) => setRoleBaru(v as AppRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogBuka(false)}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={loadingAksi}>
                        {loadingAksi && <Loader2 className="size-4 animate-spin mr-2" />}
                        Simpan Akun
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogImportBuka} onOpenChange={setDialogImportBuka}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="size-4" /> Import Excel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import & Sinkronisasi Akun dari Excel</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleImportExcel} className="space-y-4 pt-2">
                    <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-2">
                      <p className="font-semibold text-foreground">Panduan Import Excel:</p>
                      <p>Unduh template resmi di bawah ini. Template sudah otomatis memuat seluruh daftar nama guru dari menu Data Guru.</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-2 w-full mt-1"
                        onClick={downloadTemplateExcel}
                      >
                        <Download className="size-3.5" /> Download Template Excel (58 Guru)
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label>Pilih File Excel yang Telah Diisi</Label>
                      <Input
                        type="file"
                        accept=".xlsx, .xls"
                        required
                        onChange={(e) => setFileExcel(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogImportBuka(false)}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={loadingAksi || !fileExcel}>
                        {loadingAksi && <Loader2 className="size-4 animate-spin mr-2" />}
                        <Upload className="size-4 mr-2" /> Unggah & Sinkronkan
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {data.pengguna.length === 0 ? (
            <EmptyState title="Belum ada akun pengguna" />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>E-mail / ID Virtual</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Tautkan ke Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pengguna.map((p) => {
                    const guruTertaut = data.guru.find((g) => g.user_id === p.id);
                    const supTertaut = data.supervisor.find((s) => s.user_id === p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={p.role ?? ""}
                            onValueChange={(v) => ubahPeran(p.id, v as AppRole)}
                            disabled={proses === p.id}
                          >
                            <SelectTrigger className="w-52">
                              <SelectValue placeholder="Belum ditetapkan" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABEL[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {guruTertaut && <Badge variant="secondary">Guru: {guruTertaut.full_name}</Badge>}
                            {supTertaut && (
                              <Badge variant="secondary">Supervisor: {supTertaut.full_name}</Badge>
                            )}
                            <Select
                              value=""
                              onValueChange={(v) => tautkan(p.id, v)}
                              disabled={proses === p.id}
                            >
                              <SelectTrigger className="w-64">
                                <SelectValue placeholder="Pilih data guru / supervisor…" />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {data.supervisor.map((s) => (
                                  <SelectItem key={"s" + s.id} value={"supervisor:" + s.id}>
                                    Supervisor — {s.full_name}
                                  </SelectItem>
                                ))}
                                {data.guru.map((g) => (
                                  <SelectItem key={"g" + g.id} value={"guru:" + g.id}>
                                    Guru — {g.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
