// AZIT : Star&Moon — 결과 한 줄 요약
// 목록과 종합 결과지에 보이는 한 줄 요약은 저장할 때 만든 글이다. 그 뒤에 해석 기준이 바뀐 검사는
// 저장된 점수로 지금 기준에 맞춰 다시 만들어, 결과지와 목록이 서로 다른 말을 하지 않게 한다.
//  - 대인관계 패턴 검사: 제목 방향 기준(2026.11.28, tests/interpersonal/scoring.js styleOf)
import { summaryLine as interpersonal } from '../../tests/interpersonal/summary.js';

const FRESH = { interpersonal };

export function summaryOf(r) {
  const f = r && r.scores && FRESH[r.testId];
  if (f) {
    try { return f(r.scores); } catch (e) { /* 저장된 요약으로 */ }
  }
  return (r && r.summary) || '';
}
