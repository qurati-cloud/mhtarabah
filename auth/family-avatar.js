// Private family badge. No images are sent to public game rooms.
export function mountFamilyAvatar({brand,nav,panel,button,auth,authApi,data,db}){
 const css=document.createElement('style');css.textContent=`
 #mh-brand-header.mh-personal-brand{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;direction:rtl;gap:8px}
 #mh-brand-header.mh-personal-brand>a>img{width:min(320px,43vw)!important}
 #mh-avatar-badge{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;margin:auto;padding:0;background:none;border:0;min-width:0;width:min(180px,42vw);color:#573516;cursor:pointer}
 #mh-avatar-badge[hidden]{display:none!important}
 .mh-avatar-picture{width:100%;height:clamp(65px,16vw,150px);object-fit:contain;display:block}
 .mh-avatar-placeholder{font: bold clamp(40px,9vw,86px) Arial;color:#a8732e;line-height:1.1}
 .mh-avatar-name{display:block;max-width:100%;overflow-wrap:anywhere;padding:5px 13px;border:3px double #ce8e1f;border-radius:13px;background:linear-gradient(#fff7c9,#ffd879);box-shadow:0 2px 2px #ad73244a;font:bold clamp(12px,3vw,23px) Tahoma}
 #mh-avatar-dialog{color:#463426;background:#fff9ee;border:1px solid #dca258;border-radius:18px;padding:18px;width:min(90vw,480px);max-height:88vh;overflow:auto;box-sizing:border-box}
 #mh-avatar-dialog canvas{display:block;width:min(100%,260px);height:auto;margin:10px auto;background:repeating-conic-gradient(#eee 0% 25%,#fff 0% 50%) 50%/16px 16px;touch-action:none;border-radius:8px}
 #mh-avatar-dialog label{display:block;margin:8px 0}#mh-avatar-dialog input:not([type=checkbox]){max-width:100%;font:inherit}
 #mh-avatar-dialog button{margin:4px}
 `;document.head.append(css);
 const badge=document.createElement('button');badge.type='button';badge.id='mh-avatar-badge';badge.hidden=true;
 const pic=document.createElement('img');pic.className='mh-avatar-picture';pic.alt='';pic.hidden=true;
 const empty=document.createElement('span');empty.className='mh-avatar-placeholder';empty.textContent='♙';empty.setAttribute('aria-hidden','true');
 const name=document.createElement('span');name.className='mh-avatar-name';badge.append(pic,empty,name);brand.append(badge);
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
  const status=document.createElement('p');status.setAttribute('role','status');
  let source=null,dx=0,dy=0,drag=null,strokes=[],loadId=0,loaded=false,busy=false;
  function draw(){ctx.clearRect(0,0,360,360);if(source){const scale=Math.min(360/source.naturalWidth,360/source.naturalHeight)*Number(zoom.value);const w=source.naturalWidth*scale,h=source.naturalHeight*scale;ctx.drawImage(source,(360-w)/2+dx,(360-h)/2+dy,w,h);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';for(const p of strokes){ctx.beginPath();ctx.lineWidth=p.r*2;ctx.moveTo(p.x,p.y);ctx.lineTo(p.tx+.01,p.ty);ctx.stroke();}ctx.restore();}}
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*360/r.height};}
  canvas.onpointerdown=e=>{if(!source||drag)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={...point(e),id:e.pointerId,erase:erase.checked};if(drag.erase){strokes.push({x:drag.x,y:drag.y,tx:drag.x,ty:drag.y,r:Number(size.value)});draw();}};
  canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);if(drag.erase)strokes.push({x:drag.x,y:drag.y,tx:p.x,ty:p.y,r:Number(size.value)});else{dx+=p.x-drag.x;dy+=p.y-drag.y;strokes=[];}Object.assign(drag,p);draw();};
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>drag=null);
  zoom.oninput=()=>{strokes=[];draw();};
  const undo=button('تراجع عن المسح',()=>{strokes.pop();draw();});
  const reset=button('إعادة ضبط القص',()=>{dx=dy=0;zoom.value='1';strokes=[];draw();});
  function ref(){return data.doc(db,'families',uid,'avatars',target.value);}
  async function load(){const seq=++loadId;loaded=false;save.disabled=remove.disabled=true;source=null;dx=dy=0;strokes=[];zoom.value='1';file.value='';draw();status.textContent='جارٍ التحميل…';try{const snap=await data.getDocFromServer(ref());if(seq!==loadId||token!==revision)return;const v=snap.data();nameInput.value=v?.name||profileList.find(p=>p.id===target.value)?.data().name||'';if(validImage(v?.image)){const im=new Image();im.src=v.image;await im.decode();if(seq!==loadId||token!==revision)return;source=im;}draw();loaded=true;save.disabled=remove.disabled=false;status.textContent='';}catch{if(seq===loadId)status.textContent='تعذّر تحميل الملف. تحقق من الاتصال وقواعد الحماية.';}}
  file.onchange=async()=>{if(!loaded||busy)return;const f=file.files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>15*1024*1024){status.textContent='اختر PNG أو JPG أو WebP بحجم لا يتجاوز ١٥ ميغابايت.';return;}const seq=++loadId;save.disabled=true;const url=URL.createObjectURL(f);try{const im=new Image();im.src=url;await im.decode();if(seq!==loadId||token!==revision)return;source=im;dx=dy=0;zoom.value='1';strokes=[];draw();status.textContent='حرّك الصورة أو قصّها ثم احفظ.';}catch{status.textContent='تعذّر فتح الصورة.';}finally{URL.revokeObjectURL(url);if(seq===loadId)save.disabled=false;}};
  const save=button('حفظ',async()=>{if(!loaded||busy||token!==revision)return;busy=true;save.disabled=remove.disabled=target.disabled=file.disabled=true;try{draw();const value=source?canvas.toDataURL('image/webp',.86):'';if(value.length>600000)throw Error('حجم الصورة كبير');await data.setDoc(ref(),{name:nameInput.value.trim(),image:value});status.textContent='حُفظت الصورة والاسم.';}catch(e){status.textContent='تعذّر الحفظ: '+(e.code||e.message);}finally{busy=false;save.disabled=remove.disabled=target.disabled=file.disabled=false;}});
  const remove=button('حذف الصورة والاسم',async()=>{if(!loaded||busy||token!==revision||!confirm('حذف الصورة والاسم من هذا الملف؟'))return;busy=true;save.disabled=remove.disabled=target.disabled=file.disabled=true;try{await data.deleteDoc(ref());source=null;nameInput.value='';strokes=[];draw();status.textContent='حُذفت الصورة.';}catch{status.textContent='تعذّر الحذف.';}finally{busy=false;save.disabled=remove.disabled=target.disabled=file.disabled=false;}});
  target.onchange=load;
  d.append(title,target,label,file,canvas,zoomLabel,eraseLabel,sizeLabel,undo,reset,save,remove,button('إغلاق',()=>{if(!busy)d.close();}),status);document.body.append(d);d.onclose=()=>{++loadId;d.remove();if(dialog===d)dialog=null;};d.showModal();load();
 };
}
