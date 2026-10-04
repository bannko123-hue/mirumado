#!/usr/bin/env node
/**
 * みるまど - 依存パッケージゼロの静的サイトジェネレータ
 *
 *   node build.mjs            本番ビルド（_ 始まりの記事は除外）
 *   node build.mjs --drafts   _ 始まりの下書き・サンプルも含めてビルド
 *   node build.mjs --check    ビルド後に内部リンク / JSON-LD / パンくずを検証
 *
 * Node 18 以上の標準ライブラリのみを使用。npm install は不要。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(ROOT, 'content');
const ARTICLES_DIR = path.join(CONTENT_DIR, 'articles');
const ASSETS_DIR = path.join(ROOT, 'assets');
const DIST = path.join(ROOT, 'dist');

const argv = process.argv.slice(2);
const INCLUDE_DRAFTS = argv.includes('--drafts');
const RUN_CHECK = argv.includes('--check');

/* ------------------------------------------------------------------ *
 * 小さなユーティリティ
 * ------------------------------------------------------------------ */

class BuildError extends Error {}

function fail(msg) {
  throw new BuildError(msg);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 属性値用（' も潰す） */
function attr(s) {
  return esc(s).replace(/'/g, '&#39;');
}

function xmlEsc(s) {
  return esc(s).replace(/'/g, '&apos;');
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function write(relPath, content) {
  const full = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

/** YYYY-MM-DD を検証して返す */
function normDate(value, file, field) {
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    fail(`${file}: フロントマターの ${field} は YYYY-MM-DD 形式で書いてください（現在の値: "${s}"）`);
  }
  const d = new Date(`${s}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) {
    fail(`${file}: フロントマターの ${field} が日付として解釈できません（現在の値: "${s}"）`);
  }
  return s;
}

function jpDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
}

/** RFC822（RSS 用）。JST 固定。 */
function rfc822(iso) {
  const d = new Date(`${iso}T09:00:00+09:00`);
  return d.toUTCString();
}

function isoDateTime(iso) {
  return `${iso}T09:00:00+09:00`;
}

/* ------------------------------------------------------------------ *
 * フロントマター（素朴な YAML サブセット）のパーサ
 *   - key: value                       … 文字列
 *   - key:  + 次行以降の "- value"      … 文字列の配列
 *   - key:  + 次行以降の "- k: v" 群     … オブジェクトの配列
 *   値の " または ' による囲みは外す。行コメントは行頭 # の行のみ
 *   （値の途中の # は本文の一部として残す）。
 * ------------------------------------------------------------------ */

function scalar(rawValue) {
  let v = String(rawValue).trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    return v.slice(1, -1);
  }
  // 値の途中の # はコメントとみなさない。
  // 行コメントは「行頭が #」の行だけ（parseYamlSubset 側で読み飛ばす）。
  //
  // 以前はここで /\s+#.*$/ を無条件に削っていたため、
  //   title: Jリーグ 第1節 # 第2節の見方
  // のような値が、エラーも警告も無く「Jリーグ 第1節」に切り詰められていた。
  // 値の中に # を書きたい場面（見出し・URL のフラグメント・広告タグ）が
  // 実際にあるので、値の途中の # はそのまま残す。
  return v;
}

const KEY_RE = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/;

function parseYamlSubset(lines, file) {
  const out = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    if (/^\s/.test(line)) {
      fail(`${file}: フロントマター ${i + 2} 行目のインデントが解釈できません → "${line}"`);
    }
    const m = KEY_RE.exec(line);
    if (!m) {
      fail(`${file}: フロントマター ${i + 2} 行目が "キー: 値" の形になっていません → "${line}"`);
    }
    const key = m[1];
    const rest = m[2];
    i++;

    if (rest !== '') {
      out[key] = scalar(rest);
      continue;
    }

    // ブロック（配列）
    const items = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        i++;
        continue;
      }
      const indent = l.length - l.trimStart().length;
      if (indent === 0) break;
      const t = l.trim();
      if (!t.startsWith('- ')) {
        fail(`${file}: フロントマター "${key}" 配下の ${i + 2} 行目は "- " で始めてください → "${l}"`);
      }
      const inner = t.slice(2).trim();
      const im = KEY_RE.exec(inner);
      if (im) {
        const obj = {};
        obj[im[1]] = scalar(im[2]);
        items.push(obj);
      } else {
        items.push(scalar(inner));
      }
      i++;

      // オブジェクト項目の続き（より深いインデントの "k: v"）
      while (i < lines.length) {
        const l2 = lines[i];
        if (!l2.trim()) {
          i++;
          continue;
        }
        const ind2 = l2.length - l2.trimStart().length;
        if (ind2 <= indent) break;
        const t2 = l2.trim();
        if (t2.startsWith('- ')) break;
        const cm = KEY_RE.exec(t2);
        if (!cm) {
          fail(`${file}: フロントマター "${key}" 配下の ${i + 2} 行目が解釈できません → "${l2}"`);
        }
        const last = items[items.length - 1];
        if (typeof last !== 'object' || last === null) {
          fail(`${file}: フロントマター "${key}" 配下の ${i + 2} 行目に対応する "- キー: 値" がありません`);
        }
        last[cm[1]] = scalar(cm[2]);
        i++;
      }
    }
    out[key] = items;
  }
  return out;
}

function parseFrontMatter(raw, file) {
  const text = raw.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== '---') {
    fail(`${file}: 1 行目が "---" ではありません。記事は "---" で囲んだフロントマターから始めてください`);
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    fail(`${file}: フロントマターを閉じる "---" が見つかりません`);
  }
  const data = parseYamlSubset(lines.slice(1, end), file);
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  return { data, body };
}

/* ------------------------------------------------------------------ *
 * Markdown（対応記法を限定した自前パーサ）
 *   ## / ### / #### 見出し、段落、- 箇条書き、1. 番号付き、
 *   | 区切りテーブル、> 引用、[text](url)、**太字**、
 *   ::ad{id=...}（行単独）、::source{n}
 * ------------------------------------------------------------------ */

function parseMarkdown(body, file) {
  const lines = body.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  let headingCount = 0;

  const isTableRow = (s) => s.includes('|') && s.trim() !== '';
  const isTableSep = (s) =>
    /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s) && s.includes('-');

  const splitRow = (s) => {
    let t = s.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map((c) => c.trim());
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // 広告プレースホルダ（行単独）
    const adLine = /^\s*::ad\{\s*id\s*=\s*([^}\s]+)\s*\}\s*$/.exec(line);
    if (adLine) {
      blocks.push({ type: 'ad', id: adLine[1] });
      i++;
      continue;
    }

    // 見出し
    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    if (h) {
      headingCount++;
      blocks.push({
        type: 'heading',
        level: h[1].length,
        text: h[2].trim(),
        id: `h-${headingCount}`,
      });
      i++;
      continue;
    }

    // テーブル
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', head, rows });
      continue;
    }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: buf.join('\n').trim() });
      continue;
    }

    // 箇条書き / 番号付き
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        const b = ordered ? /^\s*\d+[.)]\s+(.*)$/.exec(l) : /^\s*[-*]\s+(.*)$/.exec(l);
        if (!b) break;
        let itemText = b[1].trim();
        i++;
        // 続き行（インデントされた行）は同じ項目に連結
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+[.)])\s/.test(lines[i])) {
          itemText += ' ' + lines[i].trim();
          i++;
        }
        items.push(itemText);
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items });
      continue;
    }

    // 段落
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,4})\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*([-*]|\d+[.)])\s+/.test(lines[i]) &&
      !/^\s*::ad\{/.test(lines[i]) &&
      !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length) blocks.push({ type: 'p', text: buf.join('\n') });
    else i++; // 念のための安全弁
  }

  return blocks;
}

/* ------------------------------------------------------------------ *
 * インライン記法とブロックの HTML 化
 * ------------------------------------------------------------------ */

function isExternal(url, site) {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    return new URL(url).origin !== new URL(site.baseUrl).origin;
  } catch {
    return true;
  }
}

function renderInline(text, ctx) {
  if (/::ad\{/.test(text)) {
    fail(
      `${ctx.file}: ::ad{...} は必ず行を独立させて書いてください（前後を空行で挟む）。文中には置けません。\n  該当箇所: ${text.slice(0, 60)}`
    );
  }

  let out = esc(text);

  // [表示文字](URL)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    if (isExternal(url, ctx.site)) {
      ctx.stats.externalLinks++;
      return `<a href="${attr(url)}" rel="nofollow noopener" target="_blank">${label}</a>`;
    }
    return `<a href="${attr(url)}">${label}</a>`;
  });

  // ::source{n}
  out = out.replace(/::source\{\s*(\d+)\s*\}/g, (_m, nStr) => {
    const n = Number(nStr);
    if (!ctx.sources.length) {
      fail(`${ctx.file}: ::source{${n}} が使われていますが、フロントマターに sources がありません`);
    }
    if (n < 1 || n > ctx.sources.length) {
      fail(
        `${ctx.file}: ::source{${n}} は範囲外です（sources は ${ctx.sources.length} 件。1〜${ctx.sources.length} を指定してください）`
      );
    }
    ctx.usedSources.add(n);
    return `<sup class="src-ref"><a href="#source-${n}" aria-label="出典${n}">[${n}]</a></sup>`;
  });

  // **太字**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 改行は半角スペース相当（日本語は詰める）
  out = out.replace(/\n/g, '\n');

  return out;
}

function renderAdSlot(slotId, ctx) {
  const slot = ctx.adSlots.find((s) => s.id === slotId);
  if (!slot) {
    const known = ctx.adSlots.map((s) => s.id).join(', ') || '（未定義）';
    fail(
      `${ctx.file}: ::ad{id=${slotId}} に対応する ad_slots が見つかりません。フロントマターの ad_slots に id: ${slotId} を追加してください（現在定義済み: ${known}）`
    );
  }
  ctx.usedAdSlots.add(slotId);
  ctx.stats.adSlots++;

  // program が未設定でも本文には出ない（--drafts のプレースホルダと HTML コメントにだけ使う）。
  // ここは「埋めるべき空欄」ではなくコードの既定値なので 【要記入】 は使わない。
  const program = slot.program || '（案件名の記載なし）';
  const note = slot.note || '';

  // --- (1) ASP のタグが入っている枠：タグをそのまま（エスケープせずに）出す ---
  // A8.net の禁止事項に「広告素材の改変」があるため、html の中身は
  // 一字も加工しない。ラベル（広告表記）だけを添えて出力する。
  if (slot.html) {
    ctx.stats.adSlotsFilled++;
    return [
      `<!-- AD SLOT: ${slotId} / ${program} -->`,
      `<aside class="ad-unit" id="${attr(slotId)}" data-ad-slot="${attr(slotId)}" aria-label="広告">`,
      `  <p class="ad-unit__label">広告</p>`,
      `  <div class="ad-unit__body">${slot.html}</div>`,
      `</aside>`,
      `<!-- /AD SLOT: ${slotId} -->`,
    ].join('\n');
  }

  // --- (2) タグ未挿入の枠 ---
  ctx.stats.adSlotsPending.push({ file: ctx.file, id: slotId, program });

  // 本番ビルドでは何も出力しない。読者に「未挿入」の文言を見せないだけでなく、
  // HTML コメントとしても案件名を残さない（ページソースから提携状況が読めてしまうため）。
  // 貼り忘れは --check の警告で拾う。
  if (!INCLUDE_DRAFTS) {
    return '';
  }

  // --drafts のときだけ、貼り忘れが目に飛び込む開発用プレースホルダを出す。
  return [
    `<!-- AD SLOT: ${slotId} / ${program} -->`,
    `<aside class="ad-slot" id="${attr(slotId)}" data-ad-slot="${attr(slotId)}">`,
    `  <p class="ad-slot__label"><span class="ad-slot__badge">広告枠</span><code>${esc(slotId)}</code></p>`,
    `  <p class="ad-slot__program">${esc(program)}</p>`,
    note ? `  <p class="ad-slot__note">差し込む位置: ${esc(note)}</p>` : '',
    `  <p class="ad-slot__todo">ここにアフィリエイトタグを貼り付けてください（未挿入）</p>`,
    `</aside>`,
    `<!-- /AD SLOT: ${slotId} -->`,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderBlocks(blocks, ctx) {
  const html = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        html.push(
          `<h${b.level} id="${attr(b.id)}">${renderInline(b.text, ctx)}</h${b.level}>`
        );
        break;
      case 'p':
        html.push(`<p>${renderInline(b.text, ctx)}</p>`);
        break;
      case 'ul':
        html.push(
          `<ul>\n${b.items.map((it) => `  <li>${renderInline(it, ctx)}</li>`).join('\n')}\n</ul>`
        );
        break;
      case 'ol':
        html.push(
          `<ol>\n${b.items.map((it) => `  <li>${renderInline(it, ctx)}</li>`).join('\n')}\n</ol>`
        );
        break;
      case 'quote':
        html.push(`<blockquote><p>${renderInline(b.text, ctx)}</p></blockquote>`);
        break;
      case 'table': {
        const thead = `<tr>${b.head.map((c) => `<th scope="col">${renderInline(c, ctx)}</th>`).join('')}</tr>`;
        const tbody = b.rows
          .map(
            (r) =>
              `<tr>${r
                .map((c, idx) =>
                  idx === 0
                    ? `<th scope="row">${renderInline(c, ctx)}</th>`
                    : `<td>${renderInline(c, ctx)}</td>`
                )
                .join('')}</tr>`
          )
          .join('\n      ');
        html.push(
          `<div class="table-wrap" role="region" tabindex="0" aria-label="表">\n  <table>\n    <thead>${thead}</thead>\n    <tbody>\n      ${tbody}\n    </tbody>\n  </table>\n</div>`
        );
        break;
      }
      case 'ad': {
        // タグ未挿入の枠は本番ビルドで空文字を返す。空の要素を混ぜない。
        const adHtml = renderAdSlot(b.id, ctx);
        if (adHtml) html.push(adHtml);
        break;
      }
      default:
        break;
    }
  }
  return html.join('\n\n');
}

/** ブロックからプレーンテキスト（検索インデックス用） */
function blocksToPlainText(blocks) {
  const parts = [];
  for (const b of blocks) {
    if (b.type === 'p' || b.type === 'quote') parts.push(b.text);
    else if (b.type === 'heading') parts.push(b.text);
    else if (b.type === 'ul' || b.type === 'ol') parts.push(b.items.join(' '));
    else if (b.type === 'table') parts.push([...b.head, ...b.rows.flat()].join(' '));
  }
  return parts
    .join(' ')
    .replace(/::ad\{[^}]*\}/g, '')
    .replace(/::source\{\d+\}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** インライン記法を落として素のテキストにする（目次のラベル用） */
function plainInline(s) {
  return String(s)
    .replace(/::source\{\d+\}/g, '')
    .replace(/::ad\{[^}]*\}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 目次（h2 / h3） */
function buildToc(blocks) {
  const toc = [];
  for (const b of blocks) {
    if (b.type !== 'heading') continue;
    if (b.level === 2) toc.push({ id: b.id, text: plainInline(b.text), children: [] });
    else if (b.level === 3 && toc.length) {
      toc[toc.length - 1].children.push({ id: b.id, text: plainInline(b.text) });
    }
  }
  return toc;
}

/** 「## よくある質問」配下の「### 質問」＋直後の段落から FAQ を抽出 */
function extractFaq(blocks) {
  const faq = [];
  let inFaq = false;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === 'heading' && b.level === 2) {
      inFaq = /よくある質問|Q&A|FAQ/i.test(b.text);
      continue;
    }
    if (!inFaq) continue;
    if (b.type === 'heading' && b.level === 3) {
      // 直後の最初の段落を答えとする
      for (let j = i + 1; j < blocks.length; j++) {
        const nb = blocks[j];
        if (nb.type === 'heading') break;
        if (nb.type === 'p') {
          faq.push({ q: b.text, a: nb.text });
          break;
        }
        if (nb.type === 'ul' || nb.type === 'ol') {
          faq.push({ q: b.text, a: nb.items.join(' / ') });
          break;
        }
      }
    }
  }
  return faq.map((f) => ({ q: plainInline(f.q), a: plainInline(f.a) }));
}

/* ------------------------------------------------------------------ *
 * サイト設定と記事の読み込み・検証
 * ------------------------------------------------------------------ */

const REQUIRED_FIELDS = [
  'title',
  'description',
  'category',
  'role',
  'target_keyword',
  'search_intent',
  'published',
  'updated',
];
const VALID_ROLES = ['entry', 'hub', 'conversion'];

// トップページの表示件数（未指定なら既定値）。1 以上の整数のみ受け付ける。
function homeCount(value, fallback, key) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    fail(`content/site.json: "${key}" は 1 以上の整数にしてください（現在: ${JSON.stringify(value)}）`);
  }
  return n;
}

function loadSite() {
  const p = path.join(CONTENT_DIR, 'site.json');
  if (!fs.existsSync(p)) fail(`content/site.json が見つかりません（${p}）`);
  let site;
  try {
    site = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`content/site.json が JSON として読めません: ${e.message}`);
  }
  for (const key of ['name', 'baseUrl', 'categories']) {
    if (!site[key]) fail(`content/site.json: "${key}" が必要です`);
  }
  site.baseUrl = String(site.baseUrl).replace(/\/+$/, '');
  if (!Array.isArray(site.categories) || site.categories.length === 0) {
    fail('content/site.json: categories は 1 件以上の配列にしてください');
  }
  for (const c of site.categories) {
    if (!c.slug || !c.name) fail('content/site.json: categories の各要素には slug と name が必要です');
  }
  site.entryPoints = site.entryPoints || [];
  site.nav = site.nav || [];
  site.homeLatestCount = homeCount(site.homeLatestCount, 12, 'homeLatestCount');
  site.homeUpdatedCount = homeCount(site.homeUpdatedCount, 8, 'homeUpdatedCount');
  site.adDisclosure = site.adDisclosure || '本記事にはアフィリエイト広告（プロモーション）が含まれます。';

  // --- /about/ ・ /policy/ の表記に使う値 ---------------------------------
  // 本人にしか書けないもの（contactEmail・運営者名・所在地）は
  // 【要記入】 のまま残してある。content/site.json の _memo_* を参照。
  site.siteStarted = site.siteStarted || '【要記入】';
  site.policyEstablished = site.policyEstablished || '【要記入】';
  site.policyUpdated = site.policyUpdated || site.policyEstablished || '【要記入】';
  // 未導入なら空文字。空のあいだは /policy/ が「導入していない」と表示する。
  site.analyticsTool = String(site.analyticsTool || '').trim();
  // 提携が承認され、実際に広告を掲載している ASP だけを aspApproved に入れる。
  site.aspApplied = Array.isArray(site.aspApplied) ? site.aspApplied : [];
  site.aspApproved = Array.isArray(site.aspApproved) ? site.aspApproved : [];

  return site;
}

function loadArticles(site, stats) {
  if (!fs.existsSync(ARTICLES_DIR)) fail(`content/articles/ が見つかりません（${ARTICLES_DIR}）`);
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => (INCLUDE_DRAFTS ? true : !f.startsWith('_')))
    .sort();

  const bySlug = new Map();
  const articles = [];

  for (const fname of files) {
    const rel = `content/articles/${fname}`;
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, fname), 'utf8');
    const { data, body } = parseFrontMatter(raw, rel);

    const missing = REQUIRED_FIELDS.filter(
      (k) => data[k] === undefined || String(data[k]).trim() === ''
    );
    if (missing.length) {
      fail(
        `${rel}: フロントマターの必須項目が足りません → ${missing.join(', ')}\n` +
          `  必須項目: ${REQUIRED_FIELDS.join(', ')}`
      );
    }
    for (const k of REQUIRED_FIELDS) {
      if (typeof data[k] !== 'string') {
        fail(`${rel}: フロントマターの ${k} は 1 行の文字列で書いてください`);
      }
    }
    if (!VALID_ROLES.includes(data.role)) {
      fail(`${rel}: role は ${VALID_ROLES.join(' / ')} のいずれかにしてください（現在の値: "${data.role}"）`);
    }
    const category = site.categories.find((c) => c.name === data.category || c.slug === data.category);
    if (!category) {
      fail(
        `${rel}: category "${data.category}" は content/site.json に定義されていません。\n` +
          `  使えるカテゴリ: ${site.categories.map((c) => c.name).join(' / ')}`
      );
    }
    const published = normDate(data.published, rel, 'published');
    const updated = normDate(data.updated, rel, 'updated');
    if (updated < published) {
      fail(`${rel}: updated (${updated}) が published (${published}) より前になっています`);
    }

    // sources
    const sources = [];
    if (data.sources !== undefined) {
      if (!Array.isArray(data.sources)) fail(`${rel}: sources は "- label: ..." の配列で書いてください`);
      data.sources.forEach((s, idx) => {
        if (typeof s !== 'object' || !s.label || !s.url) {
          fail(`${rel}: sources[${idx + 1}] には label と url の両方が必要です`);
        }
        if (!/^https?:\/\//i.test(s.url)) {
          fail(`${rel}: sources[${idx + 1}] の url は http(s):// から始まる URL にしてください（現在の値: "${s.url}"）`);
        }
        sources.push({ label: String(s.label), url: String(s.url), note: s.note ? String(s.note) : '' });
      });
    }

    // ad_slots
    const adSlots = [];
    if (data.ad_slots !== undefined) {
      if (!Array.isArray(data.ad_slots)) fail(`${rel}: ad_slots は "- id: ..." の配列で書いてください`);
      data.ad_slots.forEach((s, idx) => {
        if (typeof s !== 'object' || !s.id) {
          fail(`${rel}: ad_slots[${idx + 1}] には id が必要です`);
        }
        if (adSlots.some((x) => x.id === s.id)) {
          fail(`${rel}: ad_slots の id "${s.id}" が重複しています`);
        }
        adSlots.push({
          id: String(s.id),
          program: s.program ? String(s.program) : '',
          note: s.note ? String(s.note) : '',
          // ASP から取得したリンクタグ。エスケープせずそのまま出力するため、
          // 値は一字も加工しない（トリムはパーサ側の引用符外しのみ）。
          html: s.html ? String(s.html) : '',
        });
      });
    }

    const slug = fname.replace(/\.md$/, '').replace(/^_+/, '');
    if (!slug) fail(`${rel}: ファイル名からスラッグを作れません`);
    if (bySlug.has(slug)) {
      fail(`スラッグ "${slug}" が重複しています（${bySlug.get(slug)} と ${rel}）`);
    }
    bySlug.set(slug, rel);

    const blocks = parseMarkdown(body, rel);
    if (blocks.length === 0) fail(`${rel}: 本文が空です`);

    const ctx = {
      file: rel,
      site,
      sources,
      adSlots,
      usedSources: new Set(),
      usedAdSlots: new Set(),
      stats,
    };
    const contentHtml = renderBlocks(blocks, ctx);

    for (const s of adSlots) {
      if (!ctx.usedAdSlots.has(s.id)) {
        console.warn(
          `  [警告] ${rel}: ad_slots に "${s.id}" がありますが、本文に ::ad{id=${s.id}} がありません`
        );
      }
    }

    stats.sources += sources.length;

    articles.push({
      file: rel,
      slug,
      draft: fname.startsWith('_'),
      title: data.title,
      description: data.description,
      category,
      role: data.role,
      targetKeyword: data.target_keyword,
      searchIntent: data.search_intent,
      published,
      updated,
      sources,
      adSlots,
      blocks,
      contentHtml,
      toc: buildToc(blocks),
      faq: extractFaq(blocks),
      plainText: blocksToPlainText(blocks),
      url: `/${category.slug}/${slug}/`,
    });
  }

  return articles;
}

