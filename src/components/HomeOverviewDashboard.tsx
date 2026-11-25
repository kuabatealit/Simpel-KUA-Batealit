import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilePlus2,
  Pencil,
  Shield,
  UserCog,
} from 'lucide-react';
import type { MarriageFilingRecord, UserProfile } from '../types/marriage';
import { formatIndonesianDate, formatPetinggiDisplay } from '../utils/formatting';
import {
  buildOverviewSummary,
  buildScheduleMonthSummary,
  parseIsoDateUtc,
  toIsoDateUtc,
} from '../utils/marriageCalculators';

interface HomeOverviewDashboardProps {
  user: UserProfile;
  filings: MarriageFilingRecord[];
  villageUsers: UserProfile[];
  loading: boolean;
  onNavigate: (
    view: 'schedule' | 'calculators' | 'history' | 'input' | 'preview' | 'profile' | 'accounts',
  ) => void;
  onCreateNew: () => void;
  onEditFiling: (record: MarriageFilingRecord) => void;
  onPreviewFiling: (record: MarriageFilingRecord) => void;
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const WEEKDAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function getTodayIso(): string {
  const now = new Date();
  return toIsoDateUtc(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

function getDefaultCalendarYM(filings: MarriageFilingRecord[], todayIso: string): {
  year: number;
  month: number;
} {
  const nextIso = filings
    .map((f) => (f.tanggalAkad || '').trim())
    .filter((d) => Boolean(parseIsoDateUtc(d)) && d >= todayIso)
    .sort()[0];
  const dt = parseIsoDateUtc(nextIso || todayIso) || new Date();
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
  };
}

export function HomeOverviewDashboard({
  user,
  filings,
  villageUsers,
  loading,
  onNavigate,
  onCreateNew,
  onEditFiling,
  onPreviewFiling,
}: HomeOverviewDashboardProps) {
  const todayIso = useMemo(() => getTodayIso(), []);
  const initialYM = useMemo(() => getDefaultCalendarYM(filings, todayIso), [filings, todayIso]);

  const [calYear, setCalYear] = useState(initialYM.year);
  const [calMonth, setCalMonth] = useState(initialYM.month);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const userChangedMonthRef = useRef(false);

  useEffect(() => {
    if (userChangedMonthRef.current || filings.length === 0) return;
    const target = getDefaultCalendarYM(filings, todayIso);
    setCalYear(target.year);
    setCalMonth(target.month);
  }, [filings, todayIso]);

  const overview = useMemo(
    () => buildOverviewSummary(filings, villageUsers, todayIso),
    [filings, villageUsers, todayIso],
  );

  const monthCal = useMemo(
    () => buildScheduleMonthSummary(filings, calYear, calMonth, todayIso),
    [filings, calYear, calMonth, todayIso],
  );

  const selectedDayEvents = useMemo(() => {
    if (!selectedDateIso) return [];
    return monthCal.monthEvents.filter((e) => e.dateIso === selectedDateIso);
  }, [selectedDateIso, monthCal.monthEvents]);

  const maxVillageCount = useMemo(
    () => Math.max(1, ...overview.villageBreakdown.map((v) => v.totalFilings)),
    [overview.villageBreakdown],
  );

  const petinggiDisplay = formatPetinggiDisplay(user);

  const goPrevMonth = () => {
    userChangedMonthRef.current = true;
    setSelectedDateIso(null);
    if (calMonth === 1) {
      setCalYear((y) => y - 1);
      setCalMonth(12);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    userChangedMonthRef.current = true;
    setSelectedDateIso(null);
    if (calMonth === 12) {
      setCalYear((y) => y + 1);
      setCalMonth(1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const jumpTodayMonth = () => {
    userChangedMonthRef.current = true;
    const dt = parseIsoDateUtc(todayIso) || new Date();
    setCalYear(dt.getUTCFullYear());
    setCalMonth(dt.getUTCMonth() + 1);
    setSelectedDateIso(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
            Dasbor Utama
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {user.role === 'kua_admin'
              ? 'Rangkuman seluruh data pemberkasan nikah, sebaran 11 desa, dan kalender akad KUA Kecamatan Batealit.'
              : `Rangkuman data pemberkasan nikah, profil penandatangan, dan kalender akad Desa ${user.desaName}.`}
          </p>
        </div>
        <div className="text-xs text-slate-500 tabular-nums">
          Tanggal hari ini: <span className="font-semibold text-slate-700">{formatIndonesianDate(todayIso)}</span>
        </div>
      </div>

      {/* 4-Column Executive KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Berkas Nikah</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {overview.totalFilings}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            <span className="text-emerald-800 font-medium">{overview.lengkapCount} Lengkap</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{overview.draftCount} Draft</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Akad Mendatang</div>
          <div className="text-2xl font-bold text-emerald-800 tabular-nums mt-1">
            {overview.upcomingEvents.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate tabular-nums">
            {overview.nextWedding
              ? `Terdekat: ${formatIndonesianDate(overview.nextWedding.dateIso)} (${overview.nextWedding.timingLabel})`
              : 'Belum ada jadwal mendatang'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">
            Jadwal {MONTH_NAMES_ID[calMonth - 1]} {calYear}
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {monthCal.totalInMonth}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {monthCal.conflictSlotCount > 0 ? (
              <span className="text-amber-700 font-medium">
                {monthCal.conflictSlotCount} jam berpotensi bentrok
              </span>
            ) : (
              <span>{overview.completedCount} akad telah terlaksana</span>
            )}
          </div>
        </div>

        {user.role === 'kua_admin' ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">Admin Desa Aktif</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {overview.activeVillageCount}
              <span className="text-sm font-medium text-slate-400">
                /{overview.totalVillageCount || 11}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Wilayah KUA Kecamatan Batealit</div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">Profil Penandatangan N1</div>
            <div className="text-base font-bold text-slate-900 truncate mt-1.5">
              {petinggiDisplay || 'Belum diisi'}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">
              {user.nip ? `NIP ${user.nip}` : user.jabatanPenandatangan || 'Kepala Desa / Lurah'}
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Split: Embedded Wedding Calendar (7 cols) + Upcoming & Quick Access (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Embedded Interactive Wedding Calendar */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">Kalender Pernikahan</h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Klik tanggal bertanda akad untuk melihat rincian pasangan.
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Bulan sebelumnya"
                onClick={goPrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="text-xs sm:text-sm font-bold text-slate-900 min-w-[116px] text-center tabular-nums whitespace-nowrap">
                {MONTH_NAMES_ID[calMonth - 1]} {calYear}
              </span>
              <button
                type="button"
                aria-label="Bulan berikutnya"
                onClick={goNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={jumpTodayMonth}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Hari Ini
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAY_HEADERS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold text-slate-600"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {monthCal.cells.map((cell) => {
              const isSelected = selectedDateIso === cell.dateIso;
              const hasEvents = cell.events.length > 0;
              return (
                <button
                  key={cell.dateIso}
                  type="button"
                  onClick={() =>
                    setSelectedDateIso((prev) =>
                      prev === cell.dateIso ? null : cell.dateIso,
                    )
                  }
                  className={`min-h-[64px] sm:min-h-[70px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 ${
                    !cell.inCurrentMonth
                      ? 'bg-slate-50/70 text-slate-400'
                      : isSelected
                        ? 'bg-emerald-50/90'
                        : hasEvents
                          ? 'bg-white hover:bg-emerald-50/40'
                          : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-semibold tabular-nums inline-flex items-center justify-center w-6 h-6 rounded-md ${
                        cell.isToday
                          ? 'bg-emerald-800 text-white'
                          : isSelected
                            ? 'text-emerald-900 font-bold'
                            : cell.inCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.hasConflict && (
                      <AlertTriangle
                        className="w-3.5 h-3.5 text-amber-600 shrink-0"
                        aria-label="Potensi bentrok jam"
                      />
                    )}
                  </div>

                  {hasEvents && (
                    <div className="mt-1">
                      <div
                        className={`text-[11px] font-semibold tabular-nums leading-tight ${
                          cell.hasConflict ? 'text-amber-800' : 'text-emerald-800'
                        }`}
                      >
                        {cell.events.length} Akad
                      </div>
                      <div className="hidden sm:block text-[10px] text-slate-500 truncate">
                        {cell.events[0].record.namaSuami}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Date Detail Drawer inside Calendar Footer */}
          {selectedDateIso && (
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Jadwal {formatIndonesianDate(selectedDateIso)} ({selectedDayEvents.length} akad)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDateIso(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Belum ada akad nikah terjadwal pada tanggal ini.
                </p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {selectedDayEvents.map((ev) => (
                    <div
                      key={ev.record.id}
                      className="py-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {ev.record.namaSuami} &amp; {ev.record.namaIstri}
                        </div>
                        <div className="text-slate-500 tabular-nums">
                          <span className="font-mono text-emerald-800">{ev.timeSlot}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>Desa {ev.record.desaName}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>{ev.record.statusBerkas}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onPreviewFiling(ev.record)}
                          className="font-medium text-emerald-800 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Pratinjau F4
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditFiling(ev.record)}
                          className="font-medium text-slate-600 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 tabular-nums">
              {monthCal.totalInMonth} jadwal pada {MONTH_NAMES_ID[calMonth - 1]} {calYear}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer whitespace-nowrap"
            >
              <span>Buka Dasbor Jadwal Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right Column: Upcoming Weddings + Quick Links */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Weddings */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">Agenda Akad Terdekat</h2>
              <button
                type="button"
                onClick={() => onNavigate('schedule')}
                className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer whitespace-nowrap"
              >
                Semua Jadwal
              </button>
            </div>

            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Memuat jadwal...</div>
            ) : overview.upcomingEvents.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-xs text-slate-500">Belum ada jadwal akad nikah mendatang.</p>
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer"
                >
                  Input Berkas &amp; Jadwal Baru
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {overview.upcomingEvents.slice(0, 4).map((item) => (
                  <div
                    key={item.record.id}
                    className="px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 tabular-nums">
                        <span className="font-semibold text-slate-800">
                          {formatIndonesianDate(item.dateIso)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-emerald-800">{item.timeSlot}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-700">{item.timingLabel}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                        {item.record.namaSuami} &amp; {item.record.namaIstri}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        Desa {item.record.desaName} · {item.record.tempatAkad || '-'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPreviewFiling(item.record)}
                        title="Pratinjau & Unduh F4"
                        className="p-1.5 rounded-md text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditFiling(item.record)}
                        title="Edit Berkas"
                        className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Service Access */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">Akses Cepat Layanan KUA</h2>
            </div>
            <div className="divide-y divide-slate-200">
              <button
                type="button"
                onClick={onCreateNew}
                className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FilePlus2 className="w-4 h-4 text-emerald-800 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Input Berkas Nikah Baru</div>
                    <div className="text-xs text-slate-500 truncate">
                      Sekali isi langsung jadi 7 berkas F4 (Word &amp; PDF)
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('calculators')}
                className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Calculator className="w-4 h-4 text-emerald-800 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      Kalkulator Iddah, Umur &amp; Wali
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      Cek masa iddah KHI, batas 19 thn/N5, dan 15 urutan wali
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Archive className="w-4 h-4 text-emerald-800 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      Riwayat Digital &amp; Rekapitulasi
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      Unduh laporan berkala CSV, Word, dan PDF
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              </button>

              {user.role === 'kua_admin' ? (
                <button
                  type="button"
                  onClick={() => onNavigate('accounts')}
                  className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Shield className="w-4 h-4 text-emerald-800 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        Kelola 11 Admin Desa
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        Tambah akun desa, reset password, dan atur status aktif
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserCog className="w-4 h-4 text-emerald-800 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        Profil Petinggi &amp; NIP Desa
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        Atur nama Petinggi, gelar, dan NIP untuk tanda tangan N1
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Band: Data Recap across 11 Villages (KUA Admin) + Latest Filings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {user.role === 'kua_admin' && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Rekap Pemberkasan per Desa ({overview.villageBreakdown.length} Desa)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi berkas nikah dan pejabat penandatangan N1 di Kecamatan Batealit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('accounts')}
                className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer whitespace-nowrap"
              >
                Kelola Akun
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Desa</th>
                    <th className="py-2.5 px-4">Petinggi / Penandatangan</th>
                    <th className="py-2.5 px-4 w-36">Volume</th>
                    <th className="py-2.5 px-4 text-right">Berkas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {overview.villageBreakdown.map((v) => {
                    const pct = Math.round((v.totalFilings / maxVillageCount) * 100);
                    return (
                      <tr key={v.desaName} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {v.desaName}
                          {!v.isActive && (
                            <span className="ml-1.5 text-slate-400 font-normal">(Nonaktif)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 truncate max-w-[200px]">
                          {v.petinggiName}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-700 rounded-full"
                              style={{ width: `${v.totalFilings > 0 ? Math.max(8, pct) : 0}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                          {v.totalFilings}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Latest Marriage Filings */}
        <div
          className={`${
            user.role === 'kua_admin' ? 'lg:col-span-5' : 'lg:col-span-12'
          } bg-white border border-slate-200 rounded-xl overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Berkas Terbaru Masuk</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                5 entri pemberkasan nikah terakhir yang tersimpan di Riwayat Digital.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer whitespace-nowrap"
            >
              Lihat Semua
            </button>
          </div>

          {overview.recentFilings.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-slate-500">Belum ada berkas nikah tersimpan.</p>
              <button
                type="button"
                onClick={onCreateNew}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer"
              >
                Mulai Input Berkas Pertama
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {overview.recentFilings.map((rec) => (
                <div
                  key={rec.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {rec.namaSuami} &amp; {rec.namaIstri}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 mt-0.5 tabular-nums">
                      <span>Desa {rec.desaName}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Akad {rec.tanggalAkad ? formatIndonesianDate(rec.tanggalAkad) : '-'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          rec.statusBerkas === 'Lengkap'
                            ? 'text-emerald-800 font-medium'
                            : 'text-amber-700 font-medium'
                        }
                      >
                        {rec.statusBerkas}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPreviewFiling(rec)}
                    className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Pratinjau F4
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
