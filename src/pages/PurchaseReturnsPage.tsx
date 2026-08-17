import { useEffect, useState, useCallback } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Select, Input, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseReturn, Supplier, InventoryItem } from '@/lib/types';

export function PurchaseReturnsPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', return_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
  const [lines, setLines] = useState<{ item_id: string; item_name: string; quantity: string; unit: string; rate: string }[]>([]);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: retData }, { data: supData }, { data: itemData }] = await Promise.all([
      supabase.from('purchase_returns').select('*, supplier:suppliers(*)').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('restaurant_id', rid).order('name'),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
    ]);
    setReturns((retData as PurchaseReturn[]) || []);
    setSuppliers((supData as Supplier[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const addLine = () => setLines([...lines, { item_id: '', item_name: '', quantity: '', unit: '', rate: '' }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'item_id') {
      const item = items.find((i) => i.id === value);
      if (item) { next[idx].item_name = item.name; next[idx].unit = item.unit?.symbol || ''; next[idx].rate = String(item.purchase_price); }
    }
    setLines(next);
  };

  const grandTotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0), 0);

  const handleSave = async () => {
    if (!restaurant || !restaurantUser) return;
    if (!form.supplier_id) { toast('Select a supplier', 'error'); return; }
    if (lines.length === 0) { toast('Add at least one item', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;
    const count = returns.length + 1;
    const returnNumber = `RET-${String(count).padStart(4, '0')}`;

    const { data: ret, error } = await supabase.from('purchase_returns').insert({
      restaurant_id: rid, return_number: returnNumber, supplier_id: form.supplier_id,
      return_date: form.return_date, reason: form.reason || null, status: 'pending',
      total_amount: grandTotal, notes: form.notes || null,
      created_by: restaurantUser.auth_user_id, created_by_name: restaurantUser.full_name,
    }).select().single();

    if (error) { setSaving(false); toast('Unable to create return.', 'error'); return; }

    for (const l of lines) {
      await supabase.from('purchase_return_items').insert({
        purchase_return_id: ret.id, restaurant_id: rid, item_id: l.item_id,
        item_name: l.item_name, quantity: parseFloat(l.quantity), unit: l.unit,
        rate: parseFloat(l.rate), total: (parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0),
        reason: form.reason,
      });
    }

    setSaving(false);
    toast(`${returnNumber} created successfully.`, 'success');
    setShowModal(false);
    setForm({ supplier_id: '', return_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
    setLines([]);
    loadData();
  };

  const columns: Column<PurchaseReturn>[] = [
    { key: 'return_number', header: 'Return No.', sortable: true, render: (r) => <span className="font-semibold">{r.return_number}</span> },
    { key: 'supplier', header: 'Supplier', sortable: true, render: (r) => r.supplier?.name || '—' },
    { key: 'return_date', header: 'Date', sortable: true, hideOnMobile: true, render: (r) => formatDate(r.return_date) },
    { key: 'reason', header: 'Reason', hideOnMobile: true, render: (r) => r.reason || '—' },
    { key: 'total_amount', header: 'Amount', sortable: true, render: (r) => formatCurrency(r.total_amount) },
    { key: 'status', header: 'Status', render: (r) => { const s = statusBadge(r.status); return <Badge variant={s.variant}>{s.label}</Badge>; } },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Purchase Returns" description={`${returns.length} returns`} action={<Button onClick={() => { setShowModal(true); setLines([]); }}><Plus className="h-4 w-4" /> New Return</Button>} />
      <Card className="p-5">
        <DataTable columns={columns} data={returns} loading={loading} searchPlaceholder="Search returns..." initialSort={{ key: 'return_date', direction: 'desc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Purchase Return" size="lg" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Create Return</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Supplier *" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">Select</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="Return Date" type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} />
            <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Damaged goods" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold text-slate-900">Items</h4><Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add</Button></div>
            {lines.length === 0 ? <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">No items added.</div> : (
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-2"><label className="text-xs text-slate-500 font-medium">Item</label><select value={l.item_id} onChange={(e) => updateLine(idx, 'item_id', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm"><option value="">Select</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                    <div><label className="text-xs text-slate-500 font-medium">Qty</label><input type="number" value={l.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Rate</label><input type="number" value={l.rate} onChange={(e) => updateLine(idx, 'rate', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <button onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Undo2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="flex justify-end"><div className="text-right"><p className="text-xs text-slate-400">Total</p><p className="text-lg font-bold">{formatCurrency(grandTotal)}</p></div></div>
              </div>
            )}
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
