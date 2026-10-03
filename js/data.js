// =============================================================================
// CATÁLOGOS OFICIALES Y DATOS INICIALES - SG-SST COLOMBIA
// Normatividad: Resolución 0312 de 2019 & Decreto 1072 de 2015
// =============================================================================

export const CLASIFICACION_PELIGROS_GTC45 = {
  "Biológico": [
    "Virus", "Bacterias", "Hongos", "Rickettsias", "Parásitos", "Picaduras", "Mordeduras", "Fluidos o excrementos"
  ],
  "Físico": [
    "Ruido (impacto, intermitente, continuo)",
    "Iluminación (luz visible por exceso o deficiencia)",
    "Vibración (cuerpo entero, segmentaria)",
    "Temperaturas extremas (calor, frío)",
    "Presión atmosférica (normal y ajustada)",
    "Radiaciones ionizantes (rayos x, gama, beta y alfa)",
    "Radiaciones no ionizantes (láser, ultravioleta, infrarroja, radiofrecuencia, microondas)"
  ],
  "Químico": [
    "Polvos orgánicos e inorgánicos",
    "Fibras",
    "Líquidos (nieblas y rocíos)",
    "Gases y vapores",
    "Humos metálicos y no metálicos",
    "Material particulado"
  ],
  "Psicosocial": [
    "Gestión organizacional (estilo de mando, pago, contratación, participación, inducción y capacitación)",
    "Características de la organización del trabajo (comunicación, tecnología, demandas cualitativas y cuantitativas)",
    "Características del grupo social de trabajo (clima de relaciones, cohesión, calidad de interacciones, trabajo en equipo)",
    "Condiciones de la tarea (carga mental, contenido de la tarea, demandas emocionales, sistemas de control, definición de roles, monotonía)",
    "Interfase persona-tarea (adecuación de la capacidad del trabajador, motivación, reconocimiento, identificación de la persona con la tarea)",
    "Jornada de trabajo (pausas, trabajo nocturno, rotación, jornadas extenuantes, horas extras, descanso)"
  ],
  "Biomecánico": [
    "Postura (prolongada, mantenida, forzada, antigravitacional)",
    "Esfuerzo",
    "Movimiento repetitivo",
    "Manipulación manual de cargas"
  ],
  "Condiciones de Seguridad": [
    "Mecánico (elementos o partes de máquinas, herramientas, equipos, piezas a trabajar, materiales proyectados)",
    "Eléctrico (alta y baja tensión, estática)",
    "Locativo (almacenamiento, superficies de trabajo irregulares, deslizantes, desorden, caída de objetos)",
    "Tecnológico (explosión, fuga, derrame, incendio)",
    "Accidentes de tránsito",
    "Públicos (robos, atracos, asaltos, atentados, de orden público)",
    "Trabajo en alturas",
    "Espacios confinados"
  ],
  "Fenómenos Naturales": [
    "Sismo", "Terremoto", "Vendaval", "Inundación", "Derrumbe", "Precipitaciones (lluvias, granizadas, heladas)"
  ]
};

