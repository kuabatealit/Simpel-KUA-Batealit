import type {
  MarriageFilingForm,
  MarriageFilingRecord,
  UserProfile,
} from '../types/marriage';

export interface AuthStatusResponse {
  needsSetup: boolean;
  envAdminActive: boolean;
  villageCount: number;
}

async function apiFetch<T>(
  url: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Terjadi kesalahan (${res.status}).`);
  }
  return data as T;
}

export const api = {
  getAuthStatus: () => apiFetch<AuthStatusResponse>('/api/auth/status', null),

  setupAdmin: (adminPassword: string, villageDefaultPassword: string) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/auth/setup', null, {
      method: 'POST',
      body: JSON.stringify({ adminPassword, villageDefaultPassword }),
    }),

  login: (username: string, password: string) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: (token: string) => apiFetch<{ user: UserProfile }>('/api/auth/me', token),

  logout: (token: string) =>
    apiFetch<{ ok: boolean }>('/api/auth/logout', token, { method: 'POST' }),

  updateProfile: (
    token: string,
    payload: {
      desaName?: string;
      namaPetinggi: string;
      gelarDepan: string;
      gelarBelakang: string;
      nip: string;
      jabatanPenandatangan: string;
      kepalaLingkungan: string;
      alamatKantor: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) =>
    apiFetch<{ user: UserProfile }>('/api/profile', token, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getVillageUsers: (token: string) =>
    apiFetch<{ users: UserProfile[] }>('/api/users', token),

  createVillageUser: (
    token: string,
    payload: {
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
    },
  ) =>
    apiFetch<{ user: UserProfile }>('/api/users', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateVillageUser: (
    token: string,
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
  ) =>
    apiFetch<{ user: UserProfile }>(`/api/users/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteVillageUser: (token: string, id: number) =>
    apiFetch<{ ok: boolean }>(`/api/users/${id}`, token, { method: 'DELETE' }),

  getFilings: (
    token: string,
    filters?: {
      search?: string;
      desa?: string;
      month?: string;
      year?: string;
      status?: string;
    },
  ) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.desa && filters.desa !== 'all') params.set('desa', filters.desa);
    if (filters?.month && filters.month !== 'all') params.set('month', filters.month);
    if (filters?.year && filters.year !== 'all') params.set('year', filters.year);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    const qs = params.toString();
    return apiFetch<{ filings: MarriageFilingRecord[] }>(
      `/api/filings${qs ? `?${qs}` : ''}`,
      token,
    );
  },

  createFiling: (
    token: string,
    payload: MarriageFilingForm,
    statusBerkas: 'Lengkap' | 'Draft' = 'Lengkap',
  ) =>
    apiFetch<{ filing: MarriageFilingRecord }>('/api/filings', token, {
      method: 'POST',
      body: JSON.stringify({ payload, statusBerkas }),
    }),

  updateFiling: (
    token: string,
    id: number,
    payload: MarriageFilingForm,
    statusBerkas: 'Lengkap' | 'Draft' = 'Lengkap',
  ) =>
    apiFetch<{ filing: MarriageFilingRecord }>(`/api/filings/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify({ payload, statusBerkas }),
    }),

  deleteFiling: (token: string, id: number) =>
    apiFetch<{ ok: boolean }>(`/api/filings/${id}`, token, { method: 'DELETE' }),
};
