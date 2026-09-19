// Run locally as a trusted Firebase project operator. Never serve credentials.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';
const projectId = 'mgo-portal';
const adminEmail = 'npp@mgocandoniaccounting.org';
if (process.argv.length > 2) throw new Error('This setup is fixed to mgo-portal and the designated administrator. Run npm run bootstrap without arguments.');
initializeApp({credential:applicationDefault(),projectId});
const account = await getAuth().getUserByEmail(adminEmail);
const uid = account.uid;
if (account.disabled || account.email?.toLowerCase() !== adminEmail) throw new Error('The designated administrator account is disabled or does not match.');
if (!account.emailVerified || !account.providerData.some(p=>p.providerId==='google.com' && p.email?.toLowerCase() === adminEmail)) throw new Error('Administrator must sign in with a verified Google account first.');
const db=getFirestore(), directory=JSON.parse(await readFile(new URL('../directory.json',import.meta.url),'utf8'));
const batch=db.batch();
batch.set(db.doc(`admins/${uid}`),{enabled:true,email:account.email,provisionedAt:FieldValue.serverTimestamp()});
batch.set(db.doc('portal/directory'),directory);
await batch.commit();
console.log('Administrator npp@mgocandoniaccounting.org provisioned and directory saved. Reload the portal.');
