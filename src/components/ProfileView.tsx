import React, { useState } from 'react';
import { CheckCircle2, KeyRound, Save } from 'lucide-react';
import type { UserProfile } from '../types/marriage';
import { capitalizeEachWord, formatPetinggiDisplay } from '../utils/formatting';

interface ProfileViewProps {
  user: UserProfile;
  onSaveProfile: (payload: {
    desaName: string;
    namaPetinggi: string;
    gelarDepan: string;
    gelarBelakang: string;
    nip: string;
    jabatanPenandatangan: string;
    kepalaLingkungan: string;
    alamatKantor: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
}

export function ProfileView({ user, onSaveProfile }: ProfileViewProps) {
  const [desaName, setDesaName] = useState(user.desaName);
  const [namaPetinggi, setNamaPetinggi] = useState(user.namaPetinggi);
  const [gelarDepan, setGelarDepan] = useState(user.gelarDepan);
  const [gelarBelakang, setGelarBelakang] = useState(user.gelarBelakang);
  const [nip, setNip] = useState(user.nip);
  const [jabatanPenandatangan, setJabatanPenandatangan] = useState(
    user.jabatanPenandatangan || 'Kepala Desa / Lurah',
  );
  const [kepalaLingkungan, setKepalaLingkungan] = useState(user.kepalaLingkungan);
  const [alamatKantor, setAlamatKantor] = useState(user.alamatKantor);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const fullDisplay = formatPetinggiDisplay({
    gelarDepan,
    namaPetinggi,
    gelarBelakang,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);
    if (!desaName.trim()) {
      setError('Nama Wilayah / Desa wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await onSaveProfile({
        desaName: desaName.trim(),
        namaPetinggi: namaPetinggi.trim(),
        gelarDepan: gelarDepan.trim(),
        gelarBelakang: gelarBelakang.trim(),
        nip: nip.trim(),
        jabatanPenandatangan: jabatanPenandatangan.trim() || 'Kepala Desa / Lurah',
        kepalaLingkungan: kepalaLingkungan.trim(),
        alamatKantor: alamatKantor.trim(),
        ...(newPassword.trim()
          ? { currentPassword, newPassword: newPassword.trim() }
          : {}),
      });
      setCurrentPassword('');
      setNewPassword('');
      setSavedMsg('Profil penandatangan desa berhasil diperbarui dan otomatis diterapkan pada dokumen N1.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Profil Petinggi & Penandatangan {user.role === 'kua_admin' ? desaName || 'KUA' : `Desa ${desaName || user.desaName}`}
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Data Nama Petinggi beserta Gelar dan NIP (jika ada) otomatis dicantumkan pada kolom tanda tangan Formulir N1 dan Surat Pernyataan Belum Pernah Menikah.
        </p>
      </div>

      {savedMsg && (
        <div
          role="status"
          className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>{savedMsg}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Username Akun</label>
              <input
                type="text"
                readOnly
                value={user.username}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700"
              />
            </div>
            <div>
              <label htmlFor="prof-desa" className="block text-xs font-medium text-slate-700 mb-1">
                Wilayah / Desa
              </label>
              <input
                id="prof-desa"
                type="text"
                required
                value={desaName}
                onChange={(e) => setDesaName(capitalizeEachWord(e.target.value))}
                placeholder="Contoh: Batealit"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3">
              <label htmlFor="prof-gelar-depan" className="block text-xs font-medium text-slate-700 mb-1">
                Gelar Depan
              </label>
              <input
                id="prof-gelar-depan"
                type="text"
                value={gelarDepan}
                onChange={(e) => setGelarDepan(e.target.value)}
                placeholder="H. / Drs."
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-5">
              <label htmlFor="prof-nama" className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap Petinggi / Kepala Desa
              </label>
              <input
                id="prof-nama"
                type="text"
                required
                value={namaPetinggi}
                onChange={(e) => setNamaPetinggi(capitalizeEachWord(e.target.value))}
                placeholder="Contoh: Muhammad Noor"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-4">
              <label htmlFor="prof-gelar-belakang" className="block text-xs font-medium text-slate-700 mb-1">
                Gelar Belakang
              </label>
              <input
                id="prof-gelar-belakang"
                type="text"
                value={gelarBelakang}
                onChange={(e) => setGelarBelakang(e.target.value)}
                placeholder="S.H., M.H."
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-nip" className="block text-xs font-medium text-slate-700 mb-1">
                NIP (Opsional — kosongkan jika tidak ada)
              </label>
              <input
                id="prof-nip"
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/[^0-9\s]/g, ''))}
                placeholder="Contoh: 19750412 200501 1 004"
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label htmlFor="prof-jabatan" className="block text-xs font-medium text-slate-700 mb-1">
                Label Jabatan Penandatangan (N1)
              </label>
              <input
                id="prof-jabatan"
                type="text"
                value={jabatanPenandatangan}
                onChange={(e) => setJabatanPenandatangan(capitalizeEachWord(e.target.value))}
                placeholder="Kepala Desa / Lurah atau Petinggi"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-kaling" className="block text-xs font-medium text-slate-700 mb-1">
                Nama Kepala Lingkungan Default (Opsional)
              </label>
              <input
                id="prof-kaling"
                type="text"
                value={kepalaLingkungan}
                onChange={(e) => setKepalaLingkungan(capitalizeEachWord(e.target.value))}
                placeholder="Kosongkan jika diisi manual"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="prof-alamat" className="block text-xs font-medium text-slate-700 mb-1">
                Alamat Kantor Desa
              </label>
              <input
                id="prof-alamat"
                type="text"
                value={alamatKantor}
                onChange={(e) => setAlamatKantor(capitalizeEachWord(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Optional Password Update */}
          <div className="pt-5 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Ubah Kata Sandi Akun (Opsional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-curr-pass" className="block text-xs font-medium text-slate-600 mb-1">
                  Kata Sandi Saat Ini
                </label>
                <input
                  id="prof-curr-pass"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Isi jika ingin mengganti sandi"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="prof-new-pass" className="block text-xs font-medium text-slate-600 mb-1">
                  Kata Sandi Baru (min. 6 karakter)
                </label>
                <input
                  id="prof-new-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak mengubah"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Profil Penandatangan'}</span>
            </button>
          </div>
        </div>

        {/* Live Signature Block Preview */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Pratinjau Tanda Tangan Model N1
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Jarak spasi ekstra disiapkan khusus agar tanda tangan basah dan stempel desa tidak menabrak teks.
            </p>
            <div
              className="border border-slate-200 rounded-lg p-5 bg-slate-50/60 text-center text-slate-900"
              style={{ fontFamily: '"Bookman Old Style", "Libre Baskerville", Georgia, serif', fontSize: '10.5pt' }}
            >
              <div>{desaName || user.desaName}, 22 November 2026</div>
              <div>
                {jabatanPenandatangan || 'Kepala Desa / Lurah'} {user.role === 'village_admin' ? desaName || user.desaName : ''}
              </div>
              <div className="h-24 flex items-center justify-center text-[9pt] text-slate-400 italic">
                (Ruang Tanda Tangan & Stempel)
              </div>
              <div className="font-bold underline">
                {fullDisplay || '.............................................'}
              </div>
              {nip.trim() && <div className="text-[9.5pt] mt-0.5">NIP. {nip.trim()}</div>}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Perubahan profil langsung tersimpan permanen di server KUA Batealit.
          </p>
        </div>
      </form>
    </div>
  );
}
