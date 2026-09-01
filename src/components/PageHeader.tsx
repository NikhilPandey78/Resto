import { ReactNode } from 'react';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sublabel, color = 'blue', trend }: {
  icon: React.ElementType;
  label: string;
  value: ReactNode;
  sublabel?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'purple';
  trend?: { value: string; up: boolean };
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
    purple: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold ${trend.up ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

export function statusBadge(status: string): { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string } {
  const map: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    trial: { variant: 'info', label: 'Trial' },
    expiring_soon: { variant: 'warning', label: 'Expiring Soon' },
    expired: { variant: 'danger', label: 'Expired' },
    suspended: { variant: 'danger', label: 'Suspended' },
    cancelled: { variant: 'neutral', label: 'Cancelled' },
    draft: { variant: 'neutral', label: 'Draft' },
    pending: { variant: 'warning', label: 'Pending' },
    pending_approval: { variant: 'warning', label: 'Pending Approval' },
    approved: { variant: 'success', label: 'Approved' },
    ordered: { variant: 'info', label: 'Ordered' },
    partially_received: { variant: 'warning', label: 'Partially Received' },
    received: { variant: 'success', label: 'Received' },
    completed: { variant: 'success', label: 'Completed' },
    rejected: { variant: 'danger', label: 'Rejected' },
    cancelled_po: { variant: 'neutral', label: 'Cancelled' },
    returned: { variant: 'success', label: 'Returned' },
    in_stock: { variant: 'success', label: 'In Stock' },
    low_stock: { variant: 'warning', label: 'Low Stock' },
    out_of_stock: { variant: 'danger', label: 'Out of Stock' },
  };
  return map[status] || { variant: 'default' as const, label: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
}
