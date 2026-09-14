# Annur Supervisi

MASTER PROMPT

PORTAL SUPERVISI AKADEMIK MTs ANNUR 1

Production-Ready Web Application — Lovable + Supabase

Buat sebuah aplikasi web production-ready bernama:

PORTAL SUPERVISI AKADEMIK MTs ANNUR 1

Madrasah:
MTs Annur 1
Cinagara – Malangbong – Garut

Kepala Madrasah:
IWA ABDUL WAHID, S.Pd., M.M.
NIP: 196706052005011007

Tahun Pelajaran:
2026/2027

1. TUJUAN APLIKASI

Aplikasi ini adalah sistem digital untuk mengelola seluruh proses Supervisi Akademik Guru di MTs Annur 1.

Sistem harus mengelola proses:

Perencanaan → Penjadwalan → Pemilihan Metode → Pemeriksaan Administrasi → Supervisi Pembelajaran → Penilaian → Catatan → Rekomendasi → Tindak Lanjut → Supervisi Ulang → Laporan

Aplikasi harus benar-benar berfungsi sebagai aplikasi operasional madrasah.

JANGAN membuat prototype, mockup, dummy application, fake button, atau fitur yang hanya terlihat bekerja.

Semua tombol, form, database operation, upload, scoring, workflow, authorization, dan laporan harus benar-benar terhubung dan berfungsi.

2. TEKNOLOGI

Gunakan:

Lovable sebagai AI application builder

Supabase sebagai backend

PostgreSQL sebagai database

Supabase Auth untuk autentikasi

Supabase Storage untuk file

Row Level Security (RLS)

React + TypeScript

UI modern, profesional, responsif

Bahasa aplikasi: Bahasa Indonesia

Prioritaskan layanan Free Tier.

Jangan menambahkan layanan berbayar jika tidak benar-benar diperlukan.

Jika ada fitur yang berpotensi melampaui free tier, buat arsitektur yang hemat resource dan jelaskan keterbatasannya.

3. PRINSIP UTAMA

Aplikasi harus:

Production-ready.

Aman.

Responsif.

Mobile-friendly.

Mudah digunakan.

Memiliki RBAC yang ketat.

Semua data tersimpan di database.

Tidak menggunakan hard-coded fake data untuk menggantikan database.

Tidak menggunakan fake authentication.

Tidak menggunakan localStorage sebagai pengganti database untuk data utama.

Tidak membocorkan data antar pengguna.

Memiliki audit log.

Memiliki historical data.

Hasil supervisi yang telah difinalisasi tidak boleh berubah tanpa prosedur unlock resmi.

Setiap perubahan penting harus dapat dilacak.

Instrumen penilaian harus versioned.

Jangan merusak data ketika schema atau fitur dikembangkan.

4. HIERARKI PENGGUNA

Gunakan 4 role utama:

ROLE 1 — ADMIN

Administrator sistem.

Hak akses:

mengelola user

mengelola data guru

mengelola supervisor

mengatur assignment supervisor

mengelola tahun pelajaran

mengelola mata pelajaran

mengelola instrumen

mengelola jadwal

melihat seluruh data

mengelola laporan

melihat audit log

pengaturan sistem

backup/export data

Admin tidak otomatis menjadi penilai supervisi kecuali diberikan assignment/role yang sesuai.

ROLE 2 — KEPALA MADRASAH

Kepala Madrasah adalah:

Penanggung Jawab Supervisi Akademik

Bukan Supervisor Akademik biasa dan bukan bagian dari 8 supervisor.

Hak akses:

melihat seluruh data supervisi

melihat seluruh guru

melihat seluruh supervisor

melihat assignment

melihat jadwal

melihat hasil supervisi

melihat progres supervisi

melihat tindak lanjut

melihat supervisi ulang

melihat dashboard monitoring

melihat laporan

melakukan monitoring supervisor

memberikan arahan/catatan bila diperlukan

lock/unlock hasil dengan alasan dan audit log

Semua tindakan penting Kepala Madrasah harus tercatat di audit log.

