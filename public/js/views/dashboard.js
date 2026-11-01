// Dashboard View

const DashboardView = {
  chartInstance: null,

  async render(container) {
    container.innerHTML = `
      <div class="flex items-center justify-center py-16">
        <i class="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
      </div>
    `;

    try {
      const data = await API.get('/assets/dashboard');
      const stats = data.stats;
      const recentAssets = data.recentAssets || [];
      const warnings = data.recentWarnings || [];

      container.innerHTML = `
        <div class="space-y-6">
          <!-- Page Header -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-slate-800">Tổng quan tài sản & Bảo hành</h1>
              <p class="text-sm text-slate-500 mt-1">Hệ thống theo dõi trang thiết bị gia đình & cảnh báo bảo hành thông minh</p>
            </div>
            <div class="flex items-center gap-3">
              ${
                Auth.canManage()
                  ? `
                <button onclick="window.Router.navigate('assets', { action: 'add' })" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition">
                  <i class="fas fa-plus mr-2"></i> Thêm tài sản
                </button>
              `
                  : ''
              }
              <button onclick="API.downloadExcel('/reports/export/excel')" class="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition">
                <i class="fas fa-file-excel mr-2 text-emerald-600"></i> Xuất Excel
              </button>
            </div>
          </div>

          <!-- Quick Stat Cards (5 chỉ số riêng biệt) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <!-- 1. Total Assets -->
            <div class="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng tài sản</p>
                <h3 class="text-2xl font-bold text-slate-800 mt-1">${stats.totalAssets || 0}</h3>
                <p class="text-xs text-slate-500 mt-1">Trị giá: <span class="font-medium text-blue-600">${Utils.formatCurrency(stats.totalPurchaseValue)}</span></p>
              </div>
              <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                <i class="fas fa-boxes-stacked"></i>
              </div>
            </div>

            <!-- 2. Active Warranties -->
            <div class="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-300 transition" onclick="window.Router.navigate('assets', { warranty_status: 'active' })" title="Xem tài sản còn bảo hành">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-emerald-600">Còn bảo hành</p>
                <h3 class="text-2xl font-bold text-emerald-600 mt-1">${stats.activeWarranties || 0}</h3>
                <p class="text-xs text-slate-500 mt-1">Đang an tâm sử dụng</p>
              </div>
              <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                <i class="fas fa-shield-halved"></i>
              </div>
            </div>

            <!-- 3. Expiring Warranties -->
            <div class="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-amber-50/40 transition" onclick="window.Router.navigate('warranty-alerts')" title="Xem tài sản sắp hết hạn bảo hành">
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <p class="text-xs font-semibold uppercase tracking-wider text-amber-600">Sắp hết hạn</p>
                </div>
                <h3 class="text-2xl font-bold text-amber-600 mt-1">${stats.expiringWarranties || 0}</h3>
                <p class="text-xs text-amber-700 mt-1">Trong vòng 30 ngày</p>
              </div>
              <div class="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                <i class="fas fa-bell"></i>
              </div>
            </div>

            <!-- 4. Expired Warranties (CHỈ SỐ RIÊNG BIỆT 1: Đã hết hạn bảo hành) -->
            <div class="bg-white p-5 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition" onclick="window.Router.navigate('assets', { warranty_status: 'expired' })" title="Xem tài sản đã hết hạn bảo hành">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-rose-600">Đã hết hạn bảo hành</p>
                <h3 class="text-2xl font-bold text-rose-600 mt-1">${stats.expiredWarranties || 0}</h3>
                <p class="text-xs text-slate-500 mt-1">Hết thời hạn bảo hành</p>
              </div>
              <div class="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
                <i class="fas fa-calendar-xmark"></i>
              </div>
            </div>

            <!-- 5. Repairing Assets (CHỈ SỐ RIÊNG BIỆT 2: Đang sửa chữa) -->
            <div class="bg-white p-5 rounded-xl border border-purple-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-purple-50/40 transition" onclick="window.Router.navigate('repairs', { status: 'repairing' })" title="Xem các thiết bị đang sửa chữa">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-purple-600">Đang sửa chữa</p>
                <h3 class="text-2xl font-bold text-purple-700 mt-1">${stats.repairingCount || 0} <span class="text-sm font-semibold text-purple-500">tài sản</span></h3>
                <p class="text-xs text-slate-500 mt-1">Tổng chi phí: <span class="font-bold text-purple-700">${Utils.formatCurrency(stats.totalRepairCost)}</span></p>
              </div>
              <div class="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
                <i class="fas fa-screwdriver-wrench"></i>
              </div>
            </div>
          </div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left 2 Cols: Recent Assets -->
            <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div class="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-slate-800 text-base">Tài sản gia đình mới thêm</h3>
                  <p class="text-xs text-slate-400 mt-0.5">Các thiết bị và đồ dùng được cập nhật gần nhất</p>
                </div>
                <button onclick="window.Router.navigate('assets')" class="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  Xem tất cả <i class="fas fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              <div class="divide-y divide-slate-100">
                ${
                  recentAssets.length === 0
                    ? `<div class="p-8 text-center text-slate-400 text-sm">Chưa có tài sản nào. Bấm nút Thêm tài sản để bắt đầu.</div>`
                    : recentAssets
                        .map(
                          (ast) => `
                  <div class="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3.5 min-w-0">
                      <img src="${Utils.getAssetImageUrl(ast)}" 
                           class="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0" 
                           onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=100'">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <h4 class="font-medium text-slate-800 text-sm truncate cursor-pointer hover:text-blue-600" onclick="AssetDetailView.open(${ast.id})">${Utils.escapeHtml(ast.name)}</h4>
                          ${ast.is_flagged ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-600">Đã gắn cờ</span>' : ''}
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5 truncate">
                          <span class="text-slate-600 font-medium">${ast.brand || 'Khác'}</span> • ${ast.room_location || 'Phòng khách'} • Mua: ${Utils.formatDate(ast.purchase_date)}
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-3 shrink-0">
                      <div class="text-right hidden sm:block">
                        <p class="text-sm font-semibold text-slate-800">${Utils.formatCurrency(ast.purchase_price)}</p>
                        <div class="mt-0.5">${Utils.renderWarrantyBadge(ast.warrantyInfo)}</div>
                      </div>
                      <button onclick="AssetDetailView.open(${ast.id})" class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Xem chi tiết">
                        <i class="fas fa-chevron-right text-xs"></i>
                      </button>
                    </div>
                  </div>
                `
                        )
                        .join('')
                }
              </div>
            </div>

            <!-- Right Col: Urgent Warranty Alerts -->
            <div class="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm">
                    <i class="fas fa-bell"></i>
                  </div>
                  <div>
                    <h3 class="font-semibold text-slate-800 text-sm">Cảnh báo bảo hành</h3>
                    <p class="text-[11px] text-amber-700">Tài sản sắp hết hoặc quá hạn</p>
                  </div>
                </div>
                <button onclick="window.Router.navigate('warranty-alerts')" class="text-xs font-medium text-amber-700 hover:text-amber-800">
                  Xem tất cả
                </button>
              </div>

              <div class="p-4 flex-1 divide-y divide-slate-100">
                ${
                  warnings.length === 0
                    ? `<div class="p-6 text-center text-slate-400 text-sm">Không có cảnh báo hạn bảo hành nào cần xử lý.</div>`
                    : warnings
                        .map(
                          (item) => `
                  <div class="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                    <div class="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      <img src="${Utils.getAssetImageUrl(item)}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=100'">
                    </div>
                    <div class="flex-1 min-w-0">
                      <h4 class="font-medium text-slate-800 text-xs truncate cursor-pointer hover:text-blue-600" onclick="AssetDetailView.open(${item.id})">${Utils.escapeHtml(item.name)}</h4>
                      <p class="text-[11px] text-slate-500 mt-0.5">Hết hạn: <span class="font-medium text-slate-700">${Utils.formatDate(item.end_date)}</span></p>
                      <div class="mt-1 flex items-center justify-between">
                        ${Utils.renderWarrantyBadge(item.warrantyInfo)}
                        ${
                          item.provider_phone
                            ? `<a href="tel:${item.provider_phone}" class="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium">
                            <i class="fas fa-phone-alt text-[9px]"></i> ${item.provider_phone}
                          </a>`
                            : ''
                        }
                      </div>
                    </div>
                  </div>
                `
                        )
                        .join('')
                }
              </div>

              <div class="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <button onclick="window.Router.navigate('warranty-alerts')" class="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-2xs">
                  <i class="fas fa-calendar-check mr-1.5 text-blue-600"></i> Quản lý toàn bộ hạn bảo hành
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <h4 class="font-bold">Lỗi tải dữ liệu Dashboard</h4>
          <p class="text-sm mt-1">${err.message}</p>
        </div>
      `;
    }
  }
};

