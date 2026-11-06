/*
  Музыкальный плеер ArtS13Studio.

  На главной этот файл управляет только плашкой нового релиза и следит,
  чтобы одновременно играл один audio. В music/ он дополнительно создаёт
  нижний общий плеер.

  ВАЖНО: порядок tracks должен совпадать с data-track-index карточек
  в music/index.html. Индексы начинаются с нуля.
*/

// Строим абсолютные пути относительно самого player.js, поэтому скрипт работает
// и на главной, и во вложенной папке music/.
const playerScript = document.currentScript;
const assetsBase = new URL("./", playerScript?.src ?? window.location.href);
const controlIcon = (name) => new URL(`controls/${name}.svg`, assetsBase).href;

// Единый каталог доступных аудиофайлов. Будущие треки без готового MP3 сюда не добавлять.
const tracks = [
  { title: "#Код ворона", cover: "music/kod-vorona-cover.webp?v=20261106-studio4", src: "audio/kod-vorona.mp3?v=20261106-studio4" },
  { title: "До последнего света", cover: "music/do-poslednego-sveta-cover.webp?v=20261106-studio4", src: "audio/do-poslednego-sveta.mp3?v=20261106-studio4" },
  { title: "С разных сторон", cover: "music/s-raznykh-storon-cover.webp?v=20261106-studio4", src: "audio/s-raznykh-storon.mp3?v=20261106-studio4" },
  { title: "Море не делит", cover: "music/more-ne-delit-cover.webp?v=20261106-studio4", src: "audio/more-ne-delit.mp3?v=20261106-studio4" },
  { title: "На плечах", cover: "music/na-plechakh-cover.webp?v=20261106-studio4", src: "audio/na-plechakh.mp3?v=20261106-studio4" },
  { title: "Зверь в проводах", cover: "music/zver-v-provodakh-cover.webp?v=20261106-studio4", src: "audio/zver-v-provodakh.mp3?v=20261106-studio4" },
  { title: "Мы ещё здесь", cover: "music/my-eshche-zdes-cover.webp?v=20261106-studio4", src: "audio/my-eshche-zdes.mp3?v=20261106-studio4" },
  { title: "#Руна на частоте", cover: "music/runa-na-chastote-cover.webp", src: "audio/runa-na-chastote.mp3" },
  { title: "Пока горим", cover: "music/poka-gorim-cover.webp", src: "audio/poka-gorim.mp3" },
  { title: "Последний круг", cover: "music/posledniy-krug-cover.webp", src: "audio/posledniy-krug.mp3" },
  { title: "Разные голоса", cover: "music/raznye-golosa-cover.webp", src: "audio/raznye-golosa.mp3" },
  { title: "Шествия", cover: "music/shestviya-cover.webp?v=20260901-album-covers1", src: "audio/shestviya.mp3" },
  { title: "Маска у цеха", cover: "music/maska-u-tsekha-cover.webp?v=20260901-album-covers1", src: "audio/maska-u-tsekha.mp3" },
  { title: "Пока помнят имена", cover: "music/poka-pomnyat-imena-cover.webp?v=20260901-album-covers1", src: "audio/poka-pomnyat-imena.mp3" },
  { title: "#Стражи порога", cover: "music/strazhi-poroga-cover.webp?v=20260901-album-covers1", src: "audio/strazhi-poroga.mp3" },
  { title: "#Лис, кицунэ и пука", cover: "music/lis-kitsune-i-puka-cover.webp?v=20260901-album-covers1", src: "audio/lis-kitsune-i-puka.mp3" },
  { title: "#Кузница трёх знаков", cover: "music/kuznitsa-trekh-znakov-cover.webp?v=20260901-album-covers1", src: "audio/kuznitsa-trekh-znakov.mp3" },
];

// Класс .music-page есть только у music/index.html.
const isMusicLibraryPage = document.querySelector(".music-page");

