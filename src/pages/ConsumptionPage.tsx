import { useEffect, useState, useCallback } from 'react';
import { TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/PageHeader';
import { BarChart } from '@/components/ui/Charts';
import { formatCurrency, formatDate, formatNumber, formatRelativeTime } from '@/lib/utils';
import type { StockTransaction, InventoryItem } from '@/lib/types';

export function ConsumptionPage() {
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: txnData }, { data: itemData }] = await Promise.all([
      supabase.from('stock_transactions').select('*, item:inventory_items(*)').eq('restaurant_id', rid).eq('transaction_type', 'consumption').order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).order('name'),
    ]);
    setTransactions((txnData as StockTransaction[]) || []);
    setItems((itemData as InventoryItem[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const filterDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') return (now.getTime() - d.getTime()) < 7 * 86400000;
    return (now.getTime() - d.getTime()) < 30 * 86400000;
  };

  const filtered = transactions.filter((t) => filterDate(t.created_at));
  const totalValue = filtered.reduce((s, t) => s + Math.abs(t.quantity_change * t.unit_cost), 0);

  const byItem: Record<string, { name: string; qty: number; value: number }> = {};
  filtered.forEach((t) => {
    const key = t.item_id;
    if (!byItem[key]) byItem[key] = { name: t.item?.name || 'Unknown', qty: 0, value: 0 };
    byItem[key].qty += Math.abs(t.quantity_change);
    byItem[key].value += Math.abs(t.quantity_change * t.unit_cost);
  });
  const topItems = Object.values(byItem).sort((a, b) => b.value - a.value).slice(0, 7);
  const chartData = topItems.map((i) => i.value);
  const chartLabels = topItems.map((i) => i.name.slice(0, 6));

  const columns: Column<StockTransaction>[] = [
    { key: 'item', header: 'Item', sortable: true, render: (t) => <span className="font-semibold">{t.item?.name || '—'}</span> },
    { key: 'quantity_change', header: 'Quantity', sortable: true, render: (t) => <span className="text-red-600 font-semibold">-{formatNumber(Math.abs(t.quantity_change))} {t.item?.unit?.symbol}</span> },
    { key: 'unit_cost', header: 'Unit Cost', hideOnMobile: true, render: (t) => formatCurrency(t.unit_cost) },
    { key: 'value', header: 'Total Value', sortable: true, render: (t) => formatCurrency(Math.abs(t.quantity_change * t.unit_cost)) },
    { key: 'reason', header: 'Reason', hideOnMobile: true, render: (t) => t.reason || '—' },
    { key: 'created_at', header: 'Date', sortable: true, render: (t) => formatRelativeTime(t.created_at) },
  ];

  if (loading) return <div className="animate-page"><PageHeader title="Consumption" /><Skeleton className="h-64" /></div>;

  return (
    <div className="animate-page">
      <PageHeader title="Consumption" description="Track stock consumption across departments" />

      <div className="flex gap-2 mb-4">
        {(['today', 'week', 'month'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={TrendingDown} label="Total Consumption" value={formatCurrency(totalValue)} color="slate" sublabel={`${period}`} />
        <StatCard icon={TrendingDown} label="Transactions" value={filtered.length} color="blue" />
        <StatCard icon={TrendingDown} label="Items Consumed" value={Object.keys(byItem).length} color="amber" />
      </div>

      {topItems.length > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Consumption by Item</h3>
          <BarChart data={chartData} labels={chartLabels} color="#3b82f6" height={180} />
        </Card>
      )}

      <Card className="p-5">
        <DataTable columns={columns} data={filtered} searchPlaceholder="Search consumption..." initialSort={{ key: 'created_at', direction: 'desc' }} emptyMessage="No consumption data for this period" />
      </Card>
    </div>
  );
}
