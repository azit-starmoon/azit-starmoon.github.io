// AZIT : Star&Moon — 감각처리 민감성 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { FACETS, FACET_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { FACET_COLOR, LEVEL_LABEL, OVERALL, FACET_TEXT, PAIR_TEXT, STATES, ENV_GROUPS, ENV_LOW, LOW_TWO, STEPS, COUNSEL_GENERAL, CLOSING } from './content.js';
import { sensFlower, stateMap } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const isHigh = (lv) => lv === 'high' || lv === 'vhigh';
const pill = (lv) => `<span class="hsp-pill hsp-pill--${lv}">${LEVEL_LABEL[lv]}</span>`;
const dot = (f) => `<i style="background:${FACET_COLOR[f]}"></i>`;
const levelText = (f, lv) => FACET_TEXT[f][isHigh(lv) ? 'high' : lv === 'mid' ? 'mid' : 'low'];
// '깊이 생각하기(72점)가'처럼 괄호를 넣어도 조사는 앞말에 맞춘다
const withScore = (f, score, withB, without) => `${esc(FACETS[f].name)}(${score}점)${hasBatchim(FACETS[f].name) ? withB : without}`;

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
  const O = OVERALL[s.level];
  const F = s.facets;
  const order = s.order;
  const top = order[0];
  const highs = order.filter((f) => isHigh(F[f].level));
  const st = STATES[s.state];
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">감각처리 민감성 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="hsp-kicker">민감성 ${s.total}점, ${LEVEL_LABEL[s.level]}</p>
          <h1 class="cover-headline">${esc(O.title)}</h1>
          <p class="hsp-tag">가장 두드러진 갈래는 <strong>${esc(jo(FACETS[top].name, '이에요', '예요'))}</strong></p>
        </div>
        <div class="cover-figure hsp-cover-fig">${sensFlower(F, { size: 250, total: s.total, title: `네 갈래 민감성 꽃: ${FACET_ORDER.map((f) => `${FACETS[f].name} ${F[f].score}`).join(', ')}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>민감성</dt><dd>${s.total}<small>${LEVEL_LABEL[s.level]}</small></dd></div>
        <div><dt>두드러진 갈래</dt><dd>${esc(FACETS[top].short)}<small>${F[top].score}점</small></dd></div>
        <div><dt>요즘의 나</dt><dd>${esc(st.name)}<small>부담 ${s.load}, 회복 ${s.rest}</small></dd></div>
        <div><dt>응답</dt><dd>${careful ? '확인 필요' : '일관됨'}<small>응답 점검 참고</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['facets', '네 갈래'],
    ['pattern', '섬세함의 결'],
    ['state', '요즘의 나'],
    ['env', '맞는 환경'],
    ['growth', '성장 방향'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [`${esc(name)} 님은 <strong>${esc(jo(O.title, '이에요', '예요'))}</strong>. ${esc(O.summary)}`];
  if (highs.length >= 2) {
    const list = highs.map((f) => esc(FACETS[f].name)).join(', ');
    paras.push(`네 갈래 가운데 ${list}에서 섬세함이 두드러져요. 가장 높은 갈래는 ${withScore(top, F[top].score, '이에요', '예요')}.`);
  } else if (highs.length === 1) {
    paras.push(`네 갈래 가운데 ${withScore(top, F[top].score, '에서', '에서')} 섬세함이 가장 두드러져요. ${esc(FACET_TEXT[top].what)}`);
  } else {
    paras.push(`네 갈래 모두 보통 이하예요. 그중에서는 ${withScore(top, F[top].score, '이', '가')} 가장 높아요.`);
  }
  paras.push(`요즘의 나는 <strong>${esc(st.name)}</strong>에 가까워요(부담 신호 ${s.load}, 회복 자원 ${s.rest}). ${esc(st.text.split('. ')[0])}.`);
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 네 갈래 ──────────────────────────────────
  const bars = `<ul class="hsp-bars">${FACET_ORDER.map((f) => `<li class="${f === top ? 'is-top' : ''}">
      <span class="nm">${dot(f)}${esc(FACETS[f].name)}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${F[f].score}%;background:${FACET_COLOR[f]}"></span></span>
      <span class="val">${F[f].score}</span>${pill(F[f].level)}
    </li>`).join('')}</ul>`;
  const cards = order.map((f) => `<article class="hsp-facet">
      <div class="hd">${dot(f)}<h3>${esc(FACETS[f].name)}</h3>${pill(F[f].level)}<span class="score">${F[f].score}</span></div>
      <p class="what">${esc(FACET_TEXT[f].what)}</p>
      <p>${esc(levelText(f, F[f].level))}</p>
    </article>`).join('');
  const facets = section(
    'facets',
    '민감성의 네 갈래',
    '섬세함은 한 가지가 아니에요. 깊이 생각하기, 쉽게 벅참, 감정의 울림, 미세한 감지의 네 갈래로 나눠 보면 내 섬세함이 어디에서 켜지는지 보여요.',
    `${bars}<div class="hsp-facets">${cards}</div>`
  );

  // ── 섬세함의 결 ──────────────────────────────
  const pairs = [];
  for (let i = 0; i < FACET_ORDER.length; i++) {
    for (let j = i + 1; j < FACET_ORDER.length; j++) {
      const a = FACET_ORDER[i];
      const b = FACET_ORDER[j];
      if (isHigh(F[a].level) && isHigh(F[b].level)) pairs.push({ key: a + b, sum: F[a].score + F[b].score, a, b });
    }
  }
  pairs.sort((x, y) => y.sum - x.sum);
  const useLow = !highs.length && s.level === 'low';
  const noteText = highs.length === 1
    ? `섬세함이 ${esc(FACETS[top].name)}에 모여 있어요. 다른 갈래는 비교적 무던해서, 이 갈래가 건드려지는 상황만 잘 알아 두면 충분해요.`
    : useLow ? '네 갈래 모두 높지 않아서, 섬세함이 한쪽에 모인 결은 보이지 않아요. 대신 자극에 쉽게 흔들리지 않는 단단함이 있어요.'
      : '특별히 두드러진 갈래 없이 고르게 반응하는 편이에요.';
  const pairHtml = pairs.length
    ? `<ul class="hsp-pairs">${pairs.slice(0, 2).map((p) => `<li><span class="hsp-pair-k">${dot(p.a)}${dot(p.b)}${esc(jo(FACETS[p.a].short, '과', '와'))} ${esc(FACETS[p.b].short)}</span><p>${esc(PAIR_TEXT[p.key])}</p></li>`).join('')}</ul>`
    : `<p class="hsp-note">${noteText}</p>`;
  const strong = order.slice(0, 2).filter((f) => F[f].level !== 'low');
  const gifts = useLow || !strong.length ? LOW_TWO.gift : strong.map((f) => FACET_TEXT[f].gift);
  const weights = useLow || !strong.length ? LOW_TWO.weight : strong.map((f) => FACET_TEXT[f].weight);
  const pattern = section(
    'pattern',
    '섬세함의 결',
    '높게 나온 갈래들이 함께 어떤 결을 만드는지, 그 섬세함이 주는 힘과 무게를 함께 살펴봐요.',
    `${pairHtml}
    <div class="two-lists">
      <div><h4>${useLow ? '단단함이 주는 힘' : '섬세함의 힘'}</h4><ul class="check-list">${gifts.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>
      <div><h4>${useLow ? '단단함의 그늘' : '섬세함의 무게'}</h4><ul class="check-list check-list--soft">${weights.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>
    </div>`
  );

  // ── 요즘의 나 ────────────────────────────────
  const state = section(
    'state',
    '요즘의 나',
    '타고난 민감성과 달리, 요즘의 상태는 환경과 회복에 따라 달라져요. 최근 2주 동안의 부담 신호와 회복 자원으로 지금 자리를 그려 봤어요.',
    `<div class="hsp-state">
      <div class="hsp-state-fig">${stateMap(s.load, s.rest, { size: 290, state: s.state, title: `요즘 상태 지도: 부담 신호 ${s.load}, 회복 자원 ${s.rest}, ${st.name}` })}</div>
      <div class="hsp-state-read">
        <p class="hsp-kicker">${esc(st.name)}</p>
        <h3>${esc(st.title)}</h3>
        <p>${esc(st.text)}</p>
        <dl class="hsp-state-nums"><div><dt>부담 신호</dt><dd>${s.load}</dd></div><div><dt>회복 자원</dt><dd>${s.rest}</dd></div></dl>
      </div>
    </div>
    <h3 class="rsub">이번 주에 해 볼 것</h3>
    <ul class="check-list">${st.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
  );

  // ── 맞는 환경 ────────────────────────────────
  const envFacets = order.slice(0, 2).filter((f) => isHigh(F[f].level) || F[f].level === 'mid');
  const envBody = envFacets.length && s.level !== 'low'
    ? `<div class="hsp-env">${ENV_GROUPS.map((g) => `<div><h3>${esc(g.title)}</h3><ul class="check-list">${[...new Set(envFacets.map((f) => FACET_TEXT[f].env[g.key]))].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
      <blockquote class="quote"><small>${esc(jo(FACETS[top].name, '을', '를'))} 위한 작은 연습</small>${esc(FACET_TEXT[top].tip)}</blockquote>`
    : `<div class="hsp-env">${ENV_GROUPS.map((g) => `<div><h3>${esc(g.title)}</h3><p>${esc(ENV_LOW[g.key])}</p></div>`).join('')}</div>`;
  const env = section(
    'env',
    '나에게 맞는 환경',
    '섬세한 사람은 환경의 영향을 크게 받아요. 맞지 않는 환경에서는 남들보다 빨리 지치지만, 맞는 환경에서는 남들보다 크게 피어나요.',
    envBody
  );

  // ── 성장 방향 ────────────────────────────────
  const growth = section(
    'growth',
    '섬세함과 잘 지내는 법',
    '섬세함은 줄일 대상이 아니라 다루는 법을 익힐 대상이에요. 아래 순서를 천천히 되풀이해 보세요.',
    `<ol class="practice-list">${STEPS.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 감각처리 민감성 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = order.slice(0, 2).map((f) => `<div class="counsel-item"><h3>${esc(FACETS[f].name)} <span class="hsp-counsel-score">${F[f].score}</span></h3>
      <ul class="check-list">${FACET_TEXT[f].counsel.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>`).join('');
    const watch = [st.counsel];
    if (s.hsp && s.state === 'overload') watch.push('섬세한 기질에 과부하가 겹쳐 있어요. 기질을 바꾸려 하기보다 자극을 줄이고 회복 시간을 확보하는 계획을 먼저 세워 주세요.');
    if (!s.hsp && s.load > 60) watch.push('기질적인 민감성은 높지 않은데 부담 신호가 커요. 기질보다는 요즘의 환경이나 사건이 크게 영향을 주고 있을 수 있어요.');
    if (s.range >= 30) watch.push(`갈래 사이 차이가 커요(가장 높은 갈래와 낮은 갈래가 ${s.range}점 차이). 섬세함이 특정 갈래에서만 켜지는 편이라, 그 갈래를 중심으로 이야기를 나눠 보세요.`);
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">높게 나온 갈래로 열어 볼 질문</h3>${qs}
        <h3 class="counsel-h">요즘 상태와 함께 볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 갈래를 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 반응이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 갈래를 묻는 문장끼리 응답이 일관돼요.');
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
      <div class="metric"><dt>같은 갈래 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${facets}${pattern}${state}${env}${growth}${counsel}${check}</div>`;
  wireToc(el);
}
