import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Inventory from './views/Inventory';
import Orders from './views/Orders';
import Audit from './views/Audit';
import Suppliers from './views/Suppliers';
import Settings from './views/Settings';
import Classification from './views/Classification';
import { ToastProvider } from './components/Toast';
import { supabase } from './services/supabase';
import { Login } from './views/Login';
import { Users } from './views/Users';
import MissingItems from './views/MissingItems';
import OutOfStock from './views/OutOfStock';
import Performance from './views/Performance';

const App: React.FC = () => {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as any);
      if (session) fetchUserRole(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as any);
      if (session) fetchUserRole(session.user.id);
      else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserRole(data.role as any);
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#020617]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <ToastProvider>
      <Layout userRole={userRole}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/orders" element={<Orders initialViewMode="CREATE" />} />
          <Route path="/pending-orders" element={<Orders initialViewMode="LIST" />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/missing-items" element={<MissingItems />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/out-of-stock" element={<OutOfStock />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/classification" element={<Classification />} />
          <Route path="/settings" element={<Settings userRole={userRole} />} />
          <Route path="/users" element={<Users />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ToastProvider>
  );
};

export default App;
