// AZIT : Star&Moon — 초민감성 검사 그림
// 1) 네 갈래 꽃: 꽃잎 넓이가 점수에 비례(길이는 제곱근), 가운데는 전체 민감성. 꽃잎마다 이름을 글자로도 적는다.
// 2) 요즘 상태 지도: 가로 회복 자원, 세로 부담 신호. 네 칸에 상태 이름을 적고, 지금 칸만 옅게 칠한다.
import { esc } from '../../assets/js/ui.js';
import { FACETS, FACET_ORDER } from './items.js';
import { FACET_COLOR } from './content.js';

let uid = 0;
const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const ANGLE = { d: -90, o: 0, e: 90, s: 180 }; // 위, 오른쪽, 아래, 왼쪽
const f1 = (n) => n.toFixed(1);

// facets: { d: { score }, ... }
export function sensFlower(facets, { size = 300, total = null, labels = true, title = '' } = {}) {
  const pad = labels ? 64 : 6;
  const W = size + pad * 2;
  const H = size + (labels ? 44 : 12);
  const cx = W / 2;
  const cy = H / 2;
  const R = size * 0.46;
  const rings = [0.5, 1].map((k) => `<circle class="hf-ring" cx="${cx}" cy="${cy}" r="${f1(R * Math.sqrt(k))}"/>`).join('');
  const petals = FACET_ORDER.map((f) => {
    const v = clamp(facets[f] && facets[f].score);
    const L = R * Math.max(0.16, Math.sqrt(v / 100));
    const a = ANGLE[f];
    const rad = (a * Math.PI) / 180;
    const ex = cx + (L / 2) * Math.cos(rad);
    const ey = cy + (L / 2) * Math.sin(rad);
    return `<ellipse class="hf-petal" cx="${f1(ex)}" cy="${f1(ey)}" rx="${f1(L / 2)}" ry="${f1(L * 0.3)}" transform="rotate(${a} ${f1(ex)} ${f1(ey)})" fill="${FACET_COLOR[f]}"/>`;
  }).join('');
  const core = total == null ? `<circle class="hf-core" cx="${cx}" cy="${cy}" r="${f1(size * 0.07)}"/>`
    : `<circle class="hf-core" cx="${cx}" cy="${cy}" r="${f1(size * 0.13)}"/>
      <text class="hf-total" x="${cx}" y="${f1(cy + size * 0.035)}" text-anchor="middle">${clamp(total)}</text>
      <text class="hf-total-lab" x="${cx}" y="${f1(cy + size * 0.085)}" text-anchor="middle">민감성</text>`;
  const labelsSvg = labels ? FACET_ORDER.map((f) => {
    const a = (ANGLE[f] * Math.PI) / 180;
    const r = R + 16;
    let x = cx + r * Math.cos(a);
    let y = cy + r * Math.sin(a);
    let anchor = 'middle';
    if (f === 'o') { anchor = 'start'; y += 4; }
    if (f === 's') { anchor = 'end'; y += 4; }
    if (f === 'd') y -= 4;
    if (f === 'e') y += 14;
    const v = clamp(facets[f] && facets[f].score);
    return `<text class="hf-lab" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}"><tspan class="hf-lab-name">${esc(FACETS[f].name)}</tspan><tspan class="hf-lab-val" dx="5">${v}</tspan></text>`;
  }).join('') : '';
  const desc = FACET_ORDER.map((f) => `${FACETS[f].name} ${clamp(facets[f] && facets[f].score)}`).join(', ');
  return `<svg class="hf" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `네 갈래 민감성: ${desc}`)}">
    <title>${esc(title || '네 갈래 민감성')}</title>
    ${rings}<g class="hf-petals">${petals}</g>${core}${labelsSvg}
  </svg>`;
}

const STATE_NAME = { overload: '과부하', holding: '버티는 중', bloom: '잘 피어나는 중', dry: '채움이 필요함' };

// load: 부담 신호(세로, 위로 갈수록 큼), rest: 회복 자원(가로, 오른쪽으로 갈수록 큼)
export function stateMap(load, rest, { size = 300, state = '', title = '' } = {}) {
  const padL = 30;
  const padB = 30;
  const S = size - padL;
  const W = padL + S + 4;
  const H = S + padB + 4;
  const x0 = padL;
  const y0 = 4;
  const h = S / 2;
  const inset = 16;
  const X = (v) => x0 + inset + ((S - 2 * inset) * clamp(v)) / 100;
  const Y = (v) => y0 + inset + (S - 2 * inset) * (1 - clamp(v) / 100);
  const quads = [
    ['overload', x0, y0, 'start', x0 + 12, y0 + 22],
    ['holding', x0 + h, y0, 'end', x0 + S - 12, y0 + 22],
    ['dry', x0, y0 + h, 'start', x0 + 12, y0 + S - 13],
    ['bloom', x0 + h, y0 + h, 'end', x0 + S - 12, y0 + S - 13],
  ];
  const cells = quads.map(([k, x, y]) => `<rect class="hs-cell ${k === state ? 'is-on' : ''}" x="${f1(x)}" y="${f1(y)}" width="${f1(h)}" height="${f1(h)}"/>`).join('');
  const names = quads.map(([k, , , anchor, tx, ty]) => `<text class="hs-q ${k === state ? 'is-on' : ''}" x="${f1(tx)}" y="${f1(ty)}" text-anchor="${anchor}">${STATE_NAME[k]}</text>`).join('');
  const cid = `hs-clip-${++uid}`;
  const px = X(rest);
  const py = Y(load);
  return `<svg class="hs" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `요즘 상태: 부담 신호 ${clamp(load)}, 회복 자원 ${clamp(rest)}`)}">
    <title>${esc(title || '요즘 상태 지도')}</title>
    <rect class="hs-bg" x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/>
    <clipPath id="${cid}"><rect x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/></clipPath>
    <g clip-path="url(#${cid})">${cells}</g>
    <line class="hs-cross" x1="${f1(x0 + h)}" y1="${y0}" x2="${f1(x0 + h)}" y2="${f1(y0 + S)}"/>
    <line class="hs-cross" x1="${x0}" y1="${f1(y0 + h)}" x2="${f1(x0 + S)}" y2="${f1(y0 + h)}"/>
    <rect class="hs-frame" x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/>
    ${names}
    <circle class="hs-dot" cx="${f1(px)}" cy="${f1(py)}" r="8"/>
    <text class="hs-ax" x="${f1(x0 + S / 2)}" y="${f1(y0 + S + 22)}" text-anchor="middle">회복 자원 →</text>
    <text class="hs-ax" x="${f1(x0 - 12)}" y="${f1(y0 + S / 2)}" text-anchor="middle" transform="rotate(-90 ${f1(x0 - 12)} ${f1(y0 + S / 2)})">부담 신호 →</text>
  </svg>`;
}
