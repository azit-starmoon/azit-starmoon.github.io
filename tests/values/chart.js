// AZIT : Star&Moon — 가치관 그림
// 가치 원형: 열 가치를 원형 차례로 두른 부채꼴. 부채꼴 길이는 점수의 제곱근에 비례(넓이가 점수에 비례).
// 핵심 가치 세 개는 진하게 칠하고 끝 안쪽에 순위 번호를 단다. 나머지는 옅게, 덜 앞세우는 가치는 더 옅게.
// 바깥에는 가치 이름을 글자로 적고, 그 안쪽 호로 네 방향을 표시해 색만으로 구분하지 않는다.
// 이웃한 가치는 비슷하고 맞은편 가치는 서로 당긴다는 원형 구조가 한눈에 보이게 하는 그림이다. 정확한 값은 결과지의 막대 목록이 맡는다.
import { esc } from '../../assets/js/ui.js';
import { VALUES, VALUE_ORDER, GROUPS, GROUP_ORDER } from './items.js';
import { GROUP_COLOR } from './content.js';

const OPACITY = { core: 1, mid: 0.5, low: 0.22 };
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

// values: { sd: { score, rank, tier }, ... }
export function valueWheel(values, { size = 300, labels = true, title = '' } = {}) {
  const pad = labels ? 44 : 4;
  const W = size + pad * 2;
  const c = W / 2;
  const R = size * 0.44;
  const r0 = size * 0.1;
  const n = VALUE_ORDER.length;
  const step = (Math.PI * 2) / n;
  const gap = 0.025;
  const start = -Math.PI / 2 - step / 2; // 첫 가치(공존)가 12시 가운데에 오게
  const rad = (v) => r0 + (R - r0) * Math.sqrt(Math.max(0, Math.min(100, Number(v) || 0)) / 100);

  const rings = [25, 50, 75, 100].map((v) => `<circle class="vw-ring" cx="${f(c)}" cy="${f(c)}" r="${f(rad(v))}"/>`).join('');
  const marks = [];
  const names = [];
  const petals = VALUE_ORDER.map((k, i) => {
    const v = values[k] || { score: 0, tier: 'mid' };
    const a0 = start + i * step + gap;
    const a1 = start + (i + 1) * step - gap;
    const am = (a0 + a1) / 2;
    const r1 = Math.max(r0 + 2, rad(v.score));
    if (v.tier === 'core') {
      const [x, y] = pt(c, c, Math.max(r0 + size * 0.05, r1 - size * 0.055), am);
      marks.push(`<g class="vw-rank"><circle cx="${f(x)}" cy="${f(y)}" r="${f(size * 0.04)}"/><text x="${f(x)}" y="${f(y + size * 0.015)}" text-anchor="middle">${v.rank}</text></g>`);
    }
    if (labels) {
      const [x, y] = pt(c, c, R + size * 0.1, am);
      const cos = Math.cos(am);
      const sin = Math.sin(am);
      const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
      const dy = sin > 0.6 ? 12 : sin < -0.6 ? -2 : 5;
      names.push(`<text class="vw-name ${v.tier === 'core' ? 'is-core' : ''}" x="${f(x)}" y="${f(y + dy)}" text-anchor="${anchor}">${esc(VALUES[k].name)}</text>`);
    }
    return `<path class="vw-petal" d="${wedge(c, c, r0, r1, a0, a1)}" fill="${GROUP_COLOR[VALUES[k].group]}" fill-opacity="${OPACITY[v.tier] || 0.5}"><title>${esc(VALUES[k].name)} ${Number(v.score) || 0}점${v.rank ? `, ${v.rank}위` : ''}</title></path>`;
  }).join('');

  // 네 방향 호: 원형 차례에서 연속한 가치 묶음
  const bands = GROUP_ORDER.map((g) => {
    const idx = GROUPS[g].values.map((k) => VALUE_ORDER.indexOf(k)).sort((a, b) => a - b);
    const a0 = start + idx[0] * step + gap;
    const a1 = start + (idx[idx.length - 1] + 1) * step - gap;
    return `<path class="vw-band" d="${arc(c, c, R + size * 0.045, a0, a1)}" stroke="${GROUP_COLOR[g]}"><title>${esc(GROUPS[g].name)}</title></path>`;
  }).join('');

  return `<svg class="vw" viewBox="0 0 ${f(W)} ${f(W)}" role="img" aria-label="${esc(title || '열 가지 가치 원형')}">
    <title>${esc(title || '열 가지 가치 원형')}</title>
    <circle class="vw-bg" cx="${f(c)}" cy="${f(c)}" r="${f(R)}"/>
    ${rings}<g class="vw-petals">${petals}</g>${bands}
    <circle class="vw-core" cx="${f(c)}" cy="${f(c)}" r="${f(r0 - 3)}"/>
    ${marks.join('')}${names.join('')}
  </svg>`;
}
