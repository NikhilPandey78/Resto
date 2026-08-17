import { useEffect, useState, useCallback } from 'react';
import {
  Bell, BellOff, Check, CheckCheck, AlertTriangle, PackageX,
  Clock, FileText, CreditCard, Settings as SettingsIcon, Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { formatRelativeTime } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  low_stock: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  out_of_stock: { icon: PackageX, color: 'text-red-500', bg: 'bg-red-50' },
  expiry: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
  purchase_approval: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  stock_request: { icon: Bell, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  subscription: { icon: CreditCard, color: 'text-violet-500', bg: 'bg-violet-50' },
  payment: { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  system: { icon: SettingsIcon, color: 'text-slate-500', bg: 'bg-slate-50' },
};

export function NotificationsPage() {
  const { restaurant } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const { data } = await supabase.from('notifications').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false });
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => !n.is_read);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!restaurant) return;
    await supabase.from('notifications').update({ is_read: true }).eq('restaurant_id', restaurant.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast('All notifications marked as read.', 'success');
  };

  const clearAll = async () => {
    if (!restaurant) return;
    await supabase.from('notifications').delete().eq('restaurant_id', restaurant.id);
    setNotifications([]);
    toast('All notifications cleared.', 'success');
  };

  return (
    <div className="animate-page">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
            <Button variant="ghost" onClick={clearAll} disabled={notifications.length === 0}>
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {f === 'all' ? 'All' : 'Unread'}
            {f === 'unread' && unreadCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px]">{unreadCount}</span>}
          </button>
        ))}
      </div>

      <Card className="p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={BellOff} title="No notifications" description="You're all caught up. New notifications will appear here." />
        ) : (
          <div className="space-y-1">
            {filtered.map((n) => {
              const cfg = typeConfig[n.type] || typeConfig.system;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => { if (!n.is_read) markAsRead(n.id); if (n.link) navigate(n.link); }}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${cfg.bg}`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex-shrink-0"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
