#!/usr/bin/env python3
"""AZIT : Star&Moon 점검 스크립트 (체험 모드로 사이트 전체를 한 바퀴 돌린다)

    python3 tools/smoke.py            # 결과를 출력하고, 문제가 있으면 종료 코드 1
    python3 tools/smoke.py --only schema,attachment
    python3 tools/smoke.py --shots /tmp/azit-shots   # 화면 캡처도 남긴다
    python3 tools/smoke.py --fuzz 600                # 결과지 그리기 점검을 더 촘촘히 (기본 160, 0이면 건너뜀)

하는 일
 1. 모든 .js 파일 문법 검사 (node --check)
 2. 이 폴더를 로컬 서버로 띄우고, 체험 모드 담당자 계정으로 로그인
    (잠금 화면은 코드를 쓰지 않고 '열린 상태'를 저장소에 직접 적어서 넘긴다. 코드는 저장소에 두지 않는다)
 3. 열린 검사를 하나씩 끝까지 무작위로 답해서 '검사 결과가 전송되었습니다'까지 확인
    - 첫 검사는 중간에 '저장하고 나가기' → 첫 화면 '이어서 할 검사' → 이어서 하기까지 확인
    - 끝난 검사의 임시 저장: 같은 검사자가 진행을 시작한 뒤 같은 검사를 끝낸 결과가 있으면 첫 화면·검사 소개에서 정리되는지
      (먼저 끝낸 결과, 다른 분, 생년월일 없는 예전 진행 구분), 첫 화면 카드 '지우기', 끝난 진행 링크 알림,
      끝내면 같은 검사자의 다른 진행도 정리, 같은 진행을 다른 창에서 끝내면 예전 창이 멈추고 되살리지 않는지
 4. 첫 화면 검사 고르기 탭(추천 묶음 + 분류, 한 칸씩, 고른 탭 기억), 검사 결과 목록과 결과지마다: 목차, 스크롤이 막힘 없이 내려가는지, 목차 표시가 따라오는지
 5. 관리 화면이 오류 없이 열리는지, 생년월일 없는 예전 결과(흉내 낸 1건)에 '생년월일 넣기'가 되는지,
    CSV 열이 머리줄과 맞고 '생년월일' 열이 빈칸 없이 채워지는지
 6. 결과지 그리기: 검사마다 여러 모양의 모의 응답(고루, 극단, 무작위, 한쪽 끝, 같은 답)을 채점해서,
    실제 데이터베이스에서 읽어 온 모양(빈 배열·빈 객체가 빠진 상태, backend.js rtdbShape)으로
    결과지(상담사용·공유용), 요약, 짝 읽기를 그려 본다. 무작위 응답만으로는 잘 안 나오는 끝자락 점수도 본다
 7. 상담사 승인 창에서 이름·소속 고치기, 승인된 상담사의 이름·소속 고치기
    관리 화면 배치: 탭 셋, 상담사별 거르기, 결과 표와 '열기' 단추가 390px·1024px 너비 안에 들어오는지
    계정 단계: 담당자 화면, 관리자 화면(담당자 기능 없음, 다른 계정 결과는 열기만), 상담사 계정(관리 화면에 못 들어옴)
 8. 모든 화면의 자바스크립트 오류 수집

필요한 것: python3, playwright (pip install playwright --break-system-packages; python3 -m playwright install chromium)
"""
import argparse
import asyncio
import contextlib
import json
import os
import pathlib
import random
import socket
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent


PAIR_IDS = ('attachment', 'godattach', 'interpersonal', 'emotion', 'rumination')  # 같은 이름으로 해서 종합 결과지의 짝 읽기를 확인한다

