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
import { UserPlus, FileSpreadsheet, Loader2, Upload } from "lucide-react";

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
  const [emailBaru, setEmailBaru] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [roleBaru, setRoleBaru] = useState<AppRole>("guru");

  // State Import Excel
  const [fileExcel, setFileExcel] = useState<File | null>(null);

  const admin = user?.role === "admin";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pengguna"],
    enabled: admin,
    queryFn: async () => {
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

  async function tambahPenggunaManual(e: React.FormEvent) {
    e.preventDefault();
    if (!namaBaru || !emailBaru || !passwordBaru) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    setLoadingAksi(true);

    // Memanggil fungsi RPC backend Supabase untuk pembuatan user admin
    const { error } = await supabase.rpc("admin_create_user", {
      _email: emailBaru.trim(),
      _password: passwordBaru,
      _full_name: namaBaru.trim(),
      _role: roleBaru,
    });

    setLoadingAksi(false);
    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }

    await logAudit("create_user", { description: `Admin menambahkan pengguna baru: ${emailBaru}` });
    toast.success("Pengguna baru berhasil ditambahkan.");
    setDialogBuka(false);
    setNamaBaru("");
    setEmailBaru("");
    setPasswordBaru("");
    setRoleBaru("guru");
    queryClient.invalidateQueries({ queryKey: ["pengguna"] });
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
        let gagalCount = 0;

        for (const row of dataRows) {
          const email = row.email || row.Email || row.E-mail;
          const password = row.password || row.Password || row.kata_sandi;
          const full_name = row.nama || row.nama_lengkap || row.full_name || row.Nama;
          const role = (row.role || row.peran || "guru").toLowerCase() as AppRole;

          if (!email || !password || !full_name) {
            gagalCount++;
            continue;
          }

          const { error } = await supabase.rpc("admin_create_user", {
            _email: String(email).trim(),
            _password: String(password),
            _full_name: String(full_name).trim(),
            _role: ROLES.includes(role) ? role : "guru",
          });

          if (error) {
            gagalCount++;
          } else {
            suksesCount++;
          }
        }

        await logAudit("import_users", { description: `Import massal pengguna: ${suksesCount} berhasil, ${gagalCount} gagal` });
        toast.success(`Import selesai: ${suksesCount} berhasil ditambahkan, ${gagalCount} gagal/invalid.`);
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
          {/* Tombol Aksi Admin */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Total Pengguna Terdaftar: <span className="font-semibold text-foreground">{data.pengguna.length}</span>
            </p>
            <div className="flex items-center gap-2">
              {/* Dialog Tambah Pengguna */}
              <Dialog open={dialogBuka} onOpenChange={setDialogBuka}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="size-4" /> Tambah Pengguna
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={tambahPenggunaManual} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Nama Lengkap</Label>
                      <Input
                        required
                        value={namaBaru}
                        onChange={(e) => setNamaBaru(e.target.value)}
                        placeholder="Nama lengkap sesuai data madrasah"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        required
                        value={emailBaru}
                        onChange={(e) => setEmailBaru(e.target.value)}
                        placeholder="email@mtsannur1.sch.id"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Kata Sandi Awal</Label>
                      <Input
                        type="password"
                        required
                        minLength={6}
                        value={passwordBaru}
                        onChange={(e) => setPasswordBaru(e.target.value)}
                        placeholder="Minimal 6 karakter"
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
                        Simpan Pengguna
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Dialog Import Excel */}
              <Dialog open={dialogImportBuka} onOpenChange={setDialogImportBuka}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="size-4" /> Import Excel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Pengguna dari Excel</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleImportExcel} className="space-y-4 pt-2">
                    <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Format Kolom Excel (.xlsx):</p>
                      <p>Pastikan baris header memiliki kolom: <code className="text-indigo-600 font-mono">nama</code>, <code className="text-indigo-600 font-mono">email</code>, <code className="text-indigo-600 font-mono">password</code>, dan <code className="text-indigo-600 font-mono">role</code> (admin / kepala_madrasah / supervisor / guru).</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Pilih File Excel</Label>
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
                        <Upload className="size-4 mr-2" /> Unggah & Proses
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tabel Pengguna */}
          {data.pengguna.length === 0 ? (
            <EmptyState title="Belum ada akun pengguna" />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>E-mail</TableHead>
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
