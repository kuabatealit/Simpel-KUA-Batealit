import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WALI_NASAB_ORDER,
  buildOverviewSummary,
  buildScheduleMonthSummary,
  calculateIddah,
  describeAgeDifference,
  determineWaliNikah,
  evaluateCatinAge,
} from './marriageCalculators.ts';
import { createDemoFilingForm } from './formatting.ts';
import type { MarriageFilingRecord, UserProfile } from '../types/marriage.ts';

test('Iddah cerai mati calculates exactly 130 days Qamariyah and H+1 earliest akad date', () => {
  const res = calculateIddah({
    caseType: 'cerai_mati',
    eventDate: '2026-01-01',
    plannedAkadDate: '2026-05-10',
  });
  assert.equal(res.valid, true);
  assert.equal(res.totalDays, 130);
  assert.equal(res.iddahEndDateIso, '2026-05-11');
  assert.equal(res.earliestMarriageDateIso, '2026-05-12');
  assert.equal(res.masehiReferenceEndIso, '2026-05-11');
  assert.equal(res.akadCheck?.eligible, false);
  assert.equal(res.akadCheck?.remainingDays, 2);
});

test('Iddah cerai hidup haid requires at least 90 days and validates planned akad date', () => {
  const res = calculateIddah({
    caseType: 'cerai_hidup_haid',
    eventDate: '2026-03-01',
    plannedAkadDate: '2026-06-05',
  });
  assert.equal(res.valid, true);
  assert.equal(res.totalDays, 90);
  assert.equal(res.iddahEndDateIso, '2026-05-30');
  assert.equal(res.earliestMarriageDateIso, '2026-05-31');
  assert.equal(res.akadCheck?.eligible, true);
  assert.equal(res.akadCheck?.remainingDays, 0);
});

test('Iddah qabla al-dukhul has 0 days waiting period', () => {
  const res = calculateIddah({
    caseType: 'qabla_dukhul',
    eventDate: '2026-07-15',
    plannedAkadDate: '2026-07-15',
  });
  assert.equal(res.valid, true);
  assert.equal(res.totalDays, 0);
  assert.equal(res.earliestMarriageDateIso, '2026-07-15');
  assert.equal(res.akadCheck?.eligible, true);
});

test('Iddah cerai hamil ends on delivery date and allows akad H+1', () => {
  const res = calculateIddah({
    caseType: 'cerai_hamil',
    eventDate: '2026-08-20',
    plannedAkadDate: '2026-08-21',
  });
  assert.equal(res.valid, true);
  assert.equal(res.iddahEndDateIso, '2026-08-20');
  assert.equal(res.earliestMarriageDateIso, '2026-08-21');
  assert.equal(res.akadCheck?.eligible, true);
});

test('Catin age evaluation enforces UU 16/2019 (19y) and Model N5 (<21y) boundaries accurately', () => {
  // 1 day before 19th birthday
  const underage = evaluateCatinAge('2007-12-15', '2026-12-14');
  assert.equal(underage.valid, true);
  assert.equal(underage.age.years, 18);
  assert.equal(underage.meetsMinimumAge19, false);
  assert.equal(underage.requiresDispensationPA, true);
  assert.equal(underage.requiresModelN5, true);
  assert.equal(underage.daysUntil19, 1);

  // Exactly 19 years old -> valid under UU 16/2019, still needs Model N5 (< 21)
  const nineteen = evaluateCatinAge('2007-12-14', '2026-12-14');
  assert.equal(nineteen.meetsMinimumAge19, true);
  assert.equal(nineteen.requiresDispensationPA, false);
  assert.equal(nineteen.requiresModelN5, true);

  // Exactly 21 years old -> adult, Model N5 not required
  const twentyOne = evaluateCatinAge('2005-12-14', '2026-12-14');
  assert.equal(twentyOne.meetsMinimumAge19, true);
  assert.equal(twentyOne.requiresModelN5, false);

  const diffText = describeAgeDifference('1998-05-12', '2000-09-21');
  assert.match(diffText || '', /Calon Suami lebih tua 2 tahun 4 bulan/);
});

