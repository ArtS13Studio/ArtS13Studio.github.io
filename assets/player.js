let playbackMode = "normal";

const modeButtons = document.querySelectorAll("[data-playback-mode]");
const modeStatus = document.querySelector("[data-playback-status]");
const statusText = {
  normal: "Выберите режим или запустите любой трек вручную.",
  "repeat-one": "Выбранный трек будет повторяться.",
  sequential: "После окончания автоматически включится следующий трек.",
};

function getPlayers() {
  return Array.from(document.querySelectorAll("audio"));
}

function setPlaybackMode(selectedMode) {
  playbackMode = playbackMode === selectedMode ? "normal" : selectedMode;
  document.documentElement.dataset.playbackMode = playbackMode;

  modeButtons.forEach((button) => {
    const isActive = button.dataset.playbackMode === playbackMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (modeStatus) {
    modeStatus.textContent = statusText[playbackMode];
  }

  if (playbackMode === "sequential") {
    const players = getPlayers();
    const hasActiveTrack = players.some((player) => !player.paused);

    if (!hasActiveTrack && players[0]) {
      void players[0].play();
    }
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setPlaybackMode(button.dataset.playbackMode);
  });
});

document.addEventListener("play", (event) => {
  const current = event.target;

  if (!(current instanceof HTMLAudioElement)) return;

  document.querySelectorAll("audio").forEach((player) => {
    if (player !== current && !player.paused) {
      player.pause();
    }
  });
}, true);

document.addEventListener("ended", (event) => {
  const current = event.target;

  if (!(current instanceof HTMLAudioElement)) return;

  if (playbackMode === "repeat-one") {
    current.currentTime = 0;
    void current.play();
    return;
  }

  if (playbackMode === "sequential") {
    const players = getPlayers();
    const nextPlayer = players[players.indexOf(current) + 1];

    if (nextPlayer) {
      nextPlayer.currentTime = 0;
      void nextPlayer.play();
    }
  }
}, true);
