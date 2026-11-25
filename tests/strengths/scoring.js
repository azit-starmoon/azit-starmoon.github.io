// AZIT : Star&Moon — 성격 강점 검사 채점
import { ALL_ITEMS, STRENGTH_ORDER, VIRTUE_ORDER, VIRTUES } from './items.js';

// 강점 점수(0~100)는 문항 평균을 옮긴 값이다(집단 규준이 아니다).
// 강점 검사는 '얼마나 높은가'보다 '내 안에서 무엇이 앞서는가'가 중요해서, 결과는 24강점의 순위로 읽는다.
//  1~5위 대표 강점(sig), 6~19위 중간 강점(mid), 20~24위 덜 쓰는 강점(rest).
//  점수 자체의 세기는 75 이상 뚜렷함(평균 4.0 이상), 50 미만 약함(평균 3.0 미만)으로 따로 표시한다.
export const SIG_N = 5;
export const REST_N = 5;
export const tierOf = (rank) => (rank <= SIG_N ? 'sig' : rank > STRENGTH_ORDER.length - REST_N ? 'rest' : 'mid');
export const levelOf = (v) => (v >= 75 ? 'high' : v >= 50 ? 'mid' : 'low');

// 응답 점검 기준 (시뮬레이션으로 정함, 각 1만 5천 명)
//  일관된 응답: 사람마다 강점 프로필을 정하고 문항마다 고유한 치우침(SD 0.4)과 잡음(SD 0.75)을 더함(강점 내 신뢰도 α 약 0.74).
//  SPREAD_LIMIT 1.0: 같은 강점 네 문항끼리의 흩어짐(반대 방향 문항을 돌린 뒤 표준편차, 강점 평균).
//    일관된 응답 0%(잡음을 키운 경우 0.4%)만 걸리고, 무작위 응답은 97.8%, 절반쯤 무작위로 답한 응답은 44% 걸림.
//  ACQ_LIMIT 1.0: 정방향 문항과 반대 방향 문항의 평균 차이(부호 있음). 내용과 상관없이 '그렇다'로 기우는 경향.
//    일관된 응답과 무작위 응답은 0.3% 이하만 걸리고, 거의 모든 문장에 '그렇다'를 고른 응답은 모두 걸림.
//  FLAT_LIMIT 20: 대표 강점 5개 평균과 덜 쓰는 강점 5개 평균의 차이. 일관된 응답에서는 드물다(5% 미만).
//    낮으면 강점 사이 차이가 작아서 순위가 조금만 달라져도 대표 강점이 바뀔 수 있다는 뜻으로 읽는다.
export const SPREAD_LIMIT = 1.0;
export const ACQ_LIMIT = 1.0;
export const FLAT_LIMIT = 20;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));

  const exact = {};
  const strengths = {};
  let spreadSum = 0;
  let acqSum = 0;
  STRENGTH_ORDER.forEach((s) => {
    const its = ALL_ITEMS.filter((it) => it.strength === s);
    const vals = its.map(val);
    exact[s] = mean(vals);
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
  });
  // 같은 점수면 반올림 전 평균, 그래도 같으면 정해진 차례
  const order = [...STRENGTH_ORDER].sort((a, b) => exact[b] - exact[a] || STRENGTH_ORDER.indexOf(a) - STRENGTH_ORDER.indexOf(b));
  order.forEach((s, i) => {
    const sc = to100(exact[s]);
    strengths[s] = { score: sc, rank: i + 1, tier: tierOf(i + 1), level: levelOf(sc) };
  });

  const virtues = {};
  VIRTUE_ORDER.forEach((v) => {
    const sc = Math.round(mean(VIRTUES[v].strengths.map((s) => to100(exact[s]))));
    const sigCount = VIRTUES[v].strengths.filter((s) => strengths[s].tier === 'sig').length;
    virtues[v] = { score: sc, sig: sigCount };
  });
  const vOrder = [...VIRTUE_ORDER].sort((a, b) => virtues[b].score - virtues[a].score || VIRTUE_ORDER.indexOf(a) - VIRTUE_ORDER.indexOf(b));

  const sig = order.slice(0, SIG_N);
  const rest = order.slice(-REST_N);
  const total = to100(mean(STRENGTH_ORDER.map((s) => exact[s])));
  const gap = Math.round(mean(sig.map((s) => strengths[s].score)) - mean(rest.map((s) => strengths[s].score)));

  const rawAll = ALL_ITEMS.map(raw);
  const durationSec = Number(meta.durationSec || 0);

  return {
    strengths,
    order,
    sig,
    rest,
    top: order[0],
    virtues,
    vOrder,
    topVirtue: vOrder[0],
    total,
    gap,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / STRENGTH_ORDER.length),
      acq: r2(acqSum / STRENGTH_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      midRatio: r2(rawAll.filter((v) => v === 3).length / rawAll.length),
      flat: gap < FLAT_LIMIT,
      fast: durationSec > 0 && durationSec < ALL_ITEMS.length * 1.6,
    },
  };
}