test('Wali Nikah engine contains 15 official tiers and handles Aqrab, Abad, Adhal, and Wali Hakim', () => {
  assert.equal(WALI_NASAB_ORDER.length, 15);

  // Case 1: Ayah Kandung meets conditions -> Wali Nasab Aqrab
  const aqrab = determineWaliNikah({
    anakLuarNikah: false,
    waliSedangIhram: false,
    statuses: { ayah_kandung: 'memenuhi_syarat' },
  });
  assert.equal(aqrab.waliType, 'wali_nasab_aqrab');
  assert.equal(aqrab.assignedRank, 1);
  assert.equal(aqrab.assignedHubunganForForm, 'Ayah Kandung');

  // Case 2: Ayah meninggal, Kakek meninggal, Buyut tidak ada -> shifts to Saudara Laki-Laki Sekandung (Rank 4)
  const abad = determineWaliNikah({
    anakLuarNikah: false,
    waliSedangIhram: false,
    statuses: {
      ayah_kandung: 'tidak_ada',
      kakek_dari_ayah: 'tidak_ada',
      buyut_dari_ayah: 'tidak_ada',
      saudara_lk_sekandung: 'memenuhi_syarat',
    },
  });
  assert.equal(abad.waliType, 'wali_nasab_abad');
  assert.equal(abad.assignedRank, 4);
  assert.equal(abad.skippedTrace.length, 3);

  // Case 3: Ayah adhal -> directly Wali Hakim (does NOT shift to Kakek/Saudara)
  const adhal = determineWaliNikah({
    anakLuarNikah: false,
    waliSedangIhram: false,
    statuses: {
      ayah_kandung: 'adhal',
      kakek_dari_ayah: 'memenuhi_syarat',
    },
  });
  assert.equal(adhal.waliType, 'wali_hakim');
  assert.equal(adhal.assignedHubunganForForm, 'Wali Hakim');

  // Case 4: Anak luar nikah -> directly Wali Hakim
  const luarNikah = determineWaliNikah({
    anakLuarNikah: true,
    waliSedangIhram: false,
    statuses: { ayah_kandung: 'memenuhi_syarat' },
  });
  assert.equal(luarNikah.waliType, 'wali_hakim');

  // Case 5: All absent -> Wali Hakim
  const noWali = determineWaliNikah({
    anakLuarNikah: false,
    waliSedangIhram: false,
    statuses: {},
  });
  assert.equal(noWali.waliType, 'wali_hakim');
});

test('Wedding schedule summary detects time conflicts and computes monthly & upcoming counts', () => {
  const basePayload = createDemoFilingForm({ desaName: 'Batealit' });
  const makeRec = (id: number, date: string, jam: string, desa: string): MarriageFilingRecord => ({
    id,
    villageUserId: 2,
    desaName: desa,
    nomorSuratN1: `474.2 / ${id} / XII / 2026`,
    namaSuami: `Suami ${id}`,
    nikSuami: '3320041205980001',
    namaIstri: `Istri ${id}`,
    nikIstri: '3320046109000004',
    namaWali: 'Wali',
    tanggalAkad: date,
    jamAkad: jam,
    tempatAkad: `Desa ${desa}`,
    statusBerkas: 'Lengkap',
    payload: basePayload,
    createdByUsername: 'desa_batealit',
    createdAt: '2026-11-20 08:00:00',
    updatedAt: '2026-11-20 08:00:00',
  });

  const filings = [
    makeRec(1, '2026-12-14', '09.00 WIB', 'Batealit'),
    makeRec(2, '2026-12-14', '09.00 WIB', 'Mindahan'),
    makeRec(3, '2026-11-10', '08.00 WIB', 'Bawu'),
  ];

  const summary = buildScheduleMonthSummary(filings, 2026, 12, '2026-11-25');
  assert.equal(summary.totalInMonth, 2);
  assert.equal(summary.upcomingCount, 2);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.conflictSlotCount, 1);
  assert.equal(summary.monthEvents[0].hasTimeConflict, true);
  assert.equal(summary.monthEvents[0].timingLabel, 'H-19');
});

