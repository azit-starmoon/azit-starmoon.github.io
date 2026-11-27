// AZIT : Star&Moon — 요즘의 나 체크 정의
// 감각처리 민감성 검사 2부 '요즘의 나'의 열두 문장만 따로 떼어 낸 짧은 체크다.
// 문항 id와 계산이 그 검사와 같아서, 종합 결과지의 '달라진 점'에서 두 검사의 '요즘의 나'가 한 줄로 이어진다.
import { STATE_ITEMS, LIKERT_SCALE } from '../hsp/items.js';
import { STATES } from '../hsp/content.js';
import { score as scoreAll } from './scoring.js';
import { renderReport } from './report.js';

const GLYPH = { overload: '지침', holding: '버팀', bloom: '피움', dry: '채움' };

export default {
  id: 'hspnow',
  version: '1.0',
  title: '요즘의 나 체크',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: "감각처리 민감성 검사의 '요즘의 나' 열두 문장만 따로 떼어 낸 짧은 체크예요. 최근 2주 동안 얼마나 지쳐 있는지(부담 신호)와 쉬어 갈 틈이 있는지(회복 자원)를 2분 안에 재요. 한 달에 한 번처럼 정해 두고 하면, 종합 결과지의 '달라진 점'에서 지난번과 무엇이 달라졌는지 볼 수 있어요.",
    facts: [
      { dt: '문항', dd: `${STATE_ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 2분' },
      { dt: '구성', dd: '1부' },
    ],
    gets: ['요즘 상태 지도', '부담 신호와 회복 자원', '크게 느끼는 신호와 비어 있는 자원', '이번 주에 해 볼 것', '지난 체크와 비교'],
  },
  parts: [
    {
      id: 'state',
      kind: 'likert',
      title: '요즘의 나',
      short: '요즘',
      summary: '최근 2주 동안의 지침과 회복을 답해요',
      desc: '최근 2주 동안의 나를 떠올려 주세요. 요즘 얼마나 지쳐 있는지, 회복할 틈이 있는지를 봐요.',
      how: '최근 2주를 기준으로 골라 주세요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: STATE_ITEMS.length,
      scale: LIKERT_SCALE,
      items: STATE_ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${(STATES[s.state] || STATES.dry).name} (부담 신호 ${s.load}, 회복 자원 ${s.rest})`,
  glyph: (s) => GLYPH[s.state] || '요즘',
  render: renderReport,
};
