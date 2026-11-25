// AZIT : Star&Moon — 삶의 규칙 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { starGlyph } from '../../assets/js/charts.js';
import { SCHEMAS, DOMAINS } from './items.js';
import { SPREAD_LIMIT, COPING_KEYS } from './scoring.js';
import { DOMAIN_COLOR, LEVEL_LABEL, DOMAIN_TEXT, DOMAIN_MID, DOMAIN_LOW, SCHEMA_TEXT, COPING_TEXT, STEPS, CLOSING } from './content.js';
import { schemaRose } from './chart.js';

// 받침에 따라 조사를 고른다 (과/와, 이에요/예요)
const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const pill = (lv) => `<span class="sch-pill sch-pill--${lv}">${LEVEL_LABEL[lv]}</span>`;
const domOf = (s) => DOMAINS.find((d) => d.id === SCHEMAS[s].d);
const isOn = (lv) => lv === 'strong' || lv === 'active';

function section(id, title, lead, body, cls = '') {
  return `<section class="rsec ${cls}" id="r-${id}" aria-labelledby="r-${id}-t">
    <h2 class="rsec-title" id="r-${id}-t">${esc(title)}</h2>
    ${lead ? `<p class="rsec-lead">${lead}</p>` : ''}
    ${body}
  </section>`;
}

export function headlineOf(s) {
  return s.active && s.active.length ? SCHEMAS[s.active[0]].name : '두드러진 규칙 없음';
}

