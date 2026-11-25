import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  FileText,
  Save,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { BATEALIT_VILLAGES } from '../data/regions';
import type {
  AddressData,
  MarriageFilingForm,
  UserProfile,
} from '../types/marriage';
import {
  capitalizeEachWord,
  composeFullAddress,
  createDemoFilingForm,
  sanitizeNik,
  validateFilingForm,
  validateNik,
} from '../utils/formatting';
import { AddressFieldGroup } from './AddressFieldGroup';

interface FilingFormViewProps {
  user: UserProfile;
  form: MarriageFilingForm;
  editingId: number | null;
  saving: boolean;
  saveFeedback: string | null;
  saveError: string | null;
  onChange: (next: MarriageFilingForm) => void;
  onSave: (status: 'Lengkap' | 'Draft') => Promise<void>;
  onOpenPreview: () => void;
  onResetNew: () => void;
}

type FormSectionKey = 'akad' | 'suami' | 'istri' | 'wali_kuasa';

const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];

function NikInput({
  id,
  label,
  value,
  required = false,
  externalError,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  externalError?: string;
  onChange: (cleanNik: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const check = validateNik(value, required);
  const showError = externalError || (touched && !check.valid ? check.error : null);
  const isComplete = value.length === 16;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="block text-xs font-medium text-slate-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        <span
          className={`text-xs font-mono tabular-nums ${
            isComplete
              ? 'text-emerald-700 font-medium'
              : value.length > 0
                ? 'text-amber-700'
                : 'text-slate-400'
          }`}
        >
          {value.length}/16 digit
        </span>
      </div>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        maxLength={16}
        value={value}
        onBlur={() => setTouched(true)}
        onChange={(e) => onChange(sanitizeNik(e.target.value))}
        placeholder="Tepat 16 digit NIK"
        aria-invalid={Boolean(showError)}
        className={`w-full rounded-lg border px-3 py-2 text-sm font-mono tabular-nums text-slate-900 bg-white focus:outline-none focus:ring-2 ${
          showError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-300 focus:border-emerald-700 focus:ring-emerald-700/15'
        }`}
      />
      {showError && <p className="mt-1 text-xs text-red-700">{showError}</p>}
    </div>
  );
}

export function FilingFormView({
  user,
  form,
  editingId,
  saving,
  saveFeedback,
  saveError,
  onChange,
  onSave,
  onOpenPreview,
  onResetNew,
}: FilingFormViewProps) {
  const [activeSection, setActiveSection] = useState<FormSectionKey>('akad');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const updateForm = (updater: (prev: MarriageFilingForm) => MarriageFilingForm) => {
    const next = updater(form);
    onChange(next);
  };

  const syncSuamiAddress = (nextAddr: AddressData) => {
    updateForm((prev) => {
      const synced: MarriageFilingForm = {
        ...prev,
        suami: { ...prev.suami, alamat: nextAddr },
      };
      if (prev.ayahSuami.alamat.sameAsCatin) {
        synced.ayahSuami = {
          ...prev.ayahSuami,
          alamat: { ...nextAddr, sameAsCatin: true, alamatLengkap: composeFullAddress(nextAddr) },
        };
      }
      if (prev.ibuSuami.alamat.sameAsCatin) {
        synced.ibuSuami = {
          ...prev.ibuSuami,
          alamat: { ...nextAddr, sameAsCatin: true, alamatLengkap: composeFullAddress(nextAddr) },
        };
      }
      return synced;
    });
  };

  const syncIstriAddress = (nextAddr: AddressData) => {
    updateForm((prev) => {
      const synced: MarriageFilingForm = {
        ...prev,
        istri: { ...prev.istri, alamat: nextAddr },
      };
      if (prev.ayahIstri.alamat.sameAsCatin) {
        synced.ayahIstri = {
          ...prev.ayahIstri,
          alamat: { ...nextAddr, sameAsCatin: true, alamatLengkap: composeFullAddress(nextAddr) },
        };
      }
      if (prev.ibuIstri.alamat.sameAsCatin) {
        synced.ibuIstri = {
          ...prev.ibuIstri,
          alamat: { ...nextAddr, sameAsCatin: true, alamatLengkap: composeFullAddress(nextAddr) },
        };
      }
      if (prev.waliNikah.alamat.sameAsCatin) {
        synced.waliNikah = {
          ...prev.waliNikah,
          alamat: { ...nextAddr, sameAsCatin: true, alamatLengkap: composeFullAddress(nextAddr) },
        };
      }
      return synced;
    });
  };

  const handleSaveClick = async (status: 'Lengkap' | 'Draft') => {
    if (status === 'Lengkap') {
      const errs = validateFilingForm(form);
      setFormErrors(errs);
      if (Object.keys(errs).length > 0) {
        const firstKey = Object.keys(errs)[0];
        if (firstKey.startsWith('akad.')) setActiveSection('akad');
        else if (firstKey.startsWith('suami.') || firstKey.startsWith('ayahSuami.') || firstKey.startsWith('ibuSuami.'))
          setActiveSection('suami');
        else if (firstKey.startsWith('istri.') || firstKey.startsWith('ayahIstri.') || firstKey.startsWith('ibuIstri.'))
          setActiveSection('istri');
        else setActiveSection('wali_kuasa');
        return;
      }
    } else {
      setFormErrors({});
    }
    await onSave(status);
  };

  const handleFillDemo = () => {
    const demo = createDemoFilingForm(form.penandatangan);
    setFormErrors({});
    onChange(demo);
  };

  const copyAyahIstriToWali = () => {
    updateForm((prev) => ({
      ...prev,
      waliNikah: {
        nama: prev.ayahIstri.nama,
        bin: prev.ayahIstri.binBinti,
        nik: prev.ayahIstri.nik,
        tempatLahir: prev.ayahIstri.tempatLahir,
        tanggalLahir: prev.ayahIstri.tanggalLahir,
        hubunganWali: 'Ayah Kandung',
        alamat: { ...prev.ayahIstri.alamat },
      },
    }));
  };

  const copyPartyToPemberiKuasa = (source: 'suami' | 'istri' | 'wali') => {
    updateForm((prev) => {
      if (source === 'suami') {
        return {
          ...prev,
          pemberiKuasa: {
            nama: prev.suami.nama,
            nik: prev.suami.nik,
            alamat: prev.suami.alamat.alamatLengkap,
          },
        };
      }
      if (source === 'istri') {
        return {
          ...prev,
          pemberiKuasa: {
            nama: prev.istri.nama,
            nik: prev.istri.nik,
            alamat: prev.istri.alamat.alamatLengkap,
          },
        };
      }
      return {
        ...prev,
        pemberiKuasa: {
          nama: prev.waliNikah.nama,
          nik: prev.waliNikah.nik,
          alamat: prev.waliNikah.alamat.alamatLengkap,
        },
      };
    });
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15';

  const sections: Array<{ key: FormSectionKey; num: string; label: string; icon: React.ReactNode }> = [
    { key: 'akad', num: '01', label: 'Akad & Pengantar', icon: <FileText className="w-4 h-4" /> },
    { key: 'suami', num: '02', label: 'Calon Suami & Ortu', icon: <Users className="w-4 h-4" /> },
    { key: 'istri', num: '03', label: 'Calon Istri & Ortu', icon: <Users className="w-4 h-4" /> },
    { key: 'wali_kuasa', num: '04', label: 'Wali Nikah & Kuasa', icon: <UserCheck className="w-4 h-4" /> },
  ];

  const errorEntries = Object.entries(formErrors);

  return (
    <div className="space-y-6">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {editingId ? `Edit Berkas Nikah #${editingId}` : 'Input Data Pemberkasan Nikah Baru'}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Format teks otomatis Capitalize Each Word (kecuali RT dan RW) · NIK wajib tepat 16 digit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleFillDemo}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Isi Data Contoh</span>
          </button>
          {editingId && (
            <button
              type="button"
              onClick={onResetNew}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Buat Berkas Baru
            </button>
          )}
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Pratinjau 7 Berkas (F4)</span>
          </button>
        </div>
      </div>

      {/* Feedback & validation banners */}
      {saveFeedback && (
        <div
          role="status"
          className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
        >
          {saveError}
        </div>
      )}

      {errorEntries.length > 0 && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 space-y-1"
        >
          <p className="font-semibold">Mohon lengkapi atau perbaiki isian berikut sebelum menyimpan:</p>
          <ul className="list-disc pl-5 text-xs space-y-0.5">
            {errorEntries.map(([k, msg]) => (
              <li key={k}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Section tabs */}
      <div
        role="tablist"
        aria-label="Tahapan Input Berkas Nikah"
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-1 bg-slate-100 rounded-xl"
      >
        {sections.map((sec) => {
          const active = activeSection === sec.key;
          return (
            <button
              key={sec.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSection(sec.key)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-white text-emerald-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="font-mono text-xs opacity-70">{sec.num}.</span>
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section 1: Data Akad & Pengantar */}
      {activeSection === 'akad' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Informasi Desa Penerbit & Rencana Akad Nikah
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data ini mengisi kop Model N1, tujuan Model N2, jadwal akad SPTJM, dan Surat Kuasa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="akad-desa" className="block text-xs font-medium text-slate-700 mb-1">
                Kantor Desa / Kelurahan Penerbit
              </label>
              {user.role === 'kua_admin' ? (
                <select
                  id="akad-desa"
                  value={form.akad.desaPenerbit}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      akad: { ...prev.akad, desaPenerbit: e.target.value },
                      penandatangan: { ...prev.penandatangan, desaName: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  {BATEALIT_VILLAGES.map((d) => (
                    <option key={d} value={d}>
                      Desa {d}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="akad-desa"
                  type="text"
                  readOnly
                  value={form.akad.desaPenerbit}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
              )}
            </div>

            <div>
              <label htmlFor="akad-nomor" className="block text-xs font-medium text-slate-700 mb-1">
                Nomor Surat Pengantar (Model N1)
              </label>
              <input
                id="akad-nomor"
                type="text"
                value={form.akad.nomorSuratN1}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: { ...prev.akad, nomorSuratN1: e.target.value },
                  }))
                }
                placeholder="Contoh: 474.2 / 145 / XI / 2026"
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label htmlFor="akad-tgl-surat" className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Pembuatan Surat
              </label>
              <input
                id="akad-tgl-surat"
                type="date"
                value={form.akad.tanggalSurat}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: { ...prev.akad, tanggalSurat: e.target.value },
                  }))
                }
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="akad-tgl" className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Rencana Akad Nikah <span className="text-red-600">*</span>
              </label>
              <input
                id="akad-tgl"
                type="date"
                value={form.akad.tanggalAkad}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: { ...prev.akad, tanggalAkad: e.target.value },
                  }))
                }
                className={`${inputClass} font-mono tabular-nums`}
              />
              {formErrors['akad.tanggalAkad'] && (
                <p className="mt-1 text-xs text-red-700">{formErrors['akad.tanggalAkad']}</p>
              )}
            </div>

            <div>
              <label htmlFor="akad-jam" className="block text-xs font-medium text-slate-700 mb-1">
                Jam Akad Nikah
              </label>
              <input
                id="akad-jam"
                type="text"
                value={form.akad.jamAkad}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: { ...prev.akad, jamAkad: e.target.value },
                  }))
                }
                placeholder="Contoh: 09.00 WIB"
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="akad-pemohon" className="block text-xs font-medium text-slate-700 mb-1">
                Pemohon pada Formulir N2
              </label>
              <select
                id="akad-pemohon"
                value={form.akad.pemohonN2}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: {
                      ...prev.akad,
                      pemohonN2: e.target.value as MarriageFilingForm['akad']['pemohonN2'],
                    },
                  }))
                }
                className={inputClass}
              >
                <option value="Calon Suami">Calon Suami</option>
                <option value="Calon Istri">Calon Istri</option>
                <option value="Wali Nikah">Wali Nikah</option>
                <option value="Penerima Kuasa">Penerima Kuasa (Modin)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="akad-tempat" className="block text-xs font-medium text-slate-700 mb-1">
                Tempat Akad Nikah
              </label>
              <input
                id="akad-tempat"
                type="text"
                value={form.akad.tempatAkad}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: { ...prev.akad, tempatAkad: capitalizeEachWord(e.target.value) },
                  }))
                }
                placeholder="Contoh: Rumah Mempelai Wanita, Dukuh Krajan RT 02 RW 01"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="akad-mahar" className="block text-xs font-medium text-slate-700 mb-1">
                Mas Kawin / Mahar
              </label>
              <input
                id="akad-mahar"
                type="text"
                value={form.akad.masKawin}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: { ...prev.akad, masKawin: capitalizeEachWord(e.target.value) },
                  }))
                }
                placeholder="Contoh: Seperangkat Alat Sholat Dan Emas 5 Gram Tunai"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <label htmlFor="akad-kua" className="block text-xs font-medium text-slate-700 mb-1">
                Kepala KUA Kecamatan Tujuan (Model N2)
              </label>
              <input
                id="akad-kua"
                type="text"
                value={form.akad.namaKuaTujuan}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: { ...prev.akad, namaKuaTujuan: capitalizeEachWord(e.target.value) },
                  }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="akad-kua-di" className="block text-xs font-medium text-slate-700 mb-1">
                Lokasi KUA Tujuan (di ...)
              </label>
              <input
                id="akad-kua-di"
                type="text"
                value={form.akad.alamatKuaTujuan}
                onChange={(e) =>
                  updateForm((prev) => ({
                    ...prev,
                    akad: { ...prev.akad, alamatKuaTujuan: capitalizeEachWord(e.target.value) },
                  }))
                }
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Calon Suami & Orang Tua */}
      {activeSection === 'suami' && (
        <div className="space-y-6">
          {/* Calon Suami */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">A. Data Calon Suami</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="suami-nama" className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap dan Alias <span className="text-red-600">*</span>
                </label>
                <input
                  id="suami-nama"
                  type="text"
                  value={form.suami.nama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  placeholder="Contoh: Ahmad Fauzi"
                  className={inputClass}
                />
                {formErrors['suami.nama'] && (
                  <p className="mt-1 text-xs text-red-700">{formErrors['suami.nama']}</p>
                )}
              </div>

              <div>
                <label htmlFor="suami-bin" className="block text-xs font-medium text-slate-700 mb-1">
                  Bin (Nama Ayah)
                </label>
                <input
                  id="suami-bin"
                  type="text"
                  value={form.suami.binBinti}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, binBinti: capitalizeEachWord(e.target.value) },
                      ayahSuami: prev.ayahSuami.nama
                        ? prev.ayahSuami
                        : { ...prev.ayahSuami, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  placeholder="Nama ayah calon suami"
                  className={inputClass}
                />
              </div>

              <NikInput
                id="suami-nik"
                label="NIK Calon Suami"
                required
                value={form.suami.nik}
                externalError={formErrors['suami.nik']}
                onChange={(nik) =>
                  updateForm((prev) => ({ ...prev, suami: { ...prev.suami, nik } }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="suami-tl" className="block text-xs font-medium text-slate-700 mb-1">
                  Tempat Lahir
                </label>
                <input
                  id="suami-tl"
                  type="text"
                  value={form.suami.tempatLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, tempatLahir: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="suami-tgll" className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  id="suami-tgll"
                  type="date"
                  value={form.suami.tanggalLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, tanggalLahir: e.target.value },
                    }))
                  }
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>

              <div>
                <label htmlFor="suami-wn" className="block text-xs font-medium text-slate-700 mb-1">
                  Kewarganegaraan
                </label>
                <input
                  id="suami-wn"
                  type="text"
                  value={form.suami.kewarganegaraan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, kewarganegaraan: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="suami-agama" className="block text-xs font-medium text-slate-700 mb-1">
                  Agama
                </label>
                <select
                  id="suami-agama"
                  value={form.suami.agama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, agama: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  {AGAMA_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="suami-pek" className="block text-xs font-medium text-slate-700 mb-1">
                  Pekerjaan
                </label>
                <input
                  id="suami-pek"
                  type="text"
                  value={form.suami.pekerjaan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, pekerjaan: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  placeholder="Contoh: Karyawan Swasta"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="suami-status" className="block text-xs font-medium text-slate-700 mb-1">
                  Status Perkawinan
                </label>
                <select
                  id="suami-status"
                  value={form.suami.statusPerkawinan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, statusPerkawinan: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  <option value="Jejaka">Jejaka</option>
                  <option value="Duda">Duda</option>
                  <option value="Beristri">Beristri</option>
                </select>
              </div>

              <div>
                <label htmlFor="suami-hp" className="block text-xs font-medium text-slate-700 mb-1">
                  No. HP Calon Suami (untuk Model N2)
                </label>
                <input
                  id="suami-hp"
                  type="tel"
                  value={form.suami.noHp}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      suami: { ...prev.suami, noHp: e.target.value.replace(/[^0-9+\-\s]/g, '') },
                    }))
                  }
                  placeholder="0812xxxxxxxx"
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>

            <AddressFieldGroup
              idPrefix="addr-suami"
              label="Alamat Calon Suami"
              value={form.suami.alamat}
              onChange={syncSuamiAddress}
            />
          </div>

          {/* Ayah Calon Suami */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">B. Data Ayah Calon Suami</h3>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!form.ayahSuami.masihHidup}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahSuami: { ...prev.ayahSuami, masihHidup: !e.target.checked },
                    }))
                  }
                  className="rounded border-slate-300 text-emerald-800"
                />
                <span>Almarhum (Alm.)</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ayah-suami-nama" className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap dan Alias
                </label>
                <input
                  id="ayah-suami-nama"
                  type="text"
                  value={form.ayahSuami.nama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahSuami: { ...prev.ayahSuami, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ayah-suami-bin" className="block text-xs font-medium text-slate-700 mb-1">
                  Bin (untuk Model N5)
                </label>
                <input
                  id="ayah-suami-bin"
                  type="text"
                  value={form.ayahSuami.binBinti}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahSuami: { ...prev.ayahSuami, binBinti: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <NikInput
                id="ayah-suami-nik"
                label="NIK Ayah Calon Suami"
                value={form.ayahSuami.nik}
                externalError={formErrors['ayahSuami.nik']}
                onChange={(nik) =>
                  updateForm((prev) => ({ ...prev, ayahSuami: { ...prev.ayahSuami, nik } }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="ayah-suami-tl" className="block text-xs font-medium text-slate-700 mb-1">
                  Tempat Lahir
                </label>
                <input
                  id="ayah-suami-tl"
                  type="text"
                  value={form.ayahSuami.tempatLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahSuami: { ...prev.ayahSuami, tempatLahir: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ayah-suami-tgll" className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  id="ayah-suami-tgll"
                  type="date"
                  value={form.ayahSuami.tanggalLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahSuami: { ...prev.ayahSuami, tanggalLahir: e.target.value },
                    }))
                  }
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="ayah-suami-agama" className="block text-xs font-medium text-slate-700 mb-1">
                  Agama
                </label>
                <select
                  id="ayah-suami-agama"
                  value={form.ayahSuami.agama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahSuami: { ...prev.ayahSuami, agama: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  {AGAMA_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ayah-suami-pek" className="block text-xs font-medium text-slate-700 mb-1">
                  Pekerjaan
                </label>
                <input
                  id="ayah-suami-pek"
                  type="text"
                  value={form.ayahSuami.pekerjaan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahSuami: { ...prev.ayahSuami, pekerjaan: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <AddressFieldGroup
              idPrefix="addr-ayah-suami"
              label="Alamat Ayah Calon Suami"
              value={form.ayahSuami.alamat}
              onChange={(alamat) =>
                updateForm((prev) => ({ ...prev, ayahSuami: { ...prev.ayahSuami, alamat } }))
              }
              sameAsOption={{
                label: 'Sama dengan alamat Calon Suami',
                sourceAddress: form.suami.alamat,
              }}
            />
          </div>

          {/* Ibu Calon Suami */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">C. Data Ibu Calon Suami</h3>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!form.ibuSuami.masihHidup}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuSuami: { ...prev.ibuSuami, masihHidup: !e.target.checked },
                    }))
                  }
                  className="rounded border-slate-300 text-emerald-800"
                />
                <span>Almarhumah (Almh.)</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ibu-suami-nama" className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap dan Alias
                </label>
                <input
                  id="ibu-suami-nama"
                  type="text"
                  value={form.ibuSuami.nama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuSuami: { ...prev.ibuSuami, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ibu-suami-binti" className="block text-xs font-medium text-slate-700 mb-1">
                  Binti (untuk Model N5)
                </label>
                <input
                  id="ibu-suami-binti"
                  type="text"
                  value={form.ibuSuami.binBinti}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuSuami: { ...prev.ibuSuami, binBinti: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <NikInput
                id="ibu-suami-nik"
                label="NIK Ibu Calon Suami"
                value={form.ibuSuami.nik}
                externalError={formErrors['ibuSuami.nik']}
                onChange={(nik) =>
                  updateForm((prev) => ({ ...prev, ibuSuami: { ...prev.ibuSuami, nik } }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="ibu-suami-tl" className="block text-xs font-medium text-slate-700 mb-1">
                  Tempat Lahir
                </label>
                <input
                  id="ibu-suami-tl"
                  type="text"
                  value={form.ibuSuami.tempatLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuSuami: { ...prev.ibuSuami, tempatLahir: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ibu-suami-tgll" className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  id="ibu-suami-tgll"
                  type="date"
                  value={form.ibuSuami.tanggalLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuSuami: { ...prev.ibuSuami, tanggalLahir: e.target.value },
                    }))
                  }
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="ibu-suami-agama" className="block text-xs font-medium text-slate-700 mb-1">
                  Agama
                </label>
                <select
                  id="ibu-suami-agama"
                  value={form.ibuSuami.agama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuSuami: { ...prev.ibuSuami, agama: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  {AGAMA_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ibu-suami-pek" className="block text-xs font-medium text-slate-700 mb-1">
                  Pekerjaan
                </label>
                <input
                  id="ibu-suami-pek"
                  type="text"
                  value={form.ibuSuami.pekerjaan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuSuami: { ...prev.ibuSuami, pekerjaan: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <AddressFieldGroup
              idPrefix="addr-ibu-suami"
              label="Alamat Ibu Calon Suami"
              value={form.ibuSuami.alamat}
              onChange={(alamat) =>
                updateForm((prev) => ({ ...prev, ibuSuami: { ...prev.ibuSuami, alamat } }))
              }
              sameAsOption={{
                label: 'Sama dengan alamat Calon Suami',
                sourceAddress: form.suami.alamat,
              }}
            />
          </div>
        </div>
      )}

      {/* Section 3: Calon Istri & Orang Tua */}
      {activeSection === 'istri' && (
        <div className="space-y-6">
          {/* Calon Istri */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">A. Data Calon Istri</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="istri-nama" className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap dan Alias <span className="text-red-600">*</span>
                </label>
                <input
                  id="istri-nama"
                  type="text"
                  value={form.istri.nama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  placeholder="Contoh: Nurul Hidayah"
                  className={inputClass}
                />
                {formErrors['istri.nama'] && (
                  <p className="mt-1 text-xs text-red-700">{formErrors['istri.nama']}</p>
                )}
              </div>

              <div>
                <label htmlFor="istri-binti" className="block text-xs font-medium text-slate-700 mb-1">
                  Binti (Nama Ayah)
                </label>
                <input
                  id="istri-binti"
                  type="text"
                  value={form.istri.binBinti}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, binBinti: capitalizeEachWord(e.target.value) },
                      ayahIstri: prev.ayahIstri.nama
                        ? prev.ayahIstri
                        : { ...prev.ayahIstri, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  placeholder="Nama ayah calon istri"
                  className={inputClass}
                />
              </div>

              <NikInput
                id="istri-nik"
                label="NIK Calon Istri"
                required
                value={form.istri.nik}
                externalError={formErrors['istri.nik']}
                onChange={(nik) =>
                  updateForm((prev) => ({ ...prev, istri: { ...prev.istri, nik } }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="istri-tl" className="block text-xs font-medium text-slate-700 mb-1">
                  Tempat Lahir
                </label>
                <input
                  id="istri-tl"
                  type="text"
                  value={form.istri.tempatLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, tempatLahir: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="istri-tgll" className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  id="istri-tgll"
                  type="date"
                  value={form.istri.tanggalLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, tanggalLahir: e.target.value },
                    }))
                  }
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="istri-wn" className="block text-xs font-medium text-slate-700 mb-1">
                  Kewarganegaraan
                </label>
                <input
                  id="istri-wn"
                  type="text"
                  value={form.istri.kewarganegaraan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, kewarganegaraan: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="istri-agama" className="block text-xs font-medium text-slate-700 mb-1">
                  Agama
                </label>
                <select
                  id="istri-agama"
                  value={form.istri.agama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, agama: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  {AGAMA_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="istri-pek" className="block text-xs font-medium text-slate-700 mb-1">
                  Pekerjaan
                </label>
                <input
                  id="istri-pek"
                  type="text"
                  value={form.istri.pekerjaan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, pekerjaan: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="istri-status" className="block text-xs font-medium text-slate-700 mb-1">
                  Status Perkawinan
                </label>
                <select
                  id="istri-status"
                  value={form.istri.statusPerkawinan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, statusPerkawinan: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  <option value="Perawan">Perawan</option>
                  <option value="Janda">Janda</option>
                </select>
              </div>
              <div>
                <label htmlFor="istri-hp" className="block text-xs font-medium text-slate-700 mb-1">
                  No. HP Calon Istri (untuk Model N2)
                </label>
                <input
                  id="istri-hp"
                  type="tel"
                  value={form.istri.noHp}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      istri: { ...prev.istri, noHp: e.target.value.replace(/[^0-9+\-\s]/g, '') },
                    }))
                  }
                  placeholder="0856xxxxxxxx"
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>

            <AddressFieldGroup
              idPrefix="addr-istri"
              label="Alamat Calon Istri"
              value={form.istri.alamat}
              onChange={syncIstriAddress}
            />
          </div>

          {/* Ayah Calon Istri */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">B. Data Ayah Calon Istri</h3>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!form.ayahIstri.masihHidup}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahIstri: { ...prev.ayahIstri, masihHidup: !e.target.checked },
                    }))
                  }
                  className="rounded border-slate-300 text-emerald-800"
                />
                <span>Almarhum (Alm.)</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ayah-istri-nama" className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap dan Alias
                </label>
                <input
                  id="ayah-istri-nama"
                  type="text"
                  value={form.ayahIstri.nama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahIstri: { ...prev.ayahIstri, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ayah-istri-bin" className="block text-xs font-medium text-slate-700 mb-1">
                  Bin (untuk Model N5)
                </label>
                <input
                  id="ayah-istri-bin"
                  type="text"
                  value={form.ayahIstri.binBinti}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahIstri: { ...prev.ayahIstri, binBinti: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <NikInput
                id="ayah-istri-nik"
                label="NIK Ayah Calon Istri"
                value={form.ayahIstri.nik}
                externalError={formErrors['ayahIstri.nik']}
                onChange={(nik) =>
                  updateForm((prev) => ({ ...prev, ayahIstri: { ...prev.ayahIstri, nik } }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="ayah-istri-tl" className="block text-xs font-medium text-slate-700 mb-1">
                  Tempat Lahir
                </label>
                <input
                  id="ayah-istri-tl"
                  type="text"
                  value={form.ayahIstri.tempatLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahIstri: { ...prev.ayahIstri, tempatLahir: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ayah-istri-tgll" className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  id="ayah-istri-tgll"
                  type="date"
                  value={form.ayahIstri.tanggalLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahIstri: { ...prev.ayahIstri, tanggalLahir: e.target.value },
                    }))
                  }
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="ayah-istri-agama" className="block text-xs font-medium text-slate-700 mb-1">
                  Agama
                </label>
                <select
                  id="ayah-istri-agama"
                  value={form.ayahIstri.agama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahIstri: { ...prev.ayahIstri, agama: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  {AGAMA_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ayah-istri-pek" className="block text-xs font-medium text-slate-700 mb-1">
                  Pekerjaan
                </label>
                <input
                  id="ayah-istri-pek"
                  type="text"
                  value={form.ayahIstri.pekerjaan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ayahIstri: { ...prev.ayahIstri, pekerjaan: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <AddressFieldGroup
              idPrefix="addr-ayah-istri"
              label="Alamat Ayah Calon Istri"
              value={form.ayahIstri.alamat}
              onChange={(alamat) =>
                updateForm((prev) => ({ ...prev, ayahIstri: { ...prev.ayahIstri, alamat } }))
              }
              sameAsOption={{
                label: 'Sama dengan alamat Calon Istri',
                sourceAddress: form.istri.alamat,
              }}
            />
          </div>

          {/* Ibu Calon Istri */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">C. Data Ibu Calon Istri</h3>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!form.ibuIstri.masihHidup}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuIstri: { ...prev.ibuIstri, masihHidup: !e.target.checked },
                    }))
                  }
                  className="rounded border-slate-300 text-emerald-800"
                />
                <span>Almarhumah (Almh.)</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ibu-istri-nama" className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap dan Alias
                </label>
                <input
                  id="ibu-istri-nama"
                  type="text"
                  value={form.ibuIstri.nama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuIstri: { ...prev.ibuIstri, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ibu-istri-binti" className="block text-xs font-medium text-slate-700 mb-1">
                  Binti (untuk Model N5)
                </label>
                <input
                  id="ibu-istri-binti"
                  type="text"
                  value={form.ibuIstri.binBinti}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuIstri: { ...prev.ibuIstri, binBinti: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <NikInput
                id="ibu-istri-nik"
                label="NIK Ibu Calon Istri"
                value={form.ibuIstri.nik}
                externalError={formErrors['ibuIstri.nik']}
                onChange={(nik) =>
                  updateForm((prev) => ({ ...prev, ibuIstri: { ...prev.ibuIstri, nik } }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="ibu-istri-tl" className="block text-xs font-medium text-slate-700 mb-1">
                  Tempat Lahir
                </label>
                <input
                  id="ibu-istri-tl"
                  type="text"
                  value={form.ibuIstri.tempatLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuIstri: { ...prev.ibuIstri, tempatLahir: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ibu-istri-tgll" className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  id="ibu-istri-tgll"
                  type="date"
                  value={form.ibuIstri.tanggalLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuIstri: { ...prev.ibuIstri, tanggalLahir: e.target.value },
                    }))
                  }
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="ibu-istri-agama" className="block text-xs font-medium text-slate-700 mb-1">
                  Agama
                </label>
                <select
                  id="ibu-istri-agama"
                  value={form.ibuIstri.agama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuIstri: { ...prev.ibuIstri, agama: e.target.value },
                    }))
                  }
                  className={inputClass}
                >
                  {AGAMA_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ibu-istri-pek" className="block text-xs font-medium text-slate-700 mb-1">
                  Pekerjaan
                </label>
                <input
                  id="ibu-istri-pek"
                  type="text"
                  value={form.ibuIstri.pekerjaan}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ibuIstri: { ...prev.ibuIstri, pekerjaan: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <AddressFieldGroup
              idPrefix="addr-ibu-istri"
              label="Alamat Ibu Calon Istri"
              value={form.ibuIstri.alamat}
              onChange={(alamat) =>
                updateForm((prev) => ({ ...prev, ibuIstri: { ...prev.ibuIstri, alamat } }))
              }
              sameAsOption={{
                label: 'Sama dengan alamat Calon Istri',
                sourceAddress: form.istri.alamat,
              }}
            />
          </div>
        </div>
      )}

      {/* Section 4: Wali Nikah & Surat Kuasa */}
      {activeSection === 'wali_kuasa' && (
        <div className="space-y-6">
          {/* Wali Nikah */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">A. Data Wali Nikah (untuk SPTJM)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jika wali nikah adalah Ayah Kandung Calon Istri, klik tombol salin otomatis di sebelah kanan.
                </p>
              </div>
              <button
                type="button"
                onClick={copyAyahIstriToWali}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Salin dari Ayah Calon Istri</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="wali-nama" className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Wali Nikah
                </label>
                <input
                  id="wali-nama"
                  type="text"
                  value={form.waliNikah.nama}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      waliNikah: { ...prev.waliNikah, nama: capitalizeEachWord(e.target.value) },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="wali-hubungan" className="block text-xs font-medium text-slate-700 mb-1">
                  Hubungan Wali
                </label>
                <input
                  id="wali-hubungan"
                  type="text"
                  value={form.waliNikah.hubunganWali}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      waliNikah: {
                        ...prev.waliNikah,
                        hubunganWali: capitalizeEachWord(e.target.value),
                      },
                    }))
                  }
                  placeholder="Ayah Kandung / Kakak Kandung / Wali Hakim"
                  className={inputClass}
                />
              </div>
              <NikInput
                id="wali-nik"
                label="NIK Wali Nikah"
                value={form.waliNikah.nik}
                externalError={formErrors['waliNikah.nik']}
                onChange={(nik) =>
                  updateForm((prev) => ({ ...prev, waliNikah: { ...prev.waliNikah, nik } }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="wali-tl" className="block text-xs font-medium text-slate-700 mb-1">
                  Tempat Lahir Wali
                </label>
                <input
                  id="wali-tl"
                  type="text"
                  value={form.waliNikah.tempatLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      waliNikah: {
                        ...prev.waliNikah,
                        tempatLahir: capitalizeEachWord(e.target.value),
                      },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="wali-tgll" className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Lahir Wali
                </label>
                <input
                  id="wali-tgll"
                  type="date"
                  value={form.waliNikah.tanggalLahir}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      waliNikah: { ...prev.waliNikah, tanggalLahir: e.target.value },
                    }))
                  }
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>

            <AddressFieldGroup
              idPrefix="addr-wali"
              label="Alamat Wali Nikah"
              value={form.waliNikah.alamat}
              onChange={(alamat) =>
                updateForm((prev) => ({ ...prev, waliNikah: { ...prev.waliNikah, alamat } }))
              }
              sameAsOption={{
                label: 'Sama dengan alamat Calon Istri',
                sourceAddress: form.istri.alamat,
              }}
            />
          </div>

          {/* Surat Kuasa */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  B. Surat Kuasa Pengurusan Nikah ke KUA Batealit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi data Pemberi Kuasa (Pihak Pertama) dan Penerima Kuasa / Modin (Pihak Kedua).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => copyPartyToPemberiKuasa('suami')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Pemberi: Calon Suami
                </button>
                <button
                  type="button"
                  onClick={() => copyPartyToPemberiKuasa('istri')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Pemberi: Calon Istri
                </button>
                <button
                  type="button"
                  onClick={() => copyPartyToPemberiKuasa('wali')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Pemberi: Wali Nikah
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pemberi Kuasa */}
              <div className="space-y-3.5">
                <p className="text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
                  Pihak Pertama / Pemberi Kuasa
                </p>
                <div>
                  <label htmlFor="pemberi-nama" className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Pemberi Kuasa
                  </label>
                  <input
                    id="pemberi-nama"
                    type="text"
                    value={form.pemberiKuasa.nama}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        pemberiKuasa: {
                          ...prev.pemberiKuasa,
                          nama: capitalizeEachWord(e.target.value),
                        },
                      }))
                    }
                    placeholder="Kosongkan untuk otomatis memakai Calon Suami"
                    className={inputClass}
                  />
                </div>
                <NikInput
                  id="pemberi-nik"
                  label="NIK Pemberi Kuasa"
                  value={form.pemberiKuasa.nik}
                  externalError={formErrors['pemberiKuasa.nik']}
                  onChange={(nik) =>
                    updateForm((prev) => ({
                      ...prev,
                      pemberiKuasa: { ...prev.pemberiKuasa, nik },
                    }))
                  }
                />
                <div>
                  <label htmlFor="pemberi-alamat" className="block text-xs font-medium text-slate-700 mb-1">
                    Alamat Pemberi Kuasa
                  </label>
                  <textarea
                    id="pemberi-alamat"
                    rows={2}
                    value={form.pemberiKuasa.alamat}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        pemberiKuasa: {
                          ...prev.pemberiKuasa,
                          alamat: capitalizeEachWord(e.target.value),
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Penerima Kuasa */}
              <div className="space-y-3.5">
                <p className="text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
                  Pihak Kedua / Penerima Kuasa (Modin / Perwakilan)
                </p>
                <div>
                  <label htmlFor="penerima-nama" className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Penerima Kuasa
                  </label>
                  <input
                    id="penerima-nama"
                    type="text"
                    value={form.penerimaKuasa.nama}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        penerimaKuasa: {
                          ...prev.penerimaKuasa,
                          nama: capitalizeEachWord(e.target.value),
                        },
                      }))
                    }
                    placeholder="Contoh: Kiai Haji Mahfudz Shodiq"
                    className={inputClass}
                  />
                </div>
                <NikInput
                  id="penerima-nik"
                  label="NIK Penerima Kuasa"
                  value={form.penerimaKuasa.nik}
                  externalError={formErrors['penerimaKuasa.nik']}
                  onChange={(nik) =>
                    updateForm((prev) => ({
                      ...prev,
                      penerimaKuasa: { ...prev.penerimaKuasa, nik },
                    }))
                  }
                />
                <div>
                  <label htmlFor="penerima-alamat" className="block text-xs font-medium text-slate-700 mb-1">
                    Alamat Penerima Kuasa
                  </label>
                  <textarea
                    id="penerima-alamat"
                    rows={2}
                    value={form.penerimaKuasa.alamat}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        penerimaKuasa: {
                          ...prev.penerimaKuasa,
                          alamat: capitalizeEachWord(e.target.value),
                        },
                      }))
                    }
                    placeholder="Contoh: Dukuh Krajan RT 01 RW 02, Desa Batealit, Kecamatan Batealit, Kabupaten Jepara"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {activeSection !== 'akad' && (
            <button
              type="button"
              onClick={() => {
                const idx = sections.findIndex((s) => s.key === activeSection);
                if (idx > 0) setActiveSection(sections[idx - 1].key);
              }}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Sebelumnya
            </button>
          )}
          {activeSection !== 'wali_kuasa' && (
            <button
              type="button"
              onClick={() => {
                const idx = sections.findIndex((s) => s.key === activeSection);
                if (idx < sections.length - 1) setActiveSection(sections[idx + 1].key);
              }}
              className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              Tahap Berikutnya
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveClick('Draft')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            Simpan Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveClick('Lengkap')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{saving ? 'Menyimpan...' : editingId ? 'Perbarui Riwayat Digital' : 'Simpan & Selesaikan Berkas'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
