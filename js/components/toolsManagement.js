// =============================================================================
// MÓDULO: GESTIÓN DE HERRAMIENTAS Y EQUIPOS (SaaS MULTITENANT)
// Entidades: tools_inventory, tools_sst, tools_maintenance_plan,
//            tools_assignments, tools_interventions_log, data_privacy_consents
// Cumplimiento Legal: Res. 0312 de 2019 (Estándar 2.4.1) & Dec. 1072 de 2015
// =============================================================================
import { store } from '../store.js';
import { auth } from '../auth.js';

const POLICY_VERSION_ACTUAL = 'v1.0-2026';

// Proyectos y Centros de Trabajo sugeridos por Tenant
const PROYECTOS_PREDEFINIDOS = {
  'emp-1790438946268': [
    { id: 'PRJ-01', nombre: 'PRJ-01 Planta Principal Ladrillera' },
    { id: 'PRJ-02', nombre: 'PRJ-02 Horno Túnel Tunja' },
    { id: 'PRJ-03', nombre: 'PRJ-03 Mantenimiento Mecánico y Patios' },
    { id: 'PRJ-04', nombre: 'PRJ-04 Cantera y Extracción de Arcilla' }
  ],
  'emp-1792009016839': [
    { id: 'PRJ-OBRA-101', nombre: 'PRJ-OBRA-101 Mantenimiento Fachadas Calle 100' },
    { id: 'PRJ-OBRA-102', nombre: 'PRJ-OBRA-102 Remodelación Edificio Empresarial Sur' },
    { id: 'PRJ-OBRA-103', nombre: 'PRJ-OBRA-103 Mantenimiento Locativo Industrial' }
  ],
  'emp-1792010387578': [
    { id: 'PRJ-CARP-201', nombre: 'PRJ-CARP-201 Taller de Ensamble y Corte' },
    { id: 'PRJ-CARP-202', nombre: 'PRJ-CARP-202 Acabados, Lijado y Barnizado' },
    { id: 'PRJ-CARP-203', nombre: 'PRJ-CARP-203 Instalaciones en Obra y Mobiliario' }
  ]
};

// Variable de estado local del módulo
let estadoFiltros = {
  tipo: 'todos',
  estado: 'todos',
  busqueda: ''
};

// =============================================================================
// MIDDLEWARE DE SEGURIDAD Y PRIVACIDAD MULTITENANT
// =============================================================================
function ejecutarMiddlewareSeguridad(callback) {
  // La Política de Tratamiento de Datos se autoriza y firma 1 única vez al registrar la empresa.
  // No se solicita al ingresar al módulo de Herramientas y Equipos.
  if (typeof callback === 'function') callback();
}

// Modal Interactivo de Consentimientos de Privacidad y Custodia
function mostrarModalConsentimientoPrivacidad(tenantId, userId, onAprobado) {
  const empresa = store.getEmpresaActiva();
  const modalId = 'modal-privacy-consent';
  let modalEl = document.getElementById(modalId);
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
      
      <!-- Cabecera Legal -->
      <div class="p-6 bg-linear-to-r from-teal-900 via-slate-900 to-indigo-950 text-white relative">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-2xl">
            🛡️
          </div>
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider text-teal-300">Middleware de Seguridad y Cumplimiento Legal</span>
            <h3 class="text-lg font-black leading-tight">Consentimiento de Privacidad y Custodia de Activos</h3>
            <p class="text-xs text-slate-300 mt-0.5">Empresa: <strong class="text-white">${empresa?.razonSocial || 'Empresa Cliente'}</strong> (NIT: ${empresa?.nit || 'N/A'})</p>
          </div>
        </div>
      </div>

      <!-- Contenido Legal con Scroll -->
      <div class="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed border-b border-slate-100 flex-1">
        <div class="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-medium">
          ℹ️ Para operar el módulo de <strong>Gestión de Herramientas y Equipos</strong>, la legislación colombiana (Ley 1581 de 2012, Dec. 1072 de 2015 y Res. 2400 de 1979) exige la aceptación expresa de las siguientes políticas de tratamiento y custodia.
        </div>

        <!-- 1. Habeas Data -->
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50">
          <div class="flex items-start gap-3">
            <input type="checkbox" id="chk-consent-habeas" class="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer">
            <label for="chk-consent-habeas" class="cursor-pointer">
              <strong class="text-slate-800 text-xs block mb-1">1. Política de Tratamiento de Datos Personales (Habeas Data)</strong>
              <span class="text-[11px] text-slate-500 block">
                Autorizo de manera libre y expresa a <strong>${empresa?.razonSocial}</strong> y a la plataforma Doctor Pyme para recopilar, almacenar y procesar mis datos de identificación laboral, firmas digitales y registros de custodia con fines exclusivos de gestión de SST y auditoría ministerial.
              </span>
            </label>
          </div>
        </div>

        <!-- 2. Confidencialidad Empresarial -->
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50">
          <div class="flex items-start gap-3">
            <input type="checkbox" id="chk-consent-confidencialidad" class="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer">
            <label for="chk-consent-confidencialidad" class="cursor-pointer">
              <strong class="text-slate-800 text-xs block mb-1">2. Acuerdo de Confidencialidad sobre Activos e Infraestructura</strong>
              <span class="text-[11px] text-slate-500 block">
                Me comprometo a mantener estricta reserva sobre las especificaciones técnicas, números de serie, variables operativas, costos y documentación técnica de la maquinaria y herramientas asignadas.
              </span>
            </label>
          </div>
        </div>

        <!-- 3. Custodia de Activos y Uso Seguro -->
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50">
          <div class="flex items-start gap-3">
            <input type="checkbox" id="chk-consent-custodia" class="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer">
            <label for="chk-consent-custodia" class="cursor-pointer">
              <strong class="text-slate-800 text-xs block mb-1">3. Protocolo de Custodia, Asignación y Operación Segura</strong>
              <span class="text-[11px] text-slate-500 block">
                Declaro conocer que toda herramienta en estado <em>"En Funcionamiento"</em> queda bajo custodia formal del empleado y proyecto asignado, con obligación de realizar inspección preoperacional, usar los EPP reglamentarios y reportar de inmediato cualquier daño para mantenimiento.
              </span>
            </label>
          </div>
        </div>

        <!-- Metadatos de Auditoría Legal -->
        <div class="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-500 flex items-center justify-between">
          <span>Usuario autenticado: <strong>${userId}</strong></span>
          <span>Versión Normativa: <strong>${POLICY_VERSION_ACTUAL}</strong></span>
          <span>IP estimada: <strong>186.84.90.114</strong></span>
        </div>
      </div>

      <!-- Pie del Modal con Acción de Firma -->
      <div class="p-5 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span class="text-[11px] text-slate-400 font-medium">Se generará un sello de tiempo y hash criptográfico inmutable.</span>
        <button id="btn-firmar-consentimientos" class="w-full sm:w-auto px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-700/20 transition flex items-center justify-center gap-2 cursor-pointer">
          <span>✍️ Aceptar y Firmar Digitalmente Consentimientos</span>
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);

  document.getElementById('btn-firmar-consentimientos').onclick = () => {
    const chk1 = document.getElementById('chk-consent-habeas').checked;
    const chk2 = document.getElementById('chk-consent-confidencialidad').checked;
    const chk3 = document.getElementById('chk-consent-custodia').checked;

    if (!chk1 || !chk2 || !chk3) {
      alert('Debes marcar y aceptar las 3 cláusulas obligatorias para poder operar el módulo de herramientas y equipos.');
      return;
    }

    store.saveDataPrivacyConsents(tenantId, userId, '186.84.90.114', POLICY_VERSION_ACTUAL);
    modalEl.remove();
    if (typeof onAprobado === 'function') onAprobado();
  };
}

// =============================================================================
// RENDER PRINCIPAL TIPO DASHBOARD (VISTA DEL MÓDULO)
// =============================================================================
export function renderToolsModule() {
  const container = document.getElementById('main-content');
  if (!container) return;

  // Ejecutar Middleware de Seguridad antes de mostrar datos
  ejecutarMiddlewareSeguridad(() => {
    renderizarDashboardHerramientas(container);
  });
}

