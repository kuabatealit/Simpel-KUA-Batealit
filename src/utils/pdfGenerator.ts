import { jsPDF } from 'jspdf';
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

const ML = F4_PAPER.marginLeftMm; // 25mm
const MR = F4_PAPER.marginRightMm; // 25mm
const PAGE_W = F4_PAPER.widthMm; // 210mm
const PAGE_H = F4_PAPER.heightMm; // 330mm
const CONTENT_W = PAGE_W - ML - MR; // 160mm
const FONT_PT = F4_PAPER.fontSizePt; // 11pt
const LINE_H = 5.3;

function createF4Pdf(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_W, PAGE_H],
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(FONT_PT);
  return doc;
}

function drawCentered(
  doc: jsPDF,
  text: string,
  y: number,
  opts?: { bold?: boolean; underline?: boolean; size?: number },
): number {
  doc.setFont('times', opts?.bold ? 'bold' : 'normal');
  doc.setFontSize(opts?.size ?? FONT_PT);
  doc.text(text, PAGE_W / 2, y, { align: 'center' });
  if (opts?.underline) {
    const w = doc.getTextWidth(text);
    doc.setLineWidth(0.3);
    doc.line(PAGE_W / 2 - w / 2, y + 1, PAGE_W / 2 + w / 2, y + 1);
  }
  doc.setFont('times', 'normal');
  doc.setFontSize(FONT_PT);
  return y + LINE_H;
}

function drawParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  opts?: { bold?: boolean; size?: number; lineH?: number; align?: 'left' | 'right' | 'center' | 'justify' },
): number {
  doc.setFont('times', opts?.bold ? 'bold' : 'normal');
  doc.setFontSize(opts?.size ?? FONT_PT);
  const lines: string[] = doc.splitTextToSize(text, maxW);
  const step = opts?.lineH ?? LINE_H;
  for (const line of lines) {
    if (opts?.align === 'right') {
      doc.text(line, x + maxW, y, { align: 'right' });
    } else if (opts?.align === 'center') {
      doc.text(line, x + maxW / 2, y, { align: 'center' });
    } else {
      doc.text(line, x, y);
    }
    y += step;
  }
  doc.setFont('times', 'normal');
  doc.setFontSize(FONT_PT);
  return y;
}

function drawKvRows(
  doc: jsPDF,
  rows: Array<[string, string | null]>,
  startY: number,
  labelW = 64,
  lineH = 5.1,
): number {
  let y = startY;
  const colonX = ML + labelW;
  const valX = colonX + 4;
  const valW = CONTENT_W - labelW - 4;

  for (const [label, rawValue] of rows) {
    doc.text(label, ML, y);
    if (rawValue === null) {
      y += lineH;
      continue;
    }
    const val = rawValue && rawValue.trim() ? rawValue.trim() : '........................................................';
    if (label.trim()) {
      doc.text(':', colonX, y);
    }
    const lines: string[] = doc.splitTextToSize(val, valW);
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], valX, y + i * lineH);
    }
    y += Math.max(1, lines.length) * lineH;
  }
  return y;
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

