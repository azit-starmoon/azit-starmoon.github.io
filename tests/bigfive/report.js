// AZIT : Star&Moon — 성격 5요인 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { b5Star, quadrant, starGlyph } from '../../assets/js/charts.js';
import { DOMAINS, FACET_TEXT, STYLES, LEVEL_LABEL } from './content.js';
import { FACETS, DOMAIN_ORDER } from './items.js';
import { STYLE_PAIRS } from './scoring.js';

const pill = (lv) => `<span class="lv-pill lv-pill--${lv}">${LEVEL_LABEL[lv]}</span>`;

export function headlineOf(s) {
  const [d1, d2] = s.distinct;
  const l1 = s.domains[d1].level;
  const l2 = s.domains[d2].level;
  if (l1 === 'mid') return '두루 균형 잡힌 사람';
  if (l2 === 'mid') return `${DOMAINS[d1].adj[l1][1]} 사람`;
  return `${DOMAINS[d1].adj[l1][0]} ${DOMAINS[d2].adj[l2][1]} 사람`;
}

function section(id, title, lead, body) {
  return `<section class="rsec" id="r-${id}" aria-labelledby="r-${id}-t">
    <h2 class="rsec-title" id="r-${id}-t">${esc(title)}</h2>
    ${lead ? `<p class="rsec-lead">${lead}</p>` : ''}
    ${body}
  </section>`;
}

