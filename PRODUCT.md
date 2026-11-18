# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Consultor SST (Super Administrador, i.gonzalez.dsilva@gmail.com):** gestiona varias empresas clientes desde escritorio; audita, asigna accesos y configura la plataforma.
- **Consultores SST asignados (`CONSULTOR_SST`):** administran únicamente las empresas que se les asignan.
- **Administradores de PYME (`ADMIN_PYME`):** gestionan el SG-SST de su propia empresa en escritorio.
- **Trabajadores:** firman documentos y reportan desde el celular (portal del trabajador).

## Product Purpose

Plataforma multiempresa para administrar, consultar y auditar Sistemas de Gestión de Seguridad y Salud en el Trabajo (SG-SST) en Colombia, bajo Decreto 1072 de 2015, Resolución 0312 de 2019, GTC 45:2012 y Resolución 1401 de 2007. Éxito: cada PYME mantiene evidencias, firmas y carpetas documentales al día y puede demostrar cumplimiento ante el Ministerio del Trabajo.

## Positioning

Cumplimiento automático de Decreto 1072 / Res. 0312 con evidencias, firmas digitales y carpetas por trabajador, multiempresa y pensado para PYMEs colombianas.

## Operating Context

- Autoclasificación por número de trabajadores y clase de riesgo (7, 21 o 60 estándares mínimos).
- Autoevaluación con semáforo oficial, matriz de peligros GTC 45, Plan Anual de Trabajo, carpetas por trabajador y cargo, firmas digitales, EPP y dotación, COPASST/CCL.
- Vigencias anuales (2025, 2026); la nómina de trabajadores es transversal a las vigencias.
- Servido en https://doctorpyme.co (Render) con wrapper Android (`co.doctorpyme.app`, Play Store).

## Capabilities and Constraints

- Aislamiento multitenant estricto: un único `SUPER_ADMIN`; consultores solo ven empresas asignadas; empresas cliente solo ven la propia.
- Frontend en JavaScript vanilla (módulos ES) servido por `server.rb` (Ruby WEBrick) con persistencia en `data/database.json`; sincronización bidireccional servidor + caché local.
- Terminología: SST, tenant/empresa, vigencia, estándares mínimos, PHVA.

## Brand Commitments

- El usuario definió directrices visuales vinculantes en `.impeccable.md` (principio rector: "claridad clínica y tranquilidad operativa"; primario médico/institucional, semáforos emerald/amber/rose, sin degradados decorativos ni sombras pesadas, tipografía Inter/Plus Jakarta Sans + mono para NIT/cédulas, `tabular-nums`). Su sección de stack (Next.js + shadcn/ui) describe el destino deseado; la app actual es JavaScript vanilla servido por `server.rb`.

## Evidence on Hand

- Documentación funcional en `README.md`.
- Datos reales de empresas y trabajadores solo en `data/database.json`; no inventar clientes, testimonios ni métricas.

## Product Principles

- El dato es la fuente de verdad en el servidor; la interfaz nunca oculta el estado de sincronización.
- Cada pantalla se entiende para un administrador de PYME no técnico.
- El cumplimiento legal es el resultado, no un adorno: prioridad a claridad sobre decoración.
- Aislamiento de empresas y de roles visible y sin ambigüedad.
