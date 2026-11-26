// AZIT : Star&Moon — 검사 목록
// 새 검사를 추가할 때: tests/<id>/index.js 를 만들고 여기 status 를 'open' 으로 바꾼다.

export const TESTS = [
  {
    id: 'enneagram',
    status: 'open',
    title: '한국형 성향검사',
    desc: '나를 움직이는 핵심 동기와 두려움, 성장 방향을 아홉 가지 유형으로 읽어요.',
    items: 117,
    minutes: 15,
    parts: 3,
    gets: ['핵심 유형', '날개', '트라이타입', '본능과 하위유형', '성장과 스트레스', '관계와 일'],
  },
  {
    id: 'bigfive',
    status: 'open',
    title: '빅파이브 성격검사',
    desc: '성격을 이루는 다섯 영역과 하위 요인 30개로, 나라는 별의 모양을 그려요.',
    items: 120,
    minutes: 12,
    parts: 2,
    gets: ['다섯 영역 점수', '하위 요인 30개', '스타일 10가지', '관계와 일', '성장 제안'],
  },
  {
    id: 'attachment',
    status: 'open',
    title: '애착 유형 검사',
    desc: '가까운 사람 앞에서 나는 어떻게 되는지, 불안과 회피 두 축으로 읽고 관계마다 따로 지도를 그려요.',
    items: 60,
    minutes: 10,
    parts: 2,
    gets: ['애착 유형', '불안과 회피', '하위 요인 8가지', '관계별 지도', '성장 방향', '상담 메모'],
  },
  {
    id: 'schema',
    status: 'open',
    title: '삶의 규칙 검사',
    desc: '어린 시절 마음을 지키려고 만들어진 18가지 규칙이 지금 얼마나 작동하는지, 건드려질 때 어떻게 대처하는지 살펴요.',
    items: 96,
    minutes: 15,
    parts: 3,
    gets: ['18가지 규칙 지도', '다섯 영역', '작동하는 규칙 자세히', '대처 방식', '상담 메모'],
  },
  {
    id: 'hsp',
    status: 'open',
    title: '초민감성 검사',
    desc: '소리, 빛, 사람의 감정 같은 자극을 얼마나 섬세하게 받아들이는지 네 갈래로 보고, 요즘 그 섬세함이 지쳐 있는지도 살펴요.',
    items: 52,
    minutes: 8,
    parts: 2,
    gets: ['민감성 점수', '네 갈래 프로필', '섬세함의 힘과 무게', '요즘 상태 지도', '맞는 환경', '상담 메모'],
  },
  {
    id: 'strengths',
    status: 'open',
    title: '성격 강점 검사',
    desc: '내가 이미 가진 좋은 힘 24가지의 순위를 세우고, 가장 나다운 대표 강점 다섯 가지와 쓰는 법을 찾아요.',
    items: 96,
    minutes: 13,
    parts: 2,
    gets: ['24강점 순위', '대표 강점 5개', '여섯 덕목 지도', '강점 쓰는 법', '균형 잡기', '상담 메모'],
  },
  {
    id: 'values',
    status: 'open',
    title: '가치관 검사',
    desc: '삶에서 무엇을 먼저 두는지 열 가지 가치의 순위로 보고, 가치들이 모인 방향과 서로 당기는 가치를 살펴요.',
    items: 40,
    minutes: 7,
    parts: 1,
    gets: ['열 가치 순위', '핵심 가치 3개', '가치 원형', '네 방향과 두 축', '가치 갈등', '상담 메모'],
  },
  {
    id: 'career',
    status: 'open',
    title: '진로 흥미 검사',
    desc: '어떤 종류의 일에 마음이 끌리는지 여섯 흥미로 보고, 세 글자 흥미 코드와 어울리는 직업을 찾아요.',
    items: 60,
    minutes: 9,
    parts: 2,
    gets: ['흥미 코드 3글자', '흥미 육각형', '일관도와 변별도', '직업 예시', '탐색 실천', '상담 메모'],
  },
  {
    id: 'emotion',
    status: 'open',
    title: '감정 조절 검사',
    desc: '감정을 알아차리고, 이해하고, 받아들이고, 다스리는 힘을 여섯 갈래로 보고, 힘들 때 자주 쓰는 조절 전략도 살펴요.',
    items: 54,
    minutes: 8,
    parts: 2,
    gets: ['감정을 다루는 힘', '여섯 갈래 육각형', '강점과 키울 점', '조절 전략 구성', '감정이 몰려올 때', '상담 메모'],
  },
  {
    id: 'coping',
    status: 'open',
    title: '스트레스 대처 검사',
    desc: '힘든 일이 생겼을 때 주로 쓰는 여덟 가지 대처와 그 균형, 그리고 상황에 맞게 대처를 바꾸는 힘을 살펴요.',
    items: 46,
    minutes: 8,
    parts: 2,
    gets: ['여덟 가지 대처', '대처 꽃잎', '대처 스타일', '상황에 맞추기', '키우는 연습', '상담 메모'],
  },
  {
    id: 'resilience',
    status: 'open',
    title: '회복탄력성 검사',
    desc: '어려움에서 다시 일어나는 힘을 자기 조절력, 대인 관계력, 긍정성의 아홉 요인으로 살펴요.',
    items: 45,
    minutes: 7,
    parts: 1,
    gets: ['회복탄력성 점수', '세 영역', '아홉 요인 지도', '기대는 곳', '키우는 연습', '상담 메모'],
  },
  {
    id: 'esteem',
    status: 'open',
    title: '자존감 검사',
    desc: '나를 얼마나 가치 있게 여기는지, 힘들 때 나를 어떻게 대하는지, 그 믿음이 어떤 조건에 기대는지 살펴요.',
    items: 46,
    minutes: 8,
    parts: 3,
    gets: ['자기 가치감', '자존감 지도', '나를 대하는 방식', '자존감이 기대는 곳', '돌보는 연습', '상담 메모'],
  },
];

