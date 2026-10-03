// =============================================================================
// COMPONENTE: DASHBOARD (CUADRO DE MANDO) - DOCTOR PYME
// Incluye visualización de Estructura Organizacional y Enfoque por Procesos
// =============================================================================
import { store } from '../store.js';
import { obtenerEstandaresPorGrupo, calcularPuntaje } from '../standards.js';
import { evidenceDB } from '../db.js';

export function renderDashboard() {
  const container = document.getElementById('main-content');
  const empresaActiva = store.getEmpresaActiva();
  const empresas = store.getEmpresas();

  if (!empresaActiva) {
    // Vista Multi-Empresa General
    renderMultiCompanyDashboard(container, empresas);
    return;
  }

  // Vista Detallada de la Empresa Activa
  const anioActivo = store.getAnioActivo();
  const estandares = obtenerEstandaresPorGrupo(empresaActiva.estandaresAplicables);
  const evaluacion = store.getEvaluacion(empresaActiva.id, anioActivo);
  const resultadoEval = calcularPuntaje(evaluacion, estandares);
  const matriz = store.getMatriz(empresaActiva.id);
  const plan = store.getPlanTrabajo(empresaActiva.id);
  const accidentes = store.getAccidentes(empresaActiva.id);

  // Métricas GTC 45
  const riesgosI = matriz.filter(m => m.interpretacionNR === 'I').length;
  const riesgosII = matriz.filter(m => m.interpretacionNR === 'II').length;
  const riesgosIII = matriz.filter(m => m.interpretacionNR === 'III').length;
  const riesgosIV = matriz.filter(m => m.interpretacionNR === 'IV').length;

  // Métricas PAT
  const actTotal = plan.length;
  const actEjecutadas = plan.filter(p => p.estado === 'Ejecutada').length;
  const porcentajePAT = actTotal > 0 ? Math.round((actEjecutadas / actTotal) * 100) : 0;

  // Métricas Accidentes
  const totalAccidentes = accidentes.length;
  const diasPerdidos = accidentes.reduce((acc, curr) => acc + (parseInt(curr.diasIncapacidad, 10) || 0), 0);

  // Clases según semáforo
  const badgeClasses = {
    red: 'bg-red-100 text-red-800 border-red-300',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    green: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  };

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado de la Empresa Activa -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-slate-800">${empresaActiva.razonSocial}</h1>
                <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Activa
                </span>
              </div>
              <p class="text-sm text-slate-500 mt-0.5">NIT: ${empresaActiva.nit} • ARL: ${empresaActiva.arl} • Sector: ${empresaActiva.sector}</p>
            </div>
          </div>
        </div>
        
        <div class="flex flex-wrap items-center gap-3">
          <div class="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
            Riesgo: Clase ${empresaActiva.claseRiesgo}
          </div>
          <div class="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
            ${empresaActiva.trabajadores} Trabajadores
          </div>
          <div class="px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold border border-indigo-200">
            Aplica a: ${empresaActiva.estandaresAplicables} Estándares Mínimos
          </div>
          <button onclick="window.location.hash='#evaluacion'" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            Auditar Ahora
          </button>
        </div>
      </div>

      <!-- Tarjetas de Métricas Principales (KPIs) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <!-- KPI 1: Estándares Mínimos -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs font-bold tracking-wider uppercase text-slate-400">Res. 0312 (Vigencia ${anioActivo})</p>
              <h3 class="text-2xl font-extrabold text-slate-800 mt-1">${resultadoEval.puntaje}%</h3>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-extrabold border ${badgeClasses[resultadoEval.colorBadge]}">
              ${resultadoEval.estadoLegal}
            </span>
          </div>
          
          <div class="w-full bg-slate-100 rounded-full h-2.5 mt-3">
            <div class="h-2.5 rounded-full transition-all duration-500 ${resultadoEval.colorBadge === 'green' ? 'bg-emerald-500' : resultadoEval.colorBadge === 'amber' ? 'bg-amber-500' : 'bg-red-500'}" style="width: ${resultadoEval.puntaje}%"></div>
          </div>
          
          <p class="text-xs text-slate-500 mt-3 flex justify-between items-center text-[11px]">
            <span>Cumple: <strong class="text-emerald-700">${resultadoEval.cumpleCount}</strong></span>
            <span>No Aplica: <strong class="text-slate-700">${resultadoEval.noAplicaCount}</strong></span>
            <span>No Cumple: <strong class="text-red-600">${resultadoEval.noCumpleCount}</strong></span>
          </p>
        </div>

        <!-- KPI 2: Matriz GTC 45 Peligros -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs font-bold tracking-wider uppercase text-slate-400">Peligros GTC 45</p>
              <h3 class="text-2xl font-extrabold text-slate-800 mt-1">${matriz.length} Identificados</h3>
            </div>
            <span class="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </span>
          </div>

          <div class="grid grid-cols-4 gap-1 text-center mt-3 pt-2 border-t border-slate-100">
            <div class="bg-red-50 text-red-700 rounded py-1">
              <div class="text-xs font-bold">N-I</div>
              <div class="text-sm font-extrabold">${riesgosI}</div>
            </div>
            <div class="bg-orange-50 text-orange-700 rounded py-1">
              <div class="text-xs font-bold">N-II</div>
              <div class="text-sm font-extrabold">${riesgosII}</div>
            </div>
            <div class="bg-amber-50 text-amber-700 rounded py-1">
              <div class="text-xs font-bold">N-III</div>
              <div class="text-sm font-extrabold">${riesgosIII}</div>
            </div>
            <div class="bg-emerald-50 text-emerald-700 rounded py-1">
              <div class="text-xs font-bold">N-IV</div>
              <div class="text-sm font-extrabold">${riesgosIV}</div>
            </div>
          </div>
          <p class="text-xs text-slate-400 mt-2 text-right"><span class="text-red-600 font-semibold">${riesgosI} críticos</span> que requieren intervención</p>
        </div>

        <!-- KPI 3: Plan Anual de Trabajo -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs font-bold tracking-wider uppercase text-slate-400">Plan Anual (PAT)</p>
              <h3 class="text-2xl font-extrabold text-slate-800 mt-1">${porcentajePAT}%</h3>
            </div>
            <span class="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </span>
          </div>

          <div class="w-full bg-slate-100 rounded-full h-2.5 mt-3">
            <div class="h-2.5 rounded-full bg-blue-600 transition-all duration-500" style="width: ${porcentajePAT}%"></div>
          </div>

          <p class="text-xs text-slate-500 mt-3 flex justify-between">
            <span>Ejecutadas: <strong>${actEjecutadas}</strong></span>
            <span>Total programadas: <strong>${actTotal}</strong></span>
          </p>
        </div>

        <!-- KPI 4: Accidentabilidad ATEL -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs font-bold tracking-wider uppercase text-slate-400">Eventos ATEL</p>
              <h3 class="text-2xl font-extrabold text-slate-800 mt-1">${totalAccidentes}</h3>
            </div>
            <span class="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
          </div>

          <div class="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Días de incapacidad:</span>
            <span class="font-bold text-slate-800 text-sm">${diasPerdidos} días</span>
          </div>
          <div class="mt-2 flex items-center justify-between text-xs text-slate-600">
            <span>Tasa de investigación:</span>
            <span class="font-bold text-emerald-600">100% investigados</span>
          </div>
        </div>
      </div>

      <!-- NUEVA SECCIÓN: ESTRUCTURA ORGANIZACIONAL Y ENFOQUE POR PROCESOS (DECRETO 1072 & GTC 45) -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Enfoque Integral SG-SST
              </span>
              <span class="text-xs text-slate-300">•</span>
              <span class="text-xs text-slate-500 font-medium">Decreto 1072 Art. 2.2.4.6.8 & GTC 45:2012</span>
            </div>
            <h2 class="text-xl font-bold text-slate-800 mt-1">Estructura Organizacional y Enfoque por Procesos</h2>
            <p class="text-xs text-slate-500">Visualiza la arquitectura de procesos y la cadena de mando para la asignación de responsabilidades en SST.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.editarEmpresa('${empresaActiva.id}')" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              Actualizar Diagramas
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Tarjeta 1: Mapa de Procesos -->
          <div class="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition">
            <div class="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-lg">🗺️</span>
                <div>
                  <h3 class="font-bold text-sm text-slate-800">Mapa General de Procesos</h3>
                  <p class="text-[11px] text-slate-500">Estratégicos • Misionales / Operativos • Apoyo</p>
                </div>
              </div>
              <button onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'mapa_procesos')" class="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition flex items-center gap-1">
                Ampliar ↗
              </button>
            </div>

            <div class="p-4 flex-1 flex flex-col justify-center items-center cursor-pointer group" onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'mapa_procesos')">
              <div class="w-full h-52 bg-white rounded-lg border border-slate-200 overflow-hidden relative shadow-2xs flex items-center justify-center p-2">
                <img id="dashboard-thumb-mapa" src="./assets/sample-mapa-procesos.svg" alt="Mapa de Procesos" class="max-h-full max-w-full object-contain group-hover:scale-[1.02] transition duration-200">
                <div class="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span class="bg-white/95 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 shadow-md flex items-center gap-1.5">
                    🔍 Clic para examinar en detalle
                  </span>
                </div>
              </div>
            </div>

            <div class="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-500 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Vinculado a Matriz GTC 45</span>
              </span>
              <a href="#matriz" class="font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1">
                Ver Peligros por Proceso →
              </a>
            </div>
          </div>

          <!-- Tarjeta 2: Organigrama y Roles SST -->
          <div class="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition">
            <div class="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg">👥</span>
                <div>
                  <h3 class="font-bold text-sm text-slate-800">Organigrama y Estructura SST</h3>
                  <p class="text-[11px] text-slate-500">Dirección • Responsable SST • COPASST/Vigía • Brigada</p>
                </div>
              </div>
              <button onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'organigrama')" class="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition flex items-center gap-1">
                Ampliar ↗
              </button>
            </div>

            <div class="p-4 flex-1 flex flex-col justify-center items-center cursor-pointer group" onclick="window.abrirVisorDiagrama('${empresaActiva.id}', 'organigrama')">
              <div class="w-full h-52 bg-white rounded-lg border border-slate-200 overflow-hidden relative shadow-2xs flex items-center justify-center p-2">
                <img id="dashboard-thumb-organigrama" src="./assets/sample-organigrama.svg" alt="Organigrama" class="max-h-full max-w-full object-contain group-hover:scale-[1.02] transition duration-200">
                <div class="absolute inset-0 bg-blue-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span class="bg-white/95 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 shadow-md flex items-center gap-1.5">
                    🔍 Clic para examinar en detalle
                  </span>
                </div>
              </div>
            </div>

            <div class="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-500 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Roles Decreto 1072 Art. 2.2.4.6.8</span>
              </span>
              <span class="font-medium text-slate-700 truncate max-w-[200px]" title="${empresaActiva.responsableSST || ''}">
                Resp: <strong>${empresaActiva.responsableSST ? empresaActiva.responsableSST.split('-')[0] : 'Sin asignar'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Alerta Legal y Dictamen Normativo -->
      <div class="p-4 rounded-xl border ${resultadoEval.colorBadge === 'red' ? 'bg-red-50 border-red-200 text-red-900' : resultadoEval.colorBadge === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'} flex items-start gap-3">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <div class="font-bold text-sm">Disposición Legal según Resolución 0312 de 2019 (Art. 27 y 28):</div>
          <div class="text-xs mt-0.5 leading-relaxed">${resultadoEval.accionRequerida}</div>
        </div>
      </div>

      <!-- Accesos Rápidos Modulares Estilo AppSheet -->
      <div>
        <h2 class="text-lg font-bold text-slate-800 mb-3">Módulos del Sistema de Gestión</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          
          <a href="#procesos" class="group bg-white p-5 rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg mb-3 group-hover:bg-teal-600 group-hover:text-white transition">
                🗺️
              </div>
              <h3 class="font-bold text-slate-800 group-hover:text-teal-600 transition">Mapa Procesos & Organigrama</h3>
              <p class="text-xs text-slate-500 mt-1">Estructura organizacional, procesos estratégicos, misionales y roles SST (Dec. 1072).</p>
            </div>
            <div class="text-xs font-semibold text-teal-600 mt-4 flex items-center gap-1">
              Ver y Gestionar →
            </div>
          </a>

          <a href="#evaluacion" class="group bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
                0312
              </div>
              <h3 class="font-bold text-slate-800 group-hover:text-indigo-600 transition">Estándares Mínimos</h3>
              <p class="text-xs text-slate-500 mt-1">Autoevaluación legal interactiva, semáforo y plan de mejoramiento reglamentario.</p>
            </div>
            <div class="text-xs font-semibold text-indigo-600 mt-4 flex items-center gap-1">
              Abrir Módulo →
            </div>
          </a>

          <a href="#matriz" class="group bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3 group-hover:bg-amber-600 group-hover:text-white transition">
                GTC
              </div>
              <h3 class="font-bold text-slate-800 group-hover:text-amber-600 transition">Matriz de Riesgos</h3>
              <p class="text-xs text-slate-500 mt-1">Identificación de peligros con calculadora automática GTC 45 y medidas de control.</p>
            </div>
            <div class="text-xs font-semibold text-amber-600 mt-4 flex items-center gap-1">
              Gestionar Peligros →
            </div>
          </a>

          <a href="#plan-trabajo" class="group bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                PAT
              </div>
              <h3 class="font-bold text-slate-800 group-hover:text-blue-600 transition">Plan Anual de Trabajo</h3>
              <p class="text-xs text-slate-500 mt-1">Cronograma de actividades, responsables, recursos y control de ejecución mensual.</p>
            </div>
            <div class="text-xs font-semibold text-blue-600 mt-4 flex items-center gap-1">
              Ver Cronograma →
            </div>
          </a>

          <a href="#accidentes" class="group bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3 group-hover:bg-purple-600 group-hover:text-white transition">
                ATEL
              </div>
              <h3 class="font-bold text-slate-800 group-hover:text-purple-600 transition">Investigación de Accidentes</h3>
              <p class="text-xs text-slate-500 mt-1">Reportes tipo FURAT, análisis de causas (árbol de causas) y seguimiento a incapacidades.</p>
            </div>
            <div class="text-xs font-semibold text-purple-600 mt-4 flex items-center gap-1">
              Gestionar Eventos →
            </div>
          </a>
        </div>
      </div>
    </div>
  `;

  // Cargar imágenes personalizadas de IndexedDB para la empresa activa
  evidenceDB.obtenerDiagramaEmpresa(empresaActiva.id, 'mapa_procesos').then(diag => {
    const thumb = document.getElementById('dashboard-thumb-mapa');
    if (thumb && diag && diag.dataUrl) {
      thumb.src = diag.dataUrl;
    }
  }).catch(() => {});

  evidenceDB.obtenerDiagramaEmpresa(empresaActiva.id, 'organigrama').then(diag => {
    const thumb = document.getElementById('dashboard-thumb-organigrama');
    if (thumb && diag && diag.dataUrl) {
      thumb.src = diag.dataUrl;
    }
  }).catch(() => {});
}

function renderMultiCompanyDashboard(container, empresas) {
  const totalTrabajadores = empresas.reduce((acc, curr) => acc + (parseInt(curr.trabajadores, 10) || 0), 0);

  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-8 text-white">
        <div class="max-w-3xl">
          <span class="px-3 py-1 bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 rounded-full text-xs font-semibold uppercase tracking-wider">
            Panel Multi-Empresa de Consultoría SST • Doctor Pyme
          </span>
          <h1 class="text-3xl font-extrabold mt-3">Sistemas de Gestión de Seguridad y Salud en el Trabajo</h1>
          <p class="text-slate-300 text-sm mt-2 leading-relaxed">
            Administra el cumplimiento normativo (Decreto 1072 de 2015 y Resolución 0312 de 2019) de todas tus empresas clientes con mapas de procesos y organigramas integrados.
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div>
            <div class="text-xs uppercase text-slate-400 font-semibold">Empresas Clientes</div>
            <div class="text-3xl font-extrabold text-white mt-1">${empresas.length}</div>
          </div>
          <div>
            <div class="text-xs uppercase text-slate-400 font-semibold">Trabajadores Cubiertos</div>
            <div class="text-3xl font-extrabold text-indigo-400 mt-1">${totalTrabajadores}</div>
          </div>
          <div>
            <div class="text-xs uppercase text-slate-400 font-semibold">Resolución 0312</div>
            <div class="text-sm font-bold text-slate-200 mt-2">7, 21 y 60 Estándares</div>
          </div>
          <div>
            <div class="text-xs uppercase text-slate-400 font-semibold">Enfoque por Procesos</div>
            <div class="text-sm font-bold text-slate-200 mt-2">GTC 45 + Dec. 1072</div>
          </div>
        </div>
      </div>

      <!-- Directorio de Empresas Clientes con Selección Directa y Diagramas -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">Empresas Asignadas</h2>
            <p class="text-xs text-slate-500">Selecciona una empresa para gestionar su SG-SST o consulta sus diagramas directamente.</p>
          </div>
          <button onclick="window.location.hash='#empresas'" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Agregar Nueva Empresa
          </button>
        </div>

        <div class="divide-y divide-slate-100">
          ${empresas.map(emp => {
            const anioActivo = store.getAnioActivo();
            const estandares = obtenerEstandaresPorGrupo(emp.estandaresAplicables);
            const evalData = store.getEvaluacion(emp.id, anioActivo);
            const resEval = calcularPuntaje(evalData, estandares);

            return `
              <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold text-base flex-shrink-0">
                    ${(emp.razonSocial || 'EM').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900">${emp.razonSocial || 'Empresa Sin Nombre'}</h3>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>NIT: ${emp.nit || 'Pendiente'}</span>
                      <span>Riesgo ${emp.claseRiesgo || 'I'}</span>
                      <span>${emp.trabajadores || 0} Trabajadores</span>
                      <span>ARL: ${emp.arl || 'SURA'}</span>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <div class="text-right hidden md:block">
                    <span class="text-xs font-semibold text-slate-500">Autoevaluación (Año ${anioActivo})</span>
                    <div class="font-extrabold text-sm ${resEval.colorBadge === 'green' ? 'text-emerald-600' : resEval.colorBadge === 'amber' ? 'text-amber-600' : 'text-red-600'}">
                      ${resEval.puntaje}% (${resEval.estadoLegal})
                    </div>
                  </div>
                  
                  <span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">
                    ${emp.estandaresAplicables} Estándares
                  </span>

                  <!-- Acceso directo a diagramas desde lista -->
                  <button onclick="window.abrirVisorDiagrama('${emp.id}', 'mapa_procesos')" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition border border-indigo-200/60 flex items-center gap-1 shadow-2xs" title="Ver Mapa de Procesos de ${emp.razonSocial}">
                    <span>🗺️</span> <span class="hidden xl:inline text-[11px]">Mapa</span>
                  </button>
                  <button onclick="window.abrirVisorDiagrama('${emp.id}', 'organigrama')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold transition border border-blue-200/60 flex items-center gap-1 shadow-2xs" title="Ver Organigrama de ${emp.razonSocial}">
                    <span>👥</span> <span class="hidden xl:inline text-[11px]">Organigrama</span>
                  </button>

                  <button onclick="window.cambiarEmpresaActiva('${emp.id}')" class="px-4 py-2 bg-slate-800 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition shadow-sm">
                    Gestionar SG-SST →
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
