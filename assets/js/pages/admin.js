import { mountHeader, mountFooter, esc, toast, modal, fmtDate, shortDate, copyText, resultCode, setRequestBadge } from '../ui.js';
import {
  listAllResults, listUsers, deleteResult, createShare, revokeShare, resultUrl, personUrl, shareUrl, isDemo, currentUser, setResultBirth,
  isUserAdmin, setUserAdmin, listAdmins, listRequests, listMembers, approveMember, updateMember, rejectRequest, revokeMember,
} from '../backend.js';
import { OWNER_EMAIL } from '../config.js';
import { TESTS, groupIds, loadTest, codeOf } from '../registry.js';
import { fmtBirth, parseBirth, longBirth } from '../examinee.js';
import { requireLogin } from '../guard.js';
import { requireUnlock, watchLock } from '../lock.js';
import { TEMP_TYPES as TC_TYPES, CHAR_SHAPES as TC_SHAPES } from '../../../tests/temperament/content.js';
import { STATES as LS_STATES } from '../../../tests/lifestory/content.js';
import { STYLES as DF_STYLES } from '../../../tests/differentiation/content.js';
import { STYLES as GA_STYLES } from '../../../tests/godattach/content.js';

const box = document.querySelector('[data-admin]');
const title = (id) => (TESTS.find((t) => t.id === id) || {}).title || id;

let all = [];
let users = {};
let requests = {};
let members = {};
let admins = {};
// 지금 들어온 계정. 담당자(owner)는 모든 기능, 관리자는 상담사 승인과 모든 결과 보기만
const me = { uid: '', owner: false };
const PAGE = 30; // 결과 목록은 이만큼씩 더 보여 준다
const TAB_IDS = ['results', 'people', 'analysis'];
const tabFromHash = () => { const h = location.hash.replace('#', ''); return TAB_IDS.includes(h) ? h : 'results'; };
// tab: 지금 탭, q/test/owner: 결과 찾기와 거르기, mq: 상담사 찾기, limit: 결과 몇 건까지 보여 줄지
const view = { tab: tabFromHash(), q: '', test: '', owner: '', mq: '', limit: PAGE };
const ia = { test: '', level: 0, flat: true, ran: false }; // 문항 분석 화면 상태

(async () => {
  const st = await requireLogin();
  if (!st) return;
  if (st.admin) {
    await requireUnlock('result');
    watchLock('result');
  }
  mountHeader('admin');
  mountFooter();
  if (!st.admin) {
    box.innerHTML = `<div class="gate" style="margin-top:8px"><h2>관리 권한이 없어요</h2>
      <p>관리 화면은 담당자와 관리자만 쓸 수 있어요. 관리자 지정이 필요하면 담당자에게 요청해 주세요.</p>
      <a class="btn" href="index.html">처음으로</a></div>`;
    return;
  }
  me.uid = st.user.uid;
  me.owner = !!st.owner;
  // 담당자 계정이 관리자 목록(admins)에 없으면 올려 둔다. 지금 규칙은 담당자를 이메일로 알아봐서 없어도 되지만,
  // 예전 규칙(관리자 목록에 있어야 모든 결과를 읽음)이 게시되어 있는 동안에도 관리 화면이 열리게 하려는 것
  // (예전 규칙에서는 관리자가 한 명도 없을 때만 된다)
  if (me.owner && !isDemo && !(await isUserAdmin(me.uid))) {
    try { await setUserAdmin(me.uid, true); } catch (e) { console.warn(e); }
  }
  await load();
})();

// 담당자 계정의 uid (로그인한 적이 있으면 users에서 이메일로 찾는다)
function ownerUid() {
  if (me.owner) return me.uid;
  const want = String(OWNER_EMAIL || '').toLowerCase();
  return Object.keys(users || {}).find((uid) => String((users[uid] || {}).email || '').toLowerCase() === want) || '';
}

const canEditResult = (r) => me.owner || r.uid === me.uid;

async function load() {
  box.innerHTML = '<p class="loading">불러오고 있어요</p>';
  try {
    [all, users, requests, members, admins] = await Promise.all([listAllResults(), listUsers(), listRequests(), listMembers(), listAdmins()]);
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty"><p>목록을 불러오지 못했어요. Firebase 보안 규칙이 최신으로 게시되었는지 확인해 주세요.</p></div>';
    return;
  }
  setRequestBadge(Object.keys(requests || {}).length);
  draw();
}

function ownerLabel(r) {
  return (members[r.uid] && members[r.uid].name) || r.ownerName || (users[r.uid] && users[r.uid].name) || r.email || '';
}
// 상담사 소속 (관리 화면에서 고친 값)
const ownerTeam = (r) => (members[r.uid] && members[r.uid].note) || '';

function filtered() {
  const q = view.q.trim().toLowerCase();
  const digits = q.replace(/\D/g, ''); // 숫자 네 자리 이상이면 생년월일로도 찾는다
  return all.filter((r) => (!view.test || r.testId === view.test) && (!view.owner || r.uid === view.owner) && (!q || `${r.name || ''} ${ownerLabel(r)} ${ownerTeam(r)} ${r.email || ''}`.toLowerCase().includes(q)
    || (digits.length >= 4 && String(r.birth || '').replace(/-/g, '').includes(digits))));
}

// 계정 표시와 할 수 있는 일 (관리자는 상담사 계정만, 관리자·담당자 계정은 담당자만)
function roleTag(uid, owner) {
  if (uid && uid === owner) return '<em class="role-chip" data-role="owner">담당자</em>';
  return admins[uid] ? '<em class="role-chip" data-role="admin">관리자</em>' : '';
}
const canRevoke = (uid, owner) => uid !== me.uid && (me.owner || (!admins[uid] && uid !== owner));
const canEditMember = (uid, owner) => me.owner || (!admins[uid] && uid !== owner && uid !== me.uid);