function renderN1Page(
  doc: jsPDF,
  form: MarriageFilingForm,
  catin: CatinData,
  ayah: ParentData,
  ibu: ParentData,
) {
  let y = F4_PAPER.marginTopMm + 4;
  doc.setFontSize(10);
  doc.text('Lampiran V', ML, y);
  y += 4.5;
  doc.text('Keputusan Dirjen Bimas Islam No 473 Tahun 2020', ML, y);
  doc.setFontSize(FONT_PT);
  y += 7;

  y = drawCentered(doc, 'FORMULIR PENGANTAR NIKAH', y);
  doc.text('Model N1', PAGE_W - MR, y, { align: 'right' });
  y += 5;

  y = drawKvRows(
    doc,
    [
      ['KANTOR DESA/KELURAHAN', (form.akad.desaPenerbit || '').toUpperCase()],
      ['KECAMATAN', (form.akad.kecamatanPenerbit || 'BATEALIT').toUpperCase()],
      ['KABUPATEN/KOTA', (form.akad.kabupatenPenerbit || 'JEPARA').toUpperCase()],
    ],
    y,
    60,
    5.0,
  );
  y += 4;
  y = drawCentered(doc, 'PENGANTAR NIKAH', y, { bold: true, underline: true });
  y = drawCentered(
    doc,
    `Nomor: ${form.akad.nomorSuratN1 || '............................................'}`,
    y,
  );
  y += 3;

  y = drawParagraph(
    doc,
    'Yang bertanda tangan di bawah ini menjelaskan dengan sesungguhnya bahwa:',
    ML,
    y,
    CONTENT_W,
  );
  y += 1;

  const statusLaki =
    catin.jenisKelamin === 'Laki-laki'
      ? catin.statusPerkawinan === 'Beristri' && catin.istriKe
        ? `Beristri (Istri Ke-${catin.istriKe})`
        : catin.statusPerkawinan
      : '-';
  const statusPerempuan =
    catin.jenisKelamin === 'Perempuan' ? catin.statusPerkawinan : '-';

  y = drawKvRows(
    doc,
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
    y,
    68,
    4.9,
  );

  y += 2.5;
  y = drawParagraph(doc, 'Adalah benar anak dari pernikahan seorang pria:', ML, y, CONTENT_W);
  y = drawKvRows(
    doc,
    [
      ['Nama Lengkap dan alias', ayah.nama ? `${ayah.nama}${ayah.masihHidup ? '' : ' (Alm.)'}` : '-'],
      ['Nomor Induk Kependudukan (NIK)', ayah.nik || '-'],
      ['Tempat dan tanggal lahir', ayah.tempatLahir || ayah.tanggalLahir ? formatPlaceAndDate(ayah.tempatLahir, ayah.tanggalLahir) : '-'],
      ['Kewarganegaraan', ayah.kewarganegaraan || 'Indonesia'],
      ['Agama', ayah.agama || 'Islam'],
      ['Pekerjaan', ayah.pekerjaan || '-'],
      ['Alamat', ayah.alamat.alamatLengkap || '-'],
    ],
    y,
    68,
    4.9,
  );

  y += 2.5;
  y = drawParagraph(doc, 'dengan seorang wanita:', ML, y, CONTENT_W);
  y = drawKvRows(
    doc,
    [
      ['Nama Lengkap dan alias', ibu.nama ? `${ibu.nama}${ibu.masihHidup ? '' : ' (Almh.)'}` : '-'],
      ['Nomor Induk Kependudukan (NIK)', ibu.nik || '-'],
      ['Tempat dan tanggal lahir', ibu.tempatLahir || ibu.tanggalLahir ? formatPlaceAndDate(ibu.tempatLahir, ibu.tanggalLahir) : '-'],
      ['Kewarganegaraan', ibu.kewarganegaraan || 'Indonesia'],
      ['Agama', ibu.agama || 'Islam'],
      ['Pekerjaan', ibu.pekerjaan || '-'],
      ['Alamat', ibu.alamat.alamatLengkap || '-'],
    ],
    y,
    68,
    4.9,
  );

  y += 3.5;
  y = drawParagraph(
    doc,
    'Demikian, surat pengantar ini dibuat dengan mengingat sumpah jabatan dan untuk dipergunakan sebagaimana mestinya.',
    ML,
    y,
    CONTENT_W,
  );

  y += 4;
  const leftCenterX = ML + 36;
  const rightCenterX = ML + 122;
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  const jabatan = `${form.penandatangan.jabatanPenandatangan || 'Kepala Desa / Lurah'} ${form.akad.desaPenerbit || ''}`.trim();
  const petinggiFull = formatPetinggiDisplay(form.penandatangan);

  doc.text(tanggalText, rightCenterX, y, { align: 'center' });
  y += 5.2;
  doc.text('Kepala Lingkungan', leftCenterX, y, { align: 'center' });
  doc.text(jabatan, rightCenterX, y, { align: 'center' });

  // Extra wide spacing (34mm) for wet signature & official village stamp
  y += 34;

  const kalingLabel = form.penandatangan.kepalaLingkungan
    ? `( ${form.penandatangan.kepalaLingkungan} )`
    : '............................................. *)';
  doc.text(kalingLabel, leftCenterX, y, { align: 'center' });

  if (petinggiFull) {
    doc.setFont('times', 'bold');
    doc.text(petinggiFull, rightCenterX, y, { align: 'center' });
    const w = doc.getTextWidth(petinggiFull);
    doc.setLineWidth(0.3);
    doc.line(rightCenterX - w / 2, y + 1, rightCenterX + w / 2, y + 1);
    doc.setFont('times', 'normal');
  } else {
    doc.text('............................................. *)', rightCenterX, y, { align: 'center' });
  }

  y += 5;
  doc.setFontSize(9.5);
  doc.text('*) Nama lengkap', ML, y);
  if (form.penandatangan.nip.trim()) {
    doc.text(`NIP. ${form.penandatangan.nip.trim()}`, rightCenterX, y, { align: 'center' });
  }
  doc.setFontSize(FONT_PT);
}

