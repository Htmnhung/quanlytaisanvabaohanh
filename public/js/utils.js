// Utility Functions

const Utils = {
  // Format currency in Vietnamese Dong (VNĐ)
  formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  },

  // Format date to DD/MM/YYYY
  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const clean = String(dateStr).trim().split(' ')[0].split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  },

  // Format date time to DD/MM/YYYY HH:mm
  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  },

  // Render warranty status badge
  renderWarrantyBadge(warrantyInfo) {
    if (!warrantyInfo || warrantyInfo.status === 'none') {
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
        <i class="fas fa-shield-alt mr-1 text-gray-400"></i> Không bảo hành
      </span>`;
    }

    if (warrantyInfo.status === 'expired') {
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold badge-expired">
        <i class="fas fa-circle-xmark mr-1 text-red-500"></i> ${warrantyInfo.label || 'Đã hết hạn'}
      </span>`;
    }

    if (warrantyInfo.status === 'expiring') {
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold badge-expiring pulse-urgent">
        <i class="fas fa-triangle-exclamation mr-1 text-amber-500"></i> ${warrantyInfo.label || 'Sắp hết hạn'}
      </span>`;
    }

    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold badge-active">
      <i class="fas fa-circle-check mr-1 text-emerald-500"></i> ${warrantyInfo.label || 'Còn bảo hành'}
    </span>`;
  },

  // Render asset usage status badge
  renderUsageBadge(status) {
    const map = {
      new: { label: 'Mới 100%', class: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'fa-certificate' },
      good: { label: 'Hoạt động tốt', class: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'fa-check' },
      repairing: { label: 'Đang sửa chữa', class: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'fa-wrench' },
      broken: { label: 'Hỏng hóc', class: 'bg-red-100 text-red-700 border-red-200', icon: 'fa-circle-exclamation' },
      old: { label: 'Cũ / Cần thay thế', class: 'bg-gray-100 text-gray-700 border-gray-200', icon: 'fa-clock-rotate-left' }
    };
    const s = map[status] || map.good;
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${s.class}">
      <i class="fas ${s.icon} mr-1"></i> ${s.label}
    </span>`;
  },

  // SweetAlert Toast Notification
  showToast(title, icon = 'success') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    Toast.fire({
      icon: icon,
      title: title
    });
  },

  // Confirmation dialog with SweetAlert2
  async confirmDialog(title, text, confirmButtonText = 'Đồng ý', confirmColor = '#ef4444') {
    const res = await Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#64748b',
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'Hủy bỏ',
      reverseButtons: true
    });
    return res.isConfirmed;
  },

  // Escape HTML to prevent XSS
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Debounce helper
  debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  // Lấy ảnh hiển thị chất lượng cao cho tài sản, chống rơi vào ảnh vẽ phác thảo mặc định
  getAssetImageUrl(ast) {
    if (ast && typeof ast === 'string' && ast.trim() !== '') {
      return ast.trim();
    }
    if (ast && ast.image_url && String(ast.image_url).trim() !== '') {
      return String(ast.image_url).trim();
    }

    const name = String(ast?.name || '').toLowerCase();
    const cat = String(ast?.category_name || '').toLowerCase();

    // 1. Nhận diện thông minh theo tên tài sản
    if (name.includes('chuột') || name.includes('mouse')) {
      return 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500'; // Chuột vi tính
    }
    if (name.includes('bàn phím') || name.includes('keyboard')) {
      return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500'; // Bàn phím cơ
    }
    if (name.includes('rửa chén') || name.includes('rửa bát') || name.includes('dishwasher')) {
      return 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=500'; // Máy rửa chén
    }
    if (name.includes('lò nướng') || name.includes('lò vi sóng') || cat.includes('lò nướng')) {
      return 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500'; // Lò nướng/vi sóng
    }
    if (name.includes('tủ lạnh') || cat.includes('tủ lạnh')) {
      return 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500'; // Tủ lạnh Inverter
    }
    if (name.includes('điều hòa') || name.includes('máy lạnh') || cat.includes('điều hòa')) {
      return 'https://images.unsplash.com/photo-1614633833026-0620ba577b21?w=500'; // Máy lạnh
    }
    if (name.includes('máy giặt') || name.includes('máy sấy') || cat.includes('máy giặt')) {
      return 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500'; // Máy giặt
    }
    if (name.includes('tivi') || name.includes('tv') || cat.includes('tivi') || name.includes('màn hình')) {
      return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500'; // Smart TV OLED
    }
    if (name.includes('laptop') || name.includes('máy tính') || name.includes('macbook') || cat.includes('laptop')) {
      return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500'; // Laptop hiện đại
    }
    if (name.includes('lọc không khí') || cat.includes('lọc không khí')) {
      return 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500'; // Máy lọc khí
    }
    if (name.includes('lọc nước') || cat.includes('lọc nước')) {
      return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500'; // Máy lọc nước RO
    }
    if (name.includes('robot') || name.includes('hút bụi') || cat.includes('robot')) {
      return 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=500'; // Robot hút bụi
    }
    if (name.includes('nồi chiên') || name.includes('nồi cơm') || cat.includes('nồi chiên')) {
      return 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500'; // Nồi chiên/nồi cơm
    }
    if (name.includes('xe máy') || cat.includes('xe máy') || cat.includes('phương tiện')) {
      return 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500'; // Xe máy
    }
    if (cat.includes('điện tử') || cat.includes('công nghệ')) {
      return 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500';
    }
    if (cat.includes('bếp') || cat.includes('gia dụng')) {
      return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500';
    }
    if (cat.includes('nội thất')) {
      return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500';
    }

    return 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500';
  }
};

