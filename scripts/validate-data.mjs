// Keeps automated updates from publishing malformed static data.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const startMarker = 'const D=';
const endMarker = ';\nconst app=';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('Unable to locate the D dataset');

const data = vm.runInNewContext(`(${source.slice(start + startMarker.length, end)})`, Object.create(null), { timeout: 1000 });
for (const key of ['companies', 'jobs', 'people', 'news', 'sources', 'technologies']) {
  if (!Array.isArray(data[key])) throw new Error(`Dataset field ${key} must be an array`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) throw new Error('Dataset updated date is invalid');
if (data.companies.length > 2000 || data.jobs.length > 10000 || data.news.length > 5000) {
  throw new Error('Dataset exceeded the static-site safety limit');
}

function publicUrl(value, label) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${label} has an invalid URL`); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${label} URL must be public HTTP(S)`);
}

data.companies.forEach((item, index) => {
  if (!Array.isArray(item) || item.length < 6 || !item[0]) throw new Error(`Company ${index} is malformed`);
  publicUrl(item[5], `Company ${item[0]}`);
});
data.jobs.forEach((item, index) => {
  if (!Array.isArray(item) || item.length < 7 || !item[0] || !item[1]) throw new Error(`Job ${index} is malformed`);
  publicUrl(item[6], `Job ${item[0]}`);
});
data.news.forEach((item, index) => {
  if (!Array.isArray(item) || item.length < 5 || !item[0] || !/^\d{4}-\d{2}-\d{2}$/.test(item[2])) throw new Error(`News ${index} is malformed`);
  publicUrl(item[4], `News ${item[0]}`);
});

console.log(`Validated ${data.companies.length} companies, ${data.jobs.length} jobs, and ${data.news.length} news records.`);
