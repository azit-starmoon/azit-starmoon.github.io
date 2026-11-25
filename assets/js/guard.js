// AZIT : Star&Moon — 페이지 출입 확인
// 승인된 상담사(또는 관리자)만 들어올 수 있고, 아니면 로그인 페이지로 보낸다.
import { ready, accessStatus, onUser } from './backend.js';

export function loginUrl() {
  const here = (location.pathname.split('/').pop() || 'index.html') + location.search;
  return `login.html?next=${encodeURIComponent(here)}`;
}

function watchLogout() {
  onUser((u) => { if (u === null) location.replace('login.html'); });
}

export async function requireApproved() {
  await ready();
  const st = await accessStatus();
  if (!st.user || !st.approved) {
    location.replace(loginUrl());
    return null;
  }
  watchLogout();
  return st;
}

export async function requireLogin() {
  await ready();
  const st = await accessStatus();
  if (!st.user) {
    location.replace(loginUrl());
    return null;
  }
  watchLogout();
  return st;
}
