# EduPlan

Perencana akademik untuk pelajar. Tahap ini mencakup **Register, Login (email + Google), Lupa kata sandi, dan Onboarding**, dengan Supabase sebagai Auth dan database.

Stack: React 18 + TypeScript + Vite + Tailwind CSS 3 + React Router 6 + Supabase.

## 1. Jalankan di komputer

```bash
npm install
cp .env.example .env     # lalu isi nilainya (langkah 2)
npm run dev              # buka http://localhost:5173
```

Cek tipe dan build produksi: `npm run build`.

## 2. Siapkan Supabase (project baru)

1. Buka <https://supabase.com/dashboard> -> **New project**. Simpan database password-nya.
2. **Project Settings -> API**: salin **Project URL** dan **anon public key** ke `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
   Jangan pernah memakai `service_role` key di frontend.
3. **SQL Editor -> New query**: tempel seluruh isi `supabase/migrations/0001_init.sql`, lalu **Run**. Ini membuat tabel `profiles`, aturan RLS (user hanya bisa akses datanya sendiri), dan trigger yang membuat profil otomatis saat ada user baru.
4. **Authentication -> URL Configuration**:
   - **Site URL**: `http://localhost:5173` (ganti ke domain Vercel saat deploy)
   - **Redirect URLs**, tambahkan:
     - `http://localhost:5173/auth/callback`
     - `http://localhost:5173/reset-password`
     - (saat deploy) `https://DOMAIN-KAMU.vercel.app/auth/callback` dan `https://DOMAIN-KAMU.vercel.app/reset-password`
5. **Authentication -> Sign In / Providers -> Email**: atur **Minimum password length = 8** supaya sama dengan validasi di aplikasi. Biarkan **Confirm email** aktif (default) agar email user terverifikasi. Kalau dimatikan, user langsung masuk setelah daftar.

## 3. Aktifkan login Google

1. Buka <https://console.cloud.google.com/> -> buat project (atau pakai yang ada).
2. **APIs & Services -> OAuth consent screen**: isi nama aplikasi dan email, pilih *External*. Selama masih *Testing*, tambahkan emailmu sendiri di **Test users**.
3. **APIs & Services -> Credentials -> Create credentials -> OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:5173` (dan domain Vercel saat deploy)
   - **Authorized redirect URIs**: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
     (`<PROJECT-REF>` ada di Project URL Supabase-mu)
4. Salin **Client ID** dan **Client secret**.
5. Supabase: **Authentication -> Sign In / Providers -> Google** -> aktifkan, tempel Client ID dan Client secret, **Save**.

## 4. Alur yang sudah ada

| Rute | Fungsi |
|---|---|
| `/register` | Daftar email + kata sandi, atau Google. Jika konfirmasi email aktif, muncul layar "Cek emailmu". |
| `/login` | Masuk email + kata sandi, atau Google. |
| `/forgot-password` | Kirim tautan reset (tombol kirim ulang punya jeda 60 detik). |
| `/reset-password` | Tujuan tautan reset di email: form kata sandi baru. |
| `/auth/callback` | Tujuan redirect Google dan verifikasi email. |
| `/onboarding` | Wajib untuk user yang belum onboarding. Data disimpan ke `profiles`. "Lewati dulu" menandai onboarding selesai tanpa mengisi data. |
| `/dashboard` | Dashboard dengan data nyata dari Supabase (lihat bagian 7). |
| `/calendar` | Kalender bulanan: tugas, ujian, sesi belajar, dan acara Google Calendar (bagian 8 dan 9). |
| `/study-plan` | Rencana Belajar: sesi per hari, target mingguan, tabel tugas (bagian 10). |
| `/progress` | Progres mingguan/bulanan (bagian 11). |
| `/assistant` | Asisten AI: chat dengan Gemini, riwayat, tombol terapkan rencana (bagian 12). |
| `/settings` | Pengaturan (lihat bagian 13). |
| `/tasks` | Masih penanda "belum dibangun" sampai desainnya dikerjakan. |

Aturan arah: belum login -> `/login`; sudah login tapi belum onboarding -> `/onboarding`; sudah onboarding -> `/dashboard`.

## 5. Struktur folder

```
src/
  components/      AppShell (sidebar), AuthLayout, ScreenMessage, icons, ui/ (Button, Modal, TextInput, ...)
  context/         AuthContext (sesi + profil)
  features/        dashboard/ (statistik, widget, hook data), calendar/ (model, widget, hook data), study/ (sesi, timer, rencana otomatis, pengingat), progress/ (hitungan, grafik), assistant/ (komponen chat), readiness/ (rumus kesiapan), tasks/ (modal Tambah tugas)
  lib/             supabase client, tanggal, validasi, pesan error, googleCalendar
  pages/           Login, Register, ForgotPassword, ResetPassword, AuthCallback, Onboarding, Dashboard, Calendar, StudyPlan, Progress, Assistant, Settings, ComingSoon
  routes/          guards (GuestRoute, RequireSession, RequireOnboarded, RootRedirect)
  types/           tipe Profile, Task, StudySession
