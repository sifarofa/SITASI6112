import React from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { SampleItem, PetugasSummary } from '../types/sitasi';

interface PrintViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleItem[];
  activePetugas: string;
  petugasSummary?: PetugasSummary;
}

export const PrintViewModal: React.FC<PrintViewModalProps> = ({
  isOpen,
  onClose,
  samples,
  activePetugas,
  petugasSummary,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const utama = samples.filter(s => s.statusSampel === 'U');
  const cadangan = samples.filter(s => s.statusSampel === 'C');
  const selesaiUtama = utama.filter(s => s.progressStatus === 'SELESAI').length;
  const selesaiCadangan = cadangan.filter(s => s.progressStatus === 'SELESAI').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Pratinjau Lembar Monitoring Lapangan (Siap Cetak)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Cetak Sekarang
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible text-slate-900">
          
          {/* Header Banner */}
          <div className="border-b-2 border-slate-800 pb-4 text-center">
            <div className="text-[11px] font-bold tracking-widest uppercase text-slate-600">
              BADAN PUSAT STATISTIK
            </div>
            <h1 className="text-base font-black tracking-tight uppercase text-slate-900 mt-0.5">
              LEMBAR KONTROL & MONITORING PENCACAHAN SAMPEL
            </h1>
            <div className="text-xs font-bold text-emerald-800 mt-0.5">
              SURVEI PERTANIAN TERINTEGRASI (SITASI) 2026
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Provinsi: <strong>KALIMANTAN BARAT</strong> • Kabupaten/Kota: <strong>KUBU RAYA</strong> • Kecamatan: <strong>RASAU JAYA</strong>
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Petugas Lapangan</span>
              <span className="font-bold text-slate-900">{activePetugas === 'all' ? 'Semua Petugas' : activePetugas}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Sampel</span>
              <span className="font-bold text-slate-900">{samples.length} Sampel</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Capaian Sampel Utama</span>
              <span className="font-bold text-emerald-700">{selesaiUtama} / {utama.length} ({utama.length > 0 ? Math.round((selesaiUtama / utama.length) * 100) : 0}%)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Cadangan Terpakai</span>
              <span className="font-bold text-amber-700">{selesaiCadangan} / {cadangan.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 w-8 text-center border-r border-slate-200">No</th>
                  <th className="p-2 w-14 border-r border-slate-200">Petugas</th>
                  <th className="p-2 w-16 border-r border-slate-200">NKS</th>
                  <th className="p-2 w-12 border-r border-slate-200 text-center">NUS</th>
                  <th className="p-2 w-10 border-r border-slate-200 text-center">Tipe</th>
                  <th className="p-2 min-w-[140px] border-r border-slate-200">Nama UTP / KRT</th>
                  <th className="p-2 min-w-[120px] border-r border-slate-200">Desa / SLS</th>
                  <th className="p-2 min-w-[120px] border-r border-slate-200">Komoditas</th>
                  <th className="p-2 w-20 border-r border-slate-200 text-center">Status</th>
                  <th className="p-2 w-20 border-r border-slate-200 text-center">Tgl Cacah</th>
                  <th className="p-2 min-w-[100px]">NUS Pengganti / Ket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {samples.map((s, idx) => (
                  <tr key={s.id} className={s.progressStatus === 'SELESAI' ? 'bg-emerald-50/20' : ''}>
                    <td className="p-1.5 text-center font-medium border-r border-slate-200">{idx + 1}</td>
                    <td className="p-1.5 font-medium border-r border-slate-200">{s.petugas}</td>
                    <td className="p-1.5 font-mono border-r border-slate-200">{s.nks}</td>
                    <td className="p-1.5 font-mono font-bold text-center border-r border-slate-200">{s.nus}</td>
                    <td className="p-1.5 text-center font-bold border-r border-slate-200">
                      <span className={s.statusSampel === 'U' ? 'text-emerald-700' : 'text-amber-700'}>
                        {s.statusSampel}
                      </span>
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{s.namaUTP}</div>
                      <div className="text-[10px] text-slate-500">KRT: {s.namaKRT} {s.noTelp && `(${s.noTelp})`}</div>
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <div className="font-medium text-slate-800">{s.desa}</div>
                      <div className="text-[10px] text-slate-500">{s.sls}</div>
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <div className="line-clamp-2">{s.komoditasPrioritas && s.komoditasPrioritas !== '-' ? `[${s.komoditasPrioritas}] ` : ''}{s.komoditas}</div>
                    </td>
                    <td className="p-1.5 text-center font-semibold border-r border-slate-200">
                      {s.progressStatus === 'SELESAI' ? 'SELESAI' : s.progressStatus}
                    </td>
                    <td className="p-1.5 text-center font-mono text-[10px] border-r border-slate-200">
                      {s.tanggalCacah || '-'}
                    </td>
                    <td className="p-1.5 text-[10px]">
                      {s.nusPengganti && <div><strong>Ganti:</strong> {s.nusPengganti}</div>}
                      {s.catatanPetugas && <div className="text-slate-600 italic">{s.catatanPetugas}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures for Field Supervisor / BPS */}
          <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="text-slate-500">Mengetahui,</p>
              <p className="font-bold text-slate-800 mt-0.5">Pengawas Lapangan (PML)</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-slate-900">( .................................................... )</p>
              <p className="text-[10px] text-slate-400">NIP.</p>
            </div>
            <div>
              <p className="text-slate-500">Kubu Raya, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold text-slate-800 mt-0.5">Petugas Pencacah Lapangan (PPL)</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-slate-900">{activePetugas === 'all' ? '( Petugas Lapangan )' : `( ${activePetugas} )`}</p>
              <p className="text-[10px] text-slate-400">PPL SITASI 2026</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
