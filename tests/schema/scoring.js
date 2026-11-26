// AZIT : Star&Moon — 심리도식 검사 채점
// 도식마다 5문항의 평균(1~6)을 0~100으로 환산하고, '그렇다' 이상(5~6) 응답 개수를 함께 본다.
// 심리도식 검사에서는 평균이 낮아도 강하게 공감한 문항이 몇 개 있으면 그 도식을 살펴보는 경우가 많아서 둘 다 쓴다.
import { ITEMS, SCHEMAS, SCHEMA_ORDER, DOMAINS, COPING_ITEMS } from './items.js';

export const LEVELS = ['strong', 'active', 'mild', 'low'];
export const COPING_KEYS = ['surrender', 'avoid', 'over'];
export const SPREAD_LIMIT = 1.35; // 응답 점검: 같은 도식을 묻는 문장끼리의 평균 표준편차(시뮬레이션으로 정함)

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 1);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 5) * 100);

export function levelOf(m, high) {
  if (m >= 4.8 || high >= 4) return 'strong';
  if (m >= 4.0 || high >= 3) return 'active';
  if (m >= 3.0 || high >= 2) return 'mild';
  return 'low';
}

export function score(answers) {
  const schemas = {};
  let spread = 0;
  let ns = 0;
  SCHEMA_ORDER.forEach((s) => {
    const vals = ITEMS.filter((i) => i.s === s).map((i) => answers[i.id]).filter((x) => typeof x === 'number');
    const m = mean(vals);
    const high = vals.filter((x) => x >= 5).length;
    schemas[s] = { score: to100(m), mean: Math.round(m * 100) / 100, high, level: levelOf(m, high) };
    if (vals.length >= 2) { spread += sd(vals); ns++; }
  });

  const domains = {};
  DOMAINS.forEach((d) => {
    const sc = Math.round(mean(d.schemas.map((s) => schemas[s].score)));
    const act = d.schemas.filter((s) => schemas[s].level === 'strong' || schemas[s].level === 'active').length;
    domains[d.id] = { score: sc, active: act };
  });

  // 강함 → 작동 순으로, 같은 단계에서는 점수가 높은 순
  const rank = (s) => LEVELS.indexOf(schemas[s].level) * 1000 - schemas[s].score;
  const ordered = SCHEMA_ORDER.slice().sort((a, b) => rank(a) - rank(b));
  const active = ordered.filter((s) => schemas[s].level === 'strong' || schemas[s].level === 'active');
  const mild = ordered.filter((s) => schemas[s].level === 'mild');
  // 자세히 볼 규칙: 작동하는 규칙 최대 4개, 없으면 '약간' 수준 최대 3개, 그것도 없으면 비운다
  const top = active.length ? active.slice(0, 4) : mild.slice(0, 3);

  // 대처: 상황마다 1순위 2점, 2순위 1점
  const coping = { surrender: 0, avoid: 0, over: 0 };
  let answered = 0;
  COPING_ITEMS.forEach((it) => {
    const r = answers[it.id];
    if (!Array.isArray(r) || r.length < 2) return;
    answered++;
    if (coping[r[0]] != null) coping[r[0]] += 2;
    if (coping[r[1]] != null) coping[r[1]] += 1;
  });
  const copingOrder = COPING_KEYS.slice().sort((a, b) => coping[b] - coping[a]);
  const copingMax = answered * 2;
  const tie = coping[copingOrder[0]] - coping[copingOrder[1]] <= 1;

  const raw = ITEMS.map((i) => answers[i.id]).filter((x) => typeof x === 'number');
  const check = {
    rawMean: Math.round(mean(raw) * 100) / 100,
    sd: Math.round(sd(raw) * 100) / 100,
    highRatio: Math.round((raw.filter((x) => x >= 5).length / Math.max(1, raw.length)) * 100) / 100,
    lowRatio: Math.round((raw.filter((x) => x <= 2).length / Math.max(1, raw.length)) * 100) / 100,
    spread: ns ? Math.round((spread / ns) * 100) / 100 : 0,
  };

  return {
    version: '1.0',
    schemas,
    domains,
    ordered,
    active,
    top,
    coping,
    copingOrder,
    copingMax,
    copingTie: tie,
    primaryCoping: copingOrder[0],
    check,
    topNames: top.slice(0, 3).map((s) => SCHEMAS[s].name),
  };
}
