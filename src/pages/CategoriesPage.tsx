import { useEffect, useState, useCallback } from 'react';
import { Plus, Tags, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Textarea, Badge, Skeleton } from '@/components/ui';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/PageHeader';
import type { Category } from '@/lib/types';

const defaultColors = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#06b6d4', '#8b5cf6', '#64748b', '#ec4899', '#f97316', '#eab308'];

export function CategoriesPage() {
  const { restaurant } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: defaultColors[0] });

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const { data: catData } = await supabase.from('categories').select('*').eq('restaurant_id', rid).order('name');
    setCategories((catData as Category[]) || []);
    const { data: itemsData } = await supabase.from('inventory_items').select('category_id').eq('restaurant_id', rid);
    const cnt: Record<string, number> = {};
    (itemsData || []).forEach((i) => { if (i.category_id) cnt[i.category_id] = (cnt[i.category_id] || 0) + 1; });
    setCounts(cnt);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', color: defaultColors[0] }); setShowModal(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setForm({ name: cat.name, description: cat.description || '', color: cat.color }); setShowModal(true); };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!form.name) { toast('Category name is required', 'error'); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('categories').update({ name: form.name, description: form.description, color: form.color }).eq('id', editing.id);
      if (error) { setSaving(false); toast('Unable to update.', 'error'); return; }
      toast('Category updated successfully.', 'success');
    } else {
      const { error } = await supabase.from('categories').insert({ restaurant_id: restaurant.id, name: form.name, description: form.description, color: form.color });
      if (error) { setSaving(false); toast('Unable to add category.', 'error'); return; }
      toast('Category added successfully.', 'success');
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id);
    if (error) { toast('Unable to delete category.', 'error'); return; }
    toast('Category deleted successfully.', 'success');
    loadData();
  };

  if (loading) {
    return <div className="animate-page"><PageHeader title="Categories" /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div></div>;
  }

  return (
    <div className="animate-page">
      <PageHeader title="Categories" description={`${categories.length} categories`} action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Category</Button>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <Card key={cat.id} className="p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: cat.color + '20' }}>
                <Tags className="h-5 w-5" style={{ color: cat.color }} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteTarget(cat)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="font-bold text-slate-900">{cat.name}</p>
            {cat.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{cat.description}</p>}
            <Badge variant="neutral" className="mt-2">{counts[cat.id] || 0} items</Badge>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'} footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Add'}</Button></>}>
        <div className="space-y-4">
          <Input label="Category Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vegetables" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional description" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Category" message={`Are you sure you want to delete "${deleteTarget?.name}"?`} confirmText="Delete" />
    </div>
  );
}
