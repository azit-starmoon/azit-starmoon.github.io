import { mountHeader, mountFooter, esc, toast } from '../ui.js';
import { constellation, b5Star } from '../charts.js';
import { TESTS, groupIds, BUNDLES } from '../registry.js';
import { greetingName, currentUser, listDrafts, deleteDraft } from '../backend.js';
import { requireApproved } from '../guard.js';
import { requireUnlock } from '../lock.js';
import { fmtBirth } from '../examinee.js';
import { attachMap } from '../../../tests/attachment/chart.js';
import { schemaRose } from '../../../tests/schema/chart.js';
import { sensFlower } from '../../../tests/hsp/chart.js';
import { strengthWheel } from '../../../tests/strengths/chart.js';
import { STRENGTH_ORDER } from '../../../tests/strengths/items.js';
import { valueWheel } from '../../../tests/values/chart.js';
import { interestHex } from '../../../tests/career/chart.js';
import { skillHex } from '../../../tests/emotion/chart.js';
import { copeRose } from '../../../tests/coping/chart.js';
import { esteemMap } from '../../../tests/esteem/chart.js';
import { resilRose } from '../../../tests/resilience/chart.js';
import { tcRose } from '../../../tests/temperament/chart.js';
import { storyShelf } from '../../../tests/lifestory/chart.js';
import { selfCircles } from '../../../tests/differentiation/chart.js';

const GLYPH = {
  godattach: () => attachMap([{ x: 26, y: 30, main: true }], { size: 220, axis: false, quadLabels: false, labels: false, mark: 1.7, title: '신앙 애착 지도' }),
  differentiation: () => selfCircles({ ip: { score: 72 }, er: { score: 52 }, ec: { score: 34 }, fo: { score: 44 } }, { size: 220, labels: false, title: '나와 가까운 사람의 두 원' }),
  lifestory: () => storyShelf({ ag: { score: 72 }, cm: { score: 84 }, rd: { score: 64 }, mk: { score: 56 } }, { size: 220, labels: false, title: '이야기 책장' }),
  temperament: () => tcRose({ ns: { score: 70 }, ha: { score: 42 }, rd: { score: 78 }, ps: { score: 60 }, sd: { score: 66 }, co: { score: 74 }, st: { score: 58 } }, { size: 220, labels: false, title: '기질과 성품 꽃잎' }),
  enneagram: () => constellation({ 1: 60, 2: 50, 3: 55, 4: 75, 5: 45, 6: 60, 7: 50, 8: 45, 9: 65 }, { core: 9, labels: false, size: 200, title: '아홉 유형 별자리' }),
  bigfive: () => b5Star({ O: 78, C: 56, E: 64, A: 70, N: 40 }, { size: 220, showValues: false, title: '다섯 영역 별 모양' }),
  schema: () => schemaRose(Object.fromEntries(['ab', 'mi', 'ed', 'de', 'si', 'di', 'vu', 'en', 'fa', 'et', 'sc', 'sb', 'ss', 'as', 'np', 'ei', 'us', 'pu']
    .map((k, i) => [k, { score: [40, 22, 58, 70, 30, 25, 35, 20, 45, 15, 28, 62, 80, 66, 38, 50, 88, 55][i], level: [0, 2, 6, 7, 11, 12, 13, 16].includes(i) ? 'active' : 'mild' }])), { size: 220, title: '18가지 규칙 지도' }),
  hsp: () => sensFlower({ d: { score: 72 }, o: { score: 58 }, e: { score: 84 }, s: { score: 66 } }, { size: 220, total: 70, labels: false, title: '네 갈래 민감성 꽃' }),
  strengths: () => {
    const sc = [62, 80, 55, 74, 58, 40, 66, 70, 52, 86, 78, 64, 60, 50, 38, 56, 48, 44, 36, 82, 76, 68, 54, 42];
    const order = [...STRENGTH_ORDER].sort((a, b) => sc[STRENGTH_ORDER.indexOf(b)] - sc[STRENGTH_ORDER.indexOf(a)]);
    return strengthWheel(Object.fromEntries(STRENGTH_ORDER.map((k, i) => {
      const rank = order.indexOf(k) + 1;
      return [k, { score: sc[i], rank, tier: rank <= 5 ? 'sig' : rank > 19 ? 'rest' : 'mid' }];
    })), { size: 220, labels: false, title: '24강점 바퀴' });
  },
  values: () => {
    const sc = { un: 70, be: 82, tr: 40, co: 52, se: 60, po: 34, ac: 64, he: 72, st: 66, sd: 86 };
    const order = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
    return valueWheel(Object.fromEntries(order.map((k, i) => [k, { score: sc[k], rank: i + 1, tier: i < 3 ? 'core' : i > 6 ? 'low' : 'mid' }])), { size: 220, labels: false, title: '열 가지 가치 원형' });
  },
  career: () => interestHex({ r: { score: 38, rank: 5 }, i: { score: 70, rank: 3 }, a: { score: 84, rank: 1 }, s: { score: 76, rank: 2 }, e: { score: 52, rank: 4 }, c: { score: 30, rank: 6 } }, { size: 220, labels: false, title: '여섯 흥미 육각형' }),
  emotion: () => skillHex({ aw: { score: 74 }, cl: { score: 66 }, ac: { score: 52 }, im: { score: 70 }, go: { score: 80 }, st: { score: 60 } }, { size: 220, total: 67, labels: false, title: '감정을 다루는 힘 육각형' }),
  coping: () => copeRose({ ps: { score: 72 }, pl: { score: 64 }, hs: { score: 50 }, es: { score: 68 }, pr: { score: 60 }, ac: { score: 55 }, av: { score: 40 }, sb: { score: 30 } }, { size: 220, center: 62, labels: false, title: '여덟 가지 대처 꽃잎' }),
  esteem: () => esteemMap(70, 32, { size: 220, type: 'secure', labels: false, title: '자존감 지도' }),
  resilience: () => resilRose({ er: { score: 62 }, ic: { score: 55 }, ca: { score: 70 }, co: { score: 66 }, em: { score: 80 }, cn: { score: 74 }, op: { score: 58 }, gr: { score: 76 }, ls: { score: 64 } }, { size: 220, center: 67, labels: false, title: '아홉 요인 회복탄력성 지도' }),
  attachment: () => attachMap([{ x: 30, y: 34, main: true }, { x: 22, y: 70 }, { x: 68, y: 40 }, { x: 40, y: 22 }], { size: 220, axis: false, quadLabels: false, labels: false, mark: 1.7, title: '불안과 회피 두 축의 애착 지도' }),
};

