import {connect} from './firebase.js';
const el=id=>document.getElementById(id);
export function settingsFor(uid){try{const v=JSON.parse(localStorage.getItem('mh-parental:'+uid)||'{}');return {allowed:v.allowed!==false,chat:v.chat!==false};}catch{return {allowed:true,chat:true};}}
if(el('settings')){
 try{const {auth,authApi}=await connect();const user=auth.currentUser;
 if(!user?.emailVerified){el('status').textContent='سجّل الدخول بحساب العائلة الموثق أولًا.';}
 else{const current=settingsFor(user.uid);el('allowed').checked=current.allowed;el('chat').checked=current.chat;el('settings').hidden=false;el('status').textContent='تُطبق الإعدادات على هذا الجهاز فقط.';
 el('settings').onsubmit=async e=>{e.preventDefault();el('save').disabled=true;try{if(auth.currentUser?.uid!==user.uid)throw Error('session');await authApi.reauthenticateWithCredential(user,authApi.EmailAuthProvider.credential(user.email,el('password').value));localStorage.setItem('mh-parental:'+user.uid,JSON.stringify({allowed:el('allowed').checked,chat:el('chat').checked}));el('status').textContent='حُفظت الإعدادات.';}catch{el('status').textContent='تعذّر التأكيد. تحقّق من كلمة المرور والاتصال.';}finally{el('password').value='';el('save').disabled=false;}};
 }}catch{el('status').textContent='تعذّر الاتصال.';}
}
