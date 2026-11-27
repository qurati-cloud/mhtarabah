export const capacity=4;
export const palette=['#37adc0','#f19468','#9771d7','#eab845','#6fba7e','#e66e9a','#6d8ee6','#b38964'];
export const symbols=['◆','●','▲','★','✚','■','☾','✿'];
export const complete=tube=>tube.length===capacity&&tube.every(color=>color===tube[0]);
export const won=board=>board.every(tube=>!tube.length||complete(tube));
export function pour(board,from,to){
 if(from===to)return null;
 const source=board[from],target=board[to];
 if(!source?.length||!target||target.length===capacity)return null;
 const color=source.at(-1);
 if(target.length&&target.at(-1)!==color)return null;
 let n=1;
 while(n<source.length&&source[source.length-1-n]===color)n++;
 n=Math.min(n,capacity-target.length);
 const next=board.slice();
 next[from]=source.slice(0,-n);next[to]=target.concat(source.slice(-n));
 return next;
}
export function solve(board,limit=42000){
 const seen=new Map();
 let used=0;
 function visit(state,depth){
  if(won(state))return [];
  if(depth===0||used++>=limit)return null;
  const id=state.map(x=>x.join('')).sort().join('|');
  if((seen.get(id)||0)>=depth)return null;
  seen.set(id,depth);
  const moves=[];
  state.forEach((source,a)=>{
   if(!source.length||complete(source))return;
   let empty=false;
   state.forEach((dest,b)=>{
    if(!dest.length){
     if(empty||source.every(x=>x===source[0]))return;
     empty=true;
    }
    const next=pour(state,a,b);
    if(next)moves.push({a,b,next,score:(complete(next[b])?6:0)+(dest.length?3:0)+(next[a].length?0:2)});
   });
  });
  moves.sort((a,b)=>b.score-a.score);
  for(const {a,b,next} of moves){
   const tail=visit(next,depth-1);
   if(tail)return [[a,b],...tail];
  }
  return null;
 }
 return visit(board,48);
}
