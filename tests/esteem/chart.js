// AZIT : Star&Moon — 자존감 지도
// 세로: 자기 가치감(위로 갈수록 높음), 가로: 조건에 기대는 정도(오른쪽으로 갈수록 많이 기댐).
// 네 자리에 이름을 적고, 지금 자리만 옅게 칠한다(색만으로 구분하지 않는다).
import { esc } from '../../assets/js/ui.js';
import { MAP_LINE } from './scoring.js';

let uid = 0;
const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const f1 = (n) => n.toFixed(1);
const NAMES = { secure: '단단한 자존감', contingent: '조건에 기댄 자존감', shaken: '흔들리는 자존감', quiet: '지쳐 낮아진 자존감' };

export function esteemMap(worth, lean, { size = 300, type = '', labels = true, title = '' } = {}) {
  const padL = labels ? 30 : 4;
  const padB = labels ? 30 : 4;
  const S = size - padL;
  const W = padL + S + 4;
  const H = S + padB + 4;
  const x0 = padL;
  const y0 = 4;
  const inset = 16;
  const X = (v) => x0 + inset + ((S - 2 * inset) * clamp(v)) / 100;
  const Y = (v) => y0 + inset + (S - 2 * inset) * (1 - clamp(v) / 100);
  const mx = X(MAP_LINE);
  const my = Y(MAP_LINE);
  const cells = [
    ['secure', x0, y0, mx - x0, my - y0],
    ['contingent', mx, y0, x0 + S - mx, my - y0],
    ['quiet', x0, my, mx - x0, y0 + S - my],
    ['shaken', mx, my, x0 + S - mx, y0 + S - my],
  ];
  const cid = `em-clip-${++uid}`;
  const tints = cells.map(([k, x, y, w, h]) => `<rect class="em-cell ${k === type ? 'is-on' : ''}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/>`).join('');
  const names = labels ? [
    ['secure', x0 + 12, y0 + 22, 'start'],
    ['contingent', x0 + S - 12, y0 + 22, 'end'],
    ['quiet', x0 + 12, y0 + S - 13, 'start'],
    ['shaken', x0 + S - 12, y0 + S - 13, 'end'],
  ].map(([k, x, y, a]) => `<text class="em-q ${k === type ? 'is-on' : ''}" x="${f1(x)}" y="${f1(y)}" text-anchor="${a}">${NAMES[k]}</text>`).join('') : '';
  const axes = labels ? `<text class="em-ax" x="${f1(x0 + S / 2)}" y="${f1(y0 + S + 22)}" text-anchor="middle">조건에 기대는 정도 →</text>
    <text class="em-ax" x="${f1(x0 - 12)}" y="${f1(y0 + S / 2)}" text-anchor="middle" transform="rotate(-90 ${f1(x0 - 12)} ${f1(y0 + S / 2)})">자기 가치감 →</text>` : '';
  return `<svg class="em" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `자존감 지도: 자기 가치감 ${clamp(worth)}, 조건에 기대는 정도 ${clamp(lean)}`)}">
    <title>${esc(title || '자존감 지도')}</title>
    <rect class="em-bg" x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/>
    <clipPath id="${cid}"><rect x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/></clipPath>
    <g clip-path="url(#${cid})">${tints}</g>
    <line class="em-cross" x1="${f1(mx)}" y1="${y0}" x2="${f1(mx)}" y2="${f1(y0 + S)}"/>
    <line class="em-cross" x1="${x0}" y1="${f1(my)}" x2="${f1(x0 + S)}" y2="${f1(my)}"/>
    <rect class="em-frame" x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/>
    ${names}
    <circle class="em-dot" cx="${f1(X(lean))}" cy="${f1(Y(worth))}" r="${labels ? 8 : 10}"/>
    ${axes}
  </svg>`;
}
