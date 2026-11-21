import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCheck,
  RotateCcw,
  Save,
  Check,
  Settings,
  ListPlus
} from 'lucide-react';
import { SampleItem } from '../types/sitasi';
import { BeritaAcaraData, BeritaAcaraRow } from '../types/beritaAcara';
import { 
  detectSubsektor, 
  getEffectiveKomoditasPrioritas, 
  areKomoditasEqual, 
  SUBSEKTOR_LIST 
} from '../utils/subsektorHelper';
import { generateDocxBlob, generateWordDocHTML } from '../utils/wordExport';

interface BeritaAcaraModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleItem[];
  activePetugas: string;
}

interface SavedTemplateConfig {
  judulBeritaAcara: string;
  nomorSurat: string;
  paragrafPembuka: string;
  paragrafPenutup: string;
  provinsiKode: string;
  provinsiNama: string;
  kabupatenKode: string;
  kabupatenNama: string;
  tempat: string;
  tanggalStr: string;
  pejabatNama: string;
  pejabatNip: string;
  pejabatJabatan: string;
  savedCustomRows?: BeritaAcaraRow[];
}

const TEMPLATE_STORAGE_KEY = 'sitasi_2026_berita_acara_saved_config_v3';

const DEFAULT_CONFIG: SavedTemplateConfig = {
  judulBeritaAcara: 'BERITA ACARA PENGGANTIAN SAMPEL SUBSEKTOR BERBEDA',
  nomorSurat: 'B-...../61120/VS.300/2026',
  paragrafPembuka: 'Sampel Utama Survei Pertanian Terintegrasi (SITASI) 2026 dengan identitas pada kolom (2) sampai dengan kolom (5) telah dilakukan 4 (empat) tahapan penggantian sampel RTUP, akan tetapi masih belum ditemukan sampel pengganti pada daftar sampel cadangan yang bersesuaian dengan subsektor utama sehingga dilakukan penggantian sampel dengan subsektor yang berbeda seperti tertera pada kolom (6) sampai dengan kolom (9).',
  paragrafPenutup: 'Demikian berita acara ini dibuat dengan sebenar-benarnya.',
  provinsiKode: '61',
  provinsiNama: 'Kalimantan Barat',
  kabupatenKode: '12',
  kabupatenNama: 'Kubu Raya',
  tempat: 'Sungai Raya',
  tanggalStr: new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  pejabatNama: "Mochamad Su'udi, SST, M.E",
  pejabatNip: '19731208 199512 1 002', // Updated NIP as requested
  pejabatJabatan: 'Kepala BPS Kabupaten Kubu Raya',
};

