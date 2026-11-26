// AZIT : Star&Moon — 로그인과 저장소
// Firebase(구글 로그인 + Realtime Database)를 쓰고, 설정이 없거나 ?demo=1 이면
// 이 기기 안에서만 동작하는 체험 모드로 같은 기능을 흉내 낸다.
import { FIREBASE, FIREBASE_SDK } from './config.js';

const DEMO_FLAG = 'azit:demo';
const DEMO_DB = 'azit:demo:db';
const DEMO_USER = 'azit:demo:user';
const DEMO_ROLE = 'azit:demo:role'; // 체험 모드에서 'user'로 두면 승인 전 계정을 흉내 낸다

(() => {
  try {
    const q = new URLSearchParams(location.search);
    const p = q.get('demo');
    if (p === '1') localStorage.setItem(DEMO_FLAG, '1');
    if (p === '0') localStorage.removeItem(DEMO_FLAG);
    const r = q.get('demorole');
    if (r === 'user') localStorage.setItem(DEMO_ROLE, 'user');
    if (r === 'admin') localStorage.removeItem(DEMO_ROLE);
  } catch (e) { /* 저장소를 못 쓰는 환경 */ }
})();

function readFlag() {
  try { return localStorage.getItem(DEMO_FLAG) === '1'; } catch (e) { return false; }
}

export const MODE = !FIREBASE || readFlag() ? 'demo' : 'firebase';
export const isDemo = MODE === 'demo';

let fb = null;
let user; // undefined = 아직 모름, null = 로그아웃
const listeners = new Set();
let readyPromise = null;

function emit() { listeners.forEach((cb) => { try { cb(user); } catch (e) { console.error(e); } }); }

function normalize(u) {
  if (!u) return null;
  return {
    uid: u.uid,
    name: u.displayName || (u.email ? u.email.split('@')[0] : '이름 없음'),
    email: u.email || '',
    photo: u.photoURL || '',
  };
}

// ── 체험 모드 저장소 ───────────────────────────────
function demoRead() {
  try { return JSON.parse(localStorage.getItem(DEMO_DB) || '{}'); } catch (e) { return {}; }
}
function demoWrite(tree) { localStorage.setItem(DEMO_DB, JSON.stringify(tree)); }
function parts(path) { return path.split('/').filter(Boolean); }
function demoGet(path) {
  let node = demoRead();
  for (const k of parts(path)) {
    if (node == null || typeof node !== 'object') return null;
    node = node[k];
  }
  return node === undefined ? null : node;
}
function demoSet(path, value) {
  const tree = demoRead();
  const ks = parts(path);
  let node = tree;
  for (let i = 0; i < ks.length - 1; i++) {
    if (node[ks[i]] == null || typeof node[ks[i]] !== 'object') node[ks[i]] = {};
    node = node[ks[i]];
  }
  const last = ks[ks.length - 1];
  if (value === null || value === undefined) delete node[last];
  else node[last] = JSON.parse(JSON.stringify(value));
  demoWrite(tree);
}
function pushKey() {
  // Firebase push 키처럼 시간순으로 정렬되는 20자 키
  const chars = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  let now = Date.now();
  let out = '';
  for (let i = 0; i < 8; i++) { out = chars.charAt(now % 64) + out; now = Math.floor(now / 64); }
  const rnd = crypto.getRandomValues(new Uint8Array(12));
  for (let i = 0; i < 12; i++) out += chars.charAt(rnd[i] % 64);
  return out;
}

// ── 초기화 ────────────────────────────────────────
export function ready() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await null; // 아래의 emit()이 readyPromise가 정해진 뒤에 돌도록 한 박자 미룬다
    if (MODE === 'firebase') {
      const [A, F, D] = await Promise.all([
        import(`${FIREBASE_SDK}firebase-app.js`),
        import(`${FIREBASE_SDK}firebase-auth.js`),
        import(`${FIREBASE_SDK}firebase-database.js`),
      ]);
      const app = A.initializeApp(FIREBASE);
      const auth = F.getAuth(app);
      const db = D.getDatabase(app);
      fb = { auth, db, F, D };
      F.getRedirectResult(auth).catch(() => {});
      await new Promise((resolve) => {
        let first = true;
        F.onAuthStateChanged(auth, (u) => {
          user = normalize(u);
          if (user) touchUser().catch(() => {});
          emit();
          if (first) { first = false; resolve(); }
        });
      });
    } else {
      try { user = JSON.parse(localStorage.getItem(DEMO_USER) || 'null'); } catch (e) { user = null; }
      emit();
    }
  })();
  return readyPromise;
}

export function currentUser() { return user || null; }

export function onUser(cb) {
  listeners.add(cb);
  if (user !== undefined) cb(user);
  return () => listeners.delete(cb);
}

