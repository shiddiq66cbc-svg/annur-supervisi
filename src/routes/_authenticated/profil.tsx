import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, logAudit, pesanKesalahan, useCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({ meta: [{ title: "Profil Saya — Portal Supervisi MTs Annur 1" }] }),
  component: Profil,
});

function Profil() {
  const { data: user, isLoading, isError } = useCurrentUser();
  const queryClient = useQueryClient();
  const [nama, setNama] = useState("");
  const [nip, setNip] = useState("");
  const [telepon, setTelepon] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setNama(user.fullName);
      setNip(user.nip ?? "");
      setTelepon(user.phone ?? "");
    }
  }, [user]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (nama.trim().length < 3) {
      toast.error("Nama lengkap wajib diisi minimal 3 karakter.");
      return;
    }
    if (nip && !/^\d{8,20}$/.test(nip.trim())) {
      toast.error("NIP hanya boleh berisi angka (8–20 digit).");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nama.trim(),
        nip: nip.trim() || null,
        phone: telepon.trim() || null,
      })
      .eq("id", user!.userId);
    setLoading(false);
    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }
    await logAudit("update", { entity: "profiles", entityId: user!.userId, description: "Profil diperbarui" });
    toast.success("Profil berhasil diperbarui.");
    queryClient.invalidateQueries({ queryKey: ["current-user"] });
  }

  return (
    <AppShell title="Profil Saya" description="Data akun pengguna portal">
      {isLoading ? (
        <Skeleton className="h-80 w-full max-w-2xl rounded-xl" />
      ) : isError || !user ? (
        <ErrorState />
      ) : (
        <form onSubmit={simpan} className="max-w-2xl space-y-5 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={user.email ?? "-"} disabled />
          </div>
          <div className="space-y-2">
            <Label>Peran Akses</Label>
            <Input value={user.role ? ROLE_LABEL[user.role] : "Belum ditetapkan"} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Lengkap</Label>
            <Input id="nama" required value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nip">NIP (opsional)</Label>
            <Input id="nip" value={nip} onChange={(e) => setNip(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telepon">Nomor Telepon (opsional)</Label>
            <Input id="telepon" value={telepon} onChange={(e) => setTelepon(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Simpan Perubahan
          </Button>
        </form>
      )}
    </AppShell>
  );
}
