#!/usr/bin/env python3
"""AZIT : Star&Moon 점검 스크립트 (체험 모드로 사이트 전체를 한 바퀴 돌린다)

    python3 tools/smoke.py            # 결과를 출력하고, 문제가 있으면 종료 코드 1
    python3 tools/smoke.py --only schema,attachment
    python3 tools/smoke.py --shots /tmp/azit-shots   # 화면 캡처도 남긴다

하는 일
 1. 모든 .js 파일 문법 검사 (node --check)
 2. 이 폴더를 로컬 서버로 띄우고, 체험 모드 관리자 계정으로 로그인
    (잠금 화면은 코드를 쓰지 않고 '열린 상태'를 저장소에 직접 적어서 넘긴다. 코드는 저장소에 두지 않는다)
 3. 열린 검사를 하나씩 끝까지 무작위로 답해서 '검사 결과가 전송되었습니다'까지 확인
    - 첫 검사는 중간에 '저장하고 나가기' → 첫 화면 '이어서 할 검사' → 이어서 하기까지 확인
 4. 검사 결과 목록과 결과지마다: 목차, 스크롤이 막힘 없이 내려가는지, 목차 표시가 따라오는지
 5. 관리 화면이 오류 없이 열리는지
 6. 모든 화면의 자바스크립트 오류 수집

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

            # 로그인 (체험 모드 관리자)
            await pg.goto(base + 'login.html?demo=1&demorole=admin')
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

            # 관리 화면 + CSV 내려받기(열 수가 머리줄과 모두 같은지)
            await unlock('result')
            await pg.goto(base + 'admin.html')
            await pg.wait_for_timeout(1500)
            ok('관리 화면', await pg.locator('main').count() > 0)
            await shot('admin')
            if await pg.locator('[data-csv]').count():
                import csv, io
                async with pg.expect_download(timeout=10000) as dl:
                    await pg.click('[data-csv]')
                path = await (await dl.value).path()
                text = pathlib.Path(path).read_text(encoding='utf-8-sig')
                rows = list(csv.reader(io.StringIO(text)))
                head = rows[0] if rows else []
                bad = [i for i, r in enumerate(rows[1:], 1) if len(r) != len(head)]
                ok('관리 CSV 열 맞춤', rows and not bad, f'머리줄 {len(head)}열, 결과 {len(rows) - 1}줄' + (f', 어긋난 줄 {bad[:5]}' if bad else ''))
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
