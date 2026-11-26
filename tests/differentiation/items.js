// AZIT : Star&Moon — 자아분화 검사 문항
// 바탕: Bowen 가족 체계 이론의 자아분화. Skowron과 Friedlander가 정리한 네 지표(내 입장 지키기, 감정 반응성,
// 감정적 단절, 타인과의 융합)의 구성 개념만 빌렸다. 문항은 모두 이 검사를 위해 새로 쓴 한국어 문장이다
// (DSI, DSS-R 등 원 척도의 문항을 옮기거나 번역하지 않았다). 가족 장면을 묻는 문항(family)을 아홉 개 넣었다.
// 지표마다 8문항(그중 2문항은 반대 방향). 같은 지표, 역문항, 가족 문항이 이어지지 않게 섞었다.

export const LIKERT_SCALE = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '아니다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
];

// dir: 'up'은 높을수록 분화된 쪽, 'down'은 낮을수록 분화된 쪽
export const FACETS = {
  ip: { name: '내 입장 지키기', dir: 'up', hint: '높을수록 단단해요' },
  er: { name: '감정 반응성', dir: 'down', hint: '낮을수록 여유로워요' },
  ec: { name: '감정적 단절', dir: 'down', hint: '낮을수록 이어져 있어요' },
  fo: { name: '타인과의 융합', dir: 'down', hint: '낮을수록 나로 서 있어요' },
};
export const FACET_ORDER = ['ip', 'er', 'ec', 'fo'];

export const ITEMS = [
  { id: 'er2', facet: 'er', text: "누군가의 말 한마디에 하루 기분이 크게 오르내린다." },
  { id: 'ec4', facet: 'ec', text: "힘든 일이 생기면 가족이나 가까운 사람에게 털어놓는다.", r: true, family: true },
  { id: 'er4', facet: 'er', text: "갈등이 생기면 상대보다 내가 먼저 크게 흥분한다." },
  { id: 'ip1', facet: 'ip', text: "가까운 사람이 반대해도, 깊이 생각해 정한 일이라면 내 뜻을 지킬 수 있다." },
  { id: 'er8', facet: 'er', text: "가족 이야기가 나오면 금세 예민해진다.", family: true },
  { id: 'fo2', facet: 'fo', text: "가까운 사람이 힘들어하면 내 일처럼 같이 무너진다." },
  { id: 'ec7', facet: 'ec', text: "가까운 사람과 서운한 일이 있어도 다시 이야기해서 관계를 이어 간다.", r: true },
  { id: 'fo6', facet: 'fo', text: "가족의 문제를 해결하는 것이 내 책임처럼 느껴진다.", family: true },
  { id: 'er5', facet: 'er', text: "다른 사람이 서운한 기색만 보여도 마음이 크게 흔들린다." },
  { id: 'ec5', facet: 'ec', text: "갈등을 푸느니 차라리 그 사람을 안 보는 쪽을 택한다." },
  { id: 'er3', facet: 'er', text: "가족과 부딪혀도 비교적 차분하게 대화를 이어 갈 수 있다.", r: true, family: true },
  { id: 'ip8', facet: 'ip', text: "다른 사람의 감정과 내 감정을 구분해서 볼 수 있다." },
  { id: 'ec1', facet: 'ec', text: "관계가 불편해지면 아예 거리를 두고 연락을 줄인다." },
  { id: 'fo1', facet: 'fo', text: "부모님이 실망하실까 봐 내가 원하는 결정을 미룬 적이 많다.", family: true },
  { id: 'ip7', facet: 'ip', text: "혼자서는 중요한 결정을 내리기가 어렵다.", r: true },
  { id: 'er1', facet: 'er', text: "가까운 사람과 다투면 감정이 한꺼번에 몰려와 생각이 멈춘다." },
  { id: 'ec8', facet: 'ec', text: "속마음을 보이면 약점이 될 것 같아 감춘다." },
  { id: 'fo4', facet: 'fo', text: "가족이 힘든 일을 겪어도 그것을 내가 다 떠안지는 않는다.", r: true, family: true },
  { id: 'ip3', facet: 'ip', text: "무엇이 나에게 중요한지 알고, 그에 맞게 선택한다." },
  { id: 'fo3', facet: 'fo', text: "다른 사람이 나를 인정해 주어야 마음이 놓인다." },
  { id: 'ip5', facet: 'ip', text: "가족이 기대하는 길과 내가 원하는 길이 다를 때, 내 길을 고를 수 있다.", family: true },
  { id: 'fo8', facet: 'fo', text: "가까운 사이라도 서로 다른 생각을 가질 수 있다고 편하게 받아들인다.", r: true },
  { id: 'ec3', facet: 'ec', text: "누군가 너무 가까워지면 숨이 막히는 것 같다." },
  { id: 'ip6', facet: 'ip', text: "비판을 받아도 그 말이 맞는지 스스로 따져 본다." },
  { id: 'ec2', facet: 'ec', text: "가족과 깊은 이야기를 나누는 것을 피하는 편이다.", family: true },
  { id: 'ip2', facet: 'ip', text: "다른 사람과 의견이 달라도 차분하게 내 생각을 말할 수 있다." },
  { id: 'fo5', facet: 'fo', text: "가까운 사람과 생각이 다르면 내가 맞추는 편이 마음 편하다." },
  { id: 'er7', facet: 'er', text: "감정이 크게 일어도 한발 물러서서 상황을 볼 수 있다.", r: true },
  { id: 'ec6', facet: 'ec', text: "가족 모임이 있으면 될 수 있는 대로 피하고 싶다.", family: true },
  { id: 'fo7', facet: 'fo', text: "중요한 사람의 기분이 내 기분을 좌우한다." },
  { id: 'ip4', facet: 'ip', text: "누군가 강하게 말하면 내 생각을 쉽게 접는다.", r: true },
  { id: 'er6', facet: 'er', text: "비난을 들으면 오랫동안 그 말이 머릿속을 떠나지 않는다." },
];
