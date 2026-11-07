// =============================================================================
// MÓDULO DE PRESUPUESTO ANUAL DEL SG-SST - DOCTOR PYME
// Definición, Ejecución y Soportes de Facturas/Comprobantes de Compra
// Normatividad: Res. 0312 de 2019 (Estándar 1.1.2) & Dec. 1072 de 2015 Art. 2.2.4.6.17
// =============================================================================
import { store } from '../store.js';

const CATEGORIAS_PRESUPUESTO = [
  { id: 'capacitacion', nombre: '1. Capacitación, Inducción & Entrenamiento SST', color: 'purple' },
  { id: 'epp', nombre: '2. Elementos de Protección Personal (EPP) & Dotación', color: 'amber' },
  { id: 'medicos', nombre: '3. Evaluaciones Médicas Ocupacionales & Profesiograma', color: 'rose' },
  { id: 'mantenimiento', nombre: '4. Mantenimiento Preventivo / Correctivo de Equipos', color: 'blue' },
  { id: 'emergencias', nombre: '5. Plan de Emergencias, Extintores & Botiquines', color: 'emerald' },
  { id: 'higiene', nombre: '6. Mediciones Ambientales, Higiene & Seguridad', color: 'teal' },
  { id: 'asesoria', nombre: '7. Asesoría Externa, Licencia SST & Auditoría', color: 'indigo' }
];

