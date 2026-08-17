import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import type { InventoryItem, StockAdjustment } from '@/lib/types';

interface AdjLine { item_id: string; item_name: string; system_qty: string; physical_qty: string; unit: string; rate: string; reason: string; }

export function StockAdjustmentPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ adjustment_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
  const [lines, setLines] = useState<AdjLine[]>([]);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: adjData }, { data: itemData }] = await Promise.all([
      supabase.from('stock_adjustments').select('*').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
    ]);
    setAdjustments((adjData as StockAdjustment[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const addLine = () => setLines([...lines, { item_id: '', item_name: '', system_qty: '', physical_qty: '', unit: '', rate: '', reason: '' }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof AdjLine, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'item_id') {
      const item = items.find((i) => i.id === value);
      if (item) { next[idx].item_name = item.name; next[idx].system_qty = String(item.current_stock); next[idx].unit = item.unit?.symbol || ''; next[idx].rate = String(item.purchase_price); }
    }
    setLines(next);
  };

  const variance = (l: AdjLine) => (parseFloat(l.physical_qty) || 0) - (parseFloat(l.system_qty) || 0);
  const lineTotal = (l: AdjLine) => Math.abs(variance(l)) * (parseFloat(l.rate) || 0);
  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const handleSave = async () => {
    if (!restaurant || !restaurantUser) return;
    if (!form.reason) { toast('Reason is required', 'error'); return; }
    if (lines.length === 0 || lines.some((l) => !l.item_id || !l.physical_qty)) { toast('Add at least one valid item', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;
    const count = adjustments.length + 1;
    const adjustmentNumber = `ADJ-${String(count).padStart(4, '0')}`;

    const { data: adj, error } = await supabase.from('stock_adjustments').insert({
      restaurant_id: rid, adjustment_number: adjustmentNumber,
      adjustment_date: form.adjustment_date, reason: form.reason, notes: form.notes || null,
      total_value: grandTotal, adjusted_by: restaurantUser.auth_user_id, adjusted_by_name: restaurantUser.full_name,
    }).select().single();

    if (error) { setSaving(false); toast('Unable to save.', 'error'); return; }

    for (const l of lines) {
      const item = items.find((i) => i.id === l.item_id);
      if (!item) continue;
      const v = variance(l);
      await supabase.from('stock_adjustment_items').insert({
        stock_adjustment_id: adj.id, restaurant_id: rid, item_id: l.item_id,
        item_name: l.item_name, system_quantity: parseFloat(l.system_qty),
        physical_quantity: parseFloat(l.physical_qty), variance: v, unit: l.unit,
        rate: parseFloat(l.rate), total: lineTotal(l), reason: l.reason || form.reason,
      });
      const newStock = item.current_stock + v;
      await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', l.item_id);
      await supabase.from('stock_transactions').insert({
        restaurant_id: rid, item_id: l.item_id, transaction_type: v >= 0 ? 'adjustment_in' : 'adjustment_out',
        quantity_change: v, quantity_after: newStock, reference_type: 'stock_adjustment', reference_id: adj.id,
        unit_cost: parseFloat(l.rate), reason: l.reason || form.reason,
        performed_by: restaurantUser.auth_user_id, performed_by_name: restaurantUser.full_name,
      });
    }

    await supabase.from('activity_logs').insert({
      restaurant_id: rid, user_id: restaurantUser.auth_user_id, user_name: restaurantUser.full_name,
      module: 'stock_adjustment', action: 'adjust', description: `Adjusted stock via ${adjustmentNumber}`,
      ip_address: '103.21.45.67',
    });

    setSaving(false);
    toast(`${adjustmentNumber} applied successfully.`, 'success');
    setShowModal(false);
    setShowConfirm(false);
    setForm({ adjustment_date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
    setLines([]);
    loadData();
  };

  const columns: Column<StockAdjustment>[] = [
    { key: 'adjustment_number', header: 'Adj No.', sortable: true, render: (a) => <span className="font-semibold">{a.adjustment_number}</span> },
    { key: 'adjustment_date', header: 'Date', sortable: true, hideOnMobile: true, render: (a) => formatDate(a.adjustment_date) },
    { key: 'reason', header: 'Reason', render: (a) => a.reason },
    { key: 'total_value', header: 'Value', sortable: true, render: (a) => formatCurrency(a.total_value) },
    { key: 'adjusted_by_name', header: 'Adjusted By', hideOnMobile: true, render: (a) => a.adjusted_by_name || '—' },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Stock Adjustment" description="Adjust stock with audit trail" action={<Button onClick={() => { setShowModal(true); setLines([]); }}><Plus className="h-4 w-4" /> New Adjustment</Button>} />
      <Card className="p-5">
        <DataTable columns={columns} data={adjustments} loading={loading} searchPlaceholder="Search adjustments..." initialSort={{ key: 'adjustment_date', direction: 'desc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Stock Adjustment" size="xl" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={() => setShowConfirm(true)} disabled={lines.length === 0}>Review & Confirm</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Date" type="date" value={form.adjustment_date} onChange={(e) => setForm({ ...form, adjustment_date: e.target.value })} />
            <Input label="Reason *" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Stock count correction" />
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
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
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-2">
                      <label className="text-xs text-slate-500 font-medium">Item</label>
                      <select value={l.item_id} onChange={(e) => updateLine(idx, 'item_id', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm">
                        <option value="">Select</option>
                        {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-500 font-medium">System</label><input value={l.system_qty} readOnly className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-100 text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Physical</label><input type="number" value={l.physical_qty} onChange={(e) => updateLine(idx, 'physical_qty', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Variance</label><div className={`px-2.5 py-2 text-sm font-semibold ${variance(l) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{variance(l) >= 0 ? '+' : ''}{formatNumber(variance(l))}</div></div>
                    <div><label className="text-xs text-slate-500 font-medium">Value</label><div className="px-2.5 py-2 text-sm font-semibold">{formatCurrency(lineTotal(l))}</div></div>
                    <button onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="flex justify-end"><div className="text-right"><p className="text-xs text-slate-400">Total Adjustment Value</p><p className="text-lg font-bold">{formatCurrency(grandTotal)}</p></div></div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleSave} title="Confirm Adjustment" message={`This will adjust stock for ${lines.length} item(s). Total value: ${formatCurrency(grandTotal)}. This action is recorded in the audit trail.`} confirmText="Confirm & Apply" variant="warning" />
    </div>
  );
}
