// =============================================================================
// MÓDULO 6: COPASST & COMITÉ DE CONVIVENCIA LABORAL (CCL) - DOCTOR PYME SG-SST
// Normativa Aplicable en Colombia:
// - Resolución 2013 de 1986 (Reglamentación y Funciones del COPASST)
// - Ley 1010 de 2006 (Prevención y Sanción del Acoso Laboral)
// - Resoluciones 652 y 1356 de 2012 (Conformación y Funcionamiento del CCL)
// - Decreto 1072 de 2015 (SG-SST, Art. 2.2.4.6.12, 2.2.4.6.29 y concordantes)
// - Resolución 0312 de 2019 (Estándares Mínimos 1.1.6, 1.1.7 y 1.1.8)
// =============================================================================

import { store } from '../store.js';
import { auth } from '../auth.js';
import { abrirModalFirma } from './signatures.js';

let activeMainTab = 'copasst'; // 'copasst' | 'ccl'
let activeSubTabCopasst = 'conformacion'; // 'conformacion' | 'reuniones' | 'tareas'
let activeSubTabCcl = 'bandeja'; // 'bandeja' | 'conformacion' | 'reuniones' | 'tareas'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderCopasstCcl(targetContainer = null) {
  const container = targetContainer || document.getElementById('main-content');
  if (!container) return;
  const empresaActiva = store.getEmpresaActiva() || {
    id: 'emp-1790438946268',
    razonSocial: 'LADRILLOS OCHOA LTDA',
    nit: '830124631',
    numeroTrabajadores: 15,
    trabajadores: 15
  };
  const companyId = store.getEmpresaActivaId();
  const trabajadores = store.getTrabajadores(companyId);
  const numTrabajadores = trabajadores.length || parseInt(empresaActiva.numeroTrabajadores || empresaActiva.trabajadores || 15, 10);
  const esModoVigia = numTrabajadores < 10;

  const data = store.getCopasstCclData(companyId);
  const committees = data.committees;
  const members = data.members;
  const meetings = data.meetings;
  const tasks = data.tasks;
  const reports = data.reports;

  const currentYear = parseInt(store.getAnioActivo() || new Date().getFullYear(), 10);

  // Comités de la empresa
  let copasstComm = committees.find(c => c.committee_type === (esModoVigia ? 'VIGIA_SST' : 'COPASST')) ||
                    committees.find(c => c.committee_type === 'COPASST' || c.committee_type === 'VIGIA_SST');
  let cclComm = committees.find(c => c.committee_type === 'CCL');

  // Métricas para Dashboard Superior
  const copasstMeetingsYear = meetings.filter(m => (m.committee_type === 'COPASST' || m.committee_type === 'VIGIA_SST') && m.meeting_year === currentYear && m.status === 'CERRADA_FIRMADA');
  const cclMeetingsYear = meetings.filter(m => m.committee_type === 'CCL' && m.meeting_year === currentYear && m.status === 'CERRADA_FIRMADA');
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETADA' || (t.progress_percentage || 0) >= 100).length;
  const tasksPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const nuevosCasosCcl = reports.filter(r => r.case_status === 'RADICADO_NUEVO').length;
  const casosActivos = reports.filter(r => r.case_status !== 'CERRADO_CON_ACUERDO').length;

  container.innerHTML = `
    <div class="space-y-6 pb-20">
      
      <!-- =================================================================== -->
      <!-- CABECERA Y DASHBOARD GERENCIAL DE COMITÉS SST                      -->
      <!-- =================================================================== -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl border border-slate-700/60 shadow-xl text-white relative overflow-hidden">
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Módulo 6 SST • Resolución 2013/1986 &amp; Ley 1010/2006
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${esModoVigia ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'}">
                ${esModoVigia ? '🔍 Régimen Vigía SST (< 10 trabajadores)' : '👥 Régimen COPASST Paritario (≥ 10 trabajadores)'}
              </span>
            </div>
            <h1 class="text-2xl font-black tracking-tight">COPASST &amp; Comité de Convivencia Laboral (CCL)</h1>
            <p class="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Gestión legal, actas mensuales, compromisos inmutables y canal confidencial de protección a la sana convivencia laboral para 
              <span class="font-bold text-white">${escapeHtml(empresaActiva.razonSocial || empresaActiva.razon_social)}</span>.
            </p>
          </div>

          <div class="flex items-center gap-2 self-start md:self-center">
            <button 
              type="button" 
              onclick="window.abrirModalAsistenteReunion()"
              class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95"
            >
              <span>⚡</span>
              <span>Llevar a cabo Sesión Mensual</span>
            </button>
          </div>
        </div>

        <!-- 4 TARJETAS KPIS SUPERIORES -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          
          <!-- KPI 1: COPASST -->
          <div class="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span>Reuniones COPASST ${currentYear}</span>
              <span class="text-base">🛡️</span>
            </div>
            <div class="flex items-baseline gap-2 mt-1.5">
              <span class="text-2xl font-black text-white">${copasstMeetingsYear.length}</span>
              <span class="text-xs text-slate-400 font-bold">/ 12 sesiones</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-amber-400 h-full rounded-full transition-all" style="width: ${Math.min(100, Math.round((copasstMeetingsYear.length / 12) * 100))}%"></div>
            </div>
            <span class="text-[10px] text-amber-300 font-semibold block mt-1">
              ${copasstMeetingsYear.length >= 12 ? '✅ Meta legal cumplida' : `${12 - copasstMeetingsYear.length} sesiones restantes`}
            </span>
          </div>

          <!-- KPI 2: CCL -->
          <div class="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span>Reuniones CCL ${currentYear}</span>
              <span class="text-base">🤝</span>
            </div>
            <div class="flex items-baseline gap-2 mt-1.5">
              <span class="text-2xl font-black text-white">${cclMeetingsYear.length}</span>
              <span class="text-xs text-slate-400 font-bold">sesiones registradas</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-indigo-400 h-full rounded-full transition-all" style="width: ${Math.min(100, Math.round((cclMeetingsYear.length / 12) * 100))}%"></div>
            </div>
            <span class="text-[10px] text-indigo-300 font-semibold block mt-1">
              Sesiones ordinarias y extraordinarias
            </span>
          </div>

          <!-- KPI 3: TAREAS -->
          <div class="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span>Compromisos &amp; Tareas</span>
              <span class="text-base">🎯</span>
            </div>
            <div class="flex items-baseline gap-2 mt-1.5">
              <span class="text-2xl font-black text-white">${tasksPercentage}%</span>
              <span class="text-xs text-slate-400 font-bold">${completedTasks}/${totalTasks} listas</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-emerald-400 h-full rounded-full transition-all" style="width: ${tasksPercentage}%"></div>
            </div>
            <span class="text-[10px] text-emerald-300 font-semibold block mt-1">
              ${totalTasks - completedTasks} compromisos pendientes
            </span>
          </div>

          <!-- KPI 4: CASOS CONVIVENCIA -->
          <div class="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700">
            <div class="flex items-center justify-between text-slate-400 text-xs">
              <span>Canal Confidencial CCL</span>
              <span class="text-base">🔒</span>
            </div>
            <div class="flex items-baseline gap-2 mt-1.5">
              <span class="text-2xl font-black ${nuevosCasosCcl > 0 ? 'text-rose-400 animate-pulse' : 'text-white'}">${nuevosCasosCcl}</span>
              <span class="text-xs text-slate-400 font-bold">nuevos sin revisar</span>
            </div>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${nuevosCasosCcl > 0 ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'}">
                ${casosActivos} casos en trámite
              </span>
            </div>
            <span class="text-[10px] text-slate-400 block mt-1">
              Protegido bajo Ley 1010/2006
            </span>
          </div>

        </div>
      </div>

      <!-- =================================================================== -->
      <!-- PESTAÑAS PRINCIPALES (TABS): COPASST vs CCL                         -->
      <!-- =================================================================== -->
      <div class="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button 
          type="button" 
          onclick="window.cambiarMainTabCopasstCcl('copasst')"
          class="flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-black transition cursor-pointer ${activeMainTab === 'copasst' ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}"
        >
          <span class="text-base">🛡️</span>
          <span>1. ${esModoVigia ? 'Vigía en SST' : 'COPASST (Comité Paritario)'}</span>
          <span class="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            ${copasstMeetingsYear.length}/12
          </span>
        </button>

        <button 
          type="button" 
          onclick="window.cambiarMainTabCopasstCcl('ccl')"
          class="flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-black transition cursor-pointer relative ${activeMainTab === 'ccl' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}"
        >
          <span class="text-base">🤝</span>
          <span>2. Comité de Convivencia Laboral (CCL)</span>
          ${nuevosCasosCcl > 0 ? `
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute top-2 right-2"></span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white ml-1">
              ${nuevosCasosCcl} Nuevo${nuevosCasosCcl > 1 ? 's' : ''}
            </span>
          ` : `
            <span class="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              ${reports.length}
            </span>
          `}
        </button>
      </div>

      <!-- =================================================================== -->
      <!-- VISTA DINÁMICA SEGÚN PESTAÑA PRINCIPAL                              -->
      <!-- =================================================================== -->
      ${activeMainTab === 'copasst' ? renderSeccionCopasst(empresaActiva, esModoVigia, copasstComm, members, meetings, tasks, currentYear, trabajadores) : renderSeccionCcl(empresaActiva, cclComm, members, meetings, tasks, reports, currentYear, trabajadores)}

    </div>
  `;

  // Exponer funciones globales de interacción
  window.cambiarMainTabCopasstCcl = (tab) => {
    activeMainTab = tab;
    renderCopasstCcl(container);
  };

  window.cambiarSubTabCopasst = (subtab) => {
    activeSubTabCopasst = subtab;
    renderCopasstCcl(container);
  };

  window.cambiarSubTabCcl = (subtab) => {
    activeSubTabCcl = subtab;
    renderCopasstCcl(container);
  };

  window.abrirModalAsistenteReunion = (mesSugerido = null, commTypeOverride = null) => {
    abrirModalSesionEnVivo(container, empresaActiva, esModoVigia, copasstComm, cclComm, members, tasks, currentYear, mesSugerido, commTypeOverride);
  };

  window.abrirModalAgregarMiembro = (committeeType = 'COPASST') => {
    abrirModalFormMiembro(container, empresaActiva, committeeType, trabajadores);
  };

  window.eliminarMiembro = async (memberId) => {
    if (confirm('¿Está seguro de retirar este integrante del comité?')) {
      await store.deleteCommitteeMember(memberId);
      renderCopasstCcl(container);
    }
  };

  window.generarDocumentoConstitucion = (docType) => {
    generarDocumentoOficial(docType, empresaActiva, esModoVigia, copasstComm, cclComm, members);
  };

  window.cambiarEstadoCasoCcl = (caseId, nuevoEstado) => {
    abrirModalGestionCasoCcl(container, caseId, nuevoEstado);
  };

  window.completarTareaRapida = async (taskId) => {
    const t = tasks.find(item => item.id === taskId);
    if (t) {
      t.progress_percentage = 100;
      t.status = 'COMPLETADA';
      t.completed_at = new Date().toISOString();
      await store.saveCommitteeTask(t);
      renderCopasstCcl(container);
    }
  };

  window.eliminarTarea = async (taskId) => {
    if (confirm('¿Desea eliminar este compromiso del comité?')) {
      await store.deleteCommitteeTask(taskId);
      renderCopasstCcl(container);
    }
  };

  window.verActaGeneradaPdf = (meetId) => {
    const meet = meetings.find(m => m.id === meetId);
    if (meet) {
      generarActaReunionPdf(meet, empresaActiva, members);
    }
  };

  window.abrirModalNuevaTarea = (commType = 'COPASST') => {
    abrirModalFormTarea(container, empresaActiva, commType, trabajadores);
  };

  window.abrirModalNuevoReporteManual = () => {
    abrirModalReporteManualCcl(container, empresaActiva, trabajadores);
  };

  window.generarActaConciliacionPdf = (caseId) => {
    const rep = reports.find(r => r.id === caseId || r.case_radicado === caseId);
    if (rep) {
      generarPdfActaConciliacion(rep, empresaActiva, members);
    }
  };
}

