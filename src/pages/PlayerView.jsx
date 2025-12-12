import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTicket, getGame, checkWin, updateTicket } from '../utils/storage';
import { supabase } from '../utils/supabaseClient'; // NEW STATIC IMPORT
import { Trophy, AlertTriangle } from 'lucide-react';

const PlayerView = () => {
    const { token } = useParams();
    const [ticket, setTicket] = useState(null);
    const [game, setGame] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Game State from "Server" (Storage)
    const [currentNumber, setCurrentNumber] = useState(null);

    // Initial Load & Auth Check
    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Ticket
                const t = await getTicket(token);
                if (t) {
                    setTicket(t);
                    // Fetch Game
                    const g = await getGame(t.game_id); // Note: Supabase returns snake_case
                    setGame(g);
                    setCurrentNumber(g.current_number);
                }
            } catch (err) {
                console.error("Error loading ticket:", err);
            }
        };
        loadData();
    }, [token]);

    // Live Sync Effect (Realtime)
    useEffect(() => {
        if (!isAuthenticated || !game) return;

        const channel = supabase
            .channel(`game_player_${game.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bingo_games', filter: `id=eq.${game.id}` }, (payload) => {
                const updatedGame = payload.new;
                setGame(updatedGame);
                setCurrentNumber(updatedGame.current_number);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAuthenticated, game?.id]); // Use game?.id to avoid deep object dependency

    const handleLogin = (e) => {
        e.preventDefault();
        // Check PIN locally for now (Ticket loaded publically by ID, but View restricted by PIN)
        // Ideally should verify on backend, but for MVP this is okay.
        // We compare against ticket.pin from DB.
        if (ticket && ticket.pin === pinInput) {
            setIsAuthenticated(true);
        } else {
            alert("PIN Incorrecto");
        }
    };

    const handleMark = async (cellId) => {
        if (!isAuthenticated) return;

        const newCard = ticket.card_matrix.map(cell => {
            if (cell.id === cellId) {
                return { ...cell, marked: !cell.marked };
            }
            return cell;
        });

        // Optimistic Update
        const newTicket = { ...ticket, card_matrix: newCard };
        setTicket(newTicket);

        // Save to DB (Cloud Persistence)
        try {
            await updateTicket(ticket.id, { card_matrix: newCard });
        } catch (err) {
            console.error("Error saving mark:", err);
            // Optionally revert or warn
        }
    };

    const handleBingoCall = () => {
        // Simple client-side validation first
        if (checkWin(ticket.card_matrix, 'HORIZONTAL_LINE') || checkWin(ticket.card_matrix, 'VERTICAL_LINE') || checkWin(ticket.card_matrix, 'DIAGONAL') || checkWin(ticket.card_matrix, 'FULL_HOUSE')) {
            alert("¡BINGO CANTADO! Esperando confirmación del organizador...");
            // In real app, emit 'BINGO_CLAIM' event
        } else {
            alert("¡Cuidado! Aún no tienes Bingo válido.");
        }
    };

    if (!ticket) return <div className="p-4 text-center">Buscando ticket...</div>;

    if (!isAuthenticated) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <h1 style={{ marginBottom: '2rem' }}>🔐 Ingreso Seguro</h1>
                <p>Hola <strong>{ticket.playerName}</strong></p>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
                    <input
                        type="tel"
                        maxLength="4"
                        placeholder="Ingresa tu PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        style={{ padding: '1rem', fontSize: '1.5rem', textAlign: 'center', borderRadius: '8px' }}
                    />
                    <button type="submit" style={{ padding: '1rem', background: '#e94560', color: 'white', fontWeight: 'bold' }}>
                        ENTRAR A JUGAR
                    </button>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '1rem' }}>
                        PIN de prueba: {ticket.pin}
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto' }}>
            {/* Header Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#16213e', padding: '1rem', borderRadius: '12px' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>JUGANDO</div>
                    <div style={{ fontWeight: 'bold' }}>{game.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>ÚLTIMA BALOTA</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#e94560' }}>
                        {currentNumber || '--'}
                    </div>
                </div>
            </div>

            {/* The Card */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px',
                background: '#0f3460', padding: '10px', borderRadius: '12px',
                aspectRatio: '1/1'
            }}>
                {/* Headers */}
                {['B', 'I', 'N', 'G', 'O'].map(l => (
                    <div key={l} style={{ textAlign: 'center', fontWeight: '900', padding: '5px' }}>{l}</div>
                ))}

                {/* Cells */}
                {ticket.card_matrix.map((cell) => {
                    const isLastCalled = cell.number === currentNumber;
                    const canMark = (game.called_numbers || []).includes(cell.number) || cell.number === 'FREE';
                    // Plan says: Blink if number is called but not marked.
                    const shouldBlink = isLastCalled && !cell.marked;

                    return (
                        <button
                            key={cell.id}
                            onClick={() => handleMark(cell.id)}
                            className={shouldBlink ? 'blink-animation' : ''}
                            style={{
                                aspectRatio: '1/1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%',
                                border: 'none',
                                background: cell.marked ? '#e94560' : (shouldBlink ? '#e94560' : 'rgba(255,255,255,0.1)'),
                                color: cell.marked ? 'white' : 'inherit',
                                fontSize: cell.number === 'FREE' ? '0.6rem' : '1.2rem',
                                fontWeight: 'bold',
                                padding: 0
                            }}
                        >
                            {cell.number}
                        </button>
                    );
                })}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                    onClick={handleBingoCall}
                    style={{
                        width: '100%', padding: '1rem', fontSize: '1.2rem', fontWeight: '900',
                        background: 'linear-gradient(45deg, #FFD700, #DAA520)',
                        color: '#000',
                        boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                        textTransform: 'uppercase'
                    }}
                >
                    <Trophy size={20} style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} />
                    ¡Cantar Bingo!
                </button>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '1rem' }}>
                    Presiona solo si tienes una línea completa o cartón lleno.
                </p>
            </div>
        </div>
    );
};

export default PlayerView;