// =============================================================================
// ESTÁNDARES MÍNIMOS RESOLUCIÓN 0312 DE 2019
// =============================================================================
export const ESTANDARES_RES_0312 = [
  // ---------------- CICLO I: PLANEAR (RECURSOS - 10%) ----------------
  // 1.1 Recursos financieros, humanos, técnicos y de otra índole (4%)
  {
    numeral: "1.1.1.1",
    ciclo: "PLANEAR",
    estandar: "Recursos financieros, humanos, técnicos y de otra índole",
    criterio: "Profesional en SST o con especialización en SST (certificados de acta de grado y diploma).",
    modoVerificacion: "Solicitar y verificar soportes académicos de formación del responsable del SG-SST: acta de grado y diploma de profesional o especialista en Seguridad y Salud en el Trabajo.",
    peso60: 0.5 / 3,
    aplica21: true,
    peso21: 4.0 / 3,
    aplica7: true,
    peso7: 10.0 / 3
  },
  {
    numeral: "1.1.1.2",
    ciclo: "PLANEAR",
    estandar: "Recursos financieros, humanos, técnicos y de otra índole",
    criterio: "Licencia vigente de SST.",
    modoVerificacion: "Constatar copia legible de la Licencia vigente en Seguridad y Salud en el Trabajo del responsable del SG-SST expedida por la Secretaría de Salud departamental o distrital.",
    peso60: 0.5 / 3,
    aplica21: true,
    peso21: 4.0 / 3,
    aplica7: true,
    peso7: 10.0 / 3
  },
  {
    numeral: "1.1.1.3",
    ciclo: "PLANEAR",
    estandar: "Recursos financieros, humanos, técnicos y de otra índole",
    criterio: "Asignación y responsable del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST): Acta de nombramiento firmada por el representante legal y responsable profesional SST.",
    modoVerificacion: "Cargar y verificar el ACTA DE NOMBRAMIENTO DEL RESPONSABLE DEL SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST), debidamente firmada por el representante legal y por el profesional responsable de SST.",
    peso60: 0.5 / 3,
    aplica21: true,
    peso21: 4.0 / 3,
    aplica7: true,
    peso7: 10.0 / 3
  },
  {
    numeral: "1.1.2.1",
    ciclo: "PLANEAR",
    estandar: "Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo – SG-SST",
    criterio: "1) Responsabilidades para la alta dirección.",
    modoVerificacion: "Solicitar el soporte documental donde se definan y asignen formalmente las responsabilidades en SST a la Alta Dirección.",
    peso60: 0.5 / 6,
    aplica21: true,
    peso21: 4.0 / 6,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.2.2",
    ciclo: "PLANEAR",
    estandar: "Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo – SG-SST",
    criterio: "2) Responsabilidades para el COPASST.",
    modoVerificacion: "Solicitar el soporte documental con la definición de responsabilidades y funciones del Comité Paritario de SST o Vigía de SST.",
    peso60: 0.5 / 6,
    aplica21: true,
    peso21: 4.0 / 6,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.2.3",
    ciclo: "PLANEAR",
    estandar: "Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo – SG-SST",
    criterio: "3) Responsabilidades para el Comité de Convivencia.",
    modoVerificacion: "Verificar el documento formal donde se establezcan las funciones y responsabilidades del Comité de Convivencia Laboral.",
    peso60: 0.5 / 6,
    aplica21: true,
    peso21: 4.0 / 6,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.2.4",
    ciclo: "PLANEAR",
    estandar: "Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo – SG-SST",
    criterio: "4) Responsabilidades para los brigadistas.",
    modoVerificacion: "Solicitar el soporte documental con la asignación de funciones y responsabilidades de los brigadistas en el Plan de Emergencias.",
    peso60: 0.5 / 6,
    aplica21: true,
    peso21: 4.0 / 6,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.2.5",
    ciclo: "PLANEAR",
    estandar: "Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo – SG-SST",
    criterio: "5) Responsabilidad de los trabajadores.",
    modoVerificacion: "Constatar la definición formal de los deberes y responsabilidades de todos los trabajadores.",
    peso60: 0.5 / 6,
    aplica21: true,
    peso21: 4.0 / 6,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.2.6",
    ciclo: "PLANEAR",
    estandar: "Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo – SG-SST",
    criterio: "Evidencia y soporte de la socialización de las responsabilidades asignadas.",
    modoVerificacion: "Evidencia documental firmada por los trabajadores de la recepción y socialización de sus responsabilidades en SST.",
    peso60: 0.5 / 6,
    aplica21: true,
    peso21: 4.0 / 6,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.3",
    ciclo: "PLANEAR",
    estandar: "Recursos financieros, humanos, técnicos y de otra índole",
    criterio: "Asignación de recursos financieros, técnicos, humanos y físicos para el diseño, implementación y mantenimiento del SG-SST.",
    modoVerificacion: "Presupuesto anual del SG-SST aprobado y firmado por el representante legal, con evidencia de ejecución periódica.",
    peso60: 0.5,
    aplica21: true,
    peso21: 4.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.4",
    ciclo: "PLANEAR",
    estandar: "Afiliación al Sistema General de Riesgos Laborales",
    criterio: "Afiliación al Sistema General de Riesgos Laborales (ARL, EPS, AFP) de todos los trabajadores de la empresa según normativa vigente.",
    modoVerificacion: "Planillas integradas de liquidación de aportes (PILA) de los últimos meses de todo el personal vinculado.",
    peso60: 0.5,
    aplica21: true,
    peso21: 4.0,
    aplica7: true,
    peso7: 15.0
  },
  {
    numeral: "1.1.5",
    ciclo: "PLANEAR",
    estandar: "Identificación de trabajadores de alto riesgo y pensión especial",
    criterio: "Identificación de trabajadores que se dediquen en forma permanente a actividades de alto riesgo y cotización del monto especial de pensión.",
    modoVerificacion: "Matriz de identificación de cargos de alto riesgo (Decreto 2090/2003) y pagos correspondientes en planilla PILA.",
    peso60: 0.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.6",
    ciclo: "PLANEAR",
    estandar: "Conformación del COPASST o Vigía de SST",
    criterio: "Conformación y funcionamiento del Comité Paritario de SST (COPASST) o designación del Vigía de SST según número de trabajadores.",
    modoVerificacion: "Actas de votación, escrutinio, conformación del COPASST y actas de reuniones mensuales ordinarias.",
    peso60: 0.5,
    aplica21: true,
    peso21: 4.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.7",
    ciclo: "PLANEAR",
    estandar: "Capacitación de los integrantes del COPASST o Vigía",
    criterio: "Capacitación de los integrantes del COPASST o Vigía de SST en sus funciones y responsabilidades legales.",
    modoVerificacion: "Soportes de capacitación formal o virtual brindada por la ARL o el responsable de SST al comité.",
    peso60: 0.5,
    aplica21: true,
    peso21: 4.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.1.8",
    ciclo: "PLANEAR",
    estandar: "Conformación del Comité de Convivencia Laboral",
    criterio: "Conformación y funcionamiento del Comité de Convivencia Laboral de acuerdo con la Resolución 652 de 2012.",
    modoVerificacion: "Acta de conformación, actas de reuniones trimestrales ordinarias e informes de gestión confidenciales.",
    peso60: 0.5,
    aplica21: true,
    peso21: 4.0,
    aplica7: false,
    peso7: 0
  },
  // 1.2 Capacitación en el SG-SST (6%)
  {
    numeral: "1.2.1",
    ciclo: "PLANEAR",
    estandar: "Programa de Capacitación en SST",
    criterio: "Programa de Capacitación Anual en SST que incluye inducción, reinducción y temas de riesgos prioritarios.",
    modoVerificacion: "Cronograma anual de capacitaciones aprobado con indicadores de cobertura y evaluación de eficacia.",
    peso60: 2.0,
    aplica21: true,
    peso21: 4.0,
    aplica7: true,
    peso7: 15.0
  },
  {
    numeral: "1.2.2",
    ciclo: "PLANEAR",
    estandar: "Inducción y Reinducción en SG-SST",
    criterio: "Inducción y reinducción en SG-SST y actividades de Promoción y Prevención (PyP) a todos los trabajadores independientemente de su forma de contratación.",
    modoVerificacion: "Registros de inducción y reinducción firmados por los trabajadores con evaluación de conocimiento.",
    peso60: 2.0,
    aplica21: true,
    peso21: 4.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "1.2.3",
    ciclo: "PLANEAR",
    estandar: "Responsables del SG-SST con curso virtual de 50 horas",
    criterio: "Responsable del SG-SST cuenta con el curso de 50 horas de capacitación virtual del Ministerio del Trabajo o su actualización de 20 horas.",
    modoVerificacion: "Certificado del curso virtual de 50 o 20 horas emitido por entidad autorizada.",
    peso60: 2.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },

  // ---------------- CICLO I: PLANEAR (GESTIÓN INTEGRAL - 15%) ----------------
  {
    numeral: "2.1.1",
    ciclo: "PLANEAR",
    estandar: "Política de Seguridad y Salud en el Trabajo",
    criterio: "Política de SST documentada, firmada por el representante legal, comunicada al COPASST y a los trabajadores, con fecha de actualización anual.",
    modoVerificacion: "Documento de la política, evidencia de divulgación física o virtual y fecha de firma.",
    peso60: 1.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.2.1",
    ciclo: "PLANEAR",
    estandar: "Objetivos del SG-SST",
    criterio: "Objetivos de SST definidos, medibles, cuantificables, coherentes con la política y evaluados periódicamente.",
    modoVerificacion: "Revisar los objetivos formulados, metas e indicadores asociados.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.3.1",
    ciclo: "PLANEAR",
    estandar: "Evaluación inicial del SG-SST",
    criterio: "Evaluación inicial del SG-SST conforme a la Resolución 0312 de 2019 para identificar prioridades.",
    modoVerificacion: "Formato de autoevaluación diligenciado y suscrito por el responsable y representante legal.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.4.1",
    ciclo: "PLANEAR",
    estandar: "Plan Anual de Trabajo",
    criterio: "Plan Anual de Trabajo firmado por el representante legal y responsable del SG-SST, con objetivos, metas, cronograma y recursos asignados.",
    modoVerificacion: "Documento del plan anual de trabajo y seguimiento al porcentaje de cumplimiento de actividades programadas.",
    peso60: 2.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: true,
    peso7: 15.0
  },
  {
    numeral: "2.5.1",
    ciclo: "PLANEAR",
    estandar: "Conservación de la documentación",
    criterio: "Archivo y retención documental del SG-SST garantizando conservación mínima por 20 años de historias clínicas, mediciones y exámenes.",
    modoVerificacion: "Procedimiento de archivo documental, inventario de carpetas y soportes de custodia técnica.",
    peso60: 2.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.6.1",
    ciclo: "PLANEAR",
    estandar: "Rendición de cuentas",
    criterio: "Rendición de cuentas sobre el desempeño de SST a todos los niveles de la organización al menos una vez al año.",
    modoVerificacion: "Informes anuales de rendición de cuentas presentados ante la gerencia con plan de mejora.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.7.1",
    ciclo: "PLANEAR",
    estandar: "Normatividad nacional vigente y aplicable en materia de SST",
    criterio: "Matriz legal actualizada con las normas del Sistema General de Riesgos Laborales aplicables a la empresa.",
    modoVerificacion: "Matriz legal con normas generales y específicas del sector, evidencia de cumplimiento y revisión anual.",
    peso60: 2.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.8.1",
    ciclo: "PLANEAR",
    estandar: "Mecanismos de comunicación",
    criterio: "Mecanismos eficaces de comunicación interna y externa relativos a Seguridad y Salud en el Trabajo.",
    modoVerificacion: "Canales de comunicación definidos (buzón, correos, carteleras, app) y registros de PQRS en SST.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.9.1",
    ciclo: "PLANEAR",
    estandar: "Adquisiciones",
    criterio: "Procedimiento para adquisición de bienes, productos y servicios identificando requisitos de SST.",
    modoVerificacion: "Fichas técnicas y criterios de compra en SST para insumos, EPP, sustancias químicas o maquinaria.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.10.1",
    ciclo: "PLANEAR",
    estandar: "Contratación",
    criterio: "Evaluación y selección de proveedores y contratistas con criterios de SST.",
    modoVerificacion: "Manual de contratistas, fichas de verificación de afiliación a seguridad social e inducción previa.",
    peso60: 2.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "2.11.1",
    ciclo: "PLANEAR",
    estandar: "Gestión del cambio",
    criterio: "Evaluación del impacto de cambios internos y externos en el Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST.",
    modoVerificacion: "Procedimiento documentado y registros de análisis de cambios (procesos, instalaciones, equipos).",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },

  // ---------------- CICLO II: HACER (GESTIÓN DE LA SALUD - 20%) ----------------
  // 3.1 Condiciones de salud en el trabajo (9%)
  {
    numeral: "3.1.1",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Descripción sociodemográfica – Diagnóstico de condiciones de salud de los trabajadores.",
    modoVerificacion: "Documento consolidado de perfil sociodemográfico y diagnóstico de condiciones de salud anual.",
    peso60: 1.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: true,
    peso7: 15.0
  },
  {
    numeral: "3.1.2",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Actividades de Promoción y Prevención en Salud y Medicina del Trabajo.",
    modoVerificacion: "Cronograma de pausas activas, jornadas de vacunación, estilos de vida saludable y prevención.",
    peso60: 1.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.1.3",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Información al médico de los perfiles de cargo y profesiograma.",
    modoVerificacion: "Profesiograma actualizado y evidencia de remisión a la IPS médica ocupacional.",
    peso60: 1.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.1.4",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Realización de Evaluaciones Médicas Ocupacionales (ingreso, periódicas, retiro) acorde con peligros.",
    modoVerificacion: "Certificados de aptitud médica laboral emitidos por médico especialista en SST.",
    peso60: 1.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.1.5",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Custodia de las historias clínicas ocupacionales a cargo del médico de la IPS o especialista.",
    modoVerificacion: "Constancia de custodia de historias clínicas por la IPS médica laboral con licencia vigente.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.1.6",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Restricciones y recomendaciones médico-laborales comunicadas oportunamente a la empresa.",
    modoVerificacion: "Matriz de seguimiento a recomendaciones médico-laborales y adaptaciones de puestos de trabajo.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.1.7.1",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Política de prevención y consumo de tabaco, alcohol y sustancias psicoactivas, firmada por el empleador.",
    modoVerificacion: "Documento formal de la Política de prevención y consumo de tabaco, alcohol y SPA debidamente firmado y divulgado.",
    peso60: 0.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.1.7.2",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Programa de estilos de vida y entornos saludables (Prevención y Promoción de salud Pública).",
    modoVerificacion: "Documento del programa con cronograma de capacitaciones y campañas de hábitos saludables.",
    peso60: 0.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.1.8",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Servicios de agua potable, servicios sanitarios adecuados y disposición de basuras.",
    modoVerificacion: "Inspecciones de saneamiento básico, análisis físico-químicos del agua y contrato de recolección.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.1.9",
    ciclo: "HACER",
    estandar: "Condiciones de salud en el trabajo",
    criterio: "Eliminación adecuada de residuos sólidos, líquidos o gaseosos cumpliendo normas ambientales.",
    modoVerificacion: "Plan de Gestión Integral de Residuos (PGIR) y certificados de disposición final ambiental.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  // 3.2 Registro, reporte e investigación de ATEL (5%)
  {
    numeral: "3.2.1",
    ciclo: "HACER",
    estandar: "Registro, reporte e investigación de ATEL",
    criterio: "Reporte de los Accidentes de Trabajo y Enfermedad Laboral a la ARL, EPS y Dirección Territorial del Ministerio de Trabajo.",
    modoVerificacion: "Formularios de reporte FURAT y FUREL con radicado de envío oportuno (2 días hábiles).",
    peso60: 2.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.2.2",
    ciclo: "HACER",
    estandar: "Registro, reporte e investigación de ATEL",
    criterio: "Investigación de todos los incidentes y accidentes de trabajo con participación del COPASST en los 15 días posteriores.",
    modoVerificacion: "Informes de investigación de accidentes conforme a la Resolución 1401/2007 con plan de acción.",
    peso60: 2.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.2.3",
    ciclo: "HACER",
    estandar: "Registro, reporte e investigación de ATEL",
    criterio: "Registro y estadísticas de accidentalidad con indicadores mensuales de frecuencia, severidad y ausentismo.",
    modoVerificacion: "Tablero mensual de indicadores de accidentalidad y enfermedad laboral.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  // 3.3 Mecanismos de vigilancia de las condiciones de salud (6%)
  {
    numeral: "3.3.1",
    ciclo: "HACER",
    estandar: "Mecanismos de vigilancia de las condiciones de salud",
    criterio: "Medición de la frecuencia de la accidentalidad con análisis de variaciones y causas.",
    modoVerificacion: "Ficha técnica del indicador de frecuencia de accidentes de trabajo con cálculo mensual.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.3.2",
    ciclo: "HACER",
    estandar: "Mecanismos de vigilancia de las condiciones de salud",
    criterio: "Medición de la severidad de la accidentalidad con cálculo de días de incapacidad y cargados.",
    modoVerificacion: "Ficha técnica del indicador de severidad de accidentes de trabajo con cálculo mensual.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.3.3",
    ciclo: "HACER",
    estandar: "Mecanismos de vigilancia de las condiciones de salud",
    criterio: "Medición de la mortalidad por Accidentes de Trabajo.",
    modoVerificacion: "Ficha técnica y cálculo anual del indicador de mortalidad por accidentes de trabajo.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.3.4",
    ciclo: "HACER",
    estandar: "Mecanismos de vigilancia de las condiciones de salud",
    criterio: "Medición de la prevalencia de Enfermedad Laboral.",
    modoVerificacion: "Ficha técnica y cálculo del indicador de prevalencia de enfermedades laborales.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.3.5",
    ciclo: "HACER",
    estandar: "Mecanismos de vigilancia de las condiciones de salud",
    criterio: "Medición de la incidencia de Enfermedad Laboral.",
    modoVerificacion: "Ficha técnica y cálculo del indicador de incidencia de nuevas enfermedades laborales.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "3.3.6",
    ciclo: "HACER",
    estandar: "Mecanismos de vigilancia de las condiciones de salud",
    criterio: "Medición del ausentismo laboral por causa médica.",
    modoVerificacion: "Ficha técnica y consolidado mensual de horas de trabajo perdidas por incapacidades médicas.",
    peso60: 1.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },

  // ---------------- CICLO II: HACER (GESTIÓN DE PELIGROS Y RIESGOS - 30%) ----------------
  // 4.1 Identificación de peligros, evaluación y valoración de riesgos (15%)
  {
    numeral: "4.1.1",
    ciclo: "HACER",
    estandar: "Identificación de peligros y valoración de riesgos",
    criterio: "Metodología definida para la identificación de peligros, evaluación y valoración de los riesgos (ej. GTC 45).",
    modoVerificacion: "Procedimiento metodológico de valoración y matriz de peligros actualizada anualmente.",
    peso60: 4.0,
    aplica21: true,
    peso21: 6.0,
    aplica7: true,
    peso7: 15.0
  },
  {
    numeral: "4.1.2",
    ciclo: "HACER",
    estandar: "Identificación de peligros y valoración de riesgos",
    criterio: "Identificación de peligros con participación de todos los niveles de la empresa en centros de trabajo y procesos.",
    modoVerificacion: "Matriz IPERC / GTC 45 completa por proceso y puesto de trabajo con evidencias de participación.",
    peso60: 4.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "4.1.3",
    ciclo: "HACER",
    estandar: "Identificación de peligros y valoración de riesgos",
    criterio: "Identificación y caracterización de sustancias catalogadas como carcinógenas o con toxicidad aguda con FDS - SGA.",
    modoVerificacion: "Inventario de productos químicos y fichas de seguridad bajo el Sistema Globalmente Armonizado.",
    peso60: 3.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "4.1.4",
    ciclo: "HACER",
    estandar: "Identificación de peligros y valoración de riesgos",
    criterio: "Realización mediciones ambientales periódicas (químicos, físicos y biológicos) donde se identifiquen riesgos prioritarios.",
    modoVerificacion: "Informes de higiene industrial con sonometrías, luxometrías o estudios dosimétricos.",
    peso60: 4.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  // 4.2 Medidas de prevención y control para intervenir los peligros/riesgos (15%)
  {
    numeral: "4.2.1",
    ciclo: "HACER",
    estandar: "Medidas de prevención y control",
    criterio: "Implementación de medidas de prevención y control frente a los peligros identificados aplicando jerarquía de controles.",
    modoVerificacion: "Planes de intervención de riesgos ejecutados y verificados en la matriz de peligros.",
    peso60: 2.5,
    aplica21: false,
    peso21: 0,
    aplica7: true,
    peso7: 15.0
  },
  {
    numeral: "4.2.2",
    ciclo: "HACER",
    estandar: "Medidas de prevención y control",
    criterio: "Verificación de la aplicación de las medidas de prevención y control por parte de los trabajadores.",
    modoVerificacion: "Observaciones de comportamiento y listas de verificación en puestos de trabajo.",
    peso60: 2.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "4.2.3",
    ciclo: "HACER",
    estandar: "Medidas de prevención y control",
    criterio: "Elaboración de procedimientos, instructivos, fichas y protocolos de trabajo seguro para tareas de riesgo.",
    modoVerificacion: "Manuales de procedimientos e instructivos de seguridad y permisos de trabajo firmados.",
    peso60: 2.5,
    aplica21: true,
    peso21: 4.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "4.2.4",
    ciclo: "HACER",
    estandar: "Medidas de prevención y control",
    criterio: "Realización de inspecciones sistemáticas a las instalaciones, maquinaria o equipos con la participación del COPASST.",
    modoVerificacion: "Formatos de inspecciones de seguridad diligenciados con planes de acción y seguimiento.",
    peso60: 2.5,
    aplica21: true,
    peso21: 4.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "4.2.5",
    ciclo: "HACER",
    estandar: "Medidas de prevención y control",
    criterio: "Mantenimiento periódico preventivo y correctivo de instalaciones, equipos, máquinas y herramientas.",
    modoVerificacion: "Programa y hojas de vida de mantenimiento con firmas de técnicos autorizados.",
    peso60: 2.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "4.2.6",
    ciclo: "HACER",
    estandar: "Medidas de prevención y control",
    criterio: "Entrega de Elementos de Protección Personal EPP acorde con la labor, con registro y verificación con contratistas.",
    modoVerificacion: "Formatos de entrega de EPP firmados por los trabajadores y matriz de EPP por cargo.",
    peso60: 2.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },

  // ---------------- CICLO II: HACER (GESTIÓN DE AMENAZAS - 10%) ----------------
  // 5.1 Plan de prevención, preparación y respuesta ante emergencias (10%)
  {
    numeral: "5.1.1",
    ciclo: "HACER",
    estandar: "Plan de prevención, preparación y respuesta ante emergencias",
    criterio: "Se cuenta con el Plan de Prevención, Preparación y Respuesta ante Emergencias con análisis de vulnerabilidad.",
    modoVerificacion: "Documento del plan de emergencias, planos de evacuación, inventario de recursos y simulacros anuales.",
    peso60: 5.0,
    aplica21: true,
    peso21: 5.0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "5.1.2",
    ciclo: "HACER",
    estandar: "Plan de prevención, preparación y respuesta ante emergencias",
    criterio: "Brigada de prevención conformada, capacitada y dotada (primeros auxilios, contraincendios, evacuación).",
    modoVerificacion: "Actas de conformación de la brigada, dotación y constancias de capacitación práctica.",
    peso60: 5.0,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },

  // ---------------- CICLO III: VERIFICAR (VERIFICACIÓN DEL SG-SST - 5%) ----------------
  // 6.1 Gestión y resultados del SG-SST (5%)
  {
    numeral: "6.1.1",
    ciclo: "VERIFICAR",
    estandar: "Gestión y resultados del SG-SST",
    criterio: "Definición de indicadores del SG-SST de acuerdo con las condiciones de la empresa (estructura, proceso y resultado).",
    modoVerificacion: "Fichas técnicas de indicadores con periodicidad, fórmula, metas y seguimiento gráfico.",
    peso60: 1.25,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "6.1.2",
    ciclo: "VERIFICAR",
    estandar: "Gestión y resultados del SG-SST",
    criterio: "La empresa adelanta auditoría por lo menos una vez al año planificada con el COPASST.",
    modoVerificacion: "Programa y plan de auditoría anual, informe final con no conformidades y firmas de los auditores.",
    peso60: 1.25,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "6.1.3",
    ciclo: "VERIFICAR",
    estandar: "Gestión y resultados del SG-SST",
    criterio: "Revisión anual por la alta dirección, resultados y alcance de la auditoría para evaluar eficacia del SG-SST.",
    modoVerificacion: "Acta de revisión por la dirección suscrita con conclusiones y decisiones de asignación de recursos.",
    peso60: 1.25,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "6.1.4",
    ciclo: "VERIFICAR",
    estandar: "Gestión y resultados del SG-SST",
    criterio: "Planificación de auditorías con el COPASST y retroalimentación de los informes de resultados.",
    modoVerificacion: "Acta del COPASST donde conste la retroalimentación y análisis de los informes de auditoría.",
    peso60: 1.25,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },

  // ---------------- CICLO IV: ACTUAR (MEJORAMIENTO - 10%) ----------------
  // 7.1 Acciones preventivas y correctivas (10%)
  {
    numeral: "7.1.1",
    ciclo: "ACTUAR",
    estandar: "Acciones preventivas y correctivas",
    criterio: "Definición e implementación de acciones preventivas y correctivas con base en resultados del SG-SST.",
    modoVerificacion: "Matriz de acciones correctivas, preventivas y de mejora con plan de cierre y verificación de efectividad.",
    peso60: 2.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "7.1.2",
    ciclo: "ACTUAR",
    estandar: "Acciones preventivas y correctivas",
    criterio: "Acciones de mejora conforme a revisión de la alta dirección y recomendaciones del COPASST.",
    modoVerificacion: "Planes de acción derivados de la revisión de la dirección incorporados en el plan anual.",
    peso60: 2.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "7.1.3",
    ciclo: "ACTUAR",
    estandar: "Acciones preventivas y correctivas",
    criterio: "Acciones de mejora con base en investigaciones de accidentes de trabajo y enfermedades laborales.",
    modoVerificacion: "Planes de mejora derivados de lecciones aprendidas e investigaciones de ATEL con seguimiento de cierre.",
    peso60: 2.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  },
  {
    numeral: "7.1.4",
    ciclo: "ACTUAR",
    estandar: "Acciones preventivas y correctivas",
    criterio: "Elaboración Plan de Mejoramiento e implementación de medidas y acciones correctivas solicitadas por autoridades y ARL.",
    modoVerificacion: "Plan de Mejoramiento formulado con cronograma de cumplimiento y radicado ante la ARL si aplica.",
    peso60: 2.5,
    aplica21: false,
    peso21: 0,
    aplica7: false,
    peso7: 0
  }
];

// =============================================================================
// EMPRESAS DE DEMOSTRACIÓN INICIALES
// =============================================================================
export const EMPRESAS_DEMO = [
  {
    id: "emp-1790438946268",
    razonSocial: "LADRILLOS OCHOA LTDA",
    nit: "830124631",
    arl: "Positiva",
    claseRiesgo: "V",
    trabajadores: 45,
    ciudad: "Bogota",
    direccion: "Kilometro 2 Via Mochuelo",
    sector: "Transformacion de arcilla en productos para la construccion",
    responsableSST: "Ing. Ivan David Gonzalez Silva - Licencia: RESOLUCIÓN No. 6514 de 19/10/2022",
    telefono: "3144001787",
    email: "sstmineroambientall8a@gmail.com",
    estandaresAplicables: 60,
    tieneOrganigrama: true,
    tieneMapaProcesos: true,
    createdAt: "2026-09-26T16:09:06.268Z"
  }
];

// =============================================================================
// REGISTROS INICIALES DE MATRIZ GTC 45 (DEMO)
// =============================================================================
export const MATRIZ_RIESGOS_DEMO = [
  {
    id: "gtc-001",
    companyId: "emp-1790438946268",
    proceso: "Producción - Moldeo y Prensado",
    zonaLugar: "Planta de Producción - Línea de Extrusión",
    actividad: "Manipulación y corte de bloques de arcilla",
    tarea: "Alimentación de tolva y estibado de ladrillo verde",
    rutinaria: true,
    peligroClasificacion: "Biomecánico",
    peligroDescripcion: "Levantamiento manual de cargas y posturas forzadas repetitivas",
    efectosPosibles: "Lumbalgias mecánicas, espasmos musculares, lesiones osteomusculares",
    controlesExistentes: "Mesas neumáticas regulables, pausas activas programadas",
    nd: 2,
    ne: 3,
    np: 6,
    nc: 10,
    nr: 60,
    interpretacionNR: "III",
    aceptabilidad: "Mejorable",
    medidasIntervencion: {
      eliminacion: "No aplica",
      sustitucion: "No aplica",
      ingenieria: "Automatización de brazos de transferencia al carro secador",
      administrativos: "Capacitación en técnicas de levantamiento y rotación de puestos",
      epp: "Guantes de vaqueta y faja ergonómica postural"
    },
    fecha: "2026-03-01"
  },
  {
    id: "gtc-002",
    companyId: "emp-1790438946268",
    proceso: "Operativo - Hornos y Quema",
    zonaLugar: "Área de Hornos Tipo Hoffman",
    actividad: "Cargue, quema y descargue de ladrillo cocido",
    tarea: "Control de temperatura y alimentación de combustible",
    rutinaria: true,
    peligroClasificacion: "Físico",
    peligroDescripcion: "Temperaturas extremas (calor radiante) y material particulado de ceniza",
    efectosPosibles: "Deshidratación, golpe de calor, afecciones respiratorias",
    controlesExistentes: "Extractores de aire, ventilación forzada en pasillos, hidratación continua",
    nd: 6,
    ne: 3,
    np: 18,
    nc: 60,
    nr: 1080,
    interpretacionNR: "I",
    aceptabilidad: "No Aceptable",
    medidasIntervencion: {
      eliminacion: "No es posible eliminar el calor del proceso cerámico",
      sustitucion: "No aplica",
      ingenieria: "Apantallamiento térmico y cortinas de aire en bocas de horno",
      administrativos: "Protocolo de aclimatación, descansos en zonas refrigeradas cada 45 min",
      epp: "Respirador N95 para humos/partículas, overol aluminizado y careta térmica"
    },
    fecha: "2026-03-05"
  },
  {
    id: "gtc-003",
    companyId: "emp-1790438946268",
    proceso: "Mantenimiento Electromecánico",
    zonaLugar: "Taller de Molienda y Maquinaria Pesada",
    actividad: "Reparación y ajuste de correas y rodillos desintegradores",
    tarea: "Lubricación y cambio de chumaceras",
    rutinaria: true,
    peligroClasificacion: "Condiciones de Seguridad",
    peligroDescripcion: "Mecánico: Atrapamiento por partes móviles y engranajes sin guarda",
    efectosPosibles: "Amputaciones, fracturas severas, atrapamiento de miembros",
    controlesExistentes: "Procedimiento de Bloqueo y Etiquetado (LOTO) y paradas de emergencia",
    nd: 10,
    ne: 4,
    np: 40,
    nc: 100,
    nr: 4000,
    interpretacionNR: "I",
    aceptabilidad: "No Aceptable",
    medidasIntervencion: {
      eliminacion: "No aplica",
      sustitucion: "No aplica",
      ingenieria: "Instalación de guardas perimetrales con enclavamiento de seguridad",
      administrativos: "Permiso de trabajo en caliente y bloqueo de energía cero",
      epp: "Guantes de protección mecánica nivel 4, gafas de seguridad y calzado dieléctrico"
    },
    fecha: "2026-03-10"
  }
];

// =============================================================================
// PLAN ANUAL DE TRABAJO (PAT) - DEMO
// =============================================================================
export const PLAN_TRABAJO_DEMO = [
  {
    id: "pat-001",
    companyId: "emp-1790438946268",
    ciclo: "PLANEAR",
    actividad: "Elaboración y divulgación de la Política de SST",
    meta: "100% de trabajadores informados y política firmada por gerencia",
    responsable: "Responsable SST y Gerencia General",
    recursos: "Humanos y Administrativos ($250.000)",
    mes: "Enero",
    estado: "Ejecutada",
    cumplimiento: 100,
    evidencia: "Acta de socialización y firmas de los 45 trabajadores"
  },
  {
    id: "pat-002",
    companyId: "emp-1790438946268",
    ciclo: "HACER",
    actividad: "Realización de Evaluaciones Médicas Ocupacionales Periódicas",
    meta: "100% de valoraciones osteomusculares y espirometrías realizadas",
    responsable: "Médico Especialista SST / IPS Proveedora",
    recursos: "Financieros ($2.450.000)",
    mes: "Febrero",
    estado: "Ejecutada",
    cumplimiento: 100,
    evidencia: "Certificados de aptitud médica ocupacional sin restricciones"
  },
  {
    id: "pat-003",
    companyId: "emp-1790438946268",
    ciclo: "HACER",
    actividad: "Capacitación en Riesgo Térmico, Hidratación y Primeros Auxilios",
    meta: "Capacitar a todo el personal de hornos y patio",
    responsable: "Asesor Técnico ARL Positiva",
    recursos: "Técnicos (Auditorio de planta y refrigerio)",
    mes: "Marzo",
    estado: "Ejecutada",
    cumplimiento: 100,
    evidencia: "Planilla de asistencia con 42 firmas de trabajadores"
  },
  {
    id: "pat-004",
    companyId: "emp-1790438946268",
    ciclo: "HACER",
    actividad: "Inspección mensual de orden, aseo y guardas de seguridad",
    meta: "12 inspecciones planeadas al año en planta ladrillera",
    responsable: "COPASST Ladrillos Ochoa",
    recursos: "Lista de chequeo digital",
    mes: "Marzo",
    estado: "Ejecutada",
    cumplimiento: 100,
    evidencia: "Informe de inspección con registro fotográfico de hornos y molinos"
  },
  {
    id: "pat-005",
    companyId: "emp-1790438946268",
    ciclo: "VERIFICAR",
    actividad: "Medición y cálculo de indicadores trimestrales de accidentalidad",
    meta: "Publicación mensual del informe de ATEL y reporte ARL",
    responsable: "Responsable SST",
    recursos: "Software Doctor Pyme",
    mes: "Abril",
    estado: "En Proceso",
    cumplimiento: 50,
    evidencia: "Tablero de indicadores del primer trimestre"
  },
  {
    id: "pat-006",
    companyId: "emp-1790438946268",
    ciclo: "HACER",
    actividad: "Simulacro de evacuación por sismo o emergencia de horno",
    meta: "Capacitar brigada y tiempo de evacuación a punto de encuentro < 3 min",
    responsable: "Comandante de Brigada y Bomberos",
    recursos: "Megáfono, extintores y señalización ($1.200.000)",
    mes: "Mayo",
    estado: "Pendiente",
    cumplimiento: 0,
    evidencia: ""
  }
];

// =============================================================================
// REGISTRO DE ACCIDENTES E INCIDENTES (ATEL) - DEMO
// =============================================================================
export const ACCIDENTES_DEMO = [
  {
    id: "acc-001",
    companyId: "emp-1790438946268",
    fechaEvento: "2026-02-18",
    trabajador: "Julián Esteban Ospina",
    cedula: "1.144.523.890",
    cargo: "Operador de Horno",
    tipoEvento: "Accidente de Trabajo con Incapacidad",
    diasIncapacidad: 3,
    parteCuerpoAfectada: "Mano derecha",
    agenteAccidente: "Bloque cerámico caliente",
    mecanismoAccidente: "Contacto térmico al descargar vagoneta",
    descripcionEvento: "Al manipular un ladrillo recién salido del túnel de enfriamiento sin esperar el tiempo normativo de reposo, presentó quemadura de primer grado en la palma.",
    causaInmediata: "Uso de guantes inadecuados para altas temperaturas",
    causaBasica: "Falta de procedimiento estandarizado para deshorne de vagonetas",
    planAccion: "Dotar de guantes térmicos con certificación EN 407 e instalar termómetro infrarrojo en salida.",
    responsableCierre: "Jefe de Producción",
    fechaCompromiso: "2026-03-01",
    estado: "Cerrado con seguimiento",
    radicadoFurat: "FURAT-POS-2026-89412"
  },
  {
    id: "acc-002",
    companyId: "emp-1790438946268",
    fechaEvento: "2026-03-02",
    trabajador: "Héctor Fabio Ramírez",
    cedula: "71.345.981",
    cargo: "Mecánico de Mantenimiento",
    tipoEvento: "Incidente (Casi-accidente)",
    diasIncapacidad: 0,
    parteCuerpoAfectada: "Ninguna (sin lesión)",
    agenteAccidente: "Llave de copa",
    mecanismoAccidente: "Caída de herramienta desde pasarela superior de molienda",
    descripcionEvento: "Al ajustar la chumacera del molino desintegrador, resbaló una llave de tuerca cayendo sobre la tolva vacía sin alcanzar a personal en piso.",
    causaInmediata: "Herramienta manual sin cordón de aseguramiento en altura",
    causaBasica: "Ausencia de inspección previa de herramientas antes del ascenso a pasarela",
    planAccion: "Dotar a todo mantenimiento con drizas retráctiles portaherramientas y rodapiés en pasarelas.",
    responsableCierre: "Responsable SST",
    fechaCompromiso: "2026-03-12",
    estado: "En Ejecución",
    radicadoFurat: "N/A (Incidente sin lesión)"
  }
];
