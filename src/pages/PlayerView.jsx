import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getGame, getTicketsByPhone, updateTicket } from '../utils/storage';
import { checkWin, checkPatternWin } from '../utils/bingoLogic';
import { supabase } from '../utils/supabaseClient';
import { Trophy, Phone, Grid, Volume2 } from 'lucide-react';

const getBallColor = (n) => {
    if (n <= 15) return '#ef4444'; // B - Red
    if (n <= 30) return '#f59e0b'; // I - Yellow
    if (n <= 45) return '#22c55e'; // N - Green
    if (n <= 60) return '#3b82f6'; // G - Blue
    return '#a855f7'; // O - Purple
};

const PlayerView = () => {
    const { gameId } = useParams(); // Now receiving gameId, not token

    // Capture Referrer
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) localStorage.setItem('referral_code', ref);
    }, []);

    // State
    const [game, setGame] = useState(null);
    const [myTickets, setMyTickets] = useState([]);
    const [activeTicketIndex, setActiveTicketIndex] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Login Inputs
    const [phoneInput, setPhoneInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Initial Game Load
    useEffect(() => {
        loadGame();
    }, [gameId]);

    // Real-time Game Sync
    useEffect(() => {
        if (!gameId) return;
        const channel = supabase
            .channel(`player_game_${gameId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bingo_games', filter: `id=eq.${gameId}` }, (payload) => {
                setGame(payload.new);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [gameId]);

    // Audio Announcer
    const lastAnnouncedRef = useRef(null);
    useEffect(() => {
        if (!game?.called_numbers?.length) return;
        const last = game.called_numbers[game.called_numbers.length - 1];

        if (lastAnnouncedRef.current === null) {
            lastAnnouncedRef.current = last; // Sync on load without speaking
        } else if (last !== lastAnnouncedRef.current) {
            lastAnnouncedRef.current = last;
            // Speak Only New Numbers
            const u = new SpeechSynthesisUtterance(last.toString());
            u.lang = 'es-ES';
            window.speechSynthesis.speak(u);
        }
    }, [game?.called_numbers]);

    const loadGame = async () => {
        try {
            const g = await getGame(gameId);
            setGame(g);
            // Check session storage for auto-login
            const savedPhone = localStorage.getItem(`bingo_phone_${gameId}`);
            if (savedPhone) {
                setPhoneInput(savedPhone);
                handleLogin(null, savedPhone);
            }
        } catch (error) {
            console.error("Error loading game:", error);
        }
    };

    const handleLogin = async (e, directPhone = null) => {
        if (e) e.preventDefault();
        const phoneToUse = directPhone || phoneInput;

        if (!phoneToUse) return;
        setLoading(true);

        try {
            const tickets = await getTicketsByPhone(gameId, phoneToUse);
            if (tickets && tickets.length > 0) {
                setMyTickets(tickets);
                setIsAuthenticated(true);
                localStorage.setItem(`bingo_phone_${gameId}`, phoneToUse);
            } else {
                if (!directPhone) alert("No encontramos cartones PAGOS con ese celular.");
            }
        } catch (error) {
            alert("Error al ingresar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (cellId) => {
        const currentTicket = myTickets[activeTicketIndex];
        const newCard = currentTicket.card_matrix.map(cell => {
            if (cell.id === cellId) return { ...cell, marked: !cell.marked };
            return cell;
        });

        // Optimistic UI Update
        const updatedTickets = [...myTickets];
        updatedTickets[activeTicketIndex] = { ...currentTicket, card_matrix: newCard };
        setMyTickets(updatedTickets);

        // Save DB
        try {
            await updateTicket(currentTicket.id, { card_matrix: newCard });
        } catch (e) { console.error(e); }
    };

    const handleBingoCall = async () => {
        const ticket = myTickets[activeTicketIndex];

        // Strict Validation against Game Pattern
        const pattern = game.winning_pattern || [];
        const matchesPattern = checkPatternWin(ticket.card_matrix, pattern);

        if (matchesPattern) {

            try {
                // Send Claim to DB
                alert("🎉 ¡BINGO! Enviando aviso a la pantalla principal...");
                await updateTicket(ticket.id, { status: 'WIN_CLAIMED' });
                alert("✅ ¡Enviado! El organizador verificará tu victoria ahora.");
            } catch (err) {
                console.error(err);
                alert("Error enviando bingo: " + err.message);
            }

        } else {
            alert("⚠️ El sistema no detecta un Bingo válido aún. Revisa tus marcas.");
        }
    };

    if (!game) return <div className="p-4 text-center">Cargando Bingo...</div>;

    // LOGIN SCREEN
    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>{game.name}</h1>
                    <p style={{ opacity: 0.8 }}>Ingresa a tus cartones</p>
                </div>

                <div className="card" style={{ width: '100%', maxWidth: '350px' }}>
                    <form onSubmit={(e) => handleLogin(e)}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Phone size={16} /> Tu Celular
                            </label>
                            <input
                                type="tel"
                                placeholder="Ej. 3001234567"
                                value={phoneInput}
                                onChange={e => setPhoneInput(e.target.value)}
                                style={{ width: '100%', padding: '12px', fontSize: '1.2rem', textAlign: 'center', marginTop: '5px' }}
                            />
                        </div>
                        <button type="submit" className="primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                            {loading ? 'Buscando...' : 'Entrar a Jugar'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // GAME INTERFACE
    const activeTicket = myTickets[activeTicketIndex];

    return (
        <div style={{ padding: '10px', maxWidth: '500px', margin: '0 auto', paddingBottom: '80px' }}>
            {/* Header */}
            <div style={{ background: 'var(--color-secondary)', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{game.name}</h2>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                        {myTickets.length} Cartón{myTickets.length > 1 ? 'es' : ''} Activos
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <small>Última Balota</small>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--color-accent)', lineHeight: 1 }}>
                        {game.current_number || '--'}
                    </div>
                </div>
            </div>

            {/* GAME INFO & BALL DISPLAY (Mobile Friendly) */}
            <div style={{ marginBottom: '15px' }}>
                {game?.called_numbers?.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 10px' }}>

                        {/* HISTORY (Scrollable RTL) */}
                        <div
                            style={{
                                flex: 1, overflowX: 'auto', display: 'flex', gap: '5px', paddingBottom: '5px',
                                direction: 'rtl', textAlign: 'left' // Left align text inside balls if needed
                            }}
                        >
                            {/* We show RECENT history first (at Right due to RTL), scroll left for older */}
                            {game.called_numbers.slice(0, game.called_numbers.length - 1).reverse().map(num => (
                                <div key={num} style={{
                                    minWidth: '35px', height: '35px',
                                    background: getBallColor(num),
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.9rem', fontWeight: 'bold', color: 'white',
                                    opacity: 0.8,
                                    flexShrink: 0
                                }}>
                                    {num}
                                </div>
                            ))}
                        </div>

                        {/* CURRENT BALL (Fixed Right) */}
                        <div className="pop-in" style={{
                            width: '75px', height: '75px',
                            background: getBallColor(game.called_numbers[game.called_numbers.length - 1]),
                            borderRadius: '50%',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '900', color: 'white',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                            border: '4px solid rgba(255,255,255,0.3)',
                            flexShrink: 0,
                            lineHeight: 1
                        }}>
                            <span style={{ fontSize: '2.5rem' }}>{game.called_numbers[game.called_numbers.length - 1]}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>ACTUAL</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const u = new SpeechSynthesisUtterance(game.called_numbers[game.called_numbers.length - 1].toString());
                                    u.lang = 'es-ES';
                                    window.speechSynthesis.speak(u);
                                }}
                                style={{
                                    marginTop: '2px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                                    width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white'
                                }}
                            >
                                <Volume2 size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '20px', background: 'var(--color-secondary)', borderRadius: '10px', textAlign: 'center' }}>
                        Esperando inicio del juego...
                    </div>
                )}
            </div>

            {/* TAB SELECTOR (If multiple) */}
            {myTickets.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '15px', paddingBottom: '5px' }}>
                    {myTickets.map((t, idx) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTicketIndex(idx)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: `2px solid ${activeTicketIndex === idx ? 'var(--color-accent)' : 'transparent'}`,
                                background: activeTicketIndex === idx ? 'rgba(233, 69, 96, 0.1)' : 'var(--color-secondary)',
                                borderRadius: '8px',
                                minWidth: '80px',
                                cursor: 'pointer',
                                color: activeTicketIndex === idx ? 'var(--color-accent)' : 'inherit'
                            }}
                        >
                            Cartón #{idx + 1}
                        </button>
                    ))}
                </div>
            )}

            {/* BINGO CARD */}
            <div style={{ background: '#1a1a2e', padding: '10px', borderRadius: '15px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '0 10px' }}>
                    <span style={{ opacity: 0.6 }}>PIN: {activeTicket.pin}</span>
                    <span style={{ fontWeight: 'bold' }}>{activeTicket.name}</span>
                </div>

                {/* Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '5px' }}>
                    {['B', 'I', 'N', 'G', 'O'].map(l => (
                        <div key={l} style={{ textAlign: 'center', fontWeight: '900', color: 'var(--color-primary)', fontSize: '1.2rem' }}>{l}</div>
                    ))}
                </div>

                {/* Grid Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gridAutoFlow: 'column', gap: '8px', aspectRatio: '1/1' }}>
                    {activeTicket.card_matrix.map(cell => {
                        const isCalled = game.called_numbers?.includes(cell.number) || cell.number === 'FREE';
                        const showHint = game.hints_enabled !== false; // Default True
                        const isMarked = cell.marked;

                        const hintBg = (showHint && isCalled) ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255,255,255,0.05)';

                        return (
                            <button
                                key={cell.id}
                                onClick={() => handleMark(cell.id)}
                                style={{
                                    aspectRatio: '1/1',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: isMarked ? 'var(--color-primary)' : hintBg,
                                    color: isMarked ? 'white' : 'inherit',
                                    fontSize: cell.number === 'FREE' ? '0.7rem' : '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: isMarked ? '0 0 10px var(--color-primary)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {cell.number}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ACTION BUTTON */}
            <button
                onClick={handleBingoCall}
                style={{
                    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(45deg, #FFD700, #F59E0B)', color: 'black',
                    padding: '15px 40px', borderRadius: '50px', fontWeight: '900', fontSize: '1.2rem',
                    boxShadow: '0 10px 30px rgba(245, 158, 11, 0.4)', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '10px', zIndex: 100
                }}
            >
                <Trophy size={24} /> ¡BINGO!
            </button>
        </div>
    );
};

export default PlayerView;
