# ad-map.md — 広告枠の対応表（原本）

> **これは元ファイルが失われたあとに、記事9本のフロントマター `ad_slots`（当時の22枠すべての id / program / note）と `docs/ad-placement.md` §5 から復元したものです。元の版とは細部が異なる可能性があります。**
>
> - 復元日: 2026-09-08
> - **2026-09-10 に実ファイルから数え直しました。** 記事は **14本**、実在する枠は **37枠**（§1）。まだ本文を書いていない8記事の計画分（§2）を足した集計対象は **22記事・56枠**。
> - **2026-09-14 に数え直しました。20本の計画の記事は全部書かれ、実ファイルは 22記事・57枠 になりました。** §1 の集計と §2 末尾の集計は、どちらも `content/articles/*.md` の `ad_slots` からの実測値です（計画値ではありません）。計画の56枠から1枠増えたのは、`npb-postseason-broadcast` に `slot-compare`（パ・リーグTV）を足したためです。
> - **§1 の22枠は、実在する `content/articles/*.md` からの転記**です。ここは元の版と一致しているはずです。
> - **§2（まだ書いていない11記事の枠）は `docs/ad-placement.md` §5 からの復元**でした。§5 は元の `ad-map.md` を「記事ファイルをどう編集するか」の手順に書き直したものなので、**元の `ad-map.md` の表現とは異なるはずです。2026-09-14 に20記事すべての本文を書き終えたため、§2 の行はすべて §1 に移り、§2 は計画の記録だけになりました。**
> - **報酬単価は全件「要ログイン確認」。** 3社（A8.net／もしもアフィリエイト／afb）とも公開ページに単価が無く、ログインが必要。**推測の数値は1つも書かない。**
> - **`research/ledger-recovered.md` には第三者データベース由来の単価が並んでいるが、それは ASP の管理画面でも公式でもない。ここに転記しない。**
> - **VPN・海外視聴の案件（afb Surfshark、もしも Rakulink、NordVPN 各社）はこの表に入れていない。** 単価は高いがこのサイトでは使わない（`research/plan.md` §5）。

---

## 0. 枠の種類（4種のみ）

| 枠id | 置く位置 | 何を置くか |
|---|---|---|
| `slot-hero` | 記事冒頭（PR表記の直後、リード文の下、結論の直後） | **結論として最も勧めたい1件のみ。** 2件以上置かない |
| `slot-mid` | 本文中盤（そのサービスの解説を終えた直後） | **解説した当のサービス。** 文脈と一致しない案件を置かない |
| `slot-compare` | 比較表の直下 | 表に出したサービスのうち、**提携済みのものだけ** |
| `slot-footer` | 記事末尾（まとめの下） | 次に読ませる記事へのリンクと並べる。1〜2件 |

**数の上限: 1記事あたり2〜3枠。4枠以上置かない。同じ枠に3件以上並べない（2件まで）。**

---

## 1. 本文まで書いた記事の枠（実在ファイルからの転記）

> **2026-09-14 時点の実測: 記事 22本・広告枠 57枠**（`node build.mjs --check` の「広告枠 57 箇所」「記事 22 本」と一致）。下の #1〜#37 は 2026-09-10 までの14本ぶん、#38〜#46 は 2026-09-14 に追加した4本ぶん、**#47〜#57 は同日に別担当が書いた4本（`sports-streaming-tv-setup` / `abema-premium-review` / `skyperfectv-baseball-review` / `unext-vs-hulu-price`・計11枠）ぶん**です。**これで §2（計画）は空になりました。**

> **2026-09-10 追記（1回目）**: `watch-on-tv` と `free-streaming-options` の6枠（#23〜#28）を足しました。
>
> **2026-09-10 追記（2回目）**: `boxing-live-streaming` / `mma-live-streaming` / `music-live-streaming` の9枠（#29〜#37）を足しました。計画（§2）から差し替えた枠があるので、変更の理由は §1 の表の下の注記を読んでください。単価・状態は他と同じく全件「要ログイン確認」「未提携・タグ未挿入」です。

