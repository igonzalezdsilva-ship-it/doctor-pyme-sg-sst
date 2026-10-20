// =============================================================================
// COMPONENTE: PLAN ANUAL DE TRABAJO EN SST (DECRETO 1072 DE 2015)
// =============================================================================
import { store } from '../store.js';

let filtroEstado = 'TODOS';
let filtroMes = 'TODOS';

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function renderWorkPlan() {
  const container = document.getElementById('main-content');
  const empresaActiva = store.getEmpresaActiva();

  if (!empresaActiva) {
    container.innerHTML = `
      <div class="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto">
        <h2 class="text-xl font-bold text-slate-800">Selecciona una Empresa Cliente</h2>
        <p class="text-sm text-slate-500 mt-2">Para planificar y hacer seguimiento al cronograma del PAT debes seleccionar una empresa.</p>
        <button onclick="window.location.hash='#empresas'" class="mt-5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
          Ver Empresas
        </button>
      </div>
    `;
    return;
  }

  const actividades = store.getPlanTrabajo(empresaActiva.id);

  const actTotal = actividades.length;
  const actEjecutadas = actividades.filter(a => a.estado === 'Ejecutada').length;
  const actEnProceso = actividades.filter(a => a.estado === 'En Proceso').length;
  const actPendientes = actividades.filter(a => a.estado === 'Pendiente').length;
  const porcentaje = actTotal > 0 ? Math.round((actEjecutadas / actTotal) * 100) : 0;

  const actividadesFiltradas = actividades.filter(a => {
    const cumpleEstado = filtroEstado === 'TODOS' || a.estado === filtroEstado;
    const cumpleMes = filtroMes === 'TODOS' || a.mes === filtroMes;
    return cumpleEstado && cumpleMes;
  });

  const estadoBadges = {
    'Ejecutada': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'En Proceso': 'bg-blue-100 text-blue-800 border-blue-300',
    'Pendiente': 'bg-amber-100 text-amber-800 border-amber-300',
    'Cancelada': 'bg-slate-100 text-slate-600 border-slate-300'
  };

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Encabezado y Progreso Anual -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div class="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div>
            <div class="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
              <span>Decreto 1072 de 2015 Art. 2.2.4.6.8 Numeral 7</span>
              <span>•</span>
              <span>Ciclo PHVA</span>
            </div>
            <h1 class="text-2xl font-bold text-slate-800 mt-1">Plan Anual de Trabajo en SST (PAT)</h1>
            <p class="text-sm text-slate-500 mt-1">Empresa: <strong>${empresaActiva.razonSocial}</strong></p>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <span class="text-xs uppercase font-bold text-slate-400">Cumplimiento Global</span>
              <div class="text-3xl font-black text-blue-600">${porcentaje}%</div>
              <div class="text-xs text-slate-500">${actEjecutadas} de ${actTotal} actividades</div>
            </div>
            <button onclick="window.abrirModalPAT()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              Nueva Actividad PAT
            </button>
          </div>
        </div>

        <div class="w-full bg-slate-100 rounded-full h-3 mt-5">
          <div class="h-3 rounded-full bg-blue-600 transition-all duration-500" style="width: ${porcentaje}%"></div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-center text-xs">
          <div>
            <span class="text-slate-400 font-semibold">Total Programadas:</span>
            <span class="font-bold text-slate-800 ml-1">${actTotal}</span>
          </div>
          <div>
            <span class="text-emerald-600 font-semibold">Ejecutadas:</span>
            <span class="font-bold text-slate-800 ml-1">${actEjecutadas}</span>
          </div>
          <div>
            <span class="text-blue-600 font-semibold">En Proceso:</span>
            <span class="font-bold text-slate-800 ml-1">${actEnProceso}</span>
          </div>
          <div>
            <span class="text-amber-600 font-semibold">Pendientes:</span>
            <span class="font-bold text-slate-800 ml-1">${actPendientes}</span>
          </div>
        </div>
      </div>

      <!-- Filtros de Actividades -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold text-slate-400 uppercase mr-1">Estado:</span>
          <button onclick="window.filtrarEstadoPAT('TODOS')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroEstado === 'TODOS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            Todos (${actTotal})
          </button>
          <button onclick="window.filtrarEstadoPAT('Ejecutada')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroEstado === 'Ejecutada' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">
            Ejecutadas (${actEjecutadas})
          </button>
          <button onclick="window.filtrarEstadoPAT('En Proceso')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroEstado === 'En Proceso' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}">
            En Proceso (${actEnProceso})
          </button>
          <button onclick="window.filtrarEstadoPAT('Pendiente')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtroEstado === 'Pendiente' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}">
            Pendientes (${actPendientes})
          </button>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <span class="text-xs font-bold text-slate-400 uppercase">Mes:</span>
          <select id="select-filtro-mes" onchange="window.filtrarMesPAT(this.value)" class="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none">
            <option value="TODOS" ${filtroMes === 'TODOS' ? 'selected' : ''}>Todos los Meses</option>
            ${MESES.map(m => `<option value="${m}" ${filtroMes === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Tabla de Actividades del Plan Anual -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-800 text-white font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th class="p-3 border-r border-slate-700">Ciclo / Mes</th>
                <th class="p-3 border-r border-slate-700">Actividad del Plan de Trabajo</th>
                <th class="p-3 border-r border-slate-700">Meta Esperada</th>
                <th class="p-3 border-r border-slate-700">Responsable / Recursos</th>
                <th class="p-3 border-r border-slate-700 text-center">Estado</th>
                <th class="p-3 border-r border-slate-700 text-center">% Avance</th>
                <th class="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${actividadesFiltradas.length === 0 ? `
                <tr>
                  <td colspan="7" class="p-8 text-center text-slate-400 text-xs">
                    No hay actividades registradas con los filtros seleccionados.
                  </td>
                </tr>
              ` : actividadesFiltradas.map(a => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 border-r border-slate-100 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 block text-center mb-1">
                      ${a.ciclo}
                    </span>
                    <span class="font-bold text-slate-800 text-center block">${a.mes}</span>
                  </td>
                  <td class="p-3 border-r border-slate-100 max-w-[280px]">
                    <span class="font-bold text-slate-800 block text-sm leading-snug">${a.actividad}</span>
                    ${a.evidencia ? `
                      <span class="text-[11px] text-slate-500 mt-1 block truncate" title="${a.evidencia}">
                        📁 <em>Evidencia: ${a.evidencia}</em>
                      </span>
                    ` : ''}
                  </td>
                  <td class="p-3 border-r border-slate-100 text-slate-600 max-w-[180px]">
                    ${a.meta}
                  </td>
                  <td class="p-3 border-r border-slate-100 text-slate-600 max-w-[180px]">
                    <div class="font-semibold text-slate-800">${a.responsable}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${a.recursos || 'Sin recursos especificados'}</div>
                  </td>
                  <td class="p-3 border-r border-slate-100 text-center whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold border ${estadoBadges[a.estado]}">
                      ${a.estado}
                    </span>
                  </td>
                  <td class="p-3 border-r border-slate-100 text-center whitespace-nowrap font-mono font-bold">
                    <span class="${a.cumplimiento === 100 ? 'text-emerald-600 font-extrabold' : 'text-slate-700'}">
                      ${a.cumplimiento || 0}%
                    </span>
                  </td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="window.cambiarEstadoRapido('${a.id}')" class="p-1 text-slate-400 hover:text-emerald-600 transition" title="Cambiar Estado">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </button>
                      <button onclick="window.editarActividadPAT('${a.id}')" class="p-1 text-slate-400 hover:text-indigo-600 transition" title="Editar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button onclick="window.eliminarActividadPAT('${a.id}')" class="p-1 text-slate-400 hover:text-red-600 transition" title="Eliminar">
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

    <!-- Modal Nueva / Editar Actividad PAT -->
    <div id="modal-pat" class="fixed inset-0 bg-slate-900/75 hidden items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 id="modal-pat-titulo" class="font-bold text-base text-slate-800">Actividad del Plan Anual de Trabajo</h3>
            <p class="text-xs text-slate-500">Programa actividades de SST con metas cuantificables y responsables.</p>
          </div>
          <button onclick="window.cerrarModalPAT()" class="text-slate-400 hover:text-slate-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form id="form-pat" class="p-6 space-y-4">
          <input type="hidden" id="pat-id">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ciclo PHVA *</label>
              <select id="pat-ciclo" required class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold">
                <option value="PLANEAR">I. PLANEAR</option>
                <option value="HACER">II. HACER</option>
                <option value="VERIFICAR">III. VERIFICAR</option>
                <option value="ACTUAR">IV. ACTUAR</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Mes Programado *</label>
              <select id="pat-mes" required class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold">
                ${MESES.map(m => `<option value="${m}">${m}</option>`).join('')}
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Actividad *</label>
              <input type="text" id="pat-actividad" required placeholder="Ej. Realizar simulacro anual de evacuación" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Meta Cuantificable *</label>
              <input type="text" id="pat-meta" required placeholder="Ej. Evacuar el 100% de ocupantes en menos de 5 minutos" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Responsable *</label>
              <input type="text" id="pat-responsable" required placeholder="Ej. Coordinador de Brigada / Responsable SST" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Recursos Asignados</label>
              <input type="text" id="pat-recursos" placeholder="Ej. Financieros ($500.000), Técnicos y Humanos" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado de Ejecución</label>
              <select id="pat-estado" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold">
                <option value="Pendiente">Pendiente</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Ejecutada">Ejecutada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">% de Cumplimiento (0 a 100)</label>
              <input type="number" id="pat-cumplimiento" min="0" max="100" value="0" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold">
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Evidencia / Soporte Documental</label>
              <input type="text" id="pat-evidencia" placeholder="Ej. Informe final de simulacro, lista de asistencia firmada y fotos" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none">
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onclick="window.cerrarModalPAT()" class="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm">
              Guardar Actividad
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Listener del formulario
  document.getElementById('form-pat').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('pat-id').value;
    const est = document.getElementById('pat-estado').value;
    let cump = parseInt(document.getElementById('pat-cumplimiento').value, 10) || 0;
    if (est === 'Ejecutada' && cump === 0) cump = 100;

    const actividadData = {
      id: id || undefined,
      companyId: empresaActiva.id,
      ciclo: document.getElementById('pat-ciclo').value,
      mes: document.getElementById('pat-mes').value,
      actividad: document.getElementById('pat-actividad').value.trim(),
      meta: document.getElementById('pat-meta').value.trim(),
      responsable: document.getElementById('pat-responsable').value.trim(),
      recursos: document.getElementById('pat-recursos').value.trim(),
      estado: est,
      cumplimiento: cump,
      evidencia: document.getElementById('pat-evidencia').value.trim()
    };

    store.saveActividadPAT(actividadData);
    window.cerrarModalPAT();
    renderWorkPlan();
  });
}

export function abrirModalPAT(act = null) {
  const modal = document.getElementById('modal-pat');
  const titulo = document.getElementById('modal-pat-titulo');
  const form = document.getElementById('form-pat');

  form.reset();

  if (act) {
    titulo.innerText = "Editar Actividad del Plan Anual";
    document.getElementById('pat-id').value = act.id;
    document.getElementById('pat-ciclo').value = act.ciclo;
    document.getElementById('pat-mes').value = act.mes;
    document.getElementById('pat-actividad').value = act.actividad;
    document.getElementById('pat-meta').value = act.meta;
    document.getElementById('pat-responsable').value = act.responsable;
    document.getElementById('pat-recursos').value = act.recursos || '';
    document.getElementById('pat-estado').value = act.estado;
    document.getElementById('pat-cumplimiento').value = act.cumplimiento || 0;
    document.getElementById('pat-evidencia').value = act.evidencia || '';
  } else {
    titulo.innerText = "Nueva Actividad del Plan Anual";
    document.getElementById('pat-id').value = '';
    document.getElementById('pat-cumplimiento').value = '0';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

window.abrirModalPAT = abrirModalPAT;

window.editarActividadPAT = function(id) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const plan = store.getPlanTrabajo(empresaActiva.id);
  const act = plan.find(a => a.id === id);
  if (act) {
    abrirModalPAT(act);
  }
};

window.eliminarActividadPAT = function(id) {
  store.deleteActividadPAT(id);
  renderWorkPlan();
};

window.cerrarModalPAT = function() {
  const modal = document.getElementById('modal-pat');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.cambiarEstadoRapido = function(id) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const plan = store.getPlanTrabajo(empresaActiva.id);
  const act = plan.find(a => a.id === id);
  if (!act) return;

  const estados = ['Pendiente', 'En Proceso', 'Ejecutada'];
  const actualIndex = estados.indexOf(act.estado);
  const nextEstado = estados[(actualIndex + 1) % estados.length];
  const nextCump = nextEstado === 'Ejecutada' ? 100 : (nextEstado === 'En Proceso' ? 50 : 0);

  store.saveActividadPAT({
    ...act,
    estado: nextEstado,
    cumplimiento: nextCump
  });
  renderWorkPlan();
};

window.filtrarEstadoPAT = function(estado) {
  filtroEstado = estado;
  renderWorkPlan();
};

window.filtrarMesPAT = function(mes) {
  filtroMes = mes;
  renderWorkPlan();
};