function renderN2Page(doc: jsPDF, form: MarriageFilingForm) {
  let y = F4_PAPER.marginTopMm + 4;
  doc.setFontSize(10);
  doc.text('Lampiran VI', ML, y);
  y += 4.5;
  doc.text('Keputusan Dirjen Bimas Islam No 473 Tahun 2020', ML, y);
  doc.setFontSize(FONT_PT);
  y += 8;

  y = drawCentered(doc, 'FORMULIR PERMOHONAN KEHENDAK NIKAH', y, { bold: true });
  doc.text('Model N2', PAGE_W - MR, y, { align: 'right' });
  y += 9;

  const tanggalSuratText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  doc.text('Perihal  : Permohonan Kehendak Nikah', ML, y);
  doc.text(tanggalSuratText, PAGE_W - MR, y, { align: 'right' });
  y += 12;

  doc.text('Kepada Yth.', ML, y);
  y += LINE_H;
  doc.text(`Kepala KUA Kecamatan / PPN LN ${form.akad.namaKuaTujuan || 'Batealit'}`, ML, y);
  y += LINE_H;
  doc.text(`di ${form.akad.alamatKuaTujuan || 'Batealit'}`, ML, y);
  y += 10;

  y = drawParagraph(
    doc,
    '        Dengan hormat, kami mengajukan permohonan kehendak nikah untuk atas nama :',
    ML,
    y,
    CONTENT_W,
  );
  y += 2;

  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const hariTanggalJam = akadParts
    ? `${akadParts.dayName}, ${formatIndonesianDate(form.akad.tanggalAkad)} / Pukul ${form.akad.jamAkad || '-'}`
    : `${form.akad.tanggalAkad || '...................'} / ${form.akad.jamAkad || '.......'}`;

  y = drawKvRows(
    doc,
    [
      ['Calon suami', `${form.suami.nama || '........................'} Bin ${form.suami.binBinti || form.ayahSuami.nama || '................'}`],
      ['Calon istri', `${form.istri.nama || '........................'} Binti ${form.istri.binBinti || form.ayahIstri.nama || '................'}`],
      ['Hari / Tanggal / Jam', hariTanggalJam],
      ['Tempat akad nikah', form.akad.tempatAkad],
      ['Mas Kawin / Mahar', form.akad.masKawin],
    ],
    y,
    46,
    5.6,
  );

  y += 6;
  y = drawParagraph(
    doc,
    '        Bersama ini kami sampaikan surat-surat yang diperlukan untuk diperiksa sebagai berikut:',
    ML,
    y,
    CONTENT_W,
  );
  y += 2;

  N2_REQUIREMENTS_LIST.forEach((item, idx) => {
    doc.text(`${idx + 1}.  ${item}`, ML + 6, y);
    y += 5.8;
  });

  y += 5;
  y = drawParagraph(
    doc,
    '        Demikian permohonan ini kami sampaikan, kiranya dapat diperiksa, dihadiri, dan dicatat sesuai dengan ketentuan perundang-undangan.',
    ML,
    y,
    CONTENT_W,
  );

  y += 12;
  const rightX = ML + 124;
  doc.text('Diterima tanggal .................................', ML, y);
  doc.text('Wassalam,', rightX, y, { align: 'center' });
  y += 5.4;
  doc.text('Yang menerima,', ML, y);
  doc.text('Pemohon', rightX, y, { align: 'center' });
  y += 5.4;
  doc.text('Kepala KUA/PPN LN', ML, y);
  y += 24;

  const pemohonNama = getPemohonName(form);
  doc.text('..................................................', ML, y);
  if (pemohonNama) {
    doc.setFont('times', 'bold');
    doc.text(pemohonNama, rightX, y, { align: 'center' });
    const w = doc.getTextWidth(pemohonNama);
    doc.line(rightX - w / 2, y + 1, rightX + w / 2, y + 1);
    doc.setFont('times', 'normal');
  } else {
    doc.text('.........................................', rightX, y, { align: 'center' });
  }

  y += 16;
  drawKvRows(
    doc,
    [
      ['No. Hp Calon Suami', form.suami.noHp || '-'],
      ['No. Hp Calon Istri', form.istri.noHp || '-'],
    ],
    y,
    46,
    5.6,
  );
}

