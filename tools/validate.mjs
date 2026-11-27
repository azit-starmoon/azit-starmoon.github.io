#!/usr/bin/env node
// AZIT : Star&Moon — 채점 검증 (모의 응답)
// 실제 응답은 쓰지 않는다. 숨은 성향을 정해 둔 모의 응답자를 만들어, 각 검사의 채점 장치가 의도대로 움직이는지 본다.
//
//   node tools/validate.mjs                              모든 열린 검사
//   node tools/validate.mjs --only hsp,esteem --n 800    일부만, 모의 응답자 수 지정
//   node tools/validate.mjs --json /tmp/validate.json    결과를 JSON으로도 남김
//
// 보는 것
//   ① 방향: 문항 하나를 올렸을 때 제 척도 점수가 맞는 방향으로 움직이는지(역채점 누락, 점수에 안 들어가는 문항)
//   ② 복원: 숨은 성향과 척도 점수의 상관
//   ③ 재검사: 같은 사람이 두 번 했을 때 점수 상관과 유형(결과 이름) 일치율
//   ④ 응답 습관: 모든 답이 '그렇다' 쪽으로 한 칸 쏠릴 때 점수(0~100)와 유형이 얼마나 흔들리는지
//   ⑤ 쏠림: 무작위·중립 응답에서 유형이 한쪽으로 몰리지 않는지
//   ⑥ 응답 점검: 성실한 응답, 무작위, '그렇다'만, 같은 답만 고른 응답을 결과지의 응답 점검이 얼마나 짚는지
//
// 모형 가정: 척도마다 숨은 성향 θ~N(0,1)(척도끼리 독립), 문항 반응 = λθ + 잡음(λ=0.7)을 리커트 칸으로 나눈 값.
// 실제 사람의 분포나 문항의 특성과는 다를 수 있다. 그래서 이 결과는 '타당도'가 아니라 '채점 장치가 설계대로 움직이는가'를 보여 준다.

// ── 브라우저 없이 검사 모듈을 불러오기 위한 최소한의 바탕 ──
globalThis.document = { documentElement: { classList: { remove() {}, add() {} } }, addEventListener() {}, querySelector() { return null; }, createElement() { return {}; } };
globalThis.window = globalThis;
globalThis.location = { search: '', href: '' };
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.sessionStorage = globalThis.localStorage;

const ROOT = new URL('../', import.meta.url);
const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : d; };
const N = Number(opt('n', 1500));
const ONLY = opt('only', '') ? opt('only', '').split(',') : null;
const JSON_OUT = opt('json', '');
const LAMBDA = 0.7;

const { TESTS } = await import(new URL('assets/js/registry.js', ROOT));
const { SCALE_DEFS } = await import(new URL('assets/js/itemstats.js', ROOT));

