import type { MarriageFilingRecord, UserProfile } from '../types/marriage.ts';

// ============================================================================
// 1. KALKULATOR MASA IDDAH (KHI Pasal 153 & Fikih Munakahat)
// ============================================================================

export type IddahCaseType =
  | 'cerai_mati'
  | 'cerai_hidup_haid'
  | 'cerai_hidup_tidak_haid'
  | 'cerai_hamil'
  | 'qabla_dukhul';

export interface IddahInput {
  caseType: IddahCaseType;
  /** Tanggal wafat suami / tanggal akta cerai inkracht / tanggal melahirkan (YYYY-MM-DD) */
  eventDate: string;
  /** Opsional: Rencana tanggal akad nikah untuk dicek kelayakannya (YYYY-MM-DD) */
  plannedAkadDate?: string;
}

export interface IddahResult {
  valid: boolean;
  error?: string;
  caseLabel: string;
  durationSummary: string;
  legalBasis: string;
  eventDateIso: string;
  /** Tanggal berakhir masa iddah (hari terakhir iddah) */
  iddahEndDateIso: string;
  /** Tanggal paling awal diperbolehkan akad nikah (H+1 setelah iddah selesai) */
  earliestMarriageDateIso: string;
  /** Khusus cerai mati: tanggal pembanding kalender Masehi (+4 bulan +10 hari) */
  masehiReferenceEndIso?: string;
  totalDays: number;
  notes: string[];
  akadCheck?: {
    plannedAkadDateIso: string;
    eligible: boolean;
    remainingDays: number;
    message: string;
  };
}

