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

  // Чередование МЕЖДУ вещами: Till — Алексей и Виктория, Northblood — Лис и Элис,
  // Northern Wind — только Элис. У одной вещи не меняем состав моделей между кадрами.
  const till = galleries.get('limited-06');
  if (till) {
    till.images[0].src = '../assets/clothing/lookbook/till-original.webp';
    till.images.push({ src: '../assets/clothing/lookbook/hero-alexey-viktoria.webp', alt: 'Алексей и Виктория в футболках 13th в студии', caption: 'В студии · Алексей и Виктория', editorial: true });
  }
  [
    ['limited-07', 'northblood-original', [
      ['northblood-lis-alice-front', 'Спереди · Лис и Элис']
    ]],
    ['limited-08', 'northern-wind-original', [
      ['northern-wind-alice-front', 'Спереди · Элис'],
      ['northern-wind-alice-back', 'Со спины · Элис']
    ]]
  ].forEach(([key, original, frames]) => {
    const gallery = galleries.get(key);
    if (!gallery) return;
    gallery.images[0].src = `../assets/clothing/lookbook/${original}.webp`;
    frames.forEach(([file, caption]) => gallery.images.push({ src: `../assets/clothing/lookbook/${file}.webp`, alt: `${gallery.title} — ${caption.toLowerCase()}`, caption, editorial: true }));
  });

  // Координаты фрагментов исходного макета, а НЕ новые фотографии и не перерисованные принты.
  // x/y/w/h — доли полного изображения. Первый кадр всегда сохраняет оригинал целиком.
  const pairViews = {
    front: { x: 0, y: .13, w: .54, h: .82 },
    back: { x: .47, y: .13, w: .53, h: .82 }
  };
  galleries.forEach((gallery, key) => {
    const base = gallery.images[0];
    const number = Number(key.replace('limited-', ''));
    const paired = (number >= 6 && number <= 13) || key.startsWith('wolf-') || key.startsWith('custom23-');
    if (paired) {
      let detail = { x: .55, y: .24, w: .37, h: .4 };
      if (number >= 11) detail = { x: .59, y: .33, w: .3, h: .38 };
      if (key.startsWith('wolf-')) detail = { x: .65, y: .28, w: .26, h: .36 };
      if (key.startsWith('custom23-')) detail = { x: .59, y: .27, w: .31, h: .36 };
      [
        ['Спереди · фрагмент макета', 'Спереди', pairViews.front],
        ['Сзади · фрагмент макета', 'Сзади', pairViews.back],
        ['Принт крупно · исходный макет', 'Принт', detail]
      ].forEach(([caption, label, view]) => gallery.images.push({ ...base, caption, label, view }));
    } else {
      gallery.images.push({ ...base, caption: 'Детали · исходное изображение', label: 'Детали', view: { x: .12, y: .2, w: .76, h: .52 } });
    }
  });

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
  const canvas = dialog.querySelector('.gallery-canvas');
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

  function renderImage() {
    if (!current || !image.naturalWidth || !stage.clientWidth) return;
    const view = current.images[index].view || { x: 0, y: 0, w: 1, h: 1 };
    const width = image.naturalWidth * view.w;
    const height = image.naturalHeight * view.h;
    const scale = Math.min(stage.clientWidth / width, stage.clientHeight / height) * (stage.classList.contains('is-zoomed') ? 2.2 : 1);
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
    canvas.style.marginTop = `${Math.max(0, (stage.clientHeight - height * scale) / 2)}px`;
    image.style.width = `${image.naturalWidth * scale}px`;
    image.style.height = `${image.naturalHeight * scale}px`;
    image.style.left = `${-view.x * image.naturalWidth * scale}px`;
    image.style.top = `${-view.y * image.naturalHeight * scale}px`;
  }

  function setZoom(enabled) {
    stage.classList.toggle('is-zoomed', enabled);
    zoom.setAttribute('aria-pressed', String(enabled));
    zoom.textContent = enabled ? 'Уменьшить' : 'Увеличить';
    renderImage();
    stage.scrollTop = enabled ? (stage.scrollHeight - stage.clientHeight) / 2 : 0;
    stage.scrollLeft = enabled ? (stage.scrollWidth - stage.clientWidth) / 2 : 0;
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
    disclaimer.textContent = frame.editorial
      ? 'Кадры на моделях — цифровые визуализации. Для точного рисунка смотрите исходный макет.'
      : frame.view ? 'Приближённый фрагмент оригинала. Рисунок не изменён; полный макет — в первом кадре.'
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
      if (frame.label) {
        const label = document.createElement('span');
        label.textContent = frame.label;
        button.append(label);
      }
      button.addEventListener('click', () => showSlide(i));
      thumbnails.append(button);
    });
    const requested = Number(link.dataset.start || 0);
    showSlide(Number.isInteger(requested) && requested >= 0 && requested < current.images.length ? requested : 0);
    document.body.classList.add('clothing-gallery-open');
    dialog.showModal();
    dialog.scrollTop = 0;
    renderImage();
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
  image.addEventListener('load', () => { error.hidden = true; renderImage(); });
  if (typeof ResizeObserver === 'function') new ResizeObserver(renderImage).observe(stage);
  else window.addEventListener('resize', renderImage);
  image.addEventListener('click', () => {
    if (suppressClick) { suppressClick = false; return; }
    setZoom(!stage.classList.contains('is-zoomed'));
  });
  dialog.addEventListener('keydown', event => {
    if (event.target === stage && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      setZoom(!stage.classList.contains('is-zoomed'));
      return;
    }
    // В увеличенном изображении стрелки сохраняют прокрутку, а кнопки переключают ракурсы.
    if (stage.classList.contains('is-zoomed')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(index + (event.key === 'ArrowRight' ? 1 : -1));
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
