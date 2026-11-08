/*
 * Cursor fluid ("the swoosh").
 * A compact port of Pavel Dobryakov's WebGL Fluid Simulation
 * (https://github.com/PavelDoGreat/WebGL-Fluid-Simulation, MIT licence,
 * Copyright (c) 2017 Pavel Dobryakov), trimmed to what this page needs:
 * no bloom/sunrays, dye drawn as soft tint on a white page, Apple colours.
 */

const CONFIG = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 0.6,
  VELOCITY_DISSIPATION: 2.6,
  PRESSURE: 0.1,
  PRESSURE_ITERATIONS: 20,
  CURL: 4,
  SPLAT_RADIUS: 0.2,
  SPLAT_FORCE: 6000,
  SHADING: true,
  COLOR_UPDATE_SPEED: 6,
  INTENSITY: 0.16,
};

// Apple system colours + LankaByte blue and gold.
const PALETTE = [
  [0, 122, 255], [88, 86, 214], [175, 82, 222], [255, 45, 85],
  [255, 149, 0], [52, 199, 89], [50, 173, 230], [63, 102, 224], [242, 169, 59],
].map(([r, g, b]) => ({ r: r / 255, g: g / 255, b: b / 255 }));

export function startFluid(canvas, opts = {}) {
  Object.assign(CONFIG, opts);
  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, premultipliedAlpha: true };
  let gl = canvas.getContext('webgl2', params);
  const isWebGL2 = !!gl;
  if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
  if (!gl) return null;

  let halfFloat, supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
  }
  gl.clearColor(0, 0, 0, 0);
  const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
  if (!halfFloatTexType) return null;

  function supportRT(internalFormat, format, type) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  }
  function format(internalFormat, fmt, type) {
    if (!supportRT(internalFormat, fmt, type)) {
      if (!isWebGL2) return null;
      if (internalFormat === gl.R16F) return format(gl.RG16F, gl.RG, type);
      if (internalFormat === gl.RG16F) return format(gl.RGBA16F, gl.RGBA, type);
      return null;
    }
    return { internalFormat, format: fmt };
  }
  const formatRGBA = isWebGL2 ? format(gl.RGBA16F, gl.RGBA, halfFloatTexType) : format(gl.RGBA, gl.RGBA, halfFloatTexType);
  const formatRG = isWebGL2 ? format(gl.RG16F, gl.RG, halfFloatTexType) : formatRGBA;
  const formatR = isWebGL2 ? format(gl.R16F, gl.RED, halfFloatTexType) : formatRGBA;
  if (!formatRGBA || !formatRG || !formatR) return null;
  if (!supportLinearFiltering) { CONFIG.DYE_RESOLUTION = 256; CONFIG.SHADING = false; }

  function compile(type, source, keywords) {
    if (keywords) source = keywords.map((k) => `#define ${k}\n`).join('') + source;
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.warn(gl.getProgramInfoLog(p));
    const uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; uniforms[name] = gl.getUniformLocation(p, name); }
    return { program: p, uniforms, bind() { gl.useProgram(p); } };
  }

  const baseVS = compile(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`);
  const F = (src, kw) => compile(gl.FRAGMENT_SHADER, src, kw);
  const clearP = program(baseVS, F(`
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
    void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`));
  const splatP = program(baseVS, F(`
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
    void main () {
      vec2 p = vUv - point.xy; p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
    }`));
  const advectionP = program(baseVS, F(`
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; uniform sampler2D uVelocity, uSource; uniform vec2 texelSize, dyeTexelSize; uniform float dt, dissipation;
    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }
    void main () {
    #ifdef MANUAL_FILTERING
      vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
      vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      vec4 result = texture2D(uSource, coord);
    #endif
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
    }`, supportLinearFiltering ? null : ['MANUAL_FILTERING']));
  const divergenceP = program(baseVS, F(`
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; } if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; } if (vB.y < 0.0) { B = -C.y; }
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`));
  const curlP = program(baseVS, F(`
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }`));
  const vorticityP = program(baseVS, F(`
    precision highp float; precision highp sampler2D;
    varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
    void main () {
      float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;
      vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
      velocity = min(max(velocity, -1000.0), 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }`));
  const pressureP = program(baseVS, F(`
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure, uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
    }`));
  const gradientP = program(baseVS, F(`
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure, uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }`));
  // Dye is drawn as a premultiplied tint so white shows through: the page stays white-first.
  const displayP = program(baseVS, F(`
    precision highp float; precision highp sampler2D;
    varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uTexture; uniform vec2 texelSize;
    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
    #ifdef SHADING
      vec3 lc = texture2D(uTexture, vL).rgb; vec3 rc = texture2D(uTexture, vR).rgb;
      vec3 tc = texture2D(uTexture, vT).rgb; vec3 bc = texture2D(uTexture, vB).rgb;
      float dx = length(rc) - length(lc); float dy = length(tc) - length(bc);
      vec3 n = normalize(vec3(dx, dy, length(texelSize)));
      float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);
      c *= diffuse;
    #endif
      float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
      gl_FragColor = vec4(c, a);
    }`, CONFIG.SHADING ? ['SHADING'] : null));

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  function blit(target, clear) {
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function createFBO(w, h, internalFormat, fmt, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, fmt, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture, fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; },
    };
  }
  function createDoubleFBO(w, h, i, f, t, p) {
    let a = createFBO(w, h, i, f, t, p), b = createFBO(w, h, i, f, t, p);
    return {
      width: w, height: h, texelSizeX: a.texelSizeX, texelSizeY: a.texelSizeY,
      get read() { return a; }, get write() { return b; },
      swap() { const t2 = a; a = b; b = t2; },
    };
  }
  function getResolution(resolution) {
    let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (ar < 1) ar = 1 / ar;
    const min = Math.round(resolution), max = Math.round(resolution * ar);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
  }

  let dye, velocity, divergence, curl, pressure;
  function initFramebuffers() {
    const simRes = getResolution(CONFIG.SIM_RESOLUTION), dyeRes = getResolution(CONFIG.DYE_RESOLUTION);
    const texType = halfFloatTexType, filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    dye = createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA.internalFormat, formatRGBA.format, texType, filtering);
    velocity = createDoubleFBO(simRes.width, simRes.height, formatRG.internalFormat, formatRG.format, texType, filtering);
    divergence = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  function resizeCanvas() {
    const w = Math.floor(canvas.clientWidth * DPR), h = Math.floor(canvas.clientHeight * DPR);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }
  resizeCanvas();
  initFramebuffers();

  let colorTimer = 0, paletteIndex = Math.floor(Math.random() * PALETTE.length);
  const pointer = { x: 0, y: 0, px: 0, py: 0, dx: 0, dy: 0, moved: false, down: false, color: nextColor() };
  function nextColor() {
    paletteIndex = (paletteIndex + 1) % PALETTE.length;
    const c = PALETTE[paletteIndex];
    return { r: c.r * CONFIG.INTENSITY, g: c.g * CONFIG.INTENSITY, b: c.b * CONFIG.INTENSITY };
  }

  function splat(x, y, dx, dy, color) {
    splatP.bind();
    gl.uniform1i(splatP.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatP.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatP.uniforms.point, x, y);
    gl.uniform3f(splatP.uniforms.color, dx, dy, 0);
    let r = CONFIG.SPLAT_RADIUS / 100;
    const ar = canvas.width / canvas.height;
    if (ar > 1) r *= ar;
    gl.uniform1f(splatP.uniforms.radius, r);
    blit(velocity.write); velocity.swap();
    gl.uniform1i(splatP.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatP.uniforms.color, color.r, color.g, color.b);
    blit(dye.write); dye.swap();
  }

  function step(dt) {
    gl.disable(gl.BLEND);
    curlP.bind();
    gl.uniform2f(curlP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlP.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);
    vorticityP.bind();
    gl.uniform2f(vorticityP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityP.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityP.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityP.uniforms.curl, CONFIG.CURL);
    gl.uniform1f(vorticityP.uniforms.dt, dt);
    blit(velocity.write); velocity.swap();
    divergenceP.bind();
    gl.uniform2f(divergenceP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceP.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);
    clearP.bind();
    gl.uniform1i(clearP.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearP.uniforms.value, CONFIG.PRESSURE);
    blit(pressure.write); pressure.swap();
    pressureP.bind();
    gl.uniform2f(pressureP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureP.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < CONFIG.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureP.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }
    gradientP.bind();
    gl.uniform2f(gradientP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradientP.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradientP.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write); velocity.swap();
    advectionP.bind();
    gl.uniform2f(advectionP.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!supportLinearFiltering) gl.uniform2f(advectionP.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    const velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionP.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionP.uniforms.uSource, velocityId);
    gl.uniform1f(advectionP.uniforms.dt, dt);
    gl.uniform1f(advectionP.uniforms.dissipation, CONFIG.VELOCITY_DISSIPATION);
    blit(velocity.write); velocity.swap();
    if (!supportLinearFiltering) gl.uniform2f(advectionP.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionP.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionP.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionP.uniforms.dissipation, CONFIG.DENSITY_DISSIPATION);
    blit(dye.write); dye.swap();
  }

  function render() {
    gl.disable(gl.BLEND);
    displayP.bind();
    gl.uniform2f(displayP.uniforms.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
    gl.uniform1i(displayP.uniforms.uTexture, dye.read.attach(0));
    blit(null, true);
  }

  // ---- input -------------------------------------------------------------
  const rect = () => canvas.getBoundingClientRect();
  function move(clientX, clientY) {
    const r = rect();
    const x = (clientX - r.left) / r.width, y = 1 - (clientY - r.top) / r.height;
    if (!pointer.seen) { pointer.x = x; pointer.y = y; pointer.seen = true; return; }
    pointer.px = pointer.x; pointer.py = pointer.y;
    pointer.x = x; pointer.y = y;
    const ar = r.width / r.height;
    pointer.dx = (pointer.x - pointer.px) * (ar < 1 ? ar : 1);
    pointer.dy = (pointer.y - pointer.py) / (ar > 1 ? ar : 1);
    pointer.moved = Math.abs(pointer.dx) > 0 || Math.abs(pointer.dy) > 0;
    lastInput = performance.now();
  }
  window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchstart', (e) => { const t = e.touches[0]; pointer.seen = false; move(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchmove', (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('mousedown', () => { pointer.color = nextColor(); });

  // A gentle drift when nobody is moving the mouse (phones, first paint).
  let lastInput = 0, autoT = Math.random() * 10;
  function autoSplat(dt) {
    autoT += dt;
    const x = 0.5 + 0.34 * Math.sin(autoT * 0.55) * Math.cos(autoT * 0.21);
    const y = 0.55 + 0.22 * Math.sin(autoT * 0.8 + 1.3);
    const dx = Math.cos(autoT * 0.55) * 0.004, dy = Math.cos(autoT * 0.8 + 1.3) * 0.004;
    const c = pointer.color, k = 0.07;
    splat(x, y, dx * CONFIG.SPLAT_FORCE, dy * CONFIG.SPLAT_FORCE, { r: c.r * k, g: c.g * k, b: c.b * k });
  }

  // Opening swirl so the hero isn't blank.
  for (let i = 0; i < 4; i++) {
    const c = nextColor();
    splat(0.2 + Math.random() * 0.6, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 900, (Math.random() - 0.5) * 900, { r: c.r * 4, g: c.g * 4, b: c.b * 4 });
  }

  let last = performance.now(), running = true, raf = 0;
  function frame() {
    raf = 0;
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.016666);
    last = now;
    if (resizeCanvas()) initFramebuffers();
    colorTimer += dt * CONFIG.COLOR_UPDATE_SPEED;
    if (colorTimer >= 1) { colorTimer = 0; pointer.color = nextColor(); }
    if (pointer.moved) {
      pointer.moved = false;
      splat(pointer.x, pointer.y, pointer.dx * CONFIG.SPLAT_FORCE, pointer.dy * CONFIG.SPLAT_FORCE, pointer.color);
    } else if (now - lastInput > 2500) {
      autoSplat(dt);
    }
    step(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); if (!raf) raf = requestAnimationFrame(frame); }
  }
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden));
  return { setRunning, splat, config: CONFIG };
}
