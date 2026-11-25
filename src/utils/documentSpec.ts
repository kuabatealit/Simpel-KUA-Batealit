import type { DocumentTabKey } from '../types/marriage';

export const F4_PAPER = {
  widthMm: 210,
  heightMm: 330,
  marginLeftMm: 25,
  marginRightMm: 25,
  marginTopMm: 14,
  marginBottomMm: 14,
  fontFamily: 'Bookman Old Style',
  fontSizePt: 11,
  n1SignatureBlankLines: 6,
} as const;

export const N2_REQUIREMENTS_LIST = [
  'Surat Pengantar nikah dari Desa/Kelurahan',
  'Persetujuan Calon Mempelai',
  'Fotokopi KTP',
  'Fotokopi Akta Kelahiran',
  'Fotokopi Kartu Keluarga',
  'Pasfoto 2x3 = 3 lembar berlatar belakang biru',
  '.....................................................',
  '.....................................................',
] as const;

export interface DocumentTabMeta {
  key: DocumentTabKey;
  code: string;
  shortLabel: string;
  fullTitle: string;
  lampiran?: string;
}

export const DOCUMENT_TABS: DocumentTabMeta[] = [
  {
    key: 'n1_suami',
    code: 'N1 (Suami)',
    shortLabel: 'Model N1 — Calon Suami',
    fullTitle: 'Formulir Pengantar Nikah (Calon Suami)',
    lampiran: 'Lampiran V Keputusan Dirjen Bimas Islam No 473 Tahun 2020',
  },
  {
    key: 'n1_istri',
    code: 'N1 (Istri)',
    shortLabel: 'Model N1 — Calon Istri',
    fullTitle: 'Formulir Pengantar Nikah (Calon Istri)',
    lampiran: 'Lampiran V Keputusan Dirjen Bimas Islam No 473 Tahun 2020',
  },
  {
    key: 'n2',
    code: 'N2',
    shortLabel: 'Model N2 — Kehendak Nikah',
    fullTitle: 'Formulir Permohonan Kehendak Nikah',
    lampiran: 'Lampiran VI Keputusan Dirjen Bimas Islam No 473 Tahun 2020',
  },
  {
    key: 'n4',
    code: 'N4',
    shortLabel: 'Model N4 — Persetujuan Catin',
    fullTitle: 'Formulir Persetujuan Calon Pengantin',
    lampiran: 'Lampiran VIII Keputusan Dirjen Bimas Islam No 473 Tahun 2020',
  },
  {
    key: 'n5_suami',
    code: 'N5 (Suami)',
    shortLabel: 'Model N5 — Izin Ortu Suami',
    fullTitle: 'Formulir Surat Izin Orang Tua (Calon Suami)',
    lampiran: 'Lampiran IX Keputusan Dirjen Bimas Islam No 473 Tahun 2020',
  },
  {
    key: 'n5_istri',
    code: 'N5 (Istri)',
    shortLabel: 'Model N5 — Izin Ortu Istri',
    fullTitle: 'Formulir Surat Izin Orang Tua (Calon Istri)',
    lampiran: 'Lampiran IX Keputusan Dirjen Bimas Islam No 473 Tahun 2020',
  },
  {
    key: 'sptjm',
    code: 'SPTJM',
    shortLabel: 'SPTJM Pemeriksaan Berkas',
    fullTitle: 'Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)',
  },
  {
    key: 'surat_kuasa',
    code: 'Kuasa',
    shortLabel: 'Surat Kuasa',
    fullTitle: 'Surat Kuasa Pengurusan Nikah',
  },
  {
    key: 'belum_menikah_suami',
    code: 'BPM (Suami)',
    shortLabel: 'Belum Pernah Menikah (Suami)',
    fullTitle: 'Surat Pernyataan Belum Pernah Menikah (Calon Suami)',
  },
  {
    key: 'belum_menikah_istri',
    code: 'BPM (Istri)',
    shortLabel: 'Belum Pernah Menikah (Istri)',
    fullTitle: 'Surat Pernyataan Belum Pernah Menikah (Calon Istri)',
  },
];
