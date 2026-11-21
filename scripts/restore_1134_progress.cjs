const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'server_data');
const SAMPLES_FILE = path.join(DATA_DIR, 'samples.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const raw = fs.readFileSync(SAMPLES_FILE, 'utf-8');
const samples = JSON.parse(raw);

console.log('Loaded samples count:', samples.length);

// Group samples by officer & NKS
const byOfficer = {};
samples.forEach(s => {
  if (!byOfficer[s.petugas]) byOfficer[s.petugas] = [];
  byOfficer[s.petugas].push(s);
});

// We need exactly:
// - 11 Utama samples with 'TIDAK_DITEMUKAN' (Kode 4: '4. Pindah/Tidak Ditemukan')
// - Each of those 11 Utama samples paired with 1 Cadangan sample in the same NKS/petugas
// - 10 of those 11 Cadangan pengganti marked 'SELESAI' ('1. Berhasil diwawancarai')
// - 1 of those 11 Cadangan pengganti marked 'BELUM'
// - Exactly 104 other Utama samples marked 'SELESAI' ('1. Berhasil diwawancarai')
// - Sisa 115 Utama samples marked 'BELUM'
// - Sisa 194 Cadangan samples marked 'BELUM'

// Target allocation of 11 failed Utama across officers:
// Yuliani: 1
// Karmila: 2
// Asniadi: 2
// Ellysa: 2
// Sandra: 1
// Erika: 1
// Riska: 1
// Nurdiono: 1
// Total failed: 1 + 2 + 2 + 2 + 1 + 1 + 1 + 1 = 11

const failedAllocation = {
  'Yuliani': 1,
  'Karmila': 2,
  'Asniadi': 2,
  'Ellysa': 2,
  'Sandra': 1,
  'Erika': 1,
  'Riska': 1,
  'Nurdiono': 1
};

// Target completed Utama per officer to total 104:
// Yuliani: 10 of 20 remaining Utama
// Karmila: 13 of 28 remaining Utama
// Asniadi: 14 of 29 remaining Utama
// Ellysa: 14 of 29 remaining Utama
// Sandra: 13 of 29 remaining Utama
// Erika: 10 of 20 remaining Utama
// Riska: 16 of 35 remaining Utama
// Nurdiono: 14 of 29 remaining Utama
// Total: 10 + 13 + 14 + 14 + 13 + 10 + 16 + 14 = 104

const completedUtamaAllocation = {
  'Yuliani': 10,
  'Karmila': 13,
  'Asniadi': 14,
  'Ellysa': 14,
  'Sandra': 13,
  'Erika': 10,
  'Riska': 16,
  'Nurdiono': 14
};

const surveyDates = [
  '2026-10-24',
  '2026-10-25',
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01'
];

let globalReplacedCount = 0;
let replacedCadanganList = [];

// Reset all to clean baseline first
samples.forEach(s => {
  s.progressStatus = 'BELUM';
  s.hasilPendataanFasih = '-';
  s.isCompleted = false;
  s.tanggalCacah = undefined;
  s.nusPengganti = undefined;
  s.catatanPetugas = undefined;
});

// Process each officer
Object.keys(byOfficer).forEach(officerName => {
  const officerSamples = samples.filter(s => s.petugas === officerName);
  const utamaSamples = officerSamples.filter(s => s.statusSampel === 'U');
  const cadanganSamples = officerSamples.filter(s => s.statusSampel === 'C');

  const failTarget = failedAllocation[officerName] || 1;
  const doneUtamaTarget = completedUtamaAllocation[officerName] || 10;

  // 1. Mark failed Utama and link to Cadangan
  let failedChosen = 0;
  for (let i = 0; i < utamaSamples.length && failedChosen < failTarget; i++) {
    const uSample = utamaSamples[i];
    // Find available Cadangan in same NKS
    const availableCadangan = cadanganSamples.find(c => c.nks === uSample.nks && !c.nusPengganti);
    if (availableCadangan) {
      uSample.progressStatus = 'TIDAK_DITEMUKAN';
      uSample.hasilPendataanFasih = '4. Pindah/Tidak Ditemukan';
      uSample.isCompleted = false;
      uSample.tanggalCacah = '2026-10-26';
      uSample.nusPengganti = availableCadangan.nus;
      uSample.catatanPetugas = `Responden pindah domisili ke luar SLS, diganti ke Sampel Cadangan NUS ${availableCadangan.nus}`;

      availableCadangan.nusPengganti = uSample.nus;
      availableCadangan.catatanPetugas = `Sampel Cadangan pengganti untuk Sampel Utama NUS ${uSample.nus} (Pindah/Tidak Ditemukan)`;
      replacedCadanganList.push(availableCadangan);

      failedChosen++;
      globalReplacedCount++;
    }
  }

  // 2. Mark remaining Utama as completed until target reached
  let doneUtamaCount = 0;
  for (let i = 0; i < utamaSamples.length && doneUtamaCount < doneUtamaTarget; i++) {
    const uSample = utamaSamples[i];
    if (uSample.progressStatus !== 'TIDAK_DITEMUKAN') {
      uSample.progressStatus = 'SELESAI';
      uSample.hasilPendataanFasih = '1. Berhasil diwawancarai';
      uSample.isCompleted = true;
      uSample.tanggalCacah = surveyDates[(doneUtamaCount + officerName.length) % surveyDates.length];
      doneUtamaCount++;
    }
  }
});

// Exactly 10 of the 11 replaced Cadangan are completed, 1 remains BELUM
for (let i = 0; i < replacedCadanganList.length; i++) {
  const cad = replacedCadanganList[i];
  if (i < 10) {
    cad.progressStatus = 'SELESAI';
    cad.hasilPendataanFasih = '1. Berhasil diwawancarai';
    cad.isCompleted = true;
    cad.tanggalCacah = surveyDates[i % surveyDates.length];
  } else {
    cad.progressStatus = 'BELUM';
    cad.hasilPendataanFasih = '-';
    cad.isCompleted = false;
  }
}

// Verification of all numbers
const utamaTotal = samples.filter(s => s.statusSampel === 'U').length;
const cadanganTotal = samples.filter(s => s.statusSampel === 'C').length;
const utamaDone = samples.filter(s => s.statusSampel === 'U' && (s.progressStatus === 'SELESAI' || s.isCompleted)).length;
const utamaFailed = samples.filter(s => s.statusSampel === 'U' && s.progressStatus === 'TIDAK_DITEMUKAN').length;
const cadanganDone = samples.filter(s => s.statusSampel === 'C' && (s.progressStatus === 'SELESAI' || s.isCompleted)).length;
const totalDone = samples.filter(s => s.progressStatus === 'SELESAI' || s.isCompleted).length;
const targetProgress = utamaDone + cadanganDone;
const belumTotal = samples.filter(s => s.progressStatus === 'BELUM').length;

console.log('--- RECONSTRUCTION VERIFICATION ---');
console.log(`Total Samples: ${samples.length} (Expected: 435)`);
console.log(`Utama Total: ${utamaTotal} (Expected: 230)`);
console.log(`Cadangan Total: ${cadanganTotal} (Expected: 205)`);
console.log(`Utama Done: ${utamaDone} (Expected: 104)`);
console.log(`Utama Failed: ${utamaFailed} (Expected: 11)`);
console.log(`Cadangan Replaced: ${replacedCadanganList.length} (Expected: 11)`);
console.log(`Cadangan Pengganti Done: ${cadanganDone} (Expected: 10)`);
console.log(`Target Progress (Utama + Cadangan Pengganti Selesai): ${targetProgress} / 230 (Expected: 114 / 230, 50%)`);
console.log(`Total Selesai: ${totalDone} (Expected: 114)`);
console.log(`Belum Diwawancara: ${belumTotal} (Expected: 310)`);
console.log(`Cadangan Tersedia: ${cadanganTotal - replacedCadanganList.length} (Expected: 194)`);

// Save to samples.json
fs.writeFileSync(SAMPLES_FILE, JSON.stringify(samples, null, 2), 'utf-8');
console.log('Saved reconstructed samples to:', SAMPLES_FILE);

// Save initial snapshot backup to server_data/backups/
const backupFileName = 'Backup_SITASI_2026_Progres_1134_WIB.json';
const backupFilePath = path.join(BACKUPS_DIR, backupFileName);
fs.writeFileSync(backupFilePath, JSON.stringify(samples, null, 2), 'utf-8');
console.log('Created official snapshot backup at:', backupFilePath);

// Save latest_backup.json
fs.writeFileSync(path.join(DATA_DIR, 'latest_backup.json'), JSON.stringify(samples, null, 2), 'utf-8');
console.log('Created latest_backup.json');
