// AZIT : Star&Moon — 에니어그램 채점
import { LIKERT_ITEMS, MOTIVE_DIMS, INSTINCT_SETS } from './items.js';

export const TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const CENTER_OF = { 1: 'gut', 2: 'heart', 3: 'heart', 4: 'heart', 5: 'head', 6: 'head', 7: 'head', 8: 'gut', 9: 'gut' };
export const CENTER_TYPES = { gut: [8, 9, 1], heart: [2, 3, 4], head: [5, 6, 7] };
export const CENTER_ORDER = ['gut', 'heart', 'head'];
export const WING_OF = { 1: [9, 2], 2: [1, 3], 3: [2, 4], 4: [3, 5], 5: [4, 6], 6: [5, 7], 7: [6, 8], 8: [7, 9], 9: [8, 1] };
export const STRESS = { 1: 4, 2: 8, 3: 9, 4: 2, 5: 7, 6: 3, 7: 1, 8: 5, 9: 6 };
export const GROWTH = { 1: 7, 2: 4, 3: 6, 4: 1, 5: 8, 6: 9, 7: 5, 8: 2, 9: 3 };
export const HORNEVIAN = { assertive: [3, 7, 8], compliant: [1, 2, 6], withdrawn: [4, 5, 9] };
export const HARMONIC = { positive: [2, 7, 9], competency: [1, 3, 5], reactive: [4, 6, 8] };
export const INSTINCTS = ['sp', 'so', 'sx'];

// 최종 점수 = 1부 성향 점수 45% + 2부 동기 비교 55%
const W_LIKERT = 0.45;
const W_MOTIVE = 0.55;
// 핵심 유형 확신도 기준 (1·2위 최종 점수 차)
const CONF_HIGH = 0.15;
const CONF_MID = 0.06;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const round1 = (x) => Math.round(x * 10) / 10;
const round3 = (x) => Math.round(x * 1000) / 1000;
const groupOf = (map, t) => Object.keys(map).find((k) => map[k].includes(t));

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function likertStats(answers) {
  const byType = {};
  TYPES.forEach((t) => (byType[t] = []));
  const all = [];
  LIKERT_ITEMS.forEach((it) => {
    const v = answers[it.id];
    if (typeof v === 'number' && v >= 1 && v <= 5) {
      byType[it.type].push(v);
      all.push(v);
    }
  });
  const typeMean = {};
  const typeScore = {};
  TYPES.forEach((t) => {
    const m = byType[t].length ? mean(byType[t]) : 3;
    typeMean[t] = round3(m);
    typeScore[t] = Math.round(((m - 1) / 4) * 100);
  });
  const overall = all.length ? mean(all) : 3;
  const sd = all.length ? Math.sqrt(mean(all.map((x) => (x - overall) ** 2))) : 0;
  const typeSpread = Math.sqrt(mean(TYPES.map((t) => (typeMean[t] - mean(TYPES.map((u) => typeMean[u]))) ** 2)));
  return {
    typeMean,
    typeScore,
    overallMean: round3(overall),
    sd: round3(sd),
    typeSpread: round3(typeSpread),
    extremeRatio: round3(all.length ? all.filter((x) => x === 1 || x === 5).length / all.length : 0),
    midRatio: round3(all.length ? all.filter((x) => x === 3).length / all.length : 0),
    agreeRatio: round3(all.length ? all.filter((x) => x >= 4).length / all.length : 0),
    answered: all.length,
  };
}

export function topCandidates(answers, k = 3) {
  const { typeMean } = likertStats(answers);
  return TYPES.slice().sort((a, b) => typeMean[b] - typeMean[a] || a - b).slice(0, k);
}

// 2부 문항: 상위 3개 유형의 세 쌍 × 동기 차원 6개 = 18문항
export function buildMotiveItems(answers) {
  const c = topCandidates(answers, 3);
  const pairs = [
    [c[0], c[1]],
    [c[0], c[2]],
    [c[1], c[2]],
  ];
  const items = [];
  const n = MOTIVE_DIMS.length * pairs.length;
  for (let k = 0; k < n; k++) {
    const dim = MOTIVE_DIMS[k % MOTIVE_DIMS.length];
    const pair = pairs[(k + Math.floor(k / MOTIVE_DIMS.length)) % pairs.length];
    const lo = Math.min(pair[0], pair[1]);
    const hi = Math.max(pair[0], pair[1]);
    const id = `m_${dim.id}_${lo}${hi}`;
    const flip = hash(id) % 2 === 1;
    const top = flip ? hi : lo;
    const bottom = flip ? lo : hi;
    items.push({
      id,
      dim: dim.id,
      label: dim.label,
      prompt: dim.prompt,
      lo,
      hi,
      a: { type: top, text: dim.s[top] },
      b: { type: bottom, text: dim.s[bottom] },
    });
  }
  return items;
}

