// Reports & Analytics View

const ReportsView = {
  charts: {},
  fromDate: '',
  toDate: '',

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800">Thống kê & Báo cáo tài sản</h1>
            <p class="text-sm text-slate-500 mt-1">Phân tích chi phí đầu tư mua sắm, chi phí sửa chữa và hiện trạng bảo hành</p>
          </div>

          <!-- Export Actions -->
          <div class="flex items-center gap-2">
            <button onclick="ReportsView.exportExcel()" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition shadow-2xs">
              <i class="fas fa-file-excel mr-2 text-emerald-600"></i> Xuất file Excel (.xlsx)
            </button>
            <button onclick="ReportsView.printReport()" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition shadow-2xs">
              <i class="fas fa-print mr-2 text-blue-600"></i> Xuất bản in / PDF
            </button>
          </div>
        </div>

        <!-- Date Range Filter Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
          <div class="flex items-center gap-2.5 flex-wrap text-xs">
            <span class="font-semibold text-slate-600">Khoảng thời gian:</span>
            <input type="date" id="repFromDate" value="${this.fromDate}" class="p-1.5 border border-slate-200 rounded-lg focus:border-blue-500 bg-white">
            <span class="text-slate-400">đến</span>
            <input type="date" id="repToDate" value="${this.toDate}" class="p-1.5 border border-slate-200 rounded-lg focus:border-blue-500 bg-white">
            <button onclick="ReportsView.applyDateFilter()" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
              Áp dụng lọc
            </button>
            <button onclick="ReportsView.resetDateFilter()" class="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 transition">
              Đặt lại
            </button>
          </div>

          <span class="text-xs text-slate-400">Báo cáo tự động cập nhật thời gian thực</span>
        </div>

        <!-- Synchronized Summary Counter Cards (Đồng bộ với Dashboard) -->
        <div id="reportsSummaryCards" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div class="col-span-full py-4 text-center text-slate-400 text-xs"><i class="fas fa-circle-notch fa-spin mr-1.5 text-blue-500"></i> Đang tải dữ liệu tổng quan...</div>
        </div>

        <!-- Charts Grid 1: Category Distribution & Warranty Status -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Category Doughnut -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-slate-800 text-sm">Phân bổ tài sản theo Danh mục</h3>
              <p class="text-xs text-slate-400 mt-0.5">Tỷ lệ số lượng thiết bị giữa các nhóm</p>
            </div>
            <div class="h-64 my-2 relative flex items-center justify-center">
              <canvas id="categoryChart"></canvas>
            </div>
            <div id="categoryChartLegend" class="text-xs text-slate-500 space-y-1"></div>
          </div>

          <!-- Location Doughnut -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-slate-800 text-sm">Phân bổ tài sản theo Vị trí đặt</h3>
              <p class="text-xs text-slate-400 mt-0.5">Không gian phòng bố trí các thiết bị</p>
            </div>
            <div class="h-64 my-2 relative flex items-center justify-center">
              <canvas id="locationChart"></canvas>
            </div>
            <div id="locationChartLegend" class="text-xs text-slate-500 space-y-1"></div>
          </div>

          <!-- Warranty Doughnut -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-slate-800 text-sm">Tỷ lệ Trạng thái Bảo hành</h3>
              <p class="text-xs text-slate-400 mt-0.5">Hiện trạng bảo hành toàn bộ thiết bị</p>
            </div>
            <div class="h-64 my-2 relative flex items-center justify-center">
              <canvas id="warrantyChart"></canvas>
            </div>
            <div id="warrantyChartLegend" class="text-xs text-slate-500 space-y-1"></div>
          </div>
        </div>

        <!-- Charts Grid 2: Monthly Expenses Trend (Purchase vs Repair) -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-bold text-slate-800 text-sm">Xu hướng chi phí: Mua sắm vs Sửa chữa theo tháng</h3>
              <p class="text-xs text-slate-400 mt-0.5">So sánh ngân sách mua đồ dùng mới và chi phí bảo trì hỏng hóc</p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-medium">12 tháng gần nhất</span>
          </div>
          <div class="h-72 w-full">
            <canvas id="monthlyTrendChart"></canvas>
          </div>
        </div>

        <!-- Tables: Top Problematic Assets -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Top Frequently Broken Items -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div>
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i class="fas fa-triangle-exclamation text-amber-500"></i> Top tài sản hay phát sinh hỏng hóc nhất
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Các thiết bị có số lần sửa chữa nhiều nhất</p>
            </div>

            <div id="mostBrokenTable" class="min-h-[140px]">
              <div class="flex items-center justify-center py-8"><i class="fas fa-circle-notch fa-spin text-blue-500"></i></div>
            </div>
          </div>

          <!-- Top Costly Repair Items -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div>
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i class="fas fa-receipt text-rose-500"></i> Top tài sản tốn chi phí sửa chữa cao nhất
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Các thiết bị ngốn nhiều ngân sách bảo dưỡng nhất</p>
            </div>

            <div id="highestCostTable" class="min-h-[140px]">
              <div class="flex items-center justify-center py-8"><i class="fas fa-circle-notch fa-spin text-blue-500"></i></div>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.fetchAndRenderStats();
  },

  applyDateFilter() {
    this.fromDate = document.getElementById('repFromDate').value;
    this.toDate = document.getElementById('repToDate').value;
    this.fetchAndRenderStats();
  },

  resetDateFilter() {
    this.fromDate = '';
    this.toDate = '';
    document.getElementById('repFromDate').value = '';
    document.getElementById('repToDate').value = '';
    this.fetchAndRenderStats();
  },

  async fetchAndRenderStats() {
    try {
      const res = await API.get('/reports/statistics', {
        from_date: this.fromDate,
        to_date: this.toDate
      });

      this.renderSummaryCards(res.summary || res.stats || {});
      this.renderCategoryChart(res.categoryStats || []);
      this.renderLocationChart(res.locationStats || []);
      this.renderWarrantyChart(res.warrantyCounts || {});
      this.renderMonthlyChart(res.monthlyTrends || []);
      this.renderBrokenTable(res.mostBroken || []);
      this.renderCostTable(res.highestRepairCost || []);
    } catch (err) {
      console.error('Lỗi nạp báo cáo:', err);
    }
  },

  renderSummaryCards(s = {}) {
    const el = document.getElementById('reportsSummaryCards');
    if (!el) return;

    el.innerHTML = `
      <!-- 1. Total Assets -->
      <div onclick="window.Router.navigate('assets')" class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 transition cursor-pointer">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tổng tài sản</p>
        <h4 class="text-xl font-bold text-slate-800 mt-1">${s.totalAssets || 0}</h4>
        <p class="text-[11px] text-blue-600 font-medium mt-0.5 truncate" title="${Utils.formatCurrency(s.totalPurchaseValue)}">${Utils.formatCurrency(s.totalPurchaseValue)}</p>
      </div>

      <!-- 2. Active Warranties -->
      <div onclick="window.Router.navigate('assets', { warranty_status: 'active' })" class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-400 transition cursor-pointer">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Còn bảo hành</p>
        <h4 class="text-xl font-bold text-emerald-600 mt-1">${s.activeWarranties || 0}</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Đang an tâm sử dụng</p>
      </div>

      <!-- 3. Expiring Warranties -->
      <div onclick="window.Router.navigate('warranty-alerts')" class="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs hover:bg-amber-50/40 transition cursor-pointer">
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Sắp hết hạn</p>
        </div>
        <h4 class="text-xl font-bold text-amber-600 mt-1">${s.expiringWarranties || 0}</h4>
        <p class="text-[11px] text-amber-700 mt-0.5">Trong ${s.warningThresholdDays || 30} ngày</p>
      </div>

      <!-- 4. Expired Warranties -->
      <div onclick="window.Router.navigate('assets', { warranty_status: 'expired' })" class="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs hover:bg-rose-50/40 transition cursor-pointer">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Đã hết hạn bảo hành</p>
        <h4 class="text-xl font-bold text-rose-600 mt-1">${s.expiredWarranties || 0}</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Hết thời hạn bảo hành</p>
      </div>

      <!-- 5. Repairing Assets -->
      <div onclick="window.Router.navigate('repairs', { status: 'repairing' })" class="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs hover:bg-purple-50/40 transition cursor-pointer">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Đang sửa chữa</p>
        <h4 class="text-xl font-bold text-purple-700 mt-1">${s.repairingCount || 0} <span class="text-xs font-semibold text-purple-500">tài sản</span></h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Thiết bị bảo trì</p>
      </div>

      <!-- 6. Total Repair Cost -->
      <div onclick="window.Router.navigate('repairs')" class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition cursor-pointer">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tổng chi phí sửa</p>
        <h4 class="text-xl font-bold text-rose-600 mt-1 truncate" title="${Utils.formatCurrency(s.totalRepairCost)}">${Utils.formatCurrency(s.totalRepairCost)}</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">${s.totalRepairs || 0} lượt sửa chữa</p>
      </div>
    `;
  },

  renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    if (this.charts.category) this.charts.category.destroy();

    const labels = data.map((d) => d.category_name);
    const counts = data.map((d) => d.count);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

    this.charts.category = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Chưa có dữ liệu'],
        datasets: [{
          data: counts.length ? counts : [1],
          backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '65%'
      }
    });

    const legendEl = document.getElementById('categoryChartLegend');
    if (legendEl) {
      legendEl.innerHTML = data.slice(0, 4).map((d, i) => `
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${colors[i % colors.length]}"></span> ${d.category_name}</span>
          <span class="font-semibold text-slate-700">${d.count} cái (${Utils.formatCurrency(d.total_value)})</span>
        </div>
      `).join('');
    }
  },

  renderLocationChart(data) {
    const ctx = document.getElementById('locationChart');
    if (!ctx) return;
    if (this.charts.location) this.charts.location.destroy();

    const labels = data.map((d) => d.room_location);
    const counts = data.map((d) => d.count);
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b'];

    this.charts.location = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Chưa có dữ liệu'],
        datasets: [{
          data: counts.length ? counts : [1],
          backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '65%'
      }
    });

    const legendEl = document.getElementById('locationChartLegend');
    if (legendEl) {
      legendEl.innerHTML = data.slice(0, 4).map((d, i) => `
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${colors[i % colors.length]}"></span> ${d.room_location}</span>
          <span class="font-semibold text-slate-700">${d.count} món</span>
        </div>
      `).join('');
    }
  },

  renderWarrantyChart(counts) {
    const ctx = document.getElementById('warrantyChart');
    if (!ctx) return;
    if (this.charts.warranty) this.charts.warranty.destroy();

    const labels = ['Còn bảo hành', 'Sắp hết hạn', 'Đã hết hạn'];
    const dataVals = [counts.active || 0, counts.expiring || 0, counts.expired || 0];
    const colors = ['#10b981', '#f59e0b', '#ef4444'];

    this.charts.warranty = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataVals.some((v) => v > 0) ? dataVals : [1, 0, 0],
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '65%'
      }
    });

    const legendEl = document.getElementById('warrantyChartLegend');
    if (legendEl) {
      legendEl.innerHTML = `
        <div class="flex items-center justify-between"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Còn hạn</span><span class="font-semibold text-slate-700">${counts.active || 0}</span></div>
        <div class="flex items-center justify-between"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Sắp hết hạn</span><span class="font-semibold text-slate-700">${counts.expiring || 0}</span></div>
        <div class="flex items-center justify-between"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> Đã hết hạn</span><span class="font-semibold text-slate-700">${counts.expired || 0}</span></div>
      `;
    }
  },

  renderMonthlyChart(trends) {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;
    if (this.charts.monthly) this.charts.monthly.destroy();

    const labels = trends.map((t) => t.label || t.month);
    const purchases = trends.map((t) => (t.purchase !== undefined ? t.purchase : t.purchase_cost) || 0);
    const repairs = trends.map((t) => (t.repair !== undefined ? t.repair : t.repair_cost) || 0);

    this.charts.monthly = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Tháng gần đây'],
        datasets: [
          {
            label: 'Chi phí mua sắm',
            data: purchases.length ? purchases : [0],
            backgroundColor: '#3b82f6',
            borderRadius: 6
          },
          {
            label: 'Chi phí sửa chữa',
            data: repairs.length ? repairs : [0],
            backgroundColor: '#f43f5e',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', align: 'end' }
        },
        scales: {
          y: {
            ticks: {
              callback: (val) => Utils.formatCurrency(val)
            }
          }
        }
      }
    });
  },

  renderBrokenTable(items) {
    const el = document.getElementById('mostBrokenTable');
    if (!el) return;

    if (items.length === 0) {
      el.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Chưa có thiết bị nào ghi nhận hỏng hóc.</p>`;
      return;
    }

    el.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="text-slate-400 border-b border-slate-100">
            <tr>
              <th class="pb-2 font-semibold">Tài sản</th>
              <th class="pb-2 font-semibold">Số lần sửa</th>
              <th class="pb-2 font-semibold text-right">Tổng chi phí</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${items
              .map(
                (item) => `
              <tr class="hover:bg-slate-50 transition">
                <td class="py-2.5">
                  <div class="flex items-center gap-2">
                    <img src="${Utils.getAssetImageUrl(item)}" class="w-7 h-7 rounded object-cover bg-slate-100" onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=80'">
                    <span class="font-semibold text-slate-800 cursor-pointer hover:text-blue-600 truncate max-w-[150px]" onclick="AssetDetailView.open(${item.id})">${Utils.escapeHtml(item.name)}</span>
                  </div>
                </td>
                <td class="py-2.5 font-bold text-amber-600">${item.repair_count} lần</td>
                <td class="py-2.5 text-right font-bold text-slate-800">${Utils.formatCurrency(item.total_repair_cost)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderCostTable(items) {
    const el = document.getElementById('highestCostTable');
    if (!el) return;

    if (items.length === 0) {
      el.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Chưa có chi phí sửa chữa nào phát sinh.</p>`;
      return;
    }

    el.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="text-slate-400 border-b border-slate-100">
            <tr>
              <th class="pb-2 font-semibold">Tài sản</th>
              <th class="pb-2 font-semibold">Giá mua gốc</th>
              <th class="pb-2 font-semibold text-right">Chi phí sửa</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${items
              .map(
                (item) => `
              <tr class="hover:bg-slate-50 transition">
                <td class="py-2.5">
                  <div class="flex items-center gap-2">
                    <img src="${Utils.getAssetImageUrl(item)}" class="w-7 h-7 rounded object-cover bg-slate-100" onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=80'">
                    <span class="font-semibold text-slate-800 cursor-pointer hover:text-blue-600 truncate max-w-[150px]" onclick="AssetDetailView.open(${item.id})">${Utils.escapeHtml(item.name)}</span>
                  </div>
                </td>
                <td class="py-2.5 text-slate-500">${Utils.formatCurrency(item.purchase_price)}</td>
                <td class="py-2.5 text-right font-bold text-rose-600">${Utils.formatCurrency(item.total_repair_cost)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  exportExcel() {
    let url = '/reports/export/excel';
    const params = [];
    if (this.fromDate) params.push('from_date=' + encodeURIComponent(this.fromDate));
    if (this.toDate) params.push('to_date=' + encodeURIComponent(this.toDate));
    if (params.length) url += '?' + params.join('&');
    API.downloadExcel(url, `Bao_cao_tai_san_gia_dinh_${Date.now()}.csv`);
  },

  printReport() {
    window.print();
  }
};

