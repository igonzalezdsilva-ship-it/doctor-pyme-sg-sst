#!/usr/bin/env ruby
# ==============================================================================
# SEED SCRIPT: PROCESS-DRIVEN ARCHITECTURE FOR DOCTOR PYME SG-SST
# Genera Mapa de Procesos, Caracterización SIPOC/PHVA, Cargos y Documentos
# ==============================================================================

require 'json'
require 'time'
require 'securerandom'

DB_FILE = File.expand_path('../data/database.json', __dir__)
db = JSON.parse(File.read(DB_FILE))

db['process_maps'] ||= []
db['processes'] ||= []
db['process_activities'] ||= []
db['job_positions'] ||= []
db['process_activity_positions'] ||= []
db['job_position_documents'] ||= []

# Limpiar para resembrar de forma limpia y consistente
db['process_maps'].clear
db['processes'].clear
db['process_activities'].clear
db['job_positions'].clear
db['process_activity_positions'].clear
db['job_position_documents'].clear

now_iso = Time.now.iso8601

empresas = db['empresas'] || []

empresas.each do |emp|
  emp_id = emp['id']
  razon = emp['razonSocial']
  nit = emp['nit']
  riesgo = emp['claseRiesgo']
  sector = emp['sector'] || 'Industrial'

  is_och = emp_id == 'emp-1790438946268' || razon.include?('LADRILLOS')
  is_sig = emp_id == 'emp-1792009016839' || razon.include?('SERVICIOS IG')
  is_mat = emp_id == 'emp-1792010387578' || razon.include?('MATMA')

  # 1. ACTUALIZACIÓN BLOQUE 1: CONTEXTO Y ADN EMPRESARIAL
  if is_och
    emp['years_operating'] = 25
    emp['company_description'] = "#{razon} (NIT #{nit}) es una empresa industrial líder en la fabricación, cocción y comercialización de productos cerámicos de alta resistencia para la construcción en Colombia (ladrillo tolete, estructural, bloque y adoquines). Fundada hace más de 25 años en el Valle de Aburrá, la compañía opera una planta tecnificada con hornos túnel de última generación y laboratorio propio de calidad de arcillas."
    emp['operational_how_it_works'] = "La operación sigue una metodología por procesos SIPOC: 1) Extracción y homogenización de arcillas en patio; 2) Molienda, desintegración y humectación controlada; 3) Moldeo y extrusión al vacío con cortadoras electrónicas; 4) Secado artificial en túneles con aire caliente residual; 5) Sinterización en horno túnel continuo HT-240 a 980°C; 6) Control de calidad, paletizado con fleje de alta resistencia y despacho en montacargas."
    inherent_hazards = ['Mecánico (atrapamientos por tolvas y muelas)', 'Térmico (radiación y quemaduras por horno túnel a 980°C)', 'Locativo (tráfico de montacargas y superficies irregulares)', 'Biomecánico (manipulación manual de cargas)', 'Químico (material particulado y sílice cristalina)']
  elsif is_sig
    emp['years_operating'] = 7
    emp['company_description'] = "#{razon} (NIT #{nit}) es una compañía de ingeniería especializada en montajes electromecánicos, diseño y ejecución de redes de media y baja tensión, y consultoría técnica en eficiencia energética."
    emp['operational_how_it_works'] = "Modelo de proyectos de ingeniería: levantamiento técnico de cargas, diseño unifilar bajo norma RETIE, suministro de materiales certificados, ranurado y cableado en obra, pruebas de aislamiento con megóhmetro y puesta en servicio."
    inherent_hazards = ['Peligro Eléctrico (arco eléctrico y contacto directo)', 'Trabajo en Alturas (> 2 metros en postes y bandejas)', 'Mecánico (rotomartillos y herramientas de impacto)', 'Biomecánico (posturas forzadas en canalizaciones)']
  else
    emp['years_operating'] = 6
    emp['company_description'] = "#{razon} (NIT #{nit}) es un estudio y taller de diseño, manufactura y ensamble de mobiliario ergonómico comercial, residencial y para oficinas con acabados de alta gama."
    emp['operational_how_it_works'] = "Flujo de trabajo basado en renderizado 3D, despiece paramétrico, corte de tableros melamínicos en sierra escuadradora y centro CNC, enchape de cantos, ensamble estructural y control de calidad dimensional."
    inherent_hazards = ['Mecánico (corte por disco de sierra escuadradora)', 'Físico (ruido continuo de extractores y motores)', 'Químico (polvo de madera/aglomerado y vapores de pegantes)', 'Biomecánico (movimientos repetitivos en ensamble)']
  end

  emp['ai_context_summary'] = {
    'core_business' => emp['company_description'][0..140] + '...',
    'key_processes' => ['Direccionamiento Estratégico', 'Operación y Transformación', 'Talento Humano', 'Mantenimiento de Herramientas', 'Control de Calidad y SG-SST'],
    'operational_maturity' => emp['years_operating'] >= 10 ? 'Madura y Consolidada' : 'En Crecimiento y Estandarización',
    'years_operating' => emp['years_operating'],
    'inherent_risk_profile' => {
      'clase_riesgo' => riesgo,
      'clasificacion_arl' => "Riesgo Clase #{riesgo} - Decreto 1072 / Decreto 768 de 2022",
      'peligros_prioritarios' => inherent_hazards,
      'estandares_aplicables' => emp['estandaresAplicables'] || 60,
      'normatividad_clave' => 'Decreto 1072 de 2015 (Libro 2, Parte 2, Título 4, Cap. 6), Res. 0312 de 2019, Guía GTC 45'
    },
    'key_stakeholders' => ['Clientes comerciales', 'Colaboradores directos y contratistas', "ARL #{emp['arl'] || 'Positiva'}", 'Ministerio del Trabajo', 'Proveedores de insumos y mantenimiento'],
    'generated_at' => now_iso
  }

  # 2. BLOQUE 2: MAPA DE PROCESOS
  pmap_id = "pmap-#{emp_id}-01"
  db['process_maps'] << {
    'id' => pmap_id,
    'tenant_id' => emp_id,
    'version' => 'v1.0',
    'status' => 'Vigente',
    'approved_by' => emp['representanteLegal'] || 'Gerencia General',
    'approved_at' => now_iso,
    'createdAt' => now_iso,
    'updatedAt' => now_iso
  }

  # 3. BLOQUE 3: CREACIÓN DE CARGOS MAESTROS (job_positions)
  # Obtenemos los cargos de los trabajadores existentes de esta empresa
  trabs = (db['trabajadores'] || []).select { |t| t['companyId'] == emp_id }
  job_positions_for_emp = {}

  cargos_base = trabs.map { |t| t['cargo'].to_s.strip }.reject(&:empty?).uniq
  if cargos_base.empty?
    cargos_base = ['Gerente General', 'Coordinador SST', 'Operario de Producción', 'Mecánico de Mantenimiento']
  end

  cargos_base.each_with_index do |ctitle, cidx|
    jid = "jp-#{emp_id}-#{cidx + 1}"
    clower = ctitle.downcase
    level = if clower.include?('gerente')
      'Directivo'
    elsif clower.include?('coordinador') || clower.include?('ingeniero') || clower.include?('diseñador')
      'Profesional'
    elsif clower.include?('técnico') || clower.include?('asistente')
      'Tecnico'
    else
      'Operativo'
    end

    education = if level == 'Directivo' || level == 'Profesional'
      'Profesional Universitario o Posgrado en áreas afines'
    elsif level == 'Tecnico'
      'Tecnólogo o Técnico Laboral en el área'
    else
      'Bachiller Académico o Básica Secundaria con experiencia'
    end

    epp_list = if level == 'Operativo'
      ['Casco de seguridad dieléctrico con barbuquejo', 'Gafas de seguridad con filtro UV y antiempañante', 'Botas de seguridad con puntera de acero/composite', 'Guantes de protección mecánica/vaqueta', 'Protección auditiva tipo copa o inserción']
    elsif level == 'Tecnico'
      ['Casco dieléctrico', 'Gafas de seguridad', 'Botas de seguridad dieléctricas', 'Guantes de precisión']
    else
      ['Casco de seguridad para visitas a planta', 'Gafas de protección', 'Botas de seguridad']
    end

    job_obj = {
      'id' => jid,
      'tenant_id' => emp_id,
      'code' => "CARG-#{format('%03d', cidx + 1)}",
      'title' => ctitle,
      'hierarchy_level' => level,
      'parent_job_position_id' => level == 'Directivo' ? nil : "jp-#{emp_id}-1",
      'summary_objective' => "Ejecutar y responder por las responsabilidades operacionales y normativas asignadas al cargo de #{ctitle}, velando por la continuidad del servicio, la calidad y el estricto apego a las normas del SG-SST.",
      'required_education' => education,
      'required_experience' => level == 'Operativo' ? 'Mínimo 1 año en labores afines' : '2 a 3 años de experiencia en cargos similares',
      'required_skills' => ['Trabajo en equipo', 'Compromiso con el autocuidado', 'Disciplina operacional', 'Orientación a resultados'],
      'medical_exams_profesiograma' => {
        'ingreso' => ['Examen médico ocupacional con énfasis osteomuscular', 'Visiometría ocupacional', 'Audiometría tonal'],
        'periodico' => ['Control anual osteomuscular y audiometría ocupacional'],
        'egreso' => ['Valoración médica ocupacional general de retiro laboral']
      },
      'required_epp_list' => epp_list,
      'is_active' => true,
      'createdAt' => now_iso,
      'updatedAt' => now_iso
    }

    db['job_positions'] << job_obj
    job_positions_for_emp[ctitle] = job_obj
  end

  # Vincular cada trabajador con su job_position_id
  trabs.each do |trab|
    cargo_str = trab['cargo'].to_s.strip
    jp = job_positions_for_emp[cargo_str]
    trab['job_position_id'] = jp ? jp['id'] : job_positions_for_emp.values.first&.dig('id')
  end

  # 4. DEFINICIÓN DE PROCESOS Y ACTIVIDADES PHVA
  proc_definitions = []

  # Estratégico 1: DE-01
  proc_definitions << {
    code: 'DE-01',
    name: 'Direccionamiento Estratégico y Gobierno Corporativo',
    type: 'Estrategico',
    objective: 'Establecer la planeación estratégica, políticas organizacionales, asignación presupuestal y directrices gerenciales para garantizar la rentabilidad, sostenibilidad y continuidad del negocio.',
    scope: 'Aplica a todas las sedes, proyectos y unidades de negocio de la organización.',
    leader: job_positions_for_emp['Gerente General'] || job_positions_for_emp.values.find { |j| j['hierarchy_level'] == 'Directivo' } || job_positions_for_emp.values.first,
    activities: [
      { phase: 'Planear', name: 'Definición de Objetivos y Plan de Inversión Anual', desc: 'Formular metas estratégicas anuales, presupuestos y asignación de recursos para la operación y el SG-SST.', in: 'Balance financiero, análisis DOFA, marco regulatorio', out: 'Plan Estratégico y Presupuesto Oficial Aprobado', routine: 'No_Rutinaria', tools: [] },
      { phase: 'Hacer', name: 'Despliegue y Comunicación Directiva', desc: 'Socializar directrices gerenciales y metas organizacionales con líderes de proceso y partes interesadas.', in: 'Plan Estratégico', out: 'Actas de alineación directiva y compromisos', routine: 'Rutinaria', tools: [] },
      { phase: 'Verificar', name: 'Revisión por la Dirección (Decreto 1072 Art. 2.2.4.6.31)', desc: 'Evaluar el desempeño del sistema integral, cumplimiento de metas y eficacia de los controles.', in: 'Informes de gestión, auditorías, estados financieros', out: 'Acta formal de Revisión Gerencial', routine: 'No_Rutinaria', tools: [] },
      { phase: 'Actuar', name: 'Toma de Decisiones y Asignación de Recursos de Mejora', desc: 'Ajustar planes estratégicos y aprobar recursos para proyectos de modernización y mitigación de riesgos.', in: 'Hallazgos de revisión gerencial', out: 'Planes de mejora y reasignación de partidas', routine: 'No_Rutinaria', tools: [] }
    ]
  }

  # Estratégico 2: SG-02
  coord_sst = job_positions_for_emp['Coordinador SST'] || job_positions_for_emp.values.find { |j| j['title'].include?('SST') } || job_positions_for_emp.values.first
  proc_definitions << {
    code: 'SG-02',
    name: 'Gestión Integral del SG-SST y Sostenibilidad Ambiental',
    type: 'Estrategico',
    objective: 'Prevenir incidentes, accidentes y enfermedades de origen laboral mediante la identificación oportuna de peligros, valoración de riesgos (GTC 45) y ejecución del plan de trabajo anual bajo la Resolución 0312 de 2019.',
    scope: 'Cubre el 100% de los trabajadores directos, contratistas, proveedores y visitantes en todas las instalaciones de la empresa.',
    leader: coord_sst,
    activities: [
      { phase: 'Planear', name: 'Elaboración del Plan Anual de Trabajo y Presupuesto SST', desc: 'Diseñar el cronograma normativo anual, programas de vigilancia y capacitaciones reglamentarias.', in: 'Autoevaluación Res. 0312, matriz de peligros previa', out: 'Plan Anual de Trabajo SST firmado por Gerencia', routine: 'No_Rutinaria', tools: [] },
      { phase: 'Hacer', name: 'Ejecución de Inducciones, Inspecciones Preoperacionales y Entrega de EPP', desc: 'Verificar condiciones de seguridad en campo, dotar de EPPs certificados e impartir capacitaciones operacionales.', in: 'Fichas de seguridad, matrices de EPP, inventario', out: 'Registros de entrega de EPP, actas de inducción y planillas', routine: 'Rutinaria', tools: is_och ? ['tool-och-004'] : [] },
      { phase: 'Verificar', name: 'Medición de Indicadores de SST y Auditoría Interna', desc: 'Monitorear indicadores de estructura, proceso y resultado (frecuencia, severidad y ausentismo laboral).', in: 'Reportes de incidentes, estadísticas de nómina', out: 'Tablero de Control de Indicadores SST', routine: 'Rutinaria', tools: [] },
      { phase: 'Actuar', name: 'Implementación de Acciones Correctivas y Preventivas', desc: 'Gestionar no conformidades derivadas de inspecciones, accidentes o auditorías para evitar recurrencias.', in: 'Informes de investigación de accidentes (FURAT)', out: 'Plan de Acciones Correctivas cerrado y verificado', routine: 'Rutinaria', tools: [] }
    ]
  }

  # Misionales
  if is_och
    tolvas_jp = job_positions_for_emp['Operario de Molienda y Tolvas'] || coord_sst
    extrusion_jp = job_positions_for_emp['Operario de Prensas y Extrusión'] || coord_sst
    horno_jp = job_positions_for_emp['Operador de Horno Túnel'] || coord_sst
    despacho_jp = job_positions_for_emp['Operador de Montacargas'] || coord_sst

    proc_definitions << {
      code: 'OP-01',
      name: 'Extracción, Recepción y Molienda de Arcillas',
      type: 'Misional',
      objective: 'Abastecer, dosificar y triturar materias primas minerales garantizando la granulometría y plasticidad requerida para el proceso cerámico.',
      scope: 'Desde el patio de almacenamiento de arcillas hasta las tolvas de alimentación de la nave de molienda.',
      leader: tolvas_jp,
      activities: [
        { phase: 'Planear', name: 'Inspección Preoperacional de Maquinaria y Patios de Acopio', desc: 'Verificar niveles de tolvas, fajas transportadoras, muelas trituradoras y retroexcavadora.', in: 'Plan de producción diario', out: 'Lista de chequeo preoperacional diligenciada', routine: 'Rutinaria', tools: ['tool-och-005'] },
        { phase: 'Hacer', name: 'Alimentación de Tolvas y Desintegración de Bloques de Arcilla', desc: 'Operar maquinaria pesada y trituradores mecánicos para homogenizar el material arcilloso.', in: 'Arcilla en bruto, agua de humectación', out: 'Masa desintegrada con granulometría óptima', routine: 'Rutinaria', tools: ['tool-och-002', 'tool-och-005'] },
        { phase: 'Verificar', name: 'Control de Humedad y Granulometría en Banda', desc: 'Tomar muestras periódicas de arcilla para verificar plasticidad y ausencia de cuerpos extraños.', in: 'Muestra de material triturado', out: 'Ficha de control de calidad de mezcla', routine: 'Rutinaria', tools: ['tool-och-004'] },
        { phase: 'Actuar', name: 'Ajuste de Dosificación de Agua y Despeje de Muelas', desc: 'Regular caudales de aspersión y realizar paradas seguras para desatascar residuos sólidos.', in: 'Alertas de humedad fuera de rango', out: 'Tolvas balanceadas y flujo continuo', routine: 'Rutinaria', tools: [] }
      ]
    }

    proc_definitions << {
      code: 'OP-02',
      name: 'Moldeo, Extrusión y Corte Automatizado de Ladrillo',
      type: 'Misional',
      objective: 'Transformar la masa cerámica en bloques continuos mediante extrusión al vacío y corte milimétrico de precisión.',
      scope: 'Comprende la mezcladora de doble eje, la extrusora de vacío, la mesa de corte y la mesa de estibado.',
      leader: extrusion_jp,
      activities: [
        { phase: 'Planear', name: 'Ajuste de Boquillas y Tensión de Alambres de Corte', desc: 'Calibrar dimensiones del producto según catálogo comercial (Ladrillo tolete, estructural, bloque).', in: 'Orden de producción y especificaciones técnicas', out: 'Cortadora calibrada y verificada', routine: 'Rutinaria', tools: ['tool-och-005'] },
        { phase: 'Hacer', name: 'Extrusión al Vacío, Prensado y Estibado en Carros', desc: 'Operar la línea de extrusión continua garantizando la densidad y geometría de cada pieza verde.', in: 'Masa plástica homogenizada', out: 'Ladrillos verdes estibados en carros de secado', routine: 'Rutinaria', tools: ['tool-och-002', 'tool-och-003'] },
        { phase: 'Verificar', name: 'Inspección Geométrica y Resistencia en Verde', desc: 'Comprobar dimensiones, peso, aristas vivas y consistencia mecánica para evitar deformaciones.', in: 'Piezas recién cortadas', out: 'Planilla de control dimensional conforme', routine: 'Rutinaria', tools: ['tool-och-004'] },
        { phase: 'Actuar', name: 'Reciclaje de Retal y Regulación de Presión de Vacío', desc: 'Reincorporar piezas defectuosas a la tolva y calibrar la bomba de vacío para eliminar burbujas.', in: 'Retal de corte, reportes de deformación', out: 'Línea de extrusión libre de defectos', routine: 'Rutinaria', tools: [] }
      ]
    }

    proc_definitions << {
      code: 'OP-03',
      name: 'Secado Controlado, Enhorne y Cocción en Horno Túnel',
      type: 'Misional',
      objective: 'Deshidratar progresivamente el ladrillo verde y realizar la sinterización térmica en horno túnel continuo a más de 950°C.',
      scope: 'Comprende los túneles de secado rápido, vagonetas refractarias y el horno túnel de 240 metros.',
      leader: horno_jp,
      activities: [
        { phase: 'Planear', name: 'Programación de la Curva de Quema y Ciclos de Avance', desc: 'Establecer rampas de temperatura por zonas (precalentamiento, combustión, enfriamiento rápido y lento).', in: 'Curva térmica estándar, tipo de arcilla', out: 'Parámetros cargados en panel de control HT-240', routine: 'Rutinaria', tools: ['tool-och-001', 'tool-och-004'] },
        { phase: 'Hacer', name: 'Alimentación de Quemadores a Gas y Avance de Vagonetas', desc: 'Monitorear la inyección continua de gas/carbón, tiro forzado y empuje hidráulico de las vagonetas.', in: 'Carros secos listos, suministro energético', out: 'Ladrillo sinterizado con alta resistencia mecánica', routine: 'Rutinaria', tools: ['tool-och-001', 'tool-och-003'] },
        { phase: 'Verificar', name: 'Monitoreo de Termocuplas, Presión de Tiro y Atmósfera del Horno', desc: 'Registrar cada 30 minutos lecturas térmicas en display y validar con termómetro infrarrojo dual.', in: 'Sensores de temperatura del horno túnel', out: 'Bitácora térmica de cocción con firmas operativas', routine: 'Rutinaria', tools: ['tool-och-004'] },
        { phase: 'Actuar', name: 'Modulación de Quemadores y Atención de Desviaciones Térmicas', desc: 'Corregir mezclas aire-gas para evitar manchas de reducción o sobrecocción en las piezas cerámicas.', in: 'Alertas de temperatura fuera de rango', out: 'Horno estabilizado en curva óptima', routine: 'Rutinaria', tools: ['tool-och-001'] }
      ]
    }

    proc_definitions << {
      code: 'OP-04',
      name: 'Deshorne, Control de Calidad, Estibado y Despacho',
      type: 'Misional',
      objective: 'Descargar el producto terminado, clasificar piezas de primera calidad y embalar en estibas para distribución a obras.',
      scope: 'Zona de enfriamiento final, patio de producto terminado y muelles de cargue para camiones.',
      leader: despacho_jp,
      activities: [
        { phase: 'Planear', name: 'Programación de Despachos y Asignación de Bahías de Cargue', desc: 'Organizar pedidos por cliente, tipo de producto, remisiones y especificaciones de flete.', in: 'Órdenes de compra y pedidos comerciales', out: 'Hoja de ruta logística diaria', routine: 'Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Operación Segura de Montacargas y Paletizado con Fleje', desc: 'Movilizar estibas de ladrillo cocido, asegurar con plástico retráctil y cargar vehículos de carga.', in: 'Ladrillo cocido enfriado, estibas de madera', out: 'Vehículos cargados y asegurados para transporte', routine: 'Rutinaria', tools: ['tool-och-003'] },
        { phase: 'Verificar', name: 'Inspección de Resistencia a la Compresión y Tono Cerámico', desc: 'Separar piezas agrietadas o con cocción defectuosa; verificar remisión contra carga física.', in: 'Estibas armadas', out: 'Certificado de calidad del lote y remisión firmada', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Reubicación de Segunda y Notificación de Lotes Aprobados', desc: 'Disponer producto no conforme en zona de liquidación y autorizar salida de camiones en báscula.', in: 'Reporte de producto no conforme', out: 'Inventario de bodega actualizado y despacho cerrado', routine: 'Rutinaria', tools: [] }
      ]
    }
  elsif is_sig
    ing_jp = job_positions_for_emp['Ingeniero Residente de Instalaciones'] || coord_sst
    tec_jp = job_positions_for_emp['Técnico Electricista y Redes'] || coord_sst

    proc_definitions << {
      code: 'OP-01',
      name: 'Estudio Técnico, Diseño y Presupuesto de Instalaciones',
      type: 'Misional',
      objective: 'Diseñar planos eléctricos y memorias de cálculo cumpliendo la norma RETIE y especificaciones técnicas de obra.',
      scope: 'Desde la solicitud del cliente hasta la entrega de la cotización y cronograma de obra.',
      leader: ing_jp,
      activities: [
        { phase: 'Planear', name: 'Levantamiento de Campo y Cálculo de Cargas Eléctricas', desc: 'Inspeccionar instalaciones existentes, medir acometidas y diseñar diagramas unifilares.', in: 'Planos arquitectónicos, requerimientos de obra', out: 'Memoria de cálculo y plano de redes', routine: 'Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Formulación de Presupuesto y Cronograma de Obra', desc: 'Costear materiales certificados, mano de obra especializada y definir hitos de entrega.', in: 'Catálogos RETIE, tarifas comerciales', out: 'Propuesta técnica y económica aprobada', routine: 'Rutinaria', tools: [] },
        { phase: 'Verificar', name: 'Revisión Normativa de Diseños (RETIE / NTC 2050)', desc: 'Validar calibres de conductores, protecciones termomagnéticas y sistemas de puesta a tierra.', in: 'Diseño técnico preliminar', out: 'Plano eléctrico visado y aprobado', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Ajuste de Planos conforme a Observaciones de Interventoría', desc: 'Incorporar requerimientos de los constructores y emitir versión final para ejecución.', in: 'Observaciones de interventoría', out: 'Juego de planos definitivos', routine: 'No_Rutinaria', tools: [] }
      ]
    }

    proc_definitions << {
      code: 'OP-02',
      name: 'Montaje de Redes, Tendido de Tubería e Instalaciones Eléctricas',
      type: 'Misional',
      objective: 'Ejecutar las obras eléctricas en sitio garantizando cero accidentes, conexiones seguras y cumplimiento del cronograma.',
      scope: 'Naves industriales, tableros de distribución, canalizaciones y acometidas de media y baja tensión.',
      leader: tec_jp,
      activities: [
        { phase: 'Planear', name: 'Permiso de Trabajo Eléctrico y Charla de Seguridad de 5 Minutos', desc: 'Evaluar riesgos de arco eléctrico, verificar bloqueo y etiquetado (LOTO) y estado de EPP dieléctrico.', in: 'Matriz GTC 45, orden de trabajo', out: 'Permiso de trabajo seguro en alturas/eléctrico firmado', routine: 'Rutinaria', tools: ['tool-sig-001'] },
        { phase: 'Hacer', name: 'Tendido de Cableado, Ranurado y Montaje de Tableros Eléctricos', desc: 'Instalar tubería EMT/conduit, cablear circuitos de potencia e iluminación y peinar tableros.', in: 'Conductores certificados, canalizaciones', out: 'Redes eléctricas cableadas e instaladas', routine: 'Rutinaria', tools: ['tool-sig-001', 'tool-sig-002'] },
        { phase: 'Verificar', name: 'Pruebas de Aislamiento (Megado) y Continuidad de Redes', desc: 'Medir resistencia de aislamiento entre fases y tierra para prevenir cortocircuitos.', in: 'Circuitos terminados', out: 'Protocolo de pruebas de megado conforme', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Corrección de Empalmes y Rotulado Definitivo de Circuitos', desc: 'Ajustar bornes con torquímetro y colocar marquillas identificadoras en tableros y tomas.', in: 'Hallazgos de inspección', out: 'Instalación rotulada y lista para energización', routine: 'Rutinaria', tools: [] }
      ]
    }
  else
    dis_jp = job_positions_for_emp['Diseñador y Modelador de Mobiliario'] || coord_sst
    cnc_jp = job_positions_for_emp['Ebanista y Operario de Corte CNC'] || coord_sst

    proc_definitions << {
      code: 'OP-01',
      name: 'Diseño, Renderizado y Programación de Corte CNC',
      type: 'Misional',
      objective: 'Modelar planos de fabricación y optimizar cortes de tableros melamínicos e insumos de ensamble.',
      scope: 'Desde el plano arquitectónico hasta la programación de la sierra y centro de mecanizado.',
      leader: dis_jp,
      activities: [
        { phase: 'Planear', name: 'Diseño Técnico y Lista de Despiece de Materiales', desc: 'Modelar planos de fabricación y optimizar cortes de tableros e insumos.', in: 'Requerimientos de cliente', out: 'Orden de producción y planos de ensamble', routine: 'Rutinaria', tools: [] },
        { phase: 'Hacer', name: 'Preparación de Materiales y Calibración de Máquinas', desc: 'Alistar insumos, herramientas y revisar guardas de seguridad antes del mecanizado.', in: 'Materia prima certificada', out: 'Puestos de trabajo dotados y listos', routine: 'Rutinaria', tools: ['tool-mat-001'] },
        { phase: 'Verificar', name: 'Inspección de Calidad de Insumos Recibidos', desc: 'Validar acabados, dimensiones y ausencia de defectos estructurales.', in: 'Materia prima', out: 'Reporte de aceptación de insumos', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Ajuste de Parámetros de Corte y Reordenamiento de Insumos', desc: 'Calibrar cuchillas y reponer materias primas deficientes.', in: 'Desviaciones dimensionales', out: 'Estándar de corte optimizado', routine: 'Rutinaria', tools: ['tool-mat-001'] }
      ]
    }

    proc_definitions << {
      code: 'OP-02',
      name: 'Manufactura, Transformación y Ensamble de Mobiliario',
      type: 'Misional',
      objective: 'Ejecutar las operaciones de corte, mecanizado, unión y acabado garantizando precisión y seguridad laboral.',
      scope: 'Nave de producción, bancos de trabajo y zona de acabados.',
      leader: cnc_jp,
      activities: [
        { phase: 'Planear', name: 'Inspección Preoperacional de Maquinaria y EPP', desc: 'Verificar discos de corte, extractores de viruta y EPP de protección auditiva y respiratoria.', in: 'Hoja de vida de maquinaria', out: 'Lista preoperacional firmada', routine: 'Rutinaria', tools: ['tool-mat-001'] },
        { phase: 'Hacer', name: 'Corte de Precisión, Enrutado y Ensamble Estructural', desc: 'Operar sierras escuadradoras y herramientas neumáticas para conformar el producto final.', in: 'Tableros, herrajes, adhesivos', out: 'Piezas ensambladas con acabado fino', routine: 'Rutinaria', tools: ['tool-mat-001'] },
        { phase: 'Verificar', name: 'Control Dimensional y Resistencia de Uniones', desc: 'Verificar escuadras, tolerancias milimétricas y estabilidad de estructuras.', in: 'Mueble/producto ensamblado', out: 'Checklist de control de calidad final', routine: 'Rutinaria', tools: [] },
        { phase: 'Actuar', name: 'Retoque de Acabados y Embalaje de Protección', desc: 'Aplicar selladores y proteger esquinas con cartón y plástico burbuja para transporte.', in: 'Producto aprobado', out: 'Producto empacado listo para despacho', routine: 'Rutinaria', tools: [] }
      ]
    }
  end

  # Apoyo 1: Talento Humano
  th_jp = job_positions_for_emp['Asistente Administrativa'] || coord_sst
  proc_definitions << {
    code: 'AP-01',
    name: 'Gestión del Talento Humano y Contratación Laboral (CST)',
    type: 'Apoyo',
    objective: 'Administrar el ciclo integral del colaborador (selección, vinculación formal, afiliación a seguridad social, preavisos y bienestar laboral) conforme al Código Sustantivo del Trabajo de Colombia.',
    scope: 'Aplica a todos los aspirantes, trabajadores directos y personal retirado de la organización.',
    leader: th_jp,
    activities: [
      { phase: 'Planear', name: 'Definición de Perfiles de Cargo y Profesiogramas de Ingreso', desc: 'Estructurar requisitos académicos, competencias y exámenes médicos ocupacionales obligatorios (Res. 2346/2007).', in: 'Catálogo de cargos, manual de funciones', out: 'Profesiograma oficial actualizado', routine: 'No_Rutinaria', tools: [] },
      { phase: 'Hacer', name: 'Contratación, Afiliación a Seguridad Social e Inducción', desc: 'Suscribir contrato individual de trabajo, afiliar a EPS, AFP, ARL y Caja de Compensación antes del inicio de labores.', in: 'Documentos del aspirante, examen de ingreso', out: 'Contrato firmado, anexos SST y afiliaciones activas', routine: 'Rutinaria', tools: [] },
      { phase: 'Verificar', name: 'Control de Vencimientos Contractuales y Alertas CST (Art. 46)', desc: 'Monitorear fechas de culminación de contratos a término fijo y emitir preavisos legales con 30 días de anticipación.', in: 'Base de datos de contratos', out: 'Cartas de preaviso o actas de prórroga emitidas', routine: 'Rutinaria', tools: [] },
      { phase: 'Actuar', name: 'Liquidación Final y Práctica de Examen Médico de Egreso', desc: 'Expedir orden de examen ocupacional de retiro y cancelar liquidación definitiva de prestaciones sociales.', in: 'Paz y salvo laboral, entrega de puesto', out: 'Liquidación salarial pagada y certificado de examen', routine: 'Rutinaria', tools: [] }
    ]
  }

  # Apoyo 2: Mantenimiento
  maint_jp = job_positions_for_emp['Mecánico de Mantenimiento'] || job_positions_for_emp['Técnico Electricista y Redes'] || coord_sst
  proc_definitions << {
    code: 'AP-02',
    name: 'Mantenimiento Preventivo y Correctivo de Maquinaria y Equipos',
    type: 'Apoyo',
    objective: 'Asegurar la máxima disponibilidad, confiabilidad y seguridad intrínseca de los equipos productivos mediante lubricación, calibración y planes de mantenimiento preventivo.',
    scope: 'Toda la maquinaria industrial, herramientas manuales, eléctricas, neumáticas e instalaciones locativas.',
    leader: maint_jp,
    activities: [
      { phase: 'Planear', name: 'Formulación del Plan Maestro de Mantenimiento y Calibraciones', desc: 'Definir periodicidad, fichas técnicas y repuestos críticos para cada equipo del inventario.', in: 'Manuales de fabricante, inventario tools_inventory', out: 'Cronograma anual de mantenimiento preventivo', routine: 'No_Rutinaria', tools: is_och ? ['tool-och-005'] : [] },
      { phase: 'Hacer', name: 'Ejecución de Rutinas de Lubricación, Engrase y Ajustes Mecánicos', desc: 'Aplicar procedimientos de bloqueo/tarjeteo LOTO y realizar intervenciones técnicas preventivas.', in: 'Órdenes de trabajo, lubricantes, repuestos', out: 'Bitácora técnica de mantenimiento diligenciada', routine: 'Rutinaria', tools: is_och ? ['tool-och-002', 'tool-och-003', 'tool-och-005'] : [] },
      { phase: 'Verificar', name: 'Pruebas de Arranque en Vacío e Inspección Térmica', desc: 'Medir vibración, consumo eléctrico y temperatura en rodamientos para certificar operatividad.', in: 'Equipos intervenidos', out: 'Acta de entrega conforme al área operativa', routine: 'Rutinaria', tools: is_och ? ['tool-och-004'] : [] },
      { phase: 'Actuar', name: 'Actualización de Hoja de Vida y Reprogramación de Próxima Fecha', desc: 'Registrar la intervención en tools_interventions_log y actualizar next_date en tools_maintenance_plan.', in: 'Reporte de trabajo finalizado', out: 'Hoja de vida de la herramienta actualizada', routine: 'Rutinaria', tools: [] }
    ]
  }

  # Evaluación: Auditoría
  proc_definitions << {
    code: 'EV-01',
    name: 'Auditoría Interna, Rendición de Cuentas y Mejora Continua',
    type: 'Evaluacion',
    objective: 'Evaluar sistemáticamente la conformidad del SG-SST y los procesos corporativos frente a la Resolución 0312 de 2019, generando acciones preventivas y de mejora.',
    scope: 'Todos los procesos estratégicos, misionales y de apoyo de la organización.',
    leader: coord_sst,
    activities: [
      { phase: 'Planear', name: 'Programa y Plan de Auditorías Internas Anuales', desc: 'Establecer alcance, criterios de auditoría y equipo auditor competente e independiente.', in: 'Procedimiento de auditoría, estándares mínimos', out: 'Plan de auditoría formalizado y comunicado', routine: 'No_Rutinaria', tools: [] },
      { phase: 'Hacer', name: 'Ejecución de Auditoría en Campo y Revisión Documental', desc: 'Verificar evidencias físicas y digitales en plataforma, entrevistar personal y registrar hallazgos.', in: 'Listas de verificación Res. 0312, evidencias', out: 'Libro de notas de auditoría y registros fotográficos', routine: 'Rutinaria', tools: [] },
      { phase: 'Verificar', name: 'Informe Oficial de Auditoría y Clasificación de Hallazgos', desc: 'Emitir dictamen con conformidades, no conformidades mayores, menores y oportunidades de mejora.', in: 'Hallazgos consolidados', out: 'Informe de Auditoría Interna entregado a Gerencia', routine: 'No_Rutinaria', tools: [] },
      { phase: 'Actuar', name: 'Formulación y Cierre de Planes de Acción', desc: 'Hacer seguimiento al cierre de causas raíz y validar la eficacia de las soluciones adoptadas.', in: 'Planes de acción propuestos', out: 'Certificado de cierre de no conformidades', routine: 'Rutinaria', tools: [] }
    ]
  }

  # Guardar procesos y actividades
  proc_definitions.each_with_index do |pdef, pidx|
    pid = "proc-#{emp_id}-#{pdef[:code].downcase.gsub(/[^a-z0-9]/, '')}"
    leader = pdef[:leader]

    proc_obj = {
      'id' => pid,
      'tenant_id' => emp_id,
      'process_map_id' => pmap_id,
      'code' => pdef[:code],
      'name' => pdef[:name],
      'process_type' => pdef[:type],
      'objective' => pdef[:objective],
      'scope' => pdef[:scope],
      'leader_job_position_id' => leader['id'],
      'leader_title' => leader['title'],
      'createdAt' => now_iso,
      'updatedAt' => now_iso
    }
    db['processes'] << proc_obj

    pdef[:activities].each_with_index do |act_def, act_idx|
      act_id = "act-#{pid}-#{act_idx + 1}"
      act_obj = {
        'id' => act_id,
        'tenant_id' => emp_id,
        'process_id' => pid,
        'phva_phase' => act_def[:phase],
        'activity_order' => act_idx + 1,
        'activity_name' => act_def[:name],
        'description' => act_def[:desc],
        'inputs' => act_def[:in],
        'outputs' => act_def[:out],
        'routine_type' => act_def[:routine],
        'associated_tools_ids' => act_def[:tools] || [],
        'createdAt' => now_iso,
        'updatedAt' => now_iso
      }
      db['process_activities'] << act_obj

      # Relación pivote con cargo ejecutor/supervisor
      pap_id = "pap-#{act_id}-#{leader['id']}"
      db['process_activity_positions'] << {
        'id' => pap_id,
        'tenant_id' => emp_id,
        'process_activity_id' => act_id,
        'job_position_id' => leader['id'],
        'role_in_activity' => act_def[:phase] == 'Verificar' ? 'Supervisor' : 'Responsable_Ejecutor',
        'createdAt' => now_iso,
        'updatedAt' => now_iso
      }
    end
  end

  # 5. BLOQUE 4: CONEXIÓN CON MATRIZ GTC 45 (gtc45_risk_matrices)
  # Vincular filas existentes de la matriz con los procesos y actividades generados
  matriz_emp = (db['matriz'] || []).select { |m| m['companyId'] == emp_id }
  procs_emp = db['processes'].select { |p| p['tenant_id'] == emp_id }
  acts_emp = db['process_activities'].select { |pa| pa['tenant_id'] == emp_id }

  matriz_emp.each_with_index do |mrow, midx|
    # Asociar inteligentemente según texto
    m_proc_text = mrow['proceso'].to_s.downcase
    matched_proc = procs_emp.find { |p| m_proc_text.include?(p['name'].downcase[0..10]) } || procs_emp.find { |p| p['process_type'] == 'Misional' } || procs_emp.first
    matched_act = acts_emp.find { |a| a['process_id'] == matched_proc['id'] } || acts_emp.first

    mrow['process_id'] = matched_proc ? matched_proc['id'] : nil
    mrow['process_activity_id'] = matched_act ? matched_act['id'] : nil
    
    # Cargos expuestos extraídos de los que ejecutan esa actividad
    paps = db['process_activity_positions'].select { |p| p['process_activity_id'] == matched_act['id'] }
    mrow['exposed_job_positions'] = paps.map { |p| p['job_position_id'] }.uniq
    if mrow['exposed_job_positions'].empty? && matched_proc
      mrow['exposed_job_positions'] = [matched_proc['leader_job_position_id']].compact
    end
  end

  puts "✓ #{razon}: #{proc_definitions.size} procesos, #{job_positions_for_emp.size} cargos configurados."
end

File.open(DB_FILE, 'w:UTF-8') { |f| f.write(JSON.pretty_generate(db)) }
puts "\n🎉 Base de datos actualizada con éxito en #{DB_FILE}."
