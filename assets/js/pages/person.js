// AZIT : Star&Moon — 검사자별 종합 결과지
// 결과 한 건(u, r)을 기준으로, 같은 상담사 계정 안에서 이름(띄어쓰기·대소문자 무시)과 생년월일이 같은 검사들을 한 장에 모은다.
// 생년월일 없이 저장된 예전 결과는 이름끼리 따로 묶이고, 이름만 같은 다른 기록은 머리말 아래에 링크로 알려 준다.
// 주소에는 이름을 넣지 않는다(방문 기록에 남지 않게). 생년월일은 화면에만 보이고 인쇄(PDF)에는 넣지 않는다. 짝이 되는 검사를 함께 했으면 나란히 읽어 주고,
// 같은 검사를 다시 했으면 '달라진 점'에서 지난 결과와 이어 준다(assets/js/tracks.js). 공유 링크로는 열리지 않는다.
import { mountHeader, mountFooter, esc, fmtDate } from '../ui.js';
import { listResultsOf, getMember, resultUrl, personUrl } from '../backend.js';
import { TESTS, groupIds, codeOf } from '../registry.js';
import { requireApproved } from '../guard.js';
import { requireUnlock, watchLock } from '../lock.js';
import { PAIRS } from '../pairs.js';
import { buildTracks, renderTrack } from '../tracks.js';
import { normName, personKey, fmtBirth } from '../examinee.js';

const box = document.querySelector('[data-person]');
const params = new URLSearchParams(location.search);
const UID = params.get('u') || '';
const RID = params.get('r') || '';
const meta = (id) => TESTS.find((t) => t.id === id) || { title: id };
const ATT = { secure: '안', anxious: '불', fearful: '두', avoidant: '회' };
const glyph = (r) => {
  const s = r.scores || {};
  if (r.testId === 'enneagram') return s.core || '?';
  if (r.testId === 'bigfive') return '★';
  if (r.testId === 'attachment') return ATT[s.style] || '·';
  if (r.testId === 'schema') return s.active && s.active.length && s.topNames && s.topNames[0] ? s.topNames[0].slice(0, 1) : '·';
  return r.glyph || '·';
};

