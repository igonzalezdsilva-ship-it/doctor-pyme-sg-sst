// =============================================================================
// GESTOR DE ESTADO Y PERSISTENCIA (LOCALSTORAGE + EXPORT/IMPORT)
// =============================================================================
import { EMPRESAS_DEMO, MATRIZ_RIESGOS_DEMO, PLAN_TRABAJO_DEMO, ACCIDENTES_DEMO } from './data.js';
import { determinarGrupoEstandares } from './standards.js';
import { evidenceDB } from './db.js';

const STORAGE_KEY = 'SG_SST_APP_DATA_V1';
const ACTIVE_COMPANY_KEY = 'SG_SST_ACTIVE_COMPANY_ID';
const ACTIVE_YEAR_KEY = 'SG_SST_ACTIVE_YEAR';
const ANIO_BASE_INICIAL = '2026';

export const EVALUACIONES_RECUPERADAS_AYER = {
  "2025": {
    "1.1.1.1": {
      "estado": "CUMPLE",
      "justificacion": "Profesional en SST o con especialización en SST (certificados de acta de grado y diploma)",
      "linkGuia": "",
      "updatedAt": "2026-09-29T14:57:41.352Z"
    },
    "1.1.1.2": {
      "estado": "CUMPLE",
      "justificacion": "Licencia vigente de SST",
      "linkGuia": "",
      "updatedAt": "2026-09-29T14:58:47.931Z"
    },
    "1.1.1.3": {
      "estado": "CUMPLE",
      "justificacion": "Acta asignación de profesional responsable SG SST",
      "linkGuia": "https://docs.google.com/document/d/1KwN9NqmkfD7RTZMilnMopH4AeTbdIftwNfaBRCQg9H8/edit?usp=sharing",
      "updatedAt": "2026-09-29T15:15:49.312Z"
    },
    "1.1.2.1": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades documentadas y firmadas las responsabilidades para la alta dirección.",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-29T15:37:30.691Z"
    },
    "1.1.2.2": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades del COPASST definidas",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-29T15:52:58.693Z"
    },
    "1.1.2.3": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades del Comité de Convivencia definidas",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-29T15:53:04.562Z"
    },
    "1.1.2.4": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades de Brigadistas definidas",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-29T15:53:10.036Z"
    },
    "1.1.2.5": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades de Trabajadores definidas",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-29T15:53:19.163Z"
    },
    "1.1.2.6": {
      "estado": "CUMPLE",
      "justificacion": "Evidencias y soportes de socialización a toda la organización",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-29T16:00:36.747Z"
    },
    "1.1.3": {
      "estado": "CUMPLE",
      "justificacion": "Recursos Financieros - Presupuesto Anual",
      "linkGuia": "https://docs.google.com/spreadsheets/d/1j9ZjfdRTcrpZNUwa2Kp0HPNDOffEtDDo/edit?usp=sharing&ouid=105054984538376788001&rtpof=true&sd=true",
      "updatedAt": "2026-09-29T16:00:24.571Z"
    },
    "1.1.4": {
      "estado": "CUMPLE",
      "justificacion": "Planillas de seguridad social - 2026",
      "linkGuia": "",
      "updatedAt": "2026-09-29T16:00:21.964Z"
    },
    "3.1.3": {
      "estado": "CUMPLE",
      "justificacion": "Perfil sociodemografico",
      "linkGuia": "https://docs.google.com/spreadsheets/d/17Fn1kRCPqey7OsAayK8aIE-i3eMmHmWnlSUhQrODGCc/edit?gid=1384905893#gid=1384905893",
      "updatedAt": "2026-09-29T16:35:31.830Z"
    },
    "3.1.7.1": {
      "estado": "CUMPLE",
      "justificacion": "Política de prevención y consumo de tabaco, alcohol y sustancias psicoactivas, firmada por el empleador.",
      "linkGuia": "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
      "updatedAt": "2026-09-30T17:10:50.287Z"
    },
    "3.1.7.2": {
      "estado": "CUMPLE",
      "justificacion": "Programa de estilos de vida y entornos saludables (Prevención y Promoción de salud Pública): tabaquismo, alcoholismo, farmacodependencia, salud mental, alimentación saludable, pausas activas, ergonomía y control de enfermedades.",
      "linkGuia": "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
      "updatedAt": "2026-09-30T17:10:50.287Z"
    },
    "2.1.1": {
      "estado": "CUMPLE",
      "justificacion": "Policitica Actualizada 2026 - Firmada por represnetanta legal y soportes de capacitacion. ",
      "linkGuia": "https://docs.google.com/document/d/1sRg32I5sGNpe6ROYxwxjq1pcRpEPAZN9mJoWj_rEpFw/edit?usp=sharing",
      "updatedAt": "2026-09-29T17:21:15.578Z"
    },
    "1.1.5": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T14:21:48.824Z"
    },
    "1.1.6": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T15:10:21.337Z"
    },
    "1.1.7": {
      "linkGuia": "https://docs.google.com/presentation/d/1Pogtv62k7U8Uc9Y-q6-CkoSIkZ9GPeYoTO4ytHBhkYM/edit?usp=sharing",
      "updatedAt": "2026-09-30T15:11:34.119Z",
      "estado": "CUMPLE"
    },
    "1.1.8": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T15:30:55.824Z",
      "linkGuia": ""
    },
    "1.2.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/16xBhbhxgWSB7zUBTaOiCFslyKDhKLlQgcmEBI4v7fb0/edit?usp=sharing",
      "updatedAt": "2026-09-30T15:34:42.535Z",
      "estado": "CUMPLE"
    },
    "1.2.2": {
      "estado": "NO_APLICA",
      "updatedAt": "2026-09-30T15:40:54.743Z",
      "justificacion": "No se realizan actividades en alturas o espacios confinados que demanden certificaciones externas "
    },
    "1.2.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T15:41:38.428Z"
    },
    "2.2.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/153Ov4yABAp5INyO68ii9eOSiqsmWN39PS3_mUyOMO-E/edit?gid=1312744091#gid=1312744091",
      "updatedAt": "2026-09-30T15:54:38.557Z",
      "estado": "CUMPLE"
    },
    "2.3.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1y2GNo3owQiyUmRa_WM9EwyQEjwGy9yOZtuHbCBXoTg0/edit?usp=sharing",
      "updatedAt": "2026-09-30T15:54:35.640Z",
      "estado": "CUMPLE"
    },
    "2.4.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1JOwYHHi-ba1Jts79jWLNT8xqExg03bgIZxOMi0XAl0U/edit?usp=sharing",
      "updatedAt": "2026-09-30T15:59:55.306Z",
      "estado": "CUMPLE"
    },
    "2.5.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1gaamZRZIqd1B1IdnF6S3vwqVzUR68izYt2IbmaJJVCk/edit?usp=sharing",
      "updatedAt": "2026-09-30T16:01:00.765Z",
      "estado": "CUMPLE"
    },
    "2.9.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:02:55.021Z"
    },
    "2.10.1": {
      "estado": "NO_CUMPLE",
      "updatedAt": "2026-09-30T16:04:08.458Z"
    },
    "2.11.1": {
      "estado": "NO_APLICA",
      "updatedAt": "2026-09-30T16:04:20.075Z"
    },
    "2.7.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1DxsrXdYgG99KxXvZg9XMpNL1dQuTfYrzaXw0TNeKh9k/edit?usp=sharing",
      "updatedAt": "2026-09-30T16:06:04.760Z",
      "estado": "CUMPLE"
    },
    "2.6.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:06:58.019Z"
    },
    "3.1.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:09:31.778Z",
      "linkGuia": "https://docs.google.com/spreadsheets/d/1pWHmc5DCNYd93LPwt9vJ0RJE7tDX_bq_xm06MZrcs18/edit?gid=1747483566#gid=1747483566"
    },
    "3.1.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:14:29.179Z"
    },
    "3.1.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:16:21.173Z"
    },
    "3.1.5": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:20:17.860Z"
    },
    "3.1.6": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:25:06.929Z"
    },
    "3.1.8": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:26:10.195Z"
    },
    "3.1.9": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:27:01.464Z"
    },
    "3.2.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:43:43.716Z"
    },
    "3.2.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:56:08.876Z"
    },
    "3.2.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:56:11.177Z"
    },
    "4.1.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1r5uCJkbwY8cRiAMk82XuHngf9iIATwZrU39Mtf1TpVU/edit?usp=sharing",
      "updatedAt": "2026-09-30T16:56:57.184Z",
      "estado": "CUMPLE"
    },
    "4.1.2": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1r5uCJkbwY8cRiAMk82XuHngf9iIATwZrU39Mtf1TpVU/edit?usp=sharing",
      "updatedAt": "2026-09-30T16:57:06.085Z",
      "estado": "CUMPLE"
    },
    "4.1.3": {
      "linkGuia": "https://drive.google.com/drive/folders/19I3DB87qxUcNDLaxh8EmCgbGP-Xi9EaW",
      "updatedAt": "2026-09-30T16:57:40.228Z",
      "estado": "CUMPLE"
    },
    "2.8.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.5": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.6": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "4.1.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "4.2.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "4.2.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "4.2.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "4.2.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "4.2.5": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "4.2.6": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "5.1.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "5.1.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "6.1.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "6.1.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "6.1.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "6.1.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "7.1.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "7.1.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "7.1.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "7.1.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    }
  },
  "2026": {
    "1.1.1.1": {
      "estado": "CUMPLE",
      "justificacion": "Profesional en SST o con especialización en SST (certificados de acta de grado y diploma)",
      "planAccion": "",
      "linkGuia": "",
      "updatedAt": "2026-09-29T16:41:21.537Z"
    },
    "1.1.1.2": {
      "estado": "CUMPLE",
      "justificacion": "Licencia vigente de SST",
      "planAccion": "",
      "linkGuia": "",
      "updatedAt": "2026-09-29T16:41:21.537Z"
    },
    "1.1.1.3": {
      "estado": "CUMPLE",
      "justificacion": "Acta asignación de profesional responsable SG SST",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1KwN9NqmkfD7RTZMilnMopH4AeTbdIftwNfaBRCQg9H8/edit?usp=sharing",
      "updatedAt": "2026-09-29T16:41:21.537Z"
    },
    "1.1.2.1": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades documentadas y firmadas las responsabilidades para la alta dirección.",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-29T16:41:21.537Z"
    },
    "1.1.2.2": {
      "estado": "CUMPLE",
      "justificacion": "",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:58:29.629Z"
    },
    "1.1.2.3": {
      "estado": "CUMPLE",
      "justificacion": "",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:58:27.479Z"
    },
    "1.1.2.4": {
      "estado": "CUMPLE",
      "justificacion": "",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:58:25.512Z"
    },
    "1.1.2.5": {
      "estado": "CUMPLE",
      "justificacion": "",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:21:28.374Z"
    },
    "1.1.2.6": {
      "estado": "CUMPLE",
      "justificacion": "",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:21:30.524Z"
    },
    "1.1.3": {
      "estado": "CUMPLE",
      "justificacion": "Recursos Financieros - Presupuesto Anual",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/spreadsheets/d/1j9ZjfdRTcrpZNUwa2Kp0HPNDOffEtDDo/edit?usp=sharing&ouid=105054984538376788001&rtpof=true&sd=true",
      "updatedAt": "2026-09-29T16:41:21.537Z"
    },
    "1.1.4": {
      "estado": "CUMPLE",
      "justificacion": "Planillas de seguridad social - 2026",
      "planAccion": "",
      "linkGuia": "",
      "updatedAt": "2026-09-29T16:41:21.537Z"
    },
    "2.1.1": {
      "estado": "CUMPLE",
      "justificacion": "Policitica Actualizada 2026 - Firmada por represnetanta legal y soportes de capacitacion. ",
      "linkGuia": "https://docs.google.com/document/d/1sRg32I5sGNpe6ROYxwxjq1pcRpEPAZN9mJoWj_rEpFw/edit?usp=sharing",
      "updatedAt": "2026-09-29T17:21:15.578Z"
    },
    "3.1.3": {
      "estado": "CUMPLE",
      "justificacion": "Perfil sociodemografico",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/spreadsheets/d/17Fn1kRCPqey7OsAayK8aIE-i3eMmHmWnlSUhQrODGCc/edit?gid=1384905893#gid=1384905893",
      "updatedAt": "2026-09-29T16:41:21.537Z"
    },
    "1.1.5": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T14:21:48.824Z"
    },
    "1.1.6": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T15:10:21.337Z"
    },
    "1.1.7": {
      "linkGuia": "https://docs.google.com/presentation/d/1Pogtv62k7U8Uc9Y-q6-CkoSIkZ9GPeYoTO4ytHBhkYM/edit?usp=sharing",
      "updatedAt": "2026-09-30T15:11:34.119Z",
      "estado": "CUMPLE"
    },
    "1.1.8": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T15:30:55.824Z",
      "linkGuia": ""
    },
    "1.2.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/16BAHVpwmkIfIIJqKpHkpNUdwoAtZyQEs8Ozh5gdITlI/edit?usp=sharing",
      "updatedAt": "2026-10-03T15:30:38.527Z",
      "estado": "CUMPLE"
    },
    "1.2.2": {
      "estado": "NO_APLICA",
      "updatedAt": "2026-09-30T15:40:54.743Z",
      "justificacion": "No se realizan actividades en alturas o espacios confinados que demanden certificaciones externas "
    },
    "1.2.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T15:41:38.428Z"
    },
    "2.2.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/153Ov4yABAp5INyO68ii9eOSiqsmWN39PS3_mUyOMO-E/edit?gid=1312744091#gid=1312744091",
      "updatedAt": "2026-09-30T15:54:38.557Z",
      "estado": "CUMPLE"
    },
    "2.3.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1y2GNo3owQiyUmRa_WM9EwyQEjwGy9yOZtuHbCBXoTg0/edit?usp=sharing",
      "updatedAt": "2026-09-30T15:54:35.640Z",
      "estado": "CUMPLE"
    },
    "2.4.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1JOwYHHi-ba1Jts79jWLNT8xqExg03bgIZxOMi0XAl0U/edit?usp=sharing",
      "updatedAt": "2026-09-30T15:59:55.306Z",
      "estado": "CUMPLE"
    },
    "2.5.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1gaamZRZIqd1B1IdnF6S3vwqVzUR68izYt2IbmaJJVCk/edit?usp=sharing",
      "updatedAt": "2026-09-30T16:01:00.765Z",
      "estado": "CUMPLE"
    },
    "2.9.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:02:55.021Z"
    },
    "2.10.1": {
      "estado": "NO_CUMPLE",
      "updatedAt": "2026-09-30T16:04:08.458Z"
    },
    "2.11.1": {
      "estado": "NO_APLICA",
      "updatedAt": "2026-09-30T16:04:20.075Z"
    },
    "2.7.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1DxsrXdYgG99KxXvZg9XMpNL1dQuTfYrzaXw0TNeKh9k/edit?usp=sharing",
      "updatedAt": "2026-09-30T16:06:04.760Z",
      "estado": "CUMPLE"
    },
    "2.6.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:06:58.019Z"
    },
    "3.1.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:09:31.778Z",
      "linkGuia": "https://docs.google.com/spreadsheets/d/1pWHmc5DCNYd93LPwt9vJ0RJE7tDX_bq_xm06MZrcs18/edit?gid=1747483566#gid=1747483566"
    },
    "3.1.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:14:29.179Z"
    },
    "3.1.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:16:21.173Z"
    },
    "3.1.5": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:20:17.860Z"
    },
    "3.1.6": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:25:06.929Z"
    },
    "3.1.7.1": {
      "estado": "CUMPLE",
      "justificacion": "Política de prevención y consumo de tabaco, alcohol y sustancias psicoactivas, firmada por el empleador.",
      "linkGuia": "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
      "updatedAt": "2026-09-30T17:10:50.287Z"
    },
    "3.1.7.2": {
      "estado": "CUMPLE",
      "justificacion": "Programa de estilos de vida y entornos saludables (Prevención y Promoción de salud Pública): tabaquismo, alcoholismo, farmacodependencia, salud mental, alimentación saludable, pausas activas, ergonomía y control de enfermedades.",
      "linkGuia": "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
      "updatedAt": "2026-09-30T17:10:50.287Z"
    },
    "3.1.8": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:26:10.195Z"
    },
    "3.1.9": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:27:01.464Z"
    },
    "3.2.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:43:43.716Z"
    },
    "3.2.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:56:08.876Z"
    },
    "3.2.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:56:11.177Z"
    },
    "4.1.1": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1r5uCJkbwY8cRiAMk82XuHngf9iIATwZrU39Mtf1TpVU/edit?usp=sharing",
      "updatedAt": "2026-09-30T16:56:57.184Z",
      "estado": "CUMPLE"
    },
    "4.1.2": {
      "linkGuia": "https://docs.google.com/spreadsheets/d/1r5uCJkbwY8cRiAMk82XuHngf9iIATwZrU39Mtf1TpVU/edit?usp=sharing",
      "updatedAt": "2026-10-03T16:09:46.480Z",
      "estado": "CUMPLE"
    },
    "4.1.3": {
      "linkGuia": "https://drive.google.com/drive/folders/19I3DB87qxUcNDLaxh8EmCgbGP-Xi9EaW",
      "updatedAt": "2026-10-03T16:09:58.659Z",
      "estado": "CUMPLE"
    },
    "2.8.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:08:40.752Z"
    },
    "4.1.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:10:08.692Z"
    },
    "4.2.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:10:20.858Z"
    },
    "4.2.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:10:39.407Z"
    },
    "4.2.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:10:44.507Z"
    },
    "4.2.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:13:01.772Z"
    },
    "4.2.6": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "4.2.5": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:20:36.662Z"
    },
    "5.1.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:20:45.845Z",
      "linkGuia": "https://drive.google.com/file/d/17S8G1u-aBV7Hhr2T5PVzT_zRtYqSxPif/view?usp=drive_link"
    },
    "5.1.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:21:15.345Z"
    },
    "6.1.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:21:45.878Z"
    },
    "6.1.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T16:21:47.563Z"
    },
    "3.3.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.5": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "3.3.6": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "6.1.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "6.1.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "7.1.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "7.1.2": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "7.1.3": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    },
    "7.1.4": {
      "estado": "CUMPLE",
      "updatedAt": "2026-10-03T11:37:49-05:00"
    }
  }
};

