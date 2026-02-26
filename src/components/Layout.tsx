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
  PackageX,
  TrendingUp
} from 'lucide-react';
import { Logo } from './Logo';

import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeProvider';

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
  userRole?: 'admin' | 'employee' | null;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [missingCount, setMissingCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const { theme, setTheme } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();

  const isDark = theme === 'dark';

  useEffect(() => {
    checkMissingItems();
    const interval = setInterval(checkMissingItems, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  // Check missing items on route change
  useEffect(() => {
    checkMissingItems();
  }, [location.pathname]);

  const checkMissingItems = async () => {
    try {
      const actionItems = await repository.getActionItems();

      // 'No llegó' e 'Incompleto' van al contador de Faltantes
      const missingCount = actionItems.filter(i => i.estado_item === 'No llegó' || i.estado_item === 'Incompleto').length;
      setMissingCount(missingCount);

      // 'Agotado' va al contador de Agotados
      const oosCount = actionItems.filter(i => i.estado_item === 'Agotado').length;
      setOutOfStockCount(oosCount);
    } catch (error) {
      console.error("Error checking sidebar counts:", error);
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { id: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: '/inventory', label: 'Catálogo', icon: Package },
    { id: '/orders', label: 'Nuevo Pedido', icon: ShoppingCart },
    { id: '/pending-orders', label: 'Pendientes', icon: ClipboardCheck },
    { id: '/audit', label: 'Auditoría', icon: Layers },
    { id: '/performance', label: 'Desempeño', icon: TrendingUp },
  ];

  const navItems = [...menuItems];

  if (missingCount > 0) {
    navItems.push({
      id: '/missing-items',
      label: 'Faltantes',
      icon: PackageX,
      // @ts-ignore
      badge: missingCount,
      variant: 'alert'
    });
  }

  navItems.push({
    id: '/out-of-stock',
    label: 'Agotados',
    icon: Bell,
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
                active={location.pathname === item.id || (item.id !== '/' && location.pathname.startsWith(item.id))}
                // @ts-ignore
                badge={item.badge}
                // @ts-ignore
                variant={item.variant}
                onClick={() => {
                  navigate(item.id);
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
            onClick={() => navigate('/settings')}
            active={location.pathname === '/settings'}
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
