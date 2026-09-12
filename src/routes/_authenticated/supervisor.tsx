import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/supervisor")({
  head: () => ({ meta: [{ title: "Supervisor Akademik — Portal Supervisi MTs Annur 1" }] }),
  component: HalamanSupervisor,
});

function HalamanSupervisor() {
  const { data: user } = useCurrentUser();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["daftar-supervisor"],
    queryFn: async () => {
      const { data: sup, error } = await supabase
        .from("supervisors")
        .select("id, full_name, position, order_no, user_id")
        .order("order_no");
      if (error) throw error;

      const { data: penugasan } = await supabase
        .from("supervision_assignments")
        .select("supervisor_id, teachers(full_name)");

      const peta = new Map<string, string[]>();
      for (const row of penugasan ?? []) {
        const t = row.teachers as { full_name: string } | null;
        if (!t) continue;
        const arr = peta.get(row.supervisor_id) ?? [];
        arr.push(t.full_name);
        peta.set(row.supervisor_id, arr);
      }

      return (sup ?? []).map((s) => ({
        ...s,
        binaan: (peta.get(s.id) ?? []).sort((a, b) => a.localeCompare(b, "id")),
      }));
    },
  });

  const judul = user?.role === "guru" ? "Supervisor Saya" : "Supervisor Akademik";

  return (
    <AppShell title={judul} description="Struktur supervisi akademik Tahun Pelajaran 2026/2027">
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Penanggung Jawab
          </p>
          <p className="mt-1 text-base font-semibold">Iwa Abdul Wahid, S.Pd., M.M.</p>
          <p className="text-sm text-muted-foreground">
            Kepala Madrasah · NIP 196706052005011007
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Supervisor Akademik mempunyai tugas melaksanakan pemeriksaan administrasi pembelajaran,
            supervisi pelaksanaan pembelajaran, pembinaan, dan tindak lanjut dalam rangka
            peningkatan mutu pembelajaran di madrasah.
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : isError ? (
          <ErrorState />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Tidak ada data supervisor"
            description="Belum ada data supervisor yang dapat Anda akses."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.map((s) => (
              <div key={s.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Supervisor {s.order_no ?? ""}
                    </p>
                    <p className="mt-1 font-semibold">{s.full_name}</p>
                    <p className="text-sm text-muted-foreground">{s.position ?? "—"}</p>
                  </div>
                  <Badge variant={s.user_id ? "secondary" : "outline"}>
                    {s.user_id ? "Akun tertaut" : "Belum tertaut"}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Guru binaan ({s.binaan.length})
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {s.binaan.length === 0 ? (
                      <li className="text-muted-foreground">Belum ada guru binaan.</li>
                    ) : (
                      s.binaan.map((n) => (
                        <li key={n} className="border-b border-dashed py-1 last:border-0">
                          {n}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