const memStorage = {};
const storage = typeof localStorage !== 'undefined' ? localStorage : {
  getItem: (k) => memStorage[k] || null,
  setItem: (k, v) => { memStorage[k] = String(v); },
  removeItem: (k) => { delete memStorage[k]; }
};

class Store {
  constructor() {
    this.listeners = [];
    this.saveStatusListeners = [];
    this.lastSaved = new Date();
    this.serverSynced = false;
    this.init();
    this.sincronizarConServidorFisico();
  }

  init() {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      this.resetearDatosDemo();
      this.intentarRecuperarDeIndexedDB();
    } else {
      try {
        this.data = JSON.parse(raw);
        if (!this.data || !Array.isArray(this.data.empresas)) {
          this.guardarCopiaEmergencia(raw);
          this.resetearDatosDemo();
          this.intentarRecuperarDeIndexedDB();
        } else {
          // Garantizar integridad estructural de todas las colecciones
          if (!Array.isArray(this.data.matriz)) this.data.matriz = [...MATRIZ_RIESGOS_DEMO];
          if (!Array.isArray(this.data.planTrabajo)) this.data.planTrabajo = [...PLAN_TRABAJO_DEMO];
          if (!Array.isArray(this.data.accidentes)) this.data.accidentes = [...ACCIDENTES_DEMO];
          if (!this.data.evaluaciones || typeof this.data.evaluaciones !== 'object') this.data.evaluaciones = {};

          // Migración estructural: garantizar que cada empresa almacena sus evaluaciones por AÑO (iniciando en 2025)
          Object.keys(this.data.evaluaciones).forEach(cid => {
            const evalCid = this.data.evaluaciones[cid];
            if (evalCid && typeof evalCid === 'object') {
              // Comprobar si evalCid tiene claves de numerales directamente (ej. '1.1.1', '1.1.1.1', '4.1.1')
              // en lugar de años de 4 dígitos ('2025', '2026', etc.)
              const keys = Object.keys(evalCid);
              const tieneNumeralesDirectos = keys.some(k => k.includes('.') || !/^\d{4}$/.test(k));

              if (tieneNumeralesDirectos) {
                const evaluacion2025 = {};
                keys.forEach(k => {
                  if (k.includes('.') || !/^\d{4}$/.test(k)) {
                    evaluacion2025[k] = evalCid[k];
                    delete evalCid[k];
                  }
                });
                evalCid['2025'] = { ...(evalCid['2025'] || {}), ...evaluacion2025 };
              }

              // Asegurar que al menos existe el año 2025
              if (!evalCid['2025']) {
                evalCid['2025'] = {};
              }

              // Aplicar migraciones internas en cada año existente (1.1.1 y 1.1.2)
              Object.keys(evalCid).forEach(anio => {
                if (!/^\d{4}$/.test(anio)) return;
                const evalAnio = evalCid[anio];
                if (!evalAnio || typeof evalAnio !== 'object') return;

                if (evalAnio['1.1.1']) {
                  if (!evalAnio['1.1.1.1']) evalAnio['1.1.1.1'] = { ...evalAnio['1.1.1'], justificacion: evalAnio['1.1.1'].justificacion || "Diploma y acta de grado profesional/posgrado SST" };
                  if (!evalAnio['1.1.1.2']) evalAnio['1.1.1.2'] = { ...evalAnio['1.1.1'], justificacion: evalAnio['1.1.1'].justificacion || "Licencia SST vigente" };
                  if (!evalAnio['1.1.1.3']) evalAnio['1.1.1.3'] = { ...evalAnio['1.1.1'], justificacion: evalAnio['1.1.1'].justificacion || "Acta de nombramiento del responsable del SG-SST debidamente firmada por representante legal y profesional SST" };
                }
                if (evalAnio['1.1.1.3'] && (evalAnio['1.1.1.3'].justificacion === "Acta de asignación de responsabilidades firmada" || evalAnio['1.1.1.3'].justificacion === "Acta de asignación de responsabilidades firmada por gerencia")) {
                  evalAnio['1.1.1.3'].justificacion = "Acta de nombramiento del responsable del SG-SST debidamente firmada por el representante legal y el profesional responsable de SST";
                }
                if (evalAnio['1.1.1.3'] && !evalAnio['1.1.1.3'].linkGuia) {
                  evalAnio['1.1.1.3'].linkGuia = "https://docs.google.com/document/d/1ActaNombramientoResponsableSST_DemoGuia/edit";
                }

                if (evalAnio['1.1.2']) {
                  const base = evalAnio['1.1.2'];
                  if (!evalAnio['1.1.2.1']) evalAnio['1.1.2.1'] = { ...base, justificacion: base.justificacion || "Responsabilidades de Alta Dirección definidas" };
                  if (!evalAnio['1.1.2.2']) evalAnio['1.1.2.2'] = { ...base, justificacion: base.justificacion || "Responsabilidades del COPASST definidas" };
                  if (!evalAnio['1.1.2.3']) evalAnio['1.1.2.3'] = { ...base, justificacion: base.justificacion || "Responsabilidades del Comité de Convivencia definidas" };
                  if (!evalAnio['1.1.2.4']) evalAnio['1.1.2.4'] = { ...base, justificacion: base.justificacion || "Responsabilidades de Brigadistas definidas" };
                  if (!evalAnio['1.1.2.5']) evalAnio['1.1.2.5'] = { ...base, justificacion: base.justificacion || "Responsabilidades de Trabajadores definidas" };
                  if (!evalAnio['1.1.2.6']) evalAnio['1.1.2.6'] = { ...base, justificacion: base.justificacion || "Evidencias y soportes de socialización a toda la organización" };
                }

                if (evalAnio['3.1.7']) {
                  const base317 = evalAnio['3.1.7'];
                  if (!evalAnio['3.1.7.1']) {
                    evalAnio['3.1.7.1'] = {
                      ...base317,
                      justificacion: base317.justificacion || "Política de prevención y consumo de tabaco, alcohol y sustancias psicoactivas, firmada por el empleador.",
                      linkGuia: base317.linkGuia || "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
                      estado: base317.estado || "CUMPLE"
                    };
                  }
                  if (!evalAnio['3.1.7.2']) {
                    evalAnio['3.1.7.2'] = {
                      ...base317,
                      justificacion: base317.justificacion || "Programa de estilos de vida y entornos saludables (Prevención y Promoción de salud Pública): tabaquismo, alcoholismo, farmacodependencia, salud mental, alimentación saludable, pausas activas, ergonomía y control de enfermedades.",
                      linkGuia: base317.linkGuia || "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
                      estado: base317.estado || "CUMPLE"
                    };
                  }
                }
              });
            }
          });

          // Limpiar empresas demo obsoletas (emp-001, emp-002, emp-003) para que sólo quede LADRILLOS OCHOA LTDA
          const idsObsoletos = ['emp-001', 'emp-002', 'emp-003'];
          this.data.empresas = this.data.empresas.filter(e => !idsObsoletos.includes(e.id));
          if (Array.isArray(this.data.matriz)) {
            this.data.matriz = this.data.matriz.filter(m => !idsObsoletos.includes(m.companyId));
          }
          if (Array.isArray(this.data.planTrabajo)) {
            this.data.planTrabajo = this.data.planTrabajo.filter(p => !idsObsoletos.includes(p.companyId));
          }
          if (Array.isArray(this.data.accidentes)) {
            this.data.accidentes = this.data.accidentes.filter(a => !idsObsoletos.includes(a.companyId));
          }
          idsObsoletos.forEach(id => {
            delete this.data.evaluaciones[id];
          });

          // Consolidar empresa única auténtica: LADRILLOS OCHOA LTDA (emp-1790438946268)
          const ID_OCHOA = "emp-1790438946268";
          const ochoaExistente = this.data.empresas.find(e => 
            e.id === ID_OCHOA || e.id === 'emp-004' || (e.razonSocial && e.razonSocial.toLowerCase().includes('ladrillos ochoa'))
          );

          if (!ochoaExistente) {
            this.data.empresas = [{ ...EMPRESAS_DEMO[0] }];
          } else {
            this.data.empresas = [{
              ...EMPRESAS_DEMO[0],
              ...ochoaExistente,
              id: ID_OCHOA,
              razonSocial: "LADRILLOS OCHOA LTDA",
              nit: ochoaExistente.nit || EMPRESAS_DEMO[0].nit,
              arl: ochoaExistente.arl || EMPRESAS_DEMO[0].arl,
              claseRiesgo: ochoaExistente.claseRiesgo || EMPRESAS_DEMO[0].claseRiesgo,
              trabajadores: ochoaExistente.trabajadores || EMPRESAS_DEMO[0].trabajadores,
              responsableSST: ochoaExistente.responsableSST || EMPRESAS_DEMO[0].responsableSST,
              email: ochoaExistente.email || EMPRESAS_DEMO[0].email,
              telefono: ochoaExistente.telefono || EMPRESAS_DEMO[0].telefono,
              estandaresAplicables: 60,
              tieneMapaProcesos: true,
              tieneOrganigrama: true
            }];
          }

          // Restaurar y fusionar evaluaciones auténticas recuperadas de la jornada de ayer
          if (!this.data.evaluaciones[ID_OCHOA]) {
            this.data.evaluaciones[ID_OCHOA] = {};
          }
          if (this.data.evaluaciones['emp-004'] && this.data.evaluaciones['emp-004'] !== this.data.evaluaciones[ID_OCHOA]) {
            Object.keys(this.data.evaluaciones['emp-004']).forEach(anio => {
              if (!this.data.evaluaciones[ID_OCHOA][anio]) {
                this.data.evaluaciones[ID_OCHOA][anio] = {};
              }
              Object.assign(this.data.evaluaciones[ID_OCHOA][anio], this.data.evaluaciones['emp-004'][anio]);
            });
          }

          // Garantizar que la documentación de ayer (2025 y 2026) quede 100% restaurada con sus links y justificaciones
          Object.keys(EVALUACIONES_RECUPERADAS_AYER).forEach(anio => {
            if (!this.data.evaluaciones[ID_OCHOA][anio]) {
              this.data.evaluaciones[ID_OCHOA][anio] = {};
            }
            const itemsRecuperados = EVALUACIONES_RECUPERADAS_AYER[anio];
            Object.keys(itemsRecuperados).forEach(numeral => {
              const actual = this.data.evaluaciones[ID_OCHOA][anio][numeral];
              if (!actual || !actual.linkGuia || !actual.justificacion) {
                this.data.evaluaciones[ID_OCHOA][anio][numeral] = {
                  ...(actual || {}),
                  ...itemsRecuperados[numeral]
                };
              } else if (itemsRecuperados[numeral].linkGuia && !actual.linkGuia) {
                this.data.evaluaciones[ID_OCHOA][anio][numeral].linkGuia = itemsRecuperados[numeral].linkGuia;
              }
            });
          });

          // Mantener alias emp-004 sincronizado
          this.data.evaluaciones['emp-004'] = this.data.evaluaciones[ID_OCHOA];

          this.saveToStorage();
        }
      } catch (e) {
        console.error("Error al parsear datos de almacenamiento local", e);
        this.guardarCopiaEmergencia(raw);
        this.resetearDatosDemo();
        this.intentarRecuperarDeIndexedDB();
      }
    }