export function renderReport(el, rec, ctx = {}) {
  const s = rec.scores;
  const S = s.schemas;
  const name = rec.name || '검사자';
  const showCounsel = !ctx.shared;
  const active = s.active || [];
  const top = s.top || [];
  const heavy = DOMAINS.slice().sort((a, b) => (s.domains[b.id].active - s.domains[a.id].active) || (s.domains[b.id].score - s.domains[a.id].score))[0];
  const primary = s.primaryCoping;
  const second = s.copingOrder[1];
  const C = s.check || {};

  // ── 표지 ─────────────────────────────────────
  const lead = active.length
    ? { h: SCHEMAS[active[0]].name, t: `‘${SCHEMA_TEXT[active[0]].rule}’`, sub: active.length > 1 ? `이 규칙을 포함해 ${active.length}개의 규칙이 마음속에서 작동하고 있어요.` : '이 규칙이 마음속에서 가장 뚜렷하게 작동하고 있어요.' }
    : { h: '두드러진 규칙이 없어요', t: '18가지 규칙이 모두 약하게 나타나요', sub: top.length ? '그중 상대적으로 높게 나온 규칙을 함께 살펴봐요.' : '지금은 크게 작동하는 규칙이 보이지 않아요.' };
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">삶의 규칙 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님의 마음속 규칙</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          ${active.length ? `<p class="sch-kicker"><i style="background:${DOMAIN_COLOR[SCHEMAS[active[0]].d]}"></i>가장 강하게 작동하는 규칙</p>` : ''}
          <h1 class="cover-headline">${esc(lead.h)}</h1>
          <p class="sch-rule">${esc(lead.t)}</p>
          <p class="cover-tagline">${esc(lead.sub)}</p>
        </div>
        <div class="cover-figure sch-cover-fig">${schemaRose(S, { size: 300, title: `18가지 규칙 지도. ${top.map((k) => `${SCHEMAS[k].name} ${S[k].score}`).join(', ')}` })}
          <ul class="sch-legend">${DOMAINS.map((d) => `<li><i style="background:${DOMAIN_COLOR[d.id]}"></i>${esc(d.name)}</li>`).join('')}</ul>
        </div>
      </div>
      <dl class="cover-facts">
        <div><dt>작동하는 규칙</dt><dd>${active.length}개<small>18가지 가운데</small></dd></div>
        <div><dt>가장 무거운 영역</dt><dd>${esc(heavy.name)}<small>작동 ${s.domains[heavy.id].active}개</small></dd></div>
        <div><dt>주된 대처</dt><dd>${esc(COPING_TEXT[primary].name)}<small>${s.copingTie ? `${esc(jo(COPING_TEXT[second].name, '과', '와'))} 비슷해요` : esc(COPING_TEXT[primary].short)}</small></dd></div>
        <div><dt>가장 높은 점수</dt><dd>${S[s.ordered[0]].score}<small>${esc(SCHEMAS[s.ordered[0]].name)}</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['all', '18가지 규칙'],
    ['domains', '다섯 영역'],
    ...(top.length ? [['detail', '자세히 보기']] : []),
    ['coping', '대처 방식'],
    ['growth', '성장 방향'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [];
  if (active.length) {
    const shown = active.slice(0, 3);
    const names = shown.map((k) => `<strong>${esc(SCHEMAS[k].name)}</strong>`).join(', ');
    const tail = active.length > 3 ? ` 등 ${active.length}개예요` : (hasBatchim(SCHEMAS[shown[shown.length - 1]].name) ? '이에요' : '예요');
    paras.push(`${esc(name)} 님의 마음에서 지금 가장 강하게 작동하는 규칙은 ${names}${tail}. 가장 강한 규칙은 ‘${esc(SCHEMA_TEXT[active[0]].rule)}’라는 문장으로 나타나요.`);
    paras.push(`다섯 영역 가운데 <strong>${esc(heavy.name)}</strong> 영역이 가장 무거워요. 이 영역은 ${esc(jo(DOMAIN_TEXT[heavy.id].need, '과', '와'))} 이어져 있어요.`);
  } else {
    paras.push(`${esc(name)} 님은 18가지 규칙 가운데 뚜렷하게 작동하는 규칙이 없어요. 대부분의 문장에 '아니다' 쪽으로 답했어요.`);
  }
  paras.push(`규칙이 건드려지면 주로 <strong>${esc(COPING_TEXT[primary].name)}</strong>, 곧 ${esc(COPING_TEXT[primary].short)}으로 대처해요.${s.copingTie ? ` ${esc(COPING_TEXT[second].name)}도 거의 비슷하게 나타나요.` : ''}`);
  const summary = section('summary', '한눈에 보기', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 18가지 규칙 ──────────────────────────────
  const all = section(
    'all',
    '18가지 규칙',
    "규칙마다 다섯 문장의 응답을 0~100점으로 환산했어요. 평균과 함께 '그렇다' 이상으로 답한 문장 수를 보고 강함, 작동, 약간, 낮음으로 나눠요. 점수는 다른 사람과 비교한 값이 아니라 응답 그대로의 세기예요.",
    DOMAINS.map((d) => `<div class="sch-group">
      <h3><i style="background:${DOMAIN_COLOR[d.id]}"></i>${esc(d.name)}</h3>
      <ul class="sch-bars">${d.schemas.map((k) => `<li class="${isOn(S[k].level) ? 'is-on' : ''}">
        <span class="nm">${esc(SCHEMAS[k].name)}</span>
        <span class="track" aria-hidden="true"><span class="fill" style="width:${S[k].score}%;background:${DOMAIN_COLOR[d.id]}"></span></span>
        <span class="val">${S[k].score}</span>${pill(S[k].level)}
      </li>`).join('')}</ul>
    </div>`).join('')
  );

  // ── 다섯 영역 ────────────────────────────────
  const domains = section(
    'domains',
    '다섯 영역',
    '18가지 규칙은 어린 시절 채워지지 못한 마음의 필요에 따라 다섯 영역으로 묶여요. 작동하는 규칙이 많은 영역일수록, 그 필요가 지금도 마음을 크게 움직이고 있어요.',
    `<div class="sch-domains">${DOMAINS.map((d) => {
      const D = s.domains[d.id];
      const txt = D.active ? DOMAIN_TEXT[d.id].high : D.score >= 40 ? DOMAIN_MID : DOMAIN_LOW;
      return `<article class="sch-domain ${D.active ? 'is-on' : ''}">
        <div class="hd"><i style="background:${DOMAIN_COLOR[d.id]}"></i><h3>${esc(d.name)}</h3><span class="cnt">${D.active ? `작동 ${D.active}개` : '작동 없음'}</span></div>
        <p class="need">채워지길 바라는 마음: ${esc(DOMAIN_TEXT[d.id].need)}</p>
        <p>${esc(DOMAIN_TEXT[d.id].desc)} ${esc(txt)}</p>
      </article>`;
    }).join('')}</div>`
  );

  // ── 자세히 보기 ──────────────────────────────
  const detail = top.length
    ? section(
      'detail',
      active.length ? '작동하는 규칙 자세히 보기' : '상대적으로 높게 나온 규칙',
      active.length ? `가장 강하게 작동하는 ${top.length > 1 ? `규칙 ${top.length}개를` : '규칙을'} 순서대로 살펴봐요. 규칙은 그때의 나를 지키려고 생긴 것이라, 탓하기보다 이해하는 것이 먼저예요.` : '뚜렷하게 작동하지는 않지만 상대적으로 높게 나온 규칙이에요. 특정한 상황에서만 고개를 들 수 있어요.',
      top.map((k) => {
        const T = SCHEMA_TEXT[k];
        const d = domOf(k);
        return `<article class="sch-card">
          <div class="sch-card-hd"><span class="sch-dom"><i style="background:${DOMAIN_COLOR[d.id]}"></i>${esc(d.name)}</span>${pill(S[k].level)}<span class="score">${S[k].score}</span></div>
          <h3>${esc(SCHEMAS[k].name)}</h3>
          <p class="sch-rule">‘${esc(T.rule)}’</p>
          <p>${esc(T.desc)}</p>
          <dl class="sch-facts">
            <div><dt>언제 건드려지나</dt><dd>${esc(T.triggers)}</dd></div>
            <div><dt>어디서 생겨났을까</dt><dd>${esc(T.origin)}</dd></div>
            <div><dt>채워지길 바라는 마음</dt><dd>${esc(T.need)}</dd></div>
          </dl>
          <h4>건드려졌을 때 나타나는 반응</h4>
          <ul class="sch-react">${COPING_KEYS.map((c) => `<li class="${c === primary ? 'is-primary' : ''}"><strong>${esc(COPING_TEXT[c].name)}</strong><span>${esc(T.react[c])}</span>${c === primary ? '<em>주된 대처</em>' : ''}</li>`).join('')}</ul>
          <blockquote class="quote"><small>건강한 어른의 목소리</small>${esc(T.healthy)}</blockquote>
          <p class="sch-practice"><strong>작은 연습</strong> ${esc(T.practice)}</p>
        </article>`;
      }).join('')
    )
    : '';

  // ── 대처 방식 ────────────────────────────────
  const P = COPING_TEXT[primary];
  const coping = section(
    'coping',
    '규칙이 건드려질 때의 대처',
    '여섯 가지 상황에서 고른 순서로 세 가지 대처 방식의 비중을 셈했어요. 누구나 세 가지를 모두 쓰지만, 자주 쓰는 방식이 있어요.',
    `<ul class="sch-cope">${s.copingOrder.map((c) => `<li class="${c === primary ? 'is-primary' : ''}"><span class="nm">${esc(COPING_TEXT[c].name)}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${s.copingMax ? Math.round((s.coping[c] / s.copingMax) * 100) : 0}%"></span></span>
      <span class="val">${s.coping[c]}<small>/${s.copingMax}</small></span></li>`).join('')}</ul>
    <div class="domain-read">
      <h3>주로 ${esc(P.name)}: ${esc(P.short)}</h3>
      <p>${esc(P.desc)}</p>
      <dl class="att-moments">
        <div><dt>얻는 것</dt><dd>${esc(P.gain)}</dd></div>
        <div><dt>치르는 값</dt><dd>${esc(P.cost)}</dd></div>
        <div><dt>다르게 해 보기</dt><dd>${esc(P.alt)}</dd></div>
      </dl>
    </div>
    ${s.copingTie ? `<p class="final-note">${esc(COPING_TEXT[second].name)}도 거의 같은 비중으로 나타나요. 상황에 따라 두 방식을 오가는 편이에요.</p>` : ''}`
  );

  // ── 성장 방향 ────────────────────────────────
  const growth = section(
    'growth',
    '규칙을 새로 쓰는 순서',
    '규칙은 한 번에 사라지지 않지만, 알아차리고 다르게 해 보는 경험이 쌓이면 힘이 약해져요. 아래 순서를 천천히 되풀이해 보세요.',
    `<ol class="practice-list">${STEPS.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    ${top.length ? `<blockquote class="quote sch-today"><small>오늘 나에게 들려줄 문장</small>${esc(SCHEMA_TEXT[top[0]].healthy)}</blockquote>` : ''}
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 삶의 규칙 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const items = top.map((k) => `<div class="counsel-item"><h3>${esc(SCHEMAS[k].name)}</h3>
      <ul class="check-list">${SCHEMA_TEXT[k].counsel.q.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
      <p class="counsel-note">${esc(SCHEMA_TEXT[k].counsel.note)}</p></div>`).join('');
    const watch = [COPING_TEXT[primary].counsel];
    if (C.rawMean <= 1.7 && !active.length) watch.push("거의 모든 문장에 '전혀 아니다'를 골랐어요. 실제로 크게 작동하는 규칙이 없을 수도 있고, 힘든 마음을 떠올리지 않으려는 회피일 수도 있어요. 대처 방식 결과와 함께 살펴보세요.");
    if (C.highRatio >= 0.5) watch.push('많은 문장에 높은 점수를 줬어요. 지금 마음이 많이 힘든 시기일 수 있어요. 여러 규칙을 한꺼번에 다루기보다 가장 높은 한두 개부터 시작해 보세요.');
    if (C.spread >= SPREAD_LIMIT) watch.push('같은 규칙을 묻는 문장끼리 응답이 크게 엇갈려요. 결과를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        ${items ? `<h3 class="counsel-h">규칙별로 열어 볼 질문</h3>${items}` : ''}
        <h3 class="counsel-h">대처 방식과 상담 관계</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 규칙을 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 마음이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 규칙을 묻는 문장끼리 응답이 일관돼요.');
  if (C.highRatio >= 0.5) notes.push("절반이 넘는 문장에 '그렇다' 이상으로 답했어요. 여러 규칙이 함께 높게 나올 때는 가장 높은 것부터 차례로 보는 것이 좋아요.");
  if (C.rawMean <= 1.7) notes.push("대부분의 문장에 '전혀 아니다'를 골랐어요.");
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~6)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>'그렇다' 이상</dt><dd>${Math.round((C.highRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>'아니다' 이하</dt><dd>${Math.round((C.lowRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>응답 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${all}${domains}${detail}${coping}${growth}${counsel}${check}</div>`;
  wireToc(el);
}

function wireToc(el) {
  const links = Array.from(el.querySelectorAll('.toc a'));
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.removeAttribute('aria-current'));
      const a = map.get(en.target.id);
      if (a) { a.setAttribute('aria-current', 'true'); a.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  el.querySelectorAll('.rsec').forEach((sec) => io.observe(sec));
}
