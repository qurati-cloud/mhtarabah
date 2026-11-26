import {laneWidth, obstacles, powerups, attractedPlayer} from './simulation.js';
import {trackFeatures, nextSigns, adLines, railwayScene} from './track.js';
import {districtCount, districtModel, roadsidePhrases, makeTextPanel} from './district.js';

// Perspective canvas renderer for devices that cannot open a WebGL context.
export function createCanvasWorld(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  let width, height, horizon, focal, sky, cameraX = 0;
  let lift = 0;
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
    const ratio = focal / (z + 8 + lift * .57);
    return [width/2 + (x-cameraX)*ratio, horizon + (4.3 + lift*.65-y)*ratio, ratio];
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
  function pickup(object,z,time) {
    const [x,y,s]=project(object.lane*laneWidth,object.y+Math.sin(time*4)*.18,z);
    const {color,symbol}=powerups[object.kind];
    ellipse('#143c50',x,y,s*.54,s*.54);
    ellipse('#'+color.toString(16),x,y,s*.45,s*.45);
    ctx.font='bold '+Math.max(6,s*.62)+'px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#143c50';
    ctx.fillText(symbol,x,y);
  }
  function vehicle(kind,x,z) {
    const {length,height,halfWidth}=obstacles[kind];
    const w=halfWidth*2;
    if (kind === 'roadworks') {
      prism(x,0,z,2.28,.92,1.3,['#ffbd6a','#c36742','#eb8d46']);
      prism(x,.55,z-.65,2.02,.15,.03,light);
      return;
    }
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
    const [tx,ty,s]=project(-6.1,1.52,z+4);
    prism(-6.1,0,z+4,.17,1.35,.18,bark);
    ellipse('#477e59',tx,ty,s*.52,s*.63);
    ellipse('#80a86e',tx-s*.20,ty-s*.26,s*.37,s*.50);
    for (const side of [-1,1]) {
      prism(side*5.14,0,z+10,.105,2,.13,blue);
      prism(side*5.14,1.97,z+10,.36,.14,.22,light);
    }
  }
  const panels = new Map();
  const layouts = Array.from({length:districtCount},(_,i)=>districtModel(i));
  const material = color => '#'+color.toString(16).padStart(6,'0');
  const shade = (color,factor) => material(
    Math.round((color>>16)*factor)*65536 +
    Math.round(((color>>8)&255)*factor)*256 + Math.round((color&255)*factor));
  function panel(text,x,y,z,w,h,roadside) {
    const key=(roadside?'road:':'district:')+text;
    if(!panels.has(key)) {
      if(panels.size>=48)panels.delete(panels.keys().next().value);
      panels.set(key,makeTextPanel(text,roadside));
    }
    const [px,py,s]=project(x,y,z);
    ctx.drawImage(panels.get(key),px-w*s/2,py-h*s/2,w*s,h*s);
  }
  function district(z,index) {
    for(const shape of layouts[index%layouts.length]) {
      const {type,color,x,y,z:offset,w,h,d,text}=shape;
      const depth=z-offset;
      if(depth<-6.3)continue;
      if(type==='label')panel(text,x,y,depth,w,h,false);
      else if(type==='box'||type==='column')prism(x,y-h/2,depth,w,h,d,
        [material(color),shade(color,.76),shade(color,.9)]);
      else if(type==='dome') {
        const [px,py,s]=project(x,y,depth);
        ellipse(material(color),px,py,w*s,h*s);
      } else {
        polygon(material(color),project(x-w,y-h/2,depth-d/2),project(x,y+h/2,depth-d/2),
          project(x+w,y-h/2,depth-d/2));
        polygon(shade(color,.77),project(x+w,y-h/2,depth-d/2),project(x,y+h/2,depth-d/2),
          project(x,y+h/2,depth+d/2),project(x+w,y-h/2,depth+d/2));
      }
    }
  }
  function avatar(player, index, time, duo) {
    const girl=player.avatar==='habiba';
    const cloth=girl?'#9c5cab':'#203d6c';
    const highlight=girl?'#dfa7d9':'#edc269';
    const x=player.x+(duo?(index ? .34 : -.34):0);
    const [gx,gy,s] = project(x,0,0);
    const [px,py] = project(x,player.y,0);
    const scale=player.slide ? .44 : 1;
    const gait=Math.sin(time*14+index*1.6);
    ellipse('#18313e43',gx,gy,s*.45,s*.13);
    if (player.glide) ellipse('#54d7ed',px,py+s*.03,s*.22,s*.29);
    if (player.shield) ellipse('#8ff4ba88',px,py-s*.88,s*.56,s*1.06);
    ctx.save();
    ctx.translate(px,py);
    ctx.scale(s,s*scale);
    ctx.lineCap='round';
    for(const side of [-1,1]) {
      ctx.strokeStyle=cloth;ctx.lineWidth=.17;ctx.beginPath();
      ctx.moveTo(side*.225,-1.27);ctx.lineTo(side*.34,-.82-gait*side*.1);ctx.stroke();
      ellipse('#c88365',side*.34,-.82-gait*side*.1,.085,.075);
    }
    polygon(cloth,[-.27,-1.4],[.27,-1.4],[girl?.45:.41,-.014],[-(girl?.45:.41),-.014]);
    ellipse(girl ? highlight : '#332c26',0,-1.57,.245,.259);
    if (girl) {
      ellipse(cloth,.04,-1.40,.22,.135);
      ellipse(highlight,-.05,-1.31,.175,.11);
    } else {
      ctx.fillStyle='#f2eee0';
      ctx.fillRect(-.233,-1.88,.466,.176);
      ellipse('#fff8eb',0,-1.878,.232,.052);
    }
    ctx.restore();
  }
  function draw(run,time) {
    if (!width || !height) return;
    const visible=run.players.filter(player=>!player.out);
    const aim=visible.length?visible.reduce((sum,player)=>sum+player.x,0)/visible.length:cameraX;
    cameraX+=(aim*.37-cameraX)*.11;
    lift+=(Math.max(0,...visible.map(player=>player.glide ? player.y : 0))-lift)*.1;
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
    const features=trackFeatures(run.distance-12);
    const chunk=Math.floor(run.distance/15);
    const scenery=Array.from({length:9},(_,i)=>({z:i*15-run.distance%15,index:chunk+i}))
      .filter(item=>item.z>-7 && !features.some(({kind,start,length})=>kind==='bridge' &&
        run.distance+item.z+5>=start && run.distance+item.z+5<start+length))
      .map(item=>({...item,draw:()=>segment(item.z,item.index)}));
    const items=[...scenery];
    const districtIndex=Math.floor(run.distance/24);
    for(let i=0;i<7;i++){
      const z=13+i*24-run.distance%24;
      if(z < -8 || features.some(({kind,start,length})=>kind==='bridge' &&
        run.distance+z>start && run.distance+z<start+length))continue;
      items.push({z,draw:()=>district(z,districtIndex+i)});
    }
    for(const sign of roadsidePhrases(run.distance,run.roadPhrases)) {
      const z=sign.at-run.distance;
      if(z<1||z>104)continue;
      items.push({z,draw:()=>{
        for(const side of [-1,1])prism(sign.x+side*2.2,0,z,.15,2.45,.19,blue);
        panel(sign.text,sign.x,2.68,z-.11,5.65,2.31,true);
      }});
    }
    for (const side of [-1,1]) quad('#becbd0',-12+side*.73-.041,-12+side*.73+.041,-6.71,135,.06);
    for(let z=122-run.distance%2.5;z>-6.7;z-=2.5) quad('#555459',-13.1,-10.9,z,z+.22,.043);
    const rail=railwayScene(run.distance);
    const platform=rail.station-run.distance, train=rail.train-run.distance;
    const stoneRail=['#c3d8dc','#4f7b86','#84a7ad'];
    for(const spacing of [-12,0,12]) {
      const z=train+spacing;
      if(z>-12 && z<126) items.push({z,draw:()=>{
        prism(-12,0,z,2.34,2.46,11.4,stoneRail);
        prism(-12,2.36,z,2.34,.19,11.45,blue);
        for (const dz of [-4,-2,2,4]) prism(-10.82,1.32,z+dz,.055,.61,1.28,blue);
        prism(-10.79,.41,z,.08,1.5,1.3,blue);
      }});
    }
    for(const spacing of [-12,0,12]) {
      const z=platform+spacing;
      if(z>-11 && z<120) items.push({z:z-.09,draw:()=>{
        prism(-9.25,0,z,2.25,.41,11.9,light);
        prism(-8.89,2.95,z,1.8,.16,9.1,blue);
        prism(-8.2,.41,z,.15,2.56,.16,blue);
      }});
    }
    for(let i=0;i<5;i++){
      const movement=Math.max(0,rail.unloading-i*.1);
      const z=platform-8+i*4.1+movement*3;
      if(!movement||z<-6.5||z>104)continue;
      const x=-10.55+movement*1.77;
      items.push({z:z-.35,draw:()=>{
        const [px,py,s]=project(x,.44,z);
        const sway=Math.sin(movement*22+i)*.11*s;
        ellipse('#405563',px-sway,py-.18*s,.08*s,.24*s);
        ellipse('#405563',px+sway,py-.18*s,.08*s,.24*s);
        ellipse(['#9d5860','#dd996f','#2f6b76','#b088c6','#687e63'][i],px,py-.85*s,.24*s,.47*s);
        ellipse('#bc836b',px,py-1.47*s,.145*s,.17*s);
      }});
    }
    const treasureEnd=Math.max(0,...visible.map(player=>player.treasure))-run.distance;
    if(treasureEnd>0) quad('#ac773b',-6.25,-5.12,-4,treasureEnd,.12);
    for (const feature of features) {
      const entrance=feature.start-run.distance;
      const start=Math.max(-6.7,entrance), end=Math.min(150,entrance+feature.length);
      for (let z=end;z>start;z-=6) {
        const from=Math.max(start,z-6);
        items.push({z,draw:()=>{
          if (feature.kind==='bridge') {
            const below=feature.style==='harbor'?'#277c9c':'#a67358';
            quad(below,-27,-4.7,from,z,-.08);
            quad(below,4.7,27,from,z,-.08);
            quad('#586674',-4.7,4.7,from,z,.01);
            for (const side of [-1,1]) {
              quad('#f8e0a2',side*1.43-.035,side*1.43+.035,from,Math.min(from+2.7,z),.016);
              const x=side*4.87;
              quad(feature.trim,x-.07,x+.07,from,z,1);
              prism(x,0,from+.28,.14,1,.14,[feature.trim,feature.wall,feature.trim]);
              const tall=Math.floor((z-entrance)/6)%6===1;
              if(tall) prism(side*5.2,0,from+.4,.42,5.7,.35,[feature.trim,feature.wall,feature.wall]);
            }
            return;
          }
          const mixed = visible.some(player=>player.glide) && visible.some(player=>!player.glide);
          if (!mixed) {
            if (feature.style==='glass') ctx.globalAlpha=.47;
            if (feature.style==='arch') {
              for (let x=-5.2;x<5.18;x+=.4) {
                const y=2+Math.sqrt(Math.max(0,5.25**2-x*x));
                quad(feature.wall,x,x+.41,from,z,y);
                quad(feature.trim,x,x+.41,from,Math.min(from+.21,z),y-.035);
              }
            } else {
              quad(feature.wall,-5.45,5.45,from,z,6.7);
              quad(feature.trim,-5.27,5.27,from,Math.min(from+.22,z),6.66);
            }
            ctx.globalAlpha=1;
          }
          for(const side of [-1,1]) {
            const x=side*5.2;
            polygon(feature.wall,project(x,0,from),project(x,0,z),
              project(x,feature.style==='arch'?2:6.7,z),project(x,feature.style==='arch'?2:6.7,from));
            quad(feature.trim,x-.05,x+.05,from,z,1.25);
          }
        }});
      }
    }
    for (const distance of nextSigns(run.distance)) {
      const z=distance-run.distance;
      if(z < -5 || z>125) continue;
      items.push({z,draw:()=>{
        const [x,y,s]=project(0,5.65,z);
        for (const side of [-1,1]) prism(side*5.16,0,z,.23,5.1,.29,blue);
        ctx.fillStyle='#ffd37e';ctx.fillRect(x-5*s,y-1.25*s,10*s,2.5*s);
        ctx.fillStyle='#122b48';ctx.fillRect(x-4.86*s,y-1.11*s,9.72*s,2.22*s);
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.direction='ltr';
        ctx.font='bold '+Math.max(5,.79*s)+'px sans-serif';
        ctx.fillStyle='#fff8e7';ctx.fillText(adLines[0],x,y-.46*s);
        ctx.fillStyle='#ffd37e';ctx.fillText(adLines[1],x,y+.5*s);
      }});
    }
    for(const obj of run.objects) {
      const z=obj.distance-run.distance;
      if(z < -5 || z>113)continue;
      const x=obj.lane*laneWidth;
      if(obj.kind==='star') {
        if(obj.taken!==(1<<run.players.length)-1) {
          const target=attractedPlayer(run,obj);
          const pull=target ? Math.max(0,1-Math.abs(z)/11) : 0;
          const offsetX=target ? (target.x-x)*pull : 0;
          const offsetY=target ? (target.y+1-obj.y)*pull : 0;
          items.push({z,draw:()=>star(x+offsetX,obj.y+offsetY,z,time)});
        }
      } else if (obj.kind==='gate') {
        if(obj.taken!==(1<<run.players.length)-1) items.push({z,draw:()=>{
          for(const side of [-1,1]) prism(x+side*1.02,0,z,.17,2.93,.18,gold);
          prism(x,2.66,z,2.2,.23,.18,gold);
          const [px,py,s]=project(x,2.28,z);
          ellipse('#ffbd58',px,py,.18*s,.22*s);
        }});
      } else if (Object.hasOwn(powerups,obj.kind)) {
        if(obj.taken!==(1<<run.players.length)-1) items.push({z,draw:()=>pickup(obj,z,time)});
      } else items.push({z,draw:()=>vehicle(obj.kind,x,z)});
    }
    run.players.forEach((player,index)=>{
      if(!player.out)items.push({z:0,draw:()=>avatar(player,index,time,run.players.length===2)});
    });
    items.sort((a,b)=>b.z-a.z).forEach(item=>item.draw());
  }
  resize();
  return {resize,reset(){cameraX=lift=0;},draw};
}
