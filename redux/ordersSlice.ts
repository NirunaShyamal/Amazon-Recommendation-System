import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../supabase/supabase';

export interface OrderLineItem {
  id: string;
  branch_name: string;
  variety_name: string;
  pack_size_name: string;
  po_number: string;
  qty_ordered: number;
  qty_dispatched: number;
  unit_price: number;
}

export interface OrderAuditLog {
  id: string;
  from_status: string;
  to_status: string;
  changed_by_email: string;
  created_at: string;
}

export interface OrderMaster {
  id: string;
  order_number: string;
  company_name: string;
  expected_delivery_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL' | 'FULFILLED' | 'CANCELLED';
  created_by_email: string;
  approved_by_email: string;
  created_at: string;
  line_items?: OrderLineItem[];
  audit_logs?: OrderAuditLog[];
}

interface OrdersState {
  orderList: OrderMaster[];
  activeOrder: OrderMaster | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  orderList: [],
  activeOrder: null,
  loading: false,
  error: null,
};

export const fetchOrders = createAsyncThunk('orders/fetchOrders', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, expected_delivery_date, status, created_at,
      customers ( company_name ),
      creator:profiles!orders_created_by_id_fkey ( email ),
      approver:profiles!orders_approved_by_id_fkey ( email )
    `)
    .order('created_at', { ascending: false });

  if (error) return rejectWithValue(error.message);

  return data.map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    company_name: o.customers?.company_name,
    expected_delivery_date: o.expected_delivery_date,
    status: o.status,
    created_by_email: o.creator?.email,
    approved_by_email: o.approver?.email,
    created_at: o.created_at,
  })) as OrderMaster[];
});

export const fetchOrderDetails = createAsyncThunk('orders/fetchOrderDetails', async (orderId: string, { rejectWithValue }) => {
  const { data: lineItems, error: liError } = await supabase
    .from('order_line_items')
    .select('id, po_number, qty_ordered, qty_dispatched, unit_price, customer_branches(branch_name), mushroom_varieties(name), pack_sizes(name)')
    .eq('order_id', orderId);

  const { data: audits, error: auError } = await supabase
    .from('order_audit_trail')
    .select('id, from_status, to_status, created_at, profiles(email)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (liError || auError) return rejectWithValue(liError?.message || auError?.message);

  return {
    id: orderId,
    line_items: lineItems.map((li: any) => ({
      id: li.id,
      branch_name: li.customer_branches?.branch_name,
      variety_name: li.mushroom_varieties?.name,
      pack_size_name: li.pack_sizes?.name,
      po_number: li.po_number,
      qty_ordered: li.qty_ordered,
      qty_dispatched: li.qty_dispatched,
      unit_price: li.unit_price,
    })),
    audit_logs: audits.map((au: any) => ({
      id: au.id,
      from_status: au.from_status,
      to_status: au.to_status,
      changed_by_email: au.profiles?.email,
      created_at: au.created_at,
    })),
  };
});

export const updateOrderStatusThunk = createAsyncThunk(
  'orders/updateStatus',
  async ({ orderId, status, userId }: { orderId: string; status: string; userId: string }, { rejectWithValue, dispatch }) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, approved_by_id: userId })
      .eq('id', orderId)
      .select();

    if (error) return rejectWithValue(error.message);
    dispatch(fetchOrders());
    dispatch(fetchOrderDetails(orderId));
    return data;
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearActiveOrder: (state) => { state.activeOrder = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOrders.fulfilled, (state, action: PayloadAction<OrderMaster[]>) => {
        state.orderList = action.payload;
        state.loading = false;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action: PayloadAction<{ id: string; line_items: OrderLineItem[]; audit_logs: OrderAuditLog[] }>) => {
        const baseOrder = state.orderList.find(o => o.id === action.payload.id);
        if (baseOrder) {
          state.activeOrder = {
            ...baseOrder,
            line_items: action.payload.line_items,
            audit_logs: action.payload.audit_logs,
          };
        }
      });
  },
});

export const { clearActiveOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
