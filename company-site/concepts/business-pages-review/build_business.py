"""사업영역 4개 페이지를 regulation.html의 공용 머리말·꼬리말로 만든다. (작업용, 사이트에 포함하지 않음)"""
import re, sys
root = sys.argv[1]
V = "20261116b3"
reg = open(root + "/regulation.html", encoding="utf-8").read()
head = reg[:reg.index('<main id="main">') + len('<main id="main">')]
foot = reg[reg.index("    </main>"):]
foot = foot[:foot.index('    <script>\n      // 보고 있는 구간의 탭')] + "</body>\n</html>\n"

PAGES = [("business-firestop.html", "내화채움구조"), ("business-fireproof.html", "내화구조"),
         ("business-shutter.html", "방화셔터"), ("business-software.html", "설계소프트웨어")]


def tabs(current):
    items = [f'                    <a href="{f}"{" aria-current=\"page\"" if f == current else ""}>{n}</a>' for f, n in PAGES]
    items.append('                    <a href="regulation.html">품질인정제도</a>')
    return ('        <nav class="biz-tabs" aria-label="사업영역 이동">\n            <div class="wrap">\n                <div class="biz-tabs-list">\n'
            + "\n".join(items) + "\n                </div>\n            </div>\n        </nav>\n")


def page(fname, name, title, desc, lead, body):
    h = head
    h = h.replace("내화채움구조 품질인정제도 | 주식회사 디오이엔씨 (DOENC)", f"{title} | 주식회사 디오이엔씨 (DOENC)")
    h = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + desc, h)
    h = re.sub(r'(<meta property="og:description" content=")[^"]*', lambda m: m.group(1) + desc, h)
    h = h.replace("company-site/regulation.html", "company-site/" + fname)
    h = h.replace('<link rel="stylesheet" href="assets/css/regulation.css?v=20261113r1">', f'<link rel="stylesheet" href="assets/css/business.css?v={V}">')
    h = h.replace('class="regulation-page"', 'class="business-page"')
    top = f'''
        <div class="page-head">
            <div class="wrap">
                <p class="crumb"><a href="index.html#home">HOME</a><span>/</span>사업영역<span>/</span><strong>{name}</strong></p>
                <h1 class="page-title">{title if fname == "business-software.html" else name}</h1>
                <p class="page-lead">{lead}</p>
            </div>
        </div>

'''
    open(f"{root}/{fname}", "w", encoding="utf-8").write(h + top + tabs(fname) + body + foot)