(async () => {
  const st = await requireApproved();
  if (!st) return;
  await requireUnlock('result');
  watchLock('result');
  mountHeader('me');
  mountFooter();
  const uid = UID || st.user.uid;
  const mine = uid === st.user.uid;
  if (!RID) { gate('검사자를 고르지 않았어요', '검사 결과 목록에서 검사자의 종합 결과지를 열어 주세요.'); return; }
  if (!mine && !st.admin) { gate('볼 수 없는 결과예요', '다른 상담사님 계정의 결과는 담당자와 관리자만 모아 볼 수 있어요.'); return; }
  let all = [];
  try {
    all = await listResultsOf(uid);
  } catch (e) {
    console.error(e);
    gate('결과를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    return;
  }
  const anchor = all.find((r) => r.rid === RID);
  if (!anchor) { gate('결과를 찾지 못했어요', '결과가 지워졌거나, 이 계정으로는 볼 수 없는 결과예요.'); return; }
  const name = anchor.name || '이름 없음';
  const key = personKey(anchor);
  const list = all.filter((r) => personKey(r) === key);
  // 이름은 같지만 생년월일이 다른(또는 없는) 기록: 다른 분일 수 있어 따로 두고 링크만 건다
  const others = new Map();
  all.filter((r) => normName(r.name) === normName(anchor.name) && personKey(r) !== key).forEach((r) => {
    const k = personKey(r);
    if (!others.has(k)) others.set(k, { birth: r.birth || '', n: 0, uid: r.uid, rid: r.rid });
    others.get(k).n++;
  });
  document.title = `${name} 님의 종합 결과지 | AZIT : Star&Moon`;
  const acct = mine ? null : await getMember(uid); // 관리 화면에서 이름을 고쳤으면 지금 이름으로
  render(name, list, { mine, owner: (acct && acct.name) || anchor.ownerName || anchor.email || '', birth: anchor.birth || '', others: [...others.values()], viewer: st.owner ? '담당자' : '관리자' });
})();

function gate(t, d) {
  box.innerHTML = `<div class="gate"><h1>${esc(t)}</h1><p>${esc(d)}</p><a class="btn" href="me.html">검사 결과 목록으로</a></div>`;
}

function render(name, list, { mine, owner, birth, others, viewer }) {
  // 검사마다 가장 최근 결과를 쓰고, 이전 결과는 날짜로만 남긴다
  const byTest = new Map();
  list.forEach((r) => { if (!byTest.has(r.testId)) byTest.set(r.testId, []); byTest.get(r.testId).push(r); });
  const latest = new Map([...byTest].map(([id, rs]) => [id, rs[0]]));
  const first = fmtDate(list[list.length - 1].createdAt);
  const last = fmtDate(list[0].createdAt);
  const period = first === last ? `${last}에 한 검사예요` : `${first}부터 ${last}까지 한 검사예요`;
  const count = list.length > latest.size ? `검사 ${latest.size}개, 결과 ${list.length}건을` : `검사 ${latest.size}개를`;

  const groups = groupIds([...latest.keys()]).map((g) => `<div class="pp-group">
      <h3 class="pp-group-t">${esc(g.name)}${g.question ? `<span>${esc(g.question)}</span>` : ''}</h3>
      <ul class="pp-cards">${g.tests.map((id) => card(id, byTest.get(id))).join('')}</ul>
    </div>`).join('');

  const { tracks, dropped } = buildTracks(list);
  const trend = tracks.length
    ? `<p class="pp-lead">같은 검사를 다시 한 결과를 날짜순으로 이었어요. 화살표 왼쪽이 바로 앞 결과, 오른쪽이 가장 최근 결과예요. 같은 사람이 다시 해도 점수는 조금씩 달라져서, 그 정도의 차이는 '비슷함'으로 적었어요. 문항이 적은 점수일수록 그 폭이 넓어요(6문항 점수는 10점, 24문항 점수는 5점).</p>
      ${tracks.map((t) => renderTrack(t, meta)).join('')}
      ${dropped ? `<p class="pp-note">채점 기준이 바뀌기 전의 결과 ${dropped}건은 잇지 않았어요.</p>` : ''}`
    : `<p class="pp-lead">같은 검사를 두 번 이상 하면 여기에서 지난 결과와 이어 볼 수 있어요. 요즘의 나 체크는 2분이면 끝나서, 한 달에 한 번처럼 정해 두고 하기 좋아요.</p>`;

  const pairs = PAIRS.filter((p) => latest.has(p.a) && latest.has(p.b)).map((p) => `<article class="pp-pair">
      <h3>${esc(p.title)}</h3>
      ${p.render(latest.get(p.a).scores || {}, latest.get(p.b).scores || {})}
    </article>`).join('');

  // 짝 가운데 한쪽만 했으면, 나머지 한쪽을 권한다 (같은 검사는 한 번만)
  const todo = new Map();
  PAIRS.forEach((p) => {
    if (latest.has(p.a) === latest.has(p.b)) return;
    const done = latest.has(p.a) ? p.a : p.b;
    const next = done === p.a ? p.b : p.a;
    if (!todo.has(next)) todo.set(next, `${meta(done).title}와 함께 보면 ${p.why}`);
  });
  const nexts = mine && todo.size
    ? `<section class="pp-sec no-print" aria-labelledby="pp-next">
        <h2 id="pp-next">함께 하면 좋은 검사</h2>
        <ul class="pp-next">${[...todo].map(([id, why]) => `<li><a href="test.html?t=${esc(id)}"><strong>${esc(meta(id).title)}</strong>${codeOf(id) ? `<span class="tcard-code">${esc(codeOf(id))}</span>` : ''}</a><p>${esc(why)}.</p></li>`).join('')}</ul>
      </section>`
    : '';

  box.innerHTML = `<header class="pp-head">
      <p class="pp-kicker">종합 결과지</p>
      <h1>${esc(name)} 님</h1>
      <p class="pp-birth no-print">${birth ? `생년월일 ${esc(fmtBirth(birth))}` : '생년월일 없이 저장된 결과예요'}</p>
      <p>${count} 한 장에 모았어요. ${esc(period)}.</p>
      ${others.length ? `<p class="pp-others no-print">이름이 같은 다른 기록: ${others.map((o) => `<a href="${personUrl(o.uid, o.rid)}">${o.birth ? esc(fmtBirth(o.birth)) : '생년월일 없음'} (${o.n}건)</a>`).join(', ')}</p>` : ''}
      ${!mine && owner ? `<p class="pp-owner">${esc(owner)} 상담사님 계정의 결과를 ${viewer} 권한으로 보고 있어요.</p>` : ''}
      <div class="pp-acts no-print">
        <button type="button" class="btn btn--ghost btn--small" data-print>PDF로 저장</button>
        <a class="btn btn--ghost btn--small" href="${mine ? 'me.html' : 'admin.html'}">${mine ? '검사 결과 목록' : '관리로 돌아가기'}</a>
      </div>
    </header>
    <section class="pp-sec" aria-labelledby="pp-all">
      <h2 id="pp-all">한눈에 보기</h2>
      <p class="pp-lead">검사마다 가장 최근 결과의 한 줄 요약이에요. 자세한 내용은 각 결과지에서 볼 수 있어요.</p>
      ${groups}
    </section>
    <section class="pp-sec${tracks.length ? ' pp-sec--trend' : ''}" aria-labelledby="pp-trend">
      <h2 id="pp-trend">달라진 점</h2>
      ${trend}
    </section>
    <section class="pp-sec${pairs ? ' pp-sec--pairs' : ''}" aria-labelledby="pp-pairs">
      <h2 id="pp-pairs">함께 읽기</h2>
      ${pairs
        ? `<p class="pp-lead">짝이 되는 검사를 함께 했을 때 두 결과를 나란히 놓았어요. 점수를 높음(60 이상), 보통(40~59), 낮음(40 미만)으로 나눠 같은 칸이면 '같은 방향', 한 칸 차이면 '조금 다름', 양 끝이면 '엇갈림'으로 적었어요. 엇갈리는 곳은 틀린 곳이 아니라 이야기를 시작하기 좋은 곳이에요.</p>${pairs}`
        : `<p class="pp-lead">아직 짝이 되는 검사를 함께 하지 않았어요. 성인 애착 유형 검사와 신앙 애착 검사, 성격 5요인 검사와 기질과 성품 검사처럼 짝이 되는 검사를 함께 하면 두 결과를 여기에서 나란히 읽을 수 있어요.</p>`}
    </section>
    ${nexts}`;
  box.querySelector('[data-print]').addEventListener('click', () => window.print());
  // 접어 둔 '갈래별 점수'도 PDF에는 펼쳐서 넣는다
  window.addEventListener('beforeprint', () => box.querySelectorAll('details').forEach((d) => { d.open = true; }));
}

function card(id, rs) {
  const r = rs[0];
  const code = codeOf(id);
  const older = rs.slice(1, 4).map((o) => `<a href="${resultUrl(o.uid, o.rid)}">${esc(fmtDate(o.createdAt))}</a>`).join(', ');
  const more = rs.length > 4 ? ` 외 ${rs.length - 4}건` : '';
  return `<li class="pp-card">
    <div class="glyph" aria-hidden="true">${esc(glyph(r))}</div>
    <div class="pp-card-body">
      <p class="pp-card-t"><strong>${esc(meta(id).title)}</strong>${code ? `<span class="tcard-code">${esc(code)}</span>` : ''}</p>
      <p class="pp-card-s">${esc(r.summary || '')}</p>
      <div class="pp-card-f">
        <p class="pp-card-m">${esc(fmtDate(r.createdAt))}${rs.length > 1 ? `<span class="pp-older">이전 결과 ${older}${more}</span>` : ''}</p>
        <a class="btn btn--ghost btn--small no-print" href="${resultUrl(r.uid, r.rid)}">결과지</a>
      </div>
    </div>
  </li>`;
}
