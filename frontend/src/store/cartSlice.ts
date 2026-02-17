import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Product } from '@/types';
import type { RootState } from './index';

interface CartState {
  items: CartItem[];
  storeId: string | null;
}

const initialState: CartState = {
  items: [],
  storeId: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<{ product: Product; quantity?: number }>) {
      const { product, quantity = 1 } = action.payload;

      // If cart has items from a different store, clear it first
      if (state.storeId && state.storeId !== product.storeId) {
        state.items = [];
        state.storeId = product.storeId;
      }

      // Set storeId if not set
      if (!state.storeId) {
        state.storeId = product.storeId;
      }

      // Check if product already exists in cart
      const existingItem = state.items.find((item) => item.product.id === product.id);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ product, quantity });
      }
    },

    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.product.id !== action.payload);
      if (state.items.length === 0) {
        state.storeId = null;
      }
    },

    updateQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const { productId, quantity } = action.payload;
      const item = state.items.find((item) => item.product.id === productId);
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((i) => i.product.id !== productId);
          if (state.items.length === 0) {
            state.storeId = null;
          }
        } else {
          item.quantity = quantity;
        }
      }
    },

    clearCart(state) {
      state.items = [];
      state.storeId = null;
    },

    setSubstitutionPreference(
      state,
      action: PayloadAction<{
        productId: string;
        preference: 'REMOVE' | 'BEST_MATCH' | 'SPECIFIC_ITEM';
        substituteProductId?: string;
      }>
    ) {
      const { productId, preference, substituteProductId } = action.payload;
      const item = state.items.find((item) => item.product.id === productId);
      if (item) {
        item.substitutionPreference = preference;
        item.substituteProductId = substituteProductId;
      }
    },
  },
});

// Selectors
export const selectCartTotal = (state: RootState): number =>
  state.cart.items.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);

export const selectCartItemCount = (state: RootState): number =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);

export const { addToCart, removeFromCart, updateQuantity, clearCart, setSubstitutionPreference } = cartSlice.actions;
export default cartSlice.reducer;