# ---------------------------------------------------------------- 내화채움구조
firestop = '''
        <section class="sec" aria-labelledby="leadHeading">
            <div class="wrap biz-lead">
                <div class="biz-lead-text">
                    <h2 id="leadHeading">인정서 60건으로<br>벽과 바닥의 관통부를 막습니다.</h2>
                    <p>보드, 자켓, 밴드, 블랭킷, 실란트를 직접 만들고 인정받은 구조대로 시공합니다.</p>
                    <dl class="biz-nums">
                        <div><dt>내화채움구조 품질인정서</dt><dd>60<small>건</small></dd></div>
                        <div><dt>금속배관 인정 규격</dt><dd>400<small>A까지</small></dd></div>
                        <div><dt>금속덕트 인정 규격 (mm)</dt><dd>2,600<small>×650</small></dd></div>
                    </dl>
                </div>
                <figure class="biz-figure">
                    <img src="assets/media/hero/doenc-product-campaign-v1.webp" width="1672" height="941" alt="내화채움보드와 내화자켓, 브라켓 제품 사진">
                    <figcaption>내화채움보드 SFB-100F, 내화자켓 SFBA-200</figcaption>
                </figure>
            </div>
        </section>

        <section class="sec biz-tint" aria-labelledby="fieldsHeading">
            <div class="wrap">
                <div class="biz-head"><h2 id="fieldsHeading">주요 시공 현장</h2></div>
                <div class="biz-fields">
                    <article class="biz-field">
                        <div class="biz-field-media"><img src="assets/media/business/site-hightech.svg?v=20261116b4" width="1360" height="840" loading="lazy" alt="색색의 사각 패널로 외벽을 덮은 대형 반도체 공장을 그린 그림"></div>
                        <div>
                            <h3>하이테크 현장</h3>
                            <p class="biz-names">삼성전자, SK하이닉스 <span>등</span></p>
                        </div>
                    </article>
                    <article class="biz-field">
                        <div class="biz-field-media"><img src="assets/media/business/site-plant.svg?v=20261116b4" width="1360" height="840" loading="lazy" alt="푸른 유리 외벽의 대형 공장과 루버 설비동을 그린 그림"></div>
                        <div>
                            <h3>대형 공장</h3>
                            <p class="biz-names">LG디스플레이, 삼성디스플레이, 삼성바이오로직스 <span>등</span></p>
                        </div>
                    </article>
                    <article class="biz-field">
                        <div class="biz-field-media"><img src="assets/media/business/site-tower.svg?v=20261116b4" width="1360" height="840" loading="lazy" alt="호수 건너편에서 본, 위로 갈수록 좁아지는 123층 타워를 그린 그림"></div>
                        <div>
                            <h3>일반 대형 건축물</h3>
                            <p class="biz-names">잠실 롯데월드타워 <span>등</span></p>
                        </div>
                    </article>
                </div>
            </div>
        </section>

        <section class="sec" aria-labelledby="certHeading">
            <div class="wrap">
                <div class="biz-head"><h2 id="certHeading">인정서 60건</h2></div>
                <dl class="biz-rows">
                    <div><dt>금속배관 31건</dt><dd>25A부터 400A까지<small>벽체와 바닥, 보온과 비보온</small></dd></div>
                    <div><dt>비금속배관 19건</dt><dd>50A부터 250A까지<small>내화자켓, 보드+자켓, 바닥 상부 시공</small></dd></div>
                    <div><dt>금속덕트 3건</dt><dd>벽체 2,600 × 650mm</dd></div>
                    <div><dt>다발배관 7건</dt><dd>금속, 비금속, S-gas, 냉매배관</dd></div>
                </dl>
                <div class="biz-more" style="margin-top:34px">
                    <a href="archive.html?v=20261104r5#firestop">인정서 보기</a>
                    <a href="index.html#technology">3D 시공방법</a>
                    <a href="regulation.html">품질인정제도</a>
                    <a href="index.html#contact">문의하기</a>
                </div>
            </div>
        </section>
'''

