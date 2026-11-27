import {connect} from '../auth/firebase.js';
const el=id=>document.getElementById(id);
const text=id=>document.querySelector('[data-text-key="colors:'+id+'"]').textContent;
const types=new Set(['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm']);
const max=8*1024*1024,chunkSize=420000;
let media=[],connection,ready,activeURL,request=0;
const doc=(key)=>connection.data.doc(connection.db,'siteContent',key);
const index=()=>doc('colorsHintMedia');
const chunk=(id,i)=>doc('colorsHint_'+id+'_'+i);
function safeURL(raw){
 try{const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
function openDialog(dialog){if(!dialog.open)dialog.showModal();}
export function clearMedia(){
 request++;
 el('hint-media').replaceChildren();
 if(activeURL){URL.revokeObjectURL(activeURL);activeURL=undefined;}
}
export async function showMedia(level){
 clearMedia();
 const current=request;
 await ready;
 if(current!==request||!media.length)return;
 const item=media[level%media.length];
 const area=el('hint-media');
 const heading=document.createElement('p');heading.textContent=item.title;area.append(heading);
 let url=safeURL(item.url);
 try{
  if(item.parts){
   const {data}=connection;
   const chunks=await Promise.all(Array.from({length:item.parts},(_,i)=>data.getDoc(chunk(item.id,i))));
   if(current!==request)return;
   const bytes=chunks.map(snapshot=>{
    const value=snapshot.data()?.value;
    if(typeof value!=='string')throw Error('missing');
    return Uint8Array.from(atob(value),c=>c.charCodeAt(0));
   });
   activeURL=URL.createObjectURL(new Blob(bytes,{type:item.mime}));
   url=activeURL;
  }
  if(!url)throw Error('URL');
  if(item.kind==='link'){
   const link=document.createElement('a');
   link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=text('open');
   area.append(link);
  }else{
   const asset=document.createElement(item.kind==='image'?'img':'video');
   if(item.kind==='video'){asset.controls=true;asset.playsInline=true;asset.preload='metadata';}
   else asset.alt=item.title;
   asset.referrerPolicy='no-referrer';asset.src=url;
   asset.onerror=()=>{if(current===request)el('hint-message').textContent=text('mediaError');};
   area.append(asset);
  }
  const hint=document.createElement('p');hint.textContent=text('hintOptional');area.append(hint);
 }catch{if(current===request)el('hint-message').textContent=text('mediaError');}
}
function clean(raw){
 return Array.isArray(raw)?raw.filter(item=>item&&typeof item.title==='string'&&typeof item.id==='string'&&
  /^[a-f0-9-]{36}$/.test(item.id)&&['image','video','link'].includes(item.kind)&&
  (safeURL(item.url)||(types.has(item.mime)&&Number.isInteger(item.parts)&&item.parts>0&&item.parts<=20))).slice(0,30):[];
}
function list(){
 const root=el('media-list');root.replaceChildren();
 for(const item of media){
  const li=document.createElement('li'),remove=document.createElement('button');
  li.textContent=item.title;remove.type='button';remove.textContent=text('remove');
  remove.onclick=async()=>{
   remove.disabled=true;
   try{
    const {data,db}=connection;
    await data.runTransaction(db,async transaction=>{
     const current=clean((await transaction.get(index())).data()?.value);
     transaction.set(index(),{value:current.filter(other=>other.id!==item.id)});
     for(let i=0;i<(item.parts||0);i++)transaction.delete(chunk(item.id,i));
    });
    el('media-status').textContent=text('mediaOK');
   }catch{el('media-status').textContent=text('mediaError');remove.disabled=false;}
  };
  li.append(remove);root.append(li);
 }
}
el('edit-hints').onclick=()=>{list();openDialog(el('media-admin'));};
el('close-media').onclick=()=>el('media-admin').close();
el('media-form').onsubmit=async e=>{
 e.preventDefault();
 const files=[...el('media-file').files],url=safeURL(el('media-url').value.trim());
 const title=el('media-name').value.trim();
 const status=el('media-status'),button=el('media-save');
 if(!title||(!url&&!files.length)||files.length>10||files.some(f=>!types.has(f.type)||!f.size||f.size>max)){
  status.textContent=text('mediaInvalid');return;
 }
 button.disabled=true;status.textContent=text('mediaBusy');
 try{
  const {data,db}=connection;
  const entries=[];
  if(url)entries.push({item:{id:crypto.randomUUID(),title,url,kind:el('media-kind').value},parts:[]});
  for(const [i,file] of files.entries()){
   const id=crypto.randomUUID(),parts=[];
   for(let start=0;start<file.size;start+=chunkSize){
    const bytes=new Uint8Array(await file.slice(start,start+chunkSize).arrayBuffer());
    let binary='';
    for(let n=0;n<bytes.length;n+=8192)binary+=String.fromCharCode(...bytes.subarray(n,n+8192));
    parts.push(btoa(binary));
   }
   entries.push({item:{id,title:files.length>1?title+' '+(i+1):title,kind:file.type.split('/')[0],mime:file.type,parts:parts.length},parts});
  }
  // Firestore limits the size of individual transactions. Each file and its listing commit together.
  for(const {item,parts} of entries){
   const groups=[];
   for(let i=0;i<parts.length;i+=7){
    const batch=data.writeBatch(db);
    for(let j=i;j<Math.min(i+7,parts.length);j++)batch.set(chunk(item.id,j),{value:parts[j]});
    groups.push(batch);
   }
   let written=0;
   try{
    for(const batch of groups){await batch.commit();written+=7;}
    await data.runTransaction(db,async transaction=>{
     const current=clean((await transaction.get(index())).data()?.value);
     if(current.length>=30)throw Error('limit');
     transaction.set(index(),{value:[...current,item]});
    });
   }catch(error){
    const cleanup=data.writeBatch(db);
    for(let i=0;i<Math.min(written,parts.length);i++)cleanup.delete(chunk(item.id,i));
    if(written)await cleanup.commit().catch(()=>{});
    throw error;
   }
  }
  e.target.reset();status.textContent=text('mediaOK');
 }catch{status.textContent=text('mediaError');}
 finally{button.disabled=false;}
};
ready=connect().then(async value=>{
 if(!value)return;
 connection=value;
 const {auth,authApi,data,db}=value;
 data.onSnapshot(index(),snapshot=>{media=clean(snapshot.data()?.value);if(el('media-admin').open)list();},()=>{});
 await Promise.race([data.getDoc(index()).then(snapshot=>{media=clean(snapshot.data()?.value);}).catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1500))]);
 authApi.onAuthStateChanged(auth,async user=>{
  el('edit-hints').hidden=true;
  if(!user?.emailVerified)return;
  try{
   const role=user.email==='quraaty@gmail.com'?'admin':(await data.getDoc(data.doc(db,'roles',user.uid))).data()?.role;
   if(auth.currentUser?.uid===user.uid&&role==='admin')el('edit-hints').hidden=false;
  }catch{}
 });
}).catch(()=>{});
