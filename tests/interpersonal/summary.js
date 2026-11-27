// AZIT : Star&Moon — 대인관계 패턴 검사의 한 줄 요약
// 결과 목록·종합 결과지·관리 화면이 저장된 점수로 다시 만들어 쓴다(제목 기준이 바뀌어도 모든 화면이 같은 말을 하게).
import { OCTANTS } from './items.js';
import { OCTANT_TEXT, EVEN } from './content.js';
import { styleOf, FIT_MIN } from './scoring.js';

export function summaryLine(s) {
  const st = styleOf(s || {});
  const dir = OCTANTS[st];
  // 두 갈래로 나뉜 모양(기울기는 뚜렷함)이면 각도가 아니라 가장 높은 방향을 제목으로 썼다고 밝힌다
  const tail = !dir ? '기우는 방향 고름' : Number(s.fit) < FIT_MIN ? `두 갈래, 가장 높은 방향 ${dir.short}` : `기우는 방향 ${dir.short}`;
  return `${dir ? OCTANT_TEXT[st].title : EVEN.title} (관계의 어려움 ${s.elev}, ${tail})`;
}
