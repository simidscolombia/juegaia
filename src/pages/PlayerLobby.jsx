import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getWallet } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { Trophy, Gift, Share2, DollarSign, LogOut } from 'lucide-react';

const PlayerLobby = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('games'); // 'games' or 'earn'
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const user = await getProfile();
            if (!user) {
                navigate('/login');
                return;
            }
            setProfile(user);

            // Fetch Bingo Tickets (Matches phone OR email/user_id if we linked them)
            // For MVP Phase 2: We match by PHONE since that's what Admin inputs.
            // Requirement: User MUST have phone in profile to see tickets.
            if (user.phone) {
                const { data, error } = await supabase
                    .from('bingo_players')
                    .select('*, bingo_games(name)') // Join with game name
                    .eq('phone', user.phone)
                    .order('created_at', { ascending: false });

                if (data) setTickets(data);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = (ticket) => {
        const link = `${window.location.origin}/play/${ticket.game_id}?card=${ticket.id}`;
        const msg = `🎟️ *¡Hola!* Aquí tienes tu cartón para jugar al Bingo *${ticket.bingo_games?.name}*.\n\n👉 Entra aquí: ${link}`;

        if (navigator.share) {
            navigator.share({ title: 'Tu Cartón de Bingo', text: msg }).catch(console.error);
        } else {
            navigator.clipboard.writeText(msg);
            alert('Enlace copiado. ¡Compártelo!');
        }
    };

    const copyReferral = () => {
        const link = `${window.location.origin}/register?ref=${profile?.id}`;
        navigator.clipboard.writeText(link);
        alert('Enlace de referido copiado. ¡Invita y gana!');
    };

    if (loading) return <div className="p-4 text-center">Cargando tu espacio...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
            {/* Header */}
            <div style={{ padding: '20px', background: 'var(--color-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Hola, {profile?.full_name?.split(' ')[0]} 👋</h2>
                    <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Jugador Verificado</p>
                </div>
                <button
                    onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', opacity: 0.7 }}
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
                <button
                    onClick={() => setActiveTab('games')}
                    style={{
                        flex: 1, padding: '15px', background: 'transparent', border: 'none',
                        color: activeTab === 'games' ? 'var(--color-primary)' : 'var(--color-text)',
                        borderBottom: activeTab === 'games' ? '2px solid var(--color-primary)' : 'none',
                        fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    <Trophy size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} />
                    Mis Juegos
                </button>
                <button
                    onClick={() => setActiveTab('earn')}
                    style={{
                        flex: 1, padding: '15px', background: 'transparent', border: 'none',
                        color: activeTab === 'earn' ? '#F59E0B' : 'var(--color-text)',
                        borderBottom: activeTab === 'earn' ? '2px solid #F59E0B' : 'none',
                        fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    <DollarSign size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} />
                    Ganar Dinero
                </button>
            </div>

            {/* Content: My Games */}
            {activeTab === 'games' && (
                <div style={{ padding: '20px' }}>
                    {tickets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.6 }}>
                            <Gift size={48} style={{ marginBottom: '10px' }} />
                            <p>No tienes cartones activos.</p>
                            <small>Asegúrate que tu número de celular en el Perfil coincida con el de la compra.</small>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {tickets.map(ticket => (
                                <div key={ticket.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{ticket.bingo_games?.name || 'Bingo'}</div>
                                        <div style={{ fontSize: '0.9rem' }}>PIN: <strong style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{ticket.pin}</strong></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => window.open(`/play/${ticket.game_id}?card=${ticket.id}`, '_blank')}
                                            className="primary"
                                            style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                        >
                                            Jugar
                                        </button>
                                        <button
                                            onClick={() => handleShare(ticket)}
                                            style={{
                                                background: 'transparent', border: '1px solid var(--color-border)',
                                                color: 'var(--color-text)', borderRadius: '8px', padding: '8px', cursor: 'pointer'
                                            }}
                                        >
                                            <Share2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Content: Earn Money */}
            {activeTab === 'earn' && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', borderRadius: '12px', padding: '30px 20px', color: 'black', marginBottom: '30px' }}>
                        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem' }}>10%</h1>
                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>De Comisión Automática</p>
                        <p style={{ opacity: 0.9 }}>Gana dinero cada vez que tus amigos compren cartones o recarguen.</p>
                    </div>

                    <h3>¡Es muy fácil!</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '30px' }}>
                        <div>
                            <div style={{ background: 'var(--color-card)', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>🔗</div>
                            <small>1. Envía tu Link</small>
                        </div>
                        <div>
                            <div style={{ background: 'var(--color-card)', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>🎟️</div>
                            <small>2. Ellos Juegan</small>
                        </div>
                        <div>
                            <div style={{ background: 'var(--color-card)', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>💰</div>
                            <small>3. Tú Ganas</small>
                        </div>
                    </div>

                    <div className="card" style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Tu Enlace Único</label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <input
                                readOnly
                                value={`${window.location.origin}/register?ref=${profile?.id}`}
                                style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            />
                            <button onClick={copyReferral} className="primary">Copiar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerLobby;
