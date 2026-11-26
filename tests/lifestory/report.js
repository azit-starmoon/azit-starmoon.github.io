// AZIT : Star&Moon — 생애 이야기 검사 결과지
// 글로 적은 이야기는 응답(rec.answers)에서 읽는다. 공유 링크로 열면 응답이 없으므로 이야기 부분은 빠진다.
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { MEANING, STORY_ITEMS, THEMES, THEME_ORDER } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { LEVEL_LABEL, THEME_LABEL, THEME_COLOR, STATES, MEANING_TEXT, THEME_TEXT, SCENE_GUIDE, COUNSEL_Q, COUNSEL_GENERAL, PRACTICE_GENERAL, CLOSING } from './content.js';
import { storyShelf, meaningMap } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const pill = (lv, label = LEVEL_LABEL) => `<span class="cp-pill cp-pill--${lv}">${label[lv]}</span>`;
const sw = (k) => `<i style="background:${THEME_COLOR[k]}"></i>`;
// 글은 줄바꿈을 살려 문단으로
// 따옴표 안 글 뒤에 붙는 '이에요/예요'는 마지막 한글 글자의 받침으로 고른다
const copula = (t) => { const h = String(t).replace(/[^가-힣]+$/, ''); return h && hasBatchim(h) ? '이에요' : '예요'; };
const paras = (t) => esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

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
  const A = !ctx.shared && rec.answers ? rec.answers : null;
  const txt = Object.fromEntries(STORY_ITEMS.map((it) => [it.key, A && typeof A[it.id] === 'string' ? A[it.id].trim() : '']));
  const hasText = !!A;
  const St = STATES[s.state];
  const T = s.themes;
  const top = s.themeOrder[0];
  const low = s.themeOrder[s.themeOrder.length - 1];
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  const nameOf = (k) => THEMES[k].name;

  // ── 표지 ─────────────────────────────────────
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">생애 이야기 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님의 이야기는</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="cp-kicker">삶의 의미</p>
          <h1 class="cover-headline">${esc(St.name)}</h1>
          <p class="cp-tag">${esc(St.title)}</p>
        </div>
        <div class="cover-figure ls-cover-fig">${storyShelf(T, { size: 300, title: `이야기의 결: ${THEME_ORDER.map((k) => `${nameOf(k)} ${T[k].score}`).join(', ')}` })}<p class="ls-fig-cap">이야기 책장: 스스로 돌아본 이야기의 결</p></div>
      </div>
      <dl class="cover-facts">
        <div><dt>${esc(MEANING.pr.name)}</dt><dd>${s.pr}<small>${LEVEL_LABEL[s.prLevel]}</small></dd></div>
        <div><dt>${esc(MEANING.se.name)}</dt><dd>${s.se}<small>${LEVEL_LABEL[s.seLevel]}</small></dd></div>
        <div><dt>가장 짙은 결</dt><dd>${esc(nameOf(top))}<small>${T[top].score}점</small></dd></div>
        <div><dt>적어 낸 장면</dt><dd>${s.written}<small>여섯 가운데</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ...(hasText ? [['chapters', '내 삶의 장'], ['scenes', '이야기의 장면']] : []),
    ['themes', '이야기의 결'],
    ['meaning', '삶의 의미'],
    ...(hasText ? [['next', '다음 장']] : []),
    ['practice', '연습'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const sum = [
    `${esc(name)} 님의 이야기는 지금 <strong>${esc(St.name)}</strong>에 가까워요. ${esc(St.text)}`,
    `스스로 돌아본 이야기의 결 가운데 <strong>${esc(nameOf(top))}</strong>${hasBatchim(nameOf(top)) ? '이' : '가'} 가장 짙고(${T[top].score}점), ${esc(nameOf(low))}${hasBatchim(nameOf(low)) ? '은' : '는'} 상대적으로 옅어요(${T[low].score}점). ${esc(THEME_TEXT[top][T[top].level === 'low' ? 'mid' : T[top].level])}`,
  ];
  if (hasText && txt.theme) { const th = txt.theme.split('\n')[0].slice(0, 60); sum.push(`${esc(name)} 님이 꼽은 이야기의 주제는 <strong>'${esc(th)}'</strong>${copula(th)}.`); }
  if (!hasText) sum.push('글로 적은 이야기는 공유 링크에 담기지 않아요. 장면과 다음 장은 상담 선생님과 함께 볼 수 있어요.');
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${sum.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 내 삶의 장 ───────────────────────────────
  let chapters = '';
  if (hasText) {
    const lines = txt.chapters.split('\n').map((l) => l.trim()).filter((l) => l && !/^\d+\s*장$/.test(l));
    const body = !lines.length
      ? '<p class="ls-empty">장 제목은 비워 두었어요. 나중에 떠오를 때 적어 보면 이야기의 흐름이 보이기 시작해요.</p>'
      : lines.length === 1
        ? `<div class="ls-quote">${paras(lines[0])}</div>`
        : `<ol class="ls-chapters">${lines.slice(0, 12).map((l, i) => `<li><span class="n">${i + 1}</span><span>${esc(l.replace(/^\d+\s*장[\s.:)\-]*/, ''))}</span></li>`).join('')}</ol>`;
    chapters = section('chapters', '내 삶의 장', '지금까지의 삶을 한 권의 책으로 보고 직접 나눈 장이에요. 장을 나누는 방식에는 내가 내 삶을 어떻게 이해하는지가 담겨요.', body);
  }

  // ── 이야기의 장면 ────────────────────────────
  let scenes = '';
  if (hasText) {
    const cards = ['high', 'low', 'turn'].map((k) => {
      const it = STORY_ITEMS.find((x) => x.key === k);
      return `<article class="cp-card ls-scene">
        <div class="hd"><h3>${esc(it.name)}</h3></div>
        ${txt[k] ? `<div class="ls-quote">${paras(txt[k])}</div>` : '<p class="ls-empty">이 장면은 비워 두었어요. 쓰기 어려운 장면은 남겨 두어도 괜찮아요.</p>'}
        <p class="ls-guide-t"><strong>읽는 길잡이</strong> ${esc(SCENE_GUIDE[k])}</p>
      </article>`;
    }).join('');
    scenes = section('scenes', '이야기의 장면', '이야기를 이루는 세 장면이에요. 검사자가 쓴 글을 그대로 옮겼어요.', `<div class="cp-cards">${cards}</div>`);
  }

  // ── 이야기의 결 ──────────────────────────────
  const bars = `<ul class="cp-bars">${THEME_ORDER.map((k) => `<li class="${k === top ? 'is-top' : ''}">
      <span class="nm">${esc(nameOf(k))}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${T[k].score}%;background:${THEME_COLOR[k]}"></span></span>
      <span class="val">${T[k].score}</span>${pill(T[k].level, THEME_LABEL)}
    </li>`).join('')}</ul>`;
  const themeCards = THEME_ORDER.map((k) => `<article class="cp-card ${k === top ? 'is-focus' : ''}">
      <div class="hd">${sw(k)}<h3>${esc(nameOf(k))}</h3>${pill(T[k].level, THEME_LABEL)}<span class="score">${T[k].score}</span></div>
      <p class="rs-domain-what">${esc(THEME_TEXT[k].what)}</p>
      <p>${esc(THEME_TEXT[k][T[k].level])}</p>
    </article>`).join('');
  const themesSec = section(
    'themes',
    '이야기의 결',
    '같은 일을 겪어도 그것을 어떤 이야기로 엮는지는 사람마다 달라요. 검사자가 자기 이야기를 돌아보며 답한 네 가지 결이에요. 좋고 나쁨이 아니라 지금 이야기가 어떤 색으로 쓰이고 있는지를 보여 줘요.',
    `${bars}<div class="cp-cards">${themeCards}</div>`
  );

  // ── 삶의 의미 ────────────────────────────────
  const meaningSec = section(
    'meaning',
    '삶의 의미',
    '삶의 의미를 지금 얼마나 느끼는지와, 얼마나 찾고 있는지는 서로 다른 마음이에요. 둘을 함께 보면 지금 이야기가 어디쯤 와 있는지 보여요.',
    `<div class="es-map">
      <div class="es-map-fig">${meaningMap(s.pr, s.se, { size: 290, state: s.state, title: `의미 지도: ${St.name}` })}</div>
      <div class="es-map-read">
        <p class="es-kicker">${esc(St.name)}</p>
        <h3>${esc(St.title)}</h3>
        <p>${esc(MEANING_TEXT.pr[s.prLevel])} ${esc(MEANING_TEXT.se[s.seLevel])}</p>
        <p class="es-tip"><strong>도움이 되는 방향</strong> ${esc(St.tip)}</p>
      </div>
    </div>`
  );

  // ── 다음 장 ──────────────────────────────────
  let next = '';
  if (hasText) {
    next = section(
      'next',
      '이야기의 다음 장',
      '지나온 장면만큼 앞으로 쓰고 싶은 장면도 지금의 나를 말해 줘요.',
      `<div class="cp-cards">
        <article class="cp-card ls-scene"><div class="hd"><h3>바라는 다음 장</h3></div>${txt.next ? `<div class="ls-quote">${paras(txt.next)}</div>` : '<p class="ls-empty">다음 장은 비워 두었어요. 지금은 쉬어 가는 장일 수도 있어요.</p>'}</article>
        <article class="cp-card ls-scene"><div class="hd"><h3>이야기를 꿰는 주제</h3></div>${txt.theme ? `<div class="ls-quote ls-quote--theme">${paras(txt.theme)}</div>` : '<p class="ls-empty">주제는 비워 두었어요. 장면들을 다시 읽다 보면 떠오를 수 있어요.</p>'}</article>
      </div>`
    );
  }

  // ── 연습 ─────────────────────────────────────
  const practices = [
    { t: `${nameOf(low)}의 결 더하기`, d: THEME_TEXT[low].practice },
    { t: `${St.short} 이야기의 작은 연습`, d: St.tip },
    PRACTICE_GENERAL,
  ];
  const practiceSec = section(
    'practice',
    '이야기를 이어 쓰는 연습',
    '이야기는 다시 읽고 다시 말할수록 달라져요. 하나를 골라 일주일만 해 보세요.',
    `<ol class="practice-list">${practices.map((x) => `<li><span><strong>${esc(x.t)}</strong> ${esc(x.d)}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 생애 이야기 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const qs = [...COUNSEL_Q.general];
    if (T[low].level !== 'high') qs.push(COUNSEL_Q[low]);
    const watch = [];
    if (s.state === 'pausing' && s.pr < 40) watch.push('삶의 의미를 느끼기 어렵고 찾을 힘도 크지 않은 상태예요. 무기력, 우울한 기분, 삶을 그만두고 싶은 생각이 있는지 조심스럽게 살펴 주세요.');
    if (T.rd.score < 40) watch.push("좋았던 일도 결국 나쁘게 끝났다고 느끼는 결이 보여요(서사 연구에서는 '오염 서사'라고 불러요). 아직 아물지 않은 장면이 있는지 천천히 살펴 주세요.");
    if (s.written <= 2) watch.push('글로 적은 장면이 적어요. 쓰기가 낯설었는지, 떠올리기 힘든 장면이 있었는지 말로 다시 들어 보면 좋아요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 검사자가 쓴 이야기와 함께 읽어 주세요.');
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
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 내용을 묻는 문장끼리 응답이 엇갈려요. 문장을 빠르게 넘겼거나, 장면에 따라 이야기가 많이 다르게 느껴지는 편일 수 있어요.');
  else notes.push('같은 내용을 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 점수를 해석할 때 함께 고려해 주세요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 점수를 해석할 때 함께 고려해 주세요.");
  if (C.fast) notes.push('문항 수와 적은 글에 비해 아주 빠르게 마쳤어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요. 1부와 3부의 문장으로 살펴봤어요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>같은 내용 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
      <div class="metric"><dt>적어 낸 글</dt><dd>${s.written}/6, ${s.chars}자</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${chapters}${scenes}${themesSec}${meaningSec}${next}${practiceSec}${counsel}${check}</div>`;
  wireToc(el);
}
