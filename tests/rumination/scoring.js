// AZIT : Star&Moon — 곱씹기와 돌아보기 검사 채점
import { ITEMS, SCALE_ORDER } from './items.js';

// 수준(0~100): 집단 규준이 아니라 문항 평균에 묶은 기준점(감각처리 민감성 검사와 같음).
export const levelOf = (v) => (v >= 75 ? 'vhigh' : v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

// 생각 지도: 두 점수가 50을 넘는지로 네 모양
//  돌아보기만 높음 → 길을 찾는 생각(reflect), 둘 다 높음 → 깊고 무거운 생각(deep),
//  곱씹기만 높음 → 제자리를 맴도는 생각(circle), 둘 다 낮음 → 가볍게 흘려보내는 생각(light)
export function typeOf(br, rf) {
  if (rf > 50) return br > 50 ? 'deep' : 'reflect';
  return br > 50 ? 'circle' : 'light';
}

// 응답 점검 기준 (시뮬레이션으로 정함, 각 2만 명. tools/validate.mjs와 같은 모의 응답 모형)
//  SPREAD_LIMIT 1.2: 같은 갈래 문항끼리의 흩어짐(반대 방향 문항을 돌린 뒤 표준편차의 평균).
//  ACQ_LIMIT 1.4: 갈래마다 정방향 여섯 문항 평균과 반대 방향 두 문항 평균의 차이(부호 있음)의 평균.
//  거의 같은 답(전체 표준편차 0.5 미만)과 합쳐, 일관된 응답은 1.5%(문항 난이도가 제각각이고 부하가 0.5로 약한 경우 3.0%)만 걸리고,
//  무작위 응답은 74%, 반쯤 무작위는 25%, '그렇다'만 고른 응답은 모두 걸림. 일관된 응답에서 걸리는 몫은 대부분 '거의 같은 답'이다(16문항이라 보통 쪽 답이 몰리면 생김).
export const SPREAD_LIMIT = 1.2;
export const ACQ_LIMIT = 1.4;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));
  const scales = {};
  let spreadSum = 0;
  let acqSum = 0;
  SCALE_ORDER.forEach((k) => {
    const its = ITEMS.filter((it) => it.scale === k);
    const vals = its.map(val);
    const sc = to100(mean(vals));
    scales[k] = { score: sc, level: levelOf(sc) };
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
  });
  const br = scales.br.score;
  const rf = scales.rf.score;
  const rawAll = ITEMS.map(raw);
  const durationSec = Number(meta.durationSec || 0);
  return {
    br,
    rf,
    scales,
    type: typeOf(br, rf),
    balance: rf - br, // 돌아보기가 곱씹기보다 얼마나 앞서는지(음수면 곱씹기가 앞섬)
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / SCALE_ORDER.length),
      acq: r2(acqSum / SCALE_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      midRatio: r2(rawAll.filter((v) => v === 3).length / rawAll.length),
      fast: durationSec > 0 && durationSec < ITEMS.length * 1.6,
    },
  };
}
