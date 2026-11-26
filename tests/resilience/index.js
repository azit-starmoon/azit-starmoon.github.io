// AZIT : Star&Moon — 회복탄력성 검사 정의
import { ITEMS, LIKERT_SCALE, FACTORS } from './items.js';
import { score as scoreAll } from './scoring.js';
import { OVERALL } from './content.js';
import { renderReport } from './report.js';

export default {
  id: 'resilience',
  version: '1.0',
  title: '회복탄력성 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '어려운 일을 겪은 뒤 다시 일어나는 힘을 살펴보는 검사예요. 흔들려도 나를 다잡는 힘, 사람과 이어져 함께 버티는 힘, 다시 해 볼 마음을 채우는 힘을 아홉 가지로 나눠 보고, 지금 어디에 기대고 있는지와 어떻게 키울 수 있는지 함께 봐요.',
    facts: [
      { dt: '문항', dd: `${ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 7분' },
      { dt: '구성', dd: '1부' },
    ],
    gets: ['회복탄력성 점수', '세 영역', '아홉 요인 지도', '기대는 곳', '키우는 연습', '상담 메모'],
  },
  parts: [
    {
      id: 'res',
      kind: 'likert',
      title: '다시 일어나는 힘',
      short: '회복탄력성',
      summary: '어려움을 겪을 때와 평소의 내 모습을 답해요',
      desc: '요즘 몇 달 동안의 나를 떠올리며, 각 문장이 나와 얼마나 비슷한지 골라 주세요.',
      how: '되고 싶은 모습이 아니라 실제 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: ITEMS.length,
      scale: LIKERT_SCALE,
      items: ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${OVERALL[s.level].title} (회복탄력성 ${s.total}, 가장 높은 요인: ${FACTORS[s.order[0]].name})`,
  glyph: (s) => String(Math.min(99, s.total)),
  render: renderReport,
};
