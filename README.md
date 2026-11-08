# meshydra.com

Mesh Ariyawansa's portfolio. Static, no build step, served by GitHub Pages from `main` (CNAME `meshydra.com`).

| What | Where |
|---|---|
| Page + SEO (title, Open Graph, JSON-LD Person/WebSite/FAQ) | `index.html` |
| Styles (white first, Apple colours, LankaByte blue/gold accent) | `assets/css/site.css` |
| Projects (no client names) | `assets/js/projects.js` |
| **The 3D me: change looks here** | `assets/js/avatar.config.js` |
| 3D builder (three.js 0.170 from jsDelivr) | `assets/js/memoji.js` |
| Cursor swoosh (WebGL fluid, MIT port of Pavel Dobryakov's) | `assets/js/fluid.js` |
| Smooth scroll, reveals, filters, map, clock | `assets/js/main.js` (+ `assets/vendor/lenis.min.js`) |
| Share image + touch icon | `node scripts/make-og.cjs` (renders from `assets/img/memoji.png`) |

Run locally: `python -m http.server 8142` (preview `meshydra-site`).

After changing CSS or `main.js`, bump `?v=` in `index.html` (GitHub Pages caches files for 10 minutes).
If the 3D me changes a lot, re-capture `assets/img/memoji.png` (it's the share image and the no-WebGL fallback) and run `make-og.cjs`.
