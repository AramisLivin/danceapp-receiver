// ---------- Cue strips: each cue built once as an SVG figure; every frame only moves it ----------
const SVG = 'http://www.w3.org/2000/svg';

function el(n, a) { const e = document.createElementNS(SVG, n); for (const k in a) e.setAttribute(k, a[k]); return e; }

// Pictogram figure generated from 13 pose points (+ heels and toes): one smooth body with a shared outline,
// arms outlined on their own so they read over the torso. Proportions follow torso length, so a side-on
// pose doesn't come out skinny.
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k], len = a => Math.hypot(a[0], a[1]) || 1e-6;
const unit = a => mul(a, 1 / len(a)), perp = a => [-a[1], a[0]], mid = (a, b, t = .5) => add(a, mul(sub(b, a), t));
const P = p => p[0].toFixed(2) + ',' + p[1].toFixed(2);

// Tapered segment a→b, half-widths w1→w2: a quad plus a circle at each end, so joints are always round
function taper(a, b, w1, w2) {
  const n = perp(unit(sub(b, a)));
  const a1 = add(a, mul(n, w1)), a2 = sub(a, mul(n, w1)), b1 = add(b, mul(n, w2)), b2 = sub(b, mul(n, w2));
  const circle = (c, r) => `M${(c[0] - r).toFixed(2)},${c[1].toFixed(2)} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`;
  return `M${P(a1)} L${P(b1)} L${P(b2)} L${P(a2)} Z ` + circle(a, w1) + ' ' + circle(b, w2);
}
function ellipse(c, rx, ry, angleDeg) {
  return el('ellipse', { cx: c[0], cy: c[1], rx, ry, transform: `rotate(${angleDeg} ${c[0]} ${c[1]})` });
}
const deg = v => Math.atan2(v[1], v[0]) * 180 / Math.PI;

function figureSvg(points, feet, aspect, tint, gradientId, outline = '#1a0f2e') {
  const fill = `url(#${gradientId})`;
  // Fit pose into a 100×100 box
  const all = points.concat(feet || []);
  const xs = all.map(p => p[0] * aspect), ys = all.map(p => p[1]);
  const ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-3);
  const sc = 66 / ext, cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const f = p => [50 + (p[0] * aspect - cx) * sc, 53 + (p[1] - cy) * sc];
  const [nose, ls, rs, le, re, lw, rw, lh, rh, lk, rk, la, ra] = points.map(f);
  const [lheel, rheel, ltoe, rtoe] = (feet || []).map(f);

  const sMid = mid(ls, rs), hMid = mid(lh, rh);
  const up = unit(sub(sMid, hMid)), T = len(sub(sMid, hMid)), across = perp(up);
  // Keep shoulders and hips a body's width apart even side-on
  const widen = (a, b, min) => {
    const m = mid(a, b), d = sub(b, a), w = Math.max(len(d), min);
    const dir = len(d) > min * 0.35 ? unit(d) : across;
    return [sub(m, mul(dir, w / 2)), add(m, mul(dir, w / 2))];
  };
  // Same side first in both pairs, so the torso outline never crosses over itself
  const bySide = ([a, b]) => (a[0] - b[0]) * across[0] + (a[1] - b[1]) * across[1] < 0 ? [a, b] : [b, a];
  const [sA, sB] = bySide(widen(ls, rs, 0.78 * T)), [hA, hB] = bySide(widen(lh, rh, 0.62 * T));
  const outward = (p, from, k) => add(p, mul(unit(sub(p, from)), k));
  const sAo = sA, sBo = sB;
  const hAo = outward(hA, hB, 0.06 * T), hBo = outward(hB, hA, 0.06 * T);
  const wA = mid(mid(sA, hA, .62), mid(sB, hB, .62), .1), wB = mid(mid(sB, hB, .62), mid(sA, hA, .62), .1);
  const neckBase = add(sMid, mul(up, 0.04 * T));
  // Shoulders: a soft arch over the top; the arms hang from its corners
  const sAc = sub(sAo, mul(up, 0.06 * T)), sBc = sub(sBo, mul(up, 0.06 * T));
  const torso = `M${P(sAc)} C${P(add(sAo, mul(up, 0.1 * T)))} ${P(add(sBo, mul(up, 0.1 * T)))} ${P(sBc)} Q${P(wB)} ${P(hBo)} ` +
    `Q${P(add(hMid, mul(up, -0.12 * T)))} ${P(hAo)} Q${P(wA)} ${P(sAc)} Z`;

  const headC = add(nose, mul(up, 0.05 * T));
  const parts = [], arms = [[], []], hands = [];
  const path = d => el('path', { d });
  // Legs and shoes
  for (const [hip, knee, ankle, heel, toe] of [[lh, lk, la, lheel, ltoe], [rh, rk, ra, rheel, rtoe]]) {
    parts.push(path(taper(hip, knee, 0.23 * T, 0.16 * T)), path(taper(knee, ankle, 0.16 * T, 0.11 * T)));
    if (heel && toe) parts.push(path(taper(heel, toe, 0.09 * T, 0.075 * T)), path(taper(ankle, mid(heel, toe), 0.11 * T, 0.09 * T)));
  }
  parts.push(path(torso));
  parts.push(path(taper(neckBase, headC, 0.11 * T, 0.1 * T)));
  const head = ellipse(headC, 0.21 * T, 0.26 * T, deg(up) + 90);
  // Arms with mitten hands along the forearm
  // Each arm hangs from the torso's shoulder corner on its side (the widened body, not the raw landmark),
  // tucked a little inside so the joint is hidden under the shoulder's curve
  const corner = s => len(sub(s, sAo)) < len(sub(s, sBo)) ? sAo : sBo;
  [[ls, le, lw], [rs, re, rw]].forEach(([raw, e, w], i) => {
    const c = corner(raw);
    const s = add(mid(c, sMid, 0.12), mul(up, -0.02 * T));
    const fore = unit(sub(w, e));
    arms[i].push(path(taper(s, e, 0.155 * T, 0.12 * T)), path(taper(e, w, 0.12 * T, 0.09 * T)));
    hands[i] = ellipse(add(w, mul(fore, 0.1 * T)), 0.15 * T, 0.105 * T, deg(fore));
  });

  const svg = el('svg', { viewBox: '0 0 100 100' });
  const defs = el('defs', {});
  const grad = el('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.appendChild(el('stop', { offset: '0', 'stop-color': '#ffffff' }));
  grad.appendChild(el('stop', { offset: '1', 'stop-color': tint }));
  defs.appendChild(grad); svg.appendChild(defs);
  const layer = (shapes) => {
    // Outline pass for the whole group, then the fill on top: one silhouette, one outline
    const o = el('g', { fill: outline, stroke: outline, 'stroke-width': 4.4, 'stroke-linejoin': 'round' });
    const i = el('g', { fill, stroke: 'none' });
    for (const s of shapes) { o.appendChild(s.cloneNode()); i.appendChild(s.cloneNode()); }
    svg.appendChild(o); svg.appendChild(i);
  };
  layer(parts);
  // Upper arms behind the head, forearms and hands in front of it: raised arms frame the head instead of
  // hiding it, and hands on the head lie over it. Lower arm first, so a raised one is on top.
  const order = lw[1] > rw[1] ? [0, 1] : [1, 0];
  for (const i of order) layer([arms[i][0]]);
  layer([head]);
  for (const i of order) layer([arms[i][1], hands[i]]);
  return svg;
}

