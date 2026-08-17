import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, IndianRupee, AlertTriangle, PackageX, ShoppingCart, TrendingDown,
  Trash2, Clock, FileText, ArrowRight, Bell, Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { PageHeader, StatCard } from '@/components/PageHeader';
import { AnimatedNumber, BarChart, LineChart, DonutChart } from '@/components/ui/Charts';
import { formatCurrency, formatRelativeTime, formatNumber } from '@/lib/utils';
import type { InventoryItem, StockTransaction, PurchaseOrder, Notification } from '@/lib/types';

export function DashboardPage() {
  const { restaurant, restaurantUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if (!restaurant) return;
    const rid = restaurant.id;
    (async () => {
      const [{ data: itemsData }, { data: txnData }, { data: poData }, { data: notifData }] = await Promise.all([
        supabase.from('inventory_items').select('*, category:categories(*), unit:units(*), supplier:suppliers(*)').eq('restaurant_id', rid),
        supabase.from('stock_transactions').select('*, item:inventory_items(*)').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(10),
        supabase.from('purchase_orders').select('*, supplier:suppliers(*)').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(5),
        supabase.from('notifications').select('*').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(5),
      ]);
      setItems((itemsData as InventoryItem[]) || []);
      setTransactions((txnData as StockTransaction[]) || []);
      setPoList((poData as PurchaseOrder[]) || []);
      setNotifs((notifData as Notification[]) || []);
      setLoading(false);
    })();
  }, [restaurant]);

  const totalItems = items.length;
  const inventoryValue = items.reduce((sum, i) => sum + i.current_stock * i.purchase_price, 0);
  const lowStock = items.filter((i) => i.current_stock > 0 && i.current_stock <= i.minimum_stock);
  const outOfStock = items.filter((i) => i.current_stock === 0);
  const pendingPOs = poList.filter((p) => p.status === 'pending' || p.status === 'pending_approval');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTxns = transactions.filter((t) => t.created_at.slice(0, 10) === todayStr);
  const todayPurchases = todayTxns.filter((t) => t.transaction_type === 'purchase').reduce((s, t) => s + Math.abs(t.quantity_change * t.unit_cost), 0);
  const todayConsumption = todayTxns.filter((t) => t.transaction_type === 'consumption').reduce((s, t) => s + Math.abs(t.quantity_change * t.unit_cost), 0);
  const todayWastage = todayTxns.filter((t) => t.transaction_type === 'wastage').reduce((s, t) => s + Math.abs(t.quantity_change * t.unit_cost), 0);

  const purchaseTrend = [4200, 5100, 3800, 6200, 5400, 7100, todayPurchases || 4800];
  const consumptionTrend = [2800, 3200, 2400, 3600, 3100, 3900, todayConsumption || 2900];
  const wastageTrend = [120, 80, 200, 60, 150, 40, todayWastage || 100];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const topConsumed: { label: string; value: number; color: string }[] = items
    .map((i) => {
      const consumed = transactions
        .filter((t) => t.item_id === i.id && t.transaction_type === 'consumption')
        .reduce((s, t) => s + Math.abs(t.quantity_change), 0);
      return { label: i.name, value: Math.round(consumed), color: '#3b82f6' };
    })
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  topConsumed.forEach((d, i) => (d.color = palette[i]));

  if (loading) {
    return (
      <div className="animate-page">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page">
      <PageHeader title="Dashboard" description={`Welcome back, ${restaurantUser?.full_name}`} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard icon={Package} label="Total Items" value={<AnimatedNumber value={totalItems} />} color="blue" sublabel="Active inventory" />
        <StatCard icon={IndianRupee} label="Inventory Value" value={formatCurrency(inventoryValue)} color="green" sublabel="Current stock value" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={<AnimatedNumber value={lowStock.length} />} color="amber" sublabel="Need reordering" />
        <StatCard icon={PackageX} label="Out of Stock" value={<AnimatedNumber value={outOfStock.length} />} color="red" sublabel="Urgent restock" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Today's Purchases" value={formatCurrency(todayPurchases)} color="blue" />
        <StatCard icon={TrendingDown} label="Today's Consumption" value={formatCurrency(todayConsumption)} color="slate" />
        <StatCard icon={Trash2} label="Today's Wastage" value={formatCurrency(todayWastage)} color="red" />
        <StatCard icon={FileText} label="Pending POs" value={<AnimatedNumber value={pendingPOs.length} />} color="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Purchase Trend (7 days)</h3>
          <BarChart data={purchaseTrend} labels={dayLabels} color="#3b82f6" height={160} />
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Consumption Trend (7 days)</h3>
          <LineChart data={consumptionTrend} labels={dayLabels} color="#10b981" height={160} />
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Wastage Trend (7 days)</h3>
          <BarChart data={wastageTrend} labels={dayLabels} color="#ef4444" height={160} />
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Top Consumed Items</h3>
          {topConsumed.length > 0 ? (
            <DonutChart data={topConsumed} size={140} />
          ) : (
            <EmptyState icon={Activity} title="No consumption data yet" description="Consumption data will appear here once stock is issued." />
          )}
        </Card>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Low Stock Alerts */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Low Stock Alerts</h3>
            <button onClick={() => navigate('/inventory')} className="text-xs text-blue-600 font-semibold hover:text-blue-700">View all</button>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">All items are well stocked.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">Min: {item.minimum_stock} {item.unit?.symbol}</p>
                  </div>
                  <Badge variant="warning">{item.current_stock} {item.unit?.symbol}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Stock Movements */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Stock Movements</h3>
            <button onClick={() => navigate('/inventory')} className="text-xs text-blue-600 font-semibold hover:text-blue-700">View all</button>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No movements yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.item?.name}</p>
                    <p className="text-xs text-slate-400">{formatRelativeTime(t.created_at)}</p>
                  </div>
                  <Badge variant={t.quantity_change > 0 ? 'success' : 'danger'}>
                    {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            <button onClick={() => navigate('/notifications')} className="text-xs text-blue-600 font-semibold hover:text-blue-700">View all</button>
          </div>
          {notifs.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No notifications.</p>
          ) : (
            <div className="space-y-2">
              {notifs.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                    <p className="text-xs text-slate-400 truncate">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
