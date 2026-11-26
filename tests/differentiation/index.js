// AZIT : Star&Moon — 자아분화 검사 정의
import { ITEMS, LIKERT_SCALE } from './items.js';
import { score as scoreAll } from './scoring.js';
import { OVERALL, STYLES } from './content.js';
import { renderReport } from './report.js';

export default {
  id: 'differentiation',
  version: '1.0',
  title: '자아분화 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '가족과 가까운 사람들 사이에서 얼마나 나로 서 있는지 살펴보는 검사예요. 가까운 관계 안에서도 내 생각과 감정을 지키는 힘, 긴장될 때 감정이 휩쓸리는 정도, 거리를 두거나 지나치게 붙는 방식을 네 지표로 보고, 가족 장면에서 내가 어떻게 움직이는지 함께 봐요.',
    facts: [
      { dt: '문항', dd: `${ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 6분' },
      { dt: '구성', dd: '1부' },
    ],
    gets: ['분화 지수', '네 지표', '관계 방식', '가족 장면', '나로 서는 연습', '상담 메모'],
  },
  parts: [
    {
      id: 'dos',
      kind: 'likert',
      title: '가족과 가까운 관계 속의 나',
      short: '분화',
      summary: '가족과 가까운 사람들 사이에서의 내 모습을 답해요',
      desc: '가족, 연인, 가까운 친구와의 관계에서 평소의 나를 떠올리며 답해 주세요.',
      how: '되고 싶은 모습이 아니라 실제 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: ITEMS.length,
      scale: LIKERT_SCALE,
      items: ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${OVERALL[s.level].title} (분화 지수 ${s.total}, 관계 방식: ${STYLES[s.style].short})`,
  glyph: (s) => String(Math.min(99, s.total)),
  render: renderReport,
};
