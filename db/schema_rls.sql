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
-- 2. BLOQUE 1: ESQUEMA BASE DE INQUILINOS (TENANTS) Y MEMBRESÍAS MULTI-EMPRESA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nit VARCHAR(20) UNIQUE NOT NULL,
  razon_social VARCHAR(255) NOT NULL,
  nivel_riesgo_arl INTEGER NOT NULL DEFAULT 1 CHECK (nivel_riesgo_arl BETWEEN 1 AND 5),
  numero_trabajadores INTEGER NOT NULL DEFAULT 1,
  estandar_res_0312 VARCHAR(20) NOT NULL DEFAULT '7_ESTANDARES' CHECK (
    estandar_res_0312 IN ('7_ESTANDARES', '21_ESTANDARES', '60_ESTANDARES')
  ),
  logo_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Campos extendidos SG-SST & Contexto IA (Retrocompatibilidad)
  arl VARCHAR(100) DEFAULT 'SURA',
  clase_riesgo VARCHAR(10) DEFAULT 'I', -- I, II, III, IV, V
  trabajadores INT DEFAULT 1,
  ciudad VARCHAR(100),
  direccion VARCHAR(255),
  sector VARCHAR(150),
  responsable_sst VARCHAR(255),
  telefono VARCHAR(50),
  email VARCHAR(150),
  estandares_aplicables INT DEFAULT 7,
  representante_legal VARCHAR(255),
  company_description TEXT,
  operational_how_it_works TEXT,
  years_operating INT DEFAULT 1,
  ai_context_summary JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger automático para calcular estandar_res_0312 según Resolución 0312 de 2019
CREATE OR REPLACE FUNCTION fn_calcular_estandar_res_0312()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nivel_riesgo_arl IN (4, 5) OR NEW.numero_trabajadores > 50 THEN
    NEW.estandar_res_0312 := '60_ESTANDARES';
    NEW.estandares_aplicables := 60;
  ELSIF NEW.numero_trabajadores BETWEEN 11 AND 50 AND NEW.nivel_riesgo_arl IN (1, 2, 3) THEN
    NEW.estandar_res_0312 := '21_ESTANDARES';
    NEW.estandares_aplicables := 21;
  ELSE
    NEW.estandar_res_0312 := '7_ESTANDARES';
    NEW.estandares_aplicables := 7;
  END IF;
  NEW.trabajadores := NEW.numero_trabajadores;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_estandar_res_0312 ON tenants;
CREATE TRIGGER trg_calcular_estandar_res_0312
BEFORE INSERT OR UPDATE OF numero_trabajadores, nivel_riesgo_arl ON tenants
FOR EACH ROW EXECUTE FUNCTION fn_calcular_estandar_res_0312();

-- Tabla maestra de Usuarios de Plataforma (Consultores SST, Admins, Trabajadores)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(180) UNIQUE,
  cedula VARCHAR(30) UNIQUE,
  nombre_completo VARCHAR(255) NOT NULL,
  password_hash TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla Pivote de Membresías Multi-Empresa (user_tenant_memberships)
CREATE TABLE IF NOT EXISTS user_tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rol VARCHAR(30) NOT NULL CHECK (
    rol IN ('SUPERADMIN', 'CONSULTOR_SST', 'ADMIN_EMPRESA', 'TRABAJADOR')
  ),
  cargo_id UUID NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_tenant_membership UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_active ON user_tenant_memberships(user_id, activo);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_rol ON user_tenant_memberships(tenant_id, rol);

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
  department VARCHAR(255),
  hierarchy_level hierarchy_level_enum NOT NULL DEFAULT 'Operativo',
  parent_job_position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  parent_job_position_title VARCHAR(255),
  summary_objective TEXT,
  job_objective TEXT,
  required_education TEXT,
  required_experience TEXT,
  required_skills JSONB DEFAULT '[]'::jsonb,
  personality_skills JSONB DEFAULT '[]'::jsonb,
  operational_functions JSONB DEFAULT '[]'::jsonb,
  sst_responsibilities JSONB DEFAULT '[]'::jsonb,
  authority_scope TEXT,
  suspension_faculty BOOLEAN DEFAULT TRUE,
  medical_exams_profesiograma JSONB DEFAULT '{"ingreso": [], "periodico": [], "egreso": []}'::jsonb,
  required_epp_list TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_tenant_job_title UNIQUE (tenant_id, title)
);

