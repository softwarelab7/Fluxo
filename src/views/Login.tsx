import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Logo } from '../components/Logo';
import { Lock, Mail, Loader2, Eye, EyeOff, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';


export const Login: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const [mode, setMode] = useState<'login' | 'register'>('login');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                // Check if user is approved
                if (data.user) {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('is_approved, role')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError) throw profileError;

                    // Admins are always authorized, employees must be is_approved
                    if (!profile?.is_approved && profile?.role !== 'admin') {
                        await supabase.auth.signOut();
                        setError('Tu cuenta está pendiente de aprobación por el administrador.');
                    }
                }
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });

                if (error) throw error;
                setMessage('Cuenta creada con éxito. El administrador debe autorizarte antes de que puedas entrar.');
                setMode('login');
            }
        } catch (err: any) {
            setError(err.message || 'Error en la autenticación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#020617] p-4 relative">
            <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="absolute top-4 right-4 p-2 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="max-w-md w-full bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200 dark:border-[#1e293b] overflow-hidden">

                <div className="p-8">
                    <div className="flex flex-col items-center mb-8">
                        <Logo className="w-12 h-12 mb-4" />
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center">
                            {mode === 'login' ? 'Bienvenido a Fluxo' : 'Crea tu Cuenta'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-center mt-2">
                            {mode === 'login'
                                ? 'Ingresa tus credenciales para continuar'
                                : 'Completa tus datos para registrarte'}
                        </p>
                    </div>

                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6">
                        <button
                            onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Ingresar
                        </button>
                        <button
                            onClick={() => { setMode('register'); setError(null); setMessage(null); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Registrarse
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {mode === 'register' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Nombre Completo
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="Tu nombre"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="ejemplo@fluxo.app"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg flex items-start">
                                <span>{error}</span>
                            </div>
                        )}

                        {message && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm p-3 rounded-lg flex items-start text-center">
                                <span>{message}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'
                            )}
                        </button>
                    </form>
                </div>
                <div className="bg-slate-50 dark:bg-[#1e293b]/50 px-8 py-4 border-t border-slate-200 dark:border-[#1e293b]">
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                        {mode === 'login'
                            ? '¿No tienes cuenta? Regístrate arriba y espera autorización.'
                            : 'Al registrarte, un administrador deberá autorizar tu acceso.'}
                    </p>
                </div>
            </div>
        </div>
    );
};