// 탭 바꾸기 (주소의 #people, #analysis로 새로 고쳐도 같은 탭이 열린다)
function setTab(id, focus = false) {
  view.tab = id;
  history.replaceState(null, '', id === 'results' ? location.pathname + location.search : `#${id}`);
  box.querySelectorAll('[data-tab]').forEach((b) => {
    const on = b.dataset.tab === id;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  box.querySelectorAll('[data-panel]').forEach((el) => { el.hidden = el.dataset.panel !== id; });
  const note = box.querySelector('[data-req-note]');
  if (note) note.hidden = id === 'people';
}
window.addEventListener('hashchange', () => { if (box.querySelector('[data-tab]')) setTab(tabFromHash()); });

function draw() {
  const reqEntries = Object.entries(requests || {}).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
  const memCount = Object.keys(members || {}).length;
  const examinees = new Set(all.map((r) => `${r.uid}:${r.name || ''}`));
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const recent = all.filter((r) => (r.createdAt || 0) >= weekAgo).length;
  const tabs = [['results', '검사 결과', all.length], ['people', '상담사', memCount], ...(me.owner ? [['analysis', '분석']] : [])];
  if (!tabs.some(([id]) => id === view.tab)) view.tab = 'results';
  // 결과를 남긴 상담사 계정 (상담사별로 걸러 보기)
  const owners = [...new Set(all.map((r) => r.uid))]
    .map((uid) => [uid, ownerLabel(all.find((r) => r.uid === uid))])
    .sort((a, b) => a[1].localeCompare(b[1], 'ko'));
  if (view.owner && !owners.some(([uid]) => uid === view.owner)) view.owner = '';
  const testOptions = (sel) => groupIds(TESTS.filter((t) => t.status === 'open').map((t) => t.id))
    .map((g) => `<optgroup label="${esc(g.name)}">${g.tests.map((id) => `<option value="${id}" ${sel === id ? 'selected' : ''}>${esc(title(id))}</option>`).join('')}</optgroup>`)
    .join('');

  const dist = {};
  for (let t = 1; t <= 9; t++) dist[t] = 0;
  all.filter((r) => r.testId === 'enneagram' && r.scores).forEach((r) => { dist[Number(r.scores.core)] = (dist[Number(r.scores.core)] || 0) + 1; });
  const maxD = Math.max(1, ...Object.values(dist));
  const hid = (id) => (view.tab === id ? '' : 'hidden');

  box.innerHTML = `
    <p class="role-line">${me.owner
      ? '<em class="role-chip" data-role="owner">담당자</em> 모든 관리 기능을 쓸 수 있어요.'
      : '<em class="role-chip" data-role="admin">관리자</em> 상담사 승인과 모든 결과 보기를 할 수 있어요. 다른 계정 결과의 공유·지우기, 생년월일 넣기, CSV, 문항 분석, 관리자 지정은 담당자가 해요.'}</p>

    <div class="admin-tabs" role="tablist" aria-label="관리 화면">${tabs.map(([id, label, n]) => `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${view.tab === id}" tabindex="${view.tab === id ? 0 : -1}" data-tab="${id}">${label}${n !== undefined ? `<span class="count">${n}</span>` : ''}${id === 'people' && reqEntries.length ? `<span class="tab-alert">요청 ${reqEntries.length}</span>` : ''}</button>`).join('')}</div>
    ${reqEntries.length ? `<p class="req-notice" data-req-note ${view.tab === 'people' ? 'hidden' : ''}>승인을 기다리는 요청이 ${reqEntries.length}건 있어요. <button type="button" class="btn btn--small" data-goto="people">승인 요청 보기</button></p>` : ''}

    <section class="admin-panel" role="tabpanel" id="panel-results" aria-labelledby="tab-results" data-panel="results" ${hid('results')}>
      <dl class="stats stats--slim">
        <div class="stat"><dt>검사자</dt><dd>${examinees.size}명</dd></div>
        <div class="stat"><dt>결과</dt><dd>${all.length}건</dd></div>
        <div class="stat"><dt>최근 7일</dt><dd>${recent}건</dd></div>
      </dl>
      ${me.owner && all.some((r) => !r.birth) ? `<p class="birth-missing">생년월일 없이 저장된 결과가 ${all.filter((r) => !r.birth).length}건 있어요. 같은 분의 결과로 묶이도록 생년월일을 넣을 수 있어요. <button type="button" class="btn btn--ghost btn--small" data-fill-birth>생년월일 넣기</button></p>` : ''}
      <div class="toolbar">
        <input class="input" type="search" placeholder="검사자, 상담사, 소속, 생년월일로 찾기" value="${esc(view.q)}" data-q aria-label="검사자·상담사 이름, 소속, 검사자 생년월일로 찾기">
        <select class="input" data-test aria-label="검사 고르기"><option value="">모든 검사</option>${testOptions(view.test)}</select>
        <select class="input" data-owner aria-label="상담사 고르기"><option value="">모든 상담사</option>${owners.map(([uid, name]) => `<option value="${esc(uid)}" ${view.owner === uid ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>
        ${me.owner ? '<span class="spacer"></span><button type="button" class="btn btn--ghost btn--small" data-csv>CSV 내려받기</button>' : ''}
      </div>
      <p class="list-meta" data-meta aria-live="polite"></p>
      <div class="table-wrap"><table class="list list--results">
        <colgroup><col class="c-who"><col class="c-test"><col class="c-sum"><col class="c-owner"><col class="c-date"><col class="c-acts"></colgroup>
        <thead><tr><th scope="col">검사자</th><th scope="col">검사</th><th scope="col">결과</th><th scope="col">상담사</th><th scope="col">검사일</th><th scope="col"><span class="sr-only">할 일</span></th></tr></thead>
        <tbody data-rows></tbody></table></div>
      <div class="list-more" data-more></div>
    </section>

    <section class="admin-panel" role="tabpanel" id="panel-people" aria-labelledby="tab-people" data-panel="people" ${hid('people')}>
      <section class="admin-block" aria-labelledby="req-t">
        <h2 id="req-t">승인 요청 <span class="count">${reqEntries.length}</span></h2>
        ${reqEntries.length ? `<ul class="req-list">${reqEntries.map(([uid, r]) => `<li class="req" data-uid="${esc(uid)}">
          <div><strong>${esc(r.name || '')}</strong><span>${esc(r.email || '')}, ${esc(fmtDate(r.createdAt, true))}</span>${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}</div>
          <div class="acts"><button type="button" class="btn btn--small" data-req="approve">승인</button><button type="button" class="btn btn--ghost btn--small" data-req="reject">거절</button></div>
        </li>`).join('')}</ul>` : '<p class="muted-box">새 승인 요청이 없어요.</p>'}
      </section>
      <section class="admin-block" aria-labelledby="mem-t">
        <h2 id="mem-t">승인된 상담사 <span class="count">${memCount}</span></h2>
        <div class="toolbar">
          <input class="input" type="search" placeholder="이름, 소속, 이메일로 찾기" value="${esc(view.mq)}" data-mq aria-label="승인된 상담사 찾기">
          ${me.owner ? '<span class="spacer"></span><button type="button" class="btn btn--ghost btn--small" data-admins>관리자 지정</button>' : ''}
        </div>
        <div class="table-wrap"><table class="list list--people">
          <thead><tr><th scope="col">이름</th><th scope="col">소속</th><th scope="col">이메일</th><th scope="col">승인</th><th scope="col">검사 결과</th><th scope="col"><span class="sr-only">할 일</span></th></tr></thead>
          <tbody data-people></tbody></table></div>
      </section>
    </section>

    ${me.owner ? `<section class="admin-panel" role="tabpanel" id="panel-analysis" aria-labelledby="tab-analysis" data-panel="analysis" ${hid('analysis')}>
      <section class="admin-block" aria-labelledby="ia-t">
        <h2 id="ia-t">문항 분석</h2>
        <p class="ia-lead">쌓인 응답으로 척도마다 문항들이 같은 마음을 일관되게 재는지(신뢰도, Cronbach α), 척도와 따로 노는 문항은 없는지 살펴봐요. 계산은 이 브라우저 안에서만 하고, 응답은 어디로도 보내지 않아요.</p>
        <div class="toolbar">
          <select class="input" data-ia-test aria-label="분석할 검사">${groupIds(TESTS.filter((t) => t.status === 'open').map((t) => t.id))
            .map((g) => `<optgroup label="${esc(g.name)}">${g.tests.map((id) => `<option value="${id}" ${ia.test === id ? 'selected' : ''}>${esc(title(id))} (${all.filter((r) => r.testId === id).length}건)</option>`).join('')}</optgroup>`)
            .join('')}</select>
          <select class="input" data-ia-level aria-label="척도로 묶는 기준" hidden></select>
          <label class="ia-check"><input type="checkbox" data-ia-flat ${ia.flat ? 'checked' : ''}> 모두 같은 답만 고른 응답 빼기</label>
          <span class="spacer"></span>
          <button type="button" class="btn btn--small" data-ia-run>분석하기</button>
          <button type="button" class="btn btn--ghost btn--small" data-ia-csv hidden>문항 응답 CSV (이름 없이)</button>
        </div>
        <div data-ia-out></div>
      </section>
      <section class="dist" aria-labelledby="dist-t">
        <h2 id="dist-t">한국형 성향 유형 검사의 핵심 유형 분포</h2>
        <div class="dist-cols">${Object.keys(dist)
          .map((t) => `<div class="dist-col" title="${t}번 ${dist[t]}건"><span class="v">${dist[t]}</span><span class="b" style="height:${((dist[t] / maxD) * 80).toFixed(0)}px"></span><span class="t">${t}</span></div>`)
          .join('')}</div>
      </section>
    </section>` : ''}`;
  drawRows();
  drawPeople();

  // 탭: 누르거나 좌우 화살표로 옮긴다
  const tabEls = [...box.querySelectorAll('[data-tab]')];
  tabEls.forEach((b, i) => {
    b.addEventListener('click', () => setTab(b.dataset.tab));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabEls[(i + (e.key === 'ArrowRight' ? 1 : tabEls.length - 1)) % tabEls.length];
      setTab(next.dataset.tab, true);
    });
  });
  box.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.goto, true)));

  const refilter = () => { view.limit = PAGE; drawRows(); };
  box.querySelector('[data-q]').addEventListener('input', (e) => { view.q = e.target.value; refilter(); });
  box.querySelector('[data-test]').addEventListener('change', (e) => { view.test = e.target.value; refilter(); });
  box.querySelector('[data-owner]').addEventListener('change', (e) => { view.owner = e.target.value; refilter(); });
  box.querySelector('[data-mq]').addEventListener('input', (e) => { view.mq = e.target.value; drawPeople(); });
  box.querySelector('[data-more]').addEventListener('click', (e) => { if (e.target.closest('[data-more-btn]')) { view.limit += PAGE; drawRows(); } });
  const on = (sel, fn) => { const el = box.querySelector(sel); if (el) el.addEventListener('click', fn); };
  on('[data-csv]', exportCsv);
  on('[data-admins]', manageAdmins);
  on('[data-fill-birth]', fillBirth);
  if (box.querySelector('[data-ia-run]')) wireItemStats();
  box.querySelectorAll('[data-req]').forEach((b) => b.addEventListener('click', onRequest));
}

