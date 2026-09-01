export type Role =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'store_manager'
  | 'purchase_manager'
  | 'kitchen_manager'
  | 'staff';

export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'expiring_soon'
  | 'expired'
  | 'suspended'
  | 'cancelled';

export interface Restaurant {
  id: string;
  name: string;
  legal_name: string | null;
  gst_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  currency: string;
  logo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  manager_name: string | null;
  status: string;
  created_at: string;
}

export interface RestaurantUser {
  id: string;
  restaurant_id: string;
  auth_user_id: string;
  branch_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: string;
  created_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Unit {
  id: string;
  restaurant_id: string;
  name: string;
  symbol: string;
  base_unit: string | null;
  conversion_factor: number;
  created_at: string;
}

export interface UnitConversion {
  id: string;
  restaurant_id: string;
  from_unit_id: string;
  to_unit_id: string;
  factor: number;
  created_at?: string;
  from_unit?: Unit;
  to_unit?: Unit;
}

export interface Supplier {
  id: string;
  restaurant_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  payment_terms: string;
  outstanding_amount: number;
  status: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  name: string;
  sku: string | null;
  category_id: string | null;
  subcategory: string | null;
  unit_id: string | null;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  purchase_price: number;
  selling_price: number;
  supplier_id: string | null;
  storage_location: string | null;
  expiry_tracking: boolean;
  batch_tracking: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  category?: Category;
  unit?: Unit;
  supplier?: Supplier;
}

export interface StockTransaction {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  item_id: string;
  transaction_type: string;
  quantity_change: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  unit_cost: number;
  reason: string | null;
  notes: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
  item?: InventoryItem;
}

export interface PurchaseOrder {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery: string | null;
  received_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  created_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  restaurant_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  received_quantity: number;
  unit: string;
  rate: number;
  tax_percent: number;
  discount_amount: number;
  total: number;
}

export interface StockReceipt {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  receipt_number: string;
  supplier_id: string | null;
  purchase_order_id: string | null;
  received_date: string;
  invoice_number: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  received_by: string | null;
  received_by_name: string | null;
  created_at: string;
  supplier?: Supplier;
  items?: StockReceiptItem[];
}

export interface StockReceiptItem {
  id: string;
  stock_receipt_id: string;
  restaurant_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
  tax_percent: number;
  discount_amount: number;
  total: number;
  batch_number: string | null;
  expiry_date: string | null;
}

export interface PurchaseReturn {
  id: string;
  restaurant_id: string;
  return_number: string;
  supplier_id: string;
  stock_receipt_id: string | null;
  return_date: string;
  reason: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  supplier?: Supplier;
  items?: PurchaseReturnItem[];
}

export interface PurchaseReturnItem {
  id: string;
  purchase_return_id: string;
  restaurant_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  reason: string | null;
}

export interface StockIssue {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  issue_number: string;
  issue_type: string;
  department: string;
  issue_date: string;
  reason: string | null;
  notes: string | null;
  total_value: number;
  issued_by: string | null;
  issued_by_name: string | null;
  created_at: string;
  items?: StockIssueItem[];
}

export interface StockIssueItem {
  id: string;
  stock_issue_id: string;
  restaurant_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

export interface StockTransfer {
  id: string;
  restaurant_id: string;
  transfer_number: string;
  from_branch_id: string | null;
  to_branch_id: string | null;
  from_location: string | null;
  to_location: string | null;
  transfer_date: string;
  reason: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  created_at: string;
  from_branch?: Branch;
  to_branch?: Branch;
  items?: StockTransferItem[];
}

export interface StockTransferItem {
  id: string;
  stock_transfer_id: string;
  restaurant_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
}

export interface StockAdjustment {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  adjustment_number: string;
  adjustment_date: string;
  reason: string;
  notes: string | null;
  total_value: number;
  adjusted_by: string | null;
  adjusted_by_name: string | null;
  created_at: string;
  items?: StockAdjustmentItem[];
}

export interface StockAdjustmentItem {
  id: string;
  stock_adjustment_id: string;
  restaurant_id: string;
  item_id: string;
  item_name: string;
  system_quantity: number;
  physical_quantity: number;
  variance: number;
  unit: string;
  rate: number;
  total: number;
  reason: string | null;
}

export interface StockCount {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  count_number: string;
  count_date: string;
  status: string;
  notes: string | null;
  total_variance: number | null;
  created_by: string | null;
  created_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  items?: StockCountItem[];
}

export interface StockCountItem {
  id: string;
  stock_count_id: string;
  restaurant_id: string;
  item_id: string;
  item_name: string;
  expected_quantity: number;
  actual_quantity: number | null;
  variance: number | null;
  unit: string;
}

export interface KitchenRequisition {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  requisition_number: string;
  department: string;
  required_date: string;
  priority: string;
  reason: string | null;
  notes: string | null;
  status: string;
  requested_by: string | null;
  requested_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  created_at: string;
  items?: KitchenRequisitionItem[];
}

export interface KitchenRequisitionItem {
  id: string;
  kitchen_requisition_id: string;
  restaurant_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  notes: string | null;
}

export interface Recipe {
  id: string;
  restaurant_id: string;
  name: string;
  menu_item_id: string | null;
  preparation_cost: number;
  total_cost: number;
  servings: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  restaurant_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  recipe_id: string | null;
  selling_price: number;
  food_cost: number;
  food_cost_percent: number;
  gross_margin: number;
  status: string;
  created_at: string;
  updated_at: string;
  recipe?: Recipe;
}

export interface WastageRecord {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  wastage_number: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
  total_cost: number;
  reason: string;
  location: string | null;
  notes: string | null;
  waste_date: string;
  recorded_by: string | null;
  recorded_by_name: string | null;
  created_at: string;
  item?: InventoryItem;
}

export interface Notification {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  user_name: string | null;
  module: string;
  action: string;
  description: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  restaurant_id: string;
  plan: string;
  status: SubscriptionStatus;
  start_date: string;
  expiry_date: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  auto_renewal: boolean;
  max_branches: number;
  max_users: number;
  created_at: string;
  updated_at: string;
}
