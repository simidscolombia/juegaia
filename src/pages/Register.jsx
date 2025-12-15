import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { User, Mail, Lock, Phone as PhoneIcon, MapPin, Users } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Auto-fill referral from URL ?ref=CODE
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        documentId: '',
        referralCode: searchParams.get('ref') || ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Sign Up in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                    document_id: formData.documentId,
                    phone: formData.phone,
                    referral_code: formData.referralCode // Passed to trigger
                }
            }
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        // 2. Trigger handles Profile creation automatically.
        // Check if session is null (Email confirmation required)
        if (!authData.session) {
            alert("¡Registro casi listo! Por favor revisa tu correo para activar la cuenta.");
            navigate('/login');
        } else {
            alert("¡Registro Exitoso! Bienvenido a JuegAIA.");
            navigate('/dashboard');
        }

        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg)', padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: '#e94560', margin: 0 }}>Únete a JuegAIA</h2>
                    <p style={{ color: '#fff', opacity: 0.7 }}>Crea tu cuenta de Organizador</p>
                </div>

                {error && (
                    <div style={{ color: '#ff6b6b', padding: '10px', marginBottom: '1rem', border: '1px solid #ff6b6b', borderRadius: '8px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Input icon={<User size={18} />} name="fullName" placeholder="Nombre Completo" value={formData.fullName} onChange={handleChange} required />
                    <Input icon={<MapPin size={18} />} name="documentId" placeholder="Cédula / DNI" value={formData.documentId} onChange={handleChange} required />
                    <Input icon={<PhoneIcon size={18} />} name="phone" placeholder="Celular / WhatsApp" value={formData.phone} onChange={handleChange} required />
                    <Input icon={<Mail size={18} />} name="email" type="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required />
                    <Input icon={<Lock size={18} />} name="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required />

                    <div style={{ marginTop: '10px', borderTop: '1px solid #30475e', paddingTop: '10px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#4cc9f0', display: 'block', marginBottom: '5px' }}>¿Tienes Código de Referido?</label>
                        <Input icon={<Users size={18} />} name="referralCode" placeholder="Código (Opcional)" value={formData.referralCode} onChange={handleChange} />
                    </div>

                    <button type="submit" disabled={loading} style={{
                        marginTop: '1rem', background: '#4cc9f0', color: '#1a1a2e', padding: '12px', borderRadius: '8px',
                        fontWeight: 'bold', border: 'none', cursor: 'pointer'
                    }}>
                        {loading ? 'Creando cuenta...' : 'Registrarme'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#fff', fontSize: '0.9rem' }}>
                    ¿Ya tienes cuenta? <Link to="/login" style={{ color: '#e94560' }}>Inicia Sesión</Link>
                </div>
            </div>
        </div>
    );
};

const Input = ({ icon, ...props }) => (
    <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: '12px', top: '12px', color: '#a0a0a0' }}>{icon}</div>
        <input
            {...props}
            style={{
                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px',
                border: '1px solid #30475e', background: '#0f3460', color: 'white'
            }}
        />
    </div>
);

export default Register;
