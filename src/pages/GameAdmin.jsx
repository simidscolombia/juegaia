import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGame, getGameTickets, createTicket, deleteGame, releaseTicket, updateTicket, updateGame, approveBatchTickets } from '../utils/storage';
import { User, Share2, Trash, Plus, Check, Link as LinkIcon, ArrowLeft, Settings, Save } from 'lucide-react';
import { generateBingoCard } from '../utils/bingoLogic';

const GameAdmin = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [adminWhatsapp, setAdminWhatsapp] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

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
            setAdminWhatsapp(g.admin_whatsapp || '');
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
                </div>

                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontSize: '0.9rem' }}>
                        <Settings size={16} /> WhatsApp para Comprobantes
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Ej. 573001234567"
                            value={adminWhatsapp}
                            onChange={(e) => setAdminWhatsapp(e.target.value)}
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                        />
                        <button
                            onClick={async () => {
                                setSavingSettings(true);
                                try {
                                    await updateGame(gameId, { adminWhatsapp });
                                    alert('Configuración guardada');
                                } catch (e) {
                                    alert('Error guardando: ' + e.message);
                                } finally { setSavingSettings(false); }
                            }}
                            disabled={savingSettings}
                            style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '4px', padding: '0 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <Save size={16} /> {savingSettings ? '...' : 'Guardar'}
                        </button>
                    </div>
                    <small style={{ opacity: 0.6, fontSize: '0.75rem', marginTop: '5px', display: 'block' }}>
                        A este número se enviarán los comprobantes de pago de los jugadores.
                    </small>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                            {players.length}
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>Jugadores</div>
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
            {/* Pending Requests Section (GROUPED) */}
            {(() => {
                const pending = players.filter(p => p.status === 'PENDING');
                if (pending.length === 0) return null;

                // Group by phone or name
                const groups = {};
                pending.forEach(p => {
                    const key = p.phone || p.name; // Grouping key
                    if (!groups[key]) groups[key] = { name: p.name, phone: p.phone, tickets: [] };
                    groups[key].tickets.push(p);
                });

                return (
                    <div className="card" style={{ marginBottom: '20px', border: '1px solid #F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>
                        <h3 style={{ color: '#F59E0B', marginTop: 0 }}>Solicitudes Pendientes ({pending.length})</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {Object.values(groups).map((group, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                        <td style={{ padding: '10px' }}>
                                            <strong>{group.name}</strong><br />
                                            <small>{group.phone}</small>
                                            <div style={{ marginTop: '5px', fontSize: '0.85rem', opacity: 0.8 }}>
                                                Solicita {group.tickets.length} cartón{group.tickets.length > 1 ? 'es' : ''}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '10px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#F59E0B', marginBottom: '5px' }}>
                                                ${(group.tickets.length * 10000).toLocaleString()}
                                            </div>
                                            <button
                                                className="primary"
                                                onClick={async () => {
                                                    if (!confirm(`¿Aprobar ${group.tickets.length} cartones para ${group.name}?`)) return;
                                                    try {
                                                        const ids = group.tickets.map(t => t.id);
                                                        await approveBatchTickets(ids);
                                                        // Auto-copy link on approval for convenience (use first ticket for data)
                                                        copyShareLink(group.tickets[0]);
                                                        await loadData();
                                                    } catch (e) { alert(e.message) }
                                                }}
                                                style={{ background: '#F59E0B', border: 'none', width: '100%' }}
                                            >
                                                Aprobar Todos
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })()}

            {/* Active Players Section (Grouped) */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '15px', background: 'var(--color-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Clientes Activos</h3>
                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Agrupados por Teléfono/Nombre</span>
                </div>

                {(() => {
                    // Grouping Logic
                    const activePlayers = players.filter(p => p.status !== 'PENDING');
                    if (activePlayers.length === 0) {
                        return <div style={{ padding: '30px', textAlign: 'center', opacity: 0.5 }}>No hay jugadores registrados.</div>;
                    }

                    const grouped = {};
                    activePlayers.forEach(p => {
                        const key = p.phone || p.name;
                        if (!grouped[key]) grouped[key] = {
                            name: p.name,
                            phone: p.phone,
                            tickets: []
                        };
                        grouped[key].tickets.push(p);
                    });

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {Object.values(grouped).map((group, i) => (
                                <ClientGroupRow key={i} group={group} gameId={gameId} />
                            ))}
                        </div>
                    );
                })()}
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

const ClientGroupRow = ({ group, gameId }) => {
    const [expanded, setExpanded] = useState(false);

    const shareAll = () => {
        const links = group.tickets.map((t, i) => `🎟️ *Cartón ${t.pin}*: ${window.location.origin}/play/${gameId}?card=${t.id}`).join('\n');
        const msg = `👋 *¡Hola ${group.name}!* \n\nAquí están tus ${group.tickets.length} cartones para el Bingo:\n\n${links}\n\n¡Buena suerte! 🍀`;

        // Use Native Share if mobile, otherwise copy
        if (navigator.share) {
            navigator.share({ title: 'Tus Cartones', text: msg }).catch(console.error);
        } else {
            navigator.clipboard.writeText(msg);
            alert('Enlaces copiados. ¡Pégalos en WhatsApp!');
        }
    };

    return (
        <div style={{ borderBottom: '1px solid var(--color-border)', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', fontWeight: 'bold'
                    }}>
                        {group.tickets.length}
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{group.name}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{group.phone || 'Sin teléfono'}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={shareAll}
                        style={{ background: '#25D366', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        <Share2 size={16} /> Enviar Todo
                    </button>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {expanded ? 'Ocultar' : 'Ver Cartones'}
                    </button>
                </div>
            </div>

            {expanded && (
                <div style={{ marginTop: '15px', paddingLeft: '50px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.tickets.map(ticket => (
                        <div key={ticket.id} style={{
                            background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span style={{ fontFamily: 'monospace' }}>PIN: <strong>{ticket.pin}</strong></span>
                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}/play/${gameId}?card=${ticket.id}`;
                                    const msg = `🎟️ *Tu Cartón ${ticket.pin}*: ${link}`;
                                    if (navigator.share) navigator.share({ text: msg });
                                    else { navigator.clipboard.writeText(msg); alert('Copiado!'); }
                                }}
                                style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}
                            >
                                Compartir Individual
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GameAdmin;
