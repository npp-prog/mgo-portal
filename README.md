# MGO Portal — Google sign-in and administrator approval

Light-blue municipal application launcher. No sidebar. Uses the supplied Candoni seal in the header, login screen and browser tab. An SVG wrapper clips the original JPEG to its outer circular boundary, so the surrounding white corners are transparent; the original seal artwork and interior white areas are preserved.

## Included workflow

1. Staff choose **Continue with Google**.
2. On first sign-in, Firestore creates their own `users/{uid}` request with `status: pending`.
3. Pending users see **Awaiting approval**. Denied users see **Access not approved**.
4. An administrator opens **Access approvals** on the portal page and chooses **Approve** or **Deny**. No approval emails or external approval links are used.
5. Approved users can load the application directory. Administrators can use **Revoke access** to deny an approved account. Live listeners update an open page after changes.

The administrator can filter pending, approved and denied requests. The latest decision records the review time and administrator UID. Concurrent changes are checked with a transaction. This is latest-decision metadata, not a complete historical audit log.

## Upgrade from the previous package

1. Replace your GitHub repository files with this package, including `index.html`, `app.js` and `directory.json`.
2. In Firebase project `mgo-portal`, open Firestore → Rules, paste the entire updated `firestore.rules`, then click Publish. Uploading rules to GitHub does not publish them to Firebase.
3. Reload the deployed portal (Ctrl+Shift+R). As administrator, click **Set up applications** once.
4. Your own account is excluded from the pending list. Other users' requests have **Approve** and **Deny** buttons after their first Google sign-in.

## Required setup — complete before staff use

The public web configuration for Firebase project `mgo-portal` is already filled in from your supplied screenshot. The designated first administrator is **npp@mgocandoniaccounting.org**; the live administrator record has not yet been created. Google provider settings, authorized domains, Firestore rules, the directory and the administrator record still need to be configured in the live Firebase project. Use a dedicated Firebase project for this portal; the supplied rules deny all unrelated collections, so do not overwrite an existing application's rules without merging and reviewing them.

### 1. Firebase project and Google provider

- Open your existing Firebase project **mgo-portal** and its registered **mgo-portal** Web app.
- The public Firebase web configuration is already entered in `firebase-config.js`; compare it with the console if troubleshooting sign-in. `apiKey`, `authDomain`, `projectId` and `appId` are required by this package. The web configuration is intended to be public; never put a service-account/private key in the website.
- In Authentication, enable **Google** as the only sign-in provider and choose the project support email. Disable other providers for this dedicated project.
- In Authentication settings, add the portal's exact hostname to **Authorized domains**, for example `npp-prog.github.io` and your custom domain if used. Add `localhost` separately for local testing. Enter hostnames without a path or `https://`.
- Create the default Cloud Firestore database in production mode.
- Paste the contents of `firestore.rules` into Firestore's Rules tab and publish. These rules are REQUIRED; hiding the portal UI alone does not secure access.

### 2. Publish the static website

Upload the project files to the root of your `mgo-portal` GitHub repository. Enable GitHub Pages under **Settings → Pages → Deploy from a branch → main → / (root)**.

Keep `index.html`, `app.js`, `icons.js`, `firebase-config.js` and `candoni-seal.svg` together. No frontend build is needed. Firebase modules load from Google's CDN. A public repository also exposes the directory seed URLs; URLs are not secrets.

Open the published HTTPS website and sign in with **npp@mgocandoniaccounting.org** using Google. This first sign-in creates a pending request. No user becomes an administrator automatically.

Local preview must use HTTP, not a `file://` URL: run `python -m http.server 8000` in this directory and open `http://localhost:8000` after authorizing localhost.

### 3. Bootstrap the first administrator and directory

**Console-only option:**

1. In Firebase Authentication → Users, find **npp@mgocandoniaccounting.org** and copy that account’s UID. Verify the exact email before proceeding.
2. In Firestore, create collection `admins`, document ID equal to that UID, with a boolean field `enabled` set to `true`.
3. Reload the portal and click **Set up applications**. This creates `portal/directory` with the four supplied applications, including **Accounting Books Online**. Only an authenticated administrator can perform this first-time setup; existing directory data is never overwritten. Publish the UPDATED `firestore.rules` before clicking this button.
4. Reload the portal. That administrator can now approve or deny ordinary staff from the application page. The administrator's own user request can remain pending in Firestore: administrator authorization is independent of that status. The portal excludes your own account from the review queue.

