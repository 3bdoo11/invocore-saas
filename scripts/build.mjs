import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const localViteBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'vite');
const localTscBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'tsc');

if (fs.existsSync(localViteBin) && fs.existsSync(localTscBin)) {
  const tscRes = spawnSync(localTscBin, ['-b'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  if (tscRes.status !== 0) process.exit(tscRes.status ?? 1);

  const viteRes = spawnSync(localViteBin, ['build'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  process.exit(viteRes.status ?? 0);
}

// Static production builder using the local TypeScript compiler
const require = createRequire(import.meta.url);
const vscodeTsPath =
  '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/typescript.js';

if (!fs.existsSync(vscodeTsPath)) {
  console.error('Error: TypeScript compiler not found.');
  process.exit(1);
}

const ts = require(vscodeTsPath);

function resolveSourceFile(baseDir, relPath) {
  const cleanRel = relPath.split('?')[0];
  const direct = path.resolve(baseDir, cleanRel);
  const candidates = [
    direct,
    `${direct}.tsx`,
    `${direct}.ts`,
    `${direct}.jsx`,
    `${direct}.js`,
    path.join(direct, 'index.tsx'),
    path.join(direct, 'index.ts'),
    path.join(direct, 'index.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c;
    }
  }
  return null;
}

function rewriteImportsToJs(jsCode, fileDir) {
  let output = jsCode.replace(
    /^\s*import\s+['"][^'"]+\.css['"]\s*;?\s*$/gm,
    ''
  );

  const specRegex =
    /((?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"])(\.\.?\/[^'"]+)(['"])/g;

  output = output.replace(specRegex, (full, prefix, spec, suffix) => {
    const resolved = resolveSourceFile(fileDir, spec);
    if (resolved) {
      const rel = path
        .relative(fileDir, resolved)
        .split(path.sep)
        .join('/')
        .replace(/\.(tsx|ts|jsx)$/, '.js');
      const normalizedRel = rel.startsWith('.') ? rel : `./${rel}`;
      return `${prefix}${normalizedRel}${suffix}`;
    }
    return full;
  });

  return output;
}

function cleanAndEnsureDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function compileDirectory(srcDir, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const srcFull = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      count += compileDirectory(srcFull, path.join(outDir, entry.name));
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      const code = fs.readFileSync(srcFull, 'utf8');
      const result = ts.transpileModule(code, {
        fileName: srcFull,
        reportDiagnostics: true,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
          esModuleInterop: true,
        },
      });

      if (result.diagnostics && result.diagnostics.length > 0) {
        console.error(`Build error in ${srcFull}:`, result.diagnostics);
        process.exit(1);
      }

      const rewritten = rewriteImportsToJs(
        result.outputText,
        path.dirname(srcFull)
      );
      const outName = entry.name.replace(/\.(tsx|ts)$/, '.js');
      const outFull = path.join(outDir, outName);
      fs.writeFileSync(outFull, rewritten, 'utf8');
      count++;
    }
  }

  return count;
}

console.log('Building production bundle for deployment...');
cleanAndEnsureDir(DIST_DIR);

const compiledCount = compileDirectory(
  path.join(ROOT_DIR, 'src'),
  path.join(DIST_DIR, 'src')
);

const rawHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const rawCss = fs.readFileSync(
  path.join(ROOT_DIR, 'src', 'index.css'),
  'utf8'
);

const customCss = rawCss
  .replace(/@tailwind\s+\w+\s*;/g, '')
  .replace(/@layer\s+base\s*\{([\s\S]*?)\n\}/m, '$1');

fs.mkdirSync(path.join(DIST_DIR, 'assets'), { recursive: true });
fs.writeFileSync(
  path.join(DIST_DIR, 'assets', 'styles.css'),
  customCss.trim(),
  'utf8'
);

const headAssets = `
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Cairo', 'Tajawal', 'system-ui', '-apple-system', 'sans-serif'],
              cairo: ['Cairo', 'sans-serif'],
              tajawal: ['Tajawal', 'sans-serif'],
            },
            colors: {
              royal: {
                950: '#090E1A',
                900: '#0F172A',
                800: '#1E293B',
              },
              gold: {
                50: '#FFFBEB',
                100: '#FEF3C7',
                500: '#F59E0B',
                600: '#D97706',
                700: '#B45309',
                800: '#92400E',
              },
            },
          },
        },
      };
    </script>
    <link rel="stylesheet" href="./assets/styles.css" />
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@18.3.1",
          "react/": "https://esm.sh/react@18.3.1/",
          "react-dom": "https://esm.sh/react-dom@18.3.1?deps=react@18.3.1",
          "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1",
          "lucide-react": "https://esm.sh/lucide-react@0.468.0?deps=react@18.3.1",
          "qrcode.react": "https://esm.sh/qrcode.react@4.2.0?deps=react@18.3.1",
          "xlsx": "https://esm.sh/xlsx@0.18.5",
          "xlsx-js-style": "https://esm.sh/xlsx-js-style@1.2.0"
        }
      }
    </script>`;

const prodHtml = rawHtml
  .replace('</head>', `${headAssets}\n  </head>`)
  .replace('src="/src/main.tsx"', 'src="./src/main.js"');

fs.writeFileSync(path.join(DIST_DIR, 'index.html'), prodHtml, 'utf8');

console.log(`✓ ${compiledCount} modules transformed.`);
console.log('dist/index.html                  created');
console.log('dist/assets/styles.css           created');
console.log('dist/src/main.js                 created');
console.log('✓ built in production mode successfully.');
