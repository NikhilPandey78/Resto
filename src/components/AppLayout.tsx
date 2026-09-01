import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  SlidersHorizontal, ClipboardCheck, Tags, Ruler, Truck, ShoppingCart,
  Undo2, ChefHat, CookingPot, UtensilsCrossed, TrendingDown, CalendarClock,
  FileBarChart, Building2, Users, Bell, History, Settings, HelpCircle, BrainCircuit, Banknote, ReceiptText, Armchair,
  Menu, X, LogOut, ChevronDown, CreditCard, Search,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn, getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  group: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', group: 'Overview' },
  { label: 'Subscription', icon: CreditCard, path: '/subscription', group: 'Overview' },
  { label: 'Inventory', icon: Package, path: '/inventory', group: 'Inventory' },
  { label: 'Stock In', icon: ArrowDownToLine, path: '/stock-in', group: 'Inventory' },
  { label: 'Stock Out', icon: ArrowUpFromLine, path: '/stock-out', group: 'Inventory' },
  { label: 'Stock Transfer', icon: ArrowLeftRight, path: '/stock-transfer', group: 'Inventory' },
  { label: 'Stock Adjustment', icon: SlidersHorizontal, path: '/stock-adjustment', group: 'Inventory' },
  { label: 'Stock Count', icon: ClipboardCheck, path: '/stock-count', group: 'Inventory' },
  { label: 'Categories', icon: Tags, path: '/categories', group: 'Inventory' },
  { label: 'Units', icon: Ruler, path: '/units', group: 'Inventory' },
  { label: 'Suppliers', icon: Truck, path: '/suppliers', group: 'Procurement' },
  { label: 'Purchase Orders', icon: ShoppingCart, path: '/purchase-orders', group: 'Procurement' },
  { label: 'Purchase Returns', icon: Undo2, path: '/purchase-returns', group: 'Procurement' },
  { label: 'Kitchen Requisitions', icon: ChefHat, path: '/kitchen-requisitions', group: 'Kitchen' },
  { label: 'Recipes', icon: CookingPot, path: '/recipes', group: 'Kitchen' },
  { label: 'Menu Items', icon: UtensilsCrossed, path: '/menu-items', group: 'Kitchen' },
  { label: 'Consumption', icon: TrendingDown, path: '/consumption', group: 'Kitchen' },
  { label: 'Food Cost', icon: Banknote, path: '/food-cost', group: 'Kitchen' },
  { label: 'Wastage', icon: TrendingDown, path: '/wastage', group: 'Kitchen' },
  { label: 'Expiry Management', icon: CalendarClock, path: '/expiry', group: 'Kitchen' },
  { label: 'Reports', icon: FileBarChart, path: '/reports', group: 'Insights' },
  { label: 'AI Insights', icon: BrainCircuit, path: '/ai-insights', group: 'Insights' },
  { label: 'Sales / POS', icon: Banknote, path: '/sales', group: 'Insights' },
  { label: 'KOT', icon: ReceiptText, path: '/kot', group: 'Insights' },
  { label: 'Tables', icon: Armchair, path: '/tables', group: 'Insights' },
  { label: 'Branches', icon: Building2, path: '/branches', group: 'Administration' },
  { label: 'Users', icon: Users, path: '/users', group: 'Administration' },
  { label: 'Notifications', icon: Bell, path: '/notifications', group: 'Administration' },
  { label: 'Activity Log', icon: History, path: '/activity-log', group: 'Administration' },
  { label: 'Settings', icon: Settings, path: '/settings', group: 'Administration' },
  { label: 'Help & Support', icon: HelpCircle, path: '/help', group: 'Administration' },
];

const groups = ['Overview', 'Inventory', 'Procurement', 'Kitchen', 'Insights', 'Administration'];
const comingSoonPaths = new Set(['/ai-insights', '/sales', '/kot', '/tables']);

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurant, restaurantUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Admin',
    manager: 'Manager',
    store_manager: 'Store Manager',
    purchase_manager: 'Purchase Manager',
    kitchen_manager: 'Kitchen Manager',
    staff: 'Staff',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100 flex-shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">BhojMitra</p>
            <p className="text-[10px] text-slate-400 truncate">Restaurant Inventory</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group}</p>
              <div className="space-y-0.5">
                {navItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                          active
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )}
                      >
                        <item.icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
                        <span className="truncate">{item.label}</span>
                        {comingSoonPaths.has(item.path) && <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">Soon</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3 flex-shrink-0">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex-shrink-0">
              {restaurantUser ? getInitials(restaurantUser.full_name) : '?'}
            </div>
            <div className="min-w-0 text-left flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{restaurantUser?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{restaurantUser ? roleLabels[restaurantUser.role] : ''}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{restaurant?.name}</p>
              <p className="text-xs text-slate-400">{restaurant?.city}, {restaurant?.state}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {restaurantUser ? getInitials(restaurantUser.full_name) : '?'}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
