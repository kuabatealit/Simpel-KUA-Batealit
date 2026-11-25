import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import type {
  CatinData,
  DocumentTabKey,
  MarriageFilingForm,
  MarriageFilingRecord,
  ParentData,
} from '../types/marriage';
import { F4_PAPER, N2_REQUIREMENTS_LIST } from './documentSpec';
import {
  formatIndonesianDate,
  formatPetinggiDisplay,
  formatPlaceAndDate,
  parseIsoDateParts,
} from './formatting';

const FONT = F4_PAPER.fontFamily;
const SIZE_11 = F4_PAPER.fontSizePt * 2; // 22 half-points = 11pt
const SIZE_10 = 20;
const SIZE_9 = 18;

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const ALL_THIN_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

function run(
  text: string,
  opts?: { bold?: boolean; underline?: boolean; size?: number; italics?: boolean },
): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: opts?.size ?? SIZE_11,
    bold: opts?.bold ?? false,
    italics: opts?.italics ?? false,
    underline: opts?.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function p(
  textOrRuns: string | TextRun[],
  opts?: {
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    after?: number;
    before?: number;
    line?: number;
    indentLeft?: number;
    bold?: boolean;
    underline?: boolean;
    size?: number;
  },
): Paragraph {
  const children =
    typeof textOrRuns === 'string'
      ? [
          run(textOrRuns, {
            bold: opts?.bold,
            underline: opts?.underline,
            size: opts?.size,
          }),
        ]
      : textOrRuns;
  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.LEFT,
    spacing: {
      before: opts?.before ?? 0,
      after: opts?.after ?? 40,
      line: opts?.line ?? 260,
    },
    indent: opts?.indentLeft ? { left: opts.indentLeft } : undefined,
    children,
  });
}

function blankLines(count: number): Paragraph[] {
  return Array.from({ length: count }, () =>
    new Paragraph({
      spacing: { before: 0, after: 0, line: 260 },
      children: [run('')],
    }),
  );
}

function kvTable(
  rows: Array<[string, string | null]>,
  labelWidthMm = 64,
  colonWidthMm = 5,
): Table {
  const contentWidthMm = F4_PAPER.widthMm - F4_PAPER.marginLeftMm - F4_PAPER.marginRightMm; // 160mm
  const valueWidthMm = contentWidthMm - labelWidthMm - colonWidthMm;

  return new Table({
    width: { size: convertMillimetersToTwip(contentWidthMm), type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: convertMillimetersToTwip(labelWidthMm), type: WidthType.DXA },
              borders: NO_BORDERS,
              margins: { top: 20, bottom: 20, left: 0, right: 40 },
              children: [p(label, { after: 0, line: 240 })],
            }),
            new TableCell({
              width: { size: convertMillimetersToTwip(colonWidthMm), type: WidthType.DXA },
              borders: NO_BORDERS,
              margins: { top: 20, bottom: 20, left: 0, right: 0 },
              children: [p(label && value !== null ? ':' : '', { after: 0, line: 240 })],
            }),
            new TableCell({
              width: { size: convertMillimetersToTwip(valueWidthMm), type: WidthType.DXA },
              borders: NO_BORDERS,
              margins: { top: 20, bottom: 20, left: 40, right: 0 },
              children: [
                p(
                  value === null
                    ? ''
                    : value || '........................................................',
                  { after: 0, line: 240 },
                ),
              ],
            }),
          ],
        }),
    ),
  });
}

function twoColSignatureTable(
  leftLines: Paragraph[],
  rightLines: Paragraph[],
): Table {
  const halfMm = (F4_PAPER.widthMm - F4_PAPER.marginLeftMm - F4_PAPER.marginRightMm) / 2;
  return new Table({
    width: { size: convertMillimetersToTwip(halfMm * 2), type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: convertMillimetersToTwip(halfMm), type: WidthType.DXA },
            borders: NO_BORDERS,
            children: leftLines,
          }),
          new TableCell({
            width: { size: convertMillimetersToTwip(halfMm), type: WidthType.DXA },
            borders: NO_BORDERS,
            children: rightLines,
          }),
        ],
      }),
    ],
  });
}

function getPemohonName(form: MarriageFilingForm): string {
  switch (form.akad.pemohonN2) {
    case 'Calon Suami':
      return form.suami.nama;
    case 'Calon Istri':
      return form.istri.nama;
    case 'Wali Nikah':
      return form.waliNikah.nama;
    case 'Penerima Kuasa':
      return form.penerimaKuasa.nama;
    default:
      return form.suami.nama;
  }
}

