export async function uploadAsset(data,db,id,file,kind){
 const limit=kind==='cover'?2*1024*1024:15*1024*1024;
 if(!file.size||file.size>limit)throw Error('حجم الملف يتجاوز الحد المسموح');
 const ext=file.name.split('.').pop().toLowerCase();
 const types={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
 if(!(kind==='cover'?['png','jpg','jpeg','webp']:['pdf','docx']).includes(ext))throw Error('نوع الملف غير مدعوم');
 const bytes=new Uint8Array(await file.arrayBuffer()),ids=[],prefix=crypto.randomUUID();
 try{for(let offset=0;offset<bytes.length;offset+=480000){
 const chunk=bytes.subarray(offset,offset+480000);let raw='';for(let i=0;i<chunk.length;i+=8192)raw+=String.fromCharCode(...chunk.subarray(i,i+8192));
 const key=prefix+'-'+ids.length;await data.setDoc(data.doc(db,'libraryBooks',id,'assets',key),{payload:btoa(raw)});ids.push(key);
 }}catch(e){await Promise.allSettled(ids.map(k=>data.deleteDoc(data.doc(db,'libraryBooks',id,'assets',k))));throw e}
 return {ids,name:file.name,type:types[ext],size:file.size};
}
export async function readAsset(data,db,id,asset){
 const parts=[];for(const key of asset.ids){const snap=await data.getDoc(data.doc(db,'libraryBooks',id,'assets',key));if(!snap.exists())throw Error('ملف غير مكتمل');parts.push(Uint8Array.from(atob(snap.data().payload),c=>c.charCodeAt(0)))}
 const blob=new Blob(parts,{type:asset.type});if(blob.size!==asset.size)throw Error('ملف غير مكتمل');return blob;
}
export async function removeAsset(data,db,id,asset){for(const key of asset?.ids||[])await data.deleteDoc(data.doc(db,'libraryBooks',id,'assets',key))}