// 승인된 상담사 표 (이름순, 찾기)
function drawPeople() {
  const tb = box.querySelector('[data-people]');
  if (!tb) return;
  const owner = ownerUid();
  const q = view.mq.trim().toLowerCase();
  const countBy = {};
  all.forEach((r) => { countBy[r.uid] = (countBy[r.uid] || 0) + 1; });
  const total = Object.keys(members || {}).length;
  const rows = Object.entries(members || {})
    .filter(([, m]) => !q || `${m.name || ''} ${m.note || ''} ${m.email || ''}`.toLowerCase().includes(q))
    .sort((a, b) => String(a[1].name || '').localeCompare(String(b[1].name || ''), 'ko'));
  if (!rows.length) {
    tb.innerHTML = `<tr class="empty-row"><td colspan="6">${total ? '조건에 맞는 상담사가 없어요.' : '아직 승인된 상담사가 없어요. 담당자와 관리자 계정은 승인 없이 이용할 수 있어요.'}</td></tr>`;
    return;
  }
  tb.innerHTML = rows.map(([uid, m]) => `<tr data-uid="${esc(uid)}">
      <td class="p-name"><strong>${esc(m.name || '')}</strong>${roleTag(uid, owner)}</td>
      <td class="p-team">${m.note ? esc(m.note) : '<span class="muted">소속 없음</span>'}</td>
      <td class="p-mail">${esc(m.email || '')}</td>
      <td class="p-date">${esc(shortDate(m.approvedAt))} 승인</td>
      <td class="p-count">${countBy[uid] ? `<button type="button" class="btn btn--text btn--small" data-show="${esc(uid)}" title="이 상담사의 결과만 보기">결과 ${countBy[uid]}건</button>` : '<span class="muted">결과 0건</span>'}</td>
      <td class="acts">${canEditMember(uid, owner) ? '<button type="button" class="btn btn--ghost btn--small" data-mem="edit">이름·소속 고치기</button>' : ''}${canRevoke(uid, owner) ? '<button type="button" class="btn btn--text btn--small" data-mem="revoke">승인 취소</button>' : ''}</td>
    </tr>`).join('');
  tb.querySelectorAll('[data-mem]').forEach((b) => b.addEventListener('click', onMember));
  tb.querySelectorAll('[data-show]').forEach((b) => b.addEventListener('click', () => {
    Object.assign(view, { owner: b.dataset.show, q: '', test: '', limit: PAGE, tab: 'results' });
    draw();
    setTab('results');
  }));
}

