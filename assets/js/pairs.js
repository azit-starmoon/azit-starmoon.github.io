// AZIT : Star&Moon — 짝 검사 함께 읽기 (종합 결과지에서 쓴다)
// 두 검사를 모두 했을 때만 보인다. 각 render(a, b)는 두 검사의 scores를 받아 HTML 조각을 돌려준다. DOM에는 손대지 않는다.
import { esc } from './ui.js';
import { attachMap } from '../../tests/attachment/chart.js';
import { SCHEMAS } from '../../tests/schema/items.js';
import { levelOf as esteemLevel } from '../../tests/esteem/scoring.js';

const STYLE_NAME = { secure: '안정형', anxious: '불안형', fearful: '두려움-회피형', avoidant: '회피형' };
const BLUE = '#2a78d6';
const GREEN = '#1baf7a';
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const bar = (v, color) => `<span class="pp-bar" aria-hidden="true"><span style="width:${num(v) ? Math.max(0, Math.min(100, v)) : 0}%;background:${color}"></span></span>`;
const band = (v) => (v >= 60 ? 2 : v >= 40 ? 1 : 0);

// 두 점수(0~100)를 높음·보통·낮음 칸으로 나눠 비교한다. sameDir=false면 b를 뒤집어(100-b) 본다
export function agree(a, b, sameDir = true) {
  if (!num(a) || !num(b)) return { k: 'na', label: '비교 못 함' };
  const d = Math.abs(band(a) - band(sameDir ? b : 100 - b));
  if (d === 0) return { k: 'same', label: '같은 방향' };
  if (d === 1) return { k: 'near', label: '조금 다름' };
  return { k: 'diff', label: '엇갈림' };
}
// rows: [[왼쪽 이름, 값, 오른쪽 이름, 값, 일치]]
function rows(list) {
  return `<ul class="pp-rows">${list.map(([la, va, lb, vb, ag]) => `<li>
      <span class="pp-side"><span class="nm">${esc(la)}</span>${bar(va, BLUE)}<span class="v">${num(va) ? va : '–'}</span></span>
      <span class="pp-side"><span class="nm">${esc(lb)}</span>${bar(vb, GREEN)}<span class="v">${num(vb) ? vb : '–'}</span></span>
      <span class="pp-ag pp-ag--${ag.k}">${ag.label}</span>
    </li>`).join('')}</ul>`;
}
const legend = (a, b) => `<p class="pp-legend"><span><i style="background:${BLUE}"></i>${esc(a)}</span><span><i style="background:${GREEN}"></i>${esc(b)}</span></p>`;
const score = (o, k) => (o && o[k] ? o[k].score : undefined);

