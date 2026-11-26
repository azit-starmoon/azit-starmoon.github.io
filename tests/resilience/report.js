// AZIT : Star&Moon — 회복탄력성 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { FACTORS, FACTOR_ORDER, DOMAINS, DOMAIN_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT, levelOf } from './scoring.js';
import { LEVEL_LABEL, DOMAIN_COLOR, DOMAIN_TEXT, FACTOR_TEXT, OVERALL, ANCHOR, PRACTICE, COUNSEL_Q, COUNSEL_GENERAL, CLOSING } from './content.js';
import { resilRose } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const pill = (lv) => `<span class="cp-pill cp-pill--${lv}">${LEVEL_LABEL[lv]}</span>`;
const sw = (d) => `<i style="background:${DOMAIN_COLOR[d]}"></i>`;
const band = (v) => (v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

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
  const F = s.factors;
  const D = s.domains;
  const overall = OVERALL[s.level];
  const anchor = ANCHOR[s.anchor];
  const topD = s.domainOrder[0];
  const growD = s.grow;
  const top3 = s.order.slice(0, 3);
  const grow2 = s.order.slice(-2).reverse();
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">회복탄력성 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="cp-kicker">회복탄력성 ${s.total}점 · ${esc(LEVEL_LABEL[s.level])}</p>
          <h1 class="cover-headline">${esc(overall.title)}</h1>
          <p class="cp-tag">${F[top3[0]].score >= 62 ? '가장 든든한 힘은' : '지금 가장 많이 기대는 힘은'} <strong>${esc(jo(FACTORS[top3[0]].name, '이에요', '예요'))}</strong></p>
        </div>
        <div class="cover-figure cp-cover-fig">${resilRose(F, { size: 240, center: s.total, title: `아홉 요인: ${FACTOR_ORDER.map((k) => `${FACTORS[k].name} ${F[k].score}`).join(', ')}` })}</div>
      </div>
      <dl class="cover-facts">
        ${DOMAIN_ORDER.map((d) => `<div><dt>${esc(DOMAINS[d].name)}</dt><dd>${D[d]}<small>${esc(DOMAINS[d].lead)}</small></dd></div>`).join('')}
        <div><dt>기대는 곳</dt><dd class="rs-anchor-dd">${s.anchor === 'even' ? '고르게' : esc(DOMAINS[s.anchor].short)}<small>다시 일어날 때 먼저 쓰는 힘</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['domains', '세 영역'],
    ['factors', '아홉 요인 지도'],
    ['anchor', '기대는 곳'],
    ['practice', '키우는 연습'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [`${esc(name)} 님의 회복탄력성은 <strong>${s.total}점</strong>이에요. ${esc(overall.text)}`];
  const lastTop = FACTORS[top3[2]].name;
  if (s.anchor === 'even') paras.push(`세 영역의 점수가 비슷해서, 한쪽에 치우치지 않고 여러 힘을 함께 쓰고 있어요. 그중 ${esc(DOMAINS[growD].name)}(${D[growD]}점)${hasBatchim(DOMAINS[growD].name) ? '은' : '는'} 조금 더 키워 갈 여지가 있는 곳이에요.`);
  else paras.push(`세 영역 가운데 <strong>${esc(DOMAINS[topD].name)}</strong>(${D[topD]}점)${hasBatchim(DOMAINS[topD].name) ? '이' : '가'} ${D[topD] >= 62 ? '가장 든든하고' : '지금 가장 많이 쓰는 힘이고'}, ${esc(DOMAINS[growD].name)}(${D[growD]}점)${hasBatchim(DOMAINS[growD].name) ? '은' : '는'} 앞으로 키워 갈 여지가 가장 큰 곳이에요.`);
  paras.push(`아홉 요인 가운데 지금 가장 많이 기대고 있는 힘은 ${top3.slice(0, 2).map((k) => `'${esc(FACTORS[k].name)}'`).join(', ')}, '${esc(lastTop)}'${hasBatchim(lastTop) ? '이에요' : '예요'}.`);
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 세 영역 ──────────────────────────────────
  const domainCards = DOMAIN_ORDER.map((d) => `<article class="cp-card rs-domain">
      <div class="hd">${sw(d)}<h3>${esc(DOMAINS[d].name)}</h3>${pill(levelOf(D[d]))}<span class="score">${D[d]}</span></div>
      <p class="rs-domain-what">${esc(DOMAIN_TEXT[d].what)}</p>
      <p>${esc(DOMAIN_TEXT[d][band(D[d])])}</p>
    </article>`).join('');
  const domains = section(
    'domains',
    '세 영역',
    '회복탄력성을 세 영역으로 나눠 0~100으로 나타냈어요. 점수가 높을수록 그 힘을 지금 잘 쓰고 있다는 뜻이고, 낮은 곳은 연습으로 키워 갈 수 있는 곳이에요.',
    `<div class="cp-cards">${domainCards}</div>`
  );

  // ── 아홉 요인 지도 ───────────────────────────
  const groupsHtml = DOMAIN_ORDER.map((d) => `<div class="cp-group">
      <h3>${sw(d)}${esc(DOMAINS[d].name)}<span class="cp-group-v">${D[d]}</span></h3>
      <ul class="cp-bars">${FACTOR_ORDER.filter((k) => FACTORS[k].domain === d).map((k) => `<li class="${top3.includes(k) ? 'is-top' : ''}">
        <span class="nm">${esc(FACTORS[k].name)}</span>
        <span class="track" aria-hidden="true"><span class="fill" style="width:${F[k].score}%;background:${DOMAIN_COLOR[d]}"></span></span>
        <span class="val">${F[k].score}</span>${pill(F[k].level)}
      </li>`).join('')}</ul>
    </div>`).join('');
  const strongCards = top3.map((k) => `<article class="cp-card">
      <div class="hd">${sw(FACTORS[k].domain)}<h3>${esc(FACTORS[k].name)}</h3>${pill(F[k].level)}<span class="score">${F[k].score}</span></div>
      <p><strong>${esc(FACTOR_TEXT[k].what)}</strong>. ${esc(FACTOR_TEXT[k].strong)}</p>
    </article>`).join('');
  const factors = section(
    'factors',
    '아홉 요인 지도',
    '세 영역을 이루는 아홉 가지 힘이에요. 표지의 꽃잎 지도와 같은 점수를 영역별로 나눠 놓았어요.',
    `${groupsHtml}<h3 class="rsub">${F[top3[0]].score >= 62 ? '지금 가장 든든한 힘' : '지금 가장 많이 기대는 힘'}</h3><div class="cp-cards">${strongCards}</div>`
  );

  // ── 기대는 곳 ────────────────────────────────
  const anchorSec = section(
    'anchor',
    '다시 일어나는 힘이 기대는 곳',
    '어려움에서 다시 일어설 때 주로 어느 힘에 기대는지 세 영역의 균형으로 읽었어요.',
    `<div class="domain-read">
      <h3>${esc(anchor.title)}</h3>
      <p>${esc(anchor.text)}</p>
      <ul class="rs-balance">${s.domainOrder.map((d) => `<li>${sw(d)}<span class="nm">${esc(DOMAINS[d].name)}</span><span class="track" aria-hidden="true"><span class="fill" style="width:${D[d]}%;background:${DOMAIN_COLOR[d]}"></span></span><span class="val">${D[d]}</span></li>`).join('')}</ul>
    </div>`
  );

  // ── 키우는 연습 ──────────────────────────────
  const growTips = grow2.map((k) => `<li><span><strong>${esc(FACTORS[k].name)}</strong> · ${esc(FACTOR_TEXT[k].grow)}</span></li>`).join('');
  const practice = section(
    'practice',
    '키우는 연습',
    `지금은 <strong>${esc(DOMAINS[growD].name)}</strong>${hasBatchim(DOMAINS[growD].name) ? '을' : '를'} 키우는 연습이 가장 도움이 돼요. 회복탄력성은 연습으로 자라는 힘이에요. 하나만 골라 2주 동안 이어 가 보세요.`,
    `<ol class="practice-list">${PRACTICE[growD].map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>
    <h3 class="rsub">요인별로 한 걸음</h3>
    <ol class="practice-list">${growTips}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 회복탄력성 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qDomains = [growD, ...(D[s.domainOrder[1]] < 50 ? [s.domainOrder[1]] : [])];
    const qs = qDomains.map((d) => `<div class="counsel-item"><h3>${esc(DOMAINS[d].name)} <span class="cp-counsel-score">${D[d]}</span></h3>
      <ul class="check-list">${COUNSEL_Q[d].map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>`).join('');
    const watch = [];
    if (s.total < 38) watch.push('전체 점수가 낮은 편이에요. 최근 겪고 있는 어려움의 크기와 기간, 수면과 식사 같은 기본 생활이 유지되고 있는지 먼저 살펴 주세요.');
    if (F.cn.score < 38) watch.push('기댈 수 있는 사람과의 연결이 약하게 느껴지는 시기예요. 실제로 도움을 청할 수 있는 사람이나 기관이 있는지 함께 확인해 주세요.');
    if (F.ls.score < 38 && F.op.score < 38) watch.push('삶의 만족과 낙관이 함께 낮아요. 우울한 기분이나 무기력이 이어지고 있는지 조심스럽게 물어봐 주세요.');
    if (D.self >= 70 && D.rel < 45) watch.push('혼자 다잡는 힘은 크지만 사람에게 기대는 일은 드물어요. 혼자 버티는 방식이 지금까지 어떤 쓸모가 있었는지 인정해 주고, 기댈 곳을 넓히는 것을 함께 다뤄 보세요.');
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
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 요인을 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 모습이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 요인을 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 실제보다 점수가 조금 높게 나왔을 수 있어요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 실제보다 점수가 조금 낮게 나왔을 수 있어요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>같은 요인 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${domains}${factors}${anchorSec}${practice}${counsel}${check}</div>`;
  wireToc(el);
}
