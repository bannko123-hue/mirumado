# みるまど

スポーツ・エンタメの「その試合／その番組をどこで見られるか」を、公式ページで確認できた情報だけで案内する個人運営のアフィリエイトメディアです。

依存パッケージゼロの静的サイトジェネレータで、`content/` の Markdown から `dist/` に完成した HTML を出力します。`npm install` は不要です。

> **注意**: このファイルは、共有ストレージ（`/mnt/project-files/`）の I/O 障害でオリジナルが失われたため、`build.mjs` / `serve.mjs` の実装と運用ドキュメントから**再作成**したものです。オリジナルの README が回収できた場合はそちらを優先してください。

---

## サイト名と公開URL

- サイト名: **みるまど**（見る窓）。旧仮名「みるナビ」は使いません（TVS REGZA が視聴ガイド機能「次みるナビ」を提供していて領域が重なるため）。
- **公開URL: `https://mirumado.pages.dev`**（Cloudflare Pages の無料サブドメイン）。`content/site.json` の `baseUrl` に設定済み（**末尾のスラッシュを付けない**）。
- **独自ドメインは取得しません**（2026-09-14 の運営判断）。`mirumado.com` は取りません。
- Cloudflare Pages では **プロジェクト名がそのまま `<プロジェクト名>.pages.dev` になります**。**プロジェクト名は `mirumado`**。ここを変えると公開URLが変わるので、`baseUrl` も必ず合わせてください。

あとから独自ドメインに移す場合の手順と、そのとき何が起きるか（検索評価・ASP提携の取り直しを含む）は **`docs/handover.md` §4-4** にあります。**`baseUrl` を1行変えれば全ページの canonical・OGP・sitemap・RSS・JSON-LD が追随します。**

---

## 必要なもの

- **Node.js 18 以上**（標準ライブラリのみ使用）
- それだけ。パッケージマネージャも設定ファイルも要りません。

```bash
node --version   # v18 以上であること
```

## 使い方

```bash
node build.mjs             # 本番ビルド（_ 始まりの記事は除外）→ dist/
node build.mjs --drafts    # _ 始まりの下書き・サンプルも含める
node build.mjs --check     # ビルド後に内部リンク / JSON-LD / パンくずを検証
node serve.mjs             # dist/ を http://127.0.0.1:4123/ で配信（Ctrl+C で停止）
```

公開前は必ず次を通してください。

```bash
node build.mjs --check
```

- **エラーが出たらビルドは失敗**（終了コード 1）。公開してはいけません。
- **`[警告]` は失敗させません。** 広告タグ未挿入の枠などが該当します。内容を読んで、意図どおりか確かめてから公開してください。

## ディレクトリ構成

```
mirumado/
  build.mjs            静的サイトジェネレータ本体
  serve.mjs            dist/ をローカル確認するための静的サーバ
  README.md            このファイル
  content/
    site.json          サイト名・カテゴリ・入口・広告表記などの設定
    articles/          記事の Markdown（_ 始まりは下書き／サンプル）
  assets/
    style.css          サイト全体のスタイル
    search.js          /search/ のクライアントサイド検索
  docs/                運用ドキュメント（下記）
  research/            調査メモ・出典台帳
  dist/                ビルド出力（生成物。手で編集しない）
```

`dist/` は毎回まるごと作り直されます。**`dist/` を直接編集しても次のビルドで消えます。**

### トップページの表示件数（`content/site.json`）

- `homeLatestCount` … トップの「新着記事」に並べる本数（公開日の新しい順）。未指定なら **12**。
- `homeUpdatedCount` … トップの「最近更新した記事」に並べる本数（更新日の新しい順）。未指定なら **8**。記事が増えたらこの2つを増やしてください。

## 記事の書き方

記事は `content/articles/<スラッグ>.md`。ファイル名がそのまま URL のスラッグになり、公開 URL は `/<カテゴリのslug>/<スラッグ>/` です。ファイル名を `_` で始めると下書き扱いになり、`--drafts` を付けたときだけビルドされます。

先頭に `---` で囲んだフロントマターを置きます。

