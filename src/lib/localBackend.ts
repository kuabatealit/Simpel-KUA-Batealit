import { BATEALIT_VILLAGES } from '../data/regions';
import { DEFAULT_VILLAGE_SEEDS, INITIAL_DEMO_FILINGS } from '../data/seeds';
import type {
  MarriageFilingForm,
  MarriageFilingRecord,
  UserProfile,
  UserRole,
} from '../types/marriage';
import { createDemoFilingForm, validateFilingForm } from '../utils/formatting';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredUser {
  id: number;
  username: string;
  passwordHash: string;
  role: UserRole;
  desaName: string;
  namaPetinggi: string;
  gelarDepan: string;
  gelarBelakang: string;
  nip: string;
  jabatanPenandatangan: string;
  kepalaLingkungan: string;
  alamatKantor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredState {
  version: number;
  isInitialized: boolean;
  nextUserId: number;
  nextFilingId: number;
  users: StoredUser[];
  filings: MarriageFilingRecord[];
}

interface SessionEntry {
  userId: number;
  role: UserRole;
  expiresAt: number;
}

const STORAGE_KEY = 'simpel_kua_batealit_store_v1';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100_000;

function nowIsoSql(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hashPasswordWeb(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  const encoder = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(derivedBits))}`;
}

async function verifyPasswordWeb(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  const expectedHex = parts[3];
  if (!Number.isFinite(iterations) || iterations < 10_000 || !saltHex || !expectedHex) {
    return false;
  }
  const encoder = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const saltBytes = hexToBytes(saltHex);
  const saltBuffer = new ArrayBuffer(saltBytes.byteLength);
  new Uint8Array(saltBuffer).set(saltBytes);
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return constantTimeEqualHex(bytesToHex(new Uint8Array(derivedBits)), expectedHex);
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function toUserProfile(user: StoredUser, filingCount?: number): UserProfile {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    desaName: user.desaName,
    namaPetinggi: user.namaPetinggi,
    gelarDepan: user.gelarDepan,
    gelarBelakang: user.gelarBelakang,
    nip: user.nip,
    jabatanPenandatangan: user.jabatanPenandatangan,
    kepalaLingkungan: user.kepalaLingkungan,
    alamatKantor: user.alamatKantor,
    isActive: user.isActive,
    filingCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createInitialState(): StoredState {
  const timestamp = nowIsoSql();
  const users: StoredUser[] = [
    {
      id: 1,
      username: 'admin_kua',
      passwordHash: '',
      role: 'kua_admin',
      desaName: 'KUA Kecamatan Batealit',
      namaPetinggi: 'Kepala KUA Kecamatan Batealit',
      gelarDepan: 'H.',
      gelarBelakang: 'S.Ag., M.H.',
      nip: '197408152000031002',
      jabatanPenandatangan: 'Kepala KUA Kecamatan Batealit',
      kepalaLingkungan: '',
      alamatKantor: 'Jl. Raya Batealit KM 10, Kecamatan Batealit, Kabupaten Jepara',
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  let nextUserId = 2;
  for (const desa of BATEALIT_VILLAGES) {
    const seed = DEFAULT_VILLAGE_SEEDS[desa];
    users.push({
      id: nextUserId,
      username: seed.username,
      passwordHash: '',
      role: 'village_admin',
      desaName: desa,
      namaPetinggi: seed.namaPetinggi,
      gelarDepan: seed.gelarDepan,
      gelarBelakang: seed.gelarBelakang,
      nip: seed.nip,
      jabatanPenandatangan: 'Kepala Desa / Lurah',
      kepalaLingkungan: seed.kepalaLingkungan,
      alamatKantor: `Balai Desa ${desa}, Kecamatan Batealit, Kabupaten Jepara`,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    nextUserId += 1;
  }

  let nextFilingId = 1;
  const filings: MarriageFilingRecord[] = [];
  for (const seed of INITIAL_DEMO_FILINGS) {
    const owner = users.find((u) => u.username === seed.username);
    if (!owner) continue;
    const demo = createDemoFilingForm({
      desaName: seed.desa,
      namaPetinggi: owner.namaPetinggi,
      gelarDepan: owner.gelarDepan,
      gelarBelakang: owner.gelarBelakang,
      nip: owner.nip,
      jabatanPenandatangan: owner.jabatanPenandatangan,
      kepalaLingkungan: owner.kepalaLingkungan,
    });
    demo.akad.nomorSuratN1 = seed.nomor;
    demo.akad.tanggalAkad = seed.tglAkad;
    demo.suami.nama = seed.suami;
    demo.suami.nik = seed.nikSuami;
    demo.istri.nama = seed.istri;
    demo.istri.nik = seed.nikIstri;
    demo.waliNikah.nama = seed.wali;
    demo.pemberiKuasa.nama = seed.suami;
    demo.pemberiKuasa.nik = seed.nikSuami;

    filings.push({
      id: nextFilingId,
      villageUserId: owner.id,
      desaName: seed.desa,
      nomorSuratN1: seed.nomor,
      namaSuami: seed.suami,
      nikSuami: seed.nikSuami,
      namaIstri: seed.istri,
      nikIstri: seed.nikIstri,
      namaWali: seed.wali,
      tanggalAkad: seed.tglAkad,
      jamAkad: demo.akad.jamAkad,
      tempatAkad: demo.akad.tempatAkad,
      statusBerkas: 'Lengkap',
      payload: demo,
      createdByUsername: owner.username,
      createdAt: seed.createdAt,
      updatedAt: seed.createdAt,
    });
    nextFilingId += 1;
  }

  return {
    version: 1,
    isInitialized: false,
    nextUserId,
    nextFilingId,
    users,
    filings,
  };
}

function getDefaultStorage(): StorageLike {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Fallback to in-memory storage if browser restricts localStorage
  }
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

export function createLocalBackend(customStorage?: StorageLike) {
  const storage = customStorage ?? getDefaultStorage();
  // Active sessions live strictly in memory (never written to localStorage/sessionStorage)
  const sessions = new Map<string, SessionEntry>();

  function loadState(): StoredState {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState>;
        if (
          parsed &&
          Array.isArray(parsed.users) &&
          Array.isArray(parsed.filings) &&
          typeof parsed.nextUserId === 'number' &&
          typeof parsed.nextFilingId === 'number'
        ) {
          return {
            version: parsed.version ?? 1,
            isInitialized: Boolean(parsed.isInitialized),
            nextUserId: parsed.nextUserId,
            nextFilingId: parsed.nextFilingId,
            users: parsed.users,
            filings: parsed.filings,
          };
        }
      }
    } catch {
      // Corrupted storage falls back cleanly to initial state
    }
    const fresh = createInitialState();
    saveState(fresh);
    return fresh;
  }

  function saveState(state: StoredState): void {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function requireAuth(token: string | null, state: StoredState): StoredUser {
    if (!token) {
      throw new Error('Sesi login diperlukan.');
    }
    const entry = sessions.get(token);
    if (!entry || Date.now() > entry.expiresAt) {
      sessions.delete(token);
      throw new Error('Sesi telah berakhir. Silakan login kembali.');
    }
    const user = state.users.find((u) => u.id === entry.userId);
    if (!user || !user.isActive) {
      sessions.delete(token);
      throw new Error('Akun tidak ditemukan atau sedang dinonaktifkan.');
    }
    return user;
  }

  function requireKuaAdmin(user: StoredUser): void {
    if (user.role !== 'kua_admin') {
      throw new Error('Akses khusus Admin Umum KUA Batealit.');
    }
  }

  function issueSession(user: StoredUser): string {
    const token = generateSessionToken();
    sessions.set(token, {
      userId: user.id,
      role: user.role,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });
    return token;
  }

  return {
    async getAuthStatus() {
      const state = loadState();
      const activeVillages = state.users.filter(
        (u) => u.role === 'village_admin' && u.isActive,
      ).length;
      return {
        needsSetup: !state.isInitialized,
        envAdminActive: false,
        villageCount: activeVillages,
        backendMode: 'standalone' as const,
      };
    },

    async setupAdmin(adminPassword: string, villageDefaultPassword: string) {
      const state = loadState();
      if (state.isInitialized) {
        throw new Error(
          'Sistem sudah diaktivasi. Silakan masuk menggunakan username dan kata sandi.',
        );
      }
      const cleanAdmin = adminPassword.trim();
      const cleanVillage = villageDefaultPassword.trim();
      if (cleanAdmin.length < 6) {
        throw new Error('Kata sandi Admin KUA minimal 6 karakter.');
      }
      if (cleanVillage.length < 6) {
        throw new Error('Kata sandi awal Admin Desa minimal 6 karakter.');
      }

      const [adminHash, villageHash] = await Promise.all([
        hashPasswordWeb(cleanAdmin),
        hashPasswordWeb(cleanVillage),
      ]);
      const ts = nowIsoSql();
      for (const u of state.users) {
        u.passwordHash = u.role === 'kua_admin' ? adminHash : villageHash;
        u.updatedAt = ts;
      }
      state.isInitialized = true;
      saveState(state);

      const adminUser = state.users.find((u) => u.username === 'admin_kua');
      if (!adminUser) {
        throw new Error('Akun Admin KUA tidak ditemukan.');
      }
      const token = issueSession(adminUser);
      return { token, user: toUserProfile(adminUser) };
    },

    async login(username: string, password: string) {
      const state = loadState();
      if (!state.isInitialized) {
        throw new Error(
          'Sistem belum diaktivasi. Silakan klik "Aktivasi Awal Sistem" di bawah untuk menetapkan kata sandi pertama kali.',
        );
      }
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername || !password) {
        throw new Error('Username dan password wajib diisi.');
      }
      const user = state.users.find((u) => u.username.toLowerCase() === cleanUsername);
      if (!user) {
        throw new Error('Username atau password salah.');
      }
      if (!user.isActive) {
        throw new Error('Akun desa ini sedang dinonaktifkan oleh Admin Umum KUA.');
      }
      const valid = await verifyPasswordWeb(password, user.passwordHash);
      if (!valid) {
        throw new Error('Username atau password salah.');
      }
      const token = issueSession(user);
      return { token, user: toUserProfile(user) };
    },

    async me(token: string) {
      const state = loadState();
      const user = requireAuth(token, state);
      return { user: toUserProfile(user) };
    },

    async logout(token: string) {
      sessions.delete(token);
      return { ok: true };
    },

    async updateProfile(
      token: string,
      payload: {
        desaName?: string;
        namaPetinggi: string;
        gelarDepan: string;
        gelarBelakang: string;
        nip: string;
        jabatanPenandatangan: string;
        kepalaLingkungan: string;
        alamatKantor: string;
        currentPassword?: string;
        newPassword?: string;
      },
    ) {
      const state = loadState();
      const currentUser = requireAuth(token, state);

      const desaName = String(payload.desaName ?? currentUser.desaName).trim();
      if (!desaName || desaName.length > 100) {
        throw new Error('Nama Wilayah / Desa wajib diisi (maksimal 100 karakter).');
      }

      const newPassword = String(payload.newPassword || '').trim();
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('Kata sandi baru minimal 6 karakter.');
        }
        const ok = await verifyPasswordWeb(
          String(payload.currentPassword || ''),
          currentUser.passwordHash,
        );
        if (!ok) {
          throw new Error('Kata sandi saat ini tidak sesuai.');
        }
        currentUser.passwordHash = await hashPasswordWeb(newPassword);
      }

      currentUser.desaName = desaName;
      currentUser.namaPetinggi = String(payload.namaPetinggi ?? currentUser.namaPetinggi).trim();
      currentUser.gelarDepan = String(payload.gelarDepan ?? currentUser.gelarDepan).trim();
      currentUser.gelarBelakang = String(payload.gelarBelakang ?? currentUser.gelarBelakang).trim();
      currentUser.nip = String(payload.nip ?? currentUser.nip).trim();
      currentUser.jabatanPenandatangan =
        String(payload.jabatanPenandatangan ?? currentUser.jabatanPenandatangan).trim() ||
        'Kepala Desa / Lurah';
      currentUser.kepalaLingkungan = String(
        payload.kepalaLingkungan ?? currentUser.kepalaLingkungan,
      ).trim();
      currentUser.alamatKantor = String(payload.alamatKantor ?? currentUser.alamatKantor).trim();
      currentUser.updatedAt = nowIsoSql();

      saveState(state);
      return { user: toUserProfile(currentUser) };
    },

    async getVillageUsers(token: string) {
      const state = loadState();
      const currentUser = requireAuth(token, state);
      requireKuaAdmin(currentUser);

      const counts = new Map<number, number>();
      for (const f of state.filings) {
        counts.set(f.villageUserId, (counts.get(f.villageUserId) ?? 0) + 1);
      }

      const villageUsers = state.users
        .filter((u) => u.role === 'village_admin')
        .sort((a, b) => a.desaName.localeCompare(b.desaName, 'id'))
        .map((u) => toUserProfile(u, counts.get(u.id) ?? 0));

      return { users: villageUsers };
    },

    async createVillageUser(
      token: string,
      payload: {
        username: string;
        password: string;
        desaName: string;
        namaPetinggi: string;
        gelarDepan: string;
        gelarBelakang: string;
        nip: string;
        jabatanPenandatangan: string;
        kepalaLingkungan: string;
        alamatKantor: string;
      },
    ) {
      const state = loadState();
      const currentUser = requireAuth(token, state);
      requireKuaAdmin(currentUser);

      const username = String(payload.username || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '');
      const password = String(payload.password || '').trim();
      const desaName = String(payload.desaName || '').trim();

      if (!username || username.length < 3) {
        throw new Error('Username minimal 3 karakter (huruf, angka, garis bawah).');
      }
      if (!desaName) {
        throw new Error('Nama Desa wajib diisi.');
      }
      if (password.length < 6) {
        throw new Error('Kata sandi awal minimal 6 karakter.');
      }
      if (state.users.some((u) => u.username.toLowerCase() === username)) {
        throw new Error(`Username "${username}" sudah digunakan.`);
      }

      const ts = nowIsoSql();
      const created: StoredUser = {
        id: state.nextUserId,
        username,
        passwordHash: await hashPasswordWeb(password),
        role: 'village_admin',
        desaName,
        namaPetinggi: String(payload.namaPetinggi || '').trim(),
        gelarDepan: String(payload.gelarDepan || '').trim(),
        gelarBelakang: String(payload.gelarBelakang || '').trim(),
        nip: String(payload.nip || '').trim(),
        jabatanPenandatangan:
          String(payload.jabatanPenandatangan || '').trim() || 'Kepala Desa / Lurah',
        kepalaLingkungan: String(payload.kepalaLingkungan || '').trim(),
        alamatKantor:
          String(payload.alamatKantor || '').trim() ||
          `Balai Desa ${desaName}, Kecamatan Batealit, Kabupaten Jepara`,
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      };
      state.nextUserId += 1;
      state.users.push(created);
      saveState(state);

      return { user: toUserProfile(created, 0) };
    },

    async updateVillageUser(
      token: string,
      id: number,
      payload: Partial<{
        username: string;
        password: string;
        desaName: string;
        namaPetinggi: string;
        gelarDepan: string;
        gelarBelakang: string;
        nip: string;
        jabatanPenandatangan: string;
        kepalaLingkungan: string;
        alamatKantor: string;
        isActive: boolean;
      }>,
    ) {
      const state = loadState();
      const currentUser = requireAuth(token, state);
      requireKuaAdmin(currentUser);

      const target = state.users.find((u) => u.id === id && u.role === 'village_admin');
      if (!target) {
        throw new Error('Akun admin desa tidak ditemukan.');
      }

      const username = String(payload.username ?? target.username)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '');
      const desaName = String(payload.desaName ?? target.desaName).trim();

      if (!username || !desaName) {
        throw new Error('Username dan Nama Desa wajib diisi.');
      }
      if (state.users.some((u) => u.username.toLowerCase() === username && u.id !== id)) {
        throw new Error(`Username "${username}" sudah digunakan akun lain.`);
      }

      const resetPassword = String(payload.password || '').trim();
      if (resetPassword) {
        if (resetPassword.length < 6) {
          throw new Error('Kata sandi baru minimal 6 karakter.');
        }
        target.passwordHash = await hashPasswordWeb(resetPassword);
      }

      target.username = username;
      target.desaName = desaName;
      target.namaPetinggi = String(payload.namaPetinggi ?? target.namaPetinggi).trim();
      target.gelarDepan = String(payload.gelarDepan ?? target.gelarDepan).trim();
      target.gelarBelakang = String(payload.gelarBelakang ?? target.gelarBelakang).trim();
      target.nip = String(payload.nip ?? target.nip).trim();
      target.jabatanPenandatangan =
        String(payload.jabatanPenandatangan ?? target.jabatanPenandatangan).trim() ||
        'Kepala Desa / Lurah';
      target.kepalaLingkungan = String(
        payload.kepalaLingkungan ?? target.kepalaLingkungan,
      ).trim();
      target.alamatKantor = String(payload.alamatKantor ?? target.alamatKantor).trim();
      if (typeof payload.isActive === 'boolean') {
        target.isActive = payload.isActive;
      }
      target.updatedAt = nowIsoSql();

      saveState(state);
      return { user: toUserProfile(target) };
    },

    async deleteVillageUser(token: string, id: number) {
      const state = loadState();
      const currentUser = requireAuth(token, state);
      requireKuaAdmin(currentUser);

      const idx = state.users.findIndex((u) => u.id === id && u.role === 'village_admin');
      if (idx === -1) {
        throw new Error('Akun admin desa tidak ditemukan.');
      }
      state.users.splice(idx, 1);
      state.filings = state.filings.filter((f) => f.villageUserId !== id);
      saveState(state);
      return { ok: true };
    },

    async getFilings(
      token: string,
      filters?: {
        search?: string;
        desa?: string;
        month?: string;
        year?: string;
        status?: string;
      },
    ) {
      const state = loadState();
      const user = requireAuth(token, state);

      const search = String(filters?.search || '').trim().toLowerCase();
      const desa = String(filters?.desa || '').trim().toLowerCase();
      const month = String(filters?.month || '').trim();
      const year = String(filters?.year || '').trim();
      const status = String(filters?.status || '').trim();

      const filtered = state.filings
        .filter((f) => {
          if (user.role === 'village_admin') {
            if (f.villageUserId !== user.id) return false;
          } else if (desa && desa !== 'all') {
            if (f.desaName.toLowerCase() !== desa) return false;
          }
          if (status && status !== 'all' && f.statusBerkas !== status) {
            return false;
          }
          if (year && /^\d{4}$/.test(year)) {
            const akadYear = f.tanggalAkad.slice(0, 4);
            const createdYear = f.createdAt.slice(0, 4);
            if (akadYear !== year && createdYear !== year) return false;
          }
          if (month && /^\d{2}$/.test(month)) {
            const akadMonth = f.tanggalAkad.slice(5, 7);
            const createdMonth = f.createdAt.slice(5, 7);
            if (akadMonth !== month && createdMonth !== month) return false;
          }
          if (search) {
            const hay = [
              f.namaSuami,
              f.nikSuami,
              f.namaIstri,
              f.nikIstri,
              f.nomorSuratN1,
              f.desaName,
            ]
              .join(' ')
              .toLowerCase();
            if (!hay.includes(search)) return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) {
            return b.createdAt.localeCompare(a.createdAt);
          }
          return b.id - a.id;
        });

      return { filings: filtered };
    },

    async createFiling(
      token: string,
      payload: MarriageFilingForm,
      statusBerkas: 'Lengkap' | 'Draft' = 'Lengkap',
    ) {
      const state = loadState();
      const user = requireAuth(token, state);

      if (!payload || !payload.suami || !payload.istri || !payload.akad) {
        throw new Error('Struktur data berkas nikah tidak valid.');
      }

      const cloned: MarriageFilingForm = JSON.parse(JSON.stringify(payload));
      if (statusBerkas === 'Lengkap') {
        const validationErrors = validateFilingForm(cloned);
        const firstErr = Object.values(validationErrors)[0];
        if (firstErr) {
          throw new Error(firstErr);
        }
      }

      let targetVillageUserId = user.id;
      let desaName = cloned.akad.desaPenerbit || user.desaName;

      if (user.role === 'village_admin') {
        targetVillageUserId = user.id;
        desaName = user.desaName;
        cloned.akad.desaPenerbit = user.desaName;
      } else if (cloned.akad.desaPenerbit) {
        const matched = state.users.find(
          (u) =>
            u.role === 'village_admin' &&
            u.desaName.toLowerCase() === cloned.akad.desaPenerbit.trim().toLowerCase(),
        );
        if (matched) {
          targetVillageUserId = matched.id;
          desaName = matched.desaName;
        }
      }

      const ts = nowIsoSql();
      const created: MarriageFilingRecord = {
        id: state.nextFilingId,
        villageUserId: targetVillageUserId,
        desaName,
        nomorSuratN1: cloned.akad.nomorSuratN1 || '',
        namaSuami: cloned.suami.nama || '',
        nikSuami: cloned.suami.nik || '',
        namaIstri: cloned.istri.nama || '',
        nikIstri: cloned.istri.nik || '',
        namaWali: cloned.waliNikah?.nama || '',
        tanggalAkad: cloned.akad.tanggalAkad || '',
        jamAkad: cloned.akad.jamAkad || '',
        tempatAkad: cloned.akad.tempatAkad || '',
        statusBerkas,
        payload: cloned,
        createdByUsername: user.username,
        createdAt: ts,
        updatedAt: ts,
      };
      state.nextFilingId += 1;
      state.filings.unshift(created);
      saveState(state);

      return { filing: created };
    },

    async updateFiling(
      token: string,
      id: number,
      payload: MarriageFilingForm,
      statusBerkas: 'Lengkap' | 'Draft' = 'Lengkap',
    ) {
      const state = loadState();
      const user = requireAuth(token, state);

      const existing = state.filings.find((f) => f.id === id);
      if (!existing) {
        throw new Error('Data berkas nikah tidak ditemukan.');
      }
      if (user.role === 'village_admin' && existing.villageUserId !== user.id) {
        throw new Error('Anda tidak memiliki akses mengubah berkas desa lain.');
      }
      if (!payload || !payload.suami || !payload.istri || !payload.akad) {
        throw new Error('Struktur data berkas nikah tidak valid.');
      }

      const cloned: MarriageFilingForm = JSON.parse(JSON.stringify(payload));
      if (statusBerkas === 'Lengkap') {
        const validationErrors = validateFilingForm(cloned);
        const firstErr = Object.values(validationErrors)[0];
        if (firstErr) {
          throw new Error(firstErr);
        }
      }

      const desaName =
        user.role === 'village_admin'
          ? user.desaName
          : cloned.akad.desaPenerbit || existing.desaName;

      existing.desaName = desaName;
      existing.nomorSuratN1 = cloned.akad.nomorSuratN1 || '';
      existing.namaSuami = cloned.suami.nama || '';
      existing.nikSuami = cloned.suami.nik || '';
      existing.namaIstri = cloned.istri.nama || '';
      existing.nikIstri = cloned.istri.nik || '';
      existing.namaWali = cloned.waliNikah?.nama || '';
      existing.tanggalAkad = cloned.akad.tanggalAkad || '';
      existing.jamAkad = cloned.akad.jamAkad || '';
      existing.tempatAkad = cloned.akad.tempatAkad || '';
      existing.statusBerkas = statusBerkas;
      existing.payload = cloned;
      existing.updatedAt = nowIsoSql();

      saveState(state);
      return { filing: existing };
    },

    async deleteFiling(token: string, id: number) {
      const state = loadState();
      const user = requireAuth(token, state);

      const idx = state.filings.findIndex((f) => f.id === id);
      if (idx === -1) {
        throw new Error('Data berkas nikah tidak ditemukan.');
      }
      if (user.role === 'village_admin' && state.filings[idx].villageUserId !== user.id) {
        throw new Error('Anda tidak memiliki akses menghapus berkas desa lain.');
      }

      state.filings.splice(idx, 1);
      saveState(state);
      return { ok: true };
    },
  };
}

export const localBackend = createLocalBackend();
