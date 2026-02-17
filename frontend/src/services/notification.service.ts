import api from './api';
import type { Notification, ApiResponse } from '@/types';

const notificationService = {
  async getNotifications(page = 1, limit = 20): Promise<{ data: Notification[]; pagination: any }> {
    const response = await api.get('/notifications', { params: { page, limit } });
    const inner = (response.data as any).data;
    return inner;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    return (response.data as any).data.unreadCount;
  },

  async markAsRead(id: string): Promise<ApiResponse<Notification>> {
    const response = await api.put<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },
};

export { notificationService };
export default notificationService;
