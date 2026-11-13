import { store } from '../store.js';
import { auth } from '../auth.js';

const MASTER_SUPER_ADMIN_EMAIL = 'i.gonzalez.dsilva@gmail.com';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRolLabel(rol) {
  const r = String(rol || '').toUpperCase();
  if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN') return 'SUPER_ADMIN';
  if (r === 'CONSULTOR_SST' || r === 'CONSULTOR') return 'CONSULTOR_SST';
  if (r === 'ADMIN_PYME' || r === 'ADMINISTRADOR EMPRESA' || r === 'CLIENTE') return 'ADMIN_PYME';
  return r || 'CONSULTOR_SST';
}

function getRolBadgeStyle(rol) {
  const label = getRolLabel(rol);
  if (label === 'SUPER_ADMIN') {
    return 'background:rgba(79,70,229,0.12); color:#4338ca; border:1px solid rgba(79,70,229,0.25);';
  }
  if (label === 'CONSULTOR_SST') {
    return 'background:rgba(14,165,233,0.12); color:#0369a1; border:1px solid rgba(14,165,233,0.28);';
  }
  return 'background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.28);';
}

async function syncMembershipToBackend(userId, tenantIds) {
  try {
    const session = auth.getSession ? auth.getSession() : null;
    const token = session?.token || localStorage.getItem('sgsst_jwt_token') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch('/api/admin/memberships', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        tenant_ids: tenantIds
      })
    });
  } catch (e) {
    console.warn('No se pudo sincronizar membresías con el servidor:', e);
  }
}

