import type {
  AddressData,
  MarriageFilingForm,
  MarriageFilingRecord,
  SignerSnapshot,
} from '../types/marriage.ts';

const UPPERCASE_TOKENS = new Set(['RT', 'RW']);

/**
 * Formats input text to Capitalize Each Word, while strictly keeping
 * "RT" and "RW" in uppercase (never "Rt" or "Rw").
 * Preserves trailing spaces so typing feels smooth in controlled inputs.
 */
export function capitalizeEachWord(input: string): string {
  if (!input) return '';
  return input.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g, (word) => {
    const upper = word.toUpperCase();
    if (UPPERCASE_TOKENS.has(upper)) {
      return upper;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/**
 * Strips any non-digit characters and enforces maximum 16 digits for NIK.
 */
export function sanitizeNik(input: string): string {
  return input.replace(/\D/g, '').slice(0, 16);
}

/**
 * Validates NIK: must be exactly 16 numeric digits (not less, not more).
 */
export function validateNik(
  nik: string,
  required = true,
): { valid: boolean; error: string | null } {
  const cleaned = nik.trim();
  if (!cleaned) {
    return required
      ? { valid: false, error: 'NIK wajib diisi tepat 16 digit angka.' }
      : { valid: true, error: null };
  }
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'NIK hanya boleh berisi angka 0-9.' };
  }
  if (cleaned.length !== 16) {
    return {
      valid: false,
      error: `NIK harus tepat 16 digit (saat ini ${cleaned.length} digit).`,
    };
  }
  return { valid: true, error: null };
}

/**
 * Composes complete formatted Indonesian address from cascading dropdown fields,
 * manual RT/RW (preserving uppercase RT and RW), and manual Dukuh/Jalan.
 */
export function composeFullAddress(addr: AddressData): string {
  const parts: string[] = [];

  const dukuh = addr.dukuhJalan.trim();
  const rt = addr.rt.trim();
  const rw = addr.rw.trim();

  const rtRwPieces: string[] = [];
  if (rt) rtRwPieces.push(`RT ${rt}`);
  if (rw) rtRwPieces.push(`RW ${rw}`);
  const rtRwText = rtRwPieces.join(' ');

  if (dukuh && rtRwText) {
    parts.push(`${capitalizeEachWord(dukuh)} ${rtRwText}`);
  } else if (dukuh) {
    parts.push(capitalizeEachWord(dukuh));
  } else if (rtRwText) {
    parts.push(rtRwText);
  }

  if (addr.desa.trim()) {
    const d = capitalizeEachWord(addr.desa.trim());
    parts.push(/^Desa\s|^Kelurahan\s/i.test(d) ? d : `Desa ${d}`);
  }
  if (addr.kecamatan.trim()) {
    const k = capitalizeEachWord(addr.kecamatan.trim());
    parts.push(/^Kecamatan\s|^Kec\.\s/i.test(k) ? k : `Kecamatan ${k}`);
  }
  if (addr.kabupaten.trim()) {
    const kab = capitalizeEachWord(addr.kabupaten.trim());
    parts.push(
      /^Kabupaten\s|^Kota\s|^Kab\.\s/i.test(kab) ? kab : `Kabupaten ${kab}`,
    );
  }
  if (addr.provinsi.trim()) {
    const prov = capitalizeEachWord(addr.provinsi.trim());
    parts.push(/^Provinsi\s/i.test(prov) ? prov : `Provinsi ${prov}`);
  }

  return parts.join(', ');
}

export function createDefaultAddress(desa = 'Batealit'): AddressData {
  const base: AddressData = {
    provinsi: 'Jawa Tengah',
    kabupaten: 'Kabupaten Jepara',
    kecamatan: 'Batealit',
    desa,
    rt: '',
    rw: '',
    dukuhJalan: '',
    alamatLengkap: '',
    sameAsCatin: false,
  };
  base.alamatLengkap = composeFullAddress(base);
  return base;
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export function parseIsoDateParts(isoDate: string): {
  dayName: string;
  day: number;
  monthName: string;
  monthNumber: number;
  year: number;
} | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [yStr, mStr, dStr] = isoDate.split('-');
  const year = Number(yStr);
  const monthNumber = Number(mStr);
  const day = Number(dStr);
  if (monthNumber < 1 || monthNumber > 12 || day < 1 || day > 31) return null;
  const dateObj = new Date(Date.UTC(year, monthNumber - 1, day));
  return {
    dayName: INDONESIAN_DAYS[dateObj.getUTCDay()],
    day,
    monthName: INDONESIAN_MONTHS[monthNumber - 1],
    monthNumber,
    year,
  };
}

export function formatIndonesianDate(isoDate: string): string {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return isoDate || '..............................';
  const dayStr = String(parts.day).padStart(2, '0');
  return `${dayStr} ${parts.monthName} ${parts.year}`;
}

export function formatPlaceAndDate(tempat: string, isoDate: string): string {
  const t = tempat.trim() ? capitalizeEachWord(tempat.trim()) : '';
  const d = isoDate ? formatIndonesianDate(isoDate) : '';
  if (t && d) return `${t}, ${d}`;
  return t || d || '..............................';
}

export function formatPetinggiDisplay(signer: {
  gelarDepan?: string;
  namaPetinggi?: string;
  gelarBelakang?: string;
}): string {
  const depan = (signer.gelarDepan || '').trim();
  const nama = (signer.namaPetinggi || '').trim();
  const belakang = (signer.gelarBelakang || '').trim();
  if (!nama) return '';
  let result = depan ? `${depan} ${nama}` : nama;
  if (belakang) {
    result += `, ${belakang}`;
  }
  return result;
}

export function getMonthOptions(): { value: string; label: string }[] {
  return INDONESIAN_MONTHS.map((label, idx) => ({
    value: String(idx + 1).padStart(2, '0'),
    label,
  }));
}

export function validateFilingForm(
  form: MarriageFilingForm,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.suami.nama.trim()) {
    errors['suami.nama'] = 'Nama Calon Suami wajib diisi.';
  }
  const nikSuami = validateNik(form.suami.nik, true);
  if (!nikSuami.valid && nikSuami.error) {
    errors['suami.nik'] = nikSuami.error;
  }

  if (!form.istri.nama.trim()) {
    errors['istri.nama'] = 'Nama Calon Istri wajib diisi.';
  }
  const nikIstri = validateNik(form.istri.nik, true);
  if (!nikIstri.valid && nikIstri.error) {
    errors['istri.nik'] = nikIstri.error;
  }

  const optionalNikChecks: Array<[string, string, boolean]> = [
    ['ayahSuami.nik', form.ayahSuami.nik, Boolean(form.ayahSuami.nik.trim())],
    ['ibuSuami.nik', form.ibuSuami.nik, Boolean(form.ibuSuami.nik.trim())],
    ['ayahIstri.nik', form.ayahIstri.nik, Boolean(form.ayahIstri.nik.trim())],
    ['ibuIstri.nik', form.ibuIstri.nik, Boolean(form.ibuIstri.nik.trim())],
    ['waliNikah.nik', form.waliNikah.nik, Boolean(form.waliNikah.nik.trim())],
    [
      'pemberiKuasa.nik',
      form.pemberiKuasa.nik,
      Boolean(form.pemberiKuasa.nik.trim()),
    ],
    [
      'penerimaKuasa.nik',
      form.penerimaKuasa.nik,
      Boolean(form.penerimaKuasa.nik.trim()),
    ],
  ];

  for (const [key, value, shouldValidate] of optionalNikChecks) {
    if (shouldValidate) {
      const res = validateNik(value, true);
      if (!res.valid && res.error) {
        errors[key] = res.error;
      }
    }
  }

  if (!form.akad.tanggalAkad.trim()) {
    errors['akad.tanggalAkad'] = 'Tanggal rencana akad nikah wajib diisi.';
  }

  return errors;
}