/* ------------------------------------------------------------------ *
 * 共通レイアウト
 * ------------------------------------------------------------------ */

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M10 8.5l6 3.5-6 3.5z" class="fg"/></svg>',
  compare:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M7.5 9.5h9M7.5 14.5h9" class="stroke"/><path d="M10 7l-3 2.5 3 2.5M14 12l3 2.5-3 2.5" class="stroke"/></svg>',
  free: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M9 8h6M9 12h5M12 8v9" class="stroke"/></svg>',
  replay:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M16 12a4 4 0 1 1-1.6-3.2" class="stroke"/><path d="M16.4 6.2v2.9h-2.9" class="stroke"/></svg>',
  dot: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3.5" class="fg"/></svg>',
};

function icon(name) {
  return `<span class="icon">${ICONS[name] || ICONS.dot}</span>`;
}

// カテゴリごとの見た目（バナー画像・テーマ色・ナビ用の小アイコン）。
// 画像は assets/cat-<slug>.svg（オリジナルのイラスト。他社ロゴ・写真は使わない）。
const CAT_THEME = {
  soccer: { color: '#12a565', glyph: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.2l3.2 2.3-1.2 3.7h-4l-1.2-3.7z"/>' },
  baseball: { color: '#e5532e', glyph: '<circle cx="12" cy="12" r="8.5"/><path d="M7.2 6.2q3 5.8 0 11.6M16.8 6.2q-3 5.8 0 11.6"/>' },
  fighting: { color: '#7c4dff', glyph: '<path d="M6.5 10.5q0-5 5-5h2.5q4.5 0 4.5 5v2q0 3-3 3.5H9.5q-3-.5-3-3.5z"/><path d="M8.5 16h7v3.5h-7z"/>' },
  entertainment: { color: '#e0418f', glyph: '<path d="M9.5 17.5V6.5l9-2v11"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="16.5" cy="15.5" r="2"/>' },
  compare: { color: '#3b6cff', glyph: '<rect x="3.5" y="5.5" width="7" height="13" rx="1.5"/><rect x="13.5" y="5.5" width="7" height="13" rx="1.5"/><path d="M15.5 12l1.5 1.5 2.5-3"/>' },
};
function catTheme(slug) {
  return CAT_THEME[slug] || { color: '#3b6cff', glyph: '<circle cx="12" cy="12" r="8.5"/>' };
}
function catGlyph(slug) {
  return `<svg class="catglyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${catTheme(slug).glyph}</svg>`;
}
function catImage(slug) {
  return CAT_THEME[slug] ? `/assets/cat-${slug}.svg` : '/assets/cat-compare.svg';
}

function absUrl(site, p) {
  return `${site.baseUrl}${p}`;
}

function header(site, current = '') {
  const cats = site.categories
    .map(
      (c) =>
        `<a class="catbar__item" href="/${c.slug}/" style="--cat:${catTheme(c.slug).color}"${
          current === c.slug ? ' aria-current="page"' : ''
        }>${catGlyph(c.slug)}<span>${esc(c.name)}</span></a>`
    )
    .join('\n        ');
  return `<header class="site-header" data-header>
  <div class="wrap wrap--wide site-header__bar">
    <a class="brand" href="/">
      <img class="brand__logo" src="/assets/logo.svg" width="36" height="36" alt="">
      <span class="brand__text"><span class="brand__name">${esc(site.name)}</span><span class="brand__sub">試合・番組の「どこで見る？」がわかる</span></span>
    </a>
    <form class="searchbox" action="/search/" method="get" role="search">
      <label class="visually-hidden" for="q">サイト内検索</label>
      <svg class="searchbox__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg>
      <input type="search" id="q" name="q" placeholder="例: Jリーグ 配信" autocomplete="off">
      <button type="submit">検索</button>
    </form>
  </div>
  <nav class="catbar" aria-label="カテゴリ">
    <div class="wrap wrap--wide catbar__inner">
      <a class="catbar__item catbar__item--home" href="/"${current === 'home' ? ' aria-current="page"' : ''}><svg class="catglyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5"/></svg><span>ホーム</span></a>
        ${cats}
    </div>
  </nav>
  <div class="progress" aria-hidden="true"><span class="progress__bar"></span></div>
</header>`;
}

function footer(site) {
  const cats = site.categories
    .map((c) => `<li><a href="/${c.slug}/">${esc(c.name)}</a></li>`)
    .join('\n          ');
  const pages = site.nav
    .map((n) => `<li><a href="${attr(n.href)}">${esc(n.label)}</a></li>`)
    .join('\n          ');
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
  <div class="wrap wrap--wide">
    <div class="site-footer__brand">
      <a class="brand brand--footer" href="/"><img class="brand__logo" src="/assets/logo.svg" width="32" height="32" alt=""><span class="brand__text"><span class="brand__name">${esc(site.name)}</span></span></a>
      <p>${esc(site.tagline || '')}</p>
    </div>
    <p class="site-footer__disclosure">${esc(site.adDisclosure)}表示している料金・配信予定は各サービスの公式ページで確認した時点の情報です。最新の内容は必ず公式サイトでご確認ください。</p>
    <div class="site-footer__cols">
      <nav aria-label="カテゴリ一覧">
        <h2>カテゴリ</h2>
        <ul>
          ${cats}
        </ul>
      </nav>
      <nav aria-label="サイト情報">
        <h2>このサイトについて</h2>
        <ul>
          ${pages}
          <li><a href="/search/">サイト内検索</a></li>
          <li><a href="/feed.xml">RSS</a></li>
        </ul>
      </nav>
    </div>
    <p class="site-footer__copy">&copy; ${year} ${esc(site.name)}</p>
  </div>
</footer>`;
}

function jsonLdScript(obj) {
  // </script> の混入を避ける
  const json = JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

function layout(site, opts) {
  const {
    title,
    description,
    url,
    main,
    ogType = 'website',
    jsonLd = [],
    bodyClass = '',
    extraHead = '',
    scripts = '',
    current = '',
  } = opts;
  const fullTitle = opts.rawTitle ? title : `${title} | ${site.name}`;
  const canonical = absUrl(site, url);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${attr(canonical)}">
<meta property="og:title" content="${attr(fullTitle)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:type" content="${attr(ogType)}">
<meta property="og:url" content="${attr(canonical)}">
<meta property="og:site_name" content="${attr(site.name)}">
<meta property="og:locale" content="${attr(site.locale || 'ja_JP')}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${attr(fullTitle)}">
<meta name="twitter:description" content="${attr(description)}">
<link rel="alternate" type="application/rss+xml" title="${attr(site.name)} の新着記事" href="/feed.xml">
<meta name="theme-color" content="#3b6cff">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
<script>document.documentElement.classList.add('js')</script>
${extraHead}${jsonLd.map(jsonLdScript).join('\n')}
</head>
<body${bodyClass ? ` class="${attr(bodyClass)}"` : ''}>
<a class="skip-link" href="#main">本文へスキップ</a>
${header(site, current)}
<main id="main">
${main}
</main>
${footer(site)}
<a class="to-top" href="#main" aria-label="ページの先頭へ戻る"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 14l6-6 6 6"/></svg></a>
<script src="/assets/site.js" defer></script>
${scripts}
</body>
</html>
`;
}

function breadcrumb(items) {
  // items: [{label, href}] 最後の要素は現在地（href なし）
  const li = items
    .map((it, idx) => {
      const isLast = idx === items.length - 1;
      const inner = isLast || !it.href
        ? `<span aria-current="page">${esc(it.label)}</span>`
        : `<a href="${attr(it.href)}">${esc(it.label)}</a>`;
      return `    <li>${inner}</li>`;
    })
    .join('\n');
  return `<nav class="breadcrumb" aria-label="パンくずリスト">\n  <ol>\n${li}\n  </ol>\n</nav>`;
}

function breadcrumbJsonLd(site, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.label,
      item: absUrl(site, it.href),
    })),
  };
}

