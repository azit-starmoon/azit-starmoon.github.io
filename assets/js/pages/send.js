// AZIT : Star&Moon — 검사 링크 보내기 (상담사)
// 받는 분 이름과 검사를 골라 링크를 만들고, 카카오톡(공유하기)·문자·복사로 보낸다.
// 받는 분이 답을 보내면 이 화면이나 첫 화면을 열 때 채점해서 이 계정의 결과로 옮긴다(links.js).
import { mountHeader, mountFooter, esc, toast, modal, copyText, fmtDate } from '../ui.js';
import {
  createInvite, listMyInvites, cancelInvite, removeInvite, inviteTests, inviteUrl, resultUrl, greetingName, currentUser, INVITE_DAYS,
} from '../backend.js';
import { TESTS, groupIds, BUNDLES, getTestMeta, codeOf } from '../registry.js';
import { parseBirth, fmtBirth, longBirth } from '../examinee.js';
import { requireApproved } from '../guard.js';
import { requireUnlock } from '../lock.js';
import { importLinks, inviteState, inviteMessage, inviteMinutes, dueText } from '../links.js';
import { isIOS } from '../inapp.js';

const MAX = 6;
const box = document.querySelector('[data-send]');
const open = TESTS.filter((t) => t.status === 'open');
const openIds = new Set(open.map((t) => t.id));
const bundles = BUNDLES.filter((b) => b.tests.every((id) => openIds.has(id)));
const F = { name: '', birthText: '', birth: '', tests: [], bundle: '' };
let ownerName = '';
let ownerOrg = ''; // 승인할 때 적은 소속(예: AZIT 상담팀). 안내문의 보낸 사람 줄에 쓴다
let sent = [];

(async () => {
  const st = await requireApproved();
  if (!st) return;
  ownerName = greetingName(st);
  ownerOrg = String((st.member && st.member.note) || '').trim();
  await requireUnlock('test', { name: ownerName });
  mountHeader('send');
  mountFooter();
  // 첫 화면에서 검사나 묶음을 골라 들어오면 미리 골라 둔다 (send.html?t=emotion, ?b=tired)
  const q = new URLSearchParams(location.search);
  const b = bundles.find((x) => x.id === q.get('b'));
  if (b) { F.tests = b.tests.slice(0, MAX); F.bundle = b.id; }
  else if (openIds.has(q.get('t'))) F.tests = [q.get('t')];
  draw();
  await refresh(true);
})();