export function renderReport(el, rec, ctx = {}) {
  const s = rec.scores;
  const D = s.domains;
  const F = s.facets;
  const name = rec.name || '검사자';
  const headline = headlineOf(s);
  const [d1, d2] = s.distinct;
  const scores = Object.fromEntries(DOMAIN_ORDER.map((d) => [d, D[d].score]));

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">성격 5요인 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <h1 class="cover-headline">${esc(headline)}</h1>
          <p class="cover-tagline">${D[d1].level === 'mid' ? '다섯 영역이 모두 중간 범위에 있어, 상황에 따라 다양한 모습을 고르게 꺼내 써요.' : `${esc(DOMAINS[d1].levels[D[d1].level].title)}의 모습이 가장 뚜렷해요.`}</p>
        </div>
        <div class="cover-figure">${b5Star(scores, { animate: true, size: 320 })}</div>
      </div>
      <dl class="b5-chips">${DOMAIN_ORDER.map((d) => `<div class="b5-chip"><dt class="nm"><i style="background:${DOMAINS[d].color}"></i>${esc(DOMAINS[d].name)}</dt><dd class="sc" style="margin:0">${D[d].score}</dd><dd class="lv" style="margin:0">${LEVEL_LABEL[D[d].level]}</dd></div>`).join('')}</dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['overview', '다섯 영역'],
    ...DOMAIN_ORDER.map((d) => [d, DOMAINS[d].name]),
    ['styles', '스타일 10가지'],
    ['facets', '두드러진 특징'],
    ['growth', '성장 제안'],
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const st = s.styles || {};
  const rel = STYLES.EA.q[st.EA];
  const act = STYLES.EC.q[st.EC];
  const sumParas = [];
  if (D[d1].level === 'mid') {
    sumParas.push(`${esc(name)} 님은 다섯 영역이 모두 중간 범위에 있어요. 어느 한쪽으로 크게 치우치지 않아서, 상황에 맞게 여러 모습을 고르게 꺼내 쓰는 균형형이에요.`);
  } else {
    sumParas.push(`${esc(name)} 님은 다섯 영역 가운데 <strong>${esc(DOMAINS[d1].name)}</strong>이 가장 두드러져요(${D[d1].score}점, ${LEVEL_LABEL[D[d1].level]}). ${esc(DOMAINS[d1].levels[D[d1].level].title)}에 가까운 모습이에요.`);
    if (D[d2].level !== 'mid') sumParas.push(`그다음으로 특징적인 영역은 <strong>${esc(DOMAINS[d2].name)}</strong>이에요(${D[d2].score}점, ${LEVEL_LABEL[D[d2].level]}). ${esc(DOMAINS[d2].levels[D[d2].level].title)}의 모습이 함께 보여요.`);
  }
  if (rel && act) sumParas.push(`두 영역을 엮어 보면, 관계에서는 ‘${esc(rel.name)}’, 일과 활동에서는 ‘${esc(act.name)}’에 가까워요.`);
  const summary = section('summary', '한눈에 보기', '', `<div class="summary-box prose">${sumParas.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 다섯 영역 ────────────────────────────────
  const overview = section(
    'overview',
    '다섯 영역 점수',
    "120개 문항의 응답을 영역별로 0~100점으로 환산했어요. 50은 '보통이다' 근처를 뜻하고, 60을 넘으면 높음, 40보다 낮으면 낮음으로 읽어요. 높고 낮음은 좋고 나쁨이 아니라 성격의 방향이에요.",
    `<ul class="b5-overview">${DOMAIN_ORDER.map((d) => `<li><span class="nm"><i style="background:${DOMAINS[d].color}"></i>${esc(DOMAINS[d].name)}</span>
      <span class="track" aria-hidden="true"><span class="mid"></span><span class="fill" style="width:${D[d].score}%;background:${DOMAINS[d].color}"></span></span>
      <span class="val">${D[d].score}</span>${pill(D[d].level)}</li>`).join('')}</ul>`
  );

  // ── 영역별 상세 ──────────────────────────────
  const domainSecs = DOMAIN_ORDER.map((d) => {
    const info = DOMAINS[d];
    const lv = D[d].level;
    const L = info.levels[lv];
    const codes = Object.keys(FACETS).filter((f) => FACETS[f].d === d);
    return `<section class="rsec" id="r-${d}" aria-labelledby="r-${d}-t">
      <div class="domain-head"><span class="dot" style="background:${info.color}"></span><h2 class="rsec-title" id="r-${d}-t">${esc(info.name)}</h2>${pill(lv)}<span class="score">${D[d].score}</span></div>
      <p class="domain-what">${esc(info.what)}</p>
      <div class="domain-read">
        <h3>${esc(L.title)}</h3>
        <p>${esc(L.text)}</p>
        <dl class="domain-ctx"><div><dt>관계에서</dt><dd>${esc(L.love)}</dd></div><div><dt>일에서</dt><dd>${esc(L.work)}</dd></div></dl>
      </div>
      <ul class="facet-list" aria-label="${esc(info.name)} 하위 요인">${codes
        .map((f) => `<li class="facet"><div class="facet-top"><strong>${esc(FACETS[f].name)}</strong>${pill(F[f].level)}<span class="val">${F[f].score}</span></div>
          <span class="track" aria-hidden="true"><span class="fill" style="width:${F[f].score}%;background:${info.color}"></span></span>
          <p>${esc(FACET_TEXT[f][F[f].level])}</p></li>`)
        .join('')}</ul>
    </section>`;
  }).join('');

  // ── 스타일 10가지 ────────────────────────────
  const styles = section(
    'styles',
    '두 영역을 엮어 본 스타일 10가지',
    '성격은 한 영역보다 두 영역이 만날 때 더 선명하게 드러나요. 각 그림에서 점의 위치가 나의 자리이고, 칠해진 칸이 내가 속한 스타일이에요.',
    `<div class="styles-grid">${STYLE_PAIRS.map(([x, y]) => {
      const key = `${x}${y}`;
      const info = STYLES[key];
      const q = info.q[st[key]];
      return `<article class="style-card">${quadrant(D[x].score, D[y].score, { xLabel: DOMAINS[x].name, yLabel: DOMAINS[y].name, title: `${DOMAINS[x].name} ${D[x].score}, ${DOMAINS[y].name} ${D[y].score}` })}
        <div><p class="cat">${esc(info.cat)}: ${esc(DOMAINS[x].name)}과 ${esc(DOMAINS[y].name)}</p><h3>${esc(q.name)}</h3><p>${esc(q.text)}</p></div></article>`;
    }).join('')}</div>`
  );

  // ── 두드러진 하위 요인 ───────────────────────
  const facetItem = (f) => `<li><strong>${esc(FACETS[f].name)}</strong> <span style="color:var(--ink-3);font-size:var(--fs-s)">${esc(DOMAINS[FACETS[f].d].name)}, ${F[f].score}점</span><br>${esc(FACET_TEXT[f][F[f].level])}</li>`;
  const facetsSec = section(
    'facets',
    '두드러진 특징',
    '하위 요인 30개 가운데 가장 높게 나온 셋과 가장 낮게 나온 셋이에요. 낮게 나온 요인은 부족한 점이 아니라 덜 쓰는 모습이에요.',
    `<div class="two-lists">
      <div><h4>가장 높게 나온 하위 요인</h4><ul class="check-list">${(s.top || []).map(facetItem).join('')}</ul></div>
      <div><h4>가장 낮게 나온 하위 요인</h4><ul class="check-list check-list--soft">${(s.bottom || []).map(facetItem).join('')}</ul></div>
    </div>`
  );

  // ── 성장 제안 ────────────────────────────────
  const ordered = (s.distinct || DOMAIN_ORDER).slice();
  const growth = section(
    'growth',
    '성장을 위한 제안',
    '영역마다 지금의 모습에 맞춘 작은 연습이에요. 가장 두드러진 영역부터 적었어요. 하나만 골라 일주일 동안 해 보세요.',
    `<ol class="practice-list">${ordered.map((d) => `<li><span><strong>${esc(DOMAINS[d].name)}</strong> ${esc(DOMAINS[d].levels[D[d].level].tip)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>다섯 개의 결이 모여 ${esc(name)} 님이라는 별 하나가 돼요. 높고 낮음은 좋고 나쁨이 아니라, 별마다 다른 모양일 뿐이에요.</p><small>${esc(name)} 님의 성격 5요인 검사 결과지</small></div>`
  );

  // ── 응답 점검 ────────────────────────────────
  const C = s.check || {};
  const notes = [];
  if (C.clashRatio >= 0.25) notes.push(`서로 반대되는 문장에 같은 쪽으로 답한 경우가 꽤 있어요. 문항을 빠르게 넘겼거나, 상황에 따라 모습이 많이 달라지는 편일 수 있어요. 점수를 볼 때 함께 참고해 주세요.`);
  else notes.push('서로 반대되는 문장에 대한 응답이 일관돼요.');
  if (C.rawMean >= 3.6) notes.push("전반적으로 '그렇다' 쪽으로 답하는 경향이 있어요. 반대로 채점하는 문항이 섞여 있어서 점수에 미치는 영향은 줄어들어요.");
  else if (C.rawMean <= 2.4) notes.push("전반적으로 '아니다' 쪽으로 답하는 경향이 있어요. 반대로 채점하는 문항이 섞여 있어서 점수에 미치는 영향은 줄어들어요.");
  if (C.midRatio >= 0.35) notes.push("'보통이다' 응답이 많은 편이에요. 그래서 점수가 50 근처로 모였을 수 있어요.");
  if (C.extremeRatio >= 0.45) notes.push("'전혀 아니다'나 '매우 그렇다'처럼 분명한 응답이 많아요. 자기 모습을 비교적 확신하고 있는 편이에요.");
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>분명한 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>'보통이다' 응답</dt><dd>${Math.round((C.midRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>어긋난 응답</dt><dd>${Math.round((C.clashRatio || 0) * 100)}%</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${overview}${domainSecs}${styles}${facetsSec}${growth}${check}</div>`;
  wireToc(el);
}

