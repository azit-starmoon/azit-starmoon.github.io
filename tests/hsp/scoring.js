// AZIT : Star&Moon — 감각처리 민감성 검사 채점
import { TRAIT_ITEMS, STATE_ITEMS, FACET_ORDER } from './items.js';

// 수준(0~100). 집단 규준이 아니라 문항 평균에 묶은 기준점이다.
//  낮음 < 38 (평균 2.5 미만), 보통 38~61, 높음 62~74 (평균 3.5~4.0), 매우 높음 75 이상 (평균 4.0 이상)
//  전체 점수가 '높음' 이상이면 섬세함이 뚜렷한 쪽(흔히 HSP라고 부르는 범위)으로 읽는다.
export const levelOf = (v) => (v >= 75 ? 'vhigh' : v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

// 응답 점검 기준 (시뮬레이션으로 정함, 각 2만 명)
//  SPREAD_LIMIT 1.15: 같은 갈래 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 평균).
//    일관된 응답 0.1%(잡음을 키운 경우 3.0%)만 걸리고, 무작위 응답은 94.5%, 반쯤 무작위는 48% 걸림.
//  ACQ_LIMIT 1.3: 정방향 문항과 역문항의 평균 차이(부호 있음). 문장 내용과 상관없이 '그렇다'(또는 '아니다') 쪽으로
//    기우는 경향. 일관된 응답은 약 3%만 걸리고, 거의 모든 문장에 '그렇다'를 고른 응답은 모두 걸림.
export const SPREAD_LIMIT = 1.15;
export const ACQ_LIMIT = 1.3;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

// 요즘의 나: 부담 신호(load)와 회복 자원(rest)이 50을 넘는지로 네 상태
export function stateOf(load, rest) {
  if (load > 50) return rest > 50 ? 'holding' : 'overload';
  return rest > 50 ? 'bloom' : 'dry';
}

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));

  const facets = {};
  let spreadSum = 0;
  let acqSum = 0;
  FACET_ORDER.forEach((f) => {
    const its = TRAIT_ITEMS.filter((it) => it.facet === f);
    const vals = its.map(val);
    const sc = to100(mean(vals));
    const fw = mean(its.filter((it) => !it.r).map(val));
    const rv = mean(its.filter((it) => it.r).map(val));
    facets[f] = { score: sc, level: levelOf(sc) };
    spreadSum += sdOf(vals);
    acqSum += fw - rv;
  });
  const total = to100(mean(TRAIT_ITEMS.map(val)));
  const order = [...FACET_ORDER].sort((a, b) => facets[b].score - facets[a].score || FACET_ORDER.indexOf(a) - FACET_ORDER.indexOf(b));

  const load = to100(mean(STATE_ITEMS.filter((i) => i.scale === 'load').map(raw)));
  const rest = to100(mean(STATE_ITEMS.filter((i) => i.scale === 'rest').map(raw)));

  const rawAll = TRAIT_ITEMS.map(raw);
  const rawMean = mean(rawAll);
  const sd = sdOf(rawAll);
  const spread = spreadSum / FACET_ORDER.length;
  const acq = acqSum / FACET_ORDER.length;
  const n = TRAIT_ITEMS.length + STATE_ITEMS.length;
  const durationSec = Number(meta.durationSec || 0);

  return {
    total,
    level: levelOf(total),
    hsp: total >= 62,
    facets,
    order,
    top: order[0],
    gapTop: facets[order[0]].score - facets[order[1]].score,
    range: facets[order[0]].score - facets[order[3]].score,
    load,
    rest,
    state: stateOf(load, rest),
    check: {
      rawMean: r2(rawMean),
      sd: r2(sd),
      spread: r2(spread),
      acq: r2(acq),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      midRatio: r2(rawAll.filter((v) => v === 3).length / rawAll.length),
      fast: durationSec > 0 && durationSec < n * 1.6,
    },
  };
}
