import React from 'react';
import { PetugasSummary } from '../types/sitasi';
import { UserCheck, Award, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface PetugasOverviewProps {
  petugasList: PetugasSummary[];
  activePetugas: string;
  onSelectPetugas: (nama: string) => void;
  onClose?: () => void;
}

export const PetugasOverview: React.FC<PetugasOverviewProps> = ({
  petugasList,
  activePetugas,
  onSelectPetugas,
  onClose,
}) => {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Progres Masing-Masing Petugas Lapangan
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan capaian sampel utama & cadangan antar petugas SITASI 2026
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-slate-500 font-medium">
            {petugasList.length} Petugas Terdaftar
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Tutup Panel
            </button>
          )}
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {petugasList.map((p, idx) => {
          const isActive = activePetugas === p.nama;
          const isTop = idx === 0 && p.persentaseUtama > 0;

          return (
            <div
              key={p.nama}
              className={`rounded-xl p-4 border transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
              }`}
              onClick={() => onSelectPetugas(p.nama)}
            >
              {isTop && (
                <div className="absolute top-2 right-2 flex items-center space-x-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  <Award className="w-3 h-3 text-amber-600" />
                  <span>Progres Terdepan</span>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                      {p.nama.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {p.nama}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {p.totalSampel} Total Sampel ({p.totalUtama} Utama, {p.totalCadangan} Cadangan)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Pendataan: Utama + Cadangan Pengganti */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Progress Pendataan</span>
                  <span className="font-bold text-emerald-700">
                    {p.selesaiProgress} / {p.totalUtama} ({p.persentaseProgress}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, p.persentaseProgress)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Utama: {p.selesaiUtama}</span>
                  <span>Cadangan Pengganti: {p.selesaiCadanganPengganti}</span>
                </div>
              </div>

              {/* Badges details */}
              <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    {p.selesaiProgress} Tercapai
                  </span>
                  <span className="flex items-center text-slate-500">
                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                    {p.belumTotal} Belum
                  </span>
                  {p.masalahTotal > 0 && (
                    <span className="flex items-center text-rose-600">
                      <AlertCircle className="w-3 h-3 mr-1 text-rose-500" />
                      {p.masalahTotal} Kendala
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-0.5 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPetugas(p.nama);
                  }}
                >
                  <span>{isActive ? 'Aktif' : 'Pilih'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