# 결과지 그리기 점검 (브라우저 안에서 돈다). 모의 응답 만드는 법은 tools/validate.mjs의 answersFor와 같은 갈래
RENDER_FUZZ_JS = r"""async ({ ids, n }) => {
  const { rtdbShape } = await import('./assets/js/backend.js');
  const { PAIRS } = await import('./assets/js/pairs.js');
  const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gaussOf = (rnd) => () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const isRev = (it) => it.r === true || it.key === -1;
  const modes = ['latent', 'wide', 'wide', 'random', 'yes', 'no', 'flat', 'neutral'];
  const el = document.createElement('div');
  const out = {}; const samples = {};
  for (const id of ids) {
    const def = (await import(`./tests/${id}/index.js`)).default;
    const fails = {}; const emptied = new Set(); let renders = 0;
    samples[id] = [];
    for (let i = 0; i < n; i++) {
      const mode = modes[i % modes.length];
      const rnd = mulberry32(i * 7919 + 17); const g = gaussOf(rnd);
      const th = new Map(); const thOf = (k) => { if (!th.has(k)) th.set(k, g() * (mode === 'wide' ? 2.5 : 1)); return th.get(k); };
      const ans = {};
      for (const p of def.parts) {
        for (const it of p.items || p.build(ans)) {
          const key = String(it.d ?? it.facet ?? it.scale ?? it.dim ?? it.type ?? it.s ?? '_');
          if (p.kind === 'likert') {
            const vals = p.scale.map((x) => Number(x.value)); const min = Math.min(...vals), max = Math.max(...vals);
            let v;
            if (mode === 'random') v = min + Math.floor(rnd() * (max - min + 1));
            else if (mode === 'neutral' || mode === 'flat') v = Math.floor((min + max) / 2);
            else if (mode === 'yes') v = max; else if (mode === 'no') v = min;
            else { const z = 0.8 * thOf(`${p.id}:${key}`) + 0.6 * g(); const k = max - min + 1; v = min; for (let c = 0; c < k - 1; c++) if (z > -1.6 + (3.2 * c) / (k - 2)) v++; if (isRev(it)) v = min + max - v; }
            ans[it.id] = Math.max(min, Math.min(max, v));
          } else if (p.kind === 'pair') {
            if (mode === 'random') ans[it.id] = [2, 1, -1, -2][Math.floor(rnd() * 4)];
            else if (mode === 'neutral' || mode === 'flat') ans[it.id] = 1; else if (mode === 'yes') ans[it.id] = 2; else if (mode === 'no') ans[it.id] = -2;
            else { const d = thOf(String(it.lo)) - thOf(String(it.hi)) + 0.7 * g(); const s = Math.abs(d) > 0.8 ? 2 : 1; ans[it.id] = d > 0 ? s : -s; }
          } else if (p.kind === 'rank') {
            const keys = it.options.map((o) => o.key);
            ans[it.id] = (mode === 'neutral' || mode === 'flat') ? keys : keys.map((k) => [k, rnd()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
          } else if (p.kind === 'text') {
            ans[it.id] = (mode === 'latent' || mode === 'wide') && rnd() < 0.7 ? '모의 응답으로 적은 글이에요.\n둘째 줄이에요.' : '';
          }
        }
      }
      const fail = (what, e) => {
        const k = `${what}: ${e && e.message}`;
        if (!fails[k]) fails[k] = { count: 0, mode, at: String(e && e.stack).split('\n').slice(1, 2).map((x) => x.trim().replace(location.origin, '')).join('') };
        fails[k].count++;
      };
      let s;
      try { s = def.score(ans, { durationSec: mode === 'flat' ? 60 : 900 }); } catch (e) { fail('채점', e); continue; }
      const raw = JSON.parse(JSON.stringify({ testId: id, version: def.version, name: '점검', birth: '1990-01-01', createdAt: Date.now(), answers: ans, scores: s, summary: def.summary(s), durationSec: mode === 'flat' ? 60 : 900 }));
      const rec = rtdbShape(raw);
      (function walk(a, b, p) { if (a && typeof a === 'object') Object.keys(a).forEach((k) => { if (b == null || b[k] === undefined) emptied.add(p + k); else walk(a[k], b[k], `${p}${k}.`); }); })(raw.scores, rec.scores, '');
      samples[id].push(rec.scores || {});
      const tries = [
        ['결과지', () => def.render(el, rec, { shared: false, rid: 'x' })],
        ['공유 결과지', () => def.render(el, { name: rec.name, createdAt: rec.createdAt, scores: rec.scores }, { shared: true, rid: 'x' })],
        ['요약', () => def.summary(rec.scores)],
        ...(def.glyph ? [['기호', () => def.glyph(rec.scores)]] : []),
      ];
      for (const [what, fn] of tries) { try { fn(); renders++; } catch (e) { fail(what, e); } }
    }
    out[id] = { renders, emptied: [...emptied], fails };
  }
  const pairFails = {};
  for (const p of PAIRS) {
    const A = samples[p.a]; const B = samples[p.b];
    if (!A || !B || !A.length || !B.length) continue;
    A.forEach((a, i) => { try { p.render(a, B[(i * 7) % B.length]); } catch (e) { const k = `${p.a}+${p.b}: ${e.message}`; pairFails[k] = (pairFails[k] || 0) + 1; } });
  }
  // 달라진 점: 같은 검사를 2~4번 한 것처럼 점수를 이어 그려 본다(흐름이 정해진 검사, 정해지지 않은 검사 모두)
  const { buildTracks, renderTrack } = await import('./assets/js/tracks.js');
  const meta = (id) => ({ title: id });
  const trackFails = {}; let trackRenders = 0;
  for (const id of ids) {
    const S = samples[id] || [];
    for (let i = 0; i + 1 < S.length; i += 3) {
      const k = 2 + (i % 3);
      const list = S.slice(i, i + k).map((sc, j) => ({ testId: id, version: '1.0', createdAt: 1.7e12 + j * 864e6, summary: '요약 (점검)', scores: sc }));
      if (id === 'hspnow' && samples.hsp && samples.hsp.length) list.push({ testId: 'hsp', version: '1.0', createdAt: 1.6e12, summary: '요약 (점검)', scores: samples.hsp[i % samples.hsp.length] });
      try { buildTracks(list).tracks.forEach((t) => { renderTrack(t, meta); trackRenders++; }); } catch (e) { const key = `${id}: ${e.message}`; trackFails[key] = (trackFails[key] || 0) + 1; }
    }
  }
  return { out, pairFails, trackFails, trackRenders };
}"""


def free_port():
    with contextlib.closing(socket.socket()) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def css_check():
    # 합치다가 닫는 괄호가 빠지면 그 뒤 스타일이 통째로 안 먹으므로, 괄호 짝을 센다
    bad = []
    for p in sorted(ROOT.rglob('*.css')):
        if {'.git', 'node_modules'} & set(p.relative_to(ROOT).parts):
            continue
        text = p.read_text(encoding='utf-8')
        depth = 0
        for n, line in enumerate(text.split('\n'), 1):
            depth += line.count('{') - line.count('}')
            if depth < 0:
                bad.append(f'{p.relative_to(ROOT)}:{n}: 여는 괄호보다 닫는 괄호가 많음')
                depth = 0
        if depth:
            bad.append(f'{p.relative_to(ROOT)}: 닫히지 않은 괄호 {depth}개')
    return bad


def syntax_check():
    bad = []
    for p in sorted(ROOT.rglob('*.js')):
        if {'.git', 'node_modules'} & set(p.relative_to(ROOT).parts):
            continue
        r = subprocess.run(['node', '--check', str(p)], capture_output=True, text=True)
        if r.returncode:
            bad.append(f'{p.relative_to(ROOT)}: {r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "error"}')
    return bad


