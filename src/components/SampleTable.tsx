import React from 'react';
import { 
  SampleItem, 
  SurveyProgressStatus,
  VisibleColumns,
  DEFAULT_VISIBLE_COLUMNS,
  PageSizeOption,
  isFasihBerhasil,
  isFasihTerkendala,
  mapFasihToSurveyStatus,
  mapSurveyStatusToFasih,
  FASIH_HASIL_PENDATAAN_OPTIONS,
  UNIFIED_STATUS_OPTIONS,
  getHasilKategori,
  isSampleDraft,
  isSampleBerhasil,
  isSampleTidakBerhasil
} from '../types/sitasi';
import { 
  Check, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  Phone, 
  MessageCircle, 
  MapPin, 
  ExternalLink, 
  Edit3, 
  Info, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Plus,
  Trash2,
  X,
  SlidersHorizontal,
  Rows,
  FileCheck2
} from 'lucide-react';

interface SampleTableProps {
  samples: SampleItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onQuickToggleComplete: (id: string) => void;
  onChangeStatus: (id: string, status: SurveyProgressStatus) => void;
  onChangeHasilPendataan?: (id: string, hasilFasih: string) => void;
  onOpenDetail: (sample: SampleItem) => void;
  showPetugasColumn?: boolean;
  onOpenQuickNus?: (sample: SampleItem) => void;
  onResetNus?: (id: string) => void;
  onClearPengganti?: (id: string) => void;
  onClearCatatan?: (id: string) => void;
  
  // Column Visibility
  visibleColumns?: VisibleColumns;
  onResetColumns?: () => void;

  // Pagination
  pageSize?: PageSizeOption;
  currentPage?: number;
  totalFilteredCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: PageSizeOption) => void;

  // Permissions & Edit control
  canEdit?: boolean;
  onRequireEditAccess?: () => void;
}

