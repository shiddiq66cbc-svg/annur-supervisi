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

  // State Form
  const [namaBaru, setNamaBaru] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [roleBaru, setRoleBaru] = useState<AppRole>("guru");
  const [fileExcel, setFileExcel] = useState<File | null>(null);

  const admin = user?.role === "admin";

  // Query Data Aman dari Error 400
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pengguna-aman"],
    enabled: admin,
    queryFn: async () => {
      const [guru, supervisor] = await Promise.all([
        supabase.from("teachers").select("id, full_name, user_id").order("full_name"),
        supabase.from("supervisors").select("id, full_name, user_id").order("order_no"),
      ]);

      return {
        guru: guru.data ?? [],
        supervisor: supervisor.data ?? [],
      };
    },
  });

  async function downloadTemplateExcel() {
    try {
      const { data: daftarGuru } = await supabase
        .from("teachers")
        .select("full_name")
        .order("full_name");

      const rows =
        daftarGuru && daftarGuru.length > 0
          ? daftarGuru.map((g, index) => ({
              No: index + 1,
              Nama_Lengkap: g.full_name,
              Role: "guru",
            }))
          : [
              { No: 1, Nama_Lengkap: "Contoh Nama Guru, S.Pd", Role: "guru" },
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

        if (!dataRows || dataRows.length === 0) {
          toast.error("File Excel kosong.");
          setLoadingAksi(false);
          return;
        }

        let suksesCount = 0;

        for (const row of dataRows) {
          const full_name =
            row.Nama_Lengkap ||
            row["Nama Lengkap"] ||
            row.nama ||
            row.nama_lengkap ||
            row.full_name ||
            row.Nama;

          if (!full_name) continue;

          // Sinkronisasi tangguh ke tabel teachers
          const { error: insErr } = await supabase.from("teachers").insert({
            full_name: String(full_name).trim(),
            is_active: true,
          });

          if (!insErr || insErr.code === "23505") {
            // Jika berhasil masuk atau sudah ada (duplicate ignore)
            suksesCount++;
          }
        }

        await logAudit("import_users", { description: `Sinkronisasi excel pengguna/guru: ${suksesCount} diproses` });
        toast.success(`Import selesai: ${suksesCount} data guru berhasil disinkronkan.`);
        setDialogImportBuka(false);
        setFileExcel(null);
        queryClient.invalidateQueries({ queryKey: ["pengguna-aman"] });
        queryClient.invalidateQueries({ queryKey: ["daftar-guru"] });
      } catch (err: any) {
        toast.error("Gagal membaca file Excel: " + err.message);
      } finally {
        setLoadingAksi(false);
      }
    };
    reader.readAsBinaryString(fileExcel);
  }

  return (
    <AppShell title="Pengguna & Peran" description="Kelola peran akses dan sinkronisasi data madrasah">
      {!admin ? (
        <EmptyState
          title="Anda tidak memiliki akses"
          description="Hanya Administrator sistem yang dapat mengelola menu ini."
        />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : isError || !data ? (
        <ErrorState />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Total Data Guru Terdaftar: <span className="font-semibold text-foreground">{data.guru.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <Dialog open={dialogImportBuka} onOpenChange={setDialogImportBuka}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="size-4" /> Import Excel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import & Sinkronisasi Data dari Excel</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleImportExcel} className="space-y-4 pt-2">
                    <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-2">
                      <p className="font-semibold text-foreground">Panduan Import:</p>
                      <p>Unduh template resmi di bawah ini yang sudah memuat daftar guru.</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-2 w-full mt-1"
                        onClick={downloadTemplateExcel}
                      >
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
                        <Upload className="size-4 mr-2" /> Unggah & Sinkronkan
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Kartu Ringkasan Guru */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-base border-b pb-2">Daftar Guru Terdaftar ({data.guru.length})</h3>
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {data.guru.map((g, idx) => (
                  <div key={g.id} className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0">
                    <span className="text-muted-foreground">{idx + 1}.</span>
                    <span className="font-medium flex-1 px-2">{g.full_name}</span>
                    <Badge variant={g.user_id ? "secondary" : "outline"}>
                      {g.user_id ? "Aktif" : "Standar"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Kartu Ringkasan Supervisor */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-base border-b pb-2">Daftar Supervisor ({data.supervisor.length})</h3>
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {data.supervisor.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0">
                    <span className="text-muted-foreground">{idx + 1}.</span>
                    <span className="font-medium flex-1 px-2">{s.full_name}</span>
                    <Badge variant="secondary">Supervisor</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
