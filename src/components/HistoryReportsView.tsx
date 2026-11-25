import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { BATEALIT_VILLAGES } from '../data/regions';
import type { MarriageFilingRecord, UserProfile } from '../types/marriage';
import {
  buildCsvRecap,
  formatIndonesianDate,
  getMonthOptions,
} from '../utils/formatting';
import { generateRecapWordBlob } from '../utils/wordGenerator';
import { createRecapPdfDocument } from '../utils/pdfGenerator';

interface HistoryReportsViewProps {
  user: UserProfile;
  filings: MarriageFilingRecord[];
  loading: boolean;
  onCreateNew: () => void;
  onEditFiling: (record: MarriageFilingRecord) => void;
  onPreviewFiling: (record: MarriageFilingRecord) => void;
  onDeleteFiling: (id: number) => Promise<void>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function HistoryReportsView({
  user,
  filings,
  loading,
  onCreateNew,
  onEditFiling,
  onPreviewFiling,
  onDeleteFiling,
}: HistoryReportsViewProps) {
  const [search, setSearch] = useState('');
  const [desaFilter, setDesaFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Lengkap' | 'Draft'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const months = getMonthOptions();

  const availableYears = useMemo(() => {
    const yrs = new Set<string>(['2026', '2025']);
    for (const f of filings) {
      if (f.tanggalAkad && /^\d{4}/.test(f.tanggalAkad)) yrs.add(f.tanggalAkad.slice(0, 4));
      if (f.createdAt && /^\d{4}/.test(f.createdAt)) yrs.add(f.createdAt.slice(0, 4));
    }
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [filings]);

  const filtered = useMemo(() => {
    return filings.filter((rec) => {
      if (desaFilter !== 'all' && rec.desaName.toLowerCase() !== desaFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'all' && rec.statusBerkas !== statusFilter) {
        return false;
      }
      const dateBasis = rec.tanggalAkad || rec.createdAt.slice(0, 10);
      if (yearFilter !== 'all' && !dateBasis.startsWith(yearFilter)) {
        return false;
      }
      if (monthFilter !== 'all' && dateBasis.slice(5, 7) !== monthFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${rec.namaSuami} ${rec.nikSuami} ${rec.namaIstri} ${rec.nikIstri} ${rec.nomorSuratN1} ${rec.desaName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filings, desaFilter, statusFilter, yearFilter, monthFilter, search]);

  const stats = useMemo(() => {
    const lengkap = filtered.filter((f) => f.statusBerkas === 'Lengkap').length;
    const draft = filtered.filter((f) => f.statusBerkas === 'Draft').length;
    const uniqueDesa = new Set(filtered.map((f) => f.desaName)).size;
    return { total: filtered.length, lengkap, draft, uniqueDesa };
  }, [filtered]);

  const periodLabel = useMemo(() => {
    const mName = months.find((m) => m.value === monthFilter)?.label;
    if (mName && yearFilter !== 'all') return `${mName} ${yearFilter}`;
    if (mName) return `Bulan ${mName}`;
    if (yearFilter !== 'all') return `Tahun ${yearFilter}`;
    return 'Semua Periode';
  }, [monthFilter, yearFilter, months]);

  const desaLabel =
    user.role === 'village_admin'
      ? `Desa ${user.desaName}`
      : desaFilter === 'all'
        ? 'Seluruh 11 Desa Kecamatan Batealit'
        : `Desa ${desaFilter}`;

  const handleExportCsv = () => {
    const csv = buildCsvRecap(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `Rekapitulasi_Nikah_KUA_Batealit_${periodLabel.replace(/\s+/g, '_')}.csv`);
  };

  const handleExportWord = async () => {
    setExporting('word');
    try {
      const blob = await generateRecapWordBlob(filtered, periodLabel, desaLabel);
      downloadBlob(blob, `Laporan_Berkala_KUA_Batealit_${periodLabel.replace(/\s+/g, '_')}.docx`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = () => {
    setExporting('pdf');
    try {
      const pdf = createRecapPdfDocument(filtered, periodLabel, desaLabel);
      pdf.save(`Laporan_Berkala_KUA_Batealit_${periodLabel.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Riwayat Digital & Rekapitulasi Laporan Berkala
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          {user.role === 'kua_admin'
            ? 'Seluruh arsip pemberkasan nikah dari 11 Desa Kecamatan Batealit.'
            : `Arsip pemberkasan nikah Desa ${user.desaName}, Kecamatan Batealit.`}
        </p>
      </div>

      {/* 4-column unboxed KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Total Berkas Tercatat</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.total}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{periodLabel}</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Berkas Lengkap</div>
          <div className="mt-1 text-2xl font-bold text-emerald-800 font-mono tabular-nums">
            {stats.lengkap}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Siap cetak F4 & daftar KUA</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Berkas Draft</div>
          <div className="mt-1 text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {stats.draft}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Menunggu pelengkapan data</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Cakupan Desa</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.uniqueDesa}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Wilayah KUA Batealit</div>
        </div>
      </div>

      {/* Filters & Periodic Report Export Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className={user.role === 'kua_admin' ? 'sm:col-span-2 lg:col-span-4 relative' : 'sm:col-span-2 lg:col-span-5 relative'}>
            <label htmlFor="history-search" className="sr-only">
              Cari nama calon pengantin, NIK, atau nomor surat
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="history-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama catin, NIK 16 digit, atau nomor surat..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
          </div>

          {user.role === 'kua_admin' && (
            <div className="lg:col-span-2">
              <label htmlFor="filter-desa" className="sr-only">
                Filter Desa
              </label>
              <select
                id="filter-desa"
                value={desaFilter}
                onChange={(e) => setDesaFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              >
                <option value="all">Semua 11 Desa</option>
                {BATEALIT_VILLAGES.map((d) => (
                  <option key={d} value={d}>
                    Desa {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={user.role === 'kua_admin' ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <label htmlFor="filter-month" className="sr-only">
              Filter Bulan
            </label>
            <select
              id="filter-month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="all">Semua Bulan</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter Tahun"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-mono tabular-nums focus:border-emerald-700 focus:outline-none"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter Status Berkas"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Lengkap' | 'Draft')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="Lengkap">Lengkap</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Periodic Report Download Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Unduh rekapitulasi berkala sesuai filter aktif ({filtered.length} baris · {periodLabel}):
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>Rekap Excel (.csv)</span>
            </button>
            <button
              type="button"
              disabled={filtered.length === 0 || exporting !== null}
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>{exporting === 'word' ? 'Menyusun...' : 'Laporan Word (.docx)'}</span>
            </button>
            <button
              type="button"
              disabled={filtered.length === 0 || exporting !== null}
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>Laporan PDF (.pdf)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat riwayat berkas digital...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">
              Belum ada data berkas nikah yang sesuai dengan filter ini.
            </p>
            <p className="text-xs text-slate-500">
              Tambahkan berkas nikah baru agar langsung tersimpan di riwayat digital dan siap cetak F4.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Input Berkas Pertama</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Desa & No. Surat</th>
                  <th className="py-3 px-4">Calon Suami</th>
                  <th className="py-3 px-4">Calon Istri</th>
                  <th className="py-3 px-4">Rencana Akad</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <div className="font-semibold text-slate-900">Desa {rec.desaName}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {rec.nomorSuratN1 || 'Tanpa nomor surat'}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="font-medium text-slate-900">{rec.namaSuami}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        {rec.nikSuami}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="font-medium text-slate-900">{rec.namaIstri}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        {rec.nikIstri}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="text-slate-900 font-mono tabular-nums text-xs">
                        {rec.tanggalAkad ? formatIndonesianDate(rec.tanggalAkad) : '-'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {rec.jamAkad || '-'} · {rec.createdByUsername}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <span
                        className={`text-xs font-semibold ${
                          rec.statusBerkas === 'Lengkap' ? 'text-emerald-800' : 'text-amber-700'
                        }`}
                      >
                        {rec.statusBerkas}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      {confirmDeleteId === rec.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteFiling(rec.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPreviewFiling(rec)}
                            aria-label={`Pratinjau dan unduh berkas ${rec.namaSuami} dan ${rec.namaIstri}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Berkas F4</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditFiling(rec)}
                            aria-label={`Edit berkas ${rec.namaSuami} dan ${rec.namaIstri}`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(rec.id)}
                            aria-label={`Hapus berkas ${rec.namaSuami} dan ${rec.namaIstri}`}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
