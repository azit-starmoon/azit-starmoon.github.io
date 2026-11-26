#!/usr/bin/env node
// AZIT : Star&Moon — 데이터베이스 보안 규칙 점검 (계정 단계별로 읽기·쓰기가 막히고 열리는지)
//
//   node tools/rules-check.mjs                       firebase/database.rules.json을 점검
//   node tools/rules-check.mjs --rules 다른규칙.json    다른 규칙 파일을 점검
//
// 담당자·관리자·상담사·승인 전·로그인 안 함 계정이 자리마다 읽고 쓸 수 있는지를, 아래 CASES에 적어 둔 답과 비교한다.
// 규칙을 고친 뒤 Firebase 콘솔에 게시하기 전에 돌려 본다. 하나라도 어긋나면 종료 코드 1.
//
// Firebase 에뮬레이터가 아니라, 규칙의 뜻을 따라 만든 근사 평가기다.
//  - .read / .write: 뿌리부터 그 자리까지 내려가며 하나라도 참이면 허락(아래로 이어진다)
//  - .validate: 쓰는 자리와 그 위 자리, 새 값 아래 자리마다 값이 있을 때만 확인(이어지지 않는다)
//  - root는 쓰기 전, newData는 쓴 뒤 모습. null·빈 묶음은 저장되지 않는다
//  - 식을 계산하다 오류가 나면 거짓
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const args = process.argv.slice(2);
const ri = args.indexOf('--rules');
const RULES_FILE = ri >= 0 ? new URL(args[ri + 1], `file://${process.cwd()}/`) : new URL('firebase/database.rules.json', ROOT);
const RULES_TEXT = readFileSync(RULES_FILE, 'utf8');
const RULES = JSON.parse(RULES_TEXT).rules;
const { OWNER_EMAIL } = await import(new URL('assets/js/config.js', ROOT));

// ── 데이터 스냅샷 ──
const clone = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
function at(tree, path) {
  let n = tree;
  for (const k of path) {
    if (n === null || n === undefined || typeof n !== 'object') return null;
    n = n[k];
  }
  return n === undefined ? null : n;
}
function prune(v) {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'object') return v;
  const out = {};
  Object.entries(v).forEach(([k, x]) => { const p = prune(x); if (p !== null) out[k] = p; });
  return Object.keys(out).length ? out : null;
}
function setAt(tree, path, value) {
  if (!path.length) return prune(clone(value));
  const t = clone(tree) || {};
  let n = t;
  for (let i = 0; i < path.length - 1; i++) {
    if (n[path[i]] === null || n[path[i]] === undefined || typeof n[path[i]] !== 'object') n[path[i]] = {};
    n = n[path[i]];
  }
  const last = path[path.length - 1];
  if (value === null || value === undefined) delete n[last];
  else n[last] = clone(value);
  return prune(t) || {};
}
class Snap {
  constructor(v) { this.v = v === undefined ? null : v; }
  child(p) { return new Snap(at(this.v, String(p).split('/').filter(Boolean))); }
  exists() { return this.v !== null; }
  val() { return this.v; }
  hasChild(k) { return this.child(k).exists(); }
  hasChildren(keys) {
    if (this.v === null || typeof this.v !== 'object') return false;
    return (keys || Object.keys(this.v)).every((k) => this.v[k] !== undefined && this.v[k] !== null);
  }
  isString() { return typeof this.v === 'string'; }
  isNumber() { return typeof this.v === 'number'; }
  isBoolean() { return typeof this.v === 'boolean'; }
}

