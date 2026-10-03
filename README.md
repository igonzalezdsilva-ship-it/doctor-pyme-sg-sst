# Plataforma Multi-Empresa de Gestión de SST (SG-SST Colombia)

Aplicación web integral para la administración, consultoría y auditoría de **Sistemas de Gestión de Seguridad y Salud en el Trabajo**, estructurada rigurosamente bajo el marco legal de:
- **Decreto 1072 de 2015** (Decreto Único Reglamentario del Sector Trabajo - Título 4, Capítulo 6).
- **Resolución 0312 de 2019** (Estándares Mínimos del SG-SST).
- **Guía Técnica Colombiana GTC 45:2012** (Identificación de Peligros y Valoración de Riesgos).
- **Resolución 1401 de 2007** (Investigación de Incidentes y Accidentes de Trabajo - ATEL).

---

## 🚀 Cómo Iniciar la Aplicación

No requieres instalar Node.js, Xcode ni bases de datos pesadas. La plataforma funciona con el motor nativo de tu Mac:

### Opción 1: Doble Clic en el Archivo de Inicio
1. Abre la carpeta `sg-sst-app` en el **Finder**.
2. Haz doble clic en el archivo **`iniciar_aplicacion.command`**.
3. Se abrirá automáticamente tu navegador en `http://localhost:3000`.

### Opción 2: Desde la Terminal
Ejecuta en la terminal:
```bash
cd /Users/ivanda/.gemini/antigravity/scratch/sg-sst-app
ruby server.rb
```

---

## 📋 Módulos y Capacidades del Sistema

### 1. Panel Multi-Empresa con Selector en la Barra Superior
- Administra todas tus empresas clientes desde una única pantalla.
- Puedes cambiar de empresa activa en cualquier momento usando el menú desplegable superior: **todos los datos, riesgos, cronogramas y auditorías se filtrarán instantáneamente por la empresa seleccionada**.

### 2. Autoclasificación según Resolución 0312 de 2019
Al ingresar o editar una empresa cliente (indicando su **número de trabajadores** y su **clase de riesgo I a V**), el sistema aplica las reglas legales de forma automática:
- **7 Estándares Mínimos**: Para empresas de 1 a 10 trabajadores clasificadas en Riesgo I, II o III (Art. 3).
- **21 Estándares Mínimos**: Para empresas de 11 a 50 trabajadores clasificadas en Riesgo I, II o III (Art. 9).
- **60 Estándares Mínimos Completos**: Para empresas de más de 50 trabajadores de cualquier riesgo, o empresas de 1 a 50 trabajadores con Riesgo IV o V (Art. 16).

### 3. Autoevaluación Interactiva y Semáforo de Cumplimiento
- Evaluación ítem por ítem con ponderaciones oficiales.
- Botones de calificación rápida: **Cumple**, **No Cumple**, **No Aplica** (con soporte legal).
- Semáforo oficial en tiempo real:
  - 🔴 **Crítico** (< 60%): Exige Plan de Mejoramiento inmediato y reporte a ARL en 3 meses.
  - 🟡 **Moderadamente Aceptable** (60% a 85%): Plan de mejoramiento con reporte a ARL en 6 meses.
  - 🟢 **Aceptable** (> 85%): Mantener evidencias a disposición del Ministerio del Trabajo.
- Pestaña automática de **Plan de Mejoramiento**: extrae todos los incumplimientos y te permite fijar acciones, responsables y fechas de cierre.

### 4. Matriz de Peligros y Riesgos GTC 45:2012
- Catálogo oficial clasificado: Biológico, Físico, Químico, Biomecánico, Psicosocial, Condiciones de Seguridad y Fenómenos Naturales.
- **Calculadora GTC 45 integrada**:
  - `Nivel de Deficiencia (ND) × Nivel de Exposición (NE) = Nivel de Probabilidad (NP)`
  - `Nivel de Probabilidad (NP) × Nivel de Consecuencia (NC) = Nivel de Riesgo (NR)`
  - Determinación de Aceptabilidad: **Nivel I (No Aceptable)**, **Nivel II**, **Nivel III**, **Nivel IV (Aceptable)**.
- Jerarquía de Medidas de Intervención: Eliminación, Sustitución, Ingeniería, Administrativos y EPP.
- Exportación instantánea a hoja de cálculo **CSV/Excel**.

### 5. Plan Anual de Trabajo (PAT) - Decreto 1072
- Cronograma mensual por ciclo PHVA.
- Control de recursos asignados (financieros, humanos, técnicos).
- Medición de avance porcentual y registro de evidencias documentales.

### 6. Libro de Registro e Investigación de Accidentes (ATEL - FURAT)
- Registro conforme a la Resolución 1401 de 2007.
- Control de días de incapacidad médica acumulados.
- Análisis de causas inmediatas (actos/condiciones inseguras) y causas básicas (raíz).
- Planes de acción con seguimiento a responsables.

### 7. Centro de Informes Oficiales e Impresión PDF
- Genera documentos membretados para cada cliente con bloque oficial de firmas:
  - Representante Legal
  - Responsable del SG-SST (con licencia)
  - Presidente/Secretario del COPASST o Vigía
- Compatible con **Imprimir / Guardar en PDF** desde cualquier navegador.

### 8. Seguridad y Respaldos (Zero Data Loss)
- Descarga con un solo clic copias completas de seguridad en formato `.json`.
- Restaura copias previas en cualquier momento sin perder información.
