import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/guru")({
  head: () => ({ meta: [{ title: "Data Guru — Portal Supervisi MTs Annur 1" }] }),
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
  const [cari, setCari] = useState("");

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

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (g) => g.full_name.toLowerCase().includes(q) || (g.supervisor ?? "").toLowerCase().includes(q),
    );
  }, [data, cari]);

  const judul = user?.role === "supervisor" ? "Guru Binaan" : "Data Guru";

  return (
    <AppShell title={judul} description="Tahun Pelajaran 2026/2027">
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama guru atau supervisor…"
            className="pl-9"
            aria-label="Cari guru"
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : isError ? (
          <ErrorState />
        ) : hasil.length === 0 ? (
          <EmptyState
            title="Tidak ada data guru"
            description={
              cari
                ? "Tidak ditemukan guru yang cocok dengan pencarian Anda."
                : "Belum ada data guru yang dapat Anda akses."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Guru</TableHead>
                  <TableHead>Supervisor Pembina</TableHead>
                  <TableHead>Akun Portal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hasil.map((g, i) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{g.supervisor ?? "—"}</TableCell>
                    <TableCell>
                      {g.user_id ? (
                        <Badge variant="secondary">Tertaut</Badge>
                      ) : (
                        <Badge variant="outline">Belum tertaut</Badge>
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
        <p className="text-xs text-muted-foreground">Menampilkan {hasil.length} data.</p>
      </div>
    </AppShell>
  );
}
