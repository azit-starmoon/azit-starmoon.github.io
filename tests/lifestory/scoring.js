// AZIT : Star&Moon — 생애 이야기 검사 채점
// 글로 적은 이야기는 점수로 바꾸지 않는다. 결과지는 응답(answers)에서 글을 직접 읽고,
// 공유 링크에는 글이 담기지 않는다(점수만 담김).
import { MEANING_ITEMS, STORY_ITEMS, REFLECT_ITEMS, THEME_ORDER } from './items.js';

// 수준(0~100). 집단 규준이 아니라 문항 평균에 묶은 기준점이다. 낮음 < 40, 보통 40~59, 높음 60 이상
export const levelOf = (v) => (v >= 60 ? 'high' : v >= 40 ? 'mid' : 'low');

// 의미 지도: 의미를 느끼는 정도(세로)와 찾는 정도(가로)가 55를 넘는지로 네 자리
export const MAP_LINE = 55;
export function stateOf(pr, se) {
  if (pr >= MAP_LINE) return se >= MAP_LINE ? 'deepening' : 'settled';
  return se >= MAP_LINE ? 'seeking' : 'pausing';
}

// 응답 점검 기준 (시뮬레이션으로 정함, 응답 방식마다 2만 명). 1부와 3부(리커트 22문항, 여섯 척도)로 본다.
//  SPREAD_LIMIT 1.0: 같은 척도 문항끼리의 흩어짐(역문항을 돌린 뒤 표준편차의 평균).
//    일관된 응답 0.3%, 잡음을 키운 응답 5.4%만 걸리고, 무작위 응답은 73%, 반쯤 무작위는 48% 걸림.
//    척도마다 문항이 3~5개라 다른 검사보다 무작위를 덜 잡으므로, 글로 적은 답과 함께 읽는다.
//  ACQ_LIMIT 1.5: 정방향 문장과 역문장의 평균 차이(부호 있음). 일관된 응답 0.1%, 무작위 3%, '그렇다' 일변도는 모두 걸림.
export const SPREAD_LIMIT = 1.0;
export const ACQ_LIMIT = 1.5;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const val = (it) => (it.r ? 6 - raw(it) : raw(it));
  let spreadSum = 0;
  let acqSum = 0;
  let nScales = 0;
  const scaleScore = (its) => {
    const vals = its.map(val);
    spreadSum += sdOf(vals);
    acqSum += mean(its.filter((it) => !it.r).map(val)) - mean(its.filter((it) => it.r).map(val));
    nScales++;
    return to100(mean(vals));
  };
  const pr = scaleScore(MEANING_ITEMS.filter((it) => it.scale === 'pr'));
  const se = scaleScore(MEANING_ITEMS.filter((it) => it.scale === 'se'));
  const themes = {};
  THEME_ORDER.forEach((k) => {
    const sc = scaleScore(REFLECT_ITEMS.filter((it) => it.theme === k));
    themes[k] = { score: sc, level: levelOf(sc) };
  });
  const themeOrder = [...THEME_ORDER].sort((a, b) => themes[b].score - themes[a].score || THEME_ORDER.indexOf(a) - THEME_ORDER.indexOf(b));

  const texts = STORY_ITEMS.map((it) => (typeof answers[it.id] === 'string' ? answers[it.id].trim() : ''));
  const written = texts.filter((t) => t.length > 0).length;
  const chars = texts.reduce((s, t) => s + t.length, 0);

  const likert = [...MEANING_ITEMS, ...REFLECT_ITEMS];
  const rawAll = likert.map(raw);
  const durationSec = Number(meta.durationSec || 0);
  return {
    pr,
    se,
    prLevel: levelOf(pr),
    seLevel: levelOf(se),
    state: stateOf(pr, se),
    themes,
    themeOrder,
    written,
    chars,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      spread: r2(spreadSum / nScales),
      acq: r2(acqSum / nScales),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < likert.length * 1.6 + written * 20,
    },
  };
}
