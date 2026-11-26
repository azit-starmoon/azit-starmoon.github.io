// AZIT : Star&Moon — 기질과 성품 검사 채점
import { TEMP_ITEMS, CHAR_ITEMS, TEMP_ORDER, CHAR_ORDER, DIM_ORDER } from './items.js';

// 점수는 0~100(문항 평균을 옮긴 값). 집단 규준이 아니라 응답 척도에 묶은 기준점이다.
// 기질은 좋고 나쁨이 없으므로 높은 편/중간/낮은 편으로만 나눈다. 낮은 편 < 40, 중간 40~59, 높은 편 60 이상
export const tempLevel = (v) => (v >= 60 ? 'high' : v >= 40 ? 'mid' : 'low');
// 성품은 자라는 힘이므로 네 단계. 자라는 중 < 40, 보통 40~59, 든든한 편 60~74, 든든함 75 이상
export const charLevel = (v) => (v >= 75 ? 'vhigh' : v >= 60 ? 'high' : v >= 40 ? 'mid' : 'low');

// 기질 유형: 자극 추구, 위험 회피, 사회적 민감성이 척도 가운데(50) 위인지로 여덟 가지
export const TEMP_LINE = 50;
// 성품 모양: 자율성과 연대감이 60(그렇다 쪽으로 기운 응답) 이상인지로 네 가지
export const CHAR_LINE = 60;
export const NEAR = 6; // 기준선에서 이만큼 안쪽이면 '두 모습이 함께 있는' 경계로 본다

export function tempType(d) {
  return ['ns', 'ha', 'rd'].map((k) => (d[k].score >= TEMP_LINE ? 'H' : 'L')).join('');
}
export function charShape(d) {
  const sd = d.sd.score >= CHAR_LINE;
  const co = d.co.score >= CHAR_LINE;
  if (sd && co) return 'whole';
  if (sd) return 'self';
  if (co) return 'others';
  return 'growing';
}

// 응답 점검 기준 (시뮬레이션으로 정함, 응답 방식마다 2만 명).
//  SPREAD_LIMIT 1.1: 같은 차원 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 일곱 차원 평균).
//    일관된 응답 0.0%, 잡음을 키운 응답 1.4%만 걸리고, 무작위 응답은 98%, 반쯤 무작위는 76% 걸림.
//  ACQ_LIMIT 1.4: 정방향 문장과 역문장의 평균 차이(부호 있음). 내용과 상관없이 한쪽으로 기우는 경향.
//    일관된 응답과 무작위 응답은 거의 걸리지 않고, 거의 모든 문장에 '그렇다'를 고른 응답은 모두 걸림.
export const SPREAD_LIMIT = 1.1;
export const ACQ_LIMIT = 1.4;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));
  const all = [...TEMP_ITEMS, ...CHAR_ITEMS];
  let spreadSum = 0;
  let acqSum = 0;
  const dims = {};
  DIM_ORDER.forEach((k) => {
    const its = all.filter((it) => it.dim === k);
    const vals = its.map(val);
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
    const sc = to100(mean(vals));
    dims[k] = { score: sc, level: TEMP_ORDER.includes(k) ? tempLevel(sc) : charLevel(sc) };
  });

  // 가장 두드러진 기질: 가운데(50)에서 가장 멀리 떨어진 것
  const tempOrder = [...TEMP_ORDER].sort((a, b) => Math.abs(dims[b].score - 50) - Math.abs(dims[a].score - 50) || TEMP_ORDER.indexOf(a) - TEMP_ORDER.indexOf(b));
  const charOrder = [...CHAR_ORDER].sort((a, b) => dims[b].score - dims[a].score || CHAR_ORDER.indexOf(a) - CHAR_ORDER.indexOf(b));
  // 키워 갈 성품: 자율성과 연대감 가운데 낮은 쪽(성숙의 두 기둥)
  const grow = dims.sd.score <= dims.co.score ? 'sd' : 'co';
  const charMean = Math.round(mean(CHAR_ORDER.map((k) => dims[k].score)));

  const rawAll = all.map(raw);
  const durationSec = Number(meta.durationSec || 0);
  return {
    dims,
    ttype: tempType(dims),
    near: ['ns', 'ha', 'rd'].filter((k) => Math.abs(dims[k].score - TEMP_LINE) < NEAR),
    shape: charShape(dims),
    tempOrder,
    charOrder,
    grow,
    charMean,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / DIM_ORDER.length),
      acq: r2(acqSum / DIM_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < all.length * 1.6,
    },
  };
}
