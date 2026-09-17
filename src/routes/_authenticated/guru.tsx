import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, UserPlus, FileSpreadsheet, Download, Upload, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, logAudit } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/guru")({
  head: () => ({ meta: [{ title: "Data Guru & Akun — Portal Supervisi MTs Annur 1" }] }),
  component: HalamanGuru,
});

type BarisGuru = {
  id: string;
  full_name: string;
  nip: string | null;
  user_id: string | null;
  is_active: boolean;
  supervisor: string | null;
};

function HalamanGuru() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [cari, setCari] = useState("");
  const [dialogTambahBuka, setDialogTambahBuka] = useState(false);
  const [dialogImportBuka, setDialogImportBuka] = useState(false);
  const [loadingAksi, setLoadingAksi] = useState(false);

  // Form State Tambah Satuan
  const [namaGuru, setNamaGuru] = useState("");
  const [nipGuru, setNipGuru] = useState("");
  const [fileExcel, setFileExcel] = useState<File | null>(null);

  const admin = user?.role === "admin";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["daftar-guru"],
    queryFn: async (): Promise<BarisGuru[]> => {
      const { data: guru, error } = await supabase
        .from("teachers")
        .select("id, full_name, nip, user_id, is_active")
        .order("full_name");
      if (error) throw error;

      const { data: penugasan } = await supabase
        .from("supervision_assignments")
        .select("teacher_id, supervisors(full_name)");

      const peta = new Map<string, string>();
      for (const row of penugasan ?? []) {
        const sup = row.supervisors as { full_name: string } | null;
        if (sup) peta.set(row.teacher_id, sup.full_name);
      }

      return (guru ?? []).map((g) => ({ ...g, supervisor: peta.get(g.id) ?? null }));
    },
  });

  // Fungsi Tambah Guru Satuan
  async function tambahGuru(e: React.FormEvent) {
    e.preventDefault();
    if (!namaGuru.trim()) {
      toast.error("Nama guru wajib diisi.");
      return;
    }
    setLoadingAksi(true);

    try {
      const { data: newT, error: errTeacher } = await supabase
        .from("teachers")
        .insert({
          full_name: namaGuru.trim(),
          nip: nipGuru.trim() || null,
          is_active: true,
        })
        .select("id")
        .single();

      if (errTeacher) throw errTeacher;

      // Buatkan profil virtual otomatis agar langsung muncul di halaman login
      const cleanName = namaGuru.toLowerCase().replace(/[^a-z0-9]/g, "");
      const virtualEmail = `guru_${cleanName}_${Date.now().toString().slice(-4)}@mtsannur1.local`;

      const { data: newProf } = await supabase
        .from("profiles")
        .insert({
          full_name: namaGuru.trim(),
          email: virtualEmail,
          nip: nipGuru.trim() || null,
        })
        .select("id")
        .single();

      if (newProf && newT) {
        await supabase.from("teachers").update({ user_id: newProf.id }).eq("id", newT.id);
        await supabase.rpc("admin_set_role", { _user_id: newProf.id, _role: "guru" });
      }

      await logAudit("create_teacher", { description: `Admin menambahkan guru: ${namaGuru}` });
      toast.success("Data guru dan akun portal berhasil dibuat.");
      setDialogTambahBuka(false);
      setNamaGuru("");
      setNipGuru("");
      queryClient.invalidateQueries({ queryKey: ["daftar-guru"] });
    } catch (err: any) {
      toast.error("Gagal menambah guru: " + err.message);
    } finally {
      setLoadingAksi(false);
    }
  }

  // Fungsi Otomatis Generate Akun untuk Guru yang Belum Punya Akun
  async function generateAkunMassal() {
    if (!confirm("Buatkan akun login otomatis untuk seluruh guru yang belum memiliki akun?")) return;
    setLoadingAksi(true);

    try {
      const { data: teachersWithoutUser } = await supabase
        .from("teachers")
        .select("id, full_name, nip")
        .is("user_id", null);

      if (!teachersWithoutUser || teachersWithoutUser.length === 0) {
        toast.info("Semua guru sudah memiliki akun.");
        setLoadingAksi(false);
        return;
      }

      let count = 0;
      for (const t of teachersWithoutUser) {
        const cleanName = t.full_name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const virtualEmail = `guru_${cleanName}_${Math.floor(Math.random() * 9000 + 1000)}@mtsannur1.local`;

        const { data: newProf, error: pErr } = await supabase
          .from("profiles")
          .insert({
            full_name: t.full_name,
            email: virtualEmail,
            nip: t.nip,
          })
          .select("id")
          .single();

        if (!pErr && newProf) {
          await supabase.from("teachers").update({ user_id: newProf.id }).eq("id", t.id);
          await supabase.rpc("admin_set_role", { _user_id: newProf.id, _role: "guru" });
          count++;
        }
      }

      toast.success(`Berhasil mengenerate ${count} akun login untuk guru.`);
      queryClient.invalidateQueries({ queryKey: ["daftar-guru"] });
    } catch (err: any) {
      toast.error("Gagal mengenerate akun: " + err.message);
    } finally {
      setLoadingAksi(false);
    }
  }

  // Download Template Excel
  async function downloadTemplate() {
    const rows = [
      { No: 1, Nama_Lengkap: "Contoh Guru Budi, S.Pd", NIP: "198501012010011001" },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Guru");
    XLSX.writeFile(wb, "Template_Data_Guru_MTs_Annur1.xlsx");
    toast.success("Template berhasil diunduh.");
  }

  // Import Excel Massal
  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!fileExcel) return;
    setLoadingAksi(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]!];
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        let count = 0;
        for (const row of rows) {
          const name = row.Nama_Lengkap || row.nama || row.full_name;
          const nip = row.NIP || row.nip || "";
          if (!name) continue;

          const { data: tData } = await supabase
            .from("teachers")
            .insert({ full_name: String(name).trim(), nip: String(nip).trim() || null, is_active: true })
            .select("id")
            .single();

          if (tData) {
            const cleanName = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
            const virtualEmail = `guru_${cleanName}_${Math.floor(Math.random() * 9000 + 1000)}@mtsannur1.local`;

            const { data: pData } = await supabase
              .from("profiles")
              .insert({ full_name: String(name).trim(), email: virtualEmail, nip: String(nip).trim() || null })
              .select("id")
              .single();

            if (pData) {
              await supabase.from("teachers").update({ user_id: pData.id }).eq("id", tData.id);
              await supabase.rpc("admin_set_role", { _user_id: pData.id, _role: "guru" });
            }
            count++;
          }
        }

        toast.success(`Berhasil mengimpor ${count} data guru beserta akunnya.`);
        setDialogImportBuka(false);
        setFileExcel(null);
        queryClient.invalidateQueries({ queryKey: ["daftar-guru"] });
      } catch (err: any) {
        toast.error("Gagal import: " + err.message);
      } finally {
        setLoadingAksi(false);
      }
    };
    reader.readAsBinaryString(fileExcel);
  }

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (g) => g.full_name.toLowerCase().includes(q) || (g.supervisor ?? "").toLowerCase().includes(q),
    );
  }, [data, cari]);

  return (
    <AppShell title="Data Guru & Akun Portal" description="Tahun Pelajaran 2026/2027">
      <div className="space-y-4">
        {/* Baris Pencarian & Tombol Aksi Admin */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama guru atau supervisor…"
              className="pl-9"
            />
          </div>

          {admin && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={generateAkunMassal} disabled={loadingAksi} className="gap-2">
                <KeyRound className="size-4 text-indigo-600" /> Sinkronkan Akun (58 Guru)
              </Button>

              <Dialog open={dialogTambahBuka} onOpenChange={setDialogTambahBuka}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="size-4" /> Tambah Guru
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Guru Baru</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={tambahGuru} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Nama Lengkap & Gelar</Label>
                      <Input
                        required
                        value={namaGuru}
                        onChange={(e) => setNamaGuru(e.target.value)}
                        placeholder="Contoh: Siti Aminah, S.Pd.I"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>NIP / NUPTK (Opsional)</Label>
                      <Input
                        value={nipGuru}
                        onChange={(e) => setNipGuru(e.target.value)}
                        placeholder="Nomor induk pegawai"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogTambahBuka(false)}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={loadingAksi}>
                        {loadingAksi && <Loader2 className="size-4 animate-spin mr-2" />}
                        Simpan & Buat Akun
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
                    <DialogTitle>Import Data Guru Massal</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleImport} className="space-y-4 pt-2">
                    <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-2">
                      <p className="font-semibold text-foreground">Panduan:</p>
                      <p>Unduh template, isi daftar guru, lalu unggah kembali.</p>
                      <Button type="button" variant="secondary" size="sm" className="w-full gap-2 mt-1" onClick={downloadTemplate}>
                        <Download className="size-3.5" /> Download Template Excel
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label>Pilih File Excel (.xlsx)</Label>
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
                        <Upload className="size-4 mr-2" /> Unggah Data
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : isError ? (
          <ErrorState />
        ) : hasil.length === 0 ? (
          <EmptyState
            title="Tidak ada data guru"
            description="Belum ada data guru yang terdaftar."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Guru</TableHead>
                  <TableHead>NIP / NUPTK</TableHead>
                  <TableHead>Supervisor Pembina</TableHead>
                  <TableHead>Status Akun</TableHead>
                  <TableHead>Status Keaktifan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hasil.map((g, i) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{g.nip ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{g.supervisor ?? "—"}</TableCell>
                    <TableCell>
                      {g.user_id ? (
                        <Badge variant="secondary">Akun Siap</Badge>
                      ) : (
                        <Badge variant="outline">Belum ada akun</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {g.is_active ? (
                        <Badge>Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Menampilkan {hasil.length} data guru.</p>
      </div>
    </AppShell>
  );
}
