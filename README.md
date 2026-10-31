# MGO ERP

ERP-style front end for the Municipal Government of Candoni. A sidebar groups the municipal systems by department (Finance, Assets, Records, Programs); the dashboard lists them all, and each module has its own page with its details and an **Open** button. There is no sign-in: anyone can open the page. Each linked system keeps its own data, sign-in and permissions.

The supplied Candoni seal appears in the sidebar and browser tab. An SVG wrapper clips the original JPEG to its outer circular boundary, so the surrounding white corners are transparent.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell (sidebar, top bar) and styles, including night mode. |
| `app.js` | Loads `directory.json`; builds the sidebar, dashboard, department and module pages; search, mobile menu and night mode. |
| `directory.json` | Departments and modules shown in the ERP. |
| `icons.js` | Module icons, keyed by module `id`. |
| `candoni-seal.svg`, `favicon.svg` | Seal artwork. |

No build step or npm install is needed.

## Pages

| Address | Page |
| --- | --- |
| `#/` | Dashboard: every module, grouped by department. |
| `#/d/finance` | One department's modules. |
| `#/m/cbo` | One module's page (the code in lowercase). |

Press `/` to jump to the module search; Enter opens the first match.

## Night mode

The moon/sun button in the top bar switches between day and night mode. The visitor's choice is remembered in their browser; until they choose, the page follows their device's setting.

## Edit the modules

Edit `directory.json`, commit and push. GitHub Pages publishes the change within a few minutes; reload with Ctrl+Shift+R.

`groups` sets the order of the departments. Each module needs:

```json
{
  "id": "toscan",
  "group": "Programs",
  "title": "Ten Outstanding Students of Candoni",
  "short": "TOSCAN scholars",
  "description": "Portal for TOSCAN scholars.",
  "url": "https://toscan.mgocandoni.com/",
  "code": "TOSCAN"
}
```

- `group` is the department. A department not listed in `groups` is added at the end.
- `short` is optional: a shorter name for the sidebar when `title` is long.
- `url` must start with `https://`; other links are skipped.
- `description` may be empty (`""`).
- `id` picks the icon from `icons.js`. An unknown `id` uses the document icon; add an icon to `icons.js` for a new system.
- `code` must be unique; it forms the module's page address.

Current modules: CBO and Online collections (Finance), PIMS (Assets), DMS (Records), TOSCAN (Programs).

## Publish

Enable GitHub Pages under **Settings → Pages → Deploy from a branch → main → / (root)**. Keep all files together in the repository root.

Local preview must use HTTP, not a `file://` URL: run `python -m http.server 8000` in this folder and open `http://localhost:8000`.

## Security

The page, `directory.json` and every application address are public. The portal is only a set of links: it does not control who can use PIMS, CBO, DMS, TOSCAN or Online collections. Each of those systems must enforce its own sign-in and authorization.

Do not put passwords, tokens or other secrets in `directory.json` or anywhere in this repository.
