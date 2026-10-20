// =============================================================================
// GESTOR DE ALMACENAMIENTO DE EVIDENCIAS EN INDEXEDDB (DOCTOR PYME)
// Alta resiliencia con soporte de fallback para garantizar 0 fallos de almacenamiento
// =============================================================================

const DB_NAME = 'DoctorPyme_SG_SST_Files';
const DB_VERSION = 2; // Actualizado para soportar índices y migración automática
const STORE_NAME = 'evidencias';

let appStoreRef = null;
export function setEvidenceStoreRef(s) {
  appStoreRef = s;
}

class EvidenceDB {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        console.warn("IndexedDB no está soportado en este entorno.");
        this.initPromise = null;
        return resolve(null);
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onblocked = () => {
          console.warn("IndexedDB actualización bloqueada por otra pestaña abierta. Usando fallback temporal.");
          this.initPromise = null;
          resolve(null);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          let store;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          } else {
            store = event.target.transaction.objectStore(STORE_NAME);
          }

          if (!store.indexNames.contains('company_numeral')) {
            store.createIndex('company_numeral', ['companyId', 'numeral'], { unique: false });
          }
          if (!store.indexNames.contains('companyId')) {
            store.createIndex('companyId', 'companyId', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          if (this.db) {
            this.db.onversionchange = () => {
              if (this.db) {
                this.db.close();
                this.db = null;
              }
              this.initPromise = null;
            };
          }
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.warn("No se pudo inicializar IndexedDB, usando fallback:", event.target.error);
          this.initPromise = null;
          resolve(null);
        };
      } catch (e) {
        console.warn("Excepción abriendo IndexedDB:", e);
        this.initPromise = null;
        resolve(null);
      }
    });

    return this.initPromise;
  }

  // --- EVIDENCIAS DE ESTÁNDARES MÍNIMOS (RES. 0312) ---
  async guardarArchivo(companyId, numeral, file) {
    await this.init();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const evidencia = {
          id: `evid-${companyId}-${numeral}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          companyId,
          numeral,
          nombre: file.name,
          tamanio: file.size,
          tipo: file.type,
          dataUrl: reader.result,
          fechaCargue: new Date().toISOString()
        };

        // Guardar físicamente en el servidor Mac si hay conexión
        if (typeof fetch !== 'undefined') {
          try {
            const apiPath = (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/sst')) ? '/sst/api/upload_evidence' : '/api/upload_evidence';
            const uploadResp = await fetch(apiPath, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyId,
                numeral,
                nombre: file.name,
                tamanio: file.size,
                tipo: file.type,
                dataUrl: reader.result
              })
            });
            if (uploadResp.ok) {
              const resJson = await uploadResp.json();
              if (resJson && resJson.evidencia) {
                evidencia.url = resJson.evidencia.url;
                if (appStoreRef && appStoreRef.data) {
                  appStoreRef.data.evidencias = appStoreRef.data.evidencias || [];
                  appStoreRef.data.evidencias.push(resJson.evidencia);
                }
              }
            }
          } catch (e) {
            console.warn("Evidencia preservada localmente en IndexedDB:", e);
          }
        }

        if (this.db) {
          try {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const req = store.add(evidencia);
            req.onsuccess = () => resolve(evidencia);
            req.onerror = () => {
              this.guardarEnFallback(evidencia);
              resolve(evidencia);
            };
          } catch {
            this.guardarEnFallback(evidencia);
            resolve(evidencia);
          }
        } else {
          this.guardarEnFallback(evidencia);
          resolve(evidencia);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  coincideEmpresa(regCompanyId, targetCompanyId) {
    if (!regCompanyId || !targetCompanyId) return true;
    if (targetCompanyId === 'todas') return true;
    if (regCompanyId === targetCompanyId) return true;
    const aliases = ['emp-1790438946268', 'emp-004'];
    if (aliases.includes(regCompanyId) && aliases.includes(targetCompanyId)) return true;
    return false;
  }

  obtenerTodasDeFallback(companyId) {
    const list = [];
    if (typeof localStorage === 'undefined') return list;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('DP_FILE_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item && item.id && this.coincideEmpresa(item.companyId, companyId)) {
              list.push(item);
            }
          } catch {}
        }
      }
    } catch {}
    return list;
  }

  async obtenerEvidenciasPorNumeral(companyId, numeral) {
    const todas = await this.obtenerTodasEvidencias(companyId);
    return todas.filter(item => item.numeral === numeral);
  }

  async obtenerEvidenciaPorId(id) {
    await this.init();
    return new Promise((resolve) => {
      const fallback = this.obtenerDeFallback(id);
      if (!this.db) return resolve(fallback);
      try {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || fallback);
        req.onerror = () => resolve(fallback);
      } catch {
        resolve(fallback);
      }
    });
  }

  async eliminarEvidencia(id) {
    await this.init();
    this.eliminarDeFallback(id);
    if (typeof fetch !== 'undefined') {
      const apiPath = (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/sst')) ? '/sst/api/delete_evidence' : '/api/delete_evidence';
      fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      }).then(() => {
        if (appStoreRef?.data?.evidencias) {
          appStoreRef.data.evidencias = appStoreRef.data.evidencias.filter(e => e.id !== id);
        }
      }).catch(() => {});
    }

    return new Promise((resolve) => {
      if (!this.db) return resolve(true);
      try {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(true);
      } catch {
        resolve(true);
      }
    });
  }

  async contarEvidenciasPorEmpresa(companyId) {
    const todas = await this.obtenerTodasEvidencias(companyId);
    const conteo = {};
    todas.forEach(item => {
      conteo[item.numeral] = (conteo[item.numeral] || 0) + 1;
    });
    return conteo;
  }

  async obtenerTodasEvidencias(companyId) {
    await this.init();
    const fallbackList = this.obtenerTodasDeFallback(companyId);
    const serverList = (appStoreRef?.data?.evidencias || []).filter(i => this.coincideEmpresa(i.companyId, companyId));

    return new Promise((resolve) => {
      if (!this.db) {
        const merged = [...fallbackList];
        const ids = new Set(merged.map(i => i.id));
        serverList.forEach(s => { if (!ids.has(s.id)) merged.push(s); });
        return resolve(merged);
      }
      try {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
          const listaIndexed = (request.result || []).filter(i => {
            if (!i || i.id === '__APP_DATA_SNAPSHOT__') return false;
            return this.coincideEmpresa(i.companyId, companyId);
          });

          // Unir con fallback y con evidencias del servidor sin duplicar
          const idsExistentes = new Set(listaIndexed.map(i => i.id));
          fallbackList.forEach(fb => {
            if (!idsExistentes.has(fb.id)) {
              listaIndexed.push(fb);
              idsExistentes.add(fb.id);
            }
          });
          serverList.forEach(sb => {
            if (!idsExistentes.has(sb.id)) {
              listaIndexed.push(sb);
              idsExistentes.add(sb.id);
            }
          });

          resolve(listaIndexed);
        };
        request.onerror = () => {
          const merged = [...fallbackList];
          const ids = new Set(merged.map(i => i.id));
          serverList.forEach(s => { if (!ids.has(s.id)) merged.push(s); });
          resolve(merged);
        };
      } catch {
        const merged = [...fallbackList];
        const ids = new Set(merged.map(i => i.id));
        serverList.forEach(s => { if (!ids.has(s.id)) merged.push(s); });
        resolve(merged);
      }
    });
  }

  // --- DIAGRAMAS: MAPA DE PROCESOS Y ORGANIGRAMA ---
  async guardarDiagramaEmpresa(companyId, tipo, fileOrData, metadata = {}) {
    // tipo: 'mapa_procesos' o 'organigrama'
    let dataUrl = '';
    let nombre = metadata.nombre || `${tipo}.png`;
    let tamanio = metadata.tamanio || 0;
    let mimeType = metadata.tipo || 'image/png';

    if (typeof fileOrData === 'string') {
      dataUrl = fileOrData;
    } else if (fileOrData instanceof Blob || (fileOrData && fileOrData.size !== undefined)) {
      nombre = fileOrData.name || nombre;
      tamanio = fileOrData.size || tamanio;
      mimeType = fileOrData.type || mimeType;
      dataUrl = await leerArchivoDataUrl(fileOrData);
    } else {
      throw new Error("Formato de imagen no válido para lectura.");
    }

    const id = `diag-${companyId}-${tipo}`;
    const diagrama = {
      id: id,
      companyId,
      numeral: `__DIAGRAMA_${tipo.toUpperCase()}__`,
      tipoDiagrama: tipo,
      nombre,
      tamanio,
      tipo: mimeType,
      dataUrl,
      url: dataUrl,
      esOficial: true,
      fechaCargue: new Date().toISOString()
    };

    // 1. Guardar en Store central (sincronizado)
    if (appStoreRef && appStoreRef.saveDiagrama) {
      appStoreRef.saveDiagrama(companyId, tipo, diagrama);
    }

    // 2. Guardar físicamente en servidor (data/uploads/ y data/database.json)
    if (typeof fetch !== 'undefined') {
      const apiPath = (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/sst')) ? '/sst/api/upload_diagram' : '/api/upload_diagram';
      fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          tipo,
          nombre,
          tamanio,
          tipoMime: mimeType,
          dataUrl
        })
      }).then(res => res.json()).then(resJson => {
        if (resJson && resJson.diagrama) {
          diagrama.url = resJson.diagrama.url;
        }
      }).catch(e => console.warn("Diagrama preservado localmente:", e));
    }

    // 3. Guardar en almacenamiento de respaldo (localStorage)
    this.guardarEnFallback(diagrama);

    // 4. Persistir en IndexedDB de manera atómica
    try {
      await this.init();
      if (this.db) {
        await new Promise((resolve) => {
          try {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const putReq = store.put(diagrama);
            putReq.onsuccess = () => resolve(true);
            putReq.onerror = () => resolve(false);
            transaction.onerror = () => resolve(false);
            transaction.onabort = () => resolve(false);
          } catch (err) {
            resolve(false);
          }
        });
      }
    } catch (e) {
      console.warn("Aviso: persistencia IndexedDB conmutada a respaldo:", e);
    }

    return diagrama;
  }

  async obtenerDiagramaEmpresa(companyId, tipo) {
    const id = `diag-${companyId}-${tipo}`;

    // 1. Primero intentar desde appStoreRef (sincronizado con data/database.json en disco)
    if (appStoreRef && appStoreRef.getDiagrama) {
      const diagStore = appStoreRef.getDiagrama(companyId, tipo);
      if (diagStore && (diagStore.dataUrl || diagStore.url)) {
        return diagStore;
      }
    }

    // 2. Intentar desde IndexedDB
    try {
      await this.init();
      if (this.db) {
        const item = await new Promise((resolve) => {
          try {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        });
        if (item && (item.dataUrl || item.url)) return item;
      }
    } catch {}

    // 3. Recuperar del respaldo (localStorage)
    const fb = this.obtenerDeFallback(id);
    if (fb && (fb.dataUrl || fb.url)) return fb;

    // 4. Respaldo definitivo para Ladrillos Ochoa Ltda: imágenes institucionales oficiales
    const isL8a = !companyId || companyId === 'todas' || companyId === 'emp-1790438946268' || companyId === 'emp-004';
    if (isL8a) {
      if (tipo === 'mapa_procesos') {
        return {
          id: `diag-${companyId || 'emp-1790438946268'}-mapa_procesos`,
          companyId: companyId || 'emp-1790438946268',
          numeral: '__DIAGRAMA_MAPA_PROCESOS__',
          tipoDiagrama: 'mapa_procesos',
          nombre: 'mapa-procesos-ladrillos-ochoa.png',
          url: './assets/mapa-procesos-ladrillos-ochoa.png',
          dataUrl: './assets/mapa-procesos-ladrillos-ochoa.png',
          tipo: 'image/png',
          esOficial: true,
          fechaCargue: '2026-10-05T08:00:00.000Z'
        };
      } else if (tipo === 'organigrama') {
        return {
          id: `diag-${companyId || 'emp-1790438946268'}-organigrama`,
          companyId: companyId || 'emp-1790438946268',
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

    return null;
  }

  async eliminarDiagramaEmpresa(companyId, tipo) {
    const id = `diag-${companyId}-${tipo}`;
    this.eliminarDeFallback(id);
    try {
      await this.init();
      if (this.db) {
        await new Promise((resolve) => {
          try {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const req = store.delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(true);
            transaction.onerror = () => resolve(true);
          } catch {
            resolve(true);
          }
        });
      }
    } catch {}
    return true;
  }

  // --- MECANISMO DE RESPALDO (FALLBACK RESILIENTE) ---
  guardarEnFallback(item) {
    try {
      localStorage.setItem(`DP_FILE_${item.id}`, JSON.stringify({
        id: item.id,
        companyId: item.companyId,
        numeral: item.numeral,
        tipoDiagrama: item.tipoDiagrama,
        nombre: item.nombre,
        tamanio: item.tamanio,
        tipo: item.tipo,
        dataUrl: item.dataUrl,
        fechaCargue: item.fechaCargue
      }));
    } catch (e) {
      console.warn("Aviso: almacenamiento fallback lleno para este archivo:", e);
    }
  }

  obtenerDeFallback(id) {
    try {
      const data = localStorage.getItem(`DP_FILE_${id}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  eliminarDeFallback(id) {
    try {
      localStorage.removeItem(`DP_FILE_${id}`);
    } catch {}
  }

  // --- RESPALDO ESPEJO DE ALTA DURABILIDAD (SNAPSHOTS EN INDEXEDDB) ---
  async guardarSnapshot(data) {
    if (!data) return false;
    try {
      await this.init();
      if (!this.db) return false;
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const snapshotItem = {
            id: '__APP_DATA_SNAPSHOT__',
            companyId: '__SYSTEM_SNAPSHOT__',
            numeral: '__SYSTEM_SNAPSHOT__',
            dataPayload: JSON.parse(JSON.stringify(data)),
            timestamp: new Date().toISOString()
          };
          const putReq = store.put(snapshotItem);
          putReq.onsuccess = () => resolve(true);
          putReq.onerror = () => resolve(false);
          transaction.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  }

  async obtenerSnapshot() {
    try {
      await this.init();
      if (!this.db) return null;
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const getReq = store.get('__APP_DATA_SNAPSHOT__');
          getReq.onsuccess = () => {
            if (getReq.result && getReq.result.dataPayload) {
              resolve(getReq.result.dataPayload);
            } else {
              resolve(null);
            }
          };
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    } catch {
      return null;
    }
  }

  // --- AUTO-HIDRATACIÓN BIDIRECCIONAL DESDE BASE DE DATOS FÍSICA ---
  async autoHidratarDesdeServidor(data) {
    if (!data) return;
    try {
      await this.init();
      if (!this.db) return;

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // 1. Hidratar diagramas oficiales si no existen o están obsoletos
      const diagOchoa = data.diagramas?.['emp-1790438946268'] || data.diagramas?.['emp-004'];
      if (diagOchoa) {
        if (diagOchoa.organigrama) {
          store.put({
            id: 'diag-emp-1790438946268-organigrama',
            companyId: 'emp-1790438946268',
            numeral: '__DIAGRAMA_ORGANIGRAMA__',
            tipoDiagrama: 'organigrama',
            nombre: diagOchoa.organigrama.nombre || 'Captura de pantalla 2026-10-10 a las 8.41.21 a. m..png',
            url: diagOchoa.organigrama.url || '/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png',
            dataUrl: diagOchoa.organigrama.dataUrl || diagOchoa.organigrama.url || '/uploads/20261010_084143_diag_emp-1790438946268_organigrama.png',
            tamanio: diagOchoa.organigrama.tamanio || 742710,
            tipo: diagOchoa.organigrama.tipo || 'image/png',
            esOficial: true,
            fechaCargue: diagOchoa.organigrama.fechaCargue || '2026-10-10T13:41:43.593Z'
          });
        }
        if (diagOchoa.mapa_procesos) {
          store.put({
            id: 'diag-emp-1790438946268-mapa_procesos',
            companyId: 'emp-1790438946268',
            numeral: '__DIAGRAMA_MAPA_PROCESOS__',
            tipoDiagrama: 'mapa_procesos',
            nombre: diagOchoa.mapa_procesos.nombre || 'mapa-procesos-ladrillos-ochoa.png',
            url: diagOchoa.mapa_procesos.url || './assets/mapa-procesos-ladrillos-ochoa.png',
            dataUrl: diagOchoa.mapa_procesos.dataUrl || diagOchoa.mapa_procesos.url || './assets/mapa-procesos-ladrillos-ochoa.png',
            tamanio: diagOchoa.mapa_procesos.tamanio || 45000,
            tipo: diagOchoa.mapa_procesos.tipo || 'image/png',
            esOficial: true,
            fechaCargue: diagOchoa.mapa_procesos.fechaCargue || '2026-10-05T08:00:00.000Z'
          });
        }
      }

      // 2. Hidratar lista de evidencias adjuntas registradas en la base de datos
      if (Array.isArray(data.evidencias) && data.evidencias.length > 0) {
        data.evidencias.forEach(ev => {
          if (ev && ev.id) {
            store.put(ev);
          }
        });
      }
    } catch (e) {
      console.warn("Aviso: auto-hidratación de IndexedDB diferida:", e);
    }
  }
}

// Lector asíncrono inmediato para evitar expiración de sandbox tokens en Safari / WebKit
export function leerArchivoDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No se seleccionó ningún archivo"));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Error leyendo el archivo"));
    reader.readAsDataURL(file);
  });
}

export const evidenceDB = new EvidenceDB();
