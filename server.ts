import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  db,
  getAllVillageUsers,
  getRawUserById,
  getRawUserByUsername,
  hashPassword,
  initDatabase,
  isAppInitialized,
  mapFilingRow,
  mapUserRow,
  markAppInitialized,
  timingSafeEqualString,
  verifyPassword,
} from './src/server/db.ts';
import { validateFilingForm } from './src/utils/formatting.ts';
import type { MarriageFilingForm, UserProfile } from './src/types/marriage.ts';

dotenv.config();
initDatabase();

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

interface TokenPayload {
  userId: number;
  role: 'kua_admin' | 'village_admin';
  exp: number;
}

interface AuthedRequest extends Request {
  authUser?: UserProfile;
}

function signToken(payload: TokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  if (!timingSafeEqualString(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as TokenPayload;
    if (!parsed.userId || !parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi login diperlukan.' });
    return;
  }
  const token = header.slice(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Sesi telah berakhir. Silakan login kembali.' });
    return;
  }
  const raw = getRawUserById(decoded.userId);
  if (!raw || raw.is_active !== 1) {
    res.status(401).json({ error: 'Akun tidak ditemukan atau sedang dinonaktifkan.' });
    return;
  }
  req.authUser = mapUserRow(raw);
  next();
}

function requireKuaAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== 'kua_admin') {
    res.status(403).json({ error: 'Akses khusus Admin Umum KUA Batealit.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Optional allowlist-based CORS for cross-origin Vercel frontends connecting to this API
  const allowedOrigins = new Set(
    String(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  );
  if (allowedOrigins.size > 0) {
    app.use('/api', (req, res, next) => {
      const requestOrigin = String(req.headers.origin || '').replace(/\/+$/, '');
      if (requestOrigin && allowedOrigins.has(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    });
  }

  // Auth status (safe public info without exposing usernames)
  app.get('/api/auth/status', (_req, res) => {
    const envAdminActive = Boolean(process.env.KUA_ADMIN_PASSWORD?.trim());
    const initialized = isAppInitialized();
    const countRow = db
      .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'village_admin' AND is_active = 1")
      .get() as { c: number };

    res.json({
      needsSetup: !initialized && !envAdminActive,
      envAdminActive,
      villageCount: countRow.c,
      backendMode: 'server',
    });
  });

  // One-time first-run setup when KUA_ADMIN_PASSWORD env var is unset and not yet claimed
  app.post('/api/auth/setup', (req, res) => {
    const envAdminActive = Boolean(process.env.KUA_ADMIN_PASSWORD?.trim());
    if (envAdminActive || isAppInitialized()) {
      res.status(409).json({
        error: 'Sistem sudah diaktivasi. Silakan masuk menggunakan username dan kata sandi.',
      });
      return;
    }

    const adminPassword = String(req.body?.adminPassword || '').trim();
    const villageDefaultPassword = String(req.body?.villageDefaultPassword || '').trim();

    if (adminPassword.length < 6) {
      res.status(400).json({ error: 'Kata sandi Admin KUA minimal 6 karakter.' });
      return;
    }
    if (villageDefaultPassword.length < 6) {
      res.status(400).json({ error: 'Kata sandi awal Admin Desa minimal 6 karakter.' });
      return;
    }

    const adminHash = hashPassword(adminPassword);
    const villageHash = hashPassword(villageDefaultPassword);

    const setupTx = db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE role = 'kua_admin'").run(
        adminHash,
      );
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE role = 'village_admin'").run(
        villageHash,
      );
      markAppInitialized();
    });
    setupTx();

    const adminRow = getRawUserByUsername('admin_kua');
    if (!adminRow) {
      res.status(500).json({ error: 'Akun Admin KUA tidak ditemukan.' });
      return;
    }

    const user = mapUserRow(adminRow);
    const token = signToken({
      userId: user.id,
      role: user.role,
      exp: Date.now() + TOKEN_TTL_MS,
    });

    res.json({ token, user });
  });

  // Login (unified for both Admin KUA and Admin Desa; role resolved server-side)
  app.post('/api/auth/login', (req, res) => {
    const envAdminPassword = process.env.KUA_ADMIN_PASSWORD?.trim();
    if (!envAdminPassword && !isAppInitialized()) {
      res.status(403).json({
        error:
          'Sistem belum diaktivasi. Silakan klik "Aktivasi Awal Sistem" di bawah untuk menetapkan kata sandi pertama kali.',
      });
      return;
    }

    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      res.status(400).json({ error: 'Username dan password wajib diisi.' });
      return;
    }

    const raw = getRawUserByUsername(username);
    if (!raw) {
      res.status(401).json({ error: 'Username atau password salah.' });
      return;
    }
    if (raw.is_active !== 1) {
      res.status(403).json({
        error: 'Akun desa ini sedang dinonaktifkan oleh Admin Umum KUA.',
      });
      return;
    }

    let valid = false;
    if (raw.role === 'kua_admin' && envAdminPassword) {
      valid = timingSafeEqualString(password, envAdminPassword);
    } else {
      valid = verifyPassword(password, raw.password_hash);
    }

    if (!valid) {
      res.status(401).json({ error: 'Username atau password salah.' });
      return;
    }

    const user = mapUserRow(raw);
    const token = signToken({
      userId: user.id,
      role: user.role,
      exp: Date.now() + TOKEN_TTL_MS,
    });

    res.json({ token, user });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: req.authUser });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.json({ ok: true });
  });

  // Update own profile (Village Admin or KUA Admin)
  app.put('/api/profile', requireAuth, (req: AuthedRequest, res) => {
    const currentUser = req.authUser!;
    const desaName = String(req.body?.desaName ?? currentUser.desaName).trim();
    const namaPetinggi = String(req.body?.namaPetinggi ?? currentUser.namaPetinggi).trim();
    const gelarDepan = String(req.body?.gelarDepan ?? currentUser.gelarDepan).trim();
    const gelarBelakang = String(req.body?.gelarBelakang ?? currentUser.gelarBelakang).trim();
    const nip = String(req.body?.nip ?? currentUser.nip).trim();
    const jabatanPenandatangan =
      String(req.body?.jabatanPenandatangan ?? currentUser.jabatanPenandatangan).trim() ||
      'Kepala Desa / Lurah';
    const kepalaLingkungan = String(req.body?.kepalaLingkungan ?? currentUser.kepalaLingkungan).trim();
    const alamatKantor = String(req.body?.alamatKantor ?? currentUser.alamatKantor).trim();

    if (!desaName || desaName.length > 100) {
      res.status(400).json({ error: 'Nama Wilayah / Desa wajib diisi (maksimal 100 karakter).' });
      return;
    }

    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '').trim();

    if (newPassword) {
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
        return;
      }
      const raw = getRawUserById(currentUser.id)!;
      const envAdminPassword = process.env.KUA_ADMIN_PASSWORD?.trim();
      const verified =
        raw.role === 'kua_admin' && envAdminPassword
          ? timingSafeEqualString(currentPassword, envAdminPassword)
          : verifyPassword(currentPassword, raw.password_hash);
      if (!verified) {
        res.status(400).json({ error: 'Kata sandi saat ini tidak sesuai.' });
        return;
      }
      const newHash = hashPassword(newPassword);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
        newHash,
        currentUser.id,
      );
    }

    db.prepare(`
      UPDATE users
      SET desa_name = ?,
          nama_petinggi = ?,
          gelar_depan = ?,
          gelar_belakang = ?,
          nip = ?,
          jabatan_penandatangan = ?,
          kepala_lingkungan = ?,
          alamat_kantor = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      desaName,
      namaPetinggi,
      gelarDepan,
      gelarBelakang,
      nip,
      jabatanPenandatangan,
      kepalaLingkungan,
      alamatKantor,
      currentUser.id,
    );

    const updated = mapUserRow(getRawUserById(currentUser.id)!);
    res.json({ user: updated });
  });

  // Village Admin Account Management (KUA General Admin only)
  app.get('/api/users', requireAuth, requireKuaAdmin, (_req, res) => {
    res.json({ users: getAllVillageUsers() });
  });

  app.post('/api/users', requireAuth, requireKuaAdmin, (req, res) => {
    const username = String(req.body?.username || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '');
    const password = String(req.body?.password || '').trim();
    const desaName = String(req.body?.desaName || '').trim();
    const namaPetinggi = String(req.body?.namaPetinggi || '').trim();
    const gelarDepan = String(req.body?.gelarDepan || '').trim();
    const gelarBelakang = String(req.body?.gelarBelakang || '').trim();
    const nip = String(req.body?.nip || '').trim();
    const jabatanPenandatangan =
      String(req.body?.jabatanPenandatangan || '').trim() || 'Kepala Desa / Lurah';
    const kepalaLingkungan = String(req.body?.kepalaLingkungan || '').trim();
    const alamatKantor =
      String(req.body?.alamatKantor || '').trim() ||
      `Balai Desa ${desaName}, Kecamatan Batealit, Kabupaten Jepara`;

    if (!username || username.length < 3) {
      res.status(400).json({ error: 'Username minimal 3 karakter (huruf, angka, garis bawah).' });
      return;
    }
    if (!desaName) {
      res.status(400).json({ error: 'Nama Desa wajib diisi.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Kata sandi awal minimal 6 karakter.' });
      return;
    }
    if (getRawUserByUsername(username)) {
      res.status(409).json({ error: `Username "${username}" sudah digunakan.` });
      return;
    }

    const hash = hashPassword(password);
    const info = db
      .prepare(`
        INSERT INTO users (
          username, password_hash, role, desa_name, nama_petinggi,
          gelar_depan, gelar_belakang, nip, jabatan_penandatangan,
          kepala_lingkungan, alamat_kantor, is_active
        ) VALUES (?, ?, 'village_admin', ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `)
      .run(
        username,
        hash,
        desaName,
        namaPetinggi,
        gelarDepan,
        gelarBelakang,
        nip,
        jabatanPenandatangan,
        kepalaLingkungan,
        alamatKantor,
      );

    const created = mapUserRow(getRawUserById(Number(info.lastInsertRowid))!);
    res.status(201).json({ user: created });
  });

  app.put('/api/users/:id', requireAuth, requireKuaAdmin, (req, res) => {
    const id = Number(req.params.id);
    const target = getRawUserById(id);
    if (!target || target.role !== 'village_admin') {
      res.status(404).json({ error: 'Akun admin desa tidak ditemukan.' });
      return;
    }

    const username = String(req.body?.username ?? target.username)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '');
    const desaName = String(req.body?.desaName ?? target.desa_name).trim();
    const namaPetinggi = String(req.body?.namaPetinggi ?? target.nama_petinggi).trim();
    const gelarDepan = String(req.body?.gelarDepan ?? target.gelar_depan).trim();
    const gelarBelakang = String(req.body?.gelarBelakang ?? target.gelar_belakang).trim();
    const nip = String(req.body?.nip ?? target.nip).trim();
    const jabatanPenandatangan =
      String(req.body?.jabatanPenandatangan ?? target.jabatan_penandatangan).trim() ||
      'Kepala Desa / Lurah';
    const kepalaLingkungan = String(req.body?.kepalaLingkungan ?? target.kepala_lingkungan).trim();
    const alamatKantor = String(req.body?.alamatKantor ?? target.alamat_kantor).trim();
    const isActive =
      typeof req.body?.isActive === 'boolean' ? (req.body.isActive ? 1 : 0) : target.is_active;
    const resetPassword = String(req.body?.password || '').trim();

    if (!username || !desaName) {
      res.status(400).json({ error: 'Username dan Nama Desa wajib diisi.' });
      return;
    }
    const existingWithName = getRawUserByUsername(username);
    if (existingWithName && existingWithName.id !== id) {
      res.status(409).json({ error: `Username "${username}" sudah digunakan akun lain.` });
      return;
    }

    if (resetPassword) {
      if (resetPassword.length < 6) {
        res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
        return;
      }
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
        hashPassword(resetPassword),
        id,
      );
    }

    db.prepare(`
      UPDATE users
      SET username = ?,
          desa_name = ?,
          nama_petinggi = ?,
          gelar_depan = ?,
          gelar_belakang = ?,
          nip = ?,
          jabatan_penandatangan = ?,
          kepala_lingkungan = ?,
          alamat_kantor = ?,
          is_active = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      username,
      desaName,
      namaPetinggi,
      gelarDepan,
      gelarBelakang,
      nip,
      jabatanPenandatangan,
      kepalaLingkungan,
      alamatKantor,
      isActive,
      id,
    );

    const updated = mapUserRow(getRawUserById(id)!);
    res.json({ user: updated });
  });

  app.delete('/api/users/:id', requireAuth, requireKuaAdmin, (req, res) => {
    const id = Number(req.params.id);
    const target = getRawUserById(id);
    if (!target || target.role !== 'village_admin') {
      res.status(404).json({ error: 'Akun admin desa tidak ditemukan.' });
      return;
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  // Marriage Filings CRUD + Periodic Filtering
  app.get('/api/filings', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const search = String(req.query.search || '').trim();
    const desa = String(req.query.desa || '').trim();
    const month = String(req.query.month || '').trim();
    const year = String(req.query.year || '').trim();
    const status = String(req.query.status || '').trim();

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (user.role === 'village_admin') {
      conditions.push('village_user_id = ?');
      params.push(user.id);
    } else if (desa && desa !== 'all') {
      conditions.push('lower(desa_name) = lower(?)');
      params.push(desa);
    }

    if (status && status !== 'all') {
      conditions.push('status_berkas = ?');
      params.push(status);
    }

    if (year && /^\d{4}$/.test(year)) {
      conditions.push("(substr(tanggal_akad, 1, 4) = ? OR substr(created_at, 1, 4) = ?)");
      params.push(year, year);
    }

    if (month && /^\d{2}$/.test(month)) {
      conditions.push("(substr(tanggal_akad, 6, 2) = ? OR substr(created_at, 6, 2) = ?)");
      params.push(month, month);
    }

    if (search) {
      const like = `%${search}%`;
      conditions.push(
        '(nama_suami LIKE ? OR nik_suami LIKE ? OR nama_istri LIKE ? OR nik_istri LIKE ? OR nomor_surat_n1 LIKE ? OR desa_name LIKE ?)',
      );
      params.push(like, like, like, like, like, like);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM marriage_filings ${whereClause} ORDER BY datetime(created_at) DESC, id DESC`)
      .all(...params) as Parameters<typeof mapFilingRow>[0][];

    res.json({ filings: rows.map(mapFilingRow) });
  });

  app.post('/api/filings', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const payload = req.body?.payload as MarriageFilingForm | undefined;
    const statusBerkas: 'Lengkap' | 'Draft' =
      req.body?.statusBerkas === 'Draft' ? 'Draft' : 'Lengkap';

    if (!payload || !payload.suami || !payload.istri || !payload.akad) {
      res.status(400).json({ error: 'Struktur data berkas nikah tidak valid.' });
      return;
    }

    if (statusBerkas === 'Lengkap') {
      const validationErrors = validateFilingForm(payload);
      const firstErr = Object.values(validationErrors)[0];
      if (firstErr) {
        res.status(400).json({ error: firstErr, errors: validationErrors });
        return;
      }
    }

    let targetVillageUserId = user.id;
    let desaName = payload.akad.desaPenerbit || user.desaName;

    if (user.role === 'village_admin') {
      targetVillageUserId = user.id;
      desaName = user.desaName;
      payload.akad.desaPenerbit = user.desaName;
    } else if (payload.akad.desaPenerbit) {
      const matchedVillage = db
        .prepare("SELECT id, desa_name FROM users WHERE role = 'village_admin' AND lower(desa_name) = lower(?)")
        .get(payload.akad.desaPenerbit.trim()) as { id: number; desa_name: string } | undefined;
      if (matchedVillage) {
        targetVillageUserId = matchedVillage.id;
        desaName = matchedVillage.desa_name;
      }
    }

    const info = db
      .prepare(`
        INSERT INTO marriage_filings (
          village_user_id, desa_name, nomor_surat_n1, nama_suami, nik_suami,
          nama_istri, nik_istri, nama_wali, tanggal_akad, jam_akad, tempat_akad,
          status_berkas, payload_json, created_by_username
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        targetVillageUserId,
        desaName,
        payload.akad.nomorSuratN1 || '',
        payload.suami.nama || '',
        payload.suami.nik || '',
        payload.istri.nama || '',
        payload.istri.nik || '',
        payload.waliNikah?.nama || '',
        payload.akad.tanggalAkad || '',
        payload.akad.jamAkad || '',
        payload.akad.tempatAkad || '',
        statusBerkas,
        JSON.stringify(payload),
        user.username,
      );

    const created = db
      .prepare('SELECT * FROM marriage_filings WHERE id = ?')
      .get(Number(info.lastInsertRowid)) as Parameters<typeof mapFilingRow>[0];

    res.status(201).json({ filing: mapFilingRow(created) });
  });

  app.put('/api/filings/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT * FROM marriage_filings WHERE id = ?')
      .get(id) as Parameters<typeof mapFilingRow>[0] | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Data berkas nikah tidak ditemukan.' });
      return;
    }
    if (user.role === 'village_admin' && existing.village_user_id !== user.id) {
      res.status(403).json({ error: 'Anda tidak memiliki akses mengubah berkas desa lain.' });
      return;
    }

    const payload = req.body?.payload as MarriageFilingForm | undefined;
    const statusBerkas: 'Lengkap' | 'Draft' =
      req.body?.statusBerkas === 'Draft' ? 'Draft' : 'Lengkap';

    if (!payload || !payload.suami || !payload.istri || !payload.akad) {
      res.status(400).json({ error: 'Struktur data berkas nikah tidak valid.' });
      return;
    }

    if (statusBerkas === 'Lengkap') {
      const validationErrors = validateFilingForm(payload);
      const firstErr = Object.values(validationErrors)[0];
      if (firstErr) {
        res.status(400).json({ error: firstErr, errors: validationErrors });
        return;
      }
    }

    const desaName =
      user.role === 'village_admin'
        ? user.desaName
        : payload.akad.desaPenerbit || existing.desa_name;

    db.prepare(`
      UPDATE marriage_filings
      SET desa_name = ?,
          nomor_surat_n1 = ?,
          nama_suami = ?,
          nik_suami = ?,
          nama_istri = ?,
          nik_istri = ?,
          nama_wali = ?,
          tanggal_akad = ?,
          jam_akad = ?,
          tempat_akad = ?,
          status_berkas = ?,
          payload_json = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      desaName,
      payload.akad.nomorSuratN1 || '',
      payload.suami.nama || '',
      payload.suami.nik || '',
      payload.istri.nama || '',
      payload.istri.nik || '',
      payload.waliNikah?.nama || '',
      payload.akad.tanggalAkad || '',
      payload.akad.jamAkad || '',
      payload.akad.tempatAkad || '',
      statusBerkas,
      JSON.stringify(payload),
      id,
    );

    const updated = db
      .prepare('SELECT * FROM marriage_filings WHERE id = ?')
      .get(id) as Parameters<typeof mapFilingRow>[0];

    res.json({ filing: mapFilingRow(updated) });
  });

  app.delete('/api/filings/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT * FROM marriage_filings WHERE id = ?')
      .get(id) as { id: number; village_user_id: number } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Data berkas nikah tidak ditemukan.' });
      return;
    }
    if (user.role === 'village_admin' && existing.village_user_id !== user.id) {
      res.status(403).json({ error: 'Anda tidak memiliki akses menghapus berkas desa lain.' });
      return;
    }

    db.prepare('DELETE FROM marriage_filings WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIMKAH-Desk KUA Batealit server listening on http://localhost:${PORT}`);
  });
}

startServer();