// ── 로그인 ────────────────────────────────────────
// 팝업 차단을 피하려고, 버튼을 누른 그 순간에 바로 팝업을 연다 (앞에 await를 두지 않는다)
export function signIn() {
  if (MODE === 'demo') {
    user = { uid: 'demo-user', name: '체험 사용자', email: 'demo@azit.local', photo: '' };
    localStorage.setItem(DEMO_USER, JSON.stringify(user));
    emit();
    return Promise.resolve(user);
  }
  if (!fb) return ready().then(() => signIn());
  const { auth, F } = fb;
  const provider = new F.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return F.signInWithPopup(auth, provider)
    .then((res) => normalize(res.user))
    .catch(async (e) => {
      const code = e && e.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' || code === 'auth/web-storage-unsupported') {
        await F.signInWithRedirect(auth, provider);
        return null;
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
      throw e;
    });
}

export async function signOut() {
  await ready();
  if (MODE === 'demo') {
    localStorage.removeItem(DEMO_USER);
    user = null;
    emit();
    return;
  }
  await fb.F.signOut(fb.auth);
}

// ── 데이터 기본 동작 ──────────────────────────────
async function dbGet(path) {
  await ready();
  if (MODE === 'demo') return demoGet(path);
  const snap = await fb.D.get(fb.D.ref(fb.db, path));
  return snap.exists() ? snap.val() : null;
}
async function dbSet(path, value) {
  await ready();
  if (MODE === 'demo') return demoSet(path, value);
  // Firebase는 undefined가 섞인 값을 통째로 거부하니, 저장 전에 한 번 걸러 낸다
  const clean = value === null || typeof value !== 'object' ? value : JSON.parse(JSON.stringify(value));
  return fb.D.set(fb.D.ref(fb.db, path), clean);
}
async function dbRemove(path) {
  await ready();
  if (MODE === 'demo') return demoSet(path, null);
  return fb.D.remove(fb.D.ref(fb.db, path));
}
function newKey(path) {
  if (MODE === 'demo') return pushKey();
  return fb.D.push(fb.D.ref(fb.db, path)).key;
}

function requireUser() {
  if (!user) throw new Error('로그인이 필요해요.');
  return user;
}

async function touchUser() {
  if (!user) return;
  await dbSet(`users/${user.uid}`, { name: user.name, email: user.email, photo: user.photo || '', updatedAt: Date.now() });
}

// ── 관리자 ────────────────────────────────────────
export async function isAdmin() {
  await ready();
  if (!user) return false;
  if (MODE === 'demo') {
    try { return localStorage.getItem(DEMO_ROLE) !== 'user'; } catch (e) { return true; }
  }
  try { return (await dbGet(`admins/${user.uid}`)) === true; } catch (e) { return false; }
}

export async function isUserAdmin(uid) {
  if (MODE === 'demo') return uid === (user && user.uid) && (await isAdmin());
  try { return (await dbGet(`admins/${uid}`)) === true; } catch (e) { return false; }
}

export async function setUserAdmin(uid, on) {
  requireUser();
  if (on) await dbSet(`admins/${uid}`, true);
  else await dbRemove(`admins/${uid}`);
}

export async function claimAdmin() {
  const u = requireUser();
  await dbSet(`admins/${u.uid}`, true);
  return true;
}

// ── 승인된 상담사 ─────────────────────────────────
async function safeGet(path) {
  try { return await dbGet(path); } catch (e) { return null; }
}

// 지금 로그인한 계정이 사이트를 쓸 수 있는지
export async function accessStatus() {
  await ready();
  if (!user) return { user: null, admin: false, member: null, request: null, approved: false };
  const [admin, member, request] = await Promise.all([isAdmin(), safeGet(`members/${user.uid}`), safeGet(`requests/${user.uid}`)]);
  return { user, admin, member, request, approved: !!(admin || member) };
}

export function greetingName(status) {
  return (status && status.member && status.member.name) || (user && user.name) || '';
}

export async function sendRequest({ name, note }) {
  const u = requireUser();
  const data = { name: String(name || '').slice(0, 30), email: u.email || '', note: String(note || '').slice(0, 100), createdAt: Date.now() };
  await dbSet(`requests/${u.uid}`, data);
  return data;
}

export async function cancelRequest() {
  const u = requireUser();
  await dbRemove(`requests/${u.uid}`);
}

export async function listRequests() {
  return (await dbGet('requests')) || {};
}

export async function listMembers() {
  return (await dbGet('members')) || {};
}

export async function approveMember(uid, info = {}) {
  const u = requireUser();
  await dbSet(`members/${uid}`, {
    name: String(info.name || '').slice(0, 30) || '상담사',
    email: info.email || '',
    note: String(info.note || '').slice(0, 100),
    approvedAt: Date.now(),
    approvedBy: u.uid,
  });
  await dbRemove(`requests/${uid}`);
}

export async function rejectRequest(uid) {
  await dbRemove(`requests/${uid}`);
}

export async function revokeMember(uid) {
  await dbRemove(`members/${uid}`);
}

