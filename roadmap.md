# Roadmap — Portal Supervisi Akademik MTs Annur 1

## BUILD 01 — Fondasi (SELESAI)
- [x] Skema database dasar + RLS + GRANT
- [x] Autentikasi e-mail/kata sandi, lupa & atur ulang kata sandi
- [x] Peran: admin, kepala_madrasah, supervisor, guru (tabel terpisah + has_role)
- [x] Rute terproteksi `_authenticated` + navigasi per peran
- [x] Data awal: 8 supervisor, 58 guru, 58 penugasan, tahun pelajaran 2026/2027
- [x] Log audit (fungsi log_audit, halaman baca admin/kepala)
- [x] Halaman: beranda, masuk, dashboard per peran, profil, guru, supervisor, penugasan, pengguna & peran, log audit
- [ ] Uji end-to-end dengan akun nyata (menunggu akun pertama didaftarkan)

## BUILD 02 — Data Master lanjutan
- [ ] CRUD guru, supervisor, mata pelajaran, kelas, tahun pelajaran
- [ ] Pengelolaan penugasan supervisor (tambah/ubah/pindah)

## BUILD 03 — Jadwal Supervisi
## BUILD 04 — Dokumen Pembelajaran + Pemeriksaan Administrasi
## BUILD 05 — Supervisi Langsung + Instrumen (versioned)
## BUILD 06 — Upload & Supervisi Video
## BUILD 07 — Penilaian, Hasil, Predikat, Locking
## BUILD 08 — Rekomendasi, Tindak Lanjut, Supervisi Ulang
## BUILD 09 — Dashboard lengkap, Laporan, PDF, Export
## BUILD 10 — Security hardening, pengujian, kesiapan produksi
