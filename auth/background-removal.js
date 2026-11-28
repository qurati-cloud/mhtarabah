// Local inference; the model is downloaded on first use, not the user's image.
let engine;
export async function removeImageBackground(value, report=()=>{}){
 if(!value)throw Error('اختر صورة أولًا');
 report('جارٍ تحميل نموذج AI ومعالجة الصورة…');
 engine ??= import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm').catch(e=>{engine=undefined;throw e;});
 const {removeBackground}=await engine;
 const input=await (await fetch(value)).blob();
 const result=await removeBackground(input,{publicPath:'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',model:'isnet_quint8',device:'cpu',output:{format:'image/png'},progress:(key,current,total)=>{if(total>0)report('جارٍ المعالجة… '+Math.round(current/total*100)+'٪');}});
 const url=URL.createObjectURL(result);
 try{
  const im=new Image();im.src=url;await im.decode();
  const c=document.createElement('canvas');
  for(const size of [900,720,560,420,320]){
   const scale=Math.min(1,size/Math.max(im.naturalWidth,im.naturalHeight));
   c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));
   c.getContext('2d').drawImage(im,0,0,c.width,c.height);
   const out=c.toDataURL('image/webp',.9);
   if(out.length<850000)return out;
  }
  throw Error('تعذّر ضغط الصورة');
 }finally{URL.revokeObjectURL(url);}
}
