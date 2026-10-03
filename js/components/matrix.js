// =============================================================================
// COMPONENTE: MATRIZ DE PELIGROS Y VALORACIÓN DE RIESGOS (GTC 45:2012)
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
      <div class="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto">
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

  const matrizFiltrada = matriz.filter(m => {
    if (!m) return false;
    const cumpleNivel = filtroNivel === 'TODOS' || m.interpretacionNR === filtroNivel;
    const term = (filtroBusqueda || '').toLowerCase().trim();
    const cumpleBusqueda = !term || 
      (m.proceso || '').toLowerCase().includes(term) ||
      (m.zonaLugar || '').toLowerCase().includes(term) ||
      (m.peligroClasificacion || '').toLowerCase().includes(term) ||
      (m.peligroDescripcion || '').toLowerCase().includes(term);
    return cumpleNivel && cumpleBusqueda;
  });

  const badgeNR = {
    'I': 'bg-red-100 text-red-800 border-red-300',
    'II': 'bg-orange-100 text-orange-800 border-orange-300',
    'III': 'bg-amber-100 text-amber-800 border-amber-300',
    'IV': 'bg-emerald-100 text-emerald-800 border-emerald-300'
  };

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Encabezado de la Matriz -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
            <span>Guía Técnica Colombiana GTC 45:2012</span>
            <span>•</span>
            <span>Decreto 1072 Art. 2.2.4.6.15</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-800 mt-1">Matriz de Identificación de Peligros y Riesgos</h1>
          <p class="text-sm text-slate-500 mt-1">Empresa: <strong>${empresaActiva.razonSocial}</strong> (${matriz.length} peligros valorados)</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button onclick="window.abrirVisorDiagrama(null, 'mapa_procesos')" class="px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-sm" title="Consultar Mapa de Procesos de la empresa">
            <span>🗺️</span>
            <span>Mapa de Procesos</span>
          </button>
          <button onclick="window.abrirModalRiesgo()" class="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Identificar Nuevo Peligro
          </button>
          <button onclick="window.exportarMatrizCSV()" class="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition flex items-center gap-1.5 shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar CSV
          </button>
        </div>
      </div>

      <!-- Barra de Filtros y Resumen de Criticidad -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold text-slate-400 uppercase mr-1">Nivel de Riesgo:</span>
          <button onclick="window.filtrarNivelMatriz('TODOS')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroNivel === 'TODOS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            Todos (${matriz.length})
          </button>
          <button onclick="window.filtrarNivelMatriz('I')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroNivel === 'I' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}">
            Nivel I - Crítico (${matriz.filter(m => m.interpretacionNR === 'I').length})
          </button>
          <button onclick="window.filtrarNivelMatriz('II')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroNivel === 'II' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}">
            Nivel II (${matriz.filter(m => m.interpretacionNR === 'II').length})
          </button>
          <button onclick="window.filtrarNivelMatriz('III')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroNivel === 'III' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}">
            Nivel III (${matriz.filter(m => m.interpretacionNR === 'III').length})
          </button>
          <button onclick="window.filtrarNivelMatriz('IV')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroNivel === 'IV' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">
            Nivel IV (${matriz.filter(m => m.interpretacionNR === 'IV').length})
          </button>
        </div>

        <div class="relative w-full md:w-64">
          <input 
            type="text" 
            id="input-buscar-matriz"
            placeholder="Buscar por proceso, peligro..." 
            value="${filtroBusqueda}"
            class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
          <svg class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <!-- Tabla Estilo AppSheet de la Matriz GTC 45 -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-800 text-white font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th class="p-3 border-r border-slate-700">Proceso / Zona</th>
                <th class="p-3 border-r border-slate-700">Actividad / Tarea</th>
                <th class="p-3 border-r border-slate-700">Peligro Identificado</th>
                <th class="p-3 border-r border-slate-700 text-center">Efectos Posibles</th>
                <th class="p-3 border-r border-slate-700 text-center">ND × NE = NP</th>
                <th class="p-3 border-r border-slate-700 text-center">NC</th>
                <th class="p-3 border-r border-slate-700 text-center">NR y Nivel</th>
                <th class="p-3 border-r border-slate-700">Aceptabilidad</th>
                <th class="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${matrizFiltrada.length === 0 ? `
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400 text-xs">
                    No hay registros de peligros en este filtro. Haz clic en "Identificar Nuevo Peligro".
                  </td>
                </tr>
              ` : matrizFiltrada.map(m => `
                <tr class="hover:bg-slate-50/80 transition">
                  <td class="p-3 border-r border-slate-100">
                    <span class="font-bold text-slate-800 block">${m.proceso}</span>
                    <span class="text-slate-500 text-[11px]">${m.zonaLugar}</span>
                  </td>
                  <td class="p-3 border-r border-slate-100 max-w-[200px]">
                    <span class="font-medium text-slate-800 block">${m.actividad}</span>
                    <span class="text-slate-400 text-[11px]">${m.tarea} (${m.rutinaria ? 'Rutinaria' : 'No Rutinaria'})</span>
                  </td>
                  <td class="p-3 border-r border-slate-100 max-w-[240px]">
                    <span class="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px] mb-1">
                      ${m.peligroClasificacion}
                    </span>
                    <p class="text-slate-700 font-medium leading-relaxed">${m.peligroDescripcion}</p>
                  </td>
                  <td class="p-3 border-r border-slate-100 text-slate-600 max-w-[180px]">
                    ${m.efectosPosibles}
                  </td>
                  <td class="p-3 border-r border-slate-100 text-center whitespace-nowrap">
                    <span class="font-mono text-slate-700 font-semibold">${m.nd} × ${m.ne} = <strong class="text-slate-900">${m.np}</strong></span>
                  </td>
                  <td class="p-3 border-r border-slate-100 text-center font-mono font-bold text-slate-800">
                    ${m.nc}
                  </td>
                  <td class="p-3 border-r border-slate-100 text-center whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-md font-black border text-xs ${badgeNR[m.interpretacionNR]}">
                      Nivel ${m.interpretacionNR} (${m.nr})
                    </span>
                  </td>
                  <td class="p-3 border-r border-slate-100">
                    <span class="font-semibold block ${m.interpretacionNR === 'I' ? 'text-red-700' : m.interpretacionNR === 'II' ? 'text-orange-700' : 'text-slate-700'}">
                      ${m.aceptabilidad}
                    </span>
                    <div class="text-[10px] text-slate-400 mt-1 max-w-[160px] truncate" title="${m.medidasIntervencion?.ingenieria || ''}">
                      Ing: ${m.medidasIntervencion?.ingenieria || 'N/A'}
                    </div>
                  </td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="window.editarRiesgo('${m.id}')" class="p-1 text-slate-400 hover:text-indigo-600 transition" title="Editar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button onclick="window.eliminarRiesgo('${m.id}')" class="p-1 text-slate-400 hover:text-red-600 transition" title="Eliminar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Formulario Matriz GTC 45 con Calculadora Integrada -->
    <div id="modal-riesgo" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 id="modal-riesgo-titulo" class="font-bold text-base text-slate-800">Identificación de Peligro y Valoración (GTC 45)</h3>
            <p class="text-xs text-slate-500">Diligencia la caracterización y la calculadora valorará el riesgo en tiempo real.</p>
          </div>
          <button onclick="window.cerrarModalRiesgo()" class="text-slate-400 hover:text-slate-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form id="form-riesgo" class="p-6 space-y-4">
          <input type="hidden" id="riesgo-id">

          <!-- 1. Caracterización del Puesto -->
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500">1. Localización y Actividad</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700">Proceso *</label>
                  <button type="button" onclick="window.abrirVisorDiagrama(null, 'mapa_procesos')" class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition" title="Consultar mapa de procesos de la empresa">
                    <span>🗺️</span> <span>Ver Mapa</span>
                  </button>
                </div>
                <input type="text" id="r-proceso" required placeholder="Ej. Operativo, Mantenimiento, Administrativo" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Zona / Lugar *</label>
                <input type="text" id="r-zona" required placeholder="Ej. Taller principal, Bodega, Recepción" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Actividad *</label>
                <input type="text" id="r-actividad" required placeholder="Ej. Despacho y carga en camión" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tarea *</label>
                <input type="text" id="r-tarea" required placeholder="Ej. Operación de estibador manual" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
              </div>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="r-rutinaria" checked class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4">
              <label for="r-rutinaria" class="text-xs font-medium text-slate-700">Esta actividad o tarea es rutinaria</label>
            </div>
          </div>

          <!-- 2. Clasificación del Peligro -->
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500">2. Clasificación del Peligro y Efectos</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Clasificación del Peligro *</label>
                <select id="r-clasificacion" required class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800">
                  ${Object.keys(CLASIFICACION_PELIGROS_GTC45).map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Descripción Específica del Peligro *</label>
                <input type="text" id="r-descripcion" required placeholder="Ej. Movimiento repetitivo al empacar cajas" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1">Efectos Posibles en la Salud del Trabajador *</label>
                <input type="text" id="r-efectos" required placeholder="Ej. Traumatismos, tendinitis, heridas o contusiones" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1">Controles Existentes Actuales (Fuente, Medio, Individuo)</label>
                <input type="text" id="r-controles" placeholder="Ej. Mantenimiento mensual, capacitación al personal, uso de guantes de nitrilo" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
              </div>
            </div>
          </div>

          <!-- 3. Calculadora Oficial GTC 45:2012 -->
          <div class="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase tracking-wider text-indigo-900">3. Calculadora Oficial de Riesgo GTC 45</span>
              <span class="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">ND × NE × NC = NR</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nivel de Deficiencia (ND) *</label>
                <select id="calc-nd" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold">
                  ${OPCIONES_ND.map(o => `<option value="${o.valor}">${o.etiqueta}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nivel de Exposición (NE) *</label>
                <select id="calc-ne" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold">
                  ${OPCIONES_NE.map(o => `<option value="${o.valor}">${o.etiqueta}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nivel de Consecuencia (NC) *</label>
                <select id="calc-nc" class="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold">
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
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500">4. Medidas de Intervención (Jerarquía de Controles)</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Eliminación</label>
                <input type="text" id="m-eliminacion" placeholder="Ej. Modificar diseño para eliminar el peligro" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Sustitución</label>
                <input type="text" id="m-sustitucion" placeholder="Ej. Reemplazar químico por uno biodegradable" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Controles de Ingeniería</label>
                <input type="text" id="m-ingenieria" placeholder="Ej. Instalación de guardas, ventilación, barandas" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Controles Administrativos</label>
                <input type="text" id="m-administrativos" placeholder="Ej. Procedimientos de trabajo seguro, señalización, rotación" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
              <div class="md:col-span-2">
                <label class="block font-bold text-slate-700 mb-1">Equipos de Protección Personal (EPP)</label>
                <input type="text" id="m-epp" placeholder="Ej. Protección auditiva copa, respirador N95, calzado de seguridad" class="w-full p-2 bg-white border border-slate-200 rounded-md focus:outline-none">
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onclick="window.cerrarModalRiesgo()" class="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition shadow-sm">
              Guardar en Matriz GTC 45
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Listeners de búsqueda
  document.getElementById('input-buscar-matriz').addEventListener('input', (e) => {
    filtroBusqueda = e.target.value;
    renderMatrix();
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

    const riesgoData = {
      id: id || undefined,
      companyId: empresaActiva.id,
      proceso: document.getElementById('r-proceso').value.trim(),
      zonaLugar: document.getElementById('r-zona').value.trim(),
      actividad: document.getElementById('r-actividad').value.trim(),
      tarea: document.getElementById('r-tarea').value.trim(),
      rutinaria: document.getElementById('r-rutinaria').checked,
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
  });
}

export function abrirModalRiesgo(riesgo = null) {
  const modal = document.getElementById('modal-riesgo');
  const titulo = document.getElementById('modal-riesgo-titulo');
  const form = document.getElementById('form-riesgo');

  form.reset();

  if (riesgo) {
    titulo.innerText = "Editar Peligro en Matriz GTC 45";
    document.getElementById('riesgo-id').value = riesgo.id;
    document.getElementById('r-proceso').value = riesgo.proceso;
    document.getElementById('r-zona').value = riesgo.zonaLugar;
    document.getElementById('r-actividad').value = riesgo.actividad;
    document.getElementById('r-tarea').value = riesgo.tarea;
    document.getElementById('r-rutinaria').checked = !!riesgo.rutinaria;
    document.getElementById('r-clasificacion').value = riesgo.peligroClasificacion;
    document.getElementById('r-descripcion').value = riesgo.peligroDescripcion;
    document.getElementById('r-efectos').value = riesgo.efectosPosibles;
    document.getElementById('r-controles').value = riesgo.controlesExistentes || '';
    document.getElementById('calc-nd').value = riesgo.nd;
    document.getElementById('calc-ne').value = riesgo.ne;
    document.getElementById('calc-nc').value = riesgo.nc;
    document.getElementById('m-eliminacion').value = riesgo.medidasIntervencion?.eliminacion || '';
    document.getElementById('m-sustitucion').value = riesgo.medidasIntervencion?.sustitucion || '';
    document.getElementById('m-ingenieria').value = riesgo.medidasIntervencion?.ingenieria || '';
    document.getElementById('m-administrativos').value = riesgo.medidasIntervencion?.administrativos || '';
    document.getElementById('m-epp').value = riesgo.medidasIntervencion?.epp || '';
  } else {
    titulo.innerText = "Identificar Nuevo Peligro en Matriz GTC 45";
    document.getElementById('riesgo-id').value = '';
    document.getElementById('calc-nd').value = '6';
    document.getElementById('calc-ne').value = '3';
    document.getElementById('calc-nc').value = '25';
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

window.exportarMatrizCSV = function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const matriz = store.getMatriz(empresaActiva.id);

  let csv = "Proceso;Zona/Lugar;Actividad;Tarea;Rutinaria;Peligro Clasificación;Peligro Descripción;Efectos Posibles;Controles Existentes;ND;NE;NP;NC;NR;Nivel Riesgo;Aceptabilidad;Medidas Ingeniería;Medidas Administrativos;EPP\n";

  matriz.forEach(m => {
    csv += `"${m.proceso}";"${m.zonaLugar}";"${m.actividad}";"${m.tarea}";"${m.rutinaria ? 'SI' : 'NO'}";"${m.peligroClasificacion}";"${m.peligroDescripcion}";"${m.efectosPosibles}";"${m.controlesExistentes || ''}";"${m.nd}";"${m.ne}";"${m.np}";"${m.nc}";"${m.nr}";"${m.interpretacionNR}";"${m.aceptabilidad}";"${m.medidasIntervencion?.ingenieria || ''}";"${m.medidasIntervencion?.administrativos || ''}";"${m.medidasIntervencion?.epp || ''}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Matriz_GTC45_${empresaActiva.razonSocial.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