**Script option for a project operator:**

- Install Node.js 22 or newer and run `npm install` in this folder.
- Authenticate locally with Google Application Default Credentials for an operator with appropriate Firebase Authentication and Firestore permissions, for example using `gcloud auth application-default login` with your own authorized project account. Alternatively point `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON stored OUTSIDE the repository.
- Run `npm run bootstrap` with no arguments. It targets project `mgo-portal` and resolves **npp@mgocandoniaccounting.org** to its Firebase UID automatically. That account must already have signed in to the portal once.
- The script verifies the exact administrator email, matching Google provider email, verified email and enabled account, creates the administrator record, and writes the four directory entries. Running it again overwrites the directory with the current `directory.json` values.
- Do not upload service-account credentials, `.env` files, `node_modules`, or debug logs to GitHub.

Administrator roles are deliberately not editable through the browser. Only a trusted Firebase project operator can provision/remove administrators. To revoke an administrator, remove their `admins/{uid}` document and set their `users/{uid}` status to `denied` through the trusted console as well if they were also approved as an ordinary user. Requests for another administrator cannot be changed by client code.

### 4. Verify before rollout

Use two separate Google accounts and a private browser window:

- New staff account → pending; application cards are unavailable.
- Administrator → open Access approvals, approve staff; staff page receives the directory.
- Administrator → deny/revoke staff; staff directory closes.
- Denied staff → sign out/in; access remains denied and the request is not reset.
- Non-administrator → cannot see the list of requests or change their status.
- Sign out → application cards disappear.

For automated Firestore rules tests, install dependencies plus Java 21 or newer, then run `npm run test:rules`. It runs against project `demo-mgo-portal` in the local emulator and does not use production data. Tests cover Google-only access, request ownership, self-approval prevention, directory permissions, admin decisions, forged review data, denied-user reset attempts and admin revocation.

## Security boundary

Firestore rules, not the client UI, enforce the pending/approved/admin permissions. The client requests the directory only after verified approval. A first Google sign-in DOES create a Firebase Authentication account; approval controls portal authorization, not the creation of that identity.

The GitHub Pages HTML, scripts, seal and seed file are public static files. Public module URLs may be read from source, bookmarked, or opened directly. This portal cannot revoke access granted separately by PMS, IMS, Accounting Books Online or DMS. Each linked system must enforce its own authentication and authorization. This package does not add cross-system single sign-on or modify those systems.

The portal uses session-scoped authentication persistence and Firestore's in-memory cache. It fails closed when verified access cannot be loaded. Revocation is enforced on subsequent Firestore requests and reflected by live listeners; already viewed information or an already opened external application cannot be retracted by this portal.

## Edit applications

Change the trusted `portal/directory` document in Firestore to change live links/titles; do not insert credentials in URLs. `directory.json` is the bootstrap seed, not the live data source. If adding a new module ID, add an icon in `icons.js` or it will use the document icon. The UI renders text safely and accepts HTTPS links only.

## Official references

- Google authentication: https://firebase.google.com/docs/auth/web/google-signin
- Firebase CDN setup: https://firebase.google.com/docs/web/alt-setup
- Firestore authorization: https://firebase.google.com/docs/firestore/security/rules-conditions
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Validation status for this delivery

- JavaScript syntax checks passed.
- Eight Firestore emulator tests passed, including self-approval prevention, denied access, administrator review, revocation, and admin-only application setup. The test run used Firebase CLI 14.22.0 with the available Java 17 runtime; the packaged CLI 15 requires Java 21 or newer for future runs.
- Actual Chromium checks passed for the login screen at 1440px, 390px and 320px widths; the seal loaded, there were no JavaScript errors, and protected sections stayed hidden. Directory layout was separately checked with fixture content at desktop/tablet/phone widths.
- The supplied public Firebase configuration has passed syntax and field consistency checks. Live Firebase project settings, Google OAuth and end-to-end login remain unverified. No live Firebase rules or administrator records have been deployed by this delivery.

- Chromium checks with mocked Firebase passed for first-time application setup, hiding the administrator’s own request, showing staff Approve/Deny controls, and approving a pending request. Desktop and mobile layouts had no horizontal overflow.
