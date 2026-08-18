document.addEventListener("play", (event) => {
  const current = event.target;

  if (!(current instanceof HTMLAudioElement)) return;

  document.querySelectorAll("audio").forEach((player) => {
    if (player !== current && !player.paused) {
      player.pause();
    }
  });
}, true);
