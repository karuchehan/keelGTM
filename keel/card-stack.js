/*
 * Keeps see-through stacked cards tidy.
 *
 * The problem cards and the "How it works" cards slide up over one another.
 * Now that they are translucent, a covered card would show through the card
 * on top of it. This trims each card to the part the next card has not yet
 * covered, so only one card's text is ever visible in any spot.
 *
 * It only reads where the cards are on screen. It does not touch the existing
 * scroll animations.
 */
(function () {
  'use strict';

  var SPILL = 80;    // room left around the card so its shadow is not trimmed

  var pairs = [];

  function link(cards) {
    for (var i = 0; i < cards.length - 1; i++) {
      pairs.push({ card: cards[i], next: cards[i + 1], last: '' });
    }
  }

  ['#pain-track-left', '#pain-track-right'].forEach(function (track) {
    link(Array.prototype.slice.call(document.querySelectorAll(track + ' .pain-point-slot .pain-point')));
  });
  link(Array.prototype.slice.call(document.querySelectorAll('.stack-stage .stack-card')));

  if (!pairs.length) return;

  function update() {
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      var a = p.card.getBoundingClientRect();
      var b = p.next.getBoundingClientRect();
      var covered = Math.round(a.bottom - b.top);
      var clip = '';
      if (covered > 0 && b.left < a.right && b.right > a.left) {
        clip = 'inset(-' + SPILL + 'px -' + SPILL + 'px ' + Math.min(covered, Math.ceil(a.height)) + 'px -' + SPILL + 'px)';
      }
      if (clip !== p.last) {
        p.card.style.clipPath = clip;
        p.card.style.webkitClipPath = clip;
        p.last = clip;
      }
    }
  }

  // Run only while one of the stacking sections is on screen.
  var visible = 0;
  var frame = 0;

  function loop() {
    update();
    frame = visible > 0 ? requestAnimationFrame(loop) : 0;
  }

  var sections = [document.getElementById('problem'), document.getElementById('process')].filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var seen = new Map();
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen.set(e.target, e.isIntersecting); });
      visible = 0;
      seen.forEach(function (on) { if (on) visible++; });
      if (visible > 0 && !frame) frame = requestAnimationFrame(loop);
    });
    sections.forEach(function (s) { watcher.observe(s); });
  } else {
    visible = 1;
    frame = requestAnimationFrame(loop);
  }
})();
