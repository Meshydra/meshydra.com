import { startFluid } from './fluid.js?v=20261108f';
import PROJECTS from './projects.js?v=20261108f';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- smooth scroll ---------- */
let lenis = null;
function startLenis() {
  if (reduce || !window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, anchors: { offset: -20 } });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else window.addEventListener('load', startLenis, { once: true });

/* ---------- the swoosh ---------- */
if (!reduce) {
  const canvas = $('#fluid');
  try { if (!startFluid(canvas)) canvas.remove(); } catch (e) { canvas.remove(); }
}

/* ---------- 3D me ---------- */
const meBtn = $('#me');
function fallbackMe() {
  meBtn.insertAdjacentHTML('afterbegin', '<img src="/assets/img/memoji.png" alt="" width="563" height="595" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply">');
  meBtn.classList.add('ready');
}
function loadMe() {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return fallbackMe();
  import('./memoji.js?v=20261108f').then(({ mountMemoji }) => {
    return mountMemoji(meBtn, new URLSearchParams(location.search).has('still') ? { follow: 0 } : {});
  }).then((avatar) => {
    meBtn.avatar = avatar; // handy for tweaking from the console
    meBtn.classList.add('ready');
  }).catch((e) => { console.error('3D avatar failed, showing picture', e); fallbackMe(); });
}
(window.requestIdleCallback || ((f) => setTimeout(f, 200)))(loadMe);

/* ---------- statement fills word by word ---------- */
const fill = $('[data-fill]');
if (fill) {
  const highlight = new Set(['small', 'businesses', 'succeed.', 'same', 'care.']);
  fill.innerHTML = '<span>' + fill.textContent.trim().split(/\s+/).map((w) => `<span class="w${highlight.has(w) ? ' hl' : ''}">${w}</span>`).join(' ') + '</span>';
  const words = $$('.w', fill), story = fill.parentElement;
  const update = () => {
    const r = story.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (-r.top + innerHeight * 0.25) / (r.height - innerHeight * 0.6)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  };
  if (reduce) words.forEach((w) => w.classList.add('on'));
  else { addEventListener('scroll', update, { passive: true }); update(); }
}

/* ---------- blur-in headings ---------- */
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
$$('.blur-in').forEach((el) => io.observe(el));

