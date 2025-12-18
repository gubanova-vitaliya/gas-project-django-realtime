import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { useAppSelector } from "../hooks/useTypedRedux";

interface CartState {
  items: number[];
  totalItems: number;
  draftId: number | null;
  isLoading: boolean;
}

const initialState: CartState = {
  items: [],
  totalItems: 0,
  draftId: null,
  isLoading: false,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCartLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setCartCount(state, action: PayloadAction<{ count: number; draftId?: number }>) {
      state.totalItems = action.payload.count;
      if (action.payload.draftId !== undefined) {
        state.draftId = action.payload.draftId;
      }
    },
    addToCart(state, action: PayloadAction<number>) {
      if (!state.items.includes(action.payload)) {
        state.items.push(action.payload);
        state.totalItems = state.items.length;
      }
    },
    incrementCartCount(state) {
      state.totalItems += 1;
    },
    removeFromCart(state, action: PayloadAction<number>) {
      state.items = state.items.filter((id) => id !== action.payload);
      state.totalItems = state.items.length;
    },
    clearCart(state) {
      state.items = [];
      state.totalItems = 0;
      state.draftId = null;
    },
  },
});

export const { 
  addToCart, 
  removeFromCart, 
  clearCart, 
  setCartCount, 
  setCartLoading,
  incrementCartCount 
} = cartSlice.actions;

export const useCartTotalItems = () => {
  return useAppSelector((state: any) => state.cart?.totalItems || 0);
};

export default cartSlice.reducer;

