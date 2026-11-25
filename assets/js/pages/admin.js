import { mountHeader, mountFooter, esc, toast, modal, fmtDate, shortDate, googleButton, copyText, resultCode } from '../ui.js';
import { onUser, isAdmin, claimAdmin, listAllResults, listUsers, deleteResult, createShare, revokeShare, resultUrl, shareUrl, isDemo, currentUser, isUserAdmin, setUserAdmin } from '../backend.js';
import { TESTS } from '../registry.js';

mountHeader('admin');
mountFooter();
const box = document.querySelector('[data-admin]');
const title = (id) => (TESTS.find((t) => t.id === id) || {}).title || id;

let all = [];
let users = {};
const view = { q: '', test: '' };

async function boot(u) {
  if (!u) {
    box.innerHTML = `<div class="gate" style="margin-top:8px"><h2>관리자 로그인</h2><p>관리자 계정으로 로그인해 주세요.</p>${googleButton('구글로 로그인')}</div>`;
    return;
  }
  box.innerHTML = '<p class="loading">권한을 확인하고 있어요</p>';
  if (!(await isAdmin())) {
    box.innerHTML = `<div class="gate" style="margin-top:8px"><h2>관리자 권한이 없어요</h2>
      <p>사이트를 처음 연 사람이라면 이 계정을 첫 관리자로 등록할 수 있어요. 이미 관리자가 있다면 기존 관리자에게 지정을 요청해 주세요.</p>
      <button type="button" class="btn" data-claim>이 계정을 첫 관리자로 등록하기</button></div>`;
    box.querySelector('[data-claim]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await claimAdmin();
        toast('관리자로 등록했어요.');
        setTimeout(() => location.reload(), 700);
      } catch (err) {
        console.error(err);
        toast('이미 다른 관리자가 있어요. 기존 관리자에게 지정을 요청해 주세요.');
        e.target.disabled = false;
      }
    });
    return;
  }
  await load();
}

async function load() {
  box.innerHTML = '<p class="loading">결과를 불러오고 있어요</p>';
  try {
    [all, users] = await Promise.all([listAllResults(), listUsers()]);
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty"><p>결과를 불러오지 못했어요. 보안 규칙이 게시되었는지 확인해 주세요.</p></div>';
    return;
  }
  draw();
}

function filtered() {
  const q = view.q.trim().toLowerCase();
  return all.filter((r) => (!view.test || r.testId === view.test) && (!q || `${r.name || ''} ${r.email || ''}`.toLowerCase().includes(q)));
}

function draw() {
  const people = new Set(all.map((r) => r.uid));
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const recent = all.filter((r) => (r.createdAt || 0) >= weekAgo).length;

  // 한국형 성향검사: 한 사람당 가장 최근 결과의 핵심 유형 분포
  const latest = new Map();
  all.filter((r) => r.testId === 'enneagram' && r.scores).forEach((r) => {
    const prev = latest.get(r.uid);
    if (!prev || (r.createdAt || 0) > (prev.createdAt || 0)) latest.set(r.uid, r);
  });
  const dist = {};
  for (let t = 1; t <= 9; t++) dist[t] = 0;
  latest.forEach((r) => { dist[Number(r.scores.core)] = (dist[Number(r.scores.core)] || 0) + 1; });
  const maxD = Math.max(1, ...Object.values(dist));

  box.innerHTML = `
    <dl class="stats">
      <div class="stat"><dt>응시자</dt><dd>${people.size}명</dd></div>
      <div class="stat"><dt>결과</dt><dd>${all.length}건</dd></div>
      <div class="stat"><dt>최근 7일</dt><dd>${recent}건</dd></div>
    </dl>
    <section class="dist" aria-labelledby="dist-t">
      <h2 id="dist-t">한국형 성향검사 핵심 유형 분포 (한 사람당 최근 결과 기준)</h2>
      <div class="dist-cols">${Object.keys(dist)
        .map((t) => `<div class="dist-col" title="${t}번 ${dist[t]}명"><span class="v">${dist[t]}</span><span class="b" style="height:${((dist[t] / maxD) * 80).toFixed(0)}px"></span><span class="t">${t}</span></div>`)
        .join('')}</div>
    </section>
    <div class="toolbar">
      <input class="input" type="search" placeholder="이름이나 이메일로 찾기" value="${esc(view.q)}" data-q aria-label="이름이나 이메일로 찾기">
      <select class="input" data-test aria-label="검사 고르기"><option value="">모든 검사</option>${TESTS.filter((t) => t.status === 'open')
        .map((t) => `<option value="${t.id}" ${view.test === t.id ? 'selected' : ''}>${esc(t.title)}</option>`)
        .join('')}</select>
      <span class="spacer"></span>
      <button type="button" class="btn btn--ghost btn--small" data-csv>CSV 내려받기</button>
      <button type="button" class="btn btn--ghost btn--small" data-admins>관리자 지정</button>
    </div>
    <div class="table-wrap"><table class="list"><thead><tr><th>응시자</th><th>검사</th><th>결과</th><th>검사일</th><th>공유</th><th></th></tr></thead><tbody data-rows></tbody></table></div>`;
  drawRows();

  box.querySelector('[data-q]').addEventListener('input', (e) => { view.q = e.target.value; drawRows(); });
  box.querySelector('[data-test]').addEventListener('change', (e) => { view.test = e.target.value; drawRows(); });
  box.querySelector('[data-csv]').addEventListener('click', exportCsv);
  box.querySelector('[data-admins]').addEventListener('click', manageAdmins);
}

