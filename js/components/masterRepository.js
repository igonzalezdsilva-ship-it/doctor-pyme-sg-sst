// =============================================================================
// DOCTOR PYME SG-SST - REPOSITORIO MAESTRO DE DOCUMENTACIÓN BASE (RES. 0312)
// Catálogo Global de Formatos Neutros (Sin Datos de Empresa) para Inicialización
// Administrado exclusivamente por SUPER_ADMIN / CONSULTOR_SST
// =============================================================================

import { store } from '../store.js';
import { ESTANDARES_RES_0312 } from '../data.js';
import { abrirVisorDocumento } from './documentViewer.js';

let filtroCicloRepo = 'TODOS';
let busquedaRepo = '';

export async function renderMasterRepository() {
  const container = document.getElementById('main-content');
  if (!container) return;

  const templates = store.getMasterTemplates();
  const todosEstandares = ESTANDARES_RES_0312;

  // Combinar los estándares de la Res. 0312 con las plantillas registradas
  const items = todosEstandares.map(est => {
    const tpl = templates.find(t => t.standard_numeral === est.numeral) || {
      id: `tpl-${est.numeral.replace(/\./g, '-')}`,
      standard_numeral: est.numeral,
      standard_name: est.criterio,
      template_title: `Formato Base - ${est.criterio.replace(/^[0-9\)\.\-\s]+/, '').slice(0, 50)}`,
      description_guide: `Guía oficial para el estándar ${est.numeral}. Diligenciar sin alterar la estructura técnica neutra.`,
      file_s3_key: `master-base-templates/${est.numeral}_PLANTILLA_NEUTRA.docx`,
      file_name: '',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 0,
      file_url: '',
      version: '1.0',
      is_active: true,
      has_file: false
    };

    return {
      numeral: est.numeral,
      ciclo: est.ciclo,
      estandar: est.estandar,
      criterio: est.criterio,
      modoVerificacion: est.modoVerificacion,
      template: tpl
    };
  });

  // Estadísticas globales
  const totalRequisitos = items.length;
  const totalConArchivo = items.filter(i => i.template && i.template.has_file).length;
  const porcentaje = totalRequisitos > 0 ? Math.round((totalConArchivo / totalRequisitos) * 100) : 0;

  // Filtrado reactivo
  const itemsFiltrados = items.filter(item => {
    if (filtroCicloRepo !== 'TODOS' && item.ciclo !== filtroCicloRepo) return false;
    if (busquedaRepo.trim()) {
      const q = busquedaRepo.toLowerCase().trim();
      const matchNum = item.numeral.toLowerCase().includes(q);
      const matchCrit = item.criterio.toLowerCase().includes(q);
      const matchTit = (item.template?.template_title || '').toLowerCase().includes(q);
      return matchNum || matchCrit || matchTit;
    }
    return true;
  });

  container.innerHTML = `
    <div class="space-y-6 pb-12 animate-fadeIn">
      
      <!-- CABECERA PRINCIPAL -->
      <div class="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-blue-500/30 text-blue-300 border border-blue-500/40">
                Catálogo Global • Super Admin / Consultor SST
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                MinIO S3 / Multi-Tenant Base
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span class="p-2 rounded-2xl bg-blue-600/60 border border-blue-400/40 shadow-inner">🏛️</span>
              Repositorio Maestro de Documentación Base
            </h1>
            <p class="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Gestor centralizado de <strong>formatos neutros estructurados</strong> (Word, Excel y PDF en limpio, sin logos ni NIT de empresas) para los 60 Estándares Mínimos de la Resolución 0312 de 2019. Se vinculan condicionalmente a las empresas según la configuración del tenant.
            </p>
          </div>

          <!-- Métricas de Cobertura Base -->
          <div class="flex items-center gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 backdrop-blur-sm self-start md:self-auto">
            <div class="text-center px-2">
              <div class="text-2xl font-black text-blue-400">${totalConArchivo}</div>
              <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Formatos Cargados</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center px-2">
              <div class="text-2xl font-black text-slate-300">${totalRequisitos - totalConArchivo}</div>
              <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">En Blanco</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center px-2">
              <div class="text-2xl font-black ${porcentaje >= 70 ? 'text-emerald-400' : 'text-amber-400'}">${porcentaje}%</div>
              <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cobertura Base</div>
            </div>
          </div>
        </div>
      </div>

      <!-- BARRA DE FILTROS Y BÚSQUEDA -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <!-- Ciclos PHVA -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-bold text-slate-500 mr-1">Ciclo PHVA:</span>
          ${['TODOS', 'PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'].map(c => `
            <button 
              onclick="window.repoFiltrarCiclo('${c}')" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${filtroCicloRepo === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
            >
              ${c}
            </button>
          `).join('')}
        </div>

        <!-- Buscador en tiempo real -->
        <div class="relative flex-1 max-w-md">
          <input 
            type="text" 
            placeholder="Buscar por numeral (ej: 1.1.1.3), nombre o plantilla..." 
            value="${escapeHtml(busquedaRepo)}"
            oninput="window.repoBuscar(this.value)"
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          >
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          ${busquedaRepo ? `<button onclick="window.repoBuscar('')" class="absolute right-3 top-2 text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>` : ''}
        </div>
      </div>

      <!-- LISTADO DE ESTÁNDARES Y ZONAS DRAG & DROP EN BLANCO -->
      <div class="space-y-4">
        ${itemsFiltrados.length === 0 ? `
          <div class="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            No se encontraron estándares que coincidan con los filtros aplicados.
          </div>
        ` : itemsFiltrados.map(item => {
          const t = item.template;
          const tieneArchivo = t && t.has_file && (t.dataUrl || t.file_url);
          const kb = Math.round((t.file_size || 0) / 1024);
          const sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
          const esWord = (t.mime_type || '').includes('word') || (t.file_name || '').match(/\.(docx?)$/i);
          const esExcel = (t.mime_type || '').includes('sheet') || (t.file_name || '').match(/\.(xlsx?)$/i);
          const esPdf = (t.mime_type || '').includes('pdf') || (t.file_name || '').endsWith('.pdf');

          return `
            <div class="bg-white rounded-2xl border ${tieneArchivo ? 'border-slate-200 shadow-xs' : 'border-dashed border-slate-300 bg-slate-50/50'} p-5 transition hover:border-blue-300">
              <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                <!-- Encabezado de Requisito y Ciclo -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1.5">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getCicloClass(item.ciclo)}">
                      ${item.ciclo}
                    </span>
                    <span class="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      Numeral ${item.numeral}
                    </span>
                    <span class="text-[10px] font-bold ${tieneArchivo ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-slate-500 bg-slate-100 border border-slate-200'} px-2 py-0.5 rounded-full">
                      ${tieneArchivo ? '✓ Formato Cargado' : '⚪ En Blanco'}
                    </span>
                  </div>

                  <h3 class="text-sm font-bold text-slate-800 leading-snug">
                    ${escapeHtml(item.criterio)}
                  </h3>
                  <p class="text-[11px] text-slate-500 mt-1 line-clamp-2" title="${escapeHtml(item.modoVerificacion)}">
                    <strong>Verificación:</strong> ${escapeHtml(item.modoVerificacion)}
                  </p>

                  <!-- Edición rápida de Nombre y Guía de Diligenciamiento -->
                  <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label class="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Título del Documento Base:</label>
                      <input 
                        type="text" 
                        value="${escapeHtml(t.template_title || '')}"
                        placeholder="Nombre descriptivo del formato base..."
                        onchange="window.repoActualizarMeta('${item.numeral}', 'template_title', this.value)"
                        class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Instrucciones / Guía de Diligenciamiento:</label>
                      <input 
                        type="text" 
                        value="${escapeHtml(t.description_guide || '')}"
                        placeholder="Instrucciones para el consultor o empresa..."
                        onchange="window.repoActualizarMeta('${item.numeral}', 'description_guide', this.value)"
                        class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                    </div>
                  </div>
                </div>

                <!-- Zona de Archivo: O Cargado O Drag & Drop en Blanco -->
                <div class="lg:w-96 flex-shrink-0">
                  ${tieneArchivo ? `
                    <!-- Tarjeta de Archivo Neutro Existente -->
                    <div class="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 flex flex-col justify-between h-full">
                      <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2 overflow-hidden">
                          <span class="w-8 h-8 rounded-lg ${esWord ? 'bg-blue-100 text-blue-700' : esExcel ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} flex items-center justify-center text-base flex-shrink-0">
                            ${esWord ? '📝' : esExcel ? '📊' : '📕'}
                          </span>
                          <div class="overflow-hidden">
                            <span class="text-xs font-bold text-slate-800 truncate block" title="${escapeHtml(t.file_name)}">${escapeHtml(t.file_name)}</span>
                            <span class="text-[10px] text-slate-500 font-mono">v${t.version || '1.0'} • ${sizeStr}</span>
                          </div>
                        </div>
                        <span class="text-[9px] font-bold bg-white text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">MinIO S3</span>
                      </div>

                      <!-- Acciones sobre la plantilla neutra -->
                      <div class="flex items-center justify-end gap-1.5 pt-2 border-t border-blue-100">
                        <button 
                          onclick="window.repoPrevisualizarPlantilla('${item.numeral}')" 
                          class="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                          title="Previsualizar formato base neutro"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          <span>Ver</span>
                        </button>

                        <button 
                          onclick="window.repoDescargarPlantilla('${item.numeral}')" 
                          class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                          title="Descargar copia del formato neutro"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          <span>Bajar</span>
                        </button>

                        <label class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs" title="Reemplazar archivo base">
                          <span>Reemplazar</span>
                          <input type="file" accept=".doc,.docx,.xls,.xlsx,.pdf" class="hidden" onchange="window.repoSubirArchivo('${item.numeral}', this.files)">
                        </label>

                        <button 
                          onclick="window.repoEliminarArchivo('${item.numeral}')" 
                          class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar archivo base de este estándar"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </div>
                  ` : `
                    <!-- Zona Drag & Drop en Blanco -->
                    <label 
                      ondragover="event.preventDefault(); this.classList.add('border-blue-500', 'bg-blue-50');"
                      ondragleave="this.classList.remove('border-blue-500', 'bg-blue-50');"
                      ondrop="event.preventDefault(); this.classList.remove('border-blue-500', 'bg-blue-50'); window.repoSubirArchivo('${item.numeral}', event.dataTransfer.files);"
                      class="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl cursor-pointer bg-slate-50 transition text-center group"
                    >
                      <svg class="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      <span class="text-xs font-bold text-slate-700 group-hover:text-blue-700">Subir Formato Neutro Base</span>
                      <span class="text-[10px] text-slate-400 mt-0.5">Word (.docx), Excel (.xlsx) o PDF limpio</span>
                      <input type="file" accept=".doc,.docx,.xls,.xlsx,.pdf" class="hidden" onchange="window.repoSubirArchivo('${item.numeral}', this.files)">
                    </label>
                  `}
                </div>

              </div>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}

function getCicloClass(ciclo) {
  switch ((ciclo || '').toUpperCase()) {
    case 'PLANEAR': return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'HACER': return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'VERIFICAR': return 'bg-purple-100 text-purple-800 border border-purple-200';
    case 'ACTUAR': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    default: return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

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

win.repoFiltrarCiclo = function(ciclo) {
  filtroCicloRepo = ciclo;
  renderMasterRepository();
};

win.repoBuscar = function(texto) {
  busquedaRepo = texto || '';
  renderMasterRepository();
};

win.repoSubirArchivo = async function(numeral, files) {
  if (!files || files.length === 0) return;
  const file = files[0];

  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    const est = ESTANDARES_RES_0312.find(e => e.numeral === numeral);

    await store.saveMasterTemplate({
      standard_numeral: numeral,
      standard_name: est ? est.criterio : `Estándar ${numeral}`,
      ciclo: est ? est.ciclo : '',
      estandar: est ? est.estandar : '',
      template_title: `Formato Base - ${(est ? est.criterio : numeral).replace(/^[0-9\)\.\-\s]+/, '').slice(0, 50)}`,
      description_guide: `Plantilla estructurada en blanco para el estándar ${numeral}.`,
      file_name: file.name,
      mime_type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: file.size,
      dataUrl: dataUrl,
      has_file: true
    });

    renderMasterRepository();
  };
  reader.readAsDataURL(file);
};

win.repoEliminarArchivo = async function(numeral) {
  if (confirm(`¿Deseas eliminar el archivo base del estándar ${numeral} y dejarlo en blanco?`)) {
    await store.deleteMasterTemplate(numeral);
    renderMasterRepository();
  }
};

win.repoActualizarMeta = async function(numeral, campo, valor) {
  const templates = store.getMasterTemplates();
  const tpl = templates.find(t => t.standard_numeral === numeral) || { standard_numeral: numeral };
  tpl[campo] = valor;
  await store.saveMasterTemplate(tpl);
};

win.repoPrevisualizarPlantilla = function(numeral) {
  const templates = store.getMasterTemplates();
  const tpl = templates.find(t => t.standard_numeral === numeral);
  if (!tpl || (!tpl.dataUrl && !tpl.file_url)) {
    alert("No se encontró el archivo de esta plantilla para previsualizar.");
    return;
  }

  const est = ESTANDARES_RES_0312.find(e => e.numeral === numeral);
  abrirVisorDocumento({
    nombre: tpl.file_name || `Plantilla_Base_${numeral}.docx`,
    tipo: tpl.mime_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    tamanio: tpl.file_size || 0,
    dataUrl: tpl.dataUrl,
    url: tpl.file_url,
    contexto: `Repositorio Maestro Res. 0312 - Numeral ${numeral}: ${est ? est.criterio : ''}`,
    empresaNombre: 'Plantilla Base Neutra (Sin Datos de Empresa)'
  });
};

win.repoDescargarPlantilla = function(numeral) {
  const templates = store.getMasterTemplates();
  const tpl = templates.find(t => t.standard_numeral === numeral);
  if (!tpl || (!tpl.dataUrl && !tpl.file_url)) {
    alert("No hay archivo cargado en este formato base.");
    return;
  }

  const a = document.createElement('a');
  a.href = tpl.dataUrl || tpl.file_url;
  a.download = tpl.file_name || `Formato_Base_${numeral}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
