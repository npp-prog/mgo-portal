import { firebaseConfig } from './firebase-config.js';
import { icons } from './icons.js';
const $ = id => document.getElementById(id);
const show = (id, value) => { $(id).hidden = !value; };
const error = message => { $('error-message').textContent = message; show('error-message', Boolean(message)); };
function gate(title, message) {
  show('gate', true); show('portal', false); $('apps').replaceChildren();
  $('gate-title').textContent = title; $('gate-message').textContent = message;
}
function friendly(e) {
  const messages = {
    'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled. You can try again.',
    'auth/unauthorized-domain': 'This website address has not been authorized for sign-in. Please contact the portal administrator.',
    'auth/network-request-failed': 'Unable to connect. Check your internet connection and try again.',
    'permission-denied': 'Access could not be verified. Please contact the portal administrator.',
    'unavailable': 'The service is unavailable. Check your connection and reload.'
  };
  return messages[e.code] || 'Unable to complete this request. Please reload or contact the portal administrator.';
}
if (Object.values(firebaseConfig).some(v => !v || v.includes('REPLACE_ME'))) {
  $('connection-message').textContent = 'Sign-in is not configured yet. Please contact the portal administrator.';
} else {
  const [{ initializeApp }, A, F] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
  ]);
  const app = initializeApp(firebaseConfig), auth = A.getAuth(app), db = F.getFirestore(app);
  const provider = new A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await A.setPersistence(auth, A.browserSessionPersistence);
  let epoch = 0, user = null, userState = null, adminState = null;
  let userStop, adminStop, directoryStop, requestsStop, requests = [];
  const stop = fn => { if (fn) fn(); };
  function closeDirectory() {
    stop(directoryStop); directoryStop = null;
    show('portal', false); $('apps').replaceChildren();
  }
  function closeAdmin() {
    stop(requestsStop); requestsStop = null; requests = [];
    $('requests').replaceChildren(); show('admin', false);
  }
  function fail(e) {
    closeDirectory(); closeAdmin();
    gate('Access could not be verified', 'Please reload to check your access again.');
    error(friendly(e));
  }
  $('google-sign-in').disabled = false;
  $('connection-message').textContent = '';
  $('google-sign-in').onclick = async () => {
    error(''); $('google-sign-in').disabled = true;
    try { await A.signInWithPopup(auth, provider); }
    catch(e) { error(friendly(e)); }
    finally { $('google-sign-in').disabled = false; }
  };
  $('sign-out').onclick = async () => {
    closeDirectory(); closeAdmin();
    try { await A.signOut(auth); } catch(e) { fail(e); }
  };
  function renderDirectory(data) {
    const fragment = document.createDocumentFragment();
    for (const module of data.modules || []) {
      let url; try { url = new URL(module.url); } catch { continue; }
      if (url.protocol !== 'https:') continue;
      const card = document.createElement('a'); card.className = 'app';
      card.href = url.href; card.target = '_blank'; card.rel = 'noopener noreferrer';
      card.setAttribute('aria-describedby', 'new-tab');
      const top = document.createElement('div'); top.className = 'card-top';
      const icon = document.createElement('span'); icon.className = 'icon';
      icon.innerHTML = icons[module.id] || icons.documents; // Local, trusted SVG only.
      const code = document.createElement('span'); code.className = 'code'; code.textContent = module.code;
      top.append(icon, code);
      const title = document.createElement('h3'); title.textContent = module.title;
      const desc = document.createElement('p'); desc.className = 'description'; desc.textContent = module.description;
      const bottom = document.createElement('div'); bottom.className = 'card-bottom';
      const domain = document.createElement('span'); domain.className = 'domain'; domain.textContent = url.hostname;
      const launch = document.createElement('span'); launch.className = 'launch'; launch.textContent = '↗'; launch.setAttribute('aria-hidden','true');
      bottom.append(domain, launch); card.append(top, title, desc, bottom); fragment.append(card);
    }
    $('apps').replaceChildren(fragment);
    document.querySelector('.section-head > span').textContent = `${$('apps').childElementCount} applications`;
  }
  function renderRequests() {
    $('requests').replaceChildren();
    const rows = requests.filter(r => r.status === $('status-filter').value);
    $('admin-message').textContent = rows.length ? `${rows.length} ${$('status-filter').value} account(s)` : 'No accounts in this category.';
    rows.sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    for (const row of rows) {
      const item = document.createElement('article'); item.className = 'request';
      const person = document.createElement('div'); person.className = 'request-person';
      const name = document.createElement('strong'); name.textContent = row.name || row.email;
      const email = document.createElement('p'); email.textContent = row.email;
      const requested = document.createElement('p'); requested.textContent = row.createdAt?.toDate ? `Requested ${row.createdAt.toDate().toLocaleString()}` : 'Request time unavailable';
      person.append(name,email,requested);
      if (row.reviewedAt?.toDate) {
        const review = document.createElement('p'); review.textContent = `Last decision: ${row.status} · ${row.reviewedAt.toDate().toLocaleString()}`; person.append(review);
      }
      const actions = document.createElement('div'); actions.className = 'request-actions';
      if (row.uid === user.uid) { const own = document.createElement('span'); own.textContent = 'Your account'; actions.append(own); }
      else for (const status of ['approved','denied']) {
        if (row.status === status) continue;
        const button = document.createElement('button'); button.type = 'button'; button.className = status === 'approved' ? 'primary' : 'secondary';
        button.textContent = status === 'approved' ? 'Approve' : row.status === 'approved' ? 'Revoke access' : 'Deny';
        button.onclick = async () => {
          if (!confirm(`${button.textContent} for ${row.email}?`)) return;
          actions.querySelectorAll('button').forEach(b => b.disabled = true); error('');
          try {
            // Transaction prevents overwriting another administrator's newer decision.
            await F.runTransaction(db, async tx => {
              const ref = F.doc(db,'users',row.uid), current = await tx.get(ref);
              if (!current.exists() || current.data().status !== row.status) throw new Error('changed');
              tx.update(ref,{status,reviewedAt:F.serverTimestamp(),reviewedBy:user.uid});
            });
          } catch(e) {
            error(e.message === 'changed' ? 'This account was already updated. Please review its latest status.' : friendly(e));
            actions.querySelectorAll('button').forEach(b => b.disabled = false);
          }
        };
        actions.append(button);
      }
      item.append(person,actions); $('requests').append(item);
    }
  }
  $('status-filter').onchange = renderRequests;
  function reconcile(myEpoch) {
    if (myEpoch !== epoch || !user) return;
    if (adminState === null || userState === null) return;
    const isAdmin = adminState === true;
    if (isAdmin) {
      show('admin',true);
      if (!requestsStop) requestsStop = F.onSnapshot(F.collection(db,'users'),{includeMetadataChanges:true},snapshot => {
        if (myEpoch !== epoch) return;
        if (snapshot.metadata.fromCache) { $('requests').replaceChildren(); $('admin-message').textContent='Connecting to access requests…'; return; }
        requests = snapshot.docs.map(d => ({...d.data(),uid:d.id})); renderRequests();
      },e => { if(myEpoch === epoch) fail(e); });
    } else closeAdmin();
    if (!isAdmin && userState !== 'approved') {
      closeDirectory();
      gate(userState === 'denied' ? 'Access not approved' : 'Awaiting approval',userState === 'denied'
        ? 'An administrator has denied or revoked your portal access. Contact your administrator if you need access.'
        : 'Your Google account has been submitted for review. This page will update automatically when an administrator approves your access.');
      return;
    }
    if (!directoryStop) {
      gate('Loading applications', 'Checking your approved workspace…');
      directoryStop = F.onSnapshot(F.doc(db,'portal','directory'),{includeMetadataChanges:true},snapshot => {
        if (myEpoch !== epoch) return;
        if (snapshot.metadata.fromCache) { gate('Connecting securely','Your access will be checked when the connection is restored.'); return; }
        if (!snapshot.exists()) { gate('Applications are not configured','Please contact the portal administrator to finish setup.'); return; }
        renderDirectory(snapshot.data()); show('gate',false); show('portal',true);
      },e => { if(myEpoch === epoch) fail(e); });
    }
  }
  A.onAuthStateChanged(auth, async nextUser => {
    const myEpoch = ++epoch;
    stop(userStop); stop(adminStop); closeDirectory(); closeAdmin();
    userState = null; adminState = null; user = nextUser; error('');
    show('account',Boolean(user)); show('google-sign-in',!user);
    $('account-email').textContent = user?.email || '';
    if (!user) { gate('Sign in to MGO Portal','Use your Google account to access municipal applications. First-time access requires administrator approval.'); return; }
    gate('Checking access','Please wait while we verify your Google account.');
    try {
      const token = await user.getIdTokenResult();
      if (myEpoch !== epoch) return;
      if (token.signInProvider !== 'google.com' || !user.emailVerified) { await A.signOut(auth); error('Please use a verified Google account.'); return; }
      const ref = F.doc(db,'users',user.uid);
      await F.runTransaction(db,async tx => {
        const existing = await tx.get(ref);
        if (!existing.exists()) tx.set(ref,{email:user.email,name:user.displayName || '',status:'pending',createdAt:F.serverTimestamp(),reviewedAt:null,reviewedBy:null});
      });
      if (myEpoch !== epoch) return;
      adminStop = F.onSnapshot(F.doc(db,'admins',user.uid),{includeMetadataChanges:true},snapshot => {
        if (myEpoch !== epoch) return;
        if (snapshot.metadata.fromCache) { adminState=null; closeDirectory(); closeAdmin(); gate('Connecting securely','Reconnecting to verify access…'); return; }
        adminState = snapshot.exists() && snapshot.data().enabled === true; reconcile(myEpoch);
      },e => {if(myEpoch === epoch) fail(e);});
      userStop = F.onSnapshot(ref,{includeMetadataChanges:true},snapshot => {
        if (myEpoch !== epoch) return;
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { userState=null; closeDirectory(); closeAdmin(); gate('Connecting securely','Reconnecting to verify access…'); return; }
        userState = snapshot.exists() ? snapshot.data().status : 'pending'; reconcile(myEpoch);
      },e => {if(myEpoch === epoch) fail(e);});
    } catch(e) { if(myEpoch === epoch) fail(e); }
  });
}
