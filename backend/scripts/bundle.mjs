// backend/scripts/bundle.mjs
// Bundles the backend TypeScript into plain Node ESM files for the desktop app.
//
// Why bundle instead of `tsc`: the sources use extension-less relative imports ("./app"), which Node's
// ESM loader cannot resolve, so tsc output crashes on start with ERR_MODULE_NOT_FOUND. esbuild resolves
// and inlines them. Third-party packages stay external (they ship in node_modules next to the bundle).
//
// Usage: node scripts/bundle.mjs <outDir>
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..');
const outDir = path.resolve(process.argv[2] || path.join(backendDir, 'dist-bundle'));

// Seed/script files contain "run this file directly" blocks such as
//   if (import.meta.url === `file://${process.argv[1]}`) { seed...(); process.exit() }
// In a bundle import.meta.url IS the entry file, so those blocks would fire on startup. Neutralise them.
const directRunPatterns = [
  [/if \(import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`\)/g, 'if (false)'],
  [/if \(isDirectRun\)/g, 'if (false)'],
];
const neutraliseDirectRun = {
  name: 'neutralise-direct-run',
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/](seed|scripts)[\\/].*\.ts$/ }, async (args) => {
      let text = await fs.promises.readFile(args.path, 'utf8');
      for (const [re, replacement] of directRunPatterns) text = text.replace(re, replacement);
      return { contents: text, loader: 'ts' };
    });
  },
};

// The installed app must not contain the demo seed at all. server.ts lazily imports ./seed/seedData for
// `npm run dev`; in this bundle that import resolves to a stub, so testSeed / bulkGenerator (fake patients,
// staff, bills, well-known logins) are never compiled in and cannot be triggered by any env var or flag.
// Only coreSeed (reference data, production profile) ships, via bootstrap.mjs.
const stubDemoSeed = {
  name: 'stub-demo-seed',
  setup(b) {
    b.onResolve({ filter: /(^|[\\/])(seedData|testSeed|bulkGenerator|cleanTestData)(\.js|\.ts)?$/ }, (args) => ({
      path: args.path,
      namespace: 'demo-seed-stub',
    }));
    b.onResolve({ filter: /.*/, namespace: 'demo-seed-stub' }, (args) => ({ path: args.path, namespace: 'demo-seed-stub' }));
    b.onLoad({ filter: /.*/, namespace: 'demo-seed-stub' }, () => ({
      contents:
        "const off = async () => { throw new Error('Demo data seeding is not part of the installed application.'); };\n" +
        'export const seedDatabase = off;\nexport const seedTestData = off;\nexport const hasNonDemoPatients = off;\n' +
        'export default off;',
      loader: 'js',
    }));
  },
};

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: {
    server: path.join(backendDir, 'src', 'server.ts'),
    bootstrap: path.join(backendDir, 'src', 'seed', 'bootstrap.ts'),
  },
  outdir: outDir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22', // Electron 36 runs Node 22
  packages: 'external',
  sourcemap: false,
  logLevel: 'info',
  // Do NOT hand esbuild backend/tsconfig.json: its `paths: { "*": ["node_modules/*"] }` rewrites every bare
  // import ("node-cron", "express" ...) to a file path, so `packages: 'external'` no longer applies and the
  // CommonJS packages get inlined into the ESM bundle (and break on __dirname). Pass only what matters.
  tsconfigRaw: { compilerOptions: { target: 'ES2020', useDefineForClassFields: false } },
  plugins: [stubDemoSeed, neutraliseDirectRun],
  banner: {
    // some bundled code paths still use require()/__dirname-style helpers
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});

// Safety net: fail the build if a direct-run guard slipped through
for (const f of ['server.mjs', 'bootstrap.mjs']) {
  const code = fs.readFileSync(path.join(outDir, f), 'utf8');
  if (/import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`/.test(code)) {
    console.error(`❌ ${f} still contains an unguarded "run directly" block`);
    process.exit(1);
  }
}

// Safety net: fail the build if demo-seed code or demo credentials reached either bundle.
const demoMarkers = ['seedpat-', 'seedmed-', 'seedreq-', 'generatePatients', 'seedTestData(', 'doctor123', 'nurse123'];
for (const f of ['server.mjs', 'bootstrap.mjs']) {
  const code = fs.readFileSync(path.join(outDir, f), 'utf8');
  const hit = demoMarkers.filter((m) => code.includes(m));
  if (hit.length) {
    console.error(`❌ ${f} contains demo-seed code (${hit.join(', ')}). The installed app must ship reference data only.`);
    process.exit(1);
  }
}
console.log(`✅ Backend bundled -> ${outDir}`);
