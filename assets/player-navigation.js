/* Optional persistent audio shell. Documents change inside the same-origin view;
   the actual audio element stays in the outer document without restarting. */
(() => {
  'use strict';
  window.createMusicNavigation = api => {
    let frame=null, currentURL=location.href, enabled=false, scrollPositions=new Map();
    const pages=new Set(['/','/index.html','/music/','/clothing/','/services/','/guide/','/order/','/contacts/','/privacy/','/collaborations/','/video/']);
    const originalURL=location.href;
    const boundViews=new WeakSet();
    function bindView(doc){
      const view=doc.defaultView;
      if(view===window||boundViews.has(view))return;
      boundViews.add(view);
      const replace=view.history.replaceState.bind(view.history);
      view.history.replaceState=(state,title,url)=>{
        replace(state,title,url);
        currentURL=view.location.href;
        history.replaceState({musicView:true},'',currentURL);
      };
    }
    const loader=document.createElement('div');loader.className='site-view-loading';loader.hidden=true;
    loader.setAttribute('role','status');loader.textContent='Открываем раздел…';document.body.append(loader);
    function viewWindow(){return frame?.contentWindow||window;}
    function saveScroll(){scrollPositions.set(currentURL,viewWindow().scrollY);}
    function syncMeta(doc){
      document.title=doc.title;
      for(const selector of ['link[rel="canonical"]','meta[name="description"]','meta[property="og:title"]','meta[property="og:url"]','meta[property="og:description"]']){
        const source=doc.querySelector(selector),target=document.querySelector(selector);
        if(source&&target)for(const attr of ['href','content'])if(source.hasAttribute(attr))target.setAttribute(attr,source.getAttribute(attr));
      }
    }
    let pendingScroll=0, loadingTimer;
    function loaded(){
      clearTimeout(loadingTimer);loader.hidden=true;
      try{
        const doc=frame.contentDocument;
        if(!doc?.body)return;
        api.attachView(doc);syncMeta(doc);
        api.measure();
        const hash=new URL(currentURL).hash;
        const target=hash?doc.getElementById(decodeURIComponent(hash.slice(1))):null;
        if(target)target.scrollIntoView({behavior:'instant'});
        else frame.contentWindow.scrollTo({top:pendingScroll,behavior:'instant'});
        const heading=target||doc.querySelector('main h1, main');
        if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
      }catch(_){location.assign(currentURL);}
    }
    function navigate(url,{back=false}={}){
      if(!enabled&&!back){location.assign(url);return;}
      saveScroll();
      const previous=new URL(currentURL),next=new URL(url);
      currentURL=next.href;
      if(!back)history.pushState({musicView:true},'',currentURL);
      pendingScroll=back?(scrollPositions.get(currentURL)||0):0;
      if(previous.pathname===next.pathname&&previous.search===next.search){
        const doc=frame?.contentDocument||document;
        if(frame){
          const view=frame.contentWindow;
          view.history.replaceState(null,'',currentURL);
          view.dispatchEvent(new view.HashChangeEvent('hashchange',{oldURL:previous.href,newURL:currentURL}));
        }
        const target=next.hash?doc.getElementById(decodeURIComponent(next.hash.slice(1))):null;
        if(target)target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
        else viewWindow().scrollTo({top:pendingScroll,behavior:'instant'});
        return;
      }
      loader.hidden=false;
      clearTimeout(loadingTimer);
      // If a document fails to load, offer the ordinary link instead of trapping navigation.
      loader.replaceChildren(document.createTextNode('Открываем раздел…'));
      loadingTimer=setTimeout(()=>{
        loader.replaceChildren(document.createTextNode('Раздел загружается дольше обычного. '));
        const retry=document.createElement('a');retry.href=currentURL;retry.target='_top';retry.textContent='Открыть напрямую';loader.append(retry);
      },12000);
      if(!frame){
        // Keep the original audio and its graph alive; no nested shells or duplicate players.
        const base=document.createElement('base');base.href=originalURL;document.head.prepend(base);
        window.dispatchEvent(new Event('arts13:shell-start'));
        frame=document.createElement('iframe');frame.className='site-view';frame.title='Раздел сайта ArtS13Studio';
        frame.allow='autoplay';frame.addEventListener('load',loaded);frame.src=currentURL;
        document.body.classList.add('music-shell-open');document.body.append(frame);api.measure();
      }else frame.contentWindow.location.replace(currentURL);
    }
    function click(event,doc){
      if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const link=event.target.closest('a[href]');
      if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
      const url=new URL(link.href,doc.baseURI);
      if(url.origin!==location.origin){
        if(frame&&/^https?:$/.test(url.protocol)){event.preventDefault();location.assign(url.href);}
        return;
      }
      if(!pages.has(url.pathname.replace(/\/index\.html$/,'/')))return;
      if(!enabled&&!frame)return;
      event.preventDefault();navigate(url.href);
    }
    window.addEventListener('popstate',()=>{if(frame||enabled)navigate(location.href,{back:true});});
    return {
      click,
      bindView,
      setEnabled(value){enabled=value;if(!frame)currentURL=location.href;},
      owns(child){return frame?.contentWindow===child;},
      frame(){return frame;}
    };
  };
})();
