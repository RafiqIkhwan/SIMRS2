# Sistem Informasi Manajemen Rumah Sakit (SIMRS)

Aplikasi web terintegrasi untuk manajemen operasional rumah sakit dengan arsitektur monorepo modular yang memisahkan frontend dan backend secara tegas.

## Arsitektur & Teknologi

- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16 (Session storage via `connect-pg-simple`)
- **Keamanan**: Session-based HttpOnly cookies, CSRF protection, RBAC 10 roles, bcrypt hashing, Zod schema validation, Helmet, Rate limiting, Audit log
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form, Lucide React

---

## Persyaratan Sistem

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (untuk menjalankan PostgreSQL)

---

## Panduan Instalasi & Menjalankan Lokal

### 1. Clone Repository & Salin Konfigurasi Environment

```bash
# Masuk ke direktori backend
cd backend
cp .env.example .env
```

Pastikan variabel di `.env` telah disesuaikan:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://simrs_user:simrs_password@localhost:5432/simrs_db?schema=public"
SESSION_SECRET="super-secret-session-key-change-in-production-min-32-chars-long"
FRONTEND_URL="http://localhost:5173"
```

### 2. Jalankan PostgreSQL dengan Docker Compose

Dari direktori root proyek (`/`):
```bash
docker compose up -d
```
Container database `simrs-postgres` akan aktif di port `5432`.

### 3. Install Dependensi & Sinkronisasi Database

```bash
# Install seluruh dependensi backend & frontend dari root
npm install

# Masuk ke backend untuk generate Prisma & Migration
cd backend
npx prisma generate
npx prisma db push

# Jalankan Seeding Akun & Data Master Uji
npm run db:seed
```

### 4. Jalankan Unit & Logic Tests

```bash
npm run test
```

### 5. Jalankan Backend Development Server

```bash
npm run dev
```
API server aktif di: `http://localhost:5000`

---

## Akun Pengujian (Seed Data Demonstrasi)

Semua akun pengujian di bawah ini menggunakan kata sandi default:
**`SimrsAdmin2026!`**

| Username | Peran (Role) | Keterangan |
|---|---|---|
| `superadmin` | `SUPER_ADMIN` | Akses penuh sistem & konfigurasi |
| `adminrs` | `HOSPITAL_ADMIN` | Administrasi rumah sakit & unit |
| `petugas.pendaftaran` | `REGISTRATION_STAFF` | Pendaftaran pasien & antrean |
| `dr.budi` | `DOCTOR` | Dokter spesialis penyakit dalam |
| `perawat.siti` | `NURSE` | Perawat poliklinik & rawat inap |
| `apoteker.ani` | `PHARMACIST` | Farmasi, obat & resep |
| `petugas.lab` | `LAB_STAFF` | Pengelolaan uji & hasil lab |
| `kasir.dewi` | `CASHIER` | Billing, invoice & pembayaran |
| `petugas.rm` | `MEDICAL_RECORD_STAFF` | Administrasi rekam medis |
| `manajemen.rs` | `MANAGEMENT` | Direksi & laporan statistik |

*Catatan: Seluruh data pasien dan rekam medis pada seed data adalah data sintetis fiktif untuk keperluan pengujian dan demonstrasi.*

---

## Ringkasan Endpoint API Backend (`/api/v1`)

### Autentikasi (`/api/v1/auth`)
- `POST /login` — Login pengguna, regenerasi session ID aman
- `POST /logout` — Menghancurkan session dan menghapus cookie
- `GET /me` — Mengambil data pengguna login dan token CSRF
- `GET /csrf-token` — Mengambil token anti-CSRF aktif
- `POST /change-password` — Mengubah kata sandi mandiri

### Manajemen Pengguna (`/api/v1/users`)
- `GET /` — Daftar staf dengan filter peran & status (Admin)
- `GET /:id` — Detail profil staf
- `POST /` — Tambah akun staf baru (Super Admin)
- `PATCH /:id` — Ubah status aktif dan role staf
- `POST /:id/reset-password` — Reset kata sandi staf oleh Super Admin

### Master Data (`/api/v1/master`)
- `GET /departments` & `POST /departments` — Departemen/Unit RS
- `GET /clinics` & `POST /clinics` — Poliklinik
- `GET /doctors` & `POST /doctors` — Master dokter & nomor izin
- `GET /schedules` & `POST /schedules` — Jadwal praktik dokter

### Manajemen Pasien (`/api/v1/patients`)
- `GET /` — Pencarian pasien (nomor RM, NIK, nama, telepon)
- `GET /:id` — Profil pasien lengkap dan riwayat kunjungan
- `POST /` — Registrasi pasien baru dengan auto-nomor RM unik
- `PATCH /:id` — Pembaruan identitas pasien

### Audit Trail (`/api/v1/audit-logs`)
- `GET /` — Log aktivitas sistem terproteksi (Super Admin & Hospital Admin)
