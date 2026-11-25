import { mountHeader, mountFooter, esc, toast, modal, fmtDate, copyText } from '../ui.js';
import { listMyResults, deleteResult, createShare, revokeShare, resultUrl, shareUrl } from '../backend.js';
import { TESTS } from '../registry.js';
import { requireApproved } from '../guard.js';
import { requireUnlock, watchLock } from '../lock.js';

const box = document.querySelector('[data-list]');
const title = (id) => (TESTS.find((t) => t.id === id) || {}).title || id;
const ATT = { secure: '안', anxious: '불', fearful: '두', avoidant: '회' };
const glyph = (r) => {
  const s = r.scores || {};
  if (r.testId === 'enneagram') return s.core || '?';
  if (r.testId === 'bigfive') return '★';
  if (r.testId === 'attachment') return ATT[s.style] || '·';
  if (r.testId === 'schema') return s.active && s.active.length ? (s.topNames && s.topNames[0] ? s.topNames[0].slice(0, 1) : '·') : '·';
  return r.glyph || '·'; // 새 검사는 검사 정의의 glyph(scores)가 결과와 함께 저장된다
};
const view = { q: '', test: '' };
let list = [];

(async () => {
  const st = await requireApproved();
  if (!st) return;
  await requireUnlock('result');
  watchLock('result');
  mountHeader('me');
  mountFooter();
  await load();
})();

async function load() {
  box.innerHTML = '<p class="loading">결과를 불러오고 있어요</p>';
  try {
    list = await listMyResults();
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty"><p>결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p></div>';
    return;
  }
  if (!list.length) {
    box.innerHTML = `<div class="empty"><p>아직 전송된 검사 결과가 없어요. 첫 화면에서 검사를 시작해 보세요.</p><a class="btn" href="index.html#tests">검사 시작하기</a></div>`;
    return;
  }
  const tests = [...new Set(list.map((r) => r.testId))];
  box.innerHTML = `<div class="toolbar">
      <input class="input" type="search" placeholder="검사자 이름으로 찾기" value="${esc(view.q)}" data-q aria-label="검사자 이름으로 찾기">
      <select class="input" data-test aria-label="검사 고르기"><option value="">모든 검사</option>${tests.map((t) => `<option value="${esc(t)}" ${view.test === t ? 'selected' : ''}>${esc(title(t))}</option>`).join('')}</select>
      <span class="spacer"></span><span class="tag" data-count></span>
    </div>
    <ul class="record-list" data-rows></ul>`;
  box.querySelector('[data-q]').addEventListener('input', (e) => { view.q = e.target.value; drawRows(); });
  box.querySelector('[data-test]').addEventListener('change', (e) => { view.test = e.target.value; drawRows(); });
  box.querySelector('[data-rows]').addEventListener('click', onAction);
  drawRows();
}

function drawRows() {
  const q = view.q.trim().toLowerCase();
  const rows = list.filter((r) => (!view.test || r.testId === view.test) && (!q || String(r.name || '').toLowerCase().includes(q)));
  box.querySelector('[data-count]').textContent = `${rows.length}건`;
  const ul = box.querySelector('[data-rows]');
  if (!rows.length) {
    ul.innerHTML = '<li class="muted-box">조건에 맞는 결과가 없어요.</li>';
    return;
  }
  ul.innerHTML = rows
    .map((r) => `<li class="record" data-rid="${esc(r.rid)}">
      <div class="glyph" aria-hidden="true">${esc(glyph(r))}</div>
      <div class="meta"><strong>${esc(r.name || '이름 없음')}</strong><span>${esc(title(r.testId))}, ${esc(r.summary || '')}</span><br><span>${esc(fmtDate(r.createdAt, true))}${r.shareToken ? ', 공유 중' : ''}</span></div>
      <div class="acts">
        <a class="btn btn--small" href="${resultUrl(r.uid, r.rid)}">결과지 보기</a>
        <button type="button" class="btn btn--ghost btn--small" data-act="share">${r.shareToken ? '공유 링크' : '공유하기'}</button>
        <button type="button" class="btn btn--text btn--small" data-act="delete">지우기</button>
      </div>
    </li>`)
    .join('');
}

async function onAction(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const rid = b.closest('[data-rid]').dataset.rid;
  const rec = list.find((x) => x.rid === rid);
  if (b.dataset.act === 'share') {
    b.disabled = true;
    try {
      const tk = await createShare(rec.uid, rid);
      rec.shareToken = tk;
      const url = shareUrl(tk);
      const res = await modal({
        title: `${rec.name || ''} 님 결과 공유 링크`,
        body: `<p>이 링크를 받은 사람은 로그인하지 않아도 결과지를 볼 수 있어요. 공유를 멈추면 링크가 바로 막혀요.</p><div class="copy-row"><input class="input" readonly value="${esc(url)}" aria-label="공유 링크"><button type="button" class="btn btn--small" data-copy>복사</button></div>`,
        actions: [{ label: '공유 멈추기', value: 'revoke', danger: true }, { label: '닫기', value: 'close', primary: true }],
        onOpen: (root) => root.querySelector('[data-copy]').addEventListener('click', async () => toast((await copyText(url)) ? '링크를 복사했어요.' : '링크를 길게 눌러 복사해 주세요.')),
      });
      if (res === 'revoke') { await revokeShare(rec.uid, rid); rec.shareToken = null; toast('공유를 멈췄어요.'); }
      drawRows();
    } catch (err) { console.error(err); toast('공유 링크를 만들지 못했어요.'); }
    b.disabled = false;
  }
  if (b.dataset.act === 'delete') {
    const ok = await modal({
      title: '결과를 지울까요?',
      body: `<p>${esc(rec.name || '')} 님의 ${esc(title(rec.testId))} 결과를 지워요. 되돌릴 수 없고, 공유 링크도 함께 사라져요.</p>`,
      actions: [{ label: '취소', value: false }, { label: '지우기', value: true, primary: true, danger: true }],
    });
    if (!ok) return;
    try {
      await deleteResult(rec.uid, rid);
      list = list.filter((x) => x.rid !== rid);
      toast('결과를 지웠어요.');
      if (!list.length) load(); else drawRows();
    } catch (err) { console.error(err); toast('지우지 못했어요.'); }
  }
}
