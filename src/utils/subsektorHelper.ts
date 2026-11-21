/**
 * Helper to determine agricultural subsector based on priority commodity and general commodities
 * Standard BPS Subsectors:
 * - Tanaman Pangan (Padi, Jagung, Kedelai, Ubi Kayu, Ubi Jalar, dll.)
 * - Hortikultura (Sayuran, Buah-buahan: Cabai, Bawang, Tomat, Jeruk, Jambu, Pisang, Nanas, dll.)
 * - Perkebunan (Kelapa Sawit, Karet, Kelapa, Pinang, Kopi, Kakao, Lada, Tebu, dll.)
 * - Peternakan (Sapi, Kambing, Ayam, Itik, Kelinci, Walet, dll.)
 * - Perikanan (Penangkapan Ikan, Budidaya Ikan Nila, Lele, Patin, Udang, dll.)
 * - Kehutanan (Tanaman Kayu-kayuan, Hasil Hutan Bukan Kayu)
 */

export const SUBSEKTOR_LIST = [
  'Tanaman Pangan',
  'Hortikultura',
  'Perkebunan',
  'Peternakan',
  'Perikanan',
  'Kehutanan',
] as const;

export type SubsektorType = typeof SUBSEKTOR_LIST[number];

/**
 * Extracts the effective "Komoditas Prioritas" according to SITASI BPS rules:
 * 1. Read "Komoditas Prioritas" column.
 * 2. If blank/empty/hyphen ("-"), use the FIRST commodity mentioned in "Komoditas/ Kegiatan Pertanian yang Diusahakan".
 */
export function getEffectiveKomoditasPrioritas(sample: {
  komoditasPrioritas?: string;
  komoditas?: string;
}): string {
  const kp = (sample.komoditasPrioritas || '').trim();

  // If "Komoditas Prioritas" is not empty and not just "-"
  if (kp && kp !== '-' && kp !== '0') {
    // If multiple priority commodities separated by ';' or ',', take the first one
    const firstPrio = kp.split(/[;,]/)[0].trim();
    if (firstPrio && firstPrio !== '-') {
      return firstPrio;
    }
  }

  // Fallback: If "Komoditas Prioritas" is blank/empty/hyphen,
  // take the FIRST commodity mentioned in "Komoditas/ Kegiatan Pertanian yang Diusahakan"
  const rawList = (sample.komoditas || '').trim();
  if (rawList && rawList !== '-') {
    const firstKomoditas = rawList.split(/[;,]/)[0].trim();
    if (firstKomoditas && firstKomoditas !== '-') {
      return firstKomoditas;
    }
  }

  return 'Tidak Ada Komoditas';
}

/**
 * Check if two commodities are identical or within the same main group
 */
export function areKomoditasEqual(komoditasA: string, komoditasB: string): boolean {
  if (!komoditasA || !komoditasB) return false;

  const clean = (str: string) => {
    return str
      .toUpperCase()
      .replace(/\b(INBRIDA|HIBRIDA|LAINNYA|BIASA|PUTIH|CITRA|PETELUR|POTONG|NONPOTONG|AIR TAWAR)\b/g, '')
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  };

  const a = clean(komoditasA);
  const b = clean(komoditasB);

  if (a === b) return true;
  if (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a))) return true;

  return false;
}

/**
 * Check if the replacement candidate has a DIFFERENT priority commodity from the primary sample.
 * Per user rule:
 * Only replacements with a DIFFERENT priority commodity should appear in the Berita Acara.
 * If they are equal/same, return false (do not include in Berita Acara).
 */
export function isDifferentKomoditasPrioritas(
  utama: { komoditasPrioritas?: string; komoditas?: string },
  cadangan: { komoditasPrioritas?: string; komoditas?: string }
): boolean {
  const prioUtama = getEffectiveKomoditasPrioritas(utama);
  const prioCadangan = getEffectiveKomoditasPrioritas(cadangan);

  return !areKomoditasEqual(prioUtama, prioCadangan);
}

/**
 * Detect subsector from priority commodity and commodity list
 */
