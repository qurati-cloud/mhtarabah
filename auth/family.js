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
  let unsubscribe;
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

    unsubscribe = data.onSnapshot(collection(user.uid), snapshot => {
      const buttons = snapshot.docs.map(doc => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = doc.data().name;
        if (doc.id === localStorage.getItem(selectedKey)) {
          button.setAttribute('aria-current', 'true');
        }
        button.addEventListener('click', () => {
          localStorage.setItem(ownerKey, user.uid);
          localStorage.setItem(selectedKey, doc.id);
          location.href = 'index.html';
        });
        return button;
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
      await data.addDoc(collection(auth.currentUser.uid), {name});
      el('profileForm').reset();
    });
  });
}
