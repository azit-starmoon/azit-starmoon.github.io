// AZIT : Star&Moon — 곱씹기와 돌아보기 검사 정의
import { ITEMS, LIKERT_SCALE } from './items.js';
import { score as scoreAll } from './scoring.js';
import { TYPES } from './content.js';
import { renderReport } from './report.js';

const GLYPH = { reflect: '길', deep: '깊이', circle: '맴돎', light: '훌훌' };

export default {
  id: 'rumination',
  version: '1.0',
  title: '곱씹기와 돌아보기 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '같은 생각이 머릿속에 오래 머물 때, 그 생각이 나를 가라앉히는지(곱씹기) 길을 찾아 주는지(돌아보기)를 살펴보는 짧은 검사예요. 두 생각의 크기로 지금 내 생각의 모양을 그리고, 맴도는 생각을 길을 찾는 생각으로 옮기는 연습을 찾아요.',
    facts: [
      { dt: '문항', dd: `${ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 3분' },
      { dt: '구성', dd: '1부' },
    ],
    gets: ['곱씹기와 돌아보기 점수', '생각 지도(네 가지 모양)', '두 생각의 균형', '맴도는 생각을 옮기는 연습', '상담 메모'],
  },
  parts: [
    {
      id: 'think',
      kind: 'likert',
      title: '생각이 머무를 때',
      short: '생각',
      summary: '속상한 일이 있을 때 내 생각이 흘러가는 모습을 답해요',
      desc: '속상하거나 마음에 걸리는 일이 있을 때, 평소 내 생각이 어떻게 흘러가는지 떠올리며 답해 주세요.',
      how: '되고 싶은 모습이 아니라 평소의 내 모습을 기준으로 골라 주세요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: ITEMS.length,
      scale: LIKERT_SCALE,
      items: ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${(TYPES[s.type] || TYPES.light).name} (곱씹기 ${s.br}, 돌아보기 ${s.rf})`,
  glyph: (s) => GLYPH[s.type] || '·',
  render: renderReport,
};
