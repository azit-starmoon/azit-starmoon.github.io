// AZIT : Star&Moon — 생애 이야기 검사 정의
import { MEANING_ITEMS, STORY_ITEMS, REFLECT_ITEMS, LIKERT_SCALE, THEMES } from './items.js';
import { score as scoreAll } from './scoring.js';
import { STATES } from './content.js';
import { renderReport } from './report.js';

const how = '되고 싶은 모습이 아니라 실제 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.';

export default {
  id: 'lifestory',
  version: '1.0',
  title: '생애 이야기 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '지금까지의 삶을 한 권의 이야기로 보고, 그 이야기를 직접 적어 보는 검사예요. 삶의 의미를 얼마나 느끼고 찾는지, 가장 빛났던 장면과 힘들었던 장면, 전환점과 바라는 다음 장, 그리고 그 이야기를 어떤 결로 엮고 있는지 함께 봐요. 점수보다 직접 적은 이야기가 결과지의 중심이에요.',
    facts: [
      { dt: '문항', dd: `${MEANING_ITEMS.length + STORY_ITEMS.length + REFLECT_ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 20분' },
      { dt: '구성', dd: '3부' },
    ],
    gets: ['의미 지도', '내 삶의 장', '이야기의 장면', '이야기의 결', '다음 장', '연습', '상담 메모'],
  },
  parts: [
    {
      id: 'meaning',
      kind: 'likert',
      title: '삶의 의미',
      short: '1부 의미',
      summary: '내 삶의 의미를 얼마나 느끼고, 얼마나 찾고 있는지 답해요',
      desc: '요즘의 나를 떠올리며, 각 문장이 나와 얼마나 비슷한지 골라 주세요.',
      how,
      count: MEANING_ITEMS.length,
      scale: LIKERT_SCALE,
      items: MEANING_ITEMS,
    },
    {
      id: 'story',
      kind: 'text',
      title: '삶의 이야기 쓰기',
      short: '2부 이야기',
      summary: '내 삶의 장과 가장 중요한 장면들을 글로 적어요',
      desc: '정답도, 잘 쓴 글도 없어요. 떠오르는 대로 몇 줄이면 충분해요. 쓰기 어려운 질문은 건너뛰어도 괜찮아요.',
      how: '적는 동안에도 자동으로 저장돼요. 적은 글은 결과지에 그대로 실려 상담 선생님이 읽고, 공유 링크에는 담기지 않아요.',
      count: STORY_ITEMS.length,
      items: STORY_ITEMS,
    },
    {
      id: 'reflect',
      kind: 'likert',
      title: '이야기 돌아보기',
      short: '3부 돌아보기',
      summary: '방금 적은 이야기를 돌아보며 답해요',
      desc: '지금까지의 내 이야기 전체를 떠올리며, 각 문장이 얼마나 맞는지 골라 주세요.',
      how,
      count: REFLECT_ITEMS.length,
      scale: LIKERT_SCALE,
      items: REFLECT_ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${STATES[s.state].name} (의미 느낌 ${s.pr}, 의미 찾기 ${s.se}, 가장 짙은 결: ${THEMES[s.themeOrder[0]].name}, 적은 장면 ${s.written}개)`,
  glyph: (s) => STATES[s.state].short.slice(0, 2),
  render: renderReport,
};
