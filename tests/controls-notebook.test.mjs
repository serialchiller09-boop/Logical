import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CONTROLS_CHAPTERS, CONTROLS_NOTEBOOK, FRONT_MATTER, RELATED_CONTROLS_READING } from '../web/src/data/controlsNotebook.js';
import {
  normalizeNotebookSearch, notebookChapterForPage, notebookPageHref, notebookPageLabel,
  notebookPageNumber, notebookPdfHref, prepareNotebookIndex, searchNotebookPages
} from '../web/src/lib/controlsNotebook.js';
import { SECTIONS } from '../server/src/seed/sections.js';

const pdf = readFileSync(new URL('../web/public/documents/controls-notebook-v1.2.pdf', import.meta.url));
const document = JSON.parse(readFileSync(new URL('../web/public/documents/controls-notebook-v1.2.search.json', import.meta.url), 'utf8'));
const index = prepareNotebookIndex(document);

test('the original PDF and indexed pages stay tied to the supplied revision', () => {
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const checksum = createHash('sha256').update(pdf).digest('hex');
  assert.equal(checksum, CONTROLS_NOTEBOOK.sha256);
  assert.equal(document.sourceSha256, checksum);
  assert.equal(document.sourceFile, 'controls-notebook-v1.2.pdf');
  assert.equal(document.revision, '1.2');
  assert.equal(document.pageCount, 108);
  assert.deepEqual(index.pages.map((page) => page.page), Array.from({ length: 108 }, (_, i) => i + 1));
  assert.match(index.pages[0].text, /INTERNAL USE.*CONTROLLED TECHNICAL REFERENCE/i);
  assert.match(index.pages[6].text, /Section 0: Working Rules/);
  assert.match(index.pages[68].text, /Section 10: Twelve Hands-On Labs/);
  assert.match(index.pages[107].text, /Appendix H: References/);
  assert.doesNotMatch(index.pages[16].text, /Page 17\s*\|\s*Reference Manual Rev/);
});

test('an index for a different or incomplete document is rejected', () => {
  assert.throws(() => prepareNotebookIndex({ ...document, revision: '1.1' }), /does not match/i);
  assert.throws(() => prepareNotebookIndex({ ...document, sourceSha256: 'wrong' }), /does not match/i);
  assert.throws(() => prepareNotebookIndex({ ...document, pages: document.pages.slice(1) }), /does not match/i);
  const pages = [...document.pages];
  pages[10] = { ...pages[10], page: 99 };
  assert.throws(() => prepareNotebookIndex({ ...document, pages }), /out-of-order/i);
});

test('contents links cover all sections and appendices without pointing outside the chapter', () => {
  const sections = CONTROLS_CHAPTERS.filter((chapter) => chapter.kind === 'section');
  const appendices = CONTROLS_CHAPTERS.filter((chapter) => chapter.kind === 'appendix');
  assert.equal(sections.length, 12);
  assert.deepEqual(appendices.map((chapter) => chapter.number), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  assert.equal(new Set(CONTROLS_CHAPTERS.map((chapter) => chapter.id)).size, CONTROLS_CHAPTERS.length);
  for (const [i, chapter] of CONTROLS_CHAPTERS.entries()) {
    const nextPage = CONTROLS_CHAPTERS[i + 1]?.page ?? CONTROLS_NOTEBOOK.pageCount + 1;
    assert.ok(chapter.page < nextPage, `${chapter.id}: chapter start pages must increase`);
    for (const [title, page] of chapter.items) {
      assert.ok(title && Number.isInteger(page) && page >= chapter.page && page < nextPage, `${chapter.id}: invalid page for ${title}`);
    }
    assert.equal(notebookChapterForPage(chapter.page).id, chapter.id);
  }
  assert.deepEqual(FRONT_MATTER.map((item) => item.page), [1, 2, 4]);
  assert.equal(notebookPageLabel(1), 'Front matter');
  assert.match(notebookPageLabel(93), /Appendix E · Field Pocket Card/);
  assert.match(notebookPageLabel(73), /Section 10 · Twelve Hands-On Labs/);
  for (const section of SECTIONS) {
    assert.ok(RELATED_CONTROLS_READING[section.slug], `missing related reading for ${section.slug}`);
    assert.ok(RELATED_CONTROLS_READING[section.slug].page <= document.pageCount);
  }
});

test('real notebook search reaches the intended pages and handles common notation', () => {
  const pages = (query) => searchNotebookPages(index, query).map((hit) => hit.page);
  assert.ok(pages('1794-AENTR').includes(29));
  assert.ok(pages('HMI Faceplate').includes(73));
  assert.equal(pages('HMI Faceplate')[0], 73, 'the lab heading outranks casual mentions');
  assert.equal(pages('competency matrix')[0], 105);
  assert.ok(pages('4-20 mA').includes(17));
  assert.deepEqual(pages('4–20 mA'), pages('4-20 mA'));
  assert.ok(pages('H2S').includes(65));
  assert.deepEqual(pages('h₂s'), pages('H2S'));
  assert.ok(pages('BPCS SIS').includes(8));
  assert.deepEqual(pages('definitely-not-a-real-notebook-query'), []);
  assert.deepEqual(pages('x'), [], 'short queries do not return an overwhelming result list');
  assert.equal(normalizeNotebookSearch('  H₂S  4–20 mA  '), 'h2s 4-20 ma');
  for (const hit of searchNotebookPages(index, 'fail-safe')) {
    assert.ok(hit.page >= 1 && hit.page <= 108);
    assert.ok(hit.label && hit.snippet);
    assert.doesNotMatch(hit.snippet, /\n/);
  }
});

test('page deep links safely handle bounds, query encoding and bad input', () => {
  assert.equal(notebookPageNumber(null), 1);
  assert.equal(notebookPageNumber('nonsense'), 1);
  assert.equal(notebookPageNumber('3x'), 1);
  assert.equal(notebookPageNumber('0'), 1);
  assert.equal(notebookPageNumber('109'), 108);
  assert.equal(notebookPageNumber('73'), 73);
  const link = new URL(notebookPageHref(73, 'H₂S & LEL'), 'https://logical.invalid');
  assert.equal(link.pathname, '/controls-notebook');
  assert.equal(link.searchParams.get('page'), '73');
  assert.equal(link.searchParams.get('q'), 'H₂S & LEL');
  assert.equal(link.hash, '#reader');
  assert.equal(notebookPdfHref(73), '/documents/controls-notebook-v1.2.pdf#page=73&view=FitH');
});
