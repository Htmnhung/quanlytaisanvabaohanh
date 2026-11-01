// Warranty Alerts View

const WarrantyAlertsView = {
  activeDaysTab: 30, // 7, 30, 60, 90
  currentSubTab: 'alerts', // 'alerts' or 'centers'

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span>Theo dõi & Cảnh báo hạn bảo hành</span>
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            </h1>
            <p class="text-sm text-slate-500 mt-1">Chủ động bảo dưỡng, gia hạn hoặc yêu cầu hãng sửa chữa trước khi hết hiệu lực</p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="WarrantyAlertsView.switchSubTab('alerts')" class="px-3.5 py-2 text-xs font-semibold rounded-lg border transition ${
              this.currentSubTab === 'alerts'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }">
              <i class="fas fa-bell mr-1.5"></i> Danh sách cảnh báo
            </button>
            <button onclick="WarrantyAlertsView.switchSubTab('centers')" class="px-3.5 py-2 text-xs font-semibold rounded-lg border transition ${
              this.currentSubTab === 'centers'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }">
              <i class="fas fa-headset mr-1.5"></i> Trung tâm BH chính hãng
            </button>
          </div>
        </div>

        ${
          this.currentSubTab === 'alerts'
            ? `
          <!-- Threshold Tabs: 7 / 30 / 60 / 90 Days -->
          <div class="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 flex-wrap shadow-2xs">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-slate-500 mr-1">Ngưỡng cảnh báo:</span>
              <button onclick="WarrantyAlertsView.setDays(7)" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                this.activeDaysTab === 7
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }">
                <i class="fas fa-fire-flame-curved mr-1"></i> Khẩn cấp (7 ngày)
              </button>
              <button onclick="WarrantyAlertsView.setDays(30)" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                this.activeDaysTab === 30
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }">
                30 ngày tới
              </button>
              <button onclick="WarrantyAlertsView.setDays(60)" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                this.activeDaysTab === 60
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }">
                60 ngày tới
              </button>
              <button onclick="WarrantyAlertsView.setDays(90)" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                this.activeDaysTab === 90
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }">
                90 ngày tới
              </button>
            </div>

            <span class="text-xs text-slate-400">Tự động sắp xếp: Còn ít ngày nhất lên đầu</span>
          </div>

          <!-- Alert Cards Container -->
          <div id="warrantyAlertsList"></div>
        `
            : `
          <!-- Service Centers Directory Container -->
          <div id="serviceCentersDirectory"></div>
        `
        }
      </div>
    `;

    if (this.currentSubTab === 'alerts') {
      await this.loadAlerts();
    } else {
      await this.loadCenters();
    }
  },

  switchSubTab(tab) {
    this.currentSubTab = tab;
    this.render(document.getElementById('mainContent'));
  },

  setDays(d) {
    this.activeDaysTab = d;
    this.render(document.getElementById('mainContent'));
  },

  async loadAlerts() {
    const listEl = document.getElementById('warrantyAlertsList');
    listEl.innerHTML = `
      <div class="flex items-center justify-center py-16">
        <i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
      </div>
    `;

    try {
      const res = await API.get('/warranty/expiring', { days: this.activeDaysTab });
      const items = res.data || [];

      if (items.length === 0) {
        listEl.innerHTML = `
          <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div class="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-2">
              <i class="fas fa-check-double"></i>
            </div>
            <h4 class="font-semibold text-slate-700 text-sm">Tuyệt vời! Không có tài sản nào sắp hết hạn trong ${this.activeDaysTab} ngày</h4>
            <p class="text-xs text-slate-400 mt-0.5">Tất cả trang thiết bị gia đình của bạn đều đang trong thời hạn bảo hành an toàn.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${items.map((item) => this.renderAlertCard(item)).join('')}
        </div>
      `;
    } catch (err) {
      listEl.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${err.message}</div>`;
    }
  },

  renderAlertCard(item) {
    const isCritical = item.daysRemaining <= 7;

    return `
      <div class="bg-white rounded-xl border ${
        isCritical ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'
      } shadow-2xs p-5 space-y-4 flex flex-col justify-between">
        <div>
          <!-- Header Card -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <img src="${Utils.getAssetImageUrl(item)}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0" onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=100'">
              <div class="min-w-0">
                <span class="text-[11px] font-bold text-blue-600 uppercase tracking-wider">${item.brand || 'Khác'}</span>
                <h3 class="font-bold text-slate-800 text-sm truncate cursor-pointer hover:text-blue-600" onclick="AssetDetailView.open(${item.asset_id})">${Utils.escapeHtml(item.asset_name)}</h3>
                <p class="text-xs text-slate-400">Vị trí: ${item.room_location || 'Phòng khách'}</p>
              </div>
            </div>

            <!-- Countdown Pill -->
            <div class="text-right shrink-0">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                isCritical ? 'bg-red-100 text-red-700 border border-red-200 pulse-urgent' : 'bg-amber-100 text-amber-700 border border-amber-200'
              }">
                <i class="fas ${isCritical ? 'fa-fire' : 'fa-clock'} mr-1"></i> Còn ${item.daysRemaining} ngày
              </span>
              <p class="text-[11px] text-slate-400 mt-1">Hạn: ${Utils.formatDate(item.end_date)}</p>
            </div>
          </div>

          <!-- Provider & Center Info -->
          <div class="mt-3.5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Trung tâm bảo hành:</span>
              <span class="font-semibold text-slate-700">${item.provider_name || 'Chính hãng'}</span>
            </div>
            ${
              item.provider_phone
                ? `<div class="flex items-center justify-between">
                <span class="text-slate-500">Hotline hỗ trợ:</span>
                <a href="tel:${item.provider_phone}" class="font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <i class="fas fa-phone-alt text-[10px]"></i> ${item.provider_phone}
                </a>
              </div>`
                : ''
            }
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1.5">
            ${
              Auth.canManage()
                ? `
              <button onclick="WarrantyAlertsView.extendWarranty(${item.warranty_id})" class="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200">
                <i class="fas fa-clock-rotate-left mr-1"></i> Gia hạn BH
              </button>
            `
                : ''
            }
            <button onclick="WarrantyAlertsView.sendEmail(${item.asset_id})" class="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-indigo-200" title="Gửi nhắc nhở qua Email">
              <i class="fas fa-envelope mr-1"></i> Gửi mail
            </button>
          </div>

          <div class="flex items-center gap-1">
            ${
              !item.notification_viewed
                ? `<button onclick="WarrantyAlertsView.markViewed(${item.warranty_id})" class="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition" title="Đánh dấu đã xem">
                <i class="fas fa-check mr-1"></i> Đã xem
              </button>`
                : '<span class="text-[11px] text-slate-400 font-medium"><i class="fas fa-check-double text-blue-500 mr-0.5"></i> Đã xem</span>'
            }
            <button onclick="AssetDetailView.open(${item.asset_id})" class="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg" title="Xem chi tiết">
              <i class="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async markViewed(id) {
    try {
      await API.put(`/warranty/${id}/viewed`);
      Utils.showToast('Đã đánh dấu đã xem cảnh báo', 'success');
      this.loadAlerts();
    } catch (e) {
      Utils.showToast(e.message, 'error');
    }
  },

  extendWarranty(warrantyId) {
    AssetDetailView.openExtendModal(warrantyId);
  },

  sendEmail(assetId) {
    AssetDetailView.triggerEmailReminder(assetId);
  },

  async loadCenters() {
    const listEl = document.getElementById('serviceCentersDirectory');
    listEl.innerHTML = `
      <div class="flex items-center justify-center py-16">
        <i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
      </div>
    `;

    try {
      const res = await API.get('/warranty/service-centers');
      const centers = res.data || [];

      listEl.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${centers
            .map(
              (c) => `
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div>
                <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">${c.brand || 'Toàn quốc'}</span>
                <h3 class="font-bold text-slate-800 text-sm mt-0.5">${Utils.escapeHtml(c.name)}</h3>
              </div>

              <div class="text-xs text-slate-500 space-y-1">
                <p class="flex items-start gap-2"><i class="fas fa-location-dot text-slate-400 mt-0.5 shrink-0"></i> <span>${c.address || 'Hà Nội & TP.HCM'}</span></p>
                ${c.notes ? `<p class="text-[11px] text-slate-400 italic">${c.notes}</p>` : ''}
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                <a href="tel:${c.hotline}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                  <i class="fas fa-phone-volume"></i> Hotline: ${c.hotline}
                </a>
                ${
                  c.website
                    ? `<a href="${c.website}" target="_blank" class="text-xs text-blue-600 hover:underline">Website</a>`
                    : ''
                }
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    } catch (e) {
      listEl.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl">${e.message}</div>`;
    }
  }
};

