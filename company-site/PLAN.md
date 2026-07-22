# DOENC 회사 홈페이지 계획

## 목표
디자인 · 구성 · 내용 전면 개편 → GitHub Pages 배포

## 현황
- 1차 배포 완료: https://jay-source-2026.github.io/Jay-s-Repository/company-site/
- **2차 전면 리디자인 진행 중** (2026-07-21) — 1차 디자인이 촌스럽다는 피드백

---

# 2차 리디자인 (참고: www.kchglobal.com)

## 참고 사이트에서 가져올 디자인 언어
| 요소 | KCH | 1차 DOENC(폐기) |
|---|---|---|
| 베이스 | 거의 검정 모노톤 `#101013` | 네이비 + 파랑 그라데이션 |
| 포인트 컬러 | 하늘색 1종만 절제 사용 | 파랑을 넓은 면적에 남용 |
| 버튼 | `VIEW MORE +` 텍스트 링크 | 둥근 알약 + 그림자 |
| 카드 | 각진 모서리, 테두리·그림자 없음 | radius 14px + 박스 그림자 |
| 아이콘 | 없음 / 라인 그래픽 | 이모지 🛡️🔧🌱 |
| 섹션 헤더 | 좌측 작은 라벨 + 우측 큰 제목 (2단) | 중앙 정렬 |
| 그리드 | 스태거드(어긋난) 배치 | 균일한 3열 |
| 폰트 | Pretendard | 시스템 폰트 |
| 그래픽 | 대형 아웃라인 텍스트 | 없음 |

## 새 정보구조 (IA)
1. **HERO** — 풀블리드 다크, 대형 헤드라인, `VIEW MORE +`
2. **BUSINESS 사업영역** — 스태거드 4카드 (내화채움구조/내화구조/셔터/설계SW), SVG 라인아트
3. **성과 지표 밴드** — 특허·인정·국산화·ONE-STOP 숫자형 배치
4. **제품 상세** — 내화채움구조 / 셔터 풀블리드 교차 배치
5. **TECHNOLOGY** — ONE-STOP 4단계 편집형 넘버링
6. **ABOUT 회사소개** — 스테이트먼트 + 회사정보 테이블
7. **아웃라인 마퀴** — `FIRE SAFETY SOLUTION · DOENC`
8. **CONTACT** — 사업부별 메일 라우팅 + 전화
9. **FOOTER** — 미니멀

→ 1차(7섹션 균질 나열)에서 편집 리듬이 있는 9블록으로 재구성

## 디자인 토큰
```
--bg        #101013   거의 검정
--surface   #17171b   섹션 대비
--surface-2 #1e1e23   카드
--line      rgba(255,255,255,.12)
--text      #f2f2f4
--muted     #9a9aa2
--accent    #69b6fa   포인트 (라벨·번호·호버에만)
--paper     #f4f4f6   라이트 섹션 (리듬용)
폰트        Pretendard Variable (jsDelivr CDN) + 시스템 폴백
radius      0 (각진 모서리)
그림자      없음
```

## 유지할 기능 (1차에서 검증 완료)
- 사업부별 mailto 라우팅 (내화채움구조 firestop@ / 셔터 firescreen@)
- 전화 안내 병행 + `tel:` 링크
- GA / Clarity 태그, canonical · OG · Organization JSON-LD
- 접근성: 스킵 링크, aria 상태 관리, prefers-reduced-motion, noscript 폴백
- 한글 줄바꿈 `word-break: keep-all`

---

## 사업부별 문의 라우팅
`assets/js/main.js` 상단 `TEAM_EMAIL`에서 관리.

| 문의 분야 | 수신 사업부 | 주소 |
|---|---|---|
| 내화채움구조 | 내화채움구조 사업부 | firestop@doenc.com |
| 내화구조 | 내화채움구조 사업부 | firestop@doenc.com |
| 셔터 (방화·스크린) | 셔터 사업부 | firescreen@doenc.com |
| 설계소프트웨어 | 내화채움구조 사업부 | firestop@doenc.com |
| 기타 문의 | 내화채움구조 사업부 (기본값) | firestop@doenc.com |

