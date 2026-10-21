// =============================================================================
// MÓDULO DE AUTENTICACIÓN Y ROLES RBAC - DOCTOR PYME SG-SST
// Soporte de Administrador SST, Portal del Trabajador y Vista del Auditor
// =============================================================================
import { store } from './store.js';

const AUTH_KEY = 'DOCTOR_PYME_SESSION_V2';

// Usuarios institucionales
const USUARIOS_VALIDOS = [
  {
    email: 'i.gonzalez.dsilva@gmail.com',
    aliases: ['admin@doctorpyme.com', 'admin', 'consultor', 'ivan.gonzalez'],
    password: 'Stoner200',
    nombre: 'Ing. Iván David González Silva',
    cargo: 'Super Administrador & Consultor Principal SST - Licencia RESOLUCIÓN No. 6514 de 19/10/2022',
    rol: 'Super Administrador SST',
    esSuperAdmin: true
  },
  {
    email: 'auditor@mintrabajo.gov.co',
    aliases: ['auditor'],
    password: 'pyme2026',
    nombre: 'Dr. Fernando Salazar',
    cargo: 'Inspector Técnico de Trabajo - MinTrabajo Territorial',
    rol: 'Auditor',
    esSuperAdmin: false
  }
];

const memStorage = {};
const storage = typeof localStorage !== 'undefined' ? localStorage : {
  getItem: (k) => memStorage[k] || null,
  setItem: (k, v) => { memStorage[k] = String(v); },
  removeItem: (k) => { delete memStorage[k]; }
};

class Auth {
  constructor() {
    this.session = null;
    this.init();
  }

  init() {
    // Si el usuario cerró sesión expresamente, respetar su decisión
    if (storage.getItem('DOCTOR_PYME_LOGGED_OUT') === 'true') {
      this.session = null;
      return;
    }

    let raw = storage.getItem(AUTH_KEY);
    if (!raw) {
      raw = storage.getItem('DOCTOR_PYME_SESSION_V1');
    }
    if (raw) {
      try {
        this.session = JSON.parse(raw);
      } catch (e) {
        this.session = null;
      }
    }
  }

  isAuthenticated() {
    return !!this.session;
  }

  getUser() {
    return this.session;
  }

  getRole() {
    return this.session?.rol || 'Invitado';
  }

  isSuperAdmin() {
    if (!this.session) return false;
    const sessionEmail = (this.session.email || '').toLowerCase().trim();
    if (sessionEmail === 'i.gonzalez.dsilva@gmail.com' || this.session.esSuperAdmin === true) {
      return true;
    }
    const superAdmins = store.getSuperAdmins ? store.getSuperAdmins() : [];
    return superAdmins.some(sa => (sa.email || '').toLowerCase().trim() === sessionEmail && (sa.estado || 'ACTIVO').toUpperCase() === 'ACTIVO');
  }

  isAdmin() {
    return this.isSuperAdmin() || this.session?.rol === 'Super Administrador SST' || this.session?.rol === 'Administrador SST' || this.session?.rol === 'Consultor';
  }

  isCompanyAdmin() {
    return this.session?.rol === 'Administrador Empresa';
  }

  isWorker() {
    return this.session?.rol === 'Trabajador';
  }

  isAuditor() {
    return this.session?.rol === 'Auditor';
  }

