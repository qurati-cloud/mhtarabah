const buildings = [
  ['modest', 2.35, 5.5, 0xc5aa87, 0x8a6657],
  ['tower', 14.2, 8.4, 0x9fc3ca, 0x496b82],
  ['villa', 3.7, 8.8, 0xf5dfb1, 0xb97859],
  ['mosque', 3.4, 8.7, 0xe8d7b6, 0x277d5d],
  ['school', 3.9, 10, 0xecc686, 0x455f84],
  ['small', 2.95, 6.9, 0xeac5a2, 0x8c6d68],
  ['restaurant', 3, 7.7, 0xe9a174, 0x9d4752],
  ['palace', 5.1, 12, 0xf5dcb4, 0xbc8a57],
  ['hospital', 5.7, 10.7, 0xe7eee7, 0x349077],
  ['mosque', 3.2, 9.6, 0xceac8e, 0x528baf],
  ['cemetery', .66, 12.8, 0xcfc1a6, 0x8e9a8f],
  ['modest', 2.1, 4.9, 0xc4ae9a, 0x877767],
  ['mosque', 4.55, 10.3, 0xead0aa, 0xb06c4c],
  ['tower', 10.2, 8.3, 0xc7d7ce, 0x5e848b],
  ['villa', 4.2, 9.3, 0xf4e5ca, 0x828863]
];

export const districtCount = buildings.length;

export function districtModel(index) {
  const [kind,height,length,wall,trim] = buildings[((index%buildings.length)+buildings.length)%buildings.length];
  const shapes = [];
  const add = (type,color,x,y,z,w,h,d) => shapes.push({type,color,x,y,z,w,h,d});
  const box = (...args)=>add('box',...args);
  const label = (text,x,y,z,w,h)=>shapes.push({type:'label',text,x,y,z,w,h});
  const window = (y,z,w)=>box(0x64848d,7.66,y,z,.11,.66,w);
  if(kind==='cemetery') {
    box(0x87916e,10,.04,0,5.2,.09,length);
    box(wall,7.3,.36,0,.2,.7,length);
    for(const z of [-4.1,-1.8,1.1,4.4]) {
      for(const x of [8.5,10.2,11.9]) {
        box(0xa7a18d,x,.13,z,.9,.25,1.35);
        add('dome',0xc7bba7,x,.38,z-.45,.51,.39,.25);
      }
    }
    label('مقبرة',8.15,1.14,length/2+.05,2.4,.73);
    return shapes;
  }

  box(wall,10.12,height/2,0,4.9,height,length);
  box(trim,10.12,height,0,5.08,.19,length+.3);
  if(kind==='mosque') {
    const size=index%3===0?2.1:1.65;
    add('dome',trim,10.1,height+.57,-.4,2.53,size,2.66);
    box(trim,10.1,height+size+.58,-.4,.08,.39,.08);
    label('☾',10.1,height+size+1.12,-.36,.77,.85);
    for(const z of (height>4 ? [-length*.41,length*.41]:[index%2?length*.42:-length*.42])) {
      add('column',wall,8,height*.84,z,.43,height*1.68,.43);
      add('column',trim,8,height*1.59,z,.63,.21,.63);
      add('spire',trim,8,height*1.82,z,.42,height*.43,.42);
    }
    for(const z of [-2.7,0,2.7]) {
      box(trim,7.63,1.15,z,.12,1.85,.78);
      add('dome',trim,7.63,2.08,z,.14,.44,.4);
    }
    return shapes;
  }
  if(kind==='small'||kind==='villa'||kind==='modest') {
    add('roof',trim,10.13,height+.49,0,2.7,kind==='villa'?1.24:.83,length*.54);
    for(const z of (kind==='modest'?[1.4]:[-2.3,1.4]))window(1.48,z,.88);
    if(kind==='villa') {
      box(0xc8a278,8.1,.19,length/2+.7,2.2,.38,1.65);
      box(wall,9.05,1.2,length/2+.35,.22,2.4,.22);
      box(wall,7.35,1.2,length/2+.35,.22,2.4,.22);
    }
    return shapes;
  }
  if(kind==='palace') {
    for(const z of [-length*.43,0,length*.43]) {
      box(trim,8.35,height*.53,z,1.17,height*1.07,1.15);
      add('dome',trim,8.35,height*1.07,z,.82,.7,.82);
    }
  }
  for(const z of [-length*.34,-length*.11,length*.12,length*.35]) {
    for(let y=1.63;y<height-.32;y+=1.17)window(y,z,kind==='tower'?1.16:.74);
  }
  if(kind==='school'||kind==='restaurant'||kind==='hospital') {
    box(trim,9.18,1.35,length/2+.06,1.16,2.7,.16);
    if(kind==='restaurant') {
      for(let i=0;i<8;i++)box(i%2?trim:0xffe7bf,7.65+i*.48,2.32,length/2+.58,.49,.19,1.25);
    }
    const name={school:'مدرسة',restaurant:'مطعم',hospital:'مستشفى'}[kind];
    label(name,9.65,height-.54,length/2+.14,3,1);
    if(kind==='hospital') label('☾',11.75,height-1.48,length/2+.16,1.15,1.25);
  }
  return shapes;
}

export function roadsidePhrases(distance, phrases) {
  if (!phrases?.length) return [];
  const first = Math.max(0,Math.floor((distance-32)/74));
  return [first,first+1].map(index=>({
    at:51+index*74, x:index%2 ? -5.1 : 5.1, text:phrases[index%phrases.length]
  }));
}

export function makeTextPanel(text, roadside = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = roadside?316:256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = roadside?'#143b42':'#255a5d';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = '#e8c889';
  ctx.lineWidth = 10;
  ctx.strokeRect(8,8,canvas.width-16,canvas.height-16);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  const words = text.trim().split(/\s+/);
  let lines = [];
  let size = text.length<9&&!roadside ? 155 : 85;
  for (;size>=29;size-=4) {
    ctx.font = 'bold '+size+'px Tahoma, Arial, sans-serif';
    lines = [''];
    for (const word of words) {
      const last = lines.length-1;
      const joined = lines[last] ? lines[last]+' '+word : word;
      if (lines[last] && ctx.measureText(joined).width>683) lines.push(word);
      else lines[last] = joined;
    }
    if (lines.length*size*1.2 <= canvas.height-48) break;
  }
  ctx.fillStyle = '#fff4d7';
  const dy = size*1.2;
  lines.forEach((line,i)=>ctx.fillText(line,canvas.width/2,
    canvas.height/2+(i-(lines.length-1)/2)*dy,683));
  return canvas;
}
