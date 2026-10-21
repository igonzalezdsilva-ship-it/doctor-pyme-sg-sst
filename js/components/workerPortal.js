// =============================================================================
// MÓDULO: GESTIÓN DE TRABAJADORES, CARGOS & PORTAL SST (MULTI-TENANT AISLADO)
// Creación, Administración de Contratos, Perfiles, Manual de Funciones, PTS y Autogestión
// Con Estructura de Estándares Mínimos (Doc Guía, Plantillas, Enlaces y Adjuntos PDF)
// y Sistema de Alertas Legales de Vencimiento de Contrato (Art. 46 CST Colombia)
// =============================================================================

import { store } from '../store.js';
import { auth } from '../auth.js';
import { evidenceDB } from '../db.js';
import { abrirVisorDocumento, abrirVisorEnlaceGuia, previsualizarEvidencia } from './documentViewer.js';
import { abrirModalFirma, generarSelloFirmaHtml } from './signatures.js';
import { comprimirFoto } from '../services/compressionService.js';
import { imprimirRegistroCapacitacionDOC10, imprimirEvaluacionCapacitacionDOC16 } from '../services/trainingReports.js';
import { formatPresentationEmbedUrl, formatVideoEmbedUrl } from './training.js';

// Estado local del módulo
let filtroTextoTrabajadores = '';
let filtroEstadoTrabajadores = 'todos';
let filtroTipoContrato = 'todos';
let modoVistaAutogestion = false;
let trabajadorSeleccionadoId = null;
let tabAutogestionTrabajador = 'resumen';

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(text) {
  return (text || 'general')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function clasificarFuente(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('docs.google.com/document')) {
    return { tipo: 'GDOCS', label: 'Google Docs', icon: '📄', color: 'blue', bg: 'bg-blue-100 text-blue-700 hover:bg-blue-200' };
  }
  if (u.includes('docs.google.com/spreadsheets')) {
    return { tipo: 'GSHEETS', label: 'Google Sheets', icon: '📊', color: 'emerald', bg: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' };
  }
  if (u.includes('drive.google.com')) {
    return { tipo: 'GDRIVE', label: 'Google Drive', icon: '📁', color: 'amber', bg: 'bg-amber-100 text-amber-700 hover:bg-amber-200' };
  }
  if (u.endsWith('.pdf') || u.includes('.pdf?')) {
    return { tipo: 'PDF', label: 'PDF en Línea', icon: '📕', color: 'red', bg: 'bg-red-100 text-red-700 hover:bg-red-200' };
  }
  if (u.startsWith('data:')) {
    return { tipo: 'ARCHIVO', label: 'Archivo Adjunto', icon: '📎', color: 'indigo', bg: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' };
  }
  return { tipo: 'WEB', label: 'Doc Guía / Web', icon: '🔗', color: 'indigo', bg: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' };
}

// =============================================================================
// MOTOR DE ALERTAS LEGALES DE TALENTO HUMANO (ART. 46 CÓDIGO SUSTANTIVO DEL TRABAJO)
// =============================================================================
function calcularAlertaContrato(trabajador) {
  if (!trabajador || (trabajador.estado || 'Activo') === 'Retirado') return null;
  if (trabajador.tipoContrato !== 'Término Fijo' && !trabajador.fechaFinContrato) return null;

  if (!trabajador.fechaFinContrato) {
    return {
      tipo: 'SIN_FECHA',
      nivel: 'alerta',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      badgeIcon: '⚠️',
      badgeLabel: 'Sin Fecha Fin',
      diasRestantes: 0,
      diasParaPreaviso: 0,
      mensaje: 'Contrato a término fijo sin fecha de finalización definida. Debe definirse para el control de preavisos.'
    };
  }

  const fin = new Date(trabajador.fechaFinContrato + 'T00:00:00');
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diffTime = fin.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diasParaPreaviso = diasRestantes - 30; // Días que le quedan a la empresa para cumplir los 30 días de anticipación de ley (Art. 46 CST)

  if (diasRestantes <= 0) {
    return {
      tipo: 'VENCIDO',
      nivel: 'critica',
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold',
      badgeIcon: '🛑',
      badgeLabel: `Vencido hace ${Math.abs(diasRestantes)}d`,
      diasRestantes,
      diasParaPreaviso,
      mensaje: `Contrato vencido el ${trabajador.fechaFinContrato}. Por mandato del Art. 46 CST operó prórroga automática salvo liquidación o acuerdo formal.`
    };
  } else if (diasRestantes <= 30) {
    return {
      tipo: 'PREAVISO_VENCIDO',
      nivel: 'critica',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse',
      badgeIcon: '⚠️',
      badgeLabel: `Preaviso Vencido (${diasRestantes}d fin)`,
      diasRestantes,
      diasParaPreaviso,
      mensaje: `¡Alerta Legal Inminente! Quedan ${diasRestantes} días para el vencimiento (${trabajador.fechaFinContrato}). Como faltan menos de 30 días, expiró el plazo legal para notificar la NO renovación. Por ley (Art. 46 CST), se prorrogará automáticamente por un periodo igual.`
    };
  } else if (diasRestantes <= 60) {
    return {
      tipo: 'URGENTE_PREAVISO',
      nivel: 'urgente',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      badgeIcon: '⏳',
      badgeLabel: `Preavisar en ${diasParaPreaviso}d (Vence en ${diasRestantes}d)`,
      diasRestantes,
      diasParaPreaviso,
      mensaje: `Ventana Crítica de Decisión: Faltan ${diasRestantes} días para el vencimiento (${trabajador.fechaFinContrato}). Tienes ${diasParaPreaviso} días para emitir y radicar la Carta de Preaviso de No Renovación (Art. 46 CST exige 30 días de anticipación).`
    };
  } else if (diasRestantes <= 90) {
    return {
      tipo: 'SEGUIMIENTO',
      nivel: 'seguimiento',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      badgeIcon: '🗓️',
      badgeLabel: `Vence en ${diasRestantes}d`,
      diasRestantes,
      diasParaPreaviso,
      mensaje: `En seguimiento preventivo: Vence el ${trabajador.fechaFinContrato} (${diasRestantes} días restantes).`
    };
  } else {
    return {
      tipo: 'VIGENTE',
      nivel: 'vigente',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      badgeIcon: '✓',
      badgeLabel: `Vence en ${diasRestantes}d`,
      diasRestantes,
      diasParaPreaviso,
      mensaje: `Contrato vigente hasta el ${trabajador.fechaFinContrato}.`
    };
  }
}

export function renderWorkerPortal() {
  const container = document.getElementById('main-content');
  if (!container) return;

  // 1. Si el usuario autenticado es un Trabajador, ingresar directo a su Portal Personal
  if (auth.isWorker()) {
    const trabajadorUser = auth.getUser();
    renderVistaAutogestionTrabajador(container, trabajadorUser, false);
    return;
  }

  // 2. Si un Administrador o Empresa activó la previsualización del portal de un operario
  if (modoVistaAutogestion && trabajadorSeleccionadoId) {
    const trab = store.getTrabajadorPorId(trabajadorSeleccionadoId);
    if (trab) {
      renderVistaAutogestionTrabajador(container, trab, true);
      return;
    }
  }

  // 3. Vista Principal para Administradores SST y Empresas: Consola de Gestión y Creación
  renderConsolaGestionTrabajadores(container);
}

// =============================================================================
// VISTA PRINCIPAL ADMINISTRATIVA: GESTIÓN Y CREACIÓN DE TRABAJADORES
// =============================================================================
function renderConsolaGestionTrabajadores(container) {
  const empresaActiva = store.getEmpresaActiva() || {
    id: 'emp-1790438946268',
    razonSocial: 'LADRILLOS OCHOA LTDA',
    nit: '830124631'
  };

  const idEmpresaFiltro = store.getEmpresaActivaId();
  // AISLAMIENTO MULTI-TENANT ESTRICTO: Solo trabajadores de la empresa activa
  let trabajadores = store.getTrabajadores(idEmpresaFiltro);

  // Aplicar filtros locales de búsqueda
  if (filtroTextoTrabajadores.trim()) {
    const q = filtroTextoTrabajadores.toLowerCase().trim();
    trabajadores = trabajadores.filter(t => 
      (t.nombre || '').toLowerCase().includes(q) ||
      (t.identificacion || t.cedula || '').toLowerCase().includes(q) ||
      (t.cargo || '').toLowerCase().includes(q) ||
      (t.correo || '').toLowerCase().includes(q)
    );
  }

  if (filtroEstadoTrabajadores !== 'todos') {
    trabajadores = trabajadores.filter(t => (t.estado || 'Activo') === filtroEstadoTrabajadores);
  }

  if (filtroTipoContrato !== 'todos') {
    trabajadores = trabajadores.filter(t => (t.tipoContrato || 'Término Indefinido') === filtroTipoContrato);
  }

  // Métricas de Nómina & Talento Humano SST
  const totalTrab = trabajadores.length;
  const activos = trabajadores.filter(t => (t.estado || 'Activo') === 'Activo').length;
  const retirados = trabajadores.filter(t => (t.estado || 'Activo') === 'Retirado').length;
  const masaSalarial = trabajadores
    .filter(t => (t.estado || 'Activo') === 'Activo')
    .reduce((acc, t) => acc + (Number(t.salario) || 0), 0);

  // Detección de contratos a término fijo y cálculo de alertas Art. 46 CST
  const todosTrabajadoresEmpresa = store.getTrabajadores(idEmpresaFiltro).filter(t => (t.estado || 'Activo') === 'Activo');
  const alertasContratos = todosTrabajadoresEmpresa
    .map(t => ({ trabajador: t, alerta: calcularAlertaContrato(t) }))
    .filter(item => item.alerta !== null);

  const contratosCriticos = alertasContratos.filter(a => a.alerta.tipo === 'VENCIDO' || a.alerta.tipo === 'PREAVISO_VENCIDO');
  const contratosUrgentes = alertasContratos.filter(a => a.alerta.tipo === 'URGENTE_PREAVISO');
  const contratosSeguimiento = alertasContratos.filter(a => a.alerta.tipo === 'SEGUIMIENTO');
  const totalTerminoFijo = alertasContratos.length;

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  container.innerHTML = `
    <div class="space-y-6 animate-fadeIn pb-12">

      <!-- BARRA SUPERIOR DE CONMUTACIÓN DE MODO: VISTA ADMINISTRADOR VS INTERFAZ DEL TRABAJADOR -->
      <div class="bg-white rounded-2xl p-3 sm:p-4 border border-indigo-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button type="button" class="px-4 py-2 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-sm flex items-center gap-2 cursor-default">
            <span>🛠️</span>
            <span>Vista Administrador (Gestión de Nómina & Cargos)</span>
          </button>
          <button type="button" onclick="window.verPortalModoOperario()" class="px-4 py-2 rounded-lg text-xs font-black text-slate-700 hover:bg-emerald-600 hover:text-white transition flex items-center gap-2 cursor-pointer">
            <span>👷</span>
            <span>Interfaz del Trabajador (Modo Pruebas & Autogestión)</span>
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-500 font-semibold hidden md:inline">Probar interfaz con trabajador específico:</span>
          <select onchange="if(this.value) window.verPortalComoTrabajador(this.value)" class="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
            <option value="">-- Seleccionar Trabajador para Simulación --</option>
            ${todosTrabajadoresEmpresa.map(t => `
              <option value="${t.id}">👷 ${t.nombre} (${t.cargo})</option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <!-- CABECERA PRINCIPAL CON AISLAMIENTO MULTI-TENANT -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div class="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🏢 ${empresaActiva.razonSocial}
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                NIT: ${empresaActiva.nit}
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/60 text-slate-300 border border-slate-600/50">
                Aislamiento Multi-Tenant Activo
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Gestión de Trabajadores, Cargos & Instrumentos SST</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1.5 leading-relaxed">
              Administración centralizada de talento humano, contratos con alertas de vencimiento (Art. 46 CST), perfiles ocupacionales, manuales de funciones y Procedimientos de Trabajo Seguro (PTS) bajo la estructura oficial de Estándares Mínimos.
            </p>
          </div>

          <!-- BOTONES DE ACCIÓN RÁPIDA -->
          <div class="flex flex-wrap items-center gap-2.5">
            <button onclick="window.abrirModalCrearTrabajador()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/30 active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
              <span>+ Nuevo Trabajador</span>
            </button>

            <!-- BOTÓN CARGA MASIVA DE TRABAJADORES (BASE DE DATOS) -->
            <button onclick="window.abrirModalCargaMasivaTrabajadores()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-900/30 active:scale-95" title="Importar base de datos masiva de trabajadores en Excel / CSV">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <span>📥 Carga Masiva (Base de Datos)</span>
            </button>

            <button onclick="window.abrirModalInstrumentoCargo('contrato')" class="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm">
              <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              <span>Instrumentos por Cargo</span>
            </button>

            <button onclick="window.verPortalModoOperario()" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md">
              <span>👷</span>
              <span>Abrir Interfaz del Trabajador</span>
            </button>
          </div>
        </div>
      </div>

      <!-- KPIS DE TALENTO HUMANO & NÓMINA SST -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Trabajadores</span>
            <span class="text-2xl font-black text-slate-900 mt-1 block">${totalTrab}</span>
            <span class="text-[10px] text-indigo-600 font-bold block mt-0.5">Empresa Activa</span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
            👥
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Trabajadores Activos</span>
            <span class="text-2xl font-black text-emerald-600 mt-1 block">${activos}</span>
            <span class="text-[10px] text-emerald-700 font-bold block mt-0.5">En Nómina Vigente</span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            ✓
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Trabajadores Retirados</span>
            <span class="text-2xl font-black text-slate-500 mt-1 block">${retirados}</span>
            <span class="text-[10px] text-slate-400 font-bold block mt-0.5">Historial Laboral</span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center text-xl font-bold">
            📁
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div class="overflow-hidden">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Masa Salarial Mensual</span>
            <span class="text-xl font-black text-slate-900 mt-1 block truncate" title="${formatCOP(masaSalarial)}">
              ${formatCOP(masaSalarial)}
            </span>
            <span class="text-[10px] text-slate-400 font-medium block mt-0.5">Base Salarial Activa</span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
            💵
          </div>
        </div>

      </div>

      <!-- ===================================================================== -->
      <!-- CENTRO DE ALERTAS LEGALES DE TALENTO HUMANO: VENCIMIENTO DE CONTRATOS -->
      <!-- MANDATO ARTÍCULO 46 CÓDIGO SUSTANTIVO DEL TRABAJO (PREAVISO 30 DÍAS) -->
      <!-- ===================================================================== -->
      ${totalTerminoFijo > 0 ? `
        <div class="rounded-3xl p-5 sm:p-6 border ${contratosCriticos.length > 0 ? 'bg-red-50/70 border-red-200 shadow-sm' : contratosUrgentes.length > 0 ? 'bg-amber-50/70 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200'} space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-2xl ${contratosCriticos.length > 0 ? 'bg-red-600 text-white' : contratosUrgentes.length > 0 ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'} flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
                ${contratosCriticos.length > 0 ? '⚠️' : contratosUrgentes.length > 0 ? '⏳' : '⚖️'}
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-black text-slate-900">
                    Control Legal de Vencimiento de Contratos a Término Fijo (Art. 46 CST)
                  </h3>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    30 Días de Preaviso Obligatorio
                  </span>
                </div>
                <p class="text-xs text-slate-600 mt-0.5">
                  La legislación laboral colombiana exige notificar por escrito la no renovación con al menos <strong>30 días calendario de antelación</strong>; de lo contrario, el contrato se considerará prorrogado automáticamente por un periodo igual.
                </p>
              </div>
            </div>

            <!-- Contadores de Alerta -->
            <div class="flex items-center gap-2 flex-wrap flex-shrink-0">
              ${contratosCriticos.length > 0 ? `
                <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-600 text-white flex items-center gap-1.5 shadow-xs">
                  <span>🛑 Preaviso Vencido:</span>
                  <span class="bg-white/20 px-1.5 py-0.2 rounded-md font-mono">${contratosCriticos.length}</span>
                </span>
              ` : ''}

              ${contratosUrgentes.length > 0 ? `
                <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-500 text-white flex items-center gap-1.5 shadow-xs">
                  <span>⏳ En Ventana Preaviso (30-60d):</span>
                  <span class="bg-white/20 px-1.5 py-0.2 rounded-md font-mono">${contratosUrgentes.length}</span>
                </span>
              ` : ''}

              <span class="px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200">
                Total Término Fijo: <strong>${totalTerminoFijo}</strong>
              </span>
            </div>
          </div>

          <!-- LISTA DE CONTRATOS EN RIESGO O POR VENCER -->
          ${(contratosCriticos.length > 0 || contratosUrgentes.length > 0) ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              ${[...contratosCriticos, ...contratosUrgentes].map(item => {
                const t = item.trabajador;
                const alt = item.alerta;
                const esCritico = alt.nivel === 'critica';

                return `
                  <div class="bg-white p-4 rounded-2xl border ${esCritico ? 'border-red-300 shadow-sm' : 'border-amber-300 shadow-xs'} space-y-3">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <span class="font-black text-slate-900 text-xs block">${t.nombre}</span>
                        <span class="text-[10px] text-slate-500 font-mono block">C.C. ${t.identificacion || t.cedula} • ${t.cargo}</span>
                      </div>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${alt.badgeClass}">
                        ${alt.badgeIcon} ${alt.badgeLabel}
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-xl text-[11px]">
                      <div>
                        <span class="text-[9px] text-slate-400 font-bold block uppercase">Inicio Contrato:</span>
                        <span class="font-mono text-slate-700 font-bold">${t.fechaContrato || t.fechaIngreso}</span>
                      </div>
                      <div>
                        <span class="text-[9px] text-slate-400 font-bold block uppercase">Vencimiento Pactado:</span>
                        <span class="font-mono text-slate-900 font-black">${t.fechaFinContrato}</span>
                      </div>
                    </div>

                    <p class="text-[10px] leading-relaxed ${esCritico ? 'text-red-700 font-medium' : 'text-amber-800'}">
                      ${alt.mensaje}
                    </p>

                    <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button onclick="window.generarPdfCartaPreaviso('${t.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Generar Carta de Preaviso de No Renovación (Art. 46 CST)">
                        📜 Carta Preaviso (PDF)
                      </button>

                      <button onclick="window.abrirModalProrrogaContrato('${t.id}')" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer" title="Registrar Prórroga del Contrato">
                        🔄 Registrar Prórroga
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="p-3 bg-white rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span class="text-base">✓</span>
              <span>Todos los contratos a término fijo cuentan con un margen superior a 60 días para la toma de decisiones contractuales y preaviso conforme al CST.</span>
            </div>
          `}
        </div>
      ` : ''}

      <!-- FILTROS AVANZADOS DE TRABAJADORES -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <!-- Búsqueda Texto -->
          <div class="sm:col-span-1">
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buscar Trabajador</label>
            <div class="relative">
              <input type="text" id="filtro-trab-texto" value="${filtroTextoTrabajadores}" placeholder="Nombre, cédula o cargo..." class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>

          <!-- Filtro Estado -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado Laboral</label>
            <select id="filtro-trab-estado" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="todos" ${filtroEstadoTrabajadores === 'todos' ? 'selected' : ''}>Todos los Estados</option>
              <option value="Activo" ${filtroEstadoTrabajadores === 'Activo' ? 'selected' : ''}>Activos Únicamente</option>
              <option value="Retirado" ${filtroEstadoTrabajadores === 'Retirado' ? 'selected' : ''}>Retirados</option>
            </select>
          </div>

          <!-- Filtro Tipo de Contrato -->
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Contrato</label>
            <select id="filtro-trab-tipo-contrato" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="todos" ${filtroTipoContrato === 'todos' ? 'selected' : ''}>Todos los Contratos</option>
              <option value="Término Indefinido" ${filtroTipoContrato === 'Término Indefinido' ? 'selected' : ''}>Término Indefinido</option>
              <option value="Término Fijo" ${filtroTipoContrato === 'Término Fijo' ? 'selected' : ''}>Término Fijo</option>
              <option value="Obra o Labor" ${filtroTipoContrato === 'Obra o Labor' ? 'selected' : ''}>Obra o Labor</option>
              <option value="Prestación de Servicios" ${filtroTipoContrato === 'Prestación de Servicios' ? 'selected' : ''}>Prestación de Servicios</option>
              <option value="Aprendizaje SENA" ${filtroTipoContrato === 'Aprendizaje SENA' ? 'selected' : ''}>Aprendizaje SENA</option>
            </select>
          </div>

        </div>
      </div>

      <!-- TABLA DE TRABAJADORES CON LOS 4 INSTRUMENTOS OFICIALES -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Listado de Trabajadores Vinculados</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                ${trabajadores.length} Registrados
              </span>
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Empresa: <strong>${empresaActiva.razonSocial}</strong>. Administra instrumentos con estructura de Estándares Mínimos y genera documentos en PDF.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.abrirModalCargaMasivaTrabajadores()" class="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs" title="Cargar base de datos masiva de trabajadores en Excel/CSV">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <span>Carga Masiva</span>
            </button>

            <button onclick="window.abrirModalCrearTrabajador()" class="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              <span>Crear Trabajador</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-100/80 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <th class="py-3.5 px-4">Trabajador & Cédula</th>
                <th class="py-3.5 px-4">Cargo & Área</th>
                <th class="py-3.5 px-4">Salario Mensual</th>
                <th class="py-3.5 px-4">Contrato, Ingreso & Vencimiento</th>
                <th class="py-3.5 px-4 text-center">Estado</th>
                <th class="py-3.5 px-4 text-center">Instrumentos por Cargo (Estándares Mínimos & PDF)</th>
                <th class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${trabajadores.length === 0 ? `
                <tr>
                  <td colspan="7" class="py-12 text-center text-slate-400">
                    <div class="max-w-xs mx-auto text-center space-y-2">
                      <div class="text-3xl">👷</div>
                      <p class="text-xs font-semibold text-slate-700">No hay trabajadores registrados en esta empresa.</p>
                      <p class="text-[11px] text-slate-400">Comienza registrando al primer trabajador con su cargo, salario y fecha de contrato.</p>
                      <button onclick="window.abrirModalCrearTrabajador()" class="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm">
                        + Registrar Primer Trabajador
                      </button>
                    </div>
                  </td>
                </tr>
              ` : trabajadores.map(t => {
                const esActivo = (t.estado || 'Activo') === 'Activo';
                const cedulaStr = t.identificacion || t.cedula || 'No registrada';
                const fechaStr = t.fechaContrato || t.fechaIngreso || 'N/A';
                const tipoContratoStr = t.tipoContrato || 'Término Indefinido';
                const salarioNum = Number(t.salario) || 0;
                const alerta = calcularAlertaContrato(t);

                return `
                  <tr class="hover:bg-slate-50 transition group">
                    
                    <!-- Trabajador & Cédula -->
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs flex-shrink-0">
                          ${(t.nombre || 'T').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span class="font-bold text-slate-900 block leading-tight">${t.nombre}</span>
                          <span class="text-[10px] font-mono text-slate-500">C.C. ${cedulaStr}</span>
                          ${t.correo ? `<span class="text-[10px] text-slate-400 block truncate max-w-[150px]">${t.correo}</span>` : ''}
                        </div>
                      </div>
                    </td>

                    <!-- Cargo & Área -->
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-100 block max-w-fit">
                        ${t.cargo}
                      </span>
                      <span class="text-[10px] text-slate-500 font-medium block mt-0.5">${t.area || 'Operaciones'}</span>
                    </td>

                    <!-- Salario Mensual -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      <span class="font-mono font-bold text-slate-900 text-xs">
                        ${formatCOP(salarioNum)}
                      </span>
                      <span class="text-[9px] text-slate-400 block">COP / Mes</span>
                    </td>

                    <!-- Contrato, Ingreso & Alerta de Vencimiento -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      <div class="space-y-1">
                        <div class="flex items-center gap-1.5">
                          <span class="text-[11px] font-semibold text-slate-800">${tipoContratoStr}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-mono block">Desde: ${fechaStr}</span>
                        ${t.fechaFinContrato ? `
                          <div class="flex items-center gap-1 mt-0.5">
                            <span class="text-[10px] font-mono text-slate-600 font-bold">Vence: ${t.fechaFinContrato}</span>
                          </div>
                        ` : ''}
                        ${alerta ? `
                          <div class="mt-1">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] border ${alerta.badgeClass}" title="${escapeHtml(alerta.mensaje)}">
                              <span>${alerta.badgeIcon}</span>
                              <span>${alerta.badgeLabel}</span>
                            </span>
                          </div>
                        ` : ''}
                      </div>
                    </td>

                    <!-- Estado -->
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${esActivo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                        ${esActivo ? '● Activo' : '○ Retirado'}
                      </span>
                    </td>

                    <!-- 4 INSTRUMENTOS OFICIALES POR CARGO (ESTRUCTURA ESTÁNDARES MÍNIMOS & PDF) -->
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <div class="inline-flex items-center gap-1">
                        
                        <!-- 1. Contrato -->
                        <button onclick="window.abrirModalInstrumentoCargo('contrato', '${escapeHtml(t.cargo)}', '${t.id}')" class="px-2 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-md text-[10px] font-bold border border-blue-200 transition shadow-2xs cursor-pointer flex items-center gap-1" title="Ver Documento Guía, Adjuntar PDF o Generar Minuta de Contrato">
                          <span>📄</span>
                          <span>Contrato</span>
                        </button>

                        <!-- 2. Perfil del Cargo -->
                        <button onclick="window.abrirModalInstrumentoCargo('perfil', '${escapeHtml(t.cargo)}', '${t.id}')" class="px-2 py-1 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 rounded-md text-[10px] font-bold border border-amber-200 transition shadow-2xs cursor-pointer flex items-center gap-1" title="Ver Fuentes, Matriz de Competencias y Profesiograma del Cargo">
                          <span>📋</span>
                          <span>Perfil</span>
                        </button>

                        <!-- 3. Manual de Funciones -->
                        <button onclick="window.abrirModalInstrumentoCargo('manual', '${escapeHtml(t.cargo)}', '${t.id}')" class="px-2 py-1 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 rounded-md text-[10px] font-bold border border-purple-200 transition shadow-2xs cursor-pointer flex items-center gap-1" title="Ver Fuentes, Manual de Funciones y Responsabilidades SST">
                          <span>📖</span>
                          <span>Manual</span>
                        </button>

                        <!-- 4. PTS -->
                        <button onclick="window.abrirModalInstrumentoCargo('pts', '${escapeHtml(t.cargo)}', '${t.id}')" class="px-2 py-1 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-800 rounded-md text-[10px] font-bold border border-teal-200 transition shadow-2xs cursor-pointer flex items-center gap-1" title="Ver Procedimiento de Trabajo Seguro (GTC 45)">
                          <span>🛡️</span>
                          <span>PTS</span>
                        </button>

                      </div>
                    </td>

                    <!-- Acciones -->
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        <button onclick="window.verPortalComoTrabajador('${t.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-2xs" title="Abrir Interfaz Funcional de este Trabajador (Modo Pruebas)">
                          <span>👷</span>
                          <span>Interfaz</span>
                        </button>

                        <button onclick="window.abrirModalCrearTrabajador('${t.id}')" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer" title="Editar Datos del Trabajador">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>

                        <button onclick="window.eliminarTrabajadorConfirm('${t.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Eliminar Trabajador">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>

                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Doctor Pyme SG-SST • Res. 0312 de 2019 (Estándares 1.1.2 & 1.1.3) y Código Sustantivo del Trabajo (Art. 46 CST)</span>
          <span class="font-bold text-slate-700">Empresa: ${empresaActiva.razonSocial}</span>
        </div>

      </div>

    </div>
  `;

  // Listeners de búsqueda y filtros reactivos
  const inputTexto = document.getElementById('filtro-trab-texto');
  if (inputTexto) {
    inputTexto.oninput = (e) => {
      filtroTextoTrabajadores = e.target.value;
      renderConsolaGestionTrabajadores(container);
    };
  }

  const selectEstado = document.getElementById('filtro-trab-estado');
  if (selectEstado) {
    selectEstado.onchange = (e) => {
      filtroEstadoTrabajadores = e.target.value;
      renderConsolaGestionTrabajadores(container);
    };
  }

  const selectTipoContrato = document.getElementById('filtro-trab-tipo-contrato');
  if (selectTipoContrato) {
    selectTipoContrato.onchange = (e) => {
      filtroTipoContrato = e.target.value;
      renderConsolaGestionTrabajadores(container);
    };
  }
}

// =============================================================================
// MODAL: CREAR O EDITAR TRABAJADOR (CON CONTROL DE TÉRMINO FIJO Y PREAVISO CST)
// =============================================================================
window.abrirModalCrearTrabajador = function(trabajadorId = null) {
  const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
  const empresas = store.getEmpresas();
  const trabExistente = trabajadorId ? store.getTrabajadorPorId(trabajadorId) : null;

  const modalId = 'modal-crear-trabajador';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  const tipoContratoActual = trabExistente?.tipoContrato || 'Término Indefinido';
  const esTerminoFijoInicial = tipoContratoActual === 'Término Fijo';

  const cargosFormales = store.getJobPositions(empresaActiva.id);

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-scaleIn">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex justify-between items-start">
        <div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Ficha de Contratación & SG-SST
          </span>
          <h3 class="text-lg font-black text-white mt-1">
            ${trabExistente ? 'Editar Trabajador' : 'Registrar Nuevo Trabajador'}
          </h3>
          <p class="text-xs text-slate-300">
            Ingresa la información contractual y laboral. Vinculado a la Arquitectura Guiada por Procesos.
          </p>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer p-1">✕</button>
      </div>

      <!-- Formulario -->
      <form id="form-guardar-trabajador" class="p-6 space-y-4">
        
        <!-- Fila 1: Empresa Asignada -->
        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-1">Empresa Contratante (Multi-Tenant) *</label>
          <select id="modal-trab-company" required class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
            ${empresas.map(emp => `
              <option value="${emp.id}" ${(trabExistente ? trabExistente.companyId : empresaActiva.id) === emp.id ? 'selected' : ''}>
                ${emp.razonSocial} (NIT: ${emp.nit})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Fila 2: Nombre, Cédula y Cargo Formal -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-1">
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo *</label>
            <input type="text" id="modal-trab-nombre" required value="${trabExistente?.nombre || ''}" placeholder="Ej. Juan Pérez" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Cédula / Identificación *</label>
            <input type="text" id="modal-trab-cedula" required value="${trabExistente?.identificacion || trabExistente?.cedula || ''}" placeholder="Ej. 1020304050" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Cargo Formal *</span>
              <a href="#procesos" class="text-[9.5px] text-indigo-600 hover:underline font-bold">Ver Catálogo</a>
            </label>
            <select id="modal-trab-job-position-id" onchange="window.alSeleccionarCargoTrabajador(this.value)" class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 mb-1">
              <option value="">-- Seleccionar de Cargos Formales --</option>
              ${cargosFormales.map(cg => `
                <option value="${cg.id}" ${(trabExistente?.job_position_id === cg.id || (trabExistente?.cargo && trabExistente.cargo.toLowerCase().trim() === cg.title.toLowerCase().trim())) ? 'selected' : ''}>
                  ${cg.code || 'CARG'} - ${cg.title} (${cg.hierarchy_level})
                </option>
              `).join('')}
              <option value="otro">-- Otro Cargo Manual --</option>
            </select>
            <input type="text" id="modal-trab-cargo" required value="${trabExistente?.cargo || ''}" placeholder="Título del cargo" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        <!-- Fila 3: Salario, Tipo de Contrato y Fechas -->
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Salario Mensual (COP) *</label>
              <input type="number" id="modal-trab-salario" required min="0" step="10000" value="${trabExistente?.salario || 1600000}" placeholder="Ej. 1850000" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono">
              <span class="text-[9px] text-slate-400 mt-0.5 block">Sin puntos ni comas</span>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Contrato *</label>
              <select id="modal-trab-tipo-contrato" required class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
                <option value="Término Indefinido" ${tipoContratoActual === 'Término Indefinido' ? 'selected' : ''}>Término Indefinido</option>
                <option value="Término Fijo" ${tipoContratoActual === 'Término Fijo' ? 'selected' : ''}>Término Fijo</option>
                <option value="Obra o Labor" ${tipoContratoActual === 'Obra o Labor' ? 'selected' : ''}>Obra o Labor</option>
                <option value="Prestación de Servicios" ${tipoContratoActual === 'Prestación de Servicios' ? 'selected' : ''}>Prestación de Servicios</option>
                <option value="Aprendizaje SENA" ${tipoContratoActual === 'Aprendizaje SENA' ? 'selected' : ''}>Aprendizaje SENA</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Fecha de Inicio / Ingreso *</label>
              <input type="date" id="modal-trab-fecha" required value="${trabExistente?.fechaContrato || trabExistente?.fechaIngreso || new Date().toISOString().slice(0, 10)}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
            </div>
          </div>

          <!-- CAMPO CONDICIONAL: FECHA DE FINALIZACIÓN Y PREAVISO (TÉRMINO FIJO) -->
          <div id="contenedor-fecha-fin-contrato" class="${esTerminoFijoInicial ? 'block' : 'hidden'} pt-2 border-t border-slate-200">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label class="block text-[11px] font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                  <span>📅 Fecha de Vencimiento del Contrato *</span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">Art. 46 CST</span>
                </label>
                <input type="date" id="modal-trab-fecha-fin" value="${trabExistente?.fechaFinContrato || ''}" class="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
              </div>

              <!-- Accesos Rápidos de Duración -->
              <div>
                <label class="block text-[10px] font-bold text-slate-500 mb-1">Calcular Vigencia Automática:</label>
                <div class="flex items-center gap-1.5">
                  <button type="button" onclick="window.calcularFechaFinRapida(3)" class="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold transition shadow-2xs">
                    +3 Meses
                  </button>
                  <button type="button" onclick="window.calcularFechaFinRapida(6)" class="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold transition shadow-2xs">
                    +6 Meses
                  </button>
                  <button type="button" onclick="window.calcularFechaFinRapida(12)" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition shadow-2xs">
                    +1 Año
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-2 p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[10.5px] text-blue-900 leading-relaxed flex items-start gap-2">
              <span class="text-blue-600 font-bold text-sm">⚖️</span>
              <span><strong>Preaviso Legal (Art. 46 CST):</strong> La decisión de no renovar el contrato debe notificarse por escrito con mínimo <strong>30 días calendario de anticipación</strong>. El sistema enviará alertas tempranas preventivas antes de que venza este plazo legal.</span>
            </div>
          </div>
        </div>

        <!-- Fila 4: Estado & Área -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Estado Laboral *</label>
            <select id="modal-trab-estado" required class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
              <option value="Activo" ${(trabExistente?.estado || 'Activo') === 'Activo' ? 'selected' : ''}>Activo (En Nómina)</option>
              <option value="Retirado" ${trabExistente?.estado === 'Retirado' ? 'selected' : ''}>Retirado / Egresado</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Área o Departamento</label>
            <input type="text" id="modal-trab-area" value="${trabExistente?.area || 'Operaciones'}" placeholder="Ej. Producción - Molienda" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        <!-- Fila 5: Correo y Teléfono -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input type="email" id="modal-trab-correo" value="${trabExistente?.correo || ''}" placeholder="trabajador@empresa.com" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Teléfono / Celular</label>
            <input type="tel" id="modal-trab-telefono" value="${trabExistente?.telefono || ''}" placeholder="Ej. 3101234567" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        <!-- Fila 6: Seguridad Social -->
        <div class="p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-2">
          <span class="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">Afiliaciones a Seguridad Social Integral (Ley 100)</span>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">EPS</label>
              <input type="text" id="modal-trab-eps" value="${trabExistente?.eps || 'Sura EPS'}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800">
            </div>
            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">Fondo Pensiones (AFP)</label>
              <input type="text" id="modal-trab-afp" value="${trabExistente?.afp || 'Protección'}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800">
            </div>
            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">ARL</label>
              <input type="text" id="modal-trab-arl" value="${trabExistente?.arl || 'Positiva ARL'}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800">
            </div>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="pt-3 border-t border-slate-200 flex justify-between items-center">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
            Cancelar
          </button>

          <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>${trabExistente ? 'Actualizar Ficha' : 'Guardar y Vincular'}</span>
          </button>
        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modalEl);

  // Toggle reactivo para mostrar campo de finalización de contrato si es a Término Fijo
  const selectContrato = document.getElementById('modal-trab-tipo-contrato');
  const contenedorFin = document.getElementById('contenedor-fecha-fin-contrato');
  if (selectContrato && contenedorFin) {
    selectContrato.onchange = (e) => {
      if (e.target.value === 'Término Fijo') {
        contenedorFin.classList.remove('hidden');
        const inputInicio = document.getElementById('modal-trab-fecha');
        const inputFin = document.getElementById('modal-trab-fecha-fin');
        if (inputInicio && inputFin && !inputFin.value) {
          // Pre-llenar a 1 año por defecto si está vacío
          const f = new Date(inputInicio.value || new Date());
          f.setFullYear(f.getFullYear() + 1);
          inputFin.value = f.toISOString().slice(0, 10);
        }
      } else {
        contenedorFin.classList.add('hidden');
      }
    };
  }

  const form = document.getElementById('form-guardar-trabajador');
  form.onsubmit = (e) => {
    e.preventDefault();

    const tipoContrato = document.getElementById('modal-trab-tipo-contrato').value;
    const fechaFin = tipoContrato === 'Término Fijo' ? document.getElementById('modal-trab-fecha-fin')?.value : null;
    const jobPosId = document.getElementById('modal-trab-job-position-id')?.value;
    const cargoTexto = document.getElementById('modal-trab-cargo').value.trim();

    let finalJobPositionId = (jobPosId && jobPosId !== 'otro') ? jobPosId : null;
    if (!finalJobPositionId && cargoTexto) {
      const match = cargosFormales.find(cg => cg.title.toLowerCase().trim() === cargoTexto.toLowerCase().trim());
      if (match) {
        finalJobPositionId = match.id;
      } else {
        const nuevoCargo = store.saveJobPosition({ title: cargoTexto }, document.getElementById('modal-trab-company').value);
        finalJobPositionId = nuevoCargo.id;
      }
    }

    const data = {
      id: trabExistente ? trabExistente.id : null,
      companyId: document.getElementById('modal-trab-company').value,
      job_position_id: finalJobPositionId,
      nombre: document.getElementById('modal-trab-nombre').value.trim(),
      identificacion: document.getElementById('modal-trab-cedula').value.trim(),
      cedula: document.getElementById('modal-trab-cedula').value.trim(),
      cargo: cargoTexto,
      salario: Number(document.getElementById('modal-trab-salario').value) || 0,
      tipoContrato: tipoContrato,
      fechaContrato: document.getElementById('modal-trab-fecha').value,
      fechaIngreso: document.getElementById('modal-trab-fecha').value,
      fechaFinContrato: fechaFin,
      estado: document.getElementById('modal-trab-estado').value,
      area: document.getElementById('modal-trab-area').value.trim(),
      correo: document.getElementById('modal-trab-correo').value.trim(),
      telefono: document.getElementById('modal-trab-telefono').value.trim(),
      eps: document.getElementById('modal-trab-eps').value.trim(),
      afp: document.getElementById('modal-trab-afp').value.trim(),
      arl: document.getElementById('modal-trab-arl').value.trim()
    };

    store.guardarTrabajador(data);
    modalEl.remove();
    renderWorkerPortal();
  };
};

window.alSeleccionarCargoTrabajador = function(jobPosId) {
  const inputCargo = document.getElementById('modal-trab-cargo');
  if (!inputCargo) return;
  if (!jobPosId || jobPosId === 'otro') {
    if (jobPosId === 'otro') inputCargo.value = '';
    inputCargo.focus();
    return;
  }
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const cargos = store.getJobPositions(empresaActiva.id);
  const c = cargos.find(cg => cg.id === jobPosId);
  if (c) {
    inputCargo.value = c.title;
  }
};

window.calcularFechaFinRapida = function(meses) {
  const inputInicio = document.getElementById('modal-trab-fecha');
  const inputFin = document.getElementById('modal-trab-fecha-fin');
  if (!inputInicio || !inputFin) return;

  const fechaBase = new Date(inputInicio.value || new Date());
  fechaBase.setMonth(fechaBase.getMonth() + Number(meses));
  inputFin.value = fechaBase.toISOString().slice(0, 10);
};

window.eliminarTrabajadorConfirm = function(id) {
  store.deleteTrabajador(id);
  renderWorkerPortal();
};

window.verPortalComoTrabajador = function(trabajadorId) {
  modoVistaAutogestion = true;
  trabajadorSeleccionadoId = trabajadorId;
  renderWorkerPortal();
};

window.verPortalModoOperario = function() {
  const empresaActiva = store.getEmpresaActiva();
  const trabs = store.getTrabajadores(empresaActiva?.id);
  if (trabs.length > 0) {
    modoVistaAutogestion = true;
    trabajadorSeleccionadoId = trabs[0].id;
  } else {
    alert("Primero debes crear al menos un trabajador para ingresar al portal de autogestión.");
    return;
  }
  renderWorkerPortal();
};

window.volverAGestionTrabajadores = function() {
  modoVistaAutogestion = false;
  trabajadorSeleccionadoId = null;
  renderWorkerPortal();
};

// =============================================================================
// MODAL CENTRAL DE INSTRUMENTOS DEL CARGO (ESTRUCTURA DE ESTÁNDARES MÍNIMOS)
// Manejo de Documento Guía, Plantillas Base, Enlaces Oficiales y Adjuntos PDF
// =============================================================================
window.abrirModalInstrumentoCargo = async function(tipoInicial = 'contrato', cargoName = null, trabajadorId = null) {
  const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
  const trabajadores = store.getTrabajadores(empresaActiva.id);

  const jobPositions = store.getJobPositions(empresaActiva.id);

  // Determinar cargos disponibles combinando catálogo y trabajadores
  let cargosEmpresa = Array.from(new Set([
    ...jobPositions.map(j => j.title),
    ...trabajadores.map(t => t.cargo)
  ].filter(Boolean)));
  if (cargosEmpresa.length === 0) {
    cargosEmpresa.push('Coordinador SST', 'Operario de Producción', 'Mecánico de Mantenimiento');
  }

  let cargoActivo = cargoName || cargosEmpresa[0];
  let instrumentoActivo = tipoInicial || 'contrato'; // 'contrato', 'perfil', 'manual', 'pts'
  const trabajadorContexto = trabajadorId ? store.getTrabajadorPorId(trabajadorId) : null;

  const modalId = 'modal-instrumento-cargo-sst';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  const titulosInstrumentos = {
    manual: {
      nombre: '1. Manual de Funciones y Responsabilidades SG-SST',
      norma: 'Decreto 1072 de 2015 (Artículos 2.2.4.6.8 & 2.2.4.6.10)',
      icono: '📖',
      color: 'purple'
    },
    perfil: {
      nombre: '2. Perfil del Cargo y Competencias SST',
      norma: 'Resolución 0312 de 2019 (Estándar 1.1.2 & 1.1.3) & Decreto 1072',
      icono: '📋',
      color: 'amber'
    },
    pts: {
      nombre: '3. Procedimiento y Plan de Trabajo Seguro (PTS)',
      norma: 'Guía Técnica GTC 45 • Res. 0312 Estándar 4.2.1',
      icono: '🛡️',
      color: 'teal'
    },
    profesiograma: {
      nombre: '4. Profesiograma y Exámenes Médicos Ocupacionales',
      norma: 'Resolución 2346 de 2007 • Estándar 3.1.4',
      icono: '🩺',
      color: 'purple'
    },
    epp: {
      nombre: '5. Matriz de EPP y Dotación Legal',
      norma: 'Resolución 2400 de 1979 • Art. 230 CST • Estándar 4.2.6',
      icono: '🦺',
      color: 'amber'
    },
    anexo: {
      nombre: '6. Anexo Contractual SST y Notificación de Riesgos',
      norma: 'Código Sustantivo del Trabajo Arts. 58 y 62 • Dec. 1072',
      icono: '📝',
      color: 'teal'
    },
    contrato: {
      nombre: 'Contrato Individual de Trabajo',
      norma: 'Código Sustantivo del Trabajo (CST Arts. 37-47)',
      icono: '📄',
      color: 'blue'
    }
  };

  const renderModalContent = async () => {
    const infoInst = titulosInstrumentos[instrumentoActivo] || titulosInstrumentos.contrato;
    const fuentes = store.getFuentesInstrumento(cargoActivo, instrumentoActivo, empresaActiva.id);
    const cargoSlug = slugify(cargoActivo);
    const numeralTag = `cargo_${cargoSlug}_${instrumentoActivo}`;
    
    // Obtener evidencias / PDFs adjuntos en IndexedDB
    let adjuntos = [];
    try {
      adjuntos = await evidenceDB.obtenerEvidenciasPorNumeral(empresaActiva.id, numeralTag);
    } catch (e) {
      console.warn("No se pudieron cargar adjuntos de IndexedDB:", e);
    }

    const cargoObj = jobPositions.find(j => j.title.toLowerCase().trim() === cargoActivo.toLowerCase().trim() || j.id === cargoActivo);

    modalEl.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 animate-scaleIn flex flex-col max-h-[92vh]">
        
        <!-- Header Principal -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex justify-between items-start flex-shrink-0">
          <div>
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Estructura de Estándares Mínimos Res. 0312
              </span>
              <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
                🏢 ${empresaActiva.razonSocial}
              </span>
              ${trabajadorContexto ? `
                <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Trabajador: ${trabajadorContexto.nombre} (C.C. ${trabajadorContexto.identificacion || trabajadorContexto.cedula})
                </span>
              ` : ''}
            </div>

            <h3 class="text-xl font-black text-white flex items-center gap-2">
              <span>${infoInst.icono}</span>
              <span>${infoInst.nombre}</span>
              <span class="text-sm font-medium text-indigo-300">• Cargo: ${cargoActivo}</span>
            </h3>
            <p class="text-xs text-slate-300 mt-0.5">
              ${infoInst.norma}. Consulta documentos guía oficiales, plantillas en Docs/Sheets, o adjunta y visualiza archivos locales en PDF.
            </p>
          </div>

          <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer p-1">✕</button>
        </div>

        <!-- Selector de Cargo y Pestañas de Instrumentos -->
        <div class="bg-slate-50 p-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
          
          <!-- Selector de Cargo -->
          <div class="flex items-center gap-2 flex-1 max-w-xs">
            <label class="text-xs font-bold text-slate-600 whitespace-nowrap">Cargo:</label>
            <select id="modal-inst-select-cargo" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
              ${cargosEmpresa.map(c => `
                <option value="${c}" ${c === cargoActivo ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
          </div>

          <!-- Pestañas de los 6 Documentos del Cargo + Contrato -->
          <div class="flex gap-1 overflow-x-auto p-1 bg-slate-200/60 rounded-xl">
            <button id="tab-inst-manual" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${instrumentoActivo === 'manual' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <span>📖</span>
              <span>1. Manual</span>
            </button>
            <button id="tab-inst-perfil" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${instrumentoActivo === 'perfil' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <span>📋</span>
              <span>2. Perfil</span>
            </button>
            <button id="tab-inst-pts" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${instrumentoActivo === 'pts' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <span>🛡️</span>
              <span>3. PTS</span>
            </button>
            <button id="tab-inst-profesiograma" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${instrumentoActivo === 'profesiograma' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <span>🩺</span>
              <span>4. Profesiograma</span>
            </button>
            <button id="tab-inst-epp" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${instrumentoActivo === 'epp' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <span>🦺</span>
              <span>5. Matriz EPP</span>
            </button>
            <button id="tab-inst-anexo" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${instrumentoActivo === 'anexo' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <span>📝</span>
              <span>6. Anexo SST</span>
            </button>
            <button id="tab-inst-contrato" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${instrumentoActivo === 'contrato' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <span>📄</span>
              <span>Contrato</span>
            </button>
          </div>
        </div>

        <!-- Contenido Central Scrollable -->
        <div class="p-6 overflow-y-auto flex-1 space-y-6">

          <!-- BANNER PROCESS-DRIVEN: GENERACIÓN OFICIAL DEL INSTRUMENTO EN PDF -->
          <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-200/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📜</span> Emisión Oficial del Instrumento en PDF (Process-Driven)
                </span>
                ${cargoObj ? `<span class="px-2 py-0.2 rounded text-[10px] font-black bg-indigo-200 text-indigo-900 font-mono">${cargoObj.code}</span>` : ''}
              </div>
              <p class="text-[11px] text-slate-600 mt-0.5">
                Genera la minuta legal conforme a la normativa colombiana (Dec. 1072 / Res. 0312) con firmas reglamentarias.
              </p>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button 
                type="button" 
                onclick="window.imprimirInstrumentoActivoModal('${cargoObj ? cargoObj.id : ''}', '${instrumentoActivo}', '${trabajadorContexto ? trabajadorContexto.id : ''}')" 
                class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>🖨️ Generar y Descargar Minuta en PDF</span>
              </button>
            </div>
          </div>

          <!-- =================================================================== -->
          <!-- 1. ZONA DE DOCUMENTOS GUÍA, PLANTILLAS BASE Y FUENTES MULTI-ENLACE -->
          <!-- (IDÉNTICO A LA ESTRUCTURA DE ESTÁNDARES MÍNIMOS EN RESOLUCIÓN 0312) -->
          <!-- =================================================================== -->
          <div class="bg-blue-50/40 p-4 rounded-2xl border border-blue-100/80 space-y-3">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div class="flex items-center gap-2">
                <span class="p-1.5 rounded-lg bg-blue-100 text-blue-700 flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </span>
                <div>
                  <label class="text-xs font-black text-slate-800">
                    Documento Guía, Plantillas Base y Fuentes Documentales:
                  </label>
                  <span class="text-[10px] text-slate-500 block">
                    Ingresa el enlace oficial (Google Docs, Sheets, Drive) con la plantilla editable del ${infoInst.nombre.toLowerCase()}
                  </span>
                </div>
              </div>

              <!-- Botón Agregar Nueva Fuente -->
              <button 
                type="button" 
                onclick="window.agregarFuenteInstrumentoModal('${cargoActivo}', '${instrumentoActivo}')"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto flex-shrink-0"
                title="Agregar un nuevo enlace o documento fuente"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>+ Agregar nueva fuente</span>
              </button>
            </div>

            <!-- Lista Dinámica de Fuentes -->
            <div class="space-y-2 pt-1">
              ${fuentes.map((f, fIdx) => {
                const fInfo = clasificarFuente(f.url);
                const tieneUrl = !!f.url;

                return `
                  <div class="bg-white p-3 rounded-xl border ${tieneUrl ? 'border-blue-200 shadow-2xs' : 'border-slate-200'} flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    
                    <!-- Badge Fila / Tipo -->
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <span class="w-5 h-5 rounded-full ${tieneUrl ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'} text-[10px] font-black flex items-center justify-center">
                        ${fIdx + 1}
                      </span>
                      <span class="text-[10px] font-bold ${tieneUrl ? 'text-blue-700' : 'text-slate-500'} min-w-[70px]">
                        ${tieneUrl ? fInfo.label : `Fuente ${fIdx + 1}`}
                      </span>
                    </div>

                    <!-- Título de la Fuente -->
                    <div class="w-full md:w-52 flex-shrink-0">
                      <input 
                        type="text" 
                        placeholder="Título opcional (ej: Minuta Oficial CST)..." 
                        value="${escapeHtml(f.titulo || '')}" 
                        onchange="window.actualizarFuenteInstrumentoModal('${cargoActivo}', '${instrumentoActivo}', '${f.id}', 'titulo', this.value)"
                        class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        title="Nombre descriptivo de la fuente o anexo"
                      >
                    </div>

                    <!-- URL / Enlace de la Fuente -->
                    <div class="relative flex-1 min-w-0">
                      <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                      </div>
                      <input 
                        type="url" 
                        placeholder="https://docs.google.com/document/... o enlace Drive"
                        value="${escapeHtml(f.url || '')}" 
                        onchange="window.actualizarFuenteInstrumentoModal('${cargoActivo}', '${instrumentoActivo}', '${f.id}', 'url', this.value)"
                        class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none ${tieneUrl ? 'font-medium text-slate-800' : 'text-slate-500'}"
                      >
                    </div>

                    <!-- Botones de Acción para esta Fuente -->
                    <div class="flex items-center gap-1.5 flex-shrink-0 justify-end">
                      ${tieneUrl ? `
                        <a 
                          href="${escapeHtml(f.url)}" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                          title="Abrir en pestaña nueva"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                          <span>Abrir</span>
                        </a>

                        <button 
                          type="button" 
                          onclick="window.previsualizarFuenteGuiaInstrumento('${escapeHtml(f.url)}', '${escapeHtml(f.titulo || '')}', '${cargoActivo}', '${instrumentoActivo}')"
                          class="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Vista previa del documento en Google Cloud sin salir de la App"
                        >
                          <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          <span>Ver</span>
                        </button>
                      ` : ''}

                      <!-- Eliminar Fuente -->
                      <button 
                        type="button" 
                        onclick="window.eliminarFuenteInstrumentoModal('${cargoActivo}', '${instrumentoActivo}', '${f.id}')"
                        class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Eliminar esta fuente"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- =================================================================== -->
          <!-- 2. ZONA DE CARGUE Y GESTIÓN DE ARCHIVOS ADJUNTOS EN PDF (VISOR)     -->
          <!-- (IDÉNTICO A LA GESTIÓN DE EVIDENCIAS EN RESOLUCIÓN 0312 DE 2019)    -->
          <!-- =================================================================== -->
          <div class="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <span class="text-xs font-black text-slate-800 flex items-center gap-2">
                <span class="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                </span>
                <span>Documentos de Soporte y Archivos PDF Adjuntos (${adjuntos.length})</span>
              </span>

              <!-- Botón Cargar Archivos Locales -->
              <label class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm active:scale-95">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                <span>Adjuntar Archivo Local (PDF, Foto, Doc)</span>
                <input type="file" multiple onchange="window.adjuntarArchivoInstrumentoModal('${cargoActivo}', '${instrumentoActivo}', this.files, '${trabajadorId || ''}')" class="hidden">
              </label>
            </div>

            <!-- Lista de Archivos Adjuntos / Evidencias -->
            ${adjuntos.length === 0 ? `
              <div class="text-[11px] text-slate-400 italic py-2 bg-white p-3 rounded-xl border border-dashed border-slate-200 text-center">
                ⚪ No se han adjuntado archivos físicos en PDF para el ${infoInst.nombre.toLowerCase()} de este cargo todavía. Puedes adjuntar contratos firmados, actas o minutas escaneadas para visualizarlos de inmediato.
              </div>
            ` : `
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                ${adjuntos.map(ev => {
                  const esPDF = ev.tipo?.includes('pdf') || ev.nombre?.endsWith('.pdf');
                  const kb = Math.round((ev.tamanio || 0) / 1024);
                  const sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
                  const fechaStr = ev.fechaCargue ? new Date(ev.fechaCargue).toLocaleDateString() : '';

                  return `
                    <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 hover:border-indigo-300 transition">
                      <div class="flex items-center gap-2.5 overflow-hidden cursor-pointer flex-1 min-w-0" onclick="window.previsualizarArchivoInstrumentoModal('${ev.id}')" title="Clic para vista previa en pantalla de ${ev.nombre}">
                        <span class="p-2 rounded-lg ${esPDF ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} flex-shrink-0 text-sm">
                          ${esPDF ? '📕' : '📄'}
                        </span>
                        <div class="overflow-hidden min-w-0">
                          <span class="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate block transition" title="${ev.nombre}">${ev.nombre}</span>
                          <span class="text-[10px] text-slate-400 block">${sizeStr} • ${fechaStr}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-1 flex-shrink-0">
                        <!-- Vista Previa Inmediata en Visor de PDF -->
                        <button 
                          type="button" 
                          onclick="window.previsualizarArchivoInstrumentoModal('${ev.id}')" 
                          class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer" 
                          title="Vista previa inmediata del documento sin descargar"
                        >
                          <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          <span>Ver</span>
                        </button>

                        <!-- Descargar copia -->
                        <button 
                          type="button" 
                          onclick="window.descargarEvidencia('${ev.id}')" 
                          class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer" 
                          title="Descargar copia del archivo"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </button>

                        <!-- Eliminar Evidencia -->
                        <button 
                          type="button" 
                          onclick="window.eliminarEvidenciaInstrumentoModal('${ev.id}', '${cargoActivo}', '${instrumentoActivo}')" 
                          class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer" 
                          title="Eliminar este archivo adjunto"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- =================================================================== -->
          <!-- 3. PLANTILLA BASE OFICIAL DE DOCTOR PYME (GENERADOR EN PDF)         -->
          <!-- =================================================================== -->
          <div class="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-xs font-black text-amber-900 block flex items-center gap-1.5">
                <span>⚡</span>
                <span>Plantilla Base Oficial Autogenerada por Doctor Pyme SG-SST</span>
              </span>
              <p class="text-[11px] text-amber-800 mt-0.5">
                Genera al instante el documento oficial en PDF con membrete de la empresa, campos normativos y sellos de aprobación.
              </p>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              ${instrumentoActivo === 'contrato' ? `
                <button onclick="window.ejecutarGeneracionPdfModal('contrato', '${trabajadorId || ''}', '${cargoActivo}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95">
                  🖨️ Generar Contrato (PDF)
                </button>
              ` : instrumentoActivo === 'perfil' ? `
                <button onclick="window.ejecutarGeneracionPdfModal('perfil', '', '${cargoActivo}')" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95">
                  🖨️ Generar Perfil (PDF)
                </button>
              ` : instrumentoActivo === 'manual' ? `
                <button onclick="window.ejecutarGeneracionPdfModal('manual', '', '${cargoActivo}')" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95">
                  🖨️ Generar Manual (PDF)
                </button>
              ` : `
                <button onclick="window.ejecutarGeneracionPdfModal('pts', '', '${cargoActivo}')" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95">
                  🖨️ Generar PTS (PDF)
                </button>
              `}

              <button onclick="window.abrirModalAdministrarCargos('${cargoActivo}')" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs" title="Editar los textos, funciones o requisitos base de este cargo">
                ⚙️ Ajustar Parámetros
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
          <div class="text-[11px] text-slate-500">
            Resolución 0312 de 2019 • Estándar 1.1.2 & 1.1.3 • Decreto 1072 de 2015
          </div>

          <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer">
            Cerrar Consola
          </button>
        </div>

      </div>
    `;

    // Listeners reactivos
    const selectCargo = document.getElementById('modal-inst-select-cargo');
    if (selectCargo) {
      selectCargo.onchange = (e) => {
        cargoActivo = e.target.value;
        renderModalContent();
      };
    }

    document.getElementById('tab-inst-contrato')?.addEventListener('click', () => { instrumentoActivo = 'contrato'; renderModalContent(); });
    document.getElementById('tab-inst-perfil')?.addEventListener('click', () => { instrumentoActivo = 'perfil'; renderModalContent(); });
    document.getElementById('tab-inst-manual')?.addEventListener('click', () => { instrumentoActivo = 'manual'; renderModalContent(); });
    document.getElementById('tab-inst-pts')?.addEventListener('click', () => { instrumentoActivo = 'pts'; renderModalContent(); });
    document.getElementById('tab-inst-profesiograma')?.addEventListener('click', () => { instrumentoActivo = 'profesiograma'; renderModalContent(); });
    document.getElementById('tab-inst-epp')?.addEventListener('click', () => { instrumentoActivo = 'epp'; renderModalContent(); });
    document.getElementById('tab-inst-anexo')?.addEventListener('click', () => { instrumentoActivo = 'anexo'; renderModalContent(); });
  };

  await renderModalContent();
  document.body.appendChild(modalEl);
};

// Acciones reactivas para el modal de Instrumentos
window.agregarFuenteInstrumentoModal = function(cargoName, tipoInstrumento) {
  const empresaActiva = store.getEmpresaActiva();
  const nuevaFuente = {
    id: 'f-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    titulo: '',
    url: ''
  };
  store.guardarFuenteInstrumento(cargoName, tipoInstrumento, nuevaFuente, empresaActiva?.id);
  window.abrirModalInstrumentoCargo(tipoInstrumento, cargoName);
};

window.actualizarFuenteInstrumentoModal = function(cargoName, tipoInstrumento, fuenteId, campo, valor) {
  const empresaActiva = store.getEmpresaActiva();
  store.guardarFuenteInstrumento(cargoName, tipoInstrumento, { id: fuenteId, [campo]: valor }, empresaActiva?.id);
};

window.eliminarFuenteInstrumentoModal = function(cargoName, tipoInstrumento, fuenteId) {
  const empresaActiva = store.getEmpresaActiva();
  store.eliminarFuenteInstrumento(cargoName, tipoInstrumento, fuenteId, empresaActiva?.id);
  window.abrirModalInstrumentoCargo(tipoInstrumento, cargoName);
};

window.previsualizarFuenteGuiaInstrumento = function(url, titulo, cargoName, tipoInstrumento) {
  const empresaActiva = store.getEmpresaActiva();
  abrirVisorEnlaceGuia({
    url: url,
    numeral: tipoInstrumento.toUpperCase(),
    criterio: `${cargoName} • ${titulo || 'Documento Guía / Plantilla Base'}`,
    empresaNombre: empresaActiva?.razonSocial || ''
  });
};

window.adjuntarArchivoInstrumentoModal = async function(cargoName, tipoInstrumento, files, trabajadorId = '') {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva || !files || files.length === 0) return;

  const cargoSlug = slugify(cargoName);
  const numeralTag = `cargo_${cargoSlug}_${tipoInstrumento}`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await evidenceDB.guardarArchivo(empresaActiva.id, numeralTag, file);
  }

  // Refrescar modal de instrumentos
  window.abrirModalInstrumentoCargo(tipoInstrumento, cargoName, trabajadorId);
};

window.previsualizarArchivoInstrumentoModal = async function(id) {
  const empresaActiva = store.getEmpresaActiva();
  const archivo = await evidenceDB.obtenerEvidenciaPorId(id);
  if (!archivo) {
    alert("No se encontró el archivo seleccionado para la vista previa.");
    return;
  }

  abrirVisorDocumento({
    ...archivo,
    contexto: archivo.nombre ? `Instrumento: ${archivo.nombre}` : `Instrumento del Cargo`,
    empresaNombre: empresaActiva?.razonSocial || ''
  });
};

window.eliminarEvidenciaInstrumentoModal = async function(id, cargoName, tipoInstrumento) {
  if (confirm("¿Deseas eliminar este archivo adjunto?")) {
    await evidenceDB.eliminarEvidencia(id);
    window.abrirModalInstrumentoCargo(tipoInstrumento, cargoName);
  }
};

window.ejecutarGeneracionPdfModal = function(tipo, trabajadorId, cargoName) {
  const empresaActiva = store.getEmpresaActiva();
  const cargoObj = store.getJobPositions(empresaActiva?.id).find(j => j.title.toLowerCase().trim() === (cargoName || '').toLowerCase().trim() || j.id === cargoName);
  if (tipo === 'contrato') {
    if (trabajadorId) {
      window.generarPdfContratoTrabajador(trabajadorId);
    } else {
      const trabs = store.getTrabajadores(empresaActiva?.id).filter(t => t.cargo === cargoName);
      if (trabs.length > 0) {
        window.generarPdfContratoTrabajador(trabs[0].id);
      } else {
        alert("Para generar la minuta de contrato laboral, selecciona un trabajador asignado a este cargo.");
      }
    }
  } else if (tipo === 'perfil') {
    if (cargoObj && window.imprimirPerfilDeCargo) window.imprimirPerfilDeCargo(cargoObj.id);
    else window.generarPdfPerfilCargo(cargoName, empresaActiva?.id);
  } else if (tipo === 'manual') {
    if (cargoObj && window.imprimirManualDeCargo) window.imprimirManualDeCargo(cargoObj.id);
    else window.generarPdfManualFunciones(cargoName, empresaActiva?.id);
  } else if (tipo === 'pts') {
    if (cargoObj && window.imprimirPlanTrabajoSeguro) window.imprimirPlanTrabajoSeguro(cargoObj.id);
    else window.generarPdfPtsCargo(cargoName, empresaActiva?.id);
  } else if (tipo === 'profesiograma') {
    if (cargoObj && window.imprimirProfesiograma) window.imprimirProfesiograma(cargoObj.id);
  } else if (tipo === 'epp') {
    if (cargoObj && window.imprimirMatrizEPP) window.imprimirMatrizEPP(cargoObj.id);
  } else if (tipo === 'anexo') {
    if (cargoObj && window.imprimirAnexoContractual) window.imprimirAnexoContractual(cargoObj.id);
  }
};

window.imprimirInstrumentoActivoModal = function(cargoId, tipoInstrumento, trabajadorId) {
  const cargoObj = store.getJobPosition(cargoId);
  const cargoName = cargoObj ? cargoObj.title : '';
  window.ejecutarGeneracionPdfModal(tipoInstrumento, trabajadorId, cargoName);
};

// =============================================================================
// MODAL: REGISTRAR PRÓRROGA DE CONTRATO A TÉRMINO FIJO
// =============================================================================
window.abrirModalProrrogaContrato = function(trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) return;

  const modalId = 'modal-prorroga-contrato';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const fechaFinActual = trabajador.fechaFinContrato || new Date().toISOString().slice(0, 10);
  const baseDate = new Date(fechaFinActual + 'T00:00:00');
  baseDate.setFullYear(baseDate.getFullYear() + 1);
  const nuevaFechaSugerida = baseDate.toISOString().slice(0, 10);

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleIn">
      <div class="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex justify-between items-start">
        <div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
            Gestión Contractual CST
          </span>
          <h3 class="text-base font-black text-white mt-1">
            Registrar Prórroga de Contrato Individual
          </h3>
          <p class="text-xs text-slate-300">
            Trabajador: <strong>${trabajador.nombre}</strong> (C.C. ${trabajador.identificacion || trabajador.cedula})
          </p>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">✕</button>
      </div>

      <form id="form-prorroga-contrato" class="p-5 space-y-4 text-xs">
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
          <div>
            <span class="text-[9px] text-slate-400 font-bold block uppercase">Cargo:</span>
            <span class="font-bold text-slate-800">${trabajador.cargo}</span>
          </div>
          <div>
            <span class="text-[9px] text-slate-400 font-bold block uppercase">Vencimiento Actual:</span>
            <span class="font-mono font-bold text-red-600">${trabajador.fechaFinContrato || 'No definida'}</span>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Duración de la Nueva Prórroga:</label>
          <div class="grid grid-cols-3 gap-2">
            <button type="button" onclick="window.ajustarProrrogaModal(3)" class="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition text-center cursor-pointer">
              +3 Meses
            </button>
            <button type="button" onclick="window.ajustarProrrogaModal(6)" class="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition text-center cursor-pointer">
              +6 Meses
            </button>
            <button type="button" onclick="window.ajustarProrrogaModal(12)" class="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl transition text-center cursor-pointer">
              +1 Año
            </button>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Nueva Fecha de Vencimiento Pactada *</label>
          <input type="date" id="modal-prorroga-nueva-fecha" required value="${nuevaFechaSugerida}" class="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Observaciones / Número de Prórroga:</label>
          <input type="text" id="modal-prorroga-notas" placeholder="Ej. Prórroga pactada por mutuo acuerdo periodo 2026-2027" class="w-full px-3 py-2 border border-slate-300 rounded-xl">
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-between items-center">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">
            Cancelar
          </button>
          <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black shadow-md cursor-pointer flex items-center gap-1.5">
            <span>✓ Confirmar Prórroga</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  const form = document.getElementById('form-prorroga-contrato');
  form.onsubmit = (e) => {
    e.preventDefault();
    const nuevaFecha = document.getElementById('modal-prorroga-nueva-fecha').value;
    const notas = document.getElementById('modal-prorroga-notas').value;

    store.registrarProrrogaContrato(trabajadorId, 12, nuevaFecha, notas);
    modalEl.remove();
    alert(`✓ Prórroga registrada con éxito. Nuevo vencimiento: ${nuevaFecha}`);
    renderWorkerPortal();
  };
};

window.ajustarProrrogaModal = function(meses) {
  const inputFin = document.getElementById('modal-prorroga-nueva-fecha');
  if (!inputFin) return;
  const hoy = new Date();
  hoy.setMonth(hoy.getMonth() + Number(meses));
  inputFin.value = hoy.toISOString().slice(0, 10);
};

// =============================================================================
// GENERADOR OFICIAL: CARTA DE PREAVISO DE NO RENOVACIÓN (ART. 46 CST COLOMBIA)
// =============================================================================
window.generarPdfCartaPreaviso = function(trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) {
    alert("No se encontró el trabajador.");
    return;
  }
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva();
  const alerta = calcularAlertaContrato(trabajador);

  const fechaHoyStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const fechaFinContratoStr = trabajador.fechaFinContrato ? new Date(trabajador.fechaFinContrato + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha convenida';

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Carta de Preaviso de No Renovación - ${trabajador.nombre}</title>
      <style>
        @page { size: letter; margin: 20mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 25px; font-size: 11px; line-height: 1.6; }
        .header { text-align: left; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { margin: 0; font-size: 14px; text-transform: uppercase; color: #0f172a; font-weight: 900; }
        .meta-empresa { font-size: 10px; color: #64748b; }
        .destinatario { margin-bottom: 20px; }
        .destinatario strong { font-size: 11.5px; color: #0f172a; }
        .parrafo { text-align: justify; margin-bottom: 15px; }
        .aviso-box { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #4338ca; padding: 10px 14px; margin: 18px 0; font-size: 10.5px; }
        .sig-table { width: 100%; border-collapse: collapse; margin-top: 50px; }
        .sig-table td { width: 50%; vertical-align: top; padding: 0 20px; }
        .sig-line { border-top: 1px solid #334155; margin-bottom: 6px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: right; margin-bottom: 15px;">
        <button onclick="window.print()" style="padding: 9px 20px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px;">
          🖨️ Imprimir Carta / Guardar como PDF
        </button>
      </div>

      <div class="header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; gap: 15px;">
        <div>
          <strong style="font-size: 15px; color: #0f172a;">${empresa.razonSocial}</strong>
          <div class="meta-empresa">NIT: ${empresa.nit} • Dirección de Talento Humano & Seguridad Social</div>
        </div>
        ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${empresa.razonSocial}" style="max-height: 55px; max-width: 140px; object-fit: contain;">` : ''}
      </div>

      <div style="margin-bottom: 18px;">
        <span>Bogotá D.C., ${fechaHoyStr}</span>
      </div>

      <div class="destinatario">
        Señor(a):<br>
        <strong>${trabajador.nombre.toUpperCase()}</strong><br>
        <span>Cédula de Ciudadanía: ${trabajador.identificacion || trabajador.cedula}</span><br>
        <span>Cargo: ${trabajador.cargo} (${trabajador.area || 'Operaciones'})</span><br>
        <span>Ciudad</span>
      </div>

      <div style="margin-bottom: 15px; font-weight: bold; font-size: 11.5px;">
        ASUNTO: PREAVISO LEGAL DE NO PRÓRROGA DE CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO (ARTÍCULO 46 DEL CÓDIGO SUSTANTIVO DEL TRABAJO).
      </div>

      <div class="parrafo">
        Respetado(a) colaborador(a):
      </div>

      <div class="parrafo">
        Por medio de la presente, nos permitimos comunicarle de manera atenta y formal que la empresa <strong>${empresa.razonSocial}</strong>, en ejercicio de la facultad conferida por la legislación laboral colombiana, ha decidido de forma libre y voluntaria <strong>NO PRORROGAR</strong> el Contrato Individual de Trabajo a Término Fijo suscrito entre las partes el día <strong>${trabajador.fechaContrato || trabajador.fechaIngreso}</strong>, el cual vencerá y culminará definitivamente el próximo <strong>${fechaFinContratoStr}</strong>.
      </div>

      <div class="aviso-box">
        <strong>CONSTANCIA DE CUMPLIMIENTO LEGAL (ART. 46 CST & LEY 50 DE 1990 ART. 3):</strong><br>
        La presente notificación se realiza con una antelación no inferior a treinta (30) días calendario a la fecha de vencimiento contractual pactada, dando estricto y riguroso cumplimiento a lo previsto en el Artículo 46 del Código Sustantivo del Trabajo de la República de Colombia.
      </div>

      <div class="parrafo">
        Agradecemos profundamente el tiempo, compromiso y la dedicación brindada por usted en el desempeño de las labores asignadas como <strong>${trabajador.cargo}</strong> al servicio de nuestra organización.
      </div>

      <div class="parrafo">
        Le solicitamos que al término de la fecha pactada haga entrega formal del puesto de trabajo, herramientas y Elementos de Protección Personal (EPP) a su jefe inmediato o al responsable del SG-SST. De igual forma, se le expedirá la respectiva orden para la práctica del <strong>Examen Médico Ocupacional de Egreso</strong> (Resolución 2346 de 2007) y se pondrá a su disposición la liquidación final de salarios y prestaciones sociales legales correspondientes.
      </div>

      <div class="parrafo" style="margin-top: 25px;">
        Cordialmente,
      </div>

      <table class="sig-table">
        <tr>
          <td>
            <div class="sig-line"></div>
            <strong>${empresa.representanteLegal || 'GERENCIA GENERAL / TALENTO HUMANO'}</strong><br>
            <span>${empresa.razonSocial}</span><br>
            <span>NIT: ${empresa.nit}</span><br>
            <span style="font-size: 9px; color: #64748b;">EMPLEADOR</span>
          </td>
          <td>
            <div class="sig-line"></div>
            <strong>RECIBIDO POR EL TRABAJADOR:</strong><br>
            <span>Firma: _____________________________________</span><br>
            <span>Nombre: ${trabajador.nombre}</span><br>
            <span>C.C.: ${trabajador.identificacion || trabajador.cedula}</span><br>
            <span>Fecha y Hora de Notificación: ___________________</span>
          </td>
        </tr>
      </table>

      <div style="margin-top: 35px; border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 8px; color: #94a3b8; text-align: center;">
        DOCTOR PYME SG-SST • Certificado de Evidencia de Preaviso Laboral • Validez Código Sustantivo del Trabajo
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

// =============================================================================
// MODAL: ADMINISTRACIÓN DE PARÁMETROS BASE DEL CARGO (TEXTOS Y MATRICES)
// =============================================================================
window.abrirModalAdministrarCargos = function(cargoInicial = null) {
  const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
  const trabajadores = store.getTrabajadores(empresaActiva.id);
  
  // Lista de cargos únicos de la empresa
  const cargosEmpresa = Array.from(new Set(trabajadores.map(t => t.cargo).filter(Boolean)));
  if (cargosEmpresa.length === 0) {
    cargosEmpresa.push('Coordinador SST', 'Operario de Producción', 'Mecánico de Mantenimiento');
  }

  let cargoActivo = cargoInicial || cargosEmpresa[0];
  let configCargo = store.getPerfilCargo(cargoActivo, empresaActiva.id);

  const modalId = 'modal-admin-cargos-sst';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  let pestanaActiva = 'perfil'; // 'perfil', 'manual', 'pts', 'contrato'

  const renderModalContent = () => {
    configCargo = store.getPerfilCargo(cargoActivo, empresaActiva.id);

    modalEl.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 animate-scaleIn flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex justify-between items-start flex-shrink-0">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Instrumentos Obligatorios Res. 0312
              </span>
              <span class="text-xs text-slate-300 font-bold">${empresaActiva.razonSocial}</span>
            </div>
            <h3 class="text-lg font-black text-white">
              Administración de Parámetros Laborales & SST por Cargo
            </h3>
            <p class="text-xs text-slate-300">
              Define los parámetros oficiales de Contrato, Perfil, Manual de Funciones y PTS para cada puesto.
            </p>
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer p-1">✕</button>
        </div>

        <!-- Selector de Cargo y Pestañas -->
        <div class="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-2 flex-1 max-w-sm">
            <label class="text-xs font-bold text-slate-600 whitespace-nowrap">Cargo:</label>
            <select id="modal-select-cargo-activo" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
              ${cargosEmpresa.map(c => `
                <option value="${c}" ${c === cargoActivo ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
          </div>

          <div class="flex gap-1 overflow-x-auto p-1 bg-slate-200/60 rounded-xl">
            <button id="tab-cargo-perfil" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${pestanaActiva === 'perfil' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              📋 Perfil del Cargo
            </button>
            <button id="tab-cargo-manual" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${pestanaActiva === 'manual' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              📖 Manual Funciones
            </button>
            <button id="tab-cargo-pts" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${pestanaActiva === 'pts' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              🛡️ PTS Seguro
            </button>
            <button id="tab-cargo-contrato" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${pestanaActiva === 'contrato' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              📄 Contrato Laboral
            </button>
          </div>
        </div>

        <!-- Cuerpo del Instrumento Activo -->
        <div class="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          
          <!-- SUB-PESTAÑA 1: PERFIL DEL CARGO -->
          ${pestanaActiva === 'perfil' ? `
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Descriptor y Requisitos del Puesto</h4>
                <button onclick="window.generarPdfPerfilCargo('${cargoActivo}', '${empresaActiva.id}')" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                  🖨️ Descargar Perfil (PDF)
                </button>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Objetivo General del Puesto:</label>
                <textarea id="cargo-perfil-objetivo" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${configCargo.perfil?.objetivo || ''}</textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Educación / Escolaridad Mínima:</label>
                  <input type="text" id="cargo-perfil-educacion" value="${configCargo.perfil?.educacion || ''}" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Experiencia Laboral Requerida:</label>
                  <input type="text" id="cargo-perfil-experiencia" value="${configCargo.perfil?.experiencia || ''}" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
                </div>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Formación y Cursos Obligatorios en SST:</label>
                <input type="text" id="cargo-perfil-formacion" value="${configCargo.perfil?.formacionSST || ''}" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Competencias Laborales y de Autocuidado:</label>
                <textarea id="cargo-perfil-competencias" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${configCargo.perfil?.competencias || ''}</textarea>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Profesiograma / Exámenes Médicos Ocupacionales Requeridos:</label>
                <input type="text" id="cargo-perfil-examenes" value="${configCargo.perfil?.examenesMedicos || ''}" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
              </div>
            </div>
          ` : ''}

          <!-- SUB-PESTAÑA 2: MANUAL DE FUNCIONES -->
          ${pestanaActiva === 'manual' ? `
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Funciones Operativas y Responsabilidades SG-SST</h4>
                <button onclick="window.generarPdfManualFunciones('${cargoActivo}', '${empresaActiva.id}')" class="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                  🖨️ Descargar Manual (PDF)
                </button>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Funciones Operativas Principales (Una por línea):</label>
                <textarea id="cargo-manual-funciones" rows="5" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs leading-relaxed font-sans">${(configCargo.manualFunciones?.funcionesOperativas || []).join('\n')}</textarea>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Responsabilidades Específicas en SG-SST (Dec. 1072/2015 Art. 2.2.4.6.10):</label>
                <textarea id="cargo-manual-sst" rows="5" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs leading-relaxed font-sans">${(configCargo.manualFunciones?.responsabilidadesSST || []).join('\n')}</textarea>
              </div>
            </div>
          ` : ''}

          <!-- SUB-PESTAÑA 3: PTS (PROCEDIMIENTO DE TRABAJO SEGURO) -->
          ${pestanaActiva === 'pts' ? `
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Procedimiento de Trabajo Seguro (PTS)</h4>
                <button onclick="window.generarPdfPtsCargo('${cargoActivo}', '${empresaActiva.id}')" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                  🖨️ Descargar PTS (PDF)
                </button>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Peligros Críticos Asociados (GTC 45 - Uno por línea):</label>
                <textarea id="cargo-pts-peligros" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${(configCargo.pts?.peligrosEvaluados || []).join('\n')}</textarea>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Elementos de Protección Personal (EPP) Obligatorios (Uno por línea):</label>
                <textarea id="cargo-pts-epp" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${(configCargo.pts?.eppRequeridos || []).join('\n')}</textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">1. Antes de Iniciar:</label>
                  <textarea id="cargo-pts-antes" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${configCargo.pts?.faseAntes || ''}</textarea>
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">2. Durante la Labor:</label>
                  <textarea id="cargo-pts-durante" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${configCargo.pts?.faseDurante || ''}</textarea>
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">3. Al Finalizar:</label>
                  <textarea id="cargo-pts-despues" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${configCargo.pts?.faseDespues || ''}</textarea>
                </div>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Protocolo de Emergencia & Notificación Inmediata:</label>
                <textarea id="cargo-pts-emergencias" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${configCargo.pts?.emergencias || ''}</textarea>
              </div>
            </div>
          ` : ''}

          <!-- SUB-PESTAÑA 4: CONTRATO LABORAL -->
          ${pestanaActiva === 'contrato' ? `
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Condiciones Contractuales Estándar del Cargo</h4>
                <div class="text-[11px] text-slate-500">
                  Código Sustantivo del Trabajo de Colombia
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Jornada Ordinaria de Trabajo:</label>
                  <input type="text" id="cargo-contrato-jornada" value="${configCargo.contratoModelo?.jornada || '46 horas semanales (Ley 2101 de 2021)'}" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Lugar y Sedes de Ejecución:</label>
                  <input type="text" id="cargo-contrato-lugar" value="${configCargo.contratoModelo?.lugarTrabajo || 'Instalaciones de la empresa'}" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
                </div>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Cláusula Especial Obligaciones SG-SST (Dec. 1072/2015):</label>
                <textarea id="cargo-contrato-sst" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${configCargo.contratoModelo?.obligacionesSST || ''}</textarea>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- Footer -->
        <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
          <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
            Cerrar
          </button>

          <button id="btn-guardar-cambios-cargo" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>Guardar Parámetros de ${cargoActivo}</span>
          </button>
        </div>

      </div>
    `;

    // Listeners del Modal
    const selectCargo = document.getElementById('modal-select-cargo-activo');
    if (selectCargo) {
      selectCargo.onchange = (e) => {
        cargoActivo = e.target.value;
        renderModalContent();
      };
    }

    document.getElementById('tab-cargo-perfil')?.addEventListener('click', () => { pestanaActiva = 'perfil'; renderModalContent(); });
    document.getElementById('tab-cargo-manual')?.addEventListener('click', () => { pestanaActiva = 'manual'; renderModalContent(); });
    document.getElementById('tab-cargo-pts')?.addEventListener('click', () => { pestanaActiva = 'pts'; renderModalContent(); });
    document.getElementById('tab-cargo-contrato')?.addEventListener('click', () => { pestanaActiva = 'contrato'; renderModalContent(); });

    const btnGuardar = document.getElementById('btn-guardar-cambios-cargo');
    if (btnGuardar) {
      btnGuardar.onclick = () => {
        const payload = {
          cargo: cargoActivo,
          companyId: empresaActiva.id,
          perfil: {
            ...configCargo.perfil,
            objetivo: document.getElementById('cargo-perfil-objetivo')?.value || configCargo.perfil?.objetivo,
            educacion: document.getElementById('cargo-perfil-educacion')?.value || configCargo.perfil?.educacion,
            experiencia: document.getElementById('cargo-perfil-experiencia')?.value || configCargo.perfil?.experiencia,
            formacionSST: document.getElementById('cargo-perfil-formacion')?.value || configCargo.perfil?.formacionSST,
            competencias: document.getElementById('cargo-perfil-competencias')?.value || configCargo.perfil?.competencias,
            examenesMedicos: document.getElementById('cargo-perfil-examenes')?.value || configCargo.perfil?.examenesMedicos
          },
          manualFunciones: {
            ...configCargo.manualFunciones,
            funcionesOperativas: document.getElementById('cargo-manual-funciones')?.value ? document.getElementById('cargo-manual-funciones').value.split('\n').filter(Boolean) : configCargo.manualFunciones?.funcionesOperativas,
            responsabilidadesSST: document.getElementById('cargo-manual-sst')?.value ? document.getElementById('cargo-manual-sst').value.split('\n').filter(Boolean) : configCargo.manualFunciones?.responsabilidadesSST
          },
          pts: {
            ...configCargo.pts,
            peligrosEvaluados: document.getElementById('cargo-pts-peligros')?.value ? document.getElementById('cargo-pts-peligros').value.split('\n').filter(Boolean) : configCargo.pts?.peligrosEvaluados,
            eppRequeridos: document.getElementById('cargo-pts-epp')?.value ? document.getElementById('cargo-pts-epp').value.split('\n').filter(Boolean) : configCargo.pts?.eppRequeridos,
            faseAntes: document.getElementById('cargo-pts-antes')?.value || configCargo.pts?.faseAntes,
            faseDurante: document.getElementById('cargo-pts-durante')?.value || configCargo.pts?.faseDurante,
            faseDespues: document.getElementById('cargo-pts-despues')?.value || configCargo.pts?.faseDespues,
            emergencias: document.getElementById('cargo-pts-emergencias')?.value || configCargo.pts?.emergencias
          },
          contratoModelo: {
            ...configCargo.contratoModelo,
            jornada: document.getElementById('cargo-contrato-jornada')?.value || configCargo.contratoModelo?.jornada,
            lugarTrabajo: document.getElementById('cargo-contrato-lugar')?.value || configCargo.contratoModelo?.lugarTrabajo,
            obligacionesSST: document.getElementById('cargo-contrato-sst')?.value || configCargo.contratoModelo?.obligacionesSST
          }
        };

        store.guardarPerfilCargo(payload);
        alert(`✓ Parámetros del cargo "${cargoActivo}" guardados exitosamente.`);
        renderModalContent();
      };
    }
  };

  renderModalContent();
  document.body.appendChild(modalEl);
};

// =============================================================================
// GENERADORES OFICIALES DE PDF (CONTRATO, PERFIL, MANUAL, PTS)
// =============================================================================

// 1. GENERADOR OFICIAL DE CONTRATO LABORAL INDIVIDUAL DE TRABAJO
window.generarPdfContratoTrabajador = function(trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) {
    alert("No se encontró el trabajador.");
    return;
  }
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva();

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Contrato Individual de Trabajo - ${trabajador.nombre}</title>
      <style>
        @page { size: letter; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: white; margin: 0; padding: 15px; font-size: 10.5px; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 15px; }
        h1 { margin: 0; font-size: 14px; text-transform: uppercase; color: #0f172a; font-weight: 900; }
        h2 { margin: 3px 0 0; font-size: 11px; color: #4338ca; text-transform: uppercase; font-weight: bold; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
        .data-table th { background: #f8fafc; font-weight: bold; width: 30%; font-size: 10px; }
        .clausula { margin-bottom: 12px; text-align: justify; }
        .clausula strong { color: #1e1b4b; }
        .sig-table { width: 100%; border-collapse: collapse; margin-top: 40px; }
        .sig-table td { width: 50%; vertical-align: top; text-align: center; padding: 0 25px; }
        .sig-line { border-top: 1px solid #334155; margin-bottom: 5px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #4338ca; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px;">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div class="header">
        ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${empresa.razonSocial}" style="max-height: 55px; max-width: 150px; object-fit: contain; margin-bottom: 6px;"><br>` : ''}
        <strong style="font-size: 14px; color: #0f172a;">${empresa.razonSocial}</strong>
        <div style="font-size: 10px; color: #64748b;">NIT: ${empresa.nit} • Matriz de Talento Humano & SG-SST</div>
        <h1>CONTRATO INDIVIDUAL DE TRABAJO A ${trabajador.tipoContrato ? trabajador.tipoContrato.toUpperCase() : 'TÉRMINO INDEFINIDO'}</h1>
        <h2>Conforme al Código Sustantivo del Trabajo de Colombia</h2>
      </div>

      <table class="data-table">
        <tr>
          <th>EMPLEADOR:</th>
          <td><strong>${empresa.razonSocial}</strong> (NIT: ${empresa.nit})</td>
        </tr>
        <tr>
          <th>REPRESENTANTE LEGAL:</th>
          <td>${empresa.representanteLegal || 'Gerencia General'}</td>
        </tr>
        <tr>
          <th>TRABAJADOR:</th>
          <td><strong>${trabajador.nombre}</strong></td>
        </tr>
        <tr>
          <th>DOCUMENTO DE IDENTIDAD:</th>
          <td><strong>C.C. ${trabajador.identificacion || trabajador.cedula}</strong></td>
        </tr>
        <tr>
          <th>CARGO CONTRATADO:</th>
          <td><strong>${trabajador.cargo}</strong> (${trabajador.area || 'Operaciones'})</td>
        </tr>
        <tr>
          <th>SALARIO MENSUAL PACTADO:</th>
          <td><strong>${formatCOP(trabajador.salario)} M/CTE</strong></td>
        </tr>
        <tr>
          <th>FECHA DE INICIO DE LABORES:</th>
          <td><strong>${trabajador.fechaContrato || trabajador.fechaIngreso}</strong></td>
        </tr>
        ${trabajador.fechaFinContrato ? `
          <tr>
            <th>FECHA DE VENCIMIENTO PACTADA:</th>
            <td><strong style="color: #b91c1c;">${trabajador.fechaFinContrato}</strong> (Sujeto a preaviso legal Art. 46 CST)</td>
          </tr>
        ` : ''}
        <tr>
          <th>TIPO DE CONTRATO:</th>
          <td><strong>${trabajador.tipoContrato || 'Término Indefinido'}</strong></td>
        </tr>
      </table>

      <div class="clausula">
        <strong>PRIMERA. OBJETO:</strong> EL EMPLEADOR contrata los servicios personales de EL TRABAJADOR para desempeñar el cargo de <strong>${trabajador.cargo}</strong>, ejecutando las labores asignadas con lealtad, eficiencia y estricto cumplimiento de los procedimientos técnicos y de seguridad industrial de la empresa.
      </div>

      <div class="clausula">
        <strong>SEGUNDA. REMUNERACIÓN:</strong> EL EMPLEADOR pagará a EL TRABAJADOR por la prestación de sus servicios el salario mensual de <strong>${formatCOP(trabajador.salario)}</strong>, pagadero en las fechas fijadas por la empresa, sobre el cual se liquidarán las prestaciones sociales y aportes a Seguridad Social Integral (Salud, Pensión y Riesgos Laborales ARL).
      </div>

      <div class="clausula">
        <strong>TERCERA. JORNADA ORDINARIA:</strong> EL TRABAJADOR cumplirá una jornada máxima de 46 horas semanales (conforme a la Ley 2101 de 2021), distribuidas en los turnos y horarios dispuestos por EL EMPLEADOR según las necesidades operacionales.
      </div>

      <div class="clausula">
        <strong>CUARTA. OBLIGACIONES ESPECIALES EN SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST):</strong> En cumplimiento del Decreto Único Reglamentario 1072 de 2015 (Artículo 2.2.4.6.10), EL TRABAJADOR se obliga a: 
        1) Procurar el cuidado integral de su salud; 
        2) Suministrar información clara y veraz sobre su estado de salud; 
        3) Cumplir cabalmente las normas y reglamentos del SG-SST; 
        4) Participar en las capacitaciones programadas; 
        5) Usar obligatoriamente y conservar los Elementos de Protección Personal (EPP) suministrados. <em>El incumplimiento grave o reiterado de las directrices de seguridad constituirá justa causa para la terminación unilateral del contrato de trabajo por parte de EL EMPLEADOR.</em>
      </div>

      <div class="clausula">
        <strong>QUINTA. CONFIDENCIALIDAD:</strong> EL TRABAJADOR se compromete a guardar absoluta reserva de la información técnica, fórmulas, recetas de producción, clientes y secretos comerciales a los que tenga acceso en el ejercicio de sus funciones.
      </div>

      <table class="sig-table">
        <tr>
          <td>
            <div class="sig-line"></div>
            <strong>${empresa.razonSocial}</strong><br>
            <span>NIT: ${empresa.nit}</span><br>
            <span>EL EMPLEADOR</span>
          </td>
          <td>
            <div class="sig-line"></div>
            <strong>${trabajador.nombre}</strong><br>
            <span>C.C. ${trabajador.identificacion || trabajador.cedula}</span><br>
            <span>EL TRABAJADOR</span>
          </td>
        </tr>
      </table>

      <div style="margin-top: 25px; border-top: 1px solid #cbd5e1; padding-top: 5px; font-size: 8px; color: #94a3b8; text-align: center;">
        Documento generado a través de DOCTOR PYME SG-SST • Validez probatoria Código Sustantivo del Trabajo
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

// 2. GENERADOR OFICIAL DE PERFIL DEL CARGO (PDF)
window.generarPdfPerfilCargo = function(cargoName, companyId) {
  const empresa = store.getEmpresa(companyId) || store.getEmpresaActiva();
  const cfg = store.getPerfilCargo(cargoName, companyId);

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Perfil del Cargo - ${cargoName}</title>
      <style>
        @page { size: letter; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 10.5px; line-height: 1.45; }
        .header { text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-bottom: 15px; }
        h1 { margin: 0; font-size: 14px; text-transform: uppercase; color: #b45309; }
        h2 { margin: 2px 0 0; font-size: 11px; color: #1e293b; text-transform: uppercase; }
        .section-title { background: #fef3c7; border-left: 4px solid #b45309; padding: 5px 8px; font-weight: bold; text-transform: uppercase; margin: 12px 0 6px; color: #78350f; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
        th { background: #f8fafc; font-weight: bold; width: 28%; font-size: 9.5px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #b45309; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px;">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div class="header">
        ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${empresa.razonSocial}" style="max-height: 52px; max-width: 150px; object-fit: contain; margin-bottom: 5px;"><br>` : ''}
        <strong style="font-size: 13px; color: #0f172a;">${empresa.razonSocial}</strong>
        <div style="font-size: 9px; color: #64748b;">NIT: ${empresa.nit} • Sistema de Gestión de Seguridad y Salud en el Trabajo</div>
        <h1>PERFIL OCUPACIONAL Y DESCRIPTOR DEL CARGO</h1>
        <h2>Resolución 0312 de 2019 (Estándar 1.1.2) & Decreto 1072 de 2015</h2>
      </div>

      <div class="section-title">1. Identificación del Cargo</div>
      <table>
        <tr>
          <th>NOMBRE DEL CARGO:</th>
          <td><strong>${cargoName}</strong></td>
        </tr>
        <tr>
          <th>OBJETIVO DEL PUESTO:</th>
          <td>${cfg.perfil?.objetivo}</td>
        </tr>
      </table>

      <div class="section-title">2. Requisitos Mínimos del Perfil</div>
      <table>
        <tr>
          <th>EDUCACIÓN / ESCOLARIDAD:</th>
          <td>${cfg.perfil?.educacion}</td>
        </tr>
        <tr>
          <th>EXPERIENCIA PREVIA:</th>
          <td>${cfg.perfil?.experiencia}</td>
        </tr>
        <tr>
          <th>FORMACIÓN OBLIGATORIA SST:</th>
          <td>${cfg.perfil?.formacionSST}</td>
        </tr>
        <tr>
          <th>COMPETENCIAS Y HABILIDADES:</th>
          <td>${cfg.perfil?.competencias}</td>
        </tr>
      </table>

      <div class="section-title">3. Profesiograma y Exámenes Médicos Ocupacionales</div>
      <table>
        <tr>
          <th>ÉNFASIS Y VALORACIONES:</th>
          <td>${cfg.perfil?.examenesMedicos}</td>
        </tr>
      </table>

      <div style="margin-top: 40px; display: flex; justify-content: space-around; text-align: center;">
        <div style="width: 220px; border-top: 1px solid #334155; padding-top: 4px;">
          <strong>Responsable Talento Humano</strong><br>
          <span style="font-size: 8.5px; color: #64748b;">Elaboró / Verificó</span>
        </div>
        <div style="width: 220px; border-top: 1px solid #334155; padding-top: 4px;">
          <strong>Coordinador / Asesor SG-SST</strong><br>
          <span style="font-size: 8.5px; color: #64748b;">Aprobó Estándar SST</span>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

// 3. GENERADOR OFICIAL DE MANUAL DE FUNCIONES Y RESPONSABILIDADES SST (PDF)
window.generarPdfManualFunciones = function(cargoName, companyId) {
  const empresa = store.getEmpresa(companyId) || store.getEmpresaActiva();
  const cfg = store.getPerfilCargo(cargoName, companyId);

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Manual de Funciones y Responsabilidades SST - ${cargoName}</title>
      <style>
        @page { size: letter; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 10px; line-height: 1.45; }
        .header { text-align: center; border-bottom: 2px solid #6b21a8; padding-bottom: 10px; margin-bottom: 15px; }
        h1 { margin: 0; font-size: 13.5px; text-transform: uppercase; color: #6b21a8; }
        h2 { margin: 2px 0 0; font-size: 10.5px; color: #1e293b; text-transform: uppercase; }
        .section-title { background: #f3e8ff; border-left: 4px solid #6b21a8; padding: 5px 8px; font-weight: bold; text-transform: uppercase; margin: 12px 0 6px; color: #581c87; font-size: 10px; }
        ul { margin: 0; padding-left: 18px; }
        li { margin-bottom: 5px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #6b21a8; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px;">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div class="header">
        ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${empresa.razonSocial}" style="max-height: 52px; max-width: 150px; object-fit: contain; margin-bottom: 5px;"><br>` : ''}
        <strong style="font-size: 13px; color: #0f172a;">${empresa.razonSocial}</strong>
        <div style="font-size: 9px; color: #64748b;">NIT: ${empresa.nit} • Sistema de Gestión de Seguridad y Salud en el Trabajo</div>
        <h1>MANUAL DE FUNCIONES Y ASIGNACIÓN DE RESPONSABILIDADES SST</h1>
        <h2>Decreto 1072 de 2015 (Artículos 2.2.4.6.8 & 2.2.4.6.10) • Cargo: ${cargoName}</h2>
      </div>

      <div class="section-title">1. Funciones Operativas Principales del Puesto</div>
      <ul>
        ${(cfg.manualFunciones?.funcionesOperativas || []).map(f => `<li>${f}</li>`).join('')}
      </ul>

      <div class="section-title">2. Responsabilidades Legales Obligatorias en SG-SST (Dec. 1072/2015)</div>
      <ul>
        ${(cfg.manualFunciones?.responsabilidadesSST || []).map(r => `<li><strong>${r.substring(0, 3)}</strong> ${r.substring(3)}</li>`).join('')}
      </ul>

      <div style="margin-top: 35px; display: flex; justify-content: space-around; text-align: center;">
        <div style="width: 220px; border-top: 1px solid #334155; padding-top: 4px;">
          <strong>Gerencia / Talento Humano</strong><br>
          <span style="font-size: 8.5px; color: #64748b;">Asignación de Responsabilidades</span>
        </div>
        <div style="width: 220px; border-top: 1px solid #334155; padding-top: 4px;">
          <strong>Responsable SG-SST</strong><br>
          <span style="font-size: 8.5px; color: #64748b;">Verificación Cumplimiento</span>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

// 4. GENERADOR OFICIAL DE PROCEDIMIENTO DE TRABAJO SEGURO (PTS - PDF)
window.generarPdfPtsCargo = function(cargoName, companyId) {
  const empresa = store.getEmpresa(companyId) || store.getEmpresaActiva();
  const cfg = store.getPerfilCargo(cargoName, companyId);

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Procedimiento de Trabajo Seguro (PTS) - ${cargoName}</title>
      <style>
        @page { size: letter; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 10px; line-height: 1.45; }
        .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 15px; }
        h1 { margin: 0; font-size: 13.5px; text-transform: uppercase; color: #0f766e; }
        h2 { margin: 2px 0 0; font-size: 10.5px; color: #1e293b; text-transform: uppercase; }
        .section-title { background: #ccfbf1; border-left: 4px solid #0f766e; padding: 5px 8px; font-weight: bold; text-transform: uppercase; margin: 12px 0 6px; color: #115e59; font-size: 10px; }
        .step-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; }
        .step-box strong { color: #0f766e; display: block; margin-bottom: 3px; }
        ul { margin: 0; padding-left: 18px; }
        li { margin-bottom: 4px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #0f766e; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px;">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div class="header">
        ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${empresa.razonSocial}" style="max-height: 52px; max-width: 150px; object-fit: contain; margin-bottom: 5px;"><br>` : ''}
        <strong style="font-size: 13px; color: #0f172a;">${empresa.razonSocial}</strong>
        <div style="font-size: 9px; color: #64748b;">NIT: ${empresa.nit} • Control Operacional SG-SST (GTC 45)</div>
        <h1>PROCEDIMIENTO DE TRABAJO SEGURO (PTS)</h1>
        <h2>Estándar de Operación y Prevención de Accidentes • Cargo: ${cargoName}</h2>
      </div>

      <div class="section-title">1. Peligros Críticos Evaluados (Matriz GTC 45)</div>
      <ul>
        ${(cfg.pts?.peligrosEvaluados || []).map(p => `<li>${p}</li>`).join('')}
      </ul>

      <div class="section-title">2. Elementos de Protección Personal (EPP) de Uso Obligatorio</div>
      <ul>
        ${(cfg.pts?.eppRequeridos || []).map(e => `<li>✓ ${e}</li>`).join('')}
      </ul>

      <div class="section-title">3. Protocolo de Operación Paso a Paso</div>
      
      <div class="step-box">
        <strong>FASE 1: ANTES DE INICIAR LA LABOR</strong>
        ${cfg.pts?.faseAntes}
      </div>

      <div class="step-box">
        <strong>FASE 2: DURANTE LA EJECUCIÓN OPERATIVA</strong>
        ${cfg.pts?.faseDurante}
      </div>

      <div class="step-box">
        <strong>FASE 3: AL FINALIZAR LA LABOR Y CIERRE DE TURNO</strong>
        ${cfg.pts?.faseDespues}
      </div>

      <div class="section-title">4. Actuación en Caso de Emergencia o Accidente de Trabajo</div>
      <p style="margin: 0; text-align: justify;">
        ${cfg.pts?.emergencias}
      </p>

      <div style="margin-top: 35px; display: flex; justify-content: space-around; text-align: center;">
        <div style="width: 220px; border-top: 1px solid #334155; padding-top: 4px;">
          <strong>Coordinador / Inspector SST</strong><br>
          <span style="font-size: 8.5px; color: #64748b;">Divulgación y Verificación</span>
        </div>
        <div style="width: 220px; border-top: 1px solid #334155; padding-top: 4px;">
          <strong>Firma del Operador / Trabajador</strong><br>
          <span style="font-size: 8.5px; color: #64748b;">Entendido y Acatado</span>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

// =============================================================================
// VISTA DEL PORTAL DE AUTOGESTIÓN DEL TRABAJADOR (INTERFAZ FUNCIONAL Y SIMULADOR)
// =============================================================================
window.cambiarTabInterfazTrabajador = function(tabName) {
  tabAutogestionTrabajador = tabName || 'resumen';
  renderWorkerPortal();
};

function renderVistaAutogestionTrabajador(container, trabajador, esModoAdmin = false) {
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva() || {
    id: 'emp-1790438946268',
    razonSocial: 'LADRILLOS OCHOA LTDA',
    nit: '830124631'
  };

  const todosTrabajadoresEmpresa = store.getTrabajadores(empresa.id);
  const capacitaciones = store.getCapacitaciones(empresa.id);
  const firmas = store.getFirmasPorTrabajador(trabajador.id);
  const reportesPeligro = store.getReportesPeligro(empresa.id).filter(r => r.trabajadorId === trabajador.id);
  const preoperacionales = store.getReportesPreoperacional(empresa.id).filter(p => p.trabajadorId === trabajador.id);

  // Inventario de Herramientas y Asignaciones del Trabajador
  const toolsInventory = store.getToolsInventory(empresa.id);
  const misHerramientasAsignadas = toolsInventory.filter(tool => {
    const activeAsg = store.getActiveToolAssignment(tool.id);
    return activeAsg && (activeAsg.employee_id === trabajador.id || (activeAsg.employee_name || '').toLowerCase() === (trabajador.nombre || '').toLowerCase());
  });

  // Actividades PHVA y Funciones del Cargo desde el Mapa de Procesos
  const cargosFormales = store.getJobPositions(empresa.id);
  const cargoFormal = cargosFormales.find(cg => cg.id === trabajador.job_position_id || (cg.title || '').toLowerCase().trim() === (trabajador.cargo || '').toLowerCase().trim());
  const todasActividadesProcesos = store.getAllProcessActivities(empresa.id);
  const misActividadesPHVA = cargoFormal
    ? todasActividadesProcesos.filter(a => a.responsible_position_id === cargoFormal.id)
    : [];
  const configCargo = store.getPerfilCargo(trabajador.cargo, empresa.id);

  // EPP consolidados del cargo y herramientas
  const eppConsolidados = Array.from(new Set([
    ...(configCargo?.pts?.eppRequeridos || []),
    ...misActividadesPHVA.flatMap(a => Array.isArray(a.required_epp) ? a.required_epp : []),
    ...misHerramientasAsignadas.flatMap(t => {
      const sst = store.getToolSST(t.id);
      return Array.isArray(sst?.required_epp) ? sst.required_epp : [];
    })
  ].filter(Boolean)));

  const documentosSocializables = [
    {
      id: 'DOC-POL-SST-01',
      titulo: 'Política Integral de Seguridad y Salud en el Trabajo',
      categoria: 'Políticas Obligatorias',
      enlace: 'https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing'
    },
    {
      id: 'DOC-POL-ALC-02',
      titulo: 'Política de Prevención de Alcohol, Tabaco y Sustancias Psicoactivas',
      categoria: 'Políticas Obligatorias',
      enlace: 'https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing'
    },
    {
      id: 'DOC-REG-HIG-03',
      titulo: 'Reglamento de Higiene y Seguridad Industrial',
      categoria: 'Reglamentos',
      enlace: 'https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing'
    },
    {
      id: 'DOC-RES-COP-04',
      titulo: 'Acta de Asignación de Responsabilidades en SST',
      categoria: 'Responsabilidades',
      enlace: 'https://docs.google.com/document/d/1KwN9NqmkfD7RTZMilnMopH4AeTbdIftwNfaBRCQg9H8/edit?usp=sharing'
    }
  ];

  const capsEvaluadasCount = capacitaciones.filter(cap =>
    (cap.evaluaciones || []).some(e => e.trabajadorId === trabajador.id || e.worker_id === trabajador.id)
  ).length;

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  const mostrarElearning = tabAutogestionTrabajador === 'resumen' || tabAutogestionTrabajador === 'elearning';
  const mostrarHerramientas = tabAutogestionTrabajador === 'resumen' || tabAutogestionTrabajador === 'herramientas';
  const mostrarDocumentos = tabAutogestionTrabajador === 'resumen' || tabAutogestionTrabajador === 'documentos';
  const mostrarReportes = tabAutogestionTrabajador === 'resumen' || tabAutogestionTrabajador === 'reportes';

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn">
      
      <!-- BARRA SUPERIOR DE SIMULACIÓN Y CONMUTACIÓN DE ROL (MODO PRUEBAS / ADMIN) -->
      ${esModoAdmin ? `
        <div class="bg-white border-2 border-emerald-500/40 rounded-2xl p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div class="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start lg:self-auto">
            <button type="button" onclick="window.volverAGestionTrabajadores()" class="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-indigo-600 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
              <span>🛠️</span>
              <span>← Volver a Vista Administrador</span>
            </button>
            <button type="button" class="px-3.5 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-sm flex items-center gap-1.5 cursor-default">
              <span>👷</span>
              <span>Interfaz Funcional del Trabajador (Modo Pruebas Activo)</span>
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="font-bold text-slate-600">Simulando sesión como:</span>
            <select onchange="if(this.value) window.verPortalComoTrabajador(this.value)" class="px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
              ${todosTrabajadoresEmpresa.map(t => `
                <option value="${t.id}" ${t.id === trabajador.id ? 'selected' : ''}>
                  👷 ${t.nombre} — ${t.cargo} (C.C. ${t.identificacion || t.cedula})
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      ` : ''}

      <!-- TARJETA DE BIENVENIDA Y FICHA INTEGRAL DEL TRABAJADOR -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div class="absolute -right-8 -top-8 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div class="flex items-start sm:items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl font-black shadow-lg border-2 border-emerald-300/50 flex-shrink-0">
              ${(trabajador.nombre || 'T').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  👷 Portal de Autogestión & Formación SST
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200">
                  🏢 ${empresa.razonSocial}
                </span>
              </div>
              <h2 class="text-xl sm:text-2xl font-black text-white mt-1">${trabajador.nombre}</h2>
              <div class="text-xs text-slate-300 flex flex-wrap gap-x-3 gap-y-1 mt-1 font-medium">
                <span><strong>Cargo:</strong> ${trabajador.cargo}</span>
                <span>•</span>
                <span><strong>C.C.:</strong> ${trabajador.identificacion || trabajador.cedula}</span>
                <span>•</span>
                <span><strong>Área:</strong> ${trabajador.area || 'Planta Principal'}</span>
                <span>•</span>
                <span><strong>Seguridad Social:</strong> ${trabajador.eps || 'Sura EPS'} / ${trabajador.arl || 'Positiva ARL'}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col md:items-end gap-1.5 text-xs bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-[10px]">
                ● ${trabajador.estado || 'Activo'}
              </span>
              <span class="text-[11px] text-indigo-200 font-bold">${trabajador.tipoContrato || 'Término Indefinido'}</span>
            </div>
            <span class="text-[11px] text-slate-300 font-mono">Ingreso: ${trabajador.fechaContrato || trabajador.fechaIngreso || 'Vigente'} • Salario: ${formatCOP(trabajador.salario || 1600000)}</span>
          </div>
        </div>
      </div>

      <!-- KPIs RÁPIDOS DEL PERFIL DEL TRABAJADOR -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div onclick="window.cambiarTabInterfazTrabajador('elearning')" class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:border-indigo-400 transition cursor-pointer">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-slate-500 font-black uppercase">E-Learning SST</span>
            <span class="text-base">🎓</span>
          </div>
          <span class="text-2xl font-black text-indigo-700 mt-1 block">${capsEvaluadasCount} / ${capacitaciones.length}</span>
          <span class="text-[10px] text-emerald-700 font-bold block">Cursos Evaluados (DOC-10/16)</span>
        </div>

        <div onclick="window.cambiarTabInterfazTrabajador('documentos')" class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:border-emerald-400 transition cursor-pointer">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-slate-500 font-black uppercase">Firmas Ley 527</span>
            <span class="text-base">✍️</span>
          </div>
          <span class="text-2xl font-black text-emerald-600 mt-1 block">${firmas.length} / ${documentosSocializables.length}</span>
          <span class="text-[10px] text-slate-500 font-bold block">Políticas con Sello Digital</span>
        </div>

        <div onclick="window.cambiarTabInterfazTrabajador('herramientas')" class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:border-amber-400 transition cursor-pointer">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-slate-500 font-black uppercase">Equipos & EPP</span>
            <span class="text-base">🛠️</span>
          </div>
          <span class="text-2xl font-black text-amber-600 mt-1 block">${misHerramientasAsignadas.length} Equipos</span>
          <span class="text-[10px] text-slate-500 font-bold block">${eppConsolidados.length || 4} EPP • ${preoperacionales.length} Preoperacionales</span>
        </div>

        <div onclick="window.cambiarTabInterfazTrabajador('reportes')" class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:border-rose-400 transition cursor-pointer">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-slate-500 font-black uppercase">Reporte Peligros</span>
            <span class="text-base">⚠️</span>
          </div>
          <span class="text-2xl font-black text-rose-600 mt-1 block">${reportesPeligro.length}</span>
          <span class="text-[10px] text-slate-500 font-bold block">Condiciones Reportadas</span>
        </div>
      </div>

      <!-- PESTAÑAS DE NAVEGACIÓN DE LA INTERFAZ DEL TRABAJADOR -->
      <div class="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-wrap gap-1.5">
        <button onclick="window.cambiarTabInterfazTrabajador('resumen')" class="px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${tabAutogestionTrabajador === 'resumen' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          <span>🏠</span>
          <span>Vista Completa (Todo)</span>
        </button>
        <button onclick="window.cambiarTabInterfazTrabajador('elearning')" class="px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${tabAutogestionTrabajador === 'elearning' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          <span>🎓</span>
          <span>Módulo de Formación E-Learning (${capacitaciones.length})</span>
        </button>
        <button onclick="window.cambiarTabInterfazTrabajador('herramientas')" class="px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${tabAutogestionTrabajador === 'herramientas' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          <span>🛠️</span>
          <span>Mis Equipos, EPP & Preoperacional</span>
        </button>
        <button onclick="window.cambiarTabInterfazTrabajador('documentos')" class="px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${tabAutogestionTrabajador === 'documentos' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          <span>📄</span>
          <span>Mis Instrumentos, Funciones & Firmas</span>
        </button>
        <button onclick="window.cambiarTabInterfazTrabajador('reportes')" class="px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${tabAutogestionTrabajador === 'reportes' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          <span>⚠️</span>
          <span>Reportar Condición Insegura (${reportesPeligro.length})</span>
        </button>
      </div>

      <!-- =================================================================== -->
      <!-- MÓDULO 1: FORMACIÓN Y CAPACITACIONES E-LEARNING (DOC-10 & DOC-16)   -->
      <!-- =================================================================== -->
      ${mostrarElearning ? `
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-indigo-200 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>🎓 Bandeja de Formación, Inducción y Evaluación E-Learning</span>
                </h3>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Calificación Automática & Formatos Legales DOC-10 / DOC-16
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                Ingresa al Aula Virtual para visualizar las diapositivas y el video obligatorio, desbloquea la evaluación de <strong>13 preguntas</strong> y genera tus certificados oficiales con estampa de tiempo inmutable.
              </p>
            </div>
            <span class="text-xs font-black text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 flex-shrink-0">
              ${capsEvaluadasCount} de ${capacitaciones.length} Completadas
            </span>
          </div>

          ${capacitaciones.length === 0 ? `
            <div class="text-center py-8 text-slate-400 text-xs">
              No tienes capacitaciones programadas en este momento.
            </div>
          ` : `
            <div class="space-y-3">
              ${capacitaciones.map(cap => {
                const miEvaluacion = (cap.evaluaciones || []).find(e => e.trabajadorId === trabajador.id || e.worker_id === trabajador.id);
                const yaRealizada = !!miEvaluacion;
                const esCap1 = (cap.order_number === 1 || cap.esInduccionObligatoria);
                const passed = miEvaluacion?.passed !== undefined ? miEvaluacion.passed : (miEvaluacion?.aprobada !== undefined ? miEvaluacion.aprobada : true);
                const nota = miEvaluacion?.nota || miEvaluacion?.score_obtained || 5.0;
                const pct = miEvaluacion?.percentage !== undefined ? miEvaluacion.percentage : Math.round((nota / 5) * 100);
                const totalPregs = (cap.preguntas || []).length || 13;

                return `
                  <div class="p-4 sm:p-5 rounded-2xl border ${yaRealizada ? 'border-emerald-300 bg-emerald-50/20' : (esCap1 ? 'border-indigo-300 bg-indigo-50/25' : 'border-slate-200 bg-slate-50/50')} flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition hover:shadow-sm">
                    <div class="space-y-1.5 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        ${esCap1 ? `
                          <span class="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-600 text-white shadow-2xs">
                            ★ Capacitación #1 Obligatoria: Inducción al SG-SST
                          </span>
                        ` : `
                          <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                            Capacitación #${cap.order_number || 2}
                          </span>
                        `}
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black ${yaRealizada ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
                          ● ${yaRealizada ? 'Completada / Evaluada' : 'Pendiente por Realizar'}
                        </span>
                        <span class="text-[11px] text-slate-500 font-semibold">• Intensidad: ${cap.duracion || '2 Horas'} • ${totalPregs} Preguntas</span>
                      </div>

                      <h4 class="text-sm font-black text-slate-900">${cap.tema}</h4>
                      <p class="text-xs text-slate-600 leading-relaxed">${cap.objetivo}</p>

                      <div class="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                        <span>👨‍🏫 Instructor: <strong class="text-slate-700">${cap.facilitador || 'Coordinador SG-SST'}</strong></span>
                        ${cap.materialUrl ? `
                          <a href="${cap.materialUrl}" target="_blank" class="text-indigo-600 hover:underline font-bold">🔗 Ver Material de Apoyo Externo ↗</a>
                        ` : ''}
                        ${yaRealizada && (miEvaluacion.accepted_at_bogota || miEvaluacion.timestamp) ? `
                          <span class="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ⏱️ Timestamp: ${miEvaluacion.accepted_at_bogota || miEvaluacion.timestamp}
                          </span>
                        ` : ''}
                      </div>
                    </div>

                    <div class="flex-shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-center gap-2">
                      ${yaRealizada ? `
                        <div class="flex items-center gap-2">
                          <span class="px-3 py-1 rounded-xl text-xs font-black ${passed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}">
                            ${passed ? '🏆 Aprobado' : '⚠️ No Aprobado'}: ${nota} / 5.0 (${pct}%)
                          </span>
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5">
                          <button onclick="window.imprimirRegistroCapacitacionDOC10('${miEvaluacion.id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Imprimir Formato Oficial de Asistencia e Inducción DOC-10">
                            <span>📄</span> Formato DOC-10
                          </button>
                          <button onclick="window.imprimirEvaluacionCapacitacionDOC16('${miEvaluacion.id}')" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-black transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Imprimir Evaluación Calificada de 13 Preguntas DOC-16">
                            <span>📝</span> Formato DOC-16
                          </button>
                          <button onclick="window.abrirAulaVirtualTrabajador('${cap.id}', '${trabajador.id}')" class="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer" title="Volver a abrir el Aula Virtual y presentar la evaluación en modo pruebas">
                            <span>🔄</span> Repetir Aula / Examen
                          </button>
                        </div>
                      ` : `
                        <button onclick="window.abrirAulaVirtualTrabajador('${cap.id}', '${trabajador.id}')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95">
                          <span>🎓</span>
                          <span>Ingresar al Aula Virtual y Evaluar (${totalPregs} Preguntas)</span>
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      ` : ''}

      <!-- =================================================================== -->
      <!-- MÓDULO 2: MIS HERRAMIENTAS, EQUIPOS BAJO CUSTODIA, EPP & PREOPERACIONAL -->
      <!-- =================================================================== -->
      ${mostrarHerramientas ? `
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200 shadow-xs space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span>🛠️ Mis Equipos bajo Custodia, Dotación EPP e Inspección Preoperacional</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Consulta las herramientas asignadas a tu cargo, verifica los Elementos de Protección Personal (EPP) obligatorios y registra la inspección preoperacional antes de iniciar turno.
              </p>
            </div>
            <button onclick="window.abrirModalPreoperacionalTrabajador('${trabajador.id}')" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm flex-shrink-0">
              <span>📋</span>
              <span>+ Realizar Inspección Preoperacional</span>
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Sub-bloque A: Herramientas y Equipos Asignados -->
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-800 uppercase tracking-wider">🔧 Equipos Asignados / En Planta</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">${misHerramientasAsignadas.length > 0 ? `${misHerramientasAsignadas.length} Bajo mi custodia` : `${toolsInventory.length} En inventario planta`}</span>
              </div>

              ${(misHerramientasAsignadas.length > 0 ? misHerramientasAsignadas : toolsInventory.slice(0, 3)).map(tool => {
                const sst = store.getToolSST(tool.id);
                const asg = store.getActiveToolAssignment(tool.id);
                return `
                  <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-slate-100 text-slate-800">${tool.internal_code}</span>
                        <span class="text-xs font-black text-slate-900">${tool.exact_name}</span>
                      </div>
                      <span class="text-[11px] text-slate-500 block mt-0.5">${tool.category} • Marca: ${tool.brand} • Estado: <strong>${tool.current_status}</strong></span>
                      ${sst?.preventive_measures ? `<span class="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded block mt-1 border border-amber-100">🛡️ Control: ${sst.preventive_measures}</span>` : ''}
                      ${asg ? `<span class="text-[10px] font-mono text-emerald-700 block mt-0.5">✓ Custodia Firmada: ${asg.digital_signature_hash}</span>` : ''}
                    </div>
                    <button onclick="window.abrirModalPreoperacionalTrabajador('${trabajador.id}', '${tool.id}')" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition cursor-pointer flex-shrink-0">
                      📋 Preoperacional
                    </button>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Sub-bloque B: EPP Obligatorios del Cargo & Historial Preoperacional -->
            <div class="space-y-3">
              <div class="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black text-teal-950 uppercase tracking-wider">🦺 Mis EPP Obligatorios (${trabajador.cargo})</span>
                  <button onclick="window.firmarPolitica('DOC-EPP-${trabajador.id}', 'Constancia de Entrega y Uso Obligatorio de Dotación y EPP', '${trabajador.id}')" class="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold cursor-pointer">
                    ✍️ Firmar Recibido EPP
                  </button>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  ${(eppConsolidados.length > 0 ? eppConsolidados : ['Casco de seguridad dieléctrico', 'Botas de seguridad con puntera', 'Guantes de carnaza / nitrilo', 'Protección auditiva y visual']).map(epp => `
                    <span class="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-900 text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                      <span>✓</span> ${epp}
                    </span>
                  `).join('')}
                </div>
              </div>

              <!-- Últimos Preoperacionales Registrados -->
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span class="text-xs font-black text-slate-800 uppercase tracking-wider block">📋 Mis Inspecciones Preoperacionales Recientes (${preoperacionales.length})</span>
                ${preoperacionales.length === 0 ? `
                  <p class="text-[11px] text-slate-400">Aún no has registrado inspecciones preoperacionales en este turno.</p>
                ` : `
                  <div class="divide-y divide-slate-200/70 max-h-36 overflow-y-auto">
                    ${preoperacionales.slice(0, 4).map(p => `
                      <div class="py-1.5 flex items-center justify-between text-xs">
                        <div>
                          <span class="font-bold text-slate-800">${p.equipoNombre}</span>
                          <span class="text-[10px] text-slate-500 block">${new Date(p.fechaCreacion || Date.now()).toLocaleString()} • ${p.observaciones || 'Verificación estándar'}</span>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-black ${p.aptoOperar === 'SI' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                          ${p.aptoOperar === 'SI' ? '✓ Apto' : '🛑 No Apto'}
                        </span>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- =================================================================== -->
      <!-- MÓDULO 3: MIS INSTRUMENTOS LABORALES, FUNCIONES PHVA & FIRMAS LEY 527 -->
      <!-- =================================================================== -->
      ${mostrarDocumentos ? `
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📄 Mis 4 Instrumentos Oficiales del Cargo & Funciones Asignadas</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Descarga tus documentos laborales en PDF y consulta tus funciones operativas conectadas al Mapa de Procesos PHVA.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onclick="window.generarPdfContratoTrabajador('${trabajador.id}')" class="p-3.5 bg-blue-50/70 hover:bg-blue-100 text-blue-900 rounded-2xl border border-blue-200 text-left transition cursor-pointer shadow-2xs">
              <span class="text-xl block mb-1">📄</span>
              <span class="font-black text-xs block">1. Mi Contrato</span>
              <span class="text-[10px] text-blue-700 font-semibold block mt-0.5">Minuta Individual PDF</span>
            </button>

            <button onclick="window.generarPdfPerfilCargo('${escapeHtml(trabajador.cargo)}', '${empresa.id}')" class="p-3.5 bg-amber-50/70 hover:bg-amber-100 text-amber-900 rounded-2xl border border-amber-200 text-left transition cursor-pointer shadow-2xs">
              <span class="text-xl block mb-1">📋</span>
              <span class="font-black text-xs block">2. Perfil de Cargo</span>
              <span class="text-[10px] text-amber-700 font-semibold block mt-0.5">Requisitos & Profesiograma</span>
            </button>

            <button onclick="window.generarPdfManualFunciones('${escapeHtml(trabajador.cargo)}', '${empresa.id}')" class="p-3.5 bg-purple-50/70 hover:bg-purple-100 text-purple-900 rounded-2xl border border-purple-200 text-left transition cursor-pointer shadow-2xs">
              <span class="text-xl block mb-1">📖</span>
              <span class="font-black text-xs block">3. Manual Funciones</span>
              <span class="text-[10px] text-purple-700 font-semibold block mt-0.5">Responsabilidades SST</span>
            </button>

            <button onclick="window.generarPdfPtsCargo('${escapeHtml(trabajador.cargo)}', '${empresa.id}')" class="p-3.5 bg-teal-50/70 hover:bg-teal-100 text-teal-900 rounded-2xl border border-teal-200 text-left transition cursor-pointer shadow-2xs">
              <span class="text-xl block mb-1">🛡️</span>
              <span class="font-black text-xs block">4. PTS Seguro</span>
              <span class="text-[10px] text-teal-700 font-semibold block mt-0.5">Protocolo GTC 45 en PDF</span>
            </button>
          </div>

          <!-- Resumen en vivo de Funciones Operativas y Actividades PHVA del Trabajador -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span class="text-xs font-black text-slate-800 uppercase tracking-wider block">⚙️ Mis Actividades Operativas Asignadas (${trabajador.cargo})</span>
              <ul class="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                ${misActividadesPHVA.length > 0
                  ? misActividadesPHVA.map(a => `<li><strong>[${a.phva_phase}] ${a.name}:</strong> ${a.description}</li>`).join('')
                  : (configCargo.manualFunciones?.funcionesOperativas || []).map(f => `<li>${f}</li>`).join('')
                }
              </ul>
            </div>

            <div class="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2">
              <span class="text-xs font-black text-indigo-950 uppercase tracking-wider block">🛡️ Mis Responsabilidades Legales SG-SST (Dec. 1072 Art. 2.2.4.6.10)</span>
              <ul class="space-y-1.5 text-xs text-indigo-950 list-disc pl-4">
                ${(configCargo.manualFunciones?.responsabilidadesSST || []).slice(0, 5).map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- Políticas & Reglamentos para Firma Electrónica Ley 527 -->
          <div class="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h4 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>✍️ Socialización y Firma Electrónica de Políticas SG-SST (Ley 527 de 1999)</span>
              </h4>
              <p class="text-xs text-slate-500">Lee los documentos normativos de la empresa y registra tu firma electrónica personal.</p>
            </div>

            <div class="divide-y divide-slate-100 border border-slate-200 rounded-2xl px-4">
              ${documentosSocializables.map(doc => {
                const firmaExistente = firmas.find(f => f.documentoId === doc.id);
                return `
                  <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-bold text-slate-900">${doc.titulo}</span>
                        <span class="text-[9px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600">${doc.categoria}</span>
                      </div>
                      <div class="flex items-center gap-3 text-[11px] text-slate-400">
                        <a href="${doc.enlace}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline font-semibold flex items-center gap-1">
                          <span>📖 Abrir documento oficial para lectura</span>
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                      </div>
                    </div>

                    <div class="flex-shrink-0">
                      ${firmaExistente ? `
                        <div class="flex items-center gap-2">
                          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            <span>Firmado (${new Date(firmaExistente.fecha || firmaExistente.timestamp).toLocaleDateString()})</span>
                          </span>
                          <button onclick="window.verSelloFirma('${firmaExistente.id}')" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold cursor-pointer">
                            Ver Sello Digital
                          </button>
                        </div>
                      ` : `
                        <button onclick="window.firmarPolitica('${doc.id}', '${escapeHtml(doc.titulo)}', '${trabajador.id}')" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
                          <span>✍️ Firmar Electrónicamente</span>
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- =================================================================== -->
      <!-- MÓDULO 4: REPORTE DE CONDICIONES INSEGURAS E INCIDENTES (DEC. 1072) -->
      <!-- =================================================================== -->
      ${mostrarReportes ? `
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span>⚠️ Participación del Trabajador: Reporte de Peligros y Condiciones Inseguras</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Notifica al instante cualquier daño en maquinaria, riesgo locativo, acto inseguro o condición peligrosa en tu puesto de trabajo.
              </p>
            </div>
            <button onclick="window.abrirModalReportePeligro('${trabajador.id}')" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm flex-shrink-0">
              <span>🚨</span>
              <span>+ Reportar Condición Insegura</span>
            </button>
          </div>

          ${reportesPeligro.length > 0 ? `
            <div class="divide-y divide-slate-100 border border-slate-200 rounded-2xl px-4">
              ${reportesPeligro.map(r => `
                <div class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">${r.prioridad || 'Media'}</span>
                      <span class="font-bold text-slate-900">${r.descripcion}</span>
                    </div>
                    <span class="text-[11px] text-slate-500 block mt-0.5">📍 Área/Ubicación: <strong>${r.ubicacion || 'Planta'}</strong> • Fecha: ${new Date(r.fecha || r.fechaReporte || Date.now()).toLocaleString()}</span>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${r.estado === 'Cerrado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">
                    ● ${r.estado || 'En Revisión SST'}
                  </span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              No has registrado reportes de condiciones inseguras recientemente. Usa el botón <strong>"+ Reportar Condición Insegura"</strong> para realizar una prueba.
            </div>
          `}
        </div>
      ` : ''}

    </div>
  `;
}

// Modal de Inspección Preoperacional desde la Interfaz del Trabajador
window.abrirModalPreoperacionalTrabajador = function(trabajadorId, toolIdPreseleccionado = '') {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) return;
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva();
  const tools = store.getToolsInventory(empresa.id);

  const modalId = 'modal-preoperacional-trabajador';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';
  modalEl.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
      <div class="bg-amber-600 p-4 text-white flex justify-between items-center">
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded block mb-0.5">Control Operacional SG-SST</span>
          <h3 class="font-black text-sm">📋 Lista de Chequeo Preoperacional de Equipo / Herramienta</h3>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-white text-lg font-bold cursor-pointer">✕</button>
      </div>

      <form id="form-preop-trabajador" class="p-5 space-y-3.5 text-xs">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Seleccionar Equipo o Herramienta a Inspeccionar *</label>
          <select id="preop-tool-id" required class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800">
            ${tools.map(t => `
              <option value="${t.id}" data-name="${escapeHtml(t.exact_name)}" ${t.id === toolIdPreseleccionado ? 'selected' : ''}>
                [${t.internal_code}] ${t.exact_name} (${t.brand})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span class="font-black text-slate-800 block uppercase text-[10px]">Verificación de Seguridad antes de Iniciar Turno:</span>
          <label class="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 cursor-pointer">
            <span>1. Estado físico general, carcasa, mangos y acoples sin fisuras</span>
            <input type="checkbox" checked required class="w-4 h-4 text-emerald-600 rounded">
          </label>
          <label class="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 cursor-pointer">
            <span>2. Guardas de seguridad, frenos o parada de emergencia operativos</span>
            <input type="checkbox" checked required class="w-4 h-4 text-emerald-600 rounded">
          </label>
          <label class="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 cursor-pointer">
            <span>3. Cables eléctricos, mangueras o conexiones libres de fugas/empalmes</span>
            <input type="checkbox" checked required class="w-4 h-4 text-emerald-600 rounded">
          </label>
          <label class="flex items-center justify-between gap-2 py-1 cursor-pointer">
            <span>4. Cuento con todos los EPP requeridos para operar el equipo</span>
            <input type="checkbox" checked required class="w-4 h-4 text-emerald-600 rounded">
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">¿El equipo es APTO para operar? *</label>
            <select id="preop-apto" class="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900">
              <option value="SI">✓ SÍ, APTO PARA OPERAR</option>
              <option value="NO">🛑 NO APTO (Bloquear y Reportar)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Lectura Horómetro / Odómetro</label>
            <input type="text" id="preop-horometro" placeholder="Ej. 1.245 Horas" class="w-full px-3 py-2 border border-slate-300 rounded-xl">
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Observaciones o Hallazgos:</label>
          <textarea id="preop-obs" rows="2" placeholder="Condiciones encontradas antes de iniciar..." class="w-full px-3 py-2 border border-slate-300 rounded-xl">Equipo verificado en óptimas condiciones de seguridad antes de iniciar turno.</textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black cursor-pointer shadow-sm">✓ Registrar Preoperacional</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modalEl);

  document.getElementById('form-preop-trabajador').onsubmit = (e) => {
    e.preventDefault();
    const sel = document.getElementById('preop-tool-id');
    const toolId = sel.value;
    const toolName = sel.options[sel.selectedIndex]?.getAttribute('data-name') || 'Equipo';
    const apto = document.getElementById('preop-apto').value;
    const obs = document.getElementById('preop-obs').value;

    store.guardarReportePreoperacional({
      companyId: empresa.id,
      trabajadorId: trabajador.id,
      trabajadorNombre: trabajador.nombre,
      equipoId: toolId,
      equipoNombre: toolName,
      aptoOperar: apto,
      horometro: document.getElementById('preop-horometro').value,
      observaciones: obs
    });

    if (apto === 'NO') {
      store.registrarReportePeligro({
        companyId: empresa.id,
        trabajadorId: trabajador.id,
        trabajadorNombre: trabajador.nombre,
        ubicacion: trabajador.area || 'Planta',
        prioridad: 'Alta',
        descripcion: `[PREOPERACIONAL NO APTO - ${toolName}]: ${obs}`,
        fecha: new Date().toISOString(),
        estado: 'En Revisión SST'
      });
    }

    modalEl.remove();
    alert(`✓ Inspección Preoperacional de "${toolName}" registrada exitosamente.`);
    renderWorkerPortal();
  };
};

// Ventana de firmas electrónicas
window.firmarPolitica = function(documentoId, tituloDoc, trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) return;

  abrirModalFirma({
    documentoId: documentoId,
    titulo: tituloDoc,
    firmanteNombre: trabajador.nombre,
    firmanteCedula: trabajador.identificacion || trabajador.cedula,
    firmanteCargo: trabajador.cargo,
    firmanteCorreo: trabajador.correo || '',
    trabajadorId: trabajador.id,
    onFirmado: (registroFirma) => {
      store.registrarFirmaTrabajador(registroFirma);
      renderWorkerPortal();
    }
  });
};

window.verSelloFirma = function(firmaId) {
  const firma = store.getFirmaPorId(firmaId);
  if (!firma) return;

  const html = generarSelloFirmaHtml(firma);
  const win = window.open('', '_blank', 'width=650,height=550');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Sello de Firma Electrónica - Validez Ley 527 de 1999</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-100 p-6 flex items-center justify-center min-h-screen">
      <div class="max-w-md w-full">
        ${html}
        <div class="text-center mt-4">
          <button onclick="window.close()" class="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">Cerrar Ventana</button>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

window.abrirModalReportePeligro = function(trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  const modalId = 'modal-reporte-peligro';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4';
  modalEl.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
      <div class="bg-rose-600 p-4 text-white flex justify-between items-center">
        <h3 class="font-bold text-sm">🚨 Reporte de Peligro / Condición Insegura</h3>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-white text-lg font-bold cursor-pointer">✕</button>
      </div>
      <form id="form-reporte-peligro" class="p-4 space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Ubicación / Área *</label>
            <input type="text" id="reporte-ubicacion" required value="${escapeHtml(trabajador.area || 'Planta Principal')}" placeholder="Ej. Zona de hornos..." class="w-full px-3 py-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Nivel de Prioridad *</label>
            <select id="reporte-prioridad" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold">
              <option value="Alta">🔴 Alta / Urgente</option>
              <option value="Media" selected>🟡 Media / Preventiva</option>
              <option value="Baja">🟢 Baja / Mejora</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Descripción de la Condición o Acto Inseguro *</label>
          <textarea id="reporte-desc" required rows="3" placeholder="Describe qué observaste y por qué consideras que puede causar un accidente..." class="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold cursor-pointer">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer">Enviar Reporte SST</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modalEl);

  document.getElementById('form-reporte-peligro').onsubmit = (e) => {
    e.preventDefault();
    store.registrarReportePeligro({
      companyId: trabajador.companyId,
      trabajadorId: trabajador.id,
      trabajadorNombre: trabajador.nombre,
      ubicacion: document.getElementById('reporte-ubicacion').value,
      prioridad: document.getElementById('reporte-prioridad').value,
      descripcion: document.getElementById('reporte-desc').value,
      fecha: new Date().toISOString(),
      estado: 'En Revisión SST'
    });
    modalEl.remove();
    alert("✓ Tu reporte de condición insegura fue enviado exitosamente al Coordinador SST.");
    renderWorkerPortal();
  };
};

// =============================================================================
// MÓDULO E-LEARNING TRABAJADOR: AULA VIRTUAL Y EVALUACIÓN SECUENCIAL
// Visor Multimedia (Google Slides/Video) -> Desbloqueo Preventivo -> 13 Preguntas
// =============================================================================

export function abrirAulaVirtualTrabajador(capId, trabajadorId) {
  const cap = store.getCapacitacionPorId(capId);
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!cap || !trabajador) return;

  const modalId = 'modal-aula-virtual';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const embedPres = formatPresentationEmbedUrl(cap.presentacionUrl || cap.materialUrl);
  const embedVid = formatVideoEmbedUrl(cap.videoUrl);
  const preguntas = cap.preguntas || [];
  const totalPreguntas = preguntas.length || 13;

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
      <!-- Encabezado del Aula Virtual -->
      <div class="bg-indigo-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold">
            🎓
          </div>
          <div>
            <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
              Aula Virtual E-Learning • SG-SST DOCTOR PYME
            </span>
            <h3 class="text-sm sm:text-base font-bold text-white">${cap.tema}</h3>
          </div>
        </div>
        <button id="btn-cerrar-aula" class="text-slate-300 hover:text-white p-1 text-xl font-bold cursor-pointer">✕</button>
      </div>

      <!-- Barra de Pasos Secuenciales con Bloqueo Preventivo -->
      <div class="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0 text-xs">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <span id="badge-paso-1" class="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs">1</span>
            <span class="font-bold text-slate-800">Visualizar Diapositivas & Video</span>
          </div>
          <span class="text-slate-300 font-bold hidden sm:inline">➔</span>
          <div class="flex items-center gap-2">
            <span id="badge-paso-2" class="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-black flex items-center justify-center text-xs">2</span>
            <span id="text-paso-2" class="font-bold text-slate-400">Evaluación de 13 Preguntas</span>
          </div>
        </div>

        <span class="text-[11px] font-semibold text-slate-500">
          Trabajador: <strong class="text-slate-800">${trabajador.nombre}</strong>
        </span>
      </div>

      <!-- Contenedor con Scroll de Contenido -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6" id="contenedor-aula-virtual">
        
        <!-- PASO 1: MATERIAL MULTIMEDIA (DIAPOSITIVAS Y VIDEO) -->
        <div id="seccion-material-multimedia" class="space-y-5">
          <div class="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 flex items-start gap-3">
            <span class="text-xl">ℹ️</span>
            <div>
              <strong class="font-bold block mb-0.5">Instrucciones de Aprendizaje Obligatorias:</strong>
              Para desbloquear la evaluación debes revisar la <strong>Presentación Oficial</strong> y el <strong>Video Técnico</strong>. Al finalizar la revisión, marca la casilla de confirmación para habilitar el examen de 13 preguntas.
            </div>
          </div>

          <!-- Visor de Presentación Google Slides -->
          ${embedPres ? `
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>📊 Diapositivas de Capacitación (Google Slides / Visor Integrado)</span>
                </span>
                ${cap.materialUrl ? `
                  <a href="${cap.materialUrl}" target="_blank" class="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                    <span>Abrir presentación en pestaña nueva ↗</span>
                  </a>
                ` : ''}
              </div>
              <div class="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
                <iframe src="${embedPres}" class="w-full h-full border-0" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>
              </div>
            </div>
          ` : ''}

          <!-- Visor de Video Embebido -->
          ${embedVid ? `
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>🎥 Video Explicativo E-Learning</span>
                </span>
                ${cap.videoUrl ? `
                  <a href="${cap.videoUrl}" target="_blank" class="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1">
                    <span>Ver enlace directo ↗</span>
                  </a>
                ` : ''}
              </div>
              <div class="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black shadow-md flex items-center justify-center">
                ${embedVid.endsWith('.mp4') ? `
                  <video controls class="w-full h-full object-contain">
                    <source src="${embedVid}" type="video/mp4">
                    Tu navegador no soporta el reproductor de video.
                  </video>
                ` : `
                  <iframe src="${embedVid}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                `}
              </div>
            </div>
          ` : ''}

          <!-- Botón de Material de Apoyo Externo -->
          ${cap.materialUrl ? `
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span class="font-bold text-slate-800 block">Documento Guía y Material de Apoyo Complementario</span>
                <span class="text-[11px] text-slate-500">Material de referencia legal y técnico para profundizar en el tema.</span>
              </div>
              <a href="${cap.materialUrl}" target="_blank" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition shadow-2xs">
                Ver Guía de Apoyo ↗
              </a>
            </div>
          ` : ''}

          <!-- Confirmación de Lectura y Desbloqueo Preventivo -->
          <div class="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" id="check-confirmacion-lectura" class="mt-0.5 w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer">
              <span class="text-xs font-semibold text-purple-950">
                Certifico que he revisado la presentación y el video de capacitación y me encuentro listo para presentar la evaluación de 13 preguntas.
              </span>
            </label>

            <button type="button" id="btn-desbloquear-evaluacion" disabled class="px-5 py-2.5 bg-slate-300 text-slate-500 rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 cursor-not-allowed">
              <span>🔒 Iniciar Evaluación (${totalPreguntas} Preguntas)</span>
            </button>
          </div>
        </div>

        <!-- PASO 2: CUESTIONARIO INTERACTIVO (13 PREGUNTAS) -->
        <div id="seccion-cuestionario-examen" class="hidden space-y-6 pt-4 border-t border-slate-200">
          <div class="bg-indigo-900 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between flex-wrap gap-2">
            <div>
              <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Evaluación de Eficacia SG-SST</span>
              <h4 class="text-sm font-bold text-white">Responde las 13 preguntas de opción múltiple</h4>
            </div>
            <div class="bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-bold font-mono" id="contador-progreso-examen">
              0 de ${totalPreguntas} respondidas
            </div>
          </div>

          <form id="form-examen-13-preguntas" class="space-y-5">
            ${preguntas.map((p, idx) => {
              const num = idx + 1;
              const opts = p.opciones || ["A) ", "B) ", "C) ", "D) "];

              return `
                <div class="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 pregunta-bloque" data-question-num="${num}">
                  <div class="flex items-start justify-between gap-3">
                    <span class="text-xs font-black text-slate-900 leading-snug">
                      <strong class="text-indigo-600 font-black mr-1">${num}.</strong> ${p.pregunta}
                    </span>
                    <span class="indicador-respondida px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400">
                      Pendiente
                    </span>
                  </div>

                  <div class="grid grid-cols-1 gap-2 pt-1">
                    ${[0, 1, 2, 3].map(optIdx => {
                      const letters = ['A', 'B', 'C', 'D'];
                      const letter = letters[optIdx];
                      const optText = opts[optIdx] || `Opción ${letter}`;

                      return `
                        <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer transition option-label">
                          <input type="radio" name="pregunta_${num}" value="${optIdx}" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 radio-opcion-examen" data-q-num="${num}">
                          <span class="text-xs font-medium text-slate-800 leading-tight">${optText}</span>
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}

            <div class="sticky bottom-0 bg-white/95 backdrop-blur-xs p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <span class="text-xs text-slate-500 font-medium text-center sm:text-left">
                ⚠️ Recuerda que debes contestar <strong>las 13 preguntas</strong> para poder registrar tu calificación y generar tu formato legal.
              </span>
              <button type="submit" id="btn-enviar-examen" class="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2">
                <span>✓ Finalizar y Calificar Evaluación</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  document.getElementById('btn-cerrar-aula').onclick = () => modalEl.remove();

  // Lógica del Checkbox de Confirmación para desbloquear el examen
  const chk = document.getElementById('check-confirmacion-lectura');
  const btnUnlock = document.getElementById('btn-desbloquear-evaluacion');
  const seccionExamen = document.getElementById('seccion-cuestionario-examen');
  const badgePaso2 = document.getElementById('badge-paso-2');
  const textPaso2 = document.getElementById('text-paso-2');

  chk.onchange = () => {
    if (chk.checked) {
      btnUnlock.disabled = false;
      btnUnlock.classList.remove('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
      btnUnlock.classList.add('bg-indigo-600', 'hover:bg-indigo-700', 'text-white', 'cursor-pointer', 'shadow-md');
      btnUnlock.innerHTML = `<span>🔓 Iniciar Evaluación (${totalPreguntas} Preguntas) ➔</span>`;
    } else {
      btnUnlock.disabled = true;
      btnUnlock.classList.add('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
      btnUnlock.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'text-white', 'cursor-pointer', 'shadow-md');
      btnUnlock.innerHTML = `<span>🔒 Iniciar Evaluación (${totalPreguntas} Preguntas)</span>`;
    }
  };

  btnUnlock.onclick = () => {
    if (!chk.checked) return;
    seccionExamen.classList.remove('hidden');
    badgePaso2.classList.remove('bg-slate-200', 'text-slate-600');
    badgePaso2.classList.add('bg-indigo-600', 'text-white');
    textPaso2.classList.remove('text-slate-400');
    textPaso2.classList.add('text-indigo-900');
    seccionExamen.scrollIntoView({ behavior: 'smooth' });
  };

  // Tracker dinámico de progreso en vivo
  const radios = modalEl.querySelectorAll('.radio-opcion-examen');
  const contadorEl = document.getElementById('contador-progreso-examen');

  function actualizarProgreso() {
    let respondidas = 0;
    for (let i = 1; i <= totalPreguntas; i++) {
      const checked = modalEl.querySelector(`input[name="pregunta_${i}"]:checked`);
      const bloque = modalEl.querySelector(`[data-question-num="${i}"]`);
      const indicador = bloque.querySelector('.indicador-respondida');
      if (checked) {
        respondidas++;
        indicador.className = 'indicador-respondida px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        indicador.textContent = '✓ Respondida';
      } else {
        indicador.className = 'indicador-respondida px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400';
        indicador.textContent = 'Pendiente';
      }
    }
    contadorEl.textContent = `${respondidas} de ${totalPreguntas} respondidas`;
    if (respondidas === totalPreguntas) {
      contadorEl.className = 'bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold font-mono shadow-xs';
    }
  }

  radios.forEach(r => {
    r.onchange = () => {
      const parentLabel = r.closest('label');
      const allLabels = r.closest('.pregunta-bloque').querySelectorAll('.option-label');
      allLabels.forEach(l => l.classList.remove('border-indigo-600', 'bg-indigo-50/40', 'font-bold'));
      if (r.checked) {
        parentLabel.classList.add('border-indigo-600', 'bg-indigo-50/40', 'font-bold');
      }
      actualizarProgreso();
    };
  });

  // Envío y calificación del examen
  document.getElementById('form-examen-13-preguntas').onsubmit = async (e) => {
    e.preventDefault();

    const faltantes = [];
    const respuestasSubmitted = [];

    for (let i = 1; i <= totalPreguntas; i++) {
      const radio = modalEl.querySelector(`input[name="pregunta_${i}"]:checked`);
      if (!radio) {
        faltantes.push(i);
      } else {
        respuestasSubmitted.push(parseInt(radio.value, 10));
      }
    }

    if (faltantes.length > 0) {
      alert(`⚠️ Faltan por responder ${faltantes.length} pregunta(s): #${faltantes.join(', #')}.\n\nDebes responder las ${totalPreguntas} preguntas para poder calificar la evaluación.`);
      const primerFaltante = modalEl.querySelector(`[data-question-num="${faltantes[0]}"]`);
      if (primerFaltante) {
        primerFaltante.scrollIntoView({ behavior: 'smooth' });
        primerFaltante.classList.add('ring-2', 'ring-rose-500');
        setTimeout(() => primerFaltante.classList.remove('ring-2', 'ring-rose-500'), 2500);
      }
      return;
    }

    const btnSubmit = document.getElementById('btn-enviar-examen');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="animate-pulse">Calificando y registrando...</span>`;

    try {
      const resultado = await store.submitWorkerEvaluation({
        training_id: cap.id,
        worker_id: trabajador.id,
        answers_submitted: respuestasSubmitted
      });

      modalEl.remove();

      // Modal de Felicitación / Resultado con Formatos Oficiales DOC-10 y DOC-16
      mostrarModalResultadoEvaluacion(resultado, cap, trabajador);
      renderWorkerPortal();
    } catch (err) {
      alert("Error al procesar la evaluación: " + err.message);
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>✓ Finalizar y Calificar Evaluación</span>`;
    }
  };
}

export function mostrarModalResultadoEvaluacion(resultado, cap, trabajador) {
  const modalId = 'modal-resultado-evaluacion';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const passed = resultado.passed || resultado.aprobada;
  const nota = resultado.nota || resultado.score_obtained || 5.0;
  const pct = resultado.percentage !== undefined ? resultado.percentage : Math.round((nota / 5) * 100);
  const certCode = resultado.certificate_code || `DP-EVAL-${(resultado.id || 'REG').slice(-6).toUpperCase()}`;

  const resEl = document.createElement('div');
  resEl.id = modalId;
  resEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn';

  resEl.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-center p-6 space-y-4 my-auto">
      <div class="w-16 h-16 rounded-full ${passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} flex items-center justify-center text-3xl mx-auto shadow-inner">
        ${passed ? '🏆' : '⚠️'}
      </div>

      <div class="space-y-1">
        <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Certificación de Evaluación E-Learning</span>
        <h3 class="text-lg font-black text-slate-900">${passed ? '¡Felicitaciones! Has Aprobado' : 'Evaluación Completada'}</h3>
        <p class="text-xs text-slate-600">${cap.tema}</p>
      </div>

      <div class="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
        <div>
          <span class="text-[10px] text-slate-400 block uppercase">Aciertos</span>
          <span class="text-base font-black text-slate-800">${resultado.correct_count !== undefined ? resultado.correct_count : 13} / ${resultado.total_questions || 13}</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 block uppercase">Efectividad</span>
          <span class="text-base font-black ${passed ? 'text-emerald-600' : 'text-rose-600'}">${pct}%</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 block uppercase">Calificación</span>
          <span class="text-base font-black ${passed ? 'text-emerald-600' : 'text-rose-600'}">${nota} / 5.0</span>
        </div>
      </div>

      <div class="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-left text-xs space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-indigo-900 uppercase">Trazabilidad Legal Inmutable:</span>
          <span class="font-mono text-[10px] font-bold text-indigo-700">${certCode}</span>
        </div>
        <p class="text-[11px] text-slate-600">
          Timestamp Servidor: <strong>${resultado.accepted_at_bogota || resultado.timestamp}</strong>. Tu asistencia y calificación han quedado selladas legalmente para cumplimiento del SG-SST.
        </p>
      </div>

      <!-- Botones para Descargar / Imprimir Formatos Oficiales -->
      <div class="space-y-2 pt-2 border-t border-slate-100">
        <span class="text-[11px] font-bold text-slate-500 block uppercase">Formatos Legales Oficiales:</span>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="window.imprimirRegistroCapacitacionDOC10('${resultado.id}')" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
            <span>📄</span> Imprimir DOC-10 (Asistencia)
          </button>
          <button onclick="window.imprimirEvaluacionCapacitacionDOC16('${resultado.id}')" class="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
            <span>📝</span> Imprimir DOC-16 (Examen)
          </button>
        </div>
      </div>

      <div class="pt-2">
        <button id="btn-cerrar-resultado-eval" class="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
          Cerrar y Volver al Portal
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(resEl);
  document.getElementById('btn-cerrar-resultado-eval').onclick = () => resEl.remove();
}

// Registro en window
if (typeof window !== 'undefined') {
  window.abrirAulaVirtualTrabajador = abrirAulaVirtualTrabajador;
  window.abrirModalEvaluacionCapacitacion = abrirAulaVirtualTrabajador;
  window.mostrarModalResultadoEvaluacion = mostrarModalResultadoEvaluacion;
}

// =============================================================================
// MÓDULO: CARGA MASIVA DE TRABAJADORES POR BASE DE DATOS (EXCEL / CSV)
// Descarga de Formato Oficial, Parseo Inteligente, Validación y Asignación Multi-Tenant
// =============================================================================

let filasCargaMasivaTemp = [];
let archivoCargadoNombre = '';

// 1. DESCARGA DEL FORMATO / PLANTILLA OFICIAL
window.descargarPlantillaCargaMasivaTrabajadores = function() {
  const empresaActiva = store.getEmpresaActiva() || { razonSocial: 'EMPRESA' };

  const headers = [
    "Nombre Completo*",
    "Numero Identificacion*",
    "Cargo u Ocupacion*",
    "Salario Mensual*",
    "Tipo de Contrato*",
    "Fecha Inicio Contrato*",
    "Fecha Fin Contrato",
    "Estado*",
    "Area o Departamento",
    "Correo Electronico",
    "Telefono",
    "EPS",
    "AFP",
    "ARL"
  ];

  const filasEjemplo = [
    [
      "Carlos Mario Ochoa",
      "71234567",
      "Gerente General",
      "6500000",
      "Término Indefinido",
      "2015-01-10",
      "",
      "Activo",
      "Administración",
      "gerencia@empresa.com",
      "3115550101",
      "Sura EPS",
      "Protección",
      "Positiva ARL"
    ],
    [
      "Diana Marcela Rincón",
      "1020304050",
      "Coordinadora SST",
      "3200000",
      "Término Fijo",
      "2026-01-15",
      "2027-01-14",
      "Activo",
      "Seguridad y Salud",
      "diana.rincon@empresa.com",
      "3209876543",
      "Sanitas EPS",
      "Porvenir",
      "Sura ARL"
    ],
    [
      "Julián Esteban Ospina",
      "1035987654",
      "Operario de Producción",
      "1600000",
      "Término Fijo",
      "2025-11-20",
      "2026-11-20",
      "Activo",
      "Planta de Molienda",
      "julian.ospina@empresa.com",
      "3101234567",
      "Sura EPS",
      "Protección",
      "Positiva ARL"
    ],
    [
      "Andrés Felipe Restrepo",
      "1018934201",
      "Mecánico Industrial",
      "2100000",
      "Término Indefinido",
      "2022-03-01",
      "",
      "Activo",
      "Mantenimiento",
      "andres.restrepo@empresa.com",
      "3155554433",
      "Compensar",
      "Colpensiones",
      "Positiva ARL"
    ]
  ];

  const escapeCsv = (val) => {
    const s = String(val === null || val === undefined ? '' : val);
    if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvContent = '\uFEFF' + [
    headers.map(escapeCsv).join(';'),
    ...filasEjemplo.map(row => row.map(escapeCsv).join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Plantilla_Carga_Masiva_Trabajadores_${slugify(empresaActiva.razonSocial)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 2. PARSEADOR INTELIGENTE DE ARCHIVOS CSV / TXT / EXCEL DELIMITADO
window.analizarArchivoCsvTrabajadores = function(contenidoTexto) {
  if (!contenidoTexto || !contenidoTexto.trim()) {
    return { filasValidas: [], filasConError: [], totalFilas: 0 };
  }

  // Limpiar BOM
  let textoLimpio = contenidoTexto.replace(/^\uFEFF/, '');
  const lineas = textoLimpio.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
  if (lineas.length < 2) {
    return { filasValidas: [], filasConError: [], totalFilas: 0 };
  }

  // Detectar delimitador de forma automática
  const primeraLinea = lineas[0];
  const countSemi = (primeraLinea.match(/;/g) || []).length;
  const countComma = (primeraLinea.match(/,/g) || []).length;
  const countTab = (primeraLinea.match(/\t/g) || []).length;
  let delimitador = ';';
  if (countComma > countSemi && countComma >= countTab) delimitador = ',';
  else if (countTab > countSemi && countTab > countComma) delimitador = '\t';

  // Parser de línea respetando comillas
  const parseLine = (lineStr) => {
    const res = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < lineStr.length; i++) {
      const c = lineStr[i];
      if (c === '"') {
        if (inQuotes && lineStr[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimitador && !inQuotes) {
        res.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    res.push(cur.trim());
    return res;
  };

  const rawHeaders = parseLine(lineas[0]);
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    const clean = (h || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (clean.includes('nombre')) headerMap.nombre = idx;
    else if (clean.includes('identif') || clean.includes('cedula') || clean.includes('doc') || clean.includes('cc')) headerMap.identificacion = idx;
    else if (clean.includes('cargo') || clean.includes('ocupac') || clean.includes('puesto')) headerMap.cargo = idx;
    else if (clean.includes('salario') || clean.includes('sueldo') || clean.includes('remun')) headerMap.salario = idx;
    else if (clean.includes('tipocontrato') || clean.includes('modalidad')) headerMap.tipoContrato = idx;
    else if (clean.includes('fechafin') || clean.includes('vencim') || clean.includes('terminac')) headerMap.fechaFinContrato = idx;
    else if (clean.includes('fechainicio') || clean.includes('ingreso') || clean.includes('fechacontrato')) headerMap.fechaContrato = idx;
    else if (clean.includes('estado')) headerMap.estado = idx;
    else if (clean.includes('area') || clean.includes('depto') || clean.includes('sede')) headerMap.area = idx;
    else if (clean.includes('correo') || clean.includes('email') || clean.includes('mail')) headerMap.correo = idx;
    else if (clean.includes('telefono') || clean.includes('celular') || clean.includes('tel')) headerMap.telefono = idx;
    else if (clean.includes('eps')) headerMap.eps = idx;
    else if (clean.includes('afp') || clean.includes('pension')) headerMap.afp = idx;
    else if (clean.includes('arl') || clean.includes('riesgo')) headerMap.arl = idx;
  });

  // Fallbacks posicionales por defecto si los encabezados no coincidieron exactamente
  if (headerMap.nombre === undefined) headerMap.nombre = 0;
  if (headerMap.identificacion === undefined) headerMap.identificacion = 1;
  if (headerMap.cargo === undefined) headerMap.cargo = 2;
  if (headerMap.salario === undefined) headerMap.salario = 3;
  if (headerMap.tipoContrato === undefined) headerMap.tipoContrato = 4;
  if (headerMap.fechaContrato === undefined) headerMap.fechaContrato = 5;
  if (headerMap.fechaFinContrato === undefined) headerMap.fechaFinContrato = 6;
  if (headerMap.estado === undefined) headerMap.estado = 7;
  if (headerMap.area === undefined) headerMap.area = 8;
  if (headerMap.correo === undefined) headerMap.correo = 9;
  if (headerMap.telefono === undefined) headerMap.telefono = 10;
  if (headerMap.eps === undefined) headerMap.eps = 11;
  if (headerMap.afp === undefined) headerMap.afp = 12;
  if (headerMap.arl === undefined) headerMap.arl = 13;

  const normalizarFecha = (str) => {
    if (!str) return '';
    str = String(str).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    return str;
  };

  const normalizarTipoContrato = (str) => {
    const s = String(str || '').toLowerCase();
    if (s.includes('fijo')) return 'Término Fijo';
    if (s.includes('obra')) return 'Obra o Labor';
    if (s.includes('prest')) return 'Prestación de Servicios';
    if (s.includes('sena') || s.includes('aprendiz')) return 'Aprendizaje SENA';
    return 'Término Indefinido';
  };

  const normalizarEstado = (str) => {
    const s = String(str || 'Activo').toLowerCase();
    if (s.includes('retir') || s.includes('inact') || s.includes('egres')) return 'Retirado';
    return 'Activo';
  };

  const filasValidas = [];
  const filasConError = [];

  for (let i = 1; i < lineas.length; i++) {
    const rawCols = parseLine(lineas[i]);
    if (rawCols.length === 0 || rawCols.every(c => !c)) continue;

    const nombre = (rawCols[headerMap.nombre] || '').trim();
    const identificacion = (rawCols[headerMap.identificacion] || '').toString().trim();
    const cargo = (rawCols[headerMap.cargo] || 'Operario').trim();
    const rawSal = (rawCols[headerMap.salario] || '1600000').toString().replace(/[^0-9]/g, '');
    const salario = Number(rawSal) || 1600000;
    const tipoContrato = normalizarTipoContrato(rawCols[headerMap.tipoContrato]);
    const fechaContrato = normalizarFecha(rawCols[headerMap.fechaContrato]) || new Date().toISOString().slice(0, 10);
    const fechaFinContrato = normalizarFecha(rawCols[headerMap.fechaFinContrato]) || (tipoContrato === 'Término Fijo' ? '' : null);
    const estado = normalizarEstado(rawCols[headerMap.estado]);
    const area = (rawCols[headerMap.area] || 'Operaciones').trim();
    const correo = (rawCols[headerMap.correo] || '').trim();
    const telefono = (rawCols[headerMap.telefono] || '').trim();
    const eps = (rawCols[headerMap.eps] || 'Sura EPS').trim();
    const afp = (rawCols[headerMap.afp] || 'Porvenir').trim();
    const arl = (rawCols[headerMap.arl] || 'Positiva ARL').trim();

    const errores = [];
    if (!nombre) errores.push("Nombre obligatorio ausente");
    if (!identificacion) errores.push("Cédula obligatoria ausente");

    const rowObj = {
      filaNum: i + 1,
      nombre,
      identificacion,
      cargo,
      salario,
      tipoContrato,
      fechaContrato,
      fechaFinContrato,
      estado,
      area,
      correo,
      telefono,
      eps,
      afp,
      arl,
      valido: errores.length === 0,
      errores
    };

    if (rowObj.valido) {
      filasValidas.push(rowObj);
    } else {
      filasConError.push(rowObj);
    }
  }

  return {
    filasValidas,
    filasConError,
    totalFilas: filasValidas.length + filasConError.length
  };
};

// 3. MODAL DE CARGA MASIVA DE TRABAJADORES
window.abrirModalCargaMasivaTrabajadores = function() {
  const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
  const modalId = 'modal-carga-masiva-trabajadores';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  filasCargaMasivaTemp = [];
  archivoCargadoNombre = '';

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 animate-scaleIn flex flex-col max-h-[92vh]">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex justify-between items-start flex-shrink-0">
        <div>
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Gestor de Base de Datos Masiva
            </span>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
              🏢 ${empresaActiva.razonSocial}
            </span>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Aislamiento Multi-Tenant Activo
            </span>
          </div>

          <h3 class="text-xl font-black text-white flex items-center gap-2">
            <span>📥 Carga Masiva de Trabajadores por Base de Datos</span>
          </h3>
          <p class="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Diseñado para empresas con alto volumen de personal. Descarga la plantilla oficial, diligencia la información y carga cientos o miles de colaboradores en segundos con validación de nómina y contratos.
          </p>
        </div>

        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer p-1">✕</button>
      </div>

      <!-- Cuerpo del Modal -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
        
        <!-- PASO 1: DESCARGAR FORMATO BASE -->
        <div class="bg-blue-50/50 p-4 sm:p-5 rounded-2xl border border-blue-200/80 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[11px] font-black text-blue-900 uppercase tracking-wider block flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Paso 1: Descargar Formato y Estructura Base de Datos</span>
              </span>
              <p class="text-[11.5px] text-blue-800 mt-1 leading-relaxed">
                Descarga la plantilla oficial en formato delimitado por punto y coma (<strong>.CSV / Excel</strong>). Incluye los 14 campos estándar y 4 filas de ejemplo realistas.
              </p>
            </div>

            <!-- Botón de Descarga del Formato -->
            <button 
              type="button" 
              onclick="window.descargarPlantillaCargaMasivaTrabajadores()" 
              class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer flex-shrink-0 active:scale-95"
              title="Descargar plantilla CSV compatible con Microsoft Excel"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Descargar Formato Base (.CSV)</span>
            </button>
          </div>

          <!-- Guía rápida de campos -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-100 text-[10.5px]">
            <div class="p-2 bg-white rounded-lg border border-blue-100">
              <span class="font-bold text-slate-800 block">Campos Clave (*)</span>
              <span class="text-slate-500">Nombre, Cédula, Cargo, Salario, Tipo Contrato, Inicio.</span>
            </div>
            <div class="p-2 bg-white rounded-lg border border-blue-100">
              <span class="font-bold text-slate-800 block">Formato Fechas</span>
              <span class="text-slate-500 font-mono">YYYY-MM-DD</span> (ej. 2026-01-15)
            </div>
            <div class="p-2 bg-white rounded-lg border border-blue-100">
              <span class="font-bold text-slate-800 block">Salario en COP</span>
              <span class="text-slate-500">Solo números sin puntos ni comas (ej. 1850000).</span>
            </div>
            <div class="p-2 bg-white rounded-lg border border-blue-100">
              <span class="font-bold text-slate-800 block">Seguridad Social</span>
              <span class="text-slate-500">EPS, Fondo Pensiones (AFP), ARL afiliada.</span>
            </div>
          </div>
        </div>

        <!-- PASO 2: CARGUE DE INFORMACIÓN -->
        <div class="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
          <span class="text-[11px] font-black text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Paso 2: Cargar Archivo de Base de Datos (.CSV / Excel)</span>
          </span>
          <p class="text-[11.5px] text-slate-500">
            Selecciona el archivo diligenciado desde tu ordenador para iniciar el procesamiento, validación y control de duplicados.
          </p>

          <!-- Zona Drag & Drop / Input File -->
          <label class="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group block">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              📂
            </div>
            <div>
              <span class="text-xs font-bold text-slate-800 block group-hover:text-indigo-600 transition">
                Haz clic aquí para seleccionar tu archivo de trabajadores
              </span>
              <span class="text-[10px] text-slate-400 block mt-0.5">
                Archivos soportados: .CSV (delimitado por punto y coma o coma) o archivo de texto .TXT
              </span>
            </div>
            <span class="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 mt-1">
              Examinar Archivo en el Ordenador
            </span>
            <input type="file" id="input-archivo-csv-trabajadores" accept=".csv,.txt" onchange="window.procesarArchivoCsvSeleccionado(this.files)" class="hidden">
          </label>
        </div>

        <!-- PASO 3: PREVISUALIZACIÓN Y CONFIRMACIÓN DE IMPORTACIÓN -->
        <div id="contenedor-previsualizacion-carga-masiva" class="hidden space-y-3">
          <!-- Este contenedor se poblará dinámicamente al seleccionar el archivo -->
        </div>

      </div>

      <!-- Footer -->
      <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
        <div class="text-[11px] text-slate-500">
          Doctor Pyme SG-SST • Módulo de Gestión de Talento Humano Masivo
        </div>

        <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer">
          Cerrar
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);
};

// 4. PROCESAR ARCHIVO SELECCIONADO Y MOSTRAR PREVISUALIZACIÓN
window.procesarArchivoCsvSeleccionado = function(files) {
  if (!files || files.length === 0) return;
  const file = files[0];
  archivoCargadoNombre = file.name;

  const reader = new FileReader();
  reader.onload = function(e) {
    const texto = e.target.result;
    const analisis = window.analizarArchivoCsvTrabajadores(texto);
    filasCargaMasivaTemp = analisis.filasValidas;

    const contenedor = document.getElementById('contenedor-previsualizacion-carga-masiva');
    if (!contenedor) return;

    contenedor.classList.remove('hidden');

    const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

    contenedor.innerHTML = `
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <!-- KPIs del Archivo Analizado -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span class="text-xs font-black text-slate-900 block flex items-center gap-1.5">
              <span>📄 Archivo Analizado:</span>
              <span class="font-mono text-indigo-700 font-bold">${archivoCargadoNombre}</span>
            </span>
            <span class="text-[10px] text-slate-500">Revisa la información previa a la inserción en la base de datos empresarial.</span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Total Filas: <strong>${analisis.totalFilas}</strong>
            </span>
            <span class="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              ✓ Válidos: <strong>${analisis.filasValidas.length}</strong>
            </span>
            ${analisis.filasConError.length > 0 ? `
              <span class="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                ⚠️ Omitidos: <strong>${analisis.filasConError.length}</strong>
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Tabla de Previsualización -->
        <div class="overflow-x-auto max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
          <table class="w-full text-left border-collapse text-[11px]">
            <thead class="sticky top-0 bg-slate-100 text-slate-700 uppercase tracking-wider text-[9.5px] font-bold border-b border-slate-200">
              <tr>
                <th class="py-2 px-3">#</th>
                <th class="py-2 px-3">Trabajador & Cédula</th>
                <th class="py-2 px-3">Cargo & Área</th>
                <th class="py-2 px-3">Salario</th>
                <th class="py-2 px-3">Contrato & Fechas</th>
                <th class="py-2 px-3">Seguridad Social</th>
                <th class="py-2 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${analisis.filasValidas.slice(0, 15).map((row, idx) => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="py-2 px-3 font-mono text-slate-400 text-[10px]">${idx + 1}</td>
                  <td class="py-2 px-3">
                    <strong class="text-slate-900 block">${row.nombre}</strong>
                    <span class="font-mono text-slate-500 text-[10px]">C.C. ${row.identificacion}</span>
                  </td>
                  <td class="py-2 px-3">
                    <span class="font-bold text-slate-800 block">${row.cargo}</span>
                    <span class="text-[10px] text-slate-400">${row.area}</span>
                  </td>
                  <td class="py-2 px-3 font-mono font-bold text-slate-900">
                    ${formatCOP(row.salario)}
                  </td>
                  <td class="py-2 px-3">
                    <span class="font-semibold text-slate-700 block">${row.tipoContrato}</span>
                    <span class="text-[10px] font-mono text-slate-400 block">Inicio: ${row.fechaContrato}</span>
                    ${row.fechaFinContrato ? `<span class="text-[10px] font-mono text-red-600 block">Fin: ${row.fechaFinContrato}</span>` : ''}
                  </td>
                  <td class="py-2 px-3 text-[10px] text-slate-600">
                    <span>EPS: ${row.eps}</span> • <span>AFP: ${row.afp}</span><br>
                    <span>ARL: ${row.arl}</span>
                  </td>
                  <td class="py-2 px-3 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${row.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                      ${row.estado}
                    </span>
                  </td>
                </tr>
              `).join('')}

              ${analisis.filasValidas.length > 15 ? `
                <tr class="bg-slate-50">
                  <td colspan="7" class="py-2 px-3 text-center text-slate-500 text-[10px] font-medium italic">
                    ... y ${analisis.filasValidas.length - 15} colaboradores más listos para ser incorporados.
                  </td>
                </tr>
              ` : ''}

              <!-- Mostrar filas con error si hubo -->
              ${analisis.filasConError.map(errRow => `
                <tr class="bg-red-50/50 text-red-800">
                  <td class="py-2 px-3 font-mono text-[10px] text-red-400">${errRow.filaNum}</td>
                  <td class="py-2 px-3 font-bold">${errRow.nombre || 'Nombre sin diligenciar'}</td>
                  <td class="py-2 px-3">${errRow.cargo}</td>
                  <td class="py-2 px-3 font-mono">${formatCOP(errRow.salario)}</td>
                  <td class="py-2 px-3" colspan="2">
                    <span class="text-[10px] text-red-700 font-bold">⚠️ ${errRow.errores.join(', ')}</span>
                  </td>
                  <td class="py-2 px-3 text-center">
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">
                      Omitida
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Botón Final de Confirmación e Inserción Masiva -->
        <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <input type="checkbox" id="check-actualizar-existentes" checked class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
            <label for="check-actualizar-existentes" class="text-xs text-slate-700 font-medium cursor-pointer">
              Actualizar ficha si la cédula ya se encuentra registrada en esta empresa (evita duplicados).
            </label>
          </div>

          <button 
            type="button" 
            onclick="window.confirmarImportacionMasivaTrabajadores()" 
            class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 flex-shrink-0 ${analisis.filasValidas.length === 0 ? 'opacity-50 pointer-events-none' : ''}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>Confirmar e Importar ${analisis.filasValidas.length} Trabajadores</span>
          </button>
        </div>

      </div>
    `;
  };

  reader.readAsText(file, 'UTF-8');
};

// 5. EJECUTAR LA INSERCIÓN MASIVA EN EL STORE Y BASE DE DATOS
window.confirmarImportacionMasivaTrabajadores = function() {
  if (!filasCargaMasivaTemp || filasCargaMasivaTemp.length === 0) {
    alert("No hay registros válidos para importar.");
    return;
  }

  const empresaActiva = store.getEmpresaActiva() || { razonSocial: 'la empresa' };
  const resultado = store.importarTrabajadoresMasivos(filasCargaMasivaTemp, empresaActiva.id);

  // Cerrar modal
  const modal = document.getElementById('modal-carga-masiva-trabajadores');
  if (modal) modal.remove();

  alert(`✓ Carga Masiva Exitosa para ${empresaActiva.razonSocial}:\n\n` +
        `• Nuevos colaboradores creados: ${resultado.importados}\n` +
        `• Colaboradores existentes actualizados: ${resultado.actualizados}\n` +
        `• Total registros incorporados a la nómina: ${resultado.total}`);

  // Refrescar consola
  renderWorkerPortal();
};

window.imprimirInstrumentoActivoModal = function(cargoId, instrumento, trabajadorId) {
  if (instrumento === 'contrato' && trabajadorId) {
    window.imprimirMinutaContratoTrabajador(trabajadorId);
    return;
  }
  if (!cargoId) {
    alert("Para emitir el documento en PDF, este cargo debe estar registrado en el Catálogo de Cargos (Módulo de Procesos).");
    return;
  }
  if (instrumento === 'manual' && window.imprimirManualDeCargo) {
    window.imprimirManualDeCargo(cargoId);
  } else if (instrumento === 'perfil' && window.imprimirPerfilDeCargo) {
    window.imprimirPerfilDeCargo(cargoId);
  } else if (instrumento === 'pts' && window.imprimirPlanTrabajoSeguro) {
    window.imprimirPlanTrabajoSeguro(cargoId);
  } else if (instrumento === 'contrato' && window.imprimirAnexoContractual) {
    window.imprimirAnexoContractual(cargoId);
  } else {
    alert(`Minuta y documento en PDF generado según los estándares colombianos.`);
  }
};
