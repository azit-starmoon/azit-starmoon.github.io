// AZIT : Star&Moon — 화면 잠금 (검사 코드, 결과 잠금 번호)
// 데이터는 로그인과 승인(보안 규칙)이 서버에서 지키고, 이 잠금은 상담사 기기를 검사자에게 건넬 때를 위한 화면 잠금이다.
// 번호는 원문이 아니라 해시로만 비교한다.
import { LOCKS } from './config.js';
import { signOut, isDemo } from './backend.js';

const KIND = {
  // 검사 목록: 이 탭을 닫거나 로그아웃할 때까지 (최대 12시간)
  test: { store: () => sessionStorage, maxAge: 12 * 3600e3, idle: Infinity },
  // 검사 결과: 모든 탭이 함께 쓰고, 검사를 시작하거나 15분 동안 쓰지 않으면 다시 잠긴다
  result: { store: () => localStorage, maxAge: 12 * 3600e3, idle: 15 * 60e3 },
};
const COPY = {
  test: {
    title: (o) => (o.name ? `반갑습니다 ${o.name} 상담사님!` : '반갑습니다 상담사님!'),
    sub: '검사 코드를 입력하면 검사 목록이 열려요.',
    label: '검사 코드',
    links: [{ href: 'me.html', text: '검사 결과 보기' }],
  },
  result: {
    title: () => '검사 결과 잠금',
    sub: '결과를 보려면 잠금 번호를 입력해 주세요. 검사를 시작하거나 15분 동안 쓰지 않으면 다시 잠겨요.',
    label: '결과 잠금 번호',
    links: [{ href: 'index.html', text: '처음으로' }],
  },
};
const LEN = 4;
const MAX_FAILS = 5;
const COOLDOWN = 30e3;

// 체험 모드(?demo=1)는 이 기기 안의 연습용 기록만 쓰고 진짜 데이터에는 닿지 않는다.
//  - 체험 모드의 잠금은 진짜 번호와 비교하지 않고 0000으로만 열린다(잠금 화면에 적어 둔다).
//  - 열린 표시는 진짜 모드와 다른 칸(azit:demo:lock:*)에 적는다. 같은 칸을 쓰면 체험 모드에서 0000으로 연 뒤
//    진짜 모드로 돌아와도 열린 채로 남기 때문이다. 진짜 모드는 예전과 똑같다.
const DEMO_CODE = '0000';
const NS = isDemo ? 'azit:demo:lock' : 'azit:lock';
const key = (kind) => `${NS}:${kind}`;
const failKey = (kind) => `${NS}:fail:${kind}`;

function read(store, k) {
  try { return JSON.parse(store.getItem(k) || 'null'); } catch (e) { return null; }
}
function write(store, k, v) {
  try { if (v == null) store.removeItem(k); else store.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장소를 못 쓰면 매번 묻는다 */ }
}

export function isUnlocked(kind) {
  const k = KIND[kind];
  const s = read(k.store(), key(kind));
  if (!s) return false;
  const now = Date.now();
  return now - s.at < k.maxAge && now - s.seen < k.idle;
}

function touch(kind) {
  const k = KIND[kind];
  const s = read(k.store(), key(kind));
  if (s) { s.seen = Date.now(); write(k.store(), key(kind), s); }
}

function markUnlocked(kind) {
  const now = Date.now();
  write(KIND[kind].store(), key(kind), { at: now, seen: now });
  write(localStorage, failKey(kind), null);
}

export function relock(kind) { write(KIND[kind].store(), key(kind), null); }
export function relockAll() { Object.keys(KIND).forEach(relock); }

// 첫 화면이 잠금 화면보다 먼저 비치지 않도록 <html class="booting">을 걷어 낸다
export function reveal() { document.documentElement.classList.remove('booting'); }
setTimeout(reveal, 8000); // 어떤 이유로든 멈춰 있지 않게

