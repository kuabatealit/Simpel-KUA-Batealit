import type {
  MarriageFilingForm,
  MarriageFilingRecord,
  UserProfile,
} from '../types/marriage';
import { localBackend } from './localBackend';

export type BackendMode = 'server' | 'standalone';

export interface AuthStatusResponse {
  needsSetup: boolean;
  envAdminActive: boolean;
  villageCount: number;
  backendMode?: BackendMode;
}

function getApiBaseUrl(): string {
  try {
    const raw = (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_API_BASE_URL;
    if (raw && raw.trim()) {
      return raw.trim().replace(/\/+$/, '');
    }
  } catch {
    // Node test environment without Vite import.meta.env
  }
  return '';
}

let activeBackendMode: BackendMode | null = null;

export function getActiveBackendMode(): BackendMode | null {
  return activeBackendMode;
}

export function resetBackendModeForTest(): void {
  activeBackendMode = null;
}

/**
 * Pure helper to determine whether a /api/auth/status HTTP probe indicates
 * a live Express API server or a static/Vercel environment that should run
 * in standalone browser persistence mode.
 */
export function interpretAuthStatusProbe(
  status: number,
  contentType: string | null,
  body: unknown,
): { mode: BackendMode; serverStatus?: AuthStatusResponse } {
  const isJson = Boolean(contentType && contentType.toLowerCase().includes('application/json'));
  if (!isJson || status === 404 || status === 405 || status >= 500) {
    return { mode: 'standalone' };
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (record.backendMode === 'standalone') {
      return { mode: 'standalone' };
    }
    if (
      status >= 200 &&
      status < 300 &&
      typeof record.needsSetup === 'boolean' &&
      typeof record.villageCount === 'number'
    ) {
      return {
        mode: 'server',
        serverStatus: {
          needsSetup: record.needsSetup,
          envAdminActive: Boolean(record.envAdminActive),
          villageCount: record.villageCount,
          backendMode: 'server',
        },
      };
    }
  }

  return { mode: 'standalone' };
}

async function apiFetch<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
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

async function probeAuthStatus(): Promise<AuthStatusResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/auth/status`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type');
    let parsed: unknown = null;
    if (contentType && contentType.toLowerCase().includes('application/json')) {
      parsed = await res.json().catch(() => null);
    }

    const interpreted = interpretAuthStatusProbe(res.status, contentType, parsed);
    activeBackendMode = interpreted.mode;
    if (interpreted.mode === 'server' && interpreted.serverStatus) {
      return interpreted.serverStatus;
    }
    return localBackend.getAuthStatus();
  } catch {
    // If an explicit remote API URL is unreachable or same-origin static host fails,
    // fall back gracefully to standalone browser persistence so the app remains usable.
    activeBackendMode = 'standalone';
    return localBackend.getAuthStatus();
  }
}

export const api = {
  getAuthStatus: () => probeAuthStatus(),

  setupAdmin: (adminPassword: string, villageDefaultPassword: string) =>
    activeBackendMode === 'standalone'
      ? localBackend.setupAdmin(adminPassword, villageDefaultPassword)
      : apiFetch<{ token: string; user: UserProfile }>('/api/auth/setup', null, {
          method: 'POST',
          body: JSON.stringify({ adminPassword, villageDefaultPassword }),
        }),

  login: (username: string, password: string) =>
    activeBackendMode === 'standalone'
      ? localBackend.login(username, password)
      : apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', null, {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        }),

  me: (token: string) =>
    activeBackendMode === 'standalone'
      ? localBackend.me(token)
      : apiFetch<{ user: UserProfile }>('/api/auth/me', token),

  logout: (token: string) =>
    activeBackendMode === 'standalone'
      ? localBackend.logout(token)
      : apiFetch<{ ok: boolean }>('/api/auth/logout', token, { method: 'POST' }),

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
    activeBackendMode === 'standalone'
      ? localBackend.updateProfile(token, payload)
      : apiFetch<{ user: UserProfile }>('/api/profile', token, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),

  getVillageUsers: (token: string) =>
    activeBackendMode === 'standalone'
      ? localBackend.getVillageUsers(token)
      : apiFetch<{ users: UserProfile[] }>('/api/users', token),

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
    activeBackendMode === 'standalone'
      ? localBackend.createVillageUser(token, payload)
      : apiFetch<{ user: UserProfile }>('/api/users', token, {
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
    activeBackendMode === 'standalone'
      ? localBackend.updateVillageUser(token, id, payload)
      : apiFetch<{ user: UserProfile }>(`/api/users/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),

  deleteVillageUser: (token: string, id: number) =>
    activeBackendMode === 'standalone'
      ? localBackend.deleteVillageUser(token, id)
      : apiFetch<{ ok: boolean }>(`/api/users/${id}`, token, { method: 'DELETE' }),

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
    if (activeBackendMode === 'standalone') {
      return localBackend.getFilings(token, filters);
    }
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
    activeBackendMode === 'standalone'
      ? localBackend.createFiling(token, payload, statusBerkas)
      : apiFetch<{ filing: MarriageFilingRecord }>('/api/filings', token, {
          method: 'POST',
          body: JSON.stringify({ payload, statusBerkas }),
        }),

  updateFiling: (
    token: string,
    id: number,
    payload: MarriageFilingForm,
    statusBerkas: 'Lengkap' | 'Draft' = 'Lengkap',
  ) =>
    activeBackendMode === 'standalone'
      ? localBackend.updateFiling(token, id, payload, statusBerkas)
      : apiFetch<{ filing: MarriageFilingRecord }>(`/api/filings/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify({ payload, statusBerkas }),
        }),

  deleteFiling: (token: string, id: number) =>
    activeBackendMode === 'standalone'
      ? localBackend.deleteFiling(token, id)
      : apiFetch<{ ok: boolean }>(`/api/filings/${id}`, token, { method: 'DELETE' }),
};
