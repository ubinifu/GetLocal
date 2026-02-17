import api from './api';
import type { Product, ApiResponse, PaginatedResponse } from '@/types';

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  categoryId: string;
  imageUrl?: string;
  sku?: string;
  stockQuantity: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export type UpdateProductData = Partial<CreateProductData>;

const productService = {
  async getProductsByStore(storeId: string, params?: GetProductsParams): Promise<PaginatedResponse<Product>> {
    const response = await api.get(`/products/store/${storeId}`, { params });
    return (response.data as any).data;
  },

  // Alias that extracts storeId from params for convenience
  async getProducts(params?: GetProductsParams): Promise<PaginatedResponse<Product>> {
    const { storeId, ...rest } = params || {};
    if (storeId) {
      const response = await api.get(`/products/store/${storeId}`, { params: rest });
      return (response.data as any).data;
    }
    const response = await api.get('/products', { params: rest });
    return (response.data as any).data;
  },

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  },

  async createProduct(storeId: string, data: CreateProductData): Promise<ApiResponse<Product>> {
    const response = await api.post<ApiResponse<Product>>(`/products/store/${storeId}`, data);
    return response.data;
  },

  async updateProduct(id: string, data: UpdateProductData): Promise<ApiResponse<Product>> {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data;
  },

  async deleteProduct(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/products/${id}`);
    return response.data;
  },

  async updateStock(id: string, quantity: number): Promise<ApiResponse<Product>> {
    const response = await api.patch<ApiResponse<Product>>(`/products/${id}/stock`, { stockQuantity: quantity });
    return response.data;
  },
};

export { productService };
export default productService;
