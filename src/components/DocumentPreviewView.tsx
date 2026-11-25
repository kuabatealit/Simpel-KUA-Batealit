import React, { useState } from 'react';
import {
  CheckSquare,
  Download,
  FileDown,
  FileText,
  Printer,
  Square,
} from 'lucide-react';
import type {
  CatinData,
  DocumentTabKey,
  MarriageFilingForm,
  ParentData,
} from '../types/marriage';
import { DOCUMENT_TABS, F4_PAPER, N2_REQUIREMENTS_LIST } from '../utils/documentSpec';
import {
  formatIndonesianDate,
  formatPetinggiDisplay,
  formatPlaceAndDate,
  parseIsoDateParts,
} from '../utils/formatting';
import { generateMarriageWordBlob } from '../utils/wordGenerator';
import { createMarriagePdfDocument } from '../utils/pdfGenerator';

interface DocumentPreviewViewProps {
  form: MarriageFilingForm;
  onBackToForm: () => void;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugName(text: string): string {
  return (text || 'Catin')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function RowField({
  label,
  value,
  labelWidth = '42%',
  headerOnly = false,
}: {
  label: string;
  value?: string;
  labelWidth?: string;
  headerOnly?: boolean;
}) {
  return (
    <div className="flex items-start leading-[1.36] mb-[2px]">
      <div style={{ width: labelWidth }} className="shrink-0 pr-1">
        {label}
      </div>
      {!headerOnly && (
        <>
          <div className="w-[14px] shrink-0 text-center">{label.trim() ? ':' : ''}</div>
          <div className="flex-1 break-words">
            {value && value.trim() ? value : '........................................................'}
          </div>
        </>
      )}
    </div>
  );
}

function N1Preview({
  form,
  catin,
  ayah,
  ibu,
}: {
  form: MarriageFilingForm;
  catin: CatinData;
  ayah: ParentData;
  ibu: ParentData;
}) {
  const petinggiFull = formatPetinggiDisplay(form.penandatangan);
  const jabatan = `${form.penandatangan.jabatanPenandatangan || 'Kepala Desa / Lurah'} ${form.akad.desaPenerbit || ''}`.trim();
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  const statusLaki =
    catin.jenisKelamin === 'Laki-laki'
      ? catin.statusPerkawinan === 'Beristri' && catin.istriKe
        ? `Beristri (Istri Ke-${catin.istriKe})`
        : catin.statusPerkawinan
      : '-';
  const statusPerempuan =
    catin.jenisKelamin === 'Perempuan' ? catin.statusPerkawinan : '-';

  return (
    <div className="f4-paper print-only-sheet shadow-sm border border-slate-300 mx-auto">
      <div className="text-[10pt] leading-tight">
        <div>Lampiran V</div>
        <div>Keputusan Dirjen Bimas Islam No 473 Tahun 2020</div>
      </div>

      <div className="text-center mt-2">FORMULIR PENGANTAR NIKAH</div>
      <div className="text-right mb-1">Model N1</div>

      <div className="mb-2">
        <RowField label="KANTOR DESA/KELURAHAN" value={(form.akad.desaPenerbit || '').toUpperCase()} labelWidth="38%" />
        <RowField label="KECAMATAN" value={(form.akad.kecamatanPenerbit || 'BATEALIT').toUpperCase()} labelWidth="38%" />
        <RowField label="KABUPATEN/KOTA" value={(form.akad.kabupatenPenerbit || 'JEPARA').toUpperCase()} labelWidth="38%" />
      </div>

      <div className="text-center font-bold underline mt-2">PENGANTAR NIKAH</div>
      <div className="text-center mb-3">
        Nomor: {form.akad.nomorSuratN1 || '............................................'}
      </div>

      <p className="mb-1.5">Yang bertanda tangan di bawah ini menjelaskan dengan sesungguhnya bahwa:</p>

      <div className="mb-2">
        <RowField label="1.  Nama" value={catin.nama} labelWidth="44%" />
        <RowField label="2.  Nomor Induk Kependudukan (NIK)" value={catin.nik} labelWidth="44%" />
        <RowField label="3.  Jenis Kelamin" value={catin.jenisKelamin} labelWidth="44%" />
        <RowField
          label="4.  Tempat dan tanggal lahir"
          value={formatPlaceAndDate(catin.tempatLahir, catin.tanggalLahir)}
          labelWidth="44%"
        />
        <RowField label="5.  Kewarganegaraan" value={catin.kewarganegaraan || 'Indonesia'} labelWidth="44%" />
        <RowField label="6.  Agama" value={catin.agama || 'Islam'} labelWidth="44%" />
        <RowField label="7.  Pekerjaan" value={catin.pekerjaan} labelWidth="44%" />
        <RowField label="8.  Alamat" value={catin.alamat.alamatLengkap} labelWidth="44%" />
        <RowField label="9.  Status perkawinan" headerOnly labelWidth="44%" />
        <RowField label="     a. Laki-laki" value={statusLaki} labelWidth="44%" />
        <RowField label="     b. Perempuan" value={statusPerempuan} labelWidth="44%" />
      </div>

      <p className="mt-2 mb-1">Adalah benar anak dari pernikahan seorang pria:</p>
      <div className="mb-2">
        <RowField
          label="Nama Lengkap dan alias"
          value={ayah.nama ? `${ayah.nama}${ayah.masihHidup ? '' : ' (Alm.)'}` : '-'}
          labelWidth="44%"
        />
        <RowField label="Nomor Induk Kependudukan (NIK)" value={ayah.nik || '-'} labelWidth="44%" />
        <RowField
          label="Tempat dan tanggal lahir"
          value={ayah.tempatLahir || ayah.tanggalLahir ? formatPlaceAndDate(ayah.tempatLahir, ayah.tanggalLahir) : '-'}
          labelWidth="44%"
        />
        <RowField label="Kewarganegaraan" value={ayah.kewarganegaraan || 'Indonesia'} labelWidth="44%" />
        <RowField label="Agama" value={ayah.agama || 'Islam'} labelWidth="44%" />
        <RowField label="Pekerjaan" value={ayah.pekerjaan || '-'} labelWidth="44%" />
        <RowField label="Alamat" value={ayah.alamat.alamatLengkap || '-'} labelWidth="44%" />
      </div>

      <p className="mt-2 mb-1">dengan seorang wanita:</p>
      <div className="mb-2.5">
        <RowField
          label="Nama Lengkap dan alias"
          value={ibu.nama ? `${ibu.nama}${ibu.masihHidup ? '' : ' (Almh.)'}` : '-'}
          labelWidth="44%"
        />
        <RowField label="Nomor Induk Kependudukan (NIK)" value={ibu.nik || '-'} labelWidth="44%" />
        <RowField
          label="Tempat dan tanggal lahir"
          value={ibu.tempatLahir || ibu.tanggalLahir ? formatPlaceAndDate(ibu.tempatLahir, ibu.tanggalLahir) : '-'}
          labelWidth="44%"
        />
        <RowField label="Kewarganegaraan" value={ibu.kewarganegaraan || 'Indonesia'} labelWidth="44%" />
        <RowField label="Agama" value={ibu.agama || 'Islam'} labelWidth="44%" />
        <RowField label="Pekerjaan" value={ibu.pekerjaan || '-'} labelWidth="44%" />
        <RowField label="Alamat" value={ibu.alamat.alamatLengkap || '-'} labelWidth="44%" />
      </div>

      <p className="text-justify mb-4">
        Demikian, surat pengantar ini dibuat dengan mengingat sumpah jabatan dan untuk dipergunakan sebagaimana mestinya.
      </p>

      {/* Extra wide signature & stamp spacing on N1 */}
      <div className="grid grid-cols-2 gap-6 text-center">
        <div>
          <div className="h-[1.38em]" />
          <div>Kepala Lingkungan</div>
          <div style={{ height: '34mm' }} aria-label="Ruang tanda tangan Kepala Lingkungan" />
          <div className={form.penandatangan.kepalaLingkungan ? 'font-bold' : ''}>
            {form.penandatangan.kepalaLingkungan
              ? `( ${form.penandatangan.kepalaLingkungan} )`
              : '............................................. *)'}
          </div>
          <div className="text-left text-[9.5pt] mt-1">*) Nama lengkap</div>
        </div>
        <div>
          <div>{tanggalText}</div>
          <div>{jabatan}</div>
          <div
            style={{ height: '34mm' }}
            data-testid="n1-petinggi-signature-space"
            aria-label="Ruang tanda tangan dan stempel Kepala Desa"
          />
          <div className={petinggiFull ? 'font-bold underline' : ''}>
            {petinggiFull || '............................................. *)'}
          </div>
          {form.penandatangan.nip.trim() && (
            <div className="text-[10pt] mt-0.5">NIP. {form.penandatangan.nip.trim()}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function N2Preview({ form }: { form: MarriageFilingForm }) {
  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const hariTanggalJam = akadParts
    ? `${akadParts.dayName}, ${formatIndonesianDate(form.akad.tanggalAkad)} / Pukul ${form.akad.jamAkad || '-'}`
    : `${form.akad.tanggalAkad || '...................'} / ${form.akad.jamAkad || '.......'}`;
  const tanggalSuratText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  const pemohonNama =
    form.akad.pemohonN2 === 'Calon Istri'
      ? form.istri.nama
      : form.akad.pemohonN2 === 'Wali Nikah'
        ? form.waliNikah.nama
        : form.akad.pemohonN2 === 'Penerima Kuasa'
          ? form.penerimaKuasa.nama
          : form.suami.nama;

  return (
    <div className="f4-paper print-only-sheet shadow-sm border border-slate-300 mx-auto">
      <div className="text-[10pt] leading-tight">
        <div>Lampiran VI</div>
        <div>Keputusan Dirjen Bimas Islam No 473 Tahun 2020</div>
      </div>

      <div className="text-center font-bold mt-4">FORMULIR PERMOHONAN KEHENDAK NIKAH</div>
      <div className="text-right mb-6">Model N2</div>

      <div className="flex justify-between mb-6">
        <div>Perihal &nbsp;: Permohonan Kehendak Nikah</div>
        <div>{tanggalSuratText}</div>
      </div>

      <div className="mb-6">
        <div>Kepada Yth.</div>
        <div>Kepala KUA Kecamatan / PPN LN {form.akad.namaKuaTujuan || 'Batealit'}</div>
        <div>di {form.akad.alamatKuaTujuan || 'Batealit'}</div>
      </div>

      <p className="indent-8 mb-3 text-justify">
        Dengan hormat, kami mengajukan permohonan kehendak nikah untuk atas nama :
      </p>

      <div className="mb-5">
        <RowField
          label="Calon suami"
          value={`${form.suami.nama || '........................'} Bin ${form.suami.binBinti || form.ayahSuami.nama || '................'}`}
          labelWidth="30%"
        />
        <RowField
          label="Calon istri"
          value={`${form.istri.nama || '........................'} Binti ${form.istri.binBinti || form.ayahIstri.nama || '................'}`}
          labelWidth="30%"
        />
        <RowField label="Hari / Tanggal / Jam" value={hariTanggalJam} labelWidth="30%" />
        <RowField label="Tempat akad nikah" value={form.akad.tempatAkad} labelWidth="30%" />
        <RowField label="Mas Kawin / Mahar" value={form.akad.masKawin} labelWidth="30%" />
      </div>

      <p className="indent-8 mb-2">
        Bersama ini kami sampaikan surat-surat yang diperlukan untuk diperiksa sebagai berikut:
      </p>
      <ol className="list-decimal pl-8 space-y-1 mb-5" data-testid="n2-requirements-list">
        {N2_REQUIREMENTS_LIST.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ol>

      <p className="indent-8 text-justify mb-8">
        Demikian permohonan ini kami sampaikan, kiranya dapat diperiksa, dihadiri, dan dicatat sesuai dengan ketentuan perundang-undangan.
      </p>

      <div className="grid grid-cols-2 gap-6 mb-10">
        <div>
          <div>Diterima tanggal .................................</div>
          <div>Yang menerima,</div>
          <div>Kepala KUA/PPN LN</div>
          <div style={{ height: '24mm' }} />
          <div>..................................................</div>
        </div>
        <div className="text-center">
          <div>Wassalam,</div>
          <div>Pemohon</div>
          <div style={{ height: '28mm' }} />
          <div className={pemohonNama ? 'font-bold underline' : ''}>
            {pemohonNama || '.........................................'}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <RowField label="No. Hp Calon Suami" value={form.suami.noHp || '-'} labelWidth="32%" />
        <RowField label="No. Hp Calon Istri" value={form.istri.noHp || '-'} labelWidth="32%" />
      </div>
    </div>
  );
}

function N4Preview({ form }: { form: MarriageFilingForm }) {
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  return (
    <div className="f4-paper print-only-sheet shadow-sm border border-slate-300 mx-auto">
      <div className="text-[10pt] leading-tight">
        <div>Lampiran VIII</div>
        <div>Keputusan Dirjen Bimas Islam No 473 Tahun 2020</div>
      </div>

      <div className="text-center mt-3">FORMULIR PERSETUJUAN CALON PENGANTIN</div>
      <div className="text-right mb-2">Model N4</div>
      <div className="text-center font-bold underline mb-4">PERSETUJUAN CALON PENGANTIN</div>

      <p className="mb-3">Yang bertanda tangan di bawah ini:</p>

      <div className="font-bold mb-1">A. Calon Suami:</div>
      <div className="mb-4 pl-3">
        <RowField label="1. Nama lengkap dan alias" value={form.suami.nama} labelWidth="42%" />
        <RowField label="2. Bin" value={form.suami.binBinti || form.ayahSuami.nama} labelWidth="42%" />
        <RowField label="3. Nomor Induk Kependudukan" value={form.suami.nik} labelWidth="42%" />
        <RowField
          label="4. Tempat dan tanggal lahir"
          value={formatPlaceAndDate(form.suami.tempatLahir, form.suami.tanggalLahir)}
          labelWidth="42%"
        />
        <RowField label="5. Kewarganegaraan" value={form.suami.kewarganegaraan || 'Indonesia'} labelWidth="42%" />
        <RowField label="6. Agama" value={form.suami.agama || 'Islam'} labelWidth="42%" />
        <RowField label="7. Pekerjaan" value={form.suami.pekerjaan} labelWidth="42%" />
        <RowField label="8. Alamat" value={form.suami.alamat.alamatLengkap} labelWidth="42%" />
      </div>

      <div className="font-bold mb-1">B. Calon Istri:</div>
      <div className="mb-5 pl-3">
        <RowField label="1. Nama lengkap dan alias" value={form.istri.nama} labelWidth="42%" />
        <RowField label="2. Binti" value={form.istri.binBinti || form.ayahIstri.nama} labelWidth="42%" />
        <RowField label="3. Nomor Induk Kependudukan" value={form.istri.nik} labelWidth="42%" />
        <RowField
          label="4. Tempat dan tanggal lahir"
          value={formatPlaceAndDate(form.istri.tempatLahir, form.istri.tanggalLahir)}
          labelWidth="42%"
        />
        <RowField label="5. Kewarganegaraan" value={form.istri.kewarganegaraan || 'Indonesia'} labelWidth="42%" />
        <RowField label="6. Agama" value={form.istri.agama || 'Islam'} labelWidth="42%" />
        <RowField label="7. Pekerjaan" value={form.istri.pekerjaan} labelWidth="42%" />
        <RowField label="8. Alamat" value={form.istri.alamat.alamatLengkap} labelWidth="42%" />
      </div>

      <p className="text-justify mb-3">
        Menyatakan dengan sesungguhnya bahwa atas dasar suka rela, dengan kesadaran sendiri, tanpa ada paksaan dari siapapun juga, setuju untuk melangsungkan pernikahan.
      </p>
      <p className="mb-6">Demikian surat persetujuan ini dibuat untuk digunakan seperlunya.</p>

      <div className="text-right mb-3">{tanggalText}</div>
      <div className="grid grid-cols-2 gap-6 text-center">
        <div>
          <div>Calon Suami</div>
          <div style={{ height: '26mm' }} />
          <div className={form.suami.nama ? 'font-bold underline' : ''}>
            {form.suami.nama || '.........................................'}
          </div>
        </div>
        <div>
          <div>Calon Istri,</div>
          <div style={{ height: '26mm' }} />
          <div className={form.istri.nama ? 'font-bold underline' : ''}>
            {form.istri.nama || '.........................................'}
          </div>
        </div>
      </div>
    </div>
  );
}

function N5Preview({
  form,
  ayah,
  ibu,
  anak,
  pasangan,
}: {
  form: MarriageFilingForm;
  ayah: ParentData;
  ibu: ParentData;
  anak: CatinData;
  pasangan: CatinData;
}) {
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  return (
    <div className="f4-paper print-only-sheet shadow-sm border border-slate-300 mx-auto text-[10.5pt]">
      <div className="text-[9.5pt] leading-tight">
        <div>Lampiran IX</div>
        <div>Keputusan Dirjen Bimas Islam No 473 Tahun 2020</div>
      </div>

      <div className="text-center mt-1.5">FORMULIR SURAT IZIN ORANG TUA</div>
      <div className="text-right">Model N5</div>
      <div className="text-center font-bold underline mb-2">SURAT IZIN ORANG TUA</div>

      <p className="mb-1.5">Yang bertanda tangan di bawah ini:</p>

      <div className="mb-2">
        <RowField label="A. 1. Nama lengkap dan alias" value={ayah.nama} labelWidth="43%" />
        <RowField label="    2. Bin" value={ayah.binBinti} labelWidth="43%" />
        <RowField label="    3. Nomor Induk Kependudukan" value={ayah.nik} labelWidth="43%" />
        <RowField
          label="    4. Tempat dan tanggal lahir"
          value={formatPlaceAndDate(ayah.tempatLahir, ayah.tanggalLahir)}
          labelWidth="43%"
        />
        <RowField label="    5. Kewarganegaraan" value={ayah.kewarganegaraan || 'Indonesia'} labelWidth="43%" />
        <RowField label="    6. Agama" value={ayah.agama || 'Islam'} labelWidth="43%" />
        <RowField label="    7. Pekerjaan" value={ayah.pekerjaan} labelWidth="43%" />
        <RowField label="    8. Alamat" value={ayah.alamat.alamatLengkap} labelWidth="43%" />
      </div>

      <div className="mb-2">
        <RowField label="B. 1. Nama lengkap dan alias" value={ibu.nama} labelWidth="43%" />
        <RowField label="    2. Binti" value={ibu.binBinti} labelWidth="43%" />
        <RowField label="    3. Nomor Induk Kependudukan" value={ibu.nik} labelWidth="43%" />
        <RowField
          label="    4. Tempat dan tanggal lahir"
          value={formatPlaceAndDate(ibu.tempatLahir, ibu.tanggalLahir)}
          labelWidth="43%"
        />
        <RowField label="    5. Kewarganegaraan" value={ibu.kewarganegaraan || 'Indonesia'} labelWidth="43%" />
        <RowField label="    6. Agama" value={ibu.agama || 'Islam'} labelWidth="43%" />
        <RowField label="    7. Pekerjaan" value={ibu.pekerjaan} labelWidth="43%" />
        <RowField label="    8. Alamat" value={ibu.alamat.alamatLengkap} labelWidth="43%" />
      </div>

      <p className="mb-1">adalah ayah kandung dan ibu kandung/wali/pengampu dari:</p>
      <div className="mb-2 pl-3">
        <RowField label="1. Nama lengkap dan alias" value={anak.nama} labelWidth="41%" />
        <RowField label="2. Bin/Binti*)" value={anak.binBinti || ayah.nama} labelWidth="41%" />
        <RowField label="3. Nomor Induk Kependudukan" value={anak.nik} labelWidth="41%" />
        <RowField
          label="4. Tempat dan tanggal lahir"
          value={formatPlaceAndDate(anak.tempatLahir, anak.tanggalLahir)}
          labelWidth="41%"
        />
        <RowField label="5. Kewarganegaraan" value={anak.kewarganegaraan || 'Indonesia'} labelWidth="41%" />
        <RowField label="6. Agama" value={anak.agama || 'Islam'} labelWidth="41%" />
        <RowField label="7. Pekerjaan" value={anak.pekerjaan} labelWidth="41%" />
        <RowField label="8. Alamat" value={anak.alamat.alamatLengkap} labelWidth="41%" />
      </div>

      <p className="mb-1">memberi izin kepada anak kami untuk melakukan pernikahan dengan:</p>
      <div className="mb-2.5 pl-3">
        <RowField label="1. Nama lengkap dan alias" value={pasangan.nama} labelWidth="41%" />
        <RowField label="2. Bin/Binti*)" value={pasangan.binBinti} labelWidth="41%" />
        <RowField label="3. Nomor Induk Kependudukan" value={pasangan.nik} labelWidth="41%" />
        <RowField
          label="4. Tempat dan tanggal lahir"
          value={formatPlaceAndDate(pasangan.tempatLahir, pasangan.tanggalLahir)}
          labelWidth="41%"
        />
        <RowField label="5. Kewarganegaraan" value={pasangan.kewarganegaraan || 'Indonesia'} labelWidth="41%" />
        <RowField label="6. Agama" value={pasangan.agama || 'Islam'} labelWidth="41%" />
        <RowField label="7. Pekerjaan" value={pasangan.pekerjaan} labelWidth="41%" />
        <RowField label="8. Alamat" value={pasangan.alamat.alamatLengkap} labelWidth="41%" />
      </div>

      <p className="text-justify mb-3">
        Demikianlah surat izin ini dibuat dengan kesadaran tanpa ada paksaan dari siapapun dan untuk dipergunakan seperlunya.
      </p>

      <div className="text-right mb-2">{tanggalText}</div>
      <div className="grid grid-cols-2 gap-6 text-center">
        <div>
          <div className="font-bold">Ayah/wali/pengampu</div>
          <div style={{ height: '18mm' }} />
          <div>( {ayah.nama || '.............................................'} )</div>
        </div>
        <div>
          <div className="font-bold">Ibu/wali/pengampu</div>
          <div style={{ height: '18mm' }} />
          <div>( {ibu.nama || '.............................................'} )</div>
        </div>
      </div>
    </div>
  );
}

function SptjmPreview({ form }: { form: MarriageFilingForm }) {
  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const hariText = akadParts ? akadParts.dayName : '...................';
  const tanggalAkadText = akadParts
    ? formatIndonesianDate(form.akad.tanggalAkad)
    : '.........................';
  const jamText = form.akad.jamAkad || '..........';

  return (
    <div className="f4-paper print-only-sheet shadow-sm border border-slate-300 mx-auto">
      <div className="text-center font-bold mb-6 mt-2">
        SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)
      </div>

      <p className="mb-3">Kami yang bertanda tangan dibawah ini :</p>

      <div className="mb-4">
        <RowField label="1.  Nama Calon Suami" value={form.suami.nama} labelWidth="33%" />
        <RowField label="     NIK" value={form.suami.nik} labelWidth="33%" />
        <RowField
          label="     Tempat, Tgl. Lahir"
          value={formatPlaceAndDate(form.suami.tempatLahir, form.suami.tanggalLahir)}
          labelWidth="33%"
        />
        <RowField label="     Status" value={form.suami.statusPerkawinan} labelWidth="33%" />
        <RowField label="     Alamat" value={form.suami.alamat.alamatLengkap} labelWidth="33%" />
      </div>

      <div className="mb-4">
        <RowField label="2.  Nama Calon Istri" value={form.istri.nama} labelWidth="33%" />
        <RowField label="     NIK" value={form.istri.nik} labelWidth="33%" />
        <RowField
          label="     Tempat, Tgl. Lahir"
          value={formatPlaceAndDate(form.istri.tempatLahir, form.istri.tanggalLahir)}
          labelWidth="33%"
        />
        <RowField label="     Status" value={form.istri.statusPerkawinan} labelWidth="33%" />
        <RowField label="     Alamat" value={form.istri.alamat.alamatLengkap} labelWidth="33%" />
      </div>

      <div className="mb-5">
        <RowField label="3.  Nama Wali Nikah" value={form.waliNikah.nama} labelWidth="33%" />
        <RowField label="     NIK" value={form.waliNikah.nik} labelWidth="33%" />
        <RowField
          label="     Tempat, Tgl. Lahir"
          value={formatPlaceAndDate(form.waliNikah.tempatLahir, form.waliNikah.tanggalLahir)}
          labelWidth="33%"
        />
        <RowField label="     Alamat" value={form.waliNikah.alamat.alamatLengkap} labelWidth="33%" />
      </div>

      <p className="mb-4 text-justify">
        Mengajukan Permohonan Kehendak Perkawinan Pada Hari {hariText} Tanggal {tanggalAkadText} Jam {jamText}
      </p>

      <p className="mb-4 text-justify">
        Dengan ini kami menyatakan dengan sesungguhnya bahwa keterangan, data dan berkas yang kami berikan kepada KUA Kecamatan Batealit Untuk Keperluan pendaftaran pernikahan kami adalah{' '}
        <strong>SUDAH BENAR DAN AKURAT</strong>. Apabila data tersebut tidak benar, maka berkasnya bersedia ditolak dan dikembalikan kepada kami, dan batal demi hukum.
      </p>

      <p className="mb-6">Demikian pernyataan ini, dibuat dengan sadar dan penuh tanggung jawab.</p>

      <div className="text-center mb-4">Jepara, {formatIndonesianDate(form.akad.tanggalSurat)}</div>

      <div className="grid grid-cols-3 items-center text-center mb-8">
        <div>
          <div>Calon Suami</div>
          <div style={{ height: '24mm' }} />
          <div className={form.suami.nama ? 'font-bold underline' : ''}>
            {form.suami.nama || '………………………..….'}
          </div>
        </div>
        <div className="text-[10pt] leading-tight">
          <div>Materai</div>
          <div>10.000</div>
        </div>
        <div>
          <div>Calon Istri</div>
          <div style={{ height: '24mm' }} />
          <div className={form.istri.nama ? 'font-bold underline' : ''}>
            {form.istri.nama || '…………..……………….'}
          </div>
        </div>
      </div>

      <div className="text-center">
        <div>Wali Nikah</div>
        <div style={{ height: '22mm' }} />
        <div className={form.waliNikah.nama ? 'font-bold underline' : ''}>
          {form.waliNikah.nama || '…………………………………'}
        </div>
      </div>
    </div>
  );
}

function SuratKuasaPreview({ form }: { form: MarriageFilingForm }) {
  const akadParts = parseIsoDateParts(form.akad.tanggalAkad);
  const tgl = akadParts ? String(akadParts.day).padStart(2, '0') : '.....';
  const bln = akadParts ? akadParts.monthName : '……………';
  const thn = akadParts ? String(akadParts.year) : '……';

  const pemberiNama = form.pemberiKuasa.nama || form.suami.nama;
  const pemberiNik = form.pemberiKuasa.nik || form.suami.nik;
  const pemberiAlamat = form.pemberiKuasa.alamat || form.suami.alamat.alamatLengkap;

  return (
    <div className="f4-paper print-only-sheet shadow-sm border border-slate-300 mx-auto">
      <div className="text-center font-bold mb-10 mt-4">SURAT KUASA</div>

      <p className="mb-2">Yang bertanda tangan di bawah ini,</p>
      <div className="mb-8 space-y-1.5">
        <RowField label="Nama" value={pemberiNama} labelWidth="22%" />
        <RowField label="NIK" value={pemberiNik} labelWidth="22%" />
        <RowField label="Alamat" value={pemberiAlamat} labelWidth="22%" />
      </div>

      <p className="mb-2">Dengan ini memberikan kuasa kepada,</p>
      <div className="mb-8 space-y-1.5">
        <RowField label="Nama" value={form.penerimaKuasa.nama} labelWidth="22%" />
        <RowField label="NIK" value={form.penerimaKuasa.nik} labelWidth="22%" />
        <RowField label="Alamat" value={form.penerimaKuasa.alamat} labelWidth="22%" />
      </div>

      <p className="text-justify leading-[1.6] mb-6">
        Untuk mewakili saya: {form.suami.nama || '…………………………..……..'} dan{' '}
        {form.istri.nama || '……………………………………..'} mengurus surat surat persyaratan Nikah dan mendaftarkan nikah ke Kantor Urusan Agama Kec. Batealit Jepara yang pernikahannya akan dilaksanakan pada tanggal {tgl} bulan {bln} tahun {thn}.
      </p>

      <p className="mb-12">Demikian, surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya.</p>

      <div className="grid grid-cols-3 items-start text-center">
        <div>
          <div className="h-[1.38em]" />
          <div>Pihak Kedua/ Penerima Kuasa</div>
          <div style={{ height: '26mm' }} />
          <div className={form.penerimaKuasa.nama ? 'font-bold underline' : ''}>
            {form.penerimaKuasa.nama || '………………………………..'}
          </div>
        </div>
        <div className="flex justify-center pt-10">
          <div className="border border-black px-3 py-1.5 text-[9pt] leading-tight">
            <div>Materai</div>
            <div>10.000</div>
          </div>
        </div>
        <div>
          <div>Jepara, {formatIndonesianDate(form.akad.tanggalSurat)}</div>
          <div>Pihak Pertama/Pemberi kuasa</div>
          <div style={{ height: '26mm' }} />
          <div className={pemberiNama ? 'font-bold underline' : ''}>
            {pemberiNama || '………………………………..'}
          </div>
        </div>
      </div>
    </div>
  );
}

function BelumMenikahPreview({
  form,
  catin,
}: {
  form: MarriageFilingForm;
  catin: CatinData;
}) {
  const petinggiFull = formatPetinggiDisplay(form.penandatangan);
  const jabatan = `${form.penandatangan.jabatanPenandatangan || 'Kepala Desa / Lurah'} ${form.akad.desaPenerbit || ''}`.trim();
  const tanggalText = `${form.akad.desaPenerbit || 'Batealit'}, ${formatIndonesianDate(form.akad.tanggalSurat)}`;
  const statusLabel = catin.jenisKelamin === 'Laki-laki' ? 'Jejaka' : 'Perawan';

  return (
    <div className="f4-paper print-only-sheet shadow-sm border border-slate-300 mx-auto">
      <div className="text-center font-bold underline mb-8 mt-4">
        SURAT PERNYATAAN BELUM PERNAH MENIKAH
      </div>

      <p className="mb-3">Yang bertanda tangan di bawah ini:</p>
      <div className="mb-6 space-y-1">
        <RowField label="Nama Lengkap" value={catin.nama} labelWidth="42%" />
        <RowField label="Nomor Induk Kependudukan (NIK)" value={catin.nik} labelWidth="42%" />
        <RowField
          label="Tempat dan Tanggal Lahir"
          value={formatPlaceAndDate(catin.tempatLahir, catin.tanggalLahir)}
          labelWidth="42%"
        />
        <RowField label="Jenis Kelamin" value={catin.jenisKelamin} labelWidth="42%" />
        <RowField label="Kewarganegaraan" value={catin.kewarganegaraan || 'Indonesia'} labelWidth="42%" />
        <RowField label="Agama" value={catin.agama || 'Islam'} labelWidth="42%" />
        <RowField label="Pekerjaan" value={catin.pekerjaan} labelWidth="42%" />
        <RowField label="Alamat" value={catin.alamat.alamatLengkap} labelWidth="42%" />
      </div>

      <p className="text-justify leading-[1.55] mb-4">
        Dengan ini menyatakan dengan sesungguhnya bahwa sampai saat surat pernyataan ini dibuat, saya benar-benar{' '}
        <strong>BELUM PERNAH MENIKAH ({statusLabel})</strong> dengan siapapun, baik secara resmi menurut hukum negara maupun secara agama, serta tidak terikat tali perkawinan dengan pihak manapun.
      </p>
      <p className="text-justify leading-[1.55] mb-4">
        Apabila di kemudian hari ternyata pernyataan saya ini tidak benar, maka saya bersedia dituntut sesuai dengan ketentuan hukum yang berlaku dan segala akibat hukumnya menjadi tanggung jawab saya sepenuhnya.
      </p>
      <p className="text-justify leading-[1.55] mb-10">
        Demikian surat pernyataan ini saya buat dengan sadar, jujur, dan tanpa paksaan dari pihak manapun untuk dipergunakan sebagai kelengkapan berkas pendaftaran nikah di KUA Kecamatan Batealit Kabupaten Jepara.
      </p>

      <div className="grid grid-cols-2 gap-6 text-center">
        <div>
          <div>Mengetahui,</div>
          <div>{jabatan}</div>
          <div style={{ height: '34mm' }} />
          <div className={petinggiFull ? 'font-bold underline' : ''}>
            {petinggiFull || '.............................................'}
          </div>
          {form.penandatangan.nip.trim() && (
            <div className="text-[10pt] mt-0.5">NIP. {form.penandatangan.nip.trim()}</div>
          )}
        </div>
        <div>
          <div>{tanggalText}</div>
          <div>Yang Membuat Pernyataan,</div>
          <div className="flex items-center justify-center text-[9pt]" style={{ height: '34mm' }}>
            Materai 10.000
          </div>
          <div className={catin.nama ? 'font-bold underline' : ''}>
            {catin.nama || '.............................................'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentPreviewView({ form, onBackToForm }: DocumentPreviewViewProps) {
  const [activeTab, setActiveTab] = useState<DocumentTabKey>('n1_suami');
  const [selectedDocs, setSelectedDocs] = useState<DocumentTabKey[]>([
    'n1_suami',
    'n1_istri',
    'n2',
    'n4',
    'n5_suami',
    'n5_istri',
    'sptjm',
    'surat_kuasa',
    'belum_menikah_suami',
    'belum_menikah_istri',
  ]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const toggleDocSelection = (key: DocumentTabKey) => {
    setSelectedDocs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleDownloadWord = async (keys: DocumentTabKey[], labelSuffix: string) => {
    if (keys.length === 0) return;
    setDownloading(`word-${labelSuffix}`);
    try {
      const blob = await generateMarriageWordBlob(form, keys);
      const base = `${slugName(form.suami.nama)}_${slugName(form.istri.nama)}`;
      triggerBlobDownload(blob, `Berkas_Nikah_${labelSuffix}_${base}.docx`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = (keys: DocumentTabKey[], labelSuffix: string) => {
    if (keys.length === 0) return;
    setDownloading(`pdf-${labelSuffix}`);
    try {
      const pdf = createMarriagePdfDocument(form, keys);
      const base = `${slugName(form.suami.nama)}_${slugName(form.istri.nama)}`;
      pdf.save(`Berkas_Nikah_${labelSuffix}_${base}.pdf`);
    } finally {
      setDownloading(null);
    }
  };

  const activeMeta = DOCUMENT_TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-5">
      {/* Control Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pratinjau & Unduh Berkas Nikah (F4)
          </h2>
          <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Ukuran F4 {F4_PAPER.widthMm} × {F4_PAPER.heightMm} mm</span>
            <span aria-hidden="true">·</span>
            <span>Margin Kanan/Kiri 2,5 cm</span>
            <span aria-hidden="true">·</span>
            <span>{F4_PAPER.fontFamily} {F4_PAPER.fontSizePt}pt</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBackToForm}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            Kembali ke Formulir
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cetak F4</span>
          </button>
          <button
            type="button"
            disabled={selectedDocs.length === 0 || downloading !== null}
            onClick={() => handleDownloadWord(selectedDocs, 'Lengkap')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {downloading === 'word-Lengkap'
                ? 'Menyusun Word...'
                : `Unduh Semua Word (${selectedDocs.length})`}
            </span>
          </button>
          <button
            type="button"
            disabled={selectedDocs.length === 0 || downloading !== null}
            onClick={() => handleDownloadPdf(selectedDocs, 'Lengkap')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh Semua PDF ({selectedDocs.length})</span>
          </button>
        </div>
      </div>

      {/* Document selector tabs + bundle checkboxes */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">
            Pilih lembar dokumen untuk pratinjau (centang untuk diikutkan pada unduhan paket lengkap):
          </span>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedDocs(DOCUMENT_TABS.map((t) => t.key))}
              className="text-emerald-800 font-medium hover:underline cursor-pointer"
            >
              Centang Semua
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedDocs([
                  'n1_suami',
                  'n2',
                  'n4',
                  'n5_suami',
                  'sptjm',
                  'surat_kuasa',
                  'belum_menikah_suami',
                ])
              }
              className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
            >
              Paket Standar (7 Lembar)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Daftar 7 Jenis Dokumen Nikah">
          {DOCUMENT_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const isChecked = selectedDocs.includes(tab.key);
            return (
              <div
                key={tab.key}
                className={`inline-flex items-center rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  aria-label={`Sertakan ${tab.shortLabel} dalam paket unduh`}
                  onClick={() => toggleDocSelection(tab.key)}
                  className="pl-2.5 pr-1 py-2 cursor-pointer"
                >
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Square className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className="pl-1 pr-3 py-2 text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  {tab.code}
                </button>
              </div>
            );
          })}
        </div>

        {/* Active sheet quick export bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <FileText className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-slate-900">{activeMeta.fullTitle}</span>
            {activeMeta.lampiran && (
              <>
                <span aria-hidden="true">·</span>
                <span>{activeMeta.lampiran}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={downloading !== null}
              onClick={() => handleDownloadWord([activeTab], activeTab.toUpperCase())}
              className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Unduh Lembar Ini (.docx)
            </button>
            <button
              type="button"
              disabled={downloading !== null}
              onClick={() => handleDownloadPdf([activeTab], activeTab.toUpperCase())}
              className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Unduh Lembar Ini (.pdf)
            </button>
          </div>
        </div>
      </div>

      {/* Live F4 Paper Preview Viewport */}
      <div className="bg-slate-200/70 rounded-xl p-4 sm:p-8 overflow-x-auto">
        {activeTab === 'n1_suami' && (
          <N1Preview form={form} catin={form.suami} ayah={form.ayahSuami} ibu={form.ibuSuami} />
        )}
        {activeTab === 'n1_istri' && (
          <N1Preview form={form} catin={form.istri} ayah={form.ayahIstri} ibu={form.ibuIstri} />
        )}
        {activeTab === 'n2' && <N2Preview form={form} />}
        {activeTab === 'n4' && <N4Preview form={form} />}
        {activeTab === 'n5_suami' && (
          <N5Preview
            form={form}
            ayah={form.ayahSuami}
            ibu={form.ibuSuami}
            anak={form.suami}
            pasangan={form.istri}
          />
        )}
        {activeTab === 'n5_istri' && (
          <N5Preview
            form={form}
            ayah={form.ayahIstri}
            ibu={form.ibuIstri}
            anak={form.istri}
            pasangan={form.suami}
          />
        )}
        {activeTab === 'sptjm' && <SptjmPreview form={form} />}
        {activeTab === 'surat_kuasa' && <SuratKuasaPreview form={form} />}
        {activeTab === 'belum_menikah_suami' && <BelumMenikahPreview form={form} catin={form.suami} />}
        {activeTab === 'belum_menikah_istri' && <BelumMenikahPreview form={form} catin={form.istri} />}
      </div>
    </div>
  );
}