if (!isMusicLibraryPage) {
  // Логика главной страницы: кнопка Play/Pause у текущего релиза.
  const homeReleaseAudio = document.querySelector("[data-home-release-audio]");
  const homeReleaseButton = document.querySelector("[data-home-release-play]");

  function updateHomeReleaseButton() {
    if (!homeReleaseAudio || !homeReleaseButton) return;
    const isPlaying = !homeReleaseAudio.paused;
    const label = isPlaying ? "Пауза" : "Слушать";
    homeReleaseButton.innerHTML = `<img class="track-play-button-icon" src="${controlIcon(isPlaying ? "pause" : "play")}" alt="" aria-hidden="true" /><span class="track-play-button-label">${label}</span>`;
    homeReleaseButton.setAttribute("aria-label", `${label}: Код ворона`);
    homeReleaseButton.classList.toggle("is-playing", isPlaying);
  }

  homeReleaseButton?.addEventListener("click", () => {
    if (!homeReleaseAudio) return;
    if (homeReleaseAudio.paused) homeReleaseAudio.play().catch(updateHomeReleaseButton);
    else homeReleaseAudio.pause();
  });
  homeReleaseAudio?.addEventListener("play", updateHomeReleaseButton);
  homeReleaseAudio?.addEventListener("pause", updateHomeReleaseButton);
  homeReleaseAudio?.addEventListener("ended", updateHomeReleaseButton);

  // При запуске нового audio останавливаем все остальные плееры на главной.
  document.addEventListener("play", (event) => {
    const current = event.target;
    if (!(current instanceof HTMLAudioElement)) return;

    document.querySelectorAll("audio").forEach((player) => {
      if (player !== current && !player.paused) player.pause();
    });
  }, true);
} else {
// Разметка общего нижнего плеера добавляется только на странице всей музыки.
document.body.insertAdjacentHTML("beforeend", `
  <aside class="global-player" aria-label="Музыкальный плеер">
    <div class="global-player-inner">
      <div class="global-player-track">
        <img data-player-cover src="" alt="" />
        <div><span data-player-status role="status" aria-live="polite">Готов к прослушиванию</span><strong data-player-title></strong></div>
      </div>
      <div class="global-player-transport">
        <button type="button" data-player-previous aria-label="Предыдущий трек" title="Предыдущий трек"><img class="global-player-control-icon" src="${controlIcon("previous")}" alt="" aria-hidden="true" /></button>
        <button class="global-player-main-button" type="button" data-player-toggle aria-label="Воспроизвести" title="Воспроизвести"><img class="global-player-control-icon" data-player-main-icon src="${controlIcon("play")}" alt="" aria-hidden="true" /></button>
        <button type="button" data-player-next aria-label="Следующий трек" title="Следующий трек"><img class="global-player-control-icon" src="${controlIcon("next")}" alt="" aria-hidden="true" /></button>
      </div>
      <div class="global-player-options">
        <div class="global-player-modes" role="group" aria-label="Режим воспроизведения">
          <button class="player-mode-button" type="button" data-player-mode="repeat-one" aria-label="Повторять один трек" aria-pressed="false" title="Повторять один трек"><span class="player-mode-icon" aria-hidden="true">↻</span><span class="player-mode-label">Один</span></button>
          <button class="player-mode-button is-active" type="button" data-player-mode="sequential" aria-label="Слушать все треки подряд" aria-pressed="true" title="Слушать всё подряд"><span class="player-mode-icon player-mode-icon-list" aria-hidden="true">≡</span><span class="player-mode-label">Подряд</span></button>
        </div>
        <div class="global-player-volume">
          <button type="button" data-player-mute aria-label="Выключить звук" title="Выключить звук"><span data-player-volume-icon aria-hidden="true">◖))</span></button>
          <input data-player-volume type="range" min="0" max="100" step="1" value="100" aria-label="Громкость" />
          <output data-player-volume-value aria-live="polite">100%</output>
        </div>
      </div>
      <div class="global-player-progress">
        <span data-player-current>0:00</span>
        <input data-player-progress type="range" min="0" max="0" step="0.1" value="0" aria-label="Позиция воспроизведения" />
        <span data-player-duration>0:00</span>
      </div>
    </div>
    <audio data-global-audio preload="metadata"></audio>
  </aside>
`);

const audio = document.querySelector("[data-global-audio]");
const playerStatus = document.querySelector("[data-player-status]");
const cover = document.querySelector("[data-player-cover]");
const title = document.querySelector("[data-player-title]");
const toggle = document.querySelector("[data-player-toggle]");
const toggleIcon = document.querySelector("[data-player-main-icon]");
const previous = document.querySelector("[data-player-previous]");
const next = document.querySelector("[data-player-next]");
const progress = document.querySelector("[data-player-progress]");
const currentTime = document.querySelector("[data-player-current]");
const duration = document.querySelector("[data-player-duration]");
const modeButtons = document.querySelectorAll("[data-player-mode]");
const mute = document.querySelector("[data-player-mute]");
const volume = document.querySelector("[data-player-volume]");
const volumeIcon = document.querySelector("[data-player-volume-icon]");
const volumeValue = document.querySelector("[data-player-volume-value]");
const trackCards = document.querySelectorAll("[data-track-index]");

// Текущее состояние плеера.
let currentIndex = 0;
let playbackMode = "sequential";
let playerVolume = 1;
let lastAudibleVolume = 1;
let audioContext = null;
let audioSource = null;
let gainNode = null;
let selectionId = 0;

// На мобильных Safari HTMLMediaElement.volume работает только как 0 или 100%.
// GainNode даёт настоящее плавное изменение громкости во всех современных браузерах.
function ensureAudioGraph() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;

  try {
    if (!audioContext) {
      audioContext = new AudioContextClass();
      audioSource = audioContext.createMediaElementSource(audio);
      gainNode = audioContext.createGain();
      audioSource.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = playerVolume;
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function applyPlayerVolume(nextVolume) {
  playerVolume = Math.min(1, Math.max(0, Number(nextVolume) || 0));
  if (playerVolume > 0) lastAudibleVolume = playerVolume;

  if (ensureAudioGraph()) {
    audio.muted = false;
    audio.volume = 1;
    const now = audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setTargetAtTime(playerVolume, now, 0.015);
  } else {
    audio.volume = playerVolume;
    audio.muted = playerVolume === 0;
  }

  updateVolumeState();
}

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = String(Math.floor(value % 60)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Подсвечивает активную карточку и меняет её кнопку Слушать/Пауза.
function updateTrackCards() {
  trackCards.forEach((card) => {
    const cardIndex = Number(card.dataset.trackIndex);
    const isCurrent = cardIndex === currentIndex;
    const isPlaying = isCurrent && !audio.paused;
    card.classList.toggle("is-current", isCurrent);
    card.classList.toggle("is-playing", isPlaying);
    const button = card.querySelector("[data-track-play]");
    if (!button) return;
    const label = isPlaying ? "Пауза" : "Слушать";
    button.innerHTML = `<img class="track-play-button-icon" src="${controlIcon(isPlaying ? "pause" : "play")}" alt="" aria-hidden="true" /><span class="track-play-button-label">${label}</span>`;
    const cardTrack = tracks[cardIndex];
    if (cardTrack) button.setAttribute("aria-label", `${label}: ${cardTrack.title}`);
  });
}

function updatePlayerState() {
  const playing = !audio.paused;
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  toggleIcon.src = controlIcon(playing ? "pause" : "play");
  toggle.setAttribute("aria-label", playing ? "Пауза" : "Воспроизвести");
  toggle.setAttribute("title", playing ? "Пауза" : "Воспроизвести");
  updateTrackCards();
}

function setStatus(text, isError = false) {
  playerStatus.textContent = text;
  playerStatus.classList.toggle('is-error', isError);
}

async function playSelected() {
  const requestId = selectionId;
  ensureAudioGraph();
  if (audio.error) audio.load();
  setStatus('Загрузка…');
  try {
    await audio.play();
  } catch (error) {
    // Смена трека или пауза отменяет старый play(): это не ошибка нового трека.
    if (requestId !== selectionId || error.name === 'AbortError') return;
    setStatus(error.name === 'NotAllowedError' ? 'Нажмите ▶ для запуска' : 'Не удалось загрузить. Нажмите ▶ ещё раз', true);
    updatePlayerState();
  }
}

function updatePosition() {
  const length = Number.isFinite(audio.duration) ? audio.duration : 0;
  progress.max = String(length);
  progress.disabled = length <= 0;
  progress.value = String(length ? Math.min(audio.currentTime, length) : 0);
  currentTime.textContent = formatTime(audio.currentTime);
  duration.textContent = formatTime(length);
  progress.setAttribute('aria-valuetext', `${formatTime(audio.currentTime)} из ${formatTime(length)}`);
  if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && length > 0) {
    try { navigator.mediaSession.setPositionState({ duration: length, playbackRate: audio.playbackRate, position: Math.min(length, audio.currentTime) }); } catch {}
  }
}

function seekTo(value) {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  const target = Number(value);
  if (!Number.isFinite(target)) return;
  audio.currentTime = Math.min(audio.duration, Math.max(0, target));
  updatePosition();
}

// Ручные кнопки переключают по кругу. Подряд останавливается в конце списка.
function selectTrack(index, autoplay = true) {
  if (!Number.isInteger(index)) return;
  selectionId++;
  currentIndex = ((index % tracks.length) + tracks.length) % tracks.length;
  const track = tracks[currentIndex];
  audio.pause();
  audio.src = new URL(track.src, assetsBase).href;
  cover.src = new URL(track.cover, assetsBase).href;
  cover.alt = `Обложка: ${track.title}`;
  title.textContent = track.title;
  progress.value = '0';
  progress.max = '0';
  progress.disabled = true;
  currentTime.textContent = duration.textContent = '0:00';
  setStatus('Готов к прослушиванию');
  updatePlayerState();
  if ('mediaSession' in navigator && 'MediaMetadata' in window) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: '13 AI the Dark', album: currentIndex < 7 ? '#Dark Music' : currentIndex >= 11 ? '3 поколения' : 'Синглы', artwork: [{ src: cover.src }] });
    try { navigator.mediaSession.setPositionState?.(); } catch {}
  }
  if (autoplay) playSelected();
}

