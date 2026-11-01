// Profile & Settings View

const ProfileView = {
  async render(container) {
    const user = Auth.currentUser;
    if (!user) {
      window.Router.navigate('login');
      return;
    }

    container.innerHTML = `
      <div class="space-y-6 max-w-4xl mx-auto">
        <!-- Title -->
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Hồ sơ cá nhân & Cài đặt tài khoản</h1>
          <p class="text-sm text-slate-500 mt-1">Quản lý thông tin đăng nhập, mật khẩu và thành viên gia đình</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Left: User Card -->
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs text-center space-y-4">
            <div class="relative w-24 h-24 mx-auto">
              <img id="profileAvatarPreview" src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3b82f6&color=fff`}" 
                   class="w-full h-full rounded-full object-cover border-4 border-slate-100 shadow-sm">
            </div>

            <div>
              <h3 class="font-bold text-slate-800 text-base">${Utils.escapeHtml(user.full_name)}</h3>
              <p class="text-xs text-slate-500 mt-0.5">${user.email}</p>
              <div class="mt-2">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : user.role === 'head'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700'
                }">
                  ${user.role === 'admin' ? 'Quản trị viên' : user.role === 'head' ? 'Chủ hộ gia đình' : 'Thành viên'}
                </span>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 text-left text-xs text-slate-500 space-y-2">
              <div class="flex items-center justify-between">
                <span>Số điện thoại:</span>
                <span class="font-semibold text-slate-700">${user.phone || 'Chưa cập nhật'}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Trạng thái:</span>
                <span class="font-semibold text-emerald-600">Đang hoạt động</span>
              </div>
            </div>
          </div>

          <!-- Right: Edit Form & Change Password -->
          <div class="md:col-span-2 space-y-6">
            <!-- Edit Profile Form -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i class="fas fa-user-pen text-blue-600"></i> Cập nhật thông tin cá nhân
              </h3>

              <form onsubmit="ProfileView.handleUpdateProfile(event)" class="space-y-4 text-xs">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Họ và tên</label>
                  <input type="text" id="profFullName" value="${Utils.escapeHtml(user.full_name)}" required class="w-full p-2.5 border border-slate-300 rounded-lg">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Email đăng nhập</label>
                    <input type="email" value="${user.email}" disabled class="w-full p-2.5 border border-slate-200 bg-slate-50 text-slate-400 rounded-lg">
                  </div>

                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                    <input type="text" id="profPhone" value="${Utils.escapeHtml(user.phone || '')}" placeholder="0912345678" class="w-full p-2.5 border border-slate-300 rounded-lg">
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Ảnh đại diện (Upload hoặc dán URL)</label>
                  <input type="file" id="profAvatarFile" accept="image/*" class="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 mb-1.5">
                  <input type="text" id="profAvatarUrl" placeholder="Hoặc URL ảnh avatar..." value="${Utils.escapeHtml(user.avatar || '')}" class="w-full p-2 border border-slate-200 rounded-lg">
                </div>

                <div class="flex justify-end pt-2">
                  <button type="submit" class="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-2xs">
                    Lưu thông tin
                  </button>
                </div>
              </form>
            </div>

            <!-- Change Password Form -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i class="fas fa-lock text-amber-500"></i> Đổi mật khẩu đăng nhập
              </h3>

              <form onsubmit="ProfileView.handleChangePassword(event)" class="space-y-4 text-xs">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Mật khẩu hiện tại</label>
                  <input type="password" id="currPass" required placeholder="Nhập mật khẩu đang dùng" class="w-full p-2.5 border border-slate-300 rounded-lg">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Mật khẩu mới (Tối thiểu 8 ký tự)</label>
                    <input type="password" id="newPass" required minlength="8" placeholder="Mật khẩu mới" class="w-full p-2.5 border border-slate-300 rounded-lg">
                  </div>

                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                    <input type="password" id="confirmNewPass" required minlength="8" placeholder="Nhập lại mật khẩu mới" class="w-full p-2.5 border border-slate-300 rounded-lg">
                  </div>
                </div>

                <div class="flex justify-end pt-2">
                  <button type="submit" class="px-5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-2xs">
                    Đổi mật khẩu
                  </button>
                </div>
              </form>
            </div>

            <!-- Family Members List -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i class="fas fa-people-roof text-emerald-600"></i> Thành viên trong cùng hộ gia đình
              </h3>
              <div id="familyMembersList" class="divide-y divide-slate-100 text-xs">
                <div class="py-4 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin mr-1"></i> Đang tải...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.loadFamilyMembers();
  },

  async loadFamilyMembers() {
    const listEl = document.getElementById('familyMembersList');
    if (!listEl) return;

    try {
      const res = await API.get('/auth/family-members');
      const members = res.members || [];

      listEl.innerHTML = members
        .map(
          (m) => `
        <div class="py-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <img src="${m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=3b82f6&color=fff`}" class="w-8 h-8 rounded-full object-cover">
            <div>
              <p class="font-bold text-slate-800">${Utils.escapeHtml(m.full_name)}</p>
              <p class="text-[11px] text-slate-400">${m.email} • ${m.phone || 'Chưa có SĐT'}</p>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            m.role === 'head' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
          }">
            ${m.role === 'head' ? 'Chủ hộ' : 'Thành viên'}
          </span>
        </div>
      `
        )
        .join('');
    } catch (e) {
      listEl.innerHTML = `<p class="text-xs text-red-500 py-2">${e.message}</p>`;
    }
  },

  async handleUpdateProfile(e) {
    e.preventDefault();
    const full_name = document.getElementById('profFullName').value;
    const phone = document.getElementById('profPhone').value;
    const avatar = document.getElementById('profAvatarUrl').value;
    const avatarFileInput = document.getElementById('profAvatarFile');

    try {
      let res;
      if (avatarFileInput && avatarFileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('full_name', full_name);
        formData.append('phone', phone);
        formData.append('avatar', avatarFileInput.files[0]);
        res = await API.upload('/auth/profile', formData, 'PUT');
      } else {
        res = await API.put('/auth/profile', { full_name, phone, avatar });
      }

      Auth.currentUser = res.user;
      localStorage.setItem('family_asset_user', JSON.stringify(res.user));
      Auth.renderNav();
      Utils.showToast(res.message, 'success');
      this.render(document.getElementById('mainContent'));
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currPass').value;
    const newPassword = document.getElementById('newPass').value;
    const confirm = document.getElementById('confirmNewPass').value;

    if (newPassword !== confirm) {
      Utils.showToast('Mật khẩu mới xác nhận không khớp!', 'warning');
      return;
    }

    try {
      const res = await API.put('/auth/change-password', { currentPassword, newPassword });
      Utils.showToast(res.message, 'success');
      document.getElementById('currPass').value = '';
      document.getElementById('newPass').value = '';
      document.getElementById('confirmNewPass').value = '';
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  }
};

