/* Entrance on arrival/reload, at most once per two minutes. No periodic interruption. */
(() => {
  'use strict';
  const key='arts13.entrance.lastShown', cooldown=120000, duration=8000, exitDuration=680;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const navigation=performance.getEntriesByType('navigation')[0];
  if(window.top!==window || motion.matches || navigator.connection?.saveData || document.hidden || navigation?.type==='back_forward') return;
  if(navigation?.type!=='reload' && document.referrer) {
    try {if(new URL(document.referrer).origin===location.origin) return;} catch(_){}
  }
  let storage, shown;
  try {storage=localStorage; shown=Number(storage.getItem(key));}catch(_){return;}
  if(shown>0 && shown<=Date.now() && Date.now()-shown<cooldown) return;
  const root=document.documentElement, base=new URL('./atmosphere/',document.currentScript.src);
  // Fetch in the head, concurrently with HTML and fonts, not after DOMContentLoaded.
  const scene=new Image(); scene.fetchPriority='high'; scene.decoding='async';
  scene.className='northern-entry-scene'; scene.alt=''; scene.setAttribute('aria-hidden','true');
  const soundtrack=new Audio(new URL('poka-gorim-intro.mp3?v=2',base).href);
  soundtrack.preload='auto'; // Eight seconds, baked at 25% of the source volume with a fading tail.
  let overlay, stopSnow, observer, originalFocus, startTime=0, started=false, closing=false;
  let playPending=false;
  let loadTimeout, finishTimeout, removeTimeout;
  const inertElements=new Map();
  const release=()=>{
    clearTimeout(loadTimeout);clearTimeout(finishTimeout);clearTimeout(removeTimeout);
    stopSnow?.(); soundtrack.pause(); soundtrack.removeAttribute('src');soundtrack.load();
    overlay?.removeEventListener('pointerup',onInteraction);overlay?.removeEventListener('keydown',onInteraction);
    observer?.disconnect();root.classList.remove('northern-entry-pending');
    document.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',onVisibility);
    window.removeEventListener('pagehide',immediateExit);motion.removeEventListener('change',immediateExit);
    for(const [element,value] of inertElements)element.inert=value;
    const focused=overlay?.contains(document.activeElement);overlay?.remove();
    if(focused){const target=originalFocus?.isConnected&&originalFocus!==document.body?originalFocus:document.querySelector('.studio-logo');target?.focus({preventScroll:true});}
  };
  const finish=(immediate=false)=>{
    if(closing){if(immediate)release();return;}closing=true;
    root.classList.remove('northern-entry-pending');
    if(immediate||!started){release();return;}
    overlay.classList.add('is-leaving');removeTimeout=setTimeout(release,exitDuration);
  };
  const immediateExit=()=>finish(true);
  const onVisibility=()=>{if(document.hidden)immediateExit();};
  const onKey=event=>{
    if(event.key!=='Tab')return;
    event.preventDefault();
    overlay.focus({preventScroll:true});
  };
  const startMusic=async()=>{
    if(closing||!started||playPending||!soundtrack.paused)return;
    const elapsed=(performance.now()-startTime)/1000;
    if(elapsed>=7.3)return;
    playPending=true;
    try {
      soundtrack.currentTime=elapsed;await soundtrack.play();
      if(closing){soundtrack.pause();return;}
      overlay.removeEventListener('pointerup',onInteraction);overlay.removeEventListener('keydown',onInteraction);
    } catch(_) {
      // Respect browser autoplay policy. A genuine interaction may unlock sound;
      // the entrance still finishes on schedule if playback remains blocked.
    } finally {playPending=false;}
  };
  const onInteraction=event=>{if(event.isTrusted)startMusic();};
  const start=()=>{
    if(!overlay||!scene.complete||!scene.naturalWidth||closing||started)return;
    try{
      const last=Number(storage.getItem(key)),now=Date.now();
      if(last>0&&last<=now&&now-last<cooldown){immediateExit();return;}
      storage.setItem(key,String(now));
    }catch(_){immediateExit();return;}
    started=true;clearTimeout(loadTimeout);originalFocus=document.activeElement;
    root.classList.add('northern-entry-pending');document.body.append(overlay);
    const suppress=element=>{
      if(element===overlay||!(element instanceof HTMLElement)||inertElements.has(element))return;
      inertElements.set(element,element.inert);element.inert=true;
    };
    [...document.body.children].forEach(suppress);
    observer=new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(suppress)));
    observer.observe(document.body,{childList:true});document.addEventListener('keydown',onKey);
    overlay.focus({preventScroll:true});startTime=performance.now();
    stopSnow=window.ArtSnow?.start(overlay.querySelector('canvas'),{duration:8});
    finishTimeout=setTimeout(()=>finish(),duration-exitDuration);startMusic();
  };
  const build=()=>{
    if(closing)return;
    overlay=document.createElement('div');overlay.className='northern-entry';overlay.tabIndex=-1;
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Добро пожаловать в ArtS13Studio. Заставка длится восемь секунд.');
    overlay.innerHTML='<canvas class="northern-entry-snow" aria-hidden="true"></canvas><div class="northern-entry-brand"><strong>ArtS<span>13</span>Studio</strong><p>Северная душа. Своя история.</p></div>';
    overlay.prepend(scene);
    overlay.addEventListener('pointerup',onInteraction);overlay.addEventListener('keydown',onInteraction);
    // Slow assets cannot hold the page hostage; content remains visible until ready.
    loadTimeout=setTimeout(immediateExit,5000);start();
  };
  scene.onload=start;scene.onerror=immediateExit;
  scene.src=new URL(innerWidth<700?'northern-entry-small.webp':'northern-entry.webp',base).href;
  window.addEventListener('pagehide',immediateExit);document.addEventListener('visibilitychange',onVisibility);
  motion.addEventListener('change',immediateExit);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
