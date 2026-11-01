// =============================================================================
// DOCTOR PYME SG-SST - FORMATO OFICIAL DE REGISTRO DE ENTREGA DE EPP Y DOTACIÓN
// Código del Formato: SST-FOR-EPP-01 • Versión: 01
// Marco Normativo: Ley 9/1979, Res. 2400/1979, Dec. 1072/2015, Res. 0312/2019 Estándar 4.2.6, CST Art. 230
// =============================================================================

import { store } from '../store.js';

function abrirVentanaImpresionEPP(tituloDoc, htmlBody) {
  const printWin = window.open('', '_blank', 'width=1000,height=940,menubar=no,toolbar=no,status=no');
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
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 25px 35px; 
          color: #0f172a; 
          background: #ffffff; 
          line-height: 1.45; 
          font-size: 9.5pt; 
        }
        .no-print { text-align: right; margin-bottom: 15px; }
        .btn-print { 
          padding: 9px 20px; 
          background: #0f766e; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          font-weight: bold; 
          cursor: pointer; 
          font-size: 12px; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.15); 
        }
        .btn-print:hover { background: #115e59; }
        .header-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 14px; 
          border: 2px solid #0f172a; 
        }
        .header-table td { 
          padding: 6px 10px; 
          border: 1px solid #0f172a; 
          vertical-align: middle; 
        }
        .doc-title { 
          font-size: 11pt; 
          font-weight: 900; 
          text-align: center; 
          color: #0f172a; 
          text-transform: uppercase; 
          margin: 0; 
          line-height: 1.25; 
        }
        .doc-subtitle { 
          font-size: 7.5pt; 
          text-align: center; 
          color: #475569; 
          font-weight: bold; 
          margin-top: 2px; 
        }
        .section-box { 
          border: 1px solid #cbd5e1; 
          border-radius: 6px; 
          padding: 8px 12px; 
          margin-bottom: 12px; 
          page-break-inside: avoid; 
        }
        .section-title { 
          font-size: 8.5pt; 
          font-weight: 800; 
          color: #134e4a; 
          text-transform: uppercase; 
          border-bottom: 1.5px solid #ccfbf1; 
          padding-bottom: 3px; 
          margin-top: 0; 
          margin-bottom: 6px; 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
        }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; }
        .field-label { font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 1px; }
        .field-value { font-size: 8.5pt; font-weight: 600; color: #0f172a; }
        table.data-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 6px; 
          margin-bottom: 6px; 
          font-size: 8pt; 
        }
        table.data-table th { 
          background: #f0fdfa; 
          padding: 6px 6px; 
          border: 1px solid #99f6e4; 
          text-align: left; 
          font-weight: 800; 
          color: #115e59; 
          font-size: 7.5pt; 
          text-transform: uppercase;
        }
        table.data-table td { 
          padding: 5px 6px; 
          border: 1px solid #e2e8f0; 
          vertical-align: middle; 
        }
        .sig-container { 
          display: flex; 
          justify-content: space-between; 
          margin-top: 18px; 
          page-break-inside: avoid; 
        }
        .sig-block { 
          width: 46%; 
          text-align: center; 
          border: 1px solid #e2e8f0; 
          border-radius: 6px; 
          padding: 8px; 
          background: #f8fafc;
        }
        .sig-image-box { 
          height: 70px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          margin-bottom: 4px; 
        }
        .sig-image-box img { 
          max-height: 65px; 
          max-width: 90%; 
          object-contain: fit; 
        }
        .sig-line { 
          border-top: 1px solid #0f172a; 
          margin-bottom: 4px; 
        }
        .badge { 
          display: inline-block; 
          padding: 1.5px 6px; 
          border-radius: 4px; 
          font-size: 7pt; 
          font-weight: bold; 
        }
        .badge-epp { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .badge-dot { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .badge-esp { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
        .forensic-stamp { 
          background: #f8fafc; 
          border: 1px dashed #94a3b8; 
          border-radius: 6px; 
          padding: 6px 10px; 
          font-family: monospace; 
          font-size: 7pt; 
          color: #334155; 
          margin-top: 10px; 
          line-height: 1.35;
        }
        .legal-clause {
          font-size: 7.5pt;
          text-align: justify;
          color: #334155;
          line-height: 1.35;
          padding: 6px 10px;
          background: #f8fafc;
          border-left: 3px solid #0f766e;
          margin-top: 8px;
          margin-bottom: 8px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
          @page { margin: 1cm; size: letter; }
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

export function imprimirActaEntregaEPP_SST_FOR_01(deliveryId) {
  const delivery = store.getEppDeliveryById(deliveryId);
  if (!delivery) {
    alert("No se encontró la información del acta de entrega seleccionada.");
    return;
  }

  const empresa = store.getEmpresa(delivery.tenant_id || delivery.companyId) || store.getEmpresaActiva() || {
    razonSocial: 'LADRILLOS OCHOA LTDA.',
    nit: '830124631',
    ciudad: 'Bogotá D.C.',
    direccion: 'Planta Principal'
  };

  const trabajador = store.getTrabajadorPorId(delivery.employee_id || delivery.trabajadorId) || {
    nombre: delivery.trabajadorNombre || 'Trabajador',
    identificacion: delivery.trabajadorCedula || '',
    cargo: delivery.cargoNombre || 'Operario',
    tipoContrato: 'Término Indefinido'
  };

  const items = delivery.items || [];
  const consecutive = delivery.delivery_consecutive || `ACTA-EPP-${delivery.id.slice(-6).toUpperCase()}`;
  const signed = delivery.status === 'FIRMADO_ENTREGADO';
  const logoUrl = empresa.logoUrl || './assets/app-icon.png';

  const motivoDesc = {
    'Dotacion_Ingreso': 'Dotación de Ingreso (Inicio de Vínculo Laboral)',
    'Periodica_Ley_Abril_Agosto_Diciembre': 'Entrega Periódica Cuatrimestral de Ley (CST Art. 230)',
    'Reposicion_Por_Desgaste_Deterioro': 'Reposición por Desgaste Normal o Deterioro Operativo',
    'Cambio_De_Cargo': 'Ajuste de Matriz por Cambio de Cargo o Funciones'
  }[delivery.delivery_reason] || delivery.delivery_reason || 'Dotación de Ingreso';

  const tipoDesc = {
    'DOTACION_SOLA': 'Solo Dotación Legal (Prendas de Vestir y Calzado)',
    'EPP_SOLO': 'Solo Elementos de Protección Personal (EPP)',
    'MIXTA_EPP_Y_DOTACION': 'Mixta: EPP y Dotación Legal de Trabajo'
  }[delivery.delivery_type] || 'Mixta: EPP y Dotación Legal de Trabajo';

  const html = `
    <!-- ENCABEZADO DE CONTROL DOCUMENTAL -->
    <table class="header-table">
      <tr>
        <td style="width: 20%; text-align: center;">
          <img src="${logoUrl}" alt="${empresa.razonSocial}" style="max-height: 55px; max-width: 140px; object-contain: fit;" onerror="this.style.display='none'">
          <div style="font-size: 7.5pt; font-weight: bold; margin-top: 2px;">${empresa.razonSocial}</div>
          <div style="font-size: 6.5pt; color: #64748b;">NIT: ${empresa.nit}</div>
        </td>
        <td style="width: 55%; text-align: center;">
          <div class="doc-title">FORMATO DE REGISTRO DE ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL Y DOTACIÓN</div>
          <div class="doc-subtitle">SISTEMA DE GESTIÓN DE LA SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)</div>
          <div class="doc-subtitle">Decreto 1072 de 2015 • Res. 0312 de 2019 Estándar 4.2.6 • Ley 9 de 1979 • CST Art. 230</div>
        </td>
        <td style="width: 25%; font-size: 7.5pt;">
          <div><strong>Código:</strong> SST-FOR-EPP-01</div>
          <div><strong>Versión:</strong> 01</div>
          <div><strong>Emisión:</strong> 2026-01-15</div>
          <div><strong>Consecutivo:</strong> <span style="color: #0f766e; font-weight: bold;">${consecutive}</span></div>
        </td>
      </tr>
    </table>

    <!-- BLOQUE 1: DATOS DEL TRABAJADOR Y TRAZABILIDAD CRONOLÓGICA -->
    <div class="section-box">
      <div class="section-title">
        <span>I. Datos de Identificación del Trabajador y Trazabilidad Cronológica</span>
        <span class="badge ${signed ? 'badge-epp' : 'badge-dot'}">${signed ? '✓ FIRMADO Y ENTREGADO' : '⚠️ ASIGNADO PENDIENTE DE FIRMA'}</span>
      </div>

      <div class="grid-3">
        <div>
          <div class="field-label">Nombre Completo:</div>
          <div class="field-value">${trabajador.nombre}</div>
        </div>
        <div>
          <div class="field-label">Documento de Identidad:</div>
          <div class="field-value">C.C. ${trabajador.identificacion || trabajador.cedula || 'N/A'}</div>
        </div>
        <div>
          <div class="field-label">Cargo Desempeñado:</div>
          <div class="field-value">${delivery.cargoNombre || trabajador.cargo}</div>
        </div>
      </div>

      <div class="grid-3" style="margin-top: 6px;">
        <div>
          <div class="field-label">Motivo de Entrega:</div>
          <div class="field-value">${motivoDesc}</div>
        </div>
        <div>
          <div class="field-label">Tipo de Entrega:</div>
          <div class="field-value">${tipoDesc}</div>
        </div>
        <div>
          <div class="field-label">Empresa Responsable:</div>
          <div class="field-value">${empresa.razonSocial}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
        <div>
          <div class="field-label">Fecha y Hora Exacta de Asignación por la Empresa:</div>
          <div class="field-value font-mono" style="color: #0369a1;">
            📅 ${delivery.bogota_assigned_at || delivery.assigned_at || 'Asignado en Sistema'}
          </div>
        </div>
        <div>
          <div class="field-label">Fecha y Hora Exacta de Recepción y Firma del Trabajador:</div>
          <div class="field-value font-mono" style="color: #0f766e;">
            ${signed ? `✍️ ${delivery.bogota_signed_at || delivery.worker_signed_at || 'Firmado Digitalmente'}` : '⏳ Pendiente de firma con dedo'}
          </div>
        </div>
      </div>
    </div>

    <!-- BLOQUE 2: TABLA DETALLADA DE ELEMENTOS ENTREGADOS -->
    <div class="section-box">
      <div class="section-title">
        <span>II. Detalle de Elementos de Protección Personal (EPP) y Dotación Suministrados</span>
        <span style="font-size: 7.5pt; color: #64748b;">Total Ítems: ${items.length}</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 4%;">#</th>
            <th style="width: 14%;">Categoría</th>
            <th style="width: 28%;">Elemento Entregado</th>
            <th style="width: 22%;">Parte Protegida / Norma Técnica</th>
            <th style="width: 7%; text-align: center;">Talla</th>
            <th style="width: 6%; text-align: center;">Cant.</th>
            <th style="width: 8%; text-align: center;">¿Reposición?</th>
            <th style="width: 11%;">Próx. Reposición</th>
          </tr>
        </thead>
        <tbody>
          ${items.length === 0 ? `
            <tr><td colspan="8" style="text-align: center; color: #64748b; padding: 12px;">No se registraron ítems en esta acta.</td></tr>
          ` : items.map((it, idx) => `
            <tr>
              <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
              <td>
                <span class="badge ${it.category_snapshot === 'EPP' ? 'badge-epp' : (it.category_snapshot === 'DOTACION_LEGAL' ? 'badge-dot' : 'badge-esp')}">
                  ${it.category_snapshot === 'DOTACION_LEGAL' ? 'Dotación CST' : it.category_snapshot}
                </span>
              </td>
              <td>
                <strong style="color: #0f172a;">${it.item_name_snapshot}</strong>
                ${it.brand_or_batch ? `<div style="font-size: 7pt; color: #64748b;">Marca/Lote: ${it.brand_or_batch}</div>` : ''}
              </td>
              <td>
                <div>${it.body_part_protected || 'Cuerpo'}</div>
                <div style="font-size: 7pt; color: #0284c7; font-family: monospace;">${it.technical_standard_snapshot || 'N/A'}</div>
              </td>
              <td style="text-align: center; font-weight: bold;">${it.size_delivered || 'Única'}</td>
              <td style="text-align: center; font-weight: bold; color: #0f766e;">${it.quantity_delivered || 1}</td>
              <td style="text-align: center; font-size: 7.5pt;">
                ${it.previous_item_returned ? '<span style="color: #16a34a; font-weight: bold;">Sí (Usado)</span>' : '<span style="color: #64748b;">No / Nueva</span>'}
              </td>
              <td style="font-size: 7.5pt; font-family: monospace; color: #334155;">
                ${it.next_replacement_date || 'Periódica'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- BLOQUE 3: DECLARACIÓN Y COMPROMISO LEGAL NORMATIVO -->
    <div class="legal-clause">
      <strong>DECLARACIÓN Y COMPROMISO LEGAL DEL TRABAJADOR:</strong><br>
      En cumplimiento de la Ley 9 de 1979 (Arts. 122-124), Resolución 2400 de 1979, Decreto 1072 de 2015, Resolución 0312 de 2019 (Estándar 4.2.6) y el Artículo 230 del Código Sustantivo del Trabajo, declaro que he recibido de manera gratuita y en perfecto estado los Elementos de Protección Personal (EPP) y/o Dotación relacionados en el presente registro, acordes con los riesgos específicos de mi cargo. Asimismo, certifico que recibí instrucción sobre su uso correcto, mantenimiento, almacenamiento y reposición, comprometiéndome a utilizarlos de forma obligatoria durante mi jornada laboral.
    </div>

    <!-- BLOQUE 4: FIRMAS LEGALES Y SELLO FORENSE -->
    <div class="sig-container">
      <div class="sig-block">
        <div class="field-label" style="margin-bottom: 2px;">RECIBIDO Y ACEPTADO POR EL TRABAJADOR</div>
        <div class="sig-image-box">
          ${delivery.worker_signature_base64_or_s3 ? `
            <img src="${delivery.worker_signature_base64_or_s3}" alt="Firma Trabajador">
          ` : `
            <span style="color: #94a3b8; font-style: italic; font-size: 8pt;">[Pendiente de Firma Digital con Dedo]</span>
          `}
        </div>
        <div class="sig-line"></div>
        <div style="font-size: 8.5pt; font-weight: bold; color: #0f172a;">${trabajador.nombre}</div>
        <div style="font-size: 7.5pt; color: #475569;">C.C. ${trabajador.identificacion || trabajador.cedula || 'N/A'}</div>
        <div style="font-size: 7pt; color: #64748b;">Fecha/Hora: ${delivery.bogota_signed_at || delivery.worker_signed_at || 'Pendiente'}</div>
      </div>

      <div class="sig-block">
        <div class="field-label" style="margin-bottom: 2px;">ENTREGADO Y ASIGNADO POR LA EMPRESA / SST</div>
        <div class="sig-image-box">
          <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 20pt; color: #0f766e; padding-top: 10px;">
            ${empresa.responsable_sst || 'Responsable SG-SST'}
          </div>
        </div>
        <div class="sig-line"></div>
        <div style="font-size: 8.5pt; font-weight: bold; color: #0f172a;">${empresa.responsable_sst || 'Coordinador SG-SST'}</div>
        <div style="font-size: 7.5pt; color: #475569;">${empresa.razonSocial} • Responsable SST</div>
        <div style="font-size: 7pt; color: #64748b;">Fecha/Hora: ${delivery.bogota_assigned_at || delivery.assigned_at}</div>
      </div>
    </div>

    <!-- SELLO DE VALIDEZ FORENSE Y RETENCIÓN LEGAL (LEY 527 DE 1999) -->
    <div class="forensic-stamp">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px;">
        <span>🔒 SELLO DE INTEGRIDAD DIGITAL Y VALIDEZ PROBATORIA (LEY 527 DE 1999)</span>
        <span>RETENCIÓN LEGAL OBLIGATORIA: 20 AÑOS (Art. 2.2.4.6.13 Dec. 1072)</span>
      </div>
      <div><strong>Código de Almacenamiento MinIO S3:</strong> ${delivery.pdf_s3_key || `doctorpyme-storage/tenants/${empresa.id}/epp-deliveries/${consecutive}.pdf`}</div>
      <div><strong>Sello Hash Criptográfico SHA-256:</strong> <span style="color: #0f766e;">${delivery.cryptographic_hash_sha256 || 'Pendiente de generación de firma digital'}</span></div>
      <div><strong>Trazabilidad Técnica:</strong> IP Cliente: ${delivery.worker_ip_address || '127.0.0.1'} | Agente: ${delivery.worker_user_agent || 'Navegador Web DOCTOR PYME PWA'}</div>
      <div style="color: #166534; font-weight: bold; margin-top: 2px;">
        ✓ Evidencia Oficial Indexada para Cumplimiento del Estándar 4.2.6 (Resolución 0312 de 2019 - Ministerio del Trabajo).
      </div>
    </div>
  `;

  abrirVentanaImpresionEPP(`Acta de Entrega de EPP y Dotación - ${consecutive} - ${trabajador.nombre}`, html);
}

// Registro global en window
if (typeof window !== 'undefined') {
  window.imprimirActaEntregaEPP_SST_FOR_01 = imprimirActaEntregaEPP_SST_FOR_01;
}
