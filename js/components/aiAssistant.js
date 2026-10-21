// =============================================================================
// ASISTENTE INTELIGENTE IA (GOOGLE GEMINI PRO 4 ARGON & 3.8 FLASH) - DOCTOR PYME SG-SST
// Generación de Políticas, Peligros GTC 45, Capacitaciones y Auditoría Forense
// =============================================================================
import { store } from '../store.js';
import { 
  geminiService, 
  MODELOS_GEMINI, 
  DEFAULT_CORPORATE_API_KEY,
  generarPoliticaSST, 
  sugerirPeligrosGTC45, 
  asistirPlanAccion, 
  generarTemarioCapacitacion, 
  generarCuestionarioCapacitacion, 
  auditarDocumentoConPro, 
  consultarAsesor 
} from '../services/geminiService.js';

let historialChat = [];

/**
 * Inicializa el widget de asistente (Desactivado según instrucción del usuario)
 */
export function initAiAssistantWidget() {
  const existing = document.getElementById('btn-flotante-ia');
  if (existing) existing.remove();
}

/**
 * Abre el modal interactivo de IA
 */
export function abrirModalIA({
  modoInicial = 'chat',
  contexto = {},
  promptInicial = '',
  onResultadoGenerado = null
} = {}) {
  const modalId = 'modal-asistente-ia';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  const empresaActiva = store.getEmpresaActiva() || {
    razonSocial: 'Ladrillos Ochoa S.A.S.',
    sector: 'Fabricación de productos de arcilla y ladrillos para construcción',
    claseRiesgo: 'IV',
    trabajadores: 48
  };

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto transform transition-all">
      
      <!-- Cabecera del Asistente -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <div class="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <svg class="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.4 7.2L20 8.4L16 12.8L17.2 18.5L12 15.6L6.8 18.5L8 12.8L4 8.4L9.6 7.2L12 2Z"/>
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white">Asistente Técnico SST con IA</h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                ✓ Google Gemini Pro Activo
              </span>
            </div>
            <p class="text-xs text-slate-300">
              Empresa activa: <strong class="text-emerald-300">${empresaActiva.razonSocial}</strong> (Riesgo ${empresaActiva.claseRiesgo || 'IV'}, ${empresaActiva.trabajadores || '48'} trabajadores)
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Selector de Modelo de IA -->
          <div class="hidden sm:flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700">
            <button id="btn-ia-modelo-flash" class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${geminiService.modeloActivo === MODELOS_GEMINI.FLASH ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
              ⚡ Flash 3.8
            </button>
            <button id="btn-ia-modelo-pro" class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${geminiService.modeloActivo === MODELOS_GEMINI.PRO ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
              🧠 Gemini Pro (Forense)
            </button>
          </div>

          <button id="btn-cerrar-modal-ia" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      <!-- Barra de Pestañas de Acciones Rápidas -->
      <div class="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto flex-shrink-0">
        <button id="tab-ia-chat" class="tab-ia-btn px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-white text-indigo-700 shadow-xs border border-indigo-200">
          💬 Consultor Técnico
        </button>
        <button id="tab-ia-politica" class="tab-ia-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition flex items-center gap-1.5">
          📜 Redactar Política
        </button>
        <button id="tab-ia-peligros" class="tab-ia-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition flex items-center gap-1.5">
          ⚠️ Sugerir Peligros GTC 45
        </button>
        <button id="tab-ia-capacitacion" class="tab-ia-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition flex items-center gap-1.5">
          🎓 Temario & Cuestionario
        </button>
        <button id="tab-ia-auditoria" class="tab-ia-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition flex items-center gap-1.5">
          🛡️ Auditoría Forense (Pro)
        </button>
      </div>

      <!-- Contenedor Principal de la Pestaña Activa -->
      <div id="contenedor-ia-vista" class="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50">
        <!-- Renderizado dinámico de la pestaña -->
      </div>

      <!-- Pie del Modal -->
      <div class="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Modelo conectado: <strong id="lbl-modelo-actual" class="text-slate-700">${geminiService.modeloActivo}</strong></span>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-ia-config-key" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline">
            ⚙️ Configurar API Key
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  // Inicializar listeners de tabs
  const tabBtns = modal.querySelectorAll('.tab-ia-btn');
  const vistaContenedor = document.getElementById('contenedor-ia-vista');

  function activarTab(tabId) {
    tabBtns.forEach(b => {
      b.className = 'tab-ia-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition flex items-center gap-1.5';
    });
    const activo = document.getElementById(tabId);
    if (activo) {
      activo.className = 'tab-ia-btn px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-white text-indigo-700 shadow-xs border border-indigo-200';
    }

    switch (tabId) {
      case 'tab-ia-chat':
        renderVistaChat(vistaContenedor, promptInicial);
        break;
      case 'tab-ia-politica':
        renderVistaPolitica(vistaContenedor, contexto);
        break;
      case 'tab-ia-peligros':
        renderVistaPeligros(vistaContenedor, contexto);
        break;
      case 'tab-ia-capacitacion':
        renderVistaCapacitacion(vistaContenedor, contexto);
        break;
      case 'tab-ia-auditoria':
        renderVistaAuditoria(vistaContenedor, contexto);
        break;
    }
  }

  document.getElementById('tab-ia-chat').onclick = () => activarTab('tab-ia-chat');
  document.getElementById('tab-ia-politica').onclick = () => activarTab('tab-ia-politica');
  document.getElementById('tab-ia-peligros').onclick = () => activarTab('tab-ia-peligros');
  document.getElementById('tab-ia-capacitacion').onclick = () => activarTab('tab-ia-capacitacion');
  document.getElementById('tab-ia-auditoria').onclick = () => activarTab('tab-ia-auditoria');

  // Selector de modelo
  const btnFlash = document.getElementById('btn-ia-modelo-flash');
  const btnPro = document.getElementById('btn-ia-modelo-pro');
  const lblModelo = document.getElementById('lbl-modelo-actual');

  btnFlash.onclick = () => {
    geminiService.setModelo(MODELOS_GEMINI.FLASH);
    btnFlash.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition bg-indigo-600 text-white shadow';
    btnPro.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white';
    lblModelo.textContent = MODELOS_GEMINI.FLASH;
  };

  btnPro.onclick = () => {
    geminiService.setModelo(MODELOS_GEMINI.PRO);
    btnPro.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition bg-purple-600 text-white shadow';
    btnFlash.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white';
    lblModelo.textContent = MODELOS_GEMINI.PRO;
  };

  // Botón cerrar
  document.getElementById('btn-cerrar-modal-ia').onclick = () => modal.remove();

  // Configurar API key
  document.getElementById('btn-ia-config-key').onclick = () => {
    abrirModalConfiguracionGemini();
  };

  // Activar tab inicial
  if (modoInicial === 'politica') activarTab('tab-ia-politica');
  else if (modoInicial === 'peligros') activarTab('tab-ia-peligros');
  else if (modoInicial === 'capacitacion') activarTab('tab-ia-capacitacion');
  else if (modoInicial === 'auditoria') activarTab('tab-ia-auditoria');
  else activarTab('tab-ia-chat');
}

/**
 * Pestaña 1: Consultor Técnico Interactivo
 */
function renderVistaChat(container, promptInicial = '') {
  container.innerHTML = `
    <div class="flex flex-col h-[58vh]">
      <!-- Mensajes -->
      <div id="ia-chat-messages" class="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-3">
        ${historialChat.length === 0 ? `
          <div class="text-center py-8 px-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 text-xl">
              💡
            </div>
            <h4 class="text-sm font-bold text-slate-800">¿En qué puedo orientarte hoy?</h4>
            <p class="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Hazme cualquier consulta sobre el Decreto 1072 de 2015, Resolución 0312 de 2019, matrices de riesgo o casos reales de tu empresa.
            </p>
            <div class="mt-4 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              <button onclick="window.enviarPromptSugerido('¿Cuáles son los 5 documentos indispensables que me exige MinTrabajo en una inspección para Ladrillos Ochoa?')" class="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg text-[11px] text-slate-700 font-medium transition text-left">
                📋 Documentos indispensables en inspección
              </button>
              <button onclick="window.enviarPromptSugerido('¿Qué periodicidad deben tener los exámenes médicos ocupacionales para trabajadores expuestos a sílice y altas temperaturas?')" class="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg text-[11px] text-slate-700 font-medium transition text-left">
                🩺 Exámenes médicos para altas temperaturas y sílice
              </button>
              <button onclick="window.enviarPromptSugerido('¿Cómo conformar el Comité de Convivencia Laboral y COPASST para 48 trabajadores según la ley colombiana?')" class="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg text-[11px] text-slate-700 font-medium transition text-left">
                👥 Conformación de COPASST para 48 empleados
              </button>
            </div>
          </div>
        ` : ''}

        ${historialChat.map(m => `
          <div class="flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[85%] rounded-2xl p-3.5 text-xs ${m.rol === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 shadow-xs rounded-tl-none'}">
              <div class="font-bold text-[10px] mb-1 ${m.rol === 'user' ? 'text-indigo-200' : 'text-slate-400'}">
                ${m.rol === 'user' ? 'Tú (Coordinador SST)' : 'Asesor IA (' + (m.modelo || 'Gemini 2.5') + ')'}
              </div>
              <div class="prose prose-xs max-w-none whitespace-pre-wrap leading-relaxed">${m.texto}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Input de Envío -->
      <div class="flex-shrink-0 pt-2 border-t border-slate-200">
        <form id="form-ia-chat" class="flex gap-2">
          <input 
            type="text" 
            id="input-ia-pregunta" 
            placeholder="Pregunta a la IA sobre normas SST, controles, investigaciones de accidentes..." 
            class="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            value="${promptInicial || ''}"
            required
          />
          <button 
            type="submit" 
            id="btn-ia-enviar-chat"
            class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Preguntar</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('form-ia-chat');
  const input = document.getElementById('input-ia-pregunta');
  const chatMessages = document.getElementById('ia-chat-messages');

  window.enviarPromptSugerido = (txt) => {
    input.value = txt;
    form.dispatchEvent(new Event('submit'));
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const pregunta = input.value.trim();
    if (!pregunta) return;

    input.value = '';
    const btn = document.getElementById('btn-ia-enviar-chat');
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-pulse">Pensando...</span>`;

    historialChat.push({ rol: 'user', texto: pregunta });
    renderVistaChat(container);

    try {
      const respuesta = await consultarAsesor(pregunta, historialChat);
      let textoMostrar = '';
      let modeloMostrar = geminiService.modeloActivo;

      if (respuesta && typeof respuesta === 'object') {
        if (respuesta.ok && respuesta.texto) {
          textoMostrar = respuesta.texto;
          modeloMostrar = respuesta.modelo || geminiService.modeloActivo;
        } else if (respuesta.error) {
          textoMostrar = `⚠️ **Aviso de Conexión:**\n\n${respuesta.error}`;
          if (respuesta.requiereApiKey) {
            textoMostrar += `\n\n👉 **¿Cómo conectar tu cuenta de Google (i.gonzalez.dsilva@gmail.com)?**\n1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey) con tu cuenta de correo.\n2. Haz clic en el botón azul **"Create API key"**.\n3. Copia tu clave (debe empezar con \`AIzaSy...\`) y guárdala haciendo clic abajo en **"⚙️ Configurar API Key"**.`;
          }
        } else {
          textoMostrar = JSON.stringify(respuesta);
        }
      } else if (typeof respuesta === 'string') {
        textoMostrar = respuesta;
      } else {
        textoMostrar = 'No se recibió respuesta del asesor técnico.';
      }

      historialChat.push({ 
        rol: 'assistant', 
        texto: textoMostrar, 
        modelo: modeloMostrar 
      });
    } catch (err) {
      historialChat.push({ 
        rol: 'assistant', 
        texto: `⚠️ Inconveniente de comunicación con el motor de IA: ${err.message}`, 
        modelo: geminiService.modeloActivo 
      });
    }

    renderVistaChat(container);
    const updatedMessages = document.getElementById('ia-chat-messages');
    if (updatedMessages) updatedMessages.scrollTop = updatedMessages.scrollHeight;
  };

  if (promptInicial) {
    input.focus();
  }
}

/**
 * Pestaña 2: Generador de Políticas y Reglamentos
 */
function renderVistaPolitica(container, contexto) {
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950">
        <h4 class="font-bold mb-1">Redactor Automático de Políticas SG-SST (Dec. 1072 de 2015)</h4>
        <p>Genera políticas personalizadas con alcance, compromisos de la alta dirección, firma del representante legal y objetivos medibles conforme a la ley colombiana.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Política</label>
          <select id="sel-tipo-politica" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800">
            <option value="Política de Seguridad y Salud en el Trabajo (SST)">Política Integral de Seguridad y Salud en el Trabajo</option>
            <option value="Política de Prevención de Alcohol, Tabaco y Drogas">Política de Prevención de Alcohol, Tabaco y Sustancias Psicoactivas</option>
            <option value="Política de Desconexión Laboral">Política de Desconexión Laboral (Ley 2191 de 2022)</option>
            <option value="Política de Uso de Elementos de Protección Personal (EPP)">Política de Uso Obligatorio de Elementos de Protección Personal (EPP)</option>
            <option value="Política de Prevención del Acoso Laboral">Política de Prevención del Acoso Laboral (Ley 1010 de 2006)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Enfoque o Puntos Específicos</label>
          <input type="text" id="input-enfoque-politica" placeholder="Ej: Operación en hornos continuos, patios de secado y prensas" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800" value="Operaciones en hornos, tolvas y transporte en vagonetas">
        </div>
      </div>

      <div class="flex justify-end">
        <button id="btn-generar-politica" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2">
          <span>✨ Generar Política con Gemini</span>
        </button>
      </div>

      <div id="resultado-politica" class="hidden mt-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-700 uppercase">Documento Generado:</span>
          <button id="btn-copiar-politica" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
            📋 Copiar Texto
          </button>
        </div>
        <div id="texto-politica-generada" class="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap max-h-96 overflow-y-auto shadow-inner"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-generar-politica').onclick = async () => {
    const tipo = document.getElementById('sel-tipo-politica').value;
    const enfoque = document.getElementById('input-enfoque-politica').value;
    const btn = document.getElementById('btn-generar-politica');
    const resultadoDiv = document.getElementById('resultado-politica');
    const textoDiv = document.getElementById('texto-politica-generada');
    const empresa = store.getEmpresaActiva();

    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin mr-1.5">⏳</span> Redactando con IA...`;

    try {
      const res = await generarPoliticaSST(tipo, empresa, { detallesAdicionales: enfoque });
      if (res && res.ok && res.texto) {
        textoDiv.textContent = res.texto;
        resultadoDiv.classList.remove('hidden');
      } else {
        const msg = res?.error || 'No se pudo generar la política.';
        alert(`Aviso de IA: ${msg}`);
      }
    } catch (err) {
      alert(`Error al generar política: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>✨ Generar Política con Gemini</span>`;
    }
  };

  document.getElementById('btn-copiar-politica')?.addEventListener('click', () => {
    const texto = document.getElementById('texto-politica-generada').textContent;
    navigator.clipboard.writeText(texto);
    alert('✓ Política copiada al portapapeles');
  });
}

/**
 * Pestaña 3: Sugerir Peligros GTC 45
 */
function renderVistaPeligros(container, contexto) {
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-950">
        <h4 class="font-bold mb-1">Identificador de Peligros y Controles Jerárquicos (GTC 45)</h4>
        <p>Introduce un proceso o tarea de la empresa para que Gemini identifique los peligros biomecánicos, físicos, químicos, de seguridad y recomiende controles jerárquicos.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proceso / Área</label>
          <input type="text" id="input-proceso-peligro" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800" value="Área de Hornos y Cocción de Ladrillo" placeholder="Ej: Molienda, Hornos, Despachos...">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Actividad o Tarea Específica</label>
          <input type="text" id="input-tarea-peligro" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800" value="Cargue y descargue manual de vagonetas a alta temperatura" placeholder="Ej: Mantenimiento de rodillos...">
        </div>
      </div>

      <div class="flex justify-end">
        <button id="btn-generar-peligros" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition flex items-center gap-2">
          <span>⚠️ Analizar Peligros con IA</span>
        </button>
      </div>

      <div id="resultado-peligros" class="hidden mt-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-700 uppercase">Matriz de Peligros Sugerida:</span>
        </div>
        <div id="contenedor-cards-peligros" class="space-y-3"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-generar-peligros').onclick = async () => {
    const proceso = document.getElementById('input-proceso-peligro').value;
    const tarea = document.getElementById('input-tarea-peligro').value;
    const btn = document.getElementById('btn-generar-peligros');
    const resultadoDiv = document.getElementById('resultado-peligros');
    const contenedorCards = document.getElementById('contenedor-cards-peligros');

    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin mr-1.5">⏳</span> Evaluando con GTC 45...`;

    try {
      const res = await sugerirPeligrosGTC45({ proceso, actividad: tarea, tareas: tarea }, store.getEmpresaActiva());
      let peligros = [];
      if (res && res.ok && Array.isArray(res.peligros)) {
        peligros = res.peligros;
      } else if (Array.isArray(res)) {
        peligros = res;
      } else if (res && res.error) {
        alert(`Aviso de IA: ${res.error}`);
        return;
      }

      contenedorCards.innerHTML = peligros.length > 0 ? peligros.map(p => `
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
              ${p.clasificacion || 'Físico / Mecánico'}
            </span>
            <span class="text-xs font-black text-rose-600">Riesgo: ${p.nivelRiesgo || 'Alto'}</span>
          </div>
          <h5 class="text-xs font-bold text-slate-800">${p.descripcion || 'Peligro identificado'}</h5>
          <p class="text-[11px] text-slate-600"><strong>Posibles Efectos:</strong> ${p.efectosPosibles || 'Quemaduras, lesiones osteomusculares'}</p>
          <div class="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-700 border border-slate-100">
            <strong>Controles Jerárquicos Recomendados:</strong>
            <p class="mt-0.5">${typeof p.medidasControl === 'object' ? Object.values(p.medidasControl).filter(Boolean).join(' • ') : (p.medidasControl || 'Controles de ingeniería y EPP')}</p>
          </div>
        </div>
      `).join('') : `<p class="text-xs text-slate-500">No se pudieron extraer peligros estructurados.</p>`;

      resultadoDiv.classList.remove('hidden');
    } catch (err) {
      alert(`Error al analizar peligros: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>⚠️ Analizar Peligros con IA</span>`;
    }
  };
}

/**
 * Pestaña 4: Diseñador de Capacitaciones & Cuestionarios
 */
function renderVistaCapacitacion(container, contexto) {
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-950">
        <h4 class="font-bold mb-1">Diseñador Pedagógico SST con Banco de 13 Preguntas (DOC-16)</h4>
        <p>Genera el temario completo de una capacitación con sus objetivos de aprendizaje, más el cuestionario oficial de 13 preguntas de selección múltiple con respuestas y justificaciones para el módulo E-Learning.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tema de Capacitación</label>
          <select id="sel-tema-capacitacion" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800">
            <option value="Inducción al Sistema de Gestión de la Seguridad y Salud en el Trabajo (SG-SST)">Capacitación #1: Inducción al SG-SST</option>
            <option value="Trabajo Seguro en Alturas y Plataformas de Hornos">Trabajo Seguro en Alturas (Res. 4272 de 2021)</option>
            <option value="Manejo Seguro de Maquinaria Pesada y Montacargas">Operación Segura de Montacargas y Maquinaria Pesada</option>
            <option value="Prevención del Estrés Térmico y Golpe de Calor">Prevención de Estrés Térmico y Manejo en Hornos</option>
            <option value="Ergonomía y Levantamiento Manual de Cargas (Ladrillos)">Ergonomía y Manipulación Manual de Cargas Pesadas</option>
            <option value="Primeros Auxilios y Brigada de Emergencia">Primeros Auxilios y Actuación de la Brigada</option>
            <option value="Uso y Mantenimiento Correcto de EPP">Uso, Inspección y Mantenimiento de EPP</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Población Objetivo / Horas</label>
          <input type="text" id="input-poblacion-capacitacion" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800" value="Operarios de planta ladrillera (2 Horas teóricas / prácticas)">
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button id="btn-generar-temario" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5">
          <span>📖 Generar Temario</span>
        </button>
        <button id="btn-generar-cuestionario" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition flex items-center gap-1.5">
          <span>📝 Generar 13 Preguntas con Gemini Pro</span>
        </button>
      </div>

      <div id="resultado-capacitacion" class="hidden mt-4 space-y-3">
        <div id="box-temario" class="hidden p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed"></div>
        <div id="box-cuestionario" class="hidden space-y-3"></div>
      </div>
    </div>
  `;

  const btnTemario = document.getElementById('btn-generar-temario');
  const btnCuestionario = document.getElementById('btn-generar-cuestionario');
  const resultadoDiv = document.getElementById('resultado-capacitacion');
  const boxTemario = document.getElementById('box-temario');
  const boxCuestionario = document.getElementById('box-cuestionario');

  btnTemario.onclick = async () => {
    const tema = document.getElementById('sel-tema-capacitacion').value;
    const duracion = document.getElementById('input-poblacion-capacitacion').value;
    const empresa = store.getEmpresaActiva();
    btnTemario.disabled = true;
    btnTemario.innerHTML = `<span>⏳ Generando...</span>`;

    try {
      const res = await generarTemarioCapacitacion(tema, duracion, empresa);
      if (res && res.ok && res.texto) {
        boxTemario.textContent = res.texto;
        boxTemario.classList.remove('hidden');
        resultadoDiv.classList.remove('hidden');
      } else {
        alert(`Aviso de IA: ${res?.error || 'No se pudo generar el temario'}`);
      }
    } catch (err) {
      alert(`Error al generar temario: ${err.message}`);
    } finally {
      btnTemario.disabled = false;
      btnTemario.innerHTML = `<span>📖 Generar Temario</span>`;
    }
  };

  btnCuestionario.onclick = async () => {
    const tema = document.getElementById('sel-tema-capacitacion').value;
    const empresa = store.getEmpresaActiva();
    btnCuestionario.disabled = true;
    btnCuestionario.innerHTML = `<span>⏳ Creando 13 Preguntas...</span>`;

    try {
      const res = await generarCuestionarioCapacitacion(tema, 13, empresa);
      let preguntas = [];
      if (res && res.ok && Array.isArray(res.preguntas)) {
        preguntas = res.preguntas;
      } else if (Array.isArray(res)) {
        preguntas = res;
      } else {
        alert(`Aviso de IA: ${res?.error || 'No se pudo generar el cuestionario'}`);
        return;
      }

      boxCuestionario.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <h5 class="text-xs font-bold text-slate-800 uppercase">Cuestionario Oficial DOC-16 Generado (${preguntas.length} Preguntas):</h5>
          <span class="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold">Listas para el Portal E-Learning del Trabajador</span>
        </div>
        ${preguntas.map((p, idx) => `
          <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <p class="text-xs font-bold text-slate-900">${idx + 1}. ${p.pregunta}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              ${(p.opciones || []).map((opc, oIdx) => {
                const opcTxt = typeof opc === 'object' ? opc.texto : opc;
                const opcId = typeof opc === 'object' ? opc.id : String.fromCharCode(97 + oIdx);
                const esCorrecta = p.correcta === opcId || p.respuestaCorrecta === oIdx;
                return `
                  <div class="p-2 rounded-lg text-[11px] ${esCorrecta ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold' : 'bg-slate-50 text-slate-700'}">
                    ${String.fromCharCode(65 + oIdx)}. ${opcTxt} ${esCorrecta ? '✓ (Correcta)' : ''}
                  </div>
                `;
              }).join('')}
            </div>
            <p class="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded">Justificación: ${p.explicacion || p.justificacion || 'Respaldo normativo Decreto 1072'}</p>
          </div>
        `).join('')}
      `;
      boxCuestionario.classList.remove('hidden');
      resultadoDiv.classList.remove('hidden');
    } catch (err) {
      alert(`Error al generar cuestionario: ${err.message}`);
    } finally {
      btnCuestionario.disabled = false;
      btnCuestionario.innerHTML = `<span>📝 Generar 13 Preguntas con Gemini Pro</span>`;
    }
  };
}

