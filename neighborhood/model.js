export const size=18, levels=5;
export const pieces={
 stone:['حجر','#c4a37b'], wood:['خشب','#a46743'], brick:['طوب','#bc6954'],
 marble:['رخام','#e4d5b6'], blue:['بلاط أزرق','#388eaa'], green:['بلاط أخضر','#528c69'],
 sand:['حجر رملي','#dfb475'], dark:['بازلت','#6a6572'], amber:['بلاط عسلي','#d99445'],
 lilac:['بلاط بنفسجي','#9c78ae'], white:['جص','#eee5d3'], rose:['طين وردي','#c78480'],
 arch:['قوس','#dfbb83'], steps:['درج','#d6c7a8'], roof:['سقف','#b15645'], tree:['شجرة','#53815d']
};
export const scenery = new Map([
 ['2,3',['stone','stone','roof']],['3,3',['stone','wood','roof']],
 ['15,7',['stone','stone','roof']],['16,7',['stone','wood','roof']],
 ['14,3',['tree']],['2,13',['tree']],['5,12',['tree']],['16,13',['tree']]
]);
export const key=(x,z,y)=>[x,z,y].join(',');
export const valid=(x,z,y)=>[x,z,y].every(Number.isInteger)&&x>=0&&x<size&&z>=0&&z<size&&y>=0&&y<levels;
export const water=(x,z)=>x>=7&&x<=9;
export const start=[3,8];
export const dock=[13,8];
export const garden=[[12,11],[13,11],[14,11],[12,12],[13,12],[14,12]];
export const square=[[3,4],[4,4],[5,4],[3,5],[4,5],[5,5]];
export const waterside=(x,z)=>water(x,z)&&z>=6&&z<=12;
export function loadBoard(raw){
 const board=new Map();
 if(!Array.isArray(raw))return board;
 for(const [id,type] of raw.filter(entry=>Array.isArray(entry)&&entry.length===2)){
  if(typeof id!=='string'||!Object.hasOwn(pieces,type))continue;
  const coords=id.split(',').map(Number);
  if(coords.length===3&&valid(...coords)&&key(...coords)===id)board.set(id,type);
 }
 return board;
}
export function height(board,x,z){
 let y=0;
 while(y<levels&&board.has(key(x,z,y)))y++;
 return y;
}
export function surface(board,x,z){
 const top=height(board,x,z);
 if(!valid(x,z,0)||scenery.has(x+','+z)||(!top&&water(x,z)))return null;
 const type=board.get(key(x,z,top-1));
 return type==='tree'?null:isRail(type)?(!water(x,z)||top>1?top-1:null):top;
}
export function path(board,from,to,at=(x,z)=>surface(board,x,z)){
 if(at(...from)===null||at(...to)===null)return [];
 const id=([x,z])=>key(x,z,0);
 const queue=[from], previous=new Map([[id(from),null]]);
 for(let i=0;i<queue.length;i++){
  const here=queue[i];
  if(id(here)===id(to)){
   const route=[];
   for(let p=here;previous.get(id(p));p=previous.get(id(p)))route.push(p);
   return route.reverse();
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next=[here[0]+dx,here[1]+dz];
   const top=at(...next);
   if(top===null||Math.abs(top-at(...here))>1||previous.has(id(next)))continue;
   previous.set(id(next),here);queue.push(next);
  }
 }
 return [];
}
export function bridgeReady(board){
 return [7,8,9].every(x=>height(board,x,8)===1&&surface(board,x,8)===1);
}
export function gardenReady(board){
 return garden.filter(([x,z])=>board.get(key(x,z,0))==='tree').length>=3;
}
export function squareReady(board){
 const tiles=square.map(([x,z])=>board.get(key(x,z,0))).filter(type=>['blue','green','amber','lilac'].includes(type));
 return tiles.length===6&&new Set(tiles).size>=2;
}

export const pier = [[9,6],[8,6],[9,7]];
export const islandStart = [10,11];
export const islandTreasure = [
 {id:'shell',at:[12,5],piece:['صدفة المرفأ','#ecb19b']},
 {id:'lantern',at:[15,8],piece:['فانوس الجزيرة','#e5a63d']},
 {id:'mosaic',at:[11,13],piece:['فسيفساء البحر','#398c96']}
];

