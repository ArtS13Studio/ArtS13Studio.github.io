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
const controlIcon = (name) => new URL(`player-controls/${name}.png`, assetsBase).href;

// Единый каталог доступных аудиофайлов. Будущие треки без готового MP3 сюда не добавлять.
const tracks = [
  { title: "Пока горим", cover: "music/poka-gorim-cover.png", src: "audio/poka-gorim.mp3" },
  { title: "Последний круг", cover: "music/posledniy-krug-cover.png", src: "audio/posledniy-krug.mp3" },
  { title: "Разные голоса", cover: "music/raznye-golosa-cover.png", src: "audio/raznye-golosa.mp3" },
  { title: "Маска у цеха", cover: "music/maska-u-tsekha-cover.png?v=20260901-album-covers1", src: "audio/maska-u-tsekha.mp3" },
  { title: "Пока помнят имена", cover: "music/poka-pomnyat-imena-cover.png?v=20260901-album-covers1", src: "audio/poka-pomnyat-imena.mp3" },
  { title: "Шествия", cover: "music/shestviya-cover.png?v=20260901-album-covers1", src: "audio/shestviya.mp3" },
  { title: "#Руна на частоте", cover: "music/runa-na-chastote-cover.png", src: "audio/runa-na-chastote.mp3" },
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
    homeReleaseButton.setAttribute("aria-label", `${label}: Руна на частоте`);
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
        <div><span>Сейчас играет</span><strong data-player-title></strong></div>
      </div>
      <div class="global-player-transport">
        <button type="button" data-player-previous aria-label="Предыдущий трек" title="Предыдущий трек"><img class="global-player-control-icon" src="${controlIcon("previous")}" alt="" aria-hidden="true" /></button>
        <button class="global-player-main-button" type="button" data-player-toggle aria-label="Воспроизвести" title="Воспроизвести"><img class="global-player-control-icon" data-player-main-icon src="${controlIcon("play")}" alt="" aria-hidden="true" /></button>
        <button type="button" data-player-next aria-label="Следующий трек" title="Следующий трек"><img class="global-player-control-icon" src="${controlIcon("next")}" alt="" aria-hidden="true" /></button>
      </div>
      <div class="global-player-modes">
        <button class="player-mode-button" type="button" data-player-mode="repeat-one" aria-label="Повторять один трек" aria-pressed="false" title="Повторять один трек"><span class="player-mode-icon" aria-hidden="true">↻</span><span class="player-mode-label">Один</span></button>
        <button class="player-mode-button" type="button" data-player-mode="sequential" aria-label="Слушать все треки подряд" aria-pressed="false" title="Слушать всё подряд"><span class="player-mode-icon player-mode-icon-list" aria-hidden="true">≡</span><span class="player-mode-label">Подряд</span></button>
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
const trackCards = document.querySelectorAll("[data-track-index]");

// Текущее состояние плеера.
let currentIndex = 0;
let playbackMode = "normal";

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
    button.setAttribute("aria-label", `${label}: ${tracks[cardIndex].title}`);
  });
}

function updatePlayerState() {
  const playing = !audio.paused;
  toggleIcon.src = controlIcon(playing ? "pause" : "play");
  toggle.setAttribute("aria-label", playing ? "Пауза" : "Воспроизвести");
  toggle.setAttribute("title", playing ? "Пауза" : "Воспроизвести");
  updateTrackCards();
}

// Выбирает трек. Остаток от деления замыкает кнопки назад/вперёд по кругу.
function selectTrack(index, autoplay = true) {
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];
  audio.src = new URL(track.src, assetsBase).href;
  cover.src = new URL(track.cover, assetsBase).href;
  title.textContent = track.title;
  progress.value = "0";
  currentTime.textContent = "0:00";
  duration.textContent = "0:00";
  updateTrackCards();
  if (autoplay) {
    audio.play().catch(updatePlayerState);
  }
}

// Повторное нажатие на активный режим возвращает обычное воспроизведение.
function setPlaybackMode(selectedMode) {
  playbackMode = playbackMode === selectedMode ? "normal" : selectedMode;
  modeButtons.forEach((button) => {
    const isActive = button.dataset.playerMode === playbackMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

trackCards.forEach((card) => {
  card.querySelector("[data-track-play]")?.addEventListener("click", () => {
    const index = Number(card.dataset.trackIndex);
    if (index === currentIndex) {
      if (audio.paused) audio.play().catch(updatePlayerState);
      else audio.pause();
      return;
    }
    selectTrack(index);
  });
});

toggle.addEventListener("click", () => {
  if (audio.paused) audio.play().catch(updatePlayerState);
  else audio.pause();
});
previous.addEventListener("click", () => selectTrack(currentIndex - 1));
next.addEventListener("click", () => selectTrack(currentIndex + 1));
modeButtons.forEach((button) => button.addEventListener("click", () => setPlaybackMode(button.dataset.playerMode)));

progress.addEventListener("input", () => {
  audio.currentTime = Number(progress.value);
});
audio.addEventListener("play", updatePlayerState);
audio.addEventListener("pause", updatePlayerState);
audio.addEventListener("timeupdate", () => {
  progress.value = String(audio.currentTime);
  currentTime.textContent = formatTime(audio.currentTime);
});
audio.addEventListener("loadedmetadata", () => {
  progress.max = String(audio.duration || 0);
  duration.textContent = formatTime(audio.duration);
});
// Поведение после окончания зависит от выбранного режима.
audio.addEventListener("ended", () => {
  if (playbackMode === "repeat-one") {
    audio.currentTime = 0;
    audio.play().catch(updatePlayerState);
    return;
  }
  if (playbackMode === "sequential" && currentIndex < tracks.length - 1) {
    selectTrack(currentIndex + 1);
    return;
  }
  updatePlayerState();
});

// Загружаем первый трек, но не запускаем его без действия пользователя.
selectTrack(0, false);
}
