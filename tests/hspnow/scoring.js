// AZIT : Star&Moon — 요즘의 나 체크 채점
// 감각처리 민감성 검사 2부와 같은 문항, 같은 계산(0~100, 50을 넘는지로 네 상태)이다.
import { STATE_ITEMS } from '../hsp/items.js';
import { stateOf } from '../hsp/scoring.js';

// 응답 점검: 열두 문장에 역문항이 없고(부담 신호 6, 회복 자원 6), 회복 자원 문장은 서로 다른 자원을 묻는다.
// 그래서 무작위 응답이나 '그렇다' 쏠림은 이 짧은 체크만으로는 가려낼 수 없다(validate.mjs 모의 응답: 무작위 0%, '그렇다'만 0.5% 짚음).
// 거의 같은 답만 고른 응답(열두 문장 표준편차 0.3 미만: 성실한 모의 응답은 0.4%만 걸림)과, 문항 수에 비해 아주 빠른 응답(19초 미만)만 짚는다.
export const FLAT_SD = 0.3;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sdOf = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const to100 = (m) => Math.round(((m - 1) / 4) * 100);
const r2 = (x) => Math.round(x * 100) / 100;

export function score(answers, meta = {}) {
  const raw = (it) => Number(answers[it.id]);
  const loadItems = STATE_ITEMS.filter((it) => it.scale === 'load');
  const restItems = STATE_ITEMS.filter((it) => it.scale === 'rest');
  const load = to100(mean(loadItems.map(raw)));
  const rest = to100(mean(restItems.map(raw)));
  // 결과지에서 짚어 줄 문장: 크게 느끼는 부담 신호(4 이상), 비어 있는 회복 자원(2 이하), 든든한 회복 자원(4 이상).
  // 공유 링크(점수만 담김)에서도 보이도록 점수에 넣는다. 비어 있으면 저장소에서 빠지므로 읽을 때 (s.strong || [])처럼 읽는다.
  const strong = loadItems.filter((it) => raw(it) >= 4).sort((a, b) => raw(b) - raw(a)).map((it) => it.id);
  const empty = restItems.filter((it) => raw(it) <= 2).sort((a, b) => raw(a) - raw(b)).map((it) => it.id);
  const full = restItems.filter((it) => raw(it) >= 4).map((it) => it.id); // 든든한 자원
  const rawAll = STATE_ITEMS.map(raw);
  const durationSec = Number(meta.durationSec || 0);
  return {
    load,
    rest,
    state: stateOf(load, rest),
    strong,
    empty,
    full,
    check: {
      rawMean: r2(mean(rawAll)),
      sd: r2(sdOf(rawAll)),
      extremeRatio: r2(rawAll.filter((v) => v === 1 || v === 5).length / rawAll.length),
      fast: durationSec > 0 && durationSec < STATE_ITEMS.length * 1.6,
    },
  };
}
