import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users as UsersIcon, Ruler, Tags, Bell, CreditCard,
  Shield, Lock, Store, ChevronRight, Save,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { Card, Button, Input, Textarea, Badge } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

const sections = [
  { key: 'profile', label: 'Restaurant Profile', icon: Store, desc: 'Business information and branding' },
  { key: 'branches', label: 'Branches', icon: Building2, desc: 'Manage restaurant locations' },
  { key: 'users', label: 'Users & Roles', icon: UsersIcon, desc: 'Team members and permissions' },
  { key: 'units', label: 'Units', icon: Ruler, desc: 'Measurement units and conversions' },
  { key: 'categories', label: 'Categories', icon: Tags, desc: 'Inventory categories' },
  { key: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alert preferences' },
  { key: 'billing', label: 'Billing & Subscription', icon: CreditCard, desc: 'Plan and payment details' },
  { key: 'security', label: 'Security', icon: Shield, desc: 'Security settings' },
];

export function SettingsPage() {
  const { restaurant, restaurantUser, subscription, refreshProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: restaurant?.name || '',
    legal_name: restaurant?.legal_name || '',
    gst_number: restaurant?.gst_number || '',
    phone: restaurant?.phone || '',
    email: restaurant?.email || '',
    address: restaurant?.address || '',
    city: restaurant?.city || '',
    state: restaurant?.state || '',
    postal_code: restaurant?.postal_code || '',
  });

  const handleSaveProfile = async () => {
    if (!restaurant) return;
    setSaving(true);
    const { error } = await supabase.from('restaurants').update(profileForm).eq('id', restaurant.id);
    setSaving(false);
    if (error) { toast('Unable to save changes.', 'error'); return; }
    toast('Restaurant profile updated successfully.', 'success');
    refreshProfile();
  };

  const daysLeft = subscription ? daysUntil(subscription.expiry_date) : 0;

  return (
    <div className="animate-page">
      <PageHeader title="Settings" description="Manage your restaurant configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-2">
            <div className="space-y-0.5">
              {sections.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      if (['branches', 'users', 'units', 'categories', 'notifications'].includes(s.key)) {
                        navigate(`/${s.key === 'users' ? 'users' : s.key}`);
                      } else {
                        setActiveSection(s.key);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeSection === s.key && !['branches', 'users', 'units', 'categories', 'notifications'].includes(s.key) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{s.label}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && (
            <Card className="p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Restaurant Profile</h3>
              <p className="text-sm text-slate-500 mb-5">Update your restaurant's business information.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Restaurant Name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                <Input label="Legal Name" value={profileForm.legal_name} onChange={(e) => setProfileForm({ ...profileForm, legal_name: e.target.value })} />
                <Input label="GST Number" value={profileForm.gst_number} onChange={(e) => setProfileForm({ ...profileForm, gst_number: e.target.value })} />
                <Input label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                <Input label="Email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                <Input label="City" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                <Input label="State" value={profileForm.state} onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })} />
                <Input label="Postal Code" value={profileForm.postal_code} onChange={(e) => setProfileForm({ ...profileForm, postal_code: e.target.value })} />
                <div className="sm:col-span-2">
                  <Textarea label="Address" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} rows={2} />
                </div>
              </div>
              <div className="flex justify-end mt-5">
                <Button onClick={handleSaveProfile} loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
              </div>
            </Card>
          )}

          {activeSection === 'billing' && subscription && (
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Billing & Subscription</h3>
                <p className="text-sm text-slate-500 mb-5">Manage your plan and billing details.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Current Plan</p><p className="text-sm font-semibold capitalize">{subscription.plan}</p></div>
                  <div><p className="text-xs text-slate-400">Status</p><Badge variant={subscription.status === 'active' ? 'success' : subscription.status === 'trial' ? 'info' : 'danger'}>{subscription.status.replace(/_/g, ' ')}</Badge></div>
                  <div><p className="text-xs text-slate-400">Start Date</p><p className="text-sm font-semibold">{formatDate(subscription.start_date)}</p></div>
                  <div><p className="text-xs text-slate-400">Expiry Date</p><p className="text-sm font-semibold">{formatDate(subscription.expiry_date)}</p></div>
                  <div><p className="text-xs text-slate-400">Days Remaining</p><p className={`text-sm font-semibold ${daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-amber-600' : ''}`}>{daysLeft < 0 ? 'Expired' : `${daysLeft} days`}</p></div>
                  <div><p className="text-xs text-slate-400">Amount</p><p className="text-sm font-semibold">{formatCurrency(subscription.amount)}/{subscription.billing_cycle}</p></div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={() => navigate('/subscription')}>Manage Subscription</Button>
                  <Button variant="outline" onClick={() => toast('Invoice downloaded', 'success')}>View Invoices</Button>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'security' && (
            <Card className="p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Security</h3>
              <p className="text-sm text-slate-500 mb-5">Security and access settings.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><Lock className="h-5 w-5 text-blue-600" /></div>
                    <div><p className="text-sm font-semibold text-slate-900">Change Password</p><p className="text-xs text-slate-400">Update your account password</p></div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>Change</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"><Shield className="h-5 w-5 text-emerald-600" /></div>
                    <div><p className="text-sm font-semibold text-slate-900">Active Sessions</p><p className="text-xs text-slate-400">Manage your active sessions</p></div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>View</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><UsersIcon className="h-5 w-5 text-amber-600" /></div>
                    <div><p className="text-sm font-semibold text-slate-900">Your Role</p><p className="text-xs text-slate-400 capitalize">{restaurantUser?.role}</p></div>
                  </div>
                  <Badge variant="info">{restaurantUser?.role}</Badge>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
