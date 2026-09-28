import { createHash } from 'node:crypto';

export function canonicalizeUrl(value) {
  const url = new URL(value);
  url.hash = '';
  url.searchParams.sort();
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString();
}

export function recordKey({ url, title = '', publishedAt = '' }) {
  return createHash('sha256').update(`${canonicalizeUrl(url)}\n${title.trim().toLowerCase()}\n${publishedAt}`).digest('hex').slice(0, 24);
}

export function shouldInspect(record, now = new Date(), minimumHours = 20) {
  if (!record?.lastCheckedAt) return true;
  return now.getTime() - new Date(record.lastCheckedAt).getTime() >= minimumHours * 60 * 60 * 1000;
}
