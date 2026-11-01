// API Client

const API = {
  baseUrl: 'api',

  getToken() {
    return localStorage.getItem('family_asset_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('family_asset_token', token);
    } else {
      localStorage.removeItem('family_asset_token');
    }
  },

  getHeaders(isFormData = false) {
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  },

  async handleResponse(response) {
    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      if (data.expired) {
        Utils.showToast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 'warning');
      }
      this.setToken(null);
      localStorage.removeItem('family_asset_user');
      if (window.Auth) {
        window.Auth.currentUser = null;
        window.Auth.renderNav();
        window.Router.navigate('login');
      }
      throw new Error(data.message || 'Phiên đăng nhập không hợp lệ');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Đã có lỗi xảy ra');
    }
    return data;
  },

  async get(endpoint, params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${this.baseUrl}${endpoint}${queryString}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  },

  async post(endpoint, data = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  },

  async put(endpoint, data = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  },

  async delete(endpoint) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  },

  async upload(endpoint, formData, method = 'POST') {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: method,
      headers: this.getHeaders(true),
      body: formData
    });
    return this.handleResponse(res);
  },

  async downloadExcel(endpoint, filename = 'Bao_cao_tai_san.xlsx') {
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      }
    });
    if (!res.ok) throw new Error('Không thể tải tệp Excel.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};

