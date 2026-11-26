import {laneWidth, obstacles, firstTunnel, tunnelLength, tunnelSpacing} from './simulation.js';

// Perspective canvas renderer for devices that cannot open a WebGL context.
export function createCanvasWorld(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  let width, height, horizon, focal, sky, cameraX = 0;
  const eye = 4.3, cameraBack = 8;
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    horizon = height * .29;
    focal = Math.min(width * 1.24, height * .87);
    sky = ctx.createLinearGradient(0, 0, 0, height*.72);
    sky.addColorStop(0, '#61a9c3');
    sky.addColorStop(.55, '#c3e8dd');
    sky.addColorStop(1, '#ffe8b3');
  }
  function project(x, y, z) {
    const ratio = focal / (z + cameraBack);
    return [width/2 + (x-cameraX)*ratio, horizon + (eye-y)*ratio, ratio];
  }
  function polygon(color, ...points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0],points[0][1]);
    for (const [x,y] of points.slice(1)) ctx.lineTo(x,y);
    ctx.closePath();
    ctx.fill();
  }
  function quad(color, left, right, near, far, y = 0) {
    polygon(color,project(left,y,near),project(left,y,far),
      project(right,y,far),project(right,y,near));
  }
  function ellipse(color, x, y, rx, ry) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);
    ctx.fill();
  }
  function prism(x, bottom, z, w, h, d, shades) {
    const l=x-w/2, r=x+w/2, top=bottom+h, n=z-d/2, f=z+d/2;
    if (n < -6.9) return;
    polygon(shades[0],project(l,top,n),project(l,top,f),project(r,top,f),project(r,top,n));
    const side=x>cameraX ? l : r;
    polygon(shades[1],project(side,bottom,n),project(side,bottom,f),project(side,top,f),project(side,top,n));
    polygon(shades[2],project(l,bottom,n),project(l,top,n),project(r,top,n),project(r,bottom,n));
  }
  const stone = [
    ['#fae5c8','#cf9a77','#deab87'], ['#f4ddb0','#d4b57e','#e8c997'],
    ['#f0d3bf','#b98b80','#d69d86'], ['#e6e6d0','#a6b8a4','#cad7bd']
  ];
  const blue = ['#648e9a','#2f596b','#50808d'];
  const bark = ['#b38c57','#98724e','#a7825c'];
  const gold = ['#ffe397','#bf834b','#e9ab54'];
  const accent = ['#bee9d9','#479288','#69b7a4'];
  const light = ['#fff1c4','#d8c281','#fce0a3'];
  function star(x,y,z,time) {
    const [px,py,s] = project(x,y + Math.sin(time * 4 + z)*.09,z);
    const radius=.42*s;
    const squash=.58+.42*Math.abs(Math.cos(time*2.3+z*.10));
    ellipse('#f7cc5350',px,py,radius*1.34,radius*1.34);
    const points=Array.from({length:10},(_,i)=>{
      const angle=-Math.PI/2+Math.PI*i/5, r=radius*(i%2?.46:1);
      return [px+Math.cos(angle)*r*squash,py+Math.sin(angle)*r];
    });
    polygon('#ffcf54',...points);
    polygon('#fff3a7',[px,py],points[0],points[1],points[2]);
  }
  function vehicle(kind,x,z) {
    const {length,height,halfWidth}=obstacles[kind];
    const w=halfWidth*2;
    if (kind === 'bar') {
      for (const side of [-1,1]) prism(x+side*1.1,0,z,.13,1.56,.23,gold);
      prism(x,1.04,z,2.45,.60,.28,gold);
      for (const i of [-2,-1,0,1,2]) {
        const at=x+i*.43;
        polygon('#614739',project(at-.13,1.10,z-.151),project(at,1.10,z-.151),
          project(at+.16,1.57,z-.151),project(at+.03,1.57,z-.151));
      }
      return;
    }
    const isBus=obstacles[kind].roof;
    prism(x,.17,z,w,.65,length,isBus ? gold : accent);
    prism(x,.79,z+.16,w-.1,height-.79,isBus ? length-.15 : length-.98,isBus ? gold : accent);
    prism(x,isBus ? 1.23 : .90,z-(isBus ? length/2-.045 : length/2-.37),
      w-.28,isBus ? .59 : .17,.08,blue);
    for (const side of [-1,1]) {
      prism(x+side*w*.32,.35,z-length/2,.28,.12,.08,['#ffbe9c','#c75551','#e97561']);
      const [px,py,s] = project(x+side*w*.41,.24,z-length/2+.08);
      ellipse('#233a43',px,py,s*.13,s*.25);
    }
  }
  function segment(z, index) {
    const palette=stone[(index%stone.length+stone.length)%stone.length];
    const building=4.3+Math.abs(index%3)*.7;
    prism(10,0,z+7,4.9,building,11,palette);
    prism(10,building,z+7,5.08,.18,11.2,stone[1]);
    prism(7.76,2.3,z+3.1,1.16,.14,2.3,index%2 ? accent : gold);
    prism(7.76,2.3,z+8,1.16,.14,2.3,index%2 ? accent : gold);
    prism(10,1.14,z+1.4,1,.96,.15,blue);
    const [tx,ty,s]=project(-6.1,1.52,z+4);
    prism(-6.1,0,z+4,.17,1.35,.18,bark);
    ellipse('#477e59',tx,ty,s*.52,s*.63);
    ellipse('#80a86e',tx-s*.20,ty-s*.26,s*.37,s*.50);
    for (const side of [-1,1]) {
      prism(side*5.14,0,z+10,.105,2,.13,blue);
      prism(side*5.14,1.97,z+10,.36,.14,.22,light);
    }
  }
  function avatar(player, index, time, duo) {
    const girl=player.avatar==='habiba';
    const cloth=girl?'#9c5cab':'#203d6c';
    const highlight=girl?'#dfa7d9':'#edc269';
    const shadow=girl?'#643975':'#172c51';
    const x=player.x+(duo?(index ? .34 : -.34):0);
    const [gx,gy,s] = project(x,0,0);
    const [px,py] = project(x,player.y,0);
    const scale=player.slide ? .44 : 1;
    const gait=Math.sin(time*14+index*1.6);
    ellipse('#18313e43',gx,gy,s*.45,s*.13);
    ctx.save();
    ctx.translate(px,py);
    ctx.scale(s,s*scale);
    ctx.lineCap='round';
    for(const side of [-1,1]) {
      const legX=side*.14;
      const legY=-.12+gait*side*.12;
      ctx.strokeStyle=shadow;ctx.lineWidth=.19;ctx.beginPath();
      ctx.moveTo(legX,-.76);ctx.lineTo(legX+gait*side*.087,legY);ctx.stroke();
      ellipse('#efe6cf',legX+gait*side*.087,legY,.126,.07);
      ctx.strokeStyle=cloth;ctx.lineWidth=.17;ctx.beginPath();
      ctx.moveTo(side*.225,-1.27);ctx.lineTo(side*.34,-.82-gait*side*.1);ctx.stroke();
      ellipse('#c88365',side*.34,-.82-gait*side*.1,.085,.075);
    }
    ellipse(cloth,0,-1.03,.29,.41);
    polygon(highlight,[-.16,-1.36],[-.125,-1.38],[-.095,-.69],[-.13,-.68]);
    polygon(highlight,[.16,-1.36],[.125,-1.38],[.095,-.69],[.13,-.68]);
    ellipse(girl ? highlight : '#332c26',0,-1.57,.245,.259);
    if (girl) {
      ellipse(cloth,.04,-1.40,.22,.135);
      ellipse(highlight,-.05,-1.31,.175,.11);
    } else ellipse(cloth,0,-1.74,.24,.12);
    ctx.restore();
  }
  function draw(run,time) {
    if (!width || !height) return;
    const visible=run.players.filter(player=>!player.out);
    const aim=visible.length?visible.reduce((sum,player)=>sum+player.x,0)/visible.length:cameraX;
    cameraX+=(aim*.37-cameraX)*.11;
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    ellipse('#fff1c2',width*.22,height*.15,Math.min(width,height)*.063,Math.min(width,height)*.063);
    for (const [x,y,w,h,c] of [[.14,.30,.37,.12,'#8fb4a1'],[.47,.32,.31,.08,'#79a297'],[.87,.31,.28,.10,'#90b5a5']]) {
      ellipse(c,width*x,height*y,width*w,height*h);
    }
    const far=133, near=-6.8;
    quad('#238da9',-26,-6.95,near,far,-.09);
    quad('#f2dbab',-6.95,-4.62,near,far);
    quad('#55636d',-4.62,4.62,near,far);
    quad('#edd3a5',4.62,18,near,far);
    for(const side of [-1,1]) quad('#f3dfbd',side*4.57-.08,side*4.57+.08,near,far,.002);
    const offset=run.distance%6;
    for(let z=122-offset;z>near;z-=6) {
      for(const side of [-1,1]) quad('#f9e7ba',side*1.44-.033,side*1.44+.033,z,z+2.9,.004);
      quad('#73bdca',-14,-10,z,z+.19,-.082);
    }
    const chunk=Math.floor(run.distance/15);
    const scenery=Array.from({length:9},(_,i)=>({z:i*15-run.distance%15,index:chunk+i}))
      .filter(item=>item.z>-7).map(item=>({...item,draw:()=>segment(item.z,item.index)}));
    const items=[...scenery];
    const index=Math.max(0,Math.floor((run.distance-firstTunnel-tunnelLength-9)/tunnelSpacing)+1);
    const entrance=firstTunnel+index*tunnelSpacing-run.distance;
    if (entrance < 135) {
      const near=Math.max(-6.7,entrance), far=entrance+tunnelLength;
      if (far>near) {
        for (let z=far;z>near;z-=8) {
          const from=Math.max(near,z-8);
          items.push({z,draw:()=>{
            quad('#344752',-5.45,5.45,from,z,6.6);
            for(const side of [-1,1]) {
              const x=side*5.2;
              polygon('#496473',project(x,0,from),project(x,0,z),
                project(x,6.6,z),project(x,6.6,from));
              quad('#ffe3a5',side*3.5-.65,side*3.5+.65,from,Math.min(from+.33,z),6.56);
            }
          }});
        }
      }
    }
    for(const obj of run.objects) {
      const z=obj.distance-run.distance;
      if(z < -5 || z>113)continue;
      const x=obj.lane*laneWidth;
      if(obj.kind==='star') {
        if(obj.taken!==(1<<run.players.length)-1) items.push({z,draw:()=>star(x,obj.y,z,time)});
      } else items.push({z,draw:()=>vehicle(obj.kind,x,z)});
    }
    run.players.forEach((player,index)=>{
      if(!player.out)items.push({z:0,draw:()=>avatar(player,index,time,run.players.length===2)});
    });
    items.sort((a,b)=>b.z-a.z).forEach(item=>item.draw());
  }
  resize();
  return {resize,reset(){cameraX=0;},draw};
}
