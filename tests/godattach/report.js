// AZIT : Star&Moon — 하나님 애착 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { attachMap } from '../attachment/chart.js';
import { DIMS, FACETS, FACET_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { LEVEL_LABEL, DIM_COLOR, STYLES, DIM_TEXT, FACET_TEXT, BOTH_TEXT, COUNSEL_Q, COUNSEL_GENERAL, PRACTICE_GENERAL, CLOSING } from './content.js';

const pill = (lv) => `<span class="cp-pill cp-pill--mid">${LEVEL_LABEL[lv]}</span>`;
const sw = (d) => `<i style="background:${DIM_COLOR[d]}"></i>`;

const FACET_PRACTICE = {
  aban: { t: '넘어진 날에도 나아가기', d: "실수한 날 저녁, 잘못을 고백하는 기도 끝에 '그래도 나는 사랑받는 사람'이라고 한 문장 덧붙여 보세요." },
  assure: { t: '느낌 대신 기억하기', d: '하나님의 돌보심을 경험한 일을 세 가지 적어 두고, 사랑이 느껴지지 않는 날 꺼내 읽어 보세요.' },
  cond: { t: '아무것도 하지 않은 날의 은혜', d: '쉬는 날, 해낸 일이 없어도 하나님이 나를 기뻐하신다는 문장을 천천히 묵상해 보세요.' },
  hurt: { t: '서운함도 기도로', d: '서운하고 원망스러운 마음을 숨기지 말고 그대로 하나님께 말해 보세요. 시편의 많은 기도도 그렇게 시작돼요.' },
  dist: { t: '조금 더 가까이 머물기', d: '하루 3분, 아무것도 구하지 않고 하나님 앞에 그냥 머물러 보세요. 가까움이 부담이 아니라 쉼이 될 수 있어요.' },
  self: { t: '하나 맡겨 보기', d: '이번 주에 혼자 끌어안고 있는 일 하나를 골라 기도로 하나님께 맡겨 보세요.' },
  closed: { t: "'사실은'으로 시작하는 기도", d: "기도할 때 '사실은…'으로 시작하는 솔직한 문장을 하나 넣어 보세요." },
  duty: { t: '의무 대신 대화', d: '정해진 기도문 대신, 오늘 있었던 일을 친구에게 말하듯 하나님께 이야기해 보세요.' },
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
  const St = STYLES[s.style];
  const F = s.facets;
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  const fname = (k) => FACETS[k].name;

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">하나님 애착 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="cp-kicker">하나님 애착 ${esc(St.name)}</p>
          <h1 class="cover-headline">${esc(St.title)}</h1>
          <p class="cp-tag">불안 ${s.an}점, 회피 ${s.av}점으로 하나님과의 관계를 읽었어요</p>
        </div>
        <div class="cover-figure att-cover-map">${attachMap([{ x: s.av, y: s.an, main: true }], { size: 300, labels: false, title: `하나님 애착 지도: 불안 ${s.an}, 회피 ${s.av}, ${St.name}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>불안</dt><dd>${s.an}<small>${LEVEL_LABEL[s.anLevel]}</small></dd></div>
        <div><dt>회피</dt><dd>${s.av}<small>${LEVEL_LABEL[s.avLevel]}</small></dd></div>
        <div><dt>불안에서 가장 큰 갈래</dt><dd>${esc(fname(s.topAn))}<small>${F[s.topAn].score}점</small></dd></div>
        <div><dt>회피에서 가장 큰 갈래</dt><dd>${esc(fname(s.topAv))}<small>${F[s.topAv].score}점</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['axes', '두 축과 여덟 갈래'],
    ['style', '유형 자세히'],
    ['both', '사람과의 애착과 함께'],
    ['practice', '믿음의 연습'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [
    `${esc(name)} 님과 하나님의 관계는 <strong>${esc(St.name)}</strong>에 가까워요. ${esc(St.text)}`,
    `${esc(DIM_TEXT.an[s.anLevel])} ${esc(DIM_TEXT.av[s.avLevel])}`,
  ];
  const hiTops = [s.topAn, s.topAv].filter((k) => F[k].score > 50);
  paras.push(hiTops.length
    ? `갈래로 보면 ${hiTops.map((k) => `'${esc(fname(k))}'(${F[k].score}점)`).join('과 ')}이 가장 크게 나타나요.`
    : '여덟 갈래 모두 보통보다 낮아서, 두드러지게 흔들리는 마음은 보이지 않아요.');
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 두 축과 여덟 갈래 ────────────────────────
  const groups = ['an', 'av'].map((d) => `<div class="cp-group">
      <h3>${sw(d)}${esc(DIMS[d].name)}<span class="cp-group-v">${s[d]}</span></h3>
      <p class="cp-group-d">${esc(DIM_TEXT[d].what)}</p>
      <ul class="cp-bars">${FACET_ORDER.filter((k) => FACETS[k].dim === d).map((k) => `<li class="${k === s.topAn || k === s.topAv ? 'is-top' : ''}">
        <span class="nm">${esc(fname(k))}</span>
        <span class="track" aria-hidden="true"><span class="fill" style="width:${F[k].score}%;background:${DIM_COLOR[d]}"></span></span>
        <span class="val">${F[k].score}</span>${pill(F[k].level)}
      </li>`).join('')}</ul>
    </div>`).join('');
  const tops = [s.topAn, s.topAv].filter((k) => F[k].score > 50);
  const topCards = tops.length ? `<h3 class="rsub">가장 크게 나타난 갈래</h3><div class="cp-cards">${tops.map((k) => `<article class="cp-card">
      <div class="hd">${sw(FACETS[k].dim)}<h3>${esc(fname(k))}</h3>${pill(F[k].level)}<span class="score">${F[k].score}</span></div>
      <p>${esc(FACET_TEXT[k])}</p>
    </article>`).join('')}</div>` : '';
  const axes = section(
    'axes',
    '두 축과 여덟 갈래',
    '사람 사이의 애착처럼, 하나님과의 관계도 버림받을까 하는 불안과 가까워지기를 피하는 회피, 두 축으로 볼 수 있어요. 축마다 네 갈래로 나눠 보면 그 마음이 어디서 오는지 더 잘 보여요. 점수가 높을수록 그 마음이 큰 거예요.',
    `${groups}${topCards}`
  );

  // ── 유형 자세히 ──────────────────────────────
  const styleSec = section(
    'style',
    '유형 자세히',
    '불안과 회피가 각각 보통(50)을 넘는지로 네 유형을 나눠요. 성인 애착 유형 검사와 같은 기준이에요.',
    `<div class="domain-read">
      <p class="cp-kicker">${esc(St.name)}</p>
      <h3>${esc(St.title)}</h3>
      <p>${esc(St.text)}</p>
      <dl class="cp-facts"><div><dt>이 믿음의 힘</dt><dd>${esc(St.strong)}</dd></div><div><dt>살필 점</dt><dd>${esc(St.watch)}</dd></div></dl>
    </div>`
  );

  // ── 사람과의 애착과 함께 ─────────────────────
  const both = section(
    'both',
    '사람과의 애착과 함께 보기',
    '',
    `<div class="domain-read"><p>${esc(BOTH_TEXT)}</p></div>`
  );

  // ── 연습 ─────────────────────────────────────
  const hiAxis = s.an >= s.av ? s.topAn : s.topAv;
  const practices = [{ t: `${St.name}의 작은 걸음`, d: St.tip }];
  if (F[hiAxis].score > 50) practices.push(FACET_PRACTICE[hiAxis]);
  practices.push(PRACTICE_GENERAL);
  const practiceSec = section(
    'practice',
    '믿음의 연습',
    '관계는 생각보다 작은 습관으로 자라요. 하나를 골라 일주일만 해 보세요.',
    `<ol class="practice-list">${practices.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 하나님 애착 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const watch = [];
    if (s.an >= 70) watch.push('하나님과의 관계에서 불안이 매우 높아요. 지나친 죄책감, 구원에 대한 확신 문제, 같은 회개를 되풀이하는 강박적인 신앙 행동이 있는지 살펴 주세요.');
    if (F.cond.score >= 70) watch.push('신앙생활을 잘해야 사랑받는다고 느끼는 마음이 커요. 은혜와 자기 가치를 함께 이야기해 보면 도움이 돼요.');
    if (F.hurt.score >= 70) watch.push('하나님에 대한 서운함과 원망이 커요. 그 마음을 말해도 괜찮다는 안전감을 먼저 주시고, 원망 뒤에 있는 상실이나 상처를 살펴 주세요.');
    if (s.av >= 70 && F.duty.score >= 60) watch.push('신앙이 친밀함보다 의무에 가까워요. 봉사나 사역으로 지쳐 있지는 않은지 살펴 주세요.');
    if (s.style === 'fearful') watch.push('다가가고 싶지만 두려운 마음이 함께 있어요. 사람에게 받은 상처나 신앙 공동체 안에서의 아픈 경험이 있는지 조심스럽게 살펴 주세요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">열어 볼 질문</h3>
        <ul class="check-list">${COUNSEL_Q.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
        <h3 class="counsel-h">함께 살펴볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 축을 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 하나님과의 관계가 때에 따라 많이 다르게 느껴지는 편일 수 있어요.');
  else notes.push('같은 축을 묻는 문장끼리 응답이 일관돼요.');
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
      <div class="metric"><dt>같은 축 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${axes}${styleSec}${both}${practiceSec}${counsel}${check}</div>`;
  wireToc(el);
}
