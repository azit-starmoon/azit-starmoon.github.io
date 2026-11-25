// AZIT : Star&Moon — 결과지 목차
// 지금 읽고 있는 부분을 목차에 표시하고, 목차 줄만 옆으로 밀어서 그 항목이 보이게 한다.
// scrollIntoView는 쓰지 않는다: 화면 위에 붙어 있는(sticky) 목차에 쓰면 화면 전체를 함께 끌어당겨서,
// 스크롤로 다음 부분에 닿을 때마다 화면이 제자리로 돌아가는 문제가 생긴다.
export function wireToc(el) {
  const nav = el.querySelector('.toc-inner');
  const links = Array.from(el.querySelectorAll('.toc a'));
  if (!nav || !links.length) return;
  const pairs = links
    .map((a) => [a, el.querySelector(`[id="${a.getAttribute('href').slice(1)}"]`)])
    .filter(([, sec]) => sec);
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = null;

  const show = (a) => {
    if (a === current) return;
    if (current) current.removeAttribute('aria-current');
    current = a;
    if (!a) return;
    a.setAttribute('aria-current', 'true');
    const box = nav.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    const delta = r.left + r.width / 2 - (box.left + box.width / 2);
    if (Math.abs(delta) > 4) nav.scrollTo({ left: nav.scrollLeft + delta, behavior: calm ? 'auto' : 'smooth' });
  };

  // 화면 위쪽 35% 선을 지난 마지막 부분이 '지금 읽는 부분'. 맨 아래에 닿으면 마지막 부분.
  const pick = () => {
    ticking = false;
    const line = window.innerHeight * 0.35;
    let active = null;
    for (const [a, sec] of pairs) {
      if (sec.getBoundingClientRect().top <= line) active = a;
      else break;
    }
    const bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (bottom && active) active = pairs[pairs.length - 1][0];
    show(active);
  };
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(pick);
  }, { passive: true });
  window.addEventListener('resize', pick, { passive: true });
  pick();
}
