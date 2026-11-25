// AZIT : Star&Moon — 스트레스 대처 검사 채점
import { COPE_ITEMS, STRATEGY_ORDER, STRATEGIES, GROUP_ORDER, SITUATIONS } from './items.js';

// 대처 점수(0~100)는 얼마나 자주 쓰는지다. 수준 기준점(문항 평균 기준): 드묾 < 38, 가끔 38~61, 자주 62~74, 아주 자주 75 이상
export const levelOf = (v) => (v >= 75 ? 'vhigh' : v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

// 응답 점검 기준 (시뮬레이션으로 정함, 각 2만 명)
//  SPREAD_LIMIT 1.05: 같은 대처 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 평균).
//    일관된 응답 0.1%(잡음을 키운 경우 2.8%)만 걸리고, 무작위 응답은 92%, 반쯤 무작위는 47% 걸림.
//  ACQ_LIMIT 1.5: 정방향 문장과 역문장의 평균 차이(부호 있음). 내용과 상관없이 한쪽으로 기우는 경향.
//    일관된 응답은 1.8%만 걸리고, 거의 모든 문장에 '자주 한다'를 고른 응답은 모두 걸림.
export const SPREAD_LIMIT = 1.05;
export const ACQ_LIMIT = 1.5;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

// 대처 스타일: 문제 다루기와 마음 다루기(다가가기)와 물러서기의 균형으로 고른다
export function styleOf(problem, heart, away) {
  const approach = (problem + heart) / 2;
  if (away >= 50 && away - approach >= 5) return 'retreat';
  if (problem >= 55 && heart >= 55 && Math.abs(problem - heart) < 10) return 'balanced';
  if (problem - heart >= 10) return 'solver';
  if (heart - problem >= 10) return 'carer';
  return approach >= 50 ? 'balanced' : 'gathering';
}

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));

  const strategies = {};
  let spreadSum = 0;
  let acqSum = 0;
  STRATEGY_ORDER.forEach((k) => {
    const its = COPE_ITEMS.filter((it) => it.strategy === k);
    const vals = its.map(val);
    const sc = to100(mean(vals));
    strategies[k] = { score: sc, level: levelOf(sc) };
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
  });
  const groups = {};
  GROUP_ORDER.forEach((g) => {
    groups[g] = Math.round(mean(STRATEGY_ORDER.filter((k) => STRATEGIES[k].group === g).map((k) => strategies[k].score)));
  });
  const approach = Math.round((groups.problem + groups.heart) / 2);
  const order = [...STRATEGY_ORDER].sort((a, b) => strategies[b].score - strategies[a].score || STRATEGY_ORDER.indexOf(a) - STRATEGY_ORDER.indexOf(b));

  // 2부: 상황 맞춤. 바꿀 수 있는 일에서는 '움직이기', 바꿀 수 없는 일에서는 '마음 다독이기'가 앞설수록 잘 맞춘 것
  const pts = { act: { c: 0, u: 0 }, heart: { c: 0, u: 0 }, away: { c: 0, u: 0 } };
  const firsts = {};
  SITUATIONS.forEach((sit) => {
    const ans = Array.isArray(answers[sit.id]) ? answers[sit.id] : [];
    ans.forEach((key, i) => { if (pts[key]) pts[key][sit.control ? 'c' : 'u'] += 2 - i; });
    firsts[sit.id] = ans[0] || '';
  });
  const fitPts = pts.act.c + pts.heart.u; // 0~12
  const fit = Math.round((fitPts / 12) * 100);
  const fitFirst = SITUATIONS.filter((sit) => firsts[sit.id] === (sit.control ? 'act' : 'heart')).length;
  const awayFirst = SITUATIONS.filter((sit) => firsts[sit.id] === 'away').length;

  const rawAll = COPE_ITEMS.map(raw);
  const n = COPE_ITEMS.length + SITUATIONS.length;
  const durationSec = Number(meta.durationSec || 0);

  return {
    strategies,
    order,
    groups,
    approach,
    balance: approach - groups.away,
    style: styleOf(groups.problem, groups.heart, groups.away),
    fit,
    fitFirst,
    awayFirst,
    firsts,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / STRATEGY_ORDER.length),
      acq: r2(acqSum / STRATEGY_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < n * 1.6,
    },
  };
}
