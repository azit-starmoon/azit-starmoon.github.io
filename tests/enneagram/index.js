// AZIT : Star&Moon — 에니어그램 검사 정의
import { LIKERT_ITEMS, LIKERT_SCALE, INSTINCT_SETS, INSTINCT_ORDER } from './items.js';
import { buildMotiveItems, score as scoreAll } from './scoring.js';
import { TYPES } from './content-types.js';
import { renderReport } from './report.js';

const rankItems = INSTINCT_SETS.map((set, i) => ({
  id: set.id,
  prompt: set.prompt,
  options: INSTINCT_ORDER[i].map((k) => ({ key: k, text: set.o[k] })),
}));

export default {
  id: 'enneagram',
  version: '1.0',
  title: '에니어그램',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '아홉 가지 유형 가운데 나를 움직이는 핵심 동기를 찾아요. 1부에서 성향을 넓게 살피고, 2부에서 가장 가까운 유형들의 동기를 서로 맞대어 핵심 유형을 가려내요.',
    facts: [
      { dt: '문항', dd: '117개' },
      { dt: '소요 시간', dd: '약 15분' },
      { dt: '구성', dd: '3부' },
    ],
    gets: ['핵심 유형과 확신도', '날개', '트라이타입', '세 중심', '본능과 하위유형', '성장과 스트레스 방향', '관계와 일', '응답 경향'],
  },
  parts: [
    {
      id: 'p1',
      kind: 'likert',
      title: '성향',
      short: '1부 성향',
      summary: '평소의 나에게 얼마나 가까운지 답해요',
      desc: '평소의 내 모습에 얼마나 가까운지 답해 주세요. 되고 싶은 모습이 아니라, 지금까지 살아온 대부분의 시간 동안 나에게 익숙했던 모습을 기준으로 골라 주세요.',
      how: '오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 상황마다 다르다면, 가장 자주 그랬던 쪽을 골라 주세요. 키보드에서는 숫자 1~5로도 고를 수 있어요.',
      count: LIKERT_ITEMS.length,
      scale: LIKERT_SCALE,
      items: LIKERT_ITEMS,
    },
    {
      id: 'p2',
      kind: 'pair',
      title: '동기 비교',
      short: '2부 동기',
      summary: '두 문장 중 더 가까운 쪽을 골라요',
      desc: '1부에서 가장 높게 나온 세 유형의 동기를 서로 맞대어 봐요. 행동이 비슷해 보여도 그 행동을 하는 이유는 유형마다 달라요. 이 단계가 핵심 유형을 가려내요.',
      how: '두 문장 중 지금의 나에게 더 가까운 쪽에서 <strong>훨씬 가까워요</strong> 또는 <strong>조금 더 가까워요</strong>를 눌러 주세요. 둘 다 맞거나 둘 다 아니어도, 굳이 고른다면 어느 쪽인지 골라 주세요.',
      count: 18,
      build: (answers) => buildMotiveItems(answers),
    },
    {
      id: 'p3',
      kind: 'rank',
      title: '본능',
      short: '3부 본능',
      summary: '세 문장을 나다운 순서로 골라요',
      desc: '사람에게는 나를 지키는 본능, 무리 속 자리를 챙기는 본능, 깊이 연결되려는 본능이 있어요. 셋 중 무엇이 앞서는지에 따라 같은 유형도 꽤 다르게 보여요.',
      how: '세 문장 가운데 나에게 가까운 순서대로 두 개를 눌러 주세요. 마지막 하나는 저절로 정해져요. 잘못 눌렀다면 다시 누르면 취소돼요.',
      count: rankItems.length,
      items: rankItems,
    },
  ],
  score: (answers, meta) => scoreAll(answers, meta),
  summary: (s) => `${s.core}w${s.wing} ${TYPES[s.core].name}, 트라이타입 ${s.tritype.join('-')}, ${s.instinct.stack.map((k) => k.toUpperCase()).join('/')}`,
  glyph: (s) => String(s.core),
  render: renderReport,
};
