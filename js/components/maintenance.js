// =============================================================================
// MÓDULO DE MANTENIMIENTO DE MAQUINARIA Y EQUIPOS - DOCTOR PYME SG-SST
// Fichas Técnicas, Hojas de Vida y Cronograma Anual en Diagrama de Gantt
// Normatividad: Res. 0312 de 2019 (Estándar 2.4.1) & Dec. 1072 de 2015
// =============================================================================
import { store } from '../store.js';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function renderMaintenance() {
  const container = document.getElementById('main-content');
  if (!container) return;

  const equipos = store.getEquipos();
  const mantenimientos = store.getMantenimientos();

  // KPIs
  const totalEquipos = equipos.length;
  const totalMantenimientos = mantenimientos.length;
  const ejecutados = mantenimientos.filter(m => m.estado === 'Ejecutado').length;
  const enProceso = mantenimientos.filter(m => m.estado === 'En Proceso').length;
  const programados = mantenimientos.filter(m => m.estado === 'Programado').length;
  const porcentajeAvance = Math.round((ejecutados / Math.max(1, totalMantenimientos)) * 100);

  container.innerHTML = `
    <div class="space-y-6 animate-fadeIn pb-12">
      
      <!-- Cabecera -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-black text-slate-800">Mantenimiento de Maquinaria y Equipos</h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Estándar 2.4.1 • Res. 0312
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Fichas técnicas, hojas de vida de maquinaria pesada y cronograma preventivo en Diagrama de Gantt interactivo.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-nuevo-equipo" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <span>➕</span> Nuevo Equipo
          </button>
          <button id="btn-nuevo-mantenimiento" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5">
            <span>📅</span> Programar Mantenimiento
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span class="text-[10px] font-bold uppercase text-slate-400 block">Maquinaria en Inventario</span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-black text-slate-800">${totalEquipos}</span>
            <span class="text-xs font-bold text-emerald-600">100% Operativos</span>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span class="text-[10px] font-bold uppercase text-slate-400 block">Cumplimiento del Cronograma</span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-black text-indigo-600">${porcentajeAvance}%</span>
            <span class="text-xs text-slate-500 font-semibold">${ejecutados} de ${totalMantenimientos} tareas</span>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span class="text-[10px] font-bold uppercase text-slate-400 block">En Ejecución / Taller</span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-black text-blue-600">${enProceso}</span>
            <span class="text-xs text-slate-400 font-semibold">Parada programada</span>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span class="text-[10px] font-bold uppercase text-slate-400 block">Pendientes por Ejecutar</span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-black text-amber-500">${programados}</span>
            <span class="text-xs text-slate-400 font-semibold">Segundo semestre</span>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 1: DIAGRAMA DE GANTT ANUAL -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>📊 Diagrama de Gantt Anual (Vigencia 2026)</span>
            </h3>
            <p class="text-xs text-slate-500">Visualización interactiva de mantenimientos por mes con semaforización de avance.</p>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Ejecutado</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> En Proceso</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Programado</span>
          </div>
        </div>

        <!-- Tabla Gantt Responsiva -->
        <div class="overflow-x-auto border border-slate-200 rounded-xl">
          <table class="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr class="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <th class="p-3 w-56 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">Equipo & Tarea</th>
                ${MESES.map(m => `<th class="p-2 text-center border-r border-slate-200 font-bold">${m.slice(0, 3)}</th>`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs">
              ${mantenimientos.map(mant => {
                const mesIndex = MESES.indexOf(mant.mes);

                let colorBarra = 'bg-amber-500 text-white';
                if (mant.estado === 'Ejecutado') colorBarra = 'bg-emerald-500 text-white';
                else if (mant.estado === 'En Proceso') colorBarra = 'bg-blue-600 text-white';

                return `
                  <tr class="hover:bg-slate-50/60 transition group">
                    <td class="p-3 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">
                      <div class="font-bold text-slate-800 truncate max-w-[200px]" title="${mant.equipoNombre}">${mant.equipoNombre}</div>
                      <div class="text-[11px] text-slate-500 truncate max-w-[200px]" title="${mant.actividad}">${mant.actividad}</div>
                    </td>
                    ${MESES.map((_, idx) => {
                      if (idx === mesIndex) {
                        return `
                          <td class="p-1 border-r border-slate-100 align-middle">
                            <div 
                              onclick="window.verDetalleMantenimiento('${mant.id}')"
                              class="w-full py-1.5 px-2 rounded-lg text-[10px] font-bold ${colorBarra} text-center cursor-pointer shadow-xs hover:opacity-90 transition truncate"
                              title="${mant.actividad} (${mant.estado})"
                            >
                              ${mant.estado}
                            </div>
                          </td>
                        `;
                      }
                      return `<td class="p-1 border-r border-slate-100 bg-slate-50/20"></td>`;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECCIÓN 2: CATÁLOGO Y FICHAS TÉCNICAS DE MAQUINARIA -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Fichas Técnicas & Hojas de Vida de Equipos
          </h3>
          <span class="text-xs text-slate-400">${equipos.length} Equipos registrados</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${equipos.map(eq => `
            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 hover:border-indigo-300 transition flex flex-col justify-between">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                    ${eq.codigo}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${eq.criticidad === 'Alta' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                    Criticidad: ${eq.criticidad}
                  </span>
                </div>

                <h4 class="text-sm font-black text-slate-900">${eq.nombre}</h4>
                <p class="text-xs text-slate-500 font-medium">${eq.marca} • Modelo ${eq.modelo} (S/N: ${eq.serie})</p>
                <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                  ${eq.especificaciones}
                </p>

                <div class="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span class="text-slate-400 block font-bold uppercase text-[9px]">Ubicación:</span>
                    <span class="text-slate-700 font-semibold">${eq.ubicacion}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block font-bold uppercase text-[9px]">Horas Operación:</span>
                    <span class="text-indigo-600 font-bold font-mono">${(eq.horasOperacion || 0).toLocaleString()} h</span>
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span class="text-[9px] text-slate-400 block uppercase font-bold">Próximo Mtto:</span>
                  <span class="font-bold text-slate-800 font-mono">${eq.proximoMantenimiento || 'Pendiente'}</span>
                </div>
                <button onclick="window.programarMttoEquipo('${eq.id}', '${eq.nombre}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition">
                  Programar Mtto
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  // Listeners
  document.getElementById('btn-nuevo-equipo').onclick = () => abrirModalNuevoEquipo();
  document.getElementById('btn-nuevo-mantenimiento').onclick = () => abrirModalNuevoMantenimiento();
}

/**
 * Modal Detalle de Mantenimiento
 */
window.verDetalleMantenimiento = function(mantId) {
  const mant = store.getMantenimientos().find(m => m.id === mantId);
  if (!mant) return;

  alert(`🛠️ DETALLE DE MANTENIMIENTO:\n\n` +
    `Equipo: ${mant.equipoNombre}\n` +
    `Actividad: ${mant.actividad}\n` +
    `Mes Programado: ${mant.mes}\n` +
    `Fechas: ${mant.fechaInicio} al ${mant.fechaFin}\n` +
    `Tipo: ${mant.tipo}\n` +
    `Estado: ${mant.estado}\n` +
    `Responsable: ${mant.responsable}\n` +
    `Costo Estimado: $${(mant.costo || 0).toLocaleString('es-CO')}\n` +
    `Observaciones: ${mant.observaciones || 'Sin novedades'}`
  );
};

/**
 * Modal para registrar nuevo equipo
 */
function abrirModalNuevoEquipo() {
  const modalId = 'modal-nuevo-equipo';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto">
      <div class="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
        <h3 class="text-base font-bold text-white">Registrar Ficha Técnica de Maquinaria</h3>
        <button id="btn-cerrar-modal-eq" class="text-slate-400 hover:text-white p-1">✕</button>
      </div>

      <form id="form-nuevo-equipo" class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Código Interno</label>
            <input type="text" id="eq-codigo" required placeholder="EQ-006" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800" value="EQ-COMP-06">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Criticidad</label>
            <select id="eq-criticidad" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
              <option value="Alta">Alta (Crítico para producción)</option>
              <option value="Media" selected>Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Equipo</label>
          <input type="text" id="eq-nombre" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800" value="Compresor de Tornillo Atlas Copco 50 HP">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Marca y Modelo</label>
            <input type="text" id="eq-marca" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="Atlas Copco GA 37">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Serie (S/N)</label>
            <input type="text" id="eq-serie" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="AC-2023-9941">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ubicación</label>
            <input type="text" id="eq-ubicacion" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="Cuarto de Máquinas y Aire">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Responsable</label>
            <input type="text" id="eq-responsable" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="Héctor Fabio Ramírez">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Especificaciones Técnicas</label>
          <textarea id="eq-especificaciones" rows="2" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">Motor trifásico 50 HP 440V, presión máxima 125 PSI, secador de aire refrigerativo integrado.</textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" id="btn-cancelar-eq" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50">Cancelar</button>
          <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md">Guardar Ficha Técnica</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-cerrar-modal-eq').onclick = () => modal.remove();
  document.getElementById('btn-cancelar-eq').onclick = () => modal.remove();

  document.getElementById('form-nuevo-equipo').onsubmit = (e) => {
    e.preventDefault();
    store.guardarEquipo({
      codigo: document.getElementById('eq-codigo').value,
      nombre: document.getElementById('eq-nombre').value,
      marca: document.getElementById('eq-marca').value,
      modelo: document.getElementById('eq-marca').value,
      serie: document.getElementById('eq-serie').value,
      ubicacion: document.getElementById('eq-ubicacion').value,
      responsable: document.getElementById('eq-responsable').value,
      criticidad: document.getElementById('eq-criticidad').value,
      especificaciones: document.getElementById('eq-especificaciones').value,
      horasOperacion: 3200,
      proximoMantenimiento: '2026-06-15'
    });
    modal.remove();
    alert("✓ Ficha técnica registrada exitosamente.");
    renderMaintenance();
  };
}

/**
 * Modal para programar mantenimiento en el Gantt
 */
function abrirModalNuevoMantenimiento(preEquipoId = '', preEquipoNombre = '') {
  const modalId = 'modal-nuevo-mtto';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  const equipos = store.getEquipos();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto">
      <div class="bg-indigo-900 px-6 py-4 text-white flex items-center justify-between">
        <h3 class="text-base font-bold text-white">Programar Mantenimiento en Gantt</h3>
        <button id="btn-cerrar-modal-mtto" class="text-slate-300 hover:text-white p-1">✕</button>
      </div>

      <form id="form-nuevo-mtto" class="p-6 space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Equipo</label>
          <select id="mtto-equipo" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
            ${equipos.map(eq => `
              <option value="${eq.id}" ${eq.id === preEquipoId ? 'selected' : ''}>
                ${eq.nombre} (${eq.codigo})
              </option>
            `).join('')}
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Actividad de Mantenimiento</label>
          <input type="text" id="mtto-actividad" required placeholder="Ej: Cambio de filtros, aceite y engrase general" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="Inspección semestral y calibración de presostatos">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Mes en el Cronograma</label>
            <select id="mtto-mes" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
              ${MESES.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
            <select id="mtto-estado" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
              <option value="Programado" selected>Programado</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Ejecutado">Ejecutado</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Inicio</label>
            <input type="date" id="mtto-inicio" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="2026-05-15">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Finalización</label>
            <input type="date" id="mtto-fin" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="2026-05-18">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Responsable</label>
            <input type="text" id="mtto-resp" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="Héctor Fabio Ramírez">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Costo Estimado ($ COP)</label>
            <input type="number" id="mtto-costo" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" value="1200000">
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" id="btn-cancelar-mtto" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50">Cancelar</button>
          <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md">Programar en Gantt</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-cerrar-modal-mtto').onclick = () => modal.remove();
  document.getElementById('btn-cancelar-mtto').onclick = () => modal.remove();

  document.getElementById('form-nuevo-mtto').onsubmit = (e) => {
    e.preventDefault();
    const selEqId = document.getElementById('mtto-equipo').value;
    const eq = equipos.find(x => x.id === selEqId) || { nombre: 'Equipo' };

    store.guardarMantenimiento({
      equipoId: selEqId,
      equipoNombre: eq.nombre,
      actividad: document.getElementById('mtto-actividad').value,
      mes: document.getElementById('mtto-mes').value,
      estado: document.getElementById('mtto-estado').value,
      fechaInicio: document.getElementById('mtto-inicio').value,
      fechaFin: document.getElementById('mtto-fin').value,
      responsable: document.getElementById('mtto-resp').value,
      costo: Number(document.getElementById('mtto-costo').value || 0),
      tipo: 'Preventivo'
    });

    modal.remove();
    alert("✓ Tarea programada en el Diagrama de Gantt.");
    renderMaintenance();
  };
}

window.programarMttoEquipo = function(eqId, eqNombre) {
  abrirModalNuevoMantenimiento(eqId, eqNombre);
};
