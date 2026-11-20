// Existing operation footage is mapped only to its documented shutter type.
const clips = {
  standard: {
    title: '일반 스크린셔터', certificate: 'FDS-OTS24-0807-1 · DO-FSS60(S)', duration: '00:29',
    src: 'assets/media/archive/shutter/standard-shutter.mp4',
    poster: 'assets/media/archive/shutter/standard-shutter-poster.jpg',
  },
  fab: { title: '일반 스크린셔터 FAB(팹) 2H', certificate: 'FDS-OTS26-0714-3 · DO-FSS120(I)' },
  large: { title: '대형 스크린셔터', certificate: 'FDS-OTS25-0721-1 · DO-FSS60(L)' },
  wire: {
    title: '대형 와이어권취식 셔터', certificate: 'FDS-OTS26-0630-2 · DO-FSS60(LW-UJ)', duration: '02:20',
    src: 'assets/media/hero/wire-shutter-operation.mp4',
    poster: 'assets/media/hero/wire-shutter-poster.jpg',
  },
  steel: { title: '철재셔터', certificate: 'FDS-NVS24-0611-1 · DO-FST60' },
  vision: { title: '철재 투시형 셔터', certificate: 'FDS-NVS26-0309-1 · DO-FST60(IG)' },
};

const player = document.getElementById('shutterPlayer');
const video = document.getElementById('shutterVideo');
const empty = document.getElementById('shutterVideoEmpty');
const title = document.getElementById('shutterVideoTitle');
const certificate = document.getElementById('shutterVideoCertificate');
const duration = document.getElementById('shutterVideoDuration');
const notice = document.getElementById('shutterVideoNotice');
const message = document.getElementById('shutterVideoMessage');
const retry = document.getElementById('shutterVideoRetry');
const buttons = [...document.querySelectorAll('[data-shutter-video]')];
const certificateButtons = [...document.querySelectorAll('[data-shutter-certificate]')];
const certificateView = document.getElementById('shutterCertificateView');
const certificatePages = document.getElementById('shutterCertificatePages');
let selected = 'standard';
let selectedCertificate = '';
let mode = 'video';
let selectionVersion = 0;
let certificateRequest;

function bringPlayerIntoView() {
  if (matchMedia('(max-width: 760px)').matches) {
    player.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
}

function loadCertificates() {
  if (!certificateRequest) {
    certificateRequest = fetch('assets/data/archive.json?v=20261120b1')
      .then(response => {
        if (!response.ok) throw new Error('Certificate list unavailable');
        return response.json();
      })
      .then(data => data.items.filter(item => item.cat === 'shutter' && item.board === 'recognition'))
      .catch(error => { certificateRequest = undefined; throw error; });
  }
  return certificateRequest;
}

async function selectCertificate(id) {
  const button = certificateButtons.find(item => item.dataset.shutterCertificate === id);
  if (!button) return;
  mode = 'certificate';
  selectedCertificate = id;
  const version = ++selectionVersion;
  video.pause();
  video.hidden = true;
  empty.hidden = true;
  certificateView.hidden = false;
  certificateView.setAttribute('aria-busy', 'true');
  certificatePages.replaceChildren();
  buttons.forEach(item => item.setAttribute('aria-pressed', 'false'));
  certificateButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  title.textContent = `${button.firstElementChild.firstChild.textContent} 품질인정서`;
  certificate.textContent = id;
  duration.textContent = '갑지 2쪽';
  showNotice('인정서를 불러오고 있습니다.');
  bringPlayerIntoView();
  try {
    const records = await loadCertificates();
    if (version !== selectionVersion) return;
    const record = records.find(item => item.certificate === id);
    if (!record || record.previews?.length !== 2) throw new Error('Certificate pages unavailable');
    certificate.textContent = `${id} · ${record.model}`;
    const images = record.previews.map(preview => {
      const img = new Image(preview.width, preview.height);
      img.alt = `${record.certificate} ${preview.label}`;
      img.src = preview.src;
      return img;
    });
    await Promise.all(images.map(img => img.decode()));
    if (version !== selectionVersion) return;
    certificatePages.replaceChildren(...images);
    showNotice('');
  } catch {
    if (version === selectionVersion) showNotice('인정서를 불러오지 못했습니다. 다시 시도해 주세요.', true);
  } finally {
    if (version === selectionVersion) certificateView.setAttribute('aria-busy', 'false');
  }
}

function showNotice(text, canRetry = false) {
  message.textContent = text;
  retry.hidden = !canRetry;
  notice.hidden = !text;
}

function selectClip(key) {
  const clip = clips[key];
  if (!clip) return;
  mode = 'video';
  selected = key;
  const version = ++selectionVersion;
  video.pause();
  showNotice('');
  certificateView.hidden = true;
  certificateView.setAttribute('aria-busy', 'false');
  certificateButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.shutterVideo === key)));
  title.textContent = `${clip.title} 작동 영상`;
  certificate.textContent = clip.certificate;
  duration.textContent = clip.duration || '영상 준비 중';
  video.hidden = !clip.src;
  empty.hidden = !!clip.src;

  if (clip.src) {
    video.setAttribute('aria-label', `${clip.title} 작동 영상`);
    video.poster = clip.poster;
    video.src = clip.src;
    video.load();
    video.play().catch(error => {
      // Ignore interrupted requests when another menu is selected quickly.
      if (version !== selectionVersion || error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') showNotice('영상의 재생 버튼을 눌러주세요.');
      else showNotice('영상을 불러오지 못했습니다. 다시 시도해 주세요.', true);
    });
  } else {
    video.removeAttribute('src');
    video.removeAttribute('poster');
    video.load();
  }

  // The mobile player follows the menus; bring it into view after selection.
  bringPlayerIntoView();
}

buttons.forEach(button => button.addEventListener('click', () => selectClip(button.dataset.shutterVideo)));
certificateButtons.forEach(button => button.addEventListener('click', () => selectCertificate(button.dataset.shutterCertificate)));
retry.addEventListener('click', () => mode === 'certificate' ? selectCertificate(selectedCertificate) : selectClip(selected));
video.addEventListener('error', () => {
  if (mode === 'video' && clips[selected].src && video.error) showNotice('영상을 불러오지 못했습니다. 다시 시도해 주세요.', true);
});
video.addEventListener('playing', () => { if (mode === 'video') showNotice(''); else video.pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) video.pause();
});
