/* meshydra.com · effects. Everything here is decoration: the page reads fine without it. */
(() => {
  'use strict';
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (name) => getComputedStyle(doc).getPropertyValue(name).trim();
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ───────────── pixel motifs ('#' = thread up) ───────────── */
  const pad = (rows, h) => {
    const w = rows[0].length, top = Math.floor((h - rows.length) / 2);
    const blank = '.'.repeat(w);
    return [...Array(top).fill(blank), ...rows, ...Array(h - rows.length - top).fill(blank)];
  };
  const gap = (w, h) => Array(h).fill('.'.repeat(w));
  const join = (...parts) => parts[0].map((_, y) => parts.map((p) => p[y]).join(''));

  const DIAMOND = ['.....#.....', '....#.#....', '...#...#...', '..#..#..#..', '.#..#.#..#.', '#..#.#.#..#', '.#..#.#..#.', '..#..#..#..', '...#...#...', '....#.#....', '.....#.....'];
  const BARS = ['....#....', '.........', '..#####..', '.........', '#########', '.........', '..#####..', '.........', '....#....'];
  const CROSS = ['..#..', '.###.', '#####', '.###.', '..#..'];
  const SMALLD = ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'];
  const ELEPHANT = ['....#####.........', '...######.#######.', '..################', '.#.##############.', '.#.##############.', '.#..#############.', '.#..##.##...##.##.', '##..##.##...##.##.', '....##.##...##.##.'];
  const LOTUS = ['.....#.....', '....###....', '.#..###..#.', '.##.###.##.', '..##.#.##..', '#..#####..#', '.#########.', '..#######..'];
  const STUPA = ['.....#.....', '....###....', '....###....', '...#####...', '..#######..', '.#########.', '.#########.', '###########', '#.#.#.#.#.#'];
  const LEAF = ['...#...', '..###..', '.#####.', '.##.##.', '###.###', '.##.##.', '..#.#..', '...#...', '...#...'];
  const WAVE = ['..###.......', '.#...#......', '#..#..#...##', '..#....#.#..', '........#...'];

  const H = 13;
  const MOTIFS = {
    dumbara: join(pad(DIAMOND, H), gap(3, H), pad(BARS, H), gap(3, H), pad(CROSS, H), gap(3, H), pad(DIAMOND, H), gap(3, H), pad(CROSS, H), gap(3, H)),
    perahera: join(gap(2, H), pad(ELEPHANT, H), gap(4, H), pad(SMALLD, H), gap(4, H)),
    lotus: join(gap(2, H), pad(LOTUS, H), gap(4, H), pad(SMALLD, H), gap(4, H), pad(BARS, H), gap(4, H), pad(SMALLD, H), gap(4, H)),
  };

  // One repeat of a motif as an SVG tile; used as a repeat-x background scaled to the band height.
  function tile(rows, fg, texture = true) {
    const w = rows[0].length, h = rows.length;
    let r = '';
    rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        if (row[x] === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
        else if (texture && (x + y) % 2 === 0) r += `<rect x="${x + .3}" y="${y + .3}" width=".4" height=".4" opacity=".22"/>`;
      }
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 4}" height="${h * 4}" shape-rendering="crispEdges" fill="${fg}">${r}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  function paintBands() {
    const ac = css('--ac') || '#ff4f75';
    $$('.weave-strip').forEach((el) => {
      el.style.backgroundImage = tile(MOTIFS[el.dataset.motif] || MOTIFS.dumbara, ac, false);
      el.style.backgroundSize = 'auto 100%';
      el.style.backgroundRepeat = 'repeat-x';
    });
    $$('.proj-vis').forEach((el) => el.style.setProperty('--weave-top', tile(MOTIFS.dumbara, '#ffffff', false)));
  }

  // Section bands: build band + caption once.
  $$('.weave').forEach((el) => {
    const band = document.createElement('div');
    band.className = 'weave-band';
    band.setAttribute('aria-hidden', 'true');
    const t = document.createElement('div');
    t.className = 'tile';
    t.style.cssText = `position:absolute;inset:6px 0;background:${tile(MOTIFS[el.dataset.motif] || MOTIFS.dumbara, '#ffffff')} 0 0/auto 100% repeat-x`;
    band.appendChild(t);
    el.appendChild(band);
    if (el.hasAttribute('data-nocap')) return;
    const cap = document.createElement('p');
    cap.className = 'weave-cap mono';
    const from = el.dataset.loc
      ? `WOVEN FROM “${el.dataset.loc}” · <b class="si">${el.dataset.si}</b>, ${el.dataset.en}`
      : `WOVEN FROM “<b class="si">${el.dataset.si}</b>” · ${el.dataset.en}`;
    cap.innerHTML = `<span>${from}</span>${el.dataset.tail ? `<span>${el.dataset.tail}</span>` : ''}`;
    el.appendChild(cap);
    if (!reduce) band.classList.add('weaving');
  });

  // Basket weave for the footer name, random fringe under the portrait.
  (() => {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="#fff"><rect x=".5" y=".6" width="5" height="1.8"/><rect x=".5" y="3.6" width="5" height="1.8"/><rect x="6.6" y=".5" width="1.8" height="5"/><rect x="9.6" y=".5" width="1.8" height="5"/><rect x=".6" y="6.5" width="1.8" height="5"/><rect x="3.6" y="6.5" width="1.8" height="5"/><rect x="6.5" y="6.6" width="5" height="1.8"/><rect x="6.5" y="9.6" width="5" height="1.8"/></svg>`;
    doc.style.setProperty('--basket', `url("data:image/svg+xml,${encodeURIComponent(s)}")`);
    let f = '';
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let x = 0; x < 200; x += 1) f += `<rect x="${x}" y="0" width="1" height="${(8 + rnd() * 38).toFixed(1)}"/>`;
    const m = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 46" preserveAspectRatio="none" fill="#000">${f}</svg>`;
    doc.style.setProperty('--fringe-mask', `url("data:image/svg+xml,${encodeURIComponent(m)}") 0 0/100% 100%`);
  })();

  paintBands();

  /* ───────────── Sri Lanka pixel map ───────────── */
  (() => {
    const svg = $('#lkMap');
    if (!svg) return;
    const coast = [[80.22, 9.83], [80.05, 9.79], [79.9, 9.72], [80.0, 9.62], [80.14, 9.57], [80.1, 9.45], [80.04, 9.3], [79.93, 9.12], [79.82, 9.05], [79.93, 8.95], [79.95, 8.72], [79.9, 8.42], [79.78, 8.22], [79.74, 8.05], [79.8, 7.7], [79.83, 7.22], [79.86, 6.93], [79.94, 6.56], [80.03, 6.27], [80.13, 6.06], [80.35, 5.97], [80.59, 5.92], [80.9, 6.04], [81.12, 6.12], [81.4, 6.35], [81.62, 6.65], [81.8, 6.95], [81.86, 7.3], [81.72, 7.62], [81.56, 7.95], [81.4, 8.2], [81.22, 8.55], [81.05, 8.85], [80.86, 9.1], [80.7, 9.34], [80.5, 9.55], [80.36, 9.7]];
    const P = ([lon, lat]) => [(lon - 79.62) * 100 + 2, (9.88 - lat) * 100 + 2];
    const pts = coast.map(P);
    // Catmull-Rom → cubic Bézier, closed.
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    const icon = (rows, lon, lat, s) => {
      const [cx, cy] = P([lon, lat]);
      const w = rows[0].length * s, h = rows.length * s;
      let r = '';
      rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') r += `<rect x="${(cx - w / 2 + x * s).toFixed(1)}" y="${(cy - h / 2 + y * s).toFixed(1)}" width="${s}" height="${s}"/>`; });
      return r;
    };
    const [kx, ky] = P([80.63, 7.29]);
    svg.innerHTML = `
      <defs>
        <pattern id="lkDots" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="1.2" height="1.2" fill="var(--ac)" opacity=".38"/></pattern>
        <clipPath id="lkClip"><path d="${d}"/></clipPath>
      </defs>
      <path d="${d}" fill="color-mix(in srgb, var(--ac) 7%, transparent)"/>
      <rect width="240" height="410" fill="url(#lkDots)" clip-path="url(#lkClip)"/>
      <path d="${d}" fill="none" stroke="var(--ac)" stroke-width="1.2" opacity=".85"/>
      <g fill="var(--ac)">
        ${icon(STUPA, 80.4, 8.31, 2.2)}
        ${icon(ELEPHANT, 81.35, 6.45, 1.8)}
        ${icon(LEAF, 80.84, 6.92, 2)}
        ${icon(WAVE, 80.42, 6.12, 2)}
      </g>
      <g transform="translate(${kx.toFixed(1)} ${ky.toFixed(1)})">
        <circle r="5" fill="none" stroke="var(--ac)" stroke-width="1"><animate attributeName="r" values="5;14;5" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="2.6s" repeatCount="indefinite"/></circle>
        <rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill="var(--ac)"/>
        <rect x="-1.6" y="-1.6" width="3.2" height="3.2" transform="rotate(45)" fill="var(--bg)"/>
      </g>`;
    if (reduce) $$('animate', svg).forEach((a) => a.remove());
  })();

  /* ───────────── dithered duotone renderer ───────────── */
  const RAMP = ['#12040a', '#3a0a1c', '#86143a', '#e2355e', '#ff8ba5', '#ffe2ea'];
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  function dither(canvas, src, { cell = 3, focusY = .35, contrast = 1.25, lift = .02, gamma = 1, progressive = true } = {}) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    const off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const scale = Math.max(cols / sw, rows / sh);
    const dw = sw * scale, dh = sh * scale;
    o.imageSmoothingQuality = 'high';
    o.drawImage(src, (cols - dw) / 2, (rows - dh) * focusY, dw, dh);
    const data = o.getImageData(0, 0, cols, rows).data; // throws if tainted → caller falls back
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = RAMP[0];
    ctx.fillRect(0, 0, w, h);
    const n = RAMP.length - 1;
    const drawRow = (y) => {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        let l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        l = clamp((Math.pow(l, gamma) - .5) * contrast + .5 + lift);
        const v = l * n, base = Math.floor(v);
        const idx = Math.min(n, base + ((v - base) > (BAYER[y & 3][x & 3] + .5) / 16 ? 1 : 0));
        if (!idx) continue;
        ctx.fillStyle = RAMP[idx];
        ctx.fillRect(x * cell, y * cell, cell - .45, cell - (y % 2 ? 1.1 : .55));
      }
    };
    if (!progressive || reduce) { for (let y = 0; y < rows; y++) drawRow(y); return; }
    let y = 0;
    const per = Math.max(2, Math.ceil(rows / 50));
    const step = () => {
      for (let k = 0; k < per && y < rows; k++, y++) drawRow(y);
      if (y < rows) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Portrait
  const pImg = $('#portraitImg'), pCan = $('#portraitCanvas'), portrait = $('#portrait');
  const drawPortrait = (progressive) => {
    try { dither(pCan, pImg, { cell: innerWidth < 860 ? 3 : 3.4, focusY: .3, contrast: 1.3, lift: .03, gamma: .72, progressive }); }
    catch (e) { doc.classList.add('no-canvas'); }
  };
  if (pImg && pCan) {
    if (pImg.complete && pImg.naturalWidth) drawPortrait(true);
    else pImg.addEventListener('load', () => drawPortrait(true), { once: true });
    portrait.addEventListener('click', () => portrait.classList.toggle('reveal'));
  }

  /* ───────────── project art (abstract, no real data) ───────────── */
  const W = 960, Hh = 564;
  const frame = (inner, bg = '#141014') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}"><rect width="${W}" height="${Hh}" fill="${bg}"/>${inner}</svg>`;
  const win = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#2a2529"/><rect x="${x}" y="${y}" width="${w}" height="34" rx="10" fill="#3b3439"/><circle cx="${x + 20}" cy="${y + 17}" r="5" fill="#77686f"/><circle cx="${x + 38}" cy="${y + 17}" r="5" fill="#77686f"/><circle cx="${x + 56}" cy="${y + 17}" r="5" fill="#77686f"/>`;
  const bar = (x, y, w, h = 10, c = '#6d6168') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${c}"/>`;
  const ART = {
    hub() {
      let s = win(80, 60, 800, 470) + `<rect x="80" y="94" width="170" height="436" fill="#221d21"/>`;
      for (let i = 0; i < 7; i++) s += bar(104, 124 + i * 40, 90 + (i * 23) % 40, 10, i === 1 ? '#d8cfd3' : '#5d5258');
      s += bar(280, 124, 260, 22, '#f1ecee') + bar(280, 160, 380, 10);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const x = 280 + c * 148, y = 200 + r * 156, hi = (r * 4 + c) % 3 === 0;
        s += `<rect x="${x}" y="${y}" width="130" height="136" rx="12" fill="${hi ? '#4a4046' : '#353035'}"/><rect x="${x + 18}" y="${y + 18}" width="44" height="44" rx="10" fill="${['#f4eef1', '#b9adb3', '#e6dde1', '#8f8389'][(r + c) % 4]}"/>` + bar(x + 18, y + 84, 80, 10, '#cfc5ca') + bar(x + 18, y + 104, 56, 8);
      }
      return frame(s);
    },
    risk() {
      let s = win(60, 50, 840, 480);
      s += bar(90, 110, 220, 22, '#f1ecee') + bar(90, 146, 320, 10);
      const hs = [60, 92, 76, 130, 112, 170, 150, 210, 196, 240];
      hs.forEach((h, i) => { s += `<rect x="${92 + i * 38}" y="${430 - h}" width="24" height="${h}" rx="3" fill="${i > 6 ? '#f5eff2' : '#8d8187'}"/>`; });
      s += `<line x1="86" y1="432" x2="470" y2="432" stroke="#5a4f55" stroke-width="2"/>`;
      s += `<circle cx="700" cy="230" r="92" fill="none" stroke="#3e363b" stroke-width="34"/><circle cx="700" cy="230" r="92" fill="none" stroke="#f1eaee" stroke-width="34" stroke-dasharray="380 600" transform="rotate(-90 700 230)"/><circle cx="700" cy="230" r="92" fill="none" stroke="#9e9198" stroke-width="34" stroke-dasharray="120 600" stroke-dashoffset="-380" transform="rotate(-90 700 230)"/>`;
      for (let i = 0; i < 4; i++) s += `<rect x="540" y="${370 + i * 36}" width="330" height="26" rx="5" fill="#332d31"/>` + bar(556, 378 + i * 36, 140, 10, '#bdb1b7') + `<rect x="800" y="${375 + i * 36}" width="54" height="16" rx="8" fill="${i === 0 ? '#ffffff' : i === 1 ? '#a3979d' : '#5f555a'}"/>`;
      return frame(s);
    },
    scan() {
      let s = '';
      for (let r = 60; r <= 300; r += 60) s += `<circle cx="330" cy="290" r="${r}" fill="none" stroke="#3a3337" stroke-width="2"/>`;
      s += `<path d="M330,290 L630,290 A300,300 0 0,0 542,78 Z" fill="#5d5258" opacity=".55"/><line x1="330" y1="290" x2="542" y2="78" stroke="#fff" stroke-width="3"/>`;
      let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 260; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 290, x = 330 + Math.cos(a) * rr, y = 290 + Math.sin(a) * rr;
        const hot = rnd() > .93;
        s += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${hot ? 9 : 5}" height="${hot ? 9 : 5}" fill="${hot ? '#ffffff' : '#8a7e84'}"/>`;
      }
      s += `<rect x="690" y="60" width="220" height="444" rx="10" fill="#262126"/>`;
      for (let i = 0; i < 9; i++) s += bar(712, 92 + i * 44, 110 + (i * 37) % 60, 10, '#b4a8ae') + `<rect x="862" y="${88 + i * 44}" width="28" height="18" rx="4" fill="${['#ffffff', '#a59aa0', '#5d5359'][i % 3]}"/>`;
      return frame(s, '#110d10');
    },
    flow() {
      let s = '';
      const box = (x, y, label) => `<rect x="${x}" y="${y}" width="250" height="300" rx="14" fill="#2d272b" stroke="#6e6268" stroke-width="2"/><text x="${x + 125}" y="${y + 92}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="700" fill="#f4eef1">${label}</text>` + [0, 1, 2, 3].map((i) => bar(x + 30, y + 140 + i * 34, 190 - i * 24, 12, '#857a80')).join('');
      s += box(70, 132, 'FS') + box(640, 132, 'BC');
      for (let i = 0; i < 4; i++) {
        const y = 196 + i * 58;
        s += `<line x1="330" y1="${y}" x2="620" y2="${y}" stroke="#4d4449" stroke-width="3" stroke-dasharray="10 9"/><path d="M${i % 2 ? 340 : 610},${y - 9} l${i % 2 ? -14 : 14},9 l${i % 2 ? 14 : -14},9" fill="none" stroke="#ddd3d8" stroke-width="3"/>`;
        s += `<rect x="${380 + i * 46}" y="${y - 16}" width="32" height="32" rx="5" fill="${i === 1 ? '#ffffff' : '#a99da3'}"/>`;
      }
      s += bar(70, 490, 820, 6, '#3a3237');
      return frame(s);
    },
    graph() {
      let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const nodes = [{ x: 480, y: 282, r: 46, c: '#ffffff' }];
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + rnd() * .2, rr = 130 + rnd() * 160; nodes.push({ x: 480 + Math.cos(a) * rr * 1.45, y: 282 + Math.sin(a) * rr * .82, r: 8 + rnd() * 16, c: rnd() > .7 ? '#e6dde1' : '#7a6e74' }); }
      let s = '';
      nodes.slice(1).forEach((n, i) => {
        s += `<line x1="480" y1="282" x2="${n.x.toFixed(0)}" y2="${n.y.toFixed(0)}" stroke="#463e43" stroke-width="2"/>`;
        const m = nodes[1 + ((i + 3) % 26)];
        if (i % 3 === 0) s += `<line x1="${n.x.toFixed(0)}" y1="${n.y.toFixed(0)}" x2="${m.x.toFixed(0)}" y2="${m.y.toFixed(0)}" stroke="#3a3337" stroke-width="2"/>`;
      });
      nodes.forEach((n) => { s += `<circle cx="${n.x.toFixed(0)}" cy="${n.y.toFixed(0)}" r="${n.r.toFixed(0)}" fill="${n.c}"/>`; });
      s += `<circle cx="480" cy="282" r="74" fill="none" stroke="#bfb3b9" stroke-width="3" stroke-dasharray="6 10"/>`;
      return frame(s, '#120e11');
    },
    planner() {
      let s = win(70, 50, 820, 470);
      for (let i = 0; i < 4; i++) {
        const me = i % 2 === 0, w = [300, 260, 220, 280][i], x = me ? 100 : 420 - w + 40;
        s += `<rect x="${x}" y="${110 + i * 92}" width="${w}" height="64" rx="16" fill="${me ? '#ece5e9' : '#3f383d'}"/>` + bar(x + 20, 130 + i * 92, w - 70, 9, me ? '#7c7076' : '#a2969c') + bar(x + 20, 150 + i * 92, w - 120, 9, me ? '#9b8f95' : '#7d7177');
      }
      s += `<line x1="500" y1="104" x2="500" y2="500" stroke="#3a3337" stroke-width="2"/>`;
      const blocks = [[120, 60, '#ffffff'], [196, 90, '#a99da3'], [300, 44, '#e2d9dd'], [358, 70, '#6f6469'], [442, 50, '#c9bec3']];
      blocks.forEach(([y, h, c], i) => { s += bar(520, y + 4, 34, 8, '#6d6267') + `<rect x="580" y="${y}" width="${270 - i * 18}" height="${h}" rx="8" fill="${c}"/>`; });
      return frame(s);
    },
  };

  const drawArt = (vis, progressive) => {
    const kind = vis.dataset.art, can = $('canvas', vis);
    if (!ART[kind] || !can) return;
    const go = (img) => {
      try { dither(can, img, { cell: innerWidth < 860 ? 2.6 : 3, focusY: .5, contrast: 1.15, lift: .02, progressive }); }
      catch (e) { const c = can.getContext('2d'); can.width = can.clientWidth; can.height = can.clientHeight; c.drawImage(img, 0, 0, can.width, can.height); }
    };
    if (vis._img) return go(vis._img);
    const img = new Image();
    img.onload = () => { vis._img = img; go(img); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ART[kind]());
  };

  /* ───────────── reveal-on-scroll ───────────── */
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      seen.unobserve(el);
      el.classList.add('in');
      if (el.classList.contains('proj-vis')) drawArt(el, true);
      if (el.classList.contains('weave-band')) { el.classList.add('woven'); el.classList.remove('weaving'); }
      if (el.classList.contains('tk-row')) $$('li', el).forEach((li, i) => setTimeout(() => li.classList.add('on'), reduce ? 0 : i * 45));
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .01 });

  // Split section titles into letters.
  $$('.title').forEach((t) => {
    const text = t.textContent.trim();
    t.setAttribute('aria-label', text);
    t.innerHTML = [...text.toUpperCase()].map((ch, i) => ch === ' ' ? '<span class="ch">&nbsp;</span>' : `<span class="ch" aria-hidden="true"><span style="--i:${i}">${ch}</span></span>`).join('');
    seen.observe(t);
  });
  $$('.weave-band, .proj-vis, .tk-row').forEach((el) => seen.observe(el));
  $('.tk')?.classList.add('pre');
  $$('.proj-body, .also, .xt-item, .rl li, .wl li, .foot-grid, .about-wrap .map').forEach((el) => { el.classList.add('rv'); seen.observe(el); });

  /* ───────────── toolkit icons + count ───────────── */
  (() => {
    const items = $$('.tk li');
    items.forEach((li) => {
      const ic = document.createElement('span');
      if (li.dataset.i) { ic.className = 'tk-ic'; ic.innerHTML = `<img src="assets/icons/${li.dataset.i}.svg" alt="" width="18" height="18" loading="lazy">`; }
      else { ic.className = 'tk-ic m'; ic.textContent = li.dataset.m || '•'; }
      li.prepend(ic);
    });
    const c = $('#toolCount');
    if (c) c.textContent = `${items.length} TOOLS · ${String($$('.tk-row').length).padStart(2, '0')} DISCIPLINES`;
  })();

  /* ───────────── about: words light up as you read ───────────── */
  const about = $('#aboutText');
  let words = [];
  if (about) {
    about.innerHTML = about.textContent.split(/(\s+)/).map((w) => /\s+/.test(w) ? w : `<span class="w">${w}</span>`).join('');
    words = $$('.w', about);
  }

  /* ───────────── scroll: header, hero parallax, about words ───────────── */
  const top = $('#top'), gl = $('.giant-l'), gr = $('.giant-r'), hero = $('.hero');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    top.classList.toggle('solid', y > 40);
    if (!$('#menu').classList.contains('open')) top.classList.toggle('hide', y > 160 && y > lastY);
    lastY = y;
    if (!reduce && hero && innerWidth > 860) {
      const p = clamp(y / hero.offsetHeight);
      gl.style.transform = `translate3d(${-p * 9}vw, 0, 0)`;
      gr.style.transform = `translate3d(${p * 9}vw, 0, 0)`;
    }
    if (words.length) {
      const r = about.getBoundingClientRect();
      const p = reduce ? 1 : clamp((innerHeight * .82 - r.top) / (r.height + innerHeight * .25));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Section name in the header.
  const nameEl = $('#sectName');
  const sectObs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) nameEl.textContent = e.target.dataset.name; }), { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-name]').forEach((s) => sectObs.observe(s));

  /* ───────────── mode toggle ───────────── */
  const modeBtn = $('#modeBtn'), modeName = $('#modeName');
  const setModeLabel = () => { modeName.textContent = doc.dataset.theme === 'light' ? 'LIGHT' : 'DARK'; $('meta[name="theme-color"]').content = doc.dataset.theme === 'light' ? '#f2eee8' : '#0b0a0c'; };
  setModeLabel();
  modeBtn.addEventListener('click', () => {
    doc.dataset.theme = doc.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('mesh-theme', doc.dataset.theme); } catch (e) {}
    setModeLabel();
    paintBands();
  });

  /* ───────────── menu ───────────── */
  const menu = $('#menu'), menuBtn = $('#menuBtn');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    $('span', menuBtn).textContent = open ? 'CLOSE' : 'MENU';
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { menu.hidden = false; menu.classList.add('open'); top.classList.remove('hide'); $('a', menu).focus({ preventScroll: true }); }
    else { menu.classList.remove('open'); menu.hidden = true; }
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ───────────── rotating roles ───────────── */
  (() => {
    const el = $('#roleText');
    if (!el) return;
    const roles = ['SOLUTIONS ARCHITECT @ASSETSAAS.IO', 'BSC (HONS) COMPUTER SCIENCE @COVENTRY UNIVERSITY', 'BUSINESS OWNER @CAFE LAGO & LUMORA', 'BUILDER @NEBIUS × NVIDIA AI HACKATHON 2026', 'CREATOR @MESHYDRA'];
    const glyphs = '▚▞▖▗▘▝#*+=-';
    let i = 1;
    el.textContent = roles[1];
    const scramble = (to) => {
      if (reduce) { el.textContent = to; return; }
      const from = el.textContent, len = Math.max(from.length, to.length);
      let f = 0;
      const tick = () => {
        let out = '';
        for (let k = 0; k < len; k++) {
          const done = k < f - 4;
          out += done ? (to[k] || '') : (k < f ? glyphs[(k + f) % glyphs.length] : (from[k] || ''));
        }
        el.textContent = out;
        if (f++ < len + 5) setTimeout(tick, 18); else el.textContent = to;
      };
      tick();
    };
    setInterval(() => { if (!document.hidden) scramble(roles[i = (i + 1) % roles.length]); }, 3200);
  })();

  /* ───────────── experience rows ───────────── */
  $$('.xt-item').forEach((item) => {
    const btn = $('.plus', item);
    const toggle = () => { const open = !item.classList.contains('open'); item.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? '−' : '+'; };
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    $('.xt-row', item).addEventListener('click', toggle);
  });

  /* ───────────── recognition filter ───────────── */
  (() => {
    const tabs = $$('.tab'), rows = $$('.rl li');
    const count = (f) => String(f === 'all' ? rows.length : rows.filter((r) => r.dataset.t === f).length).padStart(2, '0');
    tabs.forEach((t) => {
      $('i', t).textContent = count(t.dataset.f);
      t.addEventListener('click', () => {
        tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
        rows.forEach((r) => { r.hidden = !(t.dataset.f === 'all' || r.dataset.t === t.dataset.f); if (!r.hidden) r.classList.add('in'); });
      });
    });
  })();

  /* ───────────── Kandy clock ───────────── */
  (() => {
    const el = $('#lkTime');
    if (!el) return;
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' });
    const set = () => { el.textContent = fmt.format(new Date()); };
    set();
    setInterval(set, 30000);
  })();

  /* ───────────── redraw canvases on resize ───────────── */
  let rt, lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return; // ignore mobile URL-bar height jumps
    lastW = innerWidth;
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (pImg?.naturalWidth && !doc.classList.contains('no-canvas')) drawPortrait(false);
      $$('.proj-vis.in').forEach((v) => drawArt(v, false));
    }, 200);
  });
})();