async function onRequest(e) {
  const b = e.currentTarget;
  const uid = b.closest('[data-uid]').dataset.uid;
  const r = requests[uid];
  if (b.dataset.req === 'approve') {
    // 별명으로 요청이 와도 알아보기 쉽게, 승인하면서 이름과 소속을 확인하고 고친다
    const v = await memberForm({
      title: '상담사 승인',
      lead: '승인하면 이 계정으로 검사를 하고 결과를 볼 수 있어요. 나중에 알아보기 쉽게 이름과 소속을 확인해 주세요.',
      name: r.name, note: r.note, email: r.email, okLabel: '승인',
    });
    if (!v) return;
    b.disabled = true;
    try {
      await approveMember(uid, { name: v.name, email: r.email, note: v.note });
      toast(`${v.name} 상담사님을 승인했어요.`);
      await load();
    } catch (err) { console.error(err); toast('승인하지 못했어요.'); b.disabled = false; }
  } else {
    const ok = await modal({
      title: '요청을 거절할까요?',
      body: `<p>${esc(r.name)} 님(${esc(r.email)})의 요청을 지워요. 이 계정은 다시 요청을 보낼 수 있어요.</p>`,
      actions: [{ label: '취소', value: false }, { label: '거절', value: true, primary: true, danger: true }],
    });
    if (!ok) return;
    try { await rejectRequest(uid); toast('요청을 거절했어요.'); await load(); } catch (err) { console.error(err); toast('거절하지 못했어요.'); }
  }
}

// 이름과 소속을 적는 창 (승인할 때와 고칠 때 함께 쓴다). 적은 값 { name, note }이나 null
async function memberForm({ title: heading, lead, name, note, email, okLabel }) {
  let vals = null;
  const ok = await modal({
    title: heading,
    body: `<p>${esc(lead)}</p>
      ${email ? `<p class="mf-email">${esc(email)}</p>` : ''}
      <div class="field"><label for="mf-name">이름</label><input class="input" id="mf-name" maxlength="30" autocomplete="off" value="${esc(name || '')}">
        <p class="field-hint field-hint--quiet">관리 화면과 결과 목록에 쓰여요. 별명이면 실명으로 바꿔 주세요.</p></div>
      <div class="field"><label for="mf-note">소속 <span class="field-opt">(선택)</span></label><input class="input" id="mf-note" maxlength="60" autocomplete="off" placeholder="예: AZIT 상담팀" value="${esc(note || '')}"></div>`,
    actions: [{ label: '취소', value: false }, { label: okLabel, value: true, primary: true }],
    onOpen: (root) => {
      const n = root.querySelector('#mf-name');
      const t = root.querySelector('#mf-note');
      const go = root.querySelector('.modal-actions [data-i="1"]');
      const sync = () => {
        vals = { name: n.value.trim(), note: t.value.trim() };
        go.disabled = !vals.name;
      };
      n.addEventListener('input', sync);
      t.addEventListener('input', sync);
      sync();
      n.focus();
      n.select();
    },
  });
  return ok && vals && vals.name ? vals : null;
}

async function onMember(e) {
  const b = e.currentTarget;
  const uid = b.closest('[data-uid]').dataset.uid;
  const m = members[uid];
  if (b.dataset.mem === 'edit') {
    const v = await memberForm({
      title: '이름·소속 고치기',
      lead: '고친 이름과 소속은 관리 화면, 결과 목록, CSV에 바로 쓰이고, 이 상담사의 첫 화면 인사에도 쓰여요.',
      name: m.name, note: m.note, email: m.email, okLabel: '저장',
    });
    if (!v) return;
    try { await updateMember(uid, v); toast(`${v.name} 상담사님 정보를 고쳤어요.`); await load(); } catch (err) { console.error(err); toast('고치지 못했어요.'); }
    return;
  }
  const ok = await modal({
    title: '승인을 취소할까요?',
    body: `<p>${esc(m.name)} 상담사님은 더 이상 검사를 진행하거나 결과를 볼 수 없어요. 이미 저장된 결과는 지워지지 않고, 관리 페이지에서는 계속 볼 수 있어요.</p>`,
    actions: [{ label: '그대로 두기', value: false }, { label: '승인 취소', value: true, primary: true, danger: true }],
  });
  if (!ok) return;
  try { await revokeMember(uid); toast('승인을 취소했어요.'); await load(); } catch (err) { console.error(err); toast('취소하지 못했어요.'); }
}

function drawRows() {
  const rows = filtered();
  const tb = box.querySelector('[data-rows]');
  const meta = box.querySelector('[data-meta]');
  const more = box.querySelector('[data-more]');
  if (meta) meta.textContent = rows.length === all.length ? `모두 ${all.length}건, 최근 것부터` : `${all.length}건 가운데 ${rows.length}건`;
  if (!rows.length) {
    tb.innerHTML = `<tr class="empty-row"><td colspan="6">${all.length ? '조건에 맞는 결과가 없어요.' : '아직 결과가 없어요.'}</td></tr>`;
    if (more) more.innerHTML = '';
    return;
  }
  const shown = rows.slice(0, view.limit);
  tb.innerHTML = shown
    .map((r) => `<tr data-key="${esc(r.uid)}/${esc(r.rid)}">
      <td class="r-who"><a class="person-link" href="${personUrl(r.uid, r.rid)}" title="이 검사자의 종합 결과지"><strong>${esc(r.name || '이름 없음')}</strong></a><span>${r.birth ? esc(fmtBirth(r.birth)) : '생년월일 없음'}</span></td>
      <td class="r-test">${codeOf(r.testId) ? `<span class="tcard-code">${esc(codeOf(r.testId))}</span>` : ''}<span class="r-test-name">${esc(title(r.testId))}</span></td>
      <td class="r-sum"><span class="clamp">${esc(r.summary || '')}</span></td>
      <td class="r-owner" title="${esc(r.email || '')}"><strong>${esc(ownerLabel(r))}</strong><span>${esc(ownerTeam(r) || r.email || '')}</span></td>
      <td class="r-date">${esc(shortDate(r.createdAt))}${r.shareToken ? '<span class="tag tag--brand">공유 중</span>' : ''}</td>
      <td class="acts"><a class="btn btn--small" href="${resultUrl(r.uid, r.rid)}">열기</a>${canEditResult(r) ? `<button type="button" class="btn btn--ghost btn--small" data-act="share">공유</button><button type="button" class="btn btn--text btn--small" data-act="delete">지우기</button>` : ''}</td>
    </tr>`)
    .join('');
  if (more) more.innerHTML = rows.length > shown.length ? `<button type="button" class="btn btn--ghost" data-more-btn>더 보기 <span>${rows.length - shown.length}건 남음</span></button>` : '';
  tb.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const [uid, rid] = b.closest('[data-key]').dataset.key.split('/');
    const rec = all.find((x) => x.uid === uid && x.rid === rid);
    if (b.dataset.act === 'share') {
      b.disabled = true;
      try {
        const tk = await createShare(uid, rid);
        rec.shareToken = tk;
        const url = shareUrl(tk);
        const res = await modal({
          title: `${rec.name || ''} 님 결과 공유 링크`,
          body: `<p>이 링크를 받은 사람은 로그인하지 않아도 결과지를 볼 수 있어요.</p><div class="copy-row"><input class="input" readonly value="${esc(url)}" aria-label="공유 링크"><button type="button" class="btn btn--small" data-copy>복사</button></div>`,
          actions: [{ label: '공유 멈추기', value: 'revoke', danger: true }, { label: '닫기', value: 'close', primary: true }],
          onOpen: (root) => root.querySelector('[data-copy]').addEventListener('click', async () => toast((await copyText(url)) ? '링크를 복사했어요.' : '링크를 길게 눌러 복사해 주세요.')),
        });
        if (res === 'revoke') { await revokeShare(uid, rid); rec.shareToken = null; toast('공유를 멈췄어요.'); }
        drawRows();
      } catch (err) { console.error(err); toast('공유 링크를 만들지 못했어요.'); }
      b.disabled = false;
    }
    if (b.dataset.act === 'delete') {
      const ok = await modal({
        title: '이 결과를 지울까요?',
        body: `<p>${esc(rec.name || '')} 님의 ${esc(title(rec.testId))} 결과를 지워요. 되돌릴 수 없고, 공유 링크도 함께 사라져요.</p>`,
        actions: [{ label: '취소', value: false }, { label: '지우기', value: true, primary: true, danger: true }],
      });
      if (!ok) return;
      try {
        await deleteResult(uid, rid);
        all = all.filter((x) => !(x.uid === uid && x.rid === rid));
        toast('결과를 지웠어요.');
        draw();
      } catch (err) { console.error(err); toast('지우지 못했어요.'); }
    }
  };
}