**単価は全件「要ログイン確認」。状態は全件「未提携・タグ未挿入」**（`node build.mjs --check` の警告37件と一致）。

| # | 記事 slug | 枠id | 案件名 | ASP | 単価 | 差し込む位置（`note` の転記） |
|---|---|---|---|---|---|---|
| 1 | `j-league-live-streaming` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | ABEMA de DAZN の解説を終えた直後。プロ野球など一部が対象外である旨を書いた後にだけ置く |
| 2 | `j-league-live-streaming` | `slot-footer` | ABEMAプレミアム | A8.net | 要ログイン確認 | 記事末尾のまとめの下。afbが未提携の間の代替として使う |
| 3 | `npb-live-streaming` | `slot-hero` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | 記事冒頭、結論の直後。オンデマンド単体加入が成果対象外となる可能性があるため、提携時に条件を確認する |
| 4 | `npb-live-streaming` | `slot-compare` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | 料金比較表の直下 |
| 5 | `npb-live-streaming` | `slot-footer` | ABEMAプレミアム | afb | 要ログイン確認 | 記事末尾のまとめの下 |
| 6 | `pacific-league-tv-watch` | `slot-hero` | パ・リーグTV | **要確認**（パーソル パ・リーグTV。指定3ASPでの取扱いが未確認） | 要ログイン確認 | 記事冒頭、結論の直後。指定3ASPに案件が無ければ公式サイトへの通常リンクに差し替える |
| 7 | `pacific-league-tv-watch` | `slot-mid` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | 「パ・リーグ以外も見たい人向け」の解説を終えた直後 |
| 8 | `pacific-league-tv-watch` | `slot-footer` | ABEMAプレミアム | afb | 要ログイン確認 | 記事末尾のまとめの下 |
| 9 | `tver-catchup-watch` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | 「TVerに無い番組を見る」文脈にのみ置く。**TVerは完全無料なので、TVerの解説部分には広告を置かない** |
| 10 | `tver-catchup-watch` | `slot-footer` | U-NEXT | afb | 要ログイン確認 | 記事末尾のまとめの下。提携できるまでは枠を空けたまま公開する |
| 11 | `catchup-watch-now` | `slot-hero` | ABEMAプレミアム | afb | 要ログイン確認 | 「広告つき680円では追っかけ再生・広告なし見逃しが使えない」を説明した直後 |
| 12 | `catchup-watch-now` | `slot-mid` | U-NEXT | afb | 要ログイン確認 | 31日間無料トライアルの説明の直後。提携できるまでは枠を空けたまま公開する |
| 13 | `catchup-watch-now` | `slot-footer` | ABEMAプレミアム | A8.net | 要ログイン確認 | 記事末尾のまとめの下。afbが未提携の間の代替として使う |
| 14 | `soccer-streaming-services-hub` | `slot-compare` | ABEMAプレミアム／スカパー！ | afb／もしもアフィリエイト | 要ログイン確認 | 料金一覧表の直下。**同一枠に2件までとし、3件以上は並べない** |
| 15 | `soccer-streaming-services-hub` | `slot-footer` | DMM TV | afb | 要ログイン確認 | 記事末尾、次に読む記事へのリンクと並べる |
| 16 | `baseball-streaming-services-hub` | `slot-compare` | スカパー！／パ・リーグTV | もしもアフィリエイト／**要確認** | 要ログイン確認 | 料金一覧表の直下。**同一枠に2件までとし、3件以上は並べない** |
| 17 | `baseball-streaming-services-hub` | `slot-footer` | DMM TV | afb | 要ログイン確認 | 記事末尾、次に読む記事へのリンクと並べる |
| 18 | `streaming-price-basics` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | 料金改定の説明を終えた直後 |
| 19 | `streaming-price-basics` | `slot-footer` | U-NEXT | afb | 要ログイン確認 | まとめの直後。提携できるまで枠は空けたまま公開する |
| 20 | `sports-streaming-comparison` | `slot-hero` | ABEMAプレミアム | afb | 要ログイン確認 | 早見表の直後。結論として最も勧める1件のみを置く |
| 21 | `sports-streaming-comparison` | `slot-compare` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | 全サービス横断の比較表の直下 |
| 22 | `sports-streaming-comparison` | `slot-footer` | WOWOW | afb | 要ログイン確認 | まとめの直後。次に読む記事へのリンクと並べる |
| 23 | `watch-on-tv` | `slot-compare` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | サービス別の対応機器早見表の直下。表に出したサービスのうち提携済みのものだけ |
| 24 | `watch-on-tv` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | ABEMAの対応機器と料金の解説を終えた直後。**TVerの解説部分には置かない** |
| 25 | `watch-on-tv` | `slot-footer` | WOWOW | afb | 要ログイン確認 | まとめの直後。次に読む記事へのリンクと並べる |
| 26 | `free-streaming-options` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | **「無料で見られる範囲の限界」を説明した直後にのみ**置く。TVerの解説部分には置かない |
| 27 | `free-streaming-options` | `slot-compare` | U-NEXT | afb | 要ログイン確認 | 無料トライアルの現状をまとめた表の直下。提携できるまでは枠を空けたまま公開する |
| 28 | `free-streaming-options` | `slot-footer` | ABEMAプレミアム | A8.net | 要ログイン確認 | まとめの直後。afb が未提携の間の代替として使う |
| 29 | `boxing-live-streaming` | `slot-compare` | WOWOW | afb | 要ログイン確認 | 料金比較表の直下。成果地点が「有料申込後の入金確認」になる可能性があるため、提携時に条件を確認する |
| 30 | `boxing-live-streaming` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | ペイパービューの解説を終えた直後。PPVはプレミアムとは別料金である旨を書いた後にだけ置く |
| 31 | `boxing-live-streaming` | `slot-footer` | ABEMAプレミアム | A8.net | 要ログイン確認 | 記事末尾のまとめの下。afbが未提携の間の代替として使う |
| 32 | `mma-live-streaming` | `slot-compare` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | 料金比較表の直下。オンデマンド単体加入が成果対象外となる可能性があるため、提携時に条件を確認する |
| 33 | `mma-live-streaming` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | ペイパービューの解説を終えた直後。PPVはプレミアムとは別料金である旨を書いた後にだけ置く |
| 34 | `mma-live-streaming` | `slot-footer` | ABEMAプレミアム | A8.net | 要ログイン確認 | 記事末尾のまとめの下。afbが未提携の間の代替として使う |
| 35 | `music-live-streaming` | `slot-compare` | WOWOW | afb | 要ログイン確認 | 料金比較表の直下。表には無料のTVerも含むため、結論で「無料で足りるならTVer」と先に書いたうえで置く |
| 36 | `music-live-streaming` | `slot-mid` | U-NEXT | afb | 要ログイン確認 | U-NEXTのライブ配信の解説を終えた直後。提携できるまでは枠を空けたまま公開する |
| 37 | `music-live-streaming` | `slot-footer` | WOWOW | もしもアフィリエイト | 要ログイン確認 | 記事末尾のまとめの下。afbが未提携の間の代替として使う |
| 38 | `emperors-cup-broadcast` | `slot-mid` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | スカパー！の加入当月・解約ルールを説明した直後。オンデマンド単体加入が成果対象外となる可能性があるため、提携時に条件を確認する |
| 39 | `emperors-cup-broadcast` | `slot-footer` | ABEMAプレミアム | afb | 要ログイン確認 | 記事末尾のまとめの下 |
| 40 | `soccer-free-broadcast` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | 「無料で見られる範囲の限界」を説明した直後にのみ置く。TVerの解説部分には置かない |
| 41 | `soccer-free-broadcast` | `slot-footer` | ABEMAプレミアム | A8.net | 要ログイン確認 | 記事末尾のまとめの下。afbが未提携の間の代替として使う |
| 42 | `npb-postseason-broadcast` | `slot-compare` | パ・リーグTV | **要確認**（3ASPでの取扱いが未確認） | 要ログイン確認 | 日程と窓口の比較表の直下。指定3ASPに案件が無ければ公式サイトへの通常リンクに差し替える |
| 43 | `npb-postseason-broadcast` | `slot-mid` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | スカパー！の加入当月・解約ルールを説明した直後。オンデマンド単体加入が成果対象外となる可能性があるため、提携時に条件を確認する |
| 44 | `npb-postseason-broadcast` | `slot-footer` | ABEMAプレミアム | afb | 要ログイン確認 | 記事末尾のまとめの下 |
| 45 | `catchup-deadline-list` | `slot-compare` | ABEMAプレミアム | afb | 要ログイン確認 | サービス別の期限早見表の直下。表には無料のTVerも含むため、結論で「無料で済むならTVer」と先に書いたうえで置く。TVerの解説部分には置かない |
| 46 | `catchup-deadline-list` | `slot-footer` | WOWOW | afb | 要ログイン確認 | 記事末尾のまとめの下 |
| 47 | `sports-streaming-tv-setup` | `slot-compare` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | サービス別の早見表の直下。表に出したサービスのうち提携済みのものだけを置く |
| 48 | `sports-streaming-tv-setup` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | ABEMAの対応機器と料金の解説を終えた直後。**TVerとNHK ONEの解説部分には置かない** |
| 49 | `sports-streaming-tv-setup` | `slot-footer` | WOWOW | afb | 要ログイン確認 | まとめの直後。**計画のDMM TVは本文で触れられないため差し替え。** 次に読む記事へのリンクと並べる |
| 50 | `abema-premium-review` | `slot-hero` | ABEMAプレミアム | afb | 要ログイン確認 | 結論でプランの選び分けを示した直後。結論として最も勧める1件のみを置く |
| 51 | `abema-premium-review` | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | 広告つきプランとの違いを説明した直後。使えない機能を書いた後にだけ置く |
| 52 | `abema-premium-review` | `slot-footer` | ABEMAプレミアム | A8.net | 要ログイン確認 | まとめの直後。afb が未提携の間の代替。次に読む記事へのリンクと並べる |
| 53 | `skyperfectv-baseball-review` | `slot-hero` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | 結論の直後。オンデマンド単体加入が成果対象外となる可能性があるため、提携時に条件を確認する |
| 54 | `skyperfectv-baseball-review` | `slot-mid` | スカパー！ | もしもアフィリエイト | 要ログイン確認 | 解約ルールを説明した直後。加入当月は解約できないことを書いた後にだけ置く |
| 55 | `skyperfectv-baseball-review` | `slot-footer` | パ・リーグTV | **要確認**（ASPでの取扱いが未確認） | 要ログイン確認 | まとめの直後。**計画のDMM TVから差し替え。** 3社に案件が無ければ公式サイトへの通常リンクにする |
| 56 | `unext-vs-hulu-price` | `slot-compare` | U-NEXT／Hulu | afb／afb | 要ログイン確認 | 料金比較表の直下。**同一枠に2件まで。** U-NEXTはクローズド案件化しているという第三者情報があるため、提携できるまでは枠を空けたまま公開する |
| 57 | `unext-vs-hulu-price` | `slot-footer` | ABEMAプレミアム | afb | 要ログイン確認 | まとめの直後。2社とも未提携の間の受け皿。次に読む記事へのリンクと並べる |

