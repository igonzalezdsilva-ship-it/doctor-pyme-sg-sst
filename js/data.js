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
    representanteLegal: "Bernardo Ochoa Gómez - C.C. 19.245.890 de Bogotá",
    logoUrl: "./assets/logo.jpg",
    tieneLogo: true,
    tieneOrganigrama: true,
    tieneMapaProcesos: true,
    createdAt: "2026-09-26T16:09:06.268Z",
    acceso: {
      usuario: "sstmineroambientall8a@gmail.com",
      password: "Ochoa2026*",
      estado: "ACTIVO",
      rol: "Administrador Empresa",
      ultimoIngreso: "2026-10-14T15:00:00Z"
    }
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

// =============================================================================
// CATÁLOGO DE TRABAJADORES - LADRILLOS OCHOA S.A.S. (DEMO)
// =============================================================================
export const TRABAJADORES_DEMO = [
  {
    id: "trab-001",
    companyId: "emp-1790438946268",
    cedula: "70.123.456",
    nombre: "Carlos Mario Ochoa",
    cargo: "Gerente General",
    area: "Dirección General",
    correo: "gerencia@ladrillosochoa.com.co",
    telefono: "3104567890",
    fechaIngreso: "2015-01-10",
    estado: "Activo"
  },
  {
    id: "trab-002",
    companyId: "emp-1790438946268",
    cedula: "1.036.945.120",
    nombre: "Andrés Felipe Restrepo",
    cargo: "Coordinador SST",
    area: "Seguridad y Salud en el Trabajo",
    correo: "sst@ladrillosochoa.com.co",
    telefono: "3127894561",
    fechaIngreso: "2022-03-01",
    estado: "Activo"
  },
  {
    id: "trab-003",
    companyId: "emp-1790438946268",
    cedula: "1.144.523.890",
    nombre: "Julián Esteban Ospina",
    cargo: "Operador de Horno Túnel",
    area: "Producción - Cocción",
    correo: "jospina@ladrillosochoa.com.co",
    telefono: "3156543210",
    fechaIngreso: "2020-08-15",
    estado: "Activo"
  },
  {
    id: "trab-004",
    companyId: "emp-1790438946268",
    cedula: "71.345.981",
    nombre: "Héctor Fabio Ramírez",
    cargo: "Mecánico de Mantenimiento",
    area: "Mantenimiento Industrial",
    correo: "hramirez@ladrillosochoa.com.co",
    telefono: "3001234567",
    fechaIngreso: "2018-11-20",
    estado: "Activo"
  },
  {
    id: "trab-005",
    companyId: "emp-1790438946268",
    cedula: "43.876.543",
    nombre: "Martha Lucía Giraldo",
    cargo: "Asistente Administrativa",
    area: "Administración y Talento Humano",
    correo: "mgiraldo@ladrillosochoa.com.co",
    telefono: "3119876543",
    fechaIngreso: "2021-04-05",
    estado: "Activo"
  },
  {
    id: "trab-006",
    companyId: "emp-1790438946268",
    cedula: "98.654.321",
    nombre: "Rodrigo Zapata",
    cargo: "Operador de Montacargas",
    area: "Logística y Patios de Acopio",
    correo: "rzapata@ladrillosochoa.com.co",
    telefono: "3184321098",
    fechaIngreso: "2019-06-12",
    estado: "Activo"
  },
  {
    id: "trab-007",
    companyId: "emp-1790438946268",
    cedula: "1.017.234.567",
    nombre: "Jorge Iván Cárdenas",
    cargo: "Operador de Retroexcavadora",
    area: "Extracción de Arcilla (Cantera)",
    correo: "jcardenas@ladrillosochoa.com.co",
    telefono: "3145678901",
    fechaIngreso: "2017-09-01",
    estado: "Activo"
  },
  {
    id: "trab-008",
    companyId: "emp-1790438946268",
    cedula: "70.987.654",
    nombre: "Wilson Albeiro Henao",
    cargo: "Operario de Molienda y Tolvas",
    area: "Preparación de Pastas Cerámicas",
    correo: "whenao@ladrillosochoa.com.co",
    telefono: "3167890123",
    fechaIngreso: "2021-02-10",
    estado: "Activo"
  },
  {
    id: "trab-009",
    companyId: "emp-1790438946268",
    cedula: "1.020.345.678",
    nombre: "Luis Fernando Duque",
    cargo: "Operario de Prensas y Extrusión",
    area: "Moldeo y Extrusión de Bloque",
    correo: "lduque@ladrillosochoa.com.co",
    telefono: "3132345678",
    fechaIngreso: "2022-09-18",
    estado: "Activo"
  },
  {
    id: "trab-010",
    companyId: "emp-1790438946268",
    cedula: "71.876.543",
    nombre: "Jhon Jairo Tamayo",
    cargo: "Operario de Secaderos y Vagonetas",
    area: "Secado y Enhorne",
    correo: "jtamayo@ladrillosochoa.com.co",
    telefono: "3178901234",
    fechaIngreso: "2023-01-15",
    estado: "Activo"
  }
];

