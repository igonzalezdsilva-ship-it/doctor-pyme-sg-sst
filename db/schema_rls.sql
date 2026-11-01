-- ==============================================================================
-- DOCTOR PYME SG-SST • ARQUITECTURA MULTITENANT CON ROW-LEVEL SECURITY (RLS)
-- Paradigma: Process-Driven Architecture (Arquitectura Guiada por Procesos)
-- Normativa: Decreto 1072 de 2015, Resolución 0312 de 2019, Guía GTC 45:2012
-- Motor: PostgreSQL 14+ con aislamiento criptográfico por tenant_id
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE process_type_enum AS ENUM ('Estrategico', 'Misional', 'Apoyo', 'Evaluacion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE phva_phase_enum AS ENUM ('Planear', 'Hacer', 'Verificar', 'Actuar');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE routine_type_enum AS ENUM ('Rutinaria', 'No_Rutinaria');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hierarchy_level_enum AS ENUM ('Directivo', 'Profesional', 'Tecnico', 'Operativo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE activity_role_enum AS ENUM ('Responsable_Ejecutor', 'Participante_Apoyo', 'Supervisor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE map_status_enum AS ENUM ('Borrador', 'Vigente', 'Obsoleto');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE job_document_type_enum AS ENUM (
    'MANUAL_DE_CARGO',
    'PERFIL_DE_CARGO',
    'PLAN_DE_TRABAJO_SEGURO',
    'PROFESIOGRAMA_CARGO',
    'MATRIZ_EPP_Y_DOTACION',
    'ANEXO_CONTRACTUAL_Y_NOTIFICACION_RIESGOS'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLA MAESTRA: TENANTS (EMPRESAS CLIENTES) + CONTEXTO IA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(255) NOT NULL,
  nit VARCHAR(50) NOT NULL UNIQUE,
  arl VARCHAR(100) NOT NULL,
  clase_riesgo VARCHAR(10) NOT NULL, -- I, II, III, IV, V
  trabajadores INT NOT NULL DEFAULT 1,
  ciudad VARCHAR(100),
  direccion VARCHAR(255),
  sector VARCHAR(150),
  responsable_sst VARCHAR(255),
  telefono VARCHAR(50),
  email VARCHAR(150),
  estandares_aplicables INT DEFAULT 60,
  representante_legal VARCHAR(255),
  logo_url TEXT,
  
  -- Campos de Evolución Contextual & ADN Empresarial (Process-Driven)
  company_description TEXT,           -- Qué hace la empresa, productos/servicios
  operational_how_it_works TEXT,      -- Cómo opera, flujo productivo, infraestructura
  years_operating INT DEFAULT 1,       -- Antigüedad en años
  ai_context_summary JSONB DEFAULT '{}'::jsonb, -- Síntesis estructurada por IA

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. BLOQUE 2: MAPA DE PROCESOS Y CARACTERIZACIÓN (SIPOC / PHVA)
-- ------------------------------------------------------------------------------

-- Tabla de Mapas de Procesos Versionados
CREATE TABLE IF NOT EXISTS process_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
  status map_status_enum NOT NULL DEFAULT 'Vigente',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catálogo de Cargos (Declarado previo a processes para permitir FK líder)
CREATE TABLE IF NOT EXISTS job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  hierarchy_level hierarchy_level_enum NOT NULL DEFAULT 'Operativo',
  parent_job_position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  summary_objective TEXT,
  required_education TEXT,
  required_experience TEXT,
  required_skills JSONB DEFAULT '[]'::jsonb,
  medical_exams_profesiograma JSONB DEFAULT '{"ingreso": [], "periodico": [], "egreso": []}'::jsonb,
  required_epp_list TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_tenant_job_title UNIQUE (tenant_id, title)
);

-- Procesos de la Organización
CREATE TABLE IF NOT EXISTS processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  process_map_id UUID REFERENCES process_maps(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, -- ej. "DE-01", "PO-01", "PA-01"
  name VARCHAR(255) NOT NULL,
  process_type process_type_enum NOT NULL,
  objective TEXT,
  scope TEXT,
  leader_job_position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actividades de Procesos bajo Ciclo PHVA
CREATE TABLE IF NOT EXISTS process_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  phva_phase phva_phase_enum NOT NULL, -- Planear, Hacer, Verificar, Actuar
  activity_order INT NOT NULL DEFAULT 1,
  activity_name VARCHAR(255) NOT NULL,
  description TEXT,
  inputs TEXT,  -- Entradas / SIPOC
  outputs TEXT, -- Salidas / SIPOC
  routine_type routine_type_enum NOT NULL DEFAULT 'Rutinaria',
  associated_tools_ids UUID[] DEFAULT '{}', -- Relación con tools_inventory
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. BLOQUE 3: RELACIÓN N:M PROCESO-ACTIVIDADES Y CARGOS (PROPAGACIÓN DE FUNCIONES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS process_activity_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  process_activity_id UUID NOT NULL REFERENCES process_activities(id) ON DELETE CASCADE,
  job_position_id UUID NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
  role_in_activity activity_role_enum NOT NULL DEFAULT 'Responsable_Ejecutor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_activity_position_role UNIQUE (process_activity_id, job_position_id, role_in_activity)
);

-- Motor de Documentos Obligatorios por Cargo (Res. 0312 & CST)
CREATE TABLE IF NOT EXISTS job_position_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_position_id UUID NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
  document_type job_document_type_enum NOT NULL,
  title VARCHAR(255) NOT NULL,
  version VARCHAR(50) DEFAULT 'v1.0',
  content_json JSONB NOT NULL,
  html_template TEXT,
  pdf_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. BLOQUE 4: TRABAJADORES (EMPLOYEES) Y MATRIZ GTC 45 CONECTADA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_position_id UUID NOT NULL REFERENCES job_positions(id) ON DELETE RESTRICT,
  nombre VARCHAR(255) NOT NULL,
  tipo_identificacion VARCHAR(10) DEFAULT 'CC',
  identificacion VARCHAR(50) NOT NULL,
  cargo_display VARCHAR(255),
  salario NUMERIC(15,2) DEFAULT 0,
  tipo_contrato VARCHAR(50) DEFAULT 'Término Indefinido',
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  estado VARCHAR(20) DEFAULT 'Activo',
  email VARCHAR(150),
  telefono VARCHAR(50),
  eps VARCHAR(100),
  afp VARCHAR(100),
  arl VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matriz de Peligros y Valoración de Riesgos GTC 45 Conectada
CREATE TABLE IF NOT EXISTS gtc45_risk_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE RESTRICT,
  process_activity_id UUID NOT NULL REFERENCES process_activities(id) ON DELETE RESTRICT,
  exposed_job_positions UUID[] DEFAULT '{}', -- Array de job_position_id
  zona_lugar VARCHAR(255),
  tarea TEXT,
  rutinaria BOOLEAN DEFAULT TRUE,
  peligro_clasificacion VARCHAR(100) NOT NULL,
  peligro_descripcion TEXT NOT NULL,
  efectos_posibles TEXT NOT NULL,
  controles_existentes_fuente TEXT,
  controles_existentes_medio TEXT,
  controles_existentes_individuo TEXT,
  nd INT DEFAULT 2,
  ne INT DEFAULT 2,
  np INT GENERATED ALWAYS AS (nd * ne) STORED,
  nc INT DEFAULT 10,
  nr INT GENERATED ALWAYS AS (nd * ne * nc) STORED,
  interpretacion_nr VARCHAR(10),
  aceptabilidad VARCHAR(50),
  medida_eliminacion TEXT,
  medida_sustitucion TEXT,
  medida_ingenieria TEXT,
  medida_administrativa TEXT,
  medida_epp TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. ÍNDICES DE RENDIMIENTO (OPTIMIZADOS PARA FILTRADO POR TENANT_ID)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_process_maps_tenant ON process_maps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processes_tenant ON processes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processes_map ON processes(process_map_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON process_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_process ON process_activities(process_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_tenant ON job_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_act_positions_tenant ON process_activity_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_act_positions_pair ON process_activity_positions(process_activity_id, job_position_id);
CREATE INDEX IF NOT EXISTS idx_job_docs_tenant ON job_position_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_docs_position ON job_position_documents(job_position_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_job ON employees(job_position_id);
CREATE INDEX IF NOT EXISTS idx_gtc45_tenant ON gtc45_risk_matrices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gtc45_process ON gtc45_risk_matrices(process_id);
CREATE INDEX IF NOT EXISTS idx_gtc45_activity ON gtc45_risk_matrices(process_activity_id);

-- ------------------------------------------------------------------------------
-- 7. ACTIVACIÓN DE ROW-LEVEL SECURITY (RLS) - POLÍTICA ZERO-LEAK POR TENANT_ID
-- ------------------------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_activity_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_position_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtc45_risk_matrices ENABLE ROW LEVEL SECURITY;

-- Macro de política RLS para tenants
DROP POLICY IF EXISTS rls_tenant_isolation ON tenants;
CREATE POLICY rls_tenant_isolation ON tenants
  FOR ALL
  USING (id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- Función generadora de políticas para tablas secundarias
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'process_maps',
      'processes',
      'process_activities',
      'job_positions',
      'process_activity_positions',
      'job_position_documents',
      'employees',
      'gtc45_risk_matrices'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS rls_%I_tenant_isolation ON %I;', tbl, tbl);
    EXECUTE format('
      CREATE POLICY rls_%I_tenant_isolation ON %I
        FOR ALL
        USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid);
    ', tbl, tbl);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 8. TRIGGER DE PROPAGACIÓN AUTOMÁTICA DE PROCESOS A CARGOS Y FUNCIONES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_sync_activity_positions_to_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualiza el timestamp de modificación en el cargo vinculado
  UPDATE job_positions
  SET updated_at = NOW()
  WHERE id = NEW.job_position_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_activity_to_job ON process_activity_positions;
CREATE TRIGGER trg_sync_activity_to_job
  AFTER INSERT OR UPDATE ON process_activity_positions
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_sync_activity_positions_to_job();

-- ------------------------------------------------------------------------------
-- 9. BLOQUE 5: GESTIÓN DE HERRAMIENTAS, EQUIPOS Y CONTROL OPERACIONAL SST
-- ------------------------------------------------------------------------------

-- Inventario Central de Herramientas y Maquinaria
CREATE TABLE IF NOT EXISTS tools_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  internal_code VARCHAR(50) NOT NULL,
  exact_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Maquinaria_Pesada',
  tool_type VARCHAR(50) DEFAULT 'Industrial',
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  commercial_value NUMERIC(15,2) DEFAULT 0,
  photo_url TEXT,
  acquisition_year INT,
  useful_life_years INT DEFAULT 5,
  operative_vars JSONB DEFAULT '{}'::jsonb,
  current_status VARCHAR(50) DEFAULT 'Operativa', -- Operativa, En Mantenimiento, Fuera de Servicio
  qr_code_token VARCHAR(255) UNIQUE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asignación de Herramientas y Custodia por Trabajador
CREATE TABLE IF NOT EXISTS tools_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools_inventory(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id VARCHAR(150),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  returned_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'Asignada', -- Asignada, Devuelta, Danada
  initial_state_notes TEXT,
  digital_signature_file TEXT,
  digital_signature_hash VARCHAR(64),
  signature_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ficha Técnica SST de Herramientas (Peligros, Controles y EPP)
CREATE TABLE IF NOT EXISTS tools_sst (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools_inventory(id) ON DELETE CASCADE,
  hazards TEXT[] DEFAULT '{}',
  preventive_measures TEXT,
  required_epp TEXT[] DEFAULT '{}',
  ficha_tecnica_url TEXT,
  manual_operacion_url TEXT,
  pts_seguro_url TEXT,
  preoperational_checklist_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_tools_sst_tool UNIQUE (tool_id)
);

-- Registro de Intervenciones, Mantenimientos e Inspecciones Preoperacionales
CREATE TABLE IF NOT EXISTS tools_interventions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools_inventory(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  intervention_type VARCHAR(50) NOT NULL, -- Preoperacional, Preventivo, Correctivo, Inspeccion
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_result VARCHAR(50) NOT NULL DEFAULT 'Aprobado', -- Aprobado, Rechazado, Con_Observaciones
  checklist_answers JSONB DEFAULT '{}'::jsonb,
  evidence_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. BLOQUE 6: APP MÓVIL DEL TRABAJADOR (EVIDENCIAS LEGALES Y FIRMAS DIGITALES)
-- ------------------------------------------------------------------------------

-- Firmas Electrónicas Inmutables de Documentos e Instrumentos Laborales
CREATE TABLE IF NOT EXISTS employee_document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- HABEAS_DATA_ONBOARDING, MANUAL_DE_CARGO, PERFIL_DE_CARGO, PLAN_DE_TRABAJO_SEGURO, PROFESIOGRAMA_CARGO, ANEXO_CONTRACTUAL_Y_NOTIFICACION_RIESGOS, ACTA_ENTREGA_EPP
  document_id UUID,
  document_code VARCHAR(100),
  document_title VARCHAR(255) NOT NULL,
  signature_image_file TEXT NOT NULL,
  signature_sha256 VARCHAR(64) NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_ip VARCHAR(50),
  user_agent TEXT,
  legal_retention_years INT DEFAULT 20, -- Art. 2.2.4.6.13 Dec. 1072/2015
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actas de Entrega de Dotación y EPP (Estándar 4.2.6 Res. 0312/2019)
CREATE TABLE IF NOT EXISTS epp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  delivered_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_image_file TEXT NOT NULL,
  signature_sha256 VARCHAR(64) NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reportes de Peligros, Actos y Condiciones Inseguras emitidos por Trabajadores
CREATE TABLE IF NOT EXISTS worker_sst_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- Condicion_Insegura, Acto_Inseguro, Incidente_Trabajo
  location VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity_level VARCHAR(20) DEFAULT 'Media', -- Baja, Media, Alta, Inmediata
  photo_url TEXT,
  status VARCHAR(50) DEFAULT 'Pendiente_Revision', -- Pendiente_Revision, En_Gestion, Cerrado
  management_notes TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. ÍNDICES Y POLÍTICAS RLS PARA TABLAS DE APP MÓVIL Y HERRAMIENTAS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tools_inventory_tenant ON tools_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tools_inventory_code ON tools_inventory(internal_code);
CREATE INDEX IF NOT EXISTS idx_tools_assignments_tenant ON tools_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tools_assignments_employee ON tools_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_tools_assignments_tool ON tools_assignments(tool_id);
CREATE INDEX IF NOT EXISTS idx_tools_sst_tenant ON tools_sst(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tools_sst_tool ON tools_sst(tool_id);
CREATE INDEX IF NOT EXISTS idx_tools_interventions_tenant ON tools_interventions_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tools_interventions_tool ON tools_interventions_log(tool_id);
CREATE INDEX IF NOT EXISTS idx_tools_interventions_employee ON tools_interventions_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_doc_signatures_tenant ON employee_document_signatures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_doc_signatures_employee ON employee_document_signatures(employee_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_tenant ON epp_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_employee ON epp_deliveries(employee_id);
CREATE INDEX IF NOT EXISTS idx_worker_sst_reports_tenant ON worker_sst_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_worker_sst_reports_employee ON worker_sst_reports(employee_id);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE tools_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools_interventions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_sst_reports ENABLE ROW LEVEL SECURITY;

-- Aplicar políticas de aislamiento multitenant estricto
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tools_inventory',
      'tools_assignments',
      'tools_sst',
      'tools_interventions_log',
      'employee_document_signatures',
      'epp_deliveries',
      'worker_sst_reports'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS rls_%I_tenant_isolation ON %I;', tbl, tbl);
    EXECUTE format('
      CREATE POLICY rls_%I_tenant_isolation ON %I
        FOR ALL
        USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid);
    ', tbl, tbl);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 12. BLOQUE 7: MATRIZ Y REGISTRO DE ENTREGA DE DOTACIÓN Y EPP (ESTÁNDAR 4.2.6)
-- Normativa: Ley 9 de 1979 (Arts. 122-124), Resolución 2400 de 1979, 
-- Decreto 1072 de 2015, Resolución 0312 de 2019 y Código Sustantivo del Trabajo Art. 230
-- ------------------------------------------------------------------------------

-- 1. Catálogo Maestro de Ítems de la Empresa (EPP, Dotación Legal y Ropa Especial)
CREATE TABLE IF NOT EXISTS epp_dotacion_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('EPP', 'DOTACION_LEGAL', 'ROPA_TRABAJO_ESPECIAL')),
  body_part_protected VARCHAR(50) NOT NULL CHECK (body_part_protected IN (
    'Cabeza', 'Ojos_Rostro', 'Auditiva', 'Respiratoria', 
    'Manos_Brazos', 'Pies_Piernas', 'Tronco_Cuerpo', 'Alturas_Anticaidas'
  )),
  technical_standard VARCHAR(150) NOT NULL DEFAULT 'N/A',
  useful_life_days INT NOT NULL DEFAULT 180,
  requires_size BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_tenant_item_code UNIQUE (tenant_id, item_code)
);

-- 2. Caracterización de la Matriz de EPP y Dotación por Cargo
CREATE TABLE IF NOT EXISTS job_position_epp_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_position_id UUID NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES epp_dotacion_catalog(id) ON DELETE CASCADE,
  default_quantity INT NOT NULL DEFAULT 1,
  delivery_frequency VARCHAR(50) NOT NULL DEFAULT 'Cuatrimestral_CST' CHECK (delivery_frequency IN (
    'Ingreso_Unica_Vez', 'Mensual', 'Trimestral', 'Cuatrimestral_CST', 'Semestral', 'Anual', 'Segun_Deterioro'
  )),
  associated_hazard TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_position_catalog_item UNIQUE (job_position_id, catalog_item_id)
);

-- 3. Cabecera de Asignación y Entrega al Trabajador
CREATE TABLE IF NOT EXISTS epp_dotacion_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_consecutive VARCHAR(100) NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  job_position_id UUID NOT NULL REFERENCES job_positions(id) ON DELETE RESTRICT,
  delivery_type VARCHAR(50) NOT NULL DEFAULT 'MIXTA_EPP_Y_DOTACION' CHECK (delivery_type IN (
    'DOTACION_SOLA', 'EPP_SOLO', 'MIXTA_EPP_Y_DOTACION'
  )),
  delivery_reason VARCHAR(100) NOT NULL DEFAULT 'Dotacion_Ingreso' CHECK (delivery_reason IN (
    'Dotacion_Ingreso', 'Periodica_Ley_Abril_Agosto_Diciembre', 'Reposicion_Por_Desgaste_Deterioro', 'Cambio_De_Cargo'
  )),
  assigned_by_user_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'ASIGNADO_PENDIENTE_FIRMA' CHECK (status IN (
    'ASIGNADO_PENDIENTE_FIRMA', 'FIRMADO_ENTREGADO', 'ANULADO'
  )),
  worker_signed_at TIMESTAMP WITH TIME ZONE,
  worker_signature_base64_or_s3 TEXT,
  worker_ip_address VARCHAR(50),
  worker_user_agent TEXT,
  cryptographic_hash_sha256 VARCHAR(64),
  pdf_s3_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_tenant_delivery_consecutive UNIQUE (tenant_id, delivery_consecutive)
);

-- 4. Detalle de Elementos Entregados en el Acta
CREATE TABLE IF NOT EXISTS epp_dotacion_delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES epp_dotacion_deliveries(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES epp_dotacion_catalog(id) ON DELETE SET NULL,
  item_name_snapshot VARCHAR(255) NOT NULL,
  category_snapshot VARCHAR(50) NOT NULL,
  technical_standard_snapshot VARCHAR(150),
  size_delivered VARCHAR(50) DEFAULT 'Única',
  quantity_delivered INT NOT NULL DEFAULT 1,
  brand_or_batch VARCHAR(150),
  previous_item_returned BOOLEAN NOT NULL DEFAULT FALSE,
  next_replacement_date DATE,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de Rendimiento para EPP y Dotación
CREATE INDEX IF NOT EXISTS idx_epp_catalog_tenant ON epp_dotacion_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_epp_catalog_code ON epp_dotacion_catalog(item_code);
CREATE INDEX IF NOT EXISTS idx_position_epp_tenant ON job_position_epp_matrix(tenant_id);
CREATE INDEX IF NOT EXISTS idx_position_epp_position ON job_position_epp_matrix(job_position_id);
CREATE INDEX IF NOT EXISTS idx_position_epp_item ON job_position_epp_matrix(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_tenant ON epp_dotacion_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_emp ON epp_dotacion_deliveries(employee_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_status ON epp_dotacion_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_epp_delivery_items_del ON epp_dotacion_delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_epp_delivery_items_tenant ON epp_dotacion_delivery_items(tenant_id);

-- RLS para las nuevas tablas
ALTER TABLE epp_dotacion_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_position_epp_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_dotacion_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_dotacion_delivery_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'epp_dotacion_catalog',
      'job_position_epp_matrix',
      'epp_dotacion_deliveries',
      'epp_dotacion_delivery_items'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS rls_%I_tenant_isolation ON %I;', tbl, tbl);
    EXECUTE format('
      CREATE POLICY rls_%I_tenant_isolation ON %I
        FOR ALL
        USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid);
    ', tbl, tbl);
  END LOOP;
END $$;


