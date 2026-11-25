export type UserRole = 'kua_admin' | 'village_admin';

export interface UserProfile {
  id: number;
  username: string;
  role: UserRole;
  desaName: string;
  namaPetinggi: string;
  gelarDepan: string;
  gelarBelakang: string;
  nip: string;
  jabatanPenandatangan: string;
  kepalaLingkungan: string;
  alamatKantor: string;
  isActive: boolean;
  filingCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressData {
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  rt: string;
  rw: string;
  dukuhJalan: string;
  alamatLengkap: string;
  sameAsCatin?: boolean;
}

export type MaritalStatusMale = 'Jejaka' | 'Duda' | 'Beristri';
export type MaritalStatusFemale = 'Perawan' | 'Janda';

export interface CatinData {
  nama: string;
  binBinti: string;
  nik: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  tempatLahir: string;
  tanggalLahir: string;
  kewarganegaraan: string;
  agama: string;
  pekerjaan: string;
  statusPerkawinan: string;
  istriKe?: string;
  noHp: string;
  alamat: AddressData;
}

export interface ParentData {
  nama: string;
  binBinti: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  kewarganegaraan: string;
  agama: string;
  pekerjaan: string;
  masihHidup: boolean;
  alamat: AddressData;
}

export interface WaliNikahData {
  nama: string;
  bin: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  hubunganWali: string;
  alamat: AddressData;
}

export interface KuasaPartyData {
  nama: string;
  nik: string;
  alamat: string;
}

export interface AkadData {
  desaPenerbit: string;
  kecamatanPenerbit: string;
  kabupatenPenerbit: string;
  nomorSuratN1: string;
  tanggalSurat: string;
  tanggalAkad: string;
  jamAkad: string;
  tempatAkad: string;
  masKawin: string;
  pemohonN2: 'Calon Suami' | 'Calon Istri' | 'Wali Nikah' | 'Penerima Kuasa';
  catinWargaDesa: 'suami' | 'istri' | 'keduanya';
  namaKuaTujuan: string;
  alamatKuaTujuan: string;
}

export interface SignerSnapshot {
  desaName: string;
  namaPetinggi: string;
  gelarDepan: string;
  gelarBelakang: string;
  nip: string;
  jabatanPenandatangan: string;
  kepalaLingkungan: string;
}

export interface MarriageFilingForm {
  akad: AkadData;
  suami: CatinData;
  ayahSuami: ParentData;
  ibuSuami: ParentData;
  istri: CatinData;
  ayahIstri: ParentData;
  ibuIstri: ParentData;
  waliNikah: WaliNikahData;
  pemberiKuasa: KuasaPartyData;
  penerimaKuasa: KuasaPartyData;
  penandatangan: SignerSnapshot;
}

export interface MarriageFilingRecord {
  id: number;
  villageUserId: number;
  desaName: string;
  nomorSuratN1: string;
  namaSuami: string;
  nikSuami: string;
  namaIstri: string;
  nikIstri: string;
  namaWali: string;
  tanggalAkad: string;
  jamAkad: string;
  tempatAkad: string;
  statusBerkas: 'Lengkap' | 'Draft';
  payload: MarriageFilingForm;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentTabKey =
  | 'n1_suami'
  | 'n1_istri'
  | 'n2'
  | 'n4'
  | 'n5_suami'
  | 'n5_istri'
  | 'sptjm'
  | 'surat_kuasa'
  | 'belum_menikah_suami'
  | 'belum_menikah_istri';
