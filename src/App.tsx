import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  SampleItem, 
  SurveyProgressStatus, 
  FilterOptions,
  PetugasSummary,
  TableColumnKey,
  VisibleColumns,
  DEFAULT_VISIBLE_COLUMNS,
  PageSizeOption,
  mapFasihToSurveyStatus,
  mapSurveyStatusToFasih,
  isFasihBerhasil,
  isFasihTerkendala,
  getHasilKategori,
  isSampleBelumDiwawancara,
  isSampleDraft,
  isSampleBerhasil,
  isSampleTidakBerhasil,
  UserAuthSession,
  PermissionConfig
} from './types/sitasi';
import { 
  parseCSV, 
  parseSitasiData 
} from './utils/csvParser';
import { 
  loadSavedSamples, 
  saveSamples, 
  getSavedActivePetugas, 
  saveActivePetugas, 
  calculatePetugasSummaries,
  generateDemoAdditionalOfficers,
  loadSavedVisibleColumns,
  saveVisibleColumns
} from './utils/storage';
import { 
  exportToExcel, 
  exportToCSV,
  exportRekapOnlyToExcel,
  exportRekapToCSV
} from './utils/export';
import { formatDateTimeZone, formatShortTimeZone } from './utils/timezone';
import {
  supabase,
  isSupabaseConfigured,
  supabaseConfigStatus,
  SUPABASE_SAMPLES_TABLE,
  fetchSamplesFromSupabase,
  upsertSamplesBatchToSupabase,
  deleteSamplesFromSupabase,
  replaceAllSamplesInSupabase,
} from './lib/supabase';

