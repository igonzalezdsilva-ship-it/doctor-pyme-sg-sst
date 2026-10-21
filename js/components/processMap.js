// =============================================================================
// COMPONENTE: MAPA DE PROCESOS, CARACTERIZACIÓN SIPOC/PHVA & CATÁLOGO DE CARGOS
// Arquitectura Guiada por Procesos (Process-Driven Architecture) - DOCTOR PYME
// Normativa: Decreto 1072 de 2015, Resolución 0312 de 2019 y GTC 45
// =============================================================================
import { store } from '../store.js';
import { evidenceDB, leerArchivoDataUrl } from '../db.js';
import { abrirVisorDocumento, abrirVisorEnlaceGuia } from './documentViewer.js';

let activeTabProcesos = 'caracterizacion'; // 'caracterizacion' | 'cargos' | 'diagramas'
let filtroTipoProceso = 'todos'; // 'todos' | 'Estratégico' | 'Misional' | 'Apoyo' | 'Evaluación'
let filtroBusquedaProcesos = '';
let procesoSeleccionadoId = null;
let docActivoPorCargo = {}; // { [cargoId]: 'manual' | 'perfil' | 'pts' | 'profesiograma' | 'epp' | 'anexo' }

function escapeHtmlCargo(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugifyCargo(text) {
  return (text || 'general')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function clasificarFuenteCargo(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('docs.google.com/document')) {
    return { tipo: 'GDOCS', label: 'Google Docs', icon: '📄', color: 'blue', bg: 'bg-blue-100 text-blue-700 hover:bg-blue-200' };
  }
  if (u.includes('docs.google.com/spreadsheets')) {
    return { tipo: 'GSHEETS', label: 'Google Sheets', icon: '📊', color: 'emerald', bg: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' };
  }
  if (u.includes('drive.google.com')) {
    return { tipo: 'GDRIVE', label: 'Google Drive', icon: '📁', color: 'amber', bg: 'bg-amber-100 text-amber-700 hover:bg-amber-200' };
  }
  if (u.endsWith('.pdf') || u.includes('.pdf?')) {
    return { tipo: 'PDF', label: 'PDF en Línea', icon: '📕', color: 'red', bg: 'bg-red-100 text-red-700 hover:bg-red-200' };
  }
  if (u.startsWith('data:')) {
    return { tipo: 'ARCHIVO', label: 'Archivo Adjunto', icon: '📎', color: 'indigo', bg: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' };
  }
  return { tipo: 'WEB', label: 'Doc Guía / Link', icon: '🔗', color: 'indigo', bg: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' };
}

const CATALOGO_6_DOCS_CARGO = [
  {
    key: 'manual',
    num: 1,
    codigo: 'DOC-CARGO-01',
    corto: '1. Manual de Funciones',
    subtitulo: 'Dec. 1072 Art. 2.2.4.6.8',
    tituloCompleto: 'Manual Específico de Funciones y Responsabilidades en SG-SST',
    norma: 'Decreto 1072 de 2015 Art. 2.2.4.6.8 Num. 2 • Resolución 0312 Estándar 1.1.2',
    modoVerificacion: 'Solicitar el manual de funciones por cargo con asignación expresa y comunicada de responsabilidades en SST firmada por el trabajador.',
    icon: '📄',
    printFn: 'imprimirManualDeCargo'
  },
  {
    key: 'perfil',
    num: 2,
    codigo: 'DOC-CARGO-02',
    corto: '2. Perfil & Competencia',
    subtitulo: 'Dec. 1072 Art. 2.2.4.6.10',
    tituloCompleto: 'Perfil del Cargo, Educación, Experiencia y Competencias SST',
    norma: 'Decreto 1072 de 2015 Art. 2.2.4.6.10 • Resolución 0312 Estándar 1.1.3',
    modoVerificacion: 'Verificar la definición de requisitos de educación, formación reglamentaria en SST, experiencia y competencias requeridas para el cargo.',
    icon: '📋',
    printFn: 'imprimirPerfilDeCargo'
  },
  {
    key: 'pts',
    num: 3,
    codigo: 'DOC-CARGO-03',
    corto: '3. Plan Trabajo Seguro',
    subtitulo: 'PTS Res. 0312',
    tituloCompleto: 'Procedimiento y Plan de Trabajo Seguro (PTS) por Cargo',
    norma: 'Resolución 0312 de 2019 Estándar 4.2.1 • Guía Técnica GTC 45',
    modoVerificacion: 'Constatar la existencia y divulgación de procedimientos e instructivos seguros para las tareas críticas y rutinarias del cargo (Antes, Durante y Después).',
    icon: '🛡️',
    printFn: 'imprimirPlanTrabajoSeguro'
  },
  {
    key: 'profesiograma',
    num: 4,
    codigo: 'DOC-CARGO-04',
    corto: '4. Profesiograma SST',
    subtitulo: 'Res. 2346 / Médicos',
    tituloCompleto: 'Profesiograma y Matriz de Exámenes Médicos Ocupacionales',
    norma: 'Resolución 2346 de 2007 • Resolución 0312 de 2019 Estándar 3.1.4',
    modoVerificacion: 'Verificar el profesiograma con la determinación de evaluaciones médicas de ingreso, periódicas y de egreso según los peligros del cargo.',
    icon: '🩺',
    printFn: 'imprimirProfesiograma'
  },
  {
    key: 'epp',
    num: 5,
    codigo: 'DOC-CARGO-05',
    corto: '5. Matriz EPP & Dotación',
    subtitulo: 'Res. 2400 & Art. 230',
    tituloCompleto: 'Matriz Técnica de Elementos de Protección Personal (EPP) y Dotación',
    norma: 'Ley 9 de 1979 • Resolución 2400 de 1979 • Art. 230 CST • Estándar 4.2.6',
    modoVerificacion: 'Comprobar la matriz de EPP requeridos por región anatómica, normas técnicas aplicables (ANSI/NTC) y registro de suministro y reposición.',
    icon: '🦺',
    printFn: 'imprimirMatrizEPP'
  },
  {
    key: 'anexo',
    num: 6,
    codigo: 'DOC-CARGO-06',
    corto: '6. Anexo Contractual',
    subtitulo: 'CST & Notificación',
    tituloCompleto: 'Anexo Contractual de SST y Notificación Expresa de Riesgos',
    norma: 'Código Sustantivo del Trabajo Arts. 58 y 62 • Dec. 1072 Art. 2.2.4.6.15',
    modoVerificacion: 'Verificar el anexo contractual firmado donde se notifican los peligros del puesto y las cláusulas de obligatorio cumplimiento en SG-SST.',
    icon: '📝',
    printFn: 'imprimirAnexoContractual'
  }
];

export async function renderProcessMap() {
  const container = document.getElementById('main-content');
  const empresaActiva = store.getEmpresaActiva();
  const empresas = store.getEmpresas();

  if (!empresaActiva) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-sm">
        <div class="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
          🗺️
        </div>
        <h2 class="text-xl font-bold text-slate-800">Selecciona una Empresa Cliente</h2>
        <p class="text-sm text-slate-500 mt-2">Para administrar la caracterización de procesos, el catálogo de cargos y los diagramas debes seleccionar una empresa activa.</p>
        <button onclick="window.location.hash='#empresas'" class="mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm">
          Ver Directorio de Empresas
        </button>
      </div>
    `;
    return;
  }

  const onboarding = store.getOnboardingProgress(empresaActiva.id);
  const procesos = store.getProcesses(empresaActiva.id);
  const cargos = store.getJobPositions(empresaActiva.id);
  const trabajadores = store.getTrabajadores(empresaActiva.id);
  const herramientas = store.getTools(empresaActiva.id);

  // Filtrado de procesos
  const procesosFiltrados = procesos.filter(p => {
    if (filtroTipoProceso !== 'todos' && p.process_type !== filtroTipoProceso) return false;
    if (filtroBusquedaProcesos) {
      const term = filtroBusquedaProcesos.toLowerCase().trim();
      return (p.code || '').toLowerCase().includes(term) ||
             (p.name || '').toLowerCase().includes(term) ||
             (p.objective || '').toLowerCase().includes(term);
    }
    return true;
  });

  // Cargar diagramas y evidencias documentales desde IndexedDB
  let diagMapa = null;
  let diagOrg = null;
  let todasLasEvidencias = [];
  try {
    diagMapa = await evidenceDB.obtenerDiagramaEmpresa(empresaActiva.id, 'mapa_procesos');
    diagOrg = await evidenceDB.obtenerDiagramaEmpresa(empresaActiva.id, 'organigrama');
    todasLasEvidencias = await evidenceDB.obtenerEvidenciasPorEmpresa(empresaActiva.id);
  } catch (err) {
    console.error("Error cargando diagramas o evidencias:", err);
  }

  const esLadrillos = (empresaActiva.id === 'emp-004' || empresaActiva.id === 'emp-1790438946268' || empresaActiva.razonSocial?.toLowerCase().includes('ladrillos ochoa'));
  const esDemo = ['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-1790438946268'].includes(empresaActiva.id);
  const defaultMapa = esLadrillos ? './assets/mapa-procesos-ladrillos-ochoa.png' : (esDemo ? './assets/sample-mapa-procesos.svg' : null);
  const mapaSrc = diagMapa?.dataUrl || diagMapa?.url || defaultMapa;

  const defaultOrg = esLadrillos ? '/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png' : (esDemo ? './assets/sample-organigrama.svg' : null);
  const orgSrc = diagOrg?.dataUrl || diagOrg?.url || defaultOrg;

  container.innerHTML = `
    <div class="space-y-6">

      <!-- BANNER: ONBOARDING OPERATIVO DE 4 PASOS -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl text-white shadow-xl border border-indigo-500/30">
        <div class="flex flex-col md:flex-row justify-between md:items-center gap-3 pb-3 border-b border-white/10">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Process-Driven Architecture
              </span>
              <span class="text-xs text-slate-300 font-bold">🏢 ${empresaActiva.razonSocial}</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">Riesgo Clase ${empresaActiva.claseRiesgo}</span>
            </div>
            <h3 class="text-base font-black text-white mt-1">
              Mapa de Procesos, Caracterización SIPOC & Catálogo de Cargos
            </h3>
            <p class="text-xs text-slate-400">
              Las actividades del ciclo PHVA componen automáticamente los manuales de funciones, los PTS y la Matriz GTC 45.
            </p>
          </div>
          <div class="text-right">
            <span class="text-[11px] font-bold text-indigo-300">Progreso Onboarding:</span>
            <div class="flex items-center gap-2 mt-1">
              <div class="w-28 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/10">
                <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500" style="width: ${onboarding.total}%"></div>
              </div>
              <span class="text-xs font-black text-emerald-400">${onboarding.total}%</span>
            </div>
          </div>
        </div>

        <!-- 4 Pasos Visuales -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3 pt-1">
          <div class="p-2.5 rounded-xl border ${onboarding.paso1 ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'} flex items-center gap-2">
            <span class="text-base">${onboarding.paso1 ? '✅' : '1️⃣'}</span>
            <div class="text-[11px] leading-tight">
              <p class="font-bold">1. ADN & Contexto IA</p>
              <p class="text-[9px] opacity-80">${onboarding.paso1 ? 'Estructurado' : 'Pendiente'}</p>
            </div>
          </div>

          <div class="p-2.5 rounded-xl border ${onboarding.paso2 ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/50' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-200'} flex items-center gap-2">
            <span class="text-base">${onboarding.paso2 ? '✅' : '2️⃣'}</span>
            <div class="text-[11px] leading-tight">
              <p class="font-bold">2. Mapa & SIPOC</p>
              <p class="text-[9px] opacity-80">${procesos.length} procesos activos</p>
            </div>
          </div>

          <div class="p-2.5 rounded-xl border ${onboarding.paso3 ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'} flex items-center gap-2">
            <span class="text-base">${onboarding.paso3 ? '✅' : '3️⃣'}</span>
            <div class="text-[11px] leading-tight">
              <p class="font-bold">3. Cargos & PTS</p>
              <p class="text-[9px] opacity-80">${cargos.length} cargos extraídos</p>
            </div>
          </div>

          <div class="p-2.5 rounded-xl border ${onboarding.paso4 ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'} flex items-center gap-2">
            <span class="text-base">${onboarding.paso4 ? '✅' : '4️⃣'}</span>
            <div class="text-[11px] leading-tight">
              <p class="font-bold">4. Portal & GTC 45</p>
              <p class="text-[9px] opacity-80">${onboarding.paso4 ? 'Vinculados' : 'Por asociar'}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Navegación por Pestañas -->
      <div class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap sm:flex-nowrap items-center gap-2">
        <button 
          onclick="window.cambiarTabProcesos('caracterizacion')" 
          class="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTabProcesos === 'caracterizacion' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 cursor-pointer'}"
        >
          <span>📋</span>
          <span>1. Caracterización SIPOC & Actividades PHVA</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${activeTabProcesos === 'caracterizacion' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}">${procesos.length}</span>
        </button>

        <button 
          onclick="window.cambiarTabProcesos('cargos')" 
          class="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTabProcesos === 'cargos' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 cursor-pointer'}"
        >
          <span>👥</span>
          <span>2. Catálogo de Cargos & 6 Documentos PDF</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${activeTabProcesos === 'cargos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}">${cargos.length}</span>
        </button>

        <button 
          onclick="window.cambiarTabProcesos('diagramas')" 
          class="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTabProcesos === 'diagramas' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 cursor-pointer'}"
        >
          <span>🗺️</span>
          <span>3. Diagramas Oficiales (Mapa & Organigrama)</span>
          ${(mapaSrc || orgSrc) ? `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>` : ''}
        </button>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 1: CARACTERIZACIÓN SIPOC & ACTIVIDADES PHVA -->
      <!-- ============================================================== -->
      ${activeTabProcesos === 'caracterizacion' ? `
        <div class="space-y-6">

          <!-- Barra Superior de Acciones de Procesos -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold text-slate-500 uppercase">Filtrar por Tipo:</span>
              <div class="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs">
                ${['todos', 'Estratégico', 'Misional', 'Apoyo', 'Evaluación'].map(tipo => `
                  <button 
                    onclick="window.cambiarFiltroTipoProceso('${tipo}')"
                    class="px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${filtroTipoProceso === tipo ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}"
                  >
                    ${tipo === 'todos' ? 'Todos' : tipo}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap">
              <!-- Botón AI Generador de Mapa -->
              <button 
                type="button" 
                onclick="window.abrirModalAsistenteMapaIA()" 
                class="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>✨ Proponer Mapa y SIPOC con IA</span>
              </button>

              <button 
                type="button" 
                onclick="window.abrirModalProceso()" 
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>+ Nuevo Proceso</span>
              </button>
            </div>
          </div>

          <!-- Listado de Procesos y Caracterización -->
          ${procesosFiltrados.length === 0 ? `
            <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
              <div class="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                🤖
              </div>
              <h3 class="text-base font-bold text-slate-800">No se encontraron procesos caracterizados</h3>
              <p class="text-xs text-slate-500 mt-2 mb-5">
                Puedes auto-generar la estructura completa con el botón inteligente o crear manualmente el primer proceso.
              </p>
              <button 
                onclick="window.abrirModalAsistenteMapaIA()" 
                class="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:from-purple-500 hover:to-indigo-500 transition"
              >
                ✨ Proponer Mapa y Caracterización con IA
              </button>
            </div>
          ` : `
            <div class="space-y-5">
              ${procesosFiltrados.map(proc => {
                const actividades = store.getProcessActivities(proc.id);
                const colorBadge = proc.process_type === 'Estratégico' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                                   proc.process_type === 'Misional' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                   proc.process_type === 'Apoyo' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200';
                
                return `
                  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition">
                    
                    <!-- Cabecera del Proceso -->
                    <div class="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                      <div>
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                          <span class="text-xs font-black font-mono px-2.5 py-0.5 rounded-lg bg-slate-800 text-white shadow-2xs">${proc.code}</span>
                          <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${colorBadge}">${proc.process_type}</span>
                          <span class="text-[11px] font-bold text-slate-500">Versión: ${proc.version || '1.0'}</span>
                        </div>
                        <h4 class="text-base font-black text-slate-900">${proc.name}</h4>
                        <p class="text-xs text-slate-600 mt-1"><strong class="text-slate-700">Objetivo:</strong> ${proc.objective || 'Garantizar la ejecución eficaz de las actividades conforme a los estándares de calidad y SST.'}</p>
                      </div>

                      <div class="flex items-center gap-2 flex-wrap">
                        <button 
                          onclick="window.abrirModalActividad(null, '${proc.id}')"
                          class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>+ Actividad PHVA</span>
                        </button>
                        <button 
                          onclick="window.abrirModalProceso('${proc.id}')"
                          class="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>✏️ Editar</span>
                        </button>
                        <button 
                          onclick="window.eliminarProcesoDirecto('${proc.id}')"
                          class="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Eliminar proceso"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>

                    <!-- Ficha SIPOC Resumida -->
                    <div class="px-5 py-3 bg-indigo-50/20 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase block">📥 Entradas (Inputs)</span>
                        <p class="text-slate-700 font-medium mt-0.5">${proc.inputs || 'Requerimientos, especificaciones técnicas e insumos.'}</p>
                      </div>
                      <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase block">📤 Salidas (Outputs)</span>
                        <p class="text-slate-700 font-medium mt-0.5">${proc.outputs || 'Producto conforme, informes de control y registros de trazabilidad.'}</p>
                      </div>
                      <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase block">👤 Cargo Líder / Responsable</span>
                        <p class="text-indigo-700 font-bold mt-0.5">
                          ${proc.leader_job_title || 'Responsable del Proceso'}
                        </p>
                      </div>
                    </div>

                    <!-- Tabla de Actividades PHVA -->
                    <div class="overflow-x-auto">
                      <table class="w-full text-left text-xs">
                        <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-black text-[10px] tracking-wider">
                          <tr>
                            <th class="py-2.5 px-3 w-24">Fase PHVA</th>
                            <th class="py-2.5 px-4">Actividad & Tarea</th>
                            <th class="py-2.5 px-3">Naturaleza</th>
                            <th class="py-2.5 px-4">Cargos Ejecutores / Responsables</th>
                            <th class="py-2.5 px-4">Herramientas & Equipos</th>
                            <th class="py-2.5 px-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          ${actividades.length === 0 ? `
                            <tr>
                              <td colspan="6" class="py-4 text-center text-slate-400">
                                No hay actividades registradas en este proceso. Haz clic en <strong>+ Actividad PHVA</strong> para añadir una.
                              </td>
                            </tr>
                          ` : actividades.map(act => {
                            const badgePhva = act.phva_phase === 'Planear' ? 'bg-blue-100 text-blue-800' :
                                              act.phva_phase === 'Hacer' ? 'bg-emerald-100 text-emerald-800' :
                                              act.phva_phase === 'Verificar' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800';
                            
                            // Obtener nombres de herramientas asociadas
                            const herramientasAsoc = (act.associated_tools_ids || []).map(tid => {
                              return herramientas.find(h => h.id === tid);
                            }).filter(Boolean);

                            // Obtener cargos asignados a esta actividad
                            const paps = (store.data.process_activity_positions || []).filter(pap => pap.process_activity_id === act.id);
                            const cargosAsoc = paps.map(pap => {
                              const c = cargos.find(cg => cg.id === pap.job_position_id);
                              return c ? c.title : null;
                            }).filter(Boolean);

                            return `
                              <tr class="hover:bg-slate-50/80 transition">
                                <td class="py-3 px-3">
                                  <span class="px-2 py-0.5 rounded font-black text-[10px] uppercase ${badgePhva}">
                                    ${act.phva_phase || 'Hacer'}
                                  </span>
                                </td>
                                <td class="py-3 px-4">
                                  <p class="font-bold text-slate-800">${act.activity_name}</p>
                                  <p class="text-[11px] text-slate-500 mt-0.5">${act.description || ''}</p>
                                </td>
                                <td class="py-3 px-3">
                                  ${(() => {
                                    const esRutinaria = act.is_routine !== undefined ? act.is_routine : (act.routine_type !== 'No_Rutinaria');
                                    return `
                                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${esRutinaria ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                                        ${esRutinaria ? 'Rutinaria' : 'No Rutinaria'}
                                      </span>
                                    `;
                                  })()}
                                </td>
                                <td class="py-3 px-4">
                                  <div class="flex flex-wrap gap-1">
                                    ${cargosAsoc.length > 0 ? cargosAsoc.map(tit => `
                                      <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-200">${tit}</span>
                                    `).join('') : `<span class="text-slate-400 italic text-[11px]">Por definir</span>`}
                                  </div>
                                </td>
                                <td class="py-3 px-4">
                                  <div class="flex flex-wrap gap-1">
                                    ${herramientasAsoc.length > 0 ? herramientasAsoc.map(h => `
                                      <span class="px-2 py-0.5 bg-teal-50 text-teal-800 rounded text-[10px] font-bold border border-teal-200 flex items-center gap-1">
                                        <span>⚙️</span> ${h.exact_name}
                                      </span>
                                    `).join('') : `<span class="text-slate-400 italic text-[11px]">Ninguna</span>`}
                                  </div>
                                </td>
                                <td class="py-3 px-3 text-right whitespace-nowrap">
                                  <button 
                                    onclick="window.abrirModalActividad('${act.id}', '${proc.id}')"
                                    class="p-1 text-slate-400 hover:text-indigo-600 transition"
                                    title="Editar actividad"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onclick="window.eliminarActividadDirecto('${act.id}')"
                                    class="p-1 text-slate-400 hover:text-red-600 transition ml-1"
                                    title="Eliminar actividad"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            `;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          `}

        </div>
      ` : ''}

      <!-- ============================================================== -->
      <!-- PESTAÑA 2: CATÁLOGO DE CARGOS Y 6 DOCUMENTOS OFICIALES PDF -->
      <!-- ============================================================== -->
      ${activeTabProcesos === 'cargos' ? `
        <div class="space-y-6">

          <!-- Tarjetas KPI de Cargos -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">Cargos en Catálogo</p>
                <p class="text-2xl font-black text-slate-900 mt-1">${cargos.length}</p>
                <p class="text-[10px] text-indigo-600 font-semibold mt-0.5">Estructura organizacional</p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold">
                👥
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">Trabajadores en Nómina</p>
                <p class="text-2xl font-black text-emerald-600 mt-1">${trabajadores.length}</p>
                <p class="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  ${trabajadores.filter(t => t.job_position_id).length} con cargo formal
                </p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                👔
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">Blindaje Jurídico SST</p>
                <p class="text-2xl font-black text-purple-600 mt-1">6 Docs PDF</p>
                <p class="text-[10px] text-purple-600 font-semibold mt-0.5">Dec. 1072, Res. 0312, GTC 45</p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-bold">
                📜
              </div>
            </div>
          </div>

          <!-- Barra de Búsqueda y Botón Nuevo Cargo -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 class="text-sm font-black text-slate-800">Catálogo de Cargos y Matriz de Instrumentos</h3>
              <p class="text-xs text-slate-500">
                Cada cargo extrae automáticamente sus funciones desde las actividades de procesos asignadas y habilita 6 documentos oficiales en PDF.
              </p>
            </div>

            <button 
              type="button" 
              onclick="window.abrirModalCargo()" 
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <span>+ Nuevo Cargo</span>
            </button>
          </div>

          <!-- Listado de Tarjetas de Cargos -->
          ${cargos.length === 0 ? `
            <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
              <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">
                👥
              </div>
              <h4 class="font-bold text-slate-700 text-base">Aún no hay cargos registrados</h4>
              <p class="text-xs text-slate-500 mt-1 mb-4">
                Los cargos se crean automáticamente cuando defines las actividades de los procesos o puedes registrarlos manualmente.
              </p>
              <button onclick="window.abrirModalCargo()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-700 transition">
                + Crear Primer Cargo
              </button>
            </div>
          ` : `
            <div class="grid grid-cols-1 gap-5">
              ${cargos.map(cargo => {
                const funcData = store.getJobPositionFunctions(cargo.id);
                const trabajadoresEnCargo = trabajadores.filter(t => t.job_position_id === cargo.id || (t.cargo && t.cargo.toLowerCase().trim() === cargo.title.toLowerCase().trim()));
                const badgeNivel = cargo.hierarchy_level === 'Directivo' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                   cargo.hierarchy_level === 'Profesional' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                   cargo.hierarchy_level === 'Técnico' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-slate-100 text-slate-800 border-slate-200';

                return `
                  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition">
                    
                    <!-- Fila Superior: Datos Clave del Cargo -->
                    <div class="flex flex-col lg:flex-row justify-between lg:items-start gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <div class="flex items-center gap-2 flex-wrap mb-1.5">
                          <span class="text-xs font-mono font-black px-2 py-0.5 rounded bg-slate-800 text-white">${cargo.code || 'CARG-001'}</span>
                          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeNivel}">${cargo.hierarchy_level}</span>
                          <span class="text-[11px] font-bold text-slate-500">Educación: ${cargo.required_education || 'Bachiller / Técnico'}</span>
                        </div>
                        <h4 class="text-lg font-black text-slate-900">${cargo.title}</h4>
                        <p class="text-xs text-slate-600 mt-1">
                          <strong>Objetivo:</strong> ${cargo.summary_objective || 'Ejecutar las funciones técnicas y operativas con sujeción a los estándares de calidad y seguridad.'}
                        </p>
                      </div>

                      <div class="flex items-center gap-2">
                        <button 
                          onclick="window.abrirModalCargo('${cargo.id}')"
                          class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          ✏️ Editar Cargo
                        </button>
                        <button 
                          onclick="window.eliminarCargoDirecto('${cargo.id}')"
                          class="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Eliminar cargo"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <!-- Fila Intermedia: Procesos, Funciones y Trabajadores -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 py-3.5 border-b border-slate-100 text-xs">
                      <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Procesos Involucrados</span>
                        ${funcData.procesos.length > 0 ? funcData.procesos.map(pr => `
                          <span class="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium mr-1 mb-1">${pr}</span>
                        `).join('') : `<span class="text-slate-400 italic text-[11px]">Sin procesos vinculados</span>`}
                      </div>

                      <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Funciones Extraídas (PHVA)</span>
                        <p class="font-bold text-slate-800">
                          ${funcData.operativas.length} operativas • ${funcData.sst.length} de SST
                        </p>
                        <p class="text-[10px] text-indigo-600 mt-0.5">Propagadas automáticamente</p>
                      </div>

                      <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Trabajadores Asignados (${trabajadoresEnCargo.length})</span>
                        ${trabajadoresEnCargo.length > 0 ? `
                          <div class="flex flex-wrap gap-1">
                            ${trabajadoresEnCargo.slice(0, 3).map(t => `
                              <span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-200">${t.nombre}</span>
                            `).join('')}
                            ${trabajadoresEnCargo.length > 3 ? `<span class="text-[10px] text-slate-400 font-bold">+${trabajadoresEnCargo.length - 3} más</span>` : ''}
                          </div>
                        ` : `<span class="text-amber-600 font-semibold text-[11px]">⚠️ Sin personal asignado</span>`}
                      </div>
                    </div>

                    <!-- Fila Inferior: Los 6 Documentos Oficiales en PDF + Estructura de Estándares Mínimos y Repositorio -->
                    ${(() => {
                      const docKeyActivo = docActivoPorCargo[cargo.id] || 'manual';
                      const docMeta = CATALOGO_6_DOCS_CARGO.find(d => d.key === docKeyActivo) || CATALOGO_6_DOCS_CARGO[0];
                      const configCargo = store.getPerfilCargo(cargo.title, empresaActiva.id);
                      const cargoSlug = slugifyCargo(cargo.title);
                      const numeralTagActivo = `cargo_${cargoSlug}_${docMeta.key}`;

                      const fuentesDoc = store.getFuentesInstrumento(cargo.title, docMeta.key, empresaActiva.id);
                      const fuentesValidas = fuentesDoc.filter(f => f && f.url && f.url.trim() !== '');
                      const evidenciasDoc = todasLasEvidencias.filter(ev => ev.numeral === numeralTagActivo);
                      const totalSoportesActivo = fuentesValidas.length + evidenciasDoc.length;

                      // Valores actuales de la estructura del documento seleccionado
                      const funcionesOpList = (configCargo.manualFunciones?.funcionesOperativas && configCargo.manualFunciones.funcionesOperativas.length > 0)
                        ? configCargo.manualFunciones.funcionesOperativas
                        : funcData.operativas;
                      const respSstList = (configCargo.manualFunciones?.responsabilidadesSST && configCargo.manualFunciones.responsabilidadesSST.length > 0)
                        ? configCargo.manualFunciones.responsabilidadesSST
                        : funcData.sst;

                      return `
                        <div class="pt-4">
                          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div>
                              <span class="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                <span>📜</span> Catálogo de los 6 Documentos Oficiales del Cargo & Repositorio Documental (Estructura Estándares Mínimos):
                              </span>
                              <p class="text-[11px] text-slate-500 mt-0.5">
                                Selecciona cualquiera de los 6 documentos para gestionar su <strong>Estructura</strong>, su <strong>Documento Guía / Link de Google</strong> y almacenar sus <strong>Documentos Definidos en PDF</strong>.
                              </p>
                            </div>
                            <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap self-start sm:self-auto">
                              6 Documentos Oficiales por Cargo
                            </span>
                          </div>

                          <!-- Selector de los 6 Documentos del Cargo -->
                          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                            ${CATALOGO_6_DOCS_CARGO.map(d => {
                              const isSelected = d.key === docMeta.key;
                              const tagItem = `cargo_${cargoSlug}_${d.key}`;
                              const fItem = store.getFuentesInstrumento(cargo.title, d.key, empresaActiva.id).filter(f => f && f.url && f.url.trim() !== '');
                              const evItem = todasLasEvidencias.filter(ev => ev.numeral === tagItem);
                              const countItem = fItem.length + evItem.length;

                              return `
                                <button 
                                  type="button"
                                  onclick="window.seleccionarDocCatalogoCargo('${cargo.id}', '${d.key}')"
                                  class="p-2.5 rounded-xl border transition flex flex-col items-center justify-between text-center group cursor-pointer ${
                                    isSelected 
                                      ? 'border-indigo-600 bg-indigo-950 text-white shadow-md ring-2 ring-indigo-500/30' 
                                      : 'border-slate-200 bg-slate-50/80 hover:bg-indigo-50/60 hover:border-indigo-300 text-slate-800 shadow-2xs'
                                  }"
                                >
                                  <div class="flex items-center justify-between w-full mb-1">
                                    <span class="text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-200 text-slate-700'}">
                                      ${d.codigo.replace('DOC-CARGO-', '#')}
                                    </span>
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                      countItem > 0 
                                        ? (isSelected ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                                        : (isSelected ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500')
                                    }">
                                      📎 ${countItem}
                                    </span>
                                  </div>
                                  <span class="text-lg my-0.5 group-hover:scale-110 transition">${d.icon}</span>
                                  <span class="text-[11px] font-black leading-tight">${d.corto}</span>
                                  <span class="text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-500'} font-semibold mt-0.5">${d.subtitulo}</span>
                                </button>
                              `;
                            }).join('')}
                          </div>

                          <!-- TARJETA DEL DOCUMENTO ACTIVO (ESTRUCTURA IDÉNTICA A EVALUACIÓN DE ESTÁNDARES MÍNIMOS) -->
                          <div class="rounded-2xl border border-indigo-200 bg-gradient-to-b from-slate-50/70 to-white p-5 shadow-xs space-y-4">
                            
                            <!-- Encabezado del Documento Seleccionado -->
                            <div class="flex flex-col lg:flex-row justify-between lg:items-start gap-4 pb-4 border-b border-slate-200/80">
                              <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span class="text-xs font-black px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono">
                                    ${docMeta.codigo} • ${cargo.code || 'CARG'}
                                  </span>
                                  <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    ${docMeta.norma}
                                  </span>
                                  ${totalSoportesActivo > 0 ? `
                                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                      <span>📎</span> ${totalSoportesActivo} ${totalSoportesActivo === 1 ? 'documento en repositorio' : 'documentos en repositorio'}
                                    </span>
                                  ` : `
                                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                      ⚠️ Sin archivos locales adjuntos aún
                                    </span>
                                  `}
                                </div>

                                <h5 class="font-black text-slate-900 text-base flex items-center gap-2">
                                  <span>${docMeta.icon}</span>
                                  <span>${docMeta.tituloCompleto}</span>
                                  <span class="text-xs font-bold text-indigo-600">(${cargo.title})</span>
                                </h5>

                                <!-- Modo de Verificación y Píldoras de Enlaces Google -->
                                <div class="mt-2 p-2.5 bg-white rounded-xl border border-slate-200/90 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <strong class="text-slate-700">🔍 Modo de Verificación Legal:</strong> ${docMeta.modoVerificacion}
                                  </div>
                                  ${fuentesValidas.length > 0 ? `
                                    <div class="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                                      ${fuentesValidas.map((f, fIdx) => {
                                        const info = clasificarFuenteCargo(f.url);
                                        const nombreCorto = f.titulo ? f.titulo : `${info.label} #${fIdx + 1}`;
                                        return `
                                          <button 
                                            type="button" 
                                            onclick="window.previsualizarFuenteDocCargo('${escapeHtmlCargo(f.url)}', '${escapeHtmlCargo(f.titulo || '')}', '${escapeHtmlCargo(cargo.title)}', '${docMeta.key}')"
                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition shadow-2xs cursor-pointer ${info.bg}"
                                            title="Previsualizar ${escapeHtmlCargo(nombreCorto)}"
                                          >
                                            <span>${info.icon}</span>
                                            <span class="max-w-[140px] truncate">${escapeHtmlCargo(nombreCorto)}</span>
                                          </button>
                                        `;
                                      }).join('')}
                                    </div>
                                  ` : ''}
                                </div>
                              </div>

                              <!-- Botón Principal: Generar / Imprimir PDF Oficial -->
                              <div class="flex items-center gap-2 self-start flex-shrink-0">
                                <button 
                                  type="button"
                                  onclick="window.${docMeta.printFn}('${cargo.id}')"
                                  class="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
                                >
                                  <span>🖨️ Generar / Imprimir PDF Oficial</span>
                                </button>
                              </div>
                            </div>

                            <!-- ========================================================================= -->
                            <!-- SECCIÓN 1: ESTRUCTURA DEFINIDA DE CADA DOCUMENTO (EDITABLE Y PERSISTENTE) -->
                            <!-- ========================================================================= -->
                            <div class="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3">
                              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                <div class="flex items-center gap-2">
                                  <span class="p-1.5 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs">🧩</span>
                                  <div>
                                    <h6 class="text-xs font-black text-slate-800 uppercase tracking-wide">
                                      1. Estructura Definida del Documento: ${docMeta.corto}
                                    </h6>
                                    <p class="text-[10px] text-slate-500">
                                      Personaliza y almacena el contenido estructural de este documento para el cargo <strong>${cargo.title}</strong>. Al guardar, actualiza el repositorio y el generador PDF.
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onclick="window.guardarEstructuraDocCargo('${cargo.id}', '${docMeta.key}')"
                                  class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                                >
                                  <span>💾 Guardar Estructura del Documento</span>
                                </button>
                              </div>

                              ${docMeta.key === 'manual' ? `
                                <div class="grid grid-cols-1 gap-3 text-xs">
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">I. Objetivo / Propósito Principal del Cargo:</label>
                                    <input 
                                      type="text" 
                                      id="est-manual-obj-${cargo.id}"
                                      value="${escapeHtmlCargo(cargo.summary_objective || configCargo.perfil?.objetivo || '')}"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                  </div>
                                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label class="block text-[11px] font-bold text-slate-700 mb-1">II. Funciones Operativas y Procedimentales PHVA (1 por línea):</label>
                                      <textarea 
                                        id="est-manual-op-${cargo.id}" 
                                        rows="5"
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                      >${escapeHtmlCargo(funcionesOpList.join('\n'))}</textarea>
                                    </div>
                                    <div>
                                      <label class="block text-[11px] font-bold text-slate-700 mb-1">III. Responsabilidades Obligatorias en SG-SST Dec. 1072 (1 por línea):</label>
                                      <textarea 
                                        id="est-manual-sst-${cargo.id}" 
                                        rows="5"
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                      >${escapeHtmlCargo(respSstList.join('\n'))}</textarea>
                                    </div>
                                  </div>
                                </div>
                              ` : ''}

                              ${docMeta.key === 'perfil' ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">I. Educación Formal Requerida:</label>
                                    <input 
                                      type="text" 
                                      id="est-perfil-edu-${cargo.id}"
                                      value="${escapeHtmlCargo(cargo.required_education || configCargo.perfil?.educacion || '')}"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">II. Experiencia Laboral Mínima:</label>
                                    <input 
                                      type="text" 
                                      id="est-perfil-exp-${cargo.id}"
                                      value="${escapeHtmlCargo(cargo.required_experience || configCargo.perfil?.experiencia || '')}"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">III. Certificaciones y Formación Reglamentaria en SST Obligatoria:</label>
                                    <textarea 
                                      id="est-perfil-sst-${cargo.id}" 
                                      rows="3"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.perfil?.formacionSST || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">IV. Competencias Técnicas y Habilidades Conductuales:</label>
                                    <textarea 
                                      id="est-perfil-comp-${cargo.id}" 
                                      rows="3"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(Array.isArray(cargo.required_skills) && cargo.required_skills.length > 0 ? cargo.required_skills.join(', ') : (configCargo.perfil?.competencias || ''))}</textarea>
                                  </div>
                                </div>
                              ` : ''}

                              ${docMeta.key === 'pts' ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">I. Título y Alcance del PTS:</label>
                                    <input 
                                      type="text" 
                                      id="est-pts-titulo-${cargo.id}"
                                      value="${escapeHtmlCargo(configCargo.pts?.titulo || `Procedimiento de Trabajo Seguro (PTS) para ${cargo.title}`)}"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">II. Peligros Prioritarios Evaluados (GTC 45):</label>
                                    <input 
                                      type="text" 
                                      id="est-pts-peligros-${cargo.id}"
                                      value="${escapeHtmlCargo(Array.isArray(configCargo.pts?.peligrosEvaluados) ? configCargo.pts.peligrosEvaluados.join(', ') : (configCargo.pts?.peligrosEvaluados || ''))}"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">III. Fase 1 - ANTES de Iniciar Labores (Preoperacional):</label>
                                    <textarea 
                                      id="est-pts-antes-${cargo.id}" 
                                      rows="3"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.pts?.faseAntes || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">IV. Fase 2 - DURANTE la Ejecución (Controles Operativos):</label>
                                    <textarea 
                                      id="est-pts-durante-${cargo.id}" 
                                      rows="3"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.pts?.faseDurante || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">V. Fase 3 - DESPUÉS de la Labor (Cierre y Orden/Aseo):</label>
                                    <textarea 
                                      id="est-pts-despues-${cargo.id}" 
                                      rows="2"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.pts?.faseDespues || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">VI. Protocolo de Emergencias y Stop Work Authority:</label>
                                    <textarea 
                                      id="est-pts-emerg-${cargo.id}" 
                                      rows="2"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.pts?.emergencias || '')}</textarea>
                                  </div>
                                </div>
                              ` : ''}

                              ${docMeta.key === 'profesiograma' ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">I. Exámenes Médicos y Paraclínicos de INGRESO (Preempleo):</label>
                                    <textarea 
                                      id="est-prof-ingreso-${cargo.id}" 
                                      rows="3"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.profesiograma?.ingreso || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">II. Exámenes Médicos PERIÓDICOS (Anual / PVE):</label>
                                    <textarea 
                                      id="est-prof-periodico-${cargo.id}" 
                                      rows="3"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.profesiograma?.periodico || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">III. Exámenes Médicos de EGRESO (Retiro Laboral):</label>
                                    <textarea 
                                      id="est-prof-egreso-${cargo.id}" 
                                      rows="2"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.profesiograma?.egreso || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">IV. Criterios de Restricción y Contraindicaciones Médicas:</label>
                                    <textarea 
                                      id="est-prof-restric-${cargo.id}" 
                                      rows="2"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.profesiograma?.restricciones || '')}</textarea>
                                  </div>
                                </div>
                              ` : ''}

                              ${docMeta.key === 'epp' ? `
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">I. EPP Obligatorios por Cargo (1 por línea):</label>
                                    <textarea 
                                      id="est-epp-lista-${cargo.id}" 
                                      rows="4"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(Array.isArray(configCargo.matrizEpp?.eppRequeridos) ? configCargo.matrizEpp.eppRequeridos.join('\n') : (configCargo.matrizEpp?.eppRequeridos || ''))}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">II. Normas Técnicas Aplicables (ANSI / NTC / NIOSH):</label>
                                    <textarea 
                                      id="est-epp-normas-${cargo.id}" 
                                      rows="4"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.matrizEpp?.normasTecnicas || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">III. Cronograma de Dotación (Art. 230 CST) y Reposición:</label>
                                    <textarea 
                                      id="est-epp-repos-${cargo.id}" 
                                      rows="4"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.matrizEpp?.frecuenciaReposicion || '')}</textarea>
                                  </div>
                                </div>
                              ` : ''}

                              ${docMeta.key === 'anexo' ? `
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">I. Cláusula Primera - Notificación Expresa de Peligros GTC 45:</label>
                                    <textarea 
                                      id="est-anexo-riesgos-${cargo.id}" 
                                      rows="4"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.anexoContractual?.notificacionRiesgos || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">II. Cláusula Segunda - Obligaciones Ineludibles en SST:</label>
                                    <textarea 
                                      id="est-anexo-clausula-${cargo.id}" 
                                      rows="4"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.anexoContractual?.clausulaPrincipal || '')}</textarea>
                                  </div>
                                  <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">III. Cláusula Tercera - Régimen Sancionatorio (Art. 62 CST):</label>
                                    <textarea 
                                      id="est-anexo-sancion-${cargo.id}" 
                                      rows="4"
                                      class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >${escapeHtmlCargo(configCargo.anexoContractual?.regimenSancionatorio || '')}</textarea>
                                  </div>
                                </div>
                              ` : ''}
                            </div>

                            <!-- ========================================================================= -->
                            <!-- SECCIÓN 2: DOCUMENTO GUÍA, PLANTILLAS BASE Y FUENTES DOCUMENTALES (GOOGLE) -->
                            <!-- (IDÉNTICO A LA EVALUACIÓN DE LOS ESTÁNDARES MÍNIMOS RES. 0312)            -->
                            <!-- ========================================================================= -->
                            <div class="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100/80 space-y-2.5">
                              <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div class="flex items-center gap-2">
                                  <span class="p-1.5 rounded-lg bg-blue-100 text-blue-700 flex-shrink-0">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                  </span>
                                  <div>
                                    <label class="text-xs font-bold text-slate-800">
                                      2. Documento Guía, Plantillas Base y Fuentes Documentales: Link de Google
                                    </label>
                                    <span class="text-[10px] text-slate-500 block">
                                      Vincula enlaces de Google Docs, Google Sheets, Drive o sube archivos directamente a este documento del cargo
                                    </span>
                                  </div>
                                </div>

                                <!-- Botón Agregar Nueva Fuente (+) -->
                                <button 
                                  type="button" 
                                  onclick="window.agregarFuenteDocCargo('${escapeHtmlCargo(cargo.title)}', '${docMeta.key}')"
                                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto flex-shrink-0"
                                  title="Agregar un nuevo enlace de Google o documento fuente"
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                  <span>+ Agregar nueva fuente</span>
                                </button>
                              </div>

                              <!-- Lista Dinámica de Fuentes Documentales -->
                              <div class="space-y-2 pt-1">
                                ${fuentesDoc.map((f, fIdx) => {
                                  const fInfo = clasificarFuenteCargo(f.url);
                                  const tieneUrl = !!(f.url && f.url.trim());

                                  return `
                                    <div class="bg-white p-2.5 rounded-lg border ${tieneUrl ? 'border-blue-200 shadow-2xs' : 'border-slate-200'} flex flex-col md:flex-row items-stretch md:items-center gap-2">
                                      
                                      <!-- Badge Número / Tipo -->
                                      <div class="flex items-center gap-1.5 flex-shrink-0">
                                        <span class="w-5 h-5 rounded-full ${tieneUrl ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'} text-[10px] font-black flex items-center justify-center">
                                          ${fIdx + 1}
                                        </span>
                                        <span class="text-[10px] font-bold ${tieneUrl ? 'text-blue-700' : 'text-slate-400'} min-w-[78px]">
                                          ${tieneUrl ? fInfo.label : `Link #${fIdx + 1}`}
                                        </span>
                                      </div>

                                      <!-- Input 1: Título de la Fuente -->
                                      <div class="w-full md:w-56 flex-shrink-0">
                                        <input 
                                          type="text" 
                                          placeholder="Título opcional (ej: Plantilla Base, Formato)..." 
                                          value="${escapeHtmlCargo(f.titulo || '')}" 
                                          onchange="window.actualizarFuenteDocCargo('${escapeHtmlCargo(cargo.title)}', '${docMeta.key}', '${f.id}', 'titulo', this.value)"
                                          class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                        >
                                      </div>

                                      <!-- Input 2: Link de Google / URL -->
                                      <div class="relative flex-1 min-w-0">
                                        <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                                        </div>
                                        <input 
                                          type="url" 
                                          placeholder="Link de Google (https://docs.google.com/document/... o Drive)"
                                          value="${escapeHtmlCargo(f.url || '')}" 
                                          onchange="window.actualizarFuenteDocCargo('${escapeHtmlCargo(cargo.title)}', '${docMeta.key}', '${f.id}', 'url', this.value)"
                                          class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none ${tieneUrl ? 'font-medium text-slate-800' : 'text-slate-500'}"
                                        >
                                      </div>

                                      <!-- Botones de Acción de la Fuente -->
                                      <div class="flex items-center gap-1.5 flex-shrink-0 justify-end">
                                        ${tieneUrl ? `
                                          <a 
                                            href="${escapeHtmlCargo(f.url)}" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold flex items-center gap-1 transition"
                                            title="Abrir Link de Google en pestaña nueva"
                                          >
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                            <span>Abrir</span>
                                          </a>

                                          <button 
                                            type="button" 
                                            onclick="window.previsualizarFuenteDocCargo('${escapeHtmlCargo(f.url)}', '${escapeHtmlCargo(f.titulo || '')}', '${escapeHtmlCargo(cargo.title)}', '${docMeta.key}')"
                                            class="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                                            title="Vista previa interactiva sin salir de la App"
                                          >
                                            <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            <span>Ver</span>
                                          </button>
                                        ` : ''}

                                        <!-- Subir archivo asociado a esta fila -->
                                        <label 
                                          class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                          title="Subir un archivo PDF, Word, Excel o Imagen desde tu equipo a esta fuente"
                                        >
                                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                          <span>Subir Archivo</span>
                                          <input type="file" class="hidden" onchange="window.subirArchivoFuenteDocCargo('${escapeHtmlCargo(cargo.title)}', '${docMeta.key}', '${f.id}', this.files)">
                                        </label>

                                        <!-- Eliminar / Limpiar Fuente -->
                                        <button 
                                          type="button" 
                                          onclick="window.eliminarFuenteDocCargo('${escapeHtmlCargo(cargo.title)}', '${docMeta.key}', '${f.id}')"
                                          class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                                          title="${fuentesDoc.length === 1 && !tieneUrl ? 'Limpiar campos' : 'Eliminar esta fuente'}"
                                        >
                                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                      </div>
                                    </div>
                                  `;
                                }).join('')}
                              </div>
                            </div>

                            <!-- ========================================================================= -->
                            <!-- SECCIÓN 3: REPOSITORIO DE DOCUMENTOS DEFINIDOS Y SOPORTES ACTIVOS (PDF)   -->
                            <!-- (IDÉNTICO A LA EVALUACIÓN DE LOS ESTÁNDARES MÍNIMOS RES. 0312)            -->
                            <!-- ========================================================================= -->
                            <div class="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 space-y-2.5">
                              <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                  <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                  <span>3. Repositorio de Documentos Definidos y Soportes Activos (${totalSoportesActivo}):</span>
                                </span>

                                <!-- Botón Cargar Archivos Locales al Repositorio -->
                                <label class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-xs">
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                  <span>Adjuntar Documento Definido / PDF al Repositorio</span>
                                  <input type="file" multiple onchange="window.adjuntarArchivoRepositorioCargo('${escapeHtmlCargo(cargo.title)}', '${docMeta.key}', this.files)" class="hidden">
                                </label>
                              </div>

                              ${totalSoportesActivo === 0 ? `
                                <div class="text-[11px] text-slate-400 italic py-2">
                                  ⚪ Sin documentos definidos ni archivos adjuntos en el repositorio de este documento aún.
                                </div>
                              ` : `
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                  
                                  <!-- A. Fuentes Enlazadas (Google Docs, Sheets, Drive) -->
                                  ${fuentesValidas.map((f, fIdx) => {
                                    const info = clasificarFuenteCargo(f.url);
                                    const tituloMostrar = f.titulo || `${info.label} #${fIdx + 1}`;
                                    return `
                                      <div class="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200/80 shadow-2xs flex items-center justify-between gap-2 hover:border-blue-400 transition">
                                        <div class="flex items-center gap-2 overflow-hidden cursor-pointer flex-1" onclick="window.previsualizarFuenteDocCargo('${escapeHtmlCargo(f.url)}', '${escapeHtmlCargo(tituloMostrar)}', '${escapeHtmlCargo(cargo.title)}', '${docMeta.key}')">
                                          <span class="p-1.5 rounded bg-blue-100 text-blue-700 flex-shrink-0 text-xs">
                                            ${info.icon}
                                          </span>
                                          <div class="overflow-hidden">
                                            <span class="text-xs font-bold text-blue-900 hover:text-indigo-700 truncate block transition" title="${escapeHtmlCargo(tituloMostrar)}">${escapeHtmlCargo(tituloMostrar)}</span>
                                            <span class="text-[10px] text-blue-600 font-medium">${info.label} • En Nube</span>
                                          </div>
                                        </div>

                                        <div class="flex items-center gap-1 flex-shrink-0">
                                          <button 
                                            type="button" 
                                            onclick="window.previsualizarFuenteDocCargo('${escapeHtmlCargo(f.url)}', '${escapeHtmlCargo(tituloMostrar)}', '${escapeHtmlCargo(cargo.title)}', '${docMeta.key}')" 
                                            class="px-2 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                          >
                                            <span>Ver</span>
                                          </button>
                                          <a 
                                            href="${escapeHtmlCargo(f.url)}" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1 transition shadow-2xs"
                                          >
                                            <span>Ir ↗</span>
                                          </a>
                                        </div>
                                      </div>
                                    `;
                                  }).join('')}

                                  <!-- B. Archivos Locales Subidos al Repositorio (PDFs, Imágenes, Word/Excel) -->
                                  ${evidenciasDoc.map(ev => {
                                    const esPDF = ev.tipo?.includes('pdf') || ev.nombre?.endsWith('.pdf');
                                    const esImagen = ev.tipo?.includes('image/');
                                    const kb = Math.round((ev.tamanio || 0) / 1024);
                                    const sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
                                    const fechaStr = ev.fechaCargue ? new Date(ev.fechaCargue).toLocaleDateString() : '';

                                    return `
                                      <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between gap-2 hover:border-indigo-300 transition">
                                        <div class="flex items-center gap-2 overflow-hidden cursor-pointer flex-1" onclick="window.previsualizarEvidenciaCargo('${ev.id}')">
                                          <span class="p-1.5 rounded ${esPDF ? 'bg-red-50 text-red-600' : esImagen ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} flex-shrink-0 text-xs">
                                            ${esPDF ? '📕' : esImagen ? '🖼️' : '📄'}
                                          </span>
                                          <div class="overflow-hidden">
                                            <span class="text-xs font-semibold text-slate-700 hover:text-indigo-600 truncate block transition" title="${escapeHtmlCargo(ev.nombre)}">${escapeHtmlCargo(ev.nombre)}</span>
                                            <span class="text-[10px] text-slate-400">${sizeStr} • ${fechaStr}</span>
                                          </div>
                                        </div>

                                        <div class="flex items-center gap-1 flex-shrink-0">
                                          <button 
                                            type="button" 
                                            onclick="window.previsualizarEvidenciaCargo('${ev.id}')" 
                                            class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                          >
                                            <span>Ver</span>
                                          </button>
                                          <button 
                                            type="button" 
                                            onclick="window.descargarEvidenciaCargo('${ev.id}')" 
                                            class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer" 
                                            title="Descargar copia del documento"
                                          >
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                          </button>
                                          <button 
                                            type="button" 
                                            onclick="window.eliminarEvidenciaCargo('${ev.id}')" 
                                            class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer" 
                                            title="Eliminar archivo del repositorio"
                                          >
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                          </button>
                                        </div>
                                      </div>
                                    `;
                                  }).join('')}
                                </div>
                              `}
                            </div>

                          </div>
                        </div>
                      `;
                    })()}

                  </div>
                `;
              }).join('')}
            </div>
          `}

        </div>
      ` : ''}

      <!-- ============================================================== -->
      <!-- PESTAÑA 3: DIAGRAMAS OFICIALES (MAPA & ORGANIGRAMA INTERACTIVO + IMÁGENES) -->
      <!-- ============================================================== -->
      ${activeTabProcesos === 'diagramas' ? `
        <div class="space-y-6">

          <!-- DIAGRAMA INTERACTIVO EN VIVO 1: ARQUITECTURA DE MAPA DE PROCESOS -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 mb-5">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-lg">🧭</span>
                  <h3 class="font-black text-base text-slate-900">Diagrama Dinámico del Mapa de Procesos (${processes.length} Procesos Activos)</h3>
                  <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Sincronizado con Caracterización SIPOC</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">Representación estructural en tiempo real de los procesos Estratégicos, Misionales, de Apoyo y de Evaluación de <strong>${empresaActiva.razonSocial}</strong>.</p>
              </div>
              <button onclick="window.cambiarTabProcesos('caracterizacion')" class="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer">
                Ir a Caracterización SIPOC →
              </button>
            </div>

            ${processes.length === 0 ? `
              <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p class="text-xs text-slate-600 font-semibold mb-3">Aún no se han generado procesos para esta empresa.</p>
                <button onclick="window.abrirModalAsistenteMapaIA()" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer">
                  ✨ Generar Mapa de Procesos con IA
                </button>
              </div>
            ` : `
              <div class="space-y-4">
                <!-- Nivel 1: Procesos Estratégicos -->
                <div class="p-4 rounded-2xl bg-purple-50/70 border-2 border-purple-200">
                  <div class="text-[11px] font-black uppercase tracking-wider text-purple-900 mb-2.5 flex items-center justify-between">
                    <span>🎯 1. Procesos Estratégicos y de Dirección (${procsEstrategicos.length})</span>
                    <span class="text-[10px] font-semibold text-purple-700">Planeación & Directrices SG-SST</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${procsEstrategicos.map(p => `
                      <div class="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
                        <span class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-purple-900 text-white">${p.code}</span>
                        <h4 class="font-bold text-xs text-slate-800 mt-1">${p.name}</h4>
                        <p class="text-[10px] text-slate-500 mt-0.5 line-clamp-2">${p.objective || ''}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Nivel 2: Procesos Misionales (Cadena de Valor) -->
                <div class="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-200">
                  <div class="text-[11px] font-black uppercase tracking-wider text-blue-900 mb-2.5 flex items-center justify-between">
                    <span>⚙️ 2. Procesos Misionales / Cadena de Valor (${procsMisionales.length})</span>
                    <span class="text-[10px] font-semibold text-blue-700">Operación Principal & Transformación</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${procsMisionales.map(p => `
                      <div class="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                        <span class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-900 text-white">${p.code}</span>
                        <h4 class="font-bold text-xs text-slate-800 mt-1">${p.name}</h4>
                        <p class="text-[10px] text-slate-500 mt-0.5 line-clamp-2">${p.objective || ''}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Nivel 3 y 4: Apoyo y Evaluación -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div class="p-4 rounded-2xl bg-teal-50/70 border-2 border-teal-200">
                    <div class="text-[11px] font-black uppercase tracking-wider text-teal-900 mb-2.5">
                      🤝 3. Procesos de Apoyo y Soporte (${procsApoyo.length})
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      ${procsApoyo.map(p => `
                        <div class="bg-white p-3 rounded-xl border border-teal-200 shadow-2xs">
                          <span class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-teal-900 text-white">${p.code}</span>
                          <h4 class="font-bold text-xs text-slate-800 mt-1">${p.name}</h4>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <div class="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200">
                    <div class="text-[11px] font-black uppercase tracking-wider text-amber-900 mb-2.5">
                      📊 4. Procesos de Evaluación y Mejora (${procsEvaluacion.length})
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      ${procsEvaluacion.map(p => `
                        <div class="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                          <span class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-900 text-white">${p.code}</span>
                          <h4 class="font-bold text-xs text-slate-800 mt-1">${p.name}</h4>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- DIAGRAMA INTERACTIVO EN VIVO 2: ORGANIGRAMA JERÁRQUICO DINÁMICO -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 mb-5">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-lg">🏛️</span>
                  <h3 class="font-black text-base text-slate-900">Organigrama Jerárquico Dinámico (${cargos.length} Cargos)</h3>
                  <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Conectado a Nómina y Funciones</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">Estructura jerárquica por niveles (Directivo, Profesional, Técnico y Operativo) extraída automáticamente del Catálogo de Cargos.</p>
              </div>
              <button onclick="window.cambiarTabProcesos('cargos')" class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer">
                Ver Catálogo y 6 Docs PDF →
              </button>
            </div>

            ${cargos.length === 0 ? `
              <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p class="text-xs text-slate-600 font-semibold">Aún no hay cargos registrados en el organigrama.</p>
              </div>
            ` : `
              <div class="space-y-4">
                ${['Directivo', 'Profesional', 'Técnico', 'Operativo'].map((nivel, idx) => {
                  const cargosNivel = cargos.filter(c => (c.hierarchy_level || 'Operativo').toLowerCase() === nivel.toLowerCase() || (nivel === 'Técnico' && (c.hierarchy_level || '').toLowerCase() === 'tecnico'));
                  if (cargosNivel.length === 0) return '';
                  const colorBox = nivel === 'Directivo' ? 'border-purple-300 bg-purple-50/60 text-purple-900' :
                                   nivel === 'Profesional' ? 'border-blue-300 bg-blue-50/60 text-blue-900' :
                                   nivel === 'Técnico' ? 'border-teal-300 bg-teal-50/60 text-teal-900' : 'border-slate-300 bg-slate-50 text-slate-800';
                  return `
                    <div class="relative">
                      ${idx > 0 ? `<div class="w-0.5 h-4 bg-slate-300 mx-auto -mt-4 mb-1"></div>` : ''}
                      <div class="p-4 rounded-2xl border ${colorBox}">
                        <div class="text-[10px] font-black uppercase tracking-wider mb-2.5 flex items-center justify-between">
                          <span>Nivel ${idx + 1}: ${nivel} (${cargosNivel.length} cargo${cargosNivel.length > 1 ? 's' : ''})</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          ${cargosNivel.map(c => {
                            const trabs = trabajadores.filter(t => t.job_position_id === c.id || (t.cargo && t.cargo.toLowerCase().trim() === c.title.toLowerCase().trim()));
                            return `
                              <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                <div>
                                  <div class="flex items-center justify-between gap-1">
                                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">${c.code || 'CARG'}</span>
                                    <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">👤 ${trabs.length} en nómina</span>
                                  </div>
                                  <h5 class="font-black text-xs text-slate-900 mt-1.5">${c.title}</h5>
                                  ${trabs.length > 0 ? `<p class="text-[10px] text-slate-500 mt-1 truncate">Titular(es): ${trabs.map(t => t.nombre).join(', ')}</p>` : `<p class="text-[10px] text-amber-600 mt-1">Vacante / Por asignar</p>`}
                                </div>
                                <div class="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                                  <button onclick="window.imprimirManualDeCargo('${c.id}')" class="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer">📄 Manual PDF</button>
                                  <button onclick="window.imprimirPlanTrabajoSeguro('${c.id}')" class="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer">🛡️ PTS Seguro</button>
                                </div>
                              </div>
                            `;
                          }).join('')}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- Visor 1: Mapa General de Procesos -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/70">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-lg">🗺️</span>
                  <h3 class="font-bold text-base text-slate-800">Mapa General de Procesos (GTC 45)</h3>
                  ${(diagMapa || esLadrillos) ? `<span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">✓ Imagen Oficial Aprobada</span>` : ''}
                </div>
                <p class="text-xs text-slate-500 mt-0.5">Enfoque por procesos para la estructuración y valoración del peligro (GTC 45 y Decreto 1072).</p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <label class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  <span>${mapaSrc ? 'Reemplazar Imagen' : 'Subir Imagen'}</span>
                  <input type="file" id="input-subir-mapa-directo" accept="image/*,.svg" class="hidden">
                </label>

                ${mapaSrc ? `
                  <button onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'mapa_procesos')" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs">
                    <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                    <span>Pantalla Completa</span>
                  </button>
                  <a href="${mapaSrc}" download="${empresaActiva.razonSocial}_mapa_procesos.png" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs">
                    <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    <span>Descargar</span>
                  </a>
                ` : ''}
              </div>
            </div>

            <!-- Imagen Central Mapa -->
            <div class="p-6 flex items-center justify-center bg-slate-900/5 min-h-[380px]">
              ${mapaSrc ? `
                <div class="relative group cursor-pointer" onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'mapa_procesos')">
                  <img src="${mapaSrc}" alt="Mapa de Procesos" class="max-w-full max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200 bg-white group-hover:scale-[1.01] transition duration-200">
                  <div class="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                    <span class="bg-white/95 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 shadow-lg flex items-center gap-1.5">
                      🔍 Clic para examinar en alta resolución
                    </span>
                  </div>
                </div>
              ` : `
                <div class="text-center py-12 max-w-md">
                  <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                    🗺️
                  </div>
                  <h4 class="font-bold text-slate-700 text-base">Aún no has cargado la imagen gráfica del Mapa de Procesos</h4>
                  <p class="text-xs text-slate-500 mt-1 mb-4">Sube la imagen del mapa corporativo para respaldar las auditorías de MinTrabajo y ARL.</p>
                  <label class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm inline-flex items-center gap-2">
                    Cargar Mapa de Procesos
                    <input type="file" id="input-subir-mapa-empty" accept="image/*,.svg" class="hidden">
                  </label>
                </div>
              `}
            </div>
          </div>

          <!-- Visor 2: Organigrama y Estructura Organizacional -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/70">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-lg">👥</span>
                  <h3 class="font-bold text-base text-slate-800">Organigrama Oficial en Imagen</h3>
                  ${(diagOrg || esLadrillos) ? `<span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">✓ Estructura Oficial Aprobada</span>` : ''}
                </div>
                <p class="text-xs text-slate-500 mt-0.5">Asignación reglamentaria de roles y responsabilidades en SST (Decreto 1072 de 2015 Art. 2.2.4.6.8).</p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <label class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  <span>${orgSrc ? 'Reemplazar Organigrama' : 'Subir Organigrama'}</span>
                  <input type="file" id="input-subir-org-directo" accept="image/*,.svg" class="hidden">
                </label>

                ${orgSrc ? `
                  <button onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'organigrama')" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs">
                    <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                    <span>Pantalla Completa</span>
                  </button>
                  <a href="${orgSrc}" download="${empresaActiva.razonSocial}_organigrama.png" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs">
                    <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    <span>Descargar</span>
                  </a>
                ` : ''}
              </div>
            </div>

            <!-- Imagen Central Organigrama -->
            <div class="p-6 flex items-center justify-center bg-slate-900/5 min-h-[380px]">
              ${orgSrc ? `
                <div class="relative group cursor-pointer" onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'organigrama')">
                  <img src="${orgSrc}" alt="Organigrama" class="max-w-full max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200 bg-white group-hover:scale-[1.01] transition duration-200">
                  <div class="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                    <span class="bg-white/95 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 shadow-lg flex items-center gap-1.5">
                      🔍 Clic para examinar en alta resolución
                    </span>
                  </div>
                </div>
              ` : `
                <div class="text-center py-12 max-w-md">
                  <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                    👥
                  </div>
                  <h4 class="font-bold text-slate-700 text-base">Aún no has cargado la imagen gráfica del Organigrama</h4>
                  <p class="text-xs text-slate-500 mt-1 mb-4">Sube la imagen del organigrama jerárquico de la empresa para respaldar la asignación de responsabilidades.</p>
                  <label class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm inline-flex items-center gap-2">
                    Cargar Organigrama Ahora
                    <input type="file" id="input-subir-org-empty" accept="image/*,.svg" class="hidden">
                  </label>
                </div>
              `}
            </div>
          </div>

        </div>
      ` : ''}

    </div>
  `;

  // Listeners para diagramas en pestaña 3
  const handleMapaUpload = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await leerArchivoDataUrl(file);
      await evidenceDB.guardarDiagramaEmpresa(empresaActiva.id, 'mapa_procesos', dataUrl, {
        nombre: file.name,
        tamanio: file.size,
        tipo: file.type
      });
      empresaActiva.tieneMapaProcesos = true;
      store.saveToStorage();
      await renderProcessMap();
      if (window.mostrarNotificacion) window.mostrarNotificacion("¡Mapa de Procesos guardado con éxito!", "success");
    } catch (err) {
      alert(`No se pudo cargar la imagen: ${err?.message || err}`);
    }
  };

  const handleOrgUpload = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await leerArchivoDataUrl(file);
      await evidenceDB.guardarDiagramaEmpresa(empresaActiva.id, 'organigrama', dataUrl, {
        nombre: file.name,
        tamanio: file.size,
        tipo: file.type
      });
      empresaActiva.tieneOrganigrama = true;
      store.saveToStorage();
      await renderProcessMap();
      if (window.mostrarNotificacion) window.mostrarNotificacion("¡Organigrama guardado con éxito!", "success");
    } catch (err) {
      alert(`No se pudo cargar la imagen: ${err?.message || err}`);
    }
  };

  document.getElementById('input-subir-mapa-directo')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleMapaUpload(e.target.files[0]);
  });
  document.getElementById('input-subir-mapa-empty')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleMapaUpload(e.target.files[0]);
  });
  document.getElementById('input-subir-org-directo')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleOrgUpload(e.target.files[0]);
  });
  document.getElementById('input-subir-org-empty')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleOrgUpload(e.target.files[0]);
  });
}