for(const {id,piece} of islandTreasure)pieces[id]=piece;

export function pierReady(board){
 return pier.every(([x,z])=>board.get(key(x,z,0))==='wood'&&height(board,x,z)===1);
}

export function islandGround(x,z){
 return valid(x,z,0)&&((x-12.5)/4.75)**2+((z-9)/6.5)**2<=1 ? 0 : null;
}

pieces.door=['مدخل بيت','#b2764e'];
pieces.road=['طريق حجري','#89928c'];
export const market=[6,3];
scenery.set(market.join(','),['brick','roof']);

export function households(board){
 const homes=[];
 for(const [id,type] of board){
  if(type!=='door')continue;
  const [x,z,y]=id.split(',').map(Number);
  if(y!==0||water(x,z)||height(board,x,z)!==2||board.get(key(x,z,1))!=='roof')continue;
  const entrance=[x,z+1];
  if(surface(board,...entrance)!==0)continue;
  homes.push({id,at:[x,z],entrance});
 }
 return homes;
}

export function marketRoute(board,entrance){
 const goal=[market[0],market[1]+1];
 if(entrance[0]===goal[0]&&entrance[1]===goal[1])return [];
 const route=path(board,entrance,goal,(x,z)=>{
  if(surface(board,x,z)===null)return null;
  return (x===entrance[0]&&z===entrance[1])||(x===goal[0]&&z===goal[1])||
    board.get(key(x,z,0))==='road'&&height(board,x,z)===1 ? 0 : null;
 });
 return route.length?[entrance,...route]:[];
}

pieces.rail=['سكّة مستقيمة','#646d72'];
pieces.curve=['منعطف سكّة','#727a81'];
pieces.bench=['مقعد خشبي','#9d5841'];
pieces.fountain=['نافورة','#428d9d'];
export const isRail=type=>type==='rail'||type==='curve';
export const stations=[[6,4],dock];
export const pointId=point=>point.join(',');
const directions=[[1,0],[0,1],[-1,0],[0,-1]];
export function railPorts(type,rotation=0){
 return (type==='curve'?[0,1]:[0,2]).map(port=>(port+rotation)%4);
}
export function railAt(board,x,z){
 const y=height(board,x,z)-1;
 const id=key(x,z,y),type=board.get(id);
 return isRail(type)?{id,type,y}:null;
}
export function trainRoute(board,rotations){
 const [from,to]=stations;
 if(surface(board,...from)!==0||surface(board,...to)!==0)return [];
 const previous=new Map([[pointId(from),null]]), queue=[from];
 const same=(a,b)=>pointId(a)===pointId(b);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];
  if(same(p,to)){
   const route=[];
   for(let cell=p;cell;cell=previous.get(pointId(cell)))route.push(cell);
   return route.reverse();
  }
  const rail=railAt(board,...p);
  const ports=rail?railPorts(rail.type,rotations[rail.id]):same(p,from)?[0,1,2,3]:[0,2];
  for(const port of ports){
   const [dx,dz]=directions[port],next=[p[0]+dx,p[1]+dz];
   if(previous.has(pointId(next))||same(next,from))continue;
   const other=railAt(board,...next);
   // The existing one-block bridge serves as the rail bed across the river.
   const bridge=bridgeReady(board)&&next[1]===8&&water(...next);
   if(!same(next,to)&&!other&&(!bridge||port%2!==0))continue;
   if(other&&!railPorts(other.type,rotations[other.id]).includes((port+2)%4))continue;
   if(Math.abs((surface(board,...p)??0)-(surface(board,...next)??0))>1)continue;
   previous.set(pointId(next),p);queue.push(next);
  }
 }
 return [];
}
export function challengeReady(board,marks){
 const start=Object.keys(marks).find(id=>marks[id]==='start');
 const end=Object.keys(marks).find(id=>marks[id]==='finish');
 const stars=Object.keys(marks).filter(id=>marks[id]==='star');
 if(!start||!end||!stars.length)return false;
 const coords=id=>id.split(',').map(Number);
 const origin=coords(start);
 return [end,...stars,...Object.keys(marks).filter(id=>marks[id]==='hurdle')].every(id=>path(board,origin,coords(id)).length);
}
