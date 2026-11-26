// AZIT : Star&Moon — 자아분화 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { ITEMS, FACETS, FACET_ORDER, LIKERT_SCALE } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { TOTAL_LABEL, FACET_LABEL, FACET_COLOR, OVERALL, FACET_TEXT, STYLES, COUNSEL_Q, COUNSEL_GENERAL, PRACTICE_GENERAL, CLOSING } from './content.js';
import { selfCircles } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const isUp = (k) => FACETS[k].dir === 'up';
// 내 입장 지키기는 단계별 색, 나머지 셋은 높고 낮음만 담담하게
const pill = (k, lv) => (isUp(k)
  ? `<span class="cp-pill cp-pill--${lv}">${TOTAL_LABEL[lv]}</span>`
  : `<span class="cp-pill cp-pill--mid">${FACET_LABEL[lv]}</span>`);
const sw = (k) => `<i style="background:${FACET_COLOR[k]}"></i>`;
const band = (lv) => (lv === 'vhigh' || lv === 'high' ? 'high' : lv);
const answerLabel = (v) => (LIKERT_SCALE.find((x) => x.value === Number(v)) || {}).label || '';

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
  const F = s.facets;
  const O = OVERALL[s.level];
  const S = STYLES[s.style];
  const grow = s.grow;
  const best = s.order[s.order.length - 1];
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  const lvName = (k) => (isUp(k) ? TOTAL_LABEL[F[k].level] : FACET_LABEL[F[k].level]);
  const caption = '원이 겹칠수록 융합, 멀어질수록 단절이 커요. 테두리가 굵을수록 내 입장이 단단하고, 바깥 물결은 감정 반응성이에요.';

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">자아분화 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="cp-kicker">자아분화 ${s.total}점, ${esc(TOTAL_LABEL[s.level])}</p>
          <h1 class="cover-headline">${esc(O.title)}</h1>
          <p class="cp-tag">관계 방식은 <strong>${esc(S.name)}</strong>에 가까워요</p>
        </div>
        <div class="cover-figure dc-cover-fig">${selfCircles(F, { size: 300 })}<p class="dc-cap">${esc(caption)}</p></div>
      </div>
      <dl class="cover-facts">
        <div><dt>분화 지수</dt><dd>${s.total}<small>${esc(TOTAL_LABEL[s.level])}</small></dd></div>
        <div><dt>${esc(FACETS.ip.name)}</dt><dd>${F.ip.score}<small>${esc(TOTAL_LABEL[F.ip.level])}</small></dd></div>
        <div><dt>${esc(FACETS.er.name)}</dt><dd>${F.er.score}<small>${esc(FACET_LABEL[F.er.level])}</small></dd></div>
        <div><dt>관계 방식</dt><dd>${esc(S.short)}<small>융합 ${F.fo.score}, 단절 ${F.ec.score}</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['facets', '네 지표'],
    ['style', '관계 방식'],
    ['family', '가족 장면'],
    ['practice', '연습'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [
    `${esc(name)} 님의 자아분화 지수는 <strong>${s.total}점</strong>(${esc(TOTAL_LABEL[s.level])})이에요. ${esc(O.text)}`,
    `네 지표 가운데 가장 여유가 있는 곳은 <strong>${esc(FACETS[best].name)}</strong>(${F[best].score}점, ${esc(lvName(best))})이고, 가장 살펴볼 곳은 <strong>${esc(FACETS[grow].name)}</strong>(${F[grow].score}점, ${esc(lvName(grow))})이에요.`,
    `가까움과 거리를 다루는 방식은 <strong>${esc(S.name)}</strong>에 가까워요. ${esc(S.text)}`,
  ];
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 네 지표 ──────────────────────────────────
  const bars = `<ul class="cp-bars">${FACET_ORDER.map((k) => `<li class="${k === grow ? 'is-top' : ''}">
      <span class="nm">${esc(FACETS[k].name)}<small class="df-hint">${esc(FACETS[k].hint)}</small></span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${F[k].score}%;background:${FACET_COLOR[k]}"></span></span>
      <span class="val">${F[k].score}</span>${pill(k, F[k].level)}
    </li>`).join('')}</ul>`;
  const cards = FACET_ORDER.map((k) => `<article class="cp-card ${k === grow ? 'is-focus' : ''}">
      <div class="hd">${sw(k)}<h3>${esc(FACETS[k].name)}</h3>${pill(k, F[k].level)}<span class="score">${F[k].score}</span></div>
      <p class="rs-domain-what">${esc(FACET_TEXT[k].what)}</p>
      <p>${esc(FACET_TEXT[k][band(F[k].level)])}</p>
    </article>`).join('');
  const facetsSec = section(
    'facets',
    '분화의 네 지표',
    '자아분화는 가까운 관계 안에서도 생각과 감정을 구분하고 나로 서 있는 힘이에요. 내 입장 지키기는 높을수록, 나머지 셋은 낮을수록 분화된 쪽이에요. 분화 지수는 네 지표를 같은 방향으로 맞춰 평균한 값이에요.',
    `${bars}<div class="cp-cards">${cards}</div>`
  );

  // ── 관계 방식 ────────────────────────────────
  const styleSec = section(
    'style',
    '가까움과 거리를 다루는 방식',
    '관계에서 긴장이 높아질 때 사람은 상대에게 더 붙거나(융합), 멀어져서(단절) 불안을 다뤄요. 두 지표의 조합으로 지금의 관계 방식을 읽었어요.',
    `<div class="domain-read">
      <p class="cp-kicker">관계 방식</p>
      <h3>${esc(S.name)}</h3>
      <p>${esc(S.text)}</p>
      <ul class="rs-balance">${['fo', 'ec'].map((k) => `<li>${sw(k)}<span class="nm">${esc(FACETS[k].name)}</span><span class="track" aria-hidden="true"><span class="fill" style="width:${F[k].score}%;background:${FACET_COLOR[k]}"></span></span><span class="val">${F[k].score}</span></li>`).join('')}</ul>
      <p class="es-tip"><strong>도움이 되는 방향</strong> ${esc(S.tip)}</p>
    </div>`
  );

  // ── 가족 장면 ────────────────────────────────
  const fam = (s.family || []).map((x) => ({ ...x, it: ITEMS.find((it) => it.id === x.id) })).filter((x) => x.it);
  const strain = fam.filter((x) => x.strain >= 4).sort((a, b) => b.strain - a.strain).slice(0, 3);
  const steady = fam.filter((x) => x.strain <= 2).sort((a, b) => a.strain - b.strain).slice(0, 2);
  const famList = (arr) => `<ul class="df-fam">${arr.map((x) => `<li><span class="q">${esc(x.it.text)}</span><span class="a">${esc(answerLabel(x.raw))}</span></li>`).join('')}</ul>`;
  const familySec = section(
    'family',
    '가족 장면에서',
    '분화는 무엇보다 가족 안에서 드러나요. 가족을 묻는 아홉 문장 가운데 눈여겨볼 답과 든든한 답을 골랐어요.',
    `<div class="cp-cards">
      <article class="cp-card"><div class="hd"><h3>살펴볼 장면</h3></div>${strain.length ? famList(strain) : '<p class="ls-empty">가족 장면에서 크게 흔들린다고 답한 문장은 없어요.</p>'}</article>
      <article class="cp-card"><div class="hd"><h3>든든한 장면</h3></div>${steady.length ? famList(steady) : '<p class="ls-empty">가족 장면에서 뚜렷하게 여유를 보인 문장은 아직 없어요. 작은 장면부터 여유를 만들어 갈 수 있어요.</p>'}</article>
    </div>`
  );

  // ── 연습 ─────────────────────────────────────
  const practices = [
    { t: `${FACETS[grow].name} 연습`, d: FACET_TEXT[grow].practice },
    { t: S.pt, d: S.tip },
    PRACTICE_GENERAL,
  ];
  const practiceSec = section(
    'practice',
    '나로 서는 연습',
    '분화는 생각으로 바뀌기보다, 긴장된 순간에 평소와 다르게 한 번 반응해 보는 경험이 쌓이며 자라요. 하나를 골라 일주일만 해 보세요.',
    `<ol class="practice-list">${practices.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 자아분화 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = [...COUNSEL_Q.general, COUNSEL_Q[grow]];
    const watch = [];
    if (s.total < 40) watch.push('분화 지수가 낮아요. 가족 관계에서 큰 긴장이나 상처가 있는지, 그 긴장이 지금 생활에 얼마나 영향을 주는지 천천히 들어 주세요.');
    if (F.er.score >= 75) watch.push('감정 반응성이 매우 높아요. 갈등 상황에서 말이나 행동이 격해지는지, 그 뒤 후회가 되풀이되는지 살펴 주세요.');
    if (F.ec.score >= 75) watch.push('감정적 단절이 매우 높아요. 가족이나 가까운 사람과 끊어진 관계가 있는지, 그로 인한 외로움이 있는지 살펴 주세요.');
    if (F.fo.score >= 75) watch.push('융합이 매우 높아요. 가족의 문제를 떠안느라 자기 삶이 미뤄지고 있지 않은지 살펴 주세요.');
    if (s.style === 'swing') watch.push('가까움과 거리 사이를 오가는 흐름이 보여요. 연인이나 배우자 관계에서도 같은 흐름이 되풀이되는지 함께 보면 좋아요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">열어 볼 질문</h3>
        <ul class="check-list">${qs.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
        <h3 class="counsel-h">함께 살펴볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 지표를 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 관계에 따라 내 모습이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 지표를 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 점수를 해석할 때 함께 고려해 주세요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 점수를 해석할 때 함께 고려해 주세요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>같은 지표 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${facetsSec}${styleSec}${familySec}${practiceSec}${counsel}${check}</div>`;
  wireToc(el);
}
