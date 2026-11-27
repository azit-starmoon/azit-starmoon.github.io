import { mountHeader, mountFooter, esc, toast, modal, copyText } from '../ui.js';
import { ready, getResult, getMember, getShare, createShare, revokeShare, deleteResult, shareUrl, personUrl } from '../backend.js';
import { requireApproved } from '../guard.js';
import { requireUnlock, watchLock } from '../lock.js';
import { loadTest, codeOf } from '../registry.js';

const box = document.querySelector('[data-report]');
const q = new URLSearchParams(location.search);
const token = q.get('s');
const uid = q.get('u');
const rid = q.get('r');

function gate(title, text, extra = '') {
  box.innerHTML = `<div class="wrap"><div class="gate"><h1>${esc(title)}</h1><p>${esc(text)}</p>${extra}</div></div>`;
}

// 결과지를 그리다 오류가 나면 빈 화면 대신 안내를 남긴다 (원인은 콘솔에 남긴다)
function draw(def, el, rec, ctx, ask) {
  try {
    def.render(el, rec, ctx);
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="wrap"><div class="gate"><h1>결과지를 그리지 못했어요</h1><p>결과는 그대로 저장되어 있어요. 새로고침해도 같으면 ${esc(ask)}에게 알려 주세요.</p></div></div>`;
  }
}

async function renderShared() {
  mountHeader('');
  await ready();
  let share = null;
  try { share = await getShare(token); } catch (e) { share = null; }
  if (!share || !share.payload) {
    gate('볼 수 없는 링크예요', '공유가 중지되었거나 잘못된 링크예요. 결과를 공유한 사람에게 새 링크를 받아 주세요.', '<a class="btn" href="index.html">AZIT 둘러보기</a>');
    return;
  }
  const p = share.payload;
  const def = await loadTest(p.testId);
  if (!def) { gate('결과지를 열 수 없어요', '이 검사는 지금 열려 있지 않아요.'); return; }
  document.title = `${p.name || ''} 님의 ${def.title} 결과지 | AZIT : Star&Moon`;
  box.innerHTML = `<div class="shared-note">AZIT : Star&amp;Moon에서 공유한 ${esc(p.name || '')} 님의 결과지예요.</div><div data-body></div>`;
  draw(def, box.querySelector('[data-body]'), { name: p.name, createdAt: p.createdAt, scores: p.scores }, { shared: true, rid: share.resultId }, '링크를 보낸 분');
  markCode(box, p.testId);
  mountFooter();
}

// 결과지 표지의 '○○ 검사 결과지' 앞에 검사 약칭을 붙인다 (모든 결과지가 같은 표지 틀을 쓴다)
function markCode(el, id) {
  const code = codeOf(id);
  const doc = el && el.querySelector('.cover-top .doc');
  if (code && doc && !doc.querySelector('.doc-code')) doc.insertAdjacentHTML('afterbegin', `<span class="doc-code">${esc(code)}</span>`);
}

async function renderOwned() {
  const st = await requireApproved();
  if (!st) return;
  await requireUnlock('result');
  watchLock('result');
  mountHeader('me');
  let rec = null;
  try { rec = await getResult(uid, rid); } catch (e) { rec = null; }
  if (!rec) {
    gate('결과지를 열 수 없어요', '결과가 지워졌거나, 이 계정으로는 볼 수 없는 결과예요.', '<a class="btn" href="me.html">검사 결과 목록으로</a>');
    return;
  }
  const def = await loadTest(rec.testId);
  if (!def) { gate('결과지를 열 수 없어요', '이 검사는 지금 열려 있지 않아요.'); return; }
  const admin = st.admin;
  const mine = st.user.uid === uid;
  const canEdit = mine || st.owner; // 다른 계정 결과의 공유·지우기는 담당자만
  const acct = admin && !mine ? await getMember(uid) : null; // 관리 화면에서 이름을 고쳤으면 지금 이름으로
  const who = esc((acct && acct.name) || rec.ownerName || rec.email || '');
  document.title = `${rec.name || ''} 님의 ${def.title} 결과지 | AZIT : Star&Moon`;
  // 왼쪽은 돌아가는 길, 오른쪽은 이 결과지로 하는 일. 지우기는 조용한 글자 단추로 맨 끝에
  box.innerHTML = `<div class="report-actions no-print"><div class="ra-inner">
      <div class="ra-back">${admin && !mine
        ? '<a class="btn btn--text btn--small" href="admin.html">관리로 돌아가기</a>'
        : '<a class="btn btn--text btn--small" href="me.html">검사 결과 목록으로</a>'}</div>
      <div class="ra-main">
        ${canEdit ? `<button type="button" class="btn btn--small" data-act="share">${rec.shareToken ? '공유 링크 보기' : '공유 링크 만들기'}</button>` : ''}
        <button type="button" class="btn btn--ghost btn--small" data-act="print">PDF로 저장</button>
        <a class="btn btn--ghost btn--small" href="${personUrl(uid, rid)}">종합 결과지</a>
      </div>
      ${canEdit ? '<button type="button" class="btn btn--text btn--small ra-del" data-act="delete">결과 지우기</button>' : ''}
    </div></div>
    ${admin && !mine ? `<div class="shared-note">${st.owner
      ? `${who} 상담사님 계정의 결과를 담당자 권한으로 보고 있어요.`
      : `${who} 상담사님 계정의 결과를 관리자 권한으로 보고 있어요. 공유와 지우기는 담당자만 할 수 있어요.`}</div>` : ''}
    <div data-body></div>`;
  draw(def, box.querySelector('[data-body]'), rec, { shared: false, rid }, '담당자');
  markCode(box, rec.testId);
  mountFooter();

  box.querySelector('.report-actions').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'print') window.print();
    if (act === 'share') {
      b.disabled = true;
      try {
        const tk = await createShare(uid, rid);
        b.textContent = '공유 링크 보기';
        await openShare(tk, rec, def);
      } catch (err) {
        console.error(err);
        toast('공유 링크를 만들지 못했어요.');
      }
      b.disabled = false;
    }
    if (act === 'delete') {
      const ok = await modal({
        title: '결과를 지울까요?',
        body: '<p>지운 결과는 되돌릴 수 없고, 만들어 둔 공유 링크도 함께 사라져요.</p>',
        actions: [{ label: '취소', value: false }, { label: '지우기', value: true, primary: true, danger: true }],
      });
      if (!ok) return;
      try {
        await deleteResult(uid, rid);
        toast('결과를 지웠어요.');
        setTimeout(() => (location.href = admin && !mine ? 'admin.html' : 'me.html'), 600);
      } catch (err) {
        console.error(err);
        toast('지우지 못했어요.');
      }
    }
  });
}

async function openShare(tk, rec, def) {
  const url = shareUrl(tk);
  const res = await modal({
    title: '공유 링크',
    body: `<p>이 링크를 받은 사람은 로그인하지 않아도 결과지를 볼 수 있어요. 공유를 멈추면 링크가 바로 막혀요.</p>
      <div class="copy-row"><input class="input" readonly value="${esc(url)}" aria-label="공유 링크"><button type="button" class="btn btn--small" data-copy>복사</button></div>
      ${navigator.share ? '<button type="button" class="btn btn--ghost btn--small" data-native style="margin-top:8px">다른 앱으로 보내기</button>' : ''}`,
    actions: [{ label: '공유 멈추기', value: 'revoke', danger: true }, { label: '닫기', value: 'close', primary: true }],
    onOpen: (root) => {
      root.querySelector('[data-copy]').addEventListener('click', async () => {
        toast((await copyText(url)) ? '링크를 복사했어요.' : '링크를 길게 눌러 복사해 주세요.');
      });
      const n = root.querySelector('[data-native]');
      if (n) n.addEventListener('click', () => {
        navigator.share({ title: `${rec.name || ''} 님의 ${def.title} 결과지`, url }).catch(() => {});
      });
    },
  });
  if (res === 'revoke') {
    try {
      await revokeShare(uid, rid);
      const b = box.querySelector('[data-act="share"]');
      if (b) b.textContent = '공유 링크 만들기';
      toast('공유를 멈췄어요. 이전 링크로는 더 이상 볼 수 없어요.');
    } catch (err) {
      console.error(err);
      toast('공유를 멈추지 못했어요.');
    }
  }
}

if (token) renderShared();
else if (uid && rid) renderOwned();
else gate('결과지를 찾을 수 없어요', '주소가 올바른지 확인해 주세요.', '<a class="btn" href="me.html">검사 결과 목록으로</a>');

