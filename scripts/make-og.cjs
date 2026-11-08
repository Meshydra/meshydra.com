// Renders assets/img/og.png (1200x630) and apple-touch-icon.png from assets/img/memoji.png.
// Uses @resvg/resvg-js + Inter Tight from ../sitepanel-lk (no deps of its own).
// Run: node scripts/make-og.cjs
const fs = require('fs'), path = require('path');
const SP = path.join(__dirname, '../../sitepanel-lk');
const { Resvg } = require(path.join(SP, 'node_modules/@resvg/resvg-js'));
const fonts = ['InterTight-600.ttf', 'InterTight-700.ttf'].map((f) => path.join(SP, 'scripts/fonts', f));
const img = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../assets/img/memoji.png')).toString('base64');
const blob = (cx, cy, r, c, o) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="${o}" filter="url(#b)"/>`;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
  <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="535" x2="700" y1="0" y2="0"><stop offset="0" stop-color="#3f66e0"/><stop offset=".45" stop-color="#af52de"/><stop offset=".75" stop-color="#ff2d55"/><stop offset="1" stop-color="#ff9500"/></linearGradient></defs>
  <rect width="1200" height="630" fill="#fff"/>
  ${blob(980, 170, 170, '#007aff', .22)}${blob(1100, 470, 150, '#ff2d55', .18)}${blob(820, 520, 140, '#34c759', .16)}${blob(760, 120, 110, '#ff9500', .16)}
  <image href="${img}" x="700" y="40" width="486" height="547" style="mix-blend-mode:multiply"/>
  <text x="80" y="150" font-family="Inter Tight" font-weight="600" font-size="30" fill="#6e6e73">Mesh Ariyawansa · Meshydra</text>
  <text x="80" y="265" font-family="Inter Tight" font-weight="700" font-size="92" letter-spacing="-4" fill="#1d1d1f">I help small</text>
  <text x="80" y="360" font-family="Inter Tight" font-weight="700" font-size="92" letter-spacing="-4" fill="#1d1d1f">businesses <tspan fill="url(#g)">win.</tspan></text>
  <rect x="296" y="284" width="206" height="9" rx="4.5" fill="#f2a93b" opacity=".9"/>
  
  <text x="80" y="560" font-family="Inter Tight" font-weight="600" font-size="28" fill="#3f66e0">meshydra.com · Kandy, Sri Lanka</text>
</svg>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8eeff"/><stop offset="1" stop-color="#fdeee0"/></linearGradient></defs>
  <rect width="180" height="180" fill="url(#g)"/><image href="${img}" x="10" y="6" width="160" height="180" style="mix-blend-mode:multiply"/></svg>`;
const render = (svg, out, w) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: w }, font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Inter Tight' } }).render().asPng();
  fs.writeFileSync(path.join(__dirname, '..', out), png);
  console.log(out, png.length);
};
render(og, 'assets/img/og.png', 1200);
render(icon, 'assets/img/apple-touch-icon.png', 180);
