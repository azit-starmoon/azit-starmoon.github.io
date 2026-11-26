// AZIT : Star&Moon — 성인 애착 유형 검사 채점
// 불안과 회피를 0~100으로 환산하고(50 = '보통이다'), 두 축이 50 이상인지로 네 유형을 나눈다.
import { GENERAL_ITEMS, FACETS, TARGETS, targetItems } from './items.js';

export const STYLE_ORDER = ['secure', 'anxious', 'fearful', 'avoidant']; // 지도에서 왼쪽 아래부터 시계 방향
export const STYLE_NAMES = { secure: '안정형', anxious: '불안형', fearful: '두려움-회피형', avoidant: '회피형' };
export const BORDER = 8; // 축의 가운데(50)에서 이만큼 안쪽이면 경계로 본다
export const GAP_LIMIT = 1.2; // 응답 점검: 같은 요인 안에서 반대 문장과 어긋난 정도. 일관된 응답은 약 1%, 무작위 응답은 약 70%가 넘는다(시뮬레이션)

const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 3);

export const levelOf = (v) => (v > 60 ? 'high' : v < 40 ? 'low' : 'mid');

// 평균 응답이 '보통이다'(50)를 넘어야 높은 쪽으로 본다
const hi = (v) => v > 50;

export function classify(anx, avo) {
  if (hi(anx)) return hi(avo) ? 'fearful' : 'anxious';
  return hi(avo) ? 'avoidant' : 'secure';
}

// 경계 가까이 있으면 넘어가기 쉬운 이웃 유형
export function neighborsOf(anx, avo) {
  const out = [];
  if (Math.abs(anx - 50) < BORDER) out.push(classify(hi(anx) ? 50 : 51, avo));
  if (Math.abs(avo - 50) < BORDER) out.push(classify(anx, hi(avo) ? 50 : 51));
  return out;
}

export function score(answers) {
  const val = (it) => {
    const r = answers[it.id];
    if (typeof r !== 'number') return null;
    return it.key > 0 ? r : 6 - r;
  };
  const scored = (list) => list.map(val).filter((x) => x != null);

  const facets = {};
  Object.keys(FACETS).forEach((f) => {
    const sc = to100(mean(scored(GENERAL_ITEMS.filter((i) => i.f === f))));
    facets[f] = { score: sc, level: levelOf(sc) };
  });
  const anx = to100(mean(scored(GENERAL_ITEMS.filter((i) => i.d === 'anx'))));
  const avo = to100(mean(scored(GENERAL_ITEMS.filter((i) => i.d === 'avo'))));
  const amb = to100(mean(scored(GENERAL_ITEMS.filter((i) => i.d === 'amb'))));
  const style = classify(anx, avo);
  const margin = Math.min(Math.abs(anx - 50), Math.abs(avo - 50));
  const conf = margin >= 15 ? 'clear' : margin >= BORDER ? 'moderate' : 'border';

  const targets = {};
  TARGETS.forEach((t) => {
    const its = targetItems(t);
    if (its.some((i) => typeof answers[i.id] !== 'number')) { targets[t.id] = { skipped: true }; return; }
    const a = to100(mean(scored(its.filter((i) => i.d === 'anx'))));
    const o = to100(mean(scored(its.filter((i) => i.d === 'avo'))));
    targets[t.id] = { skipped: false, anx: a, avo: o, style: classify(a, o) };
  });

  // 응답 점검 (1부 36문항 기준)
  const raw = GENERAL_ITEMS.map((i) => answers[i.id]).filter((x) => typeof x === 'number');
  const rawMean = mean(raw);
  const sd = Math.sqrt(mean(raw.map((x) => (x - rawMean) ** 2)));
  let gap = 0;
  let clashes = 0;
  let nf = 0;
  Object.keys(FACETS).forEach((f) => {
    const its = GENERAL_ITEMS.filter((i) => i.f === f);
    const fwd = its.filter((i) => i.key > 0).map((i) => answers[i.id]).filter((x) => typeof x === 'number');
    const rev = its.find((i) => i.key < 0);
    const r = rev ? answers[rev.id] : null;
    if (!fwd.length || typeof r !== 'number') return;
    const fm = mean(fwd);
    gap += Math.abs(fm - (6 - r));
    if ((fm >= 4 && r >= 4) || (fm <= 2 && r <= 2)) clashes++;
    nf++;
  });
  const check = {
    rawMean: Math.round(rawMean * 100) / 100,
    sd: Math.round(sd * 100) / 100,
    extremeRatio: Math.round((raw.filter((x) => x === 1 || x === 5).length / Math.max(1, raw.length)) * 100) / 100,
    midRatio: Math.round((raw.filter((x) => x === 3).length / Math.max(1, raw.length)) * 100) / 100,
    gap: nf ? Math.round((gap / nf) * 100) / 100 : 0,
    clashRatio: nf ? Math.round((clashes / nf) * 100) / 100 : 0,
  };

  return {
    version: '1.0',
    anx,
    avo,
    amb,
    levels: { anx: levelOf(anx), avo: levelOf(avo), amb: levelOf(amb) },
    facets,
    style,
    styleName: STYLE_NAMES[style],
    margin,
    conf,
    near: neighborsOf(anx, avo),
    targets,
    check,
  };
}
