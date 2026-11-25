import { loadTest } from '../registry.js';
import { runTest } from '../runner.js';
import { isDemo } from '../backend.js';
import { brandHTML } from '../ui.js';

const app = document.getElementById('app');
const id = new URLSearchParams(location.search).get('t') || 'enneagram';

(async () => {
  const def = await loadTest(id);
  if (!def) {
    app.innerHTML = `<div class="gate"><a class="brand" href="index.html" style="justify-content:center;color:var(--ink);margin-bottom:18px">${brandHTML()}</a>
      <h1>아직 열리지 않은 검사예요</h1><p>준비가 끝나면 첫 화면에 열려요.</p><a class="btn" href="index.html">처음으로</a></div>`;
    return;
  }
  document.title = `${def.title} 검사 | AZIT : Star&Moon`;
  await runTest(def, app);
  if (isDemo) {
    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.textContent = '체험 모드예요. 로그인과 결과가 이 기기 안에만 저장돼요.';
    app.prepend(bar);
  }
})();
