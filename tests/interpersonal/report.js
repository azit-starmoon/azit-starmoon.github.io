// AZIT : Star&Moon — 대인관계 패턴 검사 결과지
// 표지 → 요약 → 원형 지도 → 두드러진 방향 → 두 축 → 성장 방향 → 상담 메모 → 응답 점검.
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { OCTANTS, OCTANT_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT, octantAt } from './scoring.js';
import { LEVEL_LABEL, OCTANT_TEXT, OVERALL, EVEN, COMPLEX, AXES, axisWord, COUNSEL_GENERAL, CLOSING } from './content.js';
import { circleMap } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const pill = (lv) => `<span class="hsp-pill hsp-pill--${lv}">${LEVEL_LABEL[lv] || ''}</span>`;
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
// '마음을 닫고 거리 둠'(72점)처럼 이름 뒤에 점수를 넣어도 조사는 이름에 맞춘다
const withScore = (k, sc, withB, without) => `'${esc(OCTANTS[k].name)}'(${sc}점)${hasBatchim(OCTANTS[k].name) ? withB : without}`;
const opposite = (k) => octantAt(OCTANTS[k].angle + 180);

function section(id, title, lead, body, cls = '') {
  return `<section class="rsec ${cls}" id="r-${id}" aria-labelledby="r-${id}-t">
    <h2 class="rsec-title" id="r-${id}-t">${esc(title)}</h2>
    ${lead ? `<p class="rsec-lead">${lead}</p>` : ''}
    ${body}
  </section>`;
}