function draw() {
  const groups = groupIds(open.map((t) => t.id));
  box.innerHTML = `<section class="send-card" aria-labelledby="sf-h">
      <div class="send-head send-head--form"><h2 id="sf-h">새 링크 만들기</h2><span class="spacer"></span><a class="send-jump" href="#sent" data-jump hidden></a></div>
      <div class="send-who">
        <div class="field">
          <label for="sf-name">받는 분 이름</label>
          <input class="input" id="sf-name" maxlength="20" autocomplete="off" placeholder="예: 홍길동">
        </div>
        <div class="field">
          <label for="sf-birth">생년월일 <span class="lbl-note">알면 적어 주세요</span></label>
          <input class="input" id="sf-birth" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="예: 19950312" aria-describedby="sf-birth-hint">
          <p class="field-hint field-hint--quiet" id="sf-birth-hint" data-birth-hint aria-live="polite">비워 두면 받는 분이 처음에 직접 적어요.</p>
        </div>
      </div>
      <fieldset class="send-tests">
        <legend>보낼 검사 <span class="lbl-note">최대 ${MAX}개, 고른 차례대로 해요</span></legend>
        ${bundles.length ? `<div class="send-bundles" role="group" aria-label="추천 묶음으로 고르기"><span class="k">추천 묶음</span>${bundles.map((b) => `<button type="button" class="chip" data-bundle="${esc(b.id)}" aria-pressed="false">${esc(b.name)}</button>`).join('')}</div>` : ''}
        ${groups.map((g) => `<div class="send-group"><h3>${esc(g.name)}</h3><div class="send-opts">${g.tests.map((id) => {
          const t = getTestMeta(id);
          return `<label class="send-opt"><input type="checkbox" value="${esc(id)}" data-pick><span class="t">${esc(t.title)}${codeOf(id) ? ` <span class="tcard-code">${esc(codeOf(id))}</span>` : ''}</span><span class="m">${t.items}문항 · ${t.minutes}분</span><span class="no" data-no aria-hidden="true"></span></label>`;
        }).join('')}</div></div>`).join('')}
      </fieldset>
      <div class="send-foot">
        <p class="send-sum" data-sum aria-live="polite"></p>
        <button type="button" class="btn" data-make disabled>링크 만들기</button>
      </div>
    </section>
    <section class="send-card" id="sent" aria-labelledby="sl-h">
      <div class="send-head"><h2 id="sl-h">보낸 링크</h2><span class="tag" data-sent-count hidden></span><span class="spacer"></span><button type="button" class="btn btn--small btn--ghost" data-recheck>답 다시 확인</button></div>
      <p class="send-note">링크는 ${INVITE_DAYS}일 동안 열려 있어요. 받는 분이 답을 보내면 이 화면이나 첫 화면을 열 때 채점해서 '검사 결과'로 옮겨요.</p>
      <ul class="sent-list" data-sent><li class="loading">보낸 링크를 불러오고 있어요</li></ul>
    </section>`;

  const nameEl = box.querySelector('#sf-name');
  const birthEl = box.querySelector('#sf-birth');
  const hint = box.querySelector('[data-birth-hint]');
  const sync = () => {
    F.name = nameEl.value.trim();
    F.birthText = birthEl.value;
    F.birth = parseBirth(birthEl.value);
    const typed = birthEl.value.replace(/\D/g, '');
    const bad = !!typed && !F.birth;
    hint.textContent = F.birth ? longBirth(F.birth) : bad && typed.length >= 6 ? '날짜를 다시 확인해 주세요. 8자리(19950312)나 6자리(950312)로 적어요.' : '비워 두면 받는 분이 처음에 직접 적어요.';
    hint.classList.toggle('is-error', bad && typed.length >= 6);
    drawPicks();
  };
  nameEl.addEventListener('input', sync);
  birthEl.addEventListener('input', sync);
  box.querySelector('.send-tests').addEventListener('change', (e) => {
    const c = e.target.closest('[data-pick]');
    if (!c) return;
    if (c.checked) { if (F.tests.length < MAX && !F.tests.includes(c.value)) F.tests.push(c.value); }
    else F.tests = F.tests.filter((id) => id !== c.value);
    const b = bundles.find((x) => x.id === F.bundle);
    if (b && b.tests.join(',') !== F.tests.join(',')) F.bundle = '';
    drawPicks();
  });
  box.querySelector('.send-tests').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-bundle]');
    if (!chip) return;
    const b = bundles.find((x) => x.id === chip.dataset.bundle);
    if (F.bundle === b.id) { F.tests = []; F.bundle = ''; } else { F.tests = b.tests.slice(0, MAX); F.bundle = b.id; }
    drawPicks();
  });
  box.querySelector('[data-make]').addEventListener('click', make);
  box.querySelector('[data-sent]').addEventListener('click', onSent);
  box.querySelector('[data-recheck]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    await refresh(true, true);
    e.target.disabled = false;
  });
  sync();
}

