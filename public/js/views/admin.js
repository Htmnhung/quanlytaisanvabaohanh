// Admin Portal View

const AdminView = {
  currentTab: 'dashboard', // 'dashboard', 'users', 'categories', 'moderation', 'settings', 'audit'

  async render(container) {
    if (!Auth.isAdmin()) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 p-8 rounded-xl text-center text-red-700">
          <i class="fas fa-lock text-3xl mb-2"></i>
          <h3 class="font-bold">Khu vực hạn chế</h3>
          <p class="text-sm mt-1">Chức năng chỉ dành cho Quản trị viên hệ thống (Admin).</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Admin Title -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fas fa-user-shield text-blue-600"></i>
              <span>Cổng Quản trị Hệ thống (Admin Portal)</span>
            </h1>
            <p class="text-sm text-slate-500 mt-1">Quản lý người dùng, phân quyền RBAC, kiểm duyệt tài sản, danh mục và nhật ký hoạt động</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
            Quyền hạn cao nhất: Admin
          </span>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-px">
          <button onclick="AdminView.switchTab('dashboard')" class="px-3.5 py-2.5 transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            this.currentTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }">
            <i class="fas fa-chart-pie"></i> Tổng quan hệ thống
          </button>
          <button onclick="AdminView.switchTab('users')" class="px-3.5 py-2.5 transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            this.currentTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }">
            <i class="fas fa-users-gear"></i> Quản lý người dùng
          </button>
          <button onclick="AdminView.switchTab('categories')" class="px-3.5 py-2.5 transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            this.currentTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }">
            <i class="fas fa-folder-tree"></i> Quản lý danh mục
          </button>
          <button onclick="AdminView.switchTab('moderation')" class="px-3.5 py-2.5 transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            this.currentTab === 'moderation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }">
            <i class="fas fa-eye text-indigo-500"></i> Kiểm duyệt tài sản
          </button>
          <button onclick="AdminView.switchTab('settings')" class="px-3.5 py-2.5 transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            this.currentTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }">
            <i class="fas fa-sliders"></i> Cấu hình & Ngưỡng
          </button>
          <button onclick="AdminView.switchTab('audit')" class="px-3.5 py-2.5 transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            this.currentTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }">
            <i class="fas fa-clock-rotate-left"></i> Nhật ký Audit log
          </button>
        </div>

        <!-- Admin Tab Body -->
        <div id="adminTabBody"></div>
      </div>
    `;

    if (this.currentTab === 'dashboard') await this.renderDashboard();
    else if (this.currentTab === 'users') await this.renderUsers();
    else if (this.currentTab === 'categories') await this.renderCategories();
    else if (this.currentTab === 'moderation') await this.renderModeration();
    else if (this.currentTab === 'settings') await this.renderSettings();
    else if (this.currentTab === 'audit') await this.renderAuditLogs();
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render(document.getElementById('mainContent'));
  },

  // 1. Dashboard Tab
  async renderDashboard() {
    const el = document.getElementById('adminTabBody');
    el.innerHTML = '<div class="flex items-center justify-center py-16"><i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i></div>';

    try {
      const res = await API.get('/admin/dashboard');
      const s = res.stats;
      const logs = res.recentLogs || [];

      el.innerHTML = `
        <div class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Người dùng</p>
              <h3 class="text-2xl font-bold text-slate-800 mt-1">${s.totalUsers}</h3>
              <p class="text-xs text-blue-600 mt-1">Đang hoạt động trên hệ thống</p>
            </div>
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toàn bộ tài sản</p>
              <h3 class="text-2xl font-bold text-slate-800 mt-1">${s.totalAssets}</h3>
              <p class="text-xs text-slate-500 mt-1">Trị giá: <span class="font-bold text-slate-800">${Utils.formatCurrency(s.totalAssetValue)}</span></p>
            </div>
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lượt sửa chữa toàn HT</p>
              <h3 class="text-2xl font-bold text-slate-800 mt-1">${s.totalRepairs}</h3>
              <p class="text-xs text-rose-600 mt-1">Tổng chi: ${Utils.formatCurrency(s.totalRepairCost)}</p>
            </div>
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bảo hành sắp hết hạn</p>
              <h3 class="text-2xl font-bold text-amber-600 mt-1">${s.expiringWarranties}</h3>
              <p class="text-xs text-slate-500 mt-1">Đã hết hạn: ${s.expiredWarranties}</p>
            </div>
          </div>

          <!-- Recent Audit Logs Mini -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-slate-800 text-sm">Nhật ký hoạt động hệ thống gần đây</h3>
              <button onclick="AdminView.switchTab('audit')" class="text-xs font-medium text-blue-600 hover:underline">Xem tất cả</button>
            </div>

            <div class="divide-y divide-slate-100 text-xs">
              ${logs
                .map(
                  (l) => `
                <div class="py-2.5 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-700 font-bold">${l.action}</span>
                    <span class="text-slate-800 font-medium">${Utils.escapeHtml(l.details)}</span>
                  </div>
                  <div class="text-right text-slate-400 text-[11px] shrink-0">
                    <span>${l.user_email || 'Hệ thống'}</span> • <span>${Utils.formatDateTime(l.created_at)}</span>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  },

  // 2. Quản lý người dùng Tab
  async renderUsers() {
    const el = document.getElementById('adminTabBody');
    el.innerHTML = '<div class="flex items-center justify-center py-16"><i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i></div>';

    try {
      const res = await API.get('/admin/users');
      const users = res.data || [];

      el.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h3 class="font-bold text-slate-800 text-sm">Danh sách tài khoản (${users.length} người dùng)</h3>
            <button onclick="AdminView.openCreateUserModal()" class="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition">
              <i class="fas fa-user-plus mr-1"></i> Tạo tài khoản mới
            </button>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Người dùng</th>
                  <th class="py-3 px-4">Email</th>
                  <th class="py-3 px-4">Số ĐT</th>
                  <th class="py-3 px-4">Vai trò (Role)</th>
                  <th class="py-3 px-4">Trạng thái</th>
                  <th class="py-3 px-4">Tài sản sở hữu</th>
                  <th class="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${users
                  .map(
                    (u) => `
                  <tr class="hover:bg-slate-50/70 transition">
                    <td class="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                      <img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=3b82f6&color=fff`}" class="w-7 h-7 rounded-full object-cover">
                      <span>${Utils.escapeHtml(u.full_name)}</span>
                    </td>
                    <td class="py-3 px-4 text-slate-600">${u.email}</td>
                    <td class="py-3 px-4 text-slate-600">${u.phone || '—'}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : u.role === 'head'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }">
                        ${u.role === 'admin' ? 'Quản trị viên' : u.role === 'head' ? 'Chủ hộ' : 'Thành viên'}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }">
                        ${u.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td class="py-3 px-4 font-bold text-slate-700">${u.asset_count || 0} tài sản</td>
                    <td class="py-3 px-4 text-right space-x-1">
                      <button onclick="AdminView.openEditUserModal(${u.id})" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded" title="Sửa thông tin"><i class="fas fa-edit"></i></button>
                      <button onclick="AdminView.toggleUserStatus(${u.id})" class="p-1.5 ${
                        u.status === 'active' ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'
                      } hover:bg-slate-100 rounded" title="${u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}">
                        <i class="fas ${u.status === 'active' ? 'fa-lock' : 'fa-lock-open'}"></i>
                      </button>
                      <button onclick="AdminView.resetPassword(${u.id})" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded" title="Đặt lại mật khẩu"><i class="fas fa-key"></i></button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  },

  openCreateUserModal() {
    Swal.fire({
      title: 'Tạo tài khoản người dùng mới',
      html: `
        <div class="text-left space-y-3 pt-2">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
            <input type="text" id="admFullName" placeholder="Họ và tên" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
            <input type="email" id="admEmail" placeholder="email@gmail.com" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
            <input type="text" id="admPhone" placeholder="0901234567" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu ban đầu *</label>
            <input type="password" id="admPass" value="User@123456" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Phân quyền (Role) *</label>
            <select id="admRole" class="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white">
              <option value="member">Thành viên (Member - Chỉ xem / thêm)</option>
              <option value="head">Chủ hộ (Head - Toàn quyền gia đình)</option>
              <option value="admin">Quản trị viên (Admin - Quản lý toàn hệ thống)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Tạo tài khoản',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const full_name = document.getElementById('admFullName').value;
        const email = document.getElementById('admEmail').value;
        const phone = document.getElementById('admPhone').value;
        const password = document.getElementById('admPass').value;
        const role = document.getElementById('admRole').value;

        if (!full_name || !email || !password) {
          Swal.showValidationMessage('Vui lòng điền đầy đủ họ tên, email và mật khẩu');
          return false;
        }
        return { full_name, email, phone, password, role };
      }
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          const resp = await API.post('/admin/users', res.value);
          Utils.showToast(resp.message, 'success');
          AdminView.renderUsers();
        } catch (e) {
          Utils.showToast(e.message, 'error');
        }
      }
    });
  },

  async openEditUserModal(id) {
    try {
      const res = await API.get('/admin/users');
      const user = (res.data || []).find((u) => u.id === id);
      if (!user) {
        Utils.showToast('Không tìm thấy thông tin người dùng', 'error');
        return;
      }

      Swal.fire({
        title: 'Chỉnh sửa tài khoản người dùng',
        html: `
          <div class="text-left space-y-3 pt-2">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
              <input type="text" id="editFullName" value="${Utils.escapeHtml(user.full_name)}" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Email (Không đổi)</label>
              <input type="email" value="${user.email}" disabled class="w-full text-xs p-2 border border-slate-200 bg-slate-50 text-slate-400 rounded-lg">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
              <input type="text" id="editPhone" value="${Utils.escapeHtml(user.phone || '')}" placeholder="0901234567" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Vai trò (Role) *</label>
              <select id="editRole" class="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white">
                <option value="member" ${user.role === 'member' ? 'selected' : ''}>Thành viên (Member)</option>
                <option value="head" ${user.role === 'head' ? 'selected' : ''}>Chủ hộ (Head)</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Quản trị viên (Admin)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Trạng thái *</label>
              <select id="editStatus" class="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white">
                <option value="active" ${user.status === 'active' ? 'selected' : ''}>Hoạt động (Active)</option>
                <option value="locked" ${user.status === 'locked' ? 'selected' : ''}>Bị khóa (Locked)</option>
              </select>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Lưu thay đổi',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
          const full_name = document.getElementById('editFullName').value;
          const phone = document.getElementById('editPhone').value;
          const role = document.getElementById('editRole').value;
          const status = document.getElementById('editStatus').value;

          if (!full_name) {
            Swal.showValidationMessage('Họ và tên không được để trống');
            return false;
          }
          return { full_name, phone, role, status };
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const resp = await API.put(`/admin/users/${id}`, result.value);
            Utils.showToast(resp.message, 'success');
            AdminView.renderUsers();
          } catch (e) {
            Utils.showToast(e.message, 'error');
          }
        }
      });
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async toggleUserStatus(id) {
    try {
      const res = await API.put(`/admin/users/${id}/toggle-status`);
      Utils.showToast(res.message, 'success');
      this.renderUsers();
    } catch (e) {
      Utils.showToast(e.message, 'error');
    }
  },

  async resetPassword(id) {
    Swal.fire({
      title: 'Đặt lại mật khẩu',
      text: 'Mật khẩu mới sẽ được gán là "Reset@123456". Bạn có chắc chắn muốn thực hiện?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đặt lại',
      cancelButtonText: 'Hủy'
    }).then(async (r) => {
      if (r.isConfirmed) {
        try {
          const res = await API.put(`/admin/users/${id}/reset-password`, { newPassword: 'Reset@123456' });
          Swal.fire('Thành công', res.message, 'success');
        } catch (e) {
          Utils.showToast(e.message, 'error');
        }
      }
    });
  },

  // 3. Quản lý danh mục Tab
  async renderCategories() {
    const el = document.getElementById('adminTabBody');
    el.innerHTML = '<div class="flex items-center justify-center py-16"><i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i></div>';

    try {
      const res = await API.get('/admin/categories');
      const cats = res.data || [];

      el.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 class="font-bold text-slate-800 text-sm">Danh mục tài sản & Cấu trúc phân cấp</h3>
              <p class="text-xs text-slate-500">Hỗ trợ danh mục cha - con (Điện tử, Điện lạnh, Đồ bếp...) và ràng buộc an toàn</p>
            </div>
            <button onclick="AdminView.openCreateCategoryModal()" class="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition">
              <i class="fas fa-folder-plus mr-1"></i> Thêm danh mục mới
            </button>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Tên danh mục</th>
                  <th class="py-3 px-4">Thuộc danh mục cha</th>
                  <th class="py-3 px-4">Biểu tượng (Icon)</th>
                  <th class="py-3 px-4">Mô tả</th>
                  <th class="py-3 px-4">Số tài sản liên kết</th>
                  <th class="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${cats
                  .map(
                    (c) => `
                  <tr class="hover:bg-slate-50/70 transition">
                    <td class="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <span class="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                        <i class="fas fa-tag"></i>
                      </span>
                      <span>${c.parent_id ? '— ' : ''}${Utils.escapeHtml(c.name)}</span>
                    </td>
                    <td class="py-3 px-4 text-slate-600">${c.parent_name ? `<span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">${c.parent_name}</span>` : '<span class="text-slate-400 font-semibold">(Danh mục gốc)</span>'}</td>
                    <td class="py-3 px-4 font-mono text-slate-500">${c.icon || 'package'}</td>
                    <td class="py-3 px-4 text-slate-500 max-w-[200px] truncate">${c.description || '—'}</td>
                    <td class="py-3 px-4 font-bold ${c.asset_count > 0 ? 'text-blue-600' : 'text-slate-400'}">${c.asset_count} tài sản</td>
                    <td class="py-3 px-4 text-right space-x-1">
                      <button onclick="AdminView.openEditCategoryModal(${c.id})" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded" title="Sửa"><i class="fas fa-edit"></i></button>
                      <button onclick="AdminView.deleteCategory(${c.id})" class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded" title="Xóa"><i class="fas fa-trash-can"></i></button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  },

  async openCreateCategoryModal() {
    const res = await API.get('/admin/categories');
    const parents = (res.data || []).filter((c) => !c.parent_id);

    Swal.fire({
      title: 'Thêm danh mục mới',
      html: `
        <div class="text-left space-y-3 pt-2">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tên danh mục *</label>
            <input type="text" id="catName" placeholder="Tên danh mục" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Danh mục cha (Tùy chọn)</label>
            <select id="catParent" class="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white">
              <option value="">(Không có - Đây là danh mục gốc)</option>
              ${parents.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Biểu tượng (Icon)</label>
            <input type="text" id="catIcon" value="package" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Mô tả tóm tắt</label>
            <textarea id="catDesc" rows="2" class="w-full text-xs p-2 border border-slate-300 rounded-lg"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Tạo danh mục',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const name = document.getElementById('catName').value;
        const parent_id = document.getElementById('catParent').value;
        const icon = document.getElementById('catIcon').value;
        const description = document.getElementById('catDesc').value;
        if (!name) {
          Swal.showValidationMessage('Tên danh mục không được để trống');
          return false;
        }
        return { name, parent_id: parent_id ? parseInt(parent_id) : null, icon, description };
      }
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          const resp = await API.post('/admin/categories', res.value);
          Utils.showToast(resp.message, 'success');
          AdminView.renderCategories();
        } catch (e) {
          Utils.showToast(e.message, 'error');
        }
      }
    });
  },

  async openEditCategoryModal(id) {
    try {
      const res = await API.get('/admin/categories');
      const cats = res.data || [];
      const cat = cats.find((c) => c.id === id);
      if (!cat) {
        Utils.showToast('Không tìm thấy danh mục', 'error');
        return;
      }
      const potentialParents = cats.filter((c) => !c.parent_id && c.id !== id);

      Swal.fire({
        title: 'Chỉnh sửa danh mục',
        html: `
          <div class="text-left space-y-3 pt-2">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tên danh mục *</label>
              <input type="text" id="editCatName" value="${Utils.escapeHtml(cat.name)}" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Danh mục cha (Tùy chọn)</label>
              <select id="editCatParent" class="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white">
                <option value="">(Không có - Đây là danh mục gốc)</option>
                ${potentialParents.map((p) => `<option value="${p.id}" ${cat.parent_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Biểu tượng (Icon)</label>
              <input type="text" id="editCatIcon" value="${Utils.escapeHtml(cat.icon || 'package')}" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
              <textarea id="editCatDesc" rows="2" class="w-full text-xs p-2 border border-slate-300 rounded-lg">${Utils.escapeHtml(cat.description || '')}</textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Lưu thay đổi',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
          const name = document.getElementById('editCatName').value;
          const parent_id = document.getElementById('editCatParent').value;
          const icon = document.getElementById('editCatIcon').value;
          const description = document.getElementById('editCatDesc').value;
          if (!name) {
            Swal.showValidationMessage('Tên danh mục không được để trống');
            return false;
          }
          return { name, parent_id: parent_id ? parseInt(parent_id) : null, icon, description };
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const resp = await API.put(`/admin/categories/${id}`, result.value);
            Utils.showToast(resp.message, 'success');
            AdminView.renderCategories();
          } catch (e) {
            Utils.showToast(e.message, 'error');
          }
        }
      });
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async deleteCategory(id) {
    const ok = await Utils.confirmDialog('Xóa danh mục?', 'Ràng buộc an toàn: Không thể xóa danh mục nếu đang có tài sản liên kết.', 'Xóa', '#dc2626');
    if (!ok) return;

    try {
      const res = await API.delete(`/admin/categories/${id}`);
      Utils.showToast(res.message, 'success');
      this.renderCategories();
    } catch (e) {
      Utils.showToast(e.message, 'error');
    }
  },

  // 4. Kiểm duyệt tài sản (Moderation) Tab
  async renderModeration() {
    const el = document.getElementById('adminTabBody');
    el.innerHTML = '<div class="flex items-center justify-center py-16"><i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i></div>';

    try {
      const res = await API.get('/assets', { limit: 50 });
      const assets = res.data || [];

      el.innerHTML = `
        <div class="space-y-4">
          <div class="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200">
            <h3 class="font-bold text-indigo-900 text-sm">Kiểm duyệt hình ảnh & Thông tin tài sản</h3>
            <p class="text-xs text-indigo-700 mt-0.5">Quản trị viên có thể gắn cờ (Flag) hoặc hủy gắn cờ đối với các tài sản có hình ảnh/thông tin sai lệch</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${assets
              .map(
                (a) => `
              <div class="bg-white rounded-xl border ${
                a.is_flagged ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'
              } p-4 space-y-3 shadow-2xs">
                <div class="h-36 rounded-lg bg-slate-100 overflow-hidden relative">
                  <img src="${Utils.getAssetImageUrl(a)}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300'">
                  ${
                    a.is_flagged
                      ? '<span class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">ĐANG GẮN CỜ</span>'
                      : ''
                  }
                </div>

                <div>
                  <h4 class="font-bold text-slate-800 text-xs truncate">${Utils.escapeHtml(a.name)}</h4>
                  <p class="text-[11px] text-slate-500 mt-0.5">Người đăng: <strong class="text-slate-700">${a.owner_name || 'Chủ hộ'}</strong></p>
                </div>

                <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button onclick="AdminView.toggleFlagAsset(${a.id})" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    a.is_flagged
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }">
                    <i class="fas ${a.is_flagged ? 'fa-flag-checkered' : 'fa-flag'} mr-1"></i>
                    ${a.is_flagged ? 'Bỏ gắn cờ' : 'Gắn cờ vi phạm'}
                  </button>

                  <button onclick="AssetDetailView.open(${a.id})" class="text-xs text-blue-600 hover:underline">Chi tiết</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  },

  async toggleFlagAsset(id) {
    try {
      const res = await API.put(`/admin/assets/${id}/flag`);
      Utils.showToast(res.message, 'success');
      this.renderModeration();
    } catch (e) {
      Utils.showToast(e.message, 'error');
    }
  },

  // 5. Cấu hình hệ thống Tab
  async renderSettings() {
    const el = document.getElementById('adminTabBody');
    el.innerHTML = '<div class="flex items-center justify-center py-16"><i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i></div>';

    try {
      const res = await API.get('/admin/settings');
      const s = res.settings || {};

      el.innerHTML = `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs max-w-2xl space-y-5">
          <div>
            <h3 class="font-bold text-slate-800 text-base">Cấu hình tham số toàn hệ thống</h3>
            <p class="text-xs text-slate-500 mt-1">Thiết lập ngưỡng ngày cảnh báo bảo hành, thông tin hệ thống và email nhắc nhở</p>
          </div>

          <form onsubmit="AdminView.handleSaveSettings(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Ngưỡng ngày cảnh báo bảo hành mặc định</label>
              <input type="number" id="setWarningDays" value="${s.warning_threshold_days || 30}" min="1" max="180" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
              <span class="text-[10px] text-slate-400">Các tài sản còn ít hơn số ngày này sẽ được chuyển trạng thái "Sắp hết hạn"</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tên hệ thống hiển thị</label>
              <input type="text" id="setSysName" value="${s.system_name || 'Hệ thống Quản lý Tài sản và Bảo hành Gia đình'}" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Đơn vị tiền tệ</label>
              <input type="text" id="setCurrency" value="${s.currency || '₫'}" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
            </div>

            <div class="pt-3 border-t border-slate-100 flex justify-end">
              <button type="submit" class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">
                <i class="fas fa-save mr-1"></i> Lưu cấu hình
              </button>
            </div>
          </form>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  },

  async handleSaveSettings(e) {
    e.preventDefault();
    const settings = {
      warning_threshold_days: document.getElementById('setWarningDays').value,
      system_name: document.getElementById('setSysName').value,
      currency: document.getElementById('setCurrency').value
    };

    try {
      const res = await API.put('/admin/settings', { settings });
      Utils.showToast(res.message, 'success');
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  // 6. Audit Logs Tab
  async renderAuditLogs() {
    const el = document.getElementById('adminTabBody');
    el.innerHTML = '<div class="flex items-center justify-center py-16"><i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i></div>';

    try {
      const res = await API.get('/admin/audit-logs', { limit: 50 });
      const logs = res.data || [];

      el.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-sm">Nhật ký kiểm toán an toàn (Audit Logs)</h3>
            <span class="text-xs text-slate-400">Ghi lại toàn bộ hành vi thêm, sửa, xóa, khóa user</span>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Thời gian</th>
                  <th class="py-3 px-4">Tài khoản thực hiện</th>
                  <th class="py-3 px-4">Hành động</th>
                  <th class="py-3 px-4">Thực thể</th>
                  <th class="py-3 px-4">Chi tiết</th>
                  <th class="py-3 px-4">Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${logs
                  .map(
                    (l) => `
                  <tr class="hover:bg-slate-50/70 transition">
                    <td class="py-3 px-4 text-slate-500">${Utils.formatDateTime(l.created_at)}</td>
                    <td class="py-3 px-4 font-semibold text-slate-700">${l.user_email || 'System'}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">${l.action}</span>
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-500">${l.entity_type || '—'} #${l.entity_id || '—'}</td>
                    <td class="py-3 px-4 text-slate-700 max-w-[280px] truncate" title="${Utils.escapeHtml(l.details)}">${Utils.escapeHtml(l.details)}</td>
                    <td class="py-3 px-4 font-mono text-slate-400 text-[11px]">${l.ip_address || '127.0.0.1'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  }
};

