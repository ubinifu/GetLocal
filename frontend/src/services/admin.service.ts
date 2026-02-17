import api from './api';

const adminService = {
  // Dashboard
  async getDashboardStats() {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // Users
  async getUsers(params?: { page?: number; limit?: number; role?: string; search?: string }) {
    const response = await api.get('/admin/users', { params });
    return (response.data as any).data; // unwrap paginated
  },
  async getUserById(id: string) {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  async updateUser(id: string, data: { role?: string; isVerified?: boolean }) {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },
  async deleteUser(id: string) {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Stores
  async getStores(params?: { page?: number; limit?: number; isActive?: boolean; search?: string }) {
    const response = await api.get('/admin/stores', { params });
    return (response.data as any).data;
  },
  async updateStore(id: string, data: { isActive?: boolean }) {
    const response = await api.put(`/admin/stores/${id}`, data);
    return response.data;
  },
  async deleteStore(id: string) {
    const response = await api.delete(`/admin/stores/${id}`);
    return response.data;
  },

  // Orders
  async getOrders(params?: { page?: number; limit?: number; status?: string; storeId?: string }) {
    const response = await api.get('/admin/orders', { params });
    return (response.data as any).data;
  },

  // Categories
  async getCategories() {
    const response = await api.get('/admin/categories');
    return response.data;
  },
  async createCategory(data: { name: string; description?: string; imageUrl?: string }) {
    const response = await api.post('/admin/categories', data);
    return response.data;
  },
  async updateCategory(id: string, data: { name?: string; description?: string; imageUrl?: string }) {
    const response = await api.put(`/admin/categories/${id}`, data);
    return response.data;
  },
  async deleteCategory(id: string) {
    const response = await api.delete(`/admin/categories/${id}`);
    return response.data;
  },
};

export { adminService };
export default adminService;
