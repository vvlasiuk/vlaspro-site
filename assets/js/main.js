/* VLASPRO — єдиний скрипт сайту: тінь під смугою меню при прокрутці
   та слайдер презентації. Без JS сторінка повністю робоча: смуга просто
   лишається без тіні, а слайди гортаються як горизонтальна стрічка. */
(function () {
  'use strict';

  /* --- тінь під закріпленою смугою меню ---------------------------------
     Смуга темна, сторінка світла, а її нижня рамка — біла напівпрозора,
     тобто на світлому тлі невидима. Поки сторінка не прокручена, смуга
     має лежати на тлі; щойно контент заходить під неї — стає верхнім
     шаром із тінню. */
  var head = document.querySelector('.site-head');
  if (head) {
    var stuck = null;
    var tick = false;
    var sync = function () {
      tick = false;
      var now = window.pageYOffset > 4;
      if (now === stuck) return;
      stuck = now;
      head.classList.toggle('is-stuck', now);
    };
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      window.requestAnimationFrame(sync);
    }, { passive: true });
    sync();
  }

  document.querySelectorAll('[data-slider]').forEach(function (root) {
    var view  = root.querySelector('[data-slider-viewport]');
    var prev  = root.querySelector('[data-slider-prev]');
    var next  = root.querySelector('[data-slider-next]');
    var count = root.querySelector('[data-slider-count]');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.slider__slide'));
    if (!view || !slides.length) return;

    var index = 0;

    function render() {
      if (count) count.textContent = (index + 1) + ' / ' + slides.length;
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
      // Warm up the neighbouring slide so swiping never shows an empty frame.
      var near = slides[index + 1] && slides[index + 1].querySelector('img');
      if (near) near.loading = 'eager';
    }

    function go(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      // Measured from the live boxes, so it works whatever the offsetParent is.
      var delta = slides[index].getBoundingClientRect().left - view.getBoundingClientRect().left;
      var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      view.scrollBy({ left: delta, behavior: calm ? 'auto' : 'smooth' });
      render();
    }

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });

    view.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    });

    // Keep the counter in sync with manual swiping / scrolling.
    var t;
    view.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var mid = view.scrollLeft + view.clientWidth / 2;
        var best = 0, bestD = Infinity;
        slides.forEach(function (s, i) {
          var c = s.offsetLeft - view.offsetLeft + s.offsetWidth / 2;
          var d = Math.abs(c - mid);
          if (d < bestD) { bestD = d; best = i; }
        });
        index = best;
        render();
      }, 90);
    }, { passive: true });

    render();
  });
})();