(async () => {
  const st = await requireApproved();
  if (!st) return;
  const name = greetingName(st);
  await requireUnlock('test', { name });
  mountHeader('home');

  document.querySelector('[data-greet]').textContent = name ? `반갑습니다 ${name} 상담사님!` : '반갑습니다 상담사님!';
  document.querySelector('[data-hero-figure]').innerHTML = constellation(
    { 1: 62, 2: 48, 3: 55, 4: 70, 5: 44, 6: 58, 7: 50, 8: 46, 9: 82 },
    { core: 9, animate: true, labels: false, size: 360, title: '아홉 개의 별을 이은 별자리' }
  );

  const open = TESTS.filter((t) => t.status === 'open');
  const meta = new Map(open.map((t) => [t.id, t]));
  const groups = groupIds(open.map((t) => t.id));
  document.querySelector('[data-group-nav]').innerHTML = groups
    .map((g) => `<a class="tg-chip" href="#g-${g.id}"><span>${esc(g.name)}</span><span class="n">${g.tests.length}</span></a>`)
    .join('');
  document.querySelector('[data-open-tests]').innerHTML = groups
    .map((g) => `<section class="tg" id="g-${g.id}" aria-labelledby="g-${g.id}-t">
      <div class="tg-head">
        <h3 id="g-${g.id}-t">${esc(g.name)}</h3>
        ${g.question ? `<p class="tg-q">${esc(g.question)}</p>` : ''}
        ${g.desc ? `<p class="tg-desc">${esc(g.desc)}</p>` : ''}
      </div>
      <div class="tg-grid">${g.tests.map((id) => {
        const t = meta.get(id);
        return `<article class="tcard" aria-labelledby="ft-${t.id}">
          <div class="tcard-glyph" aria-hidden="true">${GLYPH[t.id] ? GLYPH[t.id]() : ''}</div>
          <div class="tcard-body">
            <h4 id="ft-${t.id}">${esc(t.title)}${t.code ? ` <span class="tcard-code">${esc(t.code)}</span>` : ''}</h4>
            <p class="tcard-desc">${esc(t.desc)}</p>
            <div class="tcard-foot">
              <div class="tcard-meta"><span>${t.items}문항</span><span>약 ${t.minutes}분</span><span class="tag tag--brand" data-live="${t.id}" hidden></span></div>
              <a class="btn btn--small tcard-go" href="test.html?t=${t.id}" aria-label="${esc(t.title)} 시작하기">시작하기</a>
            </div>
          </div>
        </article>`;
      }).join('')}</div>
    </section>`)
    .join('');

  drawBundles(meta);
  drawResume();

  const soon = TESTS.filter((t) => t.status !== 'open');
  const soonEl = document.querySelector('[data-soon]');
  soonEl.innerHTML = soon
    .map((t) => `<li><div><strong>${esc(t.title)}</strong><span>${esc(t.desc)}</span></div><span class="tag">준비 중</span></li>`)
    .join('');
  // 준비 중인 검사가 없으면 '곧 열릴 검사' 칸을 통째로 숨긴다
  const soonSec = soonEl.closest('section');
  if (soonSec) soonSec.hidden = soon.length === 0;

  mountFooter();
})();

