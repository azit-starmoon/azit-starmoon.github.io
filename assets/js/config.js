// AZIT : Star&Moon — 사이트 설정
// FIREBASE 값을 null로 바꾸면, 로그인과 저장이 이 기기 안에서만 동작하는 체험 모드가 된다.

export const SITE = {
  name: 'AZIT : Star&Moon',
  shortName: 'AZIT',
  tagline: '마음의 지도를 그려 보는 작은 검사실',
};

export const FIREBASE = {
  apiKey: 'AIzaSyBWIV1WQRooKiCzJrUgoqOeWSPU6B49FsA',
  authDomain: 'azit-starmoon.firebaseapp.com',
  databaseURL: 'https://azit-starmoon-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'azit-starmoon',
  storageBucket: 'azit-starmoon.firebasestorage.app',
  messagingSenderId: '39192132137',
  appId: '1:39192132137:web:b08cb699b667e639f4fa38',
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.0/';

// 화면 잠금 번호. 번호 그대로가 아니라 'azit-starmoon:<종류>:<번호>'의 SHA-256 값만 둔다.
// test: 검사 목록을 열 때, result: 검사 결과와 관리 화면을 열 때. 바꾸는 법은 README의 '화면 잠금'에 있어요.
export const LOCKS = {
  test: 'a5e9a9b13a9f13abeff52c0b11f921f4f01b7704445db01bc1ca0109cb5088b9',
  result: '2e47771646bdd028ce2e07a14ca12109fbf366873fcf2e8133be925a22f1a996',
};