export function renderSuperAdmins(container) {
  if (!auth.isSuperAdmin()) {
    container.innerHTML = `
      <div class="card" style="padding:2rem; text-align:center;">
        <div style="font-size:2rem; margin-bottom:0.5rem;">🔒</div>
        <h3 style="margin:0 0 0.5rem; color:#0f172a;">Acceso Restringido</h3>
        <p style="margin:0; color:#64748b; font-size:0.9rem;">
          Este módulo de Gestión de Consultores SST y Accesos Empresariales es exclusivo del Super Administrador Único de la plataforma.
        </p>
      </div>
    `;
    return;
  }

  const allSuperAdmins = (store.getSuperAdmins ? store.getSuperAdmins() : []).filter(
    (a) => String(a.email || '').trim().toLowerCase() === MASTER_SUPER_ADMIN_EMAIL
  );
  const masterAdmin = allSuperAdmins[0] || {
    id: 'sa-001',
    nombre: 'Iván Darío González (Master)',
    email: MASTER_SUPER_ADMIN_EMAIL,
    rol: 'SUPER_ADMIN',
    activo: true,
    isMaster: true
  };

  const consultoresYUsuarios = (store.getConsultoresYUsuarios ? store.getConsultoresYUsuarios() : []).filter(
    (u) => String(u.email || '').trim().toLowerCase() !== MASTER_SUPER_ADMIN_EMAIL
  );
  const empresas = store.getAllEmpresasRaw ? store.getAllEmpresasRaw() : store.getEmpresas();

  const renderUsuarioRow = (u) => {
    const isActivo = u.activo !== false && String(u.estado || 'ACTIVO').toUpperCase() !== 'INACTIVO';
    const rolLabel = getRolLabel(u.role || u.rol);
    const memberships = store.getUserTenantMemberships ? store.getUserTenantMemberships(u.id) : [];
    const activeMemberships = memberships.filter((m) => m.is_active !== false && m.activo !== false);
    const assignedNames = activeMemberships
      .map((m) => {
        const emp = empresas.find((e) => e.id === m.tenant_id);
        return emp ? emp.razonSocial : m.tenant_id;
      })
      .filter(Boolean);

    const passMask = '••••••••';

    return `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; padding:1rem 1.15rem; border:1px solid #e2e8f0; border-radius:12px; background:${isActivo ? '#ffffff' : '#f8fafc'}; flex-wrap:wrap;">
        <div style="flex:1; min-width:260px;">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.35rem;">
            <strong style="font-size:0.95rem; color:#0f172a;">${escapeHtml(u.nombre_completo || u.nombre || u.email)}</strong>
            <span style="font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:999px; ${getRolBadgeStyle(rolLabel)}">${escapeHtml(rolLabel)}</span>
            <span style="font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:999px; ${isActivo ? 'background:#dcfce7; color:#15803d;' : 'background:#fee2e2; color:#b91c1c;'}">
              ${isActivo ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </div>
          <div style="font-size:0.82rem; color:#475569; display:flex; flex-wrap:wrap; gap:0.75rem; margin-bottom:0.45rem;">
            <span>📧 ${escapeHtml(u.email || '—')}</span>
            ${u.cedula ? `<span>🪪 CC: ${escapeHtml(u.cedula)}</span>` : ''}
            ${u.telefono ? `<span>📱 ${escapeHtml(u.telefono)}</span>` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; font-size:0.78rem; color:#64748b; margin-bottom:0.5rem;">
            <span>🔑 Clave: <code id="pass-consultor-${escapeHtml(u.id)}" data-visible="false" data-raw="${escapeHtml(u.password || '')}" style="background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#334155;">${passMask}</code></span>
            <button type="button" class="btn btn-sm" style="padding:2px 6px; font-size:0.72rem;" onclick="window.toggleVisibilidadPasswordAdmin('pass-consultor-${escapeHtml(u.id)}', this)">👁️ Ver</button>
            <button type="button" class="btn btn-sm" style="padding:2px 6px; font-size:0.72rem;" onclick="window.copiarPasswordUsuario('${escapeHtml(u.password || '')}')">📋 Copiar</button>
          </div>
          <div style="font-size:0.78rem; color:#334155;">
            <strong>Empresas asignadas (${assignedNames.length}):</strong>
            ${
              assignedNames.length > 0
                ? `<div style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-top:0.3rem;">
                    ${assignedNames
                      .map(
                        (name) =>
                          `<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 8px; border-radius:6px; font-size:0.74rem; font-weight:600;">🏢 ${escapeHtml(name)}</span>`
                      )
                      .join('')}
                  </div>`
                : `<span style="color:#b45309; font-weight:600;">Sin empresas asignadas (bloqueado)</span>`
            }
          </div>
        </div>

        <div style="display:flex; gap:0.45rem; flex-wrap:wrap; align-items:center;">
          <button type="button" class="btn btn-primary btn-sm" onclick="window.abrirModalAsignarEmpresas('${escapeHtml(u.id)}')">
            🏢 Asignar Empresas
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.editarConsultorUsuario('${escapeHtml(u.id)}')">
            ✏️ Editar
          </button>
          <button type="button" class="btn btn-sm" style="background:${isActivo ? '#fef3c7' : '#dcfce7'}; color:${isActivo ? '#92400e' : '#166534'}; border:1px solid ${isActivo ? '#fde68a' : '#bbf7d0'};" onclick="window.toggleEstadoConsultorUsuario('${escapeHtml(u.id)}')">
            ${isActivo ? '⏸️ Desactivar' : '▶️ Activar'}
          </button>
          <button type="button" class="btn btn-sm" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca;" onclick="window.eliminarConsultorUsuario('${escapeHtml(u.id)}')">
            🗑️
          </button>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem;">
      <!-- Encabezado -->
      <div class="card" style="padding:1.25rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:#ffffff;">
        <div>
          <div style="font-size:0.72rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#38bdf8; margin-bottom:0.25rem;">
            BLINDAJE RBAC Y AISLAMIENTO MULTITENANT
          </div>
          <h2 style="margin:0; font-size:1.25rem; color:#ffffff;">Gestión de Consultores SST y Accesos Empresariales</h2>
          <p style="margin:0.3rem 0 0; font-size:0.84rem; color:#cbd5e1;">
            Crea consultores (<code>CONSULTOR_SST</code>) o administradores de empresa (<code>ADMIN_PYME</code>) y asigna exactamente qué empresas puede administrar cada uno.
          </p>
        </div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" onclick="window.abrirModalConsultorUsuario()">
            ➕ Nuevo Consultor / Usuario
          </button>
        </div>
      </div>

      <!-- Super Administrador Único -->
      <div class="card" style="padding:1.15rem 1.35rem; border:1px solid #c7d2fe; background:#f8fafc;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <span style="font-size:1.1rem;">🛡️</span>
              <strong style="color:#0f172a;">Super Administrador Único (Protegido)</strong>
              <span style="font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:999px; ${getRolBadgeStyle('SUPER_ADMIN')}">SUPER_ADMIN</span>
            </div>
            <div style="font-size:0.84rem; color:#475569; margin-top:0.25rem;">
              <strong>${escapeHtml(masterAdmin.nombre)}</strong> · 📧 <code>${escapeHtml(MASTER_SUPER_ADMIN_EMAIL)}</code> · Visibilidad global sobre las ${empresas.length} empresas registradas.
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.editarSuperAdmin('${escapeHtml(masterAdmin.id)}')">
            🔑 Actualizar Clave Master
          </button>
        </div>
      </div>

      <!-- Listado de Consultores y Usuarios -->
      <div class="card" style="padding:1.25rem 1.35rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
          <div>
            <h3 style="margin:0; font-size:1.05rem; color:#0f172a;">Consultores SST y Administradores de Empresa (${consultoresYUsuarios.length})</h3>
            <p style="margin:0.2rem 0 0; font-size:0.8rem; color:#64748b;">
              Cada usuario ve únicamente las empresas marcadas en su matriz de asignación.
            </p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.85rem;">
          ${
            consultoresYUsuarios.length > 0
              ? consultoresYUsuarios.map(renderUsuarioRow).join('')
              : `<div style="padding:2rem; text-align:center; border:1px dashed #cbd5e1; border-radius:10px; color:#64748b;">
                  No hay consultores o administradores registrados aún. Haz clic en <strong>➕ Nuevo Consultor / Usuario</strong>.
                </div>`
          }
        </div>
      </div>
    </div>
  `;
}

export function abrirModalConsultorUsuario(existingId = null) {
  if (!auth.isSuperAdmin()) return;

  const list = store.getConsultoresYUsuarios ? store.getConsultoresYUsuarios() : [];
  const user = existingId ? list.find((u) => u.id === existingId) : null;
  const isEdit = Boolean(user);

  const modalId = 'modal-consultor-usuario';
  document.getElementById(modalId)?.remove();

  const overlay = document.createElement('div');
  overlay.id = modalId;
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem;';

  const currentRole = getRolLabel(user?.role || user?.rol || 'CONSULTOR_SST');
  const currentActivo = user ? user.activo !== false && String(user.estado || 'ACTIVO').toUpperCase() !== 'INACTIVO' : true;

  overlay.innerHTML = `
    <div style="background:#ffffff; width:100%; max-width:520px; border-radius:14px; padding:1.4rem; box-shadow:0 20px 50px rgba(0,0,0,0.25); max-height:92vh; overflow-y:auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3 style="margin:0; font-size:1.1rem; color:#0f172a;">
          ${isEdit ? '✏️ Editar Consultor / Usuario' : '➕ Nuevo Consultor / Usuario Empresarial'}
        </h3>
        <button type="button" id="close-modal-consultor" style="border:none; background:transparent; font-size:1.25rem; cursor:pointer; color:#64748b;">✕</button>
      </div>

      <form id="form-consultor-usuario" style="display:flex; flex-direction:column; gap:0.85rem;">
        <div>
          <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Nombre Completo *</label>
          <input type="text" id="cu-nombre" required value="${escapeHtml(user?.nombre_completo || user?.nombre || '')}" placeholder="ej: Laura Gómez" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;" />
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div>
            <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Documento / Cédula</label>
            <input type="text" id="cu-cedula" value="${escapeHtml(user?.cedula || '')}" placeholder="ej: 1020304050" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;" />
          </div>
          <div>
            <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Teléfono</label>
            <input type="text" id="cu-telefono" value="${escapeHtml(user?.telefono || '')}" placeholder="ej: 3001234567" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;" />
          </div>
        </div>

        <div>
          <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Correo Electrónico *</label>
          <input type="email" id="cu-email" required value="${escapeHtml(user?.email || '')}" placeholder="ej: correo@dominio.com" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;" />
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div>
            <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Rol Asignado *</label>
            <select id="cu-rol" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;">
              <option value="CONSULTOR_SST" ${currentRole === 'CONSULTOR_SST' ? 'selected' : ''}>CONSULTOR_SST (Multi-Empresa)</option>
              <option value="ADMIN_PYME" ${currentRole === 'ADMIN_PYME' ? 'selected' : ''}>ADMIN_PYME (Empresa Única)</option>
            </select>
          </div>
          <div>
            <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Estado</label>
            <select id="cu-estado" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;">
              <option value="ACTIVO" ${currentActivo ? 'selected' : ''}>ACTIVO</option>
              <option value="INACTIVO" ${!currentActivo ? 'selected' : ''}>INACTIVO</option>
            </select>
          </div>
        </div>

        <div>
          <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">
            Contraseña ${isEdit ? '(dejar igual o cambiar)' : '*'}
          </label>
          <div style="display:flex; gap:0.4rem;">
            <input type="text" id="cu-password" ${isEdit ? '' : 'required'} value="${escapeHtml(user?.password || '')}" placeholder="Contraseña de acceso" style="flex:1; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;" />
            <button type="button" id="cu-copy-pass" class="btn btn-secondary btn-sm">📋 Copiar</button>
          </div>
        </div>

        <div id="cu-error" style="display:none; color:#b91c1c; background:#fee2e2; padding:0.55rem 0.75rem; border-radius:8px; font-size:0.82rem;"></div>

        <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:0.5rem;">
          <button type="button" id="cancel-modal-consultor" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar Cambios' : 'Crear Usuario'}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#close-modal-consultor').onclick = close;
  overlay.querySelector('#cancel-modal-consultor').onclick = close;
  overlay.querySelector('#cu-copy-pass').onclick = () => {
    const val = overlay.querySelector('#cu-password').value;
    window.copiarPasswordUsuario(val);
  };

  overlay.querySelector('#form-consultor-usuario').onsubmit = (e) => {
    e.preventDefault();
    const errBox = overlay.querySelector('#cu-error');
    const email = overlay.querySelector('#cu-email').value.trim().toLowerCase();
    if (email === MASTER_SUPER_ADMIN_EMAIL) {
      errBox.textContent = 'No se puede duplicar ni modificar el correo del Super Administrador Único desde este formulario.';
      errBox.style.display = 'block';
      return;
    }

    const estado = overlay.querySelector('#cu-estado').value;
    const payload = {
      id: user?.id || undefined,
      nombre_completo: overlay.querySelector('#cu-nombre').value.trim(),
      cedula: overlay.querySelector('#cu-cedula').value.trim(),
      telefono: overlay.querySelector('#cu-telefono').value.trim(),
      email,
      role: overlay.querySelector('#cu-rol').value,
      rol: overlay.querySelector('#cu-rol').value,
      password: overlay.querySelector('#cu-password').value,
      estado,
      activo: estado === 'ACTIVO'
    };

    const res = store.saveConsultorUsuario(payload);
    if (!res?.ok) {
      errBox.textContent = res?.error || 'Error guardando el usuario.';
      errBox.style.display = 'block';
      return;
    }

    close();
    const container = document.getElementById('main-content');
    if (container) renderSuperAdmins(container);
  };
}

export function abrirModalAsignarEmpresas(userId) {
  if (!auth.isSuperAdmin()) return;

  const users = store.getConsultoresYUsuarios ? store.getConsultoresYUsuarios() : [];
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  const empresas = store.getAllEmpresasRaw ? store.getAllEmpresasRaw() : [];
  const memberships = store.getUserTenantMemberships ? store.getUserTenantMemberships(userId) : [];
  const activeSet = new Set(
    memberships
      .filter((m) => m.is_active !== false && m.activo !== false)
      .map((m) => m.tenant_id)
  );

  const modalId = 'modal-asignar-empresas';
  document.getElementById(modalId)?.remove();

  const overlay = document.createElement('div');
  overlay.id = modalId;
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem;';

  overlay.innerHTML = `
    <div style="background:#ffffff; width:100%; max-width:540px; border-radius:14px; padding:1.4rem; box-shadow:0 20px 50px rgba(0,0,0,0.25); max-height:90vh; overflow-y:auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
        <div>
          <h3 style="margin:0; font-size:1.08rem; color:#0f172a;">🏢 Matriz de Asignación de Empresas</h3>
          <p style="margin:0.2rem 0 0; font-size:0.82rem; color:#64748b;">
            Usuario: <strong>${escapeHtml(user.nombre_completo || user.email)}</strong> (${escapeHtml(getRolLabel(user.role || user.rol))})
          </p>
        </div>
        <button type="button" id="close-modal-asignar" style="border:none; background:transparent; font-size:1.25rem; cursor:pointer; color:#64748b;">✕</button>
      </div>

      <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
        <button type="button" id="btn-select-all-emp" class="btn btn-secondary btn-sm">☑️ Marcar todas</button>
        <button type="button" id="btn-clear-all-emp" class="btn btn-secondary btn-sm">⬜ Desmarcar todas</button>
      </div>

      <div id="lista-empresas-check" style="display:flex; flex-direction:column; gap:0.5rem; max-height:360px; overflow-y:auto; padding:0.25rem 0;">
        ${empresas
          .map((emp) => {
            const checked = activeSet.has(emp.id) ? 'checked' : '';
            return `
              <label style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; padding:0.65rem 0.85rem; border:1px solid #e2e8f0; border-radius:10px; cursor:pointer; background:#f8fafc;">
                <div style="display:flex; align-items:center; gap:0.65rem;">
                  <input type="checkbox" class="chk-tenant-assign" value="${escapeHtml(emp.id)}" ${checked} style="width:18px; height:18px; cursor:pointer;" />
                  <div>
                    <div style="font-weight:700; font-size:0.88rem; color:#0f172a;">${escapeHtml(emp.razonSocial)}</div>
                    <div style="font-size:0.76rem; color:#64748b;">NIT: ${escapeHtml(emp.nit || 'N/A')} · Riesgo ${escapeHtml(emp.claseRiesgo || 'I')}</div>
                  </div>
                </div>
              </label>
            `;
          })
          .join('')}
      </div>

      <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1rem;">
        <button type="button" id="cancel-modal-asignar" class="btn btn-secondary">Cancelar</button>
        <button type="button" id="save-modal-asignar" class="btn btn-primary">💾 Guardar Asignación</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#close-modal-asignar').onclick = close;
  overlay.querySelector('#cancel-modal-asignar').onclick = close;

  overlay.querySelector('#btn-select-all-emp').onclick = () => {
    overlay.querySelectorAll('.chk-tenant-assign').forEach((c) => {
      c.checked = true;
    });
  };
  overlay.querySelector('#btn-clear-all-emp').onclick = () => {
    overlay.querySelectorAll('.chk-tenant-assign').forEach((c) => {
      c.checked = false;
    });
  };

  overlay.querySelector('#save-modal-asignar').onclick = async () => {
    const selectedIds = Array.from(overlay.querySelectorAll('.chk-tenant-assign:checked')).map((c) => c.value);
    const session = auth.getSession ? auth.getSession() : null;
    store.setUserTenantMemberships(userId, selectedIds, session?.userId || 'usr-superadmin-1');
    await syncMembershipToBackend(userId, selectedIds);
    close();
    const container = document.getElementById('main-content');
    if (container) renderSuperAdmins(container);
  };
}

export function abrirModalSuperAdmin(existingId = null) {
  if (!auth.isSuperAdmin()) return;
  const admins = store.getSuperAdmins ? store.getSuperAdmins() : [];
  const admin = admins.find((a) => a.id === existingId || String(a.email || '').toLowerCase() === MASTER_SUPER_ADMIN_EMAIL);

  const modalId = 'modal-super-admin-master';
  document.getElementById(modalId)?.remove();

  const overlay = document.createElement('div');
  overlay.id = modalId;
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem;';

  overlay.innerHTML = `
    <div style="background:#ffffff; width:100%; max-width:440px; border-radius:14px; padding:1.4rem; box-shadow:0 20px 50px rgba(0,0,0,0.25);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3 style="margin:0; font-size:1.05rem; color:#0f172a;">🛡️ Super Administrador Único</h3>
        <button type="button" id="close-modal-sa" style="border:none; background:transparent; font-size:1.25rem; cursor:pointer; color:#64748b;">✕</button>
      </div>
      <form id="form-sa-master" style="display:flex; flex-direction:column; gap:0.8rem;">
        <div>
          <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Correo Maestro (Bloqueado)</label>
          <input type="email" readonly value="${escapeHtml(MASTER_SUPER_ADMIN_EMAIL)}" placeholder="ej: correo@dominio.com" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px; background:#f1f5f9; color:#475569;" />
        </div>
        <div>
          <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Nombre</label>
          <input type="text" id="sa-nombre" required value="${escapeHtml(admin?.nombre || 'Iván Darío González (Master)')}" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;" />
        </div>
        <div>
          <label style="display:block; font-size:0.78rem; font-weight:700; color:#334155; margin-bottom:0.25rem;">Nueva Contraseña</label>
          <input type="text" id="sa-password" required value="${escapeHtml(admin?.password || 'Stoner200')}" style="width:100%; padding:0.55rem 0.7rem; border:1px solid #cbd5e1; border-radius:8px;" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:0.5rem;">
          <button type="button" id="cancel-modal-sa" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#close-modal-sa').onclick = close;
  overlay.querySelector('#cancel-modal-sa').onclick = close;
  overlay.querySelector('#form-sa-master').onsubmit = (e) => {
    e.preventDefault();
    if (store.saveSuperAdmin) {
      store.saveSuperAdmin({
        id: admin?.id || 'sa-001',
        email: MASTER_SUPER_ADMIN_EMAIL,
        nombre: overlay.querySelector('#sa-nombre').value.trim(),
        password: overlay.querySelector('#sa-password').value,
        rol: 'SUPER_ADMIN',
        activo: true,
        isMaster: true
      });
    }
    close();
    const container = document.getElementById('main-content');
    if (container) renderSuperAdmins(container);
  };
}

window.abrirModalSuperAdmin = abrirModalSuperAdmin;
window.editarSuperAdmin = (id) => abrirModalSuperAdmin(id);

window.abrirModalConsultorUsuario = abrirModalConsultorUsuario;
window.editarConsultorUsuario = (id) => abrirModalConsultorUsuario(id);

window.toggleEstadoConsultorUsuario = (id) => {
  if (!auth.isSuperAdmin()) return;
  const users = store.getConsultoresYUsuarios ? store.getConsultoresYUsuarios() : [];
  const user = users.find((u) => u.id === id);
  if (!user) return;
  const nextActivo = !(user.activo !== false && String(user.estado || 'ACTIVO').toUpperCase() !== 'INACTIVO');
  store.saveConsultorUsuario({
    ...user,
    activo: nextActivo,
    estado: nextActivo ? 'ACTIVO' : 'INACTIVO'
  });
  const container = document.getElementById('main-content');
  if (container) renderSuperAdmins(container);
};

window.eliminarConsultorUsuario = (id) => {
  if (!auth.isSuperAdmin()) return;
  if (!confirm('¿Eliminar este usuario y sus asignaciones de empresas?')) return;
  store.deleteConsultorUsuario(id);
  const container = document.getElementById('main-content');
  if (container) renderSuperAdmins(container);
};

window.abrirModalAsignarEmpresas = abrirModalAsignarEmpresas;

window.toggleVisibilidadPasswordAdmin = (elementId, btn) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  const isVisible = el.dataset.visible === 'true';
  if (isVisible) {
    el.textContent = '••••••••';
    el.dataset.visible = 'false';
    if (btn) btn.textContent = '👁️ Ver';
  } else {
    el.textContent = el.dataset.raw || '(sin clave)';
    el.dataset.visible = 'true';
    if (btn) btn.textContent = '🙈 Ocultar';
  }
};

window.copiarPasswordUsuario = (password) => {
  if (!password) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(password).then(() => {
      alert('Contraseña copiada al portapapeles.');
    });
  }
};

window.toggleEstadoSuperAdmin = () => {};
window.eliminarSuperAdmin = () => {};