export function createEmptyFilingForm(
  signer?: Partial<SignerSnapshot>,
): MarriageFilingForm {
  const today = new Date().toISOString().slice(0, 10);
  const desa = signer?.desaName || 'Batealit';
  const defaultAddr = createDefaultAddress(desa);

  return {
    akad: {
      desaPenerbit: desa,
      kecamatanPenerbit: 'Batealit',
      kabupatenPenerbit: 'Jepara',
      nomorSuratN1: '',
      tanggalSurat: today,
      tanggalAkad: '',
      jamAkad: '09.00 WIB',
      tempatAkad: '',
      masKawin: '',
      pemohonN2: 'Calon Suami',
      catinWargaDesa: 'keduanya',
      namaKuaTujuan: 'Batealit',
      alamatKuaTujuan: 'Batealit',
    },
    suami: {
      nama: '',
      binBinti: '',
      nik: '',
      jenisKelamin: 'Laki-laki',
      tempatLahir: 'Jepara',
      tanggalLahir: '',
      kewarganegaraan: 'Indonesia',
      agama: 'Islam',
      pekerjaan: '',
      statusPerkawinan: 'Jejaka',
      istriKe: '',
      noHp: '',
      alamat: { ...defaultAddr },
    },
    ayahSuami: {
      nama: '',
      binBinti: '',
      nik: '',
      tempatLahir: 'Jepara',
      tanggalLahir: '',
      kewarganegaraan: 'Indonesia',
      agama: 'Islam',
      pekerjaan: '',
      masihHidup: true,
      alamat: { ...defaultAddr, sameAsCatin: true },
    },
    ibuSuami: {
      nama: '',
      binBinti: '',
      nik: '',
      tempatLahir: 'Jepara',
      tanggalLahir: '',
      kewarganegaraan: 'Indonesia',
      agama: 'Islam',
      pekerjaan: '',
      masihHidup: true,
      alamat: { ...defaultAddr, sameAsCatin: true },
    },
    istri: {
      nama: '',
      binBinti: '',
      nik: '',
      jenisKelamin: 'Perempuan',
      tempatLahir: 'Jepara',
      tanggalLahir: '',
      kewarganegaraan: 'Indonesia',
      agama: 'Islam',
      pekerjaan: '',
      statusPerkawinan: 'Perawan',
      noHp: '',
      alamat: { ...defaultAddr },
    },
    ayahIstri: {
      nama: '',
      binBinti: '',
      nik: '',
      tempatLahir: 'Jepara',
      tanggalLahir: '',
      kewarganegaraan: 'Indonesia',
      agama: 'Islam',
      pekerjaan: '',
      masihHidup: true,
      alamat: { ...defaultAddr, sameAsCatin: true },
    },
    ibuIstri: {
      nama: '',
      binBinti: '',
      nik: '',
      tempatLahir: 'Jepara',
      tanggalLahir: '',
      kewarganegaraan: 'Indonesia',
      agama: 'Islam',
      pekerjaan: '',
      masihHidup: true,
      alamat: { ...defaultAddr, sameAsCatin: true },
    },
    waliNikah: {
      nama: '',
      bin: '',
      nik: '',
      tempatLahir: 'Jepara',
      tanggalLahir: '',
      hubunganWali: 'Ayah Kandung',
      alamat: { ...defaultAddr, sameAsCatin: true },
    },
    pemberiKuasa: {
      nama: '',
      nik: '',
      alamat: '',
    },
    penerimaKuasa: {
      nama: '',
      nik: '',
      alamat: '',
    },
    penandatangan: {
      desaName: desa,
      namaPetinggi: signer?.namaPetinggi || '',
      gelarDepan: signer?.gelarDepan || '',
      gelarBelakang: signer?.gelarBelakang || '',
      nip: signer?.nip || '',
      jabatanPenandatangan: signer?.jabatanPenandatangan || 'Kepala Desa / Lurah',
      kepalaLingkungan: signer?.kepalaLingkungan || '',
    },
  };
}

