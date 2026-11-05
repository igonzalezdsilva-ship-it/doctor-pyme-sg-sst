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

export function obtenerUrlFirmaTrabajador(trab) {
  if (!trab) return '';
  // Si tiene el trazo Base64 en memoria (data:image/...), mostrarlo directamente para cero latencia y evitar caché del navegador
  if (trab.signature_svg && String(trab.signature_svg).startsWith('data:image')) {
    return trab.signature_svg;
  }
  // Si tiene URL de archivo guardado, agregar timestamp/hash de cache-busting
  if (trab.signature_url) {
    const sep = trab.signature_url.includes('?') ? '&' : '?';
    const buster = trab.signature_sha256 ? trab.signature_sha256.substring(0, 10) : (trab.signature_registered_at ? Date.parse(trab.signature_registered_at) : Date.now());
    return `${trab.signature_url}${sep}_t=${buster}`;
  }
  return trab.signature_svg || '';
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

            <!-- BOTÓN ASIGNAR ENTREGA DE EPP / DOTACIÓN (BLOQUE 2) -->
            <button onclick="window.abrirModalAsignarEntregaEPP()" class="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-900/30 active:scale-95" title="Asignar entrega formal de EPP y Dotación según Matriz del Cargo (Res. 0312 Estándar 4.2.6)">
              <span>📦</span>
              <span>Asignar Entrega de EPP / Dotación</span>
            </button>

            <!-- BOTÓN CARGA MASIVA DE TRABAJADORES (BASE DE DATOS) -->
            <button onclick="window.abrirModalCargaMasivaTrabajadores()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-900/30 active:scale-95" title="Importar base de datos masiva de trabajadores en Excel / CSV">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <span>📥 Carga Masiva (Base de Datos)</span>
            </button>

            <!-- BOTÓN PARAMETRIZACIÓN DEL CATÁLOGO MAESTRO DE EPP -->
            <button onclick="window.abrirModalAdministrarCatalogoEPP()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-900/30 active:scale-95" title="Parametrizar el Catálogo Maestro de EPP y Dotación de la empresa">
              <span>⚙️</span>
              <span>Catálogo Maestro EPP</span>
            </button>

            <!-- BOTÓN AUDITORÍA DE SOCIALIZACIÓN Y FIRMA DE MANUALES (ESTÁNDAR 1.1.2) -->
            <button onclick="window.abrirModalAuditoriaManuales()" class="px-4 py-2.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-900/30 active:scale-95" title="Auditoría de Socialización y Firmas de Manuales de Cargo (Res. 0312 Estándar 1.1.2)">
              <span>📋</span>
              <span>Auditoría Firmas Manuales (Est. 1.1.2)</span>
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
                <th class="py-3.5 px-4 text-center">Instrumentos Oficiales & Expediente Laboral (SG-SST)</th>
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
                const comp = store.calculateFolderCompleteness ? store.calculateFolderCompleteness(t.id) : { isComplete: false, presentCount: 0, totalRequired: 5 };

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

                        <!-- 5. Carpeta / Expediente Digital del Trabajador -->
                        <button onclick="window.abrirModalCarpetaTrabajador('${t.id}')" class="px-2 py-1 ${comp.isComplete ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-600' : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-indigo-600'} hover:text-white rounded-md text-[10px] font-bold border transition shadow-2xs cursor-pointer flex items-center gap-1" title="Expediente Laboral Digital (${comp.presentCount}/${comp.totalRequired} documentos)">
                          <span>📁</span>
                          <span>Carpeta</span>
                          <span class="px-1 py-0.2 rounded-full text-[8.5px] font-mono font-bold ${comp.isComplete ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}">${comp.presentCount}/${comp.totalRequired}</span>
                        </button>

                      </div>
                    </td>

                    <!-- Acciones -->
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        
                        <!-- Firma Digital Base (Ley 527/1999) -->
                        ${t.has_registered_signature ? `
                          <button onclick="window.abrirModalRegistroFirmaTrabajador('${t.id}')" class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs" title="Firma Digital Base Registrada (Ley 527/1999) - Clic para ver o actualizar">
                            <span>✍️</span>
                            <span>Firma OK</span>
                          </button>
                        ` : `
                          <button onclick="window.abrirModalRegistroFirmaTrabajador('${t.id}')" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs" title="Registrar Firma Digital Base del Trabajador">
                            <span>✍️</span>
                            <span>Sin Firma</span>
                          </button>
                        `}

                        <button onclick="window.abrirModalAsignarEntregaEPP('${t.id}')" class="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-300 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-2xs" title="Asignar Dotación o EPP a ${escapeHtml(t.nombre)}">
                          <span>📦</span>
                          <span>Entregar EPP</span>
                        </button>

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
              <input type="number" id="modal-trab-salario" required min="0" step="any" value="${trabExistente?.salario || 1600000}" placeholder="Ej. 1850000" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono">
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

        <!-- Fila 7: Firma Digital Base del Trabajador -->
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <span>✍️</span> Firma Digital Base del Trabajador (Ley 527 de 1999)
              </span>
              <span class="text-[9.5px] text-slate-500">Custodiada en MinIO S3 para estampar en contratos, manuales y actas de EPP.</span>
            </div>
            ${trabExistente?.has_registered_signature ? `
              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✓ Firma Registrada
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Sin Firma Registrada
              </span>
            `}
          </div>

          ${trabExistente ? `
            <div class="flex items-center justify-between gap-3 pt-1">
              ${trabExistente.has_registered_signature ? `
                <div class="p-1.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2">
                  <img src="${obtenerUrlFirmaTrabajador(trabExistente)}" alt="Firma" style="max-height: 38px; max-width: 130px; object-fit: contain;">
                  <span class="text-[9px] font-mono text-slate-400">IP: ${trabExistente.signature_ip_address || '127.0.0.1'}</span>
                </div>
              ` : `
                <span class="text-[10px] text-slate-400 italic">No se ha registrado trazo de firma digital para este colaborador.</span>
              `}
              <button type="button" onclick="window.abrirModalRegistroFirmaTrabajador('${trabExistente.id}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs">
                <span>✍️</span>
                <span>${trabExistente.has_registered_signature ? 'Actualizar Firma' : 'Registrar Firma Ahora'}</span>
              </button>
            </div>
          ` : `
            <p class="text-[10px] text-slate-400 italic">Podrás registrar la firma digital una vez guardada la ficha del trabajador.</p>
          `}
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

window.eliminarTrabajadorConfirm = async function(id) {
  if (confirm("¿Deseas eliminar este trabajador del sistema?")) {
    await store.deleteTrabajador(id);
    renderWorkerPortal();
  }
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

    const configCargo = store.getPerfilCargo(cargoActivo, empresaActiva.id);
    const manualCfg = configCargo?.manualFunciones || {};
    const funcData = cargoObj ? store.getJobPositionFunctions(cargoObj.id) : { sst: [], operativas: [], procesos: [] };

    // Verificar si el trabajador en contexto ya firmó este documento
    const docSigs = store.data.employee_document_signatures || [];
    const sigFound = trabajadorContexto
      ? docSigs.find(s => (s.employee_id === trabajadorContexto.id || s.trabajadorId === trabajadorContexto.id) && (s.document_type === 'MANUAL_DE_CARGO' || (s.document_type || '').includes('MANUAL')))
      : null;
    const isFirmado = !!sigFound;

    const deptoArea = cargoObj?.department || (funcData.procesos.length > 0 ? funcData.procesos.join(', ') : (trabajadorContexto?.area || 'Operaciones y Producción'));
    const jefeInmediato = cargoObj?.parent_job_position_title || (cargoObj?.hierarchy_level === 'Directivo' ? 'Junta Directiva / Representante Legal' : 'Gerencia General / Líder de Proceso');
    const propositoGeneral = cargoObj?.job_objective || manualCfg.propositoGeneral || cargoObj?.summary_objective || configCargo?.perfil?.objetivo || `Desempeñar con excelencia técnica, compromiso ético y estricto apego a las normas operacionales las actividades asignadas al puesto de ${cargoActivo}, garantizando la preservación de la vida, salud y bienestar integral en el marco del SG-SST y la protección del medio ambiente.`;

    const educacionFormal = cargoObj?.required_education || configCargo?.perfil?.educacion || 'Bachiller Académico o Técnico Laboral';
    const formacionSST = configCargo?.perfil?.formacionSST || 'Inducción General SG-SST, Curso Virtual 50/20 Horas SG-SST (Dec. 1072/2015), Protocolos de Bioseguridad y Manejo de Emergencias (Res. 0312/2019)';
    const experienciaRequerida = cargoObj?.required_experience || configCargo?.perfil?.experiencia || '1 año en labores afines a la operación o al sector productivo';
    const personalidadSkills = (cargoObj?.personality_skills && cargoObj.personality_skills.length > 0)
      ? cargoObj.personality_skills
      : ['Liderazgo y comunicación asertiva', 'Disciplina operacional y autocuidado', 'Capacidad de análisis y resolución de problemas', 'Trabajo en equipo y adaptabilidad', 'Orientación a la calidad y mejora continua'];

    const funcionesLines = (cargoObj?.operational_functions && cargoObj.operational_functions.length > 0)
      ? cargoObj.operational_functions
      : ((manualCfg.funcionesOperativas && manualCfg.funcionesOperativas.length > 0)
          ? manualCfg.funcionesOperativas
          : (funcData.operativas && funcData.operativas.length > 0 ? funcData.operativas : [
              `Ejecutar las labores diarias y secuenciales asignadas al puesto de ${cargoActivo} cumpliendo los estándares de calidad y seguridad.`,
              'Inspeccionar y verificar el estado óptimo de las herramientas, maquinarias y equipos antes de iniciar operaciones.',
              'Mantener el orden, aseo estricto (5S) y organización en su área de influencia operativa.',
              'Notificar de inmediato al superior jerárquico cualquier falla, desviación o condición subestándar en los procesos.',
              'Participar en el diligenciamiento de bitácoras, listas de chequeo preoperacional y controles de entrega de turno.'
            ]));

    const sstLines = (cargoObj?.sst_responsibilities && cargoObj.sst_responsibilities.length > 0)
      ? cargoObj.sst_responsibilities
      : ((manualCfg.responsabilidadesSST && manualCfg.responsabilidadesSST.length > 0)
          ? manualCfg.responsabilidadesSST
          : (funcData.sst && funcData.sst.length > 0 ? funcData.sst : [
              'Procurar el cuidado integral de su salud física y mental en el desarrollo de sus actividades laborales (Dec. 1072/2015 Art. 2.2.4.6.10 Num. 1).',
              'Suministrar información clara, veraz y completa sobre su estado de salud al empleador o área de SST (Dec. 1072/2015 Num. 2).',
              'Cumplir a cabalidad las normas, reglamentos, instrucciones y procedimientos de trabajo seguro del SG-SST (Dec. 1072/2015 Num. 3).',
              'Informar oportunamente al empleador o supervisor sobre los peligros y riesgos latentes detectados en su puesto o área de trabajo (Num. 4).',
              'Participar activamente en las actividades de capacitación, inducción y simulacros de emergencia programados en el Plan Anual (Num. 5).',
              'Participar y contribuir activamente al cumplimiento de los objetivos y metas del SG-SST de la empresa (Num. 6).',
              'Reportar de forma inmediata todo incidente, accidente de trabajo o condición insegura a la coordinación de SST.',
              'Participar en los programas de vigilancia epidemiológica ocupacional y apoyar la labor de los comités paritarios (COPASST / Convivencia).'
            ]));

    const autoridadAlcance = cargoObj?.authority_scope || 'Autoridad técnica y operacional en su puesto de trabajo. Coordinación directa de labores encomendadas, gestión de recursos operativos y custodia de maquinaria, herramientas e insumos asignados.';
    const suspensionFacultad = cargoObj?.suspension_faculty || 'Facultad expresa y obligatoria para suspender de forma inmediata cualquier labor o actividad en caso de constatar un riesgo grave o inminente para la vida o la salud, o ante la ausencia o deterioro de Elementos de Protección Personal (EPP), notificando de inmediato a la jefatura de SST.';

    const codigoManual = `MAN-${cargoObj?.code || 'CARG-001'}`;

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
              ${infoInst.norma}. Consulta y visualiza en tiempo real los instrumentos institucionales de talento humano y SST.
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
                onclick="window.imprimirInstrumentoActivoModal('${cargoObj ? cargoObj.id : cargoActivo}', '${instrumentoActivo}', '${trabajadorContexto ? trabajadorContexto.id : ''}')" 
                class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>🖨️ Generar y Descargar Minuta en PDF</span>
              </button>
            </div>
          </div>

          <!-- =================================================================== -->
          <!-- VISUALIZADOR OFICIAL DEL INSTRUMENTO EN PANTALLA                    -->
          <!-- =================================================================== -->
          ${instrumentoActivo === 'manual' ? `
            <div class="bg-white rounded-2xl border-2 border-purple-200 shadow-sm overflow-hidden space-y-4 p-5">
              <!-- Encabezado Contractual y Control Documental -->
              <div class="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span class="text-[10px] uppercase tracking-wider font-mono text-purple-200 block font-bold">Documento Institucional Vinculante & Anexo Laboral SG-SST</span>
                  <h4 class="text-base font-black text-white">MANUAL DE CARGOS, RESPONSABILIDADES Y FUNCIONES</h4>
                  <span class="text-[11px] text-purple-200">Decreto 1072 de 2015 (Art. 2.2.4.6.8 & 2.2.4.6.10) • Resolución 0312 Estándar 1.1.2</span>
                </div>
                <div class="text-right text-[11px] font-mono bg-white/10 p-2 rounded-lg border border-white/20">
                  <div><strong>CÓDIGO:</strong> ${codigoManual}</div>
                  <div><strong>VERSIÓN:</strong> 01 • <strong>VIGENCIA:</strong> ${new Date().toLocaleDateString('es-CO')}</div>
                  <div class="text-purple-300"><strong>RETENCIÓN LEGAL:</strong> 20 Años</div>
                </div>
              </div>

              <!-- Datos Empleador y Trabajador -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <strong class="text-slate-900 block border-b pb-1 font-bold">🏢 1. DATOS DEL EMPLEADOR / CONTRATANTE:</strong>
                  <p><strong>Razón Social:</strong> ${empresaActiva.razonSocial}</p>
                  <p><strong>NIT:</strong> ${empresaActiva.nit}</p>
                  <p><strong>Dirección:</strong> ${empresaActiva.direccion || 'Calle Principal Zona Industrial'}</p>
                  <p><strong>Ciudad:</strong> ${empresaActiva.ciudad || 'Bogotá D.C.'} • Tel: ${empresaActiva.telefono || '(601) 745-0000'}</p>
                </div>
                <div class="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1">
                  <strong class="text-purple-950 block border-b border-purple-200 pb-1 font-bold">👷 2. DATOS DEL TRABAJADOR / TITULAR:</strong>
                  <p><strong>Nombre Completo:</strong> ${trabajadorContexto ? trabajadorContexto.nombre : '<span class="italic text-slate-500">Documento General para el Cargo</span>'}</p>
                  <p><strong>Cédula:</strong> ${trabajadorContexto ? `C.C. ${trabajadorContexto.identificacion || trabajadorContexto.cedula}` : 'A convenir al contratar'}</p>
                  <p><strong>Fecha Ingreso:</strong> ${trabajadorContexto ? (trabajadorContexto.fechaIngreso || trabajadorContexto.fechaContrato || 'Al contratar') : 'Al inicio de labores'}</p>
                  <p><strong>Tipo Contrato:</strong> ${trabajadorContexto ? (trabajadorContexto.tipoContrato || 'Término Indefinido') : 'Contrato Individual de Trabajo'}</p>
                </div>
              </div>

              <!-- I. Identificación del Cargo -->
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <h5 class="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5 border-b pb-1">
                  <span class="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">I</span>
                  <span>I. Identificación y Ubicación Organizacional del Cargo</span>
                </h5>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div><strong>Nombre Oficial del Cargo:</strong> <span class="font-bold text-indigo-900">${cargoActivo}</span></div>
                  <div><strong>Nivel Jerárquico:</strong> ${cargoObj?.hierarchy_level || 'Operativo'}</div>
                  <div><strong>Departamento / Proceso:</strong> ${deptoArea}</div>
                  <div><strong>Jefe Inmediato:</strong> ${jefeInmediato}</div>
                </div>
              </div>

              <!-- II. Perfil del Cargo -->
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 class="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5 border-b pb-1">
                  <span class="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">II</span>
                  <span>II. Perfil del Cargo (Requisitos Mínimos, Competencias y Formación)</span>
                </h5>
                <div class="space-y-1 text-xs pt-1">
                  <p><strong>• Educación Formal Requerida:</strong> ${educacionFormal}</p>
                  <p><strong>• Formación Adicional & Certificaciones SG-SST:</strong> ${formacionSST}</p>
                  <p><strong>• Experiencia Laboral Mínima:</strong> ${experienciaRequerida}</p>
                  <div>
                    <strong>• Aspectos de Personalidad & Competencias:</strong>
                    <div class="flex flex-wrap gap-1 mt-1">
                      ${personalidadSkills.map(s => `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">✓ ${s}</span>`).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- III. Objetivo del Cargo -->
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 class="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5 border-b pb-1">
                  <span class="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">III</span>
                  <span>III. Objetivo y Propósito Misional del Cargo</span>
                </h5>
                <p class="text-xs text-slate-700 leading-relaxed pt-1">${propositoGeneral}</p>
                <div class="p-2.5 bg-white rounded-lg border-l-4 border-indigo-600 text-[11px] italic text-slate-600">
                  <strong>Compromiso SG-SST y Medio Ambiente:</strong> El titular del cargo se compromete a preservar su vida, su salud integral y el bienestar, cumplir estrictamente los Procedimientos de Trabajo Seguro (PTS) y proteger activamente el medio ambiente.
                </div>
              </div>

              <!-- IV. Funciones Técnicas y Operativas -->
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 class="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5 border-b pb-1">
                  <span class="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">IV</span>
                  <span>IV. Funciones Técnicas y Operativas del Cargo (Ciclo PHVA)</span>
                </h5>
                <ol class="list-decimal pl-5 space-y-1 text-xs text-slate-700 pt-1">
                  ${funcionesLines.map(f => `<li>${f}</li>`).join('')}
                </ol>
              </div>

              <!-- V. Responsabilidades en la Gerencia del SG-SST -->
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 class="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5 border-b pb-1">
                  <span class="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">V</span>
                  <span>V. Responsabilidades Legales en la Gerencia del SG-SST (Dec. 1072 & Res. 0312)</span>
                </h5>
                <ul class="list-disc pl-5 space-y-1 text-xs text-slate-700 pt-1">
                  ${sstLines.map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>

              <!-- VI. Autoridad y Alcance -->
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 class="text-xs font-black uppercase text-rose-950 flex items-center gap-1.5 border-b pb-1">
                  <span class="w-4 h-4 rounded bg-rose-600 text-white flex items-center justify-center text-[10px]">VI</span>
                  <span>VI. Autoridad, Alcance y Facultad de Suspensión por Riesgo Inminente</span>
                </h5>
                <div class="space-y-1.5 text-xs pt-1">
                  <p><strong>• Personal y Recursos Bajo su Autoridad:</strong> ${autoridadAlcance}</p>
                  <div class="p-2.5 bg-rose-50 border border-rose-200 text-rose-950 rounded-xl">
                    <strong>🛑 Facultad Expresa de Suspensión Inmediata (Cero Tolerancia al Riesgo):</strong><br>
                    ${suspensionFacultad}
                  </div>
                </div>
              </div>

              <!-- VII. Cláusula de Socialización y Firmas -->
              <div class="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                <h5 class="text-xs font-black uppercase text-amber-950 border-b border-amber-200 pb-1 flex items-center justify-between">
                  <span>VII. Socialización, Aceptación Vinculante y Firmas de Responsabilidad</span>
                  ${isFirmado ? `<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-bold">✓ Firmado Digitalmente</span>` : `<span class="px-2 py-0.5 rounded text-[10px] bg-amber-200 text-amber-900 font-bold">Pendiente de Firma</span>`}
                </h5>
                <div class="p-2.5 bg-white rounded-xl border border-amber-200 text-xs italic text-slate-700 leading-relaxed">
                  <strong>CLÁUSULA DE NOTIFICACIÓN, SOCIALIZACIÓN Y ACEPTACIÓN POR EL TRABAJADOR:</strong><br>
                  "Certifico que he recibido, leído, comprendido y aceptado en su totalidad el presente MANUAL DE CARGOS, RESPONSABILIDADES Y FUNCIONES correspondiente a mi cargo en ${empresaActiva.razonSocial}. Me comprometo a cumplir estrictamente las funciones asignadas, los procedimientos de trabajo seguro (PTS) y las directrices del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST)."
                </div>

                <!-- Firmas -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center text-xs">
                  <div class="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div class="pt-6 border-b border-slate-300 mb-2"></div>
                    <strong class="text-slate-900 block">${empresaActiva.responsableSST || 'ESP. EN SEGURIDAD Y SALUD EN EL TRABAJO'}</strong>
                    <span class="text-[10px] text-slate-500">ELABORÓ / REVISÓ (SST)</span>
                    <span class="text-[9px] text-slate-400">Lic. SST No. ${empresaActiva.licenciaSST || '15482-2022'}</span>
                  </div>

                  <div class="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div class="pt-6 border-b border-slate-300 mb-2"></div>
                    <strong class="text-slate-900 block">${empresaActiva.representanteLegal || 'REPRESENTANTE LEGAL'}</strong>
                    <span class="text-[10px] text-slate-500">APROBÓ (GERENCIA GENERAL)</span>
                    <span class="text-[9px] text-slate-400">Empleador Oficial</span>
                  </div>

                  <div class="p-2.5 bg-white rounded-xl border ${isFirmado ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'} flex flex-col justify-between">
                    ${isFirmado ? `
                      <div>
                        <img src="${sigFound.signature_image_file || sigFound.signature_svg_or_base64 || sigFound.firmaDataUrl}" alt="Firma" class="max-h-12 mx-auto object-contain">
                        <span class="text-[9px] font-mono font-bold text-emerald-700 block">✓ Sello Digital Ley 527/1999</span>
                        <span class="text-[8px] font-mono text-slate-500 block truncate">Hash: ${(sigFound.signature_sha256 || sigFound.sha256_hash || '').substring(0, 16)}...</span>
                      </div>
                    ` : `
                      <div class="pt-6 border-b border-slate-300 mb-2"></div>
                    `}
                    <strong class="text-slate-900 block">${trabajadorContexto ? trabajadorContexto.nombre : 'TITULAR DEL CARGO'}</strong>
                    <span class="text-[10px] text-slate-500">C.C. ${trabajadorContexto ? (trabajadorContexto.identificacion || trabajadorContexto.cedula) : 'Por Vincular'}</span>
                    ${(!isFirmado && trabajadorContexto) ? `
                      <button type="button" onclick="window.abrirModalFirmarDocumentoCargo('MANUAL_DE_CARGO', '${escapeHtml(cargoActivo)}', '${trabajadorContexto.id}')" class="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer">
                        ✍️ Firmar Ahora
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Botones de Acción al pie de la vista previa -->
              <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <button 
                  type="button" 
                  onclick="window.imprimirManualDeCargo('${cargoObj ? cargoObj.id : cargoActivo}', '${trabajadorContexto ? trabajadorContexto.id : ''}')"
                  class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️ Imprimir / Guardar Manual en PDF</span>
                </button>
                <button 
                  type="button" 
                  onclick="window.abrirModalAdministrarCargos('${cargoActivo}')"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>⚙️ Ajustar Parámetros del Manual</span>
                </button>
              </div>
            </div>
          ` : instrumentoActivo === 'perfil' ? `
            <div class="bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-5 space-y-4">
              <div class="bg-gradient-to-r from-amber-900 to-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 class="text-base font-black">PERFIL DEL CARGO Y COMPETENCIAS SST</h4>
                  <span class="text-[11px] text-amber-200">Resolución 0312 de 2019 Estándar 1.1.3 • Decreto 1072 de 2015</span>
                </div>
                <div class="text-right text-[11px] font-mono bg-white/10 p-2 rounded-lg">
                  <div><strong>CÓDIGO:</strong> PF-CARG-${cargoObj?.code || '001'}</div>
                  <div><strong>ESTÁNDAR:</strong> 1.1.3</div>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div class="p-3 bg-slate-50 border rounded-xl"><strong>Educación Requerida:</strong><br>${educacionFormal}</div>
                <div class="p-3 bg-slate-50 border rounded-xl"><strong>Experiencia Requerida:</strong><br>${experienciaRequerida}</div>
              </div>
              <div class="p-3.5 bg-slate-50 border rounded-xl text-xs space-y-2">
                <strong>Formación Obligatoria en SG-SST:</strong>
                <p class="text-slate-700">${formacionSST}</p>
                <strong>Competencias Clave:</strong>
                <div class="flex flex-wrap gap-1">
                  ${personalidadSkills.map(s => `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">✓ ${s}</span>`).join('')}
                </div>
              </div>
              <div class="flex justify-between items-center pt-2 border-t">
                <button type="button" onclick="window.imprimirPerfilDeCargo('${cargoObj ? cargoObj.id : cargoActivo}', '${trabajadorContexto ? trabajadorContexto.id : ''}')" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black">
                  🖨️ Imprimir Perfil en PDF
                </button>
                <button type="button" onclick="window.abrirModalAdministrarCargos('${cargoActivo}')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">
                  ⚙️ Ajustar Parámetros
                </button>
              </div>
            </div>
          ` : instrumentoActivo === 'pts' ? `
            <div class="bg-white rounded-2xl border-2 border-teal-200 shadow-sm p-5 space-y-4">
              <div class="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 class="text-base font-black">PROCEDIMIENTO DE TRABAJO SEGURO (PTS)</h4>
                  <span class="text-[11px] text-teal-200">Guía Técnica GTC 45 • Res. 0312 Estándar 4.2.1</span>
                </div>
                <div class="text-right text-[11px] font-mono bg-white/10 p-2 rounded-lg">
                  <div><strong>CÓDIGO:</strong> PTS-${cargoObj?.code || '001'}</div>
                  <div><strong>ESTÁNDAR:</strong> 4.2.1</div>
                </div>
              </div>
              <div class="p-3 bg-slate-50 border rounded-xl text-xs space-y-1.5">
                <strong>Peligros Prioritarios Evaluados (GTC 45):</strong>
                <ul class="list-disc pl-5 text-slate-700">
                  ${(configCargo?.pts?.peligrosEvaluados || ['Peligro Mecánico (atrapamiento, cortes)', 'Peligro Biomecánico (posturas forzadas, cargas)', 'Peligro Locativo y Físico (ruido, superficies)']).map(p => `<li>${p}</li>`).join('')}
                </ul>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div class="p-2.5 bg-slate-50 border rounded-xl"><strong>1. Antes:</strong><p class="text-[11px] text-slate-600 mt-0.5">${configCargo?.pts?.faseAntes || 'Inspección preoperacional de herramientas y verificación de EPP.'}</p></div>
                <div class="p-2.5 bg-slate-50 border rounded-xl"><strong>2. Durante:</strong><p class="text-[11px] text-slate-600 mt-0.5">${configCargo?.pts?.faseDurante || 'Atención exclusiva en la labor, respetar guardas y paradas de emergencia.'}</p></div>
                <div class="p-2.5 bg-slate-50 border rounded-xl"><strong>3. Después:</strong><p class="text-[11px] text-slate-600 mt-0.5">${configCargo?.pts?.faseDespues || 'Desenergizar equipos, ordenar puesto y reportar novedades al supervisor.'}</p></div>
              </div>
              <div class="flex justify-between items-center pt-2 border-t">
                <button type="button" onclick="window.imprimirPlanTrabajoSeguro('${cargoObj ? cargoObj.id : cargoActivo}')" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black">
                  🖨️ Imprimir PTS en PDF
                </button>
                <button type="button" onclick="window.abrirModalAdministrarCargos('${cargoActivo}')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">
                  ⚙️ Ajustar Parámetros
                </button>
              </div>
            </div>
          ` : instrumentoActivo === 'contrato' ? `
            <div class="bg-white rounded-2xl border-2 border-blue-200 shadow-sm p-5 space-y-4">
              <div class="bg-gradient-to-r from-blue-950 to-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 class="text-base font-black">CONTRATO INDIVIDUAL DE TRABAJO & ANEXO SST</h4>
                  <span class="text-[11px] text-blue-200">Código Sustantivo del Trabajo (CST Arts. 37-47) • 9 Cláusulas Estructuradas</span>
                </div>
                <div class="text-right text-[11px] font-mono bg-white/10 p-2 rounded-lg">
                  <div><strong>MINUTA:</strong> CST-09CL</div>
                  <div><strong>ANEXO SST:</strong> Dec. 1072/2015</div>
                </div>
              </div>
              <div class="p-3 bg-slate-50 border rounded-xl text-xs space-y-2">
                <p class="font-bold text-slate-900">Estructura Legal Vinculante en 9 Cláusulas:</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div class="p-2 bg-white rounded border"><strong>I. Objeto & Cargo:</strong> ${cargoActivo}</div>
                  <div class="p-2 bg-white rounded border"><strong>II. Duración & Fin:</strong> Término pactado / Obra</div>
                  <div class="p-2 bg-white rounded border"><strong>III. Salario & Pago:</strong> Remuneración de ley</div>
                  <div class="p-2 bg-white rounded border"><strong>IV. Protocolos SST:</strong> Dec. 1072 / Res. 0312</div>
                  <div class="p-2 bg-white rounded border text-rose-800"><strong>V. Faltas Graves:</strong> Art. 58/62 CST</div>
                  <div class="p-2 bg-white rounded border text-indigo-800"><strong>VI. Culpa Exclusiva:</strong> Exoneración Art. 216</div>
                  <div class="p-2 bg-white rounded border"><strong>VII. Seg. Social:</strong> Salud, Pensión, ARL</div>
                  <div class="p-2 bg-white rounded border"><strong>VIII. Elementos:</strong> Dotación e inventario</div>
                  <div class="p-2 bg-white rounded border"><strong>IX. Domicilio:</strong> Acuerdo vinculante</div>
                </div>
              </div>
              <div class="flex justify-between items-center pt-2 border-t">
                <button type="button" onclick="window.imprimirInstrumentoActivoModal('${cargoObj ? cargoObj.id : cargoActivo}', 'contrato', '${trabajadorContexto ? trabajadorContexto.id : ''}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black">
                  🖨️ Generar y Descargar Minuta de Contrato (PDF)
                </button>
              </div>
            </div>
          ` : ''}

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
  const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
  const cargoObj = store.getJobPositions(empresaActiva?.id).find(j => (j.title || '').toLowerCase().trim() === (cargoName || '').toLowerCase().trim() || j.id === cargoName);
  const targetCargoId = cargoObj ? cargoObj.id : cargoName;

  if (tipo === 'contrato') {
    if (trabajadorId) {
      window.generarPdfContratoTrabajador(trabajadorId);
    } else {
      const trabs = store.getTrabajadores(empresaActiva?.id).filter(t => (t.cargo || '').toLowerCase().trim() === (cargoName || '').toLowerCase().trim());
      if (trabs.length > 0) {
        window.generarPdfContratoTrabajador(trabs[0].id);
      } else if (cargoObj && window.imprimirAnexoContractual) {
        window.imprimirAnexoContractual(cargoObj.id);
      } else {
        alert("Para generar la minuta de contrato laboral, selecciona un trabajador asignado a este cargo.");
      }
    }
  } else if (tipo === 'perfil') {
    if (window.imprimirPerfilDeCargo) window.imprimirPerfilDeCargo(targetCargoId, trabajadorId);
    else window.generarPdfPerfilCargo(cargoName, empresaActiva?.id);
  } else if (tipo === 'manual') {
    if (window.imprimirManualDeCargo) window.imprimirManualDeCargo(targetCargoId, trabajadorId);
    else window.generarPdfManualFunciones(cargoName, empresaActiva?.id, trabajadorId);
  } else if (tipo === 'pts') {
    if (window.imprimirPlanTrabajoSeguro) window.imprimirPlanTrabajoSeguro(targetCargoId);
    else window.generarPdfPtsCargo(cargoName, empresaActiva?.id);
  } else if (tipo === 'profesiograma') {
    if (window.imprimirProfesiograma) window.imprimirProfesiograma(targetCargoId);
  } else if (tipo === 'epp') {
    if (window.imprimirMatrizEPP) window.imprimirMatrizEPP(targetCargoId);
  } else if (tipo === 'anexo') {
    if (window.imprimirAnexoContractual) window.imprimirAnexoContractual(targetCargoId);
  }
};

window.imprimirInstrumentoActivoModal = function(cargoId, tipoInstrumento, trabajadorId) {
  let cargoObj = cargoId ? store.getJobPosition(cargoId) : null;
  if (!cargoObj && cargoId) {
    const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
    cargoObj = store.getJobPositions(empresaActiva?.id).find(j => (j.title || '').toLowerCase().trim() === String(cargoId).toLowerCase().trim());
  }
  if (!cargoObj && trabajadorId) {
    const t = store.getTrabajadorPorId(trabajadorId);
    if (t?.job_position_id) cargoObj = store.getJobPosition(t.job_position_id);
    if (!cargoObj && t?.cargo) {
      const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
      cargoObj = store.getJobPositions(empresaActiva?.id).find(j => (j.title || '').toLowerCase().trim() === (t.cargo || '').toLowerCase().trim());
    }
  }
  const cargoName = cargoObj ? cargoObj.title : (cargoId || '');
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
    const cargoObjAdmin = (store.data.job_positions || []).find(j => 
      store._matchTenant(j.tenant_id, empresaActiva.id) && 
      ((j.title || '').toLowerCase().trim() === cargoActivo.toLowerCase().trim() || j.id === cargoActivo)
    );

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

          <!-- SUB-PESTAÑA 2: MANUAL DE CARGOS, RESPONSABILIDADES Y FUNCIONES -->
          ${pestanaActiva === 'manual' ? `
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Manual de Cargos, Responsabilidades y Funciones</h4>
                  <span class="text-[10px] text-slate-500">Decreto 1072/2015 Art. 2.2.4.6.8 & Art. 2.2.4.6.10 • Res. 0312 Estándar 1.1.2</span>
                </div>
                <button onclick="window.generarPdfManualFunciones('${cargoActivo}', '${empresaActiva.id}')" class="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                  🖨️ Descargar Manual (PDF)
                </button>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">III. Objetivo y Propósito Misional del Cargo:</label>
                <textarea id="cargo-manual-objetivo" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-sans">${cargoObjAdmin?.job_objective || configCargo.manualFunciones?.propositoGeneral || configCargo.perfil?.objetivo || ''}</textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Nivel Jerárquico:</label>
                  <select id="cargo-manual-nivel" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
                    <option value="Operativo" ${(cargoObjAdmin?.hierarchy_level === 'Operativo' || !cargoObjAdmin) ? 'selected' : ''}>Operativo</option>
                    <option value="Asistencial / Técnico" ${cargoObjAdmin?.hierarchy_level?.includes('Asistencial') || cargoObjAdmin?.hierarchy_level?.includes('Técnico') ? 'selected' : ''}>Asistencial / Técnico</option>
                    <option value="Profesional" ${cargoObjAdmin?.hierarchy_level === 'Profesional' ? 'selected' : ''}>Profesional</option>
                    <option value="Directivo" ${cargoObjAdmin?.hierarchy_level === 'Directivo' ? 'selected' : ''}>Directivo</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Departamento / Proceso:</label>
                  <input type="text" id="cargo-manual-depto" value="${cargoObjAdmin?.department || 'Operaciones y Producción'}" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Jefe Inmediato:</label>
                  <input type="text" id="cargo-manual-jefe" value="${cargoObjAdmin?.parent_job_position_title || 'Gerencia General / Líder de Proceso'}" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium">
                </div>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">IV. Funciones Técnicas y Operativas (Una por línea):</label>
                <textarea id="cargo-manual-funciones" rows="5" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs leading-relaxed font-sans">${(cargoObjAdmin?.operational_functions && cargoObjAdmin.operational_functions.length > 0 ? cargoObjAdmin.operational_functions : (configCargo.manualFunciones?.funcionesOperativas || [])).join('\n')}</textarea>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">V. Responsabilidades en la Gerencia del SG-SST (Dec. 1072 & Res. 0312 - Una por línea):</label>
                <textarea id="cargo-manual-sst" rows="5" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs leading-relaxed font-sans">${(cargoObjAdmin?.sst_responsibilities && cargoObjAdmin.sst_responsibilities.length > 0 ? cargoObjAdmin.sst_responsibilities : (configCargo.manualFunciones?.responsabilidadesSST || [])).join('\n')}</textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">VI. Autoridad y Alcance:</label>
                  <textarea id="cargo-manual-autoridad" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">${cargoObjAdmin?.authority_scope || 'Autoridad técnica y operacional en su puesto de trabajo. Coordinación directa de labores encomendadas, gestión de recursos operativos y custodia de maquinaria, herramientas e insumos asignados.'}</textarea>
                </div>
                <div>
                  <label class="block font-bold text-rose-700 mb-1">🛑 Facultad de Suspensión por Riesgo Inminente:</label>
                  <textarea id="cargo-manual-suspension" rows="2" class="w-full px-3 py-2 border border-rose-200 rounded-xl text-xs text-rose-950 bg-rose-50/50">${cargoObjAdmin?.suspension_faculty || 'Facultad expresa y obligatoria para suspender de forma inmediata cualquier labor o actividad en caso de constatar un riesgo grave o inminente para la vida o la salud, o ante la ausencia o deterioro de Elementos de Protección Personal (EPP), notificando de inmediato a la jefatura de SST.'}</textarea>
                </div>
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
            propositoGeneral: document.getElementById('cargo-manual-objetivo')?.value || configCargo.manualFunciones?.propositoGeneral,
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

        // Sincronizar simultáneamente en el catálogo de cargos job_positions
        const existingJp = (store.data.job_positions || []).find(j => 
          store._matchTenant(j.tenant_id, empresaActiva.id) && 
          ((j.title || '').toLowerCase().trim() === cargoActivo.toLowerCase().trim() || j.id === cargoActivo)
        );

        const jpRecord = {
          id: existingJp ? existingJp.id : `jp-${empresaActiva.id}-${Date.now()}`,
          tenant_id: empresaActiva.id,
          code: existingJp?.code || `CARG-${String((store.data.job_positions || []).length + 1).padStart(3, '0')}`,
          title: cargoActivo,
          department: document.getElementById('cargo-manual-depto')?.value || existingJp?.department || 'Operaciones y Producción',
          hierarchy_level: document.getElementById('cargo-manual-nivel')?.value || existingJp?.hierarchy_level || 'Operativo',
          parent_job_position_title: document.getElementById('cargo-manual-jefe')?.value || existingJp?.parent_job_position_title || 'Gerencia General / Líder de Proceso',
          job_objective: document.getElementById('cargo-manual-objetivo')?.value || document.getElementById('cargo-perfil-objetivo')?.value || existingJp?.job_objective || '',
          summary_objective: document.getElementById('cargo-manual-objetivo')?.value || existingJp?.summary_objective || '',
          required_education: document.getElementById('cargo-perfil-educacion')?.value || existingJp?.required_education || '',
          required_experience: document.getElementById('cargo-perfil-experiencia')?.value || existingJp?.required_experience || '',
          personality_skills: document.getElementById('cargo-perfil-competencias')?.value ? document.getElementById('cargo-perfil-competencias').value.split(',').map(s => s.trim()) : (existingJp?.personality_skills || []),
          operational_functions: payload.manualFunciones.funcionesOperativas || existingJp?.operational_functions || [],
          sst_responsibilities: payload.manualFunciones.responsabilidadesSST || existingJp?.sst_responsibilities || [],
          authority_scope: document.getElementById('cargo-manual-autoridad')?.value || existingJp?.authority_scope || '',
          suspension_faculty: document.getElementById('cargo-manual-suspension')?.value || existingJp?.suspension_faculty || ''
        };

        store.saveJobPosition(jpRecord, empresaActiva.id);

        alert(`✓ Parámetros y Manual del cargo "${cargoActivo}" guardados y actualizados exitosamente.`);
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

// 1. GENERADOR OFICIAL DE CONTRATO LABORAL INDIVIDUAL DE TRABAJO (9 CLÁUSULAS ESTRUCTURADAS)
window.generarPdfContratoTrabajador = function(trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) {
    alert("No se encontró el trabajador.");
    return;
  }
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva();
  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  // Obtener la estructura oficial de 9 cláusulas configurada para el cargo
  const configCargo = store.getPerfilCargo(trabajador.cargo, empresa.id);
  const anexoCfg = configCargo?.anexoContractual || {};

  const c1 = anexoCfg.clausula1_objeto || anexoCfg.notificacionRiesgos || `EL EMPLEADOR contrata los servicios personales de EL TRABAJADOR para desempeñar el cargo de ${trabajador.cargo}, ejecutando de manera directa, subordinada y diligente las funciones inherentes al puesto conforme al Manual de Funciones, Perfil de Cargo y directrices técnicas de la empresa en el marco de su objeto social.`;

  let duracionDefault = 'El presente contrato se celebra por la duración de la obra o labor encomendada / por el término pactado entre las partes. La relación laboral terminará válidamente por culminación de la labor contratada, por mutuo acuerdo entre las partes o unilateralmente con justa causa debidamente comprobada conforme al Artículo 62 del Código Sustantivo del Trabajo (CST), sin lugar a indemnización.';
  if (trabajador.tipoContrato === 'Término Fijo' && trabajador.fechaFinContrato) {
    duracionDefault = `El presente contrato se celebra a TÉRMINO FIJO con fecha de inicio el ${trabajador.fechaContrato || trabajador.fechaIngreso || 'inicio de labores'} y fecha de vencimiento pactada el ${trabajador.fechaFinContrato}. Su prórroga se regirá estrictamente por lo previsto en el Artículo 46 del Código Sustantivo del Trabajo. La terminación operará válidamente por expiración del plazo fijado con el preaviso legal de mínimo treinta (30) días, por mutuo acuerdo o unilateralmente con justa causa (Art. 62 CST).`;
  } else if (trabajador.tipoContrato === 'Término Indefinido') {
    duracionDefault = `El presente contrato se celebra a TÉRMINO INDEFINIDO a partir del ${trabajador.fechaContrato || trabajador.fechaIngreso || 'inicio de labores'}, subsistiendo mientras perduren las causas que le dieron origen y la materia del trabajo. Podrá darse por terminado válidamente por mutuo acuerdo o unilateralmente con justa causa conforme al Artículo 62 del Código Sustantivo del Trabajo.`;
  }
  const c2 = anexoCfg.clausula2_duracion || duracionDefault;

  const c3 = anexoCfg.clausula3_salario || `EL EMPLEADOR pagará a EL TRABAJADOR por la prestación de sus servicios el salario mensual de ${formatCOP(trabajador.salario)} M/CTE, pagadero en las fechas fijadas por la empresa, sobre el cual se liquidarán las prestaciones sociales de ley y los aportes al Sistema de Seguridad Social Integral conforme a la legislación laboral colombiana.`;
  const c4 = anexoCfg.clausula4_obligaciones_sst || anexoCfg.clausulaPrincipal || 'Dada la naturaleza de alto riesgo y directrices del SG-SST, EL TRABAJADOR se obliga perentoriamente a: a) Procurar el cuidado integral de su salud; b) Cumplir estrictamente los Procedimientos de Trabajo Seguro (PTS); c) Portar, inspeccionar y mantener permanentemente los EPP asignados; d) No ejecutar tareas de alto riesgo sin Permiso de Trabajo y lista de chequeo; e) Asistir a capacitaciones, simulacros y exámenes ocupacionales.';
  const c5 = anexoCfg.clausula5_faltas_graves || anexoCfg.regimenSancionatorio || 'Se califica expresamente como FALTA GRAVE (Art. 58 y Art. 62 Literal a) Num. 6 del CST, y Art. 91 Dec. 1295/94): el no uso reiterado de los EPP, el desacato de los PTS, presentarse bajo efectos de alcohol o drogas, operar maquinaria sin autorización, y cualquier omisión que comprometa la seguridad, facultando la terminación unilateral con justa causa y sin lugar a indemnización.';
  const c6 = anexoCfg.clausula6_culpa_exclusiva || 'Si ocurre un accidente de trabajo derivado de la imprudencia temeraria, desatención voluntaria, violación de los Procedimientos de Trabajo Seguro o desacato de órdenes directas de SST por parte del trabajador, dicho evento se considerará por CULPA EXCLUSIVA DEL TRABAJADOR, exonerando al empleador de responsabilidad civil ordinaria de perjuicios (Art. 216 CST).';
  const c7 = anexoCfg.clausula7_seguridad_social || 'EL EMPLEADOR afiliará y mantendrá al día las cotizaciones de EL TRABAJADOR al Sistema de Seguridad Social Integral: Salud (EPS), Pensión (AFP) y Riesgos Laborales (ARL), garantizando la cobertura de contingencias comunes y profesionales conforme a la Ley 100 de 1993 y Decreto 1072 de 2015.';
  const c8 = anexoCfg.clausula8_elementos_herramientas || 'EL EMPLEADOR suministrará las herramientas, equipos y elementos requeridos para la labor, los cuales son propiedad de la empresa y se entregan bajo inventario y custodia. En caso de portabilidad o traslado fuera del centro de trabajo, el trabajador responderá por su debido cuidado, reporte de fallas y restitución inmediata.';
  const c9 = anexoCfg.clausula9_domicilio_firmas || 'Las partes fijan como domicilio contractual la ciudad de ejecución de labores y manifiestan que este documento contiene la totalidad de los acuerdos vinculantes. Las partes firman en señal de expresa conformidad en dos ejemplares de igual tenor.';

  // Verificación de firma digital del trabajador
  const firmas = (store.getFirmasPorTrabajador ? store.getFirmasPorTrabajador(trabajador.id) : []) || [];
  const firmaRegistrada = firmas.find(f => 
    f.documentoCodigo === 'CONTRATO_INDIVIDUAL' || 
    f.documentoCodigo === 'contrato' || 
    f.documentoId === 'contrato' ||
    f.tipo === 'CONTRATO' ||
    f.firmaBase64
  );
  const firmaImagen = (firmaRegistrada ? (firmaRegistrada.firmaBase64 || firmaRegistrada.signature_image_file) : null) || 
                      (trabajador.has_registered_signature ? obtenerUrlFirmaTrabajador(trabajador) : null);
  const bogotaFirmaStr = firmaRegistrada?.fechaHoraISO || trabajador.signature_registered_bogota || new Date().toLocaleString('es-CO');
  const ipFirmaStr = firmaRegistrada?.signer_ip || firmaRegistrada?.ipCliente || trabajador.signature_ip_address || '127.0.0.1';
  const hashFirmaStr = firmaRegistrada?.hashDocumento || firmaRegistrada?.sha256_hash || trabajador.signature_sha256 || 'SHA-256';

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Contrato Individual de Trabajo - ${trabajador.nombre}</title>
      <style>
        @page { size: letter; margin: 12mm 15mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; background: white; margin: 0; padding: 18px 24px; font-size: 8.5pt; line-height: 1.45; }
        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
        h1 { margin: 0; font-size: 13pt; text-transform: uppercase; color: #0f172a; font-weight: 900; }
        h2 { margin: 2px 0 0; font-size: 9pt; color: #4338ca; text-transform: uppercase; font-weight: bold; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8.5pt; }
        .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 4.5px 8px; text-align: left; vertical-align: middle; }
        .data-table th { background: #f8fafc; font-weight: bold; width: 28%; font-size: 8pt; color: #334155; }
        .section-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 9px; page-break-inside: avoid; }
        .section-title { font-size: 9pt; font-weight: 800; color: #1e1b4b; text-transform: uppercase; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px; margin: 0 0 5px 0; }
        .clausula-text { font-size: 8.5pt; line-height: 1.45; margin: 0; text-align: justify; }
        .sig-table { width: 100%; border-collapse: collapse; margin-top: 25px; page-break-inside: avoid; }
        .sig-table td { width: 50%; vertical-align: top; text-align: center; padding: 0 20px; }
        .sig-line { border-top: 1px solid #0f172a; margin-bottom: 5px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #4338ca; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div class="header">
        ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${empresa.razonSocial}" style="max-height: 50px; max-width: 150px; object-fit: contain; margin-bottom: 4px;"><br>` : ''}
        <strong style="font-size: 13pt; color: #0f172a;">${empresa.razonSocial}</strong>
        <div style="font-size: 9.5pt; color: #64748b;">NIT: ${empresa.nit} • Matriz de Talento Humano & SG-SST</div>
        <h1>CONTRATO INDIVIDUAL DE TRABAJO A ${trabajador.tipoContrato ? trabajador.tipoContrato.toUpperCase() : 'TÉRMINO INDEFINIDO'}</h1>
        <h2>Conforme al Código Sustantivo del Trabajo de Colombia • 9 Cláusulas Estructuradas</h2>
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
          <td><strong>${trabajador.fechaContrato || trabajador.fechaIngreso || 'Al momento de suscripción'}</strong></td>
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

      <div class="section-box" style="background: #f8fafc;">
        <p class="clausula-text">
          Entre los suscritos a saber: por una parte <strong>${empresa.razonSocial}</strong> (NIT: ${empresa.nit}), sociedad legalmente constituida, representada por <strong>${empresa.representanteLegal || 'la Gerencia General'}</strong>, en adelante <strong>EL EMPLEADOR</strong>, y por la otra parte <strong>${trabajador.nombre}</strong>, mayor de edad, identificado(a) con cédula de ciudadanía Nº <strong>${trabajador.identificacion || trabajador.cedula}</strong>, en adelante <strong>EL TRABAJADOR</strong> contratado para el cargo de <strong>${trabajador.cargo}</strong>, se celebra el presente <strong>CONTRATO INDIVIDUAL DE TRABAJO Y ANEXO CONTRACTUAL DE SST</strong>, el cual se regirá por el Código Sustantivo del Trabajo de Colombia, el Decreto 1072 de 2015, la Resolución 0312 de 2019 y las siguientes nueve (9) cláusulas pactadas de común acuerdo:
        </p>
      </div>

      <!-- CLÁUSULA I -->
      <div class="section-box">
        <div class="section-title">CLÁUSULA PRIMERA: OBJETO, CARGO Y ALCANCE</div>
        <p class="clausula-text">${c1}</p>
      </div>

      <!-- CLÁUSULA II -->
      <div class="section-box">
        <div class="section-title">CLÁUSULA SEGUNDA: DURACIÓN Y TERMINACIÓN DE LA LABOR</div>
        <p class="clausula-text">${c2}</p>
      </div>

      <!-- CLÁUSULA III -->
      <div class="section-box">
        <div class="section-title">CLÁUSULA TERCERA: SALARIO Y FORMA DE PAGO</div>
        <p class="clausula-text">${c3}</p>
      </div>

      <!-- CLÁUSULA IV -->
      <div class="section-box">
        <div class="section-title">CLÁUSULA CUARTA: OBLIGACIONES ESPECIALES Y PROTOCOLOS SST (ALTO RIESGO)</div>
        <p class="clausula-text">${c4}</p>
      </div>

      <!-- CLÁUSULA V -->
      <div class="section-box" style="border-left: 4px solid #b91c1c; background: #fff5f5;">
        <div class="section-title" style="color: #b91c1c; border-bottom-color: #fecaca;">CLÁUSULA QUINTA: FALTAS GRAVES Y JUSTAS CAUSAS DE TERMINACIÓN</div>
        <p class="clausula-text" style="color: #7f1d1d;">${c5}</p>
      </div>

      <!-- CLÁUSULA VI -->
      <div class="section-box" style="border-left: 4px solid #4338ca; background: #f8fafc;">
        <div class="section-title" style="color: #3730a3; border-bottom-color: #e0e7ff;">CLÁUSULA SEXTA: CULPA EXCLUSIVA DEL TRABAJADOR Y EXONERACIÓN PATRONAL (ART. 216 CST)</div>
        <p class="clausula-text">${c6}</p>
      </div>

      <!-- CLÁUSULA VII -->
      <div class="section-box">
        <div class="section-title">CLÁUSULA SÉPTIMA: SEGURIDAD SOCIAL INTEGRAL</div>
        <p class="clausula-text">${c7}</p>
      </div>

      <!-- CLÁUSULA VIII -->
      <div class="section-box">
        <div class="section-title">CLÁUSULA OCTAVA: ELEMENTOS DE TRABAJO Y PORTABILIDAD DE HERRAMIENTAS</div>
        <p class="clausula-text">${c8}</p>
      </div>

      <!-- CLÁUSULA IX -->
      <div class="section-box">
        <div class="section-title">CLÁUSULA NOVENA: DOMICILIO CONTRACTUAL, ACUERDO TOTAL Y FIRMAS</div>
        <p class="clausula-text">${c9}</p>
      </div>

      <div style="font-size: 8.5pt; margin: 15px 0 25px 0; text-align: justify; line-height: 1.5;">
        Para constancia de comprensión, aceptación expresa y notificación plena de las nueve (9) cláusulas aquí contenidas, se firma en dos (2) ejemplares de igual valor y tenor legal a los ${new Date().getDate()} días del mes de ${new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date())} de ${new Date().getFullYear()}.
      </div>

      <table class="sig-table">
        <tr>
          <td>
            <div style="min-height: 52px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px;">
              <!-- Sello / Firma patronal -->
            </div>
            <div class="sig-line"></div>
            <strong style="font-size: 9.5pt; color: #0f172a;">${empresa.razonSocial}</strong><br>
            <span style="font-size: 8.5pt; color: #334155;">NIT: ${empresa.nit}</span><br>
            <span style="font-size: 8pt; color: #64748b;">Rep. Legal: ${empresa.representanteLegal || 'Gerencia General'}</span><br>
            <strong style="font-size: 8pt; color: #1e1b4b;">EL EMPLEADOR</strong>
          </td>
          <td>
            <div style="min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 4px;">
              ${firmaImagen ? `
                <img src="${firmaImagen}" alt="Firma ${trabajador.nombre}" style="max-height: 48px; max-width: 170px; object-fit: contain; margin-bottom: 2px;">
                <div style="font-size: 7pt; font-family: monospace; color: #047857; font-weight: bold;">✓ FIRMA ELECTRÓNICA REGISTRADA (Ley 527/99)</div>
                <div style="font-size: 5.5pt; color: #334155; font-family: monospace; margin-top: 1px; line-height: 1.35; max-width: 250px;">
                  Firmado digitalmente el ${bogotaFirmaStr} | IP: ${ipFirmaStr} | Hash: ${hashFirmaStr} | Validez probatoria Ley 527 de 1999
                </div>
              ` : `
                <span style="font-size: 8pt; color: #94a3b8; font-style: italic;">[Firma autógrafa o digital del colaborador]</span>
              `}
            </div>
            <div class="sig-line"></div>
            <strong style="font-size: 9.5pt; color: #0f172a;">${trabajador.nombre}</strong><br>
            <span style="font-size: 8.5pt; color: #334155;">C.C. Nº ${trabajador.identificacion || trabajador.cedula}</span><br>
            <span style="font-size: 8pt; color: #64748b;">Cargo: ${trabajador.cargo}</span><br>
            <strong style="font-size: 8pt; color: #1e1b4b;">EL TRABAJADOR (Aceptación Expresa y Vinculante)</strong>
          </td>
        </tr>
      </table>

      <div style="margin-top: 25px; border-top: 1px solid #cbd5e1; padding-top: 5px; font-size: 8px; color: #94a3b8; text-align: center;">
        Documento generado a través de DOCTOR PYME SG-SST • Validez probatoria Código Sustantivo del Trabajo • Decreto 1072 de 2015
      </div>
    </body>
    </html>
  `);
  win.document.close();
};

// Alias directo para compatibilidad de llamadas
window.imprimirMinutaContratoTrabajador = function(trabajadorId, cargoId) {
  if (trabajadorId) {
    window.generarPdfContratoTrabajador(trabajadorId);
  } else if (cargoId && window.imprimirAnexoContractual) {
    window.imprimirAnexoContractual(cargoId);
  }
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

// 3. GENERADOR OFICIAL DE MANUAL DE CARGOS, RESPONSABILIDADES Y FUNCIONES (PDF)
window.generarPdfManualFunciones = function(cargoName, companyId, trabajadorId = null) {
  const empresa = store.getEmpresa(companyId) || store.getEmpresaActiva();
  const cargos = store.getJobPositions(empresa?.id);
  const cargoObj = cargos.find(j => (j.title || '').toLowerCase().trim() === (cargoName || '').toLowerCase().trim() || j.id === cargoName);
  
  if (window.imprimirManualDeCargo) {
    window.imprimirManualDeCargo(cargoObj ? cargoObj.id : cargoName, trabajadorId);
    return;
  }
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
// MÓDULO APP MÓVIL DEL TRABAJADOR (MOBILE-FIRST PWA & TWA GOOGLE PLAY STORE)
// Conforme al Decreto 1072 de 2015, Resolución 0312 de 2019 y GTC 45:2012
// Persistencia Atómica Inmutable de Firmas, Fotos, Preoperacionales y Peligros
// =============================================================================

let activeMobileTab = 'inicio'; // 'inicio' | 'docs' | 'elearning' | 'tools' | 'reportar' | 'perfil'
let cameraQrStream = null;

window.cambiarTabMovil = function(tabName) {
  activeMobileTab = tabName || 'inicio';
  renderWorkerPortal();
};

window.cambiarTabInterfazTrabajador = function(tabName) {
  activeMobileTab = tabName || 'inicio';
  renderWorkerPortal();
};

window.volverAGestionTrabajadores = function() {
  document.body.classList.remove('mobile-app-mode');
  modoVistaAutogestion = false;
  trabajadorSeleccionadoId = null;
  if (cameraQrStream) {
    cameraQrStream.getTracks().forEach(t => t.stop());
    cameraQrStream = null;
  }
  renderWorkerPortal();
};

// Helper de Canvas de Firma Táctil (Soporta dedo y ratón con alta resolución y mapeo 100% exacto en toda el área)
function setupSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  let drawing = false;
  let hasSigned = false;
  let lastPos = null;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Dimensiones CSS reales renderizadas en pantalla
    const cssWidth = Math.round(rect.width > 0 ? rect.width : (canvas.parentElement?.clientWidth || 340));
    const cssHeight = Math.round(rect.height > 0 ? rect.height : (canvas.clientHeight || 180));

    const targetWidth = Math.max(cssWidth * dpr, 300);
    const targetHeight = Math.max(cssHeight * dpr, 150);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      let temp = null;
      if (hasSigned && canvas.width > 0 && canvas.height > 0) {
        temp = document.createElement('canvas');
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tempCtx = temp.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (temp) {
        ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
      }
    }
  }

  // Inicializar dimensiones de inmediato y con retardos para sincronización con el DOM
  resizeCanvas();
  requestAnimationFrame(resizeCanvas);
  setTimeout(resizeCanvas, 100);
  setTimeout(resizeCanvas, 300);

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : null);
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;

    // Mapeo exacto 1:1 entre píxeles CSS de pantalla y buffer del canvas (cubre el 100% del área)
    const rWidth = r.width > 0 ? r.width : 1;
    const rHeight = r.height > 0 ? r.height : 1;
    const scaleX = canvas.width / rWidth;
    const scaleY = canvas.height / rHeight;

    return {
      x: (clientX - r.left) * scaleX,
      y: (clientY - r.top) * scaleY
    };
  }

  function start(e) {
    e.preventDefault();
    resizeCanvas();
    drawing = true;
    lastPos = getPos(e);

    const dpr = window.devicePixelRatio || 1;
    ctx.lineWidth = 2.8 * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    ctx.beginPath();
    ctx.arc(lastPos.x, lastPos.y, (ctx.lineWidth || 3) / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    hasSigned = true;
  }

  function move(e) {
    if (!drawing || !lastPos) return;
    e.preventDefault();
    const pos = getPos(e);

    const dpr = window.devicePixelRatio || 1;
    ctx.lineWidth = 2.8 * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos = pos;
    hasSigned = true;
  }

  function stop(e) {
    if (!drawing) return;
    e.preventDefault();
    drawing = false;
    lastPos = null;
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', stop);

  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', stop, { passive: false });

  // Escuchar redimensionamiento de pantalla
  window.addEventListener('resize', resizeCanvas);

  return {
    resize: resizeCanvas,
    clear: () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSigned = false;
      lastPos = null;
    },
    isEmpty: () => !hasSigned,
    getDataUrl: () => {
      const out = document.createElement('canvas');
      out.width = canvas.width;
      out.height = canvas.height;
      const outCtx = out.getContext('2d');
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, out.width, out.height);
      outCtx.drawImage(canvas, 0, 0);
      return out.toDataURL('image/png');
    }
  };
}

// =============================================================================
// BLOQUE 2: COMPLIANCE GATE OBLIGATORIO (ONBOARDING LEGAL LEY 1581 & GTC 45)
// =============================================================================
function verificarComplianceGateOnboarding(trabajador, empresa) {
  const userSigs = store.getEmployeeDocumentSignatures ? store.getEmployeeDocumentSignatures(trabajador.id) : [];
  const hasSigned = userSigs.some(s => s.document_type === 'HABEAS_DATA_ONBOARDING');
  if (hasSigned) return;

  // Si no ha firmado, levantar la compuerta legal obligatoria a pantalla completa
  abrirModalOnboardingComplianceGate(trabajador, empresa);
}

function abrirModalOnboardingComplianceGate(trabajador, empresa) {
  const modalId = 'modal-onboarding-compliance-gate';
  if (document.getElementById(modalId)) return;

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden animate-fadeIn text-slate-100 select-none';

  modalEl.innerHTML = `
    <!-- Cabecera de Compliance Legal -->
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0 shadow-lg">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-xl flex-shrink-0">
          ⚖️
        </div>
        <div>
          <span class="text-[9px] font-black uppercase tracking-wider text-teal-300 block">
            Requisito Legal Previo al Ingreso • DOCTOR PYME SG-SST
          </span>
          <h2 class="text-sm font-black text-white truncate max-w-[260px] sm:max-w-md">
            Consentimiento Informado & Notificación de Riesgos
          </h2>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
        Obligatorio
      </span>
    </div>

    <!-- Área de Lectura con Detección Estricta de Scroll -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs leading-relaxed" id="legal-scroll-container">
      <div class="p-3.5 bg-indigo-950/40 rounded-2xl border border-indigo-800/60 text-indigo-200">
        <p class="font-bold text-[11px] mb-1">Colaborador: ${trabajador.nombre} (C.C. ${trabajador.identificacion || trabajador.cedula})</p>
        <p class="text-[10px] text-slate-300">Empresa Contratante: <strong>${empresa.razonSocial}</strong> (NIT: ${empresa.nit}) · Cargo: <strong>${trabajador.cargo}</strong></p>
      </div>

      <div class="space-y-3 text-slate-300">
        <div class="border-b border-slate-800 pb-1.5">
          <h3 class="text-sm font-black text-teal-300">
            1. Autorización para el Tratamiento de Datos Personales y Sensibles
          </h3>
          <span class="text-[10px] font-bold text-teal-400/90 block mt-0.5">
            (Ley 1581 de 2012, Decreto 1074 de 2015 y Decreto 1072 de 2015)
          </span>
        </div>
        <p class="text-justify leading-relaxed">
          En cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto Reglamentario 1074 de 2015, autorizo de manera libre, previa, expresa e informada a <strong>${empresa.razonSocial}</strong> (en calidad de Responsable del Tratamiento) y a su proveedor tecnológico <strong>DOCTOR PYME</strong> (en calidad de Encargado del Tratamiento) para recolectar, almacenar, custodiar, procesar y transmitir mis datos personales, médicos y laborales.
        </p>
        <p class="text-justify leading-relaxed">
          <strong>Tratamiento de Datos Sensibles:</strong> Manifiesto que se me ha informado que, al tratarse de datos de naturaleza sensible (evaluaciones médicas ocupacionales, exámenes de aptitud laboral, registros de inspección, firmas biométricas/digitales y reportes de condiciones de salud), no me encuentro obligado(a) a autorizar su tratamiento, y que la entrega de dicha información es facultativa.
        </p>
        <p class="text-justify leading-relaxed">
          No obstante, reconozco y acepto expresamente que el tratamiento de estos datos tiene como propósito exclusivo garantizar la vigilancia epidemiológica, la prevención de accidentes y enfermedades laborales, y el estricto cumplimiento del Sistema de Gestión de la Seguridad y Salud en el Trabajo (SG-SST) bajo el Decreto 1072 de 2015 y la Resolución 0312 de 2019.
        </p>
        <p class="text-justify leading-relaxed">
          Como titular de la información, declaro que conozco mis derechos a conocer, actualizar, rectificar y revocar la presente autorización, los cuales podré ejercer conforme a la Política de Tratamiento de Datos Personales disponible para consulta ante la administración de la empresa.
        </p>

        <h3 class="text-sm font-black text-teal-300 border-b border-slate-800 pb-1 pt-2">
          2. Notificación General de Riesgos y Peligros Laborales (GTC 45 & Dec. 1072)
        </h3>
        <p>
          Declaro que el empleador me ha notificado e informado oportunamente sobre los factores de riesgo inherentes a mi labor como <strong>${trabajador.cargo}</strong>:
        </p>
        <ul class="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
          <li><strong>Peligros Mecánicos:</strong> Operación de maquinaria, herramientas manuales y equipos industriales con riesgo de atrapamiento o golpes.</li>
          <li><strong>Peligros Biomecánicos:</strong> Manipulación de cargas, posturas prolongadas y movimientos repetitivos.</li>
          <li><strong>Peligros Físicos y Locativos:</strong> Exposición a ruido continuo, superficies húmedas o irregulares, caídas al mismo o diferente nivel.</li>
          <li><strong>Peligros Químicos:</strong> Contacto con polvos, material particulado, humos y sustancias de proceso.</li>
        </ul>

        <h3 class="text-sm font-black text-teal-300 border-b border-slate-800 pb-1 pt-2">
          3. Compromiso y Deberes Legales del Trabajador (Art. 2.2.4.6.10 Dec. 1072/2015)
        </h3>
        <p>
          Me obligo a cumplir fielmente los siguientes mandatos legales:
        </p>
        <ol class="list-decimal pl-5 space-y-1 text-slate-300 text-[11px]">
          <li>Procurar el cuidado integral de mi salud y suministrar información clara y veraz sobre mi estado físico y mental.</li>
          <li>Cumplir las normas, reglamentos e instrucciones del SG-SST de la empresa.</li>
          <li>Utilizar de manera permanente y adecuada los Elementos de Protección Personal (EPP) suministrados.</li>
          <li>Reportar de inmediato a través de esta App cualquier condición o acto inseguro detectado en mi puesto.</li>
          <li>Diligenciar diariamente la inspección preoperacional de los equipos o herramientas bajo mi custodia antes de iniciar la jornada.</li>
        </ol>

        <div id="scroll-prompt-badge" class="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-center text-amber-300 font-black text-xs animate-pulse">
          📜 Desplázate hasta el final de este documento para habilitar la firma digital con el dedo
        </div>
      </div>

      <!-- Zona de Firma Táctil (Bloqueada hasta completar el scroll) -->
      <div id="onboarding-signature-section" class="opacity-40 pointer-events-none transition-all duration-300 space-y-3 pt-4 border-t border-slate-800">
        <div class="space-y-2">
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" id="check-onboarding-habeas" class="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-slate-700">
            <span class="text-[11px] text-slate-200 font-semibold">
              Autorizo el tratamiento de mis datos personales y sensibles (Ley 1581 de 2012 y Dec. 1074 de 2015).
            </span>
          </label>
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" id="check-onboarding-gtc45" class="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-slate-700">
            <span class="text-[11px] text-slate-200 font-semibold">
              Declaro haber recibido, comprendido y aceptado la notificación de riesgos laborales y deberes SG-SST (Dec. 1072/2015).
            </span>
          </label>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-[11px] font-black uppercase text-teal-300">
              ✍️ Firma Digital con el Dedo en Pantalla:
            </label>
            <button type="button" id="btn-clear-onboarding-sig" class="text-[10px] text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer">
              Limpiar Firma
            </button>
          </div>
          <div class="bg-white rounded-xl overflow-hidden shadow-inner border-2 border-teal-500/50">
            <canvas id="canvas-onboarding-sig" class="signature-pad-canvas w-full h-36"></canvas>
          </div>
          <p class="text-[10px] text-slate-400 mt-1 text-center">
            Esta firma tiene plena validez probatoria conforme a la Ley 527 de 1999 y Decreto 2364 de 2012.
          </p>
        </div>

        <button 
          type="button" 
          id="btn-confirm-onboarding-sig"
          class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-900/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span>✓ Aceptar Términos y Firmar Digitalmente</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  const scrollContainer = document.getElementById('legal-scroll-container');
  const sigSection = document.getElementById('onboarding-signature-section');
  const scrollBadge = document.getElementById('scroll-prompt-badge');

  scrollContainer.onscroll = () => {
    const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 40;
    if (isAtBottom) {
      sigSection.classList.remove('opacity-40', 'pointer-events-none');
      if (scrollBadge) scrollBadge.classList.add('hidden');
      if (pad && pad.resize) pad.resize();
    }
  };

  // Inicializar Canvas táctil
  const pad = setupSignaturePad('canvas-onboarding-sig');

  document.getElementById('btn-clear-onboarding-sig')?.addEventListener('click', () => {
    pad?.clear();
  });

  document.getElementById('btn-confirm-onboarding-sig')?.addEventListener('click', async () => {
    const checkHabeas = document.getElementById('check-onboarding-habeas')?.checked;
    const checkGtc45 = document.getElementById('check-onboarding-gtc45')?.checked;

    if (!checkHabeas || !checkGtc45) {
      alert("Debes marcar ambas casillas de autorización legal antes de continuar.");
      return;
    }

    if (pad?.isEmpty()) {
      alert("Por favor estampa tu firma con el dedo en el recuadro blanco.");
      return;
    }

    const btn = document.getElementById('btn-confirm-onboarding-sig');
    btn.disabled = true;
    btn.innerHTML = `<span>⏳ Generando Sello Inmutable y Guardando en Disco...</span>`;

    try {
      const sigDataUrl = pad.getDataUrl();
      const res = await store.submitWorkerOnboarding({
        worker_id: trabajador.id,
        tenant_id: empresa.id,
        signature_base64: sigDataUrl,
        accepted_habeas: true,
        accepted_gtc45: true
      });

      modalEl.innerHTML = `
        <div class="m-auto p-6 max-w-sm bg-slate-900 border border-emerald-500/50 rounded-3xl text-center space-y-4 animate-fadeIn shadow-2xl">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <div>
            <h3 class="text-base font-black text-white">¡Consentimiento Registrado!</h3>
            <p class="text-xs text-slate-300 mt-1">Firma legal estampada con éxito y archivada para retención de 20 años.</p>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl text-[10px] font-mono text-emerald-300 text-left border border-slate-800 space-y-1">
            <p><strong>SHA-256:</strong> ${res.record?.signature_sha256?.substring(0, 24)}...</p>
            <p><strong>Fecha/Hora:</strong> ${res.record?.bogota_timestamp || 'Hora Bogotá'}</p>
            <p><strong>IP:</strong> ${res.record?.client_ip || 'Registrada'}</p>
          </div>
          <p class="text-[11px] text-teal-400 font-bold">Cargando tu App Móvil Doctor Pyme...</p>
        </div>
      `;

      setTimeout(() => {
        modalEl.remove();
        renderWorkerPortal();
      }, 1400);

    } catch (err) {
      alert("Error al guardar consentimiento: " + err.message);
      btn.disabled = false;
      btn.innerHTML = `<span>✓ Aceptar Términos y Firmar Digitalmente</span>`;
    }
  });
}

// =============================================================================
// VISTA PRINCIPAL DEL PORTAL / APP MÓVIL (MOBILE-FIRST NATIVE EXPERIENCE)
// =============================================================================
function renderVistaAutogestionTrabajador(container, trabajador, esModoAdmin = false) {
  // Activar modo app móvil nativa para ocultar menús laterales y cabecera de escritorio
  document.body.classList.add('mobile-app-mode');

  // Asegurar obtención del trabajador más reciente y completo en memoria
  const idBuscada = trabajador?.id || trabajador?.trabajadorId;
  if (idBuscada) {
    const fullTrab = store.getTrabajadorPorId(idBuscada);
    if (fullTrab) trabajador = fullTrab;
  }
  if (trabajador && !trabajador.id && trabajador.trabajadorId) {
    trabajador.id = trabajador.trabajadorId;
  }

  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva() || {
    id: 'emp-1790438946268',
    razonSocial: 'LADRILLOS OCHOA LTDA',
    nit: '830124631'
  };

  // Verificar compuerta de Onboarding Legal obligatorio (Ley 1581 & GTC 45)
  verificarComplianceGateOnboarding(trabajador, empresa);

  const todosTrabajadoresEmpresa = store.getTrabajadores(empresa.id);
  const capacitaciones = store.getCapacitaciones(empresa.id);
  const firmas = store.getFirmasPorTrabajador(trabajador.id);
  const docSigs = store.getEmployeeDocumentSignatures ? store.getEmployeeDocumentSignatures(trabajador.id) : [];
  const reportesPeligro = store.getReportesPeligro(empresa.id).filter(r => r.trabajadorId === trabajador.id);
  const preoperacionales = store.getReportesPreoperacional(empresa.id).filter(p => p.trabajadorId === trabajador.id);
  const folderCompleteness = store.calculateFolderCompleteness ? store.calculateFolderCompleteness(trabajador.id) : { isComplete: false, presentCount: 0, totalRequired: 5, percentage: 0, categoriesPresent: {} };

  // Inventario y Asignaciones
  const toolsInventory = store.getToolsInventory(empresa.id);
  const misHerramientasAsignadas = toolsInventory.filter(tool => {
    const activeAsg = store.getActiveToolAssignment(tool.id);
    return activeAsg && (activeAsg.employee_id === trabajador.id || (activeAsg.employee_name || '').toLowerCase() === (trabajador.nombre || '').toLowerCase());
  });

  // Actividades PHVA y Funciones del Cargo
  const cargosFormales = store.getJobPositions(empresa.id);
  const cargoFormal = cargosFormales.find(cg => cg.id === trabajador.job_position_id || (cg.title || '').toLowerCase().trim() === (trabajador.cargo || '').toLowerCase().trim());
  const todasActividadesProcesos = store.getAllProcessActivities(empresa.id);
  const misActividadesPHVA = cargoFormal
    ? todasActividadesProcesos.filter(a => a.responsible_position_id === cargoFormal.id)
    : [];
  const configCargo = store.getPerfilCargo(trabajador.cargo, empresa.id);

  // EPP consolidados
  const eppConsolidados = Array.from(new Set([
    ...(configCargo?.pts?.eppRequeridos || []),
    ...misActividadesPHVA.flatMap(a => Array.isArray(a.required_epp) ? a.required_epp : []),
    ...misHerramientasAsignadas.flatMap(t => {
      const sst = store.getToolSST(t.id);
      return Array.isArray(sst?.required_epp) ? sst.required_epp : [];
    })
  ].filter(Boolean)));

  const eppListaFinal = eppConsolidados.length > 0 ? eppConsolidados : [
    'Casco de seguridad dieléctrico con barbuquejo',
    'Gafas de seguridad con filtro UV y antiempañante',
    'Botas de seguridad con puntera de acero/composite',
    'Guantes de protección mecánica (carnaza o nitrilo)',
    'Protección auditiva tipo inserción / copa'
  ];

  // Documentos de Cargo Obligatorios
  const instrumentosCargo = [
    {
      type: 'MANUAL_DE_CARGO',
      id: 'DOC-MANUAL-CARGO',
      title: 'Manual de Funciones y Responsabilidades SST',
      norma: 'Decreto 1072 de 2015 Art. 2.2.4.6.10',
      icono: '📖',
      color: 'purple'
    },
    {
      type: 'PERFIL_DE_CARGO',
      id: 'DOC-PERFIL-CARGO',
      title: 'Perfil de Cargo SST & Competencias',
      norma: 'Estándar 1.1.2 Resolución 0312 de 2019',
      icono: '📋',
      color: 'amber'
    },
    {
      type: 'PLAN_DE_TRABAJO_SEGURO',
      id: 'DOC-PTS-CARGO',
      title: 'Procedimiento de Trabajo Seguro (PTS)',
      norma: 'Guía Técnica GTC 45 & Matriz de Peligros',
      icono: '🛡️',
      color: 'teal'
    },
    {
      type: 'ANEXO_CONTRACTUAL_Y_NOTIFICACION_RIESGOS',
      id: 'DOC-ANEXO-CONTRACTUAL',
      title: 'Anexo Contractual y Notificación de Riesgos',
      norma: 'Código Sustantivo del Trabajo & GTC 45',
      icono: '📄',
      color: 'blue'
    }
  ];

  // Políticas normativas
  const politicasInstitucionales = [
    {
      id: 'DOC-POL-SST-01',
      title: 'Política Integral de Seguridad y Salud en el Trabajo',
      categoria: 'Política Obligatoria',
      enlace: 'https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing'
    },
    {
      id: 'DOC-POL-ALC-02',
      title: 'Prevención de Alcohol, Tabaco y Sustancias Psicoactivas',
      categoria: 'Política Obligatoria',
      enlace: 'https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing'
    },
    {
      id: 'DOC-REG-HIG-03',
      title: 'Reglamento de Higiene y Seguridad Industrial',
      categoria: 'Reglamento',
      enlace: 'https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing'
    },
    {
      id: 'DOC-RES-COP-04',
      title: 'Acta de Asignación de Responsabilidades en SST',
      categoria: 'Responsabilidades',
      enlace: 'https://docs.google.com/document/d/1KwN9NqmkfD7RTZMilnMopH4AeTbdIftwNfaBRCQg9H8/edit?usp=sharing'
    }
  ];

  // Verificación de firmas de instrumentos
  const totalInstrumentos = instrumentosCargo.length;
  const instrumentosFirmadosCount = instrumentosCargo.filter(inst => {
    return docSigs.some(s => s.document_type === inst.type || s.document_code === inst.id) ||
           firmas.some(f => f.documentoCodigo === inst.id || f.documentoId === inst.id);
  }).length;

  // Verificación de preoperacional hoy
  const hoyStr = new Date().toISOString().split('T')[0];
  const preopHoy = preoperacionales.find(p => (p.fechaCreacion || p.performed_at || '').startsWith(hoyStr));

  // Entregas de EPP y Dotación (Bloques 1, 2, 3, 4 - Res. 0312 Estándar 4.2.6)
  const misEntregasEpp = store.getEppDeliveries ? store.getEppDeliveries(trabajador.id, empresa.id) : [];
  const entregasEppPendientes = misEntregasEpp.filter(d => d.status === 'ASIGNADO_PENDIENTE_FIRMA');
  const entregasEppFirmadas = misEntregasEpp.filter(d => d.status === 'FIRMADO_ENTREGADO');
  const actaEppFirmada = entregasEppFirmadas.length > 0 || firmas.some(f => f.documentoCodigo === 'ACTA_ENTREGA_EPP');

  // Evaluaciones aprobadas
  const capsEvaluadasCount = capacitaciones.filter(cap =>
    (cap.evaluaciones || []).some(e => e.trabajadorId === trabajador.id || e.worker_id === trabajador.id)
  ).length;

  container.innerHTML = `
    <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between antialiased selection:bg-teal-500 selection:text-white">

      <!-- =================================================================== -->
      <!-- ENCABEZADO SUPERIOR COMPACTO (MOBILE-FIRST HEADER)                   -->
      <!-- =================================================================== -->
      <header class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div class="max-w-lg mx-auto flex items-center justify-between gap-3">
          
          <!-- Identificación de la Empresa y Trabajador -->
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="w-10 h-10 rounded-xl bg-white p-1 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
              <img 
                src="${empresa.logoUrl || './assets/app-icon.png'}" 
                alt="${empresa.razonSocial}" 
                class="w-full h-full object-contain"
                onerror="this.src='./assets/app-icon.png'"
              >
            </div>
            <div class="overflow-hidden">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h1 class="text-xs font-black text-white truncate max-w-[170px] sm:max-w-xs">${trabajador.nombre}</h1>
                <span class="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate">
                  ${trabajador.cargo}
                </span>
              </div>
              <p class="text-[10px] text-slate-400 truncate">
                ${empresa.razonSocial} · <span class="text-teal-400 font-mono">C.C. ${trabajador.identificacion || trabajador.cedula}</span>
              </p>
            </div>
          </div>

          <!-- Acciones de Cabecera (Instalar PWA, Simulación / Salir) -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button 
              type="button" 
              onclick="window.instalarPwaDoctorPyme()" 
              class="p-2 rounded-xl bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1"
              title="Instalar App en el Celular"
            >
              <span>📲</span>
              <span class="hidden sm:inline text-[10px]">Instalar</span>
            </button>

            ${esModoAdmin ? `
              <button 
                type="button" 
                onclick="window.volverAGestionTrabajadores()" 
                class="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black transition flex items-center gap-1 cursor-pointer shadow-sm"
                title="Volver a la consola de administración"
              >
                <span>🛠️</span>
                <span class="hidden sm:inline">Admin</span>
              </button>
            ` : `
              <button 
                type="button" 
                onclick="auth.logout()" 
                class="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition text-xs font-bold"
                title="Cerrar Sesión"
              >
                🚪
              </button>
            `}
          </div>

        </div>

        <!-- Selector de trabajador si está en modo simulación administrativa -->
        ${esModoAdmin ? `
          <div class="max-w-lg mx-auto mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span class="text-emerald-400 font-bold">Simulación Operaria:</span>
            <select onchange="if(this.value) window.verPortalComoTrabajador(this.value)" class="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-white focus:outline-none">
              ${todosTrabajadoresEmpresa.map(t => `
                <option value="${t.id}" ${t.id === trabajador.id ? 'selected' : ''}>
                  ${t.nombre} (${t.cargo})
                </option>
              `).join('')}
            </select>
          </div>
        ` : ''}
      </header>

      <!-- =================================================================== -->
      <!-- CONTENIDO SCROLLABLE DE CADA PESTAÑA (PADDED PARA BOTTOM NAV)      -->
      <!-- =================================================================== -->
      <main class="flex-1 overflow-y-auto px-4 py-4 sm:py-6 pb-28 max-w-lg mx-auto w-full space-y-4">

        <!-- --------------------------------------------------------------- -->
        <!-- PESTAÑA 1: INICIO (DASHBOARD PERSONAL OPERARIO)                 -->
        <!-- --------------------------------------------------------------- -->
        ${activeMobileTab === 'inicio' ? `
          <div class="space-y-4 animate-fadeIn">
            
            <!-- Banner de Saludo y Turno -->
            <div class="bg-gradient-to-br from-indigo-950 via-slate-900 to-teal-950 p-5 rounded-3xl border border-indigo-900/60 shadow-xl relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div class="relative z-10 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Turno Operativo Activo
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">
                    ${new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <h2 class="text-lg sm:text-xl font-black text-white">
                  ¡Buen turno, ${trabajador.nombre.split(' ')[0]}!
                </h2>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Tu seguridad y la de tus compañeros es la prioridad #1. Consulta tus funciones, reporta condiciones inseguras e inspecciona tu maquinaria antes de operar.
                </p>
              </div>
            </div>

            <!-- 6 Tarjetas de Estado Rápido (Mobile Grid 3x2) -->
            <div class="grid grid-cols-2 gap-2.5">
              
              <div onclick="window.cambiarTabMovil('docs')" class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 hover:border-indigo-500 transition cursor-pointer shadow-sm">
                <div class="flex items-center justify-between">
                  <span class="text-lg">📄</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded ${instrumentosFirmadosCount === totalInstrumentos ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}">
                    ${instrumentosFirmadosCount}/${totalInstrumentos}
                  </span>
                </div>
                <span class="text-xs font-black text-white block mt-1.5">Mi Cargo & Docs</span>
                <span class="text-[10px] text-slate-400 block">${instrumentosFirmadosCount === totalInstrumentos ? '✓ Al día con firmas' : 'Pendientes de firma'}</span>
              </div>

              <div onclick="window.cambiarTabMovil('elearning')" class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 hover:border-indigo-500 transition cursor-pointer shadow-sm">
                <div class="flex items-center justify-between">
                  <span class="text-lg">🎓</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded ${capsEvaluadasCount === capacitaciones.length && capacitaciones.length > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'}">
                    ${capsEvaluadasCount}/${capacitaciones.length}
                  </span>
                </div>
                <span class="text-xs font-black text-white block mt-1.5">E-Learning & Quiz</span>
                <span class="text-[10px] text-slate-400 block">${capsEvaluadasCount === capacitaciones.length && capacitaciones.length > 0 ? '✓ Cursos al día' : 'Capacitaciones SST'}</span>
              </div>

              <div onclick="window.cambiarTabMovil('tools')" class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 hover:border-teal-500 transition cursor-pointer shadow-sm">
                <div class="flex items-center justify-between">
                  <span class="text-lg">🛠️</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                    ${misHerramientasAsignadas.length} Activos
                  </span>
                </div>
                <span class="text-xs font-black text-white block mt-1.5">Mis Equipos</span>
                <span class="text-[10px] text-slate-400 block">${actaEppFirmada ? '✓ EPP Entregado' : 'EPP Requerido'}</span>
              </div>

              <div onclick="window.abrirModalPreoperacionalTrabajador('${trabajador.id}')" class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 hover:border-amber-500 transition cursor-pointer shadow-sm">
                <div class="flex items-center justify-between">
                  <span class="text-lg">📋</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded ${preopHoy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300 animate-pulse'}">
                    ${preopHoy ? 'Realizado' : 'Pendiente'}
                  </span>
                </div>
                <span class="text-xs font-black text-white block mt-1.5">Preoperacional Hoy</span>
                <span class="text-[10px] text-slate-400 block">${preopHoy ? '✓ Listo para operar' : 'Toca para registrar'}</span>
              </div>

              <div onclick="window.cambiarTabMovil('reportar')" class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 hover:border-rose-500 transition cursor-pointer shadow-sm">
                <div class="flex items-center justify-between">
                  <span class="text-lg">⚠️</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    ${reportesPeligro.length}
                  </span>
                </div>
                <span class="text-xs font-black text-white block mt-1.5">Reportar SST</span>
                <span class="text-[10px] text-slate-400 block">Condición / Acto Inseguro</span>
              </div>

              <div onclick="window.cambiarTabMovil('perfil')" class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 hover:border-teal-500 transition cursor-pointer shadow-sm">
                <div class="flex items-center justify-between">
                  <span class="text-lg">👤</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Apto
                  </span>
                </div>
                <span class="text-xs font-black text-white block mt-1.5">Mi Perfil & Salud</span>
                <span class="text-[10px] text-slate-400 block">Profesiograma y Actas</span>
              </div>

            </div>

            <!-- Botones de Acción Rápida con Pulgar -->
            <div class="space-y-2">
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-400">Acciones del Turno</h3>

              <!-- 🪪 CARNÉ DIGITAL SST DEL TRABAJADOR -->
              <button 
                type="button" 
                onclick="window.abrirModalCarneDigital('${trabajador.id}')"
                class="w-full py-3 px-4 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-teal-950/40 flex items-center justify-between transition cursor-pointer active:scale-98 border border-teal-500/30"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">🪪</span>
                  <div class="text-left">
                    <span class="block">Mi Carné Digital SST &amp; Código QR</span>
                    <span class="text-[10px] font-normal text-teal-200 block">Validación oficial de ARL y aptitud para porterías</span>
                  </div>
                </div>
                <span class="px-2.5 py-1 bg-white/20 rounded-xl text-[10px] font-bold">Ver Carné ➔</span>
              </button>

              <button 
                type="button" 
                onclick="window.cambiarTabMovil('elearning')"
                class="w-full py-3 px-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-950/40 flex items-center justify-between transition cursor-pointer active:scale-98"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">🎓</span>
                  <div class="text-left">
                    <span class="block">Capacitaciones & E-Learning SST</span>
                    <span class="text-[10px] font-normal text-indigo-200 block">Visor de diapositivas, videos y evaluación de hasta 7 preguntas</span>
                  </div>
                </div>
                <span class="text-sm font-bold text-indigo-200">➔</span>
              </button>
              
              <button 
                type="button" 
                onclick="window.abrirModalEscanerQR('${trabajador.id}')"
                class="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-teal-900/30 flex items-center justify-between transition cursor-pointer active:scale-98"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">📷</span>
                  <div class="text-left">
                    <span class="block">Escanear QR de Maquinaria / Herramienta</span>
                    <span class="text-[10px] font-normal text-teal-100 block">Abre ficha técnica e inspección inmediata</span>
                  </div>
                </div>
                <span class="text-sm font-bold">➔</span>
              </button>

              <button 
                type="button" 
                onclick="window.abrirModalPreoperacionalTrabajador('${trabajador.id}')"
                class="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-2xl font-bold text-xs flex items-center justify-between transition cursor-pointer active:scale-98"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">📋</span>
                  <div class="text-left">
                    <span class="block font-black text-white">Inspección Preoperacional Diaria</span>
                    <span class="text-[10px] text-slate-400 block">Checklist con foto de evidencia</span>
                  </div>
                </div>
                <span class="text-slate-500">➔</span>
              </button>

              <button 
                type="button" 
                onclick="window.cambiarTabMovil('reportar')"
                class="w-full py-3 px-4 bg-rose-950/40 hover:bg-rose-900/50 text-rose-200 border border-rose-800/60 rounded-2xl font-bold text-xs flex items-center justify-between transition cursor-pointer active:scale-98"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">🚨</span>
                  <div class="text-left">
                    <span class="block font-black text-white">Reportar Condición o Peligro Inseguro</span>
                    <span class="text-[10px] text-rose-300 block">Notifica al instante con foto desde tu cámara</span>
                  </div>
                </div>
                <span class="text-rose-400">➔</span>
              </button>
            </div>

            <!-- Regla de Oro SST del Día -->
            <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
              <div class="flex items-center gap-2 text-amber-400 font-black text-xs">
                <span>🛡️</span>
                <span>Regla de Oro SST: Prevención en Operación</span>
              </div>
              <p class="text-[11px] text-slate-300 leading-relaxed">
                Antes de encender o accionar cualquier maquinaria pesada o herramienta eléctrica, verifica que las guardas mecánicas estén instaladas y que no haya compañeros en la zona de riesgo o punto ciego.
              </p>
            </div>

          </div>
        ` : ''}

        <!-- --------------------------------------------------------------- -->
        <!-- PESTAÑA 2: MI CARGO Y DOCS (4 INSTRUMENTOS + FIRMA TÁCTIL)      -->
        <!-- --------------------------------------------------------------- -->
        ${activeMobileTab === 'docs' ? `
          <div class="space-y-4 animate-fadeIn">
            
            <div class="bg-gradient-to-r from-indigo-950 to-slate-900 p-4 rounded-2xl border border-indigo-900/50 space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-teal-300 block">
                Cascada de Procesos & Gestión Documental
              </span>
              <h2 class="text-base font-black text-white">
                Mis 4 Instrumentos Oficiales del Cargo
              </h2>
              <p class="text-[11px] text-slate-300 leading-relaxed">
                Documentos vinculantes generados automáticamente a partir del Mapa de Procesos de <strong>${empresa.razonSocial}</strong>. Puedes leerlos y firmarlos directamente con el dedo.
              </p>
            </div>

            <!-- Listado de los 4 Instrumentos de Cargo Obligatorios -->
            <div class="space-y-3">
              ${instrumentosCargo.map((inst, idx) => {
                const sigFound = docSigs.find(s => s.document_type === inst.type || s.document_code === inst.id) ||
                                 firmas.find(f => f.documentoCodigo === inst.id || f.documentoId === inst.id);
                const firmado = !!sigFound;

                return `
                  <div class="bg-slate-950 p-4 rounded-2xl border ${firmado ? 'border-emerald-500/40' : 'border-slate-800'} space-y-3 shadow-sm transition">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-start gap-2.5">
                        <span class="text-2xl flex-shrink-0">${inst.icono}</span>
                        <div>
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-[10px] font-mono text-teal-400 font-bold">#${idx + 1}</span>
                            <h3 class="text-xs font-black text-white leading-tight">${inst.title}</h3>
                          </div>
                          <span class="text-[10px] text-slate-400 block mt-0.5">${inst.norma}</span>
                        </div>
                      </div>

                      <span class="px-2.5 py-1 rounded-full text-[9px] font-black flex-shrink-0 ${firmado ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                        ${firmado ? '✓ Firmado y Vigente' : '⚠️ Pendiente por Firmar'}
                      </span>
                    </div>

                    ${firmado ? `
                      <div class="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 space-y-0.5">
                        <p class="text-emerald-400 font-bold">● Sello Legal Activo (Ley 527 / Retención 20 Años • Res. 0312 Est. 1.1.2)</p>
                        <p class="truncate">Hash SHA-256: ${sigFound.signature_sha256 || sigFound.sha256_hash || sigFound.hashDocumento || 'SHA-256'}</p>
                        <p class="text-slate-400">Firmado (Bogotá): ${sigFound.bogota_timestamp || new Date(sigFound.signed_at || sigFound.fechaHoraISO || Date.now()).toLocaleString('es-CO')}</p>
                        <p class="text-indigo-400 text-[9px] truncate">S3: ${sigFound.pdf_s3_key || `doctorpyme-storage/tenants/${empresa.id}/manuals/${trabajador.id}_MANUAL_DE_CARGO_signed.pdf`}</p>
                      </div>
                    ` : ''}

                    <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                      <button 
                        type="button" 
                        onclick="window.abrirModalFirmarDocumentoCargo('${inst.type}', '${escapeHtml(inst.title)}', '${trabajador.id}')"
                        class="py-2 px-3 ${firmado ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md'} rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>${firmado ? '👁️ Ver y Consultar' : '✍️ Leer y Firmar'}</span>
                      </button>

                      <button 
                        type="button" 
                        onclick="window.imprimirInstrumentoActivoModal(null, '${inst.type === 'MANUAL_DE_CARGO' ? 'manual' : (inst.type === 'PERFIL_DE_CARGO' ? 'perfil' : (inst.type === 'PLAN_DE_TRABAJO_SEGURO' ? 'pts' : 'contrato'))}', '${trabajador.id}')"
                        class="py-2 px-3 ${firmado ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/50' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'} rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>${firmado ? '📥 Copia Firmada (PDF)' : '🖨️ Minuta Oficial'}</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Políticas Institucionales SG-SST -->
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-300">
                Políticas y Reglamentos de la Empresa (Ley 527 de 1999)
              </h3>
              
              <div class="divide-y divide-slate-800 text-xs">
                ${politicasInstitucionales.map(pol => {
                  const firmada = firmas.some(f => f.documentoId === pol.id || f.documentoCodigo === pol.id);
                  return `
                    <div class="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <span class="font-bold text-white block text-[11px]">${pol.title}</span>
                        <a href="${pol.enlace}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-teal-400 hover:underline">
                          📖 Ver documento oficial en Google Docs ↗
                        </a>
                      </div>
                      
                      ${firmada ? `
                        <span class="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                          ✓ Firmado
                        </span>
                      ` : `
                        <button 
                          type="button" 
                          onclick="window.firmarPolitica('${pol.id}', '${escapeHtml(pol.title)}', '${trabajador.id}')"
                          class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black flex-shrink-0 cursor-pointer"
                        >
                          ✍️ Firmar
                        </button>
                      `}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

          </div>
        ` : ''}

        <!-- --------------------------------------------------------------- -->
        <!-- PESTAÑA 3: E-LEARNING Y CAPACITACIONES SG-SST (AULA VIRTUAL)    -->
        <!-- --------------------------------------------------------------- -->
        ${activeMobileTab === 'elearning' ? `
          <div class="space-y-4 animate-fadeIn">
            
            <!-- Banner Cabecera E-Learning -->
            <div class="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-indigo-900/60 space-y-2 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-wider text-indigo-300 block">
                  Plan de Formación Obligatorio SG-SST (Dec. 1072 & Res. 0312)
                </span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-black ${capsEvaluadasCount === capacitaciones.length && capacitaciones.length > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                  ${capsEvaluadasCount}/${capacitaciones.length} Aprobados
                </span>
              </div>
              <h2 class="text-base font-black text-white flex items-center gap-2">
                <span>🎓</span>
                <span>Aula Virtual & Evaluaciones E-Learning</span>
              </h2>
              <p class="text-[11px] text-slate-300 leading-relaxed">
                Cursos interactivos con diapositivas, videos técnicos y cuestionarios de hasta 7 preguntas de selección múltiple con única respuesta. Al aprobar, se expiden automáticamente tus formatos legales oficiales <strong>DOC-10</strong> (Asistencia) y <strong>DOC-16</strong> (Evaluación).
              </p>
              
              <!-- Barra de Progreso del Plan de Formación -->
              <div class="pt-1 space-y-1">
                <div class="flex items-center justify-between text-[10px] font-bold">
                  <span class="text-slate-400">Progreso de Formación del Trabajador</span>
                  <span class="${capsEvaluadasCount === capacitaciones.length && capacitaciones.length > 0 ? 'text-emerald-400' : 'text-indigo-300'}">
                    ${capacitaciones.length > 0 ? Math.round((capsEvaluadasCount / capacitaciones.length) * 100) : 100}% Completado
                  </span>
                </div>
                <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                  <div 
                    class="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500" 
                    style="width: ${capacitaciones.length > 0 ? Math.round((capsEvaluadasCount / capacitaciones.length) * 100) : 100}%"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Listado de Cursos del Plan de Capacitación -->
            <div class="space-y-3">
              ${capacitaciones.length === 0 ? `
                <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
                  <span class="text-3xl block">📚</span>
                  <h3 class="text-xs font-bold text-white">No hay cursos programados</h3>
                  <p class="text-[10px] text-slate-400">El responsable SST programará las capacitaciones de tu plan de formación.</p>
                </div>
              ` : capacitaciones.map((cap, idx) => {
                const evals = cap.evaluaciones || [];
                const evalCap = evals.find(e => e.trabajadorId === trabajador.id || e.worker_id === trabajador.id);
                const aprobada = !!(evalCap && (evalCap.passed || evalCap.aprobada || (evalCap.nota || 0) >= 3.5));
                const numPreguntas = Math.min((cap.preguntas || []).length || 7, 7);
                const certCode = evalCap?.certificate_code || (evalCap?.id ? `DP-EVAL-${String(evalCap.id).slice(-6).toUpperCase()}` : null);

                return `
                  <div class="bg-slate-950 p-4 rounded-2xl border ${aprobada ? 'border-emerald-500/40 shadow-emerald-950/20' : 'border-indigo-900/40 shadow-indigo-950/20'} space-y-3 shadow-md transition">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-start gap-2.5">
                        <div class="w-9 h-9 rounded-xl ${aprobada ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'} flex items-center justify-center text-lg flex-shrink-0">
                          ${aprobada ? '🏆' : '🎓'}
                        </div>
                        <div>
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-[10px] font-mono ${aprobada ? 'text-emerald-400' : 'text-indigo-400'} font-bold">#${cap.order_number || idx + 1}</span>
                            ${(cap.order_number === 1 || cap.esInduccionObligatoria) ? `
                              <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Obligatoria Inducción
                              </span>
                            ` : ''}
                          </div>
                          <h3 class="text-xs font-black text-white leading-snug mt-0.5">${cap.tema}</h3>
                          <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
                            <span>⏱️ ${cap.duracion || '2 Horas'}</span>
                            <span>•</span>
                            <span>📝 ${numPreguntas} Preguntas</span>
                            <span>•</span>
                            <span>📊 Diapositivas + Video</span>
                          </div>
                        </div>
                      </div>

                      <span class="px-2 py-0.5 rounded-full text-[9px] font-black flex-shrink-0 ${aprobada ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                        ${aprobada ? '✓ Aprobado' : '⚠️ Pendiente'}
                      </span>
                    </div>

                    ${aprobada ? `
                      <div class="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[10px] space-y-1 font-mono">
                        <div class="flex items-center justify-between text-emerald-400 font-bold">
                          <span>● Certificación DOC-10 & DOC-16 Activa</span>
                          <span>Nota: ${evalCap.nota || 5.0} / 5.0</span>
                        </div>
                        <div class="text-slate-400 flex items-center justify-between">
                          <span>Cert: ${certCode || 'DP-EVAL-SST'}</span>
                          <span>${evalCap.accepted_at_bogota || evalCap.bogota_timestamp || (evalCap.fecha ? new Date(evalCap.fecha).toLocaleDateString() : 'Aprobado')}</span>
                        </div>
                      </div>
                    ` : `
                      <div class="p-2.5 bg-indigo-950/30 rounded-xl border border-indigo-900/30 text-[11px] text-slate-300">
                        Revisa el material audiovisual interactivo y completa el cuestionario de selección múltiple con mínimo 70% de aciertos.
                      </div>
                    `}

                    <div class="pt-1 border-t border-slate-800/80">
                      ${aprobada ? `
                        <div class="grid grid-cols-3 gap-2">
                          <button 
                            type="button" 
                            onclick="window.abrirAulaVirtualTrabajador('${cap.id}', '${trabajador.id}')"
                            class="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Repasar contenidos y video del curso"
                          >
                            <span>🎓 Repasar</span>
                          </button>
                          <button 
                            type="button" 
                            onclick="window.imprimirRegistroCapacitacionDOC10('${evalCap.id}')"
                            class="py-2 px-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Imprimir planilla legal DOC-10 de asistencia"
                          >
                            <span>📄 DOC-10</span>
                          </button>
                          <button 
                            type="button" 
                            onclick="window.imprimirEvaluacionCapacitacionDOC16('${evalCap.id}')"
                            class="py-2 px-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Imprimir formato legal DOC-16 de evaluación"
                          >
                            <span>📝 DOC-16</span>
                          </button>
                        </div>
                      ` : `
                        <button 
                          type="button" 
                          onclick="window.abrirAulaVirtualTrabajador('${cap.id}', '${trabajador.id}')"
                          class="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-900/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          <span>▶️ Ingresar al Curso y Responder Cuestionario ➔</span>
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

          </div>
        ` : ''}

        <!-- --------------------------------------------------------------- -->
        <!-- PESTAÑA 4: HERRAMIENTAS, ESCÁNER QR & EPP                      -->
        <!-- --------------------------------------------------------------- -->
        ${activeMobileTab === 'tools' ? `
          <div class="space-y-4 animate-fadeIn">
            
            <!-- Botón Grande para Escanear QR en Planta -->
            <div class="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 p-4 rounded-2xl border border-teal-800/60 shadow-lg text-center space-y-2">
              <span class="text-3xl block">📷</span>
              <h2 class="text-sm font-black text-white">Escaneo Rápido de Herramientas</h2>
              <p class="text-[11px] text-slate-300">
                Usa la cámara de tu celular para escanear el código QR fijado en la máquina o equipo en planta.
              </p>
              <button 
                type="button" 
                onclick="window.abrirModalEscanerQR('${trabajador.id}')"
                class="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black text-xs shadow-md shadow-teal-900/40 transition cursor-pointer active:scale-98"
              >
                Abrir Escáner QR de Cámara
              </button>
            </div>

            <!-- Sección A: Equipos Asignados bajo Custodia -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-300">
                  🔧 Mis Equipos Asignados (${misHerramientasAsignadas.length})
                </h3>
                <span class="text-[10px] text-teal-400 font-bold">Decreto 1072</span>
              </div>

              ${(misHerramientasAsignadas.length > 0 ? misHerramientasAsignadas : toolsInventory.slice(0, 3)).map(tool => {
                const asg = store.getActiveToolAssignment(tool.id);
                const sst = store.getToolSST(tool.id);
                const custodiaFirmada = !!asg?.digital_signature_file || !!asg?.digital_signature_hash;

                return `
                  <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-slate-800 text-teal-300">${tool.internal_code}</span>
                          <span class="text-xs font-black text-white">${tool.exact_name}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 block mt-0.5">
                          Marca: ${tool.brand || 'Industrial'} · Modelo: ${tool.model || 'N/A'} · Serie: ${tool.serial_number || 'N/A'}
                        </span>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[9px] font-black ${tool.current_status === 'Operativa' || tool.current_status === 'En Funcionamiento' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}">
                        ${tool.current_status}
                      </span>
                    </div>

                    ${custodiaFirmada ? `
                      <div class="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <span>✓ Custodia Firmada Digitalmente:</span>
                        <span class="truncate max-w-[140px] text-slate-400">${asg.digital_signature_hash || 'Acta en regla'}</span>
                      </div>
                    ` : `
                      <button 
                        type="button" 
                        onclick="window.abrirModalFirmaCustodia('${tool.id}', '${escapeHtml(tool.exact_name)}', '${trabajador.id}')"
                        class="w-full py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-[10px] font-black transition cursor-pointer"
                      >
                        ✍️ Firmar Acta de Custodia / Recibido
                      </button>
                    `}

                    <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                      <button 
                        type="button" 
                        onclick="window.abrirModalPreoperacionalTrabajador('${trabajador.id}', '${tool.id}')"
                        class="py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>📋</span>
                        <span>Preoperacional</span>
                      </button>

                      <button 
                        type="button" 
                        onclick="window.abrirModalFichaTecnicaSST('${tool.id}')"
                        class="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>🛡️</span>
                        <span>Ficha SST</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Sección B: Bandeja de Mis Entregas de EPP y Dotación (Decreto 1072 & Res. 0312 Estándar 4.2.6) -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <span>🦺</span>
                    <span>Mis Entregas de EPP &amp; Dotación Legal</span>
                  </h3>
                  <span class="text-[10px] text-teal-400 font-bold">Estándar 4.2.6 Res. 0312 • Art. 230 CST</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[9px] font-black ${entregasEppPendientes.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300'}">
                  ${entregasEppPendientes.length > 0 ? `⚠️ ${entregasEppPendientes.length} Pendiente(s)` : '✓ Al Día'}
                </span>
              </div>

              <!-- SUBSECCIÓN 1: ENTREGAS PENDIENTES POR FIRMAR (ALERTA DESTACADA) -->
              ${entregasEppPendientes.length > 0 ? `
                <div class="space-y-2.5">
                  <div class="bg-amber-500/15 border border-amber-500/50 rounded-2xl p-3.5 space-y-1.5 shadow-lg shadow-amber-950/40">
                    <div class="flex items-center gap-2 text-amber-300 font-black text-xs">
                      <span class="text-base">⚠️</span>
                      <span>TIENES ${entregasEppPendientes.length} ACTA(S) PENDIENTE(S) POR FIRMAR</span>
                    </div>
                    <p class="text-[11px] text-slate-300 leading-snug">
                      El área de SST ha registrado la entrega formal de tus prendas de dotación o EPP. Revisa los elementos y firma con tu dedo para legalizar el recibo conforme a la Ley 9/1979 y Decreto 1072.
                    </p>
                  </div>

                  ${entregasEppPendientes.map(deliv => {
                    const items = Array.isArray(deliv.items) ? deliv.items : [];
                    const bogotaHora = deliv.bogota_assigned_at || new Date(deliv.assigned_at).toLocaleString('es-CO');

                    return `
                      <div class="bg-slate-950 border border-amber-500/50 rounded-2xl p-4 space-y-3 shadow-md">
                        <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                          <div>
                            <div class="flex items-center gap-2">
                              <span class="font-mono text-xs font-black text-amber-400">${deliv.delivery_consecutive}</span>
                              <span class="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300">
                                PENDIENTE FIRMA
                              </span>
                            </div>
                            <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>🕒 Asignado:</span>
                              <span class="font-bold text-slate-300">${bogotaHora}</span>
                            </div>
                            <div class="text-[10px] text-slate-400">
                              <span>Motivo:</span>
                              <span class="text-slate-200 font-bold">${
                                deliv.delivery_reason === 'Periodica_Ley_Abril_Agosto_Diciembre' ? 'Dotación Periódica de Ley (Art. 230 CST)' :
                                deliv.delivery_reason === 'Dotacion_Ingreso' ? 'Dotación de Ingreso' :
                                deliv.delivery_reason === 'Reposicion_Por_Desgaste_Deterioro' ? 'Reposición por Desgaste de EPP' :
                                'Cambio de Cargo'
                              }</span>
                            </div>
                          </div>
                        </div>

                        <!-- Lista de Ítems Asignados -->
                        <div class="space-y-1.5">
                          <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Elementos Asignados en esta Entrega:</span>
                          ${items.map(it => `
                            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                              <div>
                                <span class="font-bold text-white block">${escapeHtml(it.item_name_snapshot || it.item_name)}</span>
                                <span class="text-[10px] text-slate-400">
                                  Norma: ${it.technical_standard_snapshot || it.technical_standard || 'N/A'} · Talla: <strong class="text-teal-300">${it.size_delivered || 'Única'}</strong>
                                </span>
                              </div>
                              <span class="px-2 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono font-bold text-xs">
                                Cant: ${it.quantity_delivered || 1}
                              </span>
                            </div>
                          `).join('')}
                        </div>

                        <!-- Botón de Firma -->
                        <button 
                          type="button" 
                          onclick="window.abrirModalFirmarActaEntregaEPP('${deliv.id}', '${trabajador.id}')"
                          class="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-950/50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                        >
                          <span>✍️</span>
                          <span>Revisar y Firmar Acta de Entrega con el Dedo</span>
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}

              <!-- SUBSECCIÓN 2: HISTORIAL DE ENTREGAS FIRMADAS (FIRMADO_ENTREGADO) -->
              <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>📜</span>
                    <span>Historial de Dotación &amp; EPP Recibidos (${entregasEppFirmadas.length})</span>
                  </h4>
                  <span class="text-[10px] font-mono text-emerald-400 font-bold">Ley 527/1999</span>
                </div>

                ${entregasEppFirmadas.length === 0 ? `
                  <div class="text-center py-4 space-y-1">
                    <p class="text-xs text-slate-400">No registras actas firmadas formalmente todavía.</p>
                    <span class="text-[10px] text-slate-500 block">Tus entregas de dotación cuatrimestral y EPP homologados se archivarán aquí con retención legal de 20 años.</span>
                  </div>
                ` : `
                  <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${entregasEppFirmadas.map(deliv => {
                      const items = Array.isArray(deliv.items) ? deliv.items : [];
                      const fechaFirma = deliv.bogota_signed_at || new Date(deliv.worker_signed_at || deliv.updated_at).toLocaleString('es-CO');

                      return `
                        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div class="flex items-center justify-between">
                            <div>
                              <span class="font-mono text-xs font-bold text-teal-300 block">${deliv.delivery_consecutive}</span>
                              <span class="text-[10px] text-slate-400">Firmado el: ${fechaFirma}</span>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✓ Entregado y Firmado
                            </span>
                          </div>

                          <div class="text-[11px] text-slate-300 line-clamp-2">
                            ${items.map(it => `${it.quantity_delivered || 1}x ${it.item_name_snapshot || it.item_name} (Talla: ${it.size_delivered || 'Única'})`).join(', ')}
                          </div>

                          <div class="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span class="text-[9px] font-mono text-slate-500 truncate max-w-[150px]" title="${deliv.cryptographic_hash_sha256 || ''}">
                              Hash: ${(deliv.cryptographic_hash_sha256 || 'SHA-256').substring(0, 16)}...
                            </span>
                            <button 
                              type="button" 
                              onclick="window.imprimirActaEntregaEPP_SST_FOR_01('${deliv.id}')"
                              class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer border border-slate-700"
                              title="Descargar o imprimir formato oficial SST-FOR-EPP-01"
                            >
                              <span>📄</span>
                              <span>Ver Formato PDF</span>
                            </button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `}

                <!-- Si no tiene ni pendientes ni firmadas, mostrar lista reglamentaria del cargo -->
                ${misEntregasEpp.length === 0 ? `
                  <div class="pt-2 border-t border-slate-800/80 space-y-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Elementos Requeridos por Cargo (${trabajador.cargo}):
                    </span>
                    <div class="space-y-1.5">
                      ${eppListaFinal.map(epp => `
                        <div class="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                          <span class="font-bold text-slate-200">${epp}</span>
                          <span class="text-[10px] text-teal-400 font-mono">Norma NTC / ANSI</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Sección C: Historial de Inspecciones Preoperacionales -->
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-300">
                  📋 Mis Preoperacionales Recientes (${preoperacionales.length})
                </h3>
                <button 
                  type="button" 
                  onclick="window.abrirModalPreoperacionalTrabajador('${trabajador.id}')"
                  class="text-[10px] text-teal-400 hover:underline font-bold"
                >
                  + Nuevo
                </button>
              </div>

              ${preoperacionales.length === 0 ? `
                <p class="text-[11px] text-slate-400 py-2">No has registrado inspecciones preoperacionales en este turno.</p>
              ` : `
                <div class="divide-y divide-slate-800/80 max-h-48 overflow-y-auto space-y-1 text-xs">
                  ${preoperacionales.slice(0, 5).map(p => `
                    <div class="py-2 flex items-center justify-between gap-2">
                      <div>
                        <span class="font-black text-white block text-[11px]">${p.equipoNombre}</span>
                        <span class="text-[10px] text-slate-400 block">${new Date(p.performed_at || p.fechaCreacion || Date.now()).toLocaleDateString()} · ${p.observaciones || 'Verificación estándar'}</span>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[9px] font-black ${p.aptoOperar === 'SI' || p.status_result === 'Aprobado' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                        ${p.aptoOperar === 'SI' || p.status_result === 'Aprobado' ? '✓ Apto' : '🛑 No Apto'}
                      </span>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

          </div>
        ` : ''}

        <!-- --------------------------------------------------------------- -->
        <!-- PESTAÑA 4: REPORTAR SST (WIZARD DE 3 PASOS CON CÁMARA)          -->
        <!-- --------------------------------------------------------------- -->
        ${activeMobileTab === 'reportar' ? `
          <div class="space-y-4 animate-fadeIn">
            
            <div class="bg-gradient-to-r from-rose-950 to-slate-900 p-4 rounded-2xl border border-rose-900/50 space-y-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-rose-300 block">
                Participación Preventiva • Dec. 1072 Art. 2.2.4.6.10
              </span>
              <h2 class="text-base font-black text-white">
                Reporte Ágil de Peligros y Condiciones Inseguras
              </h2>
              <p class="text-[11px] text-slate-300 leading-relaxed">
                Notifica en 3 pasos cualquier daño en maquinaria, piso resbaloso, falta de iluminación o acto inseguro en planta.
              </p>
            </div>

            <!-- Formulario Wizard de 3 Pasos -->
            <form id="form-wizard-reporte-sst" class="bg-slate-950 p-4 rounded-3xl border border-slate-800 space-y-4">
              
              <!-- Paso 1: Tipo de Reporte -->
              <div class="space-y-1.5">
                <label class="text-[11px] font-black uppercase text-teal-300 block">
                  1. ¿Qué deseas reportar? *
                </label>
                <div class="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <label class="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:border-teal-500 cursor-pointer block has-checked:border-teal-400 has-checked:bg-teal-950/40">
                    <input type="radio" name="wiz-tipo" value="Condicion_Insegura" checked class="hidden">
                    <span class="text-base block mb-0.5">⚠️</span>
                    <span class="font-bold text-[10px] text-white block">Condición Insegura</span>
                  </label>
                  <label class="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:border-teal-500 cursor-pointer block has-checked:border-teal-400 has-checked:bg-teal-950/40">
                    <input type="radio" name="wiz-tipo" value="Acto_Inseguro" class="hidden">
                    <span class="text-base block mb-0.5">🛑</span>
                    <span class="font-bold text-[10px] text-white block">Acto Inseguro</span>
                  </label>
                  <label class="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:border-teal-500 cursor-pointer block has-checked:border-teal-400 has-checked:bg-teal-950/40">
                    <input type="radio" name="wiz-tipo" value="Incidente_Trabajo" class="hidden">
                    <span class="text-base block mb-0.5">🚨</span>
                    <span class="font-bold text-[10px] text-white block">Incidente (Casi-Accidente)</span>
                  </label>
                </div>
              </div>

              <!-- Paso 2: Ubicación y Descripción con Chips Rápidos -->
              <div class="space-y-2">
                <label class="text-[11px] font-black uppercase text-teal-300 block">
                  2. Ubicación y Detalle del Peligro *
                </label>
                
                <input 
                  type="text" 
                  id="wiz-ubicacion" 
                  required 
                  value="${escapeHtml(trabajador.area || 'Planta Operativa')}" 
                  placeholder="Ubicación exacta (ej. Patio de hornos, Molino 2...)" 
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >

                <!-- Chips de Descripción Rápida -->
                <div class="space-y-1">
                  <span class="text-[10px] text-slate-400 block">Opciones rápidas frecuentes:</span>
                  <div class="flex flex-wrap gap-1.5">
                    ${['Piso resbaloso / Grasa', 'Herramienta sin guarda', 'Falta de iluminación', 'Derrame de fluidos', 'No uso de EPP', 'Falla eléctrica', 'Andamio inestable'].map(chip => `
                      <button 
                        type="button" 
                        onclick="document.getElementById('wiz-descripcion').value = '${chip} en ' + document.getElementById('wiz-ubicacion').value;"
                        class="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-teal-500 text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        + ${chip}
                      </button>
                    `).join('')}
                  </div>
                </div>

                <textarea 
                  id="wiz-descripcion" 
                  required 
                  rows="3" 
                  placeholder="Describe brevemente la anomalía o riesgo observado..." 
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-0.5">Nivel de Severidad</label>
                    <select id="wiz-severidad" class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-bold">
                      <option value="Media" selected>🟡 Media / Preventiva</option>
                      <option value="Alta">🔴 Alta / Inminente</option>
                      <option value="Baja">🟢 Baja / Oportunidad</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Paso 3: Foto con la Cámara del Celular -->
              <div class="space-y-2">
                <label class="text-[11px] font-black uppercase text-teal-300 block">
                  3. Foto de Evidencia (Cámara del Celular)
                </label>
                
                <div class="flex items-center gap-3">
                  <label class="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-2xl text-center cursor-pointer transition">
                    <span class="text-xl block mb-0.5">📸</span>
                    <span class="text-xs font-black text-teal-300 block">Tomar Foto con Celular</span>
                    <span class="text-[10px] text-slate-400 block">Compresión automática</span>
                    <input type="file" id="wiz-foto-input" accept="image/*" capture="environment" class="hidden">
                  </label>

                  <div id="wiz-foto-preview-container" class="w-20 h-20 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden hidden flex-shrink-0">
                    <img id="wiz-foto-preview-img" src="" alt="Vista previa" class="w-full h-full object-cover">
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                id="btn-submit-wiz-reporte"
                class="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-rose-950/50 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>🚀 Enviar Reporte Inmediato a SST</span>
              </button>
            </form>

            <!-- Historial de Mis Reportes Realizados -->
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-300">
                Historial de Mis Reportes (${reportesPeligro.length})
              </h3>

              ${reportesPeligro.length === 0 ? `
                <p class="text-[11px] text-slate-400 py-2">No has reportado condiciones inseguras recientemente.</p>
              ` : `
                <div class="divide-y divide-slate-800/80 space-y-2 text-xs">
                  ${reportesPeligro.map(r => `
                    <div class="pt-2 space-y-1">
                      <div class="flex items-center justify-between">
                        <span class="px-2 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ${r.prioridad || r.severity_level || 'Media'}
                        </span>
                        <span class="text-[10px] text-slate-400">
                          ${new Date(r.fecha || r.fechaReporte || r.reported_at || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <p class="font-bold text-white">${r.descripcion}</p>
                      <p class="text-[10px] text-slate-400">📍 ${r.ubicacion || 'Planta'} · Estado: <strong class="text-teal-300">${r.estado || r.status || 'En Gestión SST'}</strong></p>
                      ${r.photo_url || r.fotoUrl ? `
                        <div class="mt-1">
                          <img src="${r.photo_url || r.fotoUrl}" class="w-24 h-16 object-cover rounded-xl border border-slate-800" alt="Evidencia">
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

          </div>
        ` : ''}

        <!-- --------------------------------------------------------------- -->
        <!-- PESTAÑA 5: MI PERFIL (SALUD, CAPACITACIONES & DESCARGA PDFS)    -->
        <!-- --------------------------------------------------------------- -->
        ${activeMobileTab === 'perfil' ? `
          <div class="space-y-4 animate-fadeIn">
            
            <!-- Ficha Resumen del Trabajador -->
            <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-slate-800 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl font-black shadow-md border-2 border-emerald-400/30 flex-shrink-0">
                  ${trabajador.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 class="text-base font-black text-white">${trabajador.nombre}</h2>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ${trabajador.cargo}
                  </span>
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    C.C. ${trabajador.identificacion || trabajador.cedula} · ${trabajador.tipoContrato || 'Término Indefinido'}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <div><span class="text-slate-400">EPS:</span> <strong class="text-white">${trabajador.eps || 'Sura EPS'}</strong></div>
                <div><span class="text-slate-400">ARL:</span> <strong class="text-white">${trabajador.arl || 'Positiva ARL'}</strong></div>
                <div><span class="text-slate-400">AFP:</span> <strong class="text-white">${trabajador.afp || 'Protección'}</strong></div>
                <div><span class="text-slate-400">Ingreso:</span> <strong class="text-white">${trabajador.fechaContrato || trabajador.fechaIngreso || 'Vigente'}</strong></div>
              </div>
            </div>

            <!-- ACCESO DIRECTO AL CARNÉ DIGITAL SST CON QR -->
            <button 
              type="button" 
              onclick="window.abrirModalCarneDigital('${trabajador.id}')"
              class="w-full py-3 px-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-teal-500/20 flex items-center justify-between transition cursor-pointer active:scale-98 border border-teal-400/30"
            >
              <div class="flex items-center gap-2.5">
                <span class="text-xl">🪪</span>
                <div class="text-left">
                  <span class="block text-xs font-black text-white">Mi Carné Digital SST &amp; Código QR</span>
                  <span class="block text-[10px] text-teal-200 font-medium">Validación oficial para porterías, ARL e inspección</span>
                </div>
              </div>
              <span class="px-2.5 py-1 bg-white/20 rounded-xl text-[10px] font-bold">Ver Carné ➔</span>
            </button>

            <!-- GESTOR DE FIRMA DIGITAL Y HUELLA DE ACEPTACIÓN (LEY 527 DE 1999) -->
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                  <span>✍️</span> Mi Firma Digital &amp; Huella de Aceptación
                </h3>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${trabajador.has_registered_signature ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                  ${trabajador.has_registered_signature ? '✓ Firma Registrada' : '⚠️ Pendiente'}
                </span>
              </div>

              ${trabajador.has_registered_signature ? `
                <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div class="p-2 bg-white rounded-lg flex items-center justify-center">
                    <img src="${obtenerUrlFirmaTrabajador(trabajador)}" alt="Mi Firma" style="max-height: 48px; max-width: 180px; object-fit: contain;">
                  </div>
                  <div class="text-[9.5px] font-mono text-slate-400 space-y-0.5">
                    <p class="truncate"><strong class="text-slate-300">Hash SHA-256:</strong> ${trabajador.signature_sha256 || 'SHA-256'}</p>
                    <p><strong class="text-slate-300">Registrada el:</strong> ${trabajador.signature_registered_bogota || new Date(trabajador.signature_registered_at).toLocaleString('es-CO')}</p>
                    <p><strong class="text-slate-300">Dirección IP:</strong> ${trabajador.signature_ip_address || '127.0.0.1'}</p>
                    <p class="truncate text-teal-400"><strong class="text-slate-300">MinIO S3:</strong> ${trabajador.signature_s3_key || `tenants/${empresa.id}/signatures/emp_${trabajador.id}.png`}</p>
                  </div>
                </div>
              ` : `
                <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  Aún no registras tu firma digital base. Al registrarla, podrás estamparla al instante en contratos, manuales de cargo y actas de dotación.
                </div>
              `}

              <button 
                type="button" 
                onclick="window.abrirModalRegistroFirmaTrabajador('${trabajador.id}')"
                class="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>✍️</span>
                <span>${trabajador.has_registered_signature ? 'Actualizar Mi Firma Digital' : 'Registrar Mi Firma Ahora'}</span>
              </button>
            </div>

            <!-- EXPEDIENTE LABORAL DIGITAL (CARPETA DEL TRABAJADOR - DEC. 1072) -->
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <span>📁</span> Mi Expediente Laboral Digital
                </h3>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${folderCompleteness.isComplete ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                  ${folderCompleteness.isComplete ? '✓ Completo (5/5)' : `${folderCompleteness.presentCount}/5 Documentos`}
                </span>
              </div>

              <!-- Mini semáforo -->
              <div class="grid grid-cols-5 gap-1.5 text-center text-[9px]">
                ${[
                  { key: 'CEDULA_CIUDADANIA', label: 'Cédula', icon: '🪪' },
                  { key: 'HOJA_DE_VIDA', label: 'HV', icon: '📄' },
                  { key: 'CERTIFICACION_BANCARIA', label: 'Banco', icon: '🏦' },
                  { key: 'EXAMEN_MEDICO_INGRESO', label: 'Médico', icon: '🩺' },
                  { key: 'SEGURIDAD_SOCIAL', label: 'Seg. Social', icon: '🏥' }
                ].map(cat => {
                  const tiene = !!folderCompleteness.categoriesPresent[cat.key];
                  return `
                    <div class="p-1.5 rounded-xl border ${tiene ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}">
                      <span class="block text-sm">${cat.icon}</span>
                      <strong class="block truncate">${cat.label}</strong>
                      <span class="text-[8px] font-bold">${tiene ? '✓ OK' : 'Pend.'}</span>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="text-[10px] text-slate-400">Retención Legal: 20 Años</span>
                <button 
                  type="button" 
                  onclick="window.abrirModalCarpetaTrabajador('${trabajador.id}')"
                  class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <span>📂</span>
                  <span>Abrir Mi Carpeta</span>
                </button>
              </div>
            </div>

            <!-- Salud Ocupacional (Profesiograma Médico) -->
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black uppercase tracking-wider text-teal-300">
                  🏥 Exámenes Médicos Ocupacionales (Profesiograma)
                </h3>
                <span class="text-[10px] font-bold text-emerald-400">Apto sin restricciones</span>
              </div>

              <div class="space-y-1.5 text-xs text-slate-300">
                <div class="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span class="font-black text-white block text-[11px]">1. Examen de Ingreso / Periódico</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    Énfasis osteomuscular, audiometría tonal ocupacional, agudeza visual y valoración médica general.
                  </p>
                </div>
                <div class="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span class="font-black text-white block text-[11px]">2. Vigencia de Concepto de Aptitud</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    Vigente conforme a la Res. 2346 de 2007. Próximo examen periódico programado dentro del ciclo anual.
                  </p>
                </div>
              </div>
            </div>

            <!-- Formación y Capacitaciones (DOC-10 y DOC-16) -->
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-200">
                  🎓 Cursos y Aula Virtual (${capsEvaluadasCount}/${capacitaciones.length})
                </h3>
                <span class="text-[10px] text-indigo-400 font-bold">DOC-10 & DOC-16</span>
              </div>

              <div class="space-y-2">
                ${capacitaciones.map(cap => {
                  const evalCap = (cap.evaluaciones || []).find(e => e.trabajadorId === trabajador.id || e.worker_id === trabajador.id);
                  const realizada = !!evalCap;
                  return `
                    <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span class="font-bold text-white block text-[11px]">${cap.tema}</span>
                        <span class="text-[10px] text-slate-400">${cap.duracion || '2 Horas'} · ${evalCap ? `Nota: ${evalCap.nota || 5.0} / 5.0` : 'Pendiente de realizar'}</span>
                      </div>
                      <button 
                        type="button" 
                        onclick="window.abrirAulaVirtualTrabajador('${cap.id}', '${trabajador.id}')"
                        class="px-2.5 py-1 ${realizada ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'} rounded-lg text-[10px] font-black flex-shrink-0 cursor-pointer"
                      >
                        ${realizada ? 'Ver Certificado' : 'Ir al Curso ➔'}
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Bandeja de Descarga de Documentos Firmados (Retención 20 Años) -->
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-200">
                  📁 Documentos y Actas Firmadas (Retención 20 Años)
                </h3>
                <span class="text-[9px] text-slate-400">Dec. 1072 Art. 2.2.4.6.13</span>
              </div>

              <div class="space-y-1.5 text-xs">
                ${docSigs.length === 0 ? `
                  <p class="text-[11px] text-slate-400 py-2">Aún no registras documentos firmados en tu bandeja.</p>
                ` : `
                  ${docSigs.map(sig => `
                    <div class="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <div class="overflow-hidden">
                        <span class="font-bold text-white block text-[11px] truncate">${sig.document_title || sig.document_type}</span>
                        <span class="text-[10px] text-slate-400 block">${sig.bogota_timestamp || new Date(sig.signed_at).toLocaleString()}</span>
                      </div>
                      <button 
                        type="button" 
                        onclick="window.verSelloFirma('${sig.id}')"
                        class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-[10px] font-bold flex-shrink-0 cursor-pointer"
                      >
                        Sello Digital
                      </button>
                    </div>
                  `).join('')}
                `}
              </div>
            </div>

          </div>
        ` : ''}

      </main>

      <!-- =================================================================== -->
      <!-- BARRA DE NAVEGACIÓN INFERIOR FIJA (BOTTOM TAB BAR - USO CON PULGAR) -->
      <!-- =================================================================== -->
      <nav class="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 px-2 py-2 flex items-center justify-around safe-bottom-nav shadow-2xl">
        
        <button 
          type="button" 
          onclick="window.cambiarTabMovil('inicio')" 
          class="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${activeMobileTab === 'inicio' ? 'text-teal-400 font-black' : 'text-slate-400 hover:text-slate-200'}"
        >
          <span class="text-xl">🏠</span>
          <span class="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Inicio</span>
        </button>

        <button 
          type="button" 
          onclick="window.cambiarTabMovil('docs')" 
          class="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${activeMobileTab === 'docs' ? 'text-teal-400 font-black' : 'text-slate-400 hover:text-slate-200'}"
        >
          <span class="text-xl">📄</span>
          <span class="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Mi Cargo</span>
        </button>

        <button 
          type="button" 
          onclick="window.cambiarTabMovil('elearning')" 
          class="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer relative ${activeMobileTab === 'elearning' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'}"
        >
          <span class="text-xl">🎓</span>
          <span class="text-[9px] sm:text-[10px] tracking-tight mt-0.5">E-Learning</span>
          ${(capacitaciones.length - capsEvaluadasCount > 0) ? `
            <span class="absolute top-0 right-2 sm:right-3 w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          ` : ''}
        </button>

        <button 
          type="button" 
          onclick="window.cambiarTabMovil('tools')" 
          class="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${activeMobileTab === 'tools' ? 'text-teal-400 font-black' : 'text-slate-400 hover:text-slate-200'}"
        >
          <span class="text-xl">🛠️</span>
          <span class="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Equipos</span>
        </button>

        <button 
          type="button" 
          onclick="window.cambiarTabMovil('reportar')" 
          class="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${activeMobileTab === 'reportar' ? 'text-rose-400 font-black' : 'text-slate-400 hover:text-slate-200'}"
        >
          <span class="text-xl">⚠️</span>
          <span class="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Reportar</span>
        </button>

        <button 
          type="button" 
          onclick="window.cambiarTabMovil('perfil')" 
          class="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${activeMobileTab === 'perfil' ? 'text-teal-400 font-black' : 'text-slate-400 hover:text-slate-200'}"
        >
          <span class="text-xl">👤</span>
          <span class="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Mi Perfil</span>
        </button>

      </nav>

    </div>
  `;

  // Listener para captura y compresión de foto en Wizard de Reportar SST
  const fotoInput = document.getElementById('wiz-foto-input');
  if (fotoInput) {
    fotoInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const previewContainer = document.getElementById('wiz-foto-preview-container');
      const previewImg = document.getElementById('wiz-foto-preview-img');

      try {
        const fotoComprimida = await comprimirFoto(file, 800, 800, 0.7);
        if (previewImg && previewContainer) {
          previewImg.src = fotoComprimida;
          previewContainer.classList.remove('hidden');
          previewContainer.setAttribute('data-base64', fotoComprimida);
        }
      } catch (err) {
        console.warn("Error comprimiendo foto:", err);
      }
    });
  }

  // Listener para el formulario Wizard de Reporte SST
  const formReporte = document.getElementById('form-wizard-reporte-sst');
  if (formReporte) {
    formReporte.onsubmit = async (e) => {
      e.preventDefault();
      const tipo = document.querySelector('input[name="wiz-tipo"]:checked')?.value || 'Condicion_Insegura';
      const ubicacion = document.getElementById('wiz-ubicacion')?.value || 'Planta Operativa';
      const descripcion = document.getElementById('wiz-descripcion')?.value || '';
      const severidad = document.getElementById('wiz-severidad')?.value || 'Media';
      const fotoBase64 = document.getElementById('wiz-foto-preview-container')?.getAttribute('data-base64') || '';
      const btn = document.getElementById('btn-submit-wiz-reporte');

      if (btn) btn.disabled = true;

      try {
        await store.submitWorkerHazardReport({
          worker_id: trabajador.id,
          tenant_id: empresa.id,
          report_type: tipo,
          location: ubicacion,
          description: descripcion,
          severity_level: severidad,
          photo_base64: fotoBase64
        });

        alert("✓ Reporte SST enviado exitosamente. Se ha registrado en la plataforma y notificado al coordinador.");
        formReporte.reset();
        const prev = document.getElementById('wiz-foto-preview-container');
        if (prev) {
          prev.classList.add('hidden');
          prev.removeAttribute('data-base64');
        }
        renderWorkerPortal();
      } catch (err) {
        alert("Error al enviar reporte: " + err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }
}

// =============================================================================
// MODAL DE FIRMA DIGITAL CON DEDO PARA LOS 4 INSTRUMENTOS DE CARGO
// =============================================================================
window.abrirModalFirmarDocumentoCargo = function(docType, cargoTitle, trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) return;
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva();
  const configCargo = store.getPerfilCargo(trabajador.cargo, empresa.id);
  const cargosFormales = store.getJobPositions(empresa.id);
  const cargoFormal = cargosFormales.find(cg => cg.id === trabajador.job_position_id || (cg.title || '').toLowerCase().trim() === (trabajador.cargo || '').toLowerCase().trim());
  const todasActividadesProcesos = store.getAllProcessActivities(empresa.id);
  const misActividadesPHVA = cargoFormal
    ? todasActividadesProcesos.filter(a => a.responsible_position_id === cargoFormal.id)
    : [];

  // Verificar si ya existe firma registrada para este documento
  const docSigs = store.data.employee_document_signatures || [];
  const sigFound = docSigs.find(s => 
    (s.employee_id === trabajador.id || s.trabajadorId === trabajador.id) && 
    (s.document_type === docType || (docType === 'MANUAL_DE_CARGO' && (s.document_type || '').includes('MANUAL')))
  );
  const isFirmado = !!sigFound;

  const modalId = 'modal-firmar-documento-cargo';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  // Generar contenido oficial del documento según el tipo
  let contenidoHtml = '';
  let codigoDoc = '';

  if (docType === 'MANUAL_DE_CARGO') {
    codigoDoc = `MAN-${cargoFormal?.code || 'OPE-001'}`;
    const depto = cargoFormal?.department || trabajador.area || 'Operaciones y Producción';
    const jefe = cargoFormal?.parent_job_position_title || (cargoFormal?.hierarchy_level === 'Directivo' ? 'Junta Directiva / Representante Legal' : 'Gerencia General / Líder de Proceso');
    const objetivo = cargoFormal?.job_objective || cargoFormal?.summary_objective || configCargo?.perfil?.objetivo || `Desempeñar con excelencia técnica, compromiso ético y estricto apego a las normas del SG-SST las actividades asignadas al puesto de ${trabajador.cargo}.`;
    const edu = cargoFormal?.required_education || configCargo?.perfil?.educacion || 'Bachiller Académico o Técnico Laboral';
    const exp = cargoFormal?.required_experience || configCargo?.perfil?.experiencia || '1 año en labores afines a la operación o manufactura';
    const formSst = configCargo?.perfil?.formacionSST || 'Inducción General SG-SST, Curso 50/20h SST (Dec. 1072/2015), Protocolos de Bioseguridad y Manejo de Emergencias (Res. 0312/2019)';
    const skills = (cargoFormal?.personality_skills && cargoFormal.personality_skills.length > 0)
      ? cargoFormal.personality_skills
      : ['Liderazgo y comunicación asertiva', 'Disciplina operacional y autocuidado', 'Capacidad analítica y resolución de problemas', 'Trabajo en equipo y adaptabilidad', 'Orientación a la calidad'];

    const funciones = (cargoFormal?.operational_functions && cargoFormal.operational_functions.length > 0)
      ? cargoFormal.operational_functions
      : (misActividadesPHVA.length > 0
          ? misActividadesPHVA.map(a => `[${a.phva_phase}] ${a.name}: ${a.description}`)
          : (configCargo?.manualFunciones?.funcionesOperativas || [
              `Ejecutar las labores diarias y secuenciales asignadas al puesto de ${trabajador.cargo} cumpliendo con los estándares técnicos y de calidad establecidos.`,
              'Inspeccionar y verificar el estado óptimo de las herramientas, maquinarias y equipos antes de iniciar operaciones.',
              'Mantener el orden, aseo estricto (5S) y organización en su puesto de trabajo.',
              'Notificar de inmediato cualquier falla, desviación o condición subestándar en los procesos.',
              'Participar en los controles de entrega de turno y diligenciamiento de bitácoras operativas.'
            ]));

    const responsabilidades = (cargoFormal?.sst_responsibilities && cargoFormal.sst_responsibilities.length > 0)
      ? cargoFormal.sst_responsibilities
      : (configCargo?.manualFunciones?.responsabilidadesSST || [
          'Procurar el cuidado integral de su salud física y mental en el desarrollo de sus actividades laborales (Dec. 1072/2015 Art. 2.2.4.6.10 Num. 1).',
          'Suministrar información clara, veraz y completa sobre su estado de salud al empleador o área de SST (Num. 2).',
          'Cumplir a cabalidad las normas, reglamentos, instrucciones y procedimientos de trabajo seguro del SG-SST (Num. 3).',
          'Informar oportunamente al empleador o supervisor sobre los peligros y riesgos latentes detectados en su sitio de trabajo (Num. 4).',
          'Participar activamente en las actividades de capacitación, inducción y simulacros de emergencia programados en el Plan Anual (Num. 5).',
          'Participar y contribuir activamente al cumplimiento de los objetivos y metas del SG-SST de la empresa (Num. 6).',
          'Reportar e investigar todo incidente, accidente de trabajo o condición insegura de forma inmediata al supervisor de SST.',
          'Participar en los programas de vigilancia epidemiológica y comités institucionales (COPASST / Convivencia).'
        ]);

    const autoridad = cargoFormal?.authority_scope || 'Autoridad técnica y operacional en su puesto de trabajo. Coordinación directa de labores encomendadas y custodia de herramientas o equipos asignados.';
    const suspension = cargoFormal?.suspension_faculty || 'Facultad expresa y obligatoria para suspender de forma inmediata cualquier labor o actividad en caso de constatar un riesgo grave o inminente para la vida o la salud, o ante la ausencia o deterioro de Elementos de Protección Personal (EPP), notificando de inmediato a la jefatura de SST.';

    contenidoHtml = `
      <div class="space-y-4 text-xs leading-relaxed text-slate-800">
        
        <!-- ENCABEZADO CONTRACTUAL Y DE CONTROL DOCUMENTAL -->
        <div class="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200 space-y-2">
          <div class="flex items-center justify-between pb-2 border-b border-indigo-200">
            <div>
              <span class="text-[9px] font-black uppercase tracking-wider text-indigo-700 block">Encabezado Contractual & Control Documental</span>
              <strong class="text-sm font-black text-indigo-950">${empresa.razonSocial} (NIT: ${empresa.nit})</strong>
            </div>
            <span class="px-2.5 py-1 rounded-lg text-[10px] font-mono font-black bg-indigo-950 text-white">
              ${codigoDoc} • Versión 01
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div><strong>Trabajador Titular:</strong> ${trabajador.nombre}</div>
            <div><strong>Cédula de Ciudadanía:</strong> C.C. ${trabajador.identificacion || trabajador.cedula}</div>
            <div><strong>Fecha de Ingreso:</strong> ${trabajador.fechaIngreso || trabajador.fechaContrato || trabajador.fechaInicio || 'Al momento de vinculación'}</div>
            <div><strong>Tipo de Contrato:</strong> ${trabajador.tipoContrato || 'Término Indefinido'}</div>
            <div><strong>Sede / Dirección:</strong> ${empresa.direccion || 'Calle Principal Zona Industrial'}</div>
            <div><strong>Ciudad & Contacto:</strong> ${empresa.ciudad || 'Bogotá D.C.'} • ${empresa.telefono || '(601) 745-0000'}</div>
          </div>
        </div>

        <!-- I. IDENTIFICACIÓN DEL CARGO -->
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-4 h-4 rounded bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px] font-black">I</span>
            <span>I. Identificación y Ubicación del Cargo</span>
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div><strong>Cargo Oficial:</strong> ${trabajador.cargo}</div>
            <div><strong>Nivel Jerárquico:</strong> ${cargoFormal?.hierarchy_level || 'Operativo'}</div>
            <div><strong>Departamento / Proceso:</strong> ${depto}</div>
            <div><strong>Jefe Inmediato:</strong> ${jefe}</div>
          </div>
        </div>

        <!-- II. PERFIL DEL CARGO (REQUISITOS MÍNIMOS Y COMPETENCIAS) -->
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-4 h-4 rounded bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px] font-black">II</span>
            <span>II. Perfil del Cargo, Requisitos Mínimos y Competencias</span>
          </h4>
          <div class="space-y-1 text-[11px] pt-1">
            <p><strong>• Educación Formal:</strong> ${edu} (Licencia SST según aplique)</p>
            <p><strong>• Formación Adicional / Certificaciones SG-SST:</strong> ${formSst}</p>
            <p><strong>• Experiencia Mínima:</strong> ${exp}</p>
            <div class="pt-1">
              <strong>• Competencias y Personalidad:</strong>
              <div class="flex flex-wrap gap-1 mt-1">
                ${skills.map(sk => `<span class="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800 font-bold">✓ ${sk}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- III. OBJETIVO DEL CARGO -->
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-4 h-4 rounded bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px] font-black">III</span>
            <span>III. Objetivo y Propósito Misional del Cargo</span>
          </h4>
          <p class="text-[11px] text-slate-700 leading-relaxed pt-1">${objetivo}</p>
          <p class="text-[10px] italic text-slate-500 bg-white p-2 rounded border border-slate-200 mt-1">
            <strong>Compromiso SG-SST:</strong> Preservar la vida, la salud integral y el bienestar, cumplir normas de seguridad y proteger activamente el medio ambiente.
          </p>
        </div>

        <!-- IV. FUNCIONES TÉCNICAS Y OPERATIVAS -->
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-4 h-4 rounded bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px] font-black">IV</span>
            <span>IV. Funciones Técnicas y Operativas del Cargo (Ciclo PHVA)</span>
          </h4>
          <ol class="list-decimal pl-5 space-y-1 text-[11px] text-slate-700 pt-1">
            ${funciones.map(f => `<li>${f}</li>`).join('')}
          </ol>
        </div>

        <!-- V. RESPONSABILIDADES EN LA GERENCIA DEL SG-SST -->
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-4 h-4 rounded bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px] font-black">V</span>
            <span>V. Responsabilidades Legales en la Gerencia del SG-SST (Dec. 1072 & Res. 0312)</span>
          </h4>
          <ul class="list-disc pl-5 space-y-1 text-[11px] text-slate-700 pt-1">
            ${responsabilidades.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <!-- VI. AUTORIDAD Y ALCANCE -->
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-4 h-4 rounded bg-rose-100 text-rose-800 flex items-center justify-center text-[10px] font-black">VI</span>
            <span>VI. Autoridad, Alcance y Facultad de Suspensión por Riesgo Inminente</span>
          </h4>
          <div class="space-y-1.5 text-[11px] pt-1">
            <p><strong>• Alcance y Autoridad:</strong> ${autoridad}</p>
            <div class="p-2 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg">
              <strong>🛑 Facultad Expresa de Suspensión Inmediata (Cero Tolerancia):</strong><br>
              ${suspension}
            </div>
          </div>
        </div>

        <!-- VII. PIE DE PÁGINA CONTRACTUAL Y SOCIALIZACIÓN -->
        <div class="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 space-y-2">
          <h4 class="font-black text-amber-950 border-b border-amber-200 pb-1 text-xs uppercase tracking-wider">
            VII. Cláusula de Notificación, Socialización y Aceptación por el Trabajador
          </h4>
          <p class="text-[11px] text-amber-950 leading-relaxed italic bg-white p-2.5 rounded-xl border border-amber-200">
            "Certifico que he recibido, leído, comprendido y aceptado en su totalidad el presente MANUAL DE CARGOS, RESPONSABILIDADES Y FUNCIONES correspondiente a mi cargo en ${empresa.razonSocial}. Me comprometo a cumplir estrictamente las funciones asignadas, los procedimientos de trabajo seguro (PTS) y las directrices del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST)."
          </p>

          <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-1 border-t border-amber-200">
            <div>
              <strong>ELABORÓ / REVISÓ (SST):</strong><br>
              ${empresa.responsableSST || 'Esp. en Seguridad y Salud en el Trabajo'}<br>
              Licencia SST No. ${empresa.licenciaSST || '15482-2022'}
            </div>
            <div>
              <strong>APROBÓ (GERENCIA GENERAL):</strong><br>
              ${empresa.representanteLegal || 'Representante Legal / Gerencia'}<br>
              Empleador Oficial
            </div>
          </div>
        </div>

      </div>
    `;
  } else if (docType === 'PERFIL_DE_CARGO') {
    codigoDoc = 'PF-CARG-002';
    contenidoHtml = `
      <div class="space-y-3 text-xs leading-relaxed text-slate-800">
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="p-2.5 bg-slate-50 border rounded-xl"><strong>Educación Requerida:</strong><br>${cargoFormal?.required_education || configCargo?.perfil?.educacion || 'Bachiller o Técnico'}</div>
          <div class="p-2.5 bg-slate-50 border rounded-xl"><strong>Experiencia Mínima:</strong><br>${cargoFormal?.required_experience || configCargo?.perfil?.experiencia || '1 año'}</div>
        </div>

        <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider">Exámenes Médicos Ocupacionales (Res. 2346/2007)</h4>
        <div class="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-[11px] text-teal-950">
          <p><strong>Ingreso y Periódico:</strong> Énfasis osteomuscular, agudeza visual, audiometría tonal y valoración general.</p>
          <p class="mt-1"><strong>Egreso:</strong> Examen médico de retiro laboral para verificar condiciones de salud al terminar vínculo.</p>
        </div>
      </div>
    `;
  } else if (docType === 'PLAN_DE_TRABAJO_SEGURO') {
    codigoDoc = 'PTS-SEG-003';
    contenidoHtml = `
      <div class="space-y-3 text-xs leading-relaxed text-slate-800">
        <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider">Peligros Prioritarios (GTC 45) & Medidas de Control</h4>
        <ul class="list-disc pl-5 space-y-1 text-[11px] text-slate-700">
          ${(configCargo?.pts?.peligrosEvaluados || [
            'Peligro Mecánico (atrapamiento, golpes por herramientas)',
            'Peligro Biomecánico (posturas prolongadas, manipulación de cargas)',
            'Peligro Físico y Locativo (superficies irregulares, ruido continuo)'
          ]).map(p => `<li>${p}</li>`).join('')}
        </ul>

        <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider pt-2">Fases Obligatorias de Operación</h4>
        <div class="space-y-1.5 text-[11px] text-slate-700">
          <p><strong>Antes:</strong> ${configCargo?.pts?.faseAntes || 'Inspección preoperacional diaria de área y herramientas. Verificar EPP.'}</p>
          <p><strong>Durante:</strong> ${configCargo?.pts?.faseDurante || 'Atención exclusiva en la labor. Respetar guardas y paradas de emergencia.'}</p>
          <p><strong>Después:</strong> ${configCargo?.pts?.faseDespues || 'Desenergizar equipos, ordenar puesto y reportar novedades al supervisor.'}</p>
        </div>
      </div>
    `;
  } else {
    codigoDoc = 'ANX-CONT-004';
    const anexoCfg = configCargo?.anexoContractual || {};
    const c1 = anexoCfg.clausula1_objeto || anexoCfg.notificacionRiesgos || `EL EMPLEADOR contrata los servicios personales de EL TRABAJADOR para desempeñar el cargo de ${trabajador.cargo}, ejecutando de manera directa, subordinada y diligente las funciones inherentes al puesto conforme al Manual de Funciones, Perfil de Cargo y directrices técnicas de la empresa en el marco de su objeto social.`;
    const c2 = anexoCfg.clausula2_duracion || 'El presente contrato se celebra por la duración de la obra o labor encomendada / por el término pactado entre las partes. La relación laboral terminará válidamente por culminación de la labor contratada, por mutuo acuerdo entre las partes o unilateralmente con justa causa conforme al Artículo 62 del Código Sustantivo del Trabajo (CST), sin lugar a indemnización.';
    const c3 = anexoCfg.clausula3_salario || 'EL EMPLEADOR pagará a EL TRABAJADOR por la prestación de sus servicios la remuneración mensual pactada en dinero legal colombiano, sobre la cual se liquidarán las prestaciones sociales de ley y los aportes al Sistema de Seguridad Social Integral.';
    const c4 = anexoCfg.clausula4_obligaciones_sst || anexoCfg.clausulaPrincipal || 'Dada la naturaleza de alto riesgo y directrices del SG-SST, EL TRABAJADOR se obliga perentoriamente a procurar el cuidado integral de su salud, cumplir estrictamente los Procedimientos de Trabajo Seguro (PTS), portar los EPP y no realizar tareas críticas sin permiso de trabajo.';
    const c5 = anexoCfg.clausula5_faltas_graves || anexoCfg.regimenSancionatorio || 'Se califica expresamente como FALTA GRAVE (Art. 58 y Art. 62 Literal a) Num. 6 del CST, y Art. 91 Dec. 1295/94): el no uso reiterado de los EPP, el desacato de los PTS, presentarse bajo efectos de alcohol o drogas y cualquier omisión que comprometa la seguridad, facultando la terminación unilateral con justa causa.';
    const c6 = anexoCfg.clausula6_culpa_exclusiva || 'Si ocurre un accidente de trabajo derivado de la imprudencia temeraria, desatención voluntaria o violación de procedimientos de seguridad por parte del trabajador, dicho evento se considerará por CULPA EXCLUSIVA DEL TRABAJADOR, exonerando al empleador de responsabilidad civil ordinaria de perjuicios (Art. 216 CST).';
    const c7 = anexoCfg.clausula7_seguridad_social || 'EL EMPLEADOR afiliará y mantendrá al día las cotizaciones de EL TRABAJADOR al Sistema de Seguridad Social Integral: Salud (EPS), Pensión (AFP) y Riesgos Laborales (ARL) conforme a la Ley 100 de 1993 y Decreto 1072 de 2015.';
    const c8 = anexoCfg.clausula8_elementos_herramientas || 'EL EMPLEADOR suministrará las herramientas, equipos y elementos requeridos para la labor bajo inventario y custodia. En caso de portabilidad o traslado, el trabajador responderá por su debido cuidado y restitución inmediata.';
    const c9 = anexoCfg.clausula9_domicilio_firmas || 'Las partes fijan como domicilio contractual la ciudad de ejecución de labores y manifiestan que este documento contiene la totalidad de los acuerdos vinculantes suscritos en dos ejemplares.';

    contenidoHtml = `
      <div class="space-y-2.5 text-xs leading-relaxed text-slate-800">
        <div class="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-950">
          <strong>Minuta Contractual Oficial:</strong> Contrato Individual de Trabajo y Anexo SST (9 Cláusulas Estructuradas conforme al CST y Dec. 1072).
        </div>
        <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          <div class="p-2 bg-slate-50 border rounded-lg"><strong>I. Objeto, Cargo y Alcance:</strong> <p class="text-[11px] text-slate-700 mt-0.5">${c1}</p></div>
          <div class="p-2 bg-slate-50 border rounded-lg"><strong>II. Duración y Terminación:</strong> <p class="text-[11px] text-slate-700 mt-0.5">${c2}</p></div>
          <div class="p-2 bg-slate-50 border rounded-lg"><strong>III. Salario y Forma de Pago:</strong> <p class="text-[11px] text-slate-700 mt-0.5">${c3}</p></div>
          <div class="p-2 bg-slate-50 border rounded-lg"><strong>IV. Obligaciones y Protocolos SST:</strong> <p class="text-[11px] text-slate-700 mt-0.5">${c4}</p></div>
          <div class="p-2 bg-rose-50 border border-rose-200 rounded-lg"><strong>V. Faltas Graves y Justa Causa:</strong> <p class="text-[11px] text-rose-900 mt-0.5">${c5}</p></div>
          <div class="p-2 bg-indigo-50 border border-indigo-200 rounded-lg"><strong>VI. Culpa Exclusiva y Exoneración:</strong> <p class="text-[11px] text-indigo-900 mt-0.5">${c6}</p></div>
          <div class="p-2 bg-slate-50 border rounded-lg"><strong>VII. Seguridad Social Integral:</strong> <p class="text-[11px] text-slate-700 mt-0.5">${c7}</p></div>
          <div class="p-2 bg-slate-50 border rounded-lg"><strong>VIII. Elementos y Portabilidad de Herramientas:</strong> <p class="text-[11px] text-slate-700 mt-0.5">${c8}</p></div>
          <div class="p-2 bg-slate-50 border rounded-lg"><strong>IX. Domicilio, Acuerdo Total y Firmas:</strong> <p class="text-[11px] text-slate-700 mt-0.5">${c9}</p></div>
        </div>
      </div>
    `;
  }

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
      
      <!-- Cabecera del Visor Modal -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl flex-shrink-0">📜</span>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-black uppercase tracking-wider text-teal-300 font-mono">${codigoDoc}</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-black ${isFirmado ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}">
                ${isFirmado ? '✓ Firmado y Vigente' : '⚠️ Pendiente por Firmar'}
              </span>
            </div>
            <h3 class="font-black text-sm text-white">${cargoTitle}</h3>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer">✕</button>
      </div>

      <!-- Contenido del Documento -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4">
        ${contenidoHtml}

        <!-- Zona de Firma Táctil o Sello Digital Registrado -->
        ${isFirmado ? `
          <div class="pt-4 border-t border-slate-200">
            <div class="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5">
                  <span>✓</span> Documento Firmado Digitalmente (Ley 527 de 1999)
                </span>
                <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-200 text-emerald-900">
                  Retención Legal: 20 Años
                </span>
              </div>
              
              <div class="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <div class="p-2 bg-white rounded-xl border border-emerald-200 flex-shrink-0 text-center">
                  <img src="${sigFound.signature_image_file || sigFound.signature_svg_or_base64 || sigFound.firmaDataUrl}" alt="Firma" style="max-height: 55px; max-width: 170px; object-fit: contain;">
                  <span class="text-[9px] text-slate-500 block font-mono mt-0.5">${trabajador.nombre}</span>
                </div>
                <div class="text-[10px] font-mono text-slate-700 space-y-1 overflow-hidden">
                  <p class="truncate"><strong class="text-slate-900">Hash SHA-256:</strong> ${sigFound.signature_sha256 || sigFound.sha256_hash || sigFound.hashDocumento || 'SHA-256'}</p>
                  <p><strong class="text-slate-900">Fecha Bogotá (UTC-5):</strong> ${sigFound.bogota_timestamp || (sigFound.signed_at ? new Date(sigFound.signed_at).toLocaleString('es-CO') : 'Registrado')}</p>
                  <p><strong class="text-slate-900">Dirección IP:</strong> ${sigFound.signer_ip || sigFound.client_ip || sigFound.ipCliente || '127.0.0.1'}</p>
                  <p class="truncate text-indigo-700"><strong class="text-slate-900">Ruta MinIO S3:</strong> ${sigFound.pdf_s3_key || `doctorpyme-storage/tenants/${empresa.id}/manuals/${trabajador.id}_MANUAL_DE_CARGO_signed.pdf`}</p>
                </div>
              </div>
            </div>
          </div>
        ` : `
          <div class="pt-4 border-t border-slate-200 space-y-3">
            <!-- Confirmación de Identidad -->
            <label class="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 cursor-pointer">
              <input type="checkbox" id="chk-confirm-identity-doc" class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500">
              <span>
                <strong>Declaración Juramentada de Identidad:</strong> Certifico que soy <strong>${trabajador.nombre}</strong>, titular de la Cédula de Ciudadanía No. <strong>${trabajador.identificacion || trabajador.cedula}</strong>, y que acepto y recibo formalmente este Manual de Cargos y Responsabilidades.
              </span>
            </label>

            <!-- Selector de Firma: Base Registrada vs Nuevo Trazo -->
            ${(trabajador.has_registered_signature && (trabajador.signature_url || trabajador.signature_svg)) ? `
              <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
                <span class="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                  <span>✍️</span> Método de Firma Digital:
                </span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-indigo-300 cursor-pointer hover:bg-indigo-50">
                    <input type="radio" name="radio-doc-sig-method" value="registered" checked onchange="window.alternarMetodoFirmaModal(this.value)">
                    <div>
                      <strong class="text-indigo-900 block">Usar Firma Registrada</strong>
                      <span class="text-[10px] text-slate-500">Almacenada en MinIO S3</span>
                    </div>
                  </label>
                  <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input type="radio" name="radio-doc-sig-method" value="canvas" onchange="window.alternarMetodoFirmaModal(this.value)">
                    <div>
                      <strong class="text-slate-800 block">Trazar Nueva Firma</strong>
                      <span class="text-[10px] text-slate-500">Dibujar en pantalla</span>
                    </div>
                  </label>
                </div>
                
                <div id="contenedor-firma-base-preview" class="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center gap-3">
                  <img src="${obtenerUrlFirmaTrabajador(trabajador)}" alt="Firma Registrada" style="max-height: 44px; max-width: 140px; object-fit: contain;">
                  <div class="text-[10px] text-slate-600">
                    <strong class="text-emerald-700">✓ Firma Digital Lista para Estampar</strong>
                    <span class="block text-slate-400 font-mono">Registrada: ${trabajador.signature_registered_bogota || 'Vigente'}</span>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Zona de Firma Táctil en Canvas -->
            <div id="contenedor-firma-canvas-block" class="space-y-1.5 ${(trabajador.has_registered_signature && (trabajador.signature_url || trabajador.signature_svg)) ? 'hidden' : ''}">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-900 uppercase">✍️ Firma con tu Dedo o Puntero en Pantalla:</span>
                <button type="button" id="btn-clear-doc-sig" class="text-[10px] text-rose-600 underline font-bold cursor-pointer">Limpiar Firma</button>
              </div>
              <div class="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
                <canvas id="canvas-doc-sig" class="signature-pad-canvas w-full h-36"></canvas>
              </div>
              <div class="p-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Validez: Ley 527 de 1999 (Comercio Electrónico y Firmas)</span>
                <span>Retención Legal: 20 Años (Dec. 1072/2015)</span>
              </div>
            </div>
          </div>
        `}
      </div>

      <!-- Acciones Inferiores -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <button 
          type="button" 
          onclick="window.imprimirManualDeCargo('${cargoFormal ? cargoFormal.id : ""}', '${trabajador.id}')"
          class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>📥 Descargar Copia Oficial (PDF)</span>
        </button>

        <div class="flex items-center gap-2">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
            Cerrar
          </button>
          ${!isFirmado ? `
            <button type="button" id="btn-confirm-doc-sig" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5">
              <span>✍️</span>
              <span>Aceptar y Firmar Manual de Funciones</span>
            </button>
          ` : ''}
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);

  if (!isFirmado) {
    const pad = setupSignaturePad('canvas-doc-sig');
    document.getElementById('btn-clear-doc-sig')?.addEventListener('click', () => pad?.clear());

    document.getElementById('btn-confirm-doc-sig')?.addEventListener('click', async () => {
      const chk = document.getElementById('chk-confirm-identity-doc');
      if (chk && !chk.checked) {
        alert("Por favor marca la casilla de Declaración Juramentada de Identidad antes de firmar.");
        return;
      }

      let sigData = '';
      const radioMethod = document.querySelector('input[name="radio-doc-sig-method"]:checked')?.value;
      if (radioMethod === 'registered' && (trabajador.signature_url || trabajador.signature_svg)) {
        sigData = trabajador.signature_svg || trabajador.signature_url;
      } else {
        if (!pad || pad.isEmpty()) {
          alert("Por favor firma en el recuadro antes de confirmar.");
          return;
        }
        sigData = pad.getDataUrl();
      }

      const btn = document.getElementById('btn-confirm-doc-sig');
      btn.disabled = true;
      btn.innerText = "Guardando firma y sellando en MinIO S3...";

      try {
        await store.submitWorkerDocumentSignature({
          worker_id: trabajador.id,
          employee_id: trabajador.id,
          tenant_id: empresa.id,
          document_type: docType,
          manual_document_id: cargoFormal?.id ? `jpd-man-${cargoFormal.id}` : codigoDoc,
          document_id: codigoDoc,
          document_title: cargoTitle,
          signature_base64: sigData
        });

        modalEl.remove();
        alert(`✓ El documento "${cargoTitle}" ha sido firmado digitalmente con validez legal (Ley 527/1999) e inyectado en el Estándar 1.1.2 de la Resolución 0312.`);
        renderWorkerPortal();
        
        // Abrir la copia firmada en PDF para descarga inmediata
        if (window.imprimirManualDeCargo) {
          window.imprimirManualDeCargo(cargoFormal?.id, trabajador.id);
        }
      } catch (err) {
        alert("Error al firmar documento: " + err.message);
        btn.disabled = false;
        btn.innerText = "✍️ Aceptar y Firmar Manual de Funciones";
      }
    });
  }
};

// =============================================================================
// MODAL ESCÁNER QR DE CÁMARA PARA HERRAMIENTAS Y MAQUINARIA
// =============================================================================
window.abrirModalEscanerQR = function(trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) return;
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva();
  const tools = store.getToolsInventory(empresa.id);

  const modalId = 'modal-escaner-qr';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 animate-fadeIn text-white';

  modalEl.innerHTML = `
    <!-- Cabecera del Escáner -->
    <div class="flex items-center justify-between pb-3 border-b border-slate-800">
      <div class="flex items-center gap-2">
        <span class="text-xl">📷</span>
        <div>
          <h3 class="text-sm font-black text-white">Escáner QR de Maquinaria</h3>
          <p class="text-[10px] text-teal-400">Apunta la cámara a la placa del equipo</p>
        </div>
      </div>
      <button id="btn-cerrar-qr" class="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer">✕</button>
    </div>

    <!-- Visor de Cámara con Retícula -->
    <div class="flex-1 flex flex-col items-center justify-center my-4 relative">
      <div class="relative w-full max-w-sm aspect-square bg-slate-900 rounded-3xl overflow-hidden border-2 border-teal-500/50 shadow-2xl flex items-center justify-center">
        <video id="video-qr-feed" autoplay playsinline class="w-full h-full object-cover"></video>
        
        <!-- Retícula de Escaneo animada -->
        <div class="absolute inset-8 border-2 border-teal-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
          <div class="flex justify-between">
            <span class="w-4 h-4 border-t-2 border-l-2 border-teal-400"></span>
            <span class="w-4 h-4 border-t-2 border-r-2 border-teal-400"></span>
          </div>
          <div class="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse"></div>
          <div class="flex justify-between">
            <span class="w-4 h-4 border-b-2 border-l-2 border-teal-400"></span>
            <span class="w-4 h-4 border-b-2 border-r-2 border-teal-400"></span>
          </div>
        </div>
      </div>
      <p class="text-[11px] text-slate-400 mt-3 text-center">
        Centra el código QR en la retícula o selecciona manualmente el equipo abajo.
      </p>
    </div>

    <!-- Selector Alternativo de Herramienta de Planta -->
    <div class="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
      <label class="text-[10px] font-black uppercase text-slate-400 block">
        O selecciona el equipo de la lista de planta:
      </label>
      <div class="flex gap-2">
        <select id="select-tool-manual-qr" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white">
          <option value="">-- Seleccionar Equipo --</option>
          ${tools.map(t => `
            <option value="${t.id}">[${t.internal_code}] ${t.exact_name} (${t.brand})</option>
          `).join('')}
        </select>
        <button 
          type="button" 
          id="btn-confirm-tool-manual"
          class="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black cursor-pointer"
        >
          Abrir
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Iniciar cámara con facingMode: environment
  const videoEl = document.getElementById('video-qr-feed');
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        cameraQrStream = stream;
        if (videoEl) videoEl.srcObject = stream;
      })
      .catch(err => {
        console.warn("Cámara no disponible o permiso denegado:", err);
      });
  }

  function cerrarModal() {
    if (cameraQrStream) {
      cameraQrStream.getTracks().forEach(t => t.stop());
      cameraQrStream = null;
    }
    modalEl.remove();
  }

  document.getElementById('btn-cerrar-qr')?.addEventListener('click', cerrarModal);

  document.getElementById('btn-confirm-tool-manual')?.addEventListener('click', () => {
    const selected = document.getElementById('select-tool-manual-qr')?.value;
    if (!selected) {
      alert("Por favor selecciona un equipo de la lista.");
      return;
    }
    cerrarModal();
    window.abrirModalPreoperacionalTrabajador(trabajador.id, selected);
  });
};

// =============================================================================
// MODAL DE INSPECCIÓN PREOPERACIONAL CON CHECKLIST Y FOTO
// =============================================================================
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
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto flex flex-col max-h-[92vh]">
      
      <!-- Cabecera de la Inspección -->
      <div class="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">📋</span>
          <div>
            <span class="text-[9px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded block mb-0.5">Control Operacional SG-SST</span>
            <h3 class="font-black text-sm text-white">Inspección Preoperacional de Equipo</h3>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-white text-lg font-bold p-1 cursor-pointer">✕</button>
      </div>

      <form id="form-preop-modal" class="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
        
        <!-- Selección de Herramienta -->
        <div>
          <label class="block font-black text-slate-800 mb-1">Equipo o Máquina a Inspeccionar *</label>
          <select id="preop-select-tool" required class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500">
            ${tools.map(t => `
              <option value="${t.id}" data-name="${escapeHtml(t.exact_name)}" ${t.id === toolIdPreseleccionado ? 'selected' : ''}>
                [${t.internal_code}] ${t.exact_name} (${t.brand})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- 6 Puntos de Chequeo Obligatorios -->
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
          <span class="font-black text-slate-900 block uppercase text-[10px] tracking-wider">
            Verificación Visual y Operativa antes del Turno:
          </span>

          ${[
            '1. Sistema de frenos, mandos y parada de emergencia operativos',
            '2. Guardas perimetrales y protecciones mecánicas instaladas',
            '3. Conexiones eléctricas, cables o mangueras libres de fisuras',
            '4. Nivel de fluidos (aceite/refrigerante) y ausencia de fugas',
            '5. Estado estructural, pernos, pasadores y llantas/orugas',
            '6. Limpieza del puesto, botiquín y extintor vigente cercano'
          ].map((item, idx) => `
            <div class="flex items-center justify-between gap-2 py-1.5 border-b border-slate-200/80 last:border-none">
              <span class="text-slate-800 font-medium text-[11px]">${item}</span>
              <div class="flex items-center gap-1">
                <label class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[9px] cursor-pointer">
                  <input type="radio" name="chk-item-${idx}" value="SI" checked class="hidden"> SI
                </label>
                <label class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[9px] cursor-pointer">
                  <input type="radio" name="chk-item-${idx}" value="NO" class="hidden"> NO
                </label>
                <label class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-black text-[9px] cursor-pointer">
                  <input type="radio" name="chk-item-${idx}" value="NA" class="hidden"> N/A
                </label>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Dictamen y Horómetro -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-black text-slate-800 mb-1">¿Apto para operar? *</label>
            <select id="preop-dictamen" class="w-full px-3 py-2 border-2 border-slate-300 rounded-xl font-black text-slate-900">
              <option value="SI">✓ SÍ, APTO PARA OPERAR</option>
              <option value="NO">🛑 NO APTO (Bloquear Equipo)</option>
            </select>
          </div>
          <div>
            <label class="block font-black text-slate-800 mb-1">Horómetro Actual</label>
            <input type="text" id="preop-horometro-input" placeholder="Ej. 1.840 h" class="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono">
          </div>
        </div>

        <!-- Foto de Evidencia -->
        <div class="space-y-1.5">
          <label class="block font-black text-slate-800">Foto de Evidencia de Inspección (Cámara)</label>
          <div class="flex items-center gap-2">
            <label class="flex-1 py-2.5 px-3 bg-slate-50 border border-slate-300 hover:border-amber-500 rounded-xl text-center cursor-pointer font-bold text-slate-700">
              <span>📷 Adjuntar Foto con Cámara</span>
              <input type="file" id="preop-foto-input" accept="image/*" capture="environment" class="hidden">
            </label>
            <div id="preop-preview-container" class="w-14 h-14 rounded-xl border border-slate-300 overflow-hidden hidden flex-shrink-0">
              <img id="preop-preview-img" src="" alt="Foto" class="w-full h-full object-cover">
            </div>
          </div>
        </div>

        <div>
          <label class="block font-black text-slate-800 mb-1">Observaciones:</label>
          <textarea id="preop-observaciones" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">Equipo verificado en óptimas condiciones de seguridad antes de iniciar turno.</textarea>
        </div>

        <!-- Firma Digital Táctil del Operario -->
        <div class="space-y-1.5 pt-2 border-t border-slate-200">
          <div class="flex items-center justify-between">
            <span class="font-black text-slate-900 text-xs">✍️ Firma del Operario Inspector:</span>
            <button type="button" id="btn-clear-preop-sig" class="text-[10px] text-rose-600 underline font-bold cursor-pointer">Limpiar</button>
          </div>
          <div class="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
            <canvas id="canvas-preop-sig" class="signature-pad-canvas w-full h-28"></canvas>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">
            Cancelar
          </button>
          <button type="submit" id="btn-submit-preop" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black shadow-md cursor-pointer">
            ✓ Guardar Inspección Preoperacional
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  const pad = setupSignaturePad('canvas-preop-sig');
  document.getElementById('btn-clear-preop-sig')?.addEventListener('click', () => pad?.clear());

  // Foto preview
  const fotoIn = document.getElementById('preop-foto-input');
  if (fotoIn) {
    fotoIn.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const comprimida = await comprimirFoto(file, 800, 800, 0.7);
        const pCont = document.getElementById('preop-preview-container');
        const pImg = document.getElementById('preop-preview-img');
        if (pImg && pCont) {
          pImg.src = comprimida;
          pCont.classList.remove('hidden');
          pCont.setAttribute('data-base64', comprimida);
        }
      } catch (err) {
        console.warn("Error comprimiendo foto preop:", err);
      }
    });
  }

  // Submit preoperacional
  document.getElementById('form-preop-modal').onsubmit = async (e) => {
    e.preventDefault();
    const sel = document.getElementById('preop-select-tool');
    const toolId = sel.value;
    const toolName = sel.options[sel.selectedIndex]?.getAttribute('data-name') || 'Equipo';
    const dictamen = document.getElementById('preop-dictamen').value;
    const obs = document.getElementById('preop-observaciones').value;
    const fotoB64 = document.getElementById('preop-preview-container')?.getAttribute('data-base64') || '';
    const btn = document.getElementById('btn-submit-preop');

    if (btn) btn.disabled = true;

    try {
      await store.submitWorkerPreoperational({
        worker_id: trabajador.id,
        tenant_id: empresa.id,
        tool_id: toolId,
        tool_name: toolName,
        apto: dictamen,
        notes: obs,
        photo_base64: fotoB64
      });

      if (dictamen === 'NO') {
        await store.submitWorkerHazardReport({
          worker_id: trabajador.id,
          tenant_id: empresa.id,
          report_type: 'Condicion_Insegura',
          location: trabajador.area || 'Planta',
          description: `[PREOPERACIONAL RECHAZADO - ${toolName}]: ${obs}`,
          severity_level: 'Alta',
          photo_base64: fotoB64
        });
      }

      modalEl.remove();
      alert(`✓ Inspección Preoperacional de "${toolName}" guardada exitosamente con valor probatorio.`);
      renderWorkerPortal();
    } catch (err) {
      alert("Error guardando inspección: " + err.message);
      if (btn) btn.disabled = false;
    }
  };
};

// =============================================================================
// MÓDULO DE MATRIZ Y REGISTRO DE ENTREGA DE DOTACIÓN Y EPP (BLOQUES 2 & 3)
// Normativa: Ley 9/1979, Res. 2400/1979, Dec. 1072/2015, Res. 0312/2019 Estándar 4.2.6, CST Art. 230
// =============================================================================

window.abrirModalAsignarEntregaEPP = async function(preTrabajadorId = null, preCargoId = null) {
  const empresaActiva = store.getEmpresaActiva() || {
    id: 'emp-1790438946268',
    razonSocial: 'LADRILLOS OCHOA LTDA',
    nit: '830124631'
  };

  let trabajadores = store.getTrabajadores(empresaActiva.id).filter(t => (t.estado || 'Activo') === 'Activo');
  if (trabajadores.length === 0) {
    alert("No hay trabajadores activos registrados en la empresa para asignar entregas.");
    return;
  }

  // Asegurar que el catálogo de EPP esté cargado
  let catalog = store.getEppCatalog(empresaActiva.id);
  if (!catalog || catalog.length === 0) {
    catalog = await store.fetchEppCatalog(empresaActiva.id);
  }

  const modalId = 'modal-asignar-entrega-epp';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  // Seleccionar trabajador inicial
  let selTrabajadorId = preTrabajadorId || (preCargoId ? (trabajadores.find(t => t.job_position_id === preCargoId || t.cargoId === preCargoId)?.id || trabajadores[0].id) : trabajadores[0].id);

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  function renderModalBody(trabajadorId) {
    const trabajador = trabajadores.find(t => t.id === trabajadorId) || trabajadores[0];
    const cargos = store.getJobPositions ? store.getJobPositions(empresaActiva.id) : [];
    const cargoObj = cargos.find(c => c.id === trabajador.job_position_id || (c.title || '').toLowerCase().trim() === (trabajador.cargo || '').toLowerCase().trim());
    const cargoId = cargoObj ? cargoObj.id : (preCargoId || trabajador.job_position_id);

    // Obtener la matriz configurada para el cargo
    let matrixItems = store.getJobPositionEppMatrix(cargoId, empresaActiva.id);
    if (matrixItems.length === 0) {
      // Fallback a perfil del cargo o catálogo básico
      const configCargo = store.getPerfilCargo(trabajador.cargo, empresaActiva.id);
      const eppNames = configCargo?.matrizEpp?.eppRequeridos || configCargo?.pts?.eppRequeridos || [];
      if (eppNames.length > 0) {
        matrixItems = eppNames.map((name, i) => {
          const matched = catalog.find(c => c.item_name.toLowerCase().includes(name.toLowerCase()));
          return {
            catalog_item_id: matched ? matched.id : `cat-item-gen-${i}`,
            item_name: name,
            item_code: matched ? matched.item_code : `EPP-${i+1}`,
            category: matched ? matched.category : 'EPP',
            technical_standard: matched ? matched.technical_standard : 'ANSI / NTC',
            default_quantity: 1,
            delivery_frequency: 'Cuatrimestral_CST',
            associated_hazard: 'Riesgo operativo y ergonómico',
            requires_size: matched ? matched.requires_size : (name.toLowerCase().includes('bota') || name.toLowerCase().includes('camisa') || name.toLowerCase().includes('pantalon') || name.toLowerCase().includes('guante'))
          };
        });
      } else {
        // Usar los primeros del catálogo
        matrixItems = catalog.slice(0, 6).map(c => ({
          ...c,
          catalog_item_id: c.id,
          default_quantity: 1,
          delivery_frequency: 'Cuatrimestral_CST',
          associated_hazard: 'Riesgo operativo general'
        }));
      }
    }

    const savedCamisa = trabajador.talla_camisa || 'M';
    const savedPantalon = trabajador.talla_pantalon || '32';
    const savedCalzado = trabajador.talla_calzado || '40';
    const savedGuantes = trabajador.talla_guantes || '9';

    const fechaBogota = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    return `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        <!-- ENCABEZADO -->
        <div class="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/25 text-amber-200 border border-amber-300/30">
                Res. 0312 Estándar 4.2.6
              </span>
              <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white border border-white/20">
                Art. 230 CST • Dotación Cuatrimestral
              </span>
              <span class="text-[10px] text-amber-200">
                🕒 Servidor: ${fechaBogota} (America/Bogota)
              </span>
            </div>
            <h3 class="font-black text-base sm:text-lg">Asignar Entrega de EPP y Dotación Legal</h3>
            <p class="text-xs text-amber-100/90 mt-0.5">
              Empresa: <strong>${escapeHtml(empresaActiva.razonSocial)}</strong> • Generación de Acta Oficial Consecutiva
            </p>
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" class="text-white text-xl font-bold p-1 cursor-pointer hover:opacity-80">✕</button>
        </div>

        <!-- CUERPO CON SCROLL -->
        <div class="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-800">
          
          <!-- SECCIÓN 1: SELECCIÓN DEL TRABAJADOR Y DETECCIÓN DEL CARGO -->
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block font-bold text-slate-900 mb-1">Trabajador Beneficiario:</label>
                <select id="assign-trabajador-select" class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 cursor-pointer">
                  ${trabajadores.map(t => `
                    <option value="${t.id}" ${t.id === trabajador.id ? 'selected' : ''}>
                      👷 ${t.nombre} (C.C. ${t.identificacion || t.cedula || 'N/A'}) - ${t.cargo}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-900 mb-1">Cargo Oficial Detectado:</label>
                <div class="px-3 py-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span class="font-black text-slate-900 block text-xs">${trabajador.cargo}</span>
                    <span class="text-[10px] text-slate-500">Área: ${trabajador.area || 'Operaciones'}</span>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-200 text-amber-900">
                    Matriz Activa
                  </span>
                </div>
              </div>
            </div>

            <!-- PARÁMETROS DE LA ENTREGA -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200">
              <div>
                <label class="block font-bold text-slate-900 mb-1">Motivo de la Entrega (Marco Legal):</label>
                <select id="assign-motivo-select" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-500">
                  <option value="Periodica_Ley_Abril_Agosto_Diciembre" selected>Periódica Obligatoria de Ley (Art. 230 CST: Abril / Agosto / Diciembre)</option>
                  <option value="Dotacion_Ingreso">Dotación por Ingreso / Inicio de Labores</option>
                  <option value="Reposicion_Por_Desgaste_Deterioro">Reposición por Desgaste o Deterioro de EPP (Ley 9/1979)</option>
                  <option value="Cambio_De_Cargo">Dotación por Cambio de Cargo o Reubicación</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-900 mb-1">Tipo de Entrega:</label>
                <select id="assign-tipo-select" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-amber-500">
                  <option value="MIXTA_EPP_Y_DOTACION" selected>Mixta: EPP Homologados + Dotación Legal de Ropa y Calzado</option>
                  <option value="EPP_SOLO">Solo Elementos de Protección Personal (EPP)</option>
                  <option value="DOTACION_SOLA">Solo Dotación Legal de Vestuario y Calzado (Art. 230 CST)</option>
                </select>
              </div>
            </div>

            <!-- TALLAS DEL TRABAJADOR -->
            <div class="pt-2 border-t border-slate-200">
              <span class="block font-bold text-slate-900 mb-1.5">Tallas Registradas del Trabajador:</span>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <span class="text-[10px] text-slate-500 font-bold block mb-0.5">Camisa / Blusa:</span>
                  <input type="text" id="assign-size-camisa" value="${savedCamisa}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center">
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 font-bold block mb-0.5">Pantalón / Jean:</span>
                  <input type="text" id="assign-size-pantalon" value="${savedPantalon}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center">
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 font-bold block mb-0.5">Calzado / Botas:</span>
                  <input type="text" id="assign-size-calzado" value="${savedCalzado}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center">
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 font-bold block mb-0.5">Guantes:</span>
                  <input type="text" id="assign-size-guantes" value="${savedGuantes}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center">
                </div>
              </div>
              <div class="flex items-center gap-1.5 mt-2">
                <input type="checkbox" id="assign-save-sizes" checked class="w-3.5 h-3.5 text-amber-600 rounded">
                <label for="assign-save-sizes" class="text-[11px] text-slate-600">Actualizar y recordar estas tallas en la ficha del trabajador para futuras entregas</label>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 2: TABLA DE ELEMENTOS A ENTREGAR -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                  Elementos Parametrizados en la Matriz (${matrixItems.length})
                </h4>
                <span class="text-[10px] text-slate-500">Marca las casillas de los elementos físicos que estás entregando en este acto:</span>
              </div>
              <span class="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Marcar / Desmarcar
              </span>
            </div>

            <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase text-[9.5px] tracking-wider">
                    <tr>
                      <th class="py-2.5 px-3 text-center w-10">Entregar</th>
                      <th class="py-2.5 px-3">Elemento &amp; Categoría</th>
                      <th class="py-2.5 px-3">Norma Técnica</th>
                      <th class="py-2.5 px-3 text-center w-24">Talla</th>
                      <th class="py-2.5 px-3 text-center w-20">Cant.</th>
                      <th class="py-2.5 px-3 text-center w-24">¿Usado Recibido?</th>
                      <th class="py-2.5 px-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100" id="assign-items-tbody">
                    ${matrixItems.map((m, idx) => {
                      const itemName = m.item_name || 'EPP';
                      const itemLower = itemName.toLowerCase();
                      let defaultSize = 'Única';
                      if (itemLower.includes('camisa') || itemLower.includes('blusa') || itemLower.includes('chaleco')) defaultSize = savedCamisa;
                      else if (itemLower.includes('pantalon') || itemLower.includes('jean') || itemLower.includes('overol')) defaultSize = savedPantalon;
                      else if (itemLower.includes('bota') || itemLower.includes('calzado') || itemLower.includes('zapato')) defaultSize = savedCalzado;
                      else if (itemLower.includes('guante')) defaultSize = savedGuantes;

                      return `
                        <tr class="hover:bg-slate-50/70 transition">
                          <td class="py-2.5 px-3 text-center">
                            <input type="checkbox" class="assign-item-check w-4 h-4 text-amber-600 rounded cursor-pointer" data-idx="${idx}" checked>
                          </td>
                          <td class="py-2.5 px-3">
                            <div class="font-bold text-slate-900">${escapeHtml(itemName)}</div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                              <span class="font-mono text-[9.5px] text-slate-500">${escapeHtml(m.item_code || 'EPP-00')}</span>
                              <span class="px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                m.category === 'EPP' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                              }">
                                ${m.category === 'EPP' ? 'EPP' : 'Dotación'}
                              </span>
                            </div>
                          </td>
                          <td class="py-2.5 px-3">
                            <span class="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              ${escapeHtml(m.technical_standard || 'NTC')}
                            </span>
                          </td>
                          <td class="py-2.5 px-3 text-center">
                            <input type="text" class="assign-item-size w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-bold" value="${defaultSize}" data-idx="${idx}">
                          </td>
                          <td class="py-2.5 px-3 text-center">
                            <input type="number" min="1" max="10" class="assign-item-qty w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-bold" value="${m.default_quantity || 1}" data-idx="${idx}">
                          </td>
                          <td class="py-2.5 px-3 text-center">
                            <input type="checkbox" class="assign-item-returned w-4 h-4 text-slate-600 rounded cursor-pointer" title="Marcar si el trabajador devolvió el elemento anterior usado o deteriorado" data-idx="${idx}">
                          </td>
                          <td class="py-2.5 px-3">
                            <input type="text" class="assign-item-obs w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs" placeholder="Lote o condición..." value="Nuevo conforme a norma" data-idx="${idx}">
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- NOTA LEGAL -->
          <div class="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-950 flex items-start gap-2">
            <span class="text-base flex-shrink-0">⚖️</span>
            <div>
              <strong>Validez Probatoria y Auditoría SG-SST (Decreto 1072 de 2015):</strong> Al hacer clic en <em>"Registrar y Enviar al Trabajador"</em>, el servidor captura la estampa de tiempo oficial de Colombia, genera el consecutivo inmutable y coloca el acta en estado <strong>ASIGNADO_PENDIENTE_FIRMA</strong> en la app móvil del trabajador.
            </div>
          </div>

        </div>

        <!-- PIE DE ACCIONES -->
        <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 flex-shrink-0">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer">
            Cancelar
          </button>
          <button type="button" id="btn-confirm-assign-delivery" class="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-black shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95">
            <span>📦</span>
            <span>Registrar y Enviar al Trabajador</span>
          </button>
        </div>
      </div>
    `;
  }

  modalEl.innerHTML = renderModalBody(selTrabajadorId);
  document.body.appendChild(modalEl);

  function attachEvents(currentTrabajadorId) {
    const trabajadorSelect = document.getElementById('assign-trabajador-select');
    if (trabajadorSelect) {
      trabajadorSelect.addEventListener('change', (e) => {
        const newId = e.target.value;
        modalEl.innerHTML = renderModalBody(newId);
        attachEvents(newId);
      });
    }

    const confirmBtn = document.getElementById('btn-confirm-assign-delivery');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        const trabajador = trabajadores.find(t => t.id === currentTrabajadorId) || trabajadores[0];
        const cargos = store.getJobPositions ? store.getJobPositions(empresaActiva.id) : [];
        const cargoObj = cargos.find(c => c.id === trabajador.job_position_id || (c.title || '').toLowerCase().trim() === (trabajador.cargo || '').toLowerCase().trim());
        const cargoId = cargoObj ? cargoObj.id : (preCargoId || trabajador.job_position_id);
        const matrixItems = store.getJobPositionEppMatrix(cargoId, empresaActiva.id);

        const checkBoxes = document.querySelectorAll('.assign-item-check');
        const selectedItems = [];

        checkBoxes.forEach(chk => {
          if (chk.checked) {
            const idx = parseInt(chk.getAttribute('data-idx'), 10);
            const m = matrixItems[idx] || catalog[idx] || {};
            const sizeDelivered = document.querySelector(`.assign-item-size[data-idx="${idx}"]`)?.value || 'Única';
            const qtyDelivered = parseInt(document.querySelector(`.assign-item-qty[data-idx="${idx}"]`)?.value || 1, 10);
            const returned = document.querySelector(`.assign-item-returned[data-idx="${idx}"]`)?.checked || false;
            const obs = document.querySelector(`.assign-item-obs[data-idx="${idx}"]`)?.value || 'Entrega estándar';

            selectedItems.push({
              catalog_item_id: m.catalog_item_id || m.id,
              item_name: m.item_name || 'EPP',
              category: m.category || 'EPP',
              technical_standard: m.technical_standard || 'N/A',
              size_delivered: sizeDelivered,
              quantity_delivered: qtyDelivered,
              brand_or_batch: 'Lote Homologado 2026',
              previous_item_returned: returned,
              useful_life_days: m.useful_life_days || 120,
              observations: obs
            });
          }
        });

        if (selectedItems.length === 0) {
          alert("Debes seleccionar al menos un elemento para registrar la entrega.");
          return;
        }

        const deliveryReason = document.getElementById('assign-motivo-select')?.value || 'Periodica_Ley_Abril_Agosto_Diciembre';
        const deliveryType = document.getElementById('assign-tipo-select')?.value || 'MIXTA_EPP_Y_DOTACION';

        const workerSizes = {
          camisa: document.getElementById('assign-size-camisa')?.value || 'M',
          pantalon: document.getElementById('assign-size-pantalon')?.value || '32',
          calzado: document.getElementById('assign-size-calzado')?.value || '40',
          guantes: document.getElementById('assign-size-guantes')?.value || '9'
        };

        confirmBtn.disabled = true;
        confirmBtn.innerText = "Registrando Entrega...";

        try {
          const res = await store.assignEppDelivery({
            tenant_id: empresaActiva.id,
            employee_id: trabajador.id,
            job_position_id: cargoId,
            delivery_type: deliveryType,
            delivery_reason: deliveryReason,
            assigned_by_user_id: 'Coordinador SST',
            items: selectedItems,
            worker_sizes: workerSizes
          });

          modalEl.remove();

          if (window.mostrarNotificacion) {
            window.mostrarNotificacion(`✓ Entrega asignada formalmente (${res.delivery_consecutive}). Pendiente de firma por el trabajador.`, "success");
          } else {
            alert(`✓ Entrega asignada formalmente con consecutivo ${res.delivery_consecutive}. Notificada al perfil del trabajador.`);
          }

          if (typeof renderConsolaGestionTrabajadores === 'function') {
            const container = document.getElementById('app-main-content') || document.querySelector('.main-container');
            if (container) renderConsolaGestionTrabajadores(container);
          }
          if (typeof renderWorkerPortal === 'function') {
            renderWorkerPortal();
          }
        } catch (err) {
          console.error("Error al registrar entrega de EPP:", err);
          alert("Error al registrar entrega: " + err.message);
          confirmBtn.disabled = false;
          confirmBtn.innerText = "📦 Registrar y Enviar al Trabajador";
        }
      });
    }
  }

  attachEvents(selTrabajadorId);
};

window.abrirModalFirmarActaEntregaEPP = function(deliveryId, trabajadorId) {
  const delivery = store.getEppDeliveryById(deliveryId);
  if (!delivery) {
    alert("No se encontró el acta de entrega seleccionada.");
    return;
  }

  const trabajador = store.getTrabajadorPorId(trabajadorId || delivery.employee_id);
  if (!trabajador) {
    alert("No se encontró el trabajador asociado a esta entrega.");
    return;
  }

  const empresa = store.getEmpresa(delivery.tenant_id || trabajador.companyId) || store.getEmpresaActiva();
  const items = Array.isArray(delivery.items) ? delivery.items : [];
  const bogotaHora = delivery.bogota_assigned_at || new Date(delivery.assigned_at).toLocaleString('es-CO');

  const modalId = 'modal-firmar-acta-entrega-epp';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto flex flex-col max-h-[92vh]">
      
      <!-- ENCABEZADO -->
      <div class="bg-gradient-to-r from-teal-800 to-emerald-800 p-4 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-[9px] font-black uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded border border-white/20">
              ${delivery.delivery_consecutive}
            </span>
            <span class="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded">
              Estándar 4.2.6 Res. 0312
            </span>
          </div>
          <h3 class="font-black text-sm sm:text-base">Recepción y Firma Digital de Dotación &amp; EPP</h3>
          <span class="text-[10px] text-teal-200 block">Asignado: ${bogotaHora}</span>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-white text-lg font-bold p-1 cursor-pointer hover:opacity-80">✕</button>
      </div>

      <!-- CUERPO -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4 text-xs leading-relaxed text-slate-800">
        
        <!-- DATOS DEL TRABAJADOR Y EMPRESA -->
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div><strong>Empresa:</strong> ${escapeHtml(empresa.razonSocial)} (NIT: ${empresa.nit})</div>
          <div><strong>Trabajador:</strong> ${escapeHtml(trabajador.nombre)} (C.C. ${trabajador.identificacion || trabajador.cedula})</div>
          <div><strong>Cargo:</strong> ${escapeHtml(delivery.cargoNombre || trabajador.cargo)}</div>
        </div>

        <!-- LISTA DETALLADA DE ELEMENTOS ENTREGADOS -->
        <div>
          <span class="block font-bold text-slate-900 mb-1.5">Elementos de Protección &amp; Dotación Entregados (${items.length}):</span>
          <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            ${items.map(it => `
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span class="font-bold text-slate-900 block">${escapeHtml(it.item_name_snapshot || it.item_name)}</span>
                  <span class="text-[10px] text-slate-500">
                    Norma: <strong>${escapeHtml(it.technical_standard_snapshot || it.technical_standard || 'N/A')}</strong> · Talla: <strong class="text-teal-800">${escapeHtml(it.size_delivered || 'Única')}</strong>
                  </span>
                </div>
                <span class="px-2 py-1 rounded-lg bg-teal-100 text-teal-900 font-mono font-bold text-xs">
                  Cant: ${it.quantity_delivered || 1}
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- DECLARACIÓN DE COMPROMISO LEGAL -->
        <div class="p-3.5 bg-amber-50 border-2 border-amber-200/90 rounded-2xl text-[11px] text-amber-950 space-y-1.5">
          <div class="font-black text-amber-900 uppercase flex items-center gap-1.5">
            <span>⚖️</span>
            <span>Declaración de Recibido y Compromiso Legal (Ley 9/1979 y Art. 230 CST):</span>
          </div>
          <p class="leading-relaxed">
            "Manifiesto que he recibido a entera satisfacción los Elementos de Protección Personal y Dotación de Ley descritos, en óptimo estado y certificados. Me comprometo a usarlos de manera obligatoria durante mi jornada laboral, darles el cuidado adecuado y solicitar su reposición inmediata en caso de deterioro."
          </p>
        </div>

        <!-- CANVAS DE FIRMA DIGITAL CON EL DEDO (100% RESPONSIVE) -->
        <div class="space-y-2 pt-1 border-t border-slate-200">
          <div class="flex items-center justify-between">
            <span class="font-black text-slate-900 text-xs">✍️ Estampa tu Firma con el Dedo en Pantalla:</span>
            <button type="button" id="btn-clear-deliv-sig" class="text-[10px] text-rose-600 underline font-bold cursor-pointer">Limpiar Trazo</button>
          </div>
          <div class="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
            <canvas id="canvas-deliv-sig" class="signature-pad-canvas w-full h-36"></canvas>
          </div>
          <span class="text-[9.5px] text-slate-400 block text-center">Firma digital con sello criptográfico SHA-256 (Ley 527 de 1999)</span>
        </div>

      </div>

      <!-- BOTONES -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 flex-shrink-0">
        <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer">
          Cancelar
        </button>
        <button type="button" id="btn-confirm-deliv-sig" class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black shadow-md cursor-pointer active:scale-95">
          ✓ Confirmar y Firmar Recibido de EPP
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);

  const pad = setupSignaturePad('canvas-deliv-sig');
  document.getElementById('btn-clear-deliv-sig')?.addEventListener('click', () => pad?.clear());

  document.getElementById('btn-confirm-deliv-sig')?.addEventListener('click', async () => {
    if (!pad || pad.isEmpty()) {
      alert("Por favor estampa tu firma en el recuadro antes de confirmar.");
      return;
    }

    const btn = document.getElementById('btn-confirm-deliv-sig');
    btn.disabled = true;
    btn.innerText = "Sellando con SHA-256...";

    try {
      const sigData = pad.getDataUrl();
      const res = await store.signEppDelivery(delivery.id, trabajador.id, sigData);

      modalEl.remove();

      if (window.mostrarNotificacion) {
        window.mostrarNotificacion("✓ Acta firmada y sellada con hash SHA-256 (Ley 527 de 1999).", "success");
      }

      if (confirm(`✓ ¡Acta de entrega ${delivery.delivery_consecutive} firmada y sellada con éxito!\n\n¿Deseas abrir e imprimir ahora el Formato Oficial PDF (SST-FOR-EPP-01)?`)) {
        if (typeof window.imprimirActaEntregaEPP_SST_FOR_01 === 'function') {
          window.imprimirActaEntregaEPP_SST_FOR_01(delivery.id);
        }
      }

      renderWorkerPortal();
    } catch (err) {
      console.error("Error al firmar acta de EPP:", err);
      alert("Error al firmar acta de entrega: " + err.message);
      btn.disabled = false;
      btn.innerText = "✓ Confirmar y Firmar Recibido de EPP";
    }
  });
};

// Compatibilidad con invocaciones previas
window.abrirModalFirmaActaEPP = function(trabajadorId) {
  const deliveries = store.getEppDeliveries ? store.getEppDeliveries(trabajadorId) : [];
  const pending = deliveries.find(d => d.status === 'ASIGNADO_PENDIENTE_FIRMA');
  if (pending) {
    window.abrirModalFirmarActaEntregaEPP(pending.id, trabajadorId);
  } else {
    // Si no hay entrega pendiente, invitar a asignar una
    if (confirm("No hay entregas pendientes de firma para este trabajador. ¿Deseas abrir la asignación de EPP y Dotación ahora?")) {
      window.abrirModalAsignarEntregaEPP(trabajadorId);
    }
  }
};

// =============================================================================
// MODAL DE CUSTODIA INDIVIDUAL DE HERRAMIENTA
// =============================================================================
window.abrirModalFirmaCustodia = function(toolId, toolName, trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) return;
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva();

  const modalId = 'modal-firma-custodia';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto flex flex-col">
      <div class="bg-slate-900 p-4 text-white flex items-center justify-between">
        <div>
          <span class="text-[9px] font-black uppercase tracking-wider text-teal-300 block">Custodia y Asignación de Activo</span>
          <h3 class="font-black text-sm text-white">Acta de Recibido de Equipo</h3>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-white text-lg font-bold p-1 cursor-pointer">✕</button>
      </div>

      <div class="p-5 space-y-3 text-xs leading-relaxed text-slate-800">
        <p>
          Yo, <strong>${trabajador.nombre}</strong>, recibo a satisfacción la herramienta / máquina <strong>${toolName}</strong> para el desempeño de mis funciones en <strong>${empresa.razonSocial}</strong>.
        </p>
        <p class="text-[11px] text-slate-600">
          Me comprometo a operarla siguiendo su Procedimiento de Trabajo Seguro (PTS), realizar la inspección preoperacional diaria y reportar oportunamente cualquier anomalía mecánica.
        </p>

        <div class="space-y-1 pt-2">
          <div class="flex items-center justify-between">
            <span class="font-black text-slate-900 text-xs">✍️ Firma con el Dedo:</span>
            <button type="button" id="btn-clear-cust-sig" class="text-[10px] text-rose-600 underline font-bold cursor-pointer">Limpiar</button>
          </div>
          <div class="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
            <canvas id="canvas-cust-sig" class="signature-pad-canvas w-full h-32"></canvas>
          </div>
        </div>
      </div>

      <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
        <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Cancelar</button>
        <button type="button" id="btn-confirm-cust-sig" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-md cursor-pointer">✓ Confirmar Custodia</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  const pad = setupSignaturePad('canvas-cust-sig');
  document.getElementById('btn-clear-cust-sig')?.addEventListener('click', () => pad?.clear());

  document.getElementById('btn-confirm-cust-sig')?.addEventListener('click', async () => {
    if (pad?.isEmpty()) {
      alert("Por favor firma en el recuadro.");
      return;
    }

    const btn = document.getElementById('btn-confirm-cust-sig');
    btn.disabled = true;

    try {
      const sigData = pad.getDataUrl();
      await store.submitWorkerToolAssignment({
        worker_id: trabajador.id,
        tenant_id: empresa.id,
        tool_id: toolId,
        signature_base64: sigData
      });

      modalEl.remove();
      alert(`✓ Asignación y custodia de "${toolName}" registrada exitosamente.`);
      renderWorkerPortal();
    } catch (err) {
      alert("Error registrando custodia: " + err.message);
      btn.disabled = false;
    }
  });
};

// =============================================================================
// MODAL DE FICHA TÉCNICA SST DEL ACTIVO
// =============================================================================
window.abrirModalFichaTecnicaSST = function(toolId) {
  const tool = store.getToolById(toolId);
  if (!tool) return;
  const sst = store.getToolSST(toolId);

  const modalId = 'modal-ficha-sst';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto flex flex-col max-h-[92vh]">
      <div class="bg-slate-900 p-4 text-white flex items-center justify-between">
        <div>
          <span class="text-[9px] font-mono text-teal-400 uppercase font-black">${tool.internal_code}</span>
          <h3 class="font-black text-sm text-white">${tool.exact_name}</h3>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-white text-lg font-bold p-1 cursor-pointer">✕</button>
      </div>

      <div class="p-5 overflow-y-auto space-y-3.5 text-xs">
        <div class="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-2xl border">
          <div><span class="text-slate-500">Marca:</span> <strong>${tool.brand || 'N/A'}</strong></div>
          <div><span class="text-slate-500">Modelo:</span> <strong>${tool.model || 'N/A'}</strong></div>
          <div><span class="text-slate-500">Serie:</span> <strong>${tool.serial_number || 'N/A'}</strong></div>
          <div><span class="text-slate-500">Estado:</span> <strong class="text-emerald-700">${tool.current_status}</strong></div>
        </div>

        <div>
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider text-rose-700">⚠️ Peligros Asociados a la Operación:</h4>
          <ul class="list-disc pl-5 space-y-1 text-[11px] text-slate-700 mt-1.5">
            ${(sst?.hazards || [
              'Atrapamiento por piezas en rotación o transmisión mecánica',
              'Golpes o cortes por proyección de partículas o esquirlas',
              'Exposición a ruido continuo > 85 dBA',
              'Riesgo eléctrico por conexiones o motor trifásico'
            ]).map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>

        <div>
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider text-teal-800">🛡️ Medidas de Control y Prevención:</h4>
          <p class="text-[11px] text-slate-700 mt-1.5 leading-relaxed whitespace-pre-line">
            ${sst?.preventive_measures || '1. Verificar guardas perimetrales y botones de parada de emergencia antes de encender.\n2. Mantener orden y limpieza alrededor del equipo.\n3. Prohibido usar prendas sueltas, joyas o cabello largo desatado.\n4. Desconectar y bloquear (LOTO) previo a limpieza o mantenimiento.'}
          </p>
        </div>

        <div>
          <h4 class="font-black text-slate-900 border-b pb-1 text-xs uppercase tracking-wider">🦺 EPP Obligatorios para Operar:</h4>
          <div class="flex flex-wrap gap-1 mt-1.5">
            ${(sst?.required_epp || ['Casco con barbuquejo', 'Gafas de seguridad', 'Botas con puntera', 'Protección auditiva', 'Guantes mecánicos']).map(e => `
              <span class="px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[10px] font-bold">✓ ${e}</span>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="p-4 bg-slate-50 border-t flex justify-end">
        <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer">Cerrar Ficha</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);
};

window.abrirModalReportePeligro = function(trabajadorId) {
  activeMobileTab = 'reportar';
  renderWorkerPortal();
};


// =============================================================================
// MÓDULO E-LEARNING TRABAJADOR: AULA VIRTUAL Y EVALUACIÓN SECUENCIAL
// Visor Multimedia (Google Slides/Video) -> Desbloqueo Preventivo -> Cuestionario de hasta 7 Preguntas
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
  const preguntas = (cap.preguntas || []).slice(0, 7);
  const totalPreguntas = preguntas.length || 7;

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
            <span id="text-paso-2" class="font-bold text-slate-400">Evaluación (${totalPreguntas} Preguntas)</span>
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
              Para desbloquear la evaluación debes revisar la <strong>Presentación Oficial</strong> y el <strong>Video Técnico</strong>. Al finalizar la revisión, marca la casilla de confirmación para habilitar el examen de hasta 7 preguntas.
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
                Certifico que he revisado la presentación y el video de capacitación y me encuentro listo para presentar la evaluación de ${totalPreguntas} preguntas.
              </span>
            </label>

            <button type="button" id="btn-desbloquear-evaluacion" disabled class="px-5 py-2.5 bg-slate-300 text-slate-500 rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 cursor-not-allowed">
              <span>🔒 Iniciar Evaluación (${totalPreguntas} Preguntas)</span>
            </button>
          </div>
        </div>

        <!-- PASO 2: CUESTIONARIO INTERACTIVO (${totalPreguntas} PREGUNTAS) -->
        <div id="seccion-cuestionario-examen" class="hidden space-y-6 pt-4 border-t border-slate-200">
          <div class="bg-indigo-900 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between flex-wrap gap-2">
            <div>
              <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Evaluación de Eficacia SG-SST</span>
              <h4 class="text-sm font-bold text-white">Responde las ${totalPreguntas} preguntas de selección múltiple con única respuesta</h4>
            </div>
            <div class="bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-bold font-mono" id="contador-progreso-examen">
              0 de ${totalPreguntas} respondidas
            </div>
          </div>

          <form id="form-examen-preguntas" class="space-y-5">
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
                ⚠️ Recuerda que debes contestar <strong>las ${totalPreguntas} preguntas</strong> para poder registrar tu calificación y generar tu formato legal.
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
  const formExamen = document.getElementById('form-examen-preguntas') || document.getElementById('form-examen-13-preguntas');
  if (formExamen) formExamen.onsubmit = async (e) => {
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
          <span class="text-base font-black text-slate-800">${resultado.correct_count !== undefined ? resultado.correct_count : (resultado.total_questions || 7)} / ${resultado.total_questions || 7}</span>
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
  let cargoObj = cargoId ? store.getJobPosition(cargoId) : null;
  if (!cargoObj && cargoId) {
    const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
    cargoObj = store.getJobPositions(empresaActiva?.id).find(j => (j.title || '').toLowerCase().trim() === String(cargoId).toLowerCase().trim());
  }
  if (!cargoObj && trabajadorId) {
    const trab = store.getTrabajadorPorId(trabajadorId);
    if (trab?.job_position_id) cargoObj = store.getJobPosition(trab.job_position_id);
    if (!cargoObj && trab?.cargo) {
      const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0];
      cargoObj = store.getJobPositions(empresaActiva?.id).find(j => (j.title || '').toLowerCase().trim() === (trab.cargo || '').toLowerCase().trim());
    }
  }
  const cargoName = cargoObj ? cargoObj.title : (cargoId || '');
  window.ejecutarGeneracionPdfModal(instrumento, trabajadorId, cargoName);
};

// =============================================================================
// MODAL: AUDITORÍA DE SOCIALIZACIÓN Y FIRMAS DE MANUALES (ESTÁNDAR 1.1.2)
// =============================================================================
window.abrirModalAuditoriaManuales = function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;

  const auditData = store.getAuditManualesFirmados(empresaActiva.id);
  const modalId = 'modal-auditoria-manuales';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
      
      <!-- Cabecera -->
      <div class="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-2xl flex-shrink-0">📋</span>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-black uppercase tracking-wider text-purple-300 font-mono">RESOLUCIÓN 0312 DE 2019 • ESTÁNDAR 1.1.2</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-black ${auditData.porcentaje === 100 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}">
                ${auditData.porcentaje}% Cumplimiento
              </span>
            </div>
            <h3 class="font-black text-base text-white">Auditoría de Socialización y Firma de Manuales de Cargos y Responsabilidades</h3>
            <p class="text-[11px] text-slate-300">Empresa: <strong>${empresaActiva.razonSocial}</strong> (NIT: ${empresaActiva.nit})</p>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer">✕</button>
      </div>

      <!-- Contenido y Métricas -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4">
        
        <!-- KPIs de Auditoría -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <span class="text-[10px] font-bold text-slate-500 block uppercase">Total Colaboradores</span>
            <span class="text-xl font-black text-slate-900">${auditData.total}</span>
          </div>
          <div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
            <span class="text-[10px] font-bold text-emerald-700 block uppercase">Firmados y Vigentes</span>
            <span class="text-xl font-black text-emerald-700">${auditData.firmados}</span>
          </div>
          <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-center">
            <span class="text-[10px] font-bold text-amber-700 block uppercase">Pendientes por Firmar</span>
            <span class="text-xl font-black text-amber-700">${auditData.pendientes}</span>
          </div>
          <div class="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-center">
            <span class="text-[10px] font-bold text-purple-700 block uppercase">Soporte Numeral 1.1.2</span>
            <span class="text-xl font-black text-purple-900">${auditData.porcentaje}%</span>
          </div>
        </div>

        <!-- Tabla Detallada -->
        <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-100 text-slate-700 text-[10px] uppercase tracking-wider border-b border-slate-200">
                  <th class="p-3">Colaborador / Titular</th>
                  <th class="p-3">Cargo & Departamento</th>
                  <th class="p-3 text-center">Estado Firma</th>
                  <th class="p-3">Fecha y Hora (Bogotá)</th>
                  <th class="p-3">Sello SHA-256 / S3</th>
                  <th class="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${auditData.lista.map(item => `
                  <tr class="hover:bg-slate-50/80 transition">
                    <td class="p-3">
                      <strong class="text-slate-900 block">${item.worker_name}</strong>
                      <span class="text-[10px] text-slate-500 font-mono">C.C. ${item.national_id}</span>
                    </td>
                    <td class="p-3">
                      <span class="font-bold text-slate-800 block">${item.cargo}</span>
                      <span class="text-[10px] text-slate-500">${item.area}</span>
                    </td>
                    <td class="p-3 text-center">
                      <span class="px-2.5 py-1 rounded-full text-[9px] font-black inline-block ${item.is_signed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
                        ${item.is_signed ? '✓ Firmado y Vigente' : '⚠️ Pendiente por Firmar'}
                      </span>
                    </td>
                    <td class="p-3 text-[11px] text-slate-600">
                      ${item.bogota_signed_at || '<span class="text-slate-400 italic">Sin firmar</span>'}
                    </td>
                    <td class="p-3 text-[10px] font-mono text-slate-500 max-w-[180px]">
                      ${item.sha256_hash ? `<span class="truncate block text-slate-700" title="${item.sha256_hash}">Hash: ${item.sha256_hash.substring(0, 16)}...</span>` : ''}
                      ${item.pdf_s3_key ? `<span class="truncate block text-indigo-600 text-[9px]" title="${item.pdf_s3_key}">S3: ...${item.pdf_s3_key.split('/').pop()}</span>` : '<span class="text-slate-400 italic">No generado</span>'}
                    </td>
                    <td class="p-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button 
                          type="button" 
                          onclick="window.imprimirManualDeCargo(null, '${item.worker_id}')"
                          class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                          title="Ver y descargar acta en PDF"
                        >
                          📄 PDF
                        </button>
                        ${!item.is_signed ? `
                          <button 
                            type="button" 
                            onclick="window.verPortalComoTrabajador('${item.worker_id}')"
                            class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="Firmar en portal del trabajador"
                          >
                            ✍️ Firmar
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <button 
          type="button" 
          onclick="window.exportarAuditoriaManualesCsv()" 
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span>📥</span>
          <span>Descargar Reporte de Auditoría en Lote (CSV)</span>
        </button>

        <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
          Cerrar
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);
};

window.exportarAuditoriaManualesCsv = function() {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const auditData = store.getAuditManualesFirmados(empresaActiva.id);

  let csv = 'Trabajador,Identificacion,Cargo,Area,TipoContrato,FechaIngreso,EstadoFirma,FechaFirmaBogota,HashSHA256,RutaS3MinIO,DireccionIP\n';
  auditData.lista.forEach(i => {
    csv += `"${i.worker_name}","${i.national_id}","${i.cargo}","${i.area}","${i.tipo_contrato}","${i.fecha_ingreso}","${i.is_signed ? 'Firmado' : 'Pendiente'}","${i.bogota_signed_at || ''}","${i.sha256_hash || ''}","${i.pdf_s3_key || ''}","${i.signer_ip || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Auditoria_Manuales_Cargo_Est_1_1_2_${empresaActiva.nit}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// =============================================================================
// MODAL: ALTERNAR MÉTODO DE FIRMA (REGISTRADA VS CANVAS)
// =============================================================================
window.alternarMetodoFirmaModal = function(metodo) {
  const contBase = document.getElementById('contenedor-firma-base-preview');
  const contCanvas = document.getElementById('contenedor-firma-canvas-block');
  if (metodo === 'registered') {
    if (contBase) contBase.classList.remove('hidden');
    if (contCanvas) contCanvas.classList.add('hidden');
  } else {
    if (contBase) contBase.classList.add('hidden');
    if (contCanvas) contCanvas.classList.remove('hidden');
  }
};

// =============================================================================
// EXPEDIENTE LABORAL DIGITAL (CARPETA DEL TRABAJADOR - CUMPLIMIENTO DEC. 1072)
// Almacenamiento Centralizado por Categorías, MinIO S3 y Vinculación a Res. 0312
// =============================================================================
window.abrirModalCarpetaTrabajador = async function(trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId);
  if (!trabajador) {
    alert("No se encontró el trabajador.");
    return;
  }
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva();

  // Cargar documentos del expediente desde el servidor
  await store.getWorkerFolderDocuments(trabajador.id, empresa.id);

  const modalId = 'modal-carpeta-trabajador';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  const CATEGORIAS_EXPEDIENTE = [
    { key: 'CEDULA_CIUDADANIA', label: 'Cédula de Ciudadanía', icon: '🪪', desc: 'Copia legible de la cédula de ciudadanía o documento de identidad.' },
    { key: 'HOJA_DE_VIDA', label: 'Hoja de Vida', icon: '📄', desc: 'Hoja de vida con soportes académicos y laborales verificados.' },
    { key: 'CERTIFICACION_BANCARIA', label: 'Certificación Bancaria', icon: '🏦', desc: 'Certificado de cuenta bancaria para pago de nómina.' },
    { key: 'EXAMEN_MEDICO_INGRESO', label: 'Certificado de Aptitud Médica (Ingreso)', icon: '🩺', desc: 'Certificado médico de aptitud ocupacional expedido por médico especialista en SST (Res. 2346/2007). Vincula a Estándar 3.1.4.' },
    { key: 'AFILIACION_EPS', label: 'Certificado de Afiliación EPS', icon: '🏥', desc: 'Certificado de afiliación a Salud (EPS). Vincula a Estándar 1.1.3.' },
    { key: 'AFILIACION_ARL', label: 'Certificado de Afiliación ARL', icon: '🛡️', desc: 'Certificado de afiliación a Riesgos Laborales (ARL). Vincula a Estándar 1.1.3.' },
    { key: 'AFILIACION_PENSION', label: 'Certificado de Afiliación Pensión', icon: '🏛️', desc: 'Certificado de afiliación a Fondo de Pensiones (AFP). Vincula a Estándar 1.1.3.' },
    { key: 'OTROS_SOPORTES', label: 'Otros Soportes (Contratos, Cursos, etc.)', icon: '📎', desc: 'Certificados de cursos, alturas, inducciones o soportes complementarios.' }
  ];

  function getCategoryInfo(catKey) {
    return CATEGORIAS_EXPEDIENTE.find(c => c.key === catKey) || { key: catKey, label: catKey, icon: '📁', desc: '' };
  }

  function renderContenidoModal() {
    const completeness = store.calculateFolderCompleteness(trabajador.id);
    const docsActuales = (store.data.employee_folder_documents || []).filter(d => d.employee_id === trabajador.id || d.trabajadorId === trabajador.id);

    return `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        <!-- CABECERA -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex-shrink-0">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-300 border border-indigo-400/40 flex items-center justify-center text-2xl font-black shadow-inner flex-shrink-0">
                📁
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[9px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                    Expediente Laboral Digital • Dec. 1072 Art. 2.2.4.6.12
                  </span>
                  <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black ${completeness.isComplete ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}">
                    ${completeness.isComplete ? '✓ Expediente Completo (5/5)' : `⚠️ Incompleto (${completeness.presentCount}/5)`}
                  </span>
                </div>
                <h3 class="font-black text-base sm:text-lg text-white mt-1 leading-tight">
                  Carpeta del Trabajador: ${escapeHtml(trabajador.nombre)}
                </h3>
                <p class="text-xs text-slate-300">
                  C.C. <strong class="text-white font-mono">${trabajador.identificacion || trabajador.cedula}</strong> · Cargo: <strong class="text-white">${trabajador.cargo}</strong> · ${empresa.razonSocial}
                </p>
              </div>
            </div>
            <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer">✕</button>
          </div>
        </div>

        <!-- CUERPO PRINCIPAL CON SCROLL -->
        <div class="p-5 overflow-y-auto flex-1 space-y-4">
          
          <!-- SEMÁFORO Y PANEL DE COMPLETITUD DE 5 DOCUMENTOS LEGALES -->
          <div class="p-4 rounded-2xl border ${completeness.isComplete ? 'bg-emerald-50/80 border-emerald-200' : 'bg-amber-50/80 border-amber-200'}">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-black uppercase tracking-wider ${completeness.isComplete ? 'text-emerald-950' : 'text-amber-950'} flex items-center gap-1.5">
                <span>${completeness.isComplete ? '✅' : '📊'}</span>
                <span>Semáforo de Requisitos Obligatorios SG-SST &amp; Laboral</span>
              </span>
              <span class="text-xs font-bold font-mono ${completeness.isComplete ? 'text-emerald-800' : 'text-amber-800'}">
                ${completeness.presentCount} de 5 requeridos (${completeness.percentage}%)
              </span>
            </div>

            <!-- Barra de Progreso -->
            <div class="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200 mb-3">
              <div class="h-full transition-all duration-500 rounded-full ${completeness.isComplete ? 'bg-emerald-500' : 'bg-amber-500'}" style="width: ${completeness.percentage}%;"></div>
            </div>

            <!-- Fichas de las 5 Categorías Obligatorias -->
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              ${[
                { key: 'CEDULA_CIUDADANIA', label: 'Cédula', icon: '🪪' },
                { key: 'HOJA_DE_VIDA', label: 'Hoja Vida', icon: '📄' },
                { key: 'CERTIFICACION_BANCARIA', label: 'Banco', icon: '🏦' },
                { key: 'EXAMEN_MEDICO_INGRESO', label: 'Examen Médico', icon: '🩺' },
                { key: 'SEGURIDAD_SOCIAL', label: 'Seg. Social', icon: '🏥' }
              ].map(cat => {
                const tiene = !!completeness.categoriesPresent[cat.key];
                return `
                  <div class="p-2 rounded-xl border ${tiene ? 'bg-white border-emerald-300 text-emerald-900 shadow-2xs' : 'bg-white/60 border-amber-300 text-amber-800'} flex flex-col items-center">
                    <span class="text-base mb-0.5">${cat.icon}</span>
                    <strong class="text-[10px] font-bold block leading-tight">${cat.label}</strong>
                    <span class="text-[8.5px] font-semibold mt-1 px-1.5 py-0.2 rounded ${tiene ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-amber-100 text-amber-800'}">
                      ${tiene ? '✓ Al Día' : '✕ Pendiente'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- ADVERTENCIA LEGAL MÉDICA (RES. 2346 DE 2007) -->
          <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-950">
            <span class="text-lg flex-shrink-0">⚖️</span>
            <div class="space-y-0.5 text-[11px] leading-relaxed">
              <strong>Advertencia Legal de Confidencialidad (Resolución 2346 de 2007 &amp; Ley 1581 de 2012):</strong>
              <p class="text-slate-700">
                En el expediente laboral solo se deben custodiar <strong>Certificados de Aptitud Médica Ocupacional</strong> (Concepto Médico de Ingreso/Periódico emitido por médico con licencia en SST). <em>Queda expresamente prohibido almacenar historias clínicas completas</em> o datos sensibles no relacionados con el perfil de aptitud laboral.
              </p>
            </div>
          </div>

          <!-- FORMULARIO DE CARGA DE DOCUMENTOS (DRAG & DROP + INPUT) -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>📤</span> Subir Nuevo Documento al Expediente
              </h4>
              <span class="text-[10px] font-mono text-slate-500">PDF, PNG, JPG (Hasta 15 MB)</span>
            </div>

            <form id="form-upload-folder-doc" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                <!-- Selector de Categoría -->
                <div>
                  <label class="block text-[10.5px] font-bold text-slate-700 mb-1">Categoría Documental *</label>
                  <select id="folder-upload-category" required class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
                    ${CATEGORIAS_EXPEDIENTE.map(c => `
                      <option value="${c.key}">${c.icon} ${c.label}</option>
                    `).join('')}
                  </select>
                </div>

                <!-- Título Descriptivo -->
                <div>
                  <label class="block text-[10.5px] font-bold text-slate-700 mb-1">Título Descriptivo *</label>
                  <input type="text" id="folder-upload-title" required placeholder="Ej. Certificado Médico de Ingreso 2026" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
                </div>

                <!-- Fechas de Expedición y Vencimiento -->
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10.5px] font-bold text-slate-700 mb-1">Expedición</label>
                    <input type="date" id="folder-upload-issue-date" value="${new Date().toISOString().slice(0, 10)}" class="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-[11px] font-semibold text-slate-800">
                  </div>
                  <div>
                    <label class="block text-[10.5px] font-bold text-slate-700 mb-1" title="Para certificados que expiran">Vence</label>
                    <input type="date" id="folder-upload-expiration-date" class="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-[11px] font-semibold text-slate-800">
                  </div>
                </div>

              </div>

              <!-- Zona Drag & Drop -->
              <div id="drop-zone-folder" class="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 text-center bg-white transition cursor-pointer">
                <input type="file" id="folder-file-input" accept=".pdf,image/png,image/jpeg,image/jpg" class="hidden">
                <div id="drop-zone-prompt" class="space-y-1">
                  <span class="text-2xl block">📄</span>
                  <p class="text-xs font-bold text-slate-700">Arrastra tu archivo aquí o <span class="text-indigo-600 underline">haz clic para examinar</span></p>
                  <p class="text-[10px] text-slate-400">PDF, PNG o JPG • Cifrado y almacenado en MinIO S3 con retención legal de 20 años</p>
                </div>
                <div id="drop-zone-selected" class="hidden flex items-center justify-between p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950">
                  <div class="flex items-center gap-2 overflow-hidden">
                    <span>📎</span>
                    <span id="selected-file-name" class="font-bold truncate max-w-xs">archivo.pdf</span>
                    <span id="selected-file-size" class="text-[10px] text-slate-500 font-mono">0 KB</span>
                  </div>
                  <button type="button" id="btn-remove-selected-file" class="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1 cursor-pointer">✕ Quitar</button>
                </div>
              </div>

              <div class="flex justify-end">
                <button type="submit" id="btn-submit-folder-upload" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5">
                  <span>☁️</span>
                  <span>Subir y Custodiar en Expediente</span>
                </button>
              </div>
            </form>
          </div>

          <!-- LISTADO DE DOCUMENTOS EN EL EXPEDIENTE -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>📑</span> Documentos Custodiados (${docsActuales.length})
              </h4>
              <span class="text-[10px] text-slate-500">Dec. 1072 Art. 2.2.4.6.13 (Retención 20 años)</span>
            </div>

            ${docsActuales.length === 0 ? `
              <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span class="text-3xl block">📭</span>
                <p class="text-xs font-bold text-slate-700">No hay documentos en este expediente laboral aún.</p>
                <p class="text-[11px] text-slate-400">Utiliza el formulario superior para cargar la Cédula, Examen Médico u otros soportes.</p>
              </div>
            ` : `
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${docsActuales.map(doc => {
                  const catInfo = getCategoryInfo(doc.document_category);
                  const sizeKb = Math.round((doc.file_size_bytes || 0) / 1024);
                  const sizeMb = (sizeKb / 1024).toFixed(1);
                  const sizeStr = sizeKb > 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
                  const fechaSubida = doc.created_at ? new Date(doc.created_at).toLocaleDateString('es-CO') : 'Reciente';

                  return `
                    <div class="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition flex flex-col justify-between space-y-2">
                      <div>
                        <div class="flex items-start justify-between gap-2">
                          <span class="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <span>${catInfo.icon}</span>
                            <span>${catInfo.label}</span>
                          </span>
                          <span class="text-[9px] font-mono text-slate-400 font-medium">
                            ${fechaSubida}
                          </span>
                        </div>

                        <h5 class="font-bold text-xs text-slate-900 mt-1.5 leading-snug">
                          ${escapeHtml(doc.document_title || doc.file_name)}
                        </h5>
                        <p class="text-[10px] font-mono text-slate-500 truncate" title="${escapeHtml(doc.file_name)}">
                          📄 ${escapeHtml(doc.file_name)} · ${sizeStr}
                        </p>

                        ${doc.expiration_date ? `
                          <div class="mt-1 flex items-center gap-1 text-[9.5px]">
                            <span class="text-amber-700 font-bold">Vence: ${doc.expiration_date}</span>
                          </div>
                        ` : ''}
                      </div>

                      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span class="text-[8.5px] text-emerald-700 font-bold font-mono">
                          ✓ MinIO S3 (20 Años)
                        </span>
                        
                        <div class="flex items-center gap-1.5">
                          <a 
                            href="${doc.file_url}" 
                            target="_blank" 
                            download="${escapeHtml(doc.file_name)}"
                            class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Descargar o abrir documento"
                          >
                            <span>👁️</span>
                            <span>Ver</span>
                          </a>

                          <button 
                            type="button" 
                            onclick="window.eliminarDocumentoCarpetaConfirm('${doc.id}', '${trabajador.id}')"
                            class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar documento del expediente"
                          >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

        </div>

        <!-- PIE DEL MODAL -->
        <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span class="text-[10px] text-slate-500 font-mono">
            Ruta S3: tenants/${empresa.id}/employees/${trabajador.id}/...
          </span>
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer">
            Cerrar Expediente
          </button>
        </div>

      </div>
    `;
  }

  modalEl.innerHTML = renderContenidoModal();
  document.body.appendChild(modalEl);

  function bindEventosUpload() {
    const form = document.getElementById('form-upload-folder-doc');
    const dropZone = document.getElementById('drop-zone-folder');
    const fileInput = document.getElementById('folder-file-input');
    const promptEl = document.getElementById('drop-zone-prompt');
    const selectedEl = document.getElementById('drop-zone-selected');
    const fileNameEl = document.getElementById('selected-file-name');
    const fileSizeEl = document.getElementById('selected-file-size');
    const removeBtn = document.getElementById('btn-remove-selected-file');
    const titleInput = document.getElementById('folder-upload-title');
    const categorySelect = document.getElementById('folder-upload-category');

    let currentFile = null;

    if (categorySelect && titleInput) {
      categorySelect.onchange = () => {
        const catInfo = getCategoryInfo(categorySelect.value);
        if (!titleInput.value || CATEGORIAS_EXPEDIENTE.some(c => c.label === titleInput.value)) {
          titleInput.value = catInfo.label;
        }
      };
      const initialCat = getCategoryInfo(categorySelect.value);
      if (initialCat) titleInput.value = initialCat.label;
    }

    if (dropZone && fileInput) {
      dropZone.onclick = (e) => {
        if (e.target.id === 'btn-remove-selected-file') return;
        fileInput.click();
      };

      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          setFile(e.target.files[0]);
        }
      };

      dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50/50');
      };
      dropZone.ondragleave = () => {
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      };
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          setFile(e.dataTransfer.files[0]);
        }
      };
    }

    function setFile(f) {
      if (f.size > 15728640) {
        alert("El archivo excede el tamaño máximo permitido de 15 MB.");
        return;
      }
      currentFile = f;
      fileNameEl.innerText = f.name;
      const sizeKb = Math.round(f.size / 1024);
      fileSizeEl.innerText = sizeKb > 1024 ? `${(sizeKb/1024).toFixed(1)} MB` : `${sizeKb} KB`;
      promptEl.classList.add('hidden');
      selectedEl.classList.remove('hidden');
    }

    if (removeBtn) {
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        currentFile = null;
        fileInput.value = '';
        promptEl.classList.remove('hidden');
        selectedEl.classList.add('hidden');
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentFile) {
          alert("Por favor selecciona un archivo PDF o imagen para subir.");
          return;
        }

        const submitBtn = document.getElementById('btn-submit-folder-upload');
        submitBtn.disabled = true;
        submitBtn.innerText = "Cargando y asegurando en MinIO S3...";

        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result;
            const category = document.getElementById('folder-upload-category').value;
            const title = document.getElementById('folder-upload-title').value.trim();
            const issueDate = document.getElementById('folder-upload-issue-date')?.value || null;
            const expirationDate = document.getElementById('folder-upload-expiration-date')?.value || null;

            await store.uploadWorkerFolderDocument({
              worker_id: trabajador.id,
              employee_id: trabajador.id,
              tenant_id: empresa.id,
              document_category: category,
              document_title: title,
              file_name: currentFile.name,
              data_url: dataUrl,
              mime_type: currentFile.type || 'application/pdf',
              issue_date: issueDate,
              expiration_date: expirationDate
            });

            alert(`✓ Documento "${title}" cargado exitosamente en el expediente laboral.`);
            
            modalEl.innerHTML = renderContenidoModal();
            bindEventosUpload();
            if (typeof renderWorkerPortal === 'function') renderWorkerPortal();
          };
          reader.readAsDataURL(currentFile);
        } catch (err) {
          alert("Error al cargar documento: " + err.message);
          submitBtn.disabled = false;
          submitBtn.innerText = "☁️ Subir y Custodiar en Expediente";
        }
      };
    }
  }

  bindEventosUpload();
};

window.eliminarDocumentoCarpetaConfirm = async function(docId, workerId) {
  if (!confirm("¿Estás seguro de que deseas eliminar este documento del expediente laboral?\n\nEsta acción quitará el soporte documental digital.")) return;
  try {
    await store.deleteWorkerFolderDocument(docId, workerId);
    alert("✓ Documento eliminado del expediente.");
    const existing = document.getElementById('modal-carpeta-trabajador');
    if (existing) {
      window.abrirModalCarpetaTrabajador(workerId);
    }
    if (typeof renderWorkerPortal === 'function') renderWorkerPortal();
  } catch (err) {
    alert("Error al eliminar documento: " + err.message);
  }
};

// =============================================================================
// MODAL: GESTOR Y REPOSITORIO DE FIRMA DIGITAL DEL TRABAJADOR
// Canvas Signature Pad táctil responsivo, SHA-256 y MinIO S3 (Ley 527 de 1999)
// =============================================================================
window.abrirModalRegistroFirmaTrabajador = function(trabajadorId, callbackOnSuccess = null) {
  const trabajador = store.getTrabajadorPorId(trabajadorId) || (auth.isWorker() ? auth.getUser() : null);
  if (!trabajador) {
    alert("No se encontró el trabajador.");
    return;
  }
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva() || {
    id: 'emp-1790438946268',
    razonSocial: 'LADRILLOS OCHOA LTDA',
    nit: '830124631'
  };

  const modalId = 'modal-registro-firma-trabajador';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto flex flex-col max-h-[92vh]">
      
      <!-- CABECERA -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex-shrink-0">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-300 border border-indigo-400/40 flex items-center justify-center text-2xl font-black shadow-inner flex-shrink-0">
              ✍️
            </div>
            <div>
              <span class="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Firma Digital Base • Ley 527 de 1999
              </span>
              <h3 class="font-black text-base sm:text-lg text-white mt-1 leading-tight">
                Gestor y Repositorio de Firma Digital
              </h3>
              <p class="text-xs text-slate-300">
                ${escapeHtml(trabajador.nombre)} · C.C. <strong class="text-white font-mono">${trabajador.identificacion || trabajador.cedula}</strong>
              </p>
            </div>
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer">✕</button>
        </div>
      </div>

      <!-- CUERPO -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4">
        
        <!-- ESTADO ACTUAL DE FIRMA REGISTRADA -->
        ${trabajador.has_registered_signature ? `
          <div class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                <span>✓</span> Firma Digital Activa en MinIO S3
              </span>
              <span class="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded">
                Ley 527/1999
              </span>
            </div>

            <div class="p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-center">
              <img id="img-preview-firma-actual" src="${obtenerUrlFirmaTrabajador(trabajador)}" alt="Firma Registrada" style="max-height: 55px; max-width: 220px; object-fit: contain;">
            </div>

            <div class="text-[10px] font-mono text-slate-600 space-y-1">
              <p class="truncate"><strong class="text-slate-900">Hash SHA-256:</strong> ${trabajador.signature_sha256 || 'SHA-256'}</p>
              <p><strong class="text-slate-900">Fecha Bogotá (UTC-5):</strong> ${trabajador.signature_registered_bogota || (trabajador.signature_registered_at ? new Date(trabajador.signature_registered_at).toLocaleString('es-CO') : 'Registrada')}</p>
              <p><strong class="text-slate-900">IP de Registro:</strong> ${trabajador.signature_ip_address || '127.0.0.1'}</p>
              <p class="truncate text-indigo-700"><strong class="text-slate-900">Ruta MinIO S3:</strong> ${trabajador.signature_s3_key || `tenants/${empresa.id}/signatures/emp_${trabajador.id}.png`}</p>
            </div>
          </div>
        ` : `
          <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
            <span class="text-xl flex-shrink-0">⚠️</span>
            <div>
              <strong>Sin Firma Registrada:</strong>
              <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Este trabajador aún no tiene una firma digital base registrada. Traza el trazo o sube una imagen a continuación para que pueda estamparse automáticamente en contratos, manuales de cargo y actas de EPP.
              </p>
            </div>
          </div>
        `}

        <!-- SELECTOR DE MÉTODO: TRAZAR O SUBIR ARCHIVO -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
              <span>✍️</span> ${trabajador.has_registered_signature ? 'Actualizar Firma Digital:' : 'Registrar Firma Digital:'}
            </label>
          </div>

          <div class="flex p-1 bg-slate-100 rounded-xl gap-1 border border-slate-200">
            <button type="button" id="tab-sig-modo-trazo" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white text-indigo-900 shadow-xs cursor-pointer">
              <span>✍️</span> Trazar en Pantalla
            </button>
            <button type="button" id="tab-sig-modo-archivo" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer">
              <span>📁</span> Cargar Archivo de Firma
            </button>
          </div>

          <!-- PANEL 1: CANVAS PARA TRAZAR -->
          <div id="panel-sig-modo-trazo" class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-500 font-medium">Firma con el dedo en tu celular o con el puntero del ratón:</span>
              <button type="button" id="btn-clear-base-sig" class="text-[10.5px] text-rose-600 underline font-bold cursor-pointer">
                Limpiar Trazo
              </button>
            </div>
            <div class="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
              <canvas id="canvas-base-sig" class="signature-pad-canvas w-full h-40"></canvas>
            </div>
          </div>

          <!-- PANEL 2: CARGAR ARCHIVO DE IMAGEN -->
          <div id="panel-sig-modo-archivo" class="hidden space-y-2">
            <label id="dropzone-worker-sig" class="flex flex-col items-center justify-center p-5 border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/40 rounded-2xl cursor-pointer bg-slate-50 transition text-center group">
              <div class="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl mb-2 group-hover:scale-105 transition">
                📤
              </div>
              <span class="text-xs text-indigo-700 font-bold" id="texto-dropzone-worker-sig">Seleccionar imagen o foto de la firma</span>
              <span class="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG o WebP (Fondo transparente o blanco)</span>
              <input type="file" id="file-worker-sig-upload" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="hidden">
            </label>

            <div id="preview-worker-sig-upload-box" class="hidden p-3 bg-white border border-indigo-200 rounded-xl space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <span>✓</span> Imagen de firma cargada lista para validación
                </span>
                <button type="button" id="btn-quitar-sig-upload" class="text-[10px] text-rose-600 underline font-bold cursor-pointer">
                  Cambiar imagen
                </button>
              </div>
              <div class="p-2 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                <img id="preview-worker-sig-upload-img" src="" alt="Vista previa de firma" style="max-height: 80px; max-width: 100%; object-fit: contain;">
              </div>
            </div>
          </div>

          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 space-y-1">
            <div class="flex items-center justify-between font-mono">
              <span>Hora Legal Colombia: UTC-5</span>
              <span>Cifrado SHA-256</span>
            </div>
            <p class="text-slate-500 leading-tight">
              Al guardar, este trazo se almacena de forma inmutable en <code>tenants/${empresa.id}/signatures/emp_${trabajador.id}.png</code> para estamparse en los documentos oficiales conforme a la Ley 527 de 1999.
            </p>
          </div>
        </div>

      </div>

      <!-- BOTONES -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 flex-shrink-0">
        <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
          Cancelar
        </button>

        <button type="button" id="btn-save-base-sig" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5">
          <span>💾</span>
          <span>Guardar y Validar Firma Digital</span>
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);

  let uploadedSigDataUrl = null;
  const pad = setupSignaturePad('canvas-base-sig');

  // Conmutador de pestañas
  const tabTrazo = document.getElementById('tab-sig-modo-trazo');
  const tabArchivo = document.getElementById('tab-sig-modo-archivo');
  const panelTrazo = document.getElementById('panel-sig-modo-trazo');
  const panelArchivo = document.getElementById('panel-sig-modo-archivo');

  tabTrazo?.addEventListener('click', () => {
    tabTrazo.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white text-indigo-900 shadow-xs cursor-pointer';
    tabArchivo.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer';
    panelTrazo.classList.remove('hidden');
    panelArchivo.classList.add('hidden');
  });

  tabArchivo?.addEventListener('click', () => {
    tabArchivo.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white text-indigo-900 shadow-xs cursor-pointer';
    tabTrazo.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer';
    panelArchivo.classList.remove('hidden');
    panelTrazo.classList.add('hidden');
  });

  // Manejador de subida de archivo
  const fileInput = document.getElementById('file-worker-sig-upload');
  const dropzone = document.getElementById('dropzone-worker-sig');
  const previewBox = document.getElementById('preview-worker-sig-upload-box');
  const previewImg = document.getElementById('preview-worker-sig-upload-img');
  const btnQuitarUpload = document.getElementById('btn-quitar-sig-upload');

  const processUploadedFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert("Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG o WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedSigDataUrl = e.target.result;
      if (previewImg) previewImg.src = uploadedSigDataUrl;
      previewBox?.classList.remove('hidden');
      dropzone?.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  };

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  });

  btnQuitarUpload?.addEventListener('click', () => {
    uploadedSigDataUrl = null;
    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.src = '';
    previewBox?.classList.add('hidden');
    dropzone?.classList.remove('hidden');
  });

  document.getElementById('btn-clear-base-sig')?.addEventListener('click', () => {
    pad?.clear();
  });

  document.getElementById('btn-save-base-sig')?.addEventListener('click', async () => {
    let sigData = null;
    const esModoArchivo = !panelArchivo?.classList.contains('hidden');

    if (esModoArchivo && uploadedSigDataUrl) {
      sigData = uploadedSigDataUrl;
    } else if (pad && !pad.isEmpty()) {
      sigData = pad.getDataUrl();
    } else if (uploadedSigDataUrl) {
      sigData = uploadedSigDataUrl;
    }

    if (!sigData) {
      alert("Por favor traza tu firma en el recuadro o carga un archivo de imagen antes de guardar.");
      return;
    }

    const btn = document.getElementById('btn-save-base-sig');
    btn.disabled = true;
    btn.innerText = "Guardando y sellando en MinIO S3...";

    try {
      const res = await store.registerWorkerSignature({
        worker_id: trabajador.id,
        employee_id: trabajador.id,
        tenant_id: empresa.id,
        signature_svg: sigData
      });

      // Actualizar datos del trabajador en caliente
      trabajador.has_registered_signature = true;
      trabajador.signature_svg = sigData;
      trabajador.signature_url = res.signature_url;
      trabajador.signature_sha256 = res.sha256_hash;
      trabajador.signature_registered_at = res.worker?.signature_registered_at || new Date().toISOString();
      trabajador.signature_registered_bogota = res.bogota_time;
      trabajador.signature_ip_address = res.worker?.signature_ip_address || '127.0.0.1';

      modalEl.remove();
      alert("✓ ¡Firma digital base actualizada exitosamente con validez jurídica (Ley 527 de 1999)!");
      if (typeof callbackOnSuccess === 'function') {
        try { callbackOnSuccess(); } catch (cbErr) { console.warn("Error en callback tras firma:", cbErr); }
      }
      if (typeof renderWorkerPortal === 'function') renderWorkerPortal();
    } catch (err) {
      alert("Error al registrar firma: " + err.message);
      btn.disabled = false;
      btn.innerText = "💾 Guardar y Validar Firma Digital";
    }
  });
};

// =============================================================================
// MODAL: CARNÉ DIGITAL OCUPACIONAL DEL TRABAJADOR & CÓDIGO QR
// Estándar PVC de identificación legal con verificación pública (Dec. 1072 & Res. 0312)
// =============================================================================
window.abrirModalCarneDigital = function(trabajadorId) {
  const trabajador = store.getTrabajadorPorId(trabajadorId) || (auth.isWorker() ? auth.getUser() : null);
  if (!trabajador) {
    alert("No se encontró la información del colaborador.");
    return;
  }
  const empresa = store.getEmpresa(trabajador.companyId) || store.getEmpresaActiva() || {
    id: 'emp-001',
    razonSocial: 'DOCTOR PYME SG-SST',
    nit: '901.000.000-1',
    arl: 'SURA',
    claseRiesgo: 'I'
  };

  const modalId = 'modal-carne-digital-trabajador';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const originUrl = window.location.origin;
  const targetVerifyUrl = `${originUrl}/verify-worker?id=${encodeURIComponent(trabajador.id)}&cedula=${encodeURIComponent(trabajador.identificacion || trabajador.cedula || '')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=3&data=${encodeURIComponent(targetVerifyUrl)}`;

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn';

  modalEl.innerHTML = `
    <div class="bg-slate-900 rounded-3xl shadow-2xl border border-teal-500/30 w-full max-w-sm overflow-hidden my-auto flex flex-col">
      
      <!-- CABECERA MODAL -->
      <div class="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
        <div class="flex items-center gap-2">
          <span class="text-xl">🪪</span>
          <div>
            <h3 class="text-sm font-black text-white">Carné de Identificación Ocupacional</h3>
            <p class="text-[9.5px] text-teal-400 font-mono">SG-SST • Res. 0312 &amp; Dec. 1072</p>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer">✕</button>
      </div>

      <!-- CUERPO: TARJETA PVC TIPO BADGE -->
      <div class="p-4 overflow-y-auto max-h-[80vh] space-y-4">
        
        <div id="print-carne-card" class="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-teal-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden text-white">
          <!-- Decoración de fondo -->
          <div class="absolute -top-12 -right-12 w-32 h-32 bg-teal-500/15 rounded-full blur-2xl pointer-events-none"></div>
          <div class="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none"></div>

          <!-- Banda Superior Corporativa -->
          <div class="flex items-center justify-between border-b border-teal-500/30 pb-3 mb-3">
            <div class="flex items-center gap-2">
              <img src="./assets/app-icon.png" alt="Doctor Pyme" class="w-8 h-8 rounded-xl object-contain border border-teal-400/40">
              <div>
                <span class="text-[10px] font-black text-white tracking-wider block">DOCTOR PYME</span>
                <span class="text-[8px] text-emerald-400 font-bold block uppercase">SG-SST COLOMBIA</span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[9px] font-mono font-black text-slate-300 block truncate max-w-[150px]">${escapeHtml(empresa.razonSocial)}</span>
              <span class="text-[8px] font-mono text-teal-300 block">NIT: ${escapeHtml(empresa.nit)}</span>
            </div>
          </div>

          <!-- Datos Principales y Foto -->
          <div class="flex items-center gap-3.5 mb-3.5">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-2xl font-black shadow-lg border-2 border-teal-300/40 flex-shrink-0">
              ${escapeHtml(trabajador.nombre.substring(0, 2).toUpperCase())}
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm font-black text-white leading-tight uppercase truncate">${escapeHtml(trabajador.nombre)}</h2>
              <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate max-w-full">
                ${escapeHtml(trabajador.cargo)}
              </span>
              <p class="text-[10px] text-teal-300 font-mono mt-0.5">
                C.C. <strong>${escapeHtml(trabajador.identificacion || trabajador.cedula)}</strong>
              </p>
            </div>
          </div>

          <!-- Grilla de Afiliación a Seguridad Social -->
          <div class="grid grid-cols-2 gap-2 text-[9.5px] bg-slate-900/90 p-3 rounded-2xl border border-slate-800 mb-3.5">
            <div>
              <span class="text-slate-400 block text-[8px] uppercase font-bold">ARL Asignada</span>
              <strong class="text-white block truncate">${escapeHtml(trabajador.arl || empresa.arl || 'SURA')}</strong>
              <span class="text-emerald-400 text-[8.5px] font-bold">Riesgo ${escapeHtml(empresa.claseRiesgo || 'I')}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[8px] uppercase font-bold">EPS Integral</span>
              <strong class="text-white block truncate">${escapeHtml(trabajador.eps || 'Sura EPS')}</strong>
              <span class="text-slate-400 text-[8.5px]">AFP: ${escapeHtml(trabajador.afp || 'Porvenir')}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[8px] uppercase font-bold">Tipo de Sangre</span>
              <strong class="text-emerald-300">${escapeHtml(trabajador.rh || 'O+')}</strong>
            </div>
            <div>
              <span class="text-slate-400 block text-[8px] uppercase font-bold">Aptitud Laboral</span>
              <strong class="text-teal-300 font-bold">✓ APTO SST</strong>
            </div>
          </div>

          <!-- Código QR Dinámico de Validación Pública -->
          <div class="bg-white rounded-2xl p-3 flex items-center gap-3 text-slate-900 border border-slate-200 shadow-md">
            <img src="${qrCodeUrl}" alt="Código QR de Verificación" class="w-20 h-20 object-contain rounded-lg flex-shrink-0 bg-slate-50 p-1 border border-slate-200">
            <div class="text-[9px] leading-tight flex-1">
              <strong class="text-teal-900 text-[10px] block font-black">VALIDACIÓN EN PORTERÍA Y ARL</strong>
              <p class="text-slate-600 mt-0.5">
                Escanea con la cámara de cualquier teléfono para validar afiliación activa y vigencia de capacitaciones en tiempo real.
              </p>
              <span class="text-[8px] font-mono text-slate-400 block mt-1">ID: ${escapeHtml(trabajador.id)}</span>
            </div>
          </div>

          <!-- Pie del Carné -->
          <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[8px] font-mono text-slate-400">
            <span>Dec. 1072/2015 &amp; Res. 0312</span>
            <span>Validez Probatoria Ley 527</span>
          </div>
        </div>

      </div>

      <!-- BOTONES DE ACCIÓN -->
      <div class="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
        <button 
          type="button" 
          onclick="window.imprimirCarneDigital()" 
          class="flex-1 py-2.5 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>🖨️</span>
          <span>Imprimir / Guardar PDF</span>
        </button>
        <button 
          type="button" 
          onclick="document.getElementById('${modalId}').remove()" 
          class="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Cerrar
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);
};

window.imprimirCarneDigital = function() {
  const card = document.getElementById('print-carne-card');
  if (!card) return;

  const win = window.open('', '_blank', 'width=450,height=650');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Carné de Identificación SST</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page { size: 85mm 120mm; margin: 4mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: white; padding: 0; margin: 0; }
        @media print {
          body { background: transparent; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body class="flex items-center justify-center p-2">
      <div style="width: 85mm; max-width: 85mm;">
        ${card.outerHTML}
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 400);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
};
