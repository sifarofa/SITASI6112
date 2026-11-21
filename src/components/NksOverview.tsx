import React from 'react';
import { MapPin, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { SampleItem } from '../types/sitasi';

interface NksOverviewProps {
  samples: SampleItem[];
  activePetugas: string;
  onClose?: () => void;
}

export const NksOverview: React.FC<NksOverviewProps> = ({
  samples,
  activePetugas,
  onClose,
}) => {
  const targetSamples = activePetugas === 'all' 
    ? samples 
    : samples.filter(s => s.petugas === activePetugas);

  // Referenced Cadangan NUS from Utama samples
  const referencedCadanganNus = new Set<string>();
  targetSamples.forEach(s => {
    if (s.statusSampel === 'U') {
      if (s.nusPengganti && s.nusPengganti.trim()) {
        referencedCadanganNus.add(s.nusPengganti.trim());
      } else if (s.nusPenggantiAwal && s.nusPenggantiAwal.trim()) {
        referencedCadanganNus.add(s.nusPenggantiAwal.trim());
      }
    }
  });

  // Group by NKS
  const nksMap = new Map<string, {
    nks: string;
    desa: string;
    slsCount: number;
    totalU: number;
    selesaiU: number;
    selesaiCPengganti: number;
    totalC: number;
    selesaiC: number;
    officers: Set<string>;
  }>();

  targetSamples.forEach(s => {
    if (!nksMap.has(s.nks)) {
      nksMap.set(s.nks, {
        nks: s.nks,
        desa: s.desa,
        slsCount: 0,
        totalU: 0,
        selesaiU: 0,
        selesaiCPengganti: 0,
        totalC: 0,
        selesaiC: 0,
        officers: new Set<string>(),
      });
    }
    const item = nksMap.get(s.nks)!;
    item.officers.add(s.petugas);
    if (s.statusSampel === 'U') {
      item.totalU++;
      if (s.progressStatus === 'SELESAI') item.selesaiU++;
    } else {
      item.totalC++;
      if (s.progressStatus === 'SELESAI') {
        item.selesaiC++;
        const isPengganti = Boolean(
          (s.nusPengganti && s.nusPengganti.trim()) ||
          (s.nusPenggantiAwal && s.nusPenggantiAwal.trim()) ||
          referencedCadanganNus.has(s.nus.trim())
        );
        if (isPengganti) item.selesaiCPengganti++;
      }
    }
  });

  const nksList = Array.from(nksMap.values()).sort((a, b) => a.nks.localeCompare(b.nks));

  if (nksList.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Progres per NKS (Nomor Kode Sampel) & Desa
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                {nksList.length} NKS Terdaftar
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi pencacahan berdasarkan wilayah blok sensus dan desa {activePetugas !== 'all' ? `(Petugas: ${activePetugas})` : '(Seluruh Petugas)'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-auto font-medium"
          >
            Tutup Panel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {nksList.map((item) => {
          const progressTotal = item.selesaiU + item.selesaiCPengganti;
          const uPercent = item.totalU > 0 ? Math.round((progressTotal / item.totalU) * 100) : 0;
          const isAllDone = item.totalU > 0 && progressTotal >= item.totalU;

          return (
            <div 
              key={item.nks} 
              className={`rounded-xl p-4 border transition-all ${
                isAllDone 
                  ? 'bg-emerald-50/40 border-emerald-300/80 shadow-xs' 
                  : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                      NKS {item.nks}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]" title={item.desa}>
                      {item.desa}
                    </span>
                  </div>
                  {activePetugas === 'all' && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      Petugas: {Array.from(item.officers).join(', ')}
                    </div>
                  )}
                </div>

                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  isAllDone 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : uPercent > 50 
                    ? 'bg-teal-100 text-teal-800' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {uPercent}% Target
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isAllDone ? 'bg-emerald-600' : 'bg-teal-600'
                    }`} 
                    style={{ width: `${Math.min(100, uPercent)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span>
                    Progress: <strong className="text-slate-900">{progressTotal}</strong> / {item.totalU}
                    <span className="text-[10px] text-slate-400 ml-1">
                      (U: {item.selesaiU}, C.Ganti: {item.selesaiCPengganti})
                    </span>
                  </span>
                  <span>
                    Cadangan: <strong className="text-slate-900">{item.selesaiC}</strong> / {item.totalC}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
