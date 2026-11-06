/* Нативное details-меню остаётся рабочим без скрипта. */
(() => {
  const menu = document.querySelector('.studio-mobile-menu');
  if (!menu) return;
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
})();

(() => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-to-top';
  button.textContent = '↑';
  button.setAttribute('aria-label', 'Вернуться наверх');
  button.title = 'Вернуться наверх';
  button.hidden = true;
  document.body.append(button);
  const update = () => { button.hidden = window.scrollY < 500; };
  window.addEventListener('scroll', update, { passive: true });
  update();
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    const target = document.querySelector('.studio-logo');
    target?.focus({ preventScroll: true });
  });
  const player = document.querySelector('.global-player');
  if (player) {
    const resize = () => document.documentElement.style.setProperty('--player-height', `${Math.ceil(player.getBoundingClientRect().height)}px`);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(player);
    window.addEventListener('resize', resize, { passive: true });
    resize();
  }
})();
