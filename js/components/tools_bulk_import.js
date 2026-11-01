// =============================================================================
// MÓDULO DE CARGA MASIVA DE HERRAMIENTAS Y EQUIPOS (BASE DE DATOS EXCEL / CSV)
// Conforme a la Res. 0312 de 2019 (Estándar 2.4.1) y Aislamiento Multi-Tenant
// =============================================================================

import { store } from '../store.js';

let filasCargaMasivaHerramientasTemp = [];
let archivoHerramientasCargadoNombre = '';

const slugifyTools = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

window.abrirModalCargaMasivaHerramientas = function() {
  const empresaActiva = store.getEmpresaActiva() || store.getEmpresas()[0] || { razonSocial: 'EMPRESA', id: store.getEmpresaActivaId() };
  const modalId = 'modal-carga-masiva-herramientas';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  filasCargaMasivaHerramientasTemp = [];
  archivoHerramientasCargadoNombre = '';

  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 animate-scaleIn flex flex-col max-h-[92vh]">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 text-white flex justify-between items-start flex-shrink-0">
        <div>
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Gestor de Base de Datos Masiva
            </span>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
              🏢 ${empresaActiva.razonSocial}
            </span>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Aislamiento Multi-Tenant Activo
            </span>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Estándar 2.4.1 Res. 0312
            </span>
          </div>

          <h3 class="text-xl font-black text-white flex items-center gap-2">
            <span>📥 Carga Masiva de Herramientas y Equipos por Base de Datos</span>
          </h3>
          <p class="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Diseñado para empresas y plantas con alto volumen de maquinaria, herramientas y equipos. Descarga la plantilla oficial, diligencia la información técnica y carga todo tu inventario en segundos con validación automática de códigos, especificaciones y matrices SST.
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
                Descarga la plantilla oficial delimitada por punto y coma (<strong>.CSV / Excel</strong>). Incluye los 14 campos técnicos requeridos y 5 filas de ejemplo realistas para maquinaria, herramientas eléctricas, neumáticas y de medición.
              </p>
            </div>

            <!-- Botón de Descarga del Formato -->
            <button 
              type="button" 
              onclick="window.descargarPlantillaCargaMasivaHerramientas()" 
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
              <span class="text-slate-500">Código Interno, Nombre Exacto, Tipo, Marca, Modelo, Serie.</span>
            </div>
            <div class="p-2 bg-white rounded-lg border border-blue-100">
              <span class="font-bold text-slate-800 block">Tipos Válidos</span>
              <span class="text-slate-500 font-mono">Industrial, Eléctrica, Neumática, Medición, Manual</span>
            </div>
            <div class="p-2 bg-white rounded-lg border border-blue-100">
              <span class="font-bold text-slate-800 block">Valores en COP</span>
              <span class="text-slate-500">Números enteros sin puntos ni símbolos (ej. 145000000).</span>
            </div>
            <div class="p-2 bg-white rounded-lg border border-blue-100">
              <span class="font-bold text-slate-800 block">Matriz SST Automática</span>
              <span class="text-slate-500">Peligros, EPP requeridos y Plan de Mantenimiento a 90 días.</span>
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
            Selecciona el archivo diligenciado desde tu ordenador para iniciar el procesamiento, validación técnica y control de duplicados.
          </p>

          <!-- Zona Drag & Drop / Input File -->
          <label class="border-2 border-dashed border-teal-200 hover:border-teal-400 bg-white rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group block">
            <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              🛠️
            </div>
            <div>
              <span class="text-xs font-bold text-slate-800 block group-hover:text-teal-600 transition">
                Haz clic aquí para seleccionar tu archivo de herramientas y equipos
              </span>
              <span class="text-[10px] text-slate-400 block mt-0.5">
                Archivos soportados: .CSV (delimitado por punto y coma o coma) o archivo de texto .TXT
              </span>
            </div>
            <span class="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-[10px] font-bold border border-teal-200 mt-1">
              Examinar Archivo en el Ordenador
            </span>
            <input type="file" id="input-archivo-csv-herramientas" accept=".csv,.txt" onchange="window.procesarArchivoCsvHerramientas(this.files)" class="hidden">
          </label>
        </div>

        <!-- PASO 3: PREVISUALIZACIÓN Y CONFIRMACIÓN DE IMPORTACIÓN -->
        <div id="contenedor-previsualizacion-carga-masiva-herramientas" class="hidden space-y-3">
          <!-- Este contenedor se poblará dinámicamente al seleccionar el archivo -->
        </div>

      </div>

      <!-- Footer -->
      <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
        <div class="text-[11px] text-slate-500">
          Doctor Pyme SG-SST • Módulo de Gestión de Herramientas y Equipos (Estándar 2.4.1)
        </div>

        <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer">
          Cerrar
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);
};

