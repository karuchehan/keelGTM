/*
 * keelGTM ship journey.
 *
 * A list of waypoints tied to the page's sections. Scroll position picks a spot
 * on the route, so the journey plays forward and back with the scrollbar.
 *
 * Each waypoint:
 *   x, y     where the ship's waterline sits, as a fraction of the viewport (0,0 is top left)
 *   len      hull length as a fraction of viewport height
 *   yaw      heading in half turns. Even numbers face right, odd face left, halves face the viewer or away
 *   heel     lean from the wind, in radians
 *   pitch    bow up (+) or down (-), in radians
 *   lean     tilt toward the viewer, so the deck shows
 *   energy   how hard the ship is driving (0 calm, 1 surge)
 *   calm     how still the water is (0 normal, 1 nearly flat)
 *   big      progress of the big wave passing under the ship (0 ahead, 1 gone)
 */
(function () {
  'use strict';

  var KEEL = (window.KEEL = window.KEEL || {});
  var PROPS = ['x', 'y', 'len', 'yaw', 'heel', 'pitch', 'lean', 'energy', 'calm', 'big'];

  function docTop(selector) {
    var el = document.querySelector(selector);
    if (!el) return null;
    var box = el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    return box.getBoundingClientRect().top + window.pageYOffset;
  }

  KEEL.createJourney = function () {
    var keys = [];

    function measure() {
      var vh = window.innerHeight;
      var end = Math.max(1, document.documentElement.scrollHeight - vh);
      var P = docTop('#problem'), O = docTop('#offerings'), C = docTop('#craft');
      var S = docTop('.stack-pin-wrap'), T = docTop('#team');
      if (P === null || O === null || C === null || S === null || T === null) { keys = []; return; }

      // Stretches between sections. Waypoints are spaced along these, so they can
      // never bunch up and make the ship snap, whatever the section heights are.
      var OC = C - O, CS = S - C, W = S + 2000, WT = T - W, TE = end - T;

      var raw = [
        // Hero: at rest, low right, bow toward the page.
        [0,              { x: 0.82, y: 0.62, len: 0.56, yaw: 1.16, heel: 0.06 }],
        [P - 0.55 * vh,  { x: 0.84, y: 0.56, len: 0.5,  yaw: 1.1,  heel: 0.08, energy: 0.1 }],

        // Two things are slowing your revenue: the surge, right to left.
        [P,              { x: 0.8,  y: 0.5,  len: 0.44, yaw: 1.04, heel: 0.16, energy: 0.4 }],
        [P + 650,        { x: 0.16, y: 0.47, len: 0.34, yaw: 0.97, heel: 0.3,  energy: 1 }],
        [P + 1250,       { x: 0.06, y: 0.5,  len: 0.33, yaw: 1.0,  heel: 0.12, energy: 0.25 }],
        [P + 1800,       { x: 0.02, y: 0.52, len: 0.36, yaw: 1.05, heel: 0.05, energy: 0.1 }],

        // What We Build: comes about at the left edge, glides right, grows.
        [O - 0.75 * vh,  { x: 0.05, y: 0.55, len: 0.46, yaw: 1.5,  heel: 0.0,  energy: 0.3 }],
        [O - 0.25 * vh,  { x: 0.62, y: 0.42, len: 0.6,  yaw: 1.89, heel: 0.12, energy: 0.45 }],
        [O + 0.15 * vh,  { x: 0.86, y: 0.36, len: 0.66, yaw: 1.86, heel: 0.1,  energy: 0.2 }],
        [O + 0.5 * OC,   { x: 0.92, y: 0.4,  len: 0.6,  yaw: 1.94, heel: 0.06, energy: 0.1 }],

        // Built. Delivered: turns away, then a long slow glide left, easing smaller all the way.
        [O + 0.82 * OC,  { x: 0.94, y: 0.5,  len: 0.52, yaw: 2.5,  heel: 0.0 }],
        [C + 0.12 * CS,  { x: 0.82, y: 0.6,  len: 0.45, yaw: 3.02, heel: 0.05, calm: 0.4 }],
        [C + 0.45 * CS,  { x: 0.52, y: 0.68, len: 0.38, yaw: 3.0,  heel: 0.04, calm: 0.7 }],
        [C + 0.72 * CS,  { x: 0.2,  y: 0.68, len: 0.36, yaw: 2.98, heel: 0.04, calm: 0.6 }],

        // How it works: turns toward the viewer, then rides along the top edge of the cards,
        // in the open band beside the heading. Climbs the big wave, crashes, settles at the right.
        [C + 0.88 * CS,  { x: 0.1,  y: 0.62, len: 0.42, yaw: 3.5,  heel: 0.0,  energy: 0.3 }],
        [S,              { x: 0.36, y: 0.43, len: 0.42, yaw: 3.85, heel: 0.1,  energy: 0.45, big: 0 }],
        [S + 350,        { x: 0.5,  y: 0.375, len: 0.42, yaw: 3.92, heel: 0.14, pitch: 0.1,   energy: 0.7, big: 0.17 }],
        [S + 700,        { x: 0.62, y: 0.37, len: 0.43, yaw: 3.93, heel: 0.18, pitch: 0.2,   energy: 0.9, big: 0.34 }],
        [S + 1150,       { x: 0.76, y: 0.37, len: 0.43, yaw: 3.94, heel: 0.16, pitch: 0.26,  energy: 1,   big: 0.53 }],
        [S + 1400,       { x: 0.85, y: 0.4,  len: 0.45, yaw: 3.95, heel: 0.1,  pitch: -0.26, energy: 1,   big: 0.72 }],
        [S + 2000,       { x: 0.9,  y: 0.37, len: 0.5,  yaw: 3.97, heel: 0.06, energy: 0.25, big: 1 }],

        // Team: turns away at the right, sails left past the heading, deck showing.
        [W + 0.3 * WT,   { x: 0.93, y: 0.5,  len: 0.54, yaw: 4.5,  heel: 0.0,  big: 1 }],
        [W + 0.62 * WT,  { x: 0.8,  y: 0.44, len: 0.46, yaw: 5.04, heel: 0.08, lean: 0.2,  energy: 0.2, big: 1 }],
        [T - 0.1 * vh,   { x: 0.62, y: 0.44, len: 0.43, yaw: 5.02, heel: 0.08, lean: 0.34, energy: 0.3, big: 1 }],
        [T + 0.35 * TE,  { x: 0.3,  y: 0.52, len: 0.41, yaw: 4.98, heel: 0.08, lean: 0.36, energy: 0.3, big: 1 }],

        // Your outbound needs a keel: one last turn, then home.
        [T + 0.5 * TE,   { x: 0.2,  y: 0.57, len: 0.43, yaw: 5.5,  heel: 0.0,  lean: 0.12, big: 1 }],
        [T + 0.68 * TE,  { x: 0.45, y: 0.6,  len: 0.48, yaw: 5.95, heel: 0.1,  energy: 0.3, calm: 0.3, big: 1 }],
        [end - 0.03 * vh, { x: 0.8,  y: 0.58, len: 0.5,  yaw: 6.0,  heel: 0.0,  calm: 1, big: 1 }],
        [end + 1,         { x: 0.8,  y: 0.58, len: 0.5,  yaw: 6.0,  heel: 0.0,  calm: 1, big: 1 }]
      ];

      keys = [];
      var last = -1e9;
      raw.forEach(function (r) {
        var k = { at: Math.max(r[0], last + 60) };
        last = k.at;
        PROPS.forEach(function (p) { k[p] = r[1][p] || 0; });
        k.yaw *= Math.PI;
        keys.push(k);
      });
    }

    // Smooth curve through the waypoints, so speed carries through each one.
    function sample(scroll, out) {
      out = out || {};
      var n = keys.length;
      if (!n) return null;
      var i = 0;
      while (i < n - 2 && scroll > keys[i + 1].at) i++;
      var a = keys[i], b = keys[i + 1];
      var span = b.at - a.at;
      var t = Math.min(1, Math.max(0, (scroll - a.at) / span));
      var t2 = t * t, t3 = t2 * t;
      var h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      var prev = keys[Math.max(0, i - 1)], next = keys[Math.min(n - 1, i + 2)];
      for (var j = 0; j < PROPS.length; j++) {
        var p = PROPS[j];
        var m0 = (b[p] - prev[p]) / (b.at - prev.at || 1);
        var m1 = (next[p] - a[p]) / (next.at - a.at || 1);
        out[p] = h00 * a[p] + h10 * span * m0 + h01 * b[p] + h11 * span * m1;
      }
      out.energy = Math.min(1, Math.max(0, out.energy));
      out.calm = Math.min(1, Math.max(0, out.calm));
      out.big = Math.min(1, Math.max(0, out.big));
      out.len = Math.max(0.12, out.len);

      // A little wander tied to scroll position, so the path never reads as a straight slide.
      out.x += Math.sin(scroll * 0.0031) * 0.012 + Math.sin(scroll * 0.0079 + 1.3) * 0.005;
      out.y += Math.sin(scroll * 0.0043 + 0.6) * 0.012;
      return out;
    }

    measure();
    return { measure: measure, sample: sample, keys: function () { return keys; } };
  };
})();