function buildN1Children(
  form: MarriageFilingForm,
  catin: CatinData,
  ayah: ParentData,
  ibu: ParentData,
): (Paragraph | Table)[] {
  const petinggiFull = formatPetinggiDisplay(form.penandatangan);
  const jabatan = form.penandatangan.jabatanPenandatangan || 'Kepala Desa / Lurah';
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  const statusLaki =
    catin.jenisKelamin === 'Laki-laki'
      ? catin.statusPerkawinan === 'Beristri' && catin.istriKe
        ? `Beristri (Istri Ke-${catin.istriKe})`
        : catin.statusPerkawinan
      : '-';
  const statusPerempuan =
    catin.jenisKelamin === 'Perempuan' ? catin.statusPerkawinan : '-';

  return [
    p('Lampiran V', { after: 0, line: 220 }),
    p('Keputusan Dirjen Bimas Islam No 473 Tahun 2020', { after: 80, line: 220 }),
    p('FORMULIR PENGANTAR NIKAH', { align: AlignmentType.CENTER, bold: false, after: 20 }),
    p('Model N1', { align: AlignmentType.RIGHT, after: 40 }),
    kvTable(
      [
        ['KANTOR DESA/KELURAHAN', (form.akad.desaPenerbit || '').toUpperCase()],
        ['KECAMATAN', (form.akad.kecamatanPenerbit || 'BATEALIT').toUpperCase()],
        ['KABUPATEN/KOTA', (form.akad.kabupatenPenerbit || 'JEPARA').toUpperCase()],
      ],
      62,
    ),
    p('PENGANTAR NIKAH', {
      align: AlignmentType.CENTER,
      bold: true,
      underline: true,
      before: 100,
      after: 20,
    }),
    p(`Nomor: ${form.akad.nomorSuratN1 || '............................................'}`, {
      align: AlignmentType.CENTER,
      after: 100,
    }),
    p('Yang bertanda tangan di bawah ini menjelaskan dengan sesungguhnya bahwa:', {
      after: 60,
    }),
    kvTable(
      [
        ['1.  Nama', catin.nama],
        ['2.  Nomor Induk Kependudukan (NIK)', catin.nik],
        ['3.  Jenis Kelamin', catin.jenisKelamin],
        ['4.  Tempat dan tanggal lahir', formatPlaceAndDate(catin.tempatLahir, catin.tanggalLahir)],
        ['5.  Kewarganegaraan', catin.kewarganegaraan || 'Indonesia'],
        ['6.  Agama', catin.agama || 'Islam'],
        ['7.  Pekerjaan', catin.pekerjaan],
        ['8.  Alamat', catin.alamat.alamatLengkap],
        ['9.  Status perkawinan', null],
        ['     a. Laki-laki', statusLaki],
        ['     b. Perempuan', statusPerempuan],
      ],
      70,
    ),
    p('Adalah benar anak dari pernikahan seorang pria:', { before: 80, after: 40 }),
    kvTable(
      [
        ['Nama Lengkap dan alias', ayah.nama ? `${ayah.nama}${ayah.masihHidup ? '' : ' (Alm.)'}` : ''],
        ['Nomor Induk Kependudukan (NIK)', ayah.nik || '-'],
        ['Tempat dan tanggal lahir', ayah.tempatLahir || ayah.tanggalLahir ? formatPlaceAndDate(ayah.tempatLahir, ayah.tanggalLahir) : '-'],
        ['Kewarganegaraan', ayah.kewarganegaraan || 'Indonesia'],
        ['Agama', ayah.agama || 'Islam'],
        ['Pekerjaan', ayah.pekerjaan || '-'],
        ['Alamat', ayah.alamat.alamatLengkap || '-'],
      ],
      70,
    ),
    p('dengan seorang wanita:', { before: 80, after: 40 }),
    kvTable(
      [
        ['Nama Lengkap dan alias', ibu.nama ? `${ibu.nama}${ibu.masihHidup ? '' : ' (Almh.)'}` : ''],
        ['Nomor Induk Kependudukan (NIK)', ibu.nik || '-'],
        ['Tempat dan tanggal lahir', ibu.tempatLahir || ibu.tanggalLahir ? formatPlaceAndDate(ibu.tempatLahir, ibu.tanggalLahir) : '-'],
        ['Kewarganegaraan', ibu.kewarganegaraan || 'Indonesia'],
        ['Agama', ibu.agama || 'Islam'],
        ['Pekerjaan', ibu.pekerjaan || '-'],
        ['Alamat', ibu.alamat.alamatLengkap || '-'],
      ],
      70,
    ),
    p(
      'Demikian, surat pengantar ini dibuat dengan mengingat sumpah jabatan dan untuk dipergunakan sebagaimana mestinya.',
      { before: 100, after: 100, align: AlignmentType.JUSTIFIED },
    ),
    twoColSignatureTable(
      [
        p('', { after: 0 }),
        p('Kepala Lingkungan', { align: AlignmentType.CENTER, after: 0 }),
        ...blankLines(F4_PAPER.n1SignatureBlankLines),
        p(
          form.penandatangan.kepalaLingkungan
            ? `( ${form.penandatangan.kepalaLingkungan} )`
            : '............................................. *)',
          { align: AlignmentType.CENTER, bold: Boolean(form.penandatangan.kepalaLingkungan), after: 20 },
        ),
        p('*) Nama lengkap', { align: AlignmentType.LEFT, size: SIZE_9, after: 0 }),
      ],
      [
        p(tanggalText, { align: AlignmentType.CENTER, after: 0 }),
        p(`${jabatan} ${form.akad.desaPenerbit || ''}`.trim(), {
          align: AlignmentType.CENTER,
          after: 0,
        }),
        // Extra wide line spacing for Kepala Desa / Lurah wet signature & stamp
        ...blankLines(F4_PAPER.n1SignatureBlankLines),
        p(
          petinggiFull ? petinggiFull : '............................................. *)',
          { align: AlignmentType.CENTER, bold: true, underline: Boolean(petinggiFull), after: 0 },
        ),
        ...(form.penandatangan.nip.trim()
          ? [p(`NIP. ${form.penandatangan.nip.trim()}`, { align: AlignmentType.CENTER, size: SIZE_10, after: 0 })]
          : []),
      ],
    ),
  ];
}

