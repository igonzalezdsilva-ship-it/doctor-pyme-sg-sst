// =============================================================================
// COMPONENTE: MATRIZ DE PELIGROS Y VALORACIÓN DE RIESGOS (GTC 45:2012)
// Integración Guiada por Procesos (Process-Driven Architecture) - DOCTOR PYME
// Decreto 1072 de 2015 Art. 2.2.4.6.15 y Resolución 0312 de 2019
// =============================================================================
import { store } from '../store.js';
import { CLASIFICACION_PELIGROS_GTC45 } from '../data.js';
import { OPCIONES_ND, OPCIONES_NE, OPCIONES_NC, evaluarGTC45 } from '../gtc45.js';

let filtroNivel = 'TODOS';
let filtroBusqueda = '';

export function renderMatrix() {
  const container = document.getElementById('main-content');
  const empresaActiva = store.getEmpresaActiva();

  if (!empresaActiva) {
    container.innerHTML = `
      <div class="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-sm">
        <h2 class="text-xl font-bold text-slate-800">Selecciona una Empresa Cliente</h2>
        <p class="text-sm text-slate-500 mt-2">Para ver o diligenciar la Matriz GTC 45 debes seleccionar una empresa activa.</p>
        <button onclick="window.location.hash='#empresas'" class="mt-5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
          Ver Empresas
        </button>
      </div>
    `;
    return;
  }

  const matriz = store.getMatriz(empresaActiva.id);
  const procesos = store.getProcesses(empresaActiva.id);
  const cargos = store.getJobPositions(empresaActiva.id);
  const herramientas = store.getTools(empresaActiva.id);
  const onboarding = store.getOnboardingProgress(empresaActiva.id);

  const matrizFiltrada = matriz.filter(m => {
    if (!m) return false;
    const cumpleNivel = filtroNivel === 'TODOS' || m.interpretacionNR === filtroNivel;
    const term = (filtroBusqueda || '').toLowerCase().trim();
    const cumpleBusqueda = !term || 
      (m.proceso || '').toLowerCase().includes(term) ||
      (m.zonaLugar || '').toLowerCase().includes(term) ||
      (m.peligroClasificacion || '').toLowerCase().includes(term) ||
      (m.peligroDescripcion || '').toLowerCase().includes(term) ||
      (Array.isArray(m.exposed_job_positions) && m.exposed_job_positions.some(pos => pos.toLowerCase().includes(term)));
    return cumpleNivel && cumpleBusqueda;
  });

  const badgeNR = {
    'I': 'bg-red-100 text-red-800 border-red-300',
    'II': 'bg-orange-100 text-orange-800 border-orange-300',
    'III': 'bg-amber-100 text-amber-800 border-amber-300',
    'IV': 'bg-emerald-100 text-emerald-800 border-emerald-300'
  };

  const totalNivelI = matriz.filter(m => m.interpretacionNR === 'I').length;
  const totalConProceso = matriz.filter(m => m.process_id).length;

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Encabezado de la Matriz con Indicadores Process-Driven -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <span>Guía Técnica Colombiana GTC 45:2012</span>
            <span>•</span>
            <span>Decreto 1072 Art. 2.2.4.6.15</span>
            <span>•</span>
            <span class="text-indigo-600">Paso 4 Onboarding</span>
          </div>
          <h1 class="text-2xl font-black text-slate-900">Matriz de Identificación de Peligros y Valoración de Riesgos</h1>
          <p class="text-xs text-slate-500 mt-1">
            Empresa activa: <strong>${empresaActiva.razonSocial}</strong> (${matriz.length} peligros valorados • ${totalConProceso} vinculados a Procesos PHVA)
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <a href="#procesos" class="px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs">
            <span>🗺️</span>
            <span>Mapa & Procesos</span>
          </a>
          <button onclick="window.sincronizarMatrizDesdeProcesos()" class="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer" title="Generar y vincular automáticamente peligros GTC 45 a partir de las actividades PHVA del Mapa de Procesos">
            <span>🔄</span>
            <span>Sincronizar desde Procesos PHVA</span>
          </button>
          <button onclick="window.abrirModalRiesgo()" class="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Identificar Nuevo Peligro
          </button>
          <button onclick="window.imprimirMatrizGTC45PDF()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <span>🖨️</span>
            <span>Imprimir PDF</span>
          </button>
          <button onclick="window.exportarMatrizCSV()" class="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar CSV
          </button>
        </div>
      </div>

      <!-- Barra de Filtros y Resumen de Criticidad -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold text-slate-400 uppercase mr-1">Nivel de Riesgo:</span>
          <button onclick="window.filtrarNivelMatriz('TODOS')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filtroNivel === 'TODOS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            Todos (${matriz.length})
          </button>
          <button onclick="window.filtrarNivelMatriz('I')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filtroNivel === 'I' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}">
            🔴 Nivel I - Crítico (${totalNivelI})
          </button>
          <button onclick="window.filtrarNivelMatriz('II')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filtroNivel === 'II' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}">
            🟠 Nivel II (${matriz.filter(m => m.interpretacionNR === 'II').length})
          </button>
          <button onclick="window.filtrarNivelMatriz('III')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filtroNivel === 'III' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}">
            🟡 Nivel III (${matriz.filter(m => m.interpretacionNR === 'III').length})
          </button>
          <button onclick="window.filtrarNivelMatriz('IV')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filtroNivel === 'IV' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">
            🟢 Nivel IV (${matriz.filter(m => m.interpretacionNR === 'IV').length})
          </button>
        </div>

        <div class="relative w-full md:w-72">
          <input 
            type="text" 
            id="input-buscar-matriz"
            placeholder="Buscar por proceso, peligro, cargo..." 
            value="${filtroBusqueda}"
            class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
          <svg class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <!-- Tabla Estilo AppSheet de la Matriz GTC 45 -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900 text-white font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th class="p-3.5 border-r border-slate-800">Proceso / Zona</th>
                <th class="p-3.5 border-r border-slate-800">Actividad & Cargos Expuestos</th>
                <th class="p-3.5 border-r border-slate-800">Peligro Identificado</th>
                <th class="p-3.5 border-r border-slate-800 text-center">Efectos Posibles</th>
                <th class="p-3.5 border-r border-slate-800 text-center">ND × NE = NP</th>
                <th class="p-3.5 border-r border-slate-800 text-center">NC</th>
                <th class="p-3.5 border-r border-slate-800 text-center">NR y Nivel</th>
                <th class="p-3.5 border-r border-slate-800">Aceptabilidad & Controles</th>
                <th class="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${matrizFiltrada.length === 0 ? `
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400 text-xs">
                    No hay registros de peligros en este filtro. Haz clic en "Sincronizar desde Procesos PHVA" o "Identificar Nuevo Peligro".
                  </td>
                </tr>
              ` : matrizFiltrada.map(m => {
                const procObj = procesos.find(p => p.id === m.process_id);
                const procCode = procObj ? procObj.code : (m.proceso ? m.proceso.split(' ')[0] : 'PR');
                const cargosList = Array.isArray(m.exposed_job_positions) ? m.exposed_job_positions : (typeof m.exposed_job_positions === 'string' ? [m.exposed_job_positions] : []);

                return `
                  <tr class="hover:bg-slate-50/80 transition">
                    <td class="p-3.5 border-r border-slate-100">
                      <div class="flex items-center gap-1.5 mb-1">
                        <span class="px-1.5 py-0.5 rounded text-[9.5px] font-black font-mono bg-slate-800 text-white">${procCode}</span>
                        <span class="font-bold text-slate-900 block leading-tight">${m.proceso}</span>
                      </div>
                      <span class="text-slate-500 text-[11px] block">${m.zonaLugar}</span>
                    </td>

                    <td class="p-3.5 border-r border-slate-100 max-w-[220px]">
                      <span class="font-bold text-slate-800 block">${m.actividad}</span>
                      <span class="text-slate-400 text-[10px] block mt-0.5">${m.tarea || ''} (${m.rutinaria ? 'Rutinaria' : 'No Rutinaria'})</span>
                      
                      <!-- Cargos Expuestos -->
                      ${cargosList.length > 0 ? `
                        <div class="flex flex-wrap gap-1 mt-1.5">
                          ${cargosList.map(cg => `<span class="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded text-[9.5px] font-bold border border-indigo-200">👤 ${cg}</span>`).join('')}
                        </div>
                      ` : ''}
                    </td>

                    <td class="p-3.5 border-r border-slate-100 max-w-[240px]">
                      <span class="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px] mb-1">
                        ${m.peligroClasificacion}
                      </span>
                      <p class="text-slate-800 font-semibold leading-relaxed">${m.peligroDescripcion}</p>
                    </td>

                    <td class="p-3.5 border-r border-slate-100 text-slate-600 max-w-[180px]">
                      ${m.efectosPosibles}
                    </td>

                    <td class="p-3.5 border-r border-slate-100 text-center whitespace-nowrap">
                      <span class="font-mono text-slate-700 font-semibold">${m.nd} × ${m.ne} = <strong class="text-slate-900">${m.np}</strong></span>
                    </td>

                    <td class="p-3.5 border-r border-slate-100 text-center font-mono font-bold text-slate-800">
                      ${m.nc}
                    </td>

                    <td class="p-3.5 border-r border-slate-100 text-center whitespace-nowrap">
                      <span class="px-2.5 py-1 rounded-md font-black border text-xs ${badgeNR[m.interpretacionNR]}">
                        Nivel ${m.interpretacionNR} (${m.nr})
                      </span>
                    </td>

                    <td class="p-3.5 border-r border-slate-100">
                      <span class="font-bold block text-xs ${m.interpretacionNR === 'I' ? 'text-red-700' : m.interpretacionNR === 'II' ? 'text-orange-700' : 'text-slate-700'}">
                        ${m.aceptabilidad}
                      </span>
                      <div class="text-[10px] text-slate-500 mt-1 max-w-[170px] truncate" title="${m.medidasIntervencion?.ingenieria || ''}">
                        ⚙️ Ing: ${m.medidasIntervencion?.ingenieria || 'N/A'}
                      </div>
                      <div class="text-[10px] text-slate-500 mt-0.5 max-w-[170px] truncate" title="${m.medidasIntervencion?.epp || ''}">
                        🦺 EPP: ${m.medidasIntervencion?.epp || 'N/A'}
                      </div>
                    </td>

                    <td class="p-3.5 text-center whitespace-nowrap">
                      <div class="flex items-center justify-center gap-1.5">
                        <button onclick="window.editarRiesgo('${m.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 transition" title="Editar">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onclick="window.eliminarRiesgo('${m.id}')" class="p-1.5 text-slate-400 hover:text-red-600 transition" title="Eliminar">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Formulario Matriz GTC 45 con Conexión Process-Driven y Pre-identificación IA -->
    <div id="modal-riesgo" class="fixed inset-0 bg-slate-900/75 hidden items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-fade-in">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 id="modal-riesgo-titulo" class="font-black text-base text-slate-900">Identificación de Peligro y Valoración (GTC 45)</h3>
            <p class="text-xs text-slate-500">Conectado a la Caracterización de Procesos y jerarquía de controles de MinTrabajo.</p>
          </div>
          <button onclick="window.cerrarModalRiesgo()" class="text-slate-400 hover:text-slate-600 p-1 cursor-pointer text-2xl font-bold">
            &times;
          </button>
        </div>

        <form id="form-riesgo" class="p-6 space-y-4">
          <input type="hidden" id="riesgo-id">

          <!-- 1. Caracterización del Puesto (Conexión Guiada por Procesos) -->
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-600">1. Localización, Proceso & Actividad PHVA</span>
              <button 
                type="button" 
                id="btn-preidentificar-ia" 
                onclick="window.preidentificarPeligroConIA()" 
                class="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>✨ Pre-identificar con IA (GTC 45)</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Selector de Proceso -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Vincular a Proceso de la Empresa</label>
                <select id="r-select-proceso" onchange="window.alCambiarProcesoMatriz(this.value)" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800">
                  <option value="">-- Seleccionar Proceso --</option>
                  ${procesos.map(pr => `<option value="${pr.id}">${pr.code} - ${pr.name} (${pr.process_type})</option>`).join('')}
                  <option value="otro">-- Otro / Proceso Manual --</option>
                </select>
                <input type="text" id="r-proceso" required placeholder="Nombre del Proceso" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 mt-1.5 font-semibold">
              </div>

              <!-- Selector de Actividad -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Vincular a Actividad PHVA</label>
                <select id="r-select-actividad" onchange="window.alCambiarActividadMatriz(this.value)" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800">
                  <option value="">-- Selecciona un proceso primero --</option>
                </select>
                <input type="text" id="r-actividad" required placeholder="Actividad" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 mt-1.5">
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Zona / Lugar *</label>
                <input type="text" id="r-zona" required placeholder="Ej. Nave de Producción, Patio de Acopio" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500">
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tarea Específica *</label>
                <input type="text" id="r-tarea" required placeholder="Ej. Operación de la extrusora" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500">
              </div>
            </div>

            <!-- Contenedor de Cargos Expuestos y Herramientas Asociadas -->
            <div id="container-cargos-herramientas" class="pt-2 border-t border-slate-200 text-xs space-y-1.5">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[11px] font-bold text-slate-600">Cargos Expuestos:</span>
                <div id="badge-cargos-expuestos" class="flex flex-wrap gap-1">
                  <span class="text-slate-400 italic text-[11px]">Se deducen automáticamente de la actividad</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[11px] font-bold text-slate-600">Herramientas / Activos:</span>
                <div id="badge-herramientas-expuestas" class="flex flex-wrap gap-1">
                  <span class="text-slate-400 italic text-[11px]">Sin herramientas asociadas</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="r-rutinaria" checked class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer">
              <label for="r-rutinaria" class="text-xs font-medium text-slate-700 cursor-pointer">Esta actividad o tarea es rutinaria</label>
            </div>
          </div>

          <!-- 2. Clasificación del Peligro y Efectos -->
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500">2. Clasificación del Peligro y Efectos</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Clasificación del Peligro *</label>
                <select id="r-clasificacion" required class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800">
                  ${Object.keys(CLASIFICACION_PELIGROS_GTC45).map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Descripción Específica del Peligro *</label>
                <input type="text" id="r-descripcion" required placeholder="Ej. Elementos de máquinas en movimiento" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500">
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1">Efectos Posibles en la Salud del Trabajador *</label>
                <input type="text" id="r-efectos" required placeholder="Ej. Laceraciones, fracturas, atrapamiento" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500">
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1">Controles Existentes Actuales (Fuente, Medio, Individuo)</label>
                <input type="text" id="r-controles" placeholder="Ej. Guardas mecánicas, señalización, guantes de nitrilo" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500">
              </div>
            </div>
          </div>

          <!-- 3. Calculadora Oficial GTC 45:2012 -->
          <div class="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-wider text-indigo-900">3. Calculadora Oficial de Riesgo GTC 45</span>
              <span class="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 font-mono">ND × NE × NC = NR</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nivel de Deficiencia (ND) *</label>
                <select id="calc-nd" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold">
                  ${OPCIONES_ND.map(o => `<option value="${o.valor}">${o.etiqueta}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nivel de Exposición (NE) *</label>
                <select id="calc-ne" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold">
                  ${OPCIONES_NE.map(o => `<option value="${o.valor}">${o.etiqueta}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nivel de Consecuencia (NC) *</label>
                <select id="calc-nc" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold">
                  ${OPCIONES_NC.map(o => `<option value="${o.valor}">${o.etiqueta}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Panel de Resultados de la Calculadora -->
            <div class="p-3 bg-white rounded-lg border border-indigo-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400">Probabilidad (NP)</span>
                <div id="res-np" class="text-lg font-black text-slate-800">18</div>
                <div id="res-np-txt" class="text-[10px] text-slate-500 font-semibold">Alto (A)</div>
              </div>

              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400">Consecuencia (NC)</span>
                <div id="res-nc" class="text-lg font-black text-slate-800">60</div>
                <div class="text-[10px] text-slate-500 font-semibold">Muy Grave</div>
              </div>

              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400">Nivel de Riesgo (NR)</span>
                <div id="res-nr" class="text-lg font-black text-slate-800">1080</div>
                <div id="res-nivel" class="text-[10px] font-black text-red-600">Nivel I</div>
              </div>

              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400">Aceptabilidad</span>
                <div id="res-acept" class="text-sm font-extrabold text-red-600 mt-1">No Aceptable</div>
              </div>
            </div>
            <div id="res-significado" class="text-[11px] text-indigo-950 font-medium italic bg-indigo-100/60 p-2 rounded border border-indigo-200">
              Situación crítica. Suspender actividades hasta que el riesgo esté bajo control. Intervención urgente.
            </div>
          </div>

          <!-- 4. Jerarquía de Medidas de Intervención -->
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500">4. Medidas de Intervención (Jerarquía de Controles MinTrabajo)</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Eliminación</label>
                <input type="text" id="m-eliminacion" placeholder="Ej. Automatización total de la carga" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Sustitución</label>
                <input type="text" id="m-sustitucion" placeholder="Ej. Reemplazar por insumo no inflamable" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Controles de Ingeniería</label>
                <input type="text" id="m-ingenieria" placeholder="Ej. Guardas perimetrales y extractores de polvo" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Controles Administrativos</label>
                <input type="text" id="m-administrativos" placeholder="Ej. Procedimientos PTS y pausas activas" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
              <div class="md:col-span-2">
                <label class="block font-bold text-slate-700 mb-1">Equipos de Protección Personal (EPP)</label>
                <input type="text" id="m-epp" placeholder="Ej. Mascarilla N95, protección auditiva y botas dieléctricas" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onclick="window.cerrarModalRiesgo()" class="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition shadow-sm cursor-pointer">
              Guardar en Matriz GTC 45
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Listeners de búsqueda con debounce
  let timerBusquedaMatriz = null;
  document.getElementById('input-buscar-matriz').addEventListener('input', (e) => {
    filtroBusqueda = e.target.value;
    if (timerBusquedaMatriz) clearTimeout(timerBusquedaMatriz);
    timerBusquedaMatriz = setTimeout(() => {
      renderMatrix();
    }, 200);
  });

  // Listeners de la calculadora interactiva
  const selND = document.getElementById('calc-nd');
  const selNE = document.getElementById('calc-ne');
  const selNC = document.getElementById('calc-nc');

  const actualizarCalculadoraGTC = () => {
    const nd = selND.value;
    const ne = selNE.value;
    const nc = selNC.value;

    const calc = evaluarGTC45(nd, ne, nc);

    document.getElementById('res-np').innerText = calc.np;
    document.getElementById('res-np-txt').innerText = calc.interpretacionNP;
    document.getElementById('res-nc').innerText = calc.nc;
    document.getElementById('res-nr').innerText = calc.nr;
    
    const nivelEl = document.getElementById('res-nivel');
    nivelEl.innerText = `Nivel ${calc.nivelRiesgo}`;
    nivelEl.className = `text-[10px] font-black text-${calc.color}-600`;

    const aceptEl = document.getElementById('res-acept');
    aceptEl.innerText = calc.aceptabilidad;
    aceptEl.className = `text-sm font-extrabold text-${calc.color}-600 mt-1`;

    document.getElementById('res-significado').innerText = calc.significado;
  };

  selND.addEventListener('change', actualizarCalculadoraGTC);
  selNE.addEventListener('change', actualizarCalculadoraGTC);
  selNC.addEventListener('change', actualizarCalculadoraGTC);

  // Form Submit
  document.getElementById('form-riesgo').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('riesgo-id').value;
    const nd = selND.value;
    const ne = selNE.value;
    const nc = selNC.value;
    const calc = evaluarGTC45(nd, ne, nc);

    const procId = document.getElementById('r-select-proceso').value;
    const actId = document.getElementById('r-select-actividad').value;

    // Obtener cargos expuestos derivados
    let cargosExp = [];
    if (actId && actId !== 'otra') {
      const paps = (store.data.process_activity_positions || []).filter(pap => pap.process_activity_id === actId);
      cargosExp = paps.map(pap => {
        const c = cargos.find(cg => cg.id === pap.job_position_id);
        return c ? c.title : null;
      }).filter(Boolean);
    }

    const riesgoData = {
      id: id || undefined,
      companyId: empresaActiva.id,
      process_id: (procId && procId !== 'otro') ? procId : null,
      process_activity_id: (actId && actId !== 'otra') ? actId : null,
      proceso: document.getElementById('r-proceso').value.trim(),
      zonaLugar: document.getElementById('r-zona').value.trim(),
      actividad: document.getElementById('r-actividad').value.trim(),
      tarea: document.getElementById('r-tarea').value.trim(),
      rutinaria: document.getElementById('r-rutinaria').checked,
      exposed_job_positions: cargosExp,
      peligroClasificacion: document.getElementById('r-clasificacion').value,
      peligroDescripcion: document.getElementById('r-descripcion').value.trim(),
      efectosPosibles: document.getElementById('r-efectos').value.trim(),
      controlesExistentes: document.getElementById('r-controles').value.trim(),
      nd: calc.nd,
      ne: calc.ne,
      np: calc.np,
      nc: calc.nc,
      nr: calc.nr,
      interpretacionNR: calc.nivelRiesgo,
      aceptabilidad: calc.aceptabilidad,
      medidasIntervencion: {
        eliminacion: document.getElementById('m-eliminacion').value.trim() || 'No aplica',
        sustitucion: document.getElementById('m-sustitucion').value.trim() || 'No aplica',
        ingenieria: document.getElementById('m-ingenieria').value.trim() || 'No aplica',
        administrativos: document.getElementById('m-administrativos').value.trim() || 'No aplica',
        epp: document.getElementById('m-epp').value.trim() || 'No aplica'
      }
    };

    store.saveRiesgo(riesgoData);
    window.cerrarModalRiesgo();
    renderMatrix();
    if (window.mostrarNotificacion) window.mostrarNotificacion("Peligro y valoración GTC 45 guardados exitosamente.", "success");
  });
}

// Handler al cambiar de proceso en el modal
window.alCambiarProcesoMatriz = function(procId) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const inputProc = document.getElementById('r-proceso');
  const selectAct = document.getElementById('r-select-actividad');

  if (!procId || procId === 'otro') {
    if (procId === 'otro') inputProc.value = '';
    selectAct.innerHTML = '<option value="otra">-- Actividad Manual / Personalizada --</option>';
    return;
  }

  const proc = store.getProcess(procId);
  if (proc) {
    inputProc.value = proc.name;
    const actividades = store.getProcessActivities(procId);

    selectAct.innerHTML = `
      <option value="">-- Seleccionar Actividad PHVA --</option>
      ${actividades.map(a => `<option value="${a.id}">[${a.phva_phase}] ${a.activity_name}</option>`).join('')}
      <option value="otra">-- Otra Actividad Manual --</option>
    `;
  }
};

// Handler al cambiar de actividad en el modal
window.alCambiarActividadMatriz = function(actId) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva || !actId || actId === 'otra') return;

  const act = (store.data.process_activities || []).find(a => a.id === actId);
  if (!act) return;

  document.getElementById('r-actividad').value = act.activity_name;
  document.getElementById('r-tarea').value = act.description || act.activity_name;
  document.getElementById('r-rutinaria').checked = act.is_routine !== undefined ? !!act.is_routine : (act.routine_type !== 'No_Rutinaria');

  // Derivar cargos expuestos
  const cargos = store.getJobPositions(empresaActiva.id);
  const paps = (store.data.process_activity_positions || []).filter(pap => pap.process_activity_id === act.id);
  const cargosExp = paps.map(pap => {
    const c = cargos.find(cg => cg.id === pap.job_position_id);
    return c ? c.title : null;
  }).filter(Boolean);

  const containerCargos = document.getElementById('badge-cargos-expuestos');
  if (containerCargos) {
    containerCargos.innerHTML = cargosExp.length > 0 
      ? cargosExp.map(cg => `<span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-200">👤 ${cg}</span>`).join('')
      : '<span class="text-slate-400 italic text-[11px]">Sin cargos específicos asignados</span>';
  }

  // Derivar herramientas asociadas
  const herramientas = store.getTools(empresaActiva.id);
  const herramientasAsoc = (act.associated_tools_ids || []).map(tid => herramientas.find(h => h.id === tid)).filter(Boolean);

  const containerHerramientas = document.getElementById('badge-herramientas-expuestas');
  if (containerHerramientas) {
    containerHerramientas.innerHTML = herramientasAsoc.length > 0
      ? herramientasAsoc.map(h => `<span class="px-2 py-0.5 bg-teal-50 text-teal-800 rounded text-[10px] font-bold border border-teal-200">⚙️ ${h.exact_name}</span>`).join('')
      : '<span class="text-slate-400 italic text-[11px]">Ninguna</span>';
  }
};

// Pre-identificación con IA (GTC 45)
window.preidentificarPeligroConIA = async function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const btn = document.getElementById('btn-preidentificar-ia');
  const activityName = document.getElementById('r-actividad')?.value.trim();
  const description = document.getElementById('r-tarea')?.value.trim();

  if (!activityName) {
    alert("Por favor selecciona o escribe primero el nombre de la actividad.");
    return;
  }

  // Obtener herramientas asociadas actuales
  const actId = document.getElementById('r-select-actividad')?.value;
  const act = (store.data.process_activities || []).find(a => a.id === actId);
  const herramientas = store.getTools(empresaActiva.id);
  const toolsNames = act && Array.isArray(act.associated_tools_ids) 
    ? act.associated_tools_ids.map(tid => {
        const h = herramientas.find(tool => tool.id === tid);
        return h ? h.exact_name : null;
      }).filter(Boolean)
    : [];

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    Analizando con IA...
  `;

  const generarSugerenciaPeligroLocal = () => {
    const txt = `${activityName} ${description} ${toolsNames.join(' ')} ${empresaActiva.sector || ''}`.toLowerCase();
    let clasificacion = 'Condiciones de Seguridad';
    let peligro = 'Peligro Mecánico: Elementos de máquinas en movimiento, herramientas punzantes o de impacto';
    let efectos = 'Heridas, laceraciones, atrapamientos, contusiones y fracturas óseas';
    let nd = 2, ne = 3, nc = 10;
    let ctrl_fuente = 'Guardas perimetrales fijas en puntos de atrapamiento y paradas de emergencia accesibles';
    let ctrl_medio = 'Demarcación de zonas de peligro en piso y señalización de advertencia preventiva';
    let ctrl_individuo = 'Capacitación en uso seguro de herramientas, inspección preoperacional obligatoria y uso de guantes de protección mecánica';

    if (txt.includes('horno') || txt.includes('temperatura') || txt.includes('calor') || txt.includes('quemadur')) {
      clasificacion = 'Físico';
      peligro = 'Temperaturas Extremas (Calor radiante continuo por hornos industriales)';
      efectos = 'Deshidratación severa, estrés térmico, quemaduras por contacto y fatiga prematura';
      nd = 6; ne = 4; nc = 25;
      ctrl_fuente = 'Aislamiento térmico en paredes del horno túnel con ladrillo refractario de alta densidad';
      ctrl_medio = 'Extractores de aire de tiro forzado, ventilación mecánica inducida y monitoreo térmico permanente';
      ctrl_individuo = 'Suministro continuo de puntos de hidratación electrolítica, pausas en zonas aclimatadas, guantes aluminizados y careta facial';
    } else if (txt.includes('electric') || txt.includes('eléctric') || txt.includes('cable') || txt.includes('tablero') || txt.includes('acometida')) {
      clasificacion = 'Condiciones de Seguridad';
      peligro = 'Peligro Eléctrico: Contacto directo o indirecto con circuitos energizados en media/baja tensión';
      efectos = 'Electrocución, choque eléctrico, fibrilación ventricular, quemaduras internas o secundarias';
      nd = 6; ne = 2; nc = 25;
      ctrl_fuente = 'Protocolo de bloqueo y tarjeteo (LOTO), revelación y verificación de ausencia de tensión en barrajes';
      ctrl_medio = 'Tapetes dieléctricos certificados frente a tableros, puesta a tierra de protección y barandas aislantes';
      ctrl_individuo = 'Personal con matrícula CONTE/RETIE, guantes dieléctricos certificados y botas de seguridad 100% dieléctricas';
    } else if (txt.includes('molienda') || txt.includes('particulado') || txt.includes('polvo') || txt.includes('arcilla') || txt.includes('químic')) {
      clasificacion = 'Químico';
      peligro = 'Material Particulado Inhalable (Polvos minerales inorgánicos y sílice cristalina)';
      efectos = 'Neumoconiosis, silicosis, bronquitis crónica, irritación de mucosas y alergias respiratorias';
      nd = 6; ne = 3; nc = 10;
      ctrl_fuente = 'Sistemas de captación localizada de polvo en tolvas y aspersores de humectación controlada';
      ctrl_medio = 'Cerramiento de naves de molienda y monitoreo gravimétrico de calidad de aire';
      ctrl_individuo = 'Respiradores con filtro N95 / P100 certificados, capacitación en riesgo químico y vigilancia epidemiológica respiratoria';
    } else if (txt.includes('montacarga') || txt.includes('carga') || txt.includes('postura') || txt.includes('estibad') || txt.includes('bulto')) {
      clasificacion = 'Biomecánico';
      peligro = 'Manipulación Manual de Cargas, Sobreesfuerzo y Posturas Forzadas Prolongadas';
      efectos = 'Lumbalgias mecánicas agudas, hernias discales, espasmos dorsolumbares y desórdenes musculoesqueléticos';
      nd = 6; ne = 3; nc = 10;
      ctrl_fuente = 'Paletizadoras mecánicas, montacargas con uña hidráulica y mesas de altura regulable';
      ctrl_medio = 'Distribución ergonómica de puestos de trabajo y eliminación de obstáculos en pasillos';
      ctrl_individuo = 'Programa activo de gimnasia laboral y pausas dinámicas, capacitación en higiene postural';
    }

    return {
      peligroClasificacion: clasificacion,
      peligroDescripcion: peligro,
      efectosPosibles: efectos,
      controlesExistentes: { fuente: ctrl_fuente, medio: ctrl_medio, individuo: ctrl_individuo },
      evaluacionRiesgo: { nd, ne, nc },
      medidasIntervencion: {
        eliminacion: 'Evaluar automatización total de la fase si el proceso lo permite',
        sustitucion: 'Reemplazar insumos o métodos de mayor impacto por alternativas de menor riesgo',
        ingenieria: ctrl_fuente,
        administrativos: `Capacitaciones continuas, pausas activas e inspecciones preoperacionales según estándar ${empresaActiva.claseRiesgo || 'III'}`,
        epp: ctrl_individuo
      }
    };
  };

  try {
    let sug = null;
    try {
      const response = await fetch('/api/matrix/ai-pre-identify-hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: empresaActiva.id,
          activity_name: activityName,
          description: description,
          tools_names: toolsNames,
          sector: empresaActiva.sector || '',
          clase_riesgo: empresaActiva.claseRiesgo || 'III'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.hazard_suggestion) {
          sug = data.hazard_suggestion;
        }
      }
    } catch (netErr) {
      console.warn("Usando motor local GTC 45:", netErr);
    }

    if (!sug) {
      sug = generarSugerenciaPeligroLocal();
    }

    // Actualizar campos del formulario
    document.getElementById('r-clasificacion').value = sug.peligroClasificacion || 'Condiciones de Seguridad';
    document.getElementById('r-descripcion').value = sug.peligroDescripcion || '';
    document.getElementById('r-efectos').value = sug.efectosPosibles || '';
    document.getElementById('r-controles').value = typeof sug.controlesExistentes === 'object' 
      ? `Fuente: ${sug.controlesExistentes.fuente || 'N/A'}. Medio: ${sug.controlesExistentes.medio || 'N/A'}. Individuo: ${sug.controlesExistentes.individuo || 'N/A'}`
      : (sug.controlesExistentes || '');

    if (sug.evaluacionRiesgo) {
      document.getElementById('calc-nd').value = String(sug.evaluacionRiesgo.nd || '2');
      document.getElementById('calc-ne').value = String(sug.evaluacionRiesgo.ne || '3');
      document.getElementById('calc-nc').value = String(sug.evaluacionRiesgo.nc || '10');
    }

    if (sug.medidasIntervencion) {
      document.getElementById('m-eliminacion').value = sug.medidasIntervencion.eliminacion || 'No aplica';
      document.getElementById('m-sustitucion').value = sug.medidasIntervencion.sustitucion || 'No aplica';
      document.getElementById('m-ingenieria').value = sug.medidasIntervencion.ingenieria || 'No aplica';
      document.getElementById('m-administrativos').value = sug.medidasIntervencion.administrativos || 'No aplica';
      document.getElementById('m-epp').value = sug.medidasIntervencion.epp || 'No aplica';
    }

    // Disparar recálculo de la calculadora interactiva
    const ev = new Event('change');
    document.getElementById('calc-nd').dispatchEvent(ev);

    if (window.mostrarNotificacion) {
      window.mostrarNotificacion("✨ Peligro GTC 45, efectos y jerarquía de controles pre-identificados por IA.", "success");
    }
  } catch (err) {
    console.error("Error pre-identificando peligro:", err);
    alert("No fue posible pre-identificar con IA: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
};

export function abrirModalRiesgo(riesgo = null) {
  const modal = document.getElementById('modal-riesgo');
  const titulo = document.getElementById('modal-riesgo-titulo');
  const form = document.getElementById('form-riesgo');
  const empresaActiva = store.getEmpresaActiva();

  form.reset();

  if (riesgo) {
    titulo.innerText = "Editar Peligro en Matriz GTC 45";
    document.getElementById('riesgo-id').value = riesgo.id;
    document.getElementById('r-proceso').value = riesgo.proceso || '';
    document.getElementById('r-zona').value = riesgo.zonaLugar || '';
    document.getElementById('r-actividad').value = riesgo.actividad || '';
    document.getElementById('r-tarea').value = riesgo.tarea || '';
    document.getElementById('r-rutinaria').checked = !!riesgo.rutinaria;
    document.getElementById('r-clasificacion').value = riesgo.peligroClasificacion || 'Condiciones de Seguridad';
    document.getElementById('r-descripcion').value = riesgo.peligroDescripcion || '';
    document.getElementById('r-efectos').value = riesgo.efectosPosibles || '';
    document.getElementById('r-controles').value = riesgo.controlesExistentes || '';
    document.getElementById('calc-nd').value = riesgo.nd || '2';
    document.getElementById('calc-ne').value = riesgo.ne || '3';
    document.getElementById('calc-nc').value = riesgo.nc || '10';
    document.getElementById('m-eliminacion').value = riesgo.medidasIntervencion?.eliminacion || '';
    document.getElementById('m-sustitucion').value = riesgo.medidasIntervencion?.sustitucion || '';
    document.getElementById('m-ingenieria').value = riesgo.medidasIntervencion?.ingenieria || '';
    document.getElementById('m-administrativos').value = riesgo.medidasIntervencion?.administrativos || '';
    document.getElementById('m-epp').value = riesgo.medidasIntervencion?.epp || '';

    // Seleccionar proceso y actividad si existen
    if (riesgo.process_id) {
      document.getElementById('r-select-proceso').value = riesgo.process_id;
      window.alCambiarProcesoMatriz(riesgo.process_id);
      if (riesgo.process_activity_id) {
        document.getElementById('r-select-actividad').value = riesgo.process_activity_id;
        window.alCambiarActividadMatriz(riesgo.process_activity_id);
      }
    }
  } else {
    titulo.innerText = "Identificar Nuevo Peligro en Matriz GTC 45";
    document.getElementById('riesgo-id').value = '';
    document.getElementById('calc-nd').value = '6';
    document.getElementById('calc-ne').value = '3';
    document.getElementById('calc-nc').value = '25';
    document.getElementById('r-select-proceso').value = '';
    document.getElementById('r-select-actividad').innerHTML = '<option value="">-- Selecciona un proceso primero --</option>';
    document.getElementById('badge-cargos-expuestos').innerHTML = '<span class="text-slate-400 italic text-[11px]">Se deducen automáticamente de la actividad</span>';
    document.getElementById('badge-herramientas-expuestas').innerHTML = '<span class="text-slate-400 italic text-[11px]">Sin herramientas asociadas</span>';
  }

  // Disparar actualización de calculadora
  const event = new Event('change');
  document.getElementById('calc-nd').dispatchEvent(event);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

window.abrirModalRiesgo = abrirModalRiesgo;

window.editarRiesgo = function(id) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const matriz = store.getMatriz(empresaActiva.id);
  const riesgo = matriz.find(r => r.id === id);
  if (riesgo) {
    abrirModalRiesgo(riesgo);
  }
};

window.eliminarRiesgo = function(id) {
  store.deleteRiesgo(id);
  renderMatrix();
};

window.cerrarModalRiesgo = function() {
  const modal = document.getElementById('modal-riesgo');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.filtrarNivelMatriz = function(nivel) {
  filtroNivel = nivel;
  renderMatrix();
};

window.sincronizarMatrizDesdeProcesos = function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const procesos = store.getProcesses(empresaActiva.id);
  const actividades = store.getAllProcessActivities(empresaActiva.id);
  const cargos = store.getJobPositions(empresaActiva.id);
  const matrizActual = store.getMatriz(empresaActiva.id);

  if (procesos.length === 0 || actividades.length === 0) {
    alert('Primero genera o registra los procesos y actividades PHVA en el módulo "Mapa de Procesos & Organigrama".');
    window.location.hash = '#procesos';
    return;
  }

  let nuevosCreados = 0;
  // Priorizar actividades de la fase "Hacer" y "Verificar"
  const actsPrioritarias = actividades.filter(a => a.phva_phase === 'Hacer' || a.phva_phase === 'Verificar');
  const pool = actsPrioritarias.length > 0 ? actsPrioritarias : actividades;

  const catalogoPeligrosPorFase = [
    {
      clasificacion: 'Condiciones de Seguridad',
      descripcion: 'Mecánico: Operación de maquinaria, equipos en movimiento, atrapamiento o contacto con superficies de trabajo',
      efectos: 'Heridas, contusiones, atrapamientos, lesiones osteomusculares o traumas por contacto mecánico',
      nd: 6, ne: 3, nc: 25,
      ing: 'Guardas de seguridad físicas, sensores de parada de emergencia y bloqueo/etiquetado (LOTO)',
      adm: 'Inspección preoperacional diaria, Plan de Trabajo Seguro (PTS) y capacitación técnica',
      epp: 'Casco dieléctrico/seguridad, guantes de protección mecánica, botas con puntera y gafas ANSI Z87.1'
    },
    {
      clasificacion: 'Biomecánico',
      descripcion: 'Posturas prolongadas, movimientos repetitivos y manipulación manual de cargas e insumos del proceso',
      efectos: 'Lumbalgias, fatiga muscular, desórdenes musculoesqueléticos (DME) de miembro superior y espalda',
      nd: 2, ne: 4, nc: 25,
      ing: 'Ayudas mecánicas para transporte de cargas, mesas regulables y diseño ergonómico del puesto',
      adm: 'Programa de Vigilancia Epidemiológica Osteomuscular, pausas activas e higiene postural',
      epp: 'Dotación ergonómica reglamentaria y calzado antideslizante'
    },
    {
      clasificacion: 'Físico',
      descripcion: 'Exposición a ruido continuo/intermitente, vibraciones o variaciones térmicas e iluminación en planta',
      efectos: 'Hipoacusia neurosensorial, fatiga visual, estrés térmico o cefalea ocupacional',
      nd: 2, ne: 3, nc: 25,
      ing: 'Aislamiento acústico de fuentes, ventilación mecánica y mantenimiento preventivo de motores',
      adm: 'Mediciones higiénicas ambientales, audiometrías periódicas y rotación de turnos',
      epp: 'Protectores auditivos de inserción/copa y gafas de protección con filtro UV'
    },
    {
      clasificacion: 'Psicosocial',
      descripcion: 'Gestión organizacional, demandas cuantitativas de la tarea, atención al detalle y cumplimiento de metas',
      efectos: 'Estrés laboral, fatiga mental, cefalea tensional y alteraciones del sueño',
      nd: 2, ne: 3, nc: 10,
      ing: 'Adecuación de espacios de bienestar y áreas de descanso',
      adm: 'Batería de Riesgo Psicosocial, Comité de Convivencia Laboral y equilibrio vida-trabajo',
      epp: 'No aplica'
    }
  ];

  pool.forEach((act, idx) => {
    const yaExiste = matrizActual.some(m => m.process_activity_id === act.id || (m.actividad && m.actividad.toLowerCase() === (act.activity_name || '').toLowerCase()));
    if (yaExiste) return;

    const proc = procesos.find(p => p.id === act.process_id);
    if (!proc) return;

    const paps = (store.data.process_activity_positions || []).filter(pap => pap.process_activity_id === act.id);
    const cargosExp = paps.map(pap => {
      const c = cargos.find(cg => cg.id === pap.job_position_id);
      return c ? c.title : null;
    }).filter(Boolean);

    const tpl = catalogoPeligrosPorFase[idx % catalogoPeligrosPorFase.length];
    const calc = calcularValoresGTC45(tpl.nd, tpl.ne, tpl.nc);

    store.saveRiesgo({
      companyId: empresaActiva.id,
      process_id: proc.id,
      process_activity_id: act.id,
      proceso: `${proc.code} - ${proc.name}`,
      zonaLugar: proc.process_type === 'Misional' ? 'Área Operativa / Planta Principal' : 'Sede Administrativa y Operaciones',
      actividad: act.activity_name,
      tarea: act.description || act.activity_name,
      rutinaria: act.is_routine !== undefined ? !!act.is_routine : (act.routine_type !== 'No_Rutinaria'),
      exposed_job_positions: cargosExp.length > 0 ? cargosExp : ['Personal Operativo y Técnico'],
      associated_tools_ids: Array.isArray(act.associated_tools_ids) ? act.associated_tools_ids : [],
      peligroClasificacion: tpl.clasificacion,
      peligroDescripcion: tpl.descripcion,
      efectosPosibles: tpl.efectos,
      controlesExistentes: 'Inspección preoperacional, señalización preventiva y uso obligatorio de EPP.',
      nd: tpl.nd,
      ne: tpl.ne,
      np: calc.np,
      interpretacionNP: calc.interpretacionNP,
      nc: tpl.nc,
      nr: calc.nr,
      interpretacionNR: calc.interpretacionNR,
      aceptabilidad: calc.aceptabilidad,
      medidasIntervencion: {
        eliminacion: 'No aplica',
        sustitucion: 'No aplica',
        ingenieria: tpl.ing,
        administrativos: tpl.adm,
        epp: tpl.epp
      }
    });
    nuevosCreados++;
  });

  renderMatrix();
  if (window.mostrarNotificacion) {
    window.mostrarNotificacion(nuevosCreados > 0 ? `✅ Se sincronizaron ${nuevosCreados} peligros en la Matriz GTC 45 desde el Mapa de Procesos.` : `ℹ️ Todos los procesos y actividades PHVA ya están sincronizados en la Matriz GTC 45.`, 'success');
  }
};

window.imprimirMatrizGTC45PDF = function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const matriz = store.getMatriz(empresaActiva.id);

  const win = window.open('', '_blank');
  if (!win) {
    alert('Por favor habilita las ventanas emergentes para imprimir la Matriz GTC 45.');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>MATRIZ DE PELIGROS GTC 45 - ${empresaActiva.razonSocial}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 18px; }
        .header { display: flex; justify-content: space-between; align-items: center; border: 2px solid #0f172a; padding: 10px; margin-bottom: 12px; }
        h1 { font-size: 14px; margin: 0; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px; text-align: left; vertical-align: top; }
        th { background: #0f172a; color: white; font-size: 9px; text-transform: uppercase; }
        .lvl-I { background: #fee2e2; color: #991b1b; font-weight: bold; }
        .lvl-II { background: #ffedd5; color: #9a3412; font-weight: bold; }
        .lvl-III { background: #fef3c7; color: #92400e; font-weight: bold; }
        .lvl-IV { background: #d1fae5; color: #065f46; font-weight: bold; }
        @media print { .no-print { display: none; } @page { size: landscape; margin: 10mm; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:10px; text-align:right;">
        <button onclick="window.print()" style="padding:8px 16px; background:#4f46e5; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Imprimir / Guardar en PDF</button>
      </div>
      <div class="header" style="display: flex; align-items: center; justify-content: space-between; border: 2px solid #0f172a; padding: 10px 14px; margin-bottom: 12px; gap: 15px;">
        <div style="flex-shrink: 0; min-width: 140px; text-align: center;">
          ${empresaActiva.logoUrl 
            ? `<img src="${empresaActiva.logoUrl}" alt="${empresaActiva.razonSocial}" style="max-height: 52px; max-width: 145px; object-fit: contain;">`
            : `<div style="font-weight: 900; font-size: 13pt; color: #0f172a;">${empresaActiva.razonSocial}</div>`}
        </div>
        <div style="flex: 1; padding: 0 10px;">
          <h1 style="font-size: 13px; margin: 0 0 4px; color: #0f172a; text-transform: uppercase;">MATRIZ DE IDENTIFICACIÓN DE PELIGROS, EVALUACIÓN Y VALORACIÓN DE RIESGOS (GTC 45)</h1>
          <div style="font-size: 9.5px; color: #334155;"><strong>Empresa:</strong> ${empresaActiva.razonSocial} | <strong>NIT:</strong> ${empresaActiva.nit} | <strong>Clase de Riesgo:</strong> ${empresaActiva.claseRiesgo}</div>
        </div>
        <div style="text-align: right; font-size: 9px; line-height: 1.4; flex-shrink: 0;">
          <div><strong>Código:</strong> FT-SST-GTC45-01</div>
          <div><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</div>
          <div><strong>Registros:</strong> ${matriz.length} peligros</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Proceso / Zona</th>
            <th>Actividad / Tarea</th>
            <th>Cargos Expuestos</th>
            <th>Clasificación y Peligro</th>
            <th>Efectos Posibles</th>
            <th>ND×NE=NP</th>
            <th>NC</th>
            <th>NR / Nivel</th>
            <th>Aceptabilidad</th>
            <th>Controles (Ingeniería / Admin / EPP)</th>
          </tr>
        </thead>
        <tbody>
          ${matriz.map(m => `
            <tr>
              <td><strong>${m.proceso}</strong><br>${m.zonaLugar || ''}</td>
              <td><strong>${m.actividad}</strong><br>${m.tarea || ''} (${m.rutinaria ? 'Rutinaria' : 'No Rutinaria'})</td>
              <td>${Array.isArray(m.exposed_job_positions) ? m.exposed_job_positions.join(', ') : (m.exposed_job_positions || 'Personal Operativo')}</td>
              <td><strong>${m.peligroClasificacion}:</strong> ${m.peligroDescripcion}</td>
              <td>${m.efectosPosibles}</td>
              <td style="text-align:center;">${m.nd}×${m.ne}=${m.np}</td>
              <td style="text-align:center;">${m.nc}</td>
              <td class="lvl-${m.interpretacionNR}" style="text-align:center;">Nivel ${m.interpretacionNR} (${m.nr})</td>
              <td>${m.aceptabilidad}</td>
              <td><strong>Ing:</strong> ${m.medidasIntervencion?.ingenieria || 'N/A'}<br><strong>Adm:</strong> ${m.medidasIntervencion?.administrativos || 'N/A'}<br><strong>EPP:</strong> ${m.medidasIntervencion?.epp || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `);
  win.document.close();
};

window.exportarMatrizCSV = function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const matriz = store.getMatriz(empresaActiva.id);

  let csv = "Proceso;Zona/Lugar;Actividad;Tarea;Rutinaria;Cargos Expuestos;Peligro Clasificación;Peligro Descripción;Efectos Posibles;Controles Existentes;ND;NE;NP;NC;NR;Nivel Riesgo;Aceptabilidad;Medidas Ingeniería;Medidas Administrativos;EPP\n";

  matriz.forEach(m => {
    const cargosStr = Array.isArray(m.exposed_job_positions) ? m.exposed_job_positions.join(', ') : (m.exposed_job_positions || '');
    csv += `"${m.proceso}";"${m.zonaLugar}";"${m.actividad}";"${m.tarea}";"${m.rutinaria ? 'SI' : 'NO'}";"${cargosStr}";"${m.peligroClasificacion}";"${m.peligroDescripcion}";"${m.efectosPosibles}";"${m.controlesExistentes || ''}";"${m.nd}";"${m.ne}";"${m.np}";"${m.nc}";"${m.nr}";"${m.interpretacionNR}";"${m.aceptabilidad}";"${m.medidasIntervencion?.ingenieria || ''}";"${m.medidasIntervencion?.administrativos || ''}";"${m.medidasIntervencion?.epp || ''}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Matriz_GTC45_${empresaActiva.razonSocial.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
