"""내화채움구조 페이지 '주요 시공 현장' 그림 3장(SVG)을 만든다.
사용: python3 make_site_art.py <company-site 경로>
실제 건물 사진을 참고해 직접 그린 그림이다(사진 아님, 로고·사명 표기 없음).
"""
import random
import sys
from pathlib import Path

W, H = 1360, 840
out = Path(sys.argv[1]) / "assets/media/business"


def svg(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<defs>{defs}</defs>{body}</svg>\n')


def rect(x, y, w, h, fill, extra=""):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" {extra}/>'


def tree(x, base, s, c1="#3f7d4e", c2="#2f6340"):
    return (rect(x - 2 * s, base - 16 * s, 4 * s, 16 * s, "#5b4a3a")
            + f'<ellipse cx="{x}" cy="{base - 30 * s:.1f}" rx="{17 * s:.1f}" ry="{20 * s:.1f}" fill="{c2}"/>'
            + f'<ellipse cx="{x - 4 * s:.1f}" cy="{base - 34 * s:.1f}" rx="{12 * s:.1f}" ry="{14 * s:.1f}" fill="{c1}"/>')


def clouds(seed, n=5, top=60, bottom=300):
    r = random.Random(seed)
    s = ""
    for _ in range(n):
        x, y, w = r.uniform(0, W), r.uniform(top, bottom), r.uniform(160, 340)
        s += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{w:.0f}" ry="{w * .09:.0f}" fill="#fff" opacity=".5"/>'
    return s


SKY = ('<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
       '<stop offset="0" stop-color="#5d9ad6"/><stop offset=".7" stop-color="#b9d8f0"/>'
       '<stop offset="1" stop-color="#e4f0f8"/></linearGradient>')


# ---------------------------------------------------------------- 1. 반도체 공장
def fab():
    r = random.Random(7)
    b = rect(0, 0, W, H, "url(#sky)") + clouds(3)
    ground = 640

    # 먼 타워크레인
    for cx, ch in ((1120, 440), (1250, 400)):
        b += rect(cx, ground - ch, 5, ch, "#c9a23a")
        b += rect(cx - 150, ground - ch, 215, 4, "#c9a23a")
        b += f'<path d="M{cx + 2} {ground - ch - 26} L{cx - 150} {ground - ch} M{cx + 2} {ground - ch - 26} L{cx + 65} {ground - ch}" stroke="#c9a23a" stroke-width="2" fill="none"/>'
        b += rect(cx, ground - ch - 26, 5, 26, "#c9a23a")

    def mondrian(x0, y0, w, h, cols, rows, skew=0.0, shade=1.0):
        """몬드리안풍 외벽. skew>0 이면 오른쪽으로 갈수록 줄어드는 측면."""
        s = ""
        palette = ["#f4f6f7"] * 9 + ["#dfe5e9"] * 5 + ["#c7d0d6"] * 2 + ["#2f62b5", "#3d8ad0", "#7fb6e2",
                                                                         "#e0b62c", "#c8433b", "#2f62b5"]
        cw, rh = w / cols, h / rows
        taken = set()
        for j in range(rows):
            for i in range(cols):
                if (i, j) in taken:
                    continue
                sw = r.choice([1, 1, 2, 2, 3])
                sh = r.choice([1, 1, 2])
                sw = min(sw, cols - i)
                sh = min(sh, rows - j)
                if any((i + a, j + c) in taken for a in range(sw) for c in range(sh)):
                    sw = sh = 1
                for a in range(sw):
                    for c in range(sh):
                        taken.add((i + a, j + c))
                col = r.choice(palette)

                def pt(u, v):
                    px = x0 + u * cw
                    k = (u / cols) * skew
                    py = y0 + h * k * .5 + v * rh * (1 - k)
                    return f"{px:.1f},{py:.1f}"

                s += (f'<polygon points="{pt(i, j)} {pt(i + sw, j)} {pt(i + sw, j + sh)} {pt(i, j + sh)}" '
                      f'fill="{col}" stroke="#2b3440" stroke-width="1.6"/>')
        if shade < 1:
            def p2(u, v):
                k = u * skew
                return f"{x0 + u * w:.1f},{y0 + h * k * .5 + v * h * (1 - k):.1f}"
            s += f'<polygon points="{p2(0, 0)} {p2(1, 0)} {p2(1, 1)} {p2(0, 1)}" fill="#12233a" opacity="{1 - shade:.2f}"/>'
        return s

    # 뒤쪽 동
    b += rect(820, 300, 470, 340, "#d5dde3")
    b += mondrian(820, 300, 470, 340, 12, 6, shade=.82)
    for i in range(9):
        b += rect(850 + i * 48, 276, 12, 24, "#aab4bd")
    b += rect(820, 294, 470, 7, "#8e99a3")

    # 앞쪽 동: 정면 + 측면
    fx, fy, fw, fh = 70, 210, 760, 430
    b += rect(fx, fy, fw, fh, "#f4f6f7")
    b += mondrian(fx, fy, fw, fh, 16, 7)
    sx0, sx1, st = fx + fw, fx + fw + 150, 36
    b += f'<polygon points="{sx0},{fy} {sx1},{fy + st} {sx1},{ground} {sx0},{ground}" fill="#b4bec7"/>'
    for j, col in ((1, "#2a5599"), (4, "#b3962a")):
        ya, yb = fy + j * fh / 7, fy + (j + 1) * fh / 7
        k = lambda y: st * (1 - (y - fy) / fh)
        b += f'<polygon points="{sx0 + 50},{ya + k(ya) / 3:.1f} {sx1},{ya + k(ya):.1f} {sx1},{yb + k(yb):.1f} {sx0 + 50},{yb + k(yb) / 3:.1f}" fill="{col}"/>'
    for j in range(1, 7):
        y = fy + j * fh / 7
        b += f'<line x1="{sx0}" y1="{y:.1f}" x2="{sx1}" y2="{y + st * (1 - j / 7):.1f}" stroke="#2b3440" stroke-width="1.4"/>'
    for x in (sx0 + 50, sx0 + 100):
        b += f'<line x1="{x}" y1="{fy + st * (x - sx0) / 150:.1f}" x2="{x}" y2="{ground}" stroke="#2b3440" stroke-width="1.4"/>'
    b += f'<polygon points="{sx0},{fy} {sx1},{fy + st} {sx1},{ground} {sx0},{ground}" fill="none" stroke="#2b3440" stroke-width="1.6"/>'
    # 옥상 설비
    b += rect(fx, fy - 8, fw, 9, "#8e99a3")
    for i in range(15):
        hh = r.choice([26, 34, 44])
        b += rect(fx + 30 + i * 49, fy - 8 - hh, 14, hh, "#b3bdc5")
        b += rect(fx + 28 + i * 49, fy - 12 - hh, 18, 5, "#8e99a3")
    b += rect(fx + 320, fy - 40, 150, 32, "#c3ccd3")
    # 하부 기단과 출입구
    b += rect(fx, ground - 46, fw, 46, "#3a4653")
    for i in range(30):
        b += rect(fx + 12 + i * 25, ground - 38, 15, 24, "#6f8fae")

    # 앞쪽 유리 사무동
    ox, oy, ow, oh = 930, 470, 330, 170
    b += rect(ox, oy, ow, oh, "#2f4d6b")
    for j in range(7):
        for i in range(16):
            b += rect(ox + 6 + i * 20.3, oy + 8 + j * 23, 16, 17, r.choice(["#6f9cc4", "#86b1d6", "#5b8ab5"]))
    b += rect(ox - 6, oy - 6, ow + 12, 8, "#dfe5e9")

    # 배관 랙
    b += rect(0, 560, 120, 6, "#9aa5ae") + rect(0, 574, 120, 6, "#b9c2c9")
    for x in (20, 70, 112):
        b += rect(x, 560, 5, 80, "#7c8791")

    # 땅, 도로, 나무
    b += rect(0, ground, W, H - ground, "#7fa86a")
    b += rect(0, 700, W, 86, "#4b525a")
    b += rect(0, 786, W, 54, "#8bb274")
    for i in range(14):
        b += rect(30 + i * 100, 740, 52, 5, "#e9edf0")
    b += rect(0, 698, W, 4, "#cfd5da")
    for i in range(22):
        b += tree(28 + i * 62 + r.uniform(-8, 8), 690, r.uniform(.8, 1.15))
    return svg(b, SKY)


# ---------------------------------------------------------------- 2. 대형 공장(바이오·디스플레이)
def plant():
    r = random.Random(11)
    b = rect(0, 0, W, H, "url(#sky)")
    ground = 650
    defs = SKY + ('<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">'
                  '<stop offset="0" stop-color="#3f6f95"/><stop offset=".5" stop-color="#5f93b8"/>'
                  '<stop offset="1" stop-color="#2f5878"/></linearGradient>')

    # 먼 왼쪽 유리동
    b += rect(0, 430, 120, 220, "#7fb0d2")
    for i in range(6):
        b += rect(i * 20, 430, 1.5, 220, "#d9eaf5")
    for j in range(8):
        b += rect(0, 430 + j * 28, 120, 1.5, "#d9eaf5")

    # 본동 왼쪽 측면(베이지 수직 루버 + 어두운 유리 패널)
    side = "190,470 430,250 430,650 190,650"
    b += f'<polygon points="{side}" fill="#d9d3c4"/>'
    for i in range(40):
        x = 190 + i * 6
        y = 470 - (x - 190) * (220 / 240)
        b += f'<line x1="{x}" y1="{y:.1f}" x2="{x}" y2="650" stroke="#b9b2a0" stroke-width="1.4"/>'
    b += '<polygon points="215,468 395,300 395,510 215,585" fill="#4d5f70"/>'
    for i in range(1, 6):
        x = 215 + i * 30
        b += f'<line x1="{x}" y1="{468 - i * 28:.0f}" x2="{x}" y2="{585 - i * 12.5:.0f}" stroke="#6f8496" stroke-width="1.2"/>'
    for k in (.35, .68):
        b += f'<line x1="215" y1="{468 + 117 * k:.0f}" x2="395" y2="{300 + 210 * k:.0f}" stroke="#6f8496" stroke-width="1.2"/>'

    # 본동 정면(푸른 유리 커튼월)
    gx, gy, gw, gh = 430, 250, 400, 400
    b += f'<polygon points="{gx},{gy} {gx + gw},{gy + 62} {gx + gw},650 {gx},650" fill="url(#glass)"/>'
    for i in range(41):
        x = gx + i * 10
        y = gy + (x - gx) * 62 / gw
        b += f'<line x1="{x}" y1="{y:.1f}" x2="{x}" y2="650" stroke="#a9cbe2" stroke-width="{1.6 if i % 4 == 0 else .7}" opacity=".85"/>'
    for j in range(1, 13):
        y0 = gy + j * 32
        b += f'<line x1="{gx}" y1="{y0}" x2="{gx + gw}" y2="{y0 + 62 - j * 4.6:.1f}" stroke="#1f4563" stroke-width="1.3" opacity=".55"/>'
    # 유리에 비친 밝은 면
    b += f'<polygon points="{gx + 10},{gy + 190} {gx + 120},{gy + 150} {gx + 120},650 {gx + 10},650" fill="#cfe3f0" opacity=".28"/>'
    # 모서리 프레임
    b += f'<line x1="{gx}" y1="{gy}" x2="{gx}" y2="650" stroke="#eef2f4" stroke-width="5"/>'
    b += f'<polygon points="190,470 {gx},{gy} {gx + gw},{gy + 62} {gx + gw},{gy + 70} {gx},{gy + 9} 190,479" fill="#eef2f4"/>'

    # 뒤쪽 긴 유리동
    b += f'<polygon points="{gx + gw},330 1360,372 1360,650 {gx + gw},650" fill="#356488"/>'
    for i in range(27):
        x = gx + gw + i * 20
        b += f'<line x1="{x}" y1="{330 + (x - gx - gw) * .08:.1f}" x2="{x}" y2="650" stroke="#8fb8d4" stroke-width=".8"/>'

    # 앞쪽 루버 설비동
    lx, ly, lw, lh = 690, 420, 520, 230
    b += f'<polygon points="{lx},{ly + 30} {lx + 190},{ly - 40} {lx + lw},{ly + 20} {lx + lw},650 {lx},650" fill="#cfc8b8"/>'
    b += f'<polygon points="{lx},{ly + 30} {lx + 190},{ly - 40} {lx + 190},650 {lx},650" fill="#beb7a6"/>'
    for j in range(40):
        y = ly + 40 + j * 5.6
        b += f'<line x1="{lx}" y1="{y:.1f}" x2="{lx + 190}" y2="{y - 62 + j * 1.55:.1f}" stroke="#8f8878" stroke-width="1.3"/>'
        b += f'<line x1="{lx + 190}" y1="{y - 62 + j * 1.55:.1f}" x2="{lx + lw}" y2="{y - 8 + j * .2:.1f}" stroke="#a39c8b" stroke-width="1.3"/>'
    for i in range(1, 9):
        x = lx + 190 + i * 37
        b += f'<line x1="{x}" y1="{ly - 40 + i * 6.7:.1f}" x2="{x}" y2="650" stroke="#e4dfd2" stroke-width="2"/>'
    # 은빛 금속 패널
    b += f'<polygon points="{lx + 40},{ly + 8} {lx + 190},{ly - 48} {lx + 190},{ly + 98} {lx + 40},{ly + 132}" fill="#c9d1d8"/>'
    for _ in range(26):
        x, y = r.uniform(lx + 50, lx + 175), r.uniform(ly + 5, ly + 100)
        b += rect(x, y, r.uniform(8, 22), r.uniform(4, 9), "#eef2f5", 'opacity=".55"')

    # 오른쪽 저층동
    b += rect(1170, 520, 190, 130, "#e6dcc6")
    for i in range(7):
        b += rect(1180 + i * 26, 535, 16, 100, "#9fbdd2")

    # 땅
    b += rect(0, ground, W, H - ground, "#b9b3a6")
    b += rect(0, 668, W, 14, "#7d9a5d")
    b += rect(0, 700, W, 140, "#5a6068")
    b += '<polygon points="0,700 1360,700 1360,716 0,712" fill="#a9785f"/>'
    for i in range(9):
        b += rect(880 + i * 54, 770 + i * 2, 34, 60, "#e9edf0", 'transform="skewX(-38)"')
    b += '<polygon points="0,760 620,742 700,760 0,800" fill="#c8ccd0"/>'

    # 나무(가을빛 섞임)와 가로등
    for i in range(18):
        x = 440 + i * 46 + r.uniform(-10, 10)
        c = r.choice([("#3f7d4e", "#2f6340"), ("#4b8a57", "#35704a"), ("#b5553a", "#8f3f2c"), ("#c98a3b", "#a56d2a")])
        b += tree(x, 664, r.uniform(1.0, 1.7), *c)
    for i in range(5):
        b += tree(30 + i * 44, 664, r.uniform(1.1, 1.6), "#35704a", "#28573a")
    for x in (980, 300):
        b += rect(x, 300, 6, 380, "#9aa3ab")
        b += f'<path d="M{x + 3} 302 Q{x + 40} 280 {x + 80} 296" stroke="#9aa3ab" stroke-width="5" fill="none"/>'
        b += rect(x + 70, 294, 26, 7, "#59626b")
    return svg(b, defs)


# ---------------------------------------------------------------- 3. 초고층(롯데월드타워)
def tower():
    r = random.Random(5)
    defs = SKY + ('<linearGradient id="tl" x1="0" y1="0" x2="1" y2="0">'
                  '<stop offset="0" stop-color="#d3e4f1"/><stop offset="1" stop-color="#9dbdd8"/></linearGradient>'
                  '<linearGradient id="tr" x1="0" y1="0" x2="1" y2="0">'
                  '<stop offset="0" stop-color="#7fa3c4"/><stop offset="1" stop-color="#5a82a8"/></linearGradient>'
                  '<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">'
                  '<stop offset="0" stop-color="#6f9fc2"/><stop offset="1" stop-color="#3f6f95"/></linearGradient>')
    b = rect(0, 0, W, H, "url(#sky)") + clouds(9, 4, 120, 380)
    ground = 610
    cx, top = 700, 46

    # 먼 산
    b += '<path d="M0 560 Q200 500 420 548 T860 540 T1360 520 V620 H0Z" fill="#a9c2d6"/>'

    # 주변 건물
    for _ in range(46):
        x = r.uniform(-20, W)
        if abs(x - cx) < 150:
            continue
        w, h = r.uniform(34, 78), r.uniform(50, 190)
        col = r.choice(["#dfe5ea", "#cfd8df", "#e9e4da", "#c5d2dd", "#b8c8d6"])
        b += rect(x, ground - h, w, h, col)
        for j in range(int(h // 11)):
            b += rect(x + 4, ground - h + 6 + j * 11, w - 8, 3.2, "#7d93a8", 'opacity=".55"')

    # 타워: 붓 모양으로 위로 갈수록 좁아지는 볼록한 윤곽
    def hw(y):
        t = (y - top) / (ground - top)
        return 13 + 55 * t ** 0.78

    ys = [top + i * (ground - top) / 60 for i in range(61)]
    seam = lambda y: cx + hw(y) * .16
    left = " ".join(f"{cx - hw(y):.1f},{y:.1f}" for y in ys)
    right = " ".join(f"{cx + hw(y):.1f},{y:.1f}" for y in reversed(ys))
    mid_dn = " ".join(f"{seam(y):.1f},{y:.1f}" for y in ys)
    mid_up = " ".join(f"{seam(y):.1f},{y:.1f}" for y in reversed(ys))
    b += f'<polygon points="{left} {mid_up}" fill="url(#tl)"/>'
    b += f'<polygon points="{mid_dn} {right}" fill="url(#tr)"/>'
    # 층 띠와 수직 핀
    for y in ys[::1]:
        for yy in (y, y + 4.7):
            b += f'<line x1="{cx - hw(yy):.1f}" y1="{yy:.1f}" x2="{cx + hw(yy):.1f}" y2="{yy:.1f}" stroke="#fff" stroke-width=".7" opacity=".35"/>'
    for k in (-.75, -.5, -.25, .45, .7):
        pts = " ".join(f"{cx + hw(y) * k:.1f},{y:.1f}" for y in ys)
        b += f'<polyline points="{pts}" fill="none" stroke="#fff" stroke-width=".8" opacity=".45"/>'
    # 설비층 띠
    for t in (.26, .5, .72, .9):
        y = top + t * (ground - top)
        b += f'<polygon points="{cx - hw(y):.1f},{y:.1f} {cx + hw(y):.1f},{y:.1f} {cx + hw(y + 9):.1f},{y + 9:.1f} {cx - hw(y + 9):.1f},{y + 9:.1f}" fill="#4d6f8f" opacity=".75"/>'
    # 이음선과 갈라진 꼭대기
    b += f'<polyline points="{mid_dn}" fill="none" stroke="#f4f8fb" stroke-width="2.2"/>'
    sx = seam(top)
    b += (f'<polygon points="{sx - 4:.1f},{top - 2} {sx + 4.5:.1f},{top - 2} {seam(top + 96) + 1.2:.1f},{top + 96} '
          f'{seam(top + 96) - 1.2:.1f},{top + 96}" fill="#6fa6dc"/>')
    for i in range(1, 9):
        y = top + i * 11
        b += f'<line x1="{sx - 4 + i * .3:.1f}" y1="{y}" x2="{sx + 4.5 - i * .35:.1f}" y2="{y}" stroke="#f4f8fb" stroke-width="1"/>'
    # 두 갈래 첨탑 끝
    b += f'<polygon points="{cx - hw(top):.1f},{top} {sx - 4:.1f},{top} {sx - 5:.1f},{top - 30}" fill="#d3e4f1"/>'
    b += f'<polygon points="{sx + 4.5:.1f},{top} {cx + hw(top):.1f},{top} {sx + 6:.1f},{top - 22}" fill="#7fa3c4"/>'

    # 기단부 쇼핑몰
    b += f'<path d="M{cx - 250} {ground} V{ground - 62} Q{cx - 120} {ground - 92} {cx + 40} {ground - 74} L{cx + 290} {ground - 58} V{ground}Z" fill="#c9d3da"/>'
    for i in range(34):
        b += rect(cx - 240 + i * 15.5, ground - 46, 9, 34, "#6f93b3")
    b += f'<path d="M{cx - 250} {ground - 62} Q{cx - 120} {ground - 92} {cx + 40} {ground - 74} L{cx + 290} {ground - 58}" stroke="#eef2f4" stroke-width="5" fill="none"/>'

    # 호숫가 나무, 호수, 반영
    b += rect(0, ground, W, 40, "#4d8a57")
    for i in range(46):
        b += tree(i * 30 + r.uniform(-6, 6), ground + 34, r.uniform(1.0, 1.5),
                  r.choice(["#4b8a57", "#3f7d4e", "#5a9a62"]), r.choice(["#2f6340", "#35704a"]))
    b += rect(0, ground + 34, W, H - ground - 34, "url(#lake)")
    b += (f'<polygon points="{cx - 60},{ground + 34} {cx + 66},{ground + 34} {cx + 22},{H} {cx - 2},{H}" '
          f'fill="#cfe2f0" opacity=".33"/>')
    for i in range(26):
        y = ground + 46 + i * 7.4
        x = r.uniform(0, W - 300)
        b += rect(x, y, r.uniform(120, 420), 1.6, "#e4f0f8", 'opacity=".35"')
    b += rect(0, ground + 32, W, 4, "#2b5136")
    return svg(b, defs)


out.mkdir(parents=True, exist_ok=True)
for name, fn in (("site-hightech.svg", fab), ("site-plant.svg", plant), ("site-tower.svg", tower)):
    (out / name).write_text(fn(), encoding="utf-8")
    print(name, (out / name).stat().st_size)