/**
 * Pestaña 5: Auditoría Forense y Dictamen Legal con Gemini Pro (Gemini 4 Argon)
 */
function renderVistaAuditoria(container, contexto) {
  // Asegurar modelo Pro para auditoría
  geminiService.setModelo(MODELOS_GEMINI.PRO);

  const empresa = store.getEmpresaActiva() || { razonSocial: 'Ladrillos Ochoa' };
  const evaluaciones = store.getEvaluacionesEmpresaActiva() || {};
  const numEvaluados = Object.keys(evaluaciones).length;
  const numCumple = Object.values(evaluaciones).filter(e => e.estado === 'CUMPLE').length;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl text-white text-xs">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
          <h4 class="font-bold text-purple-200">Auditoría Forense con Google Gemini Pro (Gemini 4 Argon)</h4>
        </div>
        <p class="text-slate-300">
          Gemini Pro realiza un análisis exhaustivo de suficiencia jurídica, identificando riesgos de sanción ante el Ministerio del Trabajo de Colombia y vacíos de trazabilidad probatoria (Ley 527 de 1999).
        </p>
      </div>

      <!-- Resumen Actual del Sistema -->
      <div class="grid grid-cols-3 gap-3">
        <div class="p-3 bg-white border border-slate-200 rounded-xl text-center">
          <span class="text-[10px] text-slate-400 uppercase font-bold block">Estándares Evaluados</span>
          <span class="text-lg font-black text-slate-800">${numEvaluados} / 68</span>
        </div>
        <div class="p-3 bg-white border border-slate-200 rounded-xl text-center">
          <span class="text-[10px] text-slate-400 uppercase font-bold block">Conformidad Legal</span>
          <span class="text-lg font-black text-emerald-600">${numCumple} Cumplen</span>
        </div>
        <div class="p-3 bg-white border border-slate-200 rounded-xl text-center">
          <span class="text-[10px] text-slate-400 uppercase font-bold block">Nivel de Madurez</span>
          <span class="text-lg font-black text-indigo-600">${Math.round((numCumple / Math.max(1, numEvaluados)) * 100)}%</span>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Foco de la Auditoría o Pregunta Forense</label>
        <textarea id="txt-foco-auditoria" rows="3" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800" placeholder="Ej: Evaluar solidez probatoria de firmas de inducción, programa de medicina preventiva y protocolos de hornos ante posible inspección de MinTrabajo.">Dictamen de suficiencia jurídica y técnica del SG-SST para afrontar visita de inspección de la Dirección Territorial del Ministerio del Trabajo y requerimiento de ARL Positiva.</textarea>
      </div>

      <div class="flex justify-end">
        <button id="btn-ejecutar-auditoria-pro" class="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-2">
          <span>🧠 Ejecutar Dictamen Forense con Gemini Pro</span>
        </button>
      </div>

      <div id="resultado-auditoria-pro" class="hidden mt-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-800 uppercase">Dictamen Oficial del Auditor Forense IA:</span>
          <button id="btn-copiar-auditoria" class="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1">
            📋 Copiar Dictamen
          </button>
        </div>
        <div id="texto-auditoria-pro" class="p-5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap max-h-96 overflow-y-auto shadow-inner"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-ejecutar-auditoria-pro').onclick = async () => {
    const foco = document.getElementById('txt-foco-auditoria').value;
    const btn = document.getElementById('btn-ejecutar-auditoria-pro');
    const resultadoDiv = document.getElementById('resultado-auditoria-pro');
    const textoDiv = document.getElementById('texto-auditoria-pro');

    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin mr-1.5">⏳</span> Razonando con Gemini Pro...`;

    try {
      const promptAuditoria = `
        Realiza una auditoría forense rigurosa del SG-SST de la empresa ${empresa.razonSocial} (Sector: ${empresa.sector || 'Fabricación de Ladrillos'}, Riesgo: ${empresa.claseRiesgo || 'IV'}, ${empresa.trabajadores || '48'} trabajadores).
        Estado actual del sistema:
        - 68 Estándares según Res. 0312 de 2019 aplicables.
        - ${numCumple} estándares marcados como CUMPLE.
        - Documentos clave digitalizados: Política SST, Matriz GTC 45, Plan de Emergencias, Plan Anual de Trabajo, COPASST, Registro FURAT.
        - Trazabilidad: Sistema de firmas electrónicas con Ley 527 de 1999, IP y timestamp ISO.

        Objetivo específico de la auditoría:
        ${foco}

        Por favor estructura tu dictamen en:
        1. DICTAMEN DE CONFORMIDAD NORMATIVA (Res. 0312 y Dec. 1072)
        2. VULNERABILIDADES CRÍTICAS ANTE SANCIÓN DE MINTRABAJO
        3. HALLAZGOS Y NO CONFORMIDADES POTENCIALES
        4. PLAN DE ACCIÓN INMEDIATO PRIORIZADO (Top 5 Acciones Urgentes)
        5. CONCLUSIÓN Y VALORACIÓN DE RIESGO SANCIONATORIO (Bajo, Medio o Crítico)
      `;

      const res = await auditarDocumentoConPro("DICTAMEN GLOBAL SG-SST", promptAuditoria);
      if (res && res.ok && res.texto) {
        textoDiv.textContent = res.texto;
        resultadoDiv.classList.remove('hidden');
      } else {
        alert(`Aviso de IA: ${res?.error || 'No se pudo generar el dictamen forense'}`);
      }
    } catch (err) {
      alert(`Error en auditoría Pro: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>🧠 Ejecutar Dictamen Forense con Gemini Pro</span>`;
    }
  };

  document.getElementById('btn-copiar-auditoria')?.addEventListener('click', () => {
    const texto = document.getElementById('texto-auditoria-pro').textContent;
    navigator.clipboard.writeText(texto);
    alert('✓ Dictamen copiado al portapapeles');
  });
}

