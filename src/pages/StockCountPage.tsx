import { useEffect, useState, useCallback } from 'react';
import { Plus, ClipboardCheck, Save, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Select, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { formatNumber, formatDate } from '@/lib/utils';
import type { InventoryItem, Branch, StockCount } from '@/lib/types';

export function StockCountPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [form, setForm] = useState({ branch_id: '', count_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [actuals, setActuals] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: cntData }, { data: itemData }, { data: brData }] = await Promise.all([
      supabase.from('stock_counts').select('*').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
      supabase.from('branches').select('*').eq('restaurant_id', rid).order('name'),
    ]);
    setCounts((cntData as StockCount[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setBranches((brData as Branch[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStart = async () => {
    if (!restaurant || !restaurantUser) return;
    if (!form.branch_id) { toast('Select a location', 'error'); return; }
    setSaving(true);
    const rid = restaurant.id;
    const count = counts.length + 1;
    const countNumber = `CNT-${String(count).padStart(4, '0')}`;

    const { data: sc, error } = await supabase.from('stock_counts').insert({
      restaurant_id: rid, branch_id: form.branch_id, count_number: countNumber,
      count_date: form.count_date, status: 'draft', notes: form.notes || null,
      created_by: restaurantUser.auth_user_id, created_by_name: restaurantUser.full_name,
    }).select().single();

    if (error) { setSaving(false); toast('Unable to start count.', 'error'); return; }

    for (const item of items) {
      await supabase.from('stock_count_items').insert({
        stock_count_id: sc.id, restaurant_id: rid, item_id: item.id,
        item_name: item.name, expected_quantity: item.current_stock,
        actual_quantity: null, variance: null, unit: item.unit?.symbol || '',
      });
    }

    setSaving(false);
    toast(`${countNumber} started. ${items.length} items to count.`, 'success');
    setShowModal(false);
    setForm({ branch_id: '', count_date: new Date().toISOString().slice(0, 10), notes: '' });
    loadData();
  };

  const columns: Column<StockCount>[] = [
    { key: 'count_number', header: 'Count No.', sortable: true, render: (c) => <span className="font-semibold">{c.count_number}</span> },
    { key: 'count_date', header: 'Date', sortable: true, hideOnMobile: true, render: (c) => formatDate(c.count_date) },
    { key: 'total_variance', header: 'Variance', render: (c) => c.total_variance != null ? formatNumber(c.total_variance) : '—' },
    { key: 'status', header: 'Status', render: (c) => { const s = statusBadge(c.status); return <Badge variant={s.variant}>{s.label}</Badge>; } },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Stock Count" description="Count and reconcile inventory" action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Start Count</Button>} />
      <Card className="p-5">
        <DataTable columns={columns} data={counts} loading={loading} searchPlaceholder="Search counts..." initialSort={{ key: 'count_date', direction: 'desc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Start Stock Count" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleStart} loading={saving}>Start Count</Button></>}>
        <div className="space-y-4">
          <Select label="Location *" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">Select location</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Count Date</label>
            <input type="date" value={form.count_date} onChange={(e) => setForm({ ...form, count_date: e.target.value })} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm" />
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
            This will create a count with {items.length} items. You'll enter actual quantities for each item.
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={showComplete} onClose={() => setShowComplete(false)} onConfirm={() => toast('Count completed', 'success')} title="Complete Count" message="Are you sure you want to complete this stock count? Variances will be applied." confirmText="Complete" variant="warning" />
    </div>
  );
}
