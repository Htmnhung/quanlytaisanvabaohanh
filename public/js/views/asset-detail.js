// Asset Detail View / Modal

const AssetDetailView = {
  currentAsset: null,

  async open(assetId) {
    const modalEl = document.getElementById('genericModal');
    const titleEl = document.getElementById('genericModalTitle');
    const contentEl = document.getElementById('genericModalContent');

    titleEl.textContent = 'Chi tiết tài sản & Bảo hành';
    contentEl.innerHTML = `
      <div class="flex items-center justify-center py-16">
        <i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
      </div>
    `;
    modalEl.classList.remove('hidden');

    try {
      const res = await API.get(`/assets/${assetId}`);
      this.currentAsset = res.asset;
      this.renderContent(contentEl);
    } catch (err) {
      contentEl.innerHTML = `
        <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          ${err.message}
        </div>
      `;
    }
  },

  renderContent(container) {
    const ast = this.currentAsset;
    const isOwnerOrAdmin = Auth.canManage() && (Auth.isAdmin() || (Auth.currentUser && (ast.family_id === Auth.currentUser.family_id || ast.user_id === Auth.currentUser.id)));
    const w = ast.warrantyInfo;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header Banner with Image & Key Specs -->
        <div class="flex flex-col md:flex-row gap-5 items-start bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
          <!-- Thumbnail with Zoom preview & Quick Photo Update -->
          <div class="w-full md:w-56 h-48 rounded-xl overflow-hidden bg-slate-200 shrink-0 relative group shadow-2xs">
            <img src="${Utils.getAssetImageUrl(ast)}" 
                 class="w-full h-full object-cover"
                 onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500'">
            
            <a href="${Utils.getAssetImageUrl(ast)}" target="_blank" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1.5">
              <i class="fas fa-up-right-and-down-left-from-center"></i> Phóng to ảnh
            </a>

            ${
              isOwnerOrAdmin
                ? `
              <button type="button" onclick="AssetsView.openPhotoModal(${ast.id}, '${Utils.escapeHtml(ast.name)}', '${ast.image_url || ''}')" 
                      class="absolute bottom-2.5 right-2.5 bg-slate-900/80 hover:bg-blue-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-xs transition flex items-center gap-1.5 shadow-md z-10" 
                      title="Đổi ảnh cho sản phẩm này">
                <i class="fas fa-camera"></i> Đổi ảnh
              </button>
            `
                : ''
            }
          </div>

          <!-- Main Info -->
          <div class="flex-1 min-w-0 space-y-3">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span class="text-xs font-bold text-blue-600 uppercase tracking-wider">${ast.brand || 'Thương hiệu khác'} • ${ast.category_name || 'Đồ gia dụng'}</span>
                <h2 class="text-xl font-bold text-slate-800 mt-0.5">${Utils.escapeHtml(ast.name)}</h2>
                <p class="text-xs text-slate-500 mt-0.5">Model: <span class="font-medium text-slate-700">${ast.model || '—'}</span> | Serial: <span class="font-medium text-slate-700 font-mono">${ast.serial_number || '—'}</span></p>
              </div>

              <div class="flex items-center gap-2">
                ${Utils.renderWarrantyBadge(w)}
                ${Utils.renderUsageBadge(ast.usage_status)}
              </div>
            </div>

            <!-- Price & Purchase stats -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 text-xs">
              <div>
                <p class="text-slate-400">Giá mua sắm</p>
                <p class="font-bold text-slate-800 text-sm mt-0.5">${Utils.formatCurrency(ast.purchase_price)}</p>
              </div>
              <div>
                <p class="text-slate-400">Ngày mua</p>
                <p class="font-semibold text-slate-700 mt-0.5">${Utils.formatDate(ast.purchase_date)}</p>
              </div>
              <div>
                <p class="text-slate-400">Vị trí đặt</p>
                <p class="font-semibold text-slate-700 mt-0.5">${ast.room_location || 'Phòng khách'}</p>
              </div>
              <div>
                <p class="text-slate-400">Nơi mua</p>
                <p class="font-semibold text-slate-700 mt-0.5 truncate">${ast.purchase_location || '—'}</p>
              </div>
            </div>

            ${
              ast.notes
                ? `<div class="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600">
                <span class="font-semibold text-slate-700"><i class="fas fa-sticky-note mr-1 text-amber-500"></i> Ghi chú:</span> ${Utils.escapeHtml(ast.notes)}
              </div>`
                : ''
            }
          </div>
        </div>

        <!-- Section 2: Warranty Card & Countdown Box -->
        <div class="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 p-5 rounded-2xl border border-blue-200/80 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm">
                <i class="fas fa-shield-halved"></i>
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-sm">Hồ sơ bảo hành sản phẩm</h3>
                <p class="text-xs text-slate-500">Đơn vị tiếp nhận & Thời hạn bảo dưỡng</p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              ${
                Auth.canManage()
                  ? `
                <button onclick="AssetDetailView.openExtendModal(${ast.warranty_id})" class="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition shadow-2xs">
                  <i class="fas fa-clock-rotate-left mr-1"></i> Gia hạn bảo hành
                </button>
              `
                  : ''
              }
              <button onclick="AssetDetailView.triggerEmailReminder(${ast.id})" class="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition shadow-2xs">
                <i class="fas fa-paper-plane mr-1"></i> Gửi email nhắc hạn
              </button>
            </div>
          </div>

          <!-- Countdown and Key Dates -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-blue-100">
            <div>
              <p class="text-[11px] text-slate-400">Bắt đầu bảo hành</p>
              <p class="text-xs font-semibold text-slate-700 mt-0.5">${Utils.formatDate(ast.warranty_start_date || ast.warranty_start || ast.start_date)}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">Thời hạn: ${ast.warranty_duration_months || ast.duration_months || 12} tháng</p>
            </div>

            <div>
              <p class="text-[11px] text-slate-400">Ngày hết hạn bảo hành</p>
              <p class="text-xs font-bold text-slate-800 mt-0.5">${Utils.formatDate(ast.warranty_end_date || ast.warranty_end || ast.end_date)}</p>
              <p class="text-[10px] text-slate-500 mt-0.5">
                ${(ast.warranty_extension_months || ast.extension_months) > 0 ? `Đã cộng thêm ${ast.warranty_extension_months || ast.extension_months} tháng gia hạn` : 'Hạn chuẩn theo hãng'}
              </p>
            </div>

            <div class="border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-3 pt-2 sm:pt-0">
              <p class="text-[11px] text-slate-400">Đồng hồ đếm ngược</p>
              <div class="mt-1">${Utils.renderWarrantyBadge(w)}</div>
            </div>
          </div>

          <!-- Provider & Hotline -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-blue-100">
            <div>
              <p class="font-semibold text-slate-700">Đơn vị / Trung tâm bảo hành:</p>
              <p class="text-slate-600 mt-0.5">${ast.warranty_provider_name || ast.provider_name || 'Trung tâm ủy quyền chính hãng'}</p>
              ${
                (ast.warranty_provider_address || ast.provider_address)
                  ? `<p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><i class="fas fa-location-dot"></i> ${ast.warranty_provider_address || ast.provider_address}</p>`
                  : ''
              }
            </div>

            <div>
              <p class="font-semibold text-slate-700">Hotline hỗ trợ kỹ thuật:</p>
              ${
                (ast.warranty_provider_phone || ast.provider_phone)
                  ? `<a href="tel:${ast.warranty_provider_phone || ast.provider_phone}" class="inline-flex items-center gap-1.5 font-bold text-blue-600 text-sm hover:underline mt-0.5">
                  <i class="fas fa-phone-volume"></i> ${ast.warranty_provider_phone || ast.provider_phone}
                </a>`
                  : '<p class="text-slate-400 mt-0.5">Chưa có số hotline</p>'
              }
              ${
                (ast.warranty_provider_website || ast.provider_website)
                  ? `<div class="mt-1"><a href="${ast.warranty_provider_website || ast.provider_website}" target="_blank" class="text-[11px] text-blue-500 hover:underline"><i class="fas fa-globe mr-1"></i> Trang web hỗ trợ</a></div>`
                  : ''
              }
            </div>

            ${
              (ast.warranty_conditions || ast.conditions)
                ? `<div class="sm:col-span-2 pt-2 border-t border-slate-100">
                <span class="font-semibold text-slate-700">Điều kiện bảo hành:</span>
                <span class="text-slate-600 ml-1">${Utils.escapeHtml(ast.warranty_conditions || ast.conditions)}</span>
              </div>`
                : ''
            }
          </div>

          <!-- Invoice preview link -->
          ${
            ast.invoice_url
              ? `
            <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100 text-xs">
              <span class="font-semibold text-slate-700 flex items-center gap-2">
                <i class="fas fa-file-invoice text-emerald-600 text-sm"></i> Hóa đơn / Chứng từ mua sắm đã lưu trữ
              </span>
              <a href="${ast.invoice_url}" target="_blank" class="px-3 py-1 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 flex items-center gap-1">
                <i class="fas fa-arrow-up-right-from-square"></i> Xem hóa đơn gốc
              </a>
            </div>
          `
              : ''
          }
        </div>

        <!-- Section 3: Repairs History Tab -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i class="fas fa-screwdriver-wrench text-amber-500"></i> Lịch sử sửa chữa & Bảo dưỡng (${ast.repairs ? ast.repairs.length : 0})
              </h3>
              <p class="text-xs text-slate-500">Tổng chi phí sửa chữa tài sản này: <span class="font-bold text-rose-600">${Utils.formatCurrency(ast.totalRepairCost)}</span></p>
            </div>

            ${
              Auth.canManage()
                ? `
              <button onclick="AssetDetailView.openAddRepairModal(${ast.id})" class="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-2xs flex items-center gap-1">
                <i class="fas fa-plus"></i> Ghi nhận sửa chữa
              </button>
            `
                : ''
            }
          </div>

          <!-- Repairs List -->
          <div class="space-y-2.5">
            ${
              !ast.repairs || ast.repairs.length === 0
                ? `<div class="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                Tài sản này chưa có lần sửa chữa nào. Thiết bị vẫn đang hoạt động ổn định.
              </div>`
                : ast.repairs
                    .map(
                      (r) => `
              <div class="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-800">${Utils.formatDate(r.repair_date)}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }">
                      ${r.status === 'completed' ? 'Đã hoàn thành' : 'Đang sửa chữa'}
                    </span>
                    ${
                      r.is_under_warranty
                        ? '<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">BH Miễn phí</span>'
                        : ''
                    }
                  </div>
                  <span class="font-bold text-slate-800 text-xs">${r.is_under_warranty ? '0 ₫ (Miễn phí BH)' : Utils.formatCurrency(r.cost)}</span>
                </div>

                <p class="text-xs text-slate-700 font-medium">${Utils.escapeHtml(r.issue_description)}</p>

                <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Thực hiện: <strong class="text-slate-700">${r.repair_shop || 'Thợ tự do'}</strong></span>
                  ${r.return_date ? `<span>Nhận lại: ${Utils.formatDate(r.return_date)}</span>` : ''}
                  ${
                    r.receipt_url
                      ? `<a href="${r.receipt_url}" target="_blank" class="text-blue-600 hover:underline"><i class="fas fa-receipt mr-0.5"></i> Biên lai</a>`
                      : ''
                  }
                </div>
              </div>
            `
                    )
                    .join('')
            }
          </div>
        </div>

        <!-- Action Buttons Footer -->
        <div class="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${
              isOwnerOrAdmin
                ? `
              <button onclick="document.getElementById('genericModal').classList.add('hidden'); AssetsView.openEditModal(${ast.id})" class="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                <i class="fas fa-edit mr-1"></i> Chỉnh sửa
              </button>
              <button onclick="document.getElementById('genericModal').classList.add('hidden'); AssetsView.deleteAsset(${ast.id})" class="px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition">
                <i class="fas fa-trash-can mr-1"></i> Xóa tài sản
              </button>
            `
                : ''
            }
          </div>

          <button onclick="document.getElementById('genericModal').classList.add('hidden')" class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Đóng
          </button>
        </div>
      </div>
    `;
  },

  // Modal Gia hạn bảo hành
  openExtendModal(warrantyId) {
    Swal.fire({
      title: 'Gia hạn thời gian bảo hành',
      html: `
        <div class="text-left space-y-3 pt-2">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Gia hạn thêm (tháng):</label>
            <input type="number" id="extMonths" value="12" min="1" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Lý do / Tên gói bảo hành:</label>
            <input type="text" id="extNotes" placeholder="Ví dụ: Mua gói CarePlus 1 năm hoặc Hãng tặng thêm" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Xác nhận gia hạn',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const months = document.getElementById('extMonths').value;
        const notes = document.getElementById('extNotes').value;
        if (!months || months <= 0) {
          Swal.showValidationMessage('Vui lòng nhập số tháng gia hạn hợp lệ');
          return false;
        }
        return { additionalMonths: months, notes };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await API.post(`/warranty/${warrantyId}/extend`, result.value);
          Utils.showToast(res.message, 'success');
          // Reload asset detail
          if (AssetDetailView.currentAsset) {
            AssetDetailView.open(AssetDetailView.currentAsset.id);
          }
        } catch (err) {
          Utils.showToast(err.message, 'error');
        }
      }
    });
  },

  // Gửi email nhắc nhở
  async triggerEmailReminder(assetId) {
    try {
      const res = await API.post('/warranty/send-email-reminder', { assetId });
      Swal.fire({
        title: 'Đã gửi email thành công!',
        html: `
          <div class="text-left text-xs space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200 mt-2">
            <p><strong>Người nhận:</strong> ${res.details.recipient}</p>
            <p><strong>Thiết bị:</strong> ${res.details.assetName}</p>
            <p><strong>Ngày hết hạn:</strong> ${res.details.expiryDate} (còn ${res.details.daysLeft} ngày)</p>
            <p><strong>Hotline bảo hành:</strong> ${res.details.hotline}</p>
          </div>
        `,
        icon: 'success'
      });
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  // Modal Ghi nhận sửa chữa nhanh từ trang chi tiết
  openAddRepairModal(assetId) {
    const todayStr = new Date().toISOString().split('T')[0];
    Swal.fire({
      title: 'Ghi nhận sửa chữa thiết bị',
      html: `
        <div class="text-left space-y-3 pt-2">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Ngày sửa / Phát sinh:</label>
            <input type="date" id="repDate" value="${todayStr}" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nội dung hỏng hóc:</label>
            <textarea id="repIssue" rows="2" placeholder="Triệu chứng hỏng, hiện tượng..." class="w-full text-xs p-2 border border-slate-300 rounded-lg"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Đơn vị sửa:</label>
              <input type="text" id="repShop" placeholder="Tên tiệm / trung tâm" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Chi phí (VNĐ):</label>
              <input type="number" id="repCost" value="0" min="0" class="w-full text-xs p-2 border border-slate-300 rounded-lg">
            </div>
          </div>
          <div class="flex items-center gap-4 text-xs pt-1">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" id="repWarranty" class="rounded text-blue-600">
              <span>Bảo hành miễn phí</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" id="repHang" class="rounded text-amber-600">
              <span>Đang chờ sửa chữa</span>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Lưu bản ghi',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const repair_date = document.getElementById('repDate').value;
        const issue_description = document.getElementById('repIssue').value;
        const repair_shop = document.getElementById('repShop').value;
        const cost = document.getElementById('repCost').value;
        const is_under_warranty = document.getElementById('repWarranty').checked;
        const isRepairing = document.getElementById('repHang').checked;

        if (!repair_date || !issue_description) {
          Swal.showValidationMessage('Vui lòng điền ngày và nội dung hỏng hóc');
          return false;
        }

        return {
          asset_id: assetId,
          repair_date,
          issue_description,
          repair_shop,
          cost: parseFloat(cost) || 0,
          is_under_warranty,
          status: isRepairing ? 'repairing' : 'completed'
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await API.post('/repairs', result.value);
          Utils.showToast(res.message, 'success');
          // Reload asset detail
          if (AssetDetailView.currentAsset) {
            AssetDetailView.open(AssetDetailView.currentAsset.id);
          }
        } catch (err) {
          Utils.showToast(err.message, 'error');
        }
      }
    });
  }
};