function buildN2Children(form: MarriageFilingForm): (Paragraph | Table)[] {
  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const hariTanggalJam = akadParts
    ? `${akadParts.dayName}, ${formatIndonesianDate(form.akad.tanggalAkad)} / Pukul ${form.akad.jamAkad || '-'}`
    : `${form.akad.tanggalAkad || '...................'} / ${form.akad.jamAkad || '.......'}`;
  const tanggalSuratText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  const pemohonNama = getPemohonName(form);

  return [
    p('Lampiran VI', { after: 0, line: 220 }),
    p('Keputusan Dirjen Bimas Islam No 473 Tahun 2020', { after: 100, line: 220 }),
    p('FORMULIR PERMOHONAN KEHENDAK NIKAH', {
      align: AlignmentType.CENTER,
      bold: true,
      after: 20,
    }),
    p('Model N2', { align: AlignmentType.RIGHT, after: 100 }),
    twoColSignatureTable(
      [p('Perihal  : Permohonan Kehendak Nikah', { after: 0 })],
      [p(tanggalSuratText, { align: AlignmentType.RIGHT, after: 0 })],
    ),
    p('Kepada Yth.', { before: 140, after: 20 }),
    p(`Kepala KUA Kecamatan / PPN LN ${form.akad.namaKuaTujuan || 'Batealit'}`, { after: 20 }),
    p(`di ${form.akad.alamatKuaTujuan || 'Batealit'}`, { after: 140 }),
    p(
      '          Dengan hormat, kami mengajukan permohonan kehendak nikah untuk atas nama :',
      { after: 80, align: AlignmentType.JUSTIFIED },
    ),
    kvTable(
      [
        ['Calon suami', `${form.suami.nama || '........................'} Bin ${form.suami.binBinti || form.ayahSuami.nama || '................'}`],
        ['Calon istri', `${form.istri.nama || '........................'} Binti ${form.istri.binBinti || form.ayahIstri.nama || '................'}`],
        ['Hari / Tanggal / Jam', hariTanggalJam],
        ['Tempat akad nikah', form.akad.tempatAkad],
        ['Mas Kawin / Mahar', form.akad.masKawin],
      ],
      48,
    ),
    p(
      '          Bersama ini kami sampaikan surat-surat yang diperlukan untuk diperiksa sebagai berikut:',
      { before: 120, after: 60 },
    ),
    ...N2_REQUIREMENTS_LIST.map((item, index) =>
      p(`${index + 1}.  ${item}`, { indentLeft: 320, after: 30, line: 260 }),
    ),
    p(
      '          Demikian permohonan ini kami sampaikan, kiranya dapat diperiksa, dihadiri, dan dicatat sesuai dengan ketentuan perundang-undangan.',
      { before: 120, after: 180, align: AlignmentType.JUSTIFIED },
    ),
    twoColSignatureTable(
      [
        p('Diterima tanggal .................................', { after: 20 }),
        p('Yang menerima,', { after: 20 }),
        p('Kepala KUA/PPN LN', { after: 0 }),
        ...blankLines(4),
        p('..................................................', { after: 0 }),
      ],
      [
        p('Wassalam,', { align: AlignmentType.CENTER, after: 20 }),
        p('Pemohon', { align: AlignmentType.CENTER, after: 0 }),
        ...blankLines(5),
        p(pemohonNama || '.........................................', {
          align: AlignmentType.CENTER,
          bold: Boolean(pemohonNama),
          underline: Boolean(pemohonNama),
          after: 0,
        }),
      ],
    ),
    p('', { before: 160, after: 40 }),
    kvTable(
      [
        ['No. Hp Calon Suami', form.suami.noHp || ''],
        ['No. Hp Calon Istri', form.istri.noHp || ''],
      ],
      48,
    ),
  ];
}

