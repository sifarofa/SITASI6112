/**
 * Utilitas Manajemen Zona Waktu SITASI 2026
 * 
 * Default: Waktu Indonesia Barat (WIB / Asia/Jakarta / Asia/Pontianak / UTC+7).
 * Jika pengguna mengakses dari zona waktu yang berbeda (misalnya WITA, WIT, atau zona internasional),
 * sistem akan menampilkan WIB sebagai standar utama, disertai waktu lokal perangkat pengguna.
 */

export interface FormattedTimeResult {
  primaryWIB: string;        // e.g. "11:34:10 WIB"
  localTime: string;         // e.g. "12:34:10 WITA" atau "21:34:10 PDT"
  displayFull: string;       // e.g. "11:34:10 WIB" atau "11:34:10 WIB (Lokal: 12:34:10 WITA)"
  timeZoneName: string;      // Nama zona waktu lokal user
  isDifferentZone: boolean;  // Apakah zona waktu user berbeda dari WIB (UTC+7)
  isoString: string;
}

export function formatDateTimeZone(dateInput?: string | Date | number): FormattedTimeResult {
  const date = dateInput ? new Date(dateInput) : new Date();
  
  // Format Standar Default: WIB (Asia/Jakarta / UTC+7)
  let wibTime = '';
  try {
    const wibFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    wibTime = `${wibFormatter.format(date)} WIB`;
  } catch {
    // Fallback if Intl timeZone fails
    const pad = (n: number) => String(n).padStart(2, '0');
    // Calculate UTC+7 manually
    const utcHours = date.getUTCHours();
    const wibHours = (utcHours + 7) % 24;
    wibTime = `${pad(wibHours)}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} WIB`;
  }

  // Format Waktu Lokal Perangkat Pengguna
  let userTimeZone = '';
  let localTime = '';
  let isDifferentZone = false;

  try {
    userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    
    // Check if user's timezone offset is equal to UTC+7 (-420 minutes in getTimezoneOffset)
    const userOffset = date.getTimezoneOffset(); // -420 for UTC+7
    isDifferentZone = userOffset !== -420;

    const localFormatter = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    });
    localTime = localFormatter.format(date);
  } catch {
    localTime = wibTime;
    isDifferentZone = false;
  }

  // Generate string tampilan yang ramah
  let displayFull = wibTime;
  if (isDifferentZone && localTime) {
    displayFull = `${wibTime} (${localTime})`;
  }

  return {
    primaryWIB: wibTime,
    localTime,
    displayFull,
    timeZoneName: userTimeZone,
    isDifferentZone,
    isoString: date.toISOString()
  };
}

/**
 * Format ringkas waktu untuk status bar atau tombol
 * Contoh: "11:34 WIB" atau "11:34 WIB / 12:34 WITA"
 */
export function formatShortTimeZone(dateInput?: string | Date | number): string {
  const res = formatDateTimeZone(dateInput);
  return res.displayFull;
}
