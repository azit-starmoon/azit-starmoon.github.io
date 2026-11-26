// AZIT : Star&Moon — 신앙 애착 검사 정의
import { ITEMS, LIKERT_SCALE } from './items.js';
import { score as scoreAll } from './scoring.js';
import { STYLES } from './content.js';
import { renderReport } from './report.js';

export default {
  id: 'godattach',
  version: '1.0',
  title: '신앙 애착 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '하나님과의 관계를 애착의 눈으로 살펴보는 검사예요. 사람 사이에서처럼 하나님과의 관계에서도 버림받을까 걱정하는 마음(불안)과 가까워지기 어려운 마음(회피)이 있을 수 있어요. 두 마음의 정도로 지금 하나님과 어떤 거리에서 지내는지 보고, 더 편안히 머무는 길을 함께 찾아봐요. 하나님을 믿는 분을 위한 검사예요.',
    facts: [
      { dt: '문항', dd: `${ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 5분' },
      { dt: '구성', dd: '1부' },
    ],
    gets: ['애착 유형', '불안과 회피', '여덟 갈래', '사람과의 애착과 함께 보기', '믿음의 연습', '상담 메모'],
  },
  parts: [
    {
      id: 'god',
      kind: 'likert',
      title: '하나님과 나',
      short: '하나님과 나',
      summary: '하나님과의 관계에서 내 마음이 어떤지 답해요',
      desc: '요즘 하나님과의 관계를 떠올리며, 각 문장이 나와 얼마나 비슷한지 골라 주세요.',
      how: '바람직한 모습이 아니라 솔직한 지금의 마음을 골라 주세요. 정답은 없고, 어떤 답이든 지금의 관계를 비추는 거울일 뿐이에요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: ITEMS.length,
      scale: LIKERT_SCALE,
      items: ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${STYLES[s.style].name}: ${STYLES[s.style].title} (불안 ${s.an}, 회피 ${s.av})`,
  glyph: (s) => ({ secure: '안정', anxious: '불안', avoidant: '회피', fearful: '두려' }[s.style] || ''),
  render: renderReport,
};
