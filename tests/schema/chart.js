// AZIT : Star&Moon — 마음의 규칙 지도 (18가지 도식을 영역별로 둘러 그린 꽃잎 그림)
// 꽃잎 길이는 점수의 제곱근에 비례해서, 넓이가 점수에 비례하게 보인다. 진하기는 수준(강함·작동·약간·낮음).
// 정확한 값은 결과지의 막대 목록이 맡고, 이 그림은 어느 영역이 무거운지를 한눈에 보여 준다.
import { esc } from '../../assets/js/ui.js';
import { SCHEMA_ORDER, SCHEMAS, DOMAINS } from './items.js';
import { DOMAIN_COLOR } from './content.js';

const OPACITY = { strong: 1, active: 0.85, mild: 0.45, low: 0.22 };
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

// schemas: { ab: { score, level }, ... }
export function schemaRose(schemas, { size = 320, title = '' } = {}) {
  const c = size / 2;
  const R = size * 0.42;
  const r0 = size * 0.1;
  const n = SCHEMA_ORDER.length;
  const step = (Math.PI * 2) / n;
  const gap = 0.022;
  const start = -Math.PI / 2 - step / 2;
  const rad = (v) => r0 + (R - r0) * Math.sqrt(Math.max(0, Math.min(100, v)) / 100);

  const rings = [25, 50, 75, 100].map((v) => `<circle class="sr-ring" cx="${c}" cy="${c}" r="${f(rad(v))}"/>`).join('');
  const petals = SCHEMA_ORDER.map((s, i) => {
    const v = schemas[s] || { score: 0, level: 'low' };
    const a0 = start + i * step + gap;
    const a1 = start + (i + 1) * step - gap;
    const color = DOMAIN_COLOR[SCHEMAS[s].d];
    return `<path d="${wedge(c, c, r0, Math.max(r0 + 1.5, rad(v.score)), a0, a1)}" fill="${color}" fill-opacity="${OPACITY[v.level] || 0.3}"><title>${esc(SCHEMAS[s].name)} ${v.score}</title></path>`;
  }).join('');
  // 바깥 테두리에 영역을 표시하는 가는 호
  let idx = 0;
  const bands = DOMAINS.map((d) => {
    const a0 = start + idx * step + gap;
    idx += d.schemas.length;
    const a1 = start + idx * step - gap;
    return `<path class="sr-band" d="${arc(c, c, R + size * 0.035, a0, a1)}" stroke="${DOMAIN_COLOR[d.id]}"/>`;
  }).join('');

  return `<svg class="sr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(title)}">
    ${title ? `<title>${esc(title)}</title>` : ''}
    <circle class="sr-bg" cx="${c}" cy="${c}" r="${f(R)}"/>
    ${rings}${petals}${bands}
    <circle class="sr-core" cx="${c}" cy="${c}" r="${f(r0 - 3)}"/>
  </svg>`;
}
