// AZIT : Star&Moon — 생애 이야기 그림
// 이야기 책장: 이야기의 결 네 가지를 책등 높이로(막대와 같다). 책등 아래에 이름과 점수를 직접 적어 색만으로 구분하지 않는다.
// 의미 지도: 의미를 느끼는 정도(세로)와 찾는 정도(가로). 자존감 지도(em-*) 스타일을 같이 쓴다.
import { esc } from '../../assets/js/ui.js';
import { THEMES, THEME_ORDER } from './items.js';
import { THEME_COLOR } from './content.js';
import { MAP_LINE } from './scoring.js';

let uid = 0;
const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const f1 = (n) => n.toFixed(1);

export function storyShelf(themes, { size = 300, labels = true, title = '' } = {}) {
  const W = size;
  const top = 8;
  const shelfY = labels ? size * 0.72 : size * 0.86;
  const H = labels ? shelfY + 46 : size;
  const n = THEME_ORDER.length;
  const padX = size * 0.08;
  const slot = (W - padX * 2) / n;
  const bw = slot * 0.62;
  const maxH = shelfY - top - 6;
  const books = THEME_ORDER.map((k, i) => {
    const v = clamp(themes[k] && themes[k].score);
    const h = Math.max(maxH * 0.08, (maxH * v) / 100);
    const x = padX + slot * i + (slot - bw) / 2;
    const y = shelfY - h;
    const band = h > 34 ? `<rect class="ls-band" x="${f1(x + 5)}" y="${f1(y + 12)}" width="${f1(bw - 10)}" height="5" rx="2"/>` : '';
    const lab = labels ? `<text class="ls-lab" x="${f1(x + bw / 2)}" y="${f1(shelfY + 20)}" text-anchor="middle">${esc(THEMES[k].name)}</text>
      <text class="ls-val" x="${f1(x + bw / 2)}" y="${f1(shelfY + 38)}" text-anchor="middle">${v}</text>` : '';
    return `<path class="ls-book" d="M${f1(x)},${f1(shelfY)} V${f1(y + 4)} Q${f1(x)},${f1(y)} ${f1(x + 4)},${f1(y)} H${f1(x + bw - 4)} Q${f1(x + bw)},${f1(y)} ${f1(x + bw)},${f1(y + 4)} V${f1(shelfY)} Z" fill="${THEME_COLOR[k]}"/>${band}${lab}`;
  }).join('');
  const desc = THEME_ORDER.map((k) => `${THEMES[k].name} ${clamp(themes[k] && themes[k].score)}`).join(', ');
  return `<svg class="ls" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `이야기의 결: ${desc}`)}">
    <title>${esc(title || '이야기 책장')}</title>
    <line class="ls-guide" x1="${f1(padX * 0.6)}" y1="${f1(shelfY - maxH / 2)}" x2="${f1(W - padX * 0.6)}" y2="${f1(shelfY - maxH / 2)}"/>
    ${books}
    <rect class="ls-shelf" x="${f1(padX * 0.4)}" y="${f1(shelfY)}" width="${f1(W - padX * 0.8)}" height="5" rx="2.5"/>
  </svg>`;
}

const NAMES = { settled: '머무는', deepening: '넓혀 가는', pausing: '멈춰 선', seeking: '찾아 나선' };

export function meaningMap(pr, se, { size = 300, state = '', labels = true, title = '' } = {}) {
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
    ['settled', x0, y0, mx - x0, my - y0],
    ['deepening', mx, y0, x0 + S - mx, my - y0],
    ['pausing', x0, my, mx - x0, y0 + S - my],
    ['seeking', mx, my, x0 + S - mx, y0 + S - my],
  ];
  const cid = `ls-clip-${++uid}`;
  const tints = cells.map(([k, x, y, w, h]) => `<rect class="em-cell ${k === state ? 'is-on' : ''}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/>`).join('');
  const names = labels ? [
    ['settled', x0 + 12, y0 + 22, 'start'],
    ['deepening', x0 + S - 12, y0 + 22, 'end'],
    ['pausing', x0 + 12, y0 + S - 13, 'start'],
    ['seeking', x0 + S - 12, y0 + S - 13, 'end'],
  ].map(([k, x, y, a]) => `<text class="em-q ${k === state ? 'is-on' : ''}" x="${f1(x)}" y="${f1(y)}" text-anchor="${a}">${NAMES[k]}</text>`).join('') : '';
  const axes = labels ? `<text class="em-ax" x="${f1(x0 + S / 2)}" y="${f1(y0 + S + 22)}" text-anchor="middle">의미를 찾는 정도 →</text>
    <text class="em-ax" x="${f1(x0 - 12)}" y="${f1(y0 + S / 2)}" text-anchor="middle" transform="rotate(-90 ${f1(x0 - 12)} ${f1(y0 + S / 2)})">의미를 느끼는 정도 →</text>` : '';
  return `<svg class="em" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `의미 지도: 느끼는 정도 ${clamp(pr)}, 찾는 정도 ${clamp(se)}`)}">
    <title>${esc(title || '의미 지도')}</title>
    <rect class="em-bg" x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/>
    <clipPath id="${cid}"><rect x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/></clipPath>
    <g clip-path="url(#${cid})">${tints}</g>
    <line class="em-cross" x1="${f1(mx)}" y1="${y0}" x2="${f1(mx)}" y2="${f1(y0 + S)}"/>
    <line class="em-cross" x1="${x0}" y1="${f1(my)}" x2="${f1(x0 + S)}" y2="${f1(my)}"/>
    <rect class="em-frame" x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/>
    ${names}
    <circle class="em-dot" cx="${f1(X(se))}" cy="${f1(Y(pr))}" r="${labels ? 8 : 10}"/>
    ${axes}
  </svg>`;
}
