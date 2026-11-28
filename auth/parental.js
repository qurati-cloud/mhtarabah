import {connect} from './firebase.js';
import {firebaseConfig} from './firebase-config.js';
const el=id=>document.getElementById(id);
const normalize=v=>({allowed:v?.allowed!==false,chat:v?.chat!==false});
export function settingsFor(uid){try{return normalize(JSON.parse(localStorage.getItem('mh-parental:'+uid)||'{}'));}catch{return normalize(null);}}
function cache(uid,v){try{localStorage.setItem('mh-parental:'+uid,JSON.stringify(v));}catch{}}
export async function watchSettings(conn,onChange,onError){
 const uid=conn.auth.currentUser.uid;
 const api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js');
 const ref=api.ref(api.getDatabase(conn.auth.app,firebaseConfig.databaseURL),'parentalSettings/'+uid);
 const snap=await api.get(ref); const initial=snap.exists()?normalize(snap.val()):settingsFor(uid);
 cache(uid,initial);onChange(initial);
 const stop=api.onValue(ref,s=>{const v=s.exists()?normalize(s.val()):settingsFor(uid);cache(uid,v);onChange(v);},onError);
 return {api,ref,stop};
}
if(el('settings')){
 try{const conn=await connect();const {auth,authApi}=conn;const user=auth.currentUser;
 if(!user?.emailVerified){el('status').textContent='سجّل الدخول بحساب العائلة الموثق أولًا.';}
 else{const watcher=await watchSettings(conn,v=>{el('allowed').checked=v.allowed;el('chat').checked=v.chat;},()=>{el('status').textContent='تعذّرت المزامنة.';});
 el('settings').hidden=false;el('status').textContent='تُزامن الإعدادات بين أجهزة الحساب العائلي.';
 el('settings').onsubmit=async e=>{e.preventDefault();el('save').disabled=true;const v={allowed:el('allowed').checked,chat:el('chat').checked};try{if(auth.currentUser?.uid!==user.uid)throw Error('session');await authApi.reauthenticateWithCredential(user,authApi.EmailAuthProvider.credential(user.email,el('password').value));await authApi.getIdToken(user,true);await watcher.api.set(watcher.ref,v);cache(user.uid,v);el('status').textContent='حُفظت الإعدادات لجميع أجهزة الحساب.';}catch{el('status').textContent='تعذّر الحفظ. تحقّق من كلمة المرور والاتصال وتفعيل قواعد المزامنة.';}finally{el('password').value='';el('save').disabled=false;}};
 }}catch{el('status').textContent='تعذّر الاتصال بإعدادات المزامنة. تحقق من تفعيل قواعد Firebase الجديدة.';}
}
