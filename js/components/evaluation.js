// =============================================================================
// COMPONENTE: AUTOEVALUACIÓN DE ESTÁNDARES MÍNIMOS (RESOLUCIÓN 0312 DE 2019)
// Con Cargue y Gestión de Evidencias en IndexedDB (Doctor Pyme)
// =============================================================================
import { store } from '../store.js';
import { obtenerEstandaresPorGrupo, calcularPuntaje, formatPeso } from '../standards.js';
import { evidenceDB } from '../db.js';
import { previsualizarEvidencia, abrirVisorEnlaceGuia } from './documentViewer.js';

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clasificarFuente(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('docs.google.com/document')) {
    return { tipo: 'GDOCS', label: 'Google Docs', icon: '📄', color: 'blue', bg: 'bg-blue-100/90 text-blue-700 hover:bg-blue-200' };
  }
  if (u.includes('docs.google.com/spreadsheets')) {
    return { tipo: 'GSHEETS', label: 'Google Sheets', icon: '📊', color: 'emerald', bg: 'bg-emerald-100/90 text-emerald-700 hover:bg-emerald-200' };
  }
  if (u.includes('drive.google.com')) {
    return { tipo: 'GDRIVE', label: 'Google Drive', icon: '📁', color: 'amber', bg: 'bg-amber-100/90 text-amber-700 hover:bg-amber-200' };
  }
  if (u.endsWith('.pdf') || u.includes('.pdf?')) {
    return { tipo: 'PDF', label: 'PDF en Línea', icon: '📕', color: 'red', bg: 'bg-red-100/90 text-red-700 hover:bg-red-200' };
  }
  if (u.startsWith('data:')) {
    return { tipo: 'ARCHIVO', label: 'Archivo Adjunto', icon: '📎', color: 'indigo', bg: 'bg-indigo-100/90 text-indigo-700 hover:bg-indigo-200' };
  }
  return { tipo: 'WEB', label: 'Doc Guía / Web', icon: '🔗', color: 'indigo', bg: 'bg-indigo-100/90 text-indigo-700 hover:bg-indigo-200' };
}

let filtroCiclo = 'TODOS'; // 'TODOS', 'PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR', 'NO_CUMPLE'

