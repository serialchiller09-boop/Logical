/**
 * Anonymous browser session for personal state (bookmarks, notes, recents).
 *
 * Choice: httpOnly cookie with a random session id (not a login). Reasons:
 * - Scopes personal data per browser without adding accounts.
 * - httpOnly keeps the id out of page JS (XSS cannot read it from document.cookie).
 * - SameSite=Lax covers normal same-site navigation; Secure is on in production.
 * - Alternatives rejected for this install: shared global tables (anyone who can
 *   hit the API reads/writes everyone else's notes), client-supplied session
 *   headers/localStorage ids (any script can forge or steal them).
 */
import { randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'logical_sid';
const SID_HEX_LEN = 64; // 32 bytes

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const key = part.slice(0, i).trim();
    const raw = part.slice(i + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

export function isValidSessionId(sid) {
  return typeof sid === 'string' && /^[a-f0-9]{64}$/i.test(sid);
}

export function newSessionId() {
  return randomBytes(SID_HEX_LEN / 2).toString('hex');
}

export function sessionCookieHeader(sid) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  // 400 days — browsers cap Max-Age; long enough that bookmarks survive normal use.
  return `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=34560000${secure}`;
}

/** Attach req.sessionId and set the cookie when missing/invalid. */
export function attachSession(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let sid = cookies[SESSION_COOKIE];
  if (!isValidSessionId(sid)) {
    sid = newSessionId();
    res.setHeader('Set-Cookie', sessionCookieHeader(sid));
  }
  req.sessionId = sid;
  return sid;
}