supabase/
  migrations/      0001_init.sql, 0002_tasks_sessions_google.sql, 0003_session_details.sql, 0004_ai_chat.sql, 0005_settings.sql
  functions/       google-calendar-connect, google-calendar-callback, google-calendar, generate-study-plan, ai-assistant, delete-account, _shared
```

## 6. Catatan

- Icon dibuat sebagai SVG inline (belum diekspor dari Figma). Warna dekorasi dan posisi lingkaran memakai perkiraan dari desain.
- Email bawaan Supabase punya batas kirim yang kecil. Untuk dipakai banyak user, pasang SMTP sendiri di **Authentication -> SMTP Settings**.
- Deploy Vercel: `vercel.json` sudah berisi rewrite untuk SPA. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di Vercel -> Settings -> Environment Variables.

## 7. Dashboard dan database tahap 2

Jalankan `supabase/migrations/0002_tasks_sessions_google.sql` di SQL Editor (setelah 0001). Isinya tiga tabel:

| Tabel | Fungsi |
|---|---|
| `tasks` | Tugas dan ujian (ujian = kategori `ujian`). RLS: user hanya akses miliknya. |
| `study_sessions` | Sesi belajar. Dipakai untuk "Rencana belajar hari ini", jam belajar, streak, dan grafik mingguan. |
| `google_calendar_connections` | Refresh token Google. **Tidak bisa diakses dari browser**, hanya oleh Edge Function. |

Cara Dashboard menghitung angkanya:
- **Tugas aktif**: tugas berstatus `todo`. "Jatuh tempo minggu ini" = tenggat Senin sampai Minggu minggu berjalan.
- **Ujian mendatang**: tugas kategori `ujian` dengan tenggat mulai hari ini.
- **Jam belajar, streak, grafik**: dari sesi belajar yang **sudah selesai** (`completed_at` terisi). Batang krem di grafik = menit yang direncanakan untuk hari yang belum tiba.
- **Streak**: hari berturut-turut dengan minimal satu sesi selesai; tetap berjalan bila hari ini belum belajar tetapi kemarin sudah.

Yang masih sementara atau kosong:
- Tombol **Tambah tugas** di Dashboard membuka form **Tambah sesi belajar** (sesuai permintaan), jadi tugas/ujian dibuat lewat tombol **Tambah** di halaman Kalender (form sementara, sampai halaman Tugas ada).
- Tugas bisa ditandai selesai atau dihapus dari tabel di halaman Rencana Belajar.
- Lonceng di Dashboard menampilkan **pengingat dalam aplikasi** (lihat bagian 10), bukan notifikasi push atau email.

## 8. Menghubungkan Google Calendar

Login Google (bagian 3) dan koneksi Kalender adalah **dua persetujuan terpisah**: login hanya mengambil profil, sedangkan Kalender meminta izin `calendar.events`. Alurnya lewat tiga Edge Function, supaya refresh token tidak pernah sampai ke browser.

1. **Google Cloud Console**
   - APIs & Services -> Library -> aktifkan **Google Calendar API**.
   - OAuth consent screen -> Data access / Scopes -> tambahkan `.../auth/calendar.events`.
   - Credentials -> pada OAuth client yang sama, tambahkan **Authorized redirect URI**:
     `https://<PROJECT-REF>.supabase.co/functions/v1/google-calendar-callback`
