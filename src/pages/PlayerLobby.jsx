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
                // Clean phone for looser matching (remove spaces, match partial)
                const cleanPhone = currentUser.phone.replace(/\s+/g, '');

                // Fetch Bingos
                const { data: bingoData } = await supabase
                    .from('bingo_players')
                    .select('*, bingo_games(name)')
                    .ilike('phone', `%${cleanPhone}%`)
                    .order('created_at', { ascending: false });

                // Fetch Raffles
                const { data: raffleData } = await supabase
                    .from('tickets')
                    .select('*, raffles(name)')
                    .ilike('phone', `%${cleanPhone}%`)
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

            {/* Header */}
            <div style={{ padding: '20px', background: 'var(--color-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Hola, {profile?.full_name?.split(' ')[0]} 👋</h2>
                    <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
                        {profile?.id === 'guest' ? '👤 Invitado' : '✅ Jugador Verificado'}
                    </p>
                </div>
                <button
                    onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', opacity: 0.7 }}
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Guest Registration CTA */}
            {profile?.id === 'guest' && (
                <div style={{
                    margin: '15px 20px 5px', padding: '15px',
                    background: 'linear-gradient(90deg, #818cf8 0%, #6366f1 100%)',
                    borderRadius: '10px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>¿Quieres guardar tu progreso?</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Crea una cuenta para no perder tus tickets.</div>
                    </div>
                    <button
                        onClick={() => navigate('/register')}
                        style={{
                            background: 'white', color: '#6366f1', border: 'none',
                            padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        Registrarse
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginTop: '10px' }}>
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
                    <div style={{
                        background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
                        borderRadius: '20px',
                        padding: '40px 20px',
                        color: '#000',
                        marginBottom: '30px',
                        boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.5)'
                    }}>
                        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', textShadow: '0 2px 0 rgba(255,255,255,0.5)' }}>🤑 ¡Gana Dinero!</h1>
                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Crea tus propios Sorteos</p>
                        <p style={{ opacity: 0.9, marginTop: '10px' }}>
                            Conviértete en Vendedor/Administrador y usa nuestra plataforma para organizar tus rifas y bingos.
                        </p>
                    </div>

                    <h3 style={{ marginBottom: '20px' }}>¿Cómo funciona?</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '30px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--color-card)', padding: '15px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '1.5rem' }}>🔥</div>
                            <div>
                                <strong>Regístrate como Admin</strong>
                                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Crea una cuenta administradora gratis.</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--color-card)', padding: '15px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '1.5rem' }}>⚙️</div>
                            <div>
                                <strong>Configura tu Juego</strong>
                                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Crea rifas o bingos en minutos.</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--color-card)', padding: '15px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '1.5rem' }}>💸</div>
                            <div>
                                <strong>Vende y Gana</strong>
                                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Comparte tu link y recibe los pagos directamente.</div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            // Logout current guest/player session and go to login as admin intent
                            if (window.confirm("Para convertirte en vendedor debes cerrar tu sesión de jugador actual. ¿Continuar?")) {
                                supabase.auth.signOut().then(() => navigate('/login'));
                            }
                        }}
                        style={{
                            width: '100%',
                            background: 'white',
                            color: '#000',
                            padding: '16px',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            boxShadow: '0 4px 15px rgba(255,255,255,0.1)'
                        }}
                    >
                        🚀 Comenzar a Vender
                    </button>

                    <p style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.5 }}>
                        * Requiere registro con correo electrónico.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PlayerLobby;
