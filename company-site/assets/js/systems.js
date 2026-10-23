// Sources supplied by DOENC. Page numbers below are physical PDF pages (1-based).
// Recognition applies to each complete specified assembly, not an isolated material.
const source = name => new URL('../자료/' + name, import.meta.url).href;
export const SOURCES = {
  metal: source('5) FS-MP23-1103-3 벽체 비보온 금속배관 전규격 인정서.pdf'),
  polymer: source('36) FS-NP24-0617-5 벽체 비금속배관 250A 인정서(내화자켓).pdf'),
  duct: source('51) FS-MP25-0224-06 벽체 금속덕트 중공부관통 전규격 인정서.pdf'),
  catalog: new URL('../docs/doenc-catalog-2025-web.pdf', import.meta.url).href,
  technical: source('3. 내화채움구조 인정제도 기술자료_(주)디오이엔씨 (07.08).pdf'),
  shutter: source('셔터 영상.mp4'),
};
export const MATERIALS = {
  board: { name: '내화채움보드', code: 'SFB-100F', page: 6 },
  jacket: { name: '내화자켓', code: 'SFBA-200', page: 7 },
  sealant: { name: '내화실리콘실란트', code: 'SFS-100', page: 8 },
  blanket: { name: '세라믹섬유블랭킷', code: 'SFI-100', page: 9 },
  band: { name: '내화밴드', code: 'SFBA-120', page: 10 },
};
export const SYSTEMS = {
  metal: {
    floor: 1, name: '금속배관', en: 'METAL PIPE', code: 'DO-SW400-2H-F', certificate: 'FS-MP23-1103-3',
    title: '양면의 채움보드, 두 겹의 단열 보호.',
    description: '공장에서 규격에 맞게 제작된 SFB-100F 보드를 벽체 양면에 설치합니다. 접점과 이음매를 SFS-100으로 마감한 뒤, 은박 세라믹섬유블랭킷을 각 면 1,000 mm 길이로 두 겹 시공하고 철선으로 고정합니다.',
    materials: ['board', 'sealant', 'blanket'],
    facts: ['보드 8.84 mm 이상 · 한 면 2장', '블랭킷 25 mm × 2겹 · 양면', '인정서 기재 성능: 차염 2시간'],
    steps: [ [0, '1F 관통부 확인'], [2, '양면 분할 보드 · 나사 고정'], [4.4, '테두리 · 이음매 실란트'], [6.4, '블랭킷 1겹 · 700 + 300 mm'], [9, '블랭킷 2겹 · 700 + 300 mm'], [11.8, '철선 · 테이프 마감'], [14, '화재차단 원리'], [17, '양면 시공 완료'] ],
    drawingPage: 4, specPage: 10, duration: 18,
  },
  polymer: {
    floor: 2, name: '비금속배관', en: 'NON-METAL PIPE', code: 'DO-NW250-2H-J', certificate: 'FS-NP24-0617-5',
    title: '관을 감싸는 자켓, 안쪽으로 팽창하는 내화밴드.',
    description: '250A 내화자켓 SFBA-200을 관 둘레에 감싸고 고리를 체결합니다. 브라켓은 벽체 방향으로 배치하며, 한 면 12개씩 양면에 고정합니다. 화재 시 내부 내화밴드가 팽창하여 관통부를 막습니다.',
    materials: ['jacket'],
    facts: ['외경 267 mm 이하 · 개구부 277 mm 이하', '자켓 너비 132 mm 이상 · 양면 각 1개', '브라켓 한 면 12개 · 총 24개'],
    steps: [[0, '2F 관통부 확인'], [2, '양면 내화자켓 감싸기'], [5, '고리 체결 · 벽체 밀착'], [7, '브라켓 12개씩 양면 고정'], [11, '내화밴드 발포 · 팽창'], [17, '관통부 차단']],
    drawingPage: 4, specPage: 9, duration: 18,
  },
  duct: {
    floor: 3, name: '금속덕트', en: 'METAL DUCT', code: 'DO-DW2600-2H-F', certificate: 'FS-MP25-0224-06',
    title: '중공부부터 외곽까지, 겹겹이 연결되는 보호 구조.',
    description: '벽체에 근접한 방화댐퍼와 덕트를 결합하고, 관통하는 SFI-100 위에 SFBA-120 밴드를 개구부 내부 4면에 두 겹 설치합니다. 양면 보드·실란트·보온재를 순서대로 시공하고 찬넬과 전산볼트로 고정합니다.',
    materials: ['band', 'board', 'sealant', 'blanket'],
    facts: ['덕트 2,600 × 650 mm 기준 도면', '밴드 12 mm · 너비 140 mm · 2겹', '양면 보온재 · 찬넬 간격 500 mm 이하'],
    steps: [[0, '3F 덕트 · 방화댐퍼 결합'], [2, '관통 블랭킷 25 mm'], [4, '내화밴드 · 내부 4면 2겹'], [6, '양면 보드 · 실란트 마감'], [9, '50 mm 보온재 · 너비 400 mm'], [11, '25 mm 보온재 · 너비 1,000 mm'], [13, '찬넬 · 전산볼트 고정'], [15, '댐퍼 · 관통부 화재차단'], [17, '시공 완료']],
    drawingPage: 4, specPage: 7, duration: 18,
  },
  shutter: {
    floor: 4, name: '스크린셔터', en: 'SCREEN SHUTTER', code: 'DOENC FIRE SCREEN', certificate: null,
    title: '두 장의 스크린이 내려와 공간을 구획합니다.',
    description: '제공된 실제 구동 영상의 중앙 가이드, 양쪽 스크린, 하단바를 반영했습니다. 평탄한 원단이 두 개의 개구부를 따라 함께 내려옵니다. 실제 영상은 아래에서 확인할 수 있습니다.',
    materials: [], facts: ['중앙 가이드 · 두 개의 스크린', '평탄한 원단 · 하단바', '구동 영상 기준 · 재생 시간 축약'],
    steps: [[0, '4F 셔터 확대'], [2, '개방 상태'], [3, '양쪽 스크린 하강'], [15.5, '하단 도달 · 폐쇄']],
    duration: 18,
  },
};
