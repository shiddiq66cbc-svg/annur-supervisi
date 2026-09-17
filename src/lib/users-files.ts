import type { UserRow, AppRoleName, ImportRow } from "./users.functions";

export const ROLE_LABEL_ID: Record<AppRoleName, string> = {
  admin: "Administrator",
  kepala_madrasah: "Kepala Madrasah",
  supervisor: "Supervisor Akademik",
  guru: "Guru",
};

const ROLE_ALIAS: Record<string, AppRoleName> = {
  admin: "admin",
  administrator: "admin",
  kepala_madrasah: "kepala_madrasah",
  "kepala madrasah": "kepala_madrasah",
  supervisor: "supervisor",
  "supervisor akademik": "supervisor",
  guru: "guru",
};

function tanggal(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function unduh(blob: Blob, nama: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  a.click();
  URL.revokeObjectURL(url);
}

export async function unduhTemplateImport() {
  const XLSX = await import("xlsx");
  const rows = [
    {
      nama_lengkap: "CONTOH — Ahmad Fauzi",
      email: "contoh.ahmad@example.com",
      password: "Sandi1234",
      role: "guru",
      status: "aktif",
      nomor_identitas: "1987...",
      no_hp: "08123456789",
      keterangan: "Baris contoh — hapus sebelum import",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Users");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  unduh(new Blob([out]), "template-import-users.xlsx");
}

export type BarisPreview = ImportRow & { valid: boolean; pesan: string };

export async function bacaFileImport(file: File): Promise<BarisPreview[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File import tidak sesuai template.");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, {
    defval: "",
  });
  if (raw.length === 0) throw new Error("File import tidak memuat data.");
  const kolom = Object.keys(raw[0] ?? {}).map((k) => k.toLowerCase().trim());
  for (const wajib of ["nama_lengkap", "email", "password", "role"]) {
    if (!kolom.includes(wajib)) throw new Error("File import tidak sesuai template.");
  }

  const terlihat = new Set<string>();
  return raw.map((r, i) => {
    const get = (k: string) => String(r[k] ?? r[k.toUpperCase()] ?? "").trim();
    const nama = get("nama_lengkap");
    const email = get("email").toLowerCase();
    const password = get("password");
    const roleRaw = get("role").toLowerCase();
    const statusRaw = get("status").toLowerCase() || "aktif";
    const role = ROLE_ALIAS[roleRaw];

    let pesan = "";
    if (/^contoh/i.test(nama)) pesan = "Baris contoh — tidak diimport";
    else if (!nama) pesan = "Nama kosong";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) pesan = "Email tidak valid";
    else if (terlihat.has(email)) pesan = "Email duplikat di dalam file";
    else if (!role) pesan = "Role tidak dikenal";
    else if (!["aktif", "nonaktif"].includes(statusRaw)) pesan = "Status tidak dikenal";
    else if (password.length < 8) pesan = "Password kurang dari 8 karakter";
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      pesan = "Password harus memuat huruf dan angka";
    if (email) terlihat.add(email);

    return {
      baris: i + 2,
      fullName: nama,
      email,
      password,
      role: (role ?? "guru") as AppRoleName,
      isActive: statusRaw !== "nonaktif",
      nip: get("nomor_identitas") || null,
      phone: get("no_hp") || null,
      keterangan: get("keterangan") || null,
      valid: pesan === "",
      pesan: pesan || "Valid",
    };
  });
}

export async function unduhLaporanGagal(
  hasil: { baris: number; nama: string; email: string; pesan: string }[],
) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(
    hasil.map((h) => ({ baris: h.baris, nama: h.nama, email: h.email, keterangan: h.pesan })),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Error Report");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  unduh(new Blob([out]), "error-report-import-users.xlsx");
}

export async function exportExcel(rows: UserRow[]) {
  const XLSX = await import("xlsx");
  const data = rows.map((r, i) => ({
    No: i + 1,
    "Nama Lengkap": r.fullName,
    Email: r.email ?? "",
    Peran: r.role ? ROLE_LABEL_ID[r.role] : "Belum ditetapkan",
    Status: r.isActive ? "Aktif" : "Nonaktif",
    "Nomor Identitas": r.nip ?? "",
    "No HP": r.phone ?? "",
    Keterangan: r.keterangan ?? "",
    Dibuat: tanggal(r.createdAt),
    Diubah: tanggal(r.updatedAt),
    "Terakhir Login": tanggal(r.lastSignInAt),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  unduh(new Blob([out]), `daftar-users-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportPdf(rows: UserRow[], filterInfo: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text("DAFTAR USERS", doc.internal.pageSize.getWidth() / 2, 40, { align: "center" });
  doc.setFontSize(11);
  doc.text("PORTAL SUPERVISI AKADEMIK MTs ANNUR 1", doc.internal.pageSize.getWidth() / 2, 58, {
    align: "center",
  });
  doc.setFontSize(9);
  doc.text(
    `Tanggal export: ${new Date().toLocaleString("id-ID")}   |   Jumlah data: ${rows.length}   |   Filter: ${filterInfo}`,
    40,
    82,
  );

  autoTable(doc, {
    startY: 96,
    head: [["No", "Nama", "Email", "Peran", "Status", "Identitas"]],
    body: rows.map((r, i) => [
      String(i + 1),
      r.fullName,
      r.email ?? "—",
      r.role ? ROLE_LABEL_ID[r.role] : "Belum ditetapkan",
      r.isActive ? "Aktif" : "Nonaktif",
      r.nip ?? "—",
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [21, 94, 63] },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: () => {
      const p = doc.internal.pageSize;
      doc.setFontSize(8);
      doc.text(
        "Portal Supervisi Akademik MTs Annur 1 — Cinagara, Malangbong, Garut",
        40,
        p.getHeight() - 20,
      );
      doc.text(
        `Halaman ${doc.getNumberOfPages()}`,
        p.getWidth() - 40,
        p.getHeight() - 20,
        { align: "right" },
      );
    },
  });

  doc.save(`daftar-users-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export { tanggal as formatTanggal };
