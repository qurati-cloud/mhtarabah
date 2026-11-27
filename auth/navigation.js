import {connect} from './firebase.js';
import {activeProfiles, reconcileProfileSelection} from './profiles.js';
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
try {
  const {auth, authApi, data, db} = await connect();
  let stopProfiles;
  authApi.onAuthStateChanged(auth, async user => {
    stopProfiles?.();
    nav.querySelector('#mh-admin-link')?.remove();
    account.textContent = user ? 'تسجيل الخروج' : 'تسجيل الدخول';
    account.onclick = async () => {
      if (!user) { location.href = login.href; return; }
      try {
        await authApi.signOut(auth);
        localStorage.removeItem('mh-selected-owner');
        localStorage.removeItem('mh-selected-profile');
        location.href = home.href;
      } catch { alert('تعذر تسجيل الخروج'); }
    };
    family.hidden = !user?.emailVerified;
    family.textContent = 'العائلة';
    panel.hidden = true;
    panel.replaceChildren();
    if (!user?.emailVerified) return;

    const onManagementPage = location.pathname === login.pathname;
    const profilesRef = data.collection(db, 'families', user.uid, 'profiles');
    stopProfiles = data.onSnapshot(profilesRef, {includeMetadataChanges: true}, snapshot => {
      // The management page owns its selection so interrupted deletions can be resumed there.
      const result = onManagementPage
        ? {profiles: activeProfiles(snapshot), changed: false}
        : reconcileProfileSelection(snapshot, user.uid);
      if (result.changed) {
        location.replace(result.profiles.length ? location.href : login.href);
        return;
      }
      family.textContent = 'العائلة';
      panel.replaceChildren();
      for (const profile of result.profiles) {
        const p = profile.data();
        const prefix = p.gender === 'female' ? '👧 ' : p.gender === 'male' ? '👦 ' : '👤 ';
        const b = button(prefix + p.name, () => {
          localStorage.setItem('mh-selected-owner', user.uid);
          localStorage.setItem('mh-selected-profile', profile.id);
          if (onManagementPage) location.href = home.href;
          else location.reload();
        });
        b.style.margin = '5px';
        if (localStorage.getItem('mh-selected-owner') === user.uid &&
            profile.id === localStorage.getItem('mh-selected-profile')) {
          b.style.outline = '2px solid #77522f';
          family.textContent = 'العائلة · ' + p.name;
        }
        panel.append(b);
      }
      panel.append(button('إدارة ملفات الأولاد', () => location.href = login.href));
    }, () => { panel.textContent = 'تعذر تحميل العائلة'; });

    try {
      const role = user.email === 'quraaty@gmail.com' ? 'admin'
        : (await data.getDoc(data.doc(db, 'roles', user.uid))).data()?.role;
      if (auth.currentUser?.uid === user.uid && isHome && ['admin', 'editor'].includes(role)) {
        const b = button(role === 'admin' ? 'لوحة المدير' : 'لوحة المحرر',
          () => location.href = new URL('../admin.html', import.meta.url).href);
        b.id = 'mh-admin-link';
        nav.insertBefore(b, panel);
      }
    } catch (error) { console.warn('Role lookup failed', error); }
  });
} catch { account.title = 'تعذر الاتصال بخدمة الحسابات'; }

