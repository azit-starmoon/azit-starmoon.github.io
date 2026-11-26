// AZIT : Star&Moon — 자아존중감 검사 정의
import { WORTH_ITEMS, SELF_ITEMS, BASE_ITEMS, LIKERT_SCALE } from './items.js';
import { score as scoreAll } from './scoring.js';
import { TYPES } from './content.js';
import { renderReport } from './report.js';

const how = '되고 싶은 모습이 아니라 요즘의 솔직한 내 마음을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.';

export default {
  id: 'esteem',
  version: '1.0',
  title: '자아존중감 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '나를 얼마나 가치 있게 여기는지, 힘들 때 나를 어떻게 대하는지, 그리고 그 믿음이 인정이나 성과 같은 조건에 얼마나 기대는지 살펴보는 검사예요. 점수의 높낮이보다 자존감의 모양을 함께 봐요.',
    facts: [
      { dt: '문항', dd: `${WORTH_ITEMS.length + SELF_ITEMS.length + BASE_ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 8분' },
      { dt: '구성', dd: '3부' },
    ],
    gets: ['자기 가치감', '자존감 지도', '나를 대하는 방식', '자존감이 기대는 곳', '돌보는 연습', '상담 메모'],
  },
  parts: [
    {
      id: 'worth',
      kind: 'likert',
      title: '나를 바라보는 마음',
      short: '1부 나',
      summary: '나를 얼마나 괜찮은 사람으로 여기는지 답해요',
      desc: '요즘의 나를 떠올리며, 나를 얼마나 괜찮은 사람으로 여기는지 답해 주세요.',
      how,
      count: WORTH_ITEMS.length,
      scale: LIKERT_SCALE,
      items: WORTH_ITEMS,
    },
    {
      id: 'self',
      kind: 'likert',
      title: '힘들 때 나를 대하는 방식',
      short: '2부 대하기',
      summary: '실수하거나 힘든 순간에 나를 어떻게 대하는지 답해요',
      desc: '실수했거나 일이 잘 안 풀린 순간, 마음이 힘든 순간의 나를 떠올리며 답해 주세요.',
      how,
      count: SELF_ITEMS.length,
      scale: LIKERT_SCALE,
      items: SELF_ITEMS,
    },
    {
      id: 'bases',
      kind: 'likert',
      title: '자존감이 기대는 곳',
      short: '3부 기대는 곳',
      summary: '내 자존감이 어떤 조건에 기대는지 답해요',
      desc: '마지막이에요. 나를 괜찮게 느끼는 마음이 어떤 조건에 따라 오르내리는지 답해 주세요.',
      how,
      count: BASE_ITEMS.length,
      scale: LIKERT_SCALE,
      items: BASE_ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${TYPES[s.type].name} (자기 가치감 ${s.worth}, 나를 대하는 방식 ${s.compassion}, 조건 기댐 ${s.lean})`,
  glyph: (s) => String(Math.min(99, s.worth)),
  render: renderReport,
};
