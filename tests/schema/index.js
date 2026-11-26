// AZIT : Star&Moon — 심리도식 검사(심리도식) 정의
import { ITEMS, COPING_ITEMS, LIKERT_SCALE, SCHEMAS } from './items.js';
import { score as scoreAll } from './scoring.js';
import { renderReport } from './report.js';
import { COPING_TEXT } from './content.js';

const half = ITEMS.length / 2;
const how = '지난 1년 동안의 나를 떠올리며, 문장이 나를 얼마나 잘 설명하는지 골라 주세요. 머리로 옳다고 생각하는 답보다 마음으로 느끼는 대로 고르는 것이 중요해요. 키보드에서는 숫자 1~6으로도 고를 수 있어요.';

export default {
  id: 'schema',
  version: '1.0',
  title: '심리도식 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '어린 시절 마음을 지키려고 만들어진 규칙들이 지금도 나를 움직이고 있어요. 심리도식 이론의 18가지 규칙이 얼마나 작동하는지, 그리고 규칙이 건드려질 때 어떻게 대처하는지 살펴봐요.',
    facts: [
      { dt: '문항', dd: '96개' },
      { dt: '소요 시간', dd: '약 15분' },
      { dt: '구성', dd: '3부' },
    ],
    gets: ['18가지 규칙 지도', '다섯 영역', '작동하는 규칙 자세히', '건강한 어른의 목소리', '대처 방식', '상담 메모'],
  },
  parts: [
    {
      id: 'p1',
      kind: 'likert',
      title: '마음속 규칙 (1)',
      short: '1부',
      summary: '문장이 나를 얼마나 잘 설명하는지 답해요',
      desc: '문장이 지금의 나를 얼마나 잘 설명하는지 골라 주세요. 마음이 불편해지는 문장이 있을 수 있어요. 그럴수록 솔직하게 답할 때 결과가 정확해져요.',
      how,
      count: half,
      scale: LIKERT_SCALE,
      items: ITEMS.slice(0, half),
    },
    {
      id: 'p2',
      kind: 'likert',
      title: '마음속 규칙 (2)',
      short: '2부',
      summary: '같은 방식으로 나머지 절반을 답해요',
      desc: '절반을 왔어요. 같은 방식으로 나머지 문장에 답해 주세요. 지칠 땐 잠깐 쉬었다 와도 진행 상황은 이 기기에 저장돼요.',
      how,
      count: ITEMS.length - half,
      scale: LIKERT_SCALE,
      items: ITEMS.slice(half),
    },
    {
      id: 'p3',
      kind: 'rank',
      title: '규칙이 건드려질 때',
      short: '3부',
      summary: '여섯 가지 상황에서 나의 반응 순서를 골라요',
      desc: '마지막이에요. 마음속 규칙이 건드려지는 여섯 가지 상황이에요. 세 가지 반응 가운데 나와 가까운 순서대로 골라 주세요.',
      how: '정답은 없어요. 그래야 한다고 생각하는 반응이 아니라 실제로 자주 하는 반응을 골라 주세요. 키보드에서는 숫자 1~3으로도 고를 수 있어요.',
      count: COPING_ITEMS.length,
      items: COPING_ITEMS,
    },
  ],
  score: (answers) => scoreAll(answers),
  // 저장소에서 다시 읽은 점수는 빈 배열(작동하는 도식 없음)이 빠져 있을 수 있다
  summary: (s) => `${(s.active || []).length ? (s.topNames || []).join(', ') : '두드러진 규칙 없음'} (주된 대처: ${COPING_TEXT[s.primaryCoping].name})`,
  glyph: (s) => ((s.active || []).length ? SCHEMAS[s.active[0]].name.slice(0, 1) : '·'),
  render: renderReport,
};
