// AZIT : Star&Moon — 한국형 성향검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { constellation, barList, legend, starGlyph, arrowGlyph, centerColor } from '../../assets/js/charts.js';
import { TYPES } from './content-types.js';
import { WINGS, TRI_ROLES, CENTERS, INSTINCTS, SUBTYPES, HORNEVIAN, HARMONIC } from './content-extra.js';
import { MOTIVE_DIMS } from './items.js';
import { CENTER_OF, WING_OF, GROWTH, STRESS } from './scoring.js';

const CONF = {
  high: { label: '뚜렷함', note: '핵심 유형이 뚜렷하게 나타났어요.' },
  mid: { label: '비교적 뚜렷함', note: '핵심 유형이 비교적 뚜렷해요.' },
  low: { label: '팽팽함', note: '두 유형이 팽팽하게 나타났어요.' },
};
const CENTER_KEYS = ['gut', 'heart', 'head'];
const DIM_LABEL = Object.fromEntries(MOTIVE_DIMS.map((d) => [d.id, d.label]));

const hasJong = (word) => {
  const ch = String(word).trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  return /[013678]$/.test(ch);
};
const eul = (w) => `${w}${hasJong(w) ? '을' : '를'}`;
const tName = (t) => `${t}번 ${TYPES[t].name}`;
const pick = (obj, k, d = 0) => (obj && obj[k] != null ? obj[k] : d);

function section(id, title, lead, body) {
  return `<section class="rsec" id="r-${id}" aria-labelledby="r-${id}-t">
    <h2 class="rsec-title" id="r-${id}-t">${esc(title)}</h2>
    ${lead ? `<p class="rsec-lead">${lead}</p>` : ''}
    ${body}
  </section>`;
}

