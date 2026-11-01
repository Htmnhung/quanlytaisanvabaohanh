// Authentication Module

const Auth = {
  currentUser: null,

  init() {
    const savedUser = localStorage.getItem('family_asset_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }
    this.renderNav();
  },

  isAuthenticated() {
    return !!API.getToken() && !!this.currentUser;
  },

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  },

  isHead() {
    return this.currentUser && (this.currentUser.role === 'head' || this.currentUser.role === 'admin');
  },

  canManage() {
    return this.currentUser && this.currentUser.role !== 'member';
  },

  async login(email, password) {
    try {
      const res = await API.post('/auth/login', { email, password });
      API.setToken(res.token);
      this.currentUser = res.user;
      localStorage.setItem('family_asset_user', JSON.stringify(res.user));
      this.renderNav();
      Utils.showToast('Đăng nhập thành công! Chào mừng ' + res.user.full_name, 'success');
      return true;
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return false;
    }
  },

  async register(data) {
    try {
      const res = await API.post('/auth/register', data);
      API.setToken(res.token);
      this.currentUser = res.user;
      localStorage.setItem('family_asset_user', JSON.stringify(res.user));
      this.renderNav();
      Utils.showToast('Đăng ký thành công! Chào mừng bạn tham gia.', 'success');
      return true;
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return false;
    }
  },

  async logout() {
    const confirmed = await Utils.confirmDialog('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?', 'Đăng xuất', '#3b82f6');
    if (!confirmed) return;

    API.setToken(null);
    this.currentUser = null;
    localStorage.removeItem('family_asset_user');
    this.renderNav();
    Utils.showToast('Đã đăng xuất thành công.', 'info');
    window.Router.navigate('login');
  },

  async quickLogin(role) {
    const creds = {
      admin: { email: 'admin@familyassets.vn', pass: 'Admin@123456' },
      head: { email: 'nguyenvanan@gmail.com', pass: 'An@123456' },
      member: { email: 'lethibinh@gmail.com', pass: 'Binh@123456' }
    };
    const c = creds[role];
    if (c) {
      const ok = await this.login(c.email, c.pass);
      if (ok) {
        window.Router.navigate('dashboard');
      }
    }
  },

  renderNav() {
    const user = this.currentUser;
    const authElements = document.querySelectorAll('.auth-required');
    const guestElements = document.querySelectorAll('.guest-only');
    const adminElements = document.querySelectorAll('.admin-only');

    if (user) {
      authElements.forEach((el) => el.classList.remove('hidden'));
      guestElements.forEach((el) => el.classList.add('hidden'));

      if (user.role === 'admin') {
        adminElements.forEach((el) => el.classList.remove('hidden'));
      } else {
        adminElements.forEach((el) => el.classList.add('hidden'));
      }

      // Update avatar and name in topbar
      const userNameEl = document.getElementById('topbarUserName');
      const userRoleEl = document.getElementById('topbarUserRole');
      const userAvatarEl = document.getElementById('topbarUserAvatar');

      if (userNameEl) userNameEl.textContent = user.full_name;
      if (userRoleEl) {
        const roleLabels = { admin: 'Quản trị viên', head: 'Chủ hộ', member: 'Thành viên' };
        userRoleEl.textContent = roleLabels[user.role] || user.role;
      }
      if (userAvatarEl) {
        userAvatarEl.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3b82f6&color=fff`;
      }
    } else {
      authElements.forEach((el) => el.classList.add('hidden'));
      guestElements.forEach((el) => el.classList.remove('hidden'));
      adminElements.forEach((el) => el.classList.add('hidden'));
    }
  }
};