2. **Siapkan Supabase CLI** (di folder project):
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT-REF>
   ```
3. **Isi secret** (nilai Client ID/secret sama dengan yang dipakai di Supabase Google provider):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # salin hasilnya untuk GOOGLE_STATE_SECRET
   npx supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_STATE_SECRET=... APP_ORIGINS=http://localhost:5173
   ```
   `APP_ORIGINS` = alamat aplikasi yang diizinkan, dipisah koma. Saat deploy, tambahkan domain Vercel-mu.
4. **Deploy fungsi**:
   ```bash
   npx supabase functions deploy google-calendar-connect
   npx supabase functions deploy google-calendar
   npx supabase functions deploy google-calendar-callback --no-verify-jwt
   ```
   `--no-verify-jwt` wajib untuk fungsi callback, karena yang memanggilnya adalah browser yang dialihkan oleh Google (tanpa token login).

Catatan penting:
- Selama aplikasi di Google Cloud berstatus **Testing**, hanya akun di daftar **Test users** yang bisa terhubung, dan **refresh token kedaluwarsa setelah 7 hari** (user harus menghubungkan ulang). Untuk dipakai umum, aplikasi harus dipublikasikan, dan karena scope Calendar tergolong sensitif, Google meminta verifikasi.
- Halaman Kalender memakai fungsi ini: kartu **Google Calendar** di kolom kanan untuk menghubungkan/memutus, dan acara Google muncul di grid. Kartu itu tambahan saya, tidak ada di desain Figma.

## 9. Halaman Kalender

- Grid bulan Senin-Minggu. Tugas `todo` tampil di tanggal tenggatnya; tenggat yang sudah lewat berwarna merah (Terlambat). Tugas selesai tidak ditampilkan.
- Ujian terdekat = ujian `todo` pertama dengan tenggat mulai sekarang (tidak terbatas pada bulan yang dilihat).
- Klik tanggal untuk melihat agenda hari itu. Tombol **Tambah** membuka form tugas sementara dengan tanggal terpilih.
- Di ponsel, sel tanggal menampilkan titik warna, bukan label acara.
- Tugas berprioritas rendah memakai gaya pudar (asumsi untuk gaya "Kuis" di desain).
- Bila Google meminta sambung ulang (token dicabut/kedaluwarsa), kartu Google menampilkan tombol "Hubungkan ulang".

## 10. Rencana Belajar

Jalankan `supabase/migrations/0003_session_details.sql` (menambah `notes`, `started_at`, `remind_me` di `study_sessions`).

- **Strip minggu**: tujuh hari (Senin-Minggu) dengan jumlah sesi. Panah di atasnya pindah minggu (tambahan, tidak ada di desain).
- **Mulai**: muncul di sesi terjadwal pertama **hari ini**. Menyimpan `started_at`, membuka timer mundur sesuai durasi, dan tetap berjalan walau modal ditutup (buka lagi lewat tombol "Berjalan"). **Selesai** mengisi `completed_at` (masuk jam belajar dan streak di Dashboard); **Batalkan** mengosongkan `started_at`. Hanya satu sesi yang bisa berjalan.
- **Atur urutan**: tombol naik/turun menukar **jam mulai** dua sesi bertetangga. Durasi tidak ikut berubah, jadi sesi bisa saling tumpang tindih bila durasinya berbeda.
- **Target mingguan**: jam dari semua sesi minggu itu = target; jam dari sesi yang sudah selesai = tercapai. Tiga mata pelajaran terbesar tampil sendiri, sisanya "Lainnya".
- **Tabel tugas**: status **Terlambat** dihitung otomatis dari tenggat. Centang atau menu "..." menandai selesai/belum; menu juga punya Hapus (dengan konfirmasi). Mengubah status memperbarui Kesiapan UTBK.
- **Ingatkan saya**: sesi dengan opsi ini muncul di lonceng Dashboard mulai 24 jam sebelum jam mulai. Hanya muncul saat aplikasi dibuka; tidak ada push atau email.

