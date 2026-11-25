# 새 검사 만들기 (AZIT : Star&Moon)

사람이 직접 만들 때도, 예약 작업이 자동으로 만들 때도 이 문서를 따른다.
기준이 되는 구현은 `tests/hsp/`(리커트만 쓰는 가장 단순한 구조), `tests/attachment/`(축 두 개 + 관계별 부), `tests/schema/`(18개 척도 + 순위 문항)다.
막히면 두 검사의 코드를 그대로 본보기로 삼는다.

## 1. 무엇을 만드는가

`assets/js/registry.js`에서 `status: 'soon'`인 검사를 위에서부터 하나씩 연다.

| id | 제목 | 바탕 이론 | 권장 구성 |
|---|---|---|---|
| `hsp` | 초민감성 | (열림) 리커트만 쓰는 검사의 가장 단순한 본보기. 갈래별 점수, 상태 지도, 응답 점검 시뮬레이션까지 갖췄다 | 52문항 |
| `strengths` | 성격 강점 | VIA 24강점, 6덕목 | 24강점 × 4 = 96문항, 5점. 24강점 순위, 대표 강점 5개, 덕목 지도, 강점 쓰는 법 |
| `values` | 가치관 | Schwartz 10가지 기본 가치(원형 구조) | 10가치 × 4 = 40문항 '이 사람은 나와 얼마나 닮았나요' 6점. 개인 평균으로 중심화해서 비교. 가치 원형 차트, 가치 갈등 |
| `career` | 진로 흥미 | Holland RIASEC 6유형 | 6 × 10 = 60문항(활동 선호, 5점). 3글자 코드, 육각형 차트, 일관도·변별도, 한국 직업 예시 |

- 문항은 **직접 쓴 한국어 문항**이어야 한다. 저작권이 있는 척도(HSPS, VIA-IS, PVQ 등)의 문항을 옮기거나 번역해 넣지 않는다. 이론의 구성 개념만 빌린다.
- 요인마다 역문항을 섞는다(대략 4개 중 1개). 같은 요인 문항이 몰리지 않게 섞어 배치한다.
- 문장은 쉬운 일상어, 한 문항에 한 가지 내용. 검사자에게 반말 금지, 존댓말 '~해요' 체.

## 2. 파일 구조 (`tests/<id>/`)

| 파일 | 내용 |
|---|---|
| `items.js` | 척도(`LIKERT_SCALE`: `{value, label}` 배열, value는 1부터), 요인 정의, 문항 `{id, text, ...}`. id는 영문·숫자·`_`만 |
| `scoring.js` | `score(answers)` → 결과 객체. 0~100 점수, 수준(낮음/보통/높음 등), 순위, **응답 점검(`check`)** |
| `content.js` | 해석 글: 요인·유형별 설명, 강점과 주의점, 성장 제안, 상담 질문, 마무리 |
| `chart.js` | 결과지 표지 차트(SVG 문자열을 돌려주는 함수). 첫 화면 카드 그림에도 쓴다 |
| `report.js` | `renderReport(el, rec, ctx)`: 표지 → 목차 → 섹션들. 맨 끝에서 `wireToc(el)` |
| `index.js` | 검사 정의(`export default { id, version: '1.0', title, intro, parts, score, summary, glyph, render }`) |

### 검사 정의 규칙 (`index.js`)
- `parts[]`: `{ id, kind: 'likert'|'pair'|'rank', title, short, summary, desc, how, count, scale, items }`.
  건너뛸 수 있는 부는 `skippable: true` (`tests/attachment/index.js` 참고).
- `intro`: `{ kicker: 'AZIT : Star&Moon 검사', lead, facts: [{dt, dd}] (문항, 소요 시간, 구성), gets: [...] }`
- `summary(scores)`: 결과 목록에 보일 한 줄. `glyph(scores)`: 결과 목록 동그라미에 들어갈 1~2글자.

### 결과지 규칙 (`report.js`)
- 섹션은 `<section class="rsec" id="r-<키>">`, 목차는 `<nav class="toc no-print"><div class="toc-inner"><a href="#r-<키>">`.
- 목차 표시는 반드시 `import { wireToc } from '../../assets/js/toc.js'`로 한다. **`scrollIntoView`를 쓰지 않는다**(스크롤이 제자리로 끌려가는 문제가 있었다).
- 필수 섹션: 요약, 자세한 해석, 성장 방향, **상담 메모(`ctx.shared`일 때 숨김)**, 응답 점검.
- 이름 뒤 조사는 받침에 맞춘다(`tests/schema/report.js`의 `jo`/`hasBatchim` 참고).
- 화면 문구에 신뢰를 떨어뜨리는 면책 문구를 넣지 않는다. 응답 점검은 '응답이 고르게 이어졌는지'처럼 담담하게 쓴다.