ROLE 3 — SUPERVISOR AKADEMIK

Supervisor hanya dapat mengakses guru yang ditugaskan kepadanya.

Supervisor dapat:

melihat guru binaan

melihat jadwal

memeriksa administrasi pembelajaran

melakukan supervisi langsung

menilai video pembelajaran

mengisi instrumen

memberikan skor

memberikan catatan

memberikan rekomendasi

membuat tindak lanjut

melakukan supervisi ulang

memfinalisasi hasil

membuat laporan

Supervisor TIDAK boleh melihat guru binaan supervisor lain kecuali diberikan hak khusus oleh Admin/Kepala Madrasah.

ROLE 4 — GURU

Guru hanya dapat melihat dan mengelola data miliknya sendiri.

Guru dapat:

melihat profil sendiri

melihat supervisor

melihat jadwal supervisi

memilih metode supervisi

mengunggah perangkat pembelajaran

mengunggah video pembelajaran

melihat status supervisi

melihat hasil supervisi

melihat skor

melihat catatan

melihat rekomendasi

melihat tindak lanjut

mengunggah bukti tindak lanjut

melihat hasil supervisi ulang

Guru tidak boleh melihat data guru lain.

5. STRUKTUR SUPERVISOR

PENANGGUNG JAWAB

Iwa Abdul Wahid, S.Pd., M.M.
Kepala Madrasah
NIP 196706052005011007

Keterangan:
Penanggung Jawab Supervisi Akademik

SUPERVISOR 1

Iskandar Berlianta, S.Pd.I.
Jabatan: Waka Kurikulum

Guru binaan:

Irfan Fathoni Maoludin, S.Pd.I.

Usep Koswara, S.Pd.I.

Ade Surya, S.Pd.I.

Dedi Lukmanul Hakim, S.Pd.I., Gr.

Muhammad Irpan, S.Pd., Gr.

Ceng Enuh Abdul Halim, S.Pd.

Ahmad Pauji Zalaluddin, S.Pd.

SUPERVISOR 2

Haris A Sudarma, S.Pd.I.
Jabatan: Waka Kesiswaan

Guru binaan:

Yum Nurzaman, S.Pd.I.

Irwan Sunaryo, S.Pd.I.

R. Arifin Wijaya Kusuma, S.Pd.I

Dede Hendar, S.Pd.I., Gr.

Rizqi Anggi, S.Pd., Gr.

Muhammad Kaesa Badruddin, S.Pd.

Endang Mutholib, S.Pd.

SUPERVISOR 3

Badar, S.Pd.I.
Jabatan: Waka Sarana

Guru binaan:

Fahrudin, S.Ag.

Z.A. Mudzakir, S.Pd.I.

Beta Bittaufiq Nur Tasdiq, S.Pd.

Sopyan Iskandar, S.Pd.I., Gr.

Kiki Baehaqi, S.Pd.I., Gr.

Ilham Muhamad Romli, S.Pd.

Nur Shobur, S.Ag.

SUPERVISOR 4

Ibrahim Munadi, S.Pd.I.
Jabatan: Waka Humas

Guru binaan:

Cecep, S.Pd.I.

Anang Daud Mubaroq, S.Pd.

Anwar Hadi Adistia, M.Pd.

Asep Jujun Juliansyah, S.Pd., Gr.

Riki Mardiana, S.Pd., Gr.

Imam Ab. Kholil, S.Pd.

Aas Ahmad Asyari, S.Pd.

SUPERVISOR 5

Ade Ato, S.Pd.I.
Jabatan: Guru Mata Pelajaran

Guru binaan:

M Sobir Mauludin

Fikri Abdul Jabbar, S.Pd.

Abdah Muhamad Hasan, S.Pd.I., M.Pd.

Rivatul Mahmudah, M.Pd.

Winda Ratnasari, S.Pd., Gr.

Sofhah Aisyah Ilyas, S.Pd.

Sanadia Nuraeni, S.Pd.

SUPERVISOR 6

Aep Saepullah, S.Pd.I.
Jabatan: Guru Mata Pelajaran

