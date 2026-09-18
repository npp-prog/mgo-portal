# MGO Portal

A light ERP-style application launcher for the Municipal Government of Candoni. Plain HTML and CSS; no installation, JavaScript, API keys, external fonts or build step required. Works locally and on GitHub Pages, including repository subpaths.

## Publish on GitHub Pages

1. Create a GitHub repository named `mgo-portal` (public for GitHub Free).
2. Extract this ZIP. Upload `index.html`, `favicon.svg`, `.nojekyll` and this README to the repository root. Do not upload only the ZIP or nest the files inside another folder.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**, then **main** and **/ (root)**. Save.
5. Wait for deployment and open the address shown by GitHub Pages. For the `npp-prog` account it will normally be `https://npp-prog.github.io/mgo-portal/`.

To preview before uploading, open `index.html` in your browser.

## Included destinations

| System | Address |
| --- | --- |
| Property management | https://pms.mgocandoni.com/ |
| Inventory management | https://ims.mgocandoni.com/ |
| Accounting | https://abo.mgocandoni.com/ |
| Document management | https://uat.dms.egovsystemsph.com/ |

Destinations are the addresses supplied for this project. The DMS address includes `uat`; replace it with your production URL when appropriate. The portal does not check remote service availability and does not imply that any system is online.

## Add or edit systems

Edit `index.html`. Each system is one `<a class="app"> ... </a>` block inside `<div class="apps">`.

- Duplicate a complete card to add a system.
- Set its `href` to the full HTTPS address.
- Edit the system title, description, domain and number/code.
- Give the heading a unique `id` and match it in the card's `aria-labelledby`.
- Update `4 applications` to the new total.
- Keep `target="_blank"` and `rel="noopener noreferrer"` to open safely in a new tab.

Brand colors are in the CSS `:root` block. The page uses a white top header, pale-blue background and four application cards with no sidebar or navigation menu. The layout changes from four columns on desktop to two on tablets and one on phones. Keyboard focus, a skip link and reduced-motion preferences are supported.

## Scope

This is an application launcher, not an integrated ERP database or single sign-on service. Each linked application retains its own authentication, permissions and data. No credentials are collected or stored by this page. Hosting the portal does not host or modify the linked systems.

## Files

- `index.html` — complete portal and styles
- `favicon.svg` — simple M monogram; not an official municipal seal
- `.nojekyll` — static GitHub Pages marker
- `README.md` — setup and editing instructions
