import { SampleItem, PetugasSummary, VisibleColumns, DEFAULT_VISIBLE_COLUMNS } from '../types/sitasi';

const STORAGE_KEY = 'sitasi_2026_monitoring_samples_v1';
const ACTIVE_PETUGAS_KEY = 'sitasi_2026_active_petugas';
const VISIBLE_COLUMNS_KEY = 'sitasi_2026_visible_columns';

/**
 * Load visible columns configuration or fallback to default
 */
export function loadSavedVisibleColumns(): VisibleColumns {
  try {
    const raw = localStorage.getItem(VISIBLE_COLUMNS_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_VISIBLE_COLUMNS, ...parsed };
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

/**
 * Save visible columns configuration to localStorage
 */
export function saveVisibleColumns(columns: VisibleColumns): void {
  try {
    localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(columns));
  } catch (err) {
    console.error('Error saving visible columns:', err);
  }
}


/**
 * Load samples from localStorage or return null
 */
export function loadSavedSamples(): SampleItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error loading samples from storage:', err);
  }
  return null;
}

/**
 * Save samples to localStorage
 */
export function saveSamples(samples: SampleItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
  } catch (err) {
    console.error('Error saving samples to storage:', err);
  }
}

/**
 * Save and get active petugas
 */
export function getSavedActivePetugas(): string {
  try {
    return localStorage.getItem(ACTIVE_PETUGAS_KEY) || 'all';
  } catch {
    return 'all';
  }
}

export function saveActivePetugas(petugas: string): void {
  try {
    localStorage.setItem(ACTIVE_PETUGAS_KEY, petugas);
  } catch (err) {
    console.error('Error saving active petugas:', err);
  }
}

/**
 * Calculate summary metrics for all officers and individually
 */
export function calculatePetugasSummaries(samples: SampleItem[]): PetugasSummary[] {
  // Collect all referenced Cadangan NUS from Utama samples
  const referencedCadanganNus = new Set<string>();
  samples.forEach(s => {
    if (s.statusSampel === 'U') {
      if (s.nusPengganti && s.nusPengganti.trim()) {
        referencedCadanganNus.add(s.nusPengganti.trim());
      } else if (s.nusPenggantiAwal && s.nusPenggantiAwal.trim()) {
        referencedCadanganNus.add(s.nusPenggantiAwal.trim());
      }
    }
  });

  const petugasMap = new Map<string, SampleItem[]>();

  samples.forEach(sample => {
    const p = sample.petugas || 'Tanpa Nama';
    if (!petugasMap.has(p)) {
      petugasMap.set(p, []);
    }
    petugasMap.get(p)!.push(sample);
  });

  const summaries: PetugasSummary[] = [];

  petugasMap.forEach((pSamples, nama) => {
    const totalSampel = pSamples.length;
    const totalUtama = pSamples.filter(s => s.statusSampel === 'U').length;
    const totalCadangan = pSamples.filter(s => s.statusSampel === 'C').length;

    // 1. Sampel Utama yang Selesai Dicacah
    const selesaiUtama = pSamples.filter(s => s.statusSampel === 'U' && s.progressStatus === 'SELESAI').length;

    // 2. Sampel Cadangan yang digunakan menjadi sampel pengganti dengan status Selesai Dicacah
    // yang ditunjukkan dengan adanya NUS Pengganti
    const selesaiCadanganPengganti = pSamples.filter(s => {
      if (s.statusSampel !== 'C') return false;
      if (s.progressStatus !== 'SELESAI') return false;

      const hasOwnNusPengganti = Boolean(
        (s.nusPengganti && s.nusPengganti.trim()) ||
        (s.nusPenggantiAwal && s.nusPenggantiAwal.trim())
      );
      const isReferencedByUtama = referencedCadanganNus.has(s.nus.trim());

      return hasOwnNusPengganti || isReferencedByUtama;
    }).length;

    // Seluruh Sampel Cadangan Selesai
    const selesaiCadangan = pSamples.filter(s => s.statusSampel === 'C' && s.progressStatus === 'SELESAI').length;

    // Progress Pendataan yang dihitung: Utama Selesai + Cadangan Pengganti Selesai
    const selesaiProgress = selesaiUtama + selesaiCadanganPengganti;
    const selesaiTotal = selesaiUtama + selesaiCadangan;

    const belumTotal = pSamples.filter(s => s.progressStatus === 'BELUM').length;
    const masalahTotal = pSamples.filter(s => ['MENOLAK', 'TIDAK_DITEMUKAN', 'NON_AKTIF'].includes(s.progressStatus)).length;

    const persentaseProgress = totalUtama > 0 ? Math.round((selesaiProgress / totalUtama) * 100) : 0;
    const persentaseTotal = totalSampel > 0 ? Math.round((selesaiTotal / totalSampel) * 100) : 0;

    summaries.push({
      nama,
      totalSampel,
      totalUtama,
      totalCadangan,
      selesaiUtama,
      selesaiCadangan,
      selesaiCadanganPengganti,
      selesaiProgress,
      selesaiTotal,
      belumTotal,
      masalahTotal,
      persentaseProgress,
      persentaseUtama: persentaseProgress,
      persentaseTotal,
    });
  });

  // Sort by highest persentaseProgress or total samples
  return summaries.sort((a, b) => b.persentaseProgress - a.persentaseProgress);
}

