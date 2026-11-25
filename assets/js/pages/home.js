import { mountHeader, mountFooter, esc } from '../ui.js';
import { constellation, b5Star } from '../charts.js';
import { TESTS } from '../registry.js';
import { greetingName, currentUser } from '../backend.js';
import { requireApproved } from '../guard.js';
import { requireUnlock } from '../lock.js';
import { attachMap } from '../../../tests/attachment/chart.js';
import { schemaRose } from '../../../tests/schema/chart.js';

const GLYPH = {
  enneagram: () => constellation({ 1: 60, 2: 50, 3: 55, 4: 75, 5: 45, 6: 60, 7: 50, 8: 45, 9: 65 }, { core: 9, labels: false, size: 200, title: '아홉 유형 별자리' }),
  bigfive: () => b5Star({ O: 78, C: 56, E: 64, A: 70, N: 40 }, { size: 220, showValues: false, title: '다섯 영역 별 모양' }),
  schema: () => schemaRose(Object.fromEntries(['ab', 'mi', 'ed', 'de', 'si', 'di', 'vu', 'en', 'fa', 'et', 'sc', 'sb', 'ss', 'as', 'np', 'ei', 'us', 'pu']
    .map((k, i) => [k, { score: [40, 22, 58, 70, 30, 25, 35, 20, 45, 15, 28, 62, 80, 66, 38, 50, 88, 55][i], level: [0, 2, 6, 7, 11, 12, 13, 16].includes(i) ? 'active' : 'mild' }])), { size: 220, title: '18가지 규칙 지도' }),
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
        <div class="feature-meta"><span>${t.items}문항</span><span>약 ${t.minutes}분</span><span>${t.parts}부 구성</span></div>
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

const when = (ts) => { const d = new Date(ts || Date.now()); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// 끝내지 못한 검사: 이 기기에 저장된 진행 기록 (검사자마다 하나씩)
function drawResume() {
  const u = currentUser();
  const wrap = document.querySelector('[data-resume-wrap]');
  if (!u || !wrap) return;
  const open = new Map(TESTS.filter((t) => t.status === 'open').map((t) => [t.id, t]));
  const rows = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith('azit:progress:')) continue;
      const [, , testId, version, uid, sid = ''] = k.split(':');
      if (uid !== u.uid || !open.has(testId)) continue;
      const v = JSON.parse(localStorage.getItem(k) || 'null');
      const n = v && v.answers ? Object.keys(v.answers).length : 0;
      if (!n || Date.now() - (v.savedAt || 0) > 30 * 864e5) continue;
      rows.push({ testId, version, sid, name: v.name || '이름 없음', n, total: v.total || open.get(testId).items, savedAt: v.savedAt || 0 });
    }
  } catch (e) { return; }
  if (!rows.length) return;
  rows.sort((a, b) => b.savedAt - a.savedAt);
  const jump = document.querySelector('[data-resume-jump]');
  if (jump) { jump.textContent = `이어서 하기 (${rows.length})`; jump.hidden = false; }
  document.querySelector('[data-resume]').innerHTML = rows.slice(0, 8).map((r) => {
    const pct = Math.min(100, Math.round((r.n / r.total) * 100));
    return `<li><a class="resume-card" href="test.html?t=${encodeURIComponent(r.testId)}&resume=${encodeURIComponent(r.sid)}">
      <span class="who"><strong>${esc(r.name)}</strong><span>${esc(open.get(r.testId).title)}</span></span>
      <span class="meter" aria-hidden="true"><span style="width:${pct}%"></span></span>
      <span class="meta">${r.n}/${r.total}문항, ${esc(when(r.savedAt))}</span>
      <span class="go">이어서 하기</span>
    </a></li>`;
  }).join('');
  wrap.hidden = false;
}
