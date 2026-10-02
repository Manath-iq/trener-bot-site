/* ==========================================================================
   Дарья Ситдикова — trener-bot-site
   Vanilla interaction layer. No dependencies, no build step.
   --------------------------------------------------------------------------
   Modules: config, utils, media-slots, marquee, reveal, parallax, tilt,
   magnetic, nav, burger, progress, pricing, reviews, faq, ring, modal+form,
   sticky bar, back-to-top, misc.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- CONFIG */
  var CONFIG = {
    telegram: 'daria_fit_nk',
    phone: '+79172684103',
    price: { trial: '1 275 ₽', trialOld: '1 500 ₽' },
    revealThreshold: 0.16,
    breakpoints: { navSolid: 40, stickyBar: 520, backToTop: 900 }
  };

  /* -------------------------------------------------------------- UTILS */
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function on(el, type, handler, opts) {
    if (!el) return;
    el.addEventListener(type, handler, opts || false);
  }

  /* rAF-throttled scroll subscriber bus */
  var scrollSubs = [];
  var scrollQueued = false;
  function onScroll(fn) {
    scrollSubs.push(fn);
    fn(window.scrollY || window.pageYOffset || 0);
  }
  function flushScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    for (var i = 0; i < scrollSubs.length; i++) {
      try { scrollSubs[i](y); } catch (e) { /* keep the loop alive */ }
    }
    scrollQueued = false;
  }
  on(window, 'scroll', function () {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(flushScroll);
  }, { passive: true });
  on(window, 'resize', function () { if (!scrollQueued) { scrollQueued = true; window.requestAnimationFrame(flushScroll); } }, { passive: true });

  function clamped(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }

  /* -------------------------------------------------------- MEDIA SLOTS */
  /* Every image is a slot: if the file is missing we keep the designed
     placeholder instead of showing a broken icon. Drop the real PNG into
     assets/img/ and it appears on the next load. */
  function initMediaSlots() {
    var missing = [];

    $$('[data-cutout] img').forEach(function (img) {
      var host = img.closest('[data-cutout]');
      var ready = function () {
        host.classList.add('is-ready');
        host.classList.remove('is-missing');
      };
      var failed = function () {
        host.classList.add('is-missing');
        missing.push(img.getAttribute('src'));
      };
      if (img.complete) {
        if (img.naturalWidth > 0) ready(); else failed();
      } else {
        on(img, 'load', ready, { once: true });
        on(img, 'error', failed, { once: true });
      }
    });

    $$('[data-avatar]').forEach(function (img) {
      var host = img.closest('.contact__ava');
      var ready = function () { host.classList.add('is-ready'); };
      var failed = function () { missing.push(img.getAttribute('src')); };
      if (img.complete) {
        if (img.naturalWidth > 0) ready(); else failed();
      } else {
        on(img, 'load', ready, { once: true });
        on(img, 'error', failed, { once: true });
      }
    });

    if (missing.length) {
      console.info(
        '[trener-bot-site] Слотов без картинок: ' + missing.length + '\n' +
        missing.map(function (s) { return '  · ' + s; }).join('\n') +
        '\nПромты для генерации — в README.md, раздел «Картинки».'
      );
    }
  }

  /* ------------------------------------------------------------ MARQUEE */
  function initMarquee() {
    var track = $('[data-marquee]');
    if (!track || reduced.matches) return;

    var seed = track.innerHTML;
    function fill() {
      track.innerHTML = seed;
      var base = track.scrollWidth;
      if (!base) return;
      var copies = Math.max(1, Math.ceil((window.innerWidth * 2) / base));
      var out = seed;
      for (var i = 0; i < copies; i++) out += seed;
      track.innerHTML = out;
    }
    fill();

    var t;
    on(window, 'resize', function () {
      window.clearTimeout(t);
      t = window.setTimeout(fill, 220);
    }, { passive: true });
  }

  /* ------------------------------------------------------------- REVEAL */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || reduced.matches) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: CONFIG.revealThreshold, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------- PARALLAX */
  function initParallax() {
    var nodes = $$('[data-parallax]');
    if (!nodes.length || reduced.matches) return;

    var items = nodes.map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.08 };
    });

    function frame() {
      var vh = window.innerHeight;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var rect = it.el.getBoundingClientRect();
        if (rect.bottom < -220 || rect.top > vh + 220) continue;
        var centre = rect.top + rect.height / 2 - vh / 2;
        it.el.style.setProperty('--py', (-centre * it.speed).toFixed(2) + 'px');
      }
    }

    onScroll(frame);
    window.requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------------- TILT */
  function initTilt() {
    if (!finePointer.matches || reduced.matches) return;

    $$('[data-tilt]').forEach(function (el) {
      var raf = null, tx = 0, ty = 0;

      function apply() {
        el.style.setProperty('--tx', tx.toFixed(2) + 'deg');
        el.style.setProperty('--ty', ty.toFixed(2) + 'deg');
        raf = null;
      }

      on(el, 'pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tx = clamped(-py * 11, -11, 11);
        ty = clamped(px * 13, -13, 13);
        if (!raf) raf = window.requestAnimationFrame(apply);
      });

      on(el, 'pointerleave', function () {
        tx = 0; ty = 0;
        if (!raf) raf = window.requestAnimationFrame(apply);
      });
    });
  }

  /* ----------------------------------------------------------- MAGNETIC */
  function initMagnetic() {
    if (!finePointer.matches || reduced.matches) return;

    $$('[data-magnetic]').forEach(function (el) {
      var raf = null, mx = 0, my = 0, strength = 0.22;

      function apply() {
        el.style.setProperty('--mx', mx.toFixed(2) + 'px');
        el.style.setProperty('--my', my.toFixed(2) + 'px');
        raf = null;
      }

      on(el, 'pointermove', function (e) {
        var r = el.getBoundingClientRect();
        mx = clamped((e.clientX - (r.left + r.width / 2)) * strength, -14, 14);
        my = clamped((e.clientY - (r.top + r.height / 2)) * strength, -10, 10);
        if (!raf) raf = window.requestAnimationFrame(apply);
      });

      on(el, 'pointerleave', function () {
        mx = 0; my = 0;
        if (!raf) raf = window.requestAnimationFrame(apply);
      });
    });
  }

  /* ---------------------------------------------------------------- NAV */
  function initNav() {
    var nav = $('[data-nav]');
    var burger = $('[data-burger]');
    var panel = $('[data-nav-panel]');
    if (!nav) return;

    onScroll(function (y) {
      nav.classList.toggle('nav--solid', y > CONFIG.breakpoints.navSolid);
    });

    if (!burger || !panel) return;

    var open = false;
    function setMenu(next) {
      open = next;
      burger.setAttribute('aria-expanded', String(open));
      if (open) {
        panel.hidden = false;
        burger.querySelector('use').setAttribute('href', '#i-close');
      } else {
        panel.hidden = true;
        burger.querySelector('use').setAttribute('href', '#i-menu');
      }
    }

    on(burger, 'click', function () { setMenu(!open); });
    $$('a', panel).forEach(function (a) { on(a, 'click', function () { setMenu(false); }); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape' && open) setMenu(false); });
    window.addEventListener('resize', function () {
      if (open && window.innerWidth >= 1024) setMenu(false);
    }, { passive: true });
  }

  /* ----------------------------------------------------------- PROGRESS */
  function initProgress() {
    var bar = $('[data-progress]');
    if (!bar) return;
    onScroll(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamped(window.scrollY / max, 0, 1) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    });
  }

  /* ------------------------------------------------------------ PRICING */
  function initPricing() {
    var wrap = $('[data-billing-switch]');
    if (!wrap) return;
    var buttons = $$('[data-billing-btn]', wrap);

    function setMode(mode) {
      document.documentElement.setAttribute('data-billing', mode);
      wrap.setAttribute('data-active', mode);
      buttons.forEach(function (b) {
        b.setAttribute('aria-checked', String(b.getAttribute('data-billing-btn') === mode));
      });
    }

    buttons.forEach(function (b) {
      on(b, 'click', function () { setMode(b.getAttribute('data-billing-btn')); });
      on(b, 'keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        var next = b.getAttribute('data-billing-btn') === 'single' ? 'pack' : 'single';
        setMode(next);
        var target = buttons.filter(function (x) { return x.getAttribute('data-billing-btn') === next; })[0];
        if (target) target.focus();
      });
    });

    setMode('single');
  }

  /* ------------------------------------------------------------ REVIEWS */
  function initReviews() {
    var root = $('[data-reviews]');
    if (!root) return;

    var track = $('[data-rev-track]', root);
    var dotsBox = $('[data-rev-dots]', root);
    var prev = $('[data-rev-prev]');
    var next = $('[data-rev-next]');
    var cards = $$('.review', track);
    if (!track || !cards.length) return;

    /* dots */
    var dots = [];
    if (dotsBox) {
      cards.forEach(function (card, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', 'Отзыв ' + (i + 1) + ' из ' + cards.length);
        on(b, 'click', function () { scrollToCard(i); });
        dotsBox.appendChild(b);
        dots.push(b);
      });
    }

    function activeIndex() {
      var mid = track.scrollLeft + track.clientWidth / 2;
      var best = 0, bestDist = Infinity;
      cards.forEach(function (card, i) {
        var c = card.offsetLeft + card.offsetWidth / 2;
        var d = Math.abs(c - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    function scrollToCard(i) {
      var card = cards[clamped(i, 0, cards.length - 1)];
      track.scrollTo({
        left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
        behavior: reduced.matches ? 'auto' : 'smooth'
      });
    }

    function sync() {
      var i = activeIndex();
      dots.forEach(function (d, di) {
        d.classList.toggle('is-active', di === i);
        d.setAttribute('aria-selected', String(di === i));
      });
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    }

    on(track, 'scroll', function () {
      window.clearTimeout(track._t);
      track._t = window.setTimeout(sync, 60);
    }, { passive: true });

    on(prev, 'click', function () { scrollToCard(activeIndex() - 1); });
    on(next, 'click', function () { scrollToCard(activeIndex() + 1); });

    on(track, 'keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollToCard(activeIndex() + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollToCard(activeIndex() - 1); }
    });

    /* drag to pan (mouse only — touch already scrolls natively) */
    var down = false, startX = 0, startScroll = 0, moved = false;
    on(track, 'pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    on(window, 'pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startScroll - dx;
      e.preventDefault();
    });
    on(window, 'pointerup', function () {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
      if (moved) scrollToCard(activeIndex());
    });
    on(track, 'click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

    sync();
    window.requestAnimationFrame(sync);
  }

  /* ---------------------------------------------------------------- FAQ */
  function initFaq() {
    $$('[data-faq] .faq__item').forEach(function (item) {
      var btn = $('.faq__q', item);
      if (!btn) return;
      on(btn, 'click', function () {
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* --------------------------------------------------------------- RING */
  function initRing() {
    var ring = $('[data-ring]');
    if (!ring) return;
    var total = 2 * Math.PI * 52;
    ring.style.strokeDasharray = total.toFixed(1);

    if (!('IntersectionObserver' in window)) {
      ring.style.strokeDashoffset = (total * 0.13).toFixed(1);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        ring.style.strokeDashoffset = (total * 0.13).toFixed(1);
        io.disconnect();
      });
    }, { threshold: 0.4 });
    io.observe(ring);
  }

  /* ------------------------------------------------------- MODAL + FORM */
  function initModal() {
    var modal = $('[data-modal]');
    if (!modal) return;

    var box = $('[data-modal-box]', modal);
    var stepForm = $('[data-step="form"]', modal);
    var stepDone = $('[data-step="done"]', modal);
    var form = $('[data-form]', modal);
    var submit = $('[data-submit]', modal);
    var submitLabel = $('[data-submit-label]', modal);
    var preview = $('[data-preview]', modal);
    var tgOpen = $('[data-tg-open]', modal);
    var copyBtn = $('[data-copy]', modal);
    var copyLabel = $('[data-copy-label]', modal);
    var lastFocus = null;
    var lastMessage = '';

    /* --- open / close --- */
    function openModal(preset) {
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add('is-locked');
      window.requestAnimationFrame(function () { modal.classList.add('is-open'); });

      if (preset) {
        var goal = $('#f-goal', modal);
        if (goal && !goal.value) goal.value = preset;
      }
      window.setTimeout(function () {
        var first = stepDone.hidden ? $('#f-name', modal) : tgOpen;
        if (first) first.focus();
      }, 90);
    }

    function closeModal() {
      modal.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        modal.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }, 320);
    }

    $$('[data-open-modal]').forEach(function (btn) {
      on(btn, 'click', function () { openModal(btn.getAttribute('data-preset')); });
    });
    $$('[data-modal-close]').forEach(function (btn) { on(btn, 'click', closeModal); });

    on(document, 'keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key !== 'Tab') return;
      var focusables = $$('a[href], button:not([disabled]), input, select, textarea', box)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* --- validation --- */
    function fieldOf(input) { return input.closest('.field'); }

    function setError(input, on_) {
      var field = fieldOf(input);
      if (!field) return;
      field.classList.toggle('has-error', on_);
      var msg = $('[data-error-for="' + input.name + '"]', field);
      if (msg) msg.hidden = !on_;
      input.setAttribute('aria-invalid', String(on_));
    }

    function validate() {
      var name = $('#f-name', modal);
      var contact = $('#f-contact', modal);
      var bad = [];

      var nameOk = name.value.trim().length >= 2;
      setError(name, !nameOk);
      if (!nameOk) bad.push(name);

      var contactOk = contact.value.trim().length >= 5;
      setError(contact, !contactOk);
      if (!contactOk) bad.push(contact);

      return bad;
    }

    $$('#f-name, #f-contact', modal).forEach(function (input) {
      on(input, 'input', function () { if (fieldOf(input).classList.contains('has-error')) setError(input, false); });
      on(input, 'blur', function () {
        var v = input.value.trim();
        if (!v) return;
        if (input.name === 'name') setError(input, v.length < 2);
        if (input.name === 'contact') setError(input, v.length < 5);
      });
    });

    /* --- message --- */
    function buildMessage(preset) {
      var format = ($('input[name="format"]:checked', modal) || {}).value || 'Персональная тренировка';
      var name = $('#f-name', modal).value.trim();
      var contact = $('#f-contact', modal).value.trim();
      var when = $('#f-when', modal).value;
      var goal = $('#f-goal', modal).value.trim();

      var lines = [
        'Заявка на тренировку',
        '',
        'Формат: ' + format,
        'Имя: ' + name,
        'Связь: ' + contact,
        'Удобное время: ' + when
      ];
      if (goal) lines.push('Цель: ' + goal);
      lines.push('', 'Отправлено с сайта trener-bot-site');
      return lines.join('\n');
    }

    on(form, 'submit', function (e) {
      e.preventDefault();
      var bad = validate();
      if (bad.length) {
        bad[0].focus();
        box.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
        return;
      }

      var preset = $('#f-goal', modal).value.trim();
      submit.classList.add('is-loading');
      submit.disabled = true;
      submitLabel.textContent = 'Собираю…';

      window.setTimeout(function () {
        lastMessage = buildMessage(preset);

        copyText(lastMessage).catch(function () { /* clipboard may be blocked — user can copy manually */ });

        if (preview) preview.textContent = lastMessage;
        if (tgOpen) {
          tgOpen.href = 'https://t.me/' + CONFIG.telegram + '?text=' + encodeURIComponent(lastMessage);
        }

        stepForm.hidden = true;
        stepDone.hidden = false;

        submit.classList.remove('is-loading');
        submit.disabled = false;
        submitLabel.textContent = 'Собрать заявку';

        if (tgOpen) tgOpen.focus();
        box.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
      }, 700);
    });

    on(copyBtn, 'click', function () {
      copyText(lastMessage).then(function () {
        copyLabel.textContent = 'Скопировано';
        window.setTimeout(function () { copyLabel.textContent = 'Скопировать ещё раз'; }, 1800);
      }).catch(function () {
        copyLabel.textContent = 'Выделите текст вручную';
        if (preview && window.getSelection) {
          var range = document.createRange();
          range.selectNodeContents(preview);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
    });
  }

  /* --------------------------------------------- STICKY BAR / BACK TO TOP */
  function initFloaters() {
    var bar = $('[data-stickybar]');
    var top = $('[data-totop]');
    var hero = $('#hero');

    /* keep the back-to-top button clear of the sticky bar, whatever its height */
    function measureBar() {
      if (!bar) return;
      document.documentElement.style.setProperty('--stickybar-h', bar.offsetHeight + 'px');
    }
    measureBar();
    var mt;
    on(window, 'resize', function () {
      window.clearTimeout(mt);
      mt = window.setTimeout(measureBar, 150);
    }, { passive: true });

    function paint(y) {
      var heroBottom = hero ? hero.offsetTop + hero.offsetHeight - 260 : CONFIG.breakpoints.stickyBar;

      if (bar) {
        var showBar = y > heroBottom;
        if (showBar && bar.hidden) { bar.hidden = false; measureBar(); }
        if (!showBar && !bar.hidden) bar.hidden = true;
        bar.classList.toggle('is-shown', showBar);
      }
      if (top) {
        // never let the back-to-top button appear before the sticky bar it sits above
        var showTop = y > Math.max(CONFIG.breakpoints.backToTop, heroBottom);
        if (showTop && top.hidden) top.hidden = false;
        if (!showTop && !top.hidden) top.hidden = true;
        top.classList.toggle('is-shown', showTop);
      }
    }

    onScroll(paint);

    on(top, 'click', function () {
      window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    });
  }

  /* --------------------------------------------------------------- MISC */
  function initMisc() {
    var year = $('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());

    $$('[data-call]').forEach(function (btn) {
      on(btn, 'click', function () { window.location.href = 'tel:' + CONFIG.phone; });
    });

    /* smooth anchor scrolling with the fixed header offset (fallback path) */
    $$('a[href^="#"]').forEach(function (a) {
      on(a, 'click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 84;
        window.scrollTo({ top: top, behavior: reduced.matches ? 'auto' : 'smooth' });
        if (history.replaceState) history.replaceState(null, '', id);
      });
    });
  }

  /* ---------------------------------------------------------------- BOOT */
  function boot() {
    initMediaSlots();
    initMarquee();
    initReveal();
    initParallax();
    initTilt();
    initMagnetic();
    initNav();
    initProgress();
    initPricing();
    initReviews();
    initFaq();
    initRing();
    initModal();
    initFloaters();
    initMisc();
    document.documentElement.classList.add('is-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
