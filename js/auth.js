// =============================================================================
// MÓDULO DE AUTENTICACIÓN - DOCTOR PYME SG-SST
// Control de acceso con inicio de sesión y contraseña
// =============================================================================

const AUTH_KEY = 'DOCTOR_PYME_SESSION_V1';

// Usuario administrador por defecto
const USUARIOS_VALIDOS = [
  {
    email: 'admin@doctorpyme.com',
    password: 'pyme2026',
    nombre: 'Consultor Principal',
    cargo: 'Especialista en SST - Licencia 45892-2022',
    rol: 'Administrador SST'
  },
  {
    email: 'consultor@doctorpyme.com',
    password: '123456',
    nombre: 'Dr. SST Pyme',
    cargo: 'Asesor Técnico en Prevención de Riesgos',
    rol: 'Consultor'
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
    const raw = storage.getItem(AUTH_KEY);
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

  login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    const user = USUARIOS_VALIDOS.find(
      u => u.email.toLowerCase() === cleanEmail && u.password === cleanPass
    );

    if (user) {
      this.session = {
        email: user.email,
        nombre: user.nombre,
        cargo: user.cargo,
        rol: user.rol,
        loginAt: new Date().toISOString()
      };
      storage.setItem(AUTH_KEY, JSON.stringify(this.session));
      return { ok: true, user: this.session };
    }

    return { 
      ok: false, 
      error: 'Correo o contraseña incorrectos. Verifica tus credenciales o usa las credenciales de acceso rápido.' 
    };
  }

  logout() {
    this.session = null;
    storage.removeItem(AUTH_KEY);
    if (typeof window !== 'undefined' && window.location) window.location.reload();
  }

  renderLoginScreen(container, onLoginSuccess) {
    container.innerHTML = `
      <div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        
        <!-- Elementos de Fondo Visual -->
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          
          <!-- Logotipo Oficial de Doctor Pyme -->
          <div class="flex flex-col items-center">
            <div class="bg-white p-3.5 rounded-2xl shadow-2xl border border-slate-200/80 mb-3 flex items-center justify-center max-w-[260px]">
              <img src="./assets/logo.jpg" alt="Doctor Pyme Logo" class="h-24 w-auto object-contain rounded-lg">
            </div>
            <p class="text-xs text-indigo-300 font-semibold tracking-wider uppercase text-center mt-1">Plataforma de Gestión SST & Seguridad Laboral</p>
          </div>

          <!-- Tarjeta de Inicio de Sesión -->
          <div class="mt-8 bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
            <div class="mb-6">
              <h2 class="text-lg font-bold text-slate-800">Iniciar Sesión</h2>
              <p class="text-xs text-slate-500 mt-0.5">Ingresa tus credenciales autorizadas de consultor o empresa.</p>
            </div>

            <form id="form-login" class="space-y-4">
              <div id="login-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium"></div>

              <div>
                <label for="login-email" class="block text-xs font-bold text-slate-700 uppercase mb-1">Correo Electrónico</label>
                <div class="relative">
                  <input 
                    type="email" 
                    id="login-email" 
                    required 
                    value="admin@doctorpyme.com"
                    placeholder="consultor@doctorpyme.com" 
                    class="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                  <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
                </div>
              </div>

              <div>
                <label for="login-password" class="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
                <div class="relative">
                  <input 
                    type="password" 
                    id="login-password" 
                    required 
                    value="pyme2026"
                    placeholder="••••••••" 
                    class="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                  <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
              </div>

              <div class="flex items-center justify-between text-xs pt-1">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked class="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5">
                  <span class="text-slate-600 font-medium">Recordar sesión</span>
                </label>
              </div>

              <button 
                type="submit" 
                class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
              >
                <span>Acceder al Sistema</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </form>

            <!-- Acceso Rápido / Demo -->
            <div class="mt-6 pt-5 border-t border-slate-100">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">Credenciales de Acceso Demo</span>
              <div class="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-1">
                <div class="flex justify-between">
                  <span class="font-bold">Usuario:</span>
                  <span class="font-mono text-indigo-700">admin@doctorpyme.com</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-bold">Contraseña:</span>
                  <span class="font-mono text-indigo-700">pyme2026</span>
                </div>
              </div>
            </div>

          </div>

          <div class="text-center text-xs text-slate-400 mt-6">
            Doctor Pyme &copy; 2026 • Decreto 1072 & Resolución 0312
          </div>

        </div>
      </div>
    `;

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
