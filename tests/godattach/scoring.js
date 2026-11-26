// AZIT : Star&Moon — 하나님 애착 검사 채점
import { ITEMS, FACETS, FACET_ORDER } from './items.js';

// 점수는 0~100(문항 평균을 옮긴 값). 집단 규준이 아니라 응답 척도에 묶은 기준점이다.
export const levelOf = (v) => (v > 60 ? 'high' : v < 40 ? 'low' : 'mid');

// 성인 애착 유형 검사와 같은 기준: 평균 응답이 '보통이다'(50)를 넘어야 높은 쪽으로 본다
const hi = (v) => v > 50;
export function classify(an, av) {
  if (hi(an)) return hi(av) ? 'fearful' : 'anxious';
  return hi(av) ? 'avoidant' : 'secure';
}

// 응답 점검 기준 (시뮬레이션으로 정함, 응답 방식마다 2만 명).
//  SPREAD_LIMIT 1.2: 같은 축 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 두 축 평균).
//    일관된 응답 0.1%, 잡음을 키운 응답 3.2%만 걸리고, 무작위 응답은 86%, 반쯤 무작위는 54% 걸림.
//  ACQ_LIMIT 1.4: 정방향 문장과 역문장의 평균 차이(부호 있음). 일관된 응답 0.3%, 무작위 2%, '그렇다' 일변도는 모두 걸림.
export const SPREAD_LIMIT = 1.2;
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
  const dimScore = (d) => {
    const its = ITEMS.filter((it) => it.dim === d);
    const vals = its.map(val);
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
    return to100(mean(vals));
  };
  const an = dimScore('an');
  const av = dimScore('av');
  const facets = {};
  FACET_ORDER.forEach((k) => {
    const sc = to100(mean(ITEMS.filter((it) => it.facet === k).map(val)));
    facets[k] = { score: sc, level: levelOf(sc) };
  });
  // 각 축에서 가장 두드러진 갈래
  const topOf = (d) => FACET_ORDER.filter((k) => FACETS[k].dim === d).sort((a, b) => facets[b].score - facets[a].score || FACET_ORDER.indexOf(a) - FACET_ORDER.indexOf(b))[0];

  const rawAll = ITEMS.map(raw);
  const durationSec = Number(meta.durationSec || 0);
  return {
    an,
    av,
    anLevel: levelOf(an),
    avLevel: levelOf(av),
    style: classify(an, av),
    facets,
    topAn: topOf('an'),
    topAv: topOf('av'),
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / 2),
      acq: r2(acqSum / 2),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < ITEMS.length * 1.6,
    },
  };
}
