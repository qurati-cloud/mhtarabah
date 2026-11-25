import { connect } from './firebase.js';

const el = id => document.getElementById(id);
const selectedKey = 'mh-selected-profile';
const ownerKey = 'mh-selected-owner';
const message = text => { el('message').textContent = text; };
const busy = async (button, action) => {
  button.disabled = true;
  message('');
  try {
    await action();
  } catch (error) {
    message(error.code === 'auth/weak-password'
      ? 'اختر كلمة مرور من ستة أحرف على الأقل.'
      : 'تعذّر إكمال العملية. تحقّق من البيانات والاتصال وحاول مجددًا.');
  } finally {
    button.disabled = false;
  }
};

try {
  const connection = await connect();
  if (connection) configure(connection);
  else message('لم يُفعّل اتصال Firebase بعد.');
} catch {
  message('تعذّر الاتصال بحساب العائلة.');
}

function configure({auth, authApi, data, db}) {
  const collection = uid => data.collection(db, 'families', uid, 'profiles');
  let unsubscribe, count = 0, firstId = null;
  const ordinals = ["الأول","الثاني","الثالث","الرابع","الخامس","السادس","السابع","الثامن","التاسع","العاشر","الحادي عشر","الثاني عشر","الثالث عشر","الرابع عشر","الخامس عشر","السادس عشر","السابع عشر","الثامن عشر","التاسع عشر","العشرون"];
  el("birthDate").max = new Date().toISOString().slice(0,10);
  el("finish").onclick = () => { if (!firstId || !auth.currentUser) return; localStorage.setItem(ownerKey,auth.currentUser.uid); if(!localStorage.getItem(selectedKey)) localStorage.setItem(selectedKey,firstId); location.href="index.html"; };
  function show(user) {
    unsubscribe?.();
    el('loginForm').hidden = Boolean(user);
    el('signOut').hidden = !user;
    el('verify').hidden = !user || user.emailVerified;
    el('family').hidden = !user?.emailVerified;
    el('profiles').replaceChildren();
    if (!user || localStorage.getItem(ownerKey) !== user.uid) {
      localStorage.removeItem(selectedKey);
      localStorage.removeItem(ownerKey);
    }
    if (!user?.emailVerified) return;
    data.setDoc(data.doc(db,'directory',user.uid),{email:user.email}).catch(e=>console.warn('Directory registration',e));

    unsubscribe = data.onSnapshot(collection(user.uid), snapshot => {
      count = snapshot.size; firstId = snapshot.docs[0]?.id; el("finish").hidden = !count; el("profileForm").hidden = count >= 20; el("childTitle").textContent = "ملف الولد " + (ordinals[count] || ""); el("addChild").textContent = "إضافة الولد " + (ordinals[count] || "");
      const buttons = snapshot.docs.map(doc => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = (doc.data().gender === "female" ? "👧 " : doc.data().gender === "male" ? "👦 " : "👤 ") + doc.data().name;
        if (doc.id === localStorage.getItem(selectedKey)) {
          button.setAttribute('aria-current', 'true');
        }
        button.addEventListener('click', () => {
          localStorage.setItem(ownerKey, user.uid);
          localStorage.setItem(selectedKey, doc.id);
          location.href = 'index.html';
        });
        const row=document.createElement('div');row.append(button);
        const edit=document.createElement('button');edit.type='button';edit.textContent='تعديل البيانات';
        edit.onclick=()=>{const p=doc.data();const d=document.createElement('dialog');d.dir='rtl';const f=document.createElement('form');const fields={};for(const [k,label] of [['firstName','الاسم'],['lastName','اسم العائلة'],['gender','الجنس'],['birthDate','تاريخ الميلاد']]){const l=document.createElement('label');l.textContent=label;const x=document.createElement(k==='gender'?'select':'input');if(k==='gender'){x.add(new Option('ذكر','male'));x.add(new Option('أنثى','female'))}else{x.type=k==='birthDate'?'date':'text';x.maxLength=40;if(k==='birthDate')x.max=el('birthDate').max}x.required=true;x.value=p[k]|| (k==='firstName'?p.name:'');fields[k]=x;l.append(x);f.append(l)}const save=document.createElement('button');save.textContent='حفظ';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='إلغاء';cancel.onclick=()=>d.close();f.append(save,cancel);d.append(f);document.body.append(d);d.onclose=()=>d.remove();f.onsubmit=e=>{e.preventDefault();busy(save,async()=>{const v=Object.fromEntries(Object.entries(fields).map(([k,x])=>[k,x.value.trim()]));await data.updateDoc(doc.ref,{...v,name:v.firstName+' '+v.lastName});d.close()})};d.showModal()};row.append(edit);return row;
      });
      el('profiles').replaceChildren(...buttons);
    }, () => message('تعذّر تحميل ملفات العائلة.'));
  }

  authApi.onAuthStateChanged(auth, show);

  el('loginForm').addEventListener('submit', event => {
    event.preventDefault();
    const button = event.submitter ?? el('loginForm').querySelector('button');
    busy(button, async () => {
      const email = el('email').value.trim();
      const password = el('password').value;
      if (button.value === 'register') {
        const {user} = await authApi.createUserWithEmailAndPassword(auth, email, password);
        await authApi.sendEmailVerification(user);
        message('أرسلنا رابط التحقّق إلى بريد العائلة.');
      } else {
        await authApi.signInWithEmailAndPassword(auth, email, password);
      }
      el('loginForm').reset();
    });
  });

  el('sendEmail').onclick = event => busy(event.currentTarget, async () => {
    await authApi.sendEmailVerification(auth.currentUser);
    message('أرسلنا رابط التحقّق إلى بريد العائلة.');
  });
  el('checkEmail').onclick = event => busy(event.currentTarget, async () => {
    const user = auth.currentUser;
    await authApi.reload(user);
    await authApi.getIdToken(user, true);
    show(user);
    if (!user.emailVerified) message('افتح رابط التحقّق في بريدك أولًا.');
  });
  el('signOut').onclick = event => busy(event.currentTarget, async () => {
    await authApi.signOut(auth);
    localStorage.removeItem(selectedKey);
    localStorage.removeItem(ownerKey);
  });
  el('profileForm').addEventListener('submit', event => {
    event.preventDefault();
    const button = event.submitter ?? el('profileForm').querySelector('button');
    busy(button, async () => {
      const name = el('childName').value.trim();
      if (!name) {
        message('اكتب اسم الملف.');
        return;
      }
      if(count >= 20) return;
      const lastName = el("lastName").value.trim(), gender = el("gender").value, birthDate = el("birthDate").value;
      if(!lastName || !["male","female"].includes(gender) || !birthDate || birthDate > el("birthDate").max) {message("أكمل بيانات الولد.");return;}
      await data.addDoc(collection(auth.currentUser.uid), {name: name+" "+lastName,firstName:name,lastName,gender,birthDate});
      el('profileForm').reset();
    });
  });
}