/**
 * Generate secondary demo officer samples based on Erika's structure
 * so user can immediately test multi-officer comparisons
 */
export function generateDemoAdditionalOfficers(): SampleItem[] {
  // Demo Officer 2: Budi Pratama (Kecamatan Rasau Jaya - Desa Rasau Jaya Dua & Tiga)
  const budiSamples: SampleItem[] = [
    {
      id: '1300017_401',
      petugas: 'Budi Pratama',
      provinsi: 'KALIMANTAN BARAT',
      kabupaten: 'KUBU RAYA',
      kecamatan: 'RASAU JAYA',
      desa: 'RASAU JAYA DUA',
      sls: 'RT 005 RW 02 DUSUN CEMPAKA',
      nks: '1300017',
      nus: '401',
      komoditas: 'PADI SAWAH INBRIDA, JAGUNG, KELAPA SAWIT',
      komoditasPrioritas: 'PADI SAWAH',
      namaKRT: 'SUHARTONO',
      namaART: 'SITI AMINAH',
      noTelp: '081256789012',
      namaUTP: 'SUHARTONO',
      alamat: 'DUSUN CEMPAKA RT 05',
      rawKoordinat: 'latitude: -0.27410\nlongitude: 109.34120',
      latitude: -0.2741,
      longitude: 109.3412,
      statusSampel: 'U',
      keteranganAwal: '',
      nusPenggantiAwal: '',
      progressStatus: 'SELESAI',
      isCompleted: true,
      tanggalCacah: '2026-10-21',
      catatanPetugas: 'Responden sangat kooperatif, panen lancar',
    },
    {
      id: '1300017_402',
      petugas: 'Budi Pratama',
      provinsi: 'KALIMANTAN BARAT',
      kabupaten: 'KUBU RAYA',
      kecamatan: 'RASAU JAYA',
      desa: 'RASAU JAYA DUA',
      sls: 'RT 005 RW 02 DUSUN CEMPAKA',
      nks: '1300017',
      nus: '402',
      komoditas: 'CABAI RAWIT, TERUNG, TOMAT',
      komoditasPrioritas: 'CABAI RAWIT',
      namaKRT: 'WAHYUDI',
      namaART: 'SRI WAHYUNI',
      noTelp: '085278901234',
      namaUTP: 'WAHYUDI',
      alamat: 'DUSUN CEMPAKA RT 05',
      rawKoordinat: 'latitude: -0.27380\nlongitude: 109.34250',
      latitude: -0.2738,
      longitude: 109.3425,
      statusSampel: 'U',
      keteranganAwal: '',
      nusPenggantiAwal: '',
      progressStatus: 'SELESAI',
      isCompleted: true,
      tanggalCacah: '2026-10-22',
      catatanPetugas: 'Lahan sekitar 0.5 Ha cabai rawit',
    },
    {
      id: '1300017_403',
      petugas: 'Budi Pratama',
      provinsi: 'KALIMANTAN BARAT',
      kabupaten: 'KUBU RAYA',
      kecamatan: 'RASAU JAYA',
      desa: 'RASAU JAYA DUA',
      sls: 'RT 005 RW 02 DUSUN CEMPAKA',
      nks: '1300017',
      nus: '403',
      komoditas: 'KELAPA SAWIT, KARET',
      komoditasPrioritas: 'KELAPA SAWIT',
      namaKRT: 'MASKUR',
      namaART: 'ROHAYATI',
      noTelp: '',
      namaUTP: 'MASKUR',
      alamat: 'DUSUN CEMPAKA RT 05',
      rawKoordinat: 'latitude: -0.27510\nlongitude: 109.34400',
      latitude: -0.2751,
      longitude: 109.344,
      statusSampel: 'U',
      keteranganAwal: '',
      nusPenggantiAwal: '',
      progressStatus: 'BELUM',
      isCompleted: false,
    },
    {
      id: '1300017_404',
      petugas: 'Budi Pratama',
      provinsi: 'KALIMANTAN BARAT',
      kabupaten: 'KUBU RAYA',
      kecamatan: 'RASAU JAYA',
      desa: 'RASAU JAYA DUA',
      sls: 'RT 005 RW 02 DUSUN CEMPAKA',
      nks: '1300017',
      nus: '404',
      komoditas: 'JERUK SIAM, PINANG',
      komoditasPrioritas: 'JERUK SIAM',
      namaKRT: 'KASIMIN',
      namaART: 'RUSMIATI',
      noTelp: '081399887766',
      namaUTP: 'KASIMIN',
      alamat: 'DUSUN CEMPAKA RT 05',
      rawKoordinat: 'latitude: -0.27600\nlongitude: 109.34310',
      latitude: -0.276,
      longitude: 109.3431,
      statusSampel: 'C',
      keteranganAwal: '',
      nusPenggantiAwal: '',
      progressStatus: 'BELUM',
      isCompleted: false,
    },
    {
      id: '1300017_405',
      petugas: 'Budi Pratama',
      provinsi: 'KALIMANTAN BARAT',
      kabupaten: 'KUBU RAYA',
      kecamatan: 'RASAU JAYA',
      desa: 'RASAU JAYA DUA',
      sls: 'RT 005 RW 02 DUSUN CEMPAKA',
      nks: '1300017',
      nus: '405',
      komoditas: 'AYAM KAMPUNG, ITIK, PADI',
      komoditasPrioritas: 'PADI SAWAH',
      namaKRT: 'SURATMAN',
      namaART: 'ENDAH',
      noTelp: '',
      namaUTP: 'SURATMAN',
      alamat: 'DUSUN CEMPAKA RT 05',
      rawKoordinat: 'latitude: -0.27490\nlongitude: 109.34180',
      latitude: -0.2749,
      longitude: 109.3418,
      statusSampel: 'C',
      keteranganAwal: '',
      nusPenggantiAwal: '',
      progressStatus: 'BELUM',
      isCompleted: false,
    }
  ];

  // Demo Officer 3: Siti Nurhaliza
  const sitiSamples: SampleItem[] = [
    {
      id: '1400018_501',
      petugas: 'Siti Nurhaliza',
      provinsi: 'KALIMANTAN BARAT',
      kabupaten: 'KUBU RAYA',
      kecamatan: 'RASAU JAYA',
      desa: 'RASAU JAYA TIGA',
      sls: 'RT 003 RW 01 DUSUN MEKAR SARI',
      nks: '1400018',
      nus: '501',
      komoditas: 'PADI SAWAH INBRIDA, KELAPA, KAMBING',
      komoditasPrioritas: 'PADI SAWAH',
      namaKRT: 'SUBAGYO',
      namaART: 'TUMINAH',
      noTelp: '085311223344',
      namaUTP: 'SUBAGYO',
      alamat: 'DUSUN MEKAR SARI',
      rawKoordinat: 'latitude: -0.28100\nlongitude: 109.35100',
      latitude: -0.281,
      longitude: 109.351,
      statusSampel: 'U',
      keteranganAwal: '',
      nusPenggantiAwal: '',
      progressStatus: 'SELESAI',
      isCompleted: true,
      tanggalCacah: '2026-10-22',
      catatanPetugas: 'Data valid, luas sawah 1.2 Ha',
    },
    {
      id: '1400018_502',
      petugas: 'Siti Nurhaliza',
      provinsi: 'KALIMANTAN BARAT',
      kabupaten: 'KUBU RAYA',
      kecamatan: 'RASAU JAYA',
      desa: 'RASAU JAYA TIGA',
      sls: 'RT 003 RW 01 DUSUN MEKAR SARI',
      nks: '1400018',
      nus: '502',
      komoditas: 'NANAS, KELAPA SAWIT, IKAN LELE',
      komoditasPrioritas: 'NANAS',
      namaKRT: 'HERI PURWANTO',
      namaART: 'NURHAYATI',
      noTelp: '082188776655',
      namaUTP: 'HERI PURWANTO',
      alamat: 'DUSUN MEKAR SARI',
      rawKoordinat: 'latitude: -0.28250\nlongitude: 109.35220',
      latitude: -0.2825,
      longitude: 109.3522,
      statusSampel: 'U',
      keteranganAwal: '',
      nusPenggantiAwal: '',
      progressStatus: 'BELUM',
      isCompleted: false,
    },
    {
      id: '1400018_503',
      petugas: 'Siti Nurhaliza',
      provinsi: 'KALIMANTAN BARAT',
      kabupaten: 'KUBU RAYA',
      kecamatan: 'RASAU JAYA',
      desa: 'RASAU JAYA TIGA',
      sls: 'RT 003 RW 01 DUSUN MEKAR SARI',
      nks: '1400018',
      nus: '503',
      komoditas: 'JAGUNG HIBRIDA, KACANG PANJANG',
      komoditasPrioritas: 'JAGUNG',
      namaKRT: 'ZAINUDDIN',
      namaART: 'MARLINA',
      noTelp: '',
      namaUTP: 'ZAINUDDIN',
      alamat: 'DUSUN MEKAR SARI',
      rawKoordinat: 'latitude: -0.28310\nlongitude: 109.35340',
      latitude: -0.2831,
      longitude: 109.3534,
      statusSampel: 'C',
      keteranganAwal: '',
      nusPenggantiAwal: '',
      progressStatus: 'BELUM',
      isCompleted: false,
    }
  ];

  return [...budiSamples, ...sitiSamples];
}