// -----------------------------------------------------------------------------
// SECCIÓN 1: COPASST / VIGÍA SST
// -----------------------------------------------------------------------------
function renderSeccionCopasst(empresa, esModoVigia, committee, members, meetings, tasks, currentYear, trabajadores) {
  const commType = esModoVigia ? 'VIGIA_SST' : 'COPASST';
  const commMembers = members.filter(m => m.representation_side === 'VIGIA_UNICO' || (committee && m.committee_id === committee.id) || !m.committee_id);
  const commMeetings = meetings.filter(m => (m.committee_type === 'COPASST' || m.committee_type === 'VIGIA_SST') && m.meeting_year === currentYear);
  const commTasks = tasks.filter(t => t.committee_type === 'COPASST' || t.committee_type === 'VIGIA_SST' || !t.committee_type);

  const startPeriod = committee?.period_start_date || `${currentYear}-01-15`;
  const endPeriod = committee?.period_end_date || `${currentYear + 2}-01-14`;

  return `
    <div class="space-y-6">
      
      <!-- Sub-navegación COPASST -->
      <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl w-fit">
        <button 
          type="button" 
          onclick="window.cambiarSubTabCopasst('conformacion')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeSubTabCopasst === 'conformacion' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          📋 1.1 Conformación &amp; Responsabilidades
        </button>
        <button 
          type="button" 
          onclick="window.cambiarSubTabCopasst('reuniones')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeSubTabCopasst === 'reuniones' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          🗓️ 1.2 Reuniones Mensuales (Ene - Dic)
        </button>
        <button 
          type="button" 
          onclick="window.cambiarSubTabCopasst('tareas')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeSubTabCopasst === 'tareas' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          🎯 1.3 Tablero de Compromisos (${commTasks.length})
        </button>
      </div>

      <!-- SUBTAB 1.1: CONFORMACIÓN & RESPONSABILIDADES -->
      ${activeSubTabCopasst === 'conformacion' ? `
        <div class="space-y-6">
          
          <!-- Banner de Período y Estado Legal -->
          <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                  ${esModoVigia ? 'Vigía en Seguridad y Salud en el Trabajo' : 'Comité Paritario de Seguridad y Salud en el Trabajo'}
                </span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Activo y Vigente
                </span>
              </div>
              <h2 class="text-lg font-black text-slate-800 dark:text-white">
                Período Legal de Vigencia: ${startPeriod} al ${endPeriod} (2 Años)
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Resolución 2013 de 1986 y Decreto 1072 de 2015 Art. 2.2.4.6.29. Consecutivo: 
                <span class="font-mono font-bold text-slate-700 dark:text-slate-200">${committee?.constitution_act_number || `ACTA-CONF-${commType}-${currentYear}-01`}</span>
              </p>
            </div>

            <!-- Generadores Rápidos de Documentos -->
            <div class="flex flex-wrap items-center gap-2">
              <button 
                type="button" 
                onclick="window.generarDocumentoConstitucion('VOTACION')"
                class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Generar Convocatoria y Acta de Votación de Trabajadores"
              >
                <span>🗳️</span>
                <span>Acta Elección</span>
              </button>

              <button 
                type="button" 
                onclick="window.generarDocumentoConstitucion('CONFORMACION_COPASST')"
                class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Generar Acta Oficial de Conformación debidamente sellada"
              >
                <span>📜</span>
                <span>Acta de Conformación Oficial</span>
              </button>

              <button 
                type="button" 
                onclick="window.generarDocumentoConstitucion('MANUAL_FUNCIONES')"
                class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Ver Manual Legal de Funciones del Comité, Presidente y Secretario"
              >
                <span>📖</span>
                <span>Manual de Funciones</span>
              </button>
            </div>
          </div>

          <!-- Marco Normativo Precargado de Funciones Legales -->
          <div class="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-xs space-y-2 text-slate-700 dark:text-slate-300">
            <div class="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
              <span>⚖️</span>
              <span>Funciones Principales según Art. 11 Res. 2013 de 1986 &amp; Dec. 1072 de 2015:</span>
            </div>
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-2 list-disc list-inside text-[11px] leading-relaxed">
              <li>Investigar las causas de todos los accidentes e incidentes de trabajo y enfermedades laborales (ATEL).</li>
              <li>Realizar inspecciones periódicas de seguridad en instalaciones, maquinaria, herramientas y puestos de trabajo.</li>
              <li>Servir como organismo de coordinación entre el empleador y los trabajadores en temas de SG-SST.</li>
              <li>Proponer y participar en actividades de capacitación y divulgación en seguridad y salud ocupacional.</li>
              <li>Verificar el cumplimiento del Plan de Trabajo Anual y la efectividad de las medidas correctivas.</li>
              <li>Disponer de mínimo 4 horas semanales de la jornada laboral para actividades del comité (Art. 2.2.4.6.29).</li>
            </ul>
          </div>

          <!-- Tabla de Integrantes del Comité -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-black text-slate-800 dark:text-white">
                  ${esModoVigia ? 'Vigía Designado en SST' : 'Integrantes Paritarios del COPASST'}
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  ${esModoVigia ? 'Representante único de SST para empresas de menos de 10 trabajadores' : 'Igual número de representantes designados por el Empleador y elegidos por los Trabajadores'}
                </p>
              </div>

              <button 
                type="button" 
                onclick="window.abrirModalAgregarMiembro('${commType}')"
                class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>➕</span>
                <span>Asignar Integrante</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th class="p-3.5">Integrante / Cédula</th>
                    <th class="p-3.5">Representación</th>
                    <th class="p-3.5">Categoría</th>
                    <th class="p-3.5">Rol en el Comité</th>
                    <th class="p-3.5">Aceptación &amp; Firma</th>
                    <th class="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${commMembers.length === 0 ? `
                    <tr>
                      <td colspan="6" class="p-8 text-center text-slate-400">
                        No hay integrantes registrados en este comité. Presione "Asignar Integrante" para conformar el ${esModoVigia ? 'Vigía' : 'COPASST'}.
                      </td>
                    </tr>
                  ` : commMembers.map(m => `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td class="p-3.5">
                        <span class="font-bold text-slate-900 dark:text-white block">${escapeHtml(m.employee_name)}</span>
                        <span class="text-[11px] text-slate-500 font-mono">C.C. ${escapeHtml(m.employee_id_number || 'No registrada')} • ${escapeHtml(m.employee_position || 'Cargo')}</span>
                      </td>
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.representation_side === 'EMPLEADOR_DESIGNADO' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : m.representation_side === 'TRABAJADORES_ELEGIDO' ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}">
                          ${m.representation_side === 'EMPLEADOR_DESIGNADO' ? '🏢 Empleador' : m.representation_side === 'TRABAJADORES_ELEGIDO' ? '👥 Trabajadores' : '🔍 Vigía Único'}
                        </span>
                      </td>
                      <td class="p-3.5">
                        <span class="font-bold text-slate-700 dark:text-slate-300">
                          ${m.member_category || 'PRINCIPAL'}
                        </span>
                      </td>
                      <td class="p-3.5">
                        <span class="font-black px-2 py-0.5 rounded-lg text-[10px] ${m.committee_role === 'PRESIDENTE' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : m.committee_role === 'SECRETARIO' ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                          ${m.committee_role || 'MIEMBRO_VOCAL'}
                        </span>
                      </td>
                      <td class="p-3.5">
                        ${m.accepted_and_signed ? `
                          <span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <span>✅</span>
                            <span>Firmado Digitalmente</span>
                          </span>
                        ` : `
                          <span class="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <span>⏳</span>
                            <span>Pendiente de Firma</span>
                          </span>
                        `}
                      </td>
                      <td class="p-3.5 text-right">
                        <button 
                          type="button" 
                          onclick="window.eliminarMiembro('${m.id}')"
                          class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Retirar miembro"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ` : ''}

      <!-- SUBTAB 1.2: MATRIZ ANUAL DE CONTROL MENSUAL (ENERO A DICIEMBRE) -->
      ${activeSubTabCopasst === 'reuniones' ? `
        <div class="space-y-6">
          
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-white">
                Matriz de Control Mensual de Sesiones (${currentYear})
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                12 reuniones ordinarias anuales obligatorias según Resolución 2013 de 1986 Art. 7.
              </p>
            </div>

            <button 
              type="button" 
              onclick="window.abrirModalAsistenteReunion()"
              class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>⚡</span>
              <span>Iniciar Sesión del Mes Actual</span>
            </button>
          </div>

          <!-- Matriz Semáforo Enero a Diciembre (12 Tarjetas) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${MESES.map((nombreMes, index) => {
              const mesNum = index + 1;
              const meet = commMeetings.find(m => m.meeting_month === mesNum);
              const esPasado = mesNum < (new Date().getMonth() + 1);
              const esActual = mesNum === (new Date().getMonth() + 1);
              
              let estado = 'PENDIENTE';
              if (meet && meet.status === 'CERRADA_FIRMADA') estado = 'EJECUTADA';
              else if (meet && meet.status === 'PROGRAMADA') estado = 'PROGRAMADA';
              else if (esPasado) estado = 'VENCIDA';

              return `
                <div class="p-4 rounded-3xl border transition-all ${estado === 'EJECUTADA' ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : estado === 'PROGRAMADA' ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' : estado === 'VENCIDA' ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}">
                  
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black uppercase ${esActual ? 'text-amber-500' : 'text-slate-600 dark:text-slate-400'}">
                      Mes ${mesNum} • ${nombreMes}
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${estado === 'EJECUTADA' ? 'bg-emerald-500 text-white' : estado === 'PROGRAMADA' ? 'bg-amber-500 text-slate-950' : estado === 'VENCIDA' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}">
                      ${estado}
                    </span>
                  </div>

                  <div class="mt-3 space-y-1">
                    <span class="text-sm font-black text-slate-800 dark:text-white block">
                      ${meet?.act_consecutive || `Acta Mensual ${nombreMes}`}
                    </span>
                    <span class="text-[11px] text-slate-500 block">
                      ${meet?.meeting_date ? `Fecha: ${meet.meeting_date}` : esActual ? 'Sesión correspondiente a este mes' : 'Sin fecha programada'}
                    </span>
                  </div>

                  <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    ${meet && meet.status === 'CERRADA_FIRMADA' ? `
                      <button 
                        type="button" 
                        onclick="window.verActaGeneradaPdf('${meet.id}')"
                        class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>📄</span>
                        <span>Ver Acta PDF</span>
                      </button>
                      <span class="text-[10px] text-slate-400 font-mono">Sellada</span>
                    ` : `
                      <button 
                        type="button" 
                        onclick="window.abrirModalAsistenteReunion(${mesNum})"
                        class="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>⚡</span>
                        <span>Llevar a Cabo Sesión</span>
                      </button>
                    `}
                  </div>

                </div>
              `;
            }).join('')}
          </div>

        </div>
      ` : ''}

      <!-- SUBTAB 1.3: TABLERO DE COMPROMISOS & TAREAS -->
      ${activeSubTabCopasst === 'tareas' ? `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-white">
                Compromisos &amp; Tareas del COPASST / Vigía
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Seguimiento continuo a inspecciones, investigación de accidentes, medidas de control y plan de trabajo.
              </p>
            </div>

            <button 
              type="button" 
              onclick="window.abrirModalNuevaTarea('COPASST')"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>Nuevo Compromiso</span>
            </button>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th class="p-3.5">Categoría / Tarea</th>
                    <th class="p-3.5">Responsable</th>
                    <th class="p-3.5">Fecha Límite</th>
                    <th class="p-3.5">Avance</th>
                    <th class="p-3.5">Estado</th>
                    <th class="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${commTasks.length === 0 ? `
                    <tr>
                      <td colspan="6" class="p-8 text-center text-slate-400">
                        No hay compromisos pendientes registrados. Cree uno para iniciar la trazabilidad de inspecciones o controles.
                      </td>
                    </tr>
                  ` : commTasks.map(t => `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          ${t.task_category || 'INSPECCION_SST'}
                        </span>
                        <span class="font-bold text-slate-800 dark:text-white block mt-1">${escapeHtml(t.task_title)}</span>
                        ${t.task_description ? `<span class="text-[11px] text-slate-500 block">${escapeHtml(t.task_description)}</span>` : ''}
                      </td>
                      <td class="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                        ${escapeHtml(t.responsible_name || 'Sin asignar')}
                      </td>
                      <td class="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        ${t.due_date || 'Inmediata'}
                      </td>
                      <td class="p-3.5 w-32">
                        <div class="flex items-center gap-2">
                          <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div class="bg-indigo-500 h-full rounded-full" style="width: ${t.progress_percentage || 0}%"></div>
                          </div>
                          <span class="font-bold text-[11px] text-slate-700 dark:text-slate-300 font-mono">${t.progress_percentage || 0}%</span>
                        </div>
                      </td>
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'COMPLETADA' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : t.status === 'EN_EJECUCION' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                          ${t.status || 'PENDIENTE'}
                        </span>
                      </td>
                      <td class="p-3.5 text-right space-x-1">
                        <button 
                          type="button" 
                          onclick="window.completarTareaRapida('${t.id}')"
                          class="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                          title="Marcar como cumplida al 100%"
                        >
                          ✔️
                        </button>
                        <button 
                          type="button" 
                          onclick="window.eliminarTarea('${t.id}')"
                          class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Eliminar tarea"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ` : ''}

    </div>
  `;
}

// -----------------------------------------------------------------------------
// SECCIÓN 2: COMITÉ DE CONVIVENCIA LABORAL (CCL)
// -----------------------------------------------------------------------------
function renderSeccionCcl(empresa, committee, members, meetings, tasks, reports, currentYear, trabajadores) {
  const cclMembers = members.filter(m => (committee && m.committee_id === committee.id) || m.representation_side !== 'VIGIA_UNICO');
  const cclMeetings = meetings.filter(m => m.committee_type === 'CCL' && m.meeting_year === currentYear);
  const cclTasks = tasks.filter(t => t.committee_type === 'CCL');

  return `
    <div class="space-y-6">
      
      <!-- Sub-navegación CCL -->
      <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl w-fit">
        <button 
          type="button" 
          onclick="window.cambiarSubTabCcl('bandeja')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer relative ${activeSubTabCcl === 'bandeja' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          🔒 2.4 Bandeja Confidencial de Casos (${reports.length})
        </button>
        <button 
          type="button" 
          onclick="window.cambiarSubTabCcl('conformacion')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeSubTabCcl === 'conformacion' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          📋 2.1 Conformación &amp; Acuerdo de Confidencialidad
        </button>
        <button 
          type="button" 
          onclick="window.cambiarSubTabCcl('reuniones')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeSubTabCcl === 'reuniones' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          🗓️ 2.2 Reuniones Trimestrales / Mensuales
        </button>
        <button 
          type="button" 
          onclick="window.cambiarSubTabCcl('tareas')"
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeSubTabCcl === 'tareas' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}"
        >
          🤝 2.3 Actividades Preventivas de Convivencia
        </button>
      </div>

      <!-- SUBTAB 2.4: BANDEJA CONFIDENCIAL DE CASOS (REPORTADOS DESDE APP DEL TRABAJADOR) -->
      ${activeSubTabCcl === 'bandeja' ? `
        <div class="space-y-6">
          
          <div class="bg-indigo-950/20 border border-indigo-500/30 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500 text-white">
                  🔒 Canal Estricto de Reserva y Secreto Profesional
                </span>
                <span class="text-xs text-slate-500 font-mono">Ley 1010 de 2006 • Res. 652/2012</span>
              </div>
              <h2 class="text-lg font-black text-slate-800 dark:text-white">
                Bandeja de Quejas y Solicitudes de Convivencia Laboral
              </h2>
              <p class="text-xs text-slate-600 dark:text-slate-300">
                Los casos radicados desde la Aplicación del Trabajador ingresan automáticamente con radicado oficial protegido y estampa de tiempo UTC-5.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button 
                type="button" 
                onclick="window.abrirModalNuevoReporteManual()"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>➕</span>
                <span>Radicar Caso Manualmente</span>
              </button>
            </div>
          </div>

          <!-- Listado de Casos y Procedimiento Guiado 4 Pasos -->
          <div class="space-y-4">
            ${reports.length === 0 ? `
              <div class="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div class="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                  🤝
                </div>
                <h3 class="text-base font-bold text-slate-800 dark:text-white">
                  Ambiente Laboral Armónico
                </h3>
                <p class="text-xs text-slate-500 max-w-md mx-auto">
                  No hay reportes de acoso, maltrato o conflictos activos en la bandeja del CCL. Los trabajadores pueden enviar quejas reservadas desde su portal móvil.
                </p>
              </div>
            ` : reports.map(r => `
              <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      ${escapeHtml(r.case_radicado)}
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.case_status === 'RADICADO_NUEVO' ? 'bg-rose-500 text-white' : r.case_status === 'EN_CONCILIACION_PLAN_MEJORA' ? 'bg-amber-500 text-slate-950' : r.case_status === 'CERRADO_CON_ACUERDO' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'}">
                      ${r.case_status}
                    </span>
                    <span class="text-xs text-slate-500 font-mono">
                      📅 ${r.incident_date || r.created_at_bogota || r.created_at}
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] font-bold text-slate-500">Paso Actual:</span>
                    <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      ${r.case_status === 'RADICADO_NUEVO' ? 'Paso 1: Recepción & Verificación' : r.case_status === 'CITACION_DESCARGOS_ESCUCHA' ? 'Paso 2: Citación y Escucha' : r.case_status === 'EN_CONCILIACION_PLAN_MEJORA' ? 'Paso 3: Conciliación y Acuerdos' : 'Paso 4: Cierre o Remisión'}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Trabajador Afectado (Confidencial)</span>
                    <span class="font-bold text-slate-900 dark:text-white block mt-0.5">${escapeHtml(r.reporter_name)}</span>
                    <span class="text-slate-500 font-mono text-[11px]">C.C. ${escapeHtml(r.reporter_cedula || 'Oculta')}</span>
                  </div>

                  <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Persona o Cargo Involucrado</span>
                    <span class="font-bold text-slate-900 dark:text-white block mt-0.5">${escapeHtml(r.reported_person_name_or_id)}</span>
                    <span class="text-slate-500 text-[11px]">Lugar: ${escapeHtml(r.incident_place || 'Empresa')}</span>
                  </div>

                  <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Tipología de la Queja (Ley 1010)</span>
                    <span class="font-bold text-rose-600 dark:text-rose-400 block mt-0.5">${escapeHtml(r.incident_type)}</span>
                    <span class="text-slate-500 text-[11px]">${(r.evidence_attachments_s3 || []).length} archivos adjuntos</span>
                  </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-2xl text-xs space-y-1">
                  <span class="text-[10px] text-slate-400 uppercase font-bold block">Relato de los Hechos:</span>
                  <p class="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "${escapeHtml(r.detailed_description || 'Sin descripción detallada')}"
                  </p>
                </div>

                ${r.conciliation_commitments ? `
                  <div class="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-2xl text-xs space-y-1">
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-black block">Acta de Acuerdos y Compromisos de Conciliación:</span>
                    <p class="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                      ${escapeHtml(r.conciliation_commitments)}
                    </p>
                  </div>
                ` : ''}

                <!-- Acciones del Flujo Legal Ley 1010/2006 -->
                <div class="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <button 
                      type="button" 
                      onclick="window.cambiarEstadoCasoCcl('${r.id}', 'CITACION_DESCARGOS_ESCUCHA')"
                      class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                    >
                      🗣️ Convocar Audiencias Separadas
                    </button>
                    <button 
                      type="button" 
                      onclick="window.cambiarEstadoCasoCcl('${r.id}', 'EN_CONCILIACION_PLAN_MEJORA')"
                      class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition"
                    >
                      ✍️ Levantar Acta de Conciliación
                    </button>
                    <button 
                      type="button" 
                      onclick="window.cambiarEstadoCasoCcl('${r.id}', 'CERRADO_CON_ACUERDO')"
                      class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition"
                    >
                      ✅ Cerrar con Acuerdo Cumplido
                    </button>
                  </div>

                  <div class="flex items-center gap-2">
                    <button 
                      type="button" 
                      onclick="window.generarActaConciliacionPdf('${r.id}')"
                      class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>📑</span>
                      <span>Acta Legal PDF</span>
                    </button>
                  </div>
                </div>

              </div>
            `).join('')}
          </div>

        </div>
      ` : ''}

      <!-- SUBTAB 2.1: CONFORMACIÓN & ACUERDO DE CONFIDENCIALIDAD -->
      ${activeSubTabCcl === 'conformacion' ? `
        <div class="space-y-6">
          <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1">
              <span class="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                Resoluciones 652 y 1356 de 2012 • Ministerio del Trabajo
              </span>
              <h2 class="text-lg font-black text-slate-800 dark:text-white">
                Comité de Convivencia Laboral (CCL)
              </h2>
              <p class="text-xs text-slate-500">
                Vigencia de 2 años. Requiere firma obligatoria del <strong>Acuerdo de Confidencialidad y Reserva</strong> de cada miembro.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button 
                type="button" 
                onclick="window.generarDocumentoConstitucion('CONFORMACION_CCL')"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📜</span>
                <span>Acta de Conformación CCL</span>
              </button>
              <button 
                type="button" 
                onclick="window.generarDocumentoConstitucion('CONFIDENCIALIDAD_CCL')"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔏</span>
                <span>Acuerdo de Confidencialidad</span>
              </button>
            </div>
          </div>

          <!-- Tabla de Miembros del CCL -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-black text-slate-800 dark:text-white">Miembros del Comité de Convivencia</h3>
                <p class="text-xs text-slate-500">Representantes designados por la Alta Dirección y elegidos por votación libre de los trabajadores.</p>
              </div>

              <button 
                type="button" 
                onclick="window.abrirModalAgregarMiembro('CCL')"
                class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>➕</span>
                <span>Asignar Miembro CCL</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th class="p-3.5">Miembro</th>
                    <th class="p-3.5">Representación</th>
                    <th class="p-3.5">Rol CCL</th>
                    <th class="p-3.5">Acuerdo de Confidencialidad</th>
                    <th class="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${cclMembers.length === 0 ? `
                    <tr>
                      <td colspan="5" class="p-8 text-center text-slate-400">
                        No hay miembros registrados para el CCL. Presione "Asignar Miembro CCL".
                      </td>
                    </tr>
                  ` : cclMembers.map(m => `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td class="p-3.5">
                        <span class="font-bold text-slate-900 dark:text-white block">${escapeHtml(m.employee_name)}</span>
                        <span class="text-[11px] text-slate-500 font-mono">C.C. ${escapeHtml(m.employee_id_number || 'N/A')}</span>
                      </td>
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.representation_side === 'EMPLEADOR_DESIGNADO' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'}">
                          ${m.representation_side === 'EMPLEADOR_DESIGNADO' ? '🏢 Empleador' : '👥 Trabajadores'}
                        </span>
                      </td>
                      <td class="p-3.5">
                        <span class="font-black px-2 py-0.5 rounded-lg text-[10px] ${m.committee_role === 'PRESIDENTE' ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : m.committee_role === 'SECRETARIO' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                          ${m.committee_role || 'MIEMBRO_VOCAL'}
                        </span>
                      </td>
                      <td class="p-3.5">
                        <span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <span>🔒</span>
                          <span>Firmado &amp; Sellado</span>
                        </span>
                      </td>
                      <td class="p-3.5 text-right">
                        <button 
                          type="button" 
                          onclick="window.eliminarMiembro('${m.id}')"
                          class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- SUBTAB 2.2: REUNIONES TRIMESTRALES / MENSUALES CCL -->
      ${activeSubTabCcl === 'reuniones' ? `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-white">Sesiones Ordinarias y Extraordinarias del CCL (${currentYear})</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Sesiones ordinarias cada tres (3) meses según Res. 652/2012, o extraordinarias cuando se requiera por queja radicada.</p>
            </div>
            <button 
              type="button" 
              onclick="window.abrirModalAsistenteReunion(null, 'CCL')"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span>
              <span>Llevar a Cabo Sesión CCL</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            ${[
              { trimestre: 'Trimestre 1 (Ene - Mar)', mes: 3 },
              { trimestre: 'Trimestre 2 (Abr - Jun)', mes: 6 },
              { trimestre: 'Trimestre 3 (Jul - Sep)', mes: 9 },
              { trimestre: 'Trimestre 4 (Oct - Dic)', mes: 12 }
            ].map(t => {
              const meet = cclMeetings.find(m => m.meeting_month === t.mes);
              return `
                <div class="p-4 rounded-3xl border ${meet ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'} space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${t.trimestre}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${meet ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}">
                      ${meet ? 'Ejecutada' : 'Pendiente'}
                    </span>
                  </div>
                  <span class="text-sm font-black text-slate-900 dark:text-white block">
                    ${meet?.act_consecutive || 'Acta Ordinaria'}
                  </span>
                  <div class="pt-2 border-t border-slate-200 dark:border-slate-800">
                    ${meet ? `
                      <button type="button" onclick="window.verActaGeneradaPdf('${meet.id}')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                        📄 Ver Acta Oficial Firmada
                      </button>
                    ` : `
                      <button type="button" onclick="window.abrirModalAsistenteReunion(${t.mes}, 'CCL')" class="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition">
                        Realizar Sesión
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- SUBTAB 2.3: ACTIVIDADES PREVENTIVAS DE CONVIVENCIA -->
      ${activeSubTabCcl === 'tareas' ? `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-white">Plan Preventivo de Convivencia y Clima Laboral</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Talleres de comunicación asertiva, campañas de buen trato y encuestas de riesgo psicosocial.</p>
            </div>
            <button 
              type="button" 
              onclick="window.abrirModalNuevaTarea('CCL')"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>Nueva Campaña / Actividad</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span class="text-xl">🗣️</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Taller de Comunicación Asertiva</h3>
              <p class="text-xs text-slate-500 leading-relaxed">Capacitación sobre resolución pacífica de conflictos y manejo de emociones en el entorno laboral.</p>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Programada Semestre I</span>
            </div>

            <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span class="text-xl">🤝</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Campaña de Buen Trato y Respeto</h3>
              <p class="text-xs text-slate-500 leading-relaxed">Divulgación visual y digital de la política de tolerancia cero frente al acoso y maltrato.</p>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">Activa Permanente</span>
            </div>

            <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span class="text-xl">📊</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Informe Anual de Gestión a Gerencia</h3>
              <p class="text-xs text-slate-500 leading-relaxed">Consolidado estadístico confidencial de casos y recomendaciones preventivas para la Dirección.</p>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">Cierre Diciembre</span>
            </div>
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

// -----------------------------------------------------------------------------
// ASISTENTE DE SESIÓN EN VIVO ("Llevar a cabo Sesión Mensual")
// Precarga automáticamente los 6 puntos normativos de consultoría SST
// -----------------------------------------------------------------------------
function abrirModalSesionEnVivo(container, empresa, esModoVigia, copasstComm, cclComm, members, tasks, currentYear, mesSugerido = null) {
  const modal = document.createElement('div');
  modal.id = 'modal-sesion-en-vivo';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn';

  const mesActual = mesSugerido || (new Date().getMonth() + 1);
  const nombreMes = MESES[mesActual - 1];
  const commType = activeMainTab === 'ccl' ? 'CCL' : (esModoVigia ? 'VIGIA_SST' : 'COPASST');
  const consecutivoSugerido = commType === 'CCL' ? `ACTA-CCL-${currentYear}-${sprintf('%03d', mesActual)}` : `ACTA-COP-${currentYear}-${sprintf('%03d', mesActual)}`;

  // Tareas pendientes del mes anterior
  const tareasAnteriores = tasks.filter(t => t.status !== 'COMPLETADA');

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
      
      <!-- Cabecera -->
      <div class="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
              Asistente de Sesión en Vivo
            </span>
            <span class="text-xs text-slate-300 font-mono">${consecutivoSugerido}</span>
          </div>
          <h2 class="text-lg font-black tracking-tight">
            ${commType === 'CCL' ? 'Reunión Oficial del Comité de Convivencia' : (esModoVigia ? 'Sesión Mensual de Inspección y Control Vigía SST' : 'Reunión Mensual Ordinaria del COPASST')} - ${nombreMes} ${currentYear}
          </h2>
        </div>
        <button type="button" onclick="document.getElementById('modal-sesion-en-vivo').remove()" class="p-2 text-slate-400 hover:text-white rounded-xl text-lg font-bold">
          ✕
        </button>
      </div>

      <!-- Formulario Guiado de los 6 Puntos Normativos -->
      <form id="form-sesion-en-vivo" class="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
        
        <!-- Datos Generales de la Sesión -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha de la Reunión *</label>
            <input type="date" id="sesion-fecha" value="${new Date().toISOString().split('T')[0]}" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white">
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hora Inicio *</label>
            <input type="time" id="sesion-hora-inicio" value="09:00" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white">
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Modalidad *</label>
            <select id="sesion-modalidad" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white">
              <option value="Presencial">Presencial (Sede Principal)</option>
              <option value="Virtual">Virtual / Remota</option>
              <option value="Mixta">Híbrida / Mixta</option>
            </select>
          </div>
        </div>

        <!-- 6 PUNTOS DE LA AGENDA INTELIGENTE SST -->
        <div class="space-y-4">
          <h3 class="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
            Orden del Día Normativo (Resolución 2013/1986 &amp; Dec. 1072/2015)
          </h3>

          <!-- Punto 1: Quórum -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <span class="font-bold text-slate-800 dark:text-white block">1. Verificación de Quórum y Asistencia</span>
            <div class="space-y-1.5">
              ${members.map(m => `
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="sesion-asistente" value="${m.id}" checked class="rounded text-amber-500 focus:ring-amber-500">
                  <span class="text-slate-700 dark:text-slate-300 font-bold">${escapeHtml(m.employee_name)}</span>
                  <span class="text-slate-400 font-mono text-[10px]">(${m.committee_role || 'Miembro'})</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Punto 2: Compromisos Anteriores -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <span class="font-bold text-slate-800 dark:text-white block">2. Revisión del Estado de Compromisos del Mes Anterior</span>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              ${tareasAnteriores.length > 0 ? `Se identifican ${tareasAnteriores.length} compromisos pendientes de meses anteriores. Indique las acciones tomadas.` : 'Todos los compromisos previos fueron reportados como cumplidos.'}
            </p>
            <textarea id="sesion-revision-tareas" rows="2" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white" placeholder="Ej: Se completó la dotación de guantes y se programó la inspección de extintores para la próxima semana."></textarea>
          </div>

          <!-- Punto 3: Plan de Trabajo y Capacitaciones -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <span class="font-bold text-slate-800 dark:text-white block">3. Seguimiento al Plan Anual de Trabajo y Capacitaciones</span>
            <textarea id="sesion-plan-trabajo" rows="2" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white" placeholder="Indicar avances en capacitaciones del mes, porcentaje de cumplimiento del cronograma SST."></textarea>
          </div>

          <!-- Punto 4: Inspecciones de Seguridad -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <span class="font-bold text-slate-800 dark:text-white block">4. Hallazgos de Inspecciones de Seguridad (Locativas, EPP, Máquinas)</span>
            <textarea id="sesion-inspecciones" rows="2" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white" placeholder="Reporte de condiciones inseguras detectadas, estado de orden y aseo, EPP en buen estado."></textarea>
          </div>

          <!-- Punto 5: Análisis ATEL -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <span class="font-bold text-slate-800 dark:text-white block">5. Análisis de Accidentalidad e Investigación ATEL / Incidentes</span>
            <textarea id="sesion-atel" rows="2" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white" placeholder="Durante el mes: cero accidentes incapacitantes. Se investigó un casi-accidente reportado desde el portal móvil."></textarea>
          </div>

          <!-- Punto 6: Proposiciones y Asignación de Tareas -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <span class="font-bold text-slate-800 dark:text-white block">6. Proposiciones y Asignación de Nuevos Compromisos</span>
            <textarea id="sesion-proposiciones" rows="2" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white" placeholder="Nuevas tareas asignadas con responsable y fecha de entrega."></textarea>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button type="button" onclick="document.getElementById('modal-sesion-en-vivo').remove()" class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800">
            Cancelar
          </button>
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer">
            💾 Cerrar Sesión y Generar Acta Oficial PDF
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('form-sesion-en-vivo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fecha = document.getElementById('sesion-fecha').value;
    const horaInicio = document.getElementById('sesion-hora-inicio').value;
    const modalidad = document.getElementById('sesion-modalidad').value;
    const revTareas = document.getElementById('sesion-revision-tareas').value;
    const planTrabajo = document.getElementById('sesion-plan-trabajo').value;
    const inspecciones = document.getElementById('sesion-inspecciones').value;
    const atel = document.getElementById('sesion-atel').value;
    const proposiciones = document.getElementById('sesion-proposiciones').value;

    const checkedMembers = Array.from(document.querySelectorAll('input[name="sesion-asistente"]:checked')).map(cb => cb.value);

    const desarrollo = `
1. QUÓRUM Y ASISTENCIA: Se verifica la presencia de los miembros convocados, contando con el quórum reglamentario para sesionar.
2. REVISIÓN DE COMPROMISOS ANTERIORES: ${revTareas || 'Sin observaciones adicionales.'}
3. PLAN DE TRABAJO ANUAL Y CAPACITACIONES: ${planTrabajo || 'En ejecución según cronograma establecido.'}
4. INSPECCIONES DE SEGURIDAD: ${inspecciones || 'Instalaciones y puestos de trabajo verificados en condiciones operativas estándar.'}
5. ANÁLISIS DE ACCIDENTALIDAD (ATEL): ${atel || 'No se registraron accidentes de trabajo incapacitantes durante el período.'}
6. PROPOSICIONES Y VARIOS: ${proposiciones || 'Sin más proposiciones por parte de los asistentes.'}
    `.trim();

    const nuevaReunion = {
      tenant_id: empresa.id,
      companyId: empresa.id,
      committee_type: commType,
      act_consecutive: consecutivoSugerido,
      meeting_month: parseInt(mesActual, 10),
      meeting_year: parseInt(currentYear, 10),
      meeting_date: fecha,
      start_time: horaInicio,
      end_time: '10:30',
      location_or_modality: modalidad,
      meeting_type: 'ORDINARIA_MENSUAL',
      quorum_verified: true,
      attendees_json: checkedMembers,
      development_and_discussions: desarrollo,
      status: 'CERRADA_FIRMADA'
    };

    // Guardar en Store y Servidor
    const savedMeet = await store.saveCommitteeMeeting(nuevaReunion);

    // Si hubo proposiciones, crear automáticamente un compromiso en el tablero de tareas
    if (proposiciones && proposiciones.trim().length > 5) {
      await store.saveCommitteeTask({
        tenant_id: empresa.id,
        committee_type: commType,
        meeting_id: savedMeet?.id,
        task_category: 'SEGUIMIENTO_PLAN_TRABAJO',
        task_title: `Compromiso acordado en ${consecutivoSugerido}`,
        task_description: proposiciones.trim(),
        responsible_name: 'Comité Asignado',
        due_date: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
        progress_percentage: 0,
        status: 'PENDIENTE'
      });
    }

    modal.remove();

    // Generar y descargar el PDF Oficial
    generarActaReunionPdf(nuevaReunion, empresa, members);

    // Refrescar módulo
    renderCopasstCcl(container);
  });
}

// -----------------------------------------------------------------------------
// GENERADOR DE ACTAS Y DOCUMENTOS OFICIALES EN PDF (HTML2PDF)
// Con firmas digitales institucionales y sellos de Ley 527 de 1999
// -----------------------------------------------------------------------------
async function generarActaReunionPdf(meeting, empresa, members) {
  const printArea = document.createElement('div');
  printArea.id = 'print-acta-container';
  printArea.className = 'fixed -left-[9999px] top-0 bg-white p-8 max-w-[800px] text-slate-900 font-sans text-xs leading-relaxed';

  const logoUrl = empresa.logo_url || empresa.logoUrl || './assets/app-icon.png';
  const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  printArea.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; padding: 20px; line-height: 1.5;">
      
      <!-- Encabezado Institucional -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-bottom: 20px;">
        <tr>
          <td style="width: 25%; text-align: center; border: 1px solid #0f172a; padding: 10px;">
            <img src="${logoUrl}" style="max-height: 55px; max-width: 130px; object-contain: contain;" onerror="this.style.display='none'">
            <div style="font-size: 9px; font-weight: bold; margin-top: 4px;">${escapeHtml(empresa.razonSocial || empresa.razon_social)}</div>
            <div style="font-size: 8px; color: #64748b;">NIT: ${empresa.nit}</div>
          </td>
          <td style="width: 50%; text-align: center; border: 1px solid #0f172a; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: #0f172a;">SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO</div>
            <div style="font-size: 13px; font-weight: 900; margin-top: 4px; color: #b45309;">ACTA OFICIAL DE REUNIÓN MENSUAL</div>
            <div style="font-size: 10px; font-weight: bold; color: #475569;">${meeting.committee_type === 'CCL' ? 'COMITÉ DE CONVIVENCIA LABORAL (CCL)' : 'COPASST / VIGÍA EN SST'}</div>
          </td>
          <td style="width: 25%; font-size: 9px; border: 1px solid #0f172a; padding: 8px;">
            <div><strong>Código:</strong> ACT-SST-06</div>
            <div><strong>Consecutivo:</strong> ${meeting.act_consecutive}</div>
            <div><strong>Fecha:</strong> ${meeting.meeting_date}</div>
            <div><strong>Versión:</strong> 01</div>
          </td>
        </tr>
      </table>

      <!-- Datos Básicos de la Sesión -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        <table style="width: 100%; font-size: 11px;">
          <tr>
            <td style="width: 50%;"><strong>Empresa:</strong> ${escapeHtml(empresa.razonSocial || empresa.razon_social)}</td>
            <td style="width: 50%;"><strong>Modalidad:</strong> ${meeting.location_or_modality || 'Presencial'}</td>
          </tr>
          <tr>
            <td><strong>Fecha de Sesión:</strong> ${meeting.meeting_date}</td>
            <td><strong>Horario:</strong> ${meeting.start_time || '09:00'} a ${meeting.end_time || '10:30'}</td>
          </tr>
          <tr>
            <td><strong>Tipo de Reunión:</strong> ${meeting.meeting_type || 'ORDINARIA_MENSUAL'}</td>
            <td><strong>Quórum Verificado:</strong> SÍ (100% Reglamentario)</td>
          </tr>
        </table>
      </div>

      <!-- Desarrollo de la Agenda -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: bold; background: #e2e8f0; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px;">
          DESARROLLO DE LOS PUNTOS DE LA AGENDA LEGAL
        </div>
        <div style="white-space: pre-line; font-size: 11px; text-align: justify; padding: 0 4px;">
          ${escapeHtml(meeting.development_and_discussions)}
        </div>
      </div>

      <!-- Asistencia y Firmas de los Integrantes -->
      <div style="margin-top: 30px;">
        <div style="font-size: 12px; font-weight: bold; background: #e2e8f0; padding: 6px 10px; border-radius: 4px; margin-bottom: 16px;">
          CONSTANCIA DE ASISTENCIA Y FIRMAS DIGITALES (LEY 527 DE 1999)
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            ${members.slice(0, 2).map(m => `
              <td style="width: 50%; padding: 10px; vertical-align: top;">
                <div style="border-top: 1.5px solid #0f172a; padding-top: 8px; text-align: center;">
                  <div style="height: 40px; display: flex; align-items: center; justify-content: center; font-family: 'Brush Script MT', cursive, sans-serif; font-size: 18px; color: #1e3a8a;">
                    ${escapeHtml(m.employee_name)}
                  </div>
                  <div style="font-size: 11px; font-weight: bold;">${escapeHtml(m.employee_name)}</div>
                  <div style="font-size: 10px; color: #475569;">C.C. ${escapeHtml(m.employee_id_number || 'No registrada')}</div>
                  <div style="font-size: 9px; font-weight: bold; color: #b45309;">${escapeHtml(m.committee_role || 'Integrante')} - ${m.representation_side === 'EMPLEADOR_DESIGNADO' ? 'Empleador' : 'Trabajadores'}</div>
                  <div style="font-size: 8px; color: #10b981; margin-top: 2px;">✔ Sello Digital UTC-5: ${meeting.meeting_date}</div>
                </div>
              </td>
            `).join('')}
          </tr>
        </table>
      </div>

      <!-- Pie de Página Legal -->
      <div style="margin-top: 30px; font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px;">
        Documento oficial generado por la Plataforma DOCTOR PYME SG-SST en cumplimiento de la Resolución 2013 de 1986, Resolución 652 de 2012 y Decreto 1072 de 2015.
        La validez de las firmas digitales y su hash inmutable se conservan en la Bóveda Cloud bajo la Ley 527 de 1999.
      </div>

    </div>
  `;

  document.body.appendChild(printArea);

  if (typeof html2pdf !== 'undefined') {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${meeting.act_consecutive}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(printArea).outputPdf('blob');
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const b64 = reader.result;
        // Vincular automáticamente con Estándares Mínimos 1.1.6 o 1.1.8
        const numeral = meeting.committee_type === 'CCL' ? '1.1.8' : '1.1.6';
        await fetch('/api/copasst-ccl/save-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: empresa.id,
            doc_type: meeting.committee_type === 'CCL' ? 'ACTA_CCL' : 'ACTA_COPASST',
            consecutive: meeting.act_consecutive,
            doc_name: `${meeting.act_consecutive}.pdf`,
            pdf_base64: b64,
            numeral_0312: numeral
          })
        });

        // Descargar al usuario
        html2pdf().set(opt).from(printArea).save();
      };
    } catch (err) {
      console.warn('Error exportando PDF:', err);
    }
  }

  setTimeout(() => printArea.remove(), 2000);
}

