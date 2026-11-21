-- ============================================================================
-- SITASI 2026 - Monitoring Progres Petugas Lapangan & Sampel
-- Skrip Schema Database PostgreSQL untuk Supabase
-- Jalankan seluruh skrip ini di Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 1. Buat Tabel Utama Sampel SITASI 2026
CREATE TABLE IF NOT EXISTS public.sitasi_samples (
  -- Primary Key unik: kombinasi "${nks}_${nus}" (contoh: "1500001_1")
  id TEXT PRIMARY KEY,

  -- Identitas Petugas & Wilayah Administrasi
  petugas TEXT NOT NULL DEFAULT 'Petugas Lapangan',
  provinsi TEXT NOT NULL DEFAULT 'KALIMANTAN BARAT',
  kabupaten TEXT NOT NULL DEFAULT 'KUBU RAYA',
  kecamatan TEXT NOT NULL DEFAULT '',
  desa TEXT NOT NULL DEFAULT '',
  sls TEXT NOT NULL DEFAULT '',

  -- Identitas Sampel
  nks TEXT NOT NULL,
  nus TEXT NOT NULL,
  status_sampel TEXT NOT NULL DEFAULT 'U' CHECK (status_sampel IN ('U', 'C')),

  -- Informasi Komoditas & Responden (UTP / KRT / ART)
  komoditas TEXT NOT NULL DEFAULT '-',
  komoditas_prioritas TEXT NOT NULL DEFAULT '-',
  nama_krt TEXT NOT NULL DEFAULT '-',
  nama_art TEXT NOT NULL DEFAULT '-',
  no_telp TEXT NOT NULL DEFAULT '',
  nama_utp TEXT NOT NULL DEFAULT '-',
  alamat TEXT NOT NULL DEFAULT '-',

  -- Informasi Geospasial / Koordinat GPS
  raw_koordinat TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Data Bawaan Template Excel/CSV
  keterangan_awal TEXT NOT NULL DEFAULT '',
  nus_pengganti_awal TEXT NOT NULL DEFAULT '',

  -- Field Monitoring Progres Lapangan (Real-time Editable)
  progress_status TEXT NOT NULL DEFAULT 'BELUM' CHECK (
    progress_status IN ('SELESAI', 'BELUM', 'MENOLAK', 'TIDAK_DITEMUKAN', 'NON_AKTIF')
  ),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  tanggal_cacah TEXT, -- Format: YYYY-MM-DD
  catatan_petugas TEXT,
  nus_pengganti TEXT,
  pencacah_nama TEXT,

  -- Integrasi FASIH-SM
  hasil_pendataan_fasih TEXT NOT NULL DEFAULT '-',
  status_dokumen_fasih TEXT NOT NULL DEFAULT 'DRAFT',
  akun_fasih TEXT,

  -- Metadata Waktu
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint unik tambahan untuk mencegah duplikasi NKS + NUS saat upsert
  CONSTRAINT uq_sitasi_samples_nks_nus UNIQUE (nks, nus)
);

-- 2. Index untuk Mempercepat Filter & Query Dashboard
CREATE INDEX IF NOT EXISTS idx_sitasi_samples_petugas ON public.sitasi_samples (petugas);
CREATE INDEX IF NOT EXISTS idx_sitasi_samples_nks ON public.sitasi_samples (nks);
CREATE INDEX IF NOT EXISTS idx_sitasi_samples_desa ON public.sitasi_samples (desa);
CREATE INDEX IF NOT EXISTS idx_sitasi_samples_progress_status ON public.sitasi_samples (progress_status);
CREATE INDEX IF NOT EXISTS idx_sitasi_samples_status_sampel ON public.sitasi_samples (status_sampel);
CREATE INDEX IF NOT EXISTS idx_sitasi_samples_updated_at ON public.sitasi_samples (updated_at DESC);

-- 3. Trigger Otomatis untuk Memperbarui Kolom updated_at pada Setiap UPDATE
CREATE OR REPLACE FUNCTION public.set_sitasi_samples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sitasi_samples_updated_at ON public.sitasi_samples;
CREATE TRIGGER trg_sitasi_samples_updated_at
  BEFORE UPDATE ON public.sitasi_samples
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sitasi_samples_updated_at();

-- 4. Row Level Security (RLS)
ALTER TABLE public.sitasi_samples ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada agar skrip idempoten saat dijalankan ulang
DROP POLICY IF EXISTS "Allow public read access on sitasi_samples" ON public.sitasi_samples;
DROP POLICY IF EXISTS "Allow public insert access on sitasi_samples" ON public.sitasi_samples;
DROP POLICY IF EXISTS "Allow public update access on sitasi_samples" ON public.sitasi_samples;
DROP POLICY IF EXISTS "Allow public delete access on sitasi_samples" ON public.sitasi_samples;

-- Kebijakan RLS untuk akses aplikasi dashboard via anon key:
-- Catatan Keamanan:
-- Aplikasi membatasi mode edit di UI khusus untuk Akun Pemilik (sifarofatunnisa24@gmail.com)
-- dan akun berizin. Jika Anda mengaktifkan Supabase Auth di masa depan,
-- Anda dapat mengganti kondisi USING (true) / WITH CHECK (true) di bawah ini
-- menjadi pengecekan auth.role() = 'authenticated' atau email JWT spesifik:
--   USING ((auth.jwt() ->> 'email') = 'sifarofatunnisa24@gmail.com')

CREATE POLICY "Allow public read access on sitasi_samples"
  ON public.sitasi_samples
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access on sitasi_samples"
  ON public.sitasi_samples
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access on sitasi_samples"
  ON public.sitasi_samples
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access on sitasi_samples"
  ON public.sitasi_samples
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- 5. Aktifkan Supabase Realtime pada tabel sitasi_samples (opsional untuk auto-sync antar perangkat)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.sitasi_samples;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- Tabel sudah terdaftar di publication supabase_realtime
    END;
  END IF;
END
$$;