#### #47〜#57 が §2 の計画と違う理由（2026-09-14・執筆時の判断）

- **`sports-streaming-tv-setup` の `slot-footer` を DMM TV（afb）→ WOWOW（afb）に差し替えた。** DMM TV は Web登録 月550円・アプリストア登録 月650円（税込）までは確認できたが、**スポーツをテレビで見る話に使える事実（対応機器・スポーツのラインアップ）が1件も確認できず、本文で一度も触れていない。** 本文に出てこないサービスの枠を置くと §0 の「文脈と一致しない案件を置かない」に反する。WOWOW は本文の比較表とスポーツの節で扱っているので条件を満たす。
- **`sports-streaming-tv-setup` に `slot-compare`（スカパー！・もしも）を1枠足した**（計画は `slot-mid` と `slot-footer` の2枠）。結論のサービス別早見表にスカパー！を出しているため §0 の条件を満たす。1記事3枠で上限内。
- **`skyperfectv-baseball-review` の `slot-footer` を DMM TV（afb）→ パ・リーグTV（要確認）に差し替えた。** 理由は上と同じ（DMM TV に野球の事実が無く本文で触れていない）。パ・リーグTV は「他の選択肢と並べて考える」の節で月1,595円を出しているので文脈と一致する。**ASPでの取扱いは3社とも未確認なので、案件が無ければ公式サイトへの通常リンクにする。**
- **`abema-premium-review` と `unext-vs-hulu-price` は §2 の計画どおり**（3枠・2枠）。`unext-vs-hulu-price` の `slot-compare` は計画どおり U-NEXT と Hulu の2案件を1枠に併記している（§0 の上限どおり2件まで）。
- **4本とも、SPOTV NOW・DAZN 本体・Prime Video の枠は置いていない。** 本文でそれらの料金を扱っていないため（`research/plan.md` の禁止事項および §0）。

