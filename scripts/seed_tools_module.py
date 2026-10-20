#!/usr/bin/env python3
import json
import os
from datetime import datetime

DB_PATH = 'data/database.json'

with open(DB_PATH, 'r', encoding='utf-8') as f:
    db = json.load(f)

# 1. tools_inventory
tools_inventory = [
    # --- LADRILLOS OCHOA LTDA (emp-1790438946268) ---
    {
        "id": "tool-och-001",
        "tenant_id": "emp-1790438946268",
        "internal_code": "TL-IND-001",
        "tool_type": "Industrial",
        "exact_name": "Horno Túnel Continuo de Cocción de Arcilla 240m",
        "brand": "Hofmann Thermal Systems",
        "model": "HT-240-PRO",
        "serial_number": "HT-2023-88492-COL",
        "commercial_value": 185000000,
        "photo_url": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80",
        "acquisition_year": 2023,
        "useful_life_years": 5,
        "operative_vars": {
            "voltaje": "440V Trifásico 60Hz",
            "revoluciones": "850 RPM (Tiro Forzado)",
            "presion": "6.2 Bar (Regulación Gas)",
            "potencia": "75 kW",
            "temperatura_max": "1050 °C"
        },
        "current_status": "En Funcionamiento",
        "createdAt": "2023-03-15T08:00:00.000Z",
        "updatedAt": "2026-10-14T19:00:00.000Z"
    },
    {
        "id": "tool-och-002",
        "tenant_id": "emp-1790438946268",
        "internal_code": "TL-ELE-002",
        "tool_type": "Eléctrica",
        "exact_name": "Amoladora Angular Industrial 9 Pulgadas",
        "brand": "Bosch Heavy Duty",
        "model": "GWS 22-230 JH",
        "serial_number": "BSH-992140-BOG",
        "commercial_value": 1650000,
        "photo_url": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80",
        "acquisition_year": 2024,
        "useful_life_years": 3,
        "operative_vars": {
            "voltaje": "220V Monofásico",
            "revoluciones": "6500 RPM",
            "potencia": "2200 W",
            "diametro_disco": "230 mm (9\")"
        },
        "current_status": "En Funcionamiento",
        "createdAt": "2024-02-10T09:30:00.000Z",
        "updatedAt": "2026-10-14T19:00:00.000Z"
    },
    {
        "id": "tool-och-003",
        "tenant_id": "emp-1790438946268",
        "internal_code": "TL-NEU-003",
        "tool_type": "Neumática",
        "exact_name": "Pistola Neumática de Impacto 1/2\" Heavy Duty",
        "brand": "Ingersoll Rand",
        "model": "2135QXPA",
        "serial_number": "IR-773412-USA",
        "commercial_value": 2300000,
        "photo_url": "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&auto=format&fit=crop&q=80",
        "acquisition_year": 2024,
        "useful_life_years": 4,
        "operative_vars": {
            "presion": "90 PSI (6.2 Bar)",
            "revoluciones": "9800 RPM",
            "consumo_aire": "5.0 CFM",
            "torque_max": "1050 Nm"
        },
        "current_status": "En Almacenamiento",
        "createdAt": "2024-05-18T14:20:00.000Z",
        "updatedAt": "2026-10-14T19:00:00.000Z"
    },
    {
        "id": "tool-och-004",
        "tenant_id": "emp-1790438946268",
        "internal_code": "TL-MED-004",
        "tool_type": "Medición",
        "exact_name": "Termómetro Infrarrojo Láser Dual con Registro",
        "brand": "Fluke Industrial",
        "model": "62 MAX+",
        "serial_number": "FLK-441029-MET",
        "commercial_value": 1200000,
        "photo_url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
        "acquisition_year": 2025,
        "useful_life_years": 3,
        "operative_vars": {
            "voltaje": "Batería 9V DC Alcalina",
            "rango_medicion": "-30°C a 650°C",
            "resolucion_optica": "12:1",
            "precision": "±1.0 °C"
        },
        "current_status": "En Mantenimiento",
        "createdAt": "2025-01-20T11:00:00.000Z",
        "updatedAt": "2026-10-14T19:00:00.000Z"
    },
    {
        "id": "tool-och-005",
        "tenant_id": "emp-1790438946268",
        "internal_code": "TL-MAN-005",
        "tool_type": "Manual",
        "exact_name": "Torquímetro Mecánico de Golpe Reversible 1/2 Pulgada",
        "brand": "Proto Professional",
        "model": "J6014C",
        "serial_number": "PRT-551203-USA",
        "commercial_value": 950000,
        "photo_url": "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=600&auto=format&fit=crop&q=80",
        "acquisition_year": 2024,
        "useful_life_years": 5,
        "operative_vars": {
            "rango_torque": "50 a 250 Ft-Lb",
            "mecanismo": "Trinquete reversible 36 dientes",
            "tolerancia": "±4% en sentido horario"
        },
        "current_status": "En Almacenamiento",
        "createdAt": "2024-08-05T10:15:00.000Z",
        "updatedAt": "2026-10-14T19:00:00.000Z"
    },

    # --- SERVICIOS IG SAS (emp-1792009016839) ---
    {
        "id": "tool-sig-001",
        "tenant_id": "emp-1792009016839",
        "internal_code": "TL-ELE-101",
        "tool_type": "Eléctrica",
        "exact_name": "Rotomartillo Electroneumático SDS Plus 800W",
        "brand": "DeWalt XR",
        "model": "D25133K",
        "serial_number": "DW-849201-COL",
        "commercial_value": 1150000,
        "photo_url": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80",
        "acquisition_year": 2024,
        "useful_life_years": 3,
        "operative_vars": {
            "voltaje": "120V / 60Hz",
            "revoluciones": "1500 RPM",
            "impactos": "5500 GPM",
            "potencia": "800 W"
        },
        "current_status": "En Funcionamiento",
        "createdAt": "2024-04-12T09:00:00.000Z",
        "updatedAt": "2026-10-14T19:00:00.000Z"
    },
    {
        "id": "tool-sig-002",
        "tenant_id": "emp-1792009016839",
        "internal_code": "TL-IND-102",
        "tool_type": "Industrial",
        "exact_name": "Mezcladora de Concreto Trompo 1.5 Bultos con Motor Eléctrico",
        "brand": "Imer Group",
        "model": "Syntesi 350",
        "serial_number": "IMER-339102",
        "commercial_value": 6800000,
        "photo_url": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80",
        "acquisition_year": 2023,
        "useful_life_years": 5,
        "operative_vars": {
            "voltaje": "220V Trifásico",
            "revoluciones": "24 RPM (Tambor)",
            "potencia": "2.5 HP",
            "capacidad": "350 Litros"
        },
        "current_status": "En Mantenimiento",
        "createdAt": "2023-07-22T13:40:00.000Z",
        "updatedAt": "2026-10-14T19:00:00.000Z"
    },

    # --- MATMA MOBILIARIO (emp-1792010387578) ---
    {
        "id": "tool-mat-001",
        "tenant_id": "emp-1792010387578",
        "internal_code": "TL-IND-201",
        "tool_type": "Industrial",
        "exact_name": "Sierra Escuadradora de Precisión con Disco Incisor",
        "brand": "Altendorf",
        "model": "F45 ElmoDrive",
        "serial_number": "ALT-449120-DE",
        "commercial_value": 42000000,
        "photo_url": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80",
        "acquisition_year": 2024,
        "useful_life_years": 5,
        "operative_vars": {
            "voltaje": "220V Trifásico",
            "revoluciones": "5000 RPM (Principal) / 9000 RPM (Incisor)",
            "potencia": "5.5 kW (7.5 HP)",
            "longitud_carro": "3200 mm"
        },
        "current_status": "En Funcionamiento",
        "createdAt": "2024-01-15T08:00:00.000Z",
        "updatedAt": "2026-10-14T19:00:00.000Z"
    }
]