export function motiveScore(answers, candidates) {
  const points = {};
  const max = {};
  candidates.forEach((t) => {
    points[t] = 0;
    max[t] = 0;
  });
  const duels = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const lo = Math.min(candidates[i], candidates[j]);
      const hi = Math.max(candidates[i], candidates[j]);
      const byDim = {};
      let loWins = 0;
      let hiWins = 0;
      MOTIVE_DIMS.forEach((dim) => {
        const v = answers[`m_${dim.id}_${lo}${hi}`];
        if (typeof v !== 'number' || v === 0) return;
        const winner = v > 0 ? lo : hi;
        const strength = Math.abs(v);
        points[winner] += strength;
        max[lo] += 2;
        max[hi] += 2;
        byDim[dim.id] = { winner, strength };
        if (winner === lo) loWins++;
        else hiWins++;
      });
      duels.push({ a: lo, b: hi, byDim, wins: { [lo]: loWins, [hi]: hiWins } });
    }
  }
  const share = {};
  candidates.forEach((t) => (share[t] = max[t] ? round3(points[t] / max[t]) : 0.5));
  return { candidates, points, max, share, duels };
}

export function instinctScore(answers) {
  const pts = { sp: 0, so: 0, sx: 0 };
  let answered = 0;
  INSTINCT_SETS.forEach((set) => {
    const r = answers[set.id];
    if (Array.isArray(r) && r.length >= 2) {
      answered++;
      pts[r[0]] += 2;
      pts[r[1]] += 1;
    }
  });
  const max = answered * 2 || 1;
  const stack = INSTINCTS.slice().sort((a, b) => pts[b] - pts[a] || INSTINCTS.indexOf(a) - INSTINCTS.indexOf(b));
  const score = {};
  INSTINCTS.forEach((k) => (score[k] = Math.round((pts[k] / max) * 100)));
  const gapTop = pts[stack[0]] - pts[stack[1]];
  return { points: pts, score, stack, dominant: stack[0], blind: stack[2], tiedTop: gapTop <= 1, answered };
}

export function score(answers, meta = {}) {
  const st = likertStats(answers);
  const candidates = topCandidates(answers, 3);
  const mot = motiveScore(answers, candidates);

  const final = {};
  candidates.forEach((t) => {
    const L = (st.typeMean[t] - 1) / 4;
    final[t] = round3(W_LIKERT * L + W_MOTIVE * mot.share[t]);
  });
  const ranking = candidates.slice().sort((a, b) => final[b] - final[a] || st.typeMean[b] - st.typeMean[a] || a - b);
  const core = ranking[0];
  const margin = round3(final[ranking[0]] - final[ranking[1]]);
  const confidence = margin >= CONF_HIGH ? 'high' : margin >= CONF_MID ? 'mid' : 'low';

  const [w1, w2] = WING_OF[core];
  const wingDiff = st.typeMean[w1] - st.typeMean[w2];
  const wing = wingDiff >= 0 ? w1 : w2;
  const wingBalanced = Math.abs(wingDiff) < 0.15;

  const coreCenter = CENTER_OF[core];
  const others = CENTER_ORDER.filter((c) => c !== coreCenter).map((c) => {
    const best = CENTER_TYPES[c].slice().sort((a, b) => st.typeMean[b] - st.typeMean[a] || a - b)[0];
    return best;
  });
  others.sort((a, b) => st.typeMean[b] - st.typeMean[a] || a - b);
  const tritype = [core, ...others];

  const centers = {};
  CENTER_ORDER.forEach((c) => (centers[c] = Math.round(mean(CENTER_TYPES[c].map((t) => st.typeScore[t])))));
  const hornevian = {};
  Object.keys(HORNEVIAN).forEach((g) => (hornevian[g] = Math.round(mean(HORNEVIAN[g].map((t) => st.typeScore[t])))));
  const harmonic = {};
  Object.keys(HARMONIC).forEach((g) => (harmonic[g] = Math.round(mean(HARMONIC[g].map((t) => st.typeScore[t])))));

  const inst = instinctScore(answers);

  return {
    v: 1,
    core,
    wing,
    wingBalanced,
    wingDiff: round3(wingDiff),
    tritype,
    instinct: inst,
    subtype: `${inst.dominant}${core}`,
    likert: st,
    motive: mot,
    final,
    ranking,
    margin,
    confidence,
    centers,
    groups: {
      hornevian,
      harmonic,
      coreHornevian: groupOf(HORNEVIAN, core),
      coreHarmonic: groupOf(HARMONIC, core),
    },
    durationSec: meta.durationSec || null,
  };
}

export { round1 };
