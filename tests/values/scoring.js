// AZIT : Star&Moon — 가치 지향 검사 채점
import { ITEMS, VALUE_ORDER, GROUP_ORDER, GROUPS, CONFLICTS } from './items.js';

// 가치 점수는 두 가지로 낸다.
//  score(0~100): 문항 평균(1~6)을 옮긴 값. 이 가치를 얼마나 중요하게 여기는지의 세기.
//  c(중심화 점수): 이 가치의 평균에서 40문항 전체 평균을 뺀 값. 사람마다 답을 후하게 또는 짜게 주는 버릇을 지우고
//    '내 안에서 이 가치가 다른 가치보다 앞서는지'를 본다. 순위와 해석은 모두 c로 한다.
//  순위 1~3위 핵심 가치(core), 4~7위 중간(mid), 8~10위 덜 앞세우는 가치(low).
export const CORE_N = 3;
export const LOW_N = 3;
export const tierOf = (rank) => (rank <= CORE_N ? 'core' : rank > VALUE_ORDER.length - LOW_N ? 'low' : 'mid');

// 맞은편 두 가치가 모두 c 0.3 이상이면 '가치 갈등'으로 본다.
export const CONFLICT_C = 0.3;

// 응답 점검 기준 (시뮬레이션으로 정함, node로 각 2만 명, 이 파일의 score로 계산)
//  일관된 응답: 사람마다 답을 주는 평균(3~5), 원형 위 방향(무작위 각도)과 세기(0.4~1.6)를 정하고,
//    가치마다 고유 치우침(SD 0.35), 문항마다 치우침(SD 0.4)과 잡음(SD 0.75)을 더해 1~6으로 반올림.
//  SPREAD_LIMIT 1.1: 같은 가치 네 문항끼리의 흩어짐(반대 방향 문항을 돌린 뒤 표준편차, 가치 평균).
//    일관된 응답 0.0%(잡음을 1.0으로 키우면 0.7%)만 걸리고, 무작위 응답은 97.8% 걸림.
//  ACQ_LIMIT 1.2: 정방향 문항과 반대 방향 문항의 평균 차이(부호 있음). 내용과 상관없이 '닮았다'로 기우는 경향.
//    일관된 응답 0.1% 이하, 무작위 응답 5.9%만 걸리고, 거의 모든 문장에 5~6을 고른 응답은 모두 걸림.
//  둘 중 하나라도 걸린 비율: 일관된 응답 0.0~0.8%, 무작위 응답 97.8%.
//  FLAT_LIMIT 0.35: 열 가치의 c 표준편차. 이보다 작으면 가치 사이 차이가 작아 순위가 쉽게 바뀔 수 있다는 뜻
//    (일관된 응답의 0.4~0.7%, 모든 문장에 '닮았다'를 고른 응답의 99%).
export const SPREAD_LIMIT = 1.1;
export const ACQ_LIMIT = 1.2;
export const FLAT_LIMIT = 0.35;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 5) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 7 - raw(it) : raw(it));

  const exact = {};
  let spreadSum = 0;
  let acqSum = 0;
  VALUE_ORDER.forEach((v) => {
    const its = ITEMS.filter((it) => it.value === v);
    const vals = its.map(val);
    exact[v] = mean(vals);
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
  });
  const center = mean(ITEMS.map(val));
  const order = [...VALUE_ORDER].sort((a, b) => exact[b] - exact[a] || VALUE_ORDER.indexOf(a) - VALUE_ORDER.indexOf(b));
  const values = {};
  order.forEach((v, i) => {
    values[v] = { score: to100(exact[v]), c: r2(exact[v] - center), rank: i + 1, tier: tierOf(i + 1) };
  });

  const groups = {};
  GROUP_ORDER.forEach((g) => {
    const m = mean(GROUPS[g].values.map((v) => exact[v]));
    groups[g] = { score: to100(m), c: r2(m - center) };
  });
  const gOrder = [...GROUP_ORDER].sort((a, b) => groups[b].c - groups[a].c || GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));

  // 두 축: 변화 − 보존(+면 변화 쪽), 자기 초월 − 자기 향상(+면 초월 쪽)
  const axisChange = r2(groups.open.c - groups.cons.c);
  const axisCare = r2(groups.trans.c - groups.enh.c);

  const conflicts = CONFLICTS
    .filter(([a, b]) => values[a].c >= CONFLICT_C && values[b].c >= CONFLICT_C)
    .map(([a, b]) => ({ a, b, key: `${a}-${b}`, sum: r2(values[a].c + values[b].c) }))
    .sort((x, y) => y.sum - x.sum);

  const rawAll = ITEMS.map(raw);
  const cs = VALUE_ORDER.map((v) => exact[v] - center);
  const durationSec = Number(meta.durationSec || 0);

  return {
    values,
    order,
    core: order.slice(0, CORE_N),
    low: order.slice(-LOW_N),
    top: order[0],
    groups,
    gOrder,
    topGroup: gOrder[0],
    axisChange,
    axisCare,
    conflicts,
    center: r2(center),
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / VALUE_ORDER.length),
      acq: r2(acqSum / VALUE_ORDER.length),
      diff: r2(sdOf(cs)),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 6).length / rawAll.length),
      flat: sdOf(cs) < FLAT_LIMIT,
      fast: durationSec > 0 && durationSec < ITEMS.length * 2,
    },
  };
}