// =============================================================================
// PLAN DE CAPACITACIONES Y EVALUACIONES (DEMO)
// =============================================================================
export const CAPACITACIONES_DEMO = [
  {
    id: "cap-001",
    companyId: "emp-1790438946268",
    tema: "Trabajo Seguro en Alturas y Pasarelas de Hornos (Res. 4272/2021)",
    objetivo: "Prevenir caídas a distinto nivel en mantenimiento de cubiertas, chimeneas y pasarelas de molinos.",
    facilitador: "Asesor Especialista ARL Positiva",
    fecha: "2026-03-20",
    duracion: "4 Horas",
    cupos: 15,
    estado: "Completada",
    materialUrl: "https://docs.google.com/presentation/d/demo_alturas_sst/edit",
    preguntas: [
      {
        pregunta: "¿A partir de qué altura sobre un nivel inferior se considera trabajo en alturas en Colombia según la Res. 4272 de 2021?",
        opciones: ["1.50 metros", "2.00 metros", "1.80 metros", "2.50 metros"],
        respuestaCorrecta: 1,
        justificacion: "La Resolución 4272 de 2021 fija el trabajo en alturas a partir de 2.00 metros sobre el nivel inferior."
      },
      {
        pregunta: "¿Qué componente es indispensable para la detención de caídas junto con el arnés de cuerpo entero?",
        opciones: ["Cinturón de posicionamiento", "Eslinga con absorbedor de energía", "Cuerda de manila", "Guantes de carnaza"],
        respuestaCorrecta: 1,
        justificacion: "La eslinga con absorbedor de impacto disipa la energía cinética protegiendo la columna del operario."
      },
      {
        pregunta: "¿Cada cuánto debe inspeccionarse formalmente un arnés por parte de una persona calificada?",
        opciones: ["Cada 2 años", "Mínimo una vez al año", "Solo cuando se caiga", "Cada 5 años"],
        respuestaCorrecta: 1,
        justificacion: "La inspección técnica documentada por persona calificada debe realizarse mínimo una vez al año."
      },
      {
        pregunta: "¿Qué documento debe diligenciarse y autorizarse antes de iniciar cualquier labor en altura?",
        opciones: ["Factura de compra", "Permiso de Trabajo en Alturas y lista de chequeo", "Planilla de nómina", "Carta de recomendación"],
        respuestaCorrecta: 1,
        justificacion: "El Permiso de Trabajo en Alturas (PTA) es mandatorio antes de iniciar actividades según la norma."
      },
      {
        pregunta: "¿Cuál es la resistencia mínima que debe certificar un punto de anclaje estructural?",
        opciones: ["1.000 lb (4.4 kN)", "5.000 lb (22.2 kN) por trabajador conectado", "2.500 lb (11.1 kN)", "500 lb"],
        respuestaCorrecta: 1,
        justificacion: "La norma exige resistencia estática certificada de mínimo 5.000 libras (22.2 kN) por persona conectada."
      }
    ],
    evaluaciones: [
      { trabajadorId: "trab-003", trabajadorNombre: "Julián Esteban Ospina", nota: 4.8, aprobada: true, fecha: "2026-03-20T16:30:00Z" },
      { trabajadorId: "trab-004", trabajadorNombre: "Héctor Fabio Ramírez", nota: 5.0, aprobada: true, fecha: "2026-03-20T16:35:00Z" },
      { trabajadorId: "trab-006", trabajadorNombre: "Rodrigo Zapata", nota: 4.2, aprobada: true, fecha: "2026-03-20T16:40:00Z" },
      { trabajadorId: "trab-008", trabajadorNombre: "Wilson Albeiro Henao", nota: 4.6, aprobada: true, fecha: "2026-03-20T16:42:00Z" }
    ]
  },
  {
    id: "cap-002",
    companyId: "emp-1790438946268",
    tema: "Manejo Seguro de Montacargas y Maquinaria Pesada en Patios",
    objetivo: "Estandarizar velocidades máximas (10 km/h), estibado seguro de bloques de arcilla e inspección preoperacional diaria.",
    facilitador: "Instructor Especialista Maquinaria SENA",
    fecha: "2026-04-25",
    duracion: "3 Horas",
    cupos: 12,
    estado: "Programada",
    materialUrl: "https://docs.google.com/presentation/d/demo_montacargas_sst/edit",
    preguntas: [
      {
        pregunta: "¿A qué altura del suelo deben transportarse las horquillas con carga durante el desplazamiento?",
        opciones: ["A 1 metro", "Entre 15 y 20 cm del suelo con mástil inclinado hacia atrás", "A la altura de los ojos del conductor", "Rozando el pavimento"],
        respuestaCorrecta: 1,
        justificacion: "Bajar el centro de gravedad transportando a 15-20 cm previene volcamientos del montacargas."
      },
      {
        pregunta: "¿Qué se debe hacer si la carga transportada obstruye la visibilidad hacia adelante?",
        opciones: ["Acelerar para terminar rápido", "Conducir en reversa mirando hacia la trayectoria", "Ponerse de pie para ver por encima", "Tocar la bocina constantemente sin detenerse"],
        respuestaCorrecta: 1,
        justificacion: "Cuando la carga bloquea la visual frontal es obligatorio desplazarse en reversa con máxima precaución."
      },
      {
        pregunta: "¿Cuál es la velocidad máxima permitida dentro de los patios de Ladrillos Ochoa?",
        opciones: ["30 km/h", "10 km/h", "20 km/h", "15 km/h"],
        respuestaCorrecta: 1,
        justificacion: "El estándar interno de la empresa y la matriz preventiva estipula 10 km/h en patios con peatones."
      },
      {
        pregunta: "¿Qué elemento es de uso obligatorio para el operador incluso dentro de la cabina protegida?",
        opciones: ["Cinturón de seguridad", "Guantes de carnaza", "Botas de caucho", "Casco de bombero"],
        respuestaCorrecta: 0,
        justificacion: "El cinturón de seguridad evita que el operador sea expulsado y aplastado ante un eventual volcamiento lateral."
      },
      {
        pregunta: "¿Antes de qué momento se debe realizar el formato de inspección preoperacional?",
        opciones: ["Al finalizar el turno semanal", "Antes de iniciar la operación en cada turno de trabajo", "Solo cuando se encienda una alarma", "Una vez al mes"],
        respuestaCorrecta: 1,
        justificacion: "La inspección preoperacional es de obligatoriedad diaria previa al inicio del primer ciclo de trabajo."
      }
    ],
    evaluaciones: []
  },
  {
    id: "cap-003",
    companyId: "emp-1790438946268",
    tema: "Prevención del Estrés Térmico y Golpe de Calor en Hornos",
    objetivo: "Identificar signos tempranos de agotamiento térmico, protocolos de rehidratación con sales minerales y pausas programadas.",
    facilitador: "Dra. Carolina Mejía (Médico Especialista SST)",
    fecha: "2026-02-12",
    duracion: "2 Horas",
    cupos: 20,
    estado: "Completada",
    materialUrl: "https://docs.google.com/presentation/d/demo_termico_sst/edit",
    preguntas: [
      {
        pregunta: "¿Cuál es el síntoma de mayor alarma que indica un posible Golpe de Calor inminente?",
        opciones: ["Sed ligera", "Piel caliente y seca sin sudoración, confusión mental y mareo", "Estornudos", "Sudoración fría en las manos"],
        respuestaCorrecta: 1,
        justificacion: "La detención brusca de la sudoración acompañada de hipertermia (>40°C) y confusión indica falla del sistema termorregulador."
      },
      {
        pregunta: "¿Qué frecuencia de consumo de agua o electrolitos se recomienda para operarios de hornos continuos?",
        opciones: ["Cada 4 horas", "Vasos regulares cada 15 a 20 minutos de exposición", "Solo almorzando", "Una vez por turno"],
        respuestaCorrecta: 1,
        justificacion: "La ingesta frecuente en pequeñas cantidades (150-200 ml cada 20 min) mantiene el volumen plasmático sin causar malestar."
      },
      {
        pregunta: "¿Qué acción de primeros auxilios inmediata se debe brindar a un operario con estrés térmico severo?",
        opciones: ["Darle café caliente", "Trasladar a zona sombreada y ventilada, aflojar ropa y aplicar compresas frescas", "Obligarlo a seguir laborando sentado", "Suministrar analgesicos fuertes"],
        respuestaCorrecta: 1,
        justificacion: "Retirar de la fuente calórica y enfriar el cuerpo gradualmente con ventilación y compresas húmedas."
      },
      {
        pregunta: "¿Qué tipo de prendas son las más recomendadas para ambientes con radiación térmica cerámico?",
        opciones: ["Prendas sintéticas de nylon", "Ropa de algodón 100% transpirable o con fibras reflectivas", "Chaqueta impermeable de plástico", "Ropa oscura ajustada"],
        respuestaCorrecta: 1,
        justificacion: "El algodón 100% permite la evaporación del sudor y no se adhiere a la piel ante cercanía al calor radiante."
      },
      {
        pregunta: "¿Qué examen ocupacional periódico es clave para trabajadores de hornos?",
        opciones: ["Audiometría solamente", "Evaluación cardiovascular, función renal y perfil osteomuscular", "Odontograma", "Prueba de alergia"],
        respuestaCorrecta: 1,
        justificacion: "La sobrecarga térmica impacta directamente el sistema cardiovascular y la función renal por deshidratación crónica."
      }
    ],
    evaluaciones: [
      { trabajadorId: "trab-003", trabajadorNombre: "Julián Esteban Ospina", nota: 5.0, aprobada: true, fecha: "2026-02-12T15:00:00Z" },
      { trabajadorId: "trab-004", trabajadorNombre: "Héctor Fabio Ramírez", nota: 4.8, aprobada: true, fecha: "2026-02-12T15:05:00Z" },
      { trabajadorId: "trab-008", trabajadorNombre: "Wilson Albeiro Henao", nota: 4.6, aprobada: true, fecha: "2026-02-12T15:10:00Z" },
      { trabajadorId: "trab-009", trabajadorNombre: "Luis Fernando Duque", nota: 4.4, aprobada: true, fecha: "2026-02-12T15:12:00Z" },
      { trabajadorId: "trab-010", trabajadorNombre: "Jhon Jairo Tamayo", nota: 4.8, aprobada: true, fecha: "2026-02-12T15:15:00Z" }
    ]
  },
  {
    id: "cap-004",
    companyId: "emp-1790438946268",
    tema: "Inducción y Reinducción Integral SG-SST 2026",
    objetivo: "Socializar políticas de seguridad, reglamento de higiene, matriz GTC 45, plan de emergencias y derechos del trabajador.",
    facilitador: "Andrés Felipe Restrepo (Coordinador SST)",
    fecha: "2026-01-16",
    duracion: "4 Horas",
    cupos: 48,
    estado: "Completada",
    materialUrl: "https://docs.google.com/presentation/d/demo_induccion_sst/edit",
    preguntas: [
      {
        pregunta: "¿Cuál es el principal canal interno para reportar un acto o condición insegura en Ladrillos Ochoa?",
        opciones: ["Guardar silencio", "Módulo digital del trabajador en Doctor Pyme o comunicación al Coordinador SST", "Esperar a fin de año", "Publicarlo en redes sociales"],
        respuestaCorrecta: 1,
        justificacion: "El reporte oportuno a través del aplicativo o directamente al comité SST previene la materialización de accidentes."
      },
      {
        pregunta: "¿Qué política prohíbe el ingreso a la planta bajo efectos de sustancias psicoactivas?",
        opciones: ["Política de Calidad", "Política de Prevención de Consumo de Alcohol, Tabaco y Sustancias Psicoactivas", "Política Comercial", "Manual de Compras"],
        respuestaCorrecta: 1,
        justificacion: "Es deber legal del trabajador abstenerse de laborar bajo influjo de alcohol o drogas por seguridad colectiva."
      },
      {
        pregunta: "¿Quién es el encargado de suministrar los Elementos de Protección Personal (EPP)?",
        opciones: ["El trabajador debe comprarlos", "El empleador sin ningún costo para el trabajador", "El sindicato", "La alcaldía"],
        respuestaCorrecta: 1,
        justificacion: "La legislación colombiana (Código Sustantivo del Trabajo y Dec. 1072) establece que el empleador debe suministrar los EPP sin costo."
      },
      {
        pregunta: "¿Dentro de cuánto tiempo máximo debe reportarse un accidente de trabajo a la ARL?",
        opciones: ["Dentro de los 2 días hábiles siguientes al suceso", "Dentro de 30 días", "Cuando el trabajador se recupere", "No es obligatorio"],
        respuestaCorrecta: 0,
        justificacion: "El Decreto 1072 y la Ley 1562 establecen 2 días hábiles para radicar el FURAT ante la ARL y EPS."
      },
      {
        pregunta: "¿Qué significan las siglas COPASST?",
        opciones: ["Comité de Paseos y Salidas Técnicas", "Comité Paritario de Seguridad y Salud en el Trabajo", "Consejo Patronal de Servicios y Terrenos", "Comisión de Pagos y Sueldos"],
        respuestaCorrecta: 1,
        justificacion: "COPASST es el Comité Paritario de Seguridad y Salud en el Trabajo regulado por la Res. 2013 de 1986."
      }
    ],
    evaluaciones: [
      { trabajadorId: "trab-001", trabajadorNombre: "Carlos Mario Ochoa", nota: 5.0, aprobada: true, fecha: "2026-01-16T17:00:00Z" },
      { trabajadorId: "trab-002", trabajadorNombre: "Andrés Felipe Restrepo", nota: 5.0, aprobada: true, fecha: "2026-01-16T17:00:00Z" },
      { trabajadorId: "trab-003", trabajadorNombre: "Julián Esteban Ospina", nota: 4.8, aprobada: true, fecha: "2026-01-16T17:05:00Z" },
      { trabajadorId: "trab-004", trabajadorNombre: "Héctor Fabio Ramírez", nota: 5.0, aprobada: true, fecha: "2026-01-16T17:08:00Z" },
      { trabajadorId: "trab-005", trabajadorNombre: "Martha Lucía Giraldo", nota: 5.0, aprobada: true, fecha: "2026-01-16T17:10:00Z" },
      { trabajadorId: "trab-006", trabajadorNombre: "Rodrigo Zapata", nota: 4.5, aprobada: true, fecha: "2026-01-16T17:12:00Z" },
      { trabajadorId: "trab-007", trabajadorNombre: "Jorge Iván Cárdenas", nota: 4.6, aprobada: true, fecha: "2026-01-16T17:15:00Z" },
      { trabajadorId: "trab-008", trabajadorNombre: "Wilson Albeiro Henao", nota: 4.7, aprobada: true, fecha: "2026-01-16T17:18:00Z" },
      { trabajadorId: "trab-009", trabajadorNombre: "Luis Fernando Duque", nota: 4.5, aprobada: true, fecha: "2026-01-16T17:20:00Z" },
      { trabajadorId: "trab-010", trabajadorNombre: "Jhon Jairo Tamayo", nota: 4.8, aprobada: true, fecha: "2026-01-16T17:22:00Z" }
    ]
  }
];

