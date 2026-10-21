// =============================================================================
// MÓDULO DE GESTIÓN DOCUMENTAL Y BIBLIOTECA PHVA - DOCTOR PYME SG-SST
// Conforme al Decreto 1072 de 2015 (Art. 2.2.4.6.12 y 2.2.4.6.13)
// y Resolución 0312 de 2019
// =============================================================================
import { store } from '../store.js';
import { evidenceDB } from '../db.js';
import { ESTANDARES_RES_0312 } from '../data.js';
import { obtenerEstandaresPorGrupo } from '../standards.js';
import { abrirVisorEnlaceGuia, abrirVisorDocumento, previsualizarEvidencia } from './documentViewer.js';

// Estado local de filtros y visualización
const state = {
  filtroCiclo: 'TODOS',      // 'TODOS' | 'PLANEAR' | 'HACER' | 'VERIFICAR' | 'ACTUAR'
  filtroEstado: 'TODOS',     // 'TODOS' | 'CON_DOCUMENTO' | 'PENDIENTES'
  filtroTipo: 'TODOS',       // 'TODOS' | 'GDOCS' | 'GSHEETS' | 'GDRIVE' | 'ADJUNTO'
  busqueda: '',
  vistaModo: 'tabla'         // 'tabla' | 'tarjetas'
};

/**
 * Genera el código documental oficial sugerido para el SG-SST
 * según la tipología del documento y su ciclo PHVA
 */
function generarCodigoDocumental(numeral, criterio = '', ciclo = 'PLANEAR') {
  const pChar = (ciclo || 'P').charAt(0).toUpperCase();
  const lower = (criterio || '').toLowerCase();
  let prefijo = 'DOC';

  if (lower.includes('política') || lower.includes('politica')) prefijo = 'POL';
  else if (lower.includes('programa') || lower.includes('estilos de vida') || lower.includes('capacitación') || lower.includes('capacitacion')) prefijo = 'PRG';
  else if (lower.includes('matriz') || lower.includes('peligros') || lower.includes('legal')) prefijo = 'MAT';
  else if (lower.includes('plan') || lower.includes('emergencia') || lower.includes('trabajo anual')) prefijo = 'PLA';
  else if (lower.includes('acta') || lower.includes('asignación') || lower.includes('nombramiento')) prefijo = 'ACT';
  else if (lower.includes('perfil') || lower.includes('sociodemografico') || lower.includes('sociodemográfico')) prefijo = 'REG';
  else if (lower.includes('procedimiento') || lower.includes('instructivo')) prefijo = 'PRO';
  else if (lower.includes('informe') || lower.includes('auditoría') || lower.includes('auditoria') || lower.includes('revisión')) prefijo = 'INF';
  else if (lower.includes('registro') || lower.includes('formato') || lower.includes('planilla')) prefijo = 'FOR';

  return `${prefijo}-${pChar}-${numeral}`;
}

/**
 * Detecta el tipo de soporte documental
 */
