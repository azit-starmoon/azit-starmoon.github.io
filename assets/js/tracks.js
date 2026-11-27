// AZIT : Star&Moon — 다시 한 검사 이어 보기 (종합 결과지의 '달라진 점')
// 한 검사자가 같은 검사를 두 번 이상 했을 때, 핵심 점수를 날짜 순서로 놓고 바로 앞 결과와 비교한다. DOM에는 손대지 않는다.
//
// TRACKS의 한 줄이 이어 볼 흐름 하나다. tests에 검사 여럿을 넣으면 같은 문장·같은 계산인 점수를 한 줄로 잇는다
// (감각처리 민감성 검사 2부 '요즘의 나'와 요즘의 나 체크). 채점 판(version)이 바뀐 이전 결과는 잇지 않는다.
//
// '비슷함' 폭: 같은 사람이 다시 해도 점수는 문항 잡음만큼 움직인다. tools/validate.mjs와 같은 모의 응답 모형
// (λ=0.7, 5점 척도)에서 두 회차 점수 차이의 표준편차는 약 25/√(문항 수)점이었다(6문항 10.3, 10문항 8.0, 24문항 5.2).
// 그보다 작은 차이는 '비슷함'으로 적는다(가장 좁아도 5점). 실제 사람의 재검사 자료가 아니라 모형으로 어림한 폭이다.
// 새 검사를 열면 여기 한 줄을 더한다(점수 자리와 문항 수). 없으면 결과 요약 첫머리만 날짜순으로 보여 준다.
import { esc, fmtDate } from './ui.js';

export const bandOf = (n) => Math.max(5, Math.round(25 / Math.sqrt(n || 1)));
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const sc = (o, k) => (o && o[k] && num(o[k].score) ? o[k].score : undefined);
const head = (r) => String(r.summary || '').split(' (')[0].trim();
const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const topic = (w) => `${w}${hasBatchim(w) ? '은' : '는'}`;
const STATE_NAME = { overload: '과부하', holding: '버티는 중', bloom: '잘 피어나는 중', dry: '채움이 필요함' };
const m = (k, name, n, get) => ({ k, name, n, get });
// 날짜 칩은 짧게: 가장 최근 결과와 같은 해면 '11월 27일', 다른 해면 '2025년 11월 27일'
const dayOf = (ts, year) => { const d = new Date(ts || 0); return `${d.getFullYear() === year ? '' : `${d.getFullYear()}년 `}${d.getMonth() + 1}월 ${d.getDate()}일`; };

