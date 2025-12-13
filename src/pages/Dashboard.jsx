import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getWallet } from '../utils/storage';
import { LayoutDashboard, Ticket, ArrowRight, Wallet } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState({ balance: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [p, w] = await Promise.all([getProfile(), getWallet()]);
        if (p) setProfile(p);
        if (w) setWallet(w);
    };

    return (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                Hola, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Admin'} 👋
            </h1>
            <p style={{ opacity: 0.7, marginBottom: '3rem', fontSize: '1.2rem' }}>
                ¿Qué quieres gestionar hoy?
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Bingo Card */}
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
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Bingos</h2>
                        <p style={{ opacity: 0.7, margin: '10px 0 0' }}>Gestionar eventos y cartones</p>
                    </div>
                    <button className="primary" style={{ width: '100%', marginTop: 'auto' }}>
                        Entrar <ArrowRight size={16} style={{ marginLeft: '5px' }} />
                    </button>
                </div>

                {/* Raffle Card */}
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
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Rifas</h2>
                        <p style={{ opacity: 0.7, margin: '10px 0 0' }}>Sorteos y boletas</p>
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
            </div>

            <div style={{ marginTop: '4rem', opacity: 0.6 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--color-card)', padding: '10px 20px', borderRadius: '50px', border: '1px solid var(--color-border)' }}>
                    <Wallet size={16} />
                    <span style={{ fontWeight: 'bold' }}>Tu Saldo: ${wallet.balance.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
