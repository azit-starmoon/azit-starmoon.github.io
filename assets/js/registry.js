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
  { id: 'strengths', status: 'soon', title: '성격 강점', desc: '내가 가진 강점 24가지의 순위를 매겨요.' },
  { id: 'values', status: 'soon', title: '가치관', desc: '삶에서 무엇을 먼저 두는지 열 가지 가치로 봐요.' },
  { id: 'career', status: 'soon', title: '진로 흥미', desc: '어떤 종류의 일에 마음이 끌리는지 여섯 갈래로 봐요.' },
];

export function getTestMeta(id) {
  return TESTS.find((t) => t.id === id) || null;
}

export async function loadTest(id) {
  const meta = getTestMeta(id);
  if (!meta || meta.status !== 'open') return null;
  const mod = await import(new URL(`../../tests/${id}/index.js`, import.meta.url).href);
  return mod.default;
}