function buildN4Children(form: MarriageFilingForm): (Paragraph | Table)[] {
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  return [
    p('Lampiran VIII', { after: 0, line: 220 }),
    p('Keputusan Dirjen Bimas Islam No 473 Tahun 2020', { after: 80, line: 220 }),
    p('FORMULIR PERSETUJUAN CALON PENGANTIN', { align: AlignmentType.CENTER, after: 20 }),
    p('Model N4', { align: AlignmentType.RIGHT, after: 40 }),
    p('PERSETUJUAN CALON PENGANTIN', {
      align: AlignmentType.CENTER,
      bold: true,
      underline: true,
      after: 100,
    }),
    p('Yang bertanda tangan di bawah ini:', { after: 80 }),
    p('A.  Calon Suami:', { bold: true, after: 40 }),
    kvTable(
      [
        ['     1. Nama lengkap dan alias', form.suami.nama],
        ['     2. Bin', form.suami.binBinti || form.ayahSuami.nama],
        ['     3. Nomor Induk Kependudukan', form.suami.nik],
        ['     4. Tempat dan tanggal lahir', formatPlaceAndDate(form.suami.tempatLahir, form.suami.tanggalLahir)],
        ['     5. Kewarganegaraan', form.suami.kewarganegaraan || 'Indonesia'],
        ['     6. Agama', form.suami.agama || 'Islam'],
        ['     7. Pekerjaan', form.suami.pekerjaan],
        ['     8. Alamat', form.suami.alamat.alamatLengkap],
      ],
      68,
    ),
    p('B.  Calon Istri:', { bold: true, before: 120, after: 40 }),
    kvTable(
      [
        ['     1. Nama lengkap dan alias', form.istri.nama],
        ['     2. Binti', form.istri.binBinti || form.ayahIstri.nama],
        ['     3. Nomor Induk Kependudukan', form.istri.nik],
        ['     4. Tempat dan tanggal lahir', formatPlaceAndDate(form.istri.tempatLahir, form.istri.tanggalLahir)],
        ['     5. Kewarganegaraan', form.istri.kewarganegaraan || 'Indonesia'],
        ['     6. Agama', form.istri.agama || 'Islam'],
        ['     7. Pekerjaan', form.istri.pekerjaan],
        ['     8. Alamat', form.istri.alamat.alamatLengkap],
      ],
      68,
    ),
    p(
      'Menyatakan dengan sesungguhnya bahwa atas dasar suka rela, dengan kesadaran sendiri, tanpa ada paksaan dari siapapun juga, setuju untuk melangsungkan pernikahan.',
      { before: 140, after: 100, align: AlignmentType.JUSTIFIED },
    ),
    p('Demikian surat persetujuan ini dibuat untuk digunakan seperlunya.', {
      after: 140,
    }),
    p(tanggalText, { align: AlignmentType.RIGHT, after: 60 }),
    twoColSignatureTable(
      [
        p('Calon Suami', { align: AlignmentType.CENTER, after: 0 }),
        ...blankLines(4),
        p(form.suami.nama || '.........................................', {
          align: AlignmentType.CENTER,
          bold: Boolean(form.suami.nama),
          underline: Boolean(form.suami.nama),
          after: 0,
        }),
      ],
      [
        p('Calon Istri,', { align: AlignmentType.CENTER, after: 0 }),
        ...blankLines(4),
        p(form.istri.nama || '.........................................', {
          align: AlignmentType.CENTER,
          bold: Boolean(form.istri.nama),
          underline: Boolean(form.istri.nama),
          after: 0,
        }),
      ],
    ),
  ];
}

