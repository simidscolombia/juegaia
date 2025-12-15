import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, KeyRound, Phone, Smartphone, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { verifyGamePin } from '../utils/storage';
import { verifyGamePin } from '../utils/storage';
import { countryCodes } from '../utils/countryCodes';
import simidsLogo from '../assets/simids-logo.jpg';

const Login = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('player'); // 'player' | 'admin'

    // Admin/Client State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Player (Fast Access) State
    const [countryCode, setCountryCode] = useState('57');
    const [playerPhone, setPlayerPhone] = useState('');
    const [gamePin, setGamePin] = useState('');
    const [checkingPin, setCheckingPin] = useState(false);

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
            // Check role or just send to dashboard (Dashboard handles role redirect usually)
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

    const handleFastAccess = async (e) => {
        e.preventDefault();
        if (!playerPhone || !gamePin) return;

        setCheckingPin(true);
        setError(null);

        try {
            const result = await verifyGamePin(playerPhone, gamePin);

            // "Login" as guest by saving to local storage (simple auth)
            localStorage.setItem('juegaia_guest', JSON.stringify({
                phone: playerPhone,
                pin: gamePin,
                lastGame: result.gameId
            }));

            // Direct Redirect
            if (result.type === 'BINGO') {
                navigate(`/play/${result.gameId}?card=${result.ticketId}`);
            } else if (result.type === 'RAFFLE') {
                navigate(`/raffle-tv/${result.gameId}`);
                // Suggestion: Maybe a specific 'raffle/view' for user? 
                // For now TV mode shows winner, maybe we need a '/raffle/check/:id' later.
                // But user asked to "enter directly".
                // Let's send to RafflePublic for now as it shows status.
                navigate(`/raffle/${result.gameId}`);
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setCheckingPin(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 10%, #1f2937 0%, #0f172a 100%)', padding: '1rem', color: 'white'
        }}>
            {/* Header Brand */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{
                    fontSize: '3rem', fontWeight: '900', margin: 0,
                    background: 'linear-gradient(to right, #e11d48, #fb7185)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 30px rgba(225, 29, 72, 0.5)'
                }}>
                    JuegAIA
                </h1>
                <p style={{ opacity: 0.7, letterSpacing: '2px', fontSize: '0.9rem' }}>PLATAFORMA DE JUEGOS</p>
            </div>

            <div className="card" style={{
                width: '100%', maxWidth: '420px', padding: 0, overflow: 'hidden',
                background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                margin: '10px'
            }}>
                {/* Tabs Header */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={() => setActiveTab('player')}
                        style={{
                            flex: 1, padding: '20px', background: activeTab === 'player' ? 'rgba(225, 29, 72, 0.1)' : 'transparent',
                            border: 'none', color: activeTab === 'player' ? '#fb7185' : 'rgba(255,255,255,0.5)',
                            fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s',
                            borderBottom: activeTab === 'player' ? '3px solid #fb7185' : '3px solid transparent'
                        }}
                    >
                        <UserCheck size={20} style={{ marginBottom: '-5px', marginRight: '5px' }} />
                        JUGADOR
                    </button>
                    <button
                        onClick={() => setActiveTab('admin')}
                        style={{
                            flex: 1, padding: '20px', background: activeTab === 'admin' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                            border: 'none', color: activeTab === 'admin' ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                            fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s',
                            borderBottom: activeTab === 'admin' ? '3px solid #38bdf8' : '3px solid transparent'
                        }}
                    >
                        <ShieldCheck size={20} style={{ marginBottom: '-5px', marginRight: '5px' }} />
                        ORGANIZADOR
                    </button>
                </div>

                <div style={{ padding: '30px' }}>

                    {/* ERROR ALERT */}
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5',
                            padding: '12px', borderRadius: '8px', marginBottom: '1.5rem',
                            fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.5)', display: 'flex', alignItems: 'center', gap: '10px'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* === PLAYER TAB === */}
                    {activeTab === 'player' && (
                        <form onSubmit={handleFastAccess} className="fade-in">
                            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 5px 0' }}>👋 ¡Bienvenido a tu Juego!</h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.6, margin: 0 }}>Ingresa tus datos para abrir tu cartón.</p>
                            </div>

                            <div style={{ position: 'relative', marginBottom: '15px' }}>
                                <Smartphone size={18} style={{ position: 'absolute', left: '15px', top: '14px', color: '#9ca3af' }} />
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        style={{
                                            padding: '14px 5px', borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                                            color: 'white', fontSize: '1rem', outline: 'none', maxWidth: '90px'
                                        }}
                                    >
                                        {countryCodes.map(c => (
                                            <option key={c.code} value={c.code} style={{ color: 'black' }}>{c.flag} +{c.code}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="tel"
                                        placeholder="Número de Celular"
                                        value={playerPhone}
                                        onChange={e => setPlayerPhone(e.target.value.replace(/\D/g, ''))}
                                        required
                                        style={{
                                            flex: 1, padding: '14px', borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                                            color: 'white', fontSize: '1rem', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ position: 'relative', marginBottom: '25px' }}>
                                <KeyRound size={18} style={{ position: 'absolute', left: '15px', top: '14px', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    placeholder="PIN / Código del Ticket"
                                    value={gamePin}
                                    onChange={e => setGamePin(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', padding: '14px 14px 14px 45px', borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                                        color: 'white', fontSize: '1rem', outline: 'none'
                                    }}
                                />
                            </div>

                            <button type="submit" disabled={checkingPin} style={{
                                width: '100%', background: 'linear-gradient(90deg, #e11d48 0%, #be123c 100%)',
                                color: 'white', padding: '16px', borderRadius: '10px',
                                fontSize: '1.1rem', fontWeight: 'bold', border: 'none',
                                cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(225, 29, 72, 0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}>
                                {checkingPin ? 'Verificando...' : <>ENTRAR A JUGAR <ArrowRight size={20} /></>}
                            </button>

                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>
                                    ¿Aún no tienes ticket? Contacta a tu organizador.
                                </p>
                            </div>

                            <div style={{ margin: '1.5rem 0', textAlign: 'center', opacity: 0.3, borderBottom: '1px solid #fff', lineHeight: '0.1em' }}>
                                <span style={{ background: '#1e293b', padding: '0 10px' }}>O</span>
                            </div>

                            <button type="button" onClick={handleGoogleLogin} style={{
                                width: '100%', background: 'white', color: '#333', padding: '14px', borderRadius: '10px',
                                fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}>
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="20" />
                                Gestionar mi Cuenta (Google)
                            </button>
                        </form>
                    )}

                    {/* === ADMIN / CLIENT TAB === */}
                    {activeTab === 'admin' && (
                        <form onSubmit={handleLogin} className="fade-in">
                            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 5px 0' }}>Panel de Control</h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.6, margin: 0 }}>Gestiona tus eventos o revisa tu cuenta de cliente.</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '15px', top: '14px', color: '#9ca3af' }} />
                                    <input
                                        type="email"
                                        placeholder="Correo Electrónico"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        style={{
                                            width: '100%', padding: '14px 14px 14px 45px', borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                                            color: 'white', fontSize: '1rem', outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '15px', top: '14px', color: '#9ca3af' }} />
                                    <input
                                        type="password"
                                        placeholder="Contraseña"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{
                                            width: '100%', padding: '14px 14px 14px 45px', borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                                            color: 'white', fontSize: '1rem', outline: 'none'
                                        }}
                                    />
                                </div>

                                <button type="submit" disabled={loading} style={{
                                    background: '#38bdf8', color: '#0f172a', padding: '14px', borderRadius: '10px',
                                    fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px',
                                    fontSize: '1rem', marginTop: '5px'
                                }}>
                                    {loading ? 'Validando...' : <><LogIn size={18} /> Iniciar Sesión</>}
                                </button>
                            </div>

                            <div style={{ margin: '1.5rem 0', textAlign: 'center', opacity: 0.3, borderBottom: '1px solid #fff', lineHeight: '0.1em' }}>
                                <span style={{ background: '#172033', padding: '0 10px' }}>O</span>
                            </div>

                            <button type="button" onClick={handleGoogleLogin} style={{
                                width: '100%', background: 'white', color: '#333', padding: '14px', borderRadius: '10px',
                                fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}>
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="20" />
                                Continuar con Google
                            </button>

                            <div style={{ marginTop: '2rem', textAlign: 'center', color: '#fff', fontSize: '0.9rem' }}>
                                ¿Eres nuevo organizando? <Link to="/register" style={{ color: '#38bdf8', fontWeight: 'bold' }}>Crea tu cuenta</Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <style>{`
                .fade-in { animation: fadeIn 0.4s ease-in-out; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Branding Footer */}
            <div style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.8 }}>
                <img
                    src={simidsLogo}
                    alt="SIMIDS Logo"
                    style={{ height: '24px', marginBottom: '5px', borderRadius: '4px' }}
                />
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
                    POWERED BY <strong>SIMIDS-IA</strong>
                </div>
            </div>
        </div>
    );
};

export default Login;
