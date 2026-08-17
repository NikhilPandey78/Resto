import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Badge, Card, Select, Input } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { InventoryItem, Category, Unit, Supplier } from '@/lib/types';

export function InventoryPage() {
  const { restaurant } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', category_id: '', subcategory: '', unit_id: '',
    current_stock: '0', minimum_stock: '0', maximum_stock: '0',
    purchase_price: '0', supplier_id: '', storage_location: '',
    expiry_tracking: false, batch_tracking: false,
  });

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: itemsData }, { data: catData }, { data: unitData }, { data: supData }] = await Promise.all([
      supabase.from('inventory_items').select('*, category:categories(*), unit:units(*), supplier:suppliers(*)').eq('restaurant_id', rid).order('name'),
      supabase.from('categories').select('*').eq('restaurant_id', rid).order('name'),
      supabase.from('units').select('*').eq('restaurant_id', rid).order('name'),
      supabase.from('suppliers').select('*').eq('restaurant_id', rid).order('name'),
    ]);
    setItems((itemsData as InventoryItem[]) || []);
    setCategories((catData as Category[]) || []);
    setUnits((unitData as Unit[]) || []);
    setSuppliers((supData as Supplier[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = items.filter((i) => {
    if (filterCat !== 'all' && i.category_id !== filterCat) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'low' && !(i.current_stock > 0 && i.current_stock <= i.minimum_stock)) return false;
      if (filterStatus === 'out' && i.current_stock !== 0) return false;
      if (filterStatus === 'ok' && (i.current_stock === 0 || i.current_stock <= i.minimum_stock)) return false;
    }
    return true;
  });

  const handleAdd = async () => {
    if (!form.name || !form.unit_id) { toast('Item name and unit are required', 'error'); return; }
    if (!restaurant) return;
    setSaving(true);
    const { error } = await supabase.from('inventory_items').insert({
      restaurant_id: restaurant.id,
      branch_id: null,
      name: form.name,
      sku: form.sku || null,
      category_id: form.category_id || null,
      subcategory: form.subcategory || null,
      unit_id: form.unit_id,
      current_stock: parseFloat(form.current_stock) || 0,
      minimum_stock: parseFloat(form.minimum_stock) || 0,
      maximum_stock: parseFloat(form.maximum_stock) || 0,
      purchase_price: parseFloat(form.purchase_price) || 0,
      supplier_id: form.supplier_id || null,
      storage_location: form.storage_location || null,
      expiry_tracking: form.expiry_tracking,
      batch_tracking: form.batch_tracking,
      status: 'active',
    });
    setSaving(false);
    if (error) { toast('Unable to add item. Please try again.', 'error'); return; }
    toast('Item added successfully.', 'success');
    setShowAdd(false);
    setForm({ name: '', sku: '', category_id: '', subcategory: '', unit_id: '', current_stock: '0', minimum_stock: '0', maximum_stock: '0', purchase_price: '0', supplier_id: '', storage_location: '', expiry_tracking: false, batch_tracking: false });
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('inventory_items').delete().eq('id', deleteTarget.id);
    if (error) { toast('Unable to delete item.', 'error'); return; }
    toast('Item deleted successfully.', 'success');
    loadData();
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return statusBadge('out_of_stock');
    if (item.current_stock <= item.minimum_stock) return statusBadge('low_stock');
    return statusBadge('in_stock');
  };

  const columns: Column<InventoryItem>[] = [
    { key: 'name', header: 'Item Name', sortable: true, render: (i) => (
      <div>
        <p className="font-semibold text-slate-900">{i.name}</p>
        <p className="text-xs text-slate-400">{i.sku || '—'}</p>
      </div>
    )},
    { key: 'category', header: 'Category', sortable: true, hideOnMobile: true, render: (i) => i.category?.name || '—' },
    { key: 'current_stock', header: 'Stock', sortable: true, render: (i) => (
      <span className="font-semibold">{formatNumber(i.current_stock)} {i.unit?.symbol}</span>
    )},
    { key: 'minimum_stock', header: 'Min Stock', sortable: true, hideOnMobile: true, render: (i) => `${formatNumber(i.minimum_stock)} ${i.unit?.symbol}` },
    { key: 'purchase_price', header: 'Price', sortable: true, hideOnMobile: true, render: (i) => formatCurrency(i.purchase_price) },
    { key: 'status', header: 'Status', render: (i) => {
      const s = getStockStatus(i);
      return <Badge variant={s.variant}>{s.label}</Badge>;
    }},
  ];

  return (
    <div className="animate-page">
      <PageHeader
        title="Inventory"
        description={`${items.length} items in stock`}
        action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Item</Button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="!w-auto min-w-[160px]">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="!w-auto min-w-[140px]">
          <option value="all">All Status</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </Select>
      </div>

      <Card className="p-5">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchPlaceholder="Search items..."
          onRowClick={(item) => navigate(`/inventory/${item.id}`)}
          initialSort={{ key: 'name', direction: 'asc' }}
        />
      </Card>

      {/* Add Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Inventory Item"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={saving}>Add Item</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Item Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Basmati Rice" />
          <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. SKU-001" />
          <Select label="Category" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Subcategory" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} placeholder="e.g. Rice & Grains" />
          <Select label="Unit *" value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
            <option value="">Select unit</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
          </Select>
          <Select label="Supplier" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
            <option value="">Select supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="Current Stock" type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
          <Input label="Purchase Price" type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
          <Input label="Minimum Stock" type="number" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} />
          <Input label="Maximum Stock" type="number" value={form.maximum_stock} onChange={(e) => setForm({ ...form, maximum_stock: e.target.value })} />
          <Input label="Storage Location" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} placeholder="e.g. Dry Store A1" />
          <div className="flex flex-col gap-3 justify-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.expiry_tracking} onChange={(e) => setForm({ ...form, expiry_tracking: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              <span className="text-sm text-slate-700">Expiry Tracking</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.batch_tracking} onChange={(e) => setForm({ ...form, batch_tracking: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              <span className="text-sm text-slate-700">Batch Tracking</span>
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}