export async function renderEvaluation() {
  const container = document.getElementById('main-content');
  const empresaActiva = store.getEmpresaActiva();

  if (!empresaActiva) {
    container.innerHTML = `
      <div class="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto">
        <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 class="text-xl font-bold text-slate-800">Selecciona una Empresa Cliente</h2>
        <p class="text-sm text-slate-500 mt-2">Para auditar los estándares mínimos de la Resolución 0312 debes seleccionar una empresa en el menú superior o en el directorio.</p>
        <button onclick="window.location.hash='#empresas'" class="mt-5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
          Ver Directorio de Empresas
        </button>
      </div>
    `;
    return;
  }

  const anioActivo = store.getAnioActivo();
  const aniosDisponibles = store.getAniosDisponibles(empresaActiva.id);
  const estandares = obtenerEstandaresPorGrupo(empresaActiva.estandaresAplicables);
  const respuestasMap = store.getEvaluacion(empresaActiva.id, anioActivo);
  const resultado = calcularPuntaje(respuestasMap, estandares);

  // Cargar evidencias adjuntas desde IndexedDB y Base de Datos del Store
  const todasEvidencias = await evidenceDB.obtenerTodasEvidencias(empresaActiva.id, anioActivo);
  try {
    const evidenciasStore = store.getEvidencias ? store.getEvidencias(empresaActiva.id, anioActivo) : [];
    evidenciasStore.forEach(ev => {
      if (!todasEvidencias.some(e => e.id === ev.id)) {
        todasEvidencias.push(ev);
      }
    });
  } catch (eEv) {
    console.warn("Aviso fusionando evidencias en evaluación:", eEv);
  }
  const evidenciasPorNumeral = {};
  todasEvidencias.forEach(ev => {
    if (!ev || !ev.numeral || ev.numeral.startsWith('__DIAGRAMA_')) return;
    if (!evidenciasPorNumeral[ev.numeral]) {
      evidenciasPorNumeral[ev.numeral] = [];
    }
    evidenciasPorNumeral[ev.numeral].push(ev);
  });

  // Asegurar que cualquier evidencia registrada en la evaluación aparezca en evidenciasPorNumeral
  Object.keys(respuestasMap).forEach(numeral => {
    const item = respuestasMap[numeral];
    if (item && item.archivoAdjunto && item.archivoAdjunto.url) {
      if (!evidenciasPorNumeral[numeral]) {
        evidenciasPorNumeral[numeral] = [];
      }
      const adj = item.archivoAdjunto;
      if (!evidenciasPorNumeral[numeral].some(e => e.url === adj.url || e.nombre === adj.nombre)) {
        evidenciasPorNumeral[numeral].push({
          id: `adj-${numeral}`,
          companyId: empresaActiva.id,
          numeral: numeral,
          nombre: adj.nombre || `${numeral}_Evidencia.pdf`,
          url: adj.url,
          dataUrl: adj.dataUrl || '',
          tamanio: adj.tamano || adj.tamanio || 15000,
          tipo: adj.tipo || 'application/pdf',
          fechaCargue: adj.fechaSubida || item.updatedAt || new Date().toISOString()
        });
      }
    }
  });

  // Filtrado de estándares
  const estandaresFiltrados = estandares.filter(est => {
    const resp = respuestasMap[est.numeral];
    if (filtroCiclo === 'TODOS') return true;
    if (filtroCiclo === 'NO_CUMPLE') return resp && resp.estado === 'NO_CUMPLE';
    if (filtroCiclo === 'NO_APLICA') return resp && resp.estado === 'NO_APLICA';
    return est.ciclo === filtroCiclo;
  });

  const badgeColors = {
    red: 'bg-red-50 text-red-700 border-red-300',
    amber: 'bg-amber-50 text-amber-700 border-amber-300',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-300'
  };

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Panel de Puntaje Flotante / Encabezado -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div class="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div>
            <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <span>Resolución 0312 de 2019</span>
              <span>•</span>
              <span>${empresaActiva.estandaresAplicables} Estándares Mínimos Aplicables</span>
            </div>
            <div class="flex items-center gap-3 mt-1">
              <h1 class="text-2xl font-bold text-slate-800">Autoevaluación de Estándares Mínimos</h1>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                Vigencia ${anioActivo}
              </span>
            </div>
            <p class="text-sm text-slate-500 mt-1">Empresa: <strong>${empresaActiva.razonSocial}</strong> (NIT ${empresaActiva.nit} • Riesgo ${empresaActiva.claseRiesgo})</p>

            <!-- Selector Rápido de Año en la Evaluación -->
            <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                📅 Filtrar por Año:
              </span>
              <div class="relative inline-block">
                <select onchange="window.cambiarAnioActivo(this.value)" class="pl-2.5 pr-7 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-extrabold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none">
                  ${aniosDisponibles.map(a => `
                    <option value="${a}" ${a === anioActivo ? 'selected' : ''}>Año ${a} ${a === '2025' ? '(Inicial)' : ''}</option>
                  `).join('')}
                </select>
                <svg class="w-3.5 h-3.5 text-indigo-700 absolute right-1.5 top-1.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              <button onclick="window.abrirModalNuevoAnio()" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1" title="Aperturar nueva vigencia anual para esta empresa">
                <svg class="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>+ Habilitar Nueva Vigencia</span>
              </button>
            </div>
          </div>

          <!-- Puntuación Global y Semáforo Legal -->
          <div class="flex items-center gap-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="text-right">
              <span class="text-xs uppercase font-bold text-slate-400">Puntaje Obtenido</span>
              <div class="text-3xl font-black text-slate-800">${resultado.puntaje}%</div>
              <div class="text-xs text-slate-500">sobre 100% posible</div>
            </div>

            <div class="border-l border-slate-200 pl-4">
              <span class="px-3 py-1.5 rounded-lg text-xs font-black border uppercase tracking-wider block text-center ${badgeColors[resultado.colorBadge]}">
                ${resultado.estadoLegal}
              </span>
              <div class="text-xs text-slate-500 mt-1 text-center font-medium">
                <span class="text-emerald-700 font-bold">${resultado.cumpleCount} Cumple</span> • 
                <span class="text-slate-700 font-bold">${resultado.noAplicaCount} No Aplica</span> • 
                <span class="text-red-700 font-bold">${resultado.noCumpleCount} No Cumple</span>
              </div>
              <div class="text-[10px] text-slate-400 text-center italic mt-0.5">
                (Los "No Aplica" otorgan puntaje según Res. 0312)
              </div>
            </div>
          </div>
        </div>

        <!-- Barra de Progreso Visual -->
        <div class="w-full bg-slate-100 rounded-full h-3 mt-5">
          <div class="h-3 rounded-full transition-all duration-500 ${resultado.colorBadge === 'green' ? 'bg-emerald-500' : resultado.colorBadge === 'amber' ? 'bg-amber-500' : 'bg-red-500'}" style="width: ${resultado.puntaje}%"></div>
        </div>

        <!-- Dictamen del Ministerio del Trabajo -->
        <div class="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-4">
          <div class="text-slate-700">
            <strong>Exigencia Legal (Art. 28 Res. 0312):</strong> ${resultado.accionRequerida}
          </div>
          <button onclick="window.imprimirReporteEvaluacion()" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-xs font-semibold text-slate-700 flex-shrink-0 flex items-center gap-1.5 shadow-sm transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <!-- Filtros por Ciclo PHVA -->
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button onclick="window.cambiarFiltroCiclo('TODOS')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${filtroCiclo === 'TODOS' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
          Todos (${estandares.length})
        </button>
        <button onclick="window.cambiarFiltroCiclo('PLANEAR')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${filtroCiclo === 'PLANEAR' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
          I. Planear
        </button>
        <button onclick="window.cambiarFiltroCiclo('HACER')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${filtroCiclo === 'HACER' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
          II. Hacer
        </button>
        <button onclick="window.cambiarFiltroCiclo('VERIFICAR')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${filtroCiclo === 'VERIFICAR' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
          III. Verificar
        </button>
        <button onclick="window.cambiarFiltroCiclo('ACTUAR')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${filtroCiclo === 'ACTUAR' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
          IV. Actuar
        </button>
        <button onclick="window.cambiarFiltroCiclo('NO_APLICA')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${filtroCiclo === 'NO_APLICA' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}">
          ⚪ No Aplica (${resultado.noAplicaCount})
        </button>
        <button onclick="window.cambiarFiltroCiclo('NO_CUMPLE')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${filtroCiclo === 'NO_CUMPLE' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'}">
          ⚠️ Plan de Mejoramiento (${resultado.noCumpleCount} No Cumple)
        </button>
      </div>

      <!-- Lista Interactiva de Estándares Mínimos -->
      <div class="space-y-4">
        ${estandaresFiltrados.length === 0 ? `
          <div class="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
            No se encontraron estándares en esta vista o filtro.
          </div>
        ` : estandaresFiltrados.map(est => {
          const resp = respuestasMap[est.numeral] || { estado: '', justificacion: '', planAccion: '' };
          const estado = resp.estado;
          const evidencias = evidenciasPorNumeral[est.numeral] || [];
          
          // Normalizar fuentes documentales del numeral
          let fuentes = [];
          if (Array.isArray(resp.fuentes) && resp.fuentes.length > 0) {
            fuentes = resp.fuentes.map((f, idx) => ({
              id: f.id || `f-${idx + 1}`,
              url: (f.url || '').trim(),
              titulo: (f.titulo || '').trim()
            }));
          } else if ((resp.linkGuia || '').trim()) {
            fuentes = [{
              id: 'f-1',
              url: (resp.linkGuia || '').trim(),
              titulo: 'Documento Guía Principal'
            }];
          }

          // Garantizar que SIEMPRE exista al menos 1 campo en el formulario
          if (fuentes.length === 0) {
            fuentes = [{ id: 'f-1', url: '', titulo: '' }];
          }

          const fuentesValidas = fuentes.filter(f => !!f.url);
          const linkGuia = fuentesValidas.length > 0 ? fuentesValidas[0].url : (resp.linkGuia || '').trim();
          const totalSoportes = evidencias.length + fuentesValidas.length;

          return `
            <div class="bg-white rounded-xl border ${estado === 'CUMPLE' ? 'border-emerald-200 bg-emerald-50/10' : estado === 'NO_CUMPLE' ? 'border-red-200 bg-red-50/10' : 'border-slate-200'} p-5 shadow-sm card-estandar-optimizado">
              <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div class="flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-xs font-extrabold bg-slate-800 text-white">
                      Numeral ${est.numeral}
                    </span>
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ciclo ${est.ciclo}
                    </span>
                    <span class="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded" title="Ponderación legal: ${est.pesoEfectivo}%">
                      Peso: ${formatPeso(est.pesoEfectivo)}
                    </span>
                    ${totalSoportes > 0 ? `
                      <span class="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        📎 ${totalSoportes} ${totalSoportes === 1 ? 'soporte documental' : 'soportes documentales'}
                      </span>
                    ` : ''}
                    ${fuentesValidas.map((f, fIdx) => {
                      const fInfo = clasificarFuente(f.url);
                      const badgeLabel = f.titulo || (fuentesValidas.length > 1 ? `${fInfo.label} #${fIdx + 1}` : fInfo.label);
                      return `
                        <a href="${escapeHtml(f.url)}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold ${fInfo.bg} px-2.5 py-0.5 rounded-full flex items-center gap-1 transition shadow-2xs" title="${escapeHtml(f.titulo ? `${f.titulo} (${f.url})` : f.url)}">
                          ${fInfo.icon} ${escapeHtml(badgeLabel)} ↗
                        </a>
                      `;
                    }).join('')}
                  </div>

                  <h3 class="font-bold text-slate-800 text-base mt-2">${est.estandar}</h3>
                  <p class="text-xs font-medium text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong class="text-slate-900">Criterio Legal:</strong> ${est.criterio}
                  </p>
                  <p class="text-xs text-slate-500 mt-1 italic">
                    <strong>Modo de Verificación:</strong> ${est.modoVerificacion}
                  </p>
                </div>

                <!-- Botones de Calificación Interactiva -->
                <div class="flex md:flex-col items-center gap-2 flex-shrink-0">
                  <button 
                    onclick="window.calificarEstandar('${est.numeral}', 'CUMPLE')"
                    class="w-full px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${estado === 'CUMPLE' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'}"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    Cumple
                  </button>

                  <button 
                    onclick="window.calificarEstandar('${est.numeral}', 'NO_CUMPLE')"
                    class="w-full px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${estado === 'NO_CUMPLE' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50 hover:text-red-700'}"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    No Cumple
                  </button>

                  <button 
                    onclick="window.calificarEstandar('${est.numeral}', 'NO_APLICA')"
                    class="w-full px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${estado === 'NO_APLICA' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                    No Aplica
                  </button>
                </div>
              </div>

              <!-- Formulario de Soporte / Justificación / Plan de Acción -->
              <div class="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label class="block font-bold text-slate-600 mb-1">
                    Justificación / Evidencia Soportada:
                  </label>
                  <input 
                    type="text" 
                    placeholder="Describe documento, acta, contrato o motivo de no aplicación..." 
                    value="${resp.justificacion || ''}" 
                    onchange="window.guardarJustificacion('${est.numeral}', this.value)"
                    class="w-full p-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                </div>

                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block font-bold ${estado === 'NO_CUMPLE' ? 'text-red-700' : 'text-slate-600'}">
                      Plan de Acción Inmediato ${estado === 'NO_CUMPLE' ? '(Exigido por Ley)' : ''}:
                    </label>
                    <button type="button" onclick="window.asistirPlanAccionConIA('${est.numeral}', '${est.criterio.replace(/'/g, "\\'")}')" class="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition">
                      ✨ Asistir con IA (Gemini)
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Acción correctiva con fecha de cierre y responsable..." 
                    value="${resp.planAccion || ''}" 
                    onchange="window.guardarPlanAccion('${est.numeral}', this.value)"
                    class="w-full p-2 ${estado === 'NO_CUMPLE' ? 'bg-red-50/50 border-red-200 text-red-900 font-medium' : 'bg-slate-50 border-slate-200'} rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                </div>
              </div>

              <!-- ZONA DE DOCUMENTOS GUÍA, PLANTILLAS BASE Y FUENTES MULTI-ENLACE -->
              <div class="mt-3 pt-3 border-t border-slate-100 bg-blue-50/40 p-3 rounded-lg border border-blue-100/80">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2.5">
                  <div class="flex items-center gap-1.5">
                    <span class="p-1 rounded bg-blue-100 text-blue-700 flex-shrink-0">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </span>
                    <div>
                      <label class="text-xs font-bold text-slate-800">
                        Documento Guía, Plantillas Base y Fuentes Documentales:
                      </label>
                      <span class="text-[10px] text-slate-500 block">
                        Ingresa el enlace oficial (Docs, Sheets, Drive) o adjunta archivos directamente por fuente
                      </span>
                    </div>
                  </div>
                  
                  <!-- Botón Agregar Nueva Fuente -->
                  <button 
                    type="button" 
                    onclick="window.agregarFuenteGuia('${est.numeral}')"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto flex-shrink-0"
                    title="Agregar una nueva fuente o plantilla para este estándar"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    <span>+ Agregar nueva fuente</span>
                  </button>
                </div>

                <!-- Lista Dinámica de Fuentes (Siempre al menos 1 campo) -->
                <div class="space-y-2">
                  ${fuentes.map((f, fIdx) => {
                    const fInfo = clasificarFuente(f.url);
                    const tieneUrl = !!f.url;
                    const esUnica = fuentes.length === 1;

                    return `
                      <div class="bg-white p-2.5 rounded-lg border ${tieneUrl ? 'border-blue-200 shadow-2xs' : 'border-slate-200'} flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        
                        <!-- Badge Fila / Tipo -->
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                          <span class="w-5 h-5 rounded-full ${tieneUrl ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'} text-[10px] font-black flex items-center justify-center">
                            ${fIdx + 1}
                          </span>
                          <span class="text-[10px] font-bold ${tieneUrl ? 'text-blue-700' : 'text-slate-500'} min-w-[70px]">
                            ${tieneUrl ? fInfo.label : `Fuente ${fIdx + 1}`}
                          </span>
                        </div>

                        <!-- Título Opcional de la Fuente -->
                        <div class="w-full md:w-44 flex-shrink-0">
                          <input 
                            type="text" 
                            placeholder="Título opcional (ej: Anexo, Plantilla)..." 
                            value="${escapeHtml(f.titulo || '')}" 
                            onchange="window.actualizarFuenteGuia('${est.numeral}', '${f.id}', 'titulo', this.value)"
                            class="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            title="Nombre o descripción corta de la fuente"
                          >
                        </div>

                        <!-- URL / Enlace de la Fuente -->
                        <div class="relative flex-1 min-w-0">
                          <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                          </div>
                          <input 
                            type="url" 
                            id="input-url-${est.numeral}-${f.id}"
                            placeholder="https://docs.google.com/document/... o https://docs.google.com/spreadsheets/..."
                            value="${escapeHtml(f.url || '')}" 
                            onchange="window.actualizarFuenteGuia('${est.numeral}', '${f.id}', 'url', this.value)"
                            class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none ${tieneUrl ? 'font-medium text-slate-800' : 'text-slate-500'}"
                          >
                        </div>

                        <!-- Botones de Acción para esta Fuente -->
                        <div class="flex items-center gap-1.5 flex-shrink-0 justify-end">
                          ${tieneUrl ? `
                            <a 
                              href="${escapeHtml(f.url)}" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              class="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold flex items-center gap-1 transition"
                              title="Abrir en pestaña nueva"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                              <span>Abrir</span>
                            </a>

                            <button 
                              type="button" 
                              onclick="window.previsualizarFuenteGuia('${est.numeral}', '${f.id}')"
                              class="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1 transition"
                              title="Vista previa del documento sin salir de la App"
                            >
                              <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                              <span>Ver</span>
                            </button>
                          ` : ''}

                          <!-- Adjuntar archivo directamente a esta fila de fuente -->
                          <label class="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold cursor-pointer transition flex items-center gap-1" title="Cargar archivo físico y asociarlo a esta fuente">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                            <span>Subir Archivo</span>
                            <input type="file" onchange="window.adjuntarArchivoAFuente('${est.numeral}', '${f.id}', this.files)" class="hidden">
                          </label>

                          <!-- Botón Quitar o Limpiar -->
                          <button 
                            type="button" 
                            onclick="window.eliminarFuenteGuia('${est.numeral}', '${f.id}')"
                            class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                            title="${esUnica ? 'Limpiar campos de esta fuente' : 'Eliminar esta fuente'}"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- ZONA DE CARGUE Y GESTIÓN DE ARCHIVOS ADJUNTOS Y DOCUMENTOS DE SOPORTE -->
              <div class="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                  <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    Documentos de Soporte y Evidencias Activas (${totalSoportes})
                  </span>

                  <!-- Botón para Cargar Archivos Locales -->
                  <label class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    <span>Adjuntar Archivo Local (PDF, Foto, Doc)</span>
                    <input type="file" multiple onchange="window.adjuntarEvidencia('${est.numeral}', this.files)" class="hidden">
                  </label>
                </div>

                <!-- Lista de Documentos de Soporte Activos -->
                ${totalSoportes === 0 ? `
                  <div class="text-[11px] text-slate-400 italic py-1">
                    ⚪ No se han adjuntado archivos ni documentos para este estándar todavía. Puedes vincular una plantilla en Google Docs/Sheets o adjuntar copias escaneadas, actas, fotos o certificados en PDF.
                  </div>
                ` : `
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    
                    <!-- Tarjetas de Fuentes Oficiales Activas -->
                    ${fuentesValidas.map((fuente, fIdx) => {
                      const fInfo = clasificarFuente(fuente.url);
                      return `
                        <div class="bg-white p-2.5 rounded-lg border ${fInfo.tipo === 'GDOCS' ? 'border-blue-200 bg-blue-50/20' : fInfo.tipo === 'GSHEETS' ? 'border-emerald-200 bg-emerald-50/20' : fInfo.tipo === 'GDRIVE' ? 'border-amber-200 bg-amber-50/20' : 'border-indigo-200 bg-indigo-50/20'} shadow-xs flex items-center justify-between gap-2 hover:shadow-sm transition">
                          <div class="flex items-center gap-2 overflow-hidden flex-1 min-w-0 cursor-pointer" onclick="window.previsualizarFuenteGuia('${est.numeral}', '${fuente.id}')" title="Clic para vista previa de esta fuente">
                            <span class="p-1.5 rounded ${fInfo.tipo === 'GDOCS' ? 'bg-blue-100 text-blue-700' : fInfo.tipo === 'GSHEETS' ? 'bg-emerald-100 text-emerald-700' : fInfo.tipo === 'GDRIVE' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'} flex-shrink-0 text-xs">
                              ${fInfo.icon}
                            </span>
                            <div class="overflow-hidden min-w-0">
                              <span class="text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate block transition" title="${escapeHtml(fuente.titulo || fInfo.label)}">
                                ${escapeHtml(fuente.titulo || (fuentesValidas.length > 1 ? `${fInfo.label} #${fIdx + 1}` : fInfo.label))}
                              </span>
                              <span class="text-[10px] font-medium ${fInfo.tipo === 'GDOCS' ? 'text-blue-600' : fInfo.tipo === 'GSHEETS' ? 'text-emerald-600' : fInfo.tipo === 'GDRIVE' ? 'text-amber-600' : 'text-indigo-600'} block">
                                ✓ ${escapeHtml(fInfo.label)}
                              </span>
                            </div>
                          </div>

                          <div class="flex items-center gap-1 flex-shrink-0">
                            <button 
                              type="button" 
                              onclick="window.previsualizarFuenteGuia('${est.numeral}', '${fuente.id}')" 
                              class="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-[11px] font-semibold flex items-center gap-1 transition shadow-2xs" 
                              title="Vista previa sin salir de la App"
                            >
                              <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                              <span>Ver</span>
                            </button>
                            <a 
                              href="${escapeHtml(fuente.url)}" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              class="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" 
                              title="Abrir en pestaña nueva"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            </a>
                          </div>
                        </div>
                      `;
                    }).join('')}

                    <!-- Archivos Locales Adjuntos (Subidos a IndexedDB) -->
                    ${evidencias.map(ev => {
                      const esPDF = ev.tipo?.includes('pdf') || ev.nombre.endsWith('.pdf');
                      const esImagen = ev.tipo?.includes('image') || ev.nombre.match(/\.(jpg|jpeg|png|webp)$/i);
                      const kb = Math.round(ev.tamanio / 1024);
                      const sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

                      return `
                        <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between gap-2 hover:border-indigo-300 transition">
                          <div class="flex items-center gap-2 overflow-hidden cursor-pointer flex-1 min-w-0" onclick="window.previsualizarEvidencia('${ev.id}')" title="Clic para vista previa de ${ev.nombre}">
                            <span class="p-1.5 rounded ${esPDF ? 'bg-red-50 text-red-600' : esImagen ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} flex-shrink-0">
                              ${esPDF ? `
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"></path></svg>
                              ` : `
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg>
                              `}
                            </span>
                            <div class="overflow-hidden min-w-0">
                              <span class="text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate block transition" title="${ev.nombre}">${ev.nombre}</span>
                              <span class="text-[10px] text-slate-400 block">${sizeStr}</span>
                            </div>
                          </div>

                          <div class="flex items-center gap-1.5 flex-shrink-0">
                            <!-- Botón Vista Previa Inmediata (Sin Descargar) -->
                            <button 
                              type="button" 
                              onclick="window.previsualizarEvidencia('${ev.id}')" 
                              class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-md text-[11px] font-semibold flex items-center gap-1 transition shadow-2xs" 
                              title="Vista previa inmediata del documento sin descargar"
                            >
                              <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                              <span>Vista Previa</span>
                            </button>

                            <!-- Descargar copia -->
                            <button 
                              type="button" 
                              onclick="window.descargarEvidencia('${ev.id}')" 
                              class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition" 
                              title="Descargar copia del archivo"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            </button>

                            <!-- Eliminar -->
                            <button 
                              type="button" 
                              onclick="window.eliminarEvidencia('${ev.id}')" 
                              class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" 
                              title="Eliminar evidencia"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

window.cambiarFiltroCiclo = function(ciclo) {
  filtroCiclo = ciclo;
  renderEvaluation();
};

window.calificarEstandar = function(numeral, estado) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const evaluacion = store.getEvaluacion(empresaActiva.id);
  const actual = evaluacion[numeral] || {};
  
  const nuevoEstado = actual.estado === estado ? '' : estado;

  store.saveEvaluacionItem(empresaActiva.id, numeral, {
    ...actual,
    estado: nuevoEstado
  });

  renderEvaluation();
};

window.guardarJustificacion = function(numeral, justificacion) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const evaluacion = store.getEvaluacion(empresaActiva.id);
  const actual = evaluacion[numeral] || {};

  store.saveEvaluacionItem(empresaActiva.id, numeral, {
    ...actual,
    justificacion
  });
};

window.guardarPlanAccion = function(numeral, planAccion) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const evaluacion = store.getEvaluacion(empresaActiva.id);
  const actual = evaluacion[numeral] || {};

  store.saveEvaluacionItem(empresaActiva.id, numeral, {
    ...actual,
    planAccion
  });
};

// GESTIÓN DE FUENTES DOCUMENTALES Y PLANTILLAS BASE (GOOGLE DOCS / SHEETS / ARCHIVOS)
window.agregarFuenteGuia = function(numeral) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const anio = store.getAnioActivo();
  const evaluacion = store.getEvaluacion(empresaActiva.id, anio) || {};
  const actual = evaluacion[numeral] || {};

  let fuentes = [];
  if (Array.isArray(actual.fuentes) && actual.fuentes.length > 0) {
    fuentes = actual.fuentes.map((f, idx) => ({
      id: f.id || `f-${idx + 1}`,
      url: (f.url || '').trim(),
      titulo: (f.titulo || '').trim()
    }));
  } else if ((actual.linkGuia || '').trim()) {
    fuentes = [{
      id: 'f-1',
      url: (actual.linkGuia || '').trim(),
      titulo: 'Documento Guía Principal'
    }];
  }

  if (fuentes.length === 0) {
    fuentes = [{ id: 'f-1', url: '', titulo: '' }];
  }

  const nuevoId = `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  fuentes.push({
    id: nuevoId,
    url: '',
    titulo: ''
  });

  const primeraValida = fuentes.find(f => !!f.url);

  store.saveEvaluacionItem(empresaActiva.id, anio, numeral, {
    ...actual,
    fuentes,
    linkGuia: primeraValida ? primeraValida.url : (actual.linkGuia || '')
  });

  renderEvaluation();

  setTimeout(() => {
    const nuevoInput = document.getElementById(`input-url-${numeral}-${nuevoId}`);
    if (nuevoInput) nuevoInput.focus();
  }, 100);
};

window.actualizarFuenteGuia = function(numeral, fuenteId, campo, valor) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const anio = store.getAnioActivo();
  const evaluacion = store.getEvaluacion(empresaActiva.id, anio) || {};
  const actual = evaluacion[numeral] || {};

  let fuentes = [];
  if (Array.isArray(actual.fuentes) && actual.fuentes.length > 0) {
    fuentes = actual.fuentes.map((f, idx) => ({
      id: f.id || `f-${idx + 1}`,
      url: (f.url || '').trim(),
      titulo: (f.titulo || '').trim()
    }));
  } else if ((actual.linkGuia || '').trim()) {
    fuentes = [{
      id: 'f-1',
      url: (actual.linkGuia || '').trim(),
      titulo: 'Documento Guía Principal'
    }];
  }

  if (fuentes.length === 0) {
    fuentes = [{ id: 'f-1', url: '', titulo: '' }];
  }

  let idx = fuentes.findIndex(f => f.id === fuenteId);
  if (idx === -1) {
    idx = 0;
    fuentes[0].id = fuenteId;
  }

  if (campo === 'url') {
    fuentes[idx].url = (valor || '').trim();
  } else if (campo === 'titulo') {
    fuentes[idx].titulo = (valor || '').trim();
  }

  const primeraValida = fuentes.find(f => !!f.url);

  store.saveEvaluacionItem(empresaActiva.id, anio, numeral, {
    ...actual,
    fuentes,
    linkGuia: primeraValida ? primeraValida.url : ''
  });

  // No re-renderizamos la vista completa de 68 estándares para mantener la fluidez absoluta de digitación
};

window.eliminarFuenteGuia = function(numeral, fuenteId) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const anio = store.getAnioActivo();
  const evaluacion = store.getEvaluacion(empresaActiva.id, anio) || {};
  const actual = evaluacion[numeral] || {};

  let fuentes = [];
  if (Array.isArray(actual.fuentes) && actual.fuentes.length > 0) {
    fuentes = actual.fuentes.map((f, idx) => ({
      id: f.id || `f-${idx + 1}`,
      url: (f.url || '').trim(),
      titulo: (f.titulo || '').trim()
    }));
  } else if ((actual.linkGuia || '').trim()) {
    fuentes = [{
      id: 'f-1',
      url: (actual.linkGuia || '').trim(),
      titulo: 'Documento Guía Principal'
    }];
  }

  if (fuentes.length <= 1) {
    // Si solo hay 1 fuente, limpiamos sus valores pero dejamos el campo listo para escribir
    fuentes = [{ id: 'f-1', url: '', titulo: '' }];
  } else {
    // Si hay más de 1 fuente, removemos la seleccionada
    fuentes = fuentes.filter(f => f.id !== fuenteId);
    if (fuentes.length === 0) {
      fuentes = [{ id: 'f-1', url: '', titulo: '' }];
    }
  }

  const primeraValida = fuentes.find(f => !!f.url);

  store.saveEvaluacionItem(empresaActiva.id, anio, numeral, {
    ...actual,
    fuentes,
    linkGuia: primeraValida ? primeraValida.url : ''
  });

  renderEvaluation();
};

window.adjuntarArchivoAFuente = async function(numeral, fuenteId, files) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva || !files || files.length === 0) return;
  const anio = store.getAnioActivo();

  const file = files[0];
  const archivoGuardado = await evidenceDB.guardarArchivo(empresaActiva.id, numeral, file);

  const evaluacion = store.getEvaluacion(empresaActiva.id, anio) || {};
  const actual = evaluacion[numeral] || {};

  let fuentes = [];
  if (Array.isArray(actual.fuentes) && actual.fuentes.length > 0) {
    fuentes = actual.fuentes.map((f, idx) => ({
      id: f.id || `f-${idx + 1}`,
      url: (f.url || '').trim(),
      titulo: (f.titulo || '').trim()
    }));
  } else if ((actual.linkGuia || '').trim()) {
    fuentes = [{
      id: 'f-1',
      url: (actual.linkGuia || '').trim(),
      titulo: 'Documento Guía Principal'
    }];
  }

  if (fuentes.length === 0) {
    fuentes = [{ id: 'f-1', url: '', titulo: '' }];
  }

  let idx = fuentes.findIndex(f => f.id === fuenteId);
  if (idx === -1) {
    idx = 0;
    fuentes[0].id = fuenteId;
  }

  const targetUrl = archivoGuardado.url || archivoGuardado.dataUrl;
  fuentes[idx].url = targetUrl;
  if (!fuentes[idx].titulo) {
    fuentes[idx].titulo = file.name;
  }

  const primeraValida = fuentes.find(f => !!f.url);

  store.saveEvaluacionItem(empresaActiva.id, anio, numeral, {
    ...actual,
    fuentes,
    linkGuia: primeraValida ? primeraValida.url : targetUrl
  });

  renderEvaluation();
};

window.previsualizarFuenteGuia = function(numeral, fuenteId) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const anio = store.getAnioActivo();
  const evaluacion = store.getEvaluacion(empresaActiva.id, anio) || {};
  const actual = evaluacion[numeral] || {};

  let targetUrl = '';
  let targetTitulo = '';

  if (Array.isArray(actual.fuentes) && actual.fuentes.length > 0) {
    const f = fuenteId ? actual.fuentes.find(item => item.id === fuenteId) : actual.fuentes.find(item => !!item.url);
    if (f && f.url) {
      targetUrl = f.url;
      targetTitulo = f.titulo || '';
    }
  }

  if (!targetUrl) {
    targetUrl = (actual.linkGuia || '').trim();
  }

  if (!targetUrl) {
    alert("Por favor ingresa primero la URL o adjunta un archivo para esta fuente.");
    return;
  }

  const estandares = obtenerEstandaresPorGrupo(empresaActiva.estandaresAplicables || 60);
  const est = estandares.find(e => e.numeral === numeral);

  abrirVisorEnlaceGuia({
    url: targetUrl,
    numeral,
    criterio: est ? (est.criterio || est.estandar) : '',
    empresaNombre: empresaActiva.razonSocial,
    titulo: targetTitulo
  });
};

// Compatibilidad retroactiva con llamadas heredadas
window.guardarLinkGuia = function(numeral, url) {
  window.actualizarFuenteGuia(numeral, 'f-1', 'url', url);
};

window.limpiarLinkGuia = function(numeral) {
  window.eliminarFuenteGuia(numeral, 'f-1');
};

window.previsualizarDocumentoGuia = function(numeral) {
  window.previsualizarFuenteGuia(numeral, null);
};

// GESTIÓN DE ARCHIVOS ADJUNTOS EN INDEXEDDB Y STORE
window.adjuntarEvidencia = async function(numeral, files) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva || !files || files.length === 0) return;

  const anio = store.getAnioActivo ? store.getAnioActivo() : '2026';
  const evals = store.getEvaluacion(empresaActiva.id, anio) || {};
  let actual = { ...(evals[numeral] || {}) };
  let fuentesActuales = Array.isArray(actual.fuentes) ? [...actual.fuentes] : [];
  let ultimoArchivo = actual.archivoAdjunto || null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const guardado = await evidenceDB.guardarArchivo(empresaActiva.id, numeral, file);
      ultimoArchivo = {
        nombre: file.name,
        url: guardado?.url || `/uploads/${file.name}`,
        dataUrl: guardado?.dataUrl || '',
        tipo: file.type || 'application/pdf',
        tamano: file.size,
        fechaSubida: new Date().toISOString()
      };
      if (!fuentesActuales.some(f => f.url === ultimoArchivo.url)) {
        fuentesActuales.unshift({
          titulo: `${file.name.replace(/\.[^/.]+$/, "")} (Evidencia Firmada/Adjunta)`,
          url: ultimoArchivo.url
        });
      }
    } catch (eAdj) {
      console.error("Error guardando archivo adjunto:", eAdj);
    }
  }

  // Guardar vinculación en la evaluación del estándar
  store.saveEvaluacionItem(empresaActiva.id, anio, numeral, {
    ...actual,
    archivoAdjunto: ultimoArchivo,
    fuentes: fuentesActuales,
    estado: actual.estado && actual.estado !== 'SIN_EVALUAR' ? actual.estado : 'CUMPLE'
  });

  // Refrescar vista
  renderEvaluation();
};

window.eliminarEvidencia = async function(id) {
  if (confirm("¿Deseas eliminar este archivo de evidencia adjunto?")) {
    await evidenceDB.eliminarEvidencia(id);
    renderEvaluation();
  }
};

window.descargarEvidencia = async function(id) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const todas = await evidenceDB.obtenerTodasEvidencias(empresaActiva.id);
  const archivo = todas.find(a => a.id === id);

  if (archivo) {
    const a = document.createElement('a');
    a.href = archivo.dataUrl;
    a.download = archivo.nombre;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

window.imprimirReporteEvaluacion = function() {
  window.location.hash = '#reportes';
};
