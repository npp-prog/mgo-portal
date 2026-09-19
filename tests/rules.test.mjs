import { before,after,beforeEach,test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment,assertSucceeds,assertFails } from '@firebase/rules-unit-testing';
import { doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,serverTimestamp,Timestamp } from 'firebase/firestore';
let env;
const user=(uid,provider='google.com',verified=true)=>env.authenticatedContext(uid,{email:`${uid}@example.com`,email_verified:verified,firebase:{sign_in_provider:provider}}).firestore();
const request=(uid,more={})=>({email:`${uid}@example.com`,name:'Test user',status:'pending',createdAt:serverTimestamp(),reviewedAt:null,reviewedBy:null,...more});
before(async()=> {env=await initializeTestEnvironment({projectId:'demo-mgo-portal',firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{
 const db=c.firestore(); await setDoc(doc(db,'admins','admin'),{enabled:true});
 await setDoc(doc(db,'users','pending'),request('pending'));
 await setDoc(doc(db,'users','approved'),request('approved',{status:'approved'}));
 await setDoc(doc(db,'users','denied'),request('denied',{status:'denied'}));
 await setDoc(doc(db,'portal','directory'),{modules:[]});
});});
test('anonymous and non-Google users cannot request or read access',async()=>{
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'portal','directory')));
 await assertFails(setDoc(doc(user('new','password'),'users','new'),request('new')));
 await assertFails(setDoc(doc(user('new','google.com',false),'users','new'),request('new')));
});
test('first sign-in can create only its own pending request',async()=>{
 const db=user('new');await assertSucceeds(setDoc(doc(db,'users','new'),request('new')));
 await assertFails(setDoc(doc(db,'users','someone'),request('someone')));
 await assertFails(setDoc(doc(user('elevated'),'users','elevated'),request('elevated',{status:'approved'})));
 await assertFails(setDoc(doc(user('extra'),'users','extra'),request('extra',{admin:true})));
});
test('ordinary users cannot approve themselves, impersonate email, list users or become admin',async()=>{
 const db=user('pending');await assertFails(updateDoc(doc(db,'users','pending'),{status:'approved'}));
 await assertFails(setDoc(doc(user('new'),'users','new'),request('new',{email:'admin@example.com'})));
 await assertFails(getDocs(collection(db,'users')));
 await assertFails(setDoc(doc(db,'admins','pending'),{enabled:true}));
 await assertFails(getDoc(doc(db,'admins','admin')));
});
test('pending and denied are blocked; approved and admin can read directory',async()=>{
 for(const uid of ['pending','denied'])await assertFails(getDoc(doc(user(uid),'portal','directory')));
 for(const uid of ['approved','admin'])await assertSucceeds(getDoc(doc(user(uid),'portal','directory')));
});
test('admin can approve and revoke with reviewer metadata',async()=>{
 const db=user('admin'),ref=doc(db,'users','pending');
 await assertSucceeds(updateDoc(ref,{status:'approved',reviewedAt:serverTimestamp(),reviewedBy:'admin'}));
 await assertSucceeds(getDoc(doc(user('pending'),'portal','directory')));
 await assertSucceeds(updateDoc(ref,{status:'denied',reviewedAt:serverTimestamp(),reviewedBy:'admin'}));
 await assertFails(getDoc(doc(user('pending'),'portal','directory')));
});
test('admin cannot change identity, forge reviewer, delete requests or promote another admin',async()=>{
 const db=user('admin'),ref=doc(db,'users','pending');
 await assertFails(updateDoc(ref,{email:'fake@example.com',status:'approved',reviewedAt:serverTimestamp(),reviewedBy:'admin'}));
 await assertFails(updateDoc(ref,{status:'approved',reviewedAt:serverTimestamp(),reviewedBy:'someone'}));
 await assertFails(updateDoc(ref,{status:'approved',reviewedAt:Timestamp.fromMillis(1),reviewedBy:'admin'}));
 await assertFails(deleteDoc(ref));await assertFails(setDoc(doc(db,'admins','pending'),{enabled:true}));
});
test('denied user cannot reset request; revoked admin loses administration',async()=>{
 await assertFails(setDoc(doc(user('denied'),'users','denied'),request('denied')));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'admins','admin'),{enabled:false}));
 await assertFails(getDocs(collection(user('admin'),'users')));
});

test('only administrator can initialize the four-module directory; cannot overwrite it',async()=>{
 const seed=JSON.parse(await readFile(new URL('../directory.json',import.meta.url),'utf8'));
 await env.withSecurityRulesDisabled(c=>deleteDoc(doc(c.firestore(),'portal','directory')));
 for(const uid of ['pending','approved','denied'])await assertFails(setDoc(doc(user(uid),'portal','directory'),seed));
 await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'portal','directory'),seed));
 const db=user('admin');
 await assertFails(setDoc(doc(db,'portal','directory'),{modules:[]}));
 const bad=structuredClone(seed);bad.modules[0].url='javascript:alert(1)';
 await assertFails(setDoc(doc(db,'portal','directory'),bad));
 await assertSucceeds(setDoc(doc(db,'portal','directory'),seed));
 await assertSucceeds(getDoc(doc(user('approved'),'portal','directory')));
 await assertFails(setDoc(doc(db,'portal','directory'),seed));
 await assertFails(deleteDoc(doc(db,'portal','directory')));
});
