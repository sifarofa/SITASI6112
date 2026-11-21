import * as XLSX from 'xlsx';
import { 
  SampleItem, 
  SampleStatusType, 
  mapFasihToSurveyStatus, 
  isFasihBerhasil 
} from '../types/sitasi';

/**
 * Standard CSV row parser handling quotes, semicolons, commas, and embedded newlines
 */
export function parseCSV(text: string, defaultDelimiter?: string): string[][] {
  const delimiter = defaultDelimiter || (text.includes(';') ? ';' : ',');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentCell.trim());
      // Only push non-empty rows
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Extract coordinates from cell text
 */
export function parseCoordinates(raw: string): { lat: number | null; lng: number | null } {
  if (!raw) return { lat: null, lng: null };

  const latMatch = raw.match(/latitude:\s*(-?[\d.]+)/i);
  const lngMatch = raw.match(/longitude:\s*(-?[\d.]+)/i);

  const lat = latMatch ? parseFloat(latMatch[1]) : null;
  const lng = lngMatch ? parseFloat(lngMatch[1]) : null;

  return { lat, lng };
}

/**
 * Extract KRT, ART, and Phone number
 */
export function parseKrtArtTelp(raw: string): { namaKRT: string; namaART: string; noTelp: string } {
  if (!raw) return { namaKRT: '-', namaART: '-', noTelp: '' };
  
  const parts = raw.split('/').map(p => p.trim());
  const namaKRT = parts[0] || '-';
  const namaART = parts[1] || '-';
  let noTelp = parts[2] || '';

  if (noTelp === '0' || noTelp === '-' || noTelp.length < 5) {
    noTelp = '';
  }

  return { namaKRT, namaART, noTelp };
}

/**
 * Extract petugas name from filename
 * e.g., "Sampel_SITASI_2026_-_Erika_b0fbe93c.csv" -> "Erika"
 */
