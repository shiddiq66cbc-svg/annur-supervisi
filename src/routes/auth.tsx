import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, pesanKesalahan } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Masuk — Portal Supervisi Akademik MTs Annur 1" }],
  }),
  component: HalamanAuth,
});

function HalamanAuth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lupa, setLupa] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  // Mengambil daftar profil/pengguna yang ada di database untuk pilihan dropdown
  const { data: daftarPengguna } = useQuery({
    queryKey: ["auth-users-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmail) {
      toast.error("Silakan pilih nama Anda terlebih dahulu.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: selectedEmail.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }

    await logAudit("login", { description: "Pengguna masuk ke portal" });
    toast.success("Berhasil masuk.");
    navigate({ to: "/dashboard", replace: true });
  }

  async function kirimReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }
    toast.success("Tautan atur ulang kata sandi telah dikirim ke e-mail Anda.");
    setLupa(false);
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="surface-gradient flex flex-col justify-center px-8 py-12 text-primary-foreground lg:w-1/2 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          MTs Annur 1
        </p>
        <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-4xl">
          Portal Supervisi Akademik
        </h1>
        <p className="mt-3 text-sm opacity-90">
          Cinagara – Malangbong – Garut · Tahun Pelajaran 2026/2027
        </p>
        <p className="mt-6 max-w-md text-sm opacity-85">
          Pilih nama Anda dari daftar, masukkan kata sandi, dan masuk ke sistem tanpa perlu menghafal e-mail.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Kembali ke beranda
          </Link>

          {lupa ? (
            <form onSubmit={kirimReset} className="mt-6 space-y-4 rounded-xl border bg-card p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold">Lupa Kata Sandi</h2>
                <p className="text-sm text-muted-foreground">
                  Masukkan e-mail terdaftar untuk menerima tautan atur ulang.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="nama@madrasah.sch.id"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Kirim Tautan
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setLupa(false)}>
                Batal
              </Button>
            </form>
          ) : (
            <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Masuk ke Portal</h2>
                <p className="text-sm text-muted-foreground">
                  Pilih nama Anda dari daftar di bawah ini.
                </p>
              </div>

              <form onSubmit={masuk} className="space-y-4">
                <div className="space-y-2">
                  <Label>Pilih Nama Pengguna / Guru</Label>
                  <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="-- Pilih Nama Anda --" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {daftarPengguna?.map((p) => (
                        <SelectItem key={p.id} value={p.email ?? ""}>
                          {p.full_name} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Masuk
                </Button>

                <button
                  type="button"
                  onClick={() => setLupa(true)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground pt-2"
                >
                  Lupa kata sandi?
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