function renderizarDashboardHerramientas(container) {
  const tenantId = store.getEmpresaActivaId();
  const empresa = store.getEmpresaActiva();
  const herramientas = store.getToolsInventory(tenantId);

  // KPIs
  const totalHerramientas = herramientas.length;
  const enFuncionamiento = herramientas.filter(h => h.current_status === 'En Funcionamiento').length;
  const enMantenimiento = herramientas.filter(h => h.current_status === 'En Mantenimiento').length;
  const enAlmacenamiento = herramientas.filter(h => h.current_status === 'En Almacenamiento').length;

  const pctFuncionamiento = totalHerramientas > 0 ? Math.round((enFuncionamiento / totalHerramientas) * 100) : 0;
  const pctMantenimiento = totalHerramientas > 0 ? Math.round((enMantenimiento / totalHerramientas) * 100) : 0;

  // Alertas de mantenimiento vencido o próximo a vencer (< 7 días)
  const hoyStr = new Date().toISOString().split('T')[0];
  const fechaLimite7Dias = new Date();
  fechaLimite7Dias.setDate(fechaLimite7Dias.getDate() + 7);
  const limiteStr = fechaLimite7Dias.toISOString().split('T')[0];

  let mantenimientoVencidoCount = 0;
  let proximoVencerCount = 0;

  herramientas.forEach(h => {
    const plan = store.getToolMaintenancePlan(h.id);
    if (plan && plan.next_date) {
      if (plan.next_date <= hoyStr) {
        mantenimientoVencidoCount++;
      } else if (plan.next_date <= limiteStr) {
        proximoVencerCount++;
      }
    }
  });

  // Filtrado de herramientas
  let herramientasFiltradas = herramientas.filter(h => {
    if (estadoFiltros.tipo !== 'todos' && h.tool_type !== estadoFiltros.tipo) return false;
    if (estadoFiltros.estado !== 'todos' && h.current_status !== estadoFiltros.estado) return false;
    if (estadoFiltros.busqueda) {
      const q = estadoFiltros.busqueda.toLowerCase();
      const matchCod = (h.internal_code || '').toLowerCase().includes(q);
      const matchNom = (h.exact_name || '').toLowerCase().includes(q);
      const matchMar = (h.brand || '').toLowerCase().includes(q);
      const matchMod = (h.model || '').toLowerCase().includes(q);
      const matchSer = (h.serial_number || '').toLowerCase().includes(q);
      if (!matchCod && !matchNom && !matchMar && !matchMod && !matchSer) return false;
    }
    return true;
  });

  container.innerHTML = `
    <div class="space-y-6 animate-fadeIn pb-16">
      
      <!-- Cabecera del Módulo con Aislamiento Tenant -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-2xl">🛠️</span>
            <h2 class="text-xl font-black text-slate-800">Gestión de Herramientas y Equipos</h2>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Tenant ID: ${tenantId}
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Estándar 2.4.1 • Res. 0312
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1 max-w-3xl">
            Control integral de inventario técnico, matrices SST, custodia por trabajador, variables operativas y programa preventivo para <strong class="text-slate-700">${empresa?.razonSocial || 'la empresa activa'}</strong>.
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button id="btn-registrar-intervencion-global" class="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <span>🔧</span> Intervención / Taller
          </button>
          <button id="btn-asignar-herramienta-global" class="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <span>📋</span> Asignar Activo
          </button>
          <button id="btn-nueva-herramienta" class="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-700/20 transition flex items-center gap-1.5 cursor-pointer">
            <span>➕</span> Nueva Herramienta
          </button>
        </div>
      </div>

      <!-- TARJETAS DE RESUMEN EJECUTIVO (KPIs) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- KPI 1: Total Herramientas -->
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total en Inventario</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-3xl font-black text-slate-800">${totalHerramientas}</span>
              <span class="text-xs font-bold text-slate-500">Activos registrados</span>
            </div>
            <span class="text-[11px] text-slate-400 mt-1 block">${enAlmacenamiento} en bodega</span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-bold">
            📦
          </div>
        </div>

        <!-- KPI 2: % En Funcionamiento -->
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">% En Funcionamiento</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-3xl font-black text-emerald-600">${pctFuncionamiento}%</span>
              <span class="text-xs font-bold text-emerald-700">${enFuncionamiento} activos</span>
            </div>
            <div class="w-32 bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${pctFuncionamiento}%"></div>
            </div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            ⚡
          </div>
        </div>

        <!-- KPI 3: % En Mantenimiento -->
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">% En Mantenimiento</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-3xl font-black text-amber-600">${pctMantenimiento}%</span>
              <span class="text-xs font-bold text-amber-700">${enMantenimiento} en taller</span>
            </div>
            <span class="text-[11px] text-amber-600 font-semibold mt-1 block">
              ${enMantenimiento > 0 ? '⛔ Bloqueadas para obra' : 'Equipos disponibles'}
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
            🔧
          </div>
        </div>

        <!-- KPI 4: Alertas de Mantenimiento Vencido -->
        <div class="bg-white border ${mantenimientoVencidoCount > 0 ? 'border-red-300 bg-red-50/30' : 'border-slate-200'} rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider ${mantenimientoVencidoCount > 0 ? 'text-red-700' : 'text-slate-400'} block">Alertas de Mantenimiento</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-3xl font-black ${mantenimientoVencidoCount > 0 ? 'text-red-600' : 'text-slate-800'}">${mantenimientoVencidoCount}</span>
              <span class="text-xs font-bold ${mantenimientoVencidoCount > 0 ? 'text-red-700' : 'text-slate-500'}">Vencidos</span>
            </div>
            <span class="text-[11px] text-slate-500 mt-1 block">
              ${proximoVencerCount > 0 ? `⚠️ ${proximoVencerCount} por vencer (<7d)` : '✓ Planes al día'}
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl ${mantenimientoVencidoCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'} flex items-center justify-center text-xl font-bold">
            🚨
          </div>
        </div>

      </div>

      <!-- BARRA DE FILTROS Y BÚSQUEDA -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        
        <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <!-- Filtro por Tipo -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="font-bold text-slate-500 uppercase text-[10px]">Tipo:</span>
            <select id="filtro-tipo" class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium">
              <option value="todos" ${estadoFiltros.tipo === 'todos' ? 'selected' : ''}>Todos los Tipos</option>
              <option value="Manual" ${estadoFiltros.tipo === 'Manual' ? 'selected' : ''}>Manual</option>
              <option value="Eléctrica" ${estadoFiltros.tipo === 'Eléctrica' ? 'selected' : ''}>Eléctrica</option>
              <option value="Industrial" ${estadoFiltros.tipo === 'Industrial' ? 'selected' : ''}>Industrial</option>
              <option value="Neumática" ${estadoFiltros.tipo === 'Neumática' ? 'selected' : ''}>Neumática</option>
              <option value="Medición" ${estadoFiltros.tipo === 'Medición' ? 'selected' : ''}>Medición</option>
            </select>
          </div>

          <!-- Filtro por Estado -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="font-bold text-slate-500 uppercase text-[10px]">Estado:</span>
            <select id="filtro-estado" class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium">
              <option value="todos" ${estadoFiltros.estado === 'todos' ? 'selected' : ''}>Todos los Estados</option>
              <option value="En Almacenamiento" ${estadoFiltros.estado === 'En Almacenamiento' ? 'selected' : ''}>En Almacenamiento</option>
              <option value="En Funcionamiento" ${estadoFiltros.estado === 'En Funcionamiento' ? 'selected' : ''}>En Funcionamiento</option>
              <option value="En Mantenimiento" ${estadoFiltros.estado === 'En Mantenimiento' ? 'selected' : ''}>En Mantenimiento</option>
            </select>
          </div>
        </div>

        <!-- Búsqueda en Vivo -->
        <div class="relative w-full md:w-80">
          <input 
            type="text" 
            id="input-busqueda-herramientas" 
            placeholder="Buscar por código, nombre, marca, serie..." 
            value="${estadoFiltros.busqueda}"
            class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>

      </div>

      <!-- CATÁLOGO / GRILLA DE ACTIVOS -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${herramientasFiltradas.length === 0 ? `
          <div class="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
            <span class="text-4xl block mb-2">🔍</span>
            <p class="font-bold text-slate-700 text-sm">No se encontraron herramientas o equipos para este criterio</p>
            <p class="text-xs text-slate-400 mt-1">Modifica los filtros o registra un nuevo activo con el botón superior.</p>
          </div>
        ` : herramientasFiltradas.map(h => renderCardHerramienta(h, hoyStr, limiteStr)).join('')}
      </div>

    </div>
  `;

  // Asignar Listeners de Filtros y Botones
  vincularEventosDashboard();
}

