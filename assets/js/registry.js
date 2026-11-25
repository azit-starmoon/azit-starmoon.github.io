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
  { id: 'schema', status: 'soon', title: '삶의 규칙(도식)', desc: '어릴 때 굳어진 마음의 규칙 18가지를 살펴요.' },
  { id: 'attachment', status: 'soon', title: '애착 유형', desc: '관계 전반과 특정 인물과의 애착을 따로 봐요.' },
  { id: 'hsp', status: 'soon', title: '초민감성', desc: '자극과 감정에 얼마나 섬세하게 반응하는지 봐요.' },
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