function articleCard(a, opts = {}) {
  const dateLabel = opts.showUpdated === false ? '' :
    `<p class="card__meta"><time datetime="${attr(a.updated)}">${jpDate(a.updated)}</time> 更新</p>`;
  return `<li class="card reveal${opts.featured ? ' card--featured' : ''}" style="--cat:${catTheme(a.category.slug).color}">
  <a class="card__thumb" href="${attr(a.url)}" tabindex="-1" aria-hidden="true"><img src="${catImage(a.category.slug)}" alt="" loading="lazy" width="640" height="320"></a>
  <div class="card__body">
    <p class="card__cat"><a href="/${a.category.slug}/">${catGlyph(a.category.slug)}${esc(a.category.name)}</a></p>
    <h3 class="card__title"><a href="${attr(a.url)}">${esc(a.title)}</a></h3>
    <p class="card__desc">${esc(a.description)}</p>
    ${dateLabel}
  </div>
</li>`;
}

/* ------------------------------------------------------------------ *
 * 各ページの生成
 * ------------------------------------------------------------------ */

function buildHome(site, articles) {
  const byPublished = [...articles].sort((a, b) => (a.published < b.published ? 1 : -1));
  const byUpdated = [...articles].sort((a, b) => (a.updated < b.updated ? 1 : -1));

  const entryPoints = site.entryPoints
    .map(
      (e) => `<li class="entry-point reveal">
  <a href="${attr(e.href)}">
    ${icon(e.icon)}
    <span class="entry-point__label">${esc(e.label)}</span>
    <span class="entry-point__note">${esc(e.note || '')}</span>
    <span class="entry-point__arrow" aria-hidden="true">→</span>
  </a>
</li>`
    )
    .join('\n');

  const cats = site.categories
    .map((c) => {
      const n = articles.filter((a) => a.category.slug === c.slug).length;
      return `<li class="cat-card reveal" style="--cat:${catTheme(c.slug).color}">
  <a href="/${c.slug}/">
    <span class="cat-card__img"><img src="${catImage(c.slug)}" alt="" loading="lazy" width="640" height="320"></span>
    <span class="cat-card__body">
      <span class="cat-card__name">${catGlyph(c.slug)}${esc(c.name)}</span>
      <span class="cat-card__desc">${esc(c.description || '')}</span>
      <span class="cat-card__count">${n} 記事 →</span>
    </span>
  </a>
</li>`;
    })
    .join('\n');

  // ヒーロー下に流す「扱っているサービス」。記事本文に実際に出てくる名前だけを出す。
  const SERVICE_CANDIDATES = ['DAZN', 'U-NEXT', 'ABEMA', 'Hulu', 'WOWOW', 'スカパー！', 'J SPORTS', 'パ・リーグTV', 'Lemino', 'TVer', 'DMM TV', 'Amazon Prime Video', 'Netflix', 'NHKプラス'];
  const corpus = articles.map((a) => `${a.title} ${a.description} ${a.plainText}`).join(' ');
  const services = SERVICE_CANDIDATES.filter((s) => corpus.includes(s));
  const chips = services
    .map((s) => `<a class="chip" href="/search/?q=${encodeURIComponent(s)}">${esc(s)}</a>`)
    .join('');
  const marquee = services.length
    ? `<div class="marquee" aria-label="このサイトで扱っている配信サービス">
  <div class="marquee__track">${chips}<span class="marquee__dup" aria-hidden="true">${chips.replace(/<a /g, '<a tabindex="-1" ')}</span></div>
</div>`
    : '';

  const [first, ...rest] = byPublished.slice(0, site.homeLatestCount);
  const latest = first
    ? [articleCard(first, { featured: true }), ...rest.map((a) => articleCard(a))].join('\n')
    : '';
  const updated = byUpdated.slice(0, site.homeUpdatedCount).map((a) => articleCard(a)).join('\n');

  const main = `<section class="hero">
  <div class="hero__bg" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="wrap wrap--wide hero__inner">
    <div class="hero__text">
      <p class="hero__eyebrow"><span class="hero__dot" aria-hidden="true"></span>スポーツ・エンタメの配信ガイド</p>
      <h1 class="hero__title">その試合、<br><span class="hero__accent">どこで見られる？</span></h1>
      <p class="hero__tagline">${esc(site.tagline || site.description || '')}</p>
      <div class="hero__cta">
        <a class="btn btn--primary" href="/compare/">配信サービスを比べる<span aria-hidden="true">→</span></a>
        <a class="btn btn--ghost" href="/search/?q=無料">無料で見る方法</a>
      </div>
      <ul class="hero__stats">
        <li><strong>${articles.length}</strong><span>本の視聴ガイド</span></li>
        <li><strong>${site.categories.length}</strong><span>ジャンル</span></li>
        <li><strong>公式</strong><span>ページで確認</span></li>
      </ul>
      <p class="hero__note">${esc(site.adDisclosure)}</p>
    </div>
    <div class="hero__art">
      <img src="/assets/hero.svg" alt="" width="560" height="440">
    </div>
  </div>
  ${marquee}
</section>

<section class="section">
  <div class="wrap wrap--wide">
    <div class="section__head">
      <p class="section__eyebrow">FIND</p>
      <h2>目的から探す</h2>
    </div>
    <ul class="entry-points">
${entryPoints}
    </ul>
  </div>
</section>

<section class="section">
  <div class="wrap wrap--wide">
    <div class="section__head">
      <p class="section__eyebrow">CATEGORY</p>
      <h2>ジャンルから探す</h2>
    </div>
    <ul class="cat-cards">
${cats}
    </ul>
  </div>
</section>

<section class="section section--steps">
  <div class="wrap wrap--wide">
    <div class="section__head">
      <p class="section__eyebrow">HOW TO</p>
      <h2>迷ったら、この3ステップ</h2>
    </div>
    <ol class="steps">
      <li class="step reveal"><span class="step__num">1</span><h3>見たいものを決める</h3><p>試合・大会・番組を決めて、ジャンルのページを開きます。</p></li>
      <li class="step reveal"><span class="step__num">2</span><h3>配信先を確かめる</h3><p>記事の比較表で、どのサービスなら見られるか・料金の違いを確認します。</p></li>
      <li class="step reveal"><span class="step__num">3</span><h3>公式で条件を見て申し込む</h3><p>無料期間や支払い方法は変わることがあるので、最後は公式サイトで確認します。</p></li>
    </ol>
    <p class="steps__cta"><a class="btn btn--primary" href="/compare/">まずはサービス比較から<span aria-hidden="true">→</span></a></p>
  </div>
</section>

<section class="section">
  <div class="wrap wrap--wide">
    <div class="section__head">
      <p class="section__eyebrow">NEW</p>
      <h2>新着記事</h2>
    </div>
    ${latest ? `<ul class="cards cards--grid">\n${latest}\n</ul>` : '<p class="empty">まだ記事がありません。</p>'}
  </div>
</section>

<section class="section">
  <div class="wrap wrap--wide">
    <div class="section__head">
      <p class="section__eyebrow">UPDATED</p>
      <h2>最近更新した記事</h2>
    </div>
    ${updated ? `<ul class="cards cards--rail">\n${updated}\n</ul>` : '<p class="empty">まだ記事がありません。</p>'}
  </div>
</section>

<section class="section">
  <div class="wrap wrap--wide">
    <ul class="trust">
      <li class="reveal"><strong>公式ページで確認</strong><span>料金・配信予定は各サービスの公式ページで確かめた内容だけを載せています。</span></li>
      <li class="reveal"><strong>確認日と出典を明記</strong><span>記事ごとに最終更新日と、確認した公式ページへのリンクを付けています。</span></li>
      <li class="reveal"><strong>広告は広告と表示</strong><span>アフィリエイト広告を含む記事には、そのことを明記しています。</span></li>
    </ul>
  </div>
</section>`;

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: `${site.baseUrl}/`,
    description: site.description || site.tagline || '',
    inLanguage: 'ja',
    publisher: { '@type': 'Organization', name: site.publisher || site.name, url: `${site.baseUrl}/` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site.baseUrl}/search/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return layout(site, {
    title: `${site.name} | ${site.tagline || 'ライブ配信・見逃し配信の視聴方法'}`,
    rawTitle: true,
    description: site.description || site.tagline || '',
    url: '/',
    main,
    jsonLd: [websiteLd],
    bodyClass: 'page-home',
    current: 'home',
  });
}

