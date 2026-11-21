import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  LayoutList, 
  LayoutGrid, 
  CheckCheck, 
  RotateCcw,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  ChevronDown,
  Rows,
  Save,
  Lock,
  Cloud,
  CheckCircle2,
  Database,
  Clock
} from 'lucide-react';
import { 
  FilterOptions, 
  TableColumnKey, 
  VisibleColumns, 
  PageSizeOption 
} from '../types/sitasi';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  nksList: string[];
  desaList: string[];
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  selectedCount: number;
  onBatchComplete: () => void;
  onBatchReset: () => void;
  onClearSelection: () => void;
  totalFilteredCount: number;

  // Column Visibility props
  visibleColumns: VisibleColumns;
  onToggleColumn: (key: TableColumnKey) => void;
  onSetAllColumns: (visible: boolean) => void;
  onResetColumns: () => void;

  // Pagination props
  pageSize: PageSizeOption;
  onPageSizeChange: (size: PageSizeOption) => void;

  // Full Screen props
  isFullscreen: boolean;
  onToggleFullscreen: () => void;

  // Save to Server & Permissions props
  unsavedCount?: number;
  isSavingToServer?: boolean;
  onSaveToServer?: () => void;
  lastSavedAt?: string;
  canEdit?: boolean;
  onRequireEditAccess?: () => void;

  // Backup & Restore
  onOpenBackupRestore?: () => void;
}

