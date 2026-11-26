// AZIT : Star&Moon — 직업 흥미 유형 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { TYPES, TYPE_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { TYPE_COLOR, TYPE_TEXT, PAIR_TEXT, pairKey, CONSISTENCY_TEXT, DIFF_TEXT, ELEV_TEXT, STEPS, COUNSEL_GENERAL, CLOSING } from './content.js';
import { interestHex } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const nm = (t) => TYPES[t].name;
const lt = (t) => TYPES[t].letter;
const dot = (t) => `<i style="background:${TYPE_COLOR[t]}"></i>`;
const tag = (t) => `<span class="cr-tag">${dot(t)}<b>${esc(lt(t))}</b>${esc(nm(t))}</span>`;
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
  const T = s.types;
  const order = s.order;
  const top = order[0];
  const code = s.code;
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  const pk = pairKey(code[0], code[1], TYPE_ORDER);
  const pair = PAIR_TEXT[pk];
  const lowT = order[order.length - 1];

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">직업 흥미 유형 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="cr-kicker">가장 끌리는 흥미는 ${esc(jo(nm(top), '이에요', '예요'))}</p>
          <h1 class="cover-headline">${esc(TYPE_TEXT[top].title)}</h1>
          <p class="cr-tagline">흥미 코드</p>
          <p class="cr-code" aria-label="흥미 코드 ${esc(s.codeText)}">${code.map((t) => `<span style="--tc:${TYPE_COLOR[t]}"><b>${esc(lt(t))}</b><small>${esc(nm(t))}</small></span>`).join('')}</p>
        </div>
        <div class="cover-figure cr-cover-fig">${interestHex(T, { size: 250, title: `여섯 흥미 육각형: ${order.map((t) => `${T[t].rank}위 ${nm(t)} ${T[t].score}점`).join(', ')}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>흥미 코드</dt><dd>${esc(s.codeText)}<small>${esc(code.map((t) => TYPES[t].short).join('·'))}</small></dd></div>
        <div><dt>일관도</dt><dd>${esc(CONSISTENCY_TEXT[s.consistency].label)}<small>첫째·둘째 흥미</small></dd></div>
        <div><dt>변별도</dt><dd>${esc(DIFF_TEXT[s.diffLevel].label)}<small>차이 ${s.diff}점</small></dd></div>
        <div><dt>응답</dt><dd>${careful ? '확인 필요' : '일관됨'}<small>응답 점검 참고</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['scores', '여섯 흥미'],
    ['code', '흥미 코드'],
    ['shape', '흥미의 모양'],
    ['jobs', '직업 탐색'],
    ['growth', '탐색 실천'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const codeNames = code.map(nm);
  const paras = [
    `${esc(name)} 님의 흥미 코드는 <strong>${esc(s.codeText)}</strong>(${esc(listJoin(codeNames))})예요. ${esc(TYPE_TEXT[top].high)}`,
    `${esc(jo(nm(code[0]), '과', '와'))} ${esc(jo(nm(code[1]), '이', '가'))} 함께 앞서 있어요. ${esc(pair.text)}`,
    `상대적으로 마음이 덜 가는 쪽은 ${esc(jo(nm(lowT), '이에요', '예요'))}. ${esc(TYPE_TEXT[lowT].low)}`,
  ];
  if (T[code[0]].score - T[code[1]].score < 5) paras.push(`첫째와 둘째 흥미의 점수가 거의 같아서, ${esc(jo(nm(code[1]), '을', '를'))} 첫째로 보아도 크게 다르지 않아요. 두 흥미를 함께 첫째 자리에 두고 읽어 주세요.`);
  if (s.diffLevel === 'low') paras.push('여섯 흥미의 점수가 서로 비슷해서, 코드는 가볍게 참고하고 직접 겪어 보며 흥미를 또렷하게 만들어 가면 좋아요.');
  if (s.elevLevel !== 'mid') paras.push(esc(ELEV_TEXT[s.elevLevel]));
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 여섯 흥미 ────────────────────────────────
  const rows = order.map((t) => {
    const v = T[t];
    const tier = v.rank <= 3 ? 'top' : 'rest';
    return `<li class="cr-row cr-row--${tier}">
      <span class="rk">${v.rank}</span>
      <span class="nm">${dot(t)}<b>${esc(lt(t))}</b>${esc(nm(t))}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${Math.max(1, v.score)}%;background:${TYPE_COLOR[t]}"></span></span>
      <span class="val">${v.score}</span>
    </li>`;
  }).join('');
  const alts = s.alts && s.alts.length
    ? `<p class="cr-note">점수 차이가 5점 안쪽인 유형이 있어서 ${s.alts.map((a) => `<b>${esc(a)}</b>`).join(', ')}처럼 순서가 바뀐 코드도 함께 참고해 보세요.</p>`
    : '';
  const scores = section(
    'scores',
    '여섯 흥미 점수',
    `점수(0~100)는 각 흥미에 해당하는 활동과 일터에 마음이 얼마나 끌리는지의 세기예요. 50 근처는 '보통', 위로 갈수록 더 끌린다는 뜻이에요. 표지의 육각형에서 이웃한 흥미는 비슷하고, 맞은편 흥미는 성격이 서로 달라요.`,
    `<ol class="cr-rows">${rows}</ol>${alts}`
  );

  // ── 흥미 코드 ────────────────────────────────
  const cards = code.map((t, i) => {
    const X = TYPE_TEXT[t];
    return `<article class="cr-card" style="--tc:${TYPE_COLOR[t]}">
      <div class="hd"><span class="cr-rank">${i + 1}</span><span class="cr-letter">${esc(lt(t))}</span><h3>${esc(nm(t))}<small>${esc(X.title)}</small></h3><span class="score">${T[t].score}</span></div>
      <p class="what">${esc(X.what)}</p>
      ${i === 0 ? '' : `<p>${esc(X.high)}</p>`}
      <div class="two-lists">
        <div><h4>즐기는 활동</h4><p>${esc(X.likes)}</p></div>
        <div><h4>잘 맞는 일터</h4><p>${esc(X.env)}</p></div>
      </div>
      <p class="cr-gift"><strong>일하는 힘</strong>${esc(X.gift)}</p>
      <p class="cr-over"><strong>살필 점</strong>${esc(X.watch)}</p>
    </article>`;
  }).join('');
  const codeSec = section(
    'code',
    `흥미 코드 ${s.codeText}`,
    '가장 끌리는 세 흥미를 차례대로 이은 것이 흥미 코드예요. 첫 글자가 가장 크게 작용하고, 둘째와 셋째 글자가 그 흥미에 색을 더해요.',
    `<div class="cr-cards">${cards}</div>
    <div class="cr-pair"><h3 class="rsub">${tag(code[0])}<span class="cr-plus">+</span>${tag(code[1])}</h3><p>${esc(pair.text)}</p></div>`
  );

  // ── 흥미의 모양 ──────────────────────────────
  const meter = (label, lv, levels, text, extra = '') => `<div class="cr-shape">
      <div class="cr-shape-hd"><h3>${esc(label)}</h3><span class="cr-lv cr-lv--${lv}">${esc(levels)}</span></div>
      <p>${text}</p>${extra}
    </div>`;
  const consExtra = `<p class="cr-shape-sub">${tag(code[0])}<span class="cr-plus">↔</span>${tag(code[1])} 육각형에서 ${({ high: '바로 이웃', mid: '한 칸 건너', low: '맞은편' })[s.consistency]}</p>`;
  const diffBar = `<div class="cr-diff" aria-hidden="true"><span class="cr-diff-track"><span class="cr-diff-fill" style="left:${T[lowT].score}%;width:${Math.max(1, s.diff)}%"></span></span><span class="cr-diff-ends"><span>${esc(nm(lowT))} ${T[lowT].score}</span><span>${esc(nm(top))} ${T[top].score}</span></span></div>`;
  const elevText = s.elevLevel === 'mid'
    ? `여섯 흥미의 평균은 ${s.elevation}점이에요. 끌리는 일과 덜 끌리는 일을 고르게 구분해서 답했어요.`
    : `여섯 흥미의 평균은 ${s.elevation}점이에요. ${esc(ELEV_TEXT[s.elevLevel])}`;
  const shape = section(
    'shape',
    '흥미의 모양',
    '코드만큼 중요한 것이 흥미가 어떤 모양으로 모여 있는지예요. 세 가지를 함께 보면 코드를 얼마나 믿고 써도 되는지, 어떤 탐색이 필요한지 알 수 있어요.',
    `${meter('일관도', s.consistency, CONSISTENCY_TEXT[s.consistency].label, esc(CONSISTENCY_TEXT[s.consistency].text), consExtra)}
    ${meter('변별도', s.diffLevel, DIFF_TEXT[s.diffLevel].label, `가장 높은 흥미와 가장 낮은 흥미의 차이가 ${s.diff}점이에요. ${esc(DIFF_TEXT[s.diffLevel].text)}`, diffBar)}
    ${meter('흥미 수준', s.elevLevel, ({ high: '높음', mid: '보통', low: '낮음' })[s.elevLevel], elevText)}`
  );

  // ── 직업 탐색 ────────────────────────────────
  const jobs = section(
    'jobs',
    '직업 탐색',
    '흥미 코드에 어울리는 직업의 예시예요. 정답 목록이 아니라 탐색을 시작하는 출발점으로 봐 주세요. 실제로 맞는지는 능력, 가치, 생활 여건과 함께 살펴봐야 해요.',
    `<div class="cr-jobs cr-jobs--pair">
      <h3>${tag(code[0])}<span class="cr-plus">+</span>${tag(code[1])}<small>두 흥미가 만나는 일</small></h3>
      <ul class="cr-chips">${pair.jobs.map((j) => `<li>${esc(j)}</li>`).join('')}</ul>
    </div>
    ${code.map((t) => `<div class="cr-jobs" style="--tc:${TYPE_COLOR[t]}">
      <h3>${tag(t)}<small>${esc(TYPE_TEXT[t].title)}</small></h3>
      <ul class="cr-chips">${TYPE_TEXT[t].jobs.map((j) => `<li>${esc(j)}</li>`).join('')}</ul>
      <p class="cr-fields"><strong>공부 분야</strong>${esc(TYPE_TEXT[t].fields)}</p>
    </div>`).join('')}`
  );

  // ── 탐색 실천 ────────────────────────────────
  const growth = section(
    'growth',
    '흥미를 길로 잇는 법',
    '흥미는 검사보다 경험으로 더 또렷해져요. 작게라도 직접 해 볼수록 나에게 맞는 일이 분명해져요.',
    `<h3 class="rsub">이번 달에 해 볼 탐색</h3>
    <ul class="check-list">${code.map((t) => `<li><strong>${esc(nm(t))}</strong> ${esc(TYPE_TEXT[t].try)}</li>`).join('')}</ul>
    <h3 class="rsub">차근차근 밟을 다섯 단계</h3>
    <ol class="practice-list">${STEPS.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 직업 흥미 유형 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = code.map((t) => `<div class="counsel-item"><h3>${esc(nm(t))} <span class="cr-counsel-score">${T[t].score}</span></h3>
      <ul class="check-list"><li>${esc(TYPE_TEXT[t].counsel)}</li></ul></div>`).join('');
    const watch = [];
    if (s.consistency === 'low') watch.push(`${jo(nm(code[0]), '과', '와')} ${jo(nm(code[1]), '이', '가')} 육각형의 맞은편에 있어요. 두 흥미 사이에서 진로를 정하지 못해 고민하고 있지는 않은지, 둘 중 하나를 포기해야 한다고 느끼는지 살펴봐 주세요.`);
    if (s.diffLevel === 'low') watch.push('흥미가 고르게 나왔어요. 직접 겪어 본 일이 적은지, 아니면 여러 분야에 고루 마음이 가는지 먼저 구분해 보면 좋아요.');
    if (s.elevLevel === 'low') watch.push('흥미 수준이 전반적으로 낮아요. 원래 조심스럽게 답하는 편인지, 요즘 지치거나 기운이 떨어져 무엇에도 마음이 가지 않는 시기인지 함께 확인해 주세요.');
    if (s.elevLevel === 'high') watch.push('거의 모든 흥미가 높아요. 하고 싶은 것이 많아 고르기 어려운지, 남의 기대에 맞춰 답했는지 함께 이야기해 보세요.');
    if (s.alts && s.alts.length) watch.push(`점수가 가까운 유형이 있어 ${s.alts.join(', ')} 코드도 함께 열어 두고 이야기해 주세요.`);
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 코드를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">흥미 코드로 열어 볼 질문</h3>${qs}
        <h3 class="counsel-h">함께 볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 흥미를 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 같은 분야 안에서도 좋아하는 일과 싫어하는 일이 뚜렷하게 나뉘는 편일 수 있어요.');
  else notes.push('같은 흥미를 묻는 문장끼리 응답이 고르게 이어져요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 흥미 사이의 차이가 실제보다 작게 나왔을 수 있어요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 흥미 사이의 차이가 실제보다 작게 나왔을 수 있어요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>흥미 사이 차이</dt><dd>${esc(DIFF_TEXT[s.diffLevel].label)}</dd></div>
      <div class="metric"><dt>같은 흥미 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${scores}${codeSec}${shape}${jobs}${growth}${counsel}${check}</div>`;
  wireToc(el);
}