async function digest(kind, code) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`azit-starmoon:${kind}:${code}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LOCK_SVG = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <path class="lock-shackle" d="M10.5 14.5v-3.6a5.5 5.5 0 0 1 11 0v3.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <rect x="6.5" y="14" width="19" height="13.5" rx="4.2" fill="currentColor"/>
  <path d="M16 17.4l.98 2.12 2.12.98-2.12.98L16 23.6l-.98-2.12-2.12-.98 2.12-.98z" fill="#f2b544"/>
</svg>`;
const DEL_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3 12z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>`;

let active = null; // 지금 떠 있는 잠금 화면

// 잠겨 있으면 잠금 화면을 띄우고, 번호가 맞으면 풀린다
export function requireUnlock(kind, opts = {}) {
  if (isUnlocked(kind)) {
    touch(kind);
    reveal();
    return Promise.resolve();
  }
  return showLock(kind, opts);
}

function showLock(kind, opts) {
  if (active) return active.promise;
  const copy = COPY[kind];
  let resolveFn;
  const promise = new Promise((r) => { resolveFn = r; });
  const root = document.createElement('div');
  root.className = 'lock sky';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'lock-title');
  root.setAttribute('aria-describedby', 'lock-sub');
  root.innerHTML = `<div class="lock-card">
      <div class="lock-mark">${LOCK_SVG}</div>
      <h1 class="lock-title" id="lock-title" tabindex="-1">${esc(copy.title(opts))}</h1>
      <p class="lock-sub" id="lock-sub">${esc(copy.sub)}${isDemo ? ` <strong class="lock-demo">체험 모드에서는 ${DEMO_CODE}을 누르면 열려요.</strong>` : ''}</p>
      <div class="lock-dots" data-dots aria-hidden="true">${'<i></i>'.repeat(LEN)}</div>
      <p class="lock-msg" data-msg role="status" aria-live="polite"></p>
      <span class="sr-only" data-count aria-live="polite"></span>
      <div class="keypad" role="group" aria-label="${esc(copy.label)} 입력">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-key="${n}">${n}</button>`).join('')}
        <span aria-hidden="true"></span>
        <button type="button" data-key="0">0</button>
        <button type="button" data-key="del" class="keypad-del" aria-label="한 자리 지우기">${DEL_SVG}</button>
      </div>
      <div class="lock-links">
        ${copy.links.map((l) => `<a href="${l.href}">${esc(l.text)}</a>`).join('')}
        <button type="button" data-lock-logout>로그아웃</button>
      </div>
    </div>
    <p class="lock-foot">AZIT : Star&amp;Moon</p>`;

  const dots = root.querySelector('[data-dots]');
  const msg = root.querySelector('[data-msg]');
  const count = root.querySelector('[data-count]');
  const keys = [...root.querySelectorAll('.keypad button')];
  let code = '';
  let busy = false;
  let timer = null;

  const paint = () => {
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i < code.length));
    count.textContent = code.length ? `${code.length}자리 입력` : '';
  };
  const setDisabled = (on) => keys.forEach((b) => { b.disabled = on; });

  const cooldownLeft = () => {
    const f = read(localStorage, failKey(kind));
    return f && f.until ? Math.max(0, f.until - Date.now()) : 0;
  };
  let cooling = false;
  const runCooldown = () => {
    const left = cooldownLeft();
    if (!left) {
      setDisabled(false);
      if (cooling) { cooling = false; msg.textContent = ''; } // 틀렸다는 안내는 다음 숫자를 누를 때까지 남겨 둔다
      return;
    }
    cooling = true;
    setDisabled(true);
    msg.textContent = `${MAX_FAILS}번 틀렸어요. ${Math.ceil(left / 1000)}초 뒤에 다시 입력할 수 있어요.`;
    clearTimeout(timer);
    timer = setTimeout(runCooldown, 1000);
  };

  async function submit() {
    busy = true;
    let ok = false;
    try {
      ok = isDemo ? code === DEMO_CODE : (await digest(kind, code)) === LOCKS[kind];
    } catch (e) {
      console.error(e);
      msg.textContent = '이 브라우저에서는 잠금을 풀 수 없어요. 크롬이나 사파리에서 https 주소로 열어 주세요.';
      busy = false;
      code = '';
      paint();
      return;
    }
    if (ok) {
      markUnlocked(kind);
      dots.classList.add('is-ok');
      root.classList.add('is-ok');
      msg.textContent = '';
      count.textContent = '잠금이 풀렸어요';
      setTimeout(close, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420);
      return;
    }
    const f = read(localStorage, failKey(kind)) || { n: 0 };
    f.n = (f.n || 0) + 1;
    if (f.n >= MAX_FAILS) { f.n = 0; f.until = Date.now() + COOLDOWN; }
    write(localStorage, failKey(kind), f);
    dots.classList.remove('is-error');
    void dots.offsetWidth; // 흔들림을 다시 재생
    dots.classList.add('is-error');
    msg.textContent = '번호가 맞지 않아요. 다시 입력해 주세요.';
    setTimeout(() => {
      code = '';
      dots.classList.remove('is-error');
      paint();
      busy = false;
      runCooldown();
    }, 520);
  }

  function press(k) {
    if (busy || cooldownLeft()) return;
    if (k === 'del') { code = code.slice(0, -1); paint(); return; }
    if (code.length >= LEN) return;
    if (msg.textContent && !cooldownLeft()) msg.textContent = '';
    code += k;
    paint();
    if (code.length === LEN) submit();
  }

  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      // 자판으로 입력할 때는 방금 누른 키패드 버튼에 포커스 테두리가 남지 않게 제목으로 옮긴다
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.keypad')) root.querySelector('#lock-title').focus({ preventScroll: true });
      press(e.key);
    }
    else if (e.key === 'Backspace') { e.preventDefault(); press('del'); }
  };

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-lock-logout')) {
      b.disabled = true;
      relockAll();
      try { await signOut(); } catch (err) { console.error(err); }
      location.href = 'login.html';
      return;
    }
    if (b.dataset.key) press(b.dataset.key);
  });

  // 뒤에 깔린 화면은 잠긴 동안 누르거나 읽을 수 없게 한다
  const muted = [...document.body.children].filter((el) => !el.hasAttribute('inert'));
  muted.forEach((el) => el.setAttribute('inert', ''));
  document.documentElement.classList.add('is-locked', 'lock-veil'); // 인쇄나 화면 확대로도 뒤 내용이 보이지 않게
  document.body.appendChild(root);
  document.addEventListener('keydown', onKey);
  reveal();
  root.querySelector('#lock-title').focus({ preventScroll: true });
  runCooldown();

  function close() {
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    muted.forEach((el) => el.removeAttribute('inert'));
    document.documentElement.classList.remove('is-locked', 'lock-veil');
    const done = () => { root.remove(); active = null; resolveFn(); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else { root.classList.add('is-leaving'); setTimeout(done, 200); }
  }

  active = { kind, promise };
  return promise;
}

// 결과 화면처럼 열린 뒤에도 지켜야 하는 곳: 오래 쓰지 않거나, 다른 탭에서 검사를 시작하거나,
// 뒤로 가기로 다시 돌아왔을 때 잠금 화면을 다시 띄운다.
export function watchLock(kind, opts = {}) {
  const check = () => { if (!active && !isUnlocked(kind)) showLock(kind, opts); };
  let last = 0;
  const activity = () => {
    const now = Date.now();
    if (now - last > 15e3 && !active && isUnlocked(kind)) { last = now; touch(kind); }
  };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, activity, { passive: true }));
  setInterval(check, 15e3);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('storage', (e) => { if (e.key === key(kind) || e.key === null) check(); });
  window.addEventListener('pagehide', () => document.documentElement.classList.add('lock-veil'));
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    if (isUnlocked(kind)) document.documentElement.classList.remove('lock-veil');
    else check();
  });
}
