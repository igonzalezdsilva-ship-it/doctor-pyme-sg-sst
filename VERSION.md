# Doctor Pyme SG-SST — Manifiesto de Versión Oficial

**Versión:** `v4.4`  
**Fecha de Publicación:** 3 de Octubre de 2026  
**Nombre Clave:** *Catálogo Normativo 100% (Res. 0312), Cómputo No Aplica & Gestión Documental PHVA*  
**Estado:** Estable / Producción Local & Cloud-Ready  

---

## 📌 Resumen Ejecutivo de la Versión 4.4

Esta versión consolida la madurez operativa, legal y técnica de la plataforma **Doctor Pyme SG-SST**, garantizando el cumplimiento estricto del Sistema de Gestión de Seguridad y Salud en el Trabajo conforme al **Decreto 1072 de 2015** y la **Resolución 0312 de 2019** del Ministerio del Trabajo de Colombia.

---

## 🚀 Principales Mejoras y Novedades

### 1. Catálogo Oficial Completo de Estándares Mínimos (100.00%)
- **Ponderación Matemática Exacta:**
  - **60 Estándares (Empresas >50 trab. o Riesgo IV/V):** 100.00% exacto (68 ítems con desglose de sub-requisitos legales).
  - **21 Estándares (Empresas 11-50 trab. Riesgo I, II, III):** 100.00% exacto.
  - **7 Estándares (Empresas <=10 trab. Riesgo I, II, III):** 100.00% exacto.
- **Desglose Normativo:**
  - **Numeral 1.1.1:** 3 sub-requisitos normativos independientes (`1.1.1.1`, `1.1.1.2`, `1.1.1.3`).
  - **Numeral 1.1.2:** 6 sub-requisitos de responsabilidades (`1.1.2.1` a `1.1.2.6`).
  - **Numeral 3.1.7:** Sub-requisito `3.1.7.1` (Política de Prevención de Alcohol y Drogas, peso 0.5%) y `3.1.7.2` (Programa de Estilos de Vida Saludable, peso 0.5%), totalizando el 1.0% normativo.
  - **Numeral 5.1.1:** Plan de Prevención, Preparación y Respuesta ante Emergencias (peso 5.0%).

### 2. Regla Legal de Calificación para Ítems "No Aplica"
- Conforme al **Artículo 28 de la Resolución 0312 de 2019**, cuando un estándar o ítem no aplique a la actividad económica de la empresa y cuente con la respectiva justificación técnica y jurídica, se califica como **"No Aplica"** y **otorga el 100% del porcentaje del valor asignado al estándar**.
- El motor de cálculo en `js/standards.js` otorga el peso completo cuando `estado === "CUMPLE"` o `estado === "NO_APLICA"`.
- Los módulos de **Evaluación**, **Dashboard** y **Reportes** reflejan de forma discriminada:
  - Total Cumple (ej. 65 ítems)
  - Total No Aplica (ej. 2 ítems: `1.2.2` y `2.11.1`)
  - Total No Cumple (ej. 1 ítem: `2.10.1`)
  - Calificación ponderada resultante (ej. **98.0%** — Cumplimiento Aceptable).
- Botón de filtrado rápido interactivo `⚪ No Aplica` disponible en la interfaz de evaluación.

### 3. Módulo Centralizado de Gestión Documental PHVA
- **Biblioteca Estructurada:** Módulo dedicado que compila automáticamente todos los documentos, actas, soportes, formatos y guías cargadas en las evaluaciones y vigencias anuales.
- **Jerarquía PHVA:** Carpetas organizadas según el ciclo PHVA (Planear, Hacer, Verificar, Actuar) con código numérico oficial.
- **Visor Modal Integrado:** Previsualización en tiempo real de Google Docs, Google Sheets, archivos PDF e imágenes sin abandonar la plataforma.

### 4. Persistencia Atómica en Disco y Trazabilidad (Fase 1)
- **Persistencia Física en Servidor:** Almacenamiento continuo en `data/database.json`.
- **Copias de Seguridad Automáticas:** Generación de respaldos rotativos en `backups/backup_YYYY-MM-DD_HH-mm-ss.json` ante cada guardado.
- **Log de Auditoría Inmutable:** Registro secuencial en `data/audit_log.jsonl` de todas las operaciones (evaluaciones, creación de empresas, carga de documentos, exportaciones), cumpliendo el principio de trazabilidad del Decreto 1072/2015.
- **Doble Capa de Contingencia:** Fallback sincronizado en `localStorage` del navegador para tolerancia total a fallos de red.

---

## 📦 Estructura del Release v4.4

```
sg-sst-app/
├── backups/
│   ├── RELEASE_v4.4_2026-10-03_LADRILLOS_OCHOA.json  <-- Snapshot congelado de base de datos
│   └── backup_*.json                                 <-- Respaldos periódicos
├── data/
│   ├── database.json                                 <-- Base de datos activa
│   └── audit_log.jsonl                               <-- Registro de auditoría cronológico
├── js/
│   ├── app.js                                        <-- Controlador principal
│   ├── data.js                                       <-- Catálogos oficiales (100.00%)
│   ├── standards.js                                  <-- Motor de cálculo y reglas Res. 0312
│   ├── store.js                                      <-- Capa de persistencia y sincronización
│   └── components/                                   <-- Componentes UI (Dashboard, Eval, Doc, etc.)
├── releases/
│   └── doctor_pyme_sg_sst_v4.4_2026-10-03.zip       <-- Paquete de release exportable
├── iniciar_aplicacion.command                        <-- Lanzador de un clic para macOS
├── server.rb                                         <-- Servidor backend local Ruby
├── index.html                                        <-- Interfaz web v=4.4
└── VERSION.md                                        <-- Este documento
```

---

## 🛠️ Procedimiento de Restauración de Emergencia

Si en algún momento se desea restaurar el sistema al punto exacto de este release v4.4:
1. Detener el servidor si está en ejecución.
2. Copiar el archivo congelado sobre la base de datos activa:
   ```bash
   cp backups/RELEASE_v4.4_2026-10-03_LADRILLOS_OCHOA.json data/database.json
   ```
3. Iniciar la aplicación ejecutando `./iniciar_aplicacion.command` o navegando a `http://localhost:3000`.

---
*Doctor Pyme SG-SST — Plataforma de Gestión Integral para la Seguridad y Salud en el Trabajo.*
