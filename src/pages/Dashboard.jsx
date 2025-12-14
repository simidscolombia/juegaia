import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getWallet } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { LayoutDashboard, Ticket, ArrowRight, Wallet, Trophy } from 'lucide-react';

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
                // 1. Verify with Wompi API (Requires Public Key)
                const response = await fetch(`https://production.wompi.co/v1/transactions/${transactionId}`, {
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_WOMPI_PUB_KEY}`
                    }
                });
                const data = await response.json();
                const transaction = data.data;

                if (transaction.status === 'APPROVED') {
                    // 2. Process internal recharge (Idempotent)
                    const { data: rpcData, error } = await supabase.rpc('process_recharge_with_mlm', {
                        p_user_id: profile?.id || (await supabase.auth.getUser()).data.user?.id, // Ensure user ID
                        p_amount: transaction.amount_in_cents / 100,
                        p_reference: transaction.reference,
                        p_wompi_id: transaction.id
                    });

                    if (error) {
                        console.error('Recharge Error:', error);
                        if (error.message.includes('unique constraint') || error.code === '23505') {
                            // Already processed, just refresh balance
                            alert('Pago ya registrado. Actualizando saldo...');
                            loadData();
                        } else {
                            alert('Error procesando la recarga: ' + error.message);
                        }
                    } else {
                        alert('¡Recarga Exitosa! Tu saldo ha sido actualizado.');
                        loadData(); // Refresh balance
                    }
                } else {
                    alert(`Transacción ${transaction.status}. No se cobró.`);
                }
            } catch (err) {
                console.error('Verification Error:', err);
            } finally {
                setVerifying(false);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    };

    const loadData = async () => {
        const [p, w] = await Promise.all([getProfile(), getWallet()]);
        if (p) setProfile(p);
        if (w) setWallet(w);
    };

    return (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                Hola, {profile?.full_name || 'Admin'} 👋
            </h1>
            <p style={{ opacity: 0.7, marginBottom: '3rem', fontSize: '1.2rem' }}>
                Bienvenido a su administrador de juegos en línea
            </p>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '15px', background: 'var(--color-card)', padding: '10px 20px', borderRadius: '50px', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Wallet size={18} color="var(--color-primary)" />
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>${wallet.balance.toLocaleString()}</span>
                </div>
                <button
                    onClick={() => navigate('/recharge')}
                    style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '5px 15px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    + Recargar
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Bingo Card (Organizer Mode) */}
                <div
                    onClick={() => navigate('/bingos')}
                    className="card"
                    style={{
                        cursor: 'pointer',
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        transition: 'transform 0.2s, border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '20px',
                        borderRadius: '50%',
                        color: 'var(--color-primary)'
                    }}>
                        <LayoutDashboard size={48} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Organizar Bingo</h2>
                        <p style={{ opacity: 0.7, margin: '10px 0 0' }}>Crea tu evento y vende cartones</p>
                    </div>
                    <button className="primary" style={{ width: '100%', marginTop: 'auto' }}>
                        Entrar <ArrowRight size={16} style={{ marginLeft: '5px' }} />
                    </button>
                </div>

                {/* Raffle Card (Organizer Mode) */}
                <div
                    onClick={() => navigate('/raffles')}
                    className="card"
                    style={{
                        cursor: 'pointer',
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        transition: 'transform 0.2s, border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '20px',
                        borderRadius: '50%',
                        color: 'var(--color-secondary)'
                    }}>
                        <Ticket size={48} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Organizar Rifa</h2>
                        <p style={{ opacity: 0.7, margin: '10px 0 0' }}>Crea sorteos y gana dinero</p>
                    </div>
                    <button style={{
                        width: '100%',
                        marginTop: 'auto',
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                        fontWeight: 'bold',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        Entrar <ArrowRight size={16} style={{ marginLeft: '5px' }} />
                    </button>
                </div>


                {/* Network Card */}
                <div
                    onClick={() => navigate('/network')}
                    className="card"
                    style={{
                        cursor: 'pointer',
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        transition: 'transform 0.2s, border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        padding: '20px',
                        borderRadius: '50%',
                        color: '#fbbf24'
                    }}>
                        <Ticket size={48} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Red</h2>
                        <p style={{ opacity: 0.7, margin: '10px 0 0' }}>Mis referidos y ganancias</p>
                    </div>
                    <button style={{
                        width: '100%',
                        marginTop: 'auto',
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                        fontWeight: 'bold',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        Entrar <ArrowRight size={16} style={{ marginLeft: '5px' }} />
                    </button>
                </div>

                {/* Player Zone Card */}
                <div
                    onClick={() => navigate('/my-lobby')}
                    className="card"
                    style={{
                        cursor: 'pointer',
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        transition: 'transform 0.2s, border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem',
                        border: '2px solid #10B981'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '20px',
                        borderRadius: '50%',
                        color: '#10B981'
                    }}>
                        <Trophy size={48} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Zona Jugador</h2>
                        <p style={{ opacity: 0.7, margin: '10px 0 0' }}>Mis cartones y premios</p>
                    </div>
                    <button className="primary" style={{ width: '100%', marginTop: 'auto', background: '#10B981' }}>
                        Entrar <ArrowRight size={16} style={{ marginLeft: '5px' }} />
                    </button>
                </div>
            </div>


        </div >
    );
};

export default Dashboard;
