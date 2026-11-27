import { esc, toast, login, googleButton, fmtDate } from '../ui.js';
import { ready, onUser, accessStatus, sendRequest, cancelRequest, signOut, isDemo, currentUser } from '../backend.js';
import { constellation } from '../charts.js';
import { relockAll } from '../lock.js';

const box = document.querySelector('[data-state]');
document.querySelector('[data-figure]').innerHTML = constellation(
  { 1: 62, 2: 48, 3: 55, 4: 70, 5: 44, 6: 58, 7: 50, 8: 46, 9: 86 },
  { core: 9, animate: true, labels: false, size: 200, title: 'AZIT 별자리' }
);
if (isDemo) {
  const bar = document.createElement('div');
  bar.className = 'demo-bar';
  bar.textContent = '체험 모드예요. 로그인과 결과가 이 기기 안에만 저장돼요.';
  document.body.prepend(bar);
}

const next = (() => {
  const n = new URLSearchParams(location.search).get('next') || '';
  return /^(index|test|me|result|admin)\.html(\?[^#]*)?$/.test(n) ? n : 'index.html';
})();

let busy = false;
let again = false;

function renderLoggedOut() {
  box.innerHTML = `<p class="login-note">승인된 상담사만 이용할 수 있어요.<br>구글 계정으로 로그인해 주세요.</p>
    ${googleButton('구글로 로그인', 'btn btn--block')}`;
}

function whoLine(u) {
  return `<p class="login-who">${esc(u.email || u.name)} 계정으로 로그인했어요 <button type="button" class="btn btn--text" data-act="switch">다른 계정으로</button></p>`;
}

function renderRequestForm(u) {
  box.innerHTML = `${whoLine(u)}
    <h2 class="login-h">이용 승인이 필요해요</h2>
    <p class="login-note">아래 내용을 적어 요청을 보내면, 관리자가 확인한 뒤 승인해 드려요.</p>
    <div class="field"><label for="rq-name">이름</label><input class="input" id="rq-name" maxlength="20" autocomplete="name" value="${esc(u.name || '')}">
      <p class="field-hint field-hint--quiet">담당자가 알아볼 수 있게 실명으로 적어 주세요.</p></div>
    <div class="field"><label for="rq-note">소속 또는 메모 <span class="field-opt">(선택)</span></label><input class="input" id="rq-note" maxlength="60" placeholder="예: AZIT 상담팀"></div>
    <button type="button" class="btn btn--block" data-act="request">요청 보내기</button>`;
  const nameEl = box.querySelector('#rq-name');
  const btn = box.querySelector('[data-act="request"]');
  const sync = () => { btn.disabled = !nameEl.value.trim(); };
  nameEl.addEventListener('input', sync);
  sync();
}

function renderPending(u, req) {
  box.innerHTML = `${whoLine(u)}
    <h2 class="login-h">승인을 기다리고 있어요</h2>
    <p class="login-note">${esc(fmtDate(req.createdAt))}에 요청을 보냈어요. 관리자가 승인하면 바로 이용할 수 있어요.</p>
    <dl class="login-req">
      <div><dt>이름</dt><dd>${esc(req.name || '')}</dd></div>
      ${req.note ? `<div><dt>소속 또는 메모</dt><dd>${esc(req.note)}</dd></div>` : ''}
    </dl>
    <button type="button" class="btn btn--block" data-act="recheck">승인됐는지 다시 확인</button>
    <button type="button" class="btn btn--ghost btn--block" data-act="cancel">요청 취소</button>`;
}

async function refresh() {
  if (busy) { again = true; return; } // 확인 중에 상태가 바뀌면 끝난 뒤 한 번 더 확인한다
  busy = true;
  again = false;
  try {
    await ready();
    const st = await accessStatus();
    if (!st.user) { renderLoggedOut(); return; }
    if (st.approved) { location.replace(next); return; }
    if (st.request) renderPending(st.user, st.request);
    else renderRequestForm(st.user);
  } catch (e) {
    console.error(e);
    box.innerHTML = `<p class="login-note">연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.</p><button type="button" class="btn btn--block" data-act="recheck">다시 시도</button>`;
  } finally {
    busy = false;
    if (again) refresh();
  }
}

box.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-login')) {
    b.disabled = true;
    await login();
    b.disabled = false;
    return;
  }
  const act = b.dataset.act;
  if (act === 'switch') {
    relockAll();
    await signOut();
    renderLoggedOut();
  } else if (act === 'request') {
    const name = box.querySelector('#rq-name').value.trim();
    const note = box.querySelector('#rq-note').value.trim();
    if (!name) return;
    b.disabled = true;
    try {
      await sendRequest({ name, note });
      toast('요청을 보냈어요.');
    } catch (err) {
      console.error(err);
      toast('요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    b.disabled = false;
    refresh();
  } else if (act === 'cancel') {
    b.disabled = true;
    try { await cancelRequest(); toast('요청을 취소했어요.'); } catch (err) { console.error(err); toast('취소하지 못했어요.'); }
    refresh();
  } else if (act === 'recheck') {
    await refresh();
    const u = currentUser();
    if (u && box.querySelector('.login-h') && box.querySelector('.login-h').textContent.includes('기다리고')) toast('아직 승인 전이에요.');
  }
});

document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
onUser(() => refresh());
refresh();