// 고민별 추천 묶음: 묶음 이름을 탭으로 늘어놓고, 고른 묶음의 검사 순서와 시간을 보여 준다
function drawBundles(meta) {
  const box = document.querySelector('[data-bundles]');
  if (!box) return;
  const list = BUNDLES.filter((b) => b.tests.every((id) => meta.has(id)));
  if (!list.length) return;
  box.closest('section').hidden = false;
  const panel = (b) => {
    const total = b.tests.reduce((n, id) => n + (meta.get(id).minutes || 0), 0);
    const steps = b.tests.map((id, i) => {
      const t = meta.get(id);
      return `<li><a class="bd-step" href="test.html?t=${esc(id)}&amp;b=${esc(b.id)}" aria-label="${i + 1}번째, ${esc(t.title)} 시작하기">
        <span class="bd-no" aria-hidden="true">${i + 1}</span>
        <span class="bd-t"><strong>${esc(t.title)}</strong>${t.code ? `<span class="tcard-code">${esc(t.code)}</span>` : ''}</span>
        <span class="bd-m">${t.items}문항, 약 ${t.minutes}분</span>
      </a></li>`;
    }).join('');
    return `<p class="bd-desc">${esc(b.desc)}</p>
      <ol class="bd-steps">${steps}</ol>
      <div class="bd-foot"><span class="bd-total">검사 ${b.tests.length}개, 모두 약 ${total}분</span><a class="btn" href="test.html?t=${esc(b.tests[0])}&amp;b=${esc(b.id)}">묶음으로 시작하기</a></div>`;
  };
  box.innerHTML = `<div class="bd-tabs" role="tablist" aria-label="고민별 추천 묶음">${list.map((b, i) => `<button type="button" role="tab" id="bd-tab-${b.id}" aria-controls="bd-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-bundle="${b.id}">${esc(b.name)}</button>`).join('')}</div>
    <div class="bd-panel" id="bd-panel" role="tabpanel" aria-labelledby="bd-tab-${list[0].id}" tabindex="0">${panel(list[0])}</div>`;
  const tabs = [...box.querySelectorAll('[role="tab"]')];
  const pick = (btn, focus = false) => {
    tabs.forEach((x) => { const on = x === btn; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
    const b = list.find((x) => x.id === btn.dataset.bundle);
    const pn = box.querySelector('[role="tabpanel"]');
    pn.setAttribute('aria-labelledby', btn.id);
    pn.innerHTML = panel(b);
    if (focus) btn.focus();
  };
  box.querySelector('[role="tablist"]').addEventListener('click', (e) => { const btn = e.target.closest('[role="tab"]'); if (btn) pick(btn); });
  box.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    pick(tabs[(to + tabs.length) % tabs.length], true);
  });
}

const two = (n) => String(n).padStart(2, '0');
const when = (ts) => { const d = new Date(ts || Date.now()); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${two(d.getHours())}:${two(d.getMinutes())}`; };
const KEEP = 30 * 864e5;

