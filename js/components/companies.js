// =============================================================================
// COMPONENTE: GESTIÓN DE EMPRESAS CLIENTES (MULTI-EMPRESA) - DOCTOR PYME
// Incluye administración de Mapa de Procesos y Organigrama en IndexedDB
// =============================================================================
import { store } from '../store.js';
import { determinarGrupoEstandares } from '../standards.js';
import { evidenceDB, leerArchivoDataUrl } from '../db.js';

let filtroBusqueda = '';
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
  const empresas = store.getEmpresas();
  const empresaActivaId = store.getEmpresaActivaId();

  const empresasFiltradas = empresas.filter(e => {
    const term = (filtroBusqueda || '').toLowerCase().trim();
    if (!term) return true;
    return (e.razonSocial || '').toLowerCase().includes(term) ||
           (e.nit || '').toLowerCase().includes(term) ||
           (e.sector || '').toLowerCase().includes(term) ||
           (e.ciudad || '').toLowerCase().includes(term);
  });

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado y Acciones -->
      <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <span>Directorio Multi-Empresa</span>
            <span>•</span>
            <span>Doctor Pyme SG-SST</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-800">Directorio de Empresas Clientes</h1>
          <p class="text-sm text-slate-500">Administra tus empresas clientes con autoclasificación legal, mapas de procesos y organigramas institucionales.</p>
        </div>
        <button id="btn-nueva-empresa" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Nueva Empresa Cliente
        </button>
      </div>

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

      <!-- Tarjetas de Empresas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${empresasFiltradas.map(emp => {
          const esActiva = emp.id === empresaActivaId;
          const tagColors = {
            7: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            21: 'bg-blue-50 text-blue-700 border-blue-200',
            60: 'bg-purple-50 text-purple-700 border-purple-200'
          };

          return `
            <div class="bg-white rounded-xl border ${esActiva ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200 shadow-sm'} p-5 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div class="flex items-start justify-between gap-2">
                  <span class="px-2.5 py-1 rounded-md text-xs font-bold border ${tagColors[emp.estandaresAplicables] || 'bg-slate-100 text-slate-700'}">
                    ${emp.estandaresAplicables} Estándares (Res. 0312)
                  </span>
                  <div class="flex items-center gap-1">
                    <button onclick="window.editarEmpresa('${emp.id}')" class="p-1 text-slate-400 hover:text-indigo-600 transition" title="Editar datos y diagramas">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onclick="window.eliminarEmpresa('${emp.id}')" class="p-1 text-slate-400 hover:text-red-600 transition" title="Eliminar empresa">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>

                <h3 class="font-bold text-slate-800 text-base mt-3 leading-snug">${emp.razonSocial}</h3>
                <p class="text-xs text-slate-500 mt-1">NIT: ${emp.nit}</p>

                <div class="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
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
    </div>

    <!-- Modal de Formulario Crear/Editar Empresa -->
    <div id="modal-empresa" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm hidden items-center justify-center z-50 p-3 sm:p-4">
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

          <!-- Botones de Acción -->
          <div class="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white py-3">
            <button type="button" onclick="window.cerrarModalEmpresa()" class="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition">
              Cancelar
            </button>
            <button type="submit" id="btn-submit-empresa" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-2">
              Guardar Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Listeners de búsqueda y apertura
  document.getElementById('input-buscar-empresa').addEventListener('input', (e) => {
    filtroBusqueda = e.target.value;
    renderCompanies();
  });

  document.getElementById('btn-nueva-empresa').addEventListener('click', () => {
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

  // Manejo de archivos en formulario
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
      const empresaData = {
        id: id || undefined,
        razonSocial: document.getElementById('emp-razon').value.trim(),
        nit: document.getElementById('emp-nit').value.trim(),
        arl: document.getElementById('emp-arl').value,
        claseRiesgo: document.getElementById('emp-riesgo').value,
        trabajadores: parseInt(document.getElementById('emp-trabajadores').value, 10) || 1,
        ciudad: document.getElementById('emp-ciudad').value.trim(),
        direccion: document.getElementById('emp-direccion').value.trim(),
        sector: document.getElementById('emp-sector').value.trim(),
        responsableSST: document.getElementById('emp-responsable').value.trim(),
        telefono: document.getElementById('emp-telefono').value.trim(),
        email: document.getElementById('emp-email').value.trim()
      };

      const finalId = store.saveEmpresa(empresaData);
      const empresaGuardada = store.getEmpresa(finalId);

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
        window.mostrarNotificacion(`Empresa ${empresaGuardada ? empresaGuardada.razonSocial : ''} guardada exitosamente.`, 'success');
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

  fileMapaProcesosSeleccionado = null;
  fileOrganigramaSeleccionado = null;
  dataUrlMapaProcesos = null;
  metaMapaProcesos = null;
  dataUrlOrganigrama = null;
  metaOrganigrama = null;
  quitarMapaProcesosFlag = false;
  quitarOrganigramaFlag = false;

  const previewMapaContainer = document.getElementById('preview-mapa-container');
  const previewOrgContainer = document.getElementById('preview-organigrama-container');
  const previewMapaImg = document.getElementById('preview-mapa-img');
  const previewOrgImg = document.getElementById('preview-organigrama-img');
  const badgeMapa = document.getElementById('badge-mapa-estado');
  const badgeOrg = document.getElementById('badge-organigrama-estado');
  const textoDropMapa = document.getElementById('texto-dropzone-mapa');
  const textoDropOrg = document.getElementById('texto-dropzone-organigrama');

  if (empresa) {
    titulo.innerText = "Editar Empresa Cliente";
    document.getElementById('emp-id').value = empresa.id;
    document.getElementById('emp-razon').value = empresa.razonSocial;
    document.getElementById('emp-nit').value = empresa.nit;
    document.getElementById('emp-arl').value = empresa.arl;
    document.getElementById('emp-riesgo').value = empresa.claseRiesgo;
    document.getElementById('emp-trabajadores').value = empresa.trabajadores;
    document.getElementById('emp-ciudad').value = empresa.ciudad || '';
    document.getElementById('emp-direccion').value = empresa.direccion || '';
    document.getElementById('emp-sector').value = empresa.sector || '';
    document.getElementById('emp-responsable').value = empresa.responsableSST || '';
    document.getElementById('emp-telefono').value = empresa.telefono || '';
    document.getElementById('emp-email').value = empresa.email || '';

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
    document.getElementById('emp-trabajadores').value = '10';

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

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

window.editarEmpresa = function(id) {
  const empresa = store.getEmpresa(id);
  if (empresa) {
    abrirModalEmpresa(empresa);
  }
};

window.eliminarEmpresa = function(id) {
  store.deleteEmpresa(id);
  renderCompanies();
  window.actualizarSelectorCabecera();
};

window.cerrarModalEmpresa = function() {
  const modal = document.getElementById('modal-empresa');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
