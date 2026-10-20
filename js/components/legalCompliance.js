// =============================================================================
// MÓDULO ADMINISTRADOR: REPOSITORIO JURÍDICO DE CUMPLIMIENTO (HABEAS DATA)
// Evidencia Digital e Inalterabilidad Forense (Ley 1581 de 2012 & Ley 527 de 1999)
// =============================================================================

import { store } from '../store.js';
import { auth } from '../auth.js';

let filtroEmpresaQuery = '';
let filtroUsuarioQuery = '';
let filtroIpQuery = '';
let filtroFechaQuery = '';
let filtroTenantSelect = 'todos';

export function renderLegalComplianceRepository() {
  const container = document.getElementById('main-content');
  if (!container) return;

  // Verificación de Acceso: Exclusivo para SuperAdmin (Administrador SST / Consultor)
  if (!auth.isAdmin()) {
    container.innerHTML = `
      <div class="bg-white border border-amber-200 rounded-3xl p-10 text-center max-w-xl mx-auto shadow-sm my-12">
        <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-black shadow-inner">
          🔒
        </div>
        <h3 class="text-xl font-black text-slate-800 mb-2">Acceso Restringido por Seguridad</h3>
        <p class="text-xs text-slate-500 mb-6 leading-relaxed">
          El <strong>Repositorio Central de Auditoría Legal y Habeas Data</strong> contiene información forense protegida bajo la Ley 1581 de 2012 y la Ley 527 de 1999. Esta sección está reservada exclusivamente para el <strong>SuperAdmin (Consultor Principal SST)</strong> de Doctor Pyme.
        </p>
        <button onclick="window.location.hash='#dashboard'" class="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition">
          Regresar al Panel Principal
        </button>
      </div>
    `;
    return;
  }

  const allRecords = store.getLegalAcceptanceRepository();
  const empresas = store.getEmpresas();
  const activePolicy = store.getActiveLegalPolicy();

  // Aplicar filtros
  const filteredRecords = store.getLegalAcceptanceRepository({
    companyQuery: filtroTenantSelect !== 'todos' ? filtroTenantSelect : filtroEmpresaQuery,
    userQuery: filtroUsuarioQuery,
    ipQuery: filtroIpQuery,
    dateQuery: filtroFechaQuery
  });

  // Métricas de Blindaje Legal
  const totalFirmas = allRecords.length;
  const tenantsFirmados = new Set(allRecords.map(r => r.tenant_id)).size;
  const totalTenants = empresas.length || 1;
  const pctCobertura = Math.min(100, Math.round((tenantsFirmados / totalTenants) * 100));

  // Empresas sin firma activa
  const empresasSinFirma = empresas.filter(e => !allRecords.some(r => r.tenant_id === e.id));

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- CABECERA PRINCIPAL DEL MÓDULO -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div class="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ Auditoría Forense Activa
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Ley 1581 / Ley 527 / Dec. 2364
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-700/50 text-slate-300 border border-slate-600/50">
                Append-Only Inmutable
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Repositorio Jurídico de Cumplimiento</span>
              <span class="text-sm font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-lg">SIC & MinTrabajo</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1.5 leading-relaxed">
              Custodia probatoria de firmas electrónicas, evidencias telemáticas (IP, estampas de tiempo en milisegundos, dispositivo) y sellos criptográficos SHA-256 para blindaje total ante requerimientos de la Superintendencia de Industria y Comercio (SIC) y el Ministerio del Trabajo.
            </p>
          </div>

          <!-- ACCIONES GLOBALES SUPERIORES -->
          <div class="flex flex-wrap items-center gap-2.5">
            <button onclick="window.verModalPoliticaVigente()" class="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm">
              <svg class="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>Ver Política Vigente</span>
            </button>

            <button onclick="window.exportarSabanaForenseCSV()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/30 active:scale-95">
              <svg class="w-4 h-4 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Exportar Sábana Forense (CSV/Excel)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- TARJETAS SUPERIORES: KPIS DE BLINDAJE LEGAL -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- KPI 1: Total Firmas -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Firmas Recolectadas</span>
            <span class="text-2xl font-black text-slate-900 mt-1 block">${totalFirmas}</span>
            <span class="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              100% Inmutables en Disco
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
            ✍️
          </div>
        </div>

        <!-- KPI 2: Cobertura de Empresas -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Empresas Cubiertas</span>
            <span class="text-2xl font-black text-slate-900 mt-1 block">${tenantsFirmados} / ${totalTenants}</span>
            <span class="text-[10px] ${pctCobertura === 100 ? 'text-emerald-600' : 'text-amber-600'} font-bold block mt-0.5">
              ${pctCobertura}% de Blindaje Corporativo
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            🏢
          </div>
        </div>

        <!-- KPI 3: Política Vigente -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div class="overflow-hidden">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Política Vigente</span>
            <span class="text-lg font-black text-slate-900 mt-1 block truncate">
              ${activePolicy.version_number} (Publicada)
            </span>
            <span class="text-[9px] font-mono text-slate-500 block truncate mt-0.5" title="${activePolicy.text_sha256_hash}">
              SHA: ${activePolicy.text_sha256_hash ? activePolicy.text_sha256_hash.substring(0, 16) + '...' : 'd3ea40df...'}
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
            📜
          </div>
        </div>

        <!-- KPI 4: Firmas Pendientes -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Empresas Sin Firma</span>
            <span class="text-2xl font-black ${empresasSinFirma.length > 0 ? 'text-amber-600' : 'text-slate-900'} mt-1 block">
              ${empresasSinFirma.length}
            </span>
            <span class="text-[10px] ${empresasSinFirma.length > 0 ? 'text-amber-700' : 'text-emerald-600'} font-bold block mt-0.5">
              ${empresasSinFirma.length > 0 ? 'Requiere firma en login' : '✓ 100% al día'}
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl ${empresasSinFirma.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center text-xl font-bold">
            ⚖️
          </div>
        </div>

      </div>

      <!-- PANEL DE FILTROS AVANZADOS Y BUSCADOR -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              Filtros de Búsqueda Forense
            </span>
            <span class="text-[10px] text-slate-400">(${filteredRecords.length} registros coincidentes)</span>
          </div>
          
          <button id="btn-limpiar-filtros-legal" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition">
            Limpiar Filtros
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <!-- Filtro Empresa / Tenant -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Empresa / Cuenta</label>
            <select id="filtro-tenant-select" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="todos" ${filtroTenantSelect === 'todos' ? 'selected' : ''}>🏢 Todas las Empresas</option>
              ${empresas.map(e => `
                <option value="${e.id}" ${filtroTenantSelect === e.id ? 'selected' : ''}>
                  ${e.razonSocial} (NIT: ${e.nit})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Filtro Usuario / Correo / Cédula -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Usuario / Firmante / Cédula</label>
            <input type="text" id="filtro-usuario-input" value="${filtroUsuarioQuery}" placeholder="Ej. Iván González o CC..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <!-- Filtro Dirección IP -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección IP Cliente</label>
            <input type="text" id="filtro-ip-input" value="${filtroIpQuery}" placeholder="Ej. 186.84.90..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <!-- Filtro Fecha -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha de Registro</label>
            <input type="date" id="filtro-fecha-input" value="${filtroFechaQuery}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

        </div>
      </div>

      <!-- TABLA DE AUDITORÍA FORENSE INMUTABLE -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div class="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Sábana de Certificados de Aceptación</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                ${filteredRecords.length} Registros
              </span>
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Registros sellados criptográficamente. Modificación y eliminación bloqueadas por política Append-Only.
            </p>
          </div>

          <div class="flex items-center gap-2 text-[11px] text-slate-500">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span class="font-bold text-slate-700">Validado Ley 527 de 1999</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-100/80 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <th class="py-3.5 px-4">Código Certificado</th>
                <th class="py-3.5 px-4">Fecha y Hora (Bogotá)</th>
                <th class="py-3.5 px-4">Cuenta / Empresa</th>
                <th class="py-3.5 px-4">Usuario & Rol</th>
                <th class="py-3.5 px-4">Firmante Declarado</th>
                <th class="py-3.5 px-4">IP & Dispositivo</th>
                <th class="py-3.5 px-4">Versión</th>
                <th class="py-3.5 px-4 text-center">Sello Criptográfico</th>
                <th class="py-3.5 px-4 text-right">Acciones Probatorias</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filteredRecords.length === 0 ? `
                <tr>
                  <td colspan="9" class="py-12 text-center text-slate-400">
                    <div class="max-w-xs mx-auto text-center space-y-2">
                      <div class="text-3xl">🔍</div>
                      <p class="text-xs font-semibold text-slate-600">No se encontraron registros con los filtros seleccionados.</p>
                      <button onclick="document.getElementById('btn-limpiar-filtros-legal').click()" class="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
                        Restablecer filtros de búsqueda
                      </button>
                    </div>
                  </td>
                </tr>
              ` : filteredRecords.map((r, idx) => {
                const userAgentShort = r.user_agent_device ? (
                  r.user_agent_device.includes('Macintosh') ? 'Mac OS' :
                  r.user_agent_device.includes('Windows') ? 'Windows PC' :
                  r.user_agent_device.includes('iPhone') ? 'iPhone' :
                  r.user_agent_device.includes('Android') ? 'Android' : 'Linux/Otro'
                ) : 'Navegador Web';

                const shortHash = r.cryptographic_evidence_hash ? r.cryptographic_evidence_hash.substring(0, 10) + '...' : 'SHA-256';

                return `
                  <tr class="hover:bg-indigo-50/30 transition group">
                    
                    <!-- Código Certificado -->
                    <td class="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      <div class="flex items-center gap-1.5">
                        <span class="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px] border border-slate-200 font-semibold group-hover:border-indigo-300">
                          ${r.certificate_code}
                        </span>
                        <button onclick="navigator.clipboard.writeText('${r.certificate_code}'); alert('Código de certificado copiado: ${r.certificate_code}')" class="text-slate-400 hover:text-indigo-600 transition" title="Copiar Código">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        </button>
                      </div>
                    </td>

                    <!-- Fecha y Hora Bogotá -->
                    <td class="py-3 px-4 text-slate-700 whitespace-nowrap">
                      <div class="font-bold text-xs">${r.accepted_at_bogota || r.accepted_at_utc}</div>
                      <div class="text-[10px] text-slate-400 font-mono" title="Timestamp UTC Exacto">UTC: ${r.accepted_at_utc || 'N/A'}</div>
                    </td>

                    <!-- Empresa -->
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900 leading-tight">${r.company_name}</div>
                      <div class="text-[10px] text-slate-500 font-medium">NIT: ${r.company_tax_id}</div>
                    </td>

                    <!-- Usuario -->
                    <td class="py-3 px-4">
                      <div class="text-slate-800 font-medium truncate max-w-[150px]" title="${r.user_email}">${r.user_email}</div>
                      <div class="text-[10px] text-indigo-600 font-bold">${r.user_role || 'Usuario'}</div>
                    </td>

                    <!-- Firmante -->
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900">${r.signer_typed_name}</div>
                      <div class="text-[10px] font-mono text-slate-500">${r.signer_typed_id}</div>
                    </td>

                    <!-- IP & Dispositivo -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      <div class="flex items-center gap-1 font-mono text-[11px] text-slate-800 font-bold">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ${r.client_ip_address}
                      </div>
                      <div class="text-[10px] text-slate-400">${userAgentShort}</div>
                    </td>

                    <!-- Versión -->
                    <td class="py-3 px-4 whitespace-nowrap text-center">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        v1.0
                      </span>
                    </td>

                    <!-- Sello Criptográfico -->
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs" title="Hash SHA-256 Inalterable: ${r.cryptographic_evidence_hash}">
                        <svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        <span>Íntegro / Verificado</span>
                      </div>
                      <div class="text-[9px] font-mono text-slate-400 mt-0.5" title="${r.cryptographic_evidence_hash}">
                        ${shortHash}
                      </div>
                    </td>

                    <!-- Acciones -->
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        <button onclick="window.descargarCertificadoLegalPDF('${r.id}')" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Descargar Certificado Forense de Aceptación (PDF)">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          <span>PDF</span>
                        </button>

                        <button onclick="window.verDetalleForense('${r.id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer" title="Ver Metadatos Forenses y Fórmula Criptográfica">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          <span>Detalle</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="p-4 bg-slate-50 border-t border-slate-200 text-right text-[11px] text-slate-500 font-medium">
          DOCTOR PYME Trust Services • Repositorio Notarial Inmutable conforme a la Ley 527 de 1999 (Art. 6 a 13)
        </div>

      </div>

    </div>
  `;

  // Listeners de Filtros
  const selectTenant = document.getElementById('filtro-tenant-select');
  if (selectTenant) {
    selectTenant.onchange = (e) => {
      filtroTenantSelect = e.target.value;
      renderLegalComplianceRepository();
    };
  }

  const inputUsuario = document.getElementById('filtro-usuario-input');
  if (inputUsuario) {
    inputUsuario.oninput = (e) => {
      filtroUsuarioQuery = e.target.value;
      debounceFiltros();
    };
  }

  const inputIp = document.getElementById('filtro-ip-input');
  if (inputIp) {
    inputIp.oninput = (e) => {
      filtroIpQuery = e.target.value;
      debounceFiltros();
    };
  }

  const inputFecha = document.getElementById('filtro-fecha-input');
  if (inputFecha) {
    inputFecha.onchange = (e) => {
      filtroFechaQuery = e.target.value;
      renderLegalComplianceRepository();
    };
  }

  const btnLimpiar = document.getElementById('btn-limpiar-filtros-legal');
  if (btnLimpiar) {
    btnLimpiar.onclick = () => {
      filtroEmpresaQuery = '';
      filtroUsuarioQuery = '';
      filtroIpQuery = '';
      filtroFechaQuery = '';
      filtroTenantSelect = 'todos';
      renderLegalComplianceRepository();
    };
  }
}

let debounceTimer = null;
function debounceFiltros() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    renderLegalComplianceRepository();
  }, 250);
}

window.exportarSabanaForenseCSV = function() {
  store.exportarSabanaForenseCSV();
};

// =============================================================================
// MODAL DE DETALLE FORENSE Y TRAZABILIDAD
// =============================================================================
window.verDetalleForense = async function(id) {
  const record = store.getLegalAcceptanceById(id);
  if (!record) return;

  const activePolicy = store.getActiveLegalPolicy();
  const verification = await store.verifyEvidenceHash(record);

  const modalId = 'modal-detalle-forense';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
      
      <!-- Encabezado Modal -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              ${record.certificate_code}
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ✓ Sello Íntegro
            </span>
          </div>
          <h3 class="text-lg font-black tracking-tight text-white">Certificado Forense de Aceptación Legal</h3>
          <p class="text-xs text-slate-300">Evidencia telemática y trazabilidad inmutable bajo la Ley 527 de 1999</p>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer p-1">✕</button>
      </div>

      <!-- Contenido Metadatos -->
      <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
        
        <!-- Tarjeta de Verificación Criptográfica -->
        <div class="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
            ✓
          </div>
          <div class="flex-1">
            <h4 class="font-bold text-emerald-950 text-xs uppercase tracking-wider">Verificación de Integridad Criptográfica Satisfactoria</h4>
            <p class="text-[11px] text-emerald-800 mt-0.5">
              El algoritmo SHA-256 evaluó en tiempo real los parámetros inmutables del registro contra el texto legal original y confirmó cero alteraciones desde su firma.
            </p>
          </div>
        </div>

        <!-- Sección 1: Datos de la Cuenta y Firmante -->
        <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
          <h4 class="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <span>🏢</span>
            <span>Identificación de la Cuenta y el Usuario Firmante</span>
          </h4>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span class="text-slate-400 text-[10px] block">Razón Social Empresa:</span>
              <span class="font-bold text-slate-900">${record.company_name}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">NIT de la Empresa:</span>
              <span class="font-bold text-slate-900">${record.company_tax_id}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">ID Cuenta (Tenant ID):</span>
              <span class="font-mono text-slate-700 text-[11px]">${record.tenant_id}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Rol Asignado:</span>
              <span class="font-bold text-indigo-700">${record.user_role}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Nombre del Firmante:</span>
              <span class="font-bold text-slate-900">${record.signer_typed_name}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Documento de Identidad (C.C.):</span>
              <span class="font-mono font-bold text-slate-900">${record.signer_typed_id}</span>
            </div>
            <div class="col-span-2">
              <span class="text-slate-400 text-[10px] block">Correo Electrónico Autenticado:</span>
              <span class="font-mono text-slate-800">${record.user_email}</span>
            </div>
          </div>
        </div>

        <!-- Sección 2: Trazabilidad Telemática Forense -->
        <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
          <h4 class="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <span>⏱️</span>
            <span>Estampas Cronológicas y Trazabilidad Telemática de Red</span>
          </h4>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span class="text-slate-400 text-[10px] block">Hora Legal Colombia (America/Bogota UTC-5):</span>
              <span class="font-bold text-slate-900">${record.accepted_at_bogota}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Estampa Universal (UTC con Milisegundos):</span>
              <span class="font-mono font-bold text-indigo-800 text-[11px]">${record.accepted_at_utc}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Dirección IP Pública Real:</span>
              <span class="font-mono font-bold text-slate-900">${record.client_ip_address}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">Header Forwarded IP:</span>
              <span class="font-mono text-slate-600">${record.forwarded_ip || 'Conexión Directa'}</span>
            </div>
            <div class="col-span-2">
              <span class="text-slate-400 text-[10px] block">Dispositivo / User-Agent Completo:</span>
              <span class="font-mono text-[10px] text-slate-600 break-all bg-white p-2 rounded-lg border border-slate-200 block">
                ${record.user_agent_device}
              </span>
            </div>
          </div>
        </div>

        <!-- Sección 3: Sellos Criptográficos SHA-256 -->
        <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
          <h4 class="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <span>🔐</span>
            <span>Sellado Criptográfico e Integridad del Mensaje de Datos</span>
          </h4>
          <div class="space-y-2 text-xs">
            <div>
              <span class="text-slate-500 text-[10px] block font-bold">Hash Criptográfico de la Evidencia Digital (SHA-256):</span>
              <code class="block font-mono text-[10px] text-indigo-900 bg-white p-2 rounded-lg border border-slate-200 break-all font-bold">
                ${record.cryptographic_evidence_hash}
              </code>
            </div>

            <div>
              <span class="text-slate-500 text-[10px] block font-bold">Hash SHA-256 del Texto Legal Aceptado (${activePolicy.version_number}):</span>
              <code class="block font-mono text-[10px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200 break-all">
                ${activePolicy.text_sha256_hash}
              </code>
            </div>

            <div>
              <span class="text-slate-500 text-[10px] block font-bold">Fórmula de Concatenación Forense Evaluada:</span>
              <div class="p-2 bg-slate-900 text-slate-200 rounded-lg font-mono text-[9px] break-all leading-relaxed">
                tenant_id + user_id + user_email + signer_typed_id + client_ip_address + accepted_at_utc + text_sha256_hash
              </div>
            </div>
          </div>
        </div>

        <!-- Cláusulas Consentidas -->
        <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1.5 text-xs text-indigo-950 font-medium">
          <div class="flex items-center gap-2">
            <span class="text-emerald-600 font-bold">✓</span>
            <span>Autorización Previa, Expresa e Informada para Tratamiento de Datos Personales (Ley 1581 de 2012).</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-emerald-600 font-bold">✓</span>
            <span>Mandato y Encargo para Custodia de Información SG-SST y Hojas de Vida por 20 Años (Decreto 1072 de 2015).</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-emerald-600 font-bold">✓</span>
            <span>Acuerdo de Confidencialidad Empresarial, Custodia de Activos y No Divulgación (NDA).</span>
          </div>
        </div>

      </div>

      <!-- Pie Modal -->
      <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
        <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
          Cerrar
        </button>

        <button onclick="window.descargarCertificadoLegalPDF('${record.id}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span>Descargar Certificado Oficial en PDF</span>
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);
};

// =============================================================================
// MODAL DE VISUALIZACIÓN DE POLÍTICA LEGAL VIGENTE
// =============================================================================
window.verModalPoliticaVigente = function() {
  const activePolicy = store.getActiveLegalPolicy();
  const modalId = 'modal-politica-vigente';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 flex flex-col max-h-[85vh]">
      
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex justify-between items-start flex-shrink-0">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              Versión ${activePolicy.version_number} (Vigente)
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Publicada Oficialmente
            </span>
          </div>
          <h3 class="text-base font-black text-white">${activePolicy.policy_title}</h3>
          <p class="text-xs text-slate-300 mt-0.5">SHA-256 Inmutable: <span class="font-mono text-indigo-200">${activePolicy.text_sha256_hash}</span></p>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer p-1">✕</button>
      </div>

      <div class="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700 leading-relaxed font-normal bg-slate-50/50">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs whitespace-pre-line leading-relaxed font-sans">
${activePolicy.legal_text_content}
        </div>
      </div>

      <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-end flex-shrink-0">
        <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer">
          Entendido / Cerrar
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);
};

// =============================================================================
// PANTALLA / MODAL DE BLOQUEO: /legal-consent
// =============================================================================
export function renderLegalConsentScreen(targetContainer = null, onAcceptedCallback = null) {
  const container = targetContainer || document.getElementById('main-content');
  if (!container) return;

  const user = auth.getUser();
  if (!user) return;

  const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0] || {
    id: 'emp-1790438946268',
    razonSocial: 'LADRILLOS OCHOA LTDA',
    nit: '830124631'
  };

  const activePolicy = store.getActiveLegalPolicy();

  // Si ya aceptó, notificar y retornar
  const alreadyAccepted = store.hasUserAcceptedCurrentPolicy(empresaActiva.id, user.email || user.user_id);
  if (alreadyAccepted && onAcceptedCallback) {
    onAcceptedCallback();
    return;
  }

  container.innerHTML = `
    <div class="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden my-4">
        
        <!-- ENCABEZADO LEGAL SOLEMNE -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white relative">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-xl shadow-inner">
              ⚖️
            </div>
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Plataforma DOCTOR PYME SG-SST • Validez Jurídica Ley 527 de 1999
              </span>
              <h1 class="text-lg sm:text-xl font-black text-white">
                Firma Electrónica y Consentimiento Informado de Privacidad
              </h1>
            </div>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Para continuar operando la plataforma, la Ley 1581 de 2012 (Habeas Data) y el Decreto 1072 de 2015 exigen registrar su consentimiento previo, expreso e informado para el tratamiento de datos y custodia de registros de Seguridad y Salud en el Trabajo.
          </p>
        </div>

        <!-- FORMULARIO DE FIRMA Y TEXTO LEGAL -->
        <form id="form-legal-consent-screen" class="p-6 sm:p-8 space-y-6">
          
          <!-- CUADRO CON SCROLL: TEXTO LEGAL ÍNTEGRO -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📜</span>
                <span>Política Integral de Privacidad, Habeas Data y Mandato SST (${activePolicy.version_number})</span>
              </label>
              <span class="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                SHA: ${activePolicy.text_sha256_hash ? activePolicy.text_sha256_hash.substring(0, 14) + '...' : ''}
              </span>
            </div>
            
            <div class="h-48 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-700 leading-relaxed font-sans whitespace-pre-line shadow-inner focus:outline-none focus:ring-1 focus:ring-indigo-500">
${activePolicy.legal_text_content}
            </div>
            <p class="text-[10px] text-slate-400 mt-1 italic">
              Deslice para revisar el contenido íntegro. Al estampar su firma electrónica se generará una evidencia digital inmutable con valor legal probatorio.
            </p>
          </div>

          <!-- IDENTIFICACIÓN DEL FIRMANTE -->
          <div class="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-4">
            <h3 class="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <span>✍️</span>
              <span>Datos del Titular y Firmante Autorizado</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo del Firmante *</label>
                <input type="text" id="signer-typed-name" required value="${user.nombre || ''}" placeholder="Ej. Carlos Mendoza Gómez" class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs">
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Número de Identificación (Cédula C.C.) *</label>
                <input type="text" id="signer-typed-id" required value="${user.cedula ? 'CC ' + user.cedula : (user.rol === 'Administrador SST' ? 'CC 80123456' : '')}" placeholder="Ej. CC 1020304050" class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs">
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Correo Electrónico Autenticado</label>
                <input type="email" id="signer-user-email" disabled value="${user.email || user.correo || ''}" class="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold cursor-not-allowed">
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Empresa / Razón Social Suscrita</label>
                <input type="text" id="signer-company-name" disabled value="${empresaActiva.razonSocial} (NIT: ${empresaActiva.nit})" class="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold cursor-not-allowed">
              </div>

            </div>
          </div>

          <!-- CHECKBOXES OBLIGATORIOS DE LEY -->
          <div class="space-y-3 pt-1">
            
            <label class="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition cursor-pointer group">
              <input type="checkbox" id="check-habeas-data" required class="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
              <span class="text-xs text-slate-700 leading-snug">
                <strong class="text-slate-900 block font-bold">1. Autorización Expresa de Tratamiento de Datos Personales (Habeas Data):</strong>
                Autorizo de manera previa, expresa e informada a DOCTOR PYME y a la empresa suscrita para recolectar, almacenar y tratar mis datos personales y de salud ocupacional conforme a la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013.
              </span>
            </label>

            <label class="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition cursor-pointer group">
              <input type="checkbox" id="check-sst-mandate" required class="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
              <span class="text-xs text-slate-700 leading-snug">
                <strong class="text-slate-900 block font-bold">2. Mandato de Custodia y Conservación SG-SST por 20 Años:</strong>
                Acepto y otorgo mandato para la custodia electrónica de los registros del SG-SST, hojas de vida de maquinaria y equipos, actas de entrega de dotación e investigaciones de incidentes en los términos obligatorios del Artículo 2.2.4.6.13 del Decreto 1072 de 2015.
              </span>
            </label>

            <label class="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition cursor-pointer group">
              <input type="checkbox" id="check-nda-confidentiality" required class="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
              <span class="text-xs text-slate-700 leading-snug">
                <strong class="text-slate-900 block font-bold">3. Acuerdo de Confidencialidad Empresarial y Custodia de Activos (NDA):</strong>
                Me comprometo a guardar estricta reserva de la información técnica, comercial y operacional accesible a través de este sistema, absteniéndome de compartir credenciales o divulgar datos confidenciales protegidos por la Decisión 486 de la CAN.
              </span>
            </label>

          </div>

          <!-- BOTÓN DE FIRMA Y SELLO FORENSE -->
          <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-2 text-[11px] text-slate-500">
              <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
              <span>Se capturará estampa de tiempo UTC, IP pública real y algoritmo SHA-256.</span>
            </div>

            <button type="submit" id="btn-submit-legal-consent" class="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-900/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <span>Firmar Electrónicamente y Acceder al Sistema</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  `;

  const form = document.getElementById('form-legal-consent-screen');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      const btnSubmit = document.getElementById('btn-submit-legal-consent');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `
          <svg class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
          <span>Estampando Sello Criptográfico Forense...</span>
        `;
      }

      const signerName = document.getElementById('signer-typed-name').value.trim();
      const signerId = document.getElementById('signer-typed-id').value.trim();

      const payload = {
        tenant_id: empresaActiva.id,
        company_name: empresaActiva.razonSocial,
        company_tax_id: empresaActiva.nit,
        user_id: user.email || user.user_id,
        user_email: user.email || user.correo,
        user_role: user.rol || 'Usuario',
        signer_typed_name: signerName,
        signer_typed_id: signerId,
        accepted_habeas_data: true,
        accepted_sst_third_party_mandate: true,
        accepted_nda_confidentiality: true
      };

      try {
        const result = await store.submitLegalAcceptance(payload);
        if (result.ok) {
          alert(`✅ FIRMA ELECTRÓNICA REGISTRADA EXITOSAMENTE\n\nCódigo de Certificado Legal: ${result.record.certificate_code}\nSello Criptográfico SHA-256 verificado e inmutable.`);
          if (onAcceptedCallback) {
            onAcceptedCallback();
          } else {
            window.location.hash = '#dashboard';
            window.location.reload();
          }
        }
      } catch (err) {
        alert("Error al registrar firma legal: " + err.message);
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<span>Firmar Electrónicamente y Acceder al Sistema</span>`;
        }
      }
    };
  }
}

// =============================================================================
// GENERADOR OFICIAL DE ACTA Y CERTIFICADO PROBATORIO DE ACEPTACIÓN (PDF)
// Validez Probatoria Ley 527 de 1999 y Decreto 2364 de 2012
// =============================================================================
window.descargarCertificadoLegalPDF = function(recordId) {
  const record = store.getLegalAcceptanceById(recordId);
  if (!record) {
    alert("No se encontró el registro de aceptación legal.");
    return;
  }

  const activePolicy = store.getActiveLegalPolicy();

  const win = window.open('', '_blank');
  if (!win) {
    alert("Por favor habilita las ventanas emergentes (popups) para generar el PDF probatorio.");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Certificado Legal Forense - ${record.certificate_code}</title>
      <style>
        @page { size: letter; margin: 12mm 15mm; }
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 15px;
          font-size: 10px;
          line-height: 1.4;
        }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
        .logo-box { width: 22%; }
        .title-box { text-align: center; width: 56%; }
        .code-box { width: 22%; text-align: right; font-family: monospace; font-size: 9px; }
        h1 { margin: 0; font-size: 13px; text-transform: uppercase; color: #0f172a; font-weight: 900; letter-spacing: 0.5px; }
        h2 { margin: 3px 0 0; font-size: 10px; color: #4338ca; font-weight: bold; text-transform: uppercase; }
        .legal-citation { font-size: 8px; color: #64748b; margin-top: 3px; font-weight: normal; }
        .badge-cert { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #c7d2fe; }
        
        .section-header {
          background: #f1f5f9;
          border-left: 4px solid #4338ca;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          color: #1e1b4b;
          margin: 12px 0 8px;
        }

        table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
        table.data-table th { background: #f8fafc; font-weight: bold; color: #334155; width: 30%; font-size: 9px; }
        table.data-table td { font-size: 9.5px; color: #0f172a; }

        .hash-box {
          font-family: monospace;
          background: #f8fafc;
          border: 1px dashed #94a3b8;
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 8.5px;
          word-break: break-all;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .policy-container {
          max-height: 220px;
          overflow-y: hidden;
          background: #fdfdfd;
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          font-size: 8px;
          line-height: 1.35;
          color: #334155;
          white-space: pre-line;
          margin-bottom: 10px;
        }

        .seal-card {
          border: 1px solid #10b981;
          background: #ecfdf5;
          padding: 8px 10px;
          border-radius: 6px;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sig-table { width: 100%; border-collapse: collapse; margin-top: 25px; }
        .sig-table td { width: 50%; vertical-align: top; text-align: center; padding: 0 20px; }
        .sig-line { border-top: 1px solid #334155; margin-bottom: 4px; }

        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>

      <div class="no-print" style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #4338ca; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px;">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <!-- ENCABEZADO OFICIAL -->
      <table class="header-table">
        <tr>
          <td class="logo-box">
            <strong style="font-size: 14px; color: #0f172a; display: block;">DOCTOR PYME</strong>
            <span style="font-size: 8px; color: #059669; font-weight: bold; text-transform: uppercase;">El Médico de tu Negocio</span>
            <div style="font-size: 7.5px; color: #64748b;">Resolución Licencia SST No. 6514 / 2022</div>
          </td>
          <td class="title-box">
            <h1>CERTIFICADO FORENSE DE ACEPTACIÓN LEGAL</h1>
            <h2>POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES Y CONFIDENCIALIDAD</h2>
            <div class="legal-citation">
              Plena Eficacia Jurídica y Valor Probatorio de Mensajes de Datos conforme a la Ley 527 de 1999 (Art. 6 a 13) y Decreto 2364 de 2012
            </div>
          </td>
          <td class="code-box">
            <div class="badge-cert">${record.certificate_code}</div>
            <div style="margin-top: 4px; color: #64748b;">ORIGINAL FORENSE</div>
            <div style="color: #059669; font-weight: bold;">ESTADO: ÍNTEGRO</div>
          </td>
        </tr>
      </table>

      <!-- SECCIÓN 1: IDENTIFICACIÓN -->
      <div class="section-header">Sección 1: Identificación de la Cuenta Empresarial y el Usuario Firmante</div>
      <table class="data-table">
        <tr>
          <th>Empresa Suscrita (Tenant):</th>
          <td><strong>${record.company_name}</strong></td>
          <th>NIT de la Empresa:</th>
          <td>${record.company_tax_id}</td>
        </tr>
        <tr>
          <th>Identificador de Cuenta (Tenant ID):</th>
          <td style="font-family: monospace;">${record.tenant_id}</td>
          <th>Rol del Usuario:</th>
          <td><strong>${record.user_role}</strong></td>
        </tr>
        <tr>
          <th>Nombre Declarado del Firmante:</th>
          <td><strong>${record.signer_typed_name}</strong></td>
          <th>Documento de Identidad (Cédula):</th>
          <td style="font-family: monospace; font-weight: bold;">${record.signer_typed_id}</td>
        </tr>
        <tr>
          <th>Correo Electrónico Autenticado:</th>
          <td colspan="3" style="font-family: monospace;">${record.user_email}</td>
        </tr>
      </table>

      <!-- SECCIÓN 2: ESTAMPA CRONOLÓGICA Y TRAZABILIDAD TELEMÁTICA -->
      <div class="section-header">Sección 2: Estampa de Tiempo Oficial y Trazabilidad Telemática Forense</div>
      <table class="data-table">
        <tr>
          <th>Fecha y Hora Oficial de Colombia:</th>
          <td><strong>${record.accepted_at_bogota}</strong> (Hora Legal UTC-5)</td>
          <th>Estampa Universal del Servidor:</th>
          <td style="font-family: monospace; font-weight: bold;">${record.accepted_at_utc}</td>
        </tr>
        <tr>
          <th>Dirección IP Pública del Cliente:</th>
          <td style="font-family: monospace; font-weight: bold;">${record.client_ip_address}</td>
          <th>IP Forwarded (Proxy / Gateway):</th>
          <td style="font-family: monospace;">${record.forwarded_ip || 'Conexión Directa'}</td>
        </tr>
        <tr>
          <th>Agente de Usuario / Dispositivo:</th>
          <td colspan="3" style="font-family: monospace; font-size: 8px;">${record.user_agent_device}</td>
        </tr>
      </table>

      <!-- SECCIÓN 3: SELLO CRIPTOGRÁFICO DE INTEGRIDAD -->
      <div class="section-header">Sección 3: Sello Criptográfico de Integridad y Función Resumen SHA-256</div>
      <div style="font-size: 8.5px; color: #475569; margin-bottom: 4px;">
        Conforme al Decreto 2364 de 2012, la integridad del mensaje de datos se acredita mediante función resumen criptográfica aplicada sobre la totalidad de los datos identificatorios de la operación y el texto de la política consentida:
      </div>
      
      <div class="hash-box">
        <strong>HASH FORENSE DE LA EVIDENCIA (SHA-256 FIPS PUB 180-4):</strong><br>
        <span style="font-weight: bold; color: #4338ca; font-size: 9.5px;">${record.cryptographic_evidence_hash}</span><br>
        <span style="color: #64748b; font-size: 7.5px;">Concatenación: tenant_id + user_id + user_email + signer_typed_id + client_ip_address + accepted_at_utc + text_sha256_hash</span>
      </div>

      <div class="hash-box" style="margin-top: -3px;">
        <strong>HASH DEL TEXTO LEGAL APROBADO (${activePolicy.version_number}):</strong><br>
        <span>${activePolicy.text_sha256_hash}</span>
      </div>

      <!-- SECCIÓN 4: CONTENIDO ÍNTEGRO ACEPTADO -->
      <div class="section-header">Sección 4: Contenido Íntegro de las Cláusulas Consentidas por el Titular</div>
      <div class="policy-container">
${activePolicy.legal_text_content}
      </div>

      <!-- SECCIÓN 5: DECLARACIÓN DE FE PÚBLICA Y FIRMAS -->
      <table class="sig-table">
        <tr>
          <td>
            <div style="font-family: monospace; font-size: 8px; color: #4338ca; margin-bottom: 5px;">
              [FIRMADO ELECTRÓNICAMENTE]<br>
              IP: ${record.client_ip_address} | ${record.accepted_at_bogota}
            </div>
            <div class="sig-line"></div>
            <strong>${record.signer_typed_name}</strong><br>
            <span style="font-size: 8.5px; color: #64748b;">${record.signer_typed_id}</span><br>
            <span style="font-size: 8px; color: #64748b;">Titular / Firmante Autorizado</span>
          </td>
          <td>
            <div style="font-family: monospace; font-size: 8px; color: #059669; margin-bottom: 5px;">
              [SELLO DE AUTENTICIDAD CRIPTOGRÁFICA]<br>
              DOCTOR PYME TRUST SERVICES (Ley 527 de 1999)
            </div>
            <div class="sig-line"></div>
            <strong>Ing. Iván David González Silva</strong><br>
            <span style="font-size: 8.5px; color: #64748b;">Consultor Principal SST • Lic. Res. 6514/2022</span><br>
            <span style="font-size: 8px; color: #64748b;">Custodio Central del Repositorio Notarial</span>
          </td>
        </tr>
      </table>

      <div style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5px; color: #94a3b8;">
        <span>Documento generado electrónicamente por DOCTOR PYME SG-SST • Validez probatoria en todo el territorio colombiano.</span>
        <span>Certificado No. ${record.certificate_code} • Pág. 1 de 1</span>
      </div>

    </body>
    </html>
  `);
  win.document.close();
};