// ── 생년월일 넣기 (담당자) ─────────────────────
// 생년월일을 받기 전에 저장된 결과에 생년월일을 넣어, 종합 결과지에서 이름 + 생년월일로 함께 묶이게 한다
async function fillBirth() {
  if (!me.owner) return;
  const missing = all.filter((r) => !r.birth);
  if (!missing.length) return;
  let birth = '';
  let picked = [];
  const res = await modal({
    title: '생년월일 넣기',
    body: `<p>생년월일 없이 저장된 결과예요. 같은 분의 결과를 고르고 생년월일을 적어 주세요.</p>
      <ul class="birth-pick">${missing.map((r) => `<li><label><input type="checkbox" data-pick="${esc(r.uid)}/${esc(r.rid)}" checked><span><strong>${esc(r.name || '이름 없음')}</strong> ${esc(title(r.testId))}, ${esc(shortDate(r.createdAt))}, ${esc(ownerLabel(r))}</span></label></li>`).join('')}</ul>
      <div class="field"><label for="fb-birth">생년월일</label><input class="input" id="fb-birth" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="예: 19950312"><p class="field-hint field-hint--quiet" data-fb-hint aria-live="polite"></p></div>`,
    actions: [{ label: '취소', value: false }, { label: '넣기', value: true, primary: true }],
    onOpen: (root) => {
      const input = root.querySelector('#fb-birth');
      const hint = root.querySelector('[data-fb-hint]');
      const go = root.querySelector('.modal-actions [data-i="1"]');
      const sync = () => {
        birth = parseBirth(input.value);
        picked = [...root.querySelectorAll('[data-pick]:checked')].map((x) => x.dataset.pick);
        const typed = input.value.replace(/\D/g, '');
        hint.textContent = birth ? longBirth(birth) : typed.length >= 6 ? '날짜를 다시 확인해 주세요. 8자리(19950312)나 6자리(950312)로 적어요.' : '';
        hint.classList.toggle('is-error', !birth && typed.length >= 6);
        go.disabled = !(birth && picked.length);
      };
      input.addEventListener('input', sync);
      root.querySelectorAll('[data-pick]').forEach((x) => x.addEventListener('change', sync));
      sync();
      input.focus();
    },
  });
  if (!res || !birth || !picked.length) return;
  let done = 0;
  try {
    for (const key of picked) {
      const [uid, rid] = key.split('/');
      await setResultBirth(uid, rid, birth);
      const rec = all.find((x) => x.uid === uid && x.rid === rid);
      if (rec) rec.birth = birth;
      done++;
    }
    toast(`${done}건에 생년월일을 넣었어요.`);
  } catch (err) {
    console.error(err);
    toast(done ? `${done}건까지 넣고 멈췄어요. 다시 시도해 주세요.` : '생년월일을 넣지 못했어요.');
  }
  draw();
}

// ── 문항 분석 ─────────────────────────────────
// 분석 모듈(검사 16개의 문항 정의)은 처음 '분석하기'를 누를 때 불러온다
function wireItemStats() {
  const testEl = box.querySelector('[data-ia-test]');
  const levelEl = box.querySelector('[data-ia-level]');
  const flatEl = box.querySelector('[data-ia-flat]');
  if (!ia.test) ia.test = testEl.value;
  const rerun = () => { if (ia.ran) runItemStats(); };
  testEl.addEventListener('change', () => { ia.test = testEl.value; ia.level = 0; rerun(); });
  levelEl.addEventListener('change', () => { ia.level = Number(levelEl.value) || 0; rerun(); });
  flatEl.addEventListener('change', () => { ia.flat = flatEl.checked; rerun(); });
  box.querySelector('[data-ia-run]').addEventListener('click', runItemStats);
  box.querySelector('[data-ia-csv]').addEventListener('click', itemCsv);
  if (ia.ran) runItemStats();
}

const f2 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toFixed(2).replace('-', '−'));