function buildArticle(site, a, all) {
  const crumbs = [
    { label: 'ホーム', href: '/' },
    { label: a.category.name, href: `/${a.category.slug}/` },
    { label: a.title, href: a.url },
  ];

  const tocHtml = a.toc.length
    ? `<nav class="toc" aria-labelledby="toc-title">
  <h2 id="toc-title">目次</h2>
  <ol>
${a.toc
  .map(
    (t) =>
      `    <li><a href="#${attr(t.id)}">${esc(t.text)}</a>${
        t.children.length
          ? `\n      <ol>\n${t.children
              .map((c) => `        <li><a href="#${attr(c.id)}">${esc(c.text)}</a></li>`)
              .join('\n')}\n      </ol>\n    `
          : ''
      }</li>`
  )
  .join('\n')}
  </ol>
</nav>`
    : '';

  const sourcesHtml = a.sources.length
    ? `<section class="sources" aria-labelledby="sources-title">
  <h2 id="sources-title">出典</h2>
  <ol class="sources__list">
${a.sources
  .map(
    (s, i) =>
      `    <li id="source-${i + 1}"><a href="${attr(s.url)}" rel="nofollow noopener" target="_blank">${esc(
        s.label
      )}</a>${s.note ? ` <span class="sources__note">${esc(s.note)}</span>` : ''}</li>`
  )
  .join('\n')}
  </ol>
  <p class="fact-check">この記事の情報は ${esc(a.updated)} 時点の公式ページで確認したものです。料金やラインナップは変更される場合があるため、申し込み前に必ず公式サイトをご確認ください。</p>
</section>`
    : `<section class="sources">
  <p class="fact-check">この記事の情報は ${esc(a.updated)} 時点の公式ページで確認したものです。料金やラインナップは変更される場合があるため、申し込み前に必ず公式サイトをご確認ください。</p>
</section>`;

  const related = all
    .filter((x) => x.category.slug === a.category.slug && x.slug !== a.slug)
    .sort((x, y) => (x.updated < y.updated ? 1 : -1))
    .slice(0, 4);

  const relatedHtml = related.length
    ? `<section class="related" aria-labelledby="related-title">
  <h2 id="related-title">${esc(a.category.name)}の関連記事</h2>
  <ul class="cards">
${related.map((r) => articleCard(r)).join('\n')}
  </ul>
</section>`
    : '';

  const isUpdated = a.updated !== a.published;

  const main = `<div class="article-banner" style="--cat:${catTheme(a.category.slug).color}" aria-hidden="true"><img src="${catImage(a.category.slug)}" alt="" width="640" height="320"></div>
<div class="wrap">
${breadcrumb(crumbs)}

<article class="article">
  <header class="article__header">
    <p class="article__cat" style="--cat:${catTheme(a.category.slug).color}"><a href="/${a.category.slug}/">${catGlyph(a.category.slug)}${esc(a.category.name)}</a></p>
    <h1>${esc(a.title)}</h1>
    <p class="article__lead">${esc(a.description)}</p>
    <div class="article__dates">
      <p class="article__updated"><span class="article__updated-label">最終更新</span> <time datetime="${attr(
        a.updated
      )}">${jpDate(a.updated)}</time>${isUpdated ? '' : '<span class="article__fresh">公開したばかり</span>'}</p>
      <p class="article__published">公開 <time datetime="${attr(a.published)}">${jpDate(a.published)}</time></p>
    </div>
    <p class="pr-label">${esc(site.adDisclosure)}</p>
  </header>

${tocHtml}

  <div class="article__body">
${a.contentHtml}
  </div>

${sourcesHtml}
</article>

<aside class="next-cta reveal" aria-label="次に読む">
  <img src="/assets/cat-compare.svg" alt="" width="640" height="320" loading="lazy">
  <div>
    <p class="next-cta__eyebrow">どれにするか迷ったら</p>
    <p class="next-cta__title">配信サービスを料金・見られる競技で比べる</p>
    <a class="btn btn--primary" href="/compare/">サービス比較を見る<span aria-hidden="true">→</span></a>
  </div>
</aside>

${relatedHtml}
</div>`;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    datePublished: isoDateTime(a.published),
    dateModified: isoDateTime(a.updated),
    inLanguage: 'ja',
    author: { '@type': 'Organization', name: site.author || site.name, url: `${site.baseUrl}/about/` },
    publisher: { '@type': 'Organization', name: site.publisher || site.name, url: `${site.baseUrl}/` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(site, a.url) },
    articleSection: a.category.name,
    keywords: a.targetKeyword,
    url: absUrl(site, a.url),
  };

  const ld = [articleLd, breadcrumbJsonLd(site, crumbs)];

  if (a.faq.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: a.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return layout(site, {
    title: a.title,
    description: a.description,
    url: a.url,
    ogType: 'article',
    main,
    jsonLd: ld,
    bodyClass: 'page-article',
    current: a.category.slug,
  });
}