const COLUMN_ITEMS: { key: TableColumnKey; label: string; description: string }[] = [
  { key: 'select', label: 'Pilih (Checkbox)', description: 'Kotak centang batch pilih sampel' },
  { key: 'checklist', label: 'Checklist Cepat', description: 'Tombol centang hijau satu-klik selesai' },
  { key: 'petugas', label: 'Petugas Lapangan', description: 'Nama petugas pencacah sampel' },
  { key: 'nus', label: 'NUS & Tipe Sampel', description: 'Nomor Urut Sampel (NUS), Utama/Cadangan, dan NKS' },
  { key: 'nama', label: 'Nama UTP & KRT', description: 'Nama usaha tani, responden, telepon & WhatsApp' },
  { key: 'wilayah', label: 'Desa / SLS / Alamat', description: 'Wilayah pencacahan dan alamat responden' },
  { key: 'komoditas', label: 'Komoditas Pertanian', description: 'Komoditas prioritas dan rincian subsektor' },
  { key: 'lokasi', label: 'Lokasi / GPS (Maps)', description: 'Tautan koordinat Google Maps' },
  { key: 'status', label: 'Status & Tanggal Cacah', description: 'Status pencacahan & tanggal survei' },
  { key: 'pengganti', label: 'NUS Pengganti / Catatan', description: 'Sampel pengganti, tombol hapus/ubah & catatan' },
  { key: 'aksi', label: 'Aksi (Detail)', description: 'Tombol modal rincian lengkap sampel' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  nksList,
  desaList,
  viewMode,
  onViewModeChange,
  selectedCount,
  onBatchComplete,
  onBatchReset,
  onClearSelection,
  totalFilteredCount,
  visibleColumns,
  onToggleColumn,
  onSetAllColumns,
  onResetColumns,
  pageSize,
  onPageSizeChange,
  isFullscreen,
  onToggleFullscreen,
  unsavedCount = 0,
  isSavingToServer = false,
  onSaveToServer,
  lastSavedAt,
  canEdit = true,
  onRequireEditAccess,
  onOpenBackupRestore,
}) => {
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const columnFilterRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = 
    filters.searchQuery !== '' || 
    filters.statusFilter !== 'ALL' || 
    filters.tipeFilter !== 'ALL' || 
    filters.nksFilter !== '' || 
    filters.desaFilter !== '';

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalColumnsCount = COLUMN_ITEMS.length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnFilterRef.current && !columnFilterRef.current.contains(event.target as Node)) {
        setShowColumnFilter(false);
      }
    };
    if (showColumnFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnFilter]);

  return (
    <div className="space-y-3">
      {/* Primary search and controls */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Cari nama KRT, nama UTP, NUS, komoditas, alamat, atau no telp..."
            className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges & Selects */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Tipe Sampel Pill Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => onFilterChange({ tipeFilter: 'ALL' })}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filters.tipeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Tipe
            </button>
            <button
              onClick={() => onFilterChange({ tipeFilter: 'U' })}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filters.tipeFilter === 'U'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              Utama (U)
            </button>
            <button
              onClick={() => onFilterChange({ tipeFilter: 'C' })}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filters.tipeFilter === 'C'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 hover:text-amber-800'
              }`}
            >
              Cadangan (C)
            </button>
          </div>

          {/* Status & FASIH-SM Hasil Pendataan Filter */}
          <select
            value={filters.statusFilter}
            onChange={(e) => onFilterChange({ statusFilter: e.target.value as any })}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            aria-label="Filter status dan hasil pendataan"
          >
            <option value="ALL">Semua Status Pendataan</option>
            <option value="BELUM_DIWAWANCARA">⏳ Belum Diwawancara (-)</option>
            <option value="BERHASIL">✓ Berhasil Diwawancarai (Kode 1)</option>
            <option value="TIDAK_BERHASIL">✕ Tidak Berhasil Diwawancarai (Kode 2 - 5 / Wajib Cadangan)</option>
          </select>

          {/* NKS Filter */}
          {nksList.length > 1 && (
            <select
              value={filters.nksFilter}
              onChange={(e) => onFilterChange({ nksFilter: e.target.value })}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="">Semua NKS ({nksList.length})</option>
              {nksList.map(nks => (
                <option key={nks} value={nks}>NKS {nks}</option>
              ))}
            </select>
          )}

          {/* Desa Filter */}
          {desaList.length > 1 && (
            <select
              value={filters.desaFilter}
              onChange={(e) => onFilterChange({ desaFilter: e.target.value })}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="">Semua Desa ({desaList.length})</option>
              {desaList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              title="Reset filter ke kondisi awal"
              className="text-xs font-semibold px-2 py-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-slate-600">
            <button
              onClick={() => onViewModeChange('table')}
              title="Tampilan Tabel Rinci"
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('cards')}
              title="Tampilan Kartu Lapangan"
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Secondary Controls Bar: Filter Kolom Checklist, Jumlah Baris, & Full Screen */}
      <div className="bg-slate-50/80 rounded-xl p-2.5 sm:px-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left Side: Filter Kolom & Rows per page */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Filter Kolom Dropdown */}
          <div className="relative" ref={columnFilterRef}>
            <button
              type="button"
              onClick={() => setShowColumnFilter(!showColumnFilter)}
              className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-xs ${
                showColumnFilter
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20'
                  : visibleCount < totalColumnsCount
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Pilih kolom yang ingin ditampilkan pada tabel monitoring"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filter Kolom</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                visibleCount < totalColumnsCount
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {visibleCount}/{totalColumnsCount}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showColumnFilter ? 'rotate-180' : ''}`} />
            </button>

            {/* Checklist Dropdown Popover */}
            {showColumnFilter && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Tampilan Kolom Tabel</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowColumnFilter(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 mb-2.5">
                  Centang kolom yang ingin ditampilkan pada tabel. Kolom yang tidak dicentang akan disembunyikan.
                </p>

                {/* Quick select buttons */}
                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => onSetAllColumns(true)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                  >
                    ✓ Tampilkan Semua
                  </button>
                  <button
                    type="button"
                    onClick={onResetColumns}
                    className="text-slate-500 hover:text-slate-700 font-medium hover:underline cursor-pointer"
                  >
                    ↺ Reset Default
                  </button>
                </div>

                {/* Checkbox list */}
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-50">
                  {COLUMN_ITEMS.map((col) => {
                    const isChecked = visibleColumns[col.key] !== false;
                    return (
                      <label
                        key={col.key}
                        className={`flex items-start space-x-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'hover:bg-emerald-50/50' : 'hover:bg-slate-50 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleColumn(col.key)}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold ${isChecked ? 'text-slate-800' : 'text-slate-500 line-through'}`}>
                            {col.label}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {col.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Pilihan disimpan otomatis
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowColumnFilter(false)}
                    className="text-xs font-bold px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rows Per Page (Jumlah Baris Ditampilkan) */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs text-xs">
            <Rows className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium hidden sm:inline">Tampilkan:</span>
            <select
              value={String(pageSize)}
              onChange={(e) => {
                const val = e.target.value;
                onPageSizeChange(val === 'all' ? 'all' : (parseInt(val, 10) as PageSizeOption));
              }}
              className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
              aria-label="Pilih jumlah baris yang ditampilkan"
            >
              <option value="10">10 baris</option>
              <option value="25">25 baris</option>
              <option value="50">50 baris</option>
              <option value="100">100 baris</option>
              <option value="all">Semua baris</option>
            </select>
          </div>

          {/* Tombol Simpan Perubahan ke Server & Sync Perubahan */}
          <div className="flex items-center space-x-2">
            {canEdit ? (
              <button
                type="button"
                onClick={onSaveToServer}
                disabled={isSavingToServer}
                title={
                  unsavedCount > 0
                    ? `Klik untuk menyimpan ${unsavedCount} perubahan baru`
                    : 'Semua perubahan telah tersimpan. Klik untuk simpan ulang & backup kapan saja'
                }
                className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer ${
                  isSavingToServer
                    ? 'bg-amber-500 text-white cursor-wait'
                    : unsavedCount > 0
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white ring-2 ring-emerald-400/50 shadow-md animate-pulse'
                    : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isSavingToServer ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : unsavedCount > 0 ? (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    <span>Simpan Perubahan</span>
                    <span className="ml-1.5 bg-white text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {unsavedCount} Baru
                    </span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    <span>Simpan Perubahan</span>
                    <span className="ml-1 text-[10px] text-emerald-600 font-medium hidden sm:inline">(Tersimpan)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequireEditAccess}
                title="Mode Hanya Lihat. Klik untuk info login Akun Pemilik"
                className="inline-flex items-center text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>Hanya Lihat</span>
              </button>
            )}

            {/* Keterangan Last Updated (WIB) ketika Admin/Pemilik melakukan update progress monitoring lapangannya */}
            {lastSavedAt && (
              <div 
                className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200"
                title="Waktu pembaruan terakhir tabel progres monitoring lapangan oleh Admin/Pemilik (Zona Waktu WIB)"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
                <span>Last Updated: <strong className="text-slate-900 font-semibold">{lastSavedAt}</strong></span>
              </div>
            )}

            {/* Tombol Backup & Restore di sebelah kanan fitur Simpan Perubahan */}
            {onOpenBackupRestore && (
              <button
                type="button"
                onClick={onOpenBackupRestore}
                title="Cadangkan data ke internal device atau pulihkan data dari file backup"
                className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                <span>Backup & Restore</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Batch Action Toolbar when items are checked */}
      {selectedCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900">
            <span className="bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
              {selectedCount}
            </span>
            <span>Sampel Terpilih</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onBatchComplete}
              className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Tandai Selesai Dicacah
            </button>
            <button
              onClick={onBatchReset}
              className="inline-flex items-center text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Status
            </button>
            <button
              onClick={onClearSelection}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Result Count and Sort Indicator */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <div>
          <span>Menampilkan <strong>{totalFilteredCount}</strong> sampel pertanian</span>
          {pageSize !== 'all' && totalFilteredCount > (typeof pageSize === 'number' ? pageSize : 10) && (
            <span className="text-slate-400 ml-1">
              (dibagi per {pageSize} baris)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>Urutkan: </span>
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              onFilterChange({ sortBy: by as any, sortOrder: order as any });
            }}
            className="text-xs font-medium text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
          >
            <option value="nus-asc">Nomor Urut Sampel (NUS) Terkecil</option>
            <option value="nus-desc">Nomor Urut Sampel (NUS) Terbesar</option>
            <option value="nama-asc">Nama UTP / KRT (A-Z)</option>
            <option value="status-asc">Status (Belum ke Selesai)</option>
            <option value="status-desc">Status (Selesai ke Belum)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
