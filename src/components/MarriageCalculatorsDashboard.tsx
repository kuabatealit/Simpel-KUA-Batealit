import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  RotateCcw,
  Scale,
  Users,
} from 'lucide-react';
import type { MarriageFilingRecord } from '../types/marriage';
import { formatIndonesianDate } from '../utils/formatting';
import {
  WALI_NASAB_ORDER,
  WALI_STATUS_LABELS,
  calculateIddah,
  describeAgeDifference,
  determineWaliNikah,
  evaluateCatinAge,
  toIsoDateUtc,
  type IddahCaseType,
  type WaliCandidateStatus,
} from '../utils/marriageCalculators';

interface MarriageCalculatorsDashboardProps {
  filings: MarriageFilingRecord[];
  onApplyWaliHubungan: (hubunganWali: string) => void;
}

type CalculatorTab = 'iddah' | 'umur' | 'wali';

const IDDAH_OPTIONS: Array<{
  value: IddahCaseType;
  title: string;
  subtitle: string;
  dateLabel: string;
}> = [
  {
    value: 'cerai_mati',
    title: 'Cerai Mati (Suami Wafat, Tidak Hamil)',
    subtitle: '4 bulan 10 hari (130 hari Qamariyah) sejak tanggal wafat suami.',
    dateLabel: 'Tanggal Wafat Suami',
  },
  {
    value: 'cerai_hidup_haid',
    title: 'Cerai Hidup — Masih Mengalami Haid (Ba\'da Dukhul)',
    subtitle: '3 kali suci (3 quru\') dengan masa minimal 90 hari sejak Akta Cerai / Inkracht PA.',
    dateLabel: 'Tanggal Putusan Inkracht / Akta Cerai',
  },
  {
    value: 'cerai_hidup_tidak_haid',
    title: 'Cerai Hidup — Tidak Haid / Menopause (Ba\'da Dukhul)',
    subtitle: '90 hari (3 bulan Qamariyah) sejak tanggal putusan inkracht Pengadilan Agama.',
    dateLabel: 'Tanggal Putusan Inkracht / Akta Cerai',
  },
  {
    value: 'cerai_hamil',
    title: 'Cerai Hidup / Cerai Mati dalam Keadaan Hamil',
    subtitle: 'Berakhir tepat saat melahirkan anak yang dikandung (boleh akad mulai H+1).',
    dateLabel: 'Tanggal Aktual / Perkiraan Melahirkan',
  },
  {
    value: 'qabla_dukhul',
    title: 'Cerai Hidup Sebelum Hubungan Suami Istri (Qabla al-Dukhul)',
    subtitle: 'Tidak ada masa iddah (0 hari) setelah Akta Cerai / Inkracht resmi terbit.',
    dateLabel: 'Tanggal Putusan Inkracht / Akta Cerai',
  },
];

