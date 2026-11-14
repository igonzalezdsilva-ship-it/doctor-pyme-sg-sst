// =============================================================================
// COMPONENTE: MODAL DE PARAMETRIZACIÓN, GENERACIÓN PDF Y PUBLICACIÓN DE
// POLÍTICAS Y REGLAMENTOS DE LA EMPRESA (APP DEL TRABAJADOR & PANEL ADMIN)
// =============================================================================
import { store } from '../store.js';

let politicaEmpresaSeleccionadaId = 'DOC-POL-SST-01';

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function abrirModalPoliticasReglamentosEmpresa(empresaId = null, polIdInicial = null) {
  const cleanId = (empresaId && empresaId !== 'undefined' && empresaId !== 'null') ? empresaId : null;
  const emp = (cleanId && (store.getEmpresa(cleanId) || (store.getEmpresaById && store.getEmpresaById(cleanId)))) 
              || store.getEmpresaActiva() 
              || store.getEmpresas()[0];

  if (!emp) {
    alert('No se encontró una empresa activa para gestionar sus políticas y reglamentos.');
    return;
  }

  if (polIdInicial) {
    politicaEmpresaSeleccionadaId = polIdInicial;
  }

  const politicas = store.getPoliticasEmpresa ? store.getPoliticasEmpresa(emp.id) : [];
  if (!politicas || politicas.length === 0) {
    alert('No fue posible cargar las políticas de la empresa.');
    return;
  }

  const polActiva = politicas.find(p => p.id === politicaEmpresaSeleccionadaId) || politicas[0];
  politicaEmpresaSeleccionadaId = polActiva.id;

  const trabs = (store.getTrabajadores ? store.getTrabajadores(emp.id) : []).filter(t => (t.estado || 'Activo') === 'Activo');
  const firmasEmp = store.getFirmas ? store.getFirmas(emp.id) : [];
  const docSigsAll = store.data?.employee_document_signatures || [];

  const contarFirmasPorPolitica = (pid) => {
    return trabs.filter(t =>
      firmasEmp.some(f => f.trabajadorId === t.id && (f.documentoId === pid || f.documentoCodigo === pid)) ||
      docSigsAll.some(s => (s.employee_id === t.id || s.trabajadorId === t.id) && (s.document_code === pid || s.document_id === pid || s.document_type === pid))
    ).length;
  };

  const modalId = 'modal-admin-politicas-reglamentos-empresa';
  document.getElementById(modalId)?.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
      
      <!-- Cabecera Institucional -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-teal-950 px-6 py-4 text-white flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/25 text-teal-200 border border-teal-400/30">
              Módulo de Parametrización y Publicación Institucional
            </span>
            <span class="text-xs font-bold text-indigo-200">🏢 ${emp.razonSocial} (NIT: ${emp.nit})</span>
          </div>
          <h2 class="text-lg sm:text-xl font-black text-white mt-0.5">
            📜 Políticas y Reglamentos de la Empresa (Publicación en App del Trabajador)
          </h2>
          <p class="text-xs text-slate-300">
            Edita, genera en PDF oficial con firmas institucionales y publica en tiempo real los 4 documentos normativos que visualizan y firman los trabajadores en su App Móvil.
          </p>
        </div>
        <button 
          type="button" 
          onclick="document.getElementById('${modalId}')?.remove()" 
          class="px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white text-xs font-black transition cursor-pointer flex-shrink-0"
        >
          Cerrar ✕
        </button>
      </div>

      <!-- Cuerpo: Selector Lateral de las 4 Políticas/Reglamentos + Formulario de Parametrización -->
      <div class="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        <!-- Columna Izquierda: Los 4 Documentos Institucionales -->
        <div class="lg:col-span-4 p-4 bg-slate-50 space-y-2.5">
          <div class="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
            Catálogo Oficial (4 Documentos):
          </div>
          ${politicas.map((p, i) => {
            const isSel = p.id === polActiva.id;
            const firmadosCount = contarFirmasPorPolitica(p.id);
            return `
              <button 
                type="button"
                onclick="window.abrirModalPoliticasReglamentosEmpresa('${emp.id}', '${p.id}')"
                class="w-full text-left p-3.5 rounded-2xl border transition cursor-pointer flex flex-col gap-1.5 ${isSel ? 'bg-indigo-950 text-white border-indigo-700 shadow-md' : 'bg-white hover:bg-indigo-50/50 text-slate-800 border-slate-200'}"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isSel ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30' : 'bg-slate-100 text-slate-600'}">
                    #${i + 1} • ${p.codigo || p.id}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${isSel ? 'bg-emerald-500/25 text-emerald-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                    🟢 Publicado (${firmadosCount}/${trabs.length} firmas)
                  </span>
                </div>
                <div class="text-xs font-black leading-snug ${isSel ? 'text-white' : 'text-slate-900'}">
                  ${p.title}
                </div>
                <div class="text-[10px] ${isSel ? 'text-slate-300' : 'text-slate-500'} truncate">
                  ${p.norma}
                </div>
              </button>
            `;
          }).join('')}

          <div class="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-[11px] text-teal-950 space-y-1 mt-3">
            <strong class="block font-black">💡 ¿Cómo funciona la publicación?</strong>
            <p class="leading-relaxed">
              Al guardar los cambios de cualquiera de estos 4 documentos, el texto actualizado, sus cláusulas y su soporte PDF quedan inmediatamente publicados en la pestaña <strong>"Mi Cargo & Docs ➔ Políticas y Reglamentos de la Empresa"</strong> de la App de todos los trabajadores de <strong>${emp.razonSocial}</strong>.
            </p>
          </div>
        </div>

        <!-- Columna Derecha: Editor Paramétrico y Generador PDF -->
        <div class="lg:col-span-8 p-5 sm:p-6 space-y-4 bg-white">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <span class="text-[10px] font-mono font-bold uppercase text-indigo-600">${polActiva.id} • Categoría: ${polActiva.categoria}</span>
              <h3 class="text-base font-black text-slate-900">${polActiva.title}</h3>
            </div>
            <div class="flex items-center gap-2">
              <button 
                type="button"
                onclick="window.imprimirPoliticaReglamentoEmpresa('${polActiva.id}', '${emp.id}')"
                class="px-3.5 py-2 bg-slate-900 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>🖨️</span>
                <span>Generar / Descargar PDF Oficial</span>
              </button>
            </div>
          </div>

          <form id="form-parametrizar-politica-empresa" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-black uppercase text-slate-700 mb-1">Título Oficial del Documento</label>
                <input type="text" id="pol-emp-title" value="${escapeHtml(polActiva.title)}" required class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-700 mb-1">Código & Versión</label>
                <div class="grid grid-cols-2 gap-1.5">
                  <input type="text" id="pol-emp-codigo" value="${escapeHtml(polActiva.codigo || polActiva.id)}" class="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900" placeholder="Código">
                  <input type="text" id="pol-emp-version" value="${escapeHtml(polActiva.version || '01')}" class="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900" placeholder="Versión">
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-black uppercase text-slate-700 mb-1">Marco Normativo / Base Legal</label>
                <input type="text" id="pol-emp-norma" value="${escapeHtml(polActiva.norma || '')}" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-700 mb-1">Fecha de Vigencia / Publicación</label>
                <input type="date" id="pol-emp-fecha" value="${escapeHtml(polActiva.fechaVigencia || new Date().toISOString().split('T')[0])}" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-700 mb-1">Objetivo / Declaración General de la Empresa</label>
              <textarea id="pol-emp-objetivo" rows="3" required class="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none">${escapeHtml(polActiva.objetivo || '')}</textarea>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-black uppercase text-slate-700">Disposiciones, Compromisos o Capítulos Clave (Uno por línea)</label>
                <span class="text-[10px] text-indigo-600 font-semibold">Se muestran como viñetas legibles en la App del Trabajador y en el PDF</span>
              </div>
              <textarea id="pol-emp-puntos" rows="6" required class="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none">${escapeHtml((polActiva.puntos || []).join('\n'))}</textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-700 mb-1">Enlace a Documento Maestro Externo / Drive (Opcional)</label>
                <input type="url" id="pol-emp-enlace" value="${escapeHtml(polActiva.enlace || '')}" placeholder="https://docs.google.com/..." class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-700 mb-1">Cláusula de Aceptación Digital del Trabajador</label>
                <input type="text" id="pol-emp-clausula" value="${escapeHtml(polActiva.clausulaAceptacion || '')}" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              </div>
            </div>

            <div class="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span class="text-[11px] text-slate-500">
                Aprobador Patronal: <strong>${emp.representanteLegal || 'Representante Legal'}</strong> · Responsable SST: <strong>${emp.responsableSST || 'Coordinador SST'}</strong>
              </span>
              <div class="flex items-center gap-2.5">
                <button 
                  type="submit" 
                  class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-900/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <span>💾 Guardar y Publicar en App del Trabajador</span>
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  document.getElementById('form-parametrizar-politica-empresa')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const puntosRaw = document.getElementById('pol-emp-puntos')?.value || '';
    const puntosArr = puntosRaw.split('\n').map(s => s.trim()).filter(Boolean);

    store.guardarPoliticaEmpresa(emp.id, {
      id: polActiva.id,
      companyId: emp.id,
      title: document.getElementById('pol-emp-title')?.value.trim() || polActiva.title,
      codigo: document.getElementById('pol-emp-codigo')?.value.trim() || polActiva.codigo,
      version: document.getElementById('pol-emp-version')?.value.trim() || '01',
      norma: document.getElementById('pol-emp-norma')?.value.trim() || polActiva.norma,
      fechaVigencia: document.getElementById('pol-emp-fecha')?.value || polActiva.fechaVigencia,
      objetivo: document.getElementById('pol-emp-objetivo')?.value.trim() || polActiva.objetivo,
      puntos: puntosArr,
      enlace: document.getElementById('pol-emp-enlace')?.value.trim() || '',
      clausulaAceptacion: document.getElementById('pol-emp-clausula')?.value.trim() || polActiva.clausulaAceptacion,
      estadoPublicacion: 'PUBLICADO'
    });

    if (window.mostrarToastOperativo) {
      window.mostrarToastOperativo('✓ Documento guardado y publicado en la App del Trabajador');
    } else {
      alert('✓ Documento guardado y publicado exitosamente en la App del Trabajador.');
    }
    abrirModalPoliticasReglamentosEmpresa(emp.id, polActiva.id);
  });
}

