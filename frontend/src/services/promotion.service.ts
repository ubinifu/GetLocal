import api from './api';
import type { Promotion, Order, CreatePromotionData, UpdatePromotionData, ApiResponse } from '@/types';

const promotionService = {
  async getStorePromotions(storeId: string): Promise<ApiResponse<Promotion[]>> {
    const response = await api.get<ApiResponse<Promotion[]>>(`/stores/${storeId}/promotions`);
    return response.data;
  },

  async createPromotion(storeId: string, data: CreatePromotionData): Promise<ApiResponse<Promotion>> {
    const response = await api.post<ApiResponse<Promotion>>(`/stores/${storeId}/promotions`, data);
    return response.data;
  },

  async updatePromotion(id: string, data: UpdatePromotionData): Promise<ApiResponse<Promotion>> {
    const response = await api.put<ApiResponse<Promotion>>(`/promotions/${id}`, data);
    return response.data;
  },

  async deletePromotion(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/promotions/${id}`);
    return response.data;
  },

  async applyCoupon(orderId: string, code: string): Promise<ApiResponse<Order>> {
    const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/apply-coupon`, { code });
    return response.data;
  },
};

export { promotionService };
export default promotionService;
