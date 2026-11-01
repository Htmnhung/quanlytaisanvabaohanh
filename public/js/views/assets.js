// Asset Catalog View

const AssetsView = {
  viewMode: 'grid', // 'grid' or 'table'
  isTrash: false,
  filters: {
    search: '',
    category_id: '',
    room_location: '',
    warranty_status: '',
    min_price: '',
    max_price: '',
    from_date: '',
    to_date: '',
    sort_by: 'created_at',
    sort_order: 'DESC',
    page: 1,
    limit: 12
  },
  categories: [],

  async render(container, initialParams = {}) {
    if (initialParams.warranty_status) {
      this.filters.warranty_status = initialParams.warranty_status;
    }
    if (initialParams.action === 'add') {
      setTimeout(() => this.openAddModal(), 200);
    }

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Title Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span>Danh mục tài sản gia đình</span>
              ${this.isTrash ? '<span class="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">Thùng rác</span>' : ''}
            </h1>
            <p class="text-sm text-slate-500 mt-1">Quản lý toàn bộ thiết bị, đồ gia dụng, chứng từ và hạn bảo hành</p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="AssetsView.toggleTrash()" class="inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-lg border transition ${
              this.isTrash
                ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }">
              <i class="fas ${this.isTrash ? 'fa-arrow-left' : 'fa-trash-can'} mr-2 ${this.isTrash ? '' : 'text-slate-400'}"></i>
              ${this.isTrash ? 'Quay lại danh sách' : 'Thùng rác'}
            </button>

            ${
              !this.isTrash && Auth.canManage()
                ? `
              <button onclick="AssetsView.openAddModal()" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition">
                <i class="fas fa-plus mr-2"></i> Thêm tài sản mới
              </button>
            `
                : ''
            }
          </div>
        </div>

        <!-- Filter & Search Controls Bar -->
        <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <!-- First Row: Search, View Mode Toggle, Clear Filters -->
          <div class="flex flex-col md:flex-row items-center gap-3">
            <div class="relative flex-1 w-full">
              <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input type="text" id="assetSearchInput" placeholder="Tìm theo tên thiết bị, thương hiệu, số serial..." 
                     value="${Utils.escapeHtml(this.filters.search)}"
                     oninput="AssetsView.handleSearch(this.value)"
                     class="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50">
            </div>

            <!-- View Toggle & Reset -->
            <div class="flex items-center gap-2 self-end md:self-auto shrink-0">
              <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                <button onclick="AssetsView.setViewMode('grid')" class="p-1.5 rounded-md text-xs font-medium transition ${
                  this.viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }" title="Xem dạng thẻ">
                  <i class="fas fa-grip"></i>
                </button>
                <button onclick="AssetsView.setViewMode('table')" class="p-1.5 rounded-md text-xs font-medium transition ${
                  this.viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }" title="Xem dạng bảng">
                  <i class="fas fa-list"></i>
                </button>
              </div>

              <button onclick="AssetsView.resetFilters()" class="px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition" title="Xóa bộ lọc">
                <i class="fas fa-filter-circle-xmark mr-1"></i> Đặt lại
              </button>
            </div>
          </div>

          <!-- Second Row: Filters Dropdowns -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
            <!-- Category -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Danh mục</label>
              <select id="assetCategoryFilter" onchange="AssetsView.handleFilterChange('category_id', this.value)" class="w-full text-xs py-1.5 px-2.5 border border-slate-200 rounded-md focus:border-blue-500 bg-white">
                <option value="">Tất cả danh mục</option>
              </select>
            </div>

            <!-- Room Location -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Vị trí đặt</label>
              <select onchange="AssetsView.handleFilterChange('room_location', this.value)" class="w-full text-xs py-1.5 px-2.5 border border-slate-200 rounded-md focus:border-blue-500 bg-white">
                <option value="">Tất cả vị trí</option>
                <option value="Phòng khách" ${this.filters.room_location === 'Phòng khách' ? 'selected' : ''}>Phòng khách</option>
                <option value="Bếp" ${this.filters.room_location === 'Bếp' ? 'selected' : ''}>Bếp</option>
                <option value="Phòng ngủ" ${this.filters.room_location === 'Phòng ngủ' ? 'selected' : ''}>Phòng ngủ</option>
                <option value="Phòng làm việc" ${this.filters.room_location === 'Phòng làm việc' ? 'selected' : ''}>Phòng làm việc</option>
                <option value="Ban công" ${this.filters.room_location === 'Ban công' ? 'selected' : ''}>Ban công</option>
                <option value="Garage" ${this.filters.room_location === 'Garage' ? 'selected' : ''}>Garage</option>
                <option value="Kho" ${this.filters.room_location === 'Kho' ? 'selected' : ''}>Kho</option>
              </select>
            </div>

            <!-- Warranty Status -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Bảo hành</label>
              <select onchange="AssetsView.handleFilterChange('warranty_status', this.value)" class="w-full text-xs py-1.5 px-2.5 border border-slate-200 rounded-md focus:border-blue-500 bg-white">
                <option value="">Tất cả tình trạng</option>
                <option value="active" ${this.filters.warranty_status === 'active' ? 'selected' : ''}>Còn hạn</option>
                <option value="expiring" ${this.filters.warranty_status === 'expiring' ? 'selected' : ''}>Sắp hết hạn</option>
                <option value="expired" ${this.filters.warranty_status === 'expired' ? 'selected' : ''}>Đã hết hạn</option>
              </select>
            </div>

            <!-- Sort By -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Sắp xếp theo</label>
              <select onchange="AssetsView.handleSortChange(this.value)" class="w-full text-xs py-1.5 px-2.5 border border-slate-200 rounded-md focus:border-blue-500 bg-white">
                <option value="created_at_DESC">Mới thêm nhất</option>
                <option value="purchase_date_DESC">Ngày mua: Mới nhất</option>
                <option value="purchase_date_ASC">Ngày mua: Cũ nhất</option>
                <option value="warranty_end_ASC">Hạn BH: Gần nhất</option>
                <option value="price_DESC">Giá mua: Giảm dần</option>
                <option value="price_ASC">Giá mua: Tăng dần</option>
                <option value="name_ASC">Tên thiết bị (A-Z)</option>
              </select>
            </div>

            <!-- Min Price -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Giá từ</label>
              <input type="number" placeholder="0 ₫" value="${this.filters.min_price || ''}" 
                     onchange="AssetsView.handleFilterChange('min_price', this.value)"
                     class="w-full text-xs py-1.5 px-2.5 border border-slate-200 rounded-md focus:border-blue-500 bg-white">
            </div>

            <!-- Max Price -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Đến giá</label>
              <input type="number" placeholder="Không giới hạn" value="${this.filters.max_price || ''}" 
                     onchange="AssetsView.handleFilterChange('max_price', this.value)"
                     class="w-full text-xs py-1.5 px-2.5 border border-slate-200 rounded-md focus:border-blue-500 bg-white">
            </div>
          </div>
        </div>

        <!-- Asset Content Container -->
        <div id="assetsContentList" class="min-h-[300px]">
          <div class="flex items-center justify-center py-20">
            <i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
          </div>
        </div>

        <!-- Pagination Bar -->
        <div id="assetsPaginationContainer"></div>
      </div>
    `;

    await this.loadCategories();
    await this.fetchAndRenderList();
  },

  async loadCategories() {
    try {
      const res = await API.get('/categories');
      this.categories = res.categories || res.data || [];
      const sel = document.getElementById('assetCategoryFilter');
      if (sel) {
        sel.innerHTML = '<option value="">Tất cả danh mục</option>' +
          this.categories
            .map((c) => `<option value="${c.id}" ${this.filters.category_id == c.id ? 'selected' : ''}>${c.parent_name ? `${c.parent_name} › ` : ''}${c.name}</option>`)
            .join('');
      }
      return this.categories;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  handleSearch: Utils.debounce(function(val) {
    AssetsView.filters.search = val;
    AssetsView.filters.page = 1;
    AssetsView.fetchAndRenderList();
  }, 350),

  handleFilterChange(field, val) {
    this.filters[field] = val;
    this.filters.page = 1;
    this.fetchAndRenderList();
  },

  handleSortChange(val) {
    const parts = val.split('_');
    const order = parts.pop();
    const col = parts.join('_');
    this.filters.sort_by = col;
    this.filters.sort_order = order;
    this.filters.page = 1;
    this.fetchAndRenderList();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.fetchAndRenderList();
  },

  toggleTrash() {
    this.isTrash = !this.isTrash;
    this.filters.page = 1;
    this.render(document.getElementById('mainContent'));
  },

  resetFilters() {
    this.filters = {
      search: '',
      category_id: '',
      room_location: '',
      warranty_status: '',
      min_price: '',
      max_price: '',
      from_date: '',
      to_date: '',
      sort_by: 'created_at',
      sort_order: 'DESC',
      page: 1,
      limit: 12
    };
    this.render(document.getElementById('mainContent'));
  },

  async fetchAndRenderList() {
    const listEl = document.getElementById('assetsContentList');
    if (!listEl) return;

    listEl.innerHTML = `
      <div class="flex items-center justify-center py-20">
        <i class="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
      </div>
    `;

    try {
      const params = { ...this.filters, trash: this.isTrash ? 'true' : 'false' };
      const res = await API.get('/assets', params);
      const assets = res.data || [];
      const pagination = res.pagination;

      if (assets.length === 0) {
        listEl.innerHTML = `
          <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div class="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl mb-3">
              <i class="fas fa-box-open"></i>
            </div>
            <h3 class="text-base font-semibold text-slate-700">${this.isTrash ? 'Thùng rác trống' : 'Không tìm thấy tài sản nào'}</h3>
            <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              ${this.isTrash ? 'Không có tài sản nào đã bị xóa mềm.' : 'Thử điều chỉnh lại từ khóa tìm kiếm hoặc các tiêu chí bộ lọc.'}
            </p>
            ${
              !this.isTrash && Auth.canManage()
                ? `<button onclick="AssetsView.openAddModal()" class="mt-4 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-plus mr-1.5"></i> Thêm tài sản mới
              </button>`
                : ''
            }
          </div>
        `;
        document.getElementById('assetsPaginationContainer').innerHTML = '';
        return;
      }

      if (this.viewMode === 'grid') {
        listEl.innerHTML = `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            ${assets.map((ast) => this.renderCard(ast)).join('')}
          </div>
        `;
      } else {
        listEl.innerHTML = this.renderTable(assets);
      }

      this.renderPagination(pagination);
    } catch (err) {
      listEl.innerHTML = `
        <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          ${err.message}
        </div>
      `;
    }
  },

  renderCard(ast) {
    const isOwnerOrAdmin = Auth.canManage() && (Auth.isAdmin() || (Auth.currentUser && (ast.family_id === Auth.currentUser.family_id || ast.user_id === Auth.currentUser.id)));

    return `
      <div class="asset-card bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
        <div>
          <!-- Thumbnail & Quick Badges -->
          <div class="relative h-44 w-full bg-slate-100 overflow-hidden cursor-pointer" onclick="AssetDetailView.open(${ast.id})">
            <img src="${Utils.getAssetImageUrl(ast)}" 
                 class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                 onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500'">
            
            <div class="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
              ${Utils.renderWarrantyBadge(ast.warrantyInfo)}
              ${ast.is_flagged ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-xs">Vi phạm / Bị gắn cờ</span>' : ''}
            </div>

            ${
              isOwnerOrAdmin
                ? `
              <button type="button" onclick="event.stopPropagation(); AssetsView.openPhotoModal(${ast.id}, '${Utils.escapeHtml(ast.name)}', '${ast.image_url || ''}')" 
                      class="absolute top-2.5 right-2.5 bg-slate-900/75 hover:bg-blue-600 text-white text-[11px] font-medium px-2 py-1 rounded-lg backdrop-blur-xs transition flex items-center gap-1 shadow-sm opacity-90 hover:opacity-100 z-10" 
                      title="Thay đổi ảnh cho tài sản này">
                <i class="fas fa-camera"></i> Đổi ảnh
              </button>
            `
                : ''
            }

            <div class="absolute bottom-2.5 right-2.5">
              ${Utils.renderUsageBadge(ast.usage_status)}
            </div>
          </div>

          <!-- Body Info -->
          <div class="p-4 space-y-2.5">
            <div>
              <span class="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">${ast.brand || 'Chưa rõ hãng'}</span>
              <h3 class="font-semibold text-slate-800 text-sm line-clamp-1 cursor-pointer hover:text-blue-600 transition" onclick="AssetDetailView.open(${ast.id})" title="${Utils.escapeHtml(ast.name)}">
                ${Utils.escapeHtml(ast.name)}
              </h3>
            </div>

            <div class="text-xs text-slate-500 space-y-1">
              <div class="flex items-center justify-between">
                <span>Vị trí:</span>
                <span class="font-medium text-slate-700">${ast.room_location || 'Phòng khách'}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Ngày mua:</span>
                <span class="font-medium text-slate-700">${Utils.formatDate(ast.purchase_date)}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Hết hạn BH:</span>
                <span class="font-medium text-slate-700">${
                  (ast.warranty_end || ast.warranty_end_date || ast.end_date)
                    ? `${Utils.formatDate(ast.warranty_end || ast.warranty_end_date || ast.end_date)}${(ast.duration_months || ast.warranty_duration_months) ? ` (${ast.duration_months || ast.warranty_duration_months} tháng)` : ''}`
                    : '—'
                }</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Card -->
        <div class="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
          <span class="text-sm font-bold text-slate-800">${Utils.formatCurrency(ast.purchase_price)}</span>

          <div class="flex items-center gap-1">
            ${
              this.isTrash
                ? (Auth.canManage()
                  ? `
                <button onclick="AssetsView.restoreAsset(${ast.id})" class="p-1.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition" title="Khôi phục">
                  <i class="fas fa-rotate-left"></i>
                </button>
                <button onclick="AssetsView.destroyPermanent(${ast.id})" class="p-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition" title="Xóa vĩnh viễn">
                  <i class="fas fa-trash"></i>
                </button>
              `
                  : '')
                : `
              <button onclick="AssetDetailView.open(${ast.id})" class="p-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-white rounded transition" title="Xem chi tiết">
                <i class="fas fa-eye"></i>
              </button>
              ${
                isOwnerOrAdmin
                  ? `
                <button onclick="AssetsView.openEditModal(${ast.id})" class="p-1.5 text-xs text-slate-600 hover:text-amber-600 hover:bg-white rounded transition" title="Sửa">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="AssetsView.deleteAsset(${ast.id})" class="p-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-white rounded transition" title="Xóa vào thùng rác">
                  <i class="fas fa-trash-can"></i>
                </button>
              `
                  : ''
              }
            `
            }
          </div>
        </div>
      </div>
    `;
  },

  renderTable(assets) {
    return `
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3 px-4">Thiết bị</th>
                <th class="py-3 px-4">Danh mục</th>
                <th class="py-3 px-4">Vị trí</th>
                <th class="py-3 px-4">Ngày mua</th>
                <th class="py-3 px-4">Giá mua</th>
                <th class="py-3 px-4">Bảo hành</th>
                <th class="py-3 px-4">Tình trạng</th>
                <th class="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${assets
                .map((ast) => {
                  const isOwnerOrAdmin = Auth.canManage() && (Auth.isAdmin() || (Auth.currentUser && (ast.family_id === Auth.currentUser.family_id || ast.user_id === Auth.currentUser.id)));
                  return `
                  <tr class="hover:bg-slate-50/70 transition">
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <img src="${Utils.getAssetImageUrl(ast)}" class="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0" onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=100'">
                        <div class="min-w-0">
                          <p class="font-medium text-slate-800 text-xs truncate max-w-[200px] cursor-pointer hover:text-blue-600" onclick="AssetDetailView.open(${ast.id})">${Utils.escapeHtml(ast.name)}</p>
                          <span class="text-[11px] text-slate-400">${ast.brand || '—'} • ${ast.serial_number || 'Ko có serial'}</span>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-slate-600">${ast.category_name || '—'}</td>
                    <td class="py-3 px-4 text-slate-600">${ast.room_location || 'Phòng khách'}</td>
                    <td class="py-3 px-4 text-slate-600">${Utils.formatDate(ast.purchase_date)}</td>
                    <td class="py-3 px-4 font-semibold text-slate-800">${Utils.formatCurrency(ast.purchase_price)}</td>
                    <td class="py-3 px-4">${Utils.renderWarrantyBadge(ast.warrantyInfo)}</td>
                    <td class="py-3 px-4">${Utils.renderUsageBadge(ast.usage_status)}</td>
                    <td class="py-3 px-4 text-right space-x-1">
                      ${
                        this.isTrash
                          ? (Auth.canManage()
                            ? `
                          <button onclick="AssetsView.restoreAsset(${ast.id})" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Khôi phục"><i class="fas fa-rotate-left"></i></button>
                          <button onclick="AssetsView.destroyPermanent(${ast.id})" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa vĩnh viễn"><i class="fas fa-trash"></i></button>
                        `
                            : '')
                          : `
                        <button onclick="AssetDetailView.open(${ast.id})" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded" title="Chi tiết"><i class="fas fa-eye"></i></button>
                        ${
                          isOwnerOrAdmin
                            ? `
                          <button onclick="AssetsView.openEditModal(${ast.id})" class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded" title="Sửa"><i class="fas fa-edit"></i></button>
                          <button onclick="AssetsView.deleteAsset(${ast.id})" class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded" title="Xóa mềm"><i class="fas fa-trash-can"></i></button>
                        `
                            : ''
                        }
                      `
                      }
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderPagination(pagination) {
    const container = document.getElementById('assetsPaginationContainer');
    if (!container || !pagination || pagination.totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    const { page, totalPages, totalItems } = pagination;

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <p>Hiển thị trang <span class="font-semibold text-slate-700">${page}</span> trên tổng số <span class="font-semibold text-slate-700">${totalPages}</span> trang (${totalItems} tài sản)</p>
        
        <div class="inline-flex rounded-lg border border-slate-200 bg-white shadow-2xs">
          <button onclick="AssetsView.goToPage(${page - 1})" ${page <= 1 ? 'disabled class="px-3 py-1.5 text-slate-300 cursor-not-allowed"' : 'class="px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium"'}>
            <i class="fas fa-chevron-left mr-1"></i> Trước
          </button>
          <span class="px-3 py-1.5 border-x border-slate-200 bg-slate-50 font-semibold text-blue-600">${page}</span>
          <button onclick="AssetsView.goToPage(${page + 1})" ${page >= totalPages ? 'disabled class="px-3 py-1.5 text-slate-300 cursor-not-allowed"' : 'class="px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium"'}>
            Sau <i class="fas fa-chevron-right ml-1"></i>
          </button>
        </div>
      </div>
    `;
  },

  goToPage(p) {
    this.filters.page = p;
    this.fetchAndRenderList();
  },

  async deleteAsset(id) {
    const ok = await Utils.confirmDialog('Chuyển vào thùng rác?', 'Tài sản sẽ được chuyển vào thùng rác và có thể khôi phục lại bất cứ lúc nào.', 'Xóa vào thùng rác');
    if (!ok) return;

    try {
      const res = await API.delete(`/assets/${id}`);
      Utils.showToast(res.message, 'success');
      this.fetchAndRenderList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async restoreAsset(id) {
    try {
      const res = await API.post(`/assets/${id}/restore`);
      Utils.showToast(res.message, 'success');
      this.fetchAndRenderList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async destroyPermanent(id) {
    const ok = await Utils.confirmDialog('Xóa vĩnh viễn?', 'Hành động này KHÔNG THỂ khôi phục! Tất cả thông tin bảo hành và sửa chữa liên quan sẽ bị xóa vĩnh viễn.', 'Xóa vĩnh viễn', '#dc2626');
    if (!ok) return;

    try {
      const res = await API.delete(`/assets/${id}/destroy`);
      Utils.showToast(res.message, 'success');
      this.fetchAndRenderList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  // Modal Thêm mới tài sản
  async openAddModal() {
    if (!this.categories || this.categories.length === 0) {
      await this.loadCategories();
    }
    await this.showAssetModal({ isEdit: false });
  },

  // Modal Chỉnh sửa tài sản
  async openEditModal(id) {
    if (!this.categories || this.categories.length === 0) {
      await this.loadCategories();
    }
    try {
      const res = await API.get(`/assets/${id}`);
      await this.showAssetModal({ isEdit: true, asset: res.asset || res.data });
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async showAssetModal({ isEdit = false, asset = {} }) {
    if (!this.categories || this.categories.length === 0) {
      await this.loadCategories();
    }

    const modalEl = document.getElementById('genericModal');
    const titleEl = document.getElementById('genericModalTitle');
    const contentEl = document.getElementById('genericModalContent');

    titleEl.textContent = isEdit ? 'Chỉnh sửa thông tin tài sản' : 'Thêm tài sản gia đình mới';

    const todayStr = new Date().toISOString().split('T')[0];

    contentEl.innerHTML = `
      <form id="assetForm" class="space-y-5" onsubmit="AssetsView.handleSaveAsset(event, ${isEdit ? asset.id : 'null'})">
        <!-- Section 1: Thông tin cơ bản -->
        <div>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <i class="fas fa-info-circle text-blue-500"></i> Thông tin cơ bản thiết bị
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tên tài sản / Đồ dùng <span class="text-red-500">*</span></label>
              <input type="text" name="name" required placeholder="Ví dụ: Tủ lạnh Panasonic Inverter 322 lít" 
                     value="${Utils.escapeHtml(asset.name || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700">Danh mục <span class="text-red-500">*</span></label>
                <button type="button" onclick="AssetsView.quickCreateCategory()" class="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  <i class="fas fa-plus-circle"></i> Thêm danh mục mới
                </button>
              </div>
              <select name="category_id" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
                <option value="">-- Chọn danh mục --</option>
                ${(this.categories || [])
                  .map(
                    (c) => `
                  <option value="${c.id}" ${asset.category_id == c.id ? 'selected' : ''}>
                    ${c.parent_name ? `${c.parent_name} › ` : ''}${c.name}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Thương hiệu / Hãng sản xuất</label>
              <input type="text" name="brand" placeholder="Sony, LG, Panasonic, Apple..." 
                     value="${Utils.escapeHtml(asset.brand || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Model sản phẩm</label>
              <input type="text" name="model" placeholder="Ví dụ: KD-65X80L" 
                     value="${Utils.escapeHtml(asset.model || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Số Serial (S/N)</label>
              <input type="text" name="serial_number" placeholder="Số serial tra cứu bảo hành" 
                     value="${Utils.escapeHtml(asset.serial_number || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
            </div>
          </div>
        </div>

        <!-- Section 2: Mua sắm & Định vị -->
        <div class="pt-4 border-t border-slate-100">
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <i class="fas fa-shopping-cart text-emerald-500"></i> Mua sắm & Vị trí đặt
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Ngày mua <span class="text-red-500">*</span></label>
              <input type="date" name="purchase_date" max="${todayStr}" required 
                     value="${asset.purchase_date || todayStr}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
              <span class="text-[10px] text-slate-400">Không vượt quá ngày hiện tại</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Giá mua (VNĐ) <span class="text-red-500">*</span></label>
              <input type="number" name="purchase_price" min="0" step="1000" required 
                     value="${asset.purchase_price !== undefined ? asset.purchase_price : 0}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nơi mua sắm</label>
              <input type="text" name="purchase_location" placeholder="Điện máy Xanh, Shopee, FPT Shop..." 
                     value="${Utils.escapeHtml(asset.purchase_location || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Vị trí đặt trong nhà</label>
              <select name="room_location" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
                <option value="Phòng khách" ${asset.room_location === 'Phòng khách' ? 'selected' : ''}>Phòng khách</option>
                <option value="Bếp" ${asset.room_location === 'Bếp' ? 'selected' : ''}>Bếp</option>
                <option value="Phòng ngủ" ${asset.room_location === 'Phòng ngủ' ? 'selected' : ''}>Phòng ngủ</option>
                <option value="Phòng làm việc" ${asset.room_location === 'Phòng làm việc' ? 'selected' : ''}>Phòng làm việc</option>
                <option value="Ban công" ${asset.room_location === 'Ban công' ? 'selected' : ''}>Ban công</option>
                <option value="Garage" ${asset.room_location === 'Garage' ? 'selected' : ''}>Garage</option>
                <option value="Kho" ${asset.room_location === 'Kho' ? 'selected' : ''}>Kho</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tình trạng sử dụng</label>
              <select name="usage_status" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
                <option value="good" ${asset.usage_status === 'good' ? 'selected' : ''}>Hoạt động tốt</option>
                <option value="new" ${asset.usage_status === 'new' ? 'selected' : ''}>Mới 100%</option>
                <option value="repairing" ${asset.usage_status === 'repairing' ? 'selected' : ''}>Đang sửa chữa</option>
                <option value="broken" ${asset.usage_status === 'broken' ? 'selected' : ''}>Hỏng hóc</option>
                <option value="old" ${asset.usage_status === 'old' ? 'selected' : ''}>Cũ / Cần thay thế</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Ghi chú thêm</label>
              <input type="text" name="notes" placeholder="Lưu ý phụ tùng, mật khẩu khóa..." 
                     value="${Utils.escapeHtml(asset.notes || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
            </div>
          </div>
        </div>

        <!-- Section 3: Thông tin bảo hành -->
        <div class="pt-4 border-t border-slate-100 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <h4 class="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <i class="fas fa-shield-alt text-blue-600"></i> Thiết lập bảo hành sản phẩm
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Ngày bắt đầu bảo hành</label>
              <input type="date" name="warranty_start_date" id="warrantyStartDate" 
                     value="${asset.warranty_start_date || asset.purchase_date || todayStr}" 
                     oninput="AssetsView.updateModalWarrantyPreview()"
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
              <input type="hidden" name="start_date" id="warrantyStartDateSync" value="${asset.warranty_start_date || asset.purchase_date || todayStr}">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Thời hạn bảo hành (tháng) <span class="text-blue-600 font-bold">*</span></label>
              <input type="number" name="warranty_duration_months" id="warrantyDurationMonths" min="0" step="1" required 
                     value="${asset.warranty_duration_months !== undefined ? asset.warranty_duration_months : (asset.duration_months !== undefined ? asset.duration_months : 12)}" 
                     oninput="AssetsView.updateModalWarrantyPreview()"
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white font-semibold text-blue-900">
              <input type="hidden" name="duration_months" id="warrantyDurationMonthsSync" value="${asset.warranty_duration_months !== undefined ? asset.warranty_duration_months : (asset.duration_months !== undefined ? asset.duration_months : 12)}">
              <div id="modalWarrantyPreview" class="text-[11px] font-medium text-blue-700 mt-1.5 bg-blue-100/70 py-1.5 px-2.5 rounded flex items-center gap-1.5">
                <i class="fas fa-calculator text-blue-500"></i> <span id="modalWarrantyPreviewText">Đang tính toán hạn bảo hành...</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Đơn vị / Trung tâm bảo hành</label>
              <input type="text" name="warranty_provider_name" placeholder="Ví dụ: Trung tâm Sony toàn quốc" 
                     value="${Utils.escapeHtml(asset.warranty_provider_name || asset.provider_name || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
              <input type="hidden" name="provider_name" value="${Utils.escapeHtml(asset.warranty_provider_name || asset.provider_name || '')}">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Hotline hỗ trợ bảo hành</label>
              <input type="text" name="warranty_provider_phone" placeholder="Ví dụ: 1800 588 885" 
                     value="${Utils.escapeHtml(asset.warranty_provider_phone || asset.provider_phone || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
              <input type="hidden" name="provider_phone" value="${Utils.escapeHtml(asset.warranty_provider_phone || asset.provider_phone || '')}">
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Điều kiện & Lưu ý bảo hành</label>
              <input type="text" name="warranty_conditions" placeholder="Cần giữ lại tem dán và hóa đơn mua lẻ..." 
                     value="${Utils.escapeHtml(asset.warranty_conditions || asset.conditions || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
              <input type="hidden" name="conditions" value="${Utils.escapeHtml(asset.warranty_conditions || asset.conditions || '')}">
            </div>
          </div>
        </div>

        <!-- Section 4: Ảnh sản phẩm & Hóa đơn -->
        <div class="pt-4 border-t border-slate-100">
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <i class="fas fa-camera text-indigo-500"></i> Ảnh chụp sản phẩm & Hóa đơn mua sắm
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Product Photo -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-700">Ảnh đại diện sản phẩm</label>
              
              <!-- Live Image Preview and Upload Box -->
              <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div class="w-20 h-20 rounded-lg bg-slate-200 overflow-hidden border border-slate-300 shrink-0 relative shadow-2xs">
                  <img id="productImgPreview" 
                       src="${Utils.getAssetImageUrl(asset)}" 
                       class="w-full h-full object-cover" 
                       onerror="this.src='https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500'">
                </div>
                <div class="flex-1 min-w-0 space-y-1.5">
                  <label class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition shadow-2xs">
                    <i class="fas fa-folder-open"></i> Tải ảnh từ máy tính
                    <input type="file" name="image" id="assetImageFileInput" accept="image/*" class="hidden" onchange="AssetsView.previewLocalImage(this, 'productImgPreview')">
                  </label>
                  <p id="assetImageFileName" class="text-[11px] text-slate-400 truncate">Hỗ trợ JPG, PNG, WEBP</p>
                </div>
              </div>

              <!-- URL Input -->
              <div>
                <input type="text" name="image_url" id="assetImageUrlInput" placeholder="Hoặc dán URL ảnh trực tuyến..." 
                       value="${Utils.escapeHtml(asset.image_url || '')}" 
                       oninput="AssetsView.previewUrlImage(this.value, 'productImgPreview')"
                       class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
              </div>

              <!-- Quick Presets -->
              <div>
                <span class="text-[11px] text-slate-500 block mb-1">Ảnh mẫu gợi ý nhanh:</span>
                <div class="flex flex-wrap gap-1.5">
                  <button type="button" onclick="AssetsView.selectPresetImage('https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500', 'assetImageUrlInput', 'productImgPreview')" class="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition">🖱️ Chuột MT</button>
                  <button type="button" onclick="AssetsView.selectPresetImage('https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=500', 'assetImageUrlInput', 'productImgPreview')" class="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition">🍽️ Máy rửa chén</button>
                  <button type="button" onclick="AssetsView.selectPresetImage('https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', 'assetImageUrlInput', 'productImgPreview')" class="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition">💻 Laptop</button>
                  <button type="button" onclick="AssetsView.selectPresetImage('https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500', 'assetImageUrlInput', 'productImgPreview')" class="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition">📺 TV OLED</button>
                  <button type="button" onclick="AssetsView.selectPresetImage('https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500', 'assetImageUrlInput', 'productImgPreview')" class="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition">❄️ Tủ lạnh</button>
                  <button type="button" onclick="AssetsView.selectPresetImage('https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500', 'assetImageUrlInput', 'productImgPreview')" class="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition">🧺 Máy giặt</button>
                  <button type="button" onclick="AssetsView.selectPresetImage('https://images.unsplash.com/photo-1614633833026-0620ba577b21?w=500', 'assetImageUrlInput', 'productImgPreview')" class="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition">💨 Điều hòa</button>
                  <button type="button" onclick="AssetsView.selectPresetImage('https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500', 'assetImageUrlInput', 'productImgPreview')" class="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition">🍲 Nồi chiên</button>
                </div>
              </div>
            </div>

            <!-- Invoice Photo / Document -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-700">Ảnh hóa đơn / Biên lai / PDF</label>
              <input type="file" name="invoice" accept="image/*,.pdf" class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 mb-1.5">
              <input type="text" name="invoice_url" placeholder="Hoặc dán URL ảnh hóa đơn..." 
                     value="${Utils.escapeHtml(asset.invoice_url || '')}" 
                     class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 bg-white">
            </div>
          </div>
        </div>

        <!-- Submit Buttons -->
        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" onclick="document.getElementById('genericModal').classList.add('hidden')" class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Hủy bỏ
          </button>
          <button type="submit" id="saveAssetBtn" class="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5">
            <i class="fas fa-save"></i> ${isEdit ? 'Lưu thay đổi' : 'Tạo mới tài sản'}
          </button>
        </div>
      </form>
    `;

    modalEl.classList.remove('hidden');
    setTimeout(() => this.updateModalWarrantyPreview(), 50);
  },

  async handleSaveAsset(e, editId) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('saveAssetBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Đang lưu...';

    const formData = new FormData(form);

    try {
      let res;
      if (editId) {
        res = await API.upload(`/assets/${editId}`, formData, 'POST');
      } else {
        res = await API.upload('/assets', formData, 'POST');
      }

      Utils.showToast(res.message, 'success');
      document.getElementById('genericModal').classList.add('hidden');
      this.fetchAndRenderList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> ' + (editId ? 'Lưu thay đổi' : 'Tạo mới tài sản');
    }
  },

  async quickCreateCategory() {
    const parents = (this.categories || []).filter((c) => !c.parent_id);
    Swal.fire({
      title: 'Thêm nhanh danh mục mới',
      html: `
        <div class="text-left space-y-3 pt-2">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tên danh mục <span class="text-red-500">*</span></label>
            <input type="text" id="quickCatName" placeholder="Ví dụ: Máy rửa chén & Lò nướng, Robot hút bụi..." class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Thuộc nhóm danh mục cha (Tùy chọn)</label>
            <select id="quickCatParent" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white">
              <option value="">(Không có - Đây là nhóm danh mục chính)</option>
              ${parents.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-check mr-1"></i> Tạo danh mục',
      cancelButtonText: 'Hủy bỏ',
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById('quickCatName')?.value?.trim();
        const parent_id = document.getElementById('quickCatParent')?.value;
        if (!name) {
          Swal.showValidationMessage('Vui lòng nhập tên danh mục');
          return false;
        }
        return { name, parent_id: parent_id ? parseInt(parent_id, 10) : null };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const resp = await API.post('/categories', result.value);
          Utils.showToast(resp.message || 'Thêm danh mục thành công', 'success');
          // Tải lại danh mục
          await this.loadCategories();

          // Cập nhật lại dropdown trong modal đang mở và tự động chọn danh mục vừa tạo
          const modalSelect = document.querySelector('#assetForm select[name="category_id"]');
          if (modalSelect) {
            const newCatId = resp.category?.id;
            modalSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>' +
              (this.categories || []).map((c) => `
                <option value="${c.id}" ${c.id == newCatId ? 'selected' : ''}>
                  ${c.parent_name ? `${c.parent_name} › ` : ''}${c.name}
                </option>
              `).join('');
            if (newCatId) {
              modalSelect.value = newCatId;
            }
          }
        } catch (err) {
          Utils.showToast(err.message || 'Không thể tạo danh mục', 'error');
        }
      }
    });
  },

  previewLocalImage(input, previewId) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const preview = document.getElementById(previewId);
      const nameEl = document.getElementById('assetImageFileName');
      if (nameEl) nameEl.textContent = file.name;
      if (preview) {
        preview.src = URL.createObjectURL(file);
      }
    }
  },

  previewUrlImage(url, previewId) {
    const preview = document.getElementById(previewId);
    if (preview && url && url.trim()) {
      preview.src = url.trim();
    }
  },

  selectPresetImage(url, inputId, previewId) {
    const inp = document.getElementById(inputId);
    const fileInp = document.getElementById('assetImageFileInput');
    const nameEl = document.getElementById('assetImageFileName');
    if (fileInp) fileInp.value = '';
    if (nameEl) nameEl.textContent = 'Đã chọn ảnh mẫu gợi ý';
    if (inp) {
      inp.value = url;
    }
    this.previewUrlImage(url, previewId);
  },

  updateModalWarrantyPreview() {
    const startInp = document.getElementById('warrantyStartDate');
    const durInp = document.getElementById('warrantyDurationMonths');
    const textEl = document.getElementById('modalWarrantyPreviewText');
    const durSync = document.getElementById('warrantyDurationMonthsSync');
    const startSync = document.getElementById('warrantyStartDateSync');

    if (!startInp || !durInp || !textEl) return;

    const startVal = startInp.value || new Date().toISOString().split('T')[0];
    const durVal = parseInt(durInp.value, 10);
    const months = !isNaN(durVal) ? durVal : 12;

    if (durSync) durSync.value = months;
    if (startSync) startSync.value = startVal;

    try {
      const d = new Date(startVal);
      if (!isNaN(d.getTime())) {
        d.setMonth(d.getMonth() + months);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        textEl.innerHTML = `Bảo hành <strong>${months} tháng</strong> &bull; Hết hạn: <strong>${day}/${month}/${year}</strong>`;
      }
    } catch (e) {
      textEl.textContent = `Bảo hành ${months} tháng`;
    }
  },

  async openPhotoModal(assetId, assetName, currentImg) {
    const currentSrc = Utils.getAssetImageUrl({ name: assetName, image_url: currentImg });
    
    Swal.fire({
      title: 'Đổi ảnh cho sản phẩm',
      html: `
        <div class="text-left space-y-3 pt-1">
          <p class="text-xs text-slate-500 font-medium">Thiết bị: <strong class="text-slate-800">${Utils.escapeHtml(assetName)}</strong></p>
          
          <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div class="w-20 h-20 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
              <img id="swalPhotoPreview" src="${currentSrc}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 space-y-2">
              <label class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition shadow-2xs">
                <i class="fas fa-folder-open"></i> Chọn ảnh từ máy tính
                <input type="file" id="swalPhotoFile" accept="image/*" class="hidden">
              </label>
              <p id="swalPhotoFileName" class="text-[11px] text-slate-400 truncate">Hỗ trợ JPG, PNG, WEBP</p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Hoặc dán URL ảnh</label>
            <input type="text" id="swalPhotoUrl" placeholder="https://..." value="${Utils.escapeHtml(currentImg || '')}" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:border-blue-500">
          </div>

          <div>
            <span class="text-[11px] text-slate-500 block mb-1">Ảnh mẫu gợi ý nhanh:</span>
            <div class="flex flex-wrap gap-1">
              <button type="button" class="swal-preset-btn px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200" data-url="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500">🖱️ Chuột</button>
              <button type="button" class="swal-preset-btn px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200" data-url="https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=500">🍽️ Rửa chén</button>
              <button type="button" class="swal-preset-btn px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200" data-url="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500">💻 Laptop</button>
              <button type="button" class="swal-preset-btn px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200" data-url="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500">📺 TV</button>
              <button type="button" class="swal-preset-btn px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200" data-url="https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500">❄️ Tủ lạnh</button>
              <button type="button" class="swal-preset-btn px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200" data-url="https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500">🧺 Máy giặt</button>
              <button type="button" class="swal-preset-btn px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200" data-url="https://images.unsplash.com/photo-1614633833026-0620ba577b21?w=500">💨 Máy lạnh</button>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-save mr-1"></i> Lưu ảnh',
      cancelButtonText: 'Hủy bỏ',
      didOpen: () => {
        const fileInp = document.getElementById('swalPhotoFile');
        const urlInp = document.getElementById('swalPhotoUrl');
        const prevImg = document.getElementById('swalPhotoPreview');
        const nameP = document.getElementById('swalPhotoFileName');

        fileInp.addEventListener('change', () => {
          if (fileInp.files && fileInp.files[0]) {
            const f = fileInp.files[0];
            nameP.textContent = f.name;
            prevImg.src = URL.createObjectURL(f);
          }
        });

        urlInp.addEventListener('input', () => {
          if (urlInp.value.trim()) {
            prevImg.src = urlInp.value.trim();
          }
        });

        document.querySelectorAll('.swal-preset-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const u = btn.getAttribute('data-url');
            urlInp.value = u;
            prevImg.src = u;
            fileInp.value = '';
            nameP.textContent = 'Đã chọn ảnh mẫu gợi ý';
          });
        });
      },
      preConfirm: () => {
        const fileInp = document.getElementById('swalPhotoFile');
        const urlInp = document.getElementById('swalPhotoUrl');
        const file = fileInp.files && fileInp.files[0] ? fileInp.files[0] : null;
        const url = urlInp.value.trim();

        if (!file && !url) {
          Swal.showValidationMessage('Vui lòng chọn ảnh từ máy tính hoặc nhập liên kết ảnh');
          return false;
        }

        return { file, url };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const { file, url } = result.value;
          const fd = new FormData();
          if (file) {
            fd.append('image', file);
          }
          if (url) {
            fd.append('image_url', url);
          }

          const resp = await API.upload(`/assets/${assetId}/photo`, fd, 'POST');
          Utils.showToast(resp.message || 'Cập nhật ảnh thành công', 'success');
          await this.fetchAndRenderList();

          // Nếu AssetDetailView đang mở cho cùng asset này thì refresh
          if (window.AssetDetailView && window.AssetDetailView.currentAsset && window.AssetDetailView.currentAsset.id == assetId) {
            window.AssetDetailView.open(assetId);
          }
        } catch (e) {
          Utils.showToast(e.message || 'Không thể cập nhật ảnh', 'error');
        }
      }
    });
  }
};