test('Overview summary aggregates all filing statuses, next wedding, and 11-village breakdown', () => {
  const basePayload = createDemoFilingForm({ desaName: 'Batealit' });
  const filings: MarriageFilingRecord[] = [
    {
      id: 1,
      villageUserId: 2,
      desaName: 'Batealit',
      nomorSuratN1: '474.2 / 001 / XII / 2026',
      namaSuami: 'Ahmad Fauzi',
      nikSuami: '3320041205980001',
      namaIstri: 'Nurul Hidayah',
      nikIstri: '3320046109000004',
      namaWali: 'Abdul Karim',
      tanggalAkad: '2026-12-14',
      jamAkad: '09.00 WIB',
      tempatAkad: 'Desa Batealit',
      statusBerkas: 'Lengkap',
      payload: basePayload,
      createdByUsername: 'desa_batealit',
      createdAt: '2026-11-20 08:00:00',
      updatedAt: '2026-11-20 08:00:00',
    },
    {
      id: 2,
      villageUserId: 3,
      desaName: 'Mindahan',
      nomorSuratN1: '474.2 / 002 / XII / 2026',
      namaSuami: 'Rizqi Pratama',
      nikSuami: '3320041205980002',
      namaIstri: 'Siti Zahro',
      nikIstri: '3320046109000005',
      namaWali: 'Sholehuddin',
      tanggalAkad: '2026-12-21',
      jamAkad: '09.00 WIB',
      tempatAkad: 'Desa Mindahan',
      statusBerkas: 'Draft',
      payload: basePayload,
      createdByUsername: 'desa_mindahan',
      createdAt: '2026-11-22 09:00:00',
      updatedAt: '2026-11-22 09:00:00',
    },
  ];

  const villages: UserProfile[] = [
    {
      id: 2,
      username: 'desa_batealit',
      role: 'village_admin',
      desaName: 'Batealit',
      namaPetinggi: 'Muhammad Noor',
      gelarDepan: '',
      gelarBelakang: 'S.Pd.',
      nip: '',
      jabatanPenandatangan: 'Kepala Desa',
      kepalaLingkungan: 'Subiyanto',
      alamatKantor: 'Balai Desa Batealit',
      isActive: true,
    },
    {
      id: 3,
      username: 'desa_mindahan',
      role: 'village_admin',
      desaName: 'Mindahan',
      namaPetinggi: 'Abdul Wahid',
      gelarDepan: 'H.',
      gelarBelakang: 'S.Pd.I.',
      nip: '',
      jabatanPenandatangan: 'Kepala Desa',
      kepalaLingkungan: 'Darmaji',
      alamatKantor: 'Balai Desa Mindahan',
      isActive: true,
    },
    {
      id: 4,
      username: 'desa_bawu',
      role: 'village_admin',
      desaName: 'Bawu',
      namaPetinggi: 'Kuzaeni',
      gelarDepan: 'H.',
      gelarBelakang: 'S.Ag.',
      nip: '',
      jabatanPenandatangan: 'Kepala Desa',
      kepalaLingkungan: 'Supriyadi',
      alamatKantor: 'Balai Desa Bawu',
      isActive: false,
    },
  ];

  const overview = buildOverviewSummary(filings, villages, '2026-11-25');
  assert.equal(overview.totalFilings, 2);
  assert.equal(overview.lengkapCount, 1);
  assert.equal(overview.draftCount, 1);
  assert.equal(overview.upcomingEvents.length, 2);
  assert.equal(overview.nextWedding?.record.namaSuami, 'Ahmad Fauzi');
  assert.equal(overview.activeVillageCount, 2);
  assert.equal(overview.totalVillageCount, 3);
  assert.equal(overview.villageBreakdown.length, 3);
});