/* Keep positional keys for existing headings. Home cards have explicit keys. */
try {
 const {auth, authApi, data, db} = await connect();
 const ref = data.doc(db, 'siteContent', 'texts');
 const page = location.pathname.split('/').pop() || 'index.html';
 const headings = [...document.querySelectorAll('h1,h2,.hero p,.menu-card strong,.menu-card span')]
  .filter(node => !node.closest('#mh-shared-nav,#mh-brand-header,#daily-editor,#question-editor,#users,#content')
   && !node.dataset.textKey && node.children.length === 0 && node.textContent.trim());
 const fields = headings.map((node, index) => ({node, key: page + ':' + index}));
 const cardFields = isHome
  ? [...document.querySelectorAll('#home .home-card strong[data-text-key]')]
   .map(node => ({node, key: node.dataset.textKey}))
  : [];
 const explicit = [...document.querySelectorAll('[data-text-key]')]
  .filter(node => !cardFields.some(field => field.node === node))
  .map(node => ({node, key: node.dataset.textKey, label: node.dataset.editorLabel}));
 fields.push(...cardFields, ...explicit);
 for (const field of fields) field.defaultText = field.node.textContent;

 function showTexts(snapshot) {
  const values = snapshot.data()?.value || {};
  for (const {node, key, defaultText} of fields) {
   node.textContent = typeof values[key] === 'string' ? values[key] : defaultText;
  }
 }

 if (fields.length) {
  if (isHome || page === 'runner.html' || page === 'neighborhood.html' || page === 'colors.html') data.onSnapshot(ref, showTexts, error => console.warn('Text loading failed', error));
  else data.getDoc(ref).then(showTexts).catch(error => console.warn('Text loading failed', error));
 }

 let controls = [];
 let activeDialog;
 let authChange = 0;

 function openTextEditor(selection) {
  const dialog = document.createElement('dialog');
  dialog.dir = 'rtl';
  dialog.style.cssText = 'width:min(85vw,520px);border:1px solid #e6ad65;border-radius:12px';
  const form = document.createElement('form');
  const entries = selection.map(({node, key, label: fieldLabel}) => {
   const label = document.createElement('label');
   label.textContent = fieldLabel || node.textContent;
   const input = document.createElement('textarea');
   input.value = node.textContent;
   input.required = !fieldLabel;
   if (fieldLabel) input.maxLength = 110;
   input.style.cssText = 'display:block;width:100%;box-sizing:border-box;margin:8px 0';
   input.oninput = () => input.setCustomValidity('');
   label.append(input);
   form.append(label);
   return {key, node, input, original: input.value};
  });
  const save = button('حفظ', () => {});
  save.type = 'submit';
  const cancel = button('إلغاء', () => dialog.close());
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  form.append(save, cancel, status);
  form.onsubmit = async event => {
   event.preventDefault();
   const blank = entries.find(({input}) => input.required && !input.value.trim());
   if (blank) {
    blank.input.setCustomValidity('أدخل نصًا قبل الحفظ');
    blank.input.reportValidity();
    return;
   }
   const changed = entries.filter(({input, original}) => input.value.trim() !== original);
   if (!changed.length) {
    dialog.close();
    return;
   }
   const updates = Object.fromEntries(changed.map(({key, input}) => [key, input.value.trim()]));
   save.disabled = true;
   status.textContent = 'جارٍ الحفظ…';
   try {
    await data.runTransaction(db, async transaction => {
     const previous = (await transaction.get(ref)).data()?.value || {};
     transaction.set(ref, {value: {...previous, ...updates}}, {merge: true});
    });
    if (!isHome) {
     for (const {key, node} of fields) if (Object.hasOwn(updates, key)) node.textContent = updates[key];
    }
    dialog.close();
   } catch (error) {
    console.warn('Text saving failed', error);
    status.textContent = 'تعذّر الحفظ. حاول مرة أخرى.';
    save.disabled = false;
   }
  };
  dialog.append(form);
  document.body.append(dialog);
  activeDialog = dialog;
  dialog.onclose = () => {
   dialog.remove();
   if (activeDialog === dialog) activeDialog = undefined;
  };
  dialog.showModal();
 }

 authApi.onAuthStateChanged(auth, async user => {
  const change = ++authChange;
  controls.forEach(control => control.remove());
  controls = [];
  activeDialog?.close();
  if (!user?.emailVerified || page === 'admin.html' || page === 'login.html' || !fields.length) return;

  try {
   const role = user.email === 'quraaty@gmail.com' ? 'admin'
    : (await data.getDoc(data.doc(db, 'roles', user.uid))).data()?.role;
   if (change !== authChange || !['admin', 'editor'].includes(role)) return;

   const editable = [...new Map(fields.filter(field=>!field.label).map(field => [field.key, field])).values()];
   const signs = fields.filter(field=>field.label);
   if (signs.length) {
    const signEditor = button('لافتات الطريق (٣٠)', () => openTextEditor(signs));
    nav.insertBefore(signEditor,panel);
    controls.push(signEditor);
   }
   const editor = button(['runner.html','neighborhood.html','colors.html'].includes(page) ? 'تحرير نصوص اللعبة' : 'تحرير عناوين الصفحة',
     () => openTextEditor(editable));
   editor.id = 'mh-text-editor';
   nav.insertBefore(editor, panel);
   controls.push(editor);

   for (const field of cardFields) {
    const card = field.node.closest('.home-card');
    const pencil = document.createElement('button');
    pencil.type = 'button';
    pencil.className = 'home-card-edit';
    pencil.textContent = '✎';
    pencil.setAttribute('aria-label', 'تحرير عنوان بطاقة ' + field.defaultText);
    pencil.onclick = () => openTextEditor([field]);
    card.append(pencil);
    controls.push(pencil);
   }
  } catch (error) {
   console.warn('Text editor role lookup failed', error);
  }
 });
} catch (error) {
 console.warn('Text editor initialization failed', error);
}
