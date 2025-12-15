import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Share2, Coins, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import { getProfile } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';

const Network = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [referrals, setReferrals] = useState([]);
    const [commissions, setCommissions] = useState([]);
    const [stats, setStats] = useState({ totalEarned: 0, todayEarned: 0 });
    const [activeTab, setActiveTab] = useState('history'); // 'team' | 'history'

    useEffect(() => {
        loadNetworkData();
    }, []);

    const loadNetworkData = async () => {
        const user = await getProfile();
        if (!user) return;
        setProfile(user);

        // 1. Fetch Referrals
        const { data: refs } = await supabase
            .from('profiles')
            .select('id, full_name, email, created_at')
            .eq('referred_by', user.id)
            .order('created_at', { ascending: false });

        if (refs) {
            setReferrals(refs.map(r => ({
                id: r.id,
                name: r.full_name || 'Sin Nombre',
                email: r.email,
                date: new Date(r.created_at).toLocaleDateString()
            })));
        }

        // 2. Fetch Commissions with Details
        const { data: comms } = await supabase
            .from('commissions')
            .select(`
                id,
                amount,
                created_at,
                level,
                source_user_id,
                profiles!source_user_id ( full_name, email )
            `)
            .eq('beneficiary_id', user.id)
            .order('created_at', { ascending: false });

        if (comms) {
            const formattedComms = comms.map(c => ({
                id: c.id,
                amount: Number(c.amount),
                date: new Date(c.created_at).toLocaleString(),
                level: c.level,
                source: c.profiles?.full_name || c.profiles?.email || 'Desconocido'
            }));

            setCommissions(formattedComms);

            const total = formattedComms.reduce((sum, c) => sum + c.amount, 0);
            setStats({ totalEarned: total, todayEarned: 0 }); // Todo: calculate today
        }
    };

    const copyLink = () => {
        const link = `${window.location.origin}/register?ref=${profile?.referral_code}`;
        navigator.clipboard.writeText(link);
        alert('Enlace copiado al portapapeles');
    };

    // --- STYLES ---
    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    };

    const gradientText = {
        background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 'bold'
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                        padding: '10px 15px', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <ArrowLeft size={18} /> Dashboard
                </button>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Tu Código</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#F472B6', letterSpacing: '2px' }}>
                        {profile?.referral_code || '...'}
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', ...gradientText }}>
                    Panel de Socios
                </h1>
                <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>Gestiona tu red y visualiza tus ganancias en tiempo real</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {/* Total Earned */}
                <div style={glassStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '12px' }}>
                            <Coins size={24} color="#60A5FA" />
                        </div>
                        <span style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>
                            +2% Recargas
                        </span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>${stats.totalEarned.toLocaleString()}</div>
                    <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>Ganancias Totales</div>
                </div>

                {/* Team Size */}
                <div style={glassStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '10px', borderRadius: '12px' }}>
                            <Users size={24} color="#F472B6" />
                        </div>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{referrals.length}</div>
                    <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>Socios Directos</div>
                </div>

                {/* Invite Link */}
                <div style={{ ...glassStyle, background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '15px', color: '#C084FC' }}>Invitar Nuevos Socios</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{
                            background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1,
                            fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            bit.ly/JuegAIA-{profile?.referral_code}
                        </div>
                        <button
                            onClick={copyLink}
                            style={{
                                background: '#8B5CF6', border: 'none', color: 'white', borderRadius: '8px',
                                width: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <Share2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div style={{
                display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '10px'
            }}>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'history' ? '#60A5FA' : 'rgba(255,255,255,0.5)',
                        fontSize: '1.1rem', cursor: 'pointer', fontWeight: activeTab === 'history' ? 'bold' : 'normal',
                        paddingBottom: '10px', borderBottom: activeTab === 'history' ? '2px solid #60A5FA' : 'none'
                    }}
                >
                    Historial de Comisiones
                </button>
                <button
                    onClick={() => setActiveTab('team')}
                    style={{
                        background: 'none', border: 'none', color: activeTab === 'team' ? '#F472B6' : 'rgba(255,255,255,0.5)',
                        fontSize: '1.1rem', cursor: 'pointer', fontWeight: activeTab === 'team' ? 'bold' : 'normal',
                        paddingBottom: '10px', borderBottom: activeTab === 'team' ? '2px solid #F472B6' : 'none'
                    }}
                >
                    Mi Equipo
                </button>
            </div>

            {/* Tab Content */}
            <div style={glassStyle}>
                {activeTab === 'history' && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>
                                    <th style={{ padding: '15px' }}>Fecha</th>
                                    <th style={{ padding: '15px' }}>Origen</th>
                                    <th style={{ padding: '15px' }}>Nivel</th>
                                    <th style={{ padding: '15px' }}>Comisión</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commissions.map(c => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '15px', opacity: 0.8 }}>{c.date}</td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{c.source}</div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{
                                                background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'
                                            }}>
                                                L{c.level}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', color: '#10B981', fontWeight: 'bold' }}>
                                            +${c.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {commissions.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                                            Aún no has generado comisiones.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {referrals.map(ref => (
                            <div key={ref.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', background: '#374151',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                    }}>
                                        {ref.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{ref.name}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{ref.email}</div>
                                    </div>
                                </div>
                                <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                                    {ref.date}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Network;