# 2. tools_sst
tools_sst = [
    {
        "id": "sst-001",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-001",
        "hazards": [
            "Atrapamiento por vagonetas y mecanismos de arrastre",
            "Quemaduras térmicas por radiación y contacto con paredes calientes",
            "Exposición a ruido continuo > 85 dBA por ventiladores y tiros forzados",
            "Riesgo químico por monóxido de carbono (CO) y humos de combustión",
            "Riesgo eléctrico por acometida trifásica de 440V"
        ],
        "preventive_measures": "1. Mantener instaladas y operativas todas las guardas perimetrales y mallas de seguridad.\n2. Verificar diariamente el funcionamiento del lazo de parada de emergencia exterior.\n3. Aplicar estrictamente el procedimiento de Bloqueo y Etiquetado (LOTO) previo a ingreso para mantenimiento.\n4. Medición continua de atmósferas peligrosas antes de ingreso al túnel frío.\n5. Calibración periódica del sistema de corte automático por falla de llama de gas.",
        "required_epp": [
            "Casco de seguridad dieléctrico Tipo I Clase E",
            "Protector auditivo tipo copa NRR 27 dB",
            "Gafas de seguridad con filtro UV y antiempañante",
            "Guantes de carnaza / fibra de aramida resistentes a calor (>250°C)",
            "Botas de seguridad con puntera no metálica y suela de nitrilo resistente al calor",
            "Ropa de trabajo en algodón 100% resistente al fuego (Retardante)"
        ]
    },
    {
        "id": "sst-002",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-002",
        "hazards": [
            "Corte por contacto con disco abrasivo en rotación a 6500 RPM",
            "Proyección de esquirlas metálicas y fragmentos incandescentes",
            "Rotura violenta del disco por exceso de velocidad o atascamiento",
            "Exposición a ruido de impacto y vibraciones mano-brazo",
            "Inhalación de material particulado y polvo de corte"
        ],
        "preventive_measures": "1. Inspección preoperacional obligatoria del estado del cable, carcasa y guarda de protección posicionada a 180° hacia el operador.\n2. Prohibido usar discos vencidos, fisurados o que no coincidan con las RPM máximas de la amoladora.\n3. Sujeción firme con ambas manos usando la empuñadura auxiliar antivibratoria.\n4. No retirar la guarda de seguridad bajo ninguna circunstancia.",
        "required_epp": [
            "Careta facial de policarbonato alto impacto sobre gafas de seguridad",
            "Protector auditivo de inserción o copa NRR 25 dB",
            "Guantes de vaqueta reforzados o carnaza flexible",
            "Peto o delantal de carnaza para protección del torso",
            "Mascarilla N95 para humos metálicos y polvo mineral",
            "Botas de seguridad con puntera de acero"
        ]
    },
    {
        "id": "sst-003",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-003",
        "hazards": [
            "Latigazo de manguera presurizada por desacople súbito (Riesgo neumático)",
            "Vibraciones de impacto prolongadas en articulaciones muñeca-codo",
            "Pellizcamiento y atrapamiento durante el acople de dados de impacto",
            "Ruido de impacto neumático > 90 dBA"
        ],
        "preventive_measures": "1. Instalar guaya antilatigazo (Whipcheck) en todas las uniones de mangueras neumáticas.\n2. Purgar la línea de condensados antes de conectar la herramienta.\n3. Usar exclusivamente dados y copas forjadas para impacto (color negro), nunca copas cromadas manuales.",
        "required_epp": [
            "Protección auditiva tipo copa NRR 29 dB",
            "Gafas de seguridad de policarbonato ANSI Z87.1",
            "Guantes antivibración certificados ISO 10819",
            "Botas de seguridad dieléctricas"
        ]
    },
    {
        "id": "sst-004",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-004",
        "hazards": [
            "Exposición ocular al haz de radiación láser Clase II",
            "Proximidad a superficies calientes durante la toma de temperatura",
            "Error de lectura que induzca a contactos con piezas a alta temperatura"
        ],
        "preventive_measures": "1. Nunca apuntar el haz láser hacia los ojos de personas o superficies reflectivas especulares.\n2. Mantener la distancia de seguridad calculada según la resolución óptica (12:1).\n3. Requerir calibración metrológica vigente para validar mediciones críticas en hornos.",
        "required_epp": [
            "Gafas de seguridad con filtro de protección láser",
            "Guantes de protección térmica para toma cercana",
            "Casco y botas de seguridad en patio de hornos"
        ]
    },
    {
        "id": "sst-005",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-005",
        "hazards": [
            "Sobreesfuerzo biomecánico por torque excesivo o postura forzada",
            "Golpe por resbalamiento de la copa sobre tuerca desgastada"
        ],
        "preventive_measures": "1. Posicionar el cuerpo con base estable y traccionar hacia el cuerpo, no empujar hacia afuera.\n2. Descargar el mecanismo a cero tras su uso para evitar fatiga del resorte de calibración.",
        "required_epp": [
            "Guantes de maniobra mecánica con agarre antideslizante",
            "Gafas de seguridad",
            "Botas de puntera de seguridad"
        ]
    },
    # SST Servicios IG SAS
    {
        "id": "sst-101",
        "tenant_id": "emp-1792009016839",
        "tool_id": "tool-sig-001",
        "hazards": ["Electrocución por cables expuestos", "Atrapamiento por broca", "Vibración"],
        "preventive_measures": "Inspeccionar cableado, no presionar excesivamente, usar mango auxiliar.",
        "required_epp": ["Gafas de seguridad", "Protector auditivo", "Guantes de vaqueta", "Mascarilla N95"]
    },
    # SST Matma Mobiliario
    {
        "id": "sst-201",
        "tenant_id": "emp-1792010387578",
        "tool_id": "tool-mat-001",
        "hazards": ["Amputación o corte grave por disco dentado", "Retroceso violento de madera (Kickback)", "Polvo fino de madera"],
        "preventive_measures": "Uso permanente de empujador de madera, cuña separadora y campana de extracción de viruta activa.",
        "required_epp": ["Gafas de seguridad ajustadas", "Protección auditiva", "Respirador para polvo fino de madera P100", "Calzado de seguridad"]
    }
]

