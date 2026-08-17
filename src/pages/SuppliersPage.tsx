import { useEffect, useState, useCallback } from 'react';
import { Plus, Truck, Pencil, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Textarea, Badge, Skeleton } from '@/components/ui';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency } from '@/lib/utils';
import type { Supplier } from '@/lib/types';

export function SuppliersPage() {
  const { restaurant } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', gst_number: '', address: '', city: '', state: '', postal_code: '', payment_terms: 'Net 30' });

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const { data } = await supabase.from('suppliers').select('*').eq('restaurant_id', restaurant.id).order('name');
    setSuppliers((data as Supplier[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setEditing(null); setForm({ name: '', contact_person: '', phone: '', email: '', gst_number: '', address: '', city: '', state: '', postal_code: '', payment_terms: 'Net 30' }); setShowModal(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', gst_number: s.gst_number || '', address: s.address || '', city: s.city || '', state: s.state || '', postal_code: s.postal_code || '', payment_terms: s.payment_terms }); setShowModal(true); };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!form.name) { toast('Supplier name is required', 'error'); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('suppliers').update(form).eq('id', editing.id);
      if (error) { setSaving(false); toast('Unable to update.', 'error'); return; }
      toast('Supplier updated successfully.', 'success');
    } else {
      const { error } = await supabase.from('suppliers').insert({ ...form, restaurant_id: restaurant.id, outstanding_amount: 0, status: 'active' });
      if (error) { setSaving(false); toast('Unable to add supplier.', 'error'); return; }
      toast('Supplier added successfully.', 'success');
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', deleteTarget.id);
    if (error) { toast('Unable to delete supplier.', 'error'); return; }
    toast('Supplier deleted successfully.', 'success');
    loadData();
  };

  if (loading) {
    return <div className="animate-page"><PageHeader title="Suppliers" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div></div>;
  }

  return (
    <div className="animate-page">
      <PageHeader title="Suppliers" description={`${suppliers.length} suppliers`} action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Supplier</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <Card key={s.id} className="p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="font-bold text-slate-900">{s.name}</p>
            {s.contact_person && <p className="text-xs text-slate-400 mt-0.5">{s.contact_person}</p>}
            <div className="space-y-1 mt-3 pt-3 border-t border-slate-50">
              {s.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="h-3 w-3" /> {s.phone}</div>}
              {s.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail className="h-3 w-3" /> {s.email}</div>}
              {s.city && <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {s.city}, {s.state}</div>}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
              <Badge variant="info">{s.payment_terms}</Badge>
              {s.outstanding_amount > 0 && <span className="text-xs font-semibold text-red-600">Outstanding: {formatCurrency(s.outstanding_amount)}</span>}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'} size="lg" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Add'}</Button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Supplier Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. FreshFarm Suppliers" />
          <Input label="Contact Person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
          <Input label="Payment Terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="Net 30" />
          <div className="sm:col-span-2"><Textarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input label="Postal Code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Supplier" message={`Delete "${deleteTarget?.name}"?`} confirmText="Delete" />
    </div>
  );
}
