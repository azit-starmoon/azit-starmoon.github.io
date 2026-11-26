// AZIT : Star&Moon — 성인 애착 유형 검사 정의
import { GENERAL_ITEMS, TARGETS, LIKERT_SCALE, targetItems } from './items.js';
import { score as scoreAll, STYLE_NAMES } from './scoring.js';
import { renderReport } from './report.js';

const how = '되고 싶은 모습이 아니라, 실제로 익숙한 내 모습을 기준으로 골라 주세요. 오래 고민하기보다 처음 떠오르는 답이 대체로 정확해요. 키보드에서는 숫자 1~5로도 고를 수 있어요.';
const targetHow = '떠올리기 어렵거나 해당하는 사람이 없다면 건너뛰어도 괜찮아요. 건너뛴 관계는 관계별 지도에서만 빠지고, 유형 판정에는 영향을 주지 않아요.';

export default {
  id: 'attachment',
  version: '1.0',
  title: '성인 애착 유형 검사',
  intro: {
    kicker: 'AZIT : Star&Moon 검사',
    lead: '가까운 사람 앞에서 나는 어떻게 되는지, 불안과 회피 두 축으로 읽는 검사예요. 관계 전반의 모습과 함께 어머니, 아버지, 연인, 친구와의 관계를 하나씩 따로 살펴봐요.',
    facts: [
      { dt: '문항', dd: '60개' },
      { dt: '소요 시간', dd: '약 10분' },
      { dt: '구성', dd: '2부' },
    ],
    gets: ['애착 유형', '불안과 회피 두 축', '하위 요인 8가지', '관계별 지도', '관계 속 흐름', '성장 방향', '상담 메모'],
    overview: [
      { title: '가까운 관계 전반', count: GENERAL_ITEMS.length, summary: '가족, 연인, 친구처럼 가까운 사람들 앞에서의 평소 모습을 답해요' },
      { title: '관계별 지도', count: TARGETS.length * 6, summary: '어머니, 아버지, 연인 또는 배우자, 가장 가까운 친구를 6문항씩 따로 답해요. 관계마다 건너뛸 수 있어요' },
    ],
  },
  parts: [
    {
      id: 'g',
      kind: 'likert',
      label: '1부 / 2부',
      title: '가까운 관계 전반',
      short: '관계 전반',
      summary: '가족, 연인, 친구처럼 가까운 사람들과의 평소 모습을 답해요',
      desc: '가족, 연인, 친구처럼 마음을 기대는 사람들을 떠올리며 답해 주세요. 특정한 한 사람보다, 가까운 관계에서 평소에 느끼는 내 모습을 기준으로 골라 주세요.',
      how,
      count: GENERAL_ITEMS.length,
      scale: LIKERT_SCALE,
      items: GENERAL_ITEMS,
    },
    ...TARGETS.map((t, i) => ({
      id: t.id,
      kind: 'likert',
      label: `2부 관계별 지도 (${i + 1}/${TARGETS.length})`,
      title: t.title,
      short: t.name,
      summary: `${t.title}와의 관계를 따로 답해요. 건너뛸 수 있어요`,
      desc: t.desc,
      how: targetHow,
      count: 6,
      scale: LIKERT_SCALE,
      items: targetItems(t),
      skippable: true,
      skipLabel: '이 관계는 건너뛸게요',
      enterLabel: '이 관계에 답하기',
    })),
  ],
  score: (answers) => scoreAll(answers),
  summary: (s) => `${STYLE_NAMES[s.style]} (불안 ${s.anx}, 회피 ${s.avo})`,
  glyph: (s) => ({ secure: '안', anxious: '불', fearful: '두', avoidant: '회' }[s.style] || '·'),
  render: renderReport,
};