# 3. tools_maintenance_plan
tools_maintenance_plan = [
    {
        "id": "plan-001",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-001",
        "type": "Preventivo",
        "periodicity_days": 90,
        "last_date": "2026-08-15",
        "next_date": "2026-11-13"
    },
    {
        "id": "plan-002",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-002",
        "type": "Inspección Preoperacional",
        "periodicity_days": 30,
        "last_date": "2026-09-20",
        "next_date": "2026-10-20"
    },
    {
        "id": "plan-003",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-003",
        "type": "Preventivo",
        "periodicity_days": 180,
        "last_date": "2026-05-10",
        "next_date": "2026-11-06"
    },
    {
        "id": "plan-004",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-004",
        "type": "Calibración",
        "periodicity_days": 180,
        "last_date": "2026-03-10",
        "next_date": "2026-09-06"  # VENCIDO - Genera alerta roja para el Dashboard
    },
    {
        "id": "plan-005",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-005",
        "type": "Calibración",
        "periodicity_days": 365,
        "last_date": "2025-11-20",
        "next_date": "2026-11-20"
    },
    # Servicios IG
    {
        "id": "plan-101",
        "tenant_id": "emp-1792009016839",
        "tool_id": "tool-sig-001",
        "type": "Preventivo",
        "periodicity_days": 60,
        "last_date": "2026-08-25",
        "next_date": "2026-10-24"
    },
    # Matma Mobiliario
    {
        "id": "plan-201",
        "tenant_id": "emp-1792010387578",
        "tool_id": "tool-mat-001",
        "type": "Preventivo",
        "periodicity_days": 60,
        "last_date": "2026-09-01",
        "next_date": "2026-10-31"
    }
]

