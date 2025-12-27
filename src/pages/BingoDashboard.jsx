import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGameService, getGames, getGameTickets, getWallet, getProfile, mockRecharge, deleteGame, getSystemSettings, updateGame } from '../utils/storage'; // Updated imports
import { supabase } from '../utils/supabaseClient';
import { generateBingoCard } from '../utils/bingoLogic';
import { Play, Tv, Users, Plus, Ticket, Wallet, Copy, LogOut, Trash, Share2, Coins, Calendar, DollarSign } from 'lucide-react'; // Added Icons

const BingoDashboard = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [newGameName, setNewGameName] = useState('');
    const [loading, setLoading] = useState(false);
    const [prices, setPrices] = useState({ bingo_price: 5000 });
    const [wallet, setWallet] = useState({ balance: 0 });
    const [profile, setProfile] = useState(null);
    const [ticketPrice, setTicketPrice] = useState('5000');
    const [startTime, setStartTime] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const settings = await getSystemSettings();
            if (settings.bingo_price) setPrices(prev => ({ ...prev, ...settings }));

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
        if (!ticketPrice || !startTime) return alert('Completa todos los campos (Precio y Fecha)');

        const cost = Number(prices.bingo_price);

        if (wallet.balance < cost) {
            if (window.confirm(`Saldo insuficiente.\nCosto: $${cost}\nTu Saldo: $${wallet.balance}\n\n¿Ir a recargar?`)) navigate('/recharge');
            return;
        }

        if (!window.confirm(`Crear este Bingo costará $${cost} Coins.\n¿Deseas continuar?`)) return;

        setLoading(true);
        try {
            const result = await createGameService('BINGO', newGameName);
            if (result.success) {
                const gId = result.game_id || result.id || result.data?.id;
                if (gId) {
                    await updateGame(gId, { ticketPrice, startTime });
                }
                alert(`¡Bingo "${newGameName}" creado exitosamente!\nSe descontaron $${cost} Coins.`);
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
        // ... (Logic kept if needed, but usually admin manages inside)
    };

    return (
        <div style={{ textAlign: 'left', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: 0 }}>
                <h2 style={{ margin: 0 }}>Mis Bingos</h2>
                <div
                    onClick={() => navigate('/recharge')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                        padding: '5px 10px', borderRadius: '20px', cursor: 'pointer'
                    }}>
                    <Coins size={16} color="#F59E0B" />
                    <span style={{ fontWeight: 'bold' }}>${wallet.balance?.toLocaleString()}</span>
                </div>
            </div>

            {/* Create Game Card */}
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Organizar Nuevo Bingo</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="text-accent" style={{ fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 'bold' }}>
                            Costo: ${Number(prices.bingo_price).toLocaleString()} Coins
                        </span>
                    </div>
                </div>

                <form onSubmit={handleCreateGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '2px' }}>Nombre del Evento</label>
                            <input
                                type="text"
                                placeholder="Ej. Gran Bingo Bailable"
                                value={newGameName}
                                onChange={(e) => setNewGameName(e.target.value)}
                                disabled={loading}
                                style={{ width: '100%', padding: '10px' }}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '2px' }}>Valor Cartón</label>
                            <input
                                type="number"
                                placeholder="Valor Cartón"
                                value={ticketPrice}
                                onChange={(e) => setTicketPrice(e.target.value)}
                                disabled={loading}
                                style={{ width: '100%', padding: '10px' }}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '2px' }}>Hora de Inicio</label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                disabled={loading}
                                style={{ width: '100%', padding: '10px' }}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
                        <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                        {loading ? 'Procesando...' : 'Pagar y Crear'}
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