// 2. DESCARGA DE LA PLANTILLA OFICIAL CSV / EXCEL
window.descargarPlantillaCargaMasivaHerramientas = function() {
  const empresaActiva = store.getEmpresaActiva() || { razonSocial: 'EMPRESA' };

  const headers = [
    "Codigo Interno*",
    "Nombre Exacto del Activo*",
    "Tipo de Herramienta*",
    "Marca*",
    "Modelo*",
    "Numero de Serie*",
    "Valor Comercial COP*",
    "Año de Adquisicion*",
    "Vida Util Años*",
    "Estado Operativo*",
    "Ubicacion o Sede",
    "Variables Operativas",
    "Peligros SST Asociados",
    "EPP Requeridos"
  ];

  const filasEjemplo = [
    [
      "TL-IND-010",
      "Montacargas de Combustión Interna 3.5 Toneladas",
      "Industrial",
      "Toyota Industrial",
      "8FG35N",
      "TY-8FG-2024-9982",
      "145000000",
      "2024",
      "5",
      "En Funcionamiento",
      "Patio de Acopio y Despachos",
      "Capacidad: 3500 kg | Motor: Gas GLP | Altura Levante: 4.5m",
      "Atropellamiento, Volcamiento de carga, Ruido y vibraciones",
      "Casco de seguridad, Botas con puntera de acero, Chaleco reflectivo, Protección auditiva"
    ],
    [
      "TL-ELE-020",
      "Amoladora Angular Industrial 9 Pulgadas Heavy Duty",
      "Eléctrica",
      "DeWalt Industrial",
      "DWE490-B3",
      "DW-2025-44781",
      "850000",
      "2025",
      "3",
      "En Almacenamiento",
      "Taller de Mantenimiento Mecánico",
      "Voltaje: 120V 60Hz | Potencia: 2200W | RPM: 6500",
      "Proyección de partículas incandescentes, Ruido, Corte en extremidades",
      "Careta de esmerilar, Guantes de carnaza, Botas con puntera, Protección auditiva"
    ],
    [
      "TL-NEU-030",
      "Pistola Neumática de Impacto 3/4 Pulgada Doble Martillo",
      "Neumática",
      "Ingersoll Rand",
      "2145QiMAX",
      "IR-2024-77124",
      "2950000",
      "2024",
      "3",
      "En Almacenamiento",
      "Cuarto de Herramientas y Bodega Central",
      "Presión: 90 PSI | Torque: 1800 Nm | Entrada Aire: 3/8 NPT",
      "Ruido neumático, Vibraciones mano-brazo, Movimiento intempestivo",
      "Gafas de seguridad, Guantes antivibración, Protección auditiva de copa"
    ],
    [
      "TL-MED-040",
      "Termómetro Infrarrojo Láser Dual con Registro Térmico",
      "Medición",
      "Fluke Industrial",
      "Fluke 62 MAX+",
      "FLK-62-990184",
      "1250000",
      "2025",
      "3",
      "En Funcionamiento",
      "Planta de Hornos y Secaderos",
      "Rango: -30°C a 650°C | Precisión: ±1.0°C | Láser: Dual Clase II",
      "Exposición a radiación óptica láser, Contacto con superficies calientes",
      "Gafas con filtro UV, Guantes resistentes a calor radiante, Botas dieléctricas"
    ],
    [
      "TL-MAN-050",
      "Torquímetro Mecánico de Golpe Reversible 1/2 Pulgada",
      "Manual",
      "Proto Professional",
      "J6014C",
      "PRT-2023-55102",
      "1100000",
      "2023",
      "5",
      "En Almacenamiento",
      "Taller de Mantenimiento Mecánico",
      "Rango: 50 - 250 Ft-Lb | Encastre: 1/2 pulgada | Calibración anual",
      "Golpes por zafadura de dado, Sobreesfuerzo biomecánico",
      "Guantes de vaqueta, Gafas de seguridad, Botas de seguridad"
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
  a.download = `Plantilla_Carga_Masiva_Herramientas_Equipos_${slugifyTools(empresaActiva.razonSocial)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 3. PARSEADOR INTELIGENTE DE ARCHIVOS CSV / TXT / EXCEL DELIMITADO
window.analizarArchivoCsvHerramientas = function(contenidoTexto) {
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
    if (clean.includes('cod') || clean.includes('placa') || clean.includes('identif')) headerMap.internal_code = idx;
    else if (clean.includes('tipo') || clean.includes('categoria') || clean.includes('clase')) headerMap.tool_type = idx;
    else if (clean.includes('nombre') || clean.includes('descripcion') || clean.includes('activo') || clean.includes('herramienta') || clean.includes('equipo')) headerMap.exact_name = idx;
    else if (clean.includes('marca') || clean.includes('fabricante')) headerMap.brand = idx;
    else if (clean.includes('modelo') || clean.includes('referencia')) headerMap.model = idx;
    else if (clean.includes('serie') || clean.includes('serial') || clean.includes('chasis')) headerMap.serial_number = idx;
    else if (clean.includes('valor') || clean.includes('precio') || clean.includes('costo') || clean.includes('comercial')) headerMap.commercial_value = idx;
    else if (clean.includes('ano') || clean.includes('adquisicion') || clean.includes('compra')) headerMap.acquisition_year = idx;
    else if (clean.includes('vida') || clean.includes('util')) headerMap.useful_life_years = idx;
    else if (clean.includes('estado') || clean.includes('estatus') || clean.includes('operativo')) headerMap.current_status = idx;
    else if (clean.includes('ubicacion') || clean.includes('sede') || clean.includes('planta') || clean.includes('obra') || clean.includes('frente') || clean.includes('area')) headerMap.location = idx;
    else if (clean.includes('variable') || clean.includes('especif') || clean.includes('tecnic')) headerMap.operative_vars = idx;
    else if (clean.includes('peligro') || clean.includes('riesgo')) headerMap.hazards = idx;
    else if (clean.includes('epp') || clean.includes('proteccion') || clean.includes('dotacion')) headerMap.required_epp = idx;
  });

  // Fallbacks posicionales si los encabezados no coincidieron exactamente
  if (headerMap.internal_code === undefined) headerMap.internal_code = 0;
  if (headerMap.exact_name === undefined) headerMap.exact_name = 1;
  if (headerMap.tool_type === undefined) headerMap.tool_type = 2;
  if (headerMap.brand === undefined) headerMap.brand = 3;
  if (headerMap.model === undefined) headerMap.model = 4;
  if (headerMap.serial_number === undefined) headerMap.serial_number = 5;
  if (headerMap.commercial_value === undefined) headerMap.commercial_value = 6;
  if (headerMap.acquisition_year === undefined) headerMap.acquisition_year = 7;
  if (headerMap.useful_life_years === undefined) headerMap.useful_life_years = 8;
  if (headerMap.current_status === undefined) headerMap.current_status = 9;
  if (headerMap.location === undefined) headerMap.location = 10;
  if (headerMap.operative_vars === undefined) headerMap.operative_vars = 11;
  if (headerMap.hazards === undefined) headerMap.hazards = 12;
  if (headerMap.required_epp === undefined) headerMap.required_epp = 13;

  const filasValidas = [];
  const filasConError = [];

  for (let i = 1; i < lineas.length; i++) {
    const cols = parseLine(lineas[i]);
    if (cols.every(c => !c || c.trim() === '')) continue; // Fila vacía

    const internal_code = (cols[headerMap.internal_code] || '').trim();
    const exact_name = (cols[headerMap.exact_name] || '').trim();
    const rawType = (cols[headerMap.tool_type] || '').trim();
    const brand = (cols[headerMap.brand] || 'Genérica').trim();
    const model = (cols[headerMap.model] || 'Estándar').trim();
    const serial_number = (cols[headerMap.serial_number] || ('S/N-' + (internal_code || i))).trim();
    
    // Normalizar valor numérico
    const rawVal = (cols[headerMap.commercial_value] || '').replace(/[^\d]/g, '');
    const commercial_value = rawVal ? parseInt(rawVal, 10) : 0;

    // Normalizar año de adquisición
    const rawAno = (cols[headerMap.acquisition_year] || '').replace(/[^\d]/g, '');
    const acquisition_year = rawAno && rawAno.length === 4 ? parseInt(rawAno, 10) : new Date().getFullYear();

    // Normalizar vida útil
    const rawVida = (cols[headerMap.useful_life_years] || '').replace(/[^\d]/g, '');
    let useful_life_years = rawVida ? parseInt(rawVida, 10) : 3;
    if (useful_life_years < 1) useful_life_years = 1;
    if (useful_life_years > 5) useful_life_years = 5;

    // Normalizar tipo de herramienta
    let tool_type = 'Industrial';
    const typeLower = rawType.toLowerCase();
    if (typeLower.includes('elec') || typeLower.includes('electr')) tool_type = 'Eléctrica';
    else if (typeLower.includes('neum') || typeLower.includes('aire')) tool_type = 'Neumática';
    else if (typeLower.includes('med') || typeLower.includes('term') || typeLower.includes('laser')) tool_type = 'Medición';
    else if (typeLower.includes('man') || typeLower.includes('manual')) tool_type = 'Manual';
    else if (typeLower.includes('ind') || typeLower.includes('pesad') || typeLower.includes('maq')) tool_type = 'Industrial';

    // Normalizar estado operativo
    let current_status = 'En Almacenamiento';
    const rawStatus = (cols[headerMap.current_status] || '').toLowerCase();
    if (rawStatus.includes('func') || rawStatus.includes('oper') || rawStatus.includes('activ')) current_status = 'En Funcionamiento';
    else if (rawStatus.includes('mant') || rawStatus.includes('tall') || rawStatus.includes('revis')) current_status = 'En Mantenimiento';
    else if (rawStatus.includes('almac') || rawStatus.includes('bod') || rawStatus.includes('disp')) current_status = 'En Almacenamiento';

    const location = (cols[headerMap.location] || 'Planta Principal').trim();

    // Normalizar variables operativas
    const rawVars = (cols[headerMap.operative_vars] || '').trim();
    const operative_vars = {};
    if (rawVars) {
      const parts = rawVars.split(/[\|\;]/);
      parts.forEach(p => {
        if (p.includes(':')) {
          const [k, v] = p.split(':');
          if (k && v) operative_vars[k.trim().toLowerCase()] = v.trim();
        } else if (p.trim()) {
          operative_vars['especificacion'] = p.trim();
        }
      });
    }

    // Normalizar peligros SST
    const rawHazards = (cols[headerMap.hazards] || '').trim();
    const hazards = rawHazards ? rawHazards.split(/[,;]/).map(h => h.trim()).filter(Boolean) : [];

    // Normalizar EPP requeridos
    const rawEpp = (cols[headerMap.required_epp] || '').trim();
    const required_epp = rawEpp ? rawEpp.split(/[,;]/).map(e => e.trim()).filter(Boolean) : [];

    // Validaciones de fila
    const errores = [];
    if (!internal_code) errores.push('Falta el Código Interno del activo');
    if (!exact_name) errores.push('Falta el Nombre Exacto del activo');

    if (errores.length > 0) {
      filasConError.push({
        filaNum: i + 1,
        internal_code: internal_code || 'S/C',
        exact_name: exact_name || 'Sin nombre',
        tool_type,
        errores
      });
    } else {
      filasValidas.push({
        internal_code,
        exact_name,
        tool_type,
        brand,
        model,
        serial_number,
        commercial_value,
        acquisition_year,
        useful_life_years,
        current_status,
        location,
        operative_vars,
        hazards,
        required_epp
      });
    }
  }

  return {
    filasValidas,
    filasConError,
    totalFilas: lineas.length - 1
  };
};

// 4. PROCESAR ARCHIVO SELECCIONADO Y MOSTRAR PREVISUALIZACIÓN
window.procesarArchivoCsvHerramientas = function(files) {
  if (!files || files.length === 0) return;
  const file = files[0];
  archivoHerramientasCargadoNombre = file.name;

  const reader = new FileReader();
  reader.onload = function(e) {
    const texto = e.target.result;
    const analisis = window.analizarArchivoCsvHerramientas(texto);
    filasCargaMasivaHerramientasTemp = analisis.filasValidas;

    const contenedor = document.getElementById('contenedor-previsualizacion-carga-masiva-herramientas');
    if (!contenedor) return;

    contenedor.classList.remove('hidden');

    const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

    const typeBadge = (tipo) => {
      switch (tipo) {
        case 'Industrial': return '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200">Industrial</span>';
        case 'Eléctrica': return '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-800 border border-blue-200">Eléctrica</span>';
        case 'Neumática': return '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-cyan-50 text-cyan-800 border border-cyan-200">Neumática</span>';
        case 'Medición': return '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-purple-50 text-purple-800 border border-purple-200">Medición</span>';
        default: return '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-800 border border-slate-200">Manual</span>';
      }
    };

    const statusBadge = (st) => {
      switch (st) {
        case 'En Funcionamiento': return '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">En Funcionamiento</span>';
        case 'En Mantenimiento': return '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">En Mantenimiento</span>';
        default: return '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">En Almacenamiento</span>';
      }
    };

    contenedor.innerHTML = `
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <!-- KPIs del Archivo Analizado -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span class="text-xs font-black text-slate-900 block flex items-center gap-1.5">
              <span>📄 Archivo de Inventario Analizado:</span>
              <span class="font-mono text-teal-700 font-bold">${archivoHerramientasCargadoNombre}</span>
            </span>
            <span class="text-[10px] text-slate-500">Revisa las herramientas y maquinaria previa a su inserción en la base de datos empresarial.</span>
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
                <th class="py-2 px-3">Código & Tipo</th>
                <th class="py-2 px-3">Nombre del Activo</th>
                <th class="py-2 px-3">Marca, Modelo & Serie</th>
                <th class="py-2 px-3">Valor Comercial</th>
                <th class="py-2 px-3">Ubicación & Vida Útil</th>
                <th class="py-2 px-3 text-center">Estado Operativo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${analisis.filasValidas.slice(0, 15).map((row, idx) => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="py-2 px-3 font-mono text-slate-400 text-[10px]">${idx + 1}</td>
                  <td class="py-2 px-3">
                    <strong class="font-mono text-slate-900 block">${row.internal_code}</strong>
                    <div class="mt-0.5">${typeBadge(row.tool_type)}</div>
                  </td>
                  <td class="py-2 px-3">
                    <strong class="text-slate-900 block">${row.exact_name}</strong>
                    <span class="text-[10px] text-slate-400 block">${row.location}</span>
                  </td>
                  <td class="py-2 px-3">
                    <span class="font-bold text-slate-800 block">${row.brand} • ${row.model}</span>
                    <span class="text-[10px] font-mono text-slate-500">S/N: ${row.serial_number}</span>
                  </td>
                  <td class="py-2 px-3 font-mono font-bold text-slate-900">
                    ${formatCOP(row.commercial_value)}
                    <span class="block text-[9.5px] text-slate-400 font-normal">Año ${row.acquisition_year}</span>
                  </td>
                  <td class="py-2 px-3 text-[10px] text-slate-600">
                    <span class="font-bold text-teal-800">${row.useful_life_years} años de vida útil</span>
                    ${Object.keys(row.operative_vars || {}).length > 0 ? `
                      <span class="block text-[9px] text-slate-400 truncate max-w-[150px]">
                        ${Object.entries(row.operative_vars).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </span>
                    ` : ''}
                  </td>
                  <td class="py-2 px-3 text-center">
                    ${statusBadge(row.current_status)}
                  </td>
                </tr>
              `).join('')}

              ${analisis.filasValidas.length > 15 ? `
                <tr class="bg-slate-50">
                  <td colspan="7" class="py-2 px-3 text-center text-slate-500 text-[10px] font-medium italic">
                    ... y ${analisis.filasValidas.length - 15} activos técnicos más listos para ser incorporados.
                  </td>
                </tr>
              ` : ''}

              <!-- Mostrar filas con error si hubo -->
              ${analisis.filasConError.map(errRow => `
                <tr class="bg-red-50/50 text-red-800">
                  <td class="py-2 px-3 font-mono text-[10px] text-red-400">${errRow.filaNum}</td>
                  <td class="py-2 px-3 font-mono font-bold">${errRow.internal_code}</td>
                  <td class="py-2 px-3 font-bold" colspan="2">${errRow.exact_name}</td>
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
            <input type="checkbox" id="check-actualizar-herramientas-existentes" checked class="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer">
            <label for="check-actualizar-herramientas-existentes" class="text-xs text-slate-700 font-medium cursor-pointer">
              Actualizar ficha si el código interno ya se encuentra registrado en esta empresa (evita duplicados).
            </label>
          </div>

          <button 
            type="button" 
            onclick="window.confirmarImportacionMasivaHerramientas()" 
            class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 flex-shrink-0 ${analisis.filasValidas.length === 0 ? 'opacity-50 pointer-events-none' : ''}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>Confirmar e Importar ${analisis.filasValidas.length} Herramientas y Equipos</span>
          </button>
        </div>

      </div>
    `;
  };

  reader.readAsText(file, 'UTF-8');
};

// 5. EJECUTAR LA INSERCIÓN MASIVA EN EL STORE Y BASE DE DATOS
window.confirmarImportacionMasivaHerramientas = function() {
  if (!filasCargaMasivaHerramientasTemp || filasCargaMasivaHerramientasTemp.length === 0) {
    alert("No hay registros válidos para importar.");
    return;
  }

  const empresaActiva = store.getEmpresaActiva() || { razonSocial: 'la empresa' };
  const resultado = store.importarHerramientasMasivas(filasCargaMasivaHerramientasTemp, empresaActiva.id);

  // Cerrar modal
  const modal = document.getElementById('modal-carga-masiva-herramientas');
  if (modal) modal.remove();

  alert(`✓ Carga Masiva de Herramientas y Equipos Exitosa para ${empresaActiva.razonSocial}:\n\n` +
        `• Nuevos activos creados: ${resultado.importados}\n` +
        `• Activos existentes actualizados: ${resultado.actualizados}\n` +
        `• Total activos incorporados al inventario técnico: ${resultado.total}\n\n` +
        `Se han vinculado automáticamente las matrices SST (Estándar 2.4.1 Res. 0312) y los planes de mantenimiento preventivo.`);

  // Refrescar módulo
  if (typeof window.renderToolsModule === 'function') {
    window.renderToolsModule();
  } else if (typeof renderToolsModule === 'function') {
    renderToolsModule();
  }
};
