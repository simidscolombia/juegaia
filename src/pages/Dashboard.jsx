import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGameWithWallet, getGames, saveTicket, getGameTickets, getWallet, getProfile, mockRecharge, deleteGame } from '../utils/storage'; // Updated imports
import { supabase } from '../utils/supabaseClient';
import { generateBingoCard } from '../utils/bingoLogic';
import { Play, Tv, Users, Plus, Ticket, Wallet, Copy, LogOut, Trash } from 'lucide-react'; // Added Icons

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

        // Client-side check
        if (wallet.balance < 10000) {
            alert("No tienes saldo suficiente (10,000 Coins) para crear un Bingo.");
            return;
        }

        setLoading(true);
        try {
            const result = await createGameWithWallet(newGameName);
            if (result.success) {
                alert(`¡Juego creado! Nuevo saldo: ${result.new_balance}`);
                setWallet(prev => ({ ...prev, balance: result.new_balance }));
                await loadData();
            }
            setNewGameName('');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async (game) => {
        if (!window.confirm(`¿Seguro que quieres eliminar el bingo "${game.name}"?\nSi tiene jugadores no se podrá borrar.`)) return;
        try {
            await deleteGame(game.id);
            alert('Bingo eliminado.');
            loadData();
        } catch (err) {
            alert('❌ No se pudo eliminar: ' + err.message);
        }
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
        <div style={{ textAlign: 'left', minHeight: '100vh' }}>
            <h2 style={{ marginBottom: '1.5rem', marginTop: 0 }}>Panel de Bingo</h2>

            {/* Create Game Card */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Crear Nuevo Evento</h3>
                    <span className="text-accent" style={{ fontSize: '0.9rem' }}>Costo: 10,000 Coins</span>
                </div>

                <form onSubmit={handleCreateGame} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Nombre del Evento (ej. Viernes de Bingo)"
                        value={newGameName}
                        onChange={(e) => setNewGameName(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" className="primary" disabled={loading || wallet.balance < 10000}>
                        <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                        {loading ? 'Creando...' : 'Crear'}
                    </button>
                </form>
            </div>

            {/* Game List */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {games.map(game => (
                    <div key={game.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0' }}>{game.name}</h3>
                            <span style={{
                                background: game.status === 'PLAYING' ? 'var(--color-accent)' : 'var(--color-bg)',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: game.status === 'PLAYING' ? '#fff' : 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)'
                            }}>
                                {game.status} {game.status === 'WAITING' ? '(En Espera)' : ''}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleCreateTicket(game.id)} title="Generar Ticket de Prueba">
                                <Ticket size={18} />
                            </button>
                            <button className="primary" onClick={() => navigate(`/tv/${game.id}`)}>
                                <Tv size={18} style={{ marginRight: '5px' }} /> TV
                            </button>
                            <button
                                onClick={() => handleDelete(game)}
                                style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', marginLeft: '5px', cursor: 'pointer', borderRadius: '8px' }}
                                title="Eliminar Bingo"
                            >
                                <Trash size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {games.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, border: '2px dashed var(--color-border)', borderRadius: '12px' }}>
                        <p>No tienes eventos activos.</p>
                        <p>Crea el primero arriba.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
