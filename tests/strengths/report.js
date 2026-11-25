// AZIT : Star&Moon — 성격 강점 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { STRENGTHS, VIRTUES, VIRTUE_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { VIRTUE_COLOR, TIER_LABEL, VIRTUE_TEXT, STRENGTH_TEXT, PAIR_NOTE, STEPS, COUNSEL_GENERAL, CLOSING } from './content.js';
import { strengthWheel } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const N = (s) => STRENGTHS[s].name;
const VN = (v) => VIRTUES[v].name;
const dot = (v) => `<i style="background:${VIRTUE_COLOR[v]}"></i>`;
const chip = (v) => `<span class="sg-chip">${dot(v)}${esc(VN(v))}</span>`;

function section(id, title, lead, body, cls = '') {
  return `<section class="rsec ${cls}" id="r-${id}" aria-labelledby="r-${id}-t">
    <h2 class="rsec-title" id="r-${id}-t">${esc(title)}</h2>
    ${lead ? `<p class="rsec-lead">${lead}</p>` : ''}
    ${body}
  </section>`;
}

export function renderReport(el, rec, ctx = {}) {
  const s = rec.scores;
  const name = rec.name || '검사자';
  const showCounsel = !ctx.shared;
  const S = s.strengths;
  const V = s.virtues;
  const top = s.top;
  const tv = s.topVirtue;
  const sig = s.sig;
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  const T = STRENGTH_TEXT[top];

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">성격 강점 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="sg-kicker">첫째 강점 ${esc(N(top))}</p>
          <h1 class="cover-headline">${esc(T.title)}</h1>
          <p class="sg-tag">대표 강점 다섯 가지</p>
          <ol class="sg-mini">${sig.map((k) => `<li>${dot(STRENGTHS[k].virtue)}<span>${esc(N(k))}</span></li>`).join('')}</ol>
        </div>
        <div class="cover-figure sg-cover-fig">${strengthWheel(S, { size: 270, title: `24강점 바퀴: 대표 강점 ${sig.map((k, i) => `${i + 1}위 ${N(k)} ${S[k].score}점`).join(', ')}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>첫째 강점</dt><dd>${esc(N(top))}<small>${S[top].score}점</small></dd></div>
        <div><dt>힘이 모인 덕목</dt><dd>${esc(VN(tv))}<small>${V[tv].score}점</small></dd></div>
        <div><dt>강점의 높낮이</dt><dd>${C.flat ? '고른 편' : '뚜렷함'}<small>차이 ${s.gap}점</small></dd></div>
        <div><dt>응답</dt><dd>${careful ? '확인 필요' : '일관됨'}<small>응답 점검 참고</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['sig', '대표 강점'],
    ['ranks', '24강점 순위'],
    ['virtues', '덕목 지도'],
    ['use', '강점 쓰는 법'],
    ['growth', '성장 방향'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const sigList = sig.map((k) => esc(N(k)));
  const sigVirtues = [...new Set(sig.map((k) => STRENGTHS[k].virtue))];
  const paras = [
    `${esc(name)} 님의 첫째 강점은 <strong>${esc(jo(N(top), '이에요', '예요'))}</strong>. ${esc(T.what)}`,
    `대표 강점 다섯 가지는 ${sigList.slice(0, 4).join(', ')}, ${esc(jo(N(sig[4]), '이에요', '예요'))}. 이 강점들을 쓸 때 가장 나답고, 힘이 덜 들고, 오히려 기운이 나요.`,
    `여섯 덕목 가운데 힘이 가장 모인 곳은 <strong>${esc(jo(VN(tv), '이에요', '예요'))}</strong>(${V[tv].score}점). ${esc(VIRTUE_TEXT[tv].what)}`,
  ];
  if (C.flat) paras.push(`24강점의 점수 차이가 크지 않은 편이에요(대표 강점과 덜 쓰는 강점의 평균 차이 ${s.gap}점). 여러 강점을 고르게 쓰는 사람이라, 순위가 한두 칸 바뀌는 것보다 위쪽 강점들의 결을 함께 보는 것이 좋아요.`);
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 대표 강점 ────────────────────────────────
  const sigCards = sig.map((k) => {
    const t = STRENGTH_TEXT[k];
    const v = STRENGTHS[k].virtue;
    return `<article class="sg-card" style="--vc:${VIRTUE_COLOR[v]}">
      <div class="hd"><span class="sg-rank">${S[k].rank}</span><h3>${esc(N(k))}</h3>${chip(v)}<span class="score">${S[k].score}</span></div>
      <p class="what">${esc(t.what)}</p>
      <p>${esc(t.show)}</p>
      <h4>새롭게 써 보기</h4>
      <ul class="check-list">${t.use.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="sg-over"><strong>지나치면</strong> ${esc(t.over)}</p>
    </article>`;
  }).join('');
  const sigSec = section(
    'sig',
    '대표 강점 다섯 가지',
    '대표 강점은 나다움의 중심에 있는 강점이에요. 쓸 때 자연스럽고, 쓰고 나면 오히려 기운이 나요. 순위 차례대로 하나씩 살펴봐요.',
    `<div class="sg-cards">${sigCards}</div>`
  );

  // ── 24강점 순위 ──────────────────────────────
  const row = (k) => {
    const v = STRENGTHS[k].virtue;
    return `<li class="sg-row sg-row--${S[k].tier}">
      <span class="rk">${S[k].rank}</span>
      <span class="nm">${dot(v)}${esc(N(k))}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${S[k].score}%;background:${VIRTUE_COLOR[v]}"></span></span>
      <span class="val">${S[k].score}</span>
    </li>`;
  };
  const groups = [['sig', s.order.slice(0, 5)], ['mid', s.order.slice(5, 19)], ['rest', s.order.slice(19)]];
  const ranks = section(
    'ranks',
    '24강점 순위',
    '24강점을 내 안에서 앞서는 차례대로 놓았어요. 순위는 다른 사람과 비교한 것이 아니라 나 안에서의 차례예요. 아래쪽 강점도 약점이 아니라 지금 덜 꺼내 쓰는 힘이에요.',
    `${groups.map(([tier, list]) => `<h3 class="sg-tier">${TIER_LABEL[tier]} <small>${list.length}개</small></h3><ol class="sg-rows">${list.map(row).join('')}</ol>`).join('')}
    <div class="legend sg-legend">${VIRTUE_ORDER.map((v) => `<span>${dot(v)}${esc(VN(v))}</span>`).join('')}</div>`
  );

  // ── 덕목 지도 ────────────────────────────────
  const vbars = `<ul class="sg-vbars">${s.vOrder.map((v) => `<li>
      <span class="nm">${dot(v)}${esc(VN(v))}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${V[v].score}%;background:${VIRTUE_COLOR[v]}"></span></span>
      <span class="val">${V[v].score}</span>
      <span class="sg-vsig">${V[v].sig ? `대표 ${V[v].sig}` : ''}</span>
    </li>`).join('')}</ul>`;
  const low = s.vOrder[s.vOrder.length - 1];
  const vcards = [tv, s.vOrder[1]].map((v, i) => `<article class="sg-vcard" style="--vc:${VIRTUE_COLOR[v]}">
      <p class="sg-kicker">${i === 0 ? '가장 힘이 모인 덕목' : '두 번째 덕목'}</p>
      <h3>${esc(VN(v))} <small>${VIRTUES[v].strengths.map(N).join(', ')}</small></h3>
      <p>${esc(VIRTUE_TEXT[v].high)}</p>
    </article>`).join('');
  const virtues = section(
    'virtues',
    '여섯 덕목 지도',
    '24강점은 여섯 덕목으로 묶여요. 덕목 점수는 그 안에 든 강점 점수의 평균이에요. 어느 덕목에 힘이 모였는지 보면 내가 어떤 방식으로 세상에 기여하는지 보여요.',
    `${vbars}<div class="sg-vcards">${vcards}</div>
    <p class="sg-note">${esc(sigVirtues.length <= 2 && sig.filter((k) => STRENGTHS[k].virtue === sigVirtues[0]).length >= 3 ? PAIR_NOTE.same(VN(sigVirtues[0])) : PAIR_NOTE.mixed)} 상대적으로 덜 쓰는 덕목은 ${esc(jo(VN(low), '이에요', '예요'))}(${V[low].score}점). ${esc(VIRTUE_TEXT[low].what)}</p>`
  );

  // ── 강점 쓰는 법 ─────────────────────────────
  const plan = sig.slice(0, 3).map((k, i) => `<li><span><strong>${['첫째 주', '둘째 주', '셋째 주'][i]}, ${esc(N(k))}.</strong> ${esc(STRENGTH_TEXT[k].use[0])}</span></li>`).join('');
  const restTwo = s.order.slice(-2).reverse();
  const use = section(
    'use',
    '강점 쓰는 법',
    '강점은 알아보는 것만으로는 부족하고, 새로운 방식으로 써 볼 때 더 커져요. 대표 강점으로 3주 연습을 하고, 덜 쓰는 강점은 작게 빌려 써 봐요.',
    `<h3 class="rsub">3주 강점 연습</h3>
    <ol class="practice-list">${plan}</ol>
    <h3 class="rsub">균형 잡기</h3>
    <div class="two-lists">
      <div><h4>대표 강점이 지나칠 때</h4><ul class="check-list check-list--soft">${sig.slice(0, 2).map((k) => `<li><strong>${esc(N(k))}</strong> ${esc(STRENGTH_TEXT[k].over)}</li>`).join('')}</ul></div>
      <div><h4>덜 쓰는 강점 빌려 쓰기</h4><ul class="check-list">${restTwo.map((k) => `<li><strong>${esc(N(k))}</strong> ${esc(STRENGTH_TEXT[k].borrow)}</li>`).join('')}</ul></div>
    </div>`
  );

  // ── 성장 방향 ────────────────────────────────
  const growth = section(
    'growth',
    '강점으로 자라는 순서',
    '약점을 메우는 것보다 강점을 키우는 쪽이 더 빨리, 더 즐겁게 자라요. 아래 순서를 천천히 되풀이해 보세요.',
    `<ol class="practice-list">${STEPS.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 성격 강점 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = sig.slice(0, 3).map((k) => `<li><strong>${esc(N(k))}</strong> ${esc(STRENGTH_TEXT[k].counsel)}</li>`).join('');
    const watch = [];
    const lowSig = sig.filter((k) => S[k].level !== 'high');
    if (lowSig.length >= 3) watch.push('대표 강점 가운데 점수가 뚜렷한(75점 이상) 강점이 적어요. 순위로는 위에 있지만 스스로 강점이라고 느끼지 못하고 있을 수 있어요. 최근에 강점을 쓸 기회가 줄었는지 함께 살펴봐 주세요.');
    if (s.total >= 80) watch.push(`24강점 평균이 ${s.total}점으로 높아요. 자신을 좋게 보는 힘이 크거나, 바라는 모습으로 답했을 수 있어요. 실제 장면을 함께 떠올려 보면 좋아요.`);
    const lifeRest = ['hop', 'zes', 'gra', 'lov'].filter((k) => S[k].tier === 'rest').map(N);
    if (lifeRest.length >= 2) watch.push(`희망, 활력, 감사, 사랑 가운데 ${lifeRest.slice(0, -1).join(', ')}, ${jo(lifeRest[lifeRest.length - 1], '이', '가')} 덜 쓰는 강점에 있어요. 이 강점들은 삶의 만족과 가깝게 이어져 있어서, 요즘의 기분과 에너지를 함께 물어봐 주세요.`);
    if (C.flat) watch.push(`강점 사이 차이가 작아요(${s.gap}점). 대표 강점을 단정하기보다 상위 열 개 안에서 검사자가 가장 나답다고 느끼는 강점을 직접 고르게 해 보세요.`);
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 순위를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">대표 강점으로 열어 볼 질문</h3>
        <ul class="check-list">${qs}<li><strong>강점 확인</strong> 대표 강점 다섯 가지 가운데 '이건 정말 나다'고 느끼는 것과 '잘 모르겠다'고 느끼는 것은 무엇인가요?</li></ul>
        <h3 class="counsel-h">함께 볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 강점 사이 차이가 충분히 드러나지 않았을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 강점을 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 모습이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 강점을 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 점수가 전체로 조금 높게 나왔을 수 있어서, 점수보다 순위를 중심으로 읽어 주세요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 점수가 전체로 조금 낮게 나왔을 수 있어서, 점수보다 순위를 중심으로 읽어 주세요.");
  if (C.flat) notes.push('강점 사이 점수 차이가 작아서, 순위가 한두 칸 바뀔 수 있어요.');
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>같은 강점 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${sigSec}${ranks}${virtues}${use}${growth}${counsel}${check}</div>`;
  wireToc(el);
}

