/*
# Restaurant Inventory Management SaaS - Core Schema

## Overview
Creates the complete multi-tenant database schema for a Restaurant Inventory Management SaaS.
Every restaurant-owned record is scoped by `restaurant_id` and protected with RLS policies
that enforce tenant isolation at the database level.

## Tables Created
1. **restaurants** - Tenant root: each restaurant is a tenant
2. **branches** - Restaurant branches/locations
3. **restaurant_users** - Users belonging to a restaurant (linked to auth.users)
4. **categories** - Inventory categories (Grocery, Vegetables, Dairy, etc.)
5. **units** - Measurement units with conversion support
6. **unit_conversions** - Unit conversion rules (e.g. 1 Box = 24 Bottles)
7. **suppliers** - Supplier records
8. **inventory_items** - Stock items with stock levels, min/max, pricing
9. **stock_transactions** - Complete stock movement history (in/out/transfer/adjustment)
10. **purchase_orders** - Purchase orders with status workflow
11. **purchase_order_items** - Line items on a purchase order
12. **stock_receipts** - Goods received notes (stock in)
13. **stock_receipt_items** - Line items on a stock receipt
14. **purchase_returns** - Returns to suppliers
15. **purchase_return_items** - Line items on a return
16. **stock_issues** - Stock out / consumption records
17. **stock_transfers** - Transfers between branches/locations
18. **stock_transfer_items** - Line items on a transfer
19. **stock_adjustments** - Stock adjustments with audit trail
20. **stock_counts** - Stock count sessions
21. **stock_count_items** - Items in a stock count
22. **kitchen_requisitions** - Kitchen stock requests
23. **kitchen_requisition_items** - Line items on a requisition
24. **recipes** - Recipes with ingredients
25. **recipe_ingredients** - Ingredients in a recipe
26. **menu_items** - Menu items mapped to recipes
27. **wastage_records** - Wastage tracking
28. **notifications** - User notifications
29. **activity_logs** - Audit/activity log
30. **subscriptions** - Subscription/billing status per restaurant

## Security
- RLS enabled on every table.
- All policies scope by `restaurant_id` matching the authenticated user's restaurant.
- A helper function `auth_restaurant_id()` resolves the current user's restaurant.
- Users can only access data within their own restaurant tenant.
*/

-- ============================================================
-- RESTAURANTS (tenant root)
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  gst_number text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'India',
  currency text DEFAULT 'INR',
  logo_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  city text,
  state text,
  postal_code text,
  phone text,
  manager_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RESTAURANT USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'staff',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, auth_user_id)
);

ALTER TABLE restaurant_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- UNITS
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  symbol text NOT NULL,
  base_unit text,
  conversion_factor numeric DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- UNIT CONVERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS unit_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  from_unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  to_unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  factor numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, from_unit_id, to_unit_id)
);

ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  gst_number text,
  address text,
  city text,
  state text,
  postal_code text,
  payment_terms text DEFAULT 'Net 30',
  outstanding_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INVENTORY ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  subcategory text,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  current_stock numeric NOT NULL DEFAULT 0,
  minimum_stock numeric NOT NULL DEFAULT 0,
  maximum_stock numeric NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  selling_price numeric DEFAULT 0,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  storage_location text,
  expiry_tracking boolean NOT NULL DEFAULT false,
  batch_tracking boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON inventory_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch ON inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory_items(supplier_id);

-- ============================================================
-- STOCK TRANSACTIONS (complete movement history)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  quantity_change numeric NOT NULL,
  quantity_after numeric NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  batch_number text,
  expiry_date date,
  unit_cost numeric DEFAULT 0,
  reason text,
  notes text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stock_txn_restaurant ON stock_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_item ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_txn_created ON stock_transactions(created_at DESC);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  po_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery date,
  received_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, po_number)
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_po_restaurant ON purchase_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  received_quantity numeric NOT NULL DEFAULT 0,
  unit text,
  rate numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);

-- ============================================================
-- STOCK RECEIPTS (Goods Received / Stock In)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  receipt_number text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_number text,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, receipt_number)
);

ALTER TABLE stock_receipts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stock_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_receipt_id uuid NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  rate numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  batch_number text,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sri_receipt ON stock_receipt_items(stock_receipt_id);

