// AZIT : Star&Moon — 감정 조절 검사 채점
import { SKILL_ITEMS, SKILL_ORDER, STRATEGY_ITEMS, STRATEGY_ORDER, STRATEGIES } from './items.js';

// 수준(0~100, 높을수록 감정을 다루는 힘이 큼). 집단 규준이 아니라 문항 평균에 묶은 기준점이다.
//  키우는 중 < 38 (평균 2.5 미만), 보통 38~61, 든든함 62~74, 강점 75 이상 (평균 4.0 이상)
export const levelOf = (v) => (v >= 75 ? 'vhigh' : v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

// 응답 점검 기준 (시뮬레이션으로 정함, 각 2만 명)
//  SPREAD_LIMIT 1.1: 같은 갈래 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 평균).
//    일관된 응답 0.3%(잡음을 키운 경우 4.5%)만 걸리고, 무작위 응답은 90%, 반쯤 무작위는 46% 걸림.
//  ACQ_LIMIT 1.4: '힘' 문장과 '어려움' 문장의 평균 차이(부호 있음). 내용과 상관없이 한쪽으로 기우는 경향.
//    일관된 응답은 2.3%만 걸리고, 거의 모든 문장에 '그렇다'를 고른 응답은 모두 걸림.
export const SPREAD_LIMIT = 1.1;
export const ACQ_LIMIT = 1.4;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));

  const skills = {};
  let spreadSum = 0;
  let acqSum = 0;
  SKILL_ORDER.forEach((k) => {
    const its = SKILL_ITEMS.filter((it) => it.skill === k);
    const vals = its.map(val);
    const sc = to100(mean(vals));
    skills[k] = { score: sc, level: levelOf(sc) };
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
  });
  const total = to100(mean(SKILL_ITEMS.map(val)));
  const order = [...SKILL_ORDER].sort((a, b) => skills[b].score - skills[a].score || SKILL_ORDER.indexOf(a) - SKILL_ORDER.indexOf(b));

  const strategies = {};
  STRATEGY_ORDER.forEach((k) => {
    strategies[k] = to100(mean(STRATEGY_ITEMS.filter((it) => it.strategy === k).map(raw)));
  });
  const groupMean = (g) => Math.round(mean(STRATEGY_ORDER.filter((k) => STRATEGIES[k].group === g).map((k) => strategies[k])));
  const help = groupMean('help');
  const cost = groupMean('cost');
  const stratOrder = [...STRATEGY_ORDER].sort((a, b) => strategies[b] - strategies[a] || STRATEGY_ORDER.indexOf(a) - STRATEGY_ORDER.indexOf(b));

  const rawAll = SKILL_ITEMS.map(raw);
  const n = SKILL_ITEMS.length + STRATEGY_ITEMS.length;
  const durationSec = Number(meta.durationSec || 0);

  return {
    total,
    level: levelOf(total),
    skills,
    order,
    top: order[0],
    grow: order[order.length - 1],
    range: skills[order[0]].score - skills[order[order.length - 1]].score,
    strategies,
    stratOrder,
    help,
    cost,
    pause: strategies.di,
    balance: help - cost,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / SKILL_ORDER.length),
      acq: r2(acqSum / SKILL_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < n * 1.6,
    },
  };
}
