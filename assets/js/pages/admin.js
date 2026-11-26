import { mountHeader, mountFooter, esc, toast, modal, fmtDate, shortDate, copyText, resultCode, setRequestBadge } from '../ui.js';
import {
  claimAdmin, listAllResults, listUsers, deleteResult, createShare, revokeShare, resultUrl, shareUrl, isDemo, currentUser,
  isUserAdmin, setUserAdmin, listRequests, listMembers, approveMember, rejectRequest, revokeMember,
} from '../backend.js';
import { TESTS, groupIds } from '../registry.js';
import { requireLogin } from '../guard.js';
import { requireUnlock, watchLock } from '../lock.js';
import { TEMP_TYPES as TC_TYPES, CHAR_SHAPES as TC_SHAPES } from '../../../tests/temperament/content.js';

const box = document.querySelector('[data-admin]');
const title = (id) => (TESTS.find((t) => t.id === id) || {}).title || id;

let all = [];
let users = {};
let requests = {};
let members = {};
const view = { q: '', test: '' };

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
})();

async function load() {
  box.innerHTML = '<p class="loading">불러오고 있어요</p>';
  try {
    [all, users, requests, members] = await Promise.all([listAllResults(), listUsers(), listRequests(), listMembers()]);
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

function filtered() {
  const q = view.q.trim().toLowerCase();
  return all.filter((r) => (!view.test || r.testId === view.test) && (!q || `${r.name || ''} ${ownerLabel(r)} ${r.email || ''}`.toLowerCase().includes(q)));
}

function draw() {
  const reqEntries = Object.entries(requests || {}).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
  const memEntries = Object.entries(members || {}).sort((a, b) => (b[1].approvedAt || 0) - (a[1].approvedAt || 0));
  const countBy = {};
  all.forEach((r) => { countBy[r.uid] = (countBy[r.uid] || 0) + 1; });
  const examinees = new Set(all.map((r) => `${r.uid}:${r.name || ''}`));
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const recent = all.filter((r) => (r.createdAt || 0) >= weekAgo).length;

  const dist = {};
  for (let t = 1; t <= 9; t++) dist[t] = 0;
  all.filter((r) => r.testId === 'enneagram' && r.scores).forEach((r) => { dist[Number(r.scores.core)] = (dist[Number(r.scores.core)] || 0) + 1; });
  const maxD = Math.max(1, ...Object.values(dist));

  box.innerHTML = `
    <section class="admin-block" aria-labelledby="req-t">
      <h2 id="req-t">승인 요청 <span class="count">${reqEntries.length}</span></h2>
      ${reqEntries.length ? `<ul class="req-list">${reqEntries.map(([uid, r]) => `<li class="req" data-uid="${esc(uid)}">
        <div><strong>${esc(r.name || '')}</strong><span>${esc(r.email || '')}, ${esc(fmtDate(r.createdAt, true))}</span>${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}</div>
        <div class="acts"><button type="button" class="btn btn--small" data-req="approve">승인</button><button type="button" class="btn btn--ghost btn--small" data-req="reject">거절</button></div>
      </li>`).join('')}</ul>` : '<p class="muted-box">새 승인 요청이 없어요.</p>'}
    </section>

    <section class="admin-block" aria-labelledby="mem-t">
      <h2 id="mem-t">승인된 상담사 <span class="count">${memEntries.length}</span></h2>
      ${memEntries.length ? `<ul class="req-list">${memEntries
        .map(([uid, m]) => `<li class="req req--member" data-uid="${esc(uid)}">
          <div><strong>${esc(m.name || '')}</strong><span>${esc(m.email || '')}, ${esc(shortDate(m.approvedAt))} 승인, 검사 결과 ${countBy[uid] || 0}건</span>${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}</div>
          <div class="acts"><button type="button" class="btn btn--text btn--small" data-mem="revoke">승인 취소</button></div>
        </li>`)
        .join('')}</ul>` : '<p class="muted-box">아직 승인된 상담사가 없어요. 관리자 계정은 승인 없이 이용할 수 있어요.</p>'}
    </section>

    <section class="admin-block" aria-labelledby="res-t">
      <h2 id="res-t">검사 결과 <span class="count">${all.length}</span></h2>
      <dl class="stats">
        <div class="stat"><dt>검사자</dt><dd>${examinees.size}명</dd></div>
        <div class="stat"><dt>결과</dt><dd>${all.length}건</dd></div>
        <div class="stat"><dt>최근 7일</dt><dd>${recent}건</dd></div>
      </dl>
      <section class="dist" aria-labelledby="dist-t">
        <h2 id="dist-t">한국형 성향 유형 검사의 핵심 유형 분포</h2>
        <div class="dist-cols">${Object.keys(dist)
          .map((t) => `<div class="dist-col" title="${t}번 ${dist[t]}건"><span class="v">${dist[t]}</span><span class="b" style="height:${((dist[t] / maxD) * 80).toFixed(0)}px"></span><span class="t">${t}</span></div>`)
          .join('')}</div>
      </section>
      <div class="toolbar">
        <input class="input" type="search" placeholder="검사자나 상담사 이름으로 찾기" value="${esc(view.q)}" data-q aria-label="검사자나 상담사 이름으로 찾기">
        <select class="input" data-test aria-label="검사 고르기"><option value="">모든 검사</option>${groupIds(TESTS.filter((t) => t.status === 'open').map((t) => t.id))
          .map((g) => `<optgroup label="${esc(g.name)}">${g.tests.map((id) => `<option value="${id}" ${view.test === id ? 'selected' : ''}>${esc(title(id))}</option>`).join('')}</optgroup>`)
          .join('')}</select>
        <span class="spacer"></span>
        <button type="button" class="btn btn--ghost btn--small" data-csv>CSV 내려받기</button>
        <button type="button" class="btn btn--ghost btn--small" data-admins>관리자 지정</button>
      </div>
      <div class="table-wrap"><table class="list"><thead><tr><th>검사자</th><th>상담사</th><th>검사</th><th>결과</th><th>검사일</th><th>공유</th><th></th></tr></thead><tbody data-rows></tbody></table></div>
    </section>`;
  drawRows();

  box.querySelector('[data-q]').addEventListener('input', (e) => { view.q = e.target.value; drawRows(); });
  box.querySelector('[data-test]').addEventListener('change', (e) => { view.test = e.target.value; drawRows(); });
  box.querySelector('[data-csv]').addEventListener('click', exportCsv);
  box.querySelector('[data-admins]').addEventListener('click', manageAdmins);
  box.querySelectorAll('[data-req]').forEach((b) => b.addEventListener('click', onRequest));
  box.querySelectorAll('[data-mem]').forEach((b) => b.addEventListener('click', onMember));
}

async function onRequest(e) {
  const b = e.currentTarget;
  const uid = b.closest('[data-uid]').dataset.uid;
  const r = requests[uid];
  if (b.dataset.req === 'approve') {
    b.disabled = true;
    try {
      await approveMember(uid, { name: r.name, email: r.email, note: r.note });
      toast(`${r.name} 상담사님을 승인했어요.`);
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

async function onMember(e) {
  const uid = e.currentTarget.closest('[data-uid]').dataset.uid;
  const m = members[uid];
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
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--ink-3);padding:28px">${all.length ? '조건에 맞는 결과가 없어요.' : '아직 결과가 없어요.'}</td></tr>`;
    return;
  }
  tb.innerHTML = rows
    .map((r) => `<tr data-key="${esc(r.uid)}/${esc(r.rid)}">
      <td><strong>${esc(r.name || '이름 없음')}</strong></td>
      <td><div class="who"><strong>${esc(ownerLabel(r))}</strong><span>${esc(r.email || '')}</span></div></td>
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
  const head = ['검사자', '상담사', '상담사 이메일', '검사', '결과 요약', '핵심 유형', '날개', '트라이타입', '본능 순서', '유형 확신도',
    '1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번', '장 중심', '가슴 중심', '머리 중심',
    '개방성', '성실성', '외향성', '친화성', '신경성', '애착 유형', '애착 불안', '애착 회피', '작동하는 도식', '주된 대처', '도식 점수(18)', '민감성', '민감성 수준', '깊이 생각하기', '쉽게 벅참', '감정의 울림', '미세한 감지', '요즘 부담', '요즘 회복', '요즘 상태', '대표 강점', '중심 덕목', '강점 순위(24)', '핵심 가치', '앞선 방향', '변화-보존 축', '초월-향상 축', '가치 순위(10)', '흥미 코드', '일관도', '변별도', '흥미 수준', '흥미 점수(6)', '감정 다루는 힘', '알아차림', '감정 이해', '받아들임', '충동 다스리기', '목표 지키기', '조절 방법', '도움 전략', '지치는 전략', '조절 전략(6)', '대처 스타일', '문제 다루기', '마음 다루기', '물러서기', '상황 맞춤', '대처 점수(8)', '자존감 모양', '자기 가치감', '나를 대하는 방식', '나에게 친절하기', '누구나 그렇다고 알기', '균형 있게 바라보기', '조건 기댐', '기대는 곳(4)', '회복탄력성', '자기 조절력', '대인 관계력', '긍정성', '회복이 기대는 곳', '회복 요인(9)', '기질 유형', '자극 추구', '위험 회피', '사회적 민감성', '인내력', '성품 모양', '자율성', '연대감', '자기 초월', '검사일시', '소요 시간(분)', '결과 코드', '공유 링크'];
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
  const lines = [head.join(',')];
  rows.forEach((r) => {
    const s = r.scores || {};
    const ts = (s.likert && s.likert.typeScore) || {};
    const isE = r.testId === 'enneagram';
    lines.push([
      r.name, ownerLabel(r), r.email, title(r.testId), r.summary,
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
    body: `<p>한 번이라도 로그인한 사람만 목록에 나와요. 관리자는 모든 결과를 보고, 상담사를 승인할 수 있어요.</p>
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
