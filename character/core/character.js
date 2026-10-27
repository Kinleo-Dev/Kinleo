// Fewly character engine (shared by every animation)
// Builds the user's character from layered sprite sheets, recolours it and plays it.
// Load ../manifest.js before this file.
//
//   var player = FewlyCharacter.play(element, 'running');            // the saved character
//   var player = FewlyCharacter.play(element, 'running', { character: cfg, scale: 4 });
//   player.setCharacter(cfg);   // swap the look live
//   player.stop();              // call when leaving the screen
//
//   FewlyCharacter.load() / .save(cfg) / .defaults() / .normalize(cfg)
//   FewlyCharacter.animation(name)   -> Promise of that animation's settings
//   FewlyCharacter.validate()        -> Promise of a report (used by testing/check.html)
//
// A character config:
//   { version: 1,
//     parts:  { body: 'standard', hair: 'short', top: 'singlet', bottom: 'shorts', shoes: 'trainers', accessory: null },
//     colors: { skin: '#E8B98A', hair: '#3A2A1E', top: '#D2553F', ... } }
// Anything missing or unknown is replaced with a default, so old or broken
// saves never crash the app.

(function () {
  'use strict';

  var M = window.FewlyCharacterManifest;
  var STORAGE_KEY = 'fewly.character';

  // character/ folder, found from this script's own address (character/core/character.js),
  // so pages in any folder can use the character without changing paths.
  var ROOT = (function () {
    var src = document.currentScript && document.currentScript.src;
    return src ? src.slice(0, src.lastIndexOf('/') + 1) + '../' : 'character/';
  })();

  function warn(msg) { if (window.console) console.warn('[FewlyCharacter] ' + msg); }
  function has(obj, key) { return obj && Object.prototype.hasOwnProperty.call(obj, key); }

  if (!M) {
    console.error('[FewlyCharacter] character/manifest.js must be loaded before character/core/character.js');
    return;
  }

  // ------------------------------------------------------------ character config

  function isHex(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c); }

  function defaults() {
    var cfg = { version: M.version, parts: {}, colors: {} };
    Object.keys(M.slots).forEach(function (s) { cfg.parts[s] = M.slots[s].default; });
    Object.keys(M.colors).forEach(function (c) { cfg.colors[c] = M.colors[c].default; });
    return cfg;
  }

  // Upgrade configs saved by older versions of the app.
  // When a part or variant is renamed: add a step here and bump manifest.version.
  function migrate(cfg) {
    var v = typeof cfg.version === 'number' ? cfg.version : 1;
    // if (v < 2) { if (cfg.parts && cfg.parts.hair === 'spiky') cfg.parts.hair = 'short'; v = 2; }
    cfg.version = v;
    return cfg;
  }

  // Always returns a complete, valid config. Never throws.
  function normalize(input) {
    var cfg;
    try { cfg = migrate(input && typeof input === 'object' ? JSON.parse(JSON.stringify(input)) : {}); }
    catch (e) { cfg = {}; }
    var parts = cfg.parts && typeof cfg.parts === 'object' ? cfg.parts : {};
    var colors = cfg.colors && typeof cfg.colors === 'object' ? cfg.colors : {};
    var out = { version: M.version, parts: {}, colors: {} };

    Object.keys(M.slots).forEach(function (slot) {
      var def = M.slots[slot];
      var v = parts[slot];
      if (v === null && def.optional) out.parts[slot] = null;
      else if (typeof v === 'string' && has(def.variants, v)) out.parts[slot] = v;
      else {
        if (v !== undefined) warn('Unknown ' + slot + ' "' + v + '", using "' + def.default + '"');
        out.parts[slot] = def.default;
      }
    });
    Object.keys(M.colors).forEach(function (c) {
      out.colors[c] = isHex(colors[c]) ? colors[c].toUpperCase() : M.colors[c].default;
    });
    return out;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return normalize(null);
    }
  }

  function save(cfg) {
    var clean = normalize(cfg);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch (e) { warn('Could not save character'); }
    return clean;
  }

  // ------------------------------------------------------------ animations

  var animCache = {};

  function animFolder(name) { return ROOT + 'animations/' + name + '/'; }

  function animProblem(a) {
    if (!a || typeof a !== 'object') return 'not a JSON object';
    if (!(a.frames > 0 && a.frames % 1 === 0)) return '"frames" must be a whole number above 0';
    if (!(a.frameMs > 0)) return '"frameMs" must be above 0';
    if (a.repEvery !== undefined && !(a.repEvery >= 0)) return '"repEvery" must be 0 or more';
    return null;
  }

  // Resolves to the animation's settings ({ name, label, frames, frameMs, repEvery, locked }) or null.
  function animation(name) {
    if (!animCache[name]) {
      animCache[name] = fetch(animFolder(name) + 'animation.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (a) {
          var problem = animProblem(a);
          if (problem) { warn('animations/' + name + '/animation.json: ' + (a ? problem : 'missing')); return null; }
          return {
            name: name,
            label: typeof a.label === 'string' ? a.label : name,
            frames: a.frames,
            frameMs: a.frameMs,
            repEvery: a.repEvery || 0,
            locked: !!a.locked
          };
        })
        .catch(function () { warn('Could not load animations/' + name + '/animation.json (open through Live Server)'); return null; });
    }
    return animCache[name];
  }

  // The animation to play, falling back to the first listed one if the name is unknown.
  function resolveAnimation(name) {
    return animation(name).then(function (a) {
      if (a) return a;
      var first = M.animations[0];
      if (!first || first === name) return null;
      warn('Animation "' + name + '" unavailable, playing "' + first + '"');
      return animation(first);
    });
  }

  // ------------------------------------------------------------ sprite sheets

  var imageCache = {};

  function loadImage(url) {
    if (!imageCache[url]) {
      imageCache[url] = new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = url;
      });
    }
    return imageCache[url];
  }

  function spritePath(anim, slot, variant) { return 'animations/' + anim + '/sprites/' + slot + '/' + variant + '.png'; }

  function sheetOk(img, A) {
    return img && img.width === A.frames * M.frame.w && img.height === M.depths.length * M.frame.h;
  }

  // Load one layer. If that variant has no sheet for this animation yet,
  // fall back to the part's default so the character still renders.
  function getSheet(A, slot, variant) {
    return loadImage(ROOT + spritePath(A.name, slot, variant)).then(function (img) {
      if (sheetOk(img, A)) return img;
      warn((img ? 'Wrong size: ' : 'Missing: ') + spritePath(A.name, slot, variant));
      var fallback = M.slots[slot].default;
      if (variant === fallback) return null;
      return loadImage(ROOT + spritePath(A.name, slot, fallback)).then(function (img2) {
        return sheetOk(img2, A) ? img2 : null;
      });
    });
  }

  // ------------------------------------------------------------ recolour

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(rgb, amount) { return rgb.map(function (v) { return Math.round(v * (1 - amount)); }); }
  function rgbKey(r, g, b) { return (r << 16) | (g << 8) | b; }

  function recolor(ctx, w, h, colors) {
    var map = {};
    Object.keys(M.keyColors).forEach(function (slot) {
      var pick = hexToRgb(colors[slot] || (M.colors[slot] && M.colors[slot].default) || '#FF00FF');
      var base = hexToRgb(M.keyColors[slot].base);
      var dark = hexToRgb(M.keyColors[slot].shade);
      map[rgbKey(base[0], base[1], base[2])] = pick;
      map[rgbKey(dark[0], dark[1], dark[2])] = shade(pick, M.shadeAmount);
    });
    var data = ctx.getImageData(0, 0, w, h);
    var d = data.data;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      var to = map[rgbKey(d[i], d[i + 1], d[i + 2])];
      if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; }
    }
    ctx.putImageData(data, 0, 0);
  }

  // ------------------------------------------------------------ render

  var renderCache = {};

  // Builds one horizontal strip (all frames) for an animation + character.
  // Resolves to { url, frames, w, h } or null if nothing could be drawn.
  function render(A, cfg) {
    var clean = normalize(cfg);
    var key = A.name + '|' + JSON.stringify(clean);
    if (renderCache[key]) return renderCache[key];

    var fw = M.frame.w, fh = M.frame.h, W = A.frames * fw;

    renderCache[key] = Promise.all(M.layerOrder.map(function (slot) {
      var variant = clean.parts[slot];
      return variant ? getSheet(A, slot, variant) : Promise.resolve(null);
    })).then(function (sheets) {
      if (!sheets[M.layerOrder.indexOf('body')]) warn('No body sheet for "' + A.name + '"');
      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = fh;
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      M.depths.forEach(function (depth, row) {
        sheets.forEach(function (img) { if (img) ctx.drawImage(img, 0, row * fh, W, fh, 0, 0, W, fh); });
      });
      try {
        recolor(ctx, W, fh, clean.colors);
      } catch (e) {
        console.error('[FewlyCharacter] Could not recolour. Open the page through Live Server (http://), not as a file.');
        return null;
      }
      return { url: canvas.toDataURL('image/png'), frames: A.frames, w: fw, h: fh };
    });
    return renderCache[key];
  }

  // ------------------------------------------------------------ play

  function popPlusOne(parent) {
    var chip = document.createElement('span');
    chip.className = 'fw-char-plus';
    chip.textContent = '+1';
    parent.appendChild(chip);
    chip.addEventListener('animationend', function () { chip.remove(); });
  }

  function play(container, name, options) {
    options = options || {};
    var scale = options.scale || 4;
    var showReps = options.showReps !== false;
    var fw = M.frame.w, fh = M.frame.h;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.classList.add('fw-char');
    container.innerHTML =
      '<div class="fw-char-figure">' +
        '<div class="fw-char-sprite" role="img" aria-label="Your character"' +
          ' style="width:' + fw * scale + 'px;height:' + fh * scale + 'px"></div>' +
      '</div>' +
      (options.floor === false ? '' : '<div class="fw-char-floor" style="width:' + (fw + 4) * scale + 'px"></div>');

    var figure = container.querySelector('.fw-char-figure');
    var sprite = container.querySelector('.fw-char-sprite');
    var A = null, frame = 0, timer = null, stopped = false;
    var current = options.character || load();

    function show() { sprite.style.backgroundPosition = (-frame * fw * scale) + 'px 0'; }

    function tick() {
      frame = (frame + 1) % A.frames;
      show();
      if (showReps && A.repEvery && frame % A.repEvery === 0) popPlusOne(figure);
    }

    var drawId = 0;
    function draw() {
      if (!A) return Promise.resolve();
      var id = ++drawId;   // if the look changes again before this finishes, only the newest wins
      return render(A, current).then(function (strip) {
        if (stopped || !strip || id !== drawId) return;
        sprite.style.backgroundImage = 'url(' + strip.url + ')';
        sprite.style.backgroundSize = (strip.frames * fw * scale) + 'px ' + (fh * scale) + 'px';
        show();
        if (!timer && !reduceMotion) timer = setInterval(tick, A.frameMs);
      });
    }

    var ready = resolveAnimation(name).then(function (a) {
      if (!a) { console.error('[FewlyCharacter] No playable animation for "' + name + '"'); return; }
      A = a;
      sprite.setAttribute('aria-label', 'Your character, ' + A.label.toLowerCase());
      return draw();
    });

    return {
      ready: ready,
      setCharacter: function (cfg) { current = cfg; return ready.then(draw); },
      stop: function () {
        stopped = true;
        if (timer) clearInterval(timer);
        timer = null;
      }
    };
  }

  // ------------------------------------------------------------ validate

  // Checks the manifest, every animation.json and every sprite sheet.
  // Resolves to a list of { level: 'ok' | 'warn' | 'error', message }.
  function validate() {
    var report = [];
    function add(level, message) { report.push({ level: level, message: message }); }

    Object.keys(M.colors).forEach(function (c) {
      if (!has(M.keyColors, c)) add('error', 'Colour "' + c + '" has no keyColors entry');
      if (!isHex(M.colors[c].default)) add('error', 'Colour "' + c + '" default is not a #RRGGBB hex');
    });
    Object.keys(M.keyColors).forEach(function (c) {
      if (!has(M.colors, c)) add('warn', 'keyColors "' + c + '" has no user colour');
    });
    Object.keys(M.slots).forEach(function (s) {
      if (M.layerOrder.indexOf(s) === -1) add('error', 'Part "' + s + '" is missing from layerOrder, it will never be drawn');
      if (!has(M.slots[s].variants, M.slots[s].default)) add('error', 'Part "' + s + '" default "' + M.slots[s].default + '" is not one of its variants');
    });
    M.layerOrder.forEach(function (s) { if (!has(M.slots, s)) add('error', 'layerOrder has "' + s + '" but there is no such part'); });
    if (!M.animations || !M.animations.length) add('error', 'manifest.animations is empty');

    return Promise.all((M.animations || []).map(function (name) {
      return animation(name).then(function (A) {
        if (!A) { add('error', 'animations/' + name + '/animation.json is missing or invalid'); return; }
        add('ok', 'animations/' + name + '/animation.json' + (A.locked ? ' (locked: hand edited)' : ''));
        var want = (A.frames * M.frame.w) + 'x' + (M.depths.length * M.frame.h);
        var checks = [];
        Object.keys(M.slots).forEach(function (slot) {
          Object.keys(M.slots[slot].variants).forEach(function (variant) {
            var path = spritePath(name, slot, variant);
            var isDefault = variant === M.slots[slot].default;
            checks.push(loadImage(ROOT + path).then(function (img) {
              if (!img) add(isDefault ? 'error' : 'warn', 'Missing ' + path + (isDefault ? '' : ' (falls back to ' + M.slots[slot].default + ')'));
              else if (!sheetOk(img, A)) add('error', 'Wrong size ' + path + ': ' + img.width + 'x' + img.height + ', expected ' + want);
              else add('ok', path);
            }));
          });
        });
        return Promise.all(checks);
      });
    })).then(function () { return report; });
  }

  window.FewlyCharacter = {
    manifest: M,
    defaults: defaults,
    normalize: normalize,
    load: load,
    save: save,
    animation: animation,
    play: play,
    validate: validate
  };
})();
