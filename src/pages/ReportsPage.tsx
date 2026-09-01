import { useEffect, useState, useCallback } from 'react';
import { FileBarChart, Download, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Card, Select, Input, Button, Badge, Skeleton } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency, formatDate, downloadCSV, printContent } from '@/lib/utils';

const reportTypes = [
  { key: 'inventory', label: 'Inventory Report', module: 'inventory_items' },
  { key: 'stock_movement', label: 'Stock Movement', module: 'stock_transactions' },
  { key: 'stock_valuation', label: 'Stock Valuation', module: 'inventory_items' },
  { key: 'purchase', label: 'Purchase Report', module: 'stock_receipts' },
  { key: 'consumption', label: 'Consumption Report', module: 'stock_transactions' },
  { key: 'wastage', label: 'Wastage Report', module: 'wastage_records' },
  { key: 'expiry', label: 'Expiry Report', module: 'stock_transactions' },
  { key: 'supplier', label: 'Supplier Report', module: 'suppliers' },
  { key: 'food_cost', label: 'Food Cost Report', module: 'menu_items' },
  { key: 'recipe_cost', label: 'Recipe Cost Report', module: 'recipes' },
  { key: 'stock_variance', label: 'Stock Variance Report', module: 'stock_adjustments' },
];

export function ReportsPage() {
  const { restaurant } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('inventory');
  const [data, setData] = useState<(Record<string, unknown> & { id: string })[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', branch: 'all', category: 'all', supplier: 'all' });

  const loadFilters = useCallback(async () => {
    if (!restaurant) return;
    const rid = restaurant.id;
    const [{ data: cats }, { data: sups }, { data: brs }] = await Promise.all([
      supabase.from('categories').select('id, name').eq('restaurant_id', rid),
      supabase.from('suppliers').select('id, name').eq('restaurant_id', rid),
      supabase.from('branches').select('id, name').eq('restaurant_id', rid),
    ]);
    setCategories(cats || []);
    setSuppliers(sups || []);
    setBranches(brs || []);
  }, [restaurant]);

  const loadReport = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    const rid = restaurant.id;
    const report = reportTypes.find((r) => r.key === activeReport)!;
    let query = supabase.from(report.module).select('*').eq('restaurant_id', rid);
    if (filters.branch !== 'all') query = query.eq('branch_id', filters.branch);
    if (filters.category !== 'all' && report.module === 'inventory_items') query = query.eq('category_id', filters.category);
    if (filters.supplier !== 'all' && (report.module === 'inventory_items' || report.module === 'suppliers')) query = query.eq('supplier_id', filters.supplier);
    if (filters.dateFrom && (report.module === 'stock_transactions' || report.module === 'stock_receipts' || report.module === 'wastage_records')) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo && (report.module === 'stock_transactions' || report.module === 'stock_receipts' || report.module === 'wastage_records')) query = query.lte('created_at', filters.dateTo + 'T23:59:59');
    const { data: result } = await query.order('created_at', { ascending: false }).limit(100);
    setData(((result || []) as (Record<string, unknown> & { id: string })[]));
    setLoading(false);
  }, [restaurant, activeReport, filters]);

  useEffect(() => { loadFilters(); }, [loadFilters]);
  useEffect(() => { loadReport(); }, [loadReport]);

  const handleExport = () => {
    if (data.length === 0) { toast('No data to export', 'warning'); return; }
    const headers = Object.keys(data[0]).filter((k) => k !== 'restaurant_id');
    const rows = data.map((r) => headers.map((h) => String(r[h] ?? '')));
    downloadCSV(`${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast('Report exported as CSV', 'success');
  };

  const handlePrint = () => {
    const report = reportTypes.find((r) => r.key === activeReport)!;
    const headers = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'restaurant_id') : [];
    printContent(report.label, `
      <h1>${report.label}</h1>
      <p>Generated: ${formatDate(new Date())}</p>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${data.map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? '')}</td>`).join('')}</tr>`).join('')}
      </tbody></table>
    `);
  };

  const columns: Column<Record<string, unknown>>[] = data.length > 0
    ? Object.keys(data[0]).filter((k) => k !== 'restaurant_id').slice(0, 8).map((key) => ({
        key,
        header: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        sortable: true,
        render: (row: Record<string, unknown>) => {
          const val = row[key];
          if (val == null) return '—';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'string' && val.length > 10 && val.includes('T')) return formatDate(val);
          return String(val).slice(0, 50);
        },
      }))
    : [];

  return (
    <div className="animate-page">
      <PageHeader title="Reports" description="Generate and export reports" action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4" /> Print</Button>
        </div>
      } />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
        {reportTypes.map((r) => (
          <button key={r.key} onClick={() => setActiveReport(r.key)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeReport === r.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <FileBarChart className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{r.label}</span>
          </button>
        ))}
      </div>

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input label="From Date" type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <Input label="To Date" type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          <Select label="Branch" value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
            <option value="all">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select label="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Supplier" value={filters.supplier} onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}>
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="p-5">
        {loading ? <Skeleton className="h-64" /> : <DataTable columns={columns} data={data} searchPlaceholder="Search report..." pageSize={15} />}
      </Card>
    </div>
  );
}
