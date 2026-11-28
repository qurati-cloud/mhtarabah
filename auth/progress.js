import { connect } from './firebase.js';

export let progress = localStorage;
export let updateProgress = async (key, update) => {
  const previous = JSON.parse(progress.getItem(key) || 'null');
  const next = update(previous);
  if (JSON.stringify(previous) !== JSON.stringify(next)) progress.setItem(key, JSON.stringify(next));
  return next;
};
const profileId = localStorage.getItem('mh-selected-profile');

function changes(previous, next, data) {
  if (JSON.stringify(previous) === JSON.stringify(next)) return undefined;
  if (next === undefined) return data.deleteField();
  if (next === null || typeof next !== 'object' || Array.isArray(next)) return next;
  const before = previous && typeof previous === 'object' ? previous : {};
  const patch = Object.create(null);
  for (const key of new Set([...Object.keys(before), ...Object.keys(next)])) {
    const change = changes(Object.hasOwn(before, key) ? before[key] : undefined,
      Object.hasOwn(next, key) ? next[key] : undefined, data);
    if (change !== undefined) patch[key] = change;
  }
  return Object.keys(patch).length ? patch : next;
}

function status(text) {
  if (text === 'تمت المزامنة') {
    document.getElementById('mh-sync-status')?.remove();
    return;
  }
  let message = document.getElementById('mh-sync-status');
  if (!message) {
    message = document.createElement('p');
    message.id = 'mh-sync-status';
    message.setAttribute('role', 'status');
    document.body.append(message);
  }
  message.textContent = text;
}

if (profileId && /^[a-zA-Z0-9_-]+$/.test(profileId)) {
  // Keep family writes isolated even if the SDK or network fails during startup.
  const invalid = new Map();
  progress = {
    getItem: key => invalid.get(key) ?? null,
    setItem: () => { throw new Error('Family storage unavailable'); }
  };
  try {
    const connection = await connect();
    const user = connection?.auth.currentUser;
    if (!user?.emailVerified || localStorage.getItem('mh-selected-owner') !== user.uid) throw new Error('Family session unavailable');
    const {auth, data, db} = connection;
    const collection = data.collection(db, 'families', user.uid, 'profiles', profileId, 'progress');
    const profileRef = data.doc(db, 'families', user.uid, 'profiles', profileId);
    const profile = await data.getDocFromServer(profileRef);
    if (!profile.exists() || profile.data().deleting) throw new Error('Unknown profile');
    let active = true;
    data.onSnapshot(profileRef, {includeMetadataChanges: true}, current => {
      if (!current.metadata.fromCache && (!current.exists() || current.data().deleting)) {
        active = false;
      }
    }, () => { active = false; });
    const link = document.getElementById('mh-family-link');
    if (link) link.textContent = profile.data().name + ' — تبديل المستخدم';
    const valid = () => active && auth.currentUser?.uid === user.uid &&
      localStorage.getItem('mh-selected-owner') === user.uid &&
      localStorage.getItem('mh-selected-profile') === profileId;
    auth.onAuthStateChanged(current => { if (current?.uid !== user.uid) location.replace('login.html'); });
    window.addEventListener('storage', event => {
      if (['mh-selected-owner','mh-selected-profile'].includes(event.key) && !valid()) {
        if (auth.currentUser?.uid === user.uid && localStorage.getItem('mh-selected-owner') === user.uid &&
            localStorage.getItem('mh-selected-profile')) location.reload();
        else location.replace('login.html');
      }
    });
    const snapshot = await data.getDocs(collection);
    let pending = 0, failed = false;
    const values = new Map(snapshot.docs.map(doc => [doc.id, doc.data().value]));
    updateProgress = async (key, update) => {
      if (!valid()) throw new Error('Family session changed');
      const ref = data.doc(collection, key);
      const value = await data.runTransaction(db, async transaction => {
        const previous = (await transaction.get(ref)).data()?.value;
        const next = update(previous);
        if (JSON.stringify(previous) !== JSON.stringify(next)) transaction.set(ref, {value: next});
        return next;
      });
      if (valid()) values.set(key, value);
      return value;
    };
    progress = {
      getItem(key) {
        if (!valid()) return null;
        return values.has(key) ? JSON.stringify(values.get(key)) : null;
      },
      setItem(key, raw) {
        if (!valid()) throw new Error('Family session changed');
        const value = JSON.parse(raw);
        const patch = changes(values.get(key), value, data);
        if (patch === undefined) return;
        values.set(key, value);
        pending++;
        status('بانتظار تأكيد المزامنة…');
        data.setDoc(data.doc(collection, key), {value: patch}, {merge: true}).then(
          () => { pending--; status(failed ? 'تعذّرت مزامنة بعض التغييرات' : pending ? 'بانتظار تأكيد المزامنة…' : 'تمت المزامنة'); },
          () => { pending--; failed = true; status('تعذّرت المزامنة؛ لا تغلق الصفحة قبل مراجعة الاتصال'); }
        );
      }
    };
  } catch {
    status('تعذّر فتح بيانات الملف العائلي. افتح صفحة حساب العائلة لإعادة الاتصال.');
  }
}
