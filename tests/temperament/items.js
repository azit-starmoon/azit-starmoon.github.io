// AZIT : Star&Moon — 기질과 성품 검사 문항
// 바탕: Cloninger의 심리생물학적 기질·성격 모델(구성 개념만 빌림).
//  기질 네 가지(자극 추구, 위험 회피, 사회적 민감성, 인내력): 어릴 때부터 드러나는 자동적인 반응 경향.
//  성품 세 가지(자율성, 연대감, 자기 초월): 경험과 성찰로 자라는 '나를 보는 방식'.
// 문항은 모두 이 검사를 위해 새로 쓴 한국어 문장이다(TCI 등 원 검사의 문항을 옮기거나 번역하지 않았다).
// 차원마다 8문항(그중 역문항 2), 같은 차원과 역문항이 이어지지 않게 섞었다.

export const LIKERT_SCALE = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '아니다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
];

export const GROUPS = {
  temp: { name: '기질', long: '타고난 기질', lead: '자극에 자동으로 반응하는 타고난 결' },
  char: { name: '성품', long: '자라 온 성품', lead: '경험과 성찰로 자라는 나를 보는 방식' },
};

export const DIMS = {
  ns: { name: '자극 추구', group: 'temp', short: '새로움' },
  ha: { name: '위험 회피', group: 'temp', short: '조심' },
  rd: { name: '사회적 민감성', group: 'temp', short: '정' },
  ps: { name: '인내력', group: 'temp', short: '끈기' },
  sd: { name: '자율성', group: 'char', short: '나를 세움' },
  co: { name: '연대감', group: 'char', short: '함께함' },
  st: { name: '자기 초월', group: 'char', short: '더 큰 뜻' },
};
export const TEMP_ORDER = ['ns', 'ha', 'rd', 'ps'];
export const CHAR_ORDER = ['sd', 'co', 'st'];
export const DIM_ORDER = [...TEMP_ORDER, ...CHAR_ORDER];

// 1부: 타고난 기질 32문항 (r: true는 반대 방향)
export const TEMP_ITEMS = [
  { id: 'ps5', dim: 'ps', facet: '목표', text: "지금보다 더 잘하고 싶다는 목표가 늘 있다." },
  { id: 'ha2', dim: 'ha', facet: '불확실', text: "앞일을 알 수 없어도 크게 걱정하지 않고 지낸다.", r: true },
  { id: 'ns5', dim: 'ns', facet: '아낌없음', text: "마음에 드는 것이 생기면 돈이나 시간을 아끼지 않는다." },
  { id: 'ps3', dim: 'ps', facet: '끈기', text: "피곤해도 시작한 일은 끝을 보려고 한다." },
  { id: 'ha6', dim: 'ha', facet: '쉽게 지침', text: "남들보다 쉽게 지치는 편이다." },
  { id: 'ps2', dim: 'ps', facet: '끈기', text: "일이 어려워지면 금방 의욕이 꺾여 손을 놓는다.", r: true },
  { id: 'rd2', dim: 'rd', facet: '감수성', text: "영화나 노래에 마음이 움직여 눈물이 날 때가 있다." },
  { id: 'ns3', dim: 'ns', facet: '즉흥', text: "마음이 끌리면 깊이 따지기 전에 일단 해 보는 편이다." },
  { id: 'rd3', dim: 'rd', facet: '마음 열기', text: "가까운 사람에게는 내 마음을 솔직하게 털어놓는다." },
  { id: 'ps4', dim: 'ps', facet: '끈기', text: "다른 사람들이 그만둘 때에도 조금 더 해 보는 편이다." },
  { id: 'ns8', dim: 'ns', facet: '자유로움', text: "규칙이 너무 많은 곳에 있으면 답답해서 벗어나고 싶어진다." },
  { id: 'ha5', dim: 'ha', facet: '낯가림', text: "낯선 사람들 사이에서도 금방 편하게 어울린다.", r: true },
  { id: 'ns1', dim: 'ns', facet: '탐색', text: "처음 가 보는 곳이나 처음 해 보는 일에 마음이 설렌다." },
  { id: 'rd7', dim: 'rd', facet: '지지', text: "주변 사람이 격려해 주면 훨씬 힘을 내서 하게 된다." },
  { id: 'ha3', dim: 'ha', facet: '불확실', text: "결과를 알 수 없는 일은 시작하기 전부터 마음이 무겁다." },
  { id: 'ps6', dim: 'ps', facet: '목표', text: "적당히 해도 된다면 굳이 더 애쓰지 않는다.", r: true },
  { id: 'rd8', dim: 'rd', facet: '지지', text: "가까운 사람이 나를 서운하게 대하면 그 일이 오래 마음에 남는다." },
  { id: 'ns6', dim: 'ns', facet: '지루함', text: "같은 일이 반복되면 금방 지루해져서 새로운 재미를 찾는다." },
  { id: 'ps8', dim: 'ps', facet: '성취', text: "한번 세운 목표는 시간이 걸려도 이루어 낸다." },
  { id: 'ns4', dim: 'ns', facet: '즉흥', text: "무언가를 결정하기 전에 오래 생각하고 비교해 본다.", r: true },
  { id: 'ha1', dim: 'ha', facet: '걱정', text: "일이 잘못될 경우를 미리 떠올리며 걱정하는 편이다." },
  { id: 'ns7', dim: 'ns', facet: '자유로움', text: "정해진 계획보다 그때그때 마음 가는 대로 움직이는 게 좋다." },
  { id: 'ps7', dim: 'ps', facet: '꼼꼼함', text: "작은 부분까지 제대로 되어야 마음이 놓인다." },
  { id: 'rd6', dim: 'rd', facet: '친밀함', text: "오랫동안 혼자 지내도 외롭다는 생각이 별로 들지 않는다.", r: true },
  { id: 'ha8', dim: 'ha', facet: '걱정', text: "작은 실수에도 '큰일이 나면 어쩌지' 하는 생각이 든다." },
  { id: 'rd1', dim: 'rd', facet: '감수성', text: "다른 사람의 힘든 이야기를 들으면 내 마음도 쉽게 움직인다." },
  { id: 'ha7', dim: 'ha', facet: '조심', text: "위험해 보이는 일은 재미있어 보여도 하지 않는다." },
  { id: 'rd4', dim: 'rd', facet: '마음 열기', text: "내 감정을 다른 사람에게 드러내는 것이 불편하다.", r: true },
  { id: 'ps1', dim: 'ps', facet: '열의', text: "당장 보상이 없어도 해야 할 일은 꾸준히 해 나간다." },
  { id: 'ha4', dim: 'ha', facet: '낯가림', text: "처음 만나는 사람 앞에서는 긴장해서 말수가 줄어든다." },
  { id: 'rd5', dim: 'rd', facet: '친밀함', text: "마음이 통하는 사람과 함께 있을 때 가장 힘이 난다." },
  { id: 'ns2', dim: 'ns', facet: '탐색', text: "익숙한 방식이 편해서 새로운 시도는 잘 하지 않는다.", r: true },
];

