// AZIT : Star&Moon — 검사 진행 엔진
// 검사 정의(def)만 바꾸면 어떤 검사든 같은 흐름으로 진행된다.
// 흐름: 소개 → 검사자 이름·동의 → [부 소개 → 문항들] × 부 → 저장 → '검사 결과가 전송되었습니다'
import { ready, onUser, currentUser, saveResult, saveDraft, listDrafts, deleteDraft, draftSavedAt } from './backend.js';
import { esc, toast, googleButton, brandHTML, login, fmtDate, modal } from './ui.js';
import { constellation, starGlyph } from './charts.js';
import { codeOf, bundleOf, getTestMeta } from './registry.js';
import { parseBirth, fmtBirth, longBirth } from './examinee.js';
import { sameName, samePerson, startOf, draftIdOf, findFinished } from './drafts.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 고민별 묶음의 진행: 이 탭 안(sessionStorage)에만 두고, 12시간이 지나면 잊는다. 주소에는 이름을 넣지 않는다
const BUNDLE_KEY = 'azit:bundle';
const readBundle = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(BUNDLE_KEY) || 'null');
    return v && Date.now() - (v.at || 0) < 12 * 3600e3 ? v : null;
  } catch (e) { return null; }
};
const writeBundle = (v) => { try { sessionStorage.setItem(BUNDLE_KEY, JSON.stringify(v)); } catch (e) { /* 저장소를 못 쓰면 이름만 다시 적으면 된다 */ } };
const clearBundle = () => { try { sessionStorage.removeItem(BUNDLE_KEY); } catch (e) { /* 저장소를 못 쓰는 환경 */ } };
const testTitle = (id) => (getTestMeta(id) || { title: id }).title;