-- Migraciones seguras para job_positions
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS parent_job_position_title VARCHAR(255);
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS job_objective TEXT;
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS personality_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS operational_functions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS sst_responsibilities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS authority_scope TEXT;
ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS suspension_faculty BOOLEAN DEFAULT TRUE;

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
  signature_svg TEXT,
  signature_s3_key VARCHAR(500),
  signature_registered_at TIMESTAMP WITH TIME ZONE,
  signature_ip_address VARCHAR(50),
  has_registered_signature BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migraciones seguras para employees (Firma Digital Base)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_svg TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_s3_key VARCHAR(500);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_registered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_ip_address VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS has_registered_signature BOOLEAN DEFAULT FALSE;

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
  manual_document_id UUID REFERENCES job_position_documents(id) ON DELETE SET NULL,
  document_type VARCHAR(100) NOT NULL, -- HABEAS_DATA_ONBOARDING, MANUAL_DE_CARGO, PERFIL_DE_CARGO, PLAN_DE_TRABAJO_SEGURO, PROFESIOGRAMA_CARGO, ANEXO_CONTRACTUAL_Y_NOTIFICACION_RIESGOS, ACTA_ENTREGA_EPP
  document_id UUID,
  document_code VARCHAR(100),
  document_title VARCHAR(255) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_signed BOOLEAN DEFAULT FALSE,
  signature_image_file TEXT,
  signature_svg_or_base64 TEXT,
  signature_sha256 VARCHAR(64),
  sha256_hash VARCHAR(64),
  signed_at TIMESTAMP WITH TIME ZONE,
  client_ip VARCHAR(50),
  signer_ip VARCHAR(50),
  user_agent TEXT,
  signer_user_agent TEXT,
  pdf_s3_key TEXT,
  legal_retention_years INT DEFAULT 20, -- Art. 2.2.4.6.13 Dec. 1072/2015
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migraciones para employee_document_signatures
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS manual_document_id UUID REFERENCES job_position_documents(id) ON DELETE SET NULL;
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS document_reference_id UUID;
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS signature_svg_or_base64 TEXT;
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS signature_snapshot_url TEXT;
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64);
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS signer_ip VARCHAR(50);
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS signer_user_agent TEXT;
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS pdf_s3_key TEXT;
ALTER TABLE employee_document_signatures ADD COLUMN IF NOT EXISTS final_signed_pdf_s3_key TEXT;

-- ------------------------------------------------------------------------------
-- 10.1. EXPEDIENTE LABORAL DIGITAL (CARPETA DEL TRABAJADOR - CUMPLIMIENTO DEC. 1072)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE folder_document_category_enum AS ENUM (
    'CEDULA_CIUDADANIA',
    'HOJA_DE_VIDA',
    'CERTIFICACION_BANCARIA',
    'EXAMEN_MEDICO_INGRESO',
    'AFILIACION_EPS',
    'AFILIACION_ARL',
    'AFILIACION_PENSION',
    'OTROS_SOPORTES'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS employee_folder_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_category folder_document_category_enum NOT NULL DEFAULT 'OTROS_SOPORTES',
  document_title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT DEFAULT 0,
  mime_type VARCHAR(100) DEFAULT 'application/pdf',
  file_s3_key VARCHAR(500) NOT NULL,
  issue_date DATE,
  expiration_date DATE,
  uploaded_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retention_legal_until TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (created_at + INTERVAL '20 years') STORED
);

CREATE INDEX IF NOT EXISTS idx_folder_docs_tenant ON employee_folder_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_folder_docs_employee ON employee_folder_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_folder_docs_category ON employee_folder_documents(document_category);

ALTER TABLE employee_folder_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_employee_folder_documents_tenant ON employee_folder_documents
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- Asignación y Socialización de Manual de Cargos al Trabajador
CREATE TABLE IF NOT EXISTS employee_job_position_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  job_position_id UUID NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
  manual_document_id UUID REFERENCES job_position_documents(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_svg_or_base64 TEXT,
  signer_ip VARCHAR(50),
  signer_user_agent TEXT,
  sha256_hash VARCHAR(64),
  pdf_s3_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_employee_job_assignment UNIQUE (tenant_id, employee_id, job_position_id)
);

ALTER TABLE employee_job_position_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_employee_job_position_assignments_tenant ON employee_job_position_assignments
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

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

