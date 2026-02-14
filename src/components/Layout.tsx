import React, { useState, useEffect } from 'react';
import { repository } from '../services/repository';
import { supabase } from '../services/supabase';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardCheck,
  Settings,
  Menu,
  X,
  Truck,
  Moon,
  Sun,
  Layers,
  Clock,
  AlertTriangle,
  ChevronRight,
  Bell,
  Users as UsersIcon,
  LogOut,
  Bookmark,
  PackageX
} from 'lucide-react';
import { Logo } from './Logo';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
  variant?: 'default' | 'alert';
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick, badge, variant = 'default' }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2 rounded-full transition-all duration-200 group ${variant === 'alert'
      ? (active ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-bold' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-50 dark:hover:bg-rose-500/10')
      : (active ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#27273a] hover:text-slate-900 dark:hover:text-slate-200')
      }`}
  >
    <div className="flex items-center space-x-3">
      <Icon size={18} />
      <span className="font-medium text-sm">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${variant === 'alert' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}>
        {badge}
      </span>
    )}
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
  userRole?: 'admin' | 'employee' | null;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView, userRole }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [missingCount, setMissingCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    checkMissingItems();
    const interval = setInterval(checkMissingItems, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkMissingItems();
  }, [activeView]);

  const checkMissingItems = async () => {
    try {
      // Use the new optimized method to get all action items in one request
      // @ts-ignore
      const items = await repository.getActionItems();

      let count = 0;
      let stockCount = 0;

      items.forEach((i: any) => {
        // Double check filter here just in case, though query handles it
        if (i.estado_item === 'Incompleto' || i.estado_item === 'No llegó') count++;
        if (i.estado_item === 'Agotado') stockCount++;
      });

      setMissingCount(count);
      setOutOfStockCount(stockCount);
    } catch (e) {
      console.error("Error checking missing items:", e);
    }
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'orders', label: 'Nuevo Pedido', icon: ShoppingCart },
    { id: 'pending-orders', label: 'Pendientes', icon: ClipboardCheck },
    { id: 'classification', label: 'Clasificación', icon: Bookmark },
    { id: 'audit', label: 'Auditoría', icon: Layers },
  ];

  // Users and Suppliers moved to Settings


  const pageTitle = menuItems.find(item => item.id === activeView)?.label || 'Fluxo';

  const navItems = [...menuItems];
  // Faltantes
  navItems.push({
    id: 'missing-items',
    label: 'Faltantes',
    icon: AlertTriangle,
    // @ts-ignore
    badge: missingCount,
    // @ts-ignore
    variant: 'alert'
  });

  // Agotados
  navItems.push({
    id: 'out-of-stock',
    label: 'Agotados',
    icon: PackageX,
    // @ts-ignore
    badge: outOfStockCount,
    // @ts-ignore
    variant: 'default'
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#020617] transition-colors duration-300">


      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-lg text-slate-700 dark:text-slate-200 shadow-md"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 
        bg-white dark:bg-[#0f172a] 
        border-r border-slate-200 dark:border-[#1e293b] 
        transition-all duration-300 transform
        lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-2xl lg:shadow-none
      `}>
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-6 px-2">
            <Logo className="w-8 h-8" />
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-300 dark:to-violet-300">
              Fluxo
            </h1>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeView === item.id}
                // @ts-ignore
                badge={item.badge}
                // @ts-ignore
                variant={item.variant}
                onClick={() => {
                  setActiveView(item.id);
                  setSidebarOpen(false);
                }}
              />
            ))}
          </nav>
        </div>

        <div className="absolute bottom-4 left-4 right-4 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-full transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#27273a] hover:text-slate-900 dark:hover:text-slate-200"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span className="font-medium text-sm">{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          <SidebarItem
            icon={Settings}
            label="Configuración"
            onClick={() => setActiveView('settings')}
            active={activeView === 'settings'}
          />

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-full transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 group"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-8 custom-scrollbar">
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