// ── 규칙 계산 ──
const NOW = Date.now();
function evalRule(expr, ctx) {
  if (expr === true || expr === false) return expr;
  const names = Object.keys(ctx);
  try {
    // eslint-disable-next-line no-new-func
    return Boolean(new Function(...names, `return (${expr});`)(...names.map((n) => ctx[n])));
  } catch (e) {
    return false;
  }
}
// 자리마다 맞는 규칙 마디와 $변수
function chainOf(path) {
  const chain = [{ node: RULES, vars: {} }];
  let node = RULES;
  let vars = {};
  for (const k of path) {
    let next = null;
    if (node) {
      if (node[k] !== undefined && !k.startsWith('.')) next = node[k];
      else {
        const dv = Object.keys(node).find((key) => key.startsWith('$'));
        if (dv) { next = node[dv]; vars = { ...vars, [dv]: k }; }
      }
    }
    node = next;
    chain.push({ node, vars });
  }
  return chain;
}
function canRead(auth, tree, path) {
  const chain = chainOf(path);
  for (let i = 0; i < chain.length; i++) {
    const { node, vars } = chain[i];
    if (!node) break;
    if (node['.read'] !== undefined && evalRule(node['.read'], { auth, root: new Snap(tree), data: new Snap(at(tree, path.slice(0, i))), now: NOW, ...vars })) return true;
  }
  return false;
}
function validateDown(node, vars, path, newTree, tree, auth) {
  const nd = at(newTree, path);
  if (nd === null || typeof nd !== 'object') return true;
  for (const k of Object.keys(nd)) {
    let child = node[k] !== undefined && !k.startsWith('.') ? node[k] : null;
    let cvars = vars;
    if (!child) {
      const dv = Object.keys(node).find((key) => key.startsWith('$'));
      if (dv) { child = node[dv]; cvars = { ...vars, [dv]: k }; }
    }
    if (!child) continue;
    const p = [...path, k];
    const v = at(newTree, p);
    if (v !== null && child['.validate'] !== undefined
      && !evalRule(child['.validate'], { auth, root: new Snap(tree), data: new Snap(at(tree, p)), newData: new Snap(v), now: NOW, ...cvars })) return false;
    if (!validateDown(child, cvars, p, newTree, tree, auth)) return false;
  }
  return true;
}
function canWrite(auth, tree, path, value) {
  const newTree = setAt(tree, path, value);
  const chain = chainOf(path);
  let granted = false;
  for (let i = 0; i < chain.length && !granted; i++) {
    const { node, vars } = chain[i];
    if (!node) break;
    const p = path.slice(0, i);
    if (node['.write'] !== undefined && evalRule(node['.write'], { auth, root: new Snap(tree), data: new Snap(at(tree, p)), newData: new Snap(at(newTree, p)), now: NOW, ...vars })) granted = true;
  }
  if (!granted) return false;
  for (let i = 0; i < chain.length; i++) {
    const { node, vars } = chain[i];
    if (!node) break;
    const p = path.slice(0, i);
    const nd = at(newTree, p);
    if (nd !== null && node['.validate'] !== undefined
      && !evalRule(node['.validate'], { auth, root: new Snap(tree), data: new Snap(at(tree, p)), newData: new Snap(nd), now: NOW, ...vars })) return false;
  }
  const last = chain[chain.length - 1];
  return last.node ? validateDown(last.node, last.vars, path, newTree, tree, auth) : true;
}

// ── 점검할 상황 ──
const TOKEN = 'AbCdEfGhJkMnPqRsTuVw2345';
const NEWTOK = 'ZyXwVuTsRqPnMkJhGfEd9876';
const WHO = {
  owner: { uid: 'own', token: { email: OWNER_EMAIL, email_verified: true } },
  fake: { uid: 'fake', token: { email: OWNER_EMAIL, email_verified: false } },
  admin: { uid: 'adm', token: { email: 'adm@example.com', email_verified: true } },
  member: { uid: 'mem', token: { email: 'mem@example.com', email_verified: true } },
  pending: { uid: 'req', token: { email: 'req@example.com', email_verified: true } },
  anon: null,
};
const rec = (extra = {}) => ({ testId: 'temperament', createdAt: NOW, scores: { a: 1 }, name: '검사자', ...extra });
const draft = () => ({ testId: 't', version: '1', sid: 's', answers: { q1: 1 }, savedAt: NOW });
const share = (ownerUid, createdBy, rid) => ({ ownerUid, resultId: rid, createdBy, createdAt: NOW, payload: { testId: 'temperament', scores: { a: 1 } } });
const member = (name) => ({ name, approvedAt: NOW });
// 담당자(own)는 관리자 목록에도 승인 목록에도 없다: 이메일만으로 담당자가 되는지 본다
const TREE = {
  admins: { adm: true, adm2: true },
  members: { mem: member('상담1'), mem2: member('상담2'), adm2: member('관리2') },
  requests: { req: { name: '요청', email: 'req@example.com', createdAt: NOW } },
  users: { own: { name: '담당', email: OWNER_EMAIL, updatedAt: NOW }, adm: { name: '관리', updatedAt: NOW }, mem: { name: '상담1', updatedAt: NOW } },
  results: { mem: { r1: rec({ shareToken: TOKEN }) }, mem2: { r2: rec() }, adm: { r3: rec() }, own: { r4: rec() } },
  shares: { [TOKEN]: share('mem', 'mem', 'r1') },
  drafts: { mem: { d1: draft() } },
};

