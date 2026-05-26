# Stock Dashboard — Warehouse Management System

Aplikasi manajemen gudang fullstack dengan monorepo pnpm.

## Struktur Proyek

```
Stock-Dashboard/
├── artifacts/
│   ├── api-server/        ← Backend: Express + Drizzle ORM + PostgreSQL
│   └── warehouse-app/     ← Frontend: React + Vite + TailwindCSS
├── lib/
│   ├── db/                ← Schema database (Drizzle)
│   ├── api-zod/           ← Zod validators (auto-generated)
│   └── api-client-react/  ← API client React hooks (auto-generated)
├── railway.toml           ← Config deploy Railway (backend)
├── vercel.json            ← Config deploy Vercel (frontend)
└── .env.example           ← Contoh environment variables
```

## Tech Stack

| Layer    | Teknologi                                    |
|----------|----------------------------------------------|
| Frontend | React 19, Vite, TailwindCSS v4, shadcn/ui    |
| Backend  | Express 5, TypeScript, Drizzle ORM           |
| Database | PostgreSQL                                   |
| Monorepo | pnpm workspaces                              |

## Deploy

### Railway (Backend)
1. Buat project baru → Deploy from GitHub repo
2. Tambah PostgreSQL database → copy `DATABASE_URL`
3. Set env var: `DATABASE_URL`
4. Otomatis baca `railway.toml`

### Vercel (Frontend)
1. Import repo yang sama
2. Set env var: `VITE_API_URL=https://YOUR-APP.up.railway.app`
3. Otomatis baca `vercel.json`

## Development Lokal

```bash
# Install dependencies
pnpm install

# Build shared libs
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/api-client-react build

# Copy .env.example → .env dan isi DATABASE_URL
cp .env.example .env

# Jalankan backend (terminal 1)
cd artifacts/api-server
PORT=3001 pnpm dev

# Jalankan frontend (terminal 2)
cd artifacts/warehouse-app
PORT=3000 BASE_PATH=/ pnpm dev
```

## Fitur

- Dashboard ringkasan stok & aktivitas terkini
- Manajemen material & pergerakan stok
- Permintaan material & persetujuan
- Purchase Order (PO) lengkap
- Manajemen tools/alat
- Supplier management
- Laporan & export Excel/PDF
- Manajemen pengguna & role
