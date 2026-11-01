// Main Application Router & Entry Point

const Router = {
  currentRoute: 'dashboard',
  params: {},

  navigate(route, params = {}) {
    this.currentRoute = route;
    this.params = params;

    // Check auth protection
    const publicRoutes = ['login', 'register', 'forgot-password'];
    if (!Auth.isAuthenticated() && !publicRoutes.includes(route)) {
      this.currentRoute = 'login';
    } else if (Auth.isAuthenticated() && publicRoutes.includes(route)) {
      this.currentRoute = 'dashboard';
    }

    // Role protection for Admin
    if (this.currentRoute === 'admin' && !Auth.isAdmin()) {
      Utils.showToast('Bạn không có quyền truy cập Cổng Quản trị.', 'error');
      this.currentRoute = 'dashboard';
    }

    this.renderCurrentView();
    this.updateActiveNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateActiveNav() {
    const links = document.querySelectorAll('[data-route]');
    links.forEach((link) => {
      const r = link.getAttribute('data-route');
      if (r === this.currentRoute) {
        link.classList.add('bg-blue-600', 'text-white');
        link.classList.remove('text-slate-600', 'hover:bg-slate-100');
      } else {
        link.classList.remove('bg-blue-600', 'text-white');
        link.classList.add('text-slate-600', 'hover:bg-slate-100');
      }
    });
  },

  async renderCurrentView() {
    const container = document.getElementById('mainContent');
    const authWrapper = document.getElementById('authWrapper');
    const appWrapper = document.getElementById('appWrapper');

    if (['login', 'register', 'forgot-password'].includes(this.currentRoute)) {
      appWrapper.classList.add('hidden');
      authWrapper.classList.remove('hidden');
      this.renderAuthView(authWrapper);
      return;
    }

    authWrapper.classList.add('hidden');
    appWrapper.classList.remove('hidden');

    switch (this.currentRoute) {
      case 'dashboard':
        await DashboardView.render(container);
        break;
      case 'assets':
        await AssetsView.render(container, this.params);
        break;
      case 'repairs':
        await RepairsView.render(container);
        break;
      case 'warranty-alerts':
        await WarrantyAlertsView.render(container);
        break;
      case 'reports':
        await ReportsView.render(container);
        break;
      case 'admin':
        await AdminView.render(container);
        break;
      case 'profile':
        await ProfileView.render(container);
        break;
      default:
        await DashboardView.render(container);
    }

    App.checkNotifications();
  },

  renderAuthView(container) {
    if (this.currentRoute === 'login') {
      container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8 space-y-6">
            <div class="text-center">
              <div class="w-14 h-14 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md mb-3">
                <i class="fas fa-shield-cat"></i>
              </div>
              <h2 class="text-2xl font-bold text-slate-800">Quản lý Tài sản & Bảo hành</h2>
              <p class="text-xs text-slate-500 mt-1">Hệ thống theo dõi thiết bị & cảnh báo hạn bảo hành thông minh</p>
            </div>

            <!-- Quick Demo Login Switcher -->
            <div class="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2 text-xs">
              <p class="font-bold text-blue-900 flex items-center gap-1.5">
                <i class="fas fa-bolt text-amber-500"></i> Đăng nhập nhanh thử nghiệm (1-Click Demo):
              </p>
              <div class="grid grid-cols-3 gap-2">
                <button onclick="Auth.quickLogin('admin')" class="py-1.5 px-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition shadow-2xs">
                  Admin
                </button>
                <button onclick="Auth.quickLogin('head')" class="py-1.5 px-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-2xs">
                  Chủ hộ
                </button>
                <button onclick="Auth.quickLogin('member')" class="py-1.5 px-2 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-800 transition shadow-2xs">
                  Thành viên
                </button>
              </div>
            </div>

            <!-- Login Form -->
            <form onsubmit="App.handleLogin(event)" class="space-y-4 text-xs">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Email đăng nhập</label>
                <div class="relative">
                  <i class="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input type="email" id="loginEmail" required placeholder="admin@familyassets.vn" value="admin@familyassets.vn" class="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold text-slate-700">Mật khẩu</label>
                  <a href="javascript:void(0)" onclick="Router.navigate('forgot-password')" class="text-blue-600 hover:underline">Quên mật khẩu?</a>
                </div>
                <div class="relative">
                  <i class="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input type="password" id="loginPass" required value="Admin@123456" class="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
                </div>
              </div>

              <button type="submit" id="loginSubmitBtn" class="w-full py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition flex items-center justify-center gap-2">
                <span>Đăng nhập</span> <i class="fas fa-arrow-right text-xs"></i>
              </button>
            </form>

            <div class="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
              Chưa có tài khoản gia đình? 
              <a href="javascript:void(0)" onclick="Router.navigate('register')" class="font-bold text-blue-600 hover:underline">Đăng ký ngay</a>
            </div>
          </div>
        </div>
      `;
    } else if (this.currentRoute === 'register') {
      container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8 space-y-6">
            <div class="text-center">
              <h2 class="text-2xl font-bold text-slate-800">Đăng ký tài khoản gia đình</h2>
              <p class="text-xs text-slate-500 mt-1">Bắt đầu quản lý thiết bị & cảnh báo bảo hành</p>
            </div>

            <form onsubmit="App.handleRegister(event)" class="space-y-3.5 text-xs">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input type="text" id="regName" required placeholder="Nguyễn Văn A" class="w-full p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Email *</label>
                <input type="email" id="regEmail" required placeholder="name@domain.com" class="w-full p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input type="text" id="regPhone" placeholder="0912345678" class="w-full p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Mật khẩu (≥ 8 ký tự) *</label>
                  <input type="password" id="regPass" required minlength="8" placeholder="••••••••" class="w-full p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Xác nhận mật khẩu *</label>
                  <input type="password" id="regConfirmPass" required minlength="8" placeholder="••••••••" class="w-full p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
                </div>
              </div>

              <button type="submit" id="regSubmitBtn" class="w-full py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition">
                Hoàn tất đăng ký
              </button>
            </form>

            <div class="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
              Đã có tài khoản? 
              <a href="javascript:void(0)" onclick="Router.navigate('login')" class="font-bold text-blue-600 hover:underline">Đăng nhập</a>
            </div>
          </div>
        </div>
      `;
    } else if (this.currentRoute === 'forgot-password') {
      container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8 space-y-6">
            <div class="text-center">
              <h2 class="text-2xl font-bold text-slate-800">Quên mật khẩu</h2>
              <p class="text-xs text-slate-500 mt-1">Hệ thống sẽ cấp lại mật khẩu tạm thời cho email của bạn</p>
            </div>

            <form onsubmit="App.handleForgotPassword(event)" class="space-y-4 text-xs">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Nhập Email tài khoản</label>
                <input type="email" id="forgotEmail" required placeholder="email@gmail.com" class="w-full p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
              </div>

              <button type="submit" class="w-full py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition">
                Gửi yêu cầu đặt lại mật khẩu
              </button>
            </form>

            <div class="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
              <a href="javascript:void(0)" onclick="Router.navigate('login')" class="font-bold text-blue-600 hover:underline">← Quay lại Đăng nhập</a>
            </div>
          </div>
        </div>
      `;
    }
  }
};

const App = {
  notifications: [],

  init() {
    Auth.init();
    this.bindEvents();

    if (Auth.isAuthenticated()) {
      Router.navigate('dashboard');
    } else {
      Router.navigate('login');
    }
  },

  bindEvents() {
    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('mobileSidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
      });
    }

    // Modal background click close
    const modal = document.getElementById('genericModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }

    // Notifications toggle
    const notifBtn = document.getElementById('notificationBellBtn');
    const notifDropdown = document.getElementById('notificationDropdown');
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', () => {
        notifDropdown.classList.add('hidden');
      });
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Đang đăng nhập...';

    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    const ok = await Auth.login(email, pass);
    btn.disabled = false;
    btn.innerHTML = '<span>Đăng nhập</span> <i class="fas fa-arrow-right text-xs"></i>';

    if (ok) {
      Router.navigate('dashboard');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const full_name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const confirmPassword = document.getElementById('regConfirmPass').value;

    if (password !== confirmPassword) {
      Utils.showToast('Mật khẩu xác nhận không khớp!', 'warning');
      return;
    }

    const ok = await Auth.register({ full_name, email, phone, password, confirmPassword });
    if (ok) {
      Router.navigate('dashboard');
    }
  },

  async handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    try {
      const res = await API.post('/auth/forgot-password', { email });
      Swal.fire({
        title: 'Cấp lại mật khẩu thành công!',
        html: `
          <div class="p-3 bg-slate-50 border rounded text-xs space-y-1">
            <p>${res.message}</p>
            ${res.temporaryPassword ? `<p class="font-bold text-blue-600 mt-2">Mật khẩu tạm thời: <span class="font-mono text-sm">${res.temporaryPassword}</span></p>` : ''}
          </div>
        `,
        icon: 'success'
      }).then(() => Router.navigate('login'));
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async checkNotifications() {
    if (!Auth.isAuthenticated()) return;

    try {
      const res = await API.get('/notifications');
      this.notifications = res.notifications || [];
      const badge = document.getElementById('notifBadge');
      const listEl = document.getElementById('notifList');

      if (badge) {
        if (res.unreadCount > 0) {
          badge.textContent = res.unreadCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (listEl) {
        if (this.notifications.length === 0) {
          listEl.innerHTML = '<p class="text-xs text-slate-400 p-4 text-center">Không có thông báo mới.</p>';
        } else {
          listEl.innerHTML = this.notifications
            .slice(0, 10)
            .map(
              (n) => `
            <div class="p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer ${
              n.is_read ? 'opacity-70' : 'bg-blue-50/30'
            }" onclick="App.openNotification(${n.id}, ${n.asset_id})">
              <div class="flex items-start gap-2">
                <div class="w-2 h-2 rounded-full ${n.is_read ? 'bg-slate-300' : 'bg-amber-500'} mt-1.5 shrink-0"></div>
                <div class="min-w-0">
                  <h5 class="font-semibold text-slate-800 text-xs">${Utils.escapeHtml(n.title)}</h5>
                  <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-2">${Utils.escapeHtml(n.message)}</p>
                  <span class="text-[10px] text-slate-400 mt-1 block">${Utils.formatDateTime(n.created_at)}</span>
                </div>
              </div>
            </div>
          `
            )
            .join('');
        }
      }
    } catch (e) {
      console.error('Lỗi kiểm tra thông báo:', e);
    }
  },

  async markAllNotificationsRead() {
    try {
      await API.put('/notifications/all/read');
      this.checkNotifications();
      Utils.showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    } catch (e) {
      console.error(e);
    }
  },

  async openNotification(notifId, assetId) {
    try {
      await API.put(`/notifications/${notifId}/read`);
      this.checkNotifications();
      if (assetId) {
        AssetDetailView.open(assetId);
      }
    } catch (e) {
      console.error(e);
    }
  }
};

window.Router = Router;
window.App = App;
window.Auth = Auth;
window.Utils = Utils;
window.API = API;
window.DashboardView = DashboardView;
window.AssetsView = AssetsView;
window.AssetDetailView = AssetDetailView;
window.RepairsView = RepairsView;
window.WarrantyAlertsView = WarrantyAlertsView;
window.ReportsView = ReportsView;
window.AdminView = AdminView;
window.ProfileView = ProfileView;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