// 2부: 자라 온 성품 24문항
export const CHAR_ITEMS = [
  { id: 'sd7', dim: 'sd', facet: '습관', text: "고치고 싶은 습관이 있으면 실제로 조금씩 바꿔 간다." },
  { id: 'st5', dim: 'st', facet: '영성', text: "눈에 보이고 증명되는 것만 믿는 편이다.", r: true },
  { id: 'co8', dim: 'co', facet: '선의', text: "다른 사람이 잘되면 진심으로 함께 기뻐한다." },
  { id: 'sd8', dim: 'sd', facet: '기준', text: "다른 사람의 기대보다 내가 중요하게 여기는 기준을 따라 결정한다." },
  { id: 'st3', dim: 'st', facet: '영성', text: "눈에 보이지 않아도 분명히 존재하는 것이 있다고 믿는다." },
  { id: 'co2', dim: 'co', facet: '수용', text: "나와 맞지 않는 사람은 굳이 이해하려고 하지 않는다.", r: true },
  { id: 'st4', dim: 'st', facet: '뜻', text: "내 삶에는 나 혼자 세운 계획보다 더 큰 뜻이 있다고 느낀다." },
  { id: 'sd6', dim: 'sd', facet: '자기 수용', text: "나의 부족한 점도 나의 한 부분으로 받아들인다." },
  { id: 'co3', dim: 'co', facet: '공감', text: "상대의 입장이 되어 그 마음을 헤아려 보려고 한다." },
  { id: 'st8', dim: 'st', facet: '의미', text: "삶의 의미나 영적인 것에 대해서는 별로 생각해 보지 않는다.", r: true },
  { id: 'sd5', dim: 'sd', facet: '해결', text: "어려운 문제가 생겨도 스스로 방법을 찾아낼 수 있다고 믿는다." },
  { id: 'st2', dim: 'st', facet: '연결', text: "자연 속에 있으면 내가 더 큰 무언가의 일부라고 느낀다." },
  { id: 'co7', dim: 'co', facet: '공정', text: "나에게만 유리한 쪽보다 모두에게 공평한 쪽을 고른다." },
  { id: 'sd2', dim: 'sd', facet: '책임', text: "일이 잘못되면 상황이나 다른 사람 탓이라는 생각이 먼저 든다.", r: true },
  { id: 'st1', dim: 'st', facet: '몰입', text: "좋아하는 일에 깊이 빠지면 시간 가는 줄 모른다." },
  { id: 'co4', dim: 'co', facet: '도움', text: "조금 손해를 보더라도 다른 사람을 돕는 것이 기쁘다." },
  { id: 'st7', dim: 'st', facet: '보탬', text: "세상을 조금이라도 낫게 하는 일에 내 힘을 보태고 싶다." },
  { id: 'co1', dim: 'co', facet: '수용', text: "나와 생각이 다른 사람에게도 그럴 만한 이유가 있다고 본다." },
  { id: 'sd3', dim: 'sd', facet: '목적', text: "내가 무엇을 향해 살아가는지 분명하게 알고 있다." },
  { id: 'co5', dim: 'co', facet: '너그러움', text: "나에게 상처 준 사람은 오래도록 용서하기 어렵다.", r: true },
  { id: 'st6', dim: 'st', facet: '경이', text: "밤하늘이나 넓은 풍경 앞에서 경이로움을 느낀다." },
  { id: 'sd1', dim: 'sd', facet: '책임', text: "지금 내 삶의 모습은 대부분 내가 해 온 선택의 결과라고 생각한다." },
  { id: 'co6', dim: 'co', facet: '너그러움', text: "누군가 실수해도 다시 기회를 주려고 한다." },
  { id: 'sd4', dim: 'sd', facet: '목적', text: "무엇을 원하는지 몰라 이리저리 흔들릴 때가 많다.", r: true },
];
