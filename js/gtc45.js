// =============================================================================
// MOTOR DE CÁLCULO GTC 45:2012 (GUÍA TÉCNICA COLOMBIANA)
// =============================================================================

export const OPCIONES_ND = [
  { valor: 10, etiqueta: "10 - Muy Alto (Peligros evidentes sin control preventivo)" },
  { valor: 6,  etiqueta: "6 - Alto (Deficiencias significativas en controles)" },
  { valor: 2,  etiqueta: "2 - Medio (Alguna deficiencia de menor importancia)" },
  { valor: 0,  etiqueta: "0 - Bajo (Sin anomalía destacable / Controles óptimos)" }
];

export const OPCIONES_NE = [
  { valor: 4, etiqueta: "4 - Continua (Varias veces en jornada por tiempo prolongado)" },
  { valor: 3, etiqueta: "3 - Frecuente (Varias veces en jornada por tiempos cortos)" },
  { valor: 2, etiqueta: "2 - Ocasional (Alguna vez en jornada por tiempo corto)" },
  { valor: 1, etiqueta: "1 - Esporádica (De manera eventual)" }
];

export const OPCIONES_NC = [
  { valor: 100, etiqueta: "100 - Mortal o Catastrófico (Muerte de 1 o más personas)" },
  { valor: 60,  etiqueta: "60 - Muy Grave (Lesiones o enfermedades graves e irreparables - Invalidez)" },
  { valor: 25,  etiqueta: "25 - Grave (Lesiones con Incapacidad Laboral Temporal - ILT)" },
  { valor: 10,  etiqueta: "10 - Leve (Lesiones que no requieren incapacidad médica)" }
];

/**
 * Calcula Nivel de Probabilidad (NP) y su interpretación
 */
export function calcularProbabilidad(nd, ne) {
  const deficiencia = parseInt(nd, 10) || 0;
  const exposicion = parseInt(ne, 10) || 0;
  const np = deficiencia * exposicion;

  let interpretacion = "Bajo (B)";
  let clase = "badge-green";

  if (np >= 24) {
    interpretacion = "Muy Alto (MA)";
    clase = "badge-red";
  } else if (np >= 10) {
    interpretacion = "Alto (A)";
    clase = "badge-orange";
  } else if (np >= 6) {
    interpretacion = "Medio (M)";
    clase = "badge-amber";
  }

  return { np, interpretacion, clase };
}

/**
 * Calcula Nivel de Riesgo (NR) y Aceptabilidad
 */
export function calcularNivelRiesgo(np, nc) {
  const probabilidad = parseInt(np, 10) || 0;
  const consecuencia = parseInt(nc, 10) || 0;
  const nr = probabilidad * consecuencia;

  let nivel = "IV";
  let aceptabilidad = "Aceptable";
  let significado = "Mantener las medidas de control existentes. Evaluar mejoras rentables.";
  let color = "green";

  if (nr >= 600) {
    nivel = "I";
    aceptabilidad = "No Aceptable";
    significado = "Situación crítica. Suspender actividades hasta que el riesgo esté bajo control. Intervención urgente.";
    color = "red";
  } else if (nr >= 150) {
    nivel = "II";
    aceptabilidad = "No Aceptable o Aceptable con control específico";
    significado = "Corregir y adoptar medidas de control de inmediato.";
    color = "orange";
  } else if (nr >= 40) {
    nivel = "III";
    aceptabilidad = "Mejorable";
    significado = "Mejorar si es posible. Justificar la intervención y su rentabilidad.";
    color = "amber";
  }

  return { nr, nivel, aceptabilidad, significado, color };
}

/**
 * Evaluación completa GTC 45
 */
export function evaluarGTC45(nd, ne, nc) {
  const prob = calcularProbabilidad(nd, ne);
  const riesgo = calcularNivelRiesgo(prob.np, nc);

  return {
    nd: parseInt(nd, 10),
    ne: parseInt(ne, 10),
    np: prob.np,
    interpretacionNP: prob.interpretacion,
    nc: parseInt(nc, 10),
    nr: riesgo.nr,
    nivelRiesgo: riesgo.nivel,
    aceptabilidad: riesgo.aceptabilidad,
    significado: riesgo.significado,
    color: riesgo.color
  };
}
