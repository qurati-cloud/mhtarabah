import { firebaseConfig } from './firebase-config.js';

export async function connect() {
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
  return { auth, authApi, data, db };
}
