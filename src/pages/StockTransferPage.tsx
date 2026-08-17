import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Select, Input, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { formatDate } from '@/lib/utils';
import type { InventoryItem, Branch, StockTransfer } from '@/lib/types';

interface TransferLine { item_id: string; item_name: string; quantity: string; unit: string; }

export function StockTransferPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ from_branch_id: '', to_branch_id: '', transfer_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
  const [lines, setLines] = useState<TransferLine[]>([]);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: trData }, { data: itemData }, { data: brData }] = await Promise.all([
      supabase.from('stock_transfers').select('*, from_branch:branches!from_branch_id(*), to_branch:branches!to_branch_id(*)').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
      supabase.from('branches').select('*').eq('restaurant_id', rid).order('name'),
    ]);
    setTransfers((trData as StockTransfer[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setBranches((brData as Branch[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const addLine = () => setLines([...lines, { item_id: '', item_name: '', quantity: '', unit: '' }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof TransferLine, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'item_id') {
      const item = items.find((i) => i.id === value);
      if (item) { next[idx].item_name = item.name; next[idx].unit = item.unit?.symbol || ''; }
    }
    setLines(next);
  };

  const handleSave = async () => {
    if (!restaurant || !restaurantUser) return;
    if (!form.from_branch_id || !form.to_branch_id) { toast('Select both locations', 'error'); return; }
    if (form.from_branch_id === form.to_branch_id) { toast('From and To must be different', 'error'); return; }
    if (lines.length === 0 || lines.some((l) => !l.item_id || !l.quantity)) { toast('Add at least one valid item', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;
    const count = transfers.length + 1;
    const transferNumber = `TRF-${String(count).padStart(4, '0')}`;

    const { data: transfer, error } = await supabase.from('stock_transfers').insert({
      restaurant_id: rid, transfer_number: transferNumber,
      from_branch_id: form.from_branch_id, to_branch_id: form.to_branch_id,
      transfer_date: form.transfer_date, reason: form.reason || null, notes: form.notes || null,
      status: 'pending', created_by: restaurantUser.auth_user_id, created_by_name: restaurantUser.full_name,
    }).select().single();

    if (error) { setSaving(false); toast('Unable to save.', 'error'); return; }

    for (const l of lines) {
      await supabase.from('stock_transfer_items').insert({
        stock_transfer_id: transfer.id, restaurant_id: rid, item_id: l.item_id,
        item_name: l.item_name, quantity: parseFloat(l.quantity), unit: l.unit,
      });
    }

    await supabase.from('activity_logs').insert({
      restaurant_id: rid, user_id: restaurantUser.auth_user_id, user_name: restaurantUser.full_name,
      module: 'stock_transfer', action: 'create', description: `Created transfer ${transferNumber}`,
      ip_address: '103.21.45.67',
    });

    setSaving(false);
    toast(`${transferNumber} created successfully.`, 'success');
    setShowModal(false);
    setForm({ from_branch_id: '', to_branch_id: '', transfer_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
    setLines([]);
    loadData();
  };

  const columns: Column<StockTransfer>[] = [
    { key: 'transfer_number', header: 'Transfer No.', sortable: true, render: (t) => <span className="font-semibold">{t.transfer_number}</span> },
    { key: 'from_branch', header: 'From', render: (t) => t.from_branch?.name || '—' },
    { key: 'to_branch', header: 'To', render: (t) => t.to_branch?.name || '—' },
    { key: 'transfer_date', header: 'Date', sortable: true, hideOnMobile: true, render: (t) => formatDate(t.transfer_date) },
    { key: 'status', header: 'Status', render: (t) => { const s = statusBadge(t.status); return <Badge variant={s.variant}>{s.label}</Badge>; } },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Stock Transfer" description="Transfer stock between locations" action={<Button onClick={() => { setShowModal(true); setLines([]); }}><Plus className="h-4 w-4" /> New Transfer</Button>} />
      <Card className="p-5">
        <DataTable columns={columns} data={transfers} loading={loading} searchPlaceholder="Search transfers..." initialSort={{ key: 'transfer_date', direction: 'desc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Stock Transfer" size="lg" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Save Transfer</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="From Location *" value={form.from_branch_id} onChange={(e) => setForm({ ...form, from_branch_id: e.target.value })}>
              <option value="">Select source</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select label="To Location *" value={form.to_branch_id} onChange={(e) => setForm({ ...form, to_branch_id: e.target.value })}>
              <option value="">Select destination</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Input label="Transfer Date" type="date" value={form.transfer_date} onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} />
            <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Stock rebalance" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900">Items</h4>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add Item</Button>
            </div>
            {lines.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">No items added.</div>
            ) : (
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-2">
                      <label className="text-xs text-slate-500 font-medium">Item</label>
                      <select value={l.item_id} onChange={(e) => updateLine(idx, 'item_id', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm">
                        <option value="">Select</option>
                        {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-500 font-medium">Qty</label><input type="number" value={l.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Unit</label><input value={l.unit} readOnly className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-100 text-sm" /></div>
                    <button onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
        </div>
      </Modal>
    </div>
  );
}