export const SampleTable: React.FC<SampleTableProps> = ({
  samples,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onQuickToggleComplete,
  onChangeStatus,
  onChangeHasilPendataan,
  onOpenDetail,
  showPetugasColumn = false,
  onOpenQuickNus,
  onResetNus,
  onClearPengganti,
  onClearCatatan,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  onResetColumns,
  pageSize = 'all',
  currentPage = 1,
  totalFilteredCount,
  onPageChange,
  onPageSizeChange,
  canEdit = true,
  onRequireEditAccess,
}) => {
  const allSelected = samples.length > 0 && samples.every(s => selectedIds.has(s.id));
  const someSelected = samples.some(s => selectedIds.has(s.id)) && !allSelected;

  const totalCount = totalFilteredCount !== undefined ? totalFilteredCount : samples.length;
  const numPageSize = typeof pageSize === 'number' ? pageSize : totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / (numPageSize || 1)));

  const startItem = totalCount === 0 ? 0 : pageSize === 'all' ? 1 : (currentPage - 1) * numPageSize + 1;
  const endItem = pageSize === 'all' ? totalCount : Math.min(currentPage * numPageSize, totalCount);

  // Check if at least one column is visible
  const anyColumnVisible = Object.values(visibleColumns).some(Boolean);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const getWaLink = (phone: string) => {
    let p = phone.replace(/[^0-9]/g, '');
    if (p.startsWith('0')) {
      p = '62' + p.slice(1);
    }
    return `https://wa.me/${p}`;
  };

  if (samples.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Tidak ada sampel yang cocok</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Coba sesuaikan kata kunci pencarian, filter status, atau pilih petugas lapangan lainnya.
        </p>
      </div>
    );
  }

  if (!anyColumnVisible) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <SlidersHorizontal className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Semua Kolom Disembunyikan</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Anda telah menonaktifkan seluruh kolom tabel. Silakan klik tombol di bawah untuk menampilkan kembali kolom standar.
        </p>
        {onResetColumns && (
          <button
            type="button"
            onClick={onResetColumns}
            className="mt-4 inline-flex items-center text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer"
          >
            Tampilkan Semua Kolom
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      
      {/* Table Container with horizontal scroll */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs">
              
              {/* Checkbox All */}
              {visibleColumns.select !== false && (
                <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={onToggleSelectAll}
                    aria-label="Pilih semua sampel"
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                  />
                </th>
              )}

              {/* Checklist Action */}
              {visibleColumns.checklist !== false && (
                <th className="py-3.5 px-3 text-center w-20">
                  Checklist
                </th>
              )}

              {/* Petugas (Hanya muncul jika Semua Petugas dipilih & kolom petugas aktif) */}
              {showPetugasColumn && visibleColumns.petugas !== false && (
                <th className="py-3.5 px-3">
                  Petugas
                </th>
              )}

              {/* NUS & Tipe */}
              {visibleColumns.nus !== false && (
                <th className="py-3.5 px-3">
                  NUS & Tipe
                </th>
              )}

              {/* Nama UTP & Responden */}
              {visibleColumns.nama !== false && (
                <th className="py-3.5 px-3 min-w-[200px]">
                  Nama UTP & KRT
                </th>
              )}

              {/* Alamat & SLS */}
              {visibleColumns.wilayah !== false && (
                <th className="py-3.5 px-3 min-w-[180px]">
                  Desa / SLS
                </th>
              )}

              {/* Komoditas */}
              {visibleColumns.komoditas !== false && (
                <th className="py-3.5 px-3 min-w-[180px]">
                  Komoditas
                </th>
              )}

              {/* Koordinat */}
              {visibleColumns.lokasi !== false && (
                <th className="py-3.5 px-3 text-center">
                  Lokasi / GPS
                </th>
              )}



              {/* Status & Tanggal */}
              {visibleColumns.status !== false && (
                <th className="py-3.5 px-3 min-w-[160px]">
                  Status & Tanggal
                </th>
              )}

              {/* Pengganti & Catatan */}
              {visibleColumns.pengganti !== false && (
                <th className="py-3.5 px-3 min-w-[160px]">
                  NUS Pengganti / Catatan
                </th>
              )}

              {/* Aksi */}
              {visibleColumns.aksi !== false && (
                <th className="py-3.5 pr-4 pl-2 text-right">
                  Aksi
                </th>
              )}

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {samples.map((s) => {
              const isSelected = selectedIds.has(s.id);
              const isDone = s.progressStatus === 'SELESAI';
              const isUtama = s.statusSampel === 'U';

              return (
                <tr 
                  key={s.id}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    isSelected ? 'bg-emerald-50/50' : isDone ? 'bg-emerald-50/15' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  {visibleColumns.select !== false && (
                    <td className="py-3.5 pl-4 pr-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(s.id)}
                        aria-label={`Pilih sampel ${s.nus}`}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                  )}

                  {/* Quick Checklist Toggle Button */}
                  {visibleColumns.checklist !== false && (
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canEdit) {
                            onRequireEditAccess?.();
                          } else {
                            onQuickToggleComplete(s.id);
                          }
                        }}
                        title={
                          !canEdit
                            ? 'Mode Hanya Lihat: Hanya Akun Pemilik atau akun berizin yang dapat mengubah checklist'
                            : isDone
                            ? 'Klik untuk membatalkan status selesai'
                            : 'Klik untuk menandai SELESAI dicacah'
                        }
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer shadow-xs ${
                          !canEdit
                            ? isDone
                              ? 'bg-slate-400 text-white cursor-not-allowed opacity-80'
                              : 'bg-slate-100 border-2 border-slate-300 text-slate-300 cursor-not-allowed'
                            : isDone
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-300'
                            : 'bg-white border-2 border-slate-300 text-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                      >
                        <Check className={`w-4 h-4 stroke-[3] ${isDone ? 'text-white' : ''}`} />
                      </button>
                    </td>
                  )}

                  {/* Petugas (Hanya muncul jika Semua Petugas dipilih & kolom aktif) */}
                  {showPetugasColumn && visibleColumns.petugas !== false && (
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {s.petugas}
                      </span>
                    </td>
                  )}

                  {/* NUS & Tipe */}
                  {visibleColumns.nus !== false && (
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-sm font-black text-slate-900">
                          {s.nus}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide ${
                            isUtama
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                          title={isUtama ? 'Sampel Utama (Wajib Dicacah)' : 'Sampel Cadangan'}
                        >
                          {isUtama ? 'UTAMA' : 'CADANGAN'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        NKS: {s.nks}
                      </span>
                    </td>
                  )}

                  {/* Nama UTP & Responden + Phone */}
                  {visibleColumns.nama !== false && (
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 text-xs">
                        {s.namaUTP}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        KRT: {s.namaKRT}
                        {s.namaART && s.namaART !== '-' && s.namaART !== s.namaKRT && (
                          <span className="text-slate-400"> / {s.namaART}</span>
                        )}
                      </div>

                      {/* Phone button if available */}
                      {s.noTelp && (
                        <div className="flex items-center space-x-2 mt-1">
                          <a
                            href={`tel:${s.noTelp}`}
                            title={`Telepon ${s.noTelp}`}
                            className="inline-flex items-center text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                          >
                            <Phone className="w-2.5 h-2.5 mr-1" />
                            {s.noTelp}
                          </a>
                          <a
                            href={getWaLink(s.noTelp)}
                            target="_blank"
                            rel="noreferrer"
                            title="Kirim pesan WhatsApp"
                            className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="w-2.5 h-2.5 mr-0.5" />
                            WA
                          </a>
                        </div>
                      )}
                    </td>
                  )}

                  {/* Desa & SLS */}
                  {visibleColumns.wilayah !== false && (
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800 text-xs">
                        {s.desa}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2" title={s.sls}>
                        {s.sls}
                      </div>
                      {s.alamat && s.alamat !== s.sls && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5">
                          {s.alamat}
                        </div>
                      )}
                    </td>
                  )}

                  {/* Komoditas */}
                  {visibleColumns.komoditas !== false && (
                    <td className="py-3.5 px-3">
                      {s.komoditasPrioritas && s.komoditasPrioritas !== '-' && (
                        <div className="mb-1">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {s.komoditasPrioritas}
                          </span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600 line-clamp-2" title={s.komoditas}>
                        {s.komoditas}
                      </div>
                    </td>
                  )}

                  {/* Lokasi / GPS */}
                  {visibleColumns.lokasi !== false && (
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {s.latitude && s.longitude ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          title={`Buka di Google Maps (${s.latitude}, ${s.longitude})`}
                          className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>Maps</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  )}

                  {/* Status & Tanggal */}
                  {visibleColumns.status !== false && (
                    <td className="py-3.5 px-3">
                      <div className="space-y-1.5 min-w-[200px]">
                        <select
                          disabled={!canEdit}
                          value={
                            s.hasilPendataanFasih ||
                            (s.progressStatus === 'SELESAI'
                              ? '1. Berhasil diwawancarai'
                              : s.progressStatus === 'MENOLAK'
                              ? '2. Responden menolak'
                              : s.progressStatus === 'TIDAK_DITEMUKAN'
                              ? '4. Pindah/Tidak Ditemukan'
                              : s.progressStatus === 'NON_AKTIF'
                              ? '5. Bukan Usaha Pertanian Lagi'
                              : '-')
                          }
                          onChange={(e) => {
                            if (!canEdit) {
                              onRequireEditAccess?.();
                              return;
                            }
                            const val = e.target.value;
                            if (onChangeHasilPendataan) {
                              onChangeHasilPendataan(s.id, val);
                            } else {
                              onChangeStatus(s.id, mapFasihToSurveyStatus(val));
                            }
                          }}
                          className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-all shadow-2xs ${
                            !canEdit
                              ? 'opacity-65 bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300'
                              : isSampleBerhasil(s)
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 cursor-pointer'
                              : isSampleTidakBerhasil(s)
                              ? 'bg-rose-50 border-rose-300 text-rose-900 cursor-pointer'
                              : 'bg-white border-slate-300 text-slate-700 cursor-pointer'
                          }`}
                        >
                          <optgroup label="Belum Diwawancara">
                            <option value="-">- Belum Diwawancara</option>
                          </optgroup>
                          <optgroup label="✓ Berhasil Diwawancarai">
                            <option value="1. Berhasil diwawancarai">1. Berhasil diwawancarai</option>
                          </optgroup>
                          <optgroup label="✕ Tidak Berhasil Diwawancarai (Wajib Cadangan)">
                            <option value="2. Responden menolak">2. Responden menolak (Gagal - Ganti Cadangan)</option>
                            <option value="3. Responden tidak dapat ditemui/dihubungi">3. Responden tidak dapat ditemui/dihubungi (Gagal - Ganti Cadangan)</option>
                            <option value="4. Pindah/Tidak Ditemukan">4. Pindah/Tidak Ditemukan (Gagal - Ganti Cadangan)</option>
                            <option value="5. Bukan Usaha Pertanian Lagi">5. Bukan Usaha Pertanian Lagi (Gagal - Ganti Cadangan)</option>
                          </optgroup>
                        </select>

                        {/* Status Category Badge & Tanggal */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isSampleBerhasil(s) ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              <Check className="w-3 h-3 mr-1 text-emerald-600 stroke-[3]" />
                              <span>Berhasil Diwawancarai</span>
                            </span>
                          ) : isSampleTidakBerhasil(s) ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                              <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
                              <span>Tidak Berhasil</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              <Clock className="w-3 h-3 mr-1 text-slate-400" />
                              <span>Belum Diwawancara</span>
                            </span>
                          )}

                          {s.tanggalCacah && isSampleBerhasil(s) && (
                            <div className="flex items-center text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                              <span>{s.tanggalCacah}</span>
                            </div>
                          )}
                        </div>

                        {/* If Utama and Gagal / Tidak Berhasil, show replacement status & quick action */}
                        {isUtama && isSampleTidakBerhasil(s) && (
                          <div className="p-1.5 rounded-lg bg-rose-50/80 border border-rose-200 text-rose-900 space-y-1">
                            <div className="text-[10px] text-amber-900 font-semibold bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
                              ⚠️ Wajib diganti Sampel Cadangan
                            </div>
                            {s.nusPengganti ? (
                              <div className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                                <Check className="w-3 h-3" /> Sudah diganti: NUS {s.nusPengganti}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!canEdit) {
                                    onRequireEditAccess?.();
                                  } else {
                                    onOpenQuickNus?.(s);
                                  }
                                }}
                                className={`w-full inline-flex items-center justify-center space-x-1 px-2 py-1 rounded text-[10px] font-bold shadow-xs transition-colors cursor-pointer ${
                                  !canEdit ? 'bg-slate-200 text-slate-500' : 'bg-amber-600 hover:bg-amber-700 text-white'
                                }`}
                              >
                                <span>+ Pilih Cadangan Pengganti</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Pengganti & Catatan */}
                  {visibleColumns.pengganti !== false && (
                    <td className="py-3.5 px-3">
                      {s.nusPengganti ? (
                        <div className="mb-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 font-mono inline-flex items-center">
                              {isUtama ? 'Diganti NUS:' : 'Pengganti NUS:'} {s.nusPengganti}
                            </span>
                            
                            {/* One-click delete NUS Pengganti */}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => (onClearPengganti ? onClearPengganti(s.id) : onResetNus?.(s.id))}
                                className="inline-flex items-center text-[10px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 px-1.5 py-0.5 rounded border border-rose-300 transition-colors cursor-pointer shadow-2xs"
                                title="Hapus / batalkan NUS pengganti ini jika salah input"
                              >
                                <Trash2 className="w-2.5 h-2.5 mr-0.5" />
                                <span>Hapus NUS</span>
                              </button>
                            )}

                            {canEdit && onOpenQuickNus && (
                              <button
                                type="button"
                                onClick={() => onOpenQuickNus(s)}
                                className="text-[10px] font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                title="Ubah nomor NUS pengganti"
                              >
                                Ubah
                              </button>
                            )}
                          </div>
                        </div>
                      ) : null}
                      
                      {s.catatanPetugas ? (
                        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-700 mt-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          <span className="line-clamp-2" title={s.catatanPetugas}>
                            {s.catatanPetugas}
                          </span>
                          {onClearCatatan && (
                            <button
                              type="button"
                              onClick={() => onClearCatatan(s.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 shrink-0 transition-colors cursor-pointer"
                              title="Hapus catatan petugas"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : s.keteranganAwal ? (
                        <div className="text-[11px] text-slate-400 italic">
                          {s.keteranganAwal}
                        </div>
                      ) : !s.nusPengganti ? (
                        <span className="text-slate-300 text-[10px]">-</span>
                      ) : null}
                    </td>
                  )}

                  {/* Action Column: Quick Reset/Ubah Pengganti + Detail */}
                  {visibleColumns.aksi !== false && (
                    <td className="py-3.5 pr-4 pl-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {s.nusPengganti ? (
                          <>
                            <button
                              type="button"
                              onClick={() => (onClearPengganti ? onClearPengganti(s.id) : onResetNus?.(s.id))}
                              className="inline-flex items-center text-[11px] font-semibold px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                              title={`Hapus NUS Pengganti (${s.nusPengganti}) langsung tanpa buka menu Detail`}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              <span>Hapus NUS</span>
                            </button>
                            {onOpenQuickNus && (
                              <button
                                type="button"
                                onClick={() => onOpenQuickNus(s)}
                                className="inline-flex items-center text-[11px] font-semibold px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                                title="Ubah NUS Pengganti langsung tanpa buka menu Detail"
                              >
                                <RefreshCw className="w-3 h-3 mr-1 text-amber-700" />
                                <span>Ubah</span>
                              </button>
                            )}
                          </>
                        ) : isUtama && onOpenQuickNus ? (
                          <button
                            type="button"
                            onClick={() => onOpenQuickNus(s)}
                            className="inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-dashed border-slate-300 hover:border-amber-300 transition-colors cursor-pointer"
                            title="Tetapkan sampel cadangan pengganti tanpa masuk menu Detail"
                          >
                            <Plus className="w-3 h-3 mr-0.5" />
                            <span>Pengganti</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => onOpenDetail(s)}
                          className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white transition-all cursor-pointer"
                          title="Buka rincian lengkap sampel"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          <span>Detail</span>
                        </button>
                      </div>
                    </td>
                  )}

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & Row Summary Footer Bar */}
      <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        
        {/* Left: Summary text */}
        <div className="flex items-center space-x-2">
          <span>
            Menampilkan <strong className="text-slate-900">{startItem}</strong> - <strong className="text-slate-900">{endItem}</strong> dari <strong className="text-slate-900">{totalCount}</strong> sampel
          </span>
          {pageSize !== 'all' && totalPages > 1 && (
            <span className="text-slate-400 hidden md:inline">
              (Halaman {currentPage} dari {totalPages})
            </span>
          )}
        </div>

        {/* Center: Row selector */}
        {onPageSizeChange && (
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 hidden lg:inline">Baris per halaman:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              {(['10', '25', '50', '100', 'all'] as const).map((opt) => {
                const isSelected = String(pageSize) === opt;
                const label = opt === 'all' ? 'Semua' : opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onPageSizeChange(opt === 'all' ? 'all' : (parseInt(opt, 10) as PageSizeOption))}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Right: Page navigation */}
        {pageSize !== 'all' && totalPages > 1 && onPageChange && (
          <div className="flex items-center space-x-1">
            
            {/* First Page */}
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              title="Halaman Pertama"
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              title="Halaman Sebelumnya"
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page number buttons */}
            <div className="hidden sm:flex items-center space-x-1">
              {getPageNumbers().map((page, idx) => {
                if (page === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-1 text-slate-400">
                      ...
                    </span>
                  );
                }
                const isCurrent = page === currentPage;
                return (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => onPageChange(page as number)}
                    className={`min-w-[28px] h-7 px-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              title="Halaman Berikutnya"
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Halaman Terakhir"
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>

          </div>
        )}

      </div>

    </div>
  );
};
