# AZIT : Star&Moon

마음의 지도를 그려 보는 상담 검사실이에요.
승인된 상담사가 구글 계정으로 로그인해 검사자에게 검사를 진행하고, 결과는 상담사 계정으로 전송돼요.
검사자는 결과를 바로 보지 않고, 상담사가 '검사 결과'에서 따로 열어 봐요.

- 사이트: https://petter350329-creator.github.io/azit-starmoon/
- 호스팅: GitHub Pages (이 저장소의 `main` 브랜치 루트)
- 로그인과 저장: Firebase Authentication(구글) + Realtime Database (`azit-starmoon` 프로젝트)

## 지금 열려 있는 검사

| 검사 | 문항 | 결과지 |
|---|---|---|
| 한국형 성향검사 | 117문항(성향 90, 동기 비교 18, 본능 9) | 핵심 유형과 확신도, 날개, 트라이타입, 세 중심, 본능과 하위유형 27가지, 성장과 스트레스, 관계와 일, 행동 방식 그룹, 응답 경향 |
| 빅파이브 성격검사 | 120문항(1부 60, 2부 60) | 다섯 영역 점수와 별 모양 프로필, 하위 요인 30개, 두 영역을 엮은 스타일 10가지, 관계와 일, 두드러진 특징, 성장 제안, 응답 점검 |

- 한국형 성향검사는 아홉 유형 이론(에니어그램)을 바탕으로 한 검사예요. 2부는 1부에서 가장 높게 나온 세 유형의 동기(두려움, 바라는 것, 주의, 아픈 말, 힘들 때, 듣고 싶은 말)를 서로 맞대는 적응형 문항이고, 최종 점수는 1부 45%, 2부 55%로 합쳐요. 문항과 해설은 이 사이트를 위해 새로 썼어요.
- 빅파이브 성격검사는 저작권 없는 공개 문항 풀 IPIP의 120문항 구성(하위 요인 30개 × 4문항)을 한국어로 옮겼어요. '가치 개방성' 하위 요인은 원문의 미국 정치 문항 대신 관습과 권위에 대한 태도를 묻는 문항으로 바꿨어요. 점수는 응답을 0~100으로 환산한 값이고, 60 초과는 높음, 40 미만은 낮음으로 읽어요(표준화 규준이 아니라 척도 중앙값 기준).

## 처음 설정 (한 번만)

1. Firebase 콘솔 → Authentication → 로그인 방법 → **Google 사용**
2. Authentication → 설정 → 승인된 도메인 → `petter350329-creator.github.io` 추가
3. Realtime Database → 규칙 → [`firebase/database.rules.json`](firebase/database.rules.json) 내용을 붙여넣고 **게시**
4. 사이트에 구글로 로그인 → 주소창에 `admin.html`을 열고 → **이 계정을 첫 관리자로 등록하기**
   - 관리자가 한 명도 없을 때만 등록돼요. 그래서 사이트를 연 사람이 가장 먼저 해야 해요.
   - 관리자 계정은 승인 없이 바로 이용할 수 있어요.
   - 이후 관리자는 관리 페이지의 **관리자 지정**에서 다른 사람을 추가하거나 해제할 수 있어요.

## 이용 흐름

1. **로그인** (`login.html`): 구글로 로그인해요. 승인되지 않은 계정은 이름과 소속(선택)을 적어 **요청 보내기**를 눌러요.
2. **승인**: 관리자가 관리 페이지의 **승인 요청**에서 승인하거나 거절해요. 승인된 계정은 **승인된 상담사** 목록에 올라가고, 언제든 승인을 취소할 수 있어요.
3. **첫 화면**: "반갑습니다 ○○○ 상담사님!" 인사와 함께 검사를 골라요. 이름은 승인 요청에 적은 이름을 써요.
4. **검사**: 시작할 때마다 **검사자 이름**을 새로 적어요. 한 계정으로 여러 사람을 검사할 수 있어요. 중간에 멈추면 그 기기에서 "○○ 님 검사 이어서 하기"로 이어 갈 수 있어요.
5. **끝**: 결과 대신 "검사 결과가 전송되었습니다"가 떠요. **다음 검사 시작하기**나 **처음으로**만 있고, 결과로 가는 길은 없어요.
6. **검사 결과** (`me.html`): 상담사가 검사자 이름으로 찾아 결과지를 열고, 공유 링크를 만들거나 지워요.

