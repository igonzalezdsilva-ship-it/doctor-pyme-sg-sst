// =============================================================================
// MÓDULO DE GESTIÓN DE SUPER ADMINISTRADORES SST - DOCTOR PYME SG-SST
// Control Maestro de Cuentas Institucionales con Acceso Global Multi-Empresa
// =============================================================================

import { store } from '../store.js';
import { auth } from '../auth.js';

let busquedaAdmin = '';
let filtroEstadoAdmin = 'TODOS';

export function renderSuperAdmins() {
  const container = document.getElementById('main-content');
  if (!container) return;

  const esSuperAdmin = auth.isSuperAdmin();
  if (!esSuperAdmin) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-12 text-center max-w-md mx-auto shadow-sm border border-slate-200 my-8">
        <div class="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⛔
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
        <p class="text-xs text-slate-500 mb-6 leading-relaxed">
          Esta sección está reservada exclusivamente para el Super Administrador del SG-SST.
        </p>
        <button onclick="window.location.hash='#dashboard'" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
          Volver al Panel Principal
        </button>
      </div>
    `;
    return;
  }

  const admins = store.getSuperAdmins();
  const usuarioActual = auth.getUser();

  // Filtrado reactivo
  const adminsFiltrados = admins.filter(admin => {
    if (filtroEstadoAdmin !== 'TODOS' && (admin.estado || 'ACTIVO').toUpperCase() !== filtroEstadoAdmin) {
      return false;
    }
    if (busquedaAdmin.trim() !== '') {
      const q = busquedaAdmin.toLowerCase().trim();
      const matchEmail = (admin.email || '').toLowerCase().includes(q);
      const matchNombre = (admin.nombre || '').toLowerCase().includes(q);
      const matchCargo = (admin.cargo || '').toLowerCase().includes(q);
      const matchLicencia = (admin.licencia || '').toLowerCase().includes(q);
      return matchEmail || matchNombre || matchCargo || matchLicencia;
    }
    return true;
  });

  const totalActivos = admins.filter(a => (a.estado || 'ACTIVO').toUpperCase() === 'ACTIVO').length;

  container.innerHTML = `
    <div class="space-y-6 pb-12 animate-fadeIn">
      
      <!-- CABECERA PRINCIPAL -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-amber-500/30 text-amber-300 border border-amber-500/40">
                Control de Acceso Maestro • RBAC Nivel 0
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                ${totalActivos} Cuentas Activas
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span class="p-2 rounded-2xl bg-amber-600/60 border border-amber-400/40 shadow-inner">🛡️</span>
              Gestión de Super Administradores SST
            </h1>
            <p class="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Administra las cuentas maestras de consultoría con <strong>acceso global a todas las empresas clientes</strong>, matrices GTC 45, mapas de procesos y expedientes del SG-SST. Las empresas únicamente acceden con el correo y contraseña definidos en su creación.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button 
              id="btn-nuevo-super-admin"
              onclick="window.abrirModalSuperAdmin()"
              class="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg class="w-4 h-4 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
              <span>+ Nuevo Super Administrador</span>
            </button>
          </div>
        </div>
      </div>

      <!-- BARRA DE BÚSQUEDA Y FILTROS -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div class="relative w-full sm:w-80">
          <input 
            type="text" 
            id="input-buscar-super-admin"
            placeholder="Buscar por correo, nombre o licencia..." 
            value="${busquedaAdmin}"
            class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
          >
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <select 
            id="select-filtro-estado-admin"
            class="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="TODOS" ${filtroEstadoAdmin === 'TODOS' ? 'selected' : ''}>Todos los Estados</option>
            <option value="ACTIVO" ${filtroEstadoAdmin === 'ACTIVO' ? 'selected' : ''}>Solo Activos</option>
            <option value="INACTIVO" ${filtroEstadoAdmin === 'INACTIVO' ? 'selected' : ''}>Solo Inactivos</option>
          </select>
          <span class="text-xs text-slate-500 whitespace-nowrap">
            Mostrando <strong>${adminsFiltrados.length}</strong> de <strong>${admins.length}</strong> administradores
          </span>
        </div>
      </div>

      <!-- LISTA DE SUPER ADMINISTRADORES -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${adminsFiltrados.length === 0 ? `
          <div class="col-span-full bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
            <span class="text-4xl block mb-2">🔍</span>
            <h3 class="text-sm font-bold text-slate-700">No se encontraron super administradores</h3>
            <p class="text-xs text-slate-400 mt-1">Prueba cambiando los términos de búsqueda o filtros.</p>
          </div>
        ` : adminsFiltrados.map(admin => {
          const esActivo = (admin.estado || 'ACTIVO').toUpperCase() === 'ACTIVO';
          const esYo = (usuarioActual?.email || '').toLowerCase() === (admin.email || '').toLowerCase();
          return `
            <div class="bg-white rounded-2xl border ${esYo ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md' : 'border-slate-200/80 shadow-sm'} p-5 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl ${esActivo ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'} flex items-center justify-center text-lg font-black shadow-inner flex-shrink-0">
                      ${(admin.nombre || 'SA').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-sm font-extrabold text-slate-900 leading-tight">${admin.nombre || 'Super Administrador'}</h3>
                        ${esYo ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">TÚ</span>' : ''}
                      </div>
                      <span class="text-[11px] text-slate-500 block">${admin.cargo || 'Consultor Principal SST'}</span>
                    </div>
                  </div>

                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${esActivo ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}">
                    ${esActivo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>

                <!-- Credenciales y Datos de Contacto -->
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-2 mb-4 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400 text-[10px] uppercase font-bold">Correo de Acceso:</span>
                    <strong class="text-indigo-900 font-mono text-[11px] select-all">${admin.email}</strong>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-slate-400 text-[10px] uppercase font-bold">Contraseña:</span>
                    <div class="flex items-center gap-1.5">
                      <span id="pass-mask-${admin.id}" class="font-mono text-slate-700 font-bold">••••••••</span>
                      <span id="pass-clear-${admin.id}" class="font-mono text-amber-700 font-bold hidden select-all">${admin.password || 'Stoner200'}</span>
                      <button 
                        type="button" 
                        onclick="window.toggleVisibilidadPasswordAdmin('${admin.id}')"
                        class="text-slate-400 hover:text-indigo-600 text-[11px] px-1"
                        title="Ver u ocultar contraseña"
                      >
                        👁️
                      </button>
                    </div>
                  </div>

                  ${admin.licencia ? `
                  <div class="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                    <span class="text-slate-400 text-[10px] uppercase font-bold">Licencia SST:</span>
                    <span class="text-slate-700 text-[11px] truncate max-w-[180px]">${admin.licencia}</span>
                  </div>
                  ` : ''}

                  ${admin.telefono ? `
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400 text-[10px] uppercase font-bold">Teléfono:</span>
                    <span class="text-slate-700 text-[11px]">${admin.telefono}</span>
                  </div>
                  ` : ''}

                  <div class="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 pt-1.5">
                    <span>Último Ingreso:</span>
                    <span>${admin.ultimoIngreso ? new Date(admin.ultimoIngreso).toLocaleString('es-CO') : 'Sin registros'}</span>
                  </div>
                </div>
              </div>

              <!-- Acciones de Gestión -->
              <div class="flex items-center justify-between border-t border-slate-100 pt-3">
                <button 
                  type="button"
                  onclick="window.toggleEstadoSuperAdmin('${admin.id}')"
                  class="text-xs font-bold ${esActivo ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'} transition cursor-pointer flex items-center gap-1"
                  ${esYo ? 'disabled title="No puedes desactivar tu propia cuenta activa"' : ''}
                >
                  <span>${esActivo ? '⏸️ Desactivar' : '▶️ Activar'}</span>
                </button>

                <div class="flex items-center gap-2">
                  <button 
                    type="button"
                    onclick="window.editarSuperAdmin('${admin.id}')"
                    class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Editar datos y contraseña"
                  >
                    ✏️ Editar
                  </button>

                  <button 
                    type="button"
                    onclick="window.eliminarSuperAdmin('${admin.id}')"
                    class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer ${esYo ? 'opacity-30 cursor-not-allowed' : ''}"
                    ${esYo ? 'disabled title="No puedes eliminar tu propia cuenta en sesión"' : 'title="Eliminar administrador"'}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;

  // Listeners de búsqueda y filtrado
  document.getElementById('input-buscar-super-admin')?.addEventListener('input', (e) => {
    busquedaAdmin = e.target.value;
    renderSuperAdmins();
  });

  document.getElementById('select-filtro-estado-admin')?.addEventListener('change', (e) => {
    filtroEstadoAdmin = e.target.value;
    renderSuperAdmins();
  });
}

// -----------------------------------------------------------------------------
// MODAL PARA CREAR O EDITAR SUPER ADMINISTRADOR
// -----------------------------------------------------------------------------
export function abrirModalSuperAdmin(adminId = null) {
  const modalId = 'modal-super-admin-form';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  const esEdicion = !!adminId;
  const admin = esEdicion ? store.getSuperAdmin(adminId) : null;

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">
      <div class="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-xl">
            🛡️
          </div>
          <div>
            <h3 class="text-base font-extrabold text-white">${esEdicion ? 'Editar Super Administrador' : 'Nuevo Super Administrador'}</h3>
            <p class="text-[11px] text-slate-300">Credenciales maestras con acceso global al SG-SST</p>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white p-1.5 rounded-lg transition cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <form id="form-super-admin" class="p-6 overflow-y-auto space-y-4">
        <input type="hidden" id="sa-id" value="${admin?.id || ''}">

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Nombre Completo y Título *</label>
          <input 
            type="text" 
            id="sa-nombre" 
            required 
            placeholder="ej: Ing. Iván David González Silva"
            value="${admin?.nombre || ''}"
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico (Usuario de Acceso) *</label>
          <input 
            type="email" 
            id="sa-email" 
            required 
            placeholder="ej: i.gonzalez.dsilva@gmail.com"
            value="${admin?.email || ''}"
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
          <p class="text-[10px] text-slate-400 mt-1">Este correo será su usuario exclusivo para acceder como Super Administrador.</p>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Contraseña de Acceso *</label>
          <div class="relative">
            <input 
              type="text" 
              id="sa-password" 
              required 
              minlength="6"
              placeholder="Ingresa la contraseña maestra..."
              value="${admin?.password || 'Stoner200'}"
              class="w-full px-3 py-2 pr-9 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Mínimo 6 caracteres. Puedes definir la contraseña que desees para este administrador.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Cargo Institucional</label>
            <input 
              type="text" 
              id="sa-cargo" 
              placeholder="ej: Consultor Principal SST"
              value="${admin?.cargo || 'Super Administrador & Consultor Principal SST'}"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Licencia SST</label>
            <input 
              type="text" 
              id="sa-licencia" 
              placeholder="ej: RESOLUCIÓN No. 6514 de 19/10/2022"
              value="${admin?.licencia || 'RESOLUCIÓN No. 6514 de 19/10/2022'}"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono de Contacto</label>
            <input 
              type="tel" 
              id="sa-telefono" 
              placeholder="ej: 3144001787"
              value="${admin?.telefono || '3144001787'}"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Estado de la Cuenta</label>
            <select 
              id="sa-estado"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="ACTIVO" ${(!admin || admin.estado === 'ACTIVO') ? 'selected' : ''}>ACTIVO (Permitir Acceso)</option>
              <option value="INACTIVO" ${admin?.estado === 'INACTIVO' ? 'selected' : ''}>INACTIVO (Bloquear Ingreso)</option>
            </select>
          </div>
        </div>

        <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <span>ℹ️</span>
          <p class="leading-relaxed">
            Las empresas clientes tienen prohibido usar cuentas de Super Admin y únicamente pueden acceder con el correo y contraseña especificados en su respectivo perfil.
          </p>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button 
            type="button" 
            onclick="document.getElementById('${modalId}').remove()" 
            class="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
          >
            ${esEdicion ? 'Guardar Cambios' : 'Crear Super Administrador'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('form-super-admin').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('sa-id').value;
    const nombre = document.getElementById('sa-nombre').value.trim();
    const email = document.getElementById('sa-email').value.trim().toLowerCase();
    const password = document.getElementById('sa-password').value.trim();
    const cargo = document.getElementById('sa-cargo').value.trim();
    const licencia = document.getElementById('sa-licencia').value.trim();
    const telefono = document.getElementById('sa-telefono').value.trim();
    const estado = document.getElementById('sa-estado').value;

    if (!nombre || !email || !password) {
      alert("Por favor completa los campos obligatorios: Nombre, Correo y Contraseña.");
      return;
    }

    const payload = {
      id: id || undefined,
      nombre,
      email,
      password,
      cargo,
      licencia,
      telefono,
      estado
    };

    const res = store.saveSuperAdmin(payload);
    if (!res.ok) {
      alert(res.error || "No se pudo guardar el super administrador.");
      return;
    }

    modal.remove();
    window.mostrarNotificacion(`Super Administrador ${nombre} guardado exitosamente.`);
    renderSuperAdmins();
  };
}

// Helpers globales en window para acciones de la vista
if (typeof window !== 'undefined') {
  window.abrirModalSuperAdmin = abrirModalSuperAdmin;

  window.editarSuperAdmin = function(id) {
    abrirModalSuperAdmin(id);
  };

  window.toggleVisibilidadPasswordAdmin = function(id) {
    const mask = document.getElementById(`pass-mask-${id}`);
    const clear = document.getElementById(`pass-clear-${id}`);
    if (mask && clear) {
      mask.classList.toggle('hidden');
      clear.classList.toggle('hidden');
    }
  };

  window.toggleEstadoSuperAdmin = function(id) {
    const user = auth.getUser();
    const admin = store.getSuperAdmin(id);
    if (!admin) return;

    if (user && (user.email || '').toLowerCase() === (admin.email || '').toLowerCase()) {
      alert("No puedes desactivar tu propia cuenta mientras estás en sesión.");
      return;
    }

    const nuevoEstado = store.toggleEstadoSuperAdmin(id);
    window.mostrarNotificacion(`Super Administrador ${admin.nombre} ahora está ${nuevoEstado}.`);
    renderSuperAdmins();
  };

  window.eliminarSuperAdmin = function(id) {
    const user = auth.getUser();
    const admin = store.getSuperAdmin(id);
    if (!admin) return;

    if (user && (user.email || '').toLowerCase() === (admin.email || '').toLowerCase()) {
      alert("No puedes eliminar tu propia cuenta en sesión activa.");
      return;
    }

    const activos = store.getSuperAdmins().filter(a => (a.estado || 'ACTIVO').toUpperCase() === 'ACTIVO');
    if (activos.length <= 1 && (admin.estado || 'ACTIVO').toUpperCase() === 'ACTIVO') {
      alert("No puedes eliminar al único Super Administrador activo del sistema.");
      return;
    }

    if (confirm(`¿Estás seguro de eliminar permanentemente la cuenta de Super Administrador para "${admin.nombre}" (${admin.email})?`)) {
      store.deleteSuperAdmin(id);
      window.mostrarNotificacion(`Super Administrador eliminado exitosamente.`, 'info');
      renderSuperAdmins();
    }
  };
}
