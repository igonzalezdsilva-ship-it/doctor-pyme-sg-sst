// =============================================================================
// APLICACIÓN PRINCIPAL DOCTOR PYME SG-SST (ENRUTADOR Y CONTROLADOR GLOBAL)
// =============================================================================
import { store } from './store.js';
import { auth } from './auth.js';
import { renderDashboard } from './components/dashboard.js';
import { renderCompanies } from './components/companies.js';
import { renderEvaluation } from './components/evaluation.js';
import { renderMatrix } from './components/matrix.js';
import { renderWorkPlan } from './components/workplan.js';
import { renderAccidents } from './components/accidents.js';
import { renderReports } from './components/reports.js';
import { renderProcessMap } from './components/processMap.js';
import { renderDocumentation } from './components/documents.js';
import { renderTraining } from './components/training.js';
import { renderMaintenance } from './components/maintenance.js';
import { renderToolsModule } from './components/toolsManagement.js';
import { renderWorkerPortal } from './components/workerPortal.js';
import { renderAuditorView } from './components/auditorView.js';
import { renderLegalComplianceRepository, renderLegalConsentScreen } from './components/legalCompliance.js';
import { renderSuperAdmins } from './components/superAdmins.js';
import { renderMasterRepository } from './components/masterRepository.js';
import { abrirModalIA } from './components/aiAssistant.js';
import './components/diagramViewer.js';
import './components/documentViewer.js';

const routes = {
  '#dashboard': renderDashboard,
  '#empresas': renderCompanies,
  '#super-admins': renderSuperAdmins,
  '#repositorio-base': renderMasterRepository,
  '#procesos': renderProcessMap,
  '#evaluacion': renderEvaluation,
  '#matriz': renderMatrix,
  '#plan-trabajo': renderWorkPlan,
  '#accidentes': renderAccidents,
  '#reportes': renderReports,
  '#documentos': renderDocumentation,
  '#capacitaciones': renderTraining,
  '#mantenimiento': renderMaintenance,
  '#herramientas': renderToolsModule,
  '#repositorio-legal': renderLegalComplianceRepository,
  '#admin/legal-compliance-repository': renderLegalComplianceRepository,
  '#legal-consent': renderLegalConsentScreen,
  '#portal-trabajador': renderWorkerPortal,
  '#auditoria-sst': renderAuditorView
};

function mostrarErrorEnPantalla(err) {
  const container = document.getElementById('main-content');
  if (container) {
    container.innerHTML = `
      <div class="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm my-8">
        <div class="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⚠️
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Inconveniente al cargar la sección</h3>
        <p class="text-xs text-slate-500 mb-4">${err?.message || 'Error inesperado al renderizar el módulo'}</p>
        <button onclick="window.location.hash='#dashboard'; window.location.reload();" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition">
          Volver al Panel Principal
        </button>
      </div>
    `;
  }
}

function router() {
  if (!auth.isAuthenticated()) return;

  let hash = window.location.hash || '#dashboard';
  if (hash === '#login') {
    hash = '#dashboard';
    window.history.replaceState(null, '', window.location.pathname + '#dashboard');
  }

  // Soporte para URLs amigables
  if (window.location.pathname.includes('/admin/legal-compliance-repository')) {
    hash = '#repositorio-legal';
  } else if (window.location.pathname.includes('/legal-consent')) {
    hash = '#legal-consent';
  }

  // Nota de Arquitectura: La Política de Tratamiento de Datos Personales (Ley 1581 / Ley 527)
  // se solicita, autoriza y firma 1 ÚNICA VEZ al momento de registrar/crear la empresa en el módulo Empresas Clientes.

  // Redirección inteligente por rol
  if (auth.isWorker() && (!window.location.hash || window.location.hash === '#dashboard')) {
    hash = '#portal-trabajador';
    window.location.hash = '#portal-trabajador';
  } else if (auth.isAuditor() && (!window.location.hash || window.location.hash === '#dashboard')) {
    hash = '#auditoria-sst';
    window.location.hash = '#auditoria-sst';
  }

  const renderFn = routes[hash] || renderDashboard;

  // Actualizar clases activas en sidebar
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('bg-indigo-700', 'text-white');
      link.classList.remove('text-slate-300', 'hover:bg-slate-800');
    } else {
      link.classList.remove('bg-indigo-700', 'text-white');
      link.classList.add('text-slate-300', 'hover:bg-slate-800');
    }
  });

  try {
    const res = renderFn();
    if (res instanceof Promise) {
      res.catch(err => {
        console.error("Error en renderizado asíncrono:", err);
        mostrarErrorEnPantalla(err);
      });
    }
  } catch (err) {
    console.error("Error al ejecutar renderFn:", err);
    mostrarErrorEnPantalla(err);
  }
  window.scrollTo(0, 0);
}

