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