// =============================================================================
// CATÁLOGO DE MAQUINARIA Y EQUIPOS INDUSTRIALES (DEMO)
// =============================================================================
export const EQUIPOS_DEMO = [
  {
    id: "eq-001",
    companyId: "emp-1790438946268",
    codigo: "EQ-HORN-01",
    nombre: "Horno Túnel Continuo de Cocción Cerámica",
    marca: "TecnoCeramica Hoffman",
    modelo: "Tunnel Kiln 85M",
    serie: "TC-2018-854",
    ubicacion: "Nave Central de Cocción",
    criticidad: "Alta",
    periodicidadMantenimiento: "Trimestral",
    responsable: "Héctor Fabio Ramírez",
    especificaciones: "Capacidad máx 1.200°C, 18 quemadores duales gas natural, longitud 85 metros, control PLC Siemens S7-1200.",
    fechaAdquisicion: "2018-05-10",
    proximoMantenimiento: "2026-04-18",
    estado: "Operativo",
    horasOperacion: 28450
  },
  {
    id: "eq-002",
    companyId: "emp-1790438946268",
    codigo: "EQ-EXTR-02",
    nombre: "Extrusora y Molino Desintegrador de Arcilla",
    marca: "Bonnot Industrial",
    modelo: "Super Pug Mill 14",
    serie: "BN-2020-112",
    ubicacion: "Nave de Preparación y Extrusión",
    criticidad: "Alta",
    periodicidadMantenimiento: "Bimestral",
    responsable: "Héctor Fabio Ramírez",
    especificaciones: "Motor 125 HP, cuchillas de acero antidesgaste Hardox 500, cámara de desaireación y bomba de vacío Gardner Denver.",
    fechaAdquisicion: "2020-08-14",
    proximoMantenimiento: "2026-05-10",
    estado: "Operativo",
    horasOperacion: 14200
  },
  {
    id: "eq-003",
    companyId: "emp-1790438946268",
    codigo: "EQ-MONT-03",
    nombre: "Montacargas Diésel 3.5 Toneladas",
    marca: "Toyota",
    modelo: "8FD35N",
    serie: "8FD35N-45912",
    placa: "MK-42",
    ubicacion: "Patios de Acopio y Despachos",
    criticidad: "Media",
    periodicidadMantenimiento: "Mensual / 250 Horas",
    responsable: "Rodrigo Zapata / Héctor Ramírez",
    especificaciones: "Capacidad 3.500 kg, mástil triple 4.7m, luces LED faeneras, alarma de reversa, cinturón de seguridad con sensor.",
    fechaAdquisicion: "2022-03-20",
    proximoMantenimiento: "2026-04-25",
    estado: "Operativo",
    horasOperacion: 6840
  },
  {
    id: "eq-004",
    companyId: "emp-1790438946268",
    codigo: "EQ-RETR-04",
    nombre: "Retroexcavadora Oruga de Extracción de Arcilla",
    marca: "Caterpillar",
    modelo: "320D Series 2",
    serie: "CAT-320D-782",
    ubicacion: "Cantera y Pozo de Arcilla",
    criticidad: "Alta",
    periodicidadMantenimiento: "Bimestral / 500 Horas",
    responsable: "Jorge Iván Cárdenas",
    especificaciones: "Motor Cat C7.1 ACERT, balde 1.2 m³, cabina ROPS/FOPS certificada con aire acondicionado y sistema extintor.",
    fechaAdquisicion: "2019-11-05",
    proximoMantenimiento: "2026-06-02",
    estado: "Operativo",
    horasOperacion: 11950
  },
  {
    id: "eq-005",
    companyId: "emp-1790438946268",
    codigo: "EQ-CINT-05",
    nombre: "Cinta Transportadora Principal de Alimentación",
    marca: "Martin Sprocket",
    modelo: "Belt Conveyor 36x40M",
    serie: "MS-2021-360",
    ubicacion: "Tolva de Recepción a Molino",
    criticidad: "Media",
    periodicidadMantenimiento: "Mensual",
    responsable: "Héctor Fabio Ramírez",
    especificaciones: "Ancho banda 36 pulgadas, motoreductor Sew Eurodrive 25 HP, paradas de emergencia por piola en ambos costados.",
    fechaAdquisicion: "2021-02-18",
    proximoMantenimiento: "2026-04-30",
    estado: "Operativo",
    horasOperacion: 16500
  }
];