// Selector de Empresa en la Cabecera y Controles de Permisos RBAC
export function actualizarSelectorCabecera() {
  const select = document.getElementById('header-company-select');
  if (!select) return;

  const esSuperAdmin = auth.isSuperAdmin();
  const empresas = store.getEmpresas();
  const activaId = store.getEmpresaActivaId();

  if (esSuperAdmin) {
    select.disabled = false;
    select.classList.remove('cursor-default', 'opacity-95');
    select.classList.add('cursor-pointer');
    select.innerHTML = `
      <option value="todas" ${activaId === 'todas' ? 'selected' : ''}>🏢 Todas las Empresas (Panel Global)</option>
      ${empresas.map(e => `
        <option value="${e.id}" ${activaId === e.id ? 'selected' : ''}>
          ${e.razonSocial} (${e.estandaresAplicables} Estándares - Riesgo ${e.claseRiesgo})
        </option>
      `).join('')}
    `;
  } else {
    // Usuario de Empresa o Trabajador: estrictamente bloqueado a su única empresa
    select.disabled = true;
    select.classList.remove('cursor-pointer');
    select.classList.add('cursor-default', 'opacity-95');
    select.innerHTML = empresas.map(e => `
      <option value="${e.id}" selected>
        ${e.razonSocial} (${e.estandaresAplicables} Estándares - Riesgo ${e.claseRiesgo})
      </option>
    `).join('');
  }

  // Ocultar/mostrar controles exclusivos de Super Administrador en Cabecera y Sidebar
  const headerBtnNuevaEmpresa = document.querySelector('header a[href="#empresas"]');
  if (headerBtnNuevaEmpresa) {
    headerBtnNuevaEmpresa.classList.toggle('hidden', !esSuperAdmin);
  }

  const sidebarLinkEmpresas = document.querySelector('aside a.nav-link[href="#empresas"]');
  if (sidebarLinkEmpresas) {
    const svgIcon = sidebarLinkEmpresas.querySelector('svg');
    sidebarLinkEmpresas.innerHTML = '';
    if (svgIcon) sidebarLinkEmpresas.appendChild(svgIcon);
    sidebarLinkEmpresas.appendChild(document.createTextNode(esSuperAdmin ? ' Empresas Clientes' : ' Mi Empresa'));
  }

  const sidebarLinkRepoLegal = document.querySelector('aside a.nav-link[href="#repositorio-legal"]');
  if (sidebarLinkRepoLegal) {
    sidebarLinkRepoLegal.classList.toggle('hidden', !esSuperAdmin);
  }

  const sidebarLinkRepoBase = document.querySelector('aside a.nav-link[href="#repositorio-base"]');
  if (sidebarLinkRepoBase) {
    sidebarLinkRepoBase.classList.toggle('hidden', !esSuperAdmin);
  }

  const sidebarLinkSuperAdmins = document.querySelector('aside a.nav-link[href="#super-admins"]');
  if (sidebarLinkSuperAdmins) {
    sidebarLinkSuperAdmins.classList.toggle('hidden', !esSuperAdmin);
  }
  const sidebarSuperAdminGroup = document.getElementById('sidebar-superadmin-group');
  if (sidebarSuperAdminGroup) {
    sidebarSuperAdminGroup.classList.toggle('hidden', !esSuperAdmin);
  }

  // Ocultar selector rápido de rol (Admin | Trabajador | Auditor) y Respaldo/Restaurar global si no es Super Admin
  const quickRoleBtn = document.querySelector('aside button[onclick*="cambiarRol"]');
  if (quickRoleBtn && quickRoleBtn.parentElement) {
    quickRoleBtn.parentElement.classList.toggle('hidden', !esSuperAdmin);
  }
  const btnBackup = document.getElementById('btn-exportar-backup');
  if (btnBackup && btnBackup.parentElement) {
    btnBackup.parentElement.classList.toggle('hidden', !esSuperAdmin);
  }

  // Reflejar Logotipo Oficial de la Empresa Activa en la barra superior
  const logoContainer = document.getElementById('header-company-logo-container');
  const logoImg = document.getElementById('header-company-logo-img');
  const empActiva = store.getEmpresaActiva();
  if (logoContainer && logoImg) {
    if (empActiva && empActiva.logoUrl) {
      logoImg.src = empActiva.logoUrl;
      logoImg.title = `${empActiva.razonSocial} • Rep. Legal: ${empActiva.representanteLegal || 'No especificado'}`;
      logoContainer.classList.remove('hidden');
    } else {
      logoContainer.classList.add('hidden');
    }
  }

  actualizarSelectorAnioCabecera();
}