// =============================================================================
// FUNCIONES GLOBALES DE NAVEGACIÓN Y CRUD DE PROCESOS / CARGOS
// =============================================================================

window.cambiarTabProcesos = function(tab) {
  activeTabProcesos = tab;
  renderProcessMap();
};
window.cambiarPestanaProcesos = window.cambiarTabProcesos;

window.cambiarFiltroTipoProceso = function(tipo) {
  filtroTipoProceso = tipo;
  renderProcessMap();
};

window.abrirModalAsistenteMapaIA = function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  let modal = document.getElementById('modal-asistente-mapa-ia');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-asistente-mapa-ia';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-purple-200 animate-fade-in">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
              ✨
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900">Diseño Automático de Mapa y SIPOC con IA</h3>
              <p class="text-xs text-purple-600 font-semibold">Generación integral de procesos, actividades PHVA y catálogo de cargos</p>
            </div>
          </div>
          <button onclick="document.getElementById('modal-asistente-mapa-ia').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer">&times;</button>
        </div>

        <div class="my-4 space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            El motor de Inteligencia Artificial analizará el ADN corporativo de <strong class="text-slate-800" id="modal-ia-empresa-nombre"></strong> (actividad económica, flujo operativo e inventario de herramientas) para auto-construir:
          </p>
          <ul class="space-y-1.5 pl-4 list-disc text-slate-700 font-medium">
            <li>Estructura completa de procesos (Estratégicos, Misionales, Apoyo y Evaluación).</li>
            <li>Caracterización SIPOC por proceso (Objetivo, Entradas, Salidas y Requisitos).</li>
            <li>Desglose detallado de actividades en el ciclo <strong>PHVA</strong> (Planear, Hacer, Verificar, Actuar).</li>
            <li>Extracción automática de cargos ejecutores y matching con las herramientas del módulo de activos.</li>
          </ul>
          <div class="bg-purple-50 p-3 rounded-xl border border-purple-200 text-purple-900 text-[11px]">
            ⚡ <em>Nota:</em> Si ya existen procesos registrados, se actualizarán y complementarán manteniendo la integridad de tus registros.
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button onclick="document.getElementById('modal-asistente-mapa-ia').classList.add('hidden')" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
            Cancelar
          </button>
          <button id="btn-ejecutar-ai-map" onclick="window.ejecutarGeneracionMapaIA()" class="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95">
            <span>🤖 Generar Mapa y SIPOC con IA</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('modal-ia-empresa-nombre').innerText = empresaActiva.razonSocial;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

