// =============================================================================
// COMPONENTE: GESTIÓN DE EMPRESAS CLIENTES (MULTI-EMPRESA) - DOCTOR PYME
// Incluye administración de Mapa de Procesos, Organigrama y Panel de Accesos
// =============================================================================
import { store } from '../store.js';
import { auth } from '../auth.js';
import { determinarGrupoEstandares } from '../standards.js';
import { evidenceDB, leerArchivoDataUrl } from '../db.js';
import { comprimirImagen } from '../services/compressionService.js';

let filtroBusqueda = '';
let pestanaEmpresas = 'directorio'; // 'directorio' | 'accesos'
let filtroEstadoAcceso = 'todos'; // 'todos' | 'activos' | 'inactivos'
let filtroBusquedaAccesos = '';
let fileLogoSeleccionado = null;
let dataUrlLogo = null;
let quitarLogoFlag = false;
let fileMapaProcesosSeleccionado = null;
let fileOrganigramaSeleccionado = null;
let dataUrlMapaProcesos = null;
let metaMapaProcesos = null;
let dataUrlOrganigrama = null;
let metaOrganigrama = null;
let quitarMapaProcesosFlag = false;
let quitarOrganigramaFlag = false;

export function renderCompanies() {
  const container = document.getElementById('main-content');
  const esSuperAdmin = auth.isSuperAdmin();
  if (!esSuperAdmin) {
    pestanaEmpresas = 'directorio';
  }
  const empresas = store.getEmpresas();
  const empresaActivaId = store.getEmpresaActivaId();
  const accesos = store.getAccesosEmpresas();

  const totalEmpresas = accesos.length;
  const totalActivas = accesos.filter(a => a.estado === 'ACTIVO').length;
  const totalInactivas = accesos.filter(a => a.estado === 'INACTIVO').length;

  const empresasFiltradas = empresas.filter(e => {
    const term = (filtroBusqueda || '').toLowerCase().trim();
    if (!term) return true;
    return (e.razonSocial || '').toLowerCase().includes(term) ||
           (e.nit || '').toLowerCase().includes(term) ||
           (e.sector || '').toLowerCase().includes(term) ||
           (e.ciudad || '').toLowerCase().includes(term);
  });

  const accesosFiltrados = accesos.filter(a => {
    if (filtroEstadoAcceso === 'activos' && a.estado !== 'ACTIVO') return false;
    if (filtroEstadoAcceso === 'inactivos' && a.estado !== 'INACTIVO') return false;

    const term = (filtroBusquedaAccesos || '').toLowerCase().trim();
    if (!term) return true;
    return (a.razonSocial || '').toLowerCase().includes(term) ||
           (a.nit || '').toLowerCase().includes(term) ||
           (a.usuario || '').toLowerCase().includes(term) ||
           (a.ciudad || '').toLowerCase().includes(term);
  });

  const empresaActiva = store.getEmpresaActiva() || empresas[0];
  const onboarding = empresaActiva ? store.getOnboardingProgress(empresaActiva.id) : { paso1: false, paso2: false, paso3: false, paso4: false, total: 0 };

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- BANNER: ONBOARDING OPERATIVO DE LA EMPRESA (PROCESS-DRIVEN ARCHITECTURE) -->
      ${empresaActiva ? `
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl text-white shadow-xl border border-indigo-500/30">
          <div class="flex flex-col md:flex-row justify-between md:items-center gap-3 pb-3 border-b border-white/10">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Onboarding Operativo SG-SST
                </span>
                <span class="text-xs text-slate-300 font-bold">🏢 ${empresaActiva.razonSocial}</span>
                <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">Riesgo Clase ${empresaActiva.claseRiesgo}</span>
              </div>
              <h3 class="text-base font-black text-white mt-1">
                Ruta Guiada por Procesos (Process-Driven Architecture)
              </h3>
              <p class="text-xs text-slate-400">
                Todo el SG-SST, la nómina y la Matriz GTC 45 nacen del ADN corporativo y la Caracterización de Procesos.
              </p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <div class="text-right">
                <span class="text-xs text-slate-300 block font-semibold">Progreso de Configuración:</span>
                <span class="text-lg font-black text-emerald-400">${onboarding.total}%</span>
              </div>
              <div class="w-24 bg-white/10 rounded-full h-3 p-0.5 border border-white/20">
                <div class="bg-gradient-to-r from-emerald-400 to-teal-400 h-2 rounded-full transition-all duration-500" style="width: ${onboarding.total}%"></div>
              </div>
            </div>
          </div>

          <!-- Los 4 Pasos Secuenciales -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            <!-- Paso 1 -->
            <div class="p-3 rounded-xl border ${onboarding.paso1 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/10'} flex items-start gap-2.5">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${onboarding.paso1 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-white/20 text-white'} flex-shrink-0">
                ${onboarding.paso1 ? '✓' : '1'}
              </span>
              <div class="min-w-0">
                <span class="text-xs font-bold block ${onboarding.paso1 ? 'text-emerald-300' : 'text-slate-200'}">Paso 1: Perfil & ADN</span>
                <span class="text-[10px] text-slate-400 block mt-0.5">Contexto corporativo e IA</span>
                <button onclick="window.editarEmpresa('${empresaActiva.id}')" class="text-[10px] font-bold text-indigo-300 hover:text-white underline mt-1 block cursor-pointer">
                  ${onboarding.paso1 ? 'Editar Perfil' : 'Completar con IA →'}
                </button>
              </div>
            </div>

            <!-- Paso 2 -->
            <div class="p-3 rounded-xl border ${onboarding.paso2 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/10'} flex items-start gap-2.5">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${onboarding.paso2 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-white/20 text-white'} flex-shrink-0">
                ${onboarding.paso2 ? '✓' : '2'}
              </span>
              <div class="min-w-0">
                <span class="text-xs font-bold block ${onboarding.paso2 ? 'text-emerald-300' : 'text-slate-200'}">Paso 2: Mapa & SIPOC</span>
                <span class="text-[10px] text-slate-400 block mt-0.5">Caracterización PHVA</span>
                <a href="#procesos" class="text-[10px] font-bold text-indigo-300 hover:text-white underline mt-1 block">
                  ${onboarding.paso2 ? 'Ver Procesos' : 'Caracterizar →'}
                </a>
              </div>
            </div>

            <!-- Paso 3 -->
            <div class="p-3 rounded-xl border ${onboarding.paso3 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/10'} flex items-start gap-2.5">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${onboarding.paso3 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-white/20 text-white'} flex-shrink-0">
                ${onboarding.paso3 ? '✓' : '3'}
              </span>
              <div class="min-w-0">
                <span class="text-xs font-bold block ${onboarding.paso3 ? 'text-emerald-300' : 'text-slate-200'}">Paso 3: Cargos & PTS</span>
                <span class="text-[10px] text-slate-400 block mt-0.5">Manuales y 6 Docs PDF</span>
                <a href="#procesos" onclick="window.cambiarPestanaProcesos && window.cambiarPestanaProcesos('cargos')" class="text-[10px] font-bold text-indigo-300 hover:text-white underline mt-1 block">
                  ${onboarding.paso3 ? 'Catálogo Aprobado' : 'Generar Docs →'}
                </a>
              </div>
            </div>

            <!-- Paso 4 -->
            <div class="p-3 rounded-xl border ${onboarding.paso4 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/10'} flex items-start gap-2.5">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${onboarding.paso4 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-white/20 text-white'} flex-shrink-0">
                ${onboarding.paso4 ? '✓' : '4'}
              </span>
              <div class="min-w-0">
                <span class="text-xs font-bold block ${onboarding.paso4 ? 'text-emerald-300' : 'text-slate-200'}">Paso 4: Despliegue</span>
                <span class="text-[10px] text-slate-400 block mt-0.5">Portal Nómina & GTC 45</span>
                <div class="flex gap-2 mt-1">
                  <a href="#portal-trabajador" class="text-[10px] font-bold text-indigo-300 hover:text-white underline">Portal</a>
                  <span class="text-[10px] text-slate-500">•</span>
                  <a href="#matriz" class="text-[10px] font-bold text-indigo-300 hover:text-white underline">GTC 45</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Encabezado y Acciones -->
      <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <span>${esSuperAdmin ? 'Directorio Multi-Empresa & RBAC' : 'Perfil Institucional & Estructura SG-SST'}</span>
            <span>•</span>
            <span>Doctor Pyme SG-SST</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-800">${esSuperAdmin ? 'Directorio & Accesos de Empresas' : 'Perfil Corporativo de Mi Empresa'}</h1>
          <p class="text-sm text-slate-500">${esSuperAdmin ? 'Gestiona las empresas clientes, sus diagramas estructurales, y administra sus datos de acceso para activar o suspender su ingreso.' : 'Consulta y actualiza la información legal, logotipo oficial, ADN corporativo y diagramas estructurales de tu organización.'}</p>
        </div>
        ${esSuperAdmin ? `
          <button id="btn-nueva-empresa" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Nueva Empresa Cliente
          </button>
        ` : (empresaActiva ? `
          <button onclick="window.editarEmpresa('${empresaActiva.id}')" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            Editar Perfil y Diagramas
          </button>
        ` : '')}
      </div>

      ${esSuperAdmin ? `
      <!-- Barra de Pestañas de Navegación (Exclusivo Super Administrador) -->
      <div class="flex border-b border-slate-200 gap-2">
        <button 
          type="button"
          onclick="window.cambiarPestanaEmpresas('directorio')" 
          class="pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${pestanaEmpresas === 'directorio' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}"
        >
          <span>🏢 Directorio de Empresas</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${pestanaEmpresas === 'directorio' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}">
            ${empresas.length}
          </span>
        </button>

        <button 
          type="button"
          onclick="window.cambiarPestanaEmpresas('accesos')" 
          class="pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${pestanaEmpresas === 'accesos' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}"
        >
          <span>🔐 Panel de Accesos & Credenciales</span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${pestanaEmpresas === 'accesos' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}">
            🟢 ${totalActivas} Activas / 🔴 ${totalInactivas} Inactivas
          </span>
        </button>
      </div>
      ` : ''}

      ${pestanaEmpresas === 'directorio' ? `
        <!-- VISTA 1: DIRECTORIO DE EMPRESAS (TARJETAS) -->
        ${esSuperAdmin ? `
        <!-- Barra de Filtros y Búsqueda -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <input 
              type="text" 
              id="input-buscar-empresa"
              placeholder="Buscar por razón social, NIT o ciudad..." 
              value="${filtroBusqueda}"
              class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <div class="text-xs text-slate-500 font-medium">
            Mostrando <strong>${empresasFiltradas.length}</strong> de <strong>${empresas.length}</strong> empresas clientes
          </div>
        </div>
        ` : ''}

        <!-- Tarjetas de Empresas -->
        <div class="grid grid-cols-1 ${esSuperAdmin ? 'md:grid-cols-2 lg:grid-cols-3' : 'max-w-xl'} gap-5">
          ${empresasFiltradas.map(emp => {
            const esActiva = emp.id === empresaActivaId;
            const estadoAcceso = (emp.acceso?.estado || 'ACTIVO').toUpperCase();
            const esAccesoActivo = estadoAcceso === 'ACTIVO';
            const tagColors = {
              7: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              21: 'bg-blue-50 text-blue-700 border-blue-200',
              60: 'bg-purple-50 text-purple-700 border-purple-200'
            };

            const policyRecord = store.getCompanyDataPolicyRecord(emp.id);

            return `
              <div class="bg-white rounded-xl border ${esActiva ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200 shadow-sm'} p-5 flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="px-2.5 py-1 rounded-md text-xs font-bold border ${tagColors[emp.estandaresAplicables] || 'bg-slate-100 text-slate-700'}">
                        ${emp.estandaresAplicables} Estándares (Res. 0312)
                      </span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${esAccesoActivo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}">
                        ${esAccesoActivo ? '🟢 Activa' : '🔴 Inactiva'}
                      </span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold border bg-teal-50 text-teal-800 border-teal-200" title="Política de Tratamiento de Datos firmada por única vez al registrar la empresa (${policyRecord?.certificate_code || 'Ley 1581'})">
                        🛡️ Habeas Data: Firmada (1 Vez)
                      </span>
                    </div>

                    <div class="flex items-center gap-1">
                      ${esSuperAdmin ? `
                      <button 
                        onclick="window.toggleAccesoEmpresa('${emp.id}')" 
                        class="p-1 text-slate-400 hover:${esAccesoActivo ? 'text-amber-600' : 'text-emerald-600'} transition cursor-pointer" 
                        title="${esAccesoActivo ? 'Suspender/Inactivar acceso de empresa' : 'Habilitar acceso de empresa'}"
                      >
                        <span class="text-xs">${esAccesoActivo ? '⏸️' : '▶️'}</span>
                      </button>
                      ` : ''}
                      <button onclick="window.editarEmpresa('${emp.id}')" class="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer" title="Editar datos y diagramas">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      ${esSuperAdmin ? `
                      <button onclick="window.eliminarEmpresa('${emp.id}')" class="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer" title="Eliminar empresa">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                      ` : ''}
                    </div>
                  </div>

                  <div class="flex items-center gap-3 mt-3">
                    ${emp.logoUrl ? `
                      <img src="${emp.logoUrl}" alt="${emp.razonSocial}" class="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-white p-1 flex-shrink-0 shadow-2xs">
                    ` : `
                      <div class="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black flex items-center justify-center flex-shrink-0 text-sm shadow-2xs">
                        ${(emp.razonSocial || 'EP').substring(0, 2).toUpperCase()}
                      </div>
                    `}
                    <div class="min-w-0 flex-1">
                      <h3 class="font-bold text-slate-800 text-base leading-snug truncate" title="${emp.razonSocial}">${emp.razonSocial}</h3>
                      <p class="text-xs text-slate-500 mt-0.5">NIT: ${emp.nit}</p>
                    </div>
                  </div>

                  <div class="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div class="flex justify-between">
                      <span class="text-slate-400">Rep. Legal:</span>
                      <span class="font-semibold text-slate-700 truncate max-w-[170px]" title="${emp.representanteLegal || 'Sin registrar'}">${emp.representanteLegal || 'Sin registrar'}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Clase de Riesgo:</span>
                      <span class="font-bold text-slate-700">Clase ${emp.claseRiesgo}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">N° Trabajadores:</span>
                      <span class="font-bold text-slate-700">${emp.trabajadores} trabajadores</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">ARL Asignada:</span>
                      <span class="font-medium text-slate-700">${emp.arl}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Ciudad / Sede:</span>
                      <span class="text-slate-700">${emp.ciudad}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Responsable SST:</span>
                      <span class="text-slate-700 truncate max-w-[170px]" title="${emp.responsableSST || ''}">${emp.responsableSST || 'Sin asignar'}</span>
                    </div>
                    <div class="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span class="text-slate-400">Política Datos (Única):</span>
                      <span class="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">${policyRecord?.certificate_code || 'DP-LEGAL-ACTIVO'}</span>
                    </div>
                  </div>

                  <!-- Botones de Visualización de Diagramas (Mapa & Organigrama) -->
                  <div class="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button type="button" onclick="window.abrirVisorDiagrama('${emp.id}', 'mapa_procesos')" class="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition border border-indigo-200/60 flex items-center justify-center gap-1.5 shadow-2xs" title="Ver Mapa de Procesos de ${emp.razonSocial}">
                      <span>🗺️</span> <span class="truncate">Mapa Procesos</span>
                    </button>
                    <button type="button" onclick="window.abrirVisorDiagrama('${emp.id}', 'organigrama')" class="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition border border-blue-200/60 flex items-center justify-center gap-1.5 shadow-2xs" title="Ver Organigrama de ${emp.razonSocial}">
                      <span>👥</span> <span class="truncate">Organigrama</span>
                    </button>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100">
                  ${esActiva ? `
                    <div class="w-full py-2 bg-indigo-50 text-indigo-700 text-center rounded-lg text-xs font-bold border border-indigo-200 flex items-center justify-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                      Empresa Activa en Gestión
                    </div>
                  ` : `
                    <button onclick="window.cambiarEmpresaActiva('${emp.id}')" class="w-full py-2 bg-slate-800 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition shadow-sm">
                      Seleccionar como Activa
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <!-- VISTA 2: PANEL DE ADMINISTRACIÓN DE ACCESOS & CREDENCIALES -->
        <!-- Tarjetas KPI Resumen -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Empresas</p>
              <p class="text-2xl font-black text-slate-800 mt-1">${totalEmpresas}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">Empresas registradas</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
              🏢
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-emerald-700 uppercase tracking-wide">Accesos Activos</p>
              <p class="text-2xl font-black text-emerald-600 mt-1">${totalActivas}</p>
              <p class="text-[10px] text-emerald-600 mt-0.5">Habilitados para ingresar</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
              🟢
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-red-700 uppercase tracking-wide">Accesos Inactivos</p>
              <p class="text-2xl font-black text-red-600 mt-1">${totalInactivas}</p>
              <p class="text-[10px] text-red-600 mt-0.5">Ingreso bloqueado/suspendido</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">
              🔴
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-teal-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-teal-700 uppercase tracking-wide">Seguridad de Acceso</p>
              <p class="text-sm font-black text-slate-800 mt-1">RBAC Multi-Empresa</p>
              <p class="text-[10px] text-teal-700 mt-0.5">Dec. 1072 & Res. 0312</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl font-bold">
              🛡️
            </div>
          </div>
        </div>

        <!-- Barra de Filtros y Búsqueda de Accesos -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <input 
              type="text" 
              id="input-buscar-accesos"
              placeholder="Buscar por empresa, NIT o usuario..." 
              value="${filtroBusquedaAccesos}"
              class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs text-slate-500 font-semibold">Filtrar por Estado:</span>
            <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button 
                onclick="window.cambiarFiltroEstadoAcceso('todos')" 
                class="px-3 py-1 rounded-md font-bold transition cursor-pointer ${filtroEstadoAcceso === 'todos' ? 'bg-white shadow-2xs text-slate-800' : 'text-slate-500 hover:text-slate-800'}"
              >
                Todas (${totalEmpresas})
              </button>
              <button 
                onclick="window.cambiarFiltroEstadoAcceso('activos')" 
                class="px-3 py-1 rounded-md font-bold transition cursor-pointer ${filtroEstadoAcceso === 'activos' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-700'}"
              >
                🟢 Activas (${totalActivas})
              </button>
              <button 
                onclick="window.cambiarFiltroEstadoAcceso('inactivos')" 
                class="px-3 py-1 rounded-md font-bold transition cursor-pointer ${filtroEstadoAcceso === 'inactivos' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-500 hover:text-red-700'}"
              >
                🔴 Inactivas (${totalInactivas})
              </button>
            </div>
          </div>
        </div>

        <!-- Tabla de Administración de Accesos -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[11px]">
                <tr>
                  <th class="py-3 px-4">Empresa Cliente</th>
                  <th class="py-3 px-4">Usuario / Correo de Ingreso</th>
                  <th class="py-3 px-4">Contraseña Asignada</th>
                  <th class="py-3 px-4 text-center">Estado del Acceso</th>
                  <th class="py-3 px-4 text-center">Último Ingreso</th>
                  <th class="py-3 px-4 text-right">Ficha & Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${accesosFiltrados.length === 0 ? `
                  <tr>
                    <td colspan="6" class="py-8 text-center text-slate-400">
                      No se encontraron empresas con el filtro seleccionado.
                    </td>
                  </tr>
                ` : accesosFiltrados.map(a => {
                  const esActivo = a.estado === 'ACTIVO';
                  return `
                    <tr class="hover:bg-slate-50/80 transition ${!esActivo ? 'bg-red-50/25' : ''}">
                      <!-- Columna 1: Empresa -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-3">
                          ${a.logoUrl ? `
                            <img src="${a.logoUrl}" alt="${a.razonSocial}" class="w-10 h-10 object-contain rounded-xl border border-slate-200 bg-white p-1 flex-shrink-0">
                          ` : `
                            <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black flex items-center justify-center flex-shrink-0 text-xs">
                              ${(a.razonSocial || 'EP').substring(0, 2).toUpperCase()}
                            </div>
                          `}
                          <div>
                            <p class="font-bold text-slate-900 leading-snug">${a.razonSocial}</p>
                            <p class="text-[11px] text-slate-500">NIT: ${a.nit} • ${a.ciudad || 'Colombia'}</p>
                            <span class="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              ${a.estandaresAplicables} Estándares • Riesgo ${a.claseRiesgo}
                            </span>
                          </div>
                        </div>
                      </td>

                      <!-- Columna 2: Usuario -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-1.5">
                          <input 
                            type="text" 
                            id="emp-user-${a.empresaId}" 
                            value="${a.usuario || a.email || ''}" 
                            placeholder="usuario@empresa.com" 
                            class="w-48 sm:w-52 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          >
                          <button 
                            type="button"
                            onclick="window.actualizarUsuarioEmpresa('${a.empresaId}')" 
                            class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer" 
                            title="Guardar usuario de ingreso"
                          >
                            💾
                          </button>
                        </div>
                        <span class="text-[10px] text-slate-400 block mt-0.5 font-medium">Login con usuario, correo o NIT</span>
                      </td>

                      <!-- Columna 3: Contraseña -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-1.5">
                          <input 
                            type="password" 
                            id="emp-pass-${a.empresaId}" 
                            value="${a.password || ''}" 
                            placeholder="••••••••" 
                            class="w-32 sm:w-36 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          >
                          <button 
                            type="button" 
                            onclick="window.toggleVerPasswordEmpresa('${a.empresaId}')" 
                            class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer" 
                            title="Ver / Ocultar Contraseña"
                          >
                            👁️
                          </button>
                          <button 
                            type="button" 
                            onclick="window.generarPasswordEmpresa('${a.empresaId}')" 
                            class="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg transition cursor-pointer" 
                            title="Generar Contraseña Aleatoria Segura"
                          >
                            🎲
                          </button>
                          <button 
                            type="button"
                            onclick="window.actualizarPasswordEmpresa('${a.empresaId}')" 
                            class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer" 
                            title="Guardar Contraseña"
                          >
                            💾
                          </button>
                        </div>
                        <span class="text-[10px] text-slate-400 block mt-0.5 font-medium">Genera una clave aleatoria con 🎲</span>
                      </td>

                      <!-- Columna 4: Estado & Switch Activo/Inactivo -->
                      <td class="py-3.5 px-4 text-center">
                        <div class="inline-flex flex-col items-center gap-1.5">
                          <button 
                            type="button" 
                            onclick="window.toggleAccesoEmpresa('${a.empresaId}')" 
                            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${esActivo ? 'bg-emerald-500' : 'bg-slate-300'}"
                            role="switch" 
                            aria-checked="${esActivo}"
                            title="${esActivo ? 'Clic para suspender/inactivar cuenta' : 'Clic para habilitar/activar cuenta'}"
                          >
                            <span class="sr-only">Estado de la cuenta</span>
                            <span 
                              aria-hidden="true" 
                              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${esActivo ? 'translate-x-5' : 'translate-x-0'}"
                            ></span>
                          </button>
                          <span class="text-[11px] font-black ${esActivo ? 'text-emerald-700' : 'text-red-600'}">
                            ${esActivo ? '🟢 ACTIVO' : '🔴 INACTIVO'}
                          </span>
                          <span class="text-[9px] text-slate-400">
                            ${esActivo ? 'Ingreso permitido' : 'Ingreso bloqueado'}
                          </span>
                        </div>
                      </td>

                      <!-- Columna 5: Último Ingreso -->
                      <td class="py-3.5 px-4 text-center">
                        ${a.ultimoIngreso ? `
                          <div class="text-xs font-semibold text-slate-700">
                            ${new Date(a.ultimoIngreso).toLocaleDateString()}
                          </div>
                          <div class="text-[10px] text-slate-400">
                            ${new Date(a.ultimoIngreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ` : `
                          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Sin ingresos aún
                          </span>
                        `}
                      </td>

                      <!-- Columna 6: Acciones -->
                      <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button 
                            type="button"
                            onclick="window.copiarFichaAcceso('${a.empresaId}')" 
                            class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Copiar Ficha Completa para WhatsApp / Correo"
                          >
                            <span>📋</span> <span class="truncate">Copiar Ficha</span>
                          </button>
                          <button 
                            type="button"
                            onclick="window.probarIngresoEmpresa('${a.empresaId}')" 
                            class="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Iniciar Sesión como esta Empresa"
                          >
                            <span>🔑</span> <span>Entrar</span>
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
      `}
    </div>

    <!-- Modal de Formulario Crear/Editar Empresa -->
    <div id="modal-empresa" class="fixed inset-0 bg-slate-900/75 hidden items-center justify-center z-50 p-3 sm:p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-fadeIn">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 id="modal-empresa-titulo" class="font-bold text-lg text-slate-800">Nueva Empresa Cliente</h3>
            <p class="text-xs text-slate-500">Ingresa la información legal, mapa de procesos y organigrama institucional.</p>
          </div>
          <button onclick="window.cerrarModalEmpresa()" class="text-slate-400 hover:text-slate-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form id="form-empresa" class="p-6 space-y-4">
          <input type="hidden" id="emp-id">

          <!-- Sección Carga de Logotipo Oficial -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <span>🏢</span> Logotipo Oficial de la Empresa
              </label>
              <span id="badge-logo-estado" class="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600">Recomendado</span>
            </div>
            <p class="text-[11px] text-slate-500 leading-tight">
              Personaliza con este logo los documentos, membretes oficiales, actas, formatos PDF y reportes del SG-SST.
            </p>
            
            <div class="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div id="preview-logo-container" class="hidden relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-300 bg-white shadow-xs flex-shrink-0 flex items-center justify-center p-1">
                <img id="preview-logo-img" src="" alt="Logo Empresa" class="w-full h-full object-contain">
                <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button type="button" id="btn-quitar-logo" class="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold shadow hover:bg-red-700">Quitar</button>
                </div>
              </div>

              <label id="dropzone-logo" class="flex-1 w-full flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl cursor-pointer bg-white transition text-center">
                <svg class="w-5 h-5 text-indigo-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="text-xs text-indigo-600 font-semibold" id="texto-dropzone-logo">Cargar logotipo de la empresa</span>
                <span class="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG o WebP (Optimizado automáticamente)</span>
                <input type="file" id="file-empresa-logo" accept="image/*,.svg" class="hidden">
              </label>
            </div>
          </div>

          <!-- Datos Principales -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Razón Social *</label>
              <input type="text" id="emp-razon" required placeholder="Ej. Soluciones Industriales SAS" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">NIT *</label>
              <input type="text" id="emp-nit" required placeholder="Ej. 901.123.456-7" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Representante Legal (Nombre y C.C.) *</label>
              <input type="text" id="emp-representante" required placeholder="Ej. Bernardo Ochoa Gómez - C.C. 19.345.678" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">ARL Asignada *</label>
              <select id="emp-arl" required class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="SURA">SURA</option>
                <option value="Positiva">Positiva Compañía de Seguros</option>
                <option value="Seguros Bolívar">Seguros Bolívar</option>
                <option value="AXA Colpatria">AXA Colpatria</option>
                <option value="Colmena Seguros">Colmena Seguros</option>
                <option value="La Equidad">La Equidad Seguros</option>
                <option value="Mapfre">Mapfre</option>
                <option value="Otra">Otra</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Clase de Riesgo (ARL) *</label>
              <select id="emp-riesgo" required class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800">
                <option value="I">Clase I (Riesgo Mínimo - Financiero, oficinas)</option>
                <option value="II">Clase II (Riesgo Bajo - Manufactura ligera, comercio)</option>
                <option value="III">Clase III (Riesgo Medio - Talleres, alimentos)</option>
                <option value="IV">Clase IV (Riesgo Alto - Transporte, químicos)</option>
                <option value="V">Clase V (Riesgo Máximo - Construcción, minería, explosivos)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">N° Trabajadores *</label>
              <input type="number" id="emp-trabajadores" required min="1" max="10000" placeholder="Ej. 15" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800">
            </div>
          </div>

          <!-- Cuadro de Autoclasificación en Tiempo Real -->
          <div id="caja-clasificacion" class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-3">
            <svg class="w-5 h-5 flex-shrink-0 text-indigo-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <span class="font-bold">Clasificación Automática Res. 0312 de 2019:</span>
              <div id="texto-clasificacion" class="mt-0.5 font-semibold text-indigo-700">Calculando estándares...</div>
            </div>
          </div>

          <!-- Ubicación y Responsable -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad / Municipio</label>
              <input type="text" id="emp-ciudad" placeholder="Ej. Bogotá D.C." class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Principal</label>
              <input type="text" id="emp-direccion" placeholder="Ej. Calle 100 # 15-20" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sector / Actividad Económica</label>
              <input type="text" id="emp-sector" placeholder="Ej. Consultoría en tecnologías de información" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Responsable del SG-SST (Nombre y Licencia)</label>
              <input type="text" id="emp-responsable" placeholder="Ej. Ing. Diana Vargas - Lic. SST 4512-2021" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono de Contacto</label>
              <input type="text" id="emp-telefono" placeholder="Ej. (601) 345 6789" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Correo Electrónico SST</label>
              <input type="email" id="emp-email" placeholder="Ej. sst@empresa.com" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
          </div>

          <!-- SECCIÓN: ADN DE LA EMPRESA & CONTEXTO IA (PROCESS-DRIVEN ARCHITECTURE) -->
          <div class="pt-5 border-t border-slate-200 space-y-4">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🧬</span> ADN Empresarial & Contexto Maestro IA
                </h4>
                <p class="text-xs text-slate-500">
                  Caracteriza la razón de ser, metodología operativa y antigüedad para alimentar el Mapa de Procesos y la Matriz GTC 45.
                </p>
              </div>
              <button type="button" onclick="window.abrirModalAsistenteADN()" class="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                <span>✨ Asistente IA (3 Preguntas)</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Antigüedad en Años *</label>
                <input type="number" id="emp-years-operating" min="1" max="150" value="5" placeholder="Ej. 10" class="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold">
              </div>
              <div class="md:col-span-2">
                <div id="badge-ai-summary-container" class="hidden p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900 mt-5">
                  <span class="flex items-center gap-1.5 font-bold">
                    <span>🤖 Perfil IA Generado:</span>
                    <span id="texto-ai-maturity" class="font-normal text-purple-800"></span>
                  </span>
                  <button type="button" onclick="window.verContextoIASummary()" class="text-[11px] underline font-bold text-purple-700 hover:text-purple-900 cursor-pointer">Ver JSON</button>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción y Presentación Corporativa (Qué hace, productos/servicios) *</label>
              <textarea id="emp-company-desc" rows="3" placeholder="Ej. Empresa líder en fabricación de productos cerámicos para la construcción..." class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Metodología y Flujo Operativo (Cómo lo hace, infraestructura, procesos) *</label>
              <textarea id="emp-operational-how" rows="3" placeholder="Ej. Opera bajo un flujo secuencial: extracción de arcilla, molienda, extrusión al vacío, secado artificial y cocción en horno túnel..." class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
            </div>
          </div>

          <!-- SECCIÓN: ENFOQUE POR PROCESOS Y ESTRUCTURA ORGANIZACIONAL (DIAGRAMAS) -->
          <div class="pt-5 border-t border-slate-200">
            <div class="flex items-center justify-between mb-1">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🗺️</span> Diagramas Estructurales del SG-SST
              </h4>
              <span class="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-200">Decreto 1072 & GTC 45</span>
            </div>
            <p class="text-xs text-slate-500 mb-3">
              Carga las imágenes del Mapa de Procesos y el Organigrama de la empresa para visualizar sus roles y estructurar la identificación de peligros.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <!-- Dropzone 1: Mapa de Procesos -->
              <div class="border border-slate-200 rounded-xl p-3.5 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>🗺️</span> Mapa de Procesos
                    </label>
                    <span id="badge-mapa-estado" class="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600">Opcional</span>
                  </div>
                  
                  <div id="preview-mapa-container" class="hidden mb-2 relative group rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <img id="preview-mapa-img" src="" alt="Mapa de Procesos" class="w-full h-28 object-contain bg-slate-100">
                    <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button type="button" id="btn-ampliar-mapa" class="px-2.5 py-1 bg-white text-slate-800 rounded text-xs font-bold shadow hover:bg-slate-100">Ampliar</button>
                      <button type="button" id="btn-quitar-mapa" class="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-bold shadow hover:bg-red-700">Quitar</button>
                    </div>
                  </div>

                  <label id="dropzone-mapa" class="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-lg cursor-pointer bg-white transition text-center">
                    <svg class="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span class="text-xs text-indigo-600 font-semibold" id="texto-dropzone-mapa">Cargar imagen del mapa</span>
                    <span class="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG o WebP</span>
                    <input type="file" id="file-mapa-procesos" accept="image/*,.svg" class="hidden">
                  </label>
                </div>
              </div>

              <!-- Dropzone 2: Organigrama -->
              <div class="border border-slate-200 rounded-xl p-3.5 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>👥</span> Organigrama Empresa
                    </label>
                    <span id="badge-organigrama-estado" class="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600">Opcional</span>
                  </div>

                  <div id="preview-organigrama-container" class="hidden mb-2 relative group rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <img id="preview-organigrama-img" src="" alt="Organigrama" class="w-full h-28 object-contain bg-slate-100">
                    <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button type="button" id="btn-ampliar-organigrama" class="px-2.5 py-1 bg-white text-slate-800 rounded text-xs font-bold shadow hover:bg-slate-100">Ampliar</button>
                      <button type="button" id="btn-quitar-organigrama" class="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-bold shadow hover:bg-red-700">Quitar</button>
                    </div>
                  </div>

                  <label id="dropzone-organigrama" class="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-lg cursor-pointer bg-white transition text-center">
                    <svg class="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    <span class="text-xs text-indigo-600 font-semibold" id="texto-dropzone-organigrama">Cargar organigrama</span>
                    <span class="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG o WebP</span>
                    <input type="file" id="file-organigrama" accept="image/*,.svg" class="hidden">
                  </label>
                </div>
              </div>

            </div>
          </div>

          <!-- SECCIÓN: DATOS DE INGRESO Y CREDENCIALES DE LA EMPRESA -->
          <div class="pt-5 border-t border-slate-200">
            <div class="flex items-center justify-between mb-1">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔐</span> Credenciales de Acceso a la Plataforma
              </h4>
              <span class="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold border border-teal-200">Portal Empresa</span>
            </div>
            <p class="text-xs text-slate-500 mb-3">
              Define los datos con los que el cliente o administrador de la empresa iniciará sesión en Doctor Pyme.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario / Correo de Ingreso *</label>
                <input 
                  type="text" 
                  id="emp-acceso-usuario" 
                  placeholder="ej: sst@empresa.com" 
                  class="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700 uppercase">Contraseña *</label>
                  <button type="button" onclick="window.generarClaveModalEmpresa()" class="text-[10px] text-teal-700 hover:text-teal-900 font-bold cursor-pointer">🎲 Generar</button>
                </div>
                <input 
                  type="text" 
                  id="emp-acceso-password" 
                  placeholder="Clave segura" 
                  class="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado de Acceso *</label>
                <select 
                  id="emp-acceso-estado" 
                  class="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="ACTIVO">🟢 ACTIVO (Permitido)</option>
                  <option value="INACTIVO">🔴 INACTIVO (Suspendido)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- SECCIÓN: POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES (SOLICITADA Y FIRMADA 1 ÚNICA VEZ EN EL REGISTRO DE EMPRESA) -->
          <div class="pt-5 border-t border-slate-200">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡️</span> Política de Tratamiento de Datos Personales (Autorización y Firma Única)
              </h4>
              <span class="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                Ley 1581 de 2012 • Ley 527 de 1999 (1 Única Vez)
              </span>
            </div>

            <!-- Estado cuando la empresa YA fue creada y YA firmó por única vez -->
            <div id="emp-policy-signed-banner" class="hidden p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <span class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-black">✓</span>
                  <div>
                    <div class="text-xs font-black text-emerald-900">Política de Tratamiento de Datos Autorizada y Firmada (Registro Único)</div>
                    <div class="text-[11px] text-emerald-700">Esta autorización se solicitó y firmó por única vez al registrar la empresa. No vuelve a solicitarse en otros módulos.</div>
                  </div>
                </div>
                <span id="emp-policy-cert-badge" class="font-mono text-xs font-black px-2.5 py-1 bg-white text-emerald-800 rounded-lg border border-emerald-300 shadow-2xs">DP-LEGAL</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/70 text-[11px] text-emerald-900">
                <div><span class="text-emerald-600 font-semibold">Firmante:</span> <strong id="emp-policy-signer">-</strong></div>
                <div><span class="text-emerald-600 font-semibold">Fecha Oficial:</span> <strong id="emp-policy-date">-</strong></div>
                <div class="text-right"><a href="#repositorio-legal" onclick="window.cerrarModalEmpresa()" class="underline font-bold text-emerald-800 hover:text-emerald-950">Ver Sábana Forense →</a></div>
              </div>
            </div>

            <!-- Bloque de Aceptación y Firma Única al crear la empresa -->
            <div id="emp-policy-create-box" class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p class="text-xs text-slate-600 leading-relaxed">
                De conformidad con la <strong>Ley Estatutaria 1581 de 2012</strong>, el <strong>Decreto 1377 de 2013</strong> y la <strong>Ley 527 de 1999</strong>, la autorización de tratamiento de datos personales, mandato SST y confidencialidad se suscribe <strong>una (1) única vez</strong> en este acto de creación y registro de la empresa cliente.
              </p>

              <details class="bg-white border border-slate-200 rounded-lg p-3 text-xs">
                <summary class="font-bold text-indigo-700 cursor-pointer select-none flex items-center justify-between">
                  <span>📜 Leer Texto Oficial de la Política de Tratamiento de Datos y Mandato SG-SST (v1.0)</span>
                  <span class="text-[10px] text-slate-400 font-normal">Clic para desplegar</span>
                </summary>
                <div class="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 max-h-40 overflow-y-auto leading-relaxed">
                  <p><strong>1. Tratamiento de Datos (Ley 1581 de 2012):</strong> La Empresa Cliente autoriza de manera previa, expresa e informada a DOCTOR PYME para recolectar, almacenar y procesar los datos corporativos, laborales y de seguridad y salud en el trabajo (SG-SST) con fines de cumplimiento del Decreto 1072 de 2015 y la Resolución 0312 de 2019.</p>
                  <p><strong>2. Mandato para Gestión de Trabajadores y Activos:</strong> La Empresa Cliente declara contar con la autorización legal de sus trabajadores para el registro de nómina, perfiles de cargo, capacitaciones E-Learning, firmas electrónicas y custodia de herramientas y equipos.</p>
                  <p><strong>3. Validez Probatoria (Ley 527 de 1999 y Decreto 2364 de 2012):</strong> Esta aceptación única genera un certificado criptográfico SHA-256 inmutable con estampa cronológica oficial de Colombia (UTC-5).</p>
                </div>
              </details>

              <label class="flex items-start gap-2.5 p-3 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-50/40 transition">
                <input type="checkbox" id="chk-empresa-habeas-unico" checked class="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                <span class="text-xs text-slate-700 leading-snug">
                  <strong class="text-slate-900 block">Autorizo y firmo electrónicamente por única vez la Política de Tratamiento de Datos Personales (Habeas Data), el Mandato SG-SST y el Acuerdo de Confidencialidad.</strong>
                  <span class="text-[11px] text-slate-500">Se emitirá automáticamente el Certificado Forense SHA-256 a nombre de la empresa y su Representante Legal al guardar este registro.</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white py-3">
            <button type="button" onclick="window.cerrarModalEmpresa()" class="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" id="btn-submit-empresa" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer">
              Guardar Empresa y Firmar Política
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Listeners de búsqueda y apertura con debounce para rendimiento óptimo
  let timerBusquedaEmpresas = null;
  const inputBuscarEmpresa = document.getElementById('input-buscar-empresa');
  if (inputBuscarEmpresa) {
    inputBuscarEmpresa.addEventListener('input', (e) => {
      filtroBusqueda = e.target.value;
      if (timerBusquedaEmpresas) clearTimeout(timerBusquedaEmpresas);
      timerBusquedaEmpresas = setTimeout(() => {
        renderCompanies();
      }, 200);
    });
  }

  const inputBuscarAccesos = document.getElementById('input-buscar-accesos');
  if (inputBuscarAccesos) {
    inputBuscarAccesos.addEventListener('input', (e) => {
      filtroBusquedaAccesos = e.target.value;
      if (timerBusquedaEmpresas) clearTimeout(timerBusquedaEmpresas);
      timerBusquedaEmpresas = setTimeout(() => {
        renderCompanies();
      }, 200);
    });
  }

  document.getElementById('btn-nueva-empresa')?.addEventListener('click', () => {
    abrirModalEmpresa();
  });

  const empRiesgo = document.getElementById('emp-riesgo');
  const empTrabajadores = document.getElementById('emp-trabajadores');

  const actualizarTextoClasificacion = () => {
    const r = empRiesgo.value;
    const t = parseInt(empTrabajadores.value, 10) || 0;
    const est = determinarGrupoEstandares(t, r);
    const texto = document.getElementById('texto-clasificacion');

    if (est === 7) {
      texto.innerText = `Aplica a los 7 ESTÁNDARES MÍNIMOS (Empresa de 1 a 10 trabajadores clasificada en Riesgo I, II o III - Art. 3 Res. 0312).`;
    } else if (est === 21) {
      texto.innerText = `Aplica a los 21 ESTÁNDARES MÍNIMOS (Empresa de 11 a 50 trabajadores clasificada en Riesgo I, II o III - Art. 9 Res. 0312).`;
    } else {
      texto.innerText = `Aplica a los 60 ESTÁNDARES MÍNIMOS COMPLETOS (Más de 50 trabajadores o clasificada en Riesgo IV / V - Art. 16 Res. 0312).`;
    }
  };

  empRiesgo.addEventListener('change', actualizarTextoClasificacion);
  empTrabajadores.addEventListener('input', actualizarTextoClasificacion);

  // Manejo de archivos en formulario: Logotipo Oficial
  const fileInputLogo = document.getElementById('file-empresa-logo');
  const previewLogoContainer = document.getElementById('preview-logo-container');
  const previewLogoImg = document.getElementById('preview-logo-img');
  const badgeLogo = document.getElementById('badge-logo-estado');
  const textoDropLogo = document.getElementById('texto-dropzone-logo');

  fileInputLogo.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      fileLogoSeleccionado = file;
      quitarLogoFlag = false;
      try {
        let dataUrl = '';
        if (file.type === 'image/svg+xml') {
          dataUrl = await leerArchivoDataUrl(file);
        } else {
          const comp = await comprimirImagen(file, { maxWidth: 600, maxHeight: 600, calidad: 0.85 });
          dataUrl = comp.dataUrl;
        }
        dataUrlLogo = dataUrl;
        previewLogoImg.src = dataUrl;
        previewLogoContainer.classList.remove('hidden');
        badgeLogo.innerText = 'Nuevo logo';
        badgeLogo.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800';
        textoDropLogo.innerText = 'Cambiar logotipo seleccionado';
      } catch (err) {
        console.error("Error al procesar logotipo con compresión:", err);
        const reader = new FileReader();
        reader.onload = (ev) => {
          dataUrlLogo = ev.target.result;
          previewLogoImg.src = ev.target.result;
          previewLogoContainer.classList.remove('hidden');
          badgeLogo.innerText = 'Nuevo logo';
          badgeLogo.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800';
          textoDropLogo.innerText = 'Cambiar logotipo seleccionado';
        };
        reader.readAsDataURL(file);
      }
    }
  });

  document.getElementById('btn-quitar-logo').addEventListener('click', () => {
    fileLogoSeleccionado = null;
    dataUrlLogo = null;
    quitarLogoFlag = true;
    fileInputLogo.value = '';
    previewLogoContainer.classList.add('hidden');
    previewLogoImg.src = '';
    badgeLogo.innerText = 'Sin logotipo';
    badgeLogo.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
    textoDropLogo.innerText = 'Cargar logotipo de la empresa';
  });

  // Manejo de archivos en formulario: Diagramas
  const fileInputMapa = document.getElementById('file-mapa-procesos');
  const fileInputOrg = document.getElementById('file-organigrama');
  const previewMapaContainer = document.getElementById('preview-mapa-container');
  const previewOrgContainer = document.getElementById('preview-organigrama-container');
  const previewMapaImg = document.getElementById('preview-mapa-img');
  const previewOrgImg = document.getElementById('preview-organigrama-img');
  const badgeMapa = document.getElementById('badge-mapa-estado');
  const badgeOrg = document.getElementById('badge-organigrama-estado');
  const textoDropMapa = document.getElementById('texto-dropzone-mapa');
  const textoDropOrg = document.getElementById('texto-dropzone-organigrama');

  fileInputMapa.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      fileMapaProcesosSeleccionado = file;
      quitarMapaProcesosFlag = false;
      const reader = new FileReader();
      reader.onload = (ev) => {
        dataUrlMapaProcesos = ev.target.result;
        metaMapaProcesos = { nombre: file.name, tamanio: file.size, tipo: file.type };
        previewMapaImg.src = ev.target.result;
        previewMapaContainer.classList.remove('hidden');
        badgeMapa.innerText = 'Nuevo archivo';
        badgeMapa.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800';
        textoDropMapa.innerText = 'Cambiar archivo seleccionado';
      };
      reader.readAsDataURL(file);
    }
  });

  fileInputOrg.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      fileOrganigramaSeleccionado = file;
      quitarOrganigramaFlag = false;
      const reader = new FileReader();
      reader.onload = (ev) => {
        dataUrlOrganigrama = ev.target.result;
        metaOrganigrama = { nombre: file.name, tamanio: file.size, tipo: file.type };
        previewOrgImg.src = ev.target.result;
        previewOrgContainer.classList.remove('hidden');
        badgeOrg.innerText = 'Nuevo archivo';
        badgeOrg.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800';
        textoDropOrg.innerText = 'Cambiar archivo seleccionado';
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('btn-quitar-mapa').addEventListener('click', () => {
    fileMapaProcesosSeleccionado = null;
    dataUrlMapaProcesos = null;
    metaMapaProcesos = null;
    quitarMapaProcesosFlag = true;
    fileInputMapa.value = '';
    previewMapaContainer.classList.add('hidden');
    previewMapaImg.src = '';
    badgeMapa.innerText = 'Sin imagen';
    badgeMapa.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
    textoDropMapa.innerText = 'Cargar imagen del mapa';
  });

  document.getElementById('btn-quitar-organigrama').addEventListener('click', () => {
    fileOrganigramaSeleccionado = null;
    dataUrlOrganigrama = null;
    metaOrganigrama = null;
    quitarOrganigramaFlag = true;
    fileInputOrg.value = '';
    previewOrgContainer.classList.add('hidden');
    previewOrgImg.src = '';
    badgeOrg.innerText = 'Sin imagen';
    badgeOrg.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
    textoDropOrg.innerText = 'Cargar organigrama';
  });

  document.getElementById('btn-ampliar-mapa').addEventListener('click', () => {
    const id = document.getElementById('emp-id').value;
    window.abrirVisorDiagrama(id || null, 'mapa_procesos');
  });

  document.getElementById('btn-ampliar-organigrama').addEventListener('click', () => {
    const id = document.getElementById('emp-id').value;
    window.abrirVisorDiagrama(id || null, 'organigrama');
  });

  // Guardar formulario de empresa y diagramas
  document.getElementById('form-empresa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-empresa');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      Guardando...
    `;

    try {
      const id = document.getElementById('emp-id').value;
      const accesoUsuario = document.getElementById('emp-acceso-usuario')?.value.trim();
      const accesoPassword = document.getElementById('emp-acceso-password')?.value.trim();
      const accesoEstado = document.getElementById('emp-acceso-estado')?.value || 'ACTIVO';

      const empresaData = {
        id: id || undefined,
        razonSocial: document.getElementById('emp-razon').value.trim(),
        nit: document.getElementById('emp-nit').value.trim(),
        representanteLegal: document.getElementById('emp-representante').value.trim(),
        arl: document.getElementById('emp-arl').value,
        claseRiesgo: document.getElementById('emp-riesgo').value,
        trabajadores: parseInt(document.getElementById('emp-trabajadores').value, 10) || 1,
        ciudad: document.getElementById('emp-ciudad').value.trim(),
        direccion: document.getElementById('emp-direccion').value.trim(),
        sector: document.getElementById('emp-sector').value.trim(),
        responsableSST: document.getElementById('emp-responsable').value.trim(),
        telefono: document.getElementById('emp-telefono').value.trim(),
        email: document.getElementById('emp-email').value.trim(),
        years_operating: parseInt(document.getElementById('emp-years-operating')?.value, 10) || 1,
        company_description: document.getElementById('emp-company-desc')?.value.trim() || '',
        operational_how_it_works: document.getElementById('emp-operational-how')?.value.trim() || '',
        acceso: {
          usuario: accesoUsuario || document.getElementById('emp-email').value.trim() || `${document.getElementById('emp-nit').value.trim()}@doctorpyme.co`,
          password: accesoPassword || 'pyme2026*',
          estado: accesoEstado,
          rol: 'Administrador Empresa'
        }
      };

      const empExistente = id ? store.getEmpresa(id) : null;
      if (window._tempAiContextSummary) {
        empresaData.ai_context_summary = window._tempAiContextSummary;
      } else if (empExistente && empExistente.ai_context_summary) {
        empresaData.ai_context_summary = empExistente.ai_context_summary;
      }
      window._tempAiContextSummary = null;

      if (dataUrlLogo) {
        empresaData.logoUrl = dataUrlLogo;
        empresaData.tieneLogo = true;
      } else if (quitarLogoFlag) {
        empresaData.logoUrl = '';
        empresaData.tieneLogo = false;
      } else if (id) {
        const empExistente = store.getEmpresa(id);
        if (empExistente && empExistente.logoUrl) {
          empresaData.logoUrl = empExistente.logoUrl;
          empresaData.tieneLogo = true;
        }
      }

      // Validar aceptación única de Política de Tratamiento de Datos si es creación de empresa nueva
      const yaTienePolitica = id ? store.hasCompanyAcceptedDataPolicy(id) : false;
      if (!yaTienePolitica) {
        const chkHabeas = document.getElementById('chk-empresa-habeas-unico');
        if (chkHabeas && !chkHabeas.checked) {
          alert('Para registrar la empresa por primera vez, debes marcar la casilla de autorización y firma única de la Política de Tratamiento de Datos Personales (Ley 1581 de 2012).');
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = originalText;
          return;
        }
      }

      const finalId = store.saveEmpresa(empresaData);
      const empresaGuardada = store.getEmpresa(finalId);

      // Si es creación inicial (o aún no tenía registro de firma de Política de Datos), emitir el Certificado Forense Único (1 sola vez)
      if (!store.hasCompanyAcceptedDataPolicy(finalId)) {
        const repRaw = empresaData.representanteLegal || 'Representante Legal';
        const parts = repRaw.split(/[-–]|C\.?C\.?:?/i);
        const signerName = (parts[0] || repRaw).trim();
        const signerId = (parts[1] || empresaData.nit || '830124631').trim();
        const activePolicy = store.getActiveLegalPolicy();

        await store.submitLegalAcceptance({
          tenant_id: finalId,
          company_name: empresaData.razonSocial,
          company_tax_id: empresaData.nit,
          user_id: empresaData.acceso?.usuario || empresaData.email || `${empresaData.nit}@doctorpyme.co`,
          user_email: empresaData.email || empresaData.acceso?.usuario || `${empresaData.nit}@doctorpyme.co`,
          user_role: 'Representante Legal / Administrador Empresa',
          signer_typed_name: signerName,
          signer_typed_id: signerId,
          accepted_habeas_data: true,
          accepted_sst_third_party_mandate: true,
          accepted_nda_confidentiality: true,
          policy_version_id: activePolicy.id
        });
      }

      // Guardar / Quitar diagrama Mapa de Procesos
      if (dataUrlMapaProcesos || fileMapaProcesosSeleccionado) {
        const dataUrl = dataUrlMapaProcesos || (await leerArchivoDataUrl(fileMapaProcesosSeleccionado));
        const meta = metaMapaProcesos || {
          nombre: fileMapaProcesosSeleccionado?.name || 'mapa_procesos.png',
          tamanio: fileMapaProcesosSeleccionado?.size || 0,
          tipo: fileMapaProcesosSeleccionado?.type || 'image/png'
        };
        await evidenceDB.guardarDiagramaEmpresa(finalId, 'mapa_procesos', dataUrl, meta);
        if (empresaGuardada) empresaGuardada.tieneMapaProcesos = true;
      } else if (quitarMapaProcesosFlag) {
        await evidenceDB.eliminarDiagramaEmpresa(finalId, 'mapa_procesos');
        if (empresaGuardada) empresaGuardada.tieneMapaProcesos = false;
      }

      // Guardar / Quitar diagrama Organigrama
      if (dataUrlOrganigrama || fileOrganigramaSeleccionado) {
        const dataUrl = dataUrlOrganigrama || (await leerArchivoDataUrl(fileOrganigramaSeleccionado));
        const meta = metaOrganigrama || {
          nombre: fileOrganigramaSeleccionado?.name || 'organigrama.png',
          tamanio: fileOrganigramaSeleccionado?.size || 0,
          tipo: fileOrganigramaSeleccionado?.type || 'image/png'
        };
        await evidenceDB.guardarDiagramaEmpresa(finalId, 'organigrama', dataUrl, meta);
        if (empresaGuardada) empresaGuardada.tieneOrganigrama = true;
      } else if (quitarOrganigramaFlag) {
        await evidenceDB.eliminarDiagramaEmpresa(finalId, 'organigrama');
        if (empresaGuardada) empresaGuardada.tieneOrganigrama = false;
      }

      store.saveToStorage();

      window.cerrarModalEmpresa();
      renderCompanies();
      window.actualizarSelectorCabecera();

      if (window.mostrarNotificacion) {
        window.mostrarNotificacion(`Empresa ${empresaGuardada ? empresaGuardada.razonSocial : ''} guardada y Política de Datos registrada exitosamente.`, 'success');
      }
    } catch (err) {
      console.error("Error al guardar empresa y diagramas:", err);
      alert("Hubo un error al guardar la empresa o almacenar los diagramas: " + (err?.message || err));
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalText;
    }
  });
}

async function abrirModalEmpresa(empresa = null) {
  const modal = document.getElementById('modal-empresa');
  const titulo = document.getElementById('modal-empresa-titulo');
  const form = document.getElementById('form-empresa');

  form.reset();

  fileLogoSeleccionado = null;
  dataUrlLogo = null;
  quitarLogoFlag = false;
  fileMapaProcesosSeleccionado = null;
  fileOrganigramaSeleccionado = null;
  dataUrlMapaProcesos = null;
  metaMapaProcesos = null;
  dataUrlOrganigrama = null;
  metaOrganigrama = null;
  quitarMapaProcesosFlag = false;
  quitarOrganigramaFlag = false;

  const previewLogoContainer = document.getElementById('preview-logo-container');
  const previewLogoImg = document.getElementById('preview-logo-img');
  const badgeLogo = document.getElementById('badge-logo-estado');
  const textoDropLogo = document.getElementById('texto-dropzone-logo');

  const previewMapaContainer = document.getElementById('preview-mapa-container');
  const previewOrgContainer = document.getElementById('preview-organigrama-container');
  const previewMapaImg = document.getElementById('preview-mapa-img');
  const previewOrgImg = document.getElementById('preview-organigrama-img');
  const badgeMapa = document.getElementById('badge-mapa-estado');
  const badgeOrg = document.getElementById('badge-organigrama-estado');
  const textoDropMapa = document.getElementById('texto-dropzone-mapa');
  const textoDropOrg = document.getElementById('texto-dropzone-organigrama');

  const signedBanner = document.getElementById('emp-policy-signed-banner');
  const createBox = document.getElementById('emp-policy-create-box');
  const btnSubmitEmpresa = document.getElementById('btn-submit-empresa');

  if (empresa) {
    titulo.innerText = "Editar Empresa Cliente";
    document.getElementById('emp-id').value = empresa.id;
    document.getElementById('emp-razon').value = empresa.razonSocial;
    document.getElementById('emp-nit').value = empresa.nit;
    document.getElementById('emp-representante').value = empresa.representanteLegal || '';
    document.getElementById('emp-arl').value = empresa.arl;
    document.getElementById('emp-riesgo').value = empresa.claseRiesgo;
    document.getElementById('emp-trabajadores').value = empresa.trabajadores;
    document.getElementById('emp-ciudad').value = empresa.ciudad || '';
    document.getElementById('emp-direccion').value = empresa.direccion || '';
    document.getElementById('emp-sector').value = empresa.sector || '';
    document.getElementById('emp-responsable').value = empresa.responsableSST || '';
    document.getElementById('emp-telefono').value = empresa.telefono || '';
    document.getElementById('emp-email').value = empresa.email || '';

    // Mostrar estado de Política de Datos firmada por única vez
    const policyRecord = store.getCompanyDataPolicyRecord(empresa.id);
    if (policyRecord || empresa.politicaDatosAceptada) {
      signedBanner?.classList.remove('hidden');
      createBox?.classList.add('hidden');
      const certBadge = document.getElementById('emp-policy-cert-badge');
      const signerEl = document.getElementById('emp-policy-signer');
      const dateEl = document.getElementById('emp-policy-date');
      if (certBadge) certBadge.innerText = policyRecord?.certificate_code || empresa.politicaDatosCertificado || 'DP-LEGAL-ACTIVO';
      if (signerEl) signerEl.innerText = policyRecord?.signer_typed_name || empresa.representanteLegal || 'Representante Legal';
      if (dateEl) dateEl.innerText = policyRecord?.accepted_at_bogota || empresa.politicaDatosFecha || 'Firmado en creación';
      if (btnSubmitEmpresa) btnSubmitEmpresa.innerText = 'Guardar Cambios';
    } else {
      signedBanner?.classList.add('hidden');
      createBox?.classList.remove('hidden');
      if (btnSubmitEmpresa) btnSubmitEmpresa.innerText = 'Guardar Empresa y Firmar Política';
    }

    // Cargar ADN y Contexto IA
    document.getElementById('emp-years-operating').value = empresa.years_operating || 5;
    document.getElementById('emp-company-desc').value = empresa.company_description || '';
    document.getElementById('emp-operational-how').value = empresa.operational_how_it_works || '';

    const aiBadgeContainer = document.getElementById('badge-ai-summary-container');
    const aiMaturityText = document.getElementById('texto-ai-maturity');
    if (empresa.ai_context_summary) {
      aiBadgeContainer?.classList.remove('hidden');
      if (aiMaturityText) {
        aiMaturityText.innerText = `${empresa.ai_context_summary.operational_maturity || 'Activo'} • ${empresa.ai_context_summary.inherent_risk_profile?.peligros_prioritarios?.length || 5} peligros prioritarios`;
      }
    } else {
      aiBadgeContainer?.classList.add('hidden');
    }

    // Cargar Credenciales de Acceso
    const inputAccesoUser = document.getElementById('emp-acceso-usuario');
    const inputAccesoPass = document.getElementById('emp-acceso-password');
    const selectAccesoEstado = document.getElementById('emp-acceso-estado');
    if (inputAccesoUser) inputAccesoUser.value = empresa.acceso?.usuario || empresa.email || '';
    if (inputAccesoPass) inputAccesoPass.value = empresa.acceso?.password || 'pyme2026*';
    if (selectAccesoEstado) selectAccesoEstado.value = empresa.acceso?.estado || 'ACTIVO';

    // Cargar Logotipo Oficial si existe
    if (empresa.logoUrl) {
      dataUrlLogo = empresa.logoUrl;
      previewLogoImg.src = empresa.logoUrl;
      previewLogoContainer.classList.remove('hidden');
      badgeLogo.innerText = 'Logo Guardado';
      badgeLogo.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-700';
      textoDropLogo.innerText = 'Cambiar logotipo oficial';
    } else {
      previewLogoContainer.classList.add('hidden');
      previewLogoImg.src = '';
      badgeLogo.innerText = 'Recomendado';
      badgeLogo.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
      textoDropLogo.innerText = 'Cargar logotipo de la empresa';
    }

    // Cargar diagrama Mapa de Procesos
    try {
      const diagMapa = await evidenceDB.obtenerDiagramaEmpresa(empresa.id, 'mapa_procesos');
      if (diagMapa && diagMapa.dataUrl) {
        previewMapaImg.src = diagMapa.dataUrl;
        previewMapaContainer.classList.remove('hidden');
        badgeMapa.innerText = 'Cargado';
        badgeMapa.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-700';
        textoDropMapa.innerText = 'Reemplazar imagen';
      } else if (['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-1790438946268'].includes(empresa.id)) {
        previewMapaImg.src = './assets/sample-mapa-procesos.svg';
        previewMapaContainer.classList.remove('hidden');
        badgeMapa.innerText = 'Plantilla Demo';
        badgeMapa.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800';
        textoDropMapa.innerText = 'Personalizar mapa';
      } else {
        previewMapaContainer.classList.add('hidden');
        badgeMapa.innerText = 'Opcional';
        badgeMapa.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
        textoDropMapa.innerText = 'Cargar imagen del mapa';
      }
    } catch {
      previewMapaContainer.classList.add('hidden');
    }

    // Cargar diagrama Organigrama
    try {
      const diagOrg = await evidenceDB.obtenerDiagramaEmpresa(empresa.id, 'organigrama');
      if (diagOrg && diagOrg.dataUrl) {
        previewOrgImg.src = diagOrg.dataUrl;
        previewOrgContainer.classList.remove('hidden');
        badgeOrg.innerText = 'Cargado';
        badgeOrg.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-700';
        textoDropOrg.innerText = 'Reemplazar imagen';
      } else if (['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-1790438946268'].includes(empresa.id)) {
        previewOrgImg.src = './assets/sample-organigrama.svg';
        previewOrgContainer.classList.remove('hidden');
        badgeOrg.innerText = 'Plantilla Demo';
        badgeOrg.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800';
        textoDropOrg.innerText = 'Personalizar organigrama';
      } else {
        previewOrgContainer.classList.add('hidden');
        badgeOrg.innerText = 'Opcional';
        badgeOrg.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
        textoDropOrg.innerText = 'Cargar organigrama';
      }
    } catch {
      previewOrgContainer.classList.add('hidden');
    }

  } else {
    titulo.innerText = "Nueva Empresa Cliente";
    document.getElementById('emp-id').value = '';
    document.getElementById('emp-representante').value = '';
    document.getElementById('emp-trabajadores').value = '10';
    document.getElementById('emp-years-operating').value = '3';
    document.getElementById('emp-company-desc').value = '';
    document.getElementById('emp-operational-how').value = '';
    document.getElementById('badge-ai-summary-container')?.classList.add('hidden');

    signedBanner?.classList.add('hidden');
    createBox?.classList.remove('hidden');
    const chkHabeas = document.getElementById('chk-empresa-habeas-unico');
    if (chkHabeas) chkHabeas.checked = true;
    if (btnSubmitEmpresa) btnSubmitEmpresa.innerText = 'Guardar Empresa y Firmar Política';

    const inputAccesoUser = document.getElementById('emp-acceso-usuario');
    const inputAccesoPass = document.getElementById('emp-acceso-password');
    const selectAccesoEstado = document.getElementById('emp-acceso-estado');
    if (inputAccesoUser) inputAccesoUser.value = '';
    if (inputAccesoPass) inputAccesoPass.value = 'Pyme2026*';
    if (selectAccesoEstado) selectAccesoEstado.value = 'ACTIVO';

    previewLogoContainer.classList.add('hidden');
    previewLogoImg.src = '';
    badgeLogo.innerText = 'Recomendado';
    badgeLogo.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
    textoDropLogo.innerText = 'Cargar logotipo de la empresa';

    previewMapaContainer.classList.add('hidden');
    previewOrgContainer.classList.add('hidden');
    badgeMapa.innerText = 'Opcional';
    badgeMapa.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
    badgeOrg.innerText = 'Opcional';
    badgeOrg.className = 'text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-600';
    textoDropMapa.innerText = 'Cargar imagen del mapa';
    textoDropOrg.innerText = 'Cargar organigrama';
  }

  // Disparar evento para actualizar texto de clasificación
  const event = new Event('change');
  document.getElementById('emp-riesgo').dispatchEvent(event);

  const selectEstadoModal = document.getElementById('emp-acceso-estado');
  if (selectEstadoModal) {
    selectEstadoModal.disabled = !auth.isSuperAdmin();
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

if (typeof window !== 'undefined') {
  window.editarEmpresa = function(id) {
    if (!auth.isSuperAdmin()) {
      const activeId = store.getEmpresaActivaId();
      if (id !== activeId) return;
    }
    const empresa = store.getEmpresa(id);
    if (empresa) {
      abrirModalEmpresa(empresa);
    }
  };

  window.eliminarEmpresa = function(id) {
    if (!auth.isSuperAdmin()) {
      alert('Solo el Super Administrador SST puede eliminar empresas clientes.');
      return;
    }
    store.deleteEmpresa(id);
    renderCompanies();
    if (window.actualizarSelectorCabecera) window.actualizarSelectorCabecera();
  };

  window.cerrarModalEmpresa = function() {
    const modal = document.getElementById('modal-empresa');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  window.generarClaveModalEmpresa = function() {
    const razon = document.getElementById('emp-razon')?.value || 'Pyme';
    const prefijo = razon.split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'Pyme';
    const cap = prefijo.charAt(0).toUpperCase() + prefijo.slice(1, 6).toLowerCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const simbolos = ['*', '#', '!', '$'];
    const sim = simbolos[Math.floor(Math.random() * simbolos.length)];
    const pass = `${cap}${sim}${rand}`;
    const input = document.getElementById('emp-acceso-password');
    if (input) input.value = pass;
  };

  window.cambiarPestanaEmpresas = function(pestana) {
    if (!auth.isSuperAdmin() && pestana === 'accesos') return;
    pestanaEmpresas = pestana;
    renderCompanies();
  };

  window.cambiarFiltroEstadoAcceso = function(estado) {
    filtroEstadoAcceso = estado;
    renderCompanies();
  };

  window.toggleAccesoEmpresa = function(id) {
    if (!auth.isSuperAdmin()) {
      alert('Solo el Super Administrador SST puede activar o suspender accesos de empresas.');
      return;
    }
    const nuevoEstado = store.toggleEstadoEmpresa(id);
    const emp = store.getEmpresa(id);
    const nombre = emp ? emp.razonSocial : 'la empresa';
    const msg = nuevoEstado === 'ACTIVO' 
      ? `🟢 Acceso HABILITADO para "${nombre}". La empresa y sus trabajadores ya pueden iniciar sesión.` 
      : `🔴 Acceso SUSPENDIDO para "${nombre}". El ingreso a la plataforma ha quedado bloqueado.`;

    if (window.mostrarNotificacion) {
      window.mostrarNotificacion(msg, nuevoEstado === 'ACTIVO' ? 'success' : 'warning');
    } else {
      alert(msg);
    }
    renderCompanies();
  };

  window.actualizarUsuarioEmpresa = function(id) {
    const input = document.getElementById(`emp-user-${id}`);
    if (!input) return;
    const nuevoUsuario = input.value.trim();
    if (!nuevoUsuario) {
      alert("Por favor ingresa un usuario o correo válido.");
      return;
    }
    store.actualizarAccesoEmpresa(id, { usuario: nuevoUsuario });
    const emp = store.getEmpresa(id);
    alert(`¡Usuario de acceso para "${emp ? emp.razonSocial : id}" actualizado a: ${nuevoUsuario}!`);
    renderCompanies();
  };

  window.actualizarPasswordEmpresa = function(id) {
    const input = document.getElementById(`emp-pass-${id}`);
    if (!input) return;
    const nuevoPassword = input.value.trim();
    if (!nuevoPassword) {
      alert("Por favor ingresa una contraseña válida.");
      return;
    }
    store.actualizarAccesoEmpresa(id, { password: nuevoPassword });
    const emp = store.getEmpresa(id);
    alert(`¡Contraseña de acceso para "${emp ? emp.razonSocial : id}" guardada exitosamente!`);
    renderCompanies();
  };

  window.toggleVerPasswordEmpresa = function(id) {
    const input = document.getElementById(`emp-pass-${id}`);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  };

  window.generarPasswordEmpresa = function(id) {
    const nuevaClave = store.generarPasswordAleatoria(id);
    const emp = store.getEmpresa(id);
    alert(`¡Nueva contraseña segura generada para "${emp ? emp.razonSocial : id}":\n\n🔑 ${nuevaClave}\n\nHa sido guardada automáticamente en la base de datos.`);
    renderCompanies();
  };

  window.copiarFichaAcceso = function(id) {
    const emp = store.getEmpresa(id);
    if (!emp) return;
    const usuario = emp.acceso?.usuario || emp.email || `${emp.nit}@doctorpyme.co`;
    const password = emp.acceso?.password || 'pyme2026*';
    const estado = emp.acceso?.estado || 'ACTIVO';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const basePath = typeof window !== 'undefined' ? window.location.pathname.replace('index.html', '') : '/';

    const textoFicha = 
`🏥 *DOCTOR PYME SG-SST - CREDENCIALES DE ACCESO*
--------------------------------------------------
Estimado(a) *${emp.razonSocial}*,
Compartimos los datos para ingresar a tu plataforma de Seguridad y Salud en el Trabajo:

🌐 *Portal Web:* ${origin}${basePath}landing.html
👤 *Usuario / Correo:* ${usuario}
🔑 *Contraseña:* ${password}
🏢 *NIT Registrado:* ${emp.nit}
🛡️ *Estado de Cuenta:* ${estado === 'ACTIVO' ? '🟢 ACTIVA (Habilitada)' : '🔴 SUSPENDIDA (Inactiva)'}

👉 *Enlace de Inicio de Sesión Directo:*
${origin}${basePath}index.html?login=true#login

Por confidencialidad y cumplimiento del Decreto 1072, te sugerimos no compartir estas credenciales con personal no autorizado.
--------------------------------------------------
DOCTOR PYME SAS • El Médico de tu Negocio
Salud, Seguridad y Ambiente • Colombia`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textoFicha).then(() => {
        alert(`¡Ficha de acceso para "${emp.razonSocial}" copiada al portapapeles!\n\nLista para enviar por WhatsApp o Correo.`);
      }).catch(() => {
        prompt("Copia los datos de acceso:", textoFicha);
      });
    } else {
      prompt("Copia los datos de acceso:", textoFicha);
    }
  };

  window.probarIngresoEmpresa = function(id) {
    const emp = store.getEmpresa(id);
    if (!emp) return;
    const usuario = emp.acceso?.usuario || emp.email || `${emp.nit}@doctorpyme.co`;
    const password = emp.acceso?.password || 'pyme2026*';

    const res = auth.login(usuario, password);
    if (res.ok) {
      alert(`¡Sesión iniciada como "${emp.razonSocial}"!\nRedirigiendo a su dashboard...`);
      window.location.hash = '#dashboard';
      window.location.reload();
    } else {
      alert(`No se pudo iniciar sesión: ${res.error}`);
    }
  };

  window.abrirModalAsistenteADN = function() {
    let modal = document.getElementById('modal-asistente-adn');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-asistente-adn';
      modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-purple-200 animate-fade-in max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                ✨
              </div>
              <div>
                <h3 class="text-base font-black text-slate-800">Asistente IA: Generador de ADN Empresarial</h3>
                <p class="text-xs text-purple-600 font-semibold">Responde 3 preguntas breves y la IA estructurará el perfil corporativo y de riesgos</p>
              </div>
            </div>
            <button type="button" onclick="window.cerrarModalAsistenteADN()" class="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer">&times;</button>
          </div>

          <div class="mt-4 space-y-4">
            <div class="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/80 text-xs text-purple-900 leading-relaxed">
              💡 <strong>Base para el Mapa de Procesos y Matriz GTC 45:</strong> La IA redactará una presentación ejecutiva formal, mapeará el flujo productivo y creará el <code>ai_context_summary</code> que servirá de System Prompt para auto-diseñar las actividades PHVA y peligros inherentes.
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                1. ¿Qué hace la empresa? (Productos, servicios principales, clientes o soluciones) *
              </label>
              <textarea id="ai-q-what" rows="2" placeholder="Ej. Fabricamos ladrillos, bloques y tejas de arcilla cocida para constructoras y ferreterías a nivel nacional..." class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                2. ¿Cómo opera la empresa? (Metodología, infraestructura, maquinaria, flujo de trabajo) *
              </label>
              <textarea id="ai-q-how" rows="3" placeholder="Ej. Contamos con patio de acopio de arcilla, tolvas, molinos de martillo, extrusora automática, secaderos solares y hornos Hoffmann continuos con montacargas para despacho..." class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"></textarea>
            </div>

            <div class="w-full sm:w-1/2">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                3. ¿Hace cuánto opera la empresa? (Antigüedad en años) *
              </label>
              <input type="number" id="ai-q-years" min="1" max="150" value="5" class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold">
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onclick="window.cerrarModalAsistenteADN()" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
              Cancelar
            </button>
            <button type="button" id="btn-ejecutar-ai-profile" onclick="window.ejecutarGeneracionPerfilIA()" class="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95">
              <span>🤖 Redactar ADN & Contexto Maestro con IA</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // Pre-cargar valores existentes
    const descActual = document.getElementById('emp-company-desc')?.value || '';
    const howActual = document.getElementById('emp-operational-how')?.value || '';
    const yearsActual = document.getElementById('emp-years-operating')?.value || '5';
    const sectorActual = document.getElementById('emp-sector')?.value || '';

    const qWhat = document.getElementById('ai-q-what');
    const qHow = document.getElementById('ai-q-how');
    const qYears = document.getElementById('ai-q-years');

    if (qWhat) qWhat.value = descActual || sectorActual || '';
    if (qHow) qHow.value = howActual || '';
    if (qYears) qYears.value = yearsActual || '5';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  window.cerrarModalAsistenteADN = function() {
    const modal = document.getElementById('modal-asistente-adn');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  window.ejecutarGeneracionPerfilIA = async function() {
    const btn = document.getElementById('btn-ejecutar-ai-profile');
    const qWhat = document.getElementById('ai-q-what')?.value.trim();
    const qHow = document.getElementById('ai-q-how')?.value.trim();
    const qYears = parseInt(document.getElementById('ai-q-years')?.value, 10) || 5;

    if (!qWhat) {
      alert("Por favor describe brevemente qué hace la empresa.");
      return;
    }

    const empId = document.getElementById('emp-id')?.value || 'new';
    const razonSocial = document.getElementById('emp-razon')?.value || 'Empresa Cliente';
    const sector = document.getElementById('emp-sector')?.value || '';
    const claseRiesgo = document.getElementById('emp-riesgo')?.value || 'III';
    const trabajadores = document.getElementById('emp-trabajadores')?.value || '10';
    const ciudad = document.getElementById('emp-ciudad')?.value || 'Colombia';

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      Redactando Perfil con IA...
    `;

    const generarPerfilLocalFallback = () => {
      const desc = `${razonSocial} es una organización colombiana destacada en ${sector || qWhat}, con ${qYears} años de sólida trayectoria operacional en ${ciudad}. La compañía se especializa en ${qWhat}. Su propuesta de valor se fundamenta en la excelencia operativa, el estricto cumplimiento del marco legal colombiano (Decreto 1072 de 2015 y Resolución 0312 de 2019) y la protección integral de su capital humano y partes interesadas.`;
      const oper = qHow
        ? `La empresa opera bajo un modelo estructurado por procesos SIPOC y ciclo PHVA: ${qHow}. Cuenta con infraestructura física especializada, maquinaria y herramientas con plan de mantenimiento preventivo, personal técnico capacitado y protocolos rigurosos de Seguridad y Salud en el Trabajo.`
        : `La operación se desarrolla mediante un flujo productivo secuencial y controlado: 1) Planificación estratégica y abastecimiento de insumos; 2) Ejecución técnica y operativa con maquinaria especializada; 3) Control de calidad, inspección preoperacional y seguridad en la fuente; 4) Almacenamiento, entrega y servicio al cliente para ${trabajadores} colaboradores.`;
      const maturity = qYears >= 10 ? 'Madura y Consolidada' : (qYears >= 3 ? 'En Crecimiento y Estandarización' : 'En Etapa Inicial de Formalización');
      const peligrosPorRiesgo = {
        'V': ['Mecánico (atrapamientos, corte)', 'Eléctrico / Térmico (altas energías, trabajo en alturas)', 'Locativo (superficies irregulares, caída de objetos)', 'Biomecánico (manipulación manual de cargas)', 'Físico (ruido continuo, material particulado)'],
        'IV': ['Químico (vapores, solventes)', 'Mecánico (herramientas de impacto)', 'Biológico / Locativo', 'Biomecánico (posturas forzadas)'],
        'III': ['Mecánico', 'Físico', 'Biomecánico', 'Locativo'],
        'II': ['Biomecánico (movimientos repetitivos)', 'Mecánico (herramientas menores)', 'Físico (ruido moderado)', 'Psicosocial (ritmo de trabajo)'],
        'I': ['Biomecánico (postura sedente prolongada)', 'Psicosocial (atención al público, carga mental)', 'Locativo (orden y aseo)']
      };
      return {
        ok: true,
        company_description: desc,
        operational_how_it_works: oper,
        years_operating: qYears,
        ai_context_summary: {
          core_business: qWhat,
          key_processes: ['Direccionamiento Estratégico', 'Operación y Ejecución Central', 'Gestión de Talento Humano', 'Mantenimiento de Herramientas y Equipos', 'Control de Calidad y SG-SST'],
          operational_maturity: maturity,
          years_operating: qYears,
          inherent_risk_profile: {
            clase_riesgo: claseRiesgo,
            clasificacion_arl: `Riesgo Clase ${claseRiesgo} - Decreto 1072 / Decreto 768 de 2022`,
            peligros_prioritarios: peligrosPorRiesgo[claseRiesgo] || peligrosPorRiesgo['III'],
            normatividad_clave: 'Decreto 1072 de 2015, Res. 0312 de 2019, Guía GTC 45'
          },
          key_stakeholders: ['Clientes comerciales', 'Colaboradores directos y contratistas', 'ARL', 'Ministerio del Trabajo', 'Proveedores de insumos y mantenimiento'],
          generated_at: new Date().toISOString()
        }
      };
    };

    try {
      let res = null;
      try {
        const response = await fetch(`/api/tenants/${empId}/generate-ai-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razonSocial,
            sector,
            claseRiesgo,
            trabajadores,
            ciudad,
            answers: {
              what_it_does: qWhat,
              how_it_operates: qHow,
              years_operating: qYears
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && (data.ok || data.status === 'ok' || data.ai_profile || data.company_description)) {
            const prof = data.ai_profile || {};
            res = {
              ok: true,
              company_description: data.company_description || prof.company_description,
              operational_how_it_works: data.operational_how_it_works || prof.operational_how_it_works,
              years_operating: data.years_operating || prof.years_operating || qYears,
              ai_context_summary: data.ai_context_summary || prof.ai_context_summary
            };
          }
        }
      } catch (netErr) {
        console.warn("Usando síntesis local de ADN Corporativo IA:", netErr);
      }

      if (!res || !res.company_description) {
        res = generarPerfilLocalFallback();
      }

      // Actualizar campos en el modal principal de empresa
      const inputDesc = document.getElementById('emp-company-desc');
      const inputHow = document.getElementById('emp-operational-how');
      const inputYears = document.getElementById('emp-years-operating');
      const badgeAi = document.getElementById('badge-ai-summary-container');
      const textMaturity = document.getElementById('texto-ai-maturity');

      if (inputDesc) inputDesc.value = res.company_description;
      if (inputHow) inputHow.value = res.operational_how_it_works;
      if (inputYears) inputYears.value = res.years_operating || qYears;

      window._tempAiContextSummary = res.ai_context_summary;

      if (badgeAi) badgeAi.classList.remove('hidden');
      if (textMaturity && res.ai_context_summary) {
        textMaturity.innerText = `${res.ai_context_summary.operational_maturity || 'Activo'} • ${res.ai_context_summary.inherent_risk_profile?.peligros_prioritarios?.length || 5} peligros prioritarios`;
      }

      window.cerrarModalAsistenteADN();

      if (window.mostrarNotificacion) {
        window.mostrarNotificacion("✨ ¡Perfil corporativo y Contexto Maestro redactados exitosamente por la IA! Recuerda guardar la empresa.", "success");
      } else {
        alert("✨ ¡Perfil corporativo y Contexto Maestro redactados exitosamente por la IA! Haz clic en 'Guardar Empresa' para consolidar los cambios.");
      }
    } catch (err) {
      console.error("Error al generar perfil IA:", err);
      alert("No fue posible generar el perfil con IA: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };

  window.verContextoIASummary = function() {
    const empId = document.getElementById('emp-id')?.value;
    let summary = window._tempAiContextSummary;
    if (!summary && empId) {
      const emp = store.getEmpresa(empId);
      summary = emp?.ai_context_summary;
    }

    if (!summary) {
      alert("Aún no se ha generado un perfil estructurado con IA para esta empresa. Haz clic en '✨ Asistente IA (3 Preguntas)' para generarlo.");
      return;
    }

    let modal = document.getElementById('modal-ver-ai-json');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-ver-ai-json';
      modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-fade-in max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-sm font-black text-slate-800 flex items-center gap-2">
              <span>🤖</span> Contexto Maestro de IA (ai_context_summary)
            </h3>
            <button onclick="document.getElementById('modal-ver-ai-json').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer">&times;</button>
          </div>
          <div class="my-3 text-xs text-slate-500">
            Este objeto JSON estructurado actúa como <em>System Prompt</em> persistente para la generación automática del Mapa de Procesos SIPOC y la Matriz de Peligros GTC 45.
          </div>
          <div class="flex-1 overflow-auto bg-slate-900 rounded-xl p-4 text-[11px] font-mono text-emerald-400">
            <pre id="pre-ai-json-content"></pre>
          </div>
          <div class="pt-4 border-t border-slate-100 flex justify-end">
            <button onclick="document.getElementById('modal-ver-ai-json').classList.add('hidden')" class="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('pre-ai-json-content').innerText = JSON.stringify(summary, null, 2);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };
}
