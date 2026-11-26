// AZIT : Star&Moon — 기질과 성품 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { DIMS, TEMP_ORDER, CHAR_ORDER, DIM_ORDER, GROUPS } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { TEMP_LABEL, CHAR_LABEL, TEMP_TEXT, CHAR_TEXT, TEMP_TYPES, CHAR_SHAPES, MEET, TEMP_Q, GROW_Q, COUNSEL_GENERAL, PRACTICE_GENERAL, CLOSING } from './content.js';
import { tcRose, GROUP_COLOR } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const isTemp = (k) => TEMP_ORDER.includes(k);
// 기질은 좋고 나쁨이 없으므로 같은 모양의 알약으로, 성품은 단계별 색으로
const pill = (k, lv) => (isTemp(k)
  ? `<span class="cp-pill cp-pill--mid">${TEMP_LABEL[lv]}</span>`
  : `<span class="cp-pill cp-pill--${lv}">${CHAR_LABEL[lv]}</span>`);
const sw = (k) => `<i style="background:${GROUP_COLOR[DIMS[k].group]}"></i>`;
const band = (lv) => (lv === 'vhigh' || lv === 'high' ? 'high' : lv);

function section(id, title, lead, body, cls = '') {
  return `<section class="rsec ${cls}" id="r-${id}" aria-labelledby="r-${id}-t">
    <h2 class="rsec-title" id="r-${id}-t">${esc(title)}</h2>
    ${lead ? `<p class="rsec-lead">${lead}</p>` : ''}
    ${body}
  </section>`;
}

// 기질과 성품의 만남: 위에서부터 맞는 조합을 세 개까지
function meetings(d) {
  const hi = (k) => d[k].score >= 60;
  const lo = (k) => d[k].score < 40;
  const strong = (k) => d[k].score >= 60;
  const weak = (k) => d[k].score < 50;
  const rules = [
    ['haSdLo', hi('ha') && weak('sd'), ['ha', 'sd']],
    ['haSdHi', hi('ha') && strong('sd'), ['ha', 'sd']],
    ['nsSdLo', hi('ns') && weak('sd'), ['ns', 'sd']],
    ['nsSdHi', hi('ns') && strong('sd'), ['ns', 'sd']],
    ['nsPsLo', hi('ns') && lo('ps'), ['ns', 'ps']],
    ['rdSdLo', hi('rd') && weak('sd'), ['rd', 'sd']],
    ['rdCoHi', hi('rd') && strong('co'), ['rd', 'co']],
    ['psHaHi', hi('ps') && hi('ha'), ['ps', 'ha']],
    ['psSdHi', hi('ps') && strong('sd'), ['ps', 'sd']],
    ['haLoNsHi', lo('ha') && hi('ns'), ['ha', 'ns']],
    ['rdLoCoHi', lo('rd') && strong('co'), ['rd', 'co']],
    ['rdLoCoLo', lo('rd') && weak('co'), ['rd', 'co']],
  ];
  const got = rules.filter((r) => r[1]).slice(0, 3).map(([id, , ks]) => ({ id, ks }));
  return got.length ? got : [{ id: 'even', ks: [] }];
}