#### #38〜#46 が §2 の計画と違う理由（2026-09-14・執筆時の判断）

- **`npb-postseason-broadcast` に `slot-compare`（パ・リーグTV）を1枠足した**（計画は `slot-mid` と `slot-footer` の2枠）。この記事で**視聴範囲にCSが明記されている唯一のサービスがパ・リーグTV**（公式のプランページに「パーソル クライマックス パ」）で、日程と窓口の比較表にも出しているため、§0 の「表に出したサービス」「文脈と一致する案件」の両方を満たす。1記事3枠で上限内。**ASPでの取扱いは3社とも未確認なので、案件が無ければ公式サイトへの通常リンクにする。**
- **残る3本（`emperors-cup-broadcast` / `soccer-free-broadcast` / `catchup-deadline-list`）は §2 の計画どおり2枠。** 差し替えはしていない。
- **`catchup-deadline-list` に `slot-hero` を置かなかった**（計画にも無い）。この記事の結論は「まず完全無料のTVerで探す」なので、PR表記と結論の直後に有料サービスの枠を置くと §3 の「無料の説明のすぐ横に有料サービスを置かない」に反する。`slot-compare` は早見表の直下（TVerの解説節の外）に置いた。
- **4本とも DMM TV の枠は置いていない。** 本文で DMM TV に一度も触れていないため（§0 の「文脈と一致しない案件を置かない」）。

