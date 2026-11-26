// AZIT : Star&Moon — 스트레스 대처 방식 검사 정의
import { COPE_ITEMS, SITUATIONS, FREQ_SCALE, STRATEGIES } from './items.js';
import { score as scoreAll } from './scoring.js';
import { STYLES } from './content.js';
import { renderReport } from './report.js';

export default {
  id: 'coping',
  version: '1.0',
  title: '스트레스 대처 방식 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '힘든 일이 생겼을 때 내가 주로 어떻게 대처하는지 살펴보는 검사예요. 여덟 가지 대처를 얼마나 자주 쓰는지와 함께, 바꿀 수 있는 일과 바꿀 수 없는 일 앞에서 대처를 바꿀 줄 아는지도 봐요.',
    facts: [
      { dt: '문항', dd: `${COPE_ITEMS.length + SITUATIONS.length}개` },
      { dt: '소요 시간', dd: '약 8분' },
      { dt: '구성', dd: '2부' },
    ],
    gets: ['여덟 가지 대처', '대처 꽃잎', '대처 스타일', '상황에 맞추기', '키우는 연습', '상담 메모'],
  },
  parts: [
    {
      id: 'cope',
      kind: 'likert',
      title: '힘든 일이 생겼을 때',
      short: '1부 대처',
      summary: '스트레스를 받을 때 자주 하는 행동을 답해요',
      desc: '최근 힘들었던 일들을 떠올리며, 그럴 때 내가 실제로 얼마나 자주 그렇게 하는지 골라 주세요.',
      how: '좋아 보이는 답보다 실제로 자주 하는 정도를 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: COPE_ITEMS.length,
      scale: FREQ_SCALE,
      items: COPE_ITEMS,
    },
    {
      id: 'situations',
      kind: 'rank',
      title: '이럴 때 나는',
      short: '2부 상황',
      summary: '여섯 가지 상황에서 나의 반응 순서를 골라요',
      desc: '여섯 가지 상황이에요. 세 가지 반응 가운데 내가 실제로 먼저 할 것 같은 순서대로 골라 주세요.',
      how: '정답은 없어요. 그래야 한다고 생각하는 반응이 아니라 실제로 자주 하는 반응을 골라 주세요. 키보드에서는 숫자 1~3으로도 고를 수 있어요.',
      count: SITUATIONS.length,
      items: SITUATIONS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${STYLES[s.style].name} (가장 자주 쓰는 대처: ${STRATEGIES[s.order[0]].name}, 상황 맞춤 ${s.fit})`,
  glyph: (s) => String(Math.min(99, s.approach)),
  render: renderReport,
};
