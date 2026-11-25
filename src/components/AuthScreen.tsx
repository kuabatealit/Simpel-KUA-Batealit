import React, { useState } from 'react';
import { ArrowLeft, Building2, KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { api, type AuthStatusResponse } from '../lib/api';
import type { UserProfile } from '../types/marriage';

interface AuthScreenProps {
  authStatus: AuthStatusResponse;
  onAuthenticated: (token: string, user: UserProfile) => void;
}

export function AuthScreen({ authStatus, onAuthenticated }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [villageDefaultPassword, setVillageDefaultPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFirstRunSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (adminPassword.length < 6) {
      setError('Password Admin Umum KUA minimal 6 karakter.');
      return;
    }
    if (adminPassword !== confirmAdminPassword) {
      setError('Konfirmasi password Admin KUA tidak sama.');
      return;
    }
    if (villageDefaultPassword.length < 6) {
      setError('Password awal 11 Admin Desa minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.setupAdmin(adminPassword, villageDefaultPassword);
      onAuthenticated(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal melakukan aktivasi awal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Masukkan username dan password terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.login(username.trim(), password);
      onAuthenticated(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col-reverse lg:flex-row">
      {/* Left institutional panel */}
      <div className="lg:w-[46%] bg-emerald-950 text-white px-8 py-12 lg:px-14 lg:py-16 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 text-emerald-300 text-sm font-medium mb-8">
            <Building2 className="w-5 h-5" aria-hidden="true" />
            <span>Kementerian Agama Republik Indonesia · Kabupaten Jepara</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-white [text-wrap:balance]">
            SIMKAH-Desk KUA Kecamatan Batealit
          </h1>
          <p className="mt-4 text-emerald-100/85 text-base leading-relaxed max-w-lg">
            Sistem pemberkasan nikah terpadu untuk 11 Desa di wilayah KUA Kecamatan Batealit.
            Sekali input data catin, orang tua, dan wali nikah — seluruh 7 dokumen resmi format F4
            langsung siap unduh Word dan PDF.
          </p>

          <div className="mt-10 pt-8 border-t border-emerald-800/70 space-y-4">
            <p className="text-xs font-medium text-emerald-300">
              Dokumen Otomatis (F4 210 × 330 mm · Bookman Old Style 11pt · Margin 2,5 cm)
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-sm text-emerald-50/90">
              <li>01. Model N1 — Pengantar Nikah</li>
              <li>02. Model N2 — Kehendak Nikah</li>
              <li>03. Model N4 — Persetujuan Catin</li>
              <li>04. Model N5 — Izin Orang Tua</li>
              <li>05. SPTJM Pemeriksaan Berkas</li>
              <li>06. Surat Kuasa Pengurusan</li>
              <li>07. Pernyataan Belum Menikah</li>
              <li>08. Rekapitulasi Laporan Berkala</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-emerald-800/60 text-xs text-emerald-200/75 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>KUA Kecamatan Batealit</span>
          <span aria-hidden="true">·</span>
          <span>{authStatus.villageCount} Admin Desa Aktif</span>
          <span aria-hidden="true">·</span>
          <span>Keputusan Dirjen Bimas Islam No. 473 Tahun 2020</span>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {authStatus.needsSetup && showSetup ? (
            <form onSubmit={handleFirstRunSetup} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSetup(false);
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-800 mb-4 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kembali ke halaman login</span>
                </button>
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold mb-2">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Aktivasi Awal Sistem</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Tetapkan Password Awal
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Langkah satu kali untuk menetapkan password akun Admin KUA (
                  <span className="font-mono text-slate-800">admin_kua</span>) dan password awal
                  11 akun Admin Desa sebelum digunakan login.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
                >
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="setup-admin-password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Password Admin KUA (username: admin_kua)
                  </label>
                  <input
                    id="setup-admin-password"
                    type="password"
                    required
                    minLength={6}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="setup-admin-confirm"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Konfirmasi Password Admin KUA
                  </label>
                  <input
                    id="setup-admin-confirm"
                    type="password"
                    required
                    minLength={6}
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    placeholder="Ulangi password Admin KUA"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label
                    htmlFor="setup-village-password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Password Awal 11 Admin Desa
                  </label>
                  <input
                    id="setup-village-password"
                    type="password"
                    required
                    minLength={6}
                    value={villageDefaultPassword}
                    onChange={(e) => setVillageDefaultPassword(e.target.value)}
                    placeholder="Minimal 6 karakter (dapat diubah per desa)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {submitting ? 'Mengaktifkan Sistem...' : 'Simpan & Masuk'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold mb-2">
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                  <span>Login Sistem</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Masuk ke Simpel KUA Batealit
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Masukkan username dan password akun Anda.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
                >
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <User
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="login-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {submitting ? 'Memeriksa Akun...' : 'Masuk'}
              </button>

              {authStatus.needsSetup && (
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-600">
                  <span>Baru pertama kali membuka sistem?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSetup(true);
                      setError(null);
                    }}
                    className="font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer whitespace-nowrap"
                  >
                    Aktivasi Awal Sistem
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
