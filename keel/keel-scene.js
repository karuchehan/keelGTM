/*
 * keelGTM ship scene.
 *
 * Puts the ship and its sea on one fixed canvas between the wave background
 * and the page content, and runs the frame loop:
 *
 *   scroll position  ->  keel-journey.js  ->  where the ship is, how it faces
 *   time             ->  keel-sea.js      ->  swell the ship rides, spray, wake
 *   page layout      ->  this file        ->  dims ship and sea wherever copy sits over them
 *
 * three.js loads on demand, so small screens never download it.
 */
(function () {
  'use strict';

  var KEEL = window.KEEL;
  var SHAPE = window.KEEL_SHAPE;
  if (!KEEL || !SHAPE || !KEEL.buildShip || !KEEL.createSea || !KEEL.createJourney) return;

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
  var SMALL_SCREEN = window.matchMedia('(max-width: 768px)');
  var REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  var LOCK_QUALITY = /[?&]keel-hq\b/.test(window.location.search);   // testing aid: never step quality down

  // Things the ship must never fight with. Cards and controls count as a whole box,
  // text counts only where the letters actually are.
  var BOXES = '.nav-inner, .hero-pill, .hero-form, .hero-chips, .hero-watch, .hero-social-proof, ' +
    '.problem-header-card, .problem-col-track-wrap, .offering-card, .craft-card, .stack-stage, ' +
    '#tools, .team-card, .btn-cta, .footer-inner';
  var TEXT = '.hero h1, .hero > p, .section-label, .section h2, #cta p';
  var MAX_RECTS = 16;

  var BIG_WAVE = 0.27;        // height of the big wave, in ship units
  var CREST = 0.6;            // point in the big wave's pass where the ship comes off the top

  var started = false;

  function start() {
    if (started || SMALL_SCREEN.matches) return;
    started = true;
    import(THREE_URL).then(build).catch(function (err) {
      console.warn('[keel] 3D layer unavailable:', err);
    });
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(current, target, dt, seconds) { return current + (target - current) * (1 - Math.exp(-dt / seconds)); }

  // A weighted spring: lets the ship overshoot and settle instead of snapping to the water.
  function spring(s, target, dt, stiffness, damping) {
    s.v += (-2 * damping * stiffness * s.v - stiffness * stiffness * (s.x - target)) * dt;
    s.x += s.v * dt;
    return s.x;
  }

  function build(THREE) {
    var canvas = document.createElement('canvas');
    canvas.id = 'keel-scene';
    canvas.setAttribute('aria-hidden', 'true');

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    } catch (err) {
      console.warn('[keel] WebGL unavailable:', err);
      return;
    }
    renderer.setClearColor(0x000000, 0);

    var waves = document.getElementById('wave-bg');
    if (waves && waves.parentNode) waves.parentNode.insertBefore(canvas, waves.nextSibling);
    else document.body.insertBefore(canvas, document.body.firstChild);

    var shared = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: 1 },
      uTime: { value: 0 },
      uRects: { value: [] },
      uRectCount: { value: 0 }
    };
    for (var r = 0; r < MAX_RECTS; r++) shared.uRects.value.push(new THREE.Vector4());

    var materials = KEEL.createMaterials(THREE, shared);
    var ship = KEEL.buildShip(THREE, SHAPE, materials);
    var sea = KEEL.createSea(THREE, shared);
    var journey = KEEL.createJourney();

    // ship.model sits inside three nested groups: ride (place, wave tilt), heading (yaw), trim (pitch, heel).
    var ride = new THREE.Group(), heading = new THREE.Group(), trim = new THREE.Group();
    trim.add(ship.model); heading.add(trim); ride.add(heading);

    var ghostQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materials.ghostLayer);
    ghostQuad.frustumCulled = false;
    ghostQuad.renderOrder = 1;

    var scene = new THREE.Scene();
    scene.add(sea.quad, ghostQuad, ride, sea.spray);

    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.z = 8;

    var ghostTarget = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false, samples: 4 });
    materials.ghostLayer.uniforms.tGhost.value = ghostTarget.texture;

    var view = { w: 1, h: 1, worldPerPx: 1 };
    var level = 0;            // 0 full, 1 lower resolution, 2 lower resolution and no rippling light

    function layout() {
      view.w = window.innerWidth; view.h = window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, level === 0 ? 1.5 : 1);
      renderer.setPixelRatio(dpr);
      renderer.setSize(view.w, view.h, false);
      camera.aspect = view.w / view.h;
      camera.updateProjectionMatrix();
      view.worldPerPx = (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z) / view.h;
      shared.uRes.value.set(view.w, view.h);
      shared.uDpr.value = dpr;
      var gw = Math.max(2, Math.round((view.w * dpr) / 1.4)), gh = Math.max(2, Math.round((view.h * dpr) / 1.4));
      ghostTarget.setSize(gw, gh);
      materials.ghostLayer.uniforms.uTexel.value.set(1 / gw, 1 / gh);
      journey.measure();
    }

    // ── Copy the ship must stay behind ───────────────────────────────────
    var blocks = [];
    Array.prototype.forEach.call(document.querySelectorAll(BOXES), function (el) { blocks.push({ el: el }); });
    Array.prototype.forEach.call(document.querySelectorAll(TEXT), function (el) {
      var range = document.createRange();
      range.selectNodeContents(el);
      blocks.push({ el: range });
    });
    var found = [];

    function readCopy(shipX, shipY) {
      found.length = 0;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i].el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > view.h || b.right < 0 || b.left > view.w) continue;
        var dx = Math.max(b.left - shipX, 0, shipX - b.right), dy = Math.max(b.top - shipY, 0, shipY - b.bottom);
        found.push({ b: b, d: dx * dx + dy * dy });
      }
      if (found.length > MAX_RECTS) found.sort(function (p, q) { return p.d - q.d; });
      var n = Math.min(found.length, MAX_RECTS);
      for (i = 0; i < n; i++) {
        var f = found[i].b;
        shared.uRects.value[i].set(f.left - 8, f.top - 8, f.right + 8, f.bottom + 8);
      }
      shared.uRectCount.value = n;
    }

    // ── Frame ────────────────────────────────────────────────────────────
    var J = {};
    var s = {
      scroll: window.pageYOffset, time: 0, travel: 0,
      px: null, len: null, speed: 0, drive: 0, energy: 0, yaw: null, turn: 0, big: null,
      heave: { x: 0, v: 0 }, tilt: { x: 0, v: 0 }, roll: { x: 0, v: 0 }
    };
    var frameInfo = { big: {} };

    function step(dt, still) {
      s.scroll = still ? 0 : ease(s.scroll, window.pageYOffset, dt, 0.3);
      if (!journey.sample(s.scroll, J)) return false;
      s.time += dt;
      shared.uTime.value = s.time;

      // Size eases on its own clock as well, so the ship never jumps between near and far.
      s.len = s.len === null ? J.len : ease(s.len, J.len, dt, 0.5);
      var unit = (s.len * view.h) / ship.length;                 // screen px per ship unit
      var calmF = 1 - 0.8 * J.calm;
      var px = J.x * view.w + (still ? 0 : Math.sin(s.time * 0.23) * 0.02 * unit * calmF);
      var py = J.y * view.h;

      if (s.px === null) { s.px = px; s.yaw = J.yaw; s.big = J.big; }
      var moved = (px - s.px) / unit;
      s.px = px;
      s.travel += moved;

      if (dt > 0) {
        s.speed = ease(s.speed, moved / dt, dt, 0.16);
        s.turn = ease(s.turn, clamp((J.yaw - s.yaw) / dt, -2.5, 2.5), dt, 0.25);
      }
      s.yaw = J.yaw;

      var pace = clamp(Math.abs(s.speed) / 1.5, 0, 1);
      var drive = pace * (0.25 + 0.75 * J.energy);
      s.drive = ease(s.drive, drive, dt, drive > s.drive ? 0.12 : 0.5);
      var energyGoal = Math.max(pace * 0.8, drive, J.energy * 0.25);
      s.energy = ease(s.energy, energyGoal, dt, energyGoal > s.energy ? 0.3 : 1.2);

      var facing = Math.cos(J.yaw);                               // 1 bow right, -1 bow left, 0 end on
      var dir = facing >= 0 ? 1 : -1;
      var window_ = clamp(J.big / 0.06, 0, 1) * clamp((1 - J.big) / 0.06, 0, 1);

      var f = frameInfo;
      f.dt = dt; f.shipX = px; f.shipY = py; f.unit = unit; f.travel = s.travel;
      f.energy = s.energy; f.calm = J.calm; f.speed = still ? 0 : s.drive; f.dir = dir;
      f.bowX = ship.bowX * facing; f.sternX = ship.sternX * facing; f.turn = clamp(s.turn * 0.6, -1, 1);
      f.big.x = (3.4 - 6.8 * J.big) * dir; f.big.amp = BIG_WAVE * window_;
      f.fade = 1; f.quality = level === 2 ? 0 : 1;
      sea.update(f);

      // Coming off the crest: one burst of spray and a shove.
      if (!still && dt > 0 && (s.big - CREST) * (J.big - CREST) < 0) {
        var forward = J.big > s.big;
        sea.burst(f, forward ? 1 : 0.55);
        s.tilt.v -= (forward ? 1.5 : 0.7) * dir;
        s.heave.v -= forward ? 0.9 : 0.4;
      }
      s.big = J.big;

      // The ship rides the water under it, with weight.
      var water = sea.surface(0);
      var heave, tilt, roll;
      if (still) {
        heave = water.height; tilt = Math.atan(water.slope) * 0.75; roll = J.heel;
      } else {
        heave = spring(s.heave, water.height * 0.92, dt, 5.2, 0.5);
        tilt = spring(s.tilt, Math.atan(water.slope) * 0.8 + J.pitch * facing, dt, 4.4, 0.36);
        var sway = (Math.sin(s.time * 0.71) * 0.035 + Math.sin(s.time * 1.13 + 1.0) * 0.02) * calmF * (1 + s.energy);
        roll = spring(s.roll, J.heel + sway - clamp(s.turn * 0.16, -0.22, 0.22), dt, 3.6, 0.45);
      }

      var wpp = view.worldPerPx;
      ride.position.set((px - view.w / 2) * wpp, (view.h / 2 - (py - heave * unit)) * wpp, 0);
      ride.scale.setScalar(unit * wpp);
      ride.rotation.set(J.lean, 0, tilt);
      heading.rotation.y = J.yaw;
      trim.rotation.x = roll;

      var ku = materials.keel.uniforms;
      ku.uUnitW.value = unit * wpp;
      ku.uWaterY.value = (view.h / 2 - (py - water.height * unit)) * wpp;
      ku.uTravel.value = s.travel;
      ku.uLight.value = f.quality;

      readCopy(px, py);
      return true;
    }

    function draw() {
      camera.layers.set(KEEL.GHOST_LAYER);
      renderer.setRenderTarget(ghostTarget);
      renderer.render(scene, camera);
      camera.layers.set(0);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }

    var frame = 0, last = 0, slow = 0, pageHeight = 0, checked = 0;

    function loop(now) {
      frame = 0;
      if (SMALL_SCREEN.matches || document.hidden) return;
      var still = REDUCED_MOTION.matches;
      var dt = still || !last ? 0 : Math.min(0.05, (now - last) / 1000);
      var ms = last ? now - last : 16;
      last = now;

      // The page can grow after load (images, pinned sections). Keep the route in step.
      if (now - checked > 1000) {
        checked = now;
        var hgt = document.documentElement.scrollHeight;
        if (hgt !== pageHeight) { pageHeight = hgt; journey.measure(); }
      }

      if (step(dt, still)) draw();

      // If frames run long, simplify the water, never the ship.
      if (!still && !LOCK_QUALITY && level < 2) {
        slow = ms > 28 ? slow + 1 : Math.max(0, slow - 2);
        if (slow > 80) { slow = 0; level++; layout(); }
      }

      if (!still) frame = requestAnimationFrame(loop);
    }

    function wake() {
      if (SMALL_SCREEN.matches) return;
      if (!frame) { last = 0; frame = requestAnimationFrame(loop); }
    }

    function refresh() {
      if (SMALL_SCREEN.matches) return;
      layout();
      if (REDUCED_MOTION.matches) sea.clearSpray();
      wake();
    }

    window.addEventListener('resize', refresh);
    window.addEventListener('load', refresh);
    window.addEventListener('scroll', wake, { passive: true });   // reduced motion: redraw so dimming tracks the copy
    document.addEventListener('visibilitychange', wake);
    SMALL_SCREEN.addEventListener('change', refresh);
    REDUCED_MOTION.addEventListener('change', refresh);

    refresh();
    requestAnimationFrame(function () { canvas.classList.add('is-ready'); });

    window.keelScene = { THREE: THREE, renderer: renderer, scene: scene, camera: camera, ship: ship, sea: sea, journey: journey, state: s };
  }

  SMALL_SCREEN.addEventListener('change', start);
  start();
})();