function buildN5Children(
  form: MarriageFilingForm,
  ayah: ParentData,
  ibu: ParentData,
  anak: CatinData,
  pasangan: CatinData,
): (Paragraph | Table)[] {
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  return [
    p('Lampiran IX', { after: 0, line: 220 }),
    p('Keputusan Dirjen Bimas Islam No 473 Tahun 2020', { after: 40, line: 220 }),
    p('FORMULIR SURAT IZIN ORANG TUA', { align: AlignmentType.CENTER, after: 0 }),
    p('Model N5', { align: AlignmentType.RIGHT, after: 20 }),
    p('SURAT IZIN ORANG TUA', {
      align: AlignmentType.CENTER,
      bold: true,
      underline: true,
      after: 60,
    }),
    p('Yang bertanda tangan di bawah ini:', { after: 40 }),
    kvTable(
      [
        ['A.  1. Nama lengkap dan alias', ayah.nama],
        ['     2. Bin', ayah.binBinti],
        ['     3. Nomor Induk Kependudukan', ayah.nik],
        ['     4. Tempat dan tanggal lahir', formatPlaceAndDate(ayah.tempatLahir, ayah.tanggalLahir)],
        ['     5. Kewarganegaraan', ayah.kewarganegaraan || 'Indonesia'],
        ['     6. Agama', ayah.agama || 'Islam'],
        ['     7. Pekerjaan', ayah.pekerjaan],
        ['     8. Alamat', ayah.alamat.alamatLengkap],
      ],
      68,
    ),
    p('', { after: 20, line: 120 }),
    kvTable(
      [
        ['B.  1. Nama lengkap dan alias', ibu.nama],
        ['     2. Binti', ibu.binBinti],
        ['     3. Nomor Induk Kependudukan', ibu.nik],
        ['     4. Tempat dan tanggal lahir', formatPlaceAndDate(ibu.tempatLahir, ibu.tanggalLahir)],
        ['     5. Kewarganegaraan', ibu.kewarganegaraan || 'Indonesia'],
        ['     6. Agama', ibu.agama || 'Islam'],
        ['     7. Pekerjaan', ibu.pekerjaan],
        ['     8. Alamat', ibu.alamat.alamatLengkap],
      ],
      68,
    ),
    p('adalah ayah kandung dan ibu kandung/wali/pengampu dari:', { before: 60, after: 30 }),
    kvTable(
      [
        ['     1. Nama lengkap dan alias', anak.nama],
        ['     2. Bin/Binti*)', anak.binBinti || ayah.nama],
        ['     3. Nomor Induk Kependudukan', anak.nik],
        ['     4. Tempat dan tanggal lahir', formatPlaceAndDate(anak.tempatLahir, anak.tanggalLahir)],
        ['     5. Kewarganegaraan', anak.kewarganegaraan || 'Indonesia'],
        ['     6. Agama', anak.agama || 'Islam'],
        ['     7. Pekerjaan', anak.pekerjaan],
        ['     8. Alamat', anak.alamat.alamatLengkap],
      ],
      68,
    ),
    p('memberi izin kepada anak kami untuk melakukan pernikahan dengan:', { before: 60, after: 30 }),
    kvTable(
      [
        ['     1. Nama lengkap dan alias', pasangan.nama],
        ['     2. Bin/Binti*)', pasangan.binBinti],
        ['     3. Nomor Induk Kependudukan', pasangan.nik],
        ['     4. Tempat dan tanggal lahir', formatPlaceAndDate(pasangan.tempatLahir, pasangan.tanggalLahir)],
        ['     5. Kewarganegaraan', pasangan.kewarganegaraan || 'Indonesia'],
        ['     6. Agama', pasangan.agama || 'Islam'],
        ['     7. Pekerjaan', pasangan.pekerjaan],
        ['     8. Alamat', pasangan.alamat.alamatLengkap],
      ],
      68,
    ),
    p(
      'Demikianlah surat izin ini dibuat dengan kesadaran tanpa ada paksaan dari siapapun dan untuk dipergunakan seperlunya.',
      { before: 80, after: 80, align: AlignmentType.JUSTIFIED },
    ),
    p(tanggalText, { align: AlignmentType.RIGHT, after: 40 }),
    twoColSignatureTable(
      [
        p('Ayah/wali/pengampu', { align: AlignmentType.CENTER, bold: true, after: 0 }),
        ...blankLines(3),
        p(`( ${ayah.nama || '.............................................'} )`, {
          align: AlignmentType.CENTER,
          after: 0,
        }),
      ],
      [
        p('Ibu/wali/pengampu', { align: AlignmentType.CENTER, bold: true, after: 0 }),
        ...blankLines(3),
        p(`( ${ibu.nama || '.............................................'} )`, {
          align: AlignmentType.CENTER,
          after: 0,
        }),
      ],
    ),
  ];
}

