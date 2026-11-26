// AZIT : Star&Moon — 자아존중감 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { SELF, SELF_ORDER, BASES, BASE_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { LEVEL_LABEL, LEAN_LABEL, WORTH_TEXT, TYPES, SELF_TEXT, BASE_TEXT, COUNSEL_GENERAL, CLOSING } from './content.js';
import { esteemMap } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const isHigh = (lv) => lv === 'high' || lv === 'vhigh';
const pill = (lv, label = LEVEL_LABEL) => `<span class="es-pill es-pill--${lv}">${label[lv]}</span>`;
const lvText = (k, lv) => SELF_TEXT[k][isHigh(lv) ? 'high' : lv === 'mid' ? 'mid' : 'low'];
const BASE_Q = {
  ap: '다른 사람의 반응 가운데 가장 크게 흔들렸던 경험은 무엇인가요?',
  ac: '쉬거나 눈에 띄는 성과가 없을 때 어떤 마음이 드나요?',
  lk: '겉모습에 대해 들은 말 가운데 아직 마음에 남아 있는 말이 있나요?',
  lv: '가까운 관계가 멀어졌을 때 나를 지켜 준 것은 무엇이었나요?',
};

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
  const T = TYPES[s.type];
  const SF = s.self;
  const B = s.bases;
  const weakest = s.selfOrder[0];
  const top = s.topBase;
  const leansOn = B[top].score >= 50;
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">자아존중감 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="es-kicker">자기 가치감 ${s.worth}점, ${LEVEL_LABEL[s.level]}</p>
          <h1 class="cover-headline">${esc(T.name)}</h1>
          <p class="es-tag">${esc(T.title)}</p>
        </div>
        <div class="cover-figure es-cover-fig">${esteemMap(s.worth, s.lean, { size: 270, type: s.type, title: `자존감 지도: 자기 가치감 ${s.worth}, 조건에 기대는 정도 ${s.lean}, ${T.name}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>자기 가치감</dt><dd>${s.worth}<small>${LEVEL_LABEL[s.level]}</small></dd></div>
        <div><dt>나를 대하는 방식</dt><dd>${s.compassion}<small>${LEVEL_LABEL[s.compassionLevel]}</small></dd></div>
        <div><dt>조건에 기대는 정도</dt><dd>${s.lean}<small>${LEAN_LABEL[s.leanLevel]}</small></dd></div>
        <div><dt>가장 기대는 곳</dt><dd>${leansOn ? esc(BASES[top].name.split(' ').pop()) : '없음'}<small>${leansOn ? `${B[top].score}점` : '고르게 낮음'}</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['worth', '자기 가치감'],
    ['map', '자존감 지도'],
    ['self', '나를 대하는 방식'],
    ['bases', '기대는 곳'],
    ['practice', '연습'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [
    `${esc(name)} 님의 자존감은 <strong>${esc(T.name)}</strong>에 가까워요. ${esc(T.text)}`,
    `스스로를 가치 있게 여기는 마음은 ${s.worth}점(${LEVEL_LABEL[s.level]})이에요. 힘들 때 나를 대하는 방식은 ${s.compassion}점이고, 세 갈래 가운데 <strong>${esc(SELF[weakest].name)}</strong>${isHigh(SF[weakest].level) ? '도 든든해요' : `${hasBatchim(SELF[weakest].name) ? '이' : '가'} 가장 연습이 필요해요`}.`,
    leansOn
      ? `자존감이 가장 많이 기대는 곳은 <strong>${esc(BASES[top].name)}</strong>(${B[top].score}점)${hasBatchim(BASES[top].name) ? '이에요' : '예요'}. ${esc(BASE_TEXT[top].what)}`
      : '자존감이 인정, 성과, 겉모습, 관계 같은 조건에 크게 기대지 않아요. 바깥 상황이 흔들려도 나를 보는 눈이 덜 흔들려요.',
  ];
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 자기 가치감 ──────────────────────────────
  const worthSec = section(
    'worth',
    '자기 가치감',
    '조건과 상관없이 나를 얼마나 괜찮은 사람으로 여기는지예요. 자존감의 바탕이 되는 마음이에요.',
    `<div class="es-worth">
      <div class="es-worth-num"><span>${s.worth}</span>${pill(s.level)}</div>
      <div class="es-worth-track" aria-hidden="true"><span style="width:${s.worth}%"></span></div>
      <p>${esc(WORTH_TEXT[s.level])}</p>
    </div>`
  );

  // ── 자존감 지도 ──────────────────────────────
  const mapSec = section(
    'map',
    '자존감 지도',
    '자기 가치감의 높이와, 그 믿음이 조건에 얼마나 기대는지를 함께 보면 자존감의 모양이 보여요. 높은 자존감도 조건에 많이 기대면 흔들리기 쉽고, 낮아 보이는 자존감도 조건에 덜 기대면 다시 일어설 바탕이 있어요.',
    `<div class="es-map">
      <div class="es-map-fig">${esteemMap(s.worth, s.lean, { size: 290, type: s.type, title: `자존감 지도: ${T.name}` })}</div>
      <div class="es-map-read">
        <p class="es-kicker">${esc(T.name)}</p>
        <h3>${esc(T.title)}</h3>
        <p>${esc(T.text)}</p>
        <p class="es-tip"><strong>도움이 되는 방향</strong> ${esc(T.tip)}</p>
      </div>
    </div>`
  );

  // ── 나를 대하는 방식 ─────────────────────────
  const selfBars = SELF_ORDER.map((k) => `<li>
      <div class="es-self-hd"><span class="nm">${esc(SELF[k].name)}</span><span class="val">${SF[k].score}</span>${pill(SF[k].level)}</div>
      <div class="es-self-track" aria-hidden="true"><span style="width:${SF[k].score}%"></span></div>
      <div class="es-self-ends" aria-hidden="true"><span>${esc(SELF[k].pair[1])}</span><span>${esc(SELF[k].pair[0])}</span></div>
    </li>`).join('');
  const selfCards = SELF_ORDER.map((k) => `<article class="es-card ${k === weakest && !isHigh(SF[k].level) ? 'is-focus' : ''}">
      <div class="hd"><h3>${esc(SELF[k].name)}</h3>${pill(SF[k].level)}<span class="score">${SF[k].score}</span></div>
      <p class="what">${esc(SELF_TEXT[k].what)}</p>
      <p>${esc(lvText(k, SF[k].level))}</p>
    </article>`).join('');
  const selfSec = section(
    'self',
    '힘들 때 나를 대하는 방식',
    '실수하거나 힘든 순간에 나를 어떻게 대하는지 세 갈래로 봤어요. 막대의 오른쪽으로 갈수록 나를 따뜻하게 대하고, 왼쪽으로 갈수록 나에게 가혹해요.',
    `<ul class="es-self">${selfBars}</ul><div class="es-cards">${selfCards}</div>`
  );

  // ── 기대는 곳 ────────────────────────────────
  const baseBars = `<ul class="es-bases">${BASE_ORDER.map((k) => `<li class="${k === top && leansOn ? 'is-top' : ''}">
      <span class="nm">${esc(BASES[k].name)}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${B[k].score}%"></span></span>
      <span class="val">${B[k].score}</span>${pill(B[k].level, LEAN_LABEL)}
    </li>`).join('')}</ul>`;
  const topDetail = leansOn
    ? `<div class="domain-read es-base-read">
        <h3>${esc(jo(BASES[top].name, '에', '에'))} 많이 기대요</h3>
        <p>${esc(BASE_TEXT[top].what)}</p>
        <dl class="cp-facts"><div><dt>흔들리는 순간</dt><dd>${esc(BASE_TEXT[top].shake)}</dd></div><div><dt>작은 연습</dt><dd>${esc(BASE_TEXT[top].practice)}</dd></div></dl>
      </div>`
    : '<p class="es-note">네 가지 조건 모두에 크게 기대지 않아요. 인정받지 못하거나 일이 잘 안 풀리는 날에도 나라는 사람의 가치를 지킬 바탕이 있어요.</p>';
  const basesSec = section(
    'bases',
    '자존감이 기대는 곳',
    '누구나 무언가에서 힘을 얻지만, 한두 곳에 크게 기대면 그곳이 흔들릴 때 자존감도 함께 흔들려요. 점수가 높을수록 그 조건에 많이 기대요.',
    `${baseBars}${topDetail}`
  );

  // ── 연습 ─────────────────────────────────────
  const practices = [];
  if (!isHigh(SF[weakest].level)) practices.push({ t: `${SELF[weakest].name} 연습`, d: SELF_TEXT[weakest].practice });
  if (leansOn) practices.push({ t: `${BASES[top].name}에서 한 걸음`, d: BASE_TEXT[top].practice });
  practices.push({ t: '조건 없는 나 모으기', d: "하루를 마치며 '오늘 잘한 일'이 아니라 '오늘 나다웠던 순간'을 하나 적어 보세요. 성과와 상관없이 나를 괜찮다고 느낀 순간이 쌓일수록 자존감의 바탕이 단단해져요." });
  if (practices.length < 3) practices.push({ t: '나에게 건네는 한마디', d: "아침에 '오늘도 나는 나라서 괜찮아'라고 한 번 말해 보세요. 어색해도 괜찮아요. 나에게 건네는 말의 온도가 자존감의 온도가 돼요." });
  const practiceSec = section(
    'practice',
    '자존감을 돌보는 연습',
    '자존감은 생각만으로 바뀌지 않고, 나를 대하는 작은 행동이 쌓이면서 자라요. 하나를 골라 일주일만 해 보세요.',
    `<ol class="practice-list">${practices.slice(0, 3).map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 자아존중감 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = ['최근 스스로를 가장 괜찮게 느꼈던 순간과 가장 작게 느꼈던 순간은 언제였나요?', '실수했을 때 마음속에서 들리는 목소리는 누구의 목소리를 닮았나요?'];
    if (leansOn) qs.push(BASE_Q[top]);
    const watch = [];
    if (!isHigh(s.level) && s.worth < 38 && SF.kind.score < 38) watch.push('자기 가치감과 나에게 친절하기가 함께 낮아요. 우울한 기분, 무가치감, 심한 자책이 일상에 영향을 주고 있는지 살펴 주세요.');
    if (s.type === 'contingent') watch.push('자존감이 높게 나왔지만 조건에 많이 기대고 있어요. 그 조건이 무너질 때의 반응을 미리 이야기해 두면 도움이 돼요.');
    if (B.ap.score >= 70) watch.push('다른 사람의 인정에 크게 기대요. 거절하기 어려운지, 관계에서 자기 마음을 뒤로 미루는지 살펴 주세요.');
    if (B.lk.score >= 70) watch.push('겉모습에 자존감을 크게 기대요. 외모에 대한 걱정이 생활과 마음에 얼마나 영향을 주는지 조심스럽게 살펴 주세요.');
    if (B.lv.score >= 70) watch.push('사랑받는 관계에 자존감을 크게 기대요. 관계가 흔들릴 때 어떻게 지내는지, 관계를 지키려고 자신을 지나치게 맞추지는 않는지 살펴 주세요.');
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
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 갈래를 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 나를 보는 눈이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 갈래를 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 점수를 해석할 때 함께 고려해 주세요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 점수를 해석할 때 함께 고려해 주세요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요. 1부와 2부 문장으로 살펴봤어요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>같은 갈래 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${worthSec}${mapSec}${selfSec}${basesSec}${practiceSec}${counsel}${check}</div>`;
  wireToc(el);
}