function renderN4Page(doc: jsPDF, form: MarriageFilingForm) {
  let y = F4_PAPER.marginTopMm + 4;
  doc.setFontSize(10);
  doc.text('Lampiran VIII', ML, y);
  y += 4.5;
  doc.text('Keputusan Dirjen Bimas Islam No 473 Tahun 2020', ML, y);
  doc.setFontSize(FONT_PT);
  y += 8;

  y = drawCentered(doc, 'FORMULIR PERSETUJUAN CALON PENGANTIN', y);
  doc.text('Model N4', PAGE_W - MR, y, { align: 'right' });
  y += 6;
  y = drawCentered(doc, 'PERSETUJUAN CALON PENGANTIN', y, { bold: true, underline: true });
  y += 5;

  y = drawParagraph(doc, 'Yang bertanda tangan di bawah ini:', ML, y, CONTENT_W);
  y += 2;

  doc.setFont('times', 'bold');
  doc.text('A.  Calon Suami:', ML, y);
  doc.setFont('times', 'normal');
  y += 5.5;
  y = drawKvRows(
    doc,
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
    y,
    66,
    5.4,
  );

  y += 6;
  doc.setFont('times', 'bold');
  doc.text('B.  Calon Istri:', ML, y);
  doc.setFont('times', 'normal');
  y += 5.5;
  y = drawKvRows(
    doc,
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
    y,
    66,
    5.4,
  );

  y += 8;
  y = drawParagraph(
    doc,
    'Menyatakan dengan sesungguhnya bahwa atas dasar suka rela, dengan kesadaran sendiri, tanpa ada paksaan dari siapapun juga, setuju untuk melangsungkan pernikahan.',
    ML,
    y,
    CONTENT_W,
  );
  y += 4;
  y = drawParagraph(
    doc,
    'Demikian surat persetujuan ini dibuat untuk digunakan seperlunya.',
    ML,
    y,
    CONTENT_W,
  );

  y += 8;
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  doc.text(tanggalText, PAGE_W - MR, y, { align: 'right' });
  y += 8;

  const leftCenter = ML + 36;
  const rightCenter = ML + 124;
  doc.text('Calon Suami', leftCenter, y, { align: 'center' });
  doc.text('Calon Istri,', rightCenter, y, { align: 'center' });
  y += 26;

  doc.setFont('times', 'bold');
  doc.text(form.suami.nama || '.........................................', leftCenter, y, { align: 'center' });
  doc.text(form.istri.nama || '.........................................', rightCenter, y, { align: 'center' });
  doc.setFont('times', 'normal');
}

