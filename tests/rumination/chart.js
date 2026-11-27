// AZIT : Star&Moon — 생각 지도 (SVG 문자열)
// 가로는 돌아보기(오른쪽으로 갈수록 큼), 세로는 곱씹기(위로 갈수록 큼). 가운데 선(50)으로 네 칸을 나눈다.
// 감각처리 민감성 검사의 상태 지도와 같은 꼴과 스타일(hs-*)을 쓴다.
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
let uid = 0;

export const TYPE_SHORT = { circle: '맴도는 생각', deep: '깊고 무거운 생각', light: '흘려보내는 생각', reflect: '길을 찾는 생각' };

export function thinkMap(br, rf, { size = 300, type = '', labels = true, title = '' } = {}) {
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
    ['circle', x0, y0, 'start', x0 + 12, y0 + 22],
    ['deep', x0 + h, y0, 'end', x0 + S - 12, y0 + 22],
    ['light', x0, y0 + h, 'start', x0 + 12, y0 + S - 13],
    ['reflect', x0 + h, y0 + h, 'end', x0 + S - 12, y0 + S - 13],
  ];
  const cells = quads.map(([k, x, y]) => `<rect class="hs-cell ${k === type ? 'is-on' : ''}" x="${f1(x)}" y="${f1(y)}" width="${f1(h)}" height="${f1(h)}"/>`).join('');
  const names = labels ? quads.map(([k, , , anchor, tx, ty]) => `<text class="hs-q ${k === type ? 'is-on' : ''}" x="${f1(tx)}" y="${f1(ty)}" text-anchor="${anchor}">${TYPE_SHORT[k]}</text>`).join('') : '';
  const cid = `rm-clip-${++uid}`;
  return `<svg class="hs" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${esc(title || `생각 지도: 곱씹기 ${clamp(br)}, 돌아보기 ${clamp(rf)}`)}">
    <title>${esc(title || '생각 지도')}</title>
    <rect class="hs-bg" x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/>
    <clipPath id="${cid}"><rect x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/></clipPath>
    <g clip-path="url(#${cid})">${cells}</g>
    <line class="hs-cross" x1="${f1(x0 + h)}" y1="${y0}" x2="${f1(x0 + h)}" y2="${f1(y0 + S)}"/>
    <line class="hs-cross" x1="${x0}" y1="${f1(y0 + h)}" x2="${f1(x0 + S)}" y2="${f1(y0 + h)}"/>
    <rect class="hs-frame" x="${x0}" y="${y0}" width="${f1(S)}" height="${f1(S)}" rx="12"/>
    ${names}
    <circle class="hs-dot" cx="${f1(X(rf))}" cy="${f1(Y(br))}" r="8"/>
    <text class="hs-ax" x="${f1(x0 + S / 2)}" y="${f1(y0 + S + 22)}" text-anchor="middle">돌아보기 →</text>
    <text class="hs-ax" x="${f1(x0 - 12)}" y="${f1(y0 + S / 2)}" text-anchor="middle" transform="rotate(-90 ${f1(x0 - 12)} ${f1(y0 + S / 2)})">곱씹기 →</text>
  </svg>`;
}
