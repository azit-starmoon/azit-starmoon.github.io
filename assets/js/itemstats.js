// AZIT : Star&Moon — 문항 분석 (관리자 화면에서만 불러 쓴다)
// 쌓인 응답으로 척도마다 신뢰도(Cronbach α), 문항-나머지 상관, 문항을 뺐을 때의 α, 문항 평균·표준편차를 계산한다.
// 계산은 이 브라우저 안에서만 하고, 응답과 결과는 어디에도 보내지 않는다.
// 리커트(1~5, 1~6) 문항만 다룬다. 둘 중 고르기·순위 매기기·글로 답하기 문항은 합산 척도가 아니라서 뺀다.
import * as bigfive from '../../tests/bigfive/items.js';
import * as attachment from '../../tests/attachment/items.js';
import * as schema from '../../tests/schema/items.js';
import * as hsp from '../../tests/hsp/items.js';
import * as strengths from '../../tests/strengths/items.js';
import * as values from '../../tests/values/items.js';
import * as career from '../../tests/career/items.js';
import * as emotion from '../../tests/emotion/items.js';
import * as coping from '../../tests/coping/items.js';
import * as resilience from '../../tests/resilience/items.js';
import * as esteem from '../../tests/esteem/items.js';
import * as temperament from '../../tests/temperament/items.js';
import * as lifestory from '../../tests/lifestory/items.js';
import * as differentiation from '../../tests/differentiation/items.js';
import * as godattach from '../../tests/godattach/items.js';

const B5 = { O: '개방성', C: '성실성', E: '외향성', A: '친화성', N: '신경성' };
const nm = (o, k) => (o && o[k] && o[k].name) || '';

