// =============================================================================
// COMPONENTE: GENERADOR DE REPORTES OFICIALES E IMPRIMIBLES (PDF) - DOCTOR PYME
// =============================================================================
import { store } from '../store.js';
import { obtenerEstandaresPorGrupo, calcularPuntaje, formatPeso } from '../standards.js';
import { evidenceDB } from '../db.js';
import { previsualizarEvidencia } from './documentViewer.js';

let tipoReporte = '0312'; // '0312', 'GTC45', 'PAT', 'ATEL'

export async function renderReports() {
  const container = document.getElementById('main-content');
  const empresaActiva = store.getEmpresaActiva();

  if (!empresaActiva) {
    container.innerHTML = `
      <div class="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto">
        <h2 class="text-xl font-bold text-slate-800">Selecciona una Empresa Cliente</h2>
        <p class="text-sm text-slate-500 mt-2">Para generar informes oficiales con membrete debes seleccionar una empresa.</p>
        <button onclick="window.location.hash='#empresas'" class="mt-5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
          Ver Empresas
        </button>
      </div>
    `;
    return;
  }

  const anioActivo = store.getAnioActivo();
  const aniosDisponibles = store.getAniosDisponibles(empresaActiva.id);
  const estandares = obtenerEstandaresPorGrupo(empresaActiva.estandaresAplicables);
  const evaluacion = store.getEvaluacion(empresaActiva.id, anioActivo);
  const resultadoEval = calcularPuntaje(evaluacion, estandares);
  const matriz = store.getMatriz(empresaActiva.id);
  const plan = store.getPlanTrabajo(empresaActiva.id);
  const accidentes = store.getAccidentes(empresaActiva.id);

  // Evidencias adjuntas desde IndexedDB y Store filtradas por vigencia activa
  const todasEvidencias = await evidenceDB.obtenerTodasEvidencias(empresaActiva.id, anioActivo);
  try {
    const evidenciasStore = store.getEvidencias ? store.getEvidencias(empresaActiva.id, anioActivo) : [];
    evidenciasStore.forEach(ev => {
      if (!todasEvidencias.some(e => e.id === ev.id)) todasEvidencias.push(ev);
    });
  } catch (eStore) {
    console.warn("Aviso fusionando evidencias de store en reportes:", eStore);
  }

  const evidenciasPorNumeral = {};
  todasEvidencias.forEach(ev => {
    if (!ev || !ev.numeral || ev.numeral.startsWith('__DIAGRAMA_')) return;
    if (!evidenciasPorNumeral[ev.numeral]) evidenciasPorNumeral[ev.numeral] = [];
    evidenciasPorNumeral[ev.numeral].push(ev);
  });

  // Asegurar que archivos adjuntos de la evaluación del año activo se muestren
  Object.keys(evaluacion).forEach(numeral => {
    const item = evaluacion[numeral];
    if (item && item.archivoAdjunto && item.archivoAdjunto.url) {
      if (!evidenciasPorNumeral[numeral]) evidenciasPorNumeral[numeral] = [];
      const adj = item.archivoAdjunto;
      if (!evidenciasPorNumeral[numeral].some(e => e.url === adj.url || e.nombre === adj.nombre)) {
        evidenciasPorNumeral[numeral].push({
          id: adj.id || `adj-${numeral}`,
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

  // Diagramas de la empresa para informes técnicos
  let diagMapa = null;
  let diagOrg = null;
  try {
    diagMapa = await evidenceDB.obtenerDiagramaEmpresa(empresaActiva.id, 'mapa_procesos');
    diagOrg = await evidenceDB.obtenerDiagramaEmpresa(empresaActiva.id, 'organigrama');
  } catch (e) {
    console.error("Error consultando diagramas para reporte:", e);
  }
  const mapaSrc = diagMapa?.dataUrl || (['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-1790438946268'].includes(empresaActiva.id) ? './assets/sample-mapa-procesos.svg' : null);
  const orgSrc = diagOrg?.dataUrl || (['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-1790438946268'].includes(empresaActiva.id) ? './assets/sample-organigrama.svg' : null);

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Selector de Reporte y Botón de Impresión (No Imprimible) -->
      <div class="no-print bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold uppercase">Doctor Pyme</span>
            <span class="text-xs text-slate-400 font-semibold">• Centro de Informes Legales</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-800 mt-1">Informes Oficiales de Auditoría SG-SST</h1>
          <p class="text-sm text-slate-500">Documentos con formato reglamentario, listos para auditorías del MinTrabajo o ARL.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Filtro de Año en Reportes -->
          <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <span class="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">📅 Vigencia:</span>
            <select id="select-anio-reporte" onchange="window.cambiarAnioActivo(this.value)" class="bg-transparent text-xs font-black text-indigo-900 focus:outline-none cursor-pointer">
              ${aniosDisponibles.map(a => `<option value="${a}" ${a === anioActivo ? 'selected' : ''}>Año ${a} ${a === '2025' ? '(Inicial)' : ''}</option>`).join('')}
            </select>
          </div>

          <select id="select-tipo-reporte" onchange="window.cambiarTipoReporte(this.value)" class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none">
            <option value="0312" ${tipoReporte === '0312' ? 'selected' : ''}>Informe Autoevaluación Res. 0312 / 2019</option>
            <option value="ESTRUCTURA" ${tipoReporte === 'ESTRUCTURA' ? 'selected' : ''}>Informe Mapa de Procesos y Organigrama SST</option>
            <option value="GTC45" ${tipoReporte === 'GTC45' ? 'selected' : ''}>Informe Matriz de Peligros GTC 45</option>
            <option value="PAT" ${tipoReporte === 'PAT' ? 'selected' : ''}>Informe Plan Anual de Trabajo (PAT)</option>
            <option value="ATEL" ${tipoReporte === 'ATEL' ? 'selected' : ''}>Informe Estadístico de Accidentalidad</option>
          </select>

          <button onclick="window.print()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Imprimir / Guardar en PDF
          </button>
        </div>
      </div>

      <!-- Hoja Oficial Membretada (Imprimible) -->
      <div class="bg-white p-8 md:p-12 rounded-xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-8">
        
        <!-- Membrete Legal Oficial Doctor Pyme -->
        <div class="border-b-2 border-teal-800 pb-5">
          <div class="flex justify-between items-start gap-4">
            <div class="flex items-start gap-4">
              ${empresaActiva.logoUrl ? `
                <img src="${empresaActiva.logoUrl}" alt="${empresaActiva.razonSocial}" class="w-16 h-16 object-contain p-1 rounded-xl border border-slate-200 bg-white flex-shrink-0 shadow-xs" title="Logotipo Oficial de ${empresaActiva.razonSocial}">
              ` : ''}
              <img src="./assets/logo-horizontal.png" alt="Doctor Pyme" class="h-14 object-contain p-1 rounded-xl border border-teal-100 bg-white flex-shrink-0 shadow-xs" title="Doctor Pyme - El Médico de tu Negocio">
              <div>
                <div class="text-[10px] font-black uppercase text-teal-700 tracking-wider">
                  DOCTOR PYME • EL MÉDICO DE TU NEGOCIO • SALUD, SEGURIDAD Y AMBIENTE
                </div>
                <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">${empresaActiva.razonSocial}</h2>
                <div class="text-xs text-slate-600 mt-1 space-y-0.5">
                  <p><strong>NIT:</strong> ${empresaActiva.nit} • <strong>ARL:</strong> ${empresaActiva.arl} • <strong>Riesgo:</strong> Clase ${empresaActiva.claseRiesgo}</p>
                  <p><strong>Sede:</strong> ${empresaActiva.ciudad} - ${empresaActiva.direccion} • <strong>Trabajadores:</strong> ${empresaActiva.trabajadores}</p>
                  <p><strong>Representante Legal:</strong> ${empresaActiva.representanteLegal || 'No especificado'}</p>
                  <p><strong>Responsable SST:</strong> ${empresaActiva.responsableSST || 'Designado por Gerencia'}</p>
                </div>
              </div>
            </div>

            <div class="text-right border-l-2 border-slate-200 pl-4">
              <span class="text-[10px] font-mono text-teal-700 font-bold uppercase block">DOCTOR PYME SG-SST</span>
              <span class="text-xs font-bold text-slate-800 block">Decreto 1072 & Res. 0312</span>
              <span class="text-[10px] text-teal-700 font-black block">VIGENCIA: AÑO ${anioActivo}</span>
              <span class="text-[10px] text-slate-500 block">Fecha Emisión: ${new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>

        <!-- Contenido Dinámico según Reporte Seleccionado -->
        ${tipoReporte === '0312' ? renderReporte0312(empresaActiva, estandares, evaluacion, resultadoEval, evidenciasPorNumeral, anioActivo) : ''}
        ${tipoReporte === 'ESTRUCTURA' ? renderReporteEstructura(empresaActiva, mapaSrc, orgSrc) : ''}
        ${tipoReporte === 'GTC45' ? renderReporteGTC45(matriz) : ''}
        ${tipoReporte === 'PAT' ? renderReportePAT(plan) : ''}
        ${tipoReporte === 'ATEL' ? renderReporteATEL(accidentes) : ''}

        <!-- Bloque Oficial de Firmas Legales -->
        <div class="pt-12 border-t border-slate-300 mt-12 page-break-inside-avoid">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-8 text-center">
            Legalización y Aprobación del Documento
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            
            <div class="border-t border-slate-400 pt-2">
              <div class="text-xs font-bold text-slate-800">REPRESENTANTE LEGAL</div>
              <div class="text-[11px] font-bold text-indigo-950 mt-0.5">${empresaActiva.representanteLegal || 'Gerente General / Representante Legal'}</div>
              <div class="text-[10px] text-slate-500 mt-0.5">${empresaActiva.razonSocial}</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Firma y Cédula</div>
            </div>

            <div class="border-t border-slate-400 pt-2">
              <div class="text-xs font-bold text-slate-800">DOCTOR PYME - SALUD, SEGURIDAD Y AMBIENTE</div>
              <div class="text-[11px] text-slate-500 mt-0.5">${empresaActiva.responsableSST || 'Licencia en SST'}</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Firma y Número de Licencia</div>
            </div>

            <div class="border-t border-slate-400 pt-2">
              <div class="text-xs font-bold text-slate-800">COPASST / VIGÍA DE SST</div>
              <div class="text-[11px] text-slate-500 mt-0.5">Comité Paritario de SST</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Firma Representante Trabajadores</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `;
}

function renderReporte0312(empresa, estandares, evaluacion, resultado, evidenciasPorNumeral = {}, anio = '2025') {
  const noCumplen = estandares.filter(e => evaluacion[e.numeral]?.estado === 'NO_CUMPLE');

  return `
    <div>
      <div class="text-center mb-6">
        <h3 class="text-lg font-black text-slate-800 uppercase tracking-wide">
          INFORME DE AUTOEVALUACIÓN DE ESTÁNDARES MÍNIMOS DEL SG-SST • VIGENCIA ${anio}
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">Conforme a la Resolución 0312 de 2019 del Ministerio del Trabajo • Año ${anio}</p>
      </div>

      <!-- Resumen Ponderado -->
      <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase">Estándares Aplicables</span>
          <div class="text-xl font-black text-slate-800 mt-1">${empresa.estandaresAplicables} Estándares</div>
        </div>
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase">Puntaje Total Obtenido</span>
          <div class="text-xl font-black text-indigo-700 mt-1">${resultado.puntaje}%</div>
        </div>
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase">Valoración Normativa</span>
          <div class="text-base font-extrabold uppercase mt-1 ${resultado.colorBadge === 'green' ? 'text-emerald-700' : resultado.colorBadge === 'amber' ? 'text-amber-700' : 'text-red-700'}">
            ${resultado.estadoLegal}
          </div>
        </div>
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase">Cumplimiento / No Aplica</span>
          <div class="text-xs font-bold text-slate-800 mt-1">
            <span class="text-emerald-700">${resultado.cumpleCount} Cumple</span> • 
            <span class="text-slate-700">${resultado.noAplicaCount} No Aplica</span> • 
            <span class="text-red-700">${resultado.noCumpleCount} No Cumple</span>
          </div>
        </div>
      </div>

      <!-- Tabla de Estándares Evaluados -->
      <h4 class="text-xs font-bold uppercase text-slate-700 mb-2">Detalle de la Evaluación y Soportes Documentales</h4>
      <div class="overflow-x-auto border border-slate-200 rounded-lg mb-8">
        <table class="w-full text-left text-[11px]">
          <thead class="bg-slate-800 text-white font-bold uppercase text-[9px]">
            <tr>
              <th class="p-2 border-r border-slate-700">Ítem</th>
              <th class="p-2 border-r border-slate-700">Criterio Legal</th>
              <th class="p-2 border-r border-slate-700 text-center">Peso</th>
              <th class="p-2 border-r border-slate-700 text-center">Calificación</th>
              <th class="p-2">Justificación y Evidencias Adjuntas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${estandares.map(e => {
              const resp = evaluacion[e.numeral] || {};
              const evs = evidenciasPorNumeral[e.numeral] || [];

              return `
                <tr>
                  <td class="p-2 border-r border-slate-100 font-bold whitespace-nowrap">${e.numeral}</td>
                  <td class="p-2 border-r border-slate-100 max-w-[280px]">
                    <span class="font-bold text-slate-800 block">${e.estandar}</span>
                    <span class="text-slate-600 text-[10px]">${e.criterio}</span>
                  </td>
                  <td class="p-2 border-r border-slate-100 text-center font-mono font-bold">${formatPeso(e.pesoEfectivo)}</td>
                  <td class="p-2 border-r border-slate-100 text-center whitespace-nowrap font-bold">
                    <span class="${resp.estado === 'CUMPLE' ? 'text-emerald-700' : resp.estado === 'NO_CUMPLE' ? 'text-red-700' : 'text-slate-600'}">
                      ${resp.estado || 'SIN EVALUAR'}
                    </span>
                  </td>
                    <div>${resp.justificacion || 'Sin soporte textual registrado'}</div>
                    ${(() => {
                      const allFuentes = [];
                      if (Array.isArray(resp.fuentes)) {
                        resp.fuentes.forEach(f => {
                          if (f && f.url && f.url.trim()) allFuentes.push(f);
                        });
                      }
                      if (allFuentes.length === 0 && resp.linkGuia && resp.linkGuia.trim()) {
                        allFuentes.push({ url: resp.linkGuia.trim(), titulo: 'Documento Guía Principal' });
                      }
                      if (allFuentes.length === 0) return '';
                      return allFuentes.map((f, idx) => `
                        <div class="mt-1 pt-1 border-t border-slate-100 flex items-center gap-1.5 text-blue-700">
                          <span class="font-bold text-[10px]">🔗 ${f.titulo || (allFuentes.length > 1 ? `Soporte #${idx + 1}` : 'Soporte Documental')}:</span>
                          <a href="${f.url}" target="_blank" rel="noopener noreferrer" class="underline font-semibold hover:text-blue-900 inline-flex items-center gap-0.5" title="${f.url}">
                            <span>${f.url.includes('docs.google.com/document') ? 'Google Docs' : f.url.includes('docs.google.com/spreadsheets') ? 'Google Sheets' : f.url.includes('drive.google.com') ? 'Google Drive' : 'Documento en Línea'}</span>
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                          </a>
                        </div>
                      `).join('');
                    })()}
                    ${evs.length > 0 ? `
                      <div class="mt-1.5 pt-1.5 border-t border-slate-100 text-slate-700">
                        <div class="text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <span>📁 Archivos de evidencia (${evs.length}):</span>
                        </div>
                        <div class="flex flex-wrap gap-1 no-print">
                          ${evs.map(f => `
                            <button 
                              type="button"
                              onclick="window.previsualizarEvidencia('${f.id}')"
                              class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded text-[10px] font-semibold transition cursor-pointer shadow-2xs"
                              title="Generar vista previa inmediata de ${f.nombre} sin descargar"
                            >
                              <svg class="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                              <span class="max-w-[160px] truncate">${f.nombre}</span>
                            </button>
                          `).join('')}
                        </div>
                        <div class="hidden print:block text-[9px] text-slate-600">
                          ${evs.map(f => f.nombre).join(', ')}
                        </div>
                      </div>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Plan de Mejoramiento Obligatorio (Si hay ítems No Cumple) -->
      ${noCumplen.length > 0 ? `
        <div class="page-break-before">
          <div class="bg-red-50 border border-red-200 p-4 rounded-xl mb-4">
            <h4 class="text-xs font-black text-red-900 uppercase">
              PLAN DE MEJORAMIENTO LEGAL (RESOLUCIÓN 0312 DE 2019 - ART. 28)
            </h4>
            <p class="text-[11px] text-red-700 mt-0.5">
              Acciones correctivas inmediatas asignadas para subsanar los ${noCumplen.length} ítems identificados como "No Cumple".
            </p>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-lg">
            <table class="w-full text-left text-[11px]">
              <thead class="bg-red-900 text-white font-bold uppercase text-[9px]">
                <tr>
                  <th class="p-2 border-r border-red-800">Ítem</th>
                  <th class="p-2 border-r border-red-800">Criterio Requerido</th>
                  <th class="p-2 border-r border-red-800">Acción de Mejora Formulada</th>
                  <th class="p-2 border-r border-red-800">Responsable</th>
                  <th class="p-2 text-center">Plazo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${noCumplen.map(e => {
                  const resp = evaluacion[e.numeral] || {};
                  return `
                    <tr>
                      <td class="p-2 border-r border-slate-100 font-bold whitespace-nowrap">${e.numeral}</td>
                      <td class="p-2 border-r border-slate-100 max-w-[200px] text-[10px] text-slate-700">${e.criterio}</td>
                      <td class="p-2 border-r border-slate-100 font-medium text-slate-900">${resp.planAccion || 'Formular plan de cierre inmediato'}</td>
                      <td class="p-2 border-r border-slate-100 text-slate-700">${empresa.responsableSST || 'Responsable SST'}</td>
                      <td class="p-2 text-center text-slate-700 whitespace-nowrap font-semibold">Inmediato (< 3 meses)</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-center font-bold">
          ¡Felicitaciones! No existen hallazgos de incumplimiento normativo en esta autoevaluación.
        </div>
      `}
    </div>
  `;
}

function renderReporteGTC45(matriz) {
  return `
    <div>
      <div class="text-center mb-6">
        <h3 class="text-lg font-black text-slate-800 uppercase tracking-wide">
          MATRIZ DE IDENTIFICACIÓN DE PELIGROS, EVALUACIÓN Y VALORACIÓN DE RIESGOS (GTC 45:2012)
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">Decreto 1072 de 2015 Artículo 2.2.4.6.15</p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-left text-[10px]">
          <thead class="bg-slate-800 text-white font-bold uppercase text-[9px]">
            <tr>
              <th class="p-2 border-r border-slate-700">Proceso</th>
              <th class="p-2 border-r border-slate-700">Zona / Lugar</th>
              <th class="p-2 border-r border-slate-700">Peligro y Descripción</th>
              <th class="p-2 border-r border-slate-700">Efectos Posibles</th>
              <th class="p-2 border-r border-slate-700 text-center">ND × NE = NP</th>
              <th class="p-2 border-r border-slate-700 text-center">NC</th>
              <th class="p-2 border-r border-slate-700 text-center">Nivel Riesgo</th>
              <th class="p-2">Medidas de Intervención</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${matriz.map(m => `
              <tr>
                <td class="p-2 border-r border-slate-100 font-bold">${m.proceso}</td>
                <td class="p-2 border-r border-slate-100">${m.zonaLugar}</td>
                <td class="p-2 border-r border-slate-100 max-w-[200px]">
                  <strong class="text-slate-800 block">${m.peligroClasificacion}</strong>
                  <span class="text-slate-600">${m.peligroDescripcion}</span>
                </td>
                <td class="p-2 border-r border-slate-100 text-slate-600">${m.efectosPosibles}</td>
                <td class="p-2 border-r border-slate-100 text-center font-mono">${m.nd} × ${m.ne} = <strong>${m.np}</strong></td>
                <td class="p-2 border-r border-slate-100 text-center font-mono font-bold">${m.nc}</td>
                <td class="p-2 border-r border-slate-100 text-center font-bold">
                  Nivel ${m.interpretacionNR} (${m.nr}) - ${m.aceptabilidad}
                </td>
                <td class="p-2 text-slate-700 text-[9px]">
                  <strong>Ing:</strong> ${m.medidasIntervencion?.ingenieria || 'N/A'}<br>
                  <strong>Adm:</strong> ${m.medidasIntervencion?.administrativos || 'N/A'}<br>
                  <strong>EPP:</strong> ${m.medidasIntervencion?.epp || 'N/A'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReportePAT(plan) {
  return `
    <div>
      <div class="text-center mb-6">
        <h3 class="text-lg font-black text-slate-800 uppercase tracking-wide">
          PLAN ANUAL DE TRABAJO EN SEGURIDAD Y SALUD EN EL TRABAJO (PAT)
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">Decreto 1072 de 2015 Artículo 2.2.4.6.8 Numeral 7</p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-left text-[11px]">
          <thead class="bg-slate-800 text-white font-bold uppercase text-[9px]">
            <tr>
              <th class="p-2 border-r border-slate-700">Ciclo / Mes</th>
              <th class="p-2 border-r border-slate-700">Actividad Programada</th>
              <th class="p-2 border-r border-slate-700">Meta Cuantificable</th>
              <th class="p-2 border-r border-slate-700">Responsable y Recursos</th>
              <th class="p-2 border-r border-slate-700 text-center">Estado</th>
              <th class="p-2 text-center">% Avance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${plan.map(p => `
              <tr>
                <td class="p-2 border-r border-slate-100 font-bold whitespace-nowrap">${p.ciclo} - ${p.mes}</td>
                <td class="p-2 border-r border-slate-100 font-semibold text-slate-800">${p.actividad}</td>
                <td class="p-2 border-r border-slate-100 text-slate-600">${p.meta}</td>
                <td class="p-2 border-r border-slate-100 text-slate-700">${p.responsable}</td>
                <td class="p-2 border-r border-slate-100 text-center font-bold">${p.estado}</td>
                <td class="p-2 text-center font-mono font-bold">${p.cumplimiento || 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReporteATEL(accidentes) {
  return `
    <div>
      <div class="text-center mb-6">
        <h3 class="text-lg font-black text-slate-800 uppercase tracking-wide">
          LIBRO DE REGISTRO Y ESTADÍSTICA DE ACCIDENTALIDAD LABORAL (ATEL)
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">Resolución 1401 de 2007 y Decreto 1072 Art. 2.2.4.6.32</p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-left text-[11px]">
          <thead class="bg-slate-800 text-white font-bold uppercase text-[9px]">
            <tr>
              <th class="p-2 border-r border-slate-700">Fecha</th>
              <th class="p-2 border-r border-slate-700">Trabajador y Cargo</th>
              <th class="p-2 border-r border-slate-700">Tipo de Evento</th>
              <th class="p-2 border-r border-slate-700 text-center">Días Inc.</th>
              <th class="p-2 border-r border-slate-700">Descripción del Suceso</th>
              <th class="p-2">Plan de Acción / Cierre</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${accidentes.map(a => `
              <tr>
                <td class="p-2 border-r border-slate-100 whitespace-nowrap font-mono font-semibold">${a.fechaEvento}</td>
                <td class="p-2 border-r border-slate-100 font-bold text-slate-800">
                  ${a.trabajador}<br><span class="text-[10px] font-normal text-slate-500">${a.cargo} (C.C. ${a.cedula})</span>
                </td>
                <td class="p-2 border-r border-slate-100 font-semibold text-slate-700">${a.tipoEvento}</td>
                <td class="p-2 border-r border-slate-100 text-center font-bold ${a.diasIncapacidad > 0 ? 'text-red-700' : 'text-slate-600'}">${a.diasIncapacidad || 0}</td>
                <td class="p-2 border-r border-slate-100 text-[10px] text-slate-700 max-w-[220px]">${a.descripcionEvento}</td>
                <td class="p-2 text-[10px] text-slate-700">${a.planAccion || 'Sin plan asignado'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReporteEstructura(empresa, mapaSrc, orgSrc) {
  return `
    <div class="space-y-8">
      <div class="text-center mb-6">
        <h3 class="text-lg font-black text-slate-800 uppercase tracking-wide">
          ESTRUCTURA ORGANIZACIONAL Y ENFOQUE POR PROCESOS DEL SG-SST
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">Decreto 1072 de 2015 Artículos 2.2.4.6.8 y 2.2.4.6.15 • Resolución 0312 de 2019</p>
      </div>

      <!-- 1. Mapa de Procesos -->
      <div class="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs page-break-inside-avoid">
        <div class="border-b border-slate-100 pb-3 mb-4 flex justify-between items-start">
          <div>
            <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span>🗺️</span> 1. Mapa General de Procesos de la Organización
            </h4>
            <p class="text-xs text-slate-500 mt-0.5">
              Estructuración de procesos Estratégicos, Misionales y de Apoyo como insumo para la Matriz de Identificación de Peligros GTC 45.
            </p>
          </div>
          <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-200 uppercase">
            Ciclo PHVA
          </span>
        </div>
        ${mapaSrc ? `
          <div class="flex justify-center p-3 bg-slate-50 rounded-lg border border-slate-200">
            <img src="${mapaSrc}" alt="Mapa de Procesos" class="max-h-[420px] max-w-full object-contain">
          </div>
        ` : `
          <div class="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
            No se ha cargado una imagen para el mapa de procesos. Puedes subirla desde el módulo de Empresas Clientes.
          </div>
        `}
      </div>

      <!-- 2. Organigrama Institucional y Roles SST -->
      <div class="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs page-break-inside-avoid">
        <div class="border-b border-slate-100 pb-3 mb-4 flex justify-between items-start">
          <div>
            <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span>👥</span> 2. Organigrama Institucional y Estructura de Roles en SST
            </h4>
            <p class="text-xs text-slate-500 mt-0.5">
              Asignación reglamentaria de responsabilidades: Alta Dirección, Responsable SST (${empresa.responsableSST || 'Designado'}), COPASST/Vigía y Brigada de Emergencias.
            </p>
          </div>
          <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-200 uppercase">
            Dec. 1072 Art. 2.2.4.6.8
          </span>
        </div>
        ${orgSrc ? `
          <div class="flex justify-center p-3 bg-slate-50 rounded-lg border border-slate-200">
            <img src="${orgSrc}" alt="Organigrama" class="max-h-[420px] max-w-full object-contain">
          </div>
        ` : `
          <div class="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
            No se ha cargado una imagen para el organigrama. Puedes subirla desde el módulo de Empresas Clientes.
          </div>
        `}
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.cambiarTipoReporte = function(tipo) {
    tipoReporte = tipo;
    renderReports();
  };
}