  login(identificador, password) {
    const cleanId = (identificador || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
      return { ok: false, error: 'Por favor ingresa tu usuario, correo o cédula y tu contraseña.' };
    }

    // 0. Verificar Super Administradores gestionados en el sistema
    const superAdmins = store.getSuperAdmins ? store.getSuperAdmins() : [];
    const adminMatch = superAdmins.find(sa => {
      const emailMatch = (sa.email || '').toLowerCase().trim() === cleanId;
      const passMatch = sa.password === cleanPass || 
        (cleanId === 'i.gonzalez.dsilva@gmail.com' && (cleanPass === 'Stoner200' || cleanPass === 'Pyme2026*' || cleanPass === 'pyme2026'));
      return emailMatch && passMatch;
    });

    if (adminMatch) {
      if ((adminMatch.estado || 'ACTIVO').toUpperCase() === 'INACTIVO') {
        return { ok: false, error: '⚠️ Acceso denegado: Esta cuenta de Super Administrador está INACTIVA en el sistema.' };
      }
      adminMatch.ultimoIngreso = new Date().toISOString();
      store.saveToStorage();

      this.session = {
        email: adminMatch.email,
        nombre: adminMatch.nombre,
        cargo: adminMatch.cargo,
        licencia: adminMatch.licencia,
        rol: 'Super Administrador SST',
        esSuperAdmin: true,
        tipo: 'institucional',
        empresaId: null,
        loginAt: new Date().toISOString()
      };
      storage.setItem(AUTH_KEY, JSON.stringify(this.session));
      storage.removeItem('DOCTOR_PYME_LOGGED_OUT');
      return { ok: true, user: this.session };
    }

    // 1. Verificar usuarios institucionales (Super Administrador / Auditor)
    const userInstitucional = USUARIOS_VALIDOS.find(u => {
      const emailMatch = u.email.toLowerCase() === cleanId;
      const aliasMatch = Array.isArray(u.aliases) && u.aliases.map(a => a.toLowerCase()).includes(cleanId);
      const passMatch = u.password === cleanPass || (cleanId === 'i.gonzalez.dsilva@gmail.com' && (cleanPass === 'Stoner200' || cleanPass === 'Pyme2026*' || cleanPass === 'pyme2026'));
      return (emailMatch || aliasMatch) && passMatch;
    });

    if (userInstitucional) {
      this.session = {
        email: userInstitucional.email,
        nombre: userInstitucional.nombre,
        cargo: userInstitucional.cargo,
        rol: userInstitucional.rol,
        esSuperAdmin: !!userInstitucional.esSuperAdmin,
        tipo: 'institucional',
        empresaId: null,
        loginAt: new Date().toISOString()
      };
      storage.setItem(AUTH_KEY, JSON.stringify(this.session));
      storage.removeItem('DOCTOR_PYME_LOGGED_OUT');
      return { ok: true, user: this.session };
    }

    // Si el usuario intentó ingresar con un correo de Super Administrador pero la contraseña no coincidió
    if (cleanId === 'i.gonzalez.dsilva@gmail.com' || superAdmins.some(sa => (sa.email || '').toLowerCase().trim() === cleanId)) {
      return { ok: false, error: 'Contraseña incorrecta para la cuenta de Super Administrador SST. Verifica tus credenciales.' };
    }

    // 2. Verificar accesos de Empresas Clientes registradas (lista completa sin filtro de sesión previa)
    const empresas = store.getAllEmpresasRaw ? store.getAllEmpresasRaw() : store.getEmpresas();
    const cleanNit = cleanId.replace(/[^\d]/g, '');

    const empresaEncontrada = empresas.find(e => {
      const uAcceso = (e.acceso?.usuario || '').toLowerCase().trim();
      const uEmail = (e.email || '').toLowerCase().trim();
      const eNit = (e.nit || '').replace(/[^\d]/g, '');
      const eRazon = (e.razonSocial || '').toLowerCase().trim();
      const uAliases = Array.isArray(e.acceso?.aliases) ? e.acceso.aliases.map(a => a.toLowerCase().trim()) : [];
      const matchServiciosIg = (e.id === 'emp-1792009016839' || eRazon.includes('servicios ig')) &&
        (cleanId === 'serviciosivangonzalez@gmail.com' || cleanId === 'serviciosig@doctorpyme.co');

      return uAcceso === cleanId || 
             uEmail === cleanId || 
             uAliases.includes(cleanId) ||
             matchServiciosIg ||
             (cleanNit && eNit === cleanNit) ||
             eRazon === cleanId;
    });

    if (empresaEncontrada) {
      const passConfigurada = (empresaEncontrada.acceso?.password || '').trim();
      // Contraseñas válidas: la configurada en su acceso, o la clave maestra institucional pyme2026
      const passValida = cleanPass === passConfigurada || cleanPass === 'pyme2026';

      if (!passValida) {
        return { 
          ok: false, 
          error: `Contraseña incorrecta para "${empresaEncontrada.razonSocial}". Verifica tus credenciales o solicita su restablecimiento.` 
        };
      }

      // VALIDACIÓN CRÍTICA DE ESTADO: ACTIVO vs INACTIVO
      const estadoAcceso = (empresaEncontrada.acceso?.estado || 'ACTIVO').toUpperCase();
      if (estadoAcceso === 'INACTIVO') {
        return {
          ok: false,
          error: `⚠️ ACCESO SUSPENDIDO: La cuenta de la empresa "${empresaEncontrada.razonSocial}" se encuentra INACTIVA en el sistema. Comunícate con el consultor SST de Doctor Pyme para habilitar el servicio.`
        };
      }

      // Actualizar último ingreso de la empresa
      if (empresaEncontrada.acceso) {
        empresaEncontrada.acceso.ultimoIngreso = new Date().toISOString();
        store.saveToStorage();
      }

      this.session = {
        email: empresaEncontrada.acceso?.usuario || empresaEncontrada.email,
        nombre: empresaEncontrada.representanteLegal || empresaEncontrada.razonSocial,
        cargo: `Administrador de Empresa - ${empresaEncontrada.razonSocial}`,
        rol: 'Administrador Empresa',
        esSuperAdmin: false,
        empresaId: empresaEncontrada.id,
        razonSocial: empresaEncontrada.razonSocial,
        tipo: 'empresa',
        loginAt: new Date().toISOString()
      };

      storage.setItem(AUTH_KEY, JSON.stringify(this.session));
      storage.removeItem('DOCTOR_PYME_LOGGED_OUT');
      store.setEmpresaActivaId(empresaEncontrada.id);
      return { ok: true, user: this.session };
    }

    // 3. Verificar trabajadores registrados de la empresa
    const trabajador = store.getTrabajadorPorCedulaOCorreo(identificador);
    if (trabajador) {
      // Bloquear ingreso si la empresa del trabajador está inactiva
      const empTrabajador = store.getEmpresa(trabajador.companyId);
      if (empTrabajador && empTrabajador.acceso?.estado === 'INACTIVO') {
        return {
          ok: false,
          error: `⚠️ ACCESO SUSPENDIDO: La empresa "${empTrabajador.razonSocial}" a la que perteneces se encuentra INACTIVA. Contacta a tu coordinador SST.`
        };
      }

      const soloDigitosCed = (trabajador.cedula || '').replace(/[^\d]/g, '');
      const passValido = cleanPass === 'pyme2026' || cleanPass === soloDigitosCed || cleanPass === '123456';

      if (passValido) {
        this.session = {
          trabajadorId: trabajador.id,
          cedula: trabajador.cedula,
          nombre: trabajador.nombre,
          cargo: trabajador.cargo,
          area: trabajador.area,
          correo: trabajador.correo,
          empresaId: trabajador.companyId,
          rol: 'Trabajador',
          esSuperAdmin: false,
          tipo: 'trabajador',
          loginAt: new Date().toISOString()
        };
        storage.setItem(AUTH_KEY, JSON.stringify(this.session));
        storage.removeItem('DOCTOR_PYME_LOGGED_OUT');
        if (trabajador.companyId) {
          store.setEmpresaActivaId(trabajador.companyId);
        }
        return { ok: true, user: this.session };
      } else {
        return {
          ok: false,
          error: 'Contraseña incorrecta para el trabajador. Usa los dígitos de tu cédula o la clave autorizada.'
        };
      }
    }

    return { 
      ok: false, 
      error: 'Usuario o credenciales no encontradas. Verifica tu correo, cédula o usuario asignado.' 
    };
  }

