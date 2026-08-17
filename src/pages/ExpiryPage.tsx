import { useEffect, useState, useCallback } from 'react';
import { CalendarClock, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { PageHeader, StatCard } from '@/components/PageHeader';
import { formatDate, daysUntil } from '@/lib/utils';
import type { StockTransaction, InventoryItem } from '@/lib/types';

export function ExpiryPage() {
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [filter, setFilter] = useState<'today' | '3days' | '7days' | '30days'>('7days');

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: itemData }, { data: txnData }] = await Promise.all([
      supabase.from('inventory_items').select('*, unit:units(*)').eq('restaurant_id', rid).eq('expiry_tracking', true).order('name'),
      supabase.from('stock_transactions').select('*').eq('restaurant_id', rid).not('expiry_date', 'is', null).order('expiry_date', { ascending: true }),
    ]);
    setItems((itemData as InventoryItem[]) || []);
    setTransactions((txnData as StockTransaction[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const filterDays = { today: 0, '3days': 3, '7days': 7, '30days': 30 }[filter];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiringBatches = transactions
    .filter((t) => t.expiry_date)
    .map((t) => {
      const d = new Date(t.expiry_date!);
      const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      return { txn: t, days, date: t.expiry_date! };
    })
    .filter((b) => b.days <= filterDays)
    .sort((a, b) => a.days - b.days);

  const expired = expiringBatches.filter((b) => b.days < 0);
  const expiringSoon = expiringBatches.filter((b) => b.days >= 0);

  const getSeverity = (days: number) => {
    if (days < 0) return { variant: 'danger' as const, label: 'Expired', color: 'red' as const };
    if (days <= 3) return { variant: 'danger' as const, label: 'Critical', color: 'red' as const };
    if (days <= 7) return { variant: 'warning' as const, label: 'Warning', color: 'amber' as const };
    return { variant: 'info' as const, label: 'Notice', color: 'blue' as const };
  };

  if (loading) return <div className="animate-page"><PageHeader title="Expiry Management" /><Skeleton className="h-64" /></div>;

  return (
    <div className="animate-page">
      <PageHeader title="Expiry Management" description="FEFO - First Expire, First Out" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={CalendarClock} label="Expiring Soon" value={expiringSoon.length} color="amber" sublabel="Within selected period" />
        <StatCard icon={AlertTriangle} label="Expired" value={expired.length} color="red" sublabel="Needs disposal" />
        <StatCard icon={Package} label="Expiry-Tracked Items" value={items.length} color="blue" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['today', '3days', '7days', '30days'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f === 'today' ? 'Today' : f === '3days' ? '3 Days' : f === '7days' ? '7 Days' : '30 Days'}
          </button>
        ))}
      </div>

      {expiringBatches.length === 0 ? (
        <Card className="p-5"><EmptyState icon={CalendarClock} title="No items expiring" description={`No batches expiring within the selected period (${filter}).`} /></Card>
      ) : (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Batches (FEFO Order)</h3>
          <div className="space-y-2">
            {expiringBatches.map((b) => {
              const sev = getSeverity(b.days);
              return (
                <div key={b.txn.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${sev.color === 'red' ? 'bg-red-50' : sev.color === 'amber' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                      <CalendarClock className={`h-4 w-4 ${sev.color === 'red' ? 'text-red-500' : sev.color === 'amber' ? 'text-amber-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">Batch: {b.txn.batch_number || 'N/A'}</p>
                      <p className="text-xs text-slate-400">Expires: {formatDate(b.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-bold ${b.days < 0 ? 'text-red-600' : b.days <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                      {b.days < 0 ? `${Math.abs(b.days)}d ago` : `${b.days}d left`}
                    </span>
                    <Badge variant={sev.variant}>{sev.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
