import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Select, Textarea, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader, StatCard } from '@/components/PageHeader';
import { BarChart } from '@/components/ui/Charts';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { WastageRecord, InventoryItem, Branch } from '@/lib/types';

const wasteReasons = ['Spoiled', 'Expired', 'Burnt', 'Overproduction', 'Damaged', 'Spillage', 'Preparation Waste'];

export function WastagePage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ item_id: '', quantity: '', reason: 'Spoiled', waste_date: new Date().toISOString().slice(0, 10), location: '', notes: '' });

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: wData }, { data: itemData }, { data: brData }] = await Promise.all([
      supabase.from('wastage_records').select('*, item:inventory_items(*)').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
      supabase.from('branches').select('*').eq('restaurant_id', rid).order('name'),
    ]);
    setRecords((wData as WastageRecord[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setBranches((brData as Branch[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalCost = records.reduce((s, r) => s + r.total_cost, 0);
  const todayRecords = records.filter((r) => r.waste_date === new Date().toISOString().slice(0, 10));
  const todayCost = todayRecords.reduce((s, r) => s + r.total_cost, 0);

  const byReason: Record<string, number> = {};
  records.forEach((r) => { byReason[r.reason] = (byReason[r.reason] || 0) + r.total_cost; });
  const chartData = wasteReasons.map((r) => byReason[r] || 0);

  const handleSave = async () => {
    if (!restaurant || !restaurantUser) return;
    if (!form.item_id || !form.quantity) { toast('Item and quantity are required', 'error'); return; }
    const item = items.find((i) => i.id === form.item_id);
    if (!item) return;
    if (parseFloat(form.quantity) > item.current_stock) { toast('Insufficient stock', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;
    const count = records.length + 1;
    const wastageNumber = `WST-${String(count).padStart(4, '0')}`;
    const qty = parseFloat(form.quantity);
    const totalCostVal = qty * item.purchase_price;
    const newStock = item.current_stock - qty;

    const { error } = await supabase.from('wastage_records').insert({
      restaurant_id: rid, wastage_number: wastageNumber, item_id: item.id, item_name: item.name,
      quantity: qty, unit: item.unit?.symbol || '', rate: item.purchase_price, total_cost: totalCostVal,
      reason: form.reason, location: form.location || null, notes: form.notes || null,
      waste_date: form.waste_date, recorded_by: restaurantUser.auth_user_id, recorded_by_name: restaurantUser.full_name,
    });

    if (error) { setSaving(false); toast('Unable to record wastage.', 'error'); return; }

    await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', item.id);
    await supabase.from('stock_transactions').insert({
      restaurant_id: rid, item_id: item.id, transaction_type: 'wastage',
      quantity_change: -qty, quantity_after: newStock, reference_type: 'wastage',
      unit_cost: item.purchase_price, reason: form.reason,
      performed_by: restaurantUser.auth_user_id, performed_by_name: restaurantUser.full_name,
    });
    await supabase.from('activity_logs').insert({
      restaurant_id: rid, user_id: restaurantUser.auth_user_id, user_name: restaurantUser.full_name,
      module: 'wastage', action: 'create', description: `Recorded wastage: ${qty} ${item.unit?.symbol} ${item.name} (${form.reason})`,
      ip_address: '103.21.45.67',
    });

    setSaving(false);
    toast(`${qty} ${item.unit?.symbol} ${item.name} wastage recorded.`, 'success');
    setShowModal(false);
    setForm({ item_id: '', quantity: '', reason: 'Spoiled', waste_date: new Date().toISOString().slice(0, 10), location: '', notes: '' });
    loadData();
  };

  const columns: Column<WastageRecord>[] = [
    { key: 'wastage_number', header: 'No.', sortable: true, render: (r) => <span className="font-semibold">{r.wastage_number}</span> },
    { key: 'item_name', header: 'Item', sortable: true, render: (r) => r.item_name },
    { key: 'quantity', header: 'Qty', sortable: true, render: (r) => `${r.quantity} ${r.unit}` },
    { key: 'reason', header: 'Reason', render: (r) => <Badge variant="danger">{r.reason}</Badge> },
    { key: 'total_cost', header: 'Cost', sortable: true, render: (r) => <span className="font-semibold text-red-600">{formatCurrency(r.total_cost)}</span> },
    { key: 'waste_date', header: 'Date', sortable: true, hideOnMobile: true, render: (r) => formatDate(r.waste_date) },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Wastage" description={`${records.length} records`} action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Record Wastage</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={TrendingDown} label="Total Wastage Cost" value={formatCurrency(totalCost)} color="red" sublabel="All time" />
        <StatCard icon={TrendingDown} label="Today's Wastage" value={formatCurrency(todayCost)} color="amber" sublabel={`${todayRecords.length} records`} />
        <StatCard icon={TrendingDown} label="Total Records" value={records.length} color="slate" />
      </div>

      {records.length > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Wastage by Reason</h3>
          <BarChart data={chartData} labels={wasteReasons.map((r) => r.slice(0, 4))} color="#ef4444" height={160} />
        </Card>
      )}

      <Card className="p-5">
        <DataTable columns={columns} data={records} loading={loading} searchPlaceholder="Search wastage..." initialSort={{ key: 'waste_date', direction: 'desc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Wastage" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Save</Button></>}>
        <div className="space-y-4">
          <Select label="Item *" value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}>
            <option value="">Select item</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit?.symbol})</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity *" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <Select label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              {wasteReasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Input label="Date" type="date" value={form.waste_date} onChange={(e) => setForm({ ...form, waste_date: e.target.value })} />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Kitchen" />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
