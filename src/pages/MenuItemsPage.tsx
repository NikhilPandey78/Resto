import { useEffect, useState, useCallback } from 'react';
import { Plus, UtensilsCrossed, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Select, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { formatCurrency } from '@/lib/utils';
import type { MenuItem, Recipe } from '@/lib/types';

const menuCategories = ['Main Course', 'Biryani', 'South Indian', 'Indo-Chinese', 'Starters', 'Desserts', 'Beverages'];

export function MenuItemsPage() {
  const { restaurant } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Main Course', recipe_id: '', selling_price: '0', status: 'active' });

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: menuData }, { data: recData }] = await Promise.all([
      supabase.from('menu_items').select('*, recipe:recipes(*)').eq('restaurant_id', rid).order('name'),
      supabase.from('recipes').select('*').eq('restaurant_id', rid).order('name'),
    ]);
    setMenuItems((menuData as MenuItem[]) || []);
    setRecipes((recData as Recipe[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setEditing(null); setForm({ name: '', category: 'Main Course', recipe_id: '', selling_price: '0', status: 'active' }); setShowModal(true); };
  const openEdit = (m: MenuItem) => { setEditing(m); setForm({ name: m.name, category: m.category || 'Main Course', recipe_id: m.recipe_id || '', selling_price: String(m.selling_price), status: m.status }); setShowModal(true); };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!form.name) { toast('Menu item name is required', 'error'); return; }
    setSaving(true);
    const recipe = recipes.find((r) => r.id === form.recipe_id);
    const foodCost = recipe ? recipe.total_cost : 0;
    const sellingPrice = parseFloat(form.selling_price) || 0;
    const foodCostPercent = sellingPrice > 0 ? (foodCost / sellingPrice) * 100 : 0;
    const grossMargin = sellingPrice - foodCost;

    const payload = {
      restaurant_id: restaurant.id, name: form.name, category: form.category,
      recipe_id: form.recipe_id || null, selling_price: sellingPrice,
      food_cost: foodCost, food_cost_percent: Math.round(foodCostPercent * 100) / 100,
      gross_margin: grossMargin, status: form.status,
    };

    if (editing) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editing.id);
      if (error) { setSaving(false); toast('Unable to update.', 'error'); return; }
      toast('Menu item updated successfully.', 'success');
    } else {
      const { error } = await supabase.from('menu_items').insert(payload);
      if (error) { setSaving(false); toast('Unable to add menu item.', 'error'); return; }
      toast('Menu item added successfully.', 'success');
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', deleteTarget.id);
    if (error) { toast('Unable to delete.', 'error'); return; }
    toast('Menu item deleted successfully.', 'success');
    loadData();
  };

  const columns: Column<MenuItem>[] = [
    { key: 'name', header: 'Menu Item', sortable: true, render: (m) => <span className="font-semibold">{m.name}</span> },
    { key: 'category', header: 'Category', sortable: true, hideOnMobile: true, render: (m) => <Badge variant="info">{m.category}</Badge> },
    { key: 'selling_price', header: 'Selling Price', sortable: true, render: (m) => formatCurrency(m.selling_price) },
    { key: 'food_cost', header: 'Food Cost', sortable: true, hideOnMobile: true, render: (m) => formatCurrency(m.food_cost) },
    { key: 'food_cost_percent', header: 'FC%', sortable: true, render: (m) => <span className={m.food_cost_percent > 40 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>{m.food_cost_percent.toFixed(1)}%</span> },
    { key: 'gross_margin', header: 'Margin', sortable: true, hideOnMobile: true, render: (m) => formatCurrency(m.gross_margin) },
    { key: 'status', header: 'Status', render: (m) => { const s = statusBadge(m.status); return <Badge variant={s.variant}>{s.label}</Badge>; } },
    { key: 'actions', header: '', render: (m) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    )},
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Menu Items" description={`${menuItems.length} items`} action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Menu Item</Button>} />
      <Card className="p-5">
        <DataTable columns={columns} data={menuItems} loading={loading} searchPlaceholder="Search menu items..." initialSort={{ key: 'name', direction: 'asc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Menu Item' : 'Add Menu Item'} footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Add'}</Button></>}>
        <div className="space-y-4">
          <Input label="Menu Item Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Butter Chicken" />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {menuCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Recipe (for auto food cost)" value={form.recipe_id} onChange={(e) => setForm({ ...form, recipe_id: e.target.value })}>
            <option value="">No recipe linked</option>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.name} ({formatCurrency(r.total_cost)})</option>)}
          </Select>
          <Input label="Selling Price" type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          {form.recipe_id && (() => {
            const r = recipes.find((x) => x.id === form.recipe_id);
            const sp = parseFloat(form.selling_price) || 0;
            const fc = r?.total_cost || 0;
            const fcp = sp > 0 ? (fc / sp) * 100 : 0;
            return (
              <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Food Cost</span><span className="font-semibold">{formatCurrency(fc)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Gross Margin</span><span className="font-semibold text-emerald-600">{formatCurrency(sp - fc)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Food Cost %</span><span className={`font-semibold ${fcp > 40 ? 'text-red-600' : 'text-emerald-600'}`}>{fcp.toFixed(1)}%</span></div>
              </div>
            );
          })()}
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Menu Item" message={`Delete "${deleteTarget?.name}"?`} confirmText="Delete" />
    </div>
  );
}