// 검사마다 척도로 묶는 기준. 첫 번째가 기본이다. key(it)가 비면 그 기준에서는 문항을 뺀다.
// parts: 이 부(part)의 문항만 쓴다. order: 척도를 늘어놓는 순서.
export const SCALE_DEFS = {
  enneagram: [{ id: 'type', label: '유형', key: (it) => it.type, name: (k) => `${k}번 유형`, order: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
  bigfive: [
    { id: 'domain', label: '요인', key: (it) => it.domain, name: (k) => B5[k], order: bigfive.DOMAIN_ORDER },
    { id: 'facet', label: '하위 요인', key: (it) => it.facet, name: (k) => nm(bigfive.FACETS, k), order: Object.keys(bigfive.FACETS) },
  ],
  attachment: [
    { id: 'dim', label: '차원', parts: ['g'], key: (it) => it.d, name: (k) => ({ anx: '불안', avo: '회피', amb: '양가감정' })[k], order: ['anx', 'avo', 'amb'] },
    { id: 'facet', label: '하위 요인', parts: ['g'], key: (it) => it.f, name: (k) => nm(attachment.FACETS, k) || (k === 'M' ? '양가감정' : ''), order: [...Object.keys(attachment.FACETS), 'M'] },
  ],
  schema: [
    { id: 'schema', label: '도식', key: (it) => it.s, name: (k) => nm(schema.SCHEMAS, k), order: schema.SCHEMA_ORDER },
    { id: 'domain', label: '영역', key: (it) => (schema.SCHEMAS[it.s] || {}).d, name: (k) => (schema.DOMAINS.find((d) => d.id === k) || {}).name, order: schema.DOMAINS.map((d) => d.id) },
  ],
  hsp: [{ id: 'facet', label: '요인', key: (it) => it.facet || it.scale, name: (k) => nm(hsp.FACETS, k) || ({ load: '부담 신호', rest: '회복 자원' })[k], order: [...hsp.FACET_ORDER, 'load', 'rest'] }],
  hspnow: [{ id: 'facet', label: '요인', key: (it) => it.scale, name: (k) => ({ load: '부담 신호', rest: '회복 자원' })[k], order: ['load', 'rest'] }],
  strengths: [
    { id: 'strength', label: '강점', key: (it) => it.strength, name: (k) => nm(strengths.STRENGTHS, k), order: strengths.STRENGTH_ORDER },
    { id: 'virtue', label: '덕목', key: (it) => (strengths.STRENGTHS[it.strength] || {}).virtue, name: (k) => nm(strengths.VIRTUES, k), order: strengths.VIRTUE_ORDER },
  ],
  values: [{ id: 'value', label: '가치', key: (it) => it.value, name: (k) => nm(values.VALUES, k), order: values.VALUE_ORDER }],
  career: [{ id: 'type', label: '흥미 유형', key: (it) => it.type, name: (k) => nm(career.TYPES, k), order: career.TYPE_ORDER }],
  emotion: [{ id: 'skill', label: '역량과 전략', key: (it) => it.skill || it.strategy, name: (k) => nm(emotion.SKILLS, k) || nm(emotion.STRATEGIES, k), order: [...emotion.SKILL_ORDER, ...emotion.STRATEGY_ORDER] }],
  coping: [{ id: 'strategy', label: '대처 전략', key: (it) => it.strategy, name: (k) => nm(coping.STRATEGIES, k), order: coping.STRATEGY_ORDER }],
  resilience: [
    { id: 'factor', label: '요인', key: (it) => it.factor, name: (k) => nm(resilience.FACTORS, k), order: resilience.FACTOR_ORDER },
    { id: 'domain', label: '영역', key: (it) => (resilience.FACTORS[it.factor] || {}).domain, name: (k) => nm(resilience.DOMAINS, k), order: resilience.DOMAIN_ORDER },
  ],
  esteem: [{
    id: 'scale',
    label: '척도',
    key: (it) => (it.scale === 'worth' ? 'worth' : it.self ? `self:${it.self}` : it.base ? `base:${it.base}` : undefined),
    name: (k) => (k === 'worth' ? '자기 가치감' : k.startsWith('self:') ? nm(esteem.SELF, k.slice(5)) : nm(esteem.BASES, k.slice(5))),
    order: ['worth', ...esteem.SELF_ORDER.map((k) => `self:${k}`), ...esteem.BASE_ORDER.map((k) => `base:${k}`)],
  }],
  temperament: [{ id: 'dim', label: '차원', key: (it) => it.dim, name: (k) => nm(temperament.DIMS, k), order: [...temperament.TEMP_ORDER, ...temperament.CHAR_ORDER] }],
  lifestory: [{ id: 'scale', label: '척도', key: (it) => it.scale || it.theme, name: (k) => nm(lifestory.MEANING, k) || nm(lifestory.THEMES, k), order: [...Object.keys(lifestory.MEANING), ...lifestory.THEME_ORDER] }],
  differentiation: [{ id: 'facet', label: '요인', key: (it) => it.facet, name: (k) => nm(differentiation.FACETS, k), order: differentiation.FACET_ORDER }],
  godattach: [
    { id: 'dim', label: '차원', key: (it) => it.dim, name: (k) => nm(godattach.DIMS, k), order: Object.keys(godattach.DIMS) },
    { id: 'facet', label: '하위 요인', key: (it) => it.facet, name: (k) => nm(godattach.FACETS, k), order: godattach.FACET_ORDER },
  ],
};

export const ALPHA_BANDS = [[0.8, 'good', '좋음'], [0.7, 'ok', '쓸 만함'], [0.6, 'fair', '낮은 편'], [-Infinity, 'low', '낮음']];
export const alphaBand = (a) => (a === null ? ['na', '계산 못 함'] : ALPHA_BANDS.find(([t]) => a >= t).slice(1));
export const MIN_N = 5; // 이보다 적으면 계산하지 않는다
export const STABLE_N = 30; // 이보다 적으면 흔들릴 수 있다고 알린다

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const variance = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
};
const sdOf = (a) => Math.sqrt(variance(a));
function corr(x, y) {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}
// cols: 문항마다 응답 배열(같은 사람 순서). 합 점수의 분산이 0이면 계산하지 않는다
export function cronbach(cols) {
  const k = cols.length;
  if (k < 2 || cols[0].length < 3) return null;
  const n = cols[0].length;
  const totals = Array.from({ length: n }, (_, j) => cols.reduce((s, c) => s + c[j], 0));
  const vt = variance(totals);
  if (!(vt > 0)) return null;
  const sv = cols.reduce((s, c) => s + variance(c), 0);
  return (k / (k - 1)) * (1 - sv / vt);
}

const isRev = (it) => it.r === true || it.key === -1;
export const likertItems = (def) => def.parts.filter((p) => p.kind === 'likert').flatMap((p) => p.items || []);
// 모든 리커트 문항에 거의 같은 답을 고른 응답(표준편차 0.5 미만)
export function isFlat(def, rec) {
  const v = likertItems(def).map((it) => (rec.answers || {})[it.id]).filter(isNum);
  return v.length >= 5 && sdOf(v) < 0.5;
}

// 검사 하나를 분석한다. results는 모든 결과(관리자 목록), level은 SCALE_DEFS의 기준 번호
export function analyze(def, results, { level = 0, dropFlat = true } = {}) {
  const levels = SCALE_DEFS[def.id] || [];
  const lv = levels[level] || levels[0];
  const same = results.filter((r) => r.testId === def.id && r.answers);
  const current = same.filter((r) => String(r.version || '') === String(def.version || ''));
  const used = dropFlat ? current.filter((r) => !isFlat(def, r)) : current;
  const base = { id: def.id, title: def.title, version: def.version, levels: levels.map((l) => ({ id: l.id, label: l.label })), level: lv ? lv.id : '', total: same.length, older: same.length - current.length, flat: current.length - used.length, n: used.length, scales: [] };
  if (!lv) return base;

  // 기준에 따라 문항을 척도로 묶는다 (부마다 응답 범위가 다를 수 있어 문항에 범위를 붙여 둔다)
  const groups = new Map();
  def.parts
    .filter((p) => p.kind === 'likert' && (!lv.parts || lv.parts.includes(p.id)))
    .forEach((p) => {
      const vals = (p.scale || []).map((x) => Number(x.value)).filter(isNum);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      (p.items || []).forEach((it) => {
        const k = lv.key(it);
        if (k === undefined || k === null || k === '') return;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push({ id: it.id, text: it.text || '', rev: isRev(it), min, max });
      });
    });
  const order = (lv.order || []).map(String);
  const keys = [...groups.keys()].sort((a, b) => {
    const ia = order.indexOf(String(a));
    const ib = order.indexOf(String(b));
    return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib);
  });

  base.scales = keys.map((key) => {
    const items = groups.get(key);
    // 이 척도의 문항에 모두 답한 사람만 쓴다. 역채점 문항은 (최소+최대-응답)으로 바꿔 계산한다
    const rows = used
      .map((r) => items.map((it) => { const v = r.answers[it.id]; return isNum(v) ? (it.rev ? it.min + it.max - v : v) : null; }))
      .filter((row) => row.every((v) => v !== null));
    const n = rows.length;
    const k = items.length;
    const out = { key, name: lv.name(key) || String(key), k, n, alpha: null, mean: null, sd: null, items: [] };
    if (n < MIN_N) {
      out.items = items.map((it) => ({ ...it, mean: null, sd: null, r: null, alphaDel: null, flags: [] }));
      return out;
    }
    const cols = items.map((_, i) => rows.map((row) => row[i]));
    const totals = rows.map((row) => row.reduce((s, v) => s + v, 0));
    const scores = totals.map((t) => t / k);
    out.alpha = cronbach(cols);
    out.mean = mean(scores);
    out.sd = sdOf(scores);
    out.items = items.map((it, i) => {
      const col = cols[i];
      const raw = it.rev ? col.map((v) => it.min + it.max - v) : col;
      const rest = totals.map((t, j) => t - col[j]);
      const r = k > 1 ? corr(col, rest) : null;
      const alphaDel = k > 2 ? cronbach(cols.filter((_, j) => j !== i)) : null;
      const m = mean(raw);
      const sd = sdOf(raw);
      const range = it.max - it.min;
      const flags = [];
      if (r !== null && r < 0) flags.push(['neg', '방향이 반대']);
      else if (r !== null && r < 0.2) flags.push(['weak', '척도와 따로 놂']);
      if (out.alpha !== null && alphaDel !== null && alphaDel > out.alpha + 0.02) flags.push(['up', '빼면 α가 오름']);
      if (sd < 0.15 * range || m <= it.min + 0.15 * range || m >= it.max - 0.15 * range) flags.push(['skew', '응답이 한쪽에 몰림']);
      return { ...it, mean: m, sd, r, alphaDel, flags };
    });
    return out;
  });
  return base;
}

// 문항 응답 CSV: 리커트 문항의 응답 그대로(역채점 전), 이름·상담사·날짜 없이 순번만 붙인다
export function responsesCsv(def, results, { dropFlat = true } = {}) {
  const items = likertItems(def);
  const rows = results.filter((r) => r.testId === def.id && r.answers && String(r.version || '') === String(def.version || '') && !(dropFlat && isFlat(def, r)));
  const lines = [['순번', '버전', ...items.map((it) => `${it.id}${isRev(it) ? '(역)' : ''}`)].join(',')];
  rows.forEach((r, i) => lines.push([i + 1, def.version || '', ...items.map((it) => (isNum(r.answers[it.id]) ? r.answers[it.id] : ''))].join(',')));
  return { text: lines.join('\r\n'), count: rows.length };
}
