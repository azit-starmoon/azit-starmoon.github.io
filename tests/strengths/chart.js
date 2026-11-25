// AZIT : Star&Moon — 성격 강점 그림
// 강점 바퀴: 24강점을 덕목별로 묶어 둥글게 두른 꽃잎 그림. 꽃잎 길이는 점수의 제곱근에 비례(넓이가 점수에 비례).
// 대표 강점 5개는 진하게 칠하고 끝에 순위 번호를 단다. 나머지는 옅게. 바깥 호와 글자로 덕목을 표시해 색만으로 구분하지 않는다.
// 정확한 값은 결과지의 순위 목록이 맡고, 이 그림은 어느 덕목에 힘이 모였는지를 한눈에 보여 준다.
import { esc } from '../../assets/js/ui.js';
import { STRENGTHS, STRENGTH_ORDER, VIRTUES, VIRTUE_ORDER } from './items.js';
import { VIRTUE_COLOR } from './content.js';

const OPACITY = { sig: 1, mid: 0.5, rest: 0.24 };
const pt = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const f = (n) => n.toFixed(1);

function wedge(cx, cy, r0, r1, a0, a1) {
  const [x0, y0] = pt(cx, cy, r1, a0);
  const [x1, y1] = pt(cx, cy, r1, a1);
  const [x2, y2] = pt(cx, cy, r0, a1);
  const [x3, y3] = pt(cx, cy, r0, a0);
  return `M${f(x0)},${f(y0)}A${f(r1)},${f(r1)} 0 0 1 ${f(x1)},${f(y1)}L${f(x2)},${f(y2)}A${f(r0)},${f(r0)} 0 0 0 ${f(x3)},${f(y3)}Z`;
}

function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  return `M${f(x0)},${f(y0)}A${f(r)},${f(r)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)},${f(y1)}`;
}

// strengths: { cre: { score, rank, tier }, ... }
export function strengthWheel(strengths, { size = 300, labels = true, title = '' } = {}) {
  const pad = labels ? 46 : 4;
  const W = size + pad * 2;
  const c = W / 2;
  const R = size * 0.44;
  const r0 = size * 0.1;
  const n = STRENGTH_ORDER.length;
  const step = (Math.PI * 2) / n;
  const gap = 0.018;
  const start = -Math.PI / 2;
  const rad = (v) => r0 + (R - r0) * Math.sqrt(Math.max(0, Math.min(100, Number(v) || 0)) / 100);

  const rings = [25, 50, 75, 100].map((v) => `<circle class="sw-ring" cx="${f(c)}" cy="${f(c)}" r="${f(rad(v))}"/>`).join('');
  const marks = [];
  const petals = STRENGTH_ORDER.map((s, i) => {
    const v = strengths[s] || { score: 0, tier: 'mid' };
    const a0 = start + i * step + gap;
    const a1 = start + (i + 1) * step - gap;
    const r1 = Math.max(r0 + 2, rad(v.score));
    if (v.tier === 'sig' && labels !== 'none') {
      const [x, y] = pt(c, c, r1 + size * 0.04, (a0 + a1) / 2);
      marks.push(`<g class="sw-rank"><circle cx="${f(x)}" cy="${f(y)}" r="${f(size * 0.032)}"/><text x="${f(x)}" y="${f(y + size * 0.012)}" text-anchor="middle">${v.rank}</text></g>`);
    }
    return `<path class="sw-petal" d="${wedge(c, c, r0, r1, a0, a1)}" fill="${VIRTUE_COLOR[STRENGTHS[s].virtue]}" fill-opacity="${OPACITY[v.tier] || 0.5}"><title>${esc(STRENGTHS[s].name)} ${Number(v.score) || 0}점${v.rank ? `, ${v.rank}위` : ''}</title></path>`;
  }).join('');

  let idx = 0;
  const bands = [];
  const names = [];
  VIRTUE_ORDER.forEach((vk) => {
    const k = VIRTUES[vk].strengths.length;
    const a0 = start + idx * step + gap;
    const a1 = start + (idx + k) * step - gap;
    idx += k;
    bands.push(`<path class="sw-band" d="${arc(c, c, R + size * 0.045, a0, a1)}" stroke="${VIRTUE_COLOR[vk]}"/>`);
    if (labels) {
      const am = (a0 + a1) / 2;
      const [x, y] = pt(c, c, R + size * 0.085, am);
      const cos = Math.cos(am);
      const anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
      const dy = Math.sin(am) > 0.6 ? 12 : Math.sin(am) < -0.6 ? -2 : 5;
      names.push(`<text class="sw-vname" x="${f(x)}" y="${f(y + dy)}" text-anchor="${anchor}">${esc(VIRTUES[vk].name)}</text>`);
    }
  });

  return `<svg class="sw" viewBox="0 0 ${f(W)} ${f(W)}" role="img" aria-label="${esc(title || '24강점 바퀴')}">
    <title>${esc(title || '24강점 바퀴')}</title>
    <circle class="sw-bg" cx="${f(c)}" cy="${f(c)}" r="${f(R)}"/>
    ${rings}<g class="sw-petals">${petals}</g>${bands.join('')}
    <circle class="sw-core" cx="${f(c)}" cy="${f(c)}" r="${f(r0 - 3)}"/>
    ${marks.join('')}${names.join('')}
  </svg>`;
}
