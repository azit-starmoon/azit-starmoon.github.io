// AZIT : Star&Moon — 회복탄력성 검사 채점
import { ITEMS, FACTOR_ORDER, FACTORS, DOMAIN_ORDER } from './items.js';

// 점수(0~100)는 문항 평균을 옮긴 값이다. 집단 규준이 아니라 문항 평균에 묶은 기준점:
//  키우는 중 < 38 (평균 2.5 미만), 보통 38~61, 든든함 62~74 (평균 3.5~4.0), 아주 든든함 75 이상 (평균 4.0 이상)
export const levelOf = (v) => (v >= 75 ? 'vhigh' : v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

// 응답 점검 기준 (시뮬레이션으로 정함, 각 2만 명)
//  일관된 응답: 요인마다 참값(1.5~4.5)에 사람별 치우침(표준편차 0.2)과 문항 잡음(0.6)을 더해 반올림.
//  SPREAD_LIMIT 1.05: 같은 요인 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 평균).
//    일관된 응답 0.0%(잡음을 1.1로 키운 경우 3.4%)만 걸리고, 무작위 응답은 94%, 반쯤 무작위는 35% 걸림.
//  ACQ_LIMIT 1.3: 정방향 문장과 역문장의 평균 차이(부호 있음). 문장 내용과 상관없이 '그렇다'(또는 '아니다') 쪽으로
//    기우는 경향. 일관된 응답은 0.5%만 걸리고, 거의 모든 문장에 '그렇다'를 고른 응답은 모두 걸림.
export const SPREAD_LIMIT = 1.05;
export const ACQ_LIMIT = 1.3;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

// 다시 일어나는 힘이 기대는 곳: 세 영역이 고르면 'even', 아니면 가장 높은 영역
export function anchorOf(domains) {
  const order = [...DOMAIN_ORDER].sort((a, b) => domains[b] - domains[a] || DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b));
  return domains[order[0]] - domains[order[2]] < 8 ? 'even' : order[0];
}

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));

  const factors = {};
  let spreadSum = 0;
  let acqSum = 0;
  FACTOR_ORDER.forEach((k) => {
    const its = ITEMS.filter((it) => it.factor === k);
    const vals = its.map(val);
    const sc = to100(mean(vals));
    factors[k] = { score: sc, level: levelOf(sc) };
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
  });
  const domains = {};
  DOMAIN_ORDER.forEach((d) => {
    domains[d] = Math.round(mean(FACTOR_ORDER.filter((k) => FACTORS[k].domain === d).map((k) => factors[k].score)));
  });
  const total = Math.round(mean(DOMAIN_ORDER.map((d) => domains[d])));
  const order = [...FACTOR_ORDER].sort((a, b) => factors[b].score - factors[a].score || FACTOR_ORDER.indexOf(a) - FACTOR_ORDER.indexOf(b));
  const domainOrder = [...DOMAIN_ORDER].sort((a, b) => domains[b] - domains[a] || DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b));

  const rawAll = ITEMS.map(raw);
  const durationSec = Number(meta.durationSec || 0);

  return {
    total,
    level: levelOf(total),
    domains,
    domainOrder,
    anchor: anchorOf(domains),
    grow: domainOrder[2],
    factors,
    order,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / FACTOR_ORDER.length),
      acq: r2(acqSum / FACTOR_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < ITEMS.length * 1.6,
    },
  };
}
