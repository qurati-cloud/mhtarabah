import {connect} from './firebase.js';
const home=new URL('../index.html',import.meta.url), login=new URL('../login.html',import.meta.url);
const nav=document.createElement('nav');nav.dir='rtl';nav.style.cssText='display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;padding:10px;background:#fff5e3;color:#463426;font: bold 15px Tahoma,Arial;position:relative;z-index:10';
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='width:auto;min-height:42px;margin:0;padding:10px 16px;border:1px solid #e6ad65;border-radius:12px;background:#ffdfa9;color:#463426;font:inherit;cursor:pointer';b.onclick=fn;return b}
const isHome=location.pathname===home.pathname||location.pathname===home.pathname.replace('index.html','');
if(!isHome)nav.append(button('الصفحة الرئيسية',()=>location.href=home.href));
const back=button('→',()=>{try{const prev=new URL(document.referrer);if(prev.origin===home.origin&&prev.pathname.startsWith(home.pathname.replace('index.html',''))&&prev.pathname!==location.pathname){history.back();return}}catch{}location.href=home.href});
back.setAttribute('aria-label','الرجوع إلى الصفحة السابقة');
const account=button('تسجيل الدخول',()=>location.href=login.href);nav.append(account);
const family=button('العائلة',()=>{panel.hidden=!panel.hidden});family.hidden=true;nav.append(family);
const panel=document.createElement('div');panel.hidden=true;panel.style.cssText='flex-basis:100%;max-width:650px;text-align:center';nav.append(panel);
const style=document.createElement('style');
style.textContent=`body > #mh-brand-header{box-sizing:border-box!important;display:block!important;position:relative!important;width:100%!important;max-width:none!important;margin:0!important;padding:18px 12px 22px!important;background:linear-gradient(135deg,#ffac53,#ffe1a0)!important;text-align:center!important;border:0!important;border-radius:0 0 32px 32px!important;box-shadow:0 5px 15px #8a531a20!important;flex-shrink:0!important}#mh-brand-header > a{display:block!important;margin:auto!important;padding:0!important;background:none!important;border:0!important;width:fit-content!important}#mh-brand-header > a > img{display:block!important;width:min(320px,85vw)!important;height:auto!important;max-width:none!important;max-height:none!important;object-fit:contain!important;margin:auto!important}@media(max-width:600px){#mh-brand-header > a > img{width:min(230px,80vw)!important}}`;
document.head.append(style);
const oldHeaders=[...document.querySelectorAll('header')];
for(const old of oldHeaders){
 const title=old.querySelector('h1');const desc=old.querySelector('p');
 if(!isHome && title && !/^محمد وحبيبة$/.test(title.textContent.trim())){
 const section=document.createElement('section');section.style.cssText='text-align:center;padding:12px;color:inherit';section.append(title);if(desc)section.append(desc);old.replaceWith(section);
 }else old.remove();
}
for(const a of document.querySelectorAll('a[href="index.html"],a[href="./index.html"]')){if(/الرئيسية|العودة إلى الألعاب/.test(a.textContent))a.remove()}
document.querySelectorAll('img[src*="mohammad-habiba.png"],img[src*="mohammad-habiba-logo"]').forEach(img=>{const p=img.parentElement;if(p?.tagName==='A'&&p.children.length===1)p.remove();else img.remove()});
const brand=document.createElement('header');brand.id='mh-brand-header';
const link=document.createElement('a');link.href=home.href;link.setAttribute('aria-label','الصفحة الرئيسية');
const logo=document.createElement('img');logo.src=new URL('../mohammad-habiba-logo.png?v=50',import.meta.url).href;logo.alt='محمد وحبيبة';link.append(logo);brand.append(link);
document.body.prepend(brand,nav);
if(!isHome){const row=document.createElement('div');row.id='mh-back-row';row.dir='rtl';row.append(back);document.body.insertBefore(row,nav.nextSibling);}
style.textContent+=' #mh-back-row{box-sizing:border-box;width:min(920px,100%);margin:0 auto;padding:12px 16px 0;flex-shrink:0;text-align:right} #mh-back-row button{background:none!important;border:0!important;box-shadow:none!important;color:#463426!important;font:bold 24px Tahoma,Arial!important;padding:0 8px!important;min-height:32px!important;width:auto!important;cursor:pointer}';
nav.id='mh-shared-nav';
style.textContent+=' #mh-shared-nav{box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;flex-shrink:0!important} #mh-shared-nav button{font:bold 15px Tahoma,Arial!important;min-height:42px!important;width:auto!important;margin:0!important;padding:10px 16px!important;border:1px solid #e6ad65!important;border-radius:12px!important;background:#ffdfa9!important;color:#463426!important}';
if(location.pathname===login.pathname){document.body.style.flexDirection='column';document.body.style.justifyContent='flex-start';}
document.querySelectorAll('img').forEach(img=>{if(/mohammad-habiba-logo/i.test(img.getAttribute('src')||'')){img.style.cursor='pointer';img.tabIndex=0;img.setAttribute('role','link');img.onclick=()=>location.href=home.href;img.onkeydown=e=>{if(e.key==='Enter')location.href=home.href}}});
try{const {auth,authApi,data,db}=await connect();authApi.onAuthStateChanged(auth,async user=>{account.textContent=user?'تسجيل الخروج':'تسجيل الدخول';account.onclick=async()=>{if(!user){location.href=login.href;return}try{await authApi.signOut(auth);localStorage.removeItem('mh-selected-owner');localStorage.removeItem('mh-selected-profile');location.href=home.href}catch{alert('تعذر تسجيل الخروج')}};family.hidden=!user?.emailVerified;panel.hidden=true;panel.replaceChildren();if(!user?.emailVerified)return;nav.querySelector('#mh-admin-link')?.remove();try{const role=user.email==='quraaty@gmail.com'?'admin':(await data.getDoc(data.doc(db,'roles',user.uid))).data()?.role;if(isHome&&['admin','editor'].includes(role)){const b=button(role==='admin'?'لوحة المدير':'لوحة المحرر',()=>location.href=new URL('../admin.html',import.meta.url).href);b.id='mh-admin-link';nav.insertBefore(b,panel)}}catch(e){console.warn('Role lookup failed',e)}try{const snap=await data.getDocs(data.collection(db,'families',user.uid,'profiles'));for(const doc of snap.docs){const p=doc.data();const b=button((p.gender==='female'?'👧 ':p.gender==='male'?'👦 ':'👤 ')+p.name,()=>{localStorage.setItem('mh-selected-owner',user.uid);localStorage.setItem('mh-selected-profile',doc.id);location.reload()});b.style.margin='5px';if(doc.id===localStorage.getItem('mh-selected-profile')){b.style.outline='2px solid #77522f';family.textContent='العائلة · '+p.name}panel.append(b)}panel.append(button('إدارة ملفات الأولاد',()=>location.href=login.href))}catch{panel.textContent='تعذر تحميل العائلة'}})}catch{account.title='تعذر الاتصال بخدمة الحسابات'}