Guru binaan:

Muhamad Anwar, S.Pd.

M. Helmi Sa'ban Faujan, S.Pd.

Anbar Abdul Jabar, S.Ag.

Daliar Nur Siam, S.Pd.I., Gr.

Abi Aliya, S.Pd.

Melawati, S.Pd.

Kartika Dwi Ramdhani, S.Pd.

SUPERVISOR 7

Titin Juliyati, S.Pd.I.
Jabatan: Guru Mata Pelajaran

Guru binaan:

Rahma Aulia Russyamsi, S.Pd.

Alinna Naila Asfannisa

Siti Hodijah, S.Pd.

Siti Ulfah Zakiyah, S.Pd.

Lusty Afifah Noor Fauziah Amini, S.Pd.

Eneng Sri Mulyati, S.Pd.

Neng Laisa Ahnan Nisa, S.Pd.

Siti Nurhayatin, S.Pd.

SUPERVISOR 8

Cucu Sri Wahyuni, S.Pd.I.
Jabatan: Guru Mata Pelajaran

Guru binaan:

Hena Aulia Siti Masitoh, S.Pd.

Fitri Akmilunnisa, S.Pd., Gr.

Siti Sarah Patmawati, S.Pd.

Salma Fitria Nurbayani, S.Pd.

Syaila Naily Ulwa, S.Pd.

Enung Riska

Tiarani Oktaviana Putri

Ade Irma Nurmalasari

6. TUGAS SUPERVISOR

Tampilkan pada halaman profil/pedoman Supervisor:

"Supervisor Akademik mempunyai tugas melaksanakan pemeriksaan administrasi pembelajaran, supervisi pelaksanaan pembelajaran, pembinaan, dan tindak lanjut dalam rangka peningkatan mutu pembelajaran di madrasah."

A. Pemeriksaan Administrasi

Supervisor:

Memeriksa keberadaan, kelengkapan, dan kesesuaian administrasi/perangkat pembelajaran dengan kurikulum yang berlaku.

Memeriksa Silabus/perangkat pembelajaran dan RPP/perencanaan pembelajaran.

Memeriksa identitas, kompetensi/tujuan, materi, kegiatan pembelajaran, metode, asesmen, alokasi waktu, media, dan sumber belajar.

Memeriksa kesesuaian dokumen dengan program pembelajaran madrasah.

Memberikan skor, catatan, dan deskripsi.

B. Supervisi Pelaksanaan Pembelajaran

Supervisi dapat dilakukan melalui:

Metode 1 — Supervisi Langsung

Supervisor mengobservasi pembelajaran secara langsung di kelas.

Metode 2 — Supervisi Video

Guru merekam pembelajaran kemudian mengunggah video melalui portal.

Video harus:

merupakan pembelajaran nyata

bukan simulasi

memperlihatkan proses pembelajaran secara utuh

dapat digunakan untuk observasi

memiliki metadata

dapat diverifikasi

tidak boleh diganti setelah dinilai/finalisasi

Guru harus memberikan pernyataan integritas bahwa video merupakan rekaman pembelajaran yang sebenarnya.

7. INSTRUMEN PENILAIAN

Sistem harus mendukung instrumen yang dapat dikonfigurasi dan versioned.

JANGAN hard-code instrumen sehingga tidak dapat diperbarui.

Setiap hasil harus menyimpan:

instrument_id

instrument_version

nama instrumen

tanggal penggunaan

item yang digunakan

skor

total

predikat

evaluator

waktu penilaian

Hasil lama harus tetap terhubung dengan versi instrumen yang digunakan saat itu.

8. INSTRUMEN YANG HARUS DISEDIAKAN

INSTRUMEN 1

"INSTRUMEN PENGUKURAN KINERJA GURU – PENYUSUNAN SILABUS MATA PELAJARAN"

Komponen antara lain:

identitas

KI

KD

materi pokok

kegiatan pembelajaran

penilaian

alokasi waktu

sumber belajar

Skala:

1–4

Maksimum:

36

Predikat:

