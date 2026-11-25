import { connect } from './firebase.js';

export let progress = localStorage;
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
    if (!user?.emailVerified) throw new Error('Family session unavailable');
    const {auth, data, db} = connection;
    const collection = data.collection(db, 'families', user.uid, 'profiles', profileId, 'progress');
    const snapshot = await data.getDocs(collection);
    const values = new Map(snapshot.docs.map(doc => [doc.id, doc.data().value]));
    progress = {
      getItem(key) {
        return values.has(key) ? JSON.stringify(values.get(key)) : null;
      },
      setItem(key, raw) {
        if (auth.currentUser?.uid !== user.uid) throw new Error('Family session changed');
        const value = JSON.parse(raw);
        const patch = changes(values.get(key), value, data);
        if (patch === undefined) return;
        values.set(key, value);
        status('بانتظار تأكيد المزامنة…');
        data.setDoc(data.doc(collection, key), {value: patch}, {merge: true}).then(
          () => status('تمت المزامنة'),
          () => status('تعذّرت المزامنة')
        );
      }
    };
  } catch {
    status('تعذّر فتح بيانات الملف العائلي. افتح صفحة حساب العائلة لإعادة الاتصال.');
  }
}
