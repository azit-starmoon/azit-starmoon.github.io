// AZIT : Star&Moon — 화면 공통 요소
import { SITE } from './config.js';
import { ready, onUser, signIn, signOut, isAdmin, isDemo, currentUser, listRequests } from './backend.js';
import { relockAll } from './lock.js';
import { isInAppBrowser, escapeInApp, isIOS } from './inapp.js';
import { watchForUpdate } from './update.js';

if (typeof window !== 'undefined') watchForUpdate();

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let markSeq = 0;
export function brandMark(cls = 'brand-mark') {
  const id = `bm${++markSeq}`;
  return `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true"><defs><mask id="${id}"><rect width="32" height="32" fill="#fff"/><circle cx="19.5" cy="11.5" r="9.5" fill="#000"/></mask></defs><circle cx="14" cy="17" r="11" fill="currentColor" mask="url(#${id})"/><path d="M25 3.5l1.15 3.35 3.35 1.15-3.35 1.15L25 12.5l-1.15-3.35L20.5 8l3.35-1.15z" fill="#f2b544"/></svg>`;
}

export function brandHTML() {
  return `${brandMark()}<span class="brand-word">AZIT</span><span class="brand-colon">:</span><span class="brand-sub">Star&amp;Moon</span>`;
}

export function fmtDate(ts, withTime = false) {
  if (!ts) return '';
  const d = new Date(ts);
  const base = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  if (!withTime) return base;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${base} ${hh}:${mm}`;
}

export function shortDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function resultCode(rid) {
  return String(rid || '').replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase();
}

// ── 토스트 ───────────────────────────────────────
let toastEl;
let toastTimer;
export function toast(msg, ms = 2600) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.dataset.show = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.dataset.show = 'false'), ms);
}

// ── 모달 ─────────────────────────────────────────
export function modal({ title, body = '', actions = [{ label: '확인', value: true, primary: true }], onOpen } = {}) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">${esc(title)}</h2>
      <div class="modal-body">${body}</div>
      <div class="modal-actions">${actions
        .map((a, i) => `<button type="button" class="btn ${a.primary ? '' : 'btn--ghost'} ${a.danger ? 'btn--danger' : ''} btn--small" data-i="${i}">${esc(a.label)}</button>`)
        .join('')}</div>
    </div>`;
    const prevFocus = document.activeElement;
    const close = (value) => {
      document.removeEventListener('keydown', onKey);
      back.remove();
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(undefined); };
    back.addEventListener('click', (e) => {
      if (e.target === back) close(undefined);
      const b = e.target.closest('[data-i]');
      if (b) close(actions[Number(b.dataset.i)].value);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    const primary = back.querySelector('.modal-actions .btn:not(.btn--ghost)') || back.querySelector('.modal-actions .btn');
    if (primary) primary.focus();
    if (onOpen) onOpen(back);
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  }
}

export async function showLinkModal(title, url, note = '') {
  return modal({
    title,
    body: `${note ? `<p>${note}</p>` : ''}<div class="copy-row"><input class="input" readonly value="${esc(url)}" aria-label="링크"><button type="button" class="btn btn--small" data-copy>복사</button></div>`,
    actions: [{ label: '닫기', value: true, primary: false }],
    onOpen: (root) => {
      const input = root.querySelector('input');
      input.addEventListener('focus', () => input.select());
      root.querySelector('[data-copy]').addEventListener('click', async () => {
        const ok = await copyText(url);
        toast(ok ? '링크를 복사했어요.' : '복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.');
      });
    },
  });
}

// ── 로그인 흐름 ─────────────────────────────────
export async function login() {
  if (!isDemo && isInAppBrowser()) {
    if (escapeInApp()) return null;
    await modal({
      title: '다른 브라우저에서 열어 주세요',
      body: `<p>지금 보고 있는 앱 안의 브라우저에서는 구글 로그인이 막혀 있어요. ${
        isIOS ? '오른쪽 아래(또는 위) 메뉴에서 <strong>Safari로 열기</strong>를 누르거나,' : '메뉴에서 <strong>다른 브라우저로 열기</strong>를 누르거나,'
      } 아래 링크를 복사해서 브라우저 주소창에 붙여 넣어 주세요.</p><div class="copy-row"><input class="input" readonly value="${esc(location.href)}" aria-label="현재 페이지 링크"><button type="button" class="btn btn--small" data-copy>복사</button></div>`,
      actions: [{ label: '닫기', value: true }],
      onOpen: (root) => {
        root.querySelector('[data-copy]').addEventListener('click', async () => {
          const ok = await copyText(location.href);
          toast(ok ? '링크를 복사했어요.' : '링크를 길게 눌러 복사해 주세요.');
        });
      },
    });
    return null;
  }
  try {
    return await signIn();
  } catch (e) {
    console.error(e);
    const msg = e && e.code === 'auth/unauthorized-domain'
      ? 'Firebase 설정에서 이 사이트 주소가 아직 허용되지 않았어요. 관리자에게 알려 주세요.'
      : '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
    toast(msg);
    return null;
  }
}

const googleIcon = `<svg class="g-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

export function googleButton(label = '구글로 로그인', cls = 'btn') {
  return `<button type="button" class="${cls}" data-login>${googleIcon}<span>${esc(label)}</span></button>`;
}

// ── 헤더 ─────────────────────────────────────────
// 관리 메뉴 옆 승인 요청 수. 관리 페이지에서 승인하거나 거절하면 바로 다시 맞춘다.
export function setRequestBadge(n) {
  const badge = document.querySelector('[data-req-badge]');
  if (!badge) return;
  badge.textContent = String(n);
  badge.hidden = !n;
  badge.setAttribute('aria-label', `승인 요청 ${n}건`);
}

export function mountHeader(active = '') {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `<div class="wrap header-inner">
    <a class="brand" href="index.html" aria-label="${esc(SITE.name)} 처음으로">${brandHTML()}</a>
    <nav class="site-nav" aria-label="주 메뉴">
      <a href="index.html" data-member-link hidden ${active === 'home' ? 'aria-current="page"' : ''}>검사</a>
      <a href="me.html" data-member-link hidden ${active === 'me' ? 'aria-current="page"' : ''}>검사 결과</a>
      <a href="admin.html" data-admin-link hidden ${active === 'admin' ? 'aria-current="page"' : ''}>관리<span class="nav-badge" data-req-badge hidden></span></a>
    </nav>
    <div class="account" data-account></div>
  </div>`;
  document.body.prepend(header);
  if (isDemo) {
    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.textContent = '체험 모드예요. 로그인과 결과가 이 기기 안에만 저장돼요.';
    header.after(bar);
  }
  const acc = header.querySelector('[data-account]');
  const adminLink = header.querySelector('[data-admin-link]');

  const memberLinks = header.querySelectorAll('[data-member-link]');
  onUser(async (u) => {
    if (!u) {
      acc.innerHTML = `<a class="btn btn--ghost" href="login.html">로그인</a>`;
      adminLink.hidden = true;
      memberLinks.forEach((a) => (a.hidden = true));
      return;
    }
    memberLinks.forEach((a) => (a.hidden = false));
    const initial = esc((u.name || '?').trim().charAt(0));
    acc.innerHTML = `<button type="button" class="avatar-btn" aria-haspopup="true" aria-expanded="false" aria-label="${esc(u.name)} 계정 메뉴">${
      u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : initial
    }</button>
    <div class="account-menu" data-open="false">
      <div class="who"><strong>${esc(u.name)}</strong><span>${esc(u.email)}</span></div>
      <a href="me.html">검사 결과</a>
      <a href="admin.html" data-admin-item hidden>관리</a>
      <button type="button" data-logout>로그아웃</button>
    </div>`;
    const btn = acc.querySelector('.avatar-btn');
    const menu = acc.querySelector('.account-menu');
    btn.addEventListener('click', () => {
      const open = menu.dataset.open !== 'true';
      menu.dataset.open = String(open);
      btn.setAttribute('aria-expanded', String(open));
    });
    acc.querySelector('[data-logout]').addEventListener('click', async () => {
      relockAll();
      await signOut();
      location.href = 'login.html';
    });
    const admin = await isAdmin();
    adminLink.hidden = !admin;
    const item = acc.querySelector('[data-admin-item]');
    if (item) item.hidden = !admin;
    if (admin) {
      try { setRequestBadge(Object.keys(await listRequests()).length); } catch (e) { /* 요청 목록을 못 읽어도 헤더는 그대로 */ }
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-account]')) return;
    const menu = acc.querySelector('.account-menu');
    const btn = acc.querySelector('.avatar-btn');
    if (menu && menu.dataset.open === 'true') {
      menu.dataset.open = 'false';
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const menu = acc.querySelector('.account-menu');
    if (menu) menu.dataset.open = 'false';
  });

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-login]');
    if (!b) return;
    e.preventDefault();
    b.disabled = true;
    await login();
    b.disabled = false;
  });

  ready().catch((e) => {
    console.error(e);
    toast('서버에 연결하지 못했어요. 새로고침해 주세요.');
  });
  return header;
}

export function mountFooter() {
  const f = document.createElement('footer');
  f.className = 'site-footer';
  f.innerHTML = `<div class="wrap"><a class="brand" href="index.html">${brandHTML()}</a><p style="margin-top:10px">${esc(SITE.tagline)}</p></div>`;
  document.body.appendChild(f);
}

export function waitForUser() {
  return new Promise((resolve) => {
    ready().then(() => resolve(currentUser()));
  });
}