export const BeritaAcaraModal: React.FC<BeritaAcaraModalProps> = ({
  isOpen,
  onClose,
  samples,
  activePetugas,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'template' | 'rows'>('preview');

  // Form & Template parameters
  const [judulBeritaAcara, setJudulBeritaAcara] = useState(DEFAULT_CONFIG.judulBeritaAcara);
  const [nomorSurat, setNomorSurat] = useState(DEFAULT_CONFIG.nomorSurat);
  const [paragrafPembuka, setParagrafPembuka] = useState(DEFAULT_CONFIG.paragrafPembuka);
  const [paragrafPenutup, setParagrafPenutup] = useState(DEFAULT_CONFIG.paragrafPenutup);
  const [provinsiKode, setProvinsiKode] = useState(DEFAULT_CONFIG.provinsiKode);
  const [provinsiNama, setProvinsiNama] = useState(DEFAULT_CONFIG.provinsiNama);
  const [kabupatenKode, setKabupatenKode] = useState(DEFAULT_CONFIG.kabupatenKode);
  const [kabupatenNama, setKabupatenNama] = useState(DEFAULT_CONFIG.kabupatenNama);
  const [tempat, setTempat] = useState(DEFAULT_CONFIG.tempat);
  const [tanggalStr, setTanggalStr] = useState(DEFAULT_CONFIG.tanggalStr);
  const [pejabatNama, setPejabatNama] = useState(DEFAULT_CONFIG.pejabatNama);
  const [pejabatNip, setPejabatNip] = useState(DEFAULT_CONFIG.pejabatNip);
  const [pejabatJabatan, setPejabatJabatan] = useState(DEFAULT_CONFIG.pejabatJabatan);

  const [rows, setRows] = useState<BeritaAcaraRow[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Quick Pair Creator state
  const [selectedUtamaId, setSelectedUtamaId] = useState<string>('');
  const [selectedCadanganId, setSelectedCadanganId] = useState<string>('');
  const [filterDifferentOnly, setFilterDifferentOnly] = useState<boolean>(true);

  const utamaSamples = useMemo(() => samples.filter(s => s.statusSampel === 'U'), [samples]);
  const cadanganSamples = useMemo(() => samples.filter(s => s.statusSampel === 'C'), [samples]);

  // Helper to format Nama KRT / Nama ART Lainnya
  const formatKrtArtDisplay = (sample?: { namaKRT?: string; namaART?: string; namaUTP?: string } | null): string => {
    if (!sample) return '';
    const krt = (sample.namaKRT || sample.namaUTP || '').trim();
    const art = (sample.namaART || '').trim();
    if (art && art !== '-' && art !== '0' && art.toUpperCase() !== krt.toUpperCase()) {
      return `${krt} / ${art}`;
    }
    return krt || sample.namaUTP || '';
  };

  // Load saved template config from server (/api/berita-acara) or localStorage
  useEffect(() => {
    if (!isOpen) return;
    const loadConfig = async () => {
      let loadedConfig: SavedTemplateConfig | null = null;

      // 1. Try server first for cross-device synchronization
      try {
        const res = await fetch('/api/berita-acara');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            loadedConfig = json.data;
          }
        }
      } catch (err) {
        console.warn('Could not fetch berita acara from server, falling back to local storage:', err);
      }

      // 2. Fallback to localStorage if server didn't have it
      if (!loadedConfig) {
        try {
          const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
          if (raw) {
            loadedConfig = JSON.parse(raw);
          }
        } catch (e) {
          console.error('Failed to parse saved berita acara config:', e);
        }
      }

      if (loadedConfig) {
        if (loadedConfig.judulBeritaAcara) setJudulBeritaAcara(loadedConfig.judulBeritaAcara);
        if (loadedConfig.nomorSurat !== undefined) setNomorSurat(loadedConfig.nomorSurat);
        if (loadedConfig.paragrafPembuka) setParagrafPembuka(loadedConfig.paragrafPembuka);
        if (loadedConfig.paragrafPenutup) setParagrafPenutup(loadedConfig.paragrafPenutup);
        if (loadedConfig.provinsiKode) setProvinsiKode(loadedConfig.provinsiKode);
        if (loadedConfig.provinsiNama) setProvinsiNama(loadedConfig.provinsiNama);
        if (loadedConfig.kabupatenKode) setKabupatenKode(loadedConfig.kabupatenKode);
        if (loadedConfig.kabupatenNama) setKabupatenNama(loadedConfig.kabupatenNama);
        if (loadedConfig.tempat) setTempat(loadedConfig.tempat);
        if (loadedConfig.tanggalStr) setTanggalStr(loadedConfig.tanggalStr);
        if (loadedConfig.pejabatNama) setPejabatNama(loadedConfig.pejabatNama);
        // Ensure NIP is updated to new user requirement
        if (loadedConfig.pejabatNip) {
          setPejabatNip(loadedConfig.pejabatNip === '19870916 201212 1 001' ? '19731208 199512 1 002' : loadedConfig.pejabatNip);
        }
        if (loadedConfig.pejabatJabatan) setPejabatJabatan(loadedConfig.pejabatJabatan);
        if (Array.isArray(loadedConfig.savedCustomRows) && loadedConfig.savedCustomRows.length > 0) {
          setRows(loadedConfig.savedCustomRows);
          return;
        }
      }

      // If no custom rows were saved, auto-detect replacement pairs from monitored samples
      // ONLY include pairs where priority commodity is DIFFERENT!
      const pairs: BeritaAcaraRow[] = [];
    let counter = 1;

    utamaSamples.forEach(u => {
      if (u.nusPengganti && u.nusPengganti.trim()) {
        const matchedCadangan = cadanganSamples.find(c => c.nus === u.nusPengganti && c.nks === u.nks) 
          || cadanganSamples.find(c => c.nus === u.nusPengganti);

        if (matchedCadangan) {
          const prioUtama = getEffectiveKomoditasPrioritas(u);
          const prioCadangan = getEffectiveKomoditasPrioritas(matchedCadangan);

          if (!areKomoditasEqual(prioUtama, prioCadangan)) {
            pairs.push({
              id: `row_${u.id}`,
              no: counter++,
              utamaNks: u.nks,
              utamaNus: u.nus,
              utamaNamaKrt: formatKrtArtDisplay(u),
              utamaSubsektor: detectSubsektor(u.komoditasPrioritas, u.komoditas),
              utamaKomoditasPrioritas: prioUtama,
              penggantiNks: matchedCadangan.nks,
              penggantiNus: matchedCadangan.nus,
              penggantiNamaKrt: formatKrtArtDisplay(matchedCadangan),
              penggantiSubsektor: detectSubsektor(matchedCadangan.komoditasPrioritas, matchedCadangan.komoditas),
              penggantiKomoditasPrioritas: prioCadangan,
              alasan: u.catatanPetugas || (u.hasilPendataanFasih && !u.hasilPendataanFasih.includes('Berhasil') ? u.hasilPendataanFasih : (u.progressStatus === 'MENOLAK' ? 'Responden Menolak' : 'Tidak Ditemukan')),
            });
          }
        }
      }
    });

    cadanganSamples.forEach(c => {
      if (c.nusPengganti && c.nusPengganti.trim() && !pairs.some(p => p.penggantiNus === c.nus)) {
        const matchedUtama = utamaSamples.find(u => u.nus === c.nusPengganti);
        if (matchedUtama) {
          const prioUtama = getEffectiveKomoditasPrioritas(matchedUtama);
          const prioCadangan = getEffectiveKomoditasPrioritas(c);

          if (!areKomoditasEqual(prioUtama, prioCadangan)) {
            pairs.push({
              id: `row_c_${c.id}`,
              no: counter++,
              utamaNks: matchedUtama.nks,
              utamaNus: matchedUtama.nus,
              utamaNamaKrt: formatKrtArtDisplay(matchedUtama),
              utamaSubsektor: detectSubsektor(matchedUtama.komoditasPrioritas, matchedUtama.komoditas),
              utamaKomoditasPrioritas: prioUtama,
              penggantiNks: c.nks,
              penggantiNus: c.nus,
              penggantiNamaKrt: formatKrtArtDisplay(c),
              penggantiSubsektor: detectSubsektor(c.komoditasPrioritas, c.komoditas),
              penggantiKomoditasPrioritas: prioCadangan,
              alasan: c.catatanPetugas || 'Penggantian Lapangan',
            });
          }
        }
      }
    });

    // NOTE: If pairs.length === 0, keep it completely EMPTY as requested by the user
    // (no initial demo pairs seeded)!
    setRows(pairs);
    };

    loadConfig();
  }, [isOpen, samples, utamaSamples, cadanganSamples]);

  // Save template configuration to localStorage and server
  const handleSaveTemplateConfig = async () => {
    try {
      const configToSave: SavedTemplateConfig = {
        judulBeritaAcara,
        nomorSurat,
        paragrafPembuka,
        paragrafPenutup,
        provinsiKode,
        provinsiNama,
        kabupatenKode,
        kabupatenNama,
        tempat,
        tanggalStr,
        pejabatNama,
        pejabatNip,
        pejabatJabatan,
        savedCustomRows: rows,
      };
      // Local backup
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(configToSave));

      // Server persistence for cross-device access
      try {
        await fetch('/api/berita-acara', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configToSave),
        });
      } catch (serverErr) {
        console.warn('Failed to save berita acara to server:', serverErr);
      }

      setSaveSuccessMsg('Template dan perubahan Berita Acara berhasil disimpan ke Server & Browser!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
    }
  };

  // Reset to original BPS default template
  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan format template Berita Acara ke standar default BPS Kubu Raya?')) {
      localStorage.removeItem(TEMPLATE_STORAGE_KEY);
      setJudulBeritaAcara(DEFAULT_CONFIG.judulBeritaAcara);
      setNomorSurat(DEFAULT_CONFIG.nomorSurat);
      setParagrafPembuka(DEFAULT_CONFIG.paragrafPembuka);
      setParagrafPenutup(DEFAULT_CONFIG.paragrafPenutup);
      setProvinsiKode(DEFAULT_CONFIG.provinsiKode);
      setProvinsiNama(DEFAULT_CONFIG.provinsiNama);
      setKabupatenKode(DEFAULT_CONFIG.kabupatenKode);
      setKabupatenNama(DEFAULT_CONFIG.kabupatenNama);
      setTempat(DEFAULT_CONFIG.tempat);
      setTanggalStr(DEFAULT_CONFIG.tanggalStr);
      setPejabatNama(DEFAULT_CONFIG.pejabatNama);
      setPejabatNip('19731208 199512 1 002');
      setPejabatJabatan(DEFAULT_CONFIG.pejabatJabatan);
      setSaveSuccessMsg('Template berhasil dikembalikan ke standar BPS.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Construct complete BeritaAcaraData
  const documentData: BeritaAcaraData = useMemo(() => {
    return {
      judulBeritaAcara,
      nomorSurat,
      paragrafPembuka,
      paragrafPenutup,
      provinsiKode,
      provinsiNama,
      kabupatenKode,
      kabupatenNama,
      tahun: '2026',
      tahapanPenggantianText: '4 (empat) tahapan',
      tempat,
      tanggal: tanggalStr,
      pejabatNama,
      pejabatNip,
      pejabatJabatan,
      rows,
    };
  }, [
    judulBeritaAcara,
    nomorSurat,
    paragrafPembuka,
    paragrafPenutup,
    provinsiKode,
    provinsiNama,
    kabupatenKode,
    kabupatenNama,
    tempat,
    tanggalStr,
    pejabatNama,
    pejabatNip,
    pejabatJabatan,
    rows
  ]);

  // Add pair manually from Quick Pair Creator
  const handleAddSelectedPair = () => {
    const u = utamaSamples.find(s => s.id === selectedUtamaId);
    const c = cadanganSamples.find(s => s.id === selectedCadanganId);

    if (!u || !c) return;

    const prioU = getEffectiveKomoditasPrioritas(u);
    const prioC = getEffectiveKomoditasPrioritas(c);

    // Verify commodity difference rule
    if (areKomoditasEqual(prioU, prioC)) {
      if (!window.confirm(`Perhatian: Sampel Utama (${prioU}) dan Sampel Cadangan (${prioC}) memiliki komoditas yang sama. Sesuai ketentuan BPS SITASI, penggantian dengan komoditas sama tidak perlu dibuatkan Berita Acara Subsektor Berbeda. Tetap ingin menambahkan?`)) {
        return;
      }
    }

    const nextNo = rows.length + 1;
    const newRow: BeritaAcaraRow = {
      id: `row_${u.id}_${c.id}_${Date.now()}`,
      no: nextNo,
      utamaNks: u.nks,
      utamaNus: u.nus,
      utamaNamaKrt: formatKrtArtDisplay(u),
      utamaSubsektor: detectSubsektor(u.komoditasPrioritas, u.komoditas),
      utamaKomoditasPrioritas: prioU,
      penggantiNks: c.nks,
      penggantiNus: c.nus,
      penggantiNamaKrt: formatKrtArtDisplay(c),
      penggantiSubsektor: detectSubsektor(c.komoditasPrioritas, c.komoditas),
      penggantiKomoditasPrioritas: prioC,
      alasan: u.catatanPetugas || 'Penggantian Lapangan',
    };

    setRows(prev => [...prev, newRow]);
    setSelectedUtamaId('');
    setSelectedCadanganId('');
  };

  // Add a blank custom row
  const handleAddBlankRow = () => {
    const nextNo = rows.length + 1;
    const newRow: BeritaAcaraRow = {
      id: `row_custom_${Date.now()}`,
      no: nextNo,
      utamaNks: '1500015',
      utamaNus: '',
      utamaNamaKrt: '',
      utamaSubsektor: 'Tanaman Pangan',
      utamaKomoditasPrioritas: 'PADI SAWAH',
      penggantiNks: '1500015',
      penggantiNus: '',
      penggantiNamaKrt: '',
      penggantiSubsektor: 'Hortikultura',
      penggantiKomoditasPrioritas: 'CABAI RAWIT',
      alasan: 'Subsektor Berbeda',
    };
    setRows(prev => [...prev, newRow]);
  };

  // Update a row
  const handleUpdateRow = (index: number, field: keyof BeritaAcaraRow, value: any) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  // Delete a row
  const handleDeleteRow = (index: number) => {
    setRows(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((r, i) => ({ ...r, no: i + 1 }));
    });
  };

  // Clear all rows
  const handleClearAllRows = () => {
    if (window.confirm('Kosongkan semua baris pada Berita Acara?')) {
      setRows([]);
    }
  };

  // Export to Word (.docx)
  const handleDownloadDocx = async () => {
    try {
      setIsExporting(true);
      const blob = await generateDocxBlob(documentData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Berita_Acara_Penggantian_Sampel_SITASI_2026_${activePetugas !== 'all' ? activePetugas : 'Kubu_Raya'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating docx:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Word (.doc HTML)
  const handleDownloadDoc = () => {
    const html = generateWordDocHTML(documentData);
    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Berita_Acara_Penggantian_Sampel_SITASI_2026_${activePetugas !== 'all' ? activePetugas : 'Kubu_Raya'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print to PDF
  const handlePrint = () => {
    window.print();
  };

  const activeSelectedUtama = utamaSamples.find(s => s.id === selectedUtamaId);
  const activeSelectedCadangan = cadanganSamples.find(s => s.id === selectedCadanganId);

  const selectedPrioUtama = activeSelectedUtama ? getEffectiveKomoditasPrioritas(activeSelectedUtama) : '';
  const selectedPrioCadangan = activeSelectedCadangan ? getEffectiveKomoditasPrioritas(activeSelectedCadangan) : '';
  const isSelectedPairDifferent = activeSelectedUtama && activeSelectedCadangan 
    ? !areKomoditasEqual(selectedPrioUtama, selectedPrioCadangan) 
    : false;

  const filteredCadanganOptions = useMemo(() => {
    if (!filterDifferentOnly || !activeSelectedUtama) return cadanganSamples;
    const prioU = getEffectiveKomoditasPrioritas(activeSelectedUtama);
    return cadanganSamples.filter(c => !areKomoditasEqual(prioU, getEffectiveKomoditasPrioritas(c)));
  }, [cadanganSamples, activeSelectedUtama, filterDifferentOnly]);

  const displayRowCount = Math.max(rows.length, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div 
        className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SITASI 2026
                </span>
                <span className="text-xs text-slate-400">Template Berita Acara BPS</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Berita Acara Penggantian Sampel Subsektor Berbeda
              </h2>
            </div>
          </div>

          {/* Action Tabs & Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* View Mode Toggle */}
            <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex text-xs">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'preview' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pratinjau ({rows.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('template')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'template' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Kustomisasi Template</span>
              </button>
              <button
                onClick={() => setActiveTab('rows')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'rows' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Kelola Baris ({rows.length})</span>
              </button>
            </div>

            {/* Quick Save Template Button */}
            <button
              onClick={handleSaveTemplateConfig}
              className="inline-flex items-center text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
              title="Simpan template dan perubahan berita acara ke memori browser"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              <span>Simpan</span>
            </button>

            {/* Word Download (.docx) */}
            <button
              onClick={handleDownloadDocx}
              disabled={isExporting}
              className="inline-flex items-center text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
              title="Unduh dokumen dalam format Microsoft Word (.docx)"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>{isExporting ? 'Memproses...' : 'Word (.docx)'}</span>
            </button>

            {/* Print / PDF */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center text-xs font-bold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              title="Cetak atau Simpan PDF"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
              <span>Cetak/PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-100 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 print:p-0 print:bg-white">
          
          {/* TAB 1: PRATINJAU DOKUMEN RESMI BPS */}
          {activeTab === 'preview' && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-10 max-w-6xl w-full mx-auto print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-900 font-sans">
              
              {/* Landscape Print Stylesheet Injection */}
              <style>{`
                @media print {
                  @page {
                    size: A4 landscape !important;
                    margin: 10mm 15mm !important;
                  }
                  body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              `}</style>

              {/* Landscape Format Info Badge */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs print:hidden">
                <div className="flex items-center space-x-2 text-slate-700">
                  <span className="font-bold text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                    📄 Format Halaman: A4 Landscape (Posisi Mendatar)
                  </span>
                  <span className="text-slate-600 hidden sm:inline">
                    Standar resmi tabel 9 kolom BPS Kabupaten Kubu Raya.
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Sinkron Multi-Device (Server)
                </span>
              </div>

              {/* Notice if table is currently empty */}
              {rows.length === 0 && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-amber-950">
                        Isian Berita Acara Saat Ini Masih Kosong
                      </p>
                      <p className="text-amber-800 mt-0.5">
                        Belum ada Sampel Utama yang diganti dengan Sampel Cadangan (komoditas berbeda). Tabel akan terisi otomatis saat Anda menentukan NUS Pengganti di tabel monitoring, atau Anda dapat menambah baris manual di tab <strong>Kelola Baris</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveTab('rows')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors cursor-pointer text-xs"
                    >
                      + Tambah Baris Manual
                    </button>
                    <button
                      onClick={() => setActiveTab('template')}
                      className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg font-semibold transition-colors cursor-pointer text-xs"
                    >
                      Kustomisasi Teks
                    </button>
                  </div>
                </div>
              )}

              {/* 1. KOP SURAT BPS KABUPATEN KUBU RAYA */}
              <div className="flex items-start space-x-4 border-b-2 border-black pb-3">
                <div className="w-16 h-12 flex items-center justify-center shrink-0">
                  <svg width="60" height="42" viewBox="0 0 60 40">
                    <polygon points="10,5 25,5 20,20 5,20" fill="#0088cc" />
                    <polygon points="28,5 43,5 38,20 23,20" fill="#f58220" />
                    <polygon points="18,22 33,22 28,37 13,37" fill="#77b829" />
                    <polygon points="36,22 51,22 46,37 31,37" fill="#0088cc" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 leading-tight">
                    BADAN PUSAT STATISTIK
                  </h1>
                  <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-slate-900 leading-tight">
                    KABUPATEN {kabupatenNama.toUpperCase()}
                  </h2>
                  <p className="text-[11px] text-slate-700 leading-tight mt-0.5">
                    Jalan Supadio KM.19,5 No.04/12 Telp. (0561) 724189 Fax (0561) 724189
                  </p>
                  <p className="text-[11px] text-slate-700 leading-tight">
                    E-mail: bps{provinsiKode}{kabupatenKode}@bps.go.id Homepage: http://{kabupatenNama.toLowerCase().replace(/\s+/g, '')}kab.bps.go.id
                  </p>
                </div>
              </div>

              {/* 2. JUDUL BERITA ACARA & NOMOR */}
              <div className="text-center my-4 space-y-1">
                <h3 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-950 underline underline-offset-4">
                  {judulBeritaAcara}
                </h3>
                {nomorSurat && (
                  <p className="text-xs font-semibold text-slate-800">
                    Nomor: {nomorSurat}
                  </p>
                )}
              </div>

              {/* 3. PARAGRAF NARASI */}
              <div className="text-xs sm:text-[13px] leading-relaxed text-justify my-3 space-y-2">
                <p>
                  {paragrafPembuka}
                </p>
              </div>

              {/* 4. IDENTITAS WILAYAH */}
              <div className="text-xs sm:text-[13px] my-3 space-y-0.5">
                <div className="flex">
                  <span className="w-28 font-medium">Provinsi</span>
                  <span className="w-4">:</span>
                  <span>[{provinsiKode}] Provinsi {provinsiNama}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-medium">Kabupaten</span>
                  <span className="w-4">:</span>
                  <span>[{kabupatenKode}] Kabupaten {kabupatenNama}</span>
                </div>
              </div>

              {/* 5. TABEL BERITA ACARA (Exact 9 Columns matching BPS Template) */}
              <div className="my-4 overflow-x-auto">
                <table className="w-full border-collapse border border-black text-[11px] sm:text-xs text-slate-900">
                  <thead>
                    <tr className="bg-slate-50/80 font-bold text-center">
                      <th rowSpan={2} className="border border-black p-2 w-10 align-middle">
                        No
                      </th>
                      <th colSpan={4} className="border border-black p-2 align-middle">
                        Sampel Utama
                      </th>
                      <th colSpan={4} className="border border-black p-2 align-middle">
                        Sampel Pengganti dengan Subsektor Berbeda
                      </th>
                    </tr>

                    <tr className="bg-slate-50/80 font-bold text-center">
                      <th className="border border-black p-2 w-20">NKS</th>
                      <th className="border border-black p-2 w-16">NUS</th>
                      <th className="border border-black p-2 min-w-[150px]">
                        Nama KRT/Nama ART Lainnya
                      </th>
                      <th className="border border-black p-2 w-28">Subsektor (Komoditas)</th>

                      <th className="border border-black p-2 w-20">NKS</th>
                      <th className="border border-black p-2 w-16">NUS</th>
                      <th className="border border-black p-2 min-w-[150px]">
                        Nama KRT/Nama ART Lainnya
                      </th>
                      <th className="border border-black p-2 w-28">Subsektor (Komoditas)</th>
                    </tr>

                    <tr className="bg-slate-100/60 font-bold text-center text-[10px]">
                      <th className="border border-black py-1">(1)</th>
                      <th className="border border-black py-1">(2)</th>
                      <th className="border border-black py-1">(3)</th>
                      <th className="border border-black py-1">(4)</th>
                      <th className="border border-black py-1">(5)</th>
                      <th className="border border-black py-1">(6)</th>
                      <th className="border border-black py-1">(7)</th>
                      <th className="border border-black py-1">(8)</th>
                      <th className="border border-black py-1">(9)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.from({ length: displayRowCount }).map((_, idx) => {
                      const row = rows[idx];
                      return (
                        <tr key={row?.id || `empty_${idx}`} className="hover:bg-slate-50/50">
                          <td className="border border-black p-2 text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="border border-black p-2 text-center font-mono">
                            {row?.utamaNks || ''}
                          </td>
                          <td className="border border-black p-2 text-center font-mono font-bold">
                            {row?.utamaNus || ''}
                          </td>
                          <td className="border border-black p-2">
                            {row?.utamaNamaKrt || ''}
                          </td>
                          <td className="border border-black p-2 text-center font-medium">
                            {row?.utamaSubsektor || ''}
                            {row?.utamaKomoditasPrioritas && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                ({row.utamaKomoditasPrioritas})
                              </div>
                            )}
                          </td>
                          <td className="border border-black p-2 text-center font-mono">
                            {row?.penggantiNks || ''}
                          </td>
                          <td className="border border-black p-2 text-center font-mono font-bold">
                            {row?.penggantiNus || ''}
                          </td>
                          <td className="border border-black p-2">
                            {row?.penggantiNamaKrt || ''}
                          </td>
                          <td className="border border-black p-2 text-center font-medium">
                            {row?.penggantiSubsektor || ''}
                            {row?.penggantiKomoditasPrioritas && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                ({row.penggantiKomoditasPrioritas})
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {rows.length <= 5 && (
                      <tr>
                        <td className="border border-black p-2 text-center italic font-serif">
                          dst
                        </td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 6. PENUTUP */}
              <div className="text-xs sm:text-[13px] my-3">
                {paragrafPenutup}
              </div>

              {/* 7. TANDA TANGAN KEPALA BPS */}
              <div className="mt-6 flex justify-end">
                <div className="w-72 sm:w-80 text-center text-xs sm:text-[13px] space-y-1">
                  <div>
                    {tempat}, {tanggalStr}
                  </div>
                  <div className="font-bold">
                    {pejabatJabatan}
                  </div>
                  <div className="h-20 sm:h-24"></div>
                  <div className="font-bold underline text-slate-900">
                    {pejabatNama}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-700 font-mono font-semibold">
                    NIP. {pejabatNip}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: KUSTOMISASI TEMPLATE & IDENTITAS DOKUMEN */}
          {activeTab === 'template' && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Pengaturan & Kustomisasi Teks Template Berita Acara
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleResetToDefault}
                      className="text-xs text-slate-600 hover:text-rose-600 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 transition-colors flex items-center cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Reset Format BPS Default
                    </button>
                    <button
                      onClick={handleSaveTemplateConfig}
                      className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      Simpan Template
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Judul Berita Acara
                    </label>
                    <input
                      type="text"
                      value={judulBeritaAcara}
                      onChange={(e) => setJudulBeritaAcara(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:bg-white focus:outline-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nomor Surat / Berita Acara
                    </label>
                    <input
                      type="text"
                      value={nomorSurat}
                      onChange={(e) => setNomorSurat(e.target.value)}
                      placeholder="Contoh: B-...../61120/VS.300/2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800 focus:bg-white focus:outline-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tempat Penetapan
                    </label>
                    <input
                      type="text"
                      value={tempat}
                      onChange={(e) => setTempat(e.target.value)}
                      placeholder="Contoh: Sungai Raya"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tanggal Dokumen
                    </label>
                    <input
                      type="text"
                      value={tanggalStr}
                      onChange={(e) => setTanggalStr(e.target.value)}
                      placeholder="Contoh: 23 Oktober 2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kabupaten
                    </label>
                    <input
                      type="text"
                      value={kabupatenNama}
                      onChange={(e) => setKabupatenNama(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-indigo-500"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Paragraf Narasi Pembuka
                    </label>
                    <textarea
                      rows={3}
                      value={paragrafPembuka}
                      onChange={(e) => setParagrafPembuka(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-indigo-500 text-xs leading-relaxed"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Paragraf Penutup
                    </label>
                    <input
                      type="text"
                      value={paragrafPenutup}
                      onChange={(e) => setParagrafPenutup(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-indigo-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Pejabat Penandatangan Card */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Pejabat Penandatangan Berita Acara
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Pejabat (Lengkap dengan Gelar)
                    </label>
                    <input
                      type="text"
                      value={pejabatNama}
                      onChange={(e) => setPejabatNama(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:bg-white focus:outline-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>NIP Kepala BPS</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded">Aktif</span>
                    </label>
                    <input
                      type="text"
                      value={pejabatNip}
                      onChange={(e) => setPejabatNip(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Default resmi: 19731208 199512 1 002</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Jabatan
                    </label>
                    <input
                      type="text"
                      value={pejabatJabatan}
                      onChange={(e) => setPejabatJabatan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveTemplateConfig}
                    className="inline-flex items-center text-xs font-bold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    <span>Simpan Pengaturan Template</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: KELOLA BARIS & PASANGAN PENGGANTIAN */}
          {activeTab === 'rows' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              
              {/* Info & Rule Reminder */}
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-indigo-950 font-bold">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Ketentuan Sampel Pengganti Berita Acara</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  1. <strong>Komoditas Prioritas Berbeda</strong>: Hanya sampel cadangan yang memiliki komoditas prioritas berbeda dengan sampel utama yang dicantumkan dalam Berita Acara.<br />
                  2. <strong>Penentuan Komoditas Prioritas</strong>: Menggunakan kolom <em>Komoditas Prioritas</em>. Bila kosong atau '-', otomatis menggunakan komoditas pertama yang tercatat.<br />
                  3. <strong>Bisa Diedit & Disimpan</strong>: Anda dapat menambah, mengedit teks kolom mana pun, atau menghapus baris sesuai situasi riil di lapangan.
                </p>
              </div>

              {/* Quick Pair Creator (Interactive Selector) */}
              <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>Pasangkan Sampel Utama & Cadangan dari Data Survei</span>
                  </h3>
                  <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterDifferentOnly}
                      onChange={(e) => setFilterDifferentOnly(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Saring cadangan berkomoditas beda</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Sampel Utama */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-rose-900">
                      1. Pilih Sampel Utama (Yang Diganti):
                    </label>
                    <select
                      value={selectedUtamaId}
                      onChange={(e) => setSelectedUtamaId(e.target.value)}
                      className="w-full p-2.5 bg-rose-50/50 border border-rose-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Sampel Utama --</option>
                      {utamaSamples.map((u) => {
                        const prio = getEffectiveKomoditasPrioritas(u);
                        const sub = detectSubsektor(u.komoditasPrioritas, u.komoditas);
                        return (
                          <option key={u.id} value={u.id}>
                            NUS {u.nus} - {u.namaUTP} ({prio} • {sub})
                          </option>
                        );
                      })}
                    </select>

                    {activeSelectedUtama && (
                      <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-950 space-y-0.5">
                        <div className="font-bold">{activeSelectedUtama.namaUTP} (NUS {activeSelectedUtama.nus})</div>
                        <div>KRT: {activeSelectedUtama.namaKRT} • NKS: {activeSelectedUtama.nks}</div>
                        <div>Komoditas Prioritas: <strong className="text-rose-700">{selectedPrioUtama}</strong></div>
                        <div className="text-[11px] text-slate-500">Subsektor: {detectSubsektor(activeSelectedUtama.komoditasPrioritas, activeSelectedUtama.komoditas)}</div>
                      </div>
                    )}
                  </div>

                  {/* Select Sampel Cadangan */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-emerald-900">
                      2. Pilih Sampel Cadangan (Pengganti):
                    </label>
                    <select
                      value={selectedCadanganId}
                      onChange={(e) => setSelectedCadanganId(e.target.value)}
                      className="w-full p-2.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Sampel Cadangan Pengganti --</option>
                      {filteredCadanganOptions.map((c) => {
                        const prio = getEffectiveKomoditasPrioritas(c);
                        const sub = detectSubsektor(c.komoditasPrioritas, c.komoditas);
                        return (
                          <option key={c.id} value={c.id}>
                            NUS {c.nus} - {c.namaUTP} ({prio} • {sub})
                          </option>
                        );
                      })}
                    </select>

                    {activeSelectedCadangan && (
                      <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-0.5">
                        <div className="font-bold">{activeSelectedCadangan.namaUTP} (NUS {activeSelectedCadangan.nus})</div>
                        <div>KRT: {activeSelectedCadangan.namaKRT} • NKS: {activeSelectedCadangan.nks}</div>
                        <div>Komoditas Prioritas: <strong className="text-emerald-700">{selectedPrioCadangan}</strong></div>
                        <div className="text-[11px] text-slate-500">Subsektor: {detectSubsektor(activeSelectedCadangan.komoditasPrioritas, activeSelectedCadangan.komoditas)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs">
                    {activeSelectedUtama && activeSelectedCadangan && (
                      isSelectedPairDifferent ? (
                        <span className="text-emerald-700 font-bold flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                          Komoditas BERBEDA: Valid untuk Berita Acara ({selectedPrioUtama} ➔ {selectedPrioCadangan})
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1 text-amber-600" />
                          Komoditas SAMA: Sesuai aturan BPS, tidak perlu dibuatkan Berita Acara Subsektor Berbeda
                        </span>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSelectedPair}
                    disabled={!selectedUtamaId || !selectedCadanganId}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambahkan Pasangan Ini</span>
                  </button>
                </div>
              </div>

              {/* Action Toolbar for Rows */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddBlankRow}
                    className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>+ Tambah Baris Manual Kosong</span>
                  </button>
                  {rows.length > 0 && (
                    <button
                      onClick={handleClearAllRows}
                      className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                      <span>Kosongkan Semua Baris</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveTemplateConfig}
                    className="inline-flex items-center text-xs font-bold px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    <span>Simpan Perubahan Isian</span>
                  </button>
                </div>
              </div>

              {/* Editable Rows List */}
              <div className="space-y-4">
                {rows.map((row, idx) => (
                  <div 
                    key={row.id}
                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          Pasangan Sampel #{idx + 1}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteRow(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Left: Sampel Utama */}
                      <div className="p-3 bg-rose-50/40 rounded-lg border border-rose-200/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">
                            Sampel Utama (Yang Diganti)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Kolom (2)-(5)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500">NKS Utama</label>
                            <input
                              type="text"
                              value={row.utamaNks}
                              onChange={(e) => handleUpdateRow(idx, 'utamaNks', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">NUS Utama</label>
                            <input
                              type="text"
                              value={row.utamaNus}
                              onChange={(e) => handleUpdateRow(idx, 'utamaNus', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-500">Nama KRT/Nama ART Lainnya</label>
                            <input
                              type="text"
                              value={row.utamaNamaKrt}
                              onChange={(e) => handleUpdateRow(idx, 'utamaNamaKrt', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">Subsektor (Komoditas)</label>
                            <select
                              value={row.utamaSubsektor}
                              onChange={(e) => handleUpdateRow(idx, 'utamaSubsektor', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer font-medium"
                            >
                              {SUBSEKTOR_LIST.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">Komoditas Prioritas</label>
                            <input
                              type="text"
                              value={row.utamaKomoditasPrioritas || ''}
                              onChange={(e) => handleUpdateRow(idx, 'utamaKomoditasPrioritas', e.target.value)}
                              placeholder="Komoditas prioritas..."
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Sampel Pengganti (Cadangan) */}
                      <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-200/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                            Sampel Pengganti (Subsektor Berbeda)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Kolom (6)-(9)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500">NKS Pengganti</label>
                            <input
                              type="text"
                              value={row.penggantiNks}
                              onChange={(e) => handleUpdateRow(idx, 'penggantiNks', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">NUS Cadangan</label>
                            <input
                              type="text"
                              value={row.penggantiNus}
                              onChange={(e) => handleUpdateRow(idx, 'penggantiNus', e.target.value)}
                              placeholder="Contoh: 286"
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-500">Nama KRT/Nama ART Lainnya Pengganti</label>
                            <input
                              type="text"
                              value={row.penggantiNamaKrt}
                              onChange={(e) => handleUpdateRow(idx, 'penggantiNamaKrt', e.target.value)}
                              placeholder="Nama KRT/ART Cadangan..."
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">Subsektor (Komoditas) Pengganti</label>
                            <select
                              value={row.penggantiSubsektor}
                              onChange={(e) => handleUpdateRow(idx, 'penggantiSubsektor', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer font-medium text-emerald-900"
                            >
                              {SUBSEKTOR_LIST.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">Komoditas Prioritas</label>
                            <input
                              type="text"
                              value={row.penggantiKomoditasPrioritas || ''}
                              onChange={(e) => handleUpdateRow(idx, 'penggantiKomoditasPrioritas', e.target.value)}
                              placeholder="Komoditas prioritas..."
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}

                {rows.length === 0 && (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">Belum ada sampel utama yang diganti dengan subsektor berbeda</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Pilih sampel utama dan cadangan di atas, atau klik "+ Tambah Baris Manual Kosong" untuk mengisi baris penggantian.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-500">
            Total baris berita acara: <strong>{rows.length} sampel</strong>
            {rows.length > 5 ? (
              <span className="text-emerald-700 font-semibold ml-1">
                (Otomatis disesuaikan menjadi {rows.length} baris)
              </span>
            ) : (
              <span className="ml-1">(Format standar 5 baris)</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab(activeTab === 'preview' ? 'rows' : 'preview')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {activeTab === 'preview' ? '✏️ Kelola Baris & Template' : '👁️ Lihat Pratinjau Dokumen'}
            </button>
            <button
              onClick={handleSaveTemplateConfig}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Simpan Perubahan
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Unduh Word (.docx)
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Cetak / PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