function renderN5Page(
  doc: jsPDF,
  form: MarriageFilingForm,
  ayah: ParentData,
  ibu: ParentData,
  anak: CatinData,
  pasangan: CatinData,
) {
  let y = F4_PAPER.marginTopMm + 3;
  doc.setFontSize(9.5);
  doc.text('Lampiran IX', ML, y);
  y += 4;
  doc.text('Keputusan Dirjen Bimas Islam No 473 Tahun 2020', ML, y);
  doc.setFontSize(FONT_PT);
  y += 6;

  y = drawCentered(doc, 'FORMULIR SURAT IZIN ORANG TUA', y);
  doc.text('Model N5', PAGE_W - MR, y, { align: 'right' });
  y += 4.5;
  y = drawCentered(doc, 'SURAT IZIN ORANG TUA', y, { bold: true, underline: true });
  y += 3;

  doc.text('Yang bertanda tangan di bawah ini:', ML, y);
  y += 5;

  y = drawKvRows(
    doc,
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
    y,
    66,
    4.5,
  );
  y += 3;
  y = drawKvRows(
    doc,
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
    y,
    66,
    4.5,
  );

  y += 3.5;
  doc.text('adalah ayah kandung dan ibu kandung/wali/pengampu dari:', ML, y);
  y += 4.8;
  y = drawKvRows(
    doc,
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
    y,
    66,
    4.5,
  );

  y += 3.5;
  doc.text('memberi izin kepada anak kami untuk melakukan pernikahan dengan:', ML, y);
  y += 4.8;
  y = drawKvRows(
    doc,
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
    y,
    66,
    4.5,
  );

  y += 4;
  y = drawParagraph(
    doc,
    'Demikianlah surat izin ini dibuat dengan kesadaran tanpa ada paksaan dari siapapun dan untuk dipergunakan seperlunya.',
    ML,
    y,
    CONTENT_W,
    { lineH: 4.8 },
  );

  y += 4;
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  doc.text(tanggalText, PAGE_W - MR, y, { align: 'right' });
  y += 6;

  const leftCenter = ML + 36;
  const rightCenter = ML + 124;
  doc.setFont('times', 'bold');
  doc.text('Ayah/wali/pengampu', leftCenter, y, { align: 'center' });
  doc.text('Ibu/wali/pengampu', rightCenter, y, { align: 'center' });
  doc.setFont('times', 'normal');
  y += 20;

  doc.text(`( ${ayah.nama || '.............................................'} )`, leftCenter, y, { align: 'center' });
  doc.text(`( ${ibu.nama || '.............................................'} )`, rightCenter, y, { align: 'center' });
}

