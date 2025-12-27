import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGame, getGameTickets, createTicket, deleteGame, releaseTicket, updateTicket, updateGame, approveBatchTickets, deleteBingoPlayer } from '../utils/storage';
import { User, Share2, Trash, Plus, Check, Link as LinkIcon, ArrowLeft, Settings, Save, Play, RefreshCw, StopCircle } from 'lucide-react';
import { generateBingoCard } from '../utils/bingoLogic';
import { countryCodes } from '../utils/countryCodes';
import { supabase } from '../utils/supabaseClient';

const GameAdmin = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [winningPattern, setWinningPattern] = useState([]); // Array of indices 0-24
    const [hintsEnabled, setHintsEnabled] = useState(false); // Default OFF
    const [showModal, setShowModal] = useState(false);

    // WhatsApp State
    const [countryCode, setCountryCode] = useState('57');
    const [localPhone, setLocalPhone] = useState('');

    const [savingSettings, setSavingSettings] = useState(false);

    // Game Control State
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastCall, setLastCall] = useState(null);

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
            if (g && g.winning_pattern) setWinningPattern(g.winning_pattern);
            else setWinningPattern([...Array(25).keys()]); // Default Full House

            setHintsEnabled(g.hints_enabled === true); // Default False if undefined/null

            if (g && g.called_numbers && g.called_numbers.length > 0) {
                setLastCall(g.called_numbers[g.called_numbers.length - 1]);
            }
            if (g.admin_whatsapp) {
                // Try to find matching country code
                const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
                const match = sortedCodes.find(c => g.admin_whatsapp.startsWith(c.code));
                if (match) {
                    setCountryCode(match.code);
                    setLocalPhone(g.admin_whatsapp.slice(match.code.length));
                } else {
                    setLocalPhone(g.admin_whatsapp); // Fallback
                }
            }
            setPlayers(p || []);
        } catch (error) {
            console.error(error);
            alert('Error cargando datos del juego');
        } finally {
            setLoading(false);
        }
    };

    const deleteTicket = async (ticketId) => {
        if (!confirm('¿Eliminar este cartón? Esta acción no se puede deshacer.')) return;
        try {
            await deleteBingoPlayer(ticketId);
            alert('Cartón eliminado.');
            loadData();
        } catch (error) {
            alert('Error eliminando: ' + error.message);
        }
    };

    const deleteGroup = async (group) => {
        if (!confirm(`¿Estás seguro de ELIMINAR TODOS los ${group.tickets.length} cartones de ${group.name}?`)) return;

        try {
            for (const ticket of group.tickets) {
                await deleteBingoPlayer(ticket.id);
            }
            alert('Grupo eliminado correctamente.');
            loadData();
        } catch (error) {
            alert('Error eliminando grupo: ' + error.message);
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

    const drawBall = async () => {
        if (!game || isDrawing) return;
        setIsDrawing(true);

        try {
            // 1. Calculate available numbers
            const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
            const called = game.called_numbers || [];
            const available = allNumbers.filter(n => !called.includes(n));

            if (available.length === 0) {
                alert("¡Juego Terminado! Ya salieron todas las balotas.");
                setIsDrawing(false);
                return;
            }

            // 2. Pick random
            const nextBall = available[Math.floor(Math.random() * available.length)];
            const newCalled = [...called, nextBall];

            // 3. Update DB
            await updateGame(gameId, {
                calledNumbers: newCalled,
                currentNumber: nextBall,
                lastCallTime: new Date().toISOString()
            });

            // 4. Update Local
            setLastCall(nextBall);
            await loadData(); // Refresh full state

        } catch (error) {
            alert('Error sacando balota: ' + error.message);
        } finally {
            setIsDrawing(false);
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

                {/* GAME CONTROLS - REMOTE */}
                <div style={{ marginTop: '20px', padding: '15px', background: '#1e293b', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', opacity: 0.9 }}>Control Remoto de Balotera</h2>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: lastCall ? 'white' : 'rgba(255,255,255,0.1)',
                            color: lastCall ? '#000' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem', fontWeight: 'bold'
                        }}>
                            {lastCall || '--'}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Última Balota</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {(game.called_numbers || []).length} / 75
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={drawBall}
                        disabled={isDrawing}
                        className="primary"
                        style={{
                            width: '100%', padding: '15px', fontSize: '1.2rem',
                            background: isDrawing ? '#475569' : '#e11d48',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', marginBottom: '10px'
                        }}
                    >
                        {isDrawing ? 'Mezclando...' : 'SACAR BALOTA'}
                    </button>

                    <small style={{ display: 'block', opacity: 0.6 }}>
                        Esto actualizará la pantalla de TV automáticamente.
                    </small>
                </div>

                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontSize: '0.9rem' }}>
                        <Settings size={16} /> WhatsApp para Comprobantes
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                            <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', maxWidth: '80px' }}
                            >
                                {countryCodes.map(c => (
                                    <option key={c.code} value={c.code}>{c.flag} +{c.code}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="3001234567"
                                value={localPhone}
                                onChange={(e) => setLocalPhone(e.target.value.replace(/\D/g, ''))}
                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                            />
                        </div>
                        <button
                            onClick={async () => {
                                setSavingSettings(true);
                                try {
                                    const fullNumber = countryCode + localPhone;
                                    await updateGame(gameId, { adminWhatsapp: fullNumber });
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
                        Selecciona tu país y número. A este WhatsApp llegarán los comprobantes.
                    </small>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                            {players.length}
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>Jugadores</div>
                    </div>
                </div>
            </div>

            {/* PATTERN & HINTS CONFIGURATION */}
            <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>🏆 Configuración de Juego</h3>
                        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Define reglas y ayudas visuales.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: '#333', padding: '5px 10px', borderRadius: '5px' }}>
                            <input
                                type="checkbox"
                                checked={hintsEnabled}
                                onChange={(e) => setHintsEnabled(e.target.checked)}
                            />
                            <span>Ayudas Visuales (Indicar Balotas)</span>
                        </label>
                        <button
                            onClick={async () => {
                                try {
                                    await updateGame(gameId, { winningPattern, hintsEnabled });
                                    alert('Configuración guardada correctamente');
                                } catch (e) { alert(e.message) }
                            }}
                            style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
                    {/* Presets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
                        <strong>Plantillas:</strong>
                        <button onClick={() => setWinningPattern([...Array(25).keys()])} style={{ padding: '8px', background: 'var(--color-secondary)', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}>🔳 Plena (Todo)</button>
                        <button onClick={() => setWinningPattern([0, 4, 6, 8, 12, 16, 18, 20, 24])} style={{ padding: '8px', background: 'var(--color-secondary)', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}>❌ Forma X</button>
                        <button onClick={() => setWinningPattern([0, 5, 10, 15, 20, 21, 22, 23, 24])} style={{ padding: '8px', background: 'var(--color-secondary)', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}>╚ Forma L</button>
                        <button onClick={() => setWinningPattern([0, 4, 20, 24])} style={{ padding: '8px', background: 'var(--color-secondary)', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}>⛶ 4 Esquinas</button>
                        <button onClick={() => setWinningPattern([])} style={{ padding: '8px', background: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}>🗑️ Limpiar</button>
                    </div>

                    {/* Grid Editor */}
                    <div>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px',
                            background: '#000', padding: '10px', borderRadius: '10px'
                        }}>
                            {[...Array(25)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setWinningPattern(prev =>
                                            prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
                                        );
                                    }}
                                    style={{
                                        width: '45px', height: '45px',
                                        background: winningPattern.includes(i) ? '#22c55e' : '#333',
                                        border: i === 12 ? '2px solid gold' : 'none', // Center
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        color: 'white', fontWeight: 'bold'
                                    }}
                                >
                                    {i === 12 ? '★' : ''}
                                </button>
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '0.8rem', opacity: 0.6 }}>Clic para marcar/desmarcar</div>
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
            {
                (() => {
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
                                    {Object.values(groups).map((group, i) => {
                                        // Find if any ticket in group has proof url (usually all same for batch, but check first)
                                        const proofUrl = group.tickets.find(t => t.payment_proof_url)?.payment_proof_url;

                                        return (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                                <td style={{ padding: '10px' }}>
                                                    <strong>{group.name}</strong><br />
                                                    <small>{group.phone}</small>
                                                    <div style={{ marginTop: '5px', fontSize: '0.85rem', opacity: 0.8 }}>
                                                        Solicita {group.tickets.length} cartón{group.tickets.length > 1 ? 'es' : ''}
                                                    </div>
                                                    {proofUrl && (
                                                        <a
                                                            href={proofUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                                marginTop: '8px', background: '#fff', color: '#000',
                                                                padding: '4px 8px', borderRadius: '4px', textDecoration: 'none',
                                                                fontSize: '0.8rem', fontWeight: 'bold'
                                                            }}
                                                        >
                                                            <LinkIcon size={14} /> Ver Comprobante
                                                        </a>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '10px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#F59E0B', marginBottom: '5px' }}>
                                                        ${(group.tickets.length * (game.ticket_price || 10000)).toLocaleString()}
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
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })()
            }

            {/* Active Players Section (Grouped) */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '15px', background: 'var(--color-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>Clientes Activos</h3>
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
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                <thead>
                                    <tr style={{ background: 'var(--color-secondary)', color: 'var(--color-text)', textAlign: 'left' }}>
                                        <th style={{ padding: '12px', borderRadius: '8px 0 0 8px' }}>Cliente</th>
                                        <th style={{ padding: '12px' }}>Teléfono</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Cartones</th>
                                        <th style={{ padding: '12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(grouped).map((group, i) => (
                                        <ClientGroupTableRow
                                            key={i}
                                            group={group}
                                            gameId={gameId}
                                            onDeleteGroup={() => deleteGroup(group)}
                                            onDeleteTicket={deleteTicket}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}
            </div>

            {/* Modal Vender Cartón */}
            {
                showModal && (
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
                )
            }
        </div >
    );
};

const ClientGroupTableRow = ({ group, gameId, onDeleteGroup, onDeleteTicket }) => {
    const [expanded, setExpanded] = useState(false);

    const shareAll = () => {
        const links = group.tickets.map((t, i) => `🎟️ *Cartón ${t.pin}*: ${window.location.origin}/play/${gameId}?card=${t.id}`).join('\n');
        const msg = `👋 *¡Hola ${group.name}!* \n\nAquí están tus ${group.tickets.length} cartones para el Bingo:\n\n${links}\n\n¡Buena suerte! 🍀`;

        if (navigator.share) {
            navigator.share({ title: 'Tus Cartones', text: msg }).catch(console.error);
        } else {
            navigator.clipboard.writeText(msg);
            alert('Enlaces copiados. ¡Pégalos en WhatsApp!');
        }
    };

    return (
        <>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9rem' }}>
                            {group.name.charAt(0).toUpperCase()}
                        </div>
                        {group.name}
                    </div>
                </td>
                <td style={{ padding: '12px', opacity: 0.8 }}>{group.phone || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>
                        {group.tickets.length}
                    </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                            onClick={shareAll}
                            style={{ background: '#25D366', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}
                            title="Enviar WhatsApp"
                        >
                            <Share2 size={16} /> Enviar
                        </button>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            {expanded ? '▲' : '▼ Ver'}
                        </button>
                        <button
                            onClick={onDeleteGroup}
                            style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                            title="Eliminar Todo"
                        >
                            <Trash size={16} />
                        </button>
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={4} style={{ padding: '0 0 15px 0', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {group.tickets.map(ticket => (
                                <div key={ticket.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px dashed rgba(255,255,255,0.1)', alignItems: 'center' }}>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>PIN: {ticket.pin}</span>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button
                                            onClick={() => {
                                                const link = `${window.location.origin}/play/${gameId}?card=${ticket.id}`;
                                                navigator.clipboard.writeText(link);
                                                alert('Link copiado');
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            Copiar Link
                                        </button>
                                        <button
                                            onClick={() => onDeleteTicket(ticket.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <Trash size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default GameAdmin;
