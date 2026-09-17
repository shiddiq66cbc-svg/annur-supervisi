import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, logAudit, pesanKesalahan } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Upload, Video, FileText, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dokumen-saya")({
  head: () => ({ meta: [{ title: "Dokumen & Metode Supervisi — Portal Supervisi MTs Annur 1" }] }),
  component: HalamanDokumenSaya,
});

function HalamanDokumenSaya() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // State Form
  const [metodePilihan, setMetodePilihan] = useState<string>("langsung");
  const [linkVideo, setLinkVideo] = useState("");
  const [fileSilabus, setFileSilabus] = useState<File | null>(null);
  const [fileRpp, setFileRpp] = useState<File | null>(null);

  // Ambil data guru yang terautentikasi dan dokumen/metode yang sudah diunggah
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dokumen-guru-saya", user?.userId],
    enabled: !!user?.userId,
    queryFn: async () => {
      // Ambil data guru berdasarkan user_id
      const { data: guruData, error: errGuru } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("user_id", user?.userId)
        .maybeSingle();

      if (errGuru) throw errGuru;
      if (!guruData) return { guru: null, dokumen: null };

      // Ambil dokumen pembelajaran terkait guru ini
      const { data: dokData } = await supabase
        .from("learning_documents")
        .select("*")
        .eq("teacher_id", guruData.id)
        .maybeSingle();

      return {
        guru: guruData,
        dokumen: dokData,
      };
    },
  });

  async function handleSimpan(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.guru) {
      toast.error("Akun Anda belum ditautkan ke data Guru oleh Administrator.");
      return;
    }

    setLoading(true);
    try {
      let silabusUrl = data.dokumen?.syllabus_url || null;
      let rppUrl = data.dokumen?.rpp_url || null;

      // Upload Silabus jika ada file baru
      if (fileSilabus) {
        const fileExt = fileSilabus.name.split(".").pop();
        const fileName = `${data.guru.id}_silabus_${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("learning_documents")
          .upload(fileName, fileSilabus);

        if (uploadErr) throw uploadErr;
        const { data: publicURL } = supabase.storage.from("learning_documents").getPublicUrl(fileName);
        silabusUrl = publicURL.publicUrl;
      }

      // Upload RPP jika ada file baru
      if (fileRpp) {
        const fileExt = fileRpp.name.split(".").pop();
        const fileName = `${data.guru.id}_rpp_${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("learning_documents")
          .upload(fileName, fileRpp);

        if (uploadErr) throw uploadErr;
        const { data: publicURL } = supabase.storage.from("learning_documents").getPublicUrl(fileName);
        rppUrl = publicURL.publicUrl;
      }

      // Simpan ke tabel learning_documents (Upsert)
      const payload = {
        teacher_id: data.guru.id,
        syllabus_url: silabusUrl,
        rpp_url: rppUrl,
        supervision_method: metodePilihan,
        video_url: metodePilihan === "video" ? linkVideo.trim() : null,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("learning_documents")
        .upsert(payload, { onConflict: "teacher_id" });

      if (upsertErr) throw upsertErr;

      await logAudit("submit_learning_documents", { description: "Guru mengunggah perangkat pembelajaran & metode supervisi" });
      toast.success("Perangkat pembelajaran dan metode supervisi berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["dokumen-guru-saya"] });
    } catch (err: any) {
      toast.error(pesanKesalahan(err) || "Gagal menyimpan dokumen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Perangkat & Metode Supervisi"
      description="Unggah Silabus, RPP, dan pilih metode pelaksanaan supervisi Anda"
    >
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState />
      ) : !data?.guru ? (
        <EmptyState
          title="Akun belum ditautkan"
          description="Akun Anda belum terhubung dengan data Guru. Silakan hubungi Administrator sistem."
        />
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Status Informasi */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-2">
            <h3 className="font-semibold text-base">Identitas Guru</h3>
            <p className="text-sm text-muted-foreground">
              Nama: <span className="font-medium text-foreground">{data.guru.full_name}</span>
            </p>
            {data.dokumen && (
              <div className="flex items-center gap-2 pt-2 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="size-4" /> Perangkat pembelajaran sudah pernah disubmit.
              </div>
            )}
          </div>

          {/* Form Unggah */}
          <form onSubmit={handleSimpan} className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-base border-b pb-2">1. Unggah Perangkat Administrasi</h3>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="size-4 text-indigo-600" /> Dokumen Silabus / Perangkat Pembelajaran (PDF / Word)
                </Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFileSilabus(e.target.files?.[0] || null)}
                />
                {data.dokumen?.syllabus_url && (
                  <p className="text-xs text-muted-foreground">
                    File saat ini: <a href={data.dokumen.syllabus_url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Lihat Silabus Terunggah</a>
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Label className="flex items-center gap-2">
                  <FileText className="size-4 text-indigo-600" /> Dokumen RPP / Perencanaan Pembelajaran (PDF / Word)
                </Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFileRpp(e.target.files?.[0] || null)}
                />
                {data.dokumen?.rpp_url && (
                  <p className="text-xs text-muted-foreground">
                    File saat ini: <a href={data.dokumen.rpp_url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Lihat RPP Terunggah</a>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="font-semibold text-base border-b pb-2">2. Pilihan Metode Supervisi Pelaksanaan Pembelajaran</h3>
              
              <div className="space-y-2">
                <Label>Pilih Metode</Label>
                <Select
                  value={metodePilihan}
                  onValueChange={setMetodePilihan}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode supervisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="langsung">Supervisi Langsung (Observasi Kelas oleh Supervisor)</SelectItem>
                    <SelectItem value="video">Supervisi Melalui Video Pembelajaran (Unggah/Tautan Video)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {metodePilihan === "video" && (
                <div className="space-y-2 pt-2">
                  <Label className="flex items-center gap-2">
                    <Video className="size-4 text-indigo-600" /> Tautan / Link Video Pembelajaran (Google Drive / YouTube)
                  </Label>
                  <Input
                    type="url"
                    value={linkVideo}
                    onChange={(e) => setLinkVideo(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Pastikan tautan bersifat publik agar dapat ditinjau oleh Supervisor Anda.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="size-4 animate-spin" />}
                <Upload className="size-4" /> Simpan Perangkat & Metode
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
