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
    var frames = [], drawn = -1, shown = -1, shownQ = 0, prog = 0, set = '', lastOn = 0, gen = 0, dir = 1, lastPos = 0, speed = 0, settleT = 0;
    var mem = navigator.deviceMemory || 8, lowMem = mem <= 3;
    // Phones and tablets: frames are decoded off the main thread into a small window that moves with the film,
    // so scrolling never has to wait for a picture to decode. Desktops draw straight from the image cache.
    var useBmp = touch && !!w.createImageBitmap && !!w.fetch;
    var blend = !lowMem;            // cross-fade neighbouring frames so slow movement looks continuous
    var IDLE = useBmp ? 11 : 15;    // the first frames are a slow ripple: they loop gently while the page rests at the top
    var idleReady = false, idleArmed = false, idleT0 = 0, inView = true, running = false, lastTick = 0, snapT = 0, fadeTop = null, fadeBot = null, fadeH = 0;
    var ua = navigator.userAgent || '';
    // Safari's engine (every browser on an iPhone or iPad) decodes createImageBitmap(blob) on the main thread: measured at about
    // 7 ms a sharp frame on a fast Mac, more on a phone, which stalls the page mid-scroll. An <img> decodes off the main thread
    // there, so on that engine a frame goes blob -> img.decode() -> bitmap (about 1 ms of main-thread time).
    var viaImg = useBmp && /AppleWebKit/.test(ua) && !/Chrome\/|Chromium\/|Android/.test(ua);
    var lut = null, stat = w.__lw = { route: '', set: '', lo: 0, hi: 0, draws: 0, retimed: false };
    var store = null, live = 0, lite = false, pageUp = false, painted = false, putQ = [], keeping = false, storing = false;

    function url(i, s) {
      var n = String(i + 1); while (n.length < cfg.pad) n = '0' + n;
      return cfg.sets[s || set] + n + '.' + cfg.ext + (cfg.version ? '?v=' + cfg.version : '');
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
    function src(i) { var f = frames[i]; return f ? (useBmp ? f.bmp : (f.ok ? f.img : null)) : null; }
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
      var qa = useBmp ? frames[ia].q : 2;   // 1 = the light copy of this frame, 2 = the sharp one
      var two = ia === a && t > 0.03 && !!src(a + 1), exact = ia === a && (t <= 0.03 || two);
      // resting at the very top, the sharp opening picture is already on screen as a plain image: wait for its sharp twin
      if (qa === 1 && scrollF() < 1 && !canvas.classList.contains('is-ready')) return;
      if (qa === shownQ) {
        if (exact && key === drawn) return;
        if (!exact && ia === shown && drawn === -1) return;   // already showing the best frame available
      }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = touch ? 'low' : 'high';
      ctx.globalAlpha = 1; paint(src(ia));
      if (two) { ctx.globalAlpha = t; paint(src(a + 1)); ctx.globalAlpha = 1; }
      if (fadeTop) { ctx.fillStyle = fadeTop; ctx.fillRect(0, 0, canvas.width, fadeH); ctx.fillStyle = fadeBot; ctx.fillRect(0, canvas.height - fadeH, canvas.width, fadeH); }
      drawn = exact ? key : -1; shown = ia; shownQ = qa; stat.draws++;
      if (painted) ready();
    }
    // the film takes over from the plain opening picture only after that picture has been on screen
    function ready() { if (shown >= 0 && !canvas.classList.contains('is-ready')) { canvas.classList.add('is-ready'); sec.classList.add('has-film'); } }
    // Phones: the film is re-timed so every swipe shows change. Stretches where the picture hardly moves (the resting wave, the
    // finished box) get a small share of the scroll and the transformations get most of it. The table is made by scripts/build-warp.mjs.
    function scrollF() {
      if (!lut) return Math.min(prog / 0.9, 1) * (cfg.count - 1);
      var x = Math.min(prog / 0.95, 1) * (lut.length - 1), i = Math.floor(x);
      return i >= lut.length - 1 ? lut[lut.length - 1] : lut[i] + (lut[i + 1] - lut[i]) * (x - i);
    }
    function retime() {
      var wp = cfg.warp, n = cfg.count;
      if (!touch || !wp || wp.length !== n) return;
      lut = new Float32Array(513);
      for (var k = 0, i = 0; k <= 512; k++) {
        var p = k / 512;
        while (i < n - 2 && wp[i + 1] < p) i++;
        var span = wp[i + 1] - wp[i];
        lut[k] = Math.min(n - 1, i + (span > 0 ? Math.max(0, Math.min(1, (p - wp[i]) / span)) : 1));
      }
      stat.retimed = true;
    }
    function frameNow(now) {
      var sF = scrollF();
      if (!idleReady || sF >= IDLE) return sF;
      var iF = IDLE * 0.5 * (1 - Math.cos(((now - idleT0) / 6400) * Math.PI * 2));
      return sF + iF * (1 - sF / IDLE);   // the ripple fades out as scrolling takes over, so nothing jumps
    }

    /* phones: decoded pictures are kept only around where the film is. While the film is moving fast the light copies are
       decoded (they take a few milliseconds); as it slows and stops, the pictures being looked at are swapped for the sharp ones. */
    function toBitmap(blob) {
      if (!viaImg) return w.createImageBitmap(blob);
      return new Promise(function (res, rej) {
        var im = new Image(), u = URL.createObjectURL(blob), fin = function () { URL.revokeObjectURL(u); };
        im.src = u;
        (im.decode ? im.decode() : new Promise(function (r, j) { im.onload = r; im.onerror = j; }))
          .then(function () { return w.createImageBitmap(im); })
          .then(function (b) { fin(); res(b); }, function (e) { fin(); rej(e); });
      });
    }
    function decode(i, f, q, g) {
      f.busy = q;
      toBitmap(q === 2 ? f.hi : f.lo).then(function (b) {
        if (f.busy === q) f.busy = 0;
        if (g !== gen || !inView || f.q >= q) { b.close(); return; }
        if (f.bmp) f.bmp.close();
        f.bmp = b; f.q = q;
        var nowF = frameNow(performance.now());
        if (Math.abs(i - nowF) < 2 || drawn === -1 || i === shown) draw(nowF);
      }, function () { if (f.busy === q) f.busy = 0; if (i === 0 && q === 2) plain(); });
    }
    function want() {
      if (!useBmp || !inView) return;
      var t = Math.round(scrollF()), top = t <= IDLE + 1, lo = dir >= 0 ? t - 3 : t - 9, hi = dir >= 0 ? t + 9 : t + 3, fast = speed > 1.2, g = gen;
      if (top) { lo = 0; hi = Math.max(hi, IDLE + 1); }
      lo = Math.max(0, lo); hi = Math.min(cfg.count - 1, hi);
      for (var i = lo; i <= hi; i++) {
        var f = frames[i]; if (!f) continue;
        var sharp = f.hi && (top || !f.lo || (!fast && i >= t - 2 && i <= t + 5));
        var best = sharp ? 2 : f.lo ? 1 : 0;
        if (best && f.q < best && f.busy < best) decode(i, f, best, g);
      }
      for (var j = 0; j < frames.length; j++) { var x = frames[j]; if (x && x.bmp && (j < lo - 2 || j > hi + 2)) { x.bmp.close(); x.bmp = null; x.q = 0; } }
    }
    function release() { frames.forEach(function (x) { if (x && x.bmp) { x.bmp.close(); x.bmp = null; x.q = 0; } }); }
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

    /* ---- loading ----
       The film is fetched thinly spread first (every 8th picture, then every 4th, and so on), so whatever part of it the
       visitor scrolls to, a picture close to it is already there and the film moves from the first second. Phones fetch a
       very light copy of the whole film that way (about 1 MB), then the sharp pictures, nearest to the screen first. */
    function level(i) { return (i % 8 === 0 || i === cfg.count - 1) ? 0 : i % 4 === 0 ? 1 : i % 2 === 0 ? 2 : 3; }
    // pictures downloaded on an earlier visit are kept on the phone itself, so coming back never waits on the network
    function openStore() {
      try {
        if (!useBmp || !w.caches || !cfg.version) return;
        var name = 'lw-hero-' + cfg.version;
        w.caches.open(name).then(function (c) {
          store = c;
          return w.caches.keys().then(function (ks) { ks.forEach(function (k) { if (k.indexOf('lw-hero-') === 0 && k !== name) w.caches.delete(k); }); });
        }).catch(function () { store = null; });
      } catch (e) { store = null; }
    }
    function grab(u, low) {
      var net = function () {
        return fetch(u, low ? { priority: 'low' } : undefined).then(function (r) {
          if (!r.ok) throw 0;
          return r.blob();
        }).then(function (b) { if (store) { putQ.push([u, b]); if (storing && !keeping) keep(); } return b; });
      };
      if (!store) return net();
      return store.match(u).then(function (r) { return r ? r.blob() : net(); }, net);
    }
    // what was downloaded is written to the phone's own store afterwards, one picture at a time, when the phone has nothing else to do
    function keep() {
      if (!store || !putQ.length) { keeping = false; return; }
      keeping = true;
      var it = putQ.shift(), next = function () { if (w.requestIdleCallback) w.requestIdleCallback(keep, { timeout: 1500 }); else setTimeout(keep, 40); };
      try { store.put(it[0], new Response(it[1], { headers: { 'Content-Type': 'image/webp' } })).then(next, next); } catch (e) { next(); }
    }
    function rippleIn() { for (var i = 0; i <= Math.min(IDLE + 1, cfg.count - 1); i++) if (!frames[i] || !frames[i].hi) return false; return true; }
    function job(i, q, g) {
      var f = frames[i];
      if (q === 2) f.hs = 1; else f.ls = 1;
      return grab(url(i, q === 2 ? set : 's'), q === 2 && i > 0).then(function (b) {
        if (g !== gen) return;
        if (q === 2) { f.hi = b; f.hs = 2; stat.hi++; } else { f.lo = b; f.ls = 2; stat.lo++; }
        f.ok = true; want();
        if (!idleArmed && rippleIn()) { idleArmed = true; setTimeout(function () { if (g === gen) { idleT0 = performance.now(); idleReady = true; } }, 500); }
      }, function () { if (g === gen) { if (q === 2) f.hs = 3; else f.ls = 3; } });
    }
    // what to fetch next, given where the visitor is right now
    function nextJob() {
      var t = Math.round(scrollF()), top = t <= IDLE + 1, rest = speed < 0.2, bi = -1, bq = 0, bs = 1e9, i, f, d0, s;
      for (i = 0; i < cfg.count; i++) {
        f = frames[i]; d0 = Math.abs(i - t) - (i >= t ? 0.4 : 0);
        if (lite && !f.ls && (!f.hs || f.hs === 3)) {   // light copy: thin spread first, the gaps later
          s = [0, 1000, 4000, 5000][level(i)] + d0;
          if (s < bs) { bs = s; bi = i; bq = 1; }
        }
        if (!f.hs) {                                  // sharp picture
          if (top && i <= IDLE + 1) s = 2000 + i;                       // the resting ripple at the top of the page
          else if (rest && Math.abs(i - t) <= 2) s = 3000 + d0;         // the picture being looked at right now
          else s = (lite ? 6000 : level(i) * 1000 + 2500) + d0;
          if (s < bs) { bs = s; bi = i; bq = 2; }
        }
      }
      return bi < 0 ? null : { i: bi, q: bq, s: bs };
    }
    function pump() {
      if (!useBmp || !painted) return;   // nothing beyond the opening picture is asked for until the page has painted
      var g = gen, room = inView ? 5 : 2;   // once the hero is off screen the rest trickles in, leaving the line free for what is on screen
      while (live < room) {
        var j = nextJob();
        if (!j || (!pageUp && j.s >= 2000)) break;   // until the page itself has finished loading, only the thin spread of light copies is fetched
        // the film already plays everywhere: the pictures further down the page can start coming in, and saving to the phone begins
        if (j.s >= 6000) { warmImages(); if (!storing) { storing = true; keep(); } }
        live++;
        job(j.i, j.q, g).then(function () { if (g === gen) { live--; pump(); } });
      }
      if (!live && pageUp && !nextJob()) { warmImages(); storing = true; if (!keeping) keep(); }
    }

    function load(i) {   // desktop: ordinary images
      return new Promise(function (res) {
        if (frames[i]) return res();
        var f = frames[i] = { ok: false };
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
      release(); gen++; frames = []; drawn = shown = -1; shownQ = 0; set = pick(); stat.set = set; stat.lo = stat.hi = 0; stat.route = !useBmp ? 'plain images' : viaImg ? 'img.decode' : 'bitmap'; idleReady = idleArmed = false; live = 0; size();
      var myGen = gen, n0 = Math.min(IDLE + 2, cfg.count);
      if (useBmp) {
        lite = !!cfg.sets.s && (set === 'm' || set === 'mx');   // the light copies are upright crops, so they only stand in for the upright film
        for (var q = 0; q < cfg.count; q++) frames.push({ ok: false, lo: null, hi: null, bmp: null, q: 0, busy: 0, ls: 0, hs: 0 });
        // the opening picture, sharp, straight away; the thin spread of light copies follows the moment the page has painted
        job(0, 2, myGen); if (painted) pump();
        return;
      }
      // first frame straight away; everything else waits until the page itself has loaded
      load(0).then(function () {
        var go = function () {
          if (gen !== myGen) return;
          var batch = [];
          for (var i = 1; i < n0; i++) batch.push(load(i));
          Promise.all(batch).then(function () {
            if (gen !== myGen) return;
            setTimeout(function () { if (gen === myGen) { idleT0 = performance.now(); idleReady = true; } }, 500);
            var order = [], next = 0, busy = 0;
            for (var L = 0; L < 4; L++) for (var k = n0; k < cfg.count; k++) if (level(k) === L) order.push(k);
            function more() {
              if (gen !== myGen) return;
              if (next >= order.length) { if (!busy) warmImages(); return; }
              busy++; load(order[next++]).then(function () { busy--; more(); });
            }
            for (var c = 0; c < 4; c++) more();
          });
        };
        if (d.readyState === 'complete') setTimeout(go, 250); else w.addEventListener('load', function () { setTimeout(go, 250); }, { once: true });
      });
    }
    function stage(p) {
      // on the re-timed phone film the closing words arrive with the box itself (frame 97 of 120) and stay until the hero ends
      var on = p < 0.15 ? 0 : (p > 0.36 && p < 0.66) ? 1 : p > (lut ? 0.73 : 0.8) ? 2 : -1;
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
      retime(); openStore(); loadAll(); loop();
      var st1 = stages[0], h1 = -1;
      // gate 1: the plain opening picture has been painted -> the film may take over and the thin first pass starts
      var pim = $('.hero__poster img', sec), first = function () {
        if (painted) return;
        requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () { if (painted) return; painted = true; ready(); pump(); }, 120); }); });
      };
      var byPoster = function () { if (!pim || pim.complete) first(); else { pim.addEventListener('load', first, { once: true }); pim.addEventListener('error', first, { once: true }); } };
      // the browser says when it has first painted; where it cannot, the opening picture having loaded is the signal
      try {
        new PerformanceObserver(function (l, o) { if (l.getEntriesByName('first-contentful-paint').length) { o.disconnect(); first(); } }).observe({ type: 'paint', buffered: true });
        setTimeout(byPoster, 1800);
      } catch (e) { byPoster(); }
      setTimeout(first, 3000);
      // gate 2: the page itself has finished loading -> the rest of the film
      var up = function () { setTimeout(function () { pageUp = true; pump(); }, 250); };
      if (d.readyState === 'complete') up(); else w.addEventListener('load', up, { once: true });
      ScrollTrigger.create({
        trigger: sec, start: 'top top', end: 'bottom bottom', scrub: touch ? 0.15 : 0.6,   // a finger is already smooth: the film stays close to it
        onUpdate: function (st) {
          prog = st.progress;
          var sF = scrollF(), dF = sF - lastPos;
          if (Math.abs(dF) > 0.01) { dir = dF > 0 ? 1 : -1; lastPos = sF; }
          speed = speed * 0.6 + Math.abs(dF) * 0.4; stat.f = sF;   // how fast the film is moving, in pictures per screen refresh
          want();
          if (!(idleReady && sF < IDLE)) {
            draw(sF);
            // once the scroll settles, land on a whole frame so the picture is perfectly clean
            if (!touch) { clearTimeout(snapT); snapT = setTimeout(function () { var s2 = scrollF(); if (!(idleReady && s2 < IDLE)) draw(Math.round(s2)); }, 160); }
          }
          // phones: when the film comes to rest, the pictures around it are swapped for the sharp ones
          if (useBmp) { clearTimeout(settleT); settleT = setTimeout(function () { speed = 0; want(); }, 140); }
          if (lut) {
            // the words keep their place in the story: they follow the film, not the raw scroll
            stage(sF / (cfg.count - 1) * 0.9);
            // the headline lifts away with the first movement of the finger
            var v = Math.min(1, sF / 19.5); v = Math.round(v * 50) / 50;
            if (st1 && v !== h1) { h1 = v; st1.style.setProperty('--h1', v); }
          } else stage(prog);
        }
      });
      if (hasIO) new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting; loop();
        if (useBmp) { if (inView) { want(); pump(); } else { release(); drawn = -1; } }   // off screen, the decoded frames are let go to free memory
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
          },
          onRefresh: function () { place(); }
        }
      });
      // each card knows how far it is from the middle of the screen: the centre one stands forward, the rest fall back.
      // Card positions are measured once; while scrolling only the row's own offset is read, so nothing is laid out again.
      var mids = [], lastX = null, vw = w.innerWidth;
      function place() { vw = w.innerWidth; mids = cards.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; }); lastX = null; }
      function spread() {
        var x = +gsap.getProperty(rail, 'x') || 0;
        if (x === lastX) return; lastX = x;
        for (var k = 0; k < cards.length; k++) {
          var px = (mids[k] + x - vw / 2) / vw, cs = cards[k].style;
          if (fine) cs.setProperty('--px', px.toFixed(3));
          cs.setProperty('--pa', Math.min(1, Math.abs(px) * 1.25).toFixed(3));
        }
      }
      place(); spread();
      gsap.ticker.add(spread);
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
      if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(touch); }, 650);
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
          if (hasGsap) ScrollTrigger.refresh(touch);
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
    if (reduced) return;
    var els = $$('[data-s],[data-par]'), items = [], vh = w.innerHeight, lastY = -1;
    if (!els.length) return;
    var gain = portrait.matches ? 0.6 : 1;
    els.forEach(function (el) { if (el.dataset.par) el.style.setProperty('--par', (parseFloat(el.dataset.par) * gain).toFixed(1)); });
    function pageTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
    function measureAll() {
      vh = w.innerHeight;
      items = els.map(function (el, k) { return { el: el, top: pageTop(el), h: el.offsetHeight, live: true, cls: items[k] ? items[k].cls : false, inherit: el.dataset.s === 'inherit' }; });
      lastY = -1;
    }
    function update() {
      var y = w.scrollY; if (y === lastY) return; lastY = y;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], p = (y + vh - it.top) / (vh + it.h);
        var near = p > -0.2 && p < 1.2;
        // phones: only what is on or near the screen is given its own moving layer, so memory stays low
        if (touch && near !== it.cls) { it.cls = near; it.el.classList.toggle('is-near', near); }
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
    w.addEventListener('resize', function () { if (touch && !wChanged) return; measureAll(); update(); });   // a phone's address bar sliding away is not a real resize
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
    if (reduced || !hasGsap || !rows.length || !rows[0].getAnimations) return;
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
      { name: 'Italy', lon: 12.6, lat: 42.6, side: -1, dy: 6 },
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

  /* ---------- phone check ----------
     Open the page with #check at the end of the address to see what this device is actually doing on the first screen.
     It only reads; nothing on the page behaves differently. A screenshot of the box shows how a real phone is running it. */
  later(function check() {
    if (!/check/i.test(location.hash + location.search)) return;
    var box = d.createElement('pre'), s = w.__lw || {}, errs = [], last = 0, worst = 0, slow = 0, moving = 0, lastDraws = 0, filmFps = 0, fps = 0, t0 = performance.now(), frames = 0, lastY = w.scrollY;
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;margin:0;padding:10px 12px;background:rgba(11,11,11,.93);border:1px solid #FFBD59;border-radius:6px;color:#F2EDE4;font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;pointer-events:none';
    d.body.appendChild(box);
    w.addEventListener('error', function (e) { errs.push(String(e.message).slice(0, 70)); });
    w.addEventListener('unhandledrejection', function (e) { errs.push(String(e.reason).slice(0, 70)); });
    function dev() {
      var u = navigator.userAgent, m;
      if ((m = u.match(/iPhone OS (\d+)[_.](\d+)/))) return 'iPhone, iOS ' + m[1] + '.' + m[2];
      if ((m = u.match(/Android (\d+(\.\d+)?)/))) return 'Android ' + m[1];
      if (/iPad|Macintosh/.test(u) && navigator.maxTouchPoints > 1) return 'iPad';
      return 'computer';
    }
    function app() {
      var u = navigator.userAgent;
      return /Instagram/.test(u) ? 'Instagram' : /FBAN|FBAV/.test(u) ? 'Facebook' : /WhatsApp/.test(u) ? 'WhatsApp' : /CriOS/.test(u) ? 'Chrome' : /FxiOS|Firefox/.test(u) ? 'Firefox' : /EdgiOS|Edg\//.test(u) ? 'Edge' : /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Chrome\//.test(u) ? 'Chrome' : /Safari/.test(u) ? 'Safari' : 'in-app browser';
    }
    function show() {
      var c = navigator.connection || {}, hero = heroEl ? Math.max(0, Math.min(1, w.scrollY / Math.max(1, heroEl.offsetHeight - w.innerHeight))) : 0;
      box.textContent = [
        'LOOM WAVE PHONE CHECK: scroll the first screen, then screenshot this box',
        dev() + ' · ' + app() + ' · screen ' + w.innerWidth + 'x' + w.innerHeight + ' @' + (w.devicePixelRatio || 1),
        'motion: ' + (reduced ? 'REDUCED (a phone setting: the page shows its still version)' : 'full') + ' · touch: ' + (touch ? 'yes' : 'no') + ' · data: ' + (c.effectiveType || 'not reported') + (c.saveData ? ', data saver on' : ''),
        'film: ' + (s.set || 'none') + ' via ' + (s.route || 'none') + ' · light ' + (s.lo || 0) + ', sharp ' + (s.hi || 0) + ' of 120 · re-timed: ' + (s.retimed ? 'yes' : 'no'),
        'screen refresh: ' + fps + ' a second · film pictures drawn in the last second: ' + filmFps,
        'while scrolling: ' + moving + ' frames, ' + slow + ' slow, worst ' + Math.round(worst) + ' ms · first screen at ' + Math.round(hero * 100) + '%',
        'errors: ' + (errs.length ? errs.slice(-2).join(' | ') : 'none')
      ].join('\n');
    }
    function tick(now) {
      requestAnimationFrame(tick);
      if (last) { var g = now - last, y = w.scrollY; if (y !== lastY) { moving++; if (g > 50) slow++; if (g > worst) worst = g; lastY = y; } frames++; }
      last = now;
      if (now - t0 >= 1000) { fps = Math.round(frames * 1000 / (now - t0)); filmFps = (s.draws || 0) - lastDraws; lastDraws = s.draws || 0; frames = 0; t0 = now; show(); }
    }
    show(); requestAnimationFrame(tick);
  });

  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('loaded'); }); });
  var settled = false;
  // on phones every refresh is the safe kind: it waits for a swipe to finish instead of stopping it
  function settle() { settled = true; if (hasGsap) ScrollTrigger.refresh(touch); measure(); chrome(); depth(); }
  (function run() {
    var fn = tasks.shift();
    if (!fn) { if (d.readyState === 'complete') settle(); else w.addEventListener('load', settle, { once: true }); return; }
    try { fn(); } catch (e) { if (w.console) console.error(e); }
    setTimeout(run, 0);
  })();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { if (settled && hasGsap) { ScrollTrigger.refresh(touch); measure(); } });
})();