A = 88–100
B = 75–87
C = 62–74
D = <61

INSTRUMEN 2

"INSTRUMEN PENGUKURAN KINERJA GURU – PENYUSUNAN RPP"

Komponen:

identitas

KI/KD

indikator

tujuan

materi

pendekatan/model/metode

kegiatan

penilaian

remedial

pengayaan

media

bahan

sumber

Skala:

1–4

Maksimum:

40

Predikat:

A = 88–100
B = 75–87
C = 62–74
D = <61

INSTRUMEN 3

"INSTRUMEN SUPERVISI AKADEMIK – SUPERVISI PELAKSANAAN PEMBELAJARAN"

Komponen meliputi:

pendahuluan

motivasi

apersepsi

penguasaan materi

strategi pembelajaran

HOTS/4C

pengelolaan kelas

media/sumber belajar

pembelajaran berdiferensiasi

penggunaan bahasa

penutup

refleksi

tindak lanjut

asesmen

Maksimum:

168

Predikat:

A = 91–100
B = 81–90
C = 71–80
D = <70

CATATAN:

Karena instrumen dapat menggunakan terminology kurikulum berbeda sesuai periode, jangan memaksakan satu terminology untuk semua historical record.

Gunakan konsep:

"kurikulum yang berlaku"

dan sistem instrumen versioning.

9. WORKFLOW

Gunakan status berikut:

Belum Dijadwalkan

Dijadwalkan

Metode Dipilih

Supervisi Langsung

Menunggu Upload Video

Menunggu Penilaian

Dalam Penilaian

Hasil Supervisi

Perlu Tindak Lanjut

Tindak Lanjut

Selesai

Supervisi Ulang

Workflow harus memiliki validasi transisi.

User tidak boleh melompati tahapan penting tanpa authorization.

10. JADWAL

Admin/Kepala dapat membuat jadwal:

guru

mata pelajaran

kelas

tanggal

jam

supervisor

metode

catatan

Guru dapat melihat jadwalnya.

Supervisor hanya melihat jadwal guru binaannya.

11. DOKUMEN PEMBELAJARAN

Guru dapat mengunggah:

Silabus/perangkat pembelajaran

RPP/perencanaan pembelajaran

dokumen pendukung lainnya

Metadata:

nama file

jenis dokumen

ukuran

format

tanggal upload

uploader

versi

status pemeriksaan

Supervisor dapat:

membuka

mengunduh jika diizinkan

memeriksa

memberi skor

memberi catatan

12. VIDEO PEMBELAJARAN

Buat modul upload video.

Metadata minimal:

judul

guru

mata pelajaran

kelas

tanggal pembelajaran

durasi jika tersedia

ukuran file

format

tanggal upload

status verifikasi

checksum/hash jika memungkinkan

Guru wajib menyetujui:

"Video yang saya unggah merupakan rekaman pembelajaran yang sebenarnya dan dapat digunakan sebagai bahan supervisi akademik."

Setelah video dinilai/finalisasi:

video tidak boleh diganti atau dihapus oleh guru.

Jika perlu perubahan:

buat versi baru

simpan versi lama

catat audit log

Perhatikan keterbatasan ukuran file pada Supabase Free.

Jika video melebihi batas storage, tampilkan pesan yang jelas dan jangan membuat upload seolah-olah berhasil.

13. PENILAIAN

Supervisor mengisi instrumen secara digital.

Setiap item:

indikator

deskripsi

skor

catatan opsional

Sistem otomatis menghitung:

total skor

persentase

predikat

ringkasan hasil

Jangan menghitung hanya berdasarkan tampilan frontend.

Validasi dan perhitungan penting harus dilakukan secara aman di server/database.

14. HASIL SUPERVISI

Hasil minimal memuat:

identitas guru

supervisor

mata pelajaran

kelas

metode

tanggal

instrumen

versi instrumen

skor

predikat

kekuatan

temuan

catatan

rekomendasi

tindak lanjut

Setelah finalisasi:

hasil menjadi LOCKED.