export function createDemoFilingForm(
  signer?: Partial<SignerSnapshot>,
): MarriageFilingForm {
  const desa = signer?.desaName || 'Batealit';
  const addrSuami: AddressData = {
    provinsi: 'Jawa Tengah',
    kabupaten: 'Kabupaten Jepara',
    kecamatan: 'Batealit',
    desa,
    rt: '02',
    rw: '03',
    dukuhJalan: 'Dukuh Krajan',
    alamatLengkap: '',
    sameAsCatin: false,
  };
  addrSuami.alamatLengkap = composeFullAddress(addrSuami);

  const addrIstri: AddressData = {
    provinsi: 'Jawa Tengah',
    kabupaten: 'Kabupaten Jepara',
    kecamatan: 'Batealit',
    desa: 'Mindahan',
    rt: '04',
    rw: '01',
    dukuhJalan: 'Dukuh Mulyo',
    alamatLengkap: '',
    sameAsCatin: false,
  };
  addrIstri.alamatLengkap = composeFullAddress(addrIstri);

  const base = createEmptyFilingForm(signer);
  return {
    ...base,
    akad: {
      ...base.akad,
      desaPenerbit: desa,
      nomorSuratN1: '474.2 / 145 / XI / 2026',
      tanggalSurat: '2026-11-22',
      tanggalAkad: '2026-12-20',
      jamAkad: '09.00 WIB',
      tempatAkad: 'Rumah Mempelai Wanita, Dukuh Mulyo RT 04 RW 01, Desa Mindahan',
      masKawin: 'Seperangkat Alat Sholat Dan Perhiasan Emas 5 Gram Tunai',
      pemohonN2: 'Calon Suami',
      catinWargaDesa: 'keduanya',
    },
    suami: {
      ...base.suami,
      nama: 'Ahmad Fauzi',
      binBinti: 'Slamet Widodo',
      nik: '3320041205980001',
      tempatLahir: 'Jepara',
      tanggalLahir: '1998-05-12',
      pekerjaan: 'Karyawan Swasta',
      statusPerkawinan: 'Jejaka',
      noHp: '081234567890',
      alamat: addrSuami,
    },
    ayahSuami: {
      ...base.ayahSuami,
      nama: 'Slamet Widodo',
      binBinti: 'Karsono',
      nik: '3320040504700002',
      tempatLahir: 'Jepara',
      tanggalLahir: '1970-04-05',
      pekerjaan: 'Wiraswasta',
      alamat: { ...addrSuami, sameAsCatin: true },
    },
    ibuSuami: {
      ...base.ibuSuami,
      nama: 'Siti Aminah',
      binBinti: 'Haji Suparman',
      nik: '3320045208740003',
      tempatLahir: 'Jepara',
      tanggalLahir: '1974-08-12',
      pekerjaan: 'Mengurus Rumah Tangga',
      alamat: { ...addrSuami, sameAsCatin: true },
    },
    istri: {
      ...base.istri,
      nama: 'Nurul Hidayah',
      binBinti: 'Haji Abdul Karim',
      nik: '3320046109000004',
      tempatLahir: 'Jepara',
      tanggalLahir: '2000-09-21',
      pekerjaan: 'Guru Honorer',
      statusPerkawinan: 'Perawan',
      noHp: '085678901234',
      alamat: addrIstri,
    },
    ayahIstri: {
      ...base.ayahIstri,
      nama: 'Haji Abdul Karim',
      binBinti: 'Mustofa',
      nik: '3320041103680005',
      tempatLahir: 'Jepara',
      tanggalLahir: '1968-03-11',
      pekerjaan: 'Petani',
      alamat: { ...addrIstri, sameAsCatin: true },
    },
    ibuIstri: {
      ...base.ibuIstri,
      nama: 'Rohmah Wati',
      binBinti: 'Kasim',
      nik: '3320045507730006',
      tempatLahir: 'Jepara',
      tanggalLahir: '1973-07-15',
      pekerjaan: 'Mengurus Rumah Tangga',
      alamat: { ...addrIstri, sameAsCatin: true },
    },
    waliNikah: {
      nama: 'Haji Abdul Karim',
      bin: 'Mustofa',
      nik: '3320041103680005',
      tempatLahir: 'Jepara',
      tanggalLahir: '1968-03-11',
      hubunganWali: 'Ayah Kandung',
      alamat: { ...addrIstri, sameAsCatin: true },
    },
    pemberiKuasa: {
      nama: 'Ahmad Fauzi',
      nik: '3320041205980001',
      alamat: addrSuami.alamatLengkap,
    },
    penerimaKuasa: {
      nama: 'Kiai Haji Mahfudz Shodiq',
      nik: '3320040902650007',
      alamat: `Dukuh Krajan RT 01 RW 02, Desa ${desa}, Kecamatan Batealit, Kabupaten Jepara, Provinsi Jawa Tengah`,
    },
  };
}