-- ==============================================================================
-- 13. BLOQUE 2: ESTANDARIZACIÓN DE tenant_id E ÍNDICES COMPUESTOS EN TABLAS OPERATIVAS
--     (Cumplimiento Ley 1581 de 2012, Decreto 1072 de 2015, Res. 0312 de 2019)
-- ==============================================================================

-- 13.1. Tabla Operativa: CARGOS (Homologada con job_positions)
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo VARCHAR(50),
  nombre VARCHAR(255) NOT NULL,
  nivel_jerarquico VARCHAR(50) DEFAULT 'Operativo',
  mision_cargo TEXT,
  responsabilidades_sst JSONB DEFAULT '[]'::jsonb,
  peligros_asociados JSONB DEFAULT '[]'::jsonb,
  epp_requeridos JSONB DEFAULT '[]'::jsonb,
  examenes_medicos_requeridos JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13.2. Tabla Operativa: WORKERS / TRABAJADORES (Homologada con employees)
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  cedula VARCHAR(30) NOT NULL,
  nombres_apellidos VARCHAR(255) NOT NULL,
  cargo_nombre VARCHAR(180),
  email VARCHAR(150),
  telefono VARCHAR(50),
  eps VARCHAR(100),
  arl VARCHAR(100),
  afp VARCHAR(100),
  fecha_ingreso DATE DEFAULT CURRENT_DATE,
  politica_datos_aceptada BOOLEAN NOT NULL DEFAULT false,
  notificacion_riesgos_aceptada BOOLEAN NOT NULL DEFAULT false,
  firma_digital_url TEXT,
  firma_base64 TEXT,
  firma_sha256 VARCHAR(64),
  fecha_aceptacion_terminos TIMESTAMPTZ,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workers_tenant_cedula UNIQUE (tenant_id, cedula)
);

-- Vista alias `trabajadores` para compatibilidad bidireccional en consultas SQL
CREATE OR REPLACE VIEW trabajadores AS SELECT * FROM workers;

-- 13.3. Tabla Operativa: DOCUMENTOS_SST (Políticas, Reglamentos, PTS, Anexos, Manuales)
CREATE TABLE IF NOT EXISTS documentos_sst (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  codigo VARCHAR(60) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(80) NOT NULL, -- POLITICA_SST, REGLAMENTO_HIGIENE, PTS, ANEXO_CONTRACTUAL, MANUAL_CARGO, MATRIZ_RIESGOS
  version VARCHAR(20) NOT NULL DEFAULT '01',
  contenido_html TEXT,
  contenido_json JSONB DEFAULT '{}'::jsonb,
  archivo_s3_key TEXT,
  requiere_firma_trabajador BOOLEAN NOT NULL DEFAULT true,
  vigente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13.4. Tabla Operativa: FIRMAS_DOCUMENTOS (Trazabilidad probatoria Ley 527/1999)
CREATE TABLE IF NOT EXISTS firmas_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  documento_id UUID REFERENCES documentos_sst(id) ON DELETE SET NULL,
  documento_codigo VARCHAR(100),
  documento_titulo VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(80) NOT NULL,
  firma_url TEXT NOT NULL,
  pdf_firmado_s3_key TEXT,
  hash_sha256 VARCHAR(64) NOT NULL,
  ip_origen VARCHAR(50),
  user_agent TEXT,
  firmado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retencion_legal_anios INTEGER NOT NULL DEFAULT 20
);

-- 13.5. Tabla Operativa: INSPECCIONES_PREOPERACIONALES
CREATE TABLE IF NOT EXISTS inspecciones_preoperacionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  equipo_herramienta VARCHAR(255) NOT NULL,
  respuestas_chequeo JSONB NOT NULL DEFAULT '{}'::jsonb,
  apto_para_operar BOOLEAN NOT NULL DEFAULT true,
  observaciones TEXT,
  evidencia_foto_s3_key TEXT,
  firma_url TEXT,
  hash_sha256 VARCHAR(64),
  inspeccionado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13.6. Tabla Operativa: ENTREGA_EPP (Estándar 4.2.6 Res. 0312 de 2019)
