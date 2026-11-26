// AZIT : Star&Moon — 감각처리 민감성 검사 정의
import { TRAIT_ITEMS, STATE_ITEMS, LIKERT_SCALE } from './items.js';
import { score as scoreAll } from './scoring.js';
import { OVERALL, STATES } from './content.js';
import { renderReport } from './report.js';

const how = '되고 싶은 모습이 아니라 평소의 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.';

export default {
  id: 'hsp',
  version: '1.0',
  title: '감각처리 민감성 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '소리, 빛, 사람의 감정 같은 자극을 얼마나 깊고 섬세하게 받아들이는지 살펴보는 검사예요. 타고난 민감성을 네 갈래로 나눠 보고, 요즘 그 섬세함이 지쳐 있는지 잘 피어나고 있는지도 함께 봐요.',
    facts: [
      { dt: '문항', dd: `${TRAIT_ITEMS.length + STATE_ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 8분' },
      { dt: '구성', dd: '2부' },
    ],
    gets: ['민감성 점수', '네 갈래 프로필', '섬세함의 힘과 무게', '요즘 상태 지도', '맞는 환경', '회복 방법', '상담 메모'],
  },
  parts: [
    {
      id: 'trait',
      kind: 'likert',
      title: '평소의 나',
      short: '1부 평소',
      summary: '자극과 감정을 받아들이는 평소의 모습을 답해요',
      desc: '오랫동안 이어져 온 평소의 내 모습을 떠올리며 답해 주세요. 요즘 특별히 지쳐 있더라도, 원래의 나라면 어떤지를 기준으로 골라 주세요.',
      how,
      count: TRAIT_ITEMS.length,
      scale: LIKERT_SCALE,
      items: TRAIT_ITEMS,
    },
    {
      id: 'state',
      kind: 'likert',
      title: '요즘의 나',
      short: '2부 요즘',
      summary: '최근 2주 동안의 지침과 회복을 답해요',
      desc: '이번에는 최근 2주 동안의 나를 떠올려 주세요. 요즘 얼마나 지쳐 있는지, 회복할 틈이 있는지를 봐요.',
      how: '최근 2주를 기준으로 골라 주세요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: STATE_ITEMS.length,
      scale: LIKERT_SCALE,
      items: STATE_ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${OVERALL[s.level].title} (민감성 ${s.total}, 요즘 ${STATES[s.state].name})`,
  glyph: (s) => String(Math.min(99, s.total)),
  render: renderReport,
};