-- ============================================================
-- PURCHASE RETURNS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  return_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  stock_receipt_id uuid REFERENCES stock_receipts(id) ON DELETE SET NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, return_number)
);

ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_return_id uuid NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  rate numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STOCK ISSUES (Stock Out / Consumption)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  issue_number text NOT NULL,
  issue_type text NOT NULL DEFAULT 'consumption',
  department text NOT NULL DEFAULT 'Kitchen',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  notes text,
  total_value numeric NOT NULL DEFAULT 0,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, issue_number)
);

ALTER TABLE stock_issues ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stock_issue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_issue_id uuid NOT NULL REFERENCES stock_issues(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  rate numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_issue_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STOCK TRANSFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  transfer_number text NOT NULL,
  from_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  to_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  from_location text,
  to_location text,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, transfer_number)
);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STOCK ADJUSTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  adjustment_number text NOT NULL,
  adjustment_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  notes text,
  total_value numeric NOT NULL DEFAULT 0,
  adjusted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  adjusted_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, adjustment_number)
);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_adjustment_id uuid NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  system_quantity numeric NOT NULL DEFAULT 0,
  physical_quantity numeric NOT NULL DEFAULT 0,
  variance numeric NOT NULL DEFAULT 0,
  unit text,
  rate numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_adjustment_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STOCK COUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  count_number text NOT NULL,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  total_variance numeric DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, count_number)
);

ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  expected_quantity numeric NOT NULL DEFAULT 0,
  actual_quantity numeric,
  variance numeric DEFAULT 0,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- KITCHEN REQUISITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS kitchen_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  requisition_number text NOT NULL,
  department text NOT NULL DEFAULT 'Kitchen',
  required_date date NOT NULL DEFAULT CURRENT_DATE,
  priority text NOT NULL DEFAULT 'normal',
  reason text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by_name text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, requisition_number)
);

ALTER TABLE kitchen_requisitions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS kitchen_requisition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_requisition_id uuid NOT NULL REFERENCES kitchen_requisitions(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kitchen_requisition_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RECIPES
-- ============================================================
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  menu_item_id uuid,
  preparation_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  servings int NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  selling_price numeric NOT NULL DEFAULT 0,
  food_cost numeric NOT NULL DEFAULT 0,
  food_cost_percent numeric NOT NULL DEFAULT 0,
  gross_margin numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- WASTAGE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS wastage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  wastage_number text NOT NULL,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  rate numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  reason text NOT NULL,
  location text,
  notes text,
  waste_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, wastage_number)
);

