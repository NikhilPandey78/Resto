import { useEffect, useState, useCallback } from 'react';
import { Plus, ChefHat, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Select, Input, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { formatDate } from '@/lib/utils';
import type { KitchenRequisition, InventoryItem } from '@/lib/types';

const priorities = ['low', 'normal', 'high', 'urgent'];

export function KitchenRequisitionsPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [requisitions, setRequisitions] = useState<KitchenRequisition[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ department: 'Kitchen', required_date: new Date().toISOString().slice(0, 10), priority: 'normal', notes: '' });
  const [lines, setLines] = useState<{ item_id: string; item_name: string; quantity: string; unit: string }[]>([]);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: reqData }, { data: itemData }] = await Promise.all([
      supabase.from('kitchen_requisitions').select('*').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
    ]);
    setRequisitions((reqData as KitchenRequisition[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filterStatus === 'all' ? requisitions : requisitions.filter((r) => r.status === filterStatus);

  const addLine = () => setLines([...lines, { item_id: '', item_name: '', quantity: '', unit: '' }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'item_id') { const item = items.find((i) => i.id === value); if (item) { next[idx].item_name = item.name; next[idx].unit = item.unit?.symbol || ''; } }
    setLines(next);
  };

  const handleSave = async () => {
    if (!restaurant || !restaurantUser) return;
    if (lines.length === 0) { toast('Add at least one item', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;
    const count = requisitions.length + 1;
    const reqNumber = `REQ-${String(count).padStart(4, '0')}`;

    const { data: req, error } = await supabase.from('kitchen_requisitions').insert({
      restaurant_id: rid, requisition_number: reqNumber, department: form.department,
      required_date: form.required_date, priority: form.priority, notes: form.notes || null,
      status: 'pending', requested_by: restaurantUser.auth_user_id, requested_by_name: restaurantUser.full_name,
    }).select().single();

    if (error) { setSaving(false); toast('Unable to create request.', 'error'); return; }

    for (const l of lines) {
      await supabase.from('kitchen_requisition_items').insert({
        kitchen_requisition_id: req.id, restaurant_id: rid, item_id: l.item_id,
        item_name: l.item_name, quantity: parseFloat(l.quantity), unit: l.unit,
      });
    }

    setSaving(false);
    toast(`${reqNumber} submitted successfully.`, 'success');
    setShowModal(false);
    setForm({ department: 'Kitchen', required_date: new Date().toISOString().slice(0, 10), priority: 'normal', notes: '' });
    setLines([]);
    loadData();
  };

  const updateStatus = async (req: KitchenRequisition, status: string) => {
    const update: Record<string, unknown> = { status };
    if (status === 'approved') { update.approved_by = restaurantUser?.auth_user_id; update.approved_by_name = restaurantUser?.full_name; }
    const { error } = await supabase.from('kitchen_requisitions').update(update).eq('id', req.id);
    if (error) { toast('Unable to update.', 'error'); return; }
    toast(`Request ${req.requisition_number} ${status}.`, 'success');
    loadData();
  };

  const columns: Column<KitchenRequisition>[] = [
    { key: 'requisition_number', header: 'Req No.', sortable: true, render: (r) => <span className="font-semibold">{r.requisition_number}</span> },
    { key: 'department', header: 'Department', sortable: true, render: (r) => <Badge variant="info">{r.department}</Badge> },
    { key: 'required_date', header: 'Required', sortable: true, hideOnMobile: true, render: (r) => formatDate(r.required_date) },
    { key: 'priority', header: 'Priority', render: (r) => <Badge variant={r.priority === 'urgent' ? 'danger' : r.priority === 'high' ? 'warning' : 'neutral'}>{r.priority}</Badge> },
    { key: 'status', header: 'Status', render: (r) => { const s = statusBadge(r.status); return <Badge variant={s.variant}>{s.label}</Badge>; } },
    { key: 'actions', header: '', render: (r) => r.status === 'pending' ? (
      <div className="flex gap-1">
        <button onClick={() => updateStatus(r, 'approved')} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
        <button onClick={() => updateStatus(r, 'rejected')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
      </div>
    ) : null },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Kitchen Requisitions" description={`${requisitions.length} requests`} action={<Button onClick={() => { setShowModal(true); setLines([]); }}><Plus className="h-4 w-4" /> New Request</Button>} />

      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'pending', 'approved', 'rejected', 'completed'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
        ))}
      </div>

      <Card className="p-5">
        <DataTable columns={columns} data={filtered} loading={loading} searchPlaceholder="Search requests..." initialSort={{ key: 'required_date', direction: 'desc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Kitchen Request" size="lg" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Submit Request</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Input label="Required Date" type="date" value={form.required_date} onChange={(e) => setForm({ ...form, required_date: e.target.value })} />
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {priorities.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold text-slate-900">Items</h4><Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add</Button></div>
            {lines.length === 0 ? <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">No items added.</div> : (
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-2"><label className="text-xs text-slate-500 font-medium">Item</label><select value={l.item_id} onChange={(e) => updateLine(idx, 'item_id', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm"><option value="">Select</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                    <div><label className="text-xs text-slate-500 font-medium">Qty</label><input type="number" value={l.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div className="flex items-end gap-1"><div className="flex-1"><label className="text-xs text-slate-500 font-medium">Unit</label><input value={l.unit} readOnly className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-100 text-sm" /></div><button onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><X className="h-4 w-4" /></button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
