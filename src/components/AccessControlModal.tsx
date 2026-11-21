import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Lock, 
  Unlock, 
  UserCheck, 
  Copy, 
  Check, 
  AlertCircle, 
  X, 
  Mail, 
  Settings, 
  LogOut,
  Sparkles,
  Users,
  Plus,
  Trash2,
  ExternalLink,
  MessageCircle,
  UserX
} from 'lucide-react';
import { UserRole, PermissionConfig, UserAuthSession } from '../types/sitasi';

interface AccessControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  authSession: UserAuthSession;
  permissionConfig: PermissionConfig | null;
  onLogin: (keyOrPin: string, email?: string) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
  onUpdatePermissions?: (updated: {
    ownerPin: string;
    accessMode: 'owner_only' | 'allow_permitted' | 'public';
    accessKey?: string;
    newOwnerPin?: string;
    allowedEmails?: string[];
    allowedPetugas?: string[];
  }) => Promise<{ success: boolean; message: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AccessControlModal: React.FC<AccessControlModalProps> = ({
  isOpen,
  onClose,
  authSession,
  permissionConfig,
  onLogin,
  onLogout,
  onUpdatePermissions,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'manage' | 'change_pin'>('login');
  const [inputEmail, setInputEmail] = useState(authSession.email || '');
  const [inputKey, setInputKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRequest, setCopiedRequest] = useState(false);

  // Settings form for owner
  const [verifyPin, setVerifyPin] = useState('');
  const [selectedMode, setSelectedMode] = useState<'owner_only' | 'allow_permitted' | 'public'>(
    permissionConfig?.accessMode || 'owner_only'
  );
  const [customAccessKey, setCustomAccessKey] = useState(permissionConfig?.accessKey || 'IZIN-SITASI-2026');
  const [newPin, setNewPin] = useState('');

  // Form Ganti PIN / Password Pemilik
  const [pinChangeCurrent, setPinChangeCurrent] = useState('');
  const [pinChangeNew, setPinChangeNew] = useState('');
  const [pinChangeConfirm, setPinChangeConfirm] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Whitelist email list in owner manage panel
  const [emailList, setEmailList] = useState<string[]>(permissionConfig?.allowedEmails || []);
  const [newEmailInput, setNewEmailInput] = useState('');

  // Sync state when permissionConfig changes
  useEffect(() => {
    if (permissionConfig) {
      setSelectedMode(permissionConfig.accessMode || 'owner_only');
      setCustomAccessKey(permissionConfig.accessKey || 'IZIN-SITASI-2026');
      setEmailList(permissionConfig.allowedEmails || []);
    }
  }, [permissionConfig]);

  if (!isOpen) return null;

  const isOwner = authSession.role === 'owner';
  const isEditor = authSession.role === 'editor';
  const isGuest = authSession.role === 'guest';
  const ownerEmail = permissionConfig?.ownerEmail || 'sifarofatunnisa24@gmail.com';

  const isInputOwnerEmail = inputEmail.trim().toLowerCase() === ownerEmail.toLowerCase();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToVerify = inputEmail.trim();

    if (!emailToVerify && !inputKey.trim()) {
      showToast('Masukkan alamat email Gmail atau PIN/Kunci Izin.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await onLogin(inputKey.trim(), emailToVerify);
    setIsSubmitting(false);

    if (result.success) {
      showToast(result.message, 'success');
      setInputKey('');
      if (emailToVerify.toLowerCase() === ownerEmail.toLowerCase()) {
        setActiveTab('manage');
      } else {
        onClose();
      }
    } else {
      showToast(result.message || 'Akses ditolak atau PIN/Kunci salah.', 'error');
    }
  };

  const handleQuickOwnerFill = () => {
    setInputEmail(ownerEmail);
  };

  const handleAddAllowedEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      showToast('Masukkan format email Gmail yang valid (misal: nama@gmail.com).', 'error');
      return;
    }
    if (trimmed === ownerEmail.toLowerCase()) {
      showToast('Email Pemilik sudah memiliki akses penuh secara permanen.', 'info');
      setNewEmailInput('');
      return;
    }
    if (emailList.map(e => e.toLowerCase()).includes(trimmed)) {
      showToast('Email ini sudah ada di daftar akun yang diberikan izin.', 'info');
      setNewEmailInput('');
      return;
    }

    setEmailList(prev => [...prev, trimmed]);
    setNewEmailInput('');
    showToast(`Email ${trimmed} ditambahkan. Jangan lupa klik "Simpan Pengaturan Hak Akses" di bawah.`, 'info');
  };

  const handleRemoveAllowedEmail = (emailToRemove: string) => {
    setEmailList(prev => prev.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase()));
    showToast(`Email ${emailToRemove} dihapus dari daftar izin. Klik "Simpan Pengaturan Hak Akses" untuk menerapkan.`, 'info');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdatePermissions) return;
    if (!verifyPin.trim()) {
      showToast('Masukkan PIN Pemilik saat ini untuk mengonfirmasi dan menyimpan perubahan hak akses.', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await onUpdatePermissions({
      ownerPin: verifyPin.trim(),
      accessMode: selectedMode,
      accessKey: customAccessKey.trim() || undefined,
      newOwnerPin: newPin.trim() || undefined,
      allowedEmails: emailList,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(res.message, 'success');
      setVerifyPin('');
      setNewPin('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinChangeCurrent.trim()) {
      showToast('Masukkan PIN Pemilik saat ini.', 'error');
      return;
    }
    if (!pinChangeNew.trim() || pinChangeNew.trim().length < 4) {
      showToast('PIN baru harus minimal 4 karakter.', 'error');
      return;
    }
    if (pinChangeNew.trim() !== pinChangeConfirm.trim()) {
      showToast('Konfirmasi PIN baru tidak cocok! Silakan cek kembali.', 'error');
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await fetch('/api/permissions/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin: pinChangeCurrent.trim(),
          newPin: pinChangeNew.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('✅ Berhasil! PIN/Password Pemilik telah diperbarui.', 'success');
        setPinChangeCurrent('');
        setPinChangeNew('');
        setPinChangeConfirm('');
        setActiveTab('manage');
      } else {
        showToast(json.message || 'Gagal mengubah PIN Pemilik. Pastikan PIN saat ini benar.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server untuk mengubah PIN.', 'error');
    } finally {
      setIsChangingPin(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    showToast('Kunci Izin Edit berhasil disalin!', 'success');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const copyPermissionRequest = () => {
    const emailTarget = inputEmail.trim() || 'nama@gmail.com';
    const message = `Halo Admin Pemilik SITASI 2026 BPS Kubu Raya (${ownerEmail}), mohon berikan izin edit dashboard untuk akun Gmail saya: ${emailTarget}. Terima kasih.`;
    navigator.clipboard.writeText(message);
    setCopiedRequest(true);
    showToast('Pesan permohonan izin berhasil disalin! Anda dapat mengirimkannya ke WhatsApp Pemilik.', 'success');
    setTimeout(() => setCopiedRequest(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
              isOwner 
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' 
                : isEditor 
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' 
                : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
            }`}>
              {isOwner ? <ShieldCheck className="w-6 h-6" /> : isEditor ? <UserCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  {isOwner ? 'Panel Izin Akun Pemilik' : 'Hak Akses & Otorisasi Akun'}
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  isOwner 
                    ? 'bg-amber-400 text-slate-950 font-bold' 
                    : isEditor 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-rose-500 text-white'
                }`}>
                  {isOwner ? '👑 Akun Pemilik' : isEditor ? '✏️ Editor Berizin' : '🔒 Hanya Lihat'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Monitoring SITASI 2026 • BPS Kabupaten Kubu Raya
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection if Owner */}
        {isOwner && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === 'manage'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="w-4 h-4 text-indigo-600" />
              <span>Kelola Izin Gmail</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('change_pin')}
              className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === 'change_pin'
                  ? 'border-amber-600 text-amber-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Key className="w-4 h-4 text-amber-600" />
              <span>Ganti PIN Pemilik</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Ganti Akun</span>
            </button>
          </div>
        )}

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Banner Status Akun Pemilik & Status Sesi Saat Ini */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="text-slate-500 font-medium">Akun Gmail Admin / Pemilik Sah:</span>
              <span className="font-bold text-slate-900 flex items-center gap-1 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                {ownerEmail}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/70 flex-wrap gap-1">
              <span className="text-slate-500 font-medium">Status Akses Anda Saat Ini:</span>
              <span className={`font-bold flex items-center gap-1.5 ${
                authSession.canEdit ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {authSession.canEdit ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Dapat Mengubah & Menyimpan Data ({authSession.displayName})</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hanya Lihat (Tidak Dapat Mengubah / Menyimpan)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* TAB 1: FORM LOGIN / IDENTIFIKASI AKUN GMAIL */}
          {(!isOwner || activeTab === 'login') && (
            <div className="space-y-4">
              
              {/* Info Aturan Utama Akun Gmail Pemilik */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Aturan Keamanan Akses Akun Gmail SITASI 2026:</span>
                </div>
                <p className="text-amber-900/90 text-[11px] leading-relaxed">
                  Hanya akun Gmail Admin/Pemilik <strong>{ownerEmail}</strong> yang memiliki hak mengubah/mengedit/menyimpan secara langsung. Akun Gmail lainnya akan berada di mode <strong>Hanya Lihat</strong> sebelum diberikan izin secara resmi oleh Pemilik.
                </p>
              </div>

              {/* Status sesi aktif jika sudah login */}
              {!isGuest && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">{authSession.displayName}</div>
                      <div className="text-[11px] text-emerald-700">
                        {isOwner ? 'Hak akses penuh Pemilik aktif.' : 'Hak edit diizinkan oleh Pemilik.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="inline-flex items-center text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Keluar Sesi
                  </button>
                </div>
              )}

              {/* Form Masuk dengan Akun Gmail */}
              <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
                
                {/* Input Email Gmail */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Alamat Akun Gmail Anda:
                    </label>
                    <button
                      type="button"
                      onClick={handleQuickOwnerFill}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                    >
                      Pilih Akun Pemilik
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      placeholder="Masukkan alamat email Gmail (misal: nama@gmail.com)"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Jika Email adalah Akun Pemilik -> Minta PIN Pemilik */}
                {isInputOwnerEmail ? (
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2 animate-in fade-in">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-950">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Verifikasi Kepemilikan Akun Admin ({ownerEmail})</span>
                    </div>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      Masukkan PIN Admin Pemilik untuk mengonfirmasi akses penuh:
                    </p>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        placeholder="PIN Pemilik (default: 19731208)"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        autoFocus
                      />
                    </div>
                  </div>
                ) : (
                  /* Jika Email Lain -> Opsi Kunci Izin atau Cek Status Izin */
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Kunci Izin Edit (Opsional jika Pemilik memberikan kode izin):
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        placeholder="Kunci Izin dari Pemilik (contoh: IZIN-SITASI-2026)"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Tombol Masuk */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isInputOwnerEmail ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Masuk sebagai Akun Pemilik (Akses Penuh)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Verifikasi & Masuk dengan Email Ini</span>
                    </>
                  )}
                </button>

                {/* Bantuan jika akun belum diberi izin */}
                {!isInputOwnerEmail && inputEmail && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Belum diberikan izin oleh Pemilik?
                    </span>
                    <button
                      type="button"
                      onClick={copyPermissionRequest}
                      className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedRequest ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRequest ? 'Pesan Disalin' : 'Salin Pesan Minta Izin (WA)'}</span>
                    </button>
                  </div>
                )}

              </form>
            </div>
          )}

          {/* TAB 2: PANEL PENGATURAN PEMILIK (KHUSUS AKUN PEMILIK) */}
          {isOwner && activeTab === 'manage' && (
            <div className="space-y-5">
              
              {/* 1. Aturan Mode Penguncian */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2">
                  1. Mode Penguncian Dashboard:
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedMode === 'owner_only' 
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="accessMode"
                      value="owner_only"
                      checked={selectedMode === 'owner_only'}
                      onChange={() => setSelectedMode('owner_only')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="ml-2.5 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-700" />
                        <span>Hanya Akun Pemilik Saja ({ownerEmail})</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Kunci total. Siapapun yang mengakses dengan akun Gmail lain (petugas/tamu) hanya bisa melihat data (Hanya Lihat), tanpa bisa mengedit ataupun menyimpan data ke server.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedMode === 'allow_permitted' 
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="accessMode"
                      value="allow_permitted"
                      checked={selectedMode === 'allow_permitted'}
                      onChange={() => setSelectedMode('allow_permitted')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="ml-2.5 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pemilik + Akun Gmail yang Diberikan Izin Khusus</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Hanya Anda (Pemilik) dan alamat Gmail yang Anda daftarkan di daftar whitelist di bawah ini yang memiliki izin edit.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Daftar Akun Gmail yang Diberi Izin (Whitelist) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">
                      2. Daftar Akun Gmail Berizin ({emailList.length} Akun):
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Dikelola langsung oleh Pemilik
                  </span>
                </div>

                {/* Form Tambah Email Baru */}
                <form onSubmit={handleAddAllowedEmail} className="flex gap-2">
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="Ketik email Gmail petugas (misal: petugas@gmail.com)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Izin</span>
                  </button>
                </form>

                {/* List Email */}
                {emailList.length === 0 ? (
                  <div className="bg-white rounded-lg p-3 text-center border border-dashed border-slate-300 text-xs text-slate-500">
                    <UserX className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    <span>Belum ada akun Gmail lain yang diberikan izin. Saat ini hanya <strong>{ownerEmail}</strong> yang dapat mengedit.</span>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-36 overflow-y-auto">
                    {emailList.map((email) => (
                      <div key={email} className="px-3 py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-mono font-medium text-slate-800">{email}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                            Editor Berizin
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAllowedEmail(email)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title={`Cabut izin untuk ${email}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Kunci Izin Cepat (Opsional) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  3. Kunci Izin Cepat (Alternatif Kode):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customAccessKey}
                    onChange={(e) => setCustomAccessKey(e.target.value)}
                    placeholder="Contoh: IZIN-SITASI-2026"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(customAccessKey)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              {/* 4. Konfirmasi PIN Pemilik Saat Ini untuk Menyimpan Pengaturan */}
              <form onSubmit={handleSaveSettings} className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Konfirmasi PIN Pemilik ({ownerEmail}): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={verifyPin}
                    onChange={(e) => setVerifyPin(e.target.value)}
                    placeholder="Ketik PIN Pemilik (default: 19731208)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar Akun Pemilik</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Simpan Pengaturan Hak Akses</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* TAB 3: GANTI PIN / PASSWORD PEMILIK */}
          {isOwner && activeTab === 'change_pin' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Key className="w-4 h-4 text-amber-700" />
                  <span>Fitur Keamanan: Ganti PIN / Password Pemilik</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  PIN ini digunakan untuk mengautentikasi dan memberikan akses penuh pada akun pemilik <strong>{ownerEmail}</strong>. Simpan PIN baru Anda di tempat yang aman.
                </p>
              </div>

              <form onSubmit={handleChangePinSubmit} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    PIN / Password Saat Ini: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={pinChangeCurrent}
                    onChange={(e) => setPinChangeCurrent(e.target.value)}
                    placeholder="Masukkan PIN Pemilik saat ini (default: 19731208)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    PIN / Password Baru: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={pinChangeNew}
                    onChange={(e) => setPinChangeNew(e.target.value)}
                    placeholder="Minimal 4 karakter (angka/huruf)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    required
                    minLength={4}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Konfirmasi PIN / Password Baru: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={pinChangeConfirm}
                    onChange={(e) => setPinChangeConfirm(e.target.value)}
                    placeholder="Ketik ulang PIN baru yang sama"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    required
                    minLength={4}
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setPinChangeCurrent('');
                      setPinChangeNew('');
                      setPinChangeConfirm('');
                      setActiveTab('manage');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isChangingPin}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPin ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>Simpan PIN / Password Baru</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Keamanan Data BPS Terverifikasi</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
