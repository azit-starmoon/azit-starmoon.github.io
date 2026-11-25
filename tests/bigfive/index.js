// AZIT : Star&Moon — 빅파이브 성격검사 정의
import { ITEMS, LIKERT_SCALE, DOMAIN_ORDER } from './items.js';
import { score as scoreAll } from './scoring.js';
import { renderReport, headlineOf } from './report.js';

const half = ITEMS.length / 2;
const SHORT = { O: '개방', C: '성실', E: '외향', A: '친화', N: '신경' };
const how = '되고 싶은 모습이 아니라, 지금까지 살아온 대부분의 시간 동안 익숙했던 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.';

export default {
  id: 'bigfive',
  version: '1.0',
  title: '빅파이브 성격검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '성격을 이루는 다섯 영역(개방성, 성실성, 외향성, 친화성, 신경성)과 그 안의 하위 요인 30개를 재요. 유형으로 가르기보다, 나라는 별이 어떤 모양인지 그려 보는 검사예요.',
    facts: [
      { dt: '문항', dd: '120개' },
      { dt: '소요 시간', dd: '약 12분' },
      { dt: '구성', dd: '2부' },
    ],
    gets: ['다섯 영역 점수', '하위 요인 30개', '두 영역을 엮은 스타일 10가지', '관계와 일', '두드러진 특징', '성장 제안', '응답 점검'],
  },
  parts: [
    {
      id: 'p1',
      kind: 'likert',
      title: '평소의 나',
      short: '1부',
      summary: '평소의 나에게 얼마나 가까운지 답해요',
      desc: '평소의 내 모습에 얼마나 가까운지 답해 주세요. 정답이나 더 좋은 답은 없어요.',
      how,
      count: half,
      scale: LIKERT_SCALE,
      items: ITEMS.slice(0, half),
    },
    {
      id: 'p2',
      kind: 'likert',
      title: '조금 더 깊이',
      short: '2부',
      summary: '같은 방식으로 나머지 절반을 답해요',
      desc: '절반을 왔어요. 같은 방식으로 나머지 문항에 답해 주세요. 비슷해 보이는 문장이 다시 나와도, 그때그때 떠오르는 대로 답하면 돼요.',
      how,
      count: ITEMS.length - half,
      scale: LIKERT_SCALE,
      items: ITEMS.slice(half),
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${headlineOf(s)} (${DOMAIN_ORDER.map((d) => `${SHORT[d]} ${s.domains[d].score}`).join(', ')})`,
  glyph: () => '★',
  render: renderReport,
};