// Renderizado de cada Tarjeta de Herramienta
function renderCardHerramienta(h, hoyStr, limiteStr) {
  const plan = store.getToolMaintenancePlan(h.id);
  const activeAssignment = store.getActiveToolAssignment(h.id);
  const trabajador = activeAssignment ? store.getTrabajadorPorId(activeAssignment.employee_id) : null;
  const sst = store.getToolSST(h.id);

  // Estado Badge
  let badgeEstado = '';
  if (h.current_status === 'En Funcionamiento') {
    badgeEstado = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">🟢 En Funcionamiento</span>';
  } else if (h.current_status === 'En Mantenimiento') {
    badgeEstado = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">⚠️ En Mantenimiento</span>';
  } else {
    badgeEstado = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">📦 En Almacenamiento</span>';
  }

  // Estado Mantenimiento
  let semaforoMantenimiento = '';
  if (plan && plan.next_date) {
    if (plan.next_date <= hoyStr) {
      semaforoMantenimiento = `<span class="text-red-600 font-bold text-[10px] flex items-center gap-1">🚨 Mantenimiento Vencido (${plan.next_date})</span>`;
    } else if (plan.next_date <= limiteStr) {
      semaforoMantenimiento = `<span class="text-amber-600 font-bold text-[10px] flex items-center gap-1">⚠️ Próximo a vencer (${plan.next_date})</span>`;
    } else {
      semaforoMantenimiento = `<span class="text-emerald-700 font-bold text-[10px] flex items-center gap-1">✓ Al día: ${plan.next_date}</span>`;
    }
  } else {
    semaforoMantenimiento = `<span class="text-slate-400 text-[10px]">Sin plan programado</span>`;
  }

  // Variables operativas resumidas
  const vars = h.operative_vars || {};
  const varsEntries = Object.entries(vars).slice(0, 3);

  return `
    <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
      <div>
        
        <!-- Cabecera de la tarjeta -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
              <img src="${h.photo_url || './assets/app-icon.png'}" alt="${h.exact_name}" class="w-full h-full object-cover" onerror="this.src='./assets/app-icon.png'">
            </div>
            <div>
              <span class="text-[10px] font-black uppercase text-teal-700 tracking-wider block">${h.internal_code} • ${h.tool_type}</span>
              <h4 class="text-xs font-black text-slate-800 leading-snug group-hover:text-teal-700 transition">${h.exact_name}</h4>
              <span class="text-[11px] text-slate-400 block">${h.brand} • Mod: ${h.model}</span>
            </div>
          </div>
          ${badgeEstado}
        </div>

        <!-- Ficha Técnica Rápida -->
        <div class="p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-3 space-y-1.5 text-xs">
          <div class="flex justify-between text-[11px]">
            <span class="text-slate-400 font-medium">Serial:</span>
            <span class="font-mono font-bold text-slate-700">${h.serial_number || 'S/N'}</span>
          </div>
          <div class="flex justify-between text-[11px]">
            <span class="text-slate-400 font-medium">Valor Comercial:</span>
            <span class="font-bold text-slate-700">$ ${(Number(h.commercial_value) || 0).toLocaleString('es-CO')}</span>
          </div>
          <div class="flex justify-between text-[11px]">
            <span class="text-slate-400 font-medium">Vida Útil Restante:</span>
            <span class="font-bold text-teal-800">${h.useful_life_years} años</span>
          </div>

          <!-- Variables Operativas Pills -->
          ${varsEntries.length > 0 ? `
            <div class="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1">
              ${varsEntries.map(([k, v]) => `
                <span class="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600">
                  ${k}: <strong>${v}</strong>
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Asignación Actual -->
        <div class="mb-3 text-[11px]">
          ${h.current_status === 'En Funcionamiento' && activeAssignment ? `
            <div class="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span class="text-[9px] font-black uppercase text-emerald-800 block">Asignado a:</span>
              <strong class="text-emerald-950 font-bold block">${trabajador?.nombre || 'Empleado'}</strong>
              <span class="text-[10px] text-emerald-700 font-medium block">Proyecto: ${activeAssignment.project_id}</span>
            </div>
          ` : h.current_status === 'En Mantenimiento' ? `
            <div class="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[10px] font-bold">
              ⛔ En Taller / Revisión Técnica
            </div>
          ` : `
            <div class="p-2 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-500 text-[10px] font-medium">
              📦 Disponible en Bodega / Almacén Central
            </div>
          `}
        </div>

        <!-- Semáforo de Mantenimiento -->
        <div class="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 mb-3">
          <span class="text-slate-400 font-medium">Plan ${plan?.type || 'Prev.'}:</span>
          ${semaforoMantenimiento}
        </div>

      </div>

      <!-- Botones de Acción de la Tarjeta -->
      <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        <button 
          onclick="window.abrirModalDetalleHerramienta('${h.id}')"
          class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>👁️ Detalle</span>
        </button>
        <button 
          onclick="window.abrirModalAsignacion('${h.id}')"
          ${h.current_status === 'En Mantenimiento' ? 'disabled' : ''}
          class="w-full py-2 ${h.current_status === 'En Mantenimiento' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-teal-700 hover:bg-teal-800 text-white'} rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
          title="${h.current_status === 'En Mantenimiento' ? 'Bloqueada por estar en mantenimiento' : 'Asignar activo a trabajador y proyecto'}"
        >
          <span>${h.current_status === 'En Funcionamiento' ? '🔄 Reasignar' : '📋 Asignar'}</span>
        </button>
      </div>

    </div>
  `;
}

// =============================================================================
// VINCULACIÓN DE EVENTOS DEL DASHBOARD
// =============================================================================
function vincularEventosDashboard() {
  const selectTipo = document.getElementById('filtro-tipo');
  if (selectTipo) {
    selectTipo.onchange = (e) => {
      estadoFiltros.tipo = e.target.value;
      renderToolsModule();
    };
  }

  const selectEstado = document.getElementById('filtro-estado');
  if (selectEstado) {
    selectEstado.onchange = (e) => {
      estadoFiltros.estado = e.target.value;
      renderToolsModule();
    };
  }

  const inputBusqueda = document.getElementById('input-busqueda-herramientas');
  if (inputBusqueda) {
    inputBusqueda.oninput = (e) => {
      estadoFiltros.busqueda = e.target.value;
      renderToolsModule();
    };
  }

  const btnNuevo = document.getElementById('btn-nueva-herramienta');
  if (btnNuevo) {
    btnNuevo.onclick = () => window.abrirModalCrearHerramienta();
  }

  const btnAsignar = document.getElementById('btn-asignar-herramienta-global');
  if (btnAsignar) {
    btnAsignar.onclick = () => window.abrirModalAsignacion();
  }

  const btnIntervencion = document.getElementById('btn-registrar-intervencion-global');
  if (btnIntervencion) {
    btnIntervencion.onclick = () => window.abrirModalIntervencion();
  }

  const btnConsents = document.getElementById('btn-abrir-consentimientos');
  if (btnConsents) {
    btnConsents.onclick = () => {
      const tenantId = store.getEmpresaActivaId();
      const user = auth.getUser();
      mostrarModalConsentimientoPrivacidad(tenantId, user?.email || 'i.gonzalez.dsilva@gmail.com', () => {
        renderToolsModule();
      });
    };
  }
}

// =============================================================================
// VISTA DETALLE DEL ACTIVO (MODAL MULTIPESTAÑAS + 3 EXPORTABLES PDF)
// =============================================================================
window.abrirModalDetalleHerramienta = function(toolId) {
  const tool = store.getToolById(toolId);
  if (!tool) return;

  const tenantId = store.getEmpresaActivaId();
  const empresa = store.getEmpresaActiva();
  const sst = store.getToolSST(toolId) || { hazards: [], preventive_measures: '', required_epp: [] };
  const plan = store.getToolMaintenancePlan(toolId) || { type: 'Preventivo', periodicity_days: 90, last_date: 'N/A', next_date: 'N/A' };
  const intervenciones = store.getToolInterventions(toolId);
  const asignaciones = store.getToolAssignments(toolId);
  const activeAssignment = store.getActiveToolAssignment(toolId);
  const trabajadorActivo = activeAssignment ? store.getTrabajadorPorId(activeAssignment.employee_id) : null;

  const modalId = 'modal-detalle-herramienta';
  let modalEl = document.getElementById(modalId);
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
      
      <!-- Cabecera del Activo -->
      <div class="p-6 bg-linear-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-white/10 p-1 border border-white/20 flex-shrink-0 overflow-hidden">
            <img src="${tool.photo_url || './assets/app-icon.png'}" alt="${tool.exact_name}" class="w-full h-full object-cover rounded-xl" onerror="this.src='./assets/app-icon.png'">
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-400/30">
                ${tool.internal_code}
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                ${tool.tool_type}
              </span>
            </div>
            <h3 class="text-base sm:text-lg font-black text-white mt-1 leading-snug">${tool.exact_name}</h3>
            <p class="text-xs text-slate-300">${tool.brand} • Modelo: ${tool.model} • S/N: ${tool.serial_number || 'N/A'}</p>
          </div>
        </div>

        <!-- 3 BOTONES EXPORTABLES PDF -->
        <div class="flex items-center gap-2 flex-wrap">
          <button onclick="window.generarPdfHojaDeVida('${tool.id}')" class="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer" title="Exportar Hoja de Vida Oficial en PDF">
            <span>📄</span> Hoja de Vida
          </button>
          <button onclick="window.generarPdfFichaSST('${tool.id}')" class="px-3 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md" title="Exportar Ficha de Seguridad SST en PDF">
            <span>🛡️</span> Ficha SST
          </button>
          <button onclick="window.generarPdfPlanMantenimiento('${tool.id}')" class="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md" title="Exportar Plan de Mantenimiento en PDF">
            <span>📅</span> Plan Mantenimiento
          </button>
          <button onclick="document.getElementById('${modalId}').remove()" class="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer text-lg">
            ✕
          </button>
        </div>
      </div>

      <!-- Barra de Pestañas (Tabs) -->
      <div class="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-bold overflow-x-auto">
        <button id="tab-btn-general" onclick="window.cambiarPestanaDetalle('general')" class="tab-detalle-btn py-3.5 px-4 text-teal-700 border-b-2 border-teal-700 transition cursor-pointer flex items-center gap-1.5">
          <span>⚙️</span> General / Técnica
        </button>
        <button id="tab-btn-sst" onclick="window.cambiarPestanaDetalle('sst')" class="tab-detalle-btn py-3.5 px-4 text-slate-500 hover:text-slate-800 transition cursor-pointer flex items-center gap-1.5">
          <span>🛡️</span> Matriz SST
        </button>
        <button id="tab-btn-mantenimiento" onclick="window.cambiarPestanaDetalle('mantenimiento')" class="tab-detalle-btn py-3.5 px-4 text-slate-500 hover:text-slate-800 transition cursor-pointer flex items-center gap-1.5">
          <span>📅</span> Plan Mantenimiento
        </button>
        <button id="tab-btn-historial" onclick="window.cambiarPestanaDetalle('historial')" class="tab-detalle-btn py-3.5 px-4 text-slate-500 hover:text-slate-800 transition cursor-pointer flex items-center gap-1.5">
          <span>📜</span> Historial Cronológico
        </button>
      </div>

      <!-- Contenedores de las Pestañas -->
      <div class="p-6 overflow-y-auto flex-1 text-xs text-slate-700 space-y-4">
        
        <!-- PESTAÑA 1: GENERAL / TÉCNICA -->
        <div id="tab-content-general" class="tab-content-pane space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Estado Actual</span>
              <strong class="text-xs text-slate-800 block mt-0.5">${tool.current_status}</strong>
            </div>
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Valor Comercial</span>
              <strong class="text-xs text-slate-800 block mt-0.5">$ ${(Number(tool.commercial_value) || 0).toLocaleString('es-CO')} COP</strong>
            </div>
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Año Adquisición / Vida Útil</span>
              <strong class="text-xs text-slate-800 block mt-0.5">${tool.acquisition_year} • ${tool.useful_life_years} Años</strong>
            </div>
          </div>

          <!-- Variables Operativas (JSON) -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-white">
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>⚡</span> Variables Operativas del Fabricante (JSON Data)
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              ${Object.entries(tool.operative_vars || {}).map(([k, v]) => `
                <div class="p-2.5 bg-teal-50/60 border border-teal-100 rounded-xl">
                  <span class="text-[10px] uppercase font-bold text-teal-800 block">${k}</span>
                  <span class="text-xs font-bold text-slate-800 block mt-0.5">${v}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Asignación Activa -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-white">
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>📋</span> Custodia y Ubicación Operativa Actual
            </h4>
            ${activeAssignment ? `
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div class="flex justify-between">
                  <span class="text-emerald-900 font-bold">Empleado Responsable:</span>
                  <span class="text-slate-800 font-semibold">${trabajadorActivo?.nombre || activeAssignment.employee_id} (CC: ${trabajadorActivo?.cedula || 'N/A'})</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-emerald-900 font-bold">Proyecto / Frente:</span>
                  <span class="text-slate-800 font-semibold">${activeAssignment.project_id}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-emerald-900 font-bold">Fecha Asignación:</span>
                  <span class="text-slate-800 font-semibold">${new Date(activeAssignment.assigned_at).toLocaleString('es-CO')}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-emerald-900 font-bold">Hash Firma Digital:</span>
                  <span class="font-mono text-[10px] text-emerald-700 font-bold">${activeAssignment.digital_signature_hash}</span>
                </div>
              </div>
            ` : `
              <p class="text-slate-400 text-xs italic">El activo no tiene asignación activa (En Almacenamiento o Mantenimiento).</p>
            `}
          </div>
        </div>

        <!-- PESTAÑA 2: MATRIZ SST -->
        <div id="tab-content-sst" class="tab-content-pane space-y-4 hidden">
          <!-- Peligros -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-white">
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-red-700">
              <span>⚠️</span> Peligros y Riesgos Asociados (GTC 45 / Dec. 1072)
            </h4>
            <div class="space-y-1.5">
              ${(sst.hazards || []).map(h => `
                <div class="p-2 bg-red-50/80 border border-red-200 rounded-xl text-red-950 font-medium text-xs flex items-center gap-2">
                  <span class="text-red-500 font-bold">•</span> ${h}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Medidas Preventivas -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-white">
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-teal-800">
              <span>🛡️</span> Medidas Preventivas y Protocolo de Operación Segura
            </h4>
            <p class="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              ${sst.preventive_measures || 'No se han registrado medidas preventivas específicas.'}
            </p>
          </div>

          <!-- EPP Requerido -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-white">
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-indigo-900">
              <span>🦺</span> Elementos de Protección Personal (EPP) Obligatorios
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${(sst.required_epp || []).map(epp => `
                <div class="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 font-bold text-xs flex items-center gap-2">
                  <span>✓</span> ${epp}
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- PESTAÑA 3: PLAN DE MANTENIMIENTO -->
        <div id="tab-content-mantenimiento" class="tab-content-pane space-y-4 hidden">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Tipo de Programa</span>
              <strong class="text-xs text-slate-800 block mt-0.5">${plan.type}</strong>
            </div>
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Periodicidad</span>
              <strong class="text-xs text-slate-800 block mt-0.5">Cada ${plan.periodicity_days} Días</strong>
            </div>
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Última Ejecución</span>
              <strong class="text-xs text-slate-800 block mt-0.5">${plan.last_date}</strong>
            </div>
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Próxima Fecha</span>
              <strong class="text-xs text-teal-800 font-black block mt-0.5">${plan.next_date}</strong>
            </div>
          </div>

          <div class="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between">
            <div>
              <h5 class="text-xs font-black text-teal-950">¿Deseas registrar un mantenimiento o inspección técnica?</h5>
              <p class="text-[11px] text-teal-700">Se actualizará automáticamente la última fecha y se recalculará la próxima fecha programada.</p>
            </div>
            <button onclick="window.abrirModalIntervencion('${tool.id}')" class="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition cursor-pointer">
              <span>🔧 Registrar Intervención</span>
            </button>
          </div>
        </div>

        <!-- PESTAÑA 4: HISTORIAL CRONOLÓGICO -->
        <div id="tab-content-historial" class="tab-content-pane space-y-4 hidden">
          <!-- Intervenciones -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-white">
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>🔧</span> Bitácora de Intervenciones y Mantenimientos (${intervenciones.length})
            </h4>
            ${intervenciones.length === 0 ? `
              <p class="text-slate-400 text-xs italic">No hay intervenciones registradas para este activo.</p>
            ` : `
              <div class="space-y-2">
                ${intervenciones.map(i => `
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-bold text-slate-800">${i.activity_date} • <strong>${i.activity_type}</strong></span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${i.responsible_type === 'Externo' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-700'}">${i.responsible_type}</span>
                    </div>
                    <div class="text-[11px] text-slate-600">Responsable: <strong>${i.responsible_name}</strong> | Costo: <strong>$ ${(Number(i.cost) || 0).toLocaleString('es-CO')}</strong></div>
                    <p class="text-[11px] text-slate-500 italic mt-0.5">${i.technical_notes}</p>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Historial de Asignaciones -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-white">
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>📋</span> Historial de Asignaciones y Custodia (${asignaciones.length})
            </h4>
            <div class="space-y-2">
              ${asignaciones.map(a => {
                const trab = store.getTrabajadorPorId(a.employee_id);
                return `
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                    <div class="flex items-center justify-between">
                      <strong class="text-slate-800">${trab?.nombre || a.employee_id}</strong>
                      <span class="text-[10px] font-bold ${a.returned_at ? 'text-slate-400' : 'text-emerald-600'}">
                        ${a.returned_at ? 'Devuelto: ' + new Date(a.returned_at).toLocaleDateString() : 'Actualmente en Custodia'}
                      </span>
                    </div>
                    <div class="text-[11px] text-slate-500">Proyecto: <strong>${a.project_id}</strong> | Asignado: <strong>${new Date(a.assigned_at).toLocaleDateString()}</strong></div>
                    <div class="text-[9px] font-mono text-slate-400 truncate">Hash Digital: ${a.digital_signature_hash}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

      </div>

    </div>
  `;

  document.body.appendChild(modalEl);
};

// Cambio de Pestaña dentro del Modal
window.cambiarPestanaDetalle = function(tabName) {
  document.querySelectorAll('.tab-detalle-btn').forEach(b => {
    b.classList.remove('text-teal-700', 'border-b-2', 'border-teal-700');
    b.classList.add('text-slate-500');
  });
  document.querySelectorAll('.tab-content-pane').forEach(p => p.classList.add('hidden'));

  const btn = document.getElementById(`tab-btn-${tabName}`);
  const content = document.getElementById(`tab-content-${tabName}`);

  if (btn) {
    btn.classList.add('text-teal-700', 'border-b-2', 'border-teal-700');
    btn.classList.remove('text-slate-500');
  }
  if (content) content.classList.remove('hidden');
};

// =============================================================================
// MODAL: NUEVA HERRAMIENTA O EDITAR
// =============================================================================
window.abrirModalCrearHerramienta = function() {
  const tenantId = store.getEmpresaActivaId();
  const trabajadores = store.getTrabajadores(tenantId);
  const proyectos = PROYECTOS_PREDEFINIDOS[tenantId] || [];

  const modalId = 'modal-crear-herramienta';
  let modalEl = document.getElementById(modalId);
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
      
      <div class="p-6 bg-linear-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider text-teal-300">Inventario de Activos • SaaS Multitenant</span>
          <h3 class="text-base font-black">Registrar Nueva Herramienta o Equipo</h3>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-lg cursor-pointer">✕</button>
      </div>

      <form id="form-crear-herramienta" class="p-6 overflow-y-auto space-y-4 text-xs">
        
        <!-- Campo: Cargar Fotografía del Activo -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
          <div class="flex items-center justify-between">
            <label class="font-bold text-slate-700 uppercase flex items-center gap-1.5 text-[11px] tracking-wide">
              <span>📸</span> Fotografía Oficial de la Herramienta o Equipo
            </label>
            <span id="badge-photo-tool" class="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-600">Recomendado</span>
          </div>
          <p class="text-[11px] text-slate-500 leading-tight">
            Carga la fotografía técnica o placa del activo. Se incorporará automáticamente a la <strong>Hoja de Vida Oficial</strong> y a la <strong>Ficha de Seguridad SST</strong>.
          </p>

          <div class="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <!-- Contenedor Preview -->
            <div id="preview-tool-photo-container" class="hidden relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-teal-500 bg-white shadow-sm flex-shrink-0 flex items-center justify-center p-1">
              <img id="preview-tool-photo-img" src="" alt="Fotografía Herramienta" class="w-full h-full object-cover rounded-xl">
              <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <button type="button" id="btn-quitar-tool-photo" class="px-2 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold shadow hover:bg-red-700 cursor-pointer">
                  Quitar
                </button>
              </div>
            </div>

            <!-- Zona de Carga / Dropzone -->
            <label id="dropzone-tool-photo" class="flex-1 w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/40 rounded-2xl cursor-pointer bg-white transition text-center group">
              <svg class="w-6 h-6 text-teal-600 mb-1 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span class="text-xs text-teal-800 font-bold" id="texto-dropzone-tool-photo">Seleccionar o arrastrar fotografía de la herramienta</span>
              <span class="text-[10px] text-slate-400 mt-0.5">Formatos: JPG, PNG, WebP o foto directa desde cámara (Optimizado)</span>
              <input type="file" id="tool-photo-file" accept="image/*" class="hidden">
            </label>
          </div>

          <!-- Opción alternativa por URL -->
          <div class="flex items-center gap-2 pt-1">
            <span class="text-[10px] text-slate-400 font-medium">O enlace web:</span>
            <input type="url" id="tool-photo-url-input" placeholder="https://dominio.com/foto-equipo.jpg" class="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500">
          </div>
        </div>

        <!-- Fila 1 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Código Interno *</label>
            <input type="text" id="tool-code" required placeholder="ej: TL-IND-006" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tipo de Herramienta *</label>
            <select id="tool-type" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
              <option value="Manual">Manual</option>
              <option value="Eléctrica">Eléctrica</option>
              <option value="Industrial">Industrial</option>
              <option value="Neumática">Neumática</option>
              <option value="Medición">Medición</option>
            </select>
          </div>
        </div>

        <!-- Fila 2 -->
        <div>
          <label class="block font-bold text-slate-700 mb-1">Nombre Exacto del Activo *</label>
          <input type="text" id="tool-name" required placeholder="ej: Compresor de Aire de Pistón 50L" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
        </div>

        <!-- Fila 3 -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Marca *</label>
            <input type="text" id="tool-brand" required placeholder="ej: Schulz" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Modelo *</label>
            <input type="text" id="tool-model" required placeholder="ej: Bravo MSV-20" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Número de Serie *</label>
            <input type="text" id="tool-serial" required placeholder="ej: SCH-99482-COL" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
          </div>
        </div>

        <!-- Fila 4 -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Valor Comercial (COP) *</label>
            <input type="number" id="tool-value" required placeholder="ej: 3500000" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Año de Adquisición *</label>
            <input type="number" id="tool-year" required value="2025" min="2000" max="2030" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Vida Útil (1 a 5 Años) *</label>
            <select id="tool-useful-life" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
              <option value="1">1 Año</option>
              <option value="2">2 Años</option>
              <option value="3" selected>3 Años</option>
              <option value="4">4 Años</option>
              <option value="5">5 Años</option>
            </select>
          </div>
        </div>

        <!-- Fila 5: Estado Inicial -->
        <div>
          <label class="block font-bold text-slate-700 mb-1">Estado Operativo Actual *</label>
          <select id="tool-status" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
            <option value="En Almacenamiento">En Almacenamiento</option>
            <option value="En Funcionamiento">En Funcionamiento (Exige Asignación Activa)</option>
            <option value="En Mantenimiento">En Mantenimiento</option>
          </select>
        </div>

        <!-- Contenedor condicional para Asignación Obligatoria (Regla 1) -->
        <div id="contenedor-asignacion-obligatoria" class="hidden p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3">
          <span class="text-[10px] font-black uppercase text-teal-900 block">
            ⚠️ Regla de Negocio: Se requiere asignación activa obligatoria para "En Funcionamiento"
          </span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Empleado Responsable *</label>
              <select id="tool-asg-worker" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl">
                ${trabajadores.map(t => `<option value="${t.id}">${t.nombre} (${t.cargo || 'Operario'})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Proyecto / Frente de Obra *</label>
              <input type="text" id="tool-asg-project" placeholder="ej: PRJ-01 Planta Principal" list="list-proyectos-modal" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl">
              <datalist id="list-proyectos-modal">
                ${proyectos.map(p => `<option value="${p.nombre}">`).join('')}
              </datalist>
            </div>
          </div>
        </div>

        <!-- Variables Operativas (JSON) -->
        <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
          <label class="block font-bold text-slate-700">Variables Operativas (Voltaje, RPM, Presión)</label>
          <div class="grid grid-cols-3 gap-2">
            <input type="text" id="var-voltaje" placeholder="Voltaje (ej: 220V)" class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
            <input type="text" id="var-rpm" placeholder="RPM (ej: 3000 RPM)" class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
            <input type="text" id="var-presion" placeholder="Presión (ej: 90 PSI)" class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
          </div>
        </div>

        <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">
            Cancelar
          </button>
          <button type="submit" class="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold shadow-md cursor-pointer">
            Guardar Activo
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Manejo de la Carga de Fotografía y Previsualización
  let fotoDataUrlSeleccionada = null;
  const fileInputPhoto = document.getElementById('tool-photo-file');
  const previewPhotoContainer = document.getElementById('preview-tool-photo-container');
  const previewPhotoImg = document.getElementById('preview-tool-photo-img');
  const badgePhoto = document.getElementById('badge-photo-tool');
  const textoDropPhoto = document.getElementById('texto-dropzone-tool-photo');
  const inputPhotoUrl = document.getElementById('tool-photo-url-input');
  const btnQuitarPhoto = document.getElementById('btn-quitar-tool-photo');

  // Lectura y optimización de imagen con Canvas
  fileInputPhoto.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          fotoDataUrlSeleccionada = canvas.toDataURL('image/jpeg', 0.85);
          previewPhotoImg.src = fotoDataUrlSeleccionada;
          previewPhotoContainer.classList.remove('hidden');
          badgePhoto.innerText = '✓ Foto Cargada';
          badgePhoto.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800';
          textoDropPhoto.innerText = 'Cambiar fotografía seleccionada';
          if (inputPhotoUrl) inputPhotoUrl.value = '';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  if (inputPhotoUrl) {
    inputPhotoUrl.oninput = (e) => {
      const url = e.target.value.trim();
      if (url) {
        fotoDataUrlSeleccionada = url;
        previewPhotoImg.src = url;
        previewPhotoContainer.classList.remove('hidden');
        badgePhoto.innerText = '✓ URL Lista';
        badgePhoto.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-700';
        textoDropPhoto.innerText = 'Cambiar fotografía seleccionada';
      }
    };
  }

  btnQuitarPhoto.onclick = () => {
    fotoDataUrlSeleccionada = null;
    fileInputPhoto.value = '';
    if (inputPhotoUrl) inputPhotoUrl.value = '';
    previewPhotoContainer.classList.add('hidden');
    previewPhotoImg.src = '';
    badgePhoto.innerText = 'Recomendado';
    badgePhoto.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-600';
    textoDropPhoto.innerText = 'Seleccionar o arrastrar fotografía de la herramienta';
  };

  // Toggle asignación obligatoria si selecciona "En Funcionamiento"
  const selectStatus = document.getElementById('tool-status');
  const boxAsg = document.getElementById('contenedor-asignacion-obligatoria');
  selectStatus.onchange = () => {
    if (selectStatus.value === 'En Funcionamiento') {
      boxAsg.classList.remove('hidden');
    } else {
      boxAsg.classList.add('hidden');
    }
  };

  // Submit
  document.getElementById('form-crear-herramienta').onsubmit = (e) => {
    e.preventDefault();

    const currentStatus = selectStatus.value;
    let assignmentData = null;

    if (currentStatus === 'En Funcionamiento') {
      const workerId = document.getElementById('tool-asg-worker').value;
      const project = document.getElementById('tool-asg-project').value || 'PRJ-01 Planta Principal';
      if (!workerId || !project) {
        alert('Para marcar el equipo en funcionamiento debes asignar el empleado responsable y el proyecto.');
        return;
      }
      assignmentData = {
        employee_id: workerId,
        project_id: project,
        assigned_at: new Date().toISOString()
      };
    }

    const operativeVars = {};
    const vVolt = document.getElementById('var-voltaje').value;
    const vRpm = document.getElementById('var-rpm').value;
    const vPres = document.getElementById('var-presion').value;
    if (vVolt) operativeVars['voltaje'] = vVolt;
    if (vRpm) operativeVars['revoluciones'] = vRpm;
    if (vPres) operativeVars['presion'] = vPres;

    const toolType = document.getElementById('tool-type').value;

    // Foto final seleccionada o fallback por categoría
    const fallbackFotos = {
      'Industrial': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
      'Eléctrica': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
      'Neumática': 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&auto=format&fit=crop&q=80',
      'Medición': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      'Manual': 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=600&auto=format&fit=crop&q=80'
    };

    const finalPhoto = fotoDataUrlSeleccionada || (inputPhotoUrl ? inputPhotoUrl.value.trim() : '') || fallbackFotos[toolType];

    const toolData = {
      internal_code: document.getElementById('tool-code').value.trim(),
      tool_type: toolType,
      exact_name: document.getElementById('tool-name').value.trim(),
      brand: document.getElementById('tool-brand').value.trim(),
      model: document.getElementById('tool-model').value.trim(),
      serial_number: document.getElementById('tool-serial').value.trim(),
      commercial_value: Number(document.getElementById('tool-value').value) || 0,
      acquisition_year: Number(document.getElementById('tool-year').value) || 2025,
      useful_life_years: Number(document.getElementById('tool-useful-life').value) || 3,
      current_status: currentStatus,
      operative_vars: operativeVars,
      photo_url: finalPhoto
    };

    try {
      const saved = store.saveTool(toolData, assignmentData);

      // Crear registros por defecto de SST y Plan de Mantenimiento
      store.saveToolSST({
        tool_id: saved.id,
        hazards: ['Atrapamiento o golpe en extremidades', 'Riesgo ergonómico y biomecánico'],
        preventive_measures: 'Inspección preoperacional obligatoria y uso de EPP adecuado para el tipo de labor.',
        required_epp: ['Gafas de seguridad', 'Guantes de protección', 'Botas con puntera de seguridad']
      });

      store.saveToolMaintenancePlan({
        tool_id: saved.id,
        type: 'Preventivo',
        periodicity_days: 90,
        last_date: new Date().toISOString().split('T')[0]
      });

      modalEl.remove();
      renderToolsModule();
    } catch (err) {
      alert(err.message);
    }
  };
};

// =============================================================================
// MODAL: ASIGNACIÓN DE HERRAMIENTA (VALIDACIÓN 2: BLOQUEO SI ESTÁ EN MANTENIMIENTO)
// =============================================================================
window.abrirModalAsignacion = function(toolIdDefault = null) {
  const tenantId = store.getEmpresaActivaId();
  const herramientas = store.getToolsInventory(tenantId);
  const trabajadores = store.getTrabajadores(tenantId);
  const proyectos = PROYECTOS_PREDEFINIDOS[tenantId] || [];

  const modalId = 'modal-asignar-herramienta';
  let modalEl = document.getElementById(modalId);
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
      <div class="p-5 bg-linear-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider text-blue-300">Custodia y Asignación de Activos</span>
          <h3 class="text-sm font-black">Asignar Herramienta a Proyecto y Trabajador</h3>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white cursor-pointer">✕</button>
      </div>

      <form id="form-asignar-herramienta" class="p-6 space-y-4 text-xs">
        
        <div>
          <label class="block font-bold text-slate-700 mb-1">Seleccionar Herramienta / Equipo *</label>
          <select id="asg-tool-id" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium">
            <option value="">-- Selecciona un activo --</option>
            ${herramientas.map(h => {
              const esMantenimiento = h.current_status === 'En Mantenimiento';
              const selected = h.id === toolIdDefault ? 'selected' : '';
              return `
                <option value="${h.id}" ${esMantenimiento ? 'disabled class="text-red-500 bg-red-50"' : ''} ${selected}>
                  ${h.internal_code} - ${h.exact_name} (${h.current_status}) ${esMantenimiento ? '⛔ [BLOQUEADA - EN MANTENIMIENTO]' : ''}
                </option>
              `;
            }).join('')}
          </select>
          <span id="alerta-bloqueo-mantenimiento" class="hidden text-[11px] text-red-600 font-bold mt-1 block">
            ⛔ Validación de Negocio: Los equipos "En Mantenimiento" no pueden ser asignados a ningún proyecto.
          </span>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Trabajador Responsable de Custodia *</label>
          <select id="asg-employee-id" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500">
            ${trabajadores.map(t => `<option value="${t.id}">${t.nombre} - ${t.cargo || 'Operario'} (CC: ${t.cedula || 'N/A'})</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Proyecto o Frente de Obra *</label>
          <input type="text" id="asg-project-id" required placeholder="ej: PRJ-02 Horno Túnel Tunja" list="list-proyectos-asg" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
          <datalist id="list-proyectos-asg">
            ${proyectos.map(p => `<option value="${p.nombre}">`).join('')}
          </datalist>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Fecha y Hora de Entrega / Custodia *</label>
          <input type="datetime-local" id="asg-assigned-at" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
        </div>

        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
          <div class="flex items-center gap-2">
            <input type="checkbox" id="chk-firma-acta" required checked class="w-4 h-4 text-blue-600 rounded cursor-pointer">
            <label for="chk-firma-acta" class="font-bold text-slate-700 cursor-pointer">
              Firma electrónica del acta de entrega y compromiso de custodia
            </label>
          </div>
          <p class="text-[10px] text-slate-400 pl-6">Se generará un Hash SHA-256 legal y el activo pasará automáticamente a estado <strong>"En Funcionamiento"</strong>.</p>
        </div>

        <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">
            Cancelar
          </button>
          <button type="submit" id="btn-submit-asignacion" class="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-md cursor-pointer">
            Confirmar Asignación
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Set default datetime now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('asg-assigned-at').value = now.toISOString().slice(0, 16);

  // Listener para bloqueo si selecciona herramienta en mantenimiento
  const selectTool = document.getElementById('asg-tool-id');
  const alertBloqueo = document.getElementById('alerta-bloqueo-mantenimiento');
  const btnSubmit = document.getElementById('btn-submit-asignacion');

  function checkToolBloqueada() {
    const t = store.getToolById(selectTool.value);
    if (t && t.current_status === 'En Mantenimiento') {
      alertBloqueo.classList.remove('hidden');
      btnSubmit.disabled = true;
      btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      alertBloqueo.classList.add('hidden');
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  selectTool.onchange = checkToolBloqueada;
  checkToolBloqueada();

  document.getElementById('form-asignar-herramienta').onsubmit = (e) => {
    e.preventDefault();
    const toolId = selectTool.value;
    const employeeId = document.getElementById('asg-employee-id').value;
    const projectId = document.getElementById('asg-project-id').value;
    const assignedAt = new Date(document.getElementById('asg-assigned-at').value).toISOString();

    try {
      store.assignTool(toolId, {
        employee_id: employeeId,
        project_id: projectId,
        assigned_at: assignedAt
      });
      modalEl.remove();
      renderToolsModule();
    } catch (err) {
      alert(err.message);
    }
  };
};

// =============================================================================
// MODAL: REGISTRO DE INTERVENCIÓN (VALIDACIÓN 3: RECALCULA NEXT_DATE EN PLAN)
// =============================================================================
window.abrirModalIntervencion = function(toolIdDefault = null) {
  const tenantId = store.getEmpresaActivaId();
  const herramientas = store.getToolsInventory(tenantId);

  const modalId = 'modal-intervencion';
  let modalEl = document.getElementById(modalId);
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
      <div class="p-5 bg-linear-to-r from-amber-900 to-slate-900 text-white flex items-center justify-between">
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider text-amber-300">Bitácora Técnica • Recálculo Automático</span>
          <h3 class="text-sm font-black">Registrar Mantenimiento o Intervención</h3>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white cursor-pointer">✕</button>
      </div>

      <form id="form-intervencion" class="p-6 space-y-4 text-xs">
        
        <div>
          <label class="block font-bold text-slate-700 mb-1">Herramienta o Equipo Intervenido *</label>
          <select id="int-tool-id" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500">
            ${herramientas.map(h => `
              <option value="${h.id}" ${h.id === toolIdDefault ? 'selected' : ''}>
                ${h.internal_code} - ${h.exact_name} (${h.current_status})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Fecha de la Actividad *</label>
            <input type="date" id="int-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tipo de Actividad *</label>
            <select id="int-type" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <option value="Preventivo">Preventivo</option>
              <option value="Mantenimiento Correctivo">Mantenimiento Correctivo</option>
              <option value="Limpieza">Limpieza y Desinfección</option>
              <option value="Ajuste">Ajuste y Calibración</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tipo de Responsable *</label>
            <select id="int-resp-type" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <option value="Interno">Interno (Personal propio)</option>
              <option value="Externo">Externo (Taller / Proveedor)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Costo de Intervención (COP)</label>
            <input type="number" id="int-cost" placeholder="0" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Nombre del Técnico o Taller *</label>
          <input type="text" id="int-resp-name" required placeholder="ej: Ing. Carlos Gómez / Taller Central" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Notas Técnicas y Repuestos Utilizados *</label>
          <textarea id="int-notes" rows="3" required placeholder="Describe las labores realizadas, piezas cambiadas y pruebas de seguridad aprobadas..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"></textarea>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
          <input type="checkbox" id="int-finalizar-mantenimiento" checked class="w-4 h-4 text-amber-600 rounded cursor-pointer">
          <label for="int-finalizar-mantenimiento" class="text-[11px] font-bold text-amber-950 cursor-pointer">
            Si el equipo estaba "En Mantenimiento", marcarlo reparado y habilitar en Almacenamiento.
          </label>
        </div>

        <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">
            Cancelar
          </button>
          <button type="submit" class="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold shadow-md cursor-pointer">
            Guardar y Recalcular Fechas
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  document.getElementById('form-intervencion').onsubmit = (e) => {
    e.preventDefault();
    const toolId = document.getElementById('int-tool-id').value;
    const actDate = document.getElementById('int-date').value;
    const actType = document.getElementById('int-type').value;
    const respType = document.getElementById('int-resp-type').value;
    const cost = Number(document.getElementById('int-cost').value) || 0;
    const respName = document.getElementById('int-resp-name').value;
    const notes = document.getElementById('int-notes').value;
    const finMaint = document.getElementById('int-finalizar-mantenimiento').checked;

    try {
      store.registerToolIntervention({
        tool_id: toolId,
        activity_date: actDate,
        activity_type: actType,
        responsible_type: respType,
        responsible_name: respName,
        technical_notes: notes,
        cost: cost,
        finalizar_mantenimiento: finMaint
      });

      modalEl.remove();
      renderToolsModule();
    } catch (err) {
      alert(err.message);
    }
  };
};

// =============================================================================
// EXPORTABLES OFICIALES A PDF DE ALTA FIDELIDAD
// =============================================================================

// 1. PDF: HOJA DE VIDA DE LA HERRAMIENTA / EQUIPO
window.generarPdfHojaDeVida = function(toolId) {
  const tool = store.getToolById(toolId);
  if (!tool) return;
  const empresa = store.getEmpresaActiva();
  const plan = store.getToolMaintenancePlan(toolId);
  const sst = store.getToolSST(toolId);
  const intervenciones = store.getToolInterventions(toolId);
  const costoTotal = intervenciones.reduce((acc, i) => acc + (Number(i.cost) || 0), 0);

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Hoja de Vida Técnica - ${tool.internal_code} - ${tool.exact_name}</title>
      <style>
        @page { size: letter; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: white; margin: 0; padding: 20px; font-size: 11px; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; }
        .logo-box { width: 140px; }
        .title-box { text-align: center; flex: 1; }
        .meta-box { text-align: right; font-size: 9px; color: #64748b; }
        h1 { margin: 0; font-size: 16px; text-transform: uppercase; color: #0f766e; }
        h2 { margin: 2px 0; font-size: 12px; color: #334155; }
        .section-title { background: #f0fdfa; border-left: 4px solid #0f766e; padding: 6px 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 15px 0 10px; color: #134e4a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f8fafc; font-weight: bold; color: #334155; width: 25%; }
        .img-container { text-align: center; margin-bottom: 15px; }
        .img-container img { max-height: 140px; border-radius: 8px; border: 1px solid #cbd5e1; }
        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
        .sig-row { display: flex; justify-content: space-around; margin-top: 40px; }
        .sig-box { text-align: center; width: 200px; }
        .sig-line { border-top: 1px solid #475569; margin-bottom: 5px; }
        @media print { body { padding: 0; } button { display: none; } }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 10px;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #0f766e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Imprimir / Guardar como PDF</button>
      </div>

      <div class="header">
        <div class="logo-box">
          <strong style="color: #0f766e; font-size: 14px;">DOCTOR PYME</strong>
          <div style="font-size: 9px; color: #64748b;">SG-SST Digital</div>
        </div>
        <div class="title-box">
          <h1>Hoja de Vida de Maquinaria y Equipos</h1>
          <h2>Resolución 0312 de 2019 (Estándar 2.4.1) • Decreto 1072 de 2015</h2>
          <div style="font-weight: bold; font-size: 11px; margin-top: 3px;">${empresa?.razonSocial} • NIT: ${empresa?.nit}</div>
        </div>
        <div class="meta-box">
          <div>Código: <strong>F-SST-EQ-01</strong></div>
          <div>Versión: <strong>03</strong></div>
          <div>Fecha: <strong>${new Date().toLocaleDateString('es-CO')}</strong></div>
        </div>
      </div>

      <div class="section-title">1. Identificación y Datos Generales del Activo</div>
      <table>
        <tr>
          <th>Código Interno:</th>
          <td><strong>${tool.internal_code}</strong></td>
          <th>Tipo de Activo:</th>
          <td><strong>${tool.tool_type}</strong></td>
        </tr>
        <tr>
          <th>Nombre Exacto:</th>
          <td colspan="3"><strong>${tool.exact_name}</strong></td>
        </tr>
        <tr>
          <th>Marca / Fabricante:</th>
          <td>${tool.brand}</td>
          <th>Modelo:</th>
          <td>${tool.model}</td>
        </tr>
        <tr>
          <th>Número de Serie:</th>
          <td><code>${tool.serial_number || 'N/A'}</code></td>
          <th>Estado Actual:</th>
          <td><strong>${tool.current_status}</strong></td>
        </tr>
        <tr>
          <th>Año Adquisición:</th>
          <td>${tool.acquisition_year}</td>
          <th>Vida Útil Estimada:</th>
          <td>${tool.useful_life_years} Años</td>
        </tr>
        <tr>
          <th>Valor Comercial:</th>
          <td>$ ${(Number(tool.commercial_value) || 0).toLocaleString('es-CO')} COP</td>
          <th>Inversión Acumulada Mantenimiento:</th>
          <td><strong>$ ${costoTotal.toLocaleString('es-CO')} COP</strong></td>
        </tr>
      </table>

      <div class="section-title">2. Especificaciones y Variables Operativas</div>
      <table>
        ${Object.entries(tool.operative_vars || {}).map(([k, v]) => `
          <tr>
            <th>${k.toUpperCase()}:</th>
            <td>${v}</td>
          </tr>
        `).join('')}
      </table>

      <div class="section-title">3. Programa de Mantenimiento e Inspección</div>
      <table>
        <tr>
          <th>Tipo de Plan:</th>
          <td>${plan?.type || 'Preventivo'}</td>
          <th>Periodicidad:</th>
          <td>Cada ${plan?.periodicity_days || 90} Días</td>
        </tr>
        <tr>
          <th>Última Intervención:</th>
          <td>${plan?.last_date || 'N/A'}</td>
          <th>Próxima Intervención Programada:</th>
          <td><strong style="color: #0f766e;">${plan?.next_date || 'N/A'}</strong></td>
        </tr>
      </table>

      <div class="section-title">4. Historial Cronológico de Intervenciones Técnicas</div>
      <table>
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="width: 15%;">Fecha</th>
            <th style="width: 20%;">Actividad</th>
            <th style="width: 25%;">Responsable</th>
            <th style="width: 30%;">Detalle Técnico</th>
            <th style="width: 10%;">Costo</th>
          </tr>
        </thead>
        <tbody>
          ${intervenciones.length === 0 ? `
            <tr><td colspan="5" style="text-align: center; color: #94a3b8;">Sin intervenciones registradas en la bitácora.</td></tr>
          ` : intervenciones.map(i => `
            <tr>
              <td>${i.activity_date}</td>
              <td><strong>${i.activity_type}</strong></td>
              <td>${i.responsible_name} (${i.responsible_type})</td>
              <td>${i.technical_notes}</td>
              <td>$ ${(Number(i.cost) || 0).toLocaleString('es-CO')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-line"></div>
          <strong>Responsable de Mantenimiento</strong>
          <div style="font-size: 9px; color: #64748b;">Firma y Registro Técnico</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <strong>Coordinador / Asesor SG-SST</strong>
          <div style="font-size: 9px; color: #64748b;">Licencia SST Resolución Vigente</div>
        </div>
      </div>

      <div class="footer">
        <div>DOCTOR PYME SG-SST • Plataforma SaaS Multitenant</div>
        <div>Tenant: ${tool.tenant_id} • Hash Integridad: ${tool.id}</div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

// 2. PDF: FICHA DE SEGURIDAD SST
window.generarPdfFichaSST = function(toolId) {
  const tool = store.getToolById(toolId);
  if (!tool) return;
  const empresa = store.getEmpresaActiva();
  const sst = store.getToolSST(toolId) || { hazards: [], preventive_measures: '', required_epp: [] };

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Ficha de Seguridad SST - ${tool.internal_code}</title>
      <style>
        @page { size: letter; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: white; margin: 0; padding: 20px; font-size: 11px; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #b91c1c; padding-bottom: 12px; margin-bottom: 15px; }
        h1 { margin: 0; font-size: 16px; text-transform: uppercase; color: #b91c1c; }
        h2 { margin: 2px 0; font-size: 11px; color: #334155; }
        .banner-warning { background: #fef2f2; border: 2px dashed #ef4444; padding: 10px; border-radius: 8px; margin-bottom: 15px; color: #991b1b; }
        .section-title { background: #fef2f2; border-left: 4px solid #b91c1c; padding: 6px 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 15px 0 10px; color: #991b1b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f8fafc; font-weight: bold; width: 25%; }
        .epp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 15px; }
        .epp-item { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; border-radius: 6px; font-weight: bold; }
        .sig-row { display: flex; justify-content: space-around; margin-top: 35px; }
        .sig-box { text-align: center; width: 200px; }
        .sig-line { border-top: 1px solid #475569; margin-bottom: 5px; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 10px;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #b91c1c; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Imprimir / Guardar como PDF</button>
      </div>

      <div class="header">
        <div>
          <strong style="color: #b91c1c; font-size: 14px;">DOCTOR PYME SG-SST</strong>
          <div style="font-size: 9px; color: #64748b;">Seguridad Industrial y Prevención</div>
        </div>
        <div style="text-align: center;">
          <h1>Ficha de Seguridad y Operación Segura</h1>
          <h2>Matriz de Peligros y Controles • Resolución 2400 de 1979 & Dec. 1072</h2>
          <div style="font-weight: bold; font-size: 11px; margin-top: 3px;">${empresa?.razonSocial}</div>
        </div>
        <div style="text-align: right; font-size: 9px; color: #64748b;">
          <div>Código: <strong>F-SST-SEG-04</strong></div>
          <div>Vigencia: <strong>2026</strong></div>
        </div>
      </div>

      <div class="banner-warning">
        ⚠️ <strong>OBLIGACIÓN LEGAL DEL TRABAJADOR:</strong> Prohibido operar este equipo sin la debida capacitación, sin realizar la inspección preoperacional diaria y sin el porte completo de los EPP obligatorios estipulados en esta ficha.
      </div>

      <div class="section-title">1. Identificación del Equipo</div>
      <table>
        <tr>
          <th>Código:</th>
          <td><strong>${tool.internal_code}</strong></td>
          <th>Tipo:</th>
          <td><strong>${tool.tool_type}</strong></td>
        </tr>
        <tr>
          <th>Nombre del Activo:</th>
          <td colspan="3"><strong>${tool.exact_name}</strong> (${tool.brand} - Mod: ${tool.model})</td>
        </tr>
      </table>

      <div class="section-title">2. Peligros y Factores de Riesgo (GTC 45)</div>
      <ul>
        ${(sst.hazards || []).map(h => `<li style="margin-bottom: 5px; color: #991b1b;"><strong>${h}</strong></li>`).join('')}
      </ul>

      <div class="section-title">3. Normas y Procedimiento de Operación Segura</div>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; line-height: 1.6; white-space: pre-line;">
        ${sst.preventive_measures || 'Aplicar estándares generales de seguridad y normas de fábrica.'}
      </div>

      <div class="section-title">4. Elementos de Protección Personal (EPP) Requeridos</div>
      <div class="epp-grid">
        ${(sst.required_epp || []).map(epp => `
          <div class="epp-item">🛡️ ${epp}</div>
        `).join('')}
      </div>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-line"></div>
          <strong>Operador / Trabajador Asignado</strong>
          <div style="font-size: 9px; color: #64748b;">Compromiso de Autocuidado y Uso</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <strong>Coordinador SG-SST</strong>
          <div style="font-size: 9px; color: #64748b;">Socialización y Verificación en Campo</div>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

// 3. PDF: PLAN DE MANTENIMIENTO
window.generarPdfPlanMantenimiento = function(toolId) {
  const tool = store.getToolById(toolId);
  if (!tool) return;
  const empresa = store.getEmpresaActiva();
  const plan = store.getToolMaintenancePlan(toolId);

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Plan de Mantenimiento - ${tool.internal_code}</title>
      <style>
        @page { size: letter; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: white; margin: 0; padding: 20px; font-size: 11px; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #4338ca; padding-bottom: 12px; margin-bottom: 15px; }
        h1 { margin: 0; font-size: 16px; text-transform: uppercase; color: #4338ca; }
        .section-title { background: #eef2ff; border-left: 4px solid #4338ca; padding: 6px 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 15px 0 10px; color: #312e81; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
        th { background: #f8fafc; font-weight: bold; width: 30%; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 10px;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #4338ca; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Imprimir / Guardar como PDF</button>
      </div>

      <div class="header">
        <div>
          <strong style="color: #4338ca; font-size: 14px;">DOCTOR PYME SG-SST</strong>
          <div style="font-size: 9px; color: #64748b;">Mantenimiento Predictivo y Preventivo</div>
        </div>
        <div style="text-align: center;">
          <h1>Programa de Mantenimiento y Calibración</h1>
          <div style="font-size: 11px; font-weight: bold; margin-top: 3px;">${empresa?.razonSocial}</div>
        </div>
        <div style="text-align: right; font-size: 9px; color: #64748b;">
          <div>Código: <strong>PRG-MNT-02</strong></div>
          <div>Año: <strong>2026</strong></div>
        </div>
      </div>

      <div class="section-title">1. Datos del Equipo Sujeto a Mantenimiento</div>
      <table>
        <tr>
          <th>Código Interno:</th>
          <td><strong>${tool.internal_code}</strong></td>
        </tr>
        <tr>
          <th>Descripción del Activo:</th>
          <td><strong>${tool.exact_name}</strong> (${tool.brand} - Mod: ${tool.model} - S/N: ${tool.serial_number || 'N/A'})</td>
        </tr>
        <tr>
          <th>Tipo de Activo:</th>
          <td>${tool.tool_type}</td>
        </tr>
      </table>

      <div class="section-title">2. Programa y Periodicidades Establecidas</div>
      <table>
        <tr>
          <th>Tipo de Intervención:</th>
          <td><strong>${plan?.type || 'Preventivo'}</strong></td>
        </tr>
        <tr>
          <th>Frecuencia Programada:</th>
          <td>Cada <strong>${plan?.periodicity_days || 90} Días Calendario</strong></td>
        </tr>
        <tr>
          <th>Fecha Último Mantenimiento Realizado:</th>
          <td>${plan?.last_date || 'N/A'}</td>
        </tr>
        <tr>
          <th>Fecha Próximo Mantenimiento Obligatorio:</th>
          <td><strong style="color: #4338ca; font-size: 13px;">${plan?.next_date || 'N/A'}</strong></td>
        </tr>
      </table>

      <div class="section-title">3. Protocolo de Inspección Preoperacional y Calibración</div>
      <p style="line-height: 1.6; color: #475569;">
        El presente activo debe ser sometido a verificación técnica antes de cada jornada laboral. En caso de detectar ruidos anormales, fisuras en la carcasa, fugas neumáticas o descalibración superior a la tolerancia permitida, el activo pasará inmediatamente al estado <strong>"En Mantenimiento"</strong> quedando bloqueado para asignación en obra hasta que se registre la intervención correctiva correspondiente.
      </p>

      <div style="display: flex; justify-content: space-around; margin-top: 50px;">
        <div style="text-align: center; width: 220px;">
          <div style="border-top: 1px solid #475569; margin-bottom: 5px;"></div>
          <strong>Director Técnico / Jefe de Taller</strong>
        </div>
        <div style="text-align: center; width: 220px;">
          <div style="border-top: 1px solid #475569; margin-bottom: 5px;"></div>
          <strong>Responsable SG-SST (Lic. Vigente)</strong>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
};
