// AZIT : Star&Moon — 대인관계 패턴 검사 정의
import { ITEMS, LIKERT_SCALE } from './items.js';
import { score as scoreAll, styleOf } from './scoring.js';
import { summaryLine } from './summary.js';
import { renderReport } from './report.js';

const GLYPH = { pa: '주도', bc: '맞섬', de: '거리', fg: '조심', hi: '참음', jk: '맞춤', lm: '돌봄', no: '곁에', even: '고름' };

export default {
  id: 'interpersonal',
  version: '1.0',
  title: '대인관계 패턴 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '관계에서 자꾸 되풀이되는 어려움을 여덟 방향으로 살펴보는 검사예요. 주도와 물러섬, 다가감과 거리 둠이라는 두 축 위에서 내 모습이 어느 쪽으로 기우는지 원형 지도로 그리고, 같은 방향에 함께 있는 힘과 키울 방향을 찾아요.',
    facts: [
      { dt: '문항', dd: `${ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 6분' },
      { dt: '구성', dd: '1부' },
    ],
    gets: ['관계의 어려움 점수', '여덟 방향 원형 지도', '기우는 방향과 기울기', '두드러진 방향의 마음과 힘', '두 축(주도와 물러섬, 다가감과 거리 둠)', '성장 방향', '상담 메모'],
  },
  parts: [
    {
      id: 'circle',
      kind: 'likert',
      title: '관계 속의 나',
      short: '관계',
      summary: '가까운 사람들과 지낼 때의 내 모습을 답해요',
      desc: '가족, 친구, 동료처럼 가까이 지내는 사람들을 떠올리며 답해 주세요. 특정한 한 사람보다, 여러 관계에서 자주 나오는 내 모습을 기준으로 골라 주세요.',
      how: '되고 싶은 모습이 아니라 평소의 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: ITEMS.length,
      scale: LIKERT_SCALE,
      items: ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: summaryLine,
  glyph: (s) => GLYPH[styleOf(s)] || '·',
  render: renderReport,
};
