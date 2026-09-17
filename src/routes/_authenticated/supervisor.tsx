import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, logAudit, pesanKesalahan } from "@/lib/auth";
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
import { UserPlus, Settings2, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/supervisor")({
  head: () => ({ meta: [{ title: "Supervisor Akademik & Penugasan — Portal Supervisi MTs Annur 1" }] }),
  component: HalamanSupervisor,
});

type SupervisorItem = {
  id: string;
  full_name: string;
  position: string | null;
  order_no: number | null;
  user_id: string | null;
  binaan: { id: string; full_name: string }[];
};

type GuruItem = {
  id: string;
  full_name: string;
};

function HalamanSupervisor() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const admin = user?.role === "admin";

  const [dialogTambahBuka, setDialogTambahBuka] = useState(false);
  const [dialogAturBuka, setDialogAturBuka] = useState(false);
  const [supervisorTerpilih, setSupervisorTerpilih] = useState<SupervisorItem | null>(null);
  const [loadingAksi, setLoadingAksi] = useState(false);

  // Form State Tambah Supervisor
  const [namaSup, setNamaSup] = useState("");
  const [posisiSup, setPosisiSup] = useState("Supervisor Akademik");
  const [urutSup, setUrutSup] = useState("1");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["daftar-supervisor-lengkap"],
    queryFn: async () => {
      const { data: sup, error } = await supabase
        .from("supervisors")
        .select("id, full_name, position, order_no, user_id")
        .order("order_no");
      if (error) throw error;

      const { data: penugasan } = await supabase
        .from("supervision_assignments")
        .select("supervisor_id, teacher_id, teachers(id, full_name)");

      const peta = new Map<string, { id: string; full_name: string }[]>();
      for (const row of penugasan ?? []) {
        const t = row.teachers as { id: string; full_name: string } | null;
        if (!t) continue;
        const arr = peta.get(row.supervisor_id) ?? [];
        arr.push({ id: t.id, full_name: t.full_name });
        peta.set(row.supervisor_id, arr);
      }

      // Ambil juga daftar seluruh guru untuk pilihan pengaturan binaan
      const { data: semuaGuru } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");

      const listSup: SupervisorItem[] = (sup ?? []).map((s) => ({
        ...s,
        binaan: (peta.get(s.id) ?? []).sort((a, b) => a.full_name.localeCompare(b.full_name, "id")),
      }));

      return {
        supervisor: listSup,
        semuaGuru: (semuaGuru ?? []) as GuruItem[],
      };
    },
  });

  // Tambah Supervisor Baru
  async function tambahSupervisor(e: React.FormEvent) {
    e.preventDefault();
    if (!namaSup.trim()) {
      toast.error("Nama supervisor wajib diisi.");
      return;
    }
    setLoadingAksi(true);

    try {
      const { error } = await supabase.from("supervisors").insert({
        full_name: namaSup.trim(),
        position: posisiSup.trim(),
        order_no: parseInt(urutSup) || 1,
      });

      if (error) throw error;

      await logAudit("create_supervisor", { description: `Admin menambahkan supervisor: ${namaSup}` });
      toast.success("Supervisor berhasil ditambahkan.");
      setDialogTambahBuka(false);
      setNamaSup("");
      queryClient.invalidateQueries({ queryKey: ["daftar-supervisor-lengkap"] });
    } catch (err: any) {
      toast.error("Gagal menambah supervisor: " + err.message);
    } finally {
      setLoadingAksi(false);
    }
  }

  // Hapus Supervisor
  async function hapusSupervisor(id: string, nama: string) {
    if (!confirm(`Hapus ${nama} dari daftar supervisor?`)) return;
    setLoadingAksi(true);

    try {
      // Hapus penugasan terkait dulu
      await supabase.from("supervision_assignments").delete().eq("supervisor_id", id);
      const { error } = await supabase.from("supervisors").delete().eq("id", id);
      if (error) throw error;

      await logAudit("delete_supervisor", { description: `Admin menghapus supervisor: ${nama}` });
      toast.success("Supervisor berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["daftar-supervisor-lengkap"] });
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    } finally {
      setLoadingAksi(false);
    }
  }

  // Toggle Guru Binaan untuk Supervisor Terpilih
  async function toggleBinaan(teacherId: string, statusSaatIni: boolean) {
    if (!supervisorTerpilih) return;
    setLoadingAksi(true);

    try {
      if (statusSaatIni) {
        // Hapus penugasan
        await supabase
          .from("supervision_assignments")
          .delete()
          .eq("supervisor_id", supervisorTerpilih.id)
          .eq("teacher_id", teacherId);
      } else {
        // Tambah penugasan
        await supabase.from("supervision_assignments").insert({
          supervisor_id: supervisorTerpilih.id,
          teacher_id: teacherId,
        });
      }

      // Refresh data lokal supervisor terpilih
      const { data: updatedAssign } = await supabase
        .from("supervision_assignments")
        .select("teacher_id, teachers(id, full_name)")
        .eq("supervisor_id", supervisorTerpilih.id);

      const newBinaan = (updatedAssign ?? [])
        .map((r: any) => r.teachers)
        .filter(Boolean)
        .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name, "id"));

      setSupervisorTerpilih({
        ...supervisorTerpilih,
        binaan: newBinaan,
      });

      queryClient.invalidateQueries({ queryKey: ["daftar-supervisor-lengkap"] });
      toast.success("Penugasan guru binaan diperbarui.");
    } catch (err: any) {
      toast.error("Gagal memperbarui penugasan: " + err.message);
    } finally {
      setLoadingAksi(false);
    }
  }

  const judul = user?.role === "guru" ? "Supervisor Saya" : "Supervisor Akademik & Penugasan";

  return (
    <AppShell title={judul} description="Kelola daftar supervisor dan pembagian guru binaan Tahun Pelajaran 2026/2027">
      <div className="space-y-6">
        {/* Info Kepala Madrasah */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Penanggung Jawab Utama
            </p>
            <p className="mt-1 text-base font-semibold">Iwa Abdul Wahid, S.Pd., M.M.</p>
            <p className="text-sm text-muted-foreground">
              Kepala Madrasah · NIP 196706052005011007
            </p>
          </div>
          {admin && (
            <Dialog open={dialogTambahBuka} onOpenChange={setDialogTambahBuka}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="size-4" /> Tambah Supervisor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Supervisor Akademik</DialogTitle>
                </DialogHeader>
                <form onSubmit={tambahSupervisor} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label>Nama Lengkap & Gelar</Label>
                    <Input
                      required
                      value={namaSup}
                      onChange={(e) => setNamaSup(e.target.value)}
                      placeholder="Contoh: Iskandar Berlianta, S.Pd.I."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Jabatan / Keterangan</Label>
                    <Input
                      value={posisiSup}
                      onChange={(e) => setPosisiSup(e.target.value)}
                      placeholder="Supervisor Akademik"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Nomor Urut (Urutan Tampil)</Label>
                    <Input
                      type="number"
                      value={urutSup}
                      onChange={(e) => setUrutSup(e.target.value)}
                      min={1}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogTambahBuka(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={loadingAksi}>
                      {loadingAksi && <Loader2 className="size-4 animate-spin mr-2" />}
                      Simpan Supervisor
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Daftar Supervisor & Pengaturan Guru Binaan */}
        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : isError || !data ? (
          <ErrorState />
        ) : data.supervisor.length === 0 ? (
          <EmptyState
            title="Tidak ada data supervisor"
            description="Belum ada data supervisor terdaftar."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.supervisor.map((s) => (
              <div key={s.id} className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Supervisor Urut {s.order_no ?? ""}
                      </p>
                      <p className="mt-1 font-semibold text-lg">{s.full_name}</p>
                      <p className="text-sm text-muted-foreground">{s.position ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.user_id ? "secondary" : "outline"}>
                        {s.user_id ? "Akun tertaut" : "Belum tertaut"}
                      </Badge>
                      {admin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => hapusSupervisor(s.id, s.full_name)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        Guru Binaan ({s.binaan.length})
                      </p>
                      {admin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() => {
                            setSupervisorTerpilih(s);
                            setDialogAturBuka(true);
                          }}
                        >
                          <Settings2 className="size-3.5" /> Atur Binaan
                        </Button>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto pr-2">
                      {s.binaan.length === 0 ? (
                        <li className="text-muted-foreground italic">Belum ada guru binaan ditugaskan.</li>
                      ) : (
                        s.binaan.map((b) => (
                          <li key={b.id} className="border-b border-dashed py-1 last:border-0 flex justify-between items-center">
                            <span>{b.full_name}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Dialog Pengaturan Guru Binaan */}
        <Dialog open={dialogAturBuka} onOpenChange={setDialogAturBuka}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Atur Guru Binaan</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Supervisor: <span className="font-semibold text-foreground">{supervisorTerpilih?.full_name}</span>
              </p>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 my-2 border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Centang guru yang menjadi binaan supervisor ini:</p>
              {data?.semuaGuru.map((g) => {
                const isBinaan = supervisorTerpilih?.binaan.some((b) => b.id === g.id);
                return (
                  <label
                    key={g.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <span>{g.full_name}</span>
                    <input
                      type="checkbox"
                      checked={!!isBinaan}
                      disabled={loadingAksi}
                      onChange={() => toggleBinaan(g.id, !!isBinaan)}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setDialogAturBuka(false)}>Selesai</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
