import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import refDataReducer from './refDataSlice';
import crmReducer from '../store/crmSlice';
import inventoryReducer from './inventorySlice';
import ordersReducer from './ordersSlice';
import dispatchReducer from '../store/dispatchSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    refData: refDataReducer,
    crm: crmReducer,
    inventory: inventoryReducer,
    orders: ordersReducer,
    dispatch: dispatchReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
