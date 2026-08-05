/**
 * 히어로 첫 화면 포스터 4장 생성기
 *
 * ⚠️ **필름의 0초 프레임이 달라질 때마다 반드시 다시 돌려야 한다.**
 *    포스터는 3D 가 로딩되는 동안 깔아두는 첫 화면이다. 필름을 고치고 포스터를 그대로 두면
 *    옛 장면이 잠깐 비쳤다가 바뀌는 게 그대로 보인다(실제로 두 번 겪었다).
 *
 * 왜 4장인가:
 *    hero3d.js 의 resize() 는 화면 비율에 따라 세로 화각(fovK)과 시선 지점(lookK)을
 *    a<0.8 / a<1.2 / a<1.6 / 그 외 — 네 단계로 바꾼다. 단계마다 그림이 다르므로 한 장으로는 못 맞춘다.
 *    각 포스터는 그 단계가 가질 수 있는 **가장 넓은 비율**로 뽑고, CSS 가
 *    `background-size: auto 100%` 로 높이를 맞춘다. 좁아지면 좌우가 잘리는데
 *    카메라도 세로 화각을 고정한 채 가로만 넓히므로 잘리는 방식이 같다 = 프레임 일치.
 *
 * ⚠️ 비율은 경계값이 아니라 **경계 바로 아래**로 뽑는다(1.6 이 아니라 1.59).
 *    resize() 의 조건이 `a < 1.6` 이라 딱 1.6 은 윗 단계로 가버려 한 단계씩 밀린다.
 *
 * 쓰는 법:
 *    1) npm i playwright-core   (어딘가 임시 폴더에서)
 *    2) company-site/ 에서 정적 서버 띄우기:  python3 -m http.server 8765 --bind 127.0.0.1
 *    3) node make-posters.mjs
 *    4) index.html / style.css 의 ?v= 를 올려 캐시를 갱신할 것
 *
 * CHROME 은 설치된 Chrome/Chromium 실행 파일 경로. 환경에 맞게 바꾸거나 CHROME 환경변수로 준다.
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "assets", "images");
// ⚠️ **`?gfx=high` 는 빼면 안 된다.**
//    hero3d.js 는 `navigator.hardwareConcurrency <= 4` 면 저사양으로 판정해 블룸 해상도·MSAA 를
//    낮추고 심도·접지 그림자를 통째로 끈다. 그런데 이 포스터를 굽는 헤드리스 컨테이너는
//    보통 코어가 2개다 → 아무 조치 없이 구우면 **저품질 첫 화면**이 만들어지고,
//    실제 방문자(코어 8개)는 고품질 3D 를 보게 되어 로딩이 끝나는 순간 화면이 바뀐다.
//    포스터 프레임이 안 맞을 때와 똑같은 증상이라 원인을 찾기 어렵다.
const URL = process.env.URL || "http://127.0.0.1:8765/index.html?gfx=high";
const CHROME = process.env.CHROME ||
  "/home/codespace/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";

// aspect = 그 단계의 최대 비율 바로 아래. style.css 의 min-aspect-ratio 경계와 짝이다.
//
// gfx = 그 단계를 보는 기기가 **실제로 돌리게 될 품질**. 포스터는 3D 가 뜨기 직전까지 깔리는
//   그림이므로, 실제 렌더와 품질이 다르면 로딩이 끝나는 순간 화면이 한 번 바뀐다.
//   세로 화면(a < 0.8)은 사실상 휴대폰뿐이고 휴대폰은 hero3d.js 에서 무조건 저사양으로
//   잡히므로(userAgent 판정) 그 한 장만 low 로 굽는다. 나머지는 데스크톱 기준 high.
const TIERS = [
  { file: "hero-poster-w.jpg", aspect: 2.6,  h: 860, gfx: "high" },  // a >= 1.6  (와이드·울트라와이드까지 커버)
  { file: "hero-poster-m.jpg", aspect: 1.59, h: 860, gfx: "high" },  // 1.2 <= a < 1.6
  { file: "hero-poster-n.jpg", aspect: 1.19, h: 860, gfx: "high" },  // 0.8 <= a < 1.2
  { file: "hero-poster-p.jpg", aspect: 0.79, h: 900, gfx: "low"  },  //        a < 0.8  (세로 = 휴대폰)
];

const browser = await chromium.launch({
  executablePath: CHROME,
  // 헤드리스에서 WebGL 을 소프트웨어로 돌린다(GPU 없는 CI·컨테이너용). 느리지만 결과는 같다.
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});

for (const t of TIERS) {
  const width = Math.round(t.h * t.aspect);
  const page = await browser.newPage({ viewport: { width, height: t.h } });
  const url = URL.replace(/gfx=\w+/, "gfx=" + t.gfx);
  // ⚠️ `waitUntil:"load"` 는 기본 30초 안에 못 끝난다 — GA·웹폰트 같은 외부 요청이 물려 있고,
  //    소프트웨어 렌더에서는 3D 초기화만 1분이 넘는다. 실제로 여기서 계속 타임아웃이 났다.
  //    문서만 받고, 준비 여부는 아래 heroFilm 대기로 판단한다.
  page.setDefaultNavigationTimeout(300000);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.heroFilm, null, { timeout: 120000 });
  // 재생을 멈추고 정확히 0초로 — 포스터는 필름의 첫 프레임이어야 한다
  await page.evaluate(() => { window.heroFilm.stop(); window.heroFilm.seek(0); });

  // ⚠️ **오버레이를 반드시 떼어내고 찍는다.**
  //    포스터는 캔버스 뒤에 깔리는 배경이고, 그 위에 진짜 헤더·문구가 다시 그려진다.
  //    이 단계를 빼먹으면 로고와 메뉴가 **두 겹으로** 보인다(2026-08-03 에 나간 포스터가
  //    실제로 그랬다 — 로딩 중 화면이 겹쳐 보이던 원인 중 하나).
  //    ⚠️ 스타일시트로 감추는 방식(visibility:hidden)은 이 페이지에서 안 먹었다. remove 로 확실히.
  const removed = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll(
      ".hero-scrim, .hero-body, .hero-meta, #siteHeader, .hero-art"));
    els.forEach((e) => e.remove());
    return els.length;
  });
  if (!removed) throw new Error("오버레이를 못 찾았다 — 선택자가 마크업과 어긋났는지 확인할 것");
  await page.waitForTimeout(500);

  // .hero 는 100svh 라 뷰포트와 같은 비율이 되지만, 실측해서 어긋나면 알려준다
  const box = await page.locator("#hero3d").boundingBox();
  const got = box.width / box.height;
  if (Math.abs(got - t.aspect) > 0.02) {
    console.warn(`!! ${t.file}: 캔버스 비율이 ${got.toFixed(3)} — 원하는 값은 ${t.aspect}`);
  }
  // ⚠️ 요소 스크린샷은 불이 계속 움직여 "element is not stable" 로 멈춘다 → 클립으로 찍는다
  await page.screenshot({
    path: join(OUT_DIR, t.file), type: "jpeg", quality: 68, timeout: 180000,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });
  console.log(`${t.file}  ${Math.round(box.width)}x${Math.round(box.height)}  aspect ${got.toFixed(3)}`);
  await page.close();
}

await browser.close();