function detectarTipoSoporte(url, tieneAdjunto = false, esDiagrama = false) {
  if (esDiagrama) {
    return { tipo: 'DIAGRAMA', label: 'Diagrama Oficial', icon: '🖼️', color: 'teal', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
  }
  if (tieneAdjunto && !url) {
    return { tipo: 'ADJUNTO', label: 'Archivo Adjunto', icon: '📎', color: 'indigo', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
  if (!url) {
    return { tipo: 'SIN_DOCUMENTO', label: 'Sin Documento', icon: '⚪', color: 'slate', bg: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
  const u = url.toLowerCase();
  if (u.includes('organigrama') || u.includes('mapa-procesos') || u.includes('mapa_procesos')) {
    return { tipo: 'DIAGRAMA', label: 'Diagrama Oficial', icon: '🖼️', color: 'teal', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
  }
  if (u.includes('docs.google.com/document')) {
    return { tipo: 'GDOCS', label: 'Google Docs', icon: '📄', color: 'blue', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (u.includes('docs.google.com/spreadsheets')) {
    return { tipo: 'GSHEETS', label: 'Google Sheets', icon: '📊', color: 'emerald', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (u.includes('drive.google.com')) {
    return { tipo: 'GDRIVE', label: 'Google Drive', icon: '📁', color: 'amber', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (u.endsWith('.pdf') || u.includes('.pdf?')) {
    return { tipo: 'PDF_WEB', label: 'PDF en Línea', icon: '📕', color: 'red', bg: 'bg-red-50 text-red-700 border-red-200' };
  }
  return { tipo: 'WEB', label: 'Enlace Web', icon: '🔗', color: 'indigo', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
}

/**
 * Obtiene los estilos visuales para cada ciclo PHVA
 */
function getCicloBadge(ciclo) {
  switch ((ciclo || '').toUpperCase()) {
    case 'PLANEAR':
      return { label: 'P - Planear', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    case 'HACER':
      return { label: 'H - Hacer', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    case 'VERIFICAR':
      return { label: 'V - Verificar', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
    case 'ACTUAR':
      return { label: 'A - Actuar', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    default:
      return { label: ciclo, bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  }
}

/**
 * Recopila y consolida todos los registros documentales de la empresa activa y año
 */
async function recopilarDocumentos(empresa, anio) {
  if (!empresa) return [];
  const grupo = empresa.estandaresAplicables || 60;
  const estandares = obtenerEstandaresPorGrupo(grupo);
  const evaluaciones = store.getEvaluacion(empresa.id, anio) || {};

  // Cargar evidencias físicas y diagramas desde IndexedDB y desde la Base de Datos del Store
  let evidenciasAdjuntas = [];
  let diagMapa = null;
  let diagOrg = null;
  try {
    evidenciasAdjuntas = await evidenceDB.obtenerTodasEvidencias(empresa.id);
  } catch (e) {
    console.warn("No se pudieron cargar adjuntos de IndexedDB:", e);
  }
  // Fusionar con las evidencias persistidas en el Store / Servidor Físico
  try {
    const evidenciasStore = store.getEvidencias ? store.getEvidencias(empresa.id, anio) : [];
    evidenciasStore.forEach(ev => {
      if (!evidenciasAdjuntas.some(ea => ea.id === ev.id)) {
        evidenciasAdjuntas.push(ev);
      }
    });
  } catch (eStoreEv) {
    console.warn("Aviso fusionando evidencias de store:", eStoreEv);
  }
  try {
    diagMapa = await evidenceDB.obtenerDiagramaEmpresa(empresa.id, 'mapa_procesos');
    diagOrg = await evidenceDB.obtenerDiagramaEmpresa(empresa.id, 'organigrama');
  } catch (e) {
    console.warn("No se pudieron cargar diagramas de IndexedDB:", e);
  }

  const esLadrillos = (empresa.id === 'emp-004' || empresa.id === 'emp-1790438946268' || (empresa.razonSocial && empresa.razonSocial.toLowerCase().includes('ladrillos ochoa')));
  const tieneOrganigrama = empresa.tieneOrganigrama || !!empresa.organigramaUrl || !!diagOrg || esLadrillos;
  const tieneMapa = empresa.tieneMapaProcesos || !!empresa.mapaProcesosUrl || !!diagMapa || esLadrillos;

  const extraDocumentosFuentes = [];

  const items = estandares.map(est => {
    const resp = evaluaciones[est.numeral] || {};
    let fuentesValidas = [];
    if (Array.isArray(resp.fuentes)) {
      fuentesValidas = resp.fuentes.filter(f => f && (f.url || '').trim());
    }

    const primeraFuente = fuentesValidas.length > 0 ? fuentesValidas[0] : null;
    const linkGuia = (primeraFuente ? primeraFuente.url : (resp.linkGuia || '')).trim();
    const adjuntosNumeral = evidenciasAdjuntas.filter(a => a.numeral === est.numeral);

    // Si hay fuentes adicionales, indexarlas en la biblioteca documental
    if (fuentesValidas.length > 1) {
      fuentesValidas.slice(1).forEach((fuenteExtra, extraIdx) => {
        const extraSoporte = detectarTipoSoporte(fuenteExtra.url, false, false);
        extraDocumentosFuentes.push({
          numeral: est.numeral,
          ciclo: est.ciclo,
          estandar: est.estandar,
          criterio: est.criterio,
          modoVerificacion: est.modoVerificacion,
          peso: est.pesoEfectivo,
          codigoDocumental: `${generarCodigoDocumental(est.numeral, resp.justificacion || est.criterio, est.ciclo)}-F${extraIdx + 2}`,
          tituloDocumento: fuenteExtra.titulo || `${est.criterio} (Fuente ${extraIdx + 2})`,
          linkGuia: fuenteExtra.url,
          esDiagrama: false,
          tipoDiagrama: null,
          companyId: empresa.id,
          adjuntos: [],
          tieneDocumento: true,
          soporte: extraSoporte,
          estadoEvaluacion: resp.estado || 'SIN_EVALUAR',
          updatedAt: resp.updatedAt || null
        });
      });
    }

    let soporteUrl = linkGuia;
    let esDiag = false;
    let diagTipo = null;

    const tieneDocumento = !!soporteUrl || adjuntosNumeral.length > 0;
    const soporte = detectarTipoSoporte(soporteUrl, adjuntosNumeral.length > 0, esDiag);
    const codigo = generarCodigoDocumental(est.numeral, resp.justificacion || est.criterio, est.ciclo);

    // Título legible del documento
    let tituloDocumento = (primeraFuente && primeraFuente.titulo) ? primeraFuente.titulo : (resp.justificacion && resp.justificacion.length > 10 ? resp.justificacion : est.criterio);
    if (est.numeral === '3.1.7.1') {
      tituloDocumento = "Política de prevención y consumo de tabaco, alcohol y sustancias psicoactivas, firmada por el empleador.";
    } else if (est.numeral === '3.1.7.2') {
      tituloDocumento = "Programa de estilos de vida y entornos saludables (Prevención y Promoción de salud Pública)";
    } else if (est.numeral === '1.1.1.3') {
      tituloDocumento = "Acta de nombramiento del responsable del SG-SST firmada por representante legal y profesional SST";
    }

    return {
      numeral: est.numeral,
      ciclo: est.ciclo,
      estandar: est.estandar,
      criterio: est.criterio,
      modoVerificacion: est.modoVerificacion,
      peso: est.pesoEfectivo,
      codigoDocumental: codigo,
      tituloDocumento,
      linkGuia: soporteUrl,
      esDiagrama: esDiag,
      tipoDiagrama: diagTipo,
      companyId: empresa.id,
      adjuntos: adjuntosNumeral,
      tieneDocumento,
      soporte,
      estadoEvaluacion: resp.estado || (esDiag ? 'CUMPLE' : 'SIN_EVALUAR'),
      updatedAt: resp.updatedAt || null
    };
  });

  // Agregar registros oficiales dedicados para Organigrama y Mapa de Procesos en el listado maestro
  const diagramasMaestros = [];
  if (tieneOrganigrama) {
    diagramasMaestros.push({
      numeral: "1.1.2",
      ciclo: "PLANEAR",
      estandar: "Responsabilidades en el SG-SST (Estructura Organizacional)",
      criterio: "Organigrama institucional que define la cadena de mando, roles y responsabilidades en SST (Decreto 1072 Art. 2.2.4.6.8).",
      modoVerificacion: "Constatar organigrama oficial aprobado de la empresa con asignación jerárquica de SST.",
      peso: 0.5,
      codigoDocumental: "DOC-P-ORG",
      tituloDocumento: "Organigrama Institucional y Estructura Organizacional SST Oficial",
      linkGuia: diagOrg?.dataUrl || empresa.organigramaUrl || './assets/organigrama-ladrillos-ochoa.svg',
      adjuntos: [],
      tieneDocumento: true,
      esDiagrama: true,
      tipoDiagrama: 'organigrama',
      companyId: empresa.id,
      soporte: { tipo: 'DIAGRAMA', label: 'Organigrama Oficial', icon: '👥', color: 'purple', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
      estadoEvaluacion: 'CUMPLE',
      updatedAt: diagOrg?.fechaCargue || null
    });
  }

  if (tieneMapa) {
    diagramasMaestros.push({
      numeral: "2.1.1",
      ciclo: "PLANEAR",
      estandar: "Política y Enfoque por Procesos del SG-SST",
      criterio: "Mapa general de procesos que estructura los procesos Estratégicos, Misionales y de Apoyo para la identificación de peligros (GTC 45 y Decreto 1072).",
      modoVerificacion: "Verificar el Mapa de Procesos formalizado de la organización y su articulación con la matriz de riesgos.",
      peso: 1.0,
      codigoDocumental: "DOC-P-MAPA",
      tituloDocumento: "Mapa General de Procesos Oficial de la Organización",
      linkGuia: diagMapa?.dataUrl || empresa.mapaProcesosUrl || './assets/mapa-procesos-ladrillos-ochoa.png',
      adjuntos: [],
      tieneDocumento: true,
      esDiagrama: true,
      tipoDiagrama: 'mapa_procesos',
      companyId: empresa.id,
      soporte: { tipo: 'DIAGRAMA', label: 'Mapa de Procesos', icon: '🗺️', color: 'teal', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
      estadoEvaluacion: 'CUMPLE',
      updatedAt: diagMapa?.fechaCargue || null
    });
  }

  return [...diagramasMaestros, ...items, ...extraDocumentosFuentes];
}

/**
 * Renderizador principal del Módulo de Gestión Documental
 */
export async function renderDocumentation() {
  const container = document.getElementById('main-content');
  if (!container) return;

  const empresaActiva = store.getEmpresaActiva();
  const anioActivo = store.getAnioActivo();
  const aniosDisponibles = store.getAniosDisponibles ? store.getAniosDisponibles(empresaActiva?.id) : ['2025', '2026'];

  if (!empresaActiva) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm border border-slate-200 my-8 animate-fadeIn">
        <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-bold shadow-inner">
          📁
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">Selecciona una Empresa Cliente</h2>
        <p class="text-xs text-slate-500 mb-6 leading-relaxed">
          Para acceder a la Biblioteca y Gestión Documental PHVA, selecciona una empresa en la barra superior.
        </p>
        <button onclick="window.location.hash='#empresas'" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
          Ir a Empresas Clientes
        </button>
      </div>
    `;
    return;
  }

  // Recopilar documentos
  const todosDocs = await recopilarDocumentos(empresaActiva, anioActivo);

  // Estadísticas globales y por ciclo PHVA
  const totalRequisitos = todosDocs.length;
  const conDoc = todosDocs.filter(d => d.tieneDocumento);
  const totalConDoc = conDoc.length;
  const porcentajeCobertura = totalRequisitos > 0 ? Math.round((totalConDoc / totalRequisitos) * 100) : 0;

  // Estadísticas PHVA
  const ciclosStats = ['PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'].map(c => {
    const docsCiclo = todosDocs.filter(d => d.ciclo === c);
    const conDocCiclo = docsCiclo.filter(d => d.tieneDocumento).length;
    const totalCiclo = docsCiclo.length;
    const pct = totalCiclo > 0 ? Math.round((conDocCiclo / totalCiclo) * 100) : 0;
    return { ciclo: c, conDoc: conDocCiclo, total: totalCiclo, pct };
  });

  // Tipología de soportes
  const countGDocs = todosDocs.filter(d => d.soporte.tipo === 'GDOCS').length;
  const countGSheets = todosDocs.filter(d => d.soporte.tipo === 'GSHEETS').length;
  const countGDrive = todosDocs.filter(d => d.soporte.tipo === 'GDRIVE').length;
  const countDiagramas = todosDocs.filter(d => d.soporte.tipo === 'DIAGRAMA' || d.esDiagrama).length;
  const countAdjuntos = todosDocs.filter(d => d.soporte.tipo === 'ADJUNTO' || (d.adjuntos && d.adjuntos.length > 0)).length;

  // Filtrado reactivo de documentos
  let docsFiltrados = todosDocs.filter(item => {
    // Filtro por ciclo
    if (state.filtroCiclo !== 'TODOS' && item.ciclo !== state.filtroCiclo) return false;

    // Filtro por estado
    if (state.filtroEstado === 'CON_DOCUMENTO' && !item.tieneDocumento) return false;
    if (state.filtroEstado === 'PENDIENTES' && item.tieneDocumento) return false;

    // Filtro por tipo de soporte
    if (state.filtroTipo !== 'TODOS') {
      if (state.filtroTipo === 'GDOCS' && item.soporte.tipo !== 'GDOCS') return false;
      if (state.filtroTipo === 'GSHEETS' && item.soporte.tipo !== 'GSHEETS') return false;
      if (state.filtroTipo === 'GDRIVE' && item.soporte.tipo !== 'GDRIVE') return false;
      if (state.filtroTipo === 'DIAGRAMA' && (item.soporte.tipo !== 'DIAGRAMA' && !item.esDiagrama)) return false;
      if (state.filtroTipo === 'ADJUNTO' && item.soporte.tipo !== 'ADJUNTO' && (!item.adjuntos || item.adjuntos.length === 0)) return false;
    }

    // Búsqueda en texto
    if (state.busqueda.trim() !== '') {
      const q = state.busqueda.toLowerCase().trim();
      const matchNumeral = item.numeral.toLowerCase().includes(q);
      const matchCodigo = item.codigoDocumental.toLowerCase().includes(q);
      const matchTitulo = (item.tituloDocumento || '').toLowerCase().includes(q);
      const matchEstandar = (item.estandar || '').toLowerCase().includes(q);
      const matchCriterio = (item.criterio || '').toLowerCase().includes(q);
      return matchNumeral || matchCodigo || matchTitulo || matchEstandar || matchCriterio;
    }

    return true;
  });

  // Render HTML
  container.innerHTML = `
    <div class="space-y-6 pb-12 animate-fadeIn">
      
      <!-- CABECERA PRINCIPAL CON CONTEXTO LEGAL -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                Decreto 1072 de 2015 • Art. 2.2.4.6.12 & 2.2.4.6.13
              </span>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                <span>Vigencia:</span>
                <select onchange="window.cambiarAnioActivo(this.value)" class="bg-indigo-950/90 text-white text-[11px] font-extrabold rounded px-1.5 py-0.5 border border-indigo-400/40 focus:outline-none cursor-pointer">
                  ${aniosDisponibles.map(a => `
                    <option value="${a}" ${a === anioActivo ? 'selected' : ''} class="bg-slate-900 text-white">Año ${a} ${a === '2025' ? '(Inicial)' : ''}</option>
                  `).join('')}
                </select>
              </div>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span class="p-2 rounded-2xl bg-indigo-600/60 border border-indigo-400/40 shadow-inner">📚</span>
              Gestión Documental & Biblioteca PHVA
            </h1>
            <p class="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Repositorio centralizado y <strong>Listado Maestro de Documentos</strong> del SG-SST para <strong class="text-white">${empresaActiva.razonSocial}</strong>. 
              Organizado conforme a la jerarquía de requisitos normativos y el ciclo continuo de mejora.
            </p>
          </div>

          <!-- Acciones Rápidas de Cabecera -->
          <div class="flex flex-wrap items-center gap-2 sm:self-center">
            <button 
              onclick="window.abrirModalIA({ modoInicial: 'politica' })" 
              class="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              title="Redactar Políticas o Procedimientos con Google Gemini"
            >
              <span>✨</span>
              <span>Redactar con IA (Gemini)</span>
            </button>
            <button 
              id="btn-exportar-listado-maestro" 
              onclick="window.docExportarListadoMaestro()" 
              class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              title="Descargar Listado Maestro en formato CSV para auditoría"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>Exportar Listado Maestro (.csv)</span>
            </button>
            <button 
              onclick="window.location.hash='#evaluacion'" 
              class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-2"
              title="Ir a autoevaluación de estándares"
            >
              <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
              <span>Ir a Evaluación 0312</span>
            </button>
          </div>
        </div>
      </div>

      <!-- TABLERO DE MÉTRICAS DE COBERTURA DOCUMENTAL -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Tarjeta 1: Total Documentado -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Documentos Vinculados
            </span>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-slate-800">${totalConDoc}</span>
              <span class="text-xs font-semibold text-slate-400">/ ${totalRequisitos} requisitos</span>
            </div>
            <span class="text-[10px] text-slate-500 mt-1 block">
              ${totalRequisitos - totalConDoc} pendientes por documentar
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold border border-indigo-100 shadow-inner">
            📂
          </div>
        </div>

        <!-- Tarjeta 2: Cobertura Global -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div class="w-full mr-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Cobertura Documental
            </span>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black ${porcentajeCobertura >= 85 ? 'text-emerald-600' : porcentajeCobertura >= 60 ? 'text-amber-600' : 'text-indigo-600'}">
                ${porcentajeCobertura}%
              </span>
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${porcentajeCobertura >= 85 ? 'bg-emerald-100 text-emerald-800' : porcentajeCobertura >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}">
                ${porcentajeCobertura >= 85 ? 'Óptima' : porcentajeCobertura >= 60 ? 'Moderada' : 'En Construcción'}
              </span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 ${porcentajeCobertura >= 85 ? 'bg-emerald-500' : porcentajeCobertura >= 60 ? 'bg-amber-500' : 'bg-indigo-600'}" style="width: ${porcentajeCobertura}%"></div>
            </div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold border border-emerald-100 shadow-inner flex-shrink-0">
            📊
          </div>
        </div>

        <!-- Tarjeta 3: Distribución por Ciclo PHVA -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm col-span-1 sm:col-span-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
            Avance Documental por Ciclo PHVA
          </span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${ciclosStats.map(cs => {
              const b = getCicloBadge(cs.ciclo);
              return `
                <div class="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col justify-between">
                  <div class="flex items-center justify-between gap-1 mb-1">
                    <span class="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1">
                      <span class="w-2 h-2 rounded-full ${b.dot}"></span>
                      ${cs.ciclo}
                    </span>
                    <span class="text-xs font-bold text-slate-800">${cs.pct}%</span>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1">
                    <div class="h-full rounded-full ${b.dot}" style="width: ${cs.pct}%"></div>
                  </div>
                  <span class="text-[9px] text-slate-500">${cs.conDoc} de ${cs.total} docs</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>

      <!-- TIPOLOGÍA DE RECURSOS EN LA NUBE -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <span class="font-bold text-slate-700 flex items-center gap-2">
          <span class="text-indigo-600 font-bold">☁️ Tipología en la Nube:</span>
          <span>Recursos asociados al sistema</span>
        </span>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="window.docFiltrarTipo('GDOCS')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-semibold flex items-center gap-1.5 cursor-pointer transition ${state.filtroTipo === 'GDOCS' ? 'ring-2 ring-blue-500' : ''}">
            <span>📄 Google Docs:</span>
            <strong class="font-extrabold">${countGDocs}</strong>
          </button>
          <button onclick="window.docFiltrarTipo('GSHEETS')" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1.5 cursor-pointer transition ${state.filtroTipo === 'GSHEETS' ? 'ring-2 ring-emerald-500' : ''}">
            <span>📊 Google Sheets:</span>
            <strong class="font-extrabold">${countGSheets}</strong>
          </button>
          <button onclick="window.docFiltrarTipo('GDRIVE')" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold flex items-center gap-1.5 cursor-pointer transition ${state.filtroTipo === 'GDRIVE' ? 'ring-2 ring-amber-500' : ''}">
            <span>📁 Google Drive:</span>
            <strong class="font-extrabold">${countGDrive}</strong>
          </button>
          <button onclick="window.docFiltrarTipo('DIAGRAMA')" class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-semibold flex items-center gap-1.5 cursor-pointer transition ${state.filtroTipo === 'DIAGRAMA' ? 'ring-2 ring-teal-500' : ''}">
            <span>🖼️ Diagramas Oficiales:</span>
            <strong class="font-extrabold">${countDiagramas}</strong>
          </button>
          <button onclick="window.docFiltrarTipo('ADJUNTO')" class="px-2.5 py-1 rounded-lg ${countAdjuntos > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'} border font-semibold flex items-center gap-1.5 cursor-pointer transition ${state.filtroTipo === 'ADJUNTO' ? 'ring-2 ring-indigo-500' : ''}">
            <span>📎 Adjuntos Locales:</span>
            <strong class="font-extrabold">${countAdjuntos}</strong>
          </button>
        </div>
      </div>

      <!-- BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS AVANZADOS -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          <!-- Buscador en tiempo real -->
          <div class="relative flex-1">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              id="doc-input-busqueda" 
              value="${escapeHtml(state.busqueda)}" 
              placeholder="Buscar por código (ej. POL-P-2.1.1), numeral (3.1.7.1), requisito o palabra clave..." 
              oninput="window.docBuscar(this.value)" 
              class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
            ${state.busqueda ? `
              <button onclick="window.docBuscar('')" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
            ` : ''}
          </div>

          <!-- Selector de Modo de Vista (Tabla vs Tarjetas) -->
          <div class="flex items-center bg-slate-100 p-1 rounded-xl self-end md:self-auto border border-slate-200">
            <button 
              onclick="window.docCambiarVista('tabla')" 
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${state.vistaModo === 'tabla' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
              <span>Listado Maestro</span>
            </button>
            <button 
              onclick="window.docCambiarVista('tarjetas')" 
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${state.vistaModo === 'tarjetas' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              <span>Biblioteca Visual</span>
            </button>
          </div>

        </div>

        <!-- Filtros Rápidos (Ciclo PHVA, Estado y Tipología) -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          
          <!-- Filtro Ciclo PHVA -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span class="text-[10px] font-black uppercase text-slate-400 mr-1">Ciclo:</span>
            ${['TODOS', 'PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'].map(c => `
              <button 
                onclick="window.docFiltrarCiclo('${c}')" 
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${state.filtroCiclo === c ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
              >
                ${c === 'TODOS' ? '🌐 Todos los Ciclos' : c}
              </button>
            `).join('')}
          </div>

          <!-- Filtros de Estado y Tipología -->
          <div class="flex items-center gap-2">
            
            <!-- Selector de Estado -->
            <select 
              onchange="window.docFiltrarEstado(this.value)" 
              class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="TODOS" ${state.filtroEstado === 'TODOS' ? 'selected' : ''}>Todos los Estados</option>
              <option value="CON_DOCUMENTO" ${state.filtroEstado === 'CON_DOCUMENTO' ? 'selected' : ''}>🟢 Con Documento Registrado</option>
              <option value="PENDIENTES" ${state.filtroEstado === 'PENDIENTES' ? 'selected' : ''}>⚪ Pendientes de Documentar</option>
            </select>

            <!-- Selector de Tipología -->
            <select 
              onchange="window.docFiltrarTipo(this.value)" 
              class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="TODOS" ${state.filtroTipo === 'TODOS' ? 'selected' : ''}>Todos los Soportes</option>
              <option value="GDOCS" ${state.filtroTipo === 'GDOCS' ? 'selected' : ''}>📄 Google Docs</option>
              <option value="GSHEETS" ${state.filtroTipo === 'GSHEETS' ? 'selected' : ''}>📊 Google Sheets</option>
              <option value="GDRIVE" ${state.filtroTipo === 'GDRIVE' ? 'selected' : ''}>📁 Google Drive</option>
              <option value="DIAGRAMA" ${state.filtroTipo === 'DIAGRAMA' ? 'selected' : ''}>🖼️ Diagramas Oficiales</option>
              <option value="ADJUNTO" ${state.filtroTipo === 'ADJUNTO' ? 'selected' : ''}>📎 Adjuntos Locales</option>
            </select>

          </div>

        </div>

      </div>

      <!-- CONTENEDOR DE RESULTADOS: LISTADO MAESTRO O BIBLIOTECA VISUAL -->
      ${docsFiltrados.length === 0 ? `
        <div class="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div class="text-4xl mb-3">🔍</div>
          <h3 class="text-base font-bold text-slate-700">No se encontraron documentos</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No hay requisitos que coincidan con los filtros seleccionados o el término de búsqueda ingresado.
          </p>
          <button 
            onclick="window.docRestablecerFiltros()" 
            class="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition"
          >
            Restablecer Filtros
          </button>
        </div>
      ` : state.vistaModo === 'tabla' ? `
        <!-- VISTA TABLA: LISTADO MAESTRO OFICIAL PHVA -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-slate-700 uppercase tracking-wider">
                Listado Maestro de Documentos y Registros del SG-SST
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                ${docsFiltrados.length} registros
              </span>
            </div>
            <span class="text-[11px] text-slate-500 hidden sm:inline">
              Decreto 1072/15 Art. 2.2.4.6.12 • Conservación 20 años
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-100/70 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4 w-32">Código</th>
                  <th class="py-3 px-3 w-24">Numeral</th>
                  <th class="py-3 px-3 w-28">Ciclo</th>
                  <th class="py-3 px-4 min-w-[280px]">Nombre del Documento / Requisito</th>
                  <th class="py-3 px-4 w-40">Soporte Técnico</th>
                  <th class="py-3 px-3 w-28">Estado</th>
                  <th class="py-3 px-4 w-44 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${docsFiltrados.map((doc, idx) => {
                  const cb = getCicloBadge(doc.ciclo);
                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}">
                      
                      <!-- Código Documental -->
                      <td class="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        <span class="px-2 py-1 rounded bg-indigo-50 border border-indigo-100 text-[11px]">
                          ${doc.codigoDocumental}
                        </span>
                      </td>

                      <!-- Numeral -->
                      <td class="py-3.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        ${doc.numeral}
                      </td>

                      <!-- Ciclo PHVA -->
                      <td class="py-3.5 px-3 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${cb.bg} inline-flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full ${cb.dot}"></span>
                          ${doc.ciclo}
                        </span>
                      </td>

                      <!-- Título del Documento / Requisito Legal -->
                      <td class="py-3.5 px-4">
                        <div class="font-semibold text-slate-800 text-xs leading-snug">
                          ${escapeHtml(doc.tituloDocumento)}
                        </div>
                        <div class="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title="${escapeHtml(doc.criterio)}">
                          ${escapeHtml(doc.estandar)} • ${escapeHtml(doc.criterio)}
                        </div>
                      </td>

                      <!-- Soporte Técnico (Nube / Local) -->
                      <td class="py-3.5 px-4 whitespace-nowrap">
                        ${doc.tieneDocumento ? `
                          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${doc.soporte.bg}">
                            <span>${doc.soporte.icon}</span>
                            <span>${doc.soporte.label}</span>
                          </div>
                        ` : `
                          <span class="text-[10px] text-slate-400 italic flex items-center gap-1">
                            <span>⚪</span> Sin vincular
                          </span>
                        `}
                      </td>

                      <!-- Estado de Documentación -->
                      <td class="py-3.5 px-3 whitespace-nowrap">
                        ${doc.tieneDocumento ? `
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Documentado
                          </span>
                        ` : `
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Pendiente
                          </span>
                        `}
                      </td>

                      <!-- Acciones -->
                      <td class="py-3.5 px-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          ${doc.esDiagrama ? `
                            <!-- Botón Ver Diagrama -->
                            <button 
                              type="button"
                              onclick="window.abrirVisorDiagrama('${doc.companyId}', '${doc.tipoDiagrama}')" 
                              class="px-2.5 py-1 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition text-xs font-bold flex items-center gap-1 shadow-2xs" 
                              title="Ver Diagrama Oficial en Alta Resolución"
                            >
                              <svg class="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                              <span>Ver</span>
                            </button>
                            <a 
                              href="${doc.linkGuia}" 
                              download="${doc.codigoDocumental}.${doc.tipoDiagrama === 'organigrama' ? 'svg' : 'png'}" 
                              class="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition inline-flex items-center justify-center" 
                              title="Descargar archivo del diagrama oficial"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            </a>
                          ` : doc.linkGuia ? `
                            <!-- Botón Previsualizar -->
                            <button 
                              onclick="window.docAbrirPrevisualizador('${doc.numeral}', '${encodeURIComponent(doc.linkGuia)}', '${encodeURIComponent(doc.tituloDocumento)}')" 
                              class="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition" 
                              title="Previsualizar documento sin salir"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </button>

                            <!-- Botón Abrir en Google Cloud en nueva pestaña -->
                            <a 
                              href="${doc.linkGuia}" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              class="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition inline-flex items-center justify-center" 
                              title="Abrir en Google Cloud ↗"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </a>

                            <!-- Botón Copiar URL -->
                            <button 
                              onclick="window.docCopiarEnlace('${escapeHtml(doc.linkGuia)}', this)" 
                              class="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition" 
                              title="Copiar hipervínculo"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                            </button>
                          ` : doc.adjuntos && doc.adjuntos.length > 0 ? `
                            <!-- Previsualizar evidencia física -->
                            <button 
                              onclick="window.docAbrirAdjunto('${doc.adjuntos[0].id}')" 
                              class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition" 
                              title="Previsualizar archivo adjunto"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </button>
                          ` : ''}

                          <!-- Botón Editar / Vincular Enlace -->
                          <button 
                            onclick="window.docAbrirModalVincular('${doc.numeral}', '${encodeURIComponent(doc.tituloDocumento)}', '${encodeURIComponent(doc.linkGuia || '')}')" 
                            class="px-2 py-1 rounded-lg ${doc.tieneDocumento ? 'text-slate-600 hover:bg-slate-100 border border-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold'} text-[11px] transition flex items-center gap-1"
                            title="${doc.tieneDocumento ? 'Modificar hipervínculo' : 'Vincular documento de Google Docs o Sheets'}"
                          >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            <span>${doc.tieneDocumento ? 'Editar' : '+ Vincular'}</span>
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
      ` : `
        <!-- VISTA TARJETAS: BIBLIOTECA VISUAL POR CICLO PHVA -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          ${docsFiltrados.map(doc => {
            const cb = getCicloBadge(doc.ciclo);
            return `
              <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:shadow-md hover:border-indigo-300 transition-all group">
                <div>
                  
                  <!-- Cabecera de Tarjeta -->
                  <div class="flex items-start justify-between gap-2 mb-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${cb.bg} inline-flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full ${cb.dot}"></span>
                      ${doc.ciclo}
                    </span>
                    <span class="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                      ${doc.codigoDocumental}
                    </span>
                  </div>

                  <!-- Título e Información -->
                  <div class="flex items-start gap-3 mb-2.5">
                    <div class="w-10 h-10 rounded-xl ${doc.soporte.bg} flex items-center justify-center text-xl flex-shrink-0 border">
                      ${doc.soporte.icon}
                    </div>
                    <div class="overflow-hidden">
                      <h4 class="text-xs font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-600 transition" title="${escapeHtml(doc.tituloDocumento)}">
                        ${escapeHtml(doc.tituloDocumento)}
                      </h4>
                      <span class="text-[10px] font-semibold text-slate-400 block mt-0.5">
                        Numeral ${doc.numeral} • ${escapeHtml(doc.estandar)}
                      </span>
                    </div>
                  </div>

                  <!-- Resumen del Criterio -->
                  <p class="text-[11px] text-slate-500 line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100" title="${escapeHtml(doc.criterio)}">
                    ${escapeHtml(doc.criterio)}
                  </p>

                </div>

                <!-- Pie de Tarjeta con Acciones -->
                <div class="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                  <div class="text-[10px] font-bold ${doc.tieneDocumento ? 'text-emerald-700' : 'text-slate-400'}">
                    ${doc.tieneDocumento ? `🟢 ${doc.soporte.label}` : '⚪ Pendiente'}
                  </div>

                  <div class="flex items-center gap-1">
                    ${doc.esDiagrama ? `
                      <button 
                        type="button"
                        onclick="window.abrirVisorDiagrama('${doc.companyId}', '${doc.tipoDiagrama}')" 
                        class="px-2.5 py-1 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition text-[11px] font-bold flex items-center gap-1 shadow-2xs" 
                        title="Ver Diagrama Oficial en Alta Resolución"
                      >
                        <svg class="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        <span>Ver Diagrama</span>
                      </button>
                      <a 
                        href="${doc.linkGuia}" 
                        download="${doc.codigoDocumental}.${doc.tipoDiagrama === 'organigrama' ? 'svg' : 'png'}" 
                        class="p-1 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition inline-flex items-center justify-center" 
                        title="Descargar diagrama"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      </a>
                    ` : doc.linkGuia ? `
                      <button 
                        onclick="window.docAbrirPrevisualizador('${doc.numeral}', '${encodeURIComponent(doc.linkGuia)}', '${encodeURIComponent(doc.tituloDocumento)}')" 
                        class="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition" 
                        title="Previsualizar"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                      </button>
                      <a 
                        href="${doc.linkGuia}" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        class="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition inline-flex items-center justify-center" 
                        title="Abrir en Nube ↗"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                      </a>
                    ` : ''}
                    ${!doc.esDiagrama ? `
                      <button 
                        onclick="window.docAbrirModalVincular('${doc.numeral}', '${encodeURIComponent(doc.tituloDocumento)}', '${encodeURIComponent(doc.linkGuia || '')}')" 
                        class="px-2.5 py-1 rounded-lg ${doc.tieneDocumento ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold'} text-[10px] transition"
                      >
                        ${doc.tieneDocumento ? 'Modificar' : '+ Vincular'}
                      </button>
                    ` : ''}
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `}

    </div>

    <!-- MODAL INTERACTIVO PARA VINCULAR O EDITAR HIPERVÍNCULO DE DOCUMENTO -->
    <div id="modal-doc-vincular" class="fixed inset-0 bg-slate-950/85 hidden items-center justify-center z-50 p-4 animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 transform transition-all">
        
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div class="flex items-center gap-2">
            <span class="p-2 rounded-xl bg-indigo-50 text-indigo-600 text-lg">🔗</span>
            <div>
              <h3 class="text-sm font-bold text-slate-800" id="modal-doc-titulo-header">Vincular Documento Guía</h3>
              <span class="text-[10px] text-slate-400 font-mono" id="modal-doc-numeral-badge">Numeral --</span>
            </div>
          </div>
          <button onclick="window.docCerrarModalVincular()" class="text-slate-400 hover:text-slate-600 text-lg font-bold p-1">
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nombre / Requisito del Documento:</label>
            <div id="modal-doc-nombre-texto" class="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
              --
            </div>
          </div>

          <div>
            <label for="modal-doc-input-url" class="block text-xs font-bold text-slate-700 mb-1">
              Hipervínculo del Documento (Google Docs, Sheets o Drive):
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400">🌐</span>
              <input 
                type="url" 
                id="modal-doc-input-url" 
                placeholder="https://docs.google.com/document/d/... o https://docs.google.com/spreadsheets/d/..." 
                class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
            </div>
            <p class="text-[10px] text-slate-400 mt-1">
              Tip: Puedes pegar el enlace de compartición con permisos de lectura o edición de Google Workspace.
            </p>
          </div>

          <!-- Sugerencia rápida de plantilla de ejemplo si no existe -->
          <div class="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <span class="text-indigo-600 font-bold">💡</span>
            <div class="text-[11px] leading-relaxed">
              El documento vinculado quedará registrado automáticamente en el <strong>Listado Maestro</strong> de la empresa y se sincronizará con la autoevaluación del estándar.
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 pt-5 border-t border-slate-100 mt-5">
          <button 
            type="button" 
            onclick="window.docLimpiarEnlaceDesdeModal()" 
            class="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
          >
            Eliminar Enlace
          </button>
          <div class="flex items-center gap-2">
            <button 
              type="button" 
              onclick="window.docCerrarModalVincular()" 
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button 
              type="button" 
              onclick="window.docConfirmarGuardarEnlace()" 
              class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Guardar Documento
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// =============================================================================
// ACCIONES Y HANDLERS INTERACTIVOS GLOBALES
// =============================================================================

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const win = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});

// Variables temporales del modal
let modalNumeralActivo = null;

win.docFiltrarCiclo = function(ciclo) {
  state.filtroCiclo = ciclo;
  renderDocumentation();
};

win.docFiltrarEstado = function(estado) {
  state.filtroEstado = estado;
  renderDocumentation();
};

win.docFiltrarTipo = function(tipo) {
  state.filtroTipo = tipo;
  renderDocumentation();
};

let docBuscarTimer = null;
win.docBuscar = function(texto) {
  state.busqueda = texto || '';
  if (docBuscarTimer) clearTimeout(docBuscarTimer);
  docBuscarTimer = setTimeout(() => {
    renderDocumentation();
  }, 200);
};

win.docCambiarVista = function(modo) {
  state.vistaModo = modo;
  renderDocumentation();
};

win.docRestablecerFiltros = function() {
  state.filtroCiclo = 'TODOS';
  state.filtroEstado = 'TODOS';
  state.filtroTipo = 'TODOS';
  state.busqueda = '';
  renderDocumentation();
};

/**
 * Abre el visor de documentos para previsualizar inmediatamente en la pantalla
 */
win.docAbrirPrevisualizador = function(numeral, encodedUrl, encodedTitulo) {
  const url = decodeURIComponent(encodedUrl || '');
  const titulo = decodeURIComponent(encodedTitulo || '');
  const empresa = store.getEmpresaActiva();
  if (!url) return;

  abrirVisorEnlaceGuia({
    url,
    numeral,
    criterio: titulo,
    empresaNombre: empresa ? empresa.razonSocial : ''
  });
};

win.docAbrirAdjunto = function(id) {
  previsualizarEvidencia(id);
};

/**
 * Copia el enlace al portapapeles con confirmación visual
 */
win.docCopiarEnlace = function(url, btnElement) {
  if (!url) return;
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      if (btnElement) {
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        `;
        setTimeout(() => {
          btnElement.innerHTML = originalHtml;
        }, 1800);
      }
    }).catch(() => {
      prompt("Copia este enlace de documento:", url);
    });
  } else {
    prompt("Copia este enlace de documento:", url);
  }
};

/**
 * Control del Modal de Vinculación / Edición de Documento
 */
win.docAbrirModalVincular = function(numeral, encodedTitulo, encodedUrl) {
  modalNumeralActivo = numeral;
  const titulo = decodeURIComponent(encodedTitulo || '');
  const url = decodeURIComponent(encodedUrl || '');

  const modal = document.getElementById('modal-doc-vincular');
  const badgeEl = document.getElementById('modal-doc-numeral-badge');
  const nombreEl = document.getElementById('modal-doc-nombre-texto');
  const inputEl = document.getElementById('modal-doc-input-url');

  if (badgeEl) badgeEl.textContent = `Requisito Numeral ${numeral}`;
  if (nombreEl) nombreEl.textContent = titulo;
  if (inputEl) inputEl.value = url;

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (inputEl) inputEl.focus();
  }
};

win.docCerrarModalVincular = function() {
  const modal = document.getElementById('modal-doc-vincular');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  modalNumeralActivo = null;
};

win.docConfirmarGuardarEnlace = function() {
  if (!modalNumeralActivo) return;
  const inputEl = document.getElementById('modal-doc-input-url');
  const nuevoUrl = (inputEl ? inputEl.value : '').trim();

  const empresa = store.getEmpresaActiva();
  const anio = store.getAnioActivo();
  if (!empresa) return;

  const evaluacion = store.getEvaluacion(empresa.id, anio);
  const actual = evaluacion[modalNumeralActivo] || {};

  store.saveEvaluacionItem(empresa.id, anio, modalNumeralActivo, {
    ...actual,
    linkGuia: nuevoUrl,
    // Si aún estaba sin evaluar y ahora le adjuntamos documento, facilitamos el flujo
    estado: actual.estado && actual.estado !== 'SIN_EVALUAR' ? actual.estado : 'CUMPLE'
  });

  win.docCerrarModalVincular();
  renderDocumentation();
};

win.docLimpiarEnlaceDesdeModal = function() {
  if (!modalNumeralActivo) return;
  if (!confirm("¿Deseas eliminar el enlace a este documento?")) return;

  const empresa = store.getEmpresaActiva();
  const anio = store.getAnioActivo();
  if (!empresa) return;

  const evaluacion = store.getEvaluacion(empresa.id, anio);
  const actual = evaluacion[modalNumeralActivo] || {};

  store.saveEvaluacionItem(empresa.id, anio, modalNumeralActivo, {
    ...actual,
    linkGuia: ''
  });

  win.docCerrarModalVincular();
  renderDocumentation();
};

/**
 * Exporta el Listado Maestro oficial de Documentos en CSV estructurado
 */
win.docExportarListadoMaestro = async function() {
  const empresa = store.getEmpresaActiva();
  const anio = store.getAnioActivo();
  if (!empresa) return;

  const docs = await recopilarDocumentos(empresa, anio);

  let csv = "\uFEFF"; // BOM para caracteres UTF-8 en Microsoft Excel
  csv += "LISTADO MAESTRO DE DOCUMENTOS Y REGISTROS DEL SG-SST\n";
  csv += `Empresa:;${empresa.razonSocial.replace(/;/g, ' ')}\n`;
  csv += `NIT:;${(empresa.nit || '').replace(/;/g, ' ')}\n`;
  csv += `Vigencia:;${anio}\n`;
  csv += `Fecha de Emisión:;${new Date().toLocaleDateString()}\n`;
  csv += `Marco Normativo:;Decreto 1072 de 2015 Art. 2.2.4.6.12 y Resolucion 0312 de 2019\n\n`;

  // Encabezados de columnas
  csv += "Codigo Documental;Ciclo PHVA;Numeral Res. 0312;Nombre del Documento / Registro;Estandar Asociado;Tipo de Soporte;Estado de Documentacion;Hipervinculo o Soportes;Ultima Actualizacion\n";

  docs.forEach(d => {
    const enlace = d.linkGuia || (d.adjuntos && d.adjuntos.length > 0 ? `Adjunto local: ${d.adjuntos[0].nombre}` : 'Sin soporte cargado');
    const fecha = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : 'Pendiente';
    const estado = d.tieneDocumento ? 'VIGENTE / DOCUMENTADO' : 'PENDIENTE';

    csv += `"${d.codigoDocumental}";`;
    csv += `"${d.ciclo}";`;
    csv += `"${d.numeral}";`;
    csv += `"${(d.tituloDocumento || '').replace(/"/g, '""').replace(/;/g, ',')}";`;
    csv += `"${(d.estandar || '').replace(/"/g, '""').replace(/;/g, ',')}";`;
    csv += `"${d.soporte.label}";`;
    csv += `"${estado}";`;
    csv += `"${enlace.replace(/"/g, '""')}";`;
    csv += `"${fecha}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (empresa.razonSocial || 'Empresa').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `Listado_Maestro_Documentos_SGSST_${safeName}_${anio}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