# 4. tools_assignments
tools_assignments = [
    {
        "id": "asg-001",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-001",
        "employee_id": "trab-003",  # Julián Esteban Ospina (Operador de Horno)
        "project_id": "PRJ-02 Horno Túnel Tunja",
        "assigned_at": "2026-08-01T07:00:00.000Z",
        "returned_at": None,
        "digital_signature_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
        "id": "asg-002",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-002",
        "employee_id": "trab-004",  # Héctor Fabio Ramírez (Mecánico de Mantenimiento)
        "project_id": "PRJ-01 Planta Principal Ladrillera",
        "assigned_at": "2026-09-15T08:30:00.000Z",
        "returned_at": None,
        "digital_signature_hash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    },
    # Asignación previa ya devuelta para historial
    {
        "id": "asg-003",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-003",
        "employee_id": "trab-004",
        "project_id": "PRJ-03 Mantenimiento Mecánico y Patios",
        "assigned_at": "2026-06-01T08:00:00.000Z",
        "returned_at": "2026-06-15T17:00:00.000Z",
        "digital_signature_hash": "b2f5c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852ba71"
    },
    # Servicios IG
    {
        "id": "asg-101",
        "tenant_id": "emp-1792009016839",
        "tool_id": "tool-sig-001",
        "employee_id": "emp-rep-legal",
        "project_id": "PRJ-OBRA-101 Mantenimiento Fachadas Calle 100",
        "assigned_at": "2026-09-10T08:00:00.000Z",
        "returned_at": None,
        "digital_signature_hash": "a4d3f5e288fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852bb99"
    },
    # Matma Mobiliario
    {
        "id": "asg-201",
        "tenant_id": "emp-1792010387578",
        "tool_id": "tool-mat-001",
        "employee_id": "emp-rep-legal",
        "project_id": "PRJ-CARP-201 Taller de Ensamble y Corte",
        "assigned_at": "2026-09-01T07:30:00.000Z",
        "returned_at": None,
        "digital_signature_hash": "77c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c012"
    }
]

# 5. tools_interventions_log
tools_interventions_log = [
    {
        "id": "log-001",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-001",
        "activity_date": "2026-08-15",
        "activity_type": "Preventivo",
        "responsible_type": "Externo",
        "responsible_name": "Hofmann Thermal Services S.A.S.",
        "technical_notes": "Inspección de 24 quemadores de gas natural, ajuste de electrodos de ignición, limpieza de filtros de aire de combustión y lubricación de rodamientos de tiro forzado. Pruebas de combustión y balance térmico conformes.",
        "cost": 3800000
    },
    {
        "id": "log-002",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-002",
        "activity_date": "2026-09-20",
        "activity_type": "Limpieza",
        "responsible_type": "Interno",
        "responsible_name": "Héctor Fabio Ramírez (Mecánico)",
        "technical_notes": "Soplado de bobinado con aire seco para remover polvillo de arcilla acumulado, verificación de desgaste de carbones al 45% de vida útil, inspección de cable encauchetado sin cortes ni fisuras.",
        "cost": 65000
    },
    {
        "id": "log-003",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-004",
        "activity_date": "2026-10-12",
        "activity_type": "Mantenimiento Correctivo",
        "responsible_type": "Interno",
        "responsible_name": "Héctor Fabio Ramírez",
        "technical_notes": "Reporte de lectura intermitente en pantalla LCD por impacto accidental en zona de enfriamiento. Se realiza diagnóstico preliminar y se traslada a taller de calibración metrológica autorizada.",
        "cost": 240000
    },
    {
        "id": "log-004",
        "tenant_id": "emp-1790438946268",
        "tool_id": "tool-och-005",
        "activity_date": "2025-11-20",
        "activity_type": "Preventivo",
        "responsible_type": "Externo",
        "responsible_name": "Laboratorio Metrológico de Colombia S.A.S.",
        "technical_notes": "Calibración anual bajo norma ISO 6789. Emisión de certificado metrológico No. CM-2025-9924. Error máximo verificado: 1.8% (Dentro de tolerancia ±4%).",
        "cost": 420000
    }
]

# 6. data_privacy_consents
data_privacy_consents = [
    {
        "id": "consent-och-001",
        "tenant_id": "emp-1790438946268",
        "user_id": "i.gonzalez.dsilva@gmail.com",
        "consent_type": "Habeas_Data",
        "ip_address": "186.84.90.114",
        "accepted_at": "2026-10-14T15:30:00.000Z",
        "policy_version": "v1.0-2026"
    },
    {
        "id": "consent-och-002",
        "tenant_id": "emp-1790438946268",
        "user_id": "i.gonzalez.dsilva@gmail.com",
        "consent_type": "Confidencialidad_Empresarial",
        "ip_address": "186.84.90.114",
        "accepted_at": "2026-10-14T15:30:00.000Z",
        "policy_version": "v1.0-2026"
    },
    {
        "id": "consent-och-003",
        "tenant_id": "emp-1790438946268",
        "user_id": "i.gonzalez.dsilva@gmail.com",
        "consent_type": "Custodia_Activos",
        "ip_address": "186.84.90.114",
        "accepted_at": "2026-10-14T15:30:00.000Z",
        "policy_version": "v1.0-2026"
    }
]

db['tools_inventory'] = tools_inventory
db['tools_sst'] = tools_sst
db['tools_maintenance_plan'] = tools_maintenance_plan
db['tools_assignments'] = tools_assignments
db['tools_interventions_log'] = tools_interventions_log
db['data_privacy_consents'] = data_privacy_consents

with open(DB_PATH, 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print(f"✓ Seed completado exitosamente en {DB_PATH}:")
print(f"  - Herramientas: {len(tools_inventory)}")
print(f"  - Perfiles SST: {len(tools_sst)}")
print(f"  - Planes Mantenimiento: {len(tools_maintenance_plan)}")
print(f"  - Asignaciones Activas: {len(tools_assignments)}")
print(f"  - Bitácora Intervenciones: {len(tools_interventions_log)}")
print(f"  - Consentimientos Registrados: {len(data_privacy_consents)}")
