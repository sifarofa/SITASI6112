import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  X, 
  Check, 
  ChevronDown, 
  UserCheck
} from 'lucide-react';
import { PetugasSummary } from '../types/sitasi';

interface OfficerSelectProps {
  petugasList: PetugasSummary[];
  activePetugas: string;
  onSelectPetugas: (petugas: string) => void;
  className?: string;
  variant?: 'dark' | 'light';
}

export const OfficerSelect: React.FC<OfficerSelectProps> = ({
  petugasList,
  activePetugas,
  onSelectPetugas,
  className = '',
  variant = 'dark',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active officer object if specific officer is selected
  const activeOfficer = useMemo(() => {
    return petugasList.find((p) => p.nama === activePetugas);
  }, [petugasList, activePetugas]);

  // Filter officers based on search query
  const filteredOfficers = useMemo(() => {
    if (!searchQuery.trim()) return petugasList;
    const q = searchQuery.toLowerCase().trim();
    return petugasList.filter((p) => p.nama.toLowerCase().includes(q));
  }, [petugasList, searchQuery]);

  // Auto-focus search input when opening dropdown
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Click-outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (nama: string) => {
    onSelectPetugas(nama);
    setIsOpen(false);
    setSearchQuery('');
  };

  const isDark = variant === 'dark';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-inner ${
          isDark
            ? 'bg-slate-800/95 hover:bg-slate-700/90 border-slate-700 text-slate-100 hover:text-white'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
        } ${isOpen ? (isDark ? 'ring-2 ring-emerald-500/40 border-emerald-500' : 'ring-2 ring-emerald-500/20 border-emerald-400') : ''}`}
        title="Klik untuk memilih atau mencari nama petugas lapangan"
      >
        <Users className="w-4 h-4 text-emerald-400 shrink-0" />
        
        <span className="truncate max-w-[150px] sm:max-w-[210px] text-left">
          {activePetugas === 'all' ? (
            <span className="flex items-center gap-1.5">
              <span>Semua Petugas</span>
              <span className="text-[11px] opacity-75 font-normal">({petugasList.length})</span>
            </span>
          ) : activeOfficer ? (
            <span className="flex items-center gap-1.5">
              <span className="font-semibold">{activeOfficer.nama}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-300">
                {activeOfficer.persentaseProgress ?? activeOfficer.persentaseUtama}%
              </span>
            </span>
          ) : (
            activePetugas
          )}
        </span>

        <ChevronDown 
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu with Search Input */}
      {isOpen && (
        <div 
          className={`absolute left-0 mt-1.5 w-72 sm:w-80 rounded-xl shadow-2xl border p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
            isDark 
              ? 'bg-slate-900 border-slate-700 text-slate-100 ring-1 ring-black/40' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}
          role="listbox"
        >
          {/* Search Input Box */}
          <div className="relative mb-2">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik/cari nama petugas..."
              className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-slate-800/90 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Header indicator */}
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-400 border-b border-slate-800/80 mb-1">
            <span>Daftar Petugas Lapangan</span>
            <span className="font-mono text-[10px]">
              {searchQuery ? `${filteredOfficers.length} cocok` : `${petugasList.length} petugas`}
            </span>
          </div>

          {/* Officers List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
            
            {/* "Semua Petugas" Option (only show if no search query or matches "semua") */}
            {(!searchQuery || 'semua petugas'.includes(searchQuery.toLowerCase())) && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                  activePetugas === 'all'
                    ? (isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-900 font-bold')
                    : (isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700')
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    activePetugas === 'all'
                      ? 'bg-emerald-600 text-white'
                      : (isDark ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-slate-100 text-emerald-600')
                  }`}>
                    👥
                  </div>
                  <div>
                    <div className="font-semibold text-xs">Semua Petugas</div>
                    <div className="text-[10px] text-slate-400">
                      Tampilkan seluruh {petugasList.length} petugas lapangan
                    </div>
                  </div>
                </div>

                {activePetugas === 'all' && (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </button>
            )}

            {/* Filtered Officer Items */}
            {filteredOfficers.map((p) => {
              const isSelected = activePetugas === p.nama;
              const progressPct = p.persentaseProgress ?? p.persentaseUtama ?? 0;

              return (
                <button
                  key={p.nama}
                  type="button"
                  onClick={() => handleSelect(p.nama)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? (isDark ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-800/60 font-semibold' : 'bg-emerald-50 text-emerald-900 font-semibold')
                      : (isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700')
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {/* Initial Avatar */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : (isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-200 text-slate-700')
                    }`}>
                      {p.nama.charAt(0).toUpperCase()}
                    </div>

                    {/* Name & Progress Info */}
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <span>{p.nama}</span>
                        {progressPct === 100 && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded font-bold">
                            100%
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {p.selesaiProgress} / {p.totalUtama} Utama ({progressPct}%) • {p.totalSampel} Total
                      </div>
                    </div>
                  </div>

                  {/* Selected Checkmark or Progress Pill */}
                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {progressPct}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Empty Search Result */}
            {filteredOfficers.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400">
                  Tidak ada petugas bernama <strong className="text-slate-200">"{searchQuery}"</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  Tampilkan semua petugas
                </button>
              </div>
            )}

          </div>

          {/* Footer note */}
          <div className="pt-2 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span>Ketik nama untuk menyaring</span>
            <span>ESC untuk tutup</span>
          </div>

        </div>
      )}

    </div>
  );
};
