import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import {
  Button,
  Card,
  Select,
  Input,
  Badge,
} from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/PageHeader';
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from '@/lib/utils';

import type {
  InventoryItem,
  StockIssue,
} from '@/lib/types';

/* =========================================================
   TYPES
========================================================= */

interface IssueLine {
  item_id: string;
  item_name: string;
  quantity: string;
  unit: string;
  rate: string;
}

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

interface InventoryItemWithDepartment extends InventoryItem {
  department?: string | null;
  department_id?: string | null;
}

/* =========================================================
   CONSTANTS
========================================================= */

const departments = [
  'Kitchen',
  'Bar',
  'Housekeeping',
  'Service',
  'Management',
];

const reasons = [
  'Consumption',
  'Breakage',
  'Spillage',
  'Transfer',
  'Other',
];

/* =========================================================
   COMPONENT
========================================================= */

export function StockOutPage() {
  const { restaurant, restaurantUser } = useAuth();
  const toast = useToast();

  /* =======================================================
     STATE
  ======================================================= */

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [items, setItems] = useState<InventoryItemWithDepartment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    department: 'Kitchen',
    reason: 'Consumption',
    issue_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [lines, setLines] = useState<IssueLine[]>([]);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData = useCallback(async () => {
    if (!restaurant) return;

    setLoading(true);

    const rid = restaurant.id;

    try {
      /* -----------------------------------------------------
         Load Stock Issues
      ----------------------------------------------------- */

      const { data: issueData, error: issueError } =
        await supabase
          .from('stock_issues')
          .select('*')
          .eq('restaurant_id', rid)
          .order('created_at', {
            ascending: false,
          });

      if (issueError) {
        console.error(
          'Stock issues error:',
          issueError
        );
      }

      /* -----------------------------------------------------
         Load Inventory Items
      ----------------------------------------------------- */

      const { data: itemData, error: itemError } =
        await supabase
          .from('inventory_items')
          .select(
            '*, unit:units(*)'
          )
          .eq('restaurant_id', rid)
          .order('name');

      if (itemError) {
        console.error(
          'Inventory items error:',
          itemError
        );
      }

      /* -----------------------------------------------------
         Load Units
      ----------------------------------------------------- */

      const { data: unitData, error: unitError } =
        await supabase
          .from('units')
          .select('id, name, symbol')
          .eq('restaurant_id', rid)
          .order('name');

      if (unitError) {
        console.error(
          'Units error:',
          unitError
        );
      }

      setIssues(
        (issueData as StockIssue[]) || []
      );

      setItems(
        (itemData as InventoryItemWithDepartment[]) || []
      );

      setUnits(
        (unitData as Unit[]) || []
      );
    } catch (error) {
      console.error(
        'Load data error:',
        error
      );

      toast(
        'Unable to load inventory data.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [restaurant, toast]);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =======================================================
     FILTER ITEMS BY DEPARTMENT
  ======================================================= */

  const filteredItems = useMemo(() => {
    const selectedDepartment =
      form.department.trim().toLowerCase();

    return items.filter((item) => {
      const itemDepartment =
        (
          item.department ||
          ''
        )
          .trim()
          .toLowerCase();

      return (
        itemDepartment === selectedDepartment
      );
    });
  }, [items, form.department]);

  /* =======================================================
     ADD LINE
  ======================================================= */

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        item_id: '',
        item_name: '',
        quantity: '',
        unit: '',
        rate: '',
      },
    ]);
  };

  /* =======================================================
     REMOVE LINE
  ======================================================= */

  const removeLine = (idx: number) => {
    setLines((prev) =>
      prev.filter((_, i) => i !== idx)
    );
  };

  /* =======================================================
     UPDATE LINE
  ======================================================= */

  const updateLine = (
    idx: number,
    field: keyof IssueLine,
    value: string
  ) => {
    setLines((prev) => {
      const next = [...prev];

      next[idx] = {
        ...next[idx],
        [field]: value,
      };

      /* ---------------------------------------------------
         ITEM SELECTED
      --------------------------------------------------- */

      if (field === 'item_id') {
        const item = items.find(
          (i) => i.id === value
        );

        if (item) {
          const itemUnit =
            item.unit?.symbol || '';

          const itemRate =
            item.purchase_price != null
              ? String(item.purchase_price)
              : '';

          next[idx] = {
            ...next[idx],
            item_id: item.id,
            item_name: item.name,
            unit: itemUnit,
            rate: itemRate,
          };
        } else {
          next[idx] = {
            ...next[idx],
            item_id: '',
            item_name: '',
            unit: '',
            rate: '',
          };
        }
      }

      return next;
    });
  };

  /* =======================================================
     DEPARTMENT CHANGE
  ======================================================= */

  const handleDepartmentChange = (
    department: string
  ) => {
    setForm((prev) => ({
      ...prev,
      department,
    }));

    /*
      Important:
      When department changes,
      remove previously selected items.
    */

    setLines([]);
  };

  /* =======================================================
     CHECK DUPLICATE ITEM
  ======================================================= */

  const isItemAlreadySelected = (
    itemId: string,
    currentIndex: number
  ) => {
    return lines.some(
      (line, index) =>
        index !== currentIndex &&
        line.item_id === itemId
    );
  };

  /* =======================================================
     LINE TOTAL
  ======================================================= */

  const lineTotal = (
    line: IssueLine
  ) => {
    const quantity =
      parseFloat(line.quantity) || 0;

    const rate =
      parseFloat(line.rate) || 0;

    return quantity * rate;
  };

  /* =======================================================
     GRAND TOTAL
  ======================================================= */

  const grandTotal =
    lines.reduce(
      (sum, line) =>
        sum + lineTotal(line),
      0
    );

  /* =======================================================
     OPEN NEW ISSUE
  ======================================================= */

  const openNewIssue = () => {
    setForm({
      department: 'Kitchen',
      reason: 'Consumption',
      issue_date:
        new Date()
          .toISOString()
          .slice(0, 10),
      notes: '',
    });

    setLines([]);

    setShowModal(true);
  };

  /* =======================================================
     SAVE STOCK ISSUE
  ======================================================= */

  const handleSave = async () => {
    if (
      !restaurant ||
      !restaurantUser
    ) {
      return;
    }

    /* -----------------------------------------------------
       BASIC VALIDATION
    ----------------------------------------------------- */

    if (
      lines.length === 0 ||
      lines.some(
        (line) =>
          !line.item_id ||
          !line.quantity
      )
    ) {
      toast(
        'Add at least one valid item.',
        'error'
      );

      return;
    }

    /* -----------------------------------------------------
       DEPARTMENT VALIDATION
    ----------------------------------------------------- */

    for (const line of lines) {
      const item = items.find(
        (i) => i.id === line.item_id
      );

      if (!item) {
        toast(
          `Item ${line.item_name} not found.`,
          'error'
        );

        return;
      }

      const itemDepartment =
        (
          item.department ||
          ''
        )
          .trim()
          .toLowerCase();

      const selectedDepartment =
        form.department
          .trim()
          .toLowerCase();

      if (
        itemDepartment !==
        selectedDepartment
      ) {
        toast(
          `${line.item_name} does not belong to ${form.department}.`,
          'error'
        );

        return;
      }
    }

    /* -----------------------------------------------------
       QUANTITY VALIDATION
    ----------------------------------------------------- */

    for (const line of lines) {
      const item = items.find(
        (i) => i.id === line.item_id
      );

      if (!item) continue;

      const quantity =
        parseFloat(line.quantity);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        toast(
          `Enter a valid quantity for ${line.item_name}.`,
          'error'
        );

        return;
      }

      if (
        quantity >
        item.current_stock
      ) {
        toast(
          `Insufficient stock for ${line.item_name}. Available: ${item.current_stock} ${item.unit?.symbol || ''}`,
          'error'
        );

        return;
      }
    }

    /* -----------------------------------------------------
       DUPLICATE VALIDATION
    ----------------------------------------------------- */

    const selectedIds =
      lines.map(
        (line) => line.item_id
      );

    const hasDuplicate =
      new Set(selectedIds).size !==
      selectedIds.length;

    if (hasDuplicate) {
      toast(
        'The same item cannot be added twice.',
        'error'
      );

      return;
    }

    /* -----------------------------------------------------
       START SAVING
    ----------------------------------------------------- */

    setSaving(true);

    const rid =
      restaurant.id;

    const count =
      issues.length + 1;

    const issueNumber =
      `ISS-${String(count).padStart(
        4,
        '0'
      )}`;

    try {
      /* ---------------------------------------------------
         CREATE STOCK ISSUE
      --------------------------------------------------- */

      const {
        data: issue,
        error,
      } = await supabase
        .from('stock_issues')
        .insert({
          restaurant_id: rid,
          issue_number: issueNumber,
          issue_type: 'consumption',
          department:
            form.department,
          issue_date:
            form.issue_date,
          reason:
            form.reason,
          notes:
            form.notes || null,
          total_value:
            grandTotal,
          issued_by:
            restaurantUser.auth_user_id,
          issued_by_name:
            restaurantUser.full_name,
        })
        .select()
        .single();

      if (error || !issue) {
        console.error(
          'Create issue error:',
          error
        );

        toast(
          'Unable to save stock issue.',
          'error'
        );

        return;
      }

      /* ---------------------------------------------------
         INSERT ISSUE ITEMS
      --------------------------------------------------- */

      for (const line of lines) {
        const item = items.find(
          (i) =>
            i.id === line.item_id
        );

        if (!item) continue;

        const quantity =
          parseFloat(
            line.quantity
          );

        const rate =
          parseFloat(
            line.rate
          ) || 0;

        const total =
          quantity * rate;

        /* -----------------------------------------------
           STOCK ISSUE ITEM
        ----------------------------------------------- */

        const {
          error:
            issueItemError,
        } = await supabase
          .from(
            'stock_issue_items'
          )
          .insert({
            stock_issue_id:
              issue.id,
            restaurant_id:
              rid,
            item_id:
              line.item_id,
            item_name:
              line.item_name,
            quantity,
            unit:
              line.unit,
            rate,
            total,
          });

        if (issueItemError) {
          console.error(
            'Issue item error:',
            issueItemError
          );

          throw issueItemError;
        }

        /* -----------------------------------------------
           UPDATE STOCK
        ----------------------------------------------- */

        const newStock =
          item.current_stock -
          quantity;

        const {
          error:
            stockUpdateError,
        } = await supabase
          .from(
            'inventory_items'
          )
          .update({
            current_stock:
              newStock,
          })
          .eq(
            'id',
            line.item_id
          );

        if (stockUpdateError) {
          console.error(
            'Stock update error:',
            stockUpdateError
          );

          throw stockUpdateError;
        }

        /* -----------------------------------------------
           STOCK TRANSACTION
        ----------------------------------------------- */

        const {
          error:
            transactionError,
        } = await supabase
          .from(
            'stock_transactions'
          )
          .insert({
            restaurant_id:
              rid,
            item_id:
              line.item_id,
            transaction_type:
              'consumption',
            quantity_change:
              -quantity,
            quantity_after:
              newStock,
            reference_type:
              'stock_issue',
            reference_id:
              issue.id,
            unit_cost:
              rate,
            reason:
              form.reason,
            performed_by:
              restaurantUser.auth_user_id,
            performed_by_name:
              restaurantUser.full_name,
          });

        if (transactionError) {
          console.error(
            'Transaction error:',
            transactionError
          );

          throw transactionError;
        }
      }

      /* ---------------------------------------------------
         ACTIVITY LOG
      --------------------------------------------------- */

      await supabase
        .from(
          'activity_logs'
        )
        .insert({
          restaurant_id:
            rid,
          user_id:
            restaurantUser.auth_user_id,
          user_name:
            restaurantUser.full_name,
          module:
            'stock_out',
          action:
            'issue',
          description:
            `Issued stock via ${issueNumber} to ${form.department}`,
          ip_address:
            '103.21.45.67',
        });

      /* ---------------------------------------------------
         SUCCESS
      --------------------------------------------------- */

      toast(
        `${issueNumber} issued successfully.`,
        'success'
      );

      setShowModal(false);

      setForm({
        department: 'Kitchen',
        reason: 'Consumption',
        issue_date:
          new Date()
            .toISOString()
            .slice(0, 10),
        notes: '',
      });

      setLines([]);

      await loadData();
    } catch (error) {
      console.error(
        'Save stock issue error:',
        error
      );

      toast(
        'Something went wrong while saving the issue.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     TABLE COLUMNS
  ======================================================= */

  const columns:
    Column<StockIssue>[] = [
      {
        key: 'issue_number',
        header: 'Issue No.',
        sortable: true,
        render: (issue) => (
          <span className="font-semibold text-slate-900">
            {issue.issue_number}
          </span>
        ),
      },

      {
        key: 'department',
        header: 'Department',
        sortable: true,
        render: (issue) => (
          <Badge variant="info">
            {issue.department}
          </Badge>
        ),
      },

      {
        key: 'issue_date',
        header: 'Date',
        sortable: true,
        hideOnMobile: true,
        render: (issue) =>
          formatDate(
            issue.issue_date
          ),
      },

      {
        key: 'reason',
        header: 'Reason',
        hideOnMobile: true,
        render: (issue) =>
          issue.reason || '—',
      },

      {
        key: 'total_value',
        header: 'Value',
        sortable: true,
        render: (issue) =>
          formatCurrency(
            issue.total_value
          ),
      },
    ];

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="animate-page">
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <PageHeader
        title="Stock Out"
        description="Issue stock to departments"
        action={
          <Button
            onClick={
              openNewIssue
            }
          >
            <Plus className="h-4 w-4" />
            New Issue
          </Button>
        }
      />

      {/* ===================================================
          STOCK ISSUE TABLE
      =================================================== */}

      <Card className="p-5">
        <DataTable
          columns={columns}
          data={issues}
          loading={loading}
          searchPlaceholder="Search issues..."
          initialSort={{
            key: 'issue_date',
            direction: 'desc',
          }}
        />
      </Card>

      {/* ===================================================
          NEW STOCK ISSUE MODAL
      =================================================== */}

      <Modal
        open={showModal}
        onClose={() =>
          setShowModal(false)
        }
        title="New Stock Issue"
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() =>
                setShowModal(false)
              }
            >
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              loading={saving}
            >
              Save Issue
            </Button>
          </>
        }
      >
        <div className="space-y-5">

          {/* ===============================================
              BASIC DETAILS
          =============================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* DEPARTMENT */}

            <Select
              label="Department *"
              value={
                form.department
              }
              onChange={(e) =>
                handleDepartmentChange(
                  e.target.value
                )
              }
            >
              {departments.map(
                (department) => (
                  <option
                    key={
                      department
                    }
                    value={
                      department
                    }
                  >
                    {department}
                  </option>
                )
              )}
            </Select>

            {/* REASON */}

            <Select
              label="Reason"
              value={
                form.reason
              }
              onChange={(e) =>
                setForm(
                  (prev) => ({
                    ...prev,
                    reason:
                      e.target.value,
                  })
                )
              }
            >
              {reasons.map(
                (reason) => (
                  <option
                    key={reason}
                    value={reason}
                  >
                    {reason}
                  </option>
                )
              )}
            </Select>

            {/* DATE */}

            <Input
              label="Date"
              type="date"
              value={
                form.issue_date
              }
              onChange={(e) =>
                setForm(
                  (prev) => ({
                    ...prev,
                    issue_date:
                      e.target.value,
                  })
                )
              }
            />
          </div>

          {/* ===============================================
              ITEMS SECTION
          =============================================== */}

          <div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Items
                </h4>

                <p className="text-xs text-slate-400 mt-0.5">
                  Showing items for{' '}
                  <span className="font-semibold text-slate-600">
                    {form.department}
                  </span>
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={
                  addLine
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            {/* =============================================
                NO ITEMS
            ============================================= */}

            {filteredItems.length ===
              0 && (
              <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                No inventory items found
                for{' '}
                <strong>
                  {form.department}
                </strong>
                .
              </div>
            )}

            {/* =============================================
                NO LINES
            ============================================= */}

            {lines.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
                <div className="mb-2">
                  No items added.
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={
                    addLine
                  }
                  disabled={
                    filteredItems.length ===
                    0
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
            ) : (
              <div className="space-y-3">

                {/* =========================================
                    ITEM LINES
                ========================================= */}

                {lines.map(
                  (
                    line,
                    idx
                  ) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end p-4 bg-slate-50 rounded-lg border border-slate-100"
                    >

                      {/* ITEM */}

                      <div className="sm:col-span-2">
                        <label className="text-xs text-slate-500 font-medium block mb-1">
                          Item *
                        </label>

                        <select
                          value={
                            line.item_id
                          }
                          onChange={(
                            e
                          ) => {
                            const value =
                              e.target
                                .value;

                            if (
                              value &&
                              isItemAlreadySelected(
                                value,
                                idx
                              )
                            ) {
                              toast(
                                'This item is already selected.',
                                'error'
                              );

                              return;
                            }

                            updateLine(
                              idx,
                              'item_id',
                              value
                            );
                          }}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="">
                            Select Item
                          </option>

                          {filteredItems.map(
                            (item) => {
                              const selectedElsewhere =
                                isItemAlreadySelected(
                                  item.id,
                                  idx
                                );

                              return (
                                <option
                                  key={
                                    item.id
                                  }
                                  value={
                                    item.id
                                  }
                                  disabled={
                                    selectedElsewhere
                                  }
                                >
                                  {item.name}
                                  {' '}
                                  (
                                  {formatNumber(
                                    item.current_stock
                                  )}
                                  {' '}
                                  {item.unit
                                    ?.symbol ||
                                    ''}
                                  )
                                </option>
                              );
                            }
                          )}
                        </select>
                      </div>

                      {/* QUANTITY */}

                      <div>
                        <label className="text-xs text-slate-500 font-medium block mb-1">
                          Qty *
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            line.quantity
                          }
                          onChange={(
                            e
                          ) =>
                            updateLine(
                              idx,
                              'quantity',
                              e.target
                                .value
                            )
                          }
                          placeholder="0"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      {/* UNIT */}

                      <div>
                        <label className="text-xs text-slate-500 font-medium block mb-1">
                          Unit
                        </label>

                        <select
                          value={
                            line.unit
                          }
                          onChange={(
                            e
                          ) =>
                            updateLine(
                              idx,
                              'unit',
                              e.target
                                .value
                            )
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="">
                            Select Unit
                          </option>

                          {/* DATABASE UNITS */}

                          {units.map(
                            (unit) => (
                              <option
                                key={
                                  unit.id
                                }
                                value={
                                  unit.symbol
                                }
                              >
                                {unit.name}
                                {' '}
                                (
                                {
                                  unit.symbol
                                }
                                )
                              </option>
                            )
                          )}

                          {/* ITEM UNIT
                              FALLBACK
                          */}

                          {line.unit &&
                            !units.some(
                              (
                                unit
                              ) =>
                                unit.symbol ===
                                line.unit
                            ) && (
                              <option
                                value={
                                  line.unit
                                }
                              >
                                {line.unit}
                              </option>
                            )}
                        </select>
                      </div>

                      {/* RATE */}

                      <div>
                        <label className="text-xs text-slate-500 font-medium block mb-1">
                          Rate
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            line.rate
                          }
                          onChange={(
                            e
                          ) =>
                            updateLine(
                              idx,
                              'rate',
                              e.target
                                .value
                            )
                          }
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      {/* TOTAL + DELETE */}

                      <div className="flex items-center gap-2">

                        <div className="flex-1">
                          <label className="text-xs text-slate-500 font-medium block mb-1">
                            Total
                          </label>

                          <div className="px-3 py-2.5 text-sm font-semibold bg-white rounded-lg border border-slate-200">
                            {formatCurrency(
                              lineTotal(
                                line
                              )
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeLine(
                              idx
                            )
                          }
                          className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                )}

                {/* =========================================
                    ADD ANOTHER ITEM
                ========================================= */}

                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={
                      addLine
                    }
                    disabled={
                      filteredItems.length ===
                      0
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Another Item
                  </Button>
                </div>

                {/* =========================================
                    GRAND TOTAL
                ========================================= */}

                <div className="flex justify-end pt-3 border-t border-slate-200">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">
                      Total Value
                    </p>

                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(
                        grandTotal
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===============================================
              NOTES
          =============================================== */}

          <Input
            label="Notes"
            value={
              form.notes
            }
            onChange={(e) =>
              setForm(
                (prev) => ({
                  ...prev,
                  notes:
                    e.target
                      .value,
                })
              )
            }
            placeholder="Optional notes"
          />
        </div>
      </Modal>
    </div>
  );
}