function getTodayIso(): string {
  const now = new Date();
  return toIsoDateUtc(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

function createDefaultWaliStatuses(): Record<string, WaliCandidateStatus> {
  const map: Record<string, WaliCandidateStatus> = {};
  for (const tier of WALI_NASAB_ORDER) {
    map[tier.id] = tier.id === 'ayah_kandung' ? 'memenuhi_syarat' : 'tidak_ada';
  }
  return map;
}

export function MarriageCalculatorsDashboard({
  filings,
  onApplyWaliHubungan,
}: MarriageCalculatorsDashboardProps) {
  const todayIso = useMemo(() => getTodayIso(), []);
  const [activeTab, setActiveTab] = useState<CalculatorTab>('iddah');

  // --- Tab 1: Iddah state ---
  const [iddahType, setIddahType] = useState<IddahCaseType>('cerai_mati');
  const [iddahEventDate, setIddahEventDate] = useState('2026-07-01');
  const [iddahPlannedAkad, setIddahPlannedAkad] = useState('2026-12-14');

  // --- Tab 2: Umur Catin state ---
  const [selectedFilingForAge, setSelectedFilingForAge] = useState<string>('');
  const [ageReferenceDate, setAgeReferenceDate] = useState(todayIso);
  const [suamiBirthDate, setSuamiBirthDate] = useState('1998-05-12');
  const [istriBirthDate, setIstriBirthDate] = useState('2006-03-10');

  // --- Tab 3: Wali Nikah state ---
  const [anakLuarNikah, setAnakLuarNikah] = useState(false);
  const [waliSedangIhram, setWaliSedangIhram] = useState(false);
  const [waliStatuses, setWaliStatuses] = useState<Record<string, WaliCandidateStatus>>(
    createDefaultWaliStatuses,
  );
  const [waliAppliedNotice, setWaliAppliedNotice] = useState<string | null>(null);

  const iddahOption = IDDAH_OPTIONS.find((o) => o.value === iddahType) || IDDAH_OPTIONS[0];

  const iddahResult = useMemo(
    () =>
      calculateIddah({
        caseType: iddahType,
        eventDate: iddahEventDate,
        plannedAkadDate: iddahPlannedAkad || undefined,
      }),
    [iddahType, iddahEventDate, iddahPlannedAkad],
  );

  const suamiAgeEval = useMemo(
    () => evaluateCatinAge(suamiBirthDate, ageReferenceDate),
    [suamiBirthDate, ageReferenceDate],
  );
  const istriAgeEval = useMemo(
    () => evaluateCatinAge(istriBirthDate, ageReferenceDate),
    [istriBirthDate, ageReferenceDate],
  );
  const coupleDiffText = useMemo(
    () => describeAgeDifference(suamiBirthDate, istriBirthDate),
    [suamiBirthDate, istriBirthDate],
  );

  const waliResult = useMemo(
    () =>
      determineWaliNikah({
        anakLuarNikah,
        waliSedangIhram,
        statuses: waliStatuses,
      }),
    [anakLuarNikah, waliSedangIhram, waliStatuses],
  );

  const waliGroups = useMemo(() => {
    const map = new Map<string, typeof WALI_NASAB_ORDER>();
    for (const tier of WALI_NASAB_ORDER) {
      const list = map.get(tier.group) || [];
      list.push(tier);
      map.set(tier.group, list);
    }
    return Array.from(map.entries());
  }, []);

  const handleLoadFilingForAge = (filingIdStr: string) => {
    setSelectedFilingForAge(filingIdStr);
    if (!filingIdStr) return;
    const rec = filings.find((f) => String(f.id) === filingIdStr);
    if (!rec) return;
    if (rec.payload.suami.tanggalLahir) {
      setSuamiBirthDate(rec.payload.suami.tanggalLahir);
    }
    if (rec.payload.istri.tanggalLahir) {
      setIstriBirthDate(rec.payload.istri.tanggalLahir);
    }
    if (rec.tanggalAkad) {
      setAgeReferenceDate(rec.tanggalAkad);
    }
  };

  const handleWaliStatusChange = (id: string, status: WaliCandidateStatus) => {
    setWaliAppliedNotice(null);
    setWaliStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const applyWaliPreset = (preset: 'ayah_hadir' | 'ayah_wafat_saudara' | 'semua_tidak_ada') => {
    setWaliAppliedNotice(null);
    setAnakLuarNikah(false);
    setWaliSedangIhram(false);
    const next: Record<string, WaliCandidateStatus> = {};
    for (const tier of WALI_NASAB_ORDER) {
      next[tier.id] = 'tidak_ada';
    }
    if (preset === 'ayah_hadir') {
      next.ayah_kandung = 'memenuhi_syarat';
    } else if (preset === 'ayah_wafat_saudara') {
      next.saudara_lk_sekandung = 'memenuhi_syarat';
    }
    setWaliStatuses(next);
  };

  const handleApplyWaliToForm = () => {
    onApplyWaliHubungan(waliResult.assignedHubunganForForm);
    setWaliAppliedNotice(
      `Hubungan wali "${waliResult.assignedHubunganForForm}" telah diterapkan ke formulir Input Berkas aktif.`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Segmented Tab Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
            Dasbor Kalkulator Nikah
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Alat bantu verifikasi pemeriksaan berkas KUA: perhitungan masa iddah (KHI Pasal 153),
            usia minimal catin (UU No. 16 Tahun 2019 &amp; Model N5), dan penentuan tartib wali nikah.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Pilihan Kalkulator Nikah"
          className="flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start lg:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'iddah'}
            onClick={() => setActiveTab('iddah')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'iddah'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Kalkulator Iddah</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'umur'}
            onClick={() => setActiveTab('umur')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'umur'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Umur Catin</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'wali'}
            onClick={() => setActiveTab('wali')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'wali'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Penentuan Wali Nikah</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: KALKULATOR MASA IDDAH                                        */}
      {/* =================================================================== */}
      {activeTab === 'iddah' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Input Panel */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">1. Pilih Sebab Putusnya Perkawinan</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengacu pada Kompilasi Hukum Islam (KHI) Pasal 153 dan Fikih Munakahat.
              </p>

              <div className="mt-4 space-y-2.5">
                {IDDAH_OPTIONS.map((opt) => {
                  const selected = iddahType === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`block rounded-lg border p-3.5 cursor-pointer transition-colors ${
                        selected
                          ? 'border-emerald-700 bg-emerald-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="iddah-case"
                          value={opt.value}
                          checked={selected}
                          onChange={() => setIddahType(opt.value)}
                          className="mt-0.5 accent-emerald-800"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{opt.title}</div>
                          <div className="text-xs text-slate-600 mt-0.5">{opt.subtitle}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="iddah-event-date"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  {iddahOption.dateLabel}
                </label>
                <input
                  id="iddah-event-date"
                  type="date"
                  value={iddahEventDate}
                  onChange={(e) => setIddahEventDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label
                  htmlFor="iddah-planned-akad"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Rencana Tanggal Akad Nikah (Opsional)
                </label>
                <input
                  id="iddah-planned-akad"
                  type="date"
                  value={iddahPlannedAkad}
                  onChange={(e) => setIddahPlannedAkad(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>
            </div>
          </div>

          {/* Result Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <div className="text-xs font-medium text-slate-500">Hasil Perhitungan Masa Iddah</div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {iddahResult.valid ? iddahResult.durationSummary : 'Masukkan Tanggal Valid'}
              </h2>
              {iddahResult.valid && (
                <div className="text-xs text-slate-500 mt-1">{iddahResult.legalBasis}</div>
              )}
            </div>

            {!iddahResult.valid ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                {iddahResult.error}
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-200 border-y border-slate-200 text-sm">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-slate-600">Tanggal Mulai Iddah</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatIndonesianDate(iddahResult.eventDateIso)}
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-slate-600">Hari Terakhir Iddah</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatIndonesianDate(iddahResult.iddahEndDateIso)}
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-slate-600">Paling Awal Boleh Akad</span>
                    <span className="font-bold text-emerald-800 tabular-nums">
                      {formatIndonesianDate(iddahResult.earliestMarriageDateIso)}
                    </span>
                  </div>
                  {iddahResult.masehiReferenceEndIso && (
                    <div className="py-3 flex items-center justify-between gap-4">
                      <span className="text-slate-600">Pembanding Masehi (+4 bln 10 hr)</span>
                      <span className="font-medium text-slate-700 tabular-nums">
                        {formatIndonesianDate(iddahResult.masehiReferenceEndIso)}
                      </span>
                    </div>
                  )}
                </div>

                {iddahResult.akadCheck && (
                  <div
                    className={`p-4 rounded-lg border text-sm space-y-1 ${
                      iddahResult.akadCheck.eligible
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {iddahResult.akadCheck.eligible ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                      )}
                      <span>
                        {iddahResult.akadCheck.eligible
                          ? 'Memenuhi Syarat — Masa Iddah Selesai'
                          : `Belum Boleh Akad (Kurang ${iddahResult.akadCheck.remainingDays} Hari)`}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">
                      Rencana akad {formatIndonesianDate(iddahResult.akadCheck.plannedAkadDateIso)}:{' '}
                      {iddahResult.akadCheck.message}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Catatan Pemeriksaan KUA
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc pl-4">
                    {iddahResult.notes.map((n, idx) => (
                      <li key={idx}>{n}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: KALKULATOR UMUR CATIN                                        */}
      {/* =================================================================== */}
      {activeTab === 'umur' && (
        <div className="space-y-6">
          {/* Input Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Data Tanggal Lahir &amp; Tanggal Patokan Akad
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cek batas usia minimal 19 tahun (UU No. 16 Tahun 2019) dan kewajiban Model N5 (&lt; 21 tahun).
                </p>
              </div>

              {filings.length > 0 && (
                <div className="sm:w-72">
                  <select
                    aria-label="Ambil data dari berkas tersimpan"
                    value={selectedFilingForAge}
                    onChange={(e) => handleLoadFilingForAge(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
                  >
                    <option value="">Ambil data dari berkas tersimpan...</option>
                    {filings.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.namaSuami} &amp; {f.namaIstri} (Desa {f.desaName})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label
                  htmlFor="age-suami-dob"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Tanggal Lahir Calon Suami
                </label>
                <input
                  id="age-suami-dob"
                  type="date"
                  value={suamiBirthDate}
                  onChange={(e) => setSuamiBirthDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label
                  htmlFor="age-istri-dob"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Tanggal Lahir Calon Istri
                </label>
                <input
                  id="age-istri-dob"
                  type="date"
                  value={istriBirthDate}
                  onChange={(e) => setIstriBirthDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label
                  htmlFor="age-reference-date"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Tanggal Patokan (Tanggal Akad / Hari Ini)
                </label>
                <div className="flex gap-2">
                  <input
                    id="age-reference-date"
                    type="date"
                    value={ageReferenceDate}
                    onChange={(e) => setAgeReferenceDate(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                  <button
                    type="button"
                    onClick={() => setAgeReferenceDate(todayIso)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Hari Ini
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {[
              { title: 'Calon Suami', evaluation: suamiAgeEval },
              { title: 'Calon Istri', evaluation: istriAgeEval },
            ].map(({ title, evaluation }) => (
              <div
                key={title}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    {evaluation.valid && (
                      <span className="text-xs text-slate-500 tabular-nums">
                        Lahir {formatIndonesianDate(evaluation.birthDateIso)}
                      </span>
                    )}
                  </div>

                  {!evaluation.valid ? (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                      {evaluation.error}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-200">
                        <div>
                          <div className="text-xs text-slate-500">Tahun</div>
                          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                            {evaluation.age.years}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Bulan</div>
                          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                            {evaluation.age.months}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Hari</div>
                          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                            {evaluation.age.days}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                          evaluation.meetsMinimumAge19
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-sm">
                          {evaluation.meetsMinimumAge19 ? (
                            <CheckCircle2
                              className="w-4 h-4 text-emerald-700 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <AlertTriangle
                              className="w-4 h-4 text-red-700 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span>{evaluation.statusLabel}</span>
                        </div>
                        {evaluation.requiresDispensationPA && (
                          <p className="leading-relaxed">
                            Mencapai usia 19 tahun pada{' '}
                            <strong className="tabular-nums">
                              {formatIndonesianDate(evaluation.nineteenthBirthdayIso)}
                            </strong>{' '}
                            (kurang <strong className="tabular-nums">{evaluation.daysUntil19}</strong>{' '}
                            hari lagi). Apabila akad tetap dilakukan sebelumnya, wajib melampirkan
                            Penetapan Dispensasi Kawin dari Pengadilan Agama.
                          </p>
                        )}
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-600">
                        <div className="flex items-center justify-between gap-2">
                          <span>Kewajiban Model N5 (Izin Orang Tua)</span>
                          <span
                            className={`font-semibold ${
                              evaluation.requiresModelN5 ? 'text-amber-800' : 'text-emerald-800'
                            }`}
                          >
                            {evaluation.requiresModelN5 ? 'Wajib Model N5 (< 21 thn)' : 'Tidak Wajib'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>Genap Usia 19 Tahun</span>
                          <span className="font-mono tabular-nums text-slate-800">
                            {formatIndonesianDate(evaluation.nineteenthBirthdayIso)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>Genap Usia 21 Tahun</span>
                          <span className="font-mono tabular-nums text-slate-800">
                            {formatIndonesianDate(evaluation.twentyFirstBirthdayIso)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Row */}
          {suamiAgeEval.valid && istriAgeEval.valid && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-500">
                  Ringkasan Pemeriksaan Usia Pasangan (Patokan {formatIndonesianDate(ageReferenceDate)})
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {coupleDiffText}
                </p>
                <p className="text-xs text-slate-600">
                  {suamiAgeEval.requiresDispensationPA || istriAgeEval.requiresDispensationPA
                    ? 'Tindakan KUA: Wajib melampirkan Salinan Penetapan Dispensasi Kawin dari Pengadilan Agama sebelum pencatatan akad.'
                    : suamiAgeEval.requiresModelN5 || istriAgeEval.requiresModelN5
                      ? 'Tindakan KUA: Usia minimal 19 tahun terpenuhi. Wajib menyertakan Formulir Model N5 (Surat Izin Orang Tua) untuk mempelai berusia di bawah 21 tahun.'
                      : 'Tindakan KUA: Kedua mempelai memenuhi syarat usia minimal (≥ 19 tahun) dan dewasa penuh (≥ 21 tahun). Tidak memerlukan Dispensasi Kawin maupun Model N5.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: PENENTUAN WALI NIKAH                                         */}
      {/* =================================================================== */}
      {activeTab === 'wali' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Special Conditions + 15-Tier Tartib Wali Nasab */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    1. Kondisi Khusus &amp; Simulasi Cepat
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Periksa kondisi pemicu langsung Wali Hakim sebelum menelusuri 15 urutan wali nasab.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyWaliPreset('ayah_hadir')}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Ayah Hadir
                  </button>
                  <button
                    type="button"
                    onClick={() => applyWaliPreset('ayah_wafat_saudara')}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Ayah Wafat → Sdr. Sekandung
                  </button>
                  <button
                    type="button"
                    onClick={() => applyWaliPreset('semua_tidak_ada')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    <span>Kosongkan</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anakLuarNikah}
                    onChange={(e) => {
                      setAnakLuarNikah(e.target.checked);
                      setWaliAppliedNotice(null);
                    }}
                    className="mt-1 accent-emerald-800"
                  />
                  <span>
                    <span className="font-medium">
                      Calon istri anak di luar nikah / nasab syar&apos;i hanya kepada ibu
                    </span>
                    <span className="block text-xs text-slate-500">
                      Jika dicentang, perwalian langsung beralih ke Wali Hakim (Kepala KUA).
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waliSedangIhram}
                    onChange={(e) => {
                      setWaliSedangIhram(e.target.checked);
                      setWaliAppliedNotice(null);
                    }}
                    className="mt-1 accent-emerald-800"
                  />
                  <span>
                    <span className="font-medium">
                      Wali nasab terdekat yang berhak sedang dalam keadaan ihram haji/umrah
                    </span>
                    <span className="block text-xs text-slate-500">
                      Sesuai PMA &amp; fikih Syafi&apos;i, wali yang sedang ihram digantikan sementara oleh Wali Hakim.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* 15-Tier Tartib Wali Nasab */}
            <div
              className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${
                anakLuarNikah ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">
                  2. Urutan Tartib Wali Nasab (15 Tingkatan — KHI Pasal 21)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan status setiap urutan wali mulai dari atas. Sistem otomatis menentukan wali yang sah.
                </p>
              </div>

              <div className="divide-y divide-slate-200">
                {waliGroups.map(([groupName, tiers]) => (
                  <div key={groupName}>
                    <div className="px-5 py-2.5 bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-200">
                      {groupName}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {tiers.map((tier) => {
                        const isAssigned = waliResult.assignedRank === tier.rank;
                        const statusVal = waliStatuses[tier.id] || 'tidak_ada';
                        return (
                          <div
                            key={tier.id}
                            className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              isAssigned ? 'bg-emerald-50/70' : ''
                            }`}
                          >
                            <div className="flex items-baseline gap-2.5 min-w-0">
                              <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums w-5 shrink-0">
                                {String(tier.rank).padStart(2, '0')}.
                              </span>
                              <div className="min-w-0">
                                <span
                                  className={`text-sm ${
                                    isAssigned
                                      ? 'font-bold text-emerald-950'
                                      : 'font-medium text-slate-800'
                                  }`}
                                >
                                  {tier.label}
                                </span>
                                {isAssigned && (
                                  <span className="ml-2 text-xs font-semibold text-emerald-800">
                                    · Wali Terpilih
                                  </span>
                                )}
                              </div>
                            </div>

                            <select
                              aria-label={`Status ${tier.label}`}
                              value={statusVal}
                              onChange={(e) =>
                                handleWaliStatusChange(
                                  tier.id,
                                  e.target.value as WaliCandidateStatus,
                                )
                              }
                              className="sm:w-64 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                            >
                              {(
                                Object.entries(WALI_STATUS_LABELS) as Array<
                                  [WaliCandidateStatus, string]
                                >
                              ).map(([val, lbl]) => (
                                <option key={val} value={val}>
                                  {lbl}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sticky Wali Determination Result */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <div className="text-xs font-medium text-slate-500">Keputusan Penentuan Wali</div>
              <div
                className={`mt-1 text-xs font-semibold ${
                  waliResult.waliType === 'wali_hakim' ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                {waliResult.waliTypeLabel}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1 leading-snug">
                {waliResult.assignedTitle}
              </h2>
              <div className="text-xs text-slate-500 mt-1">{waliResult.legalBasis}</div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {waliResult.reason}
            </div>

            {waliResult.skippedTrace.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Alur Pemeriksaan Urutan Sebelumnya
                </div>
                <ul className="space-y-1 text-xs text-slate-600 max-h-40 overflow-y-auto pr-1">
                  {waliResult.skippedTrace.map((s) => (
                    <li key={s.rank} className="flex items-baseline gap-1.5">
                      <span className="font-mono text-slate-400 tabular-nums">
                        {String(s.rank).padStart(2, '0')}.
                      </span>
                      <span className="text-slate-800 font-medium">{s.label}:</span>
                      <span className="text-slate-500">{s.statusLabel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-700">
                Catatan Administrasi &amp; Taukil Wali
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc pl-4">
                {waliResult.administrativeNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleApplyWaliToForm}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Terapkan Wali ke Formulir Berkas</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>

              {waliAppliedNotice && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900"
                >
                  {waliAppliedNotice}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
