import { firebaseConfig } from './firebase-config.js';

let connection;
export function connect(){return connection ??= initialize().catch(error=>{connection=undefined;throw error});}
async function initialize() {
  if (!firebaseConfig.apiKey) return null;
  const sdk = 'https://www.gstatic.com/firebasejs/11.10.0';
  const [appApi, authApi, data] = await Promise.all([
    import(sdk + '/firebase-app.js'),
    import(sdk + '/firebase-auth.js'),
    import(sdk + '/firebase-firestore.js')
  ]);
  const app = appApi.initializeApp(firebaseConfig);
  const auth = authApi.getAuth(app);
  const db = data.initializeFirestore(app, {
    localCache: data.memoryLocalCache()
  });
  await auth.authStateReady();
  return { auth, authApi, data, db, appApi };
}

export async function provisionFamily({ appApi, authApi, data, db }, entry, children) {
  const app = appApi.initializeApp(firebaseConfig, 'provision-' + crypto.randomUUID());
  const auth = authApi.initializeAuth(app, {persistence: authApi.inMemoryPersistence});
  let user;
  try {
    const password = crypto.randomUUID() + crypto.randomUUID();
    ({user} = await authApi.createUserWithEmailAndPassword(auth, entry.email, password));
    const batch = data.writeBatch(db);
    batch.set(data.doc(db, 'directory', user.uid), {
      ...entry, email: user.email, source: 'admin', registeredAt: data.serverTimestamp()
    });
    for (const child of children) {
      const profiles = data.collection(db, 'families', user.uid, 'profiles');
      batch.set(data.doc(profiles), child);
    }
    await batch.commit();
    return user.email;
  } catch (error) {
    if (user) {
      try { await authApi.deleteUser(user); }
      catch (cleanupError) {
        console.warn('Provisioning rollback failed', cleanupError);
        throw new Error('تعذّر حفظ البيانات وإلغاء حساب الدخول. راجع حساب البريد في Firebase قبل المحاولة مجددًا.');
      }
    }
    throw error;
  } finally {
    await appApi.deleteApp(app);
  }
}

let runnerGuest;
export function connectRunnerGuest() {
  return runnerGuest ??= (async () => {
    const {appApi, authApi, data} = await connect();
    const name = 'runner-guest';
    const app = appApi.getApps().find(candidate => candidate.name === name) ||
      appApi.initializeApp(firebaseConfig, name);
    const auth = authApi.getAuth(app);
    await auth.authStateReady();
    if (!auth.currentUser) await authApi.signInAnonymously(auth);
    return {data, db: data.getFirestore(app)};
  })().catch(error => {
    runnerGuest = undefined;
    throw error;
  });
}
