import { mountHeader, mountFooter, esc, shortDate } from '../ui.js';
import { constellation, b5Star } from '../charts.js';
import { TESTS } from '../registry.js';
import { listMyResults, resultUrl, greetingName } from '../backend.js';
import { requireApproved } from '../guard.js';

const GLYPH = {
  enneagram: () => constellation({ 1: 60, 2: 50, 3: 55, 4: 75, 5: 45, 6: 60, 7: 50, 8: 45, 9: 65 }, { core: 9, labels: false, size: 200, title: '아홉 유형 별자리' }),
  bigfive: () => b5Star({ O: 78, C: 56, E: 64, A: 70, N: 40 }, { size: 220, showValues: false, title: '다섯 영역 별 모양' }),
};
const glyphText = { enneagram: (r) => (r.scores && r.scores.core) || '?', bigfive: () => '★' };

(async () => {
  const st = await requireApproved();
  if (!st) return;
  mountHeader('home');

  const name = greetingName(st);
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

  document.querySelector('[data-soon]').innerHTML = TESTS.filter((t) => t.status !== 'open')
    .map((t) => `<li><div><strong>${esc(t.title)}</strong><span>${esc(t.desc)}</span></div><span class="tag">준비 중</span></li>`)
    .join('');

  try {
    const mine = (await listMyResults()).slice(0, 5);
    if (mine.length) {
      const title = (id) => (TESTS.find((t) => t.id === id) || {}).title || id;
      document.querySelector('[data-recent]').innerHTML = mine
        .map((r) => `<li><a href="${resultUrl(r.uid, r.rid)}"><span class="g" aria-hidden="true">${esc(glyphText[r.testId] ? glyphText[r.testId](r) : '·')}</span>
          <span><strong>${esc(r.name || '이름 없음')}</strong><span>${esc(title(r.testId))}, ${esc(r.summary || '')}</span></span>
          <span class="d">${esc(shortDate(r.createdAt))}</span></a></li>`)
        .join('');
      document.querySelector('[data-recent-wrap]').hidden = false;
    }
  } catch (e) { /* 최근 결과를 못 불러와도 첫 화면은 그대로 */ }

  mountFooter();
})();
