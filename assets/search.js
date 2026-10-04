/* みるまど - サイト内検索。依存なしの素の JavaScript。
   dist/search-index.json を取得して、タイトル / 説明 / カテゴリ /
   想定キーワード / 本文の書き出し を対象に絞り込みます。 */
(function () {
  'use strict';

  var input = document.getElementById('search-q');
  var results = document.getElementById('search-results');
  var status = document.getElementById('search-status');
  var form = input && input.form;
  if (!input || !results || !status) return;

  var index = null;
  var loadState = 'idle'; // idle | loading | ready | error
  var pending = null;

  /* ---------- 文字列の正規化 ---------- */
  function normalize(s) {
    s = String(s == null ? '' : s);
    if (String.prototype.normalize) s = s.normalize('NFKC');
    // カタカナ → ひらがな（表記ゆれの吸収）
    s = s.replace(/[ァ-ヶ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
    return s.toLowerCase();
  }

  function tokens(q) {
    return normalize(q)
      .split(/[\s　]+/)
      .filter(function (t) { return t.length > 0; });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ---------- 絞り込み ---------- */
  function score(item, ts) {
    var title = normalize(item.title);
    var keyword = normalize(item.keyword || '');
    var desc = normalize(item.description || '');
    var cat = normalize(item.category || '');
    var body = normalize(item.excerpt || '');
    var hay = title + ' ' + keyword + ' ' + desc + ' ' + cat + ' ' + body;

    var total = 0;
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i];
      if (hay.indexOf(t) === -1) return 0; // AND 検索
      if (title.indexOf(t) !== -1) total += 10;
      if (keyword.indexOf(t) !== -1) total += 6;
      if (cat.indexOf(t) !== -1) total += 4;
      if (desc.indexOf(t) !== -1) total += 3;
      if (body.indexOf(t) !== -1) total += 1;
    }
    return total;
  }

  /* ---------- 表示 ---------- */
  function highlight(text, ts) {
    var out = escapeHtml(text);
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i];
      if (!t) continue;
      // 正規化前の元テキストに対しては近似一致になるため、素直な部分一致のみ
      var re = new RegExp(escapeRe(t), 'gi');
      out = out.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
    }
    return out;
  }

  function render(list, q, ts) {
    results.innerHTML = '';
    if (!q) {
      status.textContent = 'キーワードを入力すると記事を絞り込めます。';
      return;
    }
    if (!list.length) {
      status.textContent = '「' + q + '」に一致する記事は見つかりませんでした。別の言葉や、下のカテゴリ一覧からお探しください。';
      return;
    }
    status.textContent = '「' + q + '」の検索結果: ' + list.length + ' 件';

    var html = '';
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      html +=
        '<li class="card">' +
        '<a class="card__thumb" href="' + escapeHtml(a.url) + '" tabindex="-1" aria-hidden="true"><img src="/assets/cat-' + escapeHtml(a.categorySlug) + '.svg" alt="" loading="lazy" width="640" height="320"></a>' +
        '<div class="card__body">' +
        '<p class="card__cat"><a href="/' + escapeHtml(a.categorySlug) + '/">' + escapeHtml(a.category) + '</a></p>' +
        '<h3 class="card__title"><a href="' + escapeHtml(a.url) + '">' + highlight(a.title, ts) + '</a></h3>' +
        '<p class="card__desc">' + highlight(a.description, ts) + '</p>' +
        '<p class="card__meta"><time datetime="' + escapeHtml(a.updated) + '">' + escapeHtml(a.updated) + '</time> 更新</p>' +
        '</div>' +
        '</li>';
    }
    results.innerHTML = html;
  }

  function run(q) {
    if (loadState === 'error') {
      status.textContent = '検索データを読み込めませんでした。カテゴリ一覧から探してください。';
      return;
    }
    if (loadState !== 'ready') {
      pending = q;
      if (loadState === 'idle') load();
      else status.textContent = '検索データを読み込んでいます…';
      return;
    }
    var ts = tokens(q);
    if (!ts.length) {
      render([], '', ts);
      return;
    }
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var s = score(index[i], ts);
      if (s > 0) hits.push({ item: index[i], s: s });
    }
    hits.sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      return a.item.updated < b.item.updated ? 1 : -1;
    });
    render(
      hits.map(function (h) { return h.item; }),
      q,
      ts
    );
  }

  function load() {
    loadState = 'loading';
    status.textContent = '検索データを読み込んでいます…';
    fetch('/search-index.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        index = Array.isArray(data) ? data : [];
        loadState = 'ready';
        run(pending != null ? pending : input.value);
        pending = null;
      })
      .catch(function () {
        loadState = 'error';
        status.textContent = '検索データを読み込めませんでした。カテゴリ一覧から探してください。';
      });
  }

  /* ---------- 起動 ---------- */
  function queryFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch (e) {
      var m = /[?&]q=([^&]*)/.exec(window.location.search);
      return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    }
  }

  var initial = queryFromUrl();
  if (initial) input.value = initial;

  // ヘッダの検索ボックスにも同じ語を入れておく
  var headerInput = document.getElementById('q');
  if (headerInput && initial) headerInput.value = initial;

  var timer = null;
  input.addEventListener('input', function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      var q = input.value.trim();
      run(q);
      try {
        var url = q ? '/search/?q=' + encodeURIComponent(q) : '/search/';
        window.history.replaceState(null, '', url);
      } catch (e) { /* file:// などでは無視 */ }
    }, 120);
  });

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = input.value.trim();
      run(q);
      try {
        window.history.replaceState(null, '', q ? '/search/?q=' + encodeURIComponent(q) : '/search/');
      } catch (e) { /* noop */ }
    });
  }

  load();
})();
