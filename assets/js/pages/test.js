import { loadTest } from '../registry.js';
import { runTest } from '../runner.js';
import { isDemo, greetingName } from '../backend.js';
import { brandHTML } from '../ui.js';
import { requireApproved } from '../guard.js';
import { requireUnlock, relock } from '../lock.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const id = params.get('t') || 'enneagram';
const resume = params.get('resume');

(async () => {
  relock('result'); // 검사 화면에 들어오면 결과는 다시 잠근다 (검사자에게 기기를 건넬 때)
  const st = await requireApproved();
  if (!st) return;
  await requireUnlock('test', { name: greetingName(st) });
  const def = await loadTest(id);
  if (!def) {
    app.innerHTML = `<div class="gate"><a class="brand" href="index.html" style="justify-content:center;margin-bottom:18px">${brandHTML()}</a>
      <h1>아직 열리지 않은 검사예요</h1><p>준비가 끝나면 첫 화면에 열려요.</p><a class="btn" href="index.html">처음으로</a></div>`;
    return;
  }
  document.title = `${def.title} | AZIT : Star&Moon`;
  await runTest(def, app, { ownerName: greetingName(st), resume: resume === null ? undefined : resume });
  if (isDemo) {
    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.textContent = '체험 모드예요. 로그인과 결과가 이 기기 안에만 저장돼요.';
    app.prepend(bar);
  }
})();
