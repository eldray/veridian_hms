// src/components/Sidebar.tsx
import React from 'react';
import { 
  X, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  FileText, 
  BarChart3, 
  Users, 
  Settings,
  Receipt,
  Warehouse,
  Store
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  userRole: string;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: string[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'cashier', 'officer'] },
  { icon: ShoppingCart, label: 'Point of Sale', path: '/dashboard/pos', roles: ['admin', 'cashier'] },
  { icon: Receipt, label: 'Sales', path: '/dashboard/sales', roles: ['admin', 'cashier', 'officer'] },
  { icon: Package, label: 'Products', path: '/dashboard/products', roles: ['admin', 'officer'] },
  { icon: Warehouse, label: 'Inventory', path: '/dashboard/inventory', roles: ['admin', 'officer'] },
  { icon: Truck, label: 'Suppliers', path: '/dashboard/suppliers', roles: ['admin', 'officer'] },
  { icon: FileText, label: 'Purchase Orders', path: '/dashboard/purchase-orders', roles: ['admin', 'officer'] },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', roles: ['admin'] },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['admin'] },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentPath, userRole }) => {
  const location = useLocation();
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Completely Fixed */}
      <div className={`
        fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 border-r border-white/10 z-50
        flex flex-col transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header - Balanced Padding */}
        <div className="flex-shrink-0 px-5 py-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <span className="text-lg font-bold text-white">PharmacyPOS</span>
                <p className="text-xs text-white/60">Management System</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation - Comfortable spacing */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-3 py-5 space-y-1.5">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  className={`
                    flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 group
                    ${active 
                      ? 'bg-white/20 text-white border border-white/20 backdrop-blur-sm shadow-lg' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white border border-transparent'
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 mr-3 ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
                  <span className="text-sm">{item.label}</span>
                  {active && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer - Balanced */}
        <div className="flex-shrink-0 border-t border-white/10 p-3 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">PharmacyPOS v1.0</span>
            <span className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-xs font-medium shadow">
              Online
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
