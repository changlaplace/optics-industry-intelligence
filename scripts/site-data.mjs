import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const appPath = resolve(root, 'dist', 'app.js');
const source = readFileSync(appPath, 'utf8');
const startMarker = 'const D=';
const start = source.indexOf(startMarker);
const tail = start < 0 ? '' : source.slice(start + startMarker.length);
const endMatch = tail.match(/;\r?\n\s*const app=/);
const end = endMatch ? start + startMarker.length + endMatch.index : -1;

if (start < 0 || end < 0) throw new Error('Unable to locate the D dataset in dist/app.js');

function validate(data) {
  if (!data || typeof data !== 'object') throw new Error('Dataset must be an object');
  for (const key of ['companies', 'jobs', 'people', 'news', 'sources', 'technologies']) {
    if (!Array.isArray(data[key])) throw new Error(`Dataset field ${key} must be an array`);
  }
  if (typeof data.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) {
    throw new Error('Dataset updated must use YYYY-MM-DD');
  }
}

function readDataset() {
  const literal = source.slice(start + startMarker.length, end);
  const data = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
  validate(data);
  return JSON.parse(JSON.stringify(data));
}

const command = process.argv[2] || 'export';
if (command === 'export') {
  process.stdout.write(`${JSON.stringify(readDataset())}\n`);
} else if (command === 'import') {
  const inputPath = process.argv[3];
  if (!inputPath) throw new Error('Import requires a JSON file path');
  const data = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
  validate(data);
  const next = `${source.slice(0, start)}${startMarker}${JSON.stringify(data)}${source.slice(end)}`;
  const temporary = `${appPath}.tmp`;
  writeFileSync(temporary, next, 'utf8');
  renameSync(temporary, appPath);
} else {
  throw new Error(`Unknown command: ${command}`);
}