CREATE TABLE IF NOT EXISTS entrega_epp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  consecutivo VARCHAR(80) NOT NULL,
  elementos_entregados JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado VARCHAR(40) NOT NULL DEFAULT 'FIRMADO_ENTREGADO',
  firma_url TEXT,
  pdf_acta_s3_key TEXT,
  hash_sha256 VARCHAR(64),
  entregado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13.7. Tabla Operativa: REPORTES_CONDICIONES_INSEGURAS (Art. 2.2.4.6.10 Dec. 1072/2015)
CREATE TABLE IF NOT EXISTS reportes_condiciones_inseguras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  tipo_reporte VARCHAR(60) NOT NULL DEFAULT 'Condicion_Insegura', -- Condicion_Insegura, Acto_Inseguro, Incidente
  ubicacion VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  nivel_severidad VARCHAR(30) NOT NULL DEFAULT 'Media',
  evidencia_s3_key TEXT,
  estado VARCHAR(40) NOT NULL DEFAULT 'Abierto',
  observaciones_cierre TEXT,
  reportado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13.8. Tabla Operativa: CAPACITACIONES_ELEARNING (Aula Virtual SST)
CREATE TABLE IF NOT EXISTS capacitaciones_elearning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo VARCHAR(60) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  intensidad_horaria NUMERIC(4,1) NOT NULL DEFAULT 2.0,
  modulos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  preguntas_evaluacion JSONB NOT NULL DEFAULT '[]'::jsonb,
  puntaje_minimo_aprobacion NUMERIC(3,1) NOT NULL DEFAULT 4.0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13.9. Tabla Operativa: EXAMENES_MEDICOS (Profesiograma y Conceptos de Aptitud Res. 2346/2007)
CREATE TABLE IF NOT EXISTS examenes_medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  tipo_examen VARCHAR(60) NOT NULL DEFAULT 'INGRESO', -- INGRESO, PERIODICO, EGRESO, POST_INCAPACIDAD
  concepto_aptitud VARCHAR(100) NOT NULL DEFAULT 'APTO_SIN_RESTRICCIONES',
  enfasis_evaluacion TEXT,
  restricciones_recomendaciones TEXT,
  entidad_ips VARCHAR(200),
  fecha_examen DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  certificado_s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13.10. Tabla Operativa: BUDGET_ITEMS (Presupuesto Anual SG-SST - Res. 0312 Estándar 1.1.2)
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  codigo VARCHAR(60) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  mes VARCHAR(30),
  valor_presupuestado NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_ejecutado NUMERIC(15,2) NOT NULL DEFAULT 0,
  factura_numero VARCHAR(100),
  proveedor VARCHAR(255),
  factura_url TEXT,
  factura_s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13.11. Tabla Operativa: EQUIPMENT_TECHNICAL_SHEETS (Ficha Técnica y PTS del Activo)
CREATE TABLE IF NOT EXISTS equipment_technical_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools_inventory(id) ON DELETE CASCADE,
  technical_procedure TEXT,
  pts_procedure TEXT,
  loto_protocol TEXT,
  required_epp TEXT[] DEFAULT '{}',
  hazards_gtc45 JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenant_equipment_sheet UNIQUE (tenant_id, tool_id)
);

-- 13.12. Tabla Operativa: MAINTENANCE_EXECUTIONS (Cierre Técnico y Actas de Mantenimiento con 5 Soportes)
CREATE TABLE IF NOT EXISTS maintenance_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools_inventory(id) ON DELETE CASCADE,
  actividad VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'Preventivo',
  fecha_programada DATE NOT NULL,
  fecha_ejecucion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pts_signed BOOLEAN NOT NULL DEFAULT true,
  technician_name VARCHAR(255) NOT NULL,
  technician_id_number VARCHAR(50),
  technician_signature_url TEXT,
  photo_before_s3_key TEXT,
  photo_during_s3_key TEXT,
  photo_after_s3_key TEXT,
  report_before TEXT,
  report_during TEXT,
  report_after TEXT,
  acta_pdf_s3_key TEXT,
  sha256_hash VARCHAR(64) NOT NULL,
  next_maintenance_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13.10. EXCEPCIÓN: TABLAS DE CATÁLOGO GLOBAL DE NORMATIVIDAD COLOMBIANA
