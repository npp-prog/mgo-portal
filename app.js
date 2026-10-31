import { icons } from './icons.js';
const $ = id => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
// Older directories used ids that do not match an icon; fall back to the module code.
const iconAliases = { PMS:'property', PIMS:'property', IMS:'inventory', CBO:'accounting', DMS:'documents', TOSCAN:'toscan', ONLINE:'collections' };
const iconFor = m => icons[m.id] || icons[iconAliases[m.code]] || icons.documents; // Local, trusted SVG only.
const svg = {
  dashboard:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  external:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>'
};
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
let modules = [], groups = [];

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

// Mobile menu
function setMenu(open) {
  $('shell').classList.toggle('open', open);
  $('menu-button').setAttribute('aria-expanded', String(open));
  if (open) $('search').focus();
}
$('menu-button').onclick = () => setMenu(!$('shell').classList.contains('open'));
$('scrim').onclick = () => setMenu(false);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('shell').classList.contains('open')) { setMenu(false); $('menu-button').focus(); }
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); $('search').focus(); }
});

function moduleLink(m) {
  const a = el('a'); a.href = `#/m/${slug(m.code)}`; a.dataset.route = a.hash;
  a.insertAdjacentHTML('beforeend', iconFor(m));
  a.append(el('span', '', m.short || m.title), el('span', 'nav-code', m.code));
  return a;
}
function renderNav() {
  const query = $('search').value.trim().toLowerCase();
  const nav = $('nav'); nav.replaceChildren();
  if (!query) {
    const home = el('a'); home.href = '#/'; home.dataset.route = '#/';
    home.insertAdjacentHTML('beforeend', svg.dashboard); home.append(el('span', '', 'Dashboard'));
    nav.append(home);
  }
  let shown = 0;
  for (const group of groups) {
    const items = modules.filter(m => m.group === group
      && (!query || `${m.title} ${m.short || ''} ${m.code} ${m.description} ${group}`.toLowerCase().includes(query)));
    if (!items.length) continue;
    nav.append(el('div', 'nav-group', group));
    for (const m of items) nav.append(moduleLink(m));
    shown += items.length;
  }
  if (query && !shown) nav.append(el('p', 'nav-empty', 'No modules match your search.'));
  markCurrent();
}
function markCurrent() {
  // Department pages have no sidebar entry of their own, so nothing is marked.
  const route = location.hash.startsWith('#/m/') ? location.hash : location.hash.startsWith('#/d/') ? null : '#/';
  for (const a of $('nav').querySelectorAll('a')) {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}
$('search').oninput = renderNav;
$('search').onkeydown = e => {
  if (e.key !== 'Enter') return;
  const first = $('nav').querySelector('a[href^="#/m/"]');
  if (first) { location.hash = first.hash; $('search').value = ''; renderNav(); }
};

function setCrumbs(parts) {
  const list = $('crumbs'); list.replaceChildren();
  parts.forEach(([label, href], i) => {
    const li = el('li');
    if (i === parts.length - 1) { const span = el('span', '', label); span.setAttribute('aria-current', 'page'); li.append(span); }
    else { const a = el('a', '', label); a.href = href; li.append(a); }
    list.append(li);
  });
}
function tile(m) {
  const a = el('a', 'tile'); a.href = `#/m/${slug(m.code)}`;
  const icon = el('span', 'tile-icon'); icon.innerHTML = iconFor(m);
  const body = el('div', 'tile-body'), head = el('div', 'tile-title');
  head.append(el('h3', '', m.title), el('span', 'code', m.code));
  body.append(head);
  if (m.description) body.append(el('p', '', m.description));
  a.append(icon, body);
  return a;
}
function department(title, items, countHref) {
  const section = el('section', 'dept'); section.setAttribute('aria-labelledby', `dept-${slug(title)}`);
  const head = el('div', 'dept-head'), h2 = el('h2', '', title); h2.id = `dept-${slug(title)}`;
  head.append(h2);
  if (countHref) {
    const count = el('span'), link = el('a', '', `${items.length} module${items.length === 1 ? '' : 's'}`);
    link.href = countHref; count.append(link); head.append(count);
  }
  const grid = el('div', 'grid'); items.forEach(m => grid.append(tile(m)));
  section.append(head, grid);
  return section;
}
function pageHead(eyebrow, title, lead) {
  const head = el('div', 'page-head');
  if (eyebrow) head.append(el('p', 'eyebrow', eyebrow));
  head.append(el('h1', '', title));
  if (lead) head.append(el('p', 'lead', lead));
  return head;
}

function showDashboard() {
  const date = new Date().toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const nodes = [pageHead(date, 'Dashboard', 'All municipal systems, organized by department. Select a module to see its details and open it.')];
  for (const group of groups) {
    const items = modules.filter(m => m.group === group);
    if (items.length) nodes.push(department(group, items, `#/d/${slug(group)}`));
  }
  setCrumbs([['Dashboard']]);
  document.title = 'Dashboard · MGO ERP';
  return nodes;
}
function showDepartment(group) {
  const items = modules.filter(m => m.group === group);
  setCrumbs([['Dashboard', '#/'], [group]]);
  document.title = `${group} · MGO ERP`;
  const grid = el('div', 'grid'); items.forEach(m => grid.append(tile(m)));
  return [pageHead('Department', group, `${items.length} module${items.length === 1 ? '' : 's'}`), grid];
}
function showModule(m) {
  setCrumbs([['Dashboard', '#/'], [m.group, `#/d/${slug(m.group)}`], [m.code]]);
  document.title = `${m.code} · MGO ERP`;
  const url = new URL(m.url);
  const card = el('article', 'module');
  const top = el('div', 'module-top');
  const icon = el('span', 'hero-icon'); icon.innerHTML = iconFor(m);
  const text = el('div');
  text.append(el('p', 'eyebrow', `${m.group} · ${m.code}`), el('h1', '', m.title));
  if (m.description) text.append(el('p', 'lead', m.description));
  top.append(icon, text);
  const actions = el('div', 'actions');
  const open = el('a', 'button primary'); open.href = url.href; open.target = '_blank'; open.rel = 'noopener noreferrer';
  open.append(`Open ${m.code}`); open.insertAdjacentHTML('beforeend', svg.external);
  open.setAttribute('aria-label', `Open ${m.title} in a new tab`);
  const back = el('a', 'button ghost'); back.href = '#/';
  back.insertAdjacentHTML('beforeend', svg.back); back.append('Dashboard');
  actions.append(open, back);
  const facts = el('dl', 'facts');
  for (const [label, value] of [['Department', m.group], ['Address', url.hostname], ['Sign-in', 'Uses its own account'], ['Opens in', 'A new browser tab']]) {
    const row = el('div'); row.append(el('dt', '', label), el('dd', '', value)); facts.append(row);
  }
  card.append(top, actions, facts);
  const nodes = [card];
  const related = modules.filter(x => x.group === m.group && x !== m);
  if (related.length) {
    const section = department(`More in ${m.group}`, related); section.classList.add('related');
    nodes.push(section);
  }
  return nodes;
}

function route(moveFocus) {
  const hash = location.hash;
  const mod = hash.startsWith('#/m/') && modules.find(m => slug(m.code) === hash.slice(4));
  const dept = hash.startsWith('#/d/') && groups.find(g => slug(g) === hash.slice(4));
  const nodes = mod ? showModule(mod) : dept ? showDepartment(dept) : showDashboard();
  $('main').replaceChildren(...nodes);
  markCurrent(); setMenu(false);
  if (moveFocus) { $('main').focus({ preventScroll:true }); scrollTo(0, 0); }
}

try {
  const response = await fetch('./directory.json', { cache:'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  modules = (data.modules || []).filter(m => { try { return new URL(m.url).protocol === 'https:'; } catch { return false; } })
    .map(m => ({ ...m, group: m.group || 'Other' }));
  groups = [...new Set([...(data.groups || []), ...modules.map(m => m.group)])];
  renderNav(); route(false);
  addEventListener('hashchange', () => route(true));
} catch {
  const message = el('p', 'error', 'The module list could not be loaded. Check your internet connection and reload this page.');
  message.setAttribute('role', 'alert');
  $('main').replaceChildren(message);
}
