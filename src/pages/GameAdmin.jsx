import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGame, getGameTickets, createTicket, deleteGame, releaseTicket, updateTicket } from '../utils/storage';
import { User, Share2, Trash, Plus, Check, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { generateBingoCard } from '../utils/bingoLogic';

const GameAdmin = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [gameId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [g, p] = await Promise.all([
                getGame(gameId),
                getGameTickets(gameId)
            ]);
            setGame(g);
            setPlayers(p || []);
        } catch (error) {
            console.error(error);
            alert('Error cargando datos del juego');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!newPlayerName.trim()) return;

        try {
            const card = generateBingoCard();
            const pin = Math.floor(1000 + Math.random() * 9000).toString();

            await createTicket(gameId, newPlayerName, card, pin);

            setNewPlayerName('');
            setShowModal(false);
            await loadData();
            alert('¡Cartón generado y venta registrada!');
        } catch (error) {
            alert('Error creando ticket: ' + error.message);
        }
    };

    const handleDeletePlayer = async (playerId) => {
        if (!confirm('¿Eliminar este cartón? El jugador ya no podrá entrar.')) return;
        try {
            // function to delete/release ticket needs to be robust, using releaseTicket assuming it deletes by ID or similar
            // actually storage.js releaseTicket takes (raffleId, number), wait. 
            // We need a delete player function. Let's assume we can delete from 'bingo_players' by ID directly via new storage function or raw supabase if needed.
            // Looking at storage.js, we don't have explicit deletePlayerById. 
            // I will use deleteTicket equivalent. 
            // Actually, let's just use the supabase client directly here or add a helper?
            // Existing `releaseTicket` is for Raffles.
            // I'll create a quick helper inside storage.js later, but for now let's try to mock it or adding it to storage.js first is safer.
            // WAIT - I need to check storage.js for delete capability for bingo players.
            // "deleteGame" deletes the game and checks for players. 
            // I should update storage.js to include `deleteBingoPlayer(id)`.
            // For now, I will comment this out or use a placeholder generic delete if available.
            // Ah, I can import `allowDelete` or similar? No.
            // I will implement the UI and then fix storage.js.
            alert("Función de eliminar jugador pendiente de añadir en storage.js");
        } catch (error) {
            // ...
        }
    };

    const copyShareLink = (player) => {
        const link = `${window.location.origin}/play/${gameId}`;
        const msg = `🎟️ *¡Hola ${player.name}!* \n\nYa tus cartones están activos.\n\n🔗 *Entra aquí:* ${link}\n📱 *Ingresa con tu celular:* ${player.phone || 'Tu número registrado'}\n\n¡Mucha suerte! 🍀`;

        navigator.clipboard.writeText(msg);
        alert('Copiado al portapapeles. ¡Pégalo en WhatsApp!');
    };

    if (loading) return <div className="p-4">Cargando...</div>;
    if (!game) return <div className="p-4">Juego no encontrado</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '20px', color: 'var(--color-text)' }}>
                <ArrowLeft size={20} style={{ marginRight: '5px' }} /> Volver
            </button>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{game.name}</h1>
                        <p style={{ margin: '5px 0 0', opacity: 0.7 }}>Panel de Administración</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}/bingo/${gameId}/join`;
                                    const msg = `🎉 *¡Gran Bingo Virtual ${game.name}!* 🎱\n\n💰 Premios increíbles y mucha diversión.\n👇 *Compra tus cartones aquí:*\n${link}\n\n🚀 _Organizado con JuegAIA.com - Crea tu propio bingo gratis._`;
                                    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                                    window.open(url, '_blank');
                                }}
                                className="text-accent"
                                style={{
                                    background: '#25D366',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 15px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                                }}
                            >
                                <Share2 size={18} style={{ marginRight: '5px' }} /> Compartir en WhatsApp
                            </button>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
                                        {players.length}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', marginLeft: '5px' }}>Jugadores</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3>Lista de Jugadores</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}/bingo/${gameId}/join`;
                                    navigator.clipboard.writeText(link);
                                    alert("Link de Tienda copiado: " + link);
                                }}
                                style={{ background: 'var(--color-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <LinkIcon size={18} style={{ marginRight: '5px' }} /> Copiar Link Tienda
                            </button>
                            <button className="primary" onClick={() => setShowModal(true)}>
                                <Plus size={18} style={{ marginRight: '5px' }} /> Vender Cartón
                            </button>
                        </div>
                    </div>

                    {/* Pending Requests Section */}
                    {players.filter(p => p.status === 'PENDING').length > 0 && (
                        <div className="card" style={{ marginBottom: '20px', border: '1px solid #F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>
                            <h3 style={{ color: '#F59E0B', marginTop: 0 }}>Solicitudes Pendientes ({players.filter(p => p.status === 'PENDING').length})</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {players.filter(p => p.status === 'PENDING').map(req => (
                                        <tr key={req.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                            <td style={{ padding: '10px' }}>
                                                <strong>{req.name}</strong><br />
                                                <small>{req.phone}</small>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '10px' }}>
                                                <button
                                                    className="primary"
                                                    onClick={async () => {
                                                        if (!confirm(`¿Aprobar cartón para ${req.name}?`)) return;
                                                        try {
                                                            await updateTicket(req.id, { status: 'PAID' });
                                                            // Send WhatsApp Link automatically? Optional.
                                                            copyShareLink(req); // Auto-copy link on approval for convenience
                                                            await loadData();
                                                        } catch (e) { alert(e.message) }
                                                    }}
                                                    style={{ background: '#F59E0B', border: 'none' }}
                                                >
                                                    Aprobar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--color-secondary)', textAlign: 'left' }}>
                                    <th style={{ padding: '15px' }}>Nombre</th>
                                    <th style={{ padding: '15px' }}>PIN</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.filter(p => p.status !== 'PENDING').map(player => (
                                    <tr key={player.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{player.name}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Pagado</div>
                                        </td>
                                        <td style={{ padding: '15px', fontFamily: 'monospace' }}>{player.pin}</td>
                                        <td style={{ padding: '15px', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => copyShareLink(player)}
                                                style={{ background: '#25D366', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
                                                title="Copiar para WhatsApp"
                                            >
                                                <Share2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {players.length === 0 && (
                                    <tr>
                                        <td colSpan={3} style={{ padding: '30px', textAlign: 'center', opacity: 0.5 }}>
                                            No hay jugadores registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modal Vender Cartón */}
                    {showModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                            zIndex: 1000
                        }}>
                            <div className="card" style={{ width: '90%', maxWidth: '400px' }}>
                                <h3 style={{ marginTop: 0 }}>Nuevo Jugador</h3>
                                <form onSubmit={handleCreateTicket}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Nombre del Cliente</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Ej. Tía Marta"
                                            value={newPlayerName}
                                            onChange={e => setNewPlayerName(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1px solid #ccc', color: 'var(--color-text)' }}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className="primary">
                                            Generar Cartón
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
                );
};

                export default GameAdmin;