```markdown
---
title: 記事タイトル
description: 検索結果とOGPに出る説明文
category: サッカー            # content/site.json の categories の name と一致させる
role: entry                   # entry / hub / conversion
target_keyword: Jリーグ 配信 見る方法
search_intent: 読者が何を決めたくて来たか
published: 2026-09-07         # YYYY-MM-DD
updated: 2026-09-07           # YYYY-MM-DD
sources:
  - label: 出典の名前
    url: https://example.com/
    note: そのページで確認できた内容
ad_slots:
  - id: slot-hero
    program: 案件名（ASP名）
    note: 差し込む位置のメモ
    html: '<a href="...">…</a>'   # ASP のタグ。任意（docs/ad-placement.md 参照）
---
```

フロントマターは YAML のサブセットです。

- 値は1行。`"` か `'` で囲めば囲みは外れます。
- **行頭が `#` の行だけがコメント**です。値の途中の `#` はそのまま本文として残ります（`title: Jリーグ 第1節 # 第2節の見方` はこの全体がタイトルになります）。
- HTML タグのように `"` を多く含む値は**シングルクォートで囲んで**ください。

### 本文で使える記法

| 記法 | 意味 |
|---|---|
| `## 見出し` 〜 `#### 見出し` | 見出し（`##` が目次に載る） |
| `- 項目` / `1. 項目` | 箇条書き・番号付きリスト |
| `> 引用` | 引用 |
| `\|` の表 | 表（1列目が行見出しになる） |
| `**強調**` | 太字 |
| `[表示文字](/soccer/xxx/)` | 内部リンク |
| `[表示文字](https://…)` | 外部リンク（`rel="nofollow noopener" target="_blank"` が自動で付く） |
| `::source{3}` | フロントマター `sources` の3番目への出典リンク |
| `::ad{id=slot-hero}` | 広告枠（**必ず単独行**。前後を空行で挟む） |
| `## よくある質問` の下の `### 質問` | FAQ 構造化データになる |

本文は HTML エスケープされます。生の HTML は書けません（広告タグだけが `ad_slots` の `html:` から例外的に通ります）。

## 広告について

`::ad{id=...}` の枠は、フロントマターの `ad_slots` に **`html:`（ASP から取得したリンクタグ）が入っているときだけ**、「広告」ラベル付きで出力されます。`html:` が無い枠は**本番ビルドでは何も出力されません**（`--drafts` のときだけ開発用のプレースホルダが出ます）。

貼り付け手順・A8.net の禁止事項・記事別の枠の対応表は **`docs/ad-placement.md`** にまとまっています。広告を触る前に必ず読んでください。

## バージョン管理（git）

このディレクトリは**ローカルの git リポジトリとして初期化済み**です（既定ブランチ `main`、初回コミット済み、`.gitignore` に `dist/` `node_modules/` OSやエディタの生成物を登録済み）。

```bash
git log --oneline    # 初回コミットが1本あることを確認
git status           # クリーンなことを確認
```

**リモートはまだ設定していません。** GitHub に上げるのは Akito 本人の作業です。

### 自分の GitHub に上げる手順

1. GitHub で**空のリポジトリ**を作ります（<https://github.com/new>）。
   - Repository name: `mirumado`（何でもよい。Cloudflare Pages のプロジェクト名とは別物です）
   - Public / Private はどちらでも構いません。**Cloudflare Pages は Private リポジトリでも連携できます。**
   - **`README` / `.gitignore` / ライセンスの「Add a ...」は全部チェックを外す。** ここで何か作ると、手元のコミットと衝突します。

