// AZIT : Star&Moon — 가치관 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { VALUES, GROUPS, GROUP_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { GROUP_COLOR, TIER_LABEL, GROUP_TEXT, AXES, VALUE_TEXT, CONFLICT_TEXT, STEPS, COUNSEL_GENERAL, CLOSING } from './content.js';
import { valueWheel } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const nm = (k) => VALUES[k].name;
const colorOf = (k) => GROUP_COLOR[VALUES[k].group];
const dot = (color) => `<i style="background:${color}"></i>`;
const signed = (x) => { const n = Number(x) || 0; const t = Math.abs(n).toFixed(1); return n > 0.04 ? `+${t}` : n < -0.04 ? `−${t}` : '0.0'; };
const listJoin = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')}, ${arr[arr.length - 1]}`);

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
  const V = s.values;
  const order = s.order;
  const top = order[0];
  const core = s.core;
  const low = s.low;
  const G = s.groups;
  const tg = s.topGroup;
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  const conflicts = s.conflicts || [];

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">가치관 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="vl-kicker">가장 앞에 두는 가치는 ${esc(jo(nm(top), '이에요', '예요'))}</p>
          <h1 class="cover-headline">${esc(GROUP_TEXT[tg].title)}</h1>
          <p class="vl-tag">핵심 가치 세 가지</p>
          <ol class="vl-mini">${core.map((k) => `<li>${dot(colorOf(k))}${esc(nm(k))}</li>`).join('')}</ol>
        </div>
        <div class="cover-figure vl-cover-fig">${valueWheel(V, { size: 260, title: `열 가지 가치 원형: ${order.map((k) => `${V[k].rank}위 ${nm(k)} ${V[k].score}점`).join(', ')}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>첫째 가치</dt><dd>${esc(nm(top))}<small>${signed(V[top].c)}</small></dd></div>
        <div><dt>앞선 방향</dt><dd>${esc(GROUPS[tg].name)}<small>${signed(G[tg].c)}</small></dd></div>
        <div><dt>가치 갈등</dt><dd>${conflicts.length ? `${conflicts.length}쌍` : '없음'}<small>맞은편 가치</small></dd></div>
        <div><dt>응답</dt><dd>${careful ? '확인 필요' : '일관됨'}<small>응답 점검 참고</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['rank', '가치 순위'],
    ['axes', '네 방향'],
    ['core', '핵심 가치'],
    ['conflict', '가치 갈등'],
    ['growth', '성장 방향'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const coreNames = core.map((k) => nm(k));
  const lowNames = low.map((k) => nm(k));
  const paras = [
    `${esc(name)} 님은 <strong>${esc(jo(GROUP_TEXT[tg].title, '이에요', '예요'))}</strong>. ${esc(GROUP_TEXT[tg].high)}`,
    `열 가지 가치 가운데 가장 앞에 두는 것은 <strong>${esc(listJoin(coreNames))}</strong>${hasBatchim(coreNames[coreNames.length - 1]) ? '이에요' : '예요'}. 상대적으로 덜 앞세우는 가치는 ${esc(listJoin(lowNames))}${hasBatchim(lowNames[lowNames.length - 1]) ? '이에요' : '예요'}.`,
  ];
  if (conflicts.length) {
    const c0 = conflicts[0];
    paras.push(`원형의 맞은편에 있는 ${esc(jo(nm(c0.a), '과', '와'))} ${esc(jo(nm(c0.b), '을', '를'))} 함께 중요하게 여겨요. 두 가치가 서로 당기는 순간에 고민이 깊어질 수 있어요.`);
  } else {
    paras.push('맞은편 가치끼리 함께 높게 나오지 않아, 가치들이 한 방향으로 비교적 고르게 정리되어 있어요.');
  }
  if (C.flat) paras.push('열 가치 사이의 차이가 크지 않아요. 여러 가치를 고루 중요하게 여기는 편이라, 순위는 참고로 가볍게 읽어 주세요.');
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 가치 순위 ────────────────────────────────
  const LIM = 2;
  const pos = (c) => 50 + (Math.max(-LIM, Math.min(LIM, Number(c) || 0)) / LIM) * 50;
  const rows = order.map((k) => {
    const v = V[k];
    const p = pos(v.c);
    const left = Math.min(50, p);
    const width = Math.max(0.8, Math.abs(p - 50));
    return `<li class="vl-row vl-row--${v.tier}">
      <span class="rk">${v.rank}</span>
      <span class="nm">${dot(colorOf(k))}${esc(nm(k))}</span>
      <span class="track" aria-hidden="true"><span class="mid"></span><span class="fill ${v.c < 0 ? 'neg' : ''}" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:${colorOf(k)}"></span></span>
      <span class="val">${signed(v.c)}</span>
      <span class="vl-sc">${v.score}점</span>
    </li>`;
  }).join('');
  const legend = `<ul class="vl-legend">${GROUP_ORDER.map((g) => `<li>${dot(GROUP_COLOR[g])}${esc(GROUPS[g].name)}</li>`).join('')}</ul>`;
  const rank = section(
    'rank',
    '열 가지 가치의 순위',
    `가운데 선은 ${esc(name)} 님이 열 가치에 준 평균이에요. 막대가 오른쪽으로 길수록 다른 가치보다 앞세우고, 왼쪽으로 길수록 덜 앞세운다는 뜻이에요. 오른쪽 점수(0~100)는 그 가치 자체를 얼마나 중요하게 여기는지의 세기예요.`,
    `<div class="vl-scale" aria-hidden="true"><span>덜 앞세움</span><span>내 평균</span><span>더 앞세움</span></div>
    <ol class="vl-rows">${rows}</ol>${legend}`
  );

  // ── 네 방향 ──────────────────────────────────
  const axisRow = (key, val) => {
    const A = AXES[key];
    const p = 50 + (Math.max(-3, Math.min(3, val)) / 3) * 50;
    const side = val > 0.25 ? A.pos : val < -0.25 ? A.neg : null;
    return `<div class="vl-axis">
      <div class="vl-axis-ends"><span>${esc(A.neg)}</span><span>${esc(A.pos)}</span></div>
      <div class="vl-axis-track" aria-hidden="true"><span class="mid"></span><span class="dot" style="left:${p.toFixed(1)}%"></span></div>
      <p>${side ? `<strong>${esc(side)}</strong> 쪽으로 기울어 있어요(차이 ${Math.abs(val).toFixed(1)}). ${esc(val > 0 ? A.posText : A.negText)}에 무게를 더 둬요.` : `두 쪽 사이에서 균형을 이루고 있어요(차이 ${Math.abs(val).toFixed(1)}).`}</p>
    </div>`;
  };
  const gcards = s.gOrder.map((g) => `<article class="vl-gcard" style="--vc:${GROUP_COLOR[g]}">
      <h3>${esc(GROUPS[g].name)}<small>${GROUPS[g].values.map(nm).join(', ')}</small></h3>
      <p class="vl-gscore">${signed(G[g].c)}</p>
      <p>${esc(GROUP_TEXT[g].what)}</p>
    </article>`).join('');
  const axes = section(
    'axes',
    '네 방향과 두 축',
    '열 가치는 네 방향으로 묶이고, 서로 맞은편에 있는 방향은 한쪽을 앞세우면 다른 쪽이 덜해지는 관계예요. 두 축 위에서 지금 내가 어디쯤 서 있는지 봐요.',
    `${axisRow('change', s.axisChange)}${axisRow('care', s.axisCare)}<div class="vl-gcards">${gcards}</div>`
  );

  // ── 핵심 가치 ────────────────────────────────
  const cards = core.map((k) => {
    const T = VALUE_TEXT[k];
    return `<article class="vl-card">
      <div class="hd"><span class="vl-rank">${V[k].rank}</span><h3>${esc(nm(k))}</h3><span class="vl-chip">${dot(colorOf(k))}${esc(GROUPS[VALUES[k].group].name)}</span><span class="score">${signed(V[k].c)}</span></div>
      <p class="what">${esc(T.what)}</p>
      <p>${esc(T.core)}</p>
      <div class="two-lists">
        <div><h4>일과 공부에서</h4><p>${esc(T.work)}</p></div>
        <div><h4>관계에서</h4><p>${esc(T.rel)}</p></div>
      </div>
      <p class="vl-gift"><strong>주는 힘</strong>${esc(T.gift)}</p>
      <p class="vl-over"><strong>지나칠 때</strong>${esc(T.shadow)}</p>
    </article>`;
  }).join('');
  const lows = `<h3 class="rsub">덜 앞세우는 가치</h3>
    <ul class="vl-lows">${low.map((k) => `<li><span class="nm">${dot(colorOf(k))}${esc(nm(k))}<small>${signed(V[k].c)}</small></span><p>${esc(VALUE_TEXT[k].low)}</p></li>`).join('')}</ul>`;
  const coreSec = section(
    'core',
    '핵심 가치 자세히',
    '내 안에서 가장 앞서는 세 가치예요. 큰 선택을 할 때 나도 모르게 기준이 되고, 이 가치가 채워질 때 삶이 나답다고 느껴요.',
    `<div class="vl-cards">${cards}</div>${lows}`
  );

  // ── 가치 갈등 ────────────────────────────────
  const confBody = conflicts.length
    ? `<ul class="vl-conf">${conflicts.slice(0, 3).map((c) => `<li>
        <span class="vl-conf-k">${dot(colorOf(c.a))}${esc(jo(nm(c.a), '과', '와'))} ${dot(colorOf(c.b))}${esc(nm(c.b))}</span>
        <p>${esc(CONFLICT_TEXT[c.key].text)}</p>
        <p class="vl-tip"><strong>해 볼 것</strong>${esc(CONFLICT_TEXT[c.key].tip)}</p>
      </li>`).join('')}</ul>`
    : `<p class="vl-note">맞은편에 있는 가치끼리 함께 높게 나오지 않았어요. 가치들이 한쪽으로 정리되어 있어서 선택의 기준이 비교적 분명한 편이에요. 다만 덜 앞세우는 ${esc(jo(nm(low[low.length - 1]), '을', '를'))} 중요하게 여기는 사람과는 서로 다른 것을 지키느라 부딪힐 수 있어요.</p>`;
  const conflict = section(
    'conflict',
    '가치 갈등',
    '원형에서 맞은편에 있는 가치는 한쪽을 채우면 다른 쪽이 덜 채워지기 쉬워요. 둘 다 중요하게 여기면 선택 앞에서 마음이 오래 머물러요.',
    confBody
  );

  // ── 성장 방향 ────────────────────────────────
  const growth = section(
    'growth',
    '가치대로 사는 법',
    '가치는 알기만 해서는 힘이 되지 않아요. 일상의 작은 선택에 자주 꺼내 쓸수록 삶이 나다워져요.',
    `<h3 class="rsub">핵심 가치를 채우는 이번 주 실천</h3>
    <ul class="check-list">${core.map((k) => `<li><strong>${esc(nm(k))}</strong> ${esc(VALUE_TEXT[k].fuel)}</li>`).join('')}</ul>
    <h3 class="rsub">천천히 되풀이할 다섯 단계</h3>
    <ol class="practice-list">${STEPS.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 가치관 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = core.map((k) => `<div class="counsel-item"><h3>${esc(nm(k))} <span class="vl-counsel-score">${signed(V[k].c)}</span></h3>
      <ul class="check-list"><li>${esc(VALUE_TEXT[k].counsel)}</li></ul></div>`).join('');
    const watch = [];
    if (conflicts.length) watch.push(`${conflicts.slice(0, 2).map((c) => `${jo(nm(c.a), '과', '와')} ${nm(c.b)}`).join(', ')} 사이의 갈등이 있어요. 요즘 고민하는 선택이 이 갈등과 닿아 있는지 살펴봐 주세요.`);
    if (G.trans.c >= 0.5 && V.be.tier === 'core' && V.he.tier === 'low') watch.push('곁의 사람을 챙기는 가치는 높은데 나를 위한 즐거움은 뒤로 밀려 있어요. 돌봄에 지쳐 있지 않은지 함께 확인해 주세요.');
    if (V.co.tier === 'core' && V.sd.tier === 'low') watch.push('규칙과 예의를 앞세우고 스스로 정하는 일은 덜 앞세워요. 자기 뜻을 말하기 어려워하는지, 남의 기대에 맞추느라 지쳐 있는지 살펴봐 주세요.');
    if (V.ac.tier === 'core' && V.po.rank <= 4) watch.push('성취와 영향력이 함께 앞서 있어요. 결과가 곧 자기 가치처럼 느껴지는지, 쉬는 것을 불안해하는지 함께 이야기해 보세요.');
    if (C.flat) watch.push('가치 사이 차이가 작아요. 순위보다 지금 삶에서 무엇이 빠져 있다고 느끼는지를 먼저 물어보는 편이 도움이 돼요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 순위를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">핵심 가치로 열어 볼 질문</h3>${qs}
        <h3 class="counsel-h">함께 볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 가치를 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 생각이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 가치를 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '닮았다' 쪽으로 답하는 경향이 보여요. 가치 사이의 차이가 실제보다 작게 나왔을 수 있어요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '닮지 않았다' 쪽으로 답하는 경향이 보여요. 가치 사이의 차이가 실제보다 작게 나왔을 수 있어요.");
  if (C.flat) notes.push('열 가치를 비슷하게 중요하게 여기는 편이에요. 순위가 조금만 바뀌어도 핵심 가치가 달라질 수 있어요.');
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~6)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>가치 사이 차이</dt><dd>${C.flat ? '작음' : '뚜렷함'}</dd></div>
      <div class="metric"><dt>같은 가치 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${rank}${axes}${coreSec}${conflict}${growth}${counsel}${check}</div>`;
  wireToc(el);
}

