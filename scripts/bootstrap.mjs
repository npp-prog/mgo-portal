// Run locally as a trusted Firebase project operator. Never serve credentials.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';
const [projectId,uid] = process.argv.slice(2);
if (!projectId || !uid) throw new Error('Usage: npm run bootstrap -- PROJECT_ID ADMIN_UID');
initializeApp({credential:applicationDefault(),projectId});
const account = await getAuth().getUser(uid);
if (!account.emailVerified || !account.providerData.some(p=>p.providerId==='google.com')) throw new Error('Administrator must sign in with a verified Google account first.');
const db=getFirestore(), directory=JSON.parse(await readFile(new URL('../directory.json',import.meta.url),'utf8'));
const batch=db.batch();
batch.set(db.doc(`admins/${uid}`),{enabled:true,email:account.email,provisionedAt:FieldValue.serverTimestamp()});
batch.set(db.doc('portal/directory'),directory);
await batch.commit();
console.log('Administrator provisioned and directory saved. Reload the portal.');
