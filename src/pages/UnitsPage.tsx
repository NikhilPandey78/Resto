import { useEffect, useState, useCallback } from 'react';
import { Plus, Ruler, Pencil, Trash2, ArrowLeftRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Input, Select, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/PageHeader';
import type { Unit, UnitConversion } from '@/lib/types';

export function UnitsPage() {
  const { restaurant } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showConvModal, setShowConvModal] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', symbol: '', base_unit: '', conversion_factor: '1' });
  const [convForm, setConvForm] = useState({ from_unit_id: '', to_unit_id: '', factor: '1' });

  const loadData = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: unitData }, { data: convData }] = await Promise.all([
      supabase.from('units').select('*').eq('restaurant_id', rid).order('name'),
      supabase.from('unit_conversions').select('*, from_unit:units!from_unit_id(*), to_unit:units!to_unit_id(*)').eq('restaurant_id', rid),
    ]);
    setUnits((unitData as Unit[]) || []);
    setConversions((convData as UnitConversion[]) || []);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setEditing(null); setForm({ name: '', symbol: '', base_unit: '', conversion_factor: '1' }); setShowModal(true); };
  const openEdit = (u: Unit) => { setEditing(u); setForm({ name: u.name, symbol: u.symbol, base_unit: u.base_unit || '', conversion_factor: String(u.conversion_factor) }); setShowModal(true); };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!form.name || !form.symbol) { toast('Name and symbol are required', 'error'); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('units').update({ name: form.name, symbol: form.symbol, base_unit: form.base_unit || null, conversion_factor: parseFloat(form.conversion_factor) }).eq('id', editing.id);
      if (error) { setSaving(false); toast('Unable to update.', 'error'); return; }
      toast('Unit updated successfully.', 'success');
    } else {
      const { error } = await supabase.from('units').insert({ restaurant_id: restaurant.id, name: form.name, symbol: form.symbol, base_unit: form.base_unit || null, conversion_factor: parseFloat(form.conversion_factor) });
      if (error) { setSaving(false); toast('Unable to add unit.', 'error'); return; }
      toast('Unit added successfully.', 'success');
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('units').delete().eq('id', deleteTarget.id);
    if (error) { toast('Unable to delete unit.', 'error'); return; }
    toast('Unit deleted successfully.', 'success');
    loadData();
  };

  const handleAddConv = async () => {
    if (!restaurant) return;
    if (!convForm.from_unit_id || !convForm.to_unit_id || !convForm.factor) { toast('All fields required', 'error'); return; }
    if (convForm.from_unit_id === convForm.to_unit_id) { toast('Units must differ', 'error'); return; }
    const { error } = await supabase.from('unit_conversions').insert({ restaurant_id: restaurant.id, from_unit_id: convForm.from_unit_id, to_unit_id: convForm.to_unit_id, factor: parseFloat(convForm.factor) });
    if (error) { toast('Unable to add conversion.', 'error'); return; }
    toast('Conversion added successfully.', 'success');
    setShowConvModal(false);
    setConvForm({ from_unit_id: '', to_unit_id: '', factor: '1' });
    loadData();
  };

  const columns: Column<Unit>[] = [
    { key: 'name', header: 'Unit Name', sortable: true, render: (u) => <span className="font-semibold">{u.name}</span> },
    { key: 'symbol', header: 'Symbol', sortable: true, render: (u) => <Badge variant="info">{u.symbol}</Badge> },
    { key: 'base_unit', header: 'Base Unit', hideOnMobile: true, render: (u) => u.base_unit || '—' },
    { key: 'conversion_factor', header: 'Factor', hideOnMobile: true, render: (u) => u.conversion_factor.toString() },
    { key: 'actions', header: '', render: (u) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    )},
  ];

  return (
    <div className="animate-page">
      <PageHeader title="Units" description={`${units.length} measurement units`} action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowConvModal(true)}><ArrowLeftRight className="h-4 w-4" /> Conversions</Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Unit</Button>
        </div>
      } />

      <Card className="p-5 mb-4">
        <DataTable columns={columns} data={units} loading={loading} searchPlaceholder="Search units..." initialSort={{ key: 'name', direction: 'asc' }} />
      </Card>

      {conversions.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Unit Conversions</h3>
          <div className="flex flex-wrap gap-2">
            {conversions.map((c) => (
              <Badge key={c.id} variant="neutral">1 {c.from_unit?.symbol} = {c.factor} {c.to_unit?.symbol}</Badge>
            ))}
          </div>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Unit' : 'Add Unit'} footer={<><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Add'}</Button></>}>
        <div className="space-y-4">
          <Input label="Unit Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kilogram" />
          <Input label="Symbol *" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="e.g. KG" />
          <Select label="Base Unit" value={form.base_unit} onChange={(e) => setForm({ ...form, base_unit: e.target.value })}>
            <option value="">No base unit</option>
            {units.filter((u) => !editing || u.id !== editing.id).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </Select>
          <Input label="Conversion Factor" type="number" value={form.conversion_factor} onChange={(e) => setForm({ ...form, conversion_factor: e.target.value })} hint="How many of this unit equal 1 base unit" />
        </div>
      </Modal>

      <Modal open={showConvModal} onClose={() => setShowConvModal(false)} title="Add Unit Conversion" footer={<><Button variant="outline" onClick={() => setShowConvModal(false)}>Cancel</Button><Button onClick={handleAddConv}>Add</Button></>}>
        <div className="space-y-4">
          <Select label="From Unit" value={convForm.from_unit_id} onChange={(e) => setConvForm({ ...convForm, from_unit_id: e.target.value })}>
            <option value="">Select</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
          </Select>
          <Select label="To Unit" value={convForm.to_unit_id} onChange={(e) => setConvForm({ ...convForm, to_unit_id: e.target.value })}>
            <option value="">Select</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
          </Select>
          <Input label="Factor" type="number" value={convForm.factor} onChange={(e) => setConvForm({ ...convForm, factor: e.target.value })} hint="e.g. 1 Box = 24 Pieces → factor = 24" />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Unit" message={`Delete "${deleteTarget?.name}"?`} confirmText="Delete" />
    </div>
  );
}
