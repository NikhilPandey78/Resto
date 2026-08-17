import { useEffect, useState, useCallback } from 'react';
import { Plus, Users as UsersIcon, Mail, Shield, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Select, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader, statusBadge } from '@/components/PageHeader';
import { getInitials } from '@/lib/utils';
import type { RestaurantUser, Branch } from '@/lib/types';

const roles = ['owner', 'admin', 'manager', 'store_manager', 'purchase_manager', 'kitchen_manager', 'staff'];
const roleLabels: Record<string, string> = { owner: 'Owner', admin: 'Admin', manager: 'Manager', store_manager: 'Store Manager', purchase_manager: 'Purchase Manager', kitchen_manager: 'Kitchen Manager', staff: 'Staff' };
const permissions = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Receive', 'Transfer', 'Adjust', 'Export'];

export function UsersPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<RestaurantUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RestaurantUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: 'staff', branch_id: '' });

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const [{ data: userData }, { data: brData }] = await Promise.all([
      supabase.from('restaurant_users').select('*').eq('restaurant_id', restaurant.id).order('full_name'),
      supabase.from('branches').select('*').eq('restaurant_id', restaurant.id).order('name'),
    ]);
    setUsers((userData as RestaurantUser[]) || []);
    setBranches((brData as Branch[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleInvite = async () => {
    if (!restaurant) return;
    if (!form.full_name || !form.email) { toast('Name and email are required', 'error'); return; }
    setSaving(true);
    // Create auth user via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: 'TempPass123!',
      email_confirm: true,
    });
    if (authError) { setSaving(false); toast('Unable to invite user: ' + authError.message, 'error'); return; }

    const { error } = await supabase.from('restaurant_users').insert({
      restaurant_id: restaurant.id, auth_user_id: authData.user.id,
      full_name: form.full_name, email: form.email, phone: form.phone || null,
      role: form.role, branch_id: form.branch_id || null, status: 'active',
    });
    if (error) { setSaving(false); toast('Unable to add user.', 'error'); return; }
    setSaving(false);
    toast(`Invitation sent to ${form.email}.`, 'success');
    setShowModal(false);
    setForm({ full_name: '', email: '', phone: '', role: 'staff', branch_id: '' });
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('restaurant_users').delete().eq('id', deleteTarget.id);
    if (error) { toast('Unable to remove user.', 'error'); return; }
    toast('User removed successfully.', 'success');
    loadData();
  };

  const columns: Column<RestaurantUser>[] = [
    { key: 'full_name', header: 'Name', sortable: true, render: (u) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{getInitials(u.full_name)}</div>
        <span className="font-semibold">{u.full_name}</span>
      </div>
    )},
    { key: 'email', header: 'Email', sortable: true, hideOnMobile: true, render: (u) => u.email },
    { key: 'role', header: 'Role', sortable: true, render: (u) => <Badge variant="info">{roleLabels[u.role]}</Badge> },
    { key: 'status', header: 'Status', render: (u) => { const s = statusBadge(u.status); return <Badge variant={s.variant}>{s.label}</Badge>; } },
    { key: 'actions', header: '', render: (u) => u.id !== restaurantUser?.id ? <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button> : <Badge variant="success">You</Badge> },
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Users" description={`${users.length} users`} action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Invite User</Button>} />

      {/* Permissions reference */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-slate-400" /> Role Permissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-slate-100"><th className="px-2 py-2 text-left font-semibold text-slate-400">Role</th>{permissions.map((p) => <th key={p} className="px-2 py-2 text-center font-semibold text-slate-400">{p}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-50">
              {roles.map((r) => {
                const perms = r === 'owner' || r === 'admin' ? permissions : r === 'manager' ? ['View', 'Create', 'Edit', 'Approve', 'Export'] : r === 'store_manager' ? ['View', 'Create', 'Edit', 'Receive', 'Transfer', 'Adjust'] : r === 'purchase_manager' ? ['View', 'Create', 'Edit', 'Approve'] : r === 'kitchen_manager' ? ['View', 'Create'] : ['View'];
                return <tr key={r}><td className="px-2 py-2 font-semibold text-slate-700">{roleLabels[r]}</td>{permissions.map((p) => <td key={p} className="px-2 py-2 text-center">{perms.includes(p) ? <span className="text-emerald-500">✓</span> : <span className="text-slate-300">—</span>}</td>)}</tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <DataTable columns={columns} data={users} loading={loading} searchPlaceholder="Search users..." initialSort={{ key: 'full_name', direction: 'asc' }} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Invite User" footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleInvite} loading={saving}>Send Invite</Button></>}>
        <div className="space-y-4">
          <Input label="Full Name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Priya Patel" />
          <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@spicegarden.in" />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </Select>
          <Select label="Branch" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove User" message={`Remove "${deleteTarget?.full_name}" from the restaurant?`} confirmText="Remove" />
    </div>
  );
}
