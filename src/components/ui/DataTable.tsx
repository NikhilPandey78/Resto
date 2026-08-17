import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; direction: 'asc' | 'desc' };
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  emptyMessage = 'No records found',
  onRowClick,
  initialSort,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [search]);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = (row as Record<string, unknown>)[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key];
      const bv = (b as Record<string, unknown>)[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.direction === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {searchable && <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {searchable && (
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-10"
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500',
                          col.sortable && 'cursor-pointer hover:text-slate-700 select-none',
                          col.className
                        )}
                        onClick={() => col.sortable && toggleSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.header}
                          {col.sortable && sort?.key === col.key && (
                            <span className="text-blue-500">
                              {sort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        'bg-white transition-colors hover:bg-slate-50',
                        onRowClick && 'cursor-pointer'
                      )}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={cn('px-4 py-3 text-sm text-slate-700', col.className)}>
                          {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paged.map((row) => (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'bg-white rounded-xl border border-slate-200 p-4 space-y-2',
                  onRowClick && 'cursor-pointer active:bg-slate-50'
                )}
              >
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((col, idx) => (
                    <div key={col.key} className={cn('flex justify-between items-start gap-3', idx === 0 && 'pb-2 border-b border-slate-100')}>
                      <span className="text-xs font-medium text-slate-400 flex-shrink-0">{col.header}</span>
                      <span className="text-sm text-slate-900 text-right font-medium">
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </span>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm font-medium text-slate-700">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
