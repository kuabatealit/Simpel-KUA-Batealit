import React, { useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import type { UserProfile } from '../types/marriage';
import { capitalizeEachWord, formatPetinggiDisplay } from '../utils/formatting';

interface AccountManagementViewProps {
  villageUsers: UserProfile[];
  loading: boolean;
  onCreateUser: (payload: {
    username: string;
    password: string;
    desaName: string;
    namaPetinggi: string;
    gelarDepan: string;
    gelarBelakang: string;
    nip: string;
    jabatanPenandatangan: string;
    kepalaLingkungan: string;
    alamatKantor: string;
  }) => Promise<void>;
  onUpdateUser: (
    id: number,
    payload: Partial<{
      username: string;
      password: string;
      desaName: string;
      namaPetinggi: string;
      gelarDepan: string;
      gelarBelakang: string;
      nip: string;
      jabatanPenandatangan: string;
      kepalaLingkungan: string;
      alamatKantor: string;
      isActive: boolean;
    }>,
  ) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
}

interface AccountFormState {
  desaName: string;
  username: string;
  password: string;
  namaPetinggi: string;
  gelarDepan: string;
  gelarBelakang: string;
  nip: string;
  jabatanPenandatangan: string;
  kepalaLingkungan: string;
  alamatKantor: string;
  isActive: boolean;
}

const EMPTY_ACCOUNT: AccountFormState = {
  desaName: '',
  username: '',
  password: '',
  namaPetinggi: '',
  gelarDepan: '',
  gelarBelakang: '',
  nip: '',
  jabatanPenandatangan: 'Kepala Desa / Lurah',
  kepalaLingkungan: '',
  alamatKantor: '',
  isActive: true,
};

export function AccountManagementView({
  villageUsers,
  loading,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: AccountManagementViewProps) {
  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<AccountFormState>(EMPTY_ACCOUNT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const openCreateModal = () => {
    setForm(EMPTY_ACCOUNT);
    setEditingUserId(null);
    setError(null);
    setModalMode('create');
  };

  const openEditModal = (u: UserProfile) => {
    setForm({
      desaName: u.desaName,
      username: u.username,
      password: '',
      namaPetinggi: u.namaPetinggi,
      gelarDepan: u.gelarDepan,
      gelarBelakang: u.gelarBelakang,
      nip: u.nip,
      jabatanPenandatangan: u.jabatanPenandatangan || 'Kepala Desa / Lurah',
      kepalaLingkungan: u.kepalaLingkungan,
      alamatKantor: u.alamatKantor,
      isActive: u.isActive,
    });
    setEditingUserId(u.id);
    setError(null);
    setModalMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        await onCreateUser({
          desaName: form.desaName.trim(),
          username: form.username.trim().toLowerCase(),
          password: form.password.trim(),
          namaPetinggi: form.namaPetinggi.trim(),
          gelarDepan: form.gelarDepan.trim(),
          gelarBelakang: form.gelarBelakang.trim(),
          nip: form.nip.trim(),
          jabatanPenandatangan: form.jabatanPenandatangan.trim() || 'Kepala Desa / Lurah',
          kepalaLingkungan: form.kepalaLingkungan.trim(),
          alamatKantor:
            form.alamatKantor.trim() ||
            `Balai Desa ${form.desaName.trim()}, Kecamatan Batealit, Kabupaten Jepara`,
        });
        setFeedback(`Akun Admin Desa "${form.desaName.trim()}" berhasil ditambahkan.`);
      } else if (modalMode === 'edit' && editingUserId !== null) {
        await onUpdateUser(editingUserId, {
          desaName: form.desaName.trim(),
          username: form.username.trim().toLowerCase(),
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
          namaPetinggi: form.namaPetinggi.trim(),
          gelarDepan: form.gelarDepan.trim(),
          gelarBelakang: form.gelarBelakang.trim(),
          nip: form.nip.trim(),
          jabatanPenandatangan: form.jabatanPenandatangan.trim() || 'Kepala Desa / Lurah',
          kepalaLingkungan: form.kepalaLingkungan.trim(),
          alamatKantor: form.alamatKantor.trim(),
          isActive: form.isActive,
        });
        setFeedback(`Data akun Admin Desa "${form.desaName.trim()}" berhasil diperbarui.`);
      }
      setModalMode('closed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan akun admin desa.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = villageUsers.filter((u) => u.isActive).length;
  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Kelola Akun Admin Desa KUA Batealit
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Total {villageUsers.length} akun admin desa ({activeCount} aktif). Admin Umum KUA dapat menambah, mengubah profil/sandi, menonaktifkan, atau menghapus akun desa.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Tambah Admin Desa</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Village Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat daftar akun admin desa...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Desa</th>
                  <th className="py-3 px-4">Username Login</th>
                  <th className="py-3 px-4">Petinggi / Penandatangan N1</th>
                  <th className="py-3 px-4">NIP</th>
                  <th className="py-3 px-4 text-right">Berkas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {villageUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">Desa {u.desaName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">{u.username}</td>
                    <td className="py-3 px-4 text-slate-800">
                      {formatPetinggiDisplay(u) || <span className="text-slate-400">Belum diisi</span>}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600">
                      {u.nip || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {u.filingCount ?? 0}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          u.isActive ? 'text-emerald-800' : 'text-red-700'
                        }`}
                      >
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {confirmDeleteId === u.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteUser(u.id);
                              setConfirmDeleteId(null);
                              setFeedback(`Akun Admin Desa "${u.desaName}" berhasil dihapus.`);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            aria-label={`Edit akun Desa ${u.desaName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit / Sandi</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateUser(u.id, { isActive: !u.isActive })}
                            aria-label={
                              u.isActive
                                ? `Nonaktifkan akun Desa ${u.desaName}`
                                : `Aktifkan akun Desa ${u.desaName}`
                            }
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                            title={u.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          >
                            {u.isActive ? (
                              <UserX className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(u.id)}
                            aria-label={`Hapus akun Desa ${u.desaName}`}
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

      {/* Create / Edit Modal */}
      {modalMode !== 'closed' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="account-modal-title" className="text-base font-bold text-slate-900">
                {modalMode === 'create'
                  ? 'Tambah Akun Admin Desa Baru'
                  : `Edit Akun Admin Desa ${form.desaName}`}
              </h3>
              <button
                type="button"
                aria-label="Tutup dialog"
                onClick={() => setModalMode('closed')}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="acc-desa" className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Desa <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="acc-desa"
                    type="text"
                    required
                    value={form.desaName}
                    onChange={(e) => {
                      const val = capitalizeEachWord(e.target.value);
                      setForm((prev) => ({
                        ...prev,
                        desaName: val,
                        username:
                          modalMode === 'create' && !prev.username
                            ? `desa_${val.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                            : prev.username,
                      }));
                    }}
                    placeholder="Contoh: Ngabul"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="acc-username" className="block text-xs font-medium text-slate-700 mb-1">
                    Username Login <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="acc-username"
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                      }))
                    }
                    placeholder="desa_namadesa"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="acc-password" className="block text-xs font-medium text-slate-700 mb-1">
                  {modalMode === 'create'
                    ? 'Kata Sandi Awal (min. 6 karakter) *'
                    : 'Reset Kata Sandi Baru (kosongkan jika tetap)'}
                </label>
                <input
                  id="acc-password"
                  type="password"
                  required={modalMode === 'create'}
                  minLength={modalMode === 'create' ? 6 : undefined}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={modalMode === 'create' ? 'Minimal 6 karakter' : 'Isi untuk mereset kata sandi'}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label htmlFor="acc-gd" className="block text-xs font-medium text-slate-700 mb-1">
                    Gelar Depan
                  </label>
                  <input
                    id="acc-gd"
                    type="text"
                    value={form.gelarDepan}
                    onChange={(e) => setForm((prev) => ({ ...prev, gelarDepan: e.target.value }))}
                    placeholder="H."
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-5">
                  <label htmlFor="acc-petinggi" className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Petinggi / Kepala Desa
                  </label>
                  <input
                    id="acc-petinggi"
                    type="text"
                    value={form.namaPetinggi}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        namaPetinggi: capitalizeEachWord(e.target.value),
                      }))
                    }
                    placeholder="Nama Petinggi"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-4">
                  <label htmlFor="acc-gb" className="block text-xs font-medium text-slate-700 mb-1">
                    Gelar Belakang
                  </label>
                  <input
                    id="acc-gb"
                    type="text"
                    value={form.gelarBelakang}
                    onChange={(e) => setForm((prev) => ({ ...prev, gelarBelakang: e.target.value }))}
                    placeholder="S.H."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="acc-nip" className="block text-xs font-medium text-slate-700 mb-1">
                    NIP (Opsional)
                  </label>
                  <input
                    id="acc-nip"
                    type="text"
                    value={form.nip}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        nip: e.target.value.replace(/[^0-9\s]/g, ''),
                      }))
                    }
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label htmlFor="acc-kaling" className="block text-xs font-medium text-slate-700 mb-1">
                    Kepala Lingkungan (Opsional)
                  </label>
                  <input
                    id="acc-kaling"
                    type="text"
                    value={form.kepalaLingkungan}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        kepalaLingkungan: capitalizeEachWord(e.target.value),
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMode('closed')}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? 'Menyimpan...'
                    : modalMode === 'create'
                      ? 'Buat Akun Admin Desa'
                      : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
