export const defaultRanks = Object.freeze([
 {min:0,label:'مبتدئ',color:'#956344',icon:'🟤'},
 {min:50,label:'متوسط',color:'#858585',icon:'⚪'},
 {min:150,label:'متقدم',color:'#a98213',icon:'🟡'},
 {min:400,label:'خبير',color:'#2875be',icon:'🔵'},
 {min:1000,label:'محترف',color:'#854cb5',icon:'🟣'},
 {min:2500,label:'محترف متميز',color:'#c44444',icon:'🔴'},
 {min:5000,label:'محترف من الصف الأول',color:'#168d9d',icon:'💎'}
]);
export function rankFor(wins,ranks=defaultRanks){
 const n=Math.max(0,Number(wins)||0);
 return [...ranks].sort((a,b)=>b.min-a.min).find(r=>n>=r.min)||defaultRanks[0];
}
export function summarize(results){
 const unique=new Map();
 for(const r of results||[]) if(r?.id&&r.mode==='versus'&&['win','loss','draw'].includes(r.result))unique.set(r.id,r);
 const matches=unique.size,wins=[...unique.values()].filter(r=>r.result==='win').length;
 return {matches,wins,rate:matches?Math.round(wins*100/matches):0,rank:rankFor(wins)};
}
export function teamScore(a,b){
 return {distance:Math.max(a.distance||0,b.distance||0),stars:(a.stars||0)+(b.stars||0)};
}
