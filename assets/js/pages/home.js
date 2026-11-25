import { mountHeader, mountFooter, esc } from '../ui.js';
import { constellation, b5Star } from '../charts.js';
import { TESTS } from '../registry.js';
import { onUser, listMyResults, resultUrl } from '../backend.js';

mountHeader('home');

const sky = { 1: 62, 2: 48, 3: 55, 4: 70, 5: 44, 6: 58, 7: 50, 8: 46, 9: 82 };
document.querySelector('[data-hero-figure]').innerHTML = constellation(sky, { core: 9, animate: true, labels: false, size: 360, title: '아홉 개의 별을 이은 별자리' });

const GLYPH = {
  enneagram: () => constellation({ 1: 60, 2: 50, 3: 55, 4: 75, 5: 45, 6: 60, 7: 50, 8: 45, 9: 65 }, { core: 9, labels: false, size: 200, title: '아홉 유형 별자리' }),
  bigfive: () => b5Star({ O: 78, C: 56, E: 64, A: 70, N: 40 }, { size: 220, showValues: false, title: '다섯 영역 별 모양' }),
};

const open = TESTS.filter((t) => t.status === 'open');
document.querySelector('[data-open-tests]').innerHTML = open
  .map(
    (t) => `<article class="feature" aria-labelledby="ft-${t.id}">
      <div class="feature-glyph">${GLYPH[t.id] ? GLYPH[t.id]() : ''}</div>
      <div>
        <h3 id="ft-${t.id}">${esc(t.title)}</h3>
        <p class="feature-desc">${esc(t.desc)}</p>
        <div class="feature-meta"><span>${t.items}문항</span><span>약 ${t.minutes}분</span><span>${t.parts}부 구성</span></div>
        <ul class="feature-gets" aria-label="결과지에 담기는 것">${t.gets.map((g) => `<li class="tag">${esc(g)}</li>`).join('')}</ul>
        <div class="feature-actions">
          <a class="btn" href="test.html?t=${t.id}">검사 시작하기</a>
          <span data-last="${t.id}"></span>
        </div>
      </div>
    </article>`
  )
  .join('');

document.querySelector('[data-soon]').innerHTML = TESTS.filter((t) => t.status !== 'open')
  .map((t) => `<li><div><strong>${esc(t.title)}</strong><span>${esc(t.desc)}</span></div><span class="tag">준비 중</span></li>`)
  .join('');

onUser(async (u) => {
  document.querySelectorAll('[data-last]').forEach((el) => (el.innerHTML = ''));
  if (!u) return;
  try {
    const mine = await listMyResults();
    open.forEach((t) => {
      const last = mine.find((r) => r.testId === t.id);
      const slot = document.querySelector(`[data-last="${t.id}"]`);
      if (last && slot) slot.innerHTML = `<a class="btn btn--ghost" href="${resultUrl(last.uid, last.rid)}">지난 결과 보기</a>`;
    });
  } catch (e) { /* 목록을 못 불러와도 첫 화면은 그대로 */ }
});

mountFooter();
