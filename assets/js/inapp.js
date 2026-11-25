// 카카오톡·인스타그램 같은 앱 안의 브라우저에서는 구글 로그인이 막힌다.
// 로그인이 필요한 순간에 바깥 브라우저로 옮겨 준다.

const UA = navigator.userAgent || '';

export const inApp = {
  kakao: /KAKAOTALK/i.test(UA),
  line: /\bLine\//i.test(UA),
  insta: /Instagram/i.test(UA),
  fb: /FBAN|FBAV|FB_IAB/i.test(UA),
  naver: /NAVER\(inapp|NAVER/i.test(UA) && /inapp/i.test(UA),
  band: /BAND\//i.test(UA),
  everytime: /everytimeApp/i.test(UA),
  generic: /; wv\)/i.test(UA),
};

export const isAndroid = /Android/i.test(UA);
export const isIOS = /iPhone|iPad|iPod/i.test(UA);

export function isInAppBrowser() {
  return Object.values(inApp).some(Boolean);
}

// true면 바깥 브라우저로 옮기는 중이다
export function escapeInApp() {
  const url = location.href;
  if (inApp.kakao) {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    return true;
  }
  if (inApp.line) {
    const u = new URL(url);
    u.searchParams.set('openExternalBrowser', '1');
    location.href = u.href;
    return true;
  }
  if (isAndroid) {
    const u = new URL(url);
    location.href = `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=https;package=com.android.chrome;end`;
    return true;
  }
  return false;
}
