export type SampleStatusType = 'U' | 'C'; // Utama or Cadangan

export type UserRole = 'owner' | 'editor' | 'guest';

export interface PermissionConfig {
  ownerEmail: string;
  ownerPin?: string;
  accessKey?: string;
  accessMode: 'owner_only' | 'allow_permitted' | 'public';
  allowedEmails: string[];
  allowedPetugas: string[];
  lastUpdated?: string;
}

export interface UserAuthSession {
  role: UserRole;
  email?: string;
  displayName: string;
  token?: string;
  canEdit: boolean;
  loginAt?: string;
}

export type SurveyProgressStatus = 
  | 'SELESAI'           // Berhasil dicacah
  | 'BELUM'             // Belum dikunjungi / belum selesai
  | 'MENOLAK'           // Responden menolak
  | 'TIDAK_DITEMUKAN'   // Tidak ditemukan / pindah
  | 'NON_AKTIF';        // Bukan usaha pertanian lagi / alih fungsi

export interface SampleItem {
  id: string; // unique ID: `${nks}_${nus}`
  petugas: string; // Nama Petugas Lapangan, misal "Erika"
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  sls: string;
  nks: string;
  nus: string;
  komoditas: string;
  komoditasPrioritas: string;
  namaKRT: string;
  namaART: string;
  noTelp: string;
  namaUTP: string;
  alamat: string;
  rawKoordinat: string;
  latitude: number | null;
  longitude: number | null;
  statusSampel: SampleStatusType; // 'U' | 'C'
  keteranganAwal: string;
  nusPenggantiAwal: string;
  
  // Monitoring fields (editable & persisted)
  progressStatus: SurveyProgressStatus;
  isCompleted: boolean;
  tanggalCacah?: string; // YYYY-MM-DD
  catatanPetugas?: string;
  nusPengganti?: string; // Jika sampel cadangan menggantikan sampel utama
  pencacahNama?: string;
  updatedAt?: string;

  // FASIH-SM Integration fields
  hasilPendataanFasih?: string; // "1. Berhasil diwawancarai", "2. Responden menolak", "-", etc.
  statusDokumenFasih?: string;  // "APPROVED BY PENGAWAS", "SUBMITTED BY PENCACAH", "DRAFT", "REJECTED"
  akunFasih?: string;           // "supernaya.15@gmail.com", "iman.santoso (Pengawas)", etc.
}

export type FasihHasilPendataanOption =
  | '1. Berhasil diwawancarai'
  | '2. Responden menolak'
  | '3. Responden tidak dapat ditemui/dihubungi'
  | '4. Pindah/Tidak Ditemukan'
  | '5. Bukan Usaha Pertanian Lagi'
  | '-';

export type HasilKategori = 'BELUM_DIWAWANCARA' | 'BERHASIL' | 'TIDAK_BERHASIL';

export interface UnifiedStatusOption {
  value: string;
  label: string;
  kategori: HasilKategori;
  progressStatus: SurveyProgressStatus;
  perluCadangan: boolean;
}