--        (Sin tenant_id o con tenant_id IS NULL para plantillas globales de solo lectura)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_estandares_res_0312 (
  id SERIAL PRIMARY KEY,
  numeral VARCHAR(20) UNIQUE NOT NULL,
  ciclo_phva VARCHAR(20) NOT NULL CHECK (ciclo_phva IN ('PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR')),
  nombre_estandar VARCHAR(255) NOT NULL,
  peso_porcentual NUMERIC(5,2) NOT NULL,
  aplica_7_estandares BOOLEAN NOT NULL DEFAULT false,
  aplica_21_estandares BOOLEAN NOT NULL DEFAULT false,
  aplica_60_estandares BOOLEAN NOT NULL DEFAULT true,
  criterio_verificacion TEXT,
  modo_verificacion TEXT
);

CREATE TABLE IF NOT EXISTS catalogo_peligros_gtc45 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = Plantilla Global GTC 45 de solo lectura
  clasificacion VARCHAR(100) NOT NULL, -- Biológico, Físico, Químico, Psicosocial, Biomecánico, Condiciones de Seguridad, Fenómenos Naturales
  descripcion_peligro VARCHAR(255) NOT NULL,
  efectos_posibles TEXT,
  controles_sugeridos_fuente TEXT,
  controles_sugeridos_medio TEXT,
  controles_sugeridos_individuo TEXT,
  es_plantilla_global BOOLEAN NOT NULL DEFAULT true
);