## 권한

| 누가 | 할 수 있는 것 |
|---|---|
| 승인 전 계정 | 승인 요청 보내기·취소하기 (검사와 결과에는 들어갈 수 없음) |
| 승인된 상담사 | 검사 진행, 자기 계정으로 전송된 결과 보기, 공유 링크 만들기·멈추기, 결과 지우기 |
| 관리자 | 상담사 승인·거절·승인 취소, 모든 결과 보기, 어떤 결과든 공유·지우기, CSV 내려받기, 관리자 지정 |
| 공유 링크를 받은 사람 | 로그인 없이 그 결과지 하나만 보기 |

승인 여부는 화면뿐 아니라 Realtime Database 보안 규칙에서도 막아요. 승인이 취소된 계정은 더 이상 결과를 저장하거나 읽을 수 없고, 이미 저장된 결과는 관리자가 계속 볼 수 있어요.

## 체험 모드

주소 끝에 `?demo=1`을 붙이면 Firebase 없이 이 기기 안에서만 로그인과 저장이 동작해요. 화면 위에 노란 띠가 보이면 체험 모드예요.
`?demo=0`을 붙이면 원래대로 돌아와요.
체험 모드에서 `?demorole=user`를 붙이면 승인 전 계정처럼, `?demorole=admin`을 붙이면 관리자처럼 움직여요.

## 폴더 구조

```
login.html  index.html  test.html  result.html  me.html  admin.html
assets/
  css/style.css          공통 디자인 (색, 글꼴, 결과지, 인쇄용 스타일)
  js/config.js           Firebase 설정
  js/backend.js          로그인, 승인 요청·승인, 결과 저장·조회, 공유 링크, 관리자
  js/guard.js            승인된 계정만 들어오게 하는 문지기 (아니면 login.html로)
  js/runner.js           검사 진행 엔진 (소개 → 검사자 이름·동의 → 부별 문항 → 전송 완료)
  js/charts.js           별자리 도형, 막대 그래프
  js/registry.js         검사 목록 (준비 중인 검사 포함)
  js/ui.js               헤더, 모달, 토스트, 카카오톡 인앱 브라우저 처리
  js/pages/*.js          각 페이지 스크립트
tests/
  enneagram/             한국형 성향검사 (주소에는 t=enneagram으로 남겨 둠)
    items.js             문항
    scoring.js           채점
    content-types.js     아홉 유형 해설
    content-extra.js     날개, 트라이타입, 중심, 본능, 하위유형, 그룹 해설
    report.js            결과지
    index.js             검사 정의
  bigfive/
    items.js             IPIP 기반 120문항, 역채점 표시
    scoring.js           채점, 스타일 10가지, 응답 점검
    content.js           영역·하위 요인·스타일 해설
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

진행 화면, 로그인과 승인, 저장, 결과 공유, 관리자 화면은 공통이라 따로 만들 필요가 없어요.

## 데이터 구조 (Realtime Database)

```
admins/{uid}: true
members/{uid}: { name, email, note, approvedAt, approvedBy }        승인된 상담사
requests/{uid}: { name, email, note, createdAt }                    승인 요청
users/{uid}: { name, email, photo, updatedAt }                      한 번이라도 로그인한 계정
results/{uid}/{resultId}: { testId, version, name(검사자), ownerName(상담사), email, uid, answers, scores, summary, durationSec, createdAt, shareToken? }
shares/{token}: { ownerUid, resultId, createdBy, createdAt, payload: { testId, version, name, createdAt, scores } }
```
