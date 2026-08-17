import { useEffect, useState, useCallback } from 'react';
import { Plus, ShoppingCart, Check, X, Truck, Printer, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Select, Input, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { formatCurrency, formatDate, printContent } from '@/lib/utils';
import type { PurchaseOrder, Supplier, InventoryItem, PurchaseOrderItem } from '@/lib/types';

interface POLine { item_id: string; item_name: string; quantity: string; unit: string; rate: string; tax: string; }

const statusFilters = ['all', 'draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'];

export function PurchaseOrdersPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', order_date: new Date().toISOString().slice(0, 10), expected_delivery: '', notes: '' });
  const [lines, setLines] = useState<POLine[]>([]);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: poData }, { data: supData }, { data: itemData }] = await Promise.all([
      supabase.from('purchase_orders').select('*, supplier:suppliers(*), items:purchase_order_items(*)').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('restaurant_id', rid).order('name'),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
    ]);
    setOrders((poData as PurchaseOrder[]) || []);
    setSuppliers((supData as Supplier[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filterStatus === 'all' ? orders : orders.filter((o) => o.status === filterStatus);

  const addLine = () => setLines([...lines, { item_id: '', item_name: '', quantity: '', unit: '', rate: '', tax: '0' }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof POLine, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'item_id') {
      const item = items.find((i) => i.id === value);
      if (item) { next[idx].item_name = item.name; next[idx].unit = item.unit?.symbol || ''; next[idx].rate = String(item.purchase_price); }
    }
    setLines(next);
  };

  const lineTotal = (l: POLine) => (parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0) * (1 + (parseFloat(l.tax) || 0) / 100);
  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const handleSave = async () => {
    if (!restaurant || !restaurantUser) return;
    if (!form.supplier_id) { toast('Select a supplier', 'error'); return; }
    if (lines.length === 0 || lines.some((l) => !l.item_id || !l.quantity)) { toast('Add valid items', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;
    const count = orders.length + 1;
    const poNumber = `PO-${1024 + count}`;

    const { data: po, error } = await supabase.from('purchase_orders').insert({
      restaurant_id: rid, po_number: poNumber, supplier_id: form.supplier_id,
      order_date: form.order_date, expected_delivery: form.expected_delivery || null,
      subtotal: grandTotal, tax_amount: 0, discount_amount: 0, total_amount: grandTotal,
      status: 'pending', notes: form.notes || null,
      created_by: restaurantUser.auth_user_id, created_by_name: restaurantUser.full_name,
    }).select().single();

    if (error) { setSaving(false); toast('Unable to create PO.', 'error'); return; }

    for (const l of lines) {
      await supabase.from('purchase_order_items').insert({
        purchase_order_id: po.id, restaurant_id: rid, item_id: l.item_id,
        item_name: l.item_name, quantity: parseFloat(l.quantity), received_quantity: 0,
        unit: l.unit, rate: parseFloat(l.rate), tax_percent: parseFloat(l.tax),
        discount_amount: 0, total: lineTotal(l),
      });
    }

    await supabase.from('activity_logs').insert({
      restaurant_id: rid, user_id: restaurantUser.auth_user_id, user_name: restaurantUser.full_name,
      module: 'purchase_order', action: 'create', description: `Created ${poNumber} (${formatCurrency(grandTotal)})`,
      ip_address: '103.21.45.67',
    });

    setSaving(false);
    toast(`${poNumber} created successfully.`, 'success');
    setShowModal(false);
    setForm({ supplier_id: '', order_date: new Date().toISOString().slice(0, 10), expected_delivery: '', notes: '' });
    setLines([]);
    loadData();
  };

  const updateStatus = async (po: PurchaseOrder, status: string) => {
    const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', po.id);
    if (error) { toast('Unable to update status.', 'error'); return; }
    toast(`PO ${po.po_number} marked as ${status}.`, 'success');
    loadData();
  };

  const handlePrint = (po: PurchaseOrder) => {
    printContent(`Purchase Order ${po.po_number}`, `
      <div class="header">
        <div><h1>Purchase Order</h1><p>${po.po_number}</p></div>
        <div class="meta"><p><strong>Date:</strong> ${formatDate(po.order_date)}</p><p><strong>Expected:</strong> ${po.expected_delivery ? formatDate(po.expected_delivery) : '—'}</p></div>
      </div>
      <h2>Items</h2>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Total</th></tr></thead><tbody>
      ${(po.items || []).map((i: PurchaseOrderItem) => `<tr><td>${i.item_name}</td><td>${i.quantity}</td><td>${i.unit}</td><td>${formatCurrency(i.rate)}</td><td>${formatCurrency(i.total)}</td></tr>`).join('')}
      </tbody></table>
      <p class="total">Grand Total: ${formatCurrency(po.total_amount)}</p>
    `);
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: 'po_number', header: 'PO No.', sortable: true, render: (p) => <button onClick={() => setViewOrder(p)} className="font-semibold text-blue-600 hover:underline">{p.po_number}</button> },
    { key: 'supplier', header: 'Supplier', sortable: true, render: (p) => p.supplier?.name || '—' },
    { key: 'order_date', header: 'Date', sortable: true, hideOnMobile: true, render: (p) => formatDate(p.order_date) },
    { key: 'total_amount', header: 'Total', sortable: true, render: (p) => formatCurrency(p.total_amount) },
    { key: 'status', header: 'Status', render: (p) => { const s = statusBadge(p.status === 'cancelled' ? 'cancelled_po' : p.status); return <Badge variant={s.variant}>{s.label}</Badge>; } },
    { key: 'actions', header: '', render: (p) => (
      <div className="flex gap-1">
        {p.status === 'pending' && <button onClick={() => updateStatus(p, 'approved')} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50" title="Approve"><Check className="h-4 w-4" /></button>}
        {p.status === 'pending' && <button onClick={() => updateStatus(p, 'cancelled')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Reject"><X className="h-4 w-4" /></button>}
        {p.status === 'approved' && <button onClick={() => updateStatus(p, 'ordered')} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="Mark Ordered"><Truck className="h-4 w-4" /></button>}
        <button onClick={() => handlePrint(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" title="Print"><Printer className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Purchase Orders" description={`${orders.length} orders`} action={<Button onClick={() => { setShowModal(true); setLines([]); }}><Plus className="h-4 w-4" /> New PO</Button>} />

      <div className="flex flex-wrap gap-2 mb-4">
        {statusFilters.map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <DataTable columns={columns} data={filtered} loading={loading} searchPlaceholder="Search POs..." initialSort={{ key: 'order_date', direction: 'desc' }} />
      </Card>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Purchase Order" size="xl" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Create PO</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Supplier *" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="Order Date" type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
            <Input label="Expected Delivery" type="date" value={form.expected_delivery} onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })} />
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
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="col-span-2">
                      <label className="text-xs text-slate-500 font-medium">Item</label>
                      <select value={l.item_id} onChange={(e) => updateLine(idx, 'item_id', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm">
                        <option value="">Select</option>
                        {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-500 font-medium">Qty</label><input type="number" value={l.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Rate</label><input type="number" value={l.rate} onChange={(e) => updateLine(idx, 'rate', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div><label className="text-xs text-slate-500 font-medium">Tax %</label><input type="number" value={l.tax} onChange={(e) => updateLine(idx, 'tax', e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm" /></div>
                    <div className="flex items-end gap-1"><div className="flex-1"><label className="text-xs text-slate-500 font-medium">Total</label><div className="px-2.5 py-2 text-sm font-semibold">{formatCurrency(lineTotal(l))}</div></div><button onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><X className="h-4 w-4" /></button></div>
                  </div>
                ))}
                <div className="flex justify-end"><div className="text-right"><p className="text-xs text-slate-400">Grand Total</p><p className="text-lg font-bold">{formatCurrency(grandTotal)}</p></div></div>
              </div>
            )}
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={viewOrder?.po_number || ''} size="lg" footer={<Button variant="outline" onClick={() => handlePrint(viewOrder!)}><Printer className="h-4 w-4" /> Print</Button>}>
        {viewOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400">Supplier</p><p className="text-sm font-semibold">{viewOrder.supplier?.name}</p></div>
              <div><p className="text-xs text-slate-400">Date</p><p className="text-sm font-semibold">{formatDate(viewOrder.order_date)}</p></div>
              <div><p className="text-xs text-slate-400">Expected Delivery</p><p className="text-sm font-semibold">{viewOrder.expected_delivery ? formatDate(viewOrder.expected_delivery) : '—'}</p></div>
              <div><p className="text-xs text-slate-400">Status</p><Badge variant={statusBadge(viewOrder.status).variant}>{statusBadge(viewOrder.status).label}</Badge></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-slate-100"><th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-400">Item</th><th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-400">Qty</th><th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-400">Rate</th><th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-400">Total</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {(viewOrder.items || []).map((i) => <tr key={i.id}><td className="px-2 py-2.5 text-sm">{i.item_name}</td><td className="px-2 py-2.5 text-sm">{i.quantity} {i.unit}</td><td className="px-2 py-2.5 text-sm">{formatCurrency(i.rate)}</td><td className="px-2 py-2.5 text-sm font-semibold">{formatCurrency(i.total)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end"><div className="text-right"><p className="text-xs text-slate-400">Grand Total</p><p className="text-xl font-bold">{formatCurrency(viewOrder.total_amount)}</p></div></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