#### #29〜#37 が §2 の計画と違う理由（2026-09-10・執筆時の判断）

- **`boxing-live-streaming` の `slot-footer`**: 計画は U-NEXT（afb）だったが、その計画自身が「クローズド案件化しているという第三者情報あり。提携できるまで枠を置かない」としていたので、**ABEMAプレミアム（A8.net）に差し替えた**。なお**記事本文では、ボクシングを見放題で追うなら U-NEXT が第一候補だと書いている**。§3 の「読者にとって最良の答えを書く」を曲げていない。
- **`boxing-live-streaming` の `slot-compare` を追加**: 比較表に WOWOW を出しているので §0 の条件を満たす。1記事3枠で上限内。
- **`mma-event-streaming` → `mma-live-streaming`**: slug が変わった（`plan.md` §3 No.14 に対応）。
- **`mma-live-streaming` の DMM TV 2枠を置かなかった**: **DMM TV の公式ページ（`tv.dmm.com`）はこの環境から `special.dmm.com/not-available-in-your-region` にリダイレクトされ、料金も無料期間も格闘技のラインアップも1件も確認できなかった。** 事実が1件も無いので記事本文で DMM TV に触れておらず、本文に出てこないサービスの枠を置くと §0 の「文脈と一致しない案件を置かない」に反する。→ `unverified.md` に追加した。代わりに、本文で扱ったスカパー！（`slot-compare`）とABEMAプレミアム（`slot-footer`）に割り当てた。
- **`music-live-streaming` の `slot-hero` を置かなかった**: この記事の結論は「まず TVer を確認する（完全無料）」。PR表記と結論の直後に有料サービスの枠を置くと §3 の「無料の説明のすぐ横に有料サービスを置かない」に反するので、比較表の直下（`slot-compare`）に移した。
- **`music-live-streaming` の `slot-mid`**: WOWOW（もしも）ではなく **U-NEXT（afb）**。この位置は U-NEXT のライブ配信を解説した直後で、§0 の「解説した当のサービス」に合わせた。WOWOW（もしも）は `slot-footer` に回した。

