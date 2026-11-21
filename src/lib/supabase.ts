import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  SampleItem,
  SampleStatusType,
  SurveyProgressStatus,
} from '../types/sitasi';

export const SUPABASE_SAMPLES_TABLE = 'sitasi_samples';
export const SUPABASE_UPSERT_BATCH_SIZE = 500;

const rawEnvUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawEnvAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  if (/^MY_|your[-_]?supabase/i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidAnonKey(value: string): boolean {
  if (!value) return false;
  if (/^MY_|your[-_]?anon/i.test(value)) return false;
  return value.length >= 16;
}

function buildConfigErrorMessage(url: string, key: string): string | null {
  const validUrl = isValidHttpUrl(url);
  const validKey = isValidAnonKey(key);
  if (validUrl && validKey) return null;
  if (!url && !key) {
    return 'Environment variable VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi.';
  }
  if (!validUrl) {
    return 'VITE_SUPABASE_URL belum valid (harus berupa URL https://... proyek Supabase Anda).';
  }
  return 'VITE_SUPABASE_ANON_KEY belum diisi atau tidak valid.';
}

let activeUrl = rawEnvUrl;
let activeAnonKey = rawEnvAnonKey;
let runtimeConfigured = isValidHttpUrl(activeUrl) && isValidAnonKey(activeAnonKey);

export let isSupabaseConfigured = runtimeConfigured;

export let supabaseConfigStatus = {
  configured: runtimeConfigured,
  hasUrl: isValidHttpUrl(activeUrl),
  hasKey: isValidAnonKey(activeAnonKey),
  errorMessage: buildConfigErrorMessage(activeUrl, activeAnonKey),
};

let activeClient: SupabaseClient | null = runtimeConfigured
  ? createClient(activeUrl, activeAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export let supabase: SupabaseClient | null = activeClient;

export function getSupabaseClient(): SupabaseClient | null {
  return activeClient;
}

export function getIsSupabaseConfigured(): boolean {
  return runtimeConfigured && activeClient !== null;
}

export function getSupabaseConfigStatus() {
  return {
    configured: runtimeConfigured,
    hasUrl: isValidHttpUrl(activeUrl),
    hasKey: isValidAnonKey(activeAnonKey),
    errorMessage: buildConfigErrorMessage(activeUrl, activeAnonKey),
  };
}

/**
 * Fallback runtime configuration loader:
 * Jika VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ditambahkan melalui panel Secrets atau .env
 * setelah Vite build, aplikasi tetap dapat mengambil konfigurasi publik secara runtime dari server.
 */
export async function initSupabaseRuntimeConfig(): Promise<boolean> {
  if (runtimeConfigured && activeClient) {
    return true;
  }

  try {
    const res = await fetch(`/api/supabase-public-config?_t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const json = await res.json();
    const url = String(json?.url || '').trim();
    const anonKey = String(json?.anonKey || '').trim();

    if (json?.configured && isValidHttpUrl(url) && isValidAnonKey(anonKey)) {
      activeUrl = url;
      activeAnonKey = anonKey;
      runtimeConfigured = true;
      activeClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      supabase = activeClient;
      isSupabaseConfigured = true;
      supabaseConfigStatus = {
        configured: true,
        hasUrl: true,
        hasKey: true,
        errorMessage: null,
      };
      return true;
    }
  } catch {
    // Ignore network errors during runtime config probe
  }

  return false;
}

export interface SitasiSampleRow {
  id: string;
  petugas: string;
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  sls: string;
  nks: string;
  nus: string;
  status_sampel: SampleStatusType;
  komoditas: string;
  komoditas_prioritas: string;
  nama_krt: string;
  nama_art: string;
  no_telp: string;
  nama_utp: string;
  alamat: string;
  raw_koordinat: string;
  latitude: number | null;
  longitude: number | null;
  keterangan_awal: string;
  nus_pengganti_awal: string;
  progress_status: SurveyProgressStatus;
  is_completed: boolean;
  tanggal_cacah: string | null;
  catatan_petugas: string | null;
  nus_pengganti: string | null;
  pencacah_nama: string | null;
  hasil_pendataan_fasih: string;
  status_dokumen_fasih: string;
  akun_fasih: string | null;
  updated_at?: string;
}

export interface SupabaseSyncProgress {
  currentBatch: number;
  totalBatches: number;
  syncedRows: number;
  totalRows: number;
  percentage: number;
}

export interface SupabaseSyncResult<T = unknown> {
  success: boolean;
  data?: T;
  syncedCount?: number;
  updatedAt?: string;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
}

export function formatSupabaseError(error: PostgrestError | Error | unknown): {
  message: string;
  code?: string;
  details?: string;
} {
  if (!error) {
    return { message: 'Terjadi kesalahan tidak dikenal pada Supabase.' };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const pgErr = error as Partial<PostgrestError> & { message: string };
    const code = pgErr.code ? String(pgErr.code) : undefined;
    const detailParts: string[] = [];

    if (pgErr.details) detailParts.push(`Detail: ${pgErr.details}`);
    if (pgErr.hint) detailParts.push(`Saran: ${pgErr.hint}`);

    let friendlyPrefix = '';
    if (code === '42P01' || pgErr.message.includes('does not exist') || pgErr.message.includes('schema cache')) {
      friendlyPrefix =
        'Tabel "sitasi_samples" belum ditemukan di Supabase. Jalankan skrip supabase_schema.sql di SQL Editor Supabase terlebih dahulu. ';
    } else if (code === '42703' || pgErr.message.includes('column')) {
      friendlyPrefix =
        'Terdapat ketidaksesuaian kolom pada tabel Supabase. Pastikan struktur tabel sesuai supabase_schema.sql. ';
    } else if (code === '42501' || pgErr.message.toLowerCase().includes('row-level security')) {
      friendlyPrefix =
        'Akses ditolak oleh kebijakan Row Level Security (RLS) Supabase. Jalankan kebijakan RLS pada supabase_schema.sql. ';
    }

    const fullMsg = `${friendlyPrefix}${pgErr.message}${
      detailParts.length > 0 ? ` (${detailParts.join(' | ')})` : ''
    }`;

    return {
      message: fullMsg.trim(),
      code,
      details: detailParts.join(' | ') || undefined,
    };
  }

  return { message: String(error) };
}

export function mapSampleToRow(sample: SampleItem): SitasiSampleRow {
  const cleanNks = String(sample.nks || '').trim() || '0000000';
  const cleanNus = String(sample.nus || '').trim() || '0';
  const cleanId = String(sample.id || `${cleanNks}_${cleanNus}`).trim();

  const statusSampel: SampleStatusType = sample.statusSampel === 'C' ? 'C' : 'U';
  const validStatuses: SurveyProgressStatus[] = [
    'SELESAI',
    'BELUM',
    'MENOLAK',
    'TIDAK_DITEMUKAN',
    'NON_AKTIF',
  ];
  const progressStatus: SurveyProgressStatus = validStatuses.includes(sample.progressStatus)
    ? sample.progressStatus
    : sample.isCompleted
    ? 'SELESAI'
    : 'BELUM';

  return {
    id: cleanId,
    petugas: String(sample.petugas || 'Petugas Lapangan').trim(),
    provinsi: String(sample.provinsi || 'KALIMANTAN BARAT').trim(),
    kabupaten: String(sample.kabupaten || 'KUBU RAYA').trim(),
    kecamatan: String(sample.kecamatan || '').trim(),
    desa: String(sample.desa || '').trim(),
    sls: String(sample.sls || '').trim(),
    nks: cleanNks,
    nus: cleanNus,
    status_sampel: statusSampel,
    komoditas: String(sample.komoditas || '-').trim(),
    komoditas_prioritas: String(sample.komoditasPrioritas || '-').trim(),
    nama_krt: String(sample.namaKRT || '-').trim(),
    nama_art: String(sample.namaART || '-').trim(),
    no_telp: String(sample.noTelp || '').trim(),
    nama_utp: String(sample.namaUTP || sample.namaKRT || '-').trim(),
    alamat: String(sample.alamat || '-').trim(),
    raw_koordinat: String(sample.rawKoordinat || '').trim(),
    latitude: typeof sample.latitude === 'number' && Number.isFinite(sample.latitude) ? sample.latitude : null,
    longitude: typeof sample.longitude === 'number' && Number.isFinite(sample.longitude) ? sample.longitude : null,
    keterangan_awal: String(sample.keteranganAwal || '').trim(),
    nus_pengganti_awal: String(sample.nusPenggantiAwal || '').trim(),
    progress_status: progressStatus,
    is_completed: Boolean(sample.isCompleted || progressStatus === 'SELESAI'),
    tanggal_cacah: sample.tanggalCacah ? String(sample.tanggalCacah).trim() : null,
    catatan_petugas: sample.catatanPetugas ? String(sample.catatanPetugas).trim() : null,
    nus_pengganti: sample.nusPengganti ? String(sample.nusPengganti).trim() : null,
    pencacah_nama: sample.pencacahNama ? String(sample.pencacahNama).trim() : null,
    hasil_pendataan_fasih: String(sample.hasilPendataanFasih || '-').trim(),
    status_dokumen_fasih: String(sample.statusDokumenFasih || 'DRAFT').trim(),
    akun_fasih: sample.akunFasih ? String(sample.akunFasih).trim() : null,
    updated_at: sample.updatedAt || new Date().toISOString(),
  };
}

export function mapRowToSample(row: SitasiSampleRow): SampleItem {
  return {
    id: row.id,
    petugas: row.petugas || 'Petugas Lapangan',
    provinsi: row.provinsi || 'KALIMANTAN BARAT',
    kabupaten: row.kabupaten || 'KUBU RAYA',
    kecamatan: row.kecamatan || '',
    desa: row.desa || '',
    sls: row.sls || '',
    nks: row.nks,
    nus: row.nus,
    komoditas: row.komoditas || '-',
    komoditasPrioritas: row.komoditas_prioritas || '-',
    namaKRT: row.nama_krt || '-',
    namaART: row.nama_art || '-',
    noTelp: row.no_telp || '',
    namaUTP: row.nama_utp || '-',
    alamat: row.alamat || '-',
    rawKoordinat: row.raw_koordinat || '',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    statusSampel: row.status_sampel === 'C' ? 'C' : 'U',
    keteranganAwal: row.keterangan_awal || '',
    nusPenggantiAwal: row.nus_pengganti_awal || '',
    progressStatus: row.progress_status || 'BELUM',
    isCompleted: Boolean(row.is_completed),
    tanggalCacah: row.tanggal_cacah || undefined,
    catatanPetugas: row.catatan_petugas || undefined,
    nusPengganti: row.nus_pengganti || undefined,
    pencacahNama: row.pencacah_nama || undefined,
    hasilPendataanFasih: row.hasil_pendataan_fasih || '-',
    statusDokumenFasih: row.status_dokumen_fasih || 'DRAFT',
    akunFasih: row.akun_fasih || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

/**
 * Deduplicate samples by primary key `id` and `(nks, nus)` pair so
 * PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` never receives duplicate keys in one batch.
 */
export function deduplicateSamplesForUpsert(samples: SampleItem[]): SampleItem[] {
  const byId = new Map<string, SampleItem>();
  const byNksNus = new Map<string, string>();

  for (const sample of samples) {
    const rowId = String(sample.id || `${sample.nks}_${sample.nus}`).trim();
    const nksNusKey = `${String(sample.nks || '').trim()}__${String(sample.nus || '').trim()}`;

    const previousId = byNksNus.get(nksNusKey);
    if (previousId && previousId !== rowId) {
      byId.delete(previousId);
    }

    byNksNus.set(nksNusKey, rowId);
    byId.set(rowId, { ...sample, id: rowId });
  }

  return Array.from(byId.values());
}

/**
 * Fetch all samples from Supabase (handles >1000 rows via paged SELECT queries)
 */
export async function fetchSamplesFromSupabase(): Promise<SupabaseSyncResult<SampleItem[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: getSupabaseConfigStatus().errorMessage || 'Supabase belum dikonfigurasi.',
    };
  }

  try {
    const PAGE_SIZE = 1000;
    const allRows: SitasiSampleRow[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await client
        .from(SUPABASE_SAMPLES_TABLE)
        .select('*')
        .order('nks', { ascending: true })
        .order('nus', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        const formatted = formatSupabaseError(error);
        return {
          success: false,
          error: formatted.message,
          errorCode: formatted.code,
          errorDetails: formatted.details,
        };
      }

      if (!data || data.length === 0) {
        break;
      }

      allRows.push(...(data as SitasiSampleRow[]));

      if (data.length < PAGE_SIZE) {
        break;
      }

      from += PAGE_SIZE;
    }

    const mapped = allRows.map(mapRowToSample);

    let latestUpdatedAt: string | undefined;
    for (const row of allRows) {
      if (row.updated_at) {
        if (!latestUpdatedAt || new Date(row.updated_at).getTime() > new Date(latestUpdatedAt).getTime()) {
          latestUpdatedAt = row.updated_at;
        }
      }
    }

    return {
      success: true,
      data: mapped,
      syncedCount: mapped.length,
      updatedAt: latestUpdatedAt,
    };
  } catch (err) {
    const formatted = formatSupabaseError(err);
    return {
      success: false,
      error: formatted.message,
      errorCode: formatted.code,
      errorDetails: formatted.details,
    };
  }
}

/**
 * Batch upsert samples to Supabase (max 500 rows per request)
 */
export async function upsertSamplesBatchToSupabase(
  samples: SampleItem[],
  onProgress?: (progress: SupabaseSyncProgress) => void
): Promise<SupabaseSyncResult<SampleItem[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: getSupabaseConfigStatus().errorMessage || 'Supabase belum dikonfigurasi.',
    };
  }

  const deduped = deduplicateSamplesForUpsert(samples);
  const totalRows = deduped.length;

  if (totalRows === 0) {
    return {
      success: true,
      data: [],
      syncedCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const totalBatches = Math.ceil(totalRows / SUPABASE_UPSERT_BATCH_SIZE);
  let syncedRows = 0;

  try {
    for (let i = 0; i < totalBatches; i++) {
      const start = i * SUPABASE_UPSERT_BATCH_SIZE;
      const chunk = deduped.slice(start, start + SUPABASE_UPSERT_BATCH_SIZE);
      const rows = chunk.map(mapSampleToRow);

      const { error } = await client
        .from(SUPABASE_SAMPLES_TABLE)
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        const formatted = formatSupabaseError(error);
        return {
          success: false,
          syncedCount: syncedRows,
          error: `Batch ${i + 1}/${totalBatches} gagal: ${formatted.message}`,
          errorCode: formatted.code,
          errorDetails: formatted.details,
        };
      }

      syncedRows += chunk.length;
      if (onProgress) {
        onProgress({
          currentBatch: i + 1,
          totalBatches,
          syncedRows,
          totalRows,
          percentage: Math.round((syncedRows / totalRows) * 100),
        });
      }
    }

    return {
      success: true,
      data: deduped,
      syncedCount: syncedRows,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const formatted = formatSupabaseError(err);
    return {
      success: false,
      syncedCount: syncedRows,
      error: formatted.message,
      errorCode: formatted.code,
      errorDetails: formatted.details,
    };
  }
}

/**
 * Delete specific sample IDs from Supabase in chunks of 500
 */
export async function deleteSamplesFromSupabase(
  ids: string[]
): Promise<SupabaseSyncResult<number>> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: getSupabaseConfigStatus().errorMessage || 'Supabase belum dikonfigurasi.',
    };
  }

  const cleanIds = Array.from(new Set(ids.map(id => String(id).trim()).filter(Boolean)));
  if (cleanIds.length === 0) {
    return { success: true, data: 0, syncedCount: 0 };
  }

  try {
    for (let i = 0; i < cleanIds.length; i += SUPABASE_UPSERT_BATCH_SIZE) {
      const chunk = cleanIds.slice(i, i + SUPABASE_UPSERT_BATCH_SIZE);
      const { error } = await client
        .from(SUPABASE_SAMPLES_TABLE)
        .delete()
        .in('id', chunk);

      if (error) {
        const formatted = formatSupabaseError(error);
        return {
          success: false,
          error: formatted.message,
          errorCode: formatted.code,
          errorDetails: formatted.details,
        };
      }
    }

    return {
      success: true,
      data: cleanIds.length,
      syncedCount: cleanIds.length,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const formatted = formatSupabaseError(err);
    return {
      success: false,
      error: formatted.message,
      errorCode: formatted.code,
      errorDetails: formatted.details,
    };
  }
}

/**
 * Replace all samples in Supabase:
 * 1. Delete existing IDs not in the new dataset
 * 2. Upsert the new dataset in batches of 500
 */
export async function replaceAllSamplesInSupabase(
  samples: SampleItem[],
  onProgress?: (progress: SupabaseSyncProgress) => void
): Promise<SupabaseSyncResult<SampleItem[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: getSupabaseConfigStatus().errorMessage || 'Supabase belum dikonfigurasi.',
    };
  }

  try {
    const deduped = deduplicateSamplesForUpsert(samples);
    const incomingIdSet = new Set(deduped.map(s => s.id));

    const PAGE_SIZE = 1000;
    const staleIds: string[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await client
        .from(SUPABASE_SAMPLES_TABLE)
        .select('id')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        const formatted = formatSupabaseError(error);
        return {
          success: false,
          error: formatted.message,
          errorCode: formatted.code,
          errorDetails: formatted.details,
        };
      }

      if (!data || data.length === 0) break;

      for (const row of data as { id: string }[]) {
        if (!incomingIdSet.has(row.id)) {
          staleIds.push(row.id);
        }
      }

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (staleIds.length > 0) {
      const delRes = await deleteSamplesFromSupabase(staleIds);
      if (!delRes.success) {
        return {
          success: false,
          error: delRes.error,
          errorCode: delRes.errorCode,
          errorDetails: delRes.errorDetails,
        };
      }
    }

    return await upsertSamplesBatchToSupabase(deduped, onProgress);
  } catch (err) {
    const formatted = formatSupabaseError(err);
    return {
      success: false,
      error: formatted.message,
      errorCode: formatted.code,
      errorDetails: formatted.details,
    };
  }
}
