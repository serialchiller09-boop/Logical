#!/usr/bin/env python3
"""Build the page-level search index for the supplied controls notebook.

The PDF is the authoritative copy. This is a best-effort text extraction for
search and an accessible preview only; complex tables, symbols and diagrams may
not extract faithfully. No Python dependency is needed to build/run the app.

To regenerate after replacing the PDF:
    python -m pip install pypdf==7.0.0
    python scripts/index-controls-notebook.py

Update the revision, contents map and tests as appropriate for a new manual.
"""

from hashlib import sha256
from pathlib import Path
import json
import re

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'web/public/documents/controls-notebook-v1.2.pdf'
OUT = ROOT / 'web/public/documents/controls-notebook-v1.2.search.json'

# The same running footer occurs on virtually every page and would make searches
# for the manual's title/revision match every page. Everything else is retained.
FOOTER = re.compile(
    r'^\s*(?:Page\s+\d+\s*\|\s*Reference Manual Rev 1\.2\s*\|\s*'
    r'Gas Plant Controls & Automation|Gas Plant Controls & Automation\s*\|\s*'
    r'Reference Manual Rev 1\.2\s*\|\s*Page\s+\d+)\s*$',
    re.IGNORECASE,
)


def page_text(page):
    text = page.extract_text(extraction_mode='layout') or ''
    lines = [line.rstrip() for line in text.splitlines() if not FOOTER.match(line)]
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip()


def main():
    reader = PdfReader(PDF)
    document = {
        'title': 'Gas Plant Controls & Automation Reference Manual',
        'revision': '1.2',
        'sourceFile': PDF.name,
        'sourceSha256': sha256(PDF.read_bytes()).hexdigest(),
        'pageCount': len(reader.pages),
        'pages': [
            {'page': number, 'text': page_text(page)}
            for number, page in enumerate(reader.pages, start=1)
        ],
    }
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Indexed {document["pageCount"]} pages from {PDF.name} -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
