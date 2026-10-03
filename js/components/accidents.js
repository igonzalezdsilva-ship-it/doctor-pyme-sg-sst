// =============================================================================
// COMPONENTE: REPORTE E INVESTIGACIÓN DE ATEL (DECRETO 1072 & RES. 1401/2007)
// =============================================================================
import { store } from '../store.js';

export function renderAccidents() {
  const container = document.getElementById('main-content');
  const empresaActiva = store.getEmpresaActiva();

  if (!empresaActiva) {
    container.innerHTML = `
      <div class="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto">
        <h2 class="text-xl font-bold text-slate-800">Selecciona una Empresa Cliente</h2>
        <p class="text-sm text-slate-500 mt-2">Para registrar o consultar accidentes e incidentes debes seleccionar una empresa.</p>
        <button onclick="window.location.hash='#empresas'" class="mt-5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
          Ver Empresas
        </button>
      </div>
    `;
    return;
  }

  const accidentes = store.getAccidentes(empresaActiva.id);

  const totalEventos = accidentes.length;
  const diasPerdidos = accidentes.reduce((acc, curr) => acc + (parseInt(curr.diasIncapacidad, 10) || 0), 0);
  const conIncapacidad = accidentes.filter(a => (parseInt(a.diasIncapacidad, 10) || 0) > 0).length;
  const incidentes = accidentes.filter(a => a.tipoEvento?.includes('Incidente')).length;

  const tipoBadges = {
    'Accidente de Trabajo con Incapacidad': 'bg-red-100 text-red-800 border-red-300',
    'Accidente de Trabajo sin Incapacidad': 'bg-amber-100 text-amber-800 border-amber-300',
    'Incidente (Casi-accidente)': 'bg-blue-100 text-blue-800 border-blue-300',
    'Enfermedad Laboral Calificada': 'bg-purple-100 text-purple-800 border-purple-300'
  };

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Encabezado y Estadísticas de Siniestralidad -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div class="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div>
            <div class="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider">
              <span>Resolución 1401 de 2007</span>
              <span>•</span>
              <span>Decreto 1072 Art. 2.2.4.6.32</span>
            </div>
            <h1 class="text-2xl font-bold text-slate-800 mt-1">Registro e Investigación de Incidentes y Accidentes (ATEL)</h1>
            <p class="text-sm text-slate-500 mt-1">Empresa: <strong>${empresaActiva.razonSocial}</strong></p>
          </div>

          <button onclick="window.abrirModalAccidente()" class="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Reportar Evento / Accidente
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-center">
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span class="text-xs uppercase font-bold text-slate-400">Total Eventos Registrados</span>
            <div class="text-2xl font-black text-slate-800 mt-1">${totalEventos}</div>
          </div>
          <div class="p-3 bg-red-50 rounded-xl border border-red-200">
            <span class="text-xs uppercase font-bold text-red-700">Días de Incapacidad (Severidad)</span>
            <div class="text-2xl font-black text-red-800 mt-1">${diasPerdidos} días</div>
          </div>
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <span class="text-xs uppercase font-bold text-amber-700">Accidentes con Pérdida de Tiempo</span>
            <div class="text-2xl font-black text-amber-800 mt-1">${conIncapacidad}</div>
          </div>
          <div class="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <span class="text-xs uppercase font-bold text-blue-700">Incidentes / Casi-accidentes</span>
            <div class="text-2xl font-black text-blue-800 mt-1">${incidentes}</div>
          </div>
        </div>
      </div>

      <!-- Listado de Accidentes / Incidentes -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 class="text-sm font-bold text-slate-800">Libro de Registro Oficial de Accidentalidad</h2>
          <span class="text-xs text-slate-500">Obligatorio por ley conservar mínimo 20 años</span>
        </div>

        <div class="divide-y divide-slate-100">
          ${accidentes.length === 0 ? `
            <div class="p-8 text-center text-slate-400 text-xs">
              No se registran eventos ni accidentes en esta empresa. ¡Excelente indicador de seguridad!
            </div>
          ` : accidentes.map(acc => `
            <div class="p-5 hover:bg-slate-50/70 transition space-y-3">
              <div class="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border ${tipoBadges[acc.tipoEvento] || 'bg-slate-100 text-slate-700'}">
                      ${acc.tipoEvento}
                    </span>
                    <span class="text-xs text-slate-400 font-medium">Fecha: <strong>${acc.fechaEvento}</strong></span>
                    ${acc.radicadoFurat ? `
                      <span class="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                        ${acc.radicadoFurat}
                      </span>
                    ` : ''}
                  </div>
                  <h3 class="font-bold text-slate-800 text-base mt-2">
                    ${acc.trabajador} <span class="text-xs font-normal text-slate-500">(C.C. ${acc.cedula} • ${acc.cargo})</span>
                  </h3>
                </div>

                <div class="flex items-center gap-2">
                  <span class="px-3 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-200">
                    Incapacidad: <span class="${acc.diasIncapacidad > 0 ? 'text-red-600 font-extrabold' : 'text-slate-600'}">${acc.diasIncapacidad || 0} días</span>
                  </span>
                  <button onclick="window.editarAccidente('${acc.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 transition" title="Editar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <button onclick="window.eliminarAccidente('${acc.id}')" class="p-1.5 text-slate-400 hover:text-red-600 transition" title="Eliminar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>

              <!-- Detalle de lo sucedido -->
              <p class="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                <strong class="text-slate-900">Descripción del Suceso:</strong> ${acc.descripcionEvento}
              </p>

              <!-- Análisis de Causas y Plan de Acción -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                <div class="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                  <span class="font-bold text-amber-900 block mb-0.5">Causas Inmediatas:</span>
                  <span class="text-amber-800">${acc.causaInmediata || 'En investigación'}</span>
                </div>
                <div class="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200/60">
                  <span class="font-bold text-blue-900 block mb-0.5">Causas Básicas (Raíz):</span>
                  <span class="text-blue-800">${acc.causaBasica || 'En investigación'}</span>
                </div>
                <div class="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200/60">
                  <span class="font-bold text-emerald-900 block mb-0.5">Plan de Acción / Cierre:</span>
                  <span class="text-emerald-800">${acc.planAccion || 'Sin plan asignado'}</span>
                  <div class="text-[10px] text-emerald-700 mt-1">Resp: ${acc.responsableCierre || 'N/A'} • Fecha: ${acc.fechaCompromiso || 'N/A'}</div>
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>
    </div>

    <!-- Modal Formulario Accidente / Incidente -->
    <div id="modal-accidente" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 id="modal-acc-titulo" class="font-bold text-base text-slate-800">Reporte e Investigación de Evento (FURAT)</h3>
            <p class="text-xs text-slate-500">Conforme a la Resolución 1401 de 2007 (MinTrabajo).</p>
          </div>
          <button onclick="window.cerrarModalAccidente()" class="text-slate-400 hover:text-slate-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form id="form-accidente" class="p-6 space-y-4">
          <input type="hidden" id="acc-id">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Fecha del Evento *</label>
              <input type="date" id="acc-fecha" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Tipo de Evento *</label>
              <select id="acc-tipo" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800">
                <option value="Accidente de Trabajo con Incapacidad">Accidente con Incapacidad (con pérdida de tiempo)</option>
                <option value="Accidente de Trabajo sin Incapacidad">Accidente sin Incapacidad (solo atención de primeros auxilios)</option>
                <option value="Incidente (Casi-accidente)">Incidente / Casi-accidente (sin lesión)</option>
                <option value="Enfermedad Laboral Calificada">Enfermedad Laboral Calificada</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Nombre Completo del Trabajador *</label>
              <input type="text" id="acc-trabajador" required placeholder="Ej. Juan Carlos Pérez Gómez" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Cédula de Ciudadanía *</label>
              <input type="text" id="acc-cedula" required placeholder="Ej. 1.020.304.506" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Cargo u Ocupación *</label>
              <input type="text" id="acc-cargo" required placeholder="Ej. Operario de montacargas" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Días de Incapacidad Médica</label>
              <input type="number" id="acc-dias" min="0" value="0" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-bold">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Parte del Cuerpo Afectada</label>
              <input type="text" id="acc-parte" placeholder="Ej. Mano derecha, ojo izquierdo, columna lumbar" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Radicado FURAT ARL</label>
              <input type="text" id="acc-radicado" placeholder="Ej. FURAT-SURA-2026-12345" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-mono">
            </div>

            <div class="md:col-span-2">
              <label class="block font-bold text-slate-700 mb-1">Descripción Circunstanciada del Accidente *</label>
              <textarea id="acc-desc" required rows="3" placeholder="Describe qué ocurrió, qué estaba haciendo el trabajador, herramientas o equipos involucrados..." class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none leading-relaxed"></textarea>
            </div>

            <!-- Investigación de Causas -->
            <div class="md:col-span-2">
              <label class="block font-bold text-amber-800 mb-1">Causas Inmediatas (Actos y Condiciones Inseguras)</label>
              <input type="text" id="acc-inmediata" placeholder="Ej. No usar guantes de protección; piso resbaloso con aceite" class="w-full p-2.5 bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none">
            </div>

            <div class="md:col-span-2">
              <label class="block font-bold text-blue-800 mb-1">Causas Básicas (Factores de Trabajo / Personales)</label>
              <input type="text" id="acc-basica" placeholder="Ej. Falta de inducción en procedimiento de limpieza; fatiga por horas extras" class="w-full p-2.5 bg-blue-50/30 border border-blue-200 rounded-lg focus:outline-none">
            </div>

            <div class="md:col-span-2">
              <label class="block font-bold text-emerald-800 mb-1">Plan de Acción / Medidas Preventivas para Evitar Recurrencia</label>
              <input type="text" id="acc-plan" placeholder="Ej. Realizar mantenimiento preventivo semanal y reentrenamiento a la cuadrilla" class="w-full p-2.5 bg-emerald-50/30 border border-emerald-200 rounded-lg focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Responsable del Cumplimiento</label>
              <input type="text" id="acc-resp" placeholder="Ej. Jefe de Mantenimiento / COPASST" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none">
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Fecha Compromiso de Cierre</label>
              <input type="date" id="acc-fechacierre" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold">
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onclick="window.cerrarModalAccidente()" class="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition shadow-sm">
              Guardar Reporte ATEL
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Submit listener
  document.getElementById('form-accidente').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('acc-id').value;

    const accData = {
      id: id || undefined,
      companyId: empresaActiva.id,
      fechaEvento: document.getElementById('acc-fecha').value,
      tipoEvento: document.getElementById('acc-tipo').value,
      trabajador: document.getElementById('acc-trabajador').value.trim(),
      cedula: document.getElementById('acc-cedula').value.trim(),
      cargo: document.getElementById('acc-cargo').value.trim(),
      diasIncapacidad: parseInt(document.getElementById('acc-dias').value, 10) || 0,
      parteCuerpoAfectada: document.getElementById('acc-parte').value.trim() || 'No especificada',
      radicadoFurat: document.getElementById('acc-radicado').value.trim() || '',
      descripcionEvento: document.getElementById('acc-desc').value.trim(),
      causaInmediata: document.getElementById('acc-inmediata').value.trim() || '',
      causaBasica: document.getElementById('acc-basica').value.trim() || '',
      planAccion: document.getElementById('acc-plan').value.trim() || '',
      responsableCierre: document.getElementById('acc-resp').value.trim() || '',
      fechaCompromiso: document.getElementById('acc-fechacierre').value || ''
    };

    store.saveAccidente(accData);
    window.cerrarModalAccidente();
    renderAccidents();
  });
}

export function abrirModalAccidente(acc = null) {
  const modal = document.getElementById('modal-accidente');
  const titulo = document.getElementById('modal-acc-titulo');
  const form = document.getElementById('form-accidente');

  form.reset();

  if (acc) {
    titulo.innerText = "Editar Reporte de Accidente / Incidente";
    document.getElementById('acc-id').value = acc.id;
    document.getElementById('acc-fecha').value = acc.fechaEvento;
    document.getElementById('acc-tipo').value = acc.tipoEvento;
    document.getElementById('acc-trabajador').value = acc.trabajador;
    document.getElementById('acc-cedula').value = acc.cedula;
    document.getElementById('acc-cargo').value = acc.cargo;
    document.getElementById('acc-dias').value = acc.diasIncapacidad || 0;
    document.getElementById('acc-parte').value = acc.parteCuerpoAfectada || '';
    document.getElementById('acc-radicado').value = acc.radicadoFurat || '';
    document.getElementById('acc-desc').value = acc.descripcionEvento;
    document.getElementById('acc-inmediata').value = acc.causaInmediata || '';
    document.getElementById('acc-basica').value = acc.causaBasica || '';
    document.getElementById('acc-plan').value = acc.planAccion || '';
    document.getElementById('acc-resp').value = acc.responsableCierre || '';
    document.getElementById('acc-fechacierre').value = acc.fechaCompromiso || '';
  } else {
    titulo.innerText = "Nuevo Reporte de Evento / Accidente (FURAT)";
    document.getElementById('acc-id').value = '';
    document.getElementById('acc-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('acc-dias').value = '0';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

window.abrirModalAccidente = abrirModalAccidente;

window.editarAccidente = function(id) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const accidentes = store.getAccidentes(empresaActiva.id);
  const acc = accidentes.find(a => a.id === id);
  if (acc) {
    abrirModalAccidente(acc);
  }
};

window.eliminarAccidente = function(id) {
  store.deleteAccidente(id);
  renderAccidents();
};

window.cerrarModalAccidente = function() {
  const modal = document.getElementById('modal-accidente');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
