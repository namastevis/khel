/* Bumps the offline cache name in sw.js, which is what tells an installed
   tablet that a new version exists. Run it before pushing:  npm run release */

import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../sw.js', import.meta.url);
const src = readFileSync(path, 'utf8');

const match = src.match(/const CACHE = '([a-z-]+)-v(\d+)';/);
if (!match) {
  console.error("couldn't find the CACHE line in sw.js");
  process.exit(1);
}

const [line, name, version] = match;
const next = `const CACHE = '${name}-v${Number(version) + 1}';`;
writeFileSync(path, src.replace(line, next));

console.log(`${name}-v${version}  →  ${name}-v${Number(version) + 1}`);
console.log('commit and push; installed devices pick it up the next time they open online.');