# ---------------------------------------------------------------- 내화구조
fireproof = '''
        <section class="sec" aria-labelledby="leadHeading">
            <div class="wrap biz-lead">
                <div class="biz-lead-text">
                    <h2 id="leadHeading">2002년부터<br>지하구 방화벽을 시공했습니다.</h2>
                    <p>전력구, 통신구, 공동구를 구간마다 막아 케이블 화재가 번지지 않게 합니다.</p>
                    <dl class="biz-nums">
                        <div><dt>지하공동구 방화벽 시공 시작</dt><dd>2002<small>년</small></dd></div>
                        <div><dt>2002~2016년 시공 사례</dt><dd>30<small>곳 이상</small></dd></div>
                        <div><dt>관통부 내화충전구조 시험</dt><dd>3<small>시간</small></dd></div>
                    </dl>
                </div>
                <figure class="biz-figure">
                    <img src="assets/media/business/tunnel-a.jpg" width="578" height="433" alt="케이블 선반 사이를 막은 흰색 방화벽과 출입문">
                    <figcaption>전력구 방화벽 시공 사진</figcaption>
                </figure>
            </div>
        </section>

        <section class="sec biz-tint" aria-labelledby="fieldsHeading">
            <div class="wrap">
                <div class="biz-head"><h2 id="fieldsHeading">주요 시공 현장</h2></div>
                <div class="biz-fields">
                    <article class="biz-field">
                        <div class="biz-field-media"><img src="assets/media/business/tunnel-b.jpg" width="572" height="434" loading="lazy" alt="전력 케이블이 양쪽으로 지나는 지하구의 방화벽과 스테인리스 출입문"></div>
                        <div>
                            <h3>전력구</h3>
                            <p class="biz-names">한국전력공사</p>
                            <p class="biz-note">2007년 전력구 방화벽 시공 참여.<br>서울 중부·동서울·신림·등촌, 인천, 수원, 부산, 대구 안심 전력구.</p>
                        </div>
                    </article>
                    <article class="biz-field">
                        <div class="biz-field-media is-contain"><img src="assets/media/archive/fireproof/telecom-mockup-1.jpg" width="600" height="584" loading="lazy" alt="통신구 방화벽 설치 상세를 실물로 만든 목업"></div>
                        <div>
                            <h3>통신구</h3>
                            <p class="biz-names">KT</p>
                            <p class="biz-note">2009년 통신구 방화벽 시공 참여.<br>2020년 시범사업, 2021~2022년 1·2차 사업에 적용.</p>
                        </div>
                    </article>
                    <article class="biz-field">
                        <div class="biz-field-media"><img src="assets/images/products/firewall-site.webp" width="585" height="433" loading="lazy" alt="공동구 통로를 막은 방화벽과 열린 출입문"></div>
                        <div>
                            <h3>공동구</h3>
                            <p class="biz-names">여의도, 분당, 인천 송도, 충남도청 <span>등</span></p>
                            <p class="biz-note">산본, 안산, 해운대, 가락, 대전 둔산 공동구.</p>
                        </div>
                    </article>
                </div>
                <p class="biz-source">현장명과 연도는 디오이엔씨 카탈로그와 공동구 방화벽 기술자료에 실린 내용입니다.</p>
            </div>
        </section>

        <section class="sec" aria-labelledby="certHeading">
            <div class="wrap">
                <div class="biz-head"><h2 id="certHeading">내화구조 벽체 인정</h2></div>
                <dl class="biz-rows">
                    <div><dt>인정번호</dt><dd>FR-WS26-0102-1</dd></div>
                    <div><dt>자재</dt><dd>내화보드 SFB-100E<small>불연성 무기화합물, 두께 9mm</small></dd></div>
                </dl>
                <div class="biz-more" style="margin-top:34px">
                    <a href="archive.html?v=20261104r5#fireproof">인정서 보기</a>
                    <a href="index.html#technology">3D 시공방법</a>
                    <a href="index.html#contact">문의하기</a>
                </div>
            </div>
        </section>
'''

