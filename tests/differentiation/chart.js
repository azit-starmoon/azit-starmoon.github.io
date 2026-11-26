// AZIT : Star&Moon — 나와 가까운 사람의 두 원
// 두 원이 겹칠수록 융합, 멀어질수록 단절(두 지표의 차이로 거리를 정한다). 둘 다 높으면 가까운 원과 먼 원을 함께 그려 오가는 모습을 보인다. '나' 원의 테두리가 굵고 진할수록
// 내 입장 지키기가 높고, 바깥 물결이 많을수록 감정 반응성이 높다. 정확한 값은 결과지의 막대와 숫자로 함께 보여 준다.
import { esc } from '../../assets/js/ui.js';
import { FACET_COLOR } from './content.js';

const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const f1 = (n) => n.toFixed(1);

export function selfCircles(f, { size = 300, labels = true, title = '' } = {}) {
  const ip = clamp(f.ip && f.ip.score);
  const er = clamp(f.er && f.er.score);
  const ec = clamp(f.ec && f.ec.score);
  const fo = clamp(f.fo && f.fo.score);
  const W = size;
  const H = Math.round(size * 0.64);
  const r = size * 0.19;
  const cy = H / 2;
  // 거리: 융합이 크면 가까이 겹치고, 단절이 크면 멀어진다. 둘 다 50 이상이면(오가는 쪽) 가까운 원과 먼 원을 함께 그린다
  const swing = fo >= 50 && ec >= 50;
  const dNear = r * (1.75 - 1.3 * fo / 100);
  const dFar = r * (1.55 + 1.2 * ec / 100);
  const dist = swing ? dNear : r * Math.max(0.35, Math.min(2.75, 1.55 + 1.2 * (ec - fo) / 100));
  const mx = W / 2 - (swing ? (dNear + dFar) / 4 : dist / 2);
  const ox = mx + dist;
  const fx = mx + dFar;
  const blue = FACET_COLOR.ip;
  const waves = er >= 70 ? 3 : er >= 50 ? 2 : er >= 30 ? 1 : 0;
  const ripple = Array.from({ length: waves }, (_, i) => `<circle class="dc-wave" cx="${f1(mx)}" cy="${f1(cy)}" r="${f1(r + 7 + i * 7)}"/>`).join('');
  const others = swing
    ? `<circle class="dc-other dc-other--ghost" cx="${f1(fx)}" cy="${f1(cy)}" r="${f1(r)}"/>
      <circle class="dc-other dc-other--ghost" cx="${f1(ox)}" cy="${f1(cy)}" r="${f1(r)}"/>
      <path class="dc-swing" d="M${f1(ox + 6)},${f1(cy - r - 10)} H${f1(fx - 6)} M${f1(ox + 12)},${f1(cy - r - 15)} L${f1(ox + 6)},${f1(cy - r - 10)} L${f1(ox + 12)},${f1(cy - r - 5)} M${f1(fx - 12)},${f1(cy - r - 15)} L${f1(fx - 6)},${f1(cy - r - 10)} L${f1(fx - 12)},${f1(cy - r - 5)}"/>`
    : `<circle class="dc-other" cx="${f1(ox)}" cy="${f1(cy)}" r="${f1(r)}"/>`;
  // 이름표: 겹칠 때는 '나'를 왼쪽으로, '가까운 사람'은 나의 원 밖으로 비켜 적는다
  const labX = swing ? fx : Math.min(W - 40, Math.max(ox + (dist < 2 * r ? r * 0.3 : 0), mx + r + 40));
  const lab = labels ? `<text class="dc-lab" x="${f1(mx - (dist < 2 * r ? r * 0.3 : 0))}" y="${f1(cy + 5)}" text-anchor="middle">나</text>
    <text class="dc-lab dc-lab--o" x="${f1(labX)}" y="${f1(cy + 5)}" text-anchor="middle">가까운 사람</text>` : '';
  const desc = `내 입장 지키기 ${ip}, 감정 반응성 ${er}, 감정적 단절 ${ec}, 타인과의 융합 ${fo}`;
  return `<svg class="dc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || `나와 가까운 사람의 거리: ${desc}`)}">
    <title>${esc(title || '나와 가까운 사람의 두 원')}</title>
    ${ripple}
    ${others}
    <circle class="dc-me" cx="${f1(mx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${blue}" fill-opacity="${(0.14 + 0.36 * ip / 100).toFixed(2)}" stroke="${blue}" stroke-width="${f1(1.5 + 4.5 * ip / 100)}"/>
    ${lab}
  </svg>`;
}
