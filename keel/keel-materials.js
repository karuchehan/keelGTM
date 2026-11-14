/*
 * keelGTM ship materials.
 *
 * keel       solid cream, softly lit, with light rippling over it. Dims behind copy.
 * ghost      see-through shell for hull, cabin and arch. Almost no fill: the form shows
 *            through its edges, which catch the light. Drawn to its own buffer and laid
 *            back over the page with a touch of softness.
 *
 * Colours are written as the site's own sRGB values and output as is.
 */
(function () {
  'use strict';

  var KEEL = (window.KEEL = window.KEEL || {});

  // Shared GLSL: how much page copy sits over a pixel (0 open space, 1 under text or a card).
  KEEL.GLSL_COVER = [
    'uniform vec4 uRects[16];',
    'uniform int uRectCount;',
    'float cover(vec2 p) {',
    '  float m = 0.0;',
    '  for (int i = 0; i < 16; i++) {',
    '    if (i >= uRectCount) break;',
    '    vec4 r = uRects[i];',
    '    vec2 q = abs(p - (r.xy + r.zw) * 0.5) - (r.zw - r.xy) * 0.5;',
    '    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);',
    '    m = max(m, 1.0 - smoothstep(-4.0, 30.0, d));',
    '  }',
    '  return m;',
    '}'
  ].join('\n');

  // Shared GLSL: drifting light pattern, the kind sunlight makes through water.
  KEEL.GLSL_CAUSTIC = [
    'float caustic(vec2 uv, float time) {',
    '  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;',
    '  vec2 i = p;',
    '  float c = 1.0;',
    '  const float inten = 0.005;',
    '  for (int n = 0; n < 4; n++) {',
    '    float t = time * (1.0 - (3.5 / float(n + 1)));',
    '    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));',
    '    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));',
    '  }',
    '  c /= 4.0;',
    '  c = 1.17 - pow(c, 1.4);',
    '  return pow(abs(c), 8.0);',
    '}'
  ].join('\n');

  KEEL.GLSL_PAGE_PX = 'vec2 pagePx() { return vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr; }';

  KEEL.createMaterials = function (THREE, shared) {
    var premultiplied = {
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    };

    var keel = new THREE.ShaderMaterial(Object.assign({
      uniforms: {
        uRes: shared.uRes, uDpr: shared.uDpr, uTime: shared.uTime,
        uRects: shared.uRects, uRectCount: shared.uRectCount,
        uUnitW: { value: 1 }, uWaterY: { value: 0 }, uTravel: { value: 0 }, uFade: { value: 1 }, uLight: { value: 1 }
      },
      vertexShader: [
        'varying vec3 vN; varying vec3 vV; varying vec3 vW;',
        'void main() {',
        '  vec4 w = modelMatrix * vec4(position, 1.0);',
        '  vW = w.xyz;',
        '  vN = normalize(mat3(modelMatrix) * normal);',
        '  vV = normalize(cameraPosition - w.xyz);',
        '  gl_Position = projectionMatrix * viewMatrix * w;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform vec2 uRes; uniform float uDpr; uniform float uTime;',
        'uniform float uUnitW; uniform float uWaterY; uniform float uTravel; uniform float uFade; uniform float uLight;',
        'varying vec3 vN; varying vec3 vV; varying vec3 vW;',
        KEEL.GLSL_COVER, KEEL.GLSL_CAUSTIC, KEEL.GLSL_PAGE_PX,
        'void main() {',
        '  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;',
        '  vec3 V = normalize(vV);',
        '  vec3 L = normalize(vec3(-0.5, 0.78, 0.62));',
        '  float wrap = dot(N, L) * 0.5 + 0.5;',
        '  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);',
        '  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 42.0);',
        '  vec3 cream = vec3(0.882, 0.875, 0.859);',
        '  vec3 shade = vec3(0.50, 0.42, 0.36);',
        '  vec3 col = mix(shade, cream, pow(wrap, 1.1));',
        '  float depth = (uWaterY - vW.y) / uUnitW;',                        // ship units below the surface
        '  float under = smoothstep(-0.02, 0.1, depth);',
        '  float c = uLight > 0.01 ? caustic(vW.xy / uUnitW * 0.55 + vec2(uTravel * 0.25, 0.0), uTime * 0.36) : 0.0;',
        '  col += vec3(1.0, 0.95, 0.86) * min(c, 1.0) * 0.1 * under * uLight;',
        '  col *= mix(1.0, 0.9, smoothstep(0.1, 0.62, depth));',
        '  col += spec * 0.22 + fres * 0.14;',
        '  col *= 0.97;',
        '  col = min(col, vec3(0.945, 0.938, 0.92));',
        '  float a = uFade * mix(1.0, 0.13, cover(pagePx()));',
        '  gl_FragColor = vec4(col * a, a);',
        '}'
      ].join('\n')
    }, premultiplied));

    function ghost(fill, rim, power) {
      return new THREE.ShaderMaterial(Object.assign({
        uniforms: { uFill: { value: fill }, uRim: { value: rim }, uPow: { value: power } },
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        vertexShader: [
          'varying vec3 vN; varying vec3 vP;',
          'void main() {',
          '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
          '  vP = mv.xyz;',
          '  vN = normalize(normalMatrix * normal);',
          '  gl_Position = projectionMatrix * mv;',
          '}'
        ].join('\n'),
        fragmentShader: [
          'precision highp float;',
          'uniform float uFill; uniform float uRim; uniform float uPow;',
          'varying vec3 vN; varying vec3 vP;',
          'void main() {',
          '  float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), uPow);',
          '  float a = clamp(uFill + uRim * f, 0.0, 1.0);',
          '  gl_FragColor = vec4(vec3(0.882, 0.875, 0.859) * a, a);',
          '}'
        ].join('\n')
      }, premultiplied));
    }

    // Lays the soft ghost buffer back over the page.
    var ghostLayer = new THREE.ShaderMaterial(Object.assign({
      uniforms: {
        uRes: shared.uRes, uDpr: shared.uDpr, uRects: shared.uRects, uRectCount: shared.uRectCount,
        tGhost: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) }, uFade: { value: 1 }
      },
      depthTest: false,
      depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'precision highp float;',
        'uniform vec2 uRes; uniform float uDpr; uniform sampler2D tGhost; uniform vec2 uTexel; uniform float uFade;',
        'varying vec2 vUv;',
        KEEL.GLSL_COVER, KEEL.GLSL_PAGE_PX,
        'void main() {',
        '  vec4 s = texture2D(tGhost, vUv) * 0.28;',
        '  s += (texture2D(tGhost, vUv + uTexel * vec2(1.0, 0.0)) + texture2D(tGhost, vUv - uTexel * vec2(1.0, 0.0))',
        '      + texture2D(tGhost, vUv + uTexel * vec2(0.0, 1.0)) + texture2D(tGhost, vUv - uTexel * vec2(0.0, 1.0))) * 0.12;',
        '  s += (texture2D(tGhost, vUv + uTexel) + texture2D(tGhost, vUv - uTexel)',
        '      + texture2D(tGhost, vUv + uTexel * vec2(1.0, -1.0)) + texture2D(tGhost, vUv + uTexel * vec2(-1.0, 1.0))) * 0.06;',
        '  gl_FragColor = s * uFade * mix(1.0, 0.3, cover(pagePx()));',
        '}'
      ].join('\n')
    }, premultiplied));

    return {
      keel: keel,
      hull: ghost(0.014, 0.6, 2.6),
      cabin: ghost(0.02, 0.6, 2.4),
      glass: ghost(0.055, 0.2, 1.6),
      spar: ghost(0.42, 0.3, 1.0),
      ghostLayer: ghostLayer
    };
  };
})();
