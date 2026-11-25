// AZIT : Star&Moon — 성격 강점 검사 정의
import { PART1_ITEMS, PART2_ITEMS, LIKERT_SCALE, STRENGTHS } from './items.js';
import { score as scoreAll } from './scoring.js';
import { renderReport } from './report.js';

const how = '되고 싶은 모습이 아니라 평소의 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.';

export default {
  id: 'strengths',
  version: '1.0',
  title: '성격 강점 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '내가 이미 가진 좋은 힘을 찾아보는 검사예요. 창의성, 친절, 끈기, 감사 같은 성격 강점 24가지를 내 안에서 앞서는 차례대로 세우고, 가장 나다운 대표 강점 다섯 가지와 그 강점을 새롭게 쓰는 법을 알려 드려요.',
    facts: [
      { dt: '문항', dd: `${PART1_ITEMS.length + PART2_ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 13분' },
      { dt: '구성', dd: '2부' },
    ],
    gets: ['24강점 순위', '대표 강점 5개', '여섯 덕목 지도', '강점 쓰는 법', '균형 잡기', '상담 메모'],
  },
  parts: [
    {
      id: 'p1',
      kind: 'likert',
      title: '나의 모습 1',
      short: '1부',
      summary: '생각하고 행동하는 평소의 모습을 답해요',
      desc: '여러 상황에서의 평소 내 모습을 떠올리며 답해 주세요. 좋아 보이는 답보다 실제의 나에 가까운 답이 더 정확한 결과를 만들어요.',
      how,
      count: PART1_ITEMS.length,
      scale: LIKERT_SCALE,
      items: PART1_ITEMS,
    },
    {
      id: 'p2',
      kind: 'likert',
      title: '나의 모습 2',
      short: '2부',
      summary: '사람과 일, 삶을 대하는 평소의 모습을 답해요',
      desc: '절반을 지났어요. 같은 강점을 다른 장면으로 한 번 더 물어요. 앞에서 어떻게 답했는지 맞추려 하지 말고, 지금 문장만 보고 골라 주세요.',
      how,
      count: PART2_ITEMS.length,
      scale: LIKERT_SCALE,
      items: PART2_ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `대표 강점 ${s.sig.map((k) => STRENGTHS[k].name).join(', ')}`,
  glyph: (s) => (s.top === 'reg' ? '조절' : STRENGTHS[s.top].name.slice(0, 2)),
  render: renderReport,
};
