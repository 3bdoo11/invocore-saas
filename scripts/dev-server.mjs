import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. If Vite is installed locally in node_modules, delegate directly to Vite
const localViteBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'vite');
if (fs.existsSync(localViteBin)) {
  const child = spawn(localViteBin, process.argv.slice(2), {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  startFallbackDevServer();
}

function startFallbackDevServer() {
  const require = createRequire(import.meta.url);
  const vscodeTsPath =
    '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/typescript.js';

  let ts = null;
  if (fs.existsSync(vscodeTsPath)) {
    ts = require(vscodeTsPath);
  }

  const PORT = Number(process.env.PORT) || 5173;

  function resolveLocalFile(baseDir, relPath) {
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

  function rewriteRelativeImports(jsCode, fileDir) {
    // Strip side-effect CSS imports like: import './index.css';
    let output = jsCode.replace(
      /^\s*import\s+['"][^'"]+\.css['"]\s*;?\s*$/gm,
      '// [css injected in head]'
    );

    // Rewrite relative imports/exports to include explicit file extension (.tsx / .ts)
    const specRegex =
      /((?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"])(\.\.?\/[^'"]+)(['"])/g;

    output = output.replace(specRegex, (full, prefix, spec, suffix) => {
      if (/\.(tsx|ts|jsx|js|mjs|json)$/.test(spec)) {
        return full;
      }
      const resolved = resolveLocalFile(fileDir, spec);
      if (resolved) {
        const relWithExt = path
          .relative(fileDir, resolved)
          .split(path.sep)
          .join('/');
        const normalizedRel = relWithExt.startsWith('.')
          ? relWithExt
          : `./${relWithExt}`;
        return `${prefix}${normalizedRel}${suffix}`;
      }
      return full;
    });

    return output;
  }

  function transpileTsxFile(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const fileDir = path.dirname(filePath);

    if (ts) {
      const result = ts.transpileModule(source, {
        fileName: filePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
          esModuleInterop: true,
        },
      });
      return rewriteRelativeImports(result.outputText, fileDir);
    }

    throw new Error('TypeScript compiler not found');
  }

  function buildIndexHtml() {
    const rawHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const rawCss = fs.readFileSync(
      path.join(ROOT_DIR, 'src', 'index.css'),
      'utf8'
    );

    // Strip @tailwind directives and @layer wrapper for direct browser <style> injection
    const customCss = rawCss
      .replace(/@tailwind\s+\w+\s*;/g, '')
      .replace(/@layer\s+base\s*\{([\s\S]*?)\n\}/m, '$1');

    const headInjection = `
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
    <style id="saqr-custom-styles">
${customCss}
    </style>
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

    return rawHtml.replace('</head>', `${headInjection}\n  </head>`);
  }

  const server = http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
      const pathname = decodeURIComponent(parsedUrl.pathname);

      // Serve SPA index.html for root
      if (pathname === '/' || pathname === '/index.html') {
        const html = buildIndexHtml();
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(html);
        return;
      }

      // Resolve file inside workspace
      const resolvedFile = resolveLocalFile(
        ROOT_DIR,
        pathname.replace(/^\/+/, '')
      );

      if (!resolvedFile || !resolvedFile.startsWith(ROOT_DIR)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Not Found: ${pathname}`);
        return;
      }

      if (/\.(tsx|ts|jsx|js)$/.test(resolvedFile)) {
        const js = transpileTsxFile(resolvedFile);
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(js);
        return;
      }

      if (resolvedFile.endsWith('.css')) {
        const css = fs.readFileSync(resolvedFile, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(css);
        return;
      }

      const content = fs.readFileSync(resolvedFile);
      res.writeHead(200, { 'Cache-Control': 'no-store' });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Server Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  ➜  SAQR TAX INVOICE ERP Server Ready');
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log('');
  });
}
