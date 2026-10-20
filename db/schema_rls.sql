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
