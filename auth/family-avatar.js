// Private family badge. No images are sent to public game rooms.
export function mountFamilyAvatar({brand,nav,panel,button,auth,authApi,data,db}){
 const css=document.createElement('style');css.textContent=`
 #mh-brand-header.mh-personal-brand{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;direction:rtl;gap:8px}
 #mh-brand-header.mh-personal-brand>a>img{width:min(320px,43vw)!important}
 #mh-avatar-badge{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:0;margin:auto;padding:0;background:none;border:0;min-width:0;width:min(320px,43vw);color:#573516;cursor:pointer;position:relative}
 #mh-avatar-badge[hidden]{display:none!important}
 .mh-avatar-picture{width:100%;height:auto;aspect-ratio:1.35;object-fit:contain;display:block}
 .mh-avatar-placeholder{font:bold clamp(65px,16vw,150px) Arial;color:#a8732e;line-height:1.1}
 .mh-avatar-name{position:relative;display:block;box-sizing:border-box;width:81%;max-width:100%;margin-top:-11%;isolation:isolate;overflow-wrap:anywhere;padding:5.5% 11%;color:#5b2d10;font:bold clamp(14px,3.6vw,34px) Tahoma;line-height:1.1;text-shadow:0 1px #fff3c5;filter:drop-shadow(0 2px 1px #a66a2850)}
 .mh-avatar-name::before{content:'';position:absolute;inset:0;z-index:-1;background:center/100% 100% no-repeat url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%2088%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22gold%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff8b6%22%2F%3E%3Cstop%20offset%3D%22.48%22%20stop-color%3D%22%23ffc02c%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23e9a12a%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22cream%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff9e9%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23ffe7b3%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20id%3D%22frame%22%20d%3D%22M150%205%20C170%2022%20202%2013%20224%2010%20C249%206%20262%2013%20269%2027%20C288%2028%20297%2039%20295%2049%20C294%2061%20282%2068%20269%2068%20C261%2083%20242%2084%20224%2081%20C194%2075%20169%2073%20150%2085%20C131%2073%20106%2075%2076%2081%20C58%2084%2039%2083%2031%2068%20C18%2068%206%2061%205%2049%20C3%2039%2012%2028%2031%2027%20C38%2013%2051%206%2076%2010%20C98%2013%20130%2022%20150%205Z%22%2F%3E%3C%2Fdefs%3E%3Cuse%20href%3D%22%23frame%22%20fill%3D%22url(%23gold)%22%20stroke%3D%22%23d78a15%22%20stroke-width%3D%222.4%22%2F%3E%3Cuse%20href%3D%22%23frame%22%20transform%3D%22translate(150%2044)%20scale(.963%20.89)%20translate(-150%20-44)%22%20fill%3D%22url(%23cream)%22%20stroke%3D%22%23fff6c6%22%20stroke-width%3D%223%22%2F%3E%3Cuse%20href%3D%22%23frame%22%20transform%3D%22translate(150%2044)%20scale(.94%20.82)%20translate(-150%20-44)%22%20fill%3D%22none%22%20stroke%3D%22%23e9a021%22%20stroke-width%3D%221.3%22%2F%3E%3C%2Fsvg%3E")}
 @media(max-width:600px){#mh-brand-header.mh-personal-brand>a>img,#mh-avatar-badge{width:min(230px,42vw)!important}.mh-avatar-name{font-size:clamp(12px,4vw,23px)}}
 #mh-avatar-dialog{color:#463426;background:#fff9ee;border:1px solid #dca258;border-radius:18px;padding:18px;width:min(90vw,480px);max-height:88vh;overflow:auto;box-sizing:border-box}
 #mh-avatar-dialog canvas{display:block;width:min(100%,260px);height:auto;margin:10px auto;background:repeating-conic-gradient(#eee 0% 25%,#fff 0% 50%) 50%/16px 16px;touch-action:none;border-radius:8px}
 #mh-avatar-dialog label{display:block;margin:8px 0}#mh-avatar-dialog input:not([type=checkbox]){max-width:100%;font:inherit}
 #mh-avatar-dialog button{margin:4px}
 `;document.head.append(css);
 const badge=document.createElement('button');badge.type='button';badge.id='mh-avatar-badge';badge.hidden=true;
 const pic=document.createElement('img');pic.className='mh-avatar-picture';pic.alt='';pic.hidden=true;
 const empty=document.createElement('span');empty.className='mh-avatar-placeholder';empty.textContent='♙';empty.setAttribute('aria-hidden','true');
 const name=document.createElement('span');name.className='mh-avatar-name';badge.append(pic,empty,name);brand.append(badge);
 const logo=brand.querySelector(':scope > a > img');
 if(logo && typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>{const h=logo.getBoundingClientRect().height;if(h>0){badge.style.height=h+'px';pic.style.height=h*.86+'px';pic.style.aspectRatio='auto';name.style.minHeight=h*.25+'px';}}).observe(logo);}
 let stop,stopProfiles,activeUser,profileList=[],current,dialog,revision=0;
 const validImage=v=>typeof v==='string'&&/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v);
 const selected=()=>localStorage.getItem('mh-selected-owner')===activeUser?.uid?localStorage.getItem('mh-selected-profile'):null;
 const displayTarget=()=>{const id=selected();const p=profileList.find(x=>x.id===id);return p?{id:p.id,label:p.data().name}:{id:'account',label:'الحساب الأساسي'};};
 function show(value,target){
  name.textContent=value?.name||target.label;
  if(validImage(value?.image)){pic.src=value.image;pic.hidden=false;pic.style.display='block';empty.hidden=true;}
  else{pic.removeAttribute('src');pic.hidden=true;pic.style.display='none';empty.hidden=false;name.textContent=value?.name||'ضع صورتك';}
 }
 function watch(){stop?.();const target=displayTarget();current=target;show(null,target);if(!activeUser)return;const token=revision;stop=data.onSnapshot(data.doc(db,'families',activeUser.uid,'avatars',target.id),snap=>{if(token===revision&&current?.id===target.id)show(snap.data(),target);},()=>{if(token===revision)badge.title='تعذّر تحميل الصورة';});}
 authApi.onAuthStateChanged(auth,user=>{
  ++revision;stop?.();stopProfiles?.();dialog?.close();activeUser=null;profileList=[];current=null;pic.removeAttribute('src');badge.hidden=true;brand.classList.remove('mh-personal-brand');
  if(!user?.emailVerified)return;activeUser=user;badge.hidden=false;brand.classList.add('mh-personal-brand');watch();
  stopProfiles=data.onSnapshot(data.collection(db,'families',user.uid,'profiles'),s=>{if(activeUser?.uid!==user.uid)return;profileList=s.docs.filter(p=>!p.data().deleting);if(displayTarget().id!==current?.id)watch();},()=>{});
 });
 badge.onclick=()=>{
  if(!activeUser||dialog?.open)return;const uid=activeUser.uid,token=revision;
  const d=document.createElement('dialog');d.id='mh-avatar-dialog';d.dir='rtl';dialog=d;
  const title=document.createElement('h2');title.textContent='صورتك الشخصية';
  const target=document.createElement('select');target.setAttribute('aria-label','اختر فرد العائلة');target.add(new Option('الحساب الأساسي','account'));for(const p of profileList)target.add(new Option(p.data().name,p.id));target.value=displayTarget().id;
  const nameInput=document.createElement('input');nameInput.maxLength=40;nameInput.placeholder='الاسم على الكادر';
  const label=document.createElement('label');label.append('الاسم على الكادر ',nameInput);
  const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';
  const canvas=document.createElement('canvas');canvas.width=canvas.height=360;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const zoom=document.createElement('input');zoom.type='range';zoom.min='0.65';zoom.max='3';zoom.step='.01';zoom.value='1';
  const zoomLabel=document.createElement('label');zoomLabel.append('تكبير وتصغير ',zoom);
  const erase=document.createElement('input');erase.type='checkbox';const eraseLabel=document.createElement('label');eraseLabel.append(erase,' ممحاة الخلفية (مرّر إصبعك على الخلفية)');
  const size=document.createElement('input');size.type='range';size.min='5';size.max='65';size.value='24';const sizeLabel=document.createElement('label');sizeLabel.append('حجم الممحاة ',size);
  const strength=document.createElement('input');strength.type='range';strength.min='5';strength.max='100';strength.value='100';
  const strengthLabel=document.createElement('label');strengthLabel.append('قوة المحو ',strength);
  const softness=document.createElement('input');softness.type='range';softness.min='0';softness.max='100';softness.value='30';
  const softnessLabel=document.createElement('label');softnessLabel.append('نعومة الحواف ',softness);
  const status=document.createElement('p');status.setAttribute('role','status');
  let source=null,dx=0,dy=0,drag=null,strokes=[],loadId=0,loaded=false,busy=false;
  function draw(){ctx.clearRect(0,0,360,360);if(source){const scale=Math.min(360/source.naturalWidth,360/source.naturalHeight)*Number(zoom.value);const w=source.naturalWidth*scale,h=source.naturalHeight*scale;ctx.drawImage(source,(360-w)/2+dx,(360-h)/2+dy,w,h);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';for(const p of strokes){const steps=Math.max(1,Math.ceil(Math.hypot(p.tx-p.x,p.ty-p.y)/Math.max(1,p.r*.3)));for(let j=0;j<=steps;j++){const x=p.x+(p.tx-p.x)*j/steps,y=p.y+(p.ty-p.y)*j/steps;const a=p.a??1;const soft=p.soft??0;ctx.globalAlpha=1;const g=ctx.createRadialGradient(x,y,p.r*(1-soft*.99),x,y,p.r);g.addColorStop(0,'rgba(0,0,0,'+a+')');g.addColorStop(1,'rgba(0,0,0,'+(soft?0:a)+')');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();}}ctx.restore();}}
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*360/r.height};}
  canvas.onpointerdown=e=>{if(!source||drag||busy)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={...point(e),id:e.pointerId,erase:erase.checked};if(drag.erase){strokes.push({x:drag.x,y:drag.y,tx:drag.x,ty:drag.y,r:Number(size.value),a:Number(strength.value)/100,soft:Number(softness.value)/100});draw();}};
  canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);if(drag.erase)strokes.push({x:drag.x,y:drag.y,tx:p.x,ty:p.y,r:Number(size.value),a:Number(strength.value)/100,soft:Number(softness.value)/100});else{dx+=p.x-drag.x;dy+=p.y-drag.y;strokes=[];}Object.assign(drag,p);draw();};
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>drag=null);
  zoom.oninput=()=>{strokes=[];draw();};
  const undo=button('تراجع عن المسح',()=>{strokes.pop();draw();});
  const reset=button('إعادة ضبط القص',()=>{dx=dy=0;zoom.value='1';strokes=[];draw();});
  function ref(){return data.doc(db,'families',uid,'avatars',target.value);}
  async function load(){const seq=++loadId;loaded=false;save.disabled=remove.disabled=true;source=null;dx=dy=0;strokes=[];zoom.value='1';file.value='';draw();status.textContent='جارٍ التحميل…';try{const snap=await data.getDocFromServer(ref());if(seq!==loadId||token!==revision)return;const v=snap.data();nameInput.value=v?.name||profileList.find(p=>p.id===target.value)?.data().name||'';if(validImage(v?.image)){const im=new Image();im.src=v.image;await im.decode();if(seq!==loadId||token!==revision)return;source=im;}draw();loaded=true;save.disabled=remove.disabled=false;status.textContent='';}catch{if(seq===loadId)status.textContent='تعذّر تحميل الملف. تحقق من الاتصال وقواعد الحماية.';}}
  file.onchange=async()=>{if(!loaded||busy)return;const f=file.files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>15*1024*1024){status.textContent='اختر PNG أو JPG أو WebP بحجم لا يتجاوز ١٥ ميغابايت.';return;}const seq=++loadId;save.disabled=true;const url=URL.createObjectURL(f);try{const im=new Image();im.src=url;await im.decode();if(seq!==loadId||token!==revision)return;source=im;dx=dy=0;zoom.value='1';strokes=[];draw();status.textContent='حرّك الصورة أو قصّها ثم احفظ.';}catch{status.textContent='تعذّر فتح الصورة.';}finally{URL.revokeObjectURL(url);if(seq===loadId)save.disabled=false;}};
  const save=button('حفظ',async()=>{if(!loaded||busy||token!==revision)return;busy=true;save.disabled=remove.disabled=target.disabled=file.disabled=true;try{draw();const value=source?canvas.toDataURL('image/webp',.86):'';if(value.length>600000)throw Error('حجم الصورة كبير');await data.setDoc(ref(),{name:nameInput.value.trim(),image:value});status.textContent='حُفظت الصورة والاسم.';}catch(e){status.textContent='تعذّر الحفظ: '+(e.code||e.message);}finally{busy=false;save.disabled=remove.disabled=target.disabled=file.disabled=false;}});
  const remove=button('حذف الصورة والاسم',async()=>{if(!loaded||busy||token!==revision||!confirm('حذف الصورة والاسم من هذا الملف؟'))return;busy=true;save.disabled=remove.disabled=target.disabled=file.disabled=true;try{await data.deleteDoc(ref());source=null;nameInput.value='';strokes=[];draw();status.textContent='حُذفت الصورة.';}catch{status.textContent='تعذّر الحذف.';}finally{busy=false;save.disabled=remove.disabled=target.disabled=file.disabled=false;}});
  let beforeAI=null;
  const ai=button('إزالة الخلفية بـ AI',async()=>{
   if(!source||!loaded||busy)return;
   busy=true;ai.disabled=save.disabled=remove.disabled=target.disabled=file.disabled=true;
   const seq=loadId;
   try{
    draw();const previous={source,dx,dy,zoom:zoom.value,strokes:strokes.slice()};
    const {removeImageBackground}=await import('./background-removal.js');
    const value=await removeImageBackground(canvas.toDataURL('image/png'),t=>{status.textContent=t;});
    const im=new Image();im.src=value;await im.decode();
    if(seq!==loadId||token!==revision)return;
    beforeAI=previous;source=im;dx=dy=0;zoom.value='1';strokes=[];draw();status.textContent='أُزيلت الخلفية. يمكنك تعديلها أو حفظها.';
   }catch(e){status.textContent='تعذّرت إزالة الخلفية. حاول مجددًا.';console.warn(e);}
   finally{busy=false;ai.disabled=save.disabled=remove.disabled=target.disabled=file.disabled=false;}
  });
  const undoAI=button('تراجع عن AI',()=>{if(!beforeAI||busy)return;source=beforeAI.source;dx=beforeAI.dx;dy=beforeAI.dy;zoom.value=beforeAI.zoom;strokes=beforeAI.strokes;beforeAI=null;draw();});
  const download=button('حفظ الصورة على الجهاز',()=>{
   if(!source||!loaded||busy){status.textContent='اختر صورة أولًا.';return;}
   draw();canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-avatar.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);},'image/png');
  });
  file.addEventListener('change',()=>{beforeAI=null;});target.onchange=()=>{beforeAI=null;load();};
  d.append(title,target,label,file,ai,undoAI,canvas,zoomLabel,eraseLabel,sizeLabel,strengthLabel,softnessLabel,undo,reset,save,download,remove,button('إغلاق',()=>{if(!busy)d.close();}),status);document.body.append(d);d.onclose=()=>{++loadId;d.remove();if(dialog===d)dialog=null;};d.showModal();load();
 };
}
