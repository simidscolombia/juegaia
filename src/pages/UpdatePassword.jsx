import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';

const UpdatePassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password.length < 6) {
            return setError('La contraseña debe tener al menos 6 caracteres.');
        }

        if (password !== confirmPassword) {
            return setError('Las contraseñas no coinciden.');
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            setMessage('¡Contraseña actualizada exitosamente!');
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg)', color: 'white', padding: '1rem'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div style={{
                    width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto', color: '#38bdf8'
                }}>
                    <Lock size={30} />
                </div>
                <h2>Restablecer Contraseña</h2>
                <p style={{ opacity: 0.7, marginBottom: '20px' }}>Ingresa tu nueva contraseña para asegurar tu cuenta.</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Nueva Contraseña"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '10px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                        }}
                    />
                    <input
                        type="password"
                        placeholder="Confirmar Contraseña"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '20px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                        }}
                    />

                    {error && <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</div>}
                    {message && (
                        <div style={{ color: '#10b981', marginBottom: '15px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <CheckCircle size={16} /> {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
