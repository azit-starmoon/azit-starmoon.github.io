// AZIT : Star&Moon — 검사 진행 엔진
// 검사 정의(def)만 바꾸면 어떤 검사든 같은 흐름으로 진행된다.
// 흐름: 소개 → (로그인) → 이름·동의 → [부 소개 → 문항들] × 부 → 저장 → 결과지
import { ready, onUser, currentUser, saveResult, resultUrl } from './backend.js';
import { esc, toast, googleButton, brandHTML, login } from './ui.js';
import { constellation } from './charts.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runTest(def, mount) {
  const S = {
    step: 'intro',
    pi: 0,
    ii: 0,
    items: [],
    answers: {},
    name: '',
    startedAt: 0,
    busy: false,
    wantStart: false,
    rankTemp: [],
    consent: false,
  };
  const totalCount = def.parts.reduce((s, p) => s + p.count, 0);

  mount.innerHTML = `<div class="runner-page">
    <div class="runner-top"><div class="wrap runner-top-inner">
      <a class="brand" href="index.html" aria-label="처음으로">${brandHTML()}</a>
      <span class="runner-title">${esc(def.title)}</span>
      <a class="btn btn--text runner-exit" href="index.html" data-exit>나가기</a>
    </div><div class="progress" aria-hidden="true"><i data-progress></i></div></div>
    <main class="runner-main" id="main"><div class="stage" data-stage></div></main>
  </div>`;
  const stage = mount.querySelector('[data-stage]');
  const bar = mount.querySelector('[data-progress]');

  const key = () => {
    const u = currentUser();
    return u ? `azit:progress:${def.id}:${def.version}:${u.uid}` : null;
  };
  const loadProgress = () => {
    const k = key();
    if (!k) return null;
    try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
  };
  const persist = () => {
    const k = key();
    if (!k) return;
    try {
      localStorage.setItem(k, JSON.stringify({ answers: S.answers, pi: S.pi, ii: S.ii, name: S.name, startedAt: S.startedAt, savedAt: Date.now() }));
    } catch (e) { /* 저장 공간 부족 */ }
  };
  const clearProgress = () => { const k = key(); if (k) localStorage.removeItem(k); };

  const itemsFor = (pi) => {
    const p = def.parts[pi];
    return p.items ? p.items : p.build(S.answers);
  };
  const answeredCount = () => {
    let n = 0;
    def.parts.forEach((p, pi) => {
      const its = pi === S.pi && S.items.length ? S.items : (p.items || []);
      its.forEach((it) => { if (S.answers[it.id] !== undefined) n++; });
    });
    return n;
  };
  const position = () => {
    let before = 0;
    for (let i = 0; i < S.pi; i++) before += def.parts[i].count;
    return before + (S.step === 'item' ? S.ii : 0);
  };
  const setBar = () => {
    const pct = S.step === 'intro' || S.step === 'profile' ? 0 : S.step === 'working' ? 100 : (position() / totalCount) * 100;
    bar.style.width = `${pct.toFixed(1)}%`;
  };
  const focusStage = () => {
    const h = stage.querySelector('[data-focus]');
    window.scrollTo({ top: 0 });
    if (h) h.focus({ preventScroll: true });
  };

  // ── 화면들 ───────────────────────────────────
  function renderIntro() {
    const u = currentUser();
    const prog = u ? loadProgress() : null;
    const done = prog ? Object.keys(prog.answers || {}).length : 0;
    const intro = def.intro;
    let actions;
    if (!u) {
      actions = `${googleButton('구글로 로그인하고 시작하기', 'btn btn--block')}
        <p class="resume-note">결과를 보관하고 다시 볼 수 있도록 로그인이 필요해요.</p>`;
    } else if (prog && done > 0) {
      actions = `<button type="button" class="btn btn--block" data-act="resume">이어서 하기 (${done}/${totalCount})</button>
        <button type="button" class="btn btn--ghost btn--block" data-act="restart">처음부터 다시 하기</button>`;
    } else {
      actions = `<button type="button" class="btn btn--block" data-act="start">검사 시작하기</button>`;
    }
    stage.innerHTML = `<section class="intro-card" aria-labelledby="intro-title">
      <p class="intro-kicker">${esc(intro.kicker)}</p>
      <h1 class="intro-title" id="intro-title" tabindex="-1" data-focus>${esc(def.title)}</h1>
      <p class="intro-lead">${esc(intro.lead)}</p>
      <dl class="intro-facts">${intro.facts.map((f) => `<div><dt>${esc(f.dt)}</dt><dd>${esc(f.dd)}</dd></div>`).join('')}</dl>
      <ol class="parts-list">${def.parts.map((p) => `<li><div><strong>${esc(p.title)} <span class="tag">${p.count}문항</span></strong><span>${esc(p.summary)}</span></div></li>`).join('')}</ol>
      <div class="gets"><h3>결과지에 담기는 것</h3><ul>${intro.gets.map((g) => `<li class="tag">${esc(g)}</li>`).join('')}</ul></div>
      <div class="intro-actions">${actions}</div>
    </section>`;
  }

  function renderProfile() {
    const u = currentUser();
    const name = S.name || (u && u.name) || '';
    stage.innerHTML = `<section class="intro-card" aria-labelledby="pf-title">
      <p class="intro-kicker">시작하기 전에</p>
      <h1 class="intro-title" id="pf-title" tabindex="-1" data-focus>결과지에 쓸 이름을 확인해 주세요</h1>
      <p class="intro-lead">결과지 맨 앞에 이 이름이 들어가요.</p>
      <div class="field">
        <label for="pf-name">이름</label>
        <input class="input" id="pf-name" maxlength="20" autocomplete="name" value="${esc(name)}" required>
      </div>
      <label class="consent">
        <input type="checkbox" id="pf-consent" ${S.consent ? 'checked' : ''}>
        <div><strong>결과 보관에 동의해요</strong>
        <span>응답과 결과는 내 계정에 저장되고, 나와 AZIT 관리자가 다시 볼 수 있어요. 결과는 언제든 '내 기록'에서 지울 수 있어요.</span></div>
      </label>
      <div class="intro-actions">
        <button type="button" class="btn btn--block" data-act="begin" ${S.consent && name ? '' : 'disabled'}>시작하기</button>
        <button type="button" class="btn btn--text" data-act="to-intro">뒤로</button>
      </div>
    </section>`;
    const nameEl = stage.querySelector('#pf-name');
    const consentEl = stage.querySelector('#pf-consent');
    const beginEl = stage.querySelector('[data-act="begin"]');
    const sync = () => {
      S.name = nameEl.value.trim();
      S.consent = consentEl.checked;
      beginEl.disabled = !(S.name && S.consent);
    };
    nameEl.addEventListener('input', sync);
    consentEl.addEventListener('change', sync);
  }

  function renderPartIntro() {
    const p = def.parts[S.pi];
    stage.innerHTML = `<section class="part-intro" aria-labelledby="pi-title">
      <div class="part-meta"><button type="button" class="back-btn" data-act="back" ${S.pi === 0 ? 'hidden' : ''}>← 이전</button><span></span></div>
      <span class="part-no">${S.pi + 1}부 / ${def.parts.length}부</span>
      <h1 id="pi-title" tabindex="-1" data-focus>${esc(p.title)}</h1>
      <p>${esc(p.desc)}</p>
      <div class="how">${p.how}</div>
      <button type="button" class="btn btn--block" data-act="enter">${S.pi === 0 ? '첫 문항 보기' : '이어서 하기'}</button>
    </section>`;
  }

  function metaRow() {
    const p = def.parts[S.pi];
    return `<div class="part-meta"><button type="button" class="back-btn" data-act="back">← 이전</button>
      <span>${esc(p.short)} <span class="count">${S.ii + 1}/${S.items.length}</span></span></div>`;
  }

  function renderLikert(it, p) {
    const cur = S.answers[it.id];
    stage.innerHTML = `${metaRow()}
      <h1 class="q-text" tabindex="-1" data-focus id="q-${esc(it.id)}">${esc(it.text)}</h1>
      <ul class="likert" role="list" aria-labelledby="q-${esc(it.id)}">${p.scale
        .map((s, i) => `<li><button type="button" class="opt" data-likert="${s.value}" aria-pressed="${cur === s.value}">
          <span class="dot" aria-hidden="true"></span>${esc(s.label)}<span class="key" aria-hidden="true">${i + 1}</span></button></li>`)
        .join('')}</ul>`;
  }

  function renderPair(it) {
    const v = S.answers[it.id];
    const winner = typeof v === 'number' ? (v > 0 ? it.lo : it.hi) : null;
    const strength = typeof v === 'number' ? Math.abs(v) : 0;
    const card = (side, data, keys) => {
      const chosen = winner === data.type;
      return `<div class="pair-card" data-chosen="${chosen}">
        <p class="stmt" id="stmt-${side}">${esc(data.text)}</p>
        <div class="strengths" role="group" aria-labelledby="stmt-${side}">
          <button type="button" data-pair="${data.type}" data-s="2" aria-pressed="${chosen && strength === 2}">훨씬 가까워요<span class="sr-only"> (${keys[0]})</span></button>
          <button type="button" data-pair="${data.type}" data-s="1" aria-pressed="${chosen && strength === 1}">조금 더 가까워요<span class="sr-only"> (${keys[1]})</span></button>
        </div>
      </div>`;
    };
    stage.innerHTML = `${metaRow()}
      <h1 class="pair-prompt" tabindex="-1" data-focus>${esc(it.prompt)}</h1>
      <p class="pair-help">둘 다 맞거나 둘 다 아니어도, 굳이 고른다면 어느 쪽인지 골라 주세요.</p>
      <div class="pair-cards">${card('a', it.a, [1, 2])}<p class="pair-or" aria-hidden="true">또는</p>${card('b', it.b, [4, 3])}</div>`;
  }

  function renderRank(it) {
    const saved = Array.isArray(S.answers[it.id]) ? S.answers[it.id] : null;
    const ranks = S.rankTemp.length ? S.rankTemp : saved || [];
    stage.innerHTML = `${metaRow()}
      <h1 class="q-text" tabindex="-1" data-focus>${esc(it.prompt)}</h1>
      <p class="rank-help">나에게 가까운 순서대로 두 개를 눌러 주세요. 마지막 하나는 저절로 정해져요.</p>
      <div class="rank-opts">${it.options
        .map((o) => {
          const r = ranks.indexOf(o.key);
          return `<button type="button" class="rank-opt" data-rank-key="${o.key}" ${r >= 0 ? `data-rank="${r + 1}"` : ''} aria-pressed="${r >= 0}">
            <span class="rank-badge" aria-hidden="true">${r >= 0 ? r + 1 : ''}</span><span>${esc(o.text)}</span></button>`;
        })
        .join('')}</div>`;
  }

  function renderItem() {
    const p = def.parts[S.pi];
    const it = S.items[S.ii];
    if (!it) return;
    if (p.kind === 'likert') renderLikert(it, p);
    else if (p.kind === 'pair') renderPair(it);
    else if (p.kind === 'rank') renderRank(it);
  }

  function renderWorking(msg = '응답을 분석해서 결과지를 만들고 있어요') {
    const demo = {};
    for (let t = 1; t <= 9; t++) demo[t] = 40 + ((t * 37) % 50);
    stage.innerHTML = `<section class="working" aria-live="polite">
      <div class="night" style="border-radius:22px;padding:24px;margin-bottom:22px">${constellation(demo, { size: 240, animate: true, labels: false })}</div>
      <p tabindex="-1" data-focus>${esc(msg)}</p>
    </section>`;
  }

  function renderSaveError() {
    stage.innerHTML = `<section class="gate" style="margin-top:0">
      <h2 tabindex="-1" data-focus>결과를 저장하지 못했어요</h2>
      <p>인터넷 연결을 확인한 뒤 다시 시도해 주세요. 응답은 이 기기에 그대로 남아 있어요.</p>
      <button type="button" class="btn btn--block" data-act="retry">다시 저장하기</button>
    </section>`;
  }

  function render() {
    setBar();
    if (S.step === 'intro') renderIntro();
    else if (S.step === 'profile') renderProfile();
    else if (S.step === 'part') renderPartIntro();
    else if (S.step === 'item') renderItem();
    else if (S.step === 'working') renderWorking();
    else if (S.step === 'error') renderSaveError();
    focusStage();
  }

  // ── 이동 ─────────────────────────────────────
  function enterPart(pi, atEnd = false) {
    S.pi = pi;
    S.items = itemsFor(pi);
    S.ii = atEnd ? S.items.length - 1 : 0;
    S.rankTemp = [];
    S.step = 'item';
    render();
  }

  function next() {
    S.rankTemp = [];
    if (S.ii < S.items.length - 1) {
      S.ii++;
      persist();
      render();
    } else if (S.pi < def.parts.length - 1) {
      S.pi++;
      S.ii = 0;
      S.step = 'part';
      persist();
      render();
    } else {
      finish();
    }
  }

  function back() {
    S.rankTemp = [];
    if (S.step === 'item') {
      if (S.ii > 0) { S.ii--; render(); }
      else { S.step = 'part'; render(); }
    } else if (S.step === 'part') {
      if (S.pi > 0) enterPart(S.pi - 1, true);
      else { S.step = 'profile'; render(); }
    }
  }

  async function answer(id, value) {
    if (S.busy) return;
    S.busy = true;
    S.answers[id] = value;
    persist();
    await delay(180);
    S.busy = false;
    next();
  }

  async function finish() {
    for (let pi = 0; pi < def.parts.length; pi++) {
      const its = itemsFor(pi);
      const miss = its.findIndex((it) => S.answers[it.id] === undefined);
      if (miss >= 0) {
        S.pi = pi;
        S.items = its;
        S.ii = miss;
        S.step = 'item';
        render();
        toast('답하지 않은 문항이 있어요. 이 문항부터 이어서 해 주세요.');
        return;
      }
    }
    S.step = 'working';
    render();
    await save();
  }

  async function save() {
    const durationSec = Math.min(3 * 3600, Math.round((Date.now() - (S.startedAt || Date.now())) / 1000));
    const used = {};
    def.parts.forEach((p, pi) => itemsFor(pi).forEach((it) => { used[it.id] = S.answers[it.id]; }));
    const scores = def.score(used, { durationSec });
    const record = {
      testId: def.id,
      version: def.version,
      name: S.name || (currentUser() && currentUser().name) || '',
      answers: used,
      scores,
      summary: def.summary(scores),
      durationSec,
    };
    try {
      const [{ uid, rid }] = await Promise.all([saveResult(record), delay(1500)]);
      clearProgress();
      location.href = resultUrl(uid, rid);
    } catch (e) {
      console.error(e);
      S.step = 'error';
      render();
    }
  }

  function begin(fresh) {
    const prog = fresh ? null : loadProgress();
    if (prog) {
      S.answers = prog.answers || {};
      S.name = prog.name || S.name;
      S.startedAt = prog.startedAt || Date.now();
      S.pi = Math.min(prog.pi || 0, def.parts.length - 1);
      S.items = itemsFor(S.pi);
      S.ii = Math.min(prog.ii || 0, S.items.length - 1);
      const firstMissing = S.items.findIndex((it) => S.answers[it.id] === undefined);
      if (firstMissing >= 0 && firstMissing < S.ii) S.ii = firstMissing;
      S.step = 'item';
      render();
    } else {
      if (fresh) clearProgress();
      S.answers = {};
      S.startedAt = 0;
      S.pi = 0;
      S.ii = 0;
      S.step = 'profile';
      render();
    }
  }

  // ── 이벤트 ───────────────────────────────────
  stage.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-login')) {
      S.wantStart = true;
      t.disabled = true;
      const u = await login();
      t.disabled = false;
      if (!u) S.wantStart = false;
      return;
    }
    const act = t.dataset.act;
    if (act === 'start') begin(true);
    else if (act === 'resume') begin(false);
    else if (act === 'restart') begin(true);
    else if (act === 'to-intro') { S.step = 'intro'; render(); }
    else if (act === 'begin') {
      if (!S.startedAt) S.startedAt = Date.now();
      S.pi = 0;
      S.step = 'part';
      persist();
      render();
    } else if (act === 'enter') enterPart(S.pi);
    else if (act === 'back') back();
    else if (act === 'retry') { S.step = 'working'; render(); save(); }
    else if (t.dataset.likert) {
      const it = S.items[S.ii];
      stage.querySelectorAll('[data-likert]').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      answer(it.id, Number(t.dataset.likert));
    } else if (t.dataset.pair) {
      const it = S.items[S.ii];
      const type = Number(t.dataset.pair);
      const s = Number(t.dataset.s);
      stage.querySelectorAll('[data-pair]').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      stage.querySelectorAll('.pair-card').forEach((c) => (c.dataset.chosen = String(c.contains(t))));
      answer(it.id, type === it.lo ? s : -s);
    } else if (t.dataset.rankKey) {
      rankTap(t.dataset.rankKey);
    }
  });

  function rankTap(k) {
    if (S.busy) return;
    const it = S.items[S.ii];
    const idx = S.rankTemp.indexOf(k);
    if (idx >= 0) S.rankTemp = S.rankTemp.slice(0, idx);
    else S.rankTemp.push(k);
    if (S.rankTemp.length === 2) {
      const rest = it.options.map((o) => o.key).find((x) => !S.rankTemp.includes(x));
      S.rankTemp.push(rest);
      const final = S.rankTemp.slice();
      renderRank(it);
      S.busy = true;
      S.answers[it.id] = final;
      persist();
      setTimeout(() => { S.busy = false; next(); }, 420);
      return;
    }
    renderRank(it);
    const btn = stage.querySelector(`[data-rank-key="${k}"]`);
    if (btn) btn.focus({ preventScroll: true });
  }

  document.addEventListener('keydown', (e) => {
    if (S.step !== 'item' || S.busy) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const p = def.parts[S.pi];
    const it = S.items[S.ii];
    if (e.key === 'Backspace' || e.key === 'ArrowLeft') { e.preventDefault(); back(); return; }
    const n = Number(e.key);
    if (!n) return;
    if (p.kind === 'likert' && n >= 1 && n <= p.scale.length) {
      const b = stage.querySelector(`[data-likert="${p.scale[n - 1].value}"]`);
      if (b) b.click();
    } else if (p.kind === 'pair' && n >= 1 && n <= 4) {
      const map = { 1: [it.a.type, 2], 2: [it.a.type, 1], 3: [it.b.type, 1], 4: [it.b.type, 2] };
      const [type, s] = map[n];
      const b = stage.querySelector(`[data-pair="${type}"][data-s="${s}"]`);
      if (b) b.click();
    } else if (p.kind === 'rank' && n >= 1 && n <= it.options.length) {
      rankTap(it.options[n - 1].key);
    }
  });

  mount.querySelector('[data-exit]').addEventListener('click', () => {
    if (S.step === 'item' || S.step === 'part') toast('진행 상황은 이 기기에 저장돼요.');
  });

  await ready();
  render();
  onUser((u) => {
    if (!u) {
      if (S.step !== 'intro') { S.step = 'intro'; }
      render();
      return;
    }
    if (S.wantStart) {
      S.wantStart = false;
      const prog = loadProgress();
      if (prog && Object.keys(prog.answers || {}).length) { S.step = 'intro'; render(); }
      else begin(true);
      return;
    }
    if (S.step === 'intro') render();
  });
}
