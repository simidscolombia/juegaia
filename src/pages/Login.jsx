import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, KeyRound, Phone, Smartphone, ArrowRight, UserCheck, ShieldCheck, ArrowLeft } from 'lucide-react';
import { verifyGamePin } from '../utils/storage';
import { countryCodes } from '../utils/countryCodes';
import simidsLogo from '../assets/simids-logo.jpg';

const Login = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Setup Referral Code if present in URL
    useEffect(() => {
        const refCode = searchParams.get('ref');
        if (refCode) {
            localStorage.setItem('referral_code', refCode);
        }
    }, [searchParams]);

    // UI State
    const [step, setStep] = useState(1); // 1: Identity, 2: Challenge (Pin/Pass)
    const [identity, setIdentity] = useState(''); // Stores email or phone
    const [authMode, setAuthMode] = useState(null); // 'PLAYER' | 'ADMIN'

    // Auth Data
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [countryCode, setCountryCode] = useState('57'); // Colombia Default

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- STEP 1: IDENTIFY USER ---
    const handleIdentitySubmit = (e) => {
        e.preventDefault();
        setError(null);

        const input = identity.trim();
        if (!input) return;

        // 1. Check if Email (Admin)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(input)) {
            setAuthMode('ADMIN');
            setStep(2);
            return;
        }

        // 2. Check if Phone (Player) - Allow basic number format
        const phoneRegex = /^\d+$/;
        if (phoneRegex.test(input.replace(/\s/g, ''))) { // Remove spaces for check
            setAuthMode('PLAYER');
            setStep(2);
            return;
        }

        // 3. Fallback / Invalid
        setError('Ingresa un correo válido o un número de celular.');
    };

    // --- STEP 2: AUTHENTICATE ---
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (authMode === 'ADMIN') {
                // Admin Login
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: identity,
                    password: password,
                });

                if (error) throw error;
                navigate('/dashboard');

            } else if (authMode === 'PLAYER') {
                // Player Login
                // Construct full phone with country code? 
                // Currently legacy logic assumes user only types local number if country code dropdown used.
                // But simplified input might include it? 
                // Let's stick to: we used the 'identity' as the local number, and we prepend countryCode.

                const fullPhone = identity; // Logic: verifyGamePin uses 'ilike' match.
                // NOTE: verifyGamePin compares against database. 
                // If user registered with "57300...", and types "300...", ilike '%300...' works.

                const result = await verifyGamePin(fullPhone, pin);

                // Save Guest Session
                localStorage.setItem('juegaia_guest', JSON.stringify({
                    phone: fullPhone,
                    pin: pin,
                    lastGame: result.gameId
                }));

                // Redirect
                if (result.type === 'BINGO') {
                    navigate(`/play/${result.gameId}?card=${result.ticketId}`);
                } else if (result.type === 'RAFFLE') {
                    navigate(`/raffle/${result.gameId}`);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        // Retrieve referral code to try and pass it (Best effort)
        const refCode = localStorage.getItem('referral_code');

        // Supabase OAuth doesn't easily support metadata on signup via this method solely,
        // unless we use specific flow options, but let's try passing query params just in case custom logic exists.
        // Primarily, standard admins don't need referral logic as strictly as partners, but nice to have.

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard',
                queryParams: refCode ? { ref: refCode } : undefined // Pass to URL
            }
        });
        if (error) setError(error.message);
    };

    const reset = () => {
        setStep(1);
        setError(null);
        setPassword('');
        setPin('');
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 10%, #1f2937 0%, #0f172a 100%)', padding: '1rem', color: 'white',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* BRANDING */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem', transform: step === 2 ? 'scale(0.9)' : 'scale(1)', transition: 'all 0.5s' }}>
                <h1 style={{
                    fontSize: '3.5rem', fontWeight: '900', margin: 0,
                    background: 'linear-gradient(to right, #e11d48, #fb7185)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 30px rgba(225, 29, 72, 0.4)',
                    letterSpacing: '-1px'
                }}>
                    JuegAIA
                </h1>
                <p style={{ opacity: 0.7, letterSpacing: '2px', fontSize: '0.9rem', marginTop: '5px' }}>PLATAFORMA DE JUEGOS</p>
            </div>

            {/* CARD CONTAINER */}
            <div className="card" style={{
                width: '100%', maxWidth: '400px', padding: '40px 30px',
                background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative', overflow: 'hidden'
            }}>

                {/* Back Button (Only step 2) */}
                {step === 2 && (
                    <button
                        onClick={reset}
                        style={{
                            position: 'absolute', top: '20px', left: '20px',
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        <ArrowLeft size={16} /> Volver
                    </button>
                )}

                {/* ANIMATED CONTENT */}
                <div style={{ animation: 'fadeIn 0.5s ease' }}>

                    {/* --- STEP 1: IDENTITY --- */}
                    {step === 1 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>Bienvenido</h2>
                                <p style={{ opacity: 0.6, fontSize: '0.95rem', margin: 0 }}>Ingresa para jugar o administrar</p>
                            </div>

                            <form onSubmit={handleIdentitySubmit}>
                                <div style={{ position: 'relative', marginBottom: '20px' }}>
                                    <UserCheck size={20} style={{ position: 'absolute', left: '15px', top: '15px', color: '#9ca3af' }} />
                                    <input
                                        type="text"
                                        placeholder="Celular o Correo Electrónico"
                                        value={identity}
                                        onChange={e => setIdentity(e.target.value)}
                                        autoFocus
                                        style={{
                                            width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.6)',
                                            color: 'white', fontSize: '1.1rem', outline: 'none', transition: 'border 0.3s'
                                        }}
                                    />
                                </div>

                                {error && (
                                    <div style={{ color: '#fb7185', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
                                        {error}
                                    </div>
                                )}

                                <button type="submit" style={{
                                    width: '100%', background: 'white', color: '#0f172a',
                                    padding: '16px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold',
                                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    marginBottom: '25px', transition: 'transform 0.2s'
                                }}>
                                    Continuar <ArrowRight size={20} />
                                </button>
                            </form>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', opacity: 0.3 }}>
                                <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
                                <span style={{ fontSize: '0.8rem' }}>O</span>
                                <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
                            </div>

                            <button onClick={handleGoogleLogin} style={{
                                width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white',
                                padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: '500',
                                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                transition: 'background 0.3s'
                            }}>
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="20" />
                                Continuar con Google
                            </button>
                        </>
                    )}

                    {/* --- STEP 2: CHALLENGE (PASSWORD or PIN) --- */}
                    {step === 2 && (
                        <form onSubmit={handleAuthSubmit}>
                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%', background: authMode === 'ADMIN' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(225, 29, 72, 0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto',
                                    color: authMode === 'ADMIN' ? '#38bdf8' : '#fb7185'
                                }}>
                                    {authMode === 'ADMIN' ? <ShieldCheck size={30} /> : <Smartphone size={30} />}
                                </div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>
                                    {authMode === 'ADMIN' ? 'Hola Administrador' : 'Hola Jugador'}
                                </h2>
                                <p style={{ opacity: 0.6, fontSize: '0.9rem', margin: 0 }}>{identity}</p>
                            </div>

                            {authMode === 'ADMIN' ? (
                                // Admin Password Input
                                <div style={{ position: 'relative', marginBottom: '25px' }}>
                                    <Lock size={20} style={{ position: 'absolute', left: '15px', top: '15px', color: '#9ca3af' }} />
                                    <input
                                        type="password"
                                        placeholder="Contraseña"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoFocus
                                        style={{
                                            width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.6)',
                                            color: 'white', fontSize: '1.1rem', outline: 'none'
                                        }}
                                    />
                                </div>
                            ) : (
                                // Player PIN Input
                                <div style={{ position: 'relative', marginBottom: '25px' }}>
                                    <KeyRound size={20} style={{ position: 'absolute', left: '15px', top: '15px', color: '#9ca3af' }} />
                                    <input
                                        type="text"
                                        placeholder="PIN de tu Ticket (4 Dígitos)"
                                        value={pin}
                                        onChange={e => setPin(e.target.value)}
                                        maxLength={10}
                                        autoFocus
                                        style={{
                                            width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.6)',
                                            color: 'white', fontSize: '1.1rem', outline: 'none'
                                        }}
                                    />
                                </div>
                            )}

                            {error && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5',
                                    padding: '10px', borderRadius: '8px', fontSize: '0.85rem',
                                    marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={loading} style={{
                                width: '100%',
                                background: authMode === 'ADMIN' ? '#38bdf8' : 'linear-gradient(90deg, #e11d48 0%, #be123c 100%)',
                                color: authMode === 'ADMIN' ? '#0f172a' : 'white',
                                padding: '16px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: authMode === 'ADMIN' ? '0 4px 15px rgba(56, 189, 248, 0.3)' : '0 4px 15px rgba(225, 29, 72, 0.4)'
                            }}>
                                {loading ? 'Verificando...' : (authMode === 'ADMIN' ? 'Iniciar Sesión' : 'Entrar a Jugar')}
                                {!loading && <ArrowRight size={20} />}
                            </button>

                            {authMode === 'ADMIN' && (
                                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                    <Link to="/register" style={{ color: '#38bdf8', fontSize: '0.9rem', textDecoration: 'none' }}>
                                        ¿No tienes cuenta? Regístrate aquí
                                    </Link>
                                </div>
                            )}
                        </form>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.6 }}>
                <img src={simidsLogo} alt="SIMIDS" style={{ height: '20px', opacity: 0.8, marginBottom: '5px' }} />
                <div style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>POWERED BY SIMIDS-IA</div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                input::placeholder { color: rgba(255,255,255,0.3); }
            `}</style>
        </div>
    );
};

export default Login;