### 記事別の枠数

| 記事 slug | role | 枠数 |
|---|---|---|
| `j-league-live-streaming` | entry | 2 |
| `npb-live-streaming` | entry | 3 |
| `pacific-league-tv-watch` | entry | 3 |
| `tver-catchup-watch` | entry | 2 |
| `catchup-watch-now` | entry | 3 |
| `soccer-streaming-services-hub` | hub | 2 |
| `baseball-streaming-services-hub` | hub | 2 |
| `streaming-price-basics` | hub | 2 |
| `sports-streaming-comparison` | conversion | 3 |
| `watch-on-tv` （2026-09-10 追加） | hub | 3 |
| `free-streaming-options` （2026-09-10 追加） | hub | 3 |
| `boxing-live-streaming` （2026-09-10 追加） | entry | 3 |
| `mma-live-streaming` （2026-09-10 追加） | entry | 3 |
| `music-live-streaming` （2026-09-10 追加） | entry | 3 |
| `emperors-cup-broadcast` （2026-09-14 追加） | entry | 2 |
| `soccer-free-broadcast` （2026-09-14 追加） | entry | 2 |
| `npb-postseason-broadcast` （2026-09-14 追加） | entry | 3 |
| `catchup-deadline-list` （2026-09-14 追加） | hub | 2 |
| **小計（この表の18記事）** | | **46** |
| `sports-streaming-tv-setup` （2026-09-14 追加） | conversion | 3 |
| `abema-premium-review` （2026-09-14 追加） | conversion | 3 |
| `skyperfectv-baseball-review` （2026-09-14 追加） | conversion | 3 |
| `unext-vs-hulu-price` （2026-09-14 追加） | conversion | 2 |
| **合計（実ファイル22記事）** | | **57** |

**全記事が「1記事あたり2〜3枠」の上限を守っている**（2026-09-14 に記事ファイルの `ad_slots` を数え直して確認）。

### 案件別の集計（提携申請の優先度）

**2026-09-14 に、記事ファイル22本の `ad_slots` から数え直した実測値。** 対象は実在する **57枠**（計画分は含まない。計画は §2）。

| 案件 | ASP候補 | 57枠のうち | 優先度 |
|---|---|---|---|
| **ABEMAプレミアム** | afb（第1候補）／A8.net（代替） | **27枠**（afb 20／A8.net 7） | **最優先。A8で先に通る可能性がある** |
| **スカパー！** | もしもアフィリエイト | **13枠** | 高。承認期間が長い見込みなので早めに申請 |
| **WOWOW** | afb（第1候補）／もしもアフィリエイト（代替） | **7枠**（afb 6／もしも 1） | 中 |
| **U-NEXT** | afb | **6枠** | 中（ただし通らない前提で計画） |
| **パ・リーグTV** | **3社での取扱いが未確認** | **4枠** | 管理画面で検索して判断。無ければ通常リンクにする |
| **DMM TV** | afb | **2枠** | 中。**計画の6枠から4枠を取りやめた**（理由は §2 の集計表の備考） |
| **Hulu** | afb | **1枠** | 低 |