Hasil locked tidak boleh diedit biasa.

Untuk unlock:

hanya Admin/Kepala

wajib alasan

wajib audit log

simpan siapa yang unlock

simpan kapan

simpan alasan

Jangan overwrite historical data.

15. REKOMENDASI

Supervisor dapat membuat rekomendasi berdasarkan hasil.

Field:

aspek

kondisi

rekomendasi

prioritas

target perbaikan

deadline

16. TINDAK LANJUT

Guru dapat melihat rekomendasi.

Guru dapat:

memberikan respon

mengunggah bukti tindak lanjut

memberikan deskripsi perbaikan

Supervisor dapat:

memeriksa bukti

menerima

meminta revisi

menentukan supervisi ulang

Status:

Belum Ditindaklanjuti

Dalam Proses

Menunggu Verifikasi

Diterima

Perlu Revisi

Supervisi Ulang

Selesai

17. SUPERVISI ULANG

Jika diperlukan, buat sesi supervisi baru yang tetap terhubung dengan hasil sebelumnya.

Historical result tidak boleh hilang.

Tampilkan:

Supervisi Awal → Tindak Lanjut → Supervisi Ulang

Sehingga perkembangan guru dapat dibandingkan.

18. DASHBOARD KEPALA MADRASAH

Tampilkan statistik:

jumlah guru

jumlah supervisor

jumlah supervisi

sudah disupervisi

belum disupervisi

supervisi langsung

supervisi video

administrasi sudah diperiksa

tindak lanjut pending

supervisi ulang

progres supervisi

distribusi predikat

distribusi metode

Gunakan card, chart, progress bar dan tabel.

19. DASHBOARD SUPERVISOR

Tampilkan:

jumlah guru binaan

sudah disupervisi

belum disupervisi

jadwal terdekat

dokumen menunggu pemeriksaan

video menunggu penilaian

penilaian belum selesai

tindak lanjut

supervisi ulang

20. DASHBOARD GURU

Tampilkan:

supervisor

jadwal

metode

status

dokumen

video

hasil

skor

predikat

rekomendasi

tindak lanjut

supervisi ulang

21. DATABASE

Gunakan struktur relasional minimal:

users
profiles
teachers
supervisors
supervision_assignments
academic_years
subjects
classes
supervision_schedules
supervision_sessions
learning_documents
document_versions
videos
video_versions
instruments
instrument_versions
instrument_sections
instrument_items
assessment_results
assessment_answers
recommendations
follow_ups
follow_up_evidence
audit_logs
system_settings

Gunakan foreign keys, indexes dan constraints yang sesuai.

Tambahkan created_at dan updated_at pada tabel yang relevan.

Gunakan UUID untuk primary key bila sesuai.

22. ROW LEVEL SECURITY

RLS WAJIB.

Contoh:

Guru A:

boleh membaca data dirinya sendiri.

Tidak boleh membaca Guru B.

Supervisor 1:

boleh membaca guru yang ditugaskan kepadanya.

Tidak boleh membaca guru Supervisor 2.

Kepala:

boleh membaca seluruh data supervisi.

Admin:

boleh mengelola seluruh data sesuai kewenangan.

Jangan hanya mengandalkan route protection frontend.

Semua authorization penting harus enforced di database/server.

23. AUDIT LOG

Catat minimal:

login

logout

upload

download

delete

create

update

submit

score

finalize

lock

unlock

assignment change

method change

video upload

video replacement

follow-up verification

perubahan data penting

Audit log:

immutable bagi user biasa

hanya Admin/Kepala yang dapat melihat sesuai kebijakan

mencatat user

action

entity

entity_id

timestamp

metadata bila diperlukan

24. KEAMANAN FILE

File tidak boleh dapat diakses bebas hanya dengan mengetahui URL.

Gunakan authenticated access.

Aturan:

Guru → file miliknya sendiri.

Supervisor → file guru binaannya.

Kepala/Admin → sesuai kewenangan.

Gunakan private storage bucket jika memungkinkan.

Gunakan signed URL atau mekanisme aman lainnya.