function buildCategory(site, category, articles) {
  const list = articles
    .filter((a) => a.category.slug === category.slug)
    .sort((a, b) => (a.updated < b.updated ? 1 : -1));

  const crumbs = [
    { label: 'ホーム', href: '/' },
    { label: category.name, href: `/${category.slug}/` },
  ];

  const main = `<section class="cat-hero" style="--cat:${catTheme(category.slug).color}">
  <div class="wrap wrap--wide cat-hero__inner">
    <div class="cat-hero__text">
${breadcrumb(crumbs)}
      <h1>${catGlyph(category.slug)}${esc(category.name)}の記事</h1>
      <p>${esc(category.description || '')}</p>
      <p class="cat-hero__count">${list.length} 記事</p>
    </div>
    <img class="cat-hero__img" src="${catImage(category.slug)}" alt="" width="640" height="320">
  </div>
</section>
<div class="wrap wrap--wide">
${
  list.length
    ? `<ul class="cards cards--grid">\n${list.map((a) => articleCard(a)).join('\n')}\n</ul>`
    : '<p class="empty">このカテゴリの記事はまだありません。<a href="/">トップページ</a>から他のカテゴリをご覧ください。</p>'
}
</div>`;

  return layout(site, {
    title: `${category.name}の記事一覧`,
    description: category.description || `${category.name}の配信・視聴方法に関する記事の一覧です。`,
    url: `/${category.slug}/`,
    main,
    jsonLd: [breadcrumbJsonLd(site, crumbs)],
    bodyClass: 'page-category',
    current: category.slug,
  });
}