async function runItemStats() {
  const out = box.querySelector('[data-ia-out]');
  const levelEl = box.querySelector('[data-ia-level]');
  out.innerHTML = '<p class="loading">계산하고 있어요</p>';
  let S;
  let def;
  try {
    [S, def] = await Promise.all([import('../itemstats.js'), loadTest(ia.test)]);
  } catch (e) {
    console.error(e);
    out.innerHTML = '<p class="muted-box">분석 도구를 불러오지 못했어요. 새로 고침한 뒤 다시 시도해 주세요.</p>';
    return;
  }
  ia.ran = true;
  const a = S.analyze(def, all, { level: ia.level, dropFlat: ia.flat });
  levelEl.innerHTML = a.levels.map((l, i) => `<option value="${i}" ${i === ia.level ? 'selected' : ''}>${esc(l.label)}별로 묶기</option>`).join('');
  levelEl.hidden = a.levels.length < 2;
  box.querySelector('[data-ia-csv]').hidden = !a.n;
  if (!a.total) { out.innerHTML = '<p class="muted-box">아직 이 검사의 응답이 없어요.</p>'; return; }
  const left = [a.older ? `이전 버전 응답 ${a.older}건` : '', a.flat ? `모두 같은 답만 고른 응답 ${a.flat}건` : ''].filter(Boolean);
  const head = `<p class="ia-sum">${esc(def.title)} 현재 버전(${esc(def.version || '')}) 응답 <strong>${a.n}건</strong>으로 계산했어요.${left.length ? ` ${left.join(', ')}은 뺐어요.` : ''}</p>`;
  const warn = a.n < S.MIN_N
    ? `<p class="ia-warn">응답이 ${S.MIN_N}건보다 적어서 계산하지 않았어요.</p>`
    : a.n < S.STABLE_N ? `<p class="ia-warn">응답이 ${S.STABLE_N}건이 안 돼서 숫자가 크게 흔들릴 수 있어요. 흐름을 보는 참고로만 써 주세요.</p>` : '';
  const scales = a.n < S.MIN_N ? '' : a.scales.map((sc) => {
    const [bk, bl] = S.alphaBand(sc.alpha);
    const marked = sc.items.filter((it) => it.flags.length).length;
    const rows = sc.items.map((it) => `<tr class="${it.flags.length ? 'is-flag' : ''}">
        <td class="ia-q"><span class="ia-id">${esc(it.id)}</span>${it.rev ? '<span class="ia-rev" title="거꾸로 채점하는 문항">역</span>' : ''}<span class="ia-text">${esc(it.text)}</span></td>
        <td>${f2(it.mean)}</td><td>${f2(it.sd)}</td><td>${f2(it.r)}</td><td>${f2(it.alphaDel)}</td>
        <td class="ia-flags">${it.flags.map(([k, t]) => `<span class="ia-tag ia-tag--${k}">${esc(t)}</span>`).join('')}</td>
      </tr>`).join('');
    return `<details class="ia-scale">
      <summary>
        <span class="ia-name">${esc(sc.name)}</span>
        <span class="ia-meta">문항 ${sc.k}개${sc.n !== a.n ? `, 응답 ${sc.n}건` : ''}</span>
        <span class="ia-alpha"><span class="ia-a">α ${f2(sc.alpha)}</span><span class="ia-pill ia-pill--${bk}">${esc(bl)}</span></span>
        <span class="ia-marked ${marked ? 'is-on' : ''}">${marked ? `살펴볼 문항 ${marked}개` : '살펴볼 문항 없음'}</span>
      </summary>
      <div class="table-wrap"><table class="list ia-items">
        <thead><tr><th>문항</th><th>평균</th><th>표준편차</th><th>문항-나머지 r</th><th>뺐을 때 α</th><th>살펴볼 점</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </details>`;
  }).join('');
  out.innerHTML = `${head}${warn}${scales ? `<div class="ia-list">${scales}</div>` : ''}
    <ul class="ia-help">
      <li><strong>α(알파)</strong>: 같은 척도 문항들이 얼마나 함께 움직이는지예요. 흔히 0.80 이상을 좋음, 0.70 이상을 쓸 만함, 0.60 이상을 낮은 편으로 봐요. 문항이 3~4개뿐인 척도는 α가 낮게 나오기 쉬워요.</li>
      <li><strong>문항-나머지 r</strong>: 이 문항과 같은 척도 나머지 문항 합의 상관이에요. 0.20보다 낮으면 '척도와 따로 놂', 0보다 낮으면 '방향이 반대'로 표시해요. 방향이 반대면 거꾸로 채점하는 문항인지 먼저 확인해 주세요.</li>
      <li><strong>뺐을 때 α</strong>: 이 문항을 빼고 계산한 α예요. 지금보다 0.02 넘게 오르면 '빼면 α가 오름'으로 표시해요.</li>
      <li><strong>응답이 한쪽에 몰림</strong>: 표준편차가 작거나 평균이 양 끝에 가까워, 사람마다의 차이를 잘 가르지 못하는 문항이에요.</li>
      <li><span class="ia-rev">역</span> 표시는 거꾸로 채점하는 문항이에요. 평균과 표준편차는 응답 그대로, 상관과 α는 거꾸로 바꾼 값으로 계산했어요. 문항을 고칠 때는 검사 버전을 올려서, 이전 응답과 섞이지 않게 해 주세요.</li>
    </ul>`;
}

