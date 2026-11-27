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
 4. 검사 결과 목록과 결과지마다: 목차, 스크롤이 막힘 없이 내려가는지, 목차 표시가 따라오는지
 5. 관리 화면이 오류 없이 열리는지, 생년월일 없는 예전 결과(흉내 낸 1건)에 '생년월일 넣기'가 되는지,
    CSV 열이 머리줄과 맞고 '생년월일' 열이 빈칸 없이 채워지는지
 6. 결과지 그리기: 검사마다 여러 모양의 모의 응답(고루, 극단, 무작위, 한쪽 끝, 같은 답)을 채점해서,
    실제 데이터베이스에서 읽어 온 모양(빈 배열·빈 객체가 빠진 상태, backend.js rtdbShape)으로
    결과지(상담사용·공유용), 요약, 짝 읽기를 그려 본다. 무작위 응답만으로는 잘 안 나오는 끝자락 점수도 본다
 7. 상담사 승인 창에서 이름·소속 고치기, 승인된 상담사의 이름·소속 고치기
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


PAIR_IDS = ('attachment', 'godattach')  # 같은 이름으로 해서 종합 결과지의 짝 읽기를 확인한다

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
  return { out, pairFails };
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
                store = 'sessionStorage' if kind == 'test' else 'localStorage'
                await pg.evaluate(f"(() => {{ const n = Date.now(); {store}.setItem('azit:lock:{kind}', JSON.stringify({{at: n, seen: n}})); }})()")

            async def shot(name):
                if shots:
                    await pg.screenshot(path=str(shots / f'{name}.png'))

            # 로그인 (체험 모드 담당자: 모든 기능)
            await pg.goto(base + 'login.html?demo=1&demorole=owner')
            await pg.wait_for_selector('[data-login]', timeout=8000)
            await pg.click('[data-login]')
            await pg.wait_for_timeout(1200)
            await unlock('test')
            await pg.goto(base + 'index.html')
            await pg.wait_for_timeout(1200)
            ok('첫 화면 인사', 'greet' in (await pg.get_attribute('[data-greet]', 'class') or ''), await pg.inner_text('[data-greet]'))
            await shot('home')
            tabs = await pg.locator('#bundles [role="tab"]').count()
            steps = await pg.eval_on_selector_all('#bundles .bd-step', 'els => els.map(e => e.getAttribute("href"))')
            ok('고민별 추천 묶음', tabs >= 1 and steps and all('&b=' in h for h in steps), f'묶음 {tabs}개, 첫 묶음 검사 {len(steps)}개')

            tests = await pg.evaluate("import('./assets/js/registry.js').then(m => m.TESTS.filter(t => t.status === 'open').map(t => ({id: t.id, title: t.title, items: t.items})))")
            if args.only:
                want = set(args.only.split(','))
                tests = [t for t in tests if t['id'] in want]
            ok('열린 검사 목록', len(tests) > 0, ', '.join(t['id'] for t in tests))

            async def answer_until_done(limit, stop_after=None):
                answered = 0
                for _ in range(limit):
                    if await pg.locator('.done').count():
                        return True, answered
                    if await pg.locator('[data-act="retry"]').count():
                        return False, answered
                    if stop_after is not None and answered >= stop_after and await pg.locator('.part-meta .where').count():
                        return None, answered
                    if await pg.locator('[data-act="enter"]').count():
                        await pg.click('[data-act="enter"]')
                        await pg.wait_for_timeout(220)
                        continue
                    n_likert = await pg.locator('[data-likert]').count()
                    if n_likert:
                        await pg.keyboard.press(str(rnd.randint(1, n_likert)))
                        answered += 1
                        await pg.wait_for_timeout(240)
                        continue
                    if await pg.locator('.pair-opt').count():
                        await pg.keyboard.press(str(rnd.randint(1, 4)))
                        answered += 1
                        await pg.wait_for_timeout(240)
                        continue
                    if await pg.locator('.write-input').count():
                        # 글로 답하기: 대부분은 짧게 적고, 가끔은 건너뛴다
                        if rnd.random() < 0.8:
                            await pg.fill('.write-input', f'점검용 글 {answered + 1}\n둘째 줄')
                            await pg.click('[data-act="text-next"]')
                        else:
                            await pg.click('[data-act="text-skip"]')
                        answered += 1
                        await pg.wait_for_timeout(400)
                        continue
                    if await pg.locator('[data-rank-key]').count():
                        await pg.keyboard.press('1')
                        await pg.wait_for_timeout(120)
                        await pg.keyboard.press('2')
                        answered += 1
                        await pg.wait_for_timeout(650)
                        continue
                    await pg.wait_for_timeout(300)
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
                await pg.click('li[data-uid="demo-newbie"] [data-mem="edit"]')
                await pg.wait_for_selector('#mf-name', timeout=5000)
                await pg.fill('#mf-name', '김새벽별')
                await pg.fill('#mf-note', '')
                await pg.click('.modal-actions [data-i="1"]')
                await pg.wait_for_timeout(1200)
                m = await pg.evaluate(member_of, 'demo-newbie') or {}
                shown = await pg.inner_text('li[data-uid="demo-newbie"] strong') if await pg.locator('li[data-uid="demo-newbie"] strong').count() else ''
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
                await pg.goto(base + 'admin.html?demorole=admin')
                await pg.wait_for_timeout(1500)
                line = await pg.inner_text('.role-line') if await pg.locator('.role-line').count() else ''
                shown = [s for s in ('[data-csv]', '[data-admins]', '[data-ia-run]', '[data-fill-birth]') if await pg.locator(s).count()]
                other_acts = await pg.locator('tr[data-key^="demo-other/"] [data-act]').count()
                own_acts = await pg.locator(f'tr[data-key^="{me_uid}/"] [data-act]').count()
                approve_ok = (await pg.locator('#req-t').count() > 0 and await pg.locator('li[data-uid="demo-other"] [data-mem="revoke"]').count() > 0
                              and await pg.locator('li[data-uid="demo-other"] [data-mem="edit"]').count() > 0)
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