2. 作成後の画面に出る URL を、そのままリモートとして登録して push します。

   ```bash
   cd <このディレクトリ>
   git remote add origin https://github.com/<あなたのユーザー名>/mirumado.git
   git push -u origin main
   ```

   - HTTPS で push するとユーザー名とパスワードを聞かれます。**パスワード欄には GitHub のログインパスワードではなく、[Personal access token](https://github.com/settings/tokens) を貼ります。**
   - SSH 鍵を設定済みなら `git@github.com:<あなたのユーザー名>/mirumado.git` でも構いません。

3. 以後の更新はいつもの3行です。

   ```bash
   node build.mjs --check    # エラー0 を確認してから
   git add -u && git commit -m "何を直したか"
   git push
   ```

   Cloudflare Pages を Git 連携で設定してあれば、**`main` に push した時点で自動でビルドされて公開されます**（下の「公開手順」を参照）。

> **push する前に必ず `node build.mjs --check` を通してください。** エラーのまま push すると、Cloudflare 側のビルドが失敗して公開が止まります。

---

## 公開手順（Cloudflare Pages / 無料サブドメイン）

**既定の公開先は Cloudflare Pages の無料サブドメイン `https://mirumado.pages.dev` です。** リポジトリに置く設定ファイルはありません（`netlify.toml` も `.github/workflows/` も不要）。ビルド設定はすべてダッシュボードで指定します。

**費用は 0 円です。** ただし **サインアップにクレジットカードが要るかどうかは、公式ページで未確認です**（`docs/launch-checklist.md` #2 に理由を明記）。アカウント作成画面でカード入力を求められたら、そこで判断してください。

### 初回（Git 連携・推奨）

1. GitHub にリポジトリを作り、push します。**`dist/` はコミットしません**（ホスティング側でビルドします）。
   このディレクトリは**すでにローカルの git リポジトリになっていて、初回コミットも入っています**。
   手順は下の「[バージョン管理（git）](#バージョン管理git)」を見てください。

2. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 次のとおり設定します。

   | 項目 | 値 |
   |---|---|
   | **Project name** | **`mirumado`** ← **これが `mirumado.pages.dev` になります** |
   | Production branch | `main` |
   | Framework preset | **None** |
   | **Build command** | **`node build.mjs`** |
   | **Build output directory** | **`dist`** |
   | 環境変数 | **`NODE_VERSION`** = **`20`** |

4. **Save and Deploy**。以後は `main` に push するたびに自動でビルド・公開されます。

> **`mirumado` が先に取られていた場合**: `.pages.dev` は全ユーザー共通の名前空間です。別名になったら **`content/site.json` の `baseUrl` をその名前に必ず合わせて**、`node build.mjs --check` を通し直してください。

### 手元から直接デプロイする場合（Git を使わないとき）

```bash
node build.mjs --check
npx wrangler pages deploy dist --project-name mirumado
```

### 公開後の確認

```bash
node build.mjs --check     # エラー 0 であること
```

ブラウザで次を確認します。

- `https://mirumado.pages.dev/` — トップが表示される
- `https://mirumado.pages.dev/sitemap.xml` — `<loc>` が `https://mirumado.pages.dev/...`
- `https://mirumado.pages.dev/robots.txt` — `Sitemap:` 行が同じドメイン
- トップの HTML ソースが `<link rel="canonical" href="https://mirumado.pages.dev/">`

### 他のホスティングを選ぶ場合

いずれも**選ばなかった**選択肢です（判断の記録は `docs/launch-checklist.md` #2）。

- **GitHub Pages**（`<ユーザー名>.github.io`）: リポジトリ用サイトは `https://<ユーザー名>.github.io/<リポジトリ名>/` というサブディレクトリ公開になります。**このサイトはルート絶対パス（`/assets/style.css` など）でリンクしているため、そのままでは壊れます**（`build.mjs` の改修が必要）。ユーザーサイト（`<ユーザー名>.github.io` 直下）にすればルート公開できますが、アカウントに1つしか作れない枠を使います。加えてワークフロー YAML の保守が要ります。
- **Netlify**（`<サイト名>.netlify.app`）: `netlify.toml` に `command = "node build.mjs"` / `publish = "dist"` / `NODE_VERSION = "20"` を書きます。2026年時点でクレジット制のため無料枠が見積もりにくい、という理由で見送りました。

## 運用ドキュメント

| ファイル | 中身 |
|---|---|
| `docs/launch-checklist.md` | 公開前に潰すことの一覧 |
| `docs/ad-placement.md` | 広告枠の設計、ASP タグの貼り方、禁止事項 |
| `docs/daily-operation.md` | 公開後の日々の更新・情報の確認手順 |
| `docs/handover.md` | 引き継ぎ用の全体像 |

## 編集方針（守ること）

- **公式ページで確認できた事実だけを書く。** 確認できないことは「本記事では扱いません」と書いて、書かない。
- **数値を書いたら出典を `sources` に足し、本文で `::source{n}` を打つ。**
- **`updated` は、その日に実際に公式で確認し直したときだけ上げる。** 読者には「その日の情報」として表示されます。
