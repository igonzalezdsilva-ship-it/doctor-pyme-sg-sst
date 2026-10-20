// =============================================================================
// COMPONENTE: VISOR DE DIAGRAMAS (MAPA DE PROCESOS & ORGANIGRAMA) - DOCTOR PYME
// Lightbox de alta resolución con descarga, reemplazo inmediato y contexto legal
// =============================================================================
import { store } from '../store.js';
import { evidenceDB, leerArchivoDataUrl } from '../db.js';

let visorState = {
  companyId: null,
  tipo: null, // 'mapa_procesos' | 'organigrama'
  currentDataUrl: null,
  currentFileName: null
};

function ensureModalExists() {
  if (document.getElementById('modal-visor-diagrama')) return;

  const modalHtml = `
    <div id="modal-visor-diagrama" class="fixed inset-0 bg-slate-950/90 hidden items-center justify-center z-50 p-2 sm:p-4 transition-all">
      <div class="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-700/30 overflow-hidden transform transition-all animate-fadeIn">
        
        <!-- Cabecera Superior del Visor -->
        <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white flex-shrink-0">
          <div class="flex items-center gap-3">
            <span id="visor-icono" class="text-2xl p-2 bg-slate-800 rounded-xl">🗺️</span>
            <div>
              <div class="flex items-center gap-2">
                <h3 id="visor-titulo" class="font-bold text-base sm:text-lg text-white">Mapa de Procesos</h3>
                <span id="visor-badge-tipo" class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">SG-SST</span>
              </div>
              <p id="visor-subtitulo" class="text-xs text-slate-300 mt-0.5">Empresa Cliente</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <a id="visor-btn-descargar" href="#" download="diagrama.png" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm" title="Descargar imagen en alta resolución">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span class="hidden sm:inline">Descargar</span>
            </a>
            <button onclick="window.cerrarVisorDiagrama()" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition" title="Cerrar visor (Esc)">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <!-- Banner de Contexto Normativo y Vínculo Operativo -->
        <div id="visor-contexto-sst" class="px-5 py-3 bg-indigo-50/80 border-b border-indigo-100 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-start gap-2.5">
            <svg class="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <span class="font-bold block" id="visor-contexto-titulo">Enfoque por Procesos en SG-SST</span>
              <span id="visor-texto-explicacion" class="text-indigo-800 leading-relaxed">Los procesos estratégicos, misionales y de apoyo estructuran la identificación de peligros según GTC 45 y Decreto 1072.</span>
            </div>
          </div>
          <div id="visor-accion-enlace" class="flex-shrink-0"></div>
        </div>

        <!-- Alerta si es Diagrama Modelo / Fallback -->
        <div id="visor-alerta-demo" class="hidden px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2 flex-shrink-0">
          <span class="flex items-center gap-1.5 font-medium">
            <span>ℹ️</span> 
            <span>Este es un <strong>diagrama modelo de referencia</strong>. Puedes sustituirlo por el diagrama oficial de tu empresa en cualquier momento.</span>
          </span>
        </div>

        <!-- Área de Visualización Central de la Imagen -->
        <div class="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-950/5 min-h-[300px] max-h-[60vh]">
          <div id="visor-loader" class="hidden items-center justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
          </div>

          <div id="visor-empty" class="hidden flex-col items-center justify-center text-center p-8 max-w-md">
            <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mb-3">
              📷
            </div>
            <h4 class="font-bold text-slate-800 text-base">Aún no se ha cargado un diagrama</h4>
            <p class="text-xs text-slate-500 mt-1 mb-4">Carga la imagen institucional del mapa de procesos o el organigrama para visualizarlo aquí y vincularlo a tu SG-SST.</p>
            <label class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Cargar Imagen Ahora
              <input type="file" id="visor-input-subir-empty" accept="image/*,.svg" class="hidden">
            </label>
          </div>

          <img 
            id="visor-imagen-preview" 
            src="" 
            alt="Diagrama SG-SST" 
            class="max-w-full max-h-full object-contain rounded-xl shadow-md border border-slate-200/80 bg-white transition"
          >
        </div>

        <!-- Pie del Visor con Metadatos y Opciones de Reemplazo -->
        <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-3 flex-shrink-0">
          <div class="flex flex-wrap items-center gap-2.5 text-center sm:text-left">
            <span id="visor-meta-nombre" class="font-bold text-slate-700">diagrama.png</span>
            <span class="text-slate-300">•</span>
            <span id="visor-meta-tamanio">0 KB</span>
            <span class="text-slate-300">•</span>
            <span id="visor-meta-fecha">Fecha de cargue</span>
          </div>

          <div class="flex items-center gap-2.5">
            <label class="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg cursor-pointer transition text-xs flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <span>Subir / Reemplazar Imagen</span>
              <input type="file" id="visor-input-reemplazar" accept="image/*,.svg" class="hidden">
            </label>
            <button onclick="window.cerrarVisorDiagrama()" class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition text-xs shadow-sm">
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Cerrar al hacer clic fuera del contenedor
  const modal = document.getElementById('modal-visor-diagrama');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      window.cerrarVisorDiagrama();
    }
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      window.cerrarVisorDiagrama();
    }
  });

  // Listener para reemplazar/cargar imagen desde el visor
  const handleUpload = async (file) => {
    if (!file || !visorState.companyId || !visorState.tipo) return;
    try {
      const dataUrl = await leerArchivoDataUrl(file);
      const res = await evidenceDB.guardarDiagramaEmpresa(visorState.companyId, visorState.tipo, dataUrl, {
        nombre: file.name,
        tamanio: file.size,
        tipo: file.type
      });
      
      // Actualizar flag en la empresa del store si aplica
      const empresa = store.getEmpresa(visorState.companyId);
      if (empresa) {
        if (visorState.tipo === 'mapa_procesos') empresa.tieneMapaProcesos = true;
        if (visorState.tipo === 'organigrama') empresa.tieneOrganigrama = true;
        store.saveToStorage();
      }

      // Refrescar visor inmediatamente
      window.abrirVisorDiagrama(visorState.companyId, visorState.tipo);

      // Si está en el dashboard o directorio, actualizar
      if (window.location.hash === '#dashboard' || !window.location.hash) {
        const thumbMapa = document.getElementById('dashboard-thumb-mapa');
        const thumbOrg = document.getElementById('dashboard-thumb-organigrama');
        if (visorState.tipo === 'mapa_procesos' && thumbMapa) thumbMapa.src = res.dataUrl;
        if (visorState.tipo === 'organigrama' && thumbOrg) thumbOrg.src = res.dataUrl;
      }

      if (window.mostrarNotificacion) {
        window.mostrarNotificacion("¡Diagrama actualizado correctamente!", "success");
      }
    } catch (err) {
      console.error("Error guardando diagrama:", err);
      alert(`No se pudo cargar la imagen: ${err?.message || err}`);
    }
  };

  document.getElementById('visor-input-reemplazar').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  });

  document.getElementById('visor-input-subir-empty').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export async function abrirVisorDiagrama(companyId = null, tipo = 'mapa_procesos') {
  ensureModalExists();

  const cId = companyId || store.getEmpresaActivaId();
  const empresa = store.getEmpresa(cId);

  visorState.companyId = cId;
  visorState.tipo = tipo;

  const modal = document.getElementById('modal-visor-diagrama');
  const icono = document.getElementById('visor-icono');
  const titulo = document.getElementById('visor-titulo');
  const subtitulo = document.getElementById('visor-subtitulo');
  const contextoTitulo = document.getElementById('visor-contexto-titulo');
  const textoExplicacion = document.getElementById('visor-texto-explicacion');
  const accionEnlace = document.getElementById('visor-accion-enlace');
  const alertaDemo = document.getElementById('visor-alerta-demo');
  const loader = document.getElementById('visor-loader');
  const emptyView = document.getElementById('visor-empty');
  const imgPreview = document.getElementById('visor-imagen-preview');
  const metaNombre = document.getElementById('visor-meta-nombre');
  const metaTamanio = document.getElementById('visor-meta-tamanio');
  const metaFecha = document.getElementById('visor-meta-fecha');
  const btnDescargar = document.getElementById('visor-btn-descargar');

  const esMapa = tipo === 'mapa_procesos';

  // Configurar títulos y textos explicativos
  if (esMapa) {
    icono.innerText = '🗺️';
    titulo.innerText = 'Mapa General de Procesos';
    subtitulo.innerText = empresa ? `${empresa.razonSocial} • NIT: ${empresa.nit}` : 'Enfoque por Procesos SG-SST';
    contextoTitulo.innerText = 'Enfoque por Procesos (GTC 45:2012 & Decreto 1072)';
    textoExplicacion.innerText = 'Estructura los procesos Estratégicos, Misionales (Operativos) y de Apoyo para la identificación sistemática de peligros y valoración de riesgos.';
    accionEnlace.innerHTML = `
      <button onclick="window.cerrarVisorDiagrama(); window.location.hash='#matriz';" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 whitespace-nowrap">
        <span>Ir a Matriz GTC 45 →</span>
      </button>
    `;
  } else {
    icono.innerText = '👥';
    titulo.innerText = 'Organigrama y Estructura Organizacional SST';
    subtitulo.innerText = empresa ? `${empresa.razonSocial} • NIT: ${empresa.nit}` : 'Jerarquía de Roles y Responsabilidades';
    contextoTitulo.innerText = 'Asignación de Roles y Responsabilidades (Decreto 1072 Art. 2.2.4.6.8 & Res. 0312)';
    textoExplicacion.innerText = `Define la cadena de mando en SST: Alta Dirección, Responsable SST (${empresa?.responsableSST || 'Designado'}), COPASST/Vigía, Comité de Convivencia y Brigada de Emergencia.`;
    accionEnlace.innerHTML = `
      <div class="px-3 py-1 bg-white border border-indigo-200 rounded-lg text-xs text-indigo-900 font-semibold whitespace-nowrap">
        Responsable SST: <strong class="text-indigo-600">${empresa?.responsableSST ? empresa.responsableSST.split('-')[0] : 'Asignado'}</strong>
      </div>
    `;
  }

  // Mostrar modal y loader
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  loader.classList.remove('hidden');
  loader.classList.add('flex');
  imgPreview.classList.add('hidden');
  emptyView.classList.add('hidden');
  alertaDemo.classList.add('hidden');

  try {
    let diagrama = null;
    if (cId && cId !== 'todas') {
      diagrama = await evidenceDB.obtenerDiagramaEmpresa(cId, tipo);
    }

    loader.classList.add('hidden');
    loader.classList.remove('flex');

    if (diagrama && (diagrama.dataUrl || diagrama.url)) {
      // Imagen personalizada cargada o diagrama oficial
      const srcUrl = diagrama.dataUrl || diagrama.url;
      imgPreview.src = srcUrl;
      imgPreview.classList.remove('hidden');
      emptyView.classList.add('hidden');
      alertaDemo.classList.add('hidden');

      metaNombre.innerText = diagrama.nombre || (esMapa ? 'mapa-procesos-ladrillos-ochoa.png' : 'organigrama-ladrillos-ochoa.svg');
      metaTamanio.innerText = diagrama.esOficial ? '✓ Diagrama Oficial Aprobado' : formatBytes(diagrama.tamanio);
      metaFecha.innerText = diagrama.fechaCargue ? new Date(diagrama.fechaCargue).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Oficial';

      btnDescargar.href = srcUrl;
      btnDescargar.download = `${empresa ? empresa.razonSocial.replace(/\\s+/g, '_') : 'empresa'}_${tipo}.${diagrama.tipo?.split('/')[1] || (srcUrl.endsWith('.svg') ? 'svg' : 'png')}`;
      btnDescargar.classList.remove('pointer-events-none', 'opacity-50');
    } else {
      // Si es empresa demo o fallback, mostrar el SVG de ejemplo o mapa oficial
      const esDemo = !cId || cId === 'todas' || ['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-1790438946268'].includes(cId);
      const isLadrillos = cId === 'emp-004' || cId === 'emp-1790438946268' || empresa?.razonSocial?.toLowerCase().includes('ladrillos ochoa');
      const sampleUrl = esMapa 
        ? (isLadrillos ? './assets/mapa-procesos-ladrillos-ochoa.png' : './assets/sample-mapa-procesos.svg') 
        : (isLadrillos ? '/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png' : './assets/sample-organigrama.svg');

      if (esDemo) {
        imgPreview.src = sampleUrl;
        imgPreview.classList.remove('hidden');
        emptyView.classList.add('hidden');
        
        if (isLadrillos) {
          alertaDemo.classList.add('hidden');
        } else {
          alertaDemo.classList.remove('hidden');
        }

        metaNombre.innerText = isLadrillos
          ? (esMapa ? 'mapa-procesos-ladrillos-ochoa.png' : 'Captura de pantalla 2026-10-10 a las 8.41.21 a. m..png')
          : (esMapa ? 'sample-mapa-procesos.svg' : 'sample-organigrama.svg');
        metaTamanio.innerText = isLadrillos ? '✓ Diagrama Oficial Aprobado' : 'Diagrama Modelo Vectorial';
        metaFecha.innerText = isLadrillos ? 'Oficial - Ladrillos Ochoa Ltda' : 'Plantilla de referencia precargada';

        btnDescargar.href = sampleUrl;
        btnDescargar.download = isLadrillos
          ? (esMapa ? 'mapa_procesos_ladrillos_ochoa.png' : 'organigrama_ladrillos_ochoa.png')
          : `${tipo}_referencia.svg`;
        btnDescargar.classList.remove('pointer-events-none', 'opacity-50');
      } else {
        // Empresa sin diagrama cargado
        imgPreview.classList.add('hidden');
        emptyView.classList.remove('hidden');
        emptyView.classList.add('flex');
        metaNombre.innerText = 'Sin archivo';
        metaTamanio.innerText = '0 KB';
        metaFecha.innerText = 'No se ha cargado imagen';
        btnDescargar.classList.add('pointer-events-none', 'opacity-50');
      }
    }
  } catch (err) {
    console.error("Error obteniendo diagrama:", err);
    loader.classList.add('hidden');
    emptyView.classList.remove('hidden');
    emptyView.classList.add('flex');
  }
}

export function cerrarVisorDiagrama() {
  const modal = document.getElementById('modal-visor-diagrama');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Exponer globalmente
window.abrirVisorDiagrama = abrirVisorDiagrama;
window.cerrarVisorDiagrama = cerrarVisorDiagrama;