import { Header } from './components/Header';
import { StatisticsCards } from './components/StatisticsCards';
import { PetugasOverview } from './components/PetugasOverview';
import { NksOverview } from './components/NksOverview';
import { ProgressViewFilter, ProgressViewOption } from './components/ProgressViewFilter';
import { FilterBar } from './components/FilterBar';
import { SampleTable } from './components/SampleTable';
import { SampleCards } from './components/SampleCards';
import { SampleDetailModal } from './components/SampleDetailModal';
import { UploadModal } from './components/UploadModal';
import { PrintViewModal } from './components/PrintViewModal';
import { BeritaAcaraModal } from './components/BeritaAcaraModal';
import { QuickNusModal } from './components/QuickNusModal';
import { AccessControlModal } from './components/AccessControlModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { OfficerSelect } from './components/OfficerSelect';
import { 
  CheckCircle2, 
  AlertCircle, 
  X,
  Maximize2,
  Minimize2,
  Compass,
  Smartphone,
  SlidersHorizontal,
  Users,
  Radio,
  Wifi,
  RefreshCw,
  Clock,
  Database,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [activePetugas, setActivePetugas] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progressView, setProgressView] = useState<ProgressViewOption>('none');

  // Modals state
  const [selectedSample, setSelectedSample] = useState<SampleItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState<boolean>(false);
  const [quickNusSample, setQuickNusSample] = useState<SampleItem | null>(null);
  const [isQuickNusOpen, setIsQuickNusOpen] = useState<boolean>(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    petugas: 'all',
    statusFilter: 'ALL',
    tipeFilter: 'ALL',
    nksFilter: '',
    desaFilter: '',
    sortBy: 'nus',
    sortOrder: 'asc',
  });

  // Column visibility state (persisted in localStorage)
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(loadSavedVisibleColumns);

  // Rows per page (Pagination: 10, 25, 50, 100, or 'all')
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Full Screen & Responsive Device Orientation state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Server & Supabase synchronization state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [supabaseSyncState, setSupabaseSyncState] = useState<'synced' | 'saving' | 'error' | 'unconfigured'>(
    isSupabaseConfigured ? 'synced' : 'unconfigured'
  );
  const [supabaseSyncError, setSupabaseSyncError] = useState<string | null>(
    supabaseConfigStatus.errorMessage
  );
  const [showSupabaseConfigBanner, setShowSupabaseConfigBanner] = useState<boolean>(!isSupabaseConfigured);
  const [isRefreshingSupabase, setIsRefreshingSupabase] = useState<boolean>(false);
  const [unsavedCount, setUnsavedCount] = useState<number>(0);
  const [isSavingToServer, setIsSavingToServer] = useState<boolean>(false);
  const [isSyncingServer, setIsSyncingServer] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>('');

  // Instant Real-time Synchronization status across devices
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);
  const [realtimeNotice, setRealtimeNotice] = useState<{ message: string; time: string; updater: string } | null>(null);
  const [realtimePulse, setRealtimePulse] = useState<boolean>(false);

  // Refs to track live & baseline data without causing stale closures
  const samplesRef = useRef<SampleItem[]>([]);
  const lastSavedSamplesRef = useRef<SampleItem[]>([]);
  const unsavedCountRef = useRef<number>(0);

  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);

  // Authentication & Permissions state (Owner, Editor, or Guest)
  // Default: Mode Tamu (Belum Login) agar fitur "Akun Pemilik" HANYA nampak jika login sebagai sifarofatunnisa24@gmail.com
  const [authSession, setAuthSession] = useState<UserAuthSession>(() => {
    const saved = localStorage.getItem('sitasi_auth_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) {
          return parsed;
        }
      } catch {}
    }
    return {
      role: 'guest',
      displayName: 'Tamu (Belum Login)',
      canEdit: false,
    };
  });
  const [permissionConfig, setPermissionConfig] = useState<PermissionConfig | null>(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState<boolean>(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Load permission configuration from server
  useEffect(() => {
    fetch('/api/permissions')
      .then(res => res.json())
      .then(json => {
        const cfg = json.data || json.config;
        if (json.success && cfg) {
          setPermissionConfig(cfg);
        }
      })
      .catch(() => {});
  }, []);

  // Helper to calculate how many samples have differed from last saved server baseline
  const calculateUnsavedCount = useCallback((currentSamples: SampleItem[], baseline: SampleItem[]) => {
    if (!baseline || baseline.length === 0) return 0;
    const baseMap = new Map(baseline.map(s => [s.id, s]));
    let count = 0;
    for (const s of currentSamples) {
      const base = baseMap.get(s.id);
      if (!base) {
        count++;
        continue;
      }
      const isDiff =
        base.progressStatus !== s.progressStatus ||
        (base.hasilPendataanFasih || '') !== (s.hasilPendataanFasih || '') ||
        (base.nusPengganti || '') !== (s.nusPengganti || '') ||
        (base.catatanPetugas || '') !== (s.catatanPetugas || '') ||
        Boolean(base.isCompleted) !== Boolean(s.isCompleted);
      if (isDiff) {
        count++;
      }
    }
    return count;
  }, []);

  // Load initial data (Supabase as primary single source of truth, with graceful fallback)
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      let loadedSamples: SampleItem[] | null = null;
      let latestUpdatedAt: string | undefined;

      // 1. Primary Source of Truth: SELECT from Supabase when configured
      if (isSupabaseConfigured) {
        setSupabaseSyncState('saving');
        const supaRes = await fetchSamplesFromSupabase();
        if (supaRes.success) {
          setSupabaseSyncState('synced');
          setSupabaseSyncError(null);
          if (supaRes.data && supaRes.data.length > 0) {
            loadedSamples = supaRes.data;
            latestUpdatedAt = supaRes.updatedAt;
          }
        } else {
          setSupabaseSyncState('error');
          setSupabaseSyncError(supaRes.error || 'Gagal mengambil data dari Supabase.');
        }
      } else {
        setSupabaseSyncState('unconfigured');
        setSupabaseSyncError(supabaseConfigStatus.errorMessage);
      }

      // 2. Fallback to Express server /api/samples if Supabase has 0 rows or is unconfigured/offline
      if (!loadedSamples || loadedSamples.length === 0) {
        try {
          const response = await fetch(`/api/samples?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
          if (response.ok) {
            const json = await response.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
              loadedSamples = json.data;
              if (!latestUpdatedAt) {
                latestUpdatedAt = json.updatedAt;
              }
            }
          }
        } catch (err) {
          console.warn('Gagal menghubungi server untuk memuat data sampel, menggunakan local storage:', err);
        }
      }

      // 3. Fallback to localStorage if server has no samples yet
      if (!loadedSamples || loadedSamples.length === 0) {
        const saved = loadSavedSamples();
        if (saved && saved.length > 0) {
          loadedSamples = saved;
        }
      }

      // 4. Fallback to default CSV file if neither has data
      if (!loadedSamples || loadedSamples.length === 0) {
        try {
          const response = await fetch('/assets/aistudio/default_samples.csv');
          if (response.ok) {
            const text = await response.text();
            const rows = parseCSV(text);
            const parsed = parseSitasiData(rows, 'all');
            loadedSamples = parsed;
          }
        } catch (err) {
          console.error('Error fetching initial CSV:', err);
        }
      }

      if (loadedSamples && loadedSamples.length > 0) {
        samplesRef.current = loadedSamples;
        setSamples(loadedSamples);
        saveSamples(loadedSamples);
        lastSavedSamplesRef.current = loadedSamples;
        setUnsavedCount(0);
        unsavedCountRef.current = 0;
        setSyncStatus('synced');
        if (latestUpdatedAt) {
          const formatted = formatDateTimeZone(latestUpdatedAt);
          setLastSavedAt(formatted.displayFull);
        }
      }

      // Load active petugas from server or local
      try {
        const pRes = await fetch('/api/active-petugas');
        if (pRes.ok) {
          const pJson = await pRes.json();
          if (pJson.success && pJson.activePetugas) {
            setActivePetugas(pJson.activePetugas);
          } else {
            setActivePetugas(getSavedActivePetugas());
          }
        }
      } catch {
        setActivePetugas(getSavedActivePetugas());
      }

      setIsLoading(false);
    };

    initData();
  }, []);

  // Supabase Realtime Subscription (postgres_changes) + SSE fallback
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isCleanedUp = false;

    const channel = supabase
      .channel('sitasi_samples_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_SAMPLES_TABLE },
        () => {
          if (isCleanedUp || unsavedCountRef.current > 0) return;
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            if (isCleanedUp) return;
            const supaRes = await fetchSamplesFromSupabase();
            if (supaRes.success && supaRes.data && supaRes.data.length > 0 && !isCleanedUp) {
              samplesRef.current = supaRes.data;
              lastSavedSamplesRef.current = supaRes.data;
              setSamples(supaRes.data);
              saveSamples(supaRes.data);
              setUnsavedCount(0);
              unsavedCountRef.current = 0;
              setSyncStatus('synced');
              setSupabaseSyncState('synced');
              setSupabaseSyncError(null);
              const timeInfo = formatDateTimeZone(supaRes.updatedAt || new Date());
              setLastSavedAt(timeInfo.displayFull);
              setRealtimePulse(true);
              setTimeout(() => setRealtimePulse(false), 2000);
            }
          }, 500);
        }
      )
      .subscribe();

    return () => {
      isCleanedUp = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase?.removeChannel(channel);
    };
  }, []);

  // INSTANT REAL-TIME SYNCHRONIZATION VIA SSE (Server-Sent Events)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;
    let isCleanedUp = false;

    const connectSSE = () => {
      if (isCleanedUp) return;
      try {
        eventSource = new EventSource('/api/samples/live');

        eventSource.onopen = () => {
          setIsRealtimeConnected(true);
        };

        eventSource.addEventListener('connected', () => {
          setIsRealtimeConnected(true);
        });

        eventSource.addEventListener('samples_updated', (event: MessageEvent) => {
          // If Supabase is active, Supabase Realtime + manual/auto fetch takes priority
          if (isSupabaseConfigured) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload && Array.isArray(payload.samples)) {
              const incomingSamples: SampleItem[] = payload.samples;
              const updatedBy = payload.updatedBy || 'Admin/Pemilik';
              const timeResult = formatDateTimeZone(payload.updatedAt || new Date());
              const updateTime = timeResult.displayFull;

              if (unsavedCountRef.current === 0) {
                samplesRef.current = incomingSamples;
                lastSavedSamplesRef.current = incomingSamples;
                setSamples(incomingSamples);
                saveSamples(incomingSamples);
                setUnsavedCount(0);
                unsavedCountRef.current = 0;
                setSyncStatus('synced');
                setLastSavedAt(updateTime);

                setRealtimePulse(true);
                setTimeout(() => setRealtimePulse(false), 3000);

                setRealtimeNotice({
                  message: `Progres monitoring diperbarui oleh ${updatedBy}`,
                  time: updateTime,
                  updater: updatedBy,
                });

                showToast(`⚡ Sinkronisasi Otomatis: Progres baru saja diperbarui oleh ${updatedBy} (${updateTime})!`, 'info');
              } else {
                showToast(`ℹ️ Server diperbarui oleh ${updatedBy} (${updateTime}). Simpan perubahan lokal Anda jika ingin memperbarui.`, 'info');
              }
            }
          } catch (parseErr) {
            console.error('[SSE] Error parsing samples_updated event:', parseErr);
          }
        });

        eventSource.onerror = () => {
          setIsRealtimeConnected(false);
          eventSource?.close();
          if (!isCleanedUp) {
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connectSSE, 3000);
          }
        };
      } catch (err) {
        setIsRealtimeConnected(false);
        if (!isCleanedUp) {
          reconnectTimer = setTimeout(connectSSE, 5000);
        }
      }
    };

    connectSSE();

    // Safety-net periodic check every 15s
    const safetyPollInterval = setInterval(async () => {
      if (unsavedCountRef.current > 0) return;
      if (isSupabaseConfigured) {
        try {
          const supaRes = await fetchSamplesFromSupabase();
          if (supaRes.success && supaRes.data && supaRes.data.length > 0 && !isCleanedUp) {
            const currentDigest = lastSavedSamplesRef.current.map((s: any) => `${s.id}:${s.progressStatus}:${s.hasilPendataanFasih || ''}:${s.nusPengganti || ''}:${s.catatanPetugas || ''}`).join('|');
            const serverDigest = supaRes.data.map((s: any) => `${s.id}:${s.progressStatus}:${s.hasilPendataanFasih || ''}:${s.nusPengganti || ''}:${s.catatanPetugas || ''}`).join('|');
            if (currentDigest !== serverDigest) {
              samplesRef.current = supaRes.data;
              lastSavedSamplesRef.current = supaRes.data;
              setSamples(supaRes.data);
              saveSamples(supaRes.data);
              setUnsavedCount(0);
              unsavedCountRef.current = 0;
              setSyncStatus('synced');
              setSupabaseSyncState('synced');
              if (supaRes.updatedAt) {
                setLastSavedAt(formatDateTimeZone(supaRes.updatedAt).displayFull);
              }
            }
          }
        } catch {}
        return;
      }
      try {
        const res = await fetch(`/api/samples?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0 && !isCleanedUp) {
            const currentDigest = lastSavedSamplesRef.current.map((s: any) => `${s.id}:${s.progressStatus}:${s.hasilPendataanFasih || ''}:${s.nusPengganti || ''}:${s.catatanPetugas || ''}`).join('|');
            const serverDigest = json.data.map((s: any) => `${s.id}:${s.progressStatus}:${s.hasilPendataanFasih || ''}:${s.nusPengganti || ''}:${s.catatanPetugas || ''}`).join('|');
            if (currentDigest !== serverDigest) {
              samplesRef.current = json.data;
              lastSavedSamplesRef.current = json.data;
              setSamples(json.data);
              saveSamples(json.data);
              setUnsavedCount(0);
              unsavedCountRef.current = 0;
              setSyncStatus('synced');
            }
          }
        }
      } catch {}
    }, 15000);

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimer);
      clearInterval(safetyPollInterval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [showToast]);

  // MANUAL SAVE TO SUPABASE & SERVER:
  const handleManualSaveToServer = useCallback(async () => {
    if (!authSession.canEdit) {
      showToast('Akses ditolak: Hanya Akun Pemilik atau akun dengan izin edit yang dapat menyimpan perubahan!', 'error');
      setIsAccessModalOpen(true);
      return;
    }

    setIsSavingToServer(true);
    setSyncStatus('saving');
    if (isSupabaseConfigured) {
      setSupabaseSyncState('saving');
      setSupabaseSyncError(null);
    }

    try {
      // 1. Sync full dataset to Supabase when configured
      if (isSupabaseConfigured) {
        const supaSaveRes = await upsertSamplesBatchToSupabase(samples);
        if (!supaSaveRes.success) {
          setSupabaseSyncState('error');
          setSupabaseSyncError(supaSaveRes.error || 'Gagal menyimpan ke Supabase.');
          setSyncStatus('offline');
          showToast(`Gagal menyimpan ke Supabase: ${supaSaveRes.error}`, 'error');
          setIsSavingToServer(false);
          return;
        }
        setSupabaseSyncState('synced');
        setSupabaseSyncError(null);
      }

      // 2. Also persist to Express backup endpoint
      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-role': authSession.role,
          'x-auth-token': authSession.token || '',
          'x-auth-email': authSession.email || '',
        },
        body: JSON.stringify({
          samples,
          role: authSession.role,
          token: authSession.token,
          email: authSession.email,
        }),
      });

      const json = await res.json();
      if ((res.ok && json.success) || isSupabaseConfigured) {
        lastSavedSamplesRef.current = samples;
        setUnsavedCount(0);
        unsavedCountRef.current = 0;
        setSyncStatus('synced');
        const timeResult = formatDateTimeZone((res.ok && json.updatedAt) || new Date());
        setLastSavedAt(timeResult.displayFull);

        // Otomatis Simpan Backup ke Internal Device (dengan dialog memilih folder/lokasi file)
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const defaultFilename = `Backup_SITASI_2026_${timestamp}.json`;
          const backupPayload = {
            version: '1.0',
            exportedAt: timeResult.isoString,
            exportedAtWIB: timeResult.primaryWIB,
            exportedAtLocal: timeResult.localTime,
            totalSamples: samples.length,
            source: 'Otomatis saat Klik Simpan Perubahan',
            samples,
          };
          const jsonStr = JSON.stringify(backupPayload, null, 2);

          if ('showSaveFilePicker' in window) {
            try {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                  description: 'File Backup Data SITASI 2026 (.json)',
                  accept: { 'application/json': ['.json'] }
                }]
              });
              const writable = await handle.createWritable();
              await writable.write(jsonStr);
              await writable.close();
              showToast(`✅ Perubahan disimpan ke server & backup berhasil disimpan ke folder di device Anda! (${defaultFilename})`, 'success');
            } catch (pickerErr: any) {
              if (pickerErr.name === 'AbortError') {
                showToast(`✅ Perubahan disimpan permanen ke server & snapshot otomatis dibuat. (Pemilihan folder backup dibatalkan)`, 'info');
              } else {
                // Fallback auto download
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = defaultFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`✅ Perubahan disimpan ke server & file backup otomatis terunduh ke internal device (${defaultFilename}).`, 'success');
              }
            }
          } else {
            // Fallback for browsers without showSaveFilePicker
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`✅ Perubahan disimpan ke server & file backup otomatis terunduh ke internal device (${defaultFilename}).`, 'success');
          }
        } catch (deviceSaveErr) {
          console.warn('Auto backup to device error:', deviceSaveErr);
          showToast(`✅ Berhasil! Perubahan (${samples.length} sampel) telah disimpan permanen ke server.`, 'success');
        }
      } else {
        setSyncStatus('offline');
        showToast(`Gagal menyimpan ke server: ${json.error || 'Akses ditolak atau server bermasalah'}`, 'error');
      }
    } catch (err) {
      console.error('Error saving to server:', err);
      setSyncStatus('offline');
      showToast('Gagal terhubung ke server. Perubahan tetap tersimpan di memori browser ini.', 'error');
    } finally {
      setIsSavingToServer(false);
    }
  }, [authSession, samples, showToast]);

  // SINKRONKAN ULANG / REFRESH DATA DARI SUPABASE (atau server fallback)
  const handleRefreshFromSupabase = useCallback(async () => {
    setIsRefreshingSupabase(true);
    setIsSyncingServer(true);
    try {
      if (isSupabaseConfigured) {
        setSupabaseSyncState('saving');
        const supaRes = await fetchSamplesFromSupabase();
        if (!supaRes.success) {
          setSupabaseSyncState('error');
          setSupabaseSyncError(supaRes.error || 'Gagal menarik data dari Supabase.');
          showToast(`Gagal sinkron dari Supabase: ${supaRes.error}`, 'error');
          return;
        }

        const incoming = supaRes.data || [];
        const completedCount = incoming.filter(s => isSampleBerhasil(s)).length;

        samplesRef.current = incoming;
        lastSavedSamplesRef.current = incoming;
        setSamples(incoming);
        saveSamples(incoming);
        setUnsavedCount(0);
        unsavedCountRef.current = 0;
        setSyncStatus('synced');
        setSupabaseSyncState('synced');
        setSupabaseSyncError(null);

        const timeInfo = formatDateTimeZone(supaRes.updatedAt || new Date());
        setLastSavedAt(timeInfo.displayFull);

        setRealtimePulse(true);
        setTimeout(() => setRealtimePulse(false), 2000);

        showToast(
          incoming.length > 0
            ? `✅ Data Supabase disinkronkan (${incoming.length} sampel, ${completedCount} selesai dicacah) [${timeInfo.displayFull}].`
            : 'Tabel Supabase berhasil diperiksa (saat ini masih 0 baris).',
          'success'
        );
        return;
      }

      const bustCacheUrl = `/api/samples?_t=${Date.now()}`;
      const res = await fetch(bustCacheUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const incoming: SampleItem[] = json.data;
          const completedCount = incoming.filter(s => isSampleBerhasil(s)).length;

          samplesRef.current = incoming;
          lastSavedSamplesRef.current = incoming;
          setSamples(incoming);
          saveSamples(incoming);
          setUnsavedCount(0);
          unsavedCountRef.current = 0;
          setSyncStatus('synced');

          const timeInfo = formatDateTimeZone(json.updatedAt || new Date());
          setLastSavedAt(timeInfo.displayFull);

          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 2000);

          showToast(`✅ Data terbaru berhasil dimuat (${completedCount} selesai dicacah) [${timeInfo.displayFull}].`, 'success');
          return;
        }
      }
      showToast('Belum ada data tersimpan atau Supabase belum dikonfigurasi.', 'info');
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      if (isSupabaseConfigured) {
        setSupabaseSyncState('error');
        setSupabaseSyncError(err?.message || 'Gagal terhubung ke Supabase.');
      }
      showToast(`Gagal sinkronisasi data: ${err?.message || 'Periksa jaringan'}`, 'error');
    } finally {
      setIsRefreshingSupabase(false);
      setIsSyncingServer(false);
    }
  }, [showToast]);

  // Handler untuk Restore Data dari File atau Server Snapshot
  const handleRestoreSamples = useCallback(async (restored: SampleItem[], sourceLabel: string) => {
    try {
      if (isSupabaseConfigured) {
        setSupabaseSyncState('saving');
        const supaRes = await replaceAllSamplesInSupabase(restored);
        if (!supaRes.success) {
          setSupabaseSyncState('error');
          setSupabaseSyncError(supaRes.error || 'Gagal menyinkronkan restore ke Supabase.');
          showToast(`Gagal restore ke Supabase: ${supaRes.error}`, 'error');
          return false;
        }
        setSupabaseSyncState('synced');
        setSupabaseSyncError(null);
      }

      samplesRef.current = restored;
      setSamples(restored);
      saveSamples(restored);
      lastSavedSamplesRef.current = restored;
      setUnsavedCount(0);
      unsavedCountRef.current = 0;

      // Sync restored samples to local server backup as well
      await fetch('/api/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-role': authSession.role,
          'x-auth-token': authSession.token || '',
          'x-auth-email': authSession.email || '',
        },
        body: JSON.stringify({
          samples: restored,
          role: authSession.role,
          token: authSession.token,
          email: authSession.email,
        }),
      }).catch(() => {});

      setSyncStatus('synced');
      const timeInfo = formatDateTimeZone(new Date());
      setLastSavedAt(timeInfo.displayFull);
      showToast(`✅ Berhasil merestore ${restored.length} sampel dari "${sourceLabel}" & disinkronkan ke ${isSupabaseConfigured ? 'Supabase' : 'server'} (${timeInfo.displayFull}).`, 'success');
      return true;
    } catch (err) {
      console.error('Error restoring samples:', err);
      showToast('Gagal menyinkronkan data hasil restore.', 'error');
      return false;
    }
  }, [authSession, showToast]);

  // Direct Mutation Sync Helper:
  // Memperbarui UI seketika dan langsung menjalankan UPDATE / UPSERT / DELETE ke Supabase (bila terkonfigurasi)
  const updateSamplesState = useCallback(
    (
      updater: (prev: SampleItem[]) => SampleItem[],
      toastMsg?: string,
      options?: { deletedIds?: string[]; skipAutoSupabase?: boolean }
    ) => {
      const prev = samplesRef.current;
      const updated = updater(prev);
      samplesRef.current = updated;
      setSamples(updated);
      saveSamples(updated);

      // Compute changed or added rows compared to prev for direct incremental UPSERT
      const prevMap = new Map(prev.map(s => [s.id, s]));
      const changedRows = updated.filter(s => prevMap.get(s.id) !== s);
      const deletedIds = options?.deletedIds || [];

      if (isSupabaseConfigured && !options?.skipAutoSupabase && (changedRows.length > 0 || deletedIds.length > 0)) {
        setSupabaseSyncState('saving');
        setSupabaseSyncError(null);

        (async () => {
          try {
            if (deletedIds.length > 0) {
              const delRes = await deleteSamplesFromSupabase(deletedIds);
              if (!delRes.success) {
                setSupabaseSyncState('error');
                setSupabaseSyncError(delRes.error || 'Gagal menghapus data di Supabase.');
                showToast(`Gagal hapus di Supabase: ${delRes.error}`, 'error');
                return;
              }
            }

            if (changedRows.length > 0) {
              const upsertRes = await upsertSamplesBatchToSupabase(changedRows);
              if (!upsertRes.success) {
                setSupabaseSyncState('error');
                setSupabaseSyncError(upsertRes.error || 'Gagal menyimpan perubahan ke Supabase.');
                const diffs = calculateUnsavedCount(samplesRef.current, lastSavedSamplesRef.current);
                setUnsavedCount(diffs);
                unsavedCountRef.current = diffs;
                showToast(`Gagal sinkron ke Supabase: ${upsertRes.error}`, 'error');
                return;
              }
            }

            setSupabaseSyncState('synced');
            setSupabaseSyncError(null);
            lastSavedSamplesRef.current = updated;
            setUnsavedCount(0);
            unsavedCountRef.current = 0;
            setSyncStatus('synced');
            const timeInfo = formatDateTimeZone(new Date());
            setLastSavedAt(timeInfo.displayFull);

            if (toastMsg) {
              showToast(`${toastMsg} (Tersinkron ke Supabase)`, 'success');
            }
          } catch (err: any) {
            setSupabaseSyncState('error');
            setSupabaseSyncError(err?.message || 'Gagal menghubungi Supabase.');
            showToast(`Gagal sinkron ke Supabase: ${err?.message || 'Periksa koneksi'}`, 'error');
          }
        })();
        return;
      }

      const diffs = calculateUnsavedCount(updated, lastSavedSamplesRef.current);
      setUnsavedCount(diffs);
      unsavedCountRef.current = diffs;
      if (toastMsg) {
        showToast(`${toastMsg}${isSupabaseConfigured ? '' : " (Klik 'Simpan Perubahan' untuk simpan ke server)"}`, 'info');
      }
    },
    [calculateUnsavedCount, showToast]
  );

  // Auth & Permissions Handlers
  const handleLoginAccess = async (keyOrPin: string, email?: string) => {
    try {
      const res = await fetch('/api/permissions/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyOrPin, email }),
      });
      const json = await res.json();
      if (json.success) {
        const isOwnerRole = json.role === 'owner';
        const session: UserAuthSession = {
          role: json.role,
          email: json.email || email,
          displayName: json.displayName || (isOwnerRole ? 'Pemilik (sifarofatunnisa24@gmail.com)' : (json.email || email || 'Pengguna Google')),
          token: json.token,
          canEdit: isOwnerRole || json.role === 'editor',
          loginAt: new Date().toISOString(),
        };
        setAuthSession(session);
        localStorage.setItem('sitasi_auth_session', JSON.stringify(session));
        showToast(json.message || 'Login berhasil!', 'success');
        return { success: true, message: json.message };
      } else {
        return { success: false, message: json.error || json.message || 'Gagal login akun Google.' };
      }
    } catch {
      return { success: false, message: 'Gagal menghubungi server autentikasi' };
    }
  };

  const handleLogoutAccess = () => {
    const guestSession: UserAuthSession = {
      role: 'guest',
      displayName: 'Tamu (Belum Login)',
      canEdit: false,
    };
    setAuthSession(guestSession);
    localStorage.removeItem('sitasi_auth_session');
    setIsAccessModalOpen(false);
    showToast('Berhasil keluar. Fitur Akun Pemilik dinonaktifkan.', 'info');
  };

  const handleGoogleModalLogin = async (email: string, pinOrKey?: string) => {
    return handleLoginAccess(pinOrKey || '', email);
  };

  const handleUpdatePermissions = async (updated: {
    ownerPin: string;
    accessMode: 'owner_only' | 'allow_permitted' | 'public';
    accessKey?: string;
    newOwnerPin?: string;
    allowedEmails?: string[];
    allowedPetugas?: string[];
  }) => {
    try {
      const res = await fetch('/api/permissions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updated,
          role: authSession.role,
          token: authSession.token,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPermissionConfig(json.data || json.config);
        showToast('Pengaturan hak akses berhasil diperbarui!', 'success');
        return { success: true, message: json.message };
      } else {
        return { success: false, message: json.error || json.message || 'Gagal memperbarui izin' };
      }
    } catch {
      return { success: false, message: 'Gagal menghubungi server pengaturan izin' };
    }
  };


  // Summaries
  const petugasSummaries = useMemo(() => {
    return calculatePetugasSummaries(samples);
  }, [samples]);

  const hasDemoOfficers = useMemo(() => {
    return petugasSummaries.some(p => p.nama !== 'Erika');
  }, [petugasSummaries]);

  // Unique lists for dropdowns
  const availableNks = useMemo(() => {
    const target = activePetugas === 'all' ? samples : samples.filter(s => s.petugas === activePetugas);
    return Array.from(new Set(target.map(s => s.nks))).sort();
  }, [samples, activePetugas]);

  const availableDesa = useMemo(() => {
    const target = activePetugas === 'all' ? samples : samples.filter(s => s.petugas === activePetugas);
    return Array.from(new Set(target.map(s => s.desa))).sort();
  }, [samples, activePetugas]);

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return samples.filter(s => {
      // Petugas filter
      if (activePetugas !== 'all' && s.petugas !== activePetugas) {
        return false;
      }

      // Tipe filter
      if (filters.tipeFilter !== 'ALL' && s.statusSampel !== filters.tipeFilter) {
        return false;
      }

      // Status filter with 3 mutually exclusive categories (Hanya 3 Kategori, hilangkan status Draft):
      // 1. BERHASIL / SELESAI (Kode 1: 1. Berhasil diwawancarai)
      // 2. TIDAK_BERHASIL / MASALAH (Kode 2 sampai 5: Menolak, Tidak Dapat Ditemui, Pindah, Bukan Pertanian)
      // 3. BELUM_DIWAWANCARA / BELUM (- Belum Diwawancara: kategori tersendiri)
      if (filters.statusFilter === 'BERHASIL' || filters.statusFilter === 'SELESAI') {
        if (!isSampleBerhasil(s)) return false;
      } else if (filters.statusFilter === 'TIDAK_BERHASIL' || filters.statusFilter === 'MASALAH') {
        if (!isSampleTidakBerhasil(s)) return false;
      } else if (filters.statusFilter === 'BELUM_DIWAWANCARA' || filters.statusFilter === 'DRAFT' || filters.statusFilter === 'BELUM') {
        if (!isSampleBelumDiwawancara(s)) return false;
      }

      // FASIH specific filter
      if (filters.fasihFilter && filters.fasihFilter !== 'ALL') {
        if (filters.fasihFilter === 'BERHASIL') {
          if (!isSampleBerhasil(s)) return false;
        } else if (filters.fasihFilter === 'TERKENDALA' || filters.fasihFilter === 'GAGAL_PERLU_GANTI') {
          if (!isSampleTidakBerhasil(s)) return false;
        } else if (filters.fasihFilter === 'SUDAH_DIGANTI') {
          if (!isSampleTidakBerhasil(s) || !s.nusPengganti) return false;
        } else if (filters.fasihFilter === 'BELUM') {
          if (!isSampleBelumDiwawancara(s)) return false;
        }
      }

      // NKS filter
      if (filters.nksFilter && s.nks !== filters.nksFilter) return false;

      // Desa filter
      if (filters.desaFilter && s.desa !== filters.desaFilter) return false;

      // Search Query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const match = 
          s.namaUTP.toLowerCase().includes(q) ||
          s.namaKRT.toLowerCase().includes(q) ||
          s.nus.toLowerCase().includes(q) ||
          s.nks.toLowerCase().includes(q) ||
          s.noTelp.includes(q) ||
          s.alamat.toLowerCase().includes(q) ||
          s.komoditas.toLowerCase().includes(q) ||
          s.sls.toLowerCase().includes(q) ||
          s.petugas.toLowerCase().includes(q) ||
          (s.hasilPendataanFasih && s.hasilPendataanFasih.toLowerCase().includes(q)) ||
          (s.statusDokumenFasih && s.statusDokumenFasih.toLowerCase().includes(q)) ||
          (s.akunFasih && s.akunFasih.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'nus') {
        const numA = parseInt(a.nus, 10) || 0;
        const numB = parseInt(b.nus, 10) || 0;
        return filters.sortOrder === 'asc' ? numA - numB : numB - numA;
      }
      if (filters.sortBy === 'nama') {
        const cmp = a.namaUTP.localeCompare(b.namaUTP);
        return filters.sortOrder === 'asc' ? cmp : -cmp;
      }
      if (filters.sortBy === 'status') {
        const isDoneA = a.progressStatus === 'SELESAI' ? 1 : 0;
        const isDoneB = b.progressStatus === 'SELESAI' ? 1 : 0;
        return filters.sortOrder === 'asc' ? isDoneA - isDoneB : isDoneB - isDoneA;
      }
      return 0;
    });
  }, [samples, activePetugas, filters]);

  // Paginated samples according to pageSize and currentPage
  const paginatedSamples = useMemo(() => {
    if (pageSize === 'all') return filteredSamples;
    const size = typeof pageSize === 'number' ? pageSize : 25;
    const startIndex = (currentPage - 1) * size;
    return filteredSamples.slice(startIndex, startIndex + size);
  }, [filteredSamples, pageSize, currentPage]);

  // Reset currentPage to 1 whenever filteredSamples count or filters change
  useEffect(() => {
    if (pageSize !== 'all') {
      const size = typeof pageSize === 'number' ? pageSize : 25;
      const maxPages = Math.max(1, Math.ceil(filteredSamples.length / size));
      if (currentPage > maxPages) {
        setCurrentPage(1);
      }
    }
  }, [filteredSamples.length, pageSize, currentPage]);

  // Column Visibility Handlers
  const handleToggleColumn = useCallback((key: TableColumnKey) => {
    setVisibleColumns(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      saveVisibleColumns(updated);
      return updated;
    });
  }, []);

  const handleSetAllColumns = useCallback((visible: boolean) => {
    setVisibleColumns(prev => {
      const updated: VisibleColumns = { ...prev };
      (Object.keys(updated) as TableColumnKey[]).forEach(k => {
        updated[k] = visible;
      });
      saveVisibleColumns(updated);
      return updated;
    });
  }, []);

  const handleResetColumns = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    saveVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    showToast('Tampilan kolom tabel dikembalikan ke default.', 'info');
  }, [showToast]);

  // Pagination Handlers
  const handlePageSizeChange = useCallback((size: PageSizeOption) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Monitor screen orientation (portrait vs landscape)
  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait');
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  // Monitor native browser fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Keyboard ESC listener for software fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleToggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
      showToast('Mode Layar Penuh diaktifkan. Tekan ESC atau klik tombol Keluar untuk kembali.', 'info');
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen, showToast]);

  // Handle Quick Toggle (One-Click Checklist)
  const handleQuickToggleComplete = useCallback((id: string) => {
    updateSamplesState(prev => {
      let nowCompleted = false;
      let targetOfficer = '';
      const today = new Date().toISOString().split('T')[0];

      const updated = prev.map(s => {
        if (s.id === id) {
          const isDone = isSampleBerhasil(s);
          nowCompleted = !isDone;
          targetOfficer = s.petugas;

          const nextStatus: SurveyProgressStatus = nowCompleted ? 'SELESAI' : 'BELUM';
          const nextFasih = nowCompleted ? '1. Berhasil diwawancarai' : '-';

          return {
            ...s,
            progressStatus: nextStatus,
            hasilPendataanFasih: nextFasih,
            isCompleted: nowCompleted,
            tanggalCacah: nowCompleted ? (s.tanggalCacah || today) : undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });

      // Check if target officer reached 100% on Utama samples!
      if (nowCompleted && targetOfficer) {
        const officerUtama = updated.filter(s => s.petugas === targetOfficer && s.statusSampel === 'U');
        const doneUtama = officerUtama.filter(s => isSampleBerhasil(s));
        if (officerUtama.length > 0 && doneUtama.length === officerUtama.length) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          showToast(`Luar biasa! Seluruh sampel utama untuk ${targetOfficer} telah 100% selesai! 🎉`, 'success');
        } else {
          showToast('Status sampel berhasil diubah.', 'success');
        }
      }

      return updated;
    });
  }, [showToast]);

  // Handle Dropdown Status / Hasil Pendataan Change
  // Automatic two-way real-time synchronization:
  // - Kode 1 / SELESAI -> Kategori Berhasil Diwawancarai
  // - Kode 2 sampai 5 -> Kategori Tidak Berhasil Diwawancarai (wajib cadangan jika Sampel Utama)
  // - Kode Draft (-) / BELUM -> Kategori Draft (tersendiri, bukan berhasil dan bukan tidak berhasil)
  const handleChangeStatus = useCallback((id: string, statusOrFasih: string) => {
    updateSamplesState(prev => {
      const today = new Date().toISOString().split('T')[0];
      return prev.map(s => {
        if (s.id === id) {
          let mappedStatus: SurveyProgressStatus;
          let mappedFasih: string;

          if (['SELESAI', 'BELUM', 'MENOLAK', 'TIDAK_DITEMUKAN', 'NON_AKTIF'].includes(statusOrFasih)) {
            mappedStatus = statusOrFasih as SurveyProgressStatus;
            mappedFasih = mapSurveyStatusToFasih(mappedStatus);
          } else {
            mappedFasih = statusOrFasih;
            mappedStatus = mapFasihToSurveyStatus(mappedFasih);
          }

          const kategori = getHasilKategori({ hasilPendataanFasih: mappedFasih, progressStatus: mappedStatus });
          const isDone = kategori === 'BERHASIL';

          return {
            ...s,
            progressStatus: mappedStatus,
            hasilPendataanFasih: mappedFasih,
            isCompleted: isDone,
            tanggalCacah: isDone ? (s.tanggalCacah || today) : undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
    }, 'Status & Hasil Pendataan otomatis tersinkronisasi');
  }, []);

  // Handle FASIH-SM Hasil Pendataan Change (synchronizes both fields identically in real-time)
  const handleChangeHasilPendataan = useCallback((id: string, hasilFasih: string) => {
    handleChangeStatus(id, hasilFasih);
  }, [handleChangeStatus]);

  // Selection toggle
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (filteredSamples.every(s => selectedIds.has(s.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSamples.map(s => s.id)));
    }
  };

  // Batch actions
  const handleBatchComplete = () => {
    const today = new Date().toISOString().split('T')[0];
    updateSamplesState(prev => {
      return prev.map(s => {
        if (selectedIds.has(s.id)) {
          return {
            ...s,
            progressStatus: 'SELESAI',
            hasilPendataanFasih: '1. Berhasil diwawancarai',
            isCompleted: true,
            tanggalCacah: s.tanggalCacah || today,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
    }, `${selectedIds.size} sampel berhasil ditandai selesai dicacah.`);
    setSelectedIds(new Set());
  };

  const handleBatchReset = () => {
    updateSamplesState(prev => {
      return prev.map(s => {
        if (selectedIds.has(s.id)) {
          return {
            ...s,
            progressStatus: 'BELUM',
            hasilPendataanFasih: '-',
            isCompleted: false,
            tanggalCacah: undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
    }, `${selectedIds.size} sampel di-reset ke status Belum Diwawancara.`);
    setSelectedIds(new Set());
  };

  // Switch officer with server synchronization
  const handleSelectPetugas = (petugas: string) => {
    setActivePetugas(petugas);
    saveActivePetugas(petugas);
    fetch('/api/active-petugas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activePetugas: petugas }),
    }).catch(() => {});
    setSelectedIds(new Set());
  };

  // Add demo officers
  const handleAddDemoOfficers = () => {
    const demo = generateDemoAdditionalOfficers();
    updateSamplesState(prev => {
      // Filter out existing ones with same id
      const existingIds = new Set(prev.map(p => p.id));
      const filteredDemo = demo.filter(d => !existingIds.has(d.id));
      return [...prev, ...filteredDemo];
    }, 'Berhasil menambahkan data simulasi petugas (Budi Pratama & Siti Nurhaliza)!');
  };

  // Reset to default with Supabase & server reset
  const handleResetData = async () => {
    if (window.confirm('Apakah Anda yakin ingin memuat ulang data awal dari file Excel/CSV Erika? Perubahan checklist yang tersimpan akan dikembalikan ke awal.')) {
      localStorage.removeItem('sitasi_2026_monitoring_samples_v1');
      localStorage.removeItem('sitasi_2026_active_petugas');
      setIsLoading(true);
      try {
        await fetch('/api/reset-data', { method: 'POST' }).catch(() => {});
        const response = await fetch('/assets/aistudio/Sampel_SITASI_2026_-_Erika_b0fbe93c.csv');
        const text = await response.text();
        const rows = parseCSV(text);
        const parsed = parseSitasiData(rows, 'Erika');

        if (isSupabaseConfigured) {
          setSupabaseSyncState('saving');
          const supaRes = await replaceAllSamplesInSupabase(parsed);
          if (!supaRes.success) {
            setSupabaseSyncState('error');
            setSupabaseSyncError(supaRes.error || 'Gagal mereset data di Supabase.');
            showToast(`Reset lokal berhasil, tetapi gagal sinkron ke Supabase: ${supaRes.error}`, 'error');
          } else {
            setSupabaseSyncState('synced');
            setSupabaseSyncError(null);
          }
        }

        samplesRef.current = parsed;
        lastSavedSamplesRef.current = parsed;
        setSamples(parsed);
        saveSamples(parsed);
        setUnsavedCount(0);
        unsavedCountRef.current = 0;
        setActivePetugas('all');
        saveActivePetugas('all');
        setSelectedIds(new Set());
        setLastSavedAt(formatDateTimeZone(new Date()).displayFull);

        // Seed Express backup as well
        await fetch('/api/samples', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-role': authSession.role,
            'x-auth-token': authSession.token || '',
            'x-auth-email': authSession.email || '',
          },
          body: JSON.stringify({ samples: parsed, role: authSession.role, token: authSession.token, email: authSession.email }),
        }).catch(() => {});
        showToast(`Data berhasil dikembalikan ke sampel default Erika dan disinkronkan ke ${isSupabaseConfigured ? 'Supabase' : 'server'}.`, 'info');
      } catch (err) {
        console.error('Reset error:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // One-click Clear / Hapus NUS Pengganti
  const handleClearPengganti = useCallback((id: string) => {
    updateSamplesState(prev => {
      const target = prev.find(s => s.id === id);
      if (!target) return prev;
      const oldPenggantiNus = target.nusPengganti;
      const isUtama = target.statusSampel === 'U';

      return prev.map(s => {
        // Clear target sample's pengganti
        if (s.id === id) {
          return {
            ...s,
            nusPengganti: undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        // If target was Utama and referenced a Cadangan, also clear that Cadangan's reference
        if (isUtama && oldPenggantiNus && s.statusSampel === 'C' && s.nus === oldPenggantiNus && s.nks === target.nks) {
          if (s.nusPengganti === target.nus) {
            return {
              ...s,
              nusPengganti: undefined,
              updatedAt: new Date().toISOString(),
            };
          }
        }
        // If target was Cadangan and replaced an Utama, clear that Utama's reference too
        if (!isUtama && oldPenggantiNus && s.statusSampel === 'U' && s.nus === oldPenggantiNus && s.nks === target.nks) {
          if (s.nusPengganti === target.nus) {
            return {
              ...s,
              nusPengganti: undefined,
              updatedAt: new Date().toISOString(),
            };
          }
        }
        return s;
      });
    }, 'NUS Pengganti berhasil dihapus dan disimpan ke server.');
  }, []);

  // One-click Clear / Hapus Catatan Petugas
  const handleClearCatatan = useCallback((id: string) => {
    updateSamplesState(prev => {
      return prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            catatanPetugas: undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
    }, 'Catatan petugas berhasil dihapus.');
  }, []);

  // Quick NUS modal openers & savers
  const handleOpenQuickNus = useCallback((sample: SampleItem) => {
    setQuickNusSample(sample);
    setIsQuickNusOpen(true);
  }, []);

  const handleSaveQuickNus = useCallback((sampleId: string, newNus: string) => {
    updateSamplesState(prev => {
      const target = prev.find(s => s.id === sampleId);
      if (!target) return prev;
      const isUtama = target.statusSampel === 'U';

      return prev.map(s => {
        if (s.id === sampleId) {
          return {
            ...s,
            nusPengganti: newNus.trim() || undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        // Link counterpart if applicable in the same NKS
        if (isUtama && newNus.trim() && s.statusSampel === 'C' && s.nus === newNus.trim() && s.nks === target.nks) {
          return {
            ...s,
            nusPengganti: target.nus,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
    }, `NUS Pengganti berhasil diperbarui ke NUS ${newNus}.`);
  }, []);

  // Save detail modal changes
  const handleSaveDetail = (updated: Partial<SampleItem>) => {
    if (!selectedSample) return;
    updateSamplesState(prev => {
      return prev.map(s => {
        if (s.id === selectedSample.id) {
          return {
            ...s,
            ...updated,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
    }, `Perubahan sampel ${selectedSample.nus} berhasil disimpan.`);
  };

  // Delete single sample (executes DELETE query to Supabase)
  const handleDeleteSample = useCallback((id: string) => {
    updateSamplesState(
      prev => prev.filter(s => s.id !== id),
      'Sampel berhasil dihapus.',
      { deletedIds: [id] }
    );
  }, [updateSamplesState]);

  // Import handler from upload modal (supports multiple files & Supabase batched upsert)
  const handleImportMultiple = (
    allSamples: SampleItem[],
    mode: 'append' | 'replace-all',
    summaryMsg: string,
    syncedToSupabase?: boolean
  ) => {
    updateSamplesState(
      prev => {
        if (mode === 'replace-all') {
          return allSamples;
        }
        // append mode: merge by ID or append
        const existingMap = new Map(prev.map(s => [s.id, s]));
        allSamples.forEach(s => {
          existingMap.set(s.id, s);
        });
        return Array.from(existingMap.values());
      },
      undefined,
      { skipAutoSupabase: Boolean(syncedToSupabase) }
    );

    if (syncedToSupabase) {
      lastSavedSamplesRef.current = samplesRef.current;
      setUnsavedCount(0);
      unsavedCountRef.current = 0;
      setSyncStatus('synced');
      setSupabaseSyncState('synced');
      setSupabaseSyncError(null);
      const timeInfo = formatDateTimeZone(new Date());
      setLastSavedAt(timeInfo.displayFull);
    }

    showToast(summaryMsg, 'success');

    // If all uploaded files belong to one officer, switch to that officer; otherwise 'all'
    const uniqueOfficers = Array.from(new Set(allSamples.map(s => s.petugas)));
    if (uniqueOfficers.length === 1) {
      setActivePetugas(uniqueOfficers[0]);
      saveActivePetugas(uniqueOfficers[0]);
    } else {
      setActivePetugas('all');
      saveActivePetugas('all');
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    const filename = activePetugas === 'all' 
      ? 'Monitoring_SITASI_2026_Semua_Petugas.xlsx' 
      : `Monitoring_SITASI_2026_${activePetugas}.xlsx`;
    exportToExcel(filteredSamples, filename, samples);
    showToast(`File Excel ${filename} berhasil diunduh (termasuk Sheet Rekap Monitoring & Detail Sampel).`, 'success');
  };

  const handleExportRekapOnly = () => {
    const filename = 'Rekap_Monitoring_Petugas_SITASI_2026.xlsx';
    exportRekapOnlyToExcel(samples, filename);
    showToast(`File Rekap Excel ${filename} berhasil diunduh.`, 'success');
  };

  const handleExportCSV = () => {
    const filename = activePetugas === 'all' 
      ? 'Monitoring_SITASI_2026_Semua_Petugas.csv' 
      : `Monitoring_SITASI_2026_${activePetugas}.csv`;
    exportToCSV(filteredSamples, filename);
    showToast(`File CSV ${filename} berhasil diunduh.`, 'success');
  };

  const handleExportRekapCSV = () => {
    const filename = 'Rekap_Monitoring_Petugas_SITASI_2026.csv';
    exportRekapToCSV(samples, filename);
    showToast(`File Rekap CSV ${filename} berhasil diunduh.`, 'success');
  };

  // Cadangan options for NUS Pengganti picker
  const cadanganOptions = useMemo(() => {
    return samples.filter(s => s.statusSampel === 'C');
  }, [samples]);

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 ${
      isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-50' : ''
    }`}>
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header (Frozen / Sticky top-0 z-50) */}
      <Header
        petugasList={petugasSummaries}
        activePetugas={activePetugas}
        onSelectPetugas={handleSelectPetugas}
        onOpenUpload={() => setIsUploadOpen(true)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onExportRekapOnly={handleExportRekapOnly}
        onExportRekapCSV={handleExportRekapCSV}
        onOpenPrint={() => setIsPrintOpen(true)}
        onOpenBeritaAcara={() => setIsBeritaAcaraOpen(true)}
        onAddDemoOfficers={handleAddDemoOfficers}
        onResetData={handleResetData}
        hasDemoOfficers={hasDemoOfficers}
        isFullscreen={isFullscreen}
        orientation={orientation}
        onToggleFullscreen={handleToggleFullscreen}
        authSession={authSession}
        onOpenAccessModal={() => setIsAccessModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogoutAccess}
        supabaseSyncState={supabaseSyncState}
        supabaseSyncError={supabaseSyncError}
        isRefreshingSupabase={isRefreshingSupabase}
        onRefreshSupabase={handleRefreshFromSupabase}
      />

      {/* Main Content Body */}
      <main className={`flex-1 w-full mx-auto py-6 space-y-6 transition-all duration-200 ${
        isFullscreen 
          ? 'max-w-none px-2 sm:px-4 md:px-6' 
          : 'max-w-7xl px-4 sm:px-6 lg:px-8'
      }`}>
        
        {/* Clear Notification if Supabase env vars are missing */}
        {!isSupabaseConfigured && showSupabaseConfigBanner && (
          <div className="bg-amber-50 border border-amber-300 text-amber-950 px-4 py-3 rounded-xl flex items-start justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">
                  Konfigurasi Supabase Belum Lengkap ({supabaseConfigStatus.errorMessage})
                </p>
                <p className="text-amber-900 leading-relaxed">
                  Untuk mengaktifkan database utama Supabase secara permanen: tambahkan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> dan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> pada environment variables / Secrets, lalu jalankan skrip <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">supabase_schema.sql</code> di SQL Editor Supabase. Dashboard tetap berjalan aman menggunakan penyimpanan cadangan lokal/server.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSupabaseConfigBanner(false)}
              className="text-amber-700 hover:text-amber-950 p-1 rounded hover:bg-amber-100 cursor-pointer shrink-0"
              title="Tutup pemberitahuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clear Notification if Supabase Query/Sync Failed */}
        {isSupabaseConfigured && supabaseSyncState === 'error' && supabaseSyncError && (
          <div className="bg-rose-50 border border-rose-300 text-rose-950 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-start space-x-2.5 max-w-3xl">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Gagal Sinkronisasi Supabase:</span>
                <span className="text-rose-800 break-words">{supabaseSyncError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRefreshFromSupabase}
              disabled={isRefreshingSupabase}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingSupabase ? 'animate-spin' : ''}`} />
              <span>Coba Sinkronkan Ulang</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-base font-bold text-slate-800">Memuat Data Sampel SITASI 2026...</h3>
            <p className="text-xs text-slate-500 mt-1">
              {isSupabaseConfigured
                ? 'Mengambil data terbaru langsung dari database Supabase...'
                : 'Menguraikan sampel UTP Kubu Raya, koordinat lokasi, dan status lapangan...'}
            </p>
          </div>
        ) : (
          <>
            {/* Server Synchronization Status Bar with Last Updated (WIB) */}
            <div className={`flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border transition-all duration-300 shadow-2xs text-xs ${
              realtimePulse ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                  isSavingToServer || supabaseSyncState === 'saving'
                    ? 'bg-amber-500 animate-ping' 
                    : supabaseSyncState === 'error'
                    ? 'bg-rose-500'
                    : unsavedCount > 0 
                    ? 'bg-amber-500 animate-pulse' 
                    : syncStatus === 'synced' 
                    ? 'bg-emerald-500' 
                    : 'bg-slate-400'
                }`} />
                <span className="font-bold text-slate-800">
                  {isSavingToServer || supabaseSyncState === 'saving' ? (
                    '🟡 Menyimpan perubahan...'
                  ) : supabaseSyncState === 'error' ? (
                    <span className="text-rose-700 font-bold">🔴 Gagal sinkron ke Supabase</span>
                  ) : unsavedCount > 0 ? (
                    <span className="text-amber-800 font-bold">
                      ⚠️ Ada {unsavedCount} perubahan belum disimpan! (Klik tombol "Simpan Perubahan" di bawah)
                    </span>
                  ) : isSupabaseConfigured ? (
                    '🟢 Tersinkron ke Supabase'
                  ) : syncStatus === 'synced' ? (
                    '🟢 Seluruh data tersimpan di server lokal'
                  ) : (
                    '⚪ Mode Offline (Tersimpan Lokal)'
                  )}
                </span>
                
                {/* Keterangan Last Updated (WIB) ketika Admin/Pemilik melakukan update progress monitoring lapangan */}
                {lastSavedAt && (
                  <div 
                    className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 border border-slate-300/80 px-2.5 py-1 rounded-md text-[11px] font-medium"
                    title="Waktu terakhir Admin/Pemilik memperbarui dan menyimpan progres monitoring lapangan (Zona Waktu WIB)"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Last Updated: <strong className="text-slate-900 font-bold">{lastSavedAt}</strong></span>
                  </div>
                )}
                {!authSession.canEdit && (
                  <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                    🔒 Mode Hanya Lihat (Read-Only)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                  {samples.length} Sampel SITASI 2026
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-700">
                  {activePetugas === 'all' ? 'Semua Petugas (8 Petugas)' : `Petugas: ${activePetugas}`}
                </span>
              </div>
            </div>

            {/* Realtime Live Update Banner when Admin/Pemilik clicks Simpan Perubahan */}
            {realtimeNotice && (
              <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs text-emerald-900 shadow-2xs animate-fadeIn">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span>
                    <strong>⚡ Update Realtime Diterima:</strong> {realtimeNotice.message} ({realtimeNotice.time}). Seluruh ringkasan progres dan tabel telah tersinkronisasi otomatis.
                  </span>
                </div>
                <button 
                  onClick={() => setRealtimeNotice(null)} 
                  className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 text-xs rounded hover:bg-emerald-100"
                >
                  Tutup ✕
                </button>
              </div>
            )}

            {/* Reassuring banner for Viewers / Other Google Accounts */}
            {!authSession.canEdit && (
              <div className="bg-sky-50 border border-sky-200 text-sky-900 px-3.5 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <Wifi className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    <strong>📱 Mode Pantau Otomatis:</strong> Anda terhubung sebagai <em>{authSession.displayName}</em> (Mode Hanya Lihat). Progres monitoring lapangan tersinkron otomatis saat Admin/Pemilik memperbarui data.
                  </span>
                </div>
                {lastSavedAt && (
                  <div className="inline-flex items-center space-x-1.5 text-slate-700 font-medium text-[11px] bg-white/90 border border-sky-200 px-2.5 py-1 rounded-md">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>Last Updated: <strong className="text-slate-900">{lastSavedAt}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Top Stat Cards */}
            <StatisticsCards
              samples={samples}
              filteredSamples={filteredSamples}
              activePetugas={activePetugas}
              onOpenBeritaAcara={() => setIsBeritaAcaraOpen(true)}
            />

            {/* Filter Tampilan Progres per NKS & Desa dan Petugas Lapangan */}
            <ProgressViewFilter
              currentView={progressView}
              onChangeView={setProgressView}
              petugasCount={petugasSummaries.length}
              nksCount={availableNks.length}
            />

            {/* Progres Masing-Masing Petugas Lapangan (Dimunculkan jika dipilih pada filter) */}
            {(progressView === 'petugas' || progressView === 'both') && petugasSummaries.length > 0 && (
              <PetugasOverview
                petugasList={petugasSummaries}
                activePetugas={activePetugas}
                onSelectPetugas={handleSelectPetugas}
                onClose={() => setProgressView(prev => prev === 'both' ? 'nks' : 'none')}
              />
            )}

            {/* Progres per NKS (Nomor Kode Sampel) & Desa (Dimunculkan jika dipilih pada filter) */}
            {(progressView === 'nks' || progressView === 'both') && (
              <NksOverview
                samples={samples}
                activePetugas={activePetugas}
                onClose={() => setProgressView(prev => prev === 'both' ? 'petugas' : 'none')}
              />
            )}

            {/* Portrait orientation helpful tip when in full screen */}
            {isFullscreen && orientation === 'portrait' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Tips Tampilan Penuh:</strong> Putar HP/Tablet Anda ke posisi mendatar (Landscape) agar seluruh kolom tabel dapat terlihat secara optimal. Anda juga dapat menggunakan <strong>Filter Kolom</strong> untuk menyembunyikan kolom yang tidak diperlukan.
                  </span>
                </div>
              </div>
            )}

            {/* Filter and Bulk Action Toolbar with Manual Save Button */}
            <FilterBar
              filters={filters}
              onFilterChange={(newF) => setFilters(prev => ({ ...prev, ...newF }))}
              onResetFilters={() => setFilters({
                searchQuery: '',
                petugas: 'all',
                statusFilter: 'ALL',
                tipeFilter: 'ALL',
                nksFilter: '',
                desaFilter: '',
                sortBy: 'nus',
                sortOrder: 'asc',
              })}
              nksList={availableNks}
              desaList={availableDesa}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedCount={selectedIds.size}
              onBatchComplete={handleBatchComplete}
              onBatchReset={handleBatchReset}
              onClearSelection={() => setSelectedIds(new Set())}
              totalFilteredCount={filteredSamples.length}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
              onSetAllColumns={handleSetAllColumns}
              onResetColumns={handleResetColumns}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              unsavedCount={unsavedCount}
              isSavingToServer={isSavingToServer}
              onSaveToServer={handleManualSaveToServer}
              onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
              lastSavedAt={lastSavedAt}
              canEdit={authSession.canEdit}
              onRequireEditAccess={() => setIsLoginModalOpen(true)}
            />

            {/* Data View: Table or Cards */}
            {viewMode === 'table' ? (
              <SampleTable
                samples={paginatedSamples}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onQuickToggleComplete={handleQuickToggleComplete}
                onChangeStatus={handleChangeStatus}
                onChangeHasilPendataan={handleChangeHasilPendataan}
                onOpenDetail={(s) => {
                  setSelectedSample(s);
                  setIsDetailOpen(true);
                }}
                showPetugasColumn={activePetugas === 'all'}
                onOpenQuickNus={handleOpenQuickNus}
                onResetNus={handleClearPengganti}
                onClearPengganti={handleClearPengganti}
                onClearCatatan={handleClearCatatan}
                visibleColumns={visibleColumns}
                onResetColumns={handleResetColumns}
                pageSize={pageSize}
                currentPage={currentPage}
                totalFilteredCount={filteredSamples.length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                canEdit={authSession.canEdit}
                onRequireEditAccess={() => setIsLoginModalOpen(true)}
              />
            ) : (
              <SampleCards
                samples={paginatedSamples}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onQuickToggleComplete={handleQuickToggleComplete}
                onChangeStatus={handleChangeStatus}
                onChangeHasilPendataan={handleChangeHasilPendataan}
                onOpenDetail={(s) => {
                  setSelectedSample(s);
                  setIsDetailOpen(true);
                }}
                showPetugasBadge={activePetugas === 'all'}
                onOpenQuickNus={handleOpenQuickNus}
                onResetNus={handleClearPengganti}
                onClearPengganti={handleClearPengganti}
                onClearCatatan={handleClearCatatan}
                canEdit={authSession.canEdit}
                onRequireEditAccess={() => setIsLoginModalOpen(true)}
              />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>SITASI 2026</strong> • Sistem Monitoring Internal Unit Usaha Pertanian Perorangan (UTP)
          </div>
          <div>
            Badan Pusat Statistik (BPS) Kabupaten Kubu Raya • Kalimantan Barat
          </div>
        </div>
      </footer>

      {/* Detail & Edit Modal */}
      <SampleDetailModal
        sample={selectedSample}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedSample(null);
        }}
        onSave={handleSaveDetail}
        onDelete={handleDeleteSample}
        canEdit={authSession.canEdit}
        cadanganOptions={cadanganOptions}
        onOpenBeritaAcara={() => setIsBeritaAcaraOpen(true)}
      />

      {/* Upload File Modal (Supports Multiple Files) */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImportMultiple={handleImportMultiple}
        existingPetugasList={petugasSummaries.map(p => p.nama)}
      />

      {/* Print View Modal */}
      <PrintViewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        samples={filteredSamples}
        activePetugas={activePetugas}
      />

      {/* Berita Acara Penggantian Sampel Modal */}
      <BeritaAcaraModal
        isOpen={isBeritaAcaraOpen}
        onClose={() => setIsBeritaAcaraOpen(false)}
        samples={samples}
        activePetugas={activePetugas}
      />

      {/* Quick NUS Pengganti Modal */}
      <QuickNusModal
        isOpen={isQuickNusOpen}
        onClose={() => {
          setIsQuickNusOpen(false);
          setQuickNusSample(null);
        }}
        sample={quickNusSample}
        allSamples={samples}
        onSave={handleSaveQuickNus}
        onReset={handleClearPengganti}
      />

      {/* Access Control & Owner Login Modal */}
      <AccessControlModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        authSession={authSession}
        permissionConfig={permissionConfig}
        onLogin={handleLoginAccess}
        onLogout={handleLogoutAccess}
        onUpdatePermissions={handleUpdatePermissions}
        showToast={showToast}
      />

      {/* Backup & Restore Data Modal */}
      <BackupRestoreModal
        isOpen={isBackupRestoreOpen}
        onClose={() => setIsBackupRestoreOpen(false)}
        samples={samples}
        onRestoreSamples={handleRestoreSamples}
        showToast={showToast}
        canEdit={authSession.canEdit}
      />

      {/* Google Login Modal */}
      <GoogleLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleGoogleModalLogin}
        showToast={showToast}
        ownerEmail={permissionConfig?.ownerEmail || 'sifarofatunnisa24@gmail.com'}
      />

    </div>
  );
}

