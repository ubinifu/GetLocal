import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface NotificationState {
  unreadCount: number;
}

const initialState: NotificationState = {
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    decrementUnreadCount(state) {
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
  },
});

export const { setUnreadCount, decrementUnreadCount } = notificationSlice.actions;
export default notificationSlice.reducer;
