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
  DialogFooter,
  DialogDescription,
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
  const [dialogKonfirmasiBuka, setDialogKonfirmasiBuka] = useState(false);
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

async function tambahGuru(e: React.FormEvent) {
  e.preventDefault();

  if (!namaGuru.trim()) {
    toast.error("Nama guru wajib diisi.");
    return;
  }

  setLoadingAksi(true);

  try {
    /*
     * Tahap 1:
     * Buat data guru saja.
     * Pembuatan akun Auth dilakukan melalui Edge Function.
     */
    const { data: newT, error: errTeacher } = await supabase
      .from("teachers")
      .insert({
        full_name: namaGuru.trim(),
        nip: nipGuru.trim() || null,
        is_active: true,
      })
      .select("id, full_name, nip")
      .single();

    if (errTeacher || !newT) {
      throw new Error(
        errTeacher?.message ?? "Data guru gagal dibuat.",
      );
    }

    /*
     * Tahap 2:
     * Panggil server-side provisioning.
     */
    const { data: result, error: functionError } =
      await supabase.functions.invoke("provision-teacher-accounts", {
        body: {
          teacherIds: [newT.id],
        },
      });

    if (functionError) {
      throw new Error(functionError.message);
    }

    const failed = result?.accounts?.find(
      (account: { status: string }) => account.status === "failed",
    );

    if (failed) {
      throw new Error(
        failed.message ?? "Akun guru gagal dibuat.",
      );
    }

    const account = result?.accounts?.find(
      (item: { teacher_id: string }) => item.teacher_id === newT.id,
    );

    await logAudit("create_teacher", {
      description: `Admin menambahkan guru dan akun portal: ${newT.full_name}`,
    });

    toast.success("Data guru dan akun portal berhasil dibuat.");

    if (account?.email && account?.password) {
      toast.info(
        `Akun: ${account.email} | Password awal: ${account.password}`,
        {
          duration: 15000,
        },
      );
    }

    setDialogTambahBuka(false);
    setNamaGuru("");
    setNipGuru("");

    queryClient.invalidateQueries({
      queryKey: ["daftar-guru"],
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat membuat akun guru.";

    toast.error("Gagal menambah guru: " + message);
  } finally {
    setLoadingAksi(false);
  }
}

async function generateAkunMassal() {
  setLoadingAksi(true);

  try {
    const { data: semuaGuru, error: fetchErr } = await supabase
      .from("teachers")
      .select("id, full_name, nip, user_id")
      .eq("is_active", true);

    if (fetchErr) {
      throw fetchErr;
    }

    const teachersWithoutUser = (semuaGuru ?? []).filter(
      (teacher) => !teacher.user_id,
    );

    if (teachersWithoutUser.length === 0) {
      toast.info("Semua guru sudah memiliki akun login.");
      setDialogKonfirmasiBuka(false);
      return;
    }

    const teacherIds = teachersWithoutUser.map(
      (teacher) => teacher.id,
    );

    const { data: result, error: functionError } =
      await supabase.functions.invoke(
        "provision-teacher-accounts",
        {
          body: {
            teacherIds,
          },
        },
      );

    if (functionError) {
      throw new Error(functionError.message);
    }

    const created =
      result?.summary?.created ?? 0;

    const failed =
      result?.summary?.failed ?? 0;

    const alreadyLinked =
      result?.summary?.already_linked ?? 0;

    const failedAccounts =
      (result?.accounts ?? []).filter(
        (account: { status: string }) =>
          account.status === "failed",
      );

    if (failed > 0) {
      const detail = failedAccounts
        .slice(0, 3)
        .map(
          (account: {
            full_name: string;
            message?: string;
          }) =>
            `${account.full_name}: ${
              account.message ?? "gagal"
            }`,
        )
        .join("\n");

      toast.error(
        `Pembuatan akun selesai dengan ${failed} kegagalan.\n${detail}`,
        {
          duration: 12000,
        },
      );
    }

    if (created > 0) {
      toast.success(
        `Berhasil membuat ${created} akun guru.`,
        {
          duration: 8000,
        },
      );
    }

    if (alreadyLinked > 0) {
      toast.info(
        `${alreadyLinked} guru sudah terhubung dengan akun.`,
      );
    }

    /*
     * Tampilkan kredensial hanya sekali kepada administrator.
     * Administrator dapat menyalinnya dan membagikannya kepada guru.
     */
    const createdAccounts =
      (result?.accounts ?? []).filter(
        (account: {
          status: string;
          email?: string;
          password?: string | null;
        }) =>
          account.status === "created" &&
          account.email &&
          account.password,
      );

    if (createdAccounts.length > 0) {
      console.table(
        createdAccounts.map(
          (account: {
            full_name: string;
            email: string;
            password: string;
          }) => ({
            Guru: account.full_name,
            Email: account.email,
            "Password Awal": account.password,
          }),
        ),
      );

      toast.info(
        `${createdAccounts.length} kredensial akun dibuat. Lihat console untuk detail sementara.`,
        {
          duration: 10000,
        },
      );
    }

    setDialogKonfirmasiBuka(false);

    queryClient.invalidateQueries({
      queryKey: ["daftar-guru"],
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat sinkronisasi akun.";

    toast.error(
      "Gagal mengenerate akun: " + message,
    );
  } finally {
    setLoadingAksi(false);
  }
}

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

async function handleImport(e: React.FormEvent) {
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

      if (!bstr) {
        throw new Error("File Excel tidak dapat dibaca.");
      }

      const wb = XLSX.read(bstr, {
        type: "binary",
      });

      const sheetName = wb.SheetNames[0];

      if (!sheetName) {
        throw new Error("Sheet Excel tidak ditemukan.");
      }

      const ws = wb.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json<{
        Nama_Lengkap?: string;
        nama?: string;
        full_name?: string;
        NIP?: string | number;
        nip?: string | number;
      }>(ws);

      if (rows.length === 0) {
        throw new Error("File Excel tidak memiliki data.");
      }

      const teacherIds: string[] = [];
      let imported = 0;

      for (const row of rows) {
        const name =
          row.Nama_Lengkap ??
          row.nama ??
          row.full_name;

        const nip =
          row.NIP ??
          row.nip ??
          "";

        if (!name || !String(name).trim()) {
          continue;
        }

        const { data: teacher, error } = await supabase
          .from("teachers")
          .insert({
            full_name: String(name).trim(),
            nip: String(nip).trim() || null,
            is_active: true,
          })
          .select("id")
          .single();

        if (error || !teacher) {
          throw new Error(
            `Gagal mengimpor guru "${String(name)}": ${
              error?.message ?? "data tidak terbentuk"
            }`,
          );
        }

        teacherIds.push(teacher.id);
        imported++;
      }

      if (teacherIds.length === 0) {
        throw new Error(
          "Tidak ada data guru valid yang dapat diimpor.",
        );
      }

      /*
       * Setelah seluruh teacher berhasil dibuat,
       * buat akun Auth secara server-side sekaligus.
       */
      const {
        data: result,
        error: functionError,
      } = await supabase.functions.invoke(
        "provision-teacher-accounts",
        {
          body: {
            teacherIds,
          },
        },
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      const created =
        result?.summary?.created ?? 0;

      const failed =
        result?.summary?.failed ?? 0;

      toast.success(
        `Import ${imported} guru selesai. ${created} akun portal berhasil dibuat.`,
        {
          duration: 8000,
        },
      );

      if (failed > 0) {
        toast.error(
          `${failed} akun gagal dibuat. Periksa detail hasil provisioning.`,
          {
            duration: 10000,
          },
        );
      }

      setDialogImportBuka(false);
      setFileExcel(null);

      queryClient.invalidateQueries({
        queryKey: ["daftar-guru"],
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat import.";

      toast.error("Gagal import: " + message);
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
              {/* Tombol yang membuka Modal Konfirmasi Elegan */}
              <Button variant="secondary" onClick={() => setDialogKonfirmasiBuka(true)} disabled={loadingAksi} className="gap-2">
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

        {/* Modal Dialog Konfirmasi Custom yang Cantik */}
        <Dialog open={dialogKonfirmasiBuka} onOpenChange={setDialogKonfirmasiBuka}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600">
                <KeyRound className="size-5" /> Konfirmasi Sinkronisasi Akun
              </DialogTitle>
              <DialogDescription className="pt-2 text-sm text-muted-foreground">
                Apakah Anda ingin membuatkan akun login otomatis untuk seluruh guru yang belum memiliki akun di portal ini?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogKonfirmasiBuka(false)} disabled={loadingAksi}>
                Batal
              </Button>
              <Button onClick={generateAkunMassal} disabled={loadingAksi} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                {loadingAksi && <Loader2 className="size-4 animate-spin" />}
                Ya, Buat Akun Otomatis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
