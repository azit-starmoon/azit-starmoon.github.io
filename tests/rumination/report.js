// AZIT : Star&Moon — 곱씹기와 돌아보기 검사 결과지
// 표지 → 요약 → 생각 지도 → 두 가지 생각 → 성장 방향 → 상담 메모 → 응답 점검.
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { SCALES, SCALE_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT, typeOf, levelOf } from './scoring.js';
import { LEVEL_LABEL, TYPES, TYPE_SHORT, SCALE_TEXT, STEPS, COUNSEL_Q, COUNSEL_GENERAL, CLOSING } from './content.js';
import { thinkMap } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const num = (v, d = 50) => (Number.isFinite(Number(v)) ? Number(v) : d);
const pill = (lv) => `<span class="hsp-pill hsp-pill--${lv}">${LEVEL_LABEL[lv] || ''}</span>`;
const band = (lv) => (lv === 'high' || lv === 'vhigh' ? 'high' : lv === 'mid' ? 'mid' : 'low');

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
  const br = num(s.br);
  const rf = num(s.rf);
  const type = TYPES[s.type] ? s.type : typeOf(br, rf);
  const T = TYPES[type];
  const lv = { br: levelOf(br), rf: levelOf(rf) };
  const C = s.check || {};
  const careful = num(C.spread, 0) >= SPREAD_LIMIT || Math.abs(num(C.acq, 0)) >= ACQ_LIMIT || num(C.sd, 1) < 0.5;
  const bal = rf - br;
  // 기준선(50) 가까이: 문장 한두 개의 답에 따라 옆 모양으로 넘어갈 수 있는 자리
  const near = new Set();
  if (Math.abs(br - 50) <= 4) near.add(typeOf(br > 50 ? 50 : 51, rf));
  if (Math.abs(rf - 50) <= 4) near.add(typeOf(br, rf > 50 ? 50 : 51));
  near.delete(type);
  const map = (size) => thinkMap(br, rf, { size, type, title: `생각 지도: 곱씹기 ${br}, 돌아보기 ${rf}, ${T.name}` });

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">곱씹기와 돌아보기 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="hsp-kicker">곱씹기 ${br}, 돌아보기 ${rf}</p>
          <h1 class="cover-headline">${esc(T.title)}</h1>
          <p class="hsp-tag">생각의 모양은 <strong>${esc(jo(T.name, '이에요', '예요'))}</strong></p>
        </div>
        <div class="cover-figure hsp-cover-fig">${map(250)}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>곱씹기</dt><dd>${br}<small>${LEVEL_LABEL[lv.br]}</small></dd></div>
        <div><dt>돌아보기</dt><dd>${rf}<small>${LEVEL_LABEL[lv.rf]}</small></dd></div>
        <div><dt>생각의 모양</dt><dd>${esc(TYPE_SHORT[type])}<small>생각 지도 참고</small></dd></div>
        <div><dt>응답</dt><dd>${careful ? '확인 필요' : '일관됨'}<small>응답 점검 참고</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['map', '생각 지도'],
    ['scales', '두 가지 생각'],
    ['growth', '성장 방향'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const paras = [`${esc(name)} 님의 생각의 모양은 <strong>${esc(jo(T.name, '이에요', '예요'))}</strong>. 곱씹기는 ${br}점(${LEVEL_LABEL[lv.br]}), 돌아보기는 ${rf}점(${LEVEL_LABEL[lv.rf]})이에요.`];
  // 10점: 8문항 점수가 다시 할 때 흔들리는 폭(약 9점, assets/js/tracks.js의 '비슷함' 폭)보다 큰 차이
  paras.push(bal >= 10 ? `돌아보기가 곱씹기보다 ${bal}점 앞서요. 생각이 맴돌기보다 길을 찾는 쪽으로 더 많이 쓰이고 있어요.`
    : bal <= -10 ? `곱씹기가 돌아보기보다 ${-bal}점 앞서요. 같은 생각이 길을 찾기보다 제자리를 도는 때가 더 많아요.`
      : '두 생각이 비슷한 크기로 함께 있어요. 같은 일을 두고도 때로는 길을 찾고, 때로는 맴돌 수 있어요.');
  if (near.size) paras.push(`점수가 모양을 가르는 선(50) 가까이에 있어서, 문장 한두 개의 답에 따라 ${[...near].map((k) => `'${esc(TYPES[k].name)}'`).join(', ')} 쪽으로 넘어갈 수 있어요. 그 모양의 설명도 함께 읽어 보세요.`);
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 생각 지도 (자세한 해석) ─────────────────────
  const mapSec = section(
    'map',
    '생각 지도',
    '가로는 돌아보기, 세로는 곱씹기예요. 두 점수가 50을 넘는지로 생각의 네 모양을 나눠요.',
    `<div class="hsp-state">
      <div class="hsp-state-fig">${map(290)}</div>
      <div class="hsp-state-read">
        <p class="hsp-kicker">${esc(T.name)}</p>
        <h3>${esc(T.title)}</h3>
        <p>${esc(T.text)}</p>
        <dl class="hsp-state-nums"><div><dt>곱씹기</dt><dd>${br}</dd></div><div><dt>돌아보기</dt><dd>${rf}</dd></div></dl>
      </div>
    </div>`
  );

  // ── 두 가지 생각 ─────────────────────────────
  const cards = SCALE_ORDER.map((k) => `<article class="ip-card">
      <div class="hd"><h3>${esc(SCALES[k].name)}</h3>${pill(lv[k])}<span class="score">${k === 'br' ? br : rf}</span></div>
      <p class="rm-what">${esc(SCALES[k].what)}</p>
      <p>${esc(SCALE_TEXT[k][band(lv[k])])}</p>
    </article>`).join('');
  const scalesSec = section(
    'scales',
    '두 가지 생각',
    '둘 다 마음을 오래 생각하는 일이지만, 하나는 같은 자리를 맴돌고 하나는 길을 찾아가요. 연구에서도 둘은 다른 결과로 이어진다고 보고돼요.',
    `<div class="ip-cards">${cards}</div>`
  );

  // ── 성장 방향 ────────────────────────────────
  const growth = section(
    'growth',
    '성장 방향',
    '맴도는 생각을 멈추려 애쓰기보다, 같은 생각의 방향을 조금씩 옮기는 쪽이 쉬워요.',
    `<h3 class="rsub">${esc(T.name)}에게 맞는 연습</h3>
    <ul class="check-list">${T.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h3 class="rsub">생각이 맴돌 때 해 볼 차례</h3>
    <ol class="practice-list">${STEPS.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 곱씹기와 돌아보기 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const watch = [T.counsel];
    if (br >= 75) watch.push('곱씹기가 매우 높아요. 잠들기 어려움, 식욕 변화, 오래가는 가라앉은 기분이 함께 있는지 확인해 주세요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 검사자의 실제 생각 습관과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">열어 볼 질문</h3>
        <ul class="check-list">${COUNSEL_Q.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
        <h3 class="counsel-h">함께 볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (num(C.sd, 1) < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (num(C.spread, 0) >= SPREAD_LIMIT) notes.push('같은 갈래를 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 생각 습관이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 갈래를 묻는 문장끼리 응답이 일관돼요.');
  if (num(C.acq, 0) >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 두 점수가 실제보다 조금 높게 나왔을 수 있어요.");
  else if (num(C.acq, 0) <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 두 점수가 실제보다 조금 낮게 나왔을 수 있어요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const secs = Number(rec.durationSec || 0);
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${num(C.rawMean, 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round(num(C.extremeRatio, 0) * 100)}%</dd></div>
      <div class="metric"><dt>같은 갈래 일관성</dt><dd>${num(C.spread, 0) >= SPREAD_LIMIT || num(C.sd, 1) < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(num(C.acq, 0)) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${secs ? `<p class="final-note">검사에 걸린 시간은 ${secs < 90 ? `${Math.round(secs)}초예요` : `약 ${Math.round(secs / 60)}분이에요`}.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${mapSec}${scalesSec}${growth}${counsel}${check}</div>`;
  wireToc(el);
}
