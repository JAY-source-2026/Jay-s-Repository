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
const URL = process.env.URL || "http://127.0.0.1:8765/index.html";
const CHROME = process.env.CHROME ||
  "/home/codespace/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";

// aspect = 그 단계의 최대 비율 바로 아래. style.css 의 min-aspect-ratio 경계와 짝이다.
const TIERS = [
  { file: "hero-poster-w.jpg", aspect: 2.6,  h: 860 },  // a >= 1.6  (와이드·울트라와이드까지 커버)
  { file: "hero-poster-m.jpg", aspect: 1.59, h: 860 },  // 1.2 <= a < 1.6
  { file: "hero-poster-n.jpg", aspect: 1.19, h: 860 },  // 0.8 <= a < 1.2
  { file: "hero-poster-p.jpg", aspect: 0.79, h: 900 },  //        a < 0.8  (세로 화면)
];

const browser = await chromium.launch({
  executablePath: CHROME,
  // 헤드리스에서 WebGL 을 소프트웨어로 돌린다(GPU 없는 CI·컨테이너용). 느리지만 결과는 같다.
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});

for (const t of TIERS) {
  const width = Math.round(t.h * t.aspect);
  const page = await browser.newPage({ viewport: { width, height: t.h } });
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => window.heroFilm, null, { timeout: 120000 });
  // 재생을 멈추고 정확히 0초로 — 포스터는 필름의 첫 프레임이어야 한다
  await page.evaluate(() => { window.heroFilm.stop(); window.heroFilm.seek(0); });
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
