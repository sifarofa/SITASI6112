import { PermissionConfig, UserAuthSession } from '../types/sitasi';

const PERMISSIONS_STORAGE_KEY = 'sitasi_2026_permissions_config_v1';
const PIN_HASH_STORAGE_KEY = 'sitasi_2026_owner_pin_hash_v1';

// SHA-256 digest of default owner PIN (stored as one-way hash, never plaintext)
const DEFAULT_OWNER_PIN_SHA256 =
  'dbb56908004702539aae01af5c38ee13e0517d1d827c5e2c5aadfd53dfe3e368';

export const DEFAULT_PERMISSION_CONFIG: PermissionConfig = {
  ownerEmail: 'sifarofatunnisa24@gmail.com',
  accessMode: 'owner_only',
  accessKey: 'IZIN-SITASI-2026',
  allowedEmails: [],
  allowedPetugas: [
    'Erika',
    'Nurdiono',
    'Sandra',
    'Asniadi',
    'Karmila',
    'Riska',
    'Ellysa',
    'Yuliani',
  ],
  lastUpdated: new Date().toISOString(),
};

/**
 * Compute lowercase hex SHA-256 digest of a UTF-8 string.
 * Uses Web Crypto API when available, with a pure-JS SHA-256 fallback.
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fall through to pure-JS SHA-256 fallback
    }
  }

  return pureJsSha256(bytes);
}

function pureJsSha256(data: Uint8Array): string {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLen = data.length * 8;
  const paddedLen = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const w = new Uint32Array(64);

  for (let i = 0; i < paddedLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, w[t - 15]) ^ rotr(18, w[t - 15]) ^ (w[t - 15] >>> 3);
      const s1 = rotr(17, w[t - 2]) ^ rotr(19, w[t - 2]) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return Array.from(H)
    .map((val) => val.toString(16).padStart(8, '0'))
    .join('');
}

export function getStoredPermissionConfig(): PermissionConfig {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_PERMISSION_CONFIG,
          ...parsed,
          ownerEmail:
            typeof parsed.ownerEmail === 'string' && parsed.ownerEmail.trim()
              ? parsed.ownerEmail.trim()
              : DEFAULT_PERMISSION_CONFIG.ownerEmail,
          allowedEmails: Array.isArray(parsed.allowedEmails) ? parsed.allowedEmails : [],
          allowedPetugas: Array.isArray(parsed.allowedPetugas)
            ? parsed.allowedPetugas
            : DEFAULT_PERMISSION_CONFIG.allowedPetugas,
        };
      }
    }
  } catch {}
  return { ...DEFAULT_PERMISSION_CONFIG };
}

function savePermissionConfig(config: PermissionConfig): void {
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

function getStoredPinHash(): string {
  try {
    const saved = localStorage.getItem(PIN_HASH_STORAGE_KEY);
    if (saved && /^[a-f0-9]{64}$/i.test(saved.trim())) {
      return saved.trim().toLowerCase();
    }
  } catch {}
  return DEFAULT_OWNER_PIN_SHA256;
}

function savePinHash(hash: string): void {
  try {
    localStorage.setItem(PIN_HASH_STORAGE_KEY, hash.toLowerCase());
  } catch {}
}

/**
 * Pure client-side authentication & role resolution (works without Node.js backend).
 */