function setPlaybackMode(selectedMode) {
  if (selectedMode !== "repeat-one" && selectedMode !== "sequential") return;
  playbackMode = selectedMode;
  // Нативный loop надёжнее повторного запуска через событие ended.
  audio.loop = playbackMode === "repeat-one";
  modeButtons.forEach((button) => {
    const isActive = button.dataset.playerMode === playbackMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateVolumeState() {
  const percent = Math.round(playerVolume * 100);
  volume.value = String(percent);
  volumeValue.textContent = percent + "%";
  volumeIcon.textContent = playerVolume === 0 ? "×))" : playerVolume < 0.5 ? "◖)" : "◖))";
  mute.setAttribute("aria-label", playerVolume === 0 ? "Включить звук" : "Выключить звук");
  mute.setAttribute("title", playerVolume === 0 ? "Включить звук" : "Выключить звук");
  mute.classList.toggle("is-muted", playerVolume === 0);
}

trackCards.forEach((card) => {
  card.querySelector("[data-track-play]")?.addEventListener("click", () => {
    ensureAudioGraph();
    const index = Number(card.dataset.trackIndex);
    if (index === currentIndex) {
      if (audio.paused) playSelected();
      else audio.pause();
      return;
    }
    selectTrack(index);
  });
});

toggle.addEventListener("click", () => {
  ensureAudioGraph();
  if (audio.paused) playSelected();
  else audio.pause();
});
previous.addEventListener("click", () => {
  ensureAudioGraph();
  selectTrack(currentIndex - 1);
});
next.addEventListener("click", () => {
  ensureAudioGraph();
  selectTrack(currentIndex + 1);
});
modeButtons.forEach((button) => button.addEventListener("click", () => setPlaybackMode(button.dataset.playerMode)));

const handleVolumeInput = () => applyPlayerVolume(Number(volume.value) / 100);
volume.addEventListener("input", handleVolumeInput);
volume.addEventListener("change", handleVolumeInput);
mute.addEventListener("click", () => {
  applyPlayerVolume(playerVolume === 0 ? lastAudibleVolume : 0);
});

progress.addEventListener('input', () => seekTo(progress.value));
audio.addEventListener('play', updatePlayerState);
audio.addEventListener('playing', () => { setStatus('Сейчас играет'); updatePlayerState(); });
audio.addEventListener('pause', () => { if (!audio.error) setStatus('На паузе'); updatePlayerState(); });
audio.addEventListener('waiting', () => { if (!audio.paused) setStatus('Загрузка…'); });
audio.addEventListener('error', () => { setStatus('Не удалось загрузить. Нажмите ▶ ещё раз', true); updatePlayerState(); });
audio.addEventListener('volumechange', updateVolumeState);
audio.addEventListener('timeupdate', updatePosition);
audio.addEventListener('loadedmetadata', updatePosition);
audio.addEventListener('durationchange', updatePosition);
if ('mediaSession' in navigator) {
  const handlers = {
    play: playSelected, pause: () => audio.pause(),
    previoustrack: () => selectTrack(currentIndex - 1), nexttrack: () => selectTrack(currentIndex + 1),
    seekto: event => seekTo(event.seekTime),
    seekbackward: event => seekTo(audio.currentTime - (event.seekOffset || 10)),
    seekforward: event => seekTo(audio.currentTime + (event.seekOffset || 10))
  };
  Object.entries(handlers).forEach(([action, handler]) => { try { navigator.mediaSession.setActionHandler(action, handler); } catch {} });
}
// Поведение после окончания зависит от выбранного режима.
audio.addEventListener("ended", () => {
  if (playbackMode === "sequential" && currentIndex < tracks.length - 1) {
    selectTrack(currentIndex + 1);
    return;
  }
  setStatus("Плейлист завершён");
  updatePlayerState();
});

// Загружаем первый трек, но не запускаем его без действия пользователя.
setPlaybackMode("sequential");
updateVolumeState();
selectTrack(0, false);
}
