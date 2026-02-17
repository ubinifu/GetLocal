import api from './api';
import type {
  StoreIntegration,
  CreateIntegrationData,
  UpdateIntegrationData,
  IntegrationStats,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

const integrationService = {
  async getIntegrations(storeId: string): Promise<StoreIntegration[]> {
    const response = await api.get<ApiResponse<PaginatedResponse<StoreIntegration>>>(
      `/integrations/store/${storeId}`
    );
    // Unwrap paginated response - backend wraps as { status, data: { data: [...], pagination } }
    const payload = response.data.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    return (payload as PaginatedResponse<StoreIntegration>).data;
  },

  async getIntegrationById(id: string): Promise<ApiResponse<StoreIntegration>> {
    const response = await api.get<ApiResponse<StoreIntegration>>(`/integrations/${id}`);
    return response.data;
  },

  async createIntegration(
    storeId: string,
    data: CreateIntegrationData
  ): Promise<ApiResponse<StoreIntegration>> {
    const response = await api.post<ApiResponse<StoreIntegration>>(
      `/integrations/store/${storeId}`,
      data
    );
    return response.data;
  },

  async updateIntegration(
    id: string,
    data: UpdateIntegrationData
  ): Promise<ApiResponse<StoreIntegration>> {
    const response = await api.put<ApiResponse<StoreIntegration>>(`/integrations/${id}`, data);
    return response.data;
  },

  async deleteIntegration(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/integrations/${id}`);
    return response.data;
  },

  async syncIntegration(id: string): Promise<ApiResponse<StoreIntegration>> {
    const response = await api.post<ApiResponse<StoreIntegration>>(`/integrations/${id}/sync`);
    return response.data;
  },

  async getIntegrationStats(storeId: string): Promise<ApiResponse<IntegrationStats>> {
    const response = await api.get<ApiResponse<IntegrationStats>>(
      `/integrations/store/${storeId}/stats`
    );
    return response.data;
  },
};

export { integrationService };
export default integrationService;
