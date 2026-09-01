import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, IndianRupee, Percent, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Badge, Card, EmptyState, Skeleton } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/PageHeader';
import { formatCurrency } from '@/lib/utils';
import type { MenuItem } from '@/lib/types';

export function FoodCostPage() {
  const { restaurant } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data } = await supabase
      .from('menu_items')
      .select('*, recipe:recipes(*)')
      .eq('restaurant_id', restaurant.id)
      .order('name');
    setItems((data as MenuItem[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const summary = useMemo(() => {
    const priced = items.filter((item) => item.selling_price > 0);
    const average = priced.length ? priced.reduce((sum, item) => sum + item.food_cost_percent, 0) / priced.length : 0;
    const highest = [...priced].sort((a, b) => b.food_cost_percent - a.food_cost_percent)[0];
    const lowestMargin = [...priced].sort((a, b) => a.gross_margin - b.gross_margin)[0];
    return { average, highest, lowestMargin };
  }, [items]);

  const costStatus = (percent: number) => percent > 40 ? 'danger' : percent > 32 ? 'warning' : 'success';
  const columns: Column<MenuItem>[] = [
    { key: 'name', header: 'Menu Item', sortable: true, render: (item) => <span className="font-semibold text-slate-900">{item.name}</span> },
    { key: 'category', header: 'Category', sortable: true, hideOnMobile: true, render: (item) => item.category || '—' },
    { key: 'selling_price', header: 'Selling Price', sortable: true, render: (item) => formatCurrency(item.selling_price) },
    { key: 'food_cost', header: 'Recipe Cost', sortable: true, render: (item) => formatCurrency(item.food_cost) },
    { key: 'food_cost_percent', header: 'Food Cost', sortable: true, render: (item) => <Badge variant={costStatus(item.food_cost_percent)}>{item.food_cost_percent.toFixed(1)}%</Badge> },
    { key: 'gross_margin', header: 'Gross Margin', sortable: true, render: (item) => <span className="font-semibold text-emerald-600">{formatCurrency(item.gross_margin)}</span> },
  ];

  if (loading) return <div className="animate-page"><Skeleton className="h-8 w-52 mb-6" /><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></div>;

  return (
    <div className="animate-page">
      <PageHeader title="Food Cost" description="Live recipe-cost and dish-margin analysis from your menu." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Percent} label="Average Food Cost" value={`${summary.average.toFixed(1)}%`} color={summary.average > 40 ? 'red' : summary.average > 32 ? 'amber' : 'green'} sublabel="Across priced menu items" />
        <StatCard icon={AlertTriangle} label="Highest Cost Dish" value={summary.highest?.name || '—'} color="amber" sublabel={summary.highest ? `${summary.highest.food_cost_percent.toFixed(1)}% food cost` : 'Add menu items to analyse'} />
        <StatCard icon={TrendingUp} label="Lowest Margin Dish" value={summary.lowestMargin?.name || '—'} color="blue" sublabel={summary.lowestMargin ? formatCurrency(summary.lowestMargin.gross_margin) : 'Add menu items to analyse'} />
      </div>
      <Card className="p-5">
        {items.length ? <DataTable columns={columns} data={items} searchPlaceholder="Search menu costs..." initialSort={{ key: 'food_cost_percent', direction: 'desc' }} /> : <EmptyState icon={IndianRupee} title="No menu costs to analyse" description="Link a recipe and selling price to a menu item to calculate food cost automatically." />}
      </Card>
    </div>
  );
}
