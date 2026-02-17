import api from './api';
import type { Favorite, ApiResponse } from '@/types';

const favoriteService = {
  async addFavorite(data: { productId?: string; storeId?: string }): Promise<ApiResponse<Favorite>> {
    const response = await api.post<ApiResponse<Favorite>>('/favorites', data);
    return response.data;
  },

  async getFavorites(): Promise<{ data: Favorite[] }> {
    const response = await api.get('/favorites');
    const inner = (response.data as any).data;
    return { data: inner.data ?? inner };
  },

  async removeFavorite(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/favorites/${id}`);
    return response.data;
  },
};

export { favoriteService };
export default favoriteService;