function escapeCsvCell(value: string, forceText = false): string {
  const str = String(value ?? '');
  const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  const finalVal = forceText && sanitized ? `="${sanitized.replace(/"/g, '""')}"` : `"${sanitized.replace(/"/g, '""')}"`;
  return finalVal;
}

/**
 * Generates an Excel-friendly UTF-8 BOM CSV periodic recapitulation report.
 * Preserves 16-digit NIK as exact text strings and neutralizes CSV formula injection.
 */
export function buildCsvRecap(records: MarriageFilingRecord[]): string {
  const headers = [
    'No',
    'Desa',
    'Nomor Surat N1',
    'Tanggal Input',
    'Nama Calon Suami',
    'NIK Calon Suami',
    'Status Suami',
    'Nama Calon Istri',
    'NIK Calon Istri',
    'Status Istri',
    'Wali Nikah',
    'Tanggal Akad',
    'Jam Akad',
    'Tempat Akad',
    'Mas Kawin / Mahar',
    'Petugas Input',
    'Status Berkas',
  ];

  const rows = records.map((rec, idx) => [
    escapeCsvCell(String(idx + 1)),
    escapeCsvCell(rec.desaName),
    escapeCsvCell(rec.nomorSuratN1 || '-'),
    escapeCsvCell(rec.createdAt.slice(0, 10)),
    escapeCsvCell(rec.namaSuami),
    escapeCsvCell(rec.nikSuami, true),
    escapeCsvCell(rec.payload?.suami?.statusPerkawinan || '-'),
    escapeCsvCell(rec.namaIstri),
    escapeCsvCell(rec.nikIstri, true),
    escapeCsvCell(rec.payload?.istri?.statusPerkawinan || '-'),
    escapeCsvCell(rec.namaWali || '-'),
    escapeCsvCell(rec.tanggalAkad || '-'),
    escapeCsvCell(rec.jamAkad || '-'),
    escapeCsvCell(rec.tempatAkad || '-'),
    escapeCsvCell(rec.payload?.akad?.masKawin || '-'),
    escapeCsvCell(rec.createdByUsername),
    escapeCsvCell(rec.statusBerkas),
  ]);

  return '\uFEFF' + [headers.map((h) => escapeCsvCell(h)).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
