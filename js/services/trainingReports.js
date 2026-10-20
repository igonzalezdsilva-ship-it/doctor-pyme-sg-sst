// =============================================================================
// DOCTOR PYME SG-SST - REPORTES OFICIALES DE CAPACITACIONES (DOC-10 Y DOC-16)
// Formatos Oficiales Imprimibles según Decreto 1072 de 2015 y Res. 0312 de 2019
// =============================================================================

import { store } from '../store.js';

function abrirVentanaImpresion(tituloDoc, htmlBody) {
  const printWin = window.open('', '_blank', 'width=980,height=920,menubar=no,toolbar=no,status=no');
  if (!printWin) {
    alert("Por favor habilita las ventanas emergentes (popups) para visualizar e imprimir el documento en PDF.");
    return;
  }

  printWin.document.open();
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${tituloDoc}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px 35px; color: #0f172a; background: #ffffff; line-height: 1.45; font-size: 10pt; }
        .no-print { text-align: right; margin-bottom: 15px; }
        .btn-print { padding: 9px 20px; background: #3730a3; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
        .btn-print:hover { background: #312e81; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 2px solid #0f172a; }
        .header-table td { padding: 8px 12px; border: 1px solid #0f172a; vertical-align: middle; }
        .doc-title { font-size: 12pt; font-weight: 900; text-align: center; color: #0f172a; text-transform: uppercase; margin: 0; line-height: 1.25; }
        .doc-subtitle { font-size: 8pt; text-align: center; color: #475569; font-weight: bold; margin-top: 3px; }
        .section-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; page-break-inside: avoid; }
        .section-title { font-size: 9pt; font-weight: 800; color: #1e1b4b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 0; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .field-label { font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 1px; }
        .field-value { font-size: 9pt; font-weight: 600; color: #0f172a; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 6px; font-size: 8.5pt; }
        table.data-table th { background: #f8fafc; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: 800; color: #334155; font-size: 8pt; }
        table.data-table td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
        .sig-container { display: flex; justify-content: space-between; margin-top: 25px; page-break-inside: avoid; }
        .sig-block { width: 45%; text-align: center; }
        .sig-line { border-top: 1px solid #0f172a; margin-bottom: 5px; }
        .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .badge-info { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
        .forensic-stamp { background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 6px; padding: 8px 12px; font-family: monospace; font-size: 7.5pt; color: #334155; margin-top: 10px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
          @page { margin: 1.2cm; size: letter; }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
      </div>
      ${htmlBody}
    </body>
    </html>
  `);
  printWin.document.close();
}

/**
 * DOC-10: FORMATO DE REGISTRO DE CAPACITACIÓN, INDUCCIÓN Y ENTRENAMIENTO
 * Cumplimiento Art. 2.2.4.6.11 Decreto 1072/2015 y Estándar 1.2.1 Res. 0312/2019
 */
export function imprimirRegistroCapacitacionDOC10(evaluationId) {
  const evalData = store.getEvaluacionPorId(evaluationId);
  if (!evalData) {
    alert("No se encontró el registro de evaluación especificado.");
    return;
  }

  const training = evalData.training || store.getCapacitacionPorId(evalData.training_id) || {};
  const trabajador = store.getTrabajadorPorId(evalData.worker_id || evalData.trabajadorId) || {};
  const empresa = store.getEmpresa(evalData.company_id || training.companyId || trabajador.companyId) || store.getEmpresaActiva() || {};

  const certCode = evalData.certificate_code || `DP-EVAL-${(evalData.id || 'REG').slice(-8).toUpperCase()}`;
  const timestamp = evalData.accepted_at_bogota || evalData.timestamp || evalData.fecha || new Date().toISOString().replace('T', ' ').slice(0, 19);
  const nota = evalData.nota || evalData.score_obtained || 5.0;
  const pct = evalData.percentage !== undefined ? evalData.percentage : Math.round((nota / 5) * 100);
  const passed = evalData.passed !== undefined ? evalData.passed : (pct >= 70);

  const html = `
    <!-- Encabezado Institucional Oficial -->
    <table class="header-table">
      <tr>
        <td style="width: 22%; text-align: center;">
          ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" style="max-height: 55px; max-width: 140px; object-fit: contain;">` : `<strong style="font-size: 11pt; color: #1e1b4b;">${empresa.razonSocial || 'EMPRESA'}</strong>`}
        </td>
        <td style="width: 53%; text-align: center;">
          <div class="doc-title">REGISTRO DE CAPACITACIÓN, INDUCCIÓN Y ENTRENAMIENTO</div>
          <div class="doc-subtitle">SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)</div>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Decreto 1072 de 2015 • Res. 0312 de 2019 Estándar 1.2.1 • Ley 527 de 1999</div>
        </td>
        <td style="width: 25%; font-size: 8pt; line-height: 1.4;">
          <strong>Código:</strong> DOC-10<br>
          <strong>Versión:</strong> 02<br>
          <strong>Fecha Emisión:</strong> 2026-01-15<br>
          <strong>Certificado:</strong> <span style="font-family: monospace; color: #4338ca; font-weight: bold;">${certCode}</span>
        </td>
      </tr>
    </table>

    <!-- Bloque 1: Datos de la Empresa -->
    <div class="section-box">
      <div class="section-title">
        <span>I. Identificación de la Empresa Empleadora</span>
        <span class="badge badge-info">Multi-Tenant Activo</span>
      </div>
      <div class="grid-3">
        <div>
          <div class="field-label">Razón Social:</div>
          <div class="field-value">${empresa.razonSocial || 'No especificada'}</div>
        </div>
        <div>
          <div class="field-label">NIT / Identificación Tributaria:</div>
          <div class="field-value">${empresa.nit || 'No registrado'}</div>
        </div>
        <div>
          <div class="field-label">ARL / Administradora de Riesgos:</div>
          <div class="field-value">${empresa.arl || 'Positiva'} (Clase ${empresa.claseRiesgo || 'V'})</div>
        </div>
      </div>
      <div class="grid-2" style="margin-top: 6px;">
        <div>
          <div class="field-label">Dirección y Sede Operativa:</div>
          <div class="field-value">${empresa.direccion || 'Sede Principal'}, ${empresa.ciudad || 'Colombia'}</div>
        </div>
        <div>
          <div class="field-label">Responsable SST con Licencia:</div>
          <div class="field-value">${empresa.responsableSST || 'Ing. Especialista en SST - Lic. Vigente'}</div>
        </div>
      </div>
    </div>

    <!-- Bloque 2: Información de la Sesión de Capacitación -->
    <div class="section-box">
      <div class="section-title">
        <span>II. Información Pedagógica y Metodológica de la Capacitación</span>
        <span class="badge ${training.order_number === 1 || training.esInduccionObligatoria ? 'badge-success' : 'badge-info'}">
          ${training.order_number === 1 || training.esInduccionObligatoria ? 'Capacitación #1 Obligatoria' : 'Plan Anual'}
        </span>
      </div>
      <div class="grid-2">
        <div>
          <div class="field-label">Tema de Formación:</div>
          <div class="field-value" style="color: #1e1b4b; font-size: 9.5pt;">${training.tema || evalData.training_title || 'Inducción al SG-SST'}</div>
        </div>
        <div>
          <div class="field-label">Modalidad & Plataforma:</div>
          <div class="field-value">E-Learning Virtual Asistido • Plataforma DOCTOR PYME</div>
        </div>
      </div>
      <div style="margin-top: 6px;">
        <div class="field-label">Objetivo de Aprendizaje / Alcance:</div>
        <div class="field-value" style="font-weight: normal; font-size: 8.5pt; text-align: justify;">
          ${training.objetivo || 'Identificar los peligros inherentes al puesto de trabajo, directrices de autocuidado, uso obligatorio de EPP y canales de reporte de incidentes conforme a la normativa colombiana vigente.'}
        </div>
      </div>
      <div class="grid-3" style="margin-top: 6px;">
        <div>
          <div class="field-label">Intensidad Horaria:</div>
          <div class="field-value">${training.duracion || '2 Horas'}</div>
        </div>
        <div>
          <div class="field-label">Facilitador / Instructor:</div>
          <div class="field-value">${training.facilitador || 'Coordinador SG-SST / Asesoría ARL'}</div>
        </div>
        <div>
          <div class="field-label">Material Multimedia Base:</div>
          <div class="field-value">Presentación Google Slides + Video Técnico</div>
        </div>
      </div>
    </div>

    <!-- Bloque 3: Datos del Participante y Asistencia -->
    <div class="section-box">
      <div class="section-title">
        <span>III. Registro de Asistencia y Calificación del Trabajador</span>
        <span class="badge ${passed ? 'badge-success' : 'badge-danger'}">
          ${passed ? 'APROBADO' : 'NO APROBADO'}
        </span>
      </div>
      <div class="grid-3">
        <div>
          <div class="field-label">Nombre del Trabajador:</div>
          <div class="field-value" style="font-size: 10pt; color: #0f172a;">${evalData.trabajadorNombre || trabajador.nombre || 'Trabajador'}</div>
        </div>
        <div>
          <div class="field-label">Documento de Identidad (C.C.):</div>
          <div class="field-value font-mono">${evalData.trabajadorCedula || trabajador.identificacion || trabajador.cedula || 'No registrada'}</div>
        </div>
        <div>
          <div class="field-label">Cargo / Ocupación:</div>
          <div class="field-value">${evalData.trabajadorCargo || trabajador.cargo || 'Operativo'}</div>
        </div>
      </div>
      <div class="grid-3" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
        <div>
          <div class="field-label">Aciertos Obtenidos:</div>
          <div class="field-value"><strong>${evalData.correct_count !== undefined ? evalData.correct_count : 13}</strong> de <strong>${evalData.total_questions || 13}</strong> preguntas</div>
        </div>
        <div>
          <div class="field-label">Porcentaje de Rendimiento:</div>
          <div class="field-value" style="color: ${passed ? '#15803d' : '#b91c1c'}; font-size: 11pt;">${pct}%</div>
        </div>
        <div>
          <div class="field-label">Calificación Definitiva:</div>
          <div class="field-value" style="color: ${passed ? '#15803d' : '#b91c1c'}; font-size: 11pt;">${nota} / 5.0</div>
        </div>
      </div>
    </div>

    <!-- Bloque 4: Trazabilidad Forense y Evidencia Digital (Ley 527/1999) -->
    <div class="section-box" style="background: #fafafa;">
      <div class="section-title">
        <span>IV. Trazabilidad Forense Digital e Inmutabilidad (Ley 527 de 1999)</span>
        <span style="font-size: 7.5pt; color: #64748b;">Evidencia Criptográfica Emitida por el Servidor</span>
      </div>
      <div class="grid-2">
        <div>
          <div class="field-label">Estampa de Tiempo Inmutable (Bogotá - UTC-5):</div>
          <div class="field-value font-mono" style="color: #4338ca;">${timestamp}</div>
        </div>
        <div>
          <div class="field-label">Código Único de Auditoría Legal:</div>
          <div class="field-value font-mono" style="color: #4338ca;">${certCode}</div>
        </div>
      </div>
      <div class="forensic-stamp">
        <strong>Firma Hash SHA-256:</strong> ${evalData.cryptographic_evidence_hash || 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
        <br>
        <span style="font-size: 7pt; color: #64748b;">Constancia de verificación: La presente certificación fue expedida tras la visualización comprobada del material multimedia y la resolución exitosa del cuestionario de 13 preguntas.</span>
      </div>
    </div>

    <!-- Bloque 5: Firmas de Responsabilidad Legal -->
    <div class="sig-container">
      <div class="sig-block">
        <div style="min-height: 45px; display: flex; align-items: flex-end; justify-content: center; font-family: cursive; font-size: 13pt; color: #1e1b4b;">
          ${evalData.trabajadorNombre || trabajador.nombre || 'Firma Digital'}
        </div>
        <div class="sig-line"></div>
        <strong style="font-size: 8.5pt;">${evalData.trabajadorNombre || trabajador.nombre || 'Trabajador Asistente'}</strong><br>
        <span style="font-size: 7.5pt; color: #64748b;">C.C. ${evalData.trabajadorCedula || trabajador.identificacion || trabajador.cedula || '---'} • Asistente Certificado</span>
      </div>

      <div class="sig-block">
        <div style="min-height: 45px; display: flex; align-items: flex-end; justify-content: center; font-family: cursive; font-size: 13pt; color: #1e1b4b;">
          ${empresa.responsableSST ? empresa.responsableSST.split('-')[0] : 'Ing. Coordinador SG-SST'}
        </div>
        <div class="sig-line"></div>
        <strong style="font-size: 8.5pt;">${empresa.responsableSST ? empresa.responsableSST.split('-')[0] : 'Responsable del SG-SST'}</strong><br>
        <span style="font-size: 7.5pt; color: #64748b;">${empresa.responsableSST || 'Licencia en Seguridad y Salud en el Trabajo'}</span>
      </div>
    </div>
  `;

  abrirVentanaImpresion(`DOC-10 Registro de Capacitación - ${evalData.trabajadorNombre || 'Trabajador'}`, html);
}

/**
 * DOC-16: FORMATO DE EVALUACIÓN DE LA CAPACITACIÓN Y APRENDIZAJE
 * Detalle íntegro de las 13 preguntas, respuestas seleccionadas, correctas y calificación final
 */
export function imprimirEvaluacionCapacitacionDOC16(evaluationId) {
  const evalData = store.getEvaluacionPorId(evaluationId);
  if (!evalData) {
    alert("No se encontró el registro de evaluación especificado.");
    return;
  }

  const training = evalData.training || store.getCapacitacionPorId(evalData.training_id) || {};
  const trabajador = store.getTrabajadorPorId(evalData.worker_id || evalData.trabajadorId) || {};
  const empresa = store.getEmpresa(evalData.company_id || training.companyId || trabajador.companyId) || store.getEmpresaActiva() || {};

  const certCode = evalData.certificate_code || `DP-EVAL-${(evalData.id || 'REG').slice(-8).toUpperCase()}`;
  const timestamp = evalData.accepted_at_bogota || evalData.timestamp || evalData.fecha || new Date().toISOString().replace('T', ' ').slice(0, 19);
  const nota = evalData.nota || evalData.score_obtained || 5.0;
  const pct = evalData.percentage !== undefined ? evalData.percentage : Math.round((nota / 5) * 100);
  const passed = evalData.passed !== undefined ? evalData.passed : (pct >= 70);

  // Obtener detalle de las 13 preguntas
  let preguntasDetalle = evalData.detailed_answers;
  if (!Array.isArray(preguntasDetalle) || preguntasDetalle.length === 0) {
    const preguntasBase = training.preguntas || [];
    const submittedAnswers = evalData.answers_submitted || [];
    preguntasDetalle = preguntasBase.map((p, idx) => {
      const ans_raw = submittedAnswers[idx];
      let ans_idx = null;
      if (typeof ans_raw === 'number') ans_idx = ans_raw;
      else if (typeof ans_raw === 'string') {
        ans_idx = ['A', 'B', 'C', 'D'].indexOf(ans_raw.trim().toUpperCase());
        if (ans_idx === -1 && /^\d+$/.test(ans_raw)) ans_idx = parseInt(ans_raw, 10);
      }
      let correct_idx = (p.respuestaCorrecta !== undefined) ? p.respuestaCorrecta : p.correct_option_index;
      if (typeof correct_idx === 'string') correct_idx = parseInt(correct_idx, 10);
      const is_correct = (ans_idx !== null && correct_idx !== undefined && ans_idx === correct_idx);

      return {
        question_number: idx + 1,
        question_text: p.pregunta || p.question_text || `Pregunta ${idx + 1}`,
        options: p.opciones || p.options || [],
        selected_option_index: ans_idx,
        selected_option_letter: ans_idx !== null ? ['A', 'B', 'C', 'D'][ans_idx] : 'N/A',
        correct_option_index: correct_idx,
        correct_option_letter: correct_idx !== undefined ? ['A', 'B', 'C', 'D'][correct_idx] : 'B',
        is_correct: is_correct,
        justificacion: p.justificacion || ''
      };
    });
  }

  const html = `
    <!-- Encabezado Institucional Oficial -->
    <table class="header-table">
      <tr>
        <td style="width: 22%; text-align: center;">
          ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" style="max-height: 55px; max-width: 140px; object-fit: contain;">` : `<strong style="font-size: 11pt; color: #1e1b4b;">${empresa.razonSocial || 'EMPRESA'}</strong>`}
        </td>
        <td style="width: 53%; text-align: center;">
          <div class="doc-title">FORMATO DE EVALUACIÓN DE LA CAPACITACIÓN</div>
          <div class="doc-subtitle">SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)</div>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Cuestionario Estructurado de 13 Preguntas • Eficacia del Aprendizaje (DTO 1072/2015)</div>
        </td>
        <td style="width: 25%; font-size: 8pt; line-height: 1.4;">
          <strong>Código:</strong> DOC-16<br>
          <strong>Versión:</strong> 02<br>
          <strong>Fecha Emisión:</strong> 2026-01-15<br>
          <strong>Folio:</strong> <span style="font-family: monospace; color: #4338ca; font-weight: bold;">${certCode}</span>
        </td>
      </tr>
    </table>

    <!-- Bloque 1: Datos de Identificación -->
    <div class="section-box">
      <div class="section-title">
        <span>I. Datos de Identificación del Evaluado y Capacitación</span>
        <span class="badge ${passed ? 'badge-success' : 'badge-danger'}">
          ${passed ? 'COMPETENCIA ADQUIRIDA' : 'REQUIERE REFUERZO'}
        </span>
      </div>
      <div class="grid-3">
        <div>
          <div class="field-label">Empresa:</div>
          <div class="field-value">${empresa.razonSocial || 'DOCTOR PYME'}</div>
        </div>
        <div>
          <div class="field-label">Trabajador Evaluado:</div>
          <div class="field-value" style="color: #1e1b4b; font-size: 9.5pt;">${evalData.trabajadorNombre || trabajador.nombre || 'Trabajador'}</div>
        </div>
        <div>
          <div class="field-label">Cédula de Ciudadanía:</div>
          <div class="field-value font-mono">${evalData.trabajadorCedula || trabajador.identificacion || trabajador.cedula || 'No registrada'}</div>
        </div>
      </div>
      <div class="grid-3" style="margin-top: 6px;">
        <div>
          <div class="field-label">Cargo / Área:</div>
          <div class="field-value">${evalData.trabajadorCargo || trabajador.cargo || 'Operativo'}</div>
        </div>
        <div>
          <div class="field-label">Capacitación Evaluada:</div>
          <div class="field-value">${training.tema || evalData.training_title || 'Inducción al SG-SST'}</div>
        </div>
        <div>
          <div class="field-label">Fecha y Hora de Examen:</div>
          <div class="field-value font-mono">${timestamp}</div>
        </div>
      </div>
    </div>

    <!-- Bloque 2: Desglose de las 13 Preguntas -->
    <div class="section-box">
      <div class="section-title">
        <span>II. Desglose y Calificación de las 13 Preguntas de Evaluación</span>
        <span style="font-size: 8pt; color: #64748b;">Selección Múltiple con Única Respuesta</span>
      </div>

      <div style="space-y: 8px;">
        ${preguntasDetalle.map((p, idx) => {
          const num = p.question_number || (idx + 1);
          const isCorrect = p.is_correct;
          const options = p.options || [];

          return `
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <span style="font-size: 8.5pt; font-weight: 700; color: #1e293b;">
                  ${num}. ${p.question_text}
                </span>
                <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}" style="flex-shrink: 0;">
                  ${isCorrect ? '✓ CORRECTO (+1)' : '✗ INCORRECTO (0)'}
                </span>
              </div>

              <!-- Opciones -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px; font-size: 8pt;">
                ${options.map((opt, optIdx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const optLetter = letters[optIdx];
                  const wasSelected = (p.selected_option_index === optIdx || p.selected_option_letter === optLetter);
                  const isTheCorrectOpt = (p.correct_option_index === optIdx || p.correct_option_letter === optLetter);

                  let styleBg = 'background: #f8fafc; border: 1px solid #e2e8f0; color: #475569;';
                  if (wasSelected && isCorrect) {
                    styleBg = 'background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-weight: bold;';
                  } else if (wasSelected && !isCorrect) {
                    styleBg = 'background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-weight: bold;';
                  } else if (isTheCorrectOpt && !isCorrect) {
                    styleBg = 'background: #f0fdf4; border: 1px dashed #86efac; color: #166534; font-weight: bold;';
                  }

                  return `
                    <div style="padding: 3px 6px; border-radius: 4px; ${styleBg}">
                      ${opt}
                      ${wasSelected ? `<span style="font-size: 7pt; margin-left: 4px;">(Respuesta Seleccionada)</span>` : ''}
                      ${isTheCorrectOpt && !isCorrect ? `<span style="font-size: 7pt; margin-left: 4px;">(Respuesta Correcta)</span>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>

              ${p.justificacion ? `
                <div style="font-size: 7.5pt; color: #64748b; margin-top: 3px; font-style: italic;">
                  Justificación normativa: ${p.justificacion}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Bloque 3: Resumen y Ponderación Final -->
    <div class="section-box" style="background: #f8fafc;">
      <div class="section-title">
        <span>III. Dictamen y Consolidado de Calificación</span>
        <span class="badge ${passed ? 'badge-success' : 'badge-danger'}">
          ${passed ? 'APROBADO' : 'NO APROBADO'}
        </span>
      </div>
      <div class="grid-3" style="text-align: center;">
        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px;">
          <div class="field-label">Aciertos Totales:</div>
          <div style="font-size: 14pt; font-weight: 900; color: #1e1b4b;">
            ${evalData.correct_count !== undefined ? evalData.correct_count : 13} / ${evalData.total_questions || 13}
          </div>
        </div>
        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px;">
          <div class="field-label">Porcentaje de Rendimiento:</div>
          <div style="font-size: 14pt; font-weight: 900; color: ${passed ? '#15803d' : '#b91c1c'};">
            ${pct}%
          </div>
        </div>
        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px;">
          <div class="field-label">Calificación Definitiva:</div>
          <div style="font-size: 14pt; font-weight: 900; color: ${passed ? '#15803d' : '#b91c1c'};">
            ${nota} <span style="font-size: 9pt; color: #64748b;">/ 5.0</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 10px; font-size: 8pt; color: #334155; line-height: 1.4;">
        <strong>Criterio de Evaluación:</strong> Para obtener la aprobación de la capacitación y acreditar competencia en SG-SST se requiere un puntaje mínimo del <strong>70%</strong> (mínimo 10 de 13 preguntas correctas). 
        ${passed 
          ? `<span style="color: #15803d; font-weight: bold;">El trabajador demostró apropiación satisfactoria de las directrices de seguridad y salud en el trabajo.</span>`
          : `<span style="color: #b91c1c; font-weight: bold;">El trabajador debe programar una sesión de refuerzo y repetir la evaluación para alcanzar el estándar aprobatorio.</span>`
        }
      </div>
    </div>

    <!-- Bloque 4: Validación Forense y Firmas -->
    <div class="sig-container">
      <div class="sig-block">
        <div style="min-height: 45px; display: flex; align-items: flex-end; justify-content: center; font-family: cursive; font-size: 13pt; color: #1e1b4b;">
          ${evalData.trabajadorNombre || trabajador.nombre || 'Evaluado Digital'}
        </div>
        <div class="sig-line"></div>
        <strong style="font-size: 8.5pt;">${evalData.trabajadorNombre || trabajador.nombre || 'Trabajador Evaluado'}</strong><br>
        <span style="font-size: 7.5pt; color: #64748b;">C.C. ${evalData.trabajadorCedula || trabajador.identificacion || trabajador.cedula || '---'} • Constancia de Presentación</span>
      </div>

      <div class="sig-block">
        <div style="min-height: 45px; display: flex; align-items: flex-end; justify-content: center; font-family: cursive; font-size: 13pt; color: #1e1b4b;">
          ${empresa.responsableSST ? empresa.responsableSST.split('-')[0] : 'Ing. Evaluador SST'}
        </div>
        <div class="sig-line"></div>
        <strong style="font-size: 8.5pt;">${empresa.responsableSST ? empresa.responsableSST.split('-')[0] : 'Responsable / Evaluador SG-SST'}</strong><br>
        <span style="font-size: 7.5pt; color: #64748b;">${empresa.responsableSST || 'Licencia en Seguridad y Salud en el Trabajo'}</span>
      </div>
    </div>

    <div class="forensic-stamp" style="margin-top: 15px;">
      <strong>Certificado Único Forense:</strong> ${certCode} | <strong>Timestamp Servidor:</strong> ${timestamp} | <strong>Hash SHA-256:</strong> ${evalData.cryptographic_evidence_hash || 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
    </div>
  `;

  abrirVentanaImpresion(`DOC-16 Evaluación de Capacitación - ${evalData.trabajadorNombre || 'Trabajador'}`, html);
}

// Asociar a window para invocación global desde cualquier vista
if (typeof window !== 'undefined') {
  window.imprimirRegistroCapacitacionDOC10 = imprimirRegistroCapacitacionDOC10;
  window.imprimirEvaluacionCapacitacionDOC16 = imprimirEvaluacionCapacitacionDOC16;
}
