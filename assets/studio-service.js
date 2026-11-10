/* Внешнее видео загружается только по явному действию посетителя. */
(() => {
  'use strict';
  const launch = document.querySelector('[data-load-video]');
  if (!launch) return;
  launch.hidden = false;
  launch.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/NYvNgmOV4XI?rel=0';
    frame.title = '13 AI the Dark — Пока горим';
    frame.allow = 'encrypted-media; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allowFullscreen = true;
    const container = launch.closest('.clip-frame');
    container.classList.remove('video-awaiting');
    container.replaceChildren(frame);
    frame.focus();
  }, { once: true });
})();
