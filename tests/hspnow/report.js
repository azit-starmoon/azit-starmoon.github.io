// AZIT : Star&Moon — 요즘의 나 체크 결과지
// 짧은 체크라 결과지도 짧게: 요약 → 요즘 상태 지도 → 문장별로 → 해 볼 것 → 상담 메모 → 응답 점검.
// 짚어 줄 문장 목록(strong, empty, full)은 비어 있으면 저장소에서 빠지므로 (s.x || [])로 읽는다.
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { STATE_ITEMS } from '../hsp/items.js';
import { STATES } from '../hsp/content.js';
import { stateMap } from '../hsp/chart.js';
import { stateOf } from '../hsp/scoring.js';
import { FLAT_SD } from './scoring.js';
import { LOAD_TIP, REST_TIP, loadWord, loadJoin, restWord, COUNSEL_Q, RETEST, CLOSING } from './content.js';

const TEXT = Object.fromEntries(STATE_ITEMS.map((it) => [it.id, it.text]));
const list = (v) => (Array.isArray(v) ? v : []).filter((id) => TEXT[id]);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 50);

function section(id, title, lead, body, cls = '') {
  return `<section class="rsec ${cls}" id="r-${id}" aria-labelledby="r-${id}-t">
    <h2 class="rsec-title" id="r-${id}-t">${esc(title)}</h2>
    ${lead ? `<p class="rsec-lead">${lead}</p>` : ''}
    ${body}
  </section>`;
}

