// AZIT : Star&Moon — 대인관계 원형 지도 (SVG 문자열)
// 여덟 방향을 원 위의 제자리(주도가 위, 다가감이 오른쪽)에 놓고, 점수(0~100)를 반지름으로 이은 모양을 그린다.
// 가운데서 뻗는 화살표는 기우는 방향, 길이는 기울기(amp)다. 기울기가 거의 없으면(고른 모양) 화살표를 그리지 않는다.
import { OCTANTS, OCTANT_ORDER } from './items.js';

const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const rad = (d) => (d * Math.PI) / 180;
let uid = 0;

export function circleMap(octants, { size = 300, angle = null, amp = 0, arrow = true, labels = true, top = '', title = '' } = {}) {
  // 이름표가 좌우로 길어서 가로를 넓힌다(세로는 size 그대로)
  const padY = labels ? 36 : 8;
  const W = size + (labels ? 60 : 0);
  const H = size;
  const cx = W / 2;
  const cy = H / 2;
  const R = H / 2 - padY;
  const P = (deg, r) => [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))];
  const score = (k) => clamp(octants && octants[k] && typeof octants[k] === 'object' ? octants[k].score : octants && octants[k]);
  const rings = [25, 50, 75, 100].map((v) => `<circle class="ip-ring${v === 50 ? ' is-mid' : ''}" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1((R * v) / 100)}"/>`).join('');
  const spokes = OCTANT_ORDER.map((k) => { const [x, y] = P(OCTANTS[k].angle, R); return `<line class="ip-spoke" x1="${f1(cx)}" y1="${f1(cy)}" x2="${f1(x)}" y2="${f1(y)}"/>`; }).join('');
  const pts = OCTANT_ORDER.map((k) => P(OCTANTS[k].angle, (R * score(k)) / 100));
  const poly = `<polygon class="ip-poly" points="${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')}"/>`;
  const dots = OCTANT_ORDER.map((k, i) => `<circle class="ip-dot${k === top ? ' is-top' : ''}" cx="${f1(pts[i][0])}" cy="${f1(pts[i][1])}" r="${k === top ? 5 : 3.5}"><title>${esc(OCTANTS[k].name)} ${score(k)}</title></circle>`).join('');
  let vec = '';
  if (arrow && angle !== null && Number(amp) >= 6) {
    const len = R * Math.max(0.22, Math.min(1, Number(amp) / 40));
    const [x, y] = P(Number(angle), len);
    const [hx1, hy1] = P(Number(angle) + 152, 9);
    const [hx2, hy2] = P(Number(angle) - 152, 9);
    vec = `<g class="ip-vec"><line x1="${f1(cx)}" y1="${f1(cy)}" x2="${f1(x)}" y2="${f1(y)}"/>
      <polygon points="${f1(x)},${f1(y)} ${f1(x + hx1 - cx)},${f1(y + hy1 - cy)} ${f1(x + hx2 - cx)},${f1(y + hy2 - cy)}"/></g>`;
  }
  const names = labels
    ? OCTANT_ORDER.map((k) => {
      const a = OCTANTS[k].angle;
      const [x, y] = P(a, R + 22);
      const c = Math.cos(rad(a));
      const anchor = Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end';
      const dy = Math.sin(rad(a)) > 0.5 ? -2 : Math.sin(rad(a)) < -0.5 ? 10 : 4;
      return `<text class="ip-name${k === top ? ' is-top' : ''}" x="${f1(x + (anchor === 'start' ? -6 : anchor === 'end' ? 6 : 0))}" y="${f1(y + dy)}" text-anchor="${anchor}">${esc(OCTANTS[k].short)}<tspan class="ip-num" dx="4">${score(k)}</tspan></text>`;
    }).join('')
    : '';
  const id = `ip-${++uid}`;
  const label = title || `대인관계 원형 지도: ${OCTANT_ORDER.map((k) => `${OCTANTS[k].name} ${score(k)}`).join(', ')}`;
  return `<svg class="ip" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}">
    <title id="${id}">${esc(label)}</title>
    <circle class="ip-bg" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}"/>
    ${rings}${spokes}${poly}${vec}${dots}${names}
  </svg>`;
}
