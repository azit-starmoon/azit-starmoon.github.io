// AZIT : Star&Moon — 빅파이브 채점
import { ITEMS, FACETS, DOMAIN_ORDER } from './items.js';

export const LEVEL_LOW = 40;
export const LEVEL_HIGH = 60;

export function levelOf(score) {
  if (score > LEVEL_HIGH) return 'high';
  if (score < LEVEL_LOW) return 'low';
  return 'mid';
}

// 두 영역을 엮어 보는 스타일 10가지 (x축 영역, y축 영역)
export const STYLE_PAIRS = [
  ['N', 'E'], ['N', 'O'], ['N', 'A'], ['N', 'C'],
  ['E', 'O'], ['E', 'A'], ['E', 'C'],
  ['O', 'A'], ['O', 'C'], ['A', 'C'],
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r3 = (x) => Math.round(x * 1000) / 1000;

// 응답 점검: 서로 반대말인 문장 쌍 18개 (2026.11.28 고침)
//  예전에는 하위 요인마다 정방향 문항과 반대 방향 문항을 모두 짝지었다(73쌍). 그런데 '약속을 지킨다'와 '약속을 어길 때가 있다',
//  '늘 바쁘게 지낸다'와 '느긋하게 쉬는 것을 좋아한다'처럼 둘 다 '그렇다'고 답해도 이상하지 않은 쌍이 많아서,
//  성실하게 답해도 어긋난 응답이 크게 나왔다(같은 사람이 이틀 연달아 43%, 49%였고 영역 점수는 거의 같았다).
//  지금은 한쪽이 맞으면 다른 쪽은 맞기 어려운 쌍만 쓴다. '~할 때가 있다'처럼 누구나 그렇다고 할 수 있는 문장은 넣지 않았다.
//  모의 응답 2만 명(문항 = 0.7×성향 + 잡음): 일관된 응답은 평균 7.7%, 25% 이상 1.3% /
//  무작위 응답 73.6%, 내용과 상관없이 '그렇다'로 기우는 응답 67.6%가 25% 이상.
export const CHECK_PAIRS = [
  ['bN2_2', 'bN2_4'], // 쉽게 짜증이 난다 ↔ 웬만한 일에는 짜증이 나지 않는다
  ['bN2_1', 'bN2_4'], // 쉽게 화가 난다 ↔ 웬만한 일에는 짜증이 나지 않는다
  ['bN4_3', 'bN4_4'], // 친한 사람들과 있을 때만 마음이 편하다 ↔ 어색한 자리도 별로 신경 쓰이지 않는다
  ['bN6_1', 'bN6_4'], // 쉽게 당황하고 허둥댄다 ↔ 압박 속에서도 침착함을 유지한다
  ['bN6_2', 'bN6_4'], // 일이 몰리면 감당이 안 될 만큼 압도된다 ↔ 압박 속에서도 침착함을 유지한다
  ['bE2_1', 'bE2_4'], // 사람이 많은 큰 모임을 좋아한다 ↔ 사람이 붐비는 곳을 피한다
  ['bE3_1', 'bE3_4'], // 앞장서서 일을 맡는다 ↔ 다른 사람이 앞장서 주기를 기다린다
  ['bE3_2', 'bE3_4'], // 다른 사람들을 이끌려고 한다 ↔ 다른 사람이 앞장서 주기를 기다린다
  ['bO4_1', 'bO4_2'], // 늘 하던 것보다 새롭고 다양한 것이 좋다 ↔ 익숙한 것만 고수하는 편이다
  ['bO4_1', 'bO4_3'], // 늘 하던 것보다 새롭고 다양한 것이 좋다 ↔ 변화를 싫어한다
  ['bA1_1', 'bA1_4'], // 다른 사람을 믿는다 ↔ 사람들을 잘 믿지 않는다
  ['bA1_3', 'bA1_4'], // 사람들의 말을 믿는 편이다 ↔ 사람들을 잘 믿지 않는다
  ['bA3_2', 'bA3_3'], // 다른 사람들의 형편에 마음을 쓴다 ↔ 다른 사람의 감정에 무관심한 편이다
  ['bA3_1', 'bA3_4'], // 다른 사람을 돕는 것을 정말 좋아한다 ↔ 다른 사람을 위해 시간을 내지 않는다
  ['bA6_2', 'bA6_3'], // 나보다 형편이 어려운 사람들에게 연민을 느낀다 ↔ 다른 사람의 문제에는 관심이 없다
  ['bC2_1', 'bC2_3'], // 정리 정돈하는 것을 좋아한다 ↔ 방을 어질러 놓고 지낸다
  ['bC4_2', 'bC4_3'], // 열심히 일한다 ↔ 일에 시간과 노력을 별로 들이지 않는다
  ['bC4_1', 'bC4_4'], // 기대받는 것보다 더 많이 해낸다 ↔ 딱 필요한 만큼만 일한다
];
export const CLASH_LIMIT = 0.25;

// 반대말 쌍에 같은 쪽으로 답한 수 (둘 다 4~5, 또는 둘 다 1~2). 결과지는 저장된 응답으로 이 함수를 다시 불러 예전 결과도 같은 기준으로 본다
export function pairCheck(answers) {
  const clashes = [];
  let n = 0;
  CHECK_PAIRS.forEach(([p, q]) => {
    const a = answers && answers[p];
    const b = answers && answers[q];
    if (typeof a !== 'number' || typeof b !== 'number') return;
    n++;
    if ((a >= 4 && b >= 4) || (a <= 2 && b <= 2)) clashes.push([p, q, a, b]);
  });
  return { pairN: n, clashN: clashes.length, clashRatio: r3(n ? clashes.length / n : 0), clashes };
}

export function score(answers, meta = {}) {
  const byFacet = {};
  Object.keys(FACETS).forEach((f) => (byFacet[f] = []));
  const raw = [];
  ITEMS.forEach((it) => {
    const v = answers[it.id];
    if (typeof v !== 'number' || v < 1 || v > 5) return;
    raw.push(v);
    byFacet[it.facet].push(it.key > 0 ? v : 6 - v);
  });

  const facets = {};
  Object.keys(FACETS).forEach((f) => {
    const m = byFacet[f].length ? mean(byFacet[f]) : 3;
    const s = to100(m);
    facets[f] = { score: s, level: levelOf(s) };
  });

  const domains = {};
  DOMAIN_ORDER.forEach((d) => {
    const codes = Object.keys(FACETS).filter((f) => FACETS[f].d === d);
    const s = Math.round(mean(codes.map((f) => facets[f].score)));
    domains[d] = { score: s, level: levelOf(s) };
  });

  // 스타일: 각 영역이 50 이상이면 높은 쪽
  const styles = {};
  STYLE_PAIRS.forEach(([x, y]) => {
    const hx = domains[x].score >= 50 ? 'h' : 'l';
    const hy = domains[y].score >= 50 ? 'h' : 'l';
    styles[`${x}${y}`] = `${hx}${hy}`;
  });

  // 가장 두드러진 영역 (50에서 멀수록)
  const distinct = DOMAIN_ORDER.slice().sort((a, b) => Math.abs(domains[b].score - 50) - Math.abs(domains[a].score - 50) || DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b));

  // 응답 점검
  const pc = pairCheck(answers);
  const rawMean = raw.length ? mean(raw) : 3;
  const check = {
    rawMean: r3(rawMean),
    extremeRatio: r3(raw.length ? raw.filter((x) => x === 1 || x === 5).length / raw.length : 0),
    midRatio: r3(raw.length ? raw.filter((x) => x === 3).length / raw.length : 0),
    clashRatio: pc.clashRatio,
    clashN: pc.clashN,
    pairN: pc.pairN,
    sd: r3(raw.length ? Math.sqrt(mean(raw.map((x) => (x - rawMean) ** 2))) : 0),
    answered: raw.length,
  };

  const facetRank = Object.keys(FACETS).sort((a, b) => facets[b].score - facets[a].score || a.localeCompare(b));

  return {
    v: 1,
    domains,
    facets,
    styles,
    distinct,
    top: facetRank.slice(0, 3),
    bottom: facetRank.slice(-3).reverse(),
    check,
    durationSec: meta.durationSec || null,
  };
}
