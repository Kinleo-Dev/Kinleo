// Shared app helpers. Every page loads this.
//
// BRAND: the app's name and tagline, shown wherever a page has
//   <div data-brand-logo></div> or <p data-brand-tagline></p>.
//   Renaming the app = change BRAND here. Nothing else.
//
// PAGES: every page in the app. All links go through KinleoApp.go('page-name'),
//   so paths live in one place and never break.
//   <button data-go="login">   navigates on click, no extra code needed

(function () {
  'use strict';

  var BRAND = {
    name: 'kinleo',                        // shown lowercase in the logo, followed by the coral dot
    tagline: 'Progress a little, every day.'
  };

  // Every page, in flow order. Value = folder inside pages/, or null if not built yet.
  var PAGES = {
    'start':           'start',
    'tour':            'tour',     // feature slides after "Get started"
    'about-you':       null,       // name, age, height, goals
    'character-build': null,
    'signup':          null,       // create account
    'login':           null
  };

  // Project root, worked out from this script's own address (shared/app.js),
  // so links work from any page.
  var ROOT = (function () {
    var src = document.currentScript && document.currentScript.src;
    return src ? src.slice(0, src.lastIndexOf('/') + 1) + '../' : '../../';
  })();

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Browsers that cross-fade between pages by themselves (cross-page view transitions)
  var nativeFade = 'onpagereveal' in window;
  if (nativeFade) {
    document.documentElement.classList.add('kn-vt');
    // A page fade cut short (e.g. pressing back mid-fade) is normal: don't report it as an error.
    var quiet = function (e) {
      var vt = e.viewTransition;
      if (!vt) return;
      [vt.ready, vt.finished, vt.updateCallbackDone].forEach(function (p) { if (p) p.catch(function () {}); });
    };
    window.addEventListener('pagereveal', quiet);
    window.addEventListener('pageswap', quiet);
  }
  var leaving = false;

  // ---------- brand ----------
  function applyBrand() {
    var title = BRAND.name.charAt(0).toUpperCase() + BRAND.name.slice(1);
    if (!document.title) document.title = title;
    document.querySelectorAll('[data-brand-logo]').forEach(function (el) {
      el.textContent = BRAND.name;
      var dot = document.createElement('span');
      dot.className = 'kn-logo-dot';
      el.appendChild(dot);
      el.setAttribute('aria-label', title);
    });
    document.querySelectorAll('[data-brand-tagline]').forEach(function (el) {
      el.textContent = BRAND.tagline;
    });
  }

  // ---------- toast ----------
  function toast(text) {
    var app = document.querySelector('.app') || document.body;
    var old = app.querySelector('.kn-toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'kn-toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    app.appendChild(t);
    t.addEventListener('animationend', function () { t.remove(); });
  }

  // ---------- navigation ----------
  // Returns true if it is leaving the page.
  // options.hash adds #something to the address, e.g. go('start', { hash: 'main' }).
  function go(name, options) {
    if (leaving) return false;
    if (!Object.prototype.hasOwnProperty.call(PAGES, name)) {
      console.warn('[KinleoApp] Unknown page "' + name + '"');
      return false;
    }
    if (!PAGES[name]) {
      toast('This page is coming next');
      return false;
    }
    leaving = true;
    var url = ROOT + 'pages/' + PAGES[name] + '/index.html' + (options && options.hash ? '#' + options.hash : '');
    if (reduceMotion || nativeFade) { window.location.href = url; return true; }
    document.body.classList.add('kn-leaving');
    setTimeout(function () { window.location.href = url; }, 250);
    return true;
  }

  // Any element with data-go="page-name" navigates on click.
  // It keeps its pressed look while the page fades out.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-go]');
    if (!el) return;
    e.preventDefault();
    el.classList.add('is-pressed');
    if (!go(el.getAttribute('data-go'))) {
      setTimeout(function () { el.classList.remove('is-pressed'); }, 300);
    }
  });

  // Coming back with the browser's back button: reset the page.
  window.addEventListener('pageshow', function () {
    leaving = false;
    document.body.classList.remove('kn-leaving');
    document.querySelectorAll('.is-pressed').forEach(function (el) { el.classList.remove('is-pressed'); });
  });

  applyBrand();

  window.KinleoApp = { go: go, toast: toast, brand: BRAND, pages: PAGES, root: ROOT, reduceMotion: reduceMotion };
})();
