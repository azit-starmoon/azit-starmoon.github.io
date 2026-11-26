// AZIT : Star&Moon — 기질과 성품 꽃잎
// 오른쪽 네 꽃잎은 기질(자극 추구, 위험 회피, 사회적 민감성, 인내력), 왼쪽 세 꽃잎은 성품(자율성, 연대감, 자기 초월).
// 꽃잎 넓이가 점수에 비례하도록 반지름은 제곱근으로. 색은 두 묶음만 나누고, 꽃잎마다 이름과 점수를 직접 적어
// 색만으로 구분하지 않는다. 고리·꽃잎 모양은 대처 꽃잎(cr-*) 스타일을 같이 쓴다.
import { esc } from '../../assets/js/ui.js';
import { DIMS, DIM_ORDER } from './items.js';

export const GROUP_COLOR = { temp: '#2a78d6', char: '#1baf7a' };

const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const f1 = (n) => n.toFixed(1);

export function tcRose(dims, { size = 300, labels = true, title = '' } = {}) {
  const padX = labels ? 100 : 6;
  const padY = labels ? 30 : 6;
  const W = size + padX * 2;
  const H = size + padY * 2;
  const cx = W / 2;
  const cy = H / 2;
  const R = size * 0.46;
  const n = DIM_ORDER.length;
  const step = (Math.PI * 2) / n;
  // 기질 네 꽃잎이 오른쪽 반, 성품 세 꽃잎이 왼쪽 반에 오도록 시작각을 정한다
  const start = -Math.PI / 2 - (step * 4 - Math.PI) / 2;
  const mid = (i) => start + (i + 0.5) * step;
  const p = (a, r) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const rings = [0.5, 1].map((k) => `<circle class="cr-ring" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R * Math.sqrt(k))}"/>`).join('');
  const wedges = DIM_ORDER.map((k, i) => {
    const v = clamp(dims[k] && dims[k].score);
    const r = R * Math.max(0.1, Math.sqrt(v / 100));
    const [x0, y0] = p(mid(i) - step / 2, r);
    const [x1, y1] = p(mid(i) + step / 2, r);
    return `<path class="cr-wedge" d="M${f1(cx)},${f1(cy)} L${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 0 1 ${f1(x1)},${f1(y1)} Z" fill="${GROUP_COLOR[DIMS[k].group]}"/>`;
  }).join('');
  const core = `<circle class="cr-core" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(size * 0.06)}"/>`;
  const labelSvg = labels ? DIM_ORDER.map((k, i) => {
    const a = mid(i);
    let [x, y] = p(a, R + 12);
    const c = Math.cos(a);
    const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
    const sn = Math.sin(a);
    if (sn < -0.9) y -= 4;
    else if (sn > 0.75) y += 12;
    else y += 5;
    const v = clamp(dims[k] && dims[k].score);
    return `<text class="cr-lab" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}"><tspan class="cr-lab-name">${esc(DIMS[k].name)}</tspan><tspan class="cr-lab-val" dx="5">${v}</tspan></text>`;
  }).join('') : '';
  const desc = DIM_ORDER.map((k) => `${DIMS[k].name} ${clamp(dims[k] && dims[k].score)}`).join(', ');
  return `<svg class="cr tcr" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `기질과 성품: ${desc}`)}">
    <title>${esc(title || '기질과 성품 꽃잎')}</title>
    ${rings}<g class="cr-wedges">${wedges}</g>${core}${labelSvg}
  </svg>`;
}