export function renderReport(el, rec, ctx = {}) {
  const s = rec.scores || {};
  const name = rec.name || '검사자';
  const showCounsel = !ctx.shared;
  const O8 = s.octants || {};
  const sc = (k) => num((O8[k] || {}).score, 0);
  const lvOf = (k) => (O8[k] || {}).level || 'mid';
  const order = Array.isArray(s.order) && s.order.length === 8 ? s.order : [...OCTANT_ORDER].sort((a, b) => sc(b) - sc(a));
  const style = OCTANTS[s.style] ? s.style : 'even';
  const even = style === 'even';
  const level = OVERALL[s.level] ? s.level : 'mid';
  const O = OVERALL[level];
  const amp = num(s.amp);
  const tiltWord = s.tilt === 'clear' ? '뚜렷함' : s.tilt === 'mild' ? '조금' : '거의 없음';
  // 자세히 볼 두 방향: 기우는 방향이 있으면 그 방향을 먼저, 나머지는 점수 순
  const focus = [...new Set([...(even ? [] : [style]), ...order])].slice(0, 2);
  // 기우는 방향이 두 방향의 경계 가까이(가운데서 15도 넘게 벗어남)면 이웃 방향도 함께 말한다: 다시 하면 이웃 방향으로 바뀌기 쉬운 자리
  let beside = '';
  if (!even) {
    const d = ((num(s.angle) - OCTANTS[style].angle + 540) % 360) - 180;
    if (Math.abs(d) >= 15) beside = octantAt(OCTANTS[style].angle + 45 * Math.sign(d));
  }
  const head = even ? EVEN.title : OCTANT_TEXT[style].title;
  const C = s.check || {};
  const careful = num(C.spread) >= SPREAD_LIMIT || Math.abs(num(C.acq)) >= ACQ_LIMIT || num(C.sd, 1) < 0.5;
  const fig = (size) => circleMap(O8, { size, angle: even ? null : num(s.angle), amp, top: focus[0], title: `대인관계 원형 지도: ${OCTANT_ORDER.map((k) => `${OCTANTS[k].name} ${sc(k)}`).join(', ')}${even ? '' : `. 기우는 방향 ${OCTANTS[style].name}, 기울기 ${amp}`}` });

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">대인관계 패턴 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="hsp-kicker">${even ? '여덟 방향이 고르게 나왔어요' : `원이 '${esc(OCTANTS[style].name)}' 쪽으로 기울어요`}</p>
          <h1 class="cover-headline">${esc(head)}</h1>
          <p class="hsp-tag">관계의 어려움 <strong>${num(s.elev)}</strong>점, ${LEVEL_LABEL[level]}</p>
        </div>
        <div class="cover-figure ip-cover-fig">${fig(270)}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>관계의 어려움</dt><dd>${num(s.elev)}<small>${LEVEL_LABEL[level]}</small></dd></div>
        <div><dt>기우는 방향</dt><dd>${even ? '고름' : esc(OCTANTS[style].short)}<small>기울기 ${tiltWord}</small></dd></div>
        <div><dt>가장 높은 방향</dt><dd>${esc(OCTANTS[order[0]].short)}<small>${sc(order[0])}점</small></dd></div>
        <div><dt>응답</dt><dd>${careful ? '확인 필요' : '일관됨'}<small>응답 점검 참고</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['map', '원형 지도'],
    ['focus', '두드러진 방향'],
    ['axes', '두 축'],
    ['growth', '성장 방향'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [`${esc(name)} 님의 관계의 어려움은 ${num(s.elev)}점으로 ${jo(LEVEL_LABEL[level], '이에요', '예요')}. <strong>${esc(O.title)}</strong>. ${esc(O.text)}`];
  if (even) paras.push(esc(EVEN.text));
  else {
    paras.push(`여덟 방향을 원 위에 놓으면 <strong>${esc(OCTANTS[style].name)}</strong> 쪽으로 ${s.tilt === 'clear' ? '뚜렷하게' : '조금'} 기울어요(기울기 ${amp}). ${esc(OCTANT_TEXT[style].what)}`);
    if (beside) paras.push(`기우는 방향이 이웃한 '${esc(OCTANTS[beside].name)}' 쪽에도 걸쳐 있어서, 두 방향의 모습이 함께 나올 수 있어요.`);
    if (s.complex) paras.push(esc(COMPLEX));
  }
  paras.push(`가장 높게 나온 방향은 ${withScore(order[0], sc(order[0]), '과', '와')} ${withScore(order[1], sc(order[1]), '이에요', '예요')}.`);
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 원형 지도 ────────────────────────────────
  const bars = `<ul class="hsp-bars ip-bars">${OCTANT_ORDER.map((k) => `<li class="${k === focus[0] ? 'is-top' : ''}">
      <span class="nm">${esc(OCTANTS[k].name)}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${sc(k)}%;background:var(--brand)"></span></span>
      <span class="val">${sc(k)}</span>${pill(lvOf(k))}
    </li>`).join('')}</ul>`;
  const map = section(
    'map',
    '관계의 원형 지도',
    '여덟 방향은 누구에게나 조금씩 있어요. 점수는 그 방향의 행동이 지나치거나 자꾸 되풀이돼서 나를 힘들게 하는 정도예요. 위는 주도, 아래는 물러섬, 오른쪽은 다가감, 왼쪽은 거리 둠이에요.',
    `<div class="ip-map">
      <figure class="ip-fig">${fig(330)}
        <figcaption>${even ? '여덟 방향이 고르게 나와 기우는 방향을 표시하지 않았어요.' : '가운데서 뻗은 화살표가 기우는 방향이에요. 길수록 그쪽으로 많이 기운 거예요.'}</figcaption></figure>
      <div>${bars}</div>
    </div>`
  );

  // ── 두드러진 방향 (자세한 해석) ─────────────────
  const cards = focus.map((k) => `<article class="ip-card">
      <div class="hd"><h3>${esc(OCTANTS[k].name)}</h3>${pill(lvOf(k))}<span class="score">${sc(k)}</span></div>
      <p>${esc(OCTANT_TEXT[k].what)}</p>
      <dl>
        <div><dt>그 밑의 마음</dt><dd>${esc(OCTANT_TEXT[k].wish)}</dd></div>
        <div><dt>같은 방향의 힘</dt><dd>${esc(OCTANT_TEXT[k].strength)}</dd></div>
        <div><dt>관계에서 치르는 값</dt><dd>${esc(OCTANT_TEXT[k].cost)}</dd></div>
      </dl>
    </article>`).join('');
  const focusSec = section(
    'focus',
    '두드러진 방향',
    even ? '기우는 방향이 거의 없어서, 점수가 높은 두 방향을 골랐어요.' : '기우는 방향과, 그다음으로 높은 방향을 골랐어요. 같은 방향에는 어려움과 힘이 함께 있어요.',
    `<div class="ip-cards">${cards}</div>`
  );

  // ── 두 축 ────────────────────────────────────
  const axis = (key, v) => {
    const A = AXES[key];
    const w = Math.min(50, Math.abs(v));
    const side = v >= 0 ? A.pos : A.neg;
    const word = axisWord(v);
    const read = word === '균형' ? `${A.neg}과 ${A.pos} 사이에서 균형을 이뤄요` : `${side} 쪽으로 ${word} 기울어요`;
    return `<div class="ip-axis">
      <div class="ip-axis-h"><h3>${esc(A.name)}</h3><span>${esc(read)} (${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)})</span></div>
      <div class="ip-axis-bar" aria-hidden="true"><span class="l">${esc(A.neg)}</span>
        <span class="track"><span class="fill" style="${v >= 0 ? 'left:50%' : `left:${50 - w}%`};width:${w}%"></span><i></i></span>
        <span class="r">${esc(A.pos)}</span></div>
      <p>${esc(A.what)}</p>
    </div>`;
  };
  const axes = section(
    'axes',
    '두 축으로 보기',
    '여덟 방향을 두 축으로 줄이면 관계에서의 큰 결이 보여요. 0은 양쪽이 비슷하다는 뜻이고, 숫자가 클수록 한쪽으로 기운 거예요.',
    `${axis('dom', num(s.dom))}${axis('lov', num(s.lov))}`
  );

  // ── 성장 방향 ────────────────────────────────
  const k0 = focus[0];
  const opp = opposite(k0);
  const growth = section(
    'growth',
    '성장 방향',
    '되풀이되는 모습을 한 번에 바꾸기보다, 이번 주에 해 볼 작은 것 하나를 골라 보세요.',
    `${focus.map((k) => `<h3 class="rsub">${esc(OCTANTS[k].name)}</h3><ul class="check-list">${OCTANT_TEXT[k].try.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
    <blockquote class="quote"><small>맞은편에서 빌려 올 힘</small>원의 맞은편은 '${esc(OCTANTS[opp].name)}'이에요. 그쪽의 ${esc(OCTANT_TEXT[k0].borrow)}을 조금 빌려 오면 균형이 잡혀요. ${esc(OCTANT_TEXT[opp].strength)}</blockquote>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 대인관계 패턴 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = focus.map((k) => `<div class="counsel-item"><h3>${esc(OCTANTS[k].name)} <span class="hsp-counsel-score">${sc(k)}</span></h3>
      <ul class="check-list">${OCTANT_TEXT[k].counsel.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>`).join('');
    const watch = [OCTANT_TEXT[k0].room]; // 상담 관계에서 보일 수 있는 모습
    if (level === 'high' || level === 'vhigh') watch.push('여러 방향에서 어려움이 커요. 관계의 어려움이 우울, 불안, 고립감과 함께 오는지 살펴 주세요.');
    if (s.complex) watch.push('원 모양에 잘 들어맞지 않아요(두 갈래 이상). 어떤 상대, 어떤 상황에서 각각의 모습이 나오는지 나눠서 들어 주세요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 검사자의 실제 관계 장면과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">두드러진 방향으로 열어 볼 질문</h3>${qs}
        <h3 class="counsel-h">함께 볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (num(C.sd, 1) < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (num(C.spread) >= SPREAD_LIMIT) notes.push('같은 방향을 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상대에 따라 모습이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 방향을 묻는 문장끼리 응답이 일관돼요.');
  if (num(C.acq) >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 관계의 어려움이 실제보다 조금 높게 나왔을 수 있어요.");
  else if (num(C.acq) <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 관계의 어려움이 실제보다 조금 낮게 나왔을 수 있어요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${num(C.rawMean).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round(num(C.extremeRatio) * 100)}%</dd></div>
      <div class="metric"><dt>같은 방향 일관성</dt><dd>${num(C.spread) >= SPREAD_LIMIT || num(C.sd, 1) < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(num(C.acq)) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${map}${focusSec}${axes}${growth}${counsel}${check}</div>`;
  wireToc(el);
}
