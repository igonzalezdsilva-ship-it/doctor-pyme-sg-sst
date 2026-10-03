// =============================================================================
// COMPONENTE: VISOR Y PREVISUALIZADOR DE DOCUMENTOS Y EVIDENCIAS - DOCTOR PYME
// Permite generar vista previa inmediata de PDFs, imágenes y documentos
// sin necesidad de descargarlos previamente en el equipo del usuario.
// =============================================================================
import { store } from '../store.js';
import { evidenceDB } from '../db.js';
import { ESTANDARES_RES_0312 } from '../data.js';

let activeBlobUrl = null;
let imageZoom = 1.0;
let imageRotation = 0;

/**
/**
 * Convierte una cadena base64 a Uint8Array de forma compatible con todos los entornos
 */
export function base64ToUint8Array(base64) {
  if (typeof atob === 'function') {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch {}
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = (base64 || '').replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const bytes = new Uint8Array(Math.floor((len * 3) / 4));
  let byteIndex = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = chars.indexOf(clean[i]);
    const c2 = chars.indexOf(clean[i + 1]);
    const c3 = chars.indexOf(clean[i + 2]);
    const c4 = chars.indexOf(clean[i + 3]);
    bytes[byteIndex++] = (c1 << 2) | (c2 >> 4);
    if (c3 >= 0 && clean[i + 2] !== '=') bytes[byteIndex++] = ((c2 & 15) << 4) | (c3 >> 2);
    if (c4 >= 0 && clean[i + 3] !== '=') bytes[byteIndex++] = ((c3 & 3) << 6) | c4;
  }
  return bytes.subarray(0, byteIndex);
}

/**
 * Convierte un Data URL (base64) a un objeto Blob nativo
 * @param {string} dataUrl 
 * @returns {Blob|null}
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const u8arr = base64ToUint8Array(parts[1]);
    if (typeof Blob !== 'undefined') {
      return new Blob([u8arr], { type: mime });
    }
    return { type: mime, size: u8arr.length, data: u8arr };
  } catch (e) {
    return null;
  }
}

/**
 * Decodifica texto plano desde un Data URL base64
 * @param {string} dataUrl 
 * @returns {string}
 */
function decodeTextFromDataUrl(dataUrl) {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return '';
    const bytes = base64ToUint8Array(parts[1]);
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes);
    }
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  } catch {
    return '';
  }
}

/**
 * Asegura la existencia del contenedor modal en el DOM
 */
