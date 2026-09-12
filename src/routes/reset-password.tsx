import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, pesanKesalahan } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Atur Ulang Kata Sandi — Portal Supervisi MTs Annur 1" },
      { name: "description", content: "Atur ulang kata sandi akun Portal Supervisi Akademik MTs Annur 1." },
      { property: "og:title", content: "Atur Ulang Kata Sandi — Portal Supervisi MTs Annur 1" },
      { property: "og:description", content: "Buat kata sandi baru untuk akun portal Anda." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [loading, setLoading] = useState(false);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== konfirmasi) {
      toast.error("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }
    await logAudit("password_reset", { description: "Kata sandi diatur ulang" });
    toast.success("Kata sandi berhasil diperbarui.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <form onSubmit={simpan} className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Atur Ulang Kata Sandi</h1>
        <p className="text-sm text-muted-foreground">
          Buka halaman ini melalui tautan yang dikirim ke e-mail Anda.
        </p>
        <div className="space-y-2">
          <Label htmlFor="baru">Kata Sandi Baru</Label>
          <Input id="baru" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="konfirmasi">Konfirmasi Kata Sandi</Label>
          <Input id="konfirmasi" type="password" required minLength={8} value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Simpan Kata Sandi
        </Button>
      </form>
    </div>
  );
}