/* Editable page headings and descriptions, keyed by page and element position. */
try{
 const {auth,authApi,data,db}=await connect();
 const ref=data.doc(db,'siteContent','texts');
 const page=location.pathname.split('/').pop()||'index.html';
 const nodes=[...document.querySelectorAll('h1,h2,.hero p,.menu-card strong,.menu-card span')].filter(n=>!n.closest('#mh-shared-nav,#mh-brand-header,#daily-editor,#question-editor,#users,#content')&&n.children.length===0&&n.textContent.trim());
 const keys=nodes.map((n,i)=>page+':'+i);
 const snap=await data.getDoc(ref);const values=snap.data()?.value||{};
 nodes.forEach((n,i)=>{if(typeof values[keys[i]]==='string')n.textContent=values[keys[i]]});
 authApi.onAuthStateChanged(auth,async u=>{
 document.getElementById('mh-text-editor')?.remove();if(!u?.emailVerified||page==='admin.html'||page==='login.html'||!nodes.length)return;
 try{const role=u.email==='quraaty@gmail.com'?'admin':(await data.getDoc(data.doc(db,'roles',u.uid))).data()?.role;if(!['admin','editor'].includes(role))return;
 const b=button('تحرير عناوين الصفحة',()=>{const d=document.createElement('dialog');d.dir='rtl';d.style.cssText='width:min(85vw,520px);border:1px solid #e6ad65;border-radius:12px';const f=document.createElement('form');const fields=nodes.map(n=>{const l=document.createElement('label');l.textContent=n.textContent;const x=document.createElement('textarea');x.value=n.textContent;x.required=true;x.style.cssText='display:block;width:100%;box-sizing:border-box;margin:8px 0';l.append(x);f.append(l);return x});const save=button('حفظ',()=>{});save.type='submit';const cancel=button('إلغاء',()=>d.close());f.append(save,cancel);f.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await data.runTransaction(db,async tx=>{const old=(await tx.get(ref)).data()?.value||{};tx.set(ref,{value:{...old,...Object.fromEntries(keys.map((k,i)=>[k,fields[i].value.trim()]))}})});nodes.forEach((n,i)=>n.textContent=fields[i].value.trim());d.close()}catch(e){alert(e.message);save.disabled=false}};d.append(f);document.body.append(d);d.onclose=()=>d.remove();d.showModal()});b.id='mh-text-editor';nav.insertBefore(b,panel);
 }catch(e){console.warn(e)}
 });
}catch(e){console.warn(e)}