※ 案件別の合計は **60** で、枠数57を3つ上回ります。`slot-compare` の3枠（#14 `soccer-streaming-services-hub`／#16 `baseball-streaming-services-hub`／`unext-vs-hulu-price`）が**同一枠に2案件を併記**しているためです。

---

## 2. まだ本文を書いていない記事の枠（計画）— **2026-09-14 に空になりました**

> **2026-09-10 追記（1回目）**: `plan.md` の20本には無かった `watch-on-tv` / `free-streaming-options` の2本を追加で執筆したため、その6枠は §1 に移りました。
>
> **2026-09-10 追記（2回目）**: `boxing-live-streaming` / `mma-live-streaming` / `music-live-streaming` も本文を書いたので、**この3本の行は §1（#29〜#37）に移しました。** 計画と違う枠にした理由は §1 の注記にあります。
>
> **2026-09-14 追記**: `emperors-cup-broadcast` / `soccer-free-broadcast` / `npb-postseason-broadcast` / `catchup-deadline-list` の本文も書いたので、**この4本の行は §1（#38〜#46）に移しました。** 計画から1枠だけ増やした理由（`npb-postseason-broadcast` の `slot-compare`）は §1 の注記にあります。
>
> **2026-09-14 追記（2回目・別担当）**: `sports-streaming-tv-setup` / `abema-premium-review` / `skyperfectv-baseball-review` / `unext-vs-hulu-price` の本文も書いたので、**この4本の行は §1（#47〜#57）に移しました。** 計画と違う枠にした理由（DMM TV 2枠の差し替えと `sports-streaming-tv-setup` の `slot-compare` 追加）は §1 の注記にあります。
>
> **これで §2 は空になりました。** 計画中の記事は1本も残っていません。`content/articles/*.md` に実在する22記事・57枠がすべてで、実測は §1 の集計です。

**`docs/ad-placement.md` §5 からの復元だった表は、全記事の執筆が済んだので下に「計画の記録」として畳んで残します。** 実際に入っている枠とは違うので、**参照するときは必ず §1 の実測を見てください。**

> なお §5 には、**書いた記事 `j-league-live-streaming` の `slot-hero`** についても行がある。案件は「（空欄）／動線なし」で、**結論はDAZN系だが DAZN は指定3ASPに無い見込みのため、提携できるまで枠そのものを置かない**という記録。実際に記事ファイルにこの枠は書かれていない（だから §1 の実測57枠に入っていない）。

**（以下は 2026-09-14 に本文を書く前の計画。実測は §1 #47〜#57。）**

| 記事 slug | role | 枠id | 案件 | ASP | 単価 | 計画時の状態 → 実際 |
|---|---|---|---|---|---|---|
| `sports-streaming-tv-setup` | conversion | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | 未確認 |
| | | `slot-footer` | DMM TV | afb | 要ログイン確認 | **→ WOWOW（afb）に差し替え**（本文でDMM TVに触れられなかった） |
| | | （計画に無し） | スカパー！ | もしもアフィリエイト | 要ログイン確認 | **→ `slot-compare` を追加**（早見表に出したため） |
| `abema-premium-review` | conversion | `slot-hero` | ABEMAプレミアム | afb | 要ログイン確認 | 未確認 |
| | | `slot-mid` | ABEMAプレミアム | afb | 要ログイン確認 | 広告つきプランとの違いを説明した直後 |
| | | `slot-footer` | ABEMAプレミアム | A8.net | 要ログイン確認 | afb が未提携の間の代替 |
| `skyperfectv-baseball-review` | conversion | `slot-hero` | スカパー！ | もしも | 要ログイン確認 | 未確認 |
| | | `slot-mid` | スカパー！ | もしも | 要ログイン確認 | 解約ルールを説明した直後 |
| | | `slot-footer` | DMM TV | afb | 要ログイン確認 | **→ パ・リーグTV（要確認）に差し替え**（本文でDMM TVに触れられなかった） |
| `unext-vs-hulu-price` | conversion | `slot-compare` | U-NEXT | afb | 要ログイン確認 | **クローズド案件化しているという第三者情報あり。提携できるまで置かない** |
| | | `slot-compare` | Hulu | afb | 要ログイン確認 | 未確認 |
| | | `slot-footer` | ABEMAプレミアム | afb | 要ログイン確認 | 2社とも未提携の間の受け皿 |

