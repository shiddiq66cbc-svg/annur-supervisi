import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/penugasan")({
  head: () => ({ meta: [{ title: "Penugasan Supervisor — Portal Supervisi MTs Annur 1" }] }),
  component: HalamanPenugasan,
});

function HalamanPenugasan() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["penugasan"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("supervision_assignments")
        .select("id, supervisors(full_name, position, order_no), teachers(full_name), academic_years(name)");
      if (error) throw error;
      return (rows ?? [])
        .map((r) => ({
          id: r.id,
          supervisor: (r.supervisors as { full_name: string; position: string | null; order_no: number | null } | null),
          guru: (r.teachers as { full_name: string } | null)?.full_name ?? "—",
          tahun: (r.academic_years as { name: string } | null)?.name ?? "—",
        }))
        .sort(
          (a, b) =>
            (a.supervisor?.order_no ?? 99) - (b.supervisor?.order_no ?? 99) ||
            a.guru.localeCompare(b.guru, "id"),
        );
    },
  });

  return (
    <AppShell title="Penugasan Supervisor" description="Pasangan supervisor dan guru binaan">
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Belum ada penugasan" description="Belum ada penugasan supervisor yang tercatat." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Guru Binaan</TableHead>
                <TableHead>Tahun Pelajaran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.supervisor?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.supervisor?.position ?? "—"}</TableCell>
                  <TableCell>{r.guru}</TableCell>
                  <TableCell className="text-muted-foreground">{r.tahun}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
