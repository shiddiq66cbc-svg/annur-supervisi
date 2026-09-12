import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, pesanKesalahan } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Masuk — Portal Supervisi Akademik MTs Annur 1" },
      {
        name: "description",
        content: "Halaman masuk pengguna Portal Supervisi Akademik MTs Annur 1.",
      },
      { property: "og:title", content: "Masuk — Portal Supervisi Akademik MTs Annur 1" },
      { property: "og:description", content: "Masuk ke Portal Supervisi Akademik MTs Annur 1." },
    ],
  }),
  component: HalamanAuth,
});

function HalamanAuth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [lupa, setLupa] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }
    await logAudit("login", { description: "Pengguna masuk ke portal" });
    toast.success("Berhasil masuk.");
    navigate({ to: "/dashboard", replace: true });
  }

  async function daftar(e: React.FormEvent) {
    e.preventDefault();
    if (nama.trim().length < 3) {
      toast.error("Nama lengkap wajib diisi minimal 3 karakter.");
      return;
    }
    if (password.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: { full_name: nama.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(pesanKesalahan(error));
      return;
    }
    if (!data.session) {
      toast.success("Pendaftaran berhasil. Silakan periksa e-mail Anda untuk konfirmasi akun.");
      setMode("masuk");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function kirimReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
          Gunakan akun madrasah Anda. Peran akses (Administrator, Kepala Madrasah, Supervisor
          Akademik, atau Guru) ditetapkan oleh Administrator sistem.
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
            <Tabs value={mode} onValueChange={(v) => setMode(v as "masuk" | "daftar")} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="masuk">Masuk</TabsTrigger>
                <TabsTrigger value="daftar">Daftar Akun</TabsTrigger>
              </TabsList>

              <TabsContent value="masuk">
                <form onSubmit={masuk} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@madrasah.sch.id"
                    />
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
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Masuk
                  </Button>
                  <button
                    type="button"
                    onClick={() => setLupa(true)}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Lupa kata sandi?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="daftar">
                <form onSubmit={daftar} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="nama">Nama Lengkap</Label>
                    <Input
                      id="nama"
                      required
                      minLength={3}
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama sesuai data madrasah"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-daftar">E-mail</Label>
                    <Input
                      id="email-daftar"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-daftar">Kata Sandi</Label>
                    <Input
                      id="password-daftar"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Daftar
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Akun baru belum memiliki peran. Administrator sistem akan menetapkan peran akses
                    Anda.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