function drawRows() {
  const rows = filtered();
  const tb = box.querySelector('[data-rows]');
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ink-3);padding:28px">${all.length ? '조건에 맞는 결과가 없어요.' : '아직 결과가 없어요.'}</td></tr>`;
    return;
  }
  tb.innerHTML = rows
    .map((r) => `<tr data-key="${esc(r.uid)}/${esc(r.rid)}">
      <td><div class="who"><strong>${esc(r.name || '이름 없음')}</strong><span>${esc(r.email || '')}</span></div></td>
      <td>${esc(title(r.testId))}</td>
      <td>${esc(r.summary || '')}</td>
      <td>${esc(shortDate(r.createdAt))}</td>
      <td>${r.shareToken ? '공유 중' : '–'}</td>
      <td class="acts"><a class="btn btn--small" href="${resultUrl(r.uid, r.rid)}">열기</a>
        <button type="button" class="btn btn--ghost btn--small" data-act="share">공유</button>
        <button type="button" class="btn btn--text btn--small" data-act="delete">지우기</button></td>
    </tr>`)
    .join('');
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

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv() {
  const rows = filtered();
  const head = ['이름', '이메일', '검사', '결과 요약', '핵심 유형', '날개', '트라이타입', '본능 순서', '유형 확신도',
    '1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번', '장 중심', '가슴 중심', '머리 중심',
    '개방성', '성실성', '외향성', '친화성', '신경성', '검사일시', '소요 시간(분)', '결과 코드', '공유 링크'];
  const conf = { high: '뚜렷함', mid: '비교적 뚜렷함', low: '팽팽함' };
  const lines = [head.join(',')];
  rows.forEach((r) => {
    const s = r.scores || {};
    const ts = (s.likert && s.likert.typeScore) || {};
    const isE = r.testId === 'enneagram';
    lines.push([
      r.name, r.email, title(r.testId), r.summary,
      isE ? s.core : '', isE ? `${s.core}w${s.wing}` : '', isE && s.tritype ? s.tritype.join('-') : '',
      isE && s.instinct ? s.instinct.stack.map((k) => k.toUpperCase()).join('/') : '', isE ? conf[s.confidence] || '' : '',
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (isE ? ts[t] : '')),
      isE && s.centers ? s.centers.gut : '', isE && s.centers ? s.centers.heart : '', isE && s.centers ? s.centers.head : '',
      ...['O', 'C', 'E', 'A', 'N'].map((d) => (r.testId === 'bigfive' && s.domains && s.domains[d] ? s.domains[d].score : '')),
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
  if (isDemo) { toast('체험 모드에서는 관리자 지정을 쓸 수 없어요.'); return; }
  const me = currentUser();
  const list = Object.entries(users || {}).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  const flags = await Promise.all(list.map(([uid]) => isUserAdmin(uid)));
  await modal({
    title: '관리자 지정',
    body: `<p>한 번이라도 로그인한 사람만 목록에 나와요. 관리자는 모든 결과를 보고 공유할 수 있어요.</p>
      <ul class="record-list" style="margin-top:14px;max-height:50vh;overflow:auto">${list
        .map(([uid, u], i) => `<li class="record" style="grid-template-columns:1fr auto;padding:12px 14px"><div class="meta"><strong>${esc(u.name || '')}</strong><span>${esc(u.email || '')}</span></div>
          <div class="acts">${uid === me.uid ? '<span class="tag tag--star">나</span>' : `<button type="button" class="btn ${flags[i] ? 'btn--ghost' : ''} btn--small" data-toggle="${esc(uid)}" data-on="${flags[i]}">${flags[i] ? '관리자 해제' : '관리자로 지정'}</button>`}</div></li>`)
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
}

onUser((u) => boot(u));