export const PAIRS = [
  {
    a: 'attachment',
    b: 'godattach',
    title: '사람과의 애착, 하나님과의 애착',
    why: '사람과의 관계와 하나님과의 관계를 같은 지도에서 비교할 수 있어요',
    render: (A, G) => {
      const insecure = (s) => s && s !== 'secure';
      let head;
      let text;
      if (A.style === 'secure' && G.style === 'secure') {
        head = '두 관계 모두 편안한 편이에요';
        text = '사람과의 관계도, 하나님과의 관계도 안정형에 가까워요. 가까이 다가가는 것도, 힘들 때 기대는 것도 비교적 편안한 모습이에요.';
      } else if (A.style === G.style) {
        head = '두 관계가 닮아 있어요';
        text = `사람과의 관계도, 하나님과의 관계도 ${STYLE_NAME[A.style] || ''}에 가까워요. 사람 사이에서 익힌 관계 방식이 하나님과의 관계에도 이어진 것으로 보여요. 연구에서도 흔히 보고되는 경우예요.`;
      } else if (insecure(A.style) && G.style === 'secure') {
        head = '하나님과의 관계에서 더 안정적이에요';
        text = `사람과의 관계는 ${STYLE_NAME[A.style]}에 가깝지만 하나님과의 관계는 안정형이에요. 사람에게서 다 채우지 못한 안정감을 하나님과의 관계에서 얻고 있을 수 있어요. 연구에서는 이런 모습을 '보상'이라고 불러요.`;
      } else if (A.style === 'secure' && insecure(G.style)) {
        head = '하나님과의 관계에서 더 흔들려요';
        text = `사람과의 관계는 안정형인데 하나님과의 관계는 ${STYLE_NAME[G.style]}에 가까워요. 엄격하거나 두려움을 주던 신앙 환경, 응답받지 못했다고 느낀 기도, 상실 같은 신앙 경험에서 온 마음일 수 있어요.`;
      } else {
        head = '두 관계가 서로 다른 모습으로 흔들려요';
        text = `사람에게는 ${STYLE_NAME[A.style] || ''}, 하나님께는 ${STYLE_NAME[G.style] || ''}에 가까운 모습이에요. 관계마다 불안과 거리를 다루는 방식이 달라서, 어떤 경험이 각각의 모습을 만들었는지 함께 살펴보면 좋아요.`;
      }
      return `<div class="pp-pair-grid">
        <figure class="pp-map">${attachMap([{ x: A.avo, y: A.anx, main: true, label: '사람' }, { x: G.av, y: G.an, label: '하나님' }], { size: 300, title: `애착 지도: 사람과의 관계 불안 ${A.anx}, 회피 ${A.avo}; 하나님과의 관계 불안 ${G.an}, 회피 ${G.av}` })}
          <figcaption>별은 사람과의 관계(성인 애착 유형 검사), 동그라미는 하나님과의 관계(하나님 애착 검사)예요.</figcaption></figure>
        <div class="pp-read"><p class="pp-head-t">${esc(head)}</p><p>${esc(text)}</p>
          ${legend('성인 애착 유형 검사', '하나님 애착 검사')}
          ${rows([['사람과의 불안', A.anx, '하나님과의 불안', G.an, agree(A.anx, G.an)], ['사람과의 회피', A.avo, '하나님과의 회피', G.av, agree(A.avo, G.av)]])}</div>
      </div>`;
    },
  },
  {
    a: 'attachment',
    b: 'differentiation',
    title: '애착과 자아분화',
    why: '가까운 관계에서의 불안과 거리를 가족 안의 모습과 함께 볼 수 있어요',
    render: (A, D) => {
      const f = D.facets || {};
      const list = [
        ['불안', A.anx, '감정 반응성', score(f, 'er')],
        ['불안', A.anx, '타인과의 융합', score(f, 'fo')],
        ['회피', A.avo, '감정적 단절', score(f, 'ec')],
      ].map(([a, x, b, y]) => [a, x, b, y, agree(x, y)]);
      const ks = list.map((r) => r[4].k);
      let text;
      if (ks.includes('diff')) text = '두 검사가 서로 다른 그림을 보여 주는 곳이 있어요. 자아분화 검사는 가족 장면을 더 많이 묻고 애착 검사는 가까운 관계 전반을 물어서, 가족 안에서의 모습과 다른 관계에서의 모습이 다를 수 있어요.';
      else if (ks.every((k) => k === 'same')) text = '두 검사가 같은 방향을 가리켜요. 가까운 관계에서 긴장을 다루는 방식이 가족 안팎에서 비슷하게 나타난다고 볼 수 있어요.';
      else text = '두 검사가 대체로 같은 쪽을 가리키지만 정도가 조금 달라요. 가족 안에서와 다른 관계에서 어느 쪽이 더 힘든지 이야기해 보면 좋아요.';
      return `<div class="pp-read"><p>애착의 불안은 자아분화의 감정 반응성, 타인과의 융합과 닮은 마음이고, 애착의 회피는 감정적 단절과 닮은 마음이에요. 연구에서도 서로 관련이 있다고 보고돼요.</p>
        ${legend('성인 애착 유형 검사', '자아분화 검사')}${rows(list)}<p>${esc(text)}</p></div>`;
    },
  },
  {
    a: 'bigfive',
    b: 'temperament',
    title: '성격 5요인, 기질과 성품',
    why: '같은 성격을 두 이론으로 겹쳐 볼 수 있어요',
    render: (B, T) => {
      const d = B.domains || {};
      const t = T.dims || {};
      const list = [
        ['신경성', score(d, 'N'), '위험 회피', score(t, 'ha')],
        ['외향성', score(d, 'E'), '자극 추구', score(t, 'ns')],
        ['성실성', score(d, 'C'), '인내력', score(t, 'ps')],
        ['친화성', score(d, 'A'), '연대감', score(t, 'co')],
      ].map(([a, x, b, y]) => [a, x, b, y, agree(x, y)]);
      const same = list.filter((r) => r[4].k === 'same').length;
      const diff = list.filter((r) => r[4].k === 'diff').map((r) => `${r[0]}과 ${r[2]}`); // 왼쪽 이름이 모두 '성'으로 끝나 '과'가 맞다
      let text = `네 쌍 가운데 ${same}쌍이 같은 방향이에요.`;
      if (same === 4) text += ' 두 이론이 같은 사람을 일관되게 그리고 있어요.';
      else if (diff.length) text += ` ${diff.join(', ')} 쌍은 엇갈려요. 두 검사의 문항이 묻는 장면이 달라서 생기기도 하니, 그 영역에서 상황에 따라 모습이 달라지는지 이야기해 보면 좋아요.`;
      else text += ' 나머지도 크게 엇갈리지 않아서, 두 이론이 대체로 같은 사람을 그리고 있어요.';
      return `<div class="pp-read"><p>두 검사를 함께 쓴 연구에서 서로 관련이 있다고 보고된 네 쌍이에요.</p>
        ${legend('성격 5요인 검사', '기질과 성품 검사')}${rows(list)}<p>${esc(text)}</p></div>`;
    },
  },
  {
    a: 'esteem',
    b: 'schema',
    title: '자아존중감과 심리도식',
    why: '나를 보는 마음과 그 밑에 깔린 오래된 믿음을 함께 볼 수 있어요',
    render: (E, S) => {
      const sc = S.schemas || {};
      const de = sc.de || {};
      const as = sc.as || {};
      const ap = (E.bases || {}).ap || {};
      const wl = E.level || (num(E.worth) ? esteemLevel(E.worth) : '');
      const on = (s) => s.level === 'strong' || s.level === 'active';
      const deName = (SCHEMAS.de || {}).name || '결함/수치심';
      const asName = (SCHEMAS.as || {}).name || '승인 추구';
      const parts = [];
      if (wl === 'low' && on(de)) parts.push(`자기 가치감이 낮고 '${deName}' 도식도 작동하고 있어요. '나는 부족하다'는 오래된 믿음이 지금의 자존감을 누르고 있을 수 있어요.`);
      else if ((wl === 'high' || wl === 'vhigh') && on(de)) parts.push(`평소 느끼는 자기 가치감은 높은데 '${deName}' 도식은 작동하고 있어요. 괜찮다가도 비판이나 실수 앞에서 '나는 부족하다'는 마음이 갑자기 올라오는지 살펴보면 좋아요.`);
      else if (wl === 'low') parts.push(`자기 가치감은 낮지만 '${deName}' 도식은 크게 작동하지 않아요. 오래된 믿음보다 요즘의 상황(지침, 실패 경험 등)이 자존감을 누르고 있을 수 있어요.`);
      else parts.push(`자기 가치감과 '${deName}' 도식이 서로 어긋나지 않아요.`);
      if ((ap.level === 'high' || ap.level === 'vhigh') && on(as)) parts.push(`다른 사람의 인정에 기대는 마음이 두 검사에서 함께 보여요. 다른 사람의 반응이 자존감을 크게 흔드는지 살펴보면 좋아요.`);
      return `<div class="pp-read">${legend('자아존중감 검사', '심리도식 검사')}
        ${rows([['자기 가치감', E.worth, deName, de.score, agree(E.worth, de.score, false)], ['인정에 기대는 정도', ap.score, asName, as.score, agree(ap.score, as.score)]])}
        <p class="pp-note">자기 가치감은 높을수록, ${esc(deName)} 도식은 낮을수록 단단한 쪽이라 첫 줄은 두 막대를 반대로 읽어요.</p><p>${esc(parts.join(' '))}</p></div>`;
    },
  },
];
