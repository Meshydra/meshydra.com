/*
 * The 3D Mesh: pixiv's CC0 VRoid sample "Sakurada Fumiriya" (VRM), recoloured to Mesh
 * (black hair, brown skin, dark brown eyes, black top) with bold square retro glasses
 * and a gold cross chain added in code. Looks are set in avatar.config.js.
 * Head and eyes follow the cursor, he blinks, breathes, and the hair sways (spring bones).
 * Model licence: CC0 / VRoid Hub "everyone, commercial, modification, no credit".
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from 'https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.5.5/lib/three-vrm.module.min.js';
import CFG from './avatar.config.js?v=20261108j';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const col = (c) => new THREE.Color(c);

export async function mountMemoji(container, opts = {}) {
  const C = { ...CFG, ...opts, glasses: { ...CFG.glasses, ...(opts.glasses || {}) }, chain: { ...CFG.chain, ...(opts.chain || {}) } };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight('#ffffff', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(-1, 2, 3); scene.add(key);
  const camera = new THREE.PerspectiveCamera(22, 1, 0.05, 20);

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(C.model);
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons ? VRMUtils.combineSkeletons(gltf.scene) : null;
  VRMUtils.rotateVRM0(vrm); // face the camera (+Z)
  scene.add(vrm.scene);
  vrm.scene.traverse((o) => { o.frustumCulled = false; });

  // ---- recolour ----------------------------------------------------------
  const tint = (m, lit, shade) => {
    if (m.color) m.color.copy(col(lit));
    if (m.shadeColorFactor) m.shadeColorFactor.copy(col(shade || lit));
    m.needsUpdate = true;
  };
  vrm.scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      const n = m.name || '';
      if (/HAIR/.test(n)) {
        tint(m, C.hairColour, C.hairShade);
        if (m.matcapFactor) m.matcapFactor.copy(col(C.hairShine));
        if (m.emissive) m.emissive.set(0x000000); // the model ships an orange glow on the hair
        m.emissiveMap = null;
      }
      else if (/SKIN/.test(n)) tint(m, C.skin, C.skinShade);
      else if (/EyeIris/.test(n)) tint(m, C.eyes);
      else if (/FaceBrow|Eyelash|Eyeline/.test(n)) tint(m, C.brows);
      else if (/Tops/.test(n)) tint(m, C.shirt, C.shirtShade);
      else if (/Accessory/.test(n)) m.visible = !C.hideTie;
    }
  });

  // ---- pose: arms down, a relaxed stance --------------------------------
  const H = vrm.humanoid;
  const bone = (name) => H.getNormalizedBoneNode(name);
  const setRot = (name, x = 0, y = 0, z = 0) => { const b = bone(name); if (b) b.rotation.set(x, y, z); };
  setRot('leftUpperArm', 0, 0, 1.25); setRot('rightUpperArm', 0, 0, -1.25);
  setRot('leftLowerArm', 0, -0.2, 0); setRot('rightLowerArm', 0, 0.2, 0);
  vrm.update(0);
  vrm.scene.updateMatrixWorld(true);

  // ---- framing: head and shoulders --------------------------------------
  const headNode = H.getRawBoneNode('head');
  const headPos = new THREE.Vector3(); headNode.getWorldPosition(headPos);
  const look = new THREE.Vector3(0, headPos.y + C.frameY, 0);
  camera.position.set(0, look.y + 0.02, C.frameDistance);
  camera.lookAt(look);

  // ---- glasses: bold, oversized, square, retro --------------------------
  if (C.glasses.on) {
    const G = C.glasses;
    const le = H.getRawBoneNode('leftEye'), re = H.getRawBoneNode('rightEye');
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    le.getWorldPosition(a); re.getWorldPosition(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const frameMat = new THREE.MeshStandardMaterial({ color: G.frame, roughness: 0.35, metalness: 0.1 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: G.lens, transparent: true, opacity: G.lensOpacity, roughness: 0.05, depthWrite: false });
    // all sizes in metres (the model is life-size)
    const w = G.width, h = G.height, t = G.thickness, r = G.roundness, gap = G.gap;
    const rr = (W, Hh, R) => {
      const s = new THREE.Shape();
      s.moveTo(-W / 2 + R, -Hh / 2); s.lineTo(W / 2 - R, -Hh / 2); s.quadraticCurveTo(W / 2, -Hh / 2, W / 2, -Hh / 2 + R);
      s.lineTo(W / 2, Hh / 2 - R); s.quadraticCurveTo(W / 2, Hh / 2, W / 2 - R, Hh / 2); s.lineTo(-W / 2 + R, Hh / 2);
      s.quadraticCurveTo(-W / 2, Hh / 2, -W / 2, Hh / 2 - R); s.lineTo(-W / 2, -Hh / 2 + R); s.quadraticCurveTo(-W / 2, -Hh / 2, -W / 2 + R, -Hh / 2);
      return s;
    };
    const glasses = new THREE.Group();
    for (const s of [-1, 1]) {
      const outer = rr(w, h, r + t), inner = rr(w - 2 * t, h - 2 * t, r);
      outer.holes.push(new THREE.Path(inner.getPoints(24)));
      const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: t * 0.8, bevelEnabled: true, bevelThickness: t * 0.2, bevelSize: t * 0.15, bevelSegments: 3, curveSegments: 12 }), frameMat);
      const lens = new THREE.Mesh(new THREE.ShapeGeometry(inner, 12), lensMat); lens.position.z = t * 0.4;
      const brow = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, t * 0.95, t * 1.2), frameMat);
      brow.position.set(0, h / 2 - t * 0.35, t * 0.5);
      const eye = new THREE.Group(); eye.add(rim, lens, brow);
      eye.position.x = s * gap / 2;
      eye.rotation.y = s * 0.12;
      glasses.add(eye);
      // arm from the outer corner back to the ear (ear to ear)
      const from = new THREE.Vector3(s * (gap / 2 + w / 2 + t * 0.2), h * 0.3, -t * 0.2);
      const to = new THREE.Vector3(s * G.earX, h * 0.3 + G.earY, -G.armLength);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(t * 0.95, t * 1.25, from.distanceTo(to)), frameMat);
      arm.position.copy(from).add(to).multiplyScalar(0.5);
      arm.lookAt(to); // the group is still at the origin here, so local = world
      glasses.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(Math.max(gap - w + t * 1.4, t), t * 0.9, t), frameMat);
    bridge.position.set(0, h * 0.18, t * 0.4); glasses.add(bridge);
    // place in front of the eyes, then parent to the head so it moves with it
    glasses.position.set(mid.x, mid.y + G.raise, mid.z + G.forward);
    headNode.attach(glasses);
  }

  // ---- gold chain with a cross ------------------------------------------
  if (C.chain.on) {
    const gold = new THREE.MeshStandardMaterial({ color: C.chain.colour, roughness: 0.25, metalness: 1 });
    const neckNode = H.getRawBoneNode('neck'), chestNode = H.getRawBoneNode('upperChest') || H.getRawBoneNode('chest');
    const n = new THREE.Vector3(); neckNode.getWorldPosition(n);
    const ch = C.chain;
    const pts = [];
    for (let k = 0; k < 48; k++) {
      const ang = (k / 48) * Math.PI * 2, f = (1 + Math.cos(ang)) / 2;
      const y = n.y + ch.top - f * f * ch.drop;
      const rx = ch.width * (1 + f * 0.35), rz = ch.depth * (1 + f * ch.belly);
      pts.push(new THREE.Vector3(n.x + Math.sin(ang) * rx, y, n.z + Math.cos(ang) * rz + ch.forward));
    }
    const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, ch.thickness, 6, true), gold);
    chain.position.set(0, 0, 0);
    scene.add(chain); chestNode.attach(chain);
    if (ch.cross) {
      const s = ch.crossSize;
      const cross = new THREE.Group();
      cross.add(new THREE.Mesh(new THREE.BoxGeometry(s * 0.26, s, s * 0.14), gold));
      const bar = new THREE.Mesh(new THREE.BoxGeometry(s * 0.68, s * 0.24, s * 0.14), gold); bar.position.y = s * 0.2; cross.add(bar);
      const low = pts[0];
      cross.position.set(low.x, low.y - s * 0.55, low.z + s * 0.05);
      cross.rotation.x = -0.25;
      scene.add(cross); chestNode.attach(cross);
    }
  }

  // ---- a soft smile ------------------------------------------------------
  const ex = vrm.expressionManager;
  const setEx = (name, v) => { try { ex?.setValue(name, v); } catch {} };
  setEx('relaxed', C.smile); // closed-mouth smile ("happy" shows teeth)

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
    target.x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.45), -1, 1);
    target.y = clamp((e.clientY - (r.top + r.height * 0.4)) / (window.innerHeight * 0.55), -1, 1);
    lastMove = performance.now();
  }, { passive: true });

  const lookTarget = new THREE.Object3D(); scene.add(lookTarget);
  if (vrm.lookAt) vrm.lookAt.target = lookTarget;

  const clock = new THREE.Clock();
  let blinkAt = performance.now() + 1500, blinkT = -1, visible = true, raf = 0;
  const f = C.follow, flip = vrm.meta?.metaVersion === '0' ? -1 : 1;
  function tick() {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, now = performance.now();
    if (f && now - lastMove > 3500) { target.x = Math.sin(t * 0.45) * 0.35; target.y = Math.sin(t * 0.3 + 1) * 0.12; }
    cur.x = lerp(cur.x, target.x, 0.08); cur.y = lerp(cur.y, target.y, 0.08);
    setRot('neck', flip * cur.y * 0.18 * f, cur.x * 0.35 * f, 0);
    setRot('head', flip * cur.y * 0.22 * f, cur.x * 0.35 * f, flip * -cur.x * 0.05 * f);
    setRot('spine', 0, cur.x * 0.1 * f, Math.sin(t * 0.8) * 0.01);
    const chest = bone('chest'); if (chest) chest.rotation.x = Math.sin(t * 1.6) * 0.012; // breathing
    lookTarget.position.set(camera.position.x + cur.x * 0.6, camera.position.y - cur.y * 0.4, camera.position.z);
    if (C.blink) {
      if (now > blinkAt && blinkT < 0) blinkT = 0;
      if (blinkT >= 0) {
        blinkT += dt;
        setEx('blink', blinkT < 0.08 ? blinkT / 0.08 : blinkT < 0.16 ? 1 - (blinkT - 0.08) / 0.08 : 0);
        if (blinkT >= 0.16) { blinkT = -1; blinkAt = now + 2200 + Math.random() * 3500; setEx('blink', 0); }
      }
    }
    vrm.update(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(tick); }
  }).observe(container);

  return { vrm, config: C };
}