### Rencana otomatis (Gemini)

Fungsi `generate-study-plan` memanggil Gemini dari server, jadi API key tidak ada di browser. Hasilnya **usulan**: user bisa menghapus sebagian lalu menyimpan.

1. Buat API key di Google AI Studio (https://aistudio.google.com/apikey).
2. `npx supabase secrets set GEMINI_API_KEY=isi_key_kamu`
   (opsional: `GEMINI_MODEL=nama-model`; bawaan `gemini-3.8-flash`, sama dengan Asisten AI. Bila nama model itu tidak tersedia di akunmu, isi dengan model yang tersedia.)
3. `npx supabase functions deploy generate-study-plan` (verifikasi JWT dibiarkan aktif).

Fungsi memvalidasi keluaran Gemini (tanggal harus di minggu itu, jam 06.00-22.00, durasi 30-120 menit, tidak bentrok dengan sesi yang sudah ada). Belum ada pembatasan frekuensi per user; kuota ditanggung API key-mu.

## 11. Progres

Tombol **Minggu ini / Bulan ini** mengganti periode (Senin-Minggu berjalan, atau bulan kalender berjalan). Perbandingan memakai minggu lalu / bulan lalu.

- **Jam belajar**: total durasi sesi yang sudah selesai di periode itu.
- **Tugas selesai** dan **Penyelesaian tugas**: dihitung dari tugas yang **tenggatnya** jatuh di periode itu.
  - *Selesai tepat waktu*: selesai sebelum/tepat pada tenggat.
  - *Sedang berjalan*: belum selesai dan tenggat belum lewat.
  - *Terlambat*: belum selesai padahal tenggat lewat, **atau** selesai setelah tenggat.
  - Angka besar di tengah = tepat waktu dibagi semua tugas.
- **Streak**: sama dengan Dashboard (tidak tergantung periode).
- **Grafik**: jam sesi selesai per hari (minggu) atau per minggu (bulan: tgl 1-7, 8-14, 15-21, 22-28, 29-akhir). Teks **Target** = rata-rata durasi sesi **terjadwal** per hari/minggu di periode itu (muncul bila ada sesi terjadwal). Batang gelap = mencapai target, batang biru lebih terang = belum.
- **Progres per mata pelajaran**: jam sesi selesai dibagi jam sesi terjadwal per mapel (maksimal 5 mapel terbesar). Bar kuning bila di bawah 65%.
- **Pencapaian**: jam fokus (= jam belajar) dan jumlah tugas yang **diselesaikan** (berdasarkan waktu selesai) di periode itu.
- Kartu **Rata-rata nilai** di desain **tidak dibuat** (belum ada data nilai; sesuai keputusanmu).

## 12. Asisten AI

Chat dengan Gemini yang mengenal tugas, ujian, dan sesi belajarmu. API key hanya ada di server (Edge Function `ai-assistant`), tidak pernah di browser.

### Setup singkat

1. Jalankan `supabase/migrations/0004_ai_chat.sql` di SQL Editor (tabel `ai_conversations` dan `ai_messages` + RLS; butuh 0001 dan 0002 sudah dijalankan).
2. Buat API key di Google AI Studio: https://aistudio.google.com/apikey
3. Simpan sebagai secret (sekali saja; secret yang sama dipakai `generate-study-plan`):
   ```
   npx supabase secrets set GEMINI_API_KEY=isi_key_kamu
   ```
   Model bawaan `gemini-3.8-flash`. Bila nama itu tidak dikenal akunmu (error "Gemini tidak bisa dihubungi"), ganti: `npx supabase secrets set GEMINI_MODEL=nama-model-yang-tersedia`.
   Pastikan juga `APP_ORIGINS` sudah berisi alamat aplikasimu (lihat bagian 8).
4. Deploy fungsinya (verifikasi JWT dibiarkan aktif):
   ```
   npx supabase functions deploy ai-assistant
   ```
5. Buka `/assistant` dan kirim pesan. Log fungsi: Supabase Dashboard -> Edge Functions -> ai-assistant -> Logs.

### Cara kerja

- Setiap pesan, fungsi membaca (dengan hak akses user, jadi RLS berlaku): profil dan target akademik, tugas/ujian yang belum selesai (40 terdekat), tugas selesai 7 hari terakhir, dan sesi belajar 7 hari ke belakang sampai 35 hari ke depan, ditambah 16 pesan terakhir percakapan. Semuanya dikirim ke Gemini sebagai **data**, bukan instruksi.
- Gemini diminta menjawab JSON: `reply` (teks) dan `plan` (daftar sesi, atau `null`). Fungsi **memvalidasi** `plan`: tanggal hari ini sampai 28 hari ke depan, jam 05.00-23.00, durasi 15-180 menit, jam hari ini harus belum lewat, dan tidak boleh bentrok dengan sesi yang sudah ada. Sesi yang tidak lolos dibuang.
- Bila `plan` ada, chat menampilkan tabel jadwal dan tombol **Terapkan ke Rencana Belajar**. Tombol itu menyimpan semua sesi ke `study_sessions` lalu mengisi `plan_applied_at` agar tidak bisa diterapkan dua kali.
- Pesan user dan jawaban baru disimpan **setelah** Gemini berhasil. Jika gagal, teks tetap ada di kolom input untuk dikirim ulang.
- Batas 30 pesan per user per jam (melindungi kuota API key); batas ini ada di konstanta `HOURLY_LIMIT` di `supabase/functions/ai-assistant/index.ts`.
- Panel kanan: riwayat percakapan ("Semua" menampilkan seluruhnya), dan "Coba tanyakan". Tiga tombol prompt cepat di atas kolom input juga langsung mengirim pesan. Menu "..." di header chat menghapus percakapan yang sedang dibuka.

Catatan: jawaban AI bisa keliru. Tabel jadwal bisa kamu cek dulu sebelum diterapkan. Menghapus sesi dari aplikasi belum tersedia; sementara ini hapus lewat Table Editor Supabase.

## 13. Pengaturan

Halaman `/settings`: profil, preferensi belajar, notifikasi, dan akun.

### Setup
1. Jalankan `supabase/migrations/0005_settings.sql` di SQL Editor (kolom pengaturan di `profiles` + bucket `avatars`). Jalankan migrasi berurutan 0001-0005. 0005 juga dibutuhkan fungsi `ai-assistant` (membaca `weekly_target_hours`).
2. Deploy fungsi hapus akun:
   ```
   npx supabase functions deploy delete-account
   ```
   Fungsi ini memakai `SUPABASE_SERVICE_ROLE_KEY` yang sudah otomatis tersedia di Edge Functions.

### Perilaku
- Foto profil: tersimpan di bucket publik `avatars/<user_id>/` (PNG/JPG/WebP, maks 2 MB). Ubah/Hapus foto langsung tersimpan tanpa menekan "Simpan perubahan".
- Mengganti jenjang pendidikan mengosongkan kelas dan jurusan.
- Awal minggu (Senin/Minggu) berlaku global: kalender, progres, dan rencana belajar.
- Durasi sesi dan target jam per minggu hanya menjadi nilai awal saat membuat sesi/rencana otomatis dan konteks untuk Asisten AI.
- Tiga notifikasi (pengingat tenggat, ringkasan harian, saran AI) hanya tampil di lonceng dalam aplikasi, bukan push atau email. Email mingguan dinonaktifkan ("segera hadir").
- Bahasa hanya Bahasa Indonesia.
- "Keluar dari semua perangkat" mengakhiri sesi di perangkat lain, perangkat ini tetap masuk.
- Hapus akun menghapus profil, tugas, sesi, chat, dan foto secara permanen. Token Google Calendar tidak dicabut di sisi Google; cabut manual di myaccount.google.com/permissions bila perlu.
