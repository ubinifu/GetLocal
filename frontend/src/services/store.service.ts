import api from './api';
import type { Store, ApiResponse, PaginatedResponse } from '@/types';

export interface GetStoresParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface CreateStoreData {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string;
  imageUrl?: string;
  hours?: Record<string, { open: string; close: string } | null>;
}

export type UpdateStoreData = Partial<CreateStoreData> & { isActive?: boolean };

const storeService = {
  async getStores(params?: GetStoresParams): Promise<PaginatedResponse<Store>> {
    const response = await api.get('/stores', { params });
    // Backend wraps as { status, data: { data: [...], pagination } }
    return (response.data as any).data;
  },

  async getStoreById(id: string): Promise<ApiResponse<Store>> {
    const response = await api.get<ApiResponse<Store>>(`/stores/${id}`);
    return response.data;
  },

  // Alias for getStoreById for convenience
  async getStore(id: string): Promise<ApiResponse<Store>> {
    const response = await api.get<ApiResponse<Store>>(`/stores/${id}`);
    return response.data;
  },

  async createStore(data: CreateStoreData): Promise<ApiResponse<Store>> {
    const response = await api.post<ApiResponse<Store>>('/stores', data);
    return response.data;
  },

  async updateStore(id: string, data: UpdateStoreData): Promise<ApiResponse<Store>> {
    const response = await api.put<ApiResponse<Store>>(`/stores/${id}`, data);
    return response.data;
  },

  async deleteStore(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/stores/${id}`);
    return response.data;
  },

  async getMyStores(): Promise<ApiResponse<Store[]>> {
    const response = await api.get<ApiResponse<Store[]>>('/stores/my-stores');
    return response.data;
  },
};

export { storeService };
export default storeService;
