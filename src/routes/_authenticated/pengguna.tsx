import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, logAudit, pesanKesalahan, useCurrentUser, type AppRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authenticated/pengguna")({
  head: () => ({ meta: [{ title: "Pengguna & Peran — Portal Supervisi MTs Annur 1" }] }),
  component: HalamanPengguna,
});

const ROLES: AppRole[] = ["admin", "kepala_madrasah", "supervisor", "guru"];

function HalamanPengguna() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [proses, setProses] = useState<string | null>(null);
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
      ) : data.pengguna.length === 0 ? (
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
    </AppShell>
  );
}