// [설명, 누구, 읽기/쓰기, 자리, (쓸 값), 기대]
const CASES = [
  ['담당자: 모든 결과 보기', 'owner', 'read', 'results', true],
  ['담당자: 승인 목록·요청·사용자·관리자 목록 보기', 'owner', 'read', ['members', 'requests', 'users', 'admins'], true],
  ['담당자: 관리자 지정', 'owner', 'write', 'admins/mem', true, true],
  ['담당자: 관리자 해제', 'owner', 'write', 'admins/adm', null, true],
  ['담당자: 상담사 승인', 'owner', 'write', 'members/req', member('요청'), true],
  ['담당자: 관리자 계정의 승인 취소', 'owner', 'write', 'members/adm2', null, true],
  ['담당자: 다른 계정 결과에 생년월일 넣기', 'owner', 'write', 'results/mem/r1/birth', '1996-10-13', true],
  ['담당자: 다른 계정 결과 지우기', 'owner', 'write', 'results/mem2/r2', null, true],
  ['담당자: 다른 계정 결과 공유 표시', 'owner', 'write', 'results/mem2/r2/shareToken', NEWTOK, true],
  ['담당자: 다른 계정 결과 공유 링크 만들기', 'owner', 'write', `shares/${NEWTOK}`, share('mem2', 'own', 'r2'), true],
  ['담당자: 남이 만든 공유 링크 멈추기', 'owner', 'write', `shares/${TOKEN}`, null, true],
  ['담당자: 내 결과 저장 (승인 목록에 없어도)', 'owner', 'write', 'results/own/new', rec(), true],
  ['담당자: 내 진행 저장', 'owner', 'write', 'drafts/own/d', draft(), true],
  ['같은 주소지만 이메일 확인 안 됨: 모든 결과', 'fake', 'read', 'results', false],
  ['같은 주소지만 이메일 확인 안 됨: 관리자 지정', 'fake', 'write', 'admins/fake', true, false],

  ['관리자: 모든 결과 보기', 'admin', 'read', 'results', true],
  ['관리자: 다른 계정 결과 하나 보기', 'admin', 'read', 'results/mem/r1', true],
  ['관리자: 승인 목록·요청·사용자·관리자 목록 보기', 'admin', 'read', ['members', 'requests', 'users', 'admins'], true],
  ['관리자: 상담사 승인', 'admin', 'write', 'members/req', member('요청'), true],
  ['관리자: 요청 지우기 (승인 뒤, 거절)', 'admin', 'write', 'requests/req', null, true],
  ['관리자: 상담사 승인 취소', 'admin', 'write', 'members/mem', null, true],
  ['관리자: 관리자 계정의 승인 취소', 'admin', 'write', 'members/adm2', null, false],
  ['관리자: 관리자 지정', 'admin', 'write', 'admins/mem', true, false],
  ['관리자: 자기 관리자 해제', 'admin', 'write', 'admins/adm', null, false],
  ['관리자: 다른 계정 결과에 생년월일 넣기', 'admin', 'write', 'results/mem/r1/birth', '1996-10-13', false],
  ['관리자: 다른 계정 결과 지우기', 'admin', 'write', 'results/mem2/r2', null, false],
  ['관리자: 다른 계정 결과 공유 표시', 'admin', 'write', 'results/mem2/r2/shareToken', NEWTOK, false],
  ['관리자: 다른 계정 결과 공유 링크 만들기', 'admin', 'write', `shares/${NEWTOK}`, share('mem2', 'adm', 'r2'), false],
  ['관리자: 남이 만든 공유 링크 멈추기', 'admin', 'write', `shares/${TOKEN}`, null, false],
  ['관리자: 내 결과 저장 (승인 목록에 없어도)', 'admin', 'write', 'results/adm/new', rec(), true],
  ['관리자: 내 결과 지우기', 'admin', 'write', 'results/adm/r3', null, true],
  ['관리자: 내 결과 공유 표시와 링크', 'admin', 'write', [['results/adm/r3/shareToken', NEWTOK], [`shares/${NEWTOK}`, share('adm', 'adm', 'r3')]], true],
  ['관리자: 내 진행 저장', 'admin', 'write', 'drafts/adm/d', draft(), true],

  ['상담사: 모든 결과 보기', 'member', 'read', 'results', false],
  ['상담사: 내 결과 보기', 'member', 'read', 'results/mem', true],
  ['상담사: 다른 상담사 결과 보기', 'member', 'read', 'results/mem2', false],
  ['상담사: 결과 저장', 'member', 'write', 'results/mem/new', rec(), true],
  ['상담사: 내 결과 지우기', 'member', 'write', 'results/mem/r1', null, true],
  ['상담사: 저장된 내 결과 고치기', 'member', 'write', 'results/mem/r1/birth', '1990-01-01', false],
  ['상담사: 남의 계정에 결과 저장', 'member', 'write', 'results/mem2/new', rec(), false],
  ['상담사: 내 결과 공유 표시와 링크', 'member', 'write', [['results/mem/r1/shareToken', NEWTOK], [`shares/${NEWTOK}`, share('mem', 'mem', 'r1')]], true],
  ['상담사: 내 공유 링크 멈추기', 'member', 'write', `shares/${TOKEN}`, null, true],
  ['상담사: 남의 결과 공유 링크 만들기', 'member', 'write', `shares/${NEWTOK}`, share('mem2', 'mem', 'r2'), false],
  ['상담사: 승인 목록 보기', 'member', 'read', 'members', false],
  ['상담사: 내 승인 기록 보기', 'member', 'read', 'members/mem', true],
  ['상담사: 다른 사람 승인', 'member', 'write', 'members/req', member('요청'), false],
  ['상담사: 관리자 지정', 'member', 'write', 'admins/mem', true, false],
  ['상담사: 내 진행 저장', 'member', 'write', 'drafts/mem/d2', draft(), true],
  ['상담사: 남의 진행 보기', 'member', 'read', 'drafts/mem2', false],

  ['승인 전: 결과 저장', 'pending', 'write', 'results/req/new', rec(), false],
  ['승인 전: 진행 저장', 'pending', 'write', 'drafts/req/d', draft(), false],
  ['승인 전: 승인 요청 보내기', 'pending', 'write', 'requests/req', { name: '요청', email: 'req@example.com', createdAt: NOW }, true],
  ['승인 전: 승인 요청에 다른 칸 넣기', 'pending', 'write', 'requests/req', { name: '요청', email: 'req@example.com', createdAt: NOW, role: 'admin' }, false],
  ['승인 전: 요청 목록 보기', 'pending', 'read', 'requests', false],
  ['승인 전: 스스로 승인', 'pending', 'write', 'members/req', member('요청'), false],
  ['승인 전: 스스로 관리자', 'pending', 'write', 'admins/req', true, false],
  ['승인 전: 내가 관리자인지 보기', 'pending', 'read', 'admins/req', true],

  ['로그인 안 함: 공유 링크 보기', 'anon', 'read', `shares/${TOKEN}`, true],
  ['로그인 안 함: 결과 보기', 'anon', 'read', 'results/mem/r1', false],
  ['로그인 안 함: 공유 링크 만들기', 'anon', 'write', `shares/${NEWTOK}`, share('mem', 'mem', 'r1'), false],
];

