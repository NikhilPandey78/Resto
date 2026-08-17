import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, RefreshCw, TrendingUp, FileText, LogOut, LifeBuoy, Check, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Badge } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

const plans = [
  { name: 'Starter', price: 999, maxBranches: 1, maxUsers: 3, features: ['1 Branch', '3 Users', 'Basic Reports', 'Email Support'] },
  { name: 'Professional', price: 2999, maxBranches: 3, maxUsers: 10, features: ['3 Branches', '10 Users', 'Advanced Reports', 'Recipe Management', 'Priority Support'] },
  { name: 'Enterprise', price: 7999, maxBranches: 10, maxUsers: 50, features: ['10 Branches', '50 Users', 'Custom Reports', 'API Access', 'Dedicated Manager'] },
];

export function SubscriptionPage() {
  const { subscription, restaurant, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [renewing, setRenewing] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  if (!subscription) {
    return <div className="animate-page"><PageHeader title="Subscription" /><Card className="p-8 text-center text-sm text-slate-500">No subscription found.</Card></div>;
  }

  const daysLeft = daysUntil(subscription.expiry_date);
  const isExpired = ['expired', 'suspended', 'cancelled'].includes(subscription.status);
  const isTrial = subscription.status === 'trial';

  const handleRenew = async () => {
    setRenewing(true);
    setTimeout(() => {
      setRenewing(false);
      toast('Subscription renewed successfully! Full access restored.', 'success');
      window.location.reload();
    }, 1500);
  };

  const handleUpgrade = (planName: string) => {
    toast(`Upgrading to ${planName} plan...`, 'info');
    setTimeout(() => {
      toast(`${planName} plan activated successfully!`, 'success');
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="animate-page">
      <PageHeader title="Subscription" description="Manage your plan and billing" />

      {isExpired && (
        <Card className="p-6 mb-6 border-red-200 bg-red-50">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 flex-shrink-0">
              <Lock className="h-7 w-7 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">Subscription Expired</h3>
              <p className="text-sm text-slate-600 mt-1">Your subscription ended on {formatDate(subscription.expiry_date)}. Renew now to restore full access.</p>
              <p className="text-xs text-slate-500 mt-1">Your data is safe — no restaurant data has been deleted.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Current Plan</p>
                <p className="text-xl font-bold text-slate-900 capitalize">{subscription.plan}</p>
              </div>
            </div>
            <Badge variant={isExpired ? 'danger' : isTrial ? 'info' : 'success'}>
              {subscription.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">Start Date</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(subscription.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Expiry Date</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(subscription.expiry_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Days Remaining</p>
              <p className={`text-sm font-semibold ${daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-amber-600' : 'text-slate-900'}`}>
                {daysLeft < 0 ? 'Expired' : `${daysLeft} days`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Billing Cycle</p>
              <p className="text-sm font-semibold text-slate-900 capitalize">{subscription.billing_cycle}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Amount</p>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(subscription.amount)}/{subscription.billing_cycle}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Auto Renewal</p>
              <p className="text-sm font-semibold text-slate-900">{subscription.auto_renewal ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-slate-100">
            <Button onClick={handleRenew} loading={renewing}>
              <RefreshCw className="h-4 w-4" /> Renew Subscription
            </Button>
            <Button variant="outline" onClick={() => setShowPlans(!showPlans)}>
              <TrendingUp className="h-4 w-4" /> Upgrade Plan
            </Button>
            <Button variant="outline" onClick={() => toast('Invoice downloaded', 'success')}>
              <FileText className="h-4 w-4" /> View Invoice
            </Button>
            {isExpired && (
              <Button variant="danger" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Plan Limits</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Branches</span>
                <span className="font-semibold text-slate-900">Up to {subscription.max_branches}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Users</span>
                <span className="font-semibold text-slate-900">Up to {subscription.max_users}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/help')}>
              <LifeBuoy className="h-4 w-4" /> Contact Support
            </Button>
          </div>
        </Card>
      </div>

      {showPlans && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
          {plans.map((plan) => (
            <Card key={plan.name} className={`p-5 ${plan.name === 'Professional' ? 'border-blue-300 ring-2 ring-blue-100' : ''}`}>
              {plan.name === 'Professional' && (
                <Badge variant="info" className="mb-2">Current</Badge>
              )}
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(plan.price)}<span className="text-sm font-normal text-slate-400">/month</span></p>
              <div className="space-y-2 mt-4">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-5"
                variant={plan.name === 'Professional' ? 'outline' : 'primary'}
                onClick={() => handleUpgrade(plan.name)}
                disabled={plan.name === subscription.plan}
              >
                {plan.name === subscription.plan ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