// =============================================================================
// CRONOGRAMA ANUAL DE MANTENIMIENTO (DIAGRAMA DE GANTT DEMO)
// =============================================================================
export const MANTENIMIENTOS_DEMO = [
  {
    id: "mant-001",
    companyId: "emp-1790438946268",
    equipoId: "eq-001",
    equipoNombre: "Horno Túnel Hoffman",
    actividad: "Limpieza profunda de toberas, inspección de refractarios y calibración de quemadores Q1",
    fechaInicio: "2026-01-10",
    fechaFin: "2026-01-14",
    mes: "Enero",
    tipo: "Preventivo",
    estado: "Ejecutado",
    responsable: "Héctor Fabio Ramírez",
    costo: 3800000,
    observaciones: "Quemadores 4 y 7 ajustados con óptima combustión de gas natural."
  },
  {
    id: "mant-002",
    companyId: "emp-1790438946268",
    equipoId: "eq-003",
    equipoNombre: "Montacargas Toyota MK-42",
    actividad: "Cambio de aceite diésel 15W40, filtro de combustible, engrase de mástil y revisión de frenos",
    fechaInicio: "2026-01-20",
    fechaFin: "2026-01-21",
    mes: "Enero",
    tipo: "Preventivo",
    estado: "Ejecutado",
    responsable: "Taller Mecánico Especializado",
    costo: 1250000,
    observaciones: "Frenos con 80% de vida útil remanente."
  },
  {
    id: "mant-003",
    companyId: "emp-1790438946268",
    equipoId: "eq-002",
    equipoNombre: "Extrusora Bonnot",
    actividad: "Cambio de cuchillas desgastadas del desintegrador y chequeo de nivel de aceite de reductor",
    fechaInicio: "2026-02-05",
    fechaFin: "2026-02-08",
    mes: "Febrero",
    tipo: "Preventivo",
    estado: "Ejecutado",
    responsable: "Héctor Fabio Ramírez",
    costo: 4200000,
    observaciones: "Instaladas 8 cuchillas nuevas en acero Hardox."
  },
  {
    id: "mant-004",
    companyId: "emp-1790438946268",
    equipoId: "eq-005",
    equipoNombre: "Cinta Transportadora 36\"",
    actividad: "Alineación de poleas tensoras, lubricación de chumaceras y cambio de 4 rodillos de retorno",
    fechaInicio: "2026-02-22",
    fechaFin: "2026-02-23",
    mes: "Febrero",
    tipo: "Preventivo",
    estado: "Ejecutado",
    responsable: "Héctor Fabio Ramírez",
    costo: 850000,
    observaciones: "Banda centrada sin roces laterales."
  },
  {
    id: "mant-005",
    companyId: "emp-1790438946268",
    equipoId: "eq-004",
    equipoNombre: "Retroexcavadora Cat 320D",
    actividad: "Servicio 500 Horas: filtros de aire primario/secundario, aceite hidráulico y engrase de pasadores",
    fechaInicio: "2026-03-12",
    fechaFin: "2026-03-15",
    mes: "Marzo",
    tipo: "Preventivo",
    estado: "Ejecutado",
    responsable: "Distribuidor Caterpillar",
    costo: 5600000,
    observaciones: "Presión hidráulica nominal verificada."
  },
  {
    id: "mant-006",
    companyId: "emp-1790438946268",
    equipoId: "eq-001",
    equipoNombre: "Horno Túnel Hoffman",
    actividad: "Mantenimiento Preventivo Q2: calibración de termocuplas tipo S y revisión de tiro de chimenea",
    fechaInicio: "2026-04-18",
    fechaFin: "2026-04-22",
    mes: "Abril",
    tipo: "Preventivo",
    estado: "En Proceso",
    responsable: "Héctor Fabio Ramírez",
    costo: 2900000,
    observaciones: "En ejecución de pruebas térmicas."
  },
  {
    id: "mant-007",
    companyId: "emp-1790438946268",
    equipoId: "eq-003",
    equipoNombre: "Montacargas Toyota MK-42",
    actividad: "Inspección de cadenas de elevación y medición de elongación con micrómetro",
    fechaInicio: "2026-04-25",
    fechaFin: "2026-04-26",
    mes: "Abril",
    tipo: "Preventivo",
    estado: "Programado",
    responsable: "Héctor Fabio Ramírez",
    costo: 450000,
    observaciones: "Programado según protocolo mensual."
  },
  {
    id: "mant-008",
    companyId: "emp-1790438946268",
    equipoId: "eq-005",
    equipoNombre: "Cinta Transportadora 36\"",
    actividad: "Verificación de cables de parada de emergencia en ambos lados y enclavamientos de seguridad",
    fechaInicio: "2026-04-30",
    fechaFin: "2026-05-01",
    mes: "Mayo",
    tipo: "Preventivo",
    estado: "Programado",
    responsable: "Andrés Restrepo / Héctor Ramírez",
    costo: 250000,
    observaciones: "Prueba mandatoria de seguridad de máquinas."
  },
  {
    id: "mant-009",
    companyId: "emp-1790438946268",
    equipoId: "eq-002",
    equipoNombre: "Extrusora Bonnot",
    actividad: "Cambio de retenedores de aceite de la caja reductora y prueba de vacío de la cámara",
    fechaInicio: "2026-05-10",
    fechaFin: "2026-05-13",
    mes: "Mayo",
    tipo: "Preventivo",
    estado: "Programado",
    responsable: "Héctor Fabio Ramírez",
    costo: 3100000,
    observaciones: "Parada programada de 2 días hábiles."
  },
  {
    id: "mant-010",
    companyId: "emp-1790438946268",
    equipoId: "eq-004",
    equipoNombre: "Retroexcavadora Cat 320D",
    actividad: "Inspección de zapatas de oruga, tensión de cadenas y comprobación de fuga en cilindro del brazo",
    fechaInicio: "2026-06-02",
    fechaFin: "2026-06-05",
    mes: "Junio",
    tipo: "Preventivo",
    estado: "Programado",
    responsable: "Jorge Iván Cárdenas",
    costo: 1800000,
    observaciones: "Trabajo en cantera."
  },
  {
    id: "mant-011",
    companyId: "emp-1790438946268",
    equipoId: "eq-001",
    equipoNombre: "Horno Túnel Hoffman",
    actividad: "Mantenimiento Preventivo Q3: revisión estructural de vagonetas refractarias y ventiladores de tiro",
    fechaInicio: "2026-07-15",
    fechaFin: "2026-07-19",
    mes: "Julio",
    tipo: "Preventivo",
    estado: "Programado",
    responsable: "Héctor Fabio Ramírez",
    costo: 4500000,
    observaciones: "Programado en receso intersemestral."
  },
  {
    id: "mant-012",
    companyId: "emp-1790438946268",
    equipoId: "eq-001",
    equipoNombre: "Horno Túnel Hoffman",
    actividad: "Mantenimiento Preventivo Q4: prueba de hermeticidad de válvulas de gas y certificación anual",
    fechaInicio: "2026-10-20",
    fechaFin: "2026-10-24",
    mes: "Octubre",
    tipo: "Preventivo",
    estado: "Programado",
    responsable: "Firma Certificadora de Gas",
    costo: 6200000,
    observaciones: "Auditoría obligatoria de seguridad en gas combustible."
  }
];