// 첫 화면과 결과 목록에서 검사를 묶어 보여 주는 분류. 새 검사는 알맞은 묶음의 tests에 id를 넣는다.
// 어느 묶음에도 없는 열린 검사는 '그 밖의 검사'로 따로 보인다.
export const GROUPS = [
  { id: 'self', name: '성격과 기질', question: '나는 어떤 사람일까', desc: '타고난 기질과 성격의 결을 살펴요.', tests: ['enneagram', 'bigfive', 'hsp'] },
  { id: 'mind', name: '마음 건강', question: '요즘 내 마음은 괜찮을까', desc: '나를 대하는 마음과 감정, 스트레스를 다루는 힘을 살펴요.', tests: ['esteem', 'emotion', 'coping', 'resilience'] },
  { id: 'relation', name: '관계와 내면', question: '관계 속 나는 왜 그럴까', desc: '가까운 관계에서의 모습과 마음 깊이 자리 잡은 규칙을 살펴요.', tests: ['attachment', 'schema'] },
  { id: 'growth', name: '강점과 진로', question: '무엇을 향해 나아갈까', desc: '내가 가진 힘과 중요하게 여기는 것, 마음이 끌리는 일을 살펴요.', tests: ['strengths', 'values', 'career'] },
];
const OTHER = { id: 'other', name: '그 밖의 검사', question: '', desc: '', tests: [] };

export function groupOf(id) {
  return GROUPS.find((g) => g.tests.includes(id)) || OTHER;
}

// ids(검사 id 목록)를 묶음 차례대로 나눈다. 빈 묶음은 빼고, 묶음 안에서는 GROUPS에 적은 차례를 따른다.
export function groupIds(ids) {
  const set = new Set(ids);
  const out = GROUPS.map((g) => ({ ...g, tests: g.tests.filter((t) => set.has(t)) })).filter((g) => g.tests.length);
  const rest = ids.filter((t) => !GROUPS.some((g) => g.tests.includes(t)));
  if (rest.length) out.push({ ...OTHER, tests: rest });
  return out;
}

export function getTestMeta(id) {
  return TESTS.find((t) => t.id === id) || null;
}

export async function loadTest(id) {
  const meta = getTestMeta(id);
  if (!meta || meta.status !== 'open') return null;
  const mod = await import(new URL(`../../tests/${id}/index.js`, import.meta.url).href);
  return mod.default;
}