export const TRACKS = [
  {
    id: 'now',
    title: '요즘의 나',
    tests: ['hsp', 'hspnow'],
    joined: '감각처리 민감성 검사 2부와 요즘의 나 체크는 같은 문장, 같은 계산이라 한 줄로 이었어요.',
    label: (r) => STATE_NAME[(r.scores || {}).state] || '',
    metrics: [m('load', '부담 신호', 6, (s) => s.load), m('rest', '회복 자원', 6, (s) => s.rest)],
    // 무엇이 오르내렸는지는 앞 문장이 말하므로, 여기서는 그 움직임이 뜻하는 쪽과 해 볼 것만 덧붙인다
    // (부담은 줄고 회복은 느는 쪽이 숨 쉴 틈이 넓어지는 쪽)
    read: (d) => {
      const L = Math.sign(d.load || 0);
      const R = Math.sign(d.rest || 0);
      if (d.load === undefined || d.rest === undefined) return '';
      return ({
        '-1,1': '숨 쉴 틈이 넓어지는 쪽으로 움직였어요. 무엇이 달라졌는지 적어 두면, 다음에 지칠 때 다시 꺼내 쓸 수 있어요.',
        '-1,0': '무엇이 줄었는지 적어 두면, 다음에 비슷한 부담이 올 때 도움이 돼요.',
        '0,1': '새로 생긴 자원이 무엇인지 적어 두면 좋아요.',
        '1,-1': '더 지치는 쪽으로 움직였어요. 줄이거나 미룰 수 있는 일이 있는지 먼저 살펴 주세요.',
        '1,0': '회복 시간을 지키면서, 줄이거나 나눌 수 있는 일이 있는지 살펴 주세요.',
        '0,-1': '예전에 나를 채워 주던 것 가운데 다시 할 수 있는 것을 하나 골라 보세요.',
        '1,1': '늘어난 자원이 커진 부담을 버텨 주고 있는지 살펴보세요.',
        '-1,-1': '조용해진 만큼 나를 채우는 시간도 줄지 않았는지 살펴보세요.',
      })[`${L},${R}`] || '';
    },
  },
  {
    id: 'hsp',
    title: '감각처리 민감성',
    tests: ['hsp'],
    metrics: [m('total', '민감성', 40, (s) => s.total), m('d', '깊이 생각하기', 10, (s) => sc(s.facets, 'd')), m('o', '쉽게 벅참', 10, (s) => sc(s.facets, 'o')), m('e', '감정의 울림', 10, (s) => sc(s.facets, 'e')), m('s', '미세한 감지', 10, (s) => sc(s.facets, 's'))],
  },
  {
    id: 'attachment',
    title: '성인 애착',
    tests: ['attachment'],
    metrics: [m('anx', '애착 불안', 16, (s) => s.anx), m('avo', '애착 회피', 16, (s) => s.avo)],
    more: [
      ['A1', '버림받을 걱정'], ['A2', '확인받고 싶은 마음'], ['A3', '관계에 쏠리는 마음'], ['A4', '흔들리는 자기 가치'],
      ['V1', '가까움이 불편함'], ['V2', '기대기 어려움'], ['V3', '속마음 닫기'], ['V4', '힘들 때 물러남'],
    ].map(([k, name]) => m(k, name, 4, (s) => sc(s.facets, k))),
  },
  {
    id: 'rumination',
    title: '곱씹기와 돌아보기',
    tests: ['rumination'],
    metrics: [m('br', '곱씹기', 8, (s) => s.br), m('rf', '돌아보기', 8, (s) => s.rf)],
  },
  {
    id: 'interpersonal',
    title: '대인관계 패턴',
    tests: ['interpersonal'],
    metrics: [m('elev', '관계의 어려움', 40, (s) => s.elev)],
    moreLabel: '방향별 점수도 보기',
    more: [['pa', '이끌고 정하려 함'], ['bc', '의심하고 맞섬'], ['de', '마음을 닫고 거리 둠'], ['fg', '다가가기 망설임'], ['hi', '내 뜻을 말하기 어려움'], ['jk', '쉽게 맞춰 주고 휘둘림'], ['lm', '남을 챙기느라 나를 잊음'], ['no', '가까워지려 지나치게 다가감']].map(([k, name]) => m(k, name, 5, (s) => sc(s.octants, k))),
  },
  {
    id: 'godattach',
    title: '신앙 애착',
    tests: ['godattach'],
    metrics: [m('an', '하나님과의 불안', 12, (s) => s.an), m('av', '하나님과의 회피', 12, (s) => s.av)],
  },
  {
    id: 'bigfive',
    title: '성격 5요인',
    tests: ['bigfive'],
    metrics: [['O', '개방성'], ['C', '성실성'], ['E', '외향성'], ['A', '친화성'], ['N', '신경성']].map(([k, name]) => m(k, name, 24, (s) => sc(s.domains, k))),
  },
  {
    id: 'temperament',
    title: '기질과 성품',
    tests: ['temperament'],
    metrics: [['ns', '자극 추구'], ['ha', '위험 회피'], ['rd', '사회적 민감성'], ['ps', '인내력'], ['sd', '자율성'], ['co', '연대감'], ['st', '자기 초월']].map(([k, name]) => m(k, name, 8, (s) => sc(s.dims, k))),
  },
  {
    id: 'esteem',
    title: '자아존중감',
    tests: ['esteem'],
    metrics: [m('worth', '자기 가치감', 10, (s) => s.worth), m('compassion', '나를 대하는 방식', 24, (s) => s.compassion)],
    more: [['kind', '나에게 친절하기'], ['common', '누구나 그렇다고 알기'], ['mind', '균형 있게 바라보기']].map(([k, name]) => m(k, name, 8, (s) => sc(s.self, k))),
  },
  {
    id: 'emotion',
    title: '정서 조절 역량',
    tests: ['emotion'],
    metrics: [m('total', '조절하는 힘', 36, (s) => s.total)],
    more: [['aw', '알아차림'], ['cl', '이해'], ['ac', '받아들임'], ['im', '충동 다스리기'], ['go', '목표 지키기'], ['st', '조절 방법']].map(([k, name]) => m(k, name, 6, (s) => sc(s.skills, k))),
  },
  {
    id: 'coping',
    title: '스트레스 대처',
    tests: ['coping'],
    metrics: [m('problem', '문제 다루기', 15, (s) => (s.groups || {}).problem), m('heart', '마음 다루기', 15, (s) => (s.groups || {}).heart), m('away', '물러서기', 10, (s) => (s.groups || {}).away)],
  },
  {
    id: 'resilience',
    title: '회복탄력성',
    tests: ['resilience'],
    metrics: [m('total', '회복탄력성', 45, (s) => s.total), m('self', '자기 조절력', 15, (s) => (s.domains || {}).self), m('rel', '대인 관계력', 15, (s) => (s.domains || {}).rel), m('pos', '긍정성', 15, (s) => (s.domains || {}).pos)],
  },
  {
    id: 'differentiation',
    title: '자아분화',
    tests: ['differentiation'],
    metrics: [m('total', '분화 지수', 32, (s) => s.total)],
    more: [['ip', '내 입장 지키기'], ['er', '감정 반응성'], ['ec', '감정적 단절'], ['fo', '타인과의 융합']].map(([k, name]) => m(k, name, 8, (s) => sc(s.facets, k))),
  },
  {
    id: 'lifestory',
    title: '삶의 의미',
    tests: ['lifestory'],
    metrics: [m('pr', '의미를 느끼는 정도', 5, (s) => s.pr), m('se', '의미를 찾는 정도', 5, (s) => s.se)],
  },
];

