import * as XLSX from 'xlsx';
import { SampleItem, isSampleBerhasil, isSampleTidakBerhasil } from '../types/sitasi';

export interface RekapMonitoringOfficer {
  no: number;
  namaPetugas: string;
  totalSampelUtama: number;
  utamaBerhasil: number;
  utamaDiganti: number;
  cadanganSudahDidata: number;
  totalDiolah: number;
  persentaseSelesai: number;
  persentaseSelesaiText: string;
}

/**
 * Calculate monitoring recap per officer and total summary:
 * - Total Sampel Utama
 * - Jumlah Sampel Utama Berhasil Didata
 * - Sampel Utama Diganti (ke Sampel Cadangan)
 * - Sampel Cadangan yang Sudah Didata
 * - Total Sampel Yang Diolah (Sampel Utama Berhasil Didata + Sampel Cadangan Berhasil Didata)
 * - Persentase Selesai (Total Sampel Yang Diolah dibagi dengan Total Sampel Utama)
 */
export function calculateRekapMonitoring(samples: SampleItem[]): {
  officers: RekapMonitoringOfficer[];
  total: {
    totalSampelUtama: number;
    utamaBerhasil: number;
    utamaDiganti: number;
    cadanganSudahDidata: number;
    totalDiolah: number;
    persentaseSelesai: number;
    persentaseSelesaiText: string;
  };
} {
  const map = new Map<string, SampleItem[]>();
  samples.forEach(s => {
    const p = (s.petugas && s.petugas.trim()) || 'Tanpa Petugas';
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(s);
  });

  const officers: RekapMonitoringOfficer[] = [];
  let sumUtama = 0;
  let sumUtamaBerhasil = 0;
  let sumUtamaDiganti = 0;
  let sumCadanganDidata = 0;
  let sumTotalDiolah = 0;

  const officerNames = Array.from(map.keys()).sort();

  officerNames.forEach((name, idx) => {
    const list = map.get(name)!;

    // 1. Total Sampel Utama
    const totalSampelUtama = list.filter(s => s.statusSampel === 'U').length;

    // 2. Jumlah Sampel Utama Berhasil Didata
    const utamaBerhasil = list.filter(s => s.statusSampel === 'U' && isSampleBerhasil(s)).length;

    // 3. Sampel Utama Diganti (ke Sampel Cadangan)
    // Sampel utama yang berstatus tidak berhasil (menolak / tidak ditemukan / bukan usaha) atau memiliki NUS pengganti
    const utamaDiganti = list.filter(s => 
      s.statusSampel === 'U' && (
        isSampleTidakBerhasil(s) || 
        Boolean(s.nusPengganti && s.nusPengganti.trim()) || 
        Boolean(s.nusPenggantiAwal && s.nusPenggantiAwal.trim())
      )
    ).length;

    // 4. Sampel Cadangan yang Sudah Didata
    const cadanganSudahDidata = list.filter(s => s.statusSampel === 'C' && isSampleBerhasil(s)).length;

    // 5. Total Sampel Yang Diolah (Sampel Utama Berhasil Didata + Sampel Cadangan Berhasil Didata)
    const totalDiolah = utamaBerhasil + cadanganSudahDidata;

    // 6. Persentase Selesai (Total Sampel Yang Diolah / Total Sampel Utama)
    const persentase = totalSampelUtama > 0 ? (totalDiolah / totalSampelUtama) * 100 : 0;

    sumUtama += totalSampelUtama;
    sumUtamaBerhasil += utamaBerhasil;
    sumUtamaDiganti += utamaDiganti;
    sumCadanganDidata += cadanganSudahDidata;
    sumTotalDiolah += totalDiolah;

    officers.push({
      no: idx + 1,
      namaPetugas: name,
      totalSampelUtama,
      utamaBerhasil,
      utamaDiganti,
      cadanganSudahDidata,
      totalDiolah,
      persentaseSelesai: persentase,
      persentaseSelesaiText: `${persentase.toFixed(1)}%`
    });
  });

  const totalPersentase = sumUtama > 0 ? (sumTotalDiolah / sumUtama) * 100 : 0;

  return {
    officers,
    total: {
      totalSampelUtama: sumUtama,
      utamaBerhasil: sumUtamaBerhasil,
      utamaDiganti: sumUtamaDiganti,
      cadanganSudahDidata: sumCadanganDidata,
      totalDiolah: sumTotalDiolah,
      persentaseSelesai: totalPersentase,
      persentaseSelesaiText: `${totalPersentase.toFixed(1)}%`
    }
  };
}

/**
 * Creates the formatted "Rekap Monitoring" worksheet
 */
