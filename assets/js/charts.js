// AZIT : Star&Moon — 결과지 도형과 막대
import { esc } from './ui.js';

const CENTER_COLOR = { gut: 'var(--gut)', heart: 'var(--heart)', head: 'var(--head)' };
const CENTER_OF = { 1: 'gut', 2: 'heart', 3: 'heart', 4: 'heart', 5: 'head', 6: 'head', 7: 'head', 8: 'gut', 9: 'gut' };

export function centerColor(t) { return CENTER_COLOR[CENTER_OF[t]]; }

// 아홉 유형 도형을 별자리로 그린다. 점수가 높을수록 밝고 큰 별.
// scores: {1..9: 0~100}, opts: { core, growth, stress, size, animate, labels }
export function constellation(scores = {}, opts = {}) {
  const size = opts.size || 320;
  const c = size / 2;
  const R = size * 0.37;
  const pos = (t) => {
    const a = ((-90 + (t % 9) * 40) * Math.PI) / 180;
    return [c + R * Math.cos(a), c + R * Math.sin(a)];
  };
  const P = {};
  for (let t = 1; t <= 9; t++) P[t] = pos(t);
  const line = (seq, close) => {
    const pts = seq.map((t) => P[t].map((v) => v.toFixed(1)).join(',')).join(' L');
    return `M${pts}${close ? 'Z' : ''}`;
  };
  const core = opts.core;
  const vals = Object.keys(P).map((t) => Number(scores[t] ?? 50));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const norm = (v) => (hi - lo < 1 ? 0.5 : (v - lo) / (hi - lo));

  let stars = '';
  for (let t = 1; t <= 9; t++) {
    const [x, y] = P[t];
    const v = norm(Number(scores[t] ?? 50));
    const r = 2.2 + v * 4.2;
    const isCore = t === core;
    const delay = (0.15 + (9 - v * 8) * 0.08).toFixed(2);
    const lx = c + (R + 22) * Math.cos(((-90 + (t % 9) * 40) * Math.PI) / 180);
    const ly = c + (R + 22) * Math.sin(((-90 + (t % 9) * 40) * Math.PI) / 180) + 4.5;
    stars += `<g class="cst-starg" style="animation-delay:${delay}s">
      ${isCore ? `<circle class="cst-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 9).toFixed(1)}"/>` : ''}
      ${isCore ? sparkle(x, y, r + 5) : ''}
      <circle class="cst-star ${isCore ? 'cst-star--core' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(isCore ? r + 1.2 : r).toFixed(1)}" opacity="${(0.45 + v * 0.55).toFixed(2)}"/>
      ${opts.labels === false ? '' : `<text class="cst-label ${isCore ? 'cst-label--core' : ''}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${t}</text>`}
    </g>`;
  }

  let arrows = '';
  if (core && (opts.growth || opts.stress)) {
    const arrow = (to, color, id) => {
      const [x1, y1] = P[core];
      const [x2, y2] = P[to];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const sx = x1 + ux * 14;
      const sy = y1 + uy * 14;
      const ex = x2 - ux * 12;
      const ey = y2 - uy * 12;
      return `<path class="cst-arrow" d="M${sx.toFixed(1)},${sy.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}" stroke="${color}" marker-end="url(#${id})"/>`;
    };
    const uid = Math.random().toString(36).slice(2, 7);
    arrows = `<defs>
      <marker id="ag${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#d99a1e"/></marker>
      <marker id="as${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#9aa0bd"/></marker>
    </defs>${opts.growth ? arrow(opts.growth, '#d99a1e', `ag${uid}`) : ''}${opts.stress ? arrow(opts.stress, '#9aa0bd', `as${uid}`) : ''}`;
  }

  const title = opts.title || '아홉 유형 별자리';
  return `<svg class="${opts.animate ? 'cst-draw' : ''}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(title)}">
    <circle class="cst-ring" cx="${c}" cy="${c}" r="${R.toFixed(1)}"/>
    <path class="cst-line" pathLength="1" d="${line([9, 3, 6], true)}"/>
    <path class="cst-line" pathLength="1" d="${line([1, 4, 2, 8, 5, 7], true)}"/>
    ${arrows}
    ${stars}
  </svg>`;
}

function sparkle(x, y, s) {
  const k = s * 0.22;
  return `<path d="M${x},${(y - s).toFixed(1)} L${(x + k).toFixed(1)},${(y - k).toFixed(1)} L${(x + s).toFixed(1)},${y} L${(x + k).toFixed(1)},${(y + k).toFixed(1)} L${x},${(y + s).toFixed(1)} L${(x - k).toFixed(1)},${(y + k).toFixed(1)} L${(x - s).toFixed(1)},${y} L${(x - k).toFixed(1)},${(y - k).toFixed(1)}Z" fill="#f2b544"/>`;
}

// 가로 막대 목록. rows: [{ key, label, num, value(0~100), color, core, note }]
export function barList(rows, { max = 100, aria = '', stacked = false } = {}) {
  return `<ul class="bars ${stacked ? 'bars--stacked' : ''}" ${aria ? `aria-label="${esc(aria)}"` : ''}>${rows
    .map((r) => {
      const w = Math.max(0, Math.min(100, (r.value / max) * 100));
      return `<li class="bar-row ${r.core ? 'is-core' : ''}" title="${esc(`${r.label}: ${r.value}`)}">
        <span class="lab">${r.num != null ? `<span class="num">${esc(r.num)}</span>` : ''}${esc(r.label)}${r.core ? ' <span class="core-mark">★</span>' : ''}</span>
        <span class="track" aria-hidden="true"><span class="fill" style="width:${w.toFixed(1)}%;background:${r.color || 'var(--brand)'}"></span></span>
        <span class="val">${esc(r.value)}</span>
      </li>`;
    })
    .join('')}</ul>`;
}

export function legend(items) {
  return `<div class="legend">${items.map((i) => `<span><i style="background:${i.color}"></i>${esc(i.label)}</span>`).join('')}</div>`;
}

// 작은 별 장식 (결과지 마무리용)
export function starGlyph(fill = '#f2b544') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="${fill}"/></svg>`;
}

export function arrowGlyph(color = 'currentColor') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// 빅파이브 다섯 영역을 별 모양으로 그린다. 팔 길이 = 점수.
// domains: { O, C, E, A, N } 0~100, opts: { size, labels: {O:'개방성'...}, colors: {...}, animate, showValues }
export function b5Star(domains = {}, opts = {}) {
  const size = opts.size || 320;
  const c = size / 2;
  const R = size * 0.3;
  const order = ['O', 'C', 'E', 'A', 'N'];
  const labels = opts.labels || { O: '개방성', C: '성실성', E: '외향성', A: '친화성', N: '신경성' };
  const colors = opts.colors || { O: 'var(--o)', C: 'var(--c)', E: 'var(--e)', A: 'var(--a)', N: 'var(--n)' };
  const rad = (deg) => (deg * Math.PI) / 180;
  const at = (deg, r) => [c + r * Math.cos(rad(deg)), c + r * Math.sin(rad(deg))];
  const armR = (v) => R * (0.24 + 0.76 * Math.max(0, Math.min(100, Number(v ?? 50))) / 100);
  const pts = [];
  order.forEach((k, i) => {
    const a = -90 + i * 72;
    pts.push(at(a, armR(domains[k])));
    pts.push(at(a + 36, R * 0.18));
  });
  const shape = `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L')}Z`;
  const ring = (t) => `M${order.map((k, i) => at(-90 + i * 72, R * (0.24 + 0.76 * t)).map((v) => v.toFixed(1)).join(',')).join(' L')}Z`;
  const axes = order.map((k, i) => { const [x, y] = at(-90 + i * 72, R); return `<line class="b5-axis" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const tips = order.map((k, i) => { const [x, y] = at(-90 + i * 72, armR(domains[k])); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${colors[k]}" stroke="#fff" stroke-width="2"/>`; }).join('');
  const labs = opts.labels === false ? '' : order.map((k, i) => {
    const a = -90 + i * 72;
    const [x, y] = at(a, R + 22);
    const cos = Math.cos(rad(a));
    const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
    const dy = Math.sin(rad(a)) > 0.5 ? 10 : Math.sin(rad(a)) < -0.5 ? -6 : 2;
    return `<text class="b5-label" x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}">${esc(labels[k])}</text>${
      opts.showValues === false ? '' : `<text class="b5-label-val" x="${x.toFixed(1)}" y="${(y + dy + 15).toFixed(1)}" text-anchor="${anchor}">${esc(domains[k] ?? '')}</text>`}`;
  }).join('');
  return `<svg class="${opts.animate ? 'b5-draw' : ''}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(opts.title || '다섯 영역 점수를 별 모양으로 나타낸 그림')}">
    <path class="b5-ring" d="${ring(1)}"/><path class="b5-ring" d="${ring(0.5)}"/>${axes}
    <path class="b5-star-shape" d="${shape}"/>${tips}${labs}
  </svg>`;
}

// 두 영역을 가로·세로로 놓은 작은 사분면 그림
export function quadrant(x, y, opts = {}) {
  const s = 92;
  const p = 3;
  const w = s - p * 2;
  const half = w / 2;
  const hx = x >= 50;
  const hy = y >= 50;
  const qx = hx ? p + half : p;
  const qy = hy ? p : p + half;
  const px = p + (w * Math.max(0, Math.min(100, x))) / 100;
  const py = p + w * (1 - Math.max(0, Math.min(100, y)) / 100);
  return `<svg class="q" viewBox="0 0 ${s} ${s}" role="img" aria-label="${esc(opts.title || '')}">
    <rect class="q-frame" x="${p}" y="${p}" width="${w}" height="${w}" rx="10"/>
    <rect class="q-hit" x="${qx}" y="${qy}" width="${half}" height="${half}" rx="${hx === hy ? 8 : 8}"/>
    <line class="q-cross" x1="${p + half}" y1="${p}" x2="${p + half}" y2="${p + w}"/>
    <line class="q-cross" x1="${p}" y1="${p + half}" x2="${p + w}" y2="${p + half}"/>
    <text class="q-lab" x="${p + w - 4}" y="${p + w - 5}" text-anchor="end">${esc(opts.xLabel || '')}</text>
    <text class="q-lab" x="${p + 5}" y="${p + 11}">${esc(opts.yLabel || '')}</text>
    <circle class="q-dot" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5.5"/>
  </svg>`;
}