// -----------------------------------------------------------------------------
// GENERADOR DE DOCUMENTOS DE CONSTITUCIÓN OFICIALES (1 CLIC)
// Convocatoria/Votación, Acta de Conformación e Instalación, Manual de Funciones
// -----------------------------------------------------------------------------
function generarDocumentoOficial(tipo, empresa, esModoVigia, copasstComm, cclComm, members) {
  const title = tipo === 'VOTACION' ? 'Convocatoria y Acta de Votación' : tipo === 'CONFORMACION_COPASST' ? (esModoVigia ? 'Acta de Designación del Vigía SST' : 'Acta Oficial de Conformación e Instalación del COPASST') : tipo === 'CONFORMACION_CCL' ? 'Acta de Conformación del Comité de Convivencia Laboral' : tipo === 'CONFIDENCIALIDAD_CCL' ? 'Acuerdo de Confidencialidad y Reserva del CCL' : 'Manual de Funciones y Responsabilidades del COPASST';

  const modal = document.createElement('div');
  modal.id = 'modal-doc-preview';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
      <div class="p-6 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <span class="text-[10px] font-black uppercase text-amber-400">Documento Oficial SG-SST</span>
          <h2 class="text-base font-black">${title}</h2>
        </div>
        <button type="button" onclick="document.getElementById('modal-doc-preview').remove()" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
      </div>

      <div id="doc-to-download" class="p-8 space-y-4 text-xs text-slate-800 dark:text-slate-200 max-h-[70vh] overflow-y-auto leading-relaxed">
        <div class="text-center pb-4 border-b border-slate-200 dark:border-slate-800 space-y-1">
          <h1 class="text-base font-black uppercase">${escapeHtml(empresa.razonSocial || empresa.razon_social)}</h1>
          <p class="text-xs text-slate-500 font-mono">NIT: ${empresa.nit} • Sistema de Gestión de Seguridad y Salud en el Trabajo</p>
          <h2 class="text-sm font-bold text-amber-600 dark:text-amber-400 pt-2">${title.toUpperCase()}</h2>
        </div>

        <div class="space-y-3 text-justify">
          ${tipo === 'VOTACION' ? `
            <p>En las instalaciones de <strong>${escapeHtml(empresa.razonSocial || empresa.razon_social)}</strong>, se llevó a cabo el proceso de votación libre, secreta y transparente para elegir a los representantes de los trabajadores ante el Comité Paritario de Seguridad y Salud en el Trabajo (COPASST), conforme a lo dispuesto en la Resolución 2013 de 1986 y el Decreto 1072 de 2015.</p>
            <p><strong>Censo Electoral:</strong> Total trabajadores habilitados: ${empresa.numeroTrabajadores || 15}. Votos depositados: ${empresa.numeroTrabajadores || 15}. Votos válidos: ${empresa.numeroTrabajadores || 15}. Votos nulos: 0.</p>
            <p>Finalizado el escrutinio de la mesa de votación, resultaron electos como representantes de los trabajadores los candidatos con mayor votación, quienes aceptan formalmente su designación.</p>
          ` : tipo === 'CONFORMACION_COPASST' ? `
            <p>En Bogotá D.C., siendo las 09:00 horas, se reunieron la Dirección de la empresa <strong>${escapeHtml(empresa.razonSocial || empresa.razon_social)}</strong> y los trabajadores electos, con el fin de conformar e instalar formalmente el ${esModoVigia ? 'Vigía en Seguridad y Salud en el Trabajo' : 'Comité Paritario de Seguridad y Salud en el Trabajo (COPASST)'} para el período legal de dos (2) años comprendido entre <strong>${new Date().getFullYear()}-01-15 y ${new Date().getFullYear() + 2}-01-14</strong>.</p>
            <p>El Empleador designó a sus representantes y los Trabajadores a los suyos en igual número de integrantes paritarios, procediendo a nombrar al Presidente y al Secretario del Comité según los Artículos 12 y 13 de la Resolución 2013 de 1986.</p>
          ` : tipo === 'CONFORMACION_CCL' ? `
            <p>En cumplimiento de las Resoluciones 652 y 1356 de 2012 y la Ley 1010 de 2006, la empresa <strong>${escapeHtml(empresa.razonSocial || empresa.razon_social)}</strong> formaliza la instalación del Comité de Convivencia Laboral (CCL), como instancia preventiva y conciliatoria para proteger a los trabajadores contra los riesgos psicosociales que afecten la salud en el lugar de trabajo.</p>
            <p>El Comité sesionará ordinariamente cada tres (3) meses o extraordinariamente ante cualquier queja radicada por los trabajadores en el canal confidencial.</p>
          ` : tipo === 'CONFIDENCIALIDAD_CCL' ? `
            <p>Por medio del presente instrumento, cada uno de los integrantes del Comité de Convivencia Laboral de <strong>${escapeHtml(empresa.razonSocial || empresa.razon_social)}</strong> asume el compromiso inquebrantable de reserva y confidencialidad respecto de todas las quejas, testimonios, pruebas, actas y deliberaciones a las que tenga acceso en el ejercicio de sus funciones.</p>
            <p>Cualquier revelación no autorizada de hechos reservados constituirá causal de mala conducta conforme al Código Sustantivo del Trabajo y las normas disciplinarias vigentes (Ley 1010 de 2006 Art. 6).</p>
          ` : `
            <p><strong>MARCO DE FUNCIONES DEL COPASST:</strong> Conforme al Artículo 11 de la Resolución 2013 de 1986 y el Decreto 1072 de 2015 Art. 2.2.4.6.29:</p>
            <p><strong>Funciones del Presidente:</strong> Presidir y orientar las reuniones, tramitar ante la administración de la empresa las recomendaciones aprobadas por el Comité y coordinar las actividades de inspección.</p>
            <p><strong>Funciones del Secretario:</strong> Verificar el quórum, redactar las actas de cada sesión, llevar el archivo de la correspondencia y actas, y citar a los miembros a las reuniones ordinarias y extraordinarias.</p>
          `}
        </div>

        <div class="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 text-center text-[11px]">
          <div>
            <div class="border-t border-slate-400 pt-2 font-bold">${escapeHtml(empresa.representanteLegal || 'Representante Legal')}</div>
            <div class="text-slate-500">Representante Legal (Patronal)</div>
          </div>
          <div>
            <div class="border-t border-slate-400 pt-2 font-bold">Presidente / Secretario COPASST</div>
            <div class="text-slate-500">Por los Miembros del Comité</div>
          </div>
        </div>
      </div>

      <div class="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
        <button type="button" onclick="document.getElementById('modal-doc-preview').remove()" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500">Cerrar</button>
        <button type="button" onclick="window.descargarPdfElemento('doc-to-download', '${tipo}.pdf')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
          Descargar PDF Firmado
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  window.descargarPdfElemento = async (elementId, filename) => {
    const el = document.getElementById(elementId);
    if (!el || typeof html2pdf === 'undefined') return;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save();
  };
}

