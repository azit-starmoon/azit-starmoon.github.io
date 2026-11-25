// AZIT : Star&Moon — 스트레스 대처 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { STRATEGIES, STRATEGY_ORDER, GROUPS, GROUP_ORDER, SITUATIONS } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { LEVEL_LABEL, GROUP_COLOR, GROUP_DESC, STRATEGY_TEXT, STYLES, FIT_TEXT, FIRST_TEXT, PRACTICE, COUNSEL_Q, COUNSEL_GENERAL, CLOSING } from './content.js';
import { copeRose } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const pill = (lv) => `<span class="cp-pill cp-pill--${lv}">${LEVEL_LABEL[lv]}</span>`;
const sw = (g) => `<i style="background:${GROUP_COLOR[g]}"></i>`;
const fitKey = (fit) => (fit >= 67 ? 'high' : fit >= 34 ? 'mid' : 'low');

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
  const ST = s.strategies;
  const G = s.groups;
  const style = STYLES[s.style];
  const top = s.order[0];
  const fk = fitKey(s.fit);
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  // 키울 무리: 물러서기가 잦으면 물러서기부터, 아니면 덜 쓰는 다가가기 쪽
  const growGroup = G.away >= 50 ? 'away' : G.problem <= G.heart ? 'problem' : 'heart';

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">스트레스 대처 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="cp-kicker">다가가는 대처 ${s.approach}점, 물러서는 대처 ${G.away}점</p>
          <h1 class="cover-headline">${esc(style.name)}</h1>
          <p class="cp-tag">가장 자주 쓰는 대처는 <strong>${esc(jo(STRATEGIES[top].name, '이에요', '예요'))}</strong></p>
        </div>
        <div class="cover-figure cp-cover-fig">${copeRose(ST, { size: 240, center: s.approach, title: `여덟 가지 대처: ${STRATEGY_ORDER.map((k) => `${STRATEGIES[k].name} ${ST[k].score}`).join(', ')}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>문제 다루기</dt><dd>${G.problem}<small>문제를 다루는 대처</small></dd></div>
        <div><dt>마음 다루기</dt><dd>${G.heart}<small>마음을 다루는 대처</small></dd></div>
        <div><dt>물러서기</dt><dd>${G.away}<small>피하기와 자책</small></dd></div>
        <div><dt>상황 맞춤</dt><dd>${s.fit}<small>여섯 상황 중 ${s.fitFirst}번 맞춤</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['strategies', '여덟 가지 대처'],
    ['style', '대처 스타일'],
    ['fit', '상황에 맞추기'],
    ['practice', '키우는 연습'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [`${esc(name)} 님은 <strong>${esc(jo(style.name, '이에요', '예요'))}</strong>. ${esc(style.summary)}`];
  const gOrder = [...GROUP_ORDER].sort((a, b) => G[b] - G[a]);
  paras.push(`세 무리 가운데 <strong>${esc(GROUPS[gOrder[0]].name)}</strong>(${G[gOrder[0]]}점)를 가장 자주 쓰고, ${esc(GROUPS[gOrder[2]].name)}(${G[gOrder[2]]}점)를 가장 덜 써요. 가장 자주 쓰는 대처 하나를 꼽으면 '${esc(STRATEGIES[top].name)}'${hasBatchim(STRATEGIES[top].name) ? '이에요' : '예요'}.`);
  paras.push(`상황에 맞춰 대처를 바꾸는 힘은 ${s.fit}점이에요. ${esc(FIT_TEXT[fk].text)}`);
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 여덟 가지 대처 ───────────────────────────
  const groupsHtml = GROUP_ORDER.map((g) => `<div class="cp-group">
      <h3>${sw(g)}${esc(GROUPS[g].name)}<span class="cp-group-v">${G[g]}</span></h3>
      <p class="cp-group-d">${esc(GROUP_DESC[g])}</p>
      <ul class="cp-bars">${STRATEGY_ORDER.filter((k) => STRATEGIES[k].group === g).map((k) => `<li class="${k === top ? 'is-top' : ''}">
        <span class="nm">${esc(STRATEGIES[k].name)}</span>
        <span class="track" aria-hidden="true"><span class="fill" style="width:${ST[k].score}%;background:${GROUP_COLOR[g]}"></span></span>
        <span class="val">${ST[k].score}</span>${pill(ST[k].level)}
      </li>`).join('')}</ul>
    </div>`).join('');
  const often = s.order.slice(0, 3);
  const cards = often.map((k) => `<article class="cp-card">
      <div class="hd">${sw(STRATEGIES[k].group)}<h3>${esc(STRATEGIES[k].name)}</h3>${pill(ST[k].level)}<span class="score">${ST[k].score}</span></div>
      <p>${esc(STRATEGY_TEXT[k].what)}</p>
      <dl class="cp-facts"><div><dt>도움이 될 때</dt><dd>${esc(STRATEGY_TEXT[k].use)}</dd></div><div><dt>지나칠 때</dt><dd>${esc(STRATEGY_TEXT[k].over)}</dd></div></dl>
    </article>`).join('');
  const strategies = section(
    'strategies',
    '여덟 가지 대처',
    '힘든 일이 생겼을 때 얼마나 자주 쓰는지를 0~100으로 나타냈어요. 문제를 다루는 대처, 마음을 다루는 대처, 물러서는 대처의 세 무리로 묶어 봤어요.',
    `${groupsHtml}<h3 class="rsub">자주 쓰는 대처 자세히</h3><div class="cp-cards">${cards}</div>`
  );

  // ── 대처 스타일 ──────────────────────────────
  const styleSec = section(
    'style',
    '대처 스타일',
    '세 무리를 얼마나 쓰는지로 지금의 대처 스타일을 읽었어요. 스타일은 고정된 성격이 아니라 요즘 기대고 있는 방식이에요.',
    `<div class="domain-read cp-style">
      <h3>${esc(style.name)}</h3>
      <p>${esc(style.summary)}</p>
      <dl class="cp-facts"><div><dt>이 스타일의 힘</dt><dd>${esc(style.strength)}</dd></div><div><dt>살필 점</dt><dd>${esc(style.watch)}</dd></div></dl>
    </div>
    ${s.style !== 'retreat' && G.away >= 62 ? `<p class="final-note">물러서는 대처(${G.away}점)도 자주 쓰는 편이에요. 다가가는 대처와 함께 쓰고 있어서 지금은 버티고 있지만, 지친 날에는 물러서는 쪽으로 기울 수 있어요.</p>` : ''}`
  );

  // ── 상황에 맞추기 ────────────────────────────
  const sitRows = SITUATIONS.map((sit) => {
    const first = s.firsts[sit.id];
    const good = first === (sit.control ? 'act' : 'heart');
    return `<li class="${good ? 'is-fit' : first === 'away' ? 'is-away' : ''}">
      <span class="cp-sit-k">${sit.control ? '바꿀 수 있는 일' : '바꿀 수 없는 일'}</span>
      <p>${esc(sit.prompt.replace(/, 나는$/, ''))}</p>
      <span class="cp-sit-a">먼저: ${esc(FIRST_TEXT[first] || '응답 없음')}${good ? ' <em>잘 맞음</em>' : ''}</span>
    </li>`;
  }).join('');
  const fitSec = section(
    'fit',
    '상황에 맞추기',
    "대처는 상황에 맞을 때 가장 힘을 내요. 내 힘으로 바꿀 수 있는 일에는 '움직이기'가, 바꿀 수 없는 일에는 '마음 다독이기'가 잘 맞아요. 여섯 상황에서 먼저 고른 반응을 살펴봤어요.",
    `<div class="domain-read cp-fit">
      <h3>${esc(FIT_TEXT[fk].title)}</h3>
      <p>${esc(FIT_TEXT[fk].text)}</p>
      <dl class="cp-sums"><div><dt>상황 맞춤</dt><dd>${s.fit}</dd></div><div><dt>잘 맞게 먼저 고른 상황</dt><dd>${s.fitFirst}/6</dd></div><div><dt>피하기를 먼저 고른 상황</dt><dd>${s.awayFirst}/6</dd></div></dl>
    </div>
    <ul class="cp-sits">${sitRows}</ul>`
  );

  // ── 키우는 연습 ──────────────────────────────
  const practice = section(
    'practice',
    '키우는 연습',
    `지금은 <strong>${esc(GROUPS[growGroup].name)}</strong>${growGroup === 'away' ? '를 줄이고 다가가는 쪽으로 한 걸음 옮기는' : '를 늘리는'} 연습이 가장 도움이 돼요. 하나씩 골라 일주일만 해 보세요.`,
    `<ol class="practice-list">${PRACTICE[growGroup].map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 스트레스 대처 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qGroups = [growGroup, ...(growGroup === 'away' ? [G.problem <= G.heart ? 'problem' : 'heart'] : [])];
    const qs = qGroups.map((g) => `<div class="counsel-item"><h3>${esc(GROUPS[g].name)} <span class="cp-counsel-score">${G[g]}</span></h3>
      <ul class="check-list">${COUNSEL_Q[g].map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>`).join('');
    const watch = [];
    if (ST.sb.score >= 62) watch.push('스스로 탓하기가 잦아요. 자책이 우울한 기분이나 무가치감으로 이어지고 있지 않은지 함께 살펴 주세요.');
    if (ST.av.score >= 62 && s.awayFirst >= 3) watch.push('피하고 미루기가 잦고, 상황 문항에서도 피하기를 먼저 고른 경우가 많아요. 미뤄 둔 일이 쌓여 생활에 영향을 주고 있는지 확인해 주세요.');
    if (G.problem >= 70 && s.fitFirst <= 3 && s.firsts.us1 === 'act') watch.push('바꿀 수 없는 일 앞에서도 해결하려고 애쓰는 모습이 보여요. 통제할 수 없는 일을 내려놓는 연습을 함께 다뤄 보세요.');
    if (ST.es.score < 38 && ST.hs.score < 38) watch.push('도움을 구하거나 마음을 나누는 일이 드물어요. 기댈 수 있는 사람이 있는지, 도움을 청하기 어려운 이유가 있는지 살펴 주세요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">열어 볼 질문</h3>${qs}
        <h3 class="counsel-h">함께 살펴볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 대처를 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 대처가 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 대처를 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '자주 한다' 쪽으로 답하는 경향이 보여요. 실제보다 점수가 조금 높게 나왔을 수 있어요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '안 한다' 쪽으로 답하는 경향이 보여요. 실제보다 점수가 조금 낮게 나왔을 수 있어요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>같은 대처 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${strategies}${styleSec}${fitSec}${practice}${counsel}${check}</div>`;
  wireToc(el);
}
