import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);

  // Enable CORS for all incoming cross-device requests
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Ensure server data folder exists for persistence across devices
  const DATA_DIR = path.join(__dirname, 'server_data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SAMPLES_FILE = path.join(DATA_DIR, 'samples.json');
  const BERITA_ACARA_FILE = path.join(DATA_DIR, 'berita_acara_config.json');
  const ACTIVE_PETUGAS_FILE = path.join(DATA_DIR, 'active_petugas.json');
  const PERMISSIONS_FILE = path.join(DATA_DIR, 'permissions.json');
  const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const DEFAULT_PERMISSIONS = {
    ownerEmail: 'sifarofatunnisa24@gmail.com',
    ownerPin: '19731208', // NIP Kepala BPS Kubu Raya, default PIN Pemilik
    accessKey: 'IZIN-SITASI-2026',
    accessMode: 'owner_only', // 'owner_only' | 'allow_permitted' | 'public'
    allowedEmails: [] as string[],
    allowedPetugas: ['Erika', 'Nurdiono', 'Sandra', 'Asniadi', 'Karmila', 'Riska', 'Ellysa', 'Yuliani'],
    lastUpdated: new Date().toISOString()
  };

  function getPermissions() {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      try {
        const raw = fs.readFileSync(PERMISSIONS_FILE, 'utf-8');
        return { ...DEFAULT_PERMISSIONS, ...JSON.parse(raw) };
      } catch (e) {
        return DEFAULT_PERMISSIONS;
      }
    }
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(DEFAULT_PERMISSIONS, null, 2), 'utf-8');
    return DEFAULT_PERMISSIONS;
  }

  // Active SSE connections for instant real-time synchronization across devices and accounts
  const sseClients = new Set<express.Response>();

  function broadcastSamplesUpdate(samplesList: any[], updatedBy: string = 'Admin/Pemilik') {
    const now = new Date();
    let nowWIB = '';
    try {
      const wibFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      nowWIB = `${wibFormatter.format(now)} WIB`;
    } catch {
      const utcHours = now.getUTCHours();
      const pad = (n: number) => String(n).padStart(2, '0');
      nowWIB = `${pad((utcHours + 7) % 24)}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} WIB`;
    }

    const payload = JSON.stringify({
      type: 'samples_updated',
      updatedAt: now.toISOString(),
      updatedAtWIB: nowWIB,
      updatedBy,
      count: samplesList.length,
      samples: samplesList
    });

    const eventMessage = `event: samples_updated\ndata: ${payload}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(eventMessage);
      } catch (err) {
        sseClients.delete(client);
      }
    }
    console.log(`[SSE] Realtime update broadcasted (${samplesList.length} samples) by ${updatedBy} at ${nowWIB} to ${sseClients.size} client(s).`);
  }

  // Heartbeat ping every 25 seconds to keep SSE connections open through cloud/reverse proxies
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(': ping\n\n');
      } catch (e) {
        sseClients.delete(client);
      }
    }
  }, 25000);

  // API Endpoints
  // 1. Get Samples (Source of truth across all devices)
  app.get('/api/samples', (req, res) => {
    // Explicitly disallow any browser/proxy/CDN caching for live samples data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    try {
      if (!fs.existsSync(SAMPLES_FILE)) {
        // Fallback: Check if latest backup exists to recover data
        const latestBackup = path.join(DATA_DIR, 'latest_backup.json');
        if (fs.existsSync(latestBackup)) {
          fs.copyFileSync(latestBackup, SAMPLES_FILE);
        }
      }

      if (fs.existsSync(SAMPLES_FILE)) {
        const raw = fs.readFileSync(SAMPLES_FILE, 'utf-8');
        const data = JSON.parse(raw);
        const stat = fs.statSync(SAMPLES_FILE);
        const updatedAt = stat.mtime.toISOString();
        let updatedAtWIB = '';
        try {
          const wibFormatter = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
          updatedAtWIB = `${wibFormatter.format(stat.mtime)} WIB`;
        } catch {
          updatedAtWIB = updatedAt;
        }

        return res.json({ 
          success: true, 
          data, 
          updatedAt, 
          updatedAtWIB 
        });
      }
      return res.json({ success: true, data: null });
    } catch (err: any) {
      console.error('[SERVER] Error reading samples:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1.1 Real-time Server-Sent Events (SSE) Stream
  app.get('/api/samples/live', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform, no-store');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    // Send connection established handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // 2. Save / Update Samples (Persisted to disk + Auto Backup on save + Realtime broadcast)
  app.post('/api/samples', (req, res) => {
    try {
      const { samples } = req.body;
      if (!Array.isArray(samples)) {
        return res.status(400).json({ success: false, error: 'Data samples harus berupa array' });
      }

      // Check permissions: only Owner (sifarofatunnisa24@gmail.com) or granted emails can save changes
      const authRole = req.headers['x-auth-role'] || req.body.role;
      const authToken = req.headers['x-auth-token'] || req.body.token;
      const authKey = req.headers['x-auth-key'] || req.body.accessKey;
      const authEmail = String(req.headers['x-auth-email'] || req.body.email || '').trim().toLowerCase();
      const perm = getPermissions();

      const isOwnerEmail = authEmail === perm.ownerEmail.toLowerCase();
      const isOwnerToken = (authToken && String(authToken).startsWith('owner_')) || authKey === perm.ownerPin;
      const isOwner = (isOwnerEmail && isOwnerToken) || (authRole === 'owner' && isOwnerToken);

      // Check if email has been granted edit access by Owner
      const allowedEmailsList: string[] = (perm.allowedEmails || []).map((e: string) => e.toLowerCase().trim());
      const isEmailAllowed = authEmail && allowedEmailsList.includes(authEmail);
      const isEditorToken = authToken && String(authToken).startsWith('editor_');
      const isEditor = 
        (perm.accessMode !== 'owner_only' && isEmailAllowed) ||
        (authRole === 'editor' && isEditorToken) || 
        (authKey && authKey === perm.accessKey);

      if (!isOwner && !isEditor) {
        return res.status(403).json({
          success: false,
          error: `Akses Ditolak: Dashboard ini hanya dapat diubah/disimpan melalui akun Gmail Pemilik (${perm.ownerEmail}). Akun Anda (${authEmail || 'Belum Terdaftar'}) belum diberikan izin edit oleh Pemilik.`
        });
      }

      // Persist main samples file
      fs.writeFileSync(SAMPLES_FILE, JSON.stringify(samples, null, 2), 'utf-8');

      // Auto Backup on save (Timestamped snapshot + latest backup)
      try {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const timeStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const autoBackupName = `Backup_SITASI_2026_${timeStr}.json`;
        fs.writeFileSync(path.join(BACKUPS_DIR, autoBackupName), JSON.stringify(samples, null, 2), 'utf-8');
        fs.writeFileSync(path.join(DATA_DIR, 'latest_backup.json'), JSON.stringify(samples, null, 2), 'utf-8');
      } catch (bErr) {
        console.warn('[SERVER] Auto backup warning:', bErr);
      }

      // Realtime broadcast to all connected devices and accounts
      const updaterName = isOwner 
        ? 'Admin/Pemilik (sifarofatunnisa24@gmail.com)' 
        : (authEmail || 'Editor Berizin');
      broadcastSamplesUpdate(samples, updaterName);

      return res.json({ 
        success: true, 
        count: samples.length, 
        updatedAt: new Date().toISOString() 
      });
    } catch (err: any) {
      console.error('[SERVER] Error saving samples:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Permissions Endpoints
  // Get public permission configuration
  app.get('/api/permissions', (req, res) => {
    try {
      const perm = getPermissions();
      const authToken = req.headers['x-auth-token'];
      const isOwner = authToken && String(authToken).startsWith('owner_');

      return res.json({
        success: true,
        data: {
          ownerEmail: perm.ownerEmail,
          accessMode: perm.accessMode,
          allowedEmails: perm.allowedEmails || [],
          allowedPetugas: perm.allowedPetugas,
          lastUpdated: perm.lastUpdated,
          // Only show accessKey to verified owner
          accessKey: isOwner ? perm.accessKey : undefined,
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Verify Gmail Account / PIN / Access Key
  app.post('/api/permissions/verify', (req, res) => {
    try {
      const { keyOrPin, email } = req.body;
      const perm = getPermissions();

      const trimmedEmail = String(email || '').trim().toLowerCase();
      const trimmedKey = String(keyOrPin || '').trim();

      // 1. Email format validation if email is provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Format email tidak valid. Masukkan akun Google/Gmail yang valid (contoh: nama@gmail.com).'
        });
      }

      // 2. Check if matches Owner Gmail (sifarofatunnisa24@gmail.com)
      if (trimmedEmail === perm.ownerEmail.toLowerCase()) {
        // Owner verification with PIN
        if (trimmedKey === perm.ownerPin) {
          return res.json({
            success: true,
            role: 'owner',
            canEdit: true,
            email: perm.ownerEmail,
            displayName: `Pemilik (${perm.ownerEmail})`,
            token: `owner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            accessMode: perm.accessMode,
            accessKey: perm.accessKey,
            allowedEmails: perm.allowedEmails || [],
            message: 'Berhasil login sebagai Akun Pemilik (sifarofatunnisa24@gmail.com). Anda memiliki akses penuh mengedit dan menyimpan perubahan.'
          });
        } else {
          return res.status(401).json({
            success: false,
            role: 'guest',
            canEdit: false,
            error: 'PIN Pemilik tidak cocok. Masukkan PIN keamanan yang benar untuk akun Pemilik.'
          });
        }
      }

      // Check PIN without explicit email input
      if (trimmedKey === perm.ownerPin) {
        return res.json({
          success: true,
          role: 'owner',
          canEdit: true,
          email: perm.ownerEmail,
          displayName: `Pemilik (${perm.ownerEmail})`,
          token: `owner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          accessMode: perm.accessMode,
          accessKey: perm.accessKey,
          allowedEmails: perm.allowedEmails || [],
          message: 'Berhasil masuk sebagai Akun Pemilik melalui PIN.'
        });
      }

      // 3. Check if email is in Owner's Granted Emails Whitelist (allowedEmails)
      const allowedEmailsList: string[] = (perm.allowedEmails || []).map((e: string) => e.toLowerCase().trim());
      if (trimmedEmail && perm.accessMode !== 'owner_only' && allowedEmailsList.includes(trimmedEmail)) {
        return res.json({
          success: true,
          role: 'editor',
          canEdit: true,
          email: trimmedEmail,
          displayName: `Editor Berizin (${trimmedEmail})`,
          token: `editor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          accessMode: perm.accessMode,
          message: `Akun Google Anda (${trimmedEmail}) telah diberikan izin edit oleh Pemilik. Anda dapat mengubah data dan menyimpan perubahan.`
        });
      }

      // 4. Check if matches shared Access Key given by Owner
      if (trimmedKey && trimmedKey === perm.accessKey) {
        return res.json({
          success: true,
          role: 'editor',
          canEdit: true,
          email: trimmedEmail || 'Editor Berizin',
          displayName: `Editor Berizin (${trimmedEmail || 'Kunci Izin'})`,
          token: `editor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          accessMode: perm.accessMode,
          message: 'Kunci Izin Edit valid! Anda diizinkan untuk mengedit dan menyimpan perubahan.'
        });
      }

      // 5. ANY OTHER VALID GOOGLE ACCOUNT:
      // Valid Google users successfully authenticate with Read-Only (Hanya Lihat) access, cannot edit, Akun Pemilik is hidden!
      if (trimmedEmail) {
        return res.json({
          success: true,
          role: 'guest',
          canEdit: false,
          email: trimmedEmail,
          displayName: trimmedEmail,
          token: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          accessMode: perm.accessMode,
          message: `Berhasil login dengan akun Google ${trimmedEmail}. Anda memiliki akses Melihat data (Hanya Lihat).`
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Masukkan akun Google atau PIN Pemilik untuk login.'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update permission settings (Owner only: add/remove allowed emails, change mode)
  app.post('/api/permissions/update', (req, res) => {
    try {
      const { ownerPin, accessMode, accessKey, newOwnerPin, allowedEmails, allowedPetugas } = req.body;
      const perm = getPermissions();

      if (String(ownerPin || '').trim() !== perm.ownerPin) {
        return res.status(403).json({
          success: false,
          error: 'PIN Pemilik salah. Hanya Akun Pemilik sah (sifarofatunnisa24@gmail.com) yang dapat mengubah pengaturan izin akses.'
        });
      }

      const updated = {
        ...perm,
        accessMode: accessMode || perm.accessMode,
        accessKey: accessKey ? String(accessKey).trim() : perm.accessKey,
        ownerPin: newOwnerPin ? String(newOwnerPin).trim() : perm.ownerPin,
        allowedEmails: Array.isArray(allowedEmails) ? allowedEmails : (perm.allowedEmails || []),
        allowedPetugas: Array.isArray(allowedPetugas) ? allowedPetugas : perm.allowedPetugas,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(updated, null, 2), 'utf-8');

      return res.json({
        success: true,
        message: 'Pengaturan hak akses akun Gmail berhasil diperbarui.',
        data: {
          ownerEmail: updated.ownerEmail,
          accessMode: updated.accessMode,
          accessKey: updated.accessKey,
          allowedEmails: updated.allowedEmails,
          allowedPetugas: updated.allowedPetugas,
          lastUpdated: updated.lastUpdated
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2.5 Change Owner PIN
  app.post('/api/permissions/change-pin', (req, res) => {
    try {
      const { currentPin, newPin } = req.body;
      const perm = getPermissions();

      if (!currentPin || String(currentPin).trim() !== perm.ownerPin) {
        return res.status(403).json({ success: false, error: 'PIN saat ini salah. Masukkan PIN Pemilik yang valid.' });
      }

      if (!newPin || String(newPin).trim().length < 4) {
        return res.status(400).json({ success: false, error: 'PIN Pemilik baru minimal harus 4 karakter.' });
      }

      perm.ownerPin = String(newPin).trim();
      perm.lastUpdated = new Date().toISOString();
      fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(perm, null, 2), 'utf-8');

      return res.json({ 
        success: true, 
        message: 'PIN Pemilik berhasil diubah dan disimpan secara aman.',
        updatedAt: perm.lastUpdated
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2.6 Backups & Restore Endpoints
  // List all available backups
  app.get('/api/backups', (_req, res) => {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        return res.json({ success: true, backups: [] });
      }
      const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
      const backups = files.map(file => {
        const fullPath = path.join(BACKUPS_DIR, file);
        const stat = fs.statSync(fullPath);
        let sampleCount = 0;
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          if (Array.isArray(parsed)) sampleCount = parsed.length;
        } catch {}
        return {
          fileName: file,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
          sampleCount
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({ success: true, backups });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create manual backup snapshot on server
  app.post('/api/backups/create', (req, res) => {
    try {
      if (!fs.existsSync(SAMPLES_FILE)) {
        return res.status(404).json({ success: false, error: 'Belum ada data sampel yang dapat dibackup.' });
      }
      const raw = fs.readFileSync(SAMPLES_FILE, 'utf-8');
      const samples = JSON.parse(raw);

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fileName = `Backup_Manual_SITASI_${timeStr}.json`;
      const filePath = path.join(BACKUPS_DIR, fileName);

      fs.writeFileSync(filePath, JSON.stringify(samples, null, 2), 'utf-8');
      fs.writeFileSync(path.join(DATA_DIR, 'latest_backup.json'), JSON.stringify(samples, null, 2), 'utf-8');

      return res.json({ 
        success: true, 
        fileName, 
        sampleCount: samples.length, 
        createdAt: now.toISOString(),
        message: 'Snapshot backup berhasil disimpan di server.' 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Restore samples from a server backup file or an uploaded JSON payload
  app.post('/api/backups/restore', (req, res) => {
    try {
      const { fileName, backupData } = req.body;
      let targetSamples: any[] | null = null;

      if (Array.isArray(backupData) && backupData.length > 0) {
        targetSamples = backupData;
      } else if (fileName) {
        const fullPath = path.join(BACKUPS_DIR, fileName);
        if (fs.existsSync(fullPath)) {
          targetSamples = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        }
      }

      if (!targetSamples || !Array.isArray(targetSamples)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Format data backup tidak valid atau berkas tidak ditemukan di server.' 
        });
      }

      // Save previous state as safeguard before restoring
      if (fs.existsSync(SAMPLES_FILE)) {
        const preRestoreBackup = path.join(BACKUPS_DIR, `Pre_Restore_Backup_${Date.now()}.json`);
        fs.copyFileSync(SAMPLES_FILE, preRestoreBackup);
      }

      // Write restored samples
      fs.writeFileSync(SAMPLES_FILE, JSON.stringify(targetSamples, null, 2), 'utf-8');

      // Realtime broadcast to all connected devices and accounts
      broadcastSamplesUpdate(targetSamples, 'Pemulihan Cadangan (Restore)');

      return res.json({ 
        success: true, 
        count: targetSamples.length, 
        message: `Data berhasil dipulihkan (Restore)! ${targetSamples.length} sampel telah dimuat kembali.` 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Get Berita Acara Config & Rows
  app.get('/api/berita-acara', (req, res) => {
    try {
      if (fs.existsSync(BERITA_ACARA_FILE)) {
        const raw = fs.readFileSync(BERITA_ACARA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        return res.json({ success: true, data });
      }
      return res.json({ success: true, data: null });
    } catch (err: any) {
      console.error('[SERVER] Error reading berita acara:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Save Berita Acara Config & Rows
  app.post('/api/berita-acara', (req, res) => {
    try {
      const config = req.body;
      fs.writeFileSync(BERITA_ACARA_FILE, JSON.stringify(config, null, 2), 'utf-8');
      return res.json({ success: true, updatedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('[SERVER] Error saving berita acara:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Active Petugas
  app.get('/api/active-petugas', (req, res) => {
    try {
      if (fs.existsSync(ACTIVE_PETUGAS_FILE)) {
        const raw = fs.readFileSync(ACTIVE_PETUGAS_FILE, 'utf-8');
        return res.json({ success: true, activePetugas: JSON.parse(raw).activePetugas });
      }
      return res.json({ success: true, activePetugas: 'all' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/active-petugas', (req, res) => {
    try {
      const { activePetugas } = req.body;
      fs.writeFileSync(ACTIVE_PETUGAS_FILE, JSON.stringify({ activePetugas }, null, 2), 'utf-8');
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Reset server data (with safeguard backup)
  app.post('/api/reset-data', (req, res) => {
    try {
      if (fs.existsSync(SAMPLES_FILE)) {
        // Always safeguard existing progress before reset
        const preResetBackup = path.join(BACKUPS_DIR, `Pre_Reset_Backup_${Date.now()}.json`);
        fs.copyFileSync(SAMPLES_FILE, preResetBackup);
        fs.unlinkSync(SAMPLES_FILE);
      }
      if (fs.existsSync(BERITA_ACARA_FILE)) fs.unlinkSync(BERITA_ACARA_FILE);
      if (fs.existsSync(ACTIVE_PETUGAS_FILE)) fs.unlinkSync(ACTIVE_PETUGAS_FILE);
      return res.json({ success: true, message: 'Server data reset (salinan cadangan telah dibuat di server)' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dev server with Vite middleware or Production static files
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] SITASI 2026 server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER] Failed to start:', err);
  process.exit(1);
});