ALTER TABLE wastage_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wastage_restaurant ON wastage_records(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_wastage_date ON wastage_records(waste_date);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notif_restaurant ON notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  module text NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  ip_address text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_restaurant ON activity_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'trial',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL DEFAULT (CURRENT_DATE + 14),
  billing_cycle text NOT NULL DEFAULT 'monthly',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  auto_renewal boolean NOT NULL DEFAULT false,
  max_branches int NOT NULL DEFAULT 1,
  max_users int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: auth_restaurant_id()
-- Returns the restaurant_id for the current authenticated user.
-- ============================================================
CREATE OR REPLACE FUNCTION auth_restaurant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ru.restaurant_id
  FROM restaurant_users ru
  WHERE ru.auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION auth_restaurant_id() TO authenticated;

-- ============================================================
-- RLS POLICIES
-- All tables scoped by restaurant_id resolved via auth_restaurant_id()
-- ============================================================

-- Helper to apply standard CRUD policies to a restaurant-scoped table
-- We write them explicitly since dynamic SQL in policies is not allowed.

-- RESTAURANTS: users can view their own restaurant
DROP POLICY IF EXISTS "select_own_restaurant" ON restaurants;
CREATE POLICY "select_own_restaurant" ON restaurants FOR SELECT
  TO authenticated USING (id = auth_restaurant_id());

DROP POLICY IF EXISTS "update_own_restaurant" ON restaurants;
CREATE POLICY "update_own_restaurant" ON restaurants FOR UPDATE
  TO authenticated USING (id = auth_restaurant_id()) WITH CHECK (id = auth_restaurant_id());

-- BRANCHES
DROP POLICY IF EXISTS "select_own_branches" ON branches;
CREATE POLICY "select_own_branches" ON branches FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_branches" ON branches;
CREATE POLICY "insert_own_branches" ON branches FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_branches" ON branches;
CREATE POLICY "update_own_branches" ON branches FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_branches" ON branches;
CREATE POLICY "delete_own_branches" ON branches FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- RESTAURANT_USERS
DROP POLICY IF EXISTS "select_own_restaurant_users" ON restaurant_users;
CREATE POLICY "select_own_restaurant_users" ON restaurant_users FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_restaurant_users" ON restaurant_users;
CREATE POLICY "insert_own_restaurant_users" ON restaurant_users FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_restaurant_users" ON restaurant_users;
CREATE POLICY "update_own_restaurant_users" ON restaurant_users FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_restaurant_users" ON restaurant_users;
CREATE POLICY "delete_own_restaurant_users" ON restaurant_users FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- CATEGORIES
DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- UNITS
DROP POLICY IF EXISTS "select_own_units" ON units;
CREATE POLICY "select_own_units" ON units FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_units" ON units;
CREATE POLICY "insert_own_units" ON units FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_units" ON units;
CREATE POLICY "update_own_units" ON units FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_units" ON units;
CREATE POLICY "delete_own_units" ON units FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- UNIT_CONVERSIONS
DROP POLICY IF EXISTS "select_own_unit_conversions" ON unit_conversions;
CREATE POLICY "select_own_unit_conversions" ON unit_conversions FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_unit_conversions" ON unit_conversions;
CREATE POLICY "insert_own_unit_conversions" ON unit_conversions FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_unit_conversions" ON unit_conversions;
CREATE POLICY "update_own_unit_conversions" ON unit_conversions FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_unit_conversions" ON unit_conversions;
CREATE POLICY "delete_own_unit_conversions" ON unit_conversions FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- SUPPLIERS
DROP POLICY IF EXISTS "select_own_suppliers" ON suppliers;
CREATE POLICY "select_own_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_suppliers" ON suppliers;
CREATE POLICY "insert_own_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_suppliers" ON suppliers;
CREATE POLICY "update_own_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_suppliers" ON suppliers;
CREATE POLICY "delete_own_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "select_own_inventory" ON inventory_items;
CREATE POLICY "select_own_inventory" ON inventory_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_inventory" ON inventory_items;
CREATE POLICY "insert_own_inventory" ON inventory_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_inventory" ON inventory_items;
CREATE POLICY "update_own_inventory" ON inventory_items FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_inventory" ON inventory_items;
CREATE POLICY "delete_own_inventory" ON inventory_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_TRANSACTIONS
DROP POLICY IF EXISTS "select_own_stock_txn" ON stock_transactions;
CREATE POLICY "select_own_stock_txn" ON stock_transactions FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_stock_txn" ON stock_transactions;
CREATE POLICY "insert_own_stock_txn" ON stock_transactions FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());

