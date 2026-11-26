// AZIT : Star&Moon — 성인 애착 유형 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { FACETS, TARGETS } from './items.js';
import { GAP_LIMIT, STYLE_NAMES } from './scoring.js';
import { STYLES, STYLE_COLOR, DIMENSIONS, FACET_TEXT, AMB, TARGET_TEXT, LEVEL_LABEL, CONF_TEXT, CLOSING } from './content.js';
import { attachMap } from './chart.js';

const pill = (lv) => `<span class="lv-pill lv-pill--${lv}">${LEVEL_LABEL[lv]}</span>`;
const chip = (style) => `<span class="att-chip"><i style="background:${STYLE_COLOR[style]}"></i>${esc(STYLE_NAMES[style])}</span>`;

function section(id, title, lead, body, cls = '') {
  return `<section class="rsec ${cls}" id="r-${id}" aria-labelledby="r-${id}-t">
    <h2 class="rsec-title" id="r-${id}-t">${esc(title)}</h2>
    ${lead ? `<p class="rsec-lead">${lead}</p>` : ''}
    ${body}
  </section>`;
}

// 관계별 지도에서 눈여겨볼 흐름
function relationInsights(s) {
  const T = s.targets || {};
  const done = TARGETS.filter((t) => T[t.id] && !T[t.id].skipped).map((t) => ({ ...t, ...T[t.id], sum: T[t.id].anx + T[t.id].avo }));
  const out = [];
  let comfort = null;
  let concern = null;
  if (done.length >= 2) {
    comfort = done.reduce((a, b) => (b.sum < a.sum ? b : a));
    concern = done.reduce((a, b) => (b.sum > a.sum ? b : a));
    if (concern.sum - comfort.sum < 15) { comfort = null; concern = null; }
  }
  if (comfort && comfort.style === 'secure') out.push(`가장 편안하게 기댈 수 있는 관계는 ${esc(comfort.name)}와의 관계예요. 힘들 때 이 관계를 마음의 쉼터로 삼을 수 있어요.`);
  if (concern && concern.style !== 'secure') out.push(`마음이 가장 많이 쓰이는 관계는 ${esc(concern.name)}와의 관계(불안 ${concern.anx}, 회피 ${concern.avo})예요. 이 관계를 중심으로 이야기를 나눠 보면 지금의 마음을 이해하는 데 도움이 돼요.`);
  const parents = done.filter((t) => t.type === 'parent');
  if (s.style === 'secure' && parents.some((t) => t.style !== 'secure')) out.push('부모님과의 관계에서는 어려움이 보이지만, 지금의 관계 전반은 안정적이에요. 다른 관계 속에서 안정감을 새로 쌓아 왔을 수 있어요.');
  const pa = done.find((t) => t.id === 'pa');
  const others = done.filter((t) => t.id !== 'pa');
  if (pa && pa.anx > 60 && others.length && Math.max(...others.map((t) => t.anx)) <= 50) out.push('다른 관계보다 연인 관계에서 불안이 유독 크게 켜져요. 연애라는 자리에서 특히 마음이 흔들리는 흐름이에요.');
  const fr = done.find((t) => t.id === 'fr');
  if (fr && fr.style === 'secure' && parents.length && parents.every((t) => t.style !== 'secure')) out.push('가족보다 친구에게서 마음을 나누는 편이에요. 친구가 중요한 안전기지가 되어 주고 있어요.');
  const mo = done.find((t) => t.id === 'mo');
  const fa = done.find((t) => t.id === 'fa');
  if (mo && fa && Math.abs(mo.sum - fa.sum) >= 50) out.push('어머니와 아버지에 대한 마음이 크게 달라요. 두 관계가 지금의 관계 방식에 서로 다른 흔적을 남겼을 수 있어요.');
  const allInsecure = done.length >= 2 && done.every((t) => t.style !== 'secure');
  if (allInsecure) out.push('답한 관계 모두에서 불안이나 거리 두기가 보여요. 마음 편히 기댈 곳이 부족하다고 느끼고 있을 수 있어요.');
  return { done, comfort, concern, allInsecure, lines: out };
}

