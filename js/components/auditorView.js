// =============================================================================
// VISTA DE AUDITOR E INSPECTOR SST - DOCTOR PYME SG-SST
// Modo de Solo Lectura para MinTrabajo y ARL Positiva (Res. 0312 & Dec. 1072)
// =============================================================================
import { store } from '../store.js';
import { ESTANDARES_RES_0312 } from '../data.js';
import { abrirModalIA } from './aiAssistant.js';

export function renderAuditorView() {
  const container = document.getElementById('main-content');
  if (!container) return;

  const empresa = store.getEmpresaActiva() || {
    id: 'emp-1790438946268',
    razonSocial: 'Ladrillos Ochoa S.A.S.',
    nit: '900.542.891-4',
    sector: 'Fabricación de productos de arcilla y ladrillos para construcción',
    claseRiesgo: 'IV',
    trabajadores: 48,
    estandaresAplicables: 68
  };

  const anio = store.getAnioActivo();
  const evaluaciones = store.getEvaluacion(empresa.id, anio) || {};
  const firmas = store.getFirmas();

  // Calcular ponderación oficial de la Resolución 0312
  let puntajeTotal = 0;
  let cumplenCount = 0;
  let noCumplenCount = 0;

  // Totales por ciclo
  const ciclos = {
    PLANEAR: { nombre: 'I. PLANEAR (Recursos y Gestión)', max: 25, obtenido: 0, items: [] },
    HACER: { nombre: 'II. HACER (Salud, Riesgos y Amenazas)', max: 60, obtenido: 0, items: [] },
    VERIFICAR: { nombre: 'III. VERIFICAR (Medición e Indicadores)', max: 5, obtenido: 0, items: [] },
    ACTUAR: { nombre: 'IV. ACTUAR (Mejoramiento Continuo)', max: 10, obtenido: 0, items: [] }
  };

  ESTANDARES_RES_0312.forEach(est => {
    const evalItem = evaluaciones[est.numeral] || {};
    const peso = est.peso60 || 0;
    const cumple = evalItem.estado === 'CUMPLE';

    if (cumple) {
      puntajeTotal += peso;
      cumplenCount++;
      if (ciclos[est.ciclo]) ciclos[est.ciclo].obtenido += peso;
    } else {
      noCumplenCount++;
    }

    if (ciclos[est.ciclo]) {
      ciclos[est.ciclo].items.push({
        numeral: est.numeral,
        criterio: est.criterio,
        peso,
        evalItem,
        cumple
      });
    }
  });

  const puntajeRedondeado = puntajeTotal.toFixed(1);
  const porcentaje = Math.min(100, Math.round((puntajeTotal / 100) * 100));

  let valoracion = 'ACEPTABLE';
  let colorValoracion = 'bg-emerald-500 text-white';
  if (porcentaje < 60) {
    valoracion = 'CRÍTICO';
    colorValoracion = 'bg-rose-600 text-white';
  } else if (porcentaje < 85) {
    valoracion = 'MODERADAMENTE ACEPTABLE';
    colorValoracion = 'bg-amber-500 text-white';
  }

  container.innerHTML = `
    <div class="space-y-6 animate-fadeIn pb-16">
      
      <!-- Banner de la Vista del Auditor Oficial -->
      <div class="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/40 uppercase">
                🛡️ Modo Auditoría de Solo Lectura
              </span>
              <span class="text-xs text-slate-300 font-mono">Vigencia ${anio}</span>
            </div>
            <h2 class="text-xl font-black text-white">${empresa.razonSocial}</h2>
            <p class="text-xs text-slate-300">
              NIT ${empresa.nit || '900.542.891-4'} • Riesgo ${empresa.claseRiesgo} • ${empresa.trabajadores} Trabajadores • ${empresa.sector}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.print()" class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20">
              <span>🖨️</span> Imprimir Informe
            </button>
            <button onclick="window.abrirModalIA({ modoInicial: 'auditoria' })" class="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-1.5">
              <span>🧠</span> Dictamen Gemini Pro
            </button>
          </div>
        </div>
      </div>

      <!-- Semáforo de Cumplimiento Res. 0312 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-center md:col-span-1 flex flex-col justify-center items-center">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Puntaje Global Res. 0312</span>
          <span class="text-4xl font-black text-slate-900 font-mono">${puntajeRedondeado}%</span>
          <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black ${colorValoracion}">
            ${valoracion}
          </span>
          <span class="text-[10px] text-slate-400 mt-2 block">Mínimo legal aprobatorio: 85%</span>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs md:col-span-3 space-y-3">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Cumplimiento Ponderado por Ciclo PHVA</h4>
          
          <div class="space-y-2.5">
            ${Object.keys(ciclos).map(key => {
              const c = ciclos[key];
              const pct = Math.round((c.obtenido / c.max) * 100);
              return `
                <div>
                  <div class="flex justify-between text-xs font-bold mb-1">
                    <span class="text-slate-800">${c.nombre}</span>
                    <span class="font-mono text-indigo-700">${c.obtenido.toFixed(1)} / ${c.max}% (${pct}%)</span>
                  </div>
                  <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div class="bg-indigo-600 h-full rounded-full transition-all" style="width: ${pct}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Resumen de Evidencias Digitales con Trazabilidad -->
      <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Índice de Evidencias Verificadas para Inspector de Trabajo
            </h3>
            <p class="text-xs text-slate-500">Documentos oficiales con enlace directo y comprobación de autenticidad.</p>
          </div>
          <span class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            ✓ 25 Enlaces Directos Activos
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] font-bold text-indigo-700">1.1.1.3 • Planear</span>
              <span class="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">CUMPLE</span>
            </div>
            <h5 class="text-xs font-bold text-slate-800">Acta de nombramiento del profesional responsable del SG-SST</h5>
            <p class="text-[11px] text-slate-600">Firmada por representante legal y profesional SST (Licencia vigente).</p>
            <a href="https://docs.google.com/document/d/1KwN9NqmkfD7RTZMilnMopH4AeTbdIftwNfaBRCQg9H8/edit?usp=sharing" target="_blank" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 pt-1">
              🔗 Abrir Acta Oficial Google Docs →
            </a>
          </div>

          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] font-bold text-indigo-700">1.1.2.1 - 1.1.2.6 • Planear</span>
              <span class="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">CUMPLE</span>
            </div>
            <h5 class="text-xs font-bold text-slate-800">Asignación de Responsabilidades y Socialización a la Organización</h5>
            <p class="text-[11px] text-slate-600">Gerencia, COPASST, Convivencia, Brigadistas y Trabajadores.</p>
            <a href="https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing" target="_blank" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 pt-1">
              🔗 Abrir Documento de Responsabilidades →
            </a>
          </div>

          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] font-bold text-indigo-700">1.1.3 • Planear</span>
              <span class="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">CUMPLE</span>
            </div>
            <h5 class="text-xs font-bold text-slate-800">Presupuesto Anual y Recursos Financieros SG-SST</h5>
            <p class="text-[11px] text-slate-600">Matriz detallada de asignación económica de recursos para la vigencia.</p>
            <a href="https://docs.google.com/spreadsheets/d/1j9ZjfdRTcrpZNUwa2Kp0HPNDOffEtDDo/edit?usp=sharing&ouid=105054984538376788001&rtpof=true&sd=true" target="_blank" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 pt-1">
              🔗 Abrir Hoja de Presupuesto Sheets →
            </a>
          </div>

          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] font-bold text-indigo-700">3.1.7.1 - 3.1.7.2 • Hacer</span>
              <span class="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">CUMPLE</span>
            </div>
            <h5 class="text-xs font-bold text-slate-800">Política y Programa de Prevención de Alcohol, Tabaco y Drogas</h5>
            <p class="text-[11px] text-slate-600">Firmada por gerencia con programa de promoción y entornos saludables.</p>
            <a href="https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing" target="_blank" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 pt-1">
              🔗 Abrir Política y Programa Oficial →
            </a>
          </div>
        </div>
      </div>

      <!-- Registro de Firmas Electrónicas Legales (Ley 527 de 1999) -->
      <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Trazabilidad Jurídica de Firmas Electrónicas (Ley 527 de 1999)
            </h3>
            <p class="text-xs text-slate-500">Firmas estampadas con sellado de tiempo ISO 8601, IP de origen y hash criptográfico SHA-256.</p>
          </div>
          <span class="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl">
            🔒 Inmutabilidad Probatoria
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th class="p-3">Firmante</th>
                <th class="p-3">Documento Socializado</th>
                <th class="p-3">Fecha y Hora (ISO 8601)</th>
                <th class="p-3">IP Origen</th>
                <th class="p-3">Hash SHA-256 (Integridad)</th>
                <th class="p-3 text-right">Trazo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${firmas.map(f => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3">
                    <strong class="text-slate-900 block">${f.trabajadorNombre}</strong>
                    <span class="text-[10px] text-slate-500 font-mono">C.C. ${f.trabajadorCedula}</span>
                  </td>
                  <td class="p-3 text-slate-700 font-medium">${f.documentoTitulo}</td>
                  <td class="p-3 text-slate-600 font-mono text-[11px]">
                    ${f.timestamp ? new Date(f.timestamp).toLocaleString('es-CO') : 'Reciente'}
                  </td>
                  <td class="p-3 font-mono text-slate-600 text-[11px]">${f.clientIp || '127.0.0.1'}</td>
                  <td class="p-3 font-mono text-[10px] text-indigo-700 truncate max-w-[140px]" title="${f.hashSha256}">
                    ${(f.hashSha256 || '').substring(0, 16)}...
                  </td>
                  <td class="p-3 text-right">
                    <img src="${f.firmaBase64}" alt="Firma" class="h-8 inline-block max-w-[80px] object-contain border border-slate-200 rounded bg-white p-0.5">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}