function renderSptjmPage(doc: jsPDF, form: MarriageFilingForm) {
  let y = F4_PAPER.marginTopMm + 8;
  y = drawCentered(doc, 'SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)', y, { bold: true });
  y += 8;

  doc.text('Kami yang bertanda tangan dibawah ini :', ML, y);
  y += 7;

  y = drawKvRows(
    doc,
    [
      ['1.  Nama Calon Suami', form.suami.nama],
      ['     NIK', form.suami.nik],
      ['     Tempat, Tgl. Lahir', formatPlaceAndDate(form.suami.tempatLahir, form.suami.tanggalLahir)],
      ['     Status', form.suami.statusPerkawinan],
      ['     Alamat', form.suami.alamat.alamatLengkap],
    ],
    y,
    50,
    5.6,
  );
  y += 5;

  y = drawKvRows(
    doc,
    [
      ['2.  Nama Calon Istri', form.istri.nama],
      ['     NIK', form.istri.nik],
      ['     Tempat, Tgl. Lahir', formatPlaceAndDate(form.istri.tempatLahir, form.istri.tanggalLahir)],
      ['     Status', form.istri.statusPerkawinan],
      ['     Alamat', form.istri.alamat.alamatLengkap],
    ],
    y,
    50,
    5.6,
  );
  y += 5;

  y = drawKvRows(
    doc,
    [
      ['3.  Nama Wali Nikah', form.waliNikah.nama],
      ['     NIK', form.waliNikah.nik],
      ['     Tempat, Tgl. Lahir', formatPlaceAndDate(form.waliNikah.tempatLahir, form.waliNikah.tanggalLahir)],
      ['     Alamat', form.waliNikah.alamat.alamatLengkap],
    ],
    y,
    50,
    5.6,
  );
  y += 6;

  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const hariText = akadParts ? akadParts.dayName : '...................';
  const tanggalAkadText = akadParts ? formatIndonesianDate(form.akad.tanggalAkad) : '.........................';
  const jamText = form.akad.jamAkad || '..........';

  y = drawParagraph(
    doc,
    `Mengajukan Permohonan Kehendak Perkawinan Pada Hari ${hariText} Tanggal ${tanggalAkadText} Jam ${jamText}`,
    ML,
    y,
    CONTENT_W,
  );
  y += 4;
  y = drawParagraph(
    doc,
    'Dengan ini kami menyatakan dengan sesungguhnya bahwa keterangan, data dan berkas yang kami berikan kepada KUA Kecamatan Batealit Untuk Keperluan pendaftaran pernikahan kami adalah SUDAH BENAR DAN AKURAT. Apabila data tersebut tidak benar, maka berkasnya bersedia ditolak dan dikembalikan kepada kami, dan batal demi hukum.',
    ML,
    y,
    CONTENT_W,
  );
  y += 4;
  y = drawParagraph(
    doc,
    'Demikian pernyataan ini, dibuat dengan sadar dan penuh tanggung jawab.',
    ML,
    y,
    CONTENT_W,
  );

  y += 8;
  doc.text(`Jepara, ${formatIndonesianDate(form.akad.tanggalSurat)}`, PAGE_W / 2, y, {
    align: 'center',
  });
  y += 8;

  const leftCenter = ML + 34;
  const rightCenter = ML + 126;
  doc.text('Calon Suami', leftCenter, y, { align: 'center' });
  doc.text('Calon Istri', rightCenter, y, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Materai', PAGE_W / 2, y + 11, { align: 'center' });
  doc.text('10.000', PAGE_W / 2, y + 16, { align: 'center' });
  doc.setFontSize(FONT_PT);

  y += 26;
  doc.setFont('times', 'bold');
  doc.text(form.suami.nama || '………………………..….', leftCenter, y, { align: 'center' });
  doc.text(form.istri.nama || '…………..……………….', rightCenter, y, { align: 'center' });
  doc.setFont('times', 'normal');

  y += 10;
  doc.text('Wali Nikah', PAGE_W / 2, y, { align: 'center' });
  y += 22;
  doc.setFont('times', 'bold');
  doc.text(form.waliNikah.nama || '…………………………………', PAGE_W / 2, y, { align: 'center' });
  doc.setFont('times', 'normal');
}

function renderSuratKuasaPage(doc: jsPDF, form: MarriageFilingForm) {
  let y = F4_PAPER.marginTopMm + 10;
  y = drawCentered(doc, 'SURAT KUASA', y, { bold: true });
  y += 12;

  const pemberiNama = form.pemberiKuasa.nama || form.suami.nama;
  const pemberiNik = form.pemberiKuasa.nik || form.suami.nik;
  const pemberiAlamat = form.pemberiKuasa.alamat || form.suami.alamat.alamatLengkap;

  doc.text('Yang bertanda tangan di bawah ini,', ML, y);
  y += 7;
  y = drawKvRows(
    doc,
    [
      ['Nama', pemberiNama],
      ['NIK', pemberiNik],
      ['Alamat', pemberiAlamat],
    ],
    y,
    32,
    6.4,
  );

  y += 10;
  doc.text('Dengan ini memberikan kuasa kepada,', ML, y);
  y += 7;
  y = drawKvRows(
    doc,
    [
      ['Nama', form.penerimaKuasa.nama],
      ['NIK', form.penerimaKuasa.nik],
      ['Alamat', form.penerimaKuasa.alamat],
    ],
    y,
    32,
    6.4,
  );

  y += 12;
  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const tgl = akadParts ? String(akadParts.day).padStart(2, '0') : '.....';
  const bln = akadParts ? akadParts.monthName : '……………';
  const thn = akadParts ? String(akadParts.year) : '……';

  y = drawParagraph(
    doc,
    `Untuk mewakili saya: ${form.suami.nama || '…………………………..……..'} dan ${form.istri.nama || '……………………………………..'} mengurus surat surat persyaratan Nikah dan mendaftarkan nikah ke Kantor Urusan Agama Kec. Batealit Jepara yang pernikahannya akan dilaksanakan pada tanggal ${tgl} bulan ${bln} tahun ${thn}.`,
    ML,
    y,
    CONTENT_W,
    { lineH: 6.4 },
  );

  y += 8;
  y = drawParagraph(
    doc,
    'Demikian, surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya.',
    ML,
    y,
    CONTENT_W,
  );

  y += 18;
  const leftCenter = ML + 36;
  const rightCenter = ML + 126;

  doc.text(`Jepara, ${formatIndonesianDate(form.akad.tanggalSurat)}`, rightCenter, y, {
    align: 'center',
  });
  y += 6;
  doc.text('Pihak Kedua/ Penerima Kuasa', leftCenter, y, { align: 'center' });
  doc.text('Pihak Pertama/Pemberi kuasa', rightCenter, y, { align: 'center' });

  // Materai 10.000 box in the center
  const boxW = 22;
  const boxH = 12;
  const boxX = PAGE_W / 2 - boxW / 2;
  const boxY = y + 8;
  doc.setLineWidth(0.3);
  doc.rect(boxX, boxY, boxW, boxH);
  doc.setFontSize(8.5);
  doc.text('Materai', PAGE_W / 2, boxY + 4.8, { align: 'center' });
  doc.text('10.000', PAGE_W / 2, boxY + 9.4, { align: 'center' });
  doc.setFontSize(FONT_PT);

  y += 30;
  doc.setFont('times', 'bold');
  doc.text(form.penerimaKuasa.nama || '………………………………..', leftCenter, y, { align: 'center' });
  doc.text(pemberiNama || '………………………………..', rightCenter, y, { align: 'center' });
  doc.setFont('times', 'normal');
}

function renderBelumMenikahPage(
  doc: jsPDF,
  form: MarriageFilingForm,
  catin: CatinData,
) {
  let y = F4_PAPER.marginTopMm + 10;
  y = drawCentered(doc, 'SURAT PERNYATAAN BELUM PERNAH MENIKAH', y, {
    bold: true,
    underline: true,
  });
  y += 10;

  doc.text('Yang bertanda tangan di bawah ini:', ML, y);
  y += 7;

  y = drawKvRows(
    doc,
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
    y,
    66,
    6.2,
  );

  y += 8;
  const statusLabel = catin.jenisKelamin === 'Laki-laki' ? 'Jejaka' : 'Perawan';
  y = drawParagraph(
    doc,
    `Dengan ini menyatakan dengan sesungguhnya bahwa sampai saat surat pernyataan ini dibuat, saya benar-benar BELUM PERNAH MENIKAH (${statusLabel}) dengan siapapun, baik secara resmi menurut hukum negara maupun secara agama, serta tidak terikat tali perkawinan dengan pihak manapun.`,
    ML,
    y,
    CONTENT_W,
    { lineH: 6.2 },
  );
  y += 5;
  y = drawParagraph(
    doc,
    'Apabila di kemudian hari ternyata pernyataan saya ini tidak benar, maka saya bersedia dituntut sesuai dengan ketentuan hukum yang berlaku dan segala akibat hukumnya menjadi tanggung jawab saya sepenuhnya.',
    ML,
    y,
    CONTENT_W,
    { lineH: 6.2 },
  );
  y += 5;
  y = drawParagraph(
    doc,
    'Demikian surat pernyataan ini saya buat dengan sadar, jujur, dan tanpa paksaan dari pihak manapun untuk dipergunakan sebagai kelengkapan berkas pendaftaran nikah di KUA Kecamatan Batealit Kabupaten Jepara.',
    ML,
    y,
    CONTENT_W,
    { lineH: 6.2 },
  );

  y += 14;
  const leftCenter = ML + 38;
  const rightCenter = ML + 124;
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  const jabatan = `${form.penandatangan.jabatanPenandatangan || 'Kepala Desa / Lurah'} ${form.akad.desaPenerbit || ''}`.trim();
  const petinggiFull = formatPetinggiDisplay(form.penandatangan);

  doc.text('Mengetahui,', leftCenter, y, { align: 'center' });
  doc.text(tanggalText, rightCenter, y, { align: 'center' });
  y += 5.5;
  doc.text(jabatan, leftCenter, y, { align: 'center' });
  doc.text('Yang Membuat Pernyataan,', rightCenter, y, { align: 'center' });

  doc.setFontSize(9);
  doc.text('Materai 10.000', rightCenter, y + 17, { align: 'center' });
  doc.setFontSize(FONT_PT);

  // Generous 34mm signature & stamp gap
  y += 34;

  if (petinggiFull) {
    doc.setFont('times', 'bold');
    doc.text(petinggiFull, leftCenter, y, { align: 'center' });
    const w = doc.getTextWidth(petinggiFull);
    doc.line(leftCenter - w / 2, y + 1, leftCenter + w / 2, y + 1);
    doc.setFont('times', 'normal');
  } else {
    doc.text('.............................................', leftCenter, y, { align: 'center' });
  }

  doc.setFont('times', 'bold');
  doc.text(catin.nama || '.............................................', rightCenter, y, {
    align: 'center',
  });
  doc.setFont('times', 'normal');

  if (form.penandatangan.nip.trim()) {
    y += 5;
    doc.setFontSize(9.5);
    doc.text(`NIP. ${form.penandatangan.nip.trim()}`, leftCenter, y, { align: 'center' });
    doc.setFontSize(FONT_PT);
  }
}

function renderSingleDoc(doc: jsPDF, form: MarriageFilingForm, key: DocumentTabKey) {
  switch (key) {
    case 'n1_suami':
      renderN1Page(doc, form, form.suami, form.ayahSuami, form.ibuSuami);
      break;
    case 'n1_istri':
      renderN1Page(doc, form, form.istri, form.ayahIstri, form.ibuIstri);
      break;
    case 'n2':
      renderN2Page(doc, form);
      break;
    case 'n4':
      renderN4Page(doc, form);
      break;
    case 'n5_suami':
      renderN5Page(doc, form, form.ayahSuami, form.ibuSuami, form.suami, form.istri);
      break;
    case 'n5_istri':
      renderN5Page(doc, form, form.ayahIstri, form.ibuIstri, form.istri, form.suami);
      break;
    case 'sptjm':
      renderSptjmPage(doc, form);
      break;
    case 'surat_kuasa':
      renderSuratKuasaPage(doc, form);
      break;
    case 'belum_menikah_suami':
      renderBelumMenikahPage(doc, form, form.suami);
      break;
    case 'belum_menikah_istri':
      renderBelumMenikahPage(doc, form, form.istri);
      break;
  }
}

export function createMarriagePdfDocument(
  form: MarriageFilingForm,
  docKeys: DocumentTabKey[],
): jsPDF {
  const doc = createF4Pdf();
  docKeys.forEach((key, index) => {
    if (index > 0) {
      doc.addPage([PAGE_W, PAGE_H], 'portrait');
    }
    renderSingleDoc(doc, form, key);
  });
  return doc;
}

export function createRecapPdfDocument(
  records: MarriageFilingRecord[],
  periodLabel: string,
  desaLabel: string,
): jsPDF {
  const doc = createF4Pdf();
  let y = F4_PAPER.marginTopMm + 6;
  y = drawCentered(doc, 'REKAPITULASI LAPORAN PEMBERKASAN NIKAH', y, { bold: true, size: 12 });
  y = drawCentered(doc, 'KANTOR URUSAN AGAMA (KUA) KECAMATAN BATEALIT KABUPATEN JEPARA', y, {
    bold: true,
    size: 11,
  });
  y += 2;
  y = drawCentered(
    doc,
    `Wilayah: ${desaLabel}  |  Periode: ${periodLabel}  |  Total Berkas: ${records.length}`,
    y,
    { size: 9.5 },
  );
  y += 6;

  const cols = [
    { title: 'No', w: 10 },
    { title: 'Desa', w: 24 },
    { title: 'Calon Suami / NIK', w: 42 },
    { title: 'Calon Istri / NIK', w: 42 },
    { title: 'Tgl Akad', w: 24 },
    { title: 'Status', w: 18 },
  ];

  const drawHeader = () => {
    let x = ML;
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    for (const c of cols) {
      doc.rect(x, y, c.w, 8);
      doc.text(c.title, x + 2, y + 5.2);
      x += c.w;
    }
    doc.setFont('times', 'normal');
    y += 8;
  };

  drawHeader();

  records.forEach((rec, idx) => {
    const rowH = 12;
    if (y + rowH > PAGE_H - 22) {
      doc.addPage([PAGE_W, PAGE_H], 'portrait');
      y = F4_PAPER.marginTopMm + 6;
      drawHeader();
    }
    let x = ML;
    const values = [
      String(idx + 1),
      rec.desaName,
      `${rec.namaSuami}\n${rec.nikSuami}`,
      `${rec.namaIstri}\n${rec.nikIstri}`,
      rec.tanggalAkad ? formatIndonesianDate(rec.tanggalAkad) : '-',
      rec.statusBerkas,
    ];
    doc.setFontSize(8.5);
    values.forEach((val, i) => {
      const c = cols[i];
      doc.rect(x, y, c.w, rowH);
      const lines = val.split('\n');
      lines.forEach((line, li) => {
        const clipped = doc.splitTextToSize(line, c.w - 3)[0] || '';
        doc.text(clipped, x + 1.5, y + 4.6 + li * 4.4);
      });
      x += c.w;
    });
    y += rowH;
  });

  y += 8;
  doc.setFontSize(9);
  doc.text(
    `Dicetak pada: ${formatIndonesianDate(new Date().toISOString().slice(0, 10))}`,
    PAGE_W - MR,
    y,
    { align: 'right' },
  );

  return doc;
}