    let savedCompany = storage.getItem(ACTIVE_COMPANY_KEY);
    if (!savedCompany || ['emp-001', 'emp-002', 'emp-003', 'emp-004'].includes(savedCompany) || (savedCompany !== 'todas' && !this.data?.empresas?.some(e => e.id === savedCompany))) {
      savedCompany = 'emp-1790438946268';
      storage.setItem(ACTIVE_COMPANY_KEY, 'emp-1790438946268');
    }
    this.empresaActivaId = savedCompany;

    const savedYear = storage.getItem(ACTIVE_YEAR_KEY);
    this.anioActivo = savedYear || ANIO_BASE_INICIAL;
  }

  saveToStorage() {
    this.lastSaved = new Date();
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      if (typeof evidenceDB !== 'undefined' && evidenceDB.guardarSnapshot) {
        evidenceDB.guardarSnapshot(this.data).catch(() => {});
      }
      this.notifySaveStatus({ status: 'ok', timestamp: this.lastSaved, serverSynced: this.serverSynced });
    } catch (e) {
      console.warn("Advertencia al escribir en LocalStorage:", e);
      if (typeof evidenceDB !== 'undefined' && evidenceDB.guardarSnapshot) {
        evidenceDB.guardarSnapshot(this.data).catch(() => {});
      }
      this.notifySaveStatus({ status: 'warning', error: e?.message || "Almacenamiento restringido", timestamp: this.lastSaved });
    }
    this.enviarAlServidorFisico();
    this.notify();
  }

  async sincronizarConServidorFisico() {
    if (typeof fetch === 'undefined') return;
    try {
      const resp = await fetch('/api/data');
      if (resp.ok) {
        const serverData = await resp.json();
        if (serverData && Array.isArray(serverData.empresas) && serverData.empresas.length > 0) {
          console.log("✓ Sincronizado con Base de Datos Física en Disco (data/database.json)");
          this.data = serverData;
          this.serverSynced = true;
          this.lastSaved = new Date();
          if (!this.data.empresas.some(e => e.id === this.empresaActivaId)) {
            this.empresaActivaId = this.data.empresas[0].id;
            storage.setItem(ACTIVE_COMPANY_KEY, this.empresaActivaId);
          }
          try {
            storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            if (typeof evidenceDB !== 'undefined' && evidenceDB.guardarSnapshot) {
              evidenceDB.guardarSnapshot(this.data).catch(() => {});
            }
          } catch {}
          this.notify();
          this.notifySaveStatus({
            status: 'ok',
            serverSynced: true,
            timestamp: this.lastSaved,
            source: 'disco_fisico'
          });
        }
      }
    } catch (e) {
      console.warn("Servidor físico en espera, operando con almacenamiento local:", e);
      this.serverSynced = false;
    }
  }

  enviarAlServidorFisico() {
    if (typeof fetch === 'undefined') return;
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(async () => {
      try {
        const resp = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.data)
        });
        if (resp.ok) {
          const resJson = await resp.json();
          this.serverSynced = true;
          this.notifySaveStatus({
            status: 'ok',
            serverSynced: true,
            timestamp: new Date(resJson.timestamp || Date.now()),
            bytes: resJson.bytes,
            backupCreated: resJson.backupCreated
          });
        } else {
          this.serverSynced = false;
        }
      } catch (e) {
        this.serverSynced = false;
        console.warn("Servidor físico desconectado, datos preservados en almacenamiento local:", e);
      }
    }, 250);
  }

  async getBackupsList() {
    if (typeof fetch === 'undefined') return [];
    try {
      const resp = await fetch('/api/backups');
      if (resp.ok) {
        const json = await resp.json();
        return json.backups || [];
      }
    } catch {}
    return [];
  }

  async restaurarDesdeBackup(filename) {
    if (typeof fetch === 'undefined' || !filename) return false;
    try {
      const resp = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.data) {
          this.data = json.data;
          this.serverSynced = true;
          this.lastSaved = new Date();
          storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
          this.notify();
          this.notifySaveStatus({ status: 'ok', serverSynced: true, timestamp: this.lastSaved });
          return true;
        }
      }
    } catch (e) {
      console.error("Error al restaurar backup:", e);
    }
    return false;
  }

  async getAuditTrail() {
    if (typeof fetch === 'undefined') return [];
    try {
      const resp = await fetch('/api/audit');
      if (resp.ok) {
        const json = await resp.json();
        return json.auditTrail || [];
      }
    } catch {}
    return [];
  }

  guardarCopiaEmergencia(raw) {
    try {
      storage.setItem('SG_SST_EMERGENCY_RECOVERY_' + Date.now(), String(raw));
    } catch {}
  }

  async intentarRecuperarDeIndexedDB() {
    if (typeof evidenceDB === 'undefined' || !evidenceDB.obtenerSnapshot) return;
    try {
      const snap = await evidenceDB.obtenerSnapshot();
      if (snap && Array.isArray(snap.empresas) && snap.empresas.length > 0) {
        console.log("Recuperando copia de seguridad previa desde IndexedDB...");
        this.data = snap;
        this.saveToStorage();
        this.notify();
      }
    } catch (e) {
      console.warn("Fallo intento de recuperación de IndexedDB:", e);
    }
  }

  onSaveStatus(listener) {
    this.saveStatusListeners.push(listener);
    return () => {
      this.saveStatusListeners = this.saveStatusListeners.filter(l => l !== listener);
    };
  }

  notifySaveStatus(status) {
    if (this.saveStatusListeners) {
      this.saveStatusListeners.forEach(l => l(status));
    }
  }

  getLastSavedTime() {
    return this.lastSaved || new Date();
  }

  getStorageDiagnostics() {
    const raw = storage.getItem(STORAGE_KEY) || '';
    const bytes = typeof Blob !== 'undefined' ? new Blob([raw]).size : raw.length;
    const kb = (bytes / 1024).toFixed(1);
    
    let totalEvaluaciones = 0;
    if (this.data?.evaluaciones) {
      Object.keys(this.data.evaluaciones).forEach(cid => {
        const empEval = this.data.evaluaciones[cid];
        if (empEval && typeof empEval === 'object') {
          Object.keys(empEval).forEach(anio => {
            const anioEval = empEval[anio];
            if (anioEval && typeof anioEval === 'object') {
              totalEvaluaciones += Object.keys(anioEval).length;
            }
          });
        }
      });
    }

    return {
      sizeKB: kb,
      totalEmpresas: this.data?.empresas?.length || 0,
      totalMatriz: this.data?.matriz?.length || 0,
      totalPlan: this.data?.planTrabajo?.length || 0,
      totalAccidentes: this.data?.accidentes?.length || 0,
      totalEvaluaciones: totalEvaluaciones,
      lastSaved: this.lastSaved || new Date(),
      status: bytes > 4500000 ? 'warning_space' : 'optimal',
      serverSynced: this.serverSynced || false,
      physicalFile: 'data/database.json'
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.data));
  }

  // --- GESTIÓN DE EMPRESA ACTIVA ---
  getEmpresaActivaId() {
    return this.empresaActivaId;
  }

  setEmpresaActivaId(id) {
    this.empresaActivaId = id;
    storage.setItem(ACTIVE_COMPANY_KEY, id);
    this.notify();
  }

  getEmpresaActiva() {
    if (this.empresaActivaId === 'todas') return null;
    return this.data.empresas.find(e => e.id === this.empresaActivaId) || this.data.empresas[0] || null;
  }

  // --- CRUD EMPRESAS ---
  getEmpresas() {
    return this.data.empresas || [];
  }

  getEmpresa(id) {
    if (!this.data?.empresas) return null;
    let emp = this.data.empresas.find(e => e.id === id);
    if (!emp && (id === 'emp-004' || id === 'emp-1790438946268')) {
      emp = this.data.empresas.find(e => e.id === 'emp-1790438946268' || e.id === 'emp-004');
    }
    return emp;
  }

  saveEmpresa(empresaData) {
    const estandares = determinarGrupoEstandares(empresaData.trabajadores, empresaData.claseRiesgo);
    let finalId = empresaData.id;
    if (empresaData.id) {
      // Actualizar
      this.data.empresas = this.data.empresas.map(e => e.id === empresaData.id ? { ...e, ...empresaData, estandaresAplicables: estandares } : e);
    } else {
      // Crear nueva
      finalId = 'emp-' + Date.now();
      const newEmpresa = {
        ...empresaData,
        id: finalId,
        estandaresAplicables: estandares,
        createdAt: new Date().toISOString()
      };
      this.data.empresas.push(newEmpresa);
      this.empresaActivaId = newEmpresa.id;
      storage.setItem(ACTIVE_COMPANY_KEY, newEmpresa.id);
    }
    this.saveToStorage();
    return finalId;
  }

  deleteEmpresa(id) {
    if (confirm("¿Estás seguro de eliminar esta empresa cliente y todos sus registros asociados?")) {
      this.data.empresas = this.data.empresas.filter(e => e.id !== id);
      this.data.matriz = this.data.matriz.filter(m => m.companyId !== id);
      this.data.planTrabajo = this.data.planTrabajo.filter(p => p.companyId !== id);
      this.data.accidentes = this.data.accidentes.filter(a => a.companyId !== id);
      delete this.data.evaluaciones[id];

      if (this.empresaActivaId === id) {
        this.empresaActivaId = this.data.empresas[0]?.id || "todas";
        storage.setItem(ACTIVE_COMPANY_KEY, this.empresaActivaId);
      }
      this.saveToStorage();
    }
  }

  // --- CRUD MATRIZ GTC 45 ---
  getMatriz(companyId = null) {
    const cid = companyId || this.empresaActivaId;
    const lista = Array.isArray(this.data?.matriz) ? this.data.matriz : [];
    if (cid === 'todas') return lista;
    return lista.filter(m => m && (m.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (m.companyId === 'emp-1790438946268' || m.companyId === 'emp-004'))));
  }

  saveRiesgo(riesgoData) {
    if (!Array.isArray(this.data.matriz)) this.data.matriz = [];
    if (riesgoData.id) {
      this.data.matriz = this.data.matriz.map(m => m.id === riesgoData.id ? { ...m, ...riesgoData } : m);
    } else {
      const newRiesgo = {
        ...riesgoData,
        id: 'gtc-' + Date.now(),
        companyId: riesgoData.companyId || this.empresaActivaId,
        fecha: new Date().toISOString().split('T')[0]
      };
      this.data.matriz.push(newRiesgo);
    }
    this.saveToStorage();
  }

  deleteRiesgo(id) {
    if (confirm("¿Deseas eliminar este registro de la matriz de peligros?")) {
      if (Array.isArray(this.data.matriz)) {
        this.data.matriz = this.data.matriz.filter(m => m.id !== id);
        this.saveToStorage();
      }
    }
  }

  // --- CRUD PLAN DE TRABAJO ---
  getPlanTrabajo(companyId = null) {
    const cid = companyId || this.empresaActivaId;
    const lista = Array.isArray(this.data?.planTrabajo) ? this.data.planTrabajo : [];
    if (cid === 'todas') return lista;
    return lista.filter(p => p && (p.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (p.companyId === 'emp-1790438946268' || p.companyId === 'emp-004'))));
  }

  saveActividadPAT(actividadData) {
    if (!Array.isArray(this.data.planTrabajo)) this.data.planTrabajo = [];
    if (actividadData.id) {
      this.data.planTrabajo = this.data.planTrabajo.map(p => p.id === actividadData.id ? { ...p, ...actividadData } : p);
    } else {
      const newAct = {
        ...actividadData,
        id: 'pat-' + Date.now(),
        companyId: actividadData.companyId || this.empresaActivaId
      };
      this.data.planTrabajo.push(newAct);
    }
    this.saveToStorage();
  }

  deleteActividadPAT(id) {
    if (confirm("¿Deseas eliminar esta actividad del plan de trabajo?")) {
      if (Array.isArray(this.data.planTrabajo)) {
        this.data.planTrabajo = this.data.planTrabajo.filter(p => p.id !== id);
        this.saveToStorage();
      }
    }
  }

  // --- CRUD ACCIDENTES (ATEL) ---
  getAccidentes(companyId = null) {
    const cid = companyId || this.empresaActivaId;
    const lista = Array.isArray(this.data?.accidentes) ? this.data.accidentes : [];
    if (cid === 'todas') return lista;
    return lista.filter(a => a && (a.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (a.companyId === 'emp-1790438946268' || a.companyId === 'emp-004'))));
  }

  saveAccidente(accidenteData) {
    if (!Array.isArray(this.data.accidentes)) this.data.accidentes = [];
    if (accidenteData.id) {
      this.data.accidentes = this.data.accidentes.map(a => a.id === accidenteData.id ? { ...a, ...accidenteData } : a);
    } else {
      const newAcc = {
        ...accidenteData,
        id: 'acc-' + Date.now(),
        companyId: accidenteData.companyId || this.empresaActivaId
      };
      this.data.accidentes.push(newAcc);
    }
    this.saveToStorage();
  }

  deleteAccidente(id) {
    if (confirm("¿Deseas eliminar este registro de accidente?")) {
      if (Array.isArray(this.data.accidentes)) {
        this.data.accidentes = this.data.accidentes.filter(a => a.id !== id);
        this.saveToStorage();
      }
    }
  }

  // --- GESTIÓN DE FILTRO GENERAL POR AÑO (INICIANDO DESDE 2025) ---
  getAnioActivo() {
    return this.anioActivo || ANIO_BASE_INICIAL;
  }

  setAnioActivo(anio) {
    if (!anio) return;
    const strAnio = String(anio).trim();
    this.anioActivo = strAnio;
    storage.setItem(ACTIVE_YEAR_KEY, strAnio);
    this.notify();
  }

  getAniosDisponibles(companyId = null) {
    const aniosSet = new Set(['2025', '2026']);
    const cid = companyId || this.empresaActivaId;

    if (cid && cid !== 'todas' && this.data?.evaluaciones?.[cid]) {
      Object.keys(this.data.evaluaciones[cid]).forEach(k => {
        if (/^\d{4}$/.test(k)) aniosSet.add(k);
      });
    } else if (this.data?.evaluaciones) {
      Object.values(this.data.evaluaciones).forEach(empEval => {
        if (empEval && typeof empEval === 'object') {
          Object.keys(empEval).forEach(k => {
            if (/^\d{4}$/.test(k)) aniosSet.add(k);
          });
        }
      });
    }

    return Array.from(aniosSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }

  abrirNuevoAnio(companyId, nuevoAnio, { copiarDeAnioAnterior = true, anioOrigen = null } = {}) {
    const cid = companyId || this.empresaActivaId;
    if (!cid || cid === 'todas') return false;
    const strAnio = String(nuevoAnio).trim();
    if (!/^\d{4}$/.test(strAnio)) return false;

    if (!this.data) this.data = {};
    if (!this.data.evaluaciones) this.data.evaluaciones = {};
    if (!this.data.evaluaciones[cid]) this.data.evaluaciones[cid] = {};

    const anioBase = anioOrigen || (parseInt(strAnio, 10) - 1).toString();
    const evalBase = this.data.evaluaciones[cid][anioBase] || this.data.evaluaciones[cid]['2025'] || {};

    if (!this.data.evaluaciones[cid][strAnio]) {
      this.data.evaluaciones[cid][strAnio] = {};
    }

    if (copiarDeAnioAnterior && Object.keys(evalBase).length > 0) {
      Object.keys(evalBase).forEach(numeral => {
        const item = evalBase[numeral];
        this.data.evaluaciones[cid][strAnio][numeral] = {
          estado: item.estado || 'PENDIENTE',
          justificacion: item.justificacion || '',
          planAccion: '',
          linkGuia: item.linkGuia || '',
          updatedAt: new Date().toISOString()
        };
      });
    }

    this.setAnioActivo(strAnio);
    this.saveToStorage();
    return true;
  }

  // --- AUTOEVALUACIÓN RESOLUCIÓN 0312 POR AÑO ---
  getEvaluacion(companyId = null, anio = null) {
    let cid = companyId || this.empresaActivaId;
    const year = String(anio || this.getAnioActivo());
    if (!this.data) this.data = {};
    if (!this.data.evaluaciones || typeof this.data.evaluaciones !== 'object') {
      this.data.evaluaciones = {};
    }
    // Soporte transparente para alias emp-004 <-> emp-1790438946268
    if (cid === 'emp-004' && (!this.data.evaluaciones['emp-004']?.[year] || Object.keys(this.data.evaluaciones['emp-004'][year]).length === 0)) {
      if (this.data.evaluaciones['emp-1790438946268']?.[year]) cid = 'emp-1790438946268';
    } else if (cid === 'emp-1790438946268' && (!this.data.evaluaciones['emp-1790438946268']?.[year] || Object.keys(this.data.evaluaciones['emp-1790438946268'][year]).length === 0)) {
      if (this.data.evaluaciones['emp-004']?.[year]) cid = 'emp-004';
    }
    if (!this.data.evaluaciones[cid]) {
      this.data.evaluaciones[cid] = {};
    }
    if (!this.data.evaluaciones[cid][year]) {
      this.data.evaluaciones[cid][year] = {};
    }
    return this.data.evaluaciones[cid][year];
  }

  saveEvaluacionItem(companyId, arg2, arg3, arg4) {
    const cid = companyId || this.empresaActivaId;
    let anio, numeral, evaluacionItem;

    if (arg4 !== undefined) {
      // Invocación explícita con 4 argumentos: saveEvaluacionItem(cid, anio, numeral, item)
      anio = String(arg2);
      numeral = arg3;
      evaluacionItem = arg4;
    } else {
      // Invocación con 3 argumentos: saveEvaluacionItem(cid, numeral, item) -> usa el año activo
      anio = this.getAnioActivo();
      numeral = arg2;
      evaluacionItem = arg3;
    }

    if (!this.data) this.data = {};
    if (!this.data.evaluaciones || typeof this.data.evaluaciones !== 'object') {
      this.data.evaluaciones = {};
    }
    if (!this.data.evaluaciones[cid]) {
      this.data.evaluaciones[cid] = {};
    }
    if (!this.data.evaluaciones[cid][anio]) {
      this.data.evaluaciones[cid][anio] = {};
    }
    this.data.evaluaciones[cid][anio][numeral] = {
      ...this.data.evaluaciones[cid][anio][numeral],
      ...evaluacionItem,
      updatedAt: new Date().toISOString()
    };
    // Sincronizar alias de Ladrillos Ochoa Ltda.
    if (cid === 'emp-1790438946268' || cid === 'emp-004') {
      const aliasId = cid === 'emp-1790438946268' ? 'emp-004' : 'emp-1790438946268';
      if (!this.data.evaluaciones[aliasId]) this.data.evaluaciones[aliasId] = {};
      if (!this.data.evaluaciones[aliasId][anio]) this.data.evaluaciones[aliasId][anio] = {};
      this.data.evaluaciones[aliasId][anio][numeral] = { ...this.data.evaluaciones[cid][anio][numeral] };
    }
    this.saveToStorage();
  }

  // --- EXPORTACIÓN E IMPORTACIÓN ---
  exportarJSON() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SG_SST_Copia_Seguridad_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importarJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.empresas && Array.isArray(parsed.empresas)) {
        this.data = {
          empresas: parsed.empresas,
          matriz: Array.isArray(parsed.matriz) ? parsed.matriz : [...MATRIZ_RIESGOS_DEMO],
          planTrabajo: Array.isArray(parsed.planTrabajo) ? parsed.planTrabajo : [...PLAN_TRABAJO_DEMO],
          accidentes: Array.isArray(parsed.accidentes) ? parsed.accidentes : [...ACCIDENTES_DEMO],
          evaluaciones: parsed.evaluaciones || {}
        };
        this.saveToStorage();
        return true;
      }
    } catch (e) {
      console.error("Error al importar archivo JSON", e);
    }
    return false;
  }

  resetearDatosDemo() {
    this.data = {
      empresas: [...EMPRESAS_DEMO],
      matriz: [...MATRIZ_RIESGOS_DEMO],
      planTrabajo: [...PLAN_TRABAJO_DEMO],
      accidentes: [...ACCIDENTES_DEMO],
      evaluaciones: {
        "emp-1790438946268": JSON.parse(JSON.stringify(EVALUACIONES_RECUPERADAS_AYER)),
        "emp-004": JSON.parse(JSON.stringify(EVALUACIONES_RECUPERADAS_AYER))
      }
    };
    this.empresaActivaId = "emp-1790438946268";
    storage.setItem(ACTIVE_COMPANY_KEY, "emp-1790438946268");
    this.saveToStorage();
  }
}

export const store = new Store();
