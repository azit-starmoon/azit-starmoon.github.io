# AZIT : Star&Moon

마음의 지도를 그려 보는 작은 검사실이에요.
지인들이 구글 계정으로 로그인해 검사를 하고, 결과지는 본인과 관리자가 다시 볼 수 있게 보관돼요.

- 사이트: https://petter350329-creator.github.io/azit-starmoon/
- 호스팅: GitHub Pages (이 저장소의 `main` 브랜치 루트)
- 로그인과 저장: Firebase Authentication(구글) + Realtime Database (`azit-starmoon` 프로젝트)

## 지금 열려 있는 검사

| 검사 | 문항 | 결과지 |
|---|---|---|
| 에니어그램 | 117문항(성향 90, 동기 비교 18, 본능 9) | 핵심 유형과 확신도, 날개, 트라이타입, 세 중심, 본능과 하위유형 27가지, 성장과 스트레스, 관계와 일, 행동 방식 그룹, 응답 경향 |

에니어그램 2부는 1부에서 가장 높게 나온 세 유형의 동기(두려움, 바라는 것, 주의, 아픈 말, 힘들 때, 듣고 싶은 말)를 서로 맞대는 적응형 문항이에요. 최종 점수는 1부 45%, 2부 55%로 합쳐요.
문항과 해설은 모두 이 사이트를 위해 새로 쓴 것이고, 다른 검사지의 문항을 옮겨 오지 않았어요.

## 처음 설정 (한 번만)

1. Firebase 콘솔 → Authentication → 로그인 방법 → **Google 사용**
2. Authentication → 설정 → 승인된 도메인 → `petter350329-creator.github.io` 추가
3. Realtime Database → 규칙 → [`firebase/database.rules.json`](firebase/database.rules.json) 내용을 붙여넣고 **게시**
4. 사이트에 구글로 로그인 → 상단 **관리** 페이지(또는 `admin.html`) → **이 계정을 첫 관리자로 등록하기**
   - 관리자가 한 명도 없을 때만 등록돼요. 그래서 사이트를 연 사람이 가장 먼저 해야 해요.
   - 이후 관리자는 관리 페이지의 **관리자 지정**에서 다른 사람을 추가하거나 해제할 수 있어요.

## 권한

| 누가 | 할 수 있는 것 |
|---|---|
| 응시자 | 자기 결과만 보기, 공유 링크 만들기·멈추기, 자기 결과 지우기 |
| 관리자 | 모든 결과 보기, 어떤 결과든 공유 링크 만들기·멈추기, 결과 지우기, CSV 내려받기, 관리자 지정 |
| 공유 링크를 받은 사람 | 로그인 없이 그 결과지 하나만 보기 |

## 체험 모드

주소 끝에 `?demo=1`을 붙이면 Firebase 없이 이 기기 안에서만 로그인과 저장이 동작해요. 화면 위에 노란 띠가 보이면 체험 모드예요.
`?demo=0`을 붙이면 원래대로 돌아와요.

## 폴더 구조

```
index.html  test.html  result.html  me.html  admin.html
assets/
  css/style.css          공통 디자인 (색, 글꼴, 결과지, 인쇄용 스타일)
  js/config.js           Firebase 설정
  js/backend.js          로그인, 결과 저장·조회, 공유 링크, 관리자
  js/runner.js           검사 진행 엔진 (소개 → 동의 → 부별 문항 → 저장)
  js/charts.js           별자리 도형, 막대 그래프
  js/registry.js         검사 목록 (준비 중인 검사 포함)
  js/ui.js               헤더, 모달, 토스트, 카카오톡 인앱 브라우저 처리
  js/pages/*.js          각 페이지 스크립트
tests/
  enneagram/
    items.js             문항
    scoring.js           채점
    content-types.js     아홉 유형 해설
    content-extra.js     날개, 트라이타입, 중심, 본능, 하위유형, 그룹 해설
    report.js            결과지
    index.js             검사 정의
firebase/database.rules.json
```

## 새 검사를 추가할 때

1. `tests/<검사 id>/index.js`에서 아래 모양의 객체를 내보내요.
   - `id`, `version`, `title`, `intro`
   - `parts`: 부마다 `kind`(`likert` / `pair` / `rank`), `items` 또는 `build(answers)`, `count`
   - `score(answers, meta)`, `summary(scores)`, `glyph(scores)`, `render(element, record, ctx)`
2. `assets/js/registry.js`에서 그 검사의 `status`를 `'open'`으로 바꿔요.

진행 화면, 로그인, 저장, 결과 공유, 관리자 화면은 공통이라 따로 만들 필요가 없어요.

## 데이터 구조 (Realtime Database)

```
admins/{uid}: true
users/{uid}: { name, email, photo, updatedAt }
results/{uid}/{resultId}: { testId, version, name, email, uid, answers, scores, summary, durationSec, createdAt, shareToken? }
shares/{token}: { ownerUid, resultId, createdBy, createdAt, payload: { testId, version, name, createdAt, scores } }
```