export function parseIsoDateUtc(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [y, m, d] = iso.trim().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function toIsoDateUtc(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysUtc(dt: Date, days: number): Date {
  const next = new Date(dt.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addMonthsAndDaysUtc(dt: Date, months: number, days: number): Date {
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + months;
  const d = dt.getUTCDate();
  const targetYear = y + Math.floor(m / 12);
  const targetMonth = ((m % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const clampedDay = Math.min(d, lastDayOfTargetMonth);
  const shifted = new Date(Date.UTC(targetYear, targetMonth, clampedDay));
  return addDaysUtc(shifted, days);
}

export function diffDaysUtc(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

export function calculateIddah(input: IddahInput): IddahResult {
  const eventDt = parseIsoDateUtc(input.eventDate);
  if (!eventDt) {
    return {
      valid: false,
      error: 'Masukkan tanggal kejadian yang valid (format YYYY-MM-DD).',
      caseLabel: '',
      durationSummary: '',
      legalBasis: '',
      eventDateIso: input.eventDate,
      iddahEndDateIso: '',
      earliestMarriageDateIso: '',
      totalDays: 0,
      notes: [],
    };
  }

  let caseLabel = '';
  let durationSummary = '';
  let legalBasis = '';
  let totalDays = 0;
  let endDt: Date = eventDt;
  let earliestDt: Date = eventDt;
  let masehiReferenceEndIso: string | undefined;
  const notes: string[] = [];

  switch (input.caseType) {
    case 'cerai_mati': {
      caseLabel = 'Cerai Mati (Suami Wafat, Tidak Hamil)';
      durationSummary = '4 Bulan 10 Hari (130 Hari Qamariyah)';
      legalBasis = 'KHI Pasal 153 ayat (2) huruf a & QS. Al-Baqarah: 234';
      totalDays = 130;
      endDt = addDaysUtc(eventDt, 130);
      earliestDt = addDaysUtc(endDt, 1);
      const masehiEnd = addMonthsAndDaysUtc(eventDt, 4, 10);
      masehiReferenceEndIso = toIsoDateUtc(masehiEnd);
      notes.push(
        'Dihitung 130 hari sejak tanggal wafat suami berdasarkan pedoman bulan Qamariyah (1 bulan = 30 hari → 4 × 30 + 10 = 130 hari).',
      );
      notes.push(
        'Berlaku baik bagi istri yang sudah maupun belum berhubungan suami istri (qabla al-dukhul).',
      );
      notes.push(
        'Tanggal Masehi (+4 bulan +10 hari) ditampilkan sebagai pembanding administratif kehati-hatian.',
      );
      break;
    }

    case 'cerai_hidup_haid': {
      caseLabel = 'Cerai Hidup — Masih Mengalami Haid (Ba\'da Dukhul)';
      durationSummary = '3 Kali Suci (3 Quru\') — Minimal 90 Hari';
      legalBasis = 'KHI Pasal 153 ayat (2) huruf b & QS. Al-Baqarah: 228';
      totalDays = 90;
      endDt = addDaysUtc(eventDt, 90);
      earliestDt = addDaysUtc(endDt, 1);
      notes.push(
        'Dihitung sejak putusan Pengadilan Agama berkekuatan hukum tetap (Inkracht) sebagaimana tercantum pada Akta Cerai.',
      );
      notes.push(
        'Secara administratif KHI mensyaratkan sekurang-kurangnya 90 hari, dan secara syar\'i catin wajib memastikan telah selesai 3 kali suci.',
      );
      break;
    }

    case 'cerai_hidup_tidak_haid': {
      caseLabel = 'Cerai Hidup — Tidak Haid / Menopause (Ba\'da Dukhul)';
      durationSummary = '90 Hari (3 Bulan Qamariyah)';
      legalBasis = 'KHI Pasal 153 ayat (2) huruf b & QS. At-Talaq: 4';
      totalDays = 90;
      endDt = addDaysUtc(eventDt, 90);
      earliestDt = addDaysUtc(endDt, 1);
      notes.push(
        'Berlaku bagi perempuan yang tidak lagi haid (menopause / ayisah) atau belum pernah haid.',
      );
      notes.push(
        'Dihitung 90 hari sejak tanggal putusan Pengadilan Agama berkekuatan hukum tetap (Inkracht).',
      );
      break;
    }

    case 'cerai_hamil': {
      caseLabel = 'Cerai Hidup / Cerai Mati dalam Keadaan Hamil';
      durationSummary = 'Sampai Melahirkan Anak yang Dikandung';
      legalBasis = 'KHI Pasal 153 ayat (2) huruf c & d, QS. At-Talaq: 4';
      totalDays = 0;
      endDt = eventDt;
      earliestDt = addDaysUtc(eventDt, 1);
      notes.push(
        'Masa iddah perempuan hamil berakhir tepat pada saat melahirkan, baik karena cerai hidup maupun cerai mati.',
      );
      notes.push(
        'Tanggal yang dimasukkan adalah tanggal aktual/perkiraan melahirkan. Akad nikah boleh dilaksanakan mulai keesokan harinya (H+1).',
      );
      break;
    }

    case 'qabla_dukhul': {
      caseLabel = 'Cerai Hidup Sebelum Hubungan Suami Istri (Qabla al-Dukhul)';
      durationSummary = 'Tidak Ada Masa Iddah (0 Hari)';
      legalBasis = 'KHI Pasal 153 ayat (3) & QS. Al-Ahzab: 49';
      totalDays = 0;
      endDt = eventDt;
      earliestDt = eventDt;
      notes.push(
        'Perempuan yang dicerai hidup sebelum pernah berhubungan suami istri tidak memiliki masa iddah.',
      );
      notes.push(
        'Akad nikah baru dapat dilaksanakan segera setelah Akta Cerai / putusan inkracht resmi diterbitkan Pengadilan Agama.',
      );
      break;
    }
  }

  const result: IddahResult = {
    valid: true,
    caseLabel,
    durationSummary,
    legalBasis,
    eventDateIso: toIsoDateUtc(eventDt),
    iddahEndDateIso: toIsoDateUtc(endDt),
    earliestMarriageDateIso: toIsoDateUtc(earliestDt),
    masehiReferenceEndIso,
    totalDays,
    notes,
  };

  if (input.plannedAkadDate) {
    const akadDt = parseIsoDateUtc(input.plannedAkadDate);
    if (akadDt) {
      const remainingDays = diffDaysUtc(akadDt, earliestDt);
      const eligible = remainingDays <= 0;
      result.akadCheck = {
        plannedAkadDateIso: toIsoDateUtc(akadDt),
        eligible,
        remainingDays: Math.max(0, remainingDays),
        message: eligible
          ? 'Masa iddah telah selesai pada rencana tanggal akad — memenuhi syarat untuk menikah.'
          : `Masih dalam masa iddah. Rencana akad kurang ${remainingDays} hari lagi dari batas minimal boleh menikah.`,
      };
    }
  }

  return result;
}

// ============================================================================
// 2. KALKULATOR UMUR CATIN (UU No. 16 Tahun 2019 & UU No. 1 Tahun 1974 Pasal 6)
// ============================================================================

export interface ExactAge {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export interface CatinAgeEvaluation {
  valid: boolean;
  error?: string;
  birthDateIso: string;
  referenceDateIso: string;
  age: ExactAge;
  meetsMinimumAge19: boolean;
  requiresDispensationPA: boolean;
  requiresModelN5: boolean;
  nineteenthBirthdayIso: string;
  twentyFirstBirthdayIso: string;
  daysUntil19: number;
  statusLabel: string;
  n5Label: string;
}

export function calculateExactAge(
  birthDateIso: string,
  referenceDateIso: string,
): ExactAge | null {
  const birth = parseIsoDateUtc(birthDateIso);
  const ref = parseIsoDateUtc(referenceDateIso);
  if (!birth || !ref || ref.getTime() < birth.getTime()) return null;

  let years = ref.getUTCFullYear() - birth.getUTCFullYear();
  let months = ref.getUTCMonth() - birth.getUTCMonth();
  let days = ref.getUTCDate() - birth.getUTCDate();

  if (days < 0) {
    const prevMonthLastDay = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 0),
    ).getUTCDate();
    days += prevMonthLastDay;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years,
    months,
    days,
    totalDays: diffDaysUtc(birth, ref),
  };
}

export function evaluateCatinAge(
  birthDateIso: string,
  referenceDateIso: string,
): CatinAgeEvaluation {
  const birth = parseIsoDateUtc(birthDateIso);
  const ref = parseIsoDateUtc(referenceDateIso);

  if (!birth || !ref) {
    return {
      valid: false,
      error: 'Masukkan tanggal lahir dan tanggal patokan yang valid.',
      birthDateIso,
      referenceDateIso,
      age: { years: 0, months: 0, days: 0, totalDays: 0 },
      meetsMinimumAge19: false,
      requiresDispensationPA: false,
      requiresModelN5: false,
      nineteenthBirthdayIso: '',
      twentyFirstBirthdayIso: '',
      daysUntil19: 0,
      statusLabel: 'Belum dihitung',
      n5Label: 'Belum dihitung',
    };
  }

  if (ref.getTime() < birth.getTime()) {
    return {
      valid: false,
      error: 'Tanggal patokan (akad/hari ini) tidak boleh lebih awal dari tanggal lahir.',
      birthDateIso,
      referenceDateIso,
      age: { years: 0, months: 0, days: 0, totalDays: 0 },
      meetsMinimumAge19: false,
      requiresDispensationPA: false,
      requiresModelN5: false,
      nineteenthBirthdayIso: '',
      twentyFirstBirthdayIso: '',
      daysUntil19: 0,
      statusLabel: 'Tanggal tidak valid',
      n5Label: 'Tanggal tidak valid',
    };
  }

  const age = calculateExactAge(birthDateIso, referenceDateIso)!;
  const nineteenth = addMonthsAndDaysUtc(birth, 19 * 12, 0);
  const twentyFirst = addMonthsAndDaysUtc(birth, 21 * 12, 0);
  const meetsMinimumAge19 = age.years >= 19;
  const requiresDispensationPA = !meetsMinimumAge19;
  const requiresModelN5 = age.years < 21;
  const daysUntil19 = Math.max(0, diffDaysUtc(ref, nineteenth));

  return {
    valid: true,
    birthDateIso: toIsoDateUtc(birth),
    referenceDateIso: toIsoDateUtc(ref),
    age,
    meetsMinimumAge19,
    requiresDispensationPA,
    requiresModelN5,
    nineteenthBirthdayIso: toIsoDateUtc(nineteenth),
    twentyFirstBirthdayIso: toIsoDateUtc(twentyFirst),
    daysUntil19,
    statusLabel: meetsMinimumAge19
      ? 'Memenuhi Batas Usia Minimal (≥ 19 Tahun)'
      : 'Belum Cukup Umur (< 19 Tahun) — Wajib Dispensasi Kawin PA',
    n5Label: requiresModelN5
      ? 'Wajib Surat Izin Orang Tua (Formulir Model N5)'
      : 'Dewasa Penuh (≥ 21 Tahun) — Model N5 Tidak Wajib',
  };
}

export function describeAgeDifference(
  suamiDobIso: string,
  istriDobIso: string,
): string | null {
  const s = parseIsoDateUtc(suamiDobIso);
  const i = parseIsoDateUtc(istriDobIso);
  if (!s || !i) return null;
  if (s.getTime() === i.getTime()) return 'Calon Suami dan Calon Istri lahir pada tanggal yang sama.';

  const olderIsSuami = s.getTime() < i.getTime();
  const diff = olderIsSuami
    ? calculateExactAge(suamiDobIso, istriDobIso)
    : calculateExactAge(istriDobIso, suamiDobIso);
  if (!diff) return null;

  const parts: string[] = [];
  if (diff.years > 0) parts.push(`${diff.years} tahun`);
  if (diff.months > 0) parts.push(`${diff.months} bulan`);
  if (diff.days > 0 && diff.years === 0) parts.push(`${diff.days} hari`);
  const span = parts.join(' ') || '0 hari';
  return olderIsSuami
    ? `Calon Suami lebih tua ${span} dari Calon Istri.`
    : `Calon Istri lebih tua ${span} dari Calon Suami.`;
}

// ============================================================================
// 3. KALKULATOR PENENTUAN WALI NIKAH (KHI Pasal 20–23 & PMA No. 20/2019)
// ============================================================================

export type WaliCandidateStatus =
  | 'memenuhi_syarat'
  | 'tidak_ada'
  | 'ghaib_mafqud'
  | 'halangan_syari'
  | 'adhal'
  | 'jarak_jauh_tanpa_taukil';

export interface WaliNasabTier {
  rank: number;
  id: string;
  group: string;
  label: string;
  shortLabel: string;
}

export const WALI_NASAB_ORDER: WaliNasabTier[] = [
  {
    rank: 1,
    id: 'ayah_kandung',
    group: 'Kelompok I — Garis Lurus ke Atas',
    label: 'Ayah Kandung',
    shortLabel: 'Ayah Kandung',
  },
  {
    rank: 2,
    id: 'kakek_dari_ayah',
    group: 'Kelompok I — Garis Lurus ke Atas',
    label: 'Kakek (Ayah dari Ayah)',
    shortLabel: 'Kakek (dari Ayah)',
  },
  {
    rank: 3,
    id: 'buyut_dari_ayah',
    group: 'Kelompok I — Garis Lurus ke Atas',
    label: 'Buyut (Ayah dari Kakek jalur Ayah)',
    shortLabel: 'Buyut (jalur Ayah)',
  },
  {
    rank: 4,
    id: 'saudara_lk_sekandung',
    group: 'Kelompok II — Saudara Laki-Laki & Keturunan',
    label: 'Saudara Laki-Laki Sekandung (Seayah & Seibu)',
    shortLabel: 'Saudara Laki-Laki Sekandung',
  },
  {
    rank: 5,
    id: 'saudara_lk_seayah',
    group: 'Kelompok II — Saudara Laki-Laki & Keturunan',
    label: 'Saudara Laki-Laki Seayah',
    shortLabel: 'Saudara Laki-Laki Seayah',
  },
  {
    rank: 6,
    id: 'anak_lk_saudara_sekandung',
    group: 'Kelompok II — Saudara Laki-Laki & Keturunan',
    label: 'Anak Laki-Laki dari Saudara Laki-Laki Sekandung',
    shortLabel: 'Keponakan (Anak Sdr. Sekandung)',
  },
  {
    rank: 7,
    id: 'anak_lk_saudara_seayah',
    group: 'Kelompok II — Saudara Laki-Laki & Keturunan',
    label: 'Anak Laki-Laki dari Saudara Laki-Laki Seayah',
    shortLabel: 'Keponakan (Anak Sdr. Seayah)',
  },
  {
    rank: 8,
    id: 'paman_sekandung',
    group: 'Kelompok III — Paman (Saudara Ayah) & Keturunan',
    label: 'Paman Sekandung (Saudara Laki-Laki Sekandung Ayah)',
    shortLabel: 'Paman Sekandung',
  },
  {
    rank: 9,
    id: 'paman_seayah',
    group: 'Kelompok III — Paman (Saudara Ayah) & Keturunan',
    label: 'Paman Seayah (Saudara Laki-Laki Seayah Ayah)',
    shortLabel: 'Paman Seayah',
  },
  {
    rank: 10,
    id: 'anak_lk_paman_sekandung',
    group: 'Kelompok III — Paman (Saudara Ayah) & Keturunan',
    label: 'Anak Laki-Laki dari Paman Sekandung (Sepupu)',
    shortLabel: 'Sepupu (Anak Paman Sekandung)',
  },
  {
    rank: 11,
    id: 'anak_lk_paman_seayah',
    group: 'Kelompok III — Paman (Saudara Ayah) & Keturunan',
    label: 'Anak Laki-Laki dari Paman Seayah (Sepupu)',
    shortLabel: 'Sepupu (Anak Paman Seayah)',
  },
  {
    rank: 12,
    id: 'saudara_lk_sekandung_kakek',
    group: 'Kelompok IV — Paman Kakek & Keturunan',
    label: 'Saudara Laki-Laki Sekandung Kakek',
    shortLabel: 'Paman Kakek Sekandung',
  },
  {
    rank: 13,
    id: 'saudara_lk_seayah_kakek',
    group: 'Kelompok IV — Paman Kakek & Keturunan',
    label: 'Saudara Laki-Laki Seayah Kakek',
    shortLabel: 'Paman Kakek Seayah',
  },
  {
    rank: 14,
    id: 'anak_lk_paman_kakek_sekandung',
    group: 'Kelompok IV — Paman Kakek & Keturunan',
    label: 'Anak Laki-Laki dari Saudara Sekandung Kakek',
    shortLabel: 'Anak Paman Kakek Sekandung',
  },
  {
    rank: 15,
    id: 'anak_lk_paman_kakek_seayah',
    group: 'Kelompok IV — Paman Kakek & Keturunan',
    label: 'Anak Laki-Laki dari Saudara Seayah Kakek',
    shortLabel: 'Anak Paman Kakek Seayah',
  },
];

export const WALI_STATUS_LABELS: Record<WaliCandidateStatus, string> = {
  memenuhi_syarat: 'Ada & Memenuhi Syarat',
  tidak_ada: 'Meninggal / Tidak Ada',
  ghaib_mafqud: 'Ghaib / Mafqud (Tidak Diketahui)',
  halangan_syari: 'Berhalangan Syar\'i (Non-Muslim / Belum Baligh / Tidak Berakal)',
  adhal: 'Adhal (Enggan Menikahkan)',
  jarak_jauh_tanpa_taukil: 'Jarak ≥ 2 Marhalah (±90 km) & Tidak Taukil',
};

export interface WaliDeterminationInput {
  /** Apakah calon istri anak di luar nikah / nasab hanya kepada ibu? */
  anakLuarNikah: boolean;
  /** Apakah wali yang berhak sedang ihram haji/umrah? */
  waliSedangIhram: boolean;
  /** Peta status per ID urutan wali nasab; yang tidak diisi dianggap 'tidak_ada' */
  statuses: Record<string, WaliCandidateStatus>;
}

export interface WaliDeterminationResult {
  waliType: 'wali_nasab_aqrab' | 'wali_nasab_abad' | 'wali_hakim';
  waliTypeLabel: string;
  assignedTitle: string;
  assignedHubunganForForm: string;
  assignedRank: number | null;
  reason: string;
  legalBasis: string;
  skippedTrace: Array<{ rank: number; label: string; statusLabel: string }>;
  administrativeNotes: string[];
}

export function determineWaliNikah(
  input: WaliDeterminationInput,
): WaliDeterminationResult {
  if (input.anakLuarNikah) {
    return {
      waliType: 'wali_hakim',
      waliTypeLabel: 'Wali Hakim',
      assignedTitle: 'Kepala KUA Kecamatan Batealit (Wali Hakim)',
      assignedHubunganForForm: 'Wali Hakim',
      assignedRank: null,
      reason:
        'Calon pengantin perempuan tidak memiliki hubungan nasab syar\'i dengan ayah biologisnya (nasab hanya kepada ibu), sehingga hak perwalian langsung beralih kepada Wali Hakim.',
      legalBasis: 'KHI Pasal 23 & PMA No. 20 Tahun 2019 Pasal 13',
      skippedTrace: [],
      administrativeNotes: [
        'Lampirkan Surat Pernyataan / Keterangan terkait status nasab sesuai pemeriksaan KUA.',
        'Kepala KUA bertindak sebagai Wali Hakim secara resmi.',
      ],
    };
  }

  const skippedTrace: Array<{ rank: number; label: string; statusLabel: string }> = [];

  for (const tier of WALI_NASAB_ORDER) {
    const status: WaliCandidateStatus = input.statuses[tier.id] || 'tidak_ada';

    if (status === 'adhal') {
      skippedTrace.push({
        rank: tier.rank,
        label: tier.label,
        statusLabel: WALI_STATUS_LABELS[status],
      });
      return {
        waliType: 'wali_hakim',
        waliTypeLabel: 'Wali Hakim (Karena Wali Adhal)',
        assignedTitle: 'Kepala KUA Kecamatan Batealit (Wali Hakim)',
        assignedHubunganForForm: 'Wali Hakim',
        assignedRank: null,
        reason: `${tier.label} (Urutan ke-${tier.rank}) sebagai wali terdekat bersikap adhal (enggan menikahkan). Dalam fikih Syafi\'i dan KHI, wali adhal tidak berpindah ke wali ab'ad, melainkan langsung beralih ke Wali Hakim setelah ada penetapan Pengadilan Agama.`,
        legalBasis: 'KHI Pasal 23 ayat (2) & PMA No. 20 Tahun 2019 Pasal 13 ayat (2)',
        skippedTrace,
        administrativeNotes: [
          'Wajib melampirkan Salinan Penetapan Wali Adhal dari Pengadilan Agama.',
          'Hak perwalian tidak boleh dialihkan ke wali urutan di bawahnya tanpa dasar syar\'i.',
        ],
      };
    }

    if (status === 'ghaib_mafqud' || status === 'jarak_jauh_tanpa_taukil') {
      skippedTrace.push({
        rank: tier.rank,
        label: tier.label,
        statusLabel: WALI_STATUS_LABELS[status],
      });
      return {
        waliType: 'wali_hakim',
        waliTypeLabel: 'Wali Hakim (Wali Aqrab Ghaib / Masafatul Qashri)',
        assignedTitle: 'Kepala KUA Kecamatan Batealit (Wali Hakim)',
        assignedHubunganForForm: 'Wali Hakim',
        assignedRank: null,
        reason: `${tier.label} (Urutan ke-${tier.rank}) masih hidup dan memenuhi syarat, namun ${
          status === 'ghaib_mafqud'
            ? 'tidak diketahui alamat/keberadaannya (mafqud)'
            : 'berada di luar jarak 2 marhalah (±90 km) tanpa taukil wali'
        }. Sesuai PMA Pencatatan Nikah & mazhab Syafi\'i, hak perwalian beralih kepada Wali Hakim.`,
        legalBasis: 'KHI Pasal 23 ayat (1) & PMA No. 20 Tahun 2019 Pasal 13',
        skippedTrace,
        administrativeNotes: [
          status === 'ghaib_mafqud'
            ? 'Lampirkan Surat Keterangan Ghaib / Mafqud dari Kepala Desa/Lurah setempat.'
            : 'Jika wali masih dapat dihubungi, dianjurkan membuat Surat Taukil Wali Bil Kitabah terlebih dahulu di KUA domisili wali.',
          'Apabila taukil tidak memungkinkan, Kepala KUA bertindak sebagai Wali Hakim.',
        ],
      };
    }

    if (status === 'memenuhi_syarat') {
      if (input.waliSedangIhram) {
        skippedTrace.push({
          rank: tier.rank,
          label: tier.label,
          statusLabel: 'Sedang Ihram Haji / Umrah',
        });
        return {
          waliType: 'wali_hakim',
          waliTypeLabel: 'Wali Hakim (Wali Aqrab Sedang Ihram)',
          assignedTitle: 'Kepala KUA Kecamatan Batealit (Wali Hakim)',
          assignedHubunganForForm: 'Wali Hakim',
          assignedRank: null,
          reason: `${tier.label} (Urutan ke-${tier.rank}) sedang melaksanakan ihram haji/umrah sehingga terhalang menikahkan sementara. Menurut mazhab Syafi\'i & PMA, perwalian beralih ke Wali Hakim (bukan wali ab'ad).`,
          legalBasis: 'PMA No. 20 Tahun 2019 Pasal 13 & Fikih Syafi\'iyah',
          skippedTrace,
          administrativeNotes: [
            'Alternatif terbaik: menunggu wali selesai tahallul jika waktu akad dapat disesuaikan.',
            'Jika akad mendesak dilaksanakan saat wali masih ihram, Kepala KUA bertindak sebagai Wali Hakim.',
          ],
        };
      }

      const isAqrab = tier.rank === 1;
      return {
        waliType: isAqrab ? 'wali_nasab_aqrab' : 'wali_nasab_abad',
        waliTypeLabel: isAqrab
          ? 'Wali Nasab (Aqrab — Urutan Pertama)'
          : `Wali Nasab (Perpindahan ke Urutan ke-${tier.rank})`,
        assignedTitle: `${tier.label} (Urutan ke-${tier.rank})`,
        assignedHubunganForForm: tier.shortLabel,
        assignedRank: tier.rank,
        reason: isAqrab
          ? 'Ayah Kandung masih hidup dan memenuhi seluruh syarat wali nikah (Islam, baligh, berakal, laki-laki, adil), sehingga mutlak menjadi Wali Nasab utama.'
          : `Wali nasab urutan sebelumnya tidak ada atau terhalang syarat syar'i (${skippedTrace.length} urutan dilewati), sehingga hak perwalian berpindah secara sah kepada ${tier.label}.`,
        legalBasis: 'KHI Pasal 20–21 & PMA No. 20 Tahun 2019 Pasal 12',
        skippedTrace,
        administrativeNotes: [
          'Pastikan wali membawa KTP asli pada saat pemeriksaan berkas (rafak) dan hari akad.',
          'Jika wali berhalangan hadir saat akad, dapat mewakilkan kepada Penghulu/Kepala KUA melalui Taukil Wali Bil Lisan atau Bil Kitabah.',
        ],
      };
    }

    // tidak_ada or halangan_syari -> shifts down to the next wali nasab tier
    skippedTrace.push({
      rank: tier.rank,
      label: tier.label,
      statusLabel: WALI_STATUS_LABELS[status],
    });
  }

  return {
    waliType: 'wali_hakim',
    waliTypeLabel: 'Wali Hakim (Tidak Ada Wali Nasab)',
    assignedTitle: 'Kepala KUA Kecamatan Batealit (Wali Hakim)',
    assignedHubunganForForm: 'Wali Hakim',
    assignedRank: null,
    reason:
      'Seluruh 15 urutan wali nasab telah diperiksa dan tidak ada yang hidup atau memenuhi syarat syar\'i, sehingga hak perwalian beralih kepada Wali Hakim.',
    legalBasis: 'KHI Pasal 23 ayat (1) & PMA No. 20 Tahun 2019 Pasal 13',
    skippedTrace,
    administrativeNotes: [
      'Lampirkan Surat Pernyataan tidak memiliki wali nasab yang diketahui Kepala Desa/Lurah.',
      'Kepala KUA Kecamatan Batealit bertindak sebagai Wali Hakim.',
    ],
  };
}

// ============================================================================
// 4. DASBOR JADWAL PERNIKAHAN (Calendar, Countdown & Conflict Detection)
// ============================================================================

export interface ScheduledWeddingItem {
  record: MarriageFilingRecord;
  dateIso: string;
  timeSlot: string;
  daysFromToday: number;
  timingLabel: string;
  isPast: boolean;
  isToday: boolean;
  hasTimeConflict: boolean;
}

export interface CalendarCell {
  dateIso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: ScheduledWeddingItem[];
  hasConflict: boolean;
}

export interface ScheduleMonthSummary {
  year: number;
  month: number; // 1..12
  cells: CalendarCell[];
  monthEvents: ScheduledWeddingItem[];
  totalInMonth: number;
  upcomingCount: number;
  completedCount: number;
  conflictSlotCount: number;
}

export function buildScheduleMonthSummary(
  filings: MarriageFilingRecord[],
  year: number,
  month: number,
  todayIso: string,
): ScheduleMonthSummary {
  const todayDt = parseIsoDateUtc(todayIso) || new Date();

  // Detect exact date + time conflicts across all scheduled filings
  const slotCounts = new Map<string, number>();
  for (const f of filings) {
    const dateIso = (f.tanggalAkad || '').trim();
    if (!parseIsoDateUtc(dateIso)) continue;
    const normTime = (f.jamAkad || '').trim().toUpperCase();
    if (normTime) {
      const key = `${dateIso}|${normTime}`;
      slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
    }
  }

  const allItems: ScheduledWeddingItem[] = [];
  for (const record of filings) {
    const dateIso = (record.tanggalAkad || '').trim();
    const dt = parseIsoDateUtc(dateIso);
    if (!dt) continue;
    const daysFromToday = diffDaysUtc(todayDt, dt);
    const isToday = daysFromToday === 0;
    const isPast = daysFromToday < 0;
    const timingLabel = isToday
      ? 'Hari Ini'
      : isPast
        ? `Selesai (${Math.abs(daysFromToday)} hari lalu)`
        : `H-${daysFromToday}`;

    const normTime = (record.jamAkad || '').trim().toUpperCase();
    const hasTimeConflict =
      Boolean(normTime) && (slotCounts.get(`${dateIso}|${normTime}`) || 0) > 1;

    allItems.push({
      record,
      dateIso,
      timeSlot: record.jamAkad || 'Belum ditentukan',
      daysFromToday,
      timingLabel,
      isPast,
      isToday,
      hasTimeConflict,
    });
  }

  allItems.sort((a, b) => {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  const eventsByDate = new Map<string, ScheduledWeddingItem[]>();
  for (const item of allItems) {
    const list = eventsByDate.get(item.dateIso) || [];
    list.push(item);
    eventsByDate.set(item.dateIso, list);
  }

  // Build Monday-first 6x7 (or 5x7) calendar grid
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // Monday = 0 ... Sunday = 6
  const startOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: CalendarCell[] = [];
  const gridStart = addDaysUtc(firstOfMonth, -startOffset);

  for (let idx = 0; idx < totalCells; idx++) {
    const cellDt = addDaysUtc(gridStart, idx);
    const cellIso = toIsoDateUtc(cellDt);
    const events = eventsByDate.get(cellIso) || [];
    cells.push({
      dateIso: cellIso,
      dayNumber: cellDt.getUTCDate(),
      inCurrentMonth:
        cellDt.getUTCFullYear() === year && cellDt.getUTCMonth() === month - 1,
      isToday: cellIso === todayIso,
      events,
      hasConflict: events.some((e) => e.hasTimeConflict),
    });
  }

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
  const monthEvents = allItems.filter((e) => e.dateIso.startsWith(monthPrefix));

  const conflictSlotsInMonth = new Set<string>();
  for (const e of monthEvents) {
    if (e.hasTimeConflict) {
      conflictSlotsInMonth.add(`${e.dateIso}|${e.timeSlot.toUpperCase()}`);
    }
  }

  return {
    year,
    month,
    cells,
    monthEvents,
    totalInMonth: monthEvents.length,
    upcomingCount: allItems.filter((e) => !e.isPast).length,
    completedCount: allItems.filter((e) => e.isPast).length,
    conflictSlotCount: conflictSlotsInMonth.size,
  };
}

// ============================================================================
// 5. DASBOR HALAMAN UTAMA (Rangkuman Semua Data & Ringkasan Desa)
// ============================================================================

export interface VillageBreakdownItem {
  desaName: string;
  totalFilings: number;
  lengkapCount: number;
  draftCount: number;
  isActive: boolean;
  petinggiName: string;
}

export interface OverviewSummary {
  totalFilings: number;
  lengkapCount: number;
  draftCount: number;
  upcomingEvents: ScheduledWeddingItem[];
  nextWedding: ScheduledWeddingItem | null;
  completedCount: number;
  recentFilings: MarriageFilingRecord[];
  villageBreakdown: VillageBreakdownItem[];
  activeVillageCount: number;
  totalVillageCount: number;
}

export function buildOverviewSummary(
  filings: MarriageFilingRecord[],
  villageUsers: UserProfile[],
  todayIso: string,
): OverviewSummary {
  const todayDt = parseIsoDateUtc(todayIso) || new Date();

  let lengkapCount = 0;
  let draftCount = 0;

  const slotCounts = new Map<string, number>();
  for (const f of filings) {
    if (f.statusBerkas === 'Lengkap') lengkapCount += 1;
    else draftCount += 1;

    const dateIso = (f.tanggalAkad || '').trim();
    const normTime = (f.jamAkad || '').trim().toUpperCase();
    if (parseIsoDateUtc(dateIso) && normTime) {
      const key = `${dateIso}|${normTime}`;
      slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
    }
  }

  const scheduled: ScheduledWeddingItem[] = [];
  for (const record of filings) {
    const dateIso = (record.tanggalAkad || '').trim();
    const dt = parseIsoDateUtc(dateIso);
    if (!dt) continue;
    const daysFromToday = diffDaysUtc(todayDt, dt);
    const isToday = daysFromToday === 0;
    const isPast = daysFromToday < 0;
    const normTime = (record.jamAkad || '').trim().toUpperCase();
    scheduled.push({
      record,
      dateIso,
      timeSlot: record.jamAkad || 'Belum ditentukan',
      daysFromToday,
      timingLabel: isToday
        ? 'Hari Ini'
        : isPast
          ? `Selesai (${Math.abs(daysFromToday)} hari lalu)`
          : `H-${daysFromToday}`,
      isPast,
      isToday,
      hasTimeConflict:
        Boolean(normTime) && (slotCounts.get(`${dateIso}|${normTime}`) || 0) > 1,
    });
  }

  scheduled.sort((a, b) => {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  const upcomingEvents = scheduled.filter((s) => !s.isPast);
  const completedCount = scheduled.filter((s) => s.isPast).length;

  const recentFilings = [...filings]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id - a.id)
    .slice(0, 5);

  // Village breakdown map
  const statsByDesa = new Map<string, { total: number; lengkap: number; draft: number }>();
  for (const f of filings) {
    const key = (f.desaName || 'Lainnya').trim().toLowerCase();
    const curr = statsByDesa.get(key) || { total: 0, lengkap: 0, draft: 0 };
    curr.total += 1;
    if (f.statusBerkas === 'Lengkap') curr.lengkap += 1;
    else curr.draft += 1;
    statsByDesa.set(key, curr);
  }

  const villageBreakdown: VillageBreakdownItem[] = [];
  const seenKeys = new Set<string>();

  for (const vu of villageUsers) {
    const key = vu.desaName.trim().toLowerCase();
    seenKeys.add(key);
    const st = statsByDesa.get(key) || { total: 0, lengkap: 0, draft: 0 };
    const titleParts = [vu.gelarDepan, vu.namaPetinggi].filter(Boolean).join(' ');
    const fullPetinggi = vu.gelarBelakang
      ? `${titleParts}, ${vu.gelarBelakang}`
      : titleParts;

    villageBreakdown.push({
      desaName: vu.desaName,
      totalFilings: st.total,
      lengkapCount: st.lengkap,
      draftCount: st.draft,
      isActive: vu.isActive,
      petinggiName: fullPetinggi || '-',
    });
  }

  // Include any desa present in filings even if villageUsers isn't loaded (e.g. village_admin role)
  for (const f of filings) {
    const key = (f.desaName || '').trim().toLowerCase();
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    const st = statsByDesa.get(key)!;
    villageBreakdown.push({
      desaName: f.desaName,
      totalFilings: st.total,
      lengkapCount: st.lengkap,
      draftCount: st.draft,
      isActive: true,
      petinggiName: '-',
    });
  }

  villageBreakdown.sort(
    (a, b) => b.totalFilings - a.totalFilings || a.desaName.localeCompare(b.desaName),
  );

  return {
    totalFilings: filings.length,
    lengkapCount,
    draftCount,
    upcomingEvents,
    nextWedding: upcomingEvents[0] || null,
    completedCount,
    recentFilings,
    villageBreakdown,
    activeVillageCount: villageUsers.filter((v) => v.isActive).length,
    totalVillageCount: villageUsers.length,
  };
}