export function createRekapWorksheet(samples: SampleItem[]): XLSX.WorkSheet {
  const rekap = calculateRekapMonitoring(samples);
  const now = new Date();
  const timeStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) + ` pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

  const rows: any[][] = [
    ['REKAPITULASI PROGRES MONITORING PENDATAAN SITASI 2026'],
    ['BADAN PUSAT STATISTIK (BPS) KABUPATEN KUBU RAYA'],
    [`Waktu Unduh Data: ${timeStr}`],
    [], // empty spacer row
    [
      'No',
      'Nama Petugas',
      'Total Sampel Utama',
      'Jumlah Sampel Utama Berhasil Didata',
      'Sampel Utama Diganti (ke Sampel Cadangan)',
      'Sampel Cadangan yang Sudah Didata',
      'Total Sampel Yang Diolah (Sampel Utama Berhasil Didata + Sampel Cadangan Berhasil Didata)',
      'Persentase Selesai (Total Sampel Yang Diolah / Total Sampel Utama)'
    ]
  ];

  rekap.officers.forEach(o => {
    rows.push([
      o.no,
      o.namaPetugas,
      o.totalSampelUtama,
      o.utamaBerhasil,
      o.utamaDiganti,
      o.cadanganSudahDidata,
      o.totalDiolah,
      o.persentaseSelesaiText
    ]);
  });

  // Total summary row
  rows.push([
    '',
    'TOTAL KESELURUHAN',
    rekap.total.totalSampelUtama,
    rekap.total.utamaBerhasil,
    rekap.total.utamaDiganti,
    rekap.total.cadanganSudahDidata,
    rekap.total.totalDiolah,
    rekap.total.persentaseSelesaiText
  ]);

  // Notes and definitions
  rows.push([]);
  rows.push(['* Keterangan Rumus & Definisi BPS SITASI 2026:']);
  rows.push(['  1. Total Sampel Yang Diolah = Sampel Utama Berhasil Didata + Sampel Cadangan yang Sudah Didata']);
  rows.push(['  2. Persentase Selesai (%) = (Total Sampel Yang Diolah / Total Sampel Utama) x 100%']);
  rows.push(['  3. Sampel Utama Diganti = Sampel utama berstatus Gagal Wawancara (menolak/tidak ditemukan/bukan usaha pertanian) dan/atau telah memiliki NUS cadangan pengganti']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set explicit column widths for readability
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 26 }, // Nama Petugas
    { wch: 22 }, // Total Sampel Utama
    { wch: 38 }, // Jumlah Sampel Utama Berhasil Didata
    { wch: 44 }, // Sampel Utama Diganti (ke Sampel Cadangan)
    { wch: 38 }, // Sampel Cadangan yang Sudah Didata
    { wch: 46 }, // Total Sampel Yang Diolah
    { wch: 32 }, // Persentase Selesai
  ];

  // Merge banner titles across header columns A1:H1, A2:H2, A3:H3
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
  ];

  return ws;
}

/**
 * Export Excel Workbook containing:
 * - Sheet 1: Rekap Monitoring (Summary per officer)
 * - Sheet 2: Data Sampel Monitoring (Detailed sample list)
 */
export function exportToExcel(
  samples: SampleItem[], 
  filename: string = 'Monitoring_SITASI_2026.xlsx',
  allSamples?: SampleItem[]
): void {
  const workbook = XLSX.utils.book_new();

  // 1. Sheet 1: Rekap Monitoring (Calculated per Officer)
  const samplesForRekap = allSamples && allSamples.length > 0 ? allSamples : samples;
  const rekapWorksheet = createRekapWorksheet(samplesForRekap);
  XLSX.utils.book_append_sheet(workbook, rekapWorksheet, 'Rekap Monitoring');

  // 2. Sheet 2: Data Sampel Monitoring (Detailed raw data)
  const detailData = samples.map((s, index) => ({
    'No': index + 1,
    'Petugas Lapangan': s.petugas,
    'Provinsi': s.provinsi,
    'Kabupaten': s.kabupaten,
    'Kecamatan': s.kecamatan,
    'Desa/Kelurahan': s.desa,
    'SLS / Sub-SLS': s.sls,
    'NKS': s.nks,
    'NUS': s.nus,
    'Tipe Sampel': s.statusSampel === 'U' ? 'Utama (U)' : 'Cadangan (C)',
    'Status Pencacahan': s.progressStatus,
    'Hasil Pendataan': s.hasilPendataanFasih || (s.progressStatus === 'SELESAI' ? '1. Berhasil diwawancarai' : s.progressStatus === 'BELUM' ? '- Belum Diwawancara' : s.progressStatus),
    'Selesai?': isSampleBerhasil(s) ? 'YA' : 'BELUM',
    'Tanggal Pencacahan': s.tanggalCacah || '-',
    'Nama UTP': s.namaUTP,
    'Nama KRT': s.namaKRT,
    'Nama ART': s.namaART,
    'No Telepon': s.noTelp || '-',
    'Alamat': s.alamat,
    'Komoditas Prioritas': s.komoditasPrioritas,
    'Komoditas Usaha': s.komoditas,
    'Koordinat': s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : s.rawKoordinat,
    'NUS Pengganti': s.nusPengganti || s.nusPenggantiAwal || '-',
    'Catatan Lapangan': s.catatanPetugas || s.keteranganAwal || '-'
  }));

  const detailWorksheet = XLSX.utils.json_to_sheet(detailData);
  detailWorksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 18 }, // Petugas
    { wch: 18 }, // Provinsi
    { wch: 15 }, // Kabupaten
    { wch: 15 }, // Kecamatan
    { wch: 18 }, // Desa
    { wch: 25 }, // SLS
    { wch: 10 }, // NKS
    { wch: 8 },  // NUS
    { wch: 14 }, // Tipe
    { wch: 18 }, // Status
    { wch: 28 }, // Hasil Pendataan
    { wch: 10 }, // Selesai
    { wch: 16 }, // Tanggal
    { wch: 20 }, // Nama UTP
    { wch: 20 }, // Nama KRT
    { wch: 18 }, // ART
    { wch: 15 }, // Telp
    { wch: 24 }, // Alamat
    { wch: 18 }, // Komoditas Prioritas
    { wch: 30 }, // Komoditas
    { wch: 22 }, // Koordinat
    { wch: 14 }, // NUS Pengganti
    { wch: 28 }, // Catatan
  ];
  XLSX.utils.book_append_sheet(workbook, detailWorksheet, 'Data Sampel Monitoring');

  XLSX.writeFile(workbook, filename);
}

/**
 * Standalone export for only the Rekap Monitoring worksheet
 */
export function exportRekapOnlyToExcel(
  samples: SampleItem[],
  filename: string = 'Rekap_Monitoring_Petugas_SITASI_2026.xlsx'
): void {
  const workbook = XLSX.utils.book_new();
  const rekapWorksheet = createRekapWorksheet(samples);
  XLSX.utils.book_append_sheet(workbook, rekapWorksheet, 'Rekap Monitoring');
  XLSX.writeFile(workbook, filename);
}

/**
 * Standalone CSV export for Rekap Monitoring
 */
export function exportRekapToCSV(
  samples: SampleItem[],
  filename: string = 'Rekap_Monitoring_Petugas_SITASI_2026.csv'
): void {
  const rekap = calculateRekapMonitoring(samples);
  const rows = [
    [
      'No',
      'Nama Petugas',
      'Total Sampel Utama',
      'Jumlah Sampel Utama Berhasil Didata',
      'Sampel Utama Diganti (ke Sampel Cadangan)',
      'Sampel Cadangan yang Sudah Didata',
      'Total Sampel Yang Diolah',
      'Persentase Selesai'
    ]
  ];

  rekap.officers.forEach(o => {
    rows.push([
      String(o.no),
      o.namaPetugas,
      String(o.totalSampelUtama),
      String(o.utamaBerhasil),
      String(o.utamaDiganti),
      String(o.cadanganSudahDidata),
      String(o.totalDiolah),
      o.persentaseSelesaiText
    ]);
  });

  rows.push([
    '',
    'TOTAL KESELURUHAN',
    String(rekap.total.totalSampelUtama),
    String(rekap.total.utamaBerhasil),
    String(rekap.total.utamaDiganti),
    String(rekap.total.cadanganSudahDidata),
    String(rekap.total.totalDiolah),
    rekap.total.persentaseSelesaiText
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export raw sample records as CSV
 */
export function exportToCSV(samples: SampleItem[], filename: string = 'Monitoring_SITASI_2026.csv'): void {
  const exportData = samples.map((s, index) => ({
    'No': index + 1,
    'Petugas': s.petugas,
    'Desa': s.desa,
    'SLS': s.sls,
    'NKS': s.nks,
    'NUS': s.nus,
    'Tipe': s.statusSampel,
    'Status': s.progressStatus,
    'Hasil_Pendataan': s.hasilPendataanFasih || '',
    'Selesai': isSampleBerhasil(s) ? 'YA' : 'TIDAK',
    'TanggalCacah': s.tanggalCacah || '',
    'NamaUTP': s.namaUTP,
    'NamaKRT': s.namaKRT,
    'NoTelp': s.noTelp,
    'Alamat': s.alamat,
    'Komoditas': s.komoditas,
    'NUS_Pengganti': s.nusPengganti || '',
    'Catatan': s.catatanPetugas || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
