// AZIT : Star&Moon — 애착 지도 (가로: 회피, 세로: 불안)
// 네 칸의 옅은 색은 유형, 별은 관계 전반, 동그라미는 관계별 자리. 이름은 늘 글자로도 적어 색만으로 구분하지 않는다.
import { esc } from '../../assets/js/ui.js';
import { STYLE_COLOR } from './content.js';

const NAMES = { secure: '안정형', anxious: '불안형', fearful: '두려움-회피형', avoidant: '회피형' };
let uid = 0;
const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const starPath = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
};

// points: [{ x: 회피, y: 불안, label, main }]
export function attachMap(points, { size = 320, quadLabels = true, axis = true, labels = true, title = '', mark = 1 } = {}) {
  const padL = axis ? 30 : 4;
  const padB = axis ? 28 : 4;
  const padT = 4;
  const padR = 4;
  const S = size - Math.max(padL + padR, padT + padB);
  const x0 = padL;
  const y0 = padT;
  const h = S / 2;
  const inset = Math.round(S * 0.04) + 8 * mark; // 끝값(0, 100)도 틀 안쪽에 온전히 보이도록
  const X = (v) => x0 + inset + ((S - 2 * inset) * clamp(v)) / 100;
  const Y = (v) => y0 + inset + (S - 2 * inset) * (1 - clamp(v) / 100);
  const W = padL + S + padR;
  const H = padT + S + padB;

  const quads = [
    ['anxious', x0, y0], ['fearful', x0 + h, y0],
    ['secure', x0, y0 + h], ['avoidant', x0 + h, y0 + h],
  ];
  const cid = `am-clip-${++uid}`;
  const tints = `<clipPath id="${cid}"><rect x="${x0}" y="${y0}" width="${S}" height="${S}" rx="12"/></clipPath>
    <g clip-path="url(#${cid})">${quads.map(([k, x, y]) => `<rect x="${x}" y="${y}" width="${h}" height="${h}" fill="${STYLE_COLOR[k]}" fill-opacity=".1"/>`).join('')}</g>`;
  const marks = points.map((p) => ({ x: X(p.x), y: Y(p.y), r: (p.main ? 11 : 7) * mark }));
  const placed = [];
  const covers = (b) => marks.some((m) => m.x > b.x1 - m.r - 2 && m.x < b.x2 + m.r + 2 && m.y > b.y1 - m.r - 2 && m.y < b.y2 + m.r + 2);
  const CAND = {
    anxious: [[x0 + 10, y0 + 18, 'start'], [x0 + 10, y0 + h - 10, 'start'], [x0 + h - 10, y0 + 18, 'end']],
    fearful: [[x0 + S - 10, y0 + 18, 'end'], [x0 + S - 10, y0 + h - 10, 'end'], [x0 + h + 10, y0 + 18, 'start']],
    secure: [[x0 + 10, y0 + S - 11, 'start'], [x0 + 10, y0 + h + 20, 'start'], [x0 + h - 10, y0 + S - 11, 'end']],
    avoidant: [[x0 + S - 10, y0 + S - 11, 'end'], [x0 + S - 10, y0 + h + 20, 'end'], [x0 + h + 10, y0 + S - 11, 'start']],
  };
  const qlabels = quadLabels
    ? Object.entries(CAND).map(([k, cands]) => {
      const w = NAMES[k].length * 11.5 + 12;
      const boxes = cands.map(([x, y, anchor]) => ({ x, y, anchor, x1: anchor === 'start' ? x - 2 : x - w, x2: anchor === 'start' ? x + w : x + 2, y1: y - 12, y2: y + 3 }));
      const b = boxes.find((c) => !covers(c)) || boxes[0];
      placed.push(b);
      const dotX = b.anchor === 'start' ? b.x + 3 : b.x - 3;
      const tx = b.anchor === 'start' ? b.x + 10 : b.x - 10;
      return `<circle cx="${dotX.toFixed(1)}" cy="${(b.y - 4).toFixed(1)}" r="3.5" fill="${STYLE_COLOR[k]}"/><text class="am-q" x="${tx.toFixed(1)}" y="${b.y.toFixed(1)}" text-anchor="${b.anchor}">${NAMES[k]}</text>`;
    }).join('')
    : '';
  const axes = axis
    ? `<text class="am-ax" x="${x0 + S / 2}" y="${y0 + S + 20}" text-anchor="middle">회피 →</text>
       <text class="am-ax" x="${x0 - 12}" y="${y0 + S / 2}" text-anchor="middle" transform="rotate(-90 ${x0 - 12} ${y0 + S / 2})">불안 →</text>
       <text class="am-tick" x="${x0}" y="${y0 + S + 20}" text-anchor="start">낮음</text>
       <text class="am-tick" x="${x0 + S}" y="${y0 + S + 20}" text-anchor="end">높음</text>`
    : '';

  // 이름표가 서로나 점, 사분면 이름과 겹치지 않게 자리를 고른다
  const hit = (b) => placed.some((o) => !(b.x2 < o.x1 || b.x1 > o.x2 || b.y2 < o.y1 || b.y1 > o.y2))
    || marks.some((m) => m.x > b.x1 - m.r && m.x < b.x2 + m.r && m.y > b.y1 - m.r && m.y < b.y2 + m.r);
  const tags = labels
    ? points.map((p, i) => {
      if (!p.label) return '';
      const m = marks[i];
      const w = String(p.label).length * 11.5 + 6;
      const opts = [[1, 0], [-1, 0], [1, 15], [1, -15], [-1, 15], [-1, -15], [1, 28], [-1, -28]];
      let best = null;
      for (const [side, dy] of opts) {
        const gap = m.r + 4;
        const x1 = side > 0 ? m.x + gap : m.x - gap - w;
        const b = { x1, x2: x1 + w, y1: m.y + dy - 9, y2: m.y + dy + 7, side, dy };
        if (b.x1 < x0 + 2 || b.x2 > x0 + S - 2 || b.y1 < y0 + 2 || b.y2 > y0 + S - 2) continue;
        if (!hit(b)) { best = b; break; }
        if (!best) best = b;
      }
      if (!best) return '';
      placed.push(best);
      const tx = best.side > 0 ? best.x1 + 3 : best.x2 - 3;
      return `<text class="am-tag${p.main ? ' am-tag--main' : ''}" x="${tx.toFixed(1)}" y="${(m.y + best.dy + 4).toFixed(1)}" text-anchor="${best.side > 0 ? 'start' : 'end'}">${esc(p.label)}</text>`;
    }).join('')
    : '';

  const dots = points
    .map((p, i) => (p.main ? '' : `<circle class="am-dot" cx="${marks[i].x.toFixed(1)}" cy="${marks[i].y.toFixed(1)}" r="${(6 * mark).toFixed(1)}"/>`))
    .join('');
  const stars = points
    .map((p, i) => (p.main ? `<path class="am-star" d="${starPath(marks[i].x, marks[i].y, 11 * mark)}"/>` : ''))
    .join('');

  return `<svg class="am" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
    ${title ? `<title>${esc(title)}</title>` : ''}
    <rect class="am-bg" x="${x0}" y="${y0}" width="${S}" height="${S}" rx="12"/>
    ${tints}
    <rect class="am-frame" x="${x0}" y="${y0}" width="${S}" height="${S}" rx="12"/>
    <line class="am-cross" x1="${x0 + h}" y1="${y0}" x2="${x0 + h}" y2="${y0 + S}"/>
    <line class="am-cross" x1="${x0}" y1="${y0 + h}" x2="${x0 + S}" y2="${y0 + h}"/>
    ${qlabels}${axes}${dots}${stars}${tags}
  </svg>`;
}
