import api from './api';
import type { Message, ApiResponse } from '@/types';

const messageService = {
  async getMessages(orderId: string): Promise<{ data: Message[] }> {
    const response = await api.get(`/orders/${orderId}/messages`);
    const inner = (response.data as any).data;
    return { data: inner.data ?? inner };
  },

  async sendMessage(orderId: string, content: string): Promise<ApiResponse<Message>> {
    const response = await api.post<ApiResponse<Message>>(`/orders/${orderId}/messages`, { content });
    return response.data;
  },

  async markAsRead(messageId: string): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>(`/messages/${messageId}/read`);
    return response.data;
  },
};

export { messageService };
export default messageService;