function buildSptjmChildren(form: MarriageFilingForm): (Paragraph | Table)[] {
  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const hariText = akadParts ? akadParts.dayName : '...................';
  const tanggalAkadText = akadParts ? formatIndonesianDate(form.akad.tanggalAkad) : '.........................';
  const jamText = form.akad.jamAkad || '..........';

  return [
    p('SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)', {
      align: AlignmentType.CENTER,
      bold: true,
      after: 180,
    }),
    p('Kami yang bertanda tangan dibawah ini :', { after: 100 }),
    kvTable(
      [
        ['1.  Nama Calon Suami', form.suami.nama],
        ['     NIK', form.suami.nik],
        ['     Tempat, Tgl. Lahir', formatPlaceAndDate(form.suami.tempatLahir, form.suami.tanggalLahir)],
        ['     Status', form.suami.statusPerkawinan],
        ['     Alamat', form.suami.alamat.alamatLengkap],
      ],
      52,
    ),
    p('', { after: 60, line: 160 }),
    kvTable(
      [
        ['2.  Nama Calon Istri', form.istri.nama],
        ['     NIK', form.istri.nik],
        ['     Tempat, Tgl. Lahir', formatPlaceAndDate(form.istri.tempatLahir, form.istri.tanggalLahir)],
        ['     Status', form.istri.statusPerkawinan],
        ['     Alamat', form.istri.alamat.alamatLengkap],
      ],
      52,
    ),
    p('', { after: 60, line: 160 }),
    kvTable(
      [
        ['3.  Nama Wali Nikah', form.waliNikah.nama],
        ['     NIK', form.waliNikah.nik],
        ['     Tempat, Tgl. Lahir', formatPlaceAndDate(form.waliNikah.tempatLahir, form.waliNikah.tanggalLahir)],
        ['     Alamat', form.waliNikah.alamat.alamatLengkap],
      ],
      52,
    ),
    p(
      `Mengajukan Permohonan Kehendak Perkawinan Pada Hari ${hariText} Tanggal ${tanggalAkadText} Jam ${jamText}`,
      { before: 140, after: 120, align: AlignmentType.JUSTIFIED },
    ),
    p(
      [
        run(
          'Dengan ini kami menyatakan dengan sesungguhnya bahwa keterangan, data dan berkas yang kami berikan kepada KUA Kecamatan Batealit Untuk Keperluan pendaftaran pernikahan kami adalah ',
        ),
        run('SUDAH BENAR DAN AKURAT', { bold: true }),
        run(
          '. Apabila data tersebut tidak benar, maka berkasnya bersedia ditolak dan dikembalikan kepada kami, dan batal demi hukum.',
        ),
      ],
      { after: 120, align: AlignmentType.JUSTIFIED },
    ),
    p('Demikian pernyataan ini, dibuat dengan sadar dan penuh tanggung jawab.', {
      after: 180,
    }),
    p(`Jepara, ${formatIndonesianDate(form.akad.tanggalSurat)}`, {
      align: AlignmentType.CENTER,
      after: 80,
    }),
    new Table({
      width: { size: convertMillimetersToTwip(160), type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: convertMillimetersToTwip(62), type: WidthType.DXA },
              borders: NO_BORDERS,
              children: [
                p('Calon Suami', { align: AlignmentType.CENTER, after: 0 }),
                ...blankLines(4),
                p(form.suami.nama || '………………………..….', {
                  align: AlignmentType.CENTER,
                  bold: Boolean(form.suami.nama),
                  underline: Boolean(form.suami.nama),
                  after: 0,
                }),
              ],
            }),
            new TableCell({
              width: { size: convertMillimetersToTwip(36), type: WidthType.DXA },
              borders: NO_BORDERS,
              children: [
                ...blankLines(2),
                p('Materai', { align: AlignmentType.CENTER, size: SIZE_10, after: 0 }),
                p('10.000', { align: AlignmentType.CENTER, size: SIZE_10, after: 0 }),
              ],
            }),
            new TableCell({
              width: { size: convertMillimetersToTwip(62), type: WidthType.DXA },
              borders: NO_BORDERS,
              children: [
                p('Calon Istri', { align: AlignmentType.CENTER, after: 0 }),
                ...blankLines(4),
                p(form.istri.nama || '…………..……………….', {
                  align: AlignmentType.CENTER,
                  bold: Boolean(form.istri.nama),
                  underline: Boolean(form.istri.nama),
                  after: 0,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    p('Wali Nikah', { align: AlignmentType.CENTER, before: 140, after: 0 }),
    ...blankLines(4),
    p(form.waliNikah.nama || '…………………………………', {
      align: AlignmentType.CENTER,
      bold: Boolean(form.waliNikah.nama),
      underline: Boolean(form.waliNikah.nama),
      after: 0,
    }),
  ];
}

function buildSuratKuasaChildren(form: MarriageFilingForm): (Paragraph | Table)[] {
  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const tgl = akadParts ? String(akadParts.day).padStart(2, '0') : '.....';
  const bln = akadParts ? akadParts.monthName : '……………';
  const thn = akadParts ? String(akadParts.year) : '……';

  const pemberiNama = form.pemberiKuasa.nama || form.suami.nama;
  const pemberiNik = form.pemberiKuasa.nik || form.suami.nik;
  const pemberiAlamat = form.pemberiKuasa.alamat || form.suami.alamat.alamatLengkap;

  return [
    p('SURAT KUASA', { align: AlignmentType.CENTER, bold: true, after: 220 }),
    p('Yang bertanda tangan di bawah ini,', { after: 60 }),
    kvTable(
      [
        ['Nama', pemberiNama],
        ['NIK', pemberiNik],
        ['Alamat', pemberiAlamat],
      ],
      34,
    ),
    p('Dengan ini memberikan kuasa kepada,', { before: 180, after: 60 }),
    kvTable(
      [
        ['Nama', form.penerimaKuasa.nama],
        ['NIK', form.penerimaKuasa.nik],
        ['Alamat', form.penerimaKuasa.alamat],
      ],
      34,
    ),
    p(
      `Untuk mewakili saya: ${form.suami.nama || '…………………………..……..'} dan ${form.istri.nama || '……………………………………..'} mengurus surat surat persyaratan Nikah dan mendaftarkan nikah ke Kantor Urusan Agama Kec. Batealit Jepara yang pernikahannya akan dilaksanakan pada tanggal ${tgl} bulan ${bln} tahun ${thn}.`,
      { before: 200, after: 140, align: AlignmentType.JUSTIFIED, line: 320 },
    ),
    p('Demikian, surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya.', {
      after: 240,
    }),
    new Table({
      width: { size: convertMillimetersToTwip(160), type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: convertMillimetersToTwip(64), type: WidthType.DXA },
              borders: NO_BORDERS,
              children: [
                p('', { after: 0 }),
                p('Pihak Kedua/ Penerima Kuasa', { align: AlignmentType.CENTER, after: 0 }),
                ...blankLines(4),
                p(form.penerimaKuasa.nama || '………………………………..', {
                  align: AlignmentType.CENTER,
                  bold: Boolean(form.penerimaKuasa.nama),
                  underline: Boolean(form.penerimaKuasa.nama),
                  after: 0,
                }),
              ],
            }),
            new TableCell({
              width: { size: convertMillimetersToTwip(32), type: WidthType.DXA },
              borders: NO_BORDERS,
              children: [
                ...blankLines(2),
                new Table({
                  width: { size: convertMillimetersToTwip(24), type: WidthType.DXA },
                  alignment: AlignmentType.CENTER,
                  borders: ALL_THIN_BORDERS,
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: ALL_THIN_BORDERS,
                          margins: { top: 60, bottom: 60, left: 60, right: 60 },
                          children: [
                            p('Materai', { align: AlignmentType.CENTER, size: SIZE_9, after: 0, line: 200 }),
                            p('10.000', { align: AlignmentType.CENTER, size: SIZE_9, after: 0, line: 200 }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: convertMillimetersToTwip(64), type: WidthType.DXA },
              borders: NO_BORDERS,
              children: [
                p(`Jepara, ${formatIndonesianDate(form.akad.tanggalSurat)}`, {
                  align: AlignmentType.CENTER,
                  after: 0,
                }),
                p('Pihak Pertama/Pemberi kuasa', { align: AlignmentType.CENTER, after: 0 }),
                ...blankLines(4),
                p(pemberiNama || '………………………………..', {
                  align: AlignmentType.CENTER,
                  bold: Boolean(pemberiNama),
                  underline: Boolean(pemberiNama),
                  after: 0,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

function buildBelumMenikahChildren(
  form: MarriageFilingForm,
  catin: CatinData,
): (Paragraph | Table)[] {
  const petinggiFull = formatPetinggiDisplay(form.penandatangan);
  const jabatan = form.penandatangan.jabatanPenandatangan || 'Kepala Desa / Lurah';
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  const statusLabel = catin.jenisKelamin === 'Laki-laki' ? 'Jejaka' : 'Perawan';

  return [
    p('SURAT PERNYATAAN BELUM PERNAH MENIKAH', {
      align: AlignmentType.CENTER,
      bold: true,
      underline: true,
      after: 220,
    }),
    p('Yang bertanda tangan di bawah ini:', { after: 100 }),
    kvTable(
      [
        ['Nama Lengkap', catin.nama],
        ['Nomor Induk Kependudukan (NIK)', catin.nik],
        ['Tempat dan Tanggal Lahir', formatPlaceAndDate(catin.tempatLahir, catin.tanggalLahir)],
        ['Jenis Kelamin', catin.jenisKelamin],
        ['Kewarganegaraan', catin.kewarganegaraan || 'Indonesia'],
        ['Agama', catin.agama || 'Islam'],
        ['Pekerjaan', catin.pekerjaan],
        ['Alamat', catin.alamat.alamatLengkap],
      ],
      68,
    ),
    p(
      [
        run(
          'Dengan ini menyatakan dengan sesungguhnya bahwa sampai saat surat pernyataan ini dibuat, saya benar-benar ',
        ),
        run(`BELUM PERNAH MENIKAH (${statusLabel})`, { bold: true }),
        run(
          ' dengan siapapun, baik secara resmi menurut hukum negara maupun secara agama, serta tidak terikat tali perkawinan dengan pihak manapun.',
        ),
      ],
      { before: 180, after: 120, align: AlignmentType.JUSTIFIED, line: 300 },
    ),
    p(
      'Apabila di kemudian hari ternyata pernyataan saya ini tidak benar, maka saya bersedia dituntut sesuai dengan ketentuan hukum yang berlaku dan segala akibat hukumnya menjadi tanggung jawab saya sepenuhnya.',
      { after: 120, align: AlignmentType.JUSTIFIED, line: 300 },
    ),
    p(
      'Demikian surat pernyataan ini saya buat dengan sadar, jujur, dan tanpa paksaan dari pihak manapun untuk dipergunakan sebagai kelengkapan berkas pendaftaran nikah di KUA Kecamatan Batealit Kabupaten Jepara.',
      { after: 220, align: AlignmentType.JUSTIFIED, line: 300 },
    ),
    twoColSignatureTable(
      [
        p('Mengetahui,', { align: AlignmentType.CENTER, after: 0 }),
        p(`${jabatan} ${form.akad.desaPenerbit || ''}`.trim(), {
          align: AlignmentType.CENTER,
          after: 0,
        }),
        ...blankLines(F4_PAPER.n1SignatureBlankLines),
        p(petinggiFull || '.............................................', {
          align: AlignmentType.CENTER,
          bold: true,
          underline: Boolean(petinggiFull),
          after: 0,
        }),
        ...(form.penandatangan.nip.trim()
          ? [p(`NIP. ${form.penandatangan.nip.trim()}`, { align: AlignmentType.CENTER, size: SIZE_10, after: 0 })]
          : []),
      ],
      [
        p(tanggalText, { align: AlignmentType.CENTER, after: 0 }),
        p('Yang Membuat Pernyataan,', { align: AlignmentType.CENTER, after: 0 }),
        ...blankLines(2),
        p('Materai 10.000', { align: AlignmentType.CENTER, size: SIZE_9, after: 0 }),
        ...blankLines(3),
        p(catin.nama || '.............................................', {
          align: AlignmentType.CENTER,
          bold: Boolean(catin.nama),
          underline: Boolean(catin.nama),
          after: 0,
        }),
      ],
    ),
  ];
}

function getSectionChildren(
  form: MarriageFilingForm,
  docKey: DocumentTabKey,
): (Paragraph | Table)[] {
  switch (docKey) {
    case 'n1_suami':
      return buildN1Children(form, form.suami, form.ayahSuami, form.ibuSuami);
    case 'n1_istri':
      return buildN1Children(form, form.istri, form.ayahIstri, form.ibuIstri);
    case 'n2':
      return buildN2Children(form);
    case 'n4':
      return buildN4Children(form);
    case 'n5_suami':
      return buildN5Children(form, form.ayahSuami, form.ibuSuami, form.suami, form.istri);
    case 'n5_istri':
      return buildN5Children(form, form.ayahIstri, form.ibuIstri, form.istri, form.suami);
    case 'sptjm':
      return buildSptjmChildren(form);
    case 'surat_kuasa':
      return buildSuratKuasaChildren(form);
    case 'belum_menikah_suami':
      return buildBelumMenikahChildren(form, form.suami);
    case 'belum_menikah_istri':
      return buildBelumMenikahChildren(form, form.istri);
  }
}

export function createMarriageWordDocument(
  form: MarriageFilingForm,
  docKeys: DocumentTabKey[],
): Document {
  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: SIZE_11,
          },
        },
      },
    },
    sections: docKeys.map((key) => ({
      properties: {
        page: {
          size: {
            width: convertMillimetersToTwip(F4_PAPER.widthMm),
            height: convertMillimetersToTwip(F4_PAPER.heightMm),
          },
          margin: {
            top: convertMillimetersToTwip(F4_PAPER.marginTopMm),
            bottom: convertMillimetersToTwip(F4_PAPER.marginBottomMm),
            left: convertMillimetersToTwip(F4_PAPER.marginLeftMm),
            right: convertMillimetersToTwip(F4_PAPER.marginRightMm),
          },
        },
      },
      children: getSectionChildren(form, key),
    })),
  });
}

export async function generateMarriageWordBlob(
  form: MarriageFilingForm,
  docKeys: DocumentTabKey[],
): Promise<Blob> {
  const doc = createMarriageWordDocument(form, docKeys);
  return Packer.toBlob(doc);
}

export async function generateRecapWordBlob(
  records: MarriageFilingRecord[],
  periodLabel: string,
  desaLabel: string,
): Promise<Blob> {
  const colWidths = [10, 26, 36, 36, 26, 26]; // total 160mm
  const headerCells = ['No', 'Desa', 'Calon Suami (NIK)', 'Calon Istri (NIK)', 'Tgl Akad', 'Status'];

  const table = new Table({
    width: { size: convertMillimetersToTwip(160), type: WidthType.DXA },
    borders: ALL_THIN_BORDERS,
    rows: [
      new TableRow({
        children: headerCells.map((h, i) =>
          new TableCell({
            width: { size: convertMillimetersToTwip(colWidths[i]), type: WidthType.DXA },
            borders: ALL_THIN_BORDERS,
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [p(h, { bold: true, size: SIZE_9, after: 0 })],
          }),
        ),
      }),
      ...records.map(
        (rec, idx) =>
          new TableRow({
            children: [
              String(idx + 1),
              rec.desaName,
              `${rec.namaSuami}\n${rec.nikSuami}`,
              `${rec.namaIstri}\n${rec.nikIstri}`,
              rec.tanggalAkad ? formatIndonesianDate(rec.tanggalAkad) : '-',
              rec.statusBerkas,
            ].map((val, i) =>
              new TableCell({
                width: { size: convertMillimetersToTwip(colWidths[i]), type: WidthType.DXA },
                borders: ALL_THIN_BORDERS,
                margins: { top: 50, bottom: 50, left: 60, right: 60 },
                children: val.split('\n').map((line) => p(line, { size: SIZE_9, after: 0, line: 220 })),
              }),
            ),
          }),
      ),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(F4_PAPER.widthMm),
              height: convertMillimetersToTwip(F4_PAPER.heightMm),
            },
            margin: {
              top: convertMillimetersToTwip(F4_PAPER.marginTopMm),
              bottom: convertMillimetersToTwip(F4_PAPER.marginBottomMm),
              left: convertMillimetersToTwip(F4_PAPER.marginLeftMm),
              right: convertMillimetersToTwip(F4_PAPER.marginRightMm),
            },
          },
        },
        children: [
          p('REKAPITULASI LAPORAN PEMBERKASAN NIKAH', {
            align: AlignmentType.CENTER,
            bold: true,
            after: 40,
          }),
          p('KANTOR URUSAN AGAMA (KUA) KECAMATAN BATEALIT KABUPATEN JEPARA', {
            align: AlignmentType.CENTER,
            bold: true,
            after: 120,
          }),
          p(`Wilayah : ${desaLabel}   |   Periode : ${periodLabel}   |   Total Berkas : ${records.length}`, {
            align: AlignmentType.CENTER,
            size: SIZE_10,
            after: 160,
          }),
          table,
          p(`Dicetak pada: ${formatIndonesianDate(new Date().toISOString().slice(0, 10))}`, {
            align: AlignmentType.RIGHT,
            size: SIZE_9,
            before: 180,
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
