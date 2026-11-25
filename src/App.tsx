import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Building2,
  Calculator,
  CalendarDays,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  UserCog,
  X,
} from 'lucide-react';
import { api, type AuthStatusResponse } from './lib/api';
import type {
  MarriageFilingForm,
  MarriageFilingRecord,
  SignerSnapshot,
  UserProfile,
} from './types/marriage';
import { createEmptyFilingForm, formatPetinggiDisplay } from './utils/formatting';
import { AuthScreen } from './components/AuthScreen';
import { FilingFormView } from './components/FilingFormView';
import { DocumentPreviewView } from './components/DocumentPreviewView';
import { HistoryReportsView } from './components/HistoryReportsView';
import { ProfileView } from './components/ProfileView';
import { AccountManagementView } from './components/AccountManagementView';
import { WeddingScheduleDashboard } from './components/WeddingScheduleDashboard';
import { MarriageCalculatorsDashboard } from './components/MarriageCalculatorsDashboard';
import { HomeOverviewDashboard } from './components/HomeOverviewDashboard';

type NavView =
  | 'overview'
  | 'schedule'
  | 'calculators'
  | 'history'
  | 'input'
  | 'preview'
  | 'profile'
  | 'accounts';

function signerFromUser(u: UserProfile): SignerSnapshot {
  return {
    desaName: u.role === 'village_admin' ? u.desaName : 'Batealit',
    namaPetinggi: u.namaPetinggi,
    gelarDepan: u.gelarDepan,
    gelarBelakang: u.gelarBelakang,
    nip: u.nip,
    jabatanPenandatangan: u.jabatanPenandatangan || 'Kepala Desa / Lurah',
    kepalaLingkungan: u.kepalaLingkungan,
  };
}

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Bearer token held strictly in React memory (never persisted to localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [activeView, setActiveView] = useState<NavView>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [filings, setFilings] = useState<MarriageFilingRecord[]>([]);
  const [filingsLoading, setFilingsLoading] = useState(false);

  const [villageUsers, setVillageUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [activeForm, setActiveForm] = useState<MarriageFilingForm>(() =>
    createEmptyFilingForm(),
  );
  const [editingFilingId, setEditingFilingId] = useState<number | null>(null);
  const [savingFiling, setSavingFiling] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadAuthStatus = useCallback(async () => {
    try {
      const st = await api.getAuthStatus();
      setAuthStatus(st);
      setStatusError(null);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'Gagal terhubung ke server KUA Batealit.',
      );
    }
  }, []);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  const loadFilings = useCallback(async (authToken: string) => {
    setFilingsLoading(true);
    try {
      const res = await api.getFilings(authToken);
      setFilings(res.filings);
    } finally {
      setFilingsLoading(false);
    }
  }, []);

  const loadVillageUsers = useCallback(async (authToken: string) => {
    setUsersLoading(true);
    try {
      const res = await api.getVillageUsers(authToken);
      setVillageUsers(res.users);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const handleAuthenticated = async (authToken: string, authedUser: UserProfile) => {
    setToken(authToken);
    setUser(authedUser);
    setActiveForm(createEmptyFilingForm(signerFromUser(authedUser)));
    setEditingFilingId(null);
    setSaveFeedback(null);
    setActiveView('overview');

    await loadFilings(authToken);
    if (authedUser.role === 'kua_admin') {
      await loadVillageUsers(authToken);
    }
  };

  // When KUA Admin switches Desa Penerbit in the form, auto-populate that village's Petinggi signer profile!
  const handleFormChange = (next: MarriageFilingForm) => {
    if (
      user?.role === 'kua_admin' &&
      next.akad.desaPenerbit !== activeForm.akad.desaPenerbit &&
      villageUsers.length > 0
    ) {
      const matched = villageUsers.find(
        (v) => v.desaName.toLowerCase() === next.akad.desaPenerbit.toLowerCase(),
      );
      if (matched) {
        next = {
          ...next,
          penandatangan: signerFromUser(matched),
        };
      }
    }
    setActiveForm(next);
  };

  const handleLogout = async () => {
    if (token) {
      await api.logout(token).catch(() => {});
    }
    setToken(null);
    setUser(null);
    setFilings([]);
    setVillageUsers([]);
    setEditingFilingId(null);
    setMobileMenuOpen(false);
    await loadAuthStatus();
  };

  const handleStartNewFiling = () => {
    if (!user) return;
    let initialSigner = signerFromUser(user);
    if (user.role === 'kua_admin') {
      const batealit = villageUsers.find((v) => v.desaName === 'Batealit') || villageUsers[0];
      if (batealit) initialSigner = signerFromUser(batealit);
    }
    setActiveForm(createEmptyFilingForm(initialSigner));
    setEditingFilingId(null);
    setSaveFeedback(null);
    setActiveView('input');
    setMobileMenuOpen(false);
  };

  const handleSaveFiling = async (status: 'Lengkap' | 'Draft') => {
    if (!token || !user) return;
    setSavingFiling(true);
    setSaveFeedback(null);
    setSaveError(null);
    try {
      if (editingFilingId !== null) {
        const res = await api.updateFiling(token, editingFilingId, activeForm, status);
        setFilings((prev) =>
          prev.map((item) => (item.id === res.filing.id ? res.filing : item)),
        );
        setSaveFeedback(
          `Berkas nikah #${res.filing.id} (${res.filing.namaSuami} & ${res.filing.namaIstri}) berhasil diperbarui di Riwayat Digital.`,
        );
      } else {
        const res = await api.createFiling(token, activeForm, status);
        setEditingFilingId(res.filing.id);
        setFilings((prev) => [res.filing, ...prev]);
        setSaveFeedback(
          `Berkas nikah (${res.filing.namaSuami} & ${res.filing.namaIstri}) berhasil disimpan ke Riwayat Digital. Klik "Pratinjau 7 Berkas (F4)" untuk mengunduh Word atau PDF.`,
        );
      }
      if (user.role === 'kua_admin') {
        await loadVillageUsers(token);
      }
    } catch (err) {
      setSaveFeedback(null);
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan berkas nikah.');
    } finally {
      setSavingFiling(false);
    }
  };

  const handleEditFiling = (record: MarriageFilingRecord) => {
    setActiveForm(record.payload);
    setEditingFilingId(record.id);
    setSaveFeedback(null);
    setActiveView('input');
  };

  const handlePreviewFiling = (record: MarriageFilingRecord) => {
    setActiveForm(record.payload);
    setEditingFilingId(record.id);
    setActiveView('preview');
  };

  const handleDeleteFiling = async (id: number) => {
    if (!token) return;
    await api.deleteFiling(token, id);
    setFilings((prev) => prev.filter((f) => f.id !== id));
    if (editingFilingId === id) {
      setEditingFilingId(null);
    }
    if (user?.role === 'kua_admin') {
      await loadVillageUsers(token);
    }
  };

  const handleApplyWaliHubungan = (hubunganWali: string) => {
    setActiveForm((prev) => ({
      ...prev,
      waliNikah: {
        ...prev.waliNikah,
        hubunganWali,
      },
    }));
  };

  const handleSaveProfile = async (payload: {
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
  }) => {
    if (!token) return;
    const res = await api.updateProfile(token, payload);
    setUser(res.user);
    // Sync updated Wilayah/Desa and Petinggi signer into current form immediately
    if (res.user.role === 'village_admin') {
      setActiveForm((prev) => ({
        ...prev,
        akad: {
          ...prev.akad,
          desaPenerbit: res.user.desaName,
        },
        penandatangan: signerFromUser(res.user),
      }));
    }
  };

  const handleCreateVillageUser = async (payload: Parameters<typeof api.createVillageUser>[1]) => {
    if (!token) return;
    await api.createVillageUser(token, payload);
    await loadVillageUsers(token);
    await loadAuthStatus();
  };

  const handleUpdateVillageUser = async (
    id: number,
    payload: Parameters<typeof api.updateVillageUser>[2],
  ) => {
    if (!token) return;
    await api.updateVillageUser(token, id, payload);
    await loadVillageUsers(token);
    await loadAuthStatus();
  };

  const handleDeleteVillageUser = async (id: number) => {
    if (!token) return;
    await api.deleteVillageUser(token, id);
    await loadVillageUsers(token);
    await loadAuthStatus();
  };

  if (statusError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Koneksi Server Terputus</h1>
          <p className="text-sm text-slate-600">{statusError}</p>
          <button
            type="button"
            onClick={loadAuthStatus}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 rounded-lg cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (!authStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-600">
        Memuat portal SIMKAH-Desk KUA Kecamatan Batealit...
      </div>
    );
  }

  if (!token || !user) {
    return <AuthScreen authStatus={authStatus} onAuthenticated={handleAuthenticated} />;
  }

  const navItems: Array<{
    key: NavView;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }> = [
    { key: 'overview', label: 'Dasbor Utama', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'schedule', label: 'Jadwal Pernikahan', icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'calculators', label: 'Kalkulator Nikah', icon: <Calculator className="w-4 h-4" /> },
    { key: 'history', label: 'Riwayat & Laporan', icon: <Archive className="w-4 h-4" /> },
    { key: 'input', label: 'Input Berkas Nikah', icon: <FilePlus2 className="w-4 h-4" /> },
    { key: 'preview', label: 'Pratinjau & Unduh F4', icon: <FileText className="w-4 h-4" /> },
    { key: 'profile', label: 'Profil Petinggi & Desa', icon: <UserCog className="w-4 h-4" /> },
    {
      key: 'accounts',
      label: 'Kelola 11 Admin Desa',
      icon: <Shield className="w-4 h-4" />,
      adminOnly: true,
    },
  ];

  const visibleNav = navItems.filter((item) => !item.adminOnly || user.role === 'kua_admin');
  const currentNavLabel = visibleNav.find((n) => n.key === activeView)?.label || 'Beranda';
  const petinggiSummary = formatPetinggiDisplay(user);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar (260px) */}
      <aside className="no-print hidden lg:flex lg:flex-col w-[264px] shrink-0 bg-white border-r border-slate-200 min-h-screen sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 tracking-tight truncate">
                SIMKAH-Desk
              </div>
              <div className="text-xs text-slate-500 truncate">KUA Kecamatan Batealit</div>
            </div>
          </div>
        </div>

        <nav aria-label="Navigasi Utama" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const active = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveView(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className={active ? 'text-emerald-800' : 'text-slate-400'} aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-slate-900 truncate">
              {user.role === 'kua_admin' ? 'Admin Umum KUA' : `Admin Desa ${user.desaName}`}
            </div>
            <div className="text-slate-500 font-mono truncate">{user.username}</div>
            {user.role === 'village_admin' && petinggiSummary && (
              <div className="text-slate-600 truncate pt-1">
                Petinggi: {petinggiSummary}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[82vw] bg-white h-full flex flex-col border-r border-slate-200 z-10">
            <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">SIMKAH-Desk Batealit</span>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-600 hover:text-slate-900"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {visibleNav.map((item) => {
                const active = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveView(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Keluar ({user.username})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar with contextual breadcrumb + single primary CTA */}
        <header className="no-print bg-white border-b border-slate-200 px-4 sm:px-8 h-14 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Buka menu navigasi"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-md"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-700 whitespace-nowrap">
                {user.role === 'kua_admin' ? 'KUA Batealit' : `Desa ${user.desaName}`}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{currentNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeView === 'overview' || activeView === 'history' || activeView === 'profile' ? (
              <button
                type="button"
                onClick={handleStartNewFiling}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Input Berkas Baru
              </button>
            ) : activeView === 'input' ? (
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Pratinjau & Unduh F4
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartNewFiling}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Input Berkas Baru
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1280px] w-full mx-auto">
          {activeView === 'overview' && (
            <HomeOverviewDashboard
              user={user}
              filings={filings}
              villageUsers={villageUsers}
              loading={filingsLoading}
              onNavigate={(v) => setActiveView(v)}
              onCreateNew={handleStartNewFiling}
              onEditFiling={handleEditFiling}
              onPreviewFiling={handlePreviewFiling}
            />
          )}

          {activeView === 'history' && (
            <HistoryReportsView
              user={user}
              filings={filings}
              loading={filingsLoading}
              onCreateNew={handleStartNewFiling}
              onEditFiling={handleEditFiling}
              onPreviewFiling={handlePreviewFiling}
              onDeleteFiling={handleDeleteFiling}
            />
          )}

          {activeView === 'schedule' && (
            <WeddingScheduleDashboard
              user={user}
              filings={filings}
              loading={filingsLoading}
              onCreateNew={handleStartNewFiling}
              onEditFiling={handleEditFiling}
              onPreviewFiling={handlePreviewFiling}
            />
          )}

          {activeView === 'calculators' && (
            <MarriageCalculatorsDashboard
              filings={filings}
              onApplyWaliHubungan={handleApplyWaliHubungan}
            />
          )}

          {activeView === 'input' && (
            <FilingFormView
              user={user}
              form={activeForm}
              editingId={editingFilingId}
              saving={savingFiling}
              saveFeedback={saveFeedback}
              saveError={saveError}
              onChange={handleFormChange}
              onSave={handleSaveFiling}
              onOpenPreview={() => setActiveView('preview')}
              onResetNew={handleStartNewFiling}
            />
          )}

          {activeView === 'preview' && (
            <DocumentPreviewView
              form={activeForm}
              onBackToForm={() => setActiveView('input')}
            />
          )}

          {activeView === 'profile' && (
            <ProfileView user={user} onSaveProfile={handleSaveProfile} />
          )}

          {activeView === 'accounts' && user.role === 'kua_admin' && (
            <AccountManagementView
              villageUsers={villageUsers}
              loading={usersLoading}
              onCreateUser={handleCreateVillageUser}
              onUpdateUser={handleUpdateVillageUser}
              onDeleteUser={handleDeleteVillageUser}
            />
          )}
        </main>
      </div>
    </div>
  );
}