async function itemCsv() {
  const [S, def] = await Promise.all([import('../itemstats.js'), loadTest(ia.test)]);
  const { text, count } = S.responsesCsv(def, all, { dropFlat: ia.flat });
  const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `azit-items-${def.id}-v${def.version || ''}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast(`${count}건의 문항 응답을 이름 없이 내려받았어요.`);
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv() {
  if (!me.owner) return; // 모든 결과를 한꺼번에 내보내는 일은 담당자만
  const rows = filtered();
  const head = ['검사자', '생년월일', '상담사', '상담사 이메일', '검사', '결과 요약', '핵심 유형', '날개', '트라이타입', '본능 순서', '유형 확신도',
    '1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번', '장 중심', '가슴 중심', '머리 중심',
    '개방성', '성실성', '외향성', '친화성', '신경성', '애착 유형', '애착 불안', '애착 회피', '작동하는 도식', '주된 대처', '도식 점수(18)', '민감성', '민감성 수준', '깊이 생각하기', '쉽게 벅참', '감정의 울림', '미세한 감지', '요즘 부담', '요즘 회복', '요즘 상태', '대표 강점', '중심 덕목', '강점 순위(24)', '핵심 가치', '앞선 방향', '변화-보존 축', '초월-향상 축', '가치 순위(10)', '흥미 코드', '일관도', '변별도', '흥미 수준', '흥미 점수(6)', '감정 다루는 힘', '알아차림', '감정 이해', '받아들임', '충동 다스리기', '목표 지키기', '조절 방법', '도움 전략', '지치는 전략', '조절 전략(6)', '대처 스타일', '문제 다루기', '마음 다루기', '물러서기', '상황 맞춤', '대처 점수(8)', '자존감 모양', '자기 가치감', '나를 대하는 방식', '나에게 친절하기', '누구나 그렇다고 알기', '균형 있게 바라보기', '조건 기댐', '기대는 곳(4)', '회복탄력성', '자기 조절력', '대인 관계력', '긍정성', '회복이 기대는 곳', '회복 요인(9)', '기질 유형', '자극 추구', '위험 회피', '사회적 민감성', '인내력', '성품 모양', '자율성', '연대감', '자기 초월', '의미 상태', '의미를 느끼는 정도', '의미를 찾는 정도', '이야기의 결(4)', '적어 낸 장면', '분화 지수', '내 입장 지키기', '감정 반응성', '감정적 단절', '타인과의 융합', '분화 관계 방식', '신앙 애착 유형', '신앙 애착 불안', '신앙 애착 회피', '신앙 애착 갈래(8)', '대인관계 기우는 방향', '관계의 어려움', '기울기', '주도-물러섬 축', '다가감-거리 둠 축', '대인관계 방향(8)', '생각의 모양', '곱씹기', '돌아보기', '검사일시', '소요 시간(분)', '결과 코드', '공유 링크'];
  const COPE = { surrender: '굴복', avoid: '회피', over: '과잉보상' };
  const ES_TYPE = { secure: '단단한 자존감', contingent: '조건에 기댄 자존감', shaken: '흔들리는 자존감', quiet: '지쳐 낮아진 자존감' };
  const ES_BASE = { ap: '인정', ac: '성취', lk: '겉모습', lv: '관계' };
  const CP_STYLE = { balanced: '두 손으로 대처', solver: '문제를 붙잡고 풂', carer: '마음을 먼저 돌봄', retreat: '잠시 물러서 있음', gathering: '힘을 모으는 중' };
  const RS_F = { er: '감정 조절', ic: '충동 통제', ca: '원인 분석', co: '소통', em: '공감', cn: '연결', op: '낙관', gr: '감사', ls: '삶의 만족' };
  const RS_A = { self: '자기 조절력', rel: '대인 관계력', pos: '긍정성', even: '고르게' };
  const CP_ST = { ps: '문제 해결', pl: '계획과 준비', hs: '도움 구하기', es: '마음 나누기', pr: '다시 보기', ac: '받아들이기', av: '피하고 미루기', sb: '스스로 탓하기' };
  const EMO_ST = { re: '다시 보기', sh: '털어놓기', bo: '몸 돌보기', di: '주의 돌리기', su: '꾹 누르기', ru: '곱씹기' };
  const HSP_LV = { low: '낮음', mid: '보통', high: '높음', vhigh: '매우 높음' };
  const HSP_ST = { overload: '과부하', holding: '버티는 중', bloom: '잘 피어나는 중', dry: '채움이 필요함' };
  const SCH = [['ab', '유기'], ['mi', '불신'], ['ed', '정서적 결핍'], ['de', '결함'], ['si', '사회적 고립'], ['di', '의존'], ['vu', '취약성'], ['en', '융합'], ['fa', '실패'], ['et', '특권의식'], ['sc', '자기통제 부족'], ['sb', '복종'], ['ss', '자기희생'], ['as', '승인 추구'], ['np', '비관'], ['ei', '정서적 억제'], ['us', '엄격한 기준'], ['pu', '처벌']];
  const SG = { cre: '창의성', cur: '호기심', jud: '판단력', lrn: '학구열', per: '통찰', bra: '용감함', prs: '끈기', hon: '진실함', zes: '활력', lov: '사랑', kin: '친절', soc: '사회 지능', tea: '협동', fai: '공정함', lea: '리더십', frg: '용서', mod: '겸손', pru: '신중함', reg: '자기 조절', bea: '감상력', gra: '감사', hop: '희망', hmr: '유머', spi: '영성' };
  const SGV = { wis: '지혜', cou: '용기', hum: '인간애', jus: '정의', tem: '절제', tra: '초월' };
  const VL = { sd: '자율', st: '새로움', he: '즐거움', ac: '성취', po: '영향력', se: '안전', co: '규범', tr: '전통', be: '배려', un: '공존' };
  const VLG = { trans: '자기 초월', cons: '보존', enh: '자기 향상', open: '변화' };
  const CR = { r: '현장형', i: '탐구형', a: '예술형', s: '사회형', e: '진취형', c: '관습형' };
  const CR_LV = { high: '높음', mid: '보통', low: '낮음' };
  const conf = { high: '뚜렷함', mid: '비교적 뚜렷함', low: '팽팽함' };
  const IP_OCT = [['pa', '이끌고 정하려 함'], ['bc', '의심하고 맞섬'], ['de', '마음을 닫고 거리 둠'], ['fg', '다가가기 망설임'], ['hi', '내 뜻을 말하기 어려움'], ['jk', '쉽게 맞춰 주고 휘둘림'], ['lm', '남을 챙기느라 나를 잊음'], ['no', '가까워지려 지나치게 다가감']];
  const IP_STYLE = { ...Object.fromEntries(IP_OCT), even: '고른 모양' };
  const RM_TYPE = { reflect: '길을 찾는 생각', deep: '깊고 무거운 생각', circle: '제자리를 맴도는 생각', light: '가볍게 흘려보내는 생각' };
  const lines = [head.join(',')];
  rows.forEach((r) => {
    const s = r.scores || {};
    const ts = (s.likert && s.likert.typeScore) || {};
    const isE = r.testId === 'enneagram';
    lines.push([
      r.name, r.birth || '', ownerLabel(r), r.email, title(r.testId), r.summary,
      isE ? s.core : '', isE ? `${s.core}w${s.wing}` : '', isE && s.tritype ? s.tritype.join('-') : '',
      isE && s.instinct ? s.instinct.stack.map((k) => k.toUpperCase()).join('/') : '', isE ? conf[s.confidence] || '' : '',
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (isE ? ts[t] : '')),
      isE && s.centers ? s.centers.gut : '', isE && s.centers ? s.centers.heart : '', isE && s.centers ? s.centers.head : '',
      ...['O', 'C', 'E', 'A', 'N'].map((d) => (r.testId === 'bigfive' && s.domains && s.domains[d] ? s.domains[d].score : '')),
      r.testId === 'attachment' ? s.styleName || '' : '', r.testId === 'attachment' ? s.anx : '', r.testId === 'attachment' ? s.avo : '',
      r.testId === 'schema' ? (s.active || []).length : '', r.testId === 'schema' ? COPE[s.primaryCoping] || '' : '',
      r.testId === 'schema' && s.schemas ? SCH.map(([k, n]) => `${n} ${s.schemas[k] ? s.schemas[k].score : ''}`).join('; ') : '',
      ...(r.testId === 'hsp' && s.facets
        ? [s.total, HSP_LV[s.level] || '', ...['d', 'o', 'e', 's'].map((f) => (s.facets[f] ? s.facets[f].score : '')), s.load, s.rest, HSP_ST[s.state] || '']
        : r.testId === 'hspnow' // 요즘의 나 체크: 감각처리 민감성 검사 2부와 같은 문장·계산이라 같은 '요즘' 열에 넣는다
          ? ['', '', '', '', '', '', s.load, s.rest, HSP_ST[s.state] || '']
          : ['', '', '', '', '', '', '', '', '']),
      ...(r.testId === 'strengths' && s.strengths
        ? [(s.sig || []).map((k) => SG[k]).join(', '), SGV[s.topVirtue] || '', (s.order || []).map((k) => `${SG[k]} ${s.strengths[k] ? s.strengths[k].score : ''}`).join('; ')]
        : ['', '', '']),
      ...(r.testId === 'values' && s.values
        ? [(s.core || []).map((k) => VL[k]).join(', '), VLG[s.topGroup] || '', s.axisChange, s.axisCare, (s.order || []).map((k) => `${VL[k]} ${s.values[k] ? s.values[k].c : ''}`).join('; ')]
        : ['', '', '', '', '']),
      ...(r.testId === 'career' && s.types
        ? [s.codeText || '', CR_LV[s.consistency] || '', s.diff, s.elevation, (s.order || []).map((k) => `${CR[k]} ${s.types[k] ? s.types[k].score : ''}`).join('; ')]
        : ['', '', '', '', '']),
      ...(r.testId === 'emotion' && s.skills
        ? [s.total, ...['aw', 'cl', 'ac', 'im', 'go', 'st'].map((k) => (s.skills[k] ? s.skills[k].score : '')), s.help, s.cost,
          ['re', 'sh', 'bo', 'di', 'su', 'ru'].map((k) => `${EMO_ST[k]} ${s.strategies ? s.strategies[k] : ''}`).join('; ')]
        : ['', '', '', '', '', '', '', '', '', '']),
      ...(r.testId === 'coping' && s.strategies && s.groups
        ? [CP_STYLE[s.style] || '', s.groups.problem, s.groups.heart, s.groups.away, s.fit,
          ['ps', 'pl', 'hs', 'es', 'pr', 'ac', 'av', 'sb'].map((k) => `${CP_ST[k]} ${s.strategies[k] ? s.strategies[k].score : ''}`).join('; ')]
        : ['', '', '', '', '', '']),
      ...(r.testId === 'esteem' && s.self && s.bases
        ? [ES_TYPE[s.type] || '', s.worth, s.compassion, ...['kind', 'common', 'mind'].map((k) => (s.self[k] ? s.self[k].score : '')), s.lean,
          ['ap', 'ac', 'lk', 'lv'].map((k) => `${ES_BASE[k]} ${s.bases[k] ? s.bases[k].score : ''}`).join('; ')]
        : ['', '', '', '', '', '', '', '']),
      ...(r.testId === 'resilience' && s.factors && s.domains
        ? [s.total, s.domains.self, s.domains.rel, s.domains.pos, RS_A[s.anchor] || '',
          ['er', 'ic', 'ca', 'co', 'em', 'cn', 'op', 'gr', 'ls'].map((k) => `${RS_F[k]} ${s.factors[k] ? s.factors[k].score : ''}`).join('; ')]
        : ['', '', '', '', '', '']),
      ...(r.testId === 'temperament' && s.dims
        ? [(TC_TYPES[s.ttype] || {}).name || '', ...['ns', 'ha', 'rd', 'ps'].map((k) => (s.dims[k] ? s.dims[k].score : '')),
          (TC_SHAPES[s.shape] || {}).name || '', ...['sd', 'co', 'st'].map((k) => (s.dims[k] ? s.dims[k].score : ''))]
        : ['', '', '', '', '', '', '', '', '']),
      ...(r.testId === 'lifestory' && s.themes
        ? [(LS_STATES[s.state] || {}).name || '', s.pr, s.se,
          [['ag', '주도성'], ['cm', '연결'], ['rd', '회복'], ['mk', '의미 엮기']].map(([k, n]) => `${n} ${s.themes[k] ? s.themes[k].score : ''}`).join('; '), s.written]
        : ['', '', '', '', '']),
      ...(r.testId === 'differentiation' && s.facets
        ? [s.total, ...['ip', 'er', 'ec', 'fo'].map((k) => (s.facets[k] ? s.facets[k].score : '')), (DF_STYLES[s.style] || {}).name || '']
        : ['', '', '', '', '', '']),
      ...(r.testId === 'godattach' && s.facets
        ? [(GA_STYLES[s.style] || {}).name || '', s.an, s.av,
          [['aban', '떠나실까 걱정'], ['assure', '확인하고 싶음'], ['cond', '조건'], ['hurt', '서운함'], ['dist', '거리'], ['self', '혼자 해결'], ['closed', '마음 닫기'], ['duty', '의무']].map(([k, n]) => `${n} ${s.facets[k] ? s.facets[k].score : ''}`).join('; ')]
        : ['', '', '', '']),
      ...(r.testId === 'interpersonal' && s.octants
        ? [IP_STYLE[s.style] || '', s.elev, s.amp, s.dom, s.lov,
          IP_OCT.map(([k, n]) => `${n} ${s.octants[k] ? s.octants[k].score : ''}`).join('; ')]
        : ['', '', '', '', '', '']),
      ...(r.testId === 'rumination' && s.scales
        ? [RM_TYPE[s.type] || '', s.br, s.rf]
        : ['', '', '']),
      fmtDate(r.createdAt, true), r.durationSec ? Math.round(r.durationSec / 60) : '', resultCode(r.rid),
      r.shareToken ? shareUrl(r.shareToken) : '',
    ].map(csvCell).join(','));
  });
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `azit-results-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast(`${rows.length}건을 내려받았어요.`);
}