# ---------------------------------------------------------------- 방화셔터
shutter = '''
        <section class="sec" aria-labelledby="leadHeading">
            <div class="wrap biz-lead">
                <div class="biz-lead-text">
                    <h2 id="leadHeading">상업시설부터 물류창고까지<br>방화셔터를 만들고 시공합니다.</h2>
                    <p>일반, 대형, 와이어 권취형, 철재 셔터와 기둥 없는 각형·곡선형 스크린 셔터.</p>
                    <dl class="biz-nums">
                        <div><dt>방화셔터 품질인정서</dt><dd>5<small>건</small></dd></div>
                        <div><dt>스크린 방화셔터 특허 등록</dt><dd>2006<small>년</small></dd></div>
                        <div><dt>곡선형 셔터 대응 각도</dt><dd>90~180<small>°</small></dd></div>
                    </dl>
                </div>
                <figure class="biz-figure">
                    <img src="assets/media/hero/shutter-large-photo.jpg" width="1280" height="960" alt="높고 넓은 실내 개구부에 내려온 대형 방화셔터">
                    <figcaption>대형 방화셔터</figcaption>
                </figure>
            </div>
        </section>

        <section class="sec biz-tint" aria-labelledby="sitesHeading">
            <div class="wrap">
                <div class="biz-head"><h2 id="sitesHeading">주요 시공 현장</h2></div>
                <div class="biz-photos">
                    <figure><img src="assets/media/business/shutter-bundershop.jpg" width="326" height="247" loading="lazy" alt="매장 안쪽을 막고 내려온 각형 스크린 셔터"><figcaption>신세계 분더샵</figcaption></figure>
                    <figure><img src="assets/media/business/shutter-galleria.jpg" width="458" height="283" loading="lazy" alt="백화점 중앙 보이드를 따라 설치된 곡선형 셔터"><figcaption>천안 갤러리아 백화점</figcaption></figure>
                    <figure><img src="assets/media/business/shutter-nineone.jpg" width="460" height="283" loading="lazy" alt="기둥 옆으로 내려온 각형 스크린 셔터"><figcaption>한남 나인원</figcaption></figure>
                    <figure><img src="assets/media/business/shutter-parc1.jpg" width="460" height="283" loading="lazy" alt="벽면 전체를 막은 곡선형 스크린 셔터"><figcaption>여의도 파크원</figcaption></figure>
                    <figure><img src="assets/media/business/shutter-kt.jpg" width="460" height="343" loading="lazy" alt="계단실 둘레를 막은 무기둥 각형 셔터"><figcaption>청진동 KT 본사 사옥</figcaption></figure>
                    <figure><img src="assets/media/business/shutter-severance.jpg" width="458" height="282" loading="lazy" alt="병원 로비 상층 난간을 따라 내려온 각형 셔터"><figcaption>연세 세브란스 병원</figcaption></figure>
                </div>
                <dl class="biz-rows" style="margin-top:44px">
                    <div><dt>상업·업무 시설</dt><dd>여의도 파크원, 신세계 분더샵, 천안 갤러리아 백화점, 한남 나인원, 청진동 KT 본사 사옥, CJ 남산타워, CJ 송도 타임스페이스, 제주 클리프호텔</dd></div>
                    <div><dt>병원·교육·공공</dt><dd>이대 마곡 병원, 연세 세브란스 병원, 의정부 을지대 병원, 한양대 미래과학관, 시흥 배곧 서울 캠퍼스, CJ R&amp;D 센터, 경기도 신청사, 제주 영어마을</dd></div>
                    <div><dt>공장·물류창고</dt><dd>넓고 높은 개구부는 대형 셔터와 와이어 권취형 대형 셔터로 막습니다.</dd></div>
                </dl>
                <p class="biz-source">현장명은 디오이엔씨 무기둥 셔터 시공현장 자료에 실린 16곳입니다.</p>
            </div>
        </section>

        <section class="sec" aria-labelledby="certHeading">
            <div class="wrap">
                <div class="biz-head"><h2 id="certHeading">인정서 5건</h2></div>
                <dl class="biz-rows">
                    <div><dt>일반 셔터</dt><dd>FDS-OTS24-0807-1</dd></div>
                    <div><dt>대형 셔터</dt><dd>FDS-OTS25-0721-1</dd></div>
                    <div><dt>와이어 권취형 대형 셔터</dt><dd>FDS-OTS26-0630-2</dd></div>
                    <div><dt>철재 셔터</dt><dd>FDS-NVS24-0611-1</dd></div>
                    <div><dt>투시형 철재 셔터</dt><dd>FDS-NVS26-0309-1</dd></div>
                </dl>
                <div class="biz-more" style="margin-top:34px">
                    <a href="index.html#shutter">작동 영상</a>
                    <a href="archive.html?v=20261104r5#shutter">인정서 보기</a>
                    <a href="index.html#contact">문의하기</a>
                </div>
            </div>
        </section>
'''

