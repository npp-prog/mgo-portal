import { icons } from './icons.js';
const $ = id => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
// Older directories used ids that do not match an icon; fall back to the module code.
const iconAliases = { PMS:'property', PIMS:'property', IMS:'inventory', CBO:'accounting', DMS:'documents', TOSCAN:'toscan', ONLINE:'collections', WEB:'website', BETTER:'bettercandoni' };
const iconFor = m => icons[m.id] || icons[iconAliases[m.code]] || icons.documents; // Local, trusted SVG only.
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
let modules = [], groups = [], group = null;

// Night mode: the visitor's choice is remembered; without one, the device setting applies.
const themeButton = $('theme-toggle');
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (document.documentElement.dataset.theme || (systemDark.matches ? 'dark' : 'light')) === 'dark';
function syncThemeButton() {
  const label = isDark() ? 'Switch to day mode' : 'Switch to night mode';
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

const now = new Date(), hour = now.getHours();
$('today').textContent = `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'} · ${now.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' })}`;

// Text with every match of the query wrapped in <mark>, built without innerHTML.
function highlight(text, query) {
  const out = document.createDocumentFragment();
  if (!query) { out.append(text); return out; }
  const lower = text.toLowerCase();
  let from = 0, at;
  while ((at = lower.indexOf(query, from)) !== -1) {
    out.append(text.slice(from, at), el('mark', '', text.slice(at, at + query.length)));
    from = at + query.length;
  }
  out.append(text.slice(from));
  return out;
}
const matches = (m, query) => !query || `${m.title} ${m.code} ${m.description} ${m.group}`.toLowerCase().includes(query);

function card(m, query, index) {
  const url = new URL(m.url);
  const a = el('a', 'app'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.title = [m.description, url.hostname].filter(Boolean).join(' · ');
  a.setAttribute('aria-describedby', 'new-tab'); a.style.setProperty('--i', index);
  const circle = el('span', 'circle');
  if (m.logo) {
    // Image logos are files in this repository; the label already names the system, so alt is empty.
    const img = el('img'); img.src = m.logo; img.alt = ''; img.width = img.height = 64; img.loading = 'lazy';
    img.onerror = () => { circle.innerHTML = iconFor(m); };
    circle.classList.add('has-logo'); circle.append(img);
  } else circle.innerHTML = iconFor(m);
  const label = el('span', 'label'); label.append(highlight(m.title, query));
  const sub = el('span', 'sub'); sub.append(highlight(`${m.group} · ${m.code}`, query));
  a.append(circle, label, sub);
  if (m.description) a.append(el('span', 'visually-hidden', `. ${m.description}`));
  return a;
}

function renderChips(query) {
  const list = $('chips'); list.replaceChildren();
  for (const name of [null, ...groups]) {
    const count = modules.filter(m => (!name || m.group === name) && matches(m, query)).length;
    const li = el('li'), chip = el('button', 'chip');
    chip.type = 'button'; chip.setAttribute('aria-pressed', String(group === name));
    chip.append(name || 'All', el('span', 'n', count));
    chip.onclick = () => { group = name; history.replaceState(null, '', name ? `#${slug(name)}` : location.pathname + location.search); render(); };
    li.append(chip); list.append(li);
  }
}

function render() {
  const query = $('search').value.trim().toLowerCase();
  $('clear').hidden = !query; $('search-hint').hidden = Boolean(query);
  renderChips(query);
  const shown = modules.filter(m => (!group || m.group === group) && matches(m, query));
  const apps = $('apps');
  if (!shown.length) {
    const empty = el('div', 'empty');
    empty.append(el('p', '', query ? `No systems match “${$('search').value.trim()}”${group ? ` in ${group}` : ''}.` : 'No systems in this department.'));
    const reset = el('button', '', 'Show all systems'); reset.type = 'button';
    reset.onclick = () => { $('search').value = ''; group = null; history.replaceState(null, '', location.pathname + location.search); render(); $('search').focus(); };
    empty.append(reset); apps.replaceChildren(empty);
  } else {
    apps.replaceChildren(...shown.map((m, i) => card(m, query, i)));
    if (query) apps.firstElementChild.classList.add('first');
  }
  $('enter-tip').hidden = !(query && shown.length);
  $('results').textContent = shown.length ? `${shown.length} system${shown.length === 1 ? '' : 's'} shown` : 'No systems match';
}

$('search').oninput = render;
$('search').onkeydown = e => {
  if (e.key === 'Enter') {
    const first = $('apps').querySelector('.app');
    if (first) { e.preventDefault(); window.open(first.href, '_blank', 'noopener'); }
  } else if (e.key === 'Escape') {
    if ($('search').value) { $('search').value = ''; render(); } else $('search').blur();
  }
};
$('clear').onclick = () => { $('search').value = ''; render(); $('search').focus(); };
document.addEventListener('keydown', e => {
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
    e.preventDefault(); $('search').focus();
  }
});
try {
  const response = await fetch('./directory.json', { cache:'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  modules = (data.modules || []).filter(m => { try { return new URL(m.url).protocol === 'https:'; } catch { return false; } })
    // Logos must be relative paths to files in this repository.
    .map(m => ({ ...m, group: m.group || 'Other', logo: typeof m.logo === 'string' && /^[\w./-]+$/.test(m.logo) && !m.logo.includes('..') ? m.logo : undefined }));
  groups = [...new Set([...(data.groups || []), ...modules.map(m => m.group)])].filter(g => modules.some(m => m.group === g));
  const groupFromHash = () => groups.find(g => `#${slug(g)}` === location.hash) || null;
  group = groupFromHash(); render();
  addEventListener('hashchange', () => { group = groupFromHash(); render(); });
} catch {
  const message = el('p', 'error', 'The system list could not be loaded. Check your internet connection and reload this page.');
  message.setAttribute('role', 'alert');
  $('apps').replaceChildren(message);
}
