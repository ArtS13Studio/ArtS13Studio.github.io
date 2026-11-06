/* Поиск скрывает карточки, но никогда не прерывает воспроизведение. */
(() => {
  const input = document.querySelector('#track-search');
  if (!input) return;
  const cards = [...document.querySelectorAll('.music-library article')];
  const sections = [...document.querySelectorAll('.album-section')];
  const status = document.querySelector('[data-search-status]');
  const normalize = text => text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  function search() {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    let found = 0;
    cards.forEach(card => {
      const name = normalize(card.querySelector('h2')?.textContent || '');
      card.hidden = !words.every(word => name.includes(word));
      if (!card.hidden) found++;
    });
    sections.forEach(section => { section.hidden = !cards.some(card => section.contains(card) && !card.hidden); });
    status.textContent = words.length ? (found ? `Найдено: ${found}` : 'Не нашли такой трек. Попробуйте другое название.') : '17 треков можно слушать на сайте';
  }
  input.addEventListener('input', search);
  document.querySelector('[data-search-clear]').addEventListener('click', () => { input.value = ''; search(); input.focus(); });
  document.querySelectorAll('.album-index a').forEach(link => link.addEventListener('click', () => { input.value = ''; search(); }));
})();
