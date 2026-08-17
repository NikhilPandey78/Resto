import { useEffect, useState, useCallback } from 'react';
import { Plus, CookingPot, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Textarea, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency } from '@/lib/utils';
import type { Recipe, InventoryItem } from '@/lib/types';

interface IngredientLine { item_id: string; item_name: string; quantity: string; unit: string; unit_cost: string; }

export function RecipesPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', servings: '1', preparation_cost: '0', notes: '' });
  const [lines, setLines] = useState<IngredientLine[]>([]);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: recData }, { data: itemData }] = await Promise.all([
      supabase.from('recipes').select('*, ingredients:recipe_ingredients(*)').eq('restaurant_id', rid).order('name'),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
    ]);
    setRecipes((recData as Recipe[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const addLine = () => setLines([...lines, { item_id: '', item_name: '', quantity: '', unit: '', unit_cost: '' }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'item_id') { const item = items.find((i) => i.id === value); if (item) { next[idx].item_name = item.name; next[idx].unit = item.unit?.symbol || ''; next[idx].unit_cost = String(item.purchase_price); } }
    setLines(next);
  };

  const ingredientCost = (l: IngredientLine) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0);
  const totalIngredientCost = lines.reduce((s, l) => s + ingredientCost(l), 0);
  const totalCost = totalIngredientCost + (parseFloat(form.preparation_cost) || 0);

  const handleSave = async () => {
    if (!restaurant || !restaurantUser) return;
    if (!form.name) { toast('Recipe name is required', 'error'); return; }
    if (lines.length === 0) { toast('Add at least one ingredient', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;

    const { data: recipe, error } = await supabase.from('recipes').insert({
      restaurant_id: rid, name: form.name, preparation_cost: parseFloat(form.preparation_cost) || 0,
      total_cost: totalCost, servings: parseInt(form.servings) || 1, notes: form.notes || null,
    }).select().single();

    if (error) { setSaving(false); toast('Unable to create recipe.', 'error'); return; }

    for (const l of lines) {
      await supabase.from('recipe_ingredients').insert({
        recipe_id: recipe.id, restaurant_id: rid, item_id: l.item_id || null,
        item_name: l.item_name, quantity: parseFloat(l.quantity), unit: l.unit,
        unit_cost: parseFloat(l.unit_cost), total_cost: ingredientCost(l),
      });
    }

    setSaving(false);
    toast('Recipe created successfully.', 'success');
    setShowModal(false);
    setForm({ name: '', servings: '1', preparation_cost: '0', notes: '' });
    setLines([]);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('recipes').delete().eq('id', deleteTarget.id);
    if (error) { toast('Unable to delete.', 'error'); return; }
    toast('Recipe deleted successfully.', 'success');
    loadData();
  };

  const columns: Column<Recipe>[] = [
    { key: 'name', header: 'Recipe Name', sortable: true, render: (r) => <button onClick={() => setViewRecipe(r)} className="font-semibold text-blue-600 hover:underline">{r.name}</button> },
    { key: 'servings', header: 'Servings', hideOnMobile: true, render: (r) => r.servings },
    { key: 'total_cost', header: 'Total Cost', sortable: true, render: (r) => <span className="font-semibold">{formatCurrency(r.total_cost)}</span> },
    { key: 'preparation_cost', header: 'Prep Cost', hideOnMobile: true, render: (r) => formatCurrency(r.preparation_cost) },
    { key: 'actions', header: '', render: (r) => <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button> },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Recipes" description={`${recipes.length} recipes`} action={<Button onClick={() => { setShowModal(true); setLines([]); }}><Plus className="h-4 w-4" /> New Recipe</Button>} />
      <Card className="p-5">
        <DataTable columns={columns} data={recipes} loading={loading} searchPlaceholder="Search recipes..." initialSort={{ key: 'name', direction: 'asc' }} />
      </Card>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Recipe" size="xl" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Create Recipe</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Recipe Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Butter Chicken" />
            <Input label="Servings" type="number" value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} />
            <Input label="Preparation Cost" type="number" value={form.preparation_cost} onChange={(e) => setForm({ ...form, preparation_cost: e.target.value })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold text-slate-900">Ingredients</h4><Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add Ingredient</Button></div>
            {lines.length === 0 ? <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">No ingredients added.</div> : (
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-2"><label className="text-xs text-slate-500 font-medium">Ingredient</label><select value={l.item_id} onChange={(e) => updateLine(idx, 'item_id', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm"><option value="">Select or type</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                    <div><label className="text-xs text-slate-500 font-medium">Qty</label><input type="number" value={l.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Unit</label><input value={l.unit} onChange={(e) => updateLine(idx, 'unit', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Cost</label><div className="px-2.5 py-2 text-sm font-semibold">{formatCurrency(ingredientCost(l))}</div></div>
                    <button onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="flex justify-end"><div className="text-right"><p className="text-xs text-slate-400">Total Recipe Cost</p><p className="text-lg font-bold">{formatCurrency(totalCost)}</p></div></div>
              </div>
            )}
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional" />
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewRecipe} onClose={() => setViewRecipe(null)} title={viewRecipe?.name || ''} size="lg">
        {viewRecipe && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-xs text-slate-400">Servings</p><p className="text-sm font-semibold">{viewRecipe.servings}</p></div>
              <div><p className="text-xs text-slate-400">Prep Cost</p><p className="text-sm font-semibold">{formatCurrency(viewRecipe.preparation_cost)}</p></div>
              <div><p className="text-xs text-slate-400">Total Cost</p><p className="text-sm font-bold text-blue-600">{formatCurrency(viewRecipe.total_cost)}</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-slate-100"><th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-400">Ingredient</th><th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-400">Qty</th><th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-400">Cost</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {(viewRecipe.ingredients || []).map((i) => <tr key={i.id}><td className="px-2 py-2.5 text-sm">{i.item_name}</td><td className="px-2 py-2.5 text-sm">{i.quantity} {i.unit}</td><td className="px-2 py-2.5 text-sm font-semibold">{formatCurrency(i.total_cost)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Recipe" message={`Delete "${deleteTarget?.name}"?`} confirmText="Delete" />
    </div>
  );
}