25. UI/UX

Buat desain:

Profesional, modern, bersih, elegan dan cocok untuk institusi pendidikan/madrasah.

Jangan membuat tampilan seperti template admin generik yang terlalu ramai.

Gunakan:

sidebar

topbar

breadcrumb

dashboard cards

tabel profesional

filter

search

modal

confirmation dialog

toast notification

loading state

empty state

error state

skeleton loading

responsive mobile navigation

Bahasa:

100% Bahasa Indonesia.

Gunakan istilah:

Guru

Supervisor Akademik

Kepala Madrasah

Penanggung Jawab

Supervisi Akademik

Tindak Lanjut

Supervisi Ulang

26. MENU ADMIN

Dashboard

Data Master

Guru

Supervisor

Mata Pelajaran

Kelas

Tahun Pelajaran

Assignment Supervisor

Supervisi

Jadwal

Sesi Supervisi

Administrasi Pembelajaran

Supervisi Langsung

Supervisi Video

Tindak Lanjut

Supervisi Ulang

Instrumen

Daftar Instrumen

Versi Instrumen

Bagian Instrumen

Item Instrumen

Laporan

Rekap Supervisi

Rekap Guru

Rekap Supervisor

Rekap Predikat

Rekap Tindak Lanjut

Export

Sistem

User

Audit Log

Pengaturan

Backup/Export

27. MENU KEPALA MADRASAH

Dashboard

Monitoring Supervisi

Guru

Supervisor

Jadwal

Hasil Supervisi

Tindak Lanjut

Supervisi Ulang

Laporan

Audit Log

28. MENU SUPERVISOR

Dashboard

Guru Binaan

Jadwal

Administrasi Pembelajaran

Supervisi Langsung

Supervisi Video

Penilaian

Hasil Supervisi

Rekomendasi

Tindak Lanjut

Supervisi Ulang

Laporan

29. MENU GURU

Dashboard

Profil Saya

Supervisor Saya

Jadwal Supervisi

Perangkat Pembelajaran

Video Pembelajaran

Supervisi Saya

Hasil Supervisi

Rekomendasi

Tindak Lanjut

Supervisi Ulang

30. LAPORAN

Sediakan:

tampilan laporan web

print-friendly

PDF

CSV/Excel jika memungkinkan

Laporan harus profesional.

Minimal laporan:

Rekap Supervisi Guru

Rekap Supervisor

Rekap Hasil Penilaian

Rekap Predikat

Rekap Tindak Lanjut

Riwayat Supervisi Guru

Laporan individual guru

Laporan individual harus dapat menunjukkan:

Supervisi Awal → Hasil → Rekomendasi → Tindak Lanjut → Supervisi Ulang.

31. DATA AWAL

Masukkan data struktur supervisor dan guru yang telah diberikan di atas ke database sebagai seed data.

JANGAN membuat password default yang lemah atau menampilkan password di frontend.

Jika akun login belum dapat dibuat otomatis secara aman melalui Supabase Auth, buat mekanisme admin invitation/user creation yang aman.

32. AUTHENTICATION

Gunakan Supabase Auth.

Fitur:

login

logout

session persistence

protected routes

role-based redirect

unauthorized page

forgot password jika tersedia

password reset

Setelah login:

Admin → Dashboard Admin

Kepala → Dashboard Kepala

Supervisor → Dashboard Supervisor

Guru → Dashboard Guru

33. ERROR HANDLING

Jangan tampilkan error teknis mentah kepada pengguna.

Buat pesan:

"Terjadi kesalahan. Silakan coba lagi."

Untuk administrator, sediakan informasi teknis yang relevan melalui log.

Pastikan operasi database gagal tidak menyebabkan UI mengatakan "berhasil".

34. VALIDASI

Semua form wajib memiliki:

required validation

format validation

size validation

duplicate validation

permission validation

Upload file harus memvalidasi:

tipe

ukuran

nama

keamanan

35. JANGAN LAKUKAN

JANGAN:

membuat dummy database

menggunakan fake login

menggunakan mock result

