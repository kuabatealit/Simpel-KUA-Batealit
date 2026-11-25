import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCsvRecap,
  capitalizeEachWord,
  composeFullAddress,
  createDemoFilingForm,
  formatIndonesianDate,
  formatPetinggiDisplay,
  sanitizeNik,
  validateFilingForm,
  validateNik,
} from './formatting';
import type { AddressData, MarriageFilingRecord } from '../types/marriage';

test('capitalizeEachWord capitalizes each word while preserving RT and RW uppercase', () => {
  assert.equal(capitalizeEachWord('ahmad fauzi'), 'Ahmad Fauzi');
  assert.equal(
    capitalizeEachWord('dukuh krajan rt 02 rw 05 desa batealit'),
    'Dukuh Krajan RT 02 RW 05 Desa Batealit',
  );
  assert.equal(
    capitalizeEachWord('JL. RAYA BATEALIT RT 001 / RW 003'),
    'Jl. Raya Batealit RT 001 / RW 003',
  );
  assert.equal(capitalizeEachWord(''), '');
});

test('sanitizeNik strips non-digits and enforces max 16 digits', () => {
  assert.equal(sanitizeNik('3320-0412-0598-0001'), '3320041205980001');
  assert.equal(sanitizeNik('33200412059800019999'), '3320041205980001');
  assert.equal(sanitizeNik('abc123def'), '123');
});

test('validateNik requires exactly 16 digits (not less, not more)', () => {
  assert.equal(validateNik('3320041205980001').valid, true);
  assert.equal(validateNik('332004120598000').valid, false); // 15 digits
  assert.equal(validateNik('33200412059800012').valid, false); // 17 digits
  assert.equal(validateNik('').valid, false);
  assert.equal(validateNik('', false).valid, true);
});

test('composeFullAddress composes cascading dropdowns + manual RT/RW + manual Dukuh', () => {
  const addr: AddressData = {
    provinsi: 'Jawa Tengah',
    kabupaten: 'Kabupaten Jepara',
    kecamatan: 'Batealit',
    desa: 'Mindahan Kidul',
    rt: '02',
    rw: '05',
    dukuhJalan: 'dukuh krajan',
    alamatLengkap: '',
  };
  assert.equal(
    composeFullAddress(addr),
    'Dukuh Krajan RT 02 RW 05, Desa Mindahan Kidul, Kecamatan Batealit, Kabupaten Jepara, Provinsi Jawa Tengah',
  );
});

test('formatPetinggiDisplay combines titles and name accurately', () => {
  assert.equal(
    formatPetinggiDisplay({
      gelarDepan: 'H.',
      namaPetinggi: 'Ahmad Subagyo',
      gelarBelakang: 'S.H., M.H.',
    }),
    'H. Ahmad Subagyo, S.H., M.H.',
  );
  assert.equal(
    formatPetinggiDisplay({
      gelarDepan: '',
      namaPetinggi: 'Sutrisno',
      gelarBelakang: 'S.Pd.',
    }),
    'Sutrisno, S.Pd.',
  );
});

test('formatIndonesianDate formats ISO date into Indonesian text', () => {
  assert.equal(formatIndonesianDate('2026-12-20'), '20 Desember 2026');
  assert.equal(formatIndonesianDate('2026-01-05'), '05 Januari 2026');
});

test('validateFilingForm catches invalid NIK lengths and accepts valid demo form', () => {
  const demo = createDemoFilingForm({ desaName: 'Batealit' });
  assert.deepEqual(validateFilingForm(demo), {});

  demo.suami.nik = '332004120598'; // only 12 digits
  const errors = validateFilingForm(demo);
  assert.ok(errors['suami.nik']);
});

test('buildCsvRecap preserves 16-digit NIK and neutralizes formula injection', () => {
  const demo = createDemoFilingForm({ desaName: 'Batealit' });
  const rec: MarriageFilingRecord = {
    id: 1,
    villageUserId: 2,
    desaName: 'Batealit',
    nomorSuratN1: '=CMD()',
    namaSuami: 'Ahmad Fauzi',
    nikSuami: '3320041205980001',
    namaIstri: 'Nurul Hidayah',
    nikIstri: '3320046109000004',
    namaWali: 'Haji Abdul Karim',
    tanggalAkad: '2026-12-20',
    jamAkad: '09.00 WIB',
    tempatAkad: 'Desa Mindahan',
    statusBerkas: 'Lengkap',
    payload: demo,
    createdByUsername: 'desa_batealit',
    createdAt: '2026-11-22T08:00:00Z',
    updatedAt: '2026-11-22T08:00:00Z',
  };
  const csv = buildCsvRecap([rec]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('="3320041205980001"'));
  assert.ok(csv.includes(`"'=CMD()"`));
});
