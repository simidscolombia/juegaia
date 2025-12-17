import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getWallet, adminUpdateUserReferrer } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { LayoutDashboard, Ticket, ArrowRight, Wallet, Trophy, Settings, Copy, Plus, MessageCircle } from 'lucide-react';

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
                // Verification logic
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
        try {
            const [p, w] = await Promise.all([getProfile(), getWallet()]);

            if (p) {
                setProfile(p);

                // Auto-Bind Referral if pending
                const pendingRef = localStorage.getItem('referral_code');
                if (pendingRef && !p.referred_by && p.referral_code !== pendingRef) {
                    try {
                        await adminUpdateUserReferrer(p.email, pendingRef);
                        alert(`¡Has sido vinculado correctamente al código: ${pendingRef}!`);
                        localStorage.removeItem('referral_code');
                        // Refresh profile to see change
                        const fresh = await getProfile();
                        setProfile(fresh);
                    } catch (err) {
                        console.warn("Referral binding skipped:", err.message);
                    }
                }
            }
            if (w) setWallet(w);
        } catch (err) {
            console.error("Load Data Error:", err);
        }
    };

    const copyLink = () => {
        const link = `${window.location.origin}/register?ref=${profile?.referral_code}`;
        navigator.clipboard.writeText(link);
        alert('Enlace copiado al portapapeles!');
    };

    const shareWhatsapp = () => {
        const link = `${window.location.origin}/register?ref=${profile?.referral_code}`;
        const text = `¡Hola! Únete a JuegAIA y gana conmígo. Regístrate aquí: ${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
        borderRadius: '16px',
        padding: '1.2rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.8rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        minHeight: '160px',
        justifyContent: 'center'
    });

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

            {/* 1. Compact Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>
                        Hola, <span style={gradientText}>{profile?.full_name?.split(' ')[0] || 'Admin'}</span> 👋
                    </h2>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Panel de Control</div>
                </div>
                {/* ID Badge */}
                <div style={{
                    background: 'rgba(244, 114, 182, 0.1)',
                    border: '1px solid rgba(244, 114, 182, 0.2)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    color: '#F472B6',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px'
                }}>
                    ID: {profile?.referral_code}
                </div>
            </div>

            {/* 2. Share Banner */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <div style={{
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#fff'
                    }}>
                        ✨ Comparte y gana
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={shareWhatsapp}
                        title="Enviar por WhatsApp"
                        style={{
                            background: '#25D366', border: 'none', color: 'white', borderRadius: '8px',
                            padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)', fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                    >
                        <MessageCircle size={18} strokeWidth={2.5} /> WhatsApp
                    </button>
                    <button
                        onClick={copyLink}
                        title="Copiar Enlace"
                        style={{
                            background: '#3B82F6', border: 'none', color: 'white', borderRadius: '8px',
                            padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)', fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                    >
                        <Copy size={18} strokeWidth={2.5} /> Copiar
                    </button>
                </div>
            </div>

            {/* 3. Wallet Section (Ultra Compact) */}
            <div style={{
                background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.6) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px', padding: '12px 16px', marginBottom: '2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px', borderRadius: '50%' }}>
                        <Wallet size={20} color="#10B981" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, lineHeight: 1 }}>Saldo Disponible</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>${wallet.balance.toLocaleString()}</div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/recharge')}
                    style={{
                        background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    <Plus size={16} /> Recargar
                </button>
            </div>

            {/* 4. Dashboard Grid - Mobile Friendly (2 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>

                {/* 1. Network (Mi Red) */}
                <div
                    onClick={() => navigate('/network')}
                    style={glassCard()}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
                        padding: '12px', borderRadius: '12px', marginBottom: '8px'
                    }}>
                        <Trophy size={28} color="white" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Mi Red</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Gestiona referidos</p>
                </div>

                {/* 2. Bingos */}
                <div
                    onClick={() => navigate('/bingos')}
                    style={glassCard()}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)',
                        padding: '12px', borderRadius: '12px', marginBottom: '8px'
                    }}>
                        <LayoutDashboard size={28} color="white" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Bingos</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Crea y administra</p>
                </div>

                {/* 3. Raffles (Rifas) */}
                <div
                    onClick={() => navigate('/raffles')}
                    style={glassCard()}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
                        padding: '12px', borderRadius: '12px', marginBottom: '8px'
                    }}>
                        <Ticket size={28} color="white" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Rifas</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Gestiona sorteos</p>
                </div>

                {/* 4. Player Zone */}
                <div
                    onClick={() => navigate('/my-lobby')}
                    style={glassCard()}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                        padding: '12px', borderRadius: '12px', marginBottom: '8px'
                    }}>
                        <Wallet size={28} color="white" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Zona Jugador</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Mis tickets</p>
                </div>

                {/* 5. Super Admin (Conditional) */}
                {profile?.role === 'admin' && (
                    <div
                        onClick={() => navigate('/superadmin')}
                        style={glassCard()}
                    >
                        <div style={{
                            background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
                            padding: '12px', borderRadius: '12px', marginBottom: '8px'
                        }}>
                            <Settings size={28} color="white" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Super Admin</h3>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Global</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