// ── 결과 ──────────────────────────────────────────
// ── 진행 중인 검사 (상담사 계정에 임시 저장) ─────────
// 건너뛴 문항(null)은 Firebase가 지워 버리므로 0으로 바꿔 저장하고, 읽을 때 되돌린다. (실제 응답에는 0이 없다)
const draftKey = (id) => String(id).replace(/[.#$[\]/]/g, '-');
const encodeAnswers = (a) => Object.fromEntries(Object.entries(a || {}).map(([k, v]) => [k, v === null ? 0 : v]));
const decodeAnswers = (a) => Object.fromEntries(Object.entries(a || {}).map(([k, v]) => [k, v === 0 ? null : v]));

export async function saveDraft(id, data) {
  const u = requireUser();
  await dbSet(`drafts/${u.uid}/${draftKey(id)}`, { ...data, answers: encodeAnswers(data.answers) });
}

export async function listDrafts() {
  await ready();
  if (!user) return [];
  const v = (await dbGet(`drafts/${user.uid}`)) || {};
  return Object.values(v).filter((d) => d && d.answers).map((d) => ({ ...d, answers: decodeAnswers(d.answers) }));
}

export async function deleteDraft(id) {
  await ready();
  if (!user) return;
  await dbRemove(`drafts/${user.uid}/${draftKey(id)}`);
}

export async function saveResult(record) {
  const u = requireUser();
  await ready();
  const rid = newKey(`results/${u.uid}`);
  const data = { ...record, uid: u.uid, email: u.email, createdAt: Date.now() };
  await dbSet(`results/${u.uid}/${rid}`, data);
  return { uid: u.uid, rid };
}

export async function getResult(uid, rid) {
  return dbGet(`results/${uid}/${rid}`);
}

export async function listMyResults() {
  const u = requireUser();
  const tree = (await dbGet(`results/${u.uid}`)) || {};
  return Object.entries(tree)
    .map(([rid, r]) => ({ uid: u.uid, rid, ...r }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// 한 상담사 계정의 결과 (내 계정이 아니면 관리자만 읽을 수 있다)
export async function listResultsOf(uid) {
  const u = requireUser();
  if (!uid || uid === u.uid) return listMyResults();
  const tree = (await dbGet(`results/${uid}`)) || {};
  return Object.entries(tree)
    .map(([rid, r]) => ({ uid, rid, ...r }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function listAllResults() {
  const tree = (await dbGet('results')) || {};
  const out = [];
  Object.entries(tree).forEach(([uid, byRid]) => {
    Object.entries(byRid || {}).forEach(([rid, r]) => out.push({ uid, rid, ...r }));
  });
  return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function listUsers() {
  return (await dbGet('users')) || {};
}

export async function deleteResult(uid, rid) {
  const rec = await dbGet(`results/${uid}/${rid}`);
  if (rec && rec.shareToken) {
    try { await dbRemove(`shares/${rec.shareToken}`); } catch (e) { /* 이미 지워짐 */ }
  }
  await dbRemove(`results/${uid}/${rid}`);
}

// ── 공유 링크 ────────────────────────────────────
function newToken() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = crypto.getRandomValues(new Uint8Array(24));
  let out = '';
  for (let i = 0; i < 24; i++) out += chars.charAt(rnd[i] % chars.length);
  return out;
}

export async function createShare(uid, rid) {
  const u = requireUser();
  const rec = await getResult(uid, rid);
  if (!rec) throw new Error('결과를 찾을 수 없어요.');
  if (rec.shareToken) {
    const existing = await dbGet(`shares/${rec.shareToken}`);
    if (existing) return rec.shareToken;
  }
  const token = newToken();
  const payload = {
    testId: rec.testId,
    version: rec.version || '',
    name: rec.name || '',
    createdAt: rec.createdAt || Date.now(),
    scores: rec.scores,
  };
  await dbSet(`shares/${token}`, { ownerUid: uid, resultId: rid, createdBy: u.uid, createdAt: Date.now(), payload });
  await dbSet(`results/${uid}/${rid}/shareToken`, token);
  return token;
}

export async function revokeShare(uid, rid) {
  const rec = await getResult(uid, rid);
  if (rec && rec.shareToken) {
    await dbRemove(`shares/${rec.shareToken}`);
    await dbSet(`results/${uid}/${rid}/shareToken`, null);
  }
}

export async function getShare(token) {
  if (!/^[A-Za-z0-9]{20,64}$/.test(token || '')) return null;
  return dbGet(`shares/${token}`);
}

export function shareUrl(token) {
  return new URL(`result.html?s=${encodeURIComponent(token)}`, location.href).href;
}

export function resultUrl(uid, rid) {
  return `result.html?u=${encodeURIComponent(uid)}&r=${encodeURIComponent(rid)}`;
}

// 종합 결과지: 그 검사자의 결과 한 건을 기준으로 연다 (주소에 이름을 넣지 않는다)
export function personUrl(uid, rid) {
  return `person.html?u=${encodeURIComponent(uid)}&r=${encodeURIComponent(rid)}`;
}
