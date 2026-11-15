/*
 * keelGTM sea.
 *
 * The page is a cross-section: air above the waterline, water below. One
 * full-screen layer draws only lines and foam: the surface line, two fainter
 * swells behind it, glints, the bow wave and the wake. Nothing is drawn as a
 * fill or a glow, so no patch or panel can show around the ship. A small
 * particle pool handles spray.
 *
 * The same swell maths runs here in JavaScript, so the ship rides exactly the
 * water that gets drawn.
 */
(function () {
  'use strict';

  var KEEL = (window.KEEL = window.KEEL || {});

  var K = [0.62, 1.15, 1.32, 2.6];      // swell wave numbers, per ship unit
  var AM = [0.9, 0.6, 0.6, 0.25];       // their relative heights
  var OMEGA = [0.55, 0.8, 0.9, 1.45];   // how fast each rolls

  var SPRAY_MAX = 640;

  KEEL.createSea = function (THREE, shared) {
    var uniforms = {
      uRes: shared.uRes, uDpr: shared.uDpr, uTime: shared.uTime,
      uRects: shared.uRects, uRectCount: shared.uRectCount, uFeather: shared.uFeather,
      uShip: { value: new THREE.Vector2() },
      uUnit: { value: 100 }, uTravel: { value: 0 }, uAmp: { value: 0.02 },
      uEnergy: { value: 0 }, uFade: { value: 1 }, uSpeed: { value: 0 }, uDir: { value: 1 },
      uBowX: { value: 0.7 }, uSternX: { value: -0.7 }, uTurn: { value: 0 },
      uPhase: { value: new THREE.Vector4() }, uBig: { value: new THREE.Vector3(0, 0, 1.3) }
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'precision highp float;',
        'uniform vec2 uRes; uniform float uDpr; uniform float uTime;',
        'uniform vec2 uShip; uniform float uUnit, uTravel, uAmp, uEnergy, uFade, uSpeed, uDir, uBowX, uSternX, uTurn;',
        'uniform vec4 uPhase; uniform vec3 uBig;',
        'const vec4 K = vec4(0.62, 1.15, 1.32, 2.6);',
        'const vec4 AM = vec4(0.9, 0.6, 0.6, 0.25);',
        KEEL.GLSL_COVER, KEEL.GLSL_PAGE_PX,
        'float swell(float X, float shift) { return uAmp * dot(AM, sin(K * (X + uTravel) + uPhase + shift)); }',
        'float bigWave(float X) { float q = (X - uBig.x) / uBig.z; return uBig.y * exp(-q * q); }',
        'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float noise(vec2 p) {',
        '  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
        '}',
        'void main() {',
        '  vec2 p = pagePx();',
        '  float X = (p.x - uShip.x) / uUnit;',            // ship units right of the ship
        '  float Y = (uShip.y - p.y) / uUnit;',            // ship units above the resting waterline
        '  if (abs(Y) > 3.2 || uFade < 0.004) { gl_FragColor = vec4(0.0); return; }',
        '  float px = 1.0 / uUnit;',
        '  float Xw = X + uTravel;',
        '  float behind = -X * uDir;',
        '  float reach = mix(2.7, 4.8, smoothstep(-1.2, 1.2, behind));',
        '  float fx = exp(-(X * X) / (reach * reach));',   // the sea thins out away from the ship

        // Surface
        '  float bow = uSpeed * 0.1 * exp(-pow((X - uBowX) / 0.2, 2.0));',
        '  float h = swell(X, 0.0) + bigWave(X) + bow;',
        '  float d = h - Y;',                              // depth under the surface
        '  float line = smoothstep(2.0 * px, 0.5 * px, abs(d));',
        '  float glow = exp(-abs(d) / (0.012 + 0.012 * uEnergy)) * 0.16;',
        '  float h1 = swell(X * 0.84, 2.1) * 0.8 + bigWave(X) * 0.7 + 0.075;',
        '  float h2 = swell(X * 0.7, 4.4) * 0.62 + bigWave(X) * 0.45 + 0.15;',
        '  float back = smoothstep(1.7 * px, 0.4 * px, abs(h1 - Y)) * 0.32 + smoothstep(1.5 * px, 0.4 * px, abs(h2 - Y)) * 0.17;',
        '  float glint = pow(max(0.0, sin(Xw * 5.3 + uPhase.y * 1.7) * sin(Xw * 1.9 - uPhase.x * 1.3)), 18.0) * smoothstep(5.0 * px, 0.0, abs(d));',

        // Wake and bow wave
        '  float bs = (uSternX - X) * uDir;',              // ship units behind the stern
        '  float wk = uSpeed * smoothstep(-0.2, 0.25, bs) * exp(-max(bs, 0.0) / (0.8 + 3.4 * uSpeed));',
        '  float lift = uTurn * bs * bs * 0.04;',          // the wake peels away in a turn
        '  float n = noise(vec2(Xw * 7.0, d * 26.0 + uTime * 1.6));',
        '  float wake = smoothstep(0.014 + 0.065 * wk, 0.0, abs(d + lift)) * wk * (0.3 + 0.7 * n) * 0.8;',
        '  float bf = uSpeed * exp(-pow((X - uBowX) / 0.3, 2.0)) * smoothstep(0.11, 0.0, abs(d)) * (0.35 + 0.65 * noise(vec2(Xw * 11.0, uTime * 3.0))) * 0.85;',

        '  float cream = clamp((line * 0.6 + glow) * max(fx, 0.06) + (back + glint * 0.85) * fx + wake + bf, 0.0, 1.0);',
        '  vec3 creamCol = mix(vec3(0.882, 0.875, 0.859), vec3(1.0, 0.35, 0.19), 0.12 * clamp(bf + glint * 0.6, 0.0, 1.0));',
        '  float k = uFade * mix(1.0, 0.3, cover(p));',
        '  gl_FragColor = vec4(creamCol * cream * k, cream * k);',
        '}'
      ].join('\n')
    });

    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    quad.renderOrder = 0;

    // ── Spray ────────────────────────────────────────────────────────────
    var pos = new Float32Array(SPRAY_MAX * 3);
    var data = new Float32Array(SPRAY_MAX * 2);       // alpha, size
    var vel = new Float32Array(SPRAY_MAX * 2);
    var life = new Float32Array(SPRAY_MAX * 2);       // remaining, total
    var kind = new Float32Array(SPRAY_MAX * 2);       // base alpha, base size
    var cursor = 0, carry = 0;

    var sprayGeo = new THREE.BufferGeometry();
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sprayGeo.setAttribute('aData', new THREE.BufferAttribute(data, 2));
    var spray = new THREE.Points(sprayGeo, new THREE.ShaderMaterial({
      uniforms: { uRes: shared.uRes, uDpr: shared.uDpr, uRects: shared.uRects, uRectCount: shared.uRectCount, uFeather: shared.uFeather, uFade: uniforms.uFade },
      transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      vertexShader: [
        'uniform vec2 uRes; uniform float uDpr; uniform float uFade;',
        'attribute vec2 aData; varying float vA;',
        KEEL.GLSL_COVER,
        'void main() {',
        '  vA = aData.x * uFade * mix(1.0, 0.25, cover(position.xy));',
        '  gl_PointSize = aData.y * uDpr;',
        '  gl_Position = vec4(position.x / uRes.x * 2.0 - 1.0, 1.0 - position.y / uRes.y * 2.0, 0.0, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float; varying float vA;',
        'void main() {',
        '  float r = length(gl_PointCoord - 0.5) * 2.0;',
        '  float a = vA * smoothstep(1.0, 0.15, r);',
        '  gl_FragColor = vec4(vec3(0.9, 0.89, 0.87) * a, a);',
        '}'
      ].join('\n')
    }));
    spray.frustumCulled = false;
    spray.renderOrder = 4;

    function emit(x, y, vx, vy, seconds, alpha, size) {
      var i = cursor; cursor = (cursor + 1) % SPRAY_MAX;
      pos[i * 3] = x; pos[i * 3 + 1] = y;
      vel[i * 2] = vx; vel[i * 2 + 1] = vy;
      life[i * 2] = seconds; life[i * 2 + 1] = seconds;
      kind[i * 2] = alpha; kind[i * 2 + 1] = size;
    }

    var phase = [0, 1.7, 3.9, 5.2];
    var state = { travel: 0, amp: 0.02, big: { x: 0, amp: 0, sigma: 1.3 } };

    // Water height and slope at X (ship units from the ship), matching the shader.
    function surface(X) {
      var h = 0, s = 0;
      for (var i = 0; i < 4; i++) {
        var a = K[i] * (X + state.travel) + phase[i];
        h += AM[i] * Math.sin(a);
        s += AM[i] * K[i] * Math.cos(a);
      }
      h *= state.amp; s *= state.amp;
      var q = (X - state.big.x) / state.big.sigma, g = state.big.amp * Math.exp(-q * q);
      return { height: h + g, slope: s - (2 * q / state.big.sigma) * g };
    }

    return {
      quad: quad, spray: spray, uniforms: uniforms, surface: surface,

      /*
       * f: { dt, shipX, shipY, unit, travel, energy, calm, speed, dir, bowX, sternX, turn,
       *      big: {x, amp}, fade, quality }
       */
      update: function (f) {
        var dt = f.dt;
        var roll = (0.55 + 1.5 * f.energy) * (1 - 0.6 * f.calm);
        for (var i = 0; i < 4; i++) phase[i] += OMEGA[i] * roll * dt;

        state.travel = f.travel;
        state.amp = 0.021 * (1 + 2.4 * f.energy) * (1 - 0.82 * f.calm);
        state.big.x = f.big.x; state.big.amp = f.big.amp;

        uniforms.uShip.value.set(f.shipX, f.shipY);
        uniforms.uUnit.value = f.unit;
        uniforms.uTravel.value = f.travel;
        uniforms.uAmp.value = state.amp;
        uniforms.uEnergy.value = f.energy;
        uniforms.uFade.value = f.fade;
        uniforms.uSpeed.value = f.speed;
        uniforms.uDir.value = f.dir;
        uniforms.uBowX.value = f.bowX;
        uniforms.uSternX.value = f.sternX;
        uniforms.uTurn.value = f.turn;
        uniforms.uPhase.value.set(phase[0], phase[1], phase[2], phase[3]);
        uniforms.uBig.value.set(f.big.x, f.big.amp, state.big.sigma);

        // Spray off the bow, in proportion to how hard the ship is driving.
        var u = f.unit, scale = Math.min(1.7, Math.max(0.55, u / 260));
        var bowPx = f.shipX + f.bowX * u;
        var bowTop = f.shipY - surface(f.bowX).height * u;
        carry += f.speed * f.speed * 230 * (0.5 + 0.5 * f.quality) * dt;
        while (carry >= 1) {
          carry -= 1;
          emit(
            bowPx + (Math.random() - 0.5) * 0.12 * u, bowTop - Math.random() * 0.03 * u,
            (-f.dir * (0.25 + Math.random() * 1.15) * f.speed + f.turn * 0.5 + (Math.random() - 0.5) * 0.25) * u,
            -(0.5 + Math.random() * 1.5) * (0.5 + 0.7 * f.speed) * u,
            0.5 + Math.random() * 0.8,
            0.3 + Math.random() * 0.4,
            (1.3 + Math.random() * 2.1) * scale
          );
        }

        var g = 3.4 * u;
        for (i = 0; i < SPRAY_MAX; i++) {
          var left = life[i * 2];
          if (left <= 0) { data[i * 2] = 0; continue; }
          left -= dt; life[i * 2] = left;
          vel[i * 2 + 1] += g * dt;
          vel[i * 2] *= 1 - 0.9 * dt;
          pos[i * 3] += vel[i * 2] * dt;
          pos[i * 3 + 1] += vel[i * 2 + 1] * dt;
          var t = Math.max(left, 0) / life[i * 2 + 1];
          data[i * 2] = kind[i * 2] * Math.min(1, t * 2.2) * Math.min(1, (1 - t) * 12);
          data[i * 2 + 1] = kind[i * 2 + 1] * (1 + (1 - t) * 0.5);
        }
        sprayGeo.attributes.position.needsUpdate = true;
        sprayGeo.attributes.aData.needsUpdate = true;
      },

      // One burst of spray as the ship comes off the crest.
      burst: function (f, strength) {
        var u = f.unit, scale = Math.min(1.7, Math.max(0.55, u / 260));
        var count = Math.round(230 * strength * (0.5 + 0.5 * f.quality));
        for (var i = 0; i < count; i++) {
          var along = f.bowX * (0.25 + Math.random() * 0.85);
          emit(
            f.shipX + along * u, f.shipY - surface(along).height * u,
            (f.dir * (Math.random() * 1.5 - 0.45) + (Math.random() - 0.5) * 0.7) * u,
            -(0.9 + Math.random() * 2.9) * u,
            0.7 + Math.random() * 1.0,
            0.3 + Math.random() * 0.45,
            (1.4 + Math.random() * 2.6) * scale
          );
        }
      },

      clearSpray: function () { life.fill(0); data.fill(0); sprayGeo.attributes.aData.needsUpdate = true; }
    };
  };
})();
