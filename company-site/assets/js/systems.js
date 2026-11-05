// Certificate records and installation sequences come from the supplied PDFs.
export const SOURCES = {
  catalog: new URL('../docs/doenc-catalog-2025-web.pdf', import.meta.url).href,
  firewall: new URL('../downloads/fireproof-certificates/FR-WS26-0102-1.pdf', import.meta.url).href,
  utilityTunnel: new URL('../자료/공동구(통신구,전력구)방화벽 기술자료.pptx', import.meta.url).href,
};
export const MATERIALS = {
  board: { name: '내화채움보드', code: 'SFB-100F', page: 6 },
  jacket: { name: '내화자켓', code: 'SFBA-200', page: 7 },
  sealant: { name: '내화실리콘실란트', code: 'SFS-100', page: 8 },
  blanket: { name: '세라믹섬유블랭킷', code: 'SFI-100', page: 9 },
  band: { name: '내화밴드', code: 'SFBA-120', page: 10 },
};
export const CATEGORIES = {
  metal: {name:'금속배관', en:'METAL PIPE', default:'FS-MP23-1103-3'},
  polymer: {name:'비금속배관', en:'NON-METAL PIPE', default:'FS-NP24-0617-5'},
  duct: {name:'금속덕트', en:'METAL DUCT', default:'FS-MP25-0224-06'},
  bundle: {name:'다발배관', en:'BUNDLED PIPES', default:'FS-MP25-0625-02'},
};
export const SYSTEMS = {
  firewall: {
    routeLabel: "지하 공동구",
    previewDescription: "기존 공동구의 중앙 출입문과 케이블 선반 구성을 유지했습니다. 클릭하면 앞면 내화벽체를 순서대로 시공합니다.",
    instructions: ["지하 공동구의 벽체 설치 위치를 확인합니다. 중앙 출입문과 케이블 선반은 현장 사진을 참고했습니다.", "천장에 윗막이, 바닥에 밑막이 런너를 설치합니다.", "런너 사이에 C형 스터드를 300 / 314 / 300 mm 간격으로 배치합니다.", "스터드 사이에 보강대를 세로 600 mm 간격으로 설치합니다.", "위쪽 코너부터 SFB-100E 보드를 한 장씩 부착합니다. 보드 두께는 9.84 mm 이상입니다.", "인정서의 간격 조건에 맞춰 보드를 직결나사로 고정합니다.", "판 이음매와 주변 접합부를 SFS-100 실란트로 마감합니다.", "앞면 시공 완료. 완성 벽체는 양면 보드와 경량강재로 이루어집니다."],
    floor: 0, name: '내화벽체', en: 'FIRE-RATED WALL', code: 'DO-FW09SB-1H', certificate: 'FR-WS26-0102-1',
    title: '지하 공동구를 구획하는 내화벽체.',
    description: '공동구 시공 사진의 중앙 통로와 케이블 선반을 반영했습니다. 내화벽체는 경량강재 런너·스터드·보강대에 SFB-100E 보드를 부착하는 구조입니다. 시공 장면은 앞면을 보여주며, 코너 위쪽부터 보드를 한 장씩 설치하고 나사와 실란트로 마감합니다.',
    materials: [],
    facts: ['보드 9.84 mm 이상 · 양면 구성', '벽체 총 두께 119.68 mm 이상 · 비내력벽', '인정서 기재 내화성능: 1시간', '중앙 출입문 · 케이블 선반은 시공 사진 참고'],
    steps: [[0, '지하 공동구 · 설치 위치'], [1, '윗막이 · 밑막이 런너'], [3, '스터드 · 300 / 314 / 300 mm'], [5.5, '보강대 · 세로 600 mm'], [7.5, '코너 위쪽부터 보드 설치'], [14.5, '직결나사 고정'], [16.5, '이음매 · 접합부 실란트'], [20, '내화벽체 시공 완료']],
    drawingPage: 3, specPage: 8, duration: 21,
  },
};

let records = [], loading;
export function getCertificates() { return records; }
export function applyCertificate(id) {
  const record = records.find(item => item.id === id);
  if (!record) return null;
  const {category, steps} = record, meta = CATEGORIES[category];
  const materials = [];
  for (const [key, pattern] of [['board',/^SFB-/],['jacket',/^SFBA-200/],['sealant',/^SFS-/],['blanket',/^SFI-/],['band',/^SFBA-(?!200)/]]) {
    if (record.materials.some(code => pattern.test(code))) materials.push(key);
  }
  const orientation = record.geometry.orientation === 'floor' ? '바닥 관통부' : '벽체 관통부';
  SYSTEMS[category] = {
    ...meta, floor: 1, record, certificate: id, code: record.code,
    routeLabel: orientation, title: record.title, previewDescription: `${record.code} · ${orientation}의 시공 순서를 확인하세요.`,
    description: `${record.title}. 오른쪽 화살표에서 다른 인정서를 선택할 수 있습니다.`,
    facts: [record.code, orientation, ...record.materials], materials,
    steps: [...steps.map((step,i) => [i * 3, step.kind === 'service' ? '관통재 설치 · 연결부 확인' : step.title]), [steps.length * 3, '시공 완료 · 마감 확인']],
    instructions: [...steps.map(step => `원문 PDF ${step.page}쪽 · ` + step.text), '시공 순서를 완료했습니다. 선택한 인정서의 도면·시방과 설치 상태를 확인합니다.'],
    drawingPage: record.drawingPage, specPage: record.specPage, duration: steps.length * 3 + 1,
  };
  SOURCES[category] = new URL('../../' + record.pdf, import.meta.url).href;
  return SYSTEMS[category];
}
export function loadCertificates() {
  if (!loading) loading = (async () => {
    const response = await fetch(new URL('../data/installation-certificates.json?v=20261105r3', import.meta.url));
    if (!response.ok) throw new Error('인정서 시방 자료를 불러오지 못했습니다.');
    const data = await response.json();
    if (!Array.isArray(data.certificates) || data.certificates.length !== 60) throw new Error('인정서 시방 자료를 확인해주세요.');
    records = data.certificates;
    for (const meta of Object.values(CATEGORIES)) applyCertificate(meta.default);
    return records;
  })().catch(error => { loading = null; throw error; });
  return loading;
}