## 회사 정보
- 제품 4종: 내화채움구조 / 내화구조 / 셔터 / 설계소프트웨어
  (기존 사이트의 제연덕트는 현재 미취급 → 제외)
- 슬로건: creative doenc · 기술력을 바탕으로 고객과 함께하는 (주)디오이엔씨
- 핵심 강점: 자체기술 국산화 ONE-STOP SYSTEM (자재생산·설계·시공), 특허 다수
- 사업 범위: 건축물 **및 지하구**의 화재차단 장치 제조·시공
- 사업자번호 111-81-32572 / 경기 화성시 정남면 안념길 121-12 (내리)
- TEL 02-925-2992 / FAX 02-929-5927

---

# 3차 보정 (2026-07-21) — 여백 · 미디어 슬롯

## 1. 좌우 여백 축소
참고 사이트 실측: `.in { width: 184em }` ≈ **1840px**, 헤더는 `padding: 0 max(20px,3vw)` 풀블리드.
→ `--wrap` 1280px → **1840px**, `--pad` 40px → `clamp(24px, 2.6vw, 64px)`,
  헤더·히어로는 `--pad-edge`로 화면 전체 폭 사용.
→ 1920px 화면 기준 좌우 여백 320px → **90px**.
넓은 화면에서 늘어지지 않도록 본문에 가독폭 상한 지정
(`.ct-form` 720px, `.ct-side` 620px, `.info` 660px, `.detail-lead` 40em, `.about-lead` 30em,
 `.ct-grid` 1440px, `.about-grid` 1500px)

## 2. 사진 · 영상 자리
참고 사이트는 히어로가 `<video autoplay muted loop>` 풀스크린(`mtp_video.mp4`),
사업영역은 `bis_sect_slide1~4.jpg` 실사진. 우리는 그 자리가 비어 보였던 것이 문제.

**기존 doenc.com 확인 결과 쓸 수 있는 현장 사진 없음**
(280×320px 흰 배경 제품 렌더링 + AutoCAD 스크린샷뿐 → 흑백 편집형에 부적합)

→ 사진이 올 때까지 그 자리를 **대형 관통부 단면 기술 도면**으로 채움
   (히어로 1600×900 풀블리드 + 벽체 해칭 + 관통부 3개 + 실링 펄스 + 스윕 애니메이션,
    사업영역 카드 4장은 slice 방식 풀프레임 도면 + 대형 고스트 넘버)

### 사진/영상 교체 방법 (파일만 넣고 한 줄 추가)
| 위치 | 넣는 곳 | 넣을 태그 |
|---|---|---|
| 히어로 | `.hero-media` 안 `.hero-art` **앞** | `<video autoplay muted loop playsinline poster="...">` 또는 `<img>` |
| 사업영역 카드 | `.biz-media` 안 `<svg>` **앞** | `<img src="assets/images/biz-*.jpg" alt="">` |
| 제품 상세 | `.detail-visual` 안 `<svg>` **앞** | `<img src="assets/images/firestop.jpg" alt="">` |

CSS 형제 선택자(`> img ~ svg { display:none }`)로 **도면이 자동으로 감춰짐**.
사진은 `grayscale(1)` 필터가 걸려 컬러 사진을 넣어도 톤이 유지됨.
권장 규격: 히어로 1920×1080 이상(영상은 mp4, 10초 내외, 음성 없음),
카드 800×1000(4:5), 상세 1200×1200.

---

## 확정 대기 항목 (사용자 답변 필요)
- **사진 자료** — 참고 사이트는 흑백 실사진이 디자인의 핵심.
  현재 사진이 없어 SVG 기술 도면으로 대체. 제품/시공현장 사진 확보 시 완성도 크게 상승
  (교체는 위 표대로 한 줄 추가면 끝)
- `내화구조`·`설계소프트웨어`·`기타`의 담당 사업부 (현재 firestop으로 임시 배정)
- 회사연혁·조직도 실제 데이터
- 인정번호·특허번호 실제 값 (현재 "다수 보유"로만 표기)
- 영문(ENG) 페이지 필요 여부
- 커스텀 도메인 사용 여부 (사용 시 canonical/OG 주소 수정 필요)
