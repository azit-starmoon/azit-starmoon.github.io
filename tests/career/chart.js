// AZIT : Star&Moon — 진로 흥미 그림
// 흥미 육각형: 여섯 유형을 육각형 꼭짓점에 육각형 차례(R I A S E C, 12시부터 시계 방향)로 두고,
// 점수(0~100)를 가운데에서 꼭짓점까지의 거리로 찍어 이은 다각형. 다각형은 한 가지 색으로 옅게 칠한다.
// 꼭짓점의 점은 유형 색, 코드 세 유형은 크게 찍고 순위 번호를 단다. 바깥에는 유형 글자와 이름을 글자로 적어 색만으로 구분하지 않는다.
// 이웃한 유형은 비슷하고 맞은편 유형은 멀다는 육각형 구조와 흥미가 쏠린 방향이 한눈에 보이게 하는 그림이다. 정확한 값은 결과지의 막대 목록이 맡는다.
import { esc } from '../../assets/js/ui.js';
import { TYPES, TYPE_ORDER } from './items.js';
import { TYPE_COLOR } from './content.js';

const f = (n) => n.toFixed(1);

// types: { r: { score, rank }, ... }
export function interestHex(types, { size = 300, labels = true, title = '' } = {}) {
  const pad = labels ? 46 : 8;
  const W = size + pad * 2;
  const H = W;
  const c = W / 2;
  const R = size * 0.46;
  const ang = (k) => -Math.PI / 2 + (k * Math.PI) / 3;
  const at = (k, v) => [c + R * (v / 100) * Math.cos(ang(k)), c + R * (v / 100) * Math.sin(ang(k))];
  const val = (t) => Math.max(0, Math.min(100, Number((types[t] || {}).score) || 0));
  const poly = (v) => TYPE_ORDER.map((_, k) => at(k, v).map(f).join(',')).join(' ');

  const grid = [25, 50, 75, 100].map((v) => `<polygon class="ih-grid${v === 100 ? ' is-outer' : ''}" points="${poly(v)}"/>`).join('');
  const spokes = TYPE_ORDER.map((_, k) => { const [x, y] = at(k, 100); return `<line class="ih-spoke" x1="${f(c)}" y1="${f(c)}" x2="${f(x)}" y2="${f(y)}"/>`; }).join('');
  const shape = TYPE_ORDER.map((t, k) => at(k, val(t)).map(f).join(',')).join(' ');

  const dots = [];
  const names = [];
  TYPE_ORDER.forEach((t, k) => {
    const T = types[t] || {};
    const top = T.rank && T.rank <= 3;
    const [x, y] = at(k, val(t));
    dots.push(`<circle class="ih-dot${top ? ' is-top' : ''}" cx="${f(x)}" cy="${f(y)}" r="${f(size * (top ? 0.03 : 0.019))}" fill="${TYPE_COLOR[t]}"><title>${esc(TYPES[t].letter)} ${esc(TYPES[t].name)} ${val(t)}점${T.rank ? `, ${T.rank}위` : ''}</title></circle>`);
    if (labels) {
      const a = ang(k);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const [lx, ly] = [c + (R + size * 0.08) * cos, c + (R + size * 0.08) * sin];
      const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
      const dy = sin > 0.6 ? 14 : sin < -0.6 ? -4 : 5;
      names.push(`<text class="ih-name${top ? ' is-top' : ''}" x="${f(lx)}" y="${f(ly + dy)}" text-anchor="${anchor}">${top ? `<tspan class="ih-rk">${T.rank}</tspan> ` : ''}<tspan class="ih-letter">${esc(TYPES[t].letter)}</tspan> ${esc(TYPES[t].short)}</text>`);
    }
  });

  const label = title || '여섯 흥미 육각형';
  return `<svg class="ih" viewBox="0 0 ${f(W)} ${f(H)}" role="img" aria-label="${esc(label)}">
    <title>${esc(label)}</title>
    <polygon class="ih-bg" points="${poly(100)}"/>
    ${grid}${spokes}
    <polygon class="ih-shape" points="${shape}"/>
    ${dots.join('')}${names.join('')}
  </svg>`;
}
