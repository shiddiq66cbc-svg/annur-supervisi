import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ClipboardCheck, Video, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portal Supervisi Akademik MTs Annur 1" },
      {
        name: "description",
        content:
          "Sistem digital supervisi akademik guru MTs Annur 1, Malangbong, Garut: penjadwalan, penilaian, tindak lanjut, dan laporan.",
      },
      { property: "og:title", content: "Portal Supervisi Akademik MTs Annur 1" },
      {
        property: "og:description",
        content:
          "Kelola perencanaan, pelaksanaan, penilaian, dan tindak lanjut supervisi akademik guru dalam satu portal.",
      },
    ],
  }),
  component: Beranda,
});

const fitur = [
  { icon: ClipboardCheck, title: "Administrasi Pembelajaran", text: "Pemeriksaan perangkat pembelajaran secara terstruktur." },
  { icon: Video, title: "Supervisi Langsung & Video", text: "Dua metode supervisi dengan bukti yang dapat diverifikasi." },
  { icon: LineChart, title: "Hasil & Tindak Lanjut", text: "Skor, predikat, rekomendasi, hingga supervisi ulang." },
  { icon: ShieldCheck, title: "Akses Berjenjang", text: "Hak akses ketat untuk setiap peran pengguna." },
];

function Beranda() {
  return (
    <div className="min-h-screen">
      <section className="surface-gradient text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Madrasah Tsanawiyah Annur 1
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
            Portal Supervisi Akademik
          </h1>
          <p className="mt-4 text-sm opacity-90 sm:text-base">
            Malangbong – Garut · Tahun Pelajaran 2026/2027
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-sm opacity-90 sm:text-base">
            Sistem resmi pengelolaan supervisi akademik guru: perencanaan, penjadwalan, pemeriksaan
            administrasi, penilaian pembelajaran, tindak lanjut, hingga pelaporan.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Masuk ke Portal</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fitur.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-sm">
              <f.icon className="size-6 text-primary" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Penanggung Jawab Supervisi Akademik: Iwa Abdul Wahid, S.Pd., M.M. — Kepala Madrasah
        </p>
      </section>
    </div>
  );
}
