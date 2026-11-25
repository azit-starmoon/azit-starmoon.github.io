// AZIT : Star&Moon — 자존감 검사 채점
import { WORTH_ITEMS, SELF_ITEMS, SELF_ORDER, BASE_ITEMS, BASE_ORDER } from './items.js';

// 수준(0~100). 집단 규준이 아니라 문항 평균에 묶은 기준점이다. 낮음 < 38, 보통 38~61, 높음 62~74, 매우 높음 75 이상
export const levelOf = (v) => (v >= 75 ? 'vhigh' : v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

// 자존감 지도: 자기 가치감(세로)과 조건에 기대는 정도(가로)가 55를 넘는지로 네 자리
export const MAP_LINE = 55;
export function typeOf(worth, lean) {
  if (worth >= MAP_LINE) return lean >= MAP_LINE ? 'contingent' : 'secure';
  return lean >= MAP_LINE ? 'shaken' : 'quiet';
}

// 응답 점검 기준 (시뮬레이션으로 정함, 각 2만 명). 1부와 2부(역문항이 있는 34문항)로 본다.
//  SPREAD_LIMIT 1.15: 같은 갈래 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 평균).
//    일관된 응답 0.3%(잡음을 키운 경우 4.4%)만 걸리고, 무작위 응답은 90%, 반쯤 무작위는 44% 걸림.
//  ACQ_LIMIT 1.4: 정방향 문장과 역문장의 평균 차이(부호 있음). 내용과 상관없이 한쪽으로 기우는 경향.
//    일관된 응답은 2.3%만 걸리고, 거의 모든 문장에 '그렇다'를 고른 응답은 모두 걸림.
export const SPREAD_LIMIT = 1.15;
export const ACQ_LIMIT = 1.4;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));
  let spreadSum = 0;
  let acqSum = 0;
  const part = (its) => {
    const vals = its.map(val);
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
    return to100(mean(vals));
  };

  const worth = part(WORTH_ITEMS);
  const self = {};
  SELF_ORDER.forEach((k) => {
    const sc = part(SELF_ITEMS.filter((it) => it.self === k));
    self[k] = { score: sc, level: levelOf(sc) };
  });
  const compassion = Math.round(mean(SELF_ORDER.map((k) => self[k].score)));
  const selfOrder = [...SELF_ORDER].sort((a, b) => self[a].score - self[b].score || SELF_ORDER.indexOf(a) - SELF_ORDER.indexOf(b)); // 낮은 것부터

  const bases = {};
  BASE_ORDER.forEach((k) => {
    const sc = to100(mean(BASE_ITEMS.filter((it) => it.base === k).map(raw)));
    bases[k] = { score: sc, level: levelOf(sc) };
  });
  const lean = Math.round(mean(BASE_ORDER.map((k) => bases[k].score)));
  const baseOrder = [...BASE_ORDER].sort((a, b) => bases[b].score - bases[a].score || BASE_ORDER.indexOf(a) - BASE_ORDER.indexOf(b));

  const checked = [...WORTH_ITEMS, ...SELF_ITEMS];
  const rawAll = checked.map(raw);
  const n = WORTH_ITEMS.length + SELF_ITEMS.length + BASE_ITEMS.length;
  const durationSec = Number(meta.durationSec || 0);

  return {
    worth,
    level: levelOf(worth),
    self,
    compassion,
    compassionLevel: levelOf(compassion),
    selfOrder,
    bases,
    lean,
    leanLevel: levelOf(lean),
    baseOrder,
    topBase: baseOrder[0],
    type: typeOf(worth, lean),
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / (SELF_ORDER.length + 1)),
      acq: r2(acqSum / (SELF_ORDER.length + 1)),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < n * 1.6,
    },
  };
}
