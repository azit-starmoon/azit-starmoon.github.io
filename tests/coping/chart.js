// AZIT : Star&Moon — 대처 꽃잎 (여덟 가지 대처)
// 꽃잎 넓이가 점수에 비례하도록 반지름은 제곱근으로. 색은 무리(문제 다루기, 마음 다루기, 물러서기)이고,
// 꽃잎마다 이름과 점수를 직접 적어 색만으로 구분하지 않는다.
import { esc } from '../../assets/js/ui.js';
import { STRATEGIES, STRATEGY_ORDER } from './items.js';
import { GROUP_COLOR } from './content.js';

const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const f1 = (n) => n.toFixed(1);

export function copeRose(strategies, { size = 300, labels = true, center = null, centerLabel = '다가가기', title = '' } = {}) {
  const padX = labels ? 78 : 6;
  const padY = labels ? 30 : 6;
  const W = size + padX * 2;
  const H = size + padY * 2;
  const cx = W / 2;
  const cy = H / 2;
  const R = size * 0.46;
  const n = STRATEGY_ORDER.length;
  const step = (Math.PI * 2) / n;
  const mid = (i) => -Math.PI / 2 + i * step;
  const p = (a, r) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const rings = [0.5, 1].map((k) => `<circle class="cr-ring" cx="${cx}" cy="${cy}" r="${f1(R * Math.sqrt(k))}"/>`).join('');
  const wedges = STRATEGY_ORDER.map((k, i) => {
    const v = clamp(strategies[k] && strategies[k].score);
    const r = R * Math.max(0.1, Math.sqrt(v / 100));
    const [x0, y0] = p(mid(i) - step / 2, r);
    const [x1, y1] = p(mid(i) + step / 2, r);
    return `<path class="cr-wedge" d="M${f1(cx)},${f1(cy)} L${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 0 1 ${f1(x1)},${f1(y1)} Z" fill="${GROUP_COLOR[STRATEGIES[k].group]}"/>`;
  }).join('');
  const core = center == null ? `<circle class="cr-core" cx="${cx}" cy="${cy}" r="${f1(size * 0.06)}"/>`
    : `<circle class="cr-core" cx="${cx}" cy="${cy}" r="${f1(size * 0.12)}"/>
      <text class="cr-total" x="${cx}" y="${f1(cy + size * 0.03)}" text-anchor="middle">${clamp(center)}</text>
      <text class="cr-total-lab" x="${cx}" y="${f1(cy + size * 0.078)}" text-anchor="middle">${esc(centerLabel)}</text>`;
  const labelSvg = labels ? STRATEGY_ORDER.map((k, i) => {
    const a = mid(i);
    let [x, y] = p(a, R + 14);
    const c = Math.cos(a);
    const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
    const sn = Math.sin(a);
    if (sn < -0.9) y -= 4;
    else if (sn > 0.9) y += 14;
    else y += 5;
    const v = clamp(strategies[k] && strategies[k].score);
    return `<text class="cr-lab" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}"><tspan class="cr-lab-name">${esc(STRATEGIES[k].name)}</tspan><tspan class="cr-lab-val" dx="5">${v}</tspan></text>`;
  }).join('') : '';
  const desc = STRATEGY_ORDER.map((k) => `${STRATEGIES[k].name} ${clamp(strategies[k] && strategies[k].score)}`).join(', ');
  return `<svg class="cr" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `여덟 가지 대처: ${desc}`)}">
    <title>${esc(title || '대처 꽃잎')}</title>
    ${rings}<g class="cr-wedges">${wedges}</g>${core}${labelSvg}
  </svg>`;
}