window.actualizarSelectorCabecera = actualizarSelectorCabecera;

// Selector General de Año en la Cabecera (Iniciando en 2025)
export function actualizarSelectorAnioCabecera() {
  const select = document.getElementById('header-year-select');
  if (!select) return;

  const anios = store.getAniosDisponibles();
  const anioActivo = store.getAnioActivo();

  select.innerHTML = anios.map(a => `
    <option value="${a}" ${anioActivo === a ? 'selected' : ''}>
      Año ${a} ${a === '2025' ? '(Inicial)' : ''}
    </option>
  `).join('');
}

window.actualizarSelectorAnioCabecera = actualizarSelectorAnioCabecera;

window.cambiarEmpresaActiva = function(id) {
  if (!auth.isSuperAdmin()) {
    const user = auth.getUser();
    if (user?.empresaId) {
      store.setEmpresaActivaId(user.empresaId);
    }
    return;
  }
  store.setEmpresaActivaId(id);
  actualizarSelectorCabecera();
  router();
};

window.cambiarAnioActivo = function(anio) {
  store.setAnioActivo(anio);
  actualizarSelectorAnioCabecera();
  window.mostrarNotificacion(`Vigencia cambiada al Año ${anio}`);
  router();
};

// Modal interactivo para aperturar nueva vigencia anual
window.abrirModalNuevoAnio = function() {
  const modalId = 'modal-nuevo-anio-sst';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4 transition-all animate-fadeIn';
    document.body.appendChild(modal);
  }

  const anios = store.getAniosDisponibles();
  const anioActivo = store.getAnioActivo();
  const empresaActiva = store.getEmpresaActiva();
  const siguienteAnio = (Math.max(...anios.map(a => parseInt(a, 10))) + 1).toString();

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
      <div class="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="p-2 bg-indigo-800 rounded-xl text-lg">📅</span>
          <div>
            <h3 class="font-bold text-sm text-white">Habilitar Nueva Vigencia Anual</h3>
            <p class="text-[11px] text-indigo-200">Autoevaluación de Estándares Mínimos por Año</p>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-indigo-300 hover:text-white transition p-1">
          ✕
        </button>
      </div>

      <div class="p-6 space-y-4">
        ${empresaActiva ? `
          <div class="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 text-xs">
            <span class="text-indigo-950 font-bold block">${empresaActiva.razonSocial}</span>
            <span class="text-indigo-700 text-[11px]">NIT: ${empresaActiva.nit} • ${empresaActiva.estandaresAplicables} Estándares Mínimos</span>
          </div>
        ` : `
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            Apertura de año a nivel global.
          </div>
        `}

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Nuevo Año de Vigencia a Aperturar:
          </label>
          <input type="number" id="input-nuevo-anio-valor" min="2025" max="2050" value="${siguienteAnio}" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <p class="text-[11px] text-slate-500 mt-1">La plataforma gestiona vigencias históricas y actuales iniciando desde el año 2025.</p>
        </div>

        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" id="check-copiar-base-anio" checked class="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500">
            <div>
              <span class="text-xs font-bold text-slate-800 block">Copiar estructura base y documentos guía del año anterior</span>
              <span class="text-[11px] text-slate-500 block mt-0.5">Traspasa los enlaces a Google Docs/Sheets y justificaciones preliminares para agilizar la auditoría de la nueva vigencia.</span>
            </div>
          </label>

          <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span class="text-slate-600 font-medium">Tomar base del año:</span>
            <select id="select-anio-base-origen" class="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700">
              ${anios.map(a => `<option value="${a}" ${a === anioActivo ? 'selected' : ''}>Año ${a}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition">
            Cancelar
          </button>
          <button type="button" id="btn-confirmar-nuevo-anio" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5">
            <span>Habilitar y Abrir Año</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-confirmar-nuevo-anio').onclick = () => {
    const inputVal = document.getElementById('input-nuevo-anio-valor')?.value?.trim();
    const copiarBase = document.getElementById('check-copiar-base-anio')?.checked;
    const anioOrigen = document.getElementById('select-anio-base-origen')?.value;

    if (!inputVal || !/^\d{4}$/.test(inputVal) || parseInt(inputVal, 10) < 2025) {
      alert("Por favor ingresa un año válido de 4 dígitos a partir del 2025 (ej. 2026, 2027).");
      return;
    }

    const cId = store.getEmpresaActivaId();
    const ok = store.abrirNuevoAnio(cId, inputVal, { copiarDeAnioAnterior: copiarBase, anioOrigen });
    if (ok) {
      document.getElementById(modalId)?.remove();
      actualizarSelectorCabecera();
      window.mostrarNotificacion(`¡Vigencia ${inputVal} aperturada exitosamente!`);
      router();
    } else {
      alert("No se pudo aperturar el año seleccionado. Verifica que haya una empresa activa seleccionada.");
    }
  };
};

// Sistema global de notificaciones visuales tipo Toast (Doctor Pyme)
window.mostrarNotificacion = function(mensaje, tipo = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bg = tipo === 'success' ? 'bg-slate-900 text-white border-l-4 border-emerald-500' : 'bg-red-900 text-white border-l-4 border-red-500';
  const icon = tipo === 'success' ? '✅' : '⚠️';
  toast.className = `${bg} shadow-2xl rounded-xl p-4 flex items-center gap-3 text-xs font-semibold pointer-events-auto transform translate-y-2 opacity-0 transition duration-300 ease-out`;
  toast.innerHTML = `
    <span class="text-base">${icon}</span>
    <div class="flex-1">${mensaje}</div>
  `;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Inicialización de la aplicación (resistente a diferimiento de módulos y readyState)
async function initApp() {
  // Asegurar que la base de datos del servidor se sincronice antes del login en navegadores nuevos
  try {
    await store.sincronizarConServidorFisico();
  } catch (e) {
    console.warn("Sincronización previa a login offline:", e);
  }

  // Verificación de Autenticación / Inicio de Sesión
  if (!auth.isAuthenticated()) {
    auth.renderLoginScreen(document.getElementById('app-root'), (user) => {
      const targetHash = user?.rol === 'Trabajador' ? '#portal-trabajador' : (user?.rol === 'Auditor' ? '#auditoria-sst' : '#dashboard');
      window.history.replaceState(null, '', window.location.pathname + targetHash);
      window.location.reload();
    });
    return;
  }

  // Cargar datos de usuario autenticado
  const user = auth.getUser();
  if (user) {
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    if (nameEl) nameEl.innerText = user.nombre;
    if (roleEl) roleEl.innerText = user.rol;
  }

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (confirm("¿Deseas cerrar tu sesión en Doctor Pyme?")) {
      auth.logout();
    }
  });

  actualizarSelectorCabecera();
  // initAiAssistantWidget desactivado según requerimiento de usuario
  
  const select = document.getElementById('header-company-select');
  if (select) {
    select.addEventListener('change', (e) => {
      window.cambiarEmpresaActiva(e.target.value);
    });
  }

  const yearSelect = document.getElementById('header-year-select');
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      window.cambiarAnioActivo(e.target.value);
    });
  }

  // Monitoreo en tiempo real del estado de guardado seguro
  store.onSaveStatus((info) => {
    const dot = document.getElementById('save-status-dot');
    const text = document.getElementById('save-status-text');
    const btn = document.getElementById('header-save-indicator');
    if (!dot || !text || !btn) return;

    if (info.status === 'ok') {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
      btn.className = 'flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer group';
      const hora = new Date(info.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      text.innerText = `Guardado (${hora})`;
    } else if (info.status === 'warning') {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping';
      btn.className = 'flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer group';
      text.innerText = `Guardado en Respaldo`;
    }
  });

  // Backup & Restore
  document.getElementById('btn-exportar-backup')?.addEventListener('click', () => {
    store.exportarJSON();
  });

  document.getElementById('input-importar-backup')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const ok = store.importarJSON(event.target.result);
        if (ok) {
          alert("¡Copia de respaldo restaurada exitosamente!");
          actualizarSelectorCabecera();
          router();
        } else {
          alert("El archivo seleccionado no tiene el formato válido de SG-SST.");
        }
      };
      reader.readAsText(file);
    }
  });

  window.addEventListener('hashchange', router);

  // Suscribirse a cambios del store para re-renderizado reactivo inteligente
  let routerDebounceTimer = null;
  store.subscribe(() => {
    actualizarSelectorCabecera();

    // Si el usuario está interactuando activamente con un formulario, input o modal, no interrumpir con re-renderizado
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable);
    const isModalOpen = document.querySelector('#modal-empresa:not(.hidden), #modal-riesgo:not(.hidden), #modal-pat:not(.hidden), #modal-accidente:not(.hidden), #modal-doc-vincular:not(.hidden), #modal-visor-documento:not(.hidden), #modal-visor-diagrama:not(.hidden)');

    if (isTyping || isModalOpen) {
      return;
    }

    if (routerDebounceTimer) clearTimeout(routerDebounceTimer);
    routerDebounceTimer = setTimeout(() => {
      router();
    }, 200);
  });

  // Render inicial inmediato para interactividad instantánea sin retrasos
  actualizarSelectorCabecera();
  router();

  // Asegurar que la información física de disco se descargue y sincronice
  try {
    await store.sincronizarConServidorFisico();
  } catch (e) {
    console.warn("Inicio offline con almacenamiento local:", e);
  }

  actualizarSelectorCabecera();
  router();
}

// Modal Diagnóstico de Almacenamiento Seguro y Trazabilidad (Decreto 1072)
window.mostrarDiagnosticoAlmacenamiento = function() {
  const diag = store.getStorageDiagnostics();
  const empresa = store.getEmpresaActiva();
  const modalId = 'modal-diagnostico-almacenamiento';

  const modalExistente = document.getElementById(modalId);
  if (modalExistente) modalExistente.remove();

  const modalHtml = `
    <div id="${modalId}" class="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
        
        <div class="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex justify-between items-center flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              🛡️
            </div>
            <div>
              <h3 class="font-bold text-base leading-tight">Persistencia Física & Trazabilidad SG-SST</h3>
              <p class="text-xs text-emerald-100">Decreto 1072 de 2015 (Art. 2.2.4.6.13) & Res. 0312</p>
            </div>
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" class="text-white/80 hover:text-white text-xl font-bold p-1 cursor-pointer">✕</button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto flex-1">
          
          <!-- Triple Motor de Persistencia -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl">
              <div class="flex items-center gap-1.5 text-indigo-900 font-bold text-xs mb-1">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span> Disco Físico (Mac)
              </div>
              <p class="text-[11px] text-slate-700 font-semibold truncate" title="data/database.json">data/database.json</p>
              <p class="text-[10px] text-indigo-700 mt-0.5 font-bold">100% Blindado en Disco</p>
            </div>

            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div class="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                <span class="w-2 h-2 rounded-full bg-emerald-600"></span> LocalStorage (Caché)
              </div>
              <p class="text-[11px] text-slate-600 font-medium">Uso: <strong>${diag.sizeKB} KB</strong></p>
              <p class="text-[10px] text-emerald-700 mt-0.5">Sincronización instantánea</p>
            </div>

            <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div class="flex items-center gap-1.5 text-blue-800 font-bold text-xs mb-1">
                <span class="w-2 h-2 rounded-full bg-blue-600"></span> IndexedDB (Espejo)
              </div>
              <p class="text-[11px] text-slate-600 font-medium">Capacidad: <strong>>500 MB</strong></p>
              <p class="text-[10px] text-blue-700 mt-0.5">Instantánea offline</p>
            </div>
          </div>

          <!-- Resumen de registros asegurados -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div class="text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
              <span>Registros Asegurados en Servidor:</span>
              <span class="text-indigo-600 font-extrabold truncate max-w-[200px]">${empresa ? empresa.razonSocial : 'Ladrillos Ochoa Ltda.'}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center pt-1">
              <div class="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span class="text-xs font-black text-slate-800 block">${diag.totalEvaluaciones}</span>
                <span class="text-[10px] text-slate-500">Evaluaciones</span>
              </div>
              <div class="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span class="text-xs font-black text-slate-800 block">${diag.totalMatriz}</span>
                <span class="text-[10px] text-slate-500">Riesgos GTC 45</span>
              </div>
              <div class="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span class="text-xs font-black text-slate-800 block">${diag.totalPlan}</span>
                <span class="text-[10px] text-slate-500">Actividades PAT</span>
              </div>
            </div>
            <p class="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
              <span>🕒 Última sincronización física:</span>
              <strong class="text-emerald-700 font-bold">${new Date(diag.lastSaved).toLocaleTimeString()}</strong>
            </p>
          </div>

          <!-- Pestañas de Acciones Especiales (Backups & Auditoría) -->
          <div class="border border-slate-200 rounded-xl p-3 bg-white space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🗄️</span> Copias Automáticas & Trazabilidad Legal
              </span>
              <div class="flex gap-1.5">
                <button onclick="window.cargarListaBackups()" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition cursor-pointer">
                  Ver Backups (.json)
                </button>
                <button onclick="window.cargarListaAuditoria()" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition cursor-pointer">
                  Libro Trazabilidad
                </button>
              </div>
            </div>
            <div id="contenedor-detalle-respaldos" class="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-300">
              Presiona <strong>Ver Backups</strong> para consultar las copias históricas almacenadas en tu disco duro (carpeta <code>backups/</code>).
            </div>
          </div>

          <!-- Acciones de Descarga de Respaldo -->
          <div class="flex gap-2 pt-1 flex-shrink-0">
            <button onclick="store.exportarJSON();" class="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Descargar Respaldo Manual (.json)
            </button>
            <button onclick="document.getElementById('${modalId}').remove();" class="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
              Cerrar
            </button>
          </div>

        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Cargar listado de backups físicos disponibles en el servidor
window.cargarListaBackups = async function() {
  const container = document.getElementById('contenedor-detalle-respaldos');
  if (!container) return;
  container.innerHTML = '<div class="text-center py-2 text-indigo-600 font-semibold">Consultando copias en disco duro (backups/)...</div>';

  const backups = await store.getBackupsList();
  if (!backups || backups.length === 0) {
    container.innerHTML = '<div class="text-slate-500 py-1">Aún no hay copias rotativas generadas en la carpeta <code>backups/</code>. Se generarán automáticamente al editar.</div>';
    return;
  }

  let html = `
    <div class="space-y-1.5 max-h-40 overflow-y-auto">
      <div class="font-bold text-slate-700 text-[11px] mb-1">Copias de seguridad disponibles en tu Mac (${backups.length}):</div>
  `;
  backups.slice(0, 8).forEach(b => {
    html += `
      <div class="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200 text-[11px]">
        <div class="overflow-hidden mr-2">
          <strong class="text-slate-800 block truncate">${b.filename}</strong>
          <span class="text-[10px] text-slate-400">${new Date(b.createdAt).toLocaleString()} · ${b.sizeKB} KB</span>
        </div>
        <button onclick="window.restaurarCopiaSeguridad('${b.filename}')" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[10px] flex-shrink-0 cursor-pointer">
          Restaurar
        </button>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
};

// Cargar libro de trazabilidad y auditoría (Decreto 1072)
window.cargarListaAuditoria = async function() {
  const container = document.getElementById('contenedor-detalle-respaldos');
  if (!container) return;
  container.innerHTML = '<div class="text-center py-2 text-indigo-600 font-semibold">Consultando libro de trazabilidad (data/audit_log.jsonl)...</div>';

  const trail = await store.getAuditTrail();
  if (!trail || trail.length === 0) {
    container.innerHTML = '<div class="text-slate-500 py-1">Sin entradas registradas aún en el log de auditoría.</div>';
    return;
  }

  let html = `
    <div class="space-y-1.5 max-h-40 overflow-y-auto">
      <div class="font-bold text-slate-700 text-[11px] mb-1">Últimos eventos registrados legalmente (${trail.length}):</div>
  `;
  trail.slice(0, 6).forEach(t => {
    html += `
      <div class="p-1.5 bg-white rounded border border-slate-200 text-[11px]">
        <div class="flex justify-between items-center">
          <span class="font-black text-indigo-700 text-[10px]">${t.action}</span>
          <span class="text-[10px] text-slate-400">${new Date(t.timestamp).toLocaleTimeString()}</span>
        </div>
        <p class="text-[10px] text-slate-600 mt-0.5">Empresa: <strong>${t.empresaActiva || 'Ladrillos Ochoa Ltda.'}</strong> · Bytes: ${t.bytes} · Evaluaciones: ${t.totalEvaluaciones || 0}</p>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
};

// Restaurar copia de seguridad desde el modal
window.restaurarCopiaSeguridad = async function(filename) {
  if (confirm(`¿Deseas restaurar la información desde la copia de seguridad "${filename}"? Esta acción reemplazará los datos actuales por los de este punto en el tiempo.`)) {
    const ok = await store.restaurarDesdeBackup(filename);
    if (ok) {
      alert(`✓ Datos restaurados exitosamente desde "${filename}". La plataforma se actualizará de inmediato.`);
      window.location.reload();
    } else {
      alert("No se pudo restaurar la copia de seguridad seleccionada.");
    }
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
