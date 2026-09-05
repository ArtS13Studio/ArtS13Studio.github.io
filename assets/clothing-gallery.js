/* Галереи и фильтры только для clothing/. Без корзины, оплаты и хранения личных данных. */
(() => {
  'use strict';
  const cards = Array.from(document.querySelectorAll('.limited-card[data-gallery]'));
  const filterBar = document.querySelector('.clothing-filter-bar');
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const results = document.querySelector('.clothing-results');
  const galleries = new Map();

  // Базовый кадр берётся из HTML: если новых ракурсов ещё нет, оригинал всё равно можно увеличить.
  cards.forEach(card => {
    const img = card.querySelector('.limited-card-media img');
    const title = card.querySelector('h2').textContent;
    const link = card.querySelector('[data-open-gallery]');
    link.setAttribute('aria-label', `Рассмотреть: ${title}`);
    galleries.set(card.dataset.gallery, {
      title,
      description: card.querySelector('.limited-card-copy p').textContent,
      images: [{ src: img.getAttribute('src'), alt: img.alt, caption: 'Исходное изображение вещи' }]
    });
  });

  // Добавлять новые съёмки сюда. Порядок совпадает с data-start у четырёх ссылок лукбука.
  const till = galleries.get('limited-06');
  if (till) {
    till.images[0].src = '../assets/clothing/lookbook/till-original.webp';
    [
      ['front', 'Вид спереди · модель'],
      ['front-angle', 'Спереди в три четверти · Элис'],
      ['back', 'Вид со спины · модель'],
      ['back-angle', 'Сзади в три четверти · Элис']
    ].forEach(([file, caption]) => till.images.push({
      src: `../assets/clothing/lookbook/till-${file}.webp`,
      alt: `Till Ragnarök — ${caption.toLowerCase()}`,
      caption
    }));
  }

  function applyFilter(type, updateUrl = true) {
    const selected = filters.some(button => button.dataset.filter === type) ? type : 'all';
    let visible = 0;
    cards.forEach(card => {
      const show = selected === 'all' || card.dataset.category.split(' ').includes(selected);
      card.hidden = !show;
      if (show) visible += 1;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === selected)));
    results.textContent = `Показано: ${visible} из ${cards.length}`;
    if (updateUrl) {
      const url = new URL(location.href);
      if (selected === 'all') url.searchParams.delete('type');
      else url.searchParams.set('type', selected);
      history.replaceState(null, '', url);
    }
  }
  if (filterBar && results) {
    filterBar.hidden = false;
    applyFilter(new URL(location.href).searchParams.get('type') || 'all', false);
    filters.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
    window.addEventListener('popstate', () => applyFilter(new URL(location.href).searchParams.get('type') || 'all', false));
  }

  const dialog = document.querySelector('.clothing-gallery');
  // Старые браузеры сохраняют обычные ссылки на изображения вместо сломанного окна.
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const title = dialog.querySelector('#gallery-title');
  const description = dialog.querySelector('#gallery-description');
  const stage = dialog.querySelector('.gallery-stage');
  const image = dialog.querySelector('.gallery-image');
  const caption = dialog.querySelector('.gallery-caption');
  const counter = dialog.querySelector('.gallery-counter');
  const thumbnails = dialog.querySelector('.gallery-thumbnails');
  const original = dialog.querySelector('.gallery-original');
  const disclaimer = dialog.querySelector('.gallery-disclaimer');
  const error = dialog.querySelector('.gallery-image-error');
  const previous = dialog.querySelector('.gallery-prev');
  const next = dialog.querySelector('.gallery-next');
  const zoom = dialog.querySelector('.gallery-zoom');
  let current = null;
  let index = 0;
  let opener = null;
  let pointerStart = null;
  let suppressClick = false;

  function setZoom(enabled) {
    stage.classList.toggle('is-zoomed', enabled);
    zoom.setAttribute('aria-pressed', String(enabled));
    zoom.textContent = enabled ? 'Уменьшить' : 'Увеличить';
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  }

  function showSlide(number) {
    index = (number + current.images.length) % current.images.length;
    const frame = current.images[index];
    setZoom(false);
    error.hidden = true;
    image.alt = frame.alt;
    image.src = frame.src;
    original.href = frame.src;
    caption.textContent = frame.caption;
    counter.textContent = `${index + 1} / ${current.images.length}`;
    previous.disabled = next.disabled = current.images.length < 2;
    thumbnails.querySelectorAll('button').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
    });
    disclaimer.textContent = current.images.length > 1
      ? 'Кадры на моделях — цифровые визуализации. Для точного рисунка смотрите исходный макет.'
      : 'Изображение показано целиком, без обрезки. Используйте увеличение, чтобы рассмотреть детали.';
  }

  function openGallery(link) {
    const gallery = galleries.get(link.dataset.openGallery);
    if (!gallery) return false;
    current = gallery;
    opener = link;
    title.textContent = current.title;
    description.textContent = current.description;
    thumbnails.replaceChildren();
    current.images.forEach((frame, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-thumbnail';
      button.setAttribute('aria-label', frame.caption);
      const thumb = document.createElement('img');
      thumb.src = frame.src;
      thumb.alt = '';
      thumb.width = 100;
      thumb.height = 100;
      button.append(thumb);
      button.addEventListener('click', () => showSlide(i));
      thumbnails.append(button);
    });
    const requested = Number(link.dataset.start || 0);
    showSlide(Number.isInteger(requested) && requested >= 0 && requested < current.images.length ? requested : 0);
    document.body.classList.add('clothing-gallery-open');
    dialog.showModal();
    dialog.scrollTop = 0;
    return true;
  }

  document.querySelectorAll('[data-open-gallery]').forEach(link => {
    link.addEventListener('click', event => {
      // Ctrl/Cmd-клик по-прежнему открывает исходный файл в новой вкладке.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (openGallery(link)) event.preventDefault();
    });
  });
  dialog.querySelector('.gallery-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('clothing-gallery-open');
    setZoom(false);
    pointerStart = null;
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  previous.addEventListener('click', () => showSlide(index - 1));
  next.addEventListener('click', () => showSlide(index + 1));
  zoom.addEventListener('click', () => setZoom(!stage.classList.contains('is-zoomed')));
  image.addEventListener('error', () => { error.hidden = false; });
  image.addEventListener('load', () => { error.hidden = true; });
  image.addEventListener('click', () => {
    if (suppressClick) { suppressClick = false; return; }
    setZoom(!stage.classList.contains('is-zoomed'));
  });
  dialog.addEventListener('keydown', event => {
    // В увеличенном изображении стрелки сохраняют прокрутку, а кнопки переключают ракурсы.
    if (stage.classList.contains('is-zoomed')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
    if (event.target === stage && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      setZoom(true);
    }
  });
  // Горизонтальный свайп меняет кадр; вертикальная прокрутка и pinch-zoom остаются нативными.
  stage.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (event.pointerType === 'mouse' || stage.classList.contains('is-zoomed')) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  stage.addEventListener('pointercancel', () => { pointerStart = null; });
  stage.addEventListener('pointerup', event => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      suppressClick = true;
      showSlide(index + (dx < 0 ? 1 : -1));
    }
  });
})();
