// Start page timing.
// Intro logo shows, then fades out and the main start screen fades in.
// Tapping during the intro skips straight to the main start screen.

(function () {
  'use strict';

  var INTRO_HOLD = 2200;   // ms the logo stays before fading
  var GAP = 300;           // ms between intro fading out and start fading in

  var page = document.querySelector('.start');
  var start = document.querySelector('.start-main');
  var shown = false;
  var timers = [];

  function showStart() {
    if (shown) return;
    shown = true;
    timers.forEach(clearTimeout);
    page.classList.add('is-intro-done');
    timers.push(setTimeout(function () {
      page.classList.add('is-main');
      start.removeAttribute('aria-hidden');
    }, KinleoApp.reduceMotion ? 0 : GAP));
  }

  if (KinleoApp.reduceMotion) {
    showStart();
  } else {
    timers.push(setTimeout(showStart, INTRO_HOLD));
    document.querySelector('.start-intro').addEventListener('click', showStart);
  }
})();
