import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Layers, 
  FileText,
  Plus,
  Trash2,
  Users,
  CheckCheck,
  Database,
  CloudUpload,
  AlertTriangle
} from 'lucide-react';
import { SampleItem } from '../types/sitasi';
import { 
  parseCSV, 
  parseExcelFile, 
  parseSitasiData, 
  extractPetugasFromFilename 
} from '../utils/csvParser';
import {
  getIsSupabaseConfigured,
  getSupabaseConfigStatus,
  upsertSamplesBatchToSupabase,
  replaceAllSamplesInSupabase,
  deduplicateSamplesForUpsert,
  SupabaseSyncProgress,
  SUPABASE_UPSERT_BATCH_SIZE,
} from '../lib/supabase';

export interface UploadedFileItem {
  id: string;
  file: File;
  fileName: string;
  petugasName: string;
  samples: SampleItem[];
  totalUtama: number;
  totalCadangan: number;
  nksList: string[];
  desaName: string;
  errorMsg?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMultiple: (
    allSamples: SampleItem[],
    mode: 'append' | 'replace-all',
    summaryMsg: string,
    syncedToSupabase?: boolean
  ) => void;
  existingPetugasList: string[];
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onImportMultiple,
  existingPetugasList,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileList, setFileList] = useState<UploadedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SupabaseSyncProgress | null>(null);
  const [supabaseError, setSupabaseError] = useState<string>('');
  const [globalError, setGlobalError] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace-all'>('append');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process an individual file and return parsed item
  const parseSingleFile = async (file: File): Promise<UploadedFileItem> => {
    const detectedOfficer = extractPetugasFromFilename(file.name);
    let rows: string[][] = [];
    let samples: SampleItem[] = [];
    let errorMsg = '';

    try {
      if (file.name.endsWith('.csv') || file.type.includes('csv')) {
        const text = await file.text();
        rows = parseCSV(text);
      } else {
        const buffer = await file.arrayBuffer();
        rows = parseExcelFile(buffer);
      }

      samples = parseSitasiData(rows, detectedOfficer);
      if (samples.length === 0) {
        errorMsg = 'Format file tidak sesuai template SITASI 2026.';
      }
    } catch (err: any) {
      errorMsg = err.message || 'Gagal membaca file.';
    }

    const totalUtama = samples.filter(s => s.statusSampel === 'U').length;
    const totalCadangan = samples.filter(s => s.statusSampel === 'C').length;
    const nksList = Array.from(new Set(samples.map(s => s.nks)));
    const desaName = samples[0]?.desa || '-';

    return {
      id: `file_${file.name}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      file,
      fileName: file.name,
      petugasName: detectedOfficer,
      samples,
      totalUtama,
      totalCadangan,
      nksList,
      desaName,
      errorMsg: errorMsg || undefined,
    };
  };

  // Process an array of multiple files
  const processMultipleFiles = async (newFiles: FileList | File[]) => {
    if (!newFiles || newFiles.length === 0) return;

    setIsProcessing(true);
    setGlobalError('');

    const parsedItems: UploadedFileItem[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const item = await parseSingleFile(file);
      parsedItems.push(item);
    }

    setFileList(prev => [...prev, ...parsedItems]);
    setIsProcessing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processMultipleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processMultipleFiles(e.target.files);
    }
    // reset input value so re-uploading same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update officer name for a specific file
  const handleUpdatePetugasName = (id: string, newName: string) => {
    setFileList(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const updatedSamples = item.samples.map(s => ({
            ...s,
            petugas: newName.trim() || 'Petugas Lapangan',
          }));
          return {
            ...item,
            petugasName: newName,
            samples: updatedSamples,
          };
        }
        return item;
      });
    });
  };

  // Remove a file from list
  const handleRemoveFile = (id: string) => {
    setFileList(prev => prev.filter(item => item.id !== id));
  };

  // Confirm import of all files and sync to Supabase in batches (max 500 rows/request)
  const handleConfirmImport = async () => {
    const validFiles = fileList.filter(f => !f.errorMsg && f.samples.length > 0);
    if (validFiles.length === 0) {
      setGlobalError('Tidak ada file dengan data sampel yang valid untuk diimpor.');
      return;
    }

    setGlobalError('');
    setSupabaseError('');

    // Combine & normalize all samples
    const combinedSamples: SampleItem[] = [];
    const officerNames: string[] = [];

    validFiles.forEach(f => {
      const officer = f.petugasName.trim() || 'Petugas Lapangan';
      if (!officerNames.includes(officer)) {
        officerNames.push(officer);
      }
      f.samples.forEach(s => {
        combinedSamples.push({
          ...s,
          petugas: officer,
          updatedAt: new Date().toISOString(),
        });
      });
    });

    const dedupedSamples = deduplicateSamplesForUpsert(combinedSamples);

    if (getIsSupabaseConfigured()) {
      setIsSyncingSupabase(true);
      setSyncProgress({
        currentBatch: 0,
        totalBatches: Math.max(1, Math.ceil(dedupedSamples.length / SUPABASE_UPSERT_BATCH_SIZE)),
        syncedRows: 0,
        totalRows: dedupedSamples.length,
        percentage: 0,
      });

      const syncResult =
        importMode === 'replace-all'
          ? await replaceAllSamplesInSupabase(dedupedSamples, (prog) => setSyncProgress(prog))
          : await upsertSamplesBatchToSupabase(dedupedSamples, (prog) => setSyncProgress(prog));

      setIsSyncingSupabase(false);

      if (!syncResult.success) {
        setSupabaseError(
          syncResult.error ||
            'Gagal menyinkronkan data ke Supabase. Periksa kesesuaian kolom tabel sitasi_samples.'
        );
        return;
      }

      const summaryMsg = `Berhasil mengimpor & menyinkronkan ${dedupedSamples.length} baris ke Supabase dari ${validFiles.length} file (${officerNames.join(', ')})!`;
      onImportMultiple(dedupedSamples, importMode, summaryMsg, true);
      onClose();
      return;
    }

    const summaryMsg = `Berhasil mengimpor ${dedupedSamples.length} sampel dari ${validFiles.length} file (${officerNames.join(', ')}) secara lokal!`;
    onImportMultiple(dedupedSamples, importMode, summaryMsg, false);
    onClose();
  };

  // Total summary calculations
  const validFiles = fileList.filter(f => !f.errorMsg && f.samples.length > 0);
  const totalCombinedSamples = validFiles.reduce((acc, f) => acc + f.samples.length, 0);
  const totalCombinedUtama = validFiles.reduce((acc, f) => acc + f.totalUtama, 0);
  const totalCombinedCadangan = validFiles.reduce((acc, f) => acc + f.totalCadangan, 0);
  const uniqueOfficers = Array.from(new Set(validFiles.map(f => f.petugasName.trim() || 'Petugas Lapangan')));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Unggah File Sampel Petugas Lapangan</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Mendukung Banyak File Sekaligus
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pilih atau tarik beberapa file Excel (.xlsx, .xls) atau CSV (SITASI26.DS-UTP)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Multiple File Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-emerald-500 bg-emerald-50' 
                : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Tarik & Jatuhkan satu atau <span className="text-emerald-700 underline">banyak file Excel/CSV</span> di sini
            </p>
            <p className="text-xs text-slate-500 mt-1">
              atau klik untuk memilih file dari komputer (dapat pilih lebih dari 1 file)
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              Contoh nama file: <code>Sampel_SITASI_2026_-_Budi.xlsx</code>, <code>Sampel_SITASI_2026_-_Siti.csv</code>
            </p>
          </div>

          {/* Supabase Connection Status Notice */}
          {getIsSupabaseConfigured() ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start space-x-2.5">
              <Database className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Terhubung ke Supabase:</span> Data yang diunggah akan langsung di-<em>upsert</em> secara otomatis dalam batch (maks. {SUPABASE_UPSERT_BATCH_SIZE} baris/request) ke tabel <code>sitasi_samples</code>.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Supabase Belum Dikonfigurasi:</span> {getSupabaseConfigStatus().errorMessage} File tetap dapat diimpor ke dashboard lokal, namun tidak akan tersinkronisasi ke database Supabase sampai <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> diatur.
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-600 animate-pulse font-medium flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Membaca dan memproses file yang diunggah...</span>
            </div>
          )}

          {/* Supabase Batch Sync Progress Bar */}
          {isSyncingSupabase && syncProgress && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                <span className="flex items-center gap-2">
                  <CloudUpload className="w-4 h-4 text-sky-600 animate-bounce" />
                  <span>Menyinkronkan ke Supabase (Batch {syncProgress.currentBatch}/{syncProgress.totalBatches})...</span>
                </span>
                <span className="font-mono text-sky-700">
                  {syncProgress.syncedRows} / {syncProgress.totalRows} baris ({syncProgress.percentage}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-sky-200/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(4, syncProgress.percentage)}%` }}
                />
              </div>
              <p className="text-[11px] text-sky-700">
                Mohon tunggu, sedang mengirim chunk maksimal {SUPABASE_UPSERT_BATCH_SIZE} baris per request agar tidak timeout...
              </p>
            </div>
          )}

          {/* Detailed Supabase Sync Error Message */}
          {supabaseError && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
              <div className="flex items-start space-x-2 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span>Gagal Sinkronisasi Upload ke Supabase</span>
              </div>
              <p className="pl-6 text-[11px] text-rose-800 leading-relaxed break-words">
                {supabaseError}
              </p>
            </div>
          )}

          {/* Global Error Message */}
          {globalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {/* List of Uploaded Files */}
          {fileList.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Daftar File yang Diunggah ({fileList.length} File)</span>
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah File Lagi</span>
                </button>
              </div>

              {/* Items Card List */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {fileList.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`rounded-xl p-3 border text-xs transition-colors ${
                      item.errorMsg 
                        ? 'bg-rose-50/50 border-rose-200 text-rose-900' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-slate-900 block truncate" title={item.fileName}>
                            {item.fileName}
                          </span>
                          {!item.errorMsg ? (
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span><strong>{item.samples.length}</strong> Sampel ({item.totalUtama} U, {item.totalCadangan} C)</span>
                              <span>•</span>
                              <span>NKS: {item.nksList.join(', ')} ({item.desaName})</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-rose-600 font-medium">{item.errorMsg}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer shrink-0"
                        title="Hapus file ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Officer name editor for this specific file */}
                    {!item.errorMsg && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          Petugas:
                        </span>
                        <input
                          type="text"
                          value={item.petugasName}
                          onChange={(e) => handleUpdatePetugasName(item.id, e.target.value)}
                          placeholder="Nama Petugas..."
                          className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Combined Summary Statistics */}
              {validFiles.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mt-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-950 mb-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                      <span>Total Siap Diimpor: {totalCombinedSamples} Sampel ({validFiles.length} File)</span>
                    </span>
                    <span className="text-emerald-700 font-mono">
                      {uniqueOfficers.length} Petugas
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Sampel</span>
                      <p className="text-sm font-bold text-slate-900">{totalCombinedSamples}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 uppercase font-semibold">Utama (U)</span>
                      <p className="text-sm font-bold text-emerald-700">{totalCombinedUtama}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-amber-600 uppercase font-semibold">Cadangan (C)</span>
                      <p className="text-sm font-bold text-amber-700">{totalCombinedCadangan}</p>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-emerald-800">
                    Petugas: <strong>{uniqueOfficers.join(', ')}</strong>
                  </div>
                </div>
              )}

              {/* Import Mode Options */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Metode Penggabungan Data:
                </label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-800 font-medium">
                      Tambahkan ke daftar petugas yang sudah ada (Multi-Petugas Bersama)
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace-all"
                      checked={importMode === 'replace-all'}
                      onChange={() => setImportMode('replace-all')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-slate-800 font-medium">
                      Ganti seluruh data yang ada saat ini dengan file-file yang baru diunggah
                    </span>
                  </label>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {fileList.length > 0 ? (
              <span>{validFiles.length} dari {fileList.length} file valid</span>
            ) : (
              <span>Pilih file untuk memulai</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isSyncingSupabase}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={validFiles.length === 0 || isSyncingSupabase || isProcessing}
              onClick={handleConfirmImport}
              className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs transition-colors cursor-pointer ${
                validFiles.length > 0 && !isSyncingSupabase && !isProcessing
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>
                {isSyncingSupabase
                  ? 'Menyinkronkan ke Supabase...'
                  : getIsSupabaseConfigured()
                  ? `Impor & Sinkronkan ${totalCombinedSamples} Sampel`
                  : `Impor ${totalCombinedSamples} Sampel (${validFiles.length} File)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
