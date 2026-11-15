/* Short entrance, once per four minutes on entry/reload, never on an in-page timer.
   Only a local timestamp is saved; no identifier or network analytics are used. */
(() => {
  'use strict';
  const key = 'arts13.entrance.lastShown';
  const cooldown = 4 * 60 * 1000;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const navigation = performance.getEntriesByType('navigation')[0];
  if (motion.matches || navigator.connection?.saveData || document.visibilityState === 'hidden' || navigation?.type === 'back_forward') return;
  // Moving between sections is browsing, not another arrival at the studio.
  if (navigation?.type !== 'reload' && document.referrer) {
    try { if (new URL(document.referrer).origin === location.origin) return; } catch (_) { /* Ignore invalid referrers. */ }
  }
  let storage;
  let shown;
  try { storage = window.localStorage; shown = Number(storage.getItem(key)); }
  catch (_) { return; } // Without storage, avoid an animation on every reload.
  const now = Date.now();
  if (shown > 0 && shown <= now && now - shown < cooldown) return;

  const root = document.documentElement;
  const assetBase = new URL('./atmosphere/', document.currentScript.src);
  root.classList.add('northern-entry-pending');
  let overlay, frame, closing = false, started = false, observer, originalFocus;
  let loadTimeout, finishTimeout, removeTimeout;
  const inertElements = new Map();
  const release = () => {
    clearTimeout(loadTimeout); clearTimeout(finishTimeout); clearTimeout(removeTimeout);
    cancelAnimationFrame(frame);
    observer?.disconnect();
    root.classList.remove('northern-entry-pending');
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', immediateExit);
    motion.removeEventListener('change', immediateExit);
    for (const [element, value] of inertElements) element.inert = value;
    const restoreFocus = overlay?.contains(document.activeElement);
    overlay?.remove();
    if (restoreFocus && originalFocus?.isConnected && originalFocus !== document.body) originalFocus.focus({ preventScroll: true });
    else if (restoreFocus) document.querySelector('.studio-logo')?.focus({ preventScroll: true });
  };
  const finish = (immediate = false) => {
    if (closing) { if (immediate) release(); return; }
    closing = true;
    cancelAnimationFrame(frame);
    root.classList.remove('northern-entry-pending');
    if (immediate || !overlay) { release(); return; }
    overlay.classList.add('is-leaving');
    removeTimeout = setTimeout(release, 680);
  };
  const immediateExit = () => finish(true);
  const onVisibility = () => { if (document.visibilityState === 'hidden') immediateExit(); };
  const onKey = event => {
    if (event.key === 'Escape') { event.preventDefault(); finish(); }
    else if (event.key === 'Tab') { event.preventDefault(); overlay?.querySelector('button')?.focus(); }
  };
  // A missing stylesheet, blocked image or interrupted load must not lock the site.
  loadTimeout = setTimeout(immediateExit, 1500);
  window.addEventListener('pagehide', immediateExit);
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', immediateExit);

  const build = () => {
    if (closing || motion.matches) return;
    originalFocus = document.activeElement;
    overlay = document.createElement('div');
    overlay.className = 'northern-entry';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Добро пожаловать в ArtS13Studio');
    const scene = new Image();
    scene.className = 'northern-entry-scene';
    scene.alt = '';
    scene.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="northern-entry-mist" aria-hidden="true"></div><canvas class="northern-entry-snow" aria-hidden="true"></canvas><div class="northern-entry-brand"><strong>ArtS<span>13</span>Studio</strong><p>Северная душа. Своя история.</p></div><button class="northern-entry-skip" type="button">Пропустить заставку</button>';
    overlay.prepend(scene);
    overlay.querySelector('button').addEventListener('click', () => finish());
    scene.onload = () => {
      if (closing || started) return;
      // Another tab may have already shown it while this image was loading.
      try {
        const last = Number(storage.getItem(key));
        const time = Date.now();
        if (last > 0 && last <= time && time - last < cooldown) { finish(true); return; }
        storage.setItem(key, String(time));
      } catch (_) { finish(true); return; }
      started = true;
      clearTimeout(loadTimeout);
      document.body.append(overlay);
      // Respect the inert state of galleries/other UI instead of blindly clearing it.
      const suppress = element => {
        if (element === overlay || !(element instanceof HTMLElement) || inertElements.has(element)) return;
        inertElements.set(element, element.inert);
        element.inert = true;
      };
      [...document.body.children].forEach(suppress);
      observer = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(suppress)));
      observer.observe(document.body, { childList: true });
      document.addEventListener('keydown', onKey);
      overlay.querySelector('button').focus({ preventScroll: true });
      finishTimeout = setTimeout(() => finish(), 2700);
      animateSnow(overlay.querySelector('canvas'));
    };
    scene.onerror = immediateExit;
    scene.src = new URL(innerWidth < 700 ? 'northern-entry-small.webp' : 'northern-entry.webp', assetBase).href;
  };
  function animateSnow(canvas) {
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = innerWidth, height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr; canvas.height = height * dpr;
    context.scale(dpr, dpr);
    const snow = Array.from({ length: width < 700 ? 65 : 140 }, () => ({
      x: Math.random()*width, y: Math.random()*height,
      depth: .2+Math.random()*.8, phase: Math.random()*Math.PI*2
    }));
    let previous = performance.now();
    const start = previous;
    const draw = time => {
      if (closing) return;
      const dt = Math.min(time-previous, 45) / 1000;
      previous = time;
      const gust = 1 + Math.sin((time-start)/550)*.35;
      context.clearRect(0,0,width,height);
      context.lineCap = 'round';
      for (const flake of snow) {
        const speed = 100 + 330*flake.depth;
        flake.x += speed*gust*dt;
        flake.y += (45+70*flake.depth)*dt;
        if (flake.x > width+12) { flake.x = -12; flake.y = Math.random()*height; }
        if (flake.y > height+12) flake.y = -12;
        context.strokeStyle = `rgba(226,240,252,${.14+flake.depth*.45})`;
        context.lineWidth = .4+flake.depth*1.3;
        context.beginPath(); context.moveTo(flake.x,flake.y);
        context.lineTo(flake.x-2-flake.depth*7,flake.y-1-flake.depth*2);
        context.stroke();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build, { once: true });
  else build();
})();
