// AZIT : Star&Moon — 감정 조절 검사 결과지
import { esc, fmtDate, resultCode } from '../../assets/js/ui.js';
import { wireToc } from '../../assets/js/toc.js';
import { starGlyph } from '../../assets/js/charts.js';
import { SKILLS, SKILL_ORDER, STRATEGIES } from './items.js';
import { SPREAD_LIMIT, ACQ_LIMIT } from './scoring.js';
import { LEVEL_LABEL, GROUP_COLOR, GROUP_TEXT, OVERALL, SKILL_TEXT, STRATEGY_TEXT, BALANCE_TEXT, STEPS, COUNSEL_GENERAL, CLOSING } from './content.js';
import { skillHex } from './chart.js';

const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const jo = (w, withB, without) => `${w}${hasBatchim(w) ? withB : without}`;
const isHigh = (lv) => lv === 'high' || lv === 'vhigh';
const pill = (lv) => `<span class="emo-pill emo-pill--${lv}">${LEVEL_LABEL[lv]}</span>`;
const levelText = (k, lv) => SKILL_TEXT[k][isHigh(lv) ? 'high' : lv === 'mid' ? 'mid' : 'low'];

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
  const O = OVERALL[s.level];
  const K = s.skills;
  const top = s.top;
  const grow = s.grow;
  const flat = s.range < 8; // 여섯 갈래가 거의 고르면 '든든한 갈래'와 '키울 갈래'를 나누지 않는다
  const C = s.check;
  const careful = C.spread >= SPREAD_LIMIT || Math.abs(C.acq) >= ACQ_LIMIT || C.sd < 0.5;
  const balanceKey = s.balance >= 15 ? 'good' : s.balance <= -15 ? 'heavy' : 'even';

  // ── 표지 ─────────────────────────────────────
  const tag = flat
    ? '여섯 갈래가 고르게 비슷해요'
    : `${isHigh(K[top].level) ? '가장 든든한 갈래는' : '상대적으로 앞선 갈래는'} <strong>${esc(SKILLS[top].name)}</strong>, 키워 갈 갈래는 <strong>${esc(jo(SKILLS[grow].name, '이에요', '예요'))}</strong>`;
  const cover = `<header class="sky cover">
    <div class="col">
      <div class="cover-top"><span class="doc">감정 조절 검사 결과지</span><span class="cover-when">${esc(fmtDate(rec.createdAt))}${ctx.rid ? `<br>결과 코드 ${esc(resultCode(ctx.rid))}` : ''}</span></div>
      <p class="cover-name"><strong>${esc(name)}</strong> 님은</p>
      <div class="cover-hero cover-hero--stack">
        <div>
          <p class="emo-kicker">감정을 다루는 힘 ${s.total}점, ${LEVEL_LABEL[s.level]}</p>
          <h1 class="cover-headline">${esc(O.title)}</h1>
          <p class="emo-tag">${tag}</p>
        </div>
        <div class="cover-figure emo-cover-fig">${skillHex(K, { size: 240, total: s.total, title: `감정을 다루는 여섯 갈래: ${SKILL_ORDER.map((k) => `${SKILLS[k].name} ${K[k].score}`).join(', ')}` })}</div>
      </div>
      <dl class="cover-facts">
        <div><dt>다루는 힘</dt><dd>${s.total}<small>${LEVEL_LABEL[s.level]}</small></dd></div>
        <div><dt>${isHigh(K[top].level) ? '든든한 갈래' : '앞선 갈래'}</dt><dd>${esc(SKILLS[top].short)}<small>${K[top].score}점</small></dd></div>
        <div><dt>키워 갈 갈래</dt><dd>${esc(SKILLS[grow].short)}<small>${K[grow].score}점</small></dd></div>
        <div><dt>응답</dt><dd>${careful ? '확인 필요' : '일관됨'}<small>응답 점검 참고</small></dd></div>
      </dl>
    </div>
  </header>`;

  const tocItems = [
    ['summary', '요약'],
    ['skills', '여섯 갈래'],
    ['grow', '강점과 키울 점'],
    ['strategies', '조절 전략'],
    ['steps', '감정이 몰려올 때'],
    ...(showCounsel ? [['counsel', '상담 메모']] : []),
    ['check', '응답 점검'],
  ];
  const toc = `<nav class="toc no-print" aria-label="결과지 목차"><div class="toc-inner">${tocItems.map(([id, label]) => `<a href="#r-${id}">${esc(label)}</a>`).join('')}</div></nav>`;

  // ── 요약 ─────────────────────────────────────
  const topStrat = s.stratOrder[0];
  const paras = [`${esc(name)} 님은 <strong>${esc(jo(O.title, '이에요', '예요'))}</strong>. ${esc(O.summary)}`];
  if (flat) {
    const even = s.range <= 2 ? '여섯 갈래의 점수가 거의 같아요' : `여섯 갈래의 점수가 고르게 비슷해요(가장 높은 갈래와 낮은 갈래가 ${s.range}점 차이)`;
    const tail = isHigh(s.level) ? '어느 한 곳에 치우치지 않고 고르게 든든한 힘으로 감정을 다루고 있어요.'
      : s.level === 'low' ? '여섯 갈래 모두 아직 연습이 필요한 단계예요. 한 갈래만 자라도 다른 갈래가 함께 움직이니, 가장 쉬운 연습 하나부터 시작해 보세요.'
        : '어느 한 곳에 치우치지 않고 비슷한 힘으로 감정을 다루고 있어요.';
    paras.push(`${even}. ${tail}`);
  } else {
    paras.push(`여섯 갈래 가운데 <strong>${esc(SKILLS[top].name)}</strong>(${K[top].score}점)${hasBatchim(SKILLS[top].name) ? '이' : '가'} ${isHigh(K[top].level) ? '가장 든든하고' : '상대적으로 가장 앞서 있고'}, <strong>${esc(SKILLS[grow].name)}</strong>(${K[grow].score}점)${hasBatchim(SKILLS[grow].name) ? '은' : '는'} 앞으로 키워 갈 갈래예요.`);
  }
  paras.push(`힘들 때 가장 자주 쓰는 전략은 '${esc(STRATEGIES[topStrat].name)}'예요. ${esc(BALANCE_TEXT[balanceKey])}`);
  const summary = section('summary', '요약', '', `<div class="summary-box prose">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`);

  // ── 여섯 갈래 ────────────────────────────────
  const bars = `<ul class="emo-bars">${SKILL_ORDER.map((k) => `<li class="${!flat && k === top ? 'is-top' : ''}">
      <span class="nm">${esc(SKILLS[k].name)}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="width:${K[k].score}%"></span></span>
      <span class="val">${K[k].score}</span>${pill(K[k].level)}
    </li>`).join('')}</ul>`;
  const cards = SKILL_ORDER.map((k, i) => `<article class="emo-skill">
      <div class="hd"><span class="emo-no">${i + 1}</span><h3>${esc(SKILLS[k].name)}</h3>${pill(K[k].level)}<span class="score">${K[k].score}</span></div>
      <p class="what">${esc(SKILL_TEXT[k].what)}</p>
      <p>${esc(levelText(k, K[k].level))}</p>
    </article>`).join('');
  const skills = section(
    'skills',
    '감정을 다루는 여섯 갈래',
    '감정이 생겨서 행동으로 이어지기까지, 감정을 다루는 힘은 여섯 갈래로 나뉘어요. 번호는 감정이 흘러가는 순서예요. 점수가 높을수록 그 힘이 든든해요.',
    `${bars}<div class="emo-skills">${cards}</div>`
  );

  // ── 강점과 키울 점 ────────────────────────────
  const ordered = s.order;
  const strong = ordered.filter((k) => isHigh(K[k].level)).slice(0, 2);
  const strongList = strong.length ? strong : K[ordered[0]].level === 'mid' ? ordered.slice(0, 1) : [];
  const strongLabel = strong.length ? '잘 쓰고 있는 힘' : '상대적으로 잘 쓰는 힘';
  const growList = flat ? [] : ordered.slice(-2).reverse().filter((k) => !isHigh(K[k].level) || K[k].score < 70);
  const growBody = growList.length
    ? growList.map((k) => `<article class="emo-grow">
        <div class="hd"><h3>${esc(SKILLS[k].name)}</h3><span class="score">${K[k].score}</span></div>
        <p>${esc(levelText(k, K[k].level))}</p>
        <p class="emo-practice"><strong>작은 연습</strong> ${esc(SKILL_TEXT[k].practice)}</p>
      </article>`).join('')
    : isHigh(s.level)
      ? `<p class="emo-note">여섯 갈래가 고르게 든든해서 따로 키울 갈래를 꼽기 어려워요. 지금 잘 쓰고 있는 방법을 힘든 시기에도 꾸준히 이어 가는 것이 가장 좋은 연습이에요.</p>`
      : `<p class="emo-note">여섯 갈래가 고르게 비슷해서 한 갈래만 꼽기 어려워요. 아래 '감정이 몰려올 때'의 여섯 단계를 차례로 연습하면 여섯 갈래가 함께 자라요.</p>`;
  const growSec = section(
    'grow',
    '강점과 키울 점',
    '이미 잘 쓰고 있는 힘은 발판이 되고, 약한 힘은 연습으로 자라요. 한 번에 하나씩, 가장 작은 연습부터 시작해 보세요.',
    `${strongList.length ? `<div class="emo-strong">${strongList.map((k) => `<div><span class="emo-strong-k">${strongLabel}</span><h3>${esc(SKILLS[k].name)} <span>${K[k].score}</span></h3><p>${esc(SKILL_TEXT[k].what)}</p></div>`).join('')}</div>` : '<p class="emo-note">아직 든든하게 쓰는 갈래는 없지만, 감정을 다루는 힘은 연습할수록 하나씩 자라요. 가장 작은 연습 하나부터 시작해 보세요.</p>'}
    <h3 class="rsub">키워 갈 힘</h3>${growBody}`
  );

  // ── 조절 전략 ────────────────────────────────
  const groups = ['help', 'pause', 'cost'];
  const stratBars = groups.map((g) => {
    const ks = Object.keys(STRATEGIES).filter((k) => STRATEGIES[k].group === g);
    return `<div class="emo-sgroup">
      <h3><i style="background:${GROUP_COLOR[g]}"></i>${esc(GROUP_TEXT[g].name)}</h3>
      <ul class="emo-sbars">${ks.map((k) => `<li><span class="nm">${esc(STRATEGIES[k].name)}</span>
        <span class="track" aria-hidden="true"><span class="fill" style="width:${s.strategies[k]}%;background:${GROUP_COLOR[g]}"></span></span>
        <span class="val">${s.strategies[k]}</span></li>`).join('')}</ul>
    </div>`;
  }).join('');
  const usedOften = s.stratOrder.filter((k) => s.strategies[k] >= 50).slice(0, 3);
  const strategies = section(
    'strategies',
    '자주 쓰는 조절 전략',
    '힘들 때 손이 먼저 가는 전략이에요. 점수가 높을수록 자주 쓰는 전략이에요. 어떤 전략이 좋고 나쁘다기보다, 어떤 전략에 많이 기대고 있는지를 봐요.',
    `${stratBars}
    <div class="domain-read emo-balance">
      <h3>${esc(balanceKey === 'good' ? '도움이 되는 길이 잘 나 있어요' : balanceKey === 'heavy' ? '지치는 전략에 많이 기대고 있어요' : '두 길을 비슷하게 써요')}</h3>
      <p>${esc(BALANCE_TEXT[balanceKey])}</p>
      <dl class="emo-sums"><div><dt>도움이 되는 전략</dt><dd>${s.help}</dd></div><div><dt>잠깐 쉬어 가는 전략</dt><dd>${s.pause}</dd></div><div><dt>오래 쓰면 지치는 전략</dt><dd>${s.cost}</dd></div></dl>
    </div>
    ${usedOften.length ? `<h3 class="rsub">자주 쓰는 전략 자세히</h3><ul class="check-list">${usedOften.map((k) => `<li><strong>${esc(STRATEGIES[k].name)}</strong> ${esc(STRATEGY_TEXT[k])}</li>`).join('')}</ul>` : ''}`
  );

  // ── 감정이 몰려올 때 ──────────────────────────
  const steps = section(
    'steps',
    '감정이 몰려올 때',
    '감정이 크게 밀려오는 순간에 차례로 해 볼 여섯 단계예요. 표시한 단계는 지금 가장 연습이 필요한 단계예요.',
    `<ol class="practice-list emo-steps">${STEPS.map((x) => `<li class="${!flat && x.skill === grow ? 'is-focus' : ''}"><span><strong>${esc(x.t)}</strong> ${esc(x.d)}${!flat && x.skill === grow ? ' <em>특히 연습할 단계</em>' : ''}</span></li>`).join('')}</ol>
    <div class="closing sky">${starGlyph()}<p>${esc(CLOSING)}</p><small>${esc(name)} 님의 감정 조절 검사 결과지</small></div>`
  );

  // ── 상담 메모 (공유 링크에서는 빠짐) ──────────
  let counsel = '';
  if (showCounsel) {
    const focus = flat ? ordered.slice(-1) : ordered.slice(-2).reverse();
    const qs = focus.map((k) => `<div class="counsel-item"><h3>${esc(SKILLS[k].name)} <span class="emo-counsel-score">${K[k].score}</span></h3>
      <ul class="check-list">${SKILL_TEXT[k].counsel.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>`).join('');
    const watch = [];
    if (s.strategies.ru >= 70 && K.st.score < 50) watch.push('곱씹기가 잦고 조절 방법이 부족해요. 가라앉은 기분이 2주 넘게 이어지는지, 잠과 일상에 영향이 있는지 함께 살펴 주세요.');
    if (s.strategies.su >= 70 && K.cl.score < 50) watch.push('감정을 누르는 일이 잦고 감정을 이해하는 힘이 약해요. 감정을 말로 표현하는 연습부터 천천히 시작하면 좋아요.');
    if (K.im.score < 45) watch.push('감정이 행동으로 먼저 나가는 편이에요. 감정이 격해졌을 때 나나 다른 사람에게 해가 되는 행동이 있었는지 조심스럽게 확인해 주세요.');
    if (K.go.score < 45) watch.push('감정이 일과 일상에 영향을 크게 주고 있어요. 출근, 학업, 집안일 같은 생활이 유지되고 있는지 살펴 주세요.');
    if (balanceKey === 'heavy') watch.push('지치는 전략(꾹 누르기, 곱씹기)에 많이 기대고 있어요. 이 전략이 그동안 어떤 쓸모가 있었는지 먼저 인정해 주고, 대신 써 볼 전략을 하나씩 함께 골라 보세요.');
    if (careful) watch.push('응답 점검에서 확인이 필요한 부분이 있어요. 점수를 단정하기보다 검사자의 실제 경험과 맞는지 함께 확인해 주세요.');
    watch.push(COUNSEL_GENERAL);
    counsel = section(
      'counsel',
      '상담에서 함께 볼 것',
      '상담사님이 이 결과로 이야기를 나눌 때 참고할 메모예요. 공유 링크로 여는 결과지에는 보이지 않아요.',
      `<div class="counsel-box">
        <h3 class="counsel-h">키워 갈 갈래로 열어 볼 질문</h3>${qs}
        <h3 class="counsel-h">함께 살펴볼 것</h3>
        <ul class="check-list check-list--soft">${watch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`,
      'counsel'
    );
  }

  // ── 응답 점검 ────────────────────────────────
  const notes = [];
  if (C.sd < 0.5) notes.push('거의 모든 문장에 같은 답을 골라서, 결과가 실제 모습을 충분히 담지 못했을 수 있어요.');
  if (C.spread >= SPREAD_LIMIT) notes.push('같은 갈래를 묻는 문장끼리 응답이 크게 엇갈려요. 문장을 빠르게 넘겼거나, 상황에 따라 마음이 많이 달라지는 편일 수 있어요.');
  else notes.push('같은 갈래를 묻는 문장끼리 응답이 일관돼요.');
  if (C.acq >= ACQ_LIMIT) notes.push("문장 내용과 상관없이 '그렇다' 쪽으로 답하는 경향이 보여요. 실제보다 점수가 조금 높게 나왔을 수 있어요.");
  else if (C.acq <= -ACQ_LIMIT) notes.push("문장 내용과 상관없이 '아니다' 쪽으로 답하는 경향이 보여요. 실제보다 점수가 조금 낮게 나왔을 수 있어요.");
  if (C.fast) notes.push('문항 수에 비해 아주 빠르게 답했어요. 문장을 충분히 읽었는지 함께 확인해 주세요.');
  const minutes = rec.durationSec ? Math.max(1, Math.round(rec.durationSec / 60)) : null;
  const check = section(
    'check',
    '응답 점검',
    '결과를 읽을 때 함께 보면 좋은 응답의 특징이에요.',
    `<dl class="metrics">
      <div class="metric"><dt>평균 응답 (1~5)</dt><dd>${Number(C.rawMean || 0).toFixed(2)}</dd></div>
      <div class="metric"><dt>양 끝 응답</dt><dd>${Math.round((C.extremeRatio || 0) * 100)}%</dd></div>
      <div class="metric"><dt>같은 갈래 일관성</dt><dd>${C.spread >= SPREAD_LIMIT || C.sd < 0.5 ? '확인 필요' : '일관됨'}</dd></div>
      <div class="metric"><dt>한쪽 치우침</dt><dd>${Math.abs(C.acq) >= ACQ_LIMIT ? '있음' : '없음'}</dd></div>
    </dl>
    <ul class="check-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${minutes ? `<p class="final-note">검사에 걸린 시간은 약 ${minutes}분이에요.</p>` : ''}`
  );

  el.innerHTML = `${cover}${toc}<div class="report col">${summary}${skills}${growSec}${strategies}${steps}${counsel}${check}</div>`;
  wireToc(el);
}