function buildSearch(site) {
  const crumbs = [
    { label: 'ホーム', href: '/' },
    { label: 'サイト内検索', href: '/search/' },
  ];
  const catLinks = site.categories
    .map((c) => `<li><a href="/${c.slug}/">${esc(c.name)}</a></li>`)
    .join('\n      ');

  const main = `<div class="wrap">
${breadcrumb(crumbs)}
<header class="page-header">
  <h1>サイト内検索</h1>
  <p>記事タイトル・説明・想定キーワード・本文の書き出しから絞り込みます。</p>
</header>

<form class="search-page__form" action="/search/" method="get" role="search">
  <label for="search-q">キーワード</label>
  <div class="search-page__row">
    <input type="search" id="search-q" name="q" placeholder="例: DAZN 料金" autocomplete="off">
    <button type="submit">検索</button>
  </div>
</form>

<noscript>
  <p class="notice">この検索機能は JavaScript を使用します。JavaScript が無効の場合は、カテゴリ一覧から探してください。</p>
  <ul class="plain-list">
      ${catLinks}
  </ul>
</noscript>

<div id="search-status" class="search-status" role="status" aria-live="polite"></div>
<ul id="search-results" class="cards"></ul>

<section class="section-inline">
  <h2>カテゴリから探す</h2>
  <ul class="plain-list">
      ${catLinks}
  </ul>
</section>
</div>`;

  return layout(site, {
    title: 'サイト内検索',
    description: `${site.name}の記事をキーワードで検索できます。`,
    url: '/search/',
    main,
    jsonLd: [breadcrumbJsonLd(site, crumbs)],
    bodyClass: 'page-search',
    extraHead: '<meta name="robots" content="noindex,follow">\n',
    scripts: '<script src="/assets/search.js" defer></script>',
  });
}

function buildAbout(site) {
  // ---- 本人にしか書けない項目 --------------------------------------------
  // 運営者名: ハンドルネームで可。buildPolicy() の ownerName と必ず同じ表記にする。
  // 暫定でサイトの編集部名義にしてある。本人が本名や別の屋号を使いたくなったら、
  // ここと buildPolicy() の ownerName の2行を同じ表記に差し替えるだけでよい。
  const ownerName = 'みるまど編集部';
  // 連絡先は content/site.json の "contactEmail"（埋め方は同ファイルの _memo_contactEmail）。
  // 運営開始は content/site.json の "siteStarted"。
  const crumbs = [
    { label: 'ホーム', href: '/' },
    { label: 'サイトについて', href: '/about/' },
  ];
  const main = `<div class="wrap">
${breadcrumb(crumbs)}
<article class="article">
<header class="article__header">
  <h1>サイトについて</h1>
  <p class="article__lead">${esc(site.name)}がどんなサイトで、どうやって情報を確認しているかをまとめています。</p>
</header>
<div class="article__body">
<h2 id="h-1">${esc(site.name)}とは</h2>
<p>${esc(site.name)}は、スポーツとエンタメのライブ配信・見逃し配信について「結局どこで見られるのか」を調べて整理している個人運営のメディアです。試合や公演ごとに、視聴できるサービス・料金・無料で見る方法・申し込み手順をまとめています。</p>

<h2 id="h-2">記事の作り方</h2>
<ol>
  <li>放送・配信予定を各リーグ／主催者の公式発表で確認します。</li>
  <li>配信サービスの公式ヘルプや料金ページで、料金・視聴条件・無料期間の有無を確認します。</li>
  <li>確認できた一次情報だけを本文に書き、記事末尾に出典としてリンクを掲載します。</li>
  <li>料金改定や配信権の移動があった場合は、記事を更新して最終更新日を書き換えます。</li>
</ol>
<p>公式ページで確認が取れなかったことは書きません。確認中の項目は「未確認」と明記します。</p>

<h2 id="h-3">情報の鮮度について</h2>
<p>配信サービスの料金やラインナップは頻繁に変わります。各記事には「最終更新日」と「確認した時点」を明記していますので、申し込み前には必ず公式サイトで最新の内容をご確認ください。</p>

<h2 id="h-4">広告について</h2>
<p>${esc(site.adDisclosure)}紹介するサービスは、実際に視聴できるかどうかを基準に選んでいます。報酬額の多寡で順位を変えることはしません。詳しくは<a href="/policy/">運営者情報・免責</a>をご覧ください。</p>

<h2 id="h-5">運営者</h2>
<ul>
  <li>運営者名: ${esc(ownerName)}</li>
  <li>連絡先: ${esc(site.contactEmail || '【要記入】')}</li>
  <li>運営開始: ${esc(site.siteStarted)}</li>
</ul>
</div>
</article>
</div>`;

  return layout(site, {
    title: 'サイトについて',
    description: `${site.name}の運営方針と、記事の情報をどのように確認しているかを説明しています。`,
    url: '/about/',
    main,
    jsonLd: [breadcrumbJsonLd(site, crumbs)],
    bodyClass: 'page-static',
  });
}

// /policy/ の「利用しているASP」の段落。
// 提携が承認されるまでは「利用しています」と断定しない。
// content/site.json の aspApproved / aspApplied で切り替わる。
function aspParagraph(site) {
  const jp = (list) => list.map((x) => esc(String(x))).join('、');
  if (site.aspApproved.length) {
    const rest = site.aspApplied.filter((x) => !site.aspApproved.includes(x));
    const applying = rest.length
      ? `また、${jp(rest)}については提携を申請中で、承認され次第この項目に追記します。`
      : '';
    return `<p>当サイトが利用しているアフィリエイトサービスプロバイダ: ${jp(site.aspApproved)}。${applying}</p>`;
  }
  if (site.aspApplied.length) {
    return (
      `<p>当サイトは、${jp(site.aspApplied)}の各アフィリエイトサービスプロバイダへの参加を予定しています。` +
      `ただし本ページの最終改定日の時点では、いずれについても提携（広告掲載）の承認を受けておらず、` +
      `記事内に広告タグを掲載していません。提携が承認され、実際に広告の掲載を始めた時点で、` +
      `この項目を実際に利用しているASP名に更新します。</p>`
    );
  }
  return '<p>本ページの最終改定日の時点では、アフィリエイトサービスプロバイダとの提携はありません。</p>';
}

// /policy/ のアクセス解析の段落。
// content/site.json の analyticsTool が空のあいだは「導入していない」と書く。
// 導入していないのに「Google アナリティクスを使用しています」と書かないための分岐。
function analyticsParagraphs(site) {
  if (!site.analyticsTool) {
    return (
      `<p>当サイトのページは、アクセス解析ツール・外部フォント・CDN などの外部スクリプトを読み込まない作りにしています。` +
      `本ページの最終改定日の時点では<strong>アクセス解析ツールを導入しておらず</strong>、` +
      `当サイト自身のページとスクリプトは Cookie を使用していません。</p>\n` +
      `<p>今後アクセス解析ツールを導入する場合は、この項目に利用するツール名と Cookie の使用の有無を明記したうえで運用します。</p>`
    );
  }
  return (
    `<p>当サイトでは、アクセス状況の把握のために ${esc(site.analyticsTool)} を利用しています。` +
    `このツールはアクセスデータの収集のために Cookie を使用することがありますが、` +
    `収集されるのは閲覧されたページ・参照元・利用環境などの情報で、氏名や住所など個人を特定する情報は含まれません。</p>\n` +
    `<p>収集したデータは、記事の改善のためだけに利用します。</p>`
  );
}