// =============================================================================
// REGISTRO DE FIRMAS ELECTRÓNICAS (LEY 527 DE 1999 DEMO)
// =============================================================================
export const FIRMAS_DEMO = [
  {
    id: "sig-demo-001",
    companyId: "emp-1790438946268",
    documentoId: "DOC-POL-SST-01",
    documentoTitulo: "Política Integral de Seguridad y Salud en el Trabajo",
    trabajadorId: "trab-001",
    trabajadorNombre: "Carlos Mario Ochoa",
    trabajadorCedula: "70.123.456",
    trabajadorCargo: "Gerente General",
    timestamp: "2026-01-15T09:30:00.000Z",
    clientIp: "190.144.20.15",
    hashSha256: "4a7d9b2e8f1c3a6e5b4d7c8a9e0f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
    firmaBase64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='60'><path d='M10,40 Q40,10 80,35 T150,20' stroke='%231e1b4b' stroke-width='3' fill='none'/><text x='15' y='52' font-size='10' fill='%23666'>C. Ochoa</text></svg>",
    tipoFirma: "DIGITAL_TRAZO"
  },
  {
    id: "sig-demo-002",
    companyId: "emp-1790438946268",
    documentoId: "DOC-POL-SST-01",
    documentoTitulo: "Política Integral de Seguridad y Salud en el Trabajo",
    trabajadorId: "trab-002",
    trabajadorNombre: "Andrés Felipe Restrepo",
    trabajadorCedula: "1.036.945.120",
    trabajadorCargo: "Coordinador SST",
    timestamp: "2026-01-15T10:15:00.000Z",
    clientIp: "190.144.20.15",
    hashSha256: "8e2f1c4a5b6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
    firmaBase64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='60'><path d='M15,35 Q50,5 90,40 T145,25' stroke='%231e1b4b' stroke-width='3' fill='none'/><text x='20' y='52' font-size='10' fill='%23666'>A. Restrepo</text></svg>",
    tipoFirma: "DIGITAL_TRAZO"
  },
  {
    id: "sig-demo-003",
    companyId: "emp-1790438946268",
    documentoId: "DOC-POL-SST-01",
    documentoTitulo: "Política Integral de Seguridad y Salud en el Trabajo",
    trabajadorId: "trab-003",
    trabajadorNombre: "Julián Esteban Ospina",
    trabajadorCedula: "1.144.523.890",
    trabajadorCargo: "Operador de Horno Túnel",
    timestamp: "2026-01-16T17:30:00.000Z",
    clientIp: "190.144.20.15",
    hashSha256: "3b5d7f9a1c2e4f6a8b0d2c4e6f8a0b2c4e6f8a0b2c4e6f8a0b2c4e6f8a0b2c4e",
    firmaBase64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='60'><path d='M10,45 Q60,15 100,30 T150,35' stroke='%231e1b4b' stroke-width='3' fill='none'/><text x='25' y='52' font-size='10' fill='%23666'>J. Ospina</text></svg>",
    tipoFirma: "DIGITAL_TRAZO"
  },
  {
    id: "sig-demo-004",
    companyId: "emp-1790438946268",
    documentoId: "DOC-POL-ALC-02",
    documentoTitulo: "Política de Prevención de Alcohol, Tabaco y Sustancias Psicoactivas",
    trabajadorId: "trab-006",
    trabajadorNombre: "Rodrigo Zapata",
    trabajadorCedula: "98.654.321",
    trabajadorCargo: "Operador de Montacargas",
    timestamp: "2026-01-20T11:00:00.000Z",
    clientIp: "190.144.20.15",
    hashSha256: "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
    firmaBase64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='60'><path d='M12,30 Q45,10 95,45 T145,15' stroke='%231e1b4b' stroke-width='3' fill='none'/><text x='30' y='52' font-size='10' fill='%23666'>R. Zapata</text></svg>",
    tipoFirma: "DIGITAL_TRAZO"
  }
];

