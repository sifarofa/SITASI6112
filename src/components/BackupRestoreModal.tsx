import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  X,
  AlertCircle,
  HardDrive,
  FileJson,
  FolderDown,
  FolderUp,
  RefreshCw,
  Lock,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import {
  SampleItem,
  SampleStatusType,
  SurveyProgressStatus,
  mapFasihToSurveyStatus,
  mapSurveyStatusToFasih,
} from '../types/sitasi';
import { extractErrorMessage, postJsonWithRetry } from '../utils/api';

interface ServerBackupItem {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  sampleCount: number;
}

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleItem[];
  onRestoreSamples: (restored: SampleItem[], sourceLabel: string) => Promise<boolean>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  canEdit: boolean;
  onRequireEditAccess?: () => void;
}

const VALID_PROGRESS_STATUSES: SurveyProgressStatus[] = [
  'SELESAI',
  'BELUM',
  'MENOLAK',
  'TIDAK_DITEMUKAN',
  'NON_AKTIF',
];

function asSafeText(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return fallback;
}

function asNullableNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Extract the sample array from either a raw JSON array `[...]`
 * or a wrapper backup object `{ samples: [...] }`, `{ data: [...] }`, `{ backupData: [...] }`, `{ rows: [...] }`.
 */
function extractSampleArrayFromPayload(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const candidates = [obj.samples, obj.data, obj.backupData, obj.rows];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * Normalize camelCase (SampleItem) or snake_case (Supabase SitasiSampleRow) backup rows
 * into clean, strictly-typed SampleItem objects.
 */
function normalizeRestoredSamples(rawItems: unknown[]): {
  items: SampleItem[];
  error?: string;
} {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { items: [], error: 'Berkas backup kosong (0 baris sampel).' };
  }

  const normalized: SampleItem[] = [];
  let validSitasiIndicatorCount = 0;

  for (let idx = 0; idx < rawItems.length; idx++) {
    const raw = rawItems[idx];
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;

    const nks = asSafeText(row.nks, '').trim() || '0000000';
    const nus = asSafeText(row.nus, '').trim();
    const namaUTP = asSafeText(row.namaUTP ?? row.nama_utp, '').trim();
    const namaKRT = asSafeText(row.namaKRT ?? row.nama_krt, '').trim();
    const idRaw = asSafeText(row.id, '').trim();

    if (nus || idRaw || namaUTP || namaKRT) {
      validSitasiIndicatorCount++;
    }

    const cleanNus = nus || String(idx + 1);
    const cleanId = idRaw || `${nks}_${cleanNus}`;

    const rawStatusSampel = asSafeText(row.statusSampel ?? row.status_sampel, 'U').trim().toUpperCase();
    const statusSampel: SampleStatusType = rawStatusSampel === 'C' ? 'C' : 'U';

    const rawHasilFasih = asSafeText(
      row.hasilPendataanFasih ?? row.hasil_pendataan_fasih,
      ''
    ).trim();
    const rawProgress = asSafeText(
      row.progressStatus ?? row.progress_status,
      ''
    ).trim().toUpperCase() as SurveyProgressStatus;
    const rawCompleted = Boolean(row.isCompleted ?? row.is_completed);

    let progressStatus: SurveyProgressStatus;
    if (VALID_PROGRESS_STATUSES.includes(rawProgress)) {
      progressStatus = rawProgress;
    } else if (rawHasilFasih && rawHasilFasih !== '-') {
      progressStatus = mapFasihToSurveyStatus(rawHasilFasih);
    } else if (rawCompleted) {
      progressStatus = 'SELESAI';
    } else {
      progressStatus = 'BELUM';
    }

    const isCompleted = rawCompleted || progressStatus === 'SELESAI';
    const hasilPendataanFasih =
      rawHasilFasih || mapSurveyStatusToFasih(progressStatus);

    normalized.push({
      id: cleanId,
      petugas: asSafeText(row.petugas, 'Petugas Lapangan').trim() || 'Petugas Lapangan',
      provinsi: asSafeText(row.provinsi, 'KALIMANTAN BARAT').trim() || 'KALIMANTAN BARAT',
      kabupaten: asSafeText(row.kabupaten, 'KUBU RAYA').trim() || 'KUBU RAYA',
      kecamatan: asSafeText(row.kecamatan, '').trim(),
      desa: asSafeText(row.desa, '').trim(),
      sls: asSafeText(row.sls, '').trim(),
      nks,
      nus: cleanNus,
      komoditas: asSafeText(row.komoditas, '-').trim() || '-',
      komoditasPrioritas:
        asSafeText(row.komoditasPrioritas ?? row.komoditas_prioritas, '-').trim() || '-',
      namaKRT: namaKRT || '-',
      namaART: asSafeText(row.namaART ?? row.nama_art, '-').trim() || '-',
      noTelp: asSafeText(row.noTelp ?? row.no_telp, '').trim(),
      namaUTP: namaUTP || namaKRT || '-',
      alamat: asSafeText(row.alamat, '-').trim() || '-',
      rawKoordinat: asSafeText(row.rawKoordinat ?? row.raw_koordinat, '').trim(),
      latitude: asNullableNumber(row.latitude),
      longitude: asNullableNumber(row.longitude),
      statusSampel,
      keteranganAwal: asSafeText(row.keteranganAwal ?? row.keterangan_awal, '').trim(),
      nusPenggantiAwal: asSafeText(row.nusPenggantiAwal ?? row.nus_pengganti_awal, '').trim(),
      progressStatus,
      isCompleted,
      tanggalCacah: asSafeText(row.tanggalCacah ?? row.tanggal_cacah, '').trim() || undefined,
      catatanPetugas: asSafeText(row.catatanPetugas ?? row.catatan_petugas, '').trim() || undefined,
      nusPengganti: asSafeText(row.nusPengganti ?? row.nus_pengganti, '').trim() || undefined,
      pencacahNama: asSafeText(row.pencacahNama ?? row.pencacah_nama, '').trim() || undefined,
      updatedAt: asSafeText(row.updatedAt ?? row.updated_at, '').trim() || new Date().toISOString(),
      hasilPendataanFasih,
      statusDokumenFasih:
        asSafeText(row.statusDokumenFasih ?? row.status_dokumen_fasih, 'DRAFT').trim() || 'DRAFT',
      akunFasih: asSafeText(row.akunFasih ?? row.akun_fasih, '').trim() || undefined,
    });
  }

  if (normalized.length === 0 || validSitasiIndicatorCount === 0) {
    return {
      items: [],
      error:
        'Format berkas JSON tidak cocok dengan data sampel SITASI 2026 (kolom id, nus, nks, atau namaUTP tidak ditemukan).',
    };
  }

  return { items: normalized };
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  samples,
  onRestoreSamples,
  showToast,
  canEdit,
  onRequireEditAccess,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'server'>('backup');
  const [serverBackups, setServerBackups] = useState<ServerBackupItem[]>([]);
  const [isLoadingServerBackups, setIsLoadingServerBackups] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // File restore state
  const [selectedFileContent, setSelectedFileContent] = useState<SampleItem[] | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [fileStats, setFileStats] = useState<{ total: number; done: number; failed: number } | null>(null);
  const [restoreError, setRestoreError] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [confirmServerFileName, setConfirmServerFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load server backups on open or when switching to server tab
  const fetchServerBackups = async () => {
    setIsLoadingServerBackups(true);
    try {
      const res = await fetch(`/api/backups?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.backups)) {
          setServerBackups(json.backups);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat daftar backup server:', e);
    } finally {
      setIsLoadingServerBackups(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServerBackups();
      setRestoreError('');
      setConfirmServerFileName(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Export / Download Backup file with Native Folder Picker
  const handleDownloadBackupToDevice = async () => {
    setIsProcessing(true);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const defaultFileName = `Backup_SITASI_2026_${timeStr}.json`;
    const jsonString = JSON.stringify(samples, null, 2);

    try {
      // 1. Try modern File System Access API (Pilih folder di internal device)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [
              {
                description: 'File Cadangan SITASI 2026 (JSON)',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          showToast(`✅ File backup berhasil disimpan ke folder pilihan di perangkat Anda! (${defaultFileName})`, 'success');
          setIsProcessing(false);
          return;
        } catch (pickerErr: any) {
          if (pickerErr?.name === 'AbortError') {
            setIsProcessing(false);
            return;
          }
          console.warn('File picker gagal/dibatalkan, menggunakan fallback download:', pickerErr);
        }
      }

      // 2. Fallback: Browser Download to Device Internal Storage
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`✅ File backup berhasil diunduh ke penyimpanan internal device! (${defaultFileName})`, 'success');
    } catch (err: any) {
      console.error('Download backup error:', err);
      showToast(extractErrorMessage(err, 'Gagal membuat file backup.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse and validate uploaded JSON backup file
  const processBackupFile = (file: File) => {
    setSelectedFileName(file.name);
    setRestoreError('');

    const reader = new FileReader();
    reader.onerror = () => {
      const msg = `Gagal membaca berkas "${file.name}". Pastikan file tidak rusak atau terkunci.`;
      setRestoreError(msg);
      setSelectedFileContent(null);
      setFileStats(null);
      showToast(msg, 'error');
    };

    reader.onload = (event) => {
      try {
        const rawText = String(event.target?.result || '').replace(/^\uFEFF/, '').trim();
        if (!rawText) {
          const msg = 'Berkas JSON kosong.';
          setRestoreError(msg);
          setSelectedFileContent(null);
          setFileStats(null);
          showToast(msg, 'error');
          return;
        }

        const parsed = JSON.parse(rawText);
        const extractedArray = extractSampleArrayFromPayload(parsed);

        if (!extractedArray) {
          const msg =
            'Berkas JSON tidak berisi daftar sampel yang valid. Pastikan file merupakan hasil ekspor/backup SITASI 2026 (.json).';
          setRestoreError(msg);
          setSelectedFileContent(null);
          setFileStats(null);
          showToast(msg, 'error');
          return;
        }

        const { items, error } = normalizeRestoredSamples(extractedArray);
        if (error || items.length === 0) {
          const msg = error || 'Format sampel di dalam berkas JSON tidak cocok dengan SITASI 2026.';
          setRestoreError(msg);
          setSelectedFileContent(null);
          setFileStats(null);
          showToast(msg, 'error');
          return;
        }

        setSelectedFileContent(items);
        setRestoreError('');
        const done = items.filter((s) => s.progressStatus === 'SELESAI' || s.isCompleted).length;
        const failed = items.filter(
          (s) =>
            s.progressStatus === 'TIDAK_DITEMUKAN' ||
            s.progressStatus === 'MENOLAK' ||
            s.progressStatus === 'NON_AKTIF'
        ).length;
        setFileStats({ total: items.length, done, failed });
        showToast(`Berkas ${file.name} berhasil dibaca (${items.length} sampel siap dipulihkan).`, 'info');
      } catch (err) {
        const msg = 'Gagal membaca berkas JSON. Pastikan format berkas .json valid dan tidak terpotong.';
        setRestoreError(msg);
        setSelectedFileContent(null);
        setFileStats(null);
        showToast(msg, 'error');
      }
    };

    reader.readAsText(file, 'utf-8');
  };

  // Handle File Upload from Internal Device for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so picking the same file again still triggers onChange
    e.target.value = '';
    if (!file) return;
    processBackupFile(file);
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBackupFile(file);
    }
  };

  // Execute restore from uploaded local file
  const handleExecuteRestoreFromFile = async () => {
    if (!selectedFileContent || selectedFileContent.length === 0) {
      setRestoreError('Pilih berkas backup JSON yang valid terlebih dahulu.');
      return;
    }
    if (!canEdit) {
      const msg = 'Akses ditolak: Silakan login dengan Akun Pemilik terlebih dahulu untuk memulihkan data.';
      setRestoreError(msg);
      showToast(msg, 'error');
      return;
    }

    setRestoreError('');
    setIsProcessing(true);
    try {
      const success = await onRestoreSamples(selectedFileContent, `File: ${selectedFileName}`);
      if (success) {
        setSelectedFileContent(null);
        setSelectedFileName('');
        setFileStats(null);
        onClose();
      } else {
        setRestoreError('Gagal menyinkronkan data hasil restore ke database/server. Coba lagi.');
      }
    } catch (err) {
      const msg = extractErrorMessage(err, 'Terjadi kesalahan saat memulihkan data dari file.');
      setRestoreError(msg);
      showToast(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute restore from server backup snapshot
  const handleRestoreFromServer = async (backupItem: ServerBackupItem) => {
    if (!canEdit) {
      showToast('Akses ditolak: Hanya Akun Pemilik atau akun dengan izin yang dapat merestore data.', 'error');
      return;
    }

    if (confirmServerFileName !== backupItem.fileName) {
      setConfirmServerFileName(backupItem.fileName);
      return;
    }

    setConfirmServerFileName(null);
    setIsProcessing(true);
    try {
      const res = await postJsonWithRetry('/api/backups/restore', {
        fileName: backupItem.fileName,
      });
      const json = res.data;
      if (res.ok && json?.success) {
        const sRes = await fetch(`/api/samples?_t=${Date.now()}`, { cache: 'no-store' });
        if (sRes.ok) {
          const sJson = await sRes.json();
          const extracted = extractSampleArrayFromPayload(sJson);
          if (sJson.success && extracted) {
            const { items } = normalizeRestoredSamples(extracted);
            if (items.length > 0) {
              await onRestoreSamples(items, `Server: ${backupItem.fileName}`);
              showToast(`✅ Berhasil! Data telah dipulihkan dari ${backupItem.fileName}`, 'success');
              onClose();
              return;
            }
          }
        }
      }
      showToast(
        extractErrorMessage(json?.error ?? json?.message ?? res.networkError, 'Gagal merestore dari server.'),
        'error'
      );
    } catch (e) {
      showToast(extractErrorMessage(e, 'Terjadi kesalahan saat merestore data dari server.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">

        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Backup & Restore Data SITASI 2026</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-400/30">
                  Aman & Terverifikasi
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Simpan cadangan ke Internal Device atau pulihkan data checklist kapan saja
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderDown className="w-4 h-4 text-emerald-600" />
            <span>Backup ke Device</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'restore'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderUp className="w-4 h-4 text-indigo-600" />
            <span>Restore dari File</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('server');
              fetchServerBackups();
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'server'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-600" />
            <span>Riwayat Backup Server ({serverBackups.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">

          {/* TAB 1: BACKUP KE DEVICE */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 space-y-2">
                <div className="font-bold flex items-center gap-2 text-emerald-900 text-sm">
                  <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cadangkan Seluruh Progres ke Internal Device</span>
                </div>
                <p className="text-emerald-900/90 text-xs leading-relaxed">
                  Fitur ini akan mengekspor seluruh <strong>{samples.length} data sampel</strong>, termasuk status pencacahan, tanggal survei, checklist selesai, NUS pengganti cadangan, serta catatan lapangan ke dalam berkas cadangan JSON resmi.
                </p>
                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/80 text-[11px] space-y-1">
                  <div>📁 <strong>Pilihan Folder Device:</strong> Browser akan menampilkan dialog pemilihan folder (Internal Storage, Dokumen, Flashdisk, dsb) untuk menentukan lokasi penyimpanan file.</div>
                  <div>⚡ <strong>Otomatisasi:</strong> Setiap kali Anda menekan tombol <strong>"Simpan Perubahan"</strong> di tabel, file backup ini juga otomatis tersimpan ke device Anda.</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Jumlah Sampel Siap Dibackup:</span>
                  <span className="font-bold text-slate-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                    {samples.length} Sampel
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Sampel Selesai Dicacah:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {samples.filter(s => s.progressStatus === 'SELESAI' || s.isCompleted).length} Sampel
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Sampel Gagal / Pindah (Diganti):</span>
                  <span className="font-bold text-rose-700 font-mono">
                    {samples.filter(s => s.progressStatus === 'TIDAK_DITEMUKAN' || s.progressStatus === 'MENOLAK' || s.progressStatus === 'NON_AKTIF').length} Sampel
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackupToDevice}
                disabled={isProcessing}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Pilih Folder & Simpan Backup ke Internal Device</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: RESTORE DARI FILE INTERNAL DEVICE */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              {!canEdit && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Mode Hanya Lihat Aktif</div>
                      <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                        Anda dapat memilih file untuk pratinjau, namun pemulihan (Restore) ke dashboard hanya dapat dijalankan setelah login sebagai Akun Pemilik.
                      </p>
                    </div>
                  </div>
                  {onRequireEditAccess && (
                    <button
                      type="button"
                      onClick={onRequireEditAccess}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      Login Pemilik
                    </button>
                  )}
                </div>
              )}

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950 space-y-2">
                <div className="font-bold flex items-center gap-2 text-indigo-900 text-sm">
                  <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Pulihkan (Restore) Data dari Berkas JSON Device</span>
                </div>
                <p className="text-indigo-900/90 text-xs leading-relaxed">
                  Mendukung berkas cadangan dari tombol <strong>Backup ke Device</strong>, berkas otomatis <strong>Simpan Perubahan</strong> (<code>Backup_SITASI_2026_*.json</code>), maupun ekspor JSON Supabase.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleFileDragOver}
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDraggingFile
                    ? 'border-indigo-600 bg-indigo-50/80'
                    : 'border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40'
                }`}
              >
                <FileJson className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800 break-all">
                  {selectedFileName
                    ? selectedFileName
                    : 'Klik di sini atau seret file backup JSON (.json) dari device'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mendukung format array sampel langsung maupun format objek cadangan otomatis SITASI 2026
                </p>
              </div>

              {/* Inline error notice in Restore tab */}
              {restoreError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed font-medium">{restoreError}</div>
                </div>
              )}

              {/* Preview statistik file yang dipilih */}
              {selectedFileContent && fileStats && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Pratinjau Berkas Cadangan:</span>
                    <span className="text-emerald-700 font-bold font-mono inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Format Valid
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500">Total Sampel</div>
                      <div className="text-sm font-black text-slate-800">{fileStats.total}</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500">Selesai</div>
                      <div className="text-sm font-black text-emerald-600">{fileStats.done}</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500">Tidak Berhasil</div>
                      <div className="text-sm font-black text-rose-600">{fileStats.failed}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestoreFromFile}
                    disabled={isProcessing || !canEdit}
                    title={!canEdit ? 'Login sebagai Akun Pemilik terlebih dahulu untuk memulihkan data' : undefined}
                    className="w-full mt-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : !canEdit ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Login Akun Pemilik untuk Restore Data</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Pulihkan (Restore) {fileStats.total} Sampel ke Dashboard Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RIWAYAT BACKUP SERVER */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Snapshot Backup di Server</h4>
                  <p className="text-[11px] text-slate-500">Setiap klik "Simpan Perubahan", server otomatis membuat snapshot berkas</p>
                </div>
                <button
                  type="button"
                  onClick={fetchServerBackups}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Muat ulang daftar backup server"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServerBackups ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {!canEdit && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Login dengan Akun Pemilik untuk memulihkan snapshot dari server.</span>
                </div>
              )}

              {isLoadingServerBackups ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span>Memeriksa berkas backup di server...</span>
                </div>
              ) : serverBackups.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                  <HardDrive className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span>Belum ada snapshot backup tersimpan di server.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {serverBackups.map((item) => {
                    const isSnapshot1134 = item.fileName.includes('1134');
                    const isConfirming = confirmServerFileName === item.fileName;
                    return (
                      <div
                        key={item.fileName}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          isSnapshot1134
                            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/40'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-xs font-bold text-slate-800 truncate max-w-[220px]">
                              {item.fileName}
                            </span>
                            {isSnapshot1134 && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                                Progres 11.34 WIB
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                            <span>{new Date(item.createdAt).toLocaleString('id-ID')}</span>
                            <span>•</span>
                            <span className="font-bold text-indigo-700">{item.sampleCount} Sampel</span>
                            <span>•</span>
                            <span>{(item.sizeBytes / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>

                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreFromServer(item)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
                            >
                              Ya, Pulihkan
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmServerFileName(null)}
                              disabled={isProcessing}
                              className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestoreFromServer(item)}
                            disabled={isProcessing || !canEdit}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50 shrink-0 ${
                              isSnapshot1134
                                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Pulihkan</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Data tersinkronisasi aman ke database lokal, server & Supabase</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
