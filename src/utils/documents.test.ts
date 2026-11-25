import test from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import { BATEALIT_VILLAGES } from '../data/regions';
import { F4_PAPER, N2_REQUIREMENTS_LIST } from './documentSpec';
import { createDemoFilingForm } from './formatting';
import { createMarriageWordDocument } from './wordGenerator';
import { createMarriagePdfDocument } from './pdfGenerator';

test('Batealit district contains exactly 11 official villages', () => {
  assert.equal(BATEALIT_VILLAGES.length, 11);
  assert.ok(BATEALIT_VILLAGES.includes('Batealit'));
  assert.ok(BATEALIT_VILLAGES.includes('Bantrung'));
  assert.ok(BATEALIT_VILLAGES.includes('Somosari'));
  assert.ok(BATEALIT_VILLAGES.includes('Raguklampitan'));
});

test('F4 document spec enforces 210x330mm, 2.5cm L/R margins, 11pt Bookman Old Style', () => {
  assert.equal(F4_PAPER.widthMm, 210);
  assert.equal(F4_PAPER.heightMm, 330);
  assert.equal(F4_PAPER.marginLeftMm, 25);
  assert.equal(F4_PAPER.marginRightMm, 25);
  assert.equal(F4_PAPER.fontSizePt, 11);
  assert.equal(F4_PAPER.fontFamily, 'Bookman Old Style');
  assert.ok(F4_PAPER.n1SignatureBlankLines >= 5);
});

test('N2 checklist matches exact 8 items required by user with 3 lembar pasfoto', () => {
  assert.equal(N2_REQUIREMENTS_LIST.length, 8);
  assert.equal(N2_REQUIREMENTS_LIST[0], 'Surat Pengantar nikah dari Desa/Kelurahan');
  assert.equal(N2_REQUIREMENTS_LIST[5], 'Pasfoto 2x3 = 3 lembar berlatar belakang biru');
  assert.equal(N2_REQUIREMENTS_LIST[6], '.....................................................');
  assert.equal(N2_REQUIREMENTS_LIST[7], '.....................................................');
});

test('Word (.docx) generator produces valid non-empty buffer for all 7 forms', async () => {
  const form = createDemoFilingForm({
    desaName: 'Batealit',
    namaPetinggi: 'Ahmad Subagyo',
    gelarDepan: 'H.',
    gelarBelakang: 'S.H.',
    nip: '197504122005011004',
  });
  const doc = createMarriageWordDocument(form, [
    'n1_suami',
    'n2',
    'n4',
    'n5_suami',
    'sptjm',
    'surat_kuasa',
    'belum_menikah_suami',
  ]);
  const buf = await Packer.toBuffer(doc);
  assert.ok(buf.byteLength > 5000);
  // DOCX files are ZIP archives starting with PK
  assert.equal(buf[0], 0x50);
  assert.equal(buf[1], 0x4b);
});

test('PDF generator produces valid F4 (210x330mm) PDF for all 7 forms', () => {
  const form = createDemoFilingForm({ desaName: 'Batealit' });
  const pdf = createMarriagePdfDocument(form, [
    'n1_suami',
    'n2',
    'n4',
    'n5_suami',
    'sptjm',
    'surat_kuasa',
    'belum_menikah_suami',
  ]);
  assert.equal(pdf.getNumberOfPages(), 7);
  const pageSize = pdf.internal.pageSize;
  assert.equal(Math.round(pageSize.getWidth()), 210);
  assert.equal(Math.round(pageSize.getHeight()), 330);
  const bytes = pdf.output('arraybuffer');
  assert.ok(bytes.byteLength > 5000);
});
