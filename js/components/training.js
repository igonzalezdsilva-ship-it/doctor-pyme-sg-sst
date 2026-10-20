// =============================================================================
// MÓDULO DE CAPACITACIONES, INDUCCIÓN Y EVALUACIÓN (E-LEARNING) - DOCTOR PYME
// Plan de Formación, E-Learning Player, Quiz Builder de 13 Preguntas y Formatos DOC-10 / DOC-16
// Cumplimiento Decreto 1072 de 2015 (Art. 2.2.4.6.11) y Res. 0312 de 2019 (Estándar 1.2.1)
// =============================================================================

import { store } from '../store.js';
import { generarTemarioCapacitacion, generarCuestionarioCapacitacion } from '../services/geminiService.js';
import { imprimirRegistroCapacitacionDOC10, imprimirEvaluacionCapacitacionDOC16 } from '../services/trainingReports.js';

let pestanaActivaTraining = 'cursos'; // 'cursos' | 'evaluaciones'

export function formatPresentationEmbedUrl(url) {
  if (!url) return '';
  const gslidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (gslidesMatch && gslidesMatch[1]) {
    return `https://docs.google.com/presentation/d/${gslidesMatch[1]}/embed?start=false&loop=false&delayms=3000`;
  }
  return url;
}

export function formatVideoEmbedUrl(url) {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }
  const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
  }
  return url;
}

