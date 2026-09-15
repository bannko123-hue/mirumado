#!/usr/bin/env node
/**
 * みるまど - dist/ をローカルで確認するための静的ファイルサーバ
 *
 *   node serve.mjs              http://127.0.0.1:4123/ で dist/ を配信
 *   node serve.mjs --port 8080  ポートを変える
 *   node serve.mjs --dir out    配信するディレクトリを変える
 *
 * 依存パッケージゼロ。Node 18 以上の標準ライブラリのみ。
 * ローカル確認専用で、127.0.0.1 にだけバインドします（外部公開用ではありません）。
 *
 * 注意: これは build.mjs の出力を見るためのものです。先に
 *   node build.mjs
 * を実行して dist/ を作ってから起動してください。
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function argValue(name, fallback) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(name);
  if (i !== -1 && argv[i + 1] !== undefined) return argv[i + 1];
  return fallback;
}

const PORT = Number(argValue('--port', 4123));
const DIST = path.resolve(ROOT, argValue('--dir', 'dist'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function mimeFor(p) {
  return MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
}

/** URL のパスを dist/ の中のファイルに解決する。dist/ の外には出さない。 */
function resolveFile(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  rel = rel.replace(/^\/+/, '');
  const full = path.resolve(DIST, rel);
  // ディレクトリトラバーサル対策
  if (full !== DIST && !full.startsWith(DIST + path.sep)) return null;

  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;

  const indexed = path.join(full, 'index.html');
  if (fs.existsSync(indexed) && fs.statSync(indexed).isFile()) return indexed;

  return null;
}

if (!fs.existsSync(DIST)) {
  console.error('');
  console.error(`配信するディレクトリがありません: ${path.relative(process.cwd(), DIST) || DIST}`);
  console.error('先に  node build.mjs  を実行してください。');
  console.error('');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || '/';
  const urlPath = rawUrl.split('?')[0].split('#')[0];

  const send = (status, body, type) => {
    res.writeHead(status, {
      'Content-Type': type,
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
    console.log(`${status} ${rawUrl}`);
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(405, 'Method Not Allowed', 'text/plain; charset=utf-8');
    return;
  }

  const file = resolveFile(urlPath);
  if (file) {
    send(200, fs.readFileSync(file), mimeFor(file));
    return;
  }

  const notFound = path.join(DIST, '404.html');
  if (fs.existsSync(notFound)) {
    send(404, fs.readFileSync(notFound), 'text/html; charset=utf-8');
  } else {
    send(404, 'Not Found', 'text/plain; charset=utf-8');
  }
});

server.on('error', (e) => {
  if (e && e.code === 'EADDRINUSE') {
    console.error('');
    console.error(`ポート ${PORT} は既に使われています。別のポートを指定してください:`);
    console.error(`  node serve.mjs --port ${PORT + 1}`);
    console.error('');
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`みるまど をローカル配信中: http://127.0.0.1:${PORT}/`);
  console.log('停止するには Ctrl+C');
});
