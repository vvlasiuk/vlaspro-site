/* VLASPRO — єдиний скрипт сайту: поведінка смуги меню, поява блоків при
   прокрутці, проявлення мініатюр, смуга прогресу і слайдер презентації.
   Без JS сторінка повністю робоча: смуга лишається без тіні, блоки стоять
   на місці видимими, а слайди гортаються як горизонтальна стрічка. */
(function () {
  'use strict';

  /* Одна перевірка на весь файл. Якщо в системі просять менше руху, поява
     блоків і притемнення кадрів не вмикаються — не «швидше», а зовсім. */
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Обгортка, щоб обробник прокрутки працював не частіше за кадр. */
  var raf = function (fn) {
    var tick = false;
    return function () {
      if (tick) return;
      tick = true;
      window.requestAnimationFrame(function () { tick = false; fn(); });
    };
  };

  /* --- смуга меню --------------------------------------------------------
     Смуга темна, сторінка світла, а її нижня рамка — біла напівпрозора,
     тобто на світлому тлі невидима. Поки сторінка не прокручена, смуга
     має лежати на тлі; щойно контент заходить під неї — стає верхнім
     шаром із тінню. Висота підбирається пізніше, на 120 px: біля самого
     верху зміна висоти давала б помітний стрибок контенту під смугою. */
  var head = document.querySelector('.site-head');
  if (head) {
    var stuck = null;
    var compact = null;
    var syncHead = raf(function () {
      var y = window.pageYOffset;
      var nowStuck = y > 4;
      if (nowStuck !== stuck) {
        stuck = nowStuck;
        head.classList.toggle('is-stuck', nowStuck);
      }
      var nowCompact = y > 120;
      if (nowCompact !== compact) {
        compact = nowCompact;
        head.classList.toggle('is-compact', nowCompact);
      }
    });
    window.addEventListener('scroll', syncHead, { passive: true });
    syncHead();
  }

  /* --- поява блоків при прокрутці ----------------------------------------
     Блок, що заходить знизу, проявляється і трохи підіймається. Те, що вже
     на екрані при завантаженні, не ховаємо взагалі: скрипт виконується
     після розбору сторінки, і перший екран встиг би блимнути. Клас
     знімається, щойно поява відіграла, — інакше .reveal.is-in переважив би
     за специфічністю transform наведення на плитці. */
  if (!calm && 'IntersectionObserver' in window) {
    var items = [].slice.call(document.querySelectorAll(
      '.section__head, .grid > *, .flow__step, .jump__list li, .card, .callout, ' +
      '.trybot, .slider, .case__grid > *:not(.case__media), .faq details.more'
    ));

    /* лишаємо тільки зовнішні блоки: якщо картка вже проявляється, її
       внутрішня сітка не має проявлятися вдруге */
    items = items.filter(function (el) {
      return !items.some(function (other) { return other !== el && other.contains(el); });
    });

    var vh = window.innerHeight || document.documentElement.clientHeight;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) {
          /* Блок опинився вище екрана, так і не показавшись: перехід за
             якорем, відновлена позиція прокрутки, різкий стрибок униз.
             Показуємо одразу, без анімації, — інакше він лишиться
             невидимим, доки до нього не прокрутять назад. */
          if (e.boundingClientRect.bottom < 0) {
            io.unobserve(e.target);
            e.target.style.transitionDelay = '';
            e.target.classList.remove('reveal');
          }
          return;
        }
        io.unobserve(e.target);
        e.target.classList.add('is-in');
        window.setTimeout(function () {
          e.target.classList.remove('reveal', 'is-in');
          e.target.style.transitionDelay = '';
        }, 1000);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh) return;
      el.classList.add('reveal');
      var sibs = el.parentNode ? [].slice.call(el.parentNode.children) : [];
      var i = sibs.indexOf(el);
      /* ряд плиток набігає, а не з'являється стіною; більше чотирьох кроків
         не робимо — чекати на останню картку вже помітно */
      if (i > 0) el.style.transitionDelay = Math.min(i, 4) * 60 + 'ms';
      io.observe(el);
    });
  }

  /* --- мініатюри ---------------------------------------------------------
     Проявляємо лише ті картинки, які на момент запуску ще не завантажені.
     Уже намальована картинка класу не отримує й не блимає. */
  [].slice.call(document.querySelectorAll('.tile__thumb img')).forEach(function (img) {
    if (img.complete && img.naturalWidth) return;
    img.classList.add('is-fading');
    var done = function () { img.classList.add('is-loaded'); };
    img.addEventListener('load', done);
    img.addEventListener('error', done);
  });

  /* --- смуга прогресу ----------------------------------------------------
     Тільки на довгих сторінках — тих, де є кейси або список переходів.
     На головній і контактах вона була б ні про що. */
  if (document.querySelector('.case, .jump__list')) {
    var bar = document.createElement('div');
    bar.className = 'readbar';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var drawBar = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, window.pageYOffset / h)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    };
    var queueBar = raf(drawBar);
    window.addEventListener('scroll', queueBar, { passive: true });
    window.addEventListener('resize', queueBar);
    drawBar();
  }

  /* --- слайдер презентації ----------------------------------------------- */
  document.querySelectorAll('[data-slider]').forEach(function (root) {
    var view  = root.querySelector('[data-slider-viewport]');
    var prev  = root.querySelector('[data-slider-prev]');
    var next  = root.querySelector('[data-slider-next]');
    var count = root.querySelector('[data-slider-count]');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.slider__slide'));
    if (!view || !slides.length) return;

    var index = 0;
    /* Притемнення сусідніх кадрів існує тільки зі скриптом: без нього клас
       не з'явиться і всі кадри лишаться звичайними. */
    root.classList.add('is-js');

    function render() {
      if (count) count.textContent = (index + 1) + ' / ' + slides.length;
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
      slides.forEach(function (s, i) { s.classList.toggle('is-current', i === index); });
      // Warm up the neighbouring slide so swiping never shows an empty frame.
      var near = slides[index + 1] && slides[index + 1].querySelector('img');
      if (near) near.loading = 'eager';
    }

    function go(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      // Measured from the live boxes, so it works whatever the offsetParent is.
      var delta = slides[index].getBoundingClientRect().left - view.getBoundingClientRect().left;
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