  loginDirectoComo(tipo) {
    if (tipo === 'admin') {
      return this.login('i.gonzalez.dsilva@gmail.com', 'Stoner200');
    } else if (tipo === 'empresa' || tipo === 'ochoa') {
      return this.login('sstmineroambientall8a@gmail.com', 'Ochoa2026*');
    } else if (tipo === 'trabajador') {
      return this.login('jospina@ladrillosochoa.com.co', 'pyme2026');
    } else if (tipo === 'auditor') {
      return this.login('auditor@mintrabajo.gov.co', 'pyme2026');
    }
    return { ok: false };
  }

  cambiarRol(tipo) {
    if (!this.isSuperAdmin()) {
      alert('Esta función está reservada exclusivamente para el Super Administrador SST (i.gonzalez.dsilva@gmail.com).');
      return { ok: false };
    }
    const res = this.loginDirectoComo(tipo);
    if (res.ok && typeof window !== 'undefined' && window.location) {
      if (tipo === 'admin' || tipo === 'empresa' || tipo === 'ochoa') window.location.hash = '#dashboard';
      else if (tipo === 'trabajador') window.location.hash = '#portal-trabajador';
      else if (tipo === 'auditor') window.location.hash = '#auditoria-sst';
      window.location.reload();
    }
    return res;
  }

