// AZIT : Star&Moon — 대인관계 패턴 검사 채점
import { ITEMS, OCTANTS, OCTANT_ORDER } from './items.js';

// 수준(0~100): 집단 규준이 아니라 문항 평균에 묶은 기준점(감각처리 민감성 검사와 같음).
//  낮음 < 38 (평균 2.5 미만), 보통 38~61, 높음 62~74 (평균 3.5~4.0), 매우 높음 75 이상
export const levelOf = (v) => (v >= 75 ? 'vhigh' : v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

// 원형 구조 요약(structural summary): 여덟 방향 점수를 원 위의 자리(도)에 놓고 코사인 곡선에 맞춘다.
//  lov = 0.25 Σ s·cos θ (다가감 +, 거리 둠 -), dom = 0.25 Σ s·sin θ (주도 +, 물러섬 -)
//  amp(기울기) = √(lov² + dom²): 가장 기운 방향이 내 평균보다 몇 점 높은지(맞은편은 그만큼 낮음)
//  angle(기우는 방향, 도), fit(R²): 여덟 점수가 그 곡선에 얼마나 들어맞는지. 0.7보다 낮으면 두 갈래 이상으로 나뉜 모양
// 기울기 기준: 6점 미만은 '고른 모양'(기우는 방향을 말하지 않음), 6~11은 '조금', 12 이상은 '뚜렷함'.
//  6점은 리커트 0.24칸, 12점은 0.48칸 정도의 차이다. 집단 자료로 정한 값이 아니라 해석의 기준점이다.
export const AMP_NONE = 6;
export const AMP_CLEAR = 12;
export const FIT_MIN = 0.7;

// 응답 점검 기준 (시뮬레이션으로 정함, 각 2만 명. tools/validate.mjs와 같은 모의 응답 모형)
//  SPREAD_LIMIT 1.1: 같은 방향 문항끼리의 흩어짐(반대 방향 문항을 돌린 뒤 표준편차의 평균).
//    일관된 응답 0%(문항 난이도가 제각각이고 부하가 0.5로 약한 경우에도 0.4%)만 걸리고, 무작위 응답은 85%, 반쯤 무작위는 18% 걸림.
//  ACQ_LIMIT 1.2: 방향마다 정방향 네 문항 평균과 반대 방향 문항의 차이(부호 있음)의 평균.
//    문장 내용과 상관없이 '그렇다'(또는 '아니다') 쪽으로 기우는 경향. 일관된 응답은 0.1% 안팎만, '그렇다'만 고른 응답은 모두 걸림.
export const SPREAD_LIMIT = 1.1;
export const ACQ_LIMIT = 1.2;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;
const rad = (d) => (d * Math.PI) / 180;
const rnd = (x) => Math.round(x) || 0; // -0을 0으로

// 각도 → 가장 가까운 방향
export function octantAt(angle) {
  const a = ((angle % 360) + 360) % 360;
  return OCTANT_ORDER.reduce((best, k) => {
    const d = Math.min(Math.abs(OCTANTS[k].angle - a), 360 - Math.abs(OCTANTS[k].angle - a));
    return d < best.d ? { k, d } : best;
  }, { k: OCTANT_ORDER[0], d: 999 }).k;
}

// 제목에 쓰는 '기우는 방향' (2026.11.28 고침)
//  원형 분석에서는 여덟 점수가 원 모양에 잘 들어맞을 때(R² 0.7 이상)만 각도를 해석한다. 잘 맞지 않으면 화살표가
//  실제 점수가 낮은 방향을 가리킬 수도 있다(예: 기울기 6, R² 0.5에서 점수 25인 '의심하고 맞섬'을 가리킴).
//   - 기울기 6 미만: 고른 모양
//   - 원 모양에 잘 맞지 않고(두 갈래 이상) 기울기도 12 미만: 고른 모양
//   - 원 모양에 잘 맞지 않지만 기울기가 12 이상: 각도 대신 실제로 가장 높은 방향
//   - 그 밖: 각도가 가리키는 방향
//  저장된 결과도 이 함수로 다시 읽는다(예전 결과에 저장된 style은 쓰지 않는다).
export function styleOf(s) {
  const amp = Number(s && s.amp) || 0;
  const fit = Number(s && s.fit);
  if (amp < AMP_NONE) return 'even';
  if (Number.isFinite(fit) && fit < FIT_MIN) return amp < AMP_CLEAR ? 'even' : (OCTANTS[s.top] ? s.top : octantAt(s.angle));
  return octantAt(s.angle);
}

// 여덟 방향 점수 → 구조 요약
export function summarize(scores) {
  const s = OCTANT_ORDER.map((k) => scores[k]);
  const elevRaw = mean(s);
  let lov = 0;
  let dom = 0;
  OCTANT_ORDER.forEach((k, i) => { lov += 0.25 * s[i] * Math.cos(rad(OCTANTS[k].angle)); dom += 0.25 * s[i] * Math.sin(rad(OCTANTS[k].angle)); });
  const amp = Math.sqrt(lov * lov + dom * dom);
  const angle = ((Math.atan2(dom, lov) * 180) / Math.PI + 360) % 360;
  const ssTot = s.reduce((t, v) => t + (v - elevRaw) ** 2, 0);
  const ssRes = OCTANT_ORDER.reduce((t, k, i) => t + (s[i] - (elevRaw + amp * Math.cos(rad(OCTANTS[k].angle - angle)))) ** 2, 0);
  const fit = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { elev: rnd(elevRaw), lov: rnd(lov), dom: rnd(dom), amp: rnd(amp), angle: rnd(angle) % 360, fit: r2(fit) };
}

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));

  const octants = {};
  const plain = {};
  let spreadSum = 0;
  let acqSum = 0;
  OCTANT_ORDER.forEach((k) => {
    const its = ITEMS.filter((it) => it.octant === k);
    const vals = its.map(val);
    const sc = to100(mean(vals));
    octants[k] = { score: sc, level: levelOf(sc) };
    plain[k] = sc;
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
  });
  const order = [...OCTANT_ORDER].sort((a, b) => plain[b] - plain[a] || OCTANT_ORDER.indexOf(a) - OCTANT_ORDER.indexOf(b));
  const sum = summarize(plain);
  const tilt = sum.amp < AMP_NONE ? 'none' : sum.amp < AMP_CLEAR ? 'mild' : 'clear';
  const style = styleOf({ ...sum, top: order[0] });

  const rawAll = ITEMS.map(raw);
  const durationSec = Number(meta.durationSec || 0);
  return {
    octants,
    order,
    top: order[0],
    elev: sum.elev,
    level: levelOf(sum.elev),
    lov: sum.lov,
    dom: sum.dom,
    amp: sum.amp,
    angle: sum.angle,
    fit: sum.fit,
    tilt,
    style,
    complex: tilt !== 'none' && sum.fit < FIT_MIN,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / OCTANT_ORDER.length),
      acq: r2(acqSum / OCTANT_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      midRatio: r2(rawAll.filter((v) => v === 3).length / rawAll.length),
      fast: durationSec > 0 && durationSec < ITEMS.length * 1.6,
    },
  };
}
