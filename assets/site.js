/* みるまど - 画面の動き（依存なし）。
   ・スクロールでヘッダーに影をつける
   ・記事ページの読み進み具合バー
   ・「ページ上部へ」ボタンの表示
   ・カードがふわっと出てくる演出（「視差効果を減らす」設定の人には出さない） */
(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('[data-header]');
  var bar = document.querySelector('.progress__bar');
  var toTop = document.querySelector('.to-top');
  var isArticle = document.body.classList.contains('page-article');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (toTop) toTop.classList.toggle('is-shown', y > 600);
      if (bar && isArticle) {
        var max = root.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.min(1, y / max) : 0;
        bar.style.transform = 'scaleX(' + p + ')';
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  // 現在のカテゴリのタブを、横スクロールの見える位置へ
  var current = document.querySelector('.catbar [aria-current="page"]');
  if (current && current.scrollIntoView && current.offsetLeft > window.innerWidth * 0.6) {
    var inner = current.parentNode;
    inner.scrollLeft = current.offsetLeft - 16;
  }

  // ---- トップのプレビュー（自動で切り替わる大バナー） ----
  var preview = document.querySelector('[data-preview]');
  if (preview) {
    var slides = preview.querySelectorAll('.preview__slide');
    var dots = preview.querySelectorAll('.preview__dot');
    var pauseBtn = preview.querySelector('.preview__pause');
    var idx = 0;
    var timer = null;
    var paused = reduce; // 動きを減らす設定なら自動送りしない
    var DURATION = 6500;
    preview.style.setProperty('--dur', DURATION + 'ms');

    var show = function (n) {
      idx = (n + slides.length) % slides.length;
      for (var k = 0; k < slides.length; k++) {
        var on = k === idx;
        slides[k].classList.toggle('is-active', on);
        if (on) slides[k].removeAttribute('aria-hidden');
        else slides[k].setAttribute('aria-hidden', 'true');
        var links = slides[k].querySelectorAll('a');
        for (var m = 0; m < links.length; m++) {
          if (on) links[m].removeAttribute('tabindex');
          else links[m].setAttribute('tabindex', '-1');
        }
        if (dots[k]) {
          dots[k].classList.remove('is-active');
          if (on) {
            void dots[k].offsetWidth; // 進み具合アニメーションを最初から
            dots[k].classList.add('is-active');
          }
        }
      }
    };
    var start = function () {
      clearInterval(timer);
      if (!paused && slides.length > 1) timer = setInterval(function () { show(idx + 1); }, DURATION);
    };
    for (var d = 0; d < dots.length; d++) {
      dots[d].addEventListener('click', function () {
        show(parseInt(this.getAttribute('data-go'), 10));
        start();
      });
    }
    if (pauseBtn) {
      if (paused) {
        pauseBtn.setAttribute('aria-pressed', 'true');
        preview.classList.add('is-paused');
      }
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        pauseBtn.setAttribute('aria-label', paused ? '自動切り替えを再開' : '自動切り替えを一時停止');
        preview.classList.toggle('is-paused', paused);
        start();
      });
    }
    preview.addEventListener('mouseenter', function () { clearInterval(timer); preview.classList.add('is-hover'); });
    preview.addEventListener('mouseleave', function () { preview.classList.remove('is-hover'); start(); });
    // スワイプで送る
    var sx = null;
    preview.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    preview.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { show(idx + (dx < 0 ? 1 : -1)); start(); }
      sx = null;
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearInterval(timer); else start(); });
    start();
  }

  // ---- 横一列のサムネ: 左右ボタンでスクロール ----
  var navs = document.querySelectorAll('.row__nav');
  for (var r = 0; r < navs.length; r++) {
    navs[r].addEventListener('click', function () {
      var track = this.parentNode.querySelector('.row__track');
      var dir = parseInt(this.getAttribute('data-dir'), 10);
      track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('is-visible');
    return;
  }
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );
  for (var j = 0; j < items.length; j++) {
    items[j].style.transitionDelay = Math.min(j % 6, 5) * 60 + 'ms';
    io.observe(items[j]);
  }
})();