function generarMapaSIPOClocal(empresa) {
  const tenantId = empresa.id;
  const nowIso = new Date().toISOString();
  const mapId = `pmap-${tenantId}-${Date.now()}`;

  const process_map = {
    id: mapId,
    tenant_id: tenantId,
    version: 'v1.0',
    status: 'Vigente',
    approved_by: empresa.representanteLegal || 'Gerencia General',
    approved_at: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const sectorLower = `${empresa.sector || ''} ${empresa.razonSocial || ''} ${empresa.actividadEconomica || ''}`.toLowerCase();
  const esArcillas = sectorLower.includes('ladrill') || sectorLower.includes('arcill') || sectorLower.includes('cerámic') || sectorLower.includes('minería');
  const esInstalaciones = sectorLower.includes('instalacion') || sectorLower.includes('eléctric') || sectorLower.includes('servicios ig') || sectorLower.includes('montaje');

  const procesosDef = [
    {
      code: 'DE-01',
      name: 'Direccionamiento Estratégico y Gobierno Corporativo',
      type: 'Estrategico',
      objective: 'Establecer la planeación estratégica, políticas organizacionales, asignación presupuestal y directrices gerenciales para garantizar la rentabilidad, sostenibilidad y continuidad del negocio.',
      scope: 'Aplica a todas las sedes, proyectos y unidades de negocio de la organización desde la planificación anual hasta la rendición gerencial.',
      leader: 'Gerente General',
      activities: [
        { phase: 'Planear', name: 'Definición de Objetivos y Plan de Inversión', desc: 'Formular las metas estratégicas anuales, presupuestos y recursos para la operación y el SG-SST.', in: 'Balance financiero, análisis DOFA, marco regulatorio', out: 'Plan Estratégico y Presupuesto Oficial Aprobado', routine: 'No_Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Despliegue y Comunicación Directiva', desc: 'Socializar directrices gerenciales y metas organizacionales con líderes de proceso y partes interesadas.', in: 'Plan Estratégico', out: 'Actas de alineación directiva y compromisos', routine: 'Rutinaria', tools: [] },
        { phase: 'Verificar', name: 'Revisión por la Dirección (Decreto 1072 Art. 2.2.4.6.31)', desc: 'Evaluar el desempeño del sistema integral, cumplimiento de metas y eficacia de los controles.', in: 'Informes de gestión, auditorías, estados financieros', out: 'Acta formal de Revisión Gerencial', routine: 'No_Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Toma de Decisiones y Asignación de Recursos de Mejora', desc: 'Ajustar planes estratégicos y aprobar recursos para proyectos de modernización y mitigación de riesgos.', in: 'Hallazgos de revisión gerencial', out: 'Planes de mejora y reasignación de partidas', routine: 'No_Rutinaria', tools: [] }
      ]
    },
    {
      code: 'SG-02',
      name: 'Gestión Integral del SG-SST y Sostenibilidad Ambiental',
      type: 'Estrategico',
      objective: 'Prevenir incidentes, accidentes y enfermedades de origen laboral mediante la identificación oportuna de peligros, valoración de riesgos (GTC 45) y ejecución del plan de trabajo anual bajo la Resolución 0312 de 2019.',
      scope: 'Cubre el 100% de los trabajadores directos, contratistas, proveedores y visitantes en todas las instalaciones y frentes de trabajo de la empresa.',
      leader: 'Coordinador SST',
      activities: [
        { phase: 'Planear', name: 'Elaboración del Plan Anual de Trabajo y Presupuesto SST', desc: 'Diseñar el cronograma normativo anual, programas de vigilancia y capacitaciones reglamentarias.', in: 'Autoevaluación Res. 0312, matriz de peligros previa', out: 'Plan Anual de Trabajo SST firmado por Gerencia', routine: 'No_Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Ejecución de Inducciones, Inspecciones Preoperacionales y Entrega de EPP', desc: 'Verificar condiciones de seguridad en campo, dotar de EPPs certificados e impartir capacitaciones operacionales.', in: 'Fichas de seguridad, matrices de EPP, inventario', out: 'Registros de entrega de EPP, actas de inducción y planillas', routine: 'Rutinaria', tools: [] },
        { phase: 'Verificar', name: 'Medición de Indicadores de SST y Auditoría Interna', desc: 'Monitorear indicadores de estructura, proceso y resultado (frecuencia, severidad y ausentismo laboral).', in: 'Reportes de incidentes, estadísticas de nómina', out: 'Tablero de Control de Indicadores SST', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Implementación de Acciones Correctivas y Preventivas', desc: 'Gestionar no conformidades derivadas de inspecciones, accidentes o auditorías para evitar recurrencias.', in: 'Informes de investigación de accidentes (FURAT)', out: 'Plan de Acciones Correctivas cerrado y verificado', routine: 'Rutinaria', tools: [] }
      ]
    }
  ];

  if (esArcillas) {
    procesosDef.push(
      {
        code: 'OP-01',
        name: 'Extracción, Recepción y Molienda de Arcillas',
        type: 'Misional',
        objective: 'Abastecer, dosificar y triturar materias primas minerales garantizando la granulometría y plasticidad requerida para el proceso cerámico.',
        scope: 'Desde el patio de almacenamiento de arcillas hasta las tolvas de alimentación de la nave de molienda.',
        leader: 'Operario de Molienda y Tolvas',
        activities: [
          { phase: 'Planear', name: 'Inspección Preoperacional de Maquinaria y Patios de Acopio', desc: 'Verificar niveles de tolvas, fajas transportadoras, muelas trituradoras y retroexcavadora.', in: 'Plan de producción diario, reporte previo', out: 'Lista de chequeo preoperacional diligenciada', routine: 'Rutinaria', tools: [] },
          { phase: 'Hacer', name: 'Alimentación de Tolvas y Desintegración de Bloques de Arcilla', desc: 'Operar maquinaria pesada y trituradores mecánicos para homogenizar el material arcilloso.', in: 'Arcilla en bruto, agua de humectación', out: 'Masa desintegrada con granulometría óptima', routine: 'Rutinaria', tools: [] },
          { phase: 'Verificar', name: 'Control de Humedad y Granulometría en Banda', desc: 'Tomar muestras periódicas de arcilla para verificar plasticidad y ausencia de cuerpos extraños.', in: 'Muestra de material triturado', out: 'Ficha de control de calidad de mezcla', routine: 'Rutinaria', tools: [] },
          { phase: 'Actuar', name: 'Ajuste de Dosificación de Agua y Despeje de Muelas', desc: 'Regular caudales de aspersión y realizar paradas seguras para desatascar residuos sólidos.', in: 'Alertas de humedad fuera de rango', out: 'Tolvas balanceadas y flujo continuo', routine: 'Rutinaria', tools: [] }
        ]
      },
      {
        code: 'OP-02',
        name: 'Secado Controlado, Enhorne y Cocción en Horno Túnel',
        type: 'Misional',
        objective: 'Deshidratar progresivamente el ladrillo verde y realizar la sinterización térmica en horno túnel continuo a más de 950°C.',
        scope: 'Comprende los túneles de secado rápido, vagonetas refractarias y el horno túnel.',
        leader: 'Operador de Horno Túnel',
        activities: [
          { phase: 'Planear', name: 'Programación de la Curva de Quema y Ciclos de Avance', desc: 'Establecer rampas de temperatura por zonas (precalentamiento, combustión, enfriamiento).', in: 'Curva térmica estándar, tipo de arcilla', out: 'Parámetros cargados en panel de control', routine: 'Rutinaria', tools: [] },
          { phase: 'Hacer', name: 'Alimentación de Quemadores y Avance de Vagonetas', desc: 'Monitorear la inyección continua de gas/carbón, tiro forzado y empuje hidráulico de las vagonetas.', in: 'Carros secos listos, suministro energético', out: 'Ladrillo sinterizado con alta resistencia mecánica', routine: 'Rutinaria', tools: [] },
          { phase: 'Verificar', name: 'Monitoreo de Termocuplas y Presión de Tiro', desc: 'Registrar cada 30 minutos lecturas térmicas y validar con pirómetro infrarrojo.', in: 'Sensores de temperatura del horno', out: 'Bitácora térmica de cocción firmada', routine: 'Rutinaria', tools: [] },
          { phase: 'Actuar', name: 'Modulación de Quemadores y Atención de Desviaciones Térmicas', desc: 'Corregir mezclas aire-gas para evitar manchas de reducción o sobrecocción.', in: 'Alertas de temperatura fuera de rango', out: 'Horno estabilizado en curva óptima', routine: 'Rutinaria', tools: [] }
        ]
      }
    );
  } else if (esInstalaciones) {
    procesosDef.push({
      code: 'OP-01',
      name: 'Montaje de Redes, Tendido de Tubería e Instalaciones Eléctricas',
      type: 'Misional',
      objective: 'Ejecutar las obras eléctricas en sitio garantizando cero accidentes, conexiones seguras y cumplimiento del cronograma bajo RETIE.',
      scope: 'Naves industriales, tableros de distribución, canalizaciones y acometidas de media y baja tensión.',
      leader: 'Técnico Electricista y Redes',
      activities: [
        { phase: 'Planear', name: 'Permiso de Trabajo Eléctrico y Charla de Seguridad de 5 Minutos', desc: 'Evaluar riesgos de arco eléctrico, verificar bloqueo y etiquetado (LOTO) y estado de EPP dieléctrico.', in: 'Matriz GTC 45, orden de trabajo', out: 'Permiso de trabajo seguro firmado', routine: 'Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Tendido de Cableado, Ranurado y Montaje de Tableros Eléctricos', desc: 'Instalar tubería EMT/conduit, cablear circuitos de potencia e iluminación y peinar tableros.', in: 'Conductores certificados, canalizaciones', out: 'Redes eléctricas cableadas e instaladas', routine: 'Rutinaria', tools: [] },
        { phase: 'Verificar', name: 'Pruebas de Aislamiento (Megado) y Continuidad de Redes', desc: 'Medir resistencia de aislamiento entre fases y tierra para prevenir cortocircuitos.', in: 'Circuitos terminados', out: 'Protocolo de pruebas de megado conforme', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Corrección de Empalmes y Rotulado Definitivo de Circuitos', desc: 'Ajustar bornes con torquímetro y colocar marquillas identificadoras en tableros y tomas.', in: 'Hallazgos de inspección', out: 'Instalación rotulada y lista para energización', routine: 'Rutinaria', tools: [] }
      ]
    });
  } else {
    procesosDef.push({
      code: 'OP-01',
      name: 'Operación Misional, Producción y Prestación del Servicio',
      type: 'Misional',
      objective: 'Planificar y ejecutar las operaciones productivas y misionales cumpliendo los estándares de calidad y seguridad laboral.',
      scope: 'Desde la orden de pedido o servicio hasta la entrega final de conformidad al cliente.',
      leader: 'Coordinador Operativo',
      activities: [
        { phase: 'Planear', name: 'Planificación Técnica y Alistamiento Preoperacional', desc: 'Alistar insumos, herramientas y revisar condiciones seguras antes de iniciar labores.', in: 'Requerimientos del cliente y orden de producción', out: 'Orden de trabajo y checklist preoperacional firmado', routine: 'Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Ejecución de Procesos Operativos y Transformación', desc: 'Desarrollar las actividades principales aplicando controles operativos y uso obligatorio de EPP.', in: 'Materias primas, equipos calibrados', out: 'Producto o servicio ejecutado conforme a especificaciones', routine: 'Rutinaria', tools: [] },
        { phase: 'Verificar', name: 'Control de Calidad y Seguridad en Proceso', desc: 'Validar estándares técnicos de salida y cumplimiento de protocolos de seguridad.', in: 'Producto/servicio en proceso', out: 'Registro de control de calidad aprobado', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Ajuste de Parámetros y Mejora Operativa', desc: 'Corregir desviaciones detectadas durante la operación y optimizar tiempos de respuesta.', in: 'Reportes de inspección', out: 'Proceso estandarizado y liberado', routine: 'Rutinaria', tools: [] }
      ]
    });
  }

  procesosDef.push(
    {
      code: 'AP-01',
      name: 'Gestión del Talento Humano y Contratación Laboral (CST)',
      type: 'Apoyo',
      objective: 'Administrar el ciclo integral del colaborador (selección, vinculación formal, afiliación a seguridad social, inducción E-Learning y bienestar laboral).',
      scope: 'Aplica a todos los aspirantes, trabajadores directos y personal retirado de la organización.',
      leader: 'Asistente Administrativa',
      activities: [
        { phase: 'Planear', name: 'Definición de Perfiles de Cargo y Profesiogramas de Ingreso', desc: 'Estructurar requisitos académicos, competencias y exámenes médicos ocupacionales obligatorios (Res. 2346/2007).', in: 'Catálogo de cargos, manual de funciones', out: 'Profesiograma oficial actualizado', routine: 'No_Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Contratación, Afiliación a Seguridad Social e Inducción SST', desc: 'Suscribir contrato, afiliar a EPS, AFP, ARL y realizar Inducción SG-SST (Capacitación #1).', in: 'Documentos del aspirante, examen de ingreso', out: 'Contrato firmado, formatos DOC-10 y DOC-16 aprobados', routine: 'Rutinaria', tools: [] },
        { phase: 'Verificar', name: 'Control de Vencimientos Contractuales y Competencias', desc: 'Monitorear vigencia de contratos, certificaciones de trabajo seguro y evaluaciones de desempeño.', in: 'Base de datos de personal', out: 'Informe de cumplimiento laboral', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Actualización de Bienestar y Planes de Formación', desc: 'Reforzar competencias del personal según resultados de evaluaciones y necesidades operativas.', in: 'Indicadores de formación', out: 'Plan de bienestar y reentrenamiento ejecutado', routine: 'Rutinaria', tools: [] }
      ]
    },
    {
      code: 'AP-02',
      name: 'Mantenimiento Preventivo y Correctivo de Maquinaria y Equipos',
      type: 'Apoyo',
      objective: 'Asegurar la máxima disponibilidad, confiabilidad y seguridad intrínseca de los equipos productivos mediante planes de mantenimiento preventivo.',
      scope: 'Toda la maquinaria industrial, herramientas manuales, eléctricas, neumáticas e instalaciones locativas.',
      leader: 'Mecánico de Mantenimiento',
      activities: [
        { phase: 'Planear', name: 'Formulación del Plan Maestro de Mantenimiento y Calibraciones', desc: 'Definir periodicidad, fichas técnicas y repuestos críticos para cada equipo del inventario.', in: 'Manuales de fabricante, inventario de herramientas', out: 'Cronograma anual de mantenimiento preventivo', routine: 'No_Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Ejecución de Rutinas de Lubricación, Engrase y Ajustes Mecánicos', desc: 'Aplicar procedimientos de bloqueo/tarjeteo LOTO y realizar intervenciones técnicas preventivas.', in: 'Órdenes de trabajo, lubricantes, repuestos', out: 'Bitácora técnica de mantenimiento diligenciada', routine: 'Rutinaria', tools: [] },
        { phase: 'Verificar', name: 'Pruebas de Arranque Seguro e Inspección Preoperacional', desc: 'Verificar resguardos, paradas de emergencia y ausencia de fugas antes de entregar el equipo.', in: 'Equipos intervenidos', out: 'Acta de liberación segura de equipo', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Actualización de Hoja de Vida y Cierre de Hallazgos', desc: 'Registrar la intervención en la hoja de vida del activo y programar la siguiente fecha preventiva.', in: 'Reporte de mantenimiento finalizado', out: 'Hoja de vida de herramienta actualizada', routine: 'Rutinaria', tools: [] }
      ]
    },
    {
      code: 'EV-01',
      name: 'Auditoría Interna, Rendición de Cuentas y Mejora Continua',
      type: 'Evaluacion',
      objective: 'Evaluar sistemáticamente la conformidad del SG-SST y los procesos corporativos frente a la Resolución 0312 de 2019, generando acciones preventivas y de mejora.',
      scope: 'Todos los procesos estratégicos, misionales y de apoyo de la organización.',
      leader: 'Coordinador SST',
      activities: [
        { phase: 'Planear', name: 'Programa y Plan de Auditorías Internas Anuales', desc: 'Establecer alcance, criterios de auditoría y equipo auditor con participación del COPASST.', in: 'Procedimiento de auditoría, estándares mínimos', out: 'Plan de auditoría formalizado', routine: 'No_Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Ejecución de Auditoría en Campo y Revisión Documental', desc: 'Verificar evidencias físicas y digitales en plataforma, entrevistar personal y registrar hallazgos.', in: 'Listas de verificación Res. 0312, evidencias', out: 'Informe preliminar de hallazgos', routine: 'Rutinaria', tools: [] },
        { phase: 'Verificar', name: 'Informe Oficial de Auditoría y Clasificación de Hallazgos', desc: 'Emitir dictamen con conformidades, no conformidades y oportunidades de mejora.', in: 'Hallazgos consolidados', out: 'Informe de Auditoría Interna entregado a Gerencia', routine: 'No_Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Formulación y Cierre de Planes de Acción', desc: 'Hacer seguimiento al cierre de causas raíz y validar la eficacia de las soluciones adoptadas.', in: 'Planes de acción propuestos', out: 'Certificado de cierre de no conformidades', routine: 'Rutinaria', tools: [] }
      ]
    }
  );

  const existingPositions = (store.data.job_positions || []).filter(j => j.tenant_id === tenantId);
  const cargosMap = {};
  existingPositions.forEach(jp => {
    cargosMap[(jp.title || '').toLowerCase().trim()] = jp;
  });

  const processes = [];
  const process_activities = [];
  const process_activity_positions = [];

  procesosDef.forEach((pdef, pidx) => {
    const pid = `proc-${tenantId}-${String(pidx + 1).padStart(2, '0')}`;
    const leaderKey = pdef.leader.toLowerCase().trim();
    let leaderJp = cargosMap[leaderKey];
    if (!leaderJp) {
      leaderJp = {
        id: `jp-${tenantId}-${Date.now()}-${pidx}`,
        tenant_id: tenantId,
        code: `CARG-${String(Object.keys(cargosMap).length + 1).padStart(3, '0')}`,
        title: pdef.leader,
        hierarchy_level: leaderKey.includes('gerente') ? 'Directivo' : (leaderKey.includes('coordinador') || leaderKey.includes('ingeniero') ? 'Profesional' : 'Operativo'),
        summary_objective: `Liderar y asegurar la adecuada ejecución y control de riesgos en los procesos asignados al cargo de ${pdef.leader}.`,
        required_education: 'Formación técnica, tecnológica o profesional acorde al cargo',
        required_experience: '1 a 2 años de experiencia relacionada',
        required_skills: ['Liderazgo en SST', 'Trabajo seguro', 'Comunicación efectiva'],
        medical_exams_profesiograma: {
          ingreso: ['Examen médico ocupacional con énfasis osteomuscular', 'Visiometría', 'Audiometría'],
          periodico: ['Control anual osteomuscular'],
          egreso: ['Examen médico ocupacional de egreso']
        },
        required_epp_list: ['Casco de seguridad', 'Botas de seguridad con puntera', 'Gafas de seguridad', 'Guantes de protección'],
        is_active: true,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      cargosMap[leaderKey] = leaderJp;
    }

    processes.push({
      id: pid,
      tenant_id: tenantId,
      process_map_id: mapId,
      code: pdef.code,
      name: pdef.name,
      process_type: pdef.type,
      objective: pdef.objective,
      scope: pdef.scope,
      leader_job_position_id: leaderJp.id,
      leader_title: leaderJp.title,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    pdef.activities.forEach((actDef, actIdx) => {
      const actId = `act-${pid}-${actIdx + 1}`;
      process_activities.push({
        id: actId,
        tenant_id: tenantId,
        process_id: pid,
        phva_phase: actDef.phase,
        activity_order: actIdx + 1,
        activity_name: actDef.name,
        description: actDef.desc,
        inputs: actDef.in,
        outputs: actDef.out,
        routine_type: actDef.routine,
        associated_tools_ids: actDef.tools || [],
        createdAt: nowIso,
        updatedAt: nowIso
      });

      process_activity_positions.push({
        id: `pap-${actId}-${leaderJp.id}`,
        tenant_id: tenantId,
        process_activity_id: actId,
        job_position_id: leaderJp.id,
        role_in_activity: actDef.phase === 'Verificar' ? 'Supervisor' : 'Responsable_Ejecutor',
        createdAt: nowIso,
        updatedAt: nowIso
      });
    });
  });

  return {
    ok: true,
    status: 'ok',
    process_map,
    processes,
    process_activities,
    job_positions: Object.values(cargosMap),
    process_activity_positions
  };
}

window.ejecutarGeneracionMapaIA = async function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const btn = document.getElementById('btn-ejecutar-ai-map');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    Diseñando Mapa y SIPOC con IA...
  `;

  try {
    let data = null;
    try {
      const apiUrl = (typeof store.getApiUrl === 'function')
        ? store.getApiUrl('/processes/ai-suggest-map')
        : '/api/processes/ai-suggest-map';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: empresaActiva.id })
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson && (resJson.ok || resJson.status === 'ok')) {
          data = resJson;
        }
      }
    } catch (netErr) {
      console.warn('Usando motor SIPOC local para generación de mapa:', netErr);
    }

    // Si el servidor no tenía sincronizada aún la empresa o falló la petición, generar con motor SIPOC local
    if (!data) {
      data = generarMapaSIPOClocal(empresaActiva);
    }

    const activitiesList = data.process_activities || data.activities || [];

    // Sincronizar en el store local
    if (data.process_map) {
      store.data.process_maps = (store.data.process_maps || []).filter(pm => pm.tenant_id !== empresaActiva.id).concat([data.process_map]);
    }
    if (Array.isArray(data.processes) && data.processes.length > 0) {
      store.data.processes = (store.data.processes || []).filter(p => p.tenant_id !== empresaActiva.id).concat(data.processes);
    }
    if (Array.isArray(activitiesList) && activitiesList.length > 0) {
      store.data.process_activities = (store.data.process_activities || []).filter(a => a.tenant_id !== empresaActiva.id).concat(activitiesList);
    }
    if (Array.isArray(data.job_positions) && data.job_positions.length > 0) {
      store.data.job_positions = (store.data.job_positions || []).filter(j => j.tenant_id !== empresaActiva.id).concat(data.job_positions);
    }
    if (Array.isArray(data.process_activity_positions) && data.process_activity_positions.length > 0) {
      store.data.process_activity_positions = (store.data.process_activity_positions || []).filter(pap => pap.tenant_id !== empresaActiva.id).concat(data.process_activity_positions);
    } else if (Array.isArray(activitiesList) && activitiesList.length > 0 && Array.isArray(data.processes)) {
      const rebuiltPaps = [];
      activitiesList.forEach(act => {
        const proc = data.processes.find(p => p.id === act.process_id);
        if (proc && proc.leader_job_position_id) {
          rebuiltPaps.push({
            id: `pap-${act.id}-${proc.leader_job_position_id}`,
            tenant_id: empresaActiva.id,
            process_activity_id: act.id,
            job_position_id: proc.leader_job_position_id,
            role_in_activity: act.phva_phase === 'Verificar' ? 'Supervisor' : 'Responsable_Ejecutor',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });
      if (rebuiltPaps.length > 0) {
        store.data.process_activity_positions = (store.data.process_activity_positions || []).filter(pap => pap.tenant_id !== empresaActiva.id).concat(rebuiltPaps);
      }
    }
    store.saveToStorage();

    document.getElementById('modal-asistente-mapa-ia')?.classList.add('hidden');
    await renderProcessMap();

    const numProc = (data.processes || []).length;
    const numCargos = (data.job_positions || []).length;
    if (window.mostrarNotificacion) {
      window.mostrarNotificacion(`✨ ¡Mapa de Procesos SIPOC generado con éxito! ${numProc} procesos y ${numCargos} cargos estructurados.`, 'success');
    } else {
      alert(`✨ ¡Mapa de Procesos SIPOC generado con éxito! Se estructuraron ${numProc} procesos, ${activitiesList.length} actividades PHVA y ${numCargos} cargos.`);
    }
  } catch (err) {
    console.error("Error al sugerir mapa con IA:", err);
    alert("No fue posible generar el mapa con IA: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
};

window.abrirModalProceso = function(procesoId = null) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const proceso = procesoId ? store.getProcess(procesoId) : null;
  const cargos = store.getJobPositions(empresaActiva.id);

  let modal = document.getElementById('modal-crud-proceso');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-crud-proceso';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 id="modal-proc-titulo" class="text-base font-black text-slate-800">Nuevo Proceso</h3>
          <button onclick="document.getElementById('modal-crud-proceso').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer">&times;</button>
        </div>

        <form id="form-crud-proceso" class="mt-4 space-y-4">
          <input type="hidden" id="crud-proc-id">
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Código de Proceso *</label>
              <input type="text" id="crud-proc-code" required placeholder="Ej. PM-01" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Proceso *</label>
              <select id="crud-proc-type" required class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="Estratégico">Proceso Estratégico</option>
                <option value="Misional" selected>Proceso Misional (Cadena de Valor)</option>
                <option value="Apoyo">Proceso de Apoyo (Soporte)</option>
                <option value="Evaluación">Proceso de Evaluación / Auditoría</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Proceso *</label>
            <input type="text" id="crud-proc-name" required placeholder="Ej. Extrusión y Moldeo de Piezas" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Objetivo del Proceso *</label>
            <textarea id="crud-proc-objective" rows="2" placeholder="Definir el propósito y alcance del proceso..." class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Entradas Principales (Inputs)</label>
              <input type="text" id="crud-proc-inputs" placeholder="Ej. Arcilla homogenizada, orden de producción" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Salidas Principales (Outputs)</label>
              <input type="text" id="crud-proc-outputs" placeholder="Ej. Ladrillos moldeados, registros de merma" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo Líder / Responsable</label>
            <input type="text" id="crud-proc-leader" placeholder="Ej. Jefe de Planta / Operador Técnico" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onclick="document.getElementById('modal-crud-proceso').classList.add('hidden')" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer">
              Guardar Proceso
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('form-crud-proceso').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('crud-proc-id').value;
      const code = document.getElementById('crud-proc-code').value.trim();
      const name = document.getElementById('crud-proc-name').value.trim();
      const process_type = document.getElementById('crud-proc-type').value;
      const objective = document.getElementById('crud-proc-objective').value.trim();
      const inputs = document.getElementById('crud-proc-inputs').value.trim();
      const outputs = document.getElementById('crud-proc-outputs').value.trim();
      const leader_job_title = document.getElementById('crud-proc-leader').value.trim();

      store.saveProcess({
        id: id || null,
        code,
        name,
        process_type,
        objective,
        inputs,
        outputs,
        leader_job_title
      });

      modal.classList.add('hidden');
      renderProcessMap();
      if (window.mostrarNotificacion) window.mostrarNotificacion("Proceso guardado exitosamente.", "success");
    });
  }

  const titulo = document.getElementById('modal-proc-titulo');
  const inputId = document.getElementById('crud-proc-id');
  const inputCode = document.getElementById('crud-proc-code');
  const inputName = document.getElementById('crud-proc-name');
  const selectType = document.getElementById('crud-proc-type');
  const inputObj = document.getElementById('crud-proc-objective');
  const inputIn = document.getElementById('crud-proc-inputs');
  const inputOut = document.getElementById('crud-proc-outputs');
  const inputLeader = document.getElementById('crud-proc-leader');

  if (proceso) {
    titulo.innerText = `Editar Proceso: ${proceso.code}`;
    inputId.value = proceso.id;
    inputCode.value = proceso.code || '';
    inputName.value = proceso.name || '';
    selectType.value = proceso.process_type || 'Misional';
    inputObj.value = proceso.objective || '';
    inputIn.value = proceso.inputs || '';
    inputOut.value = proceso.outputs || '';
    inputLeader.value = proceso.leader_job_title || '';
  } else {
    titulo.innerText = "Nuevo Proceso de la Empresa";
    inputId.value = '';
    inputCode.value = `PR-${String((store.getProcesses(empresaActiva.id).length + 1)).padStart(2, '0')}`;
    inputName.value = '';
    selectType.value = 'Misional';
    inputObj.value = '';
    inputIn.value = '';
    inputOut.value = '';
    inputLeader.value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.eliminarProcesoDirecto = function(procesoId) {
  const proc = store.getProcess(procesoId);
  if (!proc) return;
  if (confirm(`¿Estás seguro de eliminar el proceso "${proc.code} - ${proc.name}" y todas sus actividades asociadas?`)) {
    store.deleteProcess(procesoId);
    renderProcessMap();
  }
};

window.abrirModalActividad = function(actividadId = null, procesoId = null) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const actividad = actividadId ? (store.data.process_activities || []).find(a => a.id === actividadId) : null;
  const procId = procesoId || (actividad ? actividad.process_id : null);
  const procesos = store.getProcesses(empresaActiva.id);
  const cargos = store.getJobPositions(empresaActiva.id);
  const herramientas = store.getTools(empresaActiva.id);

  let modal = document.getElementById('modal-crud-actividad');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-crud-actividad';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 id="modal-act-titulo" class="text-base font-black text-slate-800">Nueva Actividad PHVA</h3>
          <button onclick="document.getElementById('modal-crud-actividad').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer">&times;</button>
        </div>

        <form id="form-crud-actividad" class="mt-4 space-y-4">
          <input type="hidden" id="crud-act-id">
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proceso Asociado *</label>
              <select id="crud-act-process-id" required class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fase del Ciclo PHVA *</label>
              <select id="crud-act-phva" required class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="Planear">Planear (P)</option>
                <option value="Hacer" selected>Hacer (H)</option>
                <option value="Verificar">Verificar (V)</option>
                <option value="Actuar">Actuar (A)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Actividad *</label>
            <input type="text" id="crud-act-name" required placeholder="Ej. Operación de la máquina extrusora de barro" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción y Pasos Operativos</label>
            <textarea id="crud-act-desc" rows="2" placeholder="Detalla cómo se ejecuta la actividad..." class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Actividad *</label>
              <select id="crud-act-routine" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="true">Rutinaria (Habitual)</option>
                <option value="false">No Rutinaria (Ocasional)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo Ejecutor Principal</label>
              <input type="text" id="crud-act-job-title" placeholder="Ej. Operario de Extrusora" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Herramientas & Equipos Utilizados</label>
            <select id="crud-act-tools" multiple class="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg h-24 focus:ring-2 focus:ring-teal-500 focus:outline-none">
            </select>
            <span class="text-[10px] text-slate-400 mt-1 block">Presiona Ctrl/Cmd para seleccionar varias herramientas</span>
          </div>

          <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onclick="document.getElementById('modal-crud-actividad').classList.add('hidden')" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer">
              Guardar Actividad
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('form-crud-actividad').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('crud-act-id').value;
      const process_id = document.getElementById('crud-act-process-id').value;
      const phva_phase = document.getElementById('crud-act-phva').value;
      const activity_name = document.getElementById('crud-act-name').value.trim();
      const description = document.getElementById('crud-act-desc').value.trim();
      const is_routine = document.getElementById('crud-act-routine').value === 'true';
      const jobTitle = document.getElementById('crud-act-job-title').value.trim();

      const toolsSelect = document.getElementById('crud-act-tools');
      const associated_tools_ids = Array.from(toolsSelect.selectedOptions).map(opt => opt.value);

      const actGuardada = store.saveProcessActivity({
        id: id || null,
        process_id,
        phva_phase,
        activity_name,
        description,
        is_routine,
        associated_tools_ids
      });

      // Propagación automática de cargo
      if (jobTitle) {
        store.propagateActivityPosition(actGuardada.id, jobTitle, 'Responsable_Ejecutor', empresaActiva.id);
      }

      modal.classList.add('hidden');
      renderProcessMap();
      if (window.mostrarNotificacion) window.mostrarNotificacion("Actividad PHVA y propagación de funciones guardadas.", "success");
    });
  }

  // Llenar select de procesos
  const selectProc = document.getElementById('crud-act-process-id');
  selectProc.innerHTML = procesos.map(p => `
    <option value="${p.id}" ${p.id === procId ? 'selected' : ''}>${p.code} - ${p.name}</option>
  `).join('');

  // Llenar select de herramientas
  const selectTools = document.getElementById('crud-act-tools');
  selectTools.innerHTML = herramientas.map(h => `
    <option value="${h.id}">${h.internal_code || 'ACT'} - ${h.exact_name} (${h.brand || 'Genérica'})</option>
  `).join('');

  const titulo = document.getElementById('modal-act-titulo');
  const inputId = document.getElementById('crud-act-id');
  const inputName = document.getElementById('crud-act-name');
  const inputDesc = document.getElementById('crud-act-desc');
  const selectPhva = document.getElementById('crud-act-phva');
  const selectRoutine = document.getElementById('crud-act-routine');
  const inputJobTitle = document.getElementById('crud-act-job-title');

  if (actividad) {
    titulo.innerText = "Editar Actividad PHVA";
    inputId.value = actividad.id;
    inputName.value = actividad.activity_name || '';
    inputDesc.value = actividad.description || '';
    selectPhva.value = actividad.phva_phase || 'Hacer';
    selectRoutine.value = actividad.is_routine ? 'true' : 'false';

    // Obtener cargo ejecutor
    const pap = (store.data.process_activity_positions || []).find(p => p.process_activity_id === actividad.id);
    const c = pap ? cargos.find(cg => cg.id === pap.job_position_id) : null;
    inputJobTitle.value = c ? c.title : '';

    // Marcar herramientas
    Array.from(selectTools.options).forEach(opt => {
      opt.selected = Array.isArray(actividad.associated_tools_ids) && actividad.associated_tools_ids.includes(opt.value);
    });
  } else {
    titulo.innerText = "Nueva Actividad PHVA";
    inputId.value = '';
    inputName.value = '';
    inputDesc.value = '';
    selectPhva.value = 'Hacer';
    selectRoutine.value = 'true';
    inputJobTitle.value = '';
    Array.from(selectTools.options).forEach(opt => { opt.selected = false; });
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.eliminarActividadDirecto = function(actividadId) {
  if (confirm("¿Estás seguro de eliminar esta actividad PHVA?")) {
    store.deleteProcessActivity(actividadId);
    renderProcessMap();
  }
};

window.abrirModalCargo = function(cargoId = null) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const cargo = cargoId ? store.getJobPosition(cargoId) : null;

  let modal = document.getElementById('modal-crud-cargo');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-crud-cargo';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 id="modal-cargo-titulo" class="text-base font-black text-slate-800">Nuevo Cargo</h3>
          <button onclick="document.getElementById('modal-crud-cargo').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer">&times;</button>
        </div>

        <form id="form-crud-cargo" class="mt-4 space-y-4">
          <input type="hidden" id="crud-cargo-id">
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Código del Cargo *</label>
              <input type="text" id="crud-cargo-code" required placeholder="Ej. CARG-001" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nivel Jerárquico *</label>
              <select id="crud-cargo-level" required class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="Directivo">Directivo / Alta Gerencia</option>
                <option value="Profesional">Profesional / Coordinación</option>
                <option value="Técnico">Técnico / Asistencial</option>
                <option value="Operativo" selected>Operativo / Planta</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Título del Cargo *</label>
            <input type="text" id="crud-cargo-title" required placeholder="Ej. Operario de Extrusión y Moldeo" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Propósito / Objetivo General del Cargo *</label>
            <textarea id="crud-cargo-objective" rows="2" placeholder="Garantizar la elaboración de los productos de arcilla conforme a las especificaciones..." class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Educación Requerida *</label>
              <input type="text" id="crud-cargo-education" placeholder="Ej. Bachiller Académico o Técnico" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Experiencia Mínima *</label>
              <input type="text" id="crud-cargo-experience" placeholder="Ej. 1 año en plantas industriales" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Habilidades y Competencias (Separadas por comas)</label>
            <input type="text" id="crud-cargo-skills" placeholder="Ej. Trabajo en equipo, atención al detalle, seguridad industrial, concentración" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onclick="document.getElementById('modal-crud-cargo').classList.add('hidden')" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer">
              Guardar Cargo
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('form-crud-cargo').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('crud-cargo-id').value;
      const code = document.getElementById('crud-cargo-code').value.trim();
      const title = document.getElementById('crud-cargo-title').value.trim();
      const hierarchy_level = document.getElementById('crud-cargo-level').value;
      const summary_objective = document.getElementById('crud-cargo-objective').value.trim();
      const required_education = document.getElementById('crud-cargo-education').value.trim();
      const required_experience = document.getElementById('crud-cargo-experience').value.trim();
      const required_skills = document.getElementById('crud-cargo-skills').value.split(',').map(s => s.trim()).filter(Boolean);

      store.saveJobPosition({
        id: id || null,
        code,
        title,
        hierarchy_level,
        summary_objective,
        required_education,
        required_experience,
        required_skills
      }, empresaActiva.id);

      modal.classList.add('hidden');
      renderProcessMap();
      if (window.mostrarNotificacion) window.mostrarNotificacion("Cargo guardado exitosamente.", "success");
    });
  }

  const titulo = document.getElementById('modal-cargo-titulo');
  const inputId = document.getElementById('crud-cargo-id');
  const inputCode = document.getElementById('crud-cargo-code');
  const inputTitle = document.getElementById('crud-cargo-title');
  const selectLevel = document.getElementById('crud-cargo-level');
  const inputObj = document.getElementById('crud-cargo-objective');
  const inputEdu = document.getElementById('crud-cargo-education');
  const inputExp = document.getElementById('crud-cargo-experience');
  const inputSkills = document.getElementById('crud-cargo-skills');

  if (cargo) {
    titulo.innerText = `Editar Cargo: ${cargo.title}`;
    inputId.value = cargo.id;
    inputCode.value = cargo.code || '';
    inputTitle.value = cargo.title || '';
    selectLevel.value = cargo.hierarchy_level || 'Operativo';
    inputObj.value = cargo.summary_objective || '';
    inputEdu.value = cargo.required_education || '';
    inputExp.value = cargo.required_experience || '';
    inputSkills.value = Array.isArray(cargo.required_skills) ? cargo.required_skills.join(', ') : '';
  } else {
    titulo.innerText = "Nuevo Cargo en la Organización";
    inputId.value = '';
    inputCode.value = `CARG-${String(store.getJobPositions(empresaActiva.id).length + 1).padStart(3, '0')}`;
    inputTitle.value = '';
    selectLevel.value = 'Operativo';
    inputObj.value = '';
    inputEdu.value = 'Bachiller Académico o Técnico';
    inputExp.value = '1 año de experiencia';
    inputSkills.value = 'Trabajo en equipo, seguridad industrial, compromiso';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.eliminarCargoDirecto = function(cargoId) {
  const cargo = store.getJobPosition(cargoId);
  if (!cargo) return;
  if (confirm(`¿Estás seguro de eliminar el cargo "${cargo.title}"?`)) {
    store.deleteJobPosition(cargoId);
    renderProcessMap();
  }
};

// =============================================================================
// GENERADORES DE LOS 6 DOCUMENTOS OFICIALES EN PDF / VENTANA DE IMPRESIÓN
// =============================================================================

function generarCeldaLogoEmpresa(empresa, subtexto = '') {
  const razon = (empresa?.razonSocial || 'EMPRESA CLIENTE').toUpperCase();
  const nit = empresa?.nit ? `NIT: ${empresa.nit}` : '';

  if (empresa?.logoUrl) {
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; text-align: center;">
        <img src="${empresa.logoUrl}" alt="${razon}" style="max-height: 52px; max-width: 145px; object-fit: contain; margin-bottom: 3px;">
        <strong style="font-size: 7.5pt; color: #0f172a; line-height: 1.15; max-width: 160px; word-break: break-word;">${razon}</strong>
        ${nit ? `<span style="font-size: 6.5pt; color: #64748b; line-height: 1.1;">${nit}</span>` : ''}
      </div>
    `;
  }

  const initials = razon.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'SG';
  return `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; text-align: center;">
      <div style="width: 44px; height: 44px; border-radius: 8px; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13pt; margin-bottom: 3px; letter-spacing: 0.5px;">
        ${initials}
      </div>
      <strong style="font-size: 8pt; color: #0f172a; line-height: 1.15; max-width: 160px; word-break: break-word;">${razon}</strong>
      ${nit ? `<span style="font-size: 6.5pt; color: #64748b; line-height: 1.1;">${nit}</span>` : ''}
    </div>
  `;
}

function abrirVentanaImpresion(tituloDoc, htmlBody) {
  const printWin = window.open('', '_blank', 'width=950,height=900,menubar=no,toolbar=no,status=no');
  if (!printWin) {
    alert("Por favor permite las ventanas emergentes (popups) para visualizar e imprimir el documento en PDF.");
    return;
  }

  printWin.document.open();
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${tituloDoc}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px 40px; color: #1e293b; background: #ffffff; line-height: 1.5; font-size: 11pt; }
        .no-print { text-align: right; margin-bottom: 15px; }
        .btn-print { padding: 9px 20px; background: #4338ca; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #0f172a; }
        .header-table td { padding: 8px 12px; border: 1px solid #0f172a; vertical-align: middle; }
        .doc-title { font-size: 13pt; font-weight: 900; text-align: center; color: #0f172a; text-transform: uppercase; margin: 0; }
        .doc-subtitle { font-size: 8.5pt; text-align: center; color: #475569; font-weight: bold; margin-top: 3px; }
        .section-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; page-break-inside: avoid; }
        .section-title { font-size: 10pt; font-weight: 800; color: #1e1b4b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 0; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .field-label { font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
        .field-value { font-size: 9.5pt; font-weight: 600; color: #0f172a; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; font-size: 9pt; }
        table.data-table th { background: #f1f5f9; padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; font-weight: 800; color: #334155; }
        table.data-table td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
        .sig-container { display: flex; justify-content: space-between; margin-top: 40px; page-break-inside: avoid; }
        .sig-block { width: 45%; text-align: center; }
        .sig-line { border-top: 1px solid #0f172a; margin-bottom: 5px; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; background: #e0e7ff; color: #3730a3; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
          @page { margin: 1.5cm; }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
      </div>
      ${htmlBody}
    </body>
    </html>
  `);
  printWin.document.close();
}

// 1. MANUAL ESPECÍFICO DE FUNCIONES Y RESPONSABILIDADES
window.imprimirManualDeCargo = function(cargoId) {
  const empresa = store.getEmpresaActiva();
  const cargo = store.getJobPosition(cargoId);
  if (!empresa || !cargo) return;

  const funcData = store.getJobPositionFunctions(cargoId);
  const configCargo = store.getPerfilCargo(cargo.title, empresa.id);
  const funcionesOp = (configCargo?.manualFunciones?.funcionesOperativas && configCargo.manualFunciones.funcionesOperativas.length > 0)
    ? configCargo.manualFunciones.funcionesOperativas
    : funcData.operativas;
  const respSST = (configCargo?.manualFunciones?.responsabilidadesSST && configCargo.manualFunciones.responsabilidadesSST.length > 0)
    ? configCargo.manualFunciones.responsabilidadesSST
    : funcData.sst;
  const objetivoCargo = cargo.summary_objective || configCargo?.perfil?.objetivo || 'Ejecutar las labores asignadas conforme a los lineamientos operativos, asegurando el cumplimiento estricto del Sistema de Gestión de Seguridad y Salud en el Trabajo.';

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 25%; text-align: center; vertical-align: middle;">
          ${generarCeldaLogoEmpresa(empresa, 'Manual de Funciones')}
        </td>
        <td style="width: 50%;">
          <div class="doc-title">MANUAL ESPECÍFICO DE FUNCIONES Y RESPONSABILIDADES EN SST</div>
          <div class="doc-subtitle">Decreto 1072 de 2015 Art. 2.2.4.6.8 Num. 2 • Res. 0312 de 2019 Est. 1.1.2</div>
        </td>
        <td style="width: 25%; font-size: 8pt; line-height: 1.4;">
          <strong>CÓDIGO:</strong> MN-CARG-${cargo.code}<br>
          <strong>VERSIÓN:</strong> 01<br>
          <strong>FECHA:</strong> ${new Date().toLocaleDateString('es-CO')}<br>
          <strong>EMPRESA:</strong> ${empresa.razonSocial}
        </td>
      </tr>
    </table>

    <div class="section-box">
      <div class="section-title">I. IDENTIFICACIÓN DEL CARGO</div>
      <div class="grid-2">
        <div><div class="field-label">Nombre del Cargo:</div><div class="field-value">${cargo.title}</div></div>
        <div><div class="field-label">Nivel Jerárquico:</div><div class="field-value">${cargo.hierarchy_level}</div></div>
        <div><div class="field-label">Empresa / Razón Social:</div><div class="field-value">${empresa.razonSocial} (NIT: ${empresa.nit})</div></div>
        <div><div class="field-label">Jefe Inmediato:</div><div class="field-value">${cargo.hierarchy_level === 'Directivo' ? 'Junta Directiva / Representante Legal' : 'Líder de Proceso / Gerencia'}</div></div>
      </div>
      <div style="margin-top: 8px;">
        <div class="field-label">Propósito / Objetivo Principal:</div>
        <div class="field-value">${objetivoCargo}</div>
      </div>
    </div>

    <div class="section-box">
      <div class="section-title">II. PROCESOS EN LOS QUE PARTICIPA Y CONTRIBUYE</div>
      <p style="font-size: 9pt; margin: 0 0 8px 0; color: #475569;">
        Conforme a la Arquitectura Guiada por Procesos de la empresa, este cargo opera en las siguientes cadenas de valor:
      </p>
      <div>
        ${funcData.procesos.map(pr => `<span class="badge" style="margin-right: 6px; margin-bottom: 4px;">${pr}</span>`).join('')}
      </div>
    </div>

    <div class="section-box">
      <div class="section-title">III. FUNCIONES OPERATIVAS Y PROCEDIMENTALES (CICLO PHVA)</div>
      <p style="font-size: 8.5pt; color: #475569; margin: 0 0 6px 0;">
        Funciones definidas en el repositorio y caracterizadas por proceso:
      </p>
      <ol style="margin: 0; padding-left: 20px; font-size: 9pt; line-height: 1.6;">
        ${funcionesOp.map(f => `<li>${f}</li>`).join('')}
      </ol>
    </div>

    <div class="section-box">
      <div class="section-title">IV. RESPONSABILIDADES OBLIGATORIAS EN SG-SST (DEC. 1072 ART. 2.2.4.6.10)</div>
      <ul style="margin: 0; padding-left: 20px; font-size: 9pt; line-height: 1.6;">
        ${respSST.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>

    ${funcData.herramientas.length > 0 ? `
      <div class="section-box">
        <div class="section-title">V. ACTIVOS, MAQUINARIA Y HERRAMIENTAS BAJO SU OPERACIÓN O CUSTODIA</div>
        <table class="data-table">
          <thead>
            <tr><th>Código</th><th>Herramienta / Equipo</th><th>Marca & Modelo</th><th>Tipo</th></tr>
          </thead>
          <tbody>
            ${funcData.herramientas.map(h => `
              <tr>
                <td><strong>${h.internal_code || 'ACT'}</strong></td>
                <td>${h.exact_name}</td>
                <td>${h.brand || 'N/A'} ${h.model || ''}</td>
                <td>${h.tool_type || 'Industrial'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <div class="sig-container">
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>${empresa.representanteLegal || 'REPRESENTANTE LEGAL'}</strong><br>
        <span style="font-size: 8pt; color: #64748b;">Empleador / Gerencia General</span>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>TITULAR DEL CARGO</strong><br>
        <span style="font-size: 8pt; color: #64748b;">C.C. ________________________ • Recibido y Aceptado</span>
      </div>
    </div>
  `;

  abrirVentanaImpresion(`Manual_de_Cargo_${cargo.code}`, html);
};

// 2. PERFIL DE CARGO Y REQUISITOS DE COMPETENCIA
window.imprimirPerfilDeCargo = function(cargoId) {
  const empresa = store.getEmpresaActiva();
  const cargo = store.getJobPosition(cargoId);
  if (!empresa || !cargo) return;

  const configCargo = store.getPerfilCargo(cargo.title, empresa.id);
  const educacion = cargo.required_education || configCargo?.perfil?.educacion || 'Bachiller o Técnico';
  const experiencia = cargo.required_experience || configCargo?.perfil?.experiencia || '1 año';
  const formacionSST = configCargo?.perfil?.formacionSST || 'Inducción General y Específica en SG-SST, Curso Virtual de 50/20 Horas en SG-SST y Primeros Auxilios.';
  const competenciasList = (Array.isArray(cargo.required_skills) && cargo.required_skills.length > 0)
    ? cargo.required_skills
    : (configCargo?.perfil?.competencias ? configCargo.perfil.competencias.split(',').map(s => s.trim()).filter(Boolean) : ['Trabajo en equipo', 'Orientación a resultados', 'Compromiso con el autocuidado']);

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 25%; text-align: center; vertical-align: middle;">
          ${generarCeldaLogoEmpresa(empresa, 'Perfil de Cargo')}
        </td>
        <td style="width: 50%;">
          <div class="doc-title">PERFIL DE CARGO Y REQUISITOS DE COMPETENCIA</div>
          <div class="doc-subtitle">Decreto 1072 de 2015 Art. 2.2.4.6.10 • Resolución 0312 Estándar 1.1.3</div>
        </td>
        <td style="width: 25%; font-size: 8pt; line-height: 1.4;">
          <strong>CÓDIGO:</strong> PF-CARG-${cargo.code}<br>
          <strong>VERSIÓN:</strong> 01<br>
          <strong>FECHA:</strong> ${new Date().toLocaleDateString('es-CO')}<br>
          <strong>EMPRESA:</strong> ${empresa.razonSocial}
        </td>
      </tr>
    </table>

    <div class="section-box">
      <div class="section-title">I. ESPECIFICACIÓN DEL PERFIL</div>
      <div class="grid-2">
        <div><div class="field-label">Cargo:</div><div class="field-value">${cargo.title}</div></div>
        <div><div class="field-label">Nivel:</div><div class="field-value">${cargo.hierarchy_level}</div></div>
        <div><div class="field-label">Educación Formal Requerida:</div><div class="field-value">${educacion}</div></div>
        <div><div class="field-label">Experiencia Laboral Mínima:</div><div class="field-value">${experiencia}</div></div>
      </div>
    </div>

    <div class="section-box">
      <div class="section-title">II. CERTIFICACIONES Y FORMACIÓN REGLAMENTARIA EN SST OBLIGATORIA</div>
      <p style="font-size: 9pt; margin: 0 0 8px 0; color: #0f172a; font-weight: 600;">
        ${formacionSST}
      </p>
      <table class="data-table">
        <thead>
          <tr><th>Capacitación / Certificación Legal</th><th>Norma de Referencia</th><th>Periodicidad</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Inducción General y Específica en SG-SST</strong></td>
            <td>Dec. 1072 Art. 2.2.4.6.11</td>
            <td>Al ingreso / Anual</td>
          </tr>
          <tr>
            <td><strong>Curso Virtual de 50 o 20 Horas en SG-SST</strong></td>
            <td>Res. 4927 de 2016</td>
            <td>Cada 3 años</td>
          </tr>
          ${cargo.title.toLowerCase().includes('altura') || cargo.title.toLowerCase().includes('mantenimiento') ? `
            <tr>
              <td><strong>Certificación de Trabajo Seguro en Alturas (Avanzado)</strong></td>
              <td>Resolución 4272 de 2021</td>
              <td>Reentrenamiento Anual</td>
            </tr>
          ` : ''}
          ${cargo.title.toLowerCase().includes('alimento') ? `
            <tr>
              <td><strong>Manipulación Higiénica de Alimentos</strong></td>
              <td>Resolución 2674 de 2013</td>
              <td>Anual</td>
            </tr>
          ` : ''}
          <tr>
            <td><strong>Primeros Auxilios y Evacuación de Emergencias</strong></td>
            <td>Dec. 1072 Art. 2.2.4.6.25</td>
            <td>Anual</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section-box">
      <div class="section-title">III. COMPETENCIAS TÉCNICAS Y HABILIDADES CONDUCTUALES</div>
      <div style="font-size: 9pt; line-height: 1.6;">
        ${competenciasList.map(s => `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="color: #4338ca;">✓</span> <strong>${s}</strong>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="sig-container">
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>RESPONSABLE DEL SG-SST</strong><br>
        <span style="font-size: 8pt; color: #64748b;">Diseño y Validación de Perfil</span>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>GESTIÓN DEL TALENTO HUMANO / GERENCIA</strong><br>
        <span style="font-size: 8pt; color: #64748b;">Aprobación Organizacional</span>
      </div>
    </div>
  `;

  abrirVentanaImpresion(`Perfil_de_Cargo_${cargo.code}`, html);
};

// 3. PLAN DE TRABAJO SEGURO (PTS)
window.imprimirPlanTrabajoSeguro = function(cargoId) {
  const empresa = store.getEmpresaActiva();
  const cargo = store.getJobPosition(cargoId);
  if (!empresa || !cargo) return;

  const funcData = store.getJobPositionFunctions(cargoId);
  const configCargo = store.getPerfilCargo(cargo.title, empresa.id);
  const ptsCfg = configCargo?.pts || {};

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 25%; text-align: center; vertical-align: middle;">
          ${generarCeldaLogoEmpresa(empresa, 'Seguridad Operacional')}
        </td>
        <td style="width: 50%;">
          <div class="doc-title">PROCEDIMIENTO Y PLAN DE TRABAJO SEGURO (PTS)</div>
          <div class="doc-subtitle">Resolución 0312 de 2019 Est. 4.2.1 • Decreto 1072 Art. 2.2.4.6.24</div>
        </td>
        <td style="width: 25%; font-size: 8pt; line-height: 1.4;">
          <strong>CÓDIGO:</strong> PTS-${cargo.code}<br>
          <strong>VERSIÓN:</strong> 01<br>
          <strong>FECHA:</strong> ${new Date().toLocaleDateString('es-CO')}<br>
          <strong>EMPRESA:</strong> ${empresa.razonSocial}
        </td>
      </tr>
    </table>

    <div class="section-box">
      <div class="section-title">I. OBJETIVO, ALCANCE Y PELIGROS EVALUADOS</div>
      <p style="font-size: 9pt; margin: 0 0 6px 0; line-height: 1.5;">
        <strong>${ptsCfg.titulo || `Procedimiento de Trabajo Seguro (PTS) para ${cargo.title}`}:</strong> Estandarizar las buenas prácticas de seguridad, controles preventivos en la fuente, medio e individuo, y métodos seguros de ejecución para el cargo de <strong>${cargo.title}</strong>.
      </p>
      <p style="font-size: 8.5pt; margin: 0; color: #334155;">
        <strong>Peligros Prioritarios Evaluados (GTC 45):</strong> ${Array.isArray(ptsCfg.peligrosEvaluados) ? ptsCfg.peligrosEvaluados.join(' • ') : (ptsCfg.peligrosEvaluados || 'Riesgo Mecánico, Biomecánico y Locativo')}
      </p>
    </div>

    <div class="section-box">
      <div class="section-title">II. FASE 1: PROTOCOLO PREOPERACIONAL OBLIGATORIO (ANTES DE INICIAR LABORES)</div>
      <p style="font-size: 9pt; margin: 0; line-height: 1.5;">
        ${ptsCfg.faseAntes || 'Inspección visual del área de trabajo, inspección preoperacional de herramientas y colocación completa de los Elementos de Protección Personal (EPP).'}
      </p>
    </div>

    <div class="section-box">
      <div class="section-title">III. FASE 2: CONTROLES OPERATIVOS Y PASO A PASO SEGURO (DURANTE LA LABOR)</div>
      <p style="font-size: 9pt; margin: 0 0 8px 0; line-height: 1.5;">
        ${ptsCfg.faseDurante || 'Mantener concentración exclusiva en la labor, aplicar posturas ergonómicas y respetar las guardas de seguridad.'}
      </p>
      <table class="data-table">
        <thead>
          <tr><th style="width: 30%;">Actividad Caracterizada</th><th style="width: 35%;">Riesgos Potenciales</th><th style="width: 35%;">Medida de Control / Procedimiento Seguro</th></tr>
        </thead>
        <tbody>
          ${funcData.operativas.map(act => `
            <tr>
              <td><strong>${act.split(':')[0]}</strong></td>
              <td>Atrapamiento mecánico, sobreesfuerzo biomecánico, contacto eléctrico, proyección de partículas.</td>
              <td>Uso continuo de EPP, mantener manos fuera de la zona de pellizco, pausas activas cada 2 horas, acatar velocidades de diseño.</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section-box">
      <div class="section-title">IV. FASE 3: CIERRE SEGURO, ORDEN Y ASEO (DESPUÉS DE LA LABOR)</div>
      <p style="font-size: 9pt; margin: 0; line-height: 1.5;">
        ${ptsCfg.faseDespues || 'Desenergizar equipos, realizar orden y aseo del puesto y almacenar herramientas en su lugar asignado.'}
      </p>
    </div>

    <div class="section-box" style="border-left: 4px solid #b91c1c;">
      <div class="section-title" style="color: #b91c1c;">V. EMERGENCIAS Y AUTORIDAD DE DETENCIÓN DE TRABAJO (STOP WORK AUTHORITY)</div>
      <p style="font-size: 9pt; margin: 0; line-height: 1.5; color: #7f1d1d;">
        ${ptsCfg.emergencias || `Todo trabajador que desempeñe el cargo de ${cargo.title} tiene el derecho y la obligación ineludible de suspender inmediatamente cualquier maniobra si identifica que las condiciones de seguridad no están garantizadas.`}
      </p>
    </div>

    <div class="sig-container">
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>COORDINADOR DE SST / SUPERVISOR</strong><br>
        <span style="font-size: 8pt; color: #64748b;">Emisión y Divulgación</span>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>TRABAJADOR EJECUTOR</strong><br>
        <span style="font-size: 8pt; color: #64748b;">Firma de Compromiso de Cumplimiento</span>
      </div>
    </div>
  `;

  abrirVentanaImpresion(`PTS_${cargo.code}`, html);
};

// 4. PROFESIOGRAMA Y EXÁMENES MÉDICOS OCUPACIONALES
window.imprimirProfesiograma = function(cargoId) {
  const empresa = store.getEmpresaActiva();
  const cargo = store.getJobPosition(cargoId);
  if (!empresa || !cargo) return;

  const configCargo = store.getPerfilCargo(cargo.title, empresa.id);
  const profCfg = configCargo?.profesiograma || {};

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 25%; text-align: center; vertical-align: middle;">
          ${generarCeldaLogoEmpresa(empresa, 'Medicina del Trabajo')}
        </td>
        <td style="width: 50%;">
          <div class="doc-title">PROFESIOGRAMA Y EXÁMENES MÉDICOS OCUPACIONALES</div>
          <div class="doc-subtitle">Resolución 2346 de 2007 • Decreto 1072 de 2015 Art. 2.2.4.6.22</div>
        </td>
        <td style="width: 25%; font-size: 8pt; line-height: 1.4;">
          <strong>CÓDIGO:</strong> MED-PROF-${cargo.code}<br>
          <strong>VERSIÓN:</strong> 01<br>
          <strong>FECHA:</strong> ${new Date().toLocaleDateString('es-CO')}<br>
          <strong>EMPRESA:</strong> ${empresa.razonSocial}
        </td>
      </tr>
    </table>

    <div class="section-box">
      <div class="section-title">I. DATOS DEL CARGO Y MATRIZ DE EXPOSICIÓN</div>
      <div class="grid-2">
        <div><div class="field-label">Cargo:</div><div class="field-value">${cargo.title}</div></div>
        <div><div class="field-label">Nivel de Riesgo ARL:</div><div class="field-value">Clase ${empresa.claseRiesgo || 'III'}</div></div>
        <div><div class="field-label">Exámenes de Ingreso Definidos:</div><div class="field-value">${profCfg.ingreso || 'Examen médico osteomuscular, Visiometría, Audiometría y Espirometría.'}</div></div>
        <div><div class="field-label">Exámenes Periódicos y PVE:</div><div class="field-value">${profCfg.periodico || 'Control anual osteomuscular y audiometría.'}</div></div>
      </div>
      <div style="margin-top: 8px;">
        <div class="field-label">Exámenes de Egreso / Retiro:</div>
        <div class="field-value">${profCfg.egreso || 'Valoración médica ocupacional de retiro (vigencia 5 días hábiles).'}</div>
      </div>
    </div>

    <div class="section-box">
      <div class="section-title">II. BATERÍA DE EVALUACIONES MÉDICAS OCUPACIONALES</div>
      <table class="data-table">
        <thead>
          <tr><th>Evaluación Médica / Paraclínico</th><th>Ingreso (Preempleo)</th><th>Periódico (Anual)</th><th>Egreso (Retiro)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Examen Médico Osteomuscular con Énfasis en Cargas</strong></td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
          </tr>
          <tr>
            <td><strong>Audiometría Tonal Ocupacional</strong></td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
          </tr>
          <tr>
            <td><strong>Visiometría / Optometría Ocupacional</strong></td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
            <td style="text-align: center; color: #64748b;">Opcional</td>
          </tr>
          <tr>
            <td><strong>Espirometría / Evaluación Respiratoria</strong></td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
            <td style="text-align: center; color: #15803d; font-weight: bold;">OBLIGATORIO</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section-box">
      <div class="section-title">III. CRITERIOS DE RESTRICCIÓN Y CONTRAINDICACIONES MÉDICAS</div>
      <p style="font-size: 9pt; margin: 0; line-height: 1.5;">
        ${profCfg.restricciones || 'Patologías de columna no compensadas, hipoacusia neurosensorial severa sin protección auditiva eficaz o déficit visual severo no corregible.'}
      </p>
    </div>

    <div class="sig-container">
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>MÉDICO ESPECIALISTA EN SST</strong><br>
        <span style="font-size: 8pt; color: #64748b;">Licencia en Salud Ocupacional</span>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>REPRESENTANTE LEGAL</strong><br>
        <span style="font-size: 8pt; color: #64748b;">${empresa.razonSocial}</span>
      </div>
    </div>
  `;

  abrirVentanaImpresion(`Profesiograma_${cargo.code}`, html);
};

// 5. MATRIZ DE ELEMENTOS DE PROTECCIÓN PERSONAL Y DOTACIÓN
window.imprimirMatrizEPP = function(cargoId) {
  const empresa = store.getEmpresaActiva();
  const cargo = store.getJobPosition(cargoId);
  if (!empresa || !cargo) return;

  const configCargo = store.getPerfilCargo(cargo.title, empresa.id);
  const eppCfg = configCargo?.matrizEpp || {};
  const listaEpp = Array.isArray(eppCfg.eppRequeridos)
    ? eppCfg.eppRequeridos
    : (eppCfg.eppRequeridos ? eppCfg.eppRequeridos.split('\n').map(s => s.trim()).filter(Boolean) : []);

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 25%; text-align: center; vertical-align: middle;">
          ${generarCeldaLogoEmpresa(empresa, 'Protección & EPP')}
        </td>
        <td style="width: 50%;">
          <div class="doc-title">MATRIZ DE ELEMENTOS DE PROTECCIÓN PERSONAL Y DOTACIÓN</div>
          <div class="doc-subtitle">Ley 9 de 1979 • Resolución 2400 de 1979 • Código Sustantivo del Trabajo Art. 230</div>
        </td>
        <td style="width: 25%; font-size: 8pt; line-height: 1.4;">
          <strong>CÓDIGO:</strong> EPP-CARG-${cargo.code}<br>
          <strong>VERSIÓN:</strong> 01<br>
          <strong>FECHA:</strong> ${new Date().toLocaleDateString('es-CO')}<br>
          <strong>EMPRESA:</strong> ${empresa.razonSocial}
        </td>
      </tr>
    </table>

    <div class="section-box">
      <div class="section-title">I. ESPECIFICACIÓN DE EPP REQUERIDOS PARA EL CARGO: ${cargo.title}</div>
      ${listaEpp.length > 0 ? `
        <p style="font-size: 9pt; margin: 0 0 8px 0;">
          <strong>Dotación y EPP Definidos en Repositorio:</strong> ${listaEpp.join(' • ')}
        </p>
      ` : ''}
      <p style="font-size: 8.5pt; margin: 0 0 8px 0; color: #475569;">
        <strong>Normas Técnicas Aplicables:</strong> ${eppCfg.normasTecnicas || 'Casco ANSI Z89.1, Gafas ANSI Z87.1, Botas ASTM F2413 / NTC 2396, Guantes EN 388, Protección Auditiva ANSI S3.19.'}
      </p>
      <table class="data-table">
        <thead>
          <tr><th>Región Anatómica</th><th>Elemento de Protección</th><th>Norma / Estándar Técnico</th><th>Reposición Estimada</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Cabeza</strong></td>
            <td>Casco de Seguridad Industrial Tipo I, Clase E (Dieléctrico)</td>
            <td>ANSI Z89.1 / NTC 1523</td>
            <td>Cada 2 años o tras impacto</td>
          </tr>
          <tr>
            <td><strong>Ojos y Rostro</strong></td>
            <td>Gafas de Seguridad con Protección UV y Anti-empañante</td>
            <td>ANSI Z87.1</td>
            <td>Cada 3 meses o por ralladura</td>
          </tr>
          <tr>
            <td><strong>Auditiva</strong></td>
            <td>Protectores Auditivos de Inserción / Tipo Copa (NRR ≥ 25 dB)</td>
            <td>ANSI S3.19</td>
            <td>Mensual (inserción) / Anual (copa)</td>
          </tr>
          <tr>
            <td><strong>Respiratoria</strong></td>
            <td>Mascarilla Autofiltro N95 para Material Particulado y Polvos</td>
            <td>NIOSH N95 / NTC 3852</td>
            <td>Semanal o por saturación</td>
          </tr>
          <tr>
            <td><strong>Manos</strong></td>
            <td>Guantes de Vaqueta / Nitrilo para Trabajo Pesado y Agarre</td>
            <td>EN 388 (4X44)</td>
            <td>Bimestral o por desgaste</td>
          </tr>
          <tr>
            <td><strong>Pies</strong></td>
            <td>Botas de Seguridad con Puntera de Acero o Dieléctrica y Suela Antideslizante</td>
            <td>ASTM F2413 / NTC 2396</td>
            <td>Según cronograma de dotación</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section-box">
      <div class="section-title">II. CRONOGRAMA LEGAL DE DOTACIÓN (ART. 230 CÓDIGO SUSTANTIVO DEL TRABAJO)</div>
      <p style="font-size: 9pt; margin: 0 0 6px 0; color: #0f172a;">
        ${eppCfg.frecuenciaReposicion || 'Dotación legal cada 4 meses (30 de Abril, 31 de Agosto y 20 de Diciembre - Art. 230 CST) y reposición inmediata de EPP por deterioro.'}
      </p>
    </div>

    <div class="sig-container">
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>ENTREGADO POR: ALMACÉN / SST</strong><br>
        <span style="font-size: 8pt; color: #64748b;">Firma Responsable</span>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>RECIBIDO POR: TRABAJADOR</strong><br>
        <span style="font-size: 8pt; color: #64748b;">Compromiso de Uso Obligatorio</span>
      </div>
    </div>
  `;

  abrirVentanaImpresion(`Matriz_EPP_${cargo.code}`, html);
};

// 6. ANEXO CONTRACTUAL DE SST Y NOTIFICACIÓN EXPRESA DE RIESGOS
window.imprimirAnexoContractual = function(cargoId) {
  const empresa = store.getEmpresaActiva();
  const cargo = store.getJobPosition(cargoId);
  if (!empresa || !cargo) return;

  const configCargo = store.getPerfilCargo(cargo.title, empresa.id);
  const anexoCfg = configCargo?.anexoContractual || {};

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 25%; text-align: center; vertical-align: middle;">
          ${generarCeldaLogoEmpresa(empresa, 'Blindaje Jurídico Laboral')}
        </td>
        <td style="width: 50%;">
          <div class="doc-title">ANEXO CONTRACTUAL DE SST Y NOTIFICACIÓN EXPRESA DE RIESGOS</div>
          <div class="doc-subtitle">Código Sustantivo del Trabajo • Dec. 1072 de 2015 Art. 2.2.4.6.15</div>
        </td>
        <td style="width: 25%; font-size: 8pt; line-height: 1.4;">
          <strong>ANEXO AL CONTRATO LABORAL</strong><br>
          <strong>CARGO:</strong> ${cargo.title}<br>
          <strong>FECHA:</strong> ${new Date().toLocaleDateString('es-CO')}<br>
          <strong>EMPRESA:</strong> ${empresa.razonSocial}
        </td>
      </tr>
    </table>

    <div class="section-box">
      <p style="font-size: 9pt; margin: 0; line-height: 1.6; text-align: justify;">
        El presente documento forma parte integral del Contrato Individual de Trabajo celebrado entre la empresa <strong>${empresa.razonSocial}</strong> (NIT: ${empresa.nit}) y el TRABAJADOR contratado para desempeñar el cargo de <strong>${cargo.title}</strong>. En virtud del deber legal de protección del empleador y de obediencia y fidelidad del trabajador:
      </p>
    </div>

    <div class="section-box">
      <div class="section-title">CLÁUSULA PRIMERA: NOTIFICACIÓN DE PELIGROS Y RIESGOS INHERENTES</div>
      <p style="font-size: 9pt; margin: 0 0 6px 0; text-align: justify;">
        El TRABAJADOR declara haber sido informado e instruido expresamente sobre los peligros a los que estará expuesto en el ejercicio de sus funciones, conforme a la Matriz de Identificación de Peligros GTC 45 de la empresa:
      </p>
      <p style="font-size: 9pt; font-weight: bold; color: #0f172a; margin: 0;">
        ${anexoCfg.notificacionRiesgos || 'Riesgo Mecánico, Riesgo Biomecánico, Riesgo Físico y Riesgo Locativo.'}
      </p>
    </div>

    <div class="section-box">
      <div class="section-title">CLÁUSULA SEGUNDA: OBLIGACIONES INELUDIBLES DEL TRABAJADOR EN SST</div>
      <p style="font-size: 8.5pt; line-height: 1.5; margin: 0; text-align: justify;">
        ${anexoCfg.clausulaPrincipal || 'Conforme al Artículo 58 del Código Sustantivo del Trabajo y Decreto 1072 de 2015, el TRABAJADOR se obliga a procurar el cuidado integral de su salud, usar permanentemente los EPP, cumplir los Planes de Trabajo Seguro (PTS) y reportar oportunamente cualquier incidente o peligro.'}
      </p>
    </div>

    <div class="section-box" style="border-left: 4px solid #b91c1c;">
      <div class="section-title" style="color: #b91c1c;">CLÁUSULA TERCERA: RÉGIMEN SANCIONATORIO POR VIOLACIÓN A NORMAS DE SEGURIDAD</div>
      <p style="font-size: 8.5pt; line-height: 1.5; margin: 0; color: #7f1d1d; text-align: justify;">
        ${anexoCfg.regimenSancionatorio || 'El incumplimiento grave de las normas e instrucciones del SG-SST constituye FALTA GRAVE a las obligaciones laborales y configurará JUSTA CAUSA UNILATERAL DE TERMINACIÓN DEL CONTRATO DE TRABAJO conforme al Artículo 62 del Código Sustantivo del Trabajo.'}
      </p>
    </div>

    <div style="font-size: 9pt; margin: 15px 0 30px 0; text-align: justify;">
      En constancia de comprensión, aceptación y notificación, se firma en dos ejemplares del mismo tenor a los ${new Date().getDate()} días del mes de ${new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date())} de ${new Date().getFullYear()}.
    </div>

    <div class="sig-container">
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>${empresa.razonSocial}</strong><br>
        NIT: ${empresa.nit}<br>
        <span style="font-size: 8pt; color: #64748b;">EL EMPLEADOR</span>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <strong>FIRMA DEL TRABAJADOR</strong><br>
        <span>C.C. Nº ________________________</span><br>
        <span style="font-size: 8pt; color: #64748b;">EL TRABAJADOR (Aceptación Expresa)</span>
      </div>
    </div>
  `;

  abrirVentanaImpresion(`Anexo_Contractual_${cargo.code}`, html);
};

// =============================================================================
// GESTIÓN DE ESTRUCTURA Y REPOSITORIO DOCUMENTAL DEL CATÁLOGO DE CARGOS
// (ESTRUCTURA IDÉNTICA A LA EVALUACIÓN DE ESTÁNDARES MÍNIMOS RES. 0312)
// =============================================================================

window.seleccionarDocCatalogoCargo = function(cargoId, docKey) {
  docActivoPorCargo[cargoId] = docKey;
  renderProcessMap();
};

window.guardarEstructuraDocCargo = function(cargoId, docKey) {
  const empresa = store.getEmpresaActiva();
  const cargo = store.getJobPosition(cargoId);
  if (!empresa || !cargo) return;

  const configCargo = store.getPerfilCargo(cargo.title, empresa.id);

  if (docKey === 'manual') {
    const objVal = document.getElementById(`est-manual-obj-${cargoId}`)?.value.trim() || '';
    const opLines = (document.getElementById(`est-manual-op-${cargoId}`)?.value || '')
      .split('\n').map(s => s.trim()).filter(Boolean);
    const sstLines = (document.getElementById(`est-manual-sst-${cargoId}`)?.value || '')
      .split('\n').map(s => s.trim()).filter(Boolean);

    configCargo.perfil = { ...(configCargo.perfil || {}), objetivo: objVal };
    configCargo.manualFunciones = {
      ...(configCargo.manualFunciones || {}),
      funcionesOperativas: opLines,
      responsabilidadesSST: sstLines
    };

    store.saveJobPosition({ ...cargo, summary_objective: objVal }, empresa.id);
  } else if (docKey === 'perfil') {
    const eduVal = document.getElementById(`est-perfil-edu-${cargoId}`)?.value.trim() || '';
    const expVal = document.getElementById(`est-perfil-exp-${cargoId}`)?.value.trim() || '';
    const sstVal = document.getElementById(`est-perfil-sst-${cargoId}`)?.value.trim() || '';
    const compVal = document.getElementById(`est-perfil-comp-${cargoId}`)?.value.trim() || '';

    configCargo.perfil = {
      ...(configCargo.perfil || {}),
      educacion: eduVal,
      experiencia: expVal,
      formacionSST: sstVal,
      competencias: compVal
    };

    store.saveJobPosition({
      ...cargo,
      required_education: eduVal,
      required_experience: expVal,
      required_skills: compVal.split(',').map(s => s.trim()).filter(Boolean)
    }, empresa.id);
  } else if (docKey === 'pts') {
    const tituloVal = document.getElementById(`est-pts-titulo-${cargoId}`)?.value.trim() || '';
    const peligrosVal = (document.getElementById(`est-pts-peligros-${cargoId}`)?.value || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const antesVal = document.getElementById(`est-pts-antes-${cargoId}`)?.value.trim() || '';
    const duranteVal = document.getElementById(`est-pts-durante-${cargoId}`)?.value.trim() || '';
    const despuesVal = document.getElementById(`est-pts-despues-${cargoId}`)?.value.trim() || '';
    const emergVal = document.getElementById(`est-pts-emerg-${cargoId}`)?.value.trim() || '';

    configCargo.pts = {
      ...(configCargo.pts || {}),
      titulo: tituloVal,
      peligrosEvaluados: peligrosVal,
      faseAntes: antesVal,
      faseDurante: duranteVal,
      faseDespues: despuesVal,
      emergencias: emergVal
    };
  } else if (docKey === 'profesiograma') {
    const ingresoVal = document.getElementById(`est-prof-ingreso-${cargoId}`)?.value.trim() || '';
    const periodicoVal = document.getElementById(`est-prof-periodico-${cargoId}`)?.value.trim() || '';
    const egresoVal = document.getElementById(`est-prof-egreso-${cargoId}`)?.value.trim() || '';
    const restricVal = document.getElementById(`est-prof-restric-${cargoId}`)?.value.trim() || '';

    configCargo.profesiograma = {
      ...(configCargo.profesiograma || {}),
      ingreso: ingresoVal,
      periodico: periodicoVal,
      egreso: egresoVal,
      restricciones: restricVal
    };
  } else if (docKey === 'epp') {
    const listaVal = (document.getElementById(`est-epp-lista-${cargoId}`)?.value || '')
      .split('\n').map(s => s.trim()).filter(Boolean);
    const normasVal = document.getElementById(`est-epp-normas-${cargoId}`)?.value.trim() || '';
    const reposVal = document.getElementById(`est-epp-repos-${cargoId}`)?.value.trim() || '';

    configCargo.matrizEpp = {
      ...(configCargo.matrizEpp || {}),
      eppRequeridos: listaVal,
      normasTecnicas: normasVal,
      frecuenciaReposicion: reposVal
    };
  } else if (docKey === 'anexo') {
    const riesgosVal = document.getElementById(`est-anexo-riesgos-${cargoId}`)?.value.trim() || '';
    const clausulaVal = document.getElementById(`est-anexo-clausula-${cargoId}`)?.value.trim() || '';
    const sancionVal = document.getElementById(`est-anexo-sancion-${cargoId}`)?.value.trim() || '';

    configCargo.anexoContractual = {
      ...(configCargo.anexoContractual || {}),
      notificacionRiesgos: riesgosVal,
      clausulaPrincipal: clausulaVal,
      regimenSancionatorio: sancionVal
    };
  }

  store.guardarPerfilCargo(configCargo);
  renderProcessMap();
  if (window.mostrarNotificacion) {
    window.mostrarNotificacion(`Estructura del documento actualizada y almacenada en el repositorio de ${cargo.title}.`, "success");
  }
};

window.agregarFuenteDocCargo = function(cargoTitle, docKey) {
  const empresa = store.getEmpresaActiva();
  if (!empresa) return;
  store.guardarFuenteInstrumento(cargoTitle, docKey, {
    id: `f-${docKey}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    titulo: '',
    url: ''
  }, empresa.id);
  renderProcessMap();
};

window.actualizarFuenteDocCargo = function(cargoTitle, docKey, fuenteId, campo, valor) {
  const empresa = store.getEmpresaActiva();
  if (!empresa) return;
  const fuentes = store.getFuentesInstrumento(cargoTitle, docKey, empresa.id);
  const existente = fuentes.find(f => f.id === fuenteId) || { id: fuenteId, titulo: '', url: '' };
  existente[campo] = (valor || '').trim();
  store.guardarFuenteInstrumento(cargoTitle, docKey, existente, empresa.id);
  renderProcessMap();
};

window.eliminarFuenteDocCargo = function(cargoTitle, docKey, fuenteId) {
  const empresa = store.getEmpresaActiva();
  if (!empresa) return;
  store.eliminarFuenteInstrumento(cargoTitle, docKey, fuenteId, empresa.id);
  renderProcessMap();
};

window.previsualizarFuenteDocCargo = function(url, titulo, cargoTitle, docKey) {
  if (!url) return;
  const docMeta = CATALOGO_6_DOCS_CARGO.find(d => d.key === docKey) || CATALOGO_6_DOCS_CARGO[0];
  abrirVisorEnlaceGuia(
    url,
    `${docMeta.codigo} (${cargoTitle})`,
    titulo || `${docMeta.tituloCompleto} - ${cargoTitle}`,
    docMeta.modoVerificacion
  );
};

window.subirArchivoFuenteDocCargo = async function(cargoTitle, docKey, fuenteId, fileList) {
  const empresa = store.getEmpresaActiva();
  if (!empresa || !fileList || fileList.length === 0) return;

  const file = fileList[0];
  const cargoSlug = slugifyCargo(cargoTitle);
  const numeralTag = `cargo_${cargoSlug}_${docKey}`;

  try {
    await evidenceDB.guardarEvidencia(empresa.id, numeralTag, file);
    const fuentes = store.getFuentesInstrumento(cargoTitle, docKey, empresa.id);
    const existente = fuentes.find(f => f.id === fuenteId);
    if (existente && !existente.titulo) {
      existente.titulo = file.name;
      store.guardarFuenteInstrumento(cargoTitle, docKey, existente, empresa.id);
    }
    await renderProcessMap();
    if (window.mostrarNotificacion) {
      window.mostrarNotificacion(`Archivo "${file.name}" almacenado en el repositorio del cargo.`, "success");
    }
  } catch (err) {
    alert("Error al almacenar el archivo en el repositorio: " + err.message);
  }
};

window.adjuntarArchivoRepositorioCargo = async function(cargoTitle, docKey, fileList) {
  const empresa = store.getEmpresaActiva();
  if (!empresa || !fileList || fileList.length === 0) return;

  const cargoSlug = slugifyCargo(cargoTitle);
  const numeralTag = `cargo_${cargoSlug}_${docKey}`;

  for (let i = 0; i < fileList.length; i++) {
    try {
      await evidenceDB.guardarEvidencia(empresa.id, numeralTag, fileList[i]);
    } catch (err) {
      alert("Error al adjuntar archivo al repositorio: " + err.message);
    }
  }
  await renderProcessMap();
  if (window.mostrarNotificacion) {
    window.mostrarNotificacion("Documento(s) almacenado(s) en el repositorio del cargo.", "success");
  }
};

window.previsualizarEvidenciaCargo = async function(evId) {
  try {
    const ev = await evidenceDB.obtenerEvidenciaPorId(evId);
    if (!ev || !ev.dataUrl) {
      alert("No fue posible recuperar el archivo del repositorio.");
      return;
    }
    abrirVisorDocumento(ev);
  } catch (err) {
    alert("Error al abrir la vista previa: " + err.message);
  }
};

window.descargarEvidenciaCargo = async function(evId) {
  try {
    const ev = await evidenceDB.obtenerEvidenciaPorId(evId);
    if (!ev || !ev.dataUrl) return;
    const link = document.createElement('a');
    link.href = ev.dataUrl;
    link.download = ev.nombre || 'documento_cargo_sst';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert("Error al descargar el documento: " + err.message);
  }
};

window.eliminarEvidenciaCargo = async function(evId) {
  if (!confirm("¿Deseas eliminar este documento del repositorio del cargo?")) return;
  try {
    await evidenceDB.eliminarEvidencia(evId);
    await renderProcessMap();
  } catch (err) {
    alert("Error al eliminar el documento: " + err.message);
  }
};
