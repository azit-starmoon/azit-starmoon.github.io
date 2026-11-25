// AZIT : Star&Moon — 감정을 다루는 힘 육각형
// 한 사람의 여섯 갈래를 한 색으로 그린다(계열이 하나라 범례 대신 꼭짓점마다 이름과 점수를 적는다).
// 꼭짓점 차례는 감정이 생겨서 행동으로 이어지는 흐름: 위에서 시계 방향으로 알아차림 → 이해 → 받아들임 → 충동 다스리기 → 목표 지키기 → 조절 방법.
import { esc } from '../../assets/js/ui.js';
import { SKILLS, SKILL_ORDER } from './items.js';

const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const f1 = (n) => n.toFixed(1);

export function skillHex(skills, { size = 300, total = null, labels = true, title = '' } = {}) {
  const padX = labels ? 74 : 6;
  const padY = labels ? 26 : 6;
  const W = size + padX * 2;
  const H = size + padY * 2;
  const cx = W / 2;
  const cy = H / 2;
  const R = size * 0.46;
  const ang = (i) => -Math.PI / 2 + (i * Math.PI) / 3;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const poly = (r) => SKILL_ORDER.map((_, i) => pt(i, r).map(f1).join(',')).join(' ');

  const grid = [0.25, 0.5, 0.75, 1].map((k) => `<polygon class="eh-grid${k === 1 ? ' eh-grid--outer' : ''}" points="${poly(R * k)}"/>`).join('');
  const spokes = SKILL_ORDER.map((_, i) => { const [x, y] = pt(i, R); return `<line class="eh-spoke" x1="${cx}" y1="${cy}" x2="${f1(x)}" y2="${f1(y)}"/>`; }).join('');
  const vals = SKILL_ORDER.map((k) => clamp(skills[k] && skills[k].score));
  const dataPts = vals.map((v, i) => pt(i, R * Math.max(0.04, v / 100)));
  const shape = `<polygon class="eh-shape" points="${dataPts.map((p) => p.map(f1).join(',')).join(' ')}"/>`;
  const dots = dataPts.map(([x, y]) => `<circle class="eh-dot" cx="${f1(x)}" cy="${f1(y)}" r="4.5"/>`).join('');
  const core = total == null ? ''
    : `<circle class="eh-core" cx="${cx}" cy="${cy}" r="${f1(size * 0.12)}"/>
      <text class="eh-total" x="${cx}" y="${f1(cy + size * 0.03)}" text-anchor="middle">${clamp(total)}</text>
      <text class="eh-total-lab" x="${cx}" y="${f1(cy + size * 0.078)}" text-anchor="middle">다루는 힘</text>`;
  const labelSvg = labels ? SKILL_ORDER.map((k, i) => {
    let [x, y] = pt(i, R + 14);
    let anchor = 'middle';
    if (i === 1 || i === 2) anchor = 'start';
    if (i === 4 || i === 5) anchor = 'end';
    if (i === 0) y -= 6;
    if (i === 3) y += 14;
    if (i === 1 || i === 5) y -= 2;
    if (i === 2 || i === 4) y += 10;
    return `<text class="eh-lab" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}"><tspan class="eh-lab-name">${esc(SKILLS[k].name)}</tspan><tspan class="eh-lab-val" dx="5">${vals[i]}</tspan></text>`;
  }).join('') : '';
  const desc = SKILL_ORDER.map((k, i) => `${SKILLS[k].name} ${vals[i]}`).join(', ');
  return `<svg class="eh" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `감정을 다루는 여섯 갈래: ${desc}`)}">
    <title>${esc(title || '감정을 다루는 힘 육각형')}</title>
    ${grid}${spokes}${shape}${dots}${core}${labelSvg}
  </svg>`;
}
