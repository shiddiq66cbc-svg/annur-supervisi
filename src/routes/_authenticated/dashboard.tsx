import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  UserCog,
  Link2,
  ShieldCheck,
  CalendarClock,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, pesanKesalahan, useCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Portal Supervisi MTs Annur 1" }] }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function Memuat() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

function Dashboard() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <AppShell
      title="Dashboard"
      description={
        user?.role
          ? `${ROLE_LABEL[user.role]} · Tahun Pelajaran 2026/2027`
          : "Tahun Pelajaran 2026/2027"
      }
    >
      {isLoading ? (
        <Memuat />
      ) : !user ? (
        <ErrorState />
      ) : user.role === "admin" || user.role === "kepala_madrasah" ? (
        <RingkasanPimpinan role={user.role} />
      ) : user.role === "supervisor" ? (
        <RingkasanSupervisor nama={user.fullName} supervisorId={user.supervisorId} />
      ) : user.role === "guru" ? (
        <RingkasanGuru teacherId={user.teacherId} />
      ) : (
        <TanpaPeran />
      )}
    </AppShell>
  );
}

function RingkasanPimpinan({ role }: { role: "admin" | "kepala_madrasah" }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stat-pimpinan"],
    queryFn: async () => {
      const [guru, supervisor, penugasan, pengguna] = await Promise.all([
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("supervisors").select("id", { count: "exact", head: true }),
        supabase.from("supervision_assignments").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const belumTertaut = await supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .is("user_id", null);
      return {
        guru: guru.count ?? 0,
        supervisor: supervisor.count ?? 0,
        penugasan: penugasan.count ?? 0,
        pengguna: pengguna.count ?? 0,
        belumTertaut: belumTertaut.count ?? 0,
      };
    },
  });

  if (isLoading) return <Memuat />;
  if (isError || !data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Guru" value={data.guru} icon={Users} />
        <StatCard label="Supervisor Akademik" value={data.supervisor} icon={UserCog} />
        <StatCard label="Penugasan Aktif" value={data.penugasan} icon={Link2} />
        <StatCard label="Akun Pengguna" value={data.pengguna} icon={ShieldCheck} />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Status Tahap Pembangunan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Modul fondasi (akun, peran, data guru, supervisor, penugasan, dan log audit) sudah aktif.
          Modul jadwal, dokumen, penilaian, dan laporan dikembangkan pada tahap berikutnya.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">Autentikasi</Badge>
          <Badge variant="secondary">Hak Akses</Badge>
          <Badge variant="secondary">Data Master Dasar</Badge>
          <Badge variant="secondary">Log Audit</Badge>
        </div>
        {role === "admin" && data.belumTertaut > 0 && (
          <p className="mt-4 rounded-lg bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
            {data.belumTertaut} data guru belum tertaut dengan akun pengguna. Tautkan melalui menu
            Pengguna &amp; Peran.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/guru">Lihat Data Guru</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/penugasan">Lihat Penugasan</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function RingkasanSupervisor({
  nama,
  supervisorId,
}: {
  nama: string;
  supervisorId: string | null;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stat-supervisor", supervisorId],
    enabled: !!supervisorId,
    queryFn: async () => {
      const { count } = await supabase
        .from("supervision_assignments")
        .select("id", { count: "exact", head: true })
        .eq("supervisor_id", supervisorId!);
      return { binaan: count ?? 0 };
    },
  });

  if (!supervisorId) {
    return (
      <EmptyState
        title="Akun belum tertaut dengan data supervisor"
        description={`Akun ${nama} memiliki peran Supervisor Akademik, namun belum dihubungkan dengan data supervisor. Hubungi Administrator sistem.`}
      />
    );
  }
  if (isLoading) return <Memuat />;
  if (isError || !data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Guru Binaan" value={data.binaan} icon={Users} />
        <StatCard label="Jadwal Supervisi" value="—" icon={CalendarClock} hint="Tersedia pada tahap berikutnya" />
        <StatCard label="Penilaian Berjalan" value="—" icon={ClipboardList} hint="Tersedia pada tahap berikutnya" />
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Tugas Supervisor Akademik</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Supervisor Akademik mempunyai tugas melaksanakan pemeriksaan administrasi pembelajaran,
          supervisi pelaksanaan pembelajaran, pembinaan, dan tindak lanjut dalam rangka peningkatan
          mutu pembelajaran di madrasah.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/guru">Lihat Guru Binaan</Link>
        </Button>
      </div>
    </div>
  );
}

function RingkasanGuru({ teacherId }: { teacherId: string | null }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stat-guru", teacherId],
    enabled: !!teacherId,
    queryFn: async () => {
      const { data: assign } = await supabase
        .from("supervision_assignments")
        .select("id, supervisors(full_name, position)")
        .eq("teacher_id", teacherId!)
        .maybeSingle();
      return assign;
    },
  });

  if (!teacherId) {
    return (
      <EmptyState
        title="Akun belum tertaut dengan data guru"
        description="Akun Anda memiliki peran Guru, namun belum dihubungkan dengan data guru madrasah. Hubungi Administrator sistem."
      />
    );
  }
  if (isLoading) return <Memuat />;
  if (isError) return <ErrorState />;

  const supervisor = data?.supervisors as { full_name: string; position: string | null } | null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Supervisor Pembina"
          value={supervisor?.full_name ?? "Belum ditetapkan"}
          icon={UserCog}
          hint={supervisor?.position ?? undefined}
        />
        <StatCard label="Jadwal Supervisi" value="—" icon={CalendarClock} hint="Tersedia pada tahap berikutnya" />
        <StatCard label="Hasil Supervisi" value="—" icon={ClipboardList} hint="Tersedia pada tahap berikutnya" />
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Informasi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Modul perangkat pembelajaran, video pembelajaran, hasil supervisi, dan tindak lanjut akan
          aktif pada tahap pengembangan berikutnya.
        </p>
      </div>
    </div>
  );
}

function TanpaPeran() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function ambilAdmin() {
    setLoading(true);
    const { data, error } = await supabase.rpc("claim_admin_if_none");
    setLoading(false);
    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }
    if (data === true) {
      toast.success("Akun Anda ditetapkan sebagai Administrator sistem.");
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } else {
      toast.error("Administrator sistem sudah ada. Hubungi Administrator untuk mendapatkan peran.");
    }
  }

  return (
    <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
      <ShieldCheck className="mx-auto size-9 text-primary" aria-hidden />
      <h2 className="mt-4 text-base font-semibold">Akun Anda belum memiliki peran</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        Hubungi Administrator sistem agar peran akses Anda ditetapkan. Jika portal ini baru pertama
        kali digunakan dan belum ada Administrator, Anda dapat menetapkan akun ini sebagai
        Administrator pertama.
      </p>
      <Button className="mt-5" onClick={ambilAdmin} disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        Jadikan Administrator Pertama
      </Button>
    </div>
  );
}
