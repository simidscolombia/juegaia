import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, createGameWithWallet, getGames, saveTicket, getGameTickets, getWallet, getProfile, mockRecharge, deleteGame } from '../utils/storage'; // Updated imports
import { supabase } from '../utils/supabaseClient';
import { generateBingoCard } from '../utils/bingoLogic';
import { Play, Tv, Users, Plus, Ticket, Wallet, Copy, LogOut, Trash, Share2 } from 'lucide-react'; // Added Icons

const BingoDashboard = () => {
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

        setLoading(true);
        try {
            // Bypass Cost: Use direct createGame instead of createGameWithWallet
            const result = await createGame(newGameName);
            if (result) {
                alert(`¡Juego creado exisotamente!`);
                await loadData();
            }
            setNewGameName('');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRecharge = async () => {
        setLoading(true);
        try {
            await mockRecharge(50000);
            alert('¡Recarga exitosa! (+50,000 Coins)');
            await loadData();
        } catch (error) {
            alert('Error recargando: ' + error.message);
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Crear Nuevo Evento</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="text-accent" style={{ fontSize: '0.9rem', color: 'var(--color-accent)' }}>
                            Gratis (Modo Prueba)
                        </span>
                    </div>
                </div>

                <form onSubmit={handleCreateGame} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Nombre del Evento (ej. Viernes de Bingo)"
                        value={newGameName}
                        onChange={(e) => setNewGameName(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" className="primary" disabled={loading}>
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
                            <button onClick={() => {
                                const link = `${window.location.origin}/bingo/${game.id}/join`;
                                const msg = `🎉 *¡Gran Bingo Virtual ${game.name}!* 🎱\n\n💰 Premios increíbles y mucha diversión.\n👇 *Compra tus cartones aquí:*\n${link}\n\n🚀 _Organizado con JuegAIA.com - Crea tu propio bingo gratis._`;
                                const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                                window.open(url, '_blank');
                            }} title="Compartir en WhatsApp" style={{ color: '#25D366', borderColor: '#25D366' }}>
                                <Share2 size={18} />
                            </button>
                            <button onClick={() => navigate(`/manage/${game.id}`)} title="Administrar y Vender">
                                <Users size={18} />
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

export default BingoDashboard;