export function headlineOf(s) {
  return STYLES[s.style] ? STYLES[s.style].name : '';
}

export function renderReport(el, rec, ctx = {}) {
  const s = rec.scores;
  const st = STYLES[s.style];
  const name = rec.name || '검사자';
  const R = relationInsights(s);
  const showCounsel = !ctx.shared;
  const near = (s.near || []).filter((k) => k !== s.style);

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">성인 애착 유형 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack att-hero">
        <div>
          <p class="att-kicker"><i style="background:${STYLE_COLOR[s.style]}"></i>애착 유형</p>
          <h1 class="cover-headline">${esc(st.name)}</h1>
          <p class="att-title">${esc(st.title)}</p>
          ${near.length ? `<p class="att-border">${near.map((k) => esc(STYLE_NAMES[k])).join(', ')}과의 경계에 있어요</p>` : ''}
        </div>
        <div class="cover-figure att-cover-map">${attachMap([{ x: s.avo, y: s.anx, main: true }], { size: 300, labels: false, title: `애착 지도: 불안 ${s.anx}, 회피 ${s.avo}, ${st.name}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>불안</dt><dd>${s.anx}<small>${LEVEL_LABEL[s.levels.anx]}</small></dd></div>
        <div><dt>회피</dt><dd>${s.avo}<small>${LEVEL_LABEL[s.levels.avo]}</small></dd></div>
        <div><dt>양가감정</dt><dd>${s.amb}<small>${LEVEL_LABEL[s.levels.amb]}</small></dd></div>
        <div><dt>유형 뚜렷함</dt><dd>${esc(CONF_TEXT[s.conf].label)}<small>경계에서 ${s.margin}점</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['dims', '두 축'],
    ['style', '유형 이해'],
    ['relations', '관계별 지도'],
    ['pattern', '관계 속 흐름'],
    ['growth', '성장 방향'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [
    `${esc(name)} 님은 <strong>${esc(st.name)}</strong>에 가까워요. ${esc(st.title)}이에요. ${esc(st.summary.split('. ')[0])}.`,
    `불안은 ${s.anx}점(${LEVEL_LABEL[s.levels.anx]}), 회피는 ${s.avo}점(${LEVEL_LABEL[s.levels.avo]})이에요. ${esc(CONF_TEXT[s.conf].text)}`,
  ];
  if (R.comfort && R.concern) paras.push(`관계별로 보면 ${esc(R.comfort.name)}와의 관계가 가장 편안하고, ${esc(R.concern.name)}와의 관계에서 마음이 가장 많이 쓰여요.`);
  const summary = section('summary', '한눈에 보기', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 두 축 ────────────────────────────────────
  const dimBlock = (d) => {
    const D = DIMENSIONS[d];
    const v = s[d];
    const lv = s.levels[d];
    const codes = Object.keys(FACETS).filter((f) => FACETS[f].d === d);
    return `<div class="att-dim">
      <div class="domain-head"><h3 class="att-dim-title">${esc(D.name)}</h3>${pill(lv)}<span class="score">${v}</span></div>
      <p class="domain-what">${esc(D.what)}</p>
      <span class="att-meter" aria-hidden="true"><span class="mid"></span><span class="fill" style="width:${v}%"></span></span>
      <p class="att-dim-read">${esc(D.levels[lv])}</p>
      <ul class="facet-list" aria-label="${esc(D.name)} 하위 요인">${codes
        .map((f) => `<li class="facet"><div class="facet-top"><strong>${esc(FACETS[f].name)}</strong>${pill(s.facets[f].level)}<span class="val">${s.facets[f].score}</span></div>
          <span class="track" aria-hidden="true"><span class="fill" style="width:${s.facets[f].score}%;background:var(--brand)"></span></span>
          <p>${esc(FACET_TEXT[f][s.facets[f].level])} <span class="facet-what">${esc(FACET_TEXT[f].what)}</span></p></li>`)
        .join('')}</ul>
    </div>`;
  };
  const dims = section(
    'dims',
    '불안과 회피, 두 축',
    "36개 문항의 응답을 축마다 0~100점으로 환산했어요. 50은 '보통이다' 근처이고, 두 축이 50을 넘는지에 따라 네 유형으로 나눠요. 높고 낮음은 좋고 나쁨이 아니라 관계를 대하는 방식이에요.",
    `${dimBlock('anx')}${dimBlock('avo')}
    <div class="att-amb">
      <div class="facet-top"><strong>${esc(AMB.name)}</strong>${pill(s.levels.amb)}<span class="val">${s.amb}</span></div>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${s.amb}%;background:var(--brand)"></span></span>
      <p>${esc(AMB.levels[s.levels.amb])} <span class="facet-what">${esc(AMB.what)}</span></p>
    </div>`
  );

  // ── 유형 이해 ────────────────────────────────
  const nb = near.length ? STYLES[near[0]] : null;
  const styleSec = section(
    'style',
    `${st.name}, ${st.short} 사람`,
    '',
    `<div class="domain-read">
      <h3>${esc(st.title)}</h3>
      <p>${esc(st.summary)}</p>
      <dl class="att-moments">
        <div><dt>가까워질 때</dt><dd>${esc(st.close)}</dd></div>
        <div><dt>떨어져 있을 때</dt><dd>${esc(st.apart)}</dd></div>
        <div><dt>갈등할 때</dt><dd>${esc(st.conflict)}</dd></div>
      </dl>
    </div>
    <h3 class="att-h">이 유형이 마음속에 자주 품는 문장</h3>
    <div class="att-beliefs">
      <blockquote class="quote"><small>나에 대해</small>${esc(st.self)}</blockquote>
      <blockquote class="quote"><small>사람들에 대해</small>${esc(st.other)}</blockquote>
    </div>
    <div class="two-lists">
      <div><h4>강점</h4><ul class="check-list">${st.strengths.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h4>어려운 지점</h4><ul class="check-list check-list--soft">${st.hard.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    ${nb ? `<div class="att-nb"><h4>${esc(nb.name)}의 모습도 함께 보일 수 있어요</h4><p>한 축이 가운데에 가까워서, 상황에 따라 ${esc(nb.short)} ${esc(nb.name)}의 모습이 나타날 수 있어요. ${esc(nb.summary.split('. ')[0])}.</p></div>` : ''}`
  );

  // ── 관계별 지도 ──────────────────────────────
  const pts = [{ x: s.avo, y: s.anx, main: true, label: '관계 전반' }, ...R.done.map((t) => ({ x: t.avo, y: t.anx, label: t.short }))];
  const T = s.targets || {};
  const rows = TARGETS.map((t) => {
    const v = T[t.id];
    if (!v || v.skipped) return `<li class="att-rel-row is-skipped"><span class="nm">${esc(t.name)}</span><span class="skip">건너뜀</span></li>`;
    return `<li class="att-rel-row"><span class="nm">${esc(t.name)}</span>${chip(v.style)}<span class="nums">불안 ${v.anx}, 회피 ${v.avo}</span><p>${esc(TARGET_TEXT[t.type][v.style])}</p></li>`;
  }).join('');
  const relations = section(
    'relations',
    '관계별 지도',
    '관계 전반(별)과 함께, 답한 관계마다 불안과 회피를 따로 찍었어요. 같은 사람이라도 관계에 따라 자리가 달라질 수 있어요.',
    `<figure class="att-map-fig">${attachMap(pts, { size: 340, title: `관계별 애착 지도: ${pts.map((p) => `${p.label} 불안 ${p.y}, 회피 ${p.x}`).join('; ')}` })}</figure>
    <ul class="att-rel">
      <li class="att-rel-row is-main"><span class="nm">관계 전반</span>${chip(s.style)}<span class="nums">불안 ${s.anx}, 회피 ${s.avo}</span></li>
      ${rows}
    </ul>
    ${R.done.length ? (R.lines.length ? `<h3 class="att-h">눈여겨볼 흐름</h3><ul class="check-list">${R.lines.map((x) => `<li>${x}</li>`).join('')}</ul>` : '') : '<p class="final-note">관계별 문항을 모두 건너뛰어서 관계 전반의 자리만 표시했어요.</p>'}`
  );

  // ── 관계 속 흐름 ─────────────────────────────
  const pattern = section(
    'pattern',
    '관계 속 흐름',
    '사람은 관계마다 조금씩 다르게 움직이지만, 자주 되풀이되는 흐름이 있어요.',
    `<div class="domain-read"><h3>다른 유형과 만날 때</h3><p>${esc(st.dynamics)}</p></div>
    <h3 class="att-h">가까운 사람이 도와줄 수 있는 것</h3>
    <ul class="check-list">${st.helps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
  );

  // ── 성장 방향 ────────────────────────────────
  const topFacets = Object.keys(FACETS).filter((f) => s.facets[f].score > 60).sort((a, b) => s.facets[b].score - s.facets[a].score).slice(0, 2);
  const growth = section(
    'growth',
    '성장 방향',
    '애착은 고정된 성격이 아니라 관계 속에서 익힌 방식이라, 안전한 경험이 쌓이면 조금씩 달라져요. 하나만 골라 일주일 동안 해 보세요.',
    `<ol class="practice-list">${st.growth.map((g) => `<li><span><strong>${esc(g.t)}</strong> ${esc(g.d)}</span></li>`).join('')}${topFacets
      .map((f) => `<li><span><strong>${esc(FACETS[f].name)}</strong> ${esc(FACET_TEXT[f].tip)}</span></li>`)
      .join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 성인 애착 유형 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const watch = [...st.counsel.watch];
    Object.keys(FACETS).filter((f) => s.facets[f].score >= 70).sort((a, b) => s.facets[b].score - s.facets[a].score).slice(0, 2)
      .forEach((f) => watch.push(FACET_TEXT[f].counsel));
    if (s.amb > 60 && s.style !== 'fearful') watch.push(AMB.counsel);
    if (R.allInsecure) watch.push('답한 관계 모두에서 불안이나 거리 두기가 보여요. 지금 삶에서 기댈 수 있는 사람이나 자원이 있는지 함께 확인해 주세요.');
    if (R.concern && R.concern.style !== 'secure') watch.push(`${R.concern.name}와의 관계가 가장 불편하게 나왔어요. 이 관계의 역사와 지금의 모습을 함께 살펴보면 좋아요.`);
    if ((s.check || {}).gap >= GAP_LIMIT) watch.push('응답이 서로 어긋난 부분이 있어요. 결과를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3>열어 볼 질문</h3>
        <ul class="check-list">${st.counsel.questions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h3>상담 관계에서 나타날 수 있는 모습</h3>
        <ul class="check-list check-list--soft">${st.counsel.room.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h3>함께 살필 점</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const C = s.check || {};
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문항에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.gap >= GAP_LIMIT) notes.push('서로 반대되는 문장에 같은 쪽으로 답한 경우가 꽤 있어요. 문항을 빠르게 넘겼거나, 관계에 따라 마음이 많이 달라지는 편일 수 있어요. 결과를 볼 때 함께 참고해 주세요.');
  else notes.push('서로 반대되는 문장에 대한 응답이 일관돼요.');
  if (C.rawMean >= 3.6) notes.push("전반적으로 '그렇다' 쪽으로 답하는 경향이 있어요. 반대로 채점하는 문항이 섞여 있어서 점수에 미치는 영향은 줄어들어요.");
  else if (C.rawMean <= 2.4) notes.push("전반적으로 '아니다' 쪽으로 답하는 경향이 있어요. 반대로 채점하는 문항이 섞여 있어서 점수에 미치는 영향은 줄어들어요.");
  if (C.midRatio >= 0.35) notes.push("'보통이다' 응답이 많은 편이에요. 그래서 점수가 50 근처로 모이고 유형이 경계로 나왔을 수 있어요.");
  const skipped = TARGETS.filter((t) => !T[t.id] || T[t.id].skipped).map((t) => t.name);
  if (skipped.length) notes.push(`관계별 지도에서 ${skipped.join(', ')} 문항은 건너뛰었어요.`);
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>분명한 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>'보통이다' 응답</dt><dd>${Math.round((C.midRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>응답 일관성</dt><dd>${C.gap >= GAP_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${dims}${styleSec}${relations}${pattern}${growth}${counsel}${check}</div>`;
  wireToc(el);
}