// 끝내지 못한 검사: 이 기기에 저장된 진행 + 상담사 계정에 저장된 진행 (검사자마다 하나씩)
async function drawResume() {
  const u = currentUser();
  const wrap = document.querySelector('[data-resume-wrap]');
  if (!u || !wrap) return;
  const open = new Map(TESTS.filter((t) => t.status === 'open').map((t) => [t.id, t]));
  const rows = new Map(); // 검사:버전:세션 → 진행
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith('azit:progress:')) continue;
      const [, , testId, version, uid, sid = ''] = k.split(':');
      if (uid !== u.uid || !open.has(testId)) continue;
      const v = JSON.parse(localStorage.getItem(k) || 'null');
      if (!v || !v.answers || Date.now() - (v.savedAt || 0) > KEEP) continue;
      rows.set(`${testId}:${version}:${sid}`, { ...v, testId, version, sid, localKey: k });
    }
  } catch (e) { /* 저장소를 못 읽는 환경 */ }
  paint(rows, open, 'checking');

  let cloud = 'off';
  try {
    const drafts = await Promise.race([listDrafts(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 6000))]);
    const there = new Set();
    drafts.forEach((d) => {
      if (!open.has(d.testId) || !d.sid) return;
      const key = `${d.testId}:${d.version}:${d.sid}`;
      if (Date.now() - (d.savedAt || 0) > KEEP) { deleteDraft(`${d.testId}-${d.version}-${d.sid}`).catch(() => {}); return; }
      there.add(key);
      const cur = rows.get(key);
      if (!cur || (d.savedAt || 0) > (cur.savedAt || 0)) rows.set(key, { ...d, localKey: cur && cur.localKey });
    });
    // 한 번 계정에 올라갔는데 지금은 없는 것 = 다른 기기에서 끝냈거나 지운 검사
    rows.forEach((r, key) => {
      if (r.localKey && r.syncedAt && r.sid && !there.has(key)) {
        try { localStorage.removeItem(r.localKey); } catch (e) { /* */ }
        rows.delete(key);
      }
    });
    cloud = 'on';
  } catch (e) { /* 규칙이 아직 없거나 오프라인: 이 기기 기록만 보여 준다 */ }
  paint(rows, open, cloud);
}

function paint(rowsMap, open, cloud) {
  const wrap = document.querySelector('[data-resume-wrap]');
  const hero = document.querySelector('[data-hero]');
  const rows = [...rowsMap.values()].map((r) => ({ ...r, n: Object.keys(r.answers || {}).length })).filter((r) => r.n > 0)
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  const counts = {};
  rows.forEach((r) => { counts[r.testId] = (counts[r.testId] || 0) + 1; });
  document.querySelectorAll('[data-live]').forEach((el) => {
    const n = counts[el.dataset.live] || 0;
    el.hidden = !n;
    el.textContent = n ? `진행 중 ${n}명` : '';
  });
  if (!rows.length) { wrap.hidden = true; if (hero) hero.classList.remove('has-resume'); return; }

  let note = null;
  try { note = JSON.parse(sessionStorage.getItem('azit:saved-note') || 'null'); } catch (e) { /* */ }
  const fresh = note && Date.now() - (note.at || 0) < 120000 ? `${note.testId}:${note.sid}` : '';

  document.querySelector('[data-resume-count]').textContent = `${rows.length}명`;
  document.querySelector('[data-resume]').innerHTML = rows.slice(0, 8).map((r) => {
    const total = r.total || open.get(r.testId).items;
    const pct = Math.min(100, Math.round((r.n / total) * 100));
    const isFresh = fresh && fresh === `${r.testId}:${r.sid}`;
    return `<li><a class="resume-card${isFresh ? ' is-fresh' : ''}" href="test.html?t=${encodeURIComponent(r.testId)}&resume=${encodeURIComponent(r.sid)}">
      <span class="who"><strong>${esc(r.name || '이름 없음')} 님${r.birth ? `<span class="born">${esc(fmtBirth(r.birth))}</span>` : ''}</strong><span>${esc(open.get(r.testId).title)}</span></span>
      <span class="go">이어서 하기</span>
      <span class="bar"><span class="meter" aria-hidden="true"><span style="width:${pct}%"></span></span><span class="cnt">${r.n}/${total}</span></span>
      <span class="when">${isFresh ? '방금 저장했어요' : `${esc(when(r.savedAt))}에 멈춤`}</span>
    </a></li>`;
  }).join('');
  document.querySelector('[data-resume-note]').textContent = cloud === 'on'
    ? '답할 때마다 상담사님 계정에 저장돼서, 다른 기기에서도 멈춘 곳부터 이어져요. 30일 동안 보관해요.'
    : cloud === 'off' ? '답할 때마다 이 기기에 저장돼요. 30일 동안 보관해요.' : '답할 때마다 자동으로 저장돼요. 30일 동안 보관해요.';
  wrap.hidden = false;
  if (hero) hero.classList.add('has-resume');

  if (note && cloud !== 'checking') {
    try { sessionStorage.removeItem('azit:saved-note'); } catch (e) { /* */ }
    if (fresh && rows.some((r) => `${r.testId}:${r.sid}` === fresh)) {
      toast(`${note.name || '검사자'} 님 검사를 ${note.n}/${note.total}문항까지 저장했어요.`, 4200);
    }
  }
}
