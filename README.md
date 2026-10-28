# MGO Portal

Light-blue application launcher for the Municipal Government of Candoni. No sidebar and no sign-in: anyone who opens the page sees the municipal systems and can open them in a new tab. Each linked system handles its own sign-in and permissions.

The supplied Candoni seal appears in the header and browser tab. An SVG wrapper clips the original JPEG to its outer circular boundary, so the surrounding white corners are transparent.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout and styles, including dark mode. |
| `app.js` | Loads `directory.json` and builds the application cards. |
| `directory.json` | The list of applications shown on the page. |
| `icons.js` | Card icons, keyed by module `id`. |
| `candoni-seal.svg`, `favicon.svg` | Seal artwork. |

No build step or npm install is needed.

## Edit the applications

Edit `directory.json`, commit and push. GitHub Pages publishes the change within a few minutes; reload with Ctrl+Shift+R.

Each entry needs:

```json
{
  "id": "collections",
  "title": "Online collections",
  "description": "Online payments through GCash and LinkBiz.",
  "url": "https://online.mgocandoni.com/",
  "code": "ONLINE"
}
```

- `url` must start with `https://`; other links are skipped.
- `description` may be empty (`""`); the card then shows only the title.
- `id` picks the icon from `icons.js`. An unknown `id` uses the document icon; add an icon to `icons.js` for a new system.

Current systems: PIMS, CBO, DMS, TOSCAN, FTS and Online collections.

## Publish

Enable GitHub Pages under **Settings → Pages → Deploy from a branch → main → / (root)**. Keep all files together in the repository root.

Local preview must use HTTP, not a `file://` URL: run `python -m http.server 8000` in this folder and open `http://localhost:8000`.

## Security

The page, `directory.json` and every application address are public. The portal is only a set of links: it does not control who can use PIMS, CBO, DMS, TOSCAN, FTS or Online collections. Each of those systems must enforce its own sign-in and authorization.

Do not put passwords, tokens or other secrets in `directory.json` or anywhere in this repository.
