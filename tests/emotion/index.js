// AZIT : Star&Moon — 감정 조절 검사 정의
import { SKILL_ITEMS, STRATEGY_ITEMS, LIKERT_SCALE, FREQ_SCALE, SKILLS } from './items.js';
import { score as scoreAll } from './scoring.js';
import { OVERALL } from './content.js';
import { renderReport } from './report.js';

export default {
  id: 'emotion',
  version: '1.0',
  title: '감정 조절 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '감정이 생겨서 행동으로 이어지기까지, 감정을 다루는 힘을 여섯 갈래로 살펴보는 검사예요. 알아차리고, 이해하고, 받아들이고, 다스리는 힘과 함께 힘들 때 자주 쓰는 조절 전략도 봐요.',
    facts: [
      { dt: '문항', dd: `${SKILL_ITEMS.length + STRATEGY_ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 8분' },
      { dt: '구성', dd: '2부' },
    ],
    gets: ['감정을 다루는 힘', '여섯 갈래 육각형', '강점과 키울 점', '조절 전략 구성', '감정이 몰려올 때', '상담 메모'],
  },
  parts: [
    {
      id: 'skills',
      kind: 'likert',
      title: '감정을 다루는 나',
      short: '1부 감정',
      summary: '감정을 알아차리고 다루는 평소의 모습을 답해요',
      desc: '감정이 생겼을 때 평소의 내 모습을 떠올리며 답해 주세요. 되고 싶은 모습보다 실제로 익숙한 모습을 기준으로 골라 주세요.',
      how: '오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: SKILL_ITEMS.length,
      scale: LIKERT_SCALE,
      items: SKILL_ITEMS,
    },
    {
      id: 'strategies',
      kind: 'likert',
      title: '힘들 때 내가 하는 것',
      short: '2부 전략',
      summary: '속상하거나 힘들 때 자주 하는 행동을 답해요',
      desc: '속상하거나 힘든 일이 있을 때 내가 실제로 얼마나 자주 그렇게 하는지 골라 주세요.',
      how: '좋아 보이는 답보다 실제로 자주 하는 정도를 골라 주세요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: STRATEGY_ITEMS.length,
      scale: FREQ_SCALE,
      items: STRATEGY_ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${OVERALL[s.level].title} (다루는 힘 ${s.total}, 든든한 갈래 ${SKILLS[s.top].name})`,
  glyph: (s) => String(Math.min(99, s.total)),
  render: renderReport,
};
