import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/dashboard');
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard',
            }
        });
        if (error) setError(error.message);
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg)', padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: '#e94560', margin: 0 }}>JuegAIA</h1>
                    <p style={{ color: '#fff', opacity: 0.7 }}>Acceso Organizadores</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(233, 69, 96, 0.2)', color: '#ff6b6b',
                        padding: '10px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e94560'
                    }}>
                        {error.includes("Email not confirmed")
                            ? "Por favor confirma tu correo electrónico antes de iniciar sesión."
                            : error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a0a0a0' }} />
                        <input
                            type="email"
                            placeholder="Correo Electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px',
                                border: '1px solid #30475e', background: '#0f3460', color: 'white'
                            }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#a0a0a0' }} />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px',
                                border: '1px solid #30475e', background: '#0f3460', color: 'white'
                            }}
                        />
                    </div>

                    <button type="submit" disabled={loading} style={{
                        background: '#e94560', color: 'white', padding: '12px', borderRadius: '8px',
                        fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px'
                    }}>
                        {loading ? 'Entrando...' : <><LogIn size={18} /> Iniciar Sesión</>}
                    </button>
                </form>

                <div style={{ margin: '1.5rem 0', textAlign: 'center', opacity: 0.5, borderBottom: '1px solid #30475e', lineHeight: '0.1em' }}>
                    <span style={{ background: '#16213e', padding: '0 10px' }}>O</span>
                </div>

                <button onClick={handleGoogleLogin} style={{
                    width: '100%', background: 'white', color: '#333', padding: '12px', borderRadius: '8px',
                    fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}>
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="20" />
                    Continuar con Google
                </button>

                <div style={{ marginTop: '2rem', textAlign: 'center', color: '#fff', fontSize: '0.9rem' }}>
                    ¿No tienes cuenta? <Link to="/register" style={{ color: '#4cc9f0' }}>Regístrate Gratis</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
