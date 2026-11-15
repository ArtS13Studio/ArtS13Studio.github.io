/* Snow crystals are baked once into small sprites; no full-screen blur per frame. */
(() => {
  'use strict';
  const sprites = [];
  function crystal(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d'); c.translate(64,64);
    c.strokeStyle = kind % 2 ? '#f3faff' : '#d6e8fa'; c.lineCap = 'round';
    c.lineWidth = kind === 2 ? 3.2 : 2.1;
    for (let arm=0;arm<6;arm++) {
      c.save(); c.rotate(arm*Math.PI/3); c.beginPath();
      c.moveTo(0,0); c.lineTo(0,-51);
      for (let branch=0;branch<3;branch++) {
        const y = -17-branch*12, length = 14-branch*2+(kind%3)*2;
        c.moveTo(0,y); c.lineTo(-length,y-length*.8);
        c.moveTo(0,y); c.lineTo(length,y-length*.8);
        if (kind===1 && branch===0) {
          c.moveTo(-length*.65,y-length*.52); c.lineTo(-length*.65,y-length);
          c.moveTo(length*.65,y-length*.52); c.lineTo(length*.65,y-length);
        }
      }
      c.stroke(); c.restore();
    }
    c.fillStyle = '#eff7ff'; c.beginPath();
    for (let i=0;i<6;i++) { const a=i*Math.PI/3; c.lineTo(Math.cos(a)*7,Math.sin(a)*7); }
    c.closePath(); c.fill();
    return canvas;
  }
  function softFlake() {
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=64;
    const c=canvas.getContext('2d'), g=c.createRadialGradient(32,32,1,32,32,31);
    g.addColorStop(0,'#edf6ffed'); g.addColorStop(.23,'#e9f4ffb0'); g.addColorStop(1,'#e9f4ff00');
    c.fillStyle=g; c.fillRect(0,0,64,64); return canvas;
  }
  window.ArtSnow = {
    start(canvas, options={}) {
      const c=canvas.getContext('2d'); if (!c) return () => {};
      if (!sprites.length) sprites.push(crystal(0),crystal(1),crystal(2),softFlake());
      let width, height, particles, frame, stopped=false;
      const small = options.compact === true;
      const resize = () => {
        width=canvas.clientWidth; height=canvas.clientHeight;
        const dpr=Math.min(devicePixelRatio||1,1.5);
        canvas.width=width*dpr; canvas.height=height*dpr; c.setTransform(dpr,0,0,dpr,0,0);
        particles=Array.from({length:small?170:width<700?430:850},()=>{
          const depth=Math.random(), near=depth>.86;
          return {x:Math.random()*width,y:Math.random()*height,depth,phase:Math.random()*6.28,
            angle:Math.random()*6.28,spin:(Math.random()-.5)*2,
            size:near?18+Math.random()*29:depth>.5?5+Math.random()*12:1+Math.random()*3,
            sprite:depth>.97?3:Math.floor(Math.random()*3)};
        });
      };
      resize(); window.addEventListener('resize',resize,{passive:true});
      const mist=document.createElement('canvas'); mist.width=768; mist.height=512;
      const mc=mist.getContext('2d');
      [[120,300,320,90],[420,220,300,110],[680,340,270,90]].forEach(([x,y,rx,ry])=>{
        mc.save();mc.translate(x,y);mc.scale(rx,ry);
        const g=mc.createRadialGradient(0,0,0,0,0,1);
        g.addColorStop(0,'#d3e7ffba');g.addColorStop(.4,'#c9e2f959');g.addColorStop(1,'#d3e7ff00');
        mc.fillStyle=g;mc.fillRect(-1,-1,2,2);mc.restore();
      });
      const start=performance.now(); let previous=start;
      function draw(time) {
        if(stopped) return;
        const t=(time-start)/1000, dt=Math.min(time-previous,40)/1000; previous=time;
        const gust=1.1+Math.sin(t*1.55)**2*.8;
        const tail=options.duration?Math.min(1,Math.max(0,(options.duration-t)/1.4)):1;
        c.clearRect(0,0,width,height);
        c.globalAlpha=(small?.55:.7)*tail;
        c.drawImage(mist,-width*.4+Math.sin(t*.8)*width*.25,-height*.2,width*1.8,height*1.4);
        for(const p of particles) {
          const speed=(small?240:160)+(small?450:640)*p.depth;
          p.x+=speed*gust*dt; p.y+=(speed*.25+Math.sin(t*1.5+p.phase)*95)*dt;
          p.angle+=p.spin*dt;
          if(p.x>width+70){p.x=-70;p.y=Math.random()*(height+140)-70;}
          if(p.y>height+70)p.y=-70;
          if(p.y< -80)p.y=height+60;
          c.globalAlpha=(.25+p.depth*.65)*tail;
          if(p.depth<.5){c.drawImage(sprites[3],p.x,p.y,p.size*2,p.size*2);continue;}
          c.save();c.translate(p.x,p.y);c.rotate(p.angle);
          // Changing tilt gives near crystals volume as they tumble through the gusts.
          c.scale(.65+Math.abs(Math.cos(t*.9+p.phase))*.35,1);
          c.drawImage(sprites[p.sprite],-p.size/2,-p.size/2,p.size,p.size); c.restore();
        }
        c.globalAlpha=1; frame=requestAnimationFrame(draw);
      }
      frame=requestAnimationFrame(draw);
      return () => {stopped=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);c.clearRect(0,0,width,height);};
    }
  };
})();