export function renderReport(el, rec, ctx = {}) {
  const s = rec.scores;
  const core = Number(s.core);
  const T = TYPES[core];
  const name = rec.name || '응시자';
  const ts = s.likert.typeScore;
  const wingKey = `${core}w${s.wing}`;
  const W = WINGS[wingKey];
  const conf = CONF[s.confidence] || CONF.mid;
  const ranking = (s.ranking || []).map(Number);
  const second = ranking[1];
  const inst = s.instinct;
  const stack = inst.stack || ['sp', 'so', 'sx'];
  const dom = stack[0];
  const blind = stack[2];
  const sub = SUBTYPES[`${dom}${core}`];
  const tri = (s.tritype || []).map(Number);

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">한국형 성향검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님의 핵심 유형</p>
      <div class="cover-hero">
        <div>
          <div class="cover-numeral" aria-hidden="true">${core}</div>
          <h1 class="cover-type">${esc(tName(core))}</h1>
          <p class="cover-tagline">${esc(T.tagline)}</p>
        </div>
        <div class="cover-figure">${constellation(ts, { core, animate: true, size: 300, title: `아홉 유형 점수를 별 밝기로 나타낸 그림. 가장 밝은 별은 ${core}번.` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>날개</dt><dd>${esc(wingKey)}<small>${esc(W ? W.name : '')}</small></dd></div>
        <div><dt>트라이타입</dt><dd>${esc(tri.join('-'))}<small>${esc(tri.map((t) => CENTERS[CENTER_OF[t]].short).join(', '))}</small></dd></div>
        <div><dt>본능</dt><dd>${esc(stack.map((k) => INSTINCTS[k].short).join('/'))}<small>${esc(INSTINCTS[dom].name)} 본능이 먼저</small></dd></div>
        <div><dt>유형 확신도</dt><dd>${esc(conf.label)}<small>1·2위 점수 차 ${Math.round((s.margin || 0) * 100)}점</small></dd></div>
      </dl>
    </div>
  </header>`;

  // ── 목차 ─────────────────────────────────────
  const tocItems = [
    ['summary', '요약'],
    ['scores', '유형 점수'],
    ['motive', '동기 비교'],
    ...(s.confidence !== 'high' && second ? [['compare', '함께 읽을 유형']] : []),
    ['core', `${core}번 이야기`],
    ['wing', '날개'],
    ['arrows', '성장과 스트레스'],
    ['love', '관계'],
    ['work', '일'],
    ['tritype', '트라이타입'],
    ['centers', '세 중심'],
    ['instinct', '본능'],
    ['groups', '행동 방식'],
    ['style', '응답 경향'],
    ['growth', '성장 제안'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems
    .map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`)
    .join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  let confLine = conf.note;
  if (s.confidence === 'mid' && second) confLine = `핵심 유형이 비교적 뚜렷하지만, ${tName(second)}의 특징도 함께 나타나요.`;
  if (s.confidence === 'low' && second) confLine = `${core}번과 ${second}번이 팽팽하게 나타났어요. 아래 ‘함께 읽을 유형’에서 두 유형의 동기를 나란히 비교해 보세요.`;
  const summary = section(
    'summary',
    '한눈에 보기',
    '',
    `<div class="summary-box prose">
      <p>${esc(name)} 님의 핵심 유형은 <strong>${esc(tName(core))}</strong>${hasJong(T.name) ? '이에요' : '예요'}. ${esc(T.tagline)}이에요.</p>
      <p>마음 가장 깊은 곳에서는 ‘${esc(T.desire)}’을 바라고, ‘${esc(T.fear)}’을 두려워해요.</p>
      <p>날개는 ${s.wing}번(${esc(W ? W.name : '')})이고, 트라이타입은 ${esc(tri.join('-'))}예요. 본능은 ${esc(INSTINCTS[dom].name)} 본능이 가장 앞서서, 같은 ${core}번 중에서도 ‘${esc(sub ? sub.name : '')}’의 모습에 가까워요.</p>
      <p>${esc(confLine)}</p>
    </div>`
  );

  // ── 유형 점수 ────────────────────────────────
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort((a, b) => pick(ts, b) - pick(ts, a) || a - b);
  const scoreRows = order.map((t) => ({
    num: t,
    label: TYPES[t].name,
    value: pick(ts, t),
    color: centerColor(t),
    core: t === core,
  }));
  const scores = section(
    'scores',
    '아홉 유형 점수',
    '1부 응답을 유형별로 0~100점으로 환산했어요. 점수가 높을수록 그 유형의 모습을 평소에 많이 쓴다는 뜻이에요.',
    `${legend(CENTER_KEYS.map((c) => ({ label: `${CENTERS[c].name} (${CENTERS[c].types.join(', ')}번)`, color: `var(--${c})` })))}
    ${barList(scoreRows, { aria: '아홉 유형 점수' })}
    <p class="final-note">핵심 유형(★)은 이 점수만이 아니라, 다음에 나오는 2부 동기 비교를 함께 반영해 정했어요.</p>`
  );

  // ── 동기 비교 ────────────────────────────────
  const cands = (s.motive.candidates || []).map(Number);
  const duels = (s.motive.duels || [])
    .map((d) => {
      const a = Number(d.a);
      const b = Number(d.b);
      const byDim = d.byDim || {};
      const winsA = pick(d.wins, a);
      const winsB = pick(d.wins, b);
      const cells = MOTIVE_DIMS.map((dim) => {
        const r = byDim[dim.id];
        if (!r) return `<div class="duel-dim"><span class="dl">${esc(dim.label)}</span><span class="dw">–</span></div>`;
        const w = Number(r.winner);
        return `<div class="duel-dim ${w === core ? 'win-core' : ''}"><span class="dl">${esc(dim.label)}</span><span class="dw">${w}</span><span class="ds">${Number(r.strength) === 2 ? '확실히' : '조금'}</span></div>`;
      }).join('');
      const [left, right, wl, wr] = winsA >= winsB ? [a, b, winsA, winsB] : [b, a, winsB, winsA];
      return `<div class="duel"><div class="duel-head">${esc(tName(left))}<span class="vs">와</span>${esc(tName(right))}<span class="score">${wl} : ${wr}</span></div><div class="duel-dims">${cells}</div></div>`;
    })
    .join('');
  const finalRows = ranking.map((t) => ({ num: t, label: TYPES[t].name, value: Math.round(pick(s.final, t) * 100), color: centerColor(t), core: t === core }));
  const motive = section(
    'motive',
    '핵심 유형을 가려낸 과정',
    `1부에서 가장 높았던 세 유형(${cands.map((t) => `${t}번`).join(', ')})의 동기를 여섯 가지 질문으로 맞대어 봤어요. 칸 안의 숫자는 그 질문에서 더 가깝다고 고른 유형이에요.`,
    `<div class="duels">${duels}</div>
    <h3 class="rsub">최종 점수</h3>
    ${barList(finalRows, { aria: '후보 유형 최종 점수' })}
    <p class="final-note">1부 성향 점수(45%)와 2부 동기 비교(55%)를 합친 점수예요. 행동은 여러 유형이 비슷해 보일 수 있어서, 그 행동을 하는 이유를 묻는 2부에 더 큰 비중을 뒀어요.</p>`
  );

  // ── 함께 읽을 유형 ───────────────────────────
  let compare = '';
  if (s.confidence !== 'high' && second) {
    const col = (t) => {
      const X = TYPES[t];
      return `<div class="compare-col"><h3>${esc(tName(t))}</h3><dl>
        <div><dt>바라는 것</dt><dd>${esc(X.desire)}</dd></div>
        <div><dt>두려운 것</dt><dd>${esc(X.fear)}</dd></div>
        <div><dt>주의가 가는 곳</dt><dd>${esc(X.attention)}</dd></div>
        <div><dt>감정의 습관</dt><dd>${esc(X.passion.name)}. ${esc(X.passion.text)}</dd></div>
      </dl></div>`;
    };
    compare = section(
      'compare',
      '함께 읽을 유형',
      `${core}번과 ${second}번의 점수가 가까워요. 두 유형 중 마음 깊이 더 와닿는 쪽이 핵심 유형일 가능성이 높아요. 특히 ‘두려운 것’을 나란히 읽어 보세요.`,
      `<div class="compare">${col(core)}${col(second)}</div>`
    );
  }

  // ── 핵심 유형 ────────────────────────────────
  const coreSec = section(
    'core',
    `${tName(core)}`,
    esc(T.tagline),
    `<dl class="motive-grid">
      <div class="motive motive--strong"><dt>바라는 것</dt><dd>${esc(T.desire)}</dd></div>
      <div class="motive"><dt>두려워하는 것</dt><dd>${esc(T.fear)}</dd></div>
      <div class="motive"><dt>감정의 습관</dt><dd><span class="mname">${esc(T.passion.name)}</span><span class="mtext">${esc(T.passion.text)}</span></dd></div>
      <div class="motive"><dt>회복되는 자리</dt><dd><span class="mname">${esc(T.virtue.name)}</span><span class="mtext">${esc(T.virtue.text)}</span></dd></div>
    </dl>
    <div class="prose">${T.overview.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <blockquote class="quote"><small>주의가 머무는 곳</small>${esc(T.attention)}</blockquote>
    <blockquote class="quote"><small>어린 시절 마음에 새겼을 수 있는 말</small>${esc(T.childhood)}</blockquote>
    <div class="two-lists">
      <div><h4>빛나는 점</h4><ul class="check-list">${T.strengths.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h4>걸려 넘어지기 쉬운 점</h4><ul class="check-list check-list--soft">${T.pitfalls.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <h3 class="rsub">마음 상태에 따라 달라지는 모습</h3>
    <ol class="levels">
      <li><span class="lv"><i style="background:var(--ok)"></i>건강할 때</span><p>${esc(T.states.healthy)}</p></li>
      <li><span class="lv"><i style="background:var(--star)"></i>평소</span><p>${esc(T.states.average)}</p></li>
      <li><span class="lv"><i style="background:var(--danger)"></i>지칠 때</span><p>${esc(T.states.stressed)}</p></li>
    </ol>`
  );

  // ── 날개 ─────────────────────────────────────
  const [w1, w2] = WING_OF[core];
  const m = s.likert.typeMean;
  const diff = pick(m, w1, 3) - pick(m, w2, 3);
  const clamp = Math.max(-1.6, Math.min(1.6, diff));
  const knob = 50 - (clamp / 1.6) * 42;
  const other = s.wing === w1 ? w2 : w1;
  const W2 = WINGS[`${core}w${other}`];
  const wing = section(
    'wing',
    '날개',
    '핵심 유형 양옆의 두 유형을 날개라고 불러요. 둘 중 더 강하게 나타나는 쪽이 핵심 유형에 고유한 색을 더해요.',
    `<div class="wing-meter" role="img" aria-label="${w1}번 ${pick(ts, w1)}점, ${w2}번 ${pick(ts, w2)}점">
      <div class="ends"><span><b>${esc(tName(w1))}</b> ${pick(ts, w1)}</span><span>${pick(ts, w2)} <b>${esc(tName(w2))}</b></span></div>
      <div class="rail"><span class="mid"></span><span class="knob" style="left:${knob.toFixed(1)}%"></span></div>
    </div>
    ${W ? `<div class="wing-card"><p class="code">${esc(wingKey)}</p><h3>${esc(W.name)}</h3><p>${esc(W.text)}</p></div>` : ''}
    ${s.wingBalanced && W2 ? `<p class="final-note">두 날개의 점수가 비슷해요. 상황에 따라 ${esc(`${core}w${other}`)}(${esc(W2.name)})의 모습도 자주 나올 수 있어요. ${esc(W2.text)}</p>` : ''}`
  );

  // ── 성장과 스트레스 ──────────────────────────
  const g = GROWTH[core];
  const st = STRESS[core];
  const arrows = section(
    'arrows',
    '성장과 스트레스',
    '유형마다 성장할 때 닮아 가는 유형과, 지칠 때 기우는 유형이 정해져 있어요. 그림에서 금색 화살표가 성장 방향, 회색 화살표가 스트레스 방향이에요.',
    `<div class="figure-panel sky"><div>${constellation(ts, { core, growth: g, stress: st, size: 300, title: `${core}번의 성장 방향 ${g}번, 스트레스 방향 ${st}번` })}</div><p class="figure-legend"><span><i style="background:#d99a1e"></i>성장 방향</span><span><i style="background:#9aa0bd"></i>스트레스 방향</span></p></div>
    <div class="arrows">
      <div class="arrow-card arrow-card--growth"><p class="kind">성장할 때</p><div class="path">${core}${arrowGlyph('#e2b653')}${g}</div><p class="to">${esc(tName(g))}의 건강한 모습을 닮아 가요</p><p>${esc(T.growth)}</p></div>
      <div class="arrow-card"><p class="kind">지칠 때</p><div class="path">${core}${arrowGlyph('#8f96b8')}${st}</div><p class="to">${esc(tName(st))}의 힘든 모습으로 기울어요</p><p>${esc(T.stress)}</p></div>
    </div>`
  );

  // ── 관계 ─────────────────────────────────────
  const love = section(
    'love',
    '관계와 사랑',
    '',
    `<div class="prose"><p>${esc(T.love)}</p><p>${esc(T.friendship)}</p></div>
    <h3 class="rsub">${esc(`${core}번과 잘 지내는 법`)}</h3>
    <p class="rsec-lead">가까운 사람에게 이 부분을 보여 주면 서로를 이해하는 데 도움이 돼요.</p>
    <ul class="with-list">${T.howToBeWith.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
  );

  // ── 일 ───────────────────────────────────────
  const work = section(
    'work',
    '일하는 방식',
    '',
    `<dl class="kv">
      <div><dt>강점이 드러나는 일</dt><dd>${esc(T.work.style)}</dd></div>
      <div><dt>잘 맞는 환경</dt><dd>${esc(T.work.thrive)}</dd></div>
      <div><dt>조심할 점</dt><dd>${esc(T.work.caution)}</dd></div>
    </dl>`
  );

  // ── 트라이타입 ───────────────────────────────
  const tritype = section(
    'tritype',
    '트라이타입',
    '세 중심(장, 가슴, 머리)에서 각각 가장 높게 나온 유형을 묶은 거예요. 핵심 유형이 삶의 방향을 정하고, 나머지 두 유형이 다른 중심에서 그 방향을 거들어요. 순서는 점수가 높은 순이에요.',
    `<div class="tri">${tri
      .map((t, i) => `<div class="tri-cell ${i === 0 ? 'tri-cell--core' : ''}"><div class="n">${t}</div><div class="c"><i style="background:var(--${CENTER_OF[t]})"></i>${esc(CENTERS[CENTER_OF[t]].name)}</div><div class="nm">${esc(TYPES[t].name)}</div></div>`)
      .join('')}</div>
    <ul class="tri-roles">${tri.map((t) => `<li><b>${t}</b><p>${esc(TRI_ROLES[t])}</p></li>`).join('')}</ul>`
  );

  // ── 세 중심 ──────────────────────────────────
  const cs = s.centers || {};
  const cRank = CENTER_KEYS.slice().sort((a, b) => pick(cs, b) - pick(cs, a));
  const top = cRank[0];
  const low = cRank[2];
  const coreC = CENTER_OF[core];
  const centersSec = section(
    'centers',
    '세 중심',
    '사람이 세상을 겪는 통로는 장(몸과 본능), 가슴(감정과 관계), 머리(생각과 분석) 세 가지로 나눌 수 있어요. 각 중심에 속한 세 유형의 점수를 평균했어요.',
    `${barList(CENTER_KEYS.map((c) => ({ label: CENTERS[c].name, value: pick(cs, c), color: `var(--${c})`, core: c === top })), { aria: '세 중심 점수' })}
    <div class="prose" style="margin-top:18px">
      <p><strong>${esc(CENTERS[top].name)}이 가장 높아요.</strong> ${esc(CENTERS[top].text)}</p>
      ${top !== coreC ? `<p>핵심 유형인 ${core}번은 ${esc(CENTERS[coreC].name)}에 속하지만, 1부 점수로는 ${esc(CENTERS[top].name)}이 가장 높게 나왔어요. 핵심 동기는 ${esc(CENTERS[coreC].name)}에서 나오되, 평소에는 ${esc(CENTERS[top].name)}의 방식도 많이 쓴다는 뜻이에요.</p>` : ''}
      <p><strong>상대적으로 덜 쓰는 중심은 ${esc(CENTERS[low].name)}이에요.</strong> ${esc(CENTERS[low].low)}</p>
    </div>`
  );

  // ── 본능 ─────────────────────────────────────
  const instSec = section(
    'instinct',
    '본능과 하위유형',
    '같은 유형이라도 어떤 본능이 앞서느냐에 따라 꽤 다르게 보여요. 세 본능을 앞서는 순서대로 나타냈어요.',
    `<div class="inst-stack">${stack
      .map((k, i) => `${i ? '<span class="gt" aria-hidden="true">&gt;</span>' : ''}<span class="pill ${i === 0 ? 'pill--top' : ''}">${esc(INSTINCTS[k].name)} ${esc(INSTINCTS[k].short)}</span>`)
      .join('')}</div>
    ${barList(stack.map((k, i) => ({ label: INSTINCTS[k].name, value: pick(inst.score, k), color: 'var(--brand)', core: i === 0 })), { aria: '본능 점수' })}
    <div class="prose" style="margin-top:18px">
      <p><strong>${esc(INSTINCTS[dom].name)} 본능은 ${esc(eul(INSTINCTS[dom].focus))} 향해요.</strong> ${esc(INSTINCTS[dom].text)}</p>
      ${inst.tiedTop ? `<p>${esc(INSTINCTS[stack[0]].name)} 본능과 ${esc(INSTINCTS[stack[1]].name)} 본능이 비슷하게 앞서요. 두 본능이 함께 삶을 이끌고 있어요.</p>` : ''}
    </div>
    ${sub ? `<div class="subtype-card"><p class="code">하위유형 ${esc(INSTINCTS[dom].short)}${core}</p><h3>${esc(sub.name)}</h3><p>${esc(sub.text)}</p></div>` : ''}
    <h3 class="rsub">가장 뒤에 있는 본능: ${esc(INSTINCTS[blind].name)}</h3>
    <p>${esc(INSTINCTS[blind].blind)}</p>`
  );

  // ── 행동 방식 그룹 ───────────────────────────
  const gH = s.groups.hornevian || {};
  const gM = s.groups.harmonic || {};
  const coreH = HORNEVIAN[s.groups.coreHornevian];
  const coreM = HARMONIC[s.groups.coreHarmonic];
  const hTop = Object.keys(HORNEVIAN).sort((a, b) => pick(gH, b) - pick(gH, a))[0];
  const mTop = Object.keys(HARMONIC).sort((a, b) => pick(gM, b) - pick(gM, a))[0];
  const groups = section(
    'groups',
    '행동 방식',
    `${core}번이 속한 두 그룹이에요. 막대는 1부 점수로 본 지금의 경향이에요.`,
    `<div class="groups">
      <div class="group-card"><h3>원하는 것을 얻는 방식</h3><p class="gname">${esc(coreH.name)}</p><p>${esc(coreH.text)}</p>
        ${barList(Object.keys(HORNEVIAN).map((k) => ({ label: HORNEVIAN[k].name, value: pick(gH, k), color: 'var(--brand)', core: k === s.groups.coreHornevian })), { aria: '행동 방식 그룹 점수', stacked: true })}
        <p><strong>성장 과제</strong> ${esc(coreH.task)}</p>
        ${hTop !== s.groups.coreHornevian ? `<p>요즘의 응답에서는 ‘${esc(HORNEVIAN[hTop].name)}’ 쪽 점수가 가장 높았어요. 핵심 동기와 별개로, 지금은 이 방식을 많이 쓰고 있을 수 있어요.</p>` : ''}
      </div>
      <div class="group-card"><h3>일이 뜻대로 안 될 때</h3><p class="gname">${esc(coreM.name)}</p><p>${esc(coreM.text)}</p>
        ${barList(Object.keys(HARMONIC).map((k) => ({ label: HARMONIC[k].name, value: pick(gM, k), color: 'var(--brand)', core: k === s.groups.coreHarmonic })), { aria: '반응 방식 그룹 점수', stacked: true })}
        ${mTop !== s.groups.coreHarmonic ? `<p>요즘의 응답에서는 ‘${esc(HARMONIC[mTop].name)}’ 쪽 점수가 가장 높았어요.</p>` : ''}
      </div>
    </div>`
  );

  // ── 응답 경향 ────────────────────────────────
  const L = s.likert;
  const notes = [];
  if (L.overallMean >= 3.6) notes.push('전반적으로 ‘그렇다’ 쪽으로 답하는 경향이 있어요. 그래서 점수의 높낮이보다 유형 사이의 순서와 2부 동기 비교를 중심으로 해석했어요.');
  else if (L.overallMean <= 2.4) notes.push('전반적으로 ‘아니다’ 쪽으로 답하는 경향이 있어요. 스스로에게 엄격하게 답했을 수 있어요. 점수의 높낮이보다 유형 사이의 순서를 중심으로 읽어 주세요.');
  else notes.push('응답이 한쪽으로 치우치지 않고 고르게 퍼져 있어요.');
  if (L.extremeRatio >= 0.45) notes.push('‘전혀 아니다’나 ‘매우 그렇다’처럼 분명한 응답이 많아요. 자기 모습을 비교적 확신하고 있는 편이에요.');
  if (L.midRatio >= 0.35) notes.push('‘보통이다’ 응답이 많은 편이에요. 상황에 따라 모습이 많이 달라진다고 느끼거나, 스스로를 한 가지로 규정하기 어려운 시기일 수 있어요.');
  if (L.typeSpread < 0.25) notes.push('아홉 유형의 점수 차이가 작아요. 여러 유형의 모습을 고르게 지니고 있어서, 핵심 유형을 정할 때 2부 동기 비교가 큰 역할을 했어요.');
  else if (L.typeSpread >= 0.6) notes.push('유형 사이의 점수 차이가 커서 성향이 또렷하게 드러났어요.');
  const spreadLabel = L.typeSpread >= 0.6 ? '큼' : L.typeSpread >= 0.3 ? '보통' : '작음';
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const style = section(
    'style',
    '응답 경향',
    '1부 90문항에 어떻게 답했는지를 살펴봤어요. 결과를 읽을 때 함께 참고해 주세요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답</dt><dd>${Number(L.overallMean).toFixed(2)}</dd></div>
      <div class="metric"><dt>분명한 응답</dt><dd>${Math.round(L.extremeRatio * 100)}%</dd></div>
      <div class="metric"><dt>‘보통이다’ 응답</dt><dd>${Math.round(L.midRatio * 100)}%</dd></div>
      <div class="metric"><dt>유형 간 차이</dt><dd>${spreadLabel}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  // ── 성장 제안 ────────────────────────────────
  const growth = section(
    'growth',
    '성장을 위한 제안',
    `${core}번이 ${eul(T.virtue.name)} 향해 가는 데 도움이 되는 작은 연습들이에요. 하나만 골라 일주일 동안 해 보세요.`,
    `<ol class="practice-list">${T.practices.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(T.message)}</p><small>${esc(name)} 님의 한국형 성향검사 결과지</small></div>`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${scores}${motive}${compare}${coreSec}${wing}${arrows}${love}${work}${tritype}${centersSec}${instSec}${groups}${style}${growth}</div>`;
  wireToc(el);
}

function wireToc(el) {
  const links = Array.from(el.querySelectorAll('.toc a'));
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = map.get(en.target.id);
        if (a) {
          a.setAttribute('aria-current', 'true');
          a.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
      });
    },
    { rootMargin: '-30% 0px -60% 0px' }
  );
  el.querySelectorAll('.rsec').forEach((sec) => io.observe(sec));
}
