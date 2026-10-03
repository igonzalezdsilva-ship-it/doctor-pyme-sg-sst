// =============================================================================
// COMPONENTE: MAPA DE PROCESOS Y ORGANIGRAMA DE LA EMPRESA (DOCTOR PYME)
// Enfoque por Procesos (GTC 45) y Estructura Organizacional (Decreto 1072 de 2015)
// =============================================================================
import { store } from '../store.js';
import { evidenceDB, leerArchivoDataUrl } from '../db.js';

let activeTab = 'mapa'; // 'mapa' | 'organigrama'

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
        <p class="text-sm text-slate-500 mt-2">Para administrar y visualizar el mapa de procesos y el organigrama debes seleccionar una empresa activa.</p>
        <button onclick="window.location.hash='#empresas'" class="mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm">
          Ver Directorio de Empresas
        </button>
      </div>
    `;
    return;
  }

  // Cargar diagramas desde IndexedDB
  let diagMapa = null;
  let diagOrg = null;
  try {
    diagMapa = await evidenceDB.obtenerDiagramaEmpresa(empresaActiva.id, 'mapa_procesos');
    diagOrg = await evidenceDB.obtenerDiagramaEmpresa(empresaActiva.id, 'organigrama');
  } catch (err) {
    console.error("Error cargando diagramas:", err);
  }

  const esDemo = ['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-1790438946268'].includes(empresaActiva.id);
  const defaultMapa = (empresaActiva.id === 'emp-004' || empresaActiva.id === 'emp-1790438946268' || empresaActiva.razonSocial?.toLowerCase().includes('ladrillos ochoa'))
    ? './assets/mapa-procesos-ladrillos-ochoa.png'
    : (esDemo ? './assets/sample-mapa-procesos.svg' : null);
  const mapaSrc = diagMapa?.dataUrl || defaultMapa;
  const orgSrc = diagOrg?.dataUrl || (esDemo ? './assets/sample-organigrama.svg' : null);

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Encabezado Principal del Módulo -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">
            <span>Enfoque por Procesos & Estructura Organizacional</span>
            <span>•</span>
            <span>Decreto 1072 Art. 2.2.4.6.8 & GTC 45</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-800">Mapa de Procesos y Organigrama</h1>
          <p class="text-sm text-slate-500 mt-1">
            Empresa activa: <strong>${empresaActiva.razonSocial}</strong> (NIT: ${empresaActiva.nit} • Riesgo Clase ${empresaActiva.claseRiesgo})
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button onclick="window.editarEmpresa('${empresaActiva.id}')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            Editar Datos de Empresa
          </button>
          <a href="#matriz" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm">
            <span>Matriz GTC 45 →</span>
          </a>
        </div>
      </div>

      <!-- Barra de Pestañas (Tabs) -->
      <div class="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
        <button 
          id="tab-btn-mapa"
          onclick="window.cambiarPestanaProcesos('mapa')"
          class="flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'mapa' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>🗺️</span>
          <span>1. Mapa General de Procesos (GTC 45)</span>
          ${diagMapa ? `<span class="w-2 h-2 rounded-full bg-emerald-400"></span>` : ''}
        </button>

        <button 
          id="tab-btn-organigrama"
          onclick="window.cambiarPestanaProcesos('organigrama')"
          class="flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'organigrama' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>👥</span>
          <span>2. Organigrama y Roles SST (Decreto 1072)</span>
          ${diagOrg ? `<span class="w-2 h-2 rounded-full bg-emerald-400"></span>` : ''}
        </button>
      </div>

      <!-- CONTENIDO PESTAÑA 1: MAPA DE PROCESOS -->
      <div id="panel-mapa" class="${activeTab === 'mapa' ? 'block' : 'hidden'} space-y-6">
        
        <!-- Visor del Mapa de Procesos -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/70">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-lg">🗺️</span>
                <h3 class="font-bold text-base text-slate-800">Mapa General de Procesos</h3>
                ${!diagMapa && esDemo ? `<span class="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">Plantilla Modelo</span>` : ''}
                ${diagMapa ? `<span class="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Imagen Oficial</span>` : ''}
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

              ${diagMapa ? `
                <button onclick="window.eliminarDiagramaDirecto('mapa_procesos')" class="p-1.5 text-slate-400 hover:text-red-600 transition" title="Eliminar diagrama">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Imagen Central -->
          <div class="p-6 flex items-center justify-center bg-slate-900/5 min-h-[380px]">
            ${mapaSrc ? `
              <div class="relative group cursor-pointer" onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'mapa_procesos')">
                <img 
                  id="img-display-mapa" 
                  src="${mapaSrc}" 
                  alt="Mapa de Procesos" 
                  class="max-w-full max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200 bg-white group-hover:scale-[1.01] transition duration-200"
                >
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
                <h4 class="font-bold text-slate-700 text-base">Aún no has cargado el Mapa de Procesos</h4>
                <p class="text-xs text-slate-500 mt-1 mb-4">Sube la imagen de tu mapa de procesos para estructurar la clasificación de peligros en la matriz GTC 45.</p>
                <label class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm inline-flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  Cargar Mapa de Procesos Ahora
                  <input type="file" id="input-subir-mapa-empty" accept="image/*,.svg" class="hidden">
                </label>
              </div>
            `}
          </div>

          <div class="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
            <span>Formato recomendado: PNG, SVG o JPG de alta definición</span>
            <div class="flex items-center gap-2">
              <span class="font-medium text-slate-700">Estado:</span>
              <span class="font-bold ${mapaSrc ? 'text-emerald-600' : 'text-amber-600'}">
                ${mapaSrc ? 'Diagrama Activo en Plataforma' : 'Pendiente por Cargar'}
              </span>
            </div>
          </div>
        </div>

        <!-- Clasificación del Enfoque por Procesos SG-SST -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div class="flex items-center gap-2.5 mb-2.5">
              <span class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm">1</span>
              <div>
                <h4 class="font-bold text-sm text-slate-800">Procesos Estratégicos</h4>
                <span class="text-[10px] text-indigo-600 font-semibold uppercase">Dirección y Gestión</span>
              </div>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed">
              Direccionamiento estratégico, política del SG-SST, asignación presupuestal, auditorías internas y revisión periódica por la alta dirección.
            </p>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div class="flex items-center gap-2.5 mb-2.5">
              <span class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm">2</span>
              <div>
                <h4 class="font-bold text-sm text-slate-800">Procesos Misionales</h4>
                <span class="text-[10px] text-emerald-600 font-semibold uppercase">Cadena de Valor / Operativos</span>
              </div>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed">
              Producción, prestación del servicio, operaciones de campo, almacenamiento y distribución. Donde se concentra el mayor volumen de peligros GTC 45.
            </p>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div class="flex items-center gap-2.5 mb-2.5">
              <span class="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-sm">3</span>
              <div>
                <h4 class="font-bold text-sm text-slate-800">Procesos de Apoyo</h4>
                <span class="text-[10px] text-amber-600 font-semibold uppercase">Soporte Organizacional</span>
              </div>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed">
              Gestión del talento humano, compras e insumos, mantenimiento preventivo y correctivo, infraestructura tecnológica y servicios administrativos.
            </p>
          </div>

        </div>

      </div>

      <!-- CONTENIDO PESTAÑA 2: ORGANIGRAMA Y ROLES SST -->
      <div id="panel-organigrama" class="${activeTab === 'organigrama' ? 'block' : 'hidden'} space-y-6">
        
        <!-- Visor del Organigrama -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/70">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-lg">👥</span>
                <h3 class="font-bold text-base text-slate-800">Organigrama y Estructura Organizacional</h3>
                ${!diagOrg && esDemo ? `<span class="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">Plantilla Modelo</span>` : ''}
                ${diagOrg ? `<span class="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 border border-blue-200">Imagen Oficial</span>` : ''}
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

              ${diagOrg ? `
                <button onclick="window.eliminarDiagramaDirecto('organigrama')" class="p-1.5 text-slate-400 hover:text-red-600 transition" title="Eliminar diagrama">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Imagen Central -->
          <div class="p-6 flex items-center justify-center bg-slate-900/5 min-h-[380px]">
            ${orgSrc ? `
              <div class="relative group cursor-pointer" onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'organigrama')">
                <img 
                  id="img-display-org" 
                  src="${orgSrc}" 
                  alt="Organigrama" 
                  class="max-w-full max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200 bg-white group-hover:scale-[1.01] transition duration-200"
                >
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
                <h4 class="font-bold text-slate-700 text-base">Aún no has cargado el Organigrama</h4>
                <p class="text-xs text-slate-500 mt-1 mb-4">Sube la imagen del organigrama para respaldar la asignación de responsabilidades de tu SG-SST.</p>
                <label class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm inline-flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  Cargar Organigrama Ahora
                  <input type="file" id="input-subir-org-empty" accept="image/*,.svg" class="hidden">
                </label>
              </div>
            `}
          </div>

          <div class="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
            <span>Responsable designado: <strong>${empresaActiva.responsableSST || 'Sin asignar'}</strong></span>
            <div class="flex items-center gap-2">
              <span class="font-medium text-slate-700">Estado:</span>
              <span class="font-bold ${orgSrc ? 'text-emerald-600' : 'text-amber-600'}">
                ${orgSrc ? 'Organigrama Activo en Plataforma' : 'Pendiente por Cargar'}
              </span>
            </div>
          </div>
        </div>

        <!-- Matriz de Roles y Responsabilidades SST (Decreto 1072 Art. 2.2.4.6.8) -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100 bg-slate-50/70">
            <h4 class="font-bold text-sm text-slate-800">Matriz de Roles y Responsabilidades en SST</h4>
            <p class="text-xs text-slate-500 mt-0.5">Definición reglamentaria de funciones y rendición de cuentas según el Decreto 1072 de 2015.</p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                <tr>
                  <th class="p-3.5 border-r border-slate-200">Rol / Cargo</th>
                  <th class="p-3.5 border-r border-slate-200">Designado en ${empresaActiva.razonSocial}</th>
                  <th class="p-3.5 border-r border-slate-200">Responsabilidades Principales</th>
                  <th class="p-3.5">Rendición de Cuentas</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td class="p-3.5 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">Alta Dirección / Representante Legal</td>
                  <td class="p-3.5 border-r border-slate-100 text-slate-700 font-medium">Gerencia General</td>
                  <td class="p-3.5 border-r border-slate-100">
                    Definir y divulgar la Política de SST, asignar los recursos financieros, técnicos y humanos necesarios, y revisar anualmente el sistema.
                  </td>
                  <td class="p-3.5 font-semibold text-indigo-700 whitespace-nowrap">Anual (Acta de Revisión)</td>
                </tr>
                <tr>
                  <td class="p-3.5 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">Responsable del SG-SST</td>
                  <td class="p-3.5 border-r border-slate-100 text-slate-700 font-semibold">${empresaActiva.responsableSST || 'Profesional / Especialista en SST'}</td>
                  <td class="p-3.5 border-r border-slate-100">
                    Planear, organizar, dirigir, desarrollar y evaluar el SG-SST; elaborar el plan anual de trabajo, matriz de riesgos e informes de gestión.
                  </td>
                  <td class="p-3.5 font-semibold text-indigo-700 whitespace-nowrap">Semestral / Mensual</td>
                </tr>
                <tr>
                  <td class="p-3.5 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">COPASST / Vigía de SST</td>
                  <td class="p-3.5 border-r border-slate-100 text-slate-700 font-medium">Elegido por votación</td>
                  <td class="p-3.5 border-r border-slate-100">
                    Proponer medidas de control, realizar inspecciones mensuales de seguridad y participar en la investigación de accidentes de trabajo.
                  </td>
                  <td class="p-3.5 font-semibold text-indigo-700 whitespace-nowrap">Mensual (Acta de Reunión)</td>
                </tr>
                <tr>
                  <td class="p-3.5 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">Comité de Convivencia Laboral</td>
                  <td class="p-3.5 border-r border-slate-100 text-slate-700 font-medium">Representantes Empleador y Empleados</td>
                  <td class="p-3.5 border-r border-slate-100">
                    Prevenir situaciones de acoso laboral (Ley 1010 de 2006), tramitar quejas de manera confidencial y formular recomendaciones conciliatorias.
                  </td>
                  <td class="p-3.5 font-semibold text-indigo-700 whitespace-nowrap">Trimestral (Informe)</td>
                </tr>
                <tr>
                  <td class="p-3.5 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">Brigada de Emergencias</td>
                  <td class="p-3.5 border-r border-slate-100 text-slate-700 font-medium">Personal voluntario capacitado</td>
                  <td class="p-3.5 border-r border-slate-100">
                    Atención inmediata de primeros auxilios, control inicial de conatos de incendio, apoyo en evacuación y simulacros de emergencia.
                  </td>
                  <td class="p-3.5 font-semibold text-indigo-700 whitespace-nowrap">Por simulacro o evento</td>
                </tr>
                <tr>
                  <td class="p-3.5 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">Trabajadores</td>
                  <td class="p-3.5 border-r border-slate-100 text-slate-700 font-medium">100% de la nómina (${empresaActiva.trabajadores} trab.)</td>
                  <td class="p-3.5 border-r border-slate-100">
                    Procurar el cuidado integral de su salud, suministrar información veraz, cumplir las normas de SST y reportar peligros inmediatamente.
                  </td>
                  <td class="p-3.5 font-semibold text-slate-500 whitespace-nowrap">Permanente</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  `;

  // Listener para subida de archivo Mapa de Procesos
  const handleMapaUpload = async (file) => {
    if (!file) return;
    try {
      // 1. Lectura inmediata de archivo para evitar expiración de tokens sandbox en Safari / WebKit
      const dataUrl = await leerArchivoDataUrl(file);

      // 2. Guardar en almacenamiento estructurado
      await evidenceDB.guardarDiagramaEmpresa(empresaActiva.id, 'mapa_procesos', dataUrl, {
        nombre: file.name,
        tamanio: file.size,
        tipo: file.type
      });

      empresaActiva.tieneMapaProcesos = true;
      store.saveToStorage();
      await renderProcessMap();

      if (window.mostrarNotificacion) {
        window.mostrarNotificacion("¡Mapa de Procesos guardado y actualizado con éxito!", "success");
      }
    } catch (err) {
      console.error("Error guardando mapa:", err);
      alert(`No se pudo cargar la imagen: ${err?.message || err}`);
    }
  };

  document.getElementById('input-subir-mapa-directo')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleMapaUpload(e.target.files[0]);
  });

  document.getElementById('input-subir-mapa-empty')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleMapaUpload(e.target.files[0]);
  });

  // Listener para subida de archivo Organigrama
  const handleOrgUpload = async (file) => {
    if (!file) return;
    try {
      // 1. Lectura inmediata de archivo
      const dataUrl = await leerArchivoDataUrl(file);

      // 2. Guardar en almacenamiento estructurado
      await evidenceDB.guardarDiagramaEmpresa(empresaActiva.id, 'organigrama', dataUrl, {
        nombre: file.name,
        tamanio: file.size,
        tipo: file.type
      });

      empresaActiva.tieneOrganigrama = true;
      store.saveToStorage();
      await renderProcessMap();

      if (window.mostrarNotificacion) {
        window.mostrarNotificacion("¡Organigrama guardado y actualizado con éxito!", "success");
      }
    } catch (err) {
      console.error("Error guardando organigrama:", err);
      alert(`No se pudo cargar la imagen: ${err?.message || err}`);
    }
  };

  document.getElementById('input-subir-org-directo')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleOrgUpload(e.target.files[0]);
  });

  document.getElementById('input-subir-org-empty')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleOrgUpload(e.target.files[0]);
  });
}

window.cambiarPestanaProcesos = function(tab) {
  activeTab = tab;
  renderProcessMap();
};

window.eliminarDiagramaDirecto = async function(tipo) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const nombre = tipo === 'mapa_procesos' ? 'el Mapa de Procesos' : 'el Organigrama';
  if (confirm(`¿Estás seguro de eliminar ${nombre} de ${empresaActiva.razonSocial}?`)) {
    await evidenceDB.eliminarDiagramaEmpresa(empresaActiva.id, tipo);
    if (tipo === 'mapa_procesos') empresaActiva.tieneMapaProcesos = false;
    if (tipo === 'organigrama') empresaActiva.tieneOrganigrama = false;
    store.saveToStorage();
    renderProcessMap();
  }
};
