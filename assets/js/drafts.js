// AZIT : Star&Moon — 끝난 검사의 진행(임시 저장) 알아보기
// 진행은 검사를 끝내면 지워진다. 그래도 남는 경우가 있다.
//  - 같은 검사자를 다른 창이나 기기에서 처음부터 다시 해서 끝냈을 때 (먼저 하던 진행이 그대로 남음)
//  - 끝낸 진행을 열어 둔 예전 창이 나중에 다시 저장했을 때
// 그래서 '같은 검사자가 같은 검사를, 그 진행을 시작한 뒤에 끝낸 결과'가 있으면 그 진행은 끝난 것으로 본다.
// 진행을 시작하기 전에 끝낸 결과는 상관없다: 같은 검사를 다시 하는 중일 수 있으니 남겨 둔다.
import { currentUser, listMyResultsFrom, timeKey } from './backend.js';

const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
export const sameName = (a, b) => norm(a) === norm(b);

// 진행 d와 결과(또는 지금 적은 검사자) r이 같은 분인지.
// 생년월일이 둘 다 있으면 같아야 한다. 진행에 생년월일이 없으면(생년월일을 받기 전의 진행) 이름만 본다.
// 진행에는 있는데 결과에 없으면 같은 분인지 알 수 없으니 다른 분으로 본다(지우지 않는 쪽).
export function samePerson(d, r) {
  if (!d || !r || !sameName(d.name, r.name)) return false;
  if (!d.birth) return true;
  return !!r.birth && d.birth === r.birth;
}

export const startOf = (d) => Number(d && (d.startedAt || d.savedAt)) || 0;
export const draftIdOf = (d) => `${d.testId}-${d.version}-${d.sid}`;
export const finishes = (r, d) => !!r && r.testId === d.testId && samePerson(d, r) && (Number(r.createdAt) || 0) > startOf(d);

// 기기마다 시계가 조금씩 달라도 놓치지 않게, 결과는 진행 시작보다 넉넉히 앞에서부터 읽는다
const SKEW = 10 * 60e3;
const KEEP = 31 * 864e5;
const store = (uid) => `azit:drafts:checked:${uid}`;
const readChecked = (uid) => { try { return JSON.parse(localStorage.getItem(store(uid)) || '{}') || {}; } catch (e) { return {}; } };
const writeChecked = (uid, v) => { try { localStorage.setItem(store(uid), JSON.stringify(v)); } catch (e) { /* 저장소를 못 쓰면 다음에 처음부터 확인 */ } };
const within = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

// 진행 목록 가운데 이미 끝난 것의 id(검사-버전-세션) 모음.
// 결과는 아직 확인하지 않은 것만 읽는다: 진행마다 어디까지 확인했는지(결과 키)를 이 기기에 적어 두고
// 다음에는 그 뒤에 저장된 결과만 본다. 적어 두는 것은 키뿐이고 이름은 남기지 않는다.
// 결과를 읽지 못하면(연결 끊김 등) 예외를 던진다. 부르는 쪽은 그대로 두고 다음에 다시 본다.
export async function findFinished(list, { timeout = 6000 } = {}) {
  const u = currentUser();
  const drafts = (list || []).filter((d) => d && d.testId && d.sid && startOf(d));
  if (!u || !drafts.length) return new Set();
  const checked = readChecked(u.uid);
  const fromOf = (d) => {
    const k = timeKey(startOf(d) - SKEW);
    const c = checked[draftIdOf(d)];
    return c && c.k > k ? c.k : k;
  };
  const from = drafts.map(fromOf).sort()[0];
  const results = await within(listMyResultsFrom(from), timeout);
  const now = Date.now();
  // 다음에 읽기 시작할 자리: 이번에 읽은 마지막 결과 키(시각이 든 push 키만 센다), 적어도 '지금보다 조금 앞'
  const ceil = timeKey(now + 864e5);
  const upto = results.reduce((m, r) => (/^[-0-9A-Za-z_]{20}$/.test(r.rid) && r.rid.slice(0, 8) <= ceil && r.rid > m ? r.rid : m), timeKey(now - SKEW));
  const done = new Set();
  drafts.forEach((d) => {
    const id = draftIdOf(d);
    if (results.some((r) => finishes(r, d))) { done.add(id); delete checked[id]; }
    else checked[id] = { k: upto, at: now };
  });
  Object.keys(checked).forEach((id) => { if (!checked[id] || now - (checked[id].at || 0) > KEEP) delete checked[id]; });
  writeChecked(u.uid, checked);
  return done;
}