/**
 * Modal interactivo de configuración y prueba de Google Gemini API
 */
export function abrirModalConfiguracionGemini() {
  const modalId = 'modal-config-gemini';
  const modalExistente = document.getElementById(modalId);
  if (modalExistente) modalExistente.remove();

  const apiKeyActual = geminiService.apiKey || DEFAULT_CORPORATE_API_KEY;
  const tieneClave = !!apiKeyActual;

  const modalHtml = `
    <div id="${modalId}" class="fixed inset-0 z-[60] bg-slate-900/80 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Cabecera -->
        <div class="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-5 text-white flex justify-between items-center flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner">
              🤖
            </div>
            <div>
              <h3 class="font-bold text-base leading-tight">Conexión Google Gemini Pro API</h3>
              <p class="text-xs text-indigo-200">Modelos Activos: Gemini Pro (gemini-4-argon) & Gemini 3.8 Flash</p>
            </div>
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" class="text-white/70 hover:text-white text-xl font-bold p-1 cursor-pointer">✕</button>
        </div>

        <!-- Contenido -->
        <div class="p-6 space-y-4 text-xs text-slate-600 overflow-y-auto flex-1">
          
          <!-- Estado Actual -->
          <div class="p-3.5 rounded-xl border ${tieneClave ? 'bg-emerald-50/80 border-emerald-200' : 'bg-amber-50/80 border-amber-200'} flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-full ${tieneClave ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}"></span>
              <div>
                <span class="font-bold text-xs ${tieneClave ? 'text-emerald-950' : 'text-amber-950'} block">
                  ${tieneClave ? 'Motor Google Gemini Pro Conectado y Activo' : 'Clave de API Desconectada'}
                </span>
                <span class="text-[11px] ${tieneClave ? 'text-emerald-700' : 'text-amber-800'}">
                  ${tieneClave ? 'Clave vinculada: ' + apiKeyActual.slice(0, 6) + '••••••••••••' + apiKeyActual.slice(-4) : 'Vincula tu clave para activar los agentes'}
                </span>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${tieneClave ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}">
              ${tieneClave ? 'ACTIVO' : 'PENDIENTE'}
            </span>
          </div>

          <!-- Guía para la cuenta de Google del usuario -->
          <div class="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-indigo-950 text-xs">Compatibilidad Dual de Claves Google Gemini</span>
              <span class="text-[10px] text-indigo-700 font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">i.gonzalez.dsilva@gmail.com</span>
            </div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              El software soporta tanto tu <strong>Clave Vertex AI / Google Cloud (<code>AQ.Ab8...</code>)</strong> como claves de <strong>Google AI Studio (<code>AIzaSy...</code>)</strong>:
            </p>
            <div class="pt-1 flex flex-wrap gap-2">
              <button type="button" id="btn-restaurar-clave-corp" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition cursor-pointer">
                <span>🔑 Activar Clave Integrada (AQ.Ab8...Xnaw)</span>
              </button>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition">
                <span>Google AI Studio</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          <!-- Campo de Entrada -->
          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700 text-xs uppercase">
              Clave de API (Google Gemini API Key)
            </label>
            <div class="relative">
              <input 
                type="password" 
                id="input-gemini-api-key" 
                value="${apiKeyActual}" 
                placeholder="AQ.Ab8... o AIzaSy..." 
                class="w-full pl-3 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
              <button 
                type="button" 
                id="btn-toggle-ver-key"
                class="absolute right-2 top-2 px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded transition cursor-pointer"
              >
                Mostrar
              </button>
            </div>
            <p class="text-[10px] text-slate-400">
              La clave queda sincronizada en el servidor y navegador para habilitar <strong>Gemini Pro (gemini-4-argon)</strong> y <strong>Gemini 3.8 Flash</strong> en todos los módulos del SG-SST.
            </p>
          </div>

          <!-- Mensaje de prueba / Estado -->
          <div id="resultado-test-conexion" class="hidden p-3 rounded-xl text-xs font-semibold"></div>

          <!-- Botones de Acción -->
          <div class="pt-2 flex items-center justify-between gap-2">
            <div>
              ${tieneClave ? `
                <button type="button" id="btn-remover-gemini-key" class="text-rose-600 hover:text-rose-800 text-xs font-bold hover:underline cursor-pointer">
                  Limpiar Campo
                </button>
              ` : ''}
            </div>
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                id="btn-test-conexion-gemini" 
                class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                ⚡ Probar Conexión
              </button>
              <button 
                type="button" 
                id="btn-guardar-gemini-key" 
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer"
              >
                💾 Guardar y Conectar
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Toggle mostrar clave
  const inputKey = document.getElementById('input-gemini-api-key');
  const btnToggle = document.getElementById('btn-toggle-ver-key');
  if (btnToggle && inputKey) {
    btnToggle.onclick = () => {
      if (inputKey.type === 'password') {
        inputKey.type = 'text';
        btnToggle.textContent = 'Ocultar';
      } else {
        inputKey.type = 'password';
        btnToggle.textContent = 'Mostrar';
      }
    };
  }

  // Botón restaurar clave integrada
  const btnRestaurar = document.getElementById('btn-restaurar-clave-corp');
  const resTest = document.getElementById('resultado-test-conexion');
  if (btnRestaurar && inputKey) {
    btnRestaurar.onclick = () => {
      const key = geminiService.restaurarClaveCorporativa();
      inputKey.value = key;
      geminiService.setModelo(MODELOS_GEMINI.PRO);
      if (resTest) {
        resTest.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
        resTest.innerHTML = '✅ <strong>Clave corporativa activada y sincronizada:</strong> Motor Google Gemini Pro (<code>gemini-4-argon</code>) listo.';
        resTest.classList.remove('hidden');
      }
    };
  }

  // Botón probar conexión
  const btnTest = document.getElementById('btn-test-conexion-gemini');

  if (btnTest && resTest && inputKey) {
    btnTest.onclick = async () => {
      const val = inputKey.value.trim() || DEFAULT_CORPORATE_API_KEY;
      inputKey.value = val;

      btnTest.disabled = true;
      btnTest.textContent = 'Probando...';
      resTest.className = 'p-3 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200';
      resTest.textContent = 'Conectando con Google Gemini Pro API...';
      resTest.classList.remove('hidden');

      try {
        const res = await geminiService.generar({
          prompt: 'Responde estrictamente: CONECTADO',
          model: MODELOS_GEMINI.PRO,
          apiKey: val,
          temperature: 0.1,
          maxTokens: 10
        });

        if (res.ok) {
          resTest.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
          resTest.innerHTML = '✅ <strong>¡Conexión exitosa!</strong> Integración verificada y activa con <strong>Google Gemini Pro (gemini-4-argon)</strong> y <strong>Gemini 3.8 Flash</strong>.';
          geminiService.setApiKey(val);
          geminiService.setModelo(MODELOS_GEMINI.PRO);
        } else {
          resTest.className = 'p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200';
          resTest.innerHTML = `❌ <strong>Fallo de autenticación:</strong> ${res.error || 'La clave no fue reconocida por Google Gemini.'}`;
        }
      } catch (e) {
        resTest.className = 'p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200';
        resTest.innerHTML = `❌ <strong>Error de conexión:</strong> ${e.message}`;
      } finally {
        btnTest.disabled = false;
        btnTest.textContent = '⚡ Probar Conexión';
      }
    };
  }

  // Botón guardar
  const btnGuardar = document.getElementById('btn-guardar-gemini-key');
  if (btnGuardar && inputKey) {
    btnGuardar.onclick = () => {
      const val = inputKey.value.trim() || DEFAULT_CORPORATE_API_KEY;
      geminiService.setApiKey(val);
      geminiService.setModelo(MODELOS_GEMINI.PRO);
      alert('✓ Google Gemini Pro API Key guardada y activada exitosamente. Todos los agentes de IA están operativos.');
      document.getElementById(modalId)?.remove();
      if (document.getElementById('modal-asistente-ia')) {
        document.getElementById('modal-asistente-ia').remove();
        abrirModalIA();
      }
    };
  }

  // Botón remover / limpiar
  const btnRemover = document.getElementById('btn-remover-gemini-key');
  if (btnRemover && inputKey) {
    btnRemover.onclick = () => {
      inputKey.value = '';
      inputKey.focus();
    };
  }
}

// Inyección global
if (typeof window !== 'undefined') {
  window.abrirModalIA = abrirModalIA;
  window.abrirModalConfiguracionGemini = abrirModalConfiguracionGemini;
  window.asistirPlanAccionConIA = async function(numeral, criterio) {
    abrirModalIA({
      modoInicial: 'chat',
      promptInicial: `Necesito un Plan de Acción concreto y normativo (según Res. 0312 de 2019 y Dec. 1072) para el estándar ${numeral}: "${criterio}". Indica: Actividad, Meta, Responsable, Plazo y Evidencia requerida.`
    });
  };
  window.sugerirPeligrosConIA = function(proceso = '') {
    abrirModalIA({
      modoInicial: 'peligros',
      contexto: { proceso }
    });
  };
}

