// AZIT : Star&Moon — 진로 흥미 검사 정의
import { PART1_ITEMS, PART2_ITEMS, LIKERT_SCALE, TYPES } from './items.js';
import { score as scoreAll } from './scoring.js';
import { TYPE_TEXT } from './content.js';
import { renderReport } from './report.js';

const how = '잘할 수 있는지보다 마음이 끌리는지를 기준으로 골라 주세요. 해 본 적이 없는 일은 해 본다면 어떨지 떠올려 보면 돼요. 키보드에서는 숫자 1~5로도 고를 수 있어요.';

export default {
  id: 'career',
  version: '1.0',
  title: '진로 흥미 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '어떤 종류의 일에 마음이 끌리는지 살펴보는 검사예요. 만들기, 탐구하기, 표현하기, 돕기, 이끌기, 정리하기의 여섯 흥미 가운데 가장 끌리는 세 가지로 흥미 코드를 만들고, 흥미가 모인 모양과 어울리는 직업을 함께 봐요.',
    facts: [
      { dt: '문항', dd: `${PART1_ITEMS.length + PART2_ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 9분' },
      { dt: '구성', dd: '2부' },
    ],
    gets: ['흥미 코드 3글자', '흥미 육각형', '일관도와 변별도', '직업 예시', '탐색 실천', '상담 메모'],
  },
  parts: [
    {
      id: 'p1',
      kind: 'likert',
      title: '해 보고 싶은 활동',
      short: '1부',
      summary: '여러 활동에 마음이 얼마나 끌리는지 답해요',
      desc: '일상에서 할 수 있는 여러 활동이 나와요. 그 활동을 하는 내 모습을 떠올리며 얼마나 끌리는지 골라 주세요. 옳고 그른 답은 없어요.',
      how,
      count: PART1_ITEMS.length,
      scale: LIKERT_SCALE,
      items: PART1_ITEMS,
    },
    {
      id: 'p2',
      kind: 'likert',
      title: '마음이 가는 일터',
      short: '2부',
      summary: '어떤 일과 일터에서 일하고 싶은지 답해요',
      desc: '절반을 지났어요. 이번에는 일과 일터에 대한 문장이에요. 지금 하는 일이나 전공과 상관없이, 마음이 가는 쪽을 솔직하게 골라 주세요.',
      how,
      count: PART2_ITEMS.length,
      scale: LIKERT_SCALE,
      items: PART2_ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `흥미 코드 ${s.codeText} · ${TYPE_TEXT[s.top].title}`,
  glyph: (s) => s.codeText.slice(0, 2),
  render: renderReport,
};
