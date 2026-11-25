import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  List,
  MapPin,
  Pencil,
  Search,
} from 'lucide-react';
import { BATEALIT_VILLAGES } from '../data/regions';
import type { MarriageFilingRecord, UserProfile } from '../types/marriage';
import { formatIndonesianDate } from '../utils/formatting';
import {
  buildScheduleMonthSummary,
  parseIsoDateUtc,
  toIsoDateUtc,
  type ScheduledWeddingItem,
} from '../utils/marriageCalculators';

interface WeddingScheduleDashboardProps {
  user: UserProfile;
  filings: MarriageFilingRecord[];
  loading: boolean;
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

function getInitialMonthYear(filings: MarriageFilingRecord[], todayIso: string): {
  year: number;
  month: number;
} {
  const upcomingDates = filings
    .map((f) => (f.tanggalAkad || '').trim())
    .filter((d) => Boolean(parseIsoDateUtc(d)) && d >= todayIso)
    .sort();

  const targetIso = upcomingDates[0] || todayIso;
  const dt = parseIsoDateUtc(targetIso) || new Date();
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
  };
}

export function WeddingScheduleDashboard({
  user,
  filings,
  loading,
  onCreateNew,
  onEditFiling,
  onPreviewFiling,
}: WeddingScheduleDashboardProps) {
  const todayIso = useMemo(() => getTodayIso(), []);
  const initialYM = useMemo(() => getInitialMonthYear(filings, todayIso), [filings, todayIso]);

  const [viewYear, setViewYear] = useState(initialYM.year);
  const [viewMonth, setViewMonth] = useState(initialYM.month);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const userChangedMonthRef = useRef(false);

  useEffect(() => {
    if (userChangedMonthRef.current || filings.length === 0) return;
    const target = getInitialMonthYear(filings, todayIso);
    setViewYear(target.year);
    setViewMonth(target.month);
  }, [filings, todayIso]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [search, setSearch] = useState('');
  const [desaFilter, setDesaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredFilings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filings.filter((item) => {
      if (desaFilter !== 'all' && item.desaName.toLowerCase() !== desaFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'all' && item.statusBerkas !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = [
          item.namaSuami,
          item.namaIstri,
          item.namaWali,
          item.desaName,
          item.tempatAkad,
          item.nomorSuratN1,
          item.tanggalAkad,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filings, search, desaFilter, statusFilter]);

  const summary = useMemo(
    () => buildScheduleMonthSummary(filteredFilings, viewYear, viewMonth, todayIso),
    [filteredFilings, viewYear, viewMonth, todayIso],
  );

  // All scheduled events across all months (for list view)
  const allChronologicalEvents = useMemo(() => {
    const items: ScheduledWeddingItem[] = [];
    const todayDt = parseIsoDateUtc(todayIso) || new Date();
    const slotCounts = new Map<string, number>();

    for (const f of filteredFilings) {
      const dateIso = (f.tanggalAkad || '').trim();
      if (!parseIsoDateUtc(dateIso)) continue;
      const normTime = (f.jamAkad || '').trim().toUpperCase();
      if (normTime) {
        const key = `${dateIso}|${normTime}`;
        slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
      }
    }

    for (const record of filteredFilings) {
      const dateIso = (record.tanggalAkad || '').trim();
      const dt = parseIsoDateUtc(dateIso);
      if (!dt) continue;
      const diff = Math.round((dt.getTime() - todayDt.getTime()) / (24 * 60 * 60 * 1000));
      const normTime = (record.jamAkad || '').trim().toUpperCase();
      items.push({
        record,
        dateIso,
        timeSlot: record.jamAkad || 'Belum ditentukan',
        daysFromToday: diff,
        timingLabel:
          diff === 0
            ? 'Hari Ini'
            : diff < 0
              ? `Selesai (${Math.abs(diff)} hari lalu)`
              : `H-${diff}`,
        isPast: diff < 0,
        isToday: diff === 0,
        hasTimeConflict:
          Boolean(normTime) && (slotCounts.get(`${dateIso}|${normTime}`) || 0) > 1,
      });
    }

    return items.sort((a, b) => {
      if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  }, [filteredFilings, todayIso]);

  const activeDayEvents = useMemo(() => {
    if (!selectedDateIso) return summary.monthEvents;
    return summary.monthEvents.filter((e) => e.dateIso === selectedDateIso);
  }, [selectedDateIso, summary.monthEvents]);

  const goPrevMonth = () => {
    userChangedMonthRef.current = true;
    setSelectedDateIso(null);
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    userChangedMonthRef.current = true;
    setSelectedDateIso(null);
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const jumpToCurrentMonth = () => {
    userChangedMonthRef.current = true;
    const dt = parseIsoDateUtc(todayIso) || new Date();
    setViewYear(dt.getUTCFullYear());
    setViewMonth(dt.getUTCMonth() + 1);
    setSelectedDateIso(null);
  };

  const jumpToNextUpcoming = () => {
    userChangedMonthRef.current = true;
    const next = allChronologicalEvents.find((e) => !e.isPast);
    if (!next) return;
    const dt = parseIsoDateUtc(next.dateIso);
    if (!dt) return;
    setViewYear(dt.getUTCFullYear());
    setViewMonth(dt.getUTCMonth() + 1);
    setSelectedDateIso(next.dateIso);
  };

  const desaOptions = useMemo(() => {
    const set = new Set<string>([...BATEALIT_VILLAGES]);
    filings.forEach((f) => {
      if (f.desaName) set.add(f.desaName);
    });
    return Array.from(set).sort();
  }, [filings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
            Dasbor Jadwal Pernikahan
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {user.role === 'kua_admin'
              ? 'Pantau agenda akad nikah seluruh 11 Desa KUA Kecamatan Batealit, hitung mundur hari akad, dan deteksi bentrok jam.'
              : `Agenda akad nikah terjadwal untuk Desa ${user.desaName}, Kecamatan Batealit.`}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Kalender Bulanan</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Daftar Urut Jadwal</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">
            Jadwal {MONTH_NAMES_ID[viewMonth - 1]} {viewYear}
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {summary.totalInMonth}
          </div>
          <div className="text-xs text-slate-500 mt-1">Akad di bulan terpilih</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Akad Mendatang</div>
          <div className="text-2xl font-bold text-emerald-800 tabular-nums mt-1">
            {summary.upcomingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">Hari ini & yang akan datang</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Sudah Terlaksana</div>
          <div className="text-2xl font-bold text-slate-700 tabular-nums mt-1">
            {summary.completedCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">Riwayat akad lewat tanggal</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Potensi Bentrok Jam</div>
          <div
            className={`text-2xl font-bold tabular-nums mt-1 ${
              summary.conflictSlotCount > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {summary.conflictSlotCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary.conflictSlotCount > 0
              ? 'Tanggal & jam sama di bulan ini'
              : 'Tidak ada jam bertumpuk'}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="relative lg:col-span-5">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama catin, wali nikah, tempat akad, desa..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            />
          </div>

          {user.role === 'kua_admin' && (
            <div className="lg:col-span-3">
              <select
                aria-label="Filter Desa"
                value={desaFilter}
                onChange={(e) => setDesaFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              >
                <option value="all">Semua 11 Desa</option>
                {desaOptions.map((d) => (
                  <option key={d} value={d}>
                    Desa {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={user.role === 'kua_admin' ? 'lg:col-span-2' : 'lg:col-span-4'}>
            <select
              aria-label="Filter Status Berkas"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="Lengkap">Lengkap</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div
            className={`${
              user.role === 'kua_admin' ? 'lg:col-span-2' : 'lg:col-span-3'
            } flex justify-end`}
          >
            <button
              type="button"
              onClick={jumpToNextUpcoming}
              disabled={summary.upcomingCount === 0}
              className="w-full px-3 py-2 text-xs font-medium text-emerald-900 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Jadwal Terdekat
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Memuat jadwal akad nikah...
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Monthly Calendar Grid */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Bulan sebelumnya"
                  onClick={goPrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <h2 className="text-base font-bold text-slate-900 min-w-[155px] text-center tabular-nums">
                  {MONTH_NAMES_ID[viewMonth - 1]} {viewYear}
                </h2>
                <button
                  type="button"
                  aria-label="Bulan berikutnya"
                  onClick={goNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={jumpToCurrentMonth}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Bulan Ini
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAY_HEADERS.map((day) => (
                <div
                  key={day}
                  className="py-2.5 text-center text-xs font-semibold text-slate-600"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {summary.cells.map((cell) => {
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
                    className={`min-h-[68px] sm:min-h-[74px] p-2 text-left flex flex-col justify-between transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 ${
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
                      <div className="mt-1 space-y-0.5">
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
          </div>

          {/* Selected Day / Month Agenda Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {selectedDateIso
                    ? `Agenda ${formatIndonesianDate(selectedDateIso)}`
                    : `Semua Jadwal ${MONTH_NAMES_ID[viewMonth - 1]} ${viewYear}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {activeDayEvents.length} jadwal akad nikah
                </p>
              </div>
              {selectedDateIso && (
                <button
                  type="button"
                  onClick={() => setSelectedDateIso(null)}
                  className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer whitespace-nowrap"
                >
                  Lihat Sebulan
                </button>
              )}
            </div>

            {activeDayEvents.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  {selectedDateIso
                    ? 'Tidak ada jadwal akad nikah pada tanggal ini.'
                    : `Belum ada jadwal akad nikah pada ${MONTH_NAMES_ID[viewMonth - 1]} ${viewYear}.`}
                </p>
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
                >
                  Input Berkas & Jadwal Baru
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {activeDayEvents.map((item) => (
                  <div key={item.record.id} className="p-4 space-y-2.5 hover:bg-slate-50/70">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                          <span className="font-semibold text-slate-800">
                            {formatIndonesianDate(item.dateIso)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-emerald-800 font-medium">
                            {item.timeSlot}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              item.isToday
                                ? 'text-emerald-800 font-semibold'
                                : item.isPast
                                  ? 'text-slate-500'
                                  : 'text-slate-700 font-medium'
                            }
                          >
                            {item.timingLabel}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">
                          {item.record.namaSuami} &amp; {item.record.namaIstri}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onPreviewFiling(item.record)}
                          title="Pratinjau & Unduh 7 Berkas F4"
                          className="p-1.5 rounded-md text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditFiling(item.record)}
                          title="Edit Berkas Nikah"
                          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {item.record.tempatAkad || `Desa ${item.record.desaName}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500">
                        <span>Desa {item.record.desaName}</span>
                        <span aria-hidden="true">·</span>
                        <span>Wali: {item.record.namaWali || '-'}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            item.record.statusBerkas === 'Lengkap'
                              ? 'text-emerald-800 font-medium'
                              : 'text-amber-700 font-medium'
                          }
                        >
                          {item.record.statusBerkas}
                        </span>
                      </div>
                    </div>

                    {item.hasTimeConflict && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Perhatian: Terdapat lebih dari 1 akad pada tanggal dan jam ini.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Chronological List View */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {allChronologicalEvents.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Belum ada jadwal pernikahan yang sesuai filter.
              </p>
              <button
                type="button"
                onClick={onCreateNew}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer"
              >
                Input Berkas Baru
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Tanggal &amp; Jam Akad</th>
                    <th className="py-3 px-4">Pasangan Catin</th>
                    <th className="py-3 px-4">Desa &amp; Tempat Akad</th>
                    <th className="py-3 px-4">Wali Nikah</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {allChronologicalEvents.map((item) => (
                    <tr key={item.record.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <div className="font-semibold text-slate-900 tabular-nums">
                          {formatIndonesianDate(item.dateIso)}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono tabular-nums">
                          <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                          <span>{item.timeSlot}</span>
                          <span>·</span>
                          <span
                            className={
                              item.isToday
                                ? 'text-emerald-800 font-semibold'
                                : item.isPast
                                  ? 'text-slate-500'
                                  : 'text-emerald-700 font-medium'
                            }
                          >
                            {item.timingLabel}
                          </span>
                        </div>
                        {item.hasTimeConflict && (
                          <div className="text-xs text-amber-800 font-medium mt-1">
                            Bentrok jam akad
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-900">
                          {item.record.namaSuami} &amp; {item.record.namaIstri}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {item.record.nomorSuratN1 || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-slate-800">Desa {item.record.desaName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 max-w-[240px] truncate">
                          {item.record.tempatAkad || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-slate-700">
                        {item.record.namaWali || '-'}
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            item.record.statusBerkas === 'Lengkap'
                              ? 'text-emerald-800'
                              : 'text-amber-700'
                          }`}
                        >
                          {item.record.statusBerkas}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onPreviewFiling(item.record)}
                            className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer"
                          >
                            Pratinjau F4
                          </button>
                          <span className="text-slate-300" aria-hidden="true">
                            |
                          </span>
                          <button
                            type="button"
                            onClick={() => onEditFiling(item.record)}
                            className="text-xs font-medium text-slate-700 hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
