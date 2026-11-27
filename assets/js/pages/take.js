// AZIT : Star&Moon — 받은 검사 (상담사가 보낸 링크로 혼자 하는 검사)
// 로그인과 잠금 없이 연다. 링크에 적힌 검사를 차례로 하고, 답은 이 기기에 저장해 두었다가 끝나면 보낸다.
// 결과는 여기서 보여 주지 않는다. 링크를 만든 상담사가 사이트를 열 때 채점해서 함께 보며 안내한다.
import { ready, isDemo, getInvite, inviteSubmittedAt, submitInvite, inviteTests, validToken } from '../backend.js';
import { loadTest, getTestMeta } from '../registry.js';
import { runTest } from '../runner.js';
import { brandHTML, esc } from '../ui.js';
import { dueText } from '../links.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const token = params.get('k') || '';
const testId = params.get('t') || '';
const resume = params.get('resume');
const home = `take.html?k=${encodeURIComponent(token)}`;

// 이 기기에서 보낸 검사 (연결이 느려도 목록에 바로 '보냄'이 보이게)
const DONE = `azit:link:done:${token}`;
const readDone = () => { try { return new Set(JSON.parse(localStorage.getItem(DONE) || '[]')); } catch (e) { return new Set(); } };
const writeDone = (set) => { try { localStorage.setItem(DONE, JSON.stringify([...set])); } catch (e) { /* 저장소를 못 쓰면 계정 기록만 본다 */ } };

function demoBar() {
  if (!isDemo) return;
  const bar = document.createElement('div');
  bar.className = 'demo-bar';
  bar.textContent = '체험 모드예요. 보낸 답도 이 기기 안에만 저장돼요.';
  app.prepend(bar);
}

function shell(inner) {
  app.innerHTML = `<div class="take-page"><div class="wrap take-wrap">
    <a class="brand take-brand" href="${home}" aria-label="받은 검사 목록">${brandHTML()}</a>
    ${inner}
  </div></div>`;
  demoBar();
  const h = app.querySelector('[data-focus]');
  if (h) h.focus({ preventScroll: true });
}

function gate(title, body) {
  document.title = `${title} | AZIT : Star&Moon`;
  shell(`<section class="take-card take-gate" aria-labelledby="take-title">
    <h1 id="take-title" tabindex="-1" data-focus>${esc(title)}</h1>
    <p class="take-lead">${esc(body)}</p>
  </section>`);
}

// 이 기기에 남은 진행: 답한 문항 수
function progressOf(id) {
  const pre = `azit:link:${token}:${id}:`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(pre)) continue;
      const v = JSON.parse(localStorage.getItem(k) || 'null');
      if (v && v.answers) return Object.keys(v.answers).length;
    }
  } catch (e) { /* 저장소를 못 읽는 환경 */ }
  return 0;
}

function landing(inv, order, done) {
  document.title = '받은 검사 | AZIT : Star&Moon';
  const left = order.filter((id) => !done.has(id));
  const all = !left.length;
  const mins = left.reduce((s, id) => s + ((getTestMeta(id) || {}).minutes || 0), 0);
  shell(`<section class="take-card" aria-labelledby="take-title">
    <p class="take-from">${esc(inv.ownerName)} 상담사님이 보낸 검사</p>
    <h1 id="take-title" tabindex="-1" data-focus>${esc(inv.name)} 님, ${all ? '모두 마쳤어요' : '반가워요'}</h1>
    <p class="take-lead">${all
      ? `보내 주신 답은 ${esc(inv.ownerName)} 상담사님께 잘 전해졌어요. 결과는 상담사님이 함께 보며 안내해 드려요. 고마워요.`
      : '아래 검사를 차례로 해 주세요. 정답은 없어요. 요즘의 나에게 가까운 쪽을 편하게 고르면 돼요. 결과는 상담사님이 함께 보며 안내해 드려요.'}</p>
    ${all ? '' : `<p class="take-due">${esc(dueText(inv.expiresAt))}까지 열려 있어요 · 남은 검사 ${left.length}개, 약 ${mins}분</p>`}
    <ol class="take-list">${order.map((id, i) => {
      const m = getTestMeta(id) || { title: id, items: 0, minutes: 0 };
      const isDone = done.has(id);
      const n = isDone ? 0 : progressOf(id);
      const first = id === left[0];
      return `<li class="${isDone ? 'is-done' : ''}">
        <span class="n" aria-hidden="true">${isDone ? '✓' : i + 1}</span>
        <div class="t"><strong>${esc(m.title)}</strong><span>${m.items}문항 · 약 ${m.minutes}분${n ? ` · ${n}문항까지 답함` : ''}</span></div>
        ${isDone ? '<span class="tag take-sent">보냄<span class="sr-only"> (답을 보낸 검사)</span></span>'
          : `<a class="btn btn--small${first ? '' : ' btn--ghost'}" href="${home}&amp;t=${encodeURIComponent(id)}">${n ? '이어서 하기' : '시작하기'}</a>`}
      </li>`;
    }).join('')}</ol>
    ${all ? '' : '<p class="take-note">답할 때마다 이 기기에 저장돼요. 중간에 나가도 이 링크를 다시 열면 이어서 할 수 있어요.</p>'}
  </section>`);
}

(async () => {
  await ready();
  if (!validToken(token)) return gate('링크를 찾을 수 없어요', '주소가 끝까지 복사되었는지 확인해 주세요. 그래도 열리지 않으면 상담사님께 새 링크를 받아 주세요.');
  let inv = null;
  try { inv = await getInvite(token); } catch (e) { return gate('링크를 열지 못했어요', '인터넷 연결을 확인한 뒤 다시 열어 주세요.'); }
  if (!inv) return gate('링크를 찾을 수 없어요', '주소가 끝까지 복사되었는지 확인해 주세요. 그래도 열리지 않으면 상담사님께 새 링크를 받아 주세요.');
  if (inv.cancelledAt) return gate('보내기를 멈춘 링크예요', '상담사님께 새 링크를 받아 주세요.');
  if (Date.now() > (inv.expiresAt || 0)) return gate('기한이 지난 링크예요', `${dueText(inv.expiresAt)}까지 열려 있던 링크예요. 상담사님께 새 링크를 받아 주세요.`);
  const order = inviteTests(inv).filter((id) => (getTestMeta(id) || {}).status === 'open');
  if (!order.length) return gate('열 수 있는 검사가 없어요', '상담사님께 다시 확인해 주세요.');

  // 다른 기기에서 이미 보낸 검사도 '보냄'으로 (낸 시각만 읽을 수 있다)
  const done = readDone();
  await Promise.all(order.map(async (id) => {
    if (done.has(id)) return;
    const at = await inviteSubmittedAt(token, id).catch(() => null);
    if (at) done.add(id);
  }));
  writeDone(done);

  if (testId && order.includes(testId) && !done.has(testId)) {
    const def = await loadTest(testId);
    if (def) {
      document.title = `${def.title} | AZIT : Star&Moon`;
      await runTest(def, app, {
        ownerName: inv.ownerName,
        resume: resume === null ? undefined : resume,
        link: {
          token, invite: inv, tests: order, done,
          submit: (id, payload) => submitInvite(token, id, payload),
          submittedAt: (id) => inviteSubmittedAt(token, id),
          markDone: () => writeDone(done),
        },
      });
      demoBar();
      return;
    }
  }
  if (testId) { try { history.replaceState(null, '', home); } catch (e) { /* */ } }
  landing(inv, order, done);
})();