// ── 난수 (같은 사람·같은 회차는 늘 같은 잡음) ──
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gaussOf = (rnd) => () => { let u = 0; let v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ── 통계 ──
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
function corr(x, y) {
  const mx = mean(x); const my = mean(y);
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}
const r2 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
const pct = (v) => Math.round(v * 1000) / 10;

// ── 점수 객체 다루기 ──
function flatten(o, p = '', out = {}) {
  if (o === null || o === undefined) return out;
  if (typeof o !== 'object') { out[p] = o; return out; }
  if (Array.isArray(o)) return out;
  for (const [k, v] of Object.entries(o)) flatten(v, p ? `${p}.${k}` : k, out);
  return out;
}
const getPath = (o, path) => path.split('.').reduce((v, k) => {
  if (v === null || v === undefined) return undefined;
  const m = k.match(/^(.+)\[(\d+)\]$/);
  if (m) { const arr = v[m[1]]; return Array.isArray(arr) ? arr[Number(m[2])] : undefined; }
  return v[k];
}, o);
const SKIP_LEAF = /(^|\.)(rank|c|toward|points|max|mean|high|answered|margin|gapTop|range|wingDiff|v)$/;
// 척도 키(예: 'N', 'self:kind')에 맞는 점수 자리 찾기: 마지막 조각은 정확히, 앞 조각은 앞부분이 같으면 된다
function findPath(flat, key) {
  const segs = String(key).split(':');
  const cands = Object.keys(flat).filter((p) => {
    if (typeof flat[p] !== 'number' || p.startsWith('check.') || p.startsWith('likert.typeMean') || SKIP_LEAF.test(p)) return false;
    const ps = p.split('.');
    const last = segs[segs.length - 1];
    if (!ps.includes(last)) return false;
    return segs.slice(0, -1).every((s) => ps.some((x) => x.startsWith(s)));
  });
  const rank = (p) => (p.endsWith('.score') ? 2 : 0) + (p === String(key) ? 3 : 0) - p.length / 100;
  cands.sort((a, b) => rank(b) - rank(a));
  return cands[0] || null;
}

// 척도 점수 자리를 직접 정해 주는 검사 (자동으로 찾으면 다른 자리가 걸리는 경우)
const PATH_OVERRIDE = { enneagram: (k) => `likert.typeScore.${k}` };
// 여러 개를 고르는 결과(대표 강점 등): 두 회차에서 얼마나 겹치는지 본다
const SETS = { strengths: 'sig', values: 'core', schema: 'active' };

// 유형을 가르는 점수와 기준선: 기준선에서 5점 안쪽인 사람과 바깥인 사람의 재검사 일치율을 따로 본다
const NEAR = {
  attachment: { cat: 'style', cuts: [['anx', 50], ['avo', 50]] },
  godattach: { cat: 'style', cuts: [['an', 50], ['av', 50]] },
  differentiation: { cat: 'style', cuts: [['facets.fo.score', 50], ['facets.ec.score', 50]] },
  esteem: { cat: 'type', cuts: [['worth', 55], ['lean', 55]] },
  lifestory: { cat: 'state', cuts: [['pr', 55], ['se', 55]] },
  hsp: { cat: 'state', cuts: [['load', 50], ['rest', 50]] },
  hspnow: { cat: 'state', cuts: [['load', 50], ['rest', 50]] },
  rumination: { cat: 'type', cuts: [['br', 50], ['rf', 50]] },
  temperament: { cat: 'ttype', cuts: [['dims.ns.score', 50], ['dims.ha.score', 50], ['dims.rd.score', 50]] },
};

// 결과 이름(유형) 자리: 검사마다 결과지 표지에 쓰는 것
const CATS = {
  enneagram: ['core', 'instinct.dominant'],
  bigfive: ['label'],
  attachment: ['style'],
  schema: ['primaryCoping', 'top[0]'],
  hsp: ['level', 'state'],
  hspnow: ['state'],
  interpersonal: ['style', 'level'],
  rumination: ['type'],
  strengths: ['order[0]'],
  values: ['top', 'topGroup'],
  career: ['top', 'codeText'],
  emotion: ['level', 'top'],
  coping: ['style'],
  resilience: ['level', 'anchor'],
  esteem: ['type'],
  temperament: ['ttype', 'shape'],
  lifestory: ['state'],
  differentiation: ['style', 'level'],
  godattach: ['style'],
};

// 결과지의 응답 점검 규칙을 그대로 옮긴 것 (결과지마다 '주의해서 읽기'를 띄우는 조건)
function carefulRule(id, mod) {
  const L = mod.SPREAD_LIMIT;
  const A = mod.ACQ_LIMIT;
  if (id === 'bigfive') return (s) => (s.check || {}).clashRatio >= 0.25;
  if (id === 'attachment') return (s) => (s.check || {}).sd < 0.5 || (s.check || {}).gap >= mod.GAP_LIMIT;
  if (id === 'schema') return (s) => (s.check || {}).sd < 0.5 || (s.check || {}).spread >= L;
  if (id === 'hspnow') return (s) => (s.check || {}).sd < mod.FLAT_SD;
  if (L !== undefined && A !== undefined) return (s) => { const C = s.check || {}; return C.spread >= L || Math.abs(C.acq) >= A || C.sd < 0.5; };
  return null;
}

async function validate(id) {
  const def = (await import(new URL(`tests/${id}/index.js`, ROOT))).default;
  const scoring = await import(new URL(`tests/${id}/scoring.js`, ROOT));
  const lv = (SCALE_DEFS[id] || [])[0];
  const careful = carefulRule(id, scoring);
  const isRev = (it) => it.r === true || it.key === -1;
  const keyOf = (part, it) => {
    const k = lv && (!lv.parts || lv.parts.includes(part.id)) ? lv.key(it) : undefined;
    if (k !== undefined && k !== null && k !== '') return String(k);
    return `${part.id}:${it.d ?? it.facet ?? it.scale ?? it.dim ?? it.type ?? it.s ?? '_'}`;
  };

  // 한 사람의 한 회차 응답. mode: latent(숨은 성향대로), random, neutral, yes('그렇다'만), flat(같은 답만)
  function answersFor(personSeed, round, { mode = 'latent', shift = 0 } = {}) {
    const theta = new Map();
    const th = (k) => { if (!theta.has(k)) theta.set(k, gaussOf(mulberry32(personSeed ^ hashStr(k)))()); return theta.get(k); };
    const rnd = mulberry32(personSeed * 31 + round * 7919 + 1);
    const g = gaussOf(rnd);
    const ans = {};
    for (const p of def.parts) {
      const items = p.items || p.build(ans);
      for (const it of items) {
        if (p.kind === 'likert') {
          const vals = p.scale.map((x) => Number(x.value));
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          let v;
          if (mode === 'random') v = min + Math.floor(rnd() * (max - min + 1));
          else if (mode === 'neutral' || mode === 'flat') v = Math.floor((min + max) / 2);
          else if (mode === 'yes') v = max - Math.floor(rnd() * 2);
          else {
            const z = LAMBDA * th(keyOf(p, it)) + Math.sqrt(1 - LAMBDA * LAMBDA) * g();
            const k = max - min + 1;
            v = min;
            for (let c = 0; c < k - 1; c++) if (z > -1.6 + (3.2 * c) / (k - 2)) v++;
            if (isRev(it)) v = min + max - v;
          }
          ans[it.id] = Math.max(min, Math.min(max, v + shift));
        } else if (p.kind === 'pair') {
          if (mode === 'random' || mode === 'yes') ans[it.id] = [2, 1, -1, -2][Math.floor(rnd() * 4)];
          else if (mode === 'neutral' || mode === 'flat') ans[it.id] = 1;
          else {
            const d = th(String(it.lo)) - th(String(it.hi)) + 0.7 * g();
            const s = Math.abs(d) > 0.8 ? 2 : 1;
            ans[it.id] = d > 0 ? s : -s;
          }
        } else if (p.kind === 'rank') {
          const keys = it.options.map((o) => o.key);
          if (mode === 'neutral' || mode === 'flat') ans[it.id] = keys;
          else if (mode === 'random' || mode === 'yes') ans[it.id] = keys.map((k) => [k, rnd()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
          else ans[it.id] = keys.map((k) => [k, th(`rank:${k}`) + 0.7 * g()]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
        } else if (p.kind === 'text') {
          ans[it.id] = mode === 'latent' ? '모의 응답으로 적은 글이에요.\n둘째 줄이에요.' : '';
        }
      }
    }
    return { ans, theta };
  }
  const score = (ans) => def.score(ans, { durationSec: 900 });
  const catOf = (s, path) => (path === 'label' ? String(def.summary(s)).split(' (')[0] : getPath(s, path));

  // 척도 목록(기본 기준)과 점수 자리
  const scaleKeys = [];
  def.parts.forEach((p) => {
    if (p.kind !== 'likert') return;
    (p.items || []).forEach((it) => { const k = keyOf(p, it); if (!scaleKeys.includes(k)) scaleKeys.push(k); });
  });
  const sample = flatten(score(answersFor(1, 0).ans));
  const pathOf = Object.fromEntries(scaleKeys.map((k) => [k, PATH_OVERRIDE[id] && /^\d+$/.test(k) ? PATH_OVERRIDE[id](k) : findPath(sample, k)]));

  // ① 방향: 중립 응답에서 문항 하나만 최대·최소로 바꿔 본다
  const neutral = answersFor(7, 0, { mode: 'neutral' }).ans;
  const dir = { checked: 0, dead: [], wrong: [], unmapped: [] };
  for (const p of def.parts) {
    if (p.kind !== 'likert') continue;
    const vals = p.scale.map((x) => Number(x.value));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    for (const it of p.items || []) {
      const k = keyOf(p, it);
      const path = pathOf[k];
      const hi = flatten(score({ ...neutral, [it.id]: max }));
      const lo = flatten(score({ ...neutral, [it.id]: min }));
      dir.checked++;
      const moved = Object.keys(hi).filter((q) => typeof hi[q] === 'number' && !q.startsWith('check.') && hi[q] !== lo[q]);
      if (!moved.length) { dir.dead.push(it.id); continue; }
      if (!path) { dir.unmapped.push(`${it.id}(${k})`); continue; }
      const d = hi[path] - lo[path];
      const want = isRev(it) ? -1 : 1;
      if (d === 0 || Math.sign(d) !== want) dir.wrong.push(`${it.id}(${k}: ${isRev(it) ? '역' : '정'}, 변화 ${d})`);
    }
  }

  // ②③④ 모의 응답자 N명: 1회차, 2회차(같은 성향·다른 잡음), 1회차+그렇다 쏠림
  const rec = Object.fromEntries(scaleKeys.map((k) => [k, { th: [], a: [], b: [], y: [] }]));
  const cats = CATS[id] || [];
  const catStat = Object.fromEntries(cats.map((c) => [c, { same: 0, yesSame: 0, dist: {} }]));
  let flaggedLatent = 0;
  const setField = SETS[id];
  const near = NEAR[id];
  const nearStat = { near: 0, nearSame: 0, far: 0, farSame: 0 };
  const setStat = { jac: 0, size: 0, n: 0 };
  for (let i = 0; i < N; i++) {
    const seed = 1000 + i;
    const A = answersFor(seed, 1);
    const B = answersFor(seed, 2);
    const Y = answersFor(seed, 1, { shift: 1 });
    const sa = score(A.ans);
    const sb = score(B.ans);
    const sy = score(Y.ans);
    const fa = flatten(sa);
    const fb = flatten(sb);
    const fy = flatten(sy);
    for (const k of scaleKeys) {
      const p = pathOf[k];
      if (!p || !A.theta.has(k)) continue;
      rec[k].th.push(A.theta.get(k)); rec[k].a.push(fa[p]); rec[k].b.push(fb[p]); rec[k].y.push(fy[p]);
    }
    for (const c of cats) {
      const va = String(catOf(sa, c));
      catStat[c].dist[va] = (catStat[c].dist[va] || 0) + 1;
      if (va === String(catOf(sb, c))) catStat[c].same++;
      if (va === String(catOf(sy, c))) catStat[c].yesSame++;
    }
    if (careful && careful(sa)) flaggedLatent++;
    if (near) {
      const isNear = near.cuts.some(([path, cut]) => Math.abs(getPath(sa, path) - cut) < 5);
      const same = String(catOf(sa, near.cat)) === String(catOf(sb, near.cat));
      if (isNear) { nearStat.near++; if (same) nearStat.nearSame++; } else { nearStat.far++; if (same) nearStat.farSame++; }
    }
    if (setField) {
      const x = new Set(getPath(sa, setField) || []);
      const y = new Set(getPath(sb, setField) || []);
      const inter = [...x].filter((v) => y.has(v)).length;
      const uni = new Set([...x, ...y]).size;
      setStat.jac += uni ? inter / uni : 1;
      setStat.size += x.size;
      setStat.n++;
    }
  }
  const scales = scaleKeys.map((k) => {
    const R = rec[k];
    if (!R.a.length) return { key: k, path: pathOf[k], n: 0 };
    const shiftAbs = mean(R.a.map((v, j) => Math.abs(R.y[j] - v)));
    return { key: k, path: pathOf[k], recovery: r2(corr(R.th, R.a)), retest: r2(corr(R.a, R.b)), yesShift: Math.round(shiftAbs * 10) / 10 };
  });

  // ⑤ 무작위·중립 응답에서의 결과 이름
  const randDist = Object.fromEntries(cats.map((c) => [c, {}]));
  let flaggedRandom = 0;
  let flaggedYes = 0;
  let flaggedFlat = 0;
  const M = Math.min(N, 600);
  for (let i = 0; i < M; i++) {
    const sr = score(answersFor(50000 + i, 1, { mode: 'random' }).ans);
    cats.forEach((c) => { const v = String(catOf(sr, c)); randDist[c][v] = (randDist[c][v] || 0) + 1; });
    if (careful && careful(sr)) flaggedRandom++;
    if (careful && careful(score(answersFor(70000 + i, 1, { mode: 'yes' }).ans))) flaggedYes++;
  }
  const sn = score(neutral);
  if (careful && careful(score(answersFor(9, 1, { mode: 'flat' }).ans))) flaggedFlat = 1;
  const top = (dist, n) => Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, pct(c / n)]);

  return {
    id,
    title: def.title,
    version: def.version,
    items: dir.checked,
    direction: dir,
    scales,
    categories: cats.map((c) => ({
      field: c,
      retestSame: pct(catStat[c].same / N),
      yesSame: pct(catStat[c].yesSame / N),
      population: top(catStat[c].dist, N),
      random: top(randDist[c], M),
      neutral: String(catOf(sn, c)),
    })),
    near: near ? { field: near.cat, share: pct(nearStat.near / N), nearSame: nearStat.near ? pct(nearStat.nearSame / nearStat.near) : null, farSame: nearStat.far ? pct(nearStat.farSame / nearStat.far) : null } : null,
    set: setField ? { field: setField, overlap: pct(setStat.jac / setStat.n), size: Math.round((setStat.size / setStat.n) * 10) / 10 } : null,
    check: careful ? { latent: pct(flaggedLatent / N), random: pct(flaggedRandom / M), yes: pct(flaggedYes / M), flat: flaggedFlat ? '짚음' : '못 짚음' } : null,
  };
}

const ids = TESTS.filter((t) => t.status === 'open' && (!ONLY || ONLY.includes(t.id))).map((t) => t.id);
const out = [];
for (const id of ids) {
  const t0 = Date.now();
  const r = await validate(id);
  out.push(r);
  const sc = r.scales.filter((s) => s.recovery !== undefined);
  const minRec = Math.min(...sc.map((s) => s.recovery));
  const minRt = Math.min(...sc.map((s) => s.retest));
  const maxYes = Math.max(...sc.map((s) => s.yesShift));
  const d = r.direction;
  console.log(`\n■ ${r.title} (${id}) 문항 ${r.items}개, ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  console.log(`  ① 방향: 점검 ${d.checked}개, 점수에 안 들어감 ${d.dead.length}${d.dead.length ? ` [${d.dead.join(', ')}]` : ''}, 방향 어긋남 ${d.wrong.length}${d.wrong.length ? ` [${d.wrong.join('; ')}]` : ''}${d.unmapped.length ? `, 점수 자리 못 찾음 [${d.unmapped.join(', ')}]` : ''}`);
  console.log(`  ②③④ 척도 ${sc.length}개: 복원 r 최저 ${minRec}, 재검사 r 최저 ${minRt}, 그렇다 쏠림 시 점수 변화 최대 ${maxYes}점`);
  sc.forEach((s) => console.log(`     ${String(s.key).padEnd(10)} ${String(s.path).padEnd(26)} 복원 ${s.recovery}  재검사 ${s.retest}  쏠림 ${s.yesShift}`));
  r.categories.forEach((c) => console.log(`  ⑤ ${c.field}: 재검사 일치 ${c.retestSame}%, 쏠림에도 그대로 ${c.yesSame}%, 중립 응답 → ${c.neutral} | 분포 ${c.population.slice(0, 6).map(([v, p]) => `${v} ${p}%`).join(', ')} | 무작위 ${c.random.slice(0, 3).map(([v, p]) => `${v} ${p}%`).join(', ')}`));
  if (r.near) console.log(`  ⑤ ${r.near.field} 기준선 5점 안쪽: ${r.near.share}%의 사람, 재검사 일치 ${r.near.nearSame}% (바깥은 ${r.near.farSame}%)`);
  if (r.set) console.log(`  ⑤ ${r.set.field}(여러 개 고르는 결과): 평균 ${r.set.size}개, 두 회차 겹침(자카드) ${r.set.overlap}%`);
  if (r.check) console.log(`  ⑥ 응답 점검이 짚는 비율: 성실 ${r.check.latent}%, 무작위 ${r.check.random}%, 그렇다만 ${r.check.yes}%, 같은 답만 ${r.check.flat}`);
}
if (JSON_OUT) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
  console.log(`\nJSON: ${JSON_OUT}`);
}
process.exit(0);
