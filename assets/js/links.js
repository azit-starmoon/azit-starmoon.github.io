// AZIT : Star&Moon — 검사 링크: 상담사 쪽
// 내담자가 링크로 낸 답(submissions)은, 링크를 만든 상담사가 사이트를 열 때 이 기기에서 채점해서
// 그 상담사의 결과(results)로 옮긴다. 결과 키는 '낸 시각 + 링크·검사에서 나온 글자'로 정해서
// 두 기기에서 함께 옮겨도 결과가 두 번 생기지 않는다(결과는 한 번 쓰면 고칠 수 없다).
import {
  currentUser, listMyInvites, readSubmissions, dropSubmission, markInvite, saveResult, getResult, timeKey, inviteTests, inviteUrl,
} from './backend.js';
import { loadTest, getTestMeta } from './registry.js';

const KEY_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
const KEEP_AFTER = 30 * 864e5; // 기한이 지나고 30일이 넘은 링크는 더 확인하지 않는다

async function resultKey(token, testId, at) {
  const buf = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`azit-link:${token}:${testId}`)));
  let tail = '';
  for (let i = 0; i < 12; i++) tail += KEY_CHARS.charAt(buf[i] % 64);
  return timeKey(at) + tail;
}

// 낸 답을 검사 정의에 맞춰 다시 고른다: 문항마다 그 형식에 맞는 답만 받고, 하나라도 빠지거나 어긋나면 ok=false
export function cleanAnswers(def, raw) {
  const src = raw || {};
  const used = {};
  let ok = true;
  def.parts.forEach((p) => {
    const items = p.items || p.build(src);
    items.forEach((it) => {
      const v = src[it.id];
      if (v === null && p.skippable) { used[it.id] = null; return; }
      if (p.kind === 'likert') {
        if (p.scale.some((s) => s.value === v)) used[it.id] = v; else ok = false;
      } else if (p.kind === 'pair') {
        if ([2, 1, -1, -2].includes(v)) used[it.id] = v; else ok = false;
      } else if (p.kind === 'rank') {
        const keys = it.options.map((o) => o.key);
        if (Array.isArray(v) && v.length === keys.length && keys.every((k) => v.includes(k))) used[it.id] = v.slice(); else ok = false;
      } else if (p.kind === 'text') {
        const max = it.max || p.max || 800;
        if (v === undefined || v === null) used[it.id] = ''; // 비워 둔 글은 저장소에 남지 않는다
        else if (typeof v === 'string' && v.length <= max) used[it.id] = v;
        else ok = false;
      } else ok = false;
    });
  });
  return { used, ok };
}

// 보낸 링크 한 건의 형편
export function inviteState(inv, now = Date.now()) {
  const tests = inviteTests(inv);
  const got = inv.got || {};
  const n = tests.filter((id) => got[id]).length;
  if (tests.length && n === tests.length) return { key: 'done', n, total: tests.length };
  if (inv.cancelledAt) return { key: 'cancelled', n, total: tests.length };
  if (now > (inv.expiresAt || 0)) return { key: 'expired', n, total: tests.length };
  return { key: 'open', n, total: tests.length };
}

let running = null;
// 들어온 답을 결과로 옮긴다. 돌려주는 것: 옮긴 수와 옮긴 결과 목록
export function importLinks() {
  if (running) return running;
  running = (async () => {
    const u = currentUser();
    const out = { imported: 0, items: [] };
    if (!u) return out;
    const now = Date.now();
    let list = [];
    try { list = await listMyInvites(); } catch (e) { return out; }
    for (const inv of list) {
      const tests = inviteTests(inv);
      const got = inv.got || {};
      if (tests.every((id) => got[id]) || now - (inv.expiresAt || 0) > KEEP_AFTER) continue;
      let subs = {};
      try { subs = await readSubmissions(inv.token); } catch (e) { continue; }
      for (const [testId, sub] of Object.entries(subs)) {
        if (!tests.includes(testId)) continue;
        if (got[testId]) { await dropSubmission(inv.token, testId).catch(() => {}); continue; }
        const def = await loadTest(testId).catch(() => null);
        if (!def) continue;
        const { used, ok } = cleanAnswers(def, sub.answers);
        if (!ok) { await markInvite(inv.token, { [`bad/${testId}`]: true }).catch(() => {}); continue; }
        try {
          const durationSec = Math.max(0, Math.min(3 * 3600, Math.round(Number(sub.durationSec) || 0)));
          const scores = def.score(used, { durationSec });
          const at = Math.min(now, Math.max(inv.createdAt || 0, Number(sub.submittedAt) || now));
          const birth = inv.birth || (typeof sub.birth === 'string' ? sub.birth : '');
          const record = {
            testId, version: def.version, name: inv.name || sub.name || '이름 없음', ...(birth ? { birth } : {}),
            ownerName: inv.ownerName || u.name || '', answers: used, scores, summary: def.summary(scores),
            glyph: def.glyph ? String(def.glyph(scores) || '').slice(0, 2) : '', durationSec, via: 'link',
          };
          const rid = await resultKey(inv.token, testId, at);
          if (!(await getResult(u.uid, rid).catch(() => null))) {
            try { await saveResult(record, { rid, createdAt: at }); } catch (e) {
              if (!(await getResult(u.uid, rid).catch(() => null))) throw e; // 다른 기기가 먼저 옮겼으면 괜찮다
            }
          }
          await markInvite(inv.token, { [`got/${testId}`]: rid });
          got[testId] = rid;
          await dropSubmission(inv.token, testId).catch(() => {});
          out.imported++;
          out.items.push({ token: inv.token, testId, rid, name: record.name });
        } catch (e) {
          console.warn('링크 결과 옮기기', testId, e);
        }
      }
    }
    return out;
  })().finally(() => { running = null; });
  return running;
}

// 받는 분께 보낼 글
const DAY = ['일', '월', '화', '수', '목', '금', '토'];
export const dueText = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}월 ${d.getDate()}일(${DAY[d.getDay()]})`; };
export function inviteMinutes(tests) {
  return tests.reduce((s, id) => s + ((getTestMeta(id) || {}).minutes || 0), 0);
}
export function inviteMessage({ name, ownerName, tests, expiresAt, token }) {
  const titles = tests.map((id) => (getTestMeta(id) || { title: id }).title);
  const mins = inviteMinutes(tests);
  return [
    `${name} 님, 안녕하세요. ${ownerName ? `${ownerName} 상담사예요.` : 'AZIT 상담팀이에요.'}`,
    `상담에 앞서 아래 링크에서 검사를 부탁드려요.`,
    `${titles.join(', ')} (${tests.length}개, 약 ${mins}분)`,
    `${dueText(expiresAt)}까지 열려 있고, 중간에 나가도 이어서 할 수 있어요.`,
    inviteUrl(token),
  ].join('\n');
}