export function extractPetugasFromFilename(filename: string): string {
  const cleanName = filename.replace(/\.(csv|xlsx|xls)$/i, '');
  
  // Try pattern: Sampel... - Name or Sampel..._Name
  const match = cleanName.match(/(?:sampel|sitasi).*?[-_]\s*([A-Za-z\s]+?)(?:_[a-f0-9]{6,})?$/i);
  if (match && match[1]) {
    const candidate = match[1].trim();
    if (candidate && !['2026', 'ds', 'utp', 'final', 'revisi'].includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  // Fallback to simple split
  const parts = cleanName.split(/[-_]/).filter(p => p.trim().length > 0);
  if (parts.length > 1) {
    const last = parts[parts.length - 1].trim();
    if (isNaN(Number(last)) && last.length > 2 && !/^[a-f0-9]{8}$/i.test(last)) {
      return last;
    }
    const secondLast = parts[parts.length - 2]?.trim();
    if (secondLast && isNaN(Number(secondLast))) {
      return secondLast;
    }
  }

  return 'Petugas Lapangan';
}

/**
 * Parse SITASI Table structure (either from DS-UTP template or FASIH-SM web export)
 */
export function parseSitasiData(rows: string[][], petugasDefault: string = 'Erika'): SampleItem[] {
  let provinsi = 'KALIMANTAN BARAT';
  let kabupaten = 'KUBU RAYA';
  let currentKecamatan = 'RASAU JAYA';

  const samples: SampleItem[] = [];

  // 1. Detect if this is a direct FASIH-SM table export (starts with "Utama" / "Cadangan" or has "Hasil Pendataan" header)
  const isFasihSmTable = rows.some(r => {
    const c0 = (r[0] || '').toLowerCase().trim();
    return c0 === 'utama' || c0 === 'cadangan' || r.some(cell => cell.toLowerCase().includes('hasil pendataan'));
  });

  if (isFasihSmTable) {
    let nusCounter = 1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const col0 = (row[0] || '').trim();
      const col0Lower = col0.toLowerCase();

      // Skip table header row if present
      if (col0Lower.includes('tipe') || col0Lower.includes('sample') || row.some(c => c.toLowerCase().includes('hasil pendataan'))) {
        continue;
      }

      if (col0Lower === 'utama' || col0Lower === 'cadangan') {
        const statusSampel: SampleStatusType = col0Lower === 'cadangan' ? 'C' : 'U';
        const krtRaw = row[1] || '';
        const namaUTP = row[2] || '-';
        const sls = row[3] || '-';
        const komoditas = row[4] || '-';
        const komoditasPrioritas = row[5] || '-';
        const hasilPendataanRaw = (row[6] || '').trim();
        const statusDokumenRaw = (row[7] || '').trim();
        const petugasCell = row[9] || '';

        // Extract petugas name if available (e.g. "supernaya.15@gmail.com (Pencacah)" -> "supernaya" or use default)
        let petugas = petugasDefault;
        if (petugasCell) {
          const match = petugasCell.match(/([a-zA-Z0-9._-]+)(?:@|\s*\(|\s*$)/);
          if (match && match[1] && !['pencacah', 'pengawas'].includes(match[1].toLowerCase())) {
            petugas = match[1];
          }
        }

        const { namaKRT, namaART, noTelp } = parseKrtArtTelp(krtRaw);
        const nus = String(nusCounter++).padStart(3, '0');
        const nks = '1500015'; // Default or extracted

        const isDone = isFasihBerhasil(hasilPendataanRaw);
        const mappedStatus = mapFasihToSurveyStatus(hasilPendataanRaw);

        samples.push({
          id: `${nks}_${nus}`,
          petugas,
          provinsi,
          kabupaten,
          kecamatan: currentKecamatan,
          desa: sls.split(/\s+/)[0] || 'DESA SITASI',
          sls,
          nks,
          nus,
          komoditas,
          komoditasPrioritas,
          namaKRT,
          namaART,
          noTelp,
          namaUTP: namaUTP || namaKRT,
          alamat: sls,
          rawKoordinat: '',
          latitude: null,
          longitude: null,
          statusSampel,
          keteranganAwal: '',
          nusPenggantiAwal: '',
          progressStatus: mappedStatus,
          isCompleted: isDone,
          tanggalCacah: isDone ? new Date().toISOString().split('T')[0] : undefined,
          hasilPendataanFasih: hasilPendataanRaw || (isDone ? '1. Berhasil diwawancarai' : '-'),
          statusDokumenFasih: statusDokumenRaw || (isDone ? 'APPROVED BY PENGAWAS' : 'DRAFT'),
          akunFasih: petugasCell || undefined,
        });
      }
    }

    if (samples.length > 0) {
      return samples;
    }
  }

  // 2. Standard SITASI DS-UTP template parser
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = row[0] || '';
    const col1 = row[1] || '';

    // Metadata extraction
    if (col0.toLowerCase().includes('provinsi') && col1) {
      provinsi = col1.replace(/^\[\d+\]\s*/, '').trim();
      continue;
    }
    if (col0.toLowerCase().includes('kabupaten') && col1) {
      kabupaten = col1.replace(/^\[\d+\]\s*/, '').trim();
      continue;
    }

    // Kecamatan row detection (e.g. "[060] RASAU JAYA;;;;")
    if (col0.startsWith('[') && !row[2] && !row[3] && !row[4]) {
      currentKecamatan = col0.replace(/^\[\d+\]\s*/, '').trim();
      continue;
    }

    // Check if this row is a data row with NUS (Nomor Urut Sampel)
    // In the template, NKS is column 2 (index 2) and NUS is column 3 (index 3)
    const nksCandidate = (row[2] || '').trim();
    const nusCandidate = (row[3] || '').trim();

    // Check if nusCandidate is a valid number
    if (/^\d+$/.test(nusCandidate) && nksCandidate) {
      const desaRaw = row[0] || '';
      const slsRaw = row[1] || '';
      const komoditas = row[4] || '-';
      const komoditasPrioritas = row[5] || '-';
      const krtRaw = row[6] || '';
      const namaUTP = row[7] || '-';
      const alamat = row[8] || '-';
      const rawKoordinat = row[9] || '';
      const statusSampelRaw = (row[10] || '').trim().toUpperCase();
      const keteranganAwal = row[11] || '';
      const nusPenggantiAwal = row[12] || '';

      const { lat, lng } = parseCoordinates(rawKoordinat);
      const { namaKRT, namaART, noTelp } = parseKrtArtTelp(krtRaw);

      const statusSampel: SampleStatusType = statusSampelRaw === 'C' ? 'C' : 'U';
      const desa = desaRaw.replace(/^\[\d+\]\s*/, '').trim() || desaRaw;
      const sls = slsRaw.replace(/^\[\d+\]\s*/, '').trim() || slsRaw;

      // Detect if FASIH-SM Hasil Pendataan is present in subsequent columns or in keterangan
      let hasilFasih = '-';
      for (let c = 10; c < row.length; c++) {
        const val = row[c] || '';
        if (isFasihBerhasil(val)) {
          hasilFasih = '1. Berhasil diwawancarai';
          break;
        } else if (val.toLowerCase().includes('menolak') || val.startsWith('2.')) {
          hasilFasih = '2. Responden menolak';
          break;
        } else if (val.toLowerCase().includes('pindah') || val.toLowerCase().includes('tidak ditemukan')) {
          hasilFasih = '4. Pindah/Tidak Ditemukan';
          break;
        } else if (val.toLowerCase().includes('bukan') || val.toLowerCase().includes('alih fungsi')) {
          hasilFasih = '5. Bukan Usaha Pertanian Lagi';
          break;
        }
      }

      const isDone = isFasihBerhasil(hasilFasih);
      const mappedStatus = mapFasihToSurveyStatus(hasilFasih);

      const item: SampleItem = {
        id: `${nksCandidate}_${nusCandidate}`,
        petugas: petugasDefault,
        provinsi,
        kabupaten,
        kecamatan: currentKecamatan,
        desa,
        sls,
        nks: nksCandidate,
        nus: nusCandidate,
        komoditas,
        komoditasPrioritas,
        namaKRT,
        namaART,
        noTelp,
        namaUTP: namaUTP || namaKRT,
        alamat,
        rawKoordinat,
        latitude: lat,
        longitude: lng,
        statusSampel,
        keteranganAwal,
        nusPenggantiAwal,
        progressStatus: mappedStatus,
        isCompleted: isDone,
        tanggalCacah: isDone ? new Date().toISOString().split('T')[0] : undefined,
        hasilPendataanFasih: hasilFasih,
        statusDokumenFasih: isDone ? 'APPROVED BY PENGAWAS' : 'DRAFT',
      };

      samples.push(item);
    }
  }

  return samples;
}

/**
 * Parse an Excel file (ArrayBuffer) into string[][] matrix
 */
export function parseExcelFile(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });
  return data.map(row => (Array.isArray(row) ? row.map(cell => String(cell || '').trim()) : []));
}