async function manageAdmins() {
  if (!me.owner) { toast('관리자 지정은 담당자만 할 수 있어요.'); return; }
  if (isDemo) { toast('체험 모드에서는 관리자 지정을 쓸 수 없어요.'); return; }
  const self = currentUser();
  const list = Object.entries(users || {}).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  const flags = await Promise.all(list.map(([uid]) => isUserAdmin(uid)));
  await modal({
    title: '관리자 지정',
    body: `<p>한 번이라도 로그인한 사람만 목록에 나와요. 관리자는 상담사를 승인하고 모든 결과를 볼 수 있어요. 다른 계정 결과의 공유·지우기, 생년월일 넣기, CSV, 문항 분석, 관리자 지정은 담당자만 해요.</p>
      <ul class="record-list" style="margin-top:14px;max-height:50vh;overflow:auto">${list
        .map(([uid, u], i) => `<li class="record" style="grid-template-columns:1fr auto;padding:12px 14px"><div class="meta"><strong>${esc(u.name || '')}</strong><span>${esc(u.email || '')}</span></div>
          <div class="acts">${uid === self.uid ? '<em class="role-chip" data-role="owner">담당자</em>' : `<button type="button" class="btn ${flags[i] ? 'btn--ghost' : ''} btn--small" data-toggle="${esc(uid)}" data-on="${flags[i]}">${flags[i] ? '관리자 해제' : '관리자로 지정'}</button>`}</div></li>`)
        .join('')}</ul>`,
    actions: [{ label: '닫기', value: true, primary: true }],
    onOpen: (root) => {
      root.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-toggle]');
        if (!b) return;
        const on = b.dataset.on === 'true';
        b.disabled = true;
        try {
          await setUserAdmin(b.dataset.toggle, !on);
          b.dataset.on = String(!on);
          b.textContent = !on ? '관리자 해제' : '관리자로 지정';
          b.classList.toggle('btn--ghost', !on);
          toast(!on ? '관리자로 지정했어요.' : '관리자에서 해제했어요.');
        } catch (err) { console.error(err); toast('바꾸지 못했어요.'); }
        b.disabled = false;
      });
    },
  });
  admins = await listAdmins(); // 승인된 상담사 목록의 '관리자' 표시를 새로 맞춘다
  draw();
}
