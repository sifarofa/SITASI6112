import React from 'react';
import { UserCheck, MapPin, SlidersHorizontal, EyeOff, Check } from 'lucide-react';

export type ProgressViewOption = 'none' | 'petugas' | 'nks' | 'both';

interface ProgressViewFilterProps {
  currentView: ProgressViewOption;
  onChangeView: (view: ProgressViewOption) => void;
  petugasCount: number;
  nksCount: number;
}

export const ProgressViewFilter: React.FC<ProgressViewFilterProps> = ({
  currentView,
  onChangeView,
  petugasCount,
  nksCount,
}) => {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      
      {/* Title & Description */}
      <div className="flex items-center space-x-2.5">
        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Filter Tampilan Progres:
          </span>
          <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
            Pilih panel progres yang ingin dimunculkan
          </span>
        </div>
      </div>

      {/* Filter Selector & Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Dropdown format for mobile & direct selection */}
        <div className="relative sm:hidden w-full">
          <select
            value={currentView}
            onChange={(e) => onChangeView(e.target.value as ProgressViewOption)}
            className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 cursor-pointer focus:ring-2 focus:ring-emerald-500"
          >
            <option value="none">Sembunyikan Semua Progres (Fokus Checklist)</option>
            <option value="petugas">👥 Progres Masing-Masing Petugas Lapangan ({petugasCount})</option>
            <option value="nks">🗺️ Progres per NKS (Nomor Kode Sampel) & Desa ({nksCount})</option>
            <option value="both">📊 Tampilkan Keduanya (Petugas + NKS & Desa)</option>
          </select>
        </div>

        {/* Desktop interactive filter pill buttons */}
        <div className="hidden sm:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          
          {/* None button */}
          <button
            type="button"
            onClick={() => onChangeView('none')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              currentView === 'none'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Sembunyikan</span>
          </button>

          {/* Petugas Progress Button */}
          <button
            type="button"
            onClick={() => {
              if (currentView === 'petugas') onChangeView('none');
              else if (currentView === 'nks') onChangeView('both');
              else onChangeView('petugas');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              currentView === 'petugas' || currentView === 'both'
                ? 'bg-teal-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Progres Petugas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              currentView === 'petugas' || currentView === 'both'
                ? 'bg-teal-800/80 text-teal-100'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {petugasCount}
            </span>
          </button>

          {/* NKS Progress Button */}
          <button
            type="button"
            onClick={() => {
              if (currentView === 'nks') onChangeView('none');
              else if (currentView === 'petugas') onChangeView('both');
              else onChangeView('nks');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              currentView === 'nks' || currentView === 'both'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Progres per NKS & Desa</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              currentView === 'nks' || currentView === 'both'
                ? 'bg-emerald-800/80 text-emerald-100'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {nksCount}
            </span>
          </button>

          {/* Both button */}
          <button
            type="button"
            onClick={() => onChangeView('both')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              currentView === 'both'
                ? 'bg-slate-900 text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Semua Progres</span>
          </button>

        </div>

      </div>

    </div>
  );
};
