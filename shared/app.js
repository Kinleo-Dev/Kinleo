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
    tagline: 'Move a little, every day.'
  };

  // Every page, in flow order. Value = folder inside pages/, or null if not built yet.
  var PAGES = {
    'start':           'start',
    'get-info':        null,
    'height':          null,
    'character-build': null,
    'welcome':         null,
    'signup':          null,
    'login':           null
  };

  // Project root, worked out from this script's own address (shared/app.js),
  // so links work from any page.
  var ROOT = (function () {
    var src = document.currentScript && document.currentScript.src;
    return src ? src.slice(0, src.lastIndexOf('/') + 1) + '../' : '../../';
  })();

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  function go(name) {
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
    var url = ROOT + 'pages/' + PAGES[name] + '/index.html';
    if (reduceMotion) { window.location.href = url; return true; }
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
