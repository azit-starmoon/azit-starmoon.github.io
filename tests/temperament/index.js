// AZIT : Star&Moon — 기질과 성품 검사 정의
import { TEMP_ITEMS, CHAR_ITEMS, LIKERT_SCALE } from './items.js';
import { score as scoreAll } from './scoring.js';
import { TEMP_TYPES, CHAR_SHAPES } from './content.js';
import { renderReport } from './report.js';

const how = '되고 싶은 모습이 아니라 실제 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.';

export default {
  id: 'temperament',
  version: '1.0',
  title: '기질과 성품 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '타고난 기질과, 경험과 성찰로 자라 온 성품을 나눠서 살펴보는 검사예요. 기질은 새로움, 위험, 사람, 보상에 자동으로 반응하는 나의 결이고, 성품은 그 기질을 어떻게 쓰며 살아갈지 정하는 힘이에요. 둘이 만나 지금의 내가 어떤 모습으로 드러나는지 함께 봐요.',
    facts: [
      { dt: '문항', dd: `${TEMP_ITEMS.length + CHAR_ITEMS.length}개` },
      { dt: '소요 시간', dd: '약 9분' },
      { dt: '구성', dd: '2부' },
    ],
    gets: ['기질 유형', '기질 네 가지', '성품 모양', '성품 세 가지', '기질과 성품의 만남', '연습', '상담 메모'],
  },
  parts: [
    {
      id: 'temp',
      kind: 'likert',
      title: '타고난 기질',
      short: '1부 기질',
      summary: '새로움, 위험, 사람, 보상에 반응하는 나의 결을 답해요',
      desc: '어릴 때부터 지금까지 대체로 이어져 온 나의 모습을 떠올리며 답해 주세요.',
      how,
      count: TEMP_ITEMS.length,
      scale: LIKERT_SCALE,
      items: TEMP_ITEMS,
    },
    {
      id: 'char',
      kind: 'likert',
      title: '자라 온 성품',
      short: '2부 성품',
      summary: '나를 세우는 힘, 함께하는 힘, 더 큰 뜻과 이어지는 힘을 답해요',
      desc: '요즘의 나를 떠올리며, 각 문장이 지금의 나와 얼마나 비슷한지 골라 주세요.',
      how,
      count: CHAR_ITEMS.length,
      scale: LIKERT_SCALE,
      items: CHAR_ITEMS,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${TEMP_TYPES[s.ttype].name}, ${CHAR_SHAPES[s.shape].name} (자율성 ${s.dims.sd.score}, 연대감 ${s.dims.co.score}, 자기 초월 ${s.dims.st.score})`,
  glyph: (s) => TEMP_TYPES[s.ttype].short,
  render: renderReport,
};
