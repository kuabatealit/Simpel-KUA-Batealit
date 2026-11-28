import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretAuthStatusProbe } from './api';
import { createLocalBackend, type StorageLike } from './localBackend';
import { createDemoFilingForm } from '../utils/formatting';

function createMemoryStorage(): StorageLike & { dump(): string | null } {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    dump: () => store.get('simpel_kua_batealit_store_v1') ?? null,
  };
}

test('interpretAuthStatusProbe switches to standalone on 404, HTML, 500, or standalone signal', () => {
  assert.equal(interpretAuthStatusProbe(404, 'text/plain', null).mode, 'standalone');
  assert.equal(interpretAuthStatusProbe(404, 'application/json', { error: 'Not found' }).mode, 'standalone');
  assert.equal(interpretAuthStatusProbe(200, 'text/html; charset=utf-8', null).mode, 'standalone');
  assert.equal(interpretAuthStatusProbe(500, 'application/json', { error: 'crash' }).mode, 'standalone');
  assert.equal(
    interpretAuthStatusProbe(200, 'application/json', { backendMode: 'standalone' }).mode,
    'standalone',
  );

  const serverProbe = interpretAuthStatusProbe(200, 'application/json', {
    needsSetup: false,
    envAdminActive: false,
    villageCount: 11,
    backendMode: 'server',
  });
  assert.equal(serverProbe.mode, 'server');
  assert.equal(serverProbe.serverStatus?.villageCount, 11);
  assert.equal(serverProbe.serverStatus?.needsSetup, false);
});

test('localBackend handles first-run setup, PBKDF2 hashing, login, and role boundaries', async () => {
  const storage = createMemoryStorage();
  const backend = createLocalBackend(storage);

  const initialStatus = await backend.getAuthStatus();
  assert.equal(initialStatus.needsSetup, true);
  assert.equal(initialStatus.villageCount, 11);
  assert.equal(initialStatus.backendMode, 'standalone');

  const setup = await backend.setupAdmin('kuaPass123', 'desaPass123');
  assert.equal(setup.user.username, 'admin_kua');
  assert.equal(setup.user.role, 'kua_admin');
  assert.ok(setup.token.length >= 32);

  // Passwords must never be stored in plaintext
  const dumped = storage.dump() || '';
  assert.equal(dumped.includes('kuaPass123'), false);
  assert.equal(dumped.includes('desaPass123'), false);
  assert.equal(dumped.includes('pbkdf2$100000$'), true);

  const afterStatus = await backend.getAuthStatus();
  assert.equal(afterStatus.needsSetup, false);

  // Second setup attempt must be rejected
  await assert.rejects(() => backend.setupAdmin('other123', 'other123'), /sudah diaktivasi/i);

  // Village admin login works with initial village password
  const villageLogin = await backend.login('desa_batealit', 'desaPass123');
  assert.equal(villageLogin.user.role, 'village_admin');
  assert.equal(villageLogin.user.desaName, 'Batealit');

  // Wrong password rejected
  await assert.rejects(() => backend.login('desa_batealit', 'wrongpass'), /salah/i);

  // Village admin cannot access KUA-only village account list
  await assert.rejects(
    () => backend.getVillageUsers(villageLogin.token),
    /Admin Umum KUA/i,
  );

  // Village admin only sees its own filings, KUA admin sees all 3 seeded filings
  const kuaFilings = await backend.getFilings(setup.token);
  assert.equal(kuaFilings.filings.length, 3);
  const batealitFilings = await backend.getFilings(villageLogin.token);
  assert.equal(batealitFilings.filings.length, 1);
  assert.equal(batealitFilings.filings[0].desaName, 'Batealit');

  // Village admin cannot delete another village's filing
  const otherFiling = kuaFilings.filings.find((f) => f.desaName !== 'Batealit');
  assert.ok(otherFiling);
  await assert.rejects(
    () => backend.deleteFiling(villageLogin.token, otherFiling.id),
    /tidak memiliki akses/i,
  );

  // Editable Wilayah/Desa in updateProfile persists
  const updatedProfile = await backend.updateProfile(villageLogin.token, {
    desaName: 'Batealit Baru',
    namaPetinggi: 'Muhammad Noor',
    gelarDepan: 'H.',
    gelarBelakang: 'S.Pd.',
    nip: '198001012010011001',
    jabatanPenandatangan: 'Petinggi Desa',
    kepalaLingkungan: 'Subiyanto',
    alamatKantor: 'Balai Desa Batealit Baru',
  });
  assert.equal(updatedProfile.user.desaName, 'Batealit Baru');

  // Logout invalidates session token
  await backend.logout(villageLogin.token);
  await assert.rejects(() => backend.me(villageLogin.token), /berakhir|diperlukan/i);
});

test('localBackend supports KUA admin village user CRUD and filing CRUD with validation', async () => {
  const storage = createMemoryStorage();
  const backend = createLocalBackend(storage);
  const { token } = await backend.setupAdmin('adminSecret1', 'desaSecret1');

  const createdUser = await backend.createVillageUser(token, {
    username: 'desa_ekstra',
    password: 'password123',
    desaName: 'Desa Ekstra',
    namaPetinggi: 'Ahmad Yani',
    gelarDepan: '',
    gelarBelakang: 'S.H.',
    nip: '',
    jabatanPenandatangan: 'Kepala Desa',
    kepalaLingkungan: 'Suryadi',
    alamatKantor: 'Balai Desa Ekstra',
  });
  assert.equal(createdUser.user.desaName, 'Desa Ekstra');

  const listAfterAdd = await backend.getVillageUsers(token);
  assert.equal(listAfterAdd.users.length, 12);

  // Create valid marriage filing
  const form = createDemoFilingForm({ desaName: 'Desa Ekstra' });
  const createdFiling = await backend.createFiling(token, form, 'Lengkap');
  assert.equal(createdFiling.filing.desaName, 'Desa Ekstra');

  // Search filter works
  const searchRes = await backend.getFilings(token, { search: form.suami.nama });
  assert.ok(searchRes.filings.some((f) => f.id === createdFiling.filing.id));

  // Delete filing & user cleanly
  await backend.deleteFiling(token, createdFiling.filing.id);
  await backend.deleteVillageUser(token, createdUser.user.id);
  const listAfterDelete = await backend.getVillageUsers(token);
  assert.equal(listAfterDelete.users.length, 11);
});