async def run(args):
    from playwright.async_api import async_playwright

    port = free_port()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f'http://127.0.0.1:{port}/'
    for _ in range(50):
        with contextlib.suppress(OSError):
            socket.create_connection(('127.0.0.1', port), timeout=0.2).close()
            break
        time.sleep(0.1)

    report = {'checks': [], 'errors': [], 'failed': []}
    shots = pathlib.Path(args.shots) if args.shots else None
    if shots:
        shots.mkdir(parents=True, exist_ok=True)

    def ok(name, cond, detail=''):
        report['checks'].append({'name': name, 'ok': bool(cond), 'detail': detail})
        if not cond:
            report['failed'].append(f'{name} {detail}'.strip())
        return cond

    rnd = random.Random(args.seed)
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: report['errors'].append(f'pageerror {pg.url.split("/")[-1]}: {e}'))
            pg.on('console', lambda m: report['errors'].append(f'console {pg.url.split("/")[-1]}: {m.text}')
                  if m.type == 'error' and 'Failed to load resource' not in m.text else None)

            async def unlock(kind):
                # 점검은 체험 모드로 돈다: 체험 모드의 잠금 칸(azit:demo:lock:*)에 '열림'을 적는다
                store = 'sessionStorage' if kind == 'test' else 'localStorage'
                await pg.evaluate(f"(() => {{ const n = Date.now(); {store}.setItem('azit:demo:lock:{kind}', JSON.stringify({{at: n, seen: n}})); }})()")

            async def shot(name):
                if shots:
                    await pg.screenshot(path=str(shots / f'{name}.png'))

            # 로그인 (체험 모드 담당자: 모든 기능)
            await pg.goto(base + 'login.html?demo=1&demorole=owner')
            await pg.wait_for_selector('[data-login]', timeout=8000)
            await pg.click('[data-login]')
            await pg.wait_for_timeout(1200)
            # 체험 모드 잠금: 진짜 번호 대신 0000으로만 열리고, 열린 표시는 진짜 모드와 다른 칸에 적힌다
            await pg.goto(base + 'index.html')
            lock_ok, lock_detail = False, '잠금 화면이 뜨지 않음'
            try:
                await pg.wait_for_selector('.lock-card', timeout=8000)
                hint = await pg.inner_text('#lock-sub')
                for k in '1234':
                    await pg.keyboard.press(k)
                await pg.wait_for_timeout(800)
                wrong = await pg.inner_text('[data-msg]')
                for k in '0000':
                    await pg.keyboard.press(k)
                await pg.wait_for_timeout(1000)
                opened = await pg.locator('.lock-card').count() == 0
                marks = await pg.evaluate("() => ({ real: sessionStorage.getItem('azit:lock:test') || localStorage.getItem('azit:lock:test'), demo: !!sessionStorage.getItem('azit:demo:lock:test') })")
                lock_ok = '0000' in hint and '맞지 않아요' in wrong and opened and marks['real'] is None and marks['demo']
                lock_detail = f"안내 {'있음' if '0000' in hint else '없음'}, 1234 '{wrong[:14]}', 0000 {'열림' if opened else '안 열림'}, 진짜 모드 칸 {'비어 있음' if marks['real'] is None else '적힘'}"
            except Exception as e:
                lock_detail = f'오류: {str(e)[:60]}'
            ok('체험 모드 잠금 0000', lock_ok, lock_detail)
            await shot('demo-lock')
            await unlock('test')
            await pg.goto(base + 'index.html')
            await pg.wait_for_timeout(1200)
            ok('첫 화면 인사', 'greet' in (await pg.get_attribute('[data-greet]', 'class') or ''), await pg.inner_text('[data-greet]'))
            await shot('home')
            tabs = await pg.locator('[data-bundles] [role="tab"]').count()
            steps = await pg.eval_on_selector_all('[data-bundles] .bd-step', 'els => els.map(e => e.getAttribute("href"))')
            ok('고민별 추천 묶음', tabs >= 1 and steps and all('&b=' in h for h in steps), f'묶음 {tabs}개, 첫 묶음 검사 {len(steps)}개')
            # 검사 고르기 탭: '추천 묶음'과 분류마다 하나, 한 번에 한 칸만 보이고, 고른 탭은 다시 열어도 그대로
            ht = await pg.eval_on_selector_all('[data-home-tab]', 'els => els.map(e => e.dataset.homeTab)')
            vis = await pg.evaluate("() => [...document.querySelectorAll('[data-home-panel]')].filter((p) => !p.hidden).map((p) => p.dataset.homePanel)")
            cards, kept = 0, None
            if len(ht) >= 2:
                await pg.click(f'[data-home-tab="{ht[-1]}"]')
                cards = await pg.locator(f'[data-home-panel="{ht[-1]}"] .tcard').count()
                await pg.reload()
                await pg.wait_for_timeout(1200)
                kept = await pg.get_attribute(f'[data-home-tab="{ht[-1]}"]', 'aria-selected')
                await pg.click('[data-home-tab="pick"]')
            ok('검사 고르기 탭', len(ht) >= 2 and ht[0] == 'pick' and vis == ['pick'] and cards >= 1 and kept == 'true',
               f'탭 {len(ht)}개, 처음 보이는 칸 {vis}, 마지막 탭의 검사 {cards}개, 다시 열어도 그 탭 {kept}')

            tests = await pg.evaluate("import('./assets/js/registry.js').then(m => m.TESTS.filter(t => t.status === 'open').map(t => ({id: t.id, title: t.title, items: t.items})))")
            if args.only:
                want = set(args.only.split(','))
                tests = [t for t in tests if t['id'] in want]
            ok('열린 검사 목록', len(tests) > 0, ', '.join(t['id'] for t in tests))

            async def answer_until_done(limit, stop_after=None, page=None):
                pg_ = page or pg
                answered = 0
                for _ in range(limit):
                    if await pg_.locator('.done').count():
                        return True, answered
                    if await pg_.locator('[data-act="retry"]').count():
                        return False, answered
                    if stop_after is not None and answered >= stop_after and await pg_.locator('.part-meta .where').count():
                        return None, answered
                    if await pg_.locator('[data-act="enter"]').count():
                        await pg_.click('[data-act="enter"]')
                        await pg_.wait_for_timeout(220)
                        continue
                    n_likert = await pg_.locator('[data-likert]').count()
                    if n_likert:
                        await pg_.keyboard.press(str(rnd.randint(1, n_likert)))
                        answered += 1
                        await pg_.wait_for_timeout(240)
                        continue
                    if await pg_.locator('.pair-opt').count():
                        await pg_.keyboard.press(str(rnd.randint(1, 4)))
                        answered += 1
                        await pg_.wait_for_timeout(240)
                        continue
                    if await pg_.locator('.write-input').count():
                        # 글로 답하기: 대부분은 짧게 적고, 가끔은 건너뛴다
                        if rnd.random() < 0.8:
                            await pg_.fill('.write-input', f'점검용 글 {answered + 1}\n둘째 줄')
                            await pg_.click('[data-act="text-next"]')
                        else:
                            await pg_.click('[data-act="text-skip"]')
                        answered += 1
                        await pg_.wait_for_timeout(400)
                        continue
                    if await pg_.locator('[data-rank-key]').count():
                        await pg_.keyboard.press('1')
                        await pg_.wait_for_timeout(120)
                        await pg_.keyboard.press('2')
                        answered += 1
                        await pg_.wait_for_timeout(650)
                        continue
                    await pg_.wait_for_timeout(300)
                return False, answered

            # 검사마다 끝까지
            for i, t in enumerate(tests):
                await unlock('test')
                await pg.goto(base + f'test.html?t={t["id"]}')
                await pg.wait_for_selector('[data-act="start"]', timeout=10000)
                await pg.click('[data-act="start"]')
                # 짝 검사(성인 애착, 신앙 애착)는 같은 이름으로 해서 종합 결과지의 '함께 읽기'까지 본다
                await pg.fill('#pf-name', '점검짝' if i > 0 and t['id'] in PAIR_IDS else f'점검{i + 1}')
                await pg.fill('#pf-birth', '19900101')
                await pg.check('#pf-consent')
                await pg.click('[data-act="begin"]')
                await pg.wait_for_timeout(250)
                if i == 0:
                    # 중간 저장 → 첫 화면 → 이어서 하기
                    _, n = await answer_until_done(40, stop_after=3)
                    chip = await pg.get_attribute('[data-save-chip]', 'data-state')
                    ok(f'{t["id"]}: 저장됨 표시', chip == 'saved', f'state={chip}')
                    await pg.click('[data-exit]')
                    await pg.wait_for_url('**/index.html', timeout=8000)
                    await pg.wait_for_timeout(1500)
                    names = await pg.eval_on_selector_all('.resume-card strong', 'els => els.map(e => e.textContent)')
                    ok(f'{t["id"]}: 첫 화면 이어서 할 검사', any('점검1' in x for x in names), str(names))
                    await shot('home-resume')
                    await pg.click('.resume-card')
                    await pg.wait_for_selector('.part-meta .where', timeout=10000)
                    where = await pg.inner_text('.part-meta .where')
                    at = int(where.split('/')[0].split()[-1])
                    ok(f'{t["id"]}: 멈춘 자리에서 이어짐', at == n + 1, f'{where} (답한 문항 {n}개)')
                done, n = await answer_until_done(t['items'] * 4 + 40)
                await pg.wait_for_timeout(300)
                if not done:
                    await pg.wait_for_selector('.done', timeout=12000)
                    done = await pg.locator('.done').count() > 0
                ok(f'{t["id"]}: 끝까지 진행', done, f'{n}문항 응답')
                if done:
                    h1 = await pg.inner_text('.done h1')
                    ok(f'{t["id"]}: 전송 화면', '전송' in h1, h1)
                    await shot(f'done-{t["id"]}')

            # 검사 결과 목록과 결과지
            await unlock('result')
            await pg.goto(base + 'me.html')
            await pg.wait_for_timeout(1500)
            links = await pg.eval_on_selector_all('a[href*="result.html"]', 'els => [...new Set(els.map(e => e.getAttribute("href")))]')
            ok('검사 결과 목록', len(links) >= len(tests), f'{len(links)}개')
            await shot('me')

            # 검사자별 보기와 종합 결과지
            paired = [t for i, t in enumerate(tests) if i > 0 and t['id'] in PAIR_IDS]
            await pg.click('[data-by="person"]')
            await pg.wait_for_timeout(300)
            people = await pg.locator('.record--person').count()
            want = len(tests) - max(0, len(paired) - 1)
            ok('검사자별 보기', people == want, f'{people}명 (기대 {want}명)')
            await shot('me-person')
            ph = await pg.evaluate("""() => { const li = [...document.querySelectorAll('.record--person')].find((x) => x.querySelector('strong').textContent === '점검짝') || document.querySelector('.record--person');
              return li ? li.querySelector('a[href*="person.html"]').getAttribute('href') : ''; }""")
            if ph:
                await unlock('result')
                await pg.goto(base + ph)
                try:
                    await pg.wait_for_selector('.pp-head', timeout=8000)
                    cards = await pg.locator('.pp-card').count()
                    pairs = await pg.locator('.pp-pair').count()
                    ok('종합 결과지', cards >= 1 and (len(paired) < 2 or pairs >= 1), f'카드 {cards}개, 함께 읽기 {pairs}개')
                    await shot('person')
                except Exception:
                    ok('종합 결과지', False, '열리지 않음')
            else:
                ok('종합 결과지', False, '검사자별 목록에 링크가 없음')
            for href in links[: len(tests)]:
                await unlock('result')
                await pg.goto(base + href)
                try:
                    await pg.wait_for_selector('.report', timeout=10000)
                except Exception:
                    ok(f'결과지 {href}', False, '결과지가 열리지 않음')
                    continue
                await pg.wait_for_timeout(600)
                title = (await pg.title()).split('|')[0].strip()
                toc = await pg.locator('.toc a').count()
                ok(f'결과지 목차 ({title})', toc >= 3, f'{toc}개')
                await pg.evaluate('window.scrollTo(0, 0)')
                await pg.wait_for_timeout(200)
                ys, actives = [], set()
                for _ in range(120):
                    await pg.mouse.wheel(0, 160)
                    await pg.wait_for_timeout(70)
                    y = await pg.evaluate('Math.round(scrollY)')
                    ys.append(y)
                    cur = await pg.evaluate("(document.querySelector('.toc a[aria-current=\"true\"]') || {}).textContent || ''")
                    if cur:
                        actives.add(cur)
                    if await pg.evaluate('innerHeight + scrollY >= document.documentElement.scrollHeight - 2'):
                        break
                steps = list(zip(ys, ys[1:]))
                stuck = [(a, b) for a, b in steps[:-1] if b - a < 120]
                ok(f'결과지 스크롤 ({title})', not stuck, f'막힌 곳 {stuck[:3]}' if stuck else f'{len(ys)}번 내려 바닥까지')
                ok(f'결과지 목차 표시 ({title})', len(actives) >= min(3, toc), f'{len(actives)}개 항목이 차례로 표시됨')
                await shot(f'result-{title}')

            # 달라진 점: 요즘의 나 체크를 한 사람에게 한 달 전 감각처리 민감성 검사, 2주 전 체크를 더해(체험 저장소에 복사) 종합 결과지에서 한 줄로 이어지는지 본다
            trend = await pg.evaluate("""() => {
              const u = JSON.parse(localStorage.getItem('azit:demo:user') || 'null');
              const db = JSON.parse(localStorage.getItem('azit:demo:db') || '{}');
              const rs = u && db.results && db.results[u.uid];
              if (!rs) return null;
              const all = Object.entries(rs);
              const now = all.find(([, r]) => r.testId === 'hspnow');
              const hsp = all.find(([, r]) => r.testId === 'hsp');
              if (!now || !hsp) return null;
              const [rid, r] = now;
              const a = { ...hsp[1], name: r.name, birth: r.birth, createdAt: r.createdAt - 864e5 * 30, scores: { ...hsp[1].scores, load: 83, rest: 21, state: 'overload' } };
              const b = { ...r, createdAt: r.createdAt - 864e5 * 14, scores: { ...r.scores, load: 67, rest: 38, state: 'overload' } };
              delete a.shareToken; delete b.shareToken;
              rs['smoke-trend-a'] = a; rs['smoke-trend-b'] = b;
              localStorage.setItem('azit:demo:db', JSON.stringify(db));
              return { uid: u.uid, rid };
            }""")
            if trend:
                await unlock('result')
                await pg.goto(base + f"person.html?u={trend['uid']}&r={trend['rid']}")
                try:
                    await pg.wait_for_selector('.pp-trend', timeout=8000)
                    info = await pg.evaluate("""() => {
                      const c = [...document.querySelectorAll('.pp-trend')].find((x) => x.querySelector('h3').textContent === '요즘의 나');
                      if (!c) return null;
                      return { chips: [...c.querySelectorAll('.pp-tl li span')].map((x) => x.textContent), rows: c.querySelectorAll('.pp-trows li').length,
                        dots: c.querySelectorAll('.pp-spark circle').length, deltas: c.querySelectorAll('.pp-d').length,
                        joined: (c.querySelector('.pp-note') || {}).textContent || '', read: (c.querySelector('.pp-tread') || {}).textContent || '' };
                    }""")
                    good = bool(info) and len(info['chips']) == 3 and info['chips'][0] == '과부하' and info['rows'] == 2 and info['dots'] == 6 and info['deltas'] == 2 and '한 줄로' in info['joined'] and info['read'].startswith('지난번')
                    ok('달라진 점 (요즘의 나)', good, json.dumps(info, ensure_ascii=False) if info else '요즘의 나 흐름이 없음')
                    await shot('person-trend')
                except Exception:
                    ok('달라진 점 (요즘의 나)', False, '종합 결과지에 달라진 점이 없음')

            # 생년월일을 받기 전에 저장된 예전 결과 1건을 흉내 낸다(체험 저장소의 결과 하나를 복사하고 birth를 뺀다)
            legacy = await pg.evaluate("""() => {
              const u = JSON.parse(localStorage.getItem('azit:demo:user') || 'null');
              const db = JSON.parse(localStorage.getItem('azit:demo:db') || '{}');
              const rs = u && db.results && db.results[u.uid];
              const src = rs && Object.values(rs)[0];
              if (!src) return false;
              const old = { ...src, createdAt: src.createdAt - 864e5 * 3 };
              delete old.birth; delete old.shareToken;
              rs['smoke-legacy'] = old;
              localStorage.setItem('azit:demo:db', JSON.stringify(db));
              return true;
            }""")

            # 관리 화면 + 생년월일 넣기 + CSV 내려받기(열 수가 머리줄과 모두 같은지, 생년월일 열이 채워졌는지)
            await unlock('result')
            await pg.goto(base + 'admin.html')
            await pg.wait_for_timeout(1500)
            ok('관리 화면', await pg.locator('main').count() > 0)
            await shot('admin')
            if legacy:
                has_bar = await pg.locator('.birth-missing').count() > 0
                saved = None
                if has_bar:
                    await pg.click('[data-fill-birth]')
                    await pg.wait_for_selector('#fb-birth', timeout=5000)
                    await pg.fill('#fb-birth', '19900101')
                    await pg.click('.modal-actions [data-i="1"]')
                    await pg.wait_for_timeout(800)
                    saved = await pg.evaluate("""() => {
                      const u = JSON.parse(localStorage.getItem('azit:demo:user'));
                      const db = JSON.parse(localStorage.getItem('azit:demo:db'));
                      return (db.results[u.uid]['smoke-legacy'] || {}).birth || null;
                    }""")
                bar_left = await pg.locator('.birth-missing').count()
                ok('생년월일 넣기', has_bar and saved == '1990-01-01' and not bar_left,
                   f'알림 {"있음" if has_bar else "없음"}, 저장된 값 {saved}, 넣은 뒤 알림 {"남음" if bar_left else "사라짐"}')
            if await pg.locator('[data-csv]').count():
                import csv, io, re
                async with pg.expect_download(timeout=10000) as dl:
                    await pg.click('[data-csv]')
                path = await (await dl.value).path()
                text = pathlib.Path(path).read_text(encoding='utf-8-sig')
                rows = list(csv.reader(io.StringIO(text)))
                head = rows[0] if rows else []
                bad = [i for i, r in enumerate(rows[1:], 1) if len(r) != len(head)]
                ok('관리 CSV 열 맞춤', rows and not bad, f'머리줄 {len(head)}열, 결과 {len(rows) - 1}줄' + (f', 어긋난 줄 {bad[:5]}' if bad else ''))
                bcol = head.index('생년월일') if '생년월일' in head else -1
                blank = [i for i, r in enumerate(rows[1:], 1) if bcol < 0 or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', r[bcol] if bcol < len(r) else '')]
                ok('관리 CSV 생년월일 열', bcol == 1 and not blank,
                   ('생년월일 열 없음' if bcol < 0 else f'{bcol + 1}번째 열') + (f', 비거나 형식이 다른 줄 {blank[:5]}' if blank else ', 모두 채워짐'))
            # 문항 분석: 모든 검사의 척도 정의가 불러와지고, 계산 결과가 그려지는지
            if await pg.locator('[data-ia-run]').count():
                missing = await pg.evaluate("""async () => {
                  const S = await import('./assets/js/itemstats.js');
                  const R = await import('./assets/js/registry.js');
                  return R.TESTS.filter((t) => t.status === 'open' && !S.SCALE_DEFS[t.id]).map((t) => t.id);
                }""")
                await pg.click('[data-tab="analysis"]')  # 문항 분석은 '분석' 탭에 있다
                await pg.click('[data-ia-run]')
                try:
                    await pg.wait_for_selector('[data-ia-out] .ia-sum, [data-ia-out] .muted-box', timeout=8000)
                    ok('문항 분석', not missing, f'척도 정의가 없는 검사 {missing}' if missing else (await pg.inner_text('[data-ia-out]'))[:60])
                except Exception:
                    ok('문항 분석', False, '결과가 그려지지 않음')

            # 결과지 그리기: 여러 모양의 모의 응답을 데이터베이스에서 읽어 온 모양으로 그려 본다
            if args.fuzz > 0:
                fz = await pg.evaluate(RENDER_FUZZ_JS, {'ids': [t['id'] for t in tests], 'n': args.fuzz})
                for t in tests:
                    r = fz['out'].get(t['id'], {})
                    fails = r.get('fails') or {}
                    if fails:
                        detail = '; '.join(f"{v['count']}번 {k} [{v['mode']}] {v['at']}" for k, v in list(fails.items())[:3])
                    else:
                        detail = f"{r.get('renders', 0)}번 그림" + (f", 저장소에서 빠지는 칸 {', '.join(r['emptied'][:6])}" if r.get('emptied') else '')
                    ok(f"결과지 그리기 ({t['title']})", not fails, detail)
                ok('짝 읽기 그리기', not fz['pairFails'], '; '.join(f'{k} {v}번' for k, v in fz['pairFails'].items()) or '함께 고른 검사의 짝 모두')
                ok('달라진 점 그리기', not fz['trackFails'] and fz['trackRenders'] > 0, '; '.join(f'{k} {v}번' for k, v in fz['trackFails'].items()) or f"{fz['trackRenders']}번 그림")

            # 끝난 검사의 임시 저장 정리 (요즘의 나 체크: 12문항이라 빠르다)
            DT = 'hspnow'
            drafts_left = "() => { const u = JSON.parse(localStorage.getItem('azit:demo:user')); const db = JSON.parse(localStorage.getItem('azit:demo:db') || '{}'); return Object.values((db.drafts || {})[u.uid] || {}).map((d) => d.sid); }"
            seed_drafts = """async ({ T, rows, result }) => {
              const def = (await import(`./tests/${T}/index.js`)).default;
              const ids = def.parts[0].items.map((it) => it.id);
              const u = JSON.parse(localStorage.getItem('azit:demo:user'));
              const db = JSON.parse(localStorage.getItem('azit:demo:db') || '{}');
              const now = Date.now(), H = 3600e3;
              const C = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
              const tkey = (ts) => { let n = Math.floor(ts), o = ''; for (let i = 0; i < 8; i++) { o = C[n % 64] + o; n = Math.floor(n / 64); } return o; };
              if (result) {
                db.results = db.results || {}; db.results[u.uid] = db.results[u.uid] || {};
                db.results[u.uid][tkey(now + result.at * H) + 'smokeDraftRs'] = { testId: T, version: def.version, name: result.name, birth: result.birth,
                  createdAt: now + result.at * H, scores: { load: 50, rest: 50, state: 'holding' }, answers: { [ids[0]]: 3 }, summary: '점검' };
              }
              db.drafts = db.drafts || {}; db.drafts[u.uid] = db.drafts[u.uid] || {};
              rows.forEach(([sid, name, birth, at]) => {
                const d = { sid, testId: T, version: def.version, title: def.title, total: ids.length, answers: { [ids[0]]: 3, [ids[1]]: 2 }, pi: 0, ii: 2,
                  name, startedAt: now + at * H, savedAt: now + at * H + 5 * 60e3 };
                if (birth) d.birth = birth;
                db.drafts[u.uid][`${T}-${def.version}-${sid}`.replace(/[.#$[\\]/]/g, '-')] = d;
              });
              localStorage.setItem('azit:demo:db', JSON.stringify(db));
            }"""
            toast_text = "() => { const t = document.querySelector('.toast[data-show=\"true\"]'); return t ? t.textContent : ''; }"
            # 가) 첫 화면: 같은 검사자가 진행을 시작한 뒤에 같은 검사를 끝낸 결과가 있으면 그 진행은 정리되고, 아니면 남는다
            await pg.evaluate(seed_drafts, {'T': DT, 'result': {'name': '정리하나', 'birth': '1990-01-01', 'at': -1}, 'rows': [
                ['smkD1', '정리하나', '1990-01-01', -2],    # 결과보다 먼저 시작 → 정리
                ['smkD2', '정리하나', '1990-01-01', -0.5],  # 결과 뒤에 다시 시작 → 남김
                ['smkD3', '정리둘', '1990-01-01', -2],      # 다른 분 → 남김
                ['smkD4', '정리하나', '', -3],              # 생년월일 없는 예전 진행, 이름이 같음 → 정리
                ['smkD5', '정리하나', '1991-02-02', -2],    # 이름만 같은 다른 분 → 남김
            ]})
            await unlock('test')
            await pg.goto(base + 'index.html')
            await pg.wait_for_timeout(2500)
            left = await pg.evaluate(drafts_left)
            cards = await pg.eval_on_selector_all('.resume-card .who strong', 'els => els.map((e) => e.textContent.replace(/\\s+/g, " ").trim())')
            ok('임시 저장 정리: 끝낸 검사', not {'smkD1', 'smkD4'} & set(left) and {'smkD2', 'smkD3', 'smkD5'} <= set(left) and len(cards) == 3,
               f"남은 진행 {sorted(x for x in left if x.startswith('smk'))}, 첫 화면 {cards}")
            # 나) 첫 화면 카드의 '지우기': 카드 안 오른쪽 아래에 있고 멈춘 시각 글자와 겹치지 않으며, 누르면 확인 뒤 지워진다
            lay = await pg.evaluate("""() => {
              const li = document.querySelector('.resume-list li'); if (!li) return null;
              const L = li.getBoundingClientRect(), b = li.querySelector('[data-drop]').getBoundingClientRect(), go = li.querySelector('.go').getBoundingClientRect();
              const r = document.createRange(); r.selectNodeContents(li.querySelector('.when')); const w = r.getBoundingClientRect();
              return { inside: b.left >= L.left && b.right <= L.right && b.top >= L.top && b.bottom <= L.bottom, clearOfText: w.right <= b.left, clearOfGo: b.top >= go.bottom };
            }""")
            await shot('home-resume-drop')
            row = pg.locator('.resume-list li', has_text='정리둘')
            if await row.count():
                await row.locator('[data-drop]').click()
                await pg.wait_for_selector('.modal-actions [data-i="1"]', timeout=4000)
                await pg.click('.modal-actions [data-i="1"]')
                await pg.wait_for_timeout(1200)
            left = await pg.evaluate(drafts_left)
            ok('첫 화면 카드 지우기', lay and all(lay.values()) and 'smkD3' not in left and not await pg.locator('.resume-list li', has_text='정리둘').count(),
               f"배치 {lay}, 남은 진행 {sorted(x for x in left if x.startswith('smk'))}, 알림 '{await pg.evaluate(toast_text)}'")
            # 다) 끝난 진행으로 들어오는 링크(예: 남아 있던 카드)는 검사 소개로 가고 알려 준다
            await unlock('test')
            await pg.goto(base + f'test.html?t={DT}&resume=smkD1')
            await pg.wait_for_timeout(2000)
            msg = await pg.evaluate(toast_text)
            ok('끝난 진행 링크', await pg.locator('[data-act="start"]').count() > 0 and '이미 끝났거나' in msg, msg or '알림 없음')
            # 라) 검사 소개에서도 정리: 첫 화면을 거치지 않고 검사 화면을 바로 열어도 끝난 진행은 목록에 없고 지워진다
            await pg.evaluate(seed_drafts, {'T': DT, 'result': None, 'rows': [['smkD6', '정리하나', '1990-01-01', -2]]})
            await pg.goto(base + f'test.html?t={DT}')
            await pg.wait_for_timeout(2500)
            left = await pg.evaluate(drafts_left)
            sids = await pg.eval_on_selector_all('.resume-row', 'els => els.map((e) => e.dataset.sid)')
            ok('검사 소개에서 정리', 'smkD6' not in left and 'smkD6' not in sids and {'smkD2', 'smkD5'} <= set(sids), f'목록 {sids}, 남은 진행 {sorted(x for x in left if x.startswith("smk"))}')
            # 마) 끝내면 같은 검사자의 다른 진행(다른 기기에서 그사이 생긴 것 흉내)도 지우고, 이름만 같은 다른 분 것은 남긴다
            await pg.click('[data-act="start"]')
            await pg.fill('#pf-name', '정리셋')
            await pg.fill('#pf-birth', '19900101')
            await pg.check('#pf-consent')
            await pg.click('[data-act="begin"]')
            await pg.wait_for_timeout(300)
            await answer_until_done(20, stop_after=3)
            await pg.wait_for_timeout(1600)
            cur = await pg.evaluate("new URL(location.href).searchParams.get('resume') || ''")
            await pg.evaluate(seed_drafts, {'T': DT, 'result': None, 'rows': [['smkD7', '정리셋', '1990-01-01', -0.1], ['smkD8', '정리셋', '1985-05-05', -0.1]]})
            done_, _ = await answer_until_done(80)
            await pg.wait_for_timeout(1500)
            left = await pg.evaluate(drafts_left)
            ok('끝내면 같은 검사자의 다른 진행 정리', done_ and cur and cur not in left and 'smkD7' not in left and 'smkD8' in left,
               f"끝냄 {done_}, 이번 진행 {'남음' if cur in left else '지워짐'}, 남은 진행 {sorted(x for x in left if x.startswith('smk'))}")
            # 바) 예전 창: 같은 진행을 다른 창에서 이어서 끝내면, 예전 창은 돌아왔을 때 멈추고 진행을 되살리지 않는다
            await pg.goto(base + f'test.html?t={DT}')
            await pg.wait_for_selector('[data-act="start"]', timeout=10000)
            await pg.click('[data-act="start"]')
            await pg.fill('#pf-name', '정리넷')
            await pg.fill('#pf-birth', '19900101')
            await pg.check('#pf-consent')
            await pg.click('[data-act="begin"]')
            await pg.wait_for_timeout(300)
            await answer_until_done(20, stop_after=3)
            await pg.wait_for_timeout(1700)
            sid = await pg.evaluate("new URL(location.href).searchParams.get('resume') || ''")
            pg2 = await ctx.new_page()
            pg2.on('pageerror', lambda e: report['errors'].append(f'pageerror (둘째 창) {pg2.url.split("/")[-1]}: {e}'))
            await pg2.goto(base + 'index.html')
            await pg2.evaluate("(() => { const n = Date.now(); sessionStorage.setItem('azit:demo:lock:test', JSON.stringify({at: n, seen: n})); })()")
            await pg2.goto(base + f'test.html?t={DT}&resume={sid}')
            done2 = False
            try:
                await pg2.wait_for_selector('.part-meta .where', timeout=10000)
                done2, _ = await answer_until_done(80, page=pg2)
            except Exception:
                pass
            await pg2.wait_for_timeout(800)
            await pg2.close()
            await pg.evaluate("() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); }")
            await pg.wait_for_timeout(1500)
            msg = await pg.evaluate(toast_text)
            left = await pg.evaluate(drafts_left)
            back = await pg.locator('[data-act="start"]').count()
            await shot('stale-window')
            ok('예전 창 멈춤', sid and done2 and back > 0 and '다른 창이나 기기에서' in msg and sid not in left,
               f"다른 창에서 끝냄 {done2}, 예전 창 {'검사 소개로 돌아감' if back else '그대로'}, 알림 '{msg}', 진행 {'남음' if sid in left else '없음'}")
            # 뒷정리: 이 점검에서 만든 결과와 진행을 지운다 (뒤의 관리 화면 점검에 섞이지 않게)
            await pg.evaluate("""() => {
              const u = JSON.parse(localStorage.getItem('azit:demo:user'));
              const db = JSON.parse(localStorage.getItem('azit:demo:db') || '{}');
              const names = ['정리하나', '정리둘', '정리셋', '정리넷'];
              Object.entries((db.results || {})[u.uid] || {}).forEach(([k, r]) => { if (names.includes(r.name)) delete db.results[u.uid][k]; });
              Object.entries((db.drafts || {})[u.uid] || {}).forEach(([k, d]) => { if (names.includes(d.name)) delete db.drafts[u.uid][k]; });
              localStorage.setItem('azit:demo:db', JSON.stringify(db));
            }""")

            # 상담사 승인과 이름·소속 고치기: 별명으로 온 승인 요청을 흉내 내서, 승인 창에서 이름과 소속을 고쳐 승인하고 다시 고친다
            await unlock('result')
            await pg.evaluate("""() => {
              const db = JSON.parse(localStorage.getItem('azit:demo:db') || '{}');
              db.requests = db.requests || {};
              db.requests['demo-newbie'] = { name: '멍뭉이', email: 'newbie@azit.local', note: '예전 소속', createdAt: Date.now() };
              localStorage.setItem('azit:demo:db', JSON.stringify(db));
            }""")
            member_of = "(uid) => (JSON.parse(localStorage.getItem('azit:demo:db')).members || {})[uid] || null"
            await pg.goto(base + 'admin.html')
            await pg.wait_for_timeout(1500)
            try:
                await pg.click('[data-tab="people"]')  # 승인 요청과 승인된 상담사는 '상담사' 탭에 있다
                await pg.click('li[data-uid="demo-newbie"] [data-req="approve"]')
                await pg.wait_for_selector('#mf-name', timeout=5000)
                await pg.fill('#mf-name', '김새벽')
                await pg.fill('#mf-note', 'AZIT 상담팀')
                await pg.click('.modal-actions [data-i="1"]')
                await pg.wait_for_timeout(1200)
                m = await pg.evaluate(member_of, 'demo-newbie') or {}
                req_left = await pg.evaluate("() => !!((JSON.parse(localStorage.getItem('azit:demo:db')).requests || {})['demo-newbie'])")
                ok('승인하면서 이름·소속 고치기', m.get('name') == '김새벽' and m.get('note') == 'AZIT 상담팀' and not req_left,
                   f"저장된 이름 {m.get('name')}, 소속 {m.get('note')}, 요청 {'남음' if req_left else '지워짐'}")
                await pg.click('[data-uid="demo-newbie"] [data-mem="edit"]')
                await pg.wait_for_selector('#mf-name', timeout=5000)
                await pg.fill('#mf-name', '김새벽별')
                await pg.fill('#mf-note', '')
                await pg.click('.modal-actions [data-i="1"]')
                await pg.wait_for_timeout(1200)
                m = await pg.evaluate(member_of, 'demo-newbie') or {}
                shown = await pg.inner_text('tr[data-uid="demo-newbie"] strong') if await pg.locator('tr[data-uid="demo-newbie"] strong').count() else ''
                ok('상담사 이름·소속 고치기', m.get('name') == '김새벽별' and not m.get('note') and m.get('approvedAt') and '김새벽별' in shown,
                   f"저장된 이름 {m.get('name')}, 소속 '{m.get('note', '')}', 목록 표시 {shown}")
            except Exception as e:
                ok('승인하면서 이름·소속 고치기', False, f'창이 열리지 않음: {str(e)[:80]}')

            # 계정 단계: 담당자는 모든 기능, 관리자는 승인과 모든 결과 보기만, 상담사는 관리 화면에 못 들어온다
            await unlock('result')
            await pg.goto(base + 'admin.html')
            await pg.wait_for_timeout(1500)
            me_uid = await pg.evaluate("JSON.parse(localStorage.getItem('azit:demo:user')).uid")
            owner_line = await pg.inner_text('.role-line') if await pg.locator('.role-line').count() else ''
            owner_tools = [s for s in ('[data-csv]', '[data-admins]', '[data-ia-run]') if not await pg.locator(s).count()]
            ok('담당자 화면', '담당자' in owner_line and not owner_tools, f'없는 기능 {owner_tools}' if owner_tools else ' '.join(owner_line.split())[:40])
            # 다른 상담사 계정의 결과와 승인 기록을 하나 흉내 낸다
            other = await pg.evaluate("""() => {
              const u = JSON.parse(localStorage.getItem('azit:demo:user'));
              const db = JSON.parse(localStorage.getItem('azit:demo:db') || '{}');
              const src = db.results && db.results[u.uid] && Object.values(db.results[u.uid])[0];
              if (!src) return false;
              const rec = { ...src, uid: 'demo-other', email: 'other@azit.local', ownerName: '다른 상담사', name: '다른검사자' };
              delete rec.shareToken;
              db.results['demo-other'] = { 'smoke-other': rec };
              db.members = db.members || {};
              db.members['demo-other'] = { name: '다른 상담사', email: 'other@azit.local', approvedAt: Date.now() };
              localStorage.setItem('azit:demo:db', JSON.stringify(db));
              return true;
            }""")
            if other:
                # 관리 화면 배치: 탭 셋, 상담사별 거르기, 결과 표가 화면 안에 들어오고 '열기'가 보이는지 (휴대폰과 PC 너비)
                await pg.goto(base + 'admin.html')
                await pg.wait_for_timeout(1500)
                tabs = await pg.locator('[data-tab]').count()
                panels_ok = await pg.evaluate("() => !document.querySelector('[data-panel=\"results\"]').hidden && document.querySelector('[data-panel=\"people\"]').hidden")
                await pg.select_option('[data-owner]', 'demo-other')
                await pg.wait_for_timeout(200)
                filtered_rows = await pg.locator('tbody[data-rows] tr[data-key]').count()
                await pg.select_option('[data-owner]', '')
                fits = {}
                for w in (390, 1024):
                    await pg.set_viewport_size({'width': w, 'height': 844 if w == 390 else 800})
                    await pg.wait_for_timeout(300)
                    fits[w] = await pg.evaluate("""(w) => {
                      const wrap = document.querySelector('[data-panel="results"] .table-wrap');
                      const open = document.querySelector('tbody[data-rows] tr[data-key] td.acts a');
                      const r = open && open.getBoundingClientRect();
                      return !!(wrap && r && wrap.scrollWidth <= wrap.clientWidth + 1 && r.right <= w && r.width > 0);
                    }""", w)
                await pg.set_viewport_size({'width': 390, 'height': 844})
                ok('관리 화면 배치', tabs == 3 and panels_ok and filtered_rows == 1 and all(fits.values()),
                   f'탭 {tabs}개, 상담사로 거르면 {filtered_rows}건, 결과 표와 열기 단추가 화면 안에 ' + ', '.join(f"{w}px {'들어옴' if v else '넘침'}" for w, v in fits.items()))
                await pg.goto(base + 'admin.html?demorole=admin')
                await pg.wait_for_timeout(1500)
                line = await pg.inner_text('.role-line') if await pg.locator('.role-line').count() else ''
                shown = [s for s in ('[data-csv]', '[data-admins]', '[data-ia-run]', '[data-fill-birth]') if await pg.locator(s).count()]
                other_acts = await pg.locator('tr[data-key^="demo-other/"] [data-act]').count()
                own_acts = await pg.locator(f'tr[data-key^="{me_uid}/"] [data-act]').count()
                approve_ok = (await pg.locator('#req-t').count() > 0 and await pg.locator('[data-uid="demo-other"] [data-mem="revoke"]').count() > 0
                              and await pg.locator('[data-uid="demo-other"] [data-mem="edit"]').count() > 0)
                ok('관리자 화면', '관리자' in line and not shown and other_acts == 0 and own_acts > 0 and approve_ok,
                   f'담당자 기능 {shown or "없음"}, 다른 계정 결과의 공유·지우기 {other_acts}개, 내 결과 {own_acts}개, 상담사 승인 취소·정보 고치기 {"있음" if approve_ok else "없음"}')
                await pg.goto(base + 'result.html?u=demo-other&r=smoke-other')
                await pg.wait_for_timeout(1500)
                acts = await pg.locator('.report-actions [data-act="share"], .report-actions [data-act="delete"]').count()
                note = await pg.inner_text('.shared-note') if await pg.locator('.shared-note').count() else ''
                drawn = await pg.locator('[data-body] .cover').count()
                ok('다른 계정 결과지 (관리자)', drawn and acts == 0 and '관리자 권한' in note, f'결과지 {"그려짐" if drawn else "안 그려짐"}, 공유·지우기 단추 {acts}개, {note[:40]}')
                await pg.goto(base + 'index.html?demorole=member')
                await pg.wait_for_timeout(1500)
                link_hidden = await pg.locator('[data-admin-link]').is_hidden()
                chip = (await pg.text_content('[data-account] [data-role]') or '').strip() if await pg.locator('[data-account] [data-role]').count() else ''
                await pg.goto(base + 'admin.html')
                await pg.wait_for_timeout(1200)
                gate = (await pg.inner_text('.gate h2')).strip() if await pg.locator('.gate h2').count() else ''
                await pg.goto(base + 'me.html')
                await pg.wait_for_timeout(1200)
                me_ok = pg.url.split('?')[0].endswith('me.html') and await pg.locator('.record').count() > 0
                ok('상담사 계정', link_hidden and chip == '상담사' and gate == '관리 권한이 없어요' and me_ok,
                   f'관리 메뉴 {"숨김" if link_hidden else "보임"}, 계정 표시 {chip or "없음"}, 관리 화면 "{gate}", 내 결과 목록 {"열림" if me_ok else "안 열림"}')
            await browser.close()
    finally:
        srv.terminate()

    report['errors'] = sorted(set(report['errors']))
    if report['errors']:
        report['failed'].append(f'자바스크립트 오류 {len(report["errors"])}건')
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='쉼표로 구분한 검사 id만')
    ap.add_argument('--shots', help='화면 캡처를 남길 폴더')
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--fuzz', type=int, default=160, help='결과지 그리기 점검에서 검사마다 만들 모의 응답 수 (0이면 건너뜀)')
    args = ap.parse_args()

    bad = syntax_check() + css_check()
    report = asyncio.run(run(args))
    if bad:
        report['failed'] = [f'문법 오류: {b}' for b in bad] + report['failed']
    for c in report['checks']:
        print(('✓ ' if c['ok'] else '✗ ') + c['name'] + (f' — {c["detail"]}' if c['detail'] else ''))
    for e in report['errors']:
        print('! ' + e)
    print(json.dumps({'ok': not report['failed'], 'failed': report['failed']}, ensure_ascii=False))
    sys.exit(0 if not report['failed'] else 1)


if __name__ == '__main__':
    main()
