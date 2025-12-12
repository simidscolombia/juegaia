import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGameWithWallet, getGames, saveTicket, getGameTickets, getWallet, getProfile, mockRecharge } from '../utils/storage'; // Updated imports
import { supabase } from '../utils/supabaseClient';
import { generateBingoCard } from '../utils/bingoLogic';
import { Play, Tv, Users, Plus, Ticket, Wallet, Copy, LogOut } from 'lucide-react'; // Added Icons

const Dashboard = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [newGameName, setNewGameName] = useState('');
    const [loading, setLoading] = useState(false);

    // Wallet State
    const [wallet, setWallet] = useState({ balance: 0 });
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [gamesData, walletData, profileData] = await Promise.all([
                getGames(),
                getWallet(),
                getProfile()
            ]);
            setGames(gamesData || []);
            if (walletData) setWallet(walletData);
            if (profileData) setProfile(profileData);
        } catch (error) {
            console.error("Error loading dashboard:", error);
        }
    };

    const handleCreateGame = async (e) => {
        e.preventDefault();
        if (!newGameName.trim()) return;

        // Client-side check (UX only, backend enforces it too)
        if (wallet.balance < 10000) {
            alert("No tienes saldo suficiente (10,000 Coins) para crear un Bingo.");
            return;
        }

        setLoading(true);
        try {
            // Use Secure RPC
            const result = await createGameWithWallet(newGameName);

            if (result.success) {
                alert(`¡Juego creado! Nuevo saldo: ${result.new_balance}`);
                setWallet(prev => ({ ...prev, balance: result.new_balance }));
                await loadData(); // Reload games list
            }
            setNewGameName('');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRecharge = async () => {
        // Simulation for Phase 1
        const amount = 50000;
        if (window.confirm(`¿Simular recarga de ${amount} Coins? (Demo)`)) {
            try {
                await mockRecharge(amount);
                const newWallet = await getWallet();
                setWallet(newWallet);
                alert("¡Recarga exitosa!");
            } catch (e) {
                alert("Error recargando: " + e.message);
            }
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleCreateTicket = async (gameId) => {
        const card = generateBingoCard();
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        const playerName = `Jugador ${Math.floor(Math.random() * 100)}`;

        try {
            const ticketData = {
                gameId,
                pin,
                card,
                playerName,
                status: 'PAID'
            };
            const savedTicket = await saveTicket(ticketData);
            alert(`Ticket creado!\nLink: /play/${gameId}?pin=${pin}\nPIN: ${pin}`);
        } catch (err) {
            alert('Error creando ticket: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'left', minHeight: '100vh' }}>
            {/* Header with Wallet */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem',
                background: '#16213e', padding: '1rem', borderRadius: '12px', borderBottom: '4px solid #e94560'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🎮 Admin Panel</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px', opacity: 0.8 }}>
                        <span style={{ fontSize: '0.9rem' }}>Hola, {profile?.full_name || 'Admin'}</span>
                        {profile?.referral_code && (
                            <span style={{ background: '#0f3460', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #4cc9f0', color: '#4cc9f0' }}>
                                Ref: {profile.referral_code}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>TU SALDO</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#4cc9f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Wallet size={18} /> {wallet.balance.toLocaleString()} Coins
                        </div>
                    </div>
                    <button onClick={handleRecharge} style={{ background: '#0f3460', border: '1px solid #4cc9f0', color: '#4cc9f0', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Simular Recarga">
                        +
                    </button>
                    <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#e94560', cursor: 'pointer' }}>
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Create Game */}
            <div className="card" style={{ background: '#16213e', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ marginTop: 0 }}>Crear Nuevo Bingo</h3>
                    <span style={{ fontSize: '0.9rem', color: '#e94560' }}>Costo: 10,000 Coins</span>
                </div>

                <form onSubmit={handleCreateGame} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Nombre del Evento (ej. Viernes de Bingo)"
                        value={newGameName}
                        onChange={(e) => setNewGameName(e.target.value)}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #30475e', background: '#0f3460', color: 'white' }}
                        disabled={loading}
                    />
                    <button type="submit" style={{ background: wallet.balance < 10000 ? '#555' : '#e94560', color: 'white', cursor: wallet.balance < 10000 ? 'not-allowed' : 'pointer' }} disabled={loading || wallet.balance < 10000}>
                        <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                        {loading ? 'Creando...' : 'Crear (-10k)'}
                    </button>
                </form>
            </div>

            {/* Game List */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {games.map(game => (
                    <div key={game.id} style={{ background: '#16213e', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0' }}>{game.name}</h2>
                            <span style={{
                                background: game.status === 'PLAYING' ? '#4cc9f0' : '#30475e',
                                padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: game.status === 'PLAYING' ? '#000' : '#fff'
                            }}>
                                {game.status} {game.status === 'WAITING' ? '(En Espera)' : ''}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleCreateTicket(game.id)} title="Generar Ticket de Prueba">
                                <Ticket size={18} />
                            </button>
                            <button onClick={() => navigate(`/tv/${game.id}`)} style={{ background: '#0f3460' }}>
                                <Tv size={18} style={{ marginRight: '5px' }} /> TV
                            </button>
                        </div>
                    </div>
                ))}

                {games.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, border: '2px dashed #30475e', borderRadius: '12px' }}>
                        <p>No tienes eventos activos.</p>
                        <p>Recarga tu billetera y crea el primero.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