export function imprimirPoliticaReglamentoEmpresa(polId, empresaId = null) {
  const cleanId = (empresaId && empresaId !== 'undefined' && empresaId !== 'null') ? empresaId : null;
  const emp = (cleanId && (store.getEmpresa(cleanId) || (store.getEmpresaById && store.getEmpresaById(cleanId)))) 
              || store.getEmpresaActiva() 
              || store.getEmpresas()[0];
  if (!emp) return;

  const politicas = store.getPoliticasEmpresa ? store.getPoliticasEmpresa(emp.id) : [];
  const pol = politicas.find(p => p.id === polId) || politicas[0];
  if (!pol) return;

  const repNombre = emp.legal_rep_name || emp.representanteLegal || 'Representante Legal';
  const repSigUrl = emp.legal_rep_signature_url || `/uploads/sig_inst_rep_legal_${emp.id}.svg`;
  const coordNombre = emp.sst_coordinator_name || emp.responsableSST || 'Coordinador SG-SST';
  const coordLic = emp.sst_coordinator_sst_license || emp.licenciaSST || 'Licencia SST Vigente';
  const coordSigUrl = emp.sst_coordinator_signature_url || `/uploads/sig_inst_coord_sst_${emp.id}.svg`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Por favor habilita las ventanas emergentes para generar el PDF oficial.');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${pol.codigo || pol.id} - ${pol.title} - ${emp.razonSocial}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 28px; line-height: 1.55; font-size: 12.5px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .header-table td { border: 1px solid #cbd5e1; padding: 8px 12px; vertical-align: middle; }
        .title-box { text-align: center; font-weight: 800; font-size: 14px; text-transform: uppercase; background: #f8fafc; }
        .section { margin-top: 14px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; }
        .section h3 { margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        ul { margin: 6px 0; padding-left: 20px; }
        li { margin-bottom: 6px; }
        .sig-grid { display: table; width: 100%; margin-top: 28px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
        .sig-col { display: table-cell; width: 50%; text-align: center; vertical-align: bottom; padding: 0 12px; }
        .sig-img { max-height: 55px; max-width: 180px; object-fit: contain; margin: 0 auto 4px auto; display: block; }
        @media print { .no-print { display: none; } body { margin: 12mm; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:16px; text-align:right;">
        <button onclick="window.print()" style="padding:8px 16px; background:#0f766e; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Imprimir / Guardar como PDF</button>
      </div>
      <table class="header-table">
        <tr>
          <td style="width:22%; text-align:center; font-weight:bold;">
            ${emp.razonSocial}<br><span style="font-size:10px; color:#475569;">NIT: ${emp.nit}</span>
          </td>
          <td class="title-box" style="width:53%;">
            SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)<br>
            <span style="color:#0f766e;">${pol.title}</span>
          </td>
          <td style="width:25%; font-size:11px;">
            <strong>Código:</strong> ${pol.codigo || pol.id}<br>
            <strong>Versión:</strong> ${pol.version || '01'}<br>
            <strong>Fecha:</strong> ${pol.fechaVigencia || new Date().toISOString().split('T')[0]}<br>
            <strong>Estado:</strong> PUBLICADO
          </td>
        </tr>
      </table>

      <div class="section">
        <h3>1. Marco Legal y Normativo</h3>
        <p style="margin:0;">${pol.norma}</p>
      </div>

      <div class="section">
        <h3>2. Objetivo y Compromiso Institucional</h3>
        <p style="margin:0;">${pol.objetivo}</p>
      </div>

      <div class="section">
        <h3>3. Directrices, Disposiciones y Obligaciones</h3>
        <ul>
          ${(pol.puntos || []).map(pt => `<li>${pt}</li>`).join('')}
        </ul>
      </div>

      <div class="section" style="background:#f0fdf4; border-color:#bbf7d0;">
        <h3>4. Publicación y Socialización a los Trabajadores</h3>
        <p style="margin:0;">${pol.clausulaAceptacion}</p>
      </div>

      <div class="sig-grid">
        <div class="sig-col">
          <img src="${coordSigUrl}" class="sig-img" onerror="this.style.display='none'">
          <div style="border-top:1px solid #334155; padding-top:4px; width:80%; margin:0 auto;">
            <strong>${coordNombre}</strong><br>
            <span style="font-size:10px; color:#475569;">Responsable / Coordinador SG-SST (${coordLic})</span>
          </div>
        </div>
        <div class="sig-col">
          <img src="${repSigUrl}" class="sig-img" onerror="this.style.display='none'">
          <div style="border-top:1px solid #334155; padding-top:4px; width:80%; margin:0 auto;">
            <strong>${repNombre}</strong><br>
            <span style="font-size:10px; color:#475569;">Representante Legal — ${emp.razonSocial}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
}

// Asegurar disponibilidad global inmediata en window
if (typeof window !== 'undefined') {
  window.abrirModalPoliticasReglamentosEmpresa = abrirModalPoliticasReglamentosEmpresa;
  window.imprimirPoliticaReglamentoEmpresa = imprimirPoliticaReglamentoEmpresa;
}