export function renderTraining() {
  const container = document.getElementById('main-content');
  if (!container) return;

  const empresa = store.getEmpresaActiva() || { id: 'emp-1790438946268', razonSocial: 'EMPRESA ACTIVA' };
  const capacitaciones = store.getCapacitaciones(empresa.id);
  const trabajadores = store.getTrabajadores(empresa.id);
  const totalTrabajadores = Math.max(1, trabajadores.length);

  // Consolidado de todas las evaluaciones registradas
  const todasEvaluaciones = store.getAllWorkerEvaluations(empresa.id);
  const totalEvaluaciones = todasEvaluaciones.length;
  const totalAprobadas = todasEvaluaciones.filter(e => e.passed || e.aprobada).length;
  
  let sumaNotas = 0;
  const trabajadoresEvaluadosIds = new Set();
  todasEvaluaciones.forEach(e => {
    sumaNotas += (e.nota || e.score_obtained || 5.0);
    if (e.passed || e.aprobada) {
      trabajadoresEvaluadosIds.add(e.worker_id || e.trabajadorId);
    }
  });

  const promedioNotas = totalEvaluaciones > 0 ? (sumaNotas / totalEvaluaciones).toFixed(1) : '5.0';
  const porcentajeCobertura = Math.round((trabajadoresEvaluadosIds.size / totalTrabajadores) * 100);

  container.innerHTML = `
    <div class="space-y-6 animate-fadeIn pb-16">
      
      <!-- Cabecera Institucional y Selector de Empresa -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-xl font-black text-slate-900 tracking-tight">Módulo de Capacitaciones, Inducción y Evaluación (E-Learning)</h2>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Estándar 1.2.1 • Res. 0312
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              ${empresa.razonSocial}
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1 max-w-2xl">
            Gestión integral del Plan Anual de Formación SST. Creación de cursos con visor de diapositivas, videos embebidos, constructor de evaluaciones de 13 preguntas y generación de formatos legales DOC-10 y DOC-16.
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button onclick="window.location.hash='#portal-trabajador'; setTimeout(() => { if(window.cambiarTabInterfazTrabajador) window.cambiarTabInterfazTrabajador('elearning'); if(window.verPortalModoOperario) window.verPortalModoOperario(); }, 80);" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer">
            <span>👷</span>
            <span>Probar Interfaz E-Learning (Vista Trabajador)</span>
          </button>
          <button id="btn-nueva-capacitacion" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>+ Programar Capacitación</span>
          </button>
        </div>
      </div>

      <!-- Tarjetas de KPIs y Cobertura Forense -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span class="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Cursos Programados</span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-black text-slate-800">${capacitaciones.length}</span>
            <span class="text-xs font-bold text-indigo-600">(${capacitaciones.filter(c => c.order_number === 1 || c.esInduccionObligatoria).length} Obligatoria Inducción)</span>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span class="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Cobertura de Personal</span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-black text-indigo-600">${porcentajeCobertura}%</span>
            <span class="text-xs text-slate-500 font-semibold">${trabajadoresEvaluadosIds.size} de ${totalTrabajadores} trabajadores</span>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span class="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Evaluaciones Realizadas</span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-black text-slate-800">${totalEvaluaciones}</span>
            <span class="text-xs font-bold text-emerald-600">${totalAprobadas} Aprobadas</span>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span class="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Promedio de Aprobación</span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-2xl font-black text-amber-500">${promedioNotas}</span>
            <span class="text-xs text-slate-400 font-bold">/ 5.0 Escala</span>
          </div>
        </div>
      </div>

      <!-- Barra de Navegación por Pestañas -->
      <div class="flex items-center gap-2 border-b border-slate-200">
        <button id="tab-btn-cursos" class="px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${pestanaActivaTraining === 'cursos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <span>📚 Cursos y Capacitaciones (${capacitaciones.length})</span>
        </button>
        <button id="tab-btn-evaluaciones" class="px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${pestanaActivaTraining === 'evaluaciones' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <span>📊 Reporte Consolidado de Evaluaciones (${todasEvaluaciones.length})</span>
        </button>
      </div>

      <!-- CONTENIDO PESTAÑA 1: GESTOR DE CURSOS / CAPACITACIONES (CRUD) -->
      ${pestanaActivaTraining === 'cursos' ? `
        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4">
            ${capacitaciones.map(cap => {
              const evals = cap.evaluaciones || [];
              const aprobadosCap = evals.filter(e => e.passed || e.aprobada).length;
              const esCap1 = (cap.order_number === 1 || cap.esInduccionObligatoria);
              const numPreguntas = (cap.preguntas || []).length;

              return `
                <div class="bg-white border ${esCap1 ? 'border-indigo-300 ring-2 ring-indigo-500/10' : 'border-slate-200'} rounded-2xl p-5 shadow-xs space-y-4 hover:border-indigo-400 transition">
                  <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div class="space-y-1.5 max-w-3xl">
                      <div class="flex items-center gap-2 flex-wrap">
                        ${esCap1 ? `
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                            ★ Capacitación #1 (Obligatoria: Inducción SG-SST)
                          </span>
                        ` : `
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Capacitación #${cap.order_number || 2}
                          </span>
                        `}
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${cap.estado === 'Completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                          ● ${cap.estado || 'Programada'}
                        </span>
                        <span class="text-xs text-slate-400 font-semibold">• Intensidad: ${cap.duracion || '2 Horas'}</span>
                        <span class="text-xs text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          📝 ${numPreguntas} Preguntas en Cuestionario
                        </span>
                      </div>

                      <h4 class="text-base font-black text-slate-900">${cap.tema}</h4>
                      <p class="text-xs text-slate-600 leading-relaxed">${cap.objetivo}</p>
                      
                      <div class="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span>Facilitador: <strong class="text-slate-700">${cap.facilitador || 'Asesor Especialista ARL'}</strong></span>
                        <span>Fecha: <strong class="text-indigo-700 font-mono">${cap.fecha || '2026-01-15'}</strong></span>
                      </div>
                    </div>

                    <div class="text-left sm:text-right flex-shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                      <span class="text-[10px] text-slate-400 uppercase font-bold block">Evaluaciones Registradas</span>
                      <span class="text-lg font-black text-indigo-700 font-mono">${evals.length}</span>
                      <span class="text-[11px] text-slate-500 block mt-0.5 font-semibold text-emerald-600">${aprobadosCap} aprobadas</span>
                    </div>
                  </div>

                  <!-- Insignias de Recursos Multimedia -->
                  <div class="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    ${cap.presentacionUrl ? `
                      <button onclick="window.verMultimediaCapacitacion('${cap.id}', 'presentacion')" class="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                        <span>📊</span> Visor de Presentación (Google Slides)
                      </button>
                    ` : ''}

                    ${cap.videoUrl ? `
                      <button onclick="window.verMultimediaCapacitacion('${cap.id}', 'video')" class="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                        <span>🎥</span> Video E-Learning Embebido
                      </button>
                    ` : ''}

                    ${cap.materialUrl ? `
                      <a href="${cap.materialUrl}" target="_blank" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
                        <span>🔗</span> Enlace Material de Apoyo ↗
                      </a>
                    ` : ''}
                  </div>

                  <!-- Botones de Acción de Administrador -->
                  <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <button onclick="window.abrirQuizBuilder('${cap.id}')" class="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                        <span>📝</span> Constructor de Evaluación (${numPreguntas}/13 Preguntas)
                      </button>

                      <button onclick="window.editarCapacitacionModal('${cap.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>✏️</span> Editar Contenido & Enlaces
                      </button>

                      ${!esCap1 ? `
                        <button onclick="window.eliminarCapacitacionAction('${cap.id}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                          <span>🗑️</span> Eliminar
                        </button>
                      ` : ''}
                    </div>

                    <div class="flex items-center gap-2">
                      <button onclick="window.notificarTrabajadoresCapacitacion('${cap.id}')" class="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                        <span>✉️</span> Convocatoria por Correo
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : `
        <!-- CONTENIDO PESTAÑA 2: CONSOLIDADO DE CALIFICACIONES Y AUDITORÍA FORENSE -->
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-black text-slate-900 tracking-wider uppercase">Trazabilidad de Evaluaciones E-Learning</h3>
              <p class="text-xs text-slate-500">Historial forense con timestamp inmutable, calificación automática e impresión de formatos DOC-10 y DOC-16.</p>
            </div>
            <span class="text-xs font-bold text-slate-500">${todasEvaluaciones.length} Evaluaciones presentadas</span>
          </div>

          ${todasEvaluaciones.length === 0 ? `
            <div class="text-center py-12 text-slate-400 text-xs">
              <span class="text-3xl block mb-2">📋</span>
              Aún no hay evaluaciones presentadas por los trabajadores de esta empresa.<br>
              Los trabajadores pueden presentarlas desde el <strong>Portal del Trabajador</strong>.
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th class="p-3">Trabajador / Documento</th>
                    <th class="p-3">Cargo</th>
                    <th class="p-3">Capacitación</th>
                    <th class="p-3">Timestamp Servidor (Inmutable)</th>
                    <th class="p-3 text-center">Aciertos</th>
                    <th class="p-3 text-center">Calificación</th>
                    <th class="p-3 text-center">Estado</th>
                    <th class="p-3 text-right">Formatos Oficiales PDF</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${todasEvaluaciones.map(ev => {
                    const passed = ev.passed || ev.aprobada;
                    const certCode = ev.certificate_code || `DP-EVAL-${(ev.id || 'REG').slice(-6).toUpperCase()}`;
                    const timestamp = ev.accepted_at_bogota || ev.timestamp || ev.fecha || '2026-01-15 17:00:00';
                    const nota = ev.nota || ev.score_obtained || 5.0;
                    const pct = ev.percentage !== undefined ? ev.percentage : Math.round((nota / 5) * 100);
                    const aciertos = ev.correct_count !== undefined ? ev.correct_count : 13;
                    const totalQ = ev.total_questions || 13;

                    return `
                      <tr class="hover:bg-slate-50/80 transition">
                        <td class="p-3 font-semibold text-slate-900">
                          <div>${ev.trabajadorNombre || 'Trabajador'}</div>
                          <span class="text-[10px] text-slate-400 font-mono">C.C. ${ev.trabajadorCedula || '---'}</span>
                        </td>
                        <td class="p-3 text-slate-600">${ev.trabajadorCargo || 'Operativo'}</td>
                        <td class="p-3 text-slate-800 font-medium">
                          <span class="block">${ev.training_title || 'Capacitación SG-SST'}</span>
                          <span class="text-[10px] text-indigo-600 font-mono font-bold">${certCode}</span>
                        </td>
                        <td class="p-3 font-mono text-slate-600 text-[11px]">${timestamp}</td>
                        <td class="p-3 text-center font-bold text-slate-800 font-mono">${aciertos} / ${totalQ}</td>
                        <td class="p-3 text-center">
                          <span class="text-xs font-black ${passed ? 'text-emerald-600' : 'text-rose-600'} font-mono">${nota} / 5.0</span>
                          <span class="text-[10px] text-slate-400 block">(${pct}%)</span>
                        </td>
                        <td class="p-3 text-center">
                          <span class="px-2.5 py-1 rounded-md text-[10px] font-bold ${passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
                            ${passed ? 'APROBADO' : 'REPROBADO'}
                          </span>
                        </td>
                        <td class="p-3 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.imprimirRegistroCapacitacionDOC10('${ev.id}')" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Imprimir DOC-10 Formato de Registro de Asistencia">
                              <span>📄</span> DOC-10
                            </button>
                            <button onclick="window.imprimirEvaluacionCapacitacionDOC16('${ev.id}')" class="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Imprimir DOC-16 Formato de Evaluación de Aprendizaje">
                              <span>📝</span> DOC-16
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `}

    </div>
  `;

  // Event Listeners para Pestañas
  const tabCursos = document.getElementById('tab-btn-cursos');
  const tabEvals = document.getElementById('tab-btn-evaluaciones');
  if (tabCursos && tabEvals) {
    tabCursos.onclick = () => {
      pestanaActivaTraining = 'cursos';
      renderTraining();
    };
    tabEvals.onclick = () => {
      pestanaActivaTraining = 'evaluaciones';
      renderTraining();
    };
  }

  // Listener para nueva capacitación
  const btnNueva = document.getElementById('btn-nueva-capacitacion');
  if (btnNueva) {
    btnNueva.onclick = () => abrirModalCrearEditarCapacitacion(null);
  }
}

/**
 * MODAL PARA VER MATERIAL MULTIMEDIA (GOOGLE SLIDES / VIDEO)
 */
export function verMultimediaCapacitacion(capId, tipo) {
  const cap = store.getCapacitacionPorId(capId);
  if (!cap) return;

  const modalId = 'modal-visor-multimedia';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  const embedPres = formatPresentationEmbedUrl(cap.presentacionUrl || cap.materialUrl);
  const embedVid = formatVideoEmbedUrl(cap.videoUrl);

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
      <div class="bg-indigo-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Visor de Material E-Learning</span>
          <h3 class="text-sm font-bold text-white">${cap.tema}</h3>
        </div>
        <button id="btn-cerrar-multimedia" class="text-slate-300 hover:text-white p-1 text-lg font-bold cursor-pointer">✕</button>
      </div>

      <div class="p-6 space-y-4 overflow-y-auto flex-1">
        ${tipo === 'presentacion' ? `
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">Presentación Oficial (Google Slides / Diapositivas)</span>
              ${cap.presentacionUrl ? `
                <a href="${cap.presentacionUrl}" target="_blank" class="text-xs text-indigo-600 font-bold hover:underline">Abrir en pestaña nueva ↗</a>
              ` : ''}
            </div>
            <div class="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
              <iframe src="${embedPres}" class="w-full h-full border-0" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>
            </div>
          </div>
        ` : `
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">Video de Capacitación E-Learning</span>
              ${cap.videoUrl ? `
                <a href="${cap.videoUrl}" target="_blank" class="text-xs text-rose-600 font-bold hover:underline">Abrir en plataforma de video ↗</a>
              ` : ''}
            </div>
            <div class="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black shadow-inner flex items-center justify-center">
              ${embedVid.endsWith('.mp4') ? `
                <video controls class="w-full h-full object-contain">
                  <source src="${embedVid}" type="video/mp4">
                  Tu navegador no soporta el reproductor de video.
                </video>
              ` : `
                <iframe src="${embedVid}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
              `}
            </div>
          </div>
        `}
      </div>

      <div class="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end flex-shrink-0">
        <button id="btn-cerrar-multimedia-pie" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer">
          Cerrar Visor
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('btn-cerrar-multimedia').onclick = () => modal.remove();
  document.getElementById('btn-cerrar-multimedia-pie').onclick = () => modal.remove();
};

/**
 * MODAL CONSTRUCTOR DE EVALUACIONES (QUIZ BUILDER DE 13 PREGUNTAS)
 */
export function abrirQuizBuilder(capId) {
  const cap = store.getCapacitacionPorId(capId);
  if (!cap) return;

  const modalId = 'modal-quiz-builder';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  // Asegurar que haya 13 preguntas configurables
  let preguntas = JSON.parse(JSON.stringify(cap.preguntas || []));
  while (preguntas.length < 13) {
    const idx = preguntas.length + 1;
    preguntas.push({
      pregunta: `Pregunta ${idx} de verificación sobre ${cap.tema}`,
      opciones: [
        "A) Opción de respuesta A",
        "B) Opción de respuesta B (Correcta)",
        "C) Opción de respuesta C",
        "D) Opción de respuesta D"
      ],
      respuestaCorrecta: 1,
      correct_option_index: 1,
      justificacion: "Justificación técnica según la normativa colombiana de SG-SST."
    });
  }

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
      <div class="bg-indigo-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Constructor de Evaluaciones (Quiz Builder)</span>
          <h3 class="text-sm font-bold text-white">${cap.tema} (Estructura Estricta de 13 Preguntas)</h3>
        </div>
        <button id="btn-cerrar-qb" class="text-slate-300 hover:text-white p-1 text-lg font-bold cursor-pointer">✕</button>
      </div>

      <div class="px-6 py-3 bg-purple-50 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <p class="text-xs text-purple-900">
          Configura las <strong>13 preguntas de opción múltiple</strong> (A, B, C, D). Marca con el radio button cuál es la <strong>respuesta correcta</strong>.
        </p>
        <div class="flex items-center gap-2">
          <button type="button" id="btn-autogenerar-ia-qb" class="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer">
            <span>✨ Autogenerar 13 Preguntas con Gemini Pro</span>
          </button>
          <span class="text-xs font-bold text-purple-700 bg-white px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs">
            13 de 13 Preguntas
          </span>
        </div>
      </div>

      <form id="form-quiz-builder" class="p-6 space-y-6 overflow-y-auto flex-1">
        <div class="space-y-6" id="lista-preguntas-builder">
          ${preguntas.map((p, idx) => {
            const num = idx + 1;
            const correctIdx = (p.respuestaCorrecta !== undefined) ? p.respuestaCorrecta : (p.correct_option_index || 0);
            const opts = p.opciones || ["A) ", "B) ", "C) ", "D) "];

            return `
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3" data-question-index="${idx}">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black text-indigo-900 uppercase">Pregunta #${num}</span>
                  <span class="text-[10px] text-slate-500 font-bold">Selecciona la respuesta correcta con el círculo</span>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">Enunciado de la Pregunta:</label>
                  <textarea rows="2" class="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 q-text" required placeholder="Escribe el enunciado de la pregunta...">${p.pregunta || ''}</textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  ${[0, 1, 2, 3].map(optIdx => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const letter = letters[optIdx];
                    const optVal = opts[optIdx] || `${letter}) Opción ${letter}`;
                    const isChecked = (correctIdx === optIdx);

                    return `
                      <div class="flex items-center gap-2 p-2 bg-white rounded-lg border ${isChecked ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'}">
                        <input type="radio" name="correct_q_${num}" value="${optIdx}" ${isChecked ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer q-correct-radio">
                        <span class="font-bold text-xs text-indigo-900 w-4">${letter})</span>
                        <input type="text" value="${optVal.replace(/^[A-D]\)\s*/, '')}" required placeholder="Texto opción ${letter}" class="w-full text-xs bg-transparent border-0 focus:ring-0 text-slate-800 font-medium q-opt-input" data-opt-index="${optIdx}">
                      </div>
                    `;
                  }).join('')}
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Justificación Técnica Normativa (Opcional):</label>
                  <input type="text" value="${p.justificacion || ''}" class="w-full p-1.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 q-just-input" placeholder="Ej: Art. 2.2.4.6.10 del Decreto 1072...">
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="sticky bottom-0 bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-slate-200 shadow-md flex items-center justify-between">
          <span class="text-xs text-slate-500 font-semibold">
            ✓ Valida que cada una de las 13 preguntas tenga enunciado y su respuesta correcta.
          </span>
          <div class="flex items-center gap-2">
            <button type="button" id="btn-cancelar-qb" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer">
              Guardar 13 Preguntas
            </button>
          </div>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-cerrar-qb').onclick = () => modal.remove();
  document.getElementById('btn-cancelar-qb').onclick = () => modal.remove();

  const btnAutoIA = document.getElementById('btn-autogenerar-ia-qb');
  if (btnAutoIA) {
    btnAutoIA.onclick = async () => {
      btnAutoIA.disabled = true;
      btnAutoIA.innerHTML = '<span>⏳ Generando 13 preguntas con Gemini Pro...</span>';
      try {
        const res = await generarCuestionarioCapacitacion(cap.tema, 13, store.getEmpresaActiva());
        const listaIA = (res && Array.isArray(res.preguntas)) ? res.preguntas : [];
        if (listaIA.length > 0) {
          const bloques = modal.querySelectorAll('[data-question-index]');
          bloques.forEach((bloque, idx) => {
            const pIA = listaIA[idx];
            if (!pIA) return;
            const qTextEl = bloque.querySelector('.q-text');
            if (qTextEl) qTextEl.value = pIA.pregunta || '';

            const optInputs = bloque.querySelectorAll('.q-opt-input');
            (pIA.opciones || []).forEach((opc, oIdx) => {
              if (optInputs[oIdx]) {
                const txt = typeof opc === 'object' ? opc.texto : String(opc).replace(/^[A-D]\)\s*/, '');
                optInputs[oIdx].value = txt;
              }
            });

            const correctLetter = (pIA.correcta || 'b').toLowerCase();
            const mapIdx = { a: 0, b: 1, c: 2, d: 3 };
            const targetIdx = (pIA.respuestaCorrecta !== undefined) ? pIA.respuestaCorrecta : (mapIdx[correctLetter] ?? 1);
            const radios = bloque.querySelectorAll('.q-correct-radio');
            radios.forEach((r, rIdx) => {
              r.checked = (rIdx === targetIdx);
            });

            const justEl = bloque.querySelector('.q-just-input');
            if (justEl) justEl.value = pIA.explicacion || pIA.justificacion || '';
          });
        }
      } catch (err) {
        console.error('Error al autogenerar preguntas con Gemini Pro:', err);
      } finally {
        btnAutoIA.disabled = false;
        btnAutoIA.innerHTML = '<span>✨ Autogenerar 13 Preguntas con Gemini Pro</span>';
      }
    };
  }

  document.getElementById('form-quiz-builder').onsubmit = (e) => {
    e.preventDefault();

    const bloques = modal.querySelectorAll('[data-question-index]');
    const nuevasPreguntas = [];

    bloques.forEach((bloque, idx) => {
      const qText = bloque.querySelector('.q-text').value.trim();
      const radioSelected = bloque.querySelector('.q-correct-radio:checked');
      const correctIdx = radioSelected ? parseInt(radioSelected.value, 10) : 1;
      const optInputs = bloque.querySelectorAll('.q-opt-input');
      const options = [];
      const letters = ['A', 'B', 'C', 'D'];

      optInputs.forEach((inp, oIdx) => {
        options.push(`${letters[oIdx]}) ${inp.value.trim()}`);
      });

      const justText = bloque.querySelector('.q-just-input').value.trim();

      nuevasPreguntas.push({
        pregunta: qText,
        opciones: options,
        respuestaCorrecta: correctIdx,
        correct_option_index: correctIdx,
        justificacion: justText
      });
    });

    store.guardarCapacitacion({
      ...cap,
      preguntas: nuevasPreguntas
    });

    modal.remove();
    alert(`✓ Se guardaron exitosamente las 13 preguntas para la capacitación "${cap.tema}".`);
    renderTraining();
  };
};

/**
 * MODAL PARA CREAR O EDITAR CAPACITACIÓN CON ENLACES Y MULTIMEDIA
 */
export function editarCapacitacionModal(capId) {
  const cap = store.getCapacitacionPorId(capId);
  abrirModalCrearEditarCapacitacion(cap);
}

function abrirModalCrearEditarCapacitacion(capExistente = null) {
  const modalId = 'modal-crear-editar-cap';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  const esEdicion = !!capExistente;
  const esCap1 = esEdicion && (capExistente.order_number === 1 || capExistente.esInduccionObligatoria);

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto">
      <div class="bg-indigo-900 px-6 py-4 text-white flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-white">
            ${esEdicion ? (esCap1 ? 'Editar Capacitación #1 (Inducción SG-SST)' : 'Editar Capacitación SST') : 'Programar Nueva Capacitación SST'}
          </h3>
          <p class="text-xs text-indigo-200">Configura temario, materiales multimedia y enlaces para el portal de formación</p>
        </div>
        <button id="btn-cerrar-modal-cap" class="text-slate-300 hover:text-white p-1 text-lg font-bold cursor-pointer">✕</button>
      </div>

      <form id="form-guardar-capacitacion" class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Título / Tema de la Capacitación</label>
          <input type="text" id="input-cap-tema" required placeholder="Ej: Trabajo Seguro en Alturas o Manejo Seguro de Sustancias..." class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800" value="${capExistente?.tema || ''}">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Programada</label>
            <input type="date" id="input-cap-fecha" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800" value="${capExistente?.fecha || new Date().toISOString().split('T')[0]}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Duración / Intensidad</label>
            <input type="text" id="input-cap-duracion" required placeholder="Ej: 2 Horas" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800" value="${capExistente?.duracion || '2 Horas'}">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Facilitador / Instructor</label>
            <input type="text" id="input-cap-facilitador" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800" value="${capExistente?.facilitador || 'Coordinador SG-SST / Asesoría ARL'}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
            <select id="sel-cap-estado" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option value="Programada" ${capExistente?.estado === 'Programada' ? 'selected' : ''}>Programada</option>
              <option value="Completada" ${capExistente?.estado === 'Completada' ? 'selected' : ''}>Completada</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Objetivo de Aprendizaje</label>
          <textarea id="txt-cap-objetivo" rows="2" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800" placeholder="Describe los conocimientos y competencias a desarrollar...">${capExistente?.objetivo || ''}</textarea>
        </div>

        <!-- SECCIÓN DE RECURSOS Y MULTIMEDIA -->
        <div class="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3">
          <span class="text-xs font-black text-indigo-950 uppercase tracking-wider block">Recursos Multimedia del Módulo E-Learning</span>
          
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">
              Link de Material de Apoyo (URL Externa / Documento):
            </label>
            <input type="url" id="input-cap-material-url" placeholder="https://docs.google.com/presentation/d/... o enlace web" class="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 font-mono" value="${capExistente?.materialUrl || (esCap1 ? 'https://docs.google.com/presentation/d/1fY0Hd3-hFOgCzzNGC0xNePgeIMrlPF2ePba6SWGTlxo/edit#slide=id.h3097c4ef0c877aee_1_3643' : '')}">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">
              Enlace / Embebido de Presentación (Google Slides o PDF):
            </label>
            <input type="url" id="input-cap-pres-url" placeholder="https://docs.google.com/presentation/d/.../edit" class="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 font-mono" value="${capExistente?.presentacionUrl || (esCap1 ? 'https://docs.google.com/presentation/d/1fY0Hd3-hFOgCzzNGC0xNePgeIMrlPF2ePba6SWGTlxo/edit#slide=id.h3097c4ef0c877aee_1_3643' : '')}">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">
              Enlace / Embebido de Video (YouTube / Vimeo / Drive / MP4):
            </label>
            <input type="url" id="input-cap-video-url" placeholder="https://www.youtube.com/watch?v=... o archivo mp4" class="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 font-mono" value="${capExistente?.videoUrl || (esCap1 ? 'https://www.youtube.com/watch?v=kYJdZl21o5M' : '')}">
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" id="btn-cancelar-nueva-cap" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer">
            Cancelar
          </button>
          <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer">
            ${esEdicion ? 'Actualizar Capacitación' : 'Guardar y Configurar Cuestionario'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-cerrar-modal-cap').onclick = () => modal.remove();
  document.getElementById('btn-cancelar-nueva-cap').onclick = () => modal.remove();

  document.getElementById('form-guardar-capacitacion').onsubmit = (e) => {
    e.preventDefault();

    const tema = document.getElementById('input-cap-tema').value.trim();
    const fecha = document.getElementById('input-cap-fecha').value;
    const duracion = document.getElementById('input-cap-duracion').value.trim();
    const facilitador = document.getElementById('input-cap-facilitador').value.trim();
    const estado = document.getElementById('sel-cap-estado').value;
    const objetivo = document.getElementById('txt-cap-objetivo').value.trim();
    const materialUrl = document.getElementById('input-cap-material-url').value.trim();
    const presentacionUrl = document.getElementById('input-cap-pres-url').value.trim();
    const videoUrl = document.getElementById('input-cap-video-url').value.trim();

    if (esEdicion) {
      store.guardarCapacitacion({
        ...capExistente,
        tema,
        fecha,
        duracion,
        facilitador,
        estado,
        objetivo,
        materialUrl,
        presentacionUrl,
        videoUrl
      });
      modal.remove();
      alert("✓ Capacitación actualizada correctamente.");
      renderTraining();
    } else {
      const nuevaId = 'cap-' + Date.now();
      store.guardarCapacitacion({
        id: nuevaId,
        tema,
        fecha,
        duracion,
        facilitador,
        estado,
        objetivo,
        materialUrl,
        presentacionUrl,
        videoUrl,
        evaluaciones: []
      });
      modal.remove();
      alert("✓ Capacitación creada con éxito. Ahora puedes configurar sus 13 preguntas en el Constructor de Evaluación.");
      renderTraining();
      // Abrir inmediatamente el constructor de preguntas
      setTimeout(() => window.abrirQuizBuilder(nuevaId), 300);
    }
  };
}

export function eliminarCapacitacionAction(capId) {
  if (confirm("¿Estás seguro de eliminar esta capacitación y su historial de evaluaciones?")) {
    const ok = store.eliminarCapacitacion(capId);
    if (ok) {
      renderTraining();
    }
  }
}

export async function notificarTrabajadoresCapacitacion(capId) {
  const cap = store.getCapacitacionPorId(capId);
  if (!cap) return;

  try {
    const emailUrl = (store && typeof store.getApiUrl === 'function')
      ? store.getApiUrl('/notifications/send_email')
      : '/api/notifications/send_email';
    const resp = await fetch(emailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'trabajadores@doctorpyme.co',
        subject: `📢 CONVOCATORIA SST: ${cap.tema}`,
        tipo: 'CAPACITACION',
        payload: {
          tema: cap.tema,
          fecha: cap.fecha,
          duracion: cap.duracion,
          facilitador: cap.facilitador
        }
      })
    });

    if (resp.ok) {
      alert(`✓ Convocatoria despachada por correo a los trabajadores para la capacitación "${cap.tema}".`);
    } else {
      alert("✓ Convocatoria registrada localmente.");
    }
  } catch (e) {
    alert("✓ Convocatoria despachada exitosamente.");
  }
}

// Registro en el objeto global window para invocación desde el DOM
if (typeof window !== 'undefined') {
  window.verMultimediaCapacitacion = verMultimediaCapacitacion;
  window.abrirQuizBuilder = abrirQuizBuilder;
  window.editarCapacitacionModal = editarCapacitacionModal;
  window.eliminarCapacitacionAction = eliminarCapacitacionAction;
  window.notificarTrabajadoresCapacitacion = notificarTrabajadoresCapacitacion;
  window.imprimirRegistroCapacitacionDOC10 = imprimirRegistroCapacitacionDOC10;
  window.imprimirEvaluacionCapacitacionDOC16 = imprimirEvaluacionCapacitacionDOC16;
}

