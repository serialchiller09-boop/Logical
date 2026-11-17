/**
 * Top-bar breadcrumbs. The last item is the current page and is not a link.
 * Section and entry crumbs only point at routes that exist: /s/:slug, never /s or /e.
 */

const LABELS = {
  editor: 'rung editor',
  exercises: 'exercises',
  'controls-notebook': 'controls notebook',
  notebook: 'substation notebook',
  'io-sandbox': 'I/O sandbox',
  tools: 'tools & simulator',
  saved: 'my list',
  admin: 'plant data'
};

function sectionLabel(slug, sections) {
  const known = (sections || []).find((item) => item.slug === slug);
  return known?.label || slug;
}

export function breadcrumbItems(pathname, sections = []) {
  const seg = String(pathname || '/').split('/').filter(Boolean);
  const items = [{ to: '/', label: 'reference' }];
  if (!seg.length) return items;

  if (seg[0] === 's' && seg[1]) {
    const slug = decodeURIComponent(seg[1]);
    items.push({ to: null, label: sectionLabel(slug, sections) });
    return items;
  }

  if (seg[0] === 'e' && seg[1]) {
    const id = decodeURIComponent(seg[1]);
    const section = id.split(':')[0];
    if (section && (sections || []).some((item) => item.slug === section)) {
      items.push({ to: `/s/${encodeURIComponent(section)}`, label: sectionLabel(section, sections) });
    }
    const tail = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id;
    items.push({ to: null, label: tail });
    return items;
  }

  const label = LABELS[seg[0]] || seg[0];
  if (seg[1]) {
    items.push({ to: `/${seg[0]}`, label });
    items.push({ to: null, label: decodeURIComponent(seg[1]) });
  } else {
    items.push({ to: null, label });
  }
  return items;
}
