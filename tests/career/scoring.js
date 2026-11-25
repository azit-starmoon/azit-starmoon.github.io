// AZIT : Star&Moon — 진로 흥미 검사 채점
import { ITEMS, TYPE_ORDER, TYPES, hexDist } from './items.js';

// 유형 점수: 열 문항 평균(1~5, 반대 방향 문항은 돌려서)을 0~100으로 옮긴 값.
// 흥미 코드: 점수가 높은 차례로 세 유형의 글자(예: SAE). 점수가 같으면 육각형 차례(R I A S E C)로 정한다.
// 일관도: 코드 첫 두 글자가 육각형에서 이웃하면 높음, 한 칸 건너면 보통, 맞은편이면 낮음.
// 변별도: 가장 높은 유형과 가장 낮은 유형의 점수 차이. 흥미가 얼마나 뚜렷하게 갈라져 있는지를 본다.
// 흥미 수준: 여섯 유형 점수의 평균. 전반적으로 일에 마음이 얼마나 열려 있는지를 본다.
export const DIFF_HIGH = 40;
export const DIFF_LOW = 20;
export const ELEV_LOW = 35;
export const ELEV_HIGH = 70;
// 두 유형 점수 차이가 이보다 작으면 자리가 바뀌어도 이상하지 않다고 본다(문항 하나 응답이 한 칸 바뀌면 2.5점).
export const CLOSE = 5;

// 응답 점검 기준 (시뮬레이션으로 정함, node로 각 2만 명, 이 파일의 score로 계산)
//  일관된 응답: 사람마다 흥미 수준(평균 2.4~3.8), 육각형 위 방향(무작위 각도)과 세기(0.3~1.4)를 정하고,
//    유형마다 고유 치우침(SD 0.4), 문항마다 치우침(SD 0.35), 사람마다 '그렇다'로 기우는 버릇(SD 0.2), 잡음(SD 0.7)을 더해
//    1~5로 반올림. 반대 방향 문항은 6에서 뺀 값으로 답한다고 본다.
//  SPREAD_LIMIT: 같은 유형 열 문항끼리의 흩어짐(반대 방향을 돌린 뒤 표준편차, 유형 평균).
//  ACQ_LIMIT: 정방향 문항 평균과 반대 방향 문항 평균(돌린 값)의 차이. 내용과 상관없이 '그렇다' 쪽으로 기우는 경향.
//  SPREAD_LIMIT 1.15: 일관된 응답 0.0%(잡음을 0.9로 키우면 0.1%)만 걸리고, 무작위 응답은 97.9% 걸림.
//  ACQ_LIMIT 1.1: 일관된 응답 1.0~1.2%, 무작위 응답 0.6%만 걸리고, 거의 모든 문장에 4~5를 고른 응답은 모두 걸림.
//  둘 중 하나라도 걸린 비율: 일관된 응답 1.0~1.3%, 무작위 응답 97.9%.
//  참고로 변별도(최고−최저)는 일관된 응답에서 중앙값 48(10% 28, 90% 68), 무작위 응답에서 중앙값 28이었다.
export const SPREAD_LIMIT = 1.15;
export const ACQ_LIMIT = 1.1;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export const consistencyOf = (a, b) => ({ 1: 'high', 2: 'mid', 3: 'low' }[hexDist(a, b)] || 'mid');
export const diffLevel = (d) => (d >= DIFF_HIGH ? 'high' : d < DIFF_LOW ? 'low' : 'mid');
export const elevLevel = (m) => (m < ELEV_LOW ? 'low' : m > ELEV_HIGH ? 'high' : 'mid');

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));

  const exact = {};
  let spreadSum = 0;
  let acqSum = 0;
  TYPE_ORDER.forEach((t) => {
    const its = ITEMS.filter((it) => it.type === t);
    const vals = its.map(val);
    exact[t] = mean(vals);
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(raw)) - mean(its.filter((it) => it.r).map(val));
  });
  const order = [...TYPE_ORDER].sort((a, b) => exact[b] - exact[a] || TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
  const types = {};
  order.forEach((t, i) => { types[t] = { score: to100(exact[t]), rank: i + 1 }; });
  const sc = (t) => types[t].score;

  const code = order.slice(0, 3);
  const diff = sc(order[0]) - sc(order[5]);
  const elevation = Math.round(mean(TYPE_ORDER.map(sc)));

  // 자리가 바뀌어도 이상하지 않은 이웃 코드(1·2위, 2·3위, 3·4위 차이가 CLOSE보다 작을 때)
  const alts = [];
  const swap = (i, j) => { const o = [...order]; [o[i], o[j]] = [o[j], o[i]]; return o.slice(0, 3); };
  if (sc(order[0]) - sc(order[1]) < CLOSE) alts.push(swap(0, 1));
  if (sc(order[1]) - sc(order[2]) < CLOSE) alts.push(swap(1, 2));
  if (sc(order[2]) - sc(order[3]) < CLOSE) alts.push(swap(2, 3));

  const rawAll = ITEMS.map(raw);
  const durationSec = Number(meta.durationSec || 0);

  return {
    types,
    order,
    code,
    codeText: code.map((t) => TYPES[t].letter).join(''),
    top: order[0],
    alts: alts.map((o) => o.map((t) => TYPES[t].letter).join('')),
    consistency: consistencyOf(order[0], order[1]),
    diff,
    diffLevel: diffLevel(diff),
    elevation,
    elevLevel: elevLevel(elevation),
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / TYPE_ORDER.length),
      acq: r2(acqSum / TYPE_ORDER.length),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < ITEMS.length * 2,
    },
  };
}
