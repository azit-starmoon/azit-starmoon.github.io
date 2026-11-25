// AZIT : Star&Moon — 새 버전 알림
// GitHub Pages는 파일을 10분쯤 브라우저에 담아 두기 때문에, 고친 직후에는 예전 화면이 보일 수 있다.
// version.json(배포할 때마다 바뀜)을 캐시 없이 읽어서, 이 기기가 마지막으로 확인한 버전과 다르면
//  1) 사이트 파일을 캐시 없이 다시 받아 두고 (다음에 여는 화면은 바로 새 버전)
//  2) 지금 화면이 예전 파일로 그려졌을 수 있으면 아래에 '새로고침' 안내를 띄운다.
const SEEN = 'azit:version';
let busy = false;
let lastCheck = 0;
let shown = false;

const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 저장소를 못 쓰는 환경 */ } };

// 이 화면을 그린 파일 중 브라우저에 담아 둔 것을 그대로 쓴 게 있는지 (모르면 null)
function servedFromCache() {
  try {
    const entries = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]
      .filter((e) => e.name.startsWith(location.origin) && (e.entryType === 'navigation' || /\.(js|css|html)(\?|$)/.test(e.name)));
    if (!entries.length || entries.some((e) => typeof e.transferSize !== 'number')) return null;
    return entries.some((e) => e.transferSize === 0 && e.decodedBodySize > 0);
  } catch (e) {
    return null;
  }
}

async function refetchAll(files, base) {
  const urls = files.map((f) => new URL(f, base).href);
  let i = 0;
  const worker = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      try { const r = await fetch(u, { cache: 'reload', credentials: 'same-origin' }); await r.arrayBuffer(); } catch (e) { /* 하나쯤 실패해도 괜찮다 */ }
    }
  };
  await Promise.race([Promise.all([worker(), worker(), worker(), worker()]), new Promise((r) => setTimeout(r, 15000))]);
}

function showBanner() {
  if (shown) return;
  shown = true;
  const el = document.createElement('div');
  el.className = 'update-bar';
  el.setAttribute('role', 'status');
  el.innerHTML = '<span>새 버전이 올라왔어요.</span><button type="button" class="btn btn--small">새로고침</button>';
  const btn = el.querySelector('button');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = '여는 중';
    window.dispatchEvent(new Event('azit:before-update')); // 검사 중이면 지금까지의 답을 먼저 저장
    setTimeout(() => location.reload(), 400);
  });
  document.body.appendChild(el);
  document.body.classList.add('has-update');
}

export async function checkForUpdate() {
  if (busy || shown || Date.now() - lastCheck < 60000) return;
  busy = true;
  lastCheck = Date.now();
  try {
    const url = new URL('version.json', location.href);
    const r = await fetch(`${url.href}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const { v, files = [] } = await r.json();
    if (!v) return;
    const seen = read(SEEN);
    if (seen === v) return;
    // 이 기기에서 처음 확인하는 경우: 예전 버전을 본 적이 없으니 안내 없이 기억만 한다
    // (처음 화면에서 곧바로 다른 화면으로 넘어가도 '새 버전' 안내가 잘못 뜨지 않게)
    if (seen === null) { write(SEEN, v); return; }
    const cached = servedFromCache();
    await refetchAll(files, url);
    write(SEEN, v);
    if (cached !== false) showBanner();
  } catch (e) {
    /* 오프라인 등: 다음에 다시 확인 */
  } finally {
    busy = false;
  }
}

export function watchForUpdate() {
  setTimeout(checkForUpdate, 1500);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
  setInterval(checkForUpdate, 10 * 60000);
}
