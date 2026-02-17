// Must match backend Prisma models exactly
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'STORE_OWNER' | 'ADMIN';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  ownerId: string;
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
  isActive: boolean;
  hours: Record<string, { open: string; close: string } | null>;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  category?: Category;
  store?: Store;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  sku?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  substitutionPreference?: 'REMOVE' | 'BEST_MATCH' | 'SPECIFIC_ITEM';
  substituteProductId?: string;
  substituteProduct?: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  store?: Store;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  pickupTime?: string;
  estimatedReadyTime?: string;
  pickupCode?: string;
  customerCheckedIn?: boolean;
  notes?: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  customerId: string;
  customer?: User;
  storeId: string;
  orderId?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'ORDER_STATUS' | 'LOW_STOCK' | 'PROMOTION' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface AuthResponse {
  status: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  substitutionPreference?: 'REMOVE' | 'BEST_MATCH' | 'SPECIFIC_ITEM';
  substituteProductId?: string;
}

// Feature 1: Favorites
export interface Favorite {
  id: string;
  userId: string;
  productId?: string;
  product?: Product;
  storeId?: string;
  store?: Store;
  createdAt: string;
}

// Feature 3: Messaging
export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: { firstName: string; lastName: string; role: string };
}

// Feature 6: Promotions
export interface Promotion {
  id: string;
  storeId: string;
  code?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  currentUses: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CreatePromotionData {
  code?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export type UpdatePromotionData = Partial<CreatePromotionData>;

// Feature: Store Integrations (POS/Inventory sync)
export type IntegrationType = 'SQUARE' | 'SHOPIFY' | 'TOAST' | 'CUSTOM_REST';
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface StoreIntegration {
  id: string;
  storeId: string;
  type: IntegrationType;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  apiKey?: string; // masked, last 4 chars only
  webhookUrl?: string;
  lastSyncAt?: string;
  lastSyncError?: string;
  syncInterval: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationData {
  type: IntegrationType;
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  syncInterval: number;
  config?: Record<string, unknown>;
}

export interface UpdateIntegrationData {
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  syncInterval?: number;
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
}

export interface IntegrationStats {
  active: number;
  inactive: number;
  error: number;
  lastSyncAt: string | null;
}
