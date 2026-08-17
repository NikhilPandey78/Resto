import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, RefreshCw, LifeBuoy, LogOut, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';
import { cn, formatDate, daysUntil } from '@/lib/utils';

const blockedPaths = [
  '/inventory', '/stock-in', '/stock-out', '/stock-transfer', '/stock-adjustment',
  '/stock-count', '/categories', '/units', '/suppliers', '/purchase-orders',
  '/purchase-returns', '/kitchen-requisitions', '/recipes', '/menu-items',
  '/consumption', '/wastage', '/expiry', '/reports', '/branches', '/users',
];

const allowedPaths = ['/subscription', '/settings', '/profile', '/help', '/notifications', '/activity-log'];

export function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [renewing, setRenewing] = useState(false);

  if (!subscription) return <>{children}</>;

  const isBlocked = blockedPaths.some((p) => location.pathname.startsWith(p));
  const isExpired = ['expired', 'suspended', 'cancelled'].includes(subscription.status);
  const isExpiringSoon = subscription.status === 'expiring_soon';

  if (isExpired && isBlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="max-w-md w-full text-center animate-slide-up">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-3xl bg-red-50 mb-5">
            <Lock className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Subscription Expired</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your subscription ended on {formatDate(subscription.expiry_date)}. Renew now to restore full access to your inventory and operations.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              onClick={() => navigate('/subscription')}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              Renew Now
            </Button>
            <Button onClick={() => navigate('/help')} variant="outline" className="w-full" size="lg">
              <LifeBuoy className="h-4 w-4" />
              Contact Support
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-400">Your data is safe. No restaurant data has been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isExpiringSoon && !location.pathname.startsWith('/subscription') && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 animate-slide-up">
          <div className="flex items-center gap-2.5 text-sm text-amber-800">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">
              Your subscription expires in {daysUntil(subscription.expiry_date)} days.{' '}
              <button onClick={() => navigate('/subscription')} className="font-semibold underline underline-offset-2">
                Renew now
              </button>
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
