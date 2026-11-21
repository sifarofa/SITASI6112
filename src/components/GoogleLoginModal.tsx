import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Key, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';
import { extractErrorMessage } from '../utils/api';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pinOrKey?: string) => Promise<{ success: boolean; message: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  ownerEmail?: string;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  showToast,
  ownerEmail = 'sifarofatunnisa24@gmail.com'
}) => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const isOwnerEmail = email.trim().toLowerCase() === ownerEmail.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage('Alamat email Google / Gmail wajib diisi.');
      return;
    }

    // Basic Google / standard email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Format email tidak valid. Masukkan akun Google/Gmail yang benar (misal: nama@gmail.com).');
      return;
    }

    if (isOwnerEmail && !pin.trim()) {
      setErrorMessage(`Akun ${ownerEmail} adalah Akun Pemilik. Masukkan PIN Keamanan Pemilik untuk verifikasi.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onLogin(trimmedEmail, pin.trim());
      if (result.success) {
        showToast(extractErrorMessage(result.message, 'Login berhasil!'), 'success');
        setEmail('');
        setPin('');
        onClose();
      } else {
        setErrorMessage(extractErrorMessage(result.message, 'Gagal masuk dengan akun Google.'));
      }
    } catch (err: any) {
      setErrorMessage(extractErrorMessage(err, 'Terjadi gangguan saat menghubungkan ke server.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectQuickAccount = (quickEmail: string) => {
    setEmail(quickEmail);
    setErrorMessage('');
    if (quickEmail.toLowerCase() === ownerEmail.toLowerCase()) {
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center shrink-0">
              <GoogleIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Login Akun Google</span>
              </h3>
              <p className="text-xs text-slate-300">
                Monitoring SITASI 2026 • BPS Kab. Kubu Raya
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
            aria-label="Tutup modal login"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Information Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Ketentuan Akses Pengguna:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1 leading-relaxed">
              <li>
                <strong>Akun Pemilik ({ownerEmail})</strong>: Akses penuh mengedit, menandai selesai, dan menyimpan ke server.
              </li>
              <li>
                <strong>Akun Google Lainnya</strong>: Akses <strong>Hanya Melihat (Read-Only)</strong> tanpa menu/fitur Akun Pemilik.
              </li>
            </ul>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-rose-800 animate-in fade-in duration-100">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Quick Select Buttons */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pilih Cepat Akun Google:
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleSelectQuickAccount(ownerEmail)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                  isOwnerEmail
                    ? 'bg-amber-50/80 border-amber-300 text-amber-900 ring-2 ring-amber-400/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs">
                    👑
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">Akun Pemilik / Admin</div>
                    <div className="text-[11px] font-mono text-slate-500">{ownerEmail}</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  Akses Penuh
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickAccount('petugas.kuburaya@gmail.com')}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                  email === 'petugas.kuburaya@gmail.com'
                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 ring-2 ring-indigo-400/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                    👤
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">Akun Google Petugas / Tamu</div>
                    <div className="text-[11px] font-mono text-slate-500">petugas.kuburaya@gmail.com</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  Hanya Lihat
                </span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Atau Masukkan Akun Google Anda
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Email Akun Google: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Ketik email Google (misal: nama@gmail.com)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium text-slate-900"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* If Owner Email, show PIN requirement */}
            {isOwnerEmail && (
              <div className="space-y-1.5 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-950">
                    PIN Keamanan Pemilik: <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-semibold">
                    (Wajib untuk Pemilik)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Masukkan PIN Pemilik (default: 19731208)"
                    className="w-full pl-9 pr-10 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-900"
                    required
                  />
                  <Key className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-amber-800 leading-tight">
                  Verifikasi keamanan untuk memastikan hanya Anda pemilik sah yang dapat mengubah dan menyimpan data.
                </p>
              </div>
            )}

            {!isOwnerEmail && email.trim() && (
              <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Akun ini akan login dengan hak akses <strong>Hanya Lihat</strong>. Fitur "Akun Pemilik" tidak akan ditampilkan.</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <GoogleIcon className="w-4 h-4" />
                    <span>Masuk dengan Google</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Keamanan Data BPS Kubu Raya</span>
          <span className="font-mono text-[10px]">SITASI 2026</span>
        </div>

      </div>
    </div>
  );
};
