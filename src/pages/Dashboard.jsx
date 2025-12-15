import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getWallet } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { LayoutDashboard, Ticket, ArrowRight, Wallet, Trophy, Settings, Copy, Plus } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState({ balance: 0 });
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        loadData();
        checkTransaction();
    }, []);

    const checkTransaction = async () => {
        const params = new URLSearchParams(window.location.search);
        const transactionId = params.get('id');

        if (transactionId) {
            setVerifying(true);
            try {
                // Verification logic remains same...
                const response = await fetch(`https://production.wompi.co/v1/transactions/${transactionId}`, {
                    headers: { 'Authorization': `Bearer ${import.meta.env.VITE_WOMPI_PUB_KEY}` }
                });
                const data = await response.json();
                const transaction = data.data;

                if (transaction.status === 'APPROVED') {
                    const { error } = await supabase.rpc('process_recharge_with_mlm', {
                        p_user_id: profile?.id || (await supabase.auth.getUser()).data.user?.id,
                        p_amount: transaction.amount_in_cents / 100,
                        p_reference: transaction.reference,
                        p_wompi_id: transaction.id
                    });

                    if (!error || error.code === '23505') {
                        alert('¡Recarga Exitosa! Saldo actualizado.');
                        loadData();
                    } else {
                        alert('Error: ' + error.message);
                    }
                }
            } catch (err) {
                console.error('Verification Error:', err);
            } finally {
                setVerifying(false);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    };

    const loadData = async () => {
        const [p, w] = await Promise.all([getProfile(), getWallet()]);
        if (p) setProfile(p);
        if (w) setWallet(w);
    };

    const copyLink = () => {
        const link = `${window.location.origin}/register?ref=${profile?.referral_code}`;
        navigator.clipboard.writeText(link);
        alert('Enlace copiado al portapapeles!');
    };

    // --- STYLES ---
    const gradientText = {
        background: 'linear-gradient(135deg, #F472B6 0%, #A78BFA 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    };

    const glassCard = (colorRel) => ({
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        padding: '2rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    });

    return (
        <div style={{ padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

            {/* Header Section */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: '800' }}>
                    Hola, <span style={gradientText}>{profile?.full_name?.split(' ')[0] || 'Admin'}</span> 👋
                </h1>
                <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>Bienvenido a tu panel de control</p>

                {/* ID Badge */}
                <div
                    onClick={copyLink}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(255,255,255,0.08)', padding: '6px 16px', borderRadius: '30px',
                        marginTop: '15px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                    <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>ID:</span>
                    <span style={{ fontWeight: 'bold', letterSpacing: '1px', color: '#F472B6' }}>{profile?.referral_code}</span>
                    <Copy size={14} style={{ opacity: 0.5 }} />
                </div>
            </div>

            {/* Wallet Section */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
                borderRadius: '24px', padding: '2rem', marginBottom: '3rem',
                border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ opacity: 0.7, marginBottom: '5px' }}>Saldo Disponible</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ opacity: 0.5, fontSize: '2rem' }}>$</span>
                    {wallet.balance.toLocaleString()}
                </div>
                <button
                    onClick={() => navigate('/recharge')}
                    style={{
                        background: '#10B981', color: 'white', border: 'none', padding: '12px 24px',
                        borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                >
                    <Plus size={20} /> Recargar Saldo
                </button>
            </div>

            {/* Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                {/* 1. Network (Mi Red) */}
                <div
                    onClick={() => navigate('/network')}
                    style={glassCard()}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(244, 114, 182, 0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
                        padding: '16px', borderRadius: '16px', marginBottom: '10px'
                    }}>
                        <Trophy size={32} color="white" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Mi Red</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Gestiona referidos y ganancias</p>
                </div>

                {/* 2. Bingos */}
                <div
                    onClick={() => navigate('/bingos')}
                    style={glassCard()}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(59, 130, 246, 0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)',
                        padding: '16px', borderRadius: '16px', marginBottom: '10px'
                    }}>
                        <LayoutDashboard size={32} color="white" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Bingos</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Crea y administra tus juegos</p>
                </div>

                {/* 3. Raffles (Rifas) */}
                <div
                    onClick={() => navigate('/raffles')}
                    style={glassCard()}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(16, 185, 129, 0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
                        padding: '16px', borderRadius: '16px', marginBottom: '10px'
                    }}>
                        <Ticket size={32} color="white" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Rifas</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Gestiona sorteos y premios</p>
                </div>

                {/* 4. Player Zone */}
                <div
                    onClick={() => navigate('/my-lobby')}
                    style={glassCard()}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(251, 191, 36, 0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                        padding: '16px', borderRadius: '16px', marginBottom: '10px'
                    }}>
                        <Wallet size={32} color="white" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Zona Jugador</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Mis tickets comprados</p>
                </div>

                {/* 5. Super Admin (Conditional) */}
                {profile?.role === 'admin' && (
                    <div
                        onClick={() => navigate('/superadmin')}
                        style={glassCard()}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(139, 92, 246, 0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div style={{
                            background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
                            padding: '16px', borderRadius: '16px', marginBottom: '10px'
                        }}>
                            <Settings size={32} color="white" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Super Admin</h3>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Configuración global</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
