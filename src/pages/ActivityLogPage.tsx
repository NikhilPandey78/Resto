import { useEffect, useState, useCallback } from 'react';
import { History, User, Module, Calendar, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, Badge, Skeleton, EmptyState, Select } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime, formatRelativeTime, getInitials } from '@/lib/utils';
import type { ActivityLog } from '@/lib/types';

const moduleColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  stock_in: 'success',
  stock_out: 'danger',
  stock_transfer: 'info',
  stock_adjustment: 'warning',
  purchase_order: 'info',
  wastage: 'danger',
  inventory: 'default',
  recipe: 'neutral',
  menu_item: 'neutral',
};

export function ActivityLogPage() {
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filterModule, setFilterModule] = useState('all');

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const { data } = await supabase.from('activity_logs').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }).limit(200);
    setLogs((data as ActivityLog[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const modules = Array.from(new Set(logs.map((l) => l.module)));
  const filtered = filterModule === 'all' ? logs : logs.filter((l) => l.module === filterModule);

  const columns: Column<ActivityLog>[] = [
    { key: 'user_name', header: 'User', sortable: true, render: (l) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
          {l.user_name ? getInitials(l.user_name) : '?'}
        </div>
        <span className="font-semibold text-slate-900">{l.user_name || 'System'}</span>
      </div>
    )},
    { key: 'description', header: 'Action', sortable: true, render: (l) => (
      <span className="text-sm text-slate-700">{l.description}</span>
    )},
    { key: 'module', header: 'Module', sortable: true, hideOnMobile: true, render: (l) => (
      <Badge variant={moduleColors[l.module] || 'default'}>{l.module.replace(/_/g, ' ')}</Badge>
    )},
    { key: 'action', header: 'Type', hideOnMobile: true, render: (l) => (
      <span className="text-xs text-slate-500 capitalize">{l.action}</span>
    )},
    { key: 'ip_address', header: 'IP', hideOnMobile: true, render: (l) => (
      <span className="text-xs text-slate-400 font-mono">{l.ip_address || '—'}</span>
    )},
    { key: 'created_at', header: 'Date & Time', sortable: true, render: (l) => (
      <div>
        <p className="text-sm text-slate-600">{formatDateTime(l.created_at)}</p>
        <p className="text-xs text-slate-400">{formatRelativeTime(l.created_at)}</p>
      </div>
    )},
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Activity Log" description={`${logs.length} activities recorded`} />

      {modules.length > 0 && (
        <div className="mb-4">
          <Select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="!w-auto min-w-[180px]">
            <option value="all">All Modules</option>
            {modules.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
          </Select>
        </div>
      )}

      <Card className="p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Actions performed by your team will appear here." />
        ) : (
          <DataTable columns={columns} data={filtered} searchPlaceholder="Search activity..." pageSize={15} initialSort={{ key: 'created_at', direction: 'desc' }} />
        )}
      </Card>
    </div>
  );
}
