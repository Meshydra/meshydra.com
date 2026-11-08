/*
 * Memoji-style 3D Mesh, built from primitives so every part is tweakable in
 * avatar.config.js. Head follows the cursor, eyes track it, blinks, and says
 * hello when clicked.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import CFG from './avatar.config.js';

const Y = 1.12; // head is taller than wide

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function mountMemoji(container, opts = {}) {
  const C = { ...CFG, ...opts, glasses: { ...CFG.glasses, ...(opts.glasses || {}) }, chain: { ...CFG.chain, ...(opts.chain || {}) } };
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, -0.1, 8.2);
  camera.lookAt(0, -0.32, 0);

  const key = new THREE.DirectionalLight('#ffffff', 2.1); key.position.set(-3, 4, 6); scene.add(key);
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.7); fill.position.set(4, 1, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight('#7f9cff', 1.4); rim.position.set(2, 3, -5); scene.add(rim);
  const warm = new THREE.DirectionalLight('#ffc48a', 0.5); warm.position.set(-5, -2, -3); scene.add(warm);

  const mat = {
    skin: new THREE.MeshPhysicalMaterial({ color: C.skin, roughness: 0.58, sheen: 0.35, sheenColor: new THREE.Color('#ffb08a'), sheenRoughness: 0.6, clearcoat: 0.06 }),
    hair: new THREE.MeshPhysicalMaterial({ color: C.hairColour, roughness: 0.55, sheen: 0.7, sheenColor: new THREE.Color(C.hairShine), sheenRoughness: 0.45, clearcoat: 0.12, clearcoatRoughness: 0.5 }),
    brows: new THREE.MeshStandardMaterial({ color: C.brows, roughness: 0.6 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#fbfbfd', roughness: 0.15, clearcoat: 1 }),
    iris: new THREE.MeshPhysicalMaterial({ color: C.eyes, roughness: 0.2, clearcoat: 1 }),
    pupil: new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.1, clearcoat: 1 }),
    glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    lips: new THREE.MeshPhysicalMaterial({ color: C.lips, roughness: 0.45, clearcoat: 0.3 }),
    shirt: new THREE.MeshPhysicalMaterial({ color: C.shirt, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color('#4a4a52') }),
    frame: new THREE.MeshPhysicalMaterial({ color: C.glasses.frame, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    lens: new THREE.MeshPhysicalMaterial({ color: C.glasses.lens, roughness: 0.05, metalness: 0, transparent: true, opacity: C.glasses.lensOpacity, clearcoat: 1, depthWrite: false }),
    gold: new THREE.MeshStandardMaterial({ color: C.chain.colour, roughness: 0.25, metalness: 1 }),
    stubble: new THREE.MeshStandardMaterial({ color: C.hairColour, roughness: 1, transparent: true, opacity: C.stubble }),
  };

  const root = new THREE.Group(); scene.add(root);      // body + head
  const head = new THREE.Group(); root.add(head);       // turns to the cursor
  head.position.y = 0.15;

  // ---- head shape ----------------------------------------------------------
  const headGeo = new THREE.SphereGeometry(1, 128, 96);
  {
    const p = headGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      x *= C.faceWidth;
      if (y < 0) {
        const t = Math.pow(-y, 1.6);
        x *= 1 - C.jaw * t;
        z *= 1 - C.jaw * 0.45 * t;
      }
      if (z < 0) z *= 0.94;                // flatter back of the head
      if (y > 0.2 && z > 0) z *= 1 - 0.05 * (y - 0.2); // forehead slopes back a little
      p.setXYZ(i, x, y * Y, z);
    }
    headGeo.computeVertexNormals();
  }
  head.add(new THREE.Mesh(headGeo, mat.skin));

  // Surface helper: point on the (unscaled-sphere) head at polar theta / azimuth phi (0 = facing us).
  const surf = (theta, phi, r = 1) => new THREE.Vector3(Math.sin(theta) * Math.sin(phi) * r * C.faceWidth, Math.cos(theta) * r * Y, Math.sin(theta) * Math.cos(phi) * r);

  // ears
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat.skin);
    ear.scale.set(0.12 * C.ears, 0.26 * C.ears, 0.17 * C.ears);
    ear.position.set(s * 0.9 * C.faceWidth, -0.02, -0.05);
    ear.rotation.y = s * 0.35;
    head.add(ear);
  }

  // nose
  {
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat.skin);
    nose.scale.set(0.1, 0.19, 0.13); nose.position.set(0, -0.08, 0.95); nose.rotation.x = -0.25; head.add(nose);
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.058, 24, 16), mat.skin);
      wing.position.set(s * 0.075, -0.2, 0.93); head.add(wing);
    }
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.072, 24, 16), mat.skin);
    tip.position.set(0, -0.19, 1.0); head.add(tip);
  }

  // eyes
  const eyes = [];
  for (const s of [-1, 1]) {
    const socket = new THREE.Group();
    const er = 0.185;
    socket.position.set(s * 0.31, 0.1, 0.8);
    const ball = new THREE.Group(); socket.add(ball);
    const white = new THREE.Mesh(new THREE.SphereGeometry(er, 40, 32), mat.white); white.scale.set(1, 0.95, 1); ball.add(white);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.118, 32, 24), mat.iris); iris.scale.set(1, 1, 0.45); iris.position.z = er - 0.035; ball.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), mat.pupil); pupil.scale.set(1, 1, 0.4); pupil.position.z = er - 0.003; ball.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), mat.glint); glint.position.set(-0.035, 0.04, er + 0.012); ball.add(glint);
    // upper lid: skin cap that drops when blinking
    const lid = new THREE.Mesh(new THREE.SphereGeometry(er + 0.008, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), mat.skin);
    lid.rotation.x = -0.9; socket.add(lid);
    socket.userData = { ball, lid };
    head.add(socket); eyes.push(socket);
  }

  // brows: thick, slightly arched
  for (const s of [-1, 1]) {
    const brow = new THREE.Group();
    const segs = [[-0.12, -0.012, 0.05], [0, 0.012, 0.055], [0.12, 0, 0.045]];
    segs.forEach(([x, y, r]) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, 0.11, 6, 12), mat.brows);
      m.rotation.z = Math.PI / 2 + (x > 0 ? -0.2 : x < 0 ? 0.12 : 0) * s * -1;
      m.scale.set(1, 1, 0.55);
      m.position.set(x * s, y, 0);
      brow.add(m);
    });
    brow.position.set(s * 0.32, 0.41, 0.88);
    brow.rotation.set(-0.35, s * 0.3, s * -0.06);
    head.add(brow);
  }

  // mouth: a closed smile
  {
    const sm = clamp(C.smile, 0, 1);
    const arc = Math.PI * lerp(0.35, 0.7, sm);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.028, 12, 48, arc), mat.lips);
    mouth.rotation.z = Math.PI * 1.5 - arc / 2;
    const g = new THREE.Group(); g.add(mouth);
    g.position.set(0, -0.27 + lerp(0.0, 0.03, sm), 0.925);
    g.rotation.x = -0.36;
    g.scale.set(1, lerp(0.4, 0.75, sm), 1);
    head.add(g);
    const lower = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat.lips);
    lower.scale.set(0.085, 0.022, 0.03); lower.position.set(0, -0.5, 0.87); lower.rotation.x = -0.4;
    head.add(lower);
    if (C.stubble > 0) {
      const ms = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), mat.stubble);
      ms.scale.set(0.17, 0.03, 0.035); ms.position.set(0, -0.3, 0.935); ms.rotation.x = 1.3;
      head.add(ms);
    }
  }

  // glasses: rounded rectangles, black, blue-light lenses
  if (C.glasses.on) {
    const G = C.glasses;
    const rr = (w, h, r) => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
      s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      return s;
    };
    const glasses = new THREE.Group();
    for (const s of [-1, 1]) {
      const outer = rr(G.width, G.height, G.roundness + G.thickness);
      const inner = rr(G.width - G.thickness * 2, G.height - G.thickness * 2, G.roundness);
      outer.holes.push(new THREE.Path(inner.getPoints(24)));
      const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16 }), mat.frame);
      const lens = new THREE.Mesh(new THREE.ShapeGeometry(inner, 16), mat.lens);
      lens.position.z = 0.02;
      const eye = new THREE.Group(); eye.add(rim, lens);
      // top bar a bit heavier, like the real frames
      const brow = new THREE.Mesh(new THREE.BoxGeometry(G.width * 0.92, 0.035, 0.05), mat.frame);
      brow.position.set(0, G.height / 2 - 0.012, 0.03); eye.add(brow);
      eye.position.set(s * (G.width / 2 + 0.05), 0, 0);
      eye.rotation.y = s * 0.12;
      glasses.add(eye);
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 1.05), mat.frame);
      temple.position.set(s * (G.width + 0.08), 0.1, -0.5);
      temple.rotation.y = s * -0.2;
      glasses.add(temple);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.02, 8, 16, Math.PI), mat.frame);
    bridge.position.set(0, 0.03, 0.02); glasses.add(bridge);
    glasses.position.set(0, 0.1, 1.07);
    head.add(glasses);
  }

  // hair: glossy Memoji-style locks, thick and wavy, fringe falling forward
  {
    const R = rng(C.seed);
    const vol = C.hairVolume, mess = C.messiness;
    // scalp cap so no skin shows between locks
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.55), mat.hair);
    cap.scale.set(C.faceWidth * 1.02, Y * (1 + 0.04 * vol), 1.02);
    cap.rotation.x = -0.74;           // tilt back: hairline high in front, low at the nape
    cap.position.set(0, 0.04, -0.03);
    head.add(cap);
    // back and sides only (phi range keeps it off the face)
    const back = new THREE.Mesh(new THREE.SphereGeometry(1.04, 48, 32, Math.PI * 0.94, Math.PI * 1.12, 0, Math.PI * 0.76), mat.hair);
    back.scale.set(C.faceWidth * 1.03, Y * 0.97 * C.hairLength, 0.98);
    back.position.set(0, 0.04, -0.04);
    head.add(back);

    const lockGeo = new THREE.SphereGeometry(1, 28, 20);
    const lock = (theta, phi, len, wid, twist, lift, push = 0.02) => {
      const p = surf(theta, phi, 1 + push);
      const n = new THREE.Vector3(p.x / (C.faceWidth ** 2), p.y / (Y * Y), p.z).normalize();
      const down = surf(theta + 0.02, phi).sub(surf(theta - 0.02, phi)).normalize(); // toward the hair ends
      const side = new THREE.Vector3().crossVectors(n, down).normalize();
      const up = down.clone().negate();
      const out = new THREE.Vector3().crossVectors(side, up).normalize(); // right-handed: x=side, y=up the lock, z=out of the scalp
      const m = new THREE.Mesh(lockGeo, mat.hair);
      const basis = new THREE.Matrix4().makeBasis(side, up, out);
      m.quaternion.setFromRotationMatrix(basis);
      m.rotateZ(twist);
      m.rotateX(lift);
      m.scale.set(wid, len, wid * 0.55);
      m.position.copy(p).addScaledVector(n, wid * 0.32 * vol);
      head.add(m);
    };
    const deg = Math.PI / 180;
    // crown + top volume
    for (let i = 0; i < 70; i++) {
      const phi = R() * Math.PI * 2;
      const f = Math.cos(phi);
      const maxT = f > 0 ? lerp(92, 58, f) : lerp(92, 112 * C.hairLength, -f);
      const theta = lerp(14, maxT - 22, Math.pow(R(), 0.8)) * deg;
      lock(theta, phi, (0.32 + R() * 0.16) * vol, (0.16 + R() * 0.07) * vol, (R() - 0.5) * 0.7 * mess, -0.25, 0.04 * vol);
    }
    // outer layer reaching the hairline (sides + back)
    for (let i = 0; i < 46; i++) {
      const phi = (0.33 + R() * 1.34) * Math.PI * (R() < 0.5 ? 1 : -1);
      const f = Math.cos(phi);
      const maxT = f > 0 ? lerp(98, 70, f) : lerp(98, 116 * C.hairLength, -f);
      lock((maxT - 18 - R() * 8) * deg, phi, (0.36 + R() * 0.12) * C.hairLength, 0.17 + R() * 0.05, (R() - 0.5) * 0.5 * mess, 0.05);
    }
    // the fringe: long locks from the top, falling forward over the forehead, tips flicking sideways
    const fr = C.fringe;
    for (let i = 0; i < 15; i++) {
      const phi = (R() - 0.5) * 1.5;
      const theta = (34 + R() * 8 + 4 * fr) * deg;
      const tw = phi * -0.9 + (R() - 0.5) * 0.8 * mess;
      lock(theta, phi, (0.3 + R() * 0.08) * fr, 0.15 + R() * 0.05, tw, 0.22, 0.05);
    }
    // a few thinner strands hanging lower, the messy look in the photos
    for (let i = 0; i < 6; i++) {
      const phi = (R() - 0.5) * 1.1;
      lock((50 + R() * 4 * fr) * deg, phi, 0.17 * fr + R() * 0.05, 0.065 + R() * 0.025, (R() - 0.5) * 1.1 * mess, 0.3, 0.035);
    }
    // sideburns
    for (const s of [-1, 1]) lock(96 * deg, s * 74 * deg, 0.2, 0.08, 0, 0.1, 0.005);
  }

  // ---- neck, shoulders, chain -------------------------------------------
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.4, 0.7, 40), mat.skin);
  neck.position.y = -0.98; root.add(neck);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), mat.shirt);
  torso.scale.set(1.6, 0.95, 0.85); torso.position.y = -2.15; root.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 16, 48), mat.shirt);
  collar.rotation.x = Math.PI / 2 - 0.2; collar.position.set(0, -1.27, 0.04); root.add(collar);
  if (C.chain.on) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.014, 8, 80), mat.gold);
    chain.rotation.x = Math.PI / 2 - 0.6; chain.position.set(0, -1.34, 0.13); root.add(chain);
  }

  // ---- sizing --------------------------------------------------------------
  function resize() {
    const w = container.clientWidth, h = container.clientHeight || w;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);

  // ---- behaviour -----------------------------------------------------------
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let lastMove = 0;
  window.addEventListener('pointermove', (e) => {
    const r = container.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.4);
    target.x = clamp(dx / (window.innerWidth * 0.45), -1, 1);
    target.y = clamp(dy / (window.innerHeight * 0.55), -1, 1);
    lastMove = performance.now();
  }, { passive: true });

  let blinkAt = performance.now() + 1800, blinkT = -1;
  let hop = 0;
  const clock = new THREE.Clock();
  let visible = true, raf = 0;

  function tick() {
    raf = 0;
    if (!visible) return;
    const t = clock.getElapsedTime(), now = performance.now();
    if (now - lastMove > 3500) { // idle: look around a little
      target.x = Math.sin(t * 0.45) * 0.35; target.y = Math.sin(t * 0.3 + 1) * 0.15;
    }
    cur.x = lerp(cur.x, target.x, 0.07); cur.y = lerp(cur.y, target.y, 0.07);
    const f = C.follow;
    head.rotation.y = cur.x * 0.55 * f;
    head.rotation.x = cur.y * 0.32 * f;
    head.rotation.z = -cur.x * 0.05 * f;
    root.rotation.y = cur.x * 0.12 * f;
    for (const e of eyes) { e.userData.ball.rotation.y = cur.x * 0.35; e.userData.ball.rotation.x = cur.y * 0.25; }
    // breathing + hop
    hop *= 0.9;
    root.position.y = Math.sin(t * 1.6) * 0.025 + Math.sin(hop * Math.PI) * 0.25 * (hop > 0.01 ? 1 : 0);
    // blink
    if (C.blink && now > blinkAt && blinkT < 0) blinkT = 0;
    let lidRot = -0.9;
    if (blinkT >= 0) {
      blinkT += 1 / 60;
      const k = blinkT < 0.07 ? blinkT / 0.07 : blinkT < 0.14 ? 1 - (blinkT - 0.07) / 0.07 : 0;
      lidRot = lerp(-0.9, 0.55, k);
      if (blinkT >= 0.14) { blinkT = -1; blinkAt = now + 2200 + Math.random() * 3500; }
    }
    for (const e of eyes) e.userData.lid.rotation.x = lidRot - cur.y * 0.15;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(tick); }
  }).observe(container);

  return {
    greet() { hop = 1; blinkAt = 0; return C.greeting; },
    config: C,
  };
}
