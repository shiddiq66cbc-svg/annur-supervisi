import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
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

export const Route = createFileRoute("/_authenticated/audit-log")({
  head: () => ({ meta: [{ title: "Log Audit — Portal Supervisi MTs Annur 1" }] }),
  component: HalamanAudit,
});

const AKSI: Record<string, string> = {
  login: "Masuk",
  logout: "Keluar",
  update: "Perubahan data",
  role_change: "Perubahan peran",
  role_bootstrap: "Penetapan admin pertama",
  password_reset: "Atur ulang kata sandi",
  account_link: "Penautan akun",
};

function HalamanAudit() {
  const { data: user } = useCurrentUser();
  const berwenang = user?.role === "admin" || user?.role === "kepala_madrasah";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-log"],
    enabled: berwenang,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity, description, actor_name, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return rows ?? [];
    },
  });

  return (
    <AppShell title="Log Audit" description="Rekam jejak aktivitas penting pengguna portal">
      {!berwenang ? (
        <EmptyState
          title="Anda tidak memiliki akses"
          description="Hanya Administrator dan Kepala Madrasah yang dapat melihat log audit."
        />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Belum ada aktivitas tercatat" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Objek</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{AKSI[r.action] ?? r.action}</Badge>
                  </TableCell>
                  <TableCell>{r.actor_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.entity ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.description ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