membuat tombol tanpa fungsi

membuat chart dengan data palsu

menyimpan data utama hanya di localStorage

membypass RLS

membiarkan user mengakses URL file secara publik

membiarkan guru melihat data guru lain

membiarkan supervisor melihat guru yang bukan binaannya

menghapus historical assessment

overwrite hasil locked

menggunakan password hard-coded

menaruh secret key di frontend

memasukkan service-role key ke client-side code

36. DEVELOPMENT STRATEGY

Jangan mencoba membangun semua fitur sekaligus dalam satu perubahan besar.

Gunakan tahapan berikut:

BUILD 01
Foundation + Supabase + Authentication + RBAC + Database

BUILD 02
Data Master + Guru + Supervisor + Assignment

BUILD 03
Jadwal Supervisi

BUILD 04
Dokumen Pembelajaran + Pemeriksaan Administrasi

BUILD 05
Supervisi Langsung + Instrumen

BUILD 06
Upload Video + Video Supervision

BUILD 07
Penilaian + Hasil + Predikat + Locking

BUILD 08
Rekomendasi + Tindak Lanjut + Supervisi Ulang

BUILD 09
Dashboard + Laporan + PDF + Export

BUILD 10
Security Hardening + Testing + Production Readiness

Jangan melompat ke BUILD berikutnya sebelum BUILD sebelumnya berhasil.

37. BUILD 01 — MULAI SEKARANG

Untuk tahap pertama, fokus hanya pada:

FOUNDATION

Implementasikan:

Project structure

Supabase connection

Database schema dasar

Authentication

Profiles

Roles

Protected routes

RBAC

RLS

Dashboard dasar masing-masing role

Sidebar/navigation sesuai role

Seed structure untuk role

Audit log foundation

Responsive layout

Error handling

Loading states

Belum perlu membangun seluruh modul supervisi pada BUILD 01.

38. ACCEPTANCE TEST BUILD 01

BUILD 01 dianggap selesai hanya jika semua hal berikut berhasil:

Authentication

[ ] Login berhasil.

[ ] Logout berhasil.

[ ] Session bertahan ketika halaman direfresh.

[ ] User tanpa login tidak dapat membuka dashboard.

RBAC

[ ] Admin hanya melihat menu Admin.

[ ] Kepala hanya melihat menu Kepala.

[ ] Supervisor hanya melihat menu Supervisor.

[ ] Guru hanya melihat menu Guru.

[ ] Manipulasi URL tidak dapat bypass authorization.

Database

[ ] Supabase database aktif.

[ ] Migration/schema berhasil.

[ ] Foreign key valid.

[ ] RLS aktif.

Security

[ ] User tidak dapat membaca data role lain yang tidak berhak.

[ ] Secret tidak berada di frontend.

[ ] Tidak ada service-role key di client.

UI

[ ] Desktop responsive.

[ ] Tablet responsive.

[ ] Mobile responsive.

[ ] Loading state tersedia.

[ ] Error state tersedia.

[ ] Empty state tersedia.

Code quality

[ ] TypeScript compile tanpa error.

[ ] Tidak ada broken imports.

[ ] Tidak ada fake/mock functionality.

[ ] Tidak ada console error kritis.

39. ATURAN SETELAH BUILD 01

Setelah BUILD 01 selesai:

Jalankan test.

Periksa database.

Periksa RLS.

Periksa authentication.

Periksa semua role.

Perbaiki error sebelum melanjutkan.

Jangan membuat BUILD 02 sebelum BUILD 01 stabil.

Berikan laporan singkat:

BUILD 01 STATUS

Database: PASS/FAIL

Authentication: PASS/FAIL

RBAC: PASS/FAIL

RLS: PASS/FAIL

Responsive UI: PASS/FAIL

TypeScript: PASS/FAIL

Critical Errors: jumlah

Remaining Issues: daftar

Jika ada error, perbaiki terlebih dahulu.

END OF MASTER PROMPT / BUILD 01

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7b193ab-ee5e-4300-96fb-0c7c9e77b120).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
