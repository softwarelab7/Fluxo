import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Shield, ShieldAlert, User, Search, Loader2 } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

interface Profile {
    id: string;
    email: string;
    role: 'admin' | 'employee';
    full_name?: string;
    created_at: string;
}

export const Users: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    useEffect(() => {
        fetchUsers();
        checkCurrentUser();
    }, []);

    const checkCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            setCurrentUserRole(data?.role || 'employee');
        }
    };

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'employee') => {
        if (currentUserRole !== 'admin') {
            alert('Solo los administradores pueden cambiar roles.');
            return;
        }

        setUpdating(userId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Error al actualizar el rol');
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Usuarios</h2>
                    <p className="text-slate-500 dark:text-slate-400">Administra los permisos y roles del equipo</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-[#1e293b] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-[#1e293b]/50 border-b border-slate-200 dark:border-[#1e293b]">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha Registro</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#1e293b]">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#1e293b]/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white">{user.email}</div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400">{user.full_name || 'Sin nombre'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.role === 'admin'
                                                ? 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30'
                                                : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                                                }`}
                                        >
                                            {user.role === 'admin' ? <ShieldAlert className="w-3 h-3 mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
                                            {user.role === 'admin' ? 'Administrador' : 'Empleado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {currentUserRole === 'admin' && (
                                            <div className="flex items-center space-x-2">
                                                {updating === user.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                                ) : (
                                                    <CustomSelect
                                                        value={user.role}
                                                        onChange={(value) => handleRoleChange(user.id, value as 'admin' | 'employee')}
                                                        options={[
                                                            { value: 'employee', label: 'Empleado' },
                                                            { value: 'admin', label: 'Administrador' }
                                                        ]}
                                                        className="min-w-[160px]"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