### 응답 점검 기준 정하기
무작위로 답한 사람과 일관되게 답한 사람을 각각 수천 명씩 흉내 내서 기준값을 정한다.
목표: 일관된 응답은 5% 이하만, 무작위 응답은 60% 이상을 걸러 낸다. 기준값과 그 결과는 `scoring.js` 주석에 남긴다.

### 차트 색
`dataviz` 기준을 따른다. 범주 색은 정해진 순서로 쓰고, 색을 고르면 팔레트 검사 스크립트로 확인한다.
기존 검사에서 검증된 색: `#2a78d6`, `#eb6834`, `#1baf7a`, `#eda100`, `#e87ba4`(이 순서로 인접 대비 통과).

## 3. 연결할 곳
1. `assets/js/registry.js`: 해당 항목을 `status: 'open'`으로 바꾸고 `items`, `minutes`, `parts`, `gets`를 채운다.
2. `assets/js/pages/home.js`: `GLYPH[<id>]`에 첫 화면 카드 그림(차트 함수에 예시 값) 추가.
3. `assets/js/pages/admin.js`: CSV 내보내기에 이 검사의 핵심 열 추가(`head`와 각 행 모두).
4. `README.md`: 검사 목록과 폴더 구조에 한 줄씩.
5. 결과 목록 동그라미는 `glyph(scores)`가 결과와 함께 저장되므로 따로 손대지 않아도 된다.

## 4. 점검
```bash
python3 tools/smoke.py --only <id> --shots /tmp/shots   # 새 검사만 빠르게
python3 tools/smoke.py                                    # 올리기 전에 전체
```
- 둘 다 `{"ok": true}`여야 올린다.
- 캡처(390px 휴대폰)로 소개, 문항, 결과지 표지와 섹션 몇 곳을 눈으로 확인한다. 글자 넘침, 겹침, 어색한 조사를 고친다.

## 5. 올리기
```bash
git remote set-url origin https://github.com/azit-starmoon/azit-starmoon.github.io   # 환경이 예전 주소로 되돌려 놓는 경우가 있다
python3 tools/stamp-version.py       # version.json 갱신: 사용자 화면에 '새 버전' 안내가 뜨고 캐시가 바뀐다
git add -A && git commit && git push origin HEAD:main
```
- 커밋 메시지는 한국어로 무엇을 했는지 한 줄.

## 6. 하지 말 것
- 잠금 번호(검사 코드, 결과 잠금 번호)를 원문으로 저장소에 쓰지 않는다. `config.js`에는 해시만 있다.
- `firebase/database.rules.json`은 바꾸지 않는다(바꿔도 사용자가 콘솔에 붙여 넣어야 적용된다).
- 이미 열린 검사의 채점, 문항, `version`을 바꾸지 않는다. 저장된 결과와 진행 중인 검사가 깨진다.
- 실제 사용자 데이터에는 손대지 않는다. 점검은 체험 모드(`?demo=1`)로만 한다.

## 7. 예약 작업(자동) 규칙
한 시간마다 도는 예약 작업은 아래 순서를 따른다.
1. **진단**: `origin/main`으로 `python3 tools/smoke.py`, `gh run list -R azit-starmoon/azit-starmoon.github.io -L 3`으로 배포 상태 확인.
   smoke가 실패하면 원인이 분명하고 작게 고칠 수 있을 때만 고쳐서 다시 smoke를 통과시킨 뒤 올린다.
2. **작업 자리 잡기**: 원격 `auto/<id>` 브랜치 가운데 `<id>`가 이미 `origin/main`의 registry에서 `open`인 것은 끝난 작업이라 무시한다(브랜치 삭제가 막혀 있어 남아 있을 수 있다). 남은 `auto/*` 브랜치가 있으면,
   - 마지막 커밋이 90분 안이면 다른 회차가 작업 중이다. 진단만 하고 끝낸다.
   - 90분이 넘었으면 멈춘 작업이다. 그 브랜치를 이어받아 계속한다(먼저 빈 커밋을 올려 자리를 표시).
   - 없으면 `registry.js`에서 첫 `soon` 검사를 골라 빈 커밋을 만들고
     `git push --force-with-lease=refs/heads/auto/<id>: origin HEAD:refs/heads/auto/<id>`로 자리를 잡는다(이미 있으면 실패하므로 겹치지 않는다).
3. **만들기**: 이 문서대로 만든다. 30분을 넘기지 않게 브랜치에 커밋을 올려 진행을 남긴다(작업 중이라는 표시도 된다).
4. **마무리**: 전체 smoke 통과 → `origin/main` 위에 squash로 합쳐 version 갱신 후 main에 올린다 → `auto/<id>` 브랜치 삭제를 시도한다(세션에서는 삭제가 막혀 있을 수 있다. 실패해도 괜찮다. 위 규칙대로 무시된다).
5. 열 검사가 더 없고 남은 작업 브랜치도 없으면 진단만 한다.
