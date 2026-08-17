import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2, MapPin, Phone, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Badge, Skeleton } from '@/components/ui';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import type { Branch } from '@/lib/types';

export function BranchesPage() {
  const { restaurant } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', state: '', postal_code: '', phone: '', manager_name: '' });

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const { data } = await supabase.from('branches').select('*').eq('restaurant_id', restaurant.id).order('name');
    setBranches((data as Branch[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setEditing(null); setForm({ name: '', code: '', address: '', city: '', state: '', postal_code: '', phone: '', manager_name: '' }); setShowModal(true); };
  const openEdit = (b: Branch) => { setEditing(b); setForm({ name: b.name, code: b.code || '', address: b.address || '', city: b.city || '', state: b.state || '', postal_code: b.postal_code || '', phone: b.phone || '', manager_name: b.manager_name || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!form.name) { toast('Branch name is required', 'error'); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('branches').update(form).eq('id', editing.id);
      if (error) { setSaving(false); toast('Unable to update.', 'error'); return; }
      toast('Branch updated successfully.', 'success');
    } else {
      const { error } = await supabase.from('branches').insert({ ...form, restaurant_id: restaurant.id, status: 'active' });
      if (error) { setSaving(false); toast('Unable to add branch.', 'error'); return; }
      toast('Branch added successfully.', 'success');
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('branches').delete().eq('id', deleteTarget.id);
    if (error) { toast('Unable to delete branch.', 'error'); return; }
    toast('Branch deleted successfully.', 'success');
    loadData();
  };

  if (loading) return <div className="animate-page"><PageHeader title="Branches" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div></div>;

  return (
    <div className="animate-page">
      <PageHeader title="Branches" description={`${branches.length} branches`} action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Branch</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => (
          <Card key={b.id} className="p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><Building2 className="h-5 w-5 text-blue-600" /></div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="font-bold text-slate-900">{b.name}</p>
            {b.code && <Badge variant="info" className="mt-1">{b.code}</Badge>}
            <div className="space-y-1 mt-3 pt-3 border-t border-slate-50">
              {b.manager_name && <p className="text-xs text-slate-500">Manager: {b.manager_name}</p>}
              {b.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="h-3 w-3" /> {b.phone}</div>}
              {b.city && <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {b.city}, {b.state}</div>}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50"><Badge variant={statusBadge(b.status).variant}>{statusBadge(b.status).label}</Badge></div>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Branch' : 'Add Branch'} size="lg" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Add'}</Button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Branch Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Indiranagar Branch" />
          <Input label="Branch Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. IN-02" />
          <Input label="Manager Name" value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input label="Postal Code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Branch" message={`Delete "${deleteTarget?.name}"?`} confirmText="Delete" />
    </div>
  );
}
