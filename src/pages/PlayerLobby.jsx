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

            let currentUser = user;
            if (!user) {
                // Check for Guest Token
                const guestStr = localStorage.getItem('juegaia_guest');
                if (guestStr) {
                    const guest = JSON.parse(guestStr);
                    currentUser = { id: 'guest', full_name: 'Jugador', phone: guest.phone, email: 'guest@juegaia.com' };
                } else {
                    navigate('/login');
                    return;
                }
            }
            setProfile(currentUser);

            // Fetch Bingo Tickets (Matches phone OR email/user_id if we linked them)
            // For MVP Phase 2: We match by PHONE since that's what Admin inputs.

            // Requirement: User MUST have phone in profile to see tickets.
            if (currentUser.phone) {
                // Fetch Bingos
                const { data: bingoData } = await supabase
                    .from('bingo_players')
                    .select('*, bingo_games(name)')
                    .eq('phone', currentUser.phone)
                    .order('created_at', { ascending: false });

                // Fetch Raffles
                const { data: raffleData } = await supabase
                    .from('tickets')
                    .select('*, raffles(name)')
                    .eq('phone', currentUser.phone)
                    .order('created_at', { ascending: false });

                // Normalize and Combine
                const bingos = (bingoData || []).map(b => ({
                    id: b.id,
                    gameId: b.game_id,
                    name: b.bingo_games?.name || 'Bingo',
                    type: 'BINGO',
                    detail: `Cartón ${b.pin}`,
                    date: b.created_at,
                    link: `/play/${b.game_id}?card=${b.id}`
                }));

                const raffles = (raffleData || []).map(r => ({
                    id: r.id,
                    gameId: r.raffle_id,
                    name: r.raffles?.name || 'Rifa',
                    type: 'RIFA',
                    detail: `Boleta #${r.number}`,
                    date: r.created_at,
                    link: `/raffle/${r.raffle_id}` // Public view for raffles
                }));

                const allTickets = [...bingos, ...raffles].sort((a, b) => new Date(b.date) - new Date(a.date));
                setTickets(allTickets);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = (ticket) => {
        const link = `${window.location.origin}${ticket.link}`;
        const msg = `🎟️ *¡Hola!* Aquí está mi ticket para *${ticket.name}* (${ticket.detail}).\n\n👉 Ver aquí: ${link}`;

        if (navigator.share) {
            navigator.share({ title: 'Tu Ticket JuegAIA', text: msg }).catch(console.error);
        } else {
            navigator.clipboard.writeText(msg);
            alert('Enlace copiado. ¡Compártelo!');
        }
    };

    // ... (rest of logic) ...

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
            {/* ... (Header & Tabs unchanged) ... */}

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

            {/* Tabs (unchanged code for rendering tabs, omitted for brevity as it is context) */}
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
                            <p>No tienes tickets activos.</p>
                            <small>Asegúrate que tu número de celular en el Perfil coincida con el de la compra.</small>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {tickets.map(ticket => (
                                <div key={`${ticket.type}-${ticket.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                                                background: ticket.type === 'BINGO' ? '#e11d48' : '#3b82f6', color: 'white'
                                            }}>
                                                {ticket.type}
                                            </span>
                                            <span style={{ fontWeight: 'bold' }}>{ticket.name}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '2px', opacity: 0.8 }}>
                                            {ticket.detail}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => window.open(ticket.link, '_blank')}
                                            className="primary"
                                            style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                        >
                                            Ver
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
