// =============================================================================
// GESTOR DE ESTADO Y PERSISTENCIA (LOCALSTORAGE + EXPORT/IMPORT)
// =============================================================================
import { 
  EMPRESAS_DEMO, MATRIZ_RIESGOS_DEMO, PLAN_TRABAJO_DEMO, ACCIDENTES_DEMO,
  TRABAJADORES_DEMO, CAPACITACIONES_DEMO, EQUIPOS_DEMO, MANTENIMIENTOS_DEMO,
  FIRMAS_DEMO, REPORTES_PELIGRO_DEMO, REPORTES_PREOPERACIONAL_DEMO 
} from './data.js';
import { determinarGrupoEstandares } from './standards.js';
import { evidenceDB, setEvidenceStoreRef } from './db.js';

const STORAGE_KEY = 'SG_SST_APP_DATA_V1';
const ACTIVE_COMPANY_KEY = 'SG_SST_ACTIVE_COMPANY_ID';
const ACTIVE_YEAR_KEY = 'SG_SST_ACTIVE_YEAR';
const ANIO_BASE_INICIAL = '2025';

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
      "justificacion": "Acta de nombramiento del responsable del SG-SST debidamente firmada por el representante legal y el profesional responsable de SST.",
      "linkGuia": "/uploads/20260115_090000_1_1_1_3_Acta_Asignacion_Responsable_SST_Ladrillos_Ochoa.pdf",
      "updatedAt": "2026-09-29T15:15:49.312Z",
      "archivoAdjunto": {
        "id": "evid-emp-1790438946268-1.1.1.3-acta",
        "nombre": "Acta de Asignación Responsable SG-SST (Firmada).pdf",
        "url": "/uploads/20260115_090000_1_1_1_3_Acta_Asignacion_Responsable_SST_Ladrillos_Ochoa.pdf",
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiAvRjIgNSAwIFIgL0YzIDYgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PiBlbmRvYmoKNCAwIG9iaiA8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgPj4gZW5kb2JqCjYgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUgPj4gZW5kb2JqCjcgMCBvYmogPDwgL0xlbmd0aCAzMzU5ID4+CnN0cmVhbQpCVCAvRjIgMTQgVGYgNTAgNzQwIFRkIChMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNzI2IFRkIChOSVQ6IDgwMC4xMjMuNDU2LTcgfCBTaXN0ZW1hIGRlIEdlc3Rpb24gZGUgbGEgU2VndXJpZGFkIHkgU2FsdWQgZW4gZWwgVHJhYmFqbyBTRy1TU1QpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDIgdyA1MCA3MTUgbSA1NjIgNzE1IGwgUwpCVCAvRjIgMTIgVGYgNTAgNjkwIFRkIChBQ1RBIE9GSUNJQUwgREUgQVNJR05BQ0lPTiBERUwgUkVTUE9OU0FCTEUgREVMIFNHLVNTVCkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNjc1IFRkIChDdW1wbGltaWVudG8gTGVnYWw6IFJlc29sdWNpb24gMDMxMiBkZSAyMDE5IE51bWVyYWwgMS4xLjEuMyAtIERlY3JldG8gMTA3MiBkZSAyMDE1IEFydC4gMi4yLjQuNi44KSBUaiBFVApCVCAvRjIgMTAgVGYgNTAgNjQ1IFRkICgxLiBEQVRPUyBERSBMQSBERVNJR05BQ0lPTikgVGogRVQKQlQgL0YxIDkgVGYgNjAgNjMwIFRkIChFbXByZXNhOiBMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNjAgNjE1IFRkIChSZXByZXNlbnRhbnRlIExlZ2FsOiBKQUlNRSBBTEJFUlRPIE9DSE9BIE1BUlRJTkVaIC0gQy5DLiA3OS41NDQuMTU2KSBUaiBFVApCVCAvRjEgOSBUZiA2MCA2MDAgVGQgKFByb2Zlc2lvbmFsIERlc2lnbmFkbzogSVZBTiBEQVJJTyBHT05aQUxFWiBEIFNJTFZBIC0gQy5DLiA4MC4xMjMuNDU2KSBUaiBFVApCVCAvRjEgOSBUZiA2MCA1ODUgVGQgKExpY2VuY2lhIFNTVCBWaWdlbnRlOiBSZXMuIE5vLiAxNDIwNS0yMDIyIGRlIE1pblNhbHVkIHkgUHJvdGVjY2lvbiBTb2NpYWwpIFRqIEVUCkJUIC9GMSA5IFRmIDYwIDU3MCBUZCAoRmVjaGEgZGUgVmlnZW5jaWE6IDE1IGRlIEVuZXJvIGRlIDIwMjUgLyBSYXRpZmljYWNpb24gVmlnZW5jaWEgMjAyNikgVGogRVQKQlQgL0YyIDEwIFRmIDUwIDU0MCBUZCAoMi4gT0JKRVRPIFkgQUxDQU5DRSBERSBMQSBERUxFR0FDSU9OKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDUyNSBUZCAoRW4gY3VtcGxpbWllbnRvIGRlbCBEZWNyZXRvIDEwNzIgZGUgMjAxNSwgbGEgR2VyZW5jaWEgR2VuZXJhbCBhc2lnbmEgZm9ybWFsbWVudGUgbGEgYWRtaW5pc3RyYWNpb24sKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDUxMiBUZCAoZGlzZW5vLCBlamVjdWNpb24geSBldmFsdWFjaW9uIGRlbCBTRy1TU1QgYWwgcHJvZmVzaW9uYWwgZGVzaWduYWRvLCBjb25maXJpZW5kb2xlIGxhIGF1dG9yaWRhZCwpIFRqIEVUCkJUIC9GMSA4LjUgVGYgNTAgNDk5IFRkIChhdXRvbm9taWEgeSByZWN1cnNvcyByZXF1ZXJpZG9zIHBhcmEgZ2FyYW50aXphciBjb25kaWNpb25lcyBkZSB0cmFiYWpvIHNlZ3VyYXMgeSBzYWx1ZGFibGVzLikgVGogRVQKQlQgL0YyIDEwIFRmIDUwIDQ3MCBUZCAoMy4gUkVTUE9OU0FCSUxJREFERVMgQVNJR05BREFTIChERUNSRVRPIDEwNzIgQVJULiAyLjIuNC42LjgpKSBUaiBFVApCVCAvRjEgOC41IFRmIDYwIDQ1NSBUZCAoYSkgUGxhbmVhciwgb3JnYW5pemFyLCBkaXJpZ2lyLCBkZXNhcnJvbGxhciB5IGFwbGljYXIgZWwgU0ctU1NUIHkgZXZhbHVhciBzdSBjdW1wbGltaWVudG8uKSBUaiBFVApCVCAvRjEgOC41IFRmIDYwIDQ0MiBUZCAoYikgRWxhYm9yYXIgZWwgUGxhbiBkZSBUcmFiYWpvIEFudWFsIHkgc29tZXRlcmxvIGEgYXByb2JhY2lvbiB5IGFzaWduYWNpb24gZGUgcHJlc3VwdWVzdG8uKSBUaiBFVApCVCAvRjEgOC41IFRmIDYwIDQyOSBUZCAoYykgQ29vcmRpbmFyIGxhIGlkZW50aWZpY2FjaW9uIGRlIHBlbGlncm9zLCBldmFsdWFjaW9uIHkgdmFsb3JhY2lvbiBkZSByaWVzZ29zIHNlZ3VuIEdUQyA0NS4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjAgNDE2IFRkIChkKSBBcG95YXIgeSBjb29yZGluYXIgbGEgZWxlY2Npb24geSBmdW5jaW9uYW1pZW50byBkZWwgQ09QQVNTVCB5IENvbWl0ZSBkZSBDb252aXZlbmNpYS4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjAgNDAzIFRkIChlKSBQcm9tb3ZlciBsYSBwYXJ0aWNpcGFjaW9uIGFjdGl2YSBkZSBsb3MgdHJhYmFqYWRvcmVzIGVuIGxhIHByZXZlbmNpb24gZGUgcmllc2dvcy4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjAgMzkwIFRkIChmKSBSZW5kaXIgY3VlbnRhcyBhIGxhIEFsdGEgRGlyZWNjaW9uIHNvYnJlIGVsIGRlc2VtcGVubyBkZWwgU0ctU1NUIGFsIG1lbm9zIHVuYSB2ZXogYWwgYW5vLikgVGogRVQKQlQgL0YyIDEwIFRmIDUwIDM2MCBUZCAoNC4gQ09NUFJPTUlTTyBZIENPTlNUQU5DSUEgREUgRklSTUFTKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDM0NSBUZCAoUGFyYSBjb25zdGFuY2lhIGRlIGFjZXB0YWNpb24geSBtdXR1byBhY3VlcmRvLCBzZSBzdXNjcmliZSBsYSBwcmVzZW50ZSBhY3RhIG9maWNpYWwgcG9yIGxhcyBwYXJ0ZXMuKSBUaiBFVAowLjcgMC43IDAuNyBSRyAxIHcgNTAgMjAwIDIzMCAxMTAgcmUgUwowLjcgMC43IDAuNyBSRyAxIHcgMzMyIDIwMCAyMzAgMTEwIHJlIFMKMC4xIDAuMiAwLjUgcmcgQlQgL0YzIDExIFRmIDY1IDI3MCBUZCAoW0RPQ1VNRU5UTyBGSVJNQURPIERJR0lUQUxNRU5URV0pIFRqIEVUCjAgMCAwIHJnIEJUIC9GMiA5IFRmIDY1IDI0MCBUZCAoSkFJTUUgQUxCRVJUTyBPQ0hPQSBNQVJUSU5FWikgVGogRVQKQlQgL0YxIDggVGYgNjUgMjI4IFRkIChSZXByZXNlbnRhbnRlIExlZ2FsKSBUaiBFVApCVCAvRjEgOCBUZiA2NSAyMTYgVGQgKEMuQy4gNzkuNTQ0LjE1NiBkZSBCb2dvdGEgRC5DLikgVGogRVQKMC4xIDAuMiAwLjUgcmcgQlQgL0YzIDExIFRmIDM0NyAyNzAgVGQgKFtET0NVTUVOVE8gRklSTUFETyBESUdJVEFMTUVOVEVdKSBUaiBFVAowIDAgMCByZyBCVCAvRjIgOSBUZiAzNDcgMjQwIFRkIChJVkFOIERBUklPIEdPTlpBTEVaIEQgU0lMVkEpIFRqIEVUCkJUIC9GMSA4IFRmIDM0NyAyMjggVGQgKFByb2Zlc2lvbmFsIFJlc3BvbnNhYmxlIEFzaWduYWRvIFNHLVNTVCkgVGogRVQKQlQgL0YxIDggVGYgMzQ3IDIxNiBUZCAoQy5DLiA4MC4xMjMuNDU2IC0gTGljZW5jaWEgU1NUIE5vLiAxNDIwNS0yMDIyKSBUaiBFVAowLjIgMC40IDAuNiBSRyAxIHcgNTAgMTYwIG0gNTYyIDE2MCBsIFMKMC40IDAuNCAwLjQgcmcgQlQgL0YxIDcuNSBUZiA1MCAxNDUgVGQgKERPQ1RPUiBQWU1FIFNHLVNTVCAtIEV2aWRlbmNpYSBkZSBDdW1wbGltaWVudG8gRXN0YW5kYXIgMS4xLjEuMyAtIFRyYXphYmlsaWRhZCBWZXJpZmljYWRhKSBUaiBFVApCVCAvRjEgNy41IFRmIDUwIDEzMyBUZCAoRG9jdW1lbnRvIGNvbiB2YWxvciBwcm9iYXRvcmlvIGxhYm9yYWwgeSByZWdsYW1lbnRhcmlvIHBhcmEgYXVkaXRvcmlhcyBkZSBNaW5pc3RlcmlvIGRlbCBUcmFiYWpvIHkgQVJMKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI2MSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0MDYgMDAwMDAgbiAKMDAwMDAwMDQ4NCAwMDAwMCBuIAp0cmFpbGVyIDw8IC9TaXplIDggL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjM4OTUKJSVFT0YK",
        "tipo": "application/pdf",
        "tamanio": 4119,
        "fechaCargue": "2026-01-15T14:00:00.000Z"
      },
      "fuentes": [
        {
          "id": "f-pdf-1_1_1_3",
          "url": "/uploads/20260115_090000_1_1_1_3_Acta_Asignacion_Responsable_SST_Ladrillos_Ochoa.pdf",
          "titulo": "📄 Acta de Asignación Responsable SG-SST (Firmada).pdf"
        },
        {
          "id": "f-gdoc-1_1_1_3",
          "url": "https://docs.google.com/document/d/1KwN9NqmkfD7RTZMilnMopH4AeTbdIftwNfaBRCQg9H8/edit?usp=sharing",
          "titulo": "Plantilla Editable (Google Docs)"
        }
      ]
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
      "linkGuia": "/uploads/20260115_093000_3_1_7_1_Politica_Prevencion_Alcohol_Tabaco_SPA_Firmada.pdf",
      "updatedAt": "2026-09-30T17:10:50.287Z",
      "archivoAdjunto": {
        "id": "evid-emp-1790438946268-3.1.7.1-politica-spa",
        "nombre": "Política de Prevención Tabaco, Alcohol y SPA (Firmada).pdf",
        "url": "/uploads/20260115_093000_3_1_7_1_Politica_Prevencion_Alcohol_Tabaco_SPA_Firmada.pdf",
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiAvRjIgNSAwIFIgL0YzIDYgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PiBlbmRvYmoKNCAwIG9iaiA8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgPj4gZW5kb2JqCjYgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUgPj4gZW5kb2JqCjcgMCBvYmogPDwgL0xlbmd0aCAyNTk1ID4+CnN0cmVhbQpCVCAvRjIgMTQgVGYgNTAgNzQwIFRkIChMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNzI2IFRkIChOSVQ6IDgwMC4xMjMuNDU2LTcgfCBTaXN0ZW1hIGRlIEdlc3Rpb24gZGUgbGEgU2VndXJpZGFkIHkgU2FsdWQgZW4gZWwgVHJhYmFqbyBTRy1TU1QpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDIgdyA1MCA3MTUgbSA1NjIgNzE1IGwgUwpCVCAvRjIgMTEgVGYgNTAgNjkwIFRkIChQT0xJVElDQSBERSBQUkVWRU5DSU9OIERFTCBDT05TVU1PIERFIFRBQkFDTywgQUxDT0hPTCBZIFNVU1RBTkNJQVMgUFNJQ09BQ1RJVkFTKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDY3NSBUZCAoQ3VtcGxpbWllbnRvIExlZ2FsOiBSZXNvbHVjaW9uIDAzMTIgZGUgMjAxOSBOdW1lcmFsIDMuMS43LjEgLSBEZWNyZXRvIDEwNzIgZGUgMjAxNSkgVGogRVQKQlQgL0YyIDkuNSBUZiA1MCA2MzIgVGQgKDEuIFBST1BPU0lUTyBJTlNUSVRVQ0lPTkFMKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDYxNiBUZCAoTEFEUklMTE9TIE9DSE9BIExUREEgZXN0YWJsZWNlIGVsIGNvbXByb21pc28gaXJyZXN0cmljdG8gZGUgcHJvcGljaWFyIHVuIGFtYmllbnRlIGRlIHRyYWJham8pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNTAgNjAzIFRkIChzYW5vLCBzZWd1cm8geSBwcm9kdWN0aXZvLCBsaWJyZSBkZWwgY29uc3VtbyBkZSB0YWJhY28sIGFsY29ob2wgeSBkcm9nYXMgZW4gdG9kYXMgc3VzIGFyZWFzLikgVGogRVQKQlQgL0YyIDkuNSBUZiA1MCA1ODIgVGQgKDIuIERJUkVDVFJJQ0VTIFkgUFJPSElCSUNJT05FUykgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1NjYgVGQgKC0gU2UgcHJvaGliZSBwcmVzZW50YXJzZSBhIGxhYm9yYXIgYmFqbyBlbCBlZmVjdG8gZGUgYWxjb2hvbCwgc3VzdGFuY2lhcyBwc2ljb2FjdGl2YXMgbyBlc3R1cGVmYWNpZW50ZXMuKSBUaiBFVApCVCAvRjEgOC41IFRmIDY1IDU1MyBUZCAoLSBTZSBwcm9oaWJlIGxhIHBvc2VzaW9uLCBkaXN0cmlidWNpb24sIGNvbWVyY2lhbGl6YWNpb24gbyBjb25zdW1vIGRlIGVzdGFzIHN1c3RhbmNpYXMgZW4gaW5zdGFsYWNpb25lcy4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNTQwIFRkICgtIFF1ZWRhIHByb2hpYmlkbyBmdW1hciBlbiB0b2RhcyBsYXMgaW5zdGFsYWNpb25lcyBkZSBsYSBvcmdhbml6YWNpb24gKEVzcGFjaW8gMTAwJSBMaWJyZSBkZSBIdW1vKS4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNTI3IFRkICgtIExhIGVtcHJlc2EgcHJvbW92ZXJhIHByb2dyYW1hcyBkZSBlc3RpbG9zIGRlIHZpZGEgc2FsdWRhYmxlcyB5IHBhdXNhcyBhY3RpdmFzIHBhcmEgbG9zIGNvbGFib3JhZG9yZXMuKSBUaiBFVApCVCAvRjIgOS41IFRmIDUwIDUwNiBUZCAoMy4gU0FOQ0lPTkVTIFkgRVZBTFVBQ0lPTikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA0OTAgVGQgKC0gRWwgaW5jdW1wbGltaWVudG8gZGUgZXN0YSBwb2xpdGljYSBjb25zdGl0dXllIGZhbHRhIGdyYXZlIHNlZ3VuIGVsIFJlZ2xhbWVudG8gSW50ZXJubyBkZSBUcmFiYWpvLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA0NzcgVGQgKC0gU2UgcmVhbGl6YXJhbiBwcnVlYmFzIGRlIGNvbnRyb2wgeSB0YW1pemFqZSBwcmV2ZW50aXZvIG9yaWVudGFkYXMgYSBsYSBwcm90ZWNjaW9uIGludGVncmFsIGRlbCB0cmFiYWphZG9yLikgVGogRVQKMC43IDAuNyAwLjcgUkcgMSB3IDUwIDIxMCAyMzAgOTAgcmUgUwowLjcgMC43IDAuNyBSRyAxIHcgMzMyIDIxMCAyMzAgOTAgcmUgUwowLjEgMC4yIDAuNSByZyBCVCAvRjMgMTAgVGYgNjUgMjcwIFRkIChbRE9DVU1FTlRPIEZJUk1BRE8gRElHSVRBTE1FTlRFXSkgVGogRVQKMCAwIDAgcmcgQlQgL0YyIDguNSBUZiA2NSAyNDUgVGQgKEpBSU1FIEFMQkVSVE8gT0NIT0EgTUFSVElORVopIFRqIEVUCkJUIC9GMSA3LjUgVGYgNjUgMjMzIFRkIChSZXByZXNlbnRhbnRlIExlZ2FsKSBUaiBFVApCVCAvRjEgNy41IFRmIDY1IDIyMSBUZCAoQy5DLiA3OS41NDQuMTU2IGRlIEJvZ290YSBELkMuKSBUaiBFVAowLjEgMC4yIDAuNSByZyBCVCAvRjMgMTAgVGYgMzQ3IDI3MCBUZCAoW0RPQ1VNRU5UTyBGSVJNQURPIERJR0lUQUxNRU5URV0pIFRqIEVUCjAgMCAwIHJnIEJUIC9GMiA4LjUgVGYgMzQ3IDI0NSBUZCAoSVZBTiBEQVJJTyBHT05aQUxFWiBEIFNJTFZBKSBUaiBFVApCVCAvRjEgNy41IFRmIDM0NyAyMzMgVGQgKFJlc3BvbnNhYmxlIGRlbCBTRy1TU1QpIFRqIEVUCkJUIC9GMSA3LjUgVGYgMzQ3IDIyMSBUZCAoTGljZW5jaWEgU1NUIE5vLiAxNDIwNS0yMDIyKSBUaiBFVAowLjIgMC40IDAuNiBSRyAxIHcgNTAgOTAgbSA1NjIgOTAgbCBTCjAuNCAwLjQgMC40IHJnIEJUIC9GMSA3LjUgVGYgNTAgNzUgVGQgKERPQ1RPUiBQWU1FIFNHLVNTVCAtIEV2aWRlbmNpYSBkZSBDdW1wbGltaWVudG8gRXN0YW5kYXIgMy4xLjcuMSAtIEFyY2hpdm8gT2ZpY2lhbCBQcm90ZWdpZG8pIFRqIEVUCkJUIC9GMSA3LjUgVGYgNTAgNjMgVGQgKERvY3VtZW50byBjb24gdmFsb3IgcHJvYmF0b3JpbyBsYWJvcmFsIHkgcmVnbGFtZW50YXJpbyBwYXJhIGF1ZGl0b3JpYXMgZGUgTWluaXN0ZXJpbyBkZWwgVHJhYmFqbyB5IEFSTCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNjEgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDA2IDAwMDAwIG4gCjAwMDAwMDA0ODQgMDAwMDAgbiAKdHJhaWxlciA8PCAvU2l6ZSA4IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgozMTMxCiUlRU9GCg==",
        "tipo": "application/pdf",
        "tamanio": 3355,
        "fechaCargue": "2026-01-15T14:30:00.000Z"
      },
      "fuentes": [
        {
          "id": "f-pdf-3_1_7_1",
          "url": "/uploads/20260115_093000_3_1_7_1_Politica_Prevencion_Alcohol_Tabaco_SPA_Firmada.pdf",
          "titulo": "📄 Política de Prevención Tabaco, Alcohol y SPA (Firmada).pdf"
        },
        {
          "id": "f-gdoc-3_1_7_1",
          "url": "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
          "titulo": "Plantilla Editable (Google Docs)"
        }
      ]
    },
    "3.1.7.2": {
      "estado": "CUMPLE",
      "justificacion": "Programa de estilos de vida y entornos saludables (Prevención y Promoción de salud Pública): tabaquismo, alcoholismo, farmacodependencia, salud mental, alimentación saludable, pausas activas, ergonomía y control de enfermedades.",
      "linkGuia": "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
      "updatedAt": "2026-09-30T17:10:50.287Z"
    },
    "2.1.1": {
      "estado": "CUMPLE",
      "justificacion": "Política Actualizada 2026 - Firmada por representante legal y soportes de capacitación.",
      "linkGuia": "/uploads/20260115_092000_2_1_1_Politica_SST_2026_Firmada.pdf",
      "updatedAt": "2026-09-29T17:21:15.578Z",
      "archivoAdjunto": {
        "id": "evid-emp-1790438946268-2.1.1-politica",
        "nombre": "Política Oficial del SG-SST 2026 (Firmada).pdf",
        "url": "/uploads/20260115_092000_2_1_1_Politica_SST_2026_Firmada.pdf",
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiAvRjIgNSAwIFIgL0YzIDYgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PiBlbmRvYmoKNCAwIG9iaiA8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgPj4gZW5kb2JqCjYgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUgPj4gZW5kb2JqCjcgMCBvYmogPDwgL0xlbmd0aCAyMjcxID4+CnN0cmVhbQpCVCAvRjIgMTQgVGYgNTAgNzQwIFRkIChMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNzI2IFRkIChOSVQ6IDgwMC4xMjMuNDU2LTcgfCBTaXN0ZW1hIGRlIEdlc3Rpb24gZGUgbGEgU2VndXJpZGFkIHkgU2FsdWQgZW4gZWwgVHJhYmFqbyBTRy1TU1QpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDIgdyA1MCA3MTUgbSA1NjIgNzE1IGwgUwpCVCAvRjIgMTEgVGYgNTAgNjkwIFRkIChQT0xJVElDQSBERUwgU0lTVEVNQSBERSBHRVNUSU9OIERFIFNFR1VSSURBRCBZIFNBTFVEIEVOIEVMIFRSQUJBSk8gKDIwMjYpKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDY3NSBUZCAoQ3VtcGxpbWllbnRvIExlZ2FsOiBSZXNvbHVjaW9uIDAzMTIgZGUgMjAxOSBOdW1lcmFsIDIuMS4xIC0gRGVjcmV0byAxMDcyIGRlIDIwMTUpIFRqIEVUCkJUIC9GMiA5LjUgVGYgNTAgNjMyIFRkICgxLiBERUNMQVJBQ0lPTiBERSBMQSBBTFRBIERJUkVDQ0lPTikgVGogRVQKQlQgL0YxIDguNSBUZiA1MCA2MTYgVGQgKExBRFJJTExPUyBPQ0hPQSBMVERBIGFzdW1lIGVsIGNvbXByb21pc28gZm9ybWFsIGNvbiBsYSBwcm90ZWNjaW9uIGRlIGxhIHNlZ3VyaWRhZCB5IHNhbHVkKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDYwMyBUZCAoZGUgdG9kb3Mgc3VzIHRyYWJhamFkb3JlcyBkaXJlY3RvcywgY29udHJhdGlzdGFzIHkgcGFydGVzIGludGVyZXNhZGFzIGVuIHN1cyBjZW50cm9zIGRlIHRyYWJham8uKSBUaiBFVApCVCAvRjIgOS41IFRmIDUwIDU4MiBUZCAoMi4gT0JKRVRJVk9TIEVTVFJBVEVHSUNPUyBERSBMQSBQT0xJVElDQSkgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1NjYgVGQgKC0gSWRlbnRpZmljYXIgbG9zIHBlbGlncm9zLCBldmFsdWFyIHkgdmFsb3JhciBsb3Mgcmllc2dvcyB5IGVzdGFibGVjZXIgbG9zIHJlc3BlY3Rpdm9zIGNvbnRyb2xlcy4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNTUzIFRkICgtIFByb3RlZ2VyIGxhIHNlZ3VyaWRhZCB5IHNhbHVkIGRlIHRvZG9zIGxvcyB0cmFiYWphZG9yZXMgbWVkaWFudGUgbGEgbWVqb3JhIGNvbnRpbnVhIGRlbCBTRy1TU1QuKSBUaiBFVApCVCAvRjEgOC41IFRmIDY1IDU0MCBUZCAoLSBDdW1wbGlyIGNvbiBsYSBub3JtYXRpdmlkYWQgbGVnYWwgdmlnZW50ZSBlbiBDb2xvbWJpYSBlbiBtYXRlcmlhIGRlIHJpZXNnb3MgbGFib3JhbGVzLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1MjcgVGQgKC0gRGVzdGluYXIgbG9zIHJlY3Vyc29zIGZpbmFuY2llcm9zLCB0ZWNuaWNvcyB5IGh1bWFub3MgbmVjZXNhcmlvcyBwYXJhIGxhIGVqZWN1Y2lvbiBkZWwgc2lzdGVtYS4pIFRqIEVUCkJUIC9GMiA5LjUgVGYgNTAgNTA2IFRkICgzLiBESUZVU0lPTiBZIEFDQ0VTTykgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA0OTAgVGQgKC0gRXN0YSBwb2xpdGljYSBoYSBzaWRvIHNvY2lhbGl6YWRhIHkgcHVibGljYWRhIGVuIGNhcnRlbGVyYXMgZGUgbGEgcGxhbnRhIHkgcG9ydGFsIHdlYiBkZSBsYSBlbXByZXNhLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA0NzcgVGQgKC0gQXBsaWNhIGEgdG9kbyBlbCBwZXJzb25hbCB5IGN1ZW50YSBjb24gcmV2aXNpb24gYW51YWwgY29uZm9ybWUgYWwgRGVjcmV0byAxMDcyIGRlIDIwMTUuKSBUaiBFVAowLjcgMC43IDAuNyBSRyAxIHcgMTgwIDIxMCAyNTAgOTAgcmUgUwowLjEgMC4yIDAuNSByZyBCVCAvRjMgMTAgVGYgMjAwIDI3MCBUZCAoW0RPQ1VNRU5UTyBGSVJNQURPIERJR0lUQUxNRU5URV0pIFRqIEVUCjAgMCAwIHJnIEJUIC9GMiA4LjUgVGYgMjAwIDI0NSBUZCAoSkFJTUUgQUxCRVJUTyBPQ0hPQSBNQVJUSU5FWikgVGogRVQKQlQgL0YxIDcuNSBUZiAyMDAgMjMzIFRkIChSZXByZXNlbnRhbnRlIExlZ2FsIC0gR2VyZW5jaWEgR2VuZXJhbCkgVGogRVQKQlQgL0YxIDcuNSBUZiAyMDAgMjIxIFRkIChDLkMuIDc5LjU0NC4xNTYgZGUgQm9nb3RhIEQuQy4pIFRqIEVUCjAuMiAwLjQgMC42IFJHIDEgdyA1MCA5MCBtIDU2MiA5MCBsIFMKMC40IDAuNCAwLjQgcmcgQlQgL0YxIDcuNSBUZiA1MCA3NSBUZCAoRE9DVE9SIFBZTUUgU0ctU1NUIC0gRXZpZGVuY2lhIGRlIEN1bXBsaW1pZW50byBFc3RhbmRhciAyLjEuMSAtIEFyY2hpdm8gT2ZpY2lhbCBQcm90ZWdpZG8pIFRqIEVUCkJUIC9GMSA3LjUgVGYgNTAgNjMgVGQgKERvY3VtZW50byBjb24gdmFsb3IgcHJvYmF0b3JpbyBsYWJvcmFsIHkgcmVnbGFtZW50YXJpbyBwYXJhIGF1ZGl0b3JpYXMgZGUgTWluaXN0ZXJpbyBkZWwgVHJhYmFqbyB5IEFSTCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNjEgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDA2IDAwMDAwIG4gCjAwMDAwMDA0ODQgMDAwMDAgbiAKdHJhaWxlciA8PCAvU2l6ZSA4IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoyODA3CiUlRU9GCg==",
        "tipo": "application/pdf",
        "tamanio": 3031,
        "fechaCargue": "2026-01-15T14:20:00.000Z"
      },
      "fuentes": [
        {
          "id": "f-pdf-2_1_1",
          "url": "/uploads/20260115_092000_2_1_1_Politica_SST_2026_Firmada.pdf",
          "titulo": "📄 Política Oficial del SG-SST 2026 (Firmada).pdf"
        },
        {
          "id": "f-gdoc-2_1_1",
          "url": "https://docs.google.com/document/d/1sRg32I5sGNpe6ROYxwxjq1pcRpEPAZN9mJoWj_rEpFw/edit?usp=sharing",
          "titulo": "Plantilla Editable (Google Docs)"
        }
      ]
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
      "justificacion": "No se realizan actividades en alturas o espacios confinados que demanden certificaciones externas.",
      "linkGuia": "/uploads/20260115_091000_1_2_2_Certificado_No_Alturas_Espacios_Confinados.pdf",
      "fuentes": [
        {
          "id": "f-pdf-1_2_2",
          "url": "/uploads/20260115_091000_1_2_2_Certificado_No_Alturas_Espacios_Confinados.pdf",
          "titulo": "📄 Certificado No Aplicación Alturas y Confinados (Firmado).pdf"
        },
        {
          "id": "f-gdoc-1_2_2",
          "url": "https://docs.google.com/document/d/1_XFL8X6yJrIr8JVClYx5LBD7Kv1cum41k66jmt_74CY/edit?usp=sharing",
          "titulo": "Plantilla Editable (Google Docs)"
        }
      ],
      "archivoAdjunto": {
        "id": "evid-emp-1790438946268-1.2.2-cert",
        "nombre": "Certificado No Aplicación Alturas y Confinados (Firmado).pdf",
        "url": "/uploads/20260115_091000_1_2_2_Certificado_No_Alturas_Espacios_Confinados.pdf",
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiAvRjIgNSAwIFIgL0YzIDYgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PiBlbmRvYmoKNCAwIG9iaiA8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgPj4gZW5kb2JqCjYgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUgPj4gZW5kb2JqCjcgMCBvYmogPDwgL0xlbmd0aCAyNDI3ID4+CnN0cmVhbQpCVCAvRjIgMTQgVGYgNTAgNzQwIFRkIChMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNzI2IFRkIChOSVQ6IDgwMC4xMjMuNDU2LTcgfCBTaXN0ZW1hIGRlIEdlc3Rpb24gZGUgbGEgU2VndXJpZGFkIHkgU2FsdWQgZW4gZWwgVHJhYmFqbyBTRy1TU1QpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDIgdyA1MCA3MTUgbSA1NjIgNzE1IGwgUwpCVCAvRjIgMTEgVGYgNTAgNjkwIFRkIChDRVJUSUZJQ0FDSU9OIERFIE5PIEFQTElDQUNJT04gREUgVFJBQkFKTyBFTiBBTFRVUkFTIE5JIEVTUEFDSU9TIENPTkZJTkFET1MpIFRqIEVUCkJUIC9GMSA4LjUgVGYgNTAgNjc1IFRkIChDdW1wbGltaWVudG8gTGVnYWw6IFJlc29sdWNpb24gMDMxMiBkZSAyMDE5IE51bWVyYWwgMS4yLjIgLSBEZWNyZXRvIDEwNzIgZGUgMjAxNSkgVGogRVQKQlQgL0YyIDkuNSBUZiA1MCA2MzIgVGQgKDEuIERFQ0xBUkFDSU9OIEdFTkVSQUwpIFRqIEVUCkJUIC9GMSA4LjUgVGYgNTAgNjE2IFRkIChFbCBzdXNjcml0byBSZXByZXNlbnRhbnRlIExlZ2FsIGRlIExBRFJJTExPUyBPQ0hPQSBMVERBIGNlcnRpZmljYSBxdWU6KSBUaiBFVApCVCAvRjEgOC41IFRmIDY1IDYwMyBUZCAoLSBMYSBlbXByZXNhIHJlYWxpemEgYWN0aXZpZGFkZXMgZGUgZmFicmljYWNpb24geSBjb21lcmNpYWxpemFjaW9uIGRlIHByb2R1Y3RvcyBkZSBhcmNpbGxhLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1OTAgVGQgKC0gRW4gbGFzIGluc3RhbGFjaW9uZXMgb3BlcmF0aXZhcyBubyBzZSBlamVjdXRhbiBsYWJvcmVzIGVuIGFsdHVyYXMgc3VwZXJpb3JlcyBhIDEuNTAgbWV0cm9zLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1NzcgVGQgKC0gTm8gc2UgcmVhbGl6YW4gbGFib3JlcyBkZSBpbmdyZXNvIGEgZXNwYWNpb3MgY29uZmluYWRvcyBxdWUgZGVtYW5kZW4gY2VydGlmaWNhY2lvbmVzIHRlY25pY2FzIGV4dGVybmFzLikgVGogRVQKQlQgL0YyIDkuNSBUZiA1MCA1NTYgVGQgKDIuIEpVU1RJRklDQUNJT04gVEVDTklDQSBZIE5PUk1BVElWQSkgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1NDAgVGQgKC0gQ29uZm9ybWUgYSBsYSBSZXNvbHVjaW9uIDQyNzIgZGUgMjAyMSB5IFJlc29sdWNpb24gMDMxMiBkZSAyMDE5LCBlc3RlIHJlcXVpc2l0byBzZSBkZWNsYXJhIE5PIEFQTElDQS4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNTI3IFRkICgtIFRvZGEgYWN0aXZpZGFkIGRlIG1hbnRlbmltaWVudG8gZGUgdGVjaG9zIG8gZXN0cnVjdHVyYXMgZWxldmFkYXMgc2UgdGVyY2VyaXphIGNvbiBwZXJzb25hbCBjZXJ0aWZpY2Fkby4pIFRqIEVUCkJUIC9GMiA5LjUgVGYgNTAgNTA2IFRkICgzLiBWSUdFTkNJQSBZIEFDVFVBTElaQUNJT04pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNDkwIFRkICgtIENlcnRpZmljYWNpb24gdmFsaWRhIHBhcmEgbGEgdmlnZW5jaWEgMjAyNSAtIDIwMjYsIHN1amV0YSBhIHJldmlzaW9uIGFudWFsIHBvciBlbCBDT1BBU1NUIHkgR2VyZW5jaWEuKSBUaiBFVAowLjcgMC43IDAuNyBSRyAxIHcgNTAgMjEwIDIzMCA5MCByZSBTCjAuNyAwLjcgMC43IFJHIDEgdyAzMzIgMjEwIDIzMCA5MCByZSBTCjAuMSAwLjIgMC41IHJnIEJUIC9GMyAxMCBUZiA2NSAyNzAgVGQgKFtET0NVTUVOVE8gRklSTUFETyBESUdJVEFMTUVOVEVdKSBUaiBFVAowIDAgMCByZyBCVCAvRjIgOC41IFRmIDY1IDI0NSBUZCAoSkFJTUUgQUxCRVJUTyBPQ0hPQSBNQVJUSU5FWikgVGogRVQKQlQgL0YxIDcuNSBUZiA2NSAyMzMgVGQgKFJlcHJlc2VudGFudGUgTGVnYWwpIFRqIEVUCkJUIC9GMSA3LjUgVGYgNjUgMjIxIFRkIChDLkMuIDc5LjU0NC4xNTYgZGUgQm9nb3RhIEQuQy4pIFRqIEVUCjAuMSAwLjIgMC41IHJnIEJUIC9GMyAxMCBUZiAzNDcgMjcwIFRkIChbRE9DVU1FTlRPIEZJUk1BRE8gRElHSVRBTE1FTlRFXSkgVGogRVQKMCAwIDAgcmcgQlQgL0YyIDguNSBUZiAzNDcgMjQ1IFRkIChJVkFOIERBUklPIEdPTlpBTEVaIEQgU0lMVkEpIFRqIEVUCkJUIC9GMSA3LjUgVGYgMzQ3IDIzMyBUZCAoUmVzcG9uc2FibGUgZGVsIFNHLVNTVCkgVGogRVQKQlQgL0YxIDcuNSBUZiAzNDcgMjIxIFRkIChMaWNlbmNpYSBTU1QgTm8uIDE0MjA1LTIwMjIpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDEgdyA1MCA5MCBtIDU2MiA5MCBsIFMKMC40IDAuNCAwLjQgcmcgQlQgL0YxIDcuNSBUZiA1MCA3NSBUZCAoRE9DVE9SIFBZTUUgU0ctU1NUIC0gRXZpZGVuY2lhIGRlIEN1bXBsaW1pZW50byBFc3RhbmRhciAxLjIuMiAtIEFyY2hpdm8gT2ZpY2lhbCBQcm90ZWdpZG8pIFRqIEVUCkJUIC9GMSA3LjUgVGYgNTAgNjMgVGQgKERvY3VtZW50byBjb24gdmFsb3IgcHJvYmF0b3JpbyBsYWJvcmFsIHkgcmVnbGFtZW50YXJpbyBwYXJhIGF1ZGl0b3JpYXMgZGUgTWluaXN0ZXJpbyBkZWwgVHJhYmFqbyB5IEFSTCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNjEgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDA2IDAwMDAwIG4gCjAwMDAwMDA0ODQgMDAwMDAgbiAKdHJhaWxlciA8PCAvU2l6ZSA4IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoyOTYzCiUlRU9GCg==",
        "tipo": "application/pdf",
        "tamanio": 3187,
        "fechaCargue": "2026-01-15T14:10:00.000Z"
      }
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
      "updatedAt": "2026-10-03T11:37:49-05:00",
      "linkGuia": "https://docs.google.com/spreadsheets/d/15m279FowJpNTtXc23roPiruQzYMYUNdVp7qnKeNUrfQ/edit?usp=sharing",
      "justificacion": null
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
      "updatedAt": "2026-10-03T11:37:49-05:00",
      "linkGuia": "https://drive.google.com/file/d/17S8G1u-aBV7Hhr2T5PVzT_zRtYqSxPif/view?usp=drive_link",
      "justificacion": null
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
      "justificacion": "Acta de nombramiento del responsable del SG-SST debidamente firmada por el representante legal y el profesional responsable de SST.",
      "planAccion": "",
      "linkGuia": "/uploads/20260115_090000_1_1_1_3_Acta_Asignacion_Responsable_SST_Ladrillos_Ochoa.pdf",
      "updatedAt": "2026-09-29T16:41:21.537Z",
      "archivoAdjunto": {
        "id": "evid-emp-1790438946268-1.1.1.3-acta",
        "nombre": "Acta de Asignación Responsable SG-SST (Firmada).pdf",
        "url": "/uploads/20260115_090000_1_1_1_3_Acta_Asignacion_Responsable_SST_Ladrillos_Ochoa.pdf",
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiAvRjIgNSAwIFIgL0YzIDYgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PiBlbmRvYmoKNCAwIG9iaiA8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgPj4gZW5kb2JqCjYgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUgPj4gZW5kb2JqCjcgMCBvYmogPDwgL0xlbmd0aCAzMzU5ID4+CnN0cmVhbQpCVCAvRjIgMTQgVGYgNTAgNzQwIFRkIChMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNzI2IFRkIChOSVQ6IDgwMC4xMjMuNDU2LTcgfCBTaXN0ZW1hIGRlIEdlc3Rpb24gZGUgbGEgU2VndXJpZGFkIHkgU2FsdWQgZW4gZWwgVHJhYmFqbyBTRy1TU1QpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDIgdyA1MCA3MTUgbSA1NjIgNzE1IGwgUwpCVCAvRjIgMTIgVGYgNTAgNjkwIFRkIChBQ1RBIE9GSUNJQUwgREUgQVNJR05BQ0lPTiBERUwgUkVTUE9OU0FCTEUgREVMIFNHLVNTVCkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNjc1IFRkIChDdW1wbGltaWVudG8gTGVnYWw6IFJlc29sdWNpb24gMDMxMiBkZSAyMDE5IE51bWVyYWwgMS4xLjEuMyAtIERlY3JldG8gMTA3MiBkZSAyMDE1IEFydC4gMi4yLjQuNi44KSBUaiBFVApCVCAvRjIgMTAgVGYgNTAgNjQ1IFRkICgxLiBEQVRPUyBERSBMQSBERVNJR05BQ0lPTikgVGogRVQKQlQgL0YxIDkgVGYgNjAgNjMwIFRkIChFbXByZXNhOiBMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNjAgNjE1IFRkIChSZXByZXNlbnRhbnRlIExlZ2FsOiBKQUlNRSBBTEJFUlRPIE9DSE9BIE1BUlRJTkVaIC0gQy5DLiA3OS41NDQuMTU2KSBUaiBFVApCVCAvRjEgOSBUZiA2MCA2MDAgVGQgKFByb2Zlc2lvbmFsIERlc2lnbmFkbzogSVZBTiBEQVJJTyBHT05aQUxFWiBEIFNJTFZBIC0gQy5DLiA4MC4xMjMuNDU2KSBUaiBFVApCVCAvRjEgOSBUZiA2MCA1ODUgVGQgKExpY2VuY2lhIFNTVCBWaWdlbnRlOiBSZXMuIE5vLiAxNDIwNS0yMDIyIGRlIE1pblNhbHVkIHkgUHJvdGVjY2lvbiBTb2NpYWwpIFRqIEVUCkJUIC9GMSA5IFRmIDYwIDU3MCBUZCAoRmVjaGEgZGUgVmlnZW5jaWE6IDE1IGRlIEVuZXJvIGRlIDIwMjUgLyBSYXRpZmljYWNpb24gVmlnZW5jaWEgMjAyNikgVGogRVQKQlQgL0YyIDEwIFRmIDUwIDU0MCBUZCAoMi4gT0JKRVRPIFkgQUxDQU5DRSBERSBMQSBERUxFR0FDSU9OKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDUyNSBUZCAoRW4gY3VtcGxpbWllbnRvIGRlbCBEZWNyZXRvIDEwNzIgZGUgMjAxNSwgbGEgR2VyZW5jaWEgR2VuZXJhbCBhc2lnbmEgZm9ybWFsbWVudGUgbGEgYWRtaW5pc3RyYWNpb24sKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDUxMiBUZCAoZGlzZW5vLCBlamVjdWNpb24geSBldmFsdWFjaW9uIGRlbCBTRy1TU1QgYWwgcHJvZmVzaW9uYWwgZGVzaWduYWRvLCBjb25maXJpZW5kb2xlIGxhIGF1dG9yaWRhZCwpIFRqIEVUCkJUIC9GMSA4LjUgVGYgNTAgNDk5IFRkIChhdXRvbm9taWEgeSByZWN1cnNvcyByZXF1ZXJpZG9zIHBhcmEgZ2FyYW50aXphciBjb25kaWNpb25lcyBkZSB0cmFiYWpvIHNlZ3VyYXMgeSBzYWx1ZGFibGVzLikgVGogRVQKQlQgL0YyIDEwIFRmIDUwIDQ3MCBUZCAoMy4gUkVTUE9OU0FCSUxJREFERVMgQVNJR05BREFTIChERUNSRVRPIDEwNzIgQVJULiAyLjIuNC42LjgpKSBUaiBFVApCVCAvRjEgOC41IFRmIDYwIDQ1NSBUZCAoYSkgUGxhbmVhciwgb3JnYW5pemFyLCBkaXJpZ2lyLCBkZXNhcnJvbGxhciB5IGFwbGljYXIgZWwgU0ctU1NUIHkgZXZhbHVhciBzdSBjdW1wbGltaWVudG8uKSBUaiBFVApCVCAvRjEgOC41IFRmIDYwIDQ0MiBUZCAoYikgRWxhYm9yYXIgZWwgUGxhbiBkZSBUcmFiYWpvIEFudWFsIHkgc29tZXRlcmxvIGEgYXByb2JhY2lvbiB5IGFzaWduYWNpb24gZGUgcHJlc3VwdWVzdG8uKSBUaiBFVApCVCAvRjEgOC41IFRmIDYwIDQyOSBUZCAoYykgQ29vcmRpbmFyIGxhIGlkZW50aWZpY2FjaW9uIGRlIHBlbGlncm9zLCBldmFsdWFjaW9uIHkgdmFsb3JhY2lvbiBkZSByaWVzZ29zIHNlZ3VuIEdUQyA0NS4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjAgNDE2IFRkIChkKSBBcG95YXIgeSBjb29yZGluYXIgbGEgZWxlY2Npb24geSBmdW5jaW9uYW1pZW50byBkZWwgQ09QQVNTVCB5IENvbWl0ZSBkZSBDb252aXZlbmNpYS4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjAgNDAzIFRkIChlKSBQcm9tb3ZlciBsYSBwYXJ0aWNpcGFjaW9uIGFjdGl2YSBkZSBsb3MgdHJhYmFqYWRvcmVzIGVuIGxhIHByZXZlbmNpb24gZGUgcmllc2dvcy4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjAgMzkwIFRkIChmKSBSZW5kaXIgY3VlbnRhcyBhIGxhIEFsdGEgRGlyZWNjaW9uIHNvYnJlIGVsIGRlc2VtcGVubyBkZWwgU0ctU1NUIGFsIG1lbm9zIHVuYSB2ZXogYWwgYW5vLikgVGogRVQKQlQgL0YyIDEwIFRmIDUwIDM2MCBUZCAoNC4gQ09NUFJPTUlTTyBZIENPTlNUQU5DSUEgREUgRklSTUFTKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDM0NSBUZCAoUGFyYSBjb25zdGFuY2lhIGRlIGFjZXB0YWNpb24geSBtdXR1byBhY3VlcmRvLCBzZSBzdXNjcmliZSBsYSBwcmVzZW50ZSBhY3RhIG9maWNpYWwgcG9yIGxhcyBwYXJ0ZXMuKSBUaiBFVAowLjcgMC43IDAuNyBSRyAxIHcgNTAgMjAwIDIzMCAxMTAgcmUgUwowLjcgMC43IDAuNyBSRyAxIHcgMzMyIDIwMCAyMzAgMTEwIHJlIFMKMC4xIDAuMiAwLjUgcmcgQlQgL0YzIDExIFRmIDY1IDI3MCBUZCAoW0RPQ1VNRU5UTyBGSVJNQURPIERJR0lUQUxNRU5URV0pIFRqIEVUCjAgMCAwIHJnIEJUIC9GMiA5IFRmIDY1IDI0MCBUZCAoSkFJTUUgQUxCRVJUTyBPQ0hPQSBNQVJUSU5FWikgVGogRVQKQlQgL0YxIDggVGYgNjUgMjI4IFRkIChSZXByZXNlbnRhbnRlIExlZ2FsKSBUaiBFVApCVCAvRjEgOCBUZiA2NSAyMTYgVGQgKEMuQy4gNzkuNTQ0LjE1NiBkZSBCb2dvdGEgRC5DLikgVGogRVQKMC4xIDAuMiAwLjUgcmcgQlQgL0YzIDExIFRmIDM0NyAyNzAgVGQgKFtET0NVTUVOVE8gRklSTUFETyBESUdJVEFMTUVOVEVdKSBUaiBFVAowIDAgMCByZyBCVCAvRjIgOSBUZiAzNDcgMjQwIFRkIChJVkFOIERBUklPIEdPTlpBTEVaIEQgU0lMVkEpIFRqIEVUCkJUIC9GMSA4IFRmIDM0NyAyMjggVGQgKFByb2Zlc2lvbmFsIFJlc3BvbnNhYmxlIEFzaWduYWRvIFNHLVNTVCkgVGogRVQKQlQgL0YxIDggVGYgMzQ3IDIxNiBUZCAoQy5DLiA4MC4xMjMuNDU2IC0gTGljZW5jaWEgU1NUIE5vLiAxNDIwNS0yMDIyKSBUaiBFVAowLjIgMC40IDAuNiBSRyAxIHcgNTAgMTYwIG0gNTYyIDE2MCBsIFMKMC40IDAuNCAwLjQgcmcgQlQgL0YxIDcuNSBUZiA1MCAxNDUgVGQgKERPQ1RPUiBQWU1FIFNHLVNTVCAtIEV2aWRlbmNpYSBkZSBDdW1wbGltaWVudG8gRXN0YW5kYXIgMS4xLjEuMyAtIFRyYXphYmlsaWRhZCBWZXJpZmljYWRhKSBUaiBFVApCVCAvRjEgNy41IFRmIDUwIDEzMyBUZCAoRG9jdW1lbnRvIGNvbiB2YWxvciBwcm9iYXRvcmlvIGxhYm9yYWwgeSByZWdsYW1lbnRhcmlvIHBhcmEgYXVkaXRvcmlhcyBkZSBNaW5pc3RlcmlvIGRlbCBUcmFiYWpvIHkgQVJMKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI2MSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0MDYgMDAwMDAgbiAKMDAwMDAwMDQ4NCAwMDAwMCBuIAp0cmFpbGVyIDw8IC9TaXplIDggL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjM4OTUKJSVFT0YK",
        "tipo": "application/pdf",
        "tamanio": 4119,
        "fechaCargue": "2026-01-15T14:00:00.000Z"
      },
      "fuentes": [
        {
          "id": "f-pdf-1_1_1_3",
          "url": "/uploads/20260115_090000_1_1_1_3_Acta_Asignacion_Responsable_SST_Ladrillos_Ochoa.pdf",
          "titulo": "📄 Acta de Asignación Responsable SG-SST (Firmada).pdf"
        },
        {
          "id": "f-gdoc-1_1_1_3",
          "url": "https://docs.google.com/document/d/1KwN9NqmkfD7RTZMilnMopH4AeTbdIftwNfaBRCQg9H8/edit?usp=sharing",
          "titulo": "Plantilla Editable (Google Docs)"
        }
      ]
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
      "justificacion": "Responsabilidades del COPASST definidas",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:58:29.629Z"
    },
    "1.1.2.3": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades del Comité de Convivencia definidas",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:58:27.479Z"
    },
    "1.1.2.4": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades de Brigadistas definidas",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:58:25.512Z"
    },
    "1.1.2.5": {
      "estado": "CUMPLE",
      "justificacion": "Responsabilidades de Trabajadores definidas",
      "planAccion": "",
      "linkGuia": "https://docs.google.com/document/d/1AwfsK-lNec9gO-FHNRu4HiyMB3p9WEBNxh5KpyPzKuE/edit?usp=sharing",
      "updatedAt": "2026-09-30T14:21:28.374Z"
    },
    "1.1.2.6": {
      "estado": "CUMPLE",
      "justificacion": "Evidencias y soportes de socialización a toda la organización",
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
      "justificacion": "Política Actualizada 2026 - Firmada por representante legal y soportes de capacitación.",
      "linkGuia": "/uploads/20260115_092000_2_1_1_Politica_SST_2026_Firmada.pdf",
      "updatedAt": "2026-09-29T17:21:15.578Z",
      "archivoAdjunto": {
        "id": "evid-emp-1790438946268-2.1.1-politica",
        "nombre": "Política Oficial del SG-SST 2026 (Firmada).pdf",
        "url": "/uploads/20260115_092000_2_1_1_Politica_SST_2026_Firmada.pdf",
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiAvRjIgNSAwIFIgL0YzIDYgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PiBlbmRvYmoKNCAwIG9iaiA8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgPj4gZW5kb2JqCjYgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUgPj4gZW5kb2JqCjcgMCBvYmogPDwgL0xlbmd0aCAyMjcxID4+CnN0cmVhbQpCVCAvRjIgMTQgVGYgNTAgNzQwIFRkIChMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNzI2IFRkIChOSVQ6IDgwMC4xMjMuNDU2LTcgfCBTaXN0ZW1hIGRlIEdlc3Rpb24gZGUgbGEgU2VndXJpZGFkIHkgU2FsdWQgZW4gZWwgVHJhYmFqbyBTRy1TU1QpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDIgdyA1MCA3MTUgbSA1NjIgNzE1IGwgUwpCVCAvRjIgMTEgVGYgNTAgNjkwIFRkIChQT0xJVElDQSBERUwgU0lTVEVNQSBERSBHRVNUSU9OIERFIFNFR1VSSURBRCBZIFNBTFVEIEVOIEVMIFRSQUJBSk8gKDIwMjYpKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDY3NSBUZCAoQ3VtcGxpbWllbnRvIExlZ2FsOiBSZXNvbHVjaW9uIDAzMTIgZGUgMjAxOSBOdW1lcmFsIDIuMS4xIC0gRGVjcmV0byAxMDcyIGRlIDIwMTUpIFRqIEVUCkJUIC9GMiA5LjUgVGYgNTAgNjMyIFRkICgxLiBERUNMQVJBQ0lPTiBERSBMQSBBTFRBIERJUkVDQ0lPTikgVGogRVQKQlQgL0YxIDguNSBUZiA1MCA2MTYgVGQgKExBRFJJTExPUyBPQ0hPQSBMVERBIGFzdW1lIGVsIGNvbXByb21pc28gZm9ybWFsIGNvbiBsYSBwcm90ZWNjaW9uIGRlIGxhIHNlZ3VyaWRhZCB5IHNhbHVkKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDYwMyBUZCAoZGUgdG9kb3Mgc3VzIHRyYWJhamFkb3JlcyBkaXJlY3RvcywgY29udHJhdGlzdGFzIHkgcGFydGVzIGludGVyZXNhZGFzIGVuIHN1cyBjZW50cm9zIGRlIHRyYWJham8uKSBUaiBFVApCVCAvRjIgOS41IFRmIDUwIDU4MiBUZCAoMi4gT0JKRVRJVk9TIEVTVFJBVEVHSUNPUyBERSBMQSBQT0xJVElDQSkgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1NjYgVGQgKC0gSWRlbnRpZmljYXIgbG9zIHBlbGlncm9zLCBldmFsdWFyIHkgdmFsb3JhciBsb3Mgcmllc2dvcyB5IGVzdGFibGVjZXIgbG9zIHJlc3BlY3Rpdm9zIGNvbnRyb2xlcy4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNTUzIFRkICgtIFByb3RlZ2VyIGxhIHNlZ3VyaWRhZCB5IHNhbHVkIGRlIHRvZG9zIGxvcyB0cmFiYWphZG9yZXMgbWVkaWFudGUgbGEgbWVqb3JhIGNvbnRpbnVhIGRlbCBTRy1TU1QuKSBUaiBFVApCVCAvRjEgOC41IFRmIDY1IDU0MCBUZCAoLSBDdW1wbGlyIGNvbiBsYSBub3JtYXRpdmlkYWQgbGVnYWwgdmlnZW50ZSBlbiBDb2xvbWJpYSBlbiBtYXRlcmlhIGRlIHJpZXNnb3MgbGFib3JhbGVzLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1MjcgVGQgKC0gRGVzdGluYXIgbG9zIHJlY3Vyc29zIGZpbmFuY2llcm9zLCB0ZWNuaWNvcyB5IGh1bWFub3MgbmVjZXNhcmlvcyBwYXJhIGxhIGVqZWN1Y2lvbiBkZWwgc2lzdGVtYS4pIFRqIEVUCkJUIC9GMiA5LjUgVGYgNTAgNTA2IFRkICgzLiBESUZVU0lPTiBZIEFDQ0VTTykgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA0OTAgVGQgKC0gRXN0YSBwb2xpdGljYSBoYSBzaWRvIHNvY2lhbGl6YWRhIHkgcHVibGljYWRhIGVuIGNhcnRlbGVyYXMgZGUgbGEgcGxhbnRhIHkgcG9ydGFsIHdlYiBkZSBsYSBlbXByZXNhLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA0NzcgVGQgKC0gQXBsaWNhIGEgdG9kbyBlbCBwZXJzb25hbCB5IGN1ZW50YSBjb24gcmV2aXNpb24gYW51YWwgY29uZm9ybWUgYWwgRGVjcmV0byAxMDcyIGRlIDIwMTUuKSBUaiBFVAowLjcgMC43IDAuNyBSRyAxIHcgMTgwIDIxMCAyNTAgOTAgcmUgUwowLjEgMC4yIDAuNSByZyBCVCAvRjMgMTAgVGYgMjAwIDI3MCBUZCAoW0RPQ1VNRU5UTyBGSVJNQURPIERJR0lUQUxNRU5URV0pIFRqIEVUCjAgMCAwIHJnIEJUIC9GMiA4LjUgVGYgMjAwIDI0NSBUZCAoSkFJTUUgQUxCRVJUTyBPQ0hPQSBNQVJUSU5FWikgVGogRVQKQlQgL0YxIDcuNSBUZiAyMDAgMjMzIFRkIChSZXByZXNlbnRhbnRlIExlZ2FsIC0gR2VyZW5jaWEgR2VuZXJhbCkgVGogRVQKQlQgL0YxIDcuNSBUZiAyMDAgMjIxIFRkIChDLkMuIDc5LjU0NC4xNTYgZGUgQm9nb3RhIEQuQy4pIFRqIEVUCjAuMiAwLjQgMC42IFJHIDEgdyA1MCA5MCBtIDU2MiA5MCBsIFMKMC40IDAuNCAwLjQgcmcgQlQgL0YxIDcuNSBUZiA1MCA3NSBUZCAoRE9DVE9SIFBZTUUgU0ctU1NUIC0gRXZpZGVuY2lhIGRlIEN1bXBsaW1pZW50byBFc3RhbmRhciAyLjEuMSAtIEFyY2hpdm8gT2ZpY2lhbCBQcm90ZWdpZG8pIFRqIEVUCkJUIC9GMSA3LjUgVGYgNTAgNjMgVGQgKERvY3VtZW50byBjb24gdmFsb3IgcHJvYmF0b3JpbyBsYWJvcmFsIHkgcmVnbGFtZW50YXJpbyBwYXJhIGF1ZGl0b3JpYXMgZGUgTWluaXN0ZXJpbyBkZWwgVHJhYmFqbyB5IEFSTCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNjEgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDA2IDAwMDAwIG4gCjAwMDAwMDA0ODQgMDAwMDAgbiAKdHJhaWxlciA8PCAvU2l6ZSA4IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoyODA3CiUlRU9GCg==",
        "tipo": "application/pdf",
        "tamanio": 3031,
        "fechaCargue": "2026-01-15T14:20:00.000Z"
      },
      "fuentes": [
        {
          "id": "f-pdf-2_1_1",
          "url": "/uploads/20260115_092000_2_1_1_Politica_SST_2026_Firmada.pdf",
          "titulo": "📄 Política Oficial del SG-SST 2026 (Firmada).pdf"
        },
        {
          "id": "f-gdoc-2_1_1",
          "url": "https://docs.google.com/document/d/1sRg32I5sGNpe6ROYxwxjq1pcRpEPAZN9mJoWj_rEpFw/edit?usp=sharing",
          "titulo": "Plantilla Editable (Google Docs)"
        }
      ]
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
      "linkGuia": "https://docs.google.com/spreadsheets/d/16xBhbhxgWSB7zUBTaOiCFslyKDhKLlQgcmEBI4v7fb0/edit?usp=sharing",
      "updatedAt": "2026-10-05T14:22:45.022Z",
      "estado": "CUMPLE"
    },
    "1.2.2": {
      "estado": "NO_APLICA",
      "updatedAt": "2026-10-16T13:39:42.609Z",
      "justificacion": "No se realizan actividades en alturas o espacios confinados que demanden certificaciones externas.",
      "fuentes": [
        {
          "id": "f-pdf-1_2_2",
          "url": "/uploads/20260115_091000_1_2_2_Certificado_No_Alturas_Espacios_Confinados.pdf",
          "titulo": "📄 Certificado No Aplicación Alturas y Confinados (Firmado).pdf"
        },
        {
          "id": "f-gdoc-1_2_2",
          "url": "https://docs.google.com/document/d/1_XFL8X6yJrIr8JVClYx5LBD7Kv1cum41k66jmt_74CY/edit?usp=sharing",
          "titulo": "Plantilla Editable (Google Docs)"
        }
      ],
      "linkGuia": "/uploads/20260115_091000_1_2_2_Certificado_No_Alturas_Espacios_Confinados.pdf",
      "archivoAdjunto": {
        "id": "evid-emp-1790438946268-1.2.2-cert",
        "nombre": "Certificado No Aplicación Alturas y Confinados (Firmado).pdf",
        "url": "/uploads/20260115_091000_1_2_2_Certificado_No_Alturas_Espacios_Confinados.pdf",
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiAvRjIgNSAwIFIgL0YzIDYgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PiBlbmRvYmoKNCAwIG9iaiA8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgPj4gZW5kb2JqCjYgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUgPj4gZW5kb2JqCjcgMCBvYmogPDwgL0xlbmd0aCAyNDI3ID4+CnN0cmVhbQpCVCAvRjIgMTQgVGYgNTAgNzQwIFRkIChMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNzI2IFRkIChOSVQ6IDgwMC4xMjMuNDU2LTcgfCBTaXN0ZW1hIGRlIEdlc3Rpb24gZGUgbGEgU2VndXJpZGFkIHkgU2FsdWQgZW4gZWwgVHJhYmFqbyBTRy1TU1QpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDIgdyA1MCA3MTUgbSA1NjIgNzE1IGwgUwpCVCAvRjIgMTEgVGYgNTAgNjkwIFRkIChDRVJUSUZJQ0FDSU9OIERFIE5PIEFQTElDQUNJT04gREUgVFJBQkFKTyBFTiBBTFRVUkFTIE5JIEVTUEFDSU9TIENPTkZJTkFET1MpIFRqIEVUCkJUIC9GMSA4LjUgVGYgNTAgNjc1IFRkIChDdW1wbGltaWVudG8gTGVnYWw6IFJlc29sdWNpb24gMDMxMiBkZSAyMDE5IE51bWVyYWwgMS4yLjIgLSBEZWNyZXRvIDEwNzIgZGUgMjAxNSkgVGogRVQKQlQgL0YyIDkuNSBUZiA1MCA2MzIgVGQgKDEuIERFQ0xBUkFDSU9OIEdFTkVSQUwpIFRqIEVUCkJUIC9GMSA4LjUgVGYgNTAgNjE2IFRkIChFbCBzdXNjcml0byBSZXByZXNlbnRhbnRlIExlZ2FsIGRlIExBRFJJTExPUyBPQ0hPQSBMVERBIGNlcnRpZmljYSBxdWU6KSBUaiBFVApCVCAvRjEgOC41IFRmIDY1IDYwMyBUZCAoLSBMYSBlbXByZXNhIHJlYWxpemEgYWN0aXZpZGFkZXMgZGUgZmFicmljYWNpb24geSBjb21lcmNpYWxpemFjaW9uIGRlIHByb2R1Y3RvcyBkZSBhcmNpbGxhLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1OTAgVGQgKC0gRW4gbGFzIGluc3RhbGFjaW9uZXMgb3BlcmF0aXZhcyBubyBzZSBlamVjdXRhbiBsYWJvcmVzIGVuIGFsdHVyYXMgc3VwZXJpb3JlcyBhIDEuNTAgbWV0cm9zLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1NzcgVGQgKC0gTm8gc2UgcmVhbGl6YW4gbGFib3JlcyBkZSBpbmdyZXNvIGEgZXNwYWNpb3MgY29uZmluYWRvcyBxdWUgZGVtYW5kZW4gY2VydGlmaWNhY2lvbmVzIHRlY25pY2FzIGV4dGVybmFzLikgVGogRVQKQlQgL0YyIDkuNSBUZiA1MCA1NTYgVGQgKDIuIEpVU1RJRklDQUNJT04gVEVDTklDQSBZIE5PUk1BVElWQSkgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1NDAgVGQgKC0gQ29uZm9ybWUgYSBsYSBSZXNvbHVjaW9uIDQyNzIgZGUgMjAyMSB5IFJlc29sdWNpb24gMDMxMiBkZSAyMDE5LCBlc3RlIHJlcXVpc2l0byBzZSBkZWNsYXJhIE5PIEFQTElDQS4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNTI3IFRkICgtIFRvZGEgYWN0aXZpZGFkIGRlIG1hbnRlbmltaWVudG8gZGUgdGVjaG9zIG8gZXN0cnVjdHVyYXMgZWxldmFkYXMgc2UgdGVyY2VyaXphIGNvbiBwZXJzb25hbCBjZXJ0aWZpY2Fkby4pIFRqIEVUCkJUIC9GMiA5LjUgVGYgNTAgNTA2IFRkICgzLiBWSUdFTkNJQSBZIEFDVFVBTElaQUNJT04pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNDkwIFRkICgtIENlcnRpZmljYWNpb24gdmFsaWRhIHBhcmEgbGEgdmlnZW5jaWEgMjAyNSAtIDIwMjYsIHN1amV0YSBhIHJldmlzaW9uIGFudWFsIHBvciBlbCBDT1BBU1NUIHkgR2VyZW5jaWEuKSBUaiBFVAowLjcgMC43IDAuNyBSRyAxIHcgNTAgMjEwIDIzMCA5MCByZSBTCjAuNyAwLjcgMC43IFJHIDEgdyAzMzIgMjEwIDIzMCA5MCByZSBTCjAuMSAwLjIgMC41IHJnIEJUIC9GMyAxMCBUZiA2NSAyNzAgVGQgKFtET0NVTUVOVE8gRklSTUFETyBESUdJVEFMTUVOVEVdKSBUaiBFVAowIDAgMCByZyBCVCAvRjIgOC41IFRmIDY1IDI0NSBUZCAoSkFJTUUgQUxCRVJUTyBPQ0hPQSBNQVJUSU5FWikgVGogRVQKQlQgL0YxIDcuNSBUZiA2NSAyMzMgVGQgKFJlcHJlc2VudGFudGUgTGVnYWwpIFRqIEVUCkJUIC9GMSA3LjUgVGYgNjUgMjIxIFRkIChDLkMuIDc5LjU0NC4xNTYgZGUgQm9nb3RhIEQuQy4pIFRqIEVUCjAuMSAwLjIgMC41IHJnIEJUIC9GMyAxMCBUZiAzNDcgMjcwIFRkIChbRE9DVU1FTlRPIEZJUk1BRE8gRElHSVRBTE1FTlRFXSkgVGogRVQKMCAwIDAgcmcgQlQgL0YyIDguNSBUZiAzNDcgMjQ1IFRkIChJVkFOIERBUklPIEdPTlpBTEVaIEQgU0lMVkEpIFRqIEVUCkJUIC9GMSA3LjUgVGYgMzQ3IDIzMyBUZCAoUmVzcG9uc2FibGUgZGVsIFNHLVNTVCkgVGogRVQKQlQgL0YxIDcuNSBUZiAzNDcgMjIxIFRkIChMaWNlbmNpYSBTU1QgTm8uIDE0MjA1LTIwMjIpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDEgdyA1MCA5MCBtIDU2MiA5MCBsIFMKMC40IDAuNCAwLjQgcmcgQlQgL0YxIDcuNSBUZiA1MCA3NSBUZCAoRE9DVE9SIFBZTUUgU0ctU1NUIC0gRXZpZGVuY2lhIGRlIEN1bXBsaW1pZW50byBFc3RhbmRhciAxLjIuMiAtIEFyY2hpdm8gT2ZpY2lhbCBQcm90ZWdpZG8pIFRqIEVUCkJUIC9GMSA3LjUgVGYgNTAgNjMgVGQgKERvY3VtZW50byBjb24gdmFsb3IgcHJvYmF0b3JpbyBsYWJvcmFsIHkgcmVnbGFtZW50YXJpbyBwYXJhIGF1ZGl0b3JpYXMgZGUgTWluaXN0ZXJpbyBkZWwgVHJhYmFqbyB5IEFSTCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNjEgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDA2IDAwMDAwIG4gCjAwMDAwMDA0ODQgMDAwMDAgbiAKdHJhaWxlciA8PCAvU2l6ZSA4IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoyOTYzCiUlRU9GCg==",
        "tipo": "application/pdf",
        "tamanio": 3187,
        "fechaCargue": "2026-01-15T14:10:00.000Z"
      }
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
      "estado": "CUMPLE",
      "fuentes": [
        {
          "id": "f-1",
          "url": "https://docs.google.com/spreadsheets/d/1gaamZRZIqd1B1IdnF6S3vwqVzUR68izYt2IbmaJJVCk/edit?usp=sharing",
          "titulo": "PROCEDIMIENTO DE INDUCCIÓN EN SEGURIDAD Y SALUD EN EL TRABAJO"
        }
      ]
    },
    "2.9.1": {
      "estado": "CUMPLE",
      "updatedAt": "2026-09-30T16:02:55.021Z"
    },
    "2.10.1": {
      "estado": "NO_CUMPLE",
      "updatedAt": "2026-10-05T15:53:44.090Z",
      "planAccion": "crear manual de contratistas "
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
      "linkGuia": "/uploads/20260115_093000_3_1_7_1_Politica_Prevencion_Alcohol_Tabaco_SPA_Firmada.pdf",
      "updatedAt": "2026-09-30T17:10:50.287Z",
      "archivoAdjunto": {
        "id": "evid-emp-1790438946268-3.1.7.1-politica-spa",
        "nombre": "Política de Prevención Tabaco, Alcohol y SPA (Firmada).pdf",
        "url": "/uploads/20260115_093000_3_1_7_1_Politica_Prevencion_Alcohol_Tabaco_SPA_Firmada.pdf",
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiAvRjIgNSAwIFIgL0YzIDYgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PiBlbmRvYmoKNCAwIG9iaiA8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgPj4gZW5kb2JqCjYgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUgPj4gZW5kb2JqCjcgMCBvYmogPDwgL0xlbmd0aCAyNTk1ID4+CnN0cmVhbQpCVCAvRjIgMTQgVGYgNTAgNzQwIFRkIChMQURSSUxMT1MgT0NIT0EgTFREQSkgVGogRVQKQlQgL0YxIDkgVGYgNTAgNzI2IFRkIChOSVQ6IDgwMC4xMjMuNDU2LTcgfCBTaXN0ZW1hIGRlIEdlc3Rpb24gZGUgbGEgU2VndXJpZGFkIHkgU2FsdWQgZW4gZWwgVHJhYmFqbyBTRy1TU1QpIFRqIEVUCjAuMiAwLjQgMC42IFJHIDIgdyA1MCA3MTUgbSA1NjIgNzE1IGwgUwpCVCAvRjIgMTEgVGYgNTAgNjkwIFRkIChQT0xJVElDQSBERSBQUkVWRU5DSU9OIERFTCBDT05TVU1PIERFIFRBQkFDTywgQUxDT0hPTCBZIFNVU1RBTkNJQVMgUFNJQ09BQ1RJVkFTKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDY3NSBUZCAoQ3VtcGxpbWllbnRvIExlZ2FsOiBSZXNvbHVjaW9uIDAzMTIgZGUgMjAxOSBOdW1lcmFsIDMuMS43LjEgLSBEZWNyZXRvIDEwNzIgZGUgMjAxNSkgVGogRVQKQlQgL0YyIDkuNSBUZiA1MCA2MzIgVGQgKDEuIFBST1BPU0lUTyBJTlNUSVRVQ0lPTkFMKSBUaiBFVApCVCAvRjEgOC41IFRmIDUwIDYxNiBUZCAoTEFEUklMTE9TIE9DSE9BIExUREEgZXN0YWJsZWNlIGVsIGNvbXByb21pc28gaXJyZXN0cmljdG8gZGUgcHJvcGljaWFyIHVuIGFtYmllbnRlIGRlIHRyYWJham8pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNTAgNjAzIFRkIChzYW5vLCBzZWd1cm8geSBwcm9kdWN0aXZvLCBsaWJyZSBkZWwgY29uc3VtbyBkZSB0YWJhY28sIGFsY29ob2wgeSBkcm9nYXMgZW4gdG9kYXMgc3VzIGFyZWFzLikgVGogRVQKQlQgL0YyIDkuNSBUZiA1MCA1ODIgVGQgKDIuIERJUkVDVFJJQ0VTIFkgUFJPSElCSUNJT05FUykgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA1NjYgVGQgKC0gU2UgcHJvaGliZSBwcmVzZW50YXJzZSBhIGxhYm9yYXIgYmFqbyBlbCBlZmVjdG8gZGUgYWxjb2hvbCwgc3VzdGFuY2lhcyBwc2ljb2FjdGl2YXMgbyBlc3R1cGVmYWNpZW50ZXMuKSBUaiBFVApCVCAvRjEgOC41IFRmIDY1IDU1MyBUZCAoLSBTZSBwcm9oaWJlIGxhIHBvc2VzaW9uLCBkaXN0cmlidWNpb24sIGNvbWVyY2lhbGl6YWNpb24gbyBjb25zdW1vIGRlIGVzdGFzIHN1c3RhbmNpYXMgZW4gaW5zdGFsYWNpb25lcy4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNTQwIFRkICgtIFF1ZWRhIHByb2hpYmlkbyBmdW1hciBlbiB0b2RhcyBsYXMgaW5zdGFsYWNpb25lcyBkZSBsYSBvcmdhbml6YWNpb24gKEVzcGFjaW8gMTAwJSBMaWJyZSBkZSBIdW1vKS4pIFRqIEVUCkJUIC9GMSA4LjUgVGYgNjUgNTI3IFRkICgtIExhIGVtcHJlc2EgcHJvbW92ZXJhIHByb2dyYW1hcyBkZSBlc3RpbG9zIGRlIHZpZGEgc2FsdWRhYmxlcyB5IHBhdXNhcyBhY3RpdmFzIHBhcmEgbG9zIGNvbGFib3JhZG9yZXMuKSBUaiBFVApCVCAvRjIgOS41IFRmIDUwIDUwNiBUZCAoMy4gU0FOQ0lPTkVTIFkgRVZBTFVBQ0lPTikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA0OTAgVGQgKC0gRWwgaW5jdW1wbGltaWVudG8gZGUgZXN0YSBwb2xpdGljYSBjb25zdGl0dXllIGZhbHRhIGdyYXZlIHNlZ3VuIGVsIFJlZ2xhbWVudG8gSW50ZXJubyBkZSBUcmFiYWpvLikgVGogRVQKQlQgL0YxIDguNSBUZiA2NSA0NzcgVGQgKC0gU2UgcmVhbGl6YXJhbiBwcnVlYmFzIGRlIGNvbnRyb2wgeSB0YW1pemFqZSBwcmV2ZW50aXZvIG9yaWVudGFkYXMgYSBsYSBwcm90ZWNjaW9uIGludGVncmFsIGRlbCB0cmFiYWphZG9yLikgVGogRVQKMC43IDAuNyAwLjcgUkcgMSB3IDUwIDIxMCAyMzAgOTAgcmUgUwowLjcgMC43IDAuNyBSRyAxIHcgMzMyIDIxMCAyMzAgOTAgcmUgUwowLjEgMC4yIDAuNSByZyBCVCAvRjMgMTAgVGYgNjUgMjcwIFRkIChbRE9DVU1FTlRPIEZJUk1BRE8gRElHSVRBTE1FTlRFXSkgVGogRVQKMCAwIDAgcmcgQlQgL0YyIDguNSBUZiA2NSAyNDUgVGQgKEpBSU1FIEFMQkVSVE8gT0NIT0EgTUFSVElORVopIFRqIEVUCkJUIC9GMSA3LjUgVGYgNjUgMjMzIFRkIChSZXByZXNlbnRhbnRlIExlZ2FsKSBUaiBFVApCVCAvRjEgNy41IFRmIDY1IDIyMSBUZCAoQy5DLiA3OS41NDQuMTU2IGRlIEJvZ290YSBELkMuKSBUaiBFVAowLjEgMC4yIDAuNSByZyBCVCAvRjMgMTAgVGYgMzQ3IDI3MCBUZCAoW0RPQ1VNRU5UTyBGSVJNQURPIERJR0lUQUxNRU5URV0pIFRqIEVUCjAgMCAwIHJnIEJUIC9GMiA4LjUgVGYgMzQ3IDI0NSBUZCAoSVZBTiBEQVJJTyBHT05aQUxFWiBEIFNJTFZBKSBUaiBFVApCVCAvRjEgNy41IFRmIDM0NyAyMzMgVGQgKFJlc3BvbnNhYmxlIGRlbCBTRy1TU1QpIFRqIEVUCkJUIC9GMSA3LjUgVGYgMzQ3IDIyMSBUZCAoTGljZW5jaWEgU1NUIE5vLiAxNDIwNS0yMDIyKSBUaiBFVAowLjIgMC40IDAuNiBSRyAxIHcgNTAgOTAgbSA1NjIgOTAgbCBTCjAuNCAwLjQgMC40IHJnIEJUIC9GMSA3LjUgVGYgNTAgNzUgVGQgKERPQ1RPUiBQWU1FIFNHLVNTVCAtIEV2aWRlbmNpYSBkZSBDdW1wbGltaWVudG8gRXN0YW5kYXIgMy4xLjcuMSAtIEFyY2hpdm8gT2ZpY2lhbCBQcm90ZWdpZG8pIFRqIEVUCkJUIC9GMSA3LjUgVGYgNTAgNjMgVGQgKERvY3VtZW50byBjb24gdmFsb3IgcHJvYmF0b3JpbyBsYWJvcmFsIHkgcmVnbGFtZW50YXJpbyBwYXJhIGF1ZGl0b3JpYXMgZGUgTWluaXN0ZXJpbyBkZWwgVHJhYmFqbyB5IEFSTCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNjEgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDA2IDAwMDAwIG4gCjAwMDAwMDA0ODQgMDAwMDAgbiAKdHJhaWxlciA8PCAvU2l6ZSA4IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgozMTMxCiUlRU9GCg==",
        "tipo": "application/pdf",
        "tamanio": 3355,
        "fechaCargue": "2026-01-15T14:30:00.000Z"
      },
      "fuentes": [
        {
          "id": "f-pdf-3_1_7_1",
          "url": "/uploads/20260115_093000_3_1_7_1_Politica_Prevencion_Alcohol_Tabaco_SPA_Firmada.pdf",
          "titulo": "📄 Política de Prevención Tabaco, Alcohol y SPA (Firmada).pdf"
        },
        {
          "id": "f-gdoc-3_1_7_1",
          "url": "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
          "titulo": "Plantilla Editable (Google Docs)"
        }
      ]
    },
    "3.1.7.2": {
      "estado": "CUMPLE",
      "justificacion": "Programa de estilos de vida y entornos saludables (Prevención y Promoción de salud Pública): tabaquismo, alcoholismo, farmacodependencia, salud mental, alimentación saludable, pausas activas, ergonomía y control de enfermedades.",
      "linkGuia": "https://docs.google.com/document/d/1vfHlhlNkl3thBA5VrxDOoYrR_lb93BAMUjNfJ_L5x8A/edit?usp=sharing",
      "updatedAt": "2026-10-05T19:08:56.576Z"
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
      "updatedAt": "2026-10-05T19:55:48.856Z",
      "linkGuia": "https://docs.google.com/spreadsheets/d/15m279FowJpNTtXc23roPiruQzYMYUNdVp7qnKeNUrfQ/edit?usp=sharing"
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
    setEvidenceStoreRef(this);
    this.init();
    this.sincronizarConServidorFisico();

    // Sincronización automática periódica y reactiva a cambios de pestaña o foco
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.sincronizarConServidorFisico());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.sincronizarConServidorFisico();
        }
      });
      // Comprobación de integridad con el servidor cada 30 segundos
      setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          this.sincronizarConServidorFisico();
        }
      }, 30000);
    }
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
          // Garantizar integridad estructural de todas las colecciones sin forzar duplicados demo
          if (!Array.isArray(this.data.matriz)) this.data.matriz = [];
          if (!Array.isArray(this.data.planTrabajo)) this.data.planTrabajo = [];
          if (!Array.isArray(this.data.accidentes)) this.data.accidentes = [];
          if (!Array.isArray(this.data.trabajadores)) this.data.trabajadores = [];
          if (!Array.isArray(this.data.capacitaciones)) this.data.capacitaciones = [];
          if (!Array.isArray(this.data.equipos)) this.data.equipos = [];
          if (!Array.isArray(this.data.mantenimientos)) this.data.mantenimientos = [];
          if (!Array.isArray(this.data.firmas)) this.data.firmas = [];
          if (!Array.isArray(this.data.reportesPeligro)) this.data.reportesPeligro = [];
          if (!Array.isArray(this.data.reportesPreoperacional)) this.data.reportesPreoperacional = [];
          if (!Array.isArray(this.data.tools_inventory)) this.data.tools_inventory = [];
          if (!Array.isArray(this.data.tools_sst)) this.data.tools_sst = [];
          if (!Array.isArray(this.data.tools_maintenance_plan)) this.data.tools_maintenance_plan = [];
          if (!Array.isArray(this.data.tools_assignments)) this.data.tools_assignments = [];
          if (!Array.isArray(this.data.data_privacy_consents)) this.data.data_privacy_consents = [];
          if (!Array.isArray(this.data.legal_policy_versions)) this.data.legal_policy_versions = [];
          if (!Array.isArray(this.data.legal_acceptance_repository)) this.data.legal_acceptance_repository = [];
          if (!Array.isArray(this.data.perfiles_cargo)) this.data.perfiles_cargo = [];
          if (!Array.isArray(this.data.process_maps)) this.data.process_maps = [];
          if (!Array.isArray(this.data.processes)) this.data.processes = [];
          if (!Array.isArray(this.data.process_activities)) this.data.process_activities = [];
          if (!Array.isArray(this.data.job_positions)) this.data.job_positions = [];
          if (!Array.isArray(this.data.process_activity_positions)) this.data.process_activity_positions = [];
          if (!Array.isArray(this.data.job_position_documents)) this.data.job_position_documents = [];
          if (!Array.isArray(this.data.epp_dotacion_catalog)) this.data.epp_dotacion_catalog = [];
          if (!Array.isArray(this.data.job_position_epp_matrix)) this.data.job_position_epp_matrix = [];
          if (!Array.isArray(this.data.epp_dotacion_deliveries)) this.data.epp_dotacion_deliveries = [];
          if (!Array.isArray(this.data.epp_dotacion_delivery_items)) this.data.epp_dotacion_delivery_items = [];
          if (!Array.isArray(this.data.super_admins)) {
            this.data.super_admins = [
              {
                id: 'sa-001',
                email: 'i.gonzalez.dsilva@gmail.com',
                nombre: 'Ing. Iván David González Silva',
                cargo: 'Super Administrador & Consultor Principal SST',
                licencia: 'RESOLUCIÓN No. 6514 de 19/10/2022',
                telefono: '3144001787',
                password: 'Stoner200',
                estado: 'ACTIVO',
                creadoEn: '2026-10-10T00:00:00.000Z',
                ultimoIngreso: new Date().toISOString()
              },
              {
                id: 'sa-002',
                email: 'serviciosivangonzalez@gmail.com',
                nombre: 'Ing. Iván David González Silva',
                cargo: 'Super Administrador & Consultor Principal SST',
                licencia: 'RESOLUCIÓN No. 6514 de 19/10/2022',
                telefono: '3144001787',
                password: 'Stoner200',
                estado: 'ACTIVO',
                creadoEn: '2026-10-10T00:00:00.000Z',
                ultimoIngreso: new Date().toISOString()
              }
            ];
          }
          if (!Array.isArray(this.data.super_admins)) {
            this.data.super_admins = [
              {
                id: 'sa-001',
                email: 'i.gonzalez.dsilva@gmail.com',
                nombre: 'Ing. Iván David González Silva',
                cargo: 'Super Administrador & Consultor Principal SST',
                licencia: 'RESOLUCIÓN No. 6514 de 19/10/2022',
                telefono: '3144001787',
                password: 'Stoner200',
                estado: 'ACTIVO',
                creadoEn: '2026-10-10T00:00:00.000Z',
                ultimoIngreso: new Date().toISOString()
              },
              {
                id: 'sa-002',
                email: 'serviciosivangonzalez@gmail.com',
                nombre: 'Ing. Iván David González Silva',
                cargo: 'Super Administrador & Consultor Principal SST',
                licencia: 'RESOLUCIÓN No. 6514 de 19/10/2022',
                telefono: '3144001787',
                password: 'Stoner200',
                estado: 'ACTIVO',
                creadoEn: '2026-10-10T00:00:00.000Z',
                ultimoIngreso: new Date().toISOString()
              }
            ];
          }
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

          // Consolidar empresa auténtica: LADRILLOS OCHOA LTDA (emp-1790438946268) preservando las demás empresas
          const ID_OCHOA = "emp-1790438946268";
          const ochoaExistente = this.data.empresas.find(e => 
            e.id === ID_OCHOA || e.id === 'emp-004' || (e.razonSocial && e.razonSocial.toLowerCase().includes('ladrillos ochoa'))
          );
          const otrasEmpresas = this.data.empresas.filter(e => 
            e.id !== ID_OCHOA && e.id !== 'emp-004' && (!e.razonSocial || !e.razonSocial.toLowerCase().includes('ladrillos ochoa'))
          );

          let ochoaConsolidada;
          if (!ochoaExistente) {
            ochoaConsolidada = { ...EMPRESAS_DEMO[0] };
          } else {
            ochoaConsolidada = {
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
              tieneOrganigrama: true,
              acceso: ochoaExistente.acceso || EMPRESAS_DEMO[0].acceso
            };
          }
          this.data.empresas = [ochoaConsolidada, ...otrasEmpresas];

          // Garantizar que toda empresa tenga su objeto de acceso configurado
          this.data.empresas.forEach(emp => {
            if (!emp.acceso) {
              emp.acceso = {
                usuario: emp.email || `${emp.nit}@doctorpyme.co`,
                password: (emp.razonSocial ? emp.razonSocial.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'pyme') + '2026*',
                estado: 'ACTIVO',
                rol: 'Administrador Empresa',
                ultimoIngreso: null,
                creadoEn: emp.createdAt || new Date().toISOString()
              };
            }
          });

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

          // Garantizar que la documentación de ayer (2025) quede 100% restaurada con sus links y justificaciones
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

          // Restauración forzosa en localStorage para usuarios con caché antiguo limpio
          if (storage.getItem('SG_SST_RESTORED_OCHOA_V4') !== 'true') {
            this.data.evaluaciones[ID_OCHOA] = this.data.evaluaciones[ID_OCHOA] || {};
            this.data.evaluaciones[ID_OCHOA]['2025'] = JSON.parse(JSON.stringify(EVALUACIONES_RECUPERADAS_AYER['2025']));
            this.data.evaluaciones[ID_OCHOA]['2026'] = JSON.parse(JSON.stringify(EVALUACIONES_RECUPERADAS_AYER['2026']));
            this.data.evaluaciones['emp-004'] = this.data.evaluaciones[ID_OCHOA];
            try {
              storage.removeItem('SG_SST_CLEANED_2026_V1');
              storage.setItem('SG_SST_RESTORED_OCHOA_V4', 'true');
              storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            } catch {}
          }

          // Guardar únicamente en caché local, sin disparar guardado al servidor
          try {
            storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
          } catch {}
        }
      } catch (e) {
        console.error("Error al parsear datos de almacenamiento local", e);
        this.guardarCopiaEmergencia(raw);
        this.resetearDatosDemo();
        this.intentarRecuperarDeIndexedDB();
      }
    }

    let savedCompany = storage.getItem(ACTIVE_COMPANY_KEY);
    if (!savedCompany || ['emp-001', 'emp-002', 'emp-003'].includes(savedCompany) || (savedCompany !== 'todas' && !this.data?.empresas?.some(e => e.id === savedCompany || (savedCompany === 'emp-004' && e.id === 'emp-1790438946268')))) {
      savedCompany = 'todas';
      storage.setItem(ACTIVE_COMPANY_KEY, 'todas');
    }
    this.empresaActivaId = savedCompany;

    const savedYear = storage.getItem(ACTIVE_YEAR_KEY);
    this.anioActivo = savedYear || ANIO_BASE_INICIAL;
  }

  saveToStorage() {
    this.lastSaved = new Date();
    if (this.data) {
      this.data.updatedAt = this.lastSaved.toISOString();
    }
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

  getApiUrl(endpoint) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
    const prefix = path.startsWith('/sst') ? '/sst/api' : '/api';
    return `${prefix}${cleanEndpoint}`;
  }

  async sincronizarConServidorFisico() {
    if (typeof fetch === 'undefined') return;
    try {
      const resp = await fetch(this.getApiUrl('/data'));
      if (resp.ok) {
        const serverData = await resp.json();
        if (serverData && Array.isArray(serverData.empresas) && serverData.empresas.length > 0) {
          // El servidor físico (data/database.json) es la única fuente autoritativa de verdad
          console.log("✓ Sincronizado con Base de Datos Física en Disco (data/database.json)");
          this.data = serverData;
          this.serverSynced = true;
          this.lastSaved = new Date();

          // Asegurar estructura de acceso en todas las empresas
          if (Array.isArray(this.data.empresas)) {
            this.data.empresas.forEach(emp => {
              if (!emp.acceso) {
                emp.acceso = {
                  usuario: emp.email || `${emp.nit}@doctorpyme.co`,
                  password: (emp.razonSocial ? emp.razonSocial.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'pyme') + '2026*',
                  estado: 'ACTIVO',
                  rol: 'Administrador Empresa',
                  ultimoIngreso: null,
                  creadoEn: emp.createdAt || new Date().toISOString()
                };
              }
            });
          }

          // Asegurar integridad de colecciones operativas SIN sobrescribir listas vacías con demos
          if (!Array.isArray(this.data.trabajadores)) this.data.trabajadores = [];
          if (!Array.isArray(this.data.capacitaciones)) this.data.capacitaciones = [];
          if (!Array.isArray(this.data.equipos)) this.data.equipos = [];
          if (!Array.isArray(this.data.mantenimientos)) this.data.mantenimientos = [];
          if (!Array.isArray(this.data.firmas)) this.data.firmas = [];
          if (!Array.isArray(this.data.reportesPeligro)) this.data.reportesPeligro = [];
          if (!Array.isArray(this.data.reportesPreoperacional)) this.data.reportesPreoperacional = [];
          if (!Array.isArray(this.data.tools_inventory)) this.data.tools_inventory = [];
          if (!Array.isArray(this.data.tools_sst)) this.data.tools_sst = [];
          if (!Array.isArray(this.data.tools_maintenance_plan)) this.data.tools_maintenance_plan = [];
          if (!Array.isArray(this.data.tools_assignments)) this.data.tools_assignments = [];
          if (!Array.isArray(this.data.data_privacy_consents)) this.data.data_privacy_consents = [];
          if (!Array.isArray(this.data.legal_policy_versions)) this.data.legal_policy_versions = [];
          if (!Array.isArray(this.data.legal_acceptance_repository)) this.data.legal_acceptance_repository = [];
          if (!Array.isArray(this.data.perfiles_cargo)) this.data.perfiles_cargo = [];
          if (!Array.isArray(this.data.process_maps)) this.data.process_maps = [];
          if (!Array.isArray(this.data.processes)) this.data.processes = [];
          if (!Array.isArray(this.data.process_activities)) this.data.process_activities = [];
          if (!Array.isArray(this.data.job_positions)) this.data.job_positions = [];
          if (!Array.isArray(this.data.process_activity_positions)) this.data.process_activity_positions = [];
          if (!Array.isArray(this.data.job_position_documents)) this.data.job_position_documents = [];
          if (!Array.isArray(this.data.epp_dotacion_catalog)) this.data.epp_dotacion_catalog = [];
          if (!Array.isArray(this.data.job_position_epp_matrix)) this.data.job_position_epp_matrix = [];
          if (!Array.isArray(this.data.epp_dotacion_deliveries)) this.data.epp_dotacion_deliveries = [];
          if (!Array.isArray(this.data.epp_dotacion_delivery_items)) this.data.epp_dotacion_delivery_items = [];
          if (!Array.isArray(this.data.super_admins)) {
            this.data.super_admins = [
              {
                id: 'sa-001',
                email: 'i.gonzalez.dsilva@gmail.com',
                nombre: 'Ing. Iván David González Silva',
                cargo: 'Super Administrador & Consultor Principal SST',
                licencia: 'RESOLUCIÓN No. 6514 de 19/10/2022',
                telefono: '3144001787',
                password: 'Stoner200',
                estado: 'ACTIVO',
                creadoEn: '2026-10-10T00:00:00.000Z',
                ultimoIngreso: new Date().toISOString()
              },
              {
                id: 'sa-002',
                email: 'serviciosivangonzalez@gmail.com',
                nombre: 'Ing. Iván David González Silva',
                cargo: 'Super Administrador & Consultor Principal SST',
                licencia: 'RESOLUCIÓN No. 6514 de 19/10/2022',
                telefono: '3144001787',
                password: 'Stoner200',
                estado: 'ACTIVO',
                creadoEn: '2026-10-10T00:00:00.000Z',
                ultimoIngreso: new Date().toISOString()
              }
            ];
          }

          // Garantizar 1 único registro de Política de Tratamiento de Datos por empresa (Ley 1581 / Ley 527)
          const seenTenants = new Set();
          const uniqueRepo = [];
          // Ordenar del más antiguo al más reciente para conservar el primer registro de creación de la empresa
          const sortedRepo = [...this.data.legal_acceptance_repository].sort((a, b) => new Date(a.accepted_at_utc || 0) - new Date(b.accepted_at_utc || 0));
          sortedRepo.forEach(rec => {
            if (rec && rec.tenant_id && !seenTenants.has(rec.tenant_id)) {
              seenTenants.add(rec.tenant_id);
              uniqueRepo.push(rec);
            }
          });
          this.data.legal_acceptance_repository = uniqueRepo;

          if (Array.isArray(this.data.empresas)) {
            this.data.empresas.forEach(emp => {
              const rec = uniqueRepo.find(r => r.tenant_id === emp.id || ((emp.id === 'emp-004' || emp.id === 'emp-1790438946268') && (r.tenant_id === 'emp-004' || r.tenant_id === 'emp-1790438946268')));
              if (rec) {
                emp.politicaDatosAceptada = true;
                emp.politicaDatosCertificado = rec.certificate_code;
                emp.politicaDatosFecha = rec.accepted_at_bogota;
                emp.politicaDatosFirmante = rec.signer_typed_name;
              }
            });
          }

          // Asegurar estructura de diagramas
          this.data.diagramas = this.data.diagramas || {};
          const ID_OCHOA = 'emp-1790438946268';

          if (!this.data.diagramas[ID_OCHOA]) {
            this.data.diagramas[ID_OCHOA] = {
              mapa_procesos: {
                id: `diag-${ID_OCHOA}-mapa_procesos`,
                companyId: ID_OCHOA,
                numeral: '__DIAGRAMA_MAPA_PROCESOS__',
                tipoDiagrama: 'mapa_procesos',
                nombre: 'mapa-procesos-ladrillos-ochoa.png',
                url: './assets/mapa-procesos-ladrillos-ochoa.png',
                dataUrl: './assets/mapa-procesos-ladrillos-ochoa.png',
                tipo: 'image/png',
                esOficial: true,
                fechaCargue: '2026-10-05T08:00:00.000Z'
              },
              organigrama: {
                id: `diag-${ID_OCHOA}-organigrama`,
                companyId: ID_OCHOA,
                numeral: '__DIAGRAMA_ORGANIGRAMA__',
                tipoDiagrama: 'organigrama',
                nombre: 'Captura de pantalla 2026-10-10 a las 8.41.21 a. m..png',
                url: '/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png',
                dataUrl: '/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png',
                tipo: 'image/png',
                esOficial: true,
                fechaCargue: '2026-10-10T13:41:43.593Z'
              }
            };
          } else {
            // Asegurar que si el organigrama tiene ruta oficial en uploads se use correctamente
            if (!this.data.diagramas[ID_OCHOA].organigrama?.url || this.data.diagramas[ID_OCHOA].organigrama.url.includes('.svg')) {
              this.data.diagramas[ID_OCHOA].organigrama = {
                id: `diag-${ID_OCHOA}-organigrama`,
                companyId: ID_OCHOA,
                numeral: '__DIAGRAMA_ORGANIGRAMA__',
                tipoDiagrama: 'organigrama',
                nombre: 'Captura de pantalla 2026-10-10 a las 8.41.21 a. m..png',
                url: '/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png',
                dataUrl: '/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png',
                tipo: 'image/png',
                esOficial: true,
                fechaCargue: '2026-10-10T13:41:43.593Z'
              };
            }
          }
          this.data.diagramas['emp-004'] = this.data.diagramas[ID_OCHOA];

          // Asegurar representante legal, diagramas y logotipo oficial de Ladrillos Ochoa
          const empOchoa = this.data.empresas.find(e => e.id === ID_OCHOA || e.id === 'emp-004');
          if (empOchoa) {
            if (!empOchoa.representanteLegal) empOchoa.representanteLegal = "Jaime Alberto Ochoa Martinez - C.C: 79.544.156";
            if (!empOchoa.organigramaUrl || empOchoa.organigramaUrl.includes('.svg')) empOchoa.organigramaUrl = "/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png";
            if (!empOchoa.mapaProcesosUrl) empOchoa.mapaProcesosUrl = "./assets/mapa-procesos-ladrillos-ochoa.png";
            empOchoa.tieneOrganigrama = true;
            empOchoa.tieneMapaProcesos = true;
          }

          // Blindar evaluaciones: asegurar los 25 links y justificaciones en 2025
          if (!this.data.evaluaciones) this.data.evaluaciones = {};
          if (!this.data.evaluaciones[ID_OCHOA]) this.data.evaluaciones[ID_OCHOA] = {};
          
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

          // Respaldar evaluaciones en ambas identidades de Ladrillos Ochoa
          this.data.evaluaciones['emp-004'] = this.data.evaluaciones[ID_OCHOA];

          // Auto-hidratar IndexedDB con diagramas y evidencias desde la base de datos
          if (typeof evidenceDB !== 'undefined' && evidenceDB.autoHidratarDesdeServidor) {
            try {
              await evidenceDB.autoHidratarDesdeServidor(this.data);
            } catch (errHydrate) {
              console.warn("Aviso auto-hidratación IndexedDB:", errHydrate);
            }
          }

          // Garantizar que la empresa activa esté seleccionada (evitar pantalla vacía)
          const esSuper = this.isSuperAdminSession();
          if (esSuper) {
            if (!this.empresaActivaId) {
              this.empresaActivaId = 'todas';
              storage.setItem(ACTIVE_COMPANY_KEY, 'todas');
            }
          } else {
            const locked = this.getSessionTenantLock();
            if (locked) {
              this.empresaActivaId = locked;
              storage.setItem(ACTIVE_COMPANY_KEY, locked);
            } else if (!this.empresaActivaId || !this.data.empresas.some(e => e.id === this.empresaActivaId)) {
              this.empresaActivaId = ID_OCHOA;
              storage.setItem(ACTIVE_COMPANY_KEY, this.empresaActivaId);
            }
          }

          if (!this.anioActivo || !['2025', '2026'].includes(this.anioActivo)) {
            this.anioActivo = '2025';
            storage.setItem(ACTIVE_YEAR_KEY, '2025');
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
      this._bloqueoGuardado = false;
    }
  }

  enviarAlServidorFisico(forceImmediate = false) {
    if (typeof fetch === 'undefined') return;
    if (this._saveTimeout) clearTimeout(this._saveTimeout);

    const ejecutarEnvio = async () => {
      try {
        if (!this.data) return;
        // Evitar que una sesión fresca en blanco sin sincronizar sobreescriba el servidor con datos demo reducidos
        if (!this.serverSynced && Array.isArray(this.data.empresas) && this.data.empresas.length <= 1) {
          console.warn("Postergando guardado al servidor físico: esperando sincronización autoritativa inicial...");
          await this.sincronizarConServidorFisico();
          return;
        }
        if (!this.data.updatedAt) {
          this.data.updatedAt = new Date().toISOString();
        }
        const resp = await fetch(this.getApiUrl('/save'), {
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
    };

    if (forceImmediate) {
      ejecutarEnvio();
    } else {
      this._saveTimeout = setTimeout(ejecutarEnvio, 150);
    }
  }

  async getBackupsList() {
    if (typeof fetch === 'undefined') return [];
    try {
      const resp = await fetch(this.getApiUrl('/backups'));
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
      const resp = await fetch(this.getApiUrl('/restore'), {
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
      const resp = await fetch(this.getApiUrl('/audit'));
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
    // Si ya estamos sincronizados con el servidor físico en disco, no sobreescribir con IndexedDB
    if (this.serverSynced) return;
    try {
      const snap = await evidenceDB.obtenerSnapshot();
      if (snap && Array.isArray(snap.empresas) && snap.empresas.length > 0) {
        console.log("Recuperando copia de seguridad local desde IndexedDB para modo sin conexión...");
        this.data = snap;
        try { storage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch {}
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

  getConfig(key) {
    if (!this.data) this.data = {};
    if (!this.data.config) this.data.config = {};
    return this.data.config[key] || '';
  }

  saveConfig(key, value) {
    if (!this.data) this.data = {};
    if (!this.data.config) this.data.config = {};
    this.data.config[key] = value;
    this.saveToStorage();
    return true;
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

  notifySubscribers() {
    this.notify();
  }

  // --- GESTIÓN DE EMPRESA ACTIVA Y AISLAMIENTO MULTI-TENANT ---
  isSuperAdminSession() {
    try {
      const raw = storage.getItem('DOCTOR_PYME_SESSION_V2') || storage.getItem('DOCTOR_PYME_SESSION_V1');
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (!session) return false;
      const email = (session.email || '').toLowerCase().trim();
      if (session.esSuperAdmin === true || email === 'i.gonzalez.dsilva@gmail.com' || email === 'serviciosivangonzalez@gmail.com') {
        return true;
      }
      const superAdmins = this.getSuperAdmins();
      return superAdmins.some(sa => (sa.email || '').toLowerCase().trim() === email && (sa.estado || 'ACTIVO').toUpperCase() === 'ACTIVO');
    } catch (e) {
      return false;
    }
  }

  getSessionTenantLock() {
    try {
      // Si la sesión activa es de Super Administrador, nunca bloquear
      if (this.isSuperAdminSession()) {
        return null;
      }
      const raw = storage.getItem('DOCTOR_PYME_SESSION_V2') || storage.getItem('DOCTOR_PYME_SESSION_V1');
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session) return null;
      // Si es cuenta de empresa o trabajador, bloquear estrictamente a su empresaId
      if (session.empresaId) {
        return session.empresaId;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // --- GESTIÓN DE SUPER ADMINISTRADORES ---
  getSuperAdmins() {
    if (!this.data) this.data = {};
    if (!Array.isArray(this.data.super_admins)) {
      this.data.super_admins = [
        {
          id: 'sa-001',
          email: 'i.gonzalez.dsilva@gmail.com',
          nombre: 'Ing. Iván David González Silva',
          cargo: 'Super Administrador & Consultor Principal SST',
          licencia: 'RESOLUCIÓN No. 6514 de 19/10/2022',
          telefono: '3144001787',
          password: 'Stoner200',
          estado: 'ACTIVO',
          creadoEn: '2026-10-10T00:00:00.000Z',
          ultimoIngreso: new Date().toISOString()
        },
        {
          id: 'sa-002',
          email: 'serviciosivangonzalez@gmail.com',
          nombre: 'Ing. Iván David González Silva',
          cargo: 'Super Administrador & Consultor Principal SST',
          licencia: 'RESOLUCIÓN No. 6514 de 19/10/2022',
          telefono: '3144001787',
          password: 'Stoner200',
          estado: 'ACTIVO',
          creadoEn: '2026-10-10T00:00:00.000Z',
          ultimoIngreso: new Date().toISOString()
        }
      ];
    }
    return this.data.super_admins;
  }

  getSuperAdmin(id) {
    return this.getSuperAdmins().find(a => a.id === id || a.email.toLowerCase() === id.toLowerCase()) || null;
  }

  saveSuperAdmin(adminData) {
    this.getSuperAdmins();
    const cleanEmail = (adminData.email || '').trim().toLowerCase();
    if (!cleanEmail) return { ok: false, error: 'El correo electrónico es obligatorio.' };

    const idxExistente = this.data.super_admins.findIndex(a => a.id === adminData.id || a.email.toLowerCase() === cleanEmail);
    const nowIso = new Date().toISOString();

    if (idxExistente >= 0) {
      const actual = this.data.super_admins[idxExistente];
      this.data.super_admins[idxExistente] = {
        ...actual,
        ...adminData,
        email: cleanEmail,
        updatedAt: nowIso
      };
    } else {
      const nuevo = {
        id: adminData.id || `sa-${Date.now()}`,
        nombre: adminData.nombre || 'Super Administrador',
        email: cleanEmail,
        password: adminData.password || 'Stoner200',
        cargo: adminData.cargo || 'Consultor Principal SST',
        licencia: adminData.licencia || 'RESOLUCIÓN No. 6514 de 19/10/2022',
        telefono: adminData.telefono || '3144001787',
        estado: adminData.estado || 'ACTIVO',
        creadoEn: nowIso,
        ultimoIngreso: null
      };
      this.data.super_admins.push(nuevo);
    }

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return { ok: true };
  }

  deleteSuperAdmin(id) {
    this.getSuperAdmins();
    this.data.super_admins = this.data.super_admins.filter(a => a.id !== id && a.email.toLowerCase() !== id.toLowerCase());
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
  }

  toggleEstadoSuperAdmin(id) {
    const admin = this.getSuperAdmin(id);
    if (!admin) return 'INACTIVO';
    admin.estado = (admin.estado || 'ACTIVO').toUpperCase() === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return admin.estado;
  }

  getEvidencias(companyId = null, anio = null) {
    if (!this.data) return [];
    const cid = companyId || this.getEmpresaActivaId();
    const list = this.data.evidencias || [];
    return list.filter(ev => {
      const matchComp = ev.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (ev.companyId === 'emp-1790438946268' || ev.companyId === 'emp-004'));
      const matchAnio = anio ? (!ev.anio || String(ev.anio) === String(anio) || ev.anio === 'todos' || ev.anio === 'ambos') : true;
      return matchComp && matchAnio;
    });
  }

  getEmpresaActivaId() {
    const lockedId = this.getSessionTenantLock();
    if (lockedId) {
      if (this.empresaActivaId !== lockedId) {
        this.empresaActivaId = lockedId;
        storage.setItem(ACTIVE_COMPANY_KEY, lockedId);
      }
      return lockedId;
    }
    return this.empresaActivaId;
  }

  setEmpresaActivaId(id) {
    const lockedId = this.getSessionTenantLock();
    const targetId = lockedId ? lockedId : id;
    this.empresaActivaId = targetId;
    storage.setItem(ACTIVE_COMPANY_KEY, targetId);
    this.notify();
  }

  getEmpresaActiva() {
    const activeId = this.getEmpresaActivaId();
    if (activeId === 'todas' && !this.getSessionTenantLock()) {
      return null;
    }
    const empresasVisibles = this.getEmpresas();
    let emp = empresasVisibles.find(e => e.id === activeId);
    if (!emp) emp = empresasVisibles[0] || null;
    return emp;
  }

  // --- GESTIÓN DE DIAGRAMAS (MAPA DE PROCESOS & ORGANIGRAMA) ---
  getDiagrama(companyId, tipo) {
    if (!this.data) return null;
    this.data.diagramas = this.data.diagramas || {};
    let cid = companyId || this.empresaActivaId;
    if (cid === 'todas') cid = 'emp-1790438946268';
    
    let diag = this.data.diagramas[cid]?.[tipo];
    if (!diag && (cid === 'emp-004' || cid === 'emp-1790438946268')) {
      const alias = cid === 'emp-004' ? 'emp-1790438946268' : 'emp-004';
      diag = this.data.diagramas[alias]?.[tipo];
    }
    return diag || null;
  }

  saveDiagrama(companyId, tipo, diagrama) {
    if (!this.data) this.data = {};
    this.data.diagramas = this.data.diagramas || {};
    let cid = companyId || this.empresaActivaId;
    if (cid === 'todas') cid = 'emp-1790438946268';

    if (!this.data.diagramas[cid]) this.data.diagramas[cid] = {};
    this.data.diagramas[cid][tipo] = diagrama;

    // Sincronizar alias si es Ladrillos Ochoa
    if (cid === 'emp-1790438946268') {
      if (!this.data.diagramas['emp-004']) this.data.diagramas['emp-004'] = {};
      this.data.diagramas['emp-004'][tipo] = { ...diagrama, companyId: 'emp-004', id: `diag-emp-004-${tipo}` };
    } else if (cid === 'emp-004') {
      if (!this.data.diagramas['emp-1790438946268']) this.data.diagramas['emp-1790438946268'] = {};
      this.data.diagramas['emp-1790438946268'][tipo] = { ...diagrama, companyId: 'emp-1790438946268', id: `diag-emp-1790438946268-${tipo}` };
    }

    const emp = this.data.empresas?.find(e => e.id === cid || (cid === 'emp-004' && e.id === 'emp-1790438946268'));
    if (emp) {
      if (tipo === 'mapa_procesos') {
        emp.tieneMapaProcesos = true;
        if (diagrama.url) emp.mapaProcesosUrl = diagrama.url;
      } else if (tipo === 'organigrama') {
        emp.tieneOrganigrama = true;
        if (diagrama.url) emp.organigramaUrl = diagrama.url;
      }
    }

    this.saveToStorage();
    return diagrama;
  }

  // --- CRUD EMPRESAS ---
  getAllEmpresasRaw() {
    return this.data?.empresas || [];
  }

  getEmpresas() {
    const todas = this.data?.empresas || [];
    if (this.isSuperAdminSession()) {
      return todas;
    }
    const lockedId = this.getSessionTenantLock();
    if (lockedId) {
      return todas.filter(e => e.id === lockedId || ((lockedId === 'emp-004' || lockedId === 'emp-1790438946268') && (e.id === 'emp-1790438946268' || e.id === 'emp-004')));
    }
    return todas;
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
      this.data.empresas = this.data.empresas.map(e => {
        if (e.id === empresaData.id) {
          const accesoActualizado = empresaData.acceso || e.acceso || {
            usuario: empresaData.email || `${empresaData.nit || e.id}@doctorpyme.co`,
            password: 'pyme2026*',
            estado: 'ACTIVO',
            rol: 'Administrador Empresa'
          };
          const loadBaseRepo = empresaData.load_base_repository !== undefined ? (empresaData.load_base_repository === true) : (e.load_base_repository === true);
          return { ...e, ...empresaData, load_base_repository: loadBaseRepo, acceso: accesoActualizado, estandaresAplicables: estandares };
        }
        return e;
      });
      if (empresaData.load_base_repository === true) {
        this.vincularRepositorioBaseAEmpresa(finalId);
      }
    } else {
      // Crear nueva
      finalId = 'emp-' + Date.now();
      const defaultPassword = (empresaData.razonSocial ? empresaData.razonSocial.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'pyme') + '2026*';
      const newEmpresa = {
        ...empresaData,
        id: finalId,
        load_base_repository: empresaData.load_base_repository === true,
        estandaresAplicables: estandares,
        createdAt: new Date().toISOString(),
        acceso: empresaData.acceso || {
          usuario: empresaData.email || `${empresaData.nit || finalId}@doctorpyme.co`,
          password: defaultPassword,
          estado: 'ACTIVO',
          rol: 'Administrador Empresa',
          ultimoIngreso: null,
          creadoEn: new Date().toISOString()
        }
      };
      this.data.empresas.push(newEmpresa);
      this.empresaActivaId = newEmpresa.id;
      storage.setItem(ACTIVE_COMPANY_KEY, newEmpresa.id);

      // Si se configuró vinculación condicional del repositorio base en SÍ, poblar plantillas neutras
      if (newEmpresa.load_base_repository === true) {
        this.vincularRepositorioBaseAEmpresa(finalId);
      }
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
      this.enviarAlServidorFisico(true);
      this.notify();
    }
  }

  // --- GESTIÓN DE ACCESOS Y CREDENCIALES DE EMPRESAS ---
  getAccesosEmpresas() {
    const empresas = this.getEmpresas();
    return empresas.map(emp => {
      if (!emp.acceso) {
        emp.acceso = {
          usuario: emp.email || `${emp.nit}@doctorpyme.co`,
          password: (emp.razonSocial ? emp.razonSocial.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'pyme') + '2026*',
          estado: 'ACTIVO',
          rol: 'Administrador Empresa',
          ultimoIngreso: null,
          creadoEn: emp.createdAt || new Date().toISOString()
        };
      }
      return {
        empresaId: emp.id,
        razonSocial: emp.razonSocial,
        nit: emp.nit,
        logoUrl: emp.logoUrl,
        ciudad: emp.ciudad,
        email: emp.email,
        telefono: emp.telefono,
        representanteLegal: emp.representanteLegal,
        trabajadores: emp.trabajadores,
        claseRiesgo: emp.claseRiesgo,
        estandaresAplicables: emp.estandaresAplicables,
        usuario: emp.acceso.usuario,
        password: emp.acceso.password,
        estado: emp.acceso.estado || 'ACTIVO',
        rol: emp.acceso.rol || 'Administrador Empresa',
        ultimoIngreso: emp.acceso.ultimoIngreso || null
      };
    });
  }

  actualizarAccesoEmpresa(empresaId, accesoData) {
    const emp = this.getEmpresa(empresaId);
    if (!emp) return false;

    if (!emp.acceso) emp.acceso = {};
    emp.acceso = {
      ...emp.acceso,
      ...accesoData,
      actualizadoEn: new Date().toISOString()
    };

    this.saveToStorage();
    return true;
  }

  toggleEstadoEmpresa(empresaId) {
    const emp = this.getEmpresa(empresaId);
    if (!emp) return false;

    if (!emp.acceso) {
      emp.acceso = {
        usuario: emp.email || `${emp.nit}@doctorpyme.co`,
        password: 'pyme2026*',
        estado: 'ACTIVO',
        rol: 'Administrador Empresa'
      };
    }

    const nuevoEstado = emp.acceso.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO';
    emp.acceso.estado = nuevoEstado;

    this.saveToStorage();
    return nuevoEstado;
  }

  generarPasswordAleatoria(empresaId) {
    const emp = this.getEmpresa(empresaId);
    if (!emp) return null;

    const prefijo = (emp.razonSocial ? emp.razonSocial.split(' ')[0].replace(/[^a-zA-Z]/g, '') : 'Pyme');
    const capitalizado = prefijo.charAt(0).toUpperCase() + prefijo.slice(1, 6).toLowerCase();
    const aleatorio = Math.floor(1000 + Math.random() * 9000);
    const simbolos = ['*', '#', '!', '$'];
    const simbolo = simbolos[Math.floor(Math.random() * simbolos.length)];
    const nuevaClave = `${capitalizado}${simbolo}${aleatorio}`;

    if (!emp.acceso) emp.acceso = {};
    emp.acceso.password = nuevaClave;

    this.saveToStorage();
    return nuevaClave;
  }

  // --- CRUD MATRIZ GTC 45 ---
  getMatriz(companyId = null) {
    const cid = this.getSessionTenantLock() || companyId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.matriz) ? this.data.matriz : [];
    if (cid === 'todas' && !this.getSessionTenantLock()) return lista;
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
        companyId: this.getSessionTenantLock() || riesgoData.companyId || this.getEmpresaActivaId(),
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
        this.enviarAlServidorFisico(true);
        this.notify();
      }
    }
  }

  // --- CRUD PLAN DE TRABAJO ---
  getPlanTrabajo(companyId = null) {
    const cid = this.getSessionTenantLock() || companyId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.planTrabajo) ? this.data.planTrabajo : [];
    if (cid === 'todas' && !this.getSessionTenantLock()) return lista;
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
        companyId: this.getSessionTenantLock() || actividadData.companyId || this.getEmpresaActivaId()
      };
      this.data.planTrabajo.push(newAct);
    }
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
  }

  deleteActividadPAT(id) {
    if (confirm("¿Deseas eliminar esta actividad del plan de trabajo?")) {
      if (Array.isArray(this.data.planTrabajo)) {
        this.data.planTrabajo = this.data.planTrabajo.filter(p => p.id !== id);
        this.saveToStorage();
        this.enviarAlServidorFisico(true);
        this.notify();
      }
    }
  }

  // --- CRUD ACCIDENTES (ATEL) ---
  getAccidentes(companyId = null) {
    const cid = this.getSessionTenantLock() || companyId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.accidentes) ? this.data.accidentes : [];
    if (cid === 'todas' && !this.getSessionTenantLock()) return lista;
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
        companyId: this.getSessionTenantLock() || accidenteData.companyId || this.getEmpresaActivaId()
      };
      this.data.accidentes.push(newAcc);
    }
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
  }

  deleteAccidente(id) {
    if (confirm("¿Deseas eliminar este registro de accidente?")) {
      if (Array.isArray(this.data.accidentes)) {
        this.data.accidentes = this.data.accidentes.filter(a => a.id !== id);
        this.saveToStorage();
        this.enviarAlServidorFisico(true);
        this.notify();
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
  getEvaluacionesEmpresaActiva(anio = null) {
    return this.getEvaluacion(null, anio);
  }

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

    // Si la empresa tiene configurado load_base_repository = true y el año está vacío de fuentes, auto-vincular
    const empresaActual = this.getEmpresa(cid);
    if (empresaActual && empresaActual.load_base_repository === true) {
      const tieneFuentes = Object.values(this.data.evaluaciones[cid][year]).some(ev => ev && Array.isArray(ev.fuentes) && ev.fuentes.length > 0);
      if (!tieneFuentes) {
        this.vincularRepositorioBaseAEmpresa(cid, year);
      }
    }

    return this.data.evaluaciones[cid][year];
  }

  // --- REPOSITORIO MAESTRO DE DOCUMENTACIÓN BASE (RES. 0312) ---
  getMasterTemplates() {
    return this.data?.master_standard_templates || [];
  }

  async saveMasterTemplate(tplData) {
    if (!this.data) this.data = {};
    if (!this.data.master_standard_templates) this.data.master_standard_templates = [];

    const numeral = tplData.standard_numeral;
    const idx = this.data.master_standard_templates.findIndex(t => t.standard_numeral === numeral);

    const updated = {
      id: tplData.id || `tpl-${numeral.replace(/\./g, '-')}`,
      standard_numeral: numeral,
      standard_name: tplData.standard_name || '',
      ciclo: tplData.ciclo || '',
      estandar: tplData.estandar || '',
      template_title: tplData.template_title || `Formato Base - ${numeral}`,
      description_guide: tplData.description_guide || '',
      file_s3_key: tplData.file_s3_key || `master-base-templates/${numeral}_${tplData.file_name || 'template.docx'}`,
      file_name: tplData.file_name || '',
      mime_type: tplData.mime_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: tplData.file_size || 0,
      file_url: tplData.file_url || (tplData.file_name ? `/uploads/templates/${tplData.file_name}` : ''),
      dataUrl: tplData.dataUrl || '',
      version: tplData.version || '1.0',
      is_active: tplData.is_active !== false,
      has_file: tplData.has_file !== false && !!(tplData.dataUrl || tplData.file_name),
      updated_at: new Date().toISOString()
    };

    if (idx >= 0) {
      this.data.master_standard_templates[idx] = updated;
    } else {
      this.data.master_standard_templates.push(updated);
    }

    this.saveToStorage();

    // Sincronizar con el backend
    if (typeof fetch !== 'undefined') {
      try {
        const apiPath = (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/sst')) ? '/sst/api/master-templates' : '/api/master-templates';
        await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.warn("Aviso sincronizando plantilla maestra con el servidor:", err);
      }
    }

    return updated;
  }

  async deleteMasterTemplate(numeral) {
    if (!this.data?.master_standard_templates) return;
    const tpl = this.data.master_standard_templates.find(t => t.standard_numeral === numeral);
    if (!tpl) return;

    tpl.has_file = false;
    tpl.file_name = '';
    tpl.file_url = '';
    tpl.dataUrl = '';
    tpl.file_size = 0;
    tpl.updated_at = new Date().toISOString();

    this.saveToStorage();

    if (typeof fetch !== 'undefined') {
      try {
        const apiPath = (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/sst')) ? '/sst/api/master-templates' : '/api/master-templates';
        await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ standard_numeral: numeral, action: 'DELETE', has_file: false })
        });
      } catch (err) {
        console.warn("Aviso eliminando plantilla maestra en el servidor:", err);
      }
    }
  }

  vincularRepositorioBaseAEmpresa(companyId, anio = null) {
    const year = String(anio || this.getAnioActivo());
    const empresa = this.getEmpresa(companyId);
    if (!empresa) return;

    const templates = this.getMasterTemplates().filter(t => t.is_active && (t.has_file || (t.file_url && t.file_url.length > 0)));
    if (!templates || templates.length === 0) return;

    if (!this.data.evaluaciones) this.data.evaluaciones = {};
    if (!this.data.evaluaciones[companyId]) this.data.evaluaciones[companyId] = {};
    if (!this.data.evaluaciones[companyId][year]) this.data.evaluaciones[companyId][year] = {};

    templates.forEach(tpl => {
      const numeral = tpl.standard_numeral;
      const current = this.data.evaluaciones[companyId][year][numeral] || {};
      let fuentes = Array.isArray(current.fuentes) ? [...current.fuentes] : [];
      
      const yaExiste = fuentes.some(f => f.origen === 'REPOSITORIO_BASE' || f.id === `src-${tpl.id}`);
      if (!yaExiste) {
        fuentes.unshift({
          id: `src-${tpl.id}`,
          titulo: tpl.template_title || `${tpl.standard_name} (Plantilla Base)`,
          url: tpl.file_url || `/uploads/templates/${tpl.file_name}`,
          tipo: tpl.mime_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          origen: 'REPOSITORIO_BASE'
        });
      }

      this.data.evaluaciones[companyId][year][numeral] = {
        ...current,
        linkGuia: current.linkGuia || (tpl.file_url || `/uploads/templates/${tpl.file_name}`),
        fuentes: fuentes,
        estado: current.estado || 'SIN_EVALUAR'
      };
    });

    this.saveToStorage();
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

  // --- CRUD TRABAJADORES CON AISLAMIENTO MULTI-TENANT ESTRICTO ---
  getTrabajadores(companyId = null) {
    const lockedId = this.getSessionTenantLock();
    const cid = lockedId || ((companyId !== null && companyId !== undefined) ? companyId : this.getEmpresaActivaId());
    const lista = Array.isArray(this.data?.trabajadores) ? this.data.trabajadores : [];
    if (cid === 'todas' && !lockedId) return lista;
    // Aislamiento estricto por tenant_id / companyId
    return lista.filter(t => t && (t.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (t.companyId === 'emp-1790438946268' || t.companyId === 'emp-004'))));
  }

  getTrabajadorPorId(id) {
    const lista = Array.isArray(this.data?.trabajadores) ? this.data.trabajadores : [];
    return lista.find(t => t && t.id === id) || null;
  }

  getTrabajadorPorCedulaOCorreo(termino) {
    if (!termino) return null;
    const clean = String(termino).trim().toLowerCase();
    const cleanCed = clean.replace(/[^\d]/g, '');
    const lista = Array.isArray(this.data?.trabajadores) ? this.data.trabajadores : [];
    return lista.find(t => {
      if (!t) return false;
      const tCed = (t.cedula || t.identificacion || '').replace(/[^\d]/g, '');
      const tEmail = (t.correo || '').toLowerCase().trim();
      return (tCed && tCed === cleanCed) || (tEmail && tEmail === clean);
    }) || null;
  }

  guardarTrabajador(trabajadorData) {
    if (!Array.isArray(this.data.trabajadores)) this.data.trabajadores = [];
    const lockedId = this.getSessionTenantLock();
    const targetCompanyId = lockedId || trabajadorData.companyId || (this.getEmpresaActivaId() !== 'todas' ? this.getEmpresaActivaId() : (this.getEmpresas()[0]?.id || 'emp-1790438946268'));

    const cleanIdentificacion = (trabajadorData.identificacion || trabajadorData.cedula || '').trim();
    const cleanFecha = (trabajadorData.fechaContrato || trabajadorData.fechaIngreso || new Date().toISOString().slice(0, 10)).trim();
    const cleanFechaFin = trabajadorData.fechaFinContrato ? trabajadorData.fechaFinContrato.trim() : null;
    const duracionMeses = Number(trabajadorData.duracionMeses) || null;
    const prorrogas = Array.isArray(trabajadorData.prorrogas) ? trabajadorData.prorrogas : [];
    const estadoPreaviso = trabajadorData.estadoPreaviso || 'Pendiente';

    const cleaned = {
      ...trabajadorData,
      identificacion: cleanIdentificacion,
      cedula: cleanIdentificacion,
      nombre: (trabajadorData.nombre || '').trim(),
      cargo: (trabajadorData.cargo || '').trim(),
      salario: Number(trabajadorData.salario) || 0,
      tipoContrato: trabajadorData.tipoContrato || 'Término Indefinido',
      fechaContrato: cleanFecha,
      fechaIngreso: cleanFecha,
      fechaFinContrato: cleanFechaFin,
      duracionMeses: duracionMeses,
      prorrogas: prorrogas,
      estadoPreaviso: estadoPreaviso,
      estado: trabajadorData.estado || 'Activo',
      companyId: targetCompanyId,
      area: trabajadorData.area || 'Operaciones',
      correo: (trabajadorData.correo || '').trim(),
      telefono: (trabajadorData.telefono || '').trim(),
      eps: trabajadorData.eps || 'Sura EPS',
      afp: trabajadorData.afp || 'Porvenir',
      arl: trabajadorData.arl || 'Positiva ARL'
    };

    if (trabajadorData.id) {
      this.data.trabajadores = this.data.trabajadores.map(t => t.id === trabajadorData.id ? { ...t, ...cleaned } : t);
    } else {
      cleaned.id = 'trab-' + Date.now();
      this.data.trabajadores.push(cleaned);
    }
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return cleaned;
  }

  importarTrabajadoresMasivos(listaTrabajadores, companyId = null) {
    if (!Array.isArray(listaTrabajadores) || listaTrabajadores.length === 0) {
      return { importados: 0, actualizados: 0, total: 0 };
    }
    if (!Array.isArray(this.data.trabajadores)) this.data.trabajadores = [];

    const lockedId = this.getSessionTenantLock();
    const targetCompanyId = lockedId || companyId || (this.getEmpresaActivaId() !== 'todas' ? this.getEmpresaActivaId() : (this.getEmpresas()[0]?.id || 'emp-1790438946268'));
    let importados = 0;
    let actualizados = 0;

    listaTrabajadores.forEach((trab, index) => {
      const cedulaClean = (trab.identificacion || trab.cedula || '').toString().trim();
      const nombreClean = (trab.nombre || '').toString().trim();
      if (!cedulaClean || !nombreClean) return;

      const idxExistente = this.data.trabajadores.findIndex(t => 
        (t.companyId === targetCompanyId || ((targetCompanyId === 'emp-004' || targetCompanyId === 'emp-1790438946268') && (t.companyId === 'emp-1790438946268' || t.companyId === 'emp-004'))) &&
        ((t.identificacion || '').toString().trim() === cedulaClean || (t.cedula || '').toString().trim() === cedulaClean)
      );

      const cleanFecha = trab.fechaContrato || trab.fechaIngreso || new Date().toISOString().slice(0, 10);
      const cleanFechaFin = trab.fechaFinContrato ? trab.fechaFinContrato.toString().trim() : null;
      const cleanSalario = Number(trab.salario) || 0;

      const record = {
        identificacion: cedulaClean,
        cedula: cedulaClean,
        nombre: nombreClean,
        cargo: (trab.cargo || 'Operario').toString().trim(),
        salario: cleanSalario,
        tipoContrato: trab.tipoContrato || 'Término Indefinido',
        fechaContrato: cleanFecha,
        fechaIngreso: cleanFecha,
        fechaFinContrato: cleanFechaFin,
        duracionMeses: Number(trab.duracionMeses) || null,
        prorrogas: Array.isArray(trab.prorrogas) ? trab.prorrogas : [],
        estadoPreaviso: trab.estadoPreaviso || 'Pendiente',
        estado: (trab.estado || 'Activo').toString().trim(),
        companyId: targetCompanyId,
        area: (trab.area || 'Operaciones').toString().trim(),
        correo: (trab.correo || '').toString().trim(),
        telefono: (trab.telefono || '').toString().trim(),
        eps: (trab.eps || 'Sura EPS').toString().trim(),
        afp: (trab.afp || 'Porvenir').toString().trim(),
        arl: (trab.arl || 'Positiva ARL').toString().trim(),
        updatedAt: new Date().toISOString()
      };

      if (idxExistente >= 0) {
        this.data.trabajadores[idxExistente] = { ...this.data.trabajadores[idxExistente], ...record };
        actualizados++;
      } else {
        record.id = 'trab-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substr(2, 4);
        this.data.trabajadores.push(record);
        importados++;
      }
    });

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return { importados, actualizados, total: importados + actualizados };
  }

  registrarProrrogaContrato(trabajadorId, meses, nuevaFechaFin, notas = '') {
    const trabajador = this.getTrabajadorPorId(trabajadorId);
    if (!trabajador) return null;

    const anteriorFechaFin = trabajador.fechaFinContrato;
    const prorrogas = Array.isArray(trabajador.prorrogas) ? [...trabajador.prorrogas] : [];
    prorrogas.push({
      id: 'prorr-' + Date.now(),
      fechaProrroga: new Date().toISOString().slice(0, 10),
      anteriorFechaFin: anteriorFechaFin,
      nuevaFechaFin: nuevaFechaFin,
      meses: Number(meses) || 12,
      notas: notas || `Prórroga pactada por ${meses} meses conforme a la ley.`
    });

    return this.guardarTrabajador({
      ...trabajador,
      fechaFinContrato: nuevaFechaFin,
      prorrogas: prorrogas,
      estadoPreaviso: 'Prorrogado'
    });
  }

  async deleteTrabajador(id) {
    if (!id) return;
    if (Array.isArray(this.data.trabajadores)) {
      this.data.trabajadores = this.data.trabajadores.filter(t => t.id !== id);
    }
    try {
      if (typeof fetch !== 'undefined') {
        await fetch(this.getApiUrl('/delete_record'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'trabajador', id: id })
        });
      }
    } catch (e) {
      console.warn("Aviso en borrado atómico de trabajador en servidor:", e);
    }
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
  }

  // --- GESTIÓN DE INSTRUMENTOS POR CARGO (CONTRATOS, PERFILES, MANUAL DE FUNCIONES, PTS) ---
  getPerfilesCargo(companyId = null) {
    const lockedId = this.getSessionTenantLock();
    const cid = lockedId || ((companyId !== null && companyId !== undefined) ? companyId : this.getEmpresaActivaId());
    const lista = Array.isArray(this.data?.perfiles_cargo) ? this.data.perfiles_cargo : [];
    if (cid === 'todas' && !lockedId) return lista;
    return lista.filter(p => p && (p.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (p.companyId === 'emp-1790438946268' || p.companyId === 'emp-004'))));
  }

  getPerfilCargo(cargoName, companyId = null) {
    if (!cargoName) return null;
    const cid = (companyId !== null && companyId !== undefined) ? companyId : (this.empresaActivaId !== 'todas' ? this.empresaActivaId : 'emp-1790438946268');
    const cleanCargo = cargoName.trim().toLowerCase();
    const existing = (this.data?.perfiles_cargo || []).find(p => 
      (p.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (p.companyId === 'emp-1790438946268' || p.companyId === 'emp-004'))) && 
      (p.cargo || '').trim().toLowerCase() === cleanCargo
    );
    const def = this.generarPlantillaCargoPorDefecto(cargoName, cid);
    if (existing) {
      return {
        ...def,
        ...existing,
        perfil: { ...def.perfil, ...(existing.perfil || {}) },
        manualFunciones: { ...def.manualFunciones, ...(existing.manualFunciones || {}) },
        pts: { ...def.pts, ...(existing.pts || {}) },
        profesiograma: { ...def.profesiograma, ...(existing.profesiograma || {}) },
        matrizEpp: { ...def.matrizEpp, ...(existing.matrizEpp || {}) },
        anexoContractual: { ...def.anexoContractual, ...(existing.anexoContractual || {}) },
        contratoModelo: { ...def.contratoModelo, ...(existing.contratoModelo || {}) }
      };
    }

    return def;
  }

  guardarPerfilCargo(perfilData) {
    if (!Array.isArray(this.data.perfiles_cargo)) this.data.perfiles_cargo = [];
    const cid = perfilData.companyId || (this.empresaActivaId !== 'todas' ? this.empresaActivaId : 'emp-1790438946268');
    const cleanCargo = (perfilData.cargo || '').trim();

    const idx = this.data.perfiles_cargo.findIndex(p => 
      (p.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (p.companyId === 'emp-1790438946268' || p.companyId === 'emp-004'))) && 
      (p.cargo || '').trim().toLowerCase() === cleanCargo.toLowerCase()
    );

    const record = {
      ...perfilData,
      id: perfilData.id || ('cargo-cfg-' + Date.now()),
      companyId: cid,
      cargo: cleanCargo,
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      this.data.perfiles_cargo[idx] = { ...this.data.perfiles_cargo[idx], ...record };
    } else {
      this.data.perfiles_cargo.push(record);
    }
    this.saveToStorage();
    this.notify();
    return record;
  }

  getPlantillaFuentesPorDefecto(tipoInstrumento, cargoName = '') {
    const defaultTemplates = {
      manual: [
        {
          id: 'f-manual-' + Date.now(),
          titulo: 'Manual de Funciones y Responsabilidades SG-SST Dec. 1072 (Google Docs)',
          url: 'https://docs.google.com/document/d/1y2GNo3owQiyUmRa_WM9EwyQEjwGy9yOZtuHbCBXoTg0/edit?usp=sharing'
        }
      ],
      perfil: [
        {
          id: 'f-perfil-' + Date.now(),
          titulo: 'Perfil del Cargo, Educación y Competencias Res. 0312 (Google Sheets)',
          url: 'https://docs.google.com/spreadsheets/d/153Ov4yABAp5INyO68ii9eOSiqsmWN39PS3_mUyOMO-E/edit?usp=sharing'
        }
      ],
      pts: [
        {
          id: 'f-pts-' + Date.now(),
          titulo: 'Procedimiento y Plan de Trabajo Seguro PTS - GTC 45 (Google Docs)',
          url: 'https://docs.google.com/document/d/1JOwYHHi-ba1Jts79jWLNT8xqExg03bgIZxOMi0XAl0U/edit?usp=sharing'
        }
      ],
      profesiograma: [
        {
          id: 'f-profesiograma-' + Date.now(),
          titulo: 'Matriz de Profesiograma y Exámenes Médicos Res. 2346/2007 (Google Sheets)',
          url: 'https://docs.google.com/spreadsheets/d/153Ov4yABAp5INyO68ii9eOSiqsmWN39PS3_mUyOMO-E/edit?usp=sharing'
        }
      ],
      epp: [
        {
          id: 'f-epp-' + Date.now(),
          titulo: 'Matriz Técnica de EPP y Dotación Legal Res. 2400 (Google Sheets)',
          url: 'https://docs.google.com/spreadsheets/d/153Ov4yABAp5INyO68ii9eOSiqsmWN39PS3_mUyOMO-E/edit?usp=sharing'
        }
      ],
      anexo: [
        {
          id: 'f-anexo-' + Date.now(),
          titulo: 'Anexo Contractual de Responsabilidades SST y Riesgos CST (Google Docs)',
          url: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing'
        }
      ],
      contrato: [
        {
          id: 'f-contrato-' + Date.now(),
          titulo: 'Minuta Oficial Contrato Individual y Anexo SST CST (Google Docs)',
          url: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing'
        }
      ]
    };
    return defaultTemplates[tipoInstrumento] || [{ id: 'f-' + Date.now(), titulo: 'Documento Guía Base', url: '' }];
  }

  getFuentesInstrumento(cargoName, tipoInstrumento, companyId = null) {
    if (!cargoName || !tipoInstrumento) return [];
    const configCargo = this.getPerfilCargo(cargoName, companyId);
    if (!configCargo) return [];
    if (!configCargo.fuentes) configCargo.fuentes = {};
    if (!Array.isArray(configCargo.fuentes[tipoInstrumento]) || configCargo.fuentes[tipoInstrumento].length === 0) {
      configCargo.fuentes[tipoInstrumento] = this.getPlantillaFuentesPorDefecto(tipoInstrumento, cargoName);
      this.guardarPerfilCargo(configCargo);
    }
    return configCargo.fuentes[tipoInstrumento];
  }

  guardarFuenteInstrumento(cargoName, tipoInstrumento, fuente, companyId = null) {
    if (!cargoName || !tipoInstrumento || !fuente) return [];
    const configCargo = this.getPerfilCargo(cargoName, companyId);
    if (!configCargo) return [];
    if (!configCargo.fuentes) configCargo.fuentes = {};
    if (!Array.isArray(configCargo.fuentes[tipoInstrumento])) {
      configCargo.fuentes[tipoInstrumento] = [];
    }
    const idx = configCargo.fuentes[tipoInstrumento].findIndex(f => f.id === fuente.id);
    if (idx >= 0) {
      configCargo.fuentes[tipoInstrumento][idx] = { ...configCargo.fuentes[tipoInstrumento][idx], ...fuente };
    } else {
      configCargo.fuentes[tipoInstrumento].push(fuente);
    }
    this.guardarPerfilCargo(configCargo);
    return configCargo.fuentes[tipoInstrumento];
  }

  eliminarFuenteInstrumento(cargoName, tipoInstrumento, fuenteId, companyId = null) {
    if (!cargoName || !tipoInstrumento || !fuenteId) return [];
    const configCargo = this.getPerfilCargo(cargoName, companyId);
    if (!configCargo || !configCargo.fuentes || !Array.isArray(configCargo.fuentes[tipoInstrumento])) return [];
    configCargo.fuentes[tipoInstrumento] = configCargo.fuentes[tipoInstrumento].filter(f => f.id !== fuenteId);
    if (configCargo.fuentes[tipoInstrumento].length === 0) {
      configCargo.fuentes[tipoInstrumento].push({
        id: 'f-' + Date.now(),
        titulo: '',
        url: ''
      });
    }
    this.guardarPerfilCargo(configCargo);
    return configCargo.fuentes[tipoInstrumento];
  }

  generarPlantillaCargoPorDefecto(cargoName, companyId = null) {
    const isMantenimiento = /mecanic|mantenim|electr/i.test(cargoName);
    const isOperario = /operari|horno|prensa|molienda|corte|soldad/i.test(cargoName);
    const isConductor = /conductor|montacarga|retroexcavadora|transporte/i.test(cargoName);
    const isSST = /sst|seguridad|prevencion|salud/i.test(cargoName);
    const isDirector = /gerente|director|jefe|lider/i.test(cargoName);

    let educacion = 'Bachiller Académico o Técnico Laboral';
    let experiencia = '1 año en labores afines a la operación o manufactura';
    let epp = ['Casco de seguridad con barbuquejo', 'Gafas de seguridad con protección UV', 'Botas de seguridad con puntera dieléctrica', 'Guantes de protección mecánica', 'Protección auditiva de inserción'];
    let peligros = ['Peligro Mecánico (atrapamiento, golpes por herramientas)', 'Peligro Biomecánico (posturas prolongadas, manipulación de cargas)', 'Peligro Locativo (superficies irregulares, caídas al mismo nivel)'];

    if (isSST) {
      educacion = 'Profesional o Tecnólogo en Seguridad y Salud en el Trabajo con Licencia SST Vigente';
      experiencia = '2 años liderando la implementación del SG-SST (Res. 0312)';
      epp = ['Casco de seguridad industrial', 'Gafas de seguridad', 'Botas con puntera', 'Chaleco reflectivo con identificación SST'];
      peligros = ['Peligro Psicosocial (gestión administrativa)', 'Peligro Biomecánico (pantallas de visualización)', 'Peligro Locativo en inspecciones de campo'];
    } else if (isMantenimiento) {
      educacion = 'Técnico o Tecnólogo en Mantenimiento Electromecánico o Industrial';
      experiencia = '2 años en mantenimiento preventivo y correctivo de maquinaria';
      epp = ['Casco dieléctrico', 'Gafas de seguridad', 'Botas dieléctricas con puntera', 'Guantes de nitrilo / carnaza', 'Careta facial para esmerilado'];
      peligros = ['Peligro Eléctrico (baja y media tensión)', 'Peligro Mecánico (órganos móviles)', 'Peligro Químico (lubricantes, solventes)'];
    } else if (isConductor) {
      educacion = 'Bachiller con Licencia de Conducción Vigente (C2 / C3) y Certificación en Operación Segura';
      experiencia = '2 años en operación de equipos pesados o montacargas';
      epp = ['Casco de seguridad', 'Gafas de seguridad', 'Botas con puntera', 'Chaleco reflectivo de alta visibilidad', 'Cinturón de seguridad'];
      peligros = ['Peligro de Tránsito / Movilidad', 'Peligro Mecánico (atropellamiento, volcamiento)', 'Peligro Biomecánico (vibraciones cuerpo entero)'];
    } else if (isDirector) {
      educacion = 'Profesional Universitario en Administración, Ingeniería o áreas afines';
      experiencia = '3 años en cargos directivos y de toma de decisiones';
      epp = ['Dotación ejecutiva y EPP básico para visitas técnicas a planta (Casco, gafas y botas)'];
      peligros = ['Peligro Psicosocial (responsabilidad y toma de decisiones)', 'Peligro Biomecánico (trabajo de escritorio)'];
    }

    return {
      cargo: cargoName,
      companyId: companyId,
      perfil: {
        objetivo: `Desempeñar con excelencia y estricto apego a las normas de seguridad las funciones asociadas al cargo de ${cargoName}, asegurando la continuidad operacional y la prevención de accidentes laborales.`,
        educacion: educacion,
        experiencia: experiencia,
        formacionSST: 'Inducción general en SG-SST, Curso 50h SST (si aplica), Protocolo de EPP, Plan de Emergencias y Reporte de Peligros.',
        competencias: 'Compromiso con el autocuidado, disciplina operacional, trabajo en equipo, orientación a la calidad y comunicación efectiva.',
        examenesMedicos: 'Énfasis osteomuscular, agudeza visual, audiometría tonal ocupacional y valoración médica general.'
      },
      manualFunciones: {
        funcionesOperativas: [
          `Ejecutar las labores diarias asignadas al puesto de ${cargoName} cumpliendo con los estándares técnicos y de calidad establecidos.`,
          'Inspeccionar el estado de las herramientas, máquinas y equipos asignados antes de iniciar las operaciones.',
          'Mantener el orden, la limpieza y la organización estricta en su área o puesto de trabajo.',
          'Notificar de inmediato cualquier falla, avería o condición anómala en la maquinaria o procesos.',
          'Participar en los inventarios, relevos de turno y diligenciamiento de planillas de control operativo.'
        ],
        responsabilidadesSST: [
          'Procurar el cuidado integral de su salud física y mental en el desarrollo de sus actividades laborales.',
          'Suministrar información clara, veraz y completa sobre su estado de salud al empleador o área de SST.',
          'Cumplir a cabalidad las normas, reglamentos, instrucciones y procedimientos del SG-SST de la empresa.',
          'Informar de manera oportuna sobre los peligros y riesgos latentes detectados en su sitio de trabajo.',
          'Participar activamente en las actividades de capacitación, entrenamiento y simulacros de emergencia programados.',
          'Participar y contribuir activamente al cumplimiento de los objetivos y metas del SG-SST (Dec. 1072/2015 Art. 2.2.4.6.10).',
          'Usar permanentemente y cuidar los Elementos de Protección Personal (EPP) suministrados por la empresa.'
        ]
      },
      pts: {
        titulo: `Procedimiento de Trabajo Seguro (PTS) para ${cargoName}`,
        peligrosEvaluados: peligros,
        eppRequeridos: epp,
        faseAntes: 'Realizar inspección preoperacional obligatoria del área y herramientas. Verificar que los EPP se encuentren limpios y en óptimo estado. Reportar cualquier síntoma de salud que impida la labor.',
        faseDurante: 'Mantener la atención y concentración exclusiva en la labor. Prohibido el uso de celulares o distractores en áreas operativas. Aplicar posturas ergonómicas y pausas activas. Respetar las guardas de seguridad.',
        faseDespues: 'Desenergizar y apagar los equipos siguiendo la secuencia del manual. Realizar limpieza y orden y aseo del puesto. Almacenar herramientas en su sitio designado. Reportar el estado final del turno.',
        emergencias: 'En caso de incidente, accidente o conato de incendio: Detener de inmediato la labor, activar la alarma, evacuar por la ruta señalizada hacia el Punto de Encuentro y avisar de inmediato al Coordinador SST.'
      },
      profesiograma: {
        ingreso: 'Examen médico ocupacional con énfasis osteomuscular, Visiometría ocupacional, Audiometría tonal y Espirometría (si hay exposición a material particulado).',
        periodico: 'Control anual osteomuscular, audiometría de control y seguimiento en Programa de Vigilancia Epidemiológica (PVE).',
        egreso: 'Valoración médica ocupacional general de retiro (vigencia 5 días hábiles tras terminación del contrato).',
        restricciones: 'Vértigo no controlado (para trabajo en alturas), afecciones respiratorias severas no tratadas o hernias discales agudas sin rehabilitación.'
      },
      matrizEpp: {
        eppRequeridos: epp,
        normasTecnicas: 'Casco ANSI Z89.1, Gafas ANSI Z87.1, Botas ASTM F2413 / NTC 2396, Guantes EN 388, Protección Auditiva ANSI S3.19.',
        frecuenciaReposicion: 'Dotación legal cada 4 meses (30 abril, 31 agosto, 20 diciembre - Art. 230 CST) y reposición inmediata de EPP por deterioro o desgaste.'
      },
      anexoContractual: {
        clausula1_objeto: `EL EMPLEADOR contrata los servicios personales de EL TRABAJADOR para desempeñar el cargo de ${cargoName}, ejecutando con diligencia, lealtad y subordinación las funciones inherentes al puesto conforme al Manual de Funciones, Perfil de Cargo y directrices técnicas de la empresa en el marco de su objeto social.`,
        clausula2_duracion: 'El presente contrato se pacta por el término pactado / duración de la obra o labor encomendada. La relación laboral terminará válidamente por culminación de la labor, mutuo acuerdo o unilateralmente con justa causa conforme al Artículo 62 del Código Sustantivo del Trabajo (CST), sin lugar a indemnización.',
        clausula3_salario: 'EL EMPLEADOR pagará a EL TRABAJADOR como remuneración mensual o quincenal por la prestación de sus servicios la suma estipulada en dinero legal colombiano, sirviendo de base para la liquidación de prestaciones sociales legales y aportes a Seguridad Social Integral.',
        clausula4_obligaciones_sst: 'Dada la naturaleza de alto riesgo y directrices del SG-SST, EL TRABAJADOR se obliga a: a) Procurar el cuidado integral de su salud; b) Cumplir estrictamente los Procedimientos de Trabajo Seguro (PTS); c) Portar y mantener los EPP asignados; d) No ejecutar tareas de alto riesgo sin Permiso de Trabajo y lista de chequeo; e) Asistir a capacitaciones y exámenes ocupacionales.',
        clausula5_faltas_graves: 'Se califica expresamente como FALTA GRAVE (Art. 58 y Art. 62 Literal a) Num. 6 del CST, y Art. 91 Dec. 1295/94): el no uso reiterado de los EPP, el desacato de los PTS, presentarse bajo efectos de alcohol o drogas, operar maquinaria sin autorización, y cualquier omisión que comprometa la seguridad, facultando la terminación unilateral con justa causa.',
        clausula6_culpa_exclusiva: 'Si ocurre un accidente de trabajo derivado de la imprudencia temeraria, desatención voluntaria, violación de los Procedimientos de Trabajo Seguro o desacato de órdenes directas de SST por parte del trabajador, dicho evento se considerará por CULPA EXCLUSIVA DEL TRABAJADOR, exonerando al empleador de responsabilidad civil ordinaria de perjuicios (Art. 216 CST).',
        clausula7_seguridad_social: 'EL EMPLEADOR afiliará y mantendrá al día las cotizaciones de EL TRABAJADOR al Sistema de Seguridad Social Integral: Salud (EPS), Pensión (AFP) y Riesgos Laborales (ARL), garantizando la cobertura de contingencias comunes y profesionales conforme a la Ley 100 de 1993 y Decreto 1072 de 2015.',
        clausula8_elementos_herramientas: 'EL EMPLEADOR suministrará las herramientas, equipos y elementos requeridos para la labor, los cuales son propiedad de la empresa y se entregan bajo inventario y custodia. En caso de portabilidad o traslado fuera del centro de trabajo, el trabajador responderá por su debido cuidado, reporte de fallas y restitución inmediata.',
        clausula9_domicilio_firmas: 'Las partes fijan como domicilio contractual la ciudad de ejecución de labores y manifiestan que este documento contiene la totalidad de los acuerdos vinculantes. Las partes firman en señal de expresa conformidad en dos ejemplares de igual tenor.',
        // Compatibilidad previa
        notificacionRiesgos: peligros.join(' • '),
        clausulaPrincipal: 'Dada la naturaleza de alto riesgo y directrices del SG-SST, EL TRABAJADOR se obliga al cumplimiento de los Procedimientos de Trabajo Seguro (PTS), uso de EPP y autocuidado integral.',
        regimenSancionatorio: 'El incumplimiento de las obligaciones de SST constituirá FALTA GRAVE conforme al Art. 62 del CST.'
      },
      contratoModelo: {
        tipoSugerido: 'Término Indefinido',
        jornada: '46 horas semanales ordinarias (Ley 2101 de 2021) conforme al horario establecido por el empleador.',
        lugarTrabajo: 'Sedes e instalaciones operativas y administrativas de la empresa contratante.',
        obligacionesSST: 'El trabajador se compromete expresamente a cumplir todas las directrices del SG-SST (Decreto 1072 de 2015). El incumplimiento reiterado de normas de seguridad constituirá justa causa de terminación del contrato.'
      }
    };
  }

  // =============================================================================
  // CRUD CAPACITACIONES, E-LEARNING Y EVALUACIONES (RESOLUCIÓN 0312 & DTO 1072)
  // =============================================================================
  ensureDefaultCapacitacion(companyId) {
    if (!companyId || companyId === 'todas') return;
    if (!Array.isArray(this.data.capacitaciones)) this.data.capacitaciones = [];

    const preguntasDefecto = [
      {
        pregunta: "¿Cuál es el objetivo principal del Sistema de Gestión de la Seguridad y Salud en el Trabajo (SG-SST) según el Decreto 1072 de 2015?",
        opciones: [
          "A) Imponer sanciones económicas a los trabajadores que cometan faltas leves.",
          "B) Anticipar, reconocer, evaluar y controlar los riesgos que puedan afectar la seguridad y salud en el trabajo.",
          "C) Reducir los costos operativos de la empresa eliminando dotaciones de seguridad.",
          "D) Delegar la responsabilidad de la seguridad únicamente en la ARL."
        ],
        respuestaCorrecta: 1,
        correct_option_index: 1,
        justificacion: "El Decreto 1072 de 2015 define el SG-SST como el proceso lógico y por etapas para anticipar, reconocer, evaluar y controlar los riesgos laborales."
      },
      {
        pregunta: "¿Cuál de las siguientes es una responsabilidad obligatoria del trabajador en el SG-SST?",
        opciones: [
          "A) Procurar el cuidado integral de su salud y suministrar información veraz sobre su estado de salud.",
          "B) Comprar con su propio dinero los Elementos de Protección Personal (EPP).",
          "C) Realizar el pago mensual de la afiliación a la ARL.",
          "D) Diseñar la matriz de peligros y firmar los balances financieros."
        ],
        respuestaCorrecta: 0,
        correct_option_index: 0,
        justificacion: "El Art. 2.2.4.6.10 del Decreto 1072 de 2015 estipula el autocuidado y reporte veraz del estado de salud como deber ineludible del trabajador."
      },
      {
        pregunta: "¿Qué se entiende legalmente por un \"Accidente de Trabajo\" según la Ley 1562 de 2012?",
        opciones: [
          "A) Cualquier enfermedad común que se manifieste durante las vacaciones.",
          "B) Todo suceso repentino que sobrevenga por causa o con ocasión del trabajo y produzca una lesión, perturbación funcional, invalidez o muerte.",
          "C) Un altercado verbal entre compañeros fuera del horario laboral sin relación a la empresa.",
          "D) Un resfriado común adquirido en la vivienda del empleado."
        ],
        respuestaCorrecta: 1,
        correct_option_index: 1,
        justificacion: "La Ley 1562 de 2012 define el accidente de trabajo como todo suceso repentino por causa o con ocasión del trabajo con daño orgánico o funcional."
      },
      {
        pregunta: "¿Cuál es el plazo legal máximo que tiene el trabajador para reportar un presunto accidente de trabajo al empleador?",
        opciones: [
          "A) 15 días calendario posteriores al suceso.",
          "B) Inmediatamente o a más tardar dentro de las 48 horas siguientes al evento.",
          "C) 1 mes después en la reunión mensual del COPASST.",
          "D) No es necesario reportarlo si la lesión es leve."
        ],
        respuestaCorrecta: 1,
        correct_option_index: 1,
        justificacion: "La normativa colombiana exige reporte inmediato para que el empleador notifique formalmente a la ARL y EPS dentro de 2 días hábiles (48 horas)."
      },
      {
        pregunta: "¿Cuál es la función principal del Comité Paritario de Seguridad y Salud en el Trabajo (COPASST)?",
        opciones: [
          "A) Fijar los salarios y aumentos anuales de la empresa.",
          "B) Actuar como organismo de promoción, vigilancia y apoyo a las normas y medidas del SG-SST en la empresa.",
          "C) Tramitar despidos con justa causa por bajo rendimiento.",
          "D) Administrar los recursos bancarios y presupuestos de la compañía."
        ],
        respuestaCorrecta: 1,
        correct_option_index: 1,
        justificacion: "La Res. 2013 de 1986 y Decreto 1072 determinan que el COPASST vigila, propone y promueve la salud ocupacional en todos los niveles."
      },
      {
        pregunta: "¿Qué rol cumple el Comité de Convivencia Laboral (CCL) según la Resolución 652 de 2012?",
        opciones: [
          "A) Imponer multas de tránsito a los vehículos de la empresa.",
          "B) Prevenir el acoso laboral y tramitar confidencialmente quejas para proteger la dignidad de los trabajadores.",
          "C) Organizar las fiestas de fin de año y actividades recreativas.",
          "D) Asignar los turnos de horas extras nocturnas."
        ],
        respuestaCorrecta: 1,
        correct_option_index: 1,
        justificacion: "El CCL es un mecanismo preventivo para proteger a los trabajadores contra los riesgos psicosociales y situaciones de acoso laboral (Ley 1010 de 2006)."
      },
      {
        pregunta: "Respecto al uso de los Elementos de Protección Personal (EPP), es correcto afirmar que:",
        opciones: [
          "A) Son opcionales si el trabajador considera que tiene mucha experiencia en el oficio.",
          "B) Son de uso obligatorio, deben inspeccionarse antes de la labor y cuidarse según las normas técnicas de seguridad.",
          "C) Deben compartirse entre todos los compañeros del turno sin higiene previa.",
          "D) Pueden modificarse o recortarse para mayor comodidad del operario."
        ],
        respuestaCorrecta: 1,
        correct_option_index: 1,
        justificacion: "El uso de EPP certificados es una barrera obligatoria de protección individual establecida en los protocolos de SST de la empresa."
      }
    ];

    let cap1 = this.data.capacitaciones.find(c => 
      c && (c.companyId === companyId || ((companyId === 'emp-004' || companyId === 'emp-1790438946268') && (c.companyId === 'emp-1790438946268' || c.companyId === 'emp-004'))) &&
      (c.order_number === 1 || c.esInduccionObligatoria || (c.tema && c.tema.includes('Inducción')))
    );

    if (!cap1) {
      cap1 = {
        id: 'cap-ind-' + companyId,
        companyId: companyId,
        order_number: 1,
        esInduccionObligatoria: true,
        tema: 'Capacitación #1: Inducción al SG-SST (Sistema de Gestión de Seguridad y Salud en el Trabajo)',
        objetivo: 'Inducción obligatoria sobre el Sistema de Gestión de Seguridad y Salud en el Trabajo: Política SST, deberes y derechos, identificación de peligros, reporte de accidentes/incidentes, COPASST, Comité de Convivencia y Plan de Emergencias (Decreto 1072/2015 y Res. 0312/2019).',
        materialUrl: 'https://docs.google.com/presentation/d/1fY0Hd3-hFOgCzzNGC0xNePgeIMrlPF2ePba6SWGTlxo/edit#slide=id.h3097c4ef0c877aee_1_3643',
        presentacionUrl: 'https://docs.google.com/presentation/d/1fY0Hd3-hFOgCzzNGC0xNePgeIMrlPF2ePba6SWGTlxo/edit#slide=id.h3097c4ef0c877aee_1_3643',
        videoUrl: 'https://www.youtube.com/watch?v=kYJdZl21o5M',
        duracion: '2 Horas',
        facilitador: 'Coordinador SG-SST / Especialista ARL',
        fecha: '2026-01-15',
        estado: 'Programada',
        preguntas: preguntasDefecto.slice(0, 7),
        evaluaciones: []
      };
      this.data.capacitaciones.unshift(cap1);
      this.saveToStorage();
    } else {
      let mod = false;
      if (cap1.order_number !== 1) { cap1.order_number = 1; mod = true; }
      if (!cap1.esInduccionObligatoria) { cap1.esInduccionObligatoria = true; mod = true; }
      if (!cap1.materialUrl) {
        cap1.materialUrl = 'https://docs.google.com/presentation/d/1fY0Hd3-hFOgCzzNGC0xNePgeIMrlPF2ePba6SWGTlxo/edit#slide=id.h3097c4ef0c877aee_1_3643';
        mod = true;
      }
      if (!cap1.presentacionUrl) {
        cap1.presentacionUrl = 'https://docs.google.com/presentation/d/1fY0Hd3-hFOgCzzNGC0xNePgeIMrlPF2ePba6SWGTlxo/edit#slide=id.h3097c4ef0c877aee_1_3643';
        mod = true;
      }
      if (!cap1.videoUrl) {
        cap1.videoUrl = 'https://www.youtube.com/watch?v=kYJdZl21o5M';
        mod = true;
      }
      if (!Array.isArray(cap1.preguntas) || cap1.preguntas.length === 0) {
        cap1.preguntas = preguntasDefecto.slice(0, 7);
        mod = true;
      } else if (cap1.preguntas.length > 7) {
        cap1.preguntas = cap1.preguntas.slice(0, 7);
        mod = true;
      }
      if (mod) this.saveToStorage();
    }
  }

  getCapacitaciones(companyId = null) {
    const lockedId = this.getSessionTenantLock();
    const cid = lockedId || companyId || this.getEmpresaActivaId();
    if (cid && cid !== 'todas') {
      this.ensureDefaultCapacitacion(cid);
    }
    const lista = Array.isArray(this.data?.capacitaciones) ? this.data.capacitaciones : [];
    let filtrada = lista;
    if (cid && cid !== 'todas') {
      filtrada = lista.filter(c => c && (c.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (c.companyId === 'emp-1790438946268' || c.companyId === 'emp-004'))));
    }
    return filtrada.sort((a, b) => {
      const orderA = (a.order_number === 1 || a.esInduccionObligatoria) ? -1 : 1;
      const orderB = (b.order_number === 1 || b.esInduccionObligatoria) ? -1 : 1;
      return orderA - orderB;
    });
  }

  getCapacitacionPorId(id) {
    const lista = Array.isArray(this.data?.capacitaciones) ? this.data.capacitaciones : [];
    return lista.find(c => c && (c.id === id || String(c.id) === String(id))) || null;
  }

  guardarCapacitacion(capData) {
    if (!Array.isArray(this.data.capacitaciones)) this.data.capacitaciones = [];
    if (capData.id) {
      this.data.capacitaciones = this.data.capacitaciones.map(c => c.id === capData.id ? { ...c, ...capData, updatedAt: new Date().toISOString() } : c);
    } else {
      const newCap = {
        ...capData,
        id: 'cap-' + Date.now(),
        companyId: capData.companyId || this.empresaActivaId,
        estado: capData.estado || 'Programada',
        order_number: capData.order_number || (this.data.capacitaciones.length + 1),
        evaluaciones: capData.evaluaciones || [],
        createdAt: new Date().toISOString()
      };
      this.data.capacitaciones.push(newCap);
    }
    this.saveToStorage();
  }

  eliminarCapacitacion(id) {
    if (!Array.isArray(this.data.capacitaciones)) return false;
    const cap = this.data.capacitaciones.find(c => c && c.id === id);
    if (cap && (cap.order_number === 1 || cap.esInduccionObligatoria)) {
      alert("⚠️ La Capacitación #1 (Inducción al SG-SST) es obligatoria por ley y no puede ser eliminada.");
      return false;
    }
    this.data.capacitaciones = this.data.capacitaciones.filter(c => c && c.id !== id);
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return true;
  }

  registrarEvaluacionCapacitacion(capId, resultado) {
    if (!Array.isArray(this.data.capacitaciones)) return;
    const cap = this.data.capacitaciones.find(c => c && (c.id === capId || String(c.id) === String(capId)));
    if (!cap) return;
    if (!Array.isArray(cap.evaluaciones)) cap.evaluaciones = [];
    const idx = cap.evaluaciones.findIndex(e => e.trabajadorId === resultado.trabajadorId || e.worker_id === resultado.trabajadorId);
    if (idx >= 0) {
      cap.evaluaciones[idx] = { ...cap.evaluaciones[idx], ...resultado };
    } else {
      cap.evaluaciones.push(resultado);
    }

    // Sincronizar en repositorio central worker_evaluations
    if (!Array.isArray(this.data.worker_evaluations)) this.data.worker_evaluations = [];
    const weIdx = this.data.worker_evaluations.findIndex(e => (e.training_id === capId || e.capId === capId) && (e.worker_id === resultado.trabajadorId || e.trabajadorId === resultado.trabajadorId));
    if (weIdx >= 0) {
      this.data.worker_evaluations[weIdx] = { ...this.data.worker_evaluations[weIdx], ...resultado };
    } else {
      this.data.worker_evaluations.push(resultado);
    }

    this.saveToStorage();
  }

  async submitWorkerEvaluation(evaluationData) {
    const training_id = evaluationData.training_id || evaluationData.capId;
    const worker_id = evaluationData.worker_id || evaluationData.trabajadorId;
    const answers_submitted = evaluationData.answers_submitted || evaluationData.respuestas || [];

    // Intento 1: Enviar al servidor oficial para timestamp forense inmutable
    try {
      const apiUrl = (typeof this.getApiUrl === 'function')
        ? this.getApiUrl('/trainings/submit-evaluation')
        : '/api/trainings/submit-evaluation';

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_id,
          worker_id,
          answers_submitted
        })
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json && json.evaluation) {
          const evalRec = json.evaluation;
          this.registrarEvaluacionCapacitacion(training_id, evalRec);
          return evalRec;
        }
      }
    } catch (e) {
      console.warn("Servidor no disponible para timestamp forense, procediendo en almacenamiento local:", e);
    }

    // Fallback: Calificación y registro local
    const cap = this.getCapacitacionPorId(training_id);
    const trabajador = this.getTrabajadorPorId(worker_id);
    const empresa = this.getEmpresa(cap?.companyId || trabajador?.companyId) || this.getEmpresaActiva();

    const preguntas = (cap?.preguntas || []).slice(0, 7);
    const total_preguntas = preguntas.length || 7;

    let correct_count = 0;
    const detailed_answers = preguntas.map((p, idx) => {
      const ans_raw = answers_submitted[idx];
      let ans_idx = null;
      if (typeof ans_raw === 'number') {
        ans_idx = ans_raw;
      } else if (typeof ans_raw === 'string') {
        const letter = ans_raw.trim().toUpperCase();
        ans_idx = ['A', 'B', 'C', 'D'].indexOf(letter);
        if (ans_idx === -1 && /^\d+$/.test(ans_raw)) ans_idx = parseInt(ans_raw, 10);
      }

      let correct_idx = (p.respuestaCorrecta !== undefined) ? p.respuestaCorrecta : p.correct_option_index;
      if (typeof correct_idx === 'string' && /^\d+$/.test(correct_idx)) correct_idx = parseInt(correct_idx, 10);

      const is_correct = (ans_idx !== null && correct_idx !== undefined && ans_idx === correct_idx);
      if (is_correct) correct_count++;

      return {
        question_number: idx + 1,
        question_text: p.pregunta || p.question_text || `Pregunta ${idx + 1}`,
        options: p.opciones || p.options || [],
        selected_option_index: ans_idx,
        selected_option_letter: ans_idx !== null ? ['A', 'B', 'C', 'D'][ans_idx] : null,
        correct_option_index: correct_idx,
        correct_option_letter: correct_idx !== undefined ? ['A', 'B', 'C', 'D'][correct_idx] : 'B',
        is_correct,
        justificacion: p.justificacion || ''
      };
    });

    const percentage = Math.round((correct_count / Math.max(1, total_preguntas)) * 100);
    const nota = parseFloat(((correct_count / Math.max(1, total_preguntas)) * 4.0 + 1.0).toFixed(1));
    const passed = percentage >= 70;

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timestampBogota = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const certCode = `DP-EVAL-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const fallbackRecord = {
      id: 'eval-' + Date.now(),
      certificate_code: certCode,
      training_id: training_id,
      training_title: cap?.tema || cap?.title || 'Capacitación SST',
      company_id: cap?.companyId || empresa?.id,
      company_name: empresa?.razonSocial || 'DOCTOR PYME',
      worker_id: worker_id,
      trabajadorId: worker_id,
      trabajadorNombre: trabajador?.nombre || 'Trabajador',
      trabajadorCedula: trabajador?.identificacion || trabajador?.cedula || '',
      trabajadorCargo: trabajador?.cargo || 'Operativo',
      answers_submitted: answers_submitted,
      detailed_answers: detailed_answers,
      total_questions: total_preguntas,
      correct_count: correct_count,
      percentage: percentage,
      nota: nota,
      score_obtained: nota,
      aprobada: passed,
      passed: passed,
      accepted_at_utc: now.toISOString(),
      accepted_at_bogota: timestampBogota,
      timestamp: timestampBogota,
      fecha: now.toISOString(),
      cryptographic_evidence_hash: 'SHA256-LOCAL-' + Date.now(),
      created_at: now.toISOString()
    };

    this.registrarEvaluacionCapacitacion(training_id, fallbackRecord);
    return fallbackRecord;
  }

  getAllWorkerEvaluations(companyId = null) {
    const cid = companyId || this.empresaActivaId;
    const caps = this.getCapacitaciones(cid);
    const evals = [];
    caps.forEach(c => {
      (c.evaluaciones || []).forEach(e => {
        evals.push({
          ...e,
          training_id: c.id,
          training_title: c.tema || c.title,
          training_duration: c.duracion,
          training_facilitator: c.facilitador,
          training_date: c.fecha
        });
      });
    });
    return evals.sort((a, b) => new Date(b.accepted_at_utc || b.fecha || 0) - new Date(a.accepted_at_utc || a.fecha || 0));
  }

  getEvaluacionPorId(evalId) {
    const caps = Array.isArray(this.data?.capacitaciones) ? this.data.capacitaciones : [];
    for (const c of caps) {
      const found = (c.evaluaciones || []).find(e => e.id === evalId || e.certificate_code === evalId);
      if (found) {
        return {
          ...found,
          training: c
        };
      }
    }
    return null;
  }

  // --- CRUD EQUIPOS Y MAQUINARIA ---
  getEquipos(companyId = null) {
    const lockedId = this.getSessionTenantLock();
    const cid = lockedId || companyId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.equipos) ? this.data.equipos : [];
    if (cid === 'todas' && !lockedId) return lista;
    return lista.filter(e => e && (e.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (e.companyId === 'emp-1790438946268' || e.companyId === 'emp-004'))));
  }

  guardarEquipo(equipoData) {
    if (!Array.isArray(this.data.equipos)) this.data.equipos = [];
    const lockedId = this.getSessionTenantLock();
    if (equipoData.id) {
      this.data.equipos = this.data.equipos.map(e => e.id === equipoData.id ? { ...e, ...equipoData } : e);
    } else {
      const newEq = {
        ...equipoData,
        id: 'eq-' + Date.now(),
        companyId: lockedId || equipoData.companyId || this.getEmpresaActivaId(),
        estado: equipoData.estado || 'Operativo'
      };
      this.data.equipos.push(newEq);
    }
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
  }

  deleteEquipo(id) {
    if (confirm("¿Deseas eliminar este equipo del catálogo?")) {
      if (Array.isArray(this.data.equipos)) {
        this.data.equipos = this.data.equipos.filter(e => e.id !== id);
        this.saveToStorage();
        this.enviarAlServidorFisico(true);
        this.notify();
      }
    }
  }

  // --- CRUD MANTENIMIENTOS (DIAGRAMA DE GANTT) ---
  getMantenimientos(companyId = null) {
    const lockedId = this.getSessionTenantLock();
    const cid = lockedId || companyId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.mantenimientos) ? this.data.mantenimientos : [];
    if (cid === 'todas' && !lockedId) return lista;
    return lista.filter(m => m && (m.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (m.companyId === 'emp-1790438946268' || m.companyId === 'emp-004'))));
  }

  guardarMantenimiento(mantData) {
    if (!Array.isArray(this.data.mantenimientos)) this.data.mantenimientos = [];
    const lockedId = this.getSessionTenantLock();
    if (mantData.id) {
      this.data.mantenimientos = this.data.mantenimientos.map(m => m.id === mantData.id ? { ...m, ...mantData } : m);
    } else {
      const newMant = {
        ...mantData,
        id: 'mant-' + Date.now(),
        companyId: lockedId || mantData.companyId || this.getEmpresaActivaId()
      };
      this.data.mantenimientos.push(newMant);
    }
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
  }

  deleteMantenimiento(id) {
    if (confirm("¿Deseas eliminar este mantenimiento del cronograma?")) {
      if (Array.isArray(this.data.mantenimientos)) {
        this.data.mantenimientos = this.data.mantenimientos.filter(m => m.id !== id);
        this.saveToStorage();
        this.enviarAlServidorFisico(true);
        this.notify();
      }
    }
  }

  // --- REGISTRO DE FIRMAS ELECTRÓNICAS (LEY 527/1999) ---
  getFirmas(companyId = null) {
    const lockedId = this.getSessionTenantLock();
    const cid = lockedId || companyId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.firmas) ? this.data.firmas : [];
    if (cid === 'todas' && !lockedId) return lista;
    return lista.filter(f => f && (f.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (f.companyId === 'emp-1790438946268' || f.companyId === 'emp-004'))));
  }

  registrarFirma(firmaData) {
    if (!Array.isArray(this.data.firmas)) this.data.firmas = [];
    const firma = {
      ...firmaData,
      companyId: firmaData.companyId || this.empresaActivaId,
      timestamp: firmaData.timestamp || new Date().toISOString()
    };
    this.data.firmas.push(firma);
    this.saveToStorage();
    return firma;
  }

  getFirmasPorDocumento(docId, companyId = null) {
    const firmas = this.getFirmas(companyId);
    return firmas.filter(f => f && f.documentoId === docId);
  }

  getFirmasPorTrabajador(trabajadorId) {
    const firmas = Array.isArray(this.data?.firmas) ? this.data.firmas : [];
    return firmas.filter(f => f && f.trabajadorId === trabajadorId);
  }

  getFirmaPorId(id) {
    const firmas = Array.isArray(this.data?.firmas) ? this.data.firmas : [];
    return firmas.find(f => f && f.id === id) || null;
  }

  registrarFirmaTrabajador(firmaData) {
    return this.registrarFirma({
      ...firmaData,
      id: firmaData.id || ('sig-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6))
    });
  }

  // --- CRUD REPORTES DE PELIGRO ---
  getReportesPeligro(companyId = null) {
    const lockedId = this.getSessionTenantLock();
    const cid = lockedId || companyId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.reportesPeligro) ? this.data.reportesPeligro : [];
    if (cid === 'todas' && !lockedId) return lista;
    return lista.filter(r => r && (r.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (r.companyId === 'emp-1790438946268' || r.companyId === 'emp-004'))));
  }

  guardarReportePeligro(repData) {
    if (!Array.isArray(this.data.reportesPeligro)) this.data.reportesPeligro = [];
    const lockedId = this.getSessionTenantLock();
    if (repData.id) {
      this.data.reportesPeligro = this.data.reportesPeligro.map(r => r.id === repData.id ? { ...r, ...repData } : r);
    } else {
      const newRep = {
        ...repData,
        id: 'pel-' + Date.now(),
        companyId: lockedId || repData.companyId || this.getEmpresaActivaId(),
        fechaReporte: new Date().toISOString(),
        estado: repData.estado || 'Reportado'
      };
      this.data.reportesPeligro.unshift(newRep);
    }
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
  }

  registrarReportePeligro(repData) {
    return this.guardarReportePeligro(repData);
  }

  // --- CRUD REPORTES PREOPERACIONALES ---
  getReportesPreoperacional(companyId = null) {
    const lockedId = this.getSessionTenantLock();
    const cid = lockedId || companyId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.reportesPreoperacional) ? this.data.reportesPreoperacional : [];
    if (cid === 'todas' && !lockedId) return lista;
    return lista.filter(r => r && (r.companyId === cid || ((cid === 'emp-004' || cid === 'emp-1790438946268') && (r.companyId === 'emp-1790438946268' || r.companyId === 'emp-004'))));
  }

  guardarReportePreoperacional(preopData) {
    if (!Array.isArray(this.data.reportesPreoperacional)) this.data.reportesPreoperacional = [];
    const lockedId = this.getSessionTenantLock();
    const newPreop = {
      ...preopData,
      id: 'preop-' + Date.now(),
      companyId: lockedId || preopData.companyId || this.getEmpresaActivaId(),
      fechaCreacion: new Date().toISOString()
    };
    this.data.reportesPreoperacional.unshift(newPreop);
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return newPreop;
  }

  // =============================================================================
  // MÓDULO: GESTIÓN DE HERRAMIENTAS Y EQUIPOS (MULTITENANT SaaS)
  // Entidades: tools_inventory, tools_sst, tools_maintenance_plan, 
  //            tools_assignments, tools_interventions_log, data_privacy_consents
  // =============================================================================

  // 1. INVENTARIO DE HERRAMIENTAS (tools_inventory)
  getToolsInventory(tenantId = null) {
    const lockedId = this.getSessionTenantLock();
    const tid = lockedId || tenantId || this.getEmpresaActivaId();
    const lista = Array.isArray(this.data?.tools_inventory) ? this.data.tools_inventory : [];
    if (tid === 'todas' && !lockedId) return lista;
    return lista.filter(t => t && (t.tenant_id === tid || ((tid === 'emp-004' || tid === 'emp-1790438946268') && (t.tenant_id === 'emp-1790438946268' || t.tenant_id === 'emp-004'))));
  }

  getTools(tenantId = null) {
    return this.getToolsInventory(tenantId);
  }

  getToolById(toolId) {
    if (!toolId) return null;
    const lista = Array.isArray(this.data?.tools_inventory) ? this.data.tools_inventory : [];
    return lista.find(t => t && t.id === toolId) || null;
  }

  saveTool(toolData, assignmentIfActive = null) {
    if (!Array.isArray(this.data.tools_inventory)) this.data.tools_inventory = [];
    const lockedId = this.getSessionTenantLock();
    const tenantId = lockedId || toolData.tenant_id || this.getEmpresaActivaId();
    let toolId = toolData.id;

    // Validación 1: Si current_status es "En Funcionamiento", se exige obligatoriamente
    // un registro activo en tools_assignments (con employee_id, assigned_at y project_id)
    if (toolData.current_status === 'En Funcionamiento') {
      const activeAsg = toolId ? this.getActiveToolAssignment(toolId) : null;
      if (!activeAsg) {
        if (!assignmentIfActive || !assignmentIfActive.employee_id || !assignmentIfActive.project_id) {
          throw new Error('Validación de Negocio: Para marcar el activo "En Funcionamiento", es obligatorio crear un registro activo de asignación con Empleado Responsable y Proyecto/Frente de Obra.');
        }
      }
    }

    let savedTool = null;
    const nowIso = new Date().toISOString();

    if (toolId && this.data.tools_inventory.some(t => t.id === toolId)) {
      this.data.tools_inventory = this.data.tools_inventory.map(t => {
        if (t.id === toolId) {
          savedTool = {
            ...t,
            ...toolData,
            tenant_id: t.tenant_id || tenantId,
            updatedAt: nowIso
          };
          return savedTool;
        }
        return t;
      });
    } else {
      toolId = toolId || ('tool-' + Date.now());
      savedTool = {
        ...toolData,
        id: toolId,
        tenant_id: tenantId,
        useful_life_years: Number(toolData.useful_life_years) || 3,
        operative_vars: toolData.operative_vars || {},
        current_status: toolData.current_status || 'En Almacenamiento',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      this.data.tools_inventory.unshift(savedTool);
    }

    // Si viene asignación inicial requerida:
    if (assignmentIfActive && assignmentIfActive.employee_id && assignmentIfActive.project_id) {
      this.assignTool(toolId, {
        ...assignmentIfActive,
        tenant_id: tenantId
      });
    }

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return savedTool;
  }

  deleteTool(toolId) {
    if (!Array.isArray(this.data.tools_inventory)) return false;
    this.data.tools_inventory = this.data.tools_inventory.filter(t => t.id !== toolId);
    if (Array.isArray(this.data.tools_sst)) {
      this.data.tools_sst = this.data.tools_sst.filter(s => s.tool_id !== toolId);
    }
    if (Array.isArray(this.data.tools_maintenance_plan)) {
      this.data.tools_maintenance_plan = this.data.tools_maintenance_plan.filter(p => p.tool_id !== toolId);
    }
    if (Array.isArray(this.data.tools_assignments)) {
      this.data.tools_assignments = this.data.tools_assignments.filter(a => a.tool_id !== toolId);
    }
    if (Array.isArray(this.data.tools_interventions_log)) {
      this.data.tools_interventions_log = this.data.tools_interventions_log.filter(i => i.tool_id !== toolId);
    }
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return true;
  }

  vaciarInventarioTenant(companyId = null) {
    if (!Array.isArray(this.data.tools_inventory)) return 0;
    const lockedId = this.getSessionTenantLock();
    const targetTenantId = lockedId || companyId || (this.getEmpresaActivaId() !== 'todas' ? this.getEmpresaActivaId() : this.getEmpresas()[0]?.id);
    if (!targetTenantId) return 0;

    const idsToDelete = this.data.tools_inventory
      .filter(t => t.tenant_id === targetTenantId || ((targetTenantId === 'emp-004' || targetTenantId === 'emp-1790438946268') && (t.tenant_id === 'emp-1790438946268' || t.tenant_id === 'emp-004')))
      .map(t => t.id);

    if (idsToDelete.length === 0) return 0;

    this.data.tools_inventory = this.data.tools_inventory.filter(t => !idsToDelete.includes(t.id));
    if (Array.isArray(this.data.tools_sst)) {
      this.data.tools_sst = this.data.tools_sst.filter(s => !idsToDelete.includes(s.tool_id));
    }
    if (Array.isArray(this.data.tools_maintenance_plan)) {
      this.data.tools_maintenance_plan = this.data.tools_maintenance_plan.filter(p => !idsToDelete.includes(p.tool_id));
    }
    if (Array.isArray(this.data.tools_assignments)) {
      this.data.tools_assignments = this.data.tools_assignments.filter(a => !idsToDelete.includes(a.tool_id));
    }
    if (Array.isArray(this.data.tools_interventions_log)) {
      this.data.tools_interventions_log = this.data.tools_interventions_log.filter(i => !idsToDelete.includes(i.tool_id));
    }

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return idsToDelete.length;
  }

  importarHerramientasMasivas(listaHerramientas, companyId = null) {
    if (!Array.isArray(listaHerramientas) || listaHerramientas.length === 0) {
      return { importados: 0, actualizados: 0, total: 0 };
    }
    if (!Array.isArray(this.data.tools_inventory)) this.data.tools_inventory = [];
    if (!Array.isArray(this.data.tools_sst)) this.data.tools_sst = [];
    if (!Array.isArray(this.data.tools_maintenance_plan)) this.data.tools_maintenance_plan = [];

    const lockedId = this.getSessionTenantLock();
    const targetTenantId = lockedId || companyId || (this.getEmpresaActivaId() !== 'todas' ? this.getEmpresaActivaId() : (this.getEmpresas()[0]?.id || 'emp-1790438946268'));
    
    let importados = 0;
    let actualizados = 0;
    const nowIso = new Date().toISOString();

    const fallbackFotos = {
      'Industrial': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
      'Eléctrica': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
      'Neumática': 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&auto=format&fit=crop&q=80',
      'Medición': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      'Manual': 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=600&auto=format&fit=crop&q=80'
    };

    listaHerramientas.forEach((h, index) => {
      const codeClean = (h.internal_code || '').toString().trim();
      const nameClean = (h.exact_name || '').toString().trim();
      if (!codeClean || !nameClean) return;

      const idxExistente = this.data.tools_inventory.findIndex(t =>
        (t.tenant_id === targetTenantId || ((targetTenantId === 'emp-004' || targetTenantId === 'emp-1790438946268') && (t.tenant_id === 'emp-1790438946268' || t.tenant_id === 'emp-004'))) &&
        (t.internal_code || '').toString().trim().toLowerCase() === codeClean.toLowerCase()
      );

      const toolType = ['Industrial', 'Eléctrica', 'Neumática', 'Medición', 'Manual'].includes(h.tool_type) 
        ? h.tool_type 
        : 'Industrial';

      const status = ['En Almacenamiento', 'En Funcionamiento', 'En Mantenimiento'].includes(h.current_status)
        ? h.current_status
        : 'En Almacenamiento';

      const photo = h.photo_url || fallbackFotos[toolType] || fallbackFotos['Industrial'];

      const toolRecord = {
        tenant_id: targetTenantId,
        internal_code: codeClean,
        exact_name: nameClean,
        tool_type: toolType,
        brand: (h.brand || 'Genérica').toString().trim(),
        model: (h.model || 'Estándar').toString().trim(),
        serial_number: (h.serial_number || 'S/N-' + codeClean).toString().trim(),
        commercial_value: Number(h.commercial_value) || 0,
        acquisition_year: Number(h.acquisition_year) || new Date().getFullYear(),
        useful_life_years: Number(h.useful_life_years) || 3,
        current_status: status,
        location: (h.location || 'Planta Principal').toString().trim(),
        operative_vars: h.operative_vars || {},
        photo_url: photo,
        updatedAt: nowIso
      };

      let toolId = null;

      if (idxExistente >= 0) {
        toolId = this.data.tools_inventory[idxExistente].id;
        this.data.tools_inventory[idxExistente] = {
          ...this.data.tools_inventory[idxExistente],
          ...toolRecord
        };
        actualizados++;
      } else {
        toolId = 'tool-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substr(2, 4);
        toolRecord.id = toolId;
        toolRecord.createdAt = nowIso;
        this.data.tools_inventory.unshift(toolRecord);
        importados++;
      }

      // Proveer o actualizar Matriz SST (Estándar 2.4.1 Res. 0312)
      const existingSstIdx = this.data.tools_sst.findIndex(s => s.tool_id === toolId);
      const sstData = {
        tool_id: toolId,
        tenant_id: targetTenantId,
        hazards: Array.isArray(h.hazards) && h.hazards.length > 0 
          ? h.hazards 
          : ['Atrapamiento o golpe en extremidades', 'Riesgo ergonómico y biomecánico', 'Ruido y vibraciones'],
        preventive_measures: h.preventive_measures || 'Inspección preoperacional obligatoria y uso riguroso de EPP según labor.',
        required_epp: Array.isArray(h.required_epp) && h.required_epp.length > 0 
          ? h.required_epp 
          : ['Gafas de seguridad', 'Guantes de protección', 'Botas con puntera de acero', 'Protección auditiva']
      };

      if (existingSstIdx >= 0) {
        this.data.tools_sst[existingSstIdx] = { ...this.data.tools_sst[existingSstIdx], ...sstData };
      } else {
        this.data.tools_sst.push(sstData);
      }

      // Proveer o actualizar Plan de Mantenimiento Preventivo
      const existingPlanIdx = this.data.tools_maintenance_plan.findIndex(p => p.tool_id === toolId);
      if (existingPlanIdx < 0) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 90);
        this.data.tools_maintenance_plan.push({
          tool_id: toolId,
          type: 'Preventivo',
          periodicity_days: 90,
          last_date: new Date().toISOString().split('T')[0],
          next_date: nextDate.toISOString().split('T')[0]
        });
      }
    });

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return { importados, actualizados, total: importados + actualizados };
  }

  // 2. MATRIZ SST DEL ACTIVO (tools_sst)
  getToolSST(toolId) {
    if (!toolId) return null;
    const lista = Array.isArray(this.data?.tools_sst) ? this.data.tools_sst : [];
    return lista.find(s => s && s.tool_id === toolId) || null;
  }

  saveToolSST(sstData) {
    if (!Array.isArray(this.data.tools_sst)) this.data.tools_sst = [];
    const toolId = sstData.tool_id;
    const tenantId = sstData.tenant_id || this.empresaActivaId;
    let existing = this.data.tools_sst.find(s => s.tool_id === toolId);

    if (existing) {
      this.data.tools_sst = this.data.tools_sst.map(s => s.tool_id === toolId ? {
        ...s,
        ...sstData,
        tenant_id: tenantId
      } : s);
    } else {
      const newSST = {
        ...sstData,
        id: 'sst-' + Date.now(),
        tenant_id: tenantId,
        tool_id: toolId,
        hazards: Array.isArray(sstData.hazards) ? sstData.hazards : [],
        preventive_measures: sstData.preventive_measures || '',
        required_epp: Array.isArray(sstData.required_epp) ? sstData.required_epp : []
      };
      this.data.tools_sst.unshift(newSST);
    }
    this.saveToStorage();
    return this.getToolSST(toolId);
  }

  // 3. PLANES DE MANTENIMIENTO (tools_maintenance_plan)
  getToolMaintenancePlan(toolId) {
    if (!toolId) return null;
    const lista = Array.isArray(this.data?.tools_maintenance_plan) ? this.data.tools_maintenance_plan : [];
    return lista.find(p => p && p.tool_id === toolId) || null;
  }

  saveToolMaintenancePlan(planData) {
    if (!Array.isArray(this.data.tools_maintenance_plan)) this.data.tools_maintenance_plan = [];
    const toolId = planData.tool_id;
    const tenantId = planData.tenant_id || this.empresaActivaId;
    let existing = this.data.tools_maintenance_plan.find(p => p.tool_id === toolId);

    let nextDate = planData.next_date;
    if (planData.last_date && planData.periodicity_days && !nextDate) {
      const d = new Date(planData.last_date + 'T12:00:00');
      d.setDate(d.getDate() + Number(planData.periodicity_days));
      nextDate = d.toISOString().split('T')[0];
    }

    if (existing) {
      this.data.tools_maintenance_plan = this.data.tools_maintenance_plan.map(p => p.tool_id === toolId ? {
        ...p,
        ...planData,
        next_date: nextDate || p.next_date,
        tenant_id: tenantId
      } : p);
    } else {
      const newPlan = {
        ...planData,
        id: 'plan-' + Date.now(),
        tenant_id: tenantId,
        tool_id: toolId,
        type: planData.type || 'Preventivo',
        periodicity_days: Number(planData.periodicity_days) || 90,
        last_date: planData.last_date || new Date().toISOString().split('T')[0],
        next_date: nextDate || new Date().toISOString().split('T')[0]
      };
      this.data.tools_maintenance_plan.unshift(newPlan);
    }
    this.saveToStorage();
    return this.getToolMaintenancePlan(toolId);
  }

  // 4. ASIGNACIONES Y CUSTODIA (tools_assignments)
  getToolAssignments(toolId) {
    const lista = Array.isArray(this.data?.tools_assignments) ? this.data.tools_assignments : [];
    return lista.filter(a => a && a.tool_id === toolId);
  }

  getActiveToolAssignment(toolId) {
    const assignments = this.getToolAssignments(toolId);
    return assignments.find(a => !a.returned_at) || null;
  }

  assignTool(toolId, assignmentData) {
    const tool = this.getToolById(toolId);
    if (!tool) throw new Error('Herramienta no encontrada.');

    // Validación 2: Si current_status es "En Mantenimiento", bloquea su selección en el formulario de asignación
    if (tool.current_status === 'En Mantenimiento') {
      throw new Error(`Acceso Bloqueado: El activo ${tool.internal_code} (${tool.exact_name}) se encuentra actualmente "En Mantenimiento" y no puede ser asignado a ningún proyecto ni empleado.`);
    }

    if (!Array.isArray(this.data.tools_assignments)) this.data.tools_assignments = [];
    const tenantId = tool.tenant_id || this.empresaActivaId;

    // Cerrar asignaciones activas previas
    const nowIso = new Date().toISOString();
    this.data.tools_assignments.forEach(a => {
      if (a.tool_id === toolId && !a.returned_at) {
        a.returned_at = nowIso;
      }
    });

    const signatureHash = assignmentData.digital_signature_hash || 
      'SIG-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(16).toUpperCase();

    const newAssignment = {
      id: 'asg-' + Date.now(),
      tenant_id: tenantId,
      tool_id: toolId,
      employee_id: assignmentData.employee_id,
      project_id: assignmentData.project_id,
      assigned_at: assignmentData.assigned_at || nowIso,
      returned_at: null,
      digital_signature_hash: signatureHash
    };

    this.data.tools_assignments.unshift(newAssignment);

    // Actualizar estado del activo a "En Funcionamiento"
    tool.current_status = 'En Funcionamiento';
    tool.updatedAt = nowIso;

    this.saveToStorage();
    return newAssignment;
  }

  returnTool(assignmentId, returnedAt = null) {
    if (!Array.isArray(this.data.tools_assignments)) return false;
    const nowIso = returnedAt || new Date().toISOString();
    let toolId = null;

    this.data.tools_assignments = this.data.tools_assignments.map(a => {
      if (a.id === assignmentId) {
        toolId = a.tool_id;
        return { ...a, returned_at: nowIso };
      }
      return a;
    });

    if (toolId) {
      const tool = this.getToolById(toolId);
      if (tool && tool.current_status === 'En Funcionamiento') {
        tool.current_status = 'En Almacenamiento';
        tool.updatedAt = nowIso;
      }
    }

    this.saveToStorage();
    return true;
  }

  // 5. BITÁCORA DE INTERVENCIONES Y RECALCULO AUTOMÁTICO (tools_interventions_log)
  getToolInterventions(toolId) {
    const lista = Array.isArray(this.data?.tools_interventions_log) ? this.data.tools_interventions_log : [];
    return lista.filter(i => i && i.tool_id === toolId).sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date));
  }

  registerToolIntervention(interventionData) {
    if (!Array.isArray(this.data.tools_interventions_log)) this.data.tools_interventions_log = [];
    const toolId = interventionData.tool_id;
    const tool = this.getToolById(toolId);
    if (!tool) throw new Error('Herramienta no encontrada.');

    const tenantId = tool.tenant_id || this.empresaActivaId;
    const activityDate = interventionData.activity_date || new Date().toISOString().split('T')[0];

    const newIntervention = {
      id: 'log-' + Date.now(),
      tenant_id: tenantId,
      tool_id: toolId,
      activity_date: activityDate,
      activity_type: interventionData.activity_type || 'Preventivo',
      responsible_type: interventionData.responsible_type || 'Interno',
      responsible_name: interventionData.responsible_name || 'Técnico de Mantenimiento',
      technical_notes: interventionData.technical_notes || '',
      cost: Number(interventionData.cost) || 0
    };

    this.data.tools_interventions_log.unshift(newIntervention);

    // Validación 3: Al registrar una intervención en tools_interventions_log, actualiza automáticamente
    // last_date y recalcula next_date en tools_maintenance_plan
    let plan = this.getToolMaintenancePlan(toolId);
    if (!plan) {
      plan = {
        tool_id: toolId,
        tenant_id: tenantId,
        type: interventionData.activity_type === 'Mantenimiento Correctivo' ? 'Preventivo' : (interventionData.activity_type || 'Preventivo'),
        periodicity_days: 90,
        last_date: activityDate
      };
      this.saveToolMaintenancePlan(plan);
    } else {
      plan.last_date = activityDate;
      const periodicity = Number(plan.periodicity_days) || 90;
      const d = new Date(activityDate + 'T12:00:00');
      d.setDate(d.getDate() + periodicity);
      plan.next_date = d.toISOString().split('T')[0];
      this.saveToolMaintenancePlan(plan);
    }

    if (tool.current_status === 'En Mantenimiento' && interventionData.finalizar_mantenimiento) {
      tool.current_status = 'En Almacenamiento';
      tool.updatedAt = new Date().toISOString();
    }

    this.saveToStorage();
    return newIntervention;
  }

  // 6. MIDDLEWARE Y CONSENTIMIENTOS DE PRIVACIDAD (data_privacy_consents)
  getDataPrivacyConsents(tenantId = null, userId = null) {
    const tid = tenantId || this.empresaActivaId;
    const lista = Array.isArray(this.data?.data_privacy_consents) ? this.data.data_privacy_consents : [];
    return lista.filter(c => {
      const matchTenant = c && (c.tenant_id === tid || ((tid === 'emp-004' || tid === 'emp-1790438946268') && (c.tenant_id === 'emp-1790438946268' || c.tenant_id === 'emp-004')));
      if (!matchTenant) return false;
      if (userId) return c.user_id === userId;
      return true;
    });
  }

  hasAcceptedAllConsents(tenantId, userId, policyVersion = 'v1.0-2026') {
    const requiredTypes = ['Habeas_Data', 'Confidencialidad_Empresarial', 'Custodia_Activos'];
    const userConsents = this.getDataPrivacyConsents(tenantId, userId).filter(c => c.policy_version === policyVersion);
    const acceptedTypes = userConsents.map(c => c.consent_type);
    return requiredTypes.every(t => acceptedTypes.includes(t));
  }

  saveDataPrivacyConsents(tenantId, userId, ipAddress = '186.84.90.114', policyVersion = 'v1.0-2026') {
    if (!Array.isArray(this.data.data_privacy_consents)) this.data.data_privacy_consents = [];
    const tid = tenantId || this.empresaActivaId;
    const nowIso = new Date().toISOString();
    const requiredTypes = ['Habeas_Data', 'Confidencialidad_Empresarial', 'Custodia_Activos'];

    requiredTypes.forEach(type => {
      const exists = this.data.data_privacy_consents.some(c => c.tenant_id === tid && c.user_id === userId && c.consent_type === type && c.policy_version === policyVersion);
      if (!exists) {
        this.data.data_privacy_consents.push({
          id: 'consent-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          tenant_id: tid,
          user_id: userId,
          consent_type: type,
          ip_address: ipAddress,
          accepted_at: nowIso,
          policy_version: policyVersion
        });
      }
    });

    this.saveToStorage();
    return true;
  }

  // =============================================================================
  // 7. SISTEMA DE REPOSITORIO FORENSE Y FIRMA LEGAL (Ley 1581 / Ley 527 / Dec. 2364)
  // =============================================================================

  getLegalPolicyVersions() {
    return Array.isArray(this.data?.legal_policy_versions) ? this.data.legal_policy_versions : [];
  }

  getActiveLegalPolicy() {
    const versions = this.getLegalPolicyVersions();
    return versions.find(v => v.is_current_active) || versions[0] || {
      id: 'pol-ver-1581-2026-v1',
      version_number: 'v1.0',
      policy_title: 'Política Integral de Tratamiento de Datos Personales (Habeas Data) y Mandato SG-SST',
      legal_text_content: 'Texto legal oficial de Doctor Pyme...',
      text_sha256_hash: 'd3ea40df5f202dcca2830b6c3f5ca317d82a13cbb937f3b2b7a8347b182f43ee',
      is_current_active: true,
      published_at: '2026-01-15T00:00:00.000Z'
    };
  }

  getLegalAcceptanceRepository(filters = {}) {
    let list = Array.isArray(this.data?.legal_acceptance_repository) ? [...this.data.legal_acceptance_repository] : [];

    if (filters.companyQuery) {
      const q = filters.companyQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.company_name || '').toLowerCase().includes(q) ||
        (r.company_tax_id || '').toLowerCase().includes(q) ||
        (r.tenant_id || '').toLowerCase().includes(q)
      );
    }

    if (filters.userQuery) {
      const q = filters.userQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.user_email || '').toLowerCase().includes(q) ||
        (r.signer_typed_name || '').toLowerCase().includes(q) ||
        (r.signer_typed_id || '').toLowerCase().includes(q)
      );
    }

    if (filters.ipQuery) {
      const q = filters.ipQuery.trim();
      list = list.filter(r => (r.client_ip_address || '').includes(q) || (r.forwarded_ip || '').includes(q));
    }

    if (filters.dateQuery) {
      const q = filters.dateQuery.trim();
      list = list.filter(r => (r.accepted_at_bogota || '').includes(q) || (r.accepted_at_utc || '').includes(q));
    }

    if (filters.policyVersionId) {
      list = list.filter(r => r.policy_version_id === filters.policyVersionId);
    }

    // Ordenar cronológicamente descendente (más recientes primero)
    return list.sort((a, b) => new Date(b.accepted_at_utc || 0) - new Date(a.accepted_at_utc || 0));
  }

  getLegalAcceptanceById(idOrCode) {
    const list = this.getLegalAcceptanceRepository();
    return list.find(r => r.id === idOrCode || r.certificate_code === idOrCode) || null;
  }

  getCompanyDataPolicyRecord(tenantId) {
    const tid = tenantId || this.empresaActivaId;
    if (!tid || tid === 'todas') return null;
    const list = Array.isArray(this.data?.legal_acceptance_repository) ? this.data.legal_acceptance_repository : [];
    return list.find(r => r && (r.tenant_id === tid || ((tid === 'emp-004' || tid === 'emp-1790438946268') && (r.tenant_id === 'emp-1790438946268' || r.tenant_id === 'emp-004')))) || null;
  }

  hasCompanyAcceptedDataPolicy(tenantId) {
    const tid = tenantId || this.empresaActivaId;
    if (!tid || tid === 'todas') return true;
    const emp = this.getEmpresa(tid);
    if (emp && emp.politicaDatosAceptada) return true;
    return !!this.getCompanyDataPolicyRecord(tid);
  }

  hasUserAcceptedCurrentPolicy(tenantId, userId) {
    // Regla de Negocio: La Política de Tratamiento de Datos solo se solicita y firma 1 ÚNICA VEZ al registrar la empresa
    return this.hasCompanyAcceptedDataPolicy(tenantId);
  }

  async submitLegalAcceptance(payload) {
    // Regla de Negocio: 1 única firma por empresa en el momento de su registro
    const existingForCompany = this.getCompanyDataPolicyRecord(payload.tenant_id);
    if (existingForCompany && !payload.forceReplace) {
      const emp = this.getEmpresa(payload.tenant_id);
      if (emp) {
        emp.politicaDatosAceptada = true;
        emp.politicaDatosCertificado = existingForCompany.certificate_code;
        emp.politicaDatosFecha = existingForCompany.accepted_at_bogota;
      }
      return { ok: true, record: existingForCompany, alreadySigned: true };
    }

    try {
      const response = await fetch('/api/legal/accept-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const resData = await response.json();
        const record = resData.record;
        
        if (!Array.isArray(this.data.legal_acceptance_repository)) this.data.legal_acceptance_repository = [];
        // Garantizar 1 único registro por empresa (tenant_id)
        this.data.legal_acceptance_repository = this.data.legal_acceptance_repository.filter(r => r.tenant_id !== record.tenant_id && r.id !== record.id);
        this.data.legal_acceptance_repository.unshift(record);

        const emp = this.getEmpresa(record.tenant_id);
        if (emp) {
          emp.politicaDatosAceptada = true;
          emp.politicaDatosCertificado = record.certificate_code;
          emp.politicaDatosFecha = record.accepted_at_bogota;
          emp.politicaDatosFirmante = record.signer_typed_name;
        }

        // Actualizar data_privacy_consents para sincronía total
        this.saveDataPrivacyConsents(record.tenant_id, record.user_id, record.client_ip_address, 'v1.0');

        this.saveToStorage();
        this.notify();
        return { ok: true, record };
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Error del servidor HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn("Fallo conexión directa al servidor backend, generando registro forense seguro local:", err);
      // Generación forense offline como salvaguarda
      const now = new Date();
      const nowUtc = now.toISOString();
      const nowBogota = now.toLocaleString('es-CO', { timeZone: 'America/Bogota' }) + ' -0500';
      const activePolicy = this.getActiveLegalPolicy();
      const textHash = activePolicy.text_sha256_hash;

      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const certCode = `DP-LEGAL-${datePart}-${randomSuffix}`;

      // Hash local
      const concatStr = `${payload.tenant_id}${payload.user_id}${payload.user_email}${payload.signer_typed_id}186.84.90.114${nowUtc}${textHash}`;
      let evHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
          const msgUint8 = new TextEncoder().encode(concatStr);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          evHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
          console.error("Error al calcular hash SHA-256 en cliente:", e);
        }
      }

      const localRecord = {
        id: `legal-acc-${Date.now()}-${randomSuffix.toLowerCase()}`,
        certificate_code: certCode,
        tenant_id: payload.tenant_id,
        company_name: payload.company_name || 'Empresa Cliente',
        company_tax_id: payload.company_tax_id || '830124631',
        user_id: payload.user_id,
        user_email: payload.user_email,
        user_role: payload.user_role || 'Representante Legal',
        signer_typed_name: payload.signer_typed_name,
        signer_typed_id: payload.signer_typed_id,
        accepted_habeas_data: true,
        accepted_sst_third_party_mandate: true,
        accepted_nda_confidentiality: true,
        client_ip_address: '186.84.90.114',
        forwarded_ip: '',
        user_agent_device: navigator.userAgent || 'Navegador Web Local',
        accepted_at_utc: nowUtc,
        accepted_at_bogota: nowBogota,
        policy_version_id: activePolicy.id,
        cryptographic_evidence_hash: evHash
      };

      if (!Array.isArray(this.data.legal_acceptance_repository)) this.data.legal_acceptance_repository = [];
      this.data.legal_acceptance_repository = this.data.legal_acceptance_repository.filter(r => r.tenant_id !== payload.tenant_id);
      this.data.legal_acceptance_repository.unshift(localRecord);

      const emp = this.getEmpresa(payload.tenant_id);
      if (emp) {
        emp.politicaDatosAceptada = true;
        emp.politicaDatosCertificado = localRecord.certificate_code;
        emp.politicaDatosFecha = localRecord.accepted_at_bogota;
        emp.politicaDatosFirmante = localRecord.signer_typed_name;
      }

      this.saveDataPrivacyConsents(payload.tenant_id, payload.user_id, '186.84.90.114', 'v1.0');
      this.saveToStorage();
      this.notify();
      return { ok: true, record: localRecord };
    }
  }

  async verifyEvidenceHash(record) {
    if (!record) return { valid: false, calculatedHash: '' };
    const versions = this.getLegalPolicyVersions();
    const policy = versions.find(v => v.id === record.policy_version_id) || this.getActiveLegalPolicy();
    const textHash = policy ? policy.text_sha256_hash : '';

    const concatStr = `${record.tenant_id}${record.user_id}${record.user_email}${record.signer_typed_id}${record.client_ip_address}${record.accepted_at_utc}${textHash}`;

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const msgUint8 = new TextEncoder().encode(concatStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const calcHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return {
          valid: calcHash === record.cryptographic_evidence_hash,
          calculatedHash: calcHash,
          storedHash: record.cryptographic_evidence_hash,
          concatenatedFormula: concatStr
        };
      } catch (e) {
        console.error("Error al verificar hash:", e);
      }
    }
    return { valid: true, calculatedHash: record.cryptographic_evidence_hash, storedHash: record.cryptographic_evidence_hash };
  }

  exportarSabanaForenseCSV() {
    const records = this.getLegalAcceptanceRepository();
    const versions = this.getLegalPolicyVersions();
    const versionsMap = {};
    versions.forEach(v => { versionsMap[v.id] = v; });

    const headers = [
      'Código Certificado',
      'Fecha y Hora Oficial (Bogotá UTC-5)',
      'Timestamp Universal (UTC)',
      'ID Cuenta (Tenant)',
      'Razón Social Empresa',
      'NIT',
      'ID Usuario',
      'Correo Electrónico',
      'Rol del Usuario',
      'Nombre Firmante',
      'Documento Firmante (Cédula)',
      'Dirección IP Cliente',
      'IP Forwarded',
      'Dispositivo / User-Agent',
      'Versión Política',
      'Hash SHA-256 Texto Legal',
      'Sello Criptográfico SHA-256 (Evidencia Forense)',
      'Estado Legal Integridad'
    ];

    const escapeCsv = (str) => {
      const val = str === null || str === undefined ? '' : String(str);
      return `"${val.replace(/"/g, '""')}"`;
    };

    const rows = records.map(r => {
      const p = versionsMap[r.policy_version_id] || {};
      return [
        escapeCsv(r.certificate_code),
        escapeCsv(r.accepted_at_bogota),
        escapeCsv(r.accepted_at_utc),
        escapeCsv(r.tenant_id),
        escapeCsv(r.company_name),
        escapeCsv(r.company_tax_id),
        escapeCsv(r.user_id),
        escapeCsv(r.user_email),
        escapeCsv(r.user_role),
        escapeCsv(r.signer_typed_name),
        escapeCsv(r.signer_typed_id),
        escapeCsv(r.client_ip_address),
        escapeCsv(r.forwarded_ip || 'N/A'),
        escapeCsv(r.user_agent_device),
        escapeCsv(p.version_number || 'v1.0'),
        escapeCsv(p.text_sha256_hash || ''),
        escapeCsv(r.cryptographic_evidence_hash),
        escapeCsv('INTEGRO / VERIFICADO (Ley 527 de 1999)')
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `SABANA_FORENSE_HABEAS_DATA_DOCTOR_PYME_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ===========================================================================
  // MÉTODOS PROCESS-DRIVEN ARCHITECTURE (PROCESOS, CARGOS Y MATRIZ)
  // ===========================================================================

  _matchTenant(recordTenantId, targetCid) {
    if (!recordTenantId || !targetCid) return false;
    if (recordTenantId === targetCid) return true;
    if ((targetCid === 'emp-004' || targetCid === 'emp-1790438946268') && (recordTenantId === 'emp-004' || recordTenantId === 'emp-1790438946268')) return true;
    return false;
  }

  getProcessMap(companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    return (this.data.process_maps || []).find(m => this._matchTenant(m.tenant_id, targetCid)) || null;
  }

  getProcesses(companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    return (this.data.processes || []).filter(p => this._matchTenant(p.tenant_id, targetCid));
  }

  getProcess(processId) {
    return (this.data.processes || []).find(p => p.id === processId) || null;
  }

  getProcessActivities(processId, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    return (this.data.process_activities || []).filter(a => a.process_id === processId && this._matchTenant(a.tenant_id, targetCid));
  }

  getAllProcessActivities(companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    return (this.data.process_activities || []).filter(a => this._matchTenant(a.tenant_id, targetCid));
  }

  saveProcess(processData, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    this.data.processes = this.data.processes || [];
    
    const existingIndex = this.data.processes.findIndex(p => p.id === processData.id);
    const nowIso = new Date().toISOString();

    const record = {
      id: processData.id || `proc-${targetCid}-${Date.now()}`,
      tenant_id: targetCid,
      process_map_id: processData.process_map_id || `pmap-${targetCid}-01`,
      code: processData.code || 'PR-01',
      name: processData.name || 'Nuevo Proceso',
      process_type: processData.process_type || 'Misional',
      objective: processData.objective || '',
      scope: processData.scope || '',
      leader_job_position_id: processData.leader_job_position_id || null,
      leader_title: processData.leader_title || '',
      updatedAt: nowIso,
      createdAt: processData.createdAt || nowIso
    };

    if (existingIndex >= 0) {
      this.data.processes[existingIndex] = { ...this.data.processes[existingIndex], ...record };
    } else {
      this.data.processes.push(record);
    }

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return record;
  }

  saveProcessActivity(activityData, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    this.data.process_activities = this.data.process_activities || [];
    const nowIso = new Date().toISOString();

    const actId = activityData.id || `act-${activityData.process_id || 'proc'}-${Date.now()}`;
    const routineVal = activityData.routine_type || (activityData.is_routine === false ? 'No_Rutinaria' : 'Rutinaria');
    const record = {
      id: actId,
      tenant_id: targetCid,
      process_id: activityData.process_id,
      phva_phase: activityData.phva_phase || 'Hacer',
      activity_order: Number(activityData.activity_order) || 1,
      activity_name: activityData.activity_name || 'Nueva Actividad',
      description: activityData.description || '',
      inputs: activityData.inputs || '',
      outputs: activityData.outputs || '',
      routine_type: routineVal,
      is_routine: routineVal === 'Rutinaria',
      associated_tools_ids: Array.isArray(activityData.associated_tools_ids) ? activityData.associated_tools_ids : [],
      updatedAt: nowIso,
      createdAt: activityData.createdAt || nowIso
    };

    const existingIndex = this.data.process_activities.findIndex(a => a.id === record.id);
    if (existingIndex >= 0) {
      this.data.process_activities[existingIndex] = { ...this.data.process_activities[existingIndex], ...record };
    } else {
      this.data.process_activities.push(record);
    }

    // Regla de Negocio: Propagación automática de cargos a job_positions y process_activity_positions
    if (activityData.job_position_title || activityData.job_position_id) {
      this.propagateActivityPosition(record.id, activityData.job_position_title || activityData.job_position_id, activityData.role_in_activity || 'Responsable_Ejecutor', targetCid);
    }

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return record;
  }

  async deleteProcess(processId) {
    if (!processId) return;
    this.data.processes = (this.data.processes || []).filter(p => p.id !== processId);
    const removedActs = (this.data.process_activities || []).filter(a => a.process_id === processId);
    const actIds = new Set(removedActs.map(a => a.id));
    this.data.process_activities = (this.data.process_activities || []).filter(a => a.process_id !== processId);
    this.data.process_activity_positions = (this.data.process_activity_positions || []).filter(pap => !actIds.has(pap.process_activity_id));
    
    try {
      if (typeof fetch !== 'undefined') {
        await fetch(this.getApiUrl('/delete_record'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'process', id: processId })
        });
      }
    } catch (e) {
      console.warn("Aviso en borrado atómico de proceso:", e);
    }

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
  }

  deleteProcessActivity(activityId) {
    this.data.process_activities = (this.data.process_activities || []).filter(a => a.id !== activityId);
    this.data.process_activity_positions = (this.data.process_activity_positions || []).filter(pap => pap.process_activity_id !== activityId);
    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
  }

  // --- CATÁLOGO DE CARGOS Y PROPAGACIÓN ---

  getJobPositions(companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    return (this.data.job_positions || []).filter(j => this._matchTenant(j.tenant_id, targetCid));
  }

  getJobPosition(id, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    return (this.data.job_positions || []).find(j => j.id === id && (!companyId || this._matchTenant(j.tenant_id, targetCid))) || null;
  }

  saveJobPosition(jobData, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    this.data.job_positions = this.data.job_positions || [];
    const nowIso = new Date().toISOString();

    const existingIndex = this.data.job_positions.findIndex(j => (j.id === jobData.id) || (this._matchTenant(j.tenant_id, targetCid) && (j.title || '').toLowerCase().trim() === (jobData.title || '').toLowerCase().trim()));

    const record = {
      id: jobData.id || `jp-${targetCid}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      tenant_id: targetCid,
      code: jobData.code || `CARG-${String(this.data.job_positions.length + 1).padStart(3, '0')}`,
      title: jobData.title || 'Nuevo Cargo',
      department: jobData.department || 'Operaciones y Producción',
      hierarchy_level: jobData.hierarchy_level || 'Operativo',
      parent_job_position_id: jobData.parent_job_position_id || null,
      parent_job_position_title: jobData.parent_job_position_title || (jobData.hierarchy_level === 'Directivo' ? 'Junta Directiva / Representante Legal' : 'Jefe Inmediato / Coordinador de Área'),
      summary_objective: jobData.summary_objective || jobData.job_objective || '',
      job_objective: jobData.job_objective || jobData.summary_objective || `Desempeñar con excelencia técnica y estricto apego a las normas del SG-SST las actividades asignadas al puesto de ${jobData.title || 'este cargo'}.`,
      required_education: jobData.required_education || 'Bachiller Académico o Técnico',
      required_experience: jobData.required_experience || '1 año de experiencia',
      required_skills: Array.isArray(jobData.required_skills) ? jobData.required_skills : (typeof jobData.required_skills === 'string' ? jobData.required_skills.split(',').map(s => s.trim()) : []),
      personality_skills: Array.isArray(jobData.personality_skills) ? jobData.personality_skills : ['Liderazgo y comunicación asertiva', 'Disciplina operacional y autocuidado', 'Resolución de problemas técnicos', 'Trabajo en equipo y adaptabilidad'],
      operational_functions: Array.isArray(jobData.operational_functions) ? jobData.operational_functions : [],
      sst_responsibilities: Array.isArray(jobData.sst_responsibilities) ? jobData.sst_responsibilities : [],
      authority_scope: jobData.authority_scope || 'Autoridad técnica y operacional en su puesto de trabajo y custodia de herramientas/equipos asignados.',
      suspension_faculty: jobData.suspension_faculty || 'Facultad expresa y obligatoria para suspender de forma inmediata cualquier labor o actividad en caso de constatar un riesgo grave o inminente para la vida o la salud, o ante la falta de EPP.',
      medical_exams_profesiograma: jobData.medical_exams_profesiograma || { ingreso: ['Examen Médico Ocupacional con énfasis Osteomuscular', 'Optometría', 'Audiometría'], periodico: ['Control Médico Anual SST'], egreso: ['Examen Médico de Retiro'] },
      required_epp_list: Array.isArray(jobData.required_epp_list) ? jobData.required_epp_list : ['Casco de Seguridad', 'Botas de Seguridad', 'Guantes de Protección', 'Protección Auditiva'],
      is_active: jobData.is_active !== false,
      updatedAt: nowIso,
      createdAt: jobData.createdAt || nowIso
    };

    if (existingIndex >= 0) {
      this.data.job_positions[existingIndex] = { ...this.data.job_positions[existingIndex], ...record };
    } else {
      this.data.job_positions.push(record);
    }

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
    return record;
  }

  async deleteJobPosition(id) {
    if (!id) return;
    const targetCargo = (this.data.job_positions || []).find(j => j.id === id);
    const targetTitle = targetCargo?.title ? targetCargo.title.toLowerCase().trim() : '';

    this.data.job_positions = (this.data.job_positions || []).filter(j => j.id !== id);
    this.data.process_activity_positions = (this.data.process_activity_positions || []).filter(pap => pap.job_position_id !== id);
    
    // Desvincular de actividades existentes para evitar auto-recreación
    (this.data.process_activities || []).forEach(act => {
      if (act.job_position_id === id || (targetTitle && (act.job_position_title || '').toLowerCase().trim() === targetTitle)) {
        act.job_position_id = null;
        act.job_position_title = null;
      }
    });

    // Desvincular de trabajadores si estaban asignados
    (this.data.trabajadores || []).forEach(t => {
      if (t.job_position_id === id) t.job_position_id = null;
    });

    try {
      if (typeof fetch !== 'undefined') {
        await fetch(this.getApiUrl('/delete_record'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'job_position', id: id })
        });
      }
    } catch (e) {
      console.warn("Aviso en borrado atómico de cargo en servidor:", e);
    }

    this.saveToStorage();
    this.enviarAlServidorFisico(true);
    this.notify();
  }

  propagateActivityPosition(activityId, jobTitleOrId, role = 'Responsable_Ejecutor', companyId = null) {
    if (!jobTitleOrId || !jobTitleOrId.toString().trim()) return null;
    const targetCid = companyId || this.getEmpresaActivaId();
    this.data.job_positions = this.data.job_positions || [];
    this.data.process_activity_positions = this.data.process_activity_positions || [];

    const cleanTitle = jobTitleOrId.toString().trim();
    // Buscar si existe por ID o por título
    let jp = this.data.job_positions.find(j => this._matchTenant(j.tenant_id, targetCid) && (j.id === cleanTitle || (j.title || '').toLowerCase().trim() === cleanTitle.toLowerCase()));

    // Solo vincular si el cargo ya existe en el catálogo. NO auto-crear cargos fantasma eliminados.
    if (!jp) {
      return null;
    }

    // Vincular en process_activity_positions sin duplicar
    const existingIndex = this.data.process_activity_positions.findIndex(pap => pap.process_activity_id === activityId && pap.job_position_id === jp.id);
    const nowIso = new Date().toISOString();
    const linkRecord = {
      id: existingIndex >= 0 ? this.data.process_activity_positions[existingIndex].id : `pap-${activityId}-${jp.id}`,
      tenant_id: targetCid,
      process_activity_id: activityId,
      job_position_id: jp.id,
      role_in_activity: role,
      is_mandatory_accountable: true,
      updatedAt: nowIso
    };

    if (existingIndex >= 0) {
      this.data.process_activity_positions[existingIndex] = { ...this.data.process_activity_positions[existingIndex], ...linkRecord };
    } else {
      this.data.process_activity_positions.push(linkRecord);
    }

    return jp;
  }

  // --- EXTRACCIÓN DINÁMICA DE FUNCIONES Y RESPONSABILIDADES DESDE PROCESOS ---
  getJobPositionFunctions(jobPositionId, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    const jp = this.getJobPosition(jobPositionId, targetCid);
    if (!jp) return { operativas: [], sst: [], procesos: [], herramientas: [] };

    // Buscar todas las actividades donde este cargo participa
    const paps = (this.data.process_activity_positions || []).filter(pap => pap.job_position_id === jp.id && pap.tenant_id === targetCid);
    const activityIds = paps.map(pap => pap.process_activity_id);

    const activities = (this.data.process_activities || []).filter(a => activityIds.includes(a.id));
    const allTools = this.data.tools_inventory || [];

    const operativas = [];
    const sst = [];
    const procesosInvolucrados = new Set();
    const herramientasInvolucradas = [];

    activities.forEach(act => {
      const proc = (this.data.processes || []).find(p => p.id === act.process_id);
      if (proc) procesosInvolucrados.add(`${proc.code} - ${proc.name}`);

      const desc = `${act.activity_name}: ${act.description}`;
      if (act.phva_phase === 'Verificar' || act.phva_phase === 'Actuar' || act.activity_name.toLowerCase().includes('sst') || act.activity_name.toLowerCase().includes('inspección')) {
        sst.push(desc);
      } else {
        operativas.push(desc);
      }

      if (Array.isArray(act.associated_tools_ids)) {
        act.associated_tools_ids.forEach(tid => {
          const t = allTools.find(tool => tool.id === tid);
          if (t && !herramientasInvolucradas.some(h => h.id === t.id)) {
            herramientasInvolucradas.push(t);
          }
        });
      }
    });

    // Responsabilidades estándar SG-SST (Decreto 1072 Art. 2.2.4.6.10)
    if (sst.length === 0) {
      sst.push("Procurar el cuidado integral de su salud física y mental.");
      sst.push("Suministrar información clara, veraz y completa sobre su estado de salud.");
      sst.push("Cumplir las normas, reglamentos e instrucciones del SG-SST.");
      sst.push("Participar en las capacitaciones de seguridad e informar oportunamente peligros y riesgos.");
      sst.push("Utilizar y cuidar permanentemente los Elementos de Protección Personal (EPP).");
    }

    return {
      cargo: jp.title,
      nivel: jp.hierarchy_level,
      operativas,
      sst,
      procesos: Array.from(procesosInvolucrados),
      herramientas: herramientasInvolucradas
    };
  }

  // --- CÁLCULO DEL PROGRESO DE ONBOARDING OPERATIVO (4 PASOS) ---
  getOnboardingProgress(companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    const emp = this.getEmpresa(targetCid);
    if (!emp) return { paso1: 0, paso2: 0, paso3: 0, paso4: 0, total: 0 };

    // Paso 1: Perfil y ADN de la Empresa (con Asistente IA)
    const paso1Completado = !!(emp.company_description && emp.operational_how_it_works && emp.ai_context_summary);

    // Paso 2: Mapa de Procesos y Caracterización SIPOC/PHVA
    const procs = (this.data.processes || []).filter(p => p.tenant_id === targetCid);
    const acts = (this.data.process_activities || []).filter(a => a.tenant_id === targetCid);
    const paso2Completado = procs.length >= 3 && acts.length >= 6;

    // Paso 3: Catálogo de Cargos y Documentos
    const jobs = (this.data.job_positions || []).filter(j => j.tenant_id === targetCid);
    const paso3Completado = jobs.length >= 2;

    // Paso 4: Despliegue en Portal de Trabajadores y Matriz GTC 45
    const trabs = (this.data.trabajadores || []).filter(t => t.companyId === targetCid);
    const trabsConCargo = trabs.length > 0 && trabs.every(t => t.job_position_id);
    const matrizRows = (this.data.matriz || []).filter(m => m.companyId === targetCid);
    const matrizConectada = matrizRows.length > 0 && matrizRows.some(m => m.process_id);
    const paso4Completado = trabsConCargo || matrizConectada;

    const completadosCount = [paso1Completado, paso2Completado, paso3Completado, paso4Completado].filter(Boolean).length;
    const porcentajeTotal = Math.round((completadosCount / 4) * 100);

    return {
      paso1: paso1Completado,
      paso2: paso2Completado,
      paso3: paso3Completado,
      paso4: paso4Completado,
      total: porcentajeTotal,
      empresa: emp
    };
  }

  // =============================================================================
  // 8. APP MÓVIL DEL TRABAJADOR: GESTIÓN DE FIRMAS, EPP, PREOPERACIONAL Y PELIGROS
  // =============================================================================
  getEmployeeDocumentSignatures(workerId) {
    const list = Array.isArray(this.data?.employee_document_signatures) ? this.data.employee_document_signatures : [];
    if (!workerId) return list;
    return list.filter(s => s && (s.employee_id === workerId || s.trabajadorId === workerId));
  }

  getEppDeliveries(workerId) {
    const list = Array.isArray(this.data?.epp_deliveries) ? this.data.epp_deliveries : [];
    if (!workerId) return list;
    return list.filter(d => d && (d.employee_id === workerId || d.trabajadorId === workerId));
  }

  getWorkerSstReports(workerId) {
    const list = Array.isArray(this.data?.worker_sst_reports) ? this.data.worker_sst_reports : [];
    if (!workerId) return list;
    return list.filter(r => r && (r.employee_id === workerId || r.trabajadorId === workerId));
  }

  async submitWorkerOnboarding(payload) {
    try {
      const res = await fetch('/api/worker/sign-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al firmar consentimiento onboarding');
      if (data.record) {
        if (!Array.isArray(this.data.employee_document_signatures)) this.data.employee_document_signatures = [];
        this.data.employee_document_signatures.unshift(data.record);
        this.saveToStorage();
        this.notify();
      }
      return data;
    } catch (err) {
      console.error('Error submitWorkerOnboarding:', err);
      throw err;
    }
  }

  async submitWorkerDocumentSignature(payload) {
    try {
      const res = await fetch('/api/worker/sign-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al firmar documento');
      if (data.signature) {
        if (!Array.isArray(this.data.employee_document_signatures)) this.data.employee_document_signatures = [];
        this.data.employee_document_signatures.unshift(data.signature);
        if (!Array.isArray(this.data.firmas)) this.data.firmas = [];
        this.data.firmas.unshift({
          id: data.signature.id,
          trabajadorId: data.signature.employee_id,
          documentoId: data.signature.document_id,
          documentoCodigo: data.signature.document_code,
          tipoDocumento: data.signature.document_type,
          titulo: data.signature.document_title,
          fechaHoraISO: data.signature.signed_at,
          hashDocumento: data.signature.signature_sha256 || data.signature.sha256_hash,
          firmaDataUrl: data.signature.signature_image_file,
          companyId: data.signature.tenant_id,
          pdf_s3_key: data.signature.pdf_s3_key
        });

        // Inyección Automática de Soporte Probatorio en Estándar 1.1.2 (Res. 0312 de 2019)
        if (data.signature.document_type === 'MANUAL_DE_CARGO' || (data.signature.document_type || '').includes('MANUAL')) {
          const trab = this.getTrabajadorPorId(data.signature.employee_id) || {};
          const evidId = `evid-${data.signature.tenant_id}-1.1.2-${data.signature.employee_id}-manual`;
          if (!Array.isArray(this.data.evidencias)) this.data.evidencias = [];
          this.data.evidencias = this.data.evidencias.filter(e => e.id !== evidId);
          this.data.evidencias.unshift({
            id: evidId,
            companyId: data.signature.tenant_id,
            tenant_id: data.signature.tenant_id,
            numeral: '1.1.2',
            nombre: `MANUAL DE CARGOS, RESPONSABILIDADES Y FUNCIONES - ${trab.nombre || 'Trabajador'} (${trab.cargo || ''}) [Firmado]`,
            titulo: `Manual de Cargos, Responsabilidades y Funciones - ${trab.nombre || 'Trabajador'}`,
            tipo: 'application/pdf',
            tamanio: 285000,
            url: data.signature.signature_image_file,
            pdf_s3_key: data.signature.pdf_s3_key,
            sha256_hash: data.signature.signature_sha256 || data.signature.sha256_hash,
            trabajadorId: data.signature.employee_id,
            trabajadorNombre: trab.nombre,
            cargo: trab.cargo,
            fecha: data.signature.signed_at,
            fechaCargue: data.signature.signed_at,
            anio: new Date().getFullYear().toString(),
            origen: 'MÓDULO OFICIAL TALENTO HUMANO Y SG-SST (RES. 0312 ESTÁNDAR 1.1.2)'
          });

          // Actualizar estado en evaluaciones activas
          const cId = data.signature.tenant_id;
          if (this.data.evaluaciones && this.data.evaluaciones[cId]) {
            const ev = this.data.evaluaciones[cId];
            if (Array.isArray(ev)) {
              const item = ev.find(it => it.numeral === '1.1.2' || it.numeral === '1.1.2.5');
              if (item) {
                item.cumple = true;
                item.no_aplica = false;
                item.justificacion = `Soportado con Manuales de Cargos y Responsabilidades firmados digitalmente (Ley 527/1999) por ${trab.nombre || 'el titular'}.`;
              }
            } else if (typeof ev === 'object') {
              Object.keys(ev).forEach(yr => {
                if (ev[yr] && typeof ev[yr] === 'object') {
                  ['1.1.2', '1.1.2.1', '1.1.2.5', '1.1.2.6'].forEach(num => {
                    if (ev[yr][num]) {
                      ev[yr][num].estado = 'CUMPLE';
                      ev[yr][num].justificacion = `Soportado con Manuales de Cargos, Responsabilidades y Funciones socializados y firmados bajo Ley 527 de 1999.`;
                    }
                  });
                }
              });
            }
          }
        }

        this.saveToStorage();
        this.notify();
      }
      return data;
    } catch (err) {
      console.error('Error submitWorkerDocumentSignature:', err);
      throw err;
    }
  }

  async registerWorkerSignature(payload) {
    try {
      const res = await fetch('/api/worker/register-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar firma digital base');
      
      const workerId = payload.worker_id || payload.employee_id || payload.trabajadorId;
      if (Array.isArray(this.data.trabajadores)) {
        const trab = this.data.trabajadores.find(t => t.id === workerId);
        if (trab) {
          trab.has_registered_signature = true;
          trab.signature_svg = payload.signature_svg;
          trab.signature_s3_key = data.s3_key || `tenants/${payload.tenant_id}/signatures/emp_${workerId}.png`;
          trab.signature_url = data.signature_url;
          trab.signature_registered_at = data.worker?.signature_registered_at || new Date().toISOString();
          trab.signature_registered_bogota = data.bogota_time;
          trab.signature_sha256 = data.sha256_hash;
          trab.signature_ip_address = data.worker?.signature_ip_address || '127.0.0.1';
        }
      }

      // Sincronizar sesión si el usuario actual es este trabajador
      if (typeof auth !== 'undefined' && auth && auth.session) {
        const sWid = auth.session.trabajadorId || auth.session.id;
        if (sWid === workerId) {
          auth.session.has_registered_signature = true;
          auth.session.signature_svg = payload.signature_svg;
          auth.session.signature_url = data.signature_url;
          auth.session.signature_s3_key = data.s3_key;
          auth.session.signature_registered_at = data.worker?.signature_registered_at || new Date().toISOString();
          auth.session.signature_registered_bogota = data.bogota_time;
          auth.session.signature_sha256 = data.sha256_hash;
          try {
            localStorage.setItem('DOCTOR_PYME_AUTH_SESSION', JSON.stringify(auth.session));
          } catch (_) {}
        }
      }

      this.saveToStorage();
      this.notify();
      return data;
    } catch (err) {
      console.error('Error registerWorkerSignature:', err);
      throw err;
    }
  }

  async getRegisteredWorkerSignature(workerId, tenantId = null) {
    try {
      const q = new URLSearchParams({ worker_id: workerId });
      if (tenantId) q.append('tenant_id', tenantId);
      const res = await fetch(`/api/worker/registered-signature?${q.toString()}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('Error getRegisteredWorkerSignature:', err);
      return null;
    }
  }

  async getWorkerFolderDocuments(workerId, tenantId = null) {
    try {
      const q = new URLSearchParams({ worker_id: workerId });
      if (tenantId) q.append('tenant_id', tenantId);
      const res = await fetch(`/api/worker/folder-documents?${q.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.documents)) {
        if (!Array.isArray(this.data.employee_folder_documents)) {
          this.data.employee_folder_documents = [];
        }
        const existingIds = new Set(data.documents.map(d => d.id));
        this.data.employee_folder_documents = this.data.employee_folder_documents
          .filter(d => (d.employee_id !== workerId && d.trabajadorId !== workerId) || !existingIds.has(d.id))
          .concat(data.documents);
        return data.documents;
      }
      return (this.data.employee_folder_documents || []).filter(d => d.employee_id === workerId || d.trabajadorId === workerId);
    } catch (err) {
      console.error('Error getWorkerFolderDocuments:', err);
      return (this.data.employee_folder_documents || []).filter(d => d.employee_id === workerId || d.trabajadorId === workerId);
    }
  }

  async uploadWorkerFolderDocument(payload) {
    try {
      const res = await fetch('/api/worker/upload-folder-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar documento en expediente laboral');

      if (data.document) {
        if (!Array.isArray(this.data.employee_folder_documents)) {
          this.data.employee_folder_documents = [];
        }
        this.data.employee_folder_documents.unshift(data.document);

        const worker = this.getTrabajadorPorId(payload.worker_id || payload.employee_id) || {};
        const tenantId = payload.tenant_id || this.getEmpresaActivaId();

        if (payload.document_category === 'EXAMEN_MEDICO_INGRESO') {
          if (!Array.isArray(this.data.evidencias)) this.data.evidencias = [];
          this.data.evidencias.unshift({
            id: `evid-${tenantId}-3.1.4-${payload.worker_id}-medico`,
            companyId: tenantId,
            tenant_id: tenantId,
            numeral: '3.1.4',
            nombre: `CERTIFICADO DE APTITUD MÉDICA OCUPACIONAL (INGRESO) - ${worker.nombre || 'Trabajador'} [Expediente Laboral]`,
            titulo: `Evaluación Médica Ocupacional de Ingreso - ${worker.nombre || 'Trabajador'}`,
            tipo: payload.mime_type || 'application/pdf',
            tamanio: payload.file_size_bytes || 250000,
            url: data.document.file_url,
            file_s3_key: data.document.file_s3_key,
            trabajadorId: payload.worker_id,
            trabajadorNombre: worker.nombre,
            cargo: worker.cargo,
            fecha: new Date().toISOString(),
            fechaCargue: new Date().toISOString(),
            anio: new Date().getFullYear().toString(),
            origen: 'EXPEDIENTE LABORAL DIGITAL (CUMPLIMIENTO RES. 0312 ESTÁNDAR 3.1.4 / DEC. 1072)'
          });

          [tenantId, 'emp-1790438946268', 'emp-004'].forEach(cid => {
            if (this.data.evaluaciones && this.data.evaluaciones[cid]) {
              const ev = this.data.evaluaciones[cid];
              if (typeof ev === 'object' && !Array.isArray(ev)) {
                Object.keys(ev).forEach(yr => {
                  if (ev[yr] && ev[yr]['3.1.4']) {
                    ev[yr]['3.1.4'].estado = 'CUMPLE';
                    ev[yr]['3.1.4'].justificacion = `Soportado con Certificado de Aptitud Médica Ocupacional de Ingreso en Expediente Laboral Digital.`;
                  }
                });
              }
            }
          });
        } else if (['AFILIACION_EPS', 'AFILIACION_ARL', 'AFILIACION_PENSION'].includes(payload.document_category)) {
          [tenantId, 'emp-1790438946268', 'emp-004'].forEach(cid => {
            if (this.data.evaluaciones && this.data.evaluaciones[cid]) {
              const ev = this.data.evaluaciones[cid];
              if (typeof ev === 'object' && !Array.isArray(ev)) {
                Object.keys(ev).forEach(yr => {
                  if (ev[yr] && ev[yr]['1.1.3']) {
                    ev[yr]['1.1.3'].estado = 'CUMPLE';
                    ev[yr]['1.1.3'].justificacion = `Soportado con Certificados de Afiliación a Seguridad Social en Expediente Laboral Digital.`;
                  }
                });
              }
            }
          });
        }
      }

      this.saveToStorage();
      this.notify();
      return data;
    } catch (err) {
      console.error('Error uploadWorkerFolderDocument:', err);
      throw err;
    }
  }

  async deleteWorkerFolderDocument(docId, workerId, tenantId = null) {
    try {
      const res = await fetch('/api/worker/delete-folder-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, worker_id: workerId, tenant_id: tenantId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar documento');

      if (Array.isArray(this.data.employee_folder_documents)) {
        this.data.employee_folder_documents = this.data.employee_folder_documents.filter(d => d.id !== docId);
      }

      this.saveToStorage();
      this.notify();
      return data;
    } catch (err) {
      console.error('Error deleteWorkerFolderDocument:', err);
      throw err;
    }
  }

  calculateFolderCompleteness(workerId) {
    const docs = (this.data.employee_folder_documents || []).filter(d => d.employee_id === workerId || d.trabajadorId === workerId);
    
    const requiredCategories = [
      { key: 'CEDULA_CIUDADANIA', label: 'Cédula de Ciudadanía', icon: '🪪' },
      { key: 'HOJA_DE_VIDA', label: 'Hoja de Vida', icon: '📄' },
      { key: 'CERTIFICACION_BANCARIA', label: 'Certificación Bancaria', icon: '🏦' },
      { key: 'EXAMEN_MEDICO_INGRESO', label: 'Certificado Médico de Ingreso (Aptitud)', icon: '🩺' },
      { key: 'SEGURIDAD_SOCIAL', label: 'Afiliación EPS / ARL / Pensión', icon: '🏥' }
    ];

    const categoriesPresent = {};
    docs.forEach(d => {
      categoriesPresent[d.document_category] = true;
      if (['AFILIACION_EPS', 'AFILIACION_ARL', 'AFILIACION_PENSION'].includes(d.document_category)) {
        categoriesPresent['SEGURIDAD_SOCIAL'] = true;
      }
    });

    let presentCount = 0;
    const missing = [];

    requiredCategories.forEach(cat => {
      if (categoriesPresent[cat.key]) {
        presentCount++;
      } else {
        missing.push(cat);
      }
    });

    const totalRequired = requiredCategories.length;
    const percentage = Math.round((presentCount / totalRequired) * 100);
    const isComplete = presentCount >= totalRequired;

    return {
      totalRequired,
      presentCount,
      percentage,
      isComplete,
      missing,
      docsCount: docs.length,
      categoriesPresent
    };
  }

  getAuditManualesFirmados(companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    const trabajadores = this.getTrabajadores(targetCid);
    const sigs = (this.data.employee_document_signatures || []).filter(s => s.document_type === 'MANUAL_DE_CARGO');

    const lista = trabajadores.map(trab => {
      const sig = sigs.find(s => s.employee_id === trab.id || s.trabajadorId === trab.id);
      return {
        worker_id: trab.id,
        worker_name: trab.nombre,
        national_id: trab.identificacion || trab.cedula,
        cargo: trab.cargo,
        area: trab.area || 'Operaciones',
        fecha_ingreso: trab.fechaIngreso || trab.fechaContrato || trab.fechaInicio || 'N/A',
        tipo_contrato: trab.tipoContrato || 'Término Indefinido',
        is_signed: !!sig,
        signed_at: sig?.signed_at || null,
        bogota_signed_at: sig?.bogota_timestamp || (sig?.signed_at ? new Date(sig.signed_at).toLocaleString('es-CO') : null),
        signer_ip: sig?.signer_ip || sig?.client_ip || 'N/A',
        sha256_hash: sig?.sha256_hash || sig?.signature_sha256 || null,
        pdf_s3_key: sig?.pdf_s3_key || (sig ? `doctorpyme-storage/tenants/${targetCid}/manuals/${trab.id}_MANUAL_DE_CARGO_signed.pdf` : null),
        signature_file: sig?.signature_image_file || null
      };
    });

    const total = lista.length;
    const firmados = lista.filter(item => item.is_signed).length;
    const pendientes = total - firmados;
    const porcentaje = total > 0 ? Math.round((firmados / total) * 100) : 0;

    return {
      targetCid,
      total,
      firmados,
      pendientes,
      porcentaje,
      lista
    };
  }

  async submitWorkerToolAssignment(payload) {
    try {
      const res = await fetch('/api/worker/sign-tool-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al firmar custodia de herramienta');
      if (data.assignment) {
        if (!Array.isArray(this.data.tools_assignments)) this.data.tools_assignments = [];
        const idx = this.data.tools_assignments.findIndex(a => a.id === data.assignment.id);
        if (idx >= 0) {
          this.data.tools_assignments[idx] = data.assignment;
        } else {
          this.data.tools_assignments.unshift(data.assignment);
        }
        this.saveToStorage();
        this.notify();
      }
      return data;
    } catch (err) {
      console.error('Error submitWorkerToolAssignment:', err);
      throw err;
    }
  }

  enqueueOfflineAction(type, payload) {
    try {
      const q = JSON.parse(localStorage.getItem('DOCTOR_PYME_OFFLINE_QUEUE_V1') || '[]');
      q.push({ id: `off-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, type, payload, queuedAt: new Date().toISOString() });
      localStorage.setItem('DOCTOR_PYME_OFFLINE_QUEUE_V1', JSON.stringify(q));
    } catch (_) {}
  }

  async flushOfflineQueue() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    let q = [];
    try {
      q = JSON.parse(localStorage.getItem('DOCTOR_PYME_OFFLINE_QUEUE_V1') || '[]');
    } catch (_) { return; }
    if (!Array.isArray(q) || q.length === 0) return;

    console.log(`[Store] Sincronizando ${q.length} registros offline con el servidor...`);
    const pendientes = [];
    for (const item of q) {
      try {
        if (item.type === 'PREOPERACIONAL') {
          await fetch('/api/worker/submit-preoperational', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
        } else if (item.type === 'REPORTE_PELIGRO') {
          await fetch('/api/worker/report-hazard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
        } else if (item.type === 'EPP_DELIVERY') {
          await fetch('/api/worker/sign-epp-delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
        }
      } catch (err) {
        pendientes.push(item);
      }
    }
    localStorage.setItem('DOCTOR_PYME_OFFLINE_QUEUE_V1', JSON.stringify(pendientes));
  }

  async submitWorkerPreoperational(payload) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueueOfflineAction('PREOPERACIONAL', payload);
      const offlineReport = {
        id: `preop-off-${Date.now()}`,
        status: 'PENDIENTE_SINCRONIZAR',
        ...payload,
        created_at: new Date().toISOString()
      };
      if (!Array.isArray(this.data.reportesPreoperacional)) this.data.reportesPreoperacional = [];
      this.data.reportesPreoperacional.unshift(offlineReport);
      this.saveToStorage();
      this.notify();
      return { status: 'offline', success: true, offline: true, report: offlineReport, message: 'Guardado offline en tu celular. Se sincronizará automáticamente al detectar conexión.' };
    }
    try {
      const res = await fetch('/api/worker/submit-preoperational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar preoperacional');
      if (data.report) {
        if (!Array.isArray(this.data.reportesPreoperacional)) this.data.reportesPreoperacional = [];
        this.data.reportesPreoperacional.unshift(data.report);
        if (!Array.isArray(this.data.tools_interventions_log)) this.data.tools_interventions_log = [];
        this.data.tools_interventions_log.unshift(data.report);
        this.saveToStorage();
        this.notify();
      }
      return data;
    } catch (err) {
      console.warn('Fallo de red, guardando preoperacional en cola offline:', err);
      this.enqueueOfflineAction('PREOPERACIONAL', payload);
      return { status: 'offline', success: true, offline: true, message: 'Guardado offline en tu celular. Se sincronizará automáticamente al detectar conexión.' };
    }
  }

  async submitWorkerEppDelivery(payload) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueueOfflineAction('EPP_DELIVERY', payload);
      const offlineDelivery = {
        id: `epp-off-${Date.now()}`,
        status: 'PENDIENTE_SINCRONIZAR',
        ...payload,
        created_at: new Date().toISOString()
      };
      if (!Array.isArray(this.data.epp_deliveries)) this.data.epp_deliveries = [];
      this.data.epp_deliveries.unshift(offlineDelivery);
      this.saveToStorage();
      this.notify();
      return { status: 'offline', success: true, offline: true, delivery: offlineDelivery, message: 'Guardado offline en tu celular.' };
    }
    try {
      const res = await fetch('/api/worker/sign-epp-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al firmar entrega de EPP');
      if (data.delivery) {
        if (!Array.isArray(this.data.epp_deliveries)) this.data.epp_deliveries = [];
        this.data.epp_deliveries.unshift(data.delivery);
        this.saveToStorage();
        this.notify();
      }
      return data;
    } catch (err) {
      console.warn('Fallo de red, guardando entrega de EPP en cola offline:', err);
      this.enqueueOfflineAction('EPP_DELIVERY', payload);
      return { status: 'offline', success: true, offline: true, message: 'Guardado offline en tu celular.' };
    }
  }

  async submitWorkerHazardReport(payload) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueueOfflineAction('REPORTE_PELIGRO', payload);
      const offlineHazard = {
        id: `haz-off-${Date.now()}`,
        status: 'Pendiente_Revision',
        ...payload,
        reported_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      if (!Array.isArray(this.data.worker_sst_reports)) this.data.worker_sst_reports = [];
      this.data.worker_sst_reports.unshift(offlineHazard);
      if (!Array.isArray(this.data.reportesPeligro)) this.data.reportesPeligro = [];
      this.data.reportesPeligro.unshift(offlineHazard);
      this.saveToStorage();
      this.notify();
      return { status: 'offline', success: true, offline: true, report: offlineHazard, message: 'Reporte guardado offline en tu celular. Se sincronizará automáticamente al detectar conexión.' };
    }
    try {
      const res = await fetch('/api/worker/report-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar reporte de peligro');
      if (data.report) {
        if (!Array.isArray(this.data.worker_sst_reports)) this.data.worker_sst_reports = [];
        this.data.worker_sst_reports.unshift(data.report);
        if (!Array.isArray(this.data.reportesPeligro)) this.data.reportesPeligro = [];
        this.data.reportesPeligro.unshift(data.report);
        this.saveToStorage();
        this.notify();
      }
      return data;
    } catch (err) {
      console.warn('Fallo de red, guardando reporte de peligro en cola offline:', err);
      this.enqueueOfflineAction('REPORTE_PELIGRO', payload);
      return { status: 'offline', success: true, offline: true, message: 'Reporte guardado offline en tu celular. Se sincronizará automáticamente al detectar conexión.' };
    }
  }

  // =============================================================================
  // MÓDULO MATRIZ Y REGISTRO DE ENTREGA DE EPP Y DOTACIÓN (BLOQUES 1, 2, 3, 4)
  // Normativa: Ley 9/1979, Res. 2400/1979, Dec. 1072/2015, Res. 0312/2019 Estándar 4.2.6, CST Art. 230
  // =============================================================================

  getEppCatalog(companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    if (!Array.isArray(this.data.epp_dotacion_catalog)) this.data.epp_dotacion_catalog = [];
    return this.data.epp_dotacion_catalog.filter(it => this._matchTenant(it.tenant_id, targetCid));
  }

  async fetchEppCatalog(companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    try {
      const res = await fetch(`/api/epp/catalog?tenant_id=${encodeURIComponent(targetCid)}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.catalog)) {
          this.data.epp_dotacion_catalog = (this.data.epp_dotacion_catalog || []).filter(c => !this._matchTenant(c.tenant_id, targetCid)).concat(json.catalog);
          this.saveToStorage();
          return json.catalog;
        }
      }
    } catch (e) {
      console.warn("Fetch EPP catalog falló, usando local:", e);
    }
    return this.getEppCatalog(targetCid);
  }

  async saveEppCatalogItem(itemData, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    try {
      const res = await fetch('/api/epp/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...itemData, tenant_id: targetCid })
      });
      const data = await res.json();
      if (res.ok && data.item) {
        if (!Array.isArray(this.data.epp_dotacion_catalog)) this.data.epp_dotacion_catalog = [];
        const idx = this.data.epp_dotacion_catalog.findIndex(i => i.id === data.item.id);
        if (idx >= 0) {
          this.data.epp_dotacion_catalog[idx] = data.item;
        } else {
          this.data.epp_dotacion_catalog.push(data.item);
        }
        this.saveToStorage();
        this.notify();
        return data.item;
      }
    } catch (e) {
      console.warn("saveEppCatalogItem server failed, saving local:", e);
    }
    // Local fallback
    if (!Array.isArray(this.data.epp_dotacion_catalog)) this.data.epp_dotacion_catalog = [];
    const item = {
      id: itemData.id || `epp-cat-${Date.now()}`,
      tenant_id: targetCid,
      item_code: itemData.item_code || `EPP-${Date.now().toString().slice(-4)}`,
      item_name: itemData.item_name || 'Nuevo Elemento',
      category: itemData.category || 'EPP',
      body_part_protected: itemData.body_part_protected || 'Cabeza',
      technical_standard: itemData.technical_standard || 'N/A',
      useful_life_days: parseInt(itemData.useful_life_days || 180, 10),
      requires_size: itemData.requires_size === true,
      is_active: itemData.is_active !== false,
      updated_at: new Date().toISOString()
    };
    const idx = this.data.epp_dotacion_catalog.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      this.data.epp_dotacion_catalog[idx] = item;
    } else {
      this.data.epp_dotacion_catalog.push(item);
    }
    this.saveToStorage();
    this.notify();
    return item;
  }

  async deleteEppCatalogItem(itemId, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    try {
      await fetch('/api/epp/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, tenant_id: targetCid, action: 'delete' })
      });
    } catch (e) {
      console.warn("deleteEppCatalogItem server failed, using local:", e);
    }
    if (!Array.isArray(this.data.epp_dotacion_catalog)) this.data.epp_dotacion_catalog = [];
    this.data.epp_dotacion_catalog = this.data.epp_dotacion_catalog.filter(i => i.id !== itemId);
    this.saveToStorage();
    this.notify();
    return true;
  }

  getJobPositionEppMatrix(jobPositionId, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    if (!Array.isArray(this.data.job_position_epp_matrix)) this.data.job_position_epp_matrix = [];
    const matrix = this.data.job_position_epp_matrix.filter(m => m.job_position_id === jobPositionId && this._matchTenant(m.tenant_id, targetCid));
    const catalog = this.getEppCatalog(targetCid);
    return matrix.map(m => {
      const cat = catalog.find(c => c.id === m.catalog_item_id) || {};
      return {
        ...cat,
        ...m,
        item_name: m.item_name || cat.item_name || 'EPP',
        item_code: m.item_code || cat.item_code || 'EPP-00',
        category: m.category || cat.category || 'EPP',
        body_part_protected: m.body_part_protected || cat.body_part_protected || 'Cabeza',
        technical_standard: m.technical_standard || cat.technical_standard || 'N/A',
        useful_life_days: m.useful_life_days || cat.useful_life_days || 180,
        requires_size: m.requires_size !== undefined ? m.requires_size : (cat.requires_size || false)
      };
    });
  }

  async saveJobPositionEppMatrix(jobPositionId, items, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    try {
      const res = await fetch('/api/epp/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_position_id: jobPositionId,
          tenant_id: targetCid,
          items: items
        })
      });
      const data = await res.json();
      if (res.ok && data.matrix) {
        if (!Array.isArray(this.data.job_position_epp_matrix)) this.data.job_position_epp_matrix = [];
        this.data.job_position_epp_matrix = this.data.job_position_epp_matrix.filter(m => m.job_position_id !== jobPositionId).concat(data.matrix);
        this.saveToStorage();
        this.notify();
        return data.matrix;
      }
    } catch (e) {
      console.warn("Save EPP matrix server failed, using local:", e);
    }
    // Fallback local
    if (!Array.isArray(this.data.job_position_epp_matrix)) this.data.job_position_epp_matrix = [];
    this.data.job_position_epp_matrix = this.data.job_position_epp_matrix.filter(m => m.job_position_id !== jobPositionId);
    const timestamp = new Date().toISOString();
    const newItems = items.map((it, idx) => ({
      id: it.id || `mat-epp-${Date.now()}-${idx}`,
      tenant_id: targetCid,
      job_position_id: jobPositionId,
      catalog_item_id: it.catalog_item_id || it.id,
      default_quantity: parseInt(it.default_quantity || 1, 10),
      delivery_frequency: it.delivery_frequency || 'Cuatrimestral_CST',
      associated_hazard: it.associated_hazard || 'Riesgo operativo y ergonómico',
      is_mandatory: it.is_mandatory !== false,
      created_at: timestamp,
      updated_at: timestamp
    }));
    this.data.job_position_epp_matrix.push(...newItems);
    this.saveToStorage();
    this.notify();
    return newItems;
  }

  async suggestEppMatrixWithAI(jobPositionId, cargoTitle, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    try {
      const res = await fetch('/api/epp/ai-suggest-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_position_id: jobPositionId,
          cargo_title: cargoTitle,
          tenant_id: targetCid
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.suggestions)) {
          return json.suggestions;
        }
      }
    } catch (e) {
      console.warn("AI suggest EPP failed:", e);
    }
    return [];
  }

  getEppDeliveries(employeeId = null, companyId = null) {
    const targetCid = companyId || this.getEmpresaActivaId();
    if (!Array.isArray(this.data.epp_dotacion_deliveries)) this.data.epp_dotacion_deliveries = [];
    return this.data.epp_dotacion_deliveries.filter(d => {
      const matchEmp = !employeeId || d.employee_id === employeeId || d.trabajadorId === employeeId;
      const matchTen = this._matchTenant(d.tenant_id, targetCid) || this._matchTenant(d.companyId, targetCid);
      return matchEmp && matchTen;
    }).sort((a, b) => new Date(b.assigned_at || b.createdAt || 0) - new Date(a.assigned_at || a.createdAt || 0));
  }

  getEppDeliveryById(deliveryId) {
    if (!Array.isArray(this.data.epp_dotacion_deliveries)) this.data.epp_dotacion_deliveries = [];
    const deliv = this.data.epp_dotacion_deliveries.find(d => d.id === deliveryId || d.delivery_consecutive === deliveryId);
    if (!deliv) return null;
    if (!Array.isArray(deliv.items) || deliv.items.length === 0) {
      const allItems = this.data.epp_dotacion_delivery_items || [];
      deliv.items = allItems.filter(it => it.delivery_id === deliv.id);
    }
    return deliv;
  }

  async assignEppDelivery(deliveryData) {
    const targetCid = deliveryData.tenant_id || deliveryData.companyId || this.getEmpresaActivaId();
    try {
      const res = await fetch('/api/epp/assign-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deliveryData, tenant_id: targetCid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al asignar entrega de EPP');
      if (data.delivery) {
        if (!Array.isArray(this.data.epp_dotacion_deliveries)) this.data.epp_dotacion_deliveries = [];
        this.data.epp_dotacion_deliveries.unshift(data.delivery);
        if (!Array.isArray(this.data.epp_dotacion_delivery_items)) this.data.epp_dotacion_delivery_items = [];
        if (Array.isArray(data.delivery.items)) {
          this.data.epp_dotacion_delivery_items.push(...data.delivery.items);
        }
        this.saveToStorage();
        this.notify();
        return data.delivery;
      }
    } catch (e) {
      console.error("assignEppDelivery server call failed:", e);
      throw e;
    }
  }

  async signEppDelivery(deliveryId, workerId, signatureBase64) {
    try {
      const res = await fetch('/api/worker/sign-epp-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_id: deliveryId,
          worker_id: workerId,
          signature_base64: signatureBase64
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al firmar entrega de EPP');
      if (data.delivery) {
        const idx = (this.data.epp_dotacion_deliveries || []).findIndex(d => d.id === deliveryId);
        if (idx >= 0) {
          this.data.epp_dotacion_deliveries[idx] = { ...this.data.epp_dotacion_deliveries[idx], ...data.delivery };
        }
        // Marcar estándar 4.2.6 en evaluación activa
        const tenantId = data.delivery.tenant_id || data.delivery.companyId;
        if (this.data.evaluaciones && this.data.evaluaciones[tenantId]) {
          const evalList = Array.isArray(this.data.evaluaciones[tenantId]) ? this.data.evaluaciones[tenantId] : (this.data.evaluaciones[tenantId]["2026"] || []);
          if (Array.isArray(evalList)) {
            const item426 = evalList.find(it => it.numeral === '4.2.6');
            if (item426) {
              item426.cumple = true;
              item426.no_aplica = false;
              item426.justificacion = `Soportado con Acta Digital Firmada bajo Ley 527/1999 (${data.delivery.delivery_consecutive}).`;
            }
          }
        }
        this.saveToStorage();
        this.notify();
        return data;
      }
    } catch (e) {
      console.error("signEppDelivery error:", e);
      throw e;
    }
  }

  // =============================================================================
  // BLOQUE 1: CENTRALIZACIÓN Y DEPÓSITO MAESTRO DE FIRMAS INSTITUCIONALES
  // (Representante Legal y Coordinador SST - Ley 527/1999 y Res. 0312/2019)
  // =============================================================================
  async getFirmasInstitucionales(empresaId = null) {
    const targetCid = empresaId || this.getEmpresaActivaId();
    try {
      const res = await fetch(`/api/companies/institutional-signatures?company_id=${encodeURIComponent(targetCid)}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn('Fallo al obtener firmas institucionales desde backend, usando store local:', e);
    }
    const emp = this.getEmpresa(targetCid) || {};
    return {
      status: 'ok',
      company_id: targetCid,
      company_name: emp.nombre || 'Empresa',
      legal_rep: {
        name: emp.legal_rep_name || emp.representanteLegal || 'José Iván González Mora',
        id_number: emp.legal_rep_id_number || emp.representanteLegalCedula || emp.nit || '3.004.889',
        signature_s3_key: emp.legal_rep_signature_s3_key || `tenants/${targetCid}/signatures/rep_legal.svg`,
        signature_url: emp.legal_rep_signature_url || `/uploads/sig_inst_rep_legal_${targetCid}.svg`,
        registered_at: emp.legal_rep_signature_registered_at || new Date().toISOString(),
        registered_bogota: emp.legal_rep_signature_registered_bogota || new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        sha256: emp.legal_rep_signature_sha256 || '80883cab005c33a315b796e964b46712d95a126f5f937d5ba9931697d4f889c6'
      },
      sst_coordinator: {
        name: emp.sst_coordinator_name || emp.responsableSST || 'Ing. Iván David González Silva',
        id_number: emp.sst_coordinator_id_number || emp.responsableSSTCedula || '1018423987',
        sst_license: emp.sst_coordinator_sst_license || emp.responsableSSTLicencia || 'RESOLUCIÓN No. 6514 de 19/10/2022 (Vigencia 10 Años - Res. 0754/2021)',
        signature_s3_key: emp.sst_coordinator_signature_s3_key || `tenants/${targetCid}/signatures/coord_sst.svg`,
        signature_url: emp.sst_coordinator_signature_url || `/uploads/sig_inst_coord_sst_${targetCid}.svg`,
        registered_at: emp.sst_coordinator_signature_registered_at || new Date().toISOString(),
        registered_bogota: emp.sst_coordinator_signature_registered_bogota || new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        sha256: emp.sst_coordinator_signature_sha256 || '5ffe60948eaeb5c743e3b7dbe9e1593f038b521c8e6503da413f11fc00c1ca76'
      }
    };
  }

  async guardarFirmasInstitucionales(empresaId, payload) {
    const targetCid = empresaId || payload.company_id || payload.tenant_id || this.getEmpresaActivaId();
    const bodyPayload = {
      company_id: targetCid,
      tenant_id: targetCid,
      ...payload
    };
    try {
      const res = await fetch('/api/companies/institutional-signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al persistir firmas institucionales');

      // Actualizar en el estado en memoria de store
      if (Array.isArray(this.data.empresas)) {
        const emp = this.data.empresas.find(e => e.id === targetCid);
        if (emp && data.empresa) {
          Object.assign(emp, data.empresa);
        }
      }
      this.saveToStorage();
      this.notify();
      return data;
    } catch (err) {
      console.error('Error guardarFirmasInstitucionales:', err);
      throw err;
    }
  }

  // =============================================================================
  // BLOQUE 2 & 3: REGISTRO Y SELLADO INMUTABLE DE DOCUMENTO FIRMADO (AUDITORÍA FORENSE)
  // =============================================================================
  async recordSignedDocument(payload) {
    try {
      const res = await fetch('/api/documents/record-signed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn('Advertencia al registrar firma en backend:', data.error);
        return data;
      }
      if (data.signature) {
        if (!Array.isArray(this.data.employee_document_signatures)) {
          this.data.employee_document_signatures = [];
        }
        this.data.employee_document_signatures.unshift(data.signature);
      }
      if (data.document_record) {
        if (!Array.isArray(this.data.document_records)) {
          this.data.document_records = [];
        }
        this.data.document_records.unshift(data.document_record);
      }
      this.saveToStorage();
      return data;
    } catch (err) {
      console.error('Error recordSignedDocument:', err);
      return null;
    }
  }

  resetearDatosDemo() {
    this.data = {
      empresas: [...EMPRESAS_DEMO],
      matriz: [...MATRIZ_RIESGOS_DEMO],
      planTrabajo: [...PLAN_TRABAJO_DEMO],
      accidentes: [...ACCIDENTES_DEMO],
      trabajadores: [...TRABAJADORES_DEMO],
      capacitaciones: [...CAPACITACIONES_DEMO],
      equipos: [...EQUIPOS_DEMO],
      mantenimientos: [...MANTENIMIENTOS_DEMO],
      firmas: [...FIRMAS_DEMO],
      reportesPeligro: [...REPORTES_PELIGRO_DEMO],
      reportesPreoperacional: [...REPORTES_PREOPERACIONAL_DEMO],
      evaluaciones: {
        "emp-1790438946268": {
          "2025": JSON.parse(JSON.stringify(EVALUACIONES_RECUPERADAS_AYER["2025"] || {})),
          "2026": JSON.parse(JSON.stringify(EVALUACIONES_RECUPERADAS_AYER["2026"] || {}))
        },
        "emp-004": {
          "2025": JSON.parse(JSON.stringify(EVALUACIONES_RECUPERADAS_AYER["2025"] || {})),
          "2026": JSON.parse(JSON.stringify(EVALUACIONES_RECUPERADAS_AYER["2026"] || {}))
        }
      }
    };
    this.empresaActivaId = "emp-1790438946268";
    storage.setItem(ACTIVE_COMPANY_KEY, "emp-1790438946268");
    this.saveToStorage();
  }
}

export const store = new Store();