-- PURCHASE_ORDERS
DROP POLICY IF EXISTS "select_own_po" ON purchase_orders;
CREATE POLICY "select_own_po" ON purchase_orders FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_po" ON purchase_orders;
CREATE POLICY "insert_own_po" ON purchase_orders FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_po" ON purchase_orders;
CREATE POLICY "update_own_po" ON purchase_orders FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_po" ON purchase_orders;
CREATE POLICY "delete_own_po" ON purchase_orders FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- PURCHASE_ORDER_ITEMS
DROP POLICY IF EXISTS "select_own_poi" ON purchase_order_items;
CREATE POLICY "select_own_poi" ON purchase_order_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_poi" ON purchase_order_items;
CREATE POLICY "insert_own_poi" ON purchase_order_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_poi" ON purchase_order_items;
CREATE POLICY "update_own_poi" ON purchase_order_items FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_poi" ON purchase_order_items;
CREATE POLICY "delete_own_poi" ON purchase_order_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_RECEIPTS
DROP POLICY IF EXISTS "select_own_receipts" ON stock_receipts;
CREATE POLICY "select_own_receipts" ON stock_receipts FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_receipts" ON stock_receipts;
CREATE POLICY "insert_own_receipts" ON stock_receipts FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_receipts" ON stock_receipts;
CREATE POLICY "update_own_receipts" ON stock_receipts FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_receipts" ON stock_receipts;
CREATE POLICY "delete_own_receipts" ON stock_receipts FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_RECEIPT_ITEMS
DROP POLICY IF EXISTS "select_own_sri" ON stock_receipt_items;
CREATE POLICY "select_own_sri" ON stock_receipt_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_sri" ON stock_receipt_items;
CREATE POLICY "insert_own_sri" ON stock_receipt_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_sri" ON stock_receipt_items;
CREATE POLICY "delete_own_sri" ON stock_receipt_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- PURCHASE_RETURNS
DROP POLICY IF EXISTS "select_own_preturns" ON purchase_returns;
CREATE POLICY "select_own_preturns" ON purchase_returns FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_preturns" ON purchase_returns;
CREATE POLICY "insert_own_preturns" ON purchase_returns FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_preturns" ON purchase_returns;
CREATE POLICY "update_own_preturns" ON purchase_returns FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_preturns" ON purchase_returns;
CREATE POLICY "delete_own_preturns" ON purchase_returns FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- PURCHASE_RETURN_ITEMS
DROP POLICY IF EXISTS "select_own_pri" ON purchase_return_items;
CREATE POLICY "select_own_pri" ON purchase_return_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_pri" ON purchase_return_items;
CREATE POLICY "insert_own_pri" ON purchase_return_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_pri" ON purchase_return_items;
CREATE POLICY "delete_own_pri" ON purchase_return_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_ISSUES
DROP POLICY IF EXISTS "select_own_issues" ON stock_issues;
CREATE POLICY "select_own_issues" ON stock_issues FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_issues" ON stock_issues;
CREATE POLICY "insert_own_issues" ON stock_issues FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_issues" ON stock_issues;
CREATE POLICY "update_own_issues" ON stock_issues FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_issues" ON stock_issues;
CREATE POLICY "delete_own_issues" ON stock_issues FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_ISSUE_ITEMS
DROP POLICY IF EXISTS "select_own_sii" ON stock_issue_items;
CREATE POLICY "select_own_sii" ON stock_issue_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_sii" ON stock_issue_items;
CREATE POLICY "insert_own_sii" ON stock_issue_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_sii" ON stock_issue_items;
CREATE POLICY "delete_own_sii" ON stock_issue_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_TRANSFERS
DROP POLICY IF EXISTS "select_own_transfers" ON stock_transfers;
CREATE POLICY "select_own_transfers" ON stock_transfers FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_transfers" ON stock_transfers;
CREATE POLICY "insert_own_transfers" ON stock_transfers FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_transfers" ON stock_transfers;
CREATE POLICY "update_own_transfers" ON stock_transfers FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_transfers" ON stock_transfers;
CREATE POLICY "delete_own_transfers" ON stock_transfers FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_TRANSFER_ITEMS
DROP POLICY IF EXISTS "select_own_sti" ON stock_transfer_items;
CREATE POLICY "select_own_sti" ON stock_transfer_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_sti" ON stock_transfer_items;
CREATE POLICY "insert_own_sti" ON stock_transfer_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_sti" ON stock_transfer_items;
CREATE POLICY "delete_own_sti" ON stock_transfer_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_ADJUSTMENTS
DROP POLICY IF EXISTS "select_own_adjustments" ON stock_adjustments;
CREATE POLICY "select_own_adjustments" ON stock_adjustments FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_adjustments" ON stock_adjustments;
CREATE POLICY "insert_own_adjustments" ON stock_adjustments FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_adjustments" ON stock_adjustments;
CREATE POLICY "delete_own_adjustments" ON stock_adjustments FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_ADJUSTMENT_ITEMS
DROP POLICY IF EXISTS "select_own_sai" ON stock_adjustment_items;
CREATE POLICY "select_own_sai" ON stock_adjustment_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_sai" ON stock_adjustment_items;
CREATE POLICY "insert_own_sai" ON stock_adjustment_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_sai" ON stock_adjustment_items;
CREATE POLICY "delete_own_sai" ON stock_adjustment_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_COUNTS
DROP POLICY IF EXISTS "select_own_counts" ON stock_counts;
CREATE POLICY "select_own_counts" ON stock_counts FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_counts" ON stock_counts;
CREATE POLICY "insert_own_counts" ON stock_counts FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_counts" ON stock_counts;
CREATE POLICY "update_own_counts" ON stock_counts FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_counts" ON stock_counts;
CREATE POLICY "delete_own_counts" ON stock_counts FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- STOCK_COUNT_ITEMS
DROP POLICY IF EXISTS "select_own_sci" ON stock_count_items;
CREATE POLICY "select_own_sci" ON stock_count_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_sci" ON stock_count_items;
CREATE POLICY "insert_own_sci" ON stock_count_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_sci" ON stock_count_items;
CREATE POLICY "update_own_sci" ON stock_count_items FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_sci" ON stock_count_items;
CREATE POLICY "delete_own_sci" ON stock_count_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- KITCHEN_REQUISITIONS
DROP POLICY IF EXISTS "select_own_req" ON kitchen_requisitions;
CREATE POLICY "select_own_req" ON kitchen_requisitions FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_req" ON kitchen_requisitions;
CREATE POLICY "insert_own_req" ON kitchen_requisitions FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_req" ON kitchen_requisitions;
CREATE POLICY "update_own_req" ON kitchen_requisitions FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_req" ON kitchen_requisitions;
CREATE POLICY "delete_own_req" ON kitchen_requisitions FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- KITCHEN_REQUISITION_ITEMS
DROP POLICY IF EXISTS "select_own_kri" ON kitchen_requisition_items;
CREATE POLICY "select_own_kri" ON kitchen_requisition_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_kri" ON kitchen_requisition_items;
CREATE POLICY "insert_own_kri" ON kitchen_requisition_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_kri" ON kitchen_requisition_items;
CREATE POLICY "delete_own_kri" ON kitchen_requisition_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- RECIPES
DROP POLICY IF EXISTS "select_own_recipes" ON recipes;
CREATE POLICY "select_own_recipes" ON recipes FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_recipes" ON recipes;
CREATE POLICY "insert_own_recipes" ON recipes FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_recipes" ON recipes;
CREATE POLICY "update_own_recipes" ON recipes FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_recipes" ON recipes;
CREATE POLICY "delete_own_recipes" ON recipes FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- RECIPE_INGREDIENTS
DROP POLICY IF EXISTS "select_own_ri" ON recipe_ingredients;
CREATE POLICY "select_own_ri" ON recipe_ingredients FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_ri" ON recipe_ingredients;
CREATE POLICY "insert_own_ri" ON recipe_ingredients FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_ri" ON recipe_ingredients;
CREATE POLICY "update_own_ri" ON recipe_ingredients FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_ri" ON recipe_ingredients;
CREATE POLICY "delete_own_ri" ON recipe_ingredients FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- MENU_ITEMS
DROP POLICY IF EXISTS "select_own_menu" ON menu_items;
CREATE POLICY "select_own_menu" ON menu_items FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_menu" ON menu_items;
CREATE POLICY "insert_own_menu" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_menu" ON menu_items;
CREATE POLICY "update_own_menu" ON menu_items FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_menu" ON menu_items;
CREATE POLICY "delete_own_menu" ON menu_items FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- WASTAGE_RECORDS
DROP POLICY IF EXISTS "select_own_wastage" ON wastage_records;
CREATE POLICY "select_own_wastage" ON wastage_records FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_wastage" ON wastage_records;
CREATE POLICY "insert_own_wastage" ON wastage_records FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_wastage" ON wastage_records;
CREATE POLICY "update_own_wastage" ON wastage_records FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_wastage" ON wastage_records;
CREATE POLICY "delete_own_wastage" ON wastage_records FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "select_own_notif" ON notifications;
CREATE POLICY "select_own_notif" ON notifications FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_notif" ON notifications;
CREATE POLICY "insert_own_notif" ON notifications FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_notif" ON notifications;
CREATE POLICY "update_own_notif" ON notifications FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "delete_own_notif" ON notifications;
CREATE POLICY "delete_own_notif" ON notifications FOR DELETE
  TO authenticated USING (restaurant_id = auth_restaurant_id());

-- ACTIVITY_LOGS
DROP POLICY IF EXISTS "select_own_activity" ON activity_logs;
CREATE POLICY "select_own_activity" ON activity_logs FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "insert_own_activity" ON activity_logs;
CREATE POLICY "insert_own_activity" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (restaurant_id = auth_restaurant_id());

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "select_own_sub" ON subscriptions;
CREATE POLICY "select_own_sub" ON subscriptions FOR SELECT
  TO authenticated USING (restaurant_id = auth_restaurant_id());
DROP POLICY IF EXISTS "update_own_sub" ON subscriptions;
CREATE POLICY "update_own_sub" ON subscriptions FOR UPDATE
  TO authenticated USING (restaurant_id = auth_restaurant_id()) WITH CHECK (restaurant_id = auth_restaurant_id());