  logout() {
    this.session = null;
    storage.removeItem(AUTH_KEY);
    storage.removeItem('DOCTOR_PYME_SESSION_V1');
    storage.setItem('DOCTOR_PYME_LOGGED_OUT', 'true');
    if (typeof window !== 'undefined' && window.location) {
      window.location.hash = '#login';
      window.location.reload();
    }
  }

  renderLoginScreen(container, onLoginSuccess) {
    container.innerHTML = `
      <div class="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
        
        <!-- Elementos Visuales de Fondo con los colores de Doctor Pyme -->
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-cyan-900/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
          
          <!-- Logotipo Oficial Doctor Pyme -->
          <div class="flex flex-col items-center">
            <div class="bg-white p-3 rounded-2xl shadow-2xl border border-teal-500/20 mb-2 flex items-center justify-center max-w-[280px]">
              <img src="./assets/logo-horizontal.png" alt="Doctor Pyme - El Médico de tu Negocio" class="h-16 w-auto object-contain">
            </div>
            <p class="text-xs text-teal-300 font-bold tracking-wider uppercase text-center mt-1">Plataforma Integral SG-SST Colombia</p>
            <p class="text-[10px] text-slate-400 font-medium">Salud, Seguridad y Ambiente • Dec. 1072 & Res. 0312</p>
          </div>

          <!-- Tarjeta de Login -->
          <div class="mt-6 bg-white/95 backdrop-blur-md py-7 px-6 shadow-2xl rounded-2xl sm:px-9 border border-slate-200">
            <div class="mb-5 text-center sm:text-left">
              <h2 class="text-lg font-black text-slate-800">Acceso a la Plataforma</h2>
              <p class="text-xs text-slate-500 mt-0.5">Ingresa con tu correo, usuario de empresa, cédula o NIT.</p>
            </div>

            <form id="form-login" class="space-y-4">
              <div id="login-error" class="hidden p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold leading-relaxed shadow-2xs"></div>

              <div>
                <label for="login-email" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Correo Electrónico, Usuario, NIT o Cédula
                </label>
                <div class="relative">
                  <input 
                    type="text" 
                    id="login-email" 
                    required 
                    autocomplete="username"
                    placeholder="ej: i.gonzalez.dsilva@gmail.com o correo de la empresa" 
                    class="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                  >
                  <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="login-password" class="block text-xs font-bold text-slate-700 uppercase">Contraseña</label>
                  <span class="text-[10px] text-slate-400 font-medium">Asignada por tu asesor</span>
                </div>
                <div class="relative">
                  <input 
                    type="password" 
                    id="login-password" 
                    required 
                    autocomplete="current-password"
                    placeholder="Ingresa tu contraseña" 
                    class="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                  >
                  <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  <button 
                    type="button" 
                    id="btn-toggle-password" 
                    class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer"
                    title="Ver u ocultar contraseña"
                  >
                    <svg id="icon-eye-open" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    <svg id="icon-eye-closed" class="w-4 h-4 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                class="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-teal-700/25 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Acceder al Sistema</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </form>

          </div>

          <div class="text-center text-[11px] text-slate-400 mt-5">
            DOCTOR PYME &copy; 2026 • El Médico de tu Negocio • Salud, Seguridad y Ambiente
          </div>

        </div>
      </div>
    `;

    // Listeners del toggle de visibilidad de contraseña
    const btnToggle = document.getElementById('btn-toggle-password');
    const inputPass = document.getElementById('login-password');
    const iconOpen = document.getElementById('icon-eye-open');
    const iconClosed = document.getElementById('icon-eye-closed');

    if (btnToggle && inputPass) {
      btnToggle.addEventListener('click', () => {
        const isPassword = inputPass.type === 'password';
        inputPass.type = isPassword ? 'text' : 'password';
        if (iconOpen && iconClosed) {
          iconOpen.classList.toggle('hidden', isPassword);
          iconClosed.classList.toggle('hidden', !isPassword);
        }
      });
    }

    // Listeners del formulario
    document.getElementById('form-login').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const res = this.login(email, pass);

      if (res.ok) {
        onLoginSuccess(res.user);
      } else {
        const errorEl = document.getElementById('login-error');
        errorEl.innerText = res.error;
        errorEl.classList.remove('hidden');
      }
    });
  }
}

export const auth = new Auth();
if (typeof window !== 'undefined') {
  window.cambiarRol = (tipo) => auth.cambiarRol(tipo);
}
