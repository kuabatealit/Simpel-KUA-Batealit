import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { BATEALIT_VILLAGES } from '../data/regions.ts';
import { createDemoFilingForm } from '../utils/formatting.ts';
import type {
  MarriageFilingForm,
  MarriageFilingRecord,
  UserProfile,
  UserRole,
} from '../types/marriage.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(DATA_DIR, 'kua_batealit.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derivedBuf.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, keyBuf);
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

interface RawUserRow {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  desa_name: string;
  nama_petinggi: string;
  gelar_depan: string;
  gelar_belakang: string;
  nip: string;
  jabatan_penandatangan: string;
  kepala_lingkungan: string;
  alamat_kantor: string;
  is_active: number;
  filing_count?: number;
  created_at: string;
  updated_at: string;
}

interface RawFilingRow {
  id: number;
  village_user_id: number;
  desa_name: string;
  nomor_surat_n1: string;
  nama_suami: string;
  nik_suami: string;
  nama_istri: string;
  nik_istri: string;
  nama_wali: string;
  tanggal_akad: string;
  jam_akad: string;
  tempat_akad: string;
  status_berkas: 'Lengkap' | 'Draft';
  payload_json: string;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export function mapUserRow(row: RawUserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    desaName: row.desa_name,
    namaPetinggi: row.nama_petinggi,
    gelarDepan: row.gelar_depan,
    gelarBelakang: row.gelar_belakang,
    nip: row.nip,
    jabatanPenandatangan: row.jabatan_penandatangan,
    kepalaLingkungan: row.kepala_lingkungan,
    alamatKantor: row.alamat_kantor,
    isActive: row.is_active === 1,
    filingCount: typeof row.filing_count === 'number' ? row.filing_count : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFilingRow(row: RawFilingRow): MarriageFilingRecord {
  let payload: MarriageFilingForm;
  try {
    payload = JSON.parse(row.payload_json) as MarriageFilingForm;
  } catch {
    payload = createDemoFilingForm({ desaName: row.desa_name });
  }
  return {
    id: row.id,
    villageUserId: row.village_user_id,
    desaName: row.desa_name,
    nomorSuratN1: row.nomor_surat_n1,
    namaSuami: row.nama_suami,
    nikSuami: row.nik_suami,
    namaIstri: row.nama_istri,
    nikIstri: row.nik_istri,
    namaWali: row.nama_wali,
    tanggalAkad: row.tanggal_akad,
    jamAkad: row.jam_akad,
    tempatAkad: row.tempat_akad,
    statusBerkas: row.status_berkas,
    payload,
    createdByUsername: row.created_by_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DEFAULT_VILLAGE_SEEDS: Record<
  string,
  {
    username: string;
    namaPetinggi: string;
    gelarDepan: string;
    gelarBelakang: string;
    nip: string;
    kepalaLingkungan: string;
  }
> = {
  Bantrung: {
    username: 'desa_bantrung',
    namaPetinggi: 'Ahmad Shodiq',
    gelarDepan: 'H.',
    gelarBelakang: 'S.H.',
    nip: '',
    kepalaLingkungan: 'Kasmani',
  },
  Batealit: {
    username: 'desa_batealit',
    namaPetinggi: 'Muhammad Noor',
    gelarDepan: '',
    gelarBelakang: 'S.Pd.',
    nip: '',
    kepalaLingkungan: 'Subiyanto',
  },
  Bawu: {
    username: 'desa_bawu',
    namaPetinggi: 'Kuzaeni',
    gelarDepan: 'H.',
    gelarBelakang: 'S.Ag.',
    nip: '',
    kepalaLingkungan: 'Supriyadi',
  },
  Bringin: {
    username: 'desa_bringin',
    namaPetinggi: 'Sunarto',
    gelarDepan: '',
    gelarBelakang: 'S.E.',
    nip: '',
    kepalaLingkungan: 'Karsono',
  },
  Geneng: {
    username: 'desa_geneng',
    namaPetinggi: 'Mustain',
    gelarDepan: '',
    gelarBelakang: 'S.H.',
    nip: '',
    kepalaLingkungan: 'Sukirno',
  },
  Mindahan: {
    username: 'desa_mindahan',
    namaPetinggi: 'Abdul Wahid',
    gelarDepan: 'H.',
    gelarBelakang: 'S.Pd.I.',
    nip: '',
    kepalaLingkungan: 'Darmaji',
  },
  'Mindahan Kidul': {
    username: 'desa_mindahankidul',
    namaPetinggi: 'Suyanto',
    gelarDepan: '',
    gelarBelakang: 'S.Sos.',
    nip: '',
    kepalaLingkungan: 'Slamet Riyadi',
  },
  Ngasem: {
    username: 'desa_ngasem',
    namaPetinggi: 'Mulyono',
    gelarDepan: '',
    gelarBelakang: 'S.H.',
    nip: '',
    kepalaLingkungan: 'Wahyudi',
  },
  Pekalongan: {
    username: 'desa_pekalongan',
    namaPetinggi: 'Nur Kholis',
    gelarDepan: 'H.',
    gelarBelakang: 'S.Ag.',
    nip: '',
    kepalaLingkungan: 'Sutrisno',
  },
  Raguklampitan: {
    username: 'desa_raguklampitan',
    namaPetinggi: 'Budi Santoso',
    gelarDepan: '',
    gelarBelakang: 'S.E.',
    nip: '',
    kepalaLingkungan: 'Haryanto',
  },
  Somosari: {
    username: 'desa_somosari',
    namaPetinggi: 'Syaiful Anwar',
    gelarDepan: '',
    gelarBelakang: 'S.Pd.',
    nip: '',
    kepalaLingkungan: 'Joko Susilo',
  },
};

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL CHECK(role IN ('kua_admin', 'village_admin')),
      desa_name TEXT NOT NULL,
      nama_petinggi TEXT NOT NULL DEFAULT '',
      gelar_depan TEXT NOT NULL DEFAULT '',
      gelar_belakang TEXT NOT NULL DEFAULT '',
      nip TEXT NOT NULL DEFAULT '',
      jabatan_penandatangan TEXT NOT NULL DEFAULT 'Kepala Desa / Lurah',
      kepala_lingkungan TEXT NOT NULL DEFAULT '',
      alamat_kantor TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS marriage_filings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      village_user_id INTEGER NOT NULL,
      desa_name TEXT NOT NULL,
      nomor_surat_n1 TEXT NOT NULL DEFAULT '',
      nama_suami TEXT NOT NULL,
      nik_suami TEXT NOT NULL,
      nama_istri TEXT NOT NULL,
      nik_istri TEXT NOT NULL,
      nama_wali TEXT NOT NULL DEFAULT '',
      tanggal_akad TEXT NOT NULL DEFAULT '',
      jam_akad TEXT NOT NULL DEFAULT '',
      tempat_akad TEXT NOT NULL DEFAULT '',
      status_berkas TEXT NOT NULL DEFAULT 'Lengkap',
      payload_json TEXT NOT NULL,
      created_by_username TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (village_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const userCount = (
    db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  ).c;

  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (
        username, password_hash, role, desa_name, nama_petinggi,
        gelar_depan, gelar_belakang, nip, jabatan_penandatangan,
        kepala_lingkungan, alamat_kantor, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const seedTx = db.transaction(() => {
      insertUser.run(
        'admin_kua',
        '',
        'kua_admin',
        'KUA Kecamatan Batealit',
        'Kepala KUA Kecamatan Batealit',
        'H.',
        'S.Ag., M.H.',
        '197408152000031002',
        'Kepala KUA Kecamatan Batealit',
        '',
        'Jl. Raya Batealit KM 10, Kecamatan Batealit, Kabupaten Jepara',
      );

      for (const desa of BATEALIT_VILLAGES) {
        const seed = DEFAULT_VILLAGE_SEEDS[desa];
        insertUser.run(
          seed.username,
          '',
          'village_admin',
          desa,
          seed.namaPetinggi,
          seed.gelarDepan,
          seed.gelarBelakang,
          seed.nip,
          'Kepala Desa / Lurah',
          seed.kepalaLingkungan,
          `Balai Desa ${desa}, Kecamatan Batealit, Kabupaten Jepara`,
        );
      }
    });

    seedTx();
  }

  const filingCount = (
    db.prepare('SELECT COUNT(*) as c FROM marriage_filings').get() as { c: number }
  ).c;

  if (filingCount === 0) {
    const batealitUser = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get('desa_batealit') as RawUserRow | undefined;
    const mindahanUser = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get('desa_mindahan') as RawUserRow | undefined;
    const bawuUser = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get('desa_bawu') as RawUserRow | undefined;

    const insertFiling = db.prepare(`
      INSERT INTO marriage_filings (
        village_user_id, desa_name, nomor_surat_n1, nama_suami, nik_suami,
        nama_istri, nik_istri, nama_wali, tanggal_akad, jam_akad, tempat_akad,
        status_berkas, payload_json, created_by_username, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seeds: Array<{
      user: RawUserRow | undefined;
      desa: string;
      nomor: string;
      suami: string;
      nikSuami: string;
      istri: string;
      nikIstri: string;
      wali: string;
      tglAkad: string;
      createdAt: string;
    }> = [
      {
        user: batealitUser,
        desa: 'Batealit',
        nomor: '474.2 / 141 / XI / 2026',
        suami: 'Ahmad Fauzi',
        nikSuami: '3320041205980001',
        istri: 'Nurul Hidayah',
        nikIstri: '3320046109000004',
        wali: 'Haji Abdul Karim',
        tglAkad: '2026-12-14',
        createdAt: '2026-11-18 09:15:00',
      },
      {
        user: mindahanUser,
        desa: 'Mindahan',
        nomor: '474.2 / 089 / XI / 2026',
        suami: 'Muhammad Rizqi Pratama',
        nikSuami: '3320041807970002',
        istri: 'Siti Fatimatuz Zahro',
        nikIstri: '3320045403990005',
        wali: 'Kiai Sholehuddin',
        tglAkad: '2026-12-21',
        createdAt: '2026-11-20 10:40:00',
      },
      {
        user: bawuUser,
        desa: 'Bawu',
        nomor: '474.2 / 112 / XI / 2026',
        suami: 'Bagus Setiawan',
        nikSuami: '3320042211960003',
        istri: 'Dewi Lestari',
        nikIstri: '3320046506010006',
        wali: 'Suharto',
        tglAkad: '2026-12-28',
        createdAt: '2026-11-22 08:25:00',
      },
    ];

    for (const s of seeds) {
      if (!s.user) continue;
      const demo = createDemoFilingForm({
        desaName: s.desa,
        namaPetinggi: s.user.nama_petinggi,
        gelarDepan: s.user.gelar_depan,
        gelarBelakang: s.user.gelar_belakang,
        nip: s.user.nip,
        jabatanPenandatangan: s.user.jabatan_penandatangan,
        kepalaLingkungan: s.user.kepala_lingkungan,
      });
      demo.akad.nomorSuratN1 = s.nomor;
      demo.akad.tanggalAkad = s.tglAkad;
      demo.suami.nama = s.suami;
      demo.suami.nik = s.nikSuami;
      demo.istri.nama = s.istri;
      demo.istri.nik = s.nikIstri;
      demo.waliNikah.nama = s.wali;
      demo.pemberiKuasa.nama = s.suami;
      demo.pemberiKuasa.nik = s.nikSuami;

      insertFiling.run(
        s.user.id,
        s.desa,
        s.nomor,
        s.suami,
        s.nikSuami,
        s.istri,
        s.nikIstri,
        s.wali,
        s.tglAkad,
        demo.akad.jamAkad,
        demo.akad.tempatAkad,
        'Lengkap',
        JSON.stringify(demo),
        s.user.username,
        s.createdAt,
      );
    }
  }
}

export function isAppInitialized(): boolean {
  const row = db
    .prepare("SELECT value FROM app_meta WHERE key = 'is_initialized'")
    .get() as { value: string } | undefined;
  return row?.value === '1';
}

export function markAppInitialized(): void {
  db.prepare(
    "INSERT INTO app_meta (key, value) VALUES ('is_initialized', '1') ON CONFLICT(key) DO UPDATE SET value = '1'",
  ).run();
}

export function getRawUserByUsername(username: string): RawUserRow | undefined {
  return db
    .prepare('SELECT * FROM users WHERE lower(username) = lower(?)')
    .get(username.trim()) as RawUserRow | undefined;
}

export function getRawUserById(id: number): RawUserRow | undefined {
  return db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id) as RawUserRow | undefined;
}

export function getAllVillageUsers(): UserProfile[] {
  const rows = db
    .prepare(`
      SELECT u.*, COUNT(f.id) as filing_count
      FROM users u
      LEFT JOIN marriage_filings f ON f.village_user_id = u.id
      WHERE u.role = 'village_admin'
      GROUP BY u.id
      ORDER BY u.desa_name ASC
    `)
    .all() as RawUserRow[];
  return rows.map(mapUserRow);
}
