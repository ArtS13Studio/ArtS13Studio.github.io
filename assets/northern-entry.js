/* Short entrance, once per four minutes on entry/reload, never on an in-page timer.
   Only a local timestamp is saved; no identifier or network analytics are used. */
(() => {
  'use strict';
  const key = 'arts13.entrance.lastShown';
  const cooldown = 4 * 60 * 1000;
  const duration = 8000;
  const exitDuration = 680;
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
  let entranceStart = 0, windContext, windGain, windSources = [];
  const windFades = new Map();
  const inertElements = new Map();
  const release = () => {
    clearTimeout(loadTimeout); clearTimeout(finishTimeout); clearTimeout(removeTimeout);
    cancelAnimationFrame(frame);
    stopWind(0);
    [...windFades.values()].forEach(close => close());
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
    stopWind(immediate ? 0 : exitDuration / 1000);
    root.classList.remove('northern-entry-pending');
    if (immediate || !overlay) { release(); return; }
    overlay.classList.add('is-leaving');
    removeTimeout = setTimeout(release, exitDuration);
  };
  const immediateExit = () => finish(true);
  const onVisibility = () => { if (document.visibilityState === 'hidden') immediateExit(); };
  const onKey = event => {
    if (event.key === 'Escape') { event.preventDefault(); finish(); }
    else if (event.key === 'Tab') {
      const buttons = [...overlay.querySelectorAll('button:not([disabled])')].filter(button => !button.hidden);
      const current = buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    }
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
    overlay.innerHTML = '<canvas class="northern-entry-snow" aria-hidden="true"></canvas><div class="northern-entry-brand"><strong>ArtS<span>13</span>Studio</strong><p>Северная душа. Своя история.</p></div><div class="northern-entry-actions"><button class="northern-entry-sound" type="button" aria-pressed="false">Включить звук</button><button class="northern-entry-skip" type="button">Пропустить заставку</button></div>';
    overlay.prepend(scene);
    overlay.querySelector('.northern-entry-skip').addEventListener('click', () => finish());
    overlay.querySelector('.northern-entry-sound').addEventListener('click', () => {
      if (windContext?.state === 'running') stopWind(.14);
      else startWind(true);
    });
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
      overlay.querySelector('.northern-entry-skip').focus({ preventScroll: true });
      entranceStart = performance.now();
      finishTimeout = setTimeout(() => finish(), duration - exitDuration);
      animateSnow(overlay.querySelector('canvas'));
      startWind(false);
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
    const snow = Array.from({ length: width < 700 ? 500 : 1150 }, () => ({
      x: Math.random()*width, y: Math.random()*height,
      depth: Math.pow(Math.random(), 1.7), phase: Math.random()*Math.PI*2
    }));
    // Pre-render soft near-camera snow once, instead of blurring every flake every frame.
    const puff = document.createElement('canvas'); puff.width = puff.height = 64;
    const puffContext = puff.getContext('2d');
    const soft = puffContext.createRadialGradient(32,32,0,32,32,32);
    soft.addColorStop(0,'rgba(235,245,255,.9)'); soft.addColorStop(.2,'rgba(230,243,255,.6)'); soft.addColorStop(1,'rgba(225,240,255,0)');
    puffContext.fillStyle = soft; puffContext.fillRect(0,0,64,64);
    // Bake drifting powder once at a small resolution. Animating large CSS gradients
    // repaints several viewport-sized surfaces on browsers without GPU acceleration.
    const mist = document.createElement('canvas'); mist.width = 768; mist.height = 512;
    const mistContext = mist.getContext('2d');
    [[110,310,310,130],[390,230,310,100],[690,280,270,145],[480,110,190,65]].forEach(([x,y,rx,ry]) => {
      mistContext.save(); mistContext.translate(x,y); mistContext.scale(rx,ry);
      const haze = mistContext.createRadialGradient(0,0,0,0,0,1);
      haze.addColorStop(0,'rgba(223,239,255,.85)'); haze.addColorStop(.4,'rgba(207,229,250,.55)'); haze.addColorStop(1,'rgba(207,229,250,0)');
      mistContext.fillStyle = haze; mistContext.fillRect(-1,-1,2,2); mistContext.restore();
    });
    let previous = performance.now();
    const start = previous;
    const draw = time => {
      if (closing) return;
      const dt = Math.min(time-previous, 45) / 1000;
      previous = time;
      const elapsed = (time-start)/1000;
      const gust = 1.15 + Math.pow(Math.sin(elapsed*1.6+.4),2)*.8;
      const tail = 1 - Math.max(0, (elapsed - 5.8) / 4) * .4;
      context.clearRect(0,0,width,height);
      context.globalAlpha = (.68+.22*Math.sin(elapsed*1.3)**2)*tail;
      context.drawImage(mist,-width*.3+Math.sin(elapsed*.85)*width*.2,-height*.13,width*1.6,height*1.3);
      context.globalAlpha = (.4+.2*Math.sin(elapsed*1.1+.9)**2)*tail;
      context.drawImage(mist,-width*.38+Math.sin(elapsed*.65+1.5)*width*.2,height*.18,width*1.8,height*1.1);
      context.lineCap = 'round';
      for (const flake of snow) {
        const speed = (420 + 1300*flake.depth)*gust;
        const crosswind = Math.sin(elapsed*2+flake.phase)*45;
        flake.x += speed*dt;
        flake.y += (85+210*flake.depth+crosswind)*dt;
        if (flake.x > width+90) { flake.x = -90; flake.y = Math.random()*(height+140)-70; }
        if (flake.y > height+70) flake.y = -70;
        flake.length = (6+42*flake.depth)*gust;
      }
      // Batch distant snow into three depth passes; avoid a thousand stroke calls per frame.
      context.strokeStyle = '#e4f0fc';
      for (let layer=0;layer<3;layer++) {
        context.globalAlpha = (.25+layer*.19)*tail;
        context.lineWidth = .65+layer*.6;
        context.beginPath();
        for (const flake of snow) {
          if (flake.depth > .83 || Math.floor(flake.depth*3) !== layer) continue;
          context.moveTo(flake.x,flake.y);
          context.lineTo(flake.x-flake.length,flake.y-flake.length*.19);
        }
        context.stroke();
      }
      context.globalAlpha = .68*tail;
      for (const flake of snow) if (flake.depth > .83) {
        context.drawImage(puff,flake.x-flake.length,flake.y-9,flake.length+28,10+25*flake.depth);
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  }

  function updateSoundButton(active) {
    const button = overlay?.querySelector('.northern-entry-sound');
    if (!button) return;
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'Выключить звук' : 'Включить звук';
  }
  function stopWind(fade) {
    updateSoundButton(false);
    if (!windContext) return;
    const context = windContext, gain = windGain, sources = windSources;
    windContext = null; windGain = null; windSources = [];
    let timer;
    const close = () => {
      clearTimeout(timer); windFades.delete(context);
      sources.forEach(source => { try { source.stop(); } catch (_) {} });
      if (context.state !== 'closed') context.close().catch(() => {});
    };
    if (fade && gain && context.state === 'running') {
      const now = context.currentTime;
      if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(now);
      else { const value = gain.gain.value; gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(value,now); }
      gain.gain.linearRampToValueAtTime(0,now+fade);
      // Each context owns its cleanup; a rapid mute/unmute cannot cancel an older close.
      timer = setTimeout(close,fade*1000+30); windFades.set(context,close);
    } else close();
  }
  function startWind(fromGesture) {
    if (closing || performance.now()-entranceStart >= duration-exitDuration) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const button = overlay.querySelector('.northern-entry-sound');
    if (!AudioContext) { button.hidden = true; return; }
    try {
      if (!windContext) windContext = new AudioContext();
      const context = windContext;
      const play = () => {
        if (closing || context !== windContext || context.state !== 'running') return;
        if (!windGain) buildWind(context);
        updateSoundButton(true);
      };
      // Do not disguise a blocked autoplay as playback. The explicit button resumes it.
      if (context.state === 'running') play();
      else if (fromGesture) context.resume().then(play).catch(() => updateSoundButton(false));
      else updateSoundButton(false);
    } catch (_) { stopWind(0); button.hidden = true; }
  }
  function buildWind(context) {
    const elapsed = (performance.now()-entranceStart)/1000;
    const remaining = Math.max(.05,duration/1000-elapsed);
    const now = context.currentTime;
    // Stereo noise shaped into low wind, broad gusts and fine blowing snow. No external audio.
    const noise = context.createBuffer(2,Math.ceil(context.sampleRate*3.7),context.sampleRate);
    for (let channel=0;channel<2;channel++) {
      const samples = noise.getChannelData(channel);
      for (let i=0;i<samples.length;i++) samples[i] = Math.random()*2-1;
    }
    const master = context.createGain(); windGain = master;
    master.connect(context.destination);
    const envelope = new Float32Array(180);
    for (let i=0;i<envelope.length;i++) {
      const local = i/(envelope.length-1)*remaining;
      const time = elapsed+local;
      const attack = Math.min(1,local/.35);
      const fade = Math.min(1,Math.max(0,(duration/1000-time)/2.2));
      envelope[i] = .64*attack*fade*fade;
    }
    master.gain.setValueCurveAtTime(envelope,now,remaining);
    const layers = [
      {type:'lowpass',frequency:460,q:.55,gain:1.25,offset:0},
      {type:'bandpass',frequency:900,q:.45,gain:.34,offset:.6},
      {type:'highpass',frequency:2200,q:.4,gain:.055,offset:1.4}
    ];
    layers.forEach((layer,index) => {
      const source = context.createBufferSource(); source.buffer = noise; source.loop = true;
      const filter = context.createBiquadFilter(); filter.type = layer.type; filter.Q.value = layer.q;
      const lowCut = context.createBiquadFilter(); lowCut.type = 'highpass'; lowCut.frequency.value = 45;
      const gain = context.createGain();
      const gusts = new Float32Array(160), frequencies = new Float32Array(160);
      for (let i=0;i<gusts.length;i++) {
        const time = elapsed+i/(gusts.length-1)*remaining;
        const gust = .64+.36*Math.pow(Math.sin(time*1.6+.4+index*.32),2);
        gusts[i] = layer.gain*gust;
        frequencies[i] = layer.frequency*(.7+.5*gust);
      }
      gain.gain.setValueCurveAtTime(gusts,now,remaining);
      filter.frequency.setValueCurveAtTime(frequencies,now,remaining);
      source.connect(lowCut); lowCut.connect(filter); filter.connect(gain); gain.connect(master);
      source.start(now,layer.offset); source.stop(now+remaining+.05); windSources.push(source);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build, { once: true });
  else build();
})();