export async function verifyClientAccess(
  keyOrPin: string,
  email?: string
): Promise<{
  success: boolean;
  message: string;
  session?: UserAuthSession;
}> {
  const perm = getStoredPermissionConfig();
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const trimmedKey = String(keyOrPin || '').trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
    return {
      success: false,
      message: 'Format email tidak valid. Masukkan akun Google/Gmail yang valid (contoh: nama@gmail.com).',
    };
  }

  const storedPinHash = getStoredPinHash();
  const candidateHash = trimmedKey ? await sha256Hex(trimmedKey) : '';

  // 1. Owner email login
  if (trimmedEmail === perm.ownerEmail.toLowerCase()) {
    if (candidateHash && candidateHash === storedPinHash) {
      const msg = `Berhasil login sebagai Akun Pemilik (${perm.ownerEmail}). Anda memiliki akses penuh mengedit dan menyimpan perubahan.`;
      return {
        success: true,
        message: msg,
        session: {
          role: 'owner',
          email: perm.ownerEmail,
          displayName: `Pemilik (${perm.ownerEmail})`,
          token: `owner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          canEdit: true,
          loginAt: new Date().toISOString(),
        },
      };
    }
    return {
      success: false,
      message: 'PIN Pemilik tidak cocok. Masukkan PIN keamanan yang benar untuk akun Pemilik.',
    };
  }

  // 2. Owner PIN login without explicit email input
  if (!trimmedEmail && candidateHash && candidateHash === storedPinHash) {
    return {
      success: true,
      message: 'Berhasil masuk sebagai Akun Pemilik melalui PIN.',
      session: {
        role: 'owner',
        email: perm.ownerEmail,
        displayName: `Pemilik (${perm.ownerEmail})`,
        token: `owner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        canEdit: true,
        loginAt: new Date().toISOString(),
      },
    };
  }

  // 3. Whitelisted Google email (when allowed by owner)
  const allowedEmailsList = (perm.allowedEmails || []).map((e) => e.toLowerCase().trim());
  if (trimmedEmail && perm.accessMode !== 'owner_only' && allowedEmailsList.includes(trimmedEmail)) {
    return {
      success: true,
      message: `Akun Google Anda (${trimmedEmail}) telah diberikan izin edit oleh Pemilik. Anda dapat mengubah data dan menyimpan perubahan.`,
      session: {
        role: 'editor',
        email: trimmedEmail,
        displayName: `Editor Berizin (${trimmedEmail})`,
        token: `editor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        canEdit: true,
        loginAt: new Date().toISOString(),
      },
    };
  }

  // 4. Shared access key login
  if (trimmedKey && perm.accessKey && trimmedKey === perm.accessKey) {
    return {
      success: true,
      message: 'Kunci Izin Edit valid! Anda diizinkan untuk mengedit dan menyimpan perubahan.',
      session: {
        role: 'editor',
        email: trimmedEmail || 'Editor Berizin',
        displayName: `Editor Berizin (${trimmedEmail || 'Kunci Izin'})`,
        token: `editor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        canEdit: true,
        loginAt: new Date().toISOString(),
      },
    };
  }

  // 5. Any other valid Google account -> Read-Only (Hanya Lihat)
  if (trimmedEmail) {
    return {
      success: true,
      message: `Berhasil login dengan akun Google ${trimmedEmail}. Anda memiliki akses Melihat data (Hanya Lihat).`,
      session: {
        role: 'guest',
        email: trimmedEmail,
        displayName: trimmedEmail,
        token: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        canEdit: false,
        loginAt: new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    message: 'Masukkan akun Google atau PIN Pemilik untuk login.',
  };
}

export async function updateClientPermissions(updated: {
  ownerPin: string;
  accessMode: 'owner_only' | 'allow_permitted' | 'public';
  accessKey?: string;
  newOwnerPin?: string;
  allowedEmails?: string[];
  allowedPetugas?: string[];
}): Promise<{ success: boolean; message: string; config?: PermissionConfig }> {
  const perm = getStoredPermissionConfig();
  const pinHash = await sha256Hex(String(updated.ownerPin || '').trim());

  if (pinHash !== getStoredPinHash()) {
    return {
      success: false,
      message: `PIN Pemilik salah. Hanya Akun Pemilik sah (${perm.ownerEmail}) yang dapat mengubah pengaturan izin akses.`,
    };
  }

  if (updated.newOwnerPin && updated.newOwnerPin.trim()) {
    if (updated.newOwnerPin.trim().length < 4) {
      return {
        success: false,
        message: 'PIN Pemilik baru minimal harus 4 karakter.',
      };
    }
    const newHash = await sha256Hex(updated.newOwnerPin.trim());
    savePinHash(newHash);
  }

  const nextConfig: PermissionConfig = {
    ...perm,
    accessMode: updated.accessMode || perm.accessMode,
    accessKey: updated.accessKey ? updated.accessKey.trim() : perm.accessKey,
    allowedEmails: Array.isArray(updated.allowedEmails)
      ? updated.allowedEmails
      : perm.allowedEmails,
    allowedPetugas: Array.isArray(updated.allowedPetugas)
      ? updated.allowedPetugas
      : perm.allowedPetugas,
    lastUpdated: new Date().toISOString(),
  };

  savePermissionConfig(nextConfig);

  return {
    success: true,
    message: 'Pengaturan hak akses akun Gmail berhasil diperbarui.',
    config: nextConfig,
  };
}

export async function changeClientOwnerPin(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; message: string }> {
  const currentTrimmed = String(currentPin || '').trim();
  const newTrimmed = String(newPin || '').trim();

  if (!currentTrimmed) {
    return {
      success: false,
      message: 'PIN saat ini wajib diisi.',
    };
  }

  const currentHash = await sha256Hex(currentTrimmed);
  if (currentHash !== getStoredPinHash()) {
    return {
      success: false,
      message: 'PIN saat ini salah. Masukkan PIN Pemilik yang valid.',
    };
  }

  if (newTrimmed.length < 4) {
    return {
      success: false,
      message: 'PIN Pemilik baru minimal harus 4 karakter.',
    };
  }

  const newHash = await sha256Hex(newTrimmed);
  savePinHash(newHash);

  const perm = getStoredPermissionConfig();
  savePermissionConfig({ ...perm, lastUpdated: new Date().toISOString() });

  return {
    success: true,
    message: 'PIN Pemilik berhasil diubah dan disimpan secara aman.',
  };
}
