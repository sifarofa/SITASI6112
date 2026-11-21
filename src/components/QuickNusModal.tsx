import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, RotateCcw, AlertTriangle, CheckCircle2, UserCheck, ArrowRight, Layers } from 'lucide-react';
import { SampleItem } from '../types/sitasi';
import { getEffectiveKomoditasPrioritas, areKomoditasEqual, detectSubsektor } from '../utils/subsektorHelper';

interface QuickNusModalProps {
  sample: SampleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, newNus: string) => void;
  onReset: (id: string) => void;
  allSamples: SampleItem[];
}

export const QuickNusModal: React.FC<QuickNusModalProps> = ({
  sample,
  isOpen,
  onClose,
  onSave,
  onReset,
  allSamples,
}) => {
  const isUtama = sample?.statusSampel === 'U';
  const [selectedNus, setSelectedNus] = useState<string>('');
  const [customNus, setCustomNus] = useState<string>('');

  useEffect(() => {
    if (!sample) return;
    const current = sample.nusPengganti || sample.nusPenggantiAwal || '';
    setSelectedNus(current);
    setCustomNus(current);
  }, [sample]);

  // Candidates in same NKS
  const candidateOptions = useMemo(() => {
    if (!sample) return [];
    if (isUtama) {
      // Find Cadangan in same NKS
      return allSamples.filter(s => s.statusSampel === 'C' && s.nks === sample.nks);
    } else {
      // Find Utama in same NKS that this Cadangan could replace
      return allSamples.filter(s => s.statusSampel === 'U' && s.nks === sample.nks);
    }
  }, [allSamples, sample, isUtama]);

  if (!isOpen || !sample) return null;

  const prioSample = getEffectiveKomoditasPrioritas(sample);
  const subsektorSample = detectSubsektor(sample.komoditasPrioritas, sample.komoditas);

  const handleSave = () => {
    const nusToSave = (customNus.trim() || selectedNus.trim());
    onSave(sample.id, nusToSave);
    onClose();
  };

  const handleReset = () => {
    onReset(sample.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {sample.nusPengganti ? 'Ubah / Reset NUS Pengganti' : 'Pilih NUS Pengganti Langsung'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Sampel {isUtama ? 'Utama' : 'Cadangan'}: <strong className="text-white">NUS {sample.nus}</strong> ({sample.namaUTP})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {/* Target Sample Summary Card */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                {sample.namaUTP} ({sample.namaKRT ? `KRT: ${sample.namaKRT}` : ''})
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isUtama ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isUtama ? 'Sampel Utama' : 'Sampel Cadangan'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              NKS: <strong className="text-slate-800">{sample.nks}</strong> • Desa: {sample.desa} • Petugas: {sample.petugas}
            </div>
            <div className="text-[11px] text-slate-600">
              Komoditas Prioritas: <strong className="text-emerald-800">{prioSample}</strong> ({subsektorSample})
            </div>
            {sample.nusPengganti && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-amber-900 bg-amber-100/70 px-2 py-1 rounded border border-amber-200">
                <span>Saat ini terisi Pengganti: <strong>NUS {sample.nusPengganti}</strong></span>
                <span className="text-[10px] text-amber-700">Tersimpan</span>
              </div>
            )}
          </div>

          {/* Quick Select Candidates in NKS */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              {isUtama ? 'Pilih dari Sampel Cadangan NKS ' + sample.nks + ':' : 'Pilih Sampel Utama yang Digantikan:'}
            </label>

            {candidateOptions.length > 0 ? (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                {candidateOptions.map((cand) => {
                  const prioCand = getEffectiveKomoditasPrioritas(cand);
                  const isDiff = !areKomoditasEqual(prioSample, prioCand);
                  const isSelected = selectedNus === cand.nus;

                  return (
                    <div
                      key={cand.id}
                      onClick={() => {
                        setSelectedNus(cand.nus);
                        setCustomNus(cand.nus);
                      }}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            NUS {cand.nus}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {cand.namaUTP}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Komoditas: <strong className="text-slate-700">{prioCand}</strong>
                          <span className="ml-1.5 font-bold">
                            {isDiff ? (
                              <span className="text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded text-[10px]">
                                ✓ Beda Komoditas (Berita Acara)
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded text-[10px]">
                                Sama ({prioCand})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          cand.progressStatus === 'SELESAI' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {cand.progressStatus === 'SELESAI' ? '✓ Selesai' : cand.progressStatus}
                        </span>
                        {isSelected && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center justify-end">
                            <Check className="w-3 h-3 mr-0.5" /> Terpilih
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Tidak ada sampel {isUtama ? 'cadangan' : 'utama'} lain pada NKS {sample.nks}.
              </p>
            )}
          </div>

          {/* Manual Input Alternative */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Atau Ketik Nomor Urut Sampel (NUS) Secara Manual:
            </label>
            <input
              type="text"
              value={customNus}
              onChange={(e) => {
                setCustomNus(e.target.value);
                setSelectedNus(e.target.value);
              }}
              placeholder="Contoh: 286"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          
          {/* Reset Button (If already has replacement) */}
          <div>
            {sample.nusPengganti && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-300 transition-colors cursor-pointer"
                title="Hapus dan reset NUS Pengganti"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-rose-600" />
                <span>Reset / Hapus Pengganti</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!customNus.trim() && !selectedNus.trim()}
              className="inline-flex items-center text-xs font-bold px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Simpan Pengganti</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