// 같은 검사자의 결과 목록(아무 순서) → 두 번 이상 이어진 흐름들. 각 흐름의 점은 오래된 것부터.
export function buildTracks(list) {
  const out = [];
  const used = new Set();
  const byTest = new Map();
  list.forEach((r) => { if (!byTest.has(r.testId)) byTest.set(r.testId, []); byTest.get(r.testId).push(r); });
  // 채점 판이 바뀐 이전 결과는 잇지 않는다: 검사마다 가장 최근 결과의 판만 남긴다
  let dropped = 0;
  const same = new Map([...byTest].map(([id, rs]) => {
    const newest = [...rs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    const keep = rs.filter((r) => String(r.version || '') === String(newest.version || ''));
    dropped += rs.length - keep.length;
    return [id, keep];
  }));
  TRACKS.forEach((t) => {
    const pts = t.tests.flatMap((id) => same.get(id) || []).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    t.tests.forEach((id) => { if (pts.some((r) => r.testId === id)) used.add(id); });
    if (pts.length < 2) return;
    out.push({ track: t, pts, mixed: new Set(pts.map((r) => r.testId)).size > 1 });
  });
  // 흐름이 정해지지 않은 검사: 결과 요약 첫머리만 날짜순으로
  [...same].forEach(([id, rs]) => {
    if (used.has(id) || rs.length < 2) return;
    out.push({ track: { id, title: '', tests: [id], metrics: [] }, pts: [...rs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), mixed: false });
  });
  return { tracks: out, dropped };
}

// 바로 앞 결과와의 차이(-, +)를 '비슷함' 폭으로 거른 값. 폭 안쪽이면 0
export function changeOf(metric, prev, last) {
  const a = metric.get((prev || {}).scores || {});
  const b = metric.get((last || {}).scores || {});
  if (!num(a) || !num(b)) return { a, b, d: undefined, shown: undefined };
  const d = b - a;
  return { a, b, d, shown: Math.abs(d) < bandOf(metric.n) ? 0 : d };
}

// 0~100 고정 눈금의 작은 꺾은선. 점마다 날짜와 값을 title로 남겨 마우스를 올리면 보인다
function spark(metric, pts, testTitle, year) {
  const W = 132;
  const H = 36;
  const pad = 5;
  const vals = pts.map((r) => metric.get(r.scores || {}));
  const idx = vals.map((v, i) => (num(v) ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) return '<span class="pp-spark pp-spark--na" aria-hidden="true"></span>';
  const X = (i) => pad + ((W - 2 * pad) * i) / Math.max(1, pts.length - 1);
  const Y = (v) => pad + (H - 2 * pad) * (1 - Math.max(0, Math.min(100, v)) / 100);
  const line = idx.map((i) => `${X(i).toFixed(1)},${Y(vals[i]).toFixed(1)}`).join(' ');
  const dots = idx.map((i) => {
    const last = i === idx[idx.length - 1];
    return `<circle cx="${X(i).toFixed(1)}" cy="${Y(vals[i]).toFixed(1)}" r="${last ? 4 : 3}" class="${last ? 'is-last' : ''}"><title>${esc(dayOf(pts[i].createdAt, year))}${esc(testTitle(pts[i]))}: ${vals[i]}</title></circle>`;
  }).join('');
  return `<svg class="pp-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(metric.name)}: ${idx.map((i) => vals[i]).join(', ')}">
    <line class="mid" x1="${pad}" x2="${W - pad}" y1="${Y(50).toFixed(1)}" y2="${Y(50).toFixed(1)}"/>
    <polyline points="${line}"/>${dots}
  </svg>`;
}

const chip = (c) => {
  if (c.shown === undefined) return '<span class="pp-d pp-d--na">비교 못 함</span>';
  if (c.shown === 0) return '<span class="pp-d pp-d--same">비슷함</span>';
  return `<span class="pp-d pp-d--${c.shown > 0 ? 'up' : 'down'}"><b aria-hidden="true">${c.shown > 0 ? '▲' : '▼'}</b>${Math.abs(c.shown)}<span class="sr-only">${c.shown > 0 ? '점 올랐어요' : '점 내려갔어요'}</span></span>`;
};

function rows(metrics, pts, testTitle) {
  const prev = pts[pts.length - 2];
  const last = pts[pts.length - 1];
  const year = new Date(last.createdAt || 0).getFullYear();
  return `<ul class="pp-trows">${metrics.map((mt) => {
    const c = changeOf(mt, prev, last);
    return `<li>
      <span class="nm">${esc(mt.name)}</span>
      ${spark(mt, pts, testTitle, year)}
      <span class="vals">${num(c.a) ? c.a : '–'}<i aria-hidden="true">→</i>${num(c.b) ? c.b : '–'}</span>
      ${chip(c)}
    </li>`;
  }).join('')}</ul>`;
}

// 바뀐 점수를 한 문장으로: "지난번보다 부담 신호는 올랐고, 회복 자원은 내려갔어요. 나머지는 비슷해요."
function sentence(metrics, pts) {
  const prev = pts[pts.length - 2];
  const last = pts[pts.length - 1];
  const cs = metrics.map((mt) => [mt, changeOf(mt, prev, last)]).filter(([, c]) => c.shown !== undefined);
  if (!cs.length) return '';
  const up = cs.filter(([, c]) => c.shown > 0).map(([mt]) => mt.name);
  const down = cs.filter(([, c]) => c.shown < 0).map(([mt]) => mt.name);
  const rest = cs.length - up.length - down.length;
  if (!up.length && !down.length) return cs.length > 1 ? '지난번과 비교해 점수가 모두 비슷해요.' : `지난번과 비교해 ${topic(cs[0][0].name)} 비슷해요.`;
  // 둘이면 '부담 신호와 회복 자원은', 셋 이상이면 '외향성, 신경성, 성실성은'
  const names = (a) => (a.length === 2 ? `${a[0]}${hasBatchim(a[0]) ? '과' : '와'} ${topic(a[1])}` : `${a.slice(0, -1).map((x) => `${x}, `).join('')}${topic(a[a.length - 1])}`);
  const bits = [];
  if (up.length) bits.push(`${names(up)} 올랐${down.length ? '고' : '어요'}`);
  if (down.length) bits.push(`${names(down)} 내려갔어요`);
  return `지난번보다 ${bits.join(', ')}.${rest ? ' 나머지는 비슷해요.' : ''}`;
}

// 흐름 하나를 카드로. meta(id)는 검사 정의(registry)를 돌려준다
export function renderTrack({ track: t, pts, mixed }, meta) {
  const prev = pts[pts.length - 2];
  const last = pts[pts.length - 1];
  const title = t.title || meta(t.tests[0]).title;
  const testTitle = (r) => (mixed ? ` (${meta(r.testId).title})` : '');
  const labelOf = t.label || head;
  const shown = pts.slice(-5);
  const year = new Date(last.createdAt || 0).getFullYear();
  const labels = `<ol class="pp-tl">${pts.length > shown.length ? `<li class="more">앞선 ${pts.length - shown.length}번</li>` : ''}${shown.map((r) => `<li><time>${esc(dayOf(r.createdAt, year))}</time><span>${esc(labelOf(r) || '–')}</span>${mixed ? `<small>${esc(meta(r.testId).title)}</small>` : ''}</li>`).join('')}</ol>`;
  const when = `${esc(fmtDate(pts[0].createdAt))}부터 ${pts.length}번`;
  let body = '';
  if (t.metrics.length) {
    const deltas = Object.fromEntries(t.metrics.map((mt) => [mt.k, changeOf(mt, prev, last).shown]));
    const read = t.read ? t.read(deltas) : '';
    body = `${rows(t.metrics, pts, testTitle)}
      <p class="pp-tread">${esc(sentence(t.metrics, pts))}${read ? ` ${esc(read)}` : ''}</p>
      ${t.more && t.more.length ? `<details class="pp-tmore"><summary>${esc(t.moreLabel || '갈래별 점수도 보기')}</summary>${rows(t.more, pts, testTitle)}</details>` : ''}`;
  } else {
    body = '<p class="pp-tread">결과 요약의 첫머리를 날짜순으로 놓았어요. 점수는 각 결과지에서 비교해 보세요.</p>';
  }
  return `<article class="pp-trend">
    <div class="pp-trend-h"><h3>${esc(title)}</h3><p>${when}</p></div>
    ${labels}
    ${body}
    ${mixed && t.joined ? `<p class="pp-note">${esc(t.joined)}</p>` : ''}
  </article>`;
}
