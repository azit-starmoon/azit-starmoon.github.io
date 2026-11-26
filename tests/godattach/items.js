// AZIT : Star&Moon — 신앙 애착 검사 문항
// 바탕: 하나님과의 관계에도 사람 사이 애착의 두 축(버림받을 불안, 가까움을 피하는 회피)이 나타난다는 연구 흐름
// (Kirkpatrick의 애착 관점, Beck과 McDonald의 하나님 애착 구성 개념). 문항은 모두 이 검사를 위해 새로 쓴
// 한국어 문장이다(AGI 등 원 척도의 문항을 옮기거나 번역하지 않았다). 축마다 네 갈래 × 3문항(그중 1문항은 반대 방향).

export const LIKERT_SCALE = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '아니다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
];

export const DIMS = {
  an: { name: '불안', long: '하나님과의 관계에서 느끼는 불안' },
  av: { name: '회피', long: '하나님과 가까워지기를 피하는 마음' },
};
export const FACETS = {
  aban: { dim: 'an', name: '떠나실까 하는 걱정' },
  assure: { dim: 'an', name: '사랑을 확인하고 싶은 마음' },
  cond: { dim: 'an', name: '조건에 기대는 사랑' },
  hurt: { dim: 'an', name: '서운함과 원망' },
  dist: { dim: 'av', name: '거리 두기' },
  self: { dim: 'av', name: '혼자 해결하기' },
  closed: { dim: 'av', name: '마음 닫기' },
  duty: { dim: 'av', name: '의무로 지키는 신앙' },
};
export const FACET_ORDER = ['aban', 'assure', 'cond', 'hurt', 'dist', 'self', 'closed', 'duty'];

export const ITEMS = [
  { id: 'closed2', dim: 'av', facet: 'closed', text: "화나거나 실망한 마음은 하나님께 말하지 않는 편이다." },
  { id: 'dist1', dim: 'av', facet: 'dist', text: "하나님과 너무 가까워지는 것이 왠지 부담스럽다." },
  { id: 'aban3', dim: 'an', facet: 'aban', text: "내가 넘어져도 하나님은 나를 떠나지 않으신다고 믿는다.", r: true },
  { id: 'duty1', dim: 'av', facet: 'duty', text: "예배와 기도는 하지만 하나님과 개인적으로 가깝다고 느끼지는 않는다." },
  { id: 'hurt3', dim: 'an', facet: 'hurt', text: "기도가 내 뜻대로 되지 않아도 하나님을 신뢰하는 마음은 흔들리지 않는다.", r: true },
  { id: 'self1', dim: 'av', facet: 'self', text: "힘든 일은 하나님께 맡기기보다 내 힘으로 해결하는 편이다." },
  { id: 'cond2', dim: 'an', facet: 'cond', text: "실수한 날에는 하나님 앞에 나아가기가 두렵다." },
  { id: 'dist3', dim: 'av', facet: 'dist', text: "하나님과 가까이 지내는 시간이 나에게 쉼이 된다.", r: true },
  { id: 'closed1', dim: 'av', facet: 'closed', text: "기도할 때 내 진짜 감정은 잘 드러내지 않는다." },
  { id: 'aban1', dim: 'an', facet: 'aban', text: "내가 잘못하면 하나님이 나를 떠나실까 봐 두렵다." },
  { id: 'duty3', dim: 'av', facet: 'duty', text: "하나님을 마음을 나누는 가까운 분으로 느낀다.", r: true },
  { id: 'cond1', dim: 'an', facet: 'cond', text: "신앙생활을 잘해야 하나님이 나를 기뻐하신다고 느낀다." },
  { id: 'assure3', dim: 'an', facet: 'assure', text: "느낌이 없는 날에도 하나님의 사랑은 그대로라고 편안하게 믿는다.", r: true },
  { id: 'dist2', dim: 'av', facet: 'dist', text: "하나님 앞에서는 적당한 거리를 두는 편이 편하다." },
  { id: 'hurt1', dim: 'an', facet: 'hurt', text: "다른 사람들은 하나님께 더 사랑받는 것 같아 서운할 때가 있다." },
  { id: 'closed3', dim: 'av', facet: 'closed', text: "기쁜 일도 속상한 일도 하나님께 솔직하게 털어놓는다.", r: true },
  { id: 'self2', dim: 'av', facet: 'self', text: "하나님께 도움을 구하는 것이 나약해 보일까 봐 망설여진다." },
  { id: 'assure2', dim: 'an', facet: 'assure', text: "하나님의 사랑이 느껴지지 않는 날에는 마음이 크게 불안하다." },
  { id: 'cond3', dim: 'an', facet: 'cond', text: "부족한 모습 그대로도 하나님 앞에 설 수 있다고 느낀다.", r: true },
  { id: 'duty2', dim: 'av', facet: 'duty', text: "신앙은 나에게 관계라기보다 지켜야 할 의무에 가깝다." },
  { id: 'hurt2', dim: 'an', facet: 'hurt', text: "하나님이 내 기도에 침묵하시는 것 같아 원망스러울 때가 있다." },
  { id: 'self3', dim: 'av', facet: 'self', text: "어려움이 닥치면 자연스럽게 하나님께 먼저 기댄다.", r: true },
  { id: 'assure1', dim: 'an', facet: 'assure', text: "하나님이 나를 정말 사랑하시는지 자주 확인하고 싶어진다." },
  { id: 'aban2', dim: 'an', facet: 'aban', text: "기도가 오래 응답되지 않으면 하나님이 나를 잊으신 것 같다." },
];
