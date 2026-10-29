// Start page timing.
// Intro logo shows, then fades out and the main start screen fades in.
// Tapping during the intro skips straight to the main start screen.
// The intro plays once per visit: coming back here (Back from the tour, or the
// browser's back button) shows the main start screen straight away.
// The running character starts loading straight away, so it is already
// running when the main screen appears.

(function () {
  'use strict';

  var INTRO_HOLD = 2200;   // ms the logo stays before fading
  var GAP = 300;           // ms between intro fading out and start fading in
  var CHARACTER_SCALE = 5; // 32 x 48 sprite shown at 160 x 240

  // The saved character (or the default one for new users), running.
  // (The browser pauses it automatically when the page is hidden or left.)
  KinleoCharacter.play(document.getElementById('startStage'), 'running', {
    scale: CHARACTER_SCALE
  });

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
    }, KinleoApp.reduceMotion || page.classList.contains('no-intro') ? 0 : GAP));
  }

  var seen = false;
  try { seen = sessionStorage.getItem('kinleo.introSeen') === '1'; } catch (e) {}
  try { sessionStorage.setItem('kinleo.introSeen', '1'); } catch (e) {}

  if (KinleoApp.reduceMotion || seen || location.hash === '#main') {
    page.classList.add('no-intro');    // no fade: just show the main screen
    showStart();
  } else {
    timers.push(setTimeout(showStart, INTRO_HOLD));
    document.querySelector('.start-intro').addEventListener('click', showStart);
  }
})();