# ---------------------------------------------------------------- 설계소프트웨어
software = '''
        <section class="sec" aria-labelledby="leadHeading">
            <div class="wrap biz-lead">
                <div class="biz-lead-text">
                    <h2 id="leadHeading">도면에서 내화채움구조 물량을<br>자동으로 산출합니다.</h2>
                    <p>DESkey는 디오이엔씨가 만든 AutoCAD 기반 내화채움구조 설계 프로그램입니다.</p>
                    <dl class="biz-nums">
                        <div><dt>기존 대비 작업 속도</dt><dd>10<small>배</small></dd></div>
                        <div><dt>라인 정보 입력</dt><dd>10<small>초</small></dd></div>
                        <div><dt>엑셀 물량표 출력</dt><dd>3<small>초</small></dd></div>
                    </dl>
                </div>
                <figure class="biz-figure is-doc">
                    <img src="assets/media/archive/software/deskey-manual.jpg" width="536" height="780" alt="DESkey 소개 자료. 블록 배치, 라인 정보 입력, 엑셀 연동 화면이 실려 있다">
                    <figcaption>DESkey 소개 자료</figcaption>
                </figure>
            </div>
        </section>

        <section class="sec biz-tint" aria-labelledby="flowHeading">
            <div class="wrap">
                <div class="biz-head"><h2 id="flowHeading">사용 순서</h2></div>
                <ol class="biz-flow">
                    <li><strong>현장 조건 입력</strong><span>도면에 나온 관통재 높이와 사이즈를 입력합니다.</span></li>
                    <li><strong>인정구조 선정</strong><span>조건에 맞는 내화채움구조 블록을 도면에 배치합니다.</span></li>
                    <li><strong>물량 산출</strong><span>자재 물량을 엑셀로 내보냅니다.</span></li>
                </ol>
            </div>
        </section>

        <section class="sec" aria-labelledby="useHeading">
            <div class="wrap">
                <div class="biz-head"><h2 id="useHeading">쓰는 곳</h2></div>
                <dl class="biz-rows">
                    <div><dt>설계사무소</dt><dd>설계 단계에서 관통부마다 인정구조를 정하고 물량을 확인합니다.</dd></div>
                    <div><dt>BIM 물량 산출</dt><dd>BIM 물량 산출 업무에서 내화채움구조 자재 수량을 뽑습니다.</dd></div>
                    <div><dt>사용 환경</dt><dd>AutoCAD 2014~2019</dd></div>
                </dl>
                <p class="biz-source">속도 수치는 DESkey 소개 자료에 실린 내용입니다.</p>
                <div class="biz-more" style="margin-top:22px">
                    <a href="archive.html?v=20261104r5#software">사용설명서와 카달로그</a>
                    <a href="index.html#contact">도입 문의</a>
                </div>
            </div>
        </section>
'''

page("business-firestop.html", "내화채움구조", "내화채움구조",
     "디오이엔씨 내화채움구조. 품질인정서 60건으로 반도체 공장, 대형 공장, 초고층 건축물의 설비 관통부를 시공합니다.",
     "배관, 덕트, 케이블이 벽과 바닥을 지나는 자리를 막아 불과 연기가 번지지 않게 합니다.", firestop)
page("business-fireproof.html", "내화구조", "내화구조",
     "디오이엔씨 내화구조. 2002년부터 전력구, 통신구, 공동구의 방화벽을 시공했습니다.",
     "지하 전력구, 통신구, 공동구를 구간마다 나누는 방화벽입니다.", fireproof)
page("business-shutter.html", "방화셔터", "방화셔터",
     "디오이엔씨 방화셔터. 품질인정서 5건으로 상업시설, 병원, 공장, 물류창고에 스크린·철재 방화셔터를 시공합니다.",
     "불이 나면 내려와 공간을 나누는 스크린 셔터와 철재 셔터입니다.", shutter)
page("business-software.html", "설계소프트웨어", "설계소프트웨어 DESkey",
     "DESkey는 내화채움구조 물량을 자동으로 산출하는 프로그램입니다. 설계사무소와 BIM 물량 산출에 쓰입니다.",
     "내화채움구조 물량을 자동으로 산출하는 프로그램입니다.", software)
print("built", [f for f, _ in PAGES])
