import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ArrowDownToLine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Select, Input, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import type { InventoryItem, Supplier, StockReceipt } from '@/lib/types';

interface ReceiptLine { item_id: string; item_name: string; quantity: string; unit: string; rate: string; tax: string; batch: string; expiry: string; }

export function StockInPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', purchase_order_id: '', received_date: new Date().toISOString().slice(0, 10), invoice_number: '', notes: '' });
  const [lines, setLines] = useState<ReceiptLine[]>([]);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: recData }, { data: itemData }, { data: supData }] = await Promise.all([
      supabase.from('stock_receipts').select('*, supplier:suppliers(*)').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*').eq('restaurant_id', rid).order('name'),
      supabase.from('suppliers').select('*').eq('restaurant_id', rid).order('name'),
    ]);
    setReceipts((recData as StockReceipt[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setSuppliers((supData as Supplier[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const addLine = () => setLines([...lines, { item_id: '', item_name: '', quantity: '', unit: '', rate: '', tax: '0', batch: '', expiry: '' }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof ReceiptLine, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'item_id') {
      const item = items.find((i) => i.id === value);
      if (item) { next[idx].item_name = item.name; next[idx].unit = item.unit?.symbol || ''; next[idx].rate = String(item.purchase_price); }
    }
    setLines(next);
  };

  const lineTotal = (l: ReceiptLine) => {
    const qty = parseFloat(l.quantity) || 0;
    const rate = parseFloat(l.rate) || 0;
    const tax = parseFloat(l.tax) || 0;
    return qty * rate * (1 + tax / 100);
  };
  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const handleSave = async () => {
    if (!restaurant || !restaurantUser) return;
    if (!form.supplier_id) { toast('Please select a supplier', 'error'); return; }
    if (lines.length === 0 || lines.some((l) => !l.item_id || !l.quantity)) { toast('Add at least one valid item with quantity', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;
    const count = receipts.length + 1;
    const receiptNumber = `GRN-${String(count).padStart(4, '0')}`;

    const { data: receipt, error } = await supabase.from('stock_receipts').insert({
      restaurant_id: rid, receipt_number: receiptNumber, supplier_id: form.supplier_id,
      purchase_order_id: form.purchase_order_id || null, received_date: form.received_date,
      invoice_number: form.invoice_number || null, subtotal: grandTotal, tax_amount: 0,
      discount_amount: 0, total_amount: grandTotal, notes: form.notes || null,
      received_by: restaurantUser.auth_user_id, received_by_name: restaurantUser.full_name,
    }).select().single();

    if (error) { setSaving(false); toast('Unable to save receipt.', 'error'); return; }

    for (const l of lines) {
      const item = items.find((i) => i.id === l.item_id);
      if (!item) continue;
      await supabase.from('stock_receipt_items').insert({
        stock_receipt_id: receipt.id, restaurant_id: rid, item_id: l.item_id,
        item_name: l.item_name, quantity: parseFloat(l.quantity), unit: l.unit,
        rate: parseFloat(l.rate), tax_percent: parseFloat(l.tax), discount_amount: 0,
        total: lineTotal(l), batch_number: l.batch || null, expiry_date: l.expiry || null,
      });
      const newStock = item.current_stock + parseFloat(l.quantity);
      await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', l.item_id);
      await supabase.from('stock_transactions').insert({
        restaurant_id: rid, item_id: l.item_id, transaction_type: 'purchase',
        quantity_change: parseFloat(l.quantity), quantity_after: newStock,
        reference_type: 'stock_receipt', reference_id: receipt.id,
        batch_number: l.batch || null, expiry_date: l.expiry || null,
        unit_cost: parseFloat(l.rate), reason: 'Stock received',
        performed_by: restaurantUser.auth_user_id, performed_by_name: restaurantUser.full_name,
      });
    }

    await supabase.from('activity_logs').insert({
      restaurant_id: rid, user_id: restaurantUser.auth_user_id, user_name: restaurantUser.full_name,
      module: 'stock_in', action: 'create', description: `Received stock via ${receiptNumber} (${formatCurrency(grandTotal)})`,
      ip_address: '103.21.45.67',
    });

    setSaving(false);
    toast(`${receiptNumber} received successfully.`, 'success');
    setShowModal(false);
    setForm({ supplier_id: '', purchase_order_id: '', received_date: new Date().toISOString().slice(0, 10), invoice_number: '', notes: '' });
    setLines([]);
    loadData();
  };

  const columns: Column<StockReceipt>[] = [
    { key: 'receipt_number', header: 'GRN No.', sortable: true, render: (r) => <span className="font-semibold text-slate-900">{r.receipt_number}</span> },
    { key: 'supplier', header: 'Supplier', sortable: true, render: (r) => r.supplier?.name || '—' },
    { key: 'received_date', header: 'Date', sortable: true, hideOnMobile: true, render: (r) => formatDate(r.received_date) },
    { key: 'invoice_number', header: 'Invoice', hideOnMobile: true, render: (r) => r.invoice_number || '—' },
    { key: 'total_amount', header: 'Total', sortable: true, render: (r) => formatCurrency(r.total_amount) },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Stock In" description="Receive goods and add to inventory" action={<Button onClick={() => { setShowModal(true); setLines([]); }}><Plus className="h-4 w-4" /> New Receipt</Button>} />
      <Card className="p-5">
        <DataTable columns={columns} data={receipts} loading={loading} searchPlaceholder="Search receipts..." initialSort={{ key: 'received_date', direction: 'desc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Stock Receipt" size="xl" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Save Receipt</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Supplier *" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="Received Date" type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} />
            <Input label="Invoice Number" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="INV-001" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900">Items</h4>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add Item</Button>
            </div>
            {lines.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">No items added. Click "Add Item" to start.</div>
            ) : (
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-2 sm:col-span-2">
                      <label className="text-xs text-slate-500 font-medium">Item</label>
                      <select value={l.item_id} onChange={(e) => updateLine(idx, 'item_id', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm">
                        <option value="">Select</option>
                        {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-500 font-medium">Qty</label><input type="number" value={l.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Unit</label><input value={l.unit} readOnly className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-100 text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Rate</label><input type="number" value={l.rate} onChange={(e) => updateLine(idx, 'rate', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Batch</label><input value={l.batch} onChange={(e) => updateLine(idx, 'batch', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1"><label className="text-xs text-slate-500 font-medium">Total</label><div className="px-2.5 py-2 text-sm font-semibold text-slate-700">{formatCurrency(lineTotal(l))}</div></div>
                      <button onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Grand Total</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(grandTotal)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
        </div>
      </Modal>
    </div>
  );
}
