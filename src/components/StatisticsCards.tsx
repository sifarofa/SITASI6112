import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Target, 
  Layers, 
  MapPin,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  SampleItem, 
  isFasihBerhasil, 
  isFasihTerkendala,
  isSampleBelumDiwawancara,
  isSampleBerhasil,
  isSampleTidakBerhasil
} from '../types/sitasi';

interface StatisticsCardsProps {
  samples: SampleItem[];
  filteredSamples: SampleItem[];
  activePetugas: string;
  onOpenBeritaAcara?: () => void;
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({
  samples,
  filteredSamples,
  activePetugas,
  onOpenBeritaAcara,
}) => {
  const targetSamples = activePetugas === 'all' ? samples : samples.filter(s => s.petugas === activePetugas);

  // Referenced cadangan by utama samples
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

  const total = targetSamples.length;
  const utama = targetSamples.filter(s => s.statusSampel === 'U');
  const cadangan = targetSamples.filter(s => s.statusSampel === 'C');

  // Kategori 1: Berhasil Diwawancarai (Kode 1 / SELESAI)
  const selesaiUtama = utama.filter(s => isSampleBerhasil(s)).length;

  // Sampel cadangan yang digunakan menjadi pengganti (ditunjukkan adanya NUS Pengganti)
  const cadanganPengganti = cadangan.filter(s => {
    const hasOwnNusPengganti = Boolean(
      (s.nusPengganti && s.nusPengganti.trim()) || 
      (s.nusPenggantiAwal && s.nusPenggantiAwal.trim())
    );
    const isReferencedByUtama = referencedCadanganNus.has(s.nus.trim());
    return hasOwnNusPengganti || isReferencedByUtama;
  });

  const selesaiCadanganPengganti = cadanganPengganti.filter(s => isSampleBerhasil(s)).length;
  const selesaiCadangan = cadangan.filter(s => isSampleBerhasil(s)).length;

  // Aturan BPS: Progress Pendataan = Sampel Utama Selesai + Sampel Cadangan Pengganti Selesai
  const progressPendataan = selesaiUtama + selesaiCadanganPengganti;
  const targetUtama = utama.length;
  const persentaseProgress = targetUtama > 0 ? Math.round((progressPendataan / targetUtama) * 100) : 0;

  const selesaiTotal = selesaiUtama + selesaiCadangan;

  // Kategori 2: Belum Diwawancara (-) - Kategori tersendiri (hilangkan status Draft)
  const belumDiwawancaraTotal = targetSamples.filter(s => isSampleBelumDiwawancara(s)).length;
  const belumDiwawancaraUtama = utama.filter(s => isSampleBelumDiwawancara(s)).length;

  // Kategori 3: Tidak Berhasil Diwawancarai (Kode 2 sampai 5 - Wajib ganti Cadangan jika Utama)
  const menolak = targetSamples.filter(s => (s.hasilPendataanFasih?.startsWith('2.') || s.progressStatus === 'MENOLAK')).length;
  const tidakDitemukan = targetSamples.filter(s => (s.hasilPendataanFasih?.startsWith('3.') || s.hasilPendataanFasih?.startsWith('4.') || s.progressStatus === 'TIDAK_DITEMUKAN')).length;
  const nonAktif = targetSamples.filter(s => (s.hasilPendataanFasih?.startsWith('5.') || s.progressStatus === 'NON_AKTIF')).length;
  const totalTidakBerhasil = targetSamples.filter(s => isSampleTidakBerhasil(s)).length;

  // Khusus Sampel Utama:
  const utamaBerhasil = selesaiUtama;
  const utamaTidakBerhasil = utama.filter(s => isSampleTidakBerhasil(s)).length;
  const utamaTerkendalaSudahDiganti = utama.filter(s => isSampleTidakBerhasil(s) && Boolean(s.nusPengganti)).length;
  const utamaTerkendalaBelumDiganti = Math.max(0, utamaTidakBerhasil - utamaTerkendalaSudahDiganti);

  const persentaseTotal = total > 0 ? Math.round((selesaiTotal / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 4 Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Progress Pendataan (Utama Selesai + Cadangan Pengganti Selesai) */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Progress Pendataan
            </span>
            <div className="p-2 rounded-lg bg-emerald-100/80 text-emerald-700">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {progressPendataan}
              </span>
              <span className="text-sm font-medium text-slate-500 ml-1.5">
                / {targetUtama} Target
              </span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              persentaseProgress >= 100 
                ? 'bg-emerald-100 text-emerald-800' 
                : persentaseProgress > 50 
                ? 'bg-teal-100 text-teal-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {persentaseProgress}% Selesai
            </span>
          </div>
          <div className="mt-3.5">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, persentaseProgress)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>Utama: <strong className="text-slate-800">{selesaiUtama}</strong> | Pengganti: <strong className="text-slate-800">{selesaiCadanganPengganti}</strong></span>
              <span>Sisa: {Math.max(0, targetUtama - progressPendataan)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Sampel Cadangan & Pengganti */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cadangan Pengganti
            </span>
            <div className="p-2 rounded-lg bg-amber-100/80 text-amber-700">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {selesaiCadanganPengganti}
              </span>
              <span className="text-sm font-medium text-slate-500 ml-1.5">
                / {cadanganPengganti.length} Pengganti
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              {cadangan.length} Total C
            </span>
          </div>
          <div className="mt-3.5">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${cadanganPengganti.length > 0 ? (selesaiCadanganPengganti / cadanganPengganti.length) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>Pengganti Selesai: {selesaiCadanganPengganti}</span>
              <span>Tersedia: {cadangan.length - cadanganPengganti.length}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Selesai & Progress Keseluruhan */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Pencacahan
            </span>
            <div className="p-2 rounded-lg bg-blue-100/80 text-blue-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {selesaiTotal}
              </span>
              <span className="text-sm font-medium text-slate-500 ml-1.5">
                / {total} Total
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
              {persentaseTotal}% Total
            </span>
          </div>
          <div className="mt-3.5">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${persentaseTotal}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>Belum Diwawancara: <strong>{belumDiwawancaraTotal}</strong></span>
              <span className="text-emerald-600 font-semibold">{selesaiTotal} Berhasil</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tidak Berhasil Diwawancarai (Kode 2 sampai 5) */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tidak Berhasil (Kode 2 - 5)
            </span>
            <div className="p-2 rounded-lg bg-rose-100/80 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                {totalTidakBerhasil}
              </span>
              <span className="text-sm font-medium text-slate-500 ml-1.5">
                / {total} Total
              </span>
            </div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Wajib Cadangan
            </span>
          </div>
          <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">
              Menolak: {menolak}
            </span>
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
              Pindah/Kontak: {tidakDitemukan}
            </span>
            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
              Alih: {nonAktif}
            </span>
          </div>

          {onOpenBeritaAcara && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Ada sampel yang diganti?</span>
              <button
                type="button"
                onClick={onOpenBeritaAcara}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Buat Berita Acara</span>
                <span className="text-xs">→</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
