/*
 * keelGTM ship model.
 *
 * Builds a small sloop around the logo:
 *   keel   the logo fin, solid, bright, bevelled            (layer 0, drawn crisp)
 *   ghost  hull, deck, cabin with raked windscreen, flybridge,
 *          radar arch and one mast                           (layer 1, drawn soft)
 *
 * The hull's side profile is the logo's hull outline, lofted out to a real beam.
 * Model space: X toward the bow, Y up, Z across the beam. Origin sits on the
 * waterline amidships, so the ship pitches and rolls about the water surface.
 */
(function () {
  'use strict';

  var KEEL = (window.KEEL = window.KEEL || {});

  var WATERLINE = 0.11;     // logo Y where the sea surface meets the hull
  var HALF_BEAM = 0.215;    // hull half width at its widest
  var GHOST_LAYER = 1;

  KEEL.GHOST_LAYER = GHOST_LAYER;

  // Lowest and highest point of a closed outline at a given x.
  function span(points, x) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0, n = points.length; i < n; i++) {
      var a = points[i], b = points[(i + 1) % n];
      if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) continue;
      var y = a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
    return lo === Infinity ? null : [lo, hi];
  }

  // Plan shape: fraction of full beam at u (0 stern, 1 bow).
  function beamAt(u) {
    if (u < 0.42) return 0.66 + 0.34 * Math.sin((Math.PI / 2) * (u / 0.42));
    return Math.pow(Math.max(0, Math.cos((Math.PI / 2) * ((u - 0.42) / 0.58))), 0.8);
  }

  function hullGeometry(THREE, outline) {
    var xs = outline.map(function (p) { return p[0]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var STATIONS = 56, RING = 19;
    var pos = [], idx = [];
    var deckLine = [];

    for (var s = 0; s <= STATIONS; s++) {
      var u = s / STATIONS;
      var e = 0.5 - 0.5 * Math.cos(Math.PI * u);              // bunch stations at the ends
      var x = x0 + 0.004 + (x1 - x0 - 0.008) * e;
      var sp = span(outline, x) || [0, 0];
      var bottom = sp[0] - WATERLINE, top = sp[1] - WATERLINE;
      var b = HALF_BEAM * beamAt(e);
      deckLine.push([x, top, b]);
      for (var r = 0; r < RING; r++) {
        var a = (r / (RING - 1)) * 2 - 1;                       // -1 port rail, 0 keel line, 1 starboard rail
        var th = (Math.abs(a) * Math.PI) / 2;
        var z = (a < 0 ? -1 : 1) * b * Math.pow(Math.max(0, Math.sin(th)), 0.82);
        var y = top - (top - bottom) * Math.pow(Math.max(0, Math.cos(th)), 1.25);
        pos.push(x, y, z);
      }
    }
    for (s = 0; s < STATIONS; s++) {
      for (r = 0; r < RING - 1; r++) {
        var i0 = s * RING + r, i1 = i0 + RING;
        idx.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1);
      }
    }

    // Deck: a slightly crowned strip between the rails.
    var base = pos.length / 3;
    for (s = 0; s <= STATIONS; s++) {
      var d = deckLine[s];
      pos.push(d[0], d[1], -d[2], d[0], d[1] + d[2] * 0.09, 0, d[0], d[1], d[2]);
    }
    for (s = 0; s < STATIONS; s++) {
      var k = base + s * 3;
      idx.push(k, k + 1, k + 3, k + 1, k + 4, k + 3, k + 1, k + 2, k + 4, k + 2, k + 5, k + 4);
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return {
      geo: geo, x0: x0, x1: x1,
      deckAt: function (x) { var sp = span(outline, x); return sp ? sp[1] - WATERLINE : 0; },
      beamAt: function (x) { return HALF_BEAM * beamAt(Math.min(1, Math.max(0, (x - x0) / (x1 - x0)))); }
    };
  }

  /*
   * A smooth shell lofted along the ship: at each x it spans from base(x) up to
   * top(x) and out to half(x) either side, with softly squared shoulders.
   * Where top meets base the shell closes, so ends need no caps.
   */
  function loftGeometry(THREE, x0, x1, base, top, half, stations) {
    var RING = 17, pos = [], idx = [];
    for (var s = 0; s <= stations; s++) {
      var x = x0 + (x1 - x0) * (s / stations);
      var b = base(x), h = Math.max(0, top(x) - b), w = half(x) * Math.min(1, h / 0.03);
      for (var r = 0; r < RING; r++) {
        var a = (r / (RING - 1)) * 2 - 1;
        var th = (Math.abs(a) * Math.PI) / 2;
        pos.push(
          x,
          b + h * Math.pow(Math.max(0, Math.cos(th)), 0.5),
          (a < 0 ? -1 : 1) * w * Math.pow(Math.max(0, Math.sin(th)), 0.45)
        );
      }
    }
    for (s = 0; s < stations; s++) {
      for (r = 0; r < RING - 1; r++) {
        var i0 = s * RING + r, i1 = i0 + RING;
        idx.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  function ramp(x, a, b) { return Math.min(1, Math.max(0, (x - a) / (b - a))); }

  function spar(THREE, a, b, radius) {
    var av = new THREE.Vector3(a[0], a[1], a[2] || 0), bv = new THREE.Vector3(b[0], b[1], b[2] || 0);
    var len = av.distanceTo(bv);
    var geo = new THREE.CylinderGeometry(radius * 0.7, radius, len, 8, 1, true);
    geo.translate(0, len / 2, 0);
    var m = new THREE.Mesh(geo);
    m.position.copy(av);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.sub(av).normalize());
    return m;
  }

  function outlineShape(THREE, points) {
    var shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    return shape;
  }

  KEEL.buildShip = function (THREE, SHAPE, materials) {
    var model = new THREE.Group();
    model.name = 'ship';

    // Keel: the logo fin.
    var depth = 0.1, bevel = 0.022;
    var finGeo = new THREE.ExtrudeGeometry(outlineShape(THREE, SHAPE.fin), {
      depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelOffset: -bevel, bevelSegments: 5, curveSegments: 1
    });
    finGeo.translate(0, -WATERLINE, -(depth - bevel * 2) / 2);
    var keel = new THREE.Mesh(finGeo, materials.keel);
    keel.name = 'keel';
    keel.renderOrder = 3;
    model.add(keel);

    // Ghost: everything above the keel.
    var ghost = new THREE.Group();
    ghost.name = 'ghost';

    var hull = hullGeometry(THREE, SHAPE.hullOuter);
    ghost.add(new THREE.Mesh(hull.geo, materials.hull));

    // Superstructure of a motor yacht: a long cabin that sweeps back to the stern,
    // a flybridge rising above it, a slim radar arch and one mast. Nothing else.
    var CABIN_AFT = -0.6, CABIN_FWD = 0.44;           // where the cabin meets the deck
    var SCREEN = 0.0;                                  // top of the raked windscreen
    var CABIN_H = 0.32, FLY_H = 0.14, ARCH_H = 0.12, MAST_H = 0.2;
    var roof = hull.deckAt(-0.1) + CABIN_H;

    function cabinTop(x) {
      var deck = hull.deckAt(x);
      if (x > SCREEN) return roof + (deck - roof) * Math.pow(ramp(x, SCREEN, CABIN_FWD), 1.12);   // windscreen
      var line = roof - 0.03 * ramp(x, SCREEN, -0.3);                                              // roof eases down aft
      return deck + (line - deck) * Math.pow(Math.sin((Math.PI / 2) * ramp(x, CABIN_AFT, -0.26)), 0.8);   // long sweep to the stern
    }
    function cabinHalf(x) {
      return Math.min(0.155, hull.beamAt(x) * 0.72) * (1 - 0.3 * ramp(x, SCREEN, CABIN_FWD)) * (0.72 + 0.28 * ramp(x, CABIN_AFT, -0.3));
    }
    function deckBase(x) { return hull.deckAt(x) - 0.004; }

    ghost.add(new THREE.Mesh(loftGeometry(THREE, CABIN_AFT, CABIN_FWD, deckBase, cabinTop, cabinHalf, 56), materials.cabin));

    // Glazing: one band wrapped around the cabin, read as windscreen and side windows.
    function glassBase(x) { var d = hull.deckAt(x); return d + (cabinTop(x) - d) * 0.46; }
    function glassTop(x) { var d = hull.deckAt(x); return d + (cabinTop(x) - d) * 0.85; }
    function glassHalf(x) { return cabinHalf(x) * 1.012 * Math.pow(ramp(x, -0.4, -0.3), 0.5); }
    ghost.add(new THREE.Mesh(loftGeometry(THREE, -0.4, CABIN_FWD - 0.02, glassBase, glassTop, glassHalf, 40), materials.glass));

    // Flybridge: a second level, set back from the windscreen, with its own raked front.
    var FLY_AFT = -0.5, FLY_FWD = -0.05;
    function flyBase(x) { return cabinTop(x) - 0.004; }
    function flyTop(x) {
      var rise = Math.pow(Math.sin((Math.PI / 2) * ramp(x, FLY_AFT, FLY_AFT + 0.24)), 0.8);
      return cabinTop(x) + FLY_H * rise * (1 - Math.pow(ramp(x, FLY_FWD - 0.17, FLY_FWD), 1.2));
    }
    function flyHalf(x) { return cabinHalf(x) * 0.66; }
    ghost.add(new THREE.Mesh(loftGeometry(THREE, FLY_AFT, FLY_FWD, flyBase, flyTop, flyHalf, 32), materials.cabin));

    // Radar arch: two raked legs and a bar, with one slim mast above.
    var archX = -0.25, archBase = flyTop(archX) - 0.012, archTop = archBase + ARCH_H, archW = flyHalf(archX) * 0.94;
    ghost.add(spar(THREE, [archX, archBase, archW], [archX - 0.1, archTop, archW * 0.82], 0.0075));
    ghost.add(spar(THREE, [archX, archBase, -archW], [archX - 0.1, archTop, -archW * 0.82], 0.0075));
    ghost.add(spar(THREE, [archX - 0.1, archTop, -archW * 0.82], [archX - 0.1, archTop, archW * 0.82], 0.0075));
    ghost.add(spar(THREE, [archX - 0.1, archTop], [archX - 0.155, archTop + MAST_H], 0.005));

    ghost.traverse(function (o) {
      o.layers.set(GHOST_LAYER);
      if (o.isMesh && !o.material.isShaderMaterial) o.material = materials.spar;
    });
    model.add(ghost);

    return {
      model: model, keel: keel, ghost: ghost,
      bowX: hull.x1, sternX: hull.x0, length: hull.x1 - hull.x0,
      bottom: -0.5 - WATERLINE
    };
  };
})();