function buildPolicy(site) {
  // ---- 本人にしか書けない項目 --------------------------------------------
  // 運営者名: ハンドルネームで可。buildAbout() の ownerName と必ず同じ表記にする。
  // 暫定でサイトの編集部名義にしてある。本人が本名や別の屋号を使いたくなったら、
  // ここと buildAbout() の ownerName の2行を同じ表記に差し替えるだけでよい。
  const ownerName = 'みるまど編集部';
  // 所在地: 空のあいだは住所の行そのものを出さず、
  //   「請求があった場合に遅滞なく開示します」の一文だけを出す。
  //   これは法的助言ではなく、個人運営のアフィリエイトサイトでよく取られている形に
  //   合わせた暫定措置。ASP や取引先から住所の記載を求められたら、ここに住所を
  //   書き込めば /policy/ の一覧に「所在地」の行が戻る
  //   （docs/launch-checklist.md #10 / #15）。
  const ownerAddress = '';
  const addressItem = ownerAddress ? `\n  <li>所在地: ${esc(ownerAddress)}</li>` : '';
  const addressNote = ownerAddress
    ? ''
    : '\n<p>所在地については、法令に基づく請求があった場合に遅滞なく開示します。</p>';
  // 連絡先は content/site.json の "contactEmail"。
  // 制定日・最終改定日は content/site.json の "policyEstablished" / "policyUpdated"。
  //   このページの文面を直したら policyUpdated を必ず更新すること。
  const crumbs = [
    { label: 'ホーム', href: '/' },
    { label: '運営者情報・免責', href: '/policy/' },
  ];
  const main = `<div class="wrap">
${breadcrumb(crumbs)}
<article class="article">
<header class="article__header">
  <h1>運営者情報・免責事項</h1>
  <p class="article__lead">広告の表示、情報の正確性、免責、プライバシーの取り扱いについて記載しています。</p>
</header>
<div class="article__body">

<h2 id="h-1">運営者情報</h2>
<ul>
  <li>サイト名: ${esc(site.name)}</li>
  <li>運営者名（ハンドルネーム可）: ${esc(ownerName)}</li>${addressItem}
  <li>連絡先: ${esc(site.contactEmail || '【要記入】')}</li>
  <li>お問い合わせ方法: 上記のメールアドレス宛にご連絡ください。メールフォームは設置していません。</li>
</ul>${addressNote}

<h2 id="h-2">広告・アフィリエイトプログラムについて（ステルスマーケティング規制への対応）</h2>
<p>当サイトは、アフィリエイトプログラムを利用した広告を掲載する方針で運営しています。記事内の広告リンクを経由してサービスの申し込みや契約があった場合、当サイトは広告主またはアフィリエイトサービスプロバイダから成果報酬を受け取ることがあります。</p>
<p>広告を含む記事には、<strong>記事の冒頭（タイトルのすぐ下）に、本文と同じ大きさの文字で「${esc(site.adDisclosure)}」と表示</strong>しています。同じ文言をページ下部にも掲載し、実際の広告枠には「広告」のラベルを付けています。</p>
<p>これは、景品表示法にもとづく指定告示「一般消費者が事業者の表示であることを判別することが困難である表示」（令和5年10月1日施行。いわゆるステルスマーケティング規制）と、消費者庁が公表している同告示の運用基準をふまえた表示です。運用基準では、事業者の表示であることを明瞭にする方法として「広告」「宣伝」「プロモーション」「PR」といった文言による表示が挙げられており、反対に、視認しにくい末尾の位置に置くこと、周囲の文字より小さく表示すること、大量のハッシュタグの中に埋もれさせることは、明瞭とはいえない方法として示されています。当サイトはこれに合わせ、読者が本文を読み始める前に必ず目に入る位置に、本文と同じ大きさで表示しています。</p>
${aspParagraph(site)}
<p>報酬の有無や金額によって、評価やおすすめ順を操作することはありません。掲載順は「その試合・番組を実際に視聴できるか」「料金と条件が明確か」を基準にしています。</p>
<p class="note">参照: 消費者庁「令和5年10月1日からステルスマーケティングは景品表示法違反となります」<a href="https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing/" rel="nofollow noopener" target="_blank">https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing/</a>、および同告示の運用基準（PDF）<a href="https://www.caa.go.jp/policies/policy/representation/fair_labeling/guideline/assets/representation_cms216_230328_03.pdf" rel="nofollow noopener" target="_blank">https://www.caa.go.jp/policies/policy/representation/fair_labeling/guideline/assets/representation_cms216_230328_03.pdf</a>（いずれも2026年9月15日確認）。</p>

<h2 id="h-3">情報の正確性について</h2>
<p>当サイトの記事は、<strong>各配信サービス・各リーグ・各主催者の公式ページで確認できた内容だけ</strong>を書く方針で作成しています。料金・配信予定・無料期間・対応デバイスなどの数値や条件には、記事末尾に出典として確認元のページへのリンクを掲載し、本文中の該当箇所からその出典を参照できるようにしています。公式ページで確認が取れなかったことは書かず、確認中の項目は「未確認」と明記します。</p>
<p>各記事には、公開日・最終更新日と、その情報をいつ時点で確認したかを明記しています。<strong>更新日は、その日に実際に公式ページで確認し直したときだけ更新</strong>しています。</p>
<p>ただし、配信権・料金プラン・無料期間・対応デバイスは予告なく変更される場合があります。当サイトは、確認した時点の内容が申し込み時点でも有効であることを保証するものではありません。<strong>申し込みや契約の前には、必ず各サービスの公式サイトで最新の条件をご確認ください。</strong></p>
<p>記載の誤りや、すでに古くなっている内容を見つけられた場合は、上記の連絡先までお知らせいただけると助かります。公式ページで確認のうえ、速やかに訂正し、更新日を書き換えます。</p>

<h2 id="h-4">免責事項</h2>
<ul>
  <li>当サイトの記事は、記載の確認日時点で各社の公式ページを確認して作成したものです。その後の変更によって内容が実際と異なっていた場合でも、運営者は責任を負いかねます。</li>
  <li>当サイトの情報を利用したことによって生じたいかなる損害についても、運営者は責任を負いかねます。</li>
  <li>当サイトから移動した先のサイト（広告主・配信サービス等）で提供される情報・サービスについては、各提供元が責任を負うものとします。</li>
  <li>各サービスの契約・解約・支払いに関するトラブルは、各サービスの窓口へお問い合わせください。</li>
</ul>

<h2 id="h-5">著作権について</h2>
<p>当サイトに掲載している文章・表・構成の著作権は、${esc(site.name)}の運営者に帰属します。</p>
<p>著作権法上の引用の要件を満たす範囲での引用は自由に行っていただけます。その場合は、引用部分がわかるように区別したうえで、出典として当サイトの名称と該当ページの URL を明記してください。<strong>引用の範囲を超える無断転載・複製・改変・再配布はお断りします。</strong>記事の全文または大部分の転載をご希望の場合は、上記の連絡先までご相談ください。</p>
<p>当サイトが記事末尾に掲載している出典リンクは、各社・各団体の公式ページを参照しているものです。リンク先の内容の著作権は、各リンク先の権利者に帰属します。</p>
<p>各リーグ・クラブ・チーム・大会・配信サービスの名称およびロゴは、それぞれの権利者の商標または登録商標です。当サイトはこれらの権利者とは関係のない、独立した個人運営のサイトです。</p>

<h2 id="h-6">アクセス解析・Cookie について</h2>
${analyticsParagraphs(site)}
<p>記事内に掲載する広告（アフィリエイトタグ）や、広告リンク・出典リンクから移動した先のサイトでは、それぞれの事業者の方針にしたがって Cookie が使用されることがあります。その取り扱いについては、各社のプライバシーポリシーをご確認ください。</p>
<p>Cookie は、お使いのブラウザの設定でいつでも無効にできます。</p>

<h2 id="h-7">個人情報の取り扱い</h2>
<p>お問い合わせいただいた際にお預かりした個人情報は、返信および内容の確認以外の目的では利用しません。第三者への提供は、法令に基づく場合を除き行いません。</p>

<h2 id="h-8">制定・改定</h2>
<ul>
  <li>制定日: ${esc(site.policyEstablished)}</li>
  <li>最終改定日: ${esc(site.policyUpdated)}</li>
</ul>
</div>
</article>
</div>`;

  return layout(site, {
    title: '運営者情報・免責事項',
    description: `${site.name}の運営者情報、アフィリエイト広告の表示、情報の正確性と免責事項について記載しています。`,
    url: '/policy/',
    main,
    jsonLd: [breadcrumbJsonLd(site, crumbs)],
    bodyClass: 'page-static',
  });
}

function build404(site) {
  const cats = site.categories
    .map((c) => `<li><a href="/${c.slug}/">${esc(c.name)}</a></li>`)
    .join('\n    ');
  const main = `<div class="wrap">
<header class="page-header">
  <h1>ページが見つかりませんでした</h1>
  <p>お探しのページは移動または削除された可能性があります。以下から探してみてください。</p>
</header>
<ul class="plain-list">
    <li><a href="/">トップページ</a></li>
    <li><a href="/search/">サイト内検索</a></li>
    ${cats}
</ul>
</div>`;
  return layout(site, {
    title: 'ページが見つかりません',
    description: 'お探しのページは見つかりませんでした。',
    url: '/404.html',
    main,
    bodyClass: 'page-static',
    extraHead: '<meta name="robots" content="noindex,follow">\n',
  });
}