/* ---------- nav: mark the section you're in ---------- */
const spy = $$('[data-spy]');
const spyIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) spy.forEach((a) => a.classList.toggle('on', a.dataset.spy === e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
['work', 'about', 'contact'].forEach((id) => spyIO.observe(document.getElementById(id)));
const heroIO = new IntersectionObserver(([e]) => { if (e.isIntersecting) spy.forEach((a) => a.classList.remove('on')); }, { threshold: 0.4 });
heroIO.observe($('#hero'));

/* ---------- project art (generated, no screenshots) ---------- */
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function art(p, i) {
  const c = `var(--${p.colour})`, R = rnd(i * 97 + 13);
  const tint = (k) => `color-mix(in srgb, ${c} ${k}%, #fff)`;
  const bars = (x, y, w, n, h = 6, gap = 10) => Array.from({ length: n }, (_, j) => `<rect x="${x}" y="${y + j * gap}" width="${w * (0.5 + R() * 0.5)}" height="${h}" rx="3" fill="${tint(j ? 22 : 40)}"/>`).join('');
  if (p.art === 'site') {
    const hero = R() > 0.5;
    return `<svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="${260 + R() * 40}" cy="${30 + R() * 30}" r="${70 + R() * 30}" fill="${tint(24)}"/>
      <g transform="translate(36 34)">
        <rect width="248" height="186" rx="12" fill="#fff" stroke="${tint(30)}"/>
        <circle cx="14" cy="13" r="3.5" fill="#ff5f57"/><circle cx="26" cy="13" r="3.5" fill="#febc2e"/><circle cx="38" cy="13" r="3.5" fill="#28c840"/>
        <rect x="70" y="8" width="108" height="10" rx="5" fill="${tint(14)}"/>
        <rect x="0" y="26" width="248" height="1" fill="${tint(20)}"/>
        ${hero ? `<rect x="14" y="40" width="220" height="70" rx="8" fill="${tint(30)}"/><rect x="26" y="58" width="${90 + R() * 40}" height="10" rx="5" fill="${c}"/><rect x="26" y="74" width="70" height="6" rx="3" fill="#fff"/><rect x="26" y="88" width="44" height="12" rx="6" fill="#1d1d1f"/>`
               : `<rect x="14" y="44" width="${100 + R() * 30}" height="12" rx="6" fill="${c}"/>${bars(14, 64, 120, 3)}<rect x="150" y="40" width="84" height="70" rx="10" fill="${tint(35)}"/>`}
        ${[0, 1, 2].map((k) => `<rect x="${14 + k * 76}" y="122" width="68" height="52" rx="8" fill="${tint(10 + k * 6)}"/>`).join('')}
      </g></svg>`;
  }
  if (p.art === 'app') {
    const pts = Array.from({ length: 8 }, (_, k) => `${120 + k * 22},${150 - (20 + R() * 50)}`).join(' ');
    return `<svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="${R() * 60}" cy="${200 + R() * 20}" r="${80 + R() * 30}" fill="${tint(24)}"/>
      <g transform="translate(30 30)">
        <rect width="270" height="190" rx="14" fill="#fff" stroke="${tint(30)}"/>
        <rect x="0" y="0" width="64" height="190" rx="14" fill="${tint(14)}"/><rect x="50" y="0" width="14" height="190" fill="${tint(14)}"/>
        <rect x="14" y="16" width="22" height="22" rx="7" fill="${c}"/>
        ${[0, 1, 2, 3, 4].map((k) => `<rect x="14" y="${54 + k * 18}" width="${30 + R() * 14}" height="6" rx="3" fill="${k ? tint(40) : c}"/>`).join('')}
        ${[0, 1, 2].map((k) => `<rect x="${78 + k * 62}" y="16" width="54" height="40" rx="9" fill="${tint(12 + k * 8)}"/><rect x="${86 + k * 62}" y="40" width="${18 + R() * 20}" height="7" rx="3.5" fill="${c}"/>`).join('')}
        <rect x="78" y="66" width="178" height="106" rx="10" fill="${tint(7)}"/>
        <polyline points="${pts}" transform="translate(-28 0)" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </g></svg>`;
  }
  if (p.art === 'phone') {
    return `<svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="160" cy="120" r="${88 + R() * 20}" fill="${tint(26)}"/>
      <g transform="translate(112 18) rotate(${(R() - 0.5) * 10} 48 100)">
        <rect width="96" height="200" rx="18" fill="#1d1d1f"/><rect x="5" y="5" width="86" height="190" rx="14" fill="#fff"/>
        <rect x="34" y="10" width="28" height="7" rx="3.5" fill="#1d1d1f"/>
        <rect x="14" y="30" width="68" height="46" rx="10" fill="${tint(40)}"/><circle cx="48" cy="53" r="12" fill="${c}"/>
        ${bars(14, 88, 68, 4, 6, 12)}
        <rect x="14" y="146" width="68" height="18" rx="9" fill="${c}"/>
        <rect x="14" y="170" width="68" height="12" rx="6" fill="${tint(18)}"/>
      </g></svg>`;
  }
  // tool: a desktop window with a terminal
  const lines = Array.from({ length: 6 }, (_, k) => `<rect x="${k % 3 ? 30 : 14}" y="${44 + k * 16}" width="${50 + R() * 120}" height="6" rx="3" fill="${k === 5 ? c : k % 2 ? '#3a3a3c' : '#5a5a5e'}"/>`).join('');
  return `<svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <circle cx="${280 - R() * 30}" cy="${190 + R() * 20}" r="${90 + R() * 20}" fill="${tint(26)}"/>
    <g transform="translate(40 34)">
      <rect width="240" height="160" rx="12" fill="#1d1d1f"/>
      <circle cx="14" cy="13" r="3.5" fill="#ff5f57"/><circle cx="26" cy="13" r="3.5" fill="#febc2e"/><circle cx="38" cy="13" r="3.5" fill="#28c840"/>
      <text x="14" y="38" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10" fill="${c}">~/meshydra $</text>
      ${lines}
    </g>
    <g transform="translate(220 22)"><rect width="74" height="54" rx="12" fill="#fff" stroke="${tint(30)}"/><circle cx="20" cy="27" r="10" fill="${c}"/>${bars(36, 18, 30, 2, 5, 12)}</g>
  </svg>`;
}

const grid = $('#grid');
grid.innerHTML = PROJECTS.map((p, i) => {
  const tag = p.link ? 'a' : 'div';
  const attrs = p.link ? ` href="${p.link}" target="_blank" rel="noopener"` : '';
  const badge = p.badge ? `<span class="badge${p.badge === 'Code' ? ' code' : ''}">${p.badge === 'Code' ? 'Code ↗' : p.badge}</span>` : '';
  return `<${tag} class="card" data-k="${p.kind}" style="--c:var(--${p.colour})"${attrs}>
    <div class="art"><span class="no">${String(i + 1).padStart(2, '0')}</span>${badge}${art(p, i)}</div>
    <div class="meta"><h3>${p.title}</h3><span class="yr">${p.year}</span></div>
    <p>${p.line}</p>
  </${tag}>`;
}).join('');

const cards = $$('.card', grid);
const prevBtn = $('.rail-btn.prev'), nextBtn = $('.rail-btn.next');
function railArrows() {
  const max = grid.scrollWidth - grid.clientWidth - 4;
  prevBtn.disabled = grid.scrollLeft <= 4;
  nextBtn.disabled = grid.scrollLeft >= max;
}
const stepW = () => (cards.find((c) => !c.classList.contains('hidden'))?.offsetWidth || 400) + 22;
prevBtn.addEventListener('click', () => grid.scrollBy({ left: -stepW() * 2, behavior: reduce ? 'auto' : 'smooth' }));
nextBtn.addEventListener('click', () => grid.scrollBy({ left: stepW() * 2, behavior: reduce ? 'auto' : 'smooth' }));
grid.addEventListener('scroll', railArrows, { passive: true });
addEventListener('resize', railArrows);

function applyFilter(f) {
  cards.forEach((c) => {
    c.classList.toggle('hidden', f !== 'all' && c.dataset.k !== f);
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  });
  grid.scrollTo({ left: 0 });
  railArrows();
}
$$('.filters button').forEach((b) => b.addEventListener('click', () => {
  $$('.filters button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  applyFilter(b.dataset.f);
}));
railArrows();

/* ---------- toolkit marquee ---------- */
const TOOLS = [
  ['typescript', 'TypeScript'], ['javascript', 'JavaScript'], ['nodejs', 'Node.js'], ['react', 'React'], ['python', 'Python'],
  ['csharp', 'C#'], ['dotnet', '.NET'], ['php', 'PHP'], ['postgresql', 'PostgreSQL'], ['redis', 'Redis'], ['sqlite', 'SQLite'],
  ['docker', 'Docker'], ['linux', 'Linux'], ['caddy', 'Caddy'], ['nginx', 'Nginx'], ['cloudflare', 'Cloudflare'],
  ['digitalocean', 'DigitalOcean'], ['azure', 'Azure'], ['aws', 'AWS'], ['n8n', 'n8n'], ['githubactions', 'GitHub Actions'],
  ['playwright', 'Playwright'], ['claude', 'Claude'], ['openai', 'OpenAI'], ['nvidia', 'Nemotron'], ['tailwind', 'Tailwind'],
];
const half = Math.ceil(TOOLS.length / 2);
$$('.marquee').forEach((m, k) => {
  const set = (k ? TOOLS.slice(half) : TOOLS.slice(0, half)).map(([f, n]) => `<span class="tool"><img src="/assets/icons/${f}.svg" alt="" width="22" height="22" loading="lazy">${n}</span>`).join('');
  m.innerHTML = set + set.replace(/<span class="tool">/g, '<span class="tool" aria-hidden="true">');
});

/* ---------- journey line draws as you scroll ---------- */
const journey = $('.journey');
if (journey) {
  const draw = () => {
    const r = journey.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
    journey.style.setProperty('--p', reduce ? 1 : p.toFixed(3));
  };
  addEventListener('scroll', draw, { passive: true }); draw();
}

/* ---------- Sri Lanka map ---------- */
(() => {
  const svg = $('#lkMap');
  if (!svg) return;
  const coast = [[80.22, 9.83], [80.05, 9.79], [79.9, 9.72], [80.0, 9.62], [80.14, 9.57], [80.1, 9.45], [80.04, 9.3], [79.93, 9.12], [79.82, 9.05], [79.93, 8.95], [79.95, 8.72], [79.9, 8.42], [79.78, 8.22], [79.74, 8.05], [79.8, 7.7], [79.83, 7.22], [79.86, 6.93], [79.94, 6.56], [80.03, 6.27], [80.13, 6.06], [80.35, 5.97], [80.59, 5.92], [80.9, 6.04], [81.12, 6.12], [81.4, 6.35], [81.62, 6.65], [81.8, 6.95], [81.86, 7.3], [81.72, 7.62], [81.56, 7.95], [81.4, 8.2], [81.22, 8.55], [81.05, 8.85], [80.86, 9.1], [80.7, 9.34], [80.5, 9.55], [80.36, 9.7]];
  const P = ([lon, lat]) => [(lon - 79.62) * 100 + 2, (9.88 - lat) * 100 + 2];
  const pts = coast.map(P);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const [kx, ky] = P([80.63, 7.29]);
  svg.innerHTML = `
    <defs>
      <pattern id="lkDots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="var(--accent)" opacity=".55"/></pattern>
      <clipPath id="lkClip"><path d="${d}"/></clipPath>
    </defs>
    <path d="${d}" fill="#fff"/>
    <rect width="240" height="410" fill="url(#lkDots)" clip-path="url(#lkClip)"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.6" opacity=".7"/>
    <g transform="translate(${kx.toFixed(1)} ${ky.toFixed(1)})">
      <circle r="7" fill="none" stroke="var(--gold)" stroke-width="2">${reduce ? '' : '<animate attributeName="r" values="7;22;7" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="2.4s" repeatCount="indefinite"/>'}</circle>
      <circle r="7" fill="var(--gold)" stroke="#fff" stroke-width="2.5"/>
    </g>`;
})();

/* ---------- Kandy clock ---------- */
const clock = $('#lkTime');
const tick = () => { clock.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' }).format(new Date()); };
tick(); setInterval(tick, 20000);

/* ---------- copy email ---------- */
$('#copy').addEventListener('click', async (e) => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText('hello@meshydra.com'); b.textContent = 'Copied ✓'; }
  catch { b.textContent = 'hello@meshydra.com'; }
  setTimeout(() => { b.textContent = 'Copy'; }, 1800);
});

/* ---------- background music (10%), starts on the first interaction ---------- */
(() => {
  const audio = $('#bgm'), btn = $('#sound');
  if (!audio || !btn) return;
  audio.volume = 0.1;
  let muted = false;
  try { muted = localStorage.getItem('meshydra-muted') === '1'; } catch {}
  const paint = () => {
    btn.classList.toggle('muted', muted);
    btn.classList.toggle('playing', !audio.paused && !muted);
    btn.setAttribute('aria-pressed', String(muted));
    btn.setAttribute('aria-label', muted ? 'Play music' : 'Mute music');
  };
  const play = () => { if (!muted) audio.play().then(paint).catch(paint); };
  audio.addEventListener('play', paint); audio.addEventListener('pause', paint);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    muted = !muted;
    try { localStorage.setItem('meshydra-muted', muted ? '1' : '0'); } catch {}
    if (muted) audio.pause(); else { audio.volume = 0.1; audio.play().catch(() => {}); }
    paint();
  });
  // Browsers only allow sound after the visitor does something on the page.
  const kick = () => { ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => removeEventListener(t, kick)); play(); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, kick, { passive: true }));
  play(); // works straight away where autoplay is allowed
  paint();
})();
