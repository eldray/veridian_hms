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
  plugins: [neutraliseDirectRun],
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
console.log(`✅ Backend bundled -> ${outDir}`);