export const UNIFIED_STATUS_OPTIONS: UnifiedStatusOption[] = [
  // Kategori 1: Belum Diwawancara (-)
  {
    value: '-',
    label: '- Belum Diwawancara',
    kategori: 'BELUM_DIWAWANCARA',
    progressStatus: 'BELUM',
    perluCadangan: false,
  },
  // Kategori 2: Berhasil Diwawancarai (Kode 1)
  {
    value: '1. Berhasil diwawancarai',
    label: '1. Berhasil diwawancarai',
    kategori: 'BERHASIL',
    progressStatus: 'SELESAI',
    perluCadangan: false,
  },
  // Kategori 3: Tidak Berhasil Diwawancarai (Kode 2 sampai 5 - harus ganti Cadangan jika Utama)
  {
    value: '2. Responden menolak',
    label: '2. Responden menolak (Gagal - Ganti Cadangan)',
    kategori: 'TIDAK_BERHASIL',
    progressStatus: 'MENOLAK',
    perluCadangan: true,
  },
  {
    value: '3. Responden tidak dapat ditemui/dihubungi',
    label: '3. Responden tidak dapat ditemui/dihubungi (Gagal - Ganti Cadangan)',
    kategori: 'TIDAK_BERHASIL',
    progressStatus: 'TIDAK_DITEMUKAN',
    perluCadangan: true,
  },
  {
    value: '4. Pindah/Tidak Ditemukan',
    label: '4. Pindah/Tidak Ditemukan (Gagal - Ganti Cadangan)',
    kategori: 'TIDAK_BERHASIL',
    progressStatus: 'TIDAK_DITEMUKAN',
    perluCadangan: true,
  },
  {
    value: '5. Bukan Usaha Pertanian Lagi',
    label: '5. Bukan Usaha Pertanian Lagi (Gagal - Ganti Cadangan)',
    kategori: 'TIDAK_BERHASIL',
    progressStatus: 'NON_AKTIF',
    perluCadangan: true,
  },
];

export const FASIH_HASIL_PENDATAAN_OPTIONS = UNIFIED_STATUS_OPTIONS;

/**
 * Mendapatkan Kategori Hasil Pendataan (Hanya 3 Kategori):
 * - 'BERHASIL': Kode 1 (1. Berhasil diwawancarai / SELESAI)
 * - 'TIDAK_BERHASIL': Kode 2 s.d 5 (Menolak, Tidak Ditemukan, Pindah, Bukan Usaha Pertanian Lagi - Harus Ganti Cadangan)
 * - 'BELUM_DIWAWANCARA': Belum Diwawancara (-)
 */
export function getHasilKategori(sample: { hasilPendataanFasih?: string; progressStatus?: string }): HasilKategori {
  const h = (sample.hasilPendataanFasih || '').trim().toLowerCase();
  const s = sample.progressStatus;

  // 1. Kategori Berhasil (Kode 1)
  if (h.includes('berhasil') || h.startsWith('1.') || s === 'SELESAI') {
    return 'BERHASIL';
  }

  // 2. Kategori Tidak Berhasil (Kode 2 sampai 5)
  if (
    h.startsWith('2.') || h.includes('menolak') || s === 'MENOLAK' ||
    h.startsWith('3.') || h.includes('tidak dapat') ||
    h.startsWith('4.') || h.includes('pindah') || h.includes('tidak ditemukan') || s === 'TIDAK_DITEMUKAN' ||
    h.startsWith('5.') || h.includes('bukan usaha') || h.includes('alih fungsi') || s === 'NON_AKTIF'
  ) {
    return 'TIDAK_BERHASIL';
  }

  // 3. Kategori Belum Diwawancara (-)
  return 'BELUM_DIWAWANCARA';
}

export function isSampleBelumDiwawancara(sample: { hasilPendataanFasih?: string; progressStatus?: string }): boolean {
  return getHasilKategori(sample) === 'BELUM_DIWAWANCARA';
}

// Backward-compatibility alias
export const isSampleDraft = isSampleBelumDiwawancara;

export function isSampleBerhasil(sample: { hasilPendataanFasih?: string; progressStatus?: string }): boolean {
  return getHasilKategori(sample) === 'BERHASIL';
}

export function isSampleTidakBerhasil(sample: { hasilPendataanFasih?: string; progressStatus?: string }): boolean {
  return getHasilKategori(sample) === 'TIDAK_BERHASIL';
}

// Backward-compatibility aliases
export const isFasihBerhasil = (hasil?: string) => {
  if (!hasil) return false;
  const h = hasil.toLowerCase();
  return h.includes('berhasil') || h.startsWith('1.');
};

export const isFasihTerkendala = (hasil?: string) => {
  if (!hasil || hasil === '-' || hasil.trim() === '') return false;
  return !isFasihBerhasil(hasil);
};

