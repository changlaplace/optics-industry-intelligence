// Keeps the static MVP honest: required fields and source URLs must be present before publishing.
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const checks=['companies:','jobs:','people:','news:','sources:','https://'];
for(const check of checks) if(!source.includes(check)) throw new Error(`Missing dataset marker: ${check}`);
console.log('Static dataset shape and source URL markers validated.');
