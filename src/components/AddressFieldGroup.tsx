import React, { useState } from 'react';
import {
  getDesaList,
  getKabupatenList,
  getKecamatanList,
  getProvinces,
} from '../data/regions';
import type { AddressData } from '../types/marriage';
import { capitalizeEachWord, composeFullAddress } from '../utils/formatting';

interface AddressFieldGroupProps {
  idPrefix: string;
  label: string;
  value: AddressData;
  onChange: (next: AddressData) => void;
  sameAsOption?: {
    label: string;
    sourceAddress: AddressData;
  };
}

const MANUAL_OPTION = '__MANUAL__';

export function AddressFieldGroup({
  idPrefix,
  label,
  value,
  onChange,
  sameAsOption,
}: AddressFieldGroupProps) {
  const [manualMode, setManualMode] = useState(false);

  const provinces = getProvinces();
  const kabupatenList = getKabupatenList(value.provinsi);
  const kecamatanList = getKecamatanList(value.provinsi, value.kabupaten);
  const desaList = getDesaList(value.provinsi, value.kabupaten, value.kecamatan);

  const isLockedSame = Boolean(sameAsOption && value.sameAsCatin);

  const emitUpdate = (partial: Partial<AddressData>) => {
    const merged: AddressData = {
      ...value,
      ...partial,
    };
    merged.alamatLengkap = composeFullAddress(merged);
    onChange(merged);
  };

  const handleToggleSame = (checked: boolean) => {
    if (!sameAsOption) return;
    if (checked) {
      const mirrored: AddressData = {
        ...sameAsOption.sourceAddress,
        sameAsCatin: true,
      };
      mirrored.alamatLengkap = composeFullAddress(mirrored);
      onChange(mirrored);
    } else {
      emitUpdate({ sameAsCatin: false });
    }
  };

  const handleProvChange = (prov: string) => {
    if (prov === MANUAL_OPTION) {
      setManualMode(true);
      return;
    }
    const nextKabs = getKabupatenList(prov);
    const nextKab = nextKabs[0] || '';
    const nextKecs = getKecamatanList(prov, nextKab);
    const nextKec = nextKecs[0] || '';
    const nextDesas = getDesaList(prov, nextKab, nextKec);
    const nextDesa = nextDesas[0] || '';
    emitUpdate({
      provinsi: prov,
      kabupaten: nextKab,
      kecamatan: nextKec,
      desa: nextDesa,
    });
  };

  const handleKabChange = (kab: string) => {
    if (kab === MANUAL_OPTION) {
      setManualMode(true);
      return;
    }
    const nextKecs = getKecamatanList(value.provinsi, kab);
    const nextKec = nextKecs[0] || '';
    const nextDesas = getDesaList(value.provinsi, kab, nextKec);
    const nextDesa = nextDesas[0] || '';
    emitUpdate({
      kabupaten: kab,
      kecamatan: nextKec,
      desa: nextDesa,
    });
  };

  const handleKecChange = (kec: string) => {
    if (kec === MANUAL_OPTION) {
      setManualMode(true);
      return;
    }
    const nextDesas = getDesaList(value.provinsi, value.kabupaten, kec);
    const nextDesa = nextDesas[0] || '';
    emitUpdate({
      kecamatan: kec,
      desa: nextDesa,
    });
  };

  const handleDesaChange = (desa: string) => {
    if (desa === MANUAL_OPTION) {
      setManualMode(true);
      return;
    }
    emitUpdate({ desa });
  };

  const inputBase =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-100 disabled:text-slate-600';

  return (
    <div className="pt-4 border-t border-slate-200 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>

        <div className="flex items-center gap-4">
          {sameAsOption && (
            <label className="inline-flex items-center gap-2 text-sm text-emerald-900 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(value.sameAsCatin)}
                onChange={(e) => handleToggleSame(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
              />
              <span>{sameAsOption.label}</span>
            </label>
          )}

          {!isLockedSame && (
            <button
              type="button"
              onClick={() => setManualMode((m) => !m)}
              className="text-xs font-medium text-slate-600 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
            >
              {manualMode ? 'Gunakan Dropdown Wilayah' : 'Ketik Wilayah Manual'}
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Cascading dropdowns Provinsi -> Kabupaten -> Kecamatan -> Desa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label
            htmlFor={`${idPrefix}-prov`}
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Provinsi
          </label>
          {manualMode || (value.provinsi && !provinces.includes(value.provinsi)) ? (
            <input
              id={`${idPrefix}-prov`}
              type="text"
              disabled={isLockedSame}
              value={value.provinsi}
              onChange={(e) => emitUpdate({ provinsi: capitalizeEachWord(e.target.value) })}
              placeholder="Contoh: Jawa Tengah"
              className={inputBase}
            />
          ) : (
            <select
              id={`${idPrefix}-prov`}
              disabled={isLockedSame}
              value={value.provinsi}
              onChange={(e) => handleProvChange(e.target.value)}
              className={inputBase}
            >
              <option value="">-- Pilih Provinsi --</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value={MANUAL_OPTION}>Lainnya (Ketik Manual)...</option>
            </select>
          )}
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-kab`}
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Kabupaten / Kota
          </label>
          {manualMode || (value.kabupaten && !kabupatenList.includes(value.kabupaten)) ? (
            <input
              id={`${idPrefix}-kab`}
              type="text"
              disabled={isLockedSame}
              value={value.kabupaten}
              onChange={(e) => emitUpdate({ kabupaten: capitalizeEachWord(e.target.value) })}
              placeholder="Contoh: Kabupaten Jepara"
              className={inputBase}
            />
          ) : (
            <select
              id={`${idPrefix}-kab`}
              disabled={isLockedSame || !value.provinsi}
              value={value.kabupaten}
              onChange={(e) => handleKabChange(e.target.value)}
              className={inputBase}
            >
              <option value="">-- Pilih Kabupaten/Kota --</option>
              {kabupatenList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              <option value={MANUAL_OPTION}>Lainnya (Ketik Manual)...</option>
            </select>
          )}
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-kec`}
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Kecamatan
          </label>
          {manualMode || (value.kecamatan && !kecamatanList.includes(value.kecamatan)) ? (
            <input
              id={`${idPrefix}-kec`}
              type="text"
              disabled={isLockedSame}
              value={value.kecamatan}
              onChange={(e) => emitUpdate({ kecamatan: capitalizeEachWord(e.target.value) })}
              placeholder="Contoh: Batealit"
              className={inputBase}
            />
          ) : (
            <select
              id={`${idPrefix}-kec`}
              disabled={isLockedSame || !value.kabupaten}
              value={value.kecamatan}
              onChange={(e) => handleKecChange(e.target.value)}
              className={inputBase}
            >
              <option value="">-- Pilih Kecamatan --</option>
              {kecamatanList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              <option value={MANUAL_OPTION}>Lainnya (Ketik Manual)...</option>
            </select>
          )}
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-desa`}
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Desa / Kelurahan
          </label>
          {manualMode || (value.desa && !desaList.includes(value.desa)) ? (
            <input
              id={`${idPrefix}-desa`}
              type="text"
              disabled={isLockedSame}
              value={value.desa}
              onChange={(e) => emitUpdate({ desa: capitalizeEachWord(e.target.value) })}
              placeholder="Contoh: Batealit"
              className={inputBase}
            />
          ) : (
            <select
              id={`${idPrefix}-desa`}
              disabled={isLockedSame || !value.kecamatan}
              value={value.desa}
              onChange={(e) => handleDesaChange(e.target.value)}
              className={inputBase}
            >
              <option value="">-- Pilih Desa/Kelurahan --</option>
              {desaList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={MANUAL_OPTION}>Lainnya (Ketik Manual)...</option>
            </select>
          )}
        </div>
      </div>

      {/* Row 2: Manual RT, Manual RW, Manual Dukuh / Nama Jalan */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-2">
          <label
            htmlFor={`${idPrefix}-rt`}
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            RT (Manual)
          </label>
          <input
            id={`${idPrefix}-rt`}
            type="text"
            disabled={isLockedSame}
            value={value.rt}
            onChange={(e) =>
              emitUpdate({ rt: e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 4) })
            }
            placeholder="02"
            className={`${inputBase} font-mono tabular-nums`}
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor={`${idPrefix}-rw`}
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            RW (Manual)
          </label>
          <input
            id={`${idPrefix}-rw`}
            type="text"
            disabled={isLockedSame}
            value={value.rw}
            onChange={(e) =>
              emitUpdate({ rw: e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 4) })
            }
            placeholder="03"
            className={`${inputBase} font-mono tabular-nums`}
          />
        </div>

        <div className="sm:col-span-8">
          <label
            htmlFor={`${idPrefix}-dukuh`}
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Alamat (Dukuh / Nama Jalan / Gang / Nomor Rumah)
          </label>
          <input
            id={`${idPrefix}-dukuh`}
            type="text"
            disabled={isLockedSame}
            value={value.dukuhJalan}
            onChange={(e) => emitUpdate({ dukuhJalan: capitalizeEachWord(e.target.value) })}
            placeholder="Contoh: Dukuh Krajan atau Jl. Raya Batealit No. 12"
            className={inputBase}
          />
        </div>
      </div>

      {/* Row 3: Auto-composed Full Address */}
      <div>
        <label
          htmlFor={`${idPrefix}-lengkap`}
          className="block text-xs font-medium text-slate-600 mb-1"
        >
          Alamat Lengkap (Otomatis dari isian wilayah, RT/RW, dan dukuh/jalan di atas)
        </label>
        <input
          id={`${idPrefix}-lengkap`}
          type="text"
          readOnly
          value={value.alamatLengkap}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        />
      </div>
    </div>
  );
}