export function renderBudget() {
  const container = document.getElementById('main-content');
  if (!container) return;

  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs my-8">
        <div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">🏢</div>
        <h3 class="text-base font-bold text-slate-800 mb-1">Selecciona una Empresa Cliente</h3>
        <p class="text-xs text-slate-500 mb-4">Para gestionar el presupuesto anual del SG-SST, selecciona una empresa activa en la cabecera.</p>
        <button onclick="window.location.hash='#empresas';" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition">
          Ver Empresas
        </button>
      </div>
    `;
    return;
  }

  const anioActivo = store.getAnioActivo ? store.getAnioActivo() : new Date().getFullYear();
  const presupuestoItems = store.getBudgetItems(empresaActiva.id, anioActivo);

  // Cálculos financieros
  const totalPresupuestado = presupuestoItems.reduce((acc, it) => acc + (Number(it.valorPresupuestado) || 0), 0);
  const totalEjecutado = presupuestoItems.reduce((acc, it) => acc + (Number(it.valorEjecutado) || 0), 0);
  const porcentajeEjecucion = totalPresupuestado > 0 ? Math.round((totalEjecutado / totalPresupuestado) * 100) : 0;
  const saldoDisponible = totalPresupuestado - totalEjecutado;
  const itemsConFactura = presupuestoItems.filter(it => it.facturaUrl || it.facturaNombre || it.comprobante).length;

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  container.innerHTML = `
    <div class="space-y-6 animate-fadeIn pb-16">
      
      <!-- CABECERA DEL MÓDULO -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl font-black shadow-inner flex-shrink-0">
            💰
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Estándar 1.1.2 • Resolución 0312 de 2019
              </span>
              <span class="text-[10px] font-bold bg-white/10 text-slate-300 px-2.5 py-0.5 rounded-full">
                Dec. 1072 Art. 2.2.4.6.17 (Recursos SG-SST)
              </span>
              <span class="text-[10px] font-black bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full font-mono">
                Vigencia ${anioActivo}
              </span>
            </div>
            <h2 class="text-xl sm:text-2xl font-black text-white mt-1">
              Presupuesto Anual del SG-SST: ${empresaActiva.razonSocial}
            </h2>
            <p class="text-xs text-slate-300 mt-0.5">
              Asignación, control de ejecución y corroboración obligatoria de pagos mediante facturas y comprobantes contables.
            </p>
          </div>
        </div>

        <!-- ACCIONES RÁPIDAS -->
        <div class="flex items-center gap-2 flex-wrap">
          <button id="btn-nuevo-rubro-presupuesto" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer">
            <span>➕</span>
            <span>Nuevo Rubro Presupuestal</span>
          </button>
          <button id="btn-imprimir-acta-presupuesto" class="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer">
            <span>🖨️</span>
            <span>Acta Oficial PDF</span>
          </button>
        </div>
      </div>

      <!-- KPIS FINANCIEROS Y DE EJECUCIÓN -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Presupuesto Asignado</span>
            <span class="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">${formatCOP(totalPresupuestado)}</span>
            <span class="text-[10px] text-slate-500 font-semibold block mt-0.5">${presupuestoItems.length} rubros proyectados</span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
            📊
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ejecutado con Soportes</span>
            <span class="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block">${formatCOP(totalEjecutado)}</span>
            <span class="text-[10px] text-emerald-700 font-bold block mt-0.5">${porcentajeEjecucion}% de avance financiero</span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
            ✓
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Disponible</span>
            <span class="text-xl sm:text-2xl font-black ${saldoDisponible >= 0 ? 'text-indigo-600' : 'text-rose-600'} mt-1 block">
              ${formatCOP(saldoDisponible)}
            </span>
            <span class="text-[10px] ${saldoDisponible >= 0 ? 'text-indigo-500 font-semibold' : 'text-rose-600 font-bold'} block mt-0.5">
              ${saldoDisponible >= 0 ? 'Recursos vigentes' : '⚠️ Sobregiro presupuestal'}
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl ${saldoDisponible >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center text-xl font-bold flex-shrink-0">
            💳
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corroboración con Factura</span>
            <span class="text-xl sm:text-2xl font-black text-purple-600 mt-1 block">
              ${itemsConFactura} / ${presupuestoItems.length || 0}
            </span>
            <span class="text-[10px] text-purple-700 font-bold block mt-0.5">Comprobantes adjuntos</span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
            🧾
          </div>
        </div>

      </div>

      <!-- TABLA DETALLADA DE RUBROS Y FACTURAS -->
      <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>📋 Detalle de Rubros Presupuestales y Comprobantes de Compra</span>
            </h3>
            <p class="text-xs text-slate-500">
              Cada gasto ejecutado debe contar con su factura electrónica o recibo contable adjunto para su debida auditoría.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <input type="text" id="filtro-busqueda-presupuesto" placeholder="Buscar rubro o proveedor..." class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>
        </div>

        <!-- LISTADO DE ÍTEMS -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200 tracking-wider">
              <tr>
                <th class="py-3 px-3">Código</th>
                <th class="py-3 px-4">Rubro / Actividad</th>
                <th class="py-3 px-3">Categoría</th>
                <th class="py-3 px-3 text-right">Presupuestado</th>
                <th class="py-3 px-3 text-right">Ejecutado</th>
                <th class="py-3 px-3 text-center">Estado</th>
                <th class="py-3 px-4 text-center">Factura / Soporte</th>
                <th class="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="tabla-body-presupuesto" class="divide-y divide-slate-100">
              ${presupuestoItems.length === 0 ? `
                <tr>
                  <td colspan="8" class="text-center py-10 text-slate-400">
                    <span class="text-2xl block mb-1">💸</span>
                    No se han registrado rubros presupuestales para la vigencia ${anioActivo}.<br>
                    <button onclick="window.abrirModalNuevoRubroPresupuesto()" class="mt-3 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition text-xs">
                      + Crear Primer Rubro
                    </button>
                  </td>
                </tr>
              ` : presupuestoItems.map((it, idx) => {
                const catObj = CATEGORIAS_PRESUPUESTO.find(c => c.id === it.categoria) || CATEGORIAS_PRESUPUESTO[0];
                const porcentaje = it.valorPresupuestado > 0 ? Math.round((it.valorEjecutado / it.valorPresupuestado) * 100) : 0;
                const tieneFactura = !!(it.facturaUrl || it.facturaNombre || it.comprobante);

                return `
                  <tr class="hover:bg-slate-50/70 transition">
                    <td class="py-3 px-3 font-mono font-bold text-slate-600">
                      ${it.codigo || `PRE-${String(idx + 1).padStart(3, '0')}`}
                    </td>
                    <td class="py-3 px-4">
                      <strong class="text-slate-900 block font-bold">${it.nombre}</strong>
                      <span class="text-[10px] text-slate-400 block">${it.descripcion || 'Sin descripción adicional'}</span>
                    </td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-${catObj.color}-50 text-${catObj.color}-700 border border-${catObj.color}-200 whitespace-nowrap">
                        ${catObj.nombre.split('.')[1] || catObj.nombre}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      ${formatCOP(it.valorPresupuestado)}
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold ${it.valorEjecutado > 0 ? 'text-emerald-700' : 'text-slate-400'}">
                      ${formatCOP(it.valorEjecutado)}
                      ${it.valorEjecutado > 0 ? `<span class="block text-[9px] text-slate-400 font-normal">${porcentaje}%</span>` : ''}
                    </td>
                    <td class="py-3 px-3 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${
                        porcentaje >= 100 ? 'bg-emerald-100 text-emerald-800' :
                        porcentaje > 0 ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-600'
                      }">
                        ${porcentaje >= 100 ? '✓ Ejecutado' : porcentaje > 0 ? '⏳ En curso' : '📅 Proyectado'}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-center">
                      ${tieneFactura ? `
                        <div class="flex items-center justify-center gap-1.5">
                          <button onclick="window.verFacturaPresupuesto('${it.id}')" class="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition" title="Ver Factura o Comprobante Adjunto">
                            <span>🧾</span>
                            <span class="truncate max-w-[120px]">${it.facturaNumero ? `Fact. ${it.facturaNumero}` : (it.facturaNombre || 'Ver Factura')}</span>
                          </button>
                        </div>
                      ` : `
                        <button onclick="window.abrirModalCargarFacturaPresupuesto('${it.id}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition mx-auto">
                          <span>📎</span>
                          <span>Adjuntar Factura</span>
                        </button>
                      `}
                    </td>
                    <td class="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                      <button onclick="window.abrirModalCargarFacturaPresupuesto('${it.id}')" class="p-1.5 text-slate-400 hover:text-emerald-600 transition" title="Registrar Ejecución & Factura">
                        💵
                      </button>
                      <button onclick="window.abrirModalEditarRubroPresupuesto('${it.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 transition" title="Editar Rubro">
                        ✏️
                      </button>
                      <button onclick="window.eliminarRubroPresupuesto('${it.id}')" class="p-1.5 text-slate-400 hover:text-red-500 transition" title="Eliminar">
                        🗑️
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  `;

  // Asignar listeners
  document.getElementById('btn-nuevo-rubro-presupuesto')?.addEventListener('click', () => {
    window.abrirModalNuevoRubroPresupuesto();
  });

  document.getElementById('btn-imprimir-acta-presupuesto')?.addEventListener('click', () => {
    window.generarPdfPresupuesto(empresaActiva.id, anioActivo);
  });
}

// Ventana Modal: Nuevo / Editar Rubro Presupuestal
window.abrirModalNuevoRubroPresupuesto = function(itemId = null) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const anioActivo = store.getAnioActivo ? store.getAnioActivo() : new Date().getFullYear();

  const item = itemId ? (store.getBudgetItems(empresaActiva.id, anioActivo).find(i => i.id === itemId) || {}) : {};

  const modalId = 'modal-presupuesto-rubro';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn';
  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto flex flex-col">
      <div class="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">💰</span>
          <div>
            <h3 class="text-base font-black text-white">${itemId ? 'Editar Rubro Presupuestal' : 'Nuevo Rubro Presupuestal'}</h3>
            <p class="text-xs text-indigo-200">${empresaActiva.razonSocial} • Vigencia ${anioActivo}</p>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold p-1">&times;</button>
      </div>

      <form id="form-presupuesto-rubro" class="p-6 space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Nombre del Rubro / Actividad *</label>
          <input type="text" id="pres-nombre" required value="${item.nombre || ''}" placeholder="Ej. Dotación semestral de calzado de seguridad" class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Categoría del SG-SST *</label>
            <select id="pres-categoria" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500">
              ${CATEGORIAS_PRESUPUESTO.map(c => `
                <option value="${c.id}" ${item.categoria === c.id ? 'selected' : ''}>${c.nombre}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Valor Presupuestado ($ COP) *</label>
            <input type="number" id="pres-valor-presupuestado" required min="0" step="1000" value="${item.valorPresupuestado || ''}" placeholder="Ej. 3500000" class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mes Programado</label>
            <select id="pres-mes" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500">
              ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => `
                <option value="${m}" ${item.mes === m ? 'selected' : ''}>${m}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Responsable</label>
            <input type="text" id="pres-responsable" value="${item.responsable || 'Coordinador SST / Gerencia'}" class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Descripción / Justificación Técnica</label>
          <textarea id="pres-descripcion" rows="2" placeholder="Detalles de la adquisición, cotización previa o estándar que soporta el gasto..." class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500">${item.descripcion || ''}</textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
            Cancelar
          </button>
          <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition">
            Guardar Rubro
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  document.getElementById('form-presupuesto-rubro').addEventListener('submit', (e) => {
    e.preventDefault();
    const dataToSave = {
      id: itemId || `pres-${Date.now()}`,
      empresaId: empresaActiva.id,
      year: anioActivo,
      nombre: document.getElementById('pres-nombre').value.trim(),
      categoria: document.getElementById('pres-categoria').value,
      valorPresupuestado: Number(document.getElementById('pres-valor-presupuestado').value) || 0,
      valorEjecutado: item.valorEjecutado || 0,
      mes: document.getElementById('pres-mes').value,
      responsable: document.getElementById('pres-responsable').value.trim(),
      descripcion: document.getElementById('pres-descripcion').value.trim(),
      facturaUrl: item.facturaUrl || null,
      facturaNombre: item.facturaNombre || null,
      facturaNumero: item.facturaNumero || null,
      proveedor: item.proveedor || null,
      fechaEjecucion: item.fechaEjecucion || null,
      updatedAt: new Date().toISOString()
    };

    store.saveBudgetItem(dataToSave);
    modalEl.remove();
    renderBudget();
  });
};

window.abrirModalEditarRubroPresupuesto = function(itemId) {
  window.abrirModalNuevoRubroPresupuesto(itemId);
};

// Modal para Cargar / Registrar Ejecución y Factura
window.abrirModalCargarFacturaPresupuesto = function(itemId) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const anioActivo = store.getAnioActivo ? store.getAnioActivo() : new Date().getFullYear();
  const item = store.getBudgetItems(empresaActiva.id, anioActivo).find(i => i.id === itemId);
  if (!item) return;

  const modalId = 'modal-cargar-factura-presupuesto';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn';
  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto flex flex-col">
      <div class="bg-gradient-to-r from-purple-900 to-indigo-950 p-5 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🧾</span>
          <div>
            <h3 class="text-base font-black text-white">Registrar Ejecución & Factura</h3>
            <p class="text-xs text-purple-200 truncate max-w-xs">${item.nombre}</p>
          </div>
        </div>
        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold p-1">&times;</button>
      </div>

      <form id="form-factura-presupuesto" class="p-6 space-y-4">
        
        <div class="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-xs text-purple-900">
          <span>Presupuesto Proyectado: <strong>$${new Intl.NumberFormat('es-CO').format(item.valorPresupuestado)}</strong></span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Monto Real Ejecutado ($ COP) *</label>
            <input type="number" id="fact-monto" required min="0" step="1000" value="${item.valorEjecutado || item.valorPresupuestado}" class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Número de Factura / Recibo *</label>
            <input type="text" id="fact-numero" required value="${item.facturaNumero || ''}" placeholder="Ej. FE-84920" class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Proveedor / Contratista *</label>
            <input type="text" id="fact-proveedor" required value="${item.proveedor || ''}" placeholder="Ej. Dotaciones Industriales S.A.S." class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Fecha de Factura / Pago *</label>
            <input type="date" id="fact-fecha" required value="${item.fechaEjecucion || new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Archivo de la Factura o Comprobante (PDF / Imagen)</label>
          <div class="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative">
            <input type="file" id="fact-file" accept=".pdf,.png,.jpg,.jpeg" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
            <span class="text-2xl block mb-1">📎</span>
            <span id="fact-file-name" class="text-xs font-bold text-indigo-600 block">
              ${item.facturaNombre ? `Archivo cargado: ${item.facturaNombre}` : 'Selecciona o arrastra el archivo aquí'}
            </span>
            <span class="text-[10px] text-slate-400">PDF, PNG, JPG (Máx. 10MB)</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
            Cancelar
          </button>
          <button type="submit" class="px-5 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-black shadow-md transition">
            Guardar y Corroborar Gasto
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  const fileInput = document.getElementById('fact-file');
  const fileNameDisplay = document.getElementById('fact-file-name');
  let selectedBase64 = item.facturaUrl || null;
  let selectedFileName = item.facturaNombre || null;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedFileName = file.name;
      fileNameDisplay.textContent = `Archivo seleccionado: ${file.name}`;
      const reader = new FileReader();
      reader.onload = (evt) => {
        selectedBase64 = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('form-factura-presupuesto').addEventListener('submit', (e) => {
    e.preventDefault();
    item.valorEjecutado = Number(document.getElementById('fact-monto').value) || 0;
    item.facturaNumero = document.getElementById('fact-numero').value.trim();
    item.proveedor = document.getElementById('fact-proveedor').value.trim();
    item.fechaEjecucion = document.getElementById('fact-fecha').value;
    if (selectedBase64) {
      item.facturaUrl = selectedBase64;
      item.facturaNombre = selectedFileName;
    }
    item.updatedAt = new Date().toISOString();

    store.saveBudgetItem(item);
    modalEl.remove();
    renderBudget();
  });
};

// Ver Factura en Modal
window.verFacturaPresupuesto = function(itemId) {
  const empresaActiva = store.getEmpresaActiva();
  if (!empresaActiva) return;
  const anioActivo = store.getAnioActivo ? store.getAnioActivo() : new Date().getFullYear();
  const item = store.getBudgetItems(empresaActiva.id, anioActivo).find(i => i.id === itemId);
  if (!item) return;

  const modalId = 'modal-visor-factura';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const isPdf = item.facturaUrl && (item.facturaUrl.includes('application/pdf') || (item.facturaNombre || '').endsWith('.pdf'));

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn';
  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
      <div class="bg-slate-900 p-4 text-white flex items-center justify-between">
        <div>
          <h3 class="text-sm font-black text-white">Factura: ${item.facturaNumero || 'Comprobante de Compra'}</h3>
          <p class="text-xs text-slate-300">${item.proveedor || 'Proveedor'} • $${new Intl.NumberFormat('es-CO').format(item.valorEjecutado)} COP</p>
        </div>
        <div class="flex items-center gap-2">
          ${item.facturaUrl ? `
            <a href="${item.facturaUrl}" download="${item.facturaNombre || 'factura.pdf'}" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold">
              Descargar
            </a>
          ` : ''}
          <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-xl font-bold p-1">&times;</button>
        </div>
      </div>
      <div class="p-4 flex-1 overflow-y-auto bg-slate-100 flex items-center justify-center min-h-[300px]">
        ${item.facturaUrl ? (
          isPdf ? `
            <iframe src="${item.facturaUrl}" class="w-full h-[500px] rounded-xl border border-slate-300"></iframe>
          ` : `
            <img src="${item.facturaUrl}" alt="Factura" class="max-w-full max-h-[500px] rounded-xl object-contain shadow-md">
          `
        ) : `
          <div class="text-center text-slate-400">
            <span class="text-4xl block mb-2">🧾</span>
            <p class="text-xs font-bold">Factura Registrada Contablemente</p>
            <p class="text-[11px]">Número: ${item.facturaNumero} • Proveedor: ${item.proveedor}</p>
          </div>
        `}
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
};

// Eliminar Rubro
window.eliminarRubroPresupuesto = function(itemId) {
  if (confirm('¿Estás seguro de eliminar este rubro presupuestal?')) {
    store.deleteBudgetItem(itemId);
    renderBudget();
  }
};

// Generar PDF Oficial del Presupuesto
window.generarPdfPresupuesto = function(empresaId, year) {
  const empresa = store.getEmpresa(empresaId) || store.getEmpresaActiva();
  const items = store.getBudgetItems(empresaId, year);
  const totalPresupuesto = items.reduce((acc, it) => acc + (Number(it.valorPresupuestado) || 0), 0);
  const totalEjecutado = items.reduce((acc, it) => acc + (Number(it.valorEjecutado) || 0), 0);
  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  const cleanDocTitle = `Acta Oficial de Presupuesto SG-SST ${year} - ${empresa.razonSocial || 'Empresa'}`.replace(/"/g, '&quot;');
  const fileDownloadName = `Acta_Presupuesto_SGSST_${year}_${(empresa.razonSocial || 'Empresa').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const win = window.open('', '_blank');
  if (!win) {
    alert("Por favor habilita las ventanas emergentes (popups) para visualizar e imprimir el Acta de Presupuesto.");
    return;
  }

  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
      <title>${cleanDocTitle}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <style>
        :root {
          --sat: max(env(safe-area-inset-top, 0px), 44px);
          --sab: max(env(safe-area-inset-bottom, 0px), 16px);
        }
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          color: #1e293b; 
          background: #f8fafc;
          padding: calc(var(--sat) + 58px) 16px max(var(--sab), 24px) 16px; 
          margin: 0;
          font-size: 11px; 
        }
        .doc-control-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999999;
          background: #0b1a2d;
          color: #ffffff;
          padding-top: var(--sat);
          padding-bottom: 12px;
          padding-left: 14px;
          padding-right: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          border-bottom: 1px solid #1e293b;
        }
        .btn-back {
          padding: 8px 14px;
          background: #1e293b;
          color: #f1f5f9;
          border: 1px solid #334155;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s ease;
          touch-action: manipulation;
        }
        .btn-back:hover, .btn-back:active { background: #334155; color: #ffffff; }
        .doc-bar-actions { display: flex; align-items: center; gap: 8px; }
        .btn-download {
          padding: 8px 14px;
          background: #0d9488;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.35);
          transition: background 0.15s ease;
          touch-action: manipulation;
        }
        .btn-download:hover, .btn-download:active { background: #0f766e; }
        .btn-download:disabled { opacity: 0.6; cursor: wait; }
        .btn-print { 
          padding: 8px 14px; 
          background: #4338ca; 
          color: white; 
          border: none; 
          border-radius: 10px; 
          font-weight: 700; 
          cursor: pointer; 
          font-size: 12px; 
          display: inline-flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 2px 6px rgba(67, 56, 202, 0.3); 
          transition: background 0.15s ease;
          touch-action: manipulation;
        }
        .btn-print:hover, .btn-print:active { background: #3730a3; }
        .doc-wrapper {
          max-width: 860px;
          margin: 0 auto;
          background: #ffffff;
          padding: 30px;
          border-radius: 14px;
          box-shadow: 0 4px 18px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
        }
        .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .title { font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0; }
        .meta { font-size: 10px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
        th { background-color: #f1f5f9; font-weight: 800; text-align: left; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
        .sig-box { width: 45%; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 10px; text-align: center; }
        @media print { 
          body { padding: 0 !important; background: #ffffff !important; }
          .no-print, .doc-control-bar { display: none !important; } 
          .doc-wrapper { max-width: 100% !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
          @page { margin: 1cm; size: letter; }
        }
      </style>
    </head>
    <body>
      <div class="doc-control-bar no-print">
        <button type="button" class="btn-back" onclick="regresarAlPortal()">
          <span>←</span>
          <span>Volver al Portal</span>
        </button>
        <div class="doc-bar-actions">
          <button type="button" id="btn-descargar-pdf" class="btn-download" onclick="descargarDocumentoPDF()">
            <span>📥</span>
            <span>Descargar PDF</span>
          </button>
          <button type="button" class="btn-print" onclick="window.print()">
            <span>🖨️</span>
            <span>Imprimir</span>
          </button>
        </div>
      </div>
      <div class="doc-wrapper">
        <div id="documento-imprimible">
          <div class="header">
            <div>
              <h1 class="title">ACTA DE ASIGNACIÓN Y SEGUIMIENTO PRESUPUESTAL SG-SST</h1>
              <p class="meta">Resolución 0312 de 2019 (Estándar 1.1.2) • Decreto 1072 de 2015 Art. 2.2.4.6.17</p>
              <p class="meta">Empresa: <strong>${empresa.razonSocial}</strong> • NIT: ${empresa.nit} • Vigencia: ${year}</p>
            </div>
          </div>

      <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-around;">
        <div>Presupuesto Total: <strong>${formatCOP(totalPresupuesto)}</strong></div>
        <div>Total Ejecutado: <strong>${formatCOP(totalEjecutado)}</strong></div>
        <div>Cumplimiento: <strong>${totalPresupuesto > 0 ? Math.round((totalEjecutado / totalPresupuesto) * 100) : 0}%</strong></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Rubro Presupuestal</th>
            <th>Categoría</th>
            <th>Mes</th>
            <th class="text-right">Presupuestado</th>
            <th class="text-right">Ejecutado</th>
            <th>Comprobante Factura</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, idx) => `
            <tr>
              <td>${it.codigo || `PRE-${String(idx + 1).padStart(3, '0')}`}</td>
              <td><strong>${it.nombre}</strong></td>
              <td>${it.categoria}</td>
              <td>${it.mes || '-'}</td>
              <td class="text-right">${formatCOP(it.valorPresupuestado)}</td>
              <td class="text-right">${formatCOP(it.valorEjecutado)}</td>
              <td>${it.facturaNumero ? `Fact. ${it.facturaNumero} (${it.proveedor || ''})` : 'Pendiente'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          <p><strong>REPRESENTANTE LEGAL / GERENCIA</strong></p>
          <p>${empresa.representanteLegal || 'Gerente General'}</p>
          <p>C.C. ___________________</p>
        </div>
        <div class="sig-box">
          <p><strong>RESPONSABLE DEL SG-SST</strong></p>
          <p>Consultor / Especialista SST</p>
          <p>Licencia SST No. 6514 / MinSalud</p>
        </div>
      </div>
        </div>
      </div>

      <script>
        function regresarAlPortal() {
          try {
            if (window.opener && !window.opener.closed) {
              window.close();
              return;
            }
          } catch(e) {}
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = './index.html';
          }
        }

        async function descargarDocumentoPDF() {
          const btn = document.getElementById('btn-descargar-pdf');
          const orig = btn ? btn.innerHTML : '';
          if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳ Generando PDF...</span>'; }
          const el = document.getElementById('documento-imprimible');
          const cleanName = '${fileDownloadName}' + '.pdf';
          if (typeof html2pdf !== 'undefined' && el) {
            const opt = {
              margin: [10, 10, 10, 10],
              filename: cleanName,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
            };
            try {
              const pdfBlob = await html2pdf().set(opt).from(el).outputPdf('blob');
              const pdfFile = new File([pdfBlob], cleanName, { type: 'application/pdf' });
              if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                try {
                  await navigator.share({
                    files: [pdfFile],
                    title: '${cleanDocTitle}',
                    text: 'Acta Oficial Presupuesto SG-SST'
                  });
                  if (btn) { btn.disabled = false; btn.innerHTML = '<span>✓ ¡Guardado!</span>'; setTimeout(() => btn.innerHTML = orig, 2500); }
                  return;
                } catch(e) {
                  if (e.name === 'AbortError') { if (btn) { btn.disabled = false; btn.innerHTML = orig; } return; }
                }
              }
              const blobUrl = URL.createObjectURL(pdfBlob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = cleanName;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 1500);
              if (btn) { btn.disabled = false; btn.innerHTML = '<span>✓ ¡Descargado!</span>'; setTimeout(() => btn.innerHTML = orig, 2500); }
            } catch(e) {
              console.warn('Fallo blob html2pdf:', e);
              if (btn) { btn.disabled = false; btn.innerHTML = orig; }
              window.print();
            }
          } else {
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
            window.print();
          }
        }
      </script>
    </body>
    </html>
  `);
  win.document.close();
};
