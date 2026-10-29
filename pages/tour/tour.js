// Tour page: swipe through the app's features.
//
// SLIDES is the only thing to edit when adding, removing or reordering slides.
//   art: 'running'  plays that character animation (any name listed in character/manifest.js)
//   art: null       shows an empty placeholder box (animation still to be made)
//   artLabel        text shown inside the placeholder box
//   bubble          optional pixel speech bubble next to the character
// {app} in a title or text is replaced with the app name from BRAND.
//
// Every way of moving goes exactly one slide at a time:
// Next / Back, swipe or drag, trackpad sideways scroll, arrow keys, or tapping a dot.
// Back on the first slide returns to the start page (without replaying its logo intro).
// Skip and the last slide's button go to "About you".

(function () {
  'use strict';

  var SLIDES = [
    { key: 'welcome',   title: 'Welcome to {app}!',         text: 'Free to use forever. Upgrade when you want more.', art: null, artLabel: 'Welcome' },
    { key: 'workouts',  title: 'Track your workouts',       text: 'Log sets and reps, or start a live session. Every rep counts.', art: null, artLabel: 'Workouts' },
    { key: 'water',     title: 'Track your water',          text: 'Tap to fill your cup and see how close you are to your goal.', art: null, artLabel: 'Water cup' },
    { key: 'steps',     title: 'Count your steps',          text: 'Your steps update live, with how far you are from your goal.', art: 'running' },
    { key: 'meals',     title: 'Log your meals',            text: 'Tick off what you ate and set the grams. We total the rest.', art: null, artLabel: 'Meal log' },
    { key: 'progress',  title: 'See your progress',         text: 'Clear graphs for every habit, by week and by month.', art: null,       artLabel: 'Graphs' },
    { key: 'plan',      title: 'A plan made for you',       text: 'Tell us your goals and get a plan that fits your day.', art: null,     artLabel: 'Your plan' },
    { key: 'character', title: 'Watch your character grow', text: 'Make it yours. It changes with your real habits.', art: null,          artLabel: 'Character' }
  ];

  var LAST_BUTTON = 'Let’s go';
  var NEXT_PAGE = 'about-you';      // where Skip and the last button lead
  var BACK_PAGE = 'start';          // where Back on the first slide leads
  var SWIPE_DISTANCE = 0.18;        // share of the width a drag must cover to change slide
  var SWIPE_SPEED = 0.4;            // or a quick flick faster than this (px per ms)

  var track = document.getElementById('tourTrack');
  var dotsEl = document.getElementById('tourDots');
  var nextBtn = document.getElementById('tourNext');
  var backBtn = document.getElementById('tourBack');
  var countEl = document.getElementById('tourCount');
  var appName = KinleoApp.brand.name.charAt(0).toUpperCase() + KinleoApp.brand.name.slice(1);
  var current = 0;

  function fill(s) { return s.replace(/\{app\}/g, appName); }

  // ---------- build slides and dots ----------
  var rail = document.createElement('div');
  rail.className = 'tour-rail';
  track.appendChild(rail);

  SLIDES.forEach(function (s, i) {
    var slide = document.createElement('section');
    slide.className = 'tour-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', (i + 1) + ' of ' + SLIDES.length);

    var art = document.createElement('div');
    art.className = 'tour-art' + (s.art ? '' : ' tour-art--empty');
    if (!s.art) art.textContent = s.artLabel || '';

    var words = document.createElement('div');
    words.className = 'tour-words';
    var title = document.createElement('h1');
    title.className = 'tour-title';
    title.textContent = fill(s.title);
    var text = document.createElement('p');
    text.className = 'tour-text';
    text.textContent = fill(s.text);
    words.appendChild(title);
    words.appendChild(text);

    slide.appendChild(art);
    slide.appendChild(words);
    rail.appendChild(slide);

    if (s.art) {
      // as large as fits the box: 48-pixel-tall sprite plus the 8px floor.
      // A whole-number scale keeps the pixels sharp.
      var scale = Math.max(2, Math.min(5, Math.floor((art.clientHeight - 8) / 48)));
      KinleoCharacter.play(art, s.art, { scale: scale });
    }
    if (s.bubble) {
      var bubble = document.createElement('span');
      bubble.className = 'tour-bubble';
      bubble.textContent = s.bubble;
      art.appendChild(bubble);
    }

    var dot = document.createElement('button');
    dot.className = 'tour-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', 'Slide ' + (i + 1) + ': ' + fill(s.title));
    dot.addEventListener('click', function () { goTo(i); });
    dotsEl.appendChild(dot);
  });

  var dots = dotsEl.querySelectorAll('.tour-dot');
  var slides = rail.querySelectorAll('.tour-slide');

  // ---------- moving between slides ----------
  function place(offsetPx, animate) {
    rail.classList.toggle('is-animating', !!animate && !KinleoApp.reduceMotion);
    rail.style.transform = 'translateX(calc(' + (-current * 100) + '% + ' + (offsetPx || 0) + 'px))';
  }

  function goTo(i) {
    current = Math.max(0, Math.min(SLIDES.length - 1, i));
    place(0, true);
    dots.forEach(function (d, n) { d.setAttribute('aria-selected', String(n === current)); });
    slides.forEach(function (s, n) { s.setAttribute('aria-hidden', String(n !== current)); });
    nextBtn.textContent = current === SLIDES.length - 1 ? LAST_BUTTON : 'Next';
    countEl.textContent = (current + 1) + '/' + SLIDES.length;
    backBtn.setAttribute('aria-label', current === 0 ? 'Back to start' : 'Previous slide');
  }

  // ---------- Next / Let's go ----------
  nextBtn.addEventListener('click', function () {
    if (current === SLIDES.length - 1) {
      nextBtn.classList.add('is-pressed');
      if (!KinleoApp.go(NEXT_PAGE)) setTimeout(function () { nextBtn.classList.remove('is-pressed'); }, 300);
    } else {
      goTo(current + 1);
    }
  });

  // ---------- Back ----------
  backBtn.addEventListener('click', function () {
    if (current === 0) {
      backBtn.classList.add('is-pressed');
      // #main tells the start page to skip its logo intro
      if (!KinleoApp.go(BACK_PAGE, { hash: 'main' })) setTimeout(function () { backBtn.classList.remove('is-pressed'); }, 300);
    } else {
      goTo(current - 1);
    }
  });

  // ---------- arrow keys ----------
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
  });

  // ---------- swipe and drag (finger, pen or mouse) ----------
  var drag = null;
  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, sideways: null, id: e.pointerId };
  });
  track.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.sideways === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      drag.sideways = Math.abs(dx) > Math.abs(dy);
      if (drag.sideways) { track.setPointerCapture(e.pointerId); track.classList.add('is-dragging'); }
    }
    if (!drag.sideways) return;
    // resist dragging past the first or last slide
    var atEdge = (current === 0 && dx > 0) || (current === SLIDES.length - 1 && dx < 0);
    drag.dx = atEdge ? dx * 0.3 : dx;
    place(drag.dx, false);
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    track.classList.remove('is-dragging');
    if (!d.sideways) return;
    var speed = Math.abs(d.dx) / Math.max(1, e.timeStamp - d.t);
    var far = Math.abs(d.dx) > track.clientWidth * SWIPE_DISTANCE || speed > SWIPE_SPEED;
    if (far && d.dx < 0) goTo(current + 1);
    else if (far && d.dx > 0) goTo(current - 1);
    else goTo(current);
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  // ---------- trackpad sideways scroll: one gesture = one slide ----------
  var wheelSum = 0, wheelLock = false, wheelTimer = null;
  track.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   // vertical scrolling: ignore
    e.preventDefault();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { wheelSum = 0; wheelLock = false; }, 180);  // gesture ended
    if (wheelLock) return;
    wheelSum += e.deltaX;
    if (Math.abs(wheelSum) > 40) {
      goTo(current + (wheelSum > 0 ? 1 : -1));
      wheelLock = true;
      wheelSum = 0;
    }
  }, { passive: false });

  goTo(0);
})();
