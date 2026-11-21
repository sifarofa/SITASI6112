import React from 'react';
import { 
  ClipboardCheck, 
  Upload, 
  FileSpreadsheet, 
  Printer, 
  UserPlus, 
  Users, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  FileCheck,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { PetugasSummary, UserAuthSession } from '../types/sitasi';
import { OfficerSelect } from './OfficerSelect';
import { GoogleIcon } from './GoogleIcon';

interface HeaderProps {
  petugasList: PetugasSummary[];
  activePetugas: string;
  onSelectPetugas: (petugas: string) => void;
  onOpenUpload: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onExportRekapOnly?: () => void;
  onExportRekapCSV?: () => void;
  onOpenPrint: () => void;
  onOpenBeritaAcara: () => void;
  onAddDemoOfficers: () => void;
  onResetData: () => void;
  hasDemoOfficers: boolean;
  isFullscreen?: boolean;
  orientation?: 'landscape' | 'portrait';
  onToggleFullscreen?: () => void;
  authSession?: UserAuthSession;
  onOpenAccessModal?: () => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  petugasList,
  activePetugas,
  onSelectPetugas,
  onOpenUpload,
  onExportExcel,
  onExportCSV,
  onExportRekapOnly,
  onExportRekapCSV,
  onOpenPrint,
  onOpenBeritaAcara,
  onAddDemoOfficers,
  onResetData,
  hasDemoOfficers,
  isFullscreen = false,
  orientation = 'landscape',
  onToggleFullscreen,
  authSession,
  onOpenAccessModal,
  onOpenLoginModal,
  onLogout,
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const activeSummary = petugasList.find(p => p.nama === activePetugas);

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/40 shrink-0">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SITASI 2026 • BPS
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Kab. Kubu Raya
                </span>
                {isFullscreen && (
                  <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    LAYAR PENUH ({orientation === 'landscape' ? 'LEBAR' : 'TEGAK'})
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Monitoring Progres Petugas Lapangan
              </h1>
            </div>
          </div>

          {/* Officer Selector & Action Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Officer Switcher with searchable input */}
            <OfficerSelect
              petugasList={petugasList}
              activePetugas={activePetugas}
              onSelectPetugas={onSelectPetugas}
            />

            {/* AUTH / LOGIN SECTION:
                1. Jika Login sebagai Akun Pemilik (sifarofatunnisa24@gmail.com): 
                   -> Tombol '👑 Akun Pemilik' TAMPAK dan DAPAT DIAKSES
                2. Jika Login dengan Akun Google Lainnya:
                   -> Tombol 'Akun Pemilik' TIDAK NAMPAK sama sekali
                   -> Menampilkan info Akun Google login & badge 'Hanya Lihat' + tombol 'Keluar'
                3. Jika Belum Login:
                   -> Tombol 'Akun Pemilik' TIDAK NAMPAK
                   -> Menampilkan tombol 'Login Akun Google'
            */}
            {authSession?.role === 'owner' ? (
              onOpenAccessModal && (
                <button
                  onClick={onOpenAccessModal}
                  className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 ring-1 ring-amber-400/30 transition-all cursor-pointer shadow-xs"
                  title="Akun Pemilik (sifarofatunnisa24@gmail.com). Klik untuk mengelola izin dan pengaturan."
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  <span>👑 Akun Pemilik</span>
                </button>
              )
            ) : authSession?.email ? (
              <div className="inline-flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs shadow-xs">
                <GoogleIcon className="w-3.5 h-3.5" />
                <span className="font-medium max-w-[140px] truncate text-slate-200" title={authSession.email}>
                  {authSession.email}
                </span>
                <span className="text-[10px] bg-slate-700 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                  Hanya Lihat
                </span>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="text-slate-400 hover:text-rose-400 text-xs font-semibold ml-1 cursor-pointer transition-colors"
                    title="Keluar / Ganti Akun Google"
                  >
                    Keluar
                  </button>
                )}
              </div>
            ) : (
              onOpenLoginModal && (
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 shadow-sm border border-slate-200 transition-all cursor-pointer"
                  title="Masuk dengan Akun Google untuk mengakses dashboard"
                >
                  <GoogleIcon className="w-3.5 h-3.5 mr-1.5" />
                  <span>Login Akun Google</span>
                </button>
              )
            )}

            {/* Quick Officer Demo Button if only 1 exists */}
            {!hasDemoOfficers && (
              <button
                onClick={onAddDemoOfficers}
                title="Tambahkan petugas pembanding untuk simulasi monitoring tim"
                className="inline-flex items-center text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 border border-teal-500/30 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                <span className="hidden sm:inline">+ Simulasi Petugas Lain</span>
                <span className="sm:hidden">+ Simulasi</span>
              </button>
            )}

            {/* Berita Acara Penggantian Sampel Button */}
            <button
              onClick={onOpenBeritaAcara}
              className="inline-flex items-center text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
              title="Buka template dan cetak Berita Acara Penggantian Sampel Subsektor Berbeda"
            >
              <FileCheck className="w-4 h-4 mr-1.5 text-indigo-200" />
              <span>Berita Acara</span>
            </button>

            {/* Upload Excel/CSV Button (Hanya Ditampilkan untuk Akun Pemilik) */}
            {authSession?.canEdit && (
              <button
                onClick={onOpenUpload}
                className="inline-flex items-center text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
                title="Unggah file Excel/CSV sampel petugas lapangan lain"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                <span>Unggah File</span>
              </button>
            )}

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
                <span className="hidden sm:inline">Ekspor</span>
                <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
              </button>

              {showExportMenu && (
                <div 
                  className="absolute right-0 mt-1.5 w-64 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-1.5 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  {/* Download Full Excel with Rekap Sheet + Detail Samples */}
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportExcel();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-700 hover:text-white flex items-start space-x-2.5 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">Download Excel Monitoring (.xlsx)</div>
                      <div className="text-[10px] text-emerald-300 font-medium">✨ Sheet Rekap Petugas + Detail Sampel</div>
                    </div>
                  </button>

                  {/* Download Rekap Petugas Saja (.xlsx) */}
                  {onExportRekapOnly && (
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        onExportRekapOnly();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-700 hover:text-white flex items-start space-x-2.5 cursor-pointer transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-100">Download Rekap Petugas (.xlsx)</div>
                        <div className="text-[10px] text-slate-400">Tabel rekapitulasi capaian per petugas</div>
                      </div>
                    </button>
                  )}

                  {/* Download CSV Monitoring */}
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCSV();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-700 hover:text-white flex items-start space-x-2.5 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">Download CSV Monitoring (.csv)</div>
                      <div className="text-[10px] text-slate-400">Data mentah tabular per baris sampel</div>
                    </div>
                  </button>

                  {/* Download CSV Rekap Petugas */}
                  {onExportRekapCSV && (
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        onExportRekapCSV();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-700 hover:text-white flex items-start space-x-2.5 cursor-pointer transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-100">Download CSV Rekap (.csv)</div>
                        <div className="text-[10px] text-slate-400">Ringkasan per petugas format CSV</div>
                      </div>
                    </button>
                  )}

                  <div className="border-t border-slate-700 my-1"></div>

                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onOpenBeritaAcara();
                    }}
                    className="w-full text-left px-3 py-2 text-indigo-300 hover:bg-slate-700 hover:text-white flex items-center space-x-2.5 cursor-pointer transition-colors"
                  >
                    <FileCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Berita Acara Penggantian (Word/PDF)</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onOpenPrint();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-700 hover:text-white flex items-center space-x-2.5 cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Cetak Lembar Kontrol Monitoring</span>
                  </button>
                </div>
              )}
            </div>

            {/* Print Button */}
            <button
              onClick={onOpenPrint}
              title="Cetak lembar rekapitulasi progres monitoring"
              className="inline-flex items-center text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Full Screen Button */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Keluar dari mode layar penuh (ESC)' : 'Tampilan layar penuh dashboard (responsif PC / Tablet / HP)'}
                className={`inline-flex items-center text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isFullscreen 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-white" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            )}

            {/* Reset Button (Khusus Pemilik) */}
            {authSession?.canEdit && (
              <button
                onClick={onResetData}
                title="Muat ulang data sampel default (Erika)"
                className="inline-flex items-center text-xs font-semibold p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/40 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

          </div>
        </div>

        {/* Sub-banner showing active officer context */}
        {activePetugas !== 'all' && activeSummary && (
          <div className="py-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">Petugas Terpilih:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                {activeSummary.nama}
              </span>
              <span className="text-slate-400">• Total {activeSummary.totalSampel} Sampel ({activeSummary.totalUtama} Utama, {activeSummary.totalCadangan} Cadangan)</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Utama: <strong className="text-emerald-400">{activeSummary.selesaiUtama}/{activeSummary.totalUtama} ({activeSummary.persentaseUtama}%)</strong>
              </span>
              <span>•</span>
              <span>
                Cadangan: <strong className="text-amber-400">{activeSummary.selesaiCadangan}/{activeSummary.totalCadangan}</strong>
              </span>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
