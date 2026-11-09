import { CONTROLS_CHAPTERS, CONTROLS_NOTEBOOK } from '../data/controlsNotebook.js';

/** Normalize typography without turning examples into authoritative data. */
export function normalizeNotebookSearch(value) {
  return String(value ?? '')
    .normalize('NFKC') // e.g. H₂S and H2S
    .toLocaleLowerCase('en-US')
    .replace(/[\u2010-\u2015\u2212]/g, '-') // 4–20, 4−20 and 4-20
    .replace(/\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function notebookPageNumber(value) {
  const raw = String(value ?? '');
  if (!/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  if (!Number.isSafeInteger(n)) return 1;
  return Math.max(1, Math.min(CONTROLS_NOTEBOOK.pageCount, n));
}

export function notebookPageHref(page, query = '') {
  const params = new URLSearchParams({ page: String(notebookPageNumber(page)) });
  if (String(query).trim()) params.set('q', String(query).trim());
  return `/controls-notebook?${params.toString()}#reader`;
}

export function notebookPdfHref(page = 1) {
  return `${CONTROLS_NOTEBOOK.pdfUrl}#page=${notebookPageNumber(page)}&view=FitH`;
}

export function notebookChapterForPage(page) {
  const number = notebookPageNumber(page);
  let chapter = null;
  for (const item of CONTROLS_CHAPTERS) {
    if (item.page > number) break;
    chapter = item;
  }
  return chapter;
}

export function notebookPageLabel(page) {
  const chapter = notebookChapterForPage(page);
  if (!chapter) return 'Front matter';
  return `${chapter.kind === 'appendix' ? 'Appendix' : 'Section'} ${chapter.kind === 'section' ? Number(chapter.number) : chapter.number} · ${chapter.title}`;
}

/** Validate the shipped index and precompute its searchable strings once per load. */
export function prepareNotebookIndex(data) {
  if (!data || data.revision !== CONTROLS_NOTEBOOK.revision || data.sourceSha256 !== CONTROLS_NOTEBOOK.sha256 ||
      data.pageCount !== CONTROLS_NOTEBOOK.pageCount || !Array.isArray(data.pages) || data.pages.length !== data.pageCount) {
    throw new Error('The notebook search index does not match the included PDF revision.');
  }
  const pages = data.pages.map((item, i) => {
    if (item.page !== i + 1 || typeof item.text !== 'string') {
      throw new Error('The notebook search index has missing or out-of-order pages.');
    }
    const flatText = item.text.replace(/\.{4,}/g, ' ').replace(/\s+/g, ' ').trim();
    const heading = item.text.split('\n').find((line) => line.trim()) || '';
    const mappedTitles = CONTROLS_CHAPTERS.flatMap((chapter) => [
      ...(chapter.page === item.page ? [chapter.title] : []),
      ...chapter.items.filter(([, page]) => page === item.page).map(([title]) => title)
    ]).map(normalizeNotebookSearch);
    return { ...item, flatText, searchText: normalizeNotebookSearch(flatText), heading: normalizeNotebookSearch(heading), mappedTitles };
  });
  return { ...data, pages };
}

/** Search the PDF's extracted text page by page. PDF pages remain the authority. */
export function searchNotebookPages(index, query) {
  const needle = normalizeNotebookSearch(query);
  if (!index?.pages || needle.length < 2) return [];
  const terms = [...new Set(needle.split(' ').filter(Boolean))];
  const results = [];
  for (const page of index.pages) {
    const { searchText, flatText, heading, mappedTitles } = page;
    if (!searchText || !terms.every((term) => searchText.includes(term))) continue;
    const positions = terms.map((term) => searchText.indexOf(term));
    const phrasePosition = searchText.indexOf(needle);
    const first = phrasePosition >= 0 ? phrasePosition : Math.min(...positions);
    let score = terms.reduce((sum, term) => sum + (heading.includes(term) ? 8 : 1), 0);
    if (phrasePosition >= 0) score += 4;
    if (mappedTitles.some((title) => terms.every((term) => title.includes(term)))) score += 20;
    // Contents pages list every title but the actual body is usually more useful.
    if (page.page === 2 || page.page === 3) score -= 8;
    const start = Math.max(0, first - 75);
    const end = Math.min(flatText.length, Math.max(first + 150, start + 220));
    const snippet = `${start ? '…' : ''}${flatText.slice(start, end).trim()}${end < flatText.length ? '…' : ''}`;
    results.push({ page: page.page, label: notebookPageLabel(page.page), snippet, score });
  }
  return results.sort((a, b) => b.score - a.score || a.page - b.page);
}

let indexPromise;

/** Static, versioned asset, independent of the persisted SQLite seed. */
export function loadControlsNotebookIndex() {
  if (!indexPromise) {
    indexPromise = fetch(CONTROLS_NOTEBOOK.indexUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Notebook index could not be loaded (HTTP ${response.status}).`);
        return response.json();
      })
      .then(prepareNotebookIndex)
      .catch((error) => { indexPromise = undefined; throw error; });
  }
  return indexPromise;
}
