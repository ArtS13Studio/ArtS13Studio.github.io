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
