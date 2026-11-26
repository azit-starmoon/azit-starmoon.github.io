// AZIT : Star&Moon — 자아분화 검사 채점
import { ITEMS, FACETS, FACET_ORDER } from './items.js';

// 지표 점수는 0~100(문항 평균을 옮긴 값, 높을수록 그 지표가 강함). 집단 규준이 아니라 응답 척도에 묶은 기준점이다.
// 분화 지수 = 내 입장 지키기와, 나머지 세 지표를 뒤집은 값(100-점수)의 평균.
export const levelOf = (v) => (v >= 75 ? 'vhigh' : v >= 60 ? 'high' : v >= 40 ? 'mid' : 'low');

// 관계 방식: 융합과 단절이 50(보통) 이상인지로 네 가지
export const STYLE_LINE = 50;
export function styleOf(fo, ec) {
  if (fo >= STYLE_LINE && ec >= STYLE_LINE) return 'swing';
  if (fo >= STYLE_LINE) return 'fusion';
  if (ec >= STYLE_LINE) return 'cutoff';
  return 'balanced';
}

// 응답 점검 기준 (시뮬레이션으로 정함, 응답 방식마다 2만 명).
//  SPREAD_LIMIT 1.15: 같은 지표 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 네 지표 평균).
//    일관된 응답 0.0%, 잡음을 키운 응답 2.0%만 걸리고, 무작위 응답은 89%, 반쯤 무작위는 56% 걸림.
//  ACQ_LIMIT 1.4: 정방향 문장과 역문장의 평균 차이(부호 있음). 일관된 응답 0.0%, 무작위 1.5%, '그렇다' 일변도는 모두 걸림.
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
  const facets = {};
  FACET_ORDER.forEach((k) => {
    const its = ITEMS.filter((it) => it.facet === k);
    const vals = its.map(val);
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
    const sc = to100(mean(vals));
    facets[k] = { score: sc, level: levelOf(sc) };
  });
  // 분화 쪽으로 돌린 값(높을수록 분화)
  const toward = Object.fromEntries(FACET_ORDER.map((k) => [k, FACETS[k].dir === 'up' ? facets[k].score : 100 - facets[k].score]));
  const total = Math.round(mean(FACET_ORDER.map((k) => toward[k])));
  const order = [...FACET_ORDER].sort((a, b) => toward[a] - toward[b] || FACET_ORDER.indexOf(a) - FACET_ORDER.indexOf(b)); // 가장 키울 곳부터

  // 가족 장면 문항: 분화가 덜 된 쪽으로 답한 정도(1~5)
  const family = ITEMS.filter((it) => it.family).map((it) => {
    const r = raw(it);
    const less = FACETS[it.facet].dir === 'up' ? (it.r ? r : 6 - r) : (it.r ? 6 - r : r);
    return { id: it.id, raw: r, strain: less };
  });

  const rawAll = ITEMS.map(raw);
  const durationSec = Number(meta.durationSec || 0);
  return {
    facets,
    toward,
    total,
    level: levelOf(total),
    style: styleOf(facets.fo.score, facets.ec.score),
    order,
    grow: order[0],
    family,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / FACET_ORDER.length),
      acq: r2(acqSum / FACET_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < ITEMS.length * 1.6,
    },
  };
}