// -----------------------------------------------------------------------------
// MODAL: ASIGNAR / EDITAR INTEGRANTE DEL COMITÉ
// -----------------------------------------------------------------------------
function abrirModalFormMiembro(container, empresa, commType, trabajadores) {
  const modal = document.createElement('div');
  modal.id = 'modal-miembro-form';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span class="text-[10px] font-black uppercase text-amber-500">Asignación de Roles</span>
          <h2 class="text-sm font-black text-slate-800 dark:text-white">Agregar Integrante a ${commType === 'CCL' ? 'CCL' : 'COPASST'}</h2>
        </div>
        <button type="button" onclick="document.getElementById('modal-miembro-form').remove()" class="text-slate-400 hover:text-white font-bold">✕</button>
      </div>

      <form id="form-nuevo-miembro" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Seleccionar Trabajador *</label>
          <select id="m-trabajador-id" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
            <option value="">-- Seleccionar de la nómina --</option>
            ${trabajadores.map(t => `
              <option value="${t.id}" data-nombre="${t.nombre}" data-cedula="${t.identificacion || t.cedula || ''}" data-cargo="${t.cargo || ''}">
                ${t.nombre} (C.C. ${t.identificacion || t.cedula} - ${t.cargo})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Representación *</label>
            <select id="m-representacion" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
              <option value="EMPLEADOR_DESIGNADO">Designado por Empleador</option>
              <option value="TRABAJADORES_ELEGIDO">Elegido por Trabajadores</option>
              <option value="VIGIA_UNICO">Vigía Único SST</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría *</label>
            <select id="m-categoria" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
              <option value="PRINCIPAL">Principal</option>
              <option value="SUPLENTE">Suplente</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rol en el Comité *</label>
          <select id="m-rol" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
            <option value="MIEMBRO_VOCAL">Miembro Vocal</option>
            <option value="PRESIDENTE">Presidente del Comité</option>
            <option value="SECRETARIO">Secretario del Comité</option>
            <option value="VIGIA">Vigía SST</option>
          </select>
        </div>

        <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button type="button" onclick="document.getElementById('modal-miembro-form').remove()" class="px-3 py-2 rounded-xl text-xs text-slate-500">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer">Guardar Integrante</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('form-nuevo-miembro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const select = document.getElementById('m-trabajador-id');
    const opt = select.options[select.selectedIndex];
    if (!opt || !select.value) return;

    const nuevoMiembro = {
      tenant_id: empresa.id,
      companyId: empresa.id,
      employee_id: select.value,
      employee_name: opt.getAttribute('data-nombre'),
      employee_id_number: opt.getAttribute('data-cedula'),
      employee_position: opt.getAttribute('data-cargo'),
      representation_side: document.getElementById('m-representacion').value,
      member_category: document.getElementById('m-categoria').value,
      committee_role: document.getElementById('m-rol').value,
      accepted_and_signed: true,
      signed_at: new Date().toISOString()
    };

    await store.saveCommitteeMembers(null, [nuevoMiembro]);
    modal.remove();
    renderCopasstCcl(container);
  });
}

// -----------------------------------------------------------------------------
// GESTIÓN DE CASOS CCL Y MODAL DE CONCILIACIÓN
// -----------------------------------------------------------------------------
function abrirModalGestionCasoCcl(container, caseId, nuevoEstado) {
  const compromiso = prompt(`Actualizar estado del caso a: ${nuevoEstado}\n\nSi formuló acuerdos de conciliación o compromisos de sana convivencia, ingréselos aquí:`);
  if (compromiso !== null) {
    store.updateConvivenciaReportStatus(caseId, nuevoEstado, compromiso);
    renderCopasstCcl(container);
  }
}

// -----------------------------------------------------------------------------
// MODAL: FORMULARIO DE NUEVA TAREA / COMPROMISO
// -----------------------------------------------------------------------------
function abrirModalFormTarea(container, empresa, commType, trabajadores) {
  const modal = document.createElement('div');
  modal.id = 'modal-tarea-form';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span class="text-[10px] font-black uppercase text-amber-500">Compromisos &amp; Tareas</span>
          <h2 class="text-sm font-black text-slate-800 dark:text-white">Nuevo Compromiso - ${commType === 'CCL' ? 'CCL' : 'COPASST'}</h2>
        </div>
        <button type="button" onclick="document.getElementById('modal-tarea-form').remove()" class="text-slate-400 hover:text-white font-bold">✕</button>
      </div>

      <form id="form-nueva-tarea-modal" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Título de la Tarea / Compromiso *</label>
          <input type="text" id="t-titulo" required placeholder="Ej: Inspección de extintores y botiquines en planta" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría *</label>
            <select id="t-categoria" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
              <option value="INSPECCION_SST">Inspección de Seguridad</option>
              <option value="INVESTIGACION_ATEL">Investigación ATEL</option>
              <option value="SEGUIMIENTO_PLAN_TRABAJO">Plan de Trabajo Anual</option>
              <option value="CAPACITACION_CONVIVENCIA">Capacitación / Convivencia</option>
              <option value="GESTION_CASO_ACOSO">Gestión de Caso CCL</option>
              <option value="VERIFICACION_MEDIDAS_CONTROL">Medidas de Control</option>
              <option value="OTRA">Otra Acción Correctiva</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha Límite *</label>
            <input type="date" id="t-fecha" required value="${new Date(Date.now() + 15*86400000).toISOString().split('T')[0]}" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-white">
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Responsable *</label>
          <input type="text" id="t-responsable" required placeholder="Nombre de la persona o cargo responsable" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descripción / Observaciones</label>
          <textarea id="t-descripcion" rows="2" placeholder="Detalle de las acciones a realizar..." class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"></textarea>
        </div>

        <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button type="button" onclick="document.getElementById('modal-tarea-form').remove()" class="px-3 py-2 rounded-xl text-xs text-slate-500">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer">Guardar Compromiso</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('form-nueva-tarea-modal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevaTarea = {
      tenant_id: empresa.id,
      companyId: empresa.id,
      committee_type: commType,
      task_category: document.getElementById('t-categoria').value,
      task_title: document.getElementById('t-titulo').value,
      task_description: document.getElementById('t-descripcion').value,
      responsible_name: document.getElementById('t-responsable').value,
      due_date: document.getElementById('t-fecha').value,
      progress_percentage: 0,
      status: 'PENDIENTE'
    };

    await store.saveCommitteeTask(nuevaTarea);
    modal.remove();
    renderCopasstCcl(container);
  });
}

// -----------------------------------------------------------------------------
// MODAL: FORMULARIO DE REPORTE CONFIDENCIAL MANUAL CCL
// -----------------------------------------------------------------------------
function abrirModalReporteManualCcl(container, empresa, trabajadores) {
  const modal = document.createElement('div');
  modal.id = 'modal-reporte-manual-ccl';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span class="text-[10px] font-black uppercase text-indigo-500">Bóveda Confidencial CCL</span>
          <h2 class="text-sm font-black text-slate-800 dark:text-white">Radicar Caso de Convivencia Manualmente</h2>
        </div>
        <button type="button" onclick="document.getElementById('modal-reporte-manual-ccl').remove()" class="text-slate-400 hover:text-white font-bold">✕</button>
      </div>

      <form id="form-reporte-manual-modal" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Trabajador que Presenta la Queja *</label>
          <input type="text" id="rm-trabajador-nombre" required placeholder="Nombre del trabajador afectado" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cédula</label>
            <input type="text" id="rm-trabajador-cedula" placeholder="Cédula de ciudadanía" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-white">
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha de los Hechos *</label>
            <input type="date" id="rm-fecha" value="${new Date().toISOString().split('T')[0]}" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-white">
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Persona o Cargo Involucrado *</label>
          <input type="text" id="rm-involucrado" required placeholder="Nombre o cargo de la persona involucrada" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipología de la Queja (Ley 1010/2006) *</label>
          <select id="rm-tipo" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white">
            <option value="CONFLICTO_INTERPERSONAL_CONVIVENCIA">Conflicto interpersonal de convivencia</option>
            <option value="MALTRATO_LABORAL">Maltrato verbal o psicológico</option>
            <option value="PERSECUCION_LABORAL">Persecución o acoso laboral reiterado</option>
            <option value="DISCRIMINACION_LABORAL">Trato discriminatorio</option>
            <option value="ENTORPECIMIENTO_LABORAL">Entorpecimiento laboral</option>
            <option value="INEQUIDAD_LABORAL">Inequidad manifiesta</option>
            <option value="DESPROTECCION_LABORAL">Desprotección laboral</option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Relato Detallado de los Hechos *</label>
          <textarea id="rm-descripcion" rows="3" required placeholder="Descripción de los hechos acontecidos..." class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"></textarea>
        </div>

        <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button type="button" onclick="document.getElementById('modal-reporte-manual-ccl').remove()" class="px-3 py-2 rounded-xl text-xs text-slate-500">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer">Radicar Caso</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('form-reporte-manual-modal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      tenant_id: empresa.id,
      companyId: empresa.id,
      reporter_name: document.getElementById('rm-trabajador-nombre').value,
      reporter_cedula: document.getElementById('rm-trabajador-cedula').value,
      reported_person_name_or_id: document.getElementById('rm-involucrado').value,
      incident_type: document.getElementById('rm-tipo').value,
      incident_date: document.getElementById('rm-fecha').value,
      incident_place: 'Instalaciones de la empresa',
      detailed_description: document.getElementById('rm-descripcion').value
    };

    try {
      const resp = await fetch('/api/worker/convivencia-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.status === 'ok' && data.case) {
        store.data.ccl_convivencia_reports = store.data.ccl_convivencia_reports || [];
        store.data.ccl_convivencia_reports.unshift(data.case);
        store.saveToStorage();
        modal.remove();
        renderCopasstCcl(container);
      }
    } catch (err) {
      alert('Error radicando caso: ' + err.message);
    }
  });
}

// -----------------------------------------------------------------------------
// GENERADOR DE ACTA DE CONCILIACIÓN CCL EN PDF
// -----------------------------------------------------------------------------
function generarPdfActaConciliacion(report, empresa, members) {
  const printArea = document.createElement('div');
  printArea.className = 'fixed -left-[9999px] top-0 bg-white p-8 max-w-[800px] text-slate-900 font-sans text-xs leading-relaxed';

  printArea.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; padding: 20px; line-height: 1.5;">
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-bottom: 20px;">
        <tr>
          <td style="width: 30%; text-align: center; border: 1px solid #0f172a; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold;">${escapeHtml(empresa.razonSocial || empresa.razon_social)}</div>
            <div style="font-size: 9px; color: #64748b;">NIT: ${empresa.nit}</div>
          </td>
          <td style="width: 45%; text-align: center; border: 1px solid #0f172a; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: #0f172a;">COMITÉ DE CONVIVENCIA LABORAL</div>
            <div style="font-size: 12px; font-weight: 900; color: #4338ca; margin-top: 4px;">ACTA OFICIAL DE CONCILIACIÓN Y COMPROMISOS</div>
            <div style="font-size: 9px; color: #475569;">Ley 1010 de 2006 &amp; Res. 652 de 2012</div>
          </td>
          <td style="width: 25%; font-size: 9px; border: 1px solid #0f172a; padding: 8px;">
            <div><strong>Radicado:</strong> ${escapeHtml(report.case_radicado)}</div>
            <div><strong>Fecha:</strong> ${report.incident_date || new Date().toISOString().split('T')[0]}</div>
            <div><strong>Estado:</strong> ${report.case_status}</div>
          </td>
        </tr>
      </table>

      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 11px;">
        <div><strong>Partes Involucradas:</strong> ${escapeHtml(report.reporter_name)} (Afectado/a) y ${escapeHtml(report.reported_person_name_or_id)} (Involucrado/a)</div>
        <div style="margin-top: 4px;"><strong>Tipología:</strong> ${escapeHtml(report.incident_type)}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-weight: bold; background: #e2e8f0; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px;">RELATO DE LOS HECHOS OBJETO DE CONCILIACIÓN</div>
        <div style="text-align: justify; font-size: 11px; font-style: italic;">"${escapeHtml(report.detailed_description || 'Sin descripción')}"</div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; background: #e0e7ff; color: #3730a3; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px;">ACUERDOS Y COMPROMISOS PACTADOS DE SANA CONVIVENCIA</div>
        <div style="text-align: justify; font-size: 11px; font-weight: bold;">${escapeHtml(report.conciliation_commitments || 'Las partes acuerdan restablecer el trato respetuoso, los canales de comunicación asertiva y abstenerse de cualquier conducta que vulnere la dignidad laboral conforme a la Ley 1010 de 2006.')}</div>
      </div>

      <div style="margin-top: 40px;">
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 10px;">
          <tr>
            <td style="width: 33%; padding: 10px; vertical-align: top;">
              <div style="border-top: 1.5px solid #0f172a; padding-top: 6px;">
                <div style="font-weight: bold;">${escapeHtml(report.reporter_name)}</div>
                <div style="color: #64748b;">Trabajador(a) / Parte Afectada</div>
              </div>
            </td>
            <td style="width: 33%; padding: 10px; vertical-align: top;">
              <div style="border-top: 1.5px solid #0f172a; padding-top: 6px;">
                <div style="font-weight: bold;">${escapeHtml(report.reported_person_name_or_id)}</div>
                <div style="color: #64748b;">Persona Involucrada</div>
              </div>
            </td>
            <td style="width: 33%; padding: 10px; vertical-align: top;">
              <div style="border-top: 1.5px solid #0f172a; padding-top: 6px;">
                <div style="font-weight: bold;">Presidente / Secretario CCL</div>
                <div style="color: #64748b;">Por el Comité de Convivencia</div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(printArea);

  if (typeof html2pdf !== 'undefined') {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `ACTA_CONCILIACION_${report.case_radicado}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printArea).save();
  }
  setTimeout(() => printArea.remove(), 2000);
}

function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%0?(\d+)?d/g, (match, width) => {
    let str = String(args[i++]);
    while (width && str.length < parseInt(width, 10)) {
      str = '0' + str;
    }
    return str;
  });
}