const split = (p) => p.split('/').filter(Boolean);
let bad = 0;
const lines = [];
if (!RULES_TEXT.includes(`'${OWNER_EMAIL}'`)) {
  bad++;
  lines.push(`✗ 담당자 주소: assets/js/config.js의 OWNER_EMAIL(${OWNER_EMAIL})이 규칙에 없어요`);
}
for (const [label, who, op, where, ...rest] of CASES) {
  const want = rest[rest.length - 1];
  const auth = WHO[who];
  let got;
  if (op === 'read') {
    got = (Array.isArray(where) ? where : [where]).every((p) => canRead(auth, TREE, split(p)));
  } else {
    // 여러 자리를 차례로 쓰는 일(공유 표시 → 링크)은 앞의 쓰기가 반영된 상태에서 다음을 본다
    const steps = Array.isArray(where) ? where : [[where, rest[0]]];
    let tree = TREE;
    got = true;
    for (const [p, v] of steps) {
      if (!canWrite(auth, tree, split(p), v)) { got = false; break; }
      tree = setAt(tree, split(p), v);
    }
  }
  const ok = got === want;
  if (!ok) bad++;
  lines.push(`${ok ? '✓' : '✗'} ${label} — ${got ? '됨' : '막힘'}${ok ? '' : ` (기대: ${want ? '됨' : '막힘'})`}`);
}
console.log(lines.join('\n'));
console.log(bad ? `\n어긋난 곳 ${bad}개` : `\n모두 ${CASES.length}개 상황이 기대와 같아요`);
process.exit(bad ? 1 : 0);
