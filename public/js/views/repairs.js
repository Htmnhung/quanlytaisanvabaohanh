// Repairs Management View

const RepairsView = {
  currentTab: 'list', // 'list' or 'shops'
  filterStatus: '',
  allAssets: [],

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800">Quản lý lịch sử sửa chữa & Bảo dưỡng</h1>
            <p class="text-sm text-slate-500 mt-1">Theo dõi các lần bảo trì, kiểm soát chi phí hỏng hóc và liên hệ thợ sửa uy tín</p>
          </div>

          <div class="flex items-center gap-3">
            ${
              Auth.canManage()
                ? `
              <button onclick="RepairsView.openAddModal()" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-sm transition">
                <i class="fas fa-plus mr-2"></i> Ghi nhận sửa chữa
              </button>
            `
                : ''
            }
          </div>
        </div>

        <!-- Navigation Tabs: List vs Trusted Repair Shops -->
        <div class="flex items-center gap-2 border-b border-slate-200 text-sm">
          <button onclick="RepairsView.switchTab('list')" class="px-4 py-2.5 font-semibold transition border-b-2 ${
            this.currentTab === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }">
            <i class="fas fa-wrench mr-1.5"></i> Danh sách sửa chữa
          </button>
          <button onclick="RepairsView.switchTab('shops')" class="px-4 py-2.5 font-semibold transition border-b-2 ${
            this.currentTab === 'shops'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }">
            <i class="fas fa-store mr-1.5"></i> Danh bạ Đơn vị sửa chữa uy tín
          </button>
        </div>

        <!-- Tab Content Container -->
        <div id="repairTabContent"></div>
      </div>
    `;

    await this.loadAllAssets();
    if (this.currentTab === 'list') {
      await this.renderRepairsList();
    } else {
      await this.renderShopsList();
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render(document.getElementById('mainContent'));
  },

  async loadAllAssets() {
    try {
      const res = await API.get('/assets', { limit: 100 });
      this.allAssets = res.data || [];
    } catch (e) {
      console.error(e);
    }
  },

  async renderRepairsList() {
    const tabEl = document.getElementById('repairTabContent');
    tabEl.innerHTML = `
      <div class="flex items-center justify-center py-16">
        <i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
      </div>
    `;

    try {
      const res = await API.get('/repairs', { status: this.filterStatus });
      const repairs = res.data || [];

      tabEl.innerHTML = `
        <div class="space-y-5">
          <!-- Summary Counters -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng số lượt sửa</p>
              <h3 class="text-xl font-bold text-slate-800 mt-1">${res.totalCount || 0} lần</h3>
            </div>
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p class="text-xs font-semibold text-amber-600 uppercase tracking-wider">Đang trong tiến trình sửa</p>
              <h3 class="text-xl font-bold text-amber-600 mt-1">${res.activeRepairCount || 0} thiết bị</h3>
            </div>
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p class="text-xs font-semibold text-rose-600 uppercase tracking-wider">Tổng chi phí sửa chữa</p>
              <h3 class="text-xl font-bold text-rose-600 mt-1">${Utils.formatCurrency(res.totalCost)}</h3>
            </div>
          </div>

          <!-- Filter Sub-bar -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-600">Trạng thái:</span>
              <button onclick="RepairsView.setFilterStatus('')" class="px-3 py-1 rounded-lg text-xs font-medium transition ${
                !this.filterStatus ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }">Tất cả</button>
              <button onclick="RepairsView.setFilterStatus('repairing')" class="px-3 py-1 rounded-lg text-xs font-medium transition ${
                this.filterStatus === 'repairing' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }">Đang sửa (${res.activeRepairCount || 0})</button>
              <button onclick="RepairsView.setFilterStatus('completed')" class="px-3 py-1 rounded-lg text-xs font-medium transition ${
                this.filterStatus === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }">Đã hoàn thành</button>
            </div>
          </div>

          <!-- Repairs Table -->
          ${
            repairs.length === 0
              ? `
            <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-2">
                <i class="fas fa-screwdriver-wrench"></i>
              </div>
              <h4 class="font-semibold text-slate-700 text-sm">Chưa có bản ghi sửa chữa nào</h4>
              <p class="text-xs text-slate-400 mt-0.5">Bấm nút "Ghi nhận sửa chữa" phía trên để lưu thông tin sửa chữa đầu tiên.</p>
            </div>
          `
              : `
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-4">Tài sản liên quan</th>
                      <th class="py-3 px-4">Ngày đem sửa</th>
                      <th class="py-3 px-4">Nội dung hỏng hóc</th>
                      <th class="py-3 px-4">Đơn vị sửa chữa</th>
                      <th class="py-3 px-4">Chi phí</th>
                      <th class="py-3 px-4">Trạng thái</th>
                      <th class="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${repairs
                      .map(
                        (r) => `
                      <tr class="hover:bg-slate-50/70 transition">
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-2.5">
                            <img src="${Utils.getAssetImageUrl({ name: r.asset_name, image_url: r.asset_image })}" class="w-8 h-8 rounded-lg object-cover bg-slate-100" onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=80'">
                            <span class="font-semibold text-slate-800 cursor-pointer hover:text-blue-600" onclick="AssetDetailView.open(${r.asset_id})">${Utils.escapeHtml(r.asset_name)}</span>
                          </div>
                        </td>
                        <td class="py-3 px-4 text-slate-600">${Utils.formatDate(r.repair_date)}</td>
                        <td class="py-3 px-4 text-slate-700 max-w-[220px]">
                          <p class="truncate" title="${Utils.escapeHtml(r.issue_description)}">${Utils.escapeHtml(r.issue_description)}</p>
                          ${r.return_date ? `<span class="text-[10px] text-slate-400">Trả: ${Utils.formatDate(r.return_date)}</span>` : ''}
                        </td>
                        <td class="py-3 px-4 text-slate-600 font-medium">${Utils.escapeHtml(r.repair_shop || '—')}</td>
                        <td class="py-3 px-4">
                          ${
                            r.is_under_warranty
                              ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">0 ₫ (Miễn phí BH)</span>'
                              : `<span class="font-bold text-slate-800">${Utils.formatCurrency(r.cost)}</span>`
                          }
                        </td>
                        <td class="py-3 px-4">
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200 pulse-urgent'
                          }">
                            ${r.status === 'completed' ? 'Đã hoàn thành' : 'Đang sửa chữa'}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right space-x-1">
                          ${
                            r.receipt_url
                              ? `<a href="${r.receipt_url}" target="_blank" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Xem biên nhận"><i class="fas fa-receipt"></i></a>`
                              : ''
                          }
                          ${
                            Auth.canManage()
                              ? `
                            <button onclick="RepairsView.openEditModal(${r.id})" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded" title="Sửa"><i class="fas fa-edit"></i></button>
                            <button onclick="RepairsView.deleteRepair(${r.id})" class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded" title="Xóa"><i class="fas fa-trash-can"></i></button>
                          `
                              : ''
                          }
                        </td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `
          }
        </div>
      `;
    } catch (err) {
      tabEl.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  },

  setFilterStatus(st) {
    this.filterStatus = st;
    this.renderRepairsList();
  },

  async renderShopsList() {
    const tabEl = document.getElementById('repairTabContent');
    tabEl.innerHTML = `
      <div class="flex items-center justify-center py-16">
        <i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
      </div>
    `;

    try {
      const res = await API.get('/repairs/repair-shops');
      const shops = res.data || [];

      tabEl.innerHTML = `
        <div class="space-y-4">
          <div class="bg-amber-50/60 p-4 rounded-xl border border-amber-200 flex items-center justify-between">
            <div>
              <h4 class="font-bold text-amber-900 text-sm">Danh bạ Trung tâm & Đơn vị sửa chữa gia đình</h4>
              <p class="text-xs text-amber-700 mt-0.5">Số điện thoại khẩn cấp khi máy giặt, tủ lạnh, tivi, điều hòa gặp sự cố</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${shops
              .map(
                (s) => `
              <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="font-bold text-slate-800 text-sm">${Utils.escapeHtml(s.name)}</h3>
                    <p class="text-xs text-blue-600 font-medium mt-0.5"><i class="fas fa-screwdriver-wrench mr-1"></i> ${s.specialty || 'Điện tử & Gia dụng'}</p>
                  </div>
                  <span class="inline-flex items-center text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <i class="fas fa-star mr-1"></i> ${s.rating || 5.0}
                  </span>
                </div>

                <div class="text-xs text-slate-500 space-y-1">
                  <p class="flex items-center gap-2"><i class="fas fa-location-dot text-slate-400"></i> ${s.address || 'Hà Nội'}</p>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a href="tel:${s.phone}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                    <i class="fas fa-phone-alt"></i> Gọi ngay: ${s.phone}
                  </a>
                  <span class="text-[11px] text-slate-400">Hỗ trợ tại nhà</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    } catch (err) {
      tabEl.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  },

  openAddModal() {
    this.showRepairModal({ isEdit: false });
  },

  async openEditModal(id) {
    try {
      const res = await API.get('/repairs');
      const repair = res.data.find((item) => item.id === id);
      if (repair) {
        this.showRepairModal({ isEdit: true, repair });
      }
    } catch (e) {
      Utils.showToast(e.message, 'error');
    }
  },

  showRepairModal({ isEdit = false, repair = {} }) {
    const modalEl = document.getElementById('genericModal');
    const titleEl = document.getElementById('genericModalTitle');
    const contentEl = document.getElementById('genericModalContent');

    titleEl.textContent = isEdit ? 'Chỉnh sửa bản ghi sửa chữa' : 'Ghi nhận sửa chữa thiết bị';

    const todayStr = new Date().toISOString().split('T')[0];

    contentEl.innerHTML = `
      <form id="repairForm" class="space-y-4" onsubmit="RepairsView.handleSaveRepair(event, ${isEdit ? repair.id : 'null'})">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Thiết bị cần sửa chữa <span class="text-red-500">*</span></label>
          <select name="asset_id" required ${isEdit ? 'disabled' : ''} class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
            <option value="">-- Chọn tài sản --</option>
            ${this.allAssets
              .map(
                (a) => `
              <option value="${a.id}" ${repair.asset_id == a.id ? 'selected' : ''}>
                ${a.name} (${a.brand || 'Khác'} - ${a.room_location})
              </option>
            `
              )
              .join('')}
          </select>
          ${isEdit ? `<input type="hidden" name="asset_id" value="${repair.asset_id}">` : ''}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Ngày đem sửa / Phát sinh <span class="text-red-500">*</span></label>
            <input type="date" name="repair_date" required value="${repair.repair_date || todayStr}" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Ngày nhận lại (dự kiến/thực tế)</label>
            <input type="date" name="return_date" value="${repair.return_date || ''}" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Mô tả hỏng hóc & Triệu chứng <span class="text-red-500">*</span></label>
          <textarea name="issue_description" required rows="2" placeholder="Ví dụ: Máy giặt kêu to khi vắt, báo lỗi E10..." class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">${Utils.escapeHtml(repair.issue_description || '')}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Đơn vị / Thợ sửa chữa</label>
            <input type="text" name="repair_shop" placeholder="Điện lạnh Bách Khoa, Sony Care..." value="${Utils.escapeHtml(repair.repair_shop || '')}" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Chi phí sửa chữa (VNĐ)</label>
            <input type="number" name="cost" min="0" value="${repair.cost !== undefined ? repair.cost : 0}" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Trạng thái sửa chữa</label>
            <select name="status" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
              <option value="completed" ${repair.status === 'completed' ? 'selected' : ''}>Đã hoàn thành</option>
              <option value="repairing" ${repair.status === 'repairing' ? 'selected' : ''}>Đang sửa chữa (Cần theo dõi)</option>
            </select>
          </div>

          <div class="flex items-center pt-5">
            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input type="checkbox" name="is_under_warranty" value="1" ${repair.is_under_warranty ? 'checked' : ''} class="w-4 h-4 text-blue-600 rounded">
              <span>Bảo hành miễn phí (Chi phí = 0đ)</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Ảnh biên lai / Phiếu sửa chữa</label>
          <input type="file" name="receipt" accept="image/*,.pdf" class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700">
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" onclick="document.getElementById('genericModal').classList.add('hidden')" class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
            Hủy bỏ
          </button>
          <button type="submit" class="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition">
            <i class="fas fa-save mr-1"></i> ${isEdit ? 'Lưu thay đổi' : 'Ghi nhận sửa chữa'}
          </button>
        </div>
      </form>
    `;

    modalEl.classList.remove('hidden');
  },

  async handleSaveRepair(e, editId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      let res;
      if (editId) {
        res = await API.upload(`/repairs/${editId}`, formData, 'PUT');
      } else {
        res = await API.upload('/repairs', formData, 'POST');
      }

      Utils.showToast(res.message, 'success');
      document.getElementById('genericModal').classList.add('hidden');
      this.renderRepairsList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async deleteRepair(id) {
    const ok = await Utils.confirmDialog('Xóa bản ghi sửa chữa?', 'Bản ghi sẽ bị xóa khỏi lịch sử của tài sản.', 'Xóa', '#dc2626');
    if (!ok) return;

    try {
      const res = await API.delete(`/repairs/${id}`);
      Utils.showToast(res.message, 'success');
      this.renderRepairsList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  }
};

