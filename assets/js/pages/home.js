import { mountHeader, mountFooter, esc, toast } from '../ui.js';
import { constellation, b5Star } from '../charts.js';
import { TESTS } from '../registry.js';
import { greetingName, currentUser, listDrafts, deleteDraft } from '../backend.js';
import { requireApproved } from '../guard.js';
import { requireUnlock } from '../lock.js';
import { attachMap } from '../../../tests/attachment/chart.js';
import { schemaRose } from '../../../tests/schema/chart.js';
import { sensFlower } from '../../../tests/hsp/chart.js';
import { strengthWheel } from '../../../tests/strengths/chart.js';
import { STRENGTH_ORDER } from '../../../tests/strengths/items.js';

const GLYPH = {
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
  document.querySelector('[data-open-tests]').innerHTML = open
    .map((t) => `<article class="feature" aria-labelledby="ft-${t.id}">
      <div class="feature-glyph">${GLYPH[t.id] ? GLYPH[t.id]() : ''}</div>
      <div>
        <h3 id="ft-${t.id}">${esc(t.title)}</h3>
        <p class="feature-desc">${esc(t.desc)}</p>
        <div class="feature-meta"><span>${t.items}문항</span><span>약 ${t.minutes}분</span><span>${t.parts}부 구성</span><span class="tag tag--brand" data-live="${t.id}" hidden></span></div>
        <ul class="feature-gets" aria-label="결과지에 담기는 것">${t.gets.map((g) => `<li class="tag">${esc(g)}</li>`).join('')}</ul>
        <div class="feature-actions"><a class="btn" href="test.html?t=${t.id}">검사 시작하기</a></div>
      </div>
    </article>`)
    .join('');

  drawResume();

  document.querySelector('[data-soon]').innerHTML = TESTS.filter((t) => t.status !== 'open')
    .map((t) => `<li><div><strong>${esc(t.title)}</strong><span>${esc(t.desc)}</span></div><span class="tag">준비 중</span></li>`)
    .join('');

  mountFooter();
})();

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
      <span class="who"><strong>${esc(r.name || '이름 없음')} 님</strong><span>${esc(open.get(r.testId).title)}</span></span>
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