function drawPicks() {
  box.querySelectorAll('[data-pick]').forEach((c) => {
    const at = F.tests.indexOf(c.value);
    c.checked = at >= 0;
    c.disabled = at < 0 && F.tests.length >= MAX;
    c.closest('.send-opt').querySelector('[data-no]').textContent = at >= 0 ? String(at + 1) : '';
  });
  box.querySelectorAll('[data-bundle]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.bundle === F.bundle)));
  const sum = box.querySelector('[data-sum]');
  const typed = F.birthText.replace(/\D/g, '');
  const birthOk = !typed || !!F.birth;
  sum.innerHTML = F.tests.length
    ? `<strong>${F.tests.length}개</strong>, 약 ${inviteMinutes(F.tests)}분 · ${F.tests.map((id) => esc(getTestMeta(id).title)).join(' → ')}`
    : '보낼 검사를 골라 주세요.';
  box.querySelector('[data-make]').disabled = !(F.name && F.tests.length && birthOk);
}

async function make(e) {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = '만드는 중';
  try {
    const { token, expiresAt } = await createInvite({ name: F.name, birth: F.birth, tests: F.tests, bundle: F.bundle, ownerName });
    const made = { token, name: F.name, tests: F.tests.join(','), expiresAt };
    Object.assign(F, { name: '', birthText: '', birth: '', tests: [], bundle: '' });
    box.querySelector('#sf-name').value = '';
    box.querySelector('#sf-birth').value = '';
    box.querySelector('[data-birth-hint]').textContent = '비워 두면 받는 분이 처음에 직접 적어요.';
    drawPicks();
    refresh(false);
    openShare(made);
  } catch (err) {
    console.error(err);
    toast(err && err.message && !/permission/i.test(err.message) ? err.message : '링크를 만들지 못했어요. 잠시 후 다시 해 주세요.', 4200);
  } finally {
    btn.textContent = '링크 만들기';
    drawPicks();
  }
}

// 보내기 창: 공유하기(카카오톡 등) · 문자 · 복사
function openShare(inv) {
  const tests = inviteTests(inv);
  const url = inviteUrl(inv.token);
  const msg = inviteMessage({ name: inv.name, ownerName, org: ownerOrg, tests, expiresAt: inv.expiresAt, token: inv.token });
  const canShare = typeof navigator.share === 'function';
  modal({
    title: `${inv.name} 님께 보낼 링크`,
    body: `<p class="modal-sub">${esc(dueText(inv.expiresAt))}까지 열려 있어요. 받는 분은 로그인 없이 열고, 결과는 보지 않아요.</p>
      <label class="share-k" for="sh-msg">보낼 글 <span>고쳐서 보내도 돼요</span></label>
      <textarea class="input share-msg" id="sh-msg" rows="12">${esc(msg)}</textarea>
      <div class="share-acts">
        ${canShare ? '<button type="button" class="btn" data-share>공유하기 (카카오톡 등)</button>' : ''}
        <button type="button" class="btn ${canShare ? 'btn--ghost' : ''}" data-copy-msg>글과 링크 복사</button>
      </div>
      <div class="share-row">
        <label for="sh-tel">문자로 보내기</label>
        <div class="copy-row"><input class="input" id="sh-tel" type="tel" inputmode="tel" autocomplete="off" placeholder="휴대폰 번호 (저장하지 않아요)"><a class="btn btn--small btn--ghost" data-sms href="sms:">문자 앱 열기</a></div>
      </div>
      <div class="share-row">
        <label for="sh-url">링크만</label>
        <div class="copy-row"><input class="input" id="sh-url" readonly value="${esc(url)}"><button type="button" class="btn btn--small btn--ghost" data-copy-url>복사</button></div>
      </div>`,
    actions: [{ label: '닫기', value: true }],
    onOpen: (back) => {
      const text = () => back.querySelector('#sh-msg').value.trim() || msg;
      const shareBtn = back.querySelector('[data-share]');
      if (shareBtn) shareBtn.addEventListener('click', async () => {
        try { await navigator.share({ text: text() }); } catch (e) { if (e && e.name !== 'AbortError') toast('공유 창을 열지 못했어요. 글과 링크를 복사해서 보내 주세요.', 4200); }
      });
      back.querySelector('[data-copy-msg]').addEventListener('click', async () => {
        toast((await copyText(text())) ? '글과 링크를 복사했어요. 카카오톡이나 문자에 붙여 넣어 보내 주세요.' : '복사하지 못했어요. 글을 길게 눌러 복사해 주세요.', 4200);
      });
      back.querySelector('[data-copy-url]').addEventListener('click', async () => {
        toast((await copyText(url)) ? '링크를 복사했어요.' : '복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.');
      });
      // 문자: 번호와 글을 채운 문자 앱을 연다. 번호는 어디에도 저장하지 않는다
      back.querySelector('[data-sms]').addEventListener('click', (e) => {
        const num = back.querySelector('#sh-tel').value.replace(/[^\d+]/g, '');
        e.currentTarget.href = `sms:${num}${isIOS ? '&' : '?'}body=${encodeURIComponent(text())}`;
      });
    },
  });
}

async function refresh(doImport, tell = false) {
  const list = box.querySelector('[data-sent]');
  if (doImport) {
    const r = await importLinks().catch(() => ({ imported: 0 }));
    if (r.imported) toast(`링크로 받은 검사 결과 ${r.imported}개를 '검사 결과'로 옮겼어요.`, 4200);
    else if (tell) toast('새로 들어온 답이 없어요.');
  }
  try {
    sent = await listMyInvites();
  } catch (e) {
    console.error(e);
    list.innerHTML = '<li class="sent-empty">보낸 링크를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</li>';
    return;
  }
  const cnt = box.querySelector('[data-sent-count]');
  cnt.hidden = !sent.length;
  cnt.textContent = `${sent.length}개`;
  const waiting = sent.filter((x) => inviteState(x).key === 'open').length;
  const jump = box.querySelector('[data-jump]');
  jump.hidden = !sent.length;
  jump.textContent = waiting ? `답 기다리는 링크 ${waiting}개 보기` : `보낸 링크 ${sent.length}개 보기`;
  if (!sent.length) {
    list.innerHTML = '<li class="sent-empty">아직 보낸 링크가 없어요. 위에서 받는 분과 검사를 골라 첫 링크를 만들어 보세요.</li>';
    return;
  }
  const uid = (currentUser() || {}).uid;
  list.innerHTML = sent.map((inv) => {
    const tests = inviteTests(inv);
    const st = inviteState(inv);
    const got = inv.got || {};
    const bad = inv.bad || {};
    const label = {
      open: `${st.total}개 중 ${st.n}개 받음`,
      done: '모두 받았어요',
      expired: `기한 지남 · ${st.total}개 중 ${st.n}개 받음`,
      cancelled: `보내기 멈춤 · ${st.total}개 중 ${st.n}개 받음`,
    }[st.key];
    return `<li class="sent-row" data-token="${esc(inv.token)}">
      <div class="sent-top"><strong>${esc(inv.name)} 님${inv.birth ? `<span class="born">${esc(fmtBirth(inv.birth))}</span>` : ''}</strong><span class="sent-state" data-state="${st.key}">${esc(label)}</span></div>
      <ul class="sent-tests">${tests.map((id) => {
        const t = getTestMeta(id) || { title: id };
        if (got[id]) return `<li class="is-got"><a href="${esc(resultUrl(uid, got[id]))}"><span aria-hidden="true">✓ </span>${esc(t.title)}<span class="sr-only"> 결과 보기</span></a></li>`;
        if (bad[id]) return `<li class="is-bad">${esc(t.title)} · 답을 읽지 못했어요</li>`;
        return `<li>${esc(t.title)}<span class="sr-only"> (기다리는 중)</span></li>`;
      }).join('')}</ul>
      <p class="sent-meta">${esc(fmtDate(inv.createdAt))} 보냄${st.key === 'open' ? ` · ${esc(dueText(inv.expiresAt))}까지` : ''}</p>
      <div class="sent-acts">
        ${st.key === 'open' ? '<button type="button" class="btn btn--small btn--ghost" data-act="share">다시 보내기</button><button type="button" class="btn btn--small btn--text" data-act="cancel">보내기 멈추기</button>'
          : '<button type="button" class="btn btn--small btn--text" data-act="remove">목록에서 지우기</button>'}
      </div>
    </li>`;
  }).join('');
}

async function onSent(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const inv = sent.find((x) => x.token === btn.closest('[data-token]').dataset.token);
  if (!inv) return;
  const act = btn.dataset.act;
  if (act === 'share') return openShare(inv);
  if (act === 'cancel') {
    const ok = await modal({
      title: '이 링크로 보내기를 멈출까요?',
      body: `<p>${esc(inv.name)} 님이 링크를 열면 '보내기를 멈춘 링크'라고 나와요. 이미 받은 결과는 그대로 남아요.</p>`,
      actions: [{ label: '취소', value: false }, { label: '보내기 멈추기', value: true, primary: true, danger: true }],
    });
    if (!ok) return;
    try { await cancelInvite(inv.token); toast('보내기를 멈췄어요.'); } catch (err) { console.error(err); toast('멈추지 못했어요. 잠시 후 다시 해 주세요.'); }
    return refresh(false);
  }
  if (act === 'remove') {
    const st = inviteState(inv);
    const ok = await modal({
      title: '목록에서 지울까요?',
      body: `<p>링크가 지워져서 더는 열리지 않아요. 옮겨 둔 결과는 '검사 결과'에 그대로 남아요.${st.n < st.total ? ' 아직 받지 못한 검사는 더 받을 수 없어요.' : ''}</p>`,
      actions: [{ label: '취소', value: false }, { label: '지우기', value: true, primary: true, danger: true }],
    });
    if (!ok) return;
    try { await removeInvite(inv.token); toast('목록에서 지웠어요.'); } catch (err) { console.error(err); toast('지우지 못했어요. 잠시 후 다시 해 주세요.'); }
    return refresh(false);
  }
}