export function renderReport(el, rec, ctx = {}) {
  const s = rec.scores;
  const name = rec.name || '검사자';
  const showCounsel = !ctx.shared;
  const d = s.dims;
  const T = TEMP_TYPES[s.ttype];
  const S = CHAR_SHAPES[s.shape];
  const t0 = s.tempOrder[0];
  const t0dir = d[t0].level; // high | mid | low
  const grow = s.grow;
  const M = meetings(d);
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  const lvName = (k) => (isTemp(k) ? TEMP_LABEL[d[k].level] : CHAR_LABEL[d[k].level]);
  const legend = `<p class="tcr-legend">${['temp', 'char'].map((g) => `<span><i style="background:${GROUP_COLOR[g]}"></i>${esc(GROUPS[g].long)}</span>`).join('')}</p>`;

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">기질과 성품 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="cp-kicker">타고난 기질</p>
          <h1 class="cover-headline">${esc(T.name)}</h1>
          <p class="cp-tag">${esc(jo(T.title, '이고', '고'))}, 자라 온 성품은 <strong>${esc(S.adj)}</strong> 쪽에 가까워요</p>
        </div>
        <div class="cover-figure cp-cover-fig">${tcRose(d, { size: 230, title: `기질과 성품: ${DIM_ORDER.map((k) => `${DIMS[k].name} ${d[k].score}`).join(', ')}` })}${legend}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>두드러진 기질</dt><dd>${esc(DIMS[t0].name)}<small>${esc(TEMP_LABEL[t0dir])}, ${d[t0].score}점</small></dd></div>
        ${CHAR_ORDER.map((k) => `<div><dt>${esc(DIMS[k].name)}</dt><dd>${d[k].score}<small>${esc(CHAR_LABEL[d[k].level])}</small></dd></div>`).join('')}
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['temp', '타고난 기질'],
    ['char', '자라 온 성품'],
    ['meet', '기질과 성품의 만남'],
    ['practice', '연습'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  // Realtime Database는 빈 배열을 저장하지 않아서, 경계에 걸린 기질이 없으면 near가 아예 없이 돌아온다
  const nearNames = (s.near || []).map((k) => DIMS[k].name);
  const nearText = nearNames.length
    ? ` 다만 ${nearNames.join(', ')}${hasBatchim(nearNames[nearNames.length - 1]) ? '은' : '는'} 가운데에 가까워서, 상황에 따라 반대쪽 모습도 함께 나타날 수 있어요.`
    : '';
  const m0 = MEET[M[0].id];
  const paras = [
    `${esc(name)} 님의 타고난 기질은 <strong>${esc(T.name)}</strong>에 가까워요. ${esc(T.text)}${esc(nearText)}`,
    `자라 온 성품은 <strong>${esc(S.adj)}</strong> 쪽에 가까워요. 자율성 ${d.sd.score}점, 연대감 ${d.co.score}점, 자기 초월 ${d.st.score}점이에요. ${esc(S.text)}`,
    `기질과 성품이 만나는 자리에서 가장 먼저 보이는 모습은 '${esc(m0.title)}'${hasBatchim(m0.title) ? '이에요' : '예요'}. ${esc(m0.text)}`,
  ];
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 막대 묶음 ────────────────────────────────
  const bars = (order) => `<ul class="cp-bars">${order.map((k) => `<li>
      <span class="nm">${esc(DIMS[k].name)}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${d[k].score}%;background:${GROUP_COLOR[DIMS[k].group]}"></span></span>
      <span class="val">${d[k].score}</span>${pill(k, d[k].level)}
    </li>`).join('')}</ul>`;

  // ── 타고난 기질 ──────────────────────────────
  const typeRead = `<div class="domain-read tc-type">
      <p class="cp-kicker">기질 유형</p>
      <h3>${esc(T.name)}</h3>
      <p>${esc(T.text)}</p>
      <dl class="cp-facts"><div><dt>이 기질의 힘</dt><dd>${esc(T.strong)}</dd></div><div><dt>살필 점</dt><dd>${esc(T.watch)}</dd></div></dl>
      ${nearNames.length ? `<p class="tc-near">${esc(nearNames.join(', '))}${hasBatchim(nearNames[nearNames.length - 1]) ? '은' : '는'} 가운데(50점) 가까이에 있어서, 유형 이름보다 두 모습이 함께 있는 쪽으로 읽는 게 더 정확해요.</p>` : ''}
    </div>`;
  const tempCards = TEMP_ORDER.map((k) => {
    const lv = d[k].level;
    const tx = TEMP_TEXT[k];
    const facts = lv === 'mid' ? '' : `<dl class="cp-facts"><div><dt>힘</dt><dd>${esc(tx.plus[lv])}</dd></div><div><dt>살필 점</dt><dd>${esc(tx.care[lv])}</dd></div></dl>`;
    return `<article class="cp-card ${k === t0 && lv !== 'mid' ? 'is-focus' : ''}">
      <div class="hd">${sw(k)}<h3>${esc(DIMS[k].name)}</h3>${pill(k, lv)}<span class="score">${d[k].score}</span></div>
      <p class="rs-domain-what">${esc(tx.what)}</p>
      <p>${esc(tx[lv])}</p>${facts}
    </article>`;
  }).join('');
  const tempSec = section(
    'temp',
    '타고난 기질',
    '기질은 새로움, 위험, 사람, 보상에 자동으로 반응하는 타고난 결이에요. 높고 낮음에 좋고 나쁨이 없고, 높은 쪽과 낮은 쪽 모두 저마다의 힘과 살필 점이 있어요. 기질 유형은 자극 추구, 위험 회피, 사회적 민감성 세 가지의 높낮이로 정해요.',
    `<div class="cp-group"><h3>${sw('ns')}${esc(GROUPS.temp.long)}</h3>${bars(TEMP_ORDER)}</div>${typeRead}<h3 class="rsub">네 가지 기질 자세히</h3><div class="cp-cards">${tempCards}</div>`
  );

  // ── 자라 온 성품 ─────────────────────────────
  const shapeRead = `<div class="domain-read tc-shape">
      <p class="cp-kicker">성품 모양</p>
      <h3>${esc(S.name)}</h3>
      <p class="tc-shape-t">${esc(S.title)}</p>
      <p>${esc(S.text)}</p>
      <p class="es-tip"><strong>도움이 되는 방향</strong> ${esc(S.tip)}</p>
    </div>`;
  const charCards = CHAR_ORDER.map((k) => `<article class="cp-card ${k === grow && band(d[k].level) !== 'high' ? 'is-focus' : ''}">
      <div class="hd">${sw(k)}<h3>${esc(DIMS[k].name)}</h3>${pill(k, d[k].level)}<span class="score">${d[k].score}</span></div>
      <p class="rs-domain-what">${esc(CHAR_TEXT[k].what)}</p>
      <p>${esc(CHAR_TEXT[k][band(d[k].level)])}</p>
    </article>`).join('');
  const charSec = section(
    'char',
    '자라 온 성품',
    '성품은 경험과 성찰로 자라는 힘이에요. 기질이 어떻든 성품이 자랄수록 그 기질을 건강하게 쓰게 돼요. 성품 모양은 성숙의 두 기둥인 자율성과 연대감으로 정해요.',
    `<div class="cp-group"><h3>${sw('sd')}${esc(GROUPS.char.long)}</h3>${bars(CHAR_ORDER)}</div>${shapeRead}<h3 class="rsub">세 가지 성품 자세히</h3><div class="cp-cards">${charCards}</div>`
  );

  // ── 기질과 성품의 만남 ───────────────────────
  const meetCards = M.map(({ id, ks }) => `<article class="cp-card tc-meet">
      ${ks.length ? `<p class="tc-meet-k">${ks.map((k) => `${sw(k)}${esc(DIMS[k].name)} ${d[k].score} <small>${esc(lvName(k))}</small>`).join('<span class="x" aria-hidden="true">×</span>')}</p>` : ''}
      <h3>${esc(MEET[id].title)}</h3>
      <p>${esc(MEET[id].text)}</p>
    </article>`).join('');
  const meetSec = section(
    'meet',
    '기질과 성품의 만남',
    '같은 기질도 성품과 어떻게 만나느냐에 따라 전혀 다른 모습으로 드러나요. 지금 가장 눈에 띄는 조합을 골랐어요.',
    `<div class="cp-cards">${meetCards}</div>`
  );

  // ── 연습 ─────────────────────────────────────
  const practices = [{ t: `${DIMS[grow].name} 키우기`, d: CHAR_TEXT[grow].practice }];
  if (t0dir !== 'mid') practices.push({ t: `${jo(DIMS[t0].name, '이', '가')} ${t0dir === 'high' ? '높은' : '낮은'} 기질 다루기`, d: TEMP_TEXT[t0].tip[t0dir] });
  else practices.push({ t: `${T.name}의 작은 연습`, d: T.tip });
  practices.push(PRACTICE_GENERAL);
  const practiceSec = section(
    'practice',
    '기질을 다루고 성품을 키우는 연습',
    '기질은 바꾸기보다 다루는 법을 익히고, 성품은 작은 행동으로 키워요. 하나를 골라 일주일만 해 보세요.',
    `<ol class="practice-list">${practices.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 기질과 성품 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = ['어릴 때부터 지금까지 거의 변하지 않은 내 모습은 무엇인가요?', '예전보다 자랐다고 느끼는 내 모습은 무엇인가요?'];
    if (t0dir !== 'mid') qs.push(TEMP_Q[t0][t0dir]);
    qs.push(GROW_Q[grow]);
    const watch = [];
    if (d.ha.score >= 70 && d.sd.score < 45) watch.push('걱정이 많은 기질과 낮은 자율성이 함께 나타나요. 불안이나 우울한 기분으로 일상이 힘든지 살펴 주세요.');
    if (d.ns.score >= 70 && d.sd.score < 45) watch.push('자극 추구가 높고 자율성이 낮아요. 충동적인 소비나 게임, 음주 같은 습관이 생활을 흔들고 있지 않은지 조심스럽게 살펴 주세요.');
    if (d.rd.score >= 70 && d.sd.score < 45) watch.push('사람들의 반응에 크게 흔들릴 수 있어요. 거절이 어려운지, 관계에서 자기 마음을 자꾸 뒤로 미루는지 살펴 주세요.');
    if (d.sd.score < 40 && d.co.score < 40) watch.push('자율성과 연대감이 함께 낮아요. 관계와 생활 전반이 힘든 시기일 수 있으니, 성급히 결론 내리기보다 최근 상황부터 충분히 들어 주세요.');
    if (d.ps.score >= 75 && d.ha.score >= 60) watch.push('끈기와 조심성이 함께 높아요. 쉬는 데 죄책감을 느끼는지, 지쳐 있다는 신호가 있는지 살펴 주세요.');
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
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 차원을 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 내 모습이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 차원을 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 점수를 해석할 때 함께 고려해 주세요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 점수를 해석할 때 함께 고려해 주세요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요. 쉰여섯 문장 모두로 살펴봤어요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>같은 차원 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${tempSec}${charSec}${meetSec}${practiceSec}${counsel}${check}</div>`;
  wireToc(el);
}
