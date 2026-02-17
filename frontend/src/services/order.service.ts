import api from './api';
import type { Order, OrderStatus, ApiResponse, PaginatedResponse } from '@/types';

export interface CreateOrderData {
  storeId: string;
  items: Array<{
    productId: string;
    quantity: number;
    substitutionPreference?: 'REMOVE' | 'BEST_MATCH' | 'SPECIFIC_ITEM';
    substituteProductId?: string;
  }>;
  pickupTime?: string;
  notes?: string;
}

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  storeId?: string;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

const orderService = {
  async createOrder(data: CreateOrderData): Promise<ApiResponse<Order>> {
    const response = await api.post<ApiResponse<Order>>('/orders', data);
    return response.data;
  },

  async getOrders(params?: GetOrdersParams): Promise<PaginatedResponse<Order>> {
    const response = await api.get('/orders', { params });
    return (response.data as any).data;
  },

  async getOrderById(id: string): Promise<ApiResponse<Order>> {
    const response = await api.get<ApiResponse<Order>>(`/orders/${id}`);
    return response.data;
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<ApiResponse<Order>> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/status`, { status });
    return response.data;
  },

  async getOrderStats(storeId: string): Promise<ApiResponse<OrderStats>> {
    const response = await api.get<ApiResponse<OrderStats>>(`/orders/store/${storeId}/stats`);
    return response.data;
  },

  async reorder(id: string): Promise<ApiResponse<Order>> {
    const response = await api.post<ApiResponse<Order>>(`/orders/${id}/reorder`);
    return response.data;
  },

  async checkin(id: string): Promise<ApiResponse<Order>> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/checkin`);
    return response.data;
  },

  async verifyPickup(id: string, code: string): Promise<ApiResponse<Order>> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/verify-pickup`, { pickupCode: code });
    return response.data;
  },

  async setEstimatedTime(id: string, minutes: number): Promise<ApiResponse<Order>> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/estimated-time`, { minutes });
    return response.data;
  },
};

export { orderService };
export default orderService;