function ensureModalExists() {
  if (document.getElementById('modal-visor-documento')) return;

  const modalHtml = `
    <div id="modal-visor-documento" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md hidden items-center justify-center z-50 p-2 sm:p-4 transition-all">
      <div class="bg-white rounded-2xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl border border-slate-700/30 overflow-hidden transform transition-all animate-fadeIn">
        
        <!-- Cabecera Superior del Visor de Documentos -->
        <div class="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white flex-shrink-0">
          <div class="flex items-center gap-3 overflow-hidden mr-2">
            <span id="doc-visor-icono" class="text-xl p-2 bg-slate-800 rounded-xl flex-shrink-0">📄</span>
            <div class="overflow-hidden">
              <div class="flex items-center gap-2">
                <h3 id="doc-visor-nombre" class="font-bold text-sm sm:text-base text-white truncate max-w-md" title="Nombre del documento">
                  documento.pdf
                </h3>
                <span id="doc-visor-badge-tipo" class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                  PDF
                </span>
                <span id="doc-visor-badge-numeral" class="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                  1.1.1.1
                </span>
              </div>
              <p id="doc-visor-subtitulo" class="text-[11px] text-slate-400 mt-0.5 truncate">
                Evidencia de cumplimiento SG-SST
              </p>
            </div>
          </div>
          
          <!-- Botones de Acción en Cabecera -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button id="doc-visor-btn-abrir-pestana" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition" title="Abrir en pestaña nueva del navegador (pantalla completa)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              <span class="hidden md:inline">Nueva Pestaña</span>
            </button>

            <a id="doc-visor-btn-descargar" href="#" download="evidencia.pdf" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm" title="Descargar copia del archivo">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span class="hidden sm:inline">Descargar</span>
            </a>

            <button onclick="window.cerrarVisorDocumento()" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition" title="Cerrar vista previa (Esc)">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <!-- Banner de Contexto Normativo del Estándar -->
        <div id="doc-visor-contexto-box" class="px-5 py-2.5 bg-indigo-50/80 border-b border-indigo-100 text-xs text-indigo-950 flex items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="p-1 bg-indigo-600 text-white rounded font-bold text-[10px] flex-shrink-0">SST</span>
            <span id="doc-visor-contexto-texto" class="text-indigo-900 font-medium truncate">
              Estándar evaluado
            </span>
          </div>
          <span class="text-[10px] text-slate-500 font-semibold flex-shrink-0 hidden sm:inline">
            Resolución 0312 de 2019
          </span>
        </div>

        <!-- Área Central de Visualización -->
        <div id="doc-visor-contenido" class="flex-1 w-full overflow-hidden relative bg-slate-900/5 flex items-center justify-center">
          <!-- El contenido se inyecta dinámicamente según el tipo de archivo -->
        </div>

        <!-- Barra Inferior de Estado y Controles -->
        <div class="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2 flex-shrink-0">
          <div class="flex items-center gap-3">
            <span id="doc-visor-meta-peso" class="font-bold text-slate-700">0 KB</span>
            <span class="text-slate-300">•</span>
            <span id="doc-visor-meta-fecha" class="text-slate-500">Fecha</span>
            <span class="text-slate-300">•</span>
            <span class="text-emerald-700 font-medium flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
              Almacenamiento seguro en navegador
            </span>
          </div>

          <div class="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Presiona <kbd class="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-slate-700 font-mono text-[10px]">Esc</kbd> para salir</span>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Cerrar al presionar la tecla Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal-visor-documento');
      if (modal && !modal.classList.contains('hidden')) {
        cerrarVisorDocumento();
      }
    }
  });

  // Cerrar al hacer clic en el fondo oscuro
  const modal = document.getElementById('modal-visor-documento');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cerrarVisorDocumento();
    }
  });
}

/**
 * Abre el visor de documentos para previsualizar cualquier archivo adjunto
 * @param {Object} doc - Objeto con { nombre, tipo, tamanio, dataUrl, numeral, contexto, fechaCargue }
 */
export function abrirVisorDocumento(doc) {
  if (!doc || !doc.dataUrl) {
    alert("No fue posible cargar el contenido del documento.");
    return;
  }

  ensureModalExists();

  // Liberar Blob URL anterior si existía
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }

  imageZoom = 1.0;
  imageRotation = 0;

  const modal = document.getElementById('modal-visor-documento');
  const iconoEl = document.getElementById('doc-visor-icono');
  const nombreEl = document.getElementById('doc-visor-nombre');
  const badgeTipoEl = document.getElementById('doc-visor-badge-tipo');
  const badgeNumeralEl = document.getElementById('doc-visor-badge-numeral');
  const subtituloEl = document.getElementById('doc-visor-subtitulo');
  const contextoEl = document.getElementById('doc-visor-contexto-texto');
  const pesoEl = document.getElementById('doc-visor-meta-peso');
  const fechaEl = document.getElementById('doc-visor-meta-fecha');
  const btnDescargar = document.getElementById('doc-visor-btn-descargar');
  const btnAbrirPestana = document.getElementById('doc-visor-btn-abrir-pestana');
  const contenidoEl = document.getElementById('doc-visor-contenido');

  // Metadatos
  nombreEl.textContent = doc.nombre || 'Documento sin nombre';
  nombreEl.title = doc.nombre || '';

  const kb = Math.round((doc.tamanio || 0) / 1024);
  const sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  pesoEl.textContent = sizeStr;

  const fechaObj = doc.fechaCargue ? new Date(doc.fechaCargue) : new Date();
  fechaEl.textContent = `Cargado: ${fechaObj.toLocaleDateString()} ${fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  if (doc.numeral) {
    badgeNumeralEl.textContent = `Numeral ${doc.numeral}`;
    badgeNumeralEl.classList.remove('hidden');
  } else {
    badgeNumeralEl.classList.add('hidden');
  }

  contextoEl.textContent = doc.contexto || `Evidencia para Numeral ${doc.numeral || 'SG-SST'}`;
  subtituloEl.textContent = doc.empresaNombre ? `Empresa: ${doc.empresaNombre}` : 'Evidencia de cumplimiento normativo';

  // Configurar descarga
  btnDescargar.href = doc.dataUrl;
  btnDescargar.download = doc.nombre || 'evidencia';

  // Generar Blob URL nativo para navegación e iframes fluidos
  const blob = dataUrlToBlob(doc.dataUrl);
  if (blob) {
    activeBlobUrl = URL.createObjectURL(blob);
  } else {
    activeBlobUrl = doc.dataUrl;
  }

  // Configurar apertura en nueva pestaña sin forzar descarga
  btnAbrirPestana.onclick = () => {
    if (activeBlobUrl) {
      window.open(activeBlobUrl, '_blank');
    }
  };

  const nombreLower = (doc.nombre || '').toLowerCase();
  const tipoMime = (doc.tipo || '').toLowerCase();

  const esPDF = tipoMime.includes('pdf') || nombreLower.endsWith('.pdf');
  const esImagen = tipoMime.includes('image') || nombreLower.match(/\.(png|jpe?g|webp|svg|gif|bmp|ico)$/i);
  const esTexto = tipoMime.includes('text') || nombreLower.match(/\.(txt|csv|json|md|log|xml|html|htm)$/i);

  // Renderizar visor específico según tipo de archivo
  if (esPDF) {
    iconoEl.textContent = '📕';
    badgeTipoEl.textContent = 'PDF';
    badgeTipoEl.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30';

    contenidoEl.innerHTML = `
      <div class="w-full h-full flex flex-col bg-slate-800">
        <iframe 
          src="${activeBlobUrl}#toolbar=1&navpanes=1&view=FitH" 
          class="w-full flex-1 border-0 bg-white"
          title="${doc.nombre}"
        ></iframe>
        <div class="px-4 py-2 bg-slate-900 border-t border-slate-700/80 text-center text-xs text-slate-300 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Visualizador nativo de PDF activo
          </span>
          <button onclick="window.open('${activeBlobUrl}', '_blank')" class="text-indigo-400 hover:text-indigo-300 font-semibold underline text-xs">
            Abrir PDF en pantalla completa ↗
          </button>
        </div>
      </div>
    `;
  } else if (esImagen) {
    iconoEl.textContent = '🖼️';
    badgeTipoEl.textContent = 'IMAGEN';
    badgeTipoEl.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';

    contenidoEl.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-950/20">
        <div class="flex-1 w-full h-full flex items-center justify-center overflow-auto p-4">
          <img 
            id="doc-visor-img-target"
            src="${doc.dataUrl}" 
            alt="${doc.nombre}" 
            class="max-w-full max-h-full object-contain shadow-lg rounded-lg border border-slate-300/40 bg-white transition-transform duration-150"
            style="transform: scale(1) rotate(0deg);"
          >
        </div>

        <!-- Barra flotante de controles de zoom e imagen -->
        <div class="absolute bottom-4 bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-3 border border-slate-700/80 z-10">
          <button onclick="window.ajustarZoomImagenDoc(-0.25)" class="p-1 hover:text-indigo-400 transition" title="Reducir zoom (-)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
          </button>
          <span id="doc-visor-zoom-label" class="text-xs font-mono font-bold w-12 text-center">100%</span>
          <button onclick="window.ajustarZoomImagenDoc(0.25)" class="p-1 hover:text-indigo-400 transition" title="Aumentar zoom (+)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
          <span class="w-px h-4 bg-slate-700"></span>
          <button onclick="window.rotarImagenDoc()" class="p-1 hover:text-indigo-400 transition" title="Rotar 90 grados">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          <button onclick="window.resetearZoomImagenDoc()" class="text-xs font-medium px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded transition" title="Restablecer tamaño">
            Reset
          </button>
        </div>
      </div>
    `;
  } else if (esTexto) {
    iconoEl.textContent = '📝';
    badgeTipoEl.textContent = 'TEXTO';
    badgeTipoEl.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-indigo-500/30';

    const textoContenido = decodeTextFromDataUrl(doc.dataUrl);

    contenidoEl.innerHTML = `
      <div class="w-full h-full p-6 overflow-auto bg-slate-900 text-slate-100 flex flex-col font-mono text-xs">
        <div class="mb-3 pb-2 border-b border-slate-800 text-slate-400 flex items-center justify-between">
          <span>Vista de archivo de texto plano / estructurado</span>
          <span>Codificación: UTF-8</span>
        </div>
        <pre class="flex-1 overflow-auto leading-relaxed whitespace-pre-wrap select-text text-slate-200">${escapeHtml(textoContenido)}</pre>
      </div>
    `;
  } else {
    // Archivos Office u otros formatos binarios (DOCX, XLSX, etc.)
    iconoEl.textContent = '📁';
    badgeTipoEl.textContent = 'DOCUMENTO';
    badgeTipoEl.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30';

    contenidoEl.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <div class="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-4xl mb-4 shadow-sm border border-indigo-100">
          📄
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">${doc.nombre}</h3>
        <p class="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
          Este archivo tiene formato <strong>${tipoMime || 'documento digital'}</strong> (${sizeStr}). Para visualizarlo de manera íntegra, puedes abrirlo directamente en el navegador o descargarlo para editarlo en tu suite ofimática.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <button onclick="window.open('${activeBlobUrl}', '_blank')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            Abrir en el Navegador
          </button>
          <a href="${doc.dataUrl}" download="${doc.nombre}" class="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Descargar Documento
          </a>
        </div>
      </div>
    `;
  }

  // Mostrar modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

/**
 * Cierra el visor de documentos y libera memoria
 */
export function cerrarVisorDocumento() {
  const modal = document.getElementById('modal-visor-documento');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    const contenidoEl = document.getElementById('doc-visor-contenido');
    if (contenidoEl) contenidoEl.innerHTML = '';
    const btnDescargar = document.getElementById('doc-visor-btn-descargar');
    if (btnDescargar) btnDescargar.classList.remove('hidden');
    const btnAbrirPestana = document.getElementById('doc-visor-btn-abrir-pestana');
    if (btnAbrirPestana) {
      btnAbrirPestana.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        <span class="hidden md:inline">Nueva Pestaña</span>
      `;
    }
  }

  if (activeBlobUrl) {
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch {}
    activeBlobUrl = null;
  }
}

const win = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});

/**
 * Control de Zoom y Rotación de imagen en vista previa
 */
win.ajustarZoomImagenDoc = function(delta) {
  if (typeof document === 'undefined') return;
  const img = document.getElementById('doc-visor-img-target');
  const label = document.getElementById('doc-visor-zoom-label');
  if (!img) return;

  imageZoom = Math.max(0.25, Math.min(3.0, imageZoom + delta));
  img.style.transform = `scale(${imageZoom}) rotate(${imageRotation}deg)`;
  if (label) label.textContent = `${Math.round(imageZoom * 100)}%`;
};

win.rotarImagenDoc = function() {
  if (typeof document === 'undefined') return;
  const img = document.getElementById('doc-visor-img-target');
  if (!img) return;

  imageRotation = (imageRotation + 90) % 360;
  img.style.transform = `scale(${imageZoom}) rotate(${imageRotation}deg)`;
};

win.resetearZoomImagenDoc = function() {
  if (typeof document === 'undefined') return;
  const img = document.getElementById('doc-visor-img-target');
  const label = document.getElementById('doc-visor-zoom-label');
  if (!img) return;

  imageZoom = 1.0;
  imageRotation = 0;
  img.style.transform = `scale(1) rotate(0deg)`;
  if (label) label.textContent = `100%`;
};

/**
 * Función global para invocar la vista previa de un archivo desde su ID en IndexedDB
 * @param {string} id - ID de la evidencia
 */
export async function previsualizarEvidencia(id) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const archivo = await evidenceDB.obtenerEvidenciaPorId(id);
  if (!archivo) {
    if (typeof alert === 'function') alert("No se encontró el archivo de evidencia seleccionado para generar la vista previa.");
    return;
  }

  const estandares = ESTANDARES_RES_0312;
  const est = estandares.find(e => e.numeral === archivo.numeral);

  abrirVisorDocumento({
    ...archivo,
    contexto: est ? `Numeral ${archivo.numeral}: ${est.criterio || est.estandar}` : `Numeral ${archivo.numeral || 'Evidencia SG-SST'}`,
    empresaNombre: empresaActiva.razonSocial
  });
}

/**
 * Convierte enlaces de Google Docs/Sheets/Drive a formatos incrustables en iframe (/preview)
 * @param {string} url - URL del documento en Google Cloud
 * @returns {string} URL formateada para previsualización
 */
export function formatearUrlGooglePreview(url) {
  if (!url || typeof url !== 'string') return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('docs.google.com/document/d/')) {
    if (cleanUrl.includes('/preview')) return cleanUrl;
    cleanUrl = cleanUrl.replace(/\/(edit|view)([\?#].*)?$/, '/preview');
    if (!cleanUrl.endsWith('/preview')) cleanUrl = cleanUrl.replace(/\/+$/, '') + '/preview';
  } else if (cleanUrl.includes('docs.google.com/spreadsheets/d/')) {
    if (cleanUrl.includes('/preview')) return cleanUrl;
    cleanUrl = cleanUrl.replace(/\/(edit|view)([\?#].*)?$/, '/preview');
    if (!cleanUrl.endsWith('/preview')) cleanUrl = cleanUrl.replace(/\/+$/, '') + '/preview';
  } else if (cleanUrl.includes('drive.google.com/file/d/')) {
    if (cleanUrl.includes('/preview')) return cleanUrl;
    cleanUrl = cleanUrl.replace(/\/(edit|view)([\?#].*)?$/, '/preview');
    if (!cleanUrl.endsWith('/preview')) cleanUrl = cleanUrl.replace(/\/+$/, '') + '/preview';
  }
  return cleanUrl;
}

/**
 * Abre el visor de documentos para previsualizar una guía o documento base en la nube (Google Docs, Sheets, etc.)
 * @param {Object} guia - { url, numeral, criterio, empresaNombre }
 */
export function abrirVisorEnlaceGuia(guia) {
  if (!guia || !guia.url) return;

  ensureModalExists();

  if (activeBlobUrl) {
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch {}
    activeBlobUrl = null;
  }

  const modal = document.getElementById('modal-visor-documento');
  const iconoEl = document.getElementById('doc-visor-icono');
  const nombreEl = document.getElementById('doc-visor-nombre');
  const badgeTipoEl = document.getElementById('doc-visor-badge-tipo');
  const badgeNumeralEl = document.getElementById('doc-visor-badge-numeral');
  const subtituloEl = document.getElementById('doc-visor-subtitulo');
  const contextoEl = document.getElementById('doc-visor-contexto-texto');
  const pesoEl = document.getElementById('doc-visor-meta-peso');
  const fechaEl = document.getElementById('doc-visor-meta-fecha');
  const btnDescargar = document.getElementById('doc-visor-btn-descargar');
  const btnAbrirPestana = document.getElementById('doc-visor-btn-abrir-pestana');
  const contenidoEl = document.getElementById('doc-visor-contenido');

  const urlOriginal = guia.url.trim();
  const urlPreview = formatearUrlGooglePreview(urlOriginal);
  const esGDocs = urlOriginal.includes('docs.google.com/document');
  const esGSheets = urlOriginal.includes('docs.google.com/spreadsheets');
  const esGDrive = urlOriginal.includes('drive.google.com');

  if (esGDocs) {
    iconoEl.textContent = '📄';
    badgeTipoEl.textContent = 'GOOGLE DOCS';
    badgeTipoEl.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30';
  } else if (esGSheets) {
    iconoEl.textContent = '📊';
    badgeTipoEl.textContent = 'GOOGLE SHEETS';
    badgeTipoEl.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  } else if (esGDrive) {
    iconoEl.textContent = '📁';
    badgeTipoEl.textContent = 'GOOGLE DRIVE';
    badgeTipoEl.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30';
  } else {
    iconoEl.textContent = '🔗';
    badgeTipoEl.textContent = 'DOCUMENTO GUÍA EN LÍNEA';
    badgeTipoEl.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
  }

  nombreEl.textContent = `Documento Guía / Plantilla Base - Numeral ${guia.numeral || ''}`;
  nombreEl.title = urlOriginal;

  if (guia.numeral) {
    badgeNumeralEl.textContent = `Numeral ${guia.numeral}`;
    badgeNumeralEl.classList.remove('hidden');
  } else {
    badgeNumeralEl.classList.add('hidden');
  }

  subtituloEl.textContent = `Plantilla Oficial SG-SST en Google Cloud`;
  contextoEl.textContent = guia.criterio ? `Numeral ${guia.numeral}: ${guia.criterio}` : 'Documento base e instructivo SG-SST';
  pesoEl.textContent = 'Nube / Cloud';
  fechaEl.textContent = 'Enlace Activo';

  if (btnDescargar) btnDescargar.classList.add('hidden');
  if (btnAbrirPestana) {
    btnAbrirPestana.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
      <span class="hidden md:inline">Abrir en Google</span>
    `;
    btnAbrirPestana.onclick = () => window.open(urlOriginal, '_blank');
  }

  contenidoEl.innerHTML = `
    <div class="w-full h-full flex flex-col bg-slate-900">
      <iframe 
        src="${urlPreview}" 
        class="w-full flex-1 border-0 bg-white" 
        title="Documento Guía Base"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      ></iframe>
      <div class="px-4 py-2 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span class="flex items-center gap-1.5 text-slate-400">
          <span>☁️</span> Plantilla / Documento Base en Google Cloud (Docs / Sheets)
        </span>
        <button onclick="window.open('${urlOriginal}', '_blank')" class="text-indigo-400 hover:text-indigo-300 font-semibold underline text-xs flex items-center gap-1">
          Editar o abrir directamente en Google Docs / Sheets ↗
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Enlace de funciones al objeto window para invocaciones inline en plantillas HTML
win.abrirVisorDocumento = abrirVisorDocumento;
win.cerrarVisorDocumento = cerrarVisorDocumento;
win.previsualizarEvidencia = previsualizarEvidencia;
win.abrirVisorEnlaceGuia = abrirVisorEnlaceGuia;
win.formatearUrlGooglePreview = formatearUrlGooglePreview;