function buildSitemap(site, articles) {
  const urls = [
    { loc: '/', lastmod: articles.length ? articles.reduce((m, a) => (a.updated > m ? a.updated : m), '0000-00-00') : todayIso(), pri: '1.0', freq: 'daily' },
    ...site.categories.map((c) => {
      const list = articles.filter((a) => a.category.slug === c.slug);
      const lastmod = list.length
        ? list.reduce((m, a) => (a.updated > m ? a.updated : m), '0000-00-00')
        : todayIso();
      return { loc: `/${c.slug}/`, lastmod, pri: '0.8', freq: 'weekly' };
    }),
    ...articles.map((a) => ({ loc: a.url, lastmod: a.updated, pri: '0.9', freq: 'weekly' })),
    { loc: '/about/', lastmod: todayIso(), pri: '0.3', freq: 'monthly' },
    { loc: '/policy/', lastmod: todayIso(), pri: '0.3', freq: 'monthly' },
  ];

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${xmlEsc(absUrl(site, u.loc))}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function buildRobots(site) {
  return `User-agent: *
Allow: /
Disallow: /search/

Sitemap: ${site.baseUrl}/sitemap.xml
`;
}

function buildFeed(site, articles) {
  // 2026-09-15: 上限を 20 → 50（site.feedCount で上書き可）に上げた。記事が22本になり、
  // 20件で打ち切ると更新日の古い2本（baseball-streaming-services-hub /
  // catchup-watch-now）が RSS から落ちていたため。
  const items = [...articles]
    .sort((a, b) => (a.updated < b.updated ? 1 : -1))
    .slice(0, site.feedCount || 50)
    .map(
      (a) => `    <item>
      <title>${xmlEsc(a.title)}</title>
      <link>${xmlEsc(absUrl(site, a.url))}</link>
      <guid isPermaLink="true">${xmlEsc(absUrl(site, a.url))}</guid>
      <category>${xmlEsc(a.category.name)}</category>
      <pubDate>${rfc822(a.published)}</pubDate>
      <description>${xmlEsc(a.description)}</description>
    </item>`
    )
    .join('\n');

  const lastBuild = new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEsc(site.name)}</title>
    <link>${xmlEsc(site.baseUrl)}/</link>
    <atom:link href="${xmlEsc(site.baseUrl)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${xmlEsc(site.description || site.tagline || site.name)}</description>
    <language>ja</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function buildSearchIndex(articles) {
  return JSON.stringify(
    articles.map((a) => ({
      title: a.title,
      description: a.description,
      category: a.category.name,
      categorySlug: a.category.slug,
      keyword: a.targetKeyword,
      url: a.url,
      updated: a.updated,
      excerpt: a.plainText.slice(0, 300),
    })),
    null,
    0
  );
}

function todayIso() {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  return jst.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ *
 * --check : 内部リンク / JSON-LD / パンくずの検証
 * ------------------------------------------------------------------ */

function listHtmlFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listHtmlFiles(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function resolvesInDist(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (clean === '' || clean === '/') return fs.existsSync(path.join(DIST, 'index.html'));
  const rel = clean.replace(/^\//, '');
  const asFile = path.join(DIST, rel);
  if (fs.existsSync(asFile) && fs.statSync(asFile).isFile()) return true;
  if (clean.endsWith('/') && fs.existsSync(path.join(asFile, 'index.html'))) return true;
  if (fs.existsSync(path.join(DIST, rel, 'index.html'))) return true;
  return false;
}

function runCheck(site, stats) {
  const problems = [];
  const warnings = [];
  const files = listHtmlFiles(DIST);
  let ldCount = 0;
  let linkCount = 0;

  for (const f of files) {
    const rel = path.relative(DIST, f);
    const html = fs.readFileSync(f, 'utf8');

    // 内部リンク
    const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    for (const h of hrefs) {
      if (!h.startsWith('/')) continue;
      linkCount++;
      if (!resolvesInDist(h)) problems.push(`${rel}: 内部リンク切れ → ${h}`);
    }

    // ページ内アンカー
    const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    for (const a of anchors) {
      if (!new RegExp(`id="${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) {
        problems.push(`${rel}: ページ内アンカーの飛び先がありません → #${a}`);
      }
    }

    // JSON-LD
    const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const [, json] of ldBlocks) {
      ldCount++;
      let obj;
      try {
        obj = JSON.parse(json.replace(/\\u003c/g, '<'));
      } catch (e) {
        problems.push(`${rel}: JSON-LD が不正な JSON です → ${e.message}`);
        continue;
      }
      if (!obj['@context'] || !obj['@type']) {
        problems.push(`${rel}: JSON-LD に @context / @type がありません`);
      }
      if (obj['@type'] === 'BreadcrumbList') {
        const items = obj.itemListElement || [];
        if (!items.length) problems.push(`${rel}: BreadcrumbList が空です`);
        items.forEach((it, idx) => {
          if (it.position !== idx + 1) problems.push(`${rel}: BreadcrumbList の position がずれています（${idx + 1} 番目が ${it.position}）`);
          if (!it.item || !String(it.item).startsWith(site.baseUrl)) {
            problems.push(`${rel}: BreadcrumbList の item が baseUrl 始まりではありません → ${it.item}`);
          }
        });
        if (items.length && items[0].name !== 'ホーム') {
          problems.push(`${rel}: パンくずの先頭が「ホーム」ではありません → ${items[0].name}`);
        }
        // HTML 側のパンくず件数と一致するか
        const m = /<nav class="breadcrumb"[\s\S]*?<\/nav>/.exec(html);
        if (m) {
          const liCount = (m[0].match(/<li>/g) || []).length;
          if (liCount !== items.length) {
            problems.push(`${rel}: HTML のパンくず (${liCount} 件) と JSON-LD (${items.length} 件) の件数が一致しません`);
          }
        } else {
          problems.push(`${rel}: BreadcrumbList はあるのに HTML のパンくずがありません`);
        }
      }
    }

    // 最低限の head 検証
    for (const [label, re] of [
      ['<title>', /<title>[^<]+<\/title>/],
      ['meta description', /<meta name="description" content="[^"]+"/],
      ['canonical', /<link rel="canonical" href="[^"]+"/],
      ['og:title', /<meta property="og:title"/],
      ['og:url', /<meta property="og:url"/],
      ['twitter:card', /<meta name="twitter:card"/],
    ]) {
      if (!re.test(html)) problems.push(`${rel}: ${label} がありません`);
    }
  }

  // search-index.json
  const idxPath = path.join(DIST, 'search-index.json');
  if (!fs.existsSync(idxPath)) problems.push('search-index.json が生成されていません');
  else {
    try {
      const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
      for (const it of idx) {
        if (!resolvesInDist(it.url)) problems.push(`search-index.json: リンク切れ → ${it.url}`);
      }
    } catch (e) {
      problems.push(`search-index.json が不正な JSON です → ${e.message}`);
    }
  }

  // 広告タグが未挿入の枠（エラーではなく警告。公開前に気づければよい）
  const pending = (stats && stats.adSlotsPending) || [];
  for (const s of pending) {
    warnings.push(
      `${s.file}: 広告枠 "${s.id}"（${s.program}）に html が入っていません。` +
        `本番ビルドでは何も出力されません`
    );
  }

  console.log('');
  console.log(`検証: HTML ${files.length} ページ / 内部リンク ${linkCount} 本 / JSON-LD ${ldCount} 個`);

  if (warnings.length) {
    console.log('');
    console.log(`検証 [警告] 広告タグ未挿入の枠が ${warnings.length} 箇所あります（エラーではありません）:`);
    for (const w of warnings) console.log(`  - ${w}`);
    console.log('  → 提携が通ったら docs/ad-placement.md §3-2 の手順で ad_slots に html: を足してください。');
  }

  if (problems.length) {
    console.error('');
    console.error('検証で問題が見つかりました:');
    for (const p of problems) console.error(`  - ${p}`);
    return false;
  }
  console.log('');
  console.log(`検証: エラーはありません${warnings.length ? `（警告 ${warnings.length} 件）` : ''}。`);
  return true;
}

/* ------------------------------------------------------------------ *
 * メイン
 * ------------------------------------------------------------------ */

function copyAssets() {
  if (!fs.existsSync(ASSETS_DIR)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(ASSETS_DIR, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
    fs.copyFileSync(path.join(ASSETS_DIR, e.name), path.join(DIST, 'assets', e.name));
    n++;
  }
  return n;
}

function main() {
  const t0 = Date.now();
  const stats = { adSlots: 0, adSlotsFilled: 0, adSlotsPending: [], sources: 0, externalLinks: 0 };

  const site = loadSite();
  const articles = loadArticles(site, stats);

  rmrf(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  const pages = [];

  pages.push(['index.html', buildHome(site, articles)]);

  for (const c of site.categories) {
    pages.push([path.join(c.slug, 'index.html'), buildCategory(site, c, articles)]);
  }
  for (const a of articles) {
    pages.push([path.join(a.category.slug, a.slug, 'index.html'), buildArticle(site, a, articles)]);
  }
  pages.push([path.join('search', 'index.html'), buildSearch(site)]);
  pages.push([path.join('about', 'index.html'), buildAbout(site)]);
  pages.push([path.join('policy', 'index.html'), buildPolicy(site)]);
  pages.push(['404.html', build404(site)]);

  for (const [rel, html] of pages) write(rel, html);

  write('sitemap.xml', buildSitemap(site, articles));
  write('robots.txt', buildRobots(site));
  write('feed.xml', buildFeed(site, articles));
  write('search-index.json', buildSearchIndex(articles));

  const assetCount = copyAssets();

  const drafts = articles.filter((a) => a.draft).length;
  const faqPages = articles.filter((a) => a.faq.length).length;

  console.log('');
  console.log(`ビルド完了: ${path.relative(process.cwd(), DIST) || DIST}`);
  console.log(`  記事 ${articles.length} 本${drafts ? `（うち下書き/サンプル ${drafts} 本）` : ''}`);
  console.log(`  広告枠 ${stats.adSlots} 箇所（うちタグ挿入済み ${stats.adSlotsFilled} 箇所）`);
  console.log(`  出典リンク ${stats.sources} 本`);
  console.log(`  HTML ${pages.length} ページ / アセット ${assetCount} ファイル`);
  console.log(`  FAQ 構造化データつきの記事 ${faqPages} 本 / 本文中の外部リンク ${stats.externalLinks} 本`);
  if (!INCLUDE_DRAFTS) {
    console.log('  （_ 始まりのファイルは除外しています。含めるには --drafts）');
  }
  console.log(`  所要 ${Date.now() - t0} ms`);

  if (RUN_CHECK) {
    const ok = runCheck(site, stats);
    if (!ok) process.exitCode = 1;
  }
}

try {
  main();
} catch (e) {
  if (e instanceof BuildError) {
    console.error('');
    console.error('ビルドを中止しました:');
    console.error(`  ${e.message}`);
    console.error('');
    process.exit(1);
  }
  throw e;
}