### 22記事ぜんぶを合わせた案件別の集計

> **2026-09-14 更新（2回目）。20本の計画にあった記事は全部書かれ、§2 の行はすべて §1 に移ったので、この集計はもう「実在分＋計画分」ではなく `content/articles/*.md` の実測そのものです。** §1 の「案件別の集計」と同じ表です。**どちらを見ても同じ値になるよう、更新するときは必ず両方を直してください。**

| 案件 | ASP候補 | 実在する57枠のうち | 優先度 |
|---|---|---|---|
| **ABEMAプレミアム** | afb（第1候補）／A8.net（代替） | **27枠**（afb 20／A8.net 7） | **最優先。A8で先に通る可能性がある** |
| **スカパー！** | もしも | **13枠** | 高。ただし承認期間が長い見込みなので早めに申請 |
| **WOWOW** | afb（第1候補）／もしも（代替） | **7枠**（afb 6／もしも 1） | 中 |
| **U-NEXT** | afb | **6枠** | 中（ただし通らない前提で計画） |
| **パ・リーグTV** | 3社での取扱いが未確認 | **4枠** | 管理画面で検索して判断 |
| **DMM TV** | afb（第1候補）／もしも（代替） | **2枠**（`soccer-streaming-services-hub` / `baseball-streaming-services-hub` の `slot-footer`） | 中。**計画では6枠あったが4枠取りやめ。** `mma-live-streaming` の2枠は公式ページに到達できず事実が1件も確認できなかったため（2026-09-10）。`sports-streaming-tv-setup` / `skyperfectv-baseball-review` の各1枠は、料金は確認できたものの**スポーツ・野球のラインアップと対応機器が確認できず本文で触れられなかった**ため（2026-09-14） |
| **Hulu** | afb | **1枠** | 低 |
| **DAZN** | 指定3ASPに無い見込み | **0枠** | 動線なし（`j-league-live-streaming` の `slot-hero` は記事ファイルに存在しない） |

**枠の実数は57、案件別の合計は60。** 差の3は、`soccer-streaming-services-hub` / `baseball-streaming-services-hub` / `unext-vs-hulu-price` の `slot-compare` が同一枠に2案件を併記しているぶんです。

---

## 3. 守ること

- **未提携の案件は、枠ごと置かずに公開する。** 「提携できていないから、代わりに別のサービスを勧める」という書き方をしない。読者にとって最良の答えと、自分が報酬を得られる案件が食い違うときは、**読者にとって最良の答えを書く。**
- **TVer の説明部分に広告を置かない。** TVer は完全無料。無料の説明のすぐ横に有料サービスを置くと、無料で済む読者を有料に誘導することになる。
- **バナー画像を貼らない。** このサイトは外部画像を一切読み込まない設計。テキストリンクを使う。
- **ASP が出したタグを書き換えない**（A8.net の禁止事項「広告素材の改変」）。`href` だけ抜き出して Markdown のリンクにしない。
- **提携が通ったら、この表の「要ログイン確認」を自分の管理画面の値で上書きする。** 同時に成果地点・却下条件・承認期間・リスティング可否・掲載NG媒体もメモする。
- 貼り方の手順は **`docs/ad-placement.md` §3-2**（`ad_slots` に `html:` を1行足すだけ。本文は触らない）。
