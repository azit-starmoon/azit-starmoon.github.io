// AZIT : Star&Moon — 결과지 도형과 막대
import { esc } from './ui.js';

const CENTER_COLOR = { gut: 'var(--gut)', heart: 'var(--heart)', head: 'var(--head)' };
const CENTER_OF = { 1: 'gut', 2: 'heart', 3: 'heart', 4: 'heart', 5: 'head', 6: 'head', 7: 'head', 8: 'gut', 9: 'gut' };

export function centerColor(t) { return CENTER_COLOR[CENTER_OF[t]]; }

// 에니어그램 도형을 별자리로 그린다. 점수가 높을수록 밝고 큰 별.
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
      <marker id="ag${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#e2b653"/></marker>
      <marker id="as${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8f96b8"/></marker>
    </defs>${opts.growth ? arrow(opts.growth, '#e2b653', `ag${uid}`) : ''}${opts.stress ? arrow(opts.stress, '#8f96b8', `as${uid}`) : ''}`;
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
  return `<path d="M${x},${(y - s).toFixed(1)} L${(x + k).toFixed(1)},${(y - k).toFixed(1)} L${(x + s).toFixed(1)},${y} L${(x + k).toFixed(1)},${(y + k).toFixed(1)} L${x},${(y + s).toFixed(1)} L${(x - k).toFixed(1)},${(y + k).toFixed(1)} L${(x - s).toFixed(1)},${y} L${(x - k).toFixed(1)},${(y - k).toFixed(1)}Z" fill="#e2b653" opacity=".9"/>`;
}

// 가로 막대 목록. rows: [{ key, label, num, value(0~100), color, core, note }]
export function barList(rows, { max = 100, aria = '', stacked = false } = {}) {
  return `<ul class="bars ${stacked ? 'bars--stacked' : ''}" ${aria ? `aria-label="${esc(aria)}"` : ''}>${rows
    .map((r) => {
      const w = Math.max(0, Math.min(100, (r.value / max) * 100));
      return `<li class="bar-row ${r.core ? 'is-core' : ''}" title="${esc(`${r.label}: ${r.value}`)}">
        <span class="lab">${r.num != null ? `<span class="num">${esc(r.num)}</span>` : ''}${esc(r.label)}${r.core ? ' <span class="core-mark">★</span>' : ''}</span>
        <span class="track" aria-hidden="true"><span class="fill" style="width:${w.toFixed(1)}%;background:${r.color || 'var(--night)'}"></span></span>
        <span class="val">${esc(r.value)}</span>
      </li>`;
    })
    .join('')}</ul>`;
}

export function legend(items) {
  return `<div class="legend">${items.map((i) => `<span><i style="background:${i.color}"></i>${esc(i.label)}</span>`).join('')}</div>`;
}

// 작은 별 장식 (결과지 마무리용)
export function starGlyph(fill = '#e2b653') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="${fill}"/></svg>`;
}

export function arrowGlyph(color = 'currentColor') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
