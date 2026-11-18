/* Loom Wave International — /start landing page */
(function () {
  'use strict';
  var d = document, root = d.documentElement, w = window;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduced = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var touch = !fine;   // phones and tablets: lighter effects, nothing that competes with scrolling
  var portrait = w.matchMedia('(max-aspect-ratio: 1/1)');
  var hasGsap = !!(w.gsap && w.ScrollTrigger);
  var hasIO = 'IntersectionObserver' in w;
  if (reduced || !hasGsap) root.classList.add('rm');
  if (hasGsap) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); }

  /* ---------- tracking ---------- */
  function track(name, params, standard) {
    params = params || {};
    try {
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push(Object.assign({ event: name }, params));
      if (typeof w.fbq === 'function') {
        w.fbq('trackCustom', name, params);
        if (standard) w.fbq('track', standard, params);
      }
    } catch (e) { /* tracking must never break the page */ }
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (a.classList.contains('js-wa')) track('WhatsAppClick', { location: a.dataset.loc || '' }, 'Contact');
    else if (a.classList.contains('js-ig')) track('InstagramClick', { location: a.dataset.loc || '' });
    else if (a.classList.contains('js-site')) track('WebsiteClick', { location: a.dataset.loc || '' });
  });
  var depthSent = {};
  function depth() {
    var pct = (w.scrollY / docMax) * 100;   // docMax is measured once, not on every scroll
    [25, 50, 75, 100].forEach(function (m) {
      if (!depthSent[m] && pct >= m - 0.5) { depthSent[m] = 1; track('ScrollDepth' + m, { percent: m }); }
    });
  }
  w.addEventListener('scroll', depth, { passive: true });

  /* ---------- page chrome: progress line, compact header after the hero, sticky button ---------- */
  var heroEl = $('.hero'), bar = $('.progress i'), heroH = 0, docMax = 1, heroCta = true, chromeQueued = false, lastW = w.innerWidth, wChanged = true;
  function measure() {
    heroH = heroEl ? heroEl.offsetHeight : 0;
    docMax = Math.max(1, d.documentElement.scrollHeight - w.innerHeight);
  }
  function chrome() {
    chromeQueued = false;
    var y = w.scrollY;
    if (bar) bar.style.transform = 'scaleX(' + Math.min(1, y / docMax).toFixed(4) + ')';
    root.classList.toggle('is-stuck', y > heroH - 140);
    root.classList.toggle('hero-cta', heroCta && y < heroH - w.innerHeight * 0.55);
  }
  function queueChrome() { if (!chromeQueued) { chromeQueued = true; requestAnimationFrame(chrome); } }
  measure(); chrome();
  w.addEventListener('scroll', queueChrome, { passive: true });
  // registered first, so every later resize handler can tell a real resize from a phone's address bar sliding away
  w.addEventListener('resize', function () { wChanged = w.innerWidth !== lastW; lastW = w.innerWidth; measure(); queueChrome(); });

  /* ---------- run non-critical setup in separate tasks so the main thread stays free ---------- */
  var tasks = [];
  function later(fn) { tasks.push(fn); }

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduced && hasGsap && w.Lenis && fine) {   // touch screens keep their own native scrolling
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { duration: 1.8 }); else t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------- word splitting + reveals ---------- */
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
            var o = d.createElement('span'); o.className = 'w';
            var s = d.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            o.appendChild(s); frag.appendChild(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    })(el);
  }
  $$('[data-words]').forEach(function (el) { el.setAttribute('aria-label', el.textContent.trim()); splitWords(el); });
  // hero headline words are already marked up; wrap their content for the mask
  $$('.hero__stage--1 .w').forEach(function (o, i) {
    var s = d.createElement('span'); s.style.setProperty('--i', i);
    while (o.firstChild) s.appendChild(o.firstChild);
    o.appendChild(s);
  });
  $$('[data-stagger],.hero__stage--2,.hero__stage--3').forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); }); });
  $$('[data-lines] .ln').forEach(function (l, i) { l.style.setProperty('--i', i % 3); });

  var revealEls = $$('[data-words],[data-fade],[data-stagger],.film [data-lines]');
  if (hasIO) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
    // looping illustrations only run while their section is on screen
    var live = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-live', e.isIntersecting); });
    }, { rootMargin: '10% 0px' });
    $$('[data-live]').forEach(function (el) { live.observe(el); });
    // the sticky button steps aside while the closing buttons are on screen
    var fin = $('.final__cta');
    if (fin) new IntersectionObserver(function (es) { root.classList.toggle('final-cta', es[0].isIntersecting); }, { threshold: 0.5 }).observe(fin);
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    $$('[data-live]').forEach(function (el) { el.classList.add('is-live'); });
  }

  /* ---------- warm the pictures further down once the hero frames are in, so nothing pops in late ---------- */
  var warmed = false;
  function warmImages() {
    if (warmed) return; warmed = true;
    var list = $$('img[loading="lazy"]'), i = 0;
    (function next() {
      var img = list[i++]; if (!img) return;
      if (img.complete) return next();
      img.addEventListener('load', next, { once: true }); img.addEventListener('error', next, { once: true });
      img.loading = 'eager';
    })();
  }
  w.addEventListener('load', function () { setTimeout(warmImages, 7000); });

  /* ---------- 1. hero image sequence ---------- */
  (function hero() {
    var sec = heroEl, canvas = $('.hero__canvas');
    if (!sec || !canvas || reduced || !hasGsap) return;
    var ctx = canvas.getContext('2d', { alpha: false });
    var stages = $$('.hero__stage', sec), chapters = $$('.hero__chapters li', sec);
    var cfg = { count: 120, pad: 4, ext: 'webp', version: '', sets: { d: 'assets/frames/d/', m: 'assets/frames/m/' } };
    var frames = [], drawn = -1, shown = -1, prog = 0, set = '', lastOn = 0, gen = 0, dir = 1, lastPos = 0;
    var mem = navigator.deviceMemory || 8, lowMem = mem <= 3;
    // Phones and tablets: frames are decoded off the main thread into a small window that moves with the film,
    // so scrolling never has to wait for a picture to decode. Desktops draw straight from the image cache.
    var useBmp = touch && !!w.createImageBitmap && !!w.fetch;
    var blend = !lowMem;            // cross-fade neighbouring frames so slow movement looks continuous
    var IDLE = useBmp ? 11 : 15;    // the first frames are a slow ripple: they loop gently while the page rests at the top
    var idleReady = false, idleT0 = 0, inView = true, running = false, lastTick = 0, snapT = 0, fadeTop = null, fadeBot = null, fadeH = 0;

    function url(i) {
      var n = String(i + 1); while (n.length < cfg.pad) n = '0' + n;
      return cfg.sets[set] + n + '.' + cfg.ext + (cfg.version ? '?v=' + cfg.version : '');
    }
    // pick the sharpest frame set the device can comfortably handle
    function pick() {
      var c = navigator.connection || {}, slow = c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '');
      var dpr = w.devicePixelRatio || 1;
      // phones with small screens or modest memory get the lighter frames: they load faster and decode in half the time
      if (portrait.matches) return (!slow && mem > 4 && cfg.sets.mx && w.innerWidth * dpr > 900) ? 'mx' : 'm';
      return (!slow && !lowMem && cfg.sets.dx && w.innerWidth * dpr > 2100) ? 'dx' : 'd';
    }
    function size() {
      var bw = canvas.offsetWidth, bh = canvas.offsetHeight, dpr = Math.min(w.devicePixelRatio || 1, portrait.matches ? 3 : 2);
      if (!bw) return;
      // on phones the canvas is never larger than the frames themselves, so every frame is drawn 1:1
      var cap = portrait.matches ? (set === 'mx' ? 1080 : 810) : 2560;
      var cw = Math.min(Math.round(bw * dpr), cap), ch = Math.round(cw * (bh / bw));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; drawn = shown = -1; }
      // phones: the top and bottom edges of the film melt into the page (drawn into the canvas, which is far cheaper than a mask)
      fadeTop = fadeBot = null;
      if (portrait.matches) {
        fadeH = Math.round(ch * 0.09);
        fadeTop = ctx.createLinearGradient(0, 0, 0, fadeH); fadeTop.addColorStop(0, 'rgba(11,11,11,1)'); fadeTop.addColorStop(1, 'rgba(11,11,11,0)');
        fadeBot = ctx.createLinearGradient(0, ch - fadeH, 0, ch); fadeBot.addColorStop(0, 'rgba(11,11,11,0)'); fadeBot.addColorStop(1, 'rgba(11,11,11,1)');
      }
    }
    function src(i) { var f = frames[i]; return f && f.ok ? (useBmp ? f.bmp : f.img) : null; }
    function nearest(a) {   // the closest frame that can be drawn right now
      if (!useBmp) { for (var k = a; k >= 0; k--) if (src(k)) return k; return -1; }
      for (var q = 0; q <= 14; q++) { if (src(a - q)) return a - q; if (src(a + q)) return a + q; }
      return -1;
    }
    function paint(im) {
      var cw = canvas.width, ch = canvas.height, sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
      var s = Math.max(cw / sw, ch / sh), dw = sw * s, dh = sh * s;
      ctx.drawImage(im, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
    function draw(f) {
      f = Math.max(0, Math.min(cfg.count - 1, f));
      // cross-fade between neighbours: always on desktop; on phones only for the resting ripple, never while scrolling
      var soft = blend && (!touch || (idleReady && scrollF() < IDLE));
      var key = soft ? Math.round(f * 16) / 16 : Math.round(f);
      var a = Math.floor(key), t = key - a, ia = nearest(a);
      if (ia < 0) return;
      var two = ia === a && t > 0.03 && !!src(a + 1), exact = ia === a && (t <= 0.03 || two);
      if (exact && key === drawn) return;
      if (!exact && ia === shown && drawn === -1) return;   // already showing the best frame available
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = touch ? 'low' : 'high';
      ctx.globalAlpha = 1; paint(src(ia));
      if (two) { ctx.globalAlpha = t; paint(src(a + 1)); ctx.globalAlpha = 1; }
      if (fadeTop) { ctx.fillStyle = fadeTop; ctx.fillRect(0, 0, canvas.width, fadeH); ctx.fillStyle = fadeBot; ctx.fillRect(0, canvas.height - fadeH, canvas.width, fadeH); }
      drawn = exact ? key : -1; shown = ia;
      if (!canvas.classList.contains('is-ready')) { canvas.classList.add('is-ready'); sec.classList.add('has-film'); }
    }
    function scrollF() { return Math.min(prog / 0.9, 1) * (cfg.count - 1); }
    function frameNow(now) {
      var sF = scrollF();
      if (!idleReady || sF >= IDLE) return sF;
      var iF = IDLE * 0.5 * (1 - Math.cos(((now - idleT0) / 6400) * Math.PI * 2));
      return sF + iF * (1 - sF / IDLE);   // the ripple fades out as scrolling takes over, so nothing jumps
    }
    // keep decoded frames ready a little behind and well ahead of where the film is; let go of the rest
    function want() {
      if (!useBmp || !inView) return;
      var t = Math.round(scrollF()), lo = dir >= 0 ? t - 3 : t - 9, hi = dir >= 0 ? t + 9 : t + 3, g = gen;
      if (t <= IDLE + 1) { lo = 0; hi = Math.max(hi, IDLE + 1); }
      lo = Math.max(0, lo); hi = Math.min(cfg.count - 1, hi);
      for (var i = lo; i <= hi; i++) (function (i) {
        var f = frames[i];
        if (!f || !f.blob || f.bmp || f.busy) return;
        f.busy = true;
        w.createImageBitmap(f.blob).then(function (b) {
          f.busy = false;
          if (g !== gen || !inView) { b.close(); return; }
          f.bmp = b;
          var nowF = frameNow(performance.now());
          if (Math.abs(i - nowF) < 2 || drawn === -1) { draw(nowF); }
        }, function () { f.busy = false; if (i === 0) plain(); });
      })(i);
      for (var j = 0; j < frames.length; j++) { var x = frames[j]; if (x && x.bmp && (j < lo - 5 || j > hi + 5)) { x.bmp.close(); x.bmp = null; } }
    }
    function release() { frames.forEach(function (x) { if (x && x.bmp) { x.bmp.close(); x.bmp = null; } }); }
    function plain() { if (!useBmp) return; useBmp = false; loadAll(); }   // a browser that cannot decode this way falls back to ordinary images

    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);
      if (now - lastTick < 30) return;
      lastTick = now;
      if (idleReady && scrollF() < IDLE) draw(frameNow(now));
    }
    function loop() {
      var want2 = inView && !d.hidden;
      if (want2 && !running) { running = true; lastTick = performance.now(); requestAnimationFrame(tick); }
      else if (!want2) running = false;
    }

    function load(i) {
      return new Promise(function (res) {
        if (frames[i]) return res();
        var f = frames[i] = { ok: false }, g = gen;
        if (useBmp) {
          fetch(url(i)).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
            if (g === gen) { f.blob = b; f.ok = true; want(); }
            res();
          }).catch(function () { res(); });
          return;
        }
        f.img = new Image(); f.img.decoding = 'async';
        f.img.onload = function () {
          var fin = function () { f.ok = true; if (i <= scrollF() + 1) { drawn = -1; draw(frameNow(performance.now())); } res(); };
          // the resting-ripple frames are decoded off the main thread first, so drawing them never stalls the page
          if (i <= IDLE + 1 && f.img.decode) f.img.decode().then(fin, fin); else fin();
        };
        f.img.onerror = function () { res(); };
        f.img.src = url(i);
      });
    }
    function loadAll() {
      release(); gen++; frames = []; drawn = shown = -1; set = pick(); idleReady = false; size();
      var mySet = set, myGen = gen, n0 = Math.min(IDLE + 2, cfg.count);
      // first frame straight away; everything else waits until the page itself has loaded
      load(0).then(function () {
        var go = function () {
          if (gen !== myGen) return;
          var batch = [];
          for (var i = 1; i < n0; i++) batch.push(load(i));
          Promise.all(batch).then(function () {
            if (gen !== myGen) return;
            setTimeout(function () { if (gen === myGen) { idleT0 = performance.now(); idleReady = true; } }, 500);
            var next = n0, live = 0;
            function pump() {
              if (gen !== myGen) return;
              if (next >= cfg.count) { if (!live) warmImages(); return; }
              live++; load(next++).then(function () { live--; pump(); });
            }
            for (var k = 0; k < 4; k++) pump();
          });
        };
        if (d.readyState === 'complete') setTimeout(go, 250); else w.addEventListener('load', function () { setTimeout(go, 250); }, { once: true });
      });
    }
    function stage(p) {
      var on = p < 0.15 ? 0 : (p > 0.36 && p < 0.66) ? 1 : p > 0.8 ? 2 : -1;
      if (on !== lastOn) {
        lastOn = on;
        stages.forEach(function (s, i) { s.classList.toggle('is-on', i === on); });
        heroCta = on === 0 || on === 2; queueChrome();
        sec.classList.toggle('is-side', on > 0);
      }
      var ch = p < 0.3 ? 0 : p < 0.72 ? 1 : 2;
      chapters.forEach(function (c, i) { c.classList.toggle('is-on', i === ch); });
      sec.classList.toggle('is-scrolled', p > 0.02);
      sec.classList.toggle('is-mid', p > 0.2);
      sec.classList.toggle('is-boxed', p > 0.71);
    }
    function start() {
      loadAll(); loop();
      ScrollTrigger.create({
        trigger: sec, start: 'top top', end: 'bottom bottom', scrub: touch ? 0.3 : 0.6,
        onUpdate: function (st) {
          prog = st.progress;
          var sF = scrollF();
          if (Math.abs(sF - lastPos) > 0.01) { dir = sF > lastPos ? 1 : -1; lastPos = sF; }
          want();
          if (!(idleReady && sF < IDLE)) {
            draw(sF);
            // once the scroll settles, land on a whole frame so the picture is perfectly clean
            if (!touch) { clearTimeout(snapT); snapT = setTimeout(function () { var s2 = scrollF(); if (!(idleReady && s2 < IDLE)) draw(Math.round(s2)); }, 160); }
          }
          stage(prog);
        }
      });
      if (hasIO) new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting; loop();
        if (useBmp) { if (inView) want(); else { release(); drawn = -1; } }   // off screen, the decoded frames are let go to free memory
      }).observe(sec);
      d.addEventListener('visibilitychange', loop);
      var rt;
      w.addEventListener('resize', function () {
        if (touch && !wChanged) return;   // a phone's address bar sliding away is not a real resize
        clearTimeout(rt);
        rt = setTimeout(function () {
          if (pick() !== set) loadAll(); else { size(); draw(frameNow(performance.now())); }
        }, 150);
      });
      // a soft pool of light follows the pointer
      var glow = $('.hero__glow', sec);
      if (glow && fine) {
        var gx = gsap.quickTo(glow, 'x', { duration: 0.9, ease: 'power3' }), gy = gsap.quickTo(glow, 'y', { duration: 0.9, ease: 'power3' });
        sec.addEventListener('pointermove', function (e) {
          var r = sec.firstElementChild.getBoundingClientRect();
          gx(e.clientX - r.left); gy(e.clientY - r.top); sec.classList.add('has-glow');
        }, { passive: true });
        sec.addEventListener('pointerleave', function () { sec.classList.remove('has-glow'); });
      }
    }
    fetch('assets/frames/manifest.json').then(function (r) { return r.ok ? r.json() : cfg; }).then(function (m) {
      if (m && m.sets) cfg = Object.assign(cfg, m);
    }).catch(function () {}).then(start);
  })();

  /* ---------- 2. problem ---------- */
  later(function problem() {
  if (hasGsap && !reduced) {
    var lines = $$('.problem__lines .ln');
    lines.forEach(function (ln) {
      gsap.fromTo(ln, fine ? { opacity: 0.14, filter: 'blur(6px)', x: -24 } : { opacity: 0.14, x: -16 }, fine ? {
        opacity: 1, filter: 'blur(0px)', x: 0, ease: 'none',
        scrollTrigger: { trigger: ln, start: 'top 88%', end: 'top 60%', scrub: 0.5 }
      } : {
        opacity: 1, x: 0, ease: 'none',
        scrollTrigger: { trigger: ln, start: 'top 88%', end: 'top 60%', scrub: 0.5 }
      });
    });
    // each complaint is struck through as the answer arrives
    var fix = $('.problem__fix em');
    if (fix) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: '.problem__fix', start: 'top 80%', end: 'top 44%', scrub: 0.6 } });
      lines.forEach(function (ln, k) {
        var sp = ln.firstElementChild;
        if (sp) tl.to(sp, { '--x': 1, color: 'rgba(242,237,228,.4)', duration: 0.34, ease: 'power1.inOut' }, k * 0.13);
      });
      tl.fromTo(fix, { opacity: 0, yPercent: 60, scale: 0.9 }, { opacity: 1, yPercent: 0, scale: 1, duration: 0.6, ease: 'power2.out' }, 0.3);
    }
  }
  });

  /* ---------- 3. before / after ---------- */
  later(function compare() {
  $$('[data-ba]').forEach(function (ba) {
    var range = $('.ba__range', ba), dragging = false;
    function set(p) { p = Math.max(2, Math.min(98, p)); ba.style.setProperty('--p', p + '%'); if (range) range.value = p; }
    function fromEvent(e) { var r = ba.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); }
    ba.addEventListener('pointerdown', function (e) {
      dragging = true; ba.classList.add('is-drag');
      try { ba.setPointerCapture(e.pointerId); } catch (x) {}
      fromEvent(e);
    });
    ba.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      ba.addEventListener(t, function () { dragging = false; ba.classList.remove('is-drag'); });
    });
    if (range) {
      range.style.pointerEvents = 'none';
      range.addEventListener('input', function () { set(parseFloat(range.value)); });
    }
    // scrolling does the reveal: the sketch wipes away into the finished piece as the slider passes through the screen.
    // The moment someone drags it (or uses the keyboard), it is theirs.
    if (hasGsap && !reduced) {
      var took = false;
      ba.addEventListener('pointerdown', function () { took = true; });
      if (range) range.addEventListener('input', function () { took = true; });
      set(94);
      ScrollTrigger.create({ trigger: ba, start: 'top 78%', end: 'bottom 42%', scrub: 0.5, onUpdate: function (st) { if (!took) set(94 - st.progress * 86); } });
    }
  });
  });

  /* ---------- 4. horizontal reel ---------- */
  later(function reel() {
    var sec = $('.reel'), rail = $('.reel__track'), now = $('.reel__count b'), bar = $('.reel__count i');
    if (!sec || !rail) return;
    var cards = $$('.card:not(.card--cta)', rail);
    if (hasIO) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); cio.unobserve(e.target); } });
      }, { threshold: 0.2 });
      cards.forEach(function (c) { cio.observe(c); });
    } else cards.forEach(function (c) { c.classList.add('in'); });
    if (hasGsap && !reduced) {
      var lastI = 0, pin = $('.reel__pin', sec);
      var dist = function () { return Math.max(0, rail.scrollWidth - w.innerWidth); };
      // the pinned screen's own height is used (it does not change when a phone's address bar hides), so nothing below shifts
      var fit = function () { sec.style.height = ((pin ? pin.offsetHeight : w.innerHeight) + dist()) + 'px'; };
      fit();
      gsap.to(rail, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true,
          onRefreshInit: fit,
          onUpdate: function (st) {
            var i = Math.min(cards.length, Math.floor(st.progress * cards.length * 0.999) + 1);
            if (now && i !== lastI) { lastI = i; now.textContent = '0' + i; }
            if (bar) bar.style.setProperty('--rp', st.progress.toFixed(3));
            if (fine) spread();
          }
        }
      });
      // each card knows how far it is from the middle of the screen: the centre one stands forward, the rest fall back
      function spread() {
        var vw = w.innerWidth;
        cards.forEach(function (c) {
          var r = c.getBoundingClientRect(), px = (r.left + r.width / 2 - vw / 2) / vw;
          c.style.setProperty('--px', px.toFixed(3)); c.style.setProperty('--pa', Math.min(1, Math.abs(px) * 1.25).toFixed(3));
        });
      }
      if (fine) spread();
      // the row leans into the scroll and settles when it stops
      var lean = 0, leanSet = 0, lastY = w.scrollY, st0 = ScrollTrigger.getAll().filter(function (t) { return t.trigger === sec; })[0];
      if (fine) gsap.ticker.add(function () {
        var y = w.scrollY, v = y - lastY; lastY = y;
        var target = (st0 && st0.isActive) ? Math.max(-5, Math.min(5, v * 0.16)) : 0;
        lean += (target - lean) * 0.14;
        if (Math.abs(lean - leanSet) > 0.02) { leanSet = lean; rail.style.setProperty('--sk', lean.toFixed(2)); }
      });
    }
    var lb = $('.lightbox');
    if (!lb || !lb.showModal) return;
    var lbImg = $('img', lb), lbName = $('.lightbox__name', lb);
    cards.forEach(function (c) {
      c.addEventListener('click', function () {
        lbImg.src = c.dataset.full; lbImg.alt = $('img', c).alt; lbName.textContent = $('.card__name', c).textContent;
        lb.showModal(); lb.focus(); if (lenis) lenis.stop();
        track('ProductView', { product: lbName.textContent });
      });
    });
    function close() { if (lb.open) lb.close(); }
    $('.lightbox__close', lb).addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    lb.addEventListener('close', function () { if (lenis) lenis.start(); });
  });

  /* ---------- 5. film ---------- */
  later(function film() {
    var v = $('.film__video'), btn = $('.film__toggle');
    if (!v) return;
    var userPaused = reduced, loaded = false;
    function ensure() { if (loaded) return; loaded = true; v.src = portrait.matches ? v.dataset.srcM : v.dataset.srcD; }
    function sync(visible) {
      if (visible && !userPaused) { ensure(); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    }
    if (hasIO) {
      new IntersectionObserver(function (es) { sync(es[0].isIntersecting); }, { rootMargin: '25% 0px' }).observe(v);
    } else sync(true);
    if (btn) {
      btn.setAttribute('aria-pressed', String(userPaused));
      btn.setAttribute('aria-label', userPaused ? 'Play the film' : 'Pause the film');
      btn.addEventListener('click', function () {
        userPaused = !userPaused;
        btn.setAttribute('aria-pressed', String(userPaused));
        btn.setAttribute('aria-label', userPaused ? 'Play the film' : 'Pause the film');
        sync(true);
      });
    }
  });

  /* ---------- 7. counters ---------- */
  later(function counters() {
    var box = $('[data-stats]'); if (!box || reduced || !hasIO) return;
    var nums = $$('[data-count]', box);
    nums.forEach(function (n) { n.textContent = '0'; });
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return; o.disconnect();
      nums.forEach(function (n, k) {
        var end = parseInt(n.dataset.count, 10), t0 = null, dur = 1500 + k * 150;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
          n.textContent = Math.round(end * e);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.35 }).observe(box);
  });

  /* ---------- 8. testimonials ---------- */
  later(function quotes() {
    var stage = $('[data-quotes]'); if (!stage) return;
    var items = $$('.quote', stage), now = $('[data-q-now]'), i = 0, timer = null, visible = false, hold = false;
    function go(n) {
      i = (n + items.length) % items.length;
      items.forEach(function (q, k) { q.classList.toggle('is-on', k === i); q.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      if (now) now.textContent = i + 1;
    }
    function play() { stop(); if (reduced || !visible || hold) return; timer = setInterval(function () { go(i + 1); }, 6500); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    $('[data-q-next]').addEventListener('click', function () { go(i + 1); play(); });
    $('[data-q-prev]').addEventListener('click', function () { go(i - 1); play(); });
    [stage, $('.quotes__nav')].forEach(function (el) {
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hold = true; stop(); } });
      el.addEventListener('pointerleave', function () { hold = false; play(); });
      el.addEventListener('focusin', function () { hold = true; stop(); });
      el.addEventListener('focusout', function () { hold = false; play(); });
    });
    if (hasIO) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; play(); }, { threshold: 0.3 }).observe(stage);
    go(0);
  });

  /* ---------- 9. steps line ---------- */
  later(function steps() {
    var rail = $('[data-steps]'); if (!rail) return;
    var steps = $$('.step', rail);
    if (!hasGsap || reduced) { steps.forEach(function (s) { s.classList.add('is-on'); }); return; }
    ScrollTrigger.create({
      trigger: rail, start: 'top 78%', end: 'bottom 55%', scrub: 0.6,
      onUpdate: function (st) {
        rail.style.setProperty('--sp', st.progress.toFixed(3));
        steps.forEach(function (s, k) { s.classList.toggle('is-on', st.progress >= (k / steps.length) + 0.02); });
      }
    });
  });

  /* ---------- 10. faq ---------- */
  later(function faq() {
  $$('.qa').forEach(function (qa) {
    var sum = $('summary', qa), body = $('.qa__a', qa);
    if (qa.open) qa.classList.add('is-open');
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      if (qa.classList.contains('is-open')) {
        qa.classList.remove('is-open');
        var done = function (ev) { if (ev && ev.target !== body) return; body.removeEventListener('transitionend', done); if (!qa.classList.contains('is-open')) qa.open = false; };
        if (reduced) qa.open = false; else body.addEventListener('transitionend', done);
      } else {
        qa.open = true;
        requestAnimationFrame(function () { requestAnimationFrame(function () { qa.classList.add('is-open'); }); });
        track('FaqOpen', { question: sum.textContent.trim() });
      }
      if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 650);
    });
  });
  });

  /* ---------- 11. quote form ---------- */
  later(function form() {
    var f = $('#quoteForm'); if (!f) return;
    var done = $('.form__done'), err = $('.form__err', f), btn = $('button[type=submit]', f);
    var ENDPOINT = 'https://formsubmit.co/ajax/info@loomwaveintl.com';
    function check(name) {
      var el = f.elements[name], bad = !el.value.trim();
      if (name === 'contact' && !bad) bad = !(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) || el.value.replace(/\D/g, '').length >= 7);
      el.closest('.field').classList.toggle('is-bad', bad);
      el.setAttribute('aria-invalid', String(bad));
      var m = $('#e-' + name); if (m) { m.hidden = !bad; if (bad) el.setAttribute('aria-describedby', m.id); else el.removeAttribute('aria-describedby'); }
      return !bad;
    }
    ['name', 'contact', 'product', 'country'].forEach(function (n) {
      f.elements[n].addEventListener('blur', function () { if (f.dataset.tried) check(n); });
      f.elements[n].addEventListener('input', function () { if (f.dataset.tried) check(n); });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      f.dataset.tried = '1';
      var ok = ['name', 'contact', 'product', 'country'].map(check);
      var firstBad = ok.indexOf(false);
      if (firstBad > -1) { f.elements[['name', 'contact', 'product', 'country'][firstBad]].focus(); return; }
      if (f.elements._honey.value) return;
      err.hidden = true; btn.disabled = true; $('span', btn).textContent = 'Sending…';
      var data = {
        name: f.elements.name.value.trim(),
        'WhatsApp or email': f.elements.contact.value.trim(),
        'Product type': f.elements.product.value,
        country: f.elements.country.value.trim(),
        _subject: 'New quote request from the /start landing page',
        _template: 'table', _captcha: 'false'
      };
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) === 'false') throw new Error(j.message || 'send failed'); }); })
        .then(function () {
          f.hidden = true; done.hidden = false;
          track('QuoteFormSubmit', { product: data['Product type'], country: data.country }, 'Lead');
          if (hasGsap) ScrollTrigger.refresh();
        })
        .catch(function () {
          err.hidden = false; btn.disabled = false; $('span', btn).textContent = 'Send my request';
          track('QuoteFormError', {});
        });
    });
  });

  /* ---------- desktop: cursor, magnetic buttons, tilt ---------- */
  later(function pointerFx() {
  if (fine && hasGsap && !reduced) {
    var cur = $('.cursor');
    if (cur) {
      root.classList.add('has-cursor');
      var cx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
      cur.classList.add('is-hidden');
      w.addEventListener('pointermove', function (e) {
        cx(e.clientX); cy(e.clientY); cur.classList.remove('is-hidden');
        var t = e.target, el = t.closest && t.closest('[data-cursor],a,button,summary,select,input');
        var mode = el ? (el.dataset.cursor || (el.matches('input,select') ? 'none' : 'link')) : '';
        cur.classList.toggle('is-link', mode === 'link');
        cur.classList.toggle('is-view', mode === 'view');
        cur.classList.toggle('is-drag', mode === 'drag');
        cur.classList.toggle('is-hidden', mode === 'none');
      }, { passive: true });
      d.addEventListener('pointerleave', function () { cur.classList.add('is-hidden'); });
    }
    $$('[data-magnetic]').forEach(function (b) {
      var pos = { x: 0, y: 0 };
      var apply = function () { b.style.setProperty('--mx', pos.x.toFixed(2) + 'px'); b.style.setProperty('--my', pos.y.toFixed(2) + 'px'); };
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        gsap.to(pos, { x: (e.clientX - (r.left + r.width / 2)) * 0.28, y: (e.clientY - (r.top + r.height / 2)) * 0.36, duration: 0.5, ease: 'power3.out', onUpdate: apply, overwrite: true });
      });
      b.addEventListener('pointerleave', function () { gsap.to(pos, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,0.55)', onUpdate: apply, overwrite: true }); });
    });
    $$('[data-tilt]').forEach(function (c) {
      var m = c.classList.contains('card') ? $('.card__media', c) : c;
      c.addEventListener('pointermove', function (e) {
        var r = m.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        m.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg'); m.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg');
      });
      c.addEventListener('pointerleave', function () { m.style.setProperty('--ry', '0deg'); m.style.setProperty('--rx', '0deg'); });
    });
  }
  });

  /* ---------- scroll-linked depth: film push-in and the services band ---------- */
  later(function parallax() {
  if (hasGsap && !reduced) {
    var fv = $('.film__video');
    if (fv) gsap.fromTo(fv, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.film', start: 'top bottom', end: 'bottom top', scrub: true } });
    $$('[data-band]').forEach(function (band, k) {
      // two rows sliding against each other
      gsap.fromTo(band, { xPercent: k ? -38 : -3 }, { xPercent: k ? -6 : -36, ease: 'none', scrollTrigger: { trigger: band.parentNode, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });
  }
  });

  /* ---------- scroll-linked motion ----------
     Every element marked data-s or data-par is told, as plain CSS numbers, where it is on its way through the screen:
     --s runs 0 to 1 from entering at the bottom to leaving at the top, --c runs -1 to 1 around the middle, --a is the
     distance from the middle. The stylesheet turns those numbers into drift, scale and reveals, so nothing sits still
     while the page moves. Layout is measured once (and again when it changes); scrolling itself reads nothing. */
  later(function scrub() {
    if (reduced || touch) return;   // on phones the page itself is the motion; extra moving layers only cost smoothness
    var els = $$('[data-s],[data-par]'), items = [], vh = w.innerHeight, lastY = -1;
    if (!els.length) return;
    var gain = portrait.matches ? 0.6 : 1;
    els.forEach(function (el) { if (el.dataset.par) el.style.setProperty('--par', (parseFloat(el.dataset.par) * gain).toFixed(1)); });
    function pageTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
    function measureAll() {
      vh = w.innerHeight;
      items = els.map(function (el) { return { el: el, top: pageTop(el), h: el.offsetHeight, live: true, inherit: el.dataset.s === 'inherit' }; });
      lastY = -1;
    }
    function update() {
      var y = w.scrollY; if (y === lastY) return; lastY = y;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], p = (y + vh - it.top) / (vh + it.h);
        var near = p > -0.2 && p < 1.2;
        if (!near && !it.live) continue;      // far away and already parked at its end state
        it.live = near;
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        var c = p * 2 - 1, st = it.el.style;
        st.setProperty('--s', p.toFixed(4)); st.setProperty('--c', c.toFixed(4)); st.setProperty('--a', Math.abs(c).toFixed(4));
        if (it.inherit) st.setProperty('--sv', p.toFixed(4));
      }
    }
    measureAll(); update();
    root.classList.add('has-scrub');
    if (hasGsap) { gsap.ticker.add(update); ScrollTrigger.addEventListener('refresh', measureAll); }
    else w.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    w.addEventListener('resize', function () { measureAll(); update(); });
    w.addEventListener('load', function () { measureAll(); update(); });
  });

  /* ---------- ambient: dust drifting in the light across the whole page; it streams past as you scroll ---------- */
  later(function ambient() {
    var cv = $('.dust'), cx = cv && cv.getContext && cv.getContext('2d');
    var lowMem = navigator.deviceMemory && navigator.deviceMemory <= 3;
    if (reduced || lowMem) return;
    if (touch) {
      // phones: a handful of motes moved by the compositor alone, so they cost nothing while scrolling
      var holder = d.createElement('div'); holder.className = 'motes'; holder.setAttribute('aria-hidden', 'true');
      for (var q = 0; q < 12; q++) {
        var mo = d.createElement('i');
        mo.style.cssText = '--x:' + (Math.random() * 100).toFixed(1) + '%;--s:' + (1 + Math.random() * 1.6).toFixed(1) + 'px;--o:' + (0.14 + Math.random() * 0.3).toFixed(2) + ';--t:' + (16 + Math.random() * 18).toFixed(1) + 's;--d:-' + (Math.random() * 30).toFixed(1) + 's;--dx:' + ((Math.random() - 0.5) * 60).toFixed(0) + 'px';
        holder.appendChild(mo);
      }
      d.body.appendChild(holder); return;
    }
    if (!cx) return;
    var motes = [], dw = 0, dh = 0, k = 1, last = 0, lastY = w.scrollY, running = false;
    function size() {
      k = Math.min(w.devicePixelRatio || 1, 1.5);
      dw = cv.width = Math.round(w.innerWidth * k); dh = cv.height = Math.round(w.innerHeight * k);
      var n = portrait.matches ? 22 : 40; motes = [];
      for (var i = 0; i < n; i++) {
        var z = 0.25 + Math.random() * 0.75;   // depth: near motes are bigger, brighter and pass faster
        motes.push({ x: Math.random() * dw, y: Math.random() * dh, z: z, r: (0.4 + z * 1.3) * k, vx: (Math.random() - 0.5) * 5 * k, vy: -(2 + Math.random() * 8) * k, a: 0.1 + z * 0.34, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.1 });
      }
    }
    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);
      if (now - last < 30) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      var y = w.scrollY, dy = (y - lastY) * k; lastY = y;
      cx.clearRect(0, 0, dw, dh);
      cx.fillStyle = '#FFDCA8';
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.x += m.vx * dt; m.y += m.vy * dt - dy * m.z * 0.55;
        if (m.y < -6) { m.y += dh + 12; m.x = Math.random() * dw; } else if (m.y > dh + 6) { m.y -= dh + 12; m.x = Math.random() * dw; }
        if (m.x < -6) m.x = dw + 6; else if (m.x > dw + 6) m.x = -6;
        cx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(now / 1000 * m.sp + m.ph));
        cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 6.2832); cx.fill();
      }
    }
    function loop() {
      if (!d.hidden && !running) { running = true; last = performance.now(); lastY = w.scrollY; requestAnimationFrame(tick); }
      else if (d.hidden) running = false;
    }
    size(); loop();
    d.addEventListener('visibilitychange', loop);
    var rt; w.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 200); });
  });

  /* ---------- the client names run faster while the page is being scrolled ---------- */
  later(function marqueeRush() {
    var rows = $$('.marquee__row'), trust = $('.trust');
    if (reduced || touch || !hasGsap || !rows.length || !rows[0].getAnimations) return;
    var rate = 1, lastY = w.scrollY, set = 1;
    gsap.ticker.add(function () {
      var y = w.scrollY, v = Math.abs(y - lastY); lastY = y;
      if (!trust.classList.contains('is-live')) return;
      rate += ((1 + Math.min(7, v * 0.22)) - rate) * 0.1;
      if (Math.abs(rate - set) < 0.03) return;
      set = rate;
      rows.forEach(function (r) { var a = r.getAnimations()[0]; if (a) a.playbackRate = rate; });
    });
  });

  /* ---------- globe: a dotted earth you can spin, with a route from Dhaka to every country we have supplied ----------
     To add a country: add a line to DEST below (name, longitude, latitude, which side its label sits on). */
  later(function globe() {
    var box = $('[data-globe]'), fig = box && box.closest('.map');
    var cv = box && $('canvas', box), cx = cv && cv.getContext && cv.getContext('2d');
    if (!cx) { if (fig) fig.classList.add('map--flat'); return; }
    var D = Math.PI / 180;
    var HOME = { name: 'Dhaka · production', short: 'Dhaka', lon: 90.41, lat: 23.81, side: 1, dy: -11 };
    var HQ = { name: 'Singapore · registered', short: 'Singapore', lon: 103.82, lat: 1.35, side: 1, dy: 12 };
    var DEST = [
      { name: 'Netherlands', lon: 5.6, lat: 52.4, side: 1, dy: 2 },
      { name: 'UK', lon: -1.8, lat: 53.2, side: -1, dy: -5 },
      { name: 'France', lon: 2.4, lat: 46.4, side: -1, dy: 4 },
      { name: 'Greece', lon: 22.9, lat: 39.1, side: 1 },
      { name: 'Canada', lon: -106, lat: 53, side: -1 },
      { name: 'USA', lon: -98, lat: 38.5, side: -1 },
      { name: 'Japan', lon: 138.5, lat: 36.2, side: 1 },
      { name: 'Malaysia', lon: 101.9, lat: 4.2, side: -1 }
    ];
    function vec(lon, lat) { var c = Math.cos(lat * D); return [c * Math.sin(lon * D), Math.sin(lat * D), c * Math.cos(lon * D)]; }
    var home = vec(HOME.lon, HOME.lat), hq = vec(HQ.lon, HQ.lat), dots = null, grat = [], N = 56;
    DEST.forEach(function (t, i) {
      t.v = vec(t.lon, t.lat); t.i = i;
      // a great-circle path from Dhaka, lifted off the surface in the middle
      var dot = home[0] * t.v[0] + home[1] * t.v[1] + home[2] * t.v[2], om = Math.acos(Math.max(-1, Math.min(1, dot))), so = Math.sin(om) || 1;
      var h = 0.05 + 0.17 * (om / Math.PI); t.arc = new Float32Array((N + 1) * 3);
      for (var k = 0; k <= N; k++) {
        var u = k / N, a = Math.sin((1 - u) * om) / so, b = Math.sin(u * om) / so, r = 1 + h * Math.sin(Math.PI * u);
        t.arc[k * 3] = (a * home[0] + b * t.v[0]) * r; t.arc[k * 3 + 1] = (a * home[1] + b * t.v[1]) * r; t.arc[k * 3 + 2] = (a * home[2] + b * t.v[2]) * r;
      }
    });
    // faint grid: a few parallels and meridians so the turning reads as a sphere
    [-30, 0, 30, 60].forEach(function (la) { var l = []; for (var lo = -180; lo <= 180; lo += 6) l.push(vec(lo, la)); grat.push(l); });
    for (var lo0 = -180; lo0 < 180; lo0 += 30) { var l = []; for (var la0 = -78; la0 <= 78; la0 += 6) l.push(vec(lo0, la0)); grat.push(l); }

    var size = 0, k = 1, R = 0, lon0 = 56, tilt = 22, vel = 0, AUTO = reduced ? 0 : -5;
    var dragging = false, px = 0, py = 0, lastMove = 0, touched = 0, intro = reduced ? 1 : 0, introT0 = 0, shown = false;
    var running = false, visible = false, last = 0, lastY = w.scrollY, cl = 1, sl = 0, ct = 1, st = 0;
    var small = false, labelFont = '', gGlow = null, gBody = null;
    function resize() {
      var r = box.getBoundingClientRect(); if (!r.width) return;
      k = Math.min(w.devicePixelRatio || 1, 2); size = Math.round(r.width * k);
      cv.width = size; cv.height = size; R = size * 0.41; small = r.width < 430;
      labelFont = '500 ' + ((small ? 9.5 : 11) * k).toFixed(1) + 'px Inter, system-ui, sans-serif';
      var hf = size / 2;
      gGlow = cx.createRadialGradient(hf, hf, R * 0.96, hf, hf, R * 1.2); gGlow.addColorStop(0, 'rgba(255,189,89,.16)'); gGlow.addColorStop(1, 'rgba(255,189,89,0)');
      gBody = cx.createRadialGradient(hf - R * 0.38, hf - R * 0.42, R * 0.05, hf, hf, R); gBody.addColorStop(0, '#2A241C'); gBody.addColorStop(0.55, '#15130F'); gBody.addColorStop(1, '#0C0B0A');
    }
    function rot(v, o) {   // turn to the current view; o receives [x, y, z] with z towards the viewer
      var x = v[0] * cl - v[2] * sl, z = v[0] * sl + v[2] * cl;
      o[0] = x; o[1] = v[1] * ct - z * st; o[2] = v[1] * st + z * ct;
    }
    var tmp = [0, 0, 0], tmp2 = [0, 0, 0];
    function label(t, o, gold) {
      if (o[2] < 0.3) return;
      var a = Math.min(1, (o[2] - 0.3) / 0.22), half = size / 2;
      cx.globalAlpha = a * (gold ? 1 : 0.86); cx.fillStyle = gold ? '#FFBD59' : '#F2EDE4';
      cx.font = labelFont; cx.textBaseline = 'middle';
      var txt = ((small && t.short) || t.name).toUpperCase(), x = half + o[0] * R, tw = cx.measureText(txt).width + 10 * k, side = t.side;
      if (side > 0 && x + tw > size - 3 * k) side = -1; else if (side < 0 && x - tw < 3 * k) side = 1;
      cx.textAlign = side > 0 ? 'left' : 'right';
      cx.fillText(txt, x + side * 10 * k, half - o[1] * R + ((t.dy || 0) + 0.5) * k);
    }
    function draw(now) {
      var half = size / 2, i, o = tmp;
      cl = Math.cos(lon0 * D); sl = Math.sin(lon0 * D); ct = Math.cos(tilt * D); st = Math.sin(tilt * D);
      cx.clearRect(0, 0, size, size);
      // glow around the edge, then the body of the sphere
      cx.globalAlpha = 1; cx.fillStyle = gGlow; cx.beginPath(); cx.arc(half, half, R * 1.2, 0, 6.2832); cx.fill();
      cx.fillStyle = gBody; cx.beginPath(); cx.arc(half, half, R, 0, 6.2832); cx.fill();
      cx.strokeStyle = 'rgba(255,189,89,.32)'; cx.lineWidth = k; cx.stroke();
      // grid
      cx.strokeStyle = '#F2EDE4'; cx.globalAlpha = 0.07; cx.lineWidth = k * 0.8; cx.beginPath();
      for (i = 0; i < grat.length; i++) {
        var line = grat[i], pen = false;
        for (var j = 0; j < line.length; j++) {
          rot(line[j], o);
          if (o[2] > 0) { if (pen) cx.lineTo(half + o[0] * R, half - o[1] * R); else { cx.moveTo(half + o[0] * R, half - o[1] * R); pen = true; } } else pen = false;
        }
      }
      cx.stroke();
      // land, in three depth bands so the edge of the globe falls away
      if (dots) {
        var bands = [[], [], []], n = dots.length / 3;
        for (i = 0; i < n; i++) {
          var X = dots[i * 3], Y = dots[i * 3 + 1], Z = dots[i * 3 + 2], x = X * cl - Z * sl, z1 = X * sl + Z * cl, z = Y * st + z1 * ct;
          if (z <= 0.02) continue;
          bands[z > 0.62 ? 2 : z > 0.3 ? 1 : 0].push(half + x * R, half - (Y * ct - z1 * st) * R);
        }
        cx.fillStyle = '#F2EDE4';
        for (var b = 0; b < 3; b++) {
          var arr = bands[b], s = (b === 2 ? 2 : b === 1 ? 1.7 : 1.3) * k * (small ? 0.82 : 1), hs = s / 2;
          cx.globalAlpha = b === 2 ? 0.78 : b === 1 ? 0.5 : 0.26; cx.beginPath();
          for (i = 0; i < arr.length; i += 2) cx.rect(arr[i] - hs, arr[i + 1] - hs, s, s);
          cx.fill();
        }
      }
      // routes
      var p = intro < 1 ? Math.min(1, (now - introT0) / 2600) : 1; if (shown && intro < 1) intro = p;
      cx.lineCap = 'round'; cx.lineJoin = 'round';
      DEST.forEach(function (t) {
        var prog = shown ? Math.max(0, Math.min(1, (p * 2600 - t.i * 150) / 1400)) : 0;
        prog = 1 - Math.pow(1 - prog, 3); t.prog = prog;
        var upto = Math.floor(prog * N), pen = false, a = t.arc, q = tmp2;
        cx.strokeStyle = '#FFBD59'; cx.lineWidth = 1.5 * k; cx.globalAlpha = 0.9; cx.beginPath();
        for (var j = 0; j <= upto; j++) {
          q[0] = a[j * 3]; q[1] = a[j * 3 + 1]; q[2] = a[j * 3 + 2]; rot(q, o);
          var vis = o[2] > 0 || (o[0] * o[0] + o[1] * o[1]) > 1.002;
          if (vis) { if (pen) cx.lineTo(half + o[0] * R, half - o[1] * R); else { cx.moveTo(half + o[0] * R, half - o[1] * R); pen = true; } } else pen = false;
        }
        cx.stroke();
        // a spark of light travelling out along the finished route
        if (prog === 1 && AUTO) {
          var u = ((now / 3600) + t.i * 0.21) % 1.5;
          if (u < 1) {
            var j0 = Math.max(0, Math.floor((u - 0.08) * N)), j1 = Math.floor(u * N); pen = false;
            cx.strokeStyle = '#FFF1D6'; cx.lineWidth = 2.6 * k; cx.globalAlpha = 1; cx.beginPath();
            for (j = j0; j <= j1; j++) {
              q[0] = a[j * 3]; q[1] = a[j * 3 + 1]; q[2] = a[j * 3 + 2]; rot(q, o);
              if (o[2] > 0 || (o[0] * o[0] + o[1] * o[1]) > 1.002) { if (pen) cx.lineTo(half + o[0] * R, half - o[1] * R); else { cx.moveTo(half + o[0] * R, half - o[1] * R); pen = true; } } else pen = false;
            }
            cx.stroke();
          }
        }
      });
      // pins and names
      DEST.forEach(function (t) {
        rot(t.v, o); if (o[2] <= 0.03 || t.prog < 0.98) return;
        var sx = half + o[0] * R, sy = half - o[1] * R, f = Math.min(1, o[2] / 0.25);
        if (AUTO) { var ph = ((now / 2600) + t.i * 0.37) % 1; cx.globalAlpha = (1 - ph) * 0.6 * f; cx.strokeStyle = '#F2EDE4'; cx.lineWidth = k; cx.beginPath(); cx.arc(sx, sy, (3.4 + ph * 9) * k, 0, 6.2832); cx.stroke(); }
        cx.globalAlpha = f; cx.fillStyle = '#F2EDE4'; cx.beginPath(); cx.arc(sx, sy, 3.2 * k, 0, 6.2832); cx.fill();
        label(t, o, false);
      });
      rot(hq, o);
      if (o[2] > 0.03) {
        var qx = half + o[0] * R, qy = half - o[1] * R, d = 4.4 * k;
        cx.globalAlpha = Math.min(1, o[2] / 0.25); cx.fillStyle = '#0B0B0B'; cx.strokeStyle = '#FFBD59'; cx.lineWidth = 1.4 * k;
        cx.beginPath(); cx.moveTo(qx, qy - d); cx.lineTo(qx + d, qy); cx.lineTo(qx, qy + d); cx.lineTo(qx - d, qy); cx.closePath(); cx.fill(); cx.stroke();
        label(HQ, o, true);
      }
      rot(home, o);
      if (o[2] > 0.03) {
        var hx = half + o[0] * R, hy = half - o[1] * R, f2 = Math.min(1, o[2] / 0.25), ph2 = (now / 2200) % 1;
        if (AUTO) { cx.globalAlpha = (1 - ph2) * 0.7 * f2; cx.strokeStyle = '#FFBD59'; cx.lineWidth = 1.2 * k; cx.beginPath(); cx.arc(hx, hy, (5 + ph2 * 13) * k, 0, 6.2832); cx.stroke(); }
        cx.globalAlpha = f2; cx.fillStyle = '#FFBD59'; cx.beginPath(); cx.arc(hx, hy, 4.6 * k, 0, 6.2832); cx.fill();
        label(HOME, o, true);
      }
      cx.globalAlpha = 1;
    }
    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);
      if (touch && now - last < 31) return;   // 30 pictures a second is plenty for a slow turn, and halves the work on phones
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var y = w.scrollY, dy = y - lastY; lastY = y;
      if (!dragging) {
        // drift on its own, carry on from a swipe, and turn a little with the page as it scrolls
        var idle = now - touched > 1400;
        vel += ((idle ? AUTO : 0) - vel) * Math.min(1, dt * (idle ? 1.2 : 2.4));
        lon0 += vel * dt + (reduced ? 0 : dy * 0.05);
        if (idle && !reduced) tilt += (22 - tilt) * Math.min(1, dt * 0.8);
      }
      if (lon0 > 180) lon0 -= 360; else if (lon0 < -180) lon0 += 360;
      draw(now);
    }
    function loop() {
      var want = visible && !d.hidden;
      if (want && !running) { running = true; last = performance.now(); lastY = w.scrollY; requestAnimationFrame(tick); }
      else if (!want) running = false;
    }
    box.addEventListener('pointerdown', function (e) {
      dragging = true; px = e.clientX; py = e.clientY; vel = 0; lastMove = performance.now();
      box.classList.add('is-drag', 'is-used');
      try { box.setPointerCapture(e.pointerId); } catch (x) {}
    });
    box.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var now = performance.now(), dx = e.clientX - px, dy = e.clientY - py, dt = Math.max(8, now - lastMove) / 1000;
      var deg = (dx * k / R) / D;
      lon0 -= deg; vel = vel * 0.5 + (-deg / dt) * 0.5;
      if (e.pointerType === 'mouse') tilt = Math.max(-12, Math.min(58, tilt + (dy * k / R) / D));
      px = e.clientX; py = e.clientY; lastMove = now;
      if (!running) draw(now);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
      box.addEventListener(ev, function () {
        if (!dragging) return;
        dragging = false; touched = performance.now(); box.classList.remove('is-drag');
        if (performance.now() - lastMove > 120) vel = 0;
        vel = Math.max(-240, Math.min(240, vel));
        if (ev === 'pointerup') track('GlobeSpin', {});
      });
    });
    // keyboard: left and right arrows turn it
    box.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); lon0 += e.key === 'ArrowLeft' ? -12 : 12; touched = performance.now(); vel = 0; box.classList.add('is-used');
      if (!running) draw(performance.now());
    });
    function begin() {
      resize(); draw(performance.now());
      if (hasIO) {
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting; loop();
          if (visible && !shown && es[0].intersectionRatio > 0.3) { shown = true; introT0 = performance.now(); }
        }, { threshold: [0, 0.3, 0.6] }).observe(box);
      } else { visible = shown = true; introT0 = performance.now(); loop(); }
      d.addEventListener('visibilitychange', loop);
      var rt; w.addEventListener('resize', function () { if (touch && !wChanged) return; clearTimeout(rt); rt = setTimeout(function () { resize(); draw(performance.now()); }, 150); });
      if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { if (!running) draw(performance.now()); });
    }
    fetch('assets/globe.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      var p = j.p, n = p.length / 2; dots = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { var v = vec(p[i * 2] / 10, p[i * 2 + 1] / 10); dots[i * 3] = v[0]; dots[i * 3 + 1] = v[1]; dots[i * 3 + 2] = v[2]; }
      begin();
    }).catch(function () { fig.classList.add('map--flat'); });
  });

  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('loaded'); }); });
  var settled = false;
  function settle() { settled = true; if (hasGsap) ScrollTrigger.refresh(); measure(); chrome(); depth(); }
  (function run() {
    var fn = tasks.shift();
    if (!fn) { if (d.readyState === 'complete') settle(); else w.addEventListener('load', settle, { once: true }); return; }
    try { fn(); } catch (e) { if (w.console) console.error(e); }
    setTimeout(run, 0);
  })();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { if (settled && hasGsap) { ScrollTrigger.refresh(); measure(); } });
})();
