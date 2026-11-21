export interface BeritaAcaraRow {
  id: string;
  no: number;
  // Sampel Utama
  utamaNks: string;
  utamaNus: string;
  utamaNamaKrt: string;
  utamaSubsektor: string;
  utamaKomoditasPrioritas?: string;
  // Sampel Pengganti (Cadangan)
  penggantiNks: string;
  penggantiNus: string;
  penggantiNamaKrt: string;
  penggantiSubsektor: string;
  penggantiKomoditasPrioritas?: string;
  // Alasan penggantian (opsional)
  alasan?: string;
}

export interface BeritaAcaraData {
  nomorSurat?: string;
  judulBeritaAcara?: string;
  paragrafPembuka?: string;
  paragrafPenutup?: string;
  provinsiKode: string;
  provinsiNama: string;
  kabupatenKode: string;
  kabupatenNama: string;
  tahun: string;
  tahapanPenggantianText: string; // "4 (empat) tahapan"
  tempat: string; // "Sungai Raya"
  tanggal: string; // "23 Oktober 2026"
  pejabatNama: string; // "Mochamad Su'udi, SST, M.E"
  pejabatNip: string; // "19731208 199512 1 002"
  pejabatJabatan: string; // "Kepala BPS Kabupaten Kubu Raya"
  rows: BeritaAcaraRow[];
}