/**
 * Map FASIH-SM Hasil Pendataan to internal SurveyProgressStatus
 */
export function mapFasihToSurveyStatus(hasil?: string): SurveyProgressStatus {
  if (!hasil || hasil === '-' || hasil.trim() === '') return 'BELUM';
  const h = hasil.toLowerCase();
  if (h.includes('berhasil') || h.startsWith('1.')) return 'SELESAI';
  if (h.includes('menolak') || h.startsWith('2.')) return 'MENOLAK';
  if (h.includes('pindah') || h.includes('tidak ditemukan') || h.includes('tidak dapat') || h.startsWith('3.') || h.startsWith('4.')) {
    return 'TIDAK_DITEMUKAN';
  }
  if (h.includes('bukan usaha') || h.includes('alih fungsi') || h.includes('non-aktif') || h.startsWith('5.')) {
    return 'NON_AKTIF';
  }
  return 'BELUM';
}

/**
 * Map SurveyProgressStatus to standard FASIH-SM Hasil Pendataan string
 */
export function mapSurveyStatusToFasih(status: SurveyProgressStatus): string {
  switch (status) {
    case 'SELESAI':
      return '1. Berhasil diwawancarai';
    case 'MENOLAK':
      return '2. Responden menolak';
    case 'TIDAK_DITEMUKAN':
      return '4. Pindah/Tidak Ditemukan';
    case 'NON_AKTIF':
      return '5. Bukan Usaha Pertanian Lagi';
    case 'BELUM':
    default:
      return '-';
  }
}

export interface PetugasSummary {
  nama: string;
  totalSampel: number;
  totalUtama: number;
  totalCadangan: number;
  selesaiUtama: number;
  selesaiCadangan: number;
  selesaiCadanganPengganti: number;
  selesaiProgress: number; // Selesai Utama + Selesai Cadangan Pengganti
  selesaiTotal: number;
  belumTotal: number;
  masalahTotal: number;
  persentaseProgress: number; // (selesaiProgress / totalUtama) * 100
  persentaseUtama: number; // Kept for backwards compatibility
  persentaseTotal: number;
}

export interface FilterOptions {
  searchQuery: string;
  petugas: string; // 'all' or specific name
  statusFilter: 'ALL' | 'BELUM_DIWAWANCARA' | 'DRAFT' | 'BERHASIL' | 'TIDAK_BERHASIL' | 'SELESAI' | 'BELUM' | 'MASALAH';
  tipeFilter: 'ALL' | 'U' | 'C';
  nksFilter: string;
  desaFilter: string;
  fasihFilter?: 'ALL' | 'BERHASIL' | 'TERKENDALA' | 'GAGAL_PERLU_GANTI' | 'SUDAH_DIGANTI' | 'BELUM';
  sortBy: 'nus' | 'nama' | 'status' | 'tanggal';
  sortOrder: 'asc' | 'desc';
}

export type TableColumnKey = 
  | 'select'       // Kotak centang batch pilih
  | 'checklist'    // Checklist cepat centang hijau
  | 'petugas'      // Petugas lapangan
  | 'nus'          // NUS & Tipe sampel
  | 'nama'         // Nama UTP & KRT
  | 'wilayah'      // Desa / SLS / Alamat
  | 'komoditas'    // Komoditas
  | 'lokasi'       // Lokasi / GPS
  | 'status'       // Status & Tanggal
  | 'pengganti'    // NUS Pengganti & Catatan
  | 'aksi';        // Tombol Aksi

export type VisibleColumns = Record<TableColumnKey, boolean>;

export const DEFAULT_VISIBLE_COLUMNS: VisibleColumns = {
  select: true,
  checklist: true,
  petugas: true,
  nus: true,
  nama: true,
  wilayah: true,
  komoditas: true,
  lokasi: true,
  status: true,
  pengganti: true,
  aksi: true,
};

export type PageSizeOption = 10 | 25 | 50 | 100 | 'all';