// =============================================================================
// REPORTES DE CONDICIONES INSEGURAS Y PELIGROS (DEMO)
// =============================================================================
export const REPORTES_PELIGRO_DEMO = [
  {
    id: "pel-001",
    companyId: "emp-1790438946268",
    trabajadorId: "trab-003",
    trabajadorNombre: "Julián Esteban Ospina",
    trabajadorCargo: "Operador de Horno Túnel",
    area: "Zona de Secaderos Túnel",
    descripcion: "Se detectó fuga de aire comprimido en el racor de la compuerta neumática del secadero túnel N° 2, genera silbido fuerte e inestabilidad en la apertura.",
    nivelRiesgo: "Medio",
    estado: "Atendido",
    fechaReporte: "2026-03-25T10:15:00.000Z",
    accionCorrectiva: "Mantenimiento reemplazó el racor y la manguera de poliuretano de 10mm.",
    responsableCierre: "Héctor Fabio Ramírez"
  },
  {
    id: "pel-002",
    companyId: "emp-1790438946268",
    trabajadorId: "trab-006",
    trabajadorNombre: "Rodrigo Zapata",
    trabajadorCargo: "Operador de Montacargas",
    area: "Patios de Acopio - Zona Sur",
    descripcion: "Bache profundo con acumulación de lodo en la ruta de tránsito del montacargas frente a la estibadora, riesgo de pérdida de estabilidad con carga elevada.",
    nivelRiesgo: "Alto",
    estado: "En Proceso",
    fechaReporte: "2026-04-02T08:30:00.000Z",
    accionCorrectiva: "Se delimitó el paso con conos y se programó recebo y compactación con la retroexcavadora.",
    responsableCierre: "Andrés Felipe Restrepo"
  }
];

// =============================================================================
// REPORTES PREOPERACIONALES DE EQUIPOS (DEMO)
// =============================================================================
export const REPORTES_PREOPERACIONAL_DEMO = [
  {
    id: "preop-001",
    companyId: "emp-1790438946268",
    equipoId: "eq-003",
    equipoNombre: "Montacargas Toyota MK-42",
    trabajadorId: "trab-006",
    trabajadorNombre: "Rodrigo Zapata",
    fecha: "2026-04-10",
    turno: "Turno Mañana (06:00 - 14:00)",
    horasHorometro: 6840,
    estadoOperativo: "Apto para Operar",
    items: {
      frenos: "Bueno",
      direccion: "Bueno",
      luces: "Bueno",
      alarmaReversa: "Bueno",
      cinturonSeguridad: "Bueno",
      manguerasHidraulicas: "Bueno",
      mastilYHorquillas: "Bueno",
      extintorVigente: "Bueno",
      nivelAceite: "Bueno",
      llantas: "Bueno"
    },
    observaciones: "Equipo en condiciones operativas seguras. Presión de aire normal.",
    firmaConfirmada: true
  }
];
