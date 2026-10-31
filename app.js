import { icons } from './icons.js';
const $ = id => document.getElementById(id);
// Older directories were seeded with non-matching ids; fall back to the module code.
const iconAliases = { PMS:'property', PIMS:'property', IMS:'inventory', CBO:'accounting', DMS:'documents', TOSCAN:'toscan', ONLINE:'collections' };
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

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
    icon.innerHTML = icons[module.id] || icons[iconAliases[module.code]] || icons.documents; // Local, trusted SVG only.
    const launch = document.createElement('span'); launch.className = 'launch';
    launch.innerHTML = arrow; // Local, trusted SVG only.
    top.append(icon, launch);
    const title = document.createElement('h2'); title.textContent = module.title;
    const desc = document.createElement('p'); desc.className = 'description'; desc.textContent = module.description; desc.hidden = !module.description;
    const meta = document.createElement('div'); meta.className = 'meta';
    const code = document.createElement('span'); code.className = 'code'; code.textContent = module.code;
    const domain = document.createElement('span'); domain.className = 'domain'; domain.textContent = domain.title = url.hostname;
    meta.append(code, domain); card.append(top, title, desc, meta); fragment.append(card);
  }
  $('apps').replaceChildren(fragment);
}

// Night mode: the visitor's choice is remembered; without one, the device setting applies.
const themeButton = $('theme-toggle');
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (document.documentElement.dataset.theme || (systemDark.matches ? 'dark' : 'light')) === 'dark';
function syncThemeButton() {
  const dark = isDark();
  const label = dark ? 'Switch to day mode' : 'Switch to night mode';
  themeButton.title = label; themeButton.setAttribute('aria-label', label);
}
themeButton.onclick = () => {
  const theme = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('mgo-theme', theme); } catch {}
  syncThemeButton();
};
systemDark.addEventListener('change', syncThemeButton);
syncThemeButton();

try {
  const response = await fetch('./directory.json', { cache:'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  renderDirectory(await response.json());
  $('status').hidden = true;
} catch {
  $('status').textContent = 'The application list could not be loaded. Check your internet connection and reload this page.';
  $('status').classList.add('error');
}
