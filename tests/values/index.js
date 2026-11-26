// AZIT : Star&Moon — 가치 지향 검사 정의
import { ITEMS, LIKERT_SCALE, VALUES } from './items.js';
import { score as scoreAll } from './scoring.js';
import { GROUP_TEXT } from './content.js';
import { renderReport } from './report.js';

export default {
  id: 'values',
  version: '1.0',
  title: '가치 지향 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '삶에서 무엇을 먼저 두는지 살펴보는 검사예요. 자율, 안전, 성취, 배려 같은 열 가지 가치를 내 안에서 앞서는 차례대로 세우고, 그 가치들이 어느 방향으로 모여 있는지, 서로 당기는 가치는 없는지 함께 봐요.',
    facts: [
      { dt: '문항', dd: `${ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 7분' },
      { dt: '구성', dd: '1부' },
    ],
    gets: ['열 가치 순위', '핵심 가치 3개', '가치 원형', '네 방향과 두 축', '가치 갈등', '상담 메모'],
  },
  parts: [
    {
      id: 'portrait',
      kind: 'likert',
      title: '닮은 사람 찾기',
      short: '가치',
      summary: '짧은 글 속 사람이 나와 얼마나 닮았는지 답해요',
      desc: '문장마다 한 사람의 모습이 그려져 있어요. 그 사람이 나와 얼마나 닮았는지 골라 주세요. 옳고 그른 답은 없고, 지금의 내가 실제로 중요하게 여기는 것에 가까운 답이 가장 정확해요.',
      how: '남들이 좋게 볼 답보다 솔직한 내 마음을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~6으로도 고를 수 있어요.',
      count: ITEMS.length,
      scale: LIKERT_SCALE,
      items: ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${GROUP_TEXT[s.topGroup].title} (핵심 가치 ${s.core.map((k) => VALUES[k].name).join(', ')})`,
  glyph: (s) => VALUES[s.top].name.slice(0, 2),
  render: renderReport,
};
