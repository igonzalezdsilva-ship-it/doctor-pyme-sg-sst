// =============================================================================
// MOTOR NORMATIVO - RESOLUCIÓN 0312 DE 2019
// =============================================================================
import { ESTANDARES_RES_0312 } from './data.js';

/**
 * Determina el número de estándares mínimos aplicables según tamaño y clase de riesgo
 * @param {number} trabajadores - Cantidad total de trabajadores
 * @param {string} claseRiesgo - "I", "II", "III", "IV" o "V"
 * @returns {number} 7, 21 o 60
 */
export function determinarGrupoEstandares(trabajadores, claseRiesgo) {
  const riesgo = (claseRiesgo || "").toUpperCase().trim();
  const numTrabajadores = parseInt(trabajadores, 10) || 0;

  // Regla 1: Riesgo IV o V SIEMPRE aplica 60 estándares (independiente de trabajadores)
  if (riesgo === 'IV' || riesgo === 'V') {
    return 60;
  }

  // Regla 2: Más de 50 trabajadores SIEMPRE aplica 60 estándares
  if (numTrabajadores > 50) {
    return 60;
  }

  // Regla 3: Entre 11 y 50 trabajadores con Riesgo I, II o III aplica 21 estándares
  if (numTrabajadores >= 11 && numTrabajadores <= 50) {
    return 21;
  }

  // Regla 4: 10 o menos trabajadores con Riesgo I, II o III aplica 7 estándares
  return 7;
}

/**
 * Obtiene la lista de estándares filtrada y ponderada según el grupo (7, 21 o 60)
 * @param {number} grupo - 7, 21 o 60
 * @returns {Array} Lista de estándares
 */
export function obtenerEstandaresPorGrupo(grupo) {
  if (grupo === 7) {
    return ESTANDARES_RES_0312
      .filter(item => item.aplica7)
      .map(item => ({
        ...item,
        pesoEfectivo: item.peso7
      }));
  }

  if (grupo === 21) {
    return ESTANDARES_RES_0312
      .filter(item => item.aplica21)
      .map(item => ({
        ...item,
        pesoEfectivo: item.peso21
      }));
  }

  // Grupo 60: Aplican todos
  return ESTANDARES_RES_0312.map(item => ({
    ...item,
    pesoEfectivo: item.peso60
  }));
}

/**
 * Calcula el puntaje de la evaluación de estándares mínimos
 * @param {Object} respuestasMap - Mapa de { [numeral]: { estado: 'CUMPLE'|'NO_CUMPLE'|'NO_APLICA', justificacion, planAccion } }
 * @param {Array} estandares - Lista de estándares con pesoEfectivo
 * @returns {Object} Resultado con puntaje, calificación, semáforo y estadísticas
 */
export function calcularPuntaje(respuestasMap, estandares) {
  let puntajeTotal = 0;
  let cumpleCount = 0;
  let noCumpleCount = 0;
  let noAplicaCount = 0;
  let sinEvaluarCount = 0;

  estandares.forEach(est => {
    const resp = respuestasMap[est.numeral];
    if (!resp || !resp.estado) {
      sinEvaluarCount++;
      return;
    }

    if (resp.estado === 'CUMPLE') {
      puntajeTotal += est.pesoEfectivo;
      cumpleCount++;
    } else if (resp.estado === 'NO_APLICA') {
      // Según Res. 0312, los ítems justificadamente "No Aplica" otorgan el puntaje
      puntajeTotal += est.pesoEfectivo;
      noAplicaCount++;
    } else if (resp.estado === 'NO_CUMPLE') {
      noCumpleCount++;
    }
  });

  const puntajeRedondeado = Math.min(100, Math.round(puntajeTotal * 100) / 100);

  let estadoLegal = "CRÍTICO";
  let colorBadge = "red";
  let accionRequerida = "Realizar y tener a disposición del Ministerio del Trabajo un Plan de Mejoramiento de inmediato. Enviar reporte de avance a la ARL a los tres (3) meses.";

  if (puntajeRedondeado > 85) {
    estadoLegal = "ACEPTABLE";
    colorBadge = "green";
    accionRequerida = "Mantener la calificación y evidencias a disposición del Ministerio del Trabajo. Incluir en el Plan Anual de Trabajo las acciones de mejora.";
  } else if (puntajeRedondeado >= 60) {
    estadoLegal = "MODERADAMENTE ACEPTABLE";
    colorBadge = "amber";
    accionRequerida = "Realizar y tener a disposición del Ministerio del Trabajo un Plan de Mejoramiento. Enviar reporte de avance a la ARL a los seis (6) meses.";
  }

  return {
    puntaje: puntajeRedondeado,
    estadoLegal,
    colorBadge,
    accionRequerida,
    cumpleCount,
    noCumpleCount,
    noAplicaCount,
    sinEvaluarCount,
    totalEstandares: estandares.length
  };
}

/**
 * Formatea el peso o ponderación de un estándar para presentación en UI y reportes
 * @param {number} peso - Ponderación numérica
 * @returns {string} Texto formateado (ej. "0.1667%", "5%", "0.5%")
 */
export function formatPeso(peso) {
  if (peso === null || peso === undefined) return '0%';
  if (Number.isInteger(peso)) return `${peso}%`;
  // Para los sub-requisitos de 1.1.1 (0.5 / 3 = 0.16666666666...)
  if (Math.abs(peso - (0.5 / 3)) < 0.00001) return '0.1667%';
  if (Math.abs(peso - (4.0 / 3)) < 0.00001) return '1.333%';
  if (Math.abs(peso - (10.0 / 3)) < 0.00001) return '3.333%';
  // Para los sub-requisitos de 1.1.2 (0.5 / 6 = 0.08333333333...)
  if (Math.abs(peso - (0.5 / 6)) < 0.00001) return '0.0833%';
  if (Math.abs(peso - (4.0 / 6)) < 0.00001) return '0.667%';
  const dec = Math.round(peso * 100) / 100;
  return `${dec}%`;
}
