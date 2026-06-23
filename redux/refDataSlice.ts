import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../supabase/supabase';

export interface MushroomVariety {
  id: string;
  code: 'SHIITAKE' | 'OYSTER' | 'LIONS_MANE' | 'BUTTON' | 'PORTOBELLO' | 'CHESTNUT';
  name: string;
  default_shelf_life_days: number;
  is_active: boolean;
}

export interface PackSize {
  id: string;
  name: string;
  weight_grams: number;
  is_active: boolean;
}

interface RefDataState {
  varieties: MushroomVariety[];
  packSizes: PackSize[];
  loading: boolean;
  error: string | null;
}

const initialState: RefDataState = {
  varieties: [],
  packSizes: [],
  loading: false,
  error: null,
};

// Async Thunks for Fetching
export const fetchVarieties = createAsyncThunk('refData/fetchVarieties', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.from('mushroom_varieties').select('*').order('name', { ascending: true });
  if (error) return rejectWithValue(error.message);
  return data as MushroomVariety[];
});

export const fetchPackSizes = createAsyncThunk('refData/fetchPackSizes', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.from('pack_sizes').select('*').order('weight_grams', { ascending: true });
  if (error) return rejectWithValue(error.message);
  return data as PackSize[];
});

// Async Thunks for Toggling State Status
export const toggleVarietyStatus = createAsyncThunk(
  'refData/toggleVarietyStatus',
  async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
    const { data, error } = await supabase.from('mushroom_varieties').update({ is_active: isActive }).eq('id', id).select().single();
    if (error) return rejectWithValue(error.message);
    return data as MushroomVariety;
  }
);

export const togglePackSizeStatus = createAsyncThunk(
  'refData/togglePackSizeStatus',
  async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
    const { data, error } = await supabase.from('pack_sizes').update({ is_active: isActive }).eq('id', id).select().single();
    if (error) return rejectWithValue(error.message);
    return data as PackSize;
  }
);

const refDataSlice = createSlice({
  name: 'refData',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Varieties
      .addCase(fetchVarieties.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchVarieties.fulfilled, (state, action: PayloadAction<MushroomVariety[]>) => {
        state.varieties = action.payload;
        state.loading = false;
      })
      // Fetch Pack Sizes
      .addCase(fetchPackSizes.fulfilled, (state, action: PayloadAction<PackSize[]>) => {
        state.packSizes = action.payload;
        state.loading = false;
      })
      // Toggle Variety
      .addCase(toggleVarietyStatus.fulfilled, (state, action: PayloadAction<MushroomVariety>) => {
        const index = state.varieties.findIndex(v => v.id === action.payload.id);
        if (index !== -1) state.varieties[index] = action.payload;
      })
      // Toggle Pack Size
      .addCase(togglePackSizeStatus.fulfilled, (state, action: PayloadAction<PackSize>) => {
        const index = state.packSizes.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.packSizes[index] = action.payload;
      })
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action: any) => {
          state.error = action.payload || 'An error occurred updating reference configuration data.';
          state.loading = false;
        }
      );
  },
});

export default refDataSlice.reducer;
