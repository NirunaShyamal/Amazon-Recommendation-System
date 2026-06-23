import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../supabase/supabase';

export interface LiveStockItem {
  variety_id: string;
  variety_name: string;
  pack_size_id: string;
  pack_size_name: string;
  weight_grams: number;
  total_units_in_stock: number;
  total_weight_kg: number;
}

interface InventoryState {
  stockMatrix: LiveStockItem[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  stockMatrix: [],
  loading: false,
  error: null,
};

export const fetchLiveStock = createAsyncThunk('inventory/fetchLiveStock', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.from('v_live_stock').select('*');
  if (error) return rejectWithValue(error.message);
  return data as LiveStockItem[];
});

export const logHarvestThunk = createAsyncThunk(
  'inventory/logHarvest',
  async (
    payload: { varietyId: string; packSizeId: string; deltaQty: number; notes: string },
    { rejectWithValue, dispatch }
  ) => {
    const { data, error } = await supabase.from('stock_logs').insert([
      {
        variety_id: payload.varietyId,
        pack_size_id: payload.packSizeId,
        delta_qty: payload.deltaQty,
        transaction_type: 'HARVEST',
        notes: payload.notes,
      },
    ]);

    if (error) return rejectWithValue(error.message);
    dispatch(fetchLiveStock()); // Auto-refresh matrix values
    return data;
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLiveStock.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLiveStock.fulfilled, (state, action: PayloadAction<LiveStockItem[]>) => {
        state.stockMatrix = action.payload;
        state.loading = false;
      })
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action: any) => {
          state.error = action.payload || 'Failed to update ledger records.';
          state.loading = false;
        }
      );
  },
});

export default inventorySlice.reducer;
