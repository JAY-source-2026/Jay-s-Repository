// Existing operation footage is mapped only to its documented shutter type.
const clips = {
  standard: {
    title: '일반셔터', certificate: 'FDS-OTS24-0807-1', duration: '00:29',
    src: 'assets/media/archive/shutter/standard-shutter.mp4',
    poster: 'assets/media/archive/shutter/standard-shutter-poster.jpg',
  },
  large: { title: '대형셔터', certificate: 'FDS-OTS25-0721-1' },
  wire: {
    title: '와이어 권취형 대형셔터', certificate: 'FDS-OTS26-0630-2', duration: '02:20',
    src: 'assets/media/hero/wire-shutter-operation.mp4',
    poster: 'assets/media/hero/wire-shutter-poster.jpg',
  },
  steel: { title: '철재셔터', certificate: 'FDS-NVS24-0611-1' },
  vision: { title: '투시형 철재셔터', certificate: 'FDS-NVS26-0309-1' },
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
let selected = 'standard';
let selectionVersion = 0;

function showNotice(text, canRetry = false) {
  message.textContent = text;
  retry.hidden = !canRetry;
  notice.hidden = !text;
}

function selectClip(key) {
  const clip = clips[key];
  if (!clip) return;
  selected = key;
  const version = ++selectionVersion;
  video.pause();
  showNotice('');
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
  if (matchMedia('(max-width: 760px)').matches) {
    player.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
}

buttons.forEach(button => button.addEventListener('click', () => selectClip(button.dataset.shutterVideo)));
retry.addEventListener('click', () => selectClip(selected));
video.addEventListener('error', () => {
  if (clips[selected].src && video.error) showNotice('영상을 불러오지 못했습니다. 다시 시도해 주세요.', true);
});
video.addEventListener('playing', () => showNotice(''));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) video.pause();
});