export function detectSubsektor(komoditasPrioritas: string = '', komoditas: string = ''): string {
  // Use effective priority commodity as main indicator
  const effectivePrio = getEffectiveKomoditasPrioritas({
    komoditasPrioritas,
    komoditas,
  });

  const combined = `${effectivePrio} ${komoditasPrioritas} ${komoditas}`.toUpperCase();

  // Check Perkebunan first (Kelapa sawit, Karet, Pinang, Kelapa, Tebu, Kopi, Kakao, Lada)
  if (
    effectivePrio.toUpperCase().includes('KELAPA SAWIT') ||
    effectivePrio.toUpperCase().includes('KARET') ||
    effectivePrio.toUpperCase().includes('PINANG') ||
    effectivePrio.toUpperCase().includes('TEBU') ||
    effectivePrio.toUpperCase().includes('KOPI') ||
    effectivePrio.toUpperCase().includes('KAKAO') ||
    effectivePrio.toUpperCase().includes('LADA') ||
    effectivePrio.toUpperCase().includes('KELAPA')
  ) {
    return 'Perkebunan';
  }

  // Check Tanaman Pangan
  if (
    effectivePrio.toUpperCase().includes('PADI') ||
    effectivePrio.toUpperCase().includes('JAGUNG') ||
    effectivePrio.toUpperCase().includes('KEDELAI') ||
    effectivePrio.toUpperCase().includes('UBI') ||
    effectivePrio.toUpperCase().includes('KACANG TANAH') ||
    effectivePrio.toUpperCase().includes('KACANG HIJAU')
  ) {
    return 'Tanaman Pangan';
  }

  // Check Hortikultura
  if (
    effectivePrio.toUpperCase().includes('CABAI') ||
    effectivePrio.toUpperCase().includes('CABE') ||
    effectivePrio.toUpperCase().includes('JERUK') ||
    effectivePrio.toUpperCase().includes('JAMBU') ||
    effectivePrio.toUpperCase().includes('PISANG') ||
    effectivePrio.toUpperCase().includes('NENAS') ||
    effectivePrio.toUpperCase().includes('NANAS') ||
    effectivePrio.toUpperCase().includes('RAMBUTAN') ||
    effectivePrio.toUpperCase().includes('MANGGA') ||
    effectivePrio.toUpperCase().includes('PEPAYA') ||
    effectivePrio.toUpperCase().includes('TERUNG') ||
    effectivePrio.toUpperCase().includes('TOMAT') ||
    effectivePrio.toUpperCase().includes('OYONG') ||
    effectivePrio.toUpperCase().includes('PARIA') ||
    effectivePrio.toUpperCase().includes('PARE') ||
    effectivePrio.toUpperCase().includes('BAWANG') ||
    effectivePrio.toUpperCase().includes('LENGKUAS') ||
    effectivePrio.toUpperCase().includes('KACANG PANJANG') ||
    effectivePrio.toUpperCase().includes('KANGKUNG') ||
    effectivePrio.toUpperCase().includes('BAYAM') ||
    effectivePrio.toUpperCase().includes('SAWI')
  ) {
    return 'Hortikultura';
  }

  // Check Peternakan
  if (
    effectivePrio.toUpperCase().includes('AYAM') ||
    effectivePrio.toUpperCase().includes('SAPI') ||
    effectivePrio.toUpperCase().includes('KAMBING') ||
    effectivePrio.toUpperCase().includes('ITIK') ||
    effectivePrio.toUpperCase().includes('BEBEK') ||
    effectivePrio.toUpperCase().includes('WALET') ||
    effectivePrio.toUpperCase().includes('KELINCI') ||
    effectivePrio.toUpperCase().includes('MARMUT') ||
    effectivePrio.toUpperCase().includes('KERBAU') ||
    effectivePrio.toUpperCase().includes('DOMBA')
  ) {
    return 'Peternakan';
  }

  // Check Perikanan
  if (
    effectivePrio.toUpperCase().includes('IKAN') ||
    effectivePrio.toUpperCase().includes('PENANGKAPAN') ||
    effectivePrio.toUpperCase().includes('NILA') ||
    effectivePrio.toUpperCase().includes('LELE') ||
    effectivePrio.toUpperCase().includes('KOI') ||
    effectivePrio.toUpperCase().includes('PATIN') ||
    effectivePrio.toUpperCase().includes('GURAME') ||
    effectivePrio.toUpperCase().includes('UDANG')
  ) {
    return 'Perikanan';
  }

  // Fallback check on combined string
  if (combined.includes('PADI') || combined.includes('JAGUNG')) return 'Tanaman Pangan';
  if (combined.includes('SAWIT') || combined.includes('KARET') || combined.includes('KELAPA')) return 'Perkebunan';
  if (combined.includes('CABAI') || combined.includes('JERUK') || combined.includes('JAMBU')) return 'Hortikultura';
  if (combined.includes('SAPI') || combined.includes('KAMBING') || combined.includes('AYAM')) return 'Peternakan';
  if (combined.includes('IKAN')) return 'Perikanan';
  if (combined.includes('MATOA') || combined.includes('JATI')) return 'Kehutanan';

  return 'Tanaman Pangan';
}