export function renderReport(el, rec, ctx = {}) {
  const s = rec.scores || {};
  const name = rec.name || '검사자';
  const showCounsel = !ctx.shared;
  const load = num(s.load);
  const rest = num(s.rest);
  const key = STATES[s.state] ? s.state : stateOf(load, rest);
  const st = STATES[key];
  const strong = list(s.strong);
  const empty = list(s.empty);
  const full = list(s.full);
  const C = s.check || {};
  const careful = Number(C.sd) < FLAT_SD;

  // 상태를 가르는 선(50) 가까이: 문장 하나의 답이 한 칸 바뀌면 넘어갈 수 있는 옆 상태
  const near = new Set();
  if (Math.abs(load - 50) <= 4) near.add(stateOf(load > 50 ? 50 : 51, rest));
  if (Math.abs(rest - 50) <= 4) near.add(stateOf(load, rest > 50 ? 50 : 51));
  near.delete(key);

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">요즘의 나 체크 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="hsp-kicker">요즘 ${esc(st.name)}</p>
          <h1 class="cover-headline">${esc(st.title)}</h1>
          <p class="hsp-tag">최근 2주의 부담 신호 <strong>${load}</strong>, 회복 자원 <strong>${rest}</strong></p>
        </div>
        <div class="cover-figure hsp-cover-fig">${stateMap(load, rest, { size: 250, state: key, title: `요즘 상태 지도: 부담 신호 ${load}, 회복 자원 ${rest}, ${st.name}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>요즘 상태</dt><dd>${esc(st.name)}<small>최근 2주</small></dd></div>
        <div><dt>부담 신호</dt><dd>${load}<small>${esc(loadWord(load))}</small></dd></div>
        <div><dt>회복 자원</dt><dd>${rest}<small>${esc(restWord(rest))}</small></dd></div>
        <div><dt>응답</dt><dd>${careful ? '확인 필요' : '일관됨'}<small>응답 점검 참고</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['state', '요즘 상태'],
    ['items', '문장별로'],
    ['growth', '해 볼 것'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [`${esc(name)} 님은 요즘 <strong>${esc(st.name)}</strong> 자리에 있어요. 부담 신호는 ${load}점으로 ${esc(loadJoin(load))}, 회복 자원은 ${rest}점으로 ${esc(restWord(rest))}.`];
  const marks = [];
  if (strong.length) marks.push(`크게 느끼는 부담 신호가 ${strong.length}개`);
  if (empty.length) marks.push(`비어 있는 회복 자원이 ${empty.length}개`);
  if (full.length) marks.push(`든든한 회복 자원이 ${full.length}개`);
  paras.push(marks.length ? `열두 문장 가운데 ${marks.join(', ')} 있어요. '문장별로'에서 하나씩 짚어 봤어요.` : '열두 문장 가운데 크게 느끼는 부담 신호도, 비어 있는 회복 자원도 없어요. 대부분 중간쯤에 답했어요.');
  if (near.size) paras.push(`부담 신호나 회복 자원이 상태를 가르는 선(50) 가까이에 있어요. 문장 한두 개의 답에 따라 ${[...near].map((k) => `'${esc(STATES[k].name)}'`).join(', ')} 쪽으로 넘어갈 수 있는 자리라, 그 상태의 모습도 함께 떠올려 보면 좋아요.`);
  const summary = section(
    'summary',
    '요약',
    '이 체크는 타고난 기질이 아니라 최근 2주의 상태를 재요. 상황과 환경이 바뀌면 함께 달라지는 게 자연스러워요.',
    `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`
  );

  // ── 요즘 상태 (자세한 해석) ────────────────────
  // 지도는 표지에 있으므로, 여기서는 두 점수가 가르는 선(50)에서 얼마나 떨어져 있는지를 막대로 보여 준다
  const meter = (label, v, word) => `<li><span class="nm">${esc(label)}<small>${esc(word)}</small></span>
      <span class="sn-track" aria-hidden="true"><span class="fill" style="width:${Math.max(0, Math.min(100, v))}%"></span><i></i></span>
      <span class="val">${v}</span></li>`;
  const state = section(
    'state',
    '요즘 상태',
    '두 점수가 가운데 선(50)을 넘는지로 네 상태를 나눠요. 표지의 지도에서 가로는 회복 자원, 세로는 부담 신호예요.',
    `<div class="sn-state">
      <ul class="sn-meters">${meter('부담 신호', load, loadWord(load))}${meter('회복 자원', rest, restWord(rest))}</ul>
      <div class="hsp-state-read">
        <p class="hsp-kicker">${esc(st.name)}</p>
        <h3>${esc(st.title)}</h3>
        <p>${esc(st.text)}</p>
      </div>
    </div>`
  );

  // ── 문장별로 ─────────────────────────────────
  const tipList = (ids, tips) => `<ul class="sn-items">${ids.map((id) => `<li><p class="sn-q">${esc(TEXT[id])}</p><p>${esc(tips[id])}</p></li>`).join('')}</ul>`;
  const items = section(
    'items',
    '문장별로',
    "부담 신호는 '그렇다' 이상으로 답한 문장을, 회복 자원은 '아니다' 이하로 답한 문장을 골랐어요.",
    `<h3 class="rsub">크게 느끼는 부담 신호</h3>
    ${strong.length ? tipList(strong, LOAD_TIP) : '<p class="sn-none">크게 느낀다고 답한 부담 신호는 없어요.</p>'}
    <h3 class="rsub">비어 있는 회복 자원</h3>
    ${empty.length ? tipList(empty, REST_TIP) : '<p class="sn-none">비어 있다고 답한 회복 자원은 없어요.</p>'}
    ${full.length ? `<h3 class="rsub">지금 나를 지켜 주는 자원</h3>
    <p class="sn-lead">'그렇다' 이상으로 답한 회복 자원이에요. 힘든 시기에 가장 먼저 다시 꺼내 쓸 것들이에요.</p>
    <ul class="check-list">${full.map((id) => `<li>${esc(TEXT[id])}</li>`).join('')}</ul>` : ''}`
  );

  // ── 해 볼 것 (성장 방향) ───────────────────────
  const growth = section(
    'growth',
    '이번 주에 해 볼 것',
    '크게 바꾸기보다, 이번 주에 할 수 있는 작은 것 하나를 골라 보세요.',
    `<ul class="check-list">${st.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h3 class="rsub">다시 해 보기</h3>
    <p class="sn-lead">${esc(RETEST)}</p>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 요즘의 나 체크 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const watch = [st.counsel];
    if (strong.includes('l3') && strong.includes('l4')) watch.push('감정이 쉽게 넘치고 잠들기도 어렵다고 답했어요. 수면과 기분이 함께 흔들리는 시기라, 이런 상태가 얼마나 이어졌는지 먼저 물어 주세요.');
    if (load >= 75 && rest < 25) watch.push('부담 신호가 아주 크고 회복 자원은 거의 비어 있어요. 출근이나 등교, 식사처럼 일상이 유지되고 있는지부터 확인해 주세요.');
    if (empty.includes('r2') && empty.includes('r6')) watch.push('이해해 주는 사람도, 쉬고 싶다고 말할 곳도 없다고 답했어요. 상담 자리가 그 역할을 잠시 해 줄 수 있어요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 요즘 실제로 어떤지 함께 확인해 주세요.');
    watch.push('이 체크는 감각처리 민감성 검사 2부와 같은 문장, 같은 계산이에요. 두 검사를 같은 이름과 생년월일로 했다면 종합 결과지의 \'달라진 점\'에서 한 줄로 이어 볼 수 있어요.');
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">열어 볼 질문</h3>
        <ul class="check-list">${COUNSEL_Q.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
        <h3 class="counsel-h">함께 볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (careful) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 요즘의 모습을 충분히 담지 못했을 수 있어요.');
  else notes.push('열두 문장에 고르게 답했어요.');
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const secs = Number(rec.durationSec || 0);
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>응답 흐름</dt><dd>${careful ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>걸린 시간</dt><dd>${secs ? (secs < 90 ? `${Math.round(secs)}초` : `약 ${Math.round(secs / 60)}분`) : '–'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${state}${items}${growth}${counsel}${check}</div>`;
  wireToc(el);
}
