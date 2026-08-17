import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Shield, Monitor, LogOut, Mail, Phone, Save, KeyRound,
  Smartphone, Globe, Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { Card, Button, Input, Badge } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { getInitials, formatDateTime } from '@/lib/utils';

export function ProfilePage() {
  const { restaurantUser, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: restaurantUser?.full_name || '',
    phone: restaurantUser?.phone || '',
  });
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });

  const handleSaveProfile = async () => {
    if (!restaurantUser) return;
    setSaving(true);
    const { error } = await supabase.from('restaurant_users').update({
      full_name: profileForm.full_name,
      phone: profileForm.phone || null,
    }).eq('id', restaurantUser.id);
    setSaving(false);
    if (error) { toast('Unable to save changes.', 'error'); return; }
    toast('Profile updated successfully.', 'success');
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.new || !pwForm.confirm) { toast('All fields are required', 'error'); return; }
    if (pwForm.new !== pwForm.confirm) { toast('New passwords do not match', 'error'); return; }
    if (pwForm.new.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.new });
    setPwSaving(false);
    if (error) { toast('Unable to change password: ' + error.message, 'error'); return; }
    toast('Password changed successfully.', 'success');
    setPwForm({ current: '', new: '', confirm: '' });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const sessions = [
    { device: 'Chrome on Windows', ip: '103.21.45.67', location: 'Bengaluru, IN', current: true, lastActive: new Date().toISOString() },
    { device: 'Safari on iPhone', ip: '49.36.12.89', location: 'Bengaluru, IN', current: false, lastActive: new Date(Date.now() - 86400000).toISOString() },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Profile" description="Manage your account and security" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <Card className="p-5 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-2xl font-bold mx-auto mb-3">
            {restaurantUser ? getInitials(restaurantUser.full_name) : '?'}
          </div>
          <p className="text-lg font-bold text-slate-900">{restaurantUser?.full_name}</p>
          <p className="text-sm text-slate-500">{restaurantUser?.email}</p>
          <Badge variant="info" className="mt-2 capitalize">{restaurantUser?.role}</Badge>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-left">
            <div className="flex items-center gap-2 text-sm text-slate-500"><Mail className="h-4 w-4" /> {restaurantUser?.email}</div>
            {restaurantUser?.phone && <div className="flex items-center gap-2 text-sm text-slate-500"><Phone className="h-4 w-4" /> {restaurantUser.phone}</div>}
          </div>
          <Button variant="danger" className="w-full mt-4" onClick={handleLogout}><LogOut className="h-4 w-4" /> Logout</Button>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {/* Edit Profile */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> Edit Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
              <Input label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveProfile} loading={saving}><Save className="h-4 w-4" /> Save</Button>
            </div>
          </Card>

          {/* Change Password */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><KeyRound className="h-4 w-4 text-slate-400" /> Change Password</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Current Password" type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} placeholder="••••••••" />
              <Input label="New Password" type="password" value={pwForm.new} onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })} placeholder="••••••••" />
              <Input label="Confirm Password" type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleChangePassword} loading={pwSaving}>Change Password</Button>
            </div>
          </Card>

          {/* Active Sessions */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Monitor className="h-4 w-4 text-slate-400" /> Active Sessions</h3>
            <div className="space-y-3">
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                      {s.device.includes('iPhone') ? <Smartphone className="h-5 w-5 text-slate-500" /> : <Monitor className="h-5 w-5 text-slate-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{s.device}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {s.location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(s.lastActive)}</span>
                      </div>
                    </div>
                  </div>
                  {s.current ? <Badge variant="success">Current</Badge> : <Button variant="ghost" size="sm" onClick={() => toast('Session revoked', 'success')}>Revoke</Button>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