-- ------------------------------------------------------------------------------
-- 13.11. ÍNDICES COMPUESTOS ENCABEZADOS POR tenant_id EN TODAS LAS TABLAS OPERATIVAS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workers_tenant_cc ON workers(tenant_id, cedula);
CREATE INDEX IF NOT EXISTS idx_workers_tenant_cargo ON workers(tenant_id, cargo_id);
CREATE INDEX IF NOT EXISTS idx_cargos_tenant_nombre ON cargos(tenant_id, nombre);
CREATE INDEX IF NOT EXISTS idx_docs_sst_tenant_tipo ON documentos_sst(tenant_id, tipo_documento);
CREATE INDEX IF NOT EXISTS idx_docs_sst_tenant_cargo ON documentos_sst(tenant_id, cargo_id);
CREATE INDEX IF NOT EXISTS idx_firmas_tenant_worker ON firmas_documentos(tenant_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_firmas_tenant_doc ON firmas_documentos(tenant_id, documento_id);
CREATE INDEX IF NOT EXISTS idx_preop_tenant_worker ON inspecciones_preoperacionales(tenant_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_entrega_epp_tenant_worker ON entrega_epp(tenant_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_reportes_ci_tenant_worker ON reportes_condiciones_inseguras(tenant_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_reportes_ci_tenant_estado ON reportes_condiciones_inseguras(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_tenant_activo ON capacitaciones_elearning(tenant_id, activo);
CREATE INDEX IF NOT EXISTS idx_examenes_tenant_worker ON examenes_medicos(tenant_id, worker_id);

-- Índices compuestos adicionales en tablas operativas Process-Driven y de negocio
CREATE INDEX IF NOT EXISTS idx_employees_tenant_doc ON employees(tenant_id, document_number);
CREATE INDEX IF NOT EXISTS idx_job_positions_tenant_code ON job_positions(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_job_pos_docs_tenant_pos ON job_position_documents(tenant_id, job_position_id);
CREATE INDEX IF NOT EXISTS idx_emp_doc_sigs_tenant_emp ON employee_document_signatures(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_tools_int_log_tenant_emp ON tools_interventions_log(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliv_tenant_emp ON epp_deliveries(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_worker_sst_rep_tenant_emp ON worker_sst_reports(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_tenant_year ON budget_items(tenant_id, year);
CREATE INDEX IF NOT EXISTS idx_equip_tech_sheets_tenant_tool ON equipment_technical_sheets(tenant_id, tool_id);
CREATE INDEX IF NOT EXISTS idx_maint_exec_tenant_tool ON maintenance_executions(tenant_id, tool_id);
CREATE INDEX IF NOT EXISTS idx_maint_exec_tenant_fecha ON maintenance_executions(tenant_id, fecha_programada);

-- ==============================================================================
-- 13. BLOQUE 6: COPASST & COMITÉ DE CONVIVENCIA LABORAL (CCL)
--     Normativa: Res. 2013/1986, Ley 1010/2006, Res. 652/2012, Res. 1356/2012, Dec. 1072/2015
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE committee_type_enum AS ENUM ('COPASST', 'VIGIA_SST', 'CCL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE committee_status_enum AS ENUM ('EN_CONFORMACION', 'ACTIVO_VIGENTE', 'VENCIDO', 'HISTORICO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE representation_side_enum AS ENUM ('EMPLEADOR_DESIGNADO', 'TRABAJADORES_ELEGIDO', 'VIGIA_UNICO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE member_category_enum AS ENUM ('PRINCIPAL', 'SUPLENTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE committee_role_enum AS ENUM ('PRESIDENTE', 'SECRETARIO', 'MIEMBRO_VOCAL', 'VIGIA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE committee_meeting_type_enum AS ENUM ('ORDINARIA_MENSUAL', 'EXTRAORDINARIA_ATEL', 'EXTRAORDINARIA_CONVIVENCIA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE meeting_status_enum AS ENUM ('PROGRAMADA', 'EN_SESION', 'CERRADA_FIRMADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE committee_task_category_enum AS ENUM (
    'INSPECCION_SST',
    'INVESTIGACION_ATEL',
    'SEGUIMIENTO_PLAN_TRABAJO',
    'CAPACITACION_CONVIVENCIA',
    'GESTION_CASO_ACOSO',
    'VERIFICACION_MEDIDAS_CONTROL',
    'OTRA'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE committee_task_status_enum AS ENUM ('PENDIENTE', 'EN_EJECUCION', 'COMPLETADA', 'VENCIDA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ccl_incident_type_enum AS ENUM (
    'MALTRATO_LABORAL',
    'PERSECUCION_LABORAL',
    'DISCRIMINACION_LABORAL',
    'ENTORPECIMIENTO_LABORAL',
    'INEQUIDAD_LABORAL',
    'DESPROTECCION_LABORAL',
    'CONFLICTO_INTERPERSONAL_CONVIVENCIA'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ccl_case_status_enum AS ENUM (
    'RADICADO_NUEVO',
    'EN_REVISION_SECRET_CCL',
    'CITACION_DESCARGOS_ESCUCHA',
    'EN_CONCILIACION_PLAN_MEJORA',
    'CERRADO_CON_ACUERDO',
    'REMITIDO_ALTA_DIRECCION_O_MINTRABAJO'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Conformación y Vigencia de Comités
CREATE TABLE IF NOT EXISTS sst_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  committee_type committee_type_enum NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  status committee_status_enum NOT NULL DEFAULT 'ACTIVO_VIGENTE',
  constitution_act_number VARCHAR(100) NOT NULL,
  functions_and_responsibilities_html TEXT,
  signed_constitution_pdf_s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_committees_tenant_type ON sst_committees(tenant_id, committee_type);

-- 2. Integrantes, Roles y Responsabilidades
CREATE TABLE IF NOT EXISTS sst_committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES sst_committees(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name VARCHAR(255) NOT NULL,
  employee_id_number VARCHAR(50),
  employee_position VARCHAR(150),
  representation_side representation_side_enum NOT NULL,
  member_category member_category_enum NOT NULL DEFAULT 'PRINCIPAL',
  committee_role committee_role_enum NOT NULL,
  specific_responsibilities TEXT,
  accepted_and_signed BOOLEAN NOT NULL DEFAULT false,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_comm_members_tenant ON sst_committee_members(tenant_id, committee_id);

-- 3. Gestión de Reuniones Mensuales y Actas
CREATE TABLE IF NOT EXISTS sst_committee_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES sst_committees(id) ON DELETE CASCADE,
  committee_type committee_type_enum NOT NULL,
  act_consecutive VARCHAR(100) NOT NULL,
  meeting_month INTEGER NOT NULL CHECK (meeting_month BETWEEN 1 AND 12),
  meeting_year INTEGER NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location_or_modality VARCHAR(100) DEFAULT 'Presencial',
  meeting_type committee_meeting_type_enum NOT NULL DEFAULT 'ORDINARIA_MENSUAL',
  quorum_verified BOOLEAN NOT NULL DEFAULT false,
  attendees_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  agenda_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  development_and_discussions TEXT,
  previous_tasks_review JSONB NOT NULL DEFAULT '[]'::jsonb,
  status meeting_status_enum NOT NULL DEFAULT 'PROGRAMADA',
  pdf_act_s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_comm_meetings_tenant ON sst_committee_meetings(tenant_id, committee_type, meeting_year, meeting_month);

-- 4. Motor de Ejecución y Seguimiento de Tareas / Compromisos
CREATE TABLE IF NOT EXISTS sst_committee_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES sst_committees(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES sst_committee_meetings(id) ON DELETE SET NULL,
  committee_type committee_type_enum NOT NULL,
  task_category committee_task_category_enum NOT NULL,
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  responsible_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  responsible_name VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  status committee_task_status_enum NOT NULL DEFAULT 'PENDIENTE',
  evidence_notes TEXT,
  evidence_file_s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_comm_tasks_tenant ON sst_committee_tasks(tenant_id, committee_type, status);

-- 5. Canal Confidencial de Reporte de Acoso, Maltrato y Sana Convivencia (CCL)
CREATE TABLE IF NOT EXISTS ccl_convivencia_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_radicado VARCHAR(100) UNIQUE NOT NULL,
  reporter_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reporter_name VARCHAR(255) NOT NULL,
  reporter_cedula VARCHAR(50),
  reported_person_name_or_id VARCHAR(255) NOT NULL,
  incident_type ccl_incident_type_enum NOT NULL,
  incident_date DATE NOT NULL,
  incident_place VARCHAR(255) NOT NULL,
  detailed_description TEXT NOT NULL,
  evidence_attachments_s3 JSONB NOT NULL DEFAULT '[]'::jsonb,
  case_status ccl_case_status_enum NOT NULL DEFAULT 'RADICADO_NUEVO',
  ccl_meeting_id UUID REFERENCES sst_committee_meetings(id) ON DELETE SET NULL,
  conciliation_commitments TEXT,
  confidentiality_seal BOOLEAN NOT NULL DEFAULT true,
  reporter_signature_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccl_reports_tenant_status ON ccl_convivencia_reports(tenant_id, case_status);

-- ==============================================================================
-- 14. BLOQUE 3: ACTIVACIÓN DE ROW-LEVEL SECURITY (RLS) Y FORZADO ESTRICTO
--     EN TODAS LAS TABLAS CON tenant_id
-- ==============================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      -- Tablas operativas estándar del SG-SST
      'workers',
      'cargos',
      'documentos_sst',
      'firmas_documentos',
      'inspecciones_preoperacionales',
      'entrega_epp',
      'reportes_condiciones_inseguras',
      'capacitaciones_elearning',
      'examenes_medicos',
      'budget_items',
      'equipment_technical_sheets',
      'maintenance_executions',
      -- Tablas operativas Process-Driven y de soporte
      'process_maps',
      'job_positions',
      'processes',
      'process_activities',
      'process_activity_positions',
      'job_position_documents',
      'employees',
      'gtc45_risk_matrices',
      'tools_inventory',
      'tools_assignments',
      'tools_sst',
      'tools_interventions_log',
      'employee_document_signatures',
      'employee_folder_documents',
      'employee_job_position_assignments',
      'epp_deliveries',
      'worker_sst_reports',
      'epp_dotacion_catalog',
      'job_position_epp_matrix',
      'epp_dotacion_deliveries',
      'epp_dotacion_delivery_items',
      -- Tablas COPASST & CCL (Módulo 6)
      'sst_committees',
      'sst_committee_members',
      'sst_committee_meetings',
      'sst_committee_tasks',
      'ccl_convivencia_reports'
    ])
  LOOP
    -- 1. Activar y Forzar RLS (incluso para el propietario de la tabla)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

    -- 2. Limpiar políticas previas para evitar colisiones
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS rls_%I_tenant_isolation ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS rls_%I_tenant ON %I;', tbl, tbl);

    -- 3. Crear la política estándar de aislamiento estricto por sesión
    EXECUTE format('
      CREATE POLICY tenant_isolation_policy ON %I
      AS PERMISSIVE FOR ALL
      TO PUBLIC
      USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid);
    ', tbl);
  END LOOP;
END $$;

-- Política especial para Catálogo GTC 45 (Permite leer plantillas globales con tenant_id IS NULL y escribir/leer las del tenant activo)
ALTER TABLE catalogo_peligros_gtc45 ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_peligros_gtc45 FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_or_global_gtc45_policy ON catalogo_peligros_gtc45;
CREATE POLICY tenant_or_global_gtc45_policy ON catalogo_peligros_gtc45
AS PERMISSIVE FOR ALL
TO PUBLIC
USING (
  tenant_id IS NULL
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);



