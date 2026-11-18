// =============================================================================
// SHELL GLOBAL - DOCTOR PYME
// Sidebar agrupada, Tenant Switcher (nombre + NIT), breadcrumbs, menú de acciones,
// drawer y Bottom Navigation móvil. Solo presentación: no toca lógica de negocio,
// roles ni aislamiento multitenant (todo se lee de store/auth y se delega en
// window.cambiarEmpresaActiva, que conserva las reglas existentes).
// =============================================================================
import { store } from './store.js';
import { auth } from './auth.js';

const ICONS = {
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  calendarCheck: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  cap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clipboardCheck: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  listChecks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  pulse: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevrons: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'
};

function svg(name, cls = '') {
  return `<svg ${cls ? `class="${cls}" ` : ''}viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Mapa de navegación: una sola fuente para sidebar, breadcrumbs y drawer móvil
const NAV_GROUPS = [
  { id: 'inicio', label: null, items: [
    { href: '#dashboard', title: 'Panel principal', icon: 'dashboard' }
  ] },
  { id: 'empresa', label: 'Empresa', items: [
    { href: '#empresas', title: 'Perfil de empresa', icon: 'building' },
    { href: '#procesos', title: 'Procesos y cargos', icon: 'network' },
    { href: '#herramientas', title: 'Herramientas y equipos', icon: 'wrench' },
    { href: '#mantenimiento', title: 'Mantenimiento', icon: 'calendarCheck' },
    { href: '#capacitaciones', title: 'Formación', icon: 'cap' }
  ] },
  { id: 'personas', label: 'Personas', items: [
    { href: '#portal-trabajador', title: 'Trabajadores y firmas', icon: 'user' },
    { href: '#copasst-ccl', title: 'COPASST y CCL', icon: 'users' }
  ] },
  { id: 'sgsst', label: 'SG-SST', items: [
    { href: '#evaluacion', title: 'Estándares mínimos', icon: 'clipboardCheck' },
    { href: '#matriz', title: 'Matriz de riesgos', icon: 'alert' },
    { href: '#plan-trabajo', title: 'Plan anual de trabajo', icon: 'listChecks' },
    { href: '#presupuesto', title: 'Presupuesto', icon: 'wallet' },
    { href: '#accidentes', title: 'Registro de ATEL', icon: 'pulse' }
  ] },
  { id: 'docs', label: 'Documentos y auditoría', items: [
    { href: '#documentos', title: 'Gestión documental', icon: 'file' },
    { href: '#reportes', title: 'Informes', icon: 'chart' },
    { href: '#auditoria-sst', title: 'Vista auditor', icon: 'shield' },
    { href: '#repositorio-legal', title: 'Repositorio legal', icon: 'scale' }
  ] },
  { id: 'admin', label: 'Administración', labelId: 'sidebar-superadmin-group', items: [
    { href: '#repositorio-base', id: 'sidebar-link-repositorio-base', title: 'Repositorio base Res. 0312', icon: 'archive' },
    { href: '#super-admins', id: 'sidebar-link-superadmins', title: 'Consultores y accesos', icon: 'key' },
    { href: './landing.html', title: 'Sitio web', icon: 'globe', external: true }
  ] }
];

let shellBound = false;

function currentHash() {
  return window.location.hash || '#dashboard';
}

function findRoute(hash) {
  for (const g of NAV_GROUPS) {
    const it = g.items.find((i) => i.href === hash);
    if (it) return { group: g, item: it };
  }
  return null;
}

function renderNav() {
  const nav = document.getElementById('shell-nav');
  if (!nav) return;
  nav.innerHTML = NAV_GROUPS.map((g) => `
    ${g.label ? `<div ${g.labelId ? `id="${g.labelId}"` : ''} class="sidebar-category">${esc(g.label)}</div>` : ''}
    ${g.items.map((i) => `
      <a ${i.id ? `id="${i.id}"` : ''} href="${i.href}" ${i.external ? 'target="_blank" rel="noopener"' : ''} data-title="${esc(i.title)}" class="nav-link">
        ${svg(i.icon)}
        <span class="sidebar-text truncate">${esc(i.title)}</span>
        ${i.external ? svg('external', 'ext') : ''}
      </a>`).join('')}
  `).join('');
}

// ---------------------------------------------------------------- Breadcrumbs
function renderCrumbs(hash) {
  const el = document.getElementById('shell-crumbs');
  if (!el) return;
  const found = findRoute(hash);
  const empresa = store.getEmpresaActiva ? store.getEmpresaActiva() : null;
  const parts = [];
  if (empresa && empresa.razonSocial) parts.push(`<span class="hide-mobile">${esc(empresa.razonSocial)}</span><span class="sep hide-mobile">/</span>`);
  if (found && found.group.label) parts.push(`<span class="hide-mobile">${esc(found.group.label)}</span><span class="sep hide-mobile">/</span>`);
  parts.push(`<strong>${esc(found ? found.item.title : 'Panel principal')}</strong>`);
  el.innerHTML = parts.join('');
}

// ------------------------------------------------------------ Tenant switcher
function modeLabel() {
  if (auth.isSuperAdmin()) return 'Super administrador';
  if (auth.isConsultor && auth.isConsultor()) return 'Consultor multiempresa';
  return 'Administrador de empresa';
}

function initials(name) {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
}

function recentKey() {
  const u = auth.getUser ? auth.getUser() : null;
  return `DP_RECENT_TENANTS_${(u && (u.email || u.user_id)) || 'anon'}`;
}

function getRecents() {
  try { return JSON.parse(localStorage.getItem(recentKey()) || '[]'); } catch { return []; }
}

function pushRecent(id) {
  if (!id || id === 'todas') return;
  const next = [id, ...getRecents().filter((r) => r !== id)].slice(0, 5);
  try { localStorage.setItem(recentKey(), JSON.stringify(next)); } catch { /* sin almacenamiento */ }
}

function fmtNit(nit) {
  return nit ? String(nit) : 'Sin NIT';
}

function renderTenantSwitcher() {
  const wrap = document.getElementById('tenant-switcher');
  if (!wrap) return;
  const esSuper = auth.isSuperAdmin();
  const esConsultor = auth.isConsultor ? auth.isConsultor() : false;
  const empresas = store.getEmpresas();
  const activaId = store.getEmpresaActivaId();
  const activa = empresas.find((e) => e.id === activaId) || null;
  const canSwitch = esSuper || (esConsultor && empresas.length > 1);

  const name = activa ? activa.razonSocial : (esSuper ? 'Todas las empresas' : (empresas[0]?.razonSocial || 'Sin empresa asignada'));
  const sub = activa ? `NIT ${fmtNit(activa.nit)}` : (esSuper ? `${empresas.length} empresas · panel global` : '');
  const chipName = document.getElementById('shell-tenant-chip-name');
  if (chipName) chipName.textContent = name;
  const chip = document.getElementById('shell-tenant-chip');
  if (chip) chip.classList.toggle('hidden', !canSwitch);

  wrap.innerHTML = `
    <button type="button" id="tenant-btn" class="tenant-btn" ${canSwitch ? 'aria-haspopup="listbox" aria-expanded="false"' : 'disabled'} aria-label="Empresa activa: ${esc(name)}">
      <span class="tenant-avatar" aria-hidden="true">${esc(activa || !esSuper ? initials(name) : 'TE')}</span>
      <span class="tenant-meta">
        <span class="tenant-name" style="display:block">${esc(name)}</span>
        <span class="tenant-sub nit" style="display:block">${esc(sub)}</span>
      </span>
      ${canSwitch ? svg('chevrons', 'tenant-chevron') : ''}
    </button>
    <div class="tenant-mode sidebar-text">${esc(modeLabel())}</div>
    <div id="tenant-pop" class="tenant-pop" role="dialog" aria-label="Cambiar de empresa"></div>
  `;

  if (canSwitch) {
    wrap.querySelector('#tenant-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTenantPop();
    });
  }
}

function tenantItemHtml(e, activaId) {
  const sel = e.id === activaId;
  return `
    <button type="button" class="tenant-item" role="option" aria-selected="${sel}" data-id="${esc(e.id)}">
      <span class="tenant-avatar" aria-hidden="true">${esc(initials(e.razonSocial))}</span>
      <span class="tenant-meta">
        <span class="tenant-name" style="display:block">${esc(e.razonSocial)}</span>
        <span class="tenant-sub nit" style="display:block">NIT ${esc(fmtNit(e.nit))}</span>
      </span>
      ${sel ? svg('check', 'check') : ''}
    </button>`;
}

function fillTenantList(filter = '') {
  const list = document.getElementById('tenant-list');
  if (!list) return;
  const esSuper = auth.isSuperAdmin();
  const empresas = store.getEmpresas();
  const activaId = store.getEmpresaActivaId();
  const q = filter.trim().toLowerCase().replace(/[.\s-]/g, '');
  const match = (e) => !q ||
    String(e.razonSocial || '').toLowerCase().replace(/[.\s-]/g, '').includes(q) ||
    String(e.nit || '').toLowerCase().replace(/[.\s-]/g, '').includes(q);

  const recents = getRecents().map((id) => empresas.find((e) => e.id === id)).filter(Boolean);
  const filtered = empresas.filter(match);
  let html = '';

  if (esSuper && !q) {
    html += `
      <button type="button" class="tenant-item" role="option" aria-selected="${activaId === 'todas'}" data-id="todas">
        <span class="tenant-avatar" aria-hidden="true">TE</span>
        <span class="tenant-meta">
          <span class="tenant-name" style="display:block">Todas las empresas</span>
          <span class="tenant-sub" style="display:block">Panel global</span>
        </span>
        ${activaId === 'todas' ? svg('check', 'check') : ''}
      </button>`;
  }
  if (!q && recents.length && empresas.length > 6) {
    html += `<div class="tenant-group-label">Recientes</div>${recents.map((e) => tenantItemHtml(e, activaId)).join('')}`;
    html += `<div class="tenant-group-label">Todas</div>`;
  }
  html += filtered.map((e) => tenantItemHtml(e, activaId)).join('');
  if (!filtered.length) html = `<div class="tenant-empty">Ninguna empresa coincide con “${esc(filter)}”.</div>`;
  list.innerHTML = html;

  list.querySelectorAll('.tenant-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      closeTenantPop();
      pushRecent(id);
      if (typeof window.cambiarEmpresaActiva === 'function') window.cambiarEmpresaActiva(id);
    });
  });
}

function toggleTenantPop(forceOpen) {
  const pop = document.getElementById('tenant-pop');
  const btn = document.getElementById('tenant-btn');
  if (!pop || !btn) return;
  const open = forceOpen !== undefined ? forceOpen : !pop.classList.contains('is-open');
  if (!open) { closeTenantPop(); return; }
  const empresas = store.getEmpresas();
  pop.innerHTML = `
    <div class="tenant-search">
      ${svg('search')}
      <input id="tenant-search-input" type="search" autocomplete="off" placeholder="Buscar por nombre o NIT" aria-label="Buscar empresa por nombre o NIT">
    </div>
    <div id="tenant-list" class="tenant-list" role="listbox" aria-label="Empresas"></div>
    <div class="tenant-group-label" style="border-top:1px solid var(--border)">${esc(modeLabel())} · ${empresas.length} ${empresas.length === 1 ? 'empresa' : 'empresas'}</div>
  `;
  pop.classList.add('is-open');
  btn.setAttribute('aria-expanded', 'true');
  fillTenantList('');
  const input = document.getElementById('tenant-search-input');
  if (input) {
    input.focus();
    input.addEventListener('input', () => fillTenantList(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        document.querySelector('#tenant-list .tenant-item')?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        document.querySelector('#tenant-list .tenant-item')?.click();
      }
    });
  }
}

function closeTenantPop() {
  const pop = document.getElementById('tenant-pop');
  const btn = document.getElementById('tenant-btn');
  if (pop) pop.classList.remove('is-open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

// --------------------------------------------------------------- Bottom nav
function renderBottomNav(hash) {
  const bar = document.getElementById('shell-bottom-nav');
  if (!bar) return;
  const gestor = auth.isSuperAdmin() || (auth.isConsultor && auth.isConsultor());
  const items = [
    { href: '#dashboard', label: 'Inicio', icon: 'dashboard' },
    gestor
      ? { href: '#empresas', label: 'Empresas', icon: 'building' }
      : { href: '#plan-trabajo', label: 'Plan', icon: 'listChecks' },
    { href: '#portal-trabajador', label: 'Personas', icon: 'user' }
  ];
  bar.innerHTML = items.map((i) => `
    <a href="${i.href}" ${hash === i.href ? 'aria-current="page"' : ''}>${svg(i.icon)}<span>${esc(i.label)}</span></a>
  `).join('') + `
    <button type="button" id="bottom-nav-more" aria-label="Abrir menú completo" aria-controls="app-sidebar">${svg('ellipsis')}<span>Más</span></button>
  `;
  bar.querySelector('#bottom-nav-more').addEventListener('click', () => openDrawer());
}

// -------------------------------------------------------------------- Drawer
function openDrawer(openTenant = false) {
  document.getElementById('app-sidebar')?.classList.add('is-open');
  document.getElementById('shell-scrim')?.classList.add('is-open');
  document.getElementById('shell-menu-btn')?.setAttribute('aria-expanded', 'true');
  if (openTenant) setTimeout(() => toggleTenantPop(true), 0);
}

function closeDrawer() {
  document.getElementById('app-sidebar')?.classList.remove('is-open');
  document.getElementById('shell-scrim')?.classList.remove('is-open');
  document.getElementById('shell-menu-btn')?.setAttribute('aria-expanded', 'false');
}

// ----------------------------------------------------------- Menú de acciones
function closeActionsMenu() {
  document.getElementById('shell-actions-menu')?.classList.remove('is-open');
  document.getElementById('shell-actions-btn')?.setAttribute('aria-expanded', 'false');
}

function bindOnce() {
  if (shellBound) return;
  shellBound = true;

  const actionsBtn = document.getElementById('shell-actions-btn');
  const actionsMenu = document.getElementById('shell-actions-menu');
  actionsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !actionsMenu.classList.contains('is-open');
    closeTenantPop();
    actionsMenu.classList.toggle('is-open', open);
    actionsBtn.setAttribute('aria-expanded', String(open));
  });
  actionsMenu?.addEventListener('click', () => closeActionsMenu());

  document.getElementById('shell-menu-btn')?.addEventListener('click', () => openDrawer());
  document.getElementById('shell-tenant-chip')?.addEventListener('click', () => openDrawer(true));
  document.getElementById('shell-scrim')?.addEventListener('click', closeDrawer);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#tenant-switcher')) closeTenantPop();
    if (!e.target.closest('.menu-wrap')) closeActionsMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTenantPop();
      closeActionsMenu();
      closeDrawer();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      const btn = document.getElementById('tenant-btn');
      if (btn && !btn.disabled) {
        e.preventDefault();
        if (window.matchMedia('(max-width: 767px)').matches) openDrawer(true);
        else toggleTenantPop(true);
      }
    }
  });
  document.getElementById('shell-nav')?.addEventListener('click', (e) => {
    if (e.target.closest('a.nav-link') && window.matchMedia('(max-width: 767px)').matches) closeDrawer();
  });
}

// Llamado por app.js tras cada cambio de ruta
function shellOnRoute(hash) {
  const h = hash || currentHash();
  document.querySelectorAll('#shell-nav a.nav-link').forEach((a) => {
    if (a.getAttribute('href') === h) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  renderCrumbs(h);
  renderBottomNav(h);
  closeDrawer();
}

export function initShell() {
  renderNav();
  bindOnce();
  renderTenantSwitcher();
  shellOnRoute(currentHash());
}

window.renderTenantSwitcher = renderTenantSwitcher;
window.shellOnRoute = shellOnRoute;
