// Rebuilds src/seed/bulkGenerator.ts from the part files in this directory.
// The generator is split into parts only because a single write payload of the whole
// file is rejected by the editor tooling; the assembled file is what the seed imports.
// Run: node scripts/seed-parts/assemble.cjs
const fs = require('node:fs');
const path = require('node:path');

const here = __dirname;
const target = path.resolve(here, '../../src/seed/bulkGenerator.ts');
const ORDER = ['bg_preamble', 'bg_head', 'bg_body', 'bg_a', 'bg_b', 'bg_c', 'bg_d', 'bg_e', 'bg_f'];

const chunks = ORDER.map((name) => fs.readFileSync(path.join(here, `${name}.ts`), 'utf8').replace(/\s+$/, ''));
const output = `${chunks.join('\n\n')}\n`;
fs.writeFileSync(target, output, 'utf8');
console.log(`wrote ${path.relative(process.cwd(), target)} — ${output.split('\n').length} lines from ${ORDER.length} parts`);
