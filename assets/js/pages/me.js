import { mountHeader, mountFooter, esc, toast, modal, fmtDate, googleButton, copyText } from '../ui.js';
import { onUser, listMyResults, deleteResult, createShare, revokeShare, resultUrl, shareUrl } from '../backend.js';
import { TESTS, loadTest } from '../registry.js';

mountHeader('me');
mountFooter();
const box = document.querySelector('[data-list]');
const defs = {};

async function defFor(id) {
  if (!(id in defs)) defs[id] = await loadTest(id);
  return defs[id];
}

async function render(u) {
  if (!u) {
    box.innerHTML = `<div class="gate" style="margin-top:8px"><h2>로그인하고 기록을 확인하세요</h2><p>검사할 때 쓴 구글 계정으로 로그인하면 내 결과지가 모두 보여요.</p>${googleButton('구글로 로그인')}</div>`;
    return;
  }
  box.innerHTML = '<p class="loading">기록을 불러오고 있어요</p>';
  let list = [];
  try { list = await listMyResults(); } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty"><p>기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p></div>';
    return;
  }
  if (!list.length) {
    box.innerHTML = `<div class="empty"><p>아직 한 검사가 없어요. 첫 검사로 한국형 성향검사를 해 보세요.</p><a class="btn" href="test.html?t=enneagram">성향검사 시작하기</a></div>`;
    return;
  }
  const rows = await Promise.all(
    list.map(async (r) => {
      const def = await defFor(r.testId);
      const meta = TESTS.find((t) => t.id === r.testId);
      const glyph = def && def.glyph && r.scores ? def.glyph(r.scores) : (meta ? meta.title.charAt(0) : '?');
      return `<li class="record" data-rid="${esc(r.rid)}">
        <div class="glyph" aria-hidden="true">${esc(glyph)}</div>
        <div class="meta"><strong>${esc(meta ? meta.title : r.testId)}</strong><span>${esc(r.summary || '')}</span><br><span>${esc(fmtDate(r.createdAt, true))}${r.shareToken ? ', 공유 중' : ''}</span></div>
        <div class="acts">
          <a class="btn btn--small" href="${resultUrl(r.uid, r.rid)}">결과지 보기</a>
          <button type="button" class="btn btn--ghost btn--small" data-act="share">${r.shareToken ? '공유 링크' : '공유하기'}</button>
          <button type="button" class="btn btn--text btn--small" data-act="delete">지우기</button>
        </div>
      </li>`;
    })
  );
  box.innerHTML = `<ul class="record-list">${rows.join('')}</ul>`;
  box.querySelector('.record-list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const rid = b.closest('[data-rid]').dataset.rid;
    const rec = list.find((x) => x.rid === rid);
    if (b.dataset.act === 'share') {
      b.disabled = true;
      try {
        const tk = await createShare(rec.uid, rid);
        const url = shareUrl(tk);
        const res = await modal({
          title: '공유 링크',
          body: `<p>이 링크를 받은 사람은 로그인하지 않아도 결과지를 볼 수 있어요.</p><div class="copy-row"><input class="input" readonly value="${esc(url)}" aria-label="공유 링크"><button type="button" class="btn btn--small" data-copy>복사</button></div>`,
          actions: [{ label: '공유 멈추기', value: 'revoke', danger: true }, { label: '닫기', value: 'close', primary: true }],
          onOpen: (root) => root.querySelector('[data-copy]').addEventListener('click', async () => toast((await copyText(url)) ? '링크를 복사했어요.' : '링크를 길게 눌러 복사해 주세요.')),
        });
        if (res === 'revoke') { await revokeShare(rec.uid, rid); toast('공유를 멈췄어요.'); }
        render(u);
      } catch (err) { console.error(err); toast('공유 링크를 만들지 못했어요.'); }
      b.disabled = false;
    }
    if (b.dataset.act === 'delete') {
      const ok = await modal({
        title: '결과를 지울까요?',
        body: '<p>지운 결과는 되돌릴 수 없고, 만들어 둔 공유 링크도 함께 사라져요.</p>',
        actions: [{ label: '취소', value: false }, { label: '지우기', value: true, primary: true, danger: true }],
      });
      if (!ok) return;
      try { await deleteResult(rec.uid, rid); toast('결과를 지웠어요.'); render(u); } catch (err) { console.error(err); toast('지우지 못했어요.'); }
    }
  });
}

onUser((u) => render(u));
