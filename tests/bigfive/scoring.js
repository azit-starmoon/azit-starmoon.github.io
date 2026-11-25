// AZIT : Star&Moon — 빅파이브 채점
import { ITEMS, FACETS, DOMAIN_ORDER } from './items.js';

export const LEVEL_LOW = 40;
export const LEVEL_HIGH = 60;

export function levelOf(score) {
  if (score > LEVEL_HIGH) return 'high';
  if (score < LEVEL_LOW) return 'low';
  return 'mid';
}

// 두 영역을 엮어 보는 스타일 10가지 (x축 영역, y축 영역)
export const STYLE_PAIRS = [
  ['N', 'E'], ['N', 'O'], ['N', 'A'], ['N', 'C'],
  ['E', 'O'], ['E', 'A'], ['E', 'C'],
  ['O', 'A'], ['O', 'C'], ['A', 'C'],
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r3 = (x) => Math.round(x * 1000) / 1000;

export function score(answers, meta = {}) {
  const byFacet = {};
  Object.keys(FACETS).forEach((f) => (byFacet[f] = []));
  const raw = [];
  ITEMS.forEach((it) => {
    const v = answers[it.id];
    if (typeof v !== 'number' || v < 1 || v > 5) return;
    raw.push(v);
    byFacet[it.facet].push(it.key > 0 ? v : 6 - v);
  });

  const facets = {};
  Object.keys(FACETS).forEach((f) => {
    const m = byFacet[f].length ? mean(byFacet[f]) : 3;
    const s = to100(m);
    facets[f] = { score: s, level: levelOf(s) };
  });

  const domains = {};
  DOMAIN_ORDER.forEach((d) => {
    const codes = Object.keys(FACETS).filter((f) => FACETS[f].d === d);
    const s = Math.round(mean(codes.map((f) => facets[f].score)));
    domains[d] = { score: s, level: levelOf(s) };
  });

  // 스타일: 각 영역이 50 이상이면 높은 쪽
  const styles = {};
  STYLE_PAIRS.forEach(([x, y]) => {
    const hx = domains[x].score >= 50 ? 'h' : 'l';
    const hy = domains[y].score >= 50 ? 'h' : 'l';
    styles[`${x}${y}`] = `${hx}${hy}`;
  });

  // 가장 두드러진 영역 (50에서 멀수록)
  const distinct = DOMAIN_ORDER.slice().sort((a, b) => Math.abs(domains[b].score - 50) - Math.abs(domains[a].score - 50) || DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b));

  // 응답 점검
  let pairs = 0;
  let clash = 0;
  Object.keys(FACETS).forEach((f) => {
    const its = ITEMS.filter((it) => it.facet === f);
    const pos = its.filter((it) => it.key > 0).map((it) => answers[it.id]).filter((v) => typeof v === 'number');
    const neg = its.filter((it) => it.key < 0).map((it) => answers[it.id]).filter((v) => typeof v === 'number');
    pos.forEach((p) => neg.forEach((n) => {
      pairs++;
      if ((p >= 4 && n >= 4) || (p <= 2 && n <= 2)) clash++;
    }));
  });
  const rawMean = raw.length ? mean(raw) : 3;
  const check = {
    rawMean: r3(rawMean),
    extremeRatio: r3(raw.length ? raw.filter((x) => x === 1 || x === 5).length / raw.length : 0),
    midRatio: r3(raw.length ? raw.filter((x) => x === 3).length / raw.length : 0),
    clashRatio: r3(pairs ? clash / pairs : 0),
    sd: r3(raw.length ? Math.sqrt(mean(raw.map((x) => (x - rawMean) ** 2))) : 0),
    answered: raw.length,
  };

  const facetRank = Object.keys(FACETS).sort((a, b) => facets[b].score - facets[a].score || a.localeCompare(b));

  return {
    v: 1,
    domains,
    facets,
    styles,
    distinct,
    top: facetRank.slice(0, 3),
    bottom: facetRank.slice(-3).reverse(),
    check,
    durationSec: meta.durationSec || null,
  };
}
