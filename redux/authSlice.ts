import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../supabase/supabase';
import { UserRole } from '../types/database.types';

interface AuthState {
  user: any | null;
  role: UserRole | null;
  permissions: string[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  role: null,
  permissions: [],
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Async Thunk to fetch user's profile metadata from public.profiles table
// With database-resilient fallback if permissions column does not exist yet.
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', userId)
        .single();

      if (error) {
        // Fallback: If permissions column does not exist or isn't queryable, select only role.
        if (error.code === 'PGRST204' || error.message.includes('permissions') || error.message.includes('column')) {
          const { data: roleData, error: roleError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

          if (roleError) {
            throw roleError;
          }
          return {
            role: roleData?.role || 'CUSTOMER',
            permissions: ['SUPER_ADMIN', 'ADMIN'].includes(roleData?.role) ? ['all'] : [],
          };
        }
        throw error;
      }
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch user profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      if (!action.payload) {
        state.role = null;
        state.permissions = [];
        state.loading = false;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.role = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.loading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<any>) => {
        state.role = action.payload?.role || null;
        state.permissions = action.payload?.permissions || [];
        state.loading = false;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      });
  },
});

export const { setSession, setLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
