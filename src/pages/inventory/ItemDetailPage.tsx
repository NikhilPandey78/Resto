import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, IndianRupee, MapPin, Truck, History, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ui/Charts';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils';
import type { InventoryItem, StockTransaction } from '@/lib/types';

export function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: itemData }, { data: txnData }] = await Promise.all([
        supabase.from('inventory_items').select('*, category:categories(*), unit:units(*), supplier:suppliers(*)').eq('id', id).maybeSingle(),
        supabase.from('stock_transactions').select('*').eq('item_id', id).order('created_at', { ascending: false }).limit(20),
      ]);
      setItem(itemData as InventoryItem);
      setTransactions((txnData as StockTransaction[]) || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <div className="animate-page"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 mb-4" /></div>;
  }

  if (!item) {
    return <div className="animate-page"><EmptyState icon={Package} title="Item not found" /></div>;
  }

  const stockValue = item.current_stock * item.purchase_price;
  const stockPct = item.maximum_stock > 0 ? (item.current_stock / item.maximum_stock) * 100 : 0;
  const s = item.current_stock === 0 ? statusBadge('out_of_stock') : item.current_stock <= item.minimum_stock ? statusBadge('low_stock') : statusBadge('in_stock');

  const txnTypeColors: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
    purchase: 'success', consumption: 'danger', wastage: 'danger',
    transfer_in: 'success', transfer_out: 'danger', adjustment_in: 'warning', adjustment_out: 'warning',
  };

  return (
    <div className="animate-page">
      <button onClick={() => navigate('/inventory')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Inventory
      </button>

      <PageHeader title={item.name} description={item.sku || 'No SKU'} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Key stats */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
          <p className="text-sm text-slate-500">Current Stock</p>
          <p className="text-3xl font-bold text-slate-900">{formatNumber(item.current_stock)} <span className="text-lg text-slate-400">{item.unit?.symbol}</span></p>
          <div className="mt-3">
            <ProgressBar value={item.current_stock} max={item.maximum_stock} color={item.current_stock === 0 ? 'red' : item.current_stock <= item.minimum_stock ? 'amber' : 'green'} />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Min: {formatNumber(item.minimum_stock)}</span>
              <span>Max: {formatNumber(item.maximum_stock)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 mb-3">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-sm text-slate-500">Stock Value</p>
          <p className="text-3xl font-bold text-slate-900">{formatCurrency(stockValue)}</p>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400">Avg. Cost</p>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.purchase_price)}/{item.unit?.symbol}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Selling Price</p>
              <p className="text-sm font-semibold text-slate-900">{item.selling_price ? formatCurrency(item.selling_price) : '—'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">Supplier:</span>
              <span className="font-semibold text-slate-900">{item.supplier?.name || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">Location:</span>
              <span className="font-semibold text-slate-900">{item.storage_location || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-900">{item.category?.name || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">Subcategory:</span>
              <span className="font-semibold text-slate-900">{item.subcategory || '—'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" /> Stock History
        </h3>
        {transactions.length === 0 ? (
          <EmptyState icon={History} title="No transactions yet" description="Stock movements will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Change</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400 hidden sm:table-cell">After</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400 hidden sm:table-cell">Reason</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <Badge variant={txnTypeColors[t.transaction_type] || 'default'}>{t.transaction_type.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-sm font-semibold">
                      <span className={t.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {t.quantity_change > 0 ? '+' : ''}{formatNumber(t.quantity_change)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-600 hidden sm:table-cell">{formatNumber(t.quantity_after)}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600 hidden sm:table-cell">{t.reason || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-400">{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