export async function runTest(def, mount, opts = {}) {
  const S = {
    step: 'intro',
    pi: 0,
    ii: 0,
    items: [],
    answers: {},
    name: '',
    birth: '', // 'YYYY-MM-DD' (이름이 같은 검사자를 구분하는 데만 쓴다)
    birthText: '',
    startedAt: 0,
    busy: false,
    sid: '',
    wantStart: false,
    rankTemp: [],
    consent: false,
  };
  const totalCount = def.parts.reduce((s, p) => s + p.count, 0);
  // 링크로 받은 검사(내담자 혼자): 로그인·잠금 없이 하고, 진행은 이 기기에만 두며, 끝나면 결과 대신 답을 낸다
  //   opts.link = { token, invite, tests: [검사 차례], done: Set(낸 검사), submit(검사, 답), submittedAt(검사), markDone(검사) }
  const L = opts.link || null;
  const homeHref = L ? `take.html?k=${encodeURIComponent(L.token)}` : 'index.html';
  const homeLabel = L ? '목록으로' : '처음으로';

  mount.innerHTML = `<div class="runner-page">
    <div class="runner-top"><div class="wrap runner-top-inner">
      <a class="brand" href="${homeHref}" aria-label="${homeLabel}" data-leave>${brandHTML()}</a>
      <span class="runner-title">${esc(def.title)}</span>
      <a class="btn btn--text runner-exit" href="${homeHref}" data-leave data-exit>${homeLabel}</a>
    </div><div class="progress" aria-hidden="true"><i data-progress></i></div></div>
    <main class="runner-main" id="main"><div class="stage" data-stage></div></main>
  </div>`;
  const stage = mount.querySelector('[data-stage]');
  const bar = mount.querySelector('[data-progress]');
  const exitEl = mount.querySelector('[data-exit]');

  // ── 진행 저장 ─────────────────────────────────
  // 답할 때마다 두 곳에 저장한다.
  //  1) 이 기기: azit:progress:<검사>:<버전>:<계정>:<세션>  (예전 한 칸짜리 저장도 읽는다)
  //  2) 상담사 계정: drafts/<계정>/<검사>-<버전>-<세션>  → 다른 기기에서도 이어 할 수 있다.
  //     데이터베이스 규칙에 drafts가 아직 없으면 조용히 1)만 쓴다.
  const KEEP_DAYS = 30;
  const base = () => {
    if (L) return `azit:link:${L.token}:${def.id}:${def.version}`; // 링크: 받은 분 한 사람의 진행만 둔다
    const u = currentUser();
    return u ? `azit:progress:${def.id}:${def.version}:${u.uid}` : null;
  };
  const keyFor = (sid) => { const b = base(); return b ? (sid ? `${b}:${sid}` : b) : null; };
  const newSid = () => (L ? 'L' : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
  const draftId = (sid) => `${def.id}-${def.version}-${sid}`;
  const alive = (v) => !!(v && v.answers) && Date.now() - (v.savedAt || 0) <= KEEP_DAYS * 864e5;
  const readLocal = (sid) => { const k = keyFor(sid); if (!k) return null; try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const writeLocal = (sid, v) => { const k = keyFor(sid); if (!k) return false; try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const dropLocal = (sid) => { const k = keyFor(sid); if (!k) return; try { localStorage.removeItem(k); } catch (e) { /* 저장소를 못 쓰는 환경 */ } };
  const doneCount = (v) => Object.keys((v && v.answers) || {}).length;
  const two = (n) => String(n).padStart(2, '0');
  const hhmm = (ts) => { const d = new Date(ts || Date.now()); return `${two(d.getHours())}:${two(d.getMinutes())}`; };
  const when = (ts) => { const d = new Date(ts || Date.now()); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${hhmm(ts)}`; };
  const within = (p, ms, fallback) => Promise.race([p.catch(() => fallback), delay(ms).then(() => fallback)]);
  // 고민별 묶음으로 왔으면(b=<묶음>) 끝 화면에서 묶음의 다음 검사로 잇는다
  const bundle = (() => { const b = bundleOf(opts.bundle); return b && b.tests.includes(def.id) ? b : null; })();
  const bundleState = () => { const v = bundle && readBundle(); return v && v.b === bundle.id ? v : null; };

  const remote = new Map(); // sid → 계정에 저장된 진행
  let cloud = 'checking';   // 'checking' | 'on' | 'off'
  const gone = new Set();   // 지운 세션: 늦게 끝난 저장이 되살리지 않게

  const localSessions = () => {
    const b = base();
    if (!b) return [];
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k !== b && !k.startsWith(`${b}:`)) continue;
        const v = JSON.parse(localStorage.getItem(k) || 'null');
        if (!v || !v.answers) continue;
        if (!alive(v)) { localStorage.removeItem(k); i--; continue; }
        out.push({ ...v, sid: k === b ? '' : k.slice(b.length + 1) });
      }
    } catch (e) { /* 저장소를 못 읽는 환경 */ }
    return out;
  };
  const listSessions = () => {
    const m = new Map(localSessions().map((v) => [v.sid, v]));
    remote.forEach((v, sid) => { const cur = m.get(sid); if (!cur || (v.savedAt || 0) > (cur.savedAt || 0)) m.set(sid, v); });
    return [...m.values()].filter((v) => alive(v) && !gone.has(v.sid)).sort((a, b2) => (b2.savedAt || 0) - (a.savedAt || 0));
  };
  const loadSession = (sid) => {
    if (gone.has(sid)) return null;
    const l = readLocal(sid);
    const r = remote.get(sid);
    return r && (!l || (r.savedAt || 0) > (l.savedAt || 0)) ? r : l;
  };

  // 계정에 저장된 진행을 읽어 온다. 다른 기기에서 끝냈거나 지운 검사는 이 기기에서도 정리한다.
  async function syncRemote() {
    if (L) { cloud = 'off'; return; } // 링크: 계정 없이 이 기기에만 둔다
    try {
      const all = await Promise.race([listDrafts(), delay(6000).then(() => { throw new Error('timeout'); })]);
      remote.clear();
      all.forEach((d) => {
        if (d.testId !== def.id || d.version !== def.version || !d.sid) return;
        if (!alive(d)) { deleteDraft(draftId(d.sid)).catch(() => {}); return; }
        remote.set(d.sid, d);
      });
      localSessions().forEach((v) => { if (v.sid && v.syncedAt && !remote.has(v.sid) && v.sid !== S.sid) dropLocal(v.sid); });
      cloud = 'on';
    } catch (e) {
      cloud = 'off';
    }
    // 같은 검사자가 이 검사를 그 진행을 시작한 뒤에 끝냈으면(다른 창·기기에서 처음부터 다시 해서 끝냈거나
    // 끝낸 진행을 예전 창이 다시 저장한 경우) 남은 진행을 정리한다. 결과를 못 읽으면 다음에 정리한다.
    try {
      const list = listSessions().filter((v) => v.sid && v.sid !== S.sid).map((v) => ({ ...v, testId: def.id, version: def.version }));
      const done = await findFinished(list, { timeout: 5000 });
      list.forEach((v) => { if (done.has(draftIdOf(v))) clearProgress(v.sid); });
    } catch (e) { /* 다음에 다시 */ }
  }
  let syncing = Promise.resolve();

  let pushTimer = 0;
  const snapshot = () => ({
    sid: S.sid, testId: def.id, version: def.version, title: def.title, total: totalCount,
    answers: S.answers, pi: S.pi, ii: S.ii, name: S.name, birth: S.birth || '', startedAt: S.startedAt, savedAt: Date.now(),
  });
  // 답하지 않은 세션(이름만 넣은 상태)은 저장하지 않는다
  const persist = () => {
    if (!S.sid || !doneCount(S)) return;
    const prev = readLocal(S.sid);
    const v = snapshot();
    if (prev && prev.syncedAt) v.syncedAt = prev.syncedAt;
    S.localOK = writeLocal(S.sid, v);
    S.savedAt = v.savedAt;
    updateChip();
    if (L) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushRemote, 1200);
  };
  let pushing = Promise.resolve(); // 계정에 올리는 중인 저장 (지울 때는 이것이 끝난 뒤에 지운다)
  async function pushRemote() {
    clearTimeout(pushTimer);
    pushTimer = 0;
    const sid = S.sid;
    if (!sid || gone.has(sid) || !doneCount(S)) return;
    // 창을 비웠다가 돌아온 뒤 첫 저장: 그사이 다른 곳에서 끝냈거나 지운 진행이면 되살리지 않는다
    if (S.stale && S.synced && (await checkStale())) return;
    if (gone.has(sid) || S.sid !== sid) return;
    const v = snapshot();
    const job = (async () => {
      try {
        await saveDraft(draftId(sid), v);
        if (gone.has(sid)) return;
        remote.set(sid, v);
        if (S.sid === sid) S.synced = true;
        cloud = 'on';
        const l = readLocal(sid);
        if (l && (l.savedAt || 0) <= v.savedAt) writeLocal(sid, { ...l, syncedAt: Date.now() });
      } catch (e) {
        cloud = 'off';
      }
    })();
    pushing = job;
    await job;
    updateChip();
  }
  const flush = () => (pushTimer ? pushRemote() : Promise.resolve());
  const clearProgress = (sid = S.sid) => {
    gone.add(sid);
    if (sid === S.sid) { clearTimeout(pushTimer); pushTimer = 0; }
    dropLocal(sid);
    remote.delete(sid);
    if (sid && !L) pushing.then(() => deleteDraft(draftId(sid))).catch(() => {});
  };

  // ── 예전 창 지키기 ─────────────────────────────
  // 다른 창이나 기기에서 이 진행을 끝냈거나 지운 뒤에, 열어 둔 예전 창이 그 진행을 이어 가거나 다시 저장하지 않게 한다.
  // 창을 비웠다가 돌아오면(다른 탭·앱·창에 다녀옴, 뒤로 가기로 다시 열림) 한 번 확인한다. 연결이 없으면 그대로 이어 간다.
  let staleCheck = null;
  async function sessionEnded(sid) {
    const v = { ...snapshot(), sid };
    const [missing, finished] = await Promise.all([
      S.synced ? within(draftSavedAt(draftId(sid)).then((t) => t === null), 5000, false) : false,
      within(findFinished([v], { timeout: 5000 }).then((set) => set.size > 0), 6000, false),
    ]);
    return missing || finished;
  }
  function checkStale() {
    if (L || !inSession()) return Promise.resolve(false);
    if (staleCheck) return staleCheck;
    const sid = S.sid;
    staleCheck = sessionEnded(sid).then((ended) => {
      staleCheck = null;
      if (S.sid !== sid) return true;
      if (ended) { endHere(); return true; }
      S.stale = false;
      return false;
    });
    return staleCheck;
  }
  function endHere() {
    const who = S.name;
    clearProgress(S.sid); // 예전 창이 다시 만든 사본이 있으면 그것도 지운다
    Object.assign(S, { sid: '', synced: false, stale: false, savedAt: 0, answers: {}, name: '', birth: '', birthText: '', consent: false, startedAt: 0, pi: 0, ii: 0, items: [], rankTemp: [], step: 'intro' });
    render();
    toast(`${who ? `${who} 님의 ` : ''}이 검사는 다른 창이나 기기에서 이미 끝났거나 지워졌어요.`, 5600);
  }

  // 검사를 끝냈을 때: 같은 검사자가 이 검사를 하다 멈춘 다른 진행도 이제 필요 없다.
  // (다른 창·기기에서 시작했다가 처음부터 다시 해서 끝낸 경우. 계정에 있는 것은 다시 읽어서 지운다)
  function dropOthers(rec) {
    if (L) return;
    const now = Date.now();
    listSessions().forEach((v) => { if (v.sid && samePerson(v, rec) && startOf(v) < now) clearProgress(v.sid); });
    within(listDrafts(), 6000, []).then((all) => all.forEach((d) => {
      if (d.testId !== def.id || !d.sid || gone.has(d.sid) || !samePerson(d, rec) || startOf(d) >= now) return;
      if (d.version === def.version) clearProgress(d.sid);
      else deleteDraft(draftIdOf(d)).catch(() => {});
    }));
  }

  // 검사 중 화면의 '저장됨' 표시
  const CHECK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function chipInner() {
    if (!doneCount(S) || !S.savedAt) return '<span class="dot" aria-hidden="true"></span><span>자동 저장</span>';
    if (S.localOK === false && cloud !== 'on') return '<span>저장 안 됨</span>';
    return `${CHECK}<span>저장됨</span><span class="t">${hhmm(S.savedAt)}</span>`;
  }
  const chipState = () => (!doneCount(S) || !S.savedAt ? 'idle' : S.localOK === false && cloud !== 'on' ? 'fail' : 'saved');
  const chipHTML = () => `<button type="button" class="save-chip" data-act="save-info" data-save-chip data-state="${chipState()}">${chipInner()}</button>`;
  function updateChip() {
    const el = stage.querySelector('[data-save-chip]');
    if (!el) return;
    el.dataset.state = chipState();
    el.innerHTML = chipInner();
  }
  function saveInfo() {
    if (chipState() === 'fail') return toast('이 브라우저에서는 저장이 막혀 있어요. 이번 검사는 끝까지 마쳐 주세요.', 5200);
    if (L) return toast('답할 때마다 이 기기에 저장돼요. 나갔다가 이 링크를 다시 열면 이 자리부터 이어져요.', 5200);
    const where = cloud === 'on' ? '상담사님 계정에 저장돼요. 다른 기기에서도' : '이 기기에 저장돼요. 나갔다 와도';
    toast(`답할 때마다 ${where} 첫 화면 '이어서 할 검사'에서 이 자리부터 이어져요.`, 5200);
  }

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
    const pct = S.step === 'intro' || S.step === 'profile' ? 0 : S.step === 'working' || S.step === 'done' ? 100 : (position() / totalCount) * 100;
    bar.style.width = `${pct.toFixed(1)}%`;
  };
  const focusStage = () => {
    const h = stage.querySelector('[data-focus]');
    window.scrollTo({ top: 0 });
    if (h) h.focus({ preventScroll: true });
  };

  // ── 화면들 ───────────────────────────────────
  function resumeBox(sessions) {
    const note = cloud === 'on'
      ? '답할 때마다 상담사님 계정에 저장돼서, 다른 기기에서도 멈춘 곳부터 이어져요.'
      : cloud === 'off' ? '답할 때마다 이 기기에 저장돼요.' : '답할 때마다 자동으로 저장돼요.';
    return `<div class="resume-box" role="region" aria-labelledby="resume-h">
      <div class="resume-head"><h2 id="resume-h">이어서 할 검사</h2><span class="resume-count">${sessions.length}명</span></div>
      <ul class="resume-rows">${sessions.slice(0, 8).map((v) => {
        const n = doneCount(v);
        const total = v.total || totalCount;
        const pct = Math.min(100, Math.round((n / total) * 100));
        const who = esc(v.name || '이름 없음');
        const born = v.birth ? `<span class="born">${esc(fmtBirth(v.birth))}</span>` : '';
        return `<li>
          <button type="button" class="resume-row" data-act="resume" data-sid="${esc(v.sid)}" aria-label="${who} 님, ${total}문항 중 ${n}문항까지 답함. 이어서 하기">
            <span class="who"><strong>${who} 님${born}</strong><span class="when">${esc(when(v.savedAt))}에 멈춤</span></span>
            <span class="go">이어서 하기</span>
            <span class="bar"><span class="meter" aria-hidden="true"><span style="width:${pct}%"></span></span><span class="cnt">${n}/${total}</span></span>
          </button>
          <button type="button" class="resume-drop" data-act="drop" data-sid="${esc(v.sid)}" aria-label="${who} 님 진행 기록 지우기">지우기</button>
        </li>`;
      }).join('')}</ul>
      <p class="resume-note">${note} ${KEEP_DAYS}일 동안 보관해요.</p>
    </div>`;
  }

  const stripHTML = (label, tests, isDone) => `<div class="bd-strip">
      <p class="bd-strip-k">${esc(label)}</p>
      <ol>${tests.map((id, i) => {
        const now = id === def.id;
        const ok = !now && isDone(id);
        return `<li class="${now ? 'is-now' : ok ? 'is-done' : ''}"${now ? ' aria-current="step"' : ''}><span class="n" aria-hidden="true">${ok ? '✓' : i + 1}</span>${esc(testTitle(id).replace(/ 검사$/, ''))}${ok ? '<span class="sr-only"> (마침)</span>' : ''}</li>`;
      }).join('')}</ol>
    </div>`;
  function bundleStrip() {
    if (L) return L.tests.length > 1 ? stripHTML(`${L.invite.ownerName} 상담사님이 보낸 검사`, L.tests, (id) => L.done.has(id)) : '';
    if (!bundle) return '';
    const done = (bundleState() || {}).done || [];
    return stripHTML(`${bundle.name} 묶음`, bundle.tests, (id) => done.includes(id));
  }

  // 링크로 받은 검사의 소개: 받은 분 한 사람의 진행만 있으니 '이어서 하기'와 '처음부터 다시'만 둔다
  function renderLinkIntro() {
    const cur = listSessions().find((v) => doneCount(v) > 0);
    const intro = def.intro;
    const actions = cur
      ? `<button type="button" class="btn btn--block" data-act="resume" data-sid="${esc(cur.sid)}">이어서 하기 (${doneCount(cur)}/${cur.total || totalCount})</button>
        <button type="button" class="btn btn--ghost btn--block" data-act="restart-link">처음부터 다시 하기</button>`
      : '<button type="button" class="btn btn--block" data-act="start">검사 시작하기</button>';
    stage.innerHTML = `<section class="intro-card" aria-labelledby="intro-title">
      <p class="intro-kicker">${codeOf(def.id) ? `<span class="intro-code">${esc(codeOf(def.id))}</span>` : ''}${esc(intro.kicker)}</p>
      <h1 class="intro-title" id="intro-title" tabindex="-1" data-focus>${esc(def.title)}</h1>
      ${bundleStrip()}
      ${cur ? `<p class="link-resume">${esc(when(cur.savedAt))}에 ${doneCount(cur)}문항까지 답했어요. 이어서 하면 그 자리부터 시작해요.</p>` : ''}
      <p class="intro-lead">${esc(intro.lead)}</p>
      <dl class="intro-facts">${intro.facts.map((f) => `<div><dt>${esc(f.dt)}</dt><dd>${esc(f.dd)}</dd></div>`).join('')}</dl>
      <ol class="parts-list">${(intro.overview || def.parts).map((p) => `<li><div><strong>${esc(p.title)} <span class="tag">${p.count}문항</span></strong><span>${esc(p.summary)}</span></div></li>`).join('')}</ol>
      <div class="intro-actions">${actions}</div>
    </section>`;
  }

  function renderIntro() {
    if (L) return renderLinkIntro();
    const u = currentUser();
    const sessions = u ? listSessions().filter((v) => doneCount(v) > 0) : [];
    const intro = def.intro;
    const actions = !u
      ? `<a class="btn btn--block" href="login.html">로그인하러 가기</a>`
      : `<button type="button" class="btn btn--block" data-act="start">${sessions.length ? '새 검사자로 시작하기' : '검사 시작하기'}</button>`;
    stage.innerHTML = `<section class="intro-card" aria-labelledby="intro-title">
      <p class="intro-kicker">${codeOf(def.id) ? `<span class="intro-code">${esc(codeOf(def.id))}</span>` : ''}${esc(intro.kicker)}</p>
      <h1 class="intro-title" id="intro-title" tabindex="-1" data-focus>${esc(def.title)}</h1>
      ${bundleStrip()}
      ${sessions.length ? resumeBox(sessions) : ''}
      <p class="intro-lead">${esc(intro.lead)}</p>
      <dl class="intro-facts">${intro.facts.map((f) => `<div><dt>${esc(f.dt)}</dt><dd>${esc(f.dd)}</dd></div>`).join('')}</dl>
      <ol class="parts-list">${(intro.overview || def.parts).map((p) => `<li><div><strong>${esc(p.title)} <span class="tag">${p.count}문항</span></strong><span>${esc(p.summary)}</span></div></li>`).join('')}</ol>
      <div class="gets"><h3>결과지에 담기는 것</h3><ul>${intro.gets.map((g) => `<li class="tag">${esc(g)}</li>`).join('')}</ul></div>
      <div class="intro-actions">${actions}</div>
    </section>`;
  }

  function renderLinkProfile() {
    const inv = L.invite;
    const birthText = S.birthText || fmtBirth(S.birth);
    stage.innerHTML = `<section class="intro-card" aria-labelledby="pf-title">
      <p class="intro-kicker">${esc(def.title)}</p>
      <h1 class="intro-title" id="pf-title" tabindex="-1" data-focus>시작하기 전에 확인해 주세요</h1>
      <dl class="link-who"><div><dt>검사하는 분</dt><dd>${esc(inv.name)} 님</dd></div><div><dt>보낸 상담사</dt><dd>${esc(inv.ownerName)}</dd></div></dl>
      ${inv.needBirth ? `<div class="field">
        <label for="pf-birth">생년월일</label>
        <input class="input" id="pf-birth" inputmode="numeric" maxlength="10" autocomplete="off" value="${esc(birthText)}" placeholder="예: 19950312" aria-describedby="pf-birth-hint" required>
        <p class="field-hint field-hint--quiet" id="pf-birth-hint" data-birth-hint aria-live="polite">이름이 같은 분과 구분하는 데만 써요.</p>
      </div>` : ''}
      <label class="consent">
        <input type="checkbox" id="pf-consent" ${S.consent ? 'checked' : ''}>
        <div><strong>답을 보내는 데 동의해요</strong>
        <span>이름${inv.needBirth ? '과 생년월일' : ''}, 응답은 ${esc(inv.ownerName)} 상담사님에게 전송되고, AZIT 관리자도 볼 수 있어요. 결과는 상담사님을 통해 안내받아요.</span></div>
      </label>
      <div class="intro-actions">
        <button type="button" class="btn btn--block" data-act="begin" disabled>시작하기</button>
        <button type="button" class="btn btn--text" data-act="to-intro">뒤로</button>
      </div>
    </section>`;
    const birthEl = stage.querySelector('#pf-birth');
    const birthHint = stage.querySelector('[data-birth-hint]');
    const consentEl = stage.querySelector('#pf-consent');
    const beginEl = stage.querySelector('[data-act="begin"]');
    const sync = () => {
      S.name = inv.name;
      if (birthEl) {
        S.birthText = birthEl.value;
        S.birth = parseBirth(birthEl.value);
        const typed = birthEl.value.replace(/\D/g, '');
        birthHint.textContent = S.birth ? longBirth(S.birth) : typed.length >= 6 ? '날짜를 다시 확인해 주세요. 8자리(19950312)나 6자리(950312)로 적어요.' : '이름이 같은 분과 구분하는 데만 써요.';
        birthHint.classList.toggle('is-error', !S.birth && typed.length >= 6);
      } else S.birth = '';
      S.consent = consentEl.checked;
      beginEl.disabled = !(S.consent && (!birthEl || S.birth));
    };
    if (birthEl) birthEl.addEventListener('input', sync);
    consentEl.addEventListener('change', sync);
    sync();
  }

  function renderProfile() {
    const name = S.name || '';
    const birthText = S.birthText || fmtBirth(S.birth);
    const carriedNow = () => !!S.carried && sameName(S.name, S.carried.name) && (S.birth || '') === (S.carried.birth || '');
    stage.innerHTML = `<section class="intro-card" aria-labelledby="pf-title">
      <p class="intro-kicker">${esc(def.title)}</p>
      <h1 class="intro-title" id="pf-title" tabindex="-1" data-focus>검사자 이름과 생년월일을 적어 주세요</h1>
      <p class="intro-lead">결과지 맨 앞에 이 이름이 들어가요. 한 계정으로 여러 분을 검사할 수 있도록, 검사할 때마다 새로 적어요. 생년월일은 이름이 같은 분을 구분하는 데만 쓰고, 결과지와 공유 링크에는 나오지 않아요.</p>
      <div class="field">
        <label for="pf-name">검사자 이름</label>
        <input class="input" id="pf-name" maxlength="20" autocomplete="off" value="${esc(name)}" placeholder="예: 홍길동" required>
      </div>
      <div class="field">
        <label for="pf-birth">생년월일</label>
        <input class="input" id="pf-birth" inputmode="numeric" maxlength="10" autocomplete="off" value="${esc(birthText)}" placeholder="예: 19950312" aria-describedby="pf-birth-hint" required>
        <p class="field-hint field-hint--quiet" id="pf-birth-hint" data-birth-hint aria-live="polite"></p>
        ${S.carried ? `<p class="field-hint" data-carried ${carriedNow() ? '' : 'hidden'}>묶음의 앞 검사에서 적은 이름과 생년월일이에요. 다른 분이면 고쳐 주세요.</p>` : ''}
      </div>
      <label class="consent">
        <input type="checkbox" id="pf-consent" ${S.consent ? 'checked' : ''}>
        <div><strong>결과 전송에 동의해요</strong>
        <span>이름과 생년월일, 응답과 결과는 검사를 진행하는 상담사${opts.ownerName ? `(${esc(opts.ownerName)})` : ''}에게 전송되고, AZIT 관리자도 볼 수 있어요. 결과는 상담사를 통해 안내받아요.</span></div>
      </label>
      <div class="intro-actions">
        <button type="button" class="btn btn--block" data-act="begin" ${S.consent && name && S.birth ? '' : 'disabled'}>시작하기</button>
        <button type="button" class="btn btn--text" data-act="to-intro">뒤로</button>
      </div>
    </section>`;
    const nameEl = stage.querySelector('#pf-name');
    const birthEl = stage.querySelector('#pf-birth');
    const birthHint = stage.querySelector('[data-birth-hint]');
    const consentEl = stage.querySelector('#pf-consent');
    const beginEl = stage.querySelector('[data-act="begin"]');
    const hint = stage.querySelector('[data-carried]');
    const sync = () => {
      S.name = nameEl.value.trim();
      S.birthText = birthEl.value;
      S.birth = parseBirth(birthEl.value);
      S.consent = consentEl.checked;
      beginEl.disabled = !(S.name && S.birth && S.consent);
      const typed = birthEl.value.replace(/\D/g, '');
      birthHint.textContent = S.birth ? longBirth(S.birth) : typed.length >= 6 ? '날짜를 다시 확인해 주세요. 8자리(19950312)나 6자리(950312)로 적어요.' : '';
      birthHint.classList.toggle('is-error', !S.birth && typed.length >= 6);
      if (hint) hint.hidden = !carriedNow();
    };
    nameEl.addEventListener('input', sync);
    birthEl.addEventListener('input', sync);
    consentEl.addEventListener('change', sync);
    sync();
  }

  const isSkipped = (pi) => def.parts[pi].skippable && itemsFor(pi).every((it) => S.answers[it.id] === null);

  function renderPartIntro() {
    const p = def.parts[S.pi];
    stage.innerHTML = `<section class="part-intro" aria-labelledby="pi-title">
      <div class="part-meta"><button type="button" class="back-btn" data-act="back" ${S.pi === 0 ? 'hidden' : ''}>← 이전</button><span class="meta-right">${doneCount(S) ? chipHTML() : ''}</span></div>
      <span class="part-no">${esc(p.label || `${S.pi + 1}부 / ${def.parts.length}부`)}</span>
      <h1 id="pi-title" tabindex="-1" data-focus>${esc(p.title)}</h1>
      <p>${esc(p.desc)}</p>
      <div class="how">${p.how}</div>
      ${isSkipped(S.pi) ? '<p class="skip-note">지금은 건너뛴 상태예요. 답하려면 아래 버튼을 눌러 주세요.</p>' : ''}
      <button type="button" class="btn btn--block" data-act="enter">${esc(p.enterLabel || (S.pi === 0 ? '첫 문항 보기' : '이어서 하기'))}</button>
      ${p.skippable ? `<button type="button" class="btn btn--ghost btn--block" data-act="skip-part">${esc(p.skipLabel || '이 부분은 건너뛸게요')}</button>` : ''}
    </section>`;
  }

  // 건너뛸 수 있는 부: 문항 답을 null로 두면 저장할 때 '답하지 않음'과 구분된다
  function skipPart() {
    itemsFor(S.pi).forEach((it) => { S.answers[it.id] = null; });
    if (!S.startedAt) S.startedAt = Date.now();
    if (S.pi < def.parts.length - 1) {
      S.pi++;
      S.ii = 0;
      S.step = 'part';
      persist();
      render();
    } else {
      persist();
      finish();
    }
  }

  function metaRow() {
    const p = def.parts[S.pi];
    return `<div class="part-meta"><button type="button" class="back-btn" data-act="back">← 이전</button>
      <span class="meta-right">${chipHTML()}<span class="where">${esc(p.short)} <span class="count">${S.ii + 1}/${S.items.length}</span></span></span></div>`;
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

  // 두 문장 비교: A와 B를 먼저 읽고, 아래 네 칸(A가 훨씬 더 ~ B가 훨씬 더) 가운데 하나를 고른다
  function renderPair(it) {
    const v = S.answers[it.id];
    const picked = typeof v === 'number' ? (v > 0 ? it.lo : it.hi) : null;
    const side = picked == null ? null : picked === it.a.type ? 'a' : 'b';
    const strength = typeof v === 'number' ? Math.abs(v) : 0;
    const opts = [
      { side: 'a', s: 2, label: 'A가 훨씬 더' },
      { side: 'a', s: 1, label: 'A가 조금 더' },
      { side: 'b', s: 1, label: 'B가 조금 더' },
      { side: 'b', s: 2, label: 'B가 훨씬 더' },
    ];
    stage.innerHTML = `${metaRow()}
      <h1 class="pair-prompt" tabindex="-1" data-focus id="pp-${esc(it.id)}">${esc(it.prompt)}</h1>
      <p class="pair-help">두 문장을 읽고 아래에서 골라 주세요. 둘 다 맞거나 둘 다 아니어도, 굳이 고른다면 어느 쪽인지요.</p>
      <div class="pair-stmts">
        <div class="pair-stmt" data-side="a" data-chosen="${side === 'a'}"><span class="pair-badge" aria-hidden="true">A</span><p><span class="sr-only">A. </span>${esc(it.a.text)}</p></div>
        <div class="pair-stmt" data-side="b" data-chosen="${side === 'b'}"><span class="pair-badge" aria-hidden="true">B</span><p><span class="sr-only">B. </span>${esc(it.b.text)}</p></div>
      </div>
      <div class="pair-scale" role="radiogroup" aria-labelledby="pp-${esc(it.id)}">${opts
        .map((o, i) => `<button type="button" role="radio" class="pair-opt pair-opt--${o.side} pair-opt--s${o.s}" data-pair="${o.side === 'a' ? it.a.type : it.b.type}" data-s="${o.s}" aria-checked="${side === o.side && strength === o.s}">
          <span class="dot" aria-hidden="true"></span><span class="lb">${o.label}</span><span class="key" aria-hidden="true">${i + 1}</span></button>`)
        .join('')}</div>`;
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

  // 글로 답하기: 질문을 읽고 몇 줄 적는다. 적는 동안에도 저장해 두고, 쓰기 어려우면 건너뛸 수 있다
  let typeTimer = 0;
  function renderText(it, p) {
    const cur = typeof S.answers[it.id] === 'string' ? S.answers[it.id] : '';
    const max = it.max || p.max || 800;
    stage.innerHTML = `${metaRow()}
      <h1 class="q-text q-text--write" tabindex="-1" data-focus id="q-${esc(it.id)}">${esc(it.prompt)}</h1>
      ${it.help ? `<p class="write-help" id="wh-${esc(it.id)}">${esc(it.help)}</p>` : ''}
      <div class="write">
        <textarea class="write-input" id="wa-${esc(it.id)}" rows="${it.rows || 6}" maxlength="${max}" aria-labelledby="q-${esc(it.id)}"${it.help ? ` aria-describedby="wh-${esc(it.id)}"` : ''} placeholder="${esc(it.placeholder || '떠오르는 대로 편하게 적어 주세요.')}">${esc(cur)}</textarea>
        <div class="write-foot">
          <span class="write-count"><span data-count>${cur.length}</span>/${max}자</span>
          <span class="write-acts">${it.required ? '' : '<button type="button" class="btn btn--ghost btn--small" data-act="text-skip">건너뛰기</button>'}<button type="button" class="btn btn--small" data-act="text-next">다음</button></span>
        </div>
      </div>`;
    const ta = stage.querySelector('.write-input');
    const cnt = stage.querySelector('[data-count]');
    ta.addEventListener('input', () => {
      cnt.textContent = String(ta.value.length);
      S.answers[it.id] = ta.value;
      clearTimeout(typeTimer);
      typeTimer = setTimeout(persist, 600);
    });
  }

  function renderItem() {
    const p = def.parts[S.pi];
    const it = S.items[S.ii];
    if (!it) return;
    if (p.kind === 'likert') renderLikert(it, p);
    else if (p.kind === 'pair') renderPair(it);
    else if (p.kind === 'rank') renderRank(it);
    else if (p.kind === 'text') renderText(it, p);
  }

  function renderWorking(msg = '응답을 분석해서 결과지를 만들고 있어요') {
    const demo = {};
    for (let t = 1; t <= 9; t++) demo[t] = 40 + ((t * 37) % 50);
    stage.innerHTML = `<section class="working" aria-live="polite">
      <div class="working-figure sky">${constellation(demo, { size: 240, animate: true, labels: false })}</div>
      <p tabindex="-1" data-focus>${esc(msg)}</p>
    </section>`;
  }

  function renderDone() {
    // 묶음으로 왔으면: 마친 검사 수와 다음 검사(지금 검사 뒤에 남은 것부터, 없으면 앞에 남은 것)
    const bd = bundle && S.bundleDone ? (() => {
      const done = S.bundleDone;
      const left = bundle.tests.filter((id) => !done.includes(id));
      const at = bundle.tests.indexOf(def.id);
      return { done, next: left.find((id) => bundle.tests.indexOf(id) > at) || left[0] || '' };
    })() : null;
    stage.innerHTML = `<section class="done" aria-live="polite">
      <div class="done-mark" aria-hidden="true">${starGlyph('#4b5bdb')}</div>
      <h1 tabindex="-1" data-focus>검사 결과가 전송되었습니다</h1>
      <p>${esc(S.doneName || '')} 님, 끝까지 답해 주셔서 고마워요. 결과는 상담사님을 통해 안내받을 수 있어요.</p>
      <dl class="done-receipt">
        <div><dt>검사</dt><dd>${esc(def.title)}</dd></div>
        ${opts.ownerName ? `<div><dt>받는 상담사</dt><dd>${esc(opts.ownerName)}</dd></div>` : ''}
        <div><dt>전송 시각</dt><dd>${esc(fmtDate(S.doneAt || Date.now(), true))}</dd></div>
      </dl>
      ${bd ? `<div class="bd-done">
        <p class="bd-done-k">${esc(bundle.name)} 묶음 <span>${bd.done.length}/${bundle.tests.length}</span></p>
        <p>${bd.next ? `다음은 <strong>${esc(testTitle(bd.next))}</strong>예요. 이어서 하면 검사자 이름이 미리 채워져 있어요.` : '묶음의 검사를 모두 마쳤어요. 고마워요.'}</p>
      </div>` : ''}
      <div class="done-actions">
        ${bd && bd.next
          ? `<a class="btn btn--block" href="test.html?t=${esc(bd.next)}&amp;b=${esc(bundle.id)}">이어서 ${esc(testTitle(bd.next))} 하기</a>`
          : '<button type="button" class="btn btn--block" data-act="again">다음 검사 시작하기</button>'}
        <a class="btn btn--ghost btn--block" href="index.html">처음으로</a>
      </div>
    </section>`;
  }

  function renderLinkDone() {
    const left = L.tests.filter((id) => !L.done.has(id));
    const at = L.tests.indexOf(def.id);
    const next = left.find((id) => L.tests.indexOf(id) > at) || left[0] || '';
    stage.innerHTML = `<section class="done" aria-live="polite">
      <div class="done-mark" aria-hidden="true">${starGlyph('#4b5bdb')}</div>
      <h1 tabindex="-1" data-focus>답을 보냈어요</h1>
      <p>${esc(S.doneName || '')} 님, 끝까지 답해 주셔서 고마워요. 결과는 ${esc(L.invite.ownerName)} 상담사님이 안내해 드려요.</p>
      <dl class="done-receipt">
        <div><dt>검사</dt><dd>${esc(def.title)}</dd></div>
        <div><dt>받는 상담사</dt><dd>${esc(L.invite.ownerName)}</dd></div>
        <div><dt>보낸 시각</dt><dd>${esc(fmtDate(S.doneAt || Date.now(), true))}</dd></div>
      </dl>
      ${L.tests.length > 1 ? `<div class="bd-done">
        <p class="bd-done-k">받은 검사 <span>${L.tests.length - left.length}/${L.tests.length}</span></p>
        <p>${next ? `다음은 <strong>${esc(testTitle(next))}</strong>예요.` : '보내 주신 검사를 모두 마쳤어요. 고마워요.'}</p>
      </div>` : ''}
      <div class="done-actions">
        ${next ? `<a class="btn btn--block" href="${homeHref}&amp;t=${encodeURIComponent(next)}">이어서 ${esc(testTitle(next))} 하기</a>` : ''}
        <a class="btn ${next ? 'btn--ghost ' : ''}btn--block" href="${homeHref}">${next ? '목록으로' : '처음 화면으로'}</a>
      </div>
    </section>`;
  }

  function renderSaveError() {
    stage.innerHTML = `<section class="gate" style="margin-top:0">
      <h2 tabindex="-1" data-focus>${L ? '답을 보내지 못했어요' : '결과를 저장하지 못했어요'}</h2>
      <p>${L ? '인터넷 연결을 확인한 뒤 다시 보내 주세요. 답은 이 기기에 그대로 남아 있어요. 링크의 기한이 지났다면 상담사님께 새 링크를 받아 주세요.' : '인터넷 연결을 확인한 뒤 다시 시도해 주세요. 응답은 이 기기에 그대로 남아 있어요.'}</p>
      <button type="button" class="btn btn--block" data-act="retry">${L ? '다시 보내기' : '다시 저장하기'}</button>
    </section>`;
  }

  // 검사 중에는 주소에 resume=<세션>을 달아 둔다: 새로고침해도 그 자리에서 이어진다
  const inSession = () => (S.step === 'item' || S.step === 'part') && !!S.sid && doneCount(S) > 0;
  function syncUrl() {
    try {
      const u = new URL(location.href);
      if (inSession()) u.searchParams.set('resume', S.sid);
      else u.searchParams.delete('resume');
      if (u.href !== location.href) history.replaceState(history.state, '', u.href);
    } catch (e) { /* 주소를 못 바꾸는 환경 */ }
  }
  function render() {
    exitEl.textContent = S.step === 'item' || S.step === 'part' ? '저장하고 나가기' : homeLabel;
    syncUrl();
    setBar();
    if (S.step === 'intro') renderIntro();
    else if (S.step === 'profile') (L ? renderLinkProfile : renderProfile)();
    else if (S.step === 'part') renderPartIntro();
    else if (S.step === 'item') renderItem();
    else if (S.step === 'working') renderWorking(L ? '답을 보내고 있어요' : undefined);
    else if (S.step === 'done') (L ? renderLinkDone : renderDone)();
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
      if (S.pi > 0 && isSkipped(S.pi - 1)) { S.pi--; render(); } // 건너뛴 부로 돌아가면 그 부의 소개로
      else if (S.pi > 0) enterPart(S.pi - 1, true);
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

  // 링크로 받은 검사: 채점하지 않고 답만 보낸다(채점은 링크를 만든 상담사 쪽에서). 이미 낸 검사면 낸 것으로 본다
  async function submitLink(used, durationSec) {
    const payload = { testId: def.id, version: def.version, answers: used, name: S.name, ...(S.birth ? { birth: S.birth } : {}), durationSec, submittedAt: Date.now() };
    try {
      await Promise.all([L.submit(def.id, payload), delay(1200)]);
    } catch (e) {
      const at = await within(L.submittedAt(def.id), 6000, null);
      if (!at) { console.error(e); S.step = 'error'; render(); return; }
    }
    L.done.add(def.id);
    if (L.markDone) L.markDone(def.id);
    clearProgress();
    Object.assign(S, { doneName: S.name, doneAt: Date.now(), sid: '', savedAt: 0, answers: {}, birth: '', birthText: '', consent: false, startedAt: 0, pi: 0, ii: 0, items: [], step: 'done' });
    render();
  }

  async function save() {
    const durationSec = Math.min(3 * 3600, Math.round((Date.now() - (S.startedAt || Date.now())) / 1000));
    const used = {};
    def.parts.forEach((p, pi) => itemsFor(pi).forEach((it) => { used[it.id] = S.answers[it.id]; }));
    if (L) return submitLink(used, durationSec);
    const scores = def.score(used, { durationSec });
    const record = {
      testId: def.id,
      version: def.version,
      name: S.name || '이름 없음',
      ...(S.birth ? { birth: S.birth } : {}),
      ownerName: opts.ownerName || (currentUser() && currentUser().name) || '',
      answers: used,
      scores,
      summary: def.summary(scores),
      glyph: def.glyph ? String(def.glyph(scores) || '').slice(0, 2) : '',
      durationSec,
    };
    try {
      await Promise.all([saveResult(record), delay(1500)]);
      if (bundle) {
        const prev = bundleState();
        const same = prev && sameName(prev.name, record.name) && (prev.birth || '') === (record.birth || '');
        const done = [...new Set([...(same ? prev.done || [] : []), def.id])];
        S.bundleDone = done;
        if (bundle.tests.every((id) => done.includes(id))) clearBundle();
        else writeBundle({ b: bundle.id, name: record.name, birth: record.birth || '', at: Date.now(), done });
      }
      clearProgress();
      dropOthers(record);
      S.sid = '';
      S.synced = false;
      S.stale = false;
      S.savedAt = 0;
      S.doneName = record.name;
      S.doneAt = Date.now();
      S.answers = {};
      S.name = '';
      S.birth = '';
      S.birthText = '';
      S.consent = false;
      S.startedAt = 0;
      S.pi = 0;
      S.ii = 0;
      S.items = [];
      S.step = 'done';
      render();
    } catch (e) {
      console.error(e);
      S.step = 'error';
      render();
    }
  }

  async function begin(fresh, sid = '') {
    await flush(); // 앞 검사자의 마지막 답을 먼저 올려 둔다
    if (!fresh) await syncing; // 다른 기기에서 더 진행했으면 그 기록으로 이어 간다
    const prog = fresh ? null : loadSession(sid);
    S.stale = false;
    if (prog) {
      S.synced = !!sid && (remote.has(sid) || !!(readLocal(sid) || {}).syncedAt); // 계정에 올라간 진행인지
      S.sid = sid || newSid(); // 예전 한 칸짜리 저장은 새 칸으로 옮긴다
      S.answers = prog.answers || {};
      S.name = prog.name || S.name;
      S.birth = prog.birth || S.birth || ''; // 생년월일 없이 저장된 예전 진행이면 지금 적은 생년월일을 쓴다
      S.birthText = '';
      S.startedAt = prog.startedAt || Date.now();
      S.savedAt = prog.savedAt || Date.now();
      S.localOK = true;
      S.pi = Math.min(prog.pi || 0, def.parts.length - 1);
      S.items = itemsFor(S.pi);
      S.ii = Math.min(prog.ii || 0, S.items.length - 1);
      const firstMissing = S.items.findIndex((it) => S.answers[it.id] === undefined);
      if (firstMissing >= 0 && firstMissing < S.ii) S.ii = firstMissing;
      S.step = 'item';
      if (!sid) { dropLocal(''); persist(); }
      render();
    } else {
      S.sid = newSid(); // 새 검사자: 다른 검사자의 진행은 그대로 둔다
      if (L) gone.delete(S.sid); // 링크는 세션 이름이 하나라서, '처음부터 다시'로 지운 뒤에도 같은 이름을 다시 쓴다
      S.synced = false;
      S.answers = {};
      const bs = L ? null : bundleState();
      S.carried = bs && bs.name ? { name: bs.name, birth: bs.birth || '' } : null;
      S.name = L ? L.invite.name : S.carried ? S.carried.name : '';
      S.birth = S.carried ? S.carried.birth : '';
      S.birthText = '';
      S.consent = false;
      S.startedAt = 0;
      S.savedAt = 0;
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
    if (act === 'start' || act === 'restart') begin(true);
    else if (act === 'resume') {
      const sid = t.dataset.sid || '';
      t.disabled = true;
      await syncing;
      if (!loadSession(sid)) { toast('이 검사는 이미 끝났거나 지워졌어요.'); render(); return; }
      await begin(false, sid);
    }
    else if (act === 'save-info') saveInfo();
    else if (act === 'drop') {
      const ok = await modal({
        title: '진행 기록을 지울까요?',
        body: '<p>지운 기록은 되돌릴 수 없어요. 이 검사자는 처음부터 다시 해야 해요.</p>',
        actions: [{ label: '취소', value: false }, { label: '지우기', value: true, primary: true, danger: true }],
      });
      if (ok) { clearProgress(t.dataset.sid || ''); toast('진행 기록을 지웠어요.'); render(); }
    }
    else if (act === 'restart-link') {
      const ok = await modal({
        title: '처음부터 다시 할까요?',
        body: '<p>지금까지 답한 것은 지워지고, 첫 문항부터 다시 시작해요.</p>',
        actions: [{ label: '취소', value: false }, { label: '처음부터 다시', value: true, primary: true, danger: true }],
      });
      if (ok) { clearProgress('L'); begin(true); }
    }
    else if (act === 'to-intro') { S.step = 'intro'; render(); }
    else if (act === 'begin') {
      // 같은 이름(과 생년월일)으로 하다 멈춘 검사가 있으면 먼저 물어본다. 생년월일 없이 저장된 예전 진행도 같은 이름이면 묻는다.
      // 다른 기기에서 하다 멈춘 진행도 찾도록, 계정 기록을 다 읽고(끝난 진행은 정리하고) 나서 찾는다. 보통은 이미 끝나 있다
      t.disabled = true;
      await syncing;
      t.disabled = false;
      const same = L ? null : listSessions().find((v) => v.sid !== S.sid && doneCount(v) > 0 && samePerson(v, S));
      if (same) {
        const pick = await modal({
          title: `${S.name} 님이 하다 멈춘 검사가 있어요`,
          body: `<p>${esc(when(same.savedAt))}에 ${same.total || totalCount}문항 중 ${doneCount(same)}문항까지 답했어요. 이어서 하면 그 자리부터 시작해요.</p><p class="modal-sub">처음부터 하면 멈춘 기록은 지워져요.</p>`,
          actions: [{ label: '처음부터 새로', value: 'new' }, { label: '이어서 하기', value: 'resume', primary: true }],
        });
        if (pick === 'resume') { await begin(false, same.sid); return; }
        if (pick !== 'new') return;
        clearProgress(same.sid);
      }
      if (!S.startedAt) S.startedAt = Date.now();
      S.pi = 0;
      S.step = 'part';
      persist();
      render();
    } else if (act === 'enter') {
      // 건너뛰었던 부에 다시 답하기로 하면, 중간에 멈춰도 빠진 문항으로 잡히도록 null을 지운다
      if (def.parts[S.pi].skippable) itemsFor(S.pi).forEach((it) => { if (S.answers[it.id] === null) delete S.answers[it.id]; });
      enterPart(S.pi);
    } else if (act === 'skip-part') skipPart();
    else if (act === 'back') back();
    else if (act === 'text-next' || act === 'text-skip') {
      const it = S.items[S.ii];
      const ta = stage.querySelector('.write-input');
      const v = act === 'text-skip' ? '' : (ta ? ta.value : '').trim();
      if (act === 'text-next' && !v) {
        if (it.required) { toast('한두 줄이라도 적어 주세요.'); if (ta) ta.focus(); return; }
        toast('비워 두고 넘어가요. 나중에 이전으로 돌아와 적어도 돼요.');
      }
      clearTimeout(typeTimer);
      answer(it.id, v);
    }
    else if (act === 'retry') { S.step = 'working'; render(); save(); }
    else if (act === 'again') { S.step = 'intro'; render(); }
    else if (t.dataset.likert) {
      const it = S.items[S.ii];
      stage.querySelectorAll('[data-likert]').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      answer(it.id, Number(t.dataset.likert));
    } else if (t.dataset.pair) {
      const it = S.items[S.ii];
      const type = Number(t.dataset.pair);
      const s = Number(t.dataset.s);
      stage.querySelectorAll('[data-pair]').forEach((b) => b.setAttribute('aria-checked', String(b === t)));
      const sideNow = t.classList.contains('pair-opt--a') ? 'a' : 'b';
      stage.querySelectorAll('.pair-stmt').forEach((c) => (c.dataset.chosen = String(c.dataset.side === sideNow)));
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

  // 나갈 때: 마지막 답까지 계정에 올리고, 첫 화면에 '여기까지 저장했어요'를 남긴다
  const leaveNote = () => {
    if (L || !inSession()) return;
    try { sessionStorage.setItem('azit:saved-note', JSON.stringify({ testId: def.id, sid: S.sid, name: S.name, n: doneCount(S), total: totalCount, at: Date.now() })); } catch (e) { /* */ }
  };
  mount.querySelectorAll('[data-leave]').forEach((a) => a.addEventListener('click', async (e) => {
    if (!inSession()) return;
    e.preventDefault();
    exitEl.textContent = '저장하는 중';
    persist();
    await Promise.race([flush(), delay(1500)]);
    leaveNote();
    location.href = a.href;
  }));
  const flushNow = () => { if (inSession()) { leaveNote(); flush(); } };
  window.addEventListener('pagehide', flushNow);
  // 창을 비울 때는 마지막 답을 먼저 올리고(확인 없이), 돌아오면 그사이 다른 곳에서 끝냈는지 한 번 확인한다
  const markStale = () => { if (inSession()) S.stale = true; };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { flush(); markStale(); }
    else if (S.stale) checkStale();
  });
  window.addEventListener('blur', markStale);
  window.addEventListener('focus', () => { if (S.stale) checkStale(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) { markStale(); checkStale(); } });
  window.addEventListener('azit:before-update', () => { if (inSession()) persist(); flush(); });

  try { sessionStorage.removeItem('azit:saved-note'); } catch (e) { /* */ }
  await ready();
  syncing = syncRemote().then(() => { if (S.step === 'intro') render(); });
  render();
  // 첫 화면의 '이어서 할 검사'(또는 새로고침)로 들어오면 그 검사자의 자리로 바로 이어 간다
  if (typeof opts.resume === 'string' && opts.resume) {
    await syncing;
    if (loadSession(opts.resume)) await begin(false, opts.resume);
    else { render(); toast('이 검사는 이미 끝났거나 지워졌어요.'); }
  }
  onUser((u) => {
    if (L) return; // 링크로 받은 검사는 로그인과 상관없다
    if (!u) {
      if (S.step !== 'intro') { S.step = 'intro'; }
      render();
      return;
    }
    if (S.wantStart) {
      S.wantStart = false;
      syncing = syncRemote();
      syncing.then(() => {
        if (listSessions().some((v) => doneCount(v) > 0)) { S.step = 'intro'; render(); }
        else begin(true);
      });
      return;
    }
    if (S.step === 'intro') render();
  });
}
