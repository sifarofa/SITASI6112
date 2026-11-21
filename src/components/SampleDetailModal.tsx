import React, { useState, useEffect, useMemo } from 'react';
import { 
  SampleItem, 
  SurveyProgressStatus,
  FASIH_HASIL_PENDATAAN_OPTIONS,
  isFasihBerhasil,
  isFasihTerkendala,
  mapFasihToSurveyStatus,
  mapSurveyStatusToFasih
} from '../types/sitasi';
import { 
  getEffectiveKomoditasPrioritas, 
  areKomoditasEqual 
} from '../utils/subsektorHelper';
import { 
  X, 
  Check, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Calendar, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  XCircle, 
  User, 
  Layers, 
  FileText 
} from 'lucide-react';

interface SampleDetailModalProps {
  sample: SampleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<SampleItem>) => void;
  cadanganOptions: SampleItem[];
  onOpenBeritaAcara?: () => void;
}

export const SampleDetailModal: React.FC<SampleDetailModalProps> = ({
  sample,
  isOpen,
  onClose,
  onSave,
  cadanganOptions,
  onOpenBeritaAcara,
}) => {
  if (!isOpen || !sample) return null;

  const [status, setStatus] = useState<SurveyProgressStatus>(sample.progressStatus);
  const [hasilFasih, setHasilFasih] = useState<string>(sample.hasilPendataanFasih || mapSurveyStatusToFasih(sample.progressStatus));
  const [tanggal, setTanggal] = useState<string>(sample.tanggalCacah || new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState<string>(sample.catatanPetugas || '');
  const [nusPengganti, setNusPengganti] = useState<string>(sample.nusPengganti || sample.nusPenggantiAwal || '');
  const [petugas, setPetugas] = useState<string>(sample.petugas || 'Erika');

  const prioCurrent = useMemo(() => {
    return sample ? getEffectiveKomoditasPrioritas(sample) : '';
  }, [sample]);

  const matchedCadangan = useMemo(() => {
    if (!nusPengganti) return null;
    return cadanganOptions.find(c => c.nus === nusPengganti.trim()) || null;
  }, [nusPengganti, cadanganOptions]);

  const prioCadangan = useMemo(() => {
    return matchedCadangan ? getEffectiveKomoditasPrioritas(matchedCadangan) : '';
  }, [matchedCadangan]);

  const isDifferentPrio = useMemo(() => {
    if (!prioCurrent || !prioCadangan) return null;
    return !areKomoditasEqual(prioCurrent, prioCadangan);
  }, [prioCurrent, prioCadangan]);

  useEffect(() => {
    if (sample) {
      setStatus(sample.progressStatus);
      setHasilFasih(sample.hasilPendataanFasih || mapSurveyStatusToFasih(sample.progressStatus));
      setTanggal(sample.tanggalCacah || new Date().toISOString().split('T')[0]);
      setCatatan(sample.catatanPetugas || sample.keteranganAwal || '');
      setNusPengganti(sample.nusPengganti || sample.nusPenggantiAwal || '');
      setPetugas(sample.petugas || 'Erika');
    }
  }, [sample]);

  const handleHasilFasihChange = (val: string) => {
    setHasilFasih(val);
    const mapped = mapFasihToSurveyStatus(val);
    setStatus(mapped);
  };

  const handleStatusChange = (newStatus: SurveyProgressStatus) => {
    setStatus(newStatus);
    setHasilFasih(mapSurveyStatusToFasih(newStatus));
  };

  const handleSave = () => {
    const isCompleted = status === 'SELESAI';
    onSave({
      progressStatus: status,
      hasilPendataanFasih: hasilFasih,
      isCompleted,
      tanggalCacah: status === 'SELESAI' ? (tanggal || new Date().toISOString().split('T')[0]) : undefined,
      catatanPetugas: catatan.trim(),
      nusPengganti: nusPengganti.trim(),
      petugas: petugas.trim(),
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  const isUtama = sample.statusSampel === 'U';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xl font-black text-emerald-400">
              NUS {sample.nus}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              isUtama ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {isUtama ? 'SAMPEL UTAMA (U)' : 'SAMPEL CADANGAN (C)'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              NKS: {sample.nks}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Respondent Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Nama Unit Usaha Pertanian (UTP)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {sample.namaUTP}
                </h3>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Kepala Rumah Tangga (KRT)
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {sample.namaKRT}
                </p>
                {sample.namaART && sample.namaART !== '-' && (
                  <p className="text-xs text-slate-500">ART: {sample.namaART}</p>
                )}
              </div>
            </div>

            {/* Address & Phone */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Wilayah:</span>
                <p className="font-semibold text-slate-800">{sample.desa}, {sample.kecamatan}</p>
                <p className="text-slate-600 mt-0.5">{sample.sls}</p>
                {sample.alamat && <p className="text-slate-400 italic mt-0.5">{sample.alamat}</p>}
              </div>

              <div>
                <span className="text-slate-500 font-medium">Kontak & Telepon:</span>
                {sample.noTelp ? (
                  <div className="flex items-center space-x-2 mt-1">
                    <a
                      href={`tel:${sample.noTelp}`}
                      className="inline-flex items-center font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-md hover:bg-blue-200"
                    >
                      <Phone className="w-3 h-3 mr-1" />
                      {sample.noTelp}
                    </a>
                    <a
                      href={`https://wa.me/${sample.noTelp.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md hover:bg-emerald-200"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Chat WhatsApp
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-400 italic mt-1">Tidak ada nomor telepon</p>
                )}
              </div>
            </div>

            {/* Coordinates */}
            {sample.latitude && sample.longitude && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-mono">
                    Lat: {sample.latitude}, Long: {sample.longitude}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${sample.latitude},${sample.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center font-bold text-rose-600 hover:text-rose-700"
                >
                  <span>Buka Peta Navigasi</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            )}
          </div>

          {/* Commodities */}
          <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-200/60 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Komoditas / Kegiatan Pertanian
            </span>
            {sample.komoditasPrioritas && sample.komoditasPrioritas !== '-' && (
              <div className="mt-1">
                <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                  Prioritas: {sample.komoditasPrioritas}
                </span>
              </div>
            )}
            <p className="mt-1.5 text-slate-700 font-medium leading-relaxed">
              {sample.komoditas}
            </p>
          </div>

          {/* Monitoring Status Form */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Update Status Monitoring Lapangan</span>
            </h4>

            {/* FASIH-SM Hasil Pendataan Integration Block */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Hasil Pendataan (FASIH-SM)
                  </label>
                </div>
                {sample.statusDokumenFasih && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500 text-white uppercase">
                    {sample.statusDokumenFasih}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Pilih status hasil wawancara dari aplikasi FASIH-SM. Sesuai ketentuan BPS: jika Sampel Utama berkode <strong>"1. Berhasil diwawancarai"</strong> maka Berhasil Dicacah, selain kode tersebut maka <strong>Tidak Berhasil Dicacah</strong> dan wajib diganti dengan Sampel Cadangan.
              </p>
              <select
                value={hasilFasih}
                onChange={(e) => handleHasilFasihChange(e.target.value)}
                className="w-full text-xs font-bold rounded-lg px-3 py-2 border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500"
              >
                {FASIH_HASIL_PENDATAAN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {isUtama && (
                <div>
                  {isFasihBerhasil(hasilFasih) || status === 'SELESAI' ? (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-1.5">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      <span>Sampel Utama Berhasil Dicacah / Sudah Dicacah</span>
                    </div>
                  ) : isFasihTerkendala(hasilFasih) || (status !== 'BELUM') ? (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                      <div className="font-bold flex items-center space-x-1.5 text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Sampel Utama Tidak Berhasil Dicacah</span>
                      </div>
                      <div className="text-amber-900 font-bold bg-amber-100 px-2 py-1 rounded">
                        ⚠️ Wajib Diganti dengan Sampel Cadangan pada kolom NUS Pengganti di bawah!
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Status Radio Buttons Aligned with FASIH-SM Categories */}
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Pilih status yang otomatis menyelaraskan Hasil Pendataan FASIH-SM dan Status Pencacahan:
              </span>

              {/* Kategori 1: Belum Diwawancara */}
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Kategori Belum Diwawancara (-)
                </span>
                <label className={`flex items-start p-2.5 rounded-lg border cursor-pointer transition-all ${
                  status === 'BELUM'
                    ? 'border-slate-500 bg-white ring-1 ring-slate-400 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="progressStatus"
                    value="BELUM"
                    checked={status === 'BELUM'}
                    onChange={() => {
                      setStatus('BELUM');
                      setHasilFasih('-');
                    }}
                    className="mt-0.5 text-slate-600 focus:ring-slate-500"
                  />
                  <div className="ml-2.5">
                    <span className="block text-xs font-bold text-slate-800">
                      - Belum Diwawancara
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Sampel belum dikunjungi atau kuesioner belum diwawancarai
                    </span>
                  </div>
                </label>
              </div>

              {/* Kategori 2: Berhasil Diwawancarai */}
              <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Kategori Berhasil Diwawancarai (Kode 1)
                </span>
                <label className={`flex items-start p-2.5 rounded-lg border cursor-pointer transition-all ${
                  status === 'SELESAI'
                    ? 'border-emerald-600 bg-emerald-50/90 ring-1 ring-emerald-600 shadow-xs'
                    : 'border-emerald-200 bg-white hover:bg-emerald-50/50'
                }`}>
                  <input
                    type="radio"
                    name="progressStatus"
                    value="SELESAI"
                    checked={status === 'SELESAI'}
                    onChange={() => {
                      setStatus('SELESAI');
                      setHasilFasih('1. Berhasil diwawancarai');
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="ml-2.5">
                    <span className="block text-xs font-bold text-emerald-900">
                      1. Berhasil diwawancarai (Selesai Dicacah)
                    </span>
                    <span className="block text-[11px] text-emerald-700 mt-0.5">
                      Responden berhasil diwawancarai lengkap dan dokumen siap disubmit
                    </span>
                  </div>
                </label>
              </div>

              {/* Kategori 3: Tidak Berhasil Diwawancarai (Kode 2 sampai 5) */}
              <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                    Kategori Tidak Berhasil Diwawancarai (Kode 2 - 5)
                  </span>
                  {isUtama && (
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      ⚠️ Wajib Diganti Cadangan
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { fasihVal: '2. Responden menolak', statusVal: 'MENOLAK', label: '2. Responden menolak', desc: 'Responden menolak diwawancarai' },
                    { fasihVal: '3. Responden tidak dapat ditemui/dihubungi', statusVal: 'TIDAK_DITEMUKAN', label: '3. Tidak dapat ditemui / dihubungi', desc: 'Sudah dikunjungi tapi tidak dapat dihubungi' },
                    { fasihVal: '4. Pindah/Tidak Ditemukan', statusVal: 'TIDAK_DITEMUKAN', label: '4. Pindah / Tidak Ditemukan', desc: 'Responden pindah / alamat tidak ditemukan' },
                    { fasihVal: '5. Bukan Usaha Pertanian Lagi', statusVal: 'NON_AKTIF', label: '5. Bukan Usaha Pertanian Lagi', desc: 'Usaha tani alih fungsi atau sudah non-aktif' },
                  ].map((item) => (
                    <label
                      key={item.fasihVal}
                      className={`flex items-start p-2.5 rounded-lg border cursor-pointer transition-all ${
                        hasilFasih === item.fasihVal
                          ? 'border-rose-600 bg-rose-50/90 ring-1 ring-rose-500 shadow-xs'
                          : 'border-rose-200 bg-white hover:bg-rose-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="progressStatus"
                        value={item.fasihVal}
                        checked={hasilFasih === item.fasihVal}
                        onChange={() => {
                          setHasilFasih(item.fasihVal);
                          setStatus(item.statusVal as SurveyProgressStatus);
                        }}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="ml-2">
                        <span className="block text-xs font-bold text-rose-900">
                          {item.label}
                        </span>
                        <span className="block text-[10px] text-rose-700 mt-0.5">
                          {item.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Tanggal Pencacahan */}
            {status === 'SELESAI' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pencacahan
                </label>
                <div className="relative max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* NUS Pengganti (especially for cadangan or if utama is replaced) */}
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
              <label className="block text-xs font-bold text-amber-900 mb-1">
                {isUtama ? 'Digantikan oleh Sampel Cadangan (NUS Pengganti)' : 'Menggantikan Sampel Utama (NUS Utama yang Diganti)'}
              </label>
              <p className="text-[11px] text-slate-600 mb-2">
                {isUtama 
                  ? 'Jika sampel utama ini menolak/tidak ditemukan, isi nomor urut sampel cadangan yang dipakai.' 
                  : 'Jika sampel cadangan ini digunakan, catat nomor urut sampel utama yang digantikannya.'}
              </p>
              
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={nusPengganti}
                  onChange={(e) => setNusPengganti(e.target.value)}
                  placeholder="Contoh: 285 atau 296"
                  className="px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none w-48 font-mono"
                />

                {/* Quick suggestions from cadangan list */}
                {isUtama && cadanganOptions.length > 0 && (
                  <select
                    onChange={(e) => setNusPengganti(e.target.value)}
                    className="text-xs bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="">Pilih dari Cadangan NKS {sample.nks}...</option>
                    {cadanganOptions
                      .filter(c => c.nks === sample.nks)
                      .map(c => (
                        <option key={c.id} value={c.nus}>
                          NUS {c.nus} - {c.namaUTP} ({c.progressStatus})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Real-time Commodity Comparison Feedback */}
              {matchedCadangan && (
                <div className={`mt-2.5 p-2 rounded-lg text-xs border ${
                  isDifferentPrio 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                    {isDifferentPrio ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Komoditas Prioritas Berbeda ({prioCurrent} ≠ {prioCadangan})</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Komoditas Prioritas Sama ({prioCurrent})</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5 text-slate-600">
                    {isDifferentPrio 
                      ? 'Pasangan ini memenuhi syarat dan akan dimunculkan di Berita Acara Penggantian Subsektor Berbeda.' 
                      : 'Sesuai ketentuan, penggantian dengan komoditas yang sama tidak perlu dimunculkan dalam Berita Acara.'}
                  </p>
                </div>
              )}

              {onOpenBeritaAcara && (
                <div className="mt-2.5 pt-2 border-t border-amber-200/50 flex items-center justify-between text-xs">
                  <span className="text-amber-800 text-[11px]">Format Resmi Penggantian:</span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSave();
                      onOpenBeritaAcara();
                    }}
                    className="font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-amber-300 hover:bg-amber-100/60 px-2 py-1 rounded transition-colors text-[11px] cursor-pointer"
                  >
                    Buka Berita Acara Penggantian →
                  </button>
                </div>
              )}
            </div>

            {/* Catatan Lapangan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Petugas Lapangan
              </label>
              <textarea
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Tuliskan catatan kondisi lapangan, kendala responden, hasil panen, alasan penggantian, waktu pertemuan, dsb..."
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              ></textarea>
            </div>

            {/* Petugas assignment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Petugas Lapangan
              </label>
              <input
                type="text"
                value={petugas}
                onChange={(e) => setPetugas(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none w-64"
              />
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Simpan Perubahan
          </button>
        </div>

      </div>
    </div>
  );
};
