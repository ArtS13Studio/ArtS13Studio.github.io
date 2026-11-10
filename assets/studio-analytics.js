/* Existing studio counter. No Yandex script or pixel is requested before opt-in. */
(() => {
  'use strict';
  const counter = 112156042;
  const key = 'arts13.analytics.v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const disableKey = 'disableYaCounter' + counter;
  window[disableKey] = true;
  let choice = readChoice();
  let started = false;
  let tag;
  let returnFocus;

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && ['allow', 'deny'].includes(saved.choice) && Number.isFinite(saved.expires) && saved.expires > Date.now() && saved.expires <= Date.now() + lifetime) return saved.choice;
    } catch (_) { /* Storage can be unavailable; no consent is assumed. */ }
    return null;
  }

  function clearMetrikaStorage() {
    // Only Metrika data on this site's origin; never clear unrelated browser data.
    for (const storeName of ['localStorage', 'sessionStorage']) {
      try {
        const storage = window[storeName];
        Object.keys(storage).filter(name => /^_ym/.test(name)).forEach(name => storage.removeItem(name));
      } catch (_) { /* Restricted browser storage is harmless. */ }
    }
    const domains = ['', location.hostname, '.' + location.hostname];
    const paths = ['/'];
    const parts = location.pathname.split('/').filter(Boolean);
    for (let i = 1; i <= parts.length; i++) paths.push('/' + parts.slice(0, i).join('/'), '/' + parts.slice(0, i).join('/') + '/');
    document.cookie.split(';').map(item => item.split('=')[0].trim()).filter(name => /^_ym/.test(name)).forEach(name => {
      for (const domain of domains) for (const path of paths) document.cookie = name + '=; Max-Age=0; path=' + path + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
    });
  }

  function stop() {
    window[disableKey] = true;
    if (started && typeof window.ym === 'function') window.ym(counter, 'destruct');
    started = false;
    if (tag) { tag.remove(); tag = null; }
    clearMetrikaStorage();
  }

  function start() {
    if (choice !== 'allow' || tag || started || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol !== 'https:') return;
    window[disableKey] = false;
    if (!window.ym) {
      window.ym = function () { (window.ym.a = window.ym.a || []).push(arguments); };
      window.ym.l = Date.now();
    }
    tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + counter;
    tag.referrerPolicy = 'origin';
    tag.onload = () => {
      if (choice !== 'allow' || window[disableKey] || started) return;
      started = true;
      // Same basic statistics as the September setup. No behavior recording.
      window.ym(counter, 'init', {
        accurateTrackBounce: true, webvisor: false, clickmap: false, trackLinks: false,
        url: location.origin + location.pathname,
        referrer: safeReferrer()
      });
    };
    tag.onerror = () => { tag?.remove(); tag = null; };
    document.head.append(tag);
  }

  function safeReferrer() {
    try { const url = new URL(document.referrer); return url.origin + url.pathname; }
    catch (_) { return ''; }
  }

  const banner = document.createElement('section');
  banner.className = 'analytics-choice';
  banner.setAttribute('aria-labelledby', 'analytics-heading');
  banner.innerHTML = '<div><h2 id="analytics-heading">Статистика сайта</h2><p>Разрешите Яндекс Метрике собирать статистику посещений с помощью cookies? Это помогает улучшать сайт. <a href="/privacy/#analytics">Какие данные используются</a></p></div><div class="analytics-actions"><button type="button" data-analytics-choice="allow">Разрешить статистику</button><button type="button" data-analytics-choice="deny">Без статистики</button></div>';
  document.querySelector('.studio-header')?.insertAdjacentElement('afterend', banner);
  banner.hidden = choice !== null;
  const openers = document.querySelectorAll('[data-analytics-settings]');
  openers.forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      returnFocus = button;
      banner.hidden = false;
      banner.scrollIntoView({ block: 'center' });
      banner.querySelector('[data-analytics-choice="deny"]').focus({ preventScroll: true });
    });
  });

  function showStatus() {
    document.querySelectorAll('[data-analytics-status]').forEach(node => {
      node.textContent = choice === 'allow' ? 'Ваш выбор: статистика разрешена.' : 'Ваш выбор: статистика не разрешена.';
    });
  }

  banner.querySelectorAll('[data-analytics-choice]').forEach(button => button.addEventListener('click', () => {
    choice = button.dataset.analyticsChoice;
    try { localStorage.setItem(key, JSON.stringify({ choice, expires: Date.now() + lifetime })); } catch (_) { /* Apply this choice for the current page. */ }
    if (choice === 'allow') start(); else stop();
    banner.hidden = true;
    showStatus();
    if (returnFocus) { returnFocus.focus(); returnFocus = null; }
  }));

  // Apply a revocation in another open tab too; never infer consent from navigation.
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    choice = readChoice();
    if (choice === 'allow') start(); else stop();
    banner.hidden = choice !== null;
    showStatus();
  });
  if (choice === 'allow') start(); else clearMetrikaStorage();
  showStatus();
})();
