import React from 'react';
import { 
  SampleItem, 
  SurveyProgressStatus,
  FASIH_HASIL_PENDATAAN_OPTIONS,
  isFasihBerhasil,
  isFasihTerkendala,
  isSampleDraft,
  isSampleBerhasil,
  isSampleTidakBerhasil,
  mapFasihToSurveyStatus
} from '../types/sitasi';
import { 
  Check, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Calendar, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  AlertCircle,
  HelpCircle, 
  Clock,
  RotateCcw,
  RefreshCw,
  Plus,
  Trash2,
  X
} from 'lucide-react';

interface SampleCardsProps {
  samples: SampleItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onQuickToggleComplete: (id: string) => void;
  onChangeStatus: (id: string, status: SurveyProgressStatus) => void;
  onChangeHasilPendataan?: (id: string, hasilFasih: string) => void;
  onOpenDetail: (sample: SampleItem) => void;
  showPetugasBadge?: boolean;
  onOpenQuickNus?: (sample: SampleItem) => void;
  onResetNus?: (id: string) => void;
  onClearPengganti?: (id: string) => void;
  onClearCatatan?: (id: string) => void;
  canEdit?: boolean;
  onRequireEditAccess?: () => void;
}

export const SampleCards: React.FC<SampleCardsProps> = ({
  samples,
  selectedIds,
  onToggleSelect,
  onQuickToggleComplete,
  onChangeStatus,
  onChangeHasilPendataan,
  onOpenDetail,
  showPetugasBadge = false,
  onOpenQuickNus,
  onResetNus,
  onClearPengganti,
  onClearCatatan,
  canEdit = true,
  onRequireEditAccess,
}) => {
  const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '');
  const getWaLink = (phone: string) => {
    let p = cleanPhone(phone);
    if (p.startsWith('0')) p = '62' + p.slice(1);
    return `https://wa.me/${p}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {samples.map((s) => {
        const isSelected = selectedIds.has(s.id);
        const isDone = s.progressStatus === 'SELESAI';
        const isUtama = s.statusSampel === 'U';

        return (
          <div
            key={s.id}
            className={`bg-white rounded-xl border transition-all p-4 relative overflow-hidden flex flex-col justify-between ${
              isSelected
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-sm'
                : isDone
                ? 'border-emerald-200 bg-white shadow-xs'
                : 'border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            {/* Top header row */}
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(s.id)}
                    aria-label={`Pilih sampel ${s.nus}`}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 mt-0.5"
                  />
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-base font-black text-slate-900">
                        NUS {s.nus}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide ${
                          isUtama
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isUtama ? 'UTAMA' : 'CADANGAN'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      NKS {s.nks}{showPetugasBadge ? ` • ${s.petugas}` : ''}
                    </span>
                  </div>
                </div>

                {/* Big Quick Checklist Toggle */}
                <button
                  type="button"
                  onClick={() => onQuickToggleComplete(s.id)}
                  title={isDone ? 'Batal status selesai' : 'Tandai SELESAI'}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                    isDone
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-300'
                      : 'bg-slate-100 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 border border-slate-200'
                  }`}
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                </button>
              </div>

              {/* Respondent info */}
              <div className="mt-3">
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {s.namaUTP}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  KRT: <strong className="text-slate-800">{s.namaKRT}</strong>
                  {s.namaART && s.namaART !== '-' && s.namaART !== s.namaKRT && (
                    <span className="text-slate-500"> ({s.namaART})</span>
                  )}
                </p>

                {/* Phone & WA */}
                {s.noTelp && (
                  <div className="flex items-center space-x-2 mt-2">
                    <a
                      href={`tel:${s.noTelp}`}
                      className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100"
                    >
                      <Phone className="w-3 h-3 mr-1" />
                      {s.noTelp}
                    </a>
                    <a
                      href={getWaLink(s.noTelp)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Chat WA
                    </a>
                  </div>
                )}
              </div>

              {/* Location info */}
              <div className="mt-3 text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="font-semibold text-slate-800">{s.desa}</div>
                <div className="text-[11px] text-slate-500">{s.sls}</div>
                {s.alamat && s.alamat !== s.sls && (
                  <div className="text-[11px] text-slate-400 italic">{s.alamat}</div>
                )}
                {s.latitude && s.longitude && (
                  <div className="pt-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-[11px] font-bold text-rose-600 hover:text-rose-700"
                    >
                      <MapPin className="w-3 h-3 mr-0.5" />
                      Buka Peta
                    </a>
                  </div>
                )}
              </div>

              {/* Commodities */}
              <div className="mt-3">
                <div className="text-[10px] uppercase font-bold text-slate-400">Komoditas</div>
                {s.komoditasPrioritas && s.komoditasPrioritas !== '-' && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mr-1.5">
                    Prioritas: {s.komoditasPrioritas}
                  </span>
                )}
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  {s.komoditas}
                </p>
              </div>

              {/* Notes & NUS Pengganti */}
              {(s.catatanPetugas || s.nusPengganti) && (
                <div className="mt-3 p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/70 text-xs space-y-2">
                  {s.nusPengganti && (
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="font-bold text-amber-900 font-mono text-[11px] bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                        {s.statusSampel === 'U' ? 'Diganti NUS: ' : 'Pengganti NUS: '} {s.nusPengganti}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => (onClearPengganti ? onClearPengganti(s.id) : onResetNus?.(s.id))}
                          className="inline-flex items-center text-[10px] font-bold text-rose-700 hover:text-white bg-white hover:bg-rose-600 px-1.5 py-0.5 rounded border border-rose-300 transition-colors cursor-pointer shadow-2xs"
                          title="Hapus / batalkan NUS pengganti jika salah input"
                        >
                          <Trash2 className="w-2.5 h-2.5 mr-0.5" />
                          <span>Hapus NUS</span>
                        </button>
                        {onOpenQuickNus && (
                          <button
                            type="button"
                            onClick={() => onOpenQuickNus(s)}
                            className="inline-flex items-center text-[10px] font-semibold text-slate-700 hover:text-emerald-700 bg-white hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 transition-colors cursor-pointer"
                            title="Ubah NUS pengganti"
                          >
                            <RefreshCw className="w-2.5 h-2.5 mr-0.5 text-amber-600" />
                            <span>Ubah</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {s.catatanPetugas && (
                    <div className="flex items-start justify-between gap-1 text-[11px] text-slate-700 bg-white/90 p-1.5 rounded border border-slate-200">
                      <div className="flex-1">
                        <span className="font-semibold text-slate-600 block text-[10px]">Catatan Petugas:</span>
                        <span className="line-clamp-2">{s.catatanPetugas}</span>
                      </div>
                      {onClearCatatan && (
                        <button
                          type="button"
                          onClick={() => onClearCatatan(s.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 shrink-0 transition-colors cursor-pointer"
                          title="Hapus catatan petugas"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FASIH-SM Hasil Pendataan Integration */}
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                      Hasil Pendataan (FASIH-SM)
                    </span>
                  </div>
                  {s.statusDokumenFasih && (
                    <span className={`px-1.5 py-0.5 text-[9px] font-black tracking-wider rounded uppercase ${
                      s.statusDokumenFasih.includes('APPROVED')
                        ? 'bg-amber-500 text-white'
                        : s.statusDokumenFasih.includes('SUBMITTED')
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {s.statusDokumenFasih}
                    </span>
                  )}
                </div>

                <select
                  value={
                    s.hasilPendataanFasih ||
                    (s.progressStatus === 'SELESAI'
                      ? '1. Berhasil diwawancarai'
                      : s.progressStatus === 'MENOLAK'
                      ? '2. Responden menolak'
                      : s.progressStatus === 'TIDAK_DITEMUKAN'
                      ? '3. Responden tidak dapat ditemui/dihubungi'
                      : s.progressStatus === 'NON_AKTIF'
                      ? '5. Bukan Usaha Pertanian Lagi'
                      : '-')
                  }
                  onChange={(e) => onChangeHasilPendataan?.(s.id, e.target.value)}
                  className={`w-full text-xs font-semibold rounded-lg px-2 py-1.5 border transition-all cursor-pointer ${
                    isFasihBerhasil(s.hasilPendataanFasih) || s.progressStatus === 'SELESAI'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : isFasihTerkendala(s.hasilPendataanFasih) || (isUtama && s.progressStatus !== 'BELUM')
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  {FASIH_HASIL_PENDATAAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Rule: Sampel Utama berkode selain Berhasil -> Tidak Berhasil Dicacah dan Wajib Diganti Cadangan */}
                {isUtama && (
                  <div className="pt-1">
                    {isFasihBerhasil(s.hasilPendataanFasih) || s.progressStatus === 'SELESAI' ? (
                      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                        <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                        <span>Berhasil Dicacah</span>
                      </div>
                    ) : isFasihTerkendala(s.hasilPendataanFasih) || (isUtama && s.progressStatus !== 'BELUM') ? (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-800">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                          <span>Tidak Berhasil Dicacah</span>
                        </div>
                        <div className="text-[11px] text-amber-900 font-semibold bg-amber-100/90 px-2 py-1 rounded border border-amber-300">
                          ⚠️ Wajib Diganti dengan Sampel Cadangan
                        </div>
                        {s.nusPengganti ? (
                          <div className="text-emerald-800 text-xs font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Telah diganti: NUS {s.nusPengganti}</span>
                          </div>
                        ) : onOpenQuickNus ? (
                          <button
                            type="button"
                            onClick={() => onOpenQuickNus(s)}
                            className="w-full inline-flex items-center justify-center space-x-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            <span>Pilih Cadangan Pengganti</span>
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">
                        Belum diwawancarai
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status & Detail Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
              <select
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
                  const val = e.target.value;
                  if (onChangeHasilPendataan) {
                    onChangeHasilPendataan(s.id, val);
                  } else {
                    onChangeStatus(s.id, mapFasihToSurveyStatus(val));
                  }
                }}
                className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer shadow-2xs ${
                  isSampleBerhasil(s)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : isSampleTidakBerhasil(s)
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-white border-slate-300 text-slate-700'
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

              <div className="flex items-center space-x-1">
                {s.nusPengganti ? (
                  <>
                    <button
                      type="button"
                      onClick={() => (onClearPengganti ? onClearPengganti(s.id) : onResetNus?.(s.id))}
                      className="inline-flex items-center text-[11px] font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 px-2 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                      title="Hapus NUS Pengganti langsung"
                    >
                      <Trash2 className="w-3 h-3 mr-0.5" />
                      <span>Hapus NUS</span>
                    </button>
                    {onOpenQuickNus && (
                      <button
                        type="button"
                        onClick={() => onOpenQuickNus(s)}
                        className="inline-flex items-center text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                        title="Ubah nomor NUS Pengganti langsung"
                      >
                        <RefreshCw className="w-3 h-3 mr-0.5 text-amber-600" />
                        <span>Ubah</span>
                      </button>
                    )}
                  </>
                ) : s.statusSampel === 'U' && onOpenQuickNus ? (
                  <button
                    type="button"
                    onClick={() => onOpenQuickNus(s)}
                    className="text-[11px] font-medium text-slate-600 hover:text-amber-800 bg-slate-50 hover:bg-amber-50 px-2 py-1 rounded-lg border border-dashed border-slate-300 transition-colors cursor-pointer flex items-center"
                    title="Pilih pengganti langsung"
                  >
                    <Plus className="w-3 h-3 mr-0.5" />
                    <span>Pengganti</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => onOpenDetail(s)}
                  className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Rincian</span>
                </button>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};
