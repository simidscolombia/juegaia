import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getGame, getTicketsByPhone, updateTicket, getUserCredits, payRoundFee } from '../utils/storage';
import { checkWin, checkPatternWin } from '../utils/bingoLogic';
import { supabase } from '../utils/supabaseClient';
import { Trophy, Phone, Grid, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';

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
    const [userCredits, setUserCredits] = useState(0); // Credits State

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
                // Filter only PAID/Active tickets just in case query returned pending (though getTicketsByPhone usually returns clean list, better safe)
                // Filter PAID, WIN_CLAIMED, or AWAITING_PAYMENT
                const activeTickets = tickets.filter(t =>
                    t.status === 'PAID' ||
                    t.status === 'WIN_CLAIMED' ||
                    t.status === 'AWAITING_PAYMENT'
                );

                if (activeTickets.length > 0) {
                    setMyTickets(activeTickets);
                    setIsAuthenticated(true);
                    localStorage.setItem(`bingo_phone_${gameId}`, phoneToUse);

                    // Fetch Credits
                    if (activeTickets[0].user_id) {
                        getUserCredits(activeTickets[0].user_id).then(setUserCredits);
                    }
                } else {
                    alert("Tienes cartones registrados pero AÚN NO ESTÁN ACTIVOS. El administrador debe verificar tu pago.");
                }
            } else {
                if (!directPhone) alert("No encontramos cartones con ese celular.");
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

    const [hasCelebrated, setHasCelebrated] = useState(false);

    const celebrate = () => {
        // Confetti burst
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        // Voice cheer
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance('¡Felicidades!');
            u.lang = 'es-ES';
            window.speechSynthesis.speak(u);
        }
    };

    const handleBingoCall = async () => {
        const ticket = myTickets[activeTicketIndex];

        // Strict Validation against Game Pattern
        const pattern = game.winning_pattern || [];
        const matchesPattern = checkPatternWin(ticket.card_matrix, pattern);

        if (!matchesPattern) {
            alert("⚠️ El sistema no detecta la figura ganadora aún. Revisa tus marcas.");
            return;
        }

        // Anti-Cheat Validation: Check if marked numbers were actually called
        const called = game.called_numbers || [];
        const markedCells = ticket.card_matrix.filter(c => c.marked);
        const invalidMarks = markedCells.filter(c => c.number !== 'FREE' && !called.includes(c.number));

        if (invalidMarks.length > 0) {
            alert(`⛔ ¡Error! Has marcado números que NO han salido: ${invalidMarks.map(c => c.number).join(', ')}.\n\nPor favor desmárcalos.`);
            return;
        }

        try {
            // Send Claim to DB
            alert("🎉 ¡BINGO! Enviando aviso a la pantalla principal...");
            await updateTicket(ticket.id, {
                status: 'WIN_CLAIMED',
                claimed_at: new Date().toISOString()
            });
            alert("✅ ¡Enviado! El organizador verificará tu victoria ahora.");
            if (!hasCelebrated) {
                celebrate();
                setHasCelebrated(true);
            }
        } catch (err) {
            console.error(err);
            alert("Error enviando bingo: " + err.message);
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
                        // 1. Pattern Logic
                        const pattern = game.winning_pattern;
                        // Calculate Visual Index (Row-Major 0..24) to match Admin Pattern Entitor
                        // cell.row (0-4) * 5 + cell.col (0-4)
                        const visualIndex = (cell.row !== undefined && cell.col !== undefined)
                            ? (cell.row * 5 + cell.col)
                            : -1;

                        // If pattern is defined and full (length > 0 and < 25), filter. 
                        // If pattern is empty/null, consider all valid (Full House or Default).
                        const isPartOfPattern = !pattern || pattern.length === 0 || visualIndex === -1 || pattern.includes(visualIndex);

                        const isCalled = game.called_numbers?.includes(cell.number) || cell.number === 'FREE';
                        const showHint = game.hints_enabled !== false;
                        const isMarked = cell.marked;

                        const hintBg = (showHint && isCalled) ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255,255,255,0.05)';
                        const activeBg = isMarked ? 'var(--color-primary)' : hintBg;

                        // Disabled Style
                        const isDisabled = !isPartOfPattern;
                        const finalBg = isDisabled ? '#222' : activeBg;

                        return (
                            <button
                                key={cell.id}
                                onClick={() => handleMark(cell.id)}
                                disabled={isDisabled}
                                style={{
                                    aspectRatio: '1/1',
                                    borderRadius: '50%',
                                    border: isDisabled ? '1px dashed #333' : 'none',
                                    background: finalBg,
                                    color: isMarked ? 'white' : (isDisabled ? 'rgba(255,255,255,0.1)' : 'inherit'),
                                    fontSize: cell.number === 'FREE' ? '0.7rem' : '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    boxShadow: (isMarked && !isDisabled) ? '0 0 10px var(--color-primary)' : 'none',
                                    opacity: isDisabled ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                    pointerEvents: isDisabled ? 'none' : 'auto'
                                }}
                            >
                                {cell.number}
                            </button>
                        );
                    })}

                </div>
            </div>

            {/* CLAIMS BOARD */}
            <div style={{ marginTop: '20px', background: '#1e293b', borderRadius: '15px', padding: '15px', border: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🔔 Reclamos de Bingo <span style={{ fontSize: '0.8rem', background: '#ef4444', padding: '2px 6px', borderRadius: '10px', display: claims.length > 0 ? 'block' : 'none' }}>{claims.length}</span>
                </h3>
                {claims.length === 0 ? (
                    <div style={{ opacity: 0.5, fontSize: '0.9rem', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>
                        Esperando que alguien cante Bingo...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {claims.map((c, i) => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', borderLeft: i === 0 ? '3px solid #F59E0B' : '3px solid #333' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>PIN: {c.pin}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#F59E0B', fontSize: '1.1rem' }}>
                                        {new Date(c.claimed_at).toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{i === 0 ? '🥇 PRIMERO' : `#${i + 1}`}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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

            {/* WINNER ANNOUNCED OVERLAY */}
            {
                game.winner_info && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 2000,
                        background: 'rgba(0,0,0,0.95)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: 'white', textAlign: 'center', padding: '20px'
                    }}>
                        <Trophy size={64} style={{ color: '#F59E0B', marginBottom: 20 }} />
                        <h1 style={{ fontSize: '2rem', margin: 0, color: '#F59E0B' }}>¡TENEMOS GANADOR!</h1>
                        <h2 style={{ fontSize: '2.5rem', margin: '15px 0' }}>{game.winner_info.name}</h2>
                        <p style={{ opacity: 0.8, fontSize: '1.2rem' }}>PIN: {game.winner_info.pin}</p>
                        <div style={{ marginTop: 30, fontSize: '0.9rem', opacity: 0.6 }}>Juego Finalizado</div>
                    </div>
                )
            }

            {/* PAYMENT REQUIRED OVERLAY */}
            {
                activeTicket.status === 'AWAITING_PAYMENT' && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 3000,
                        background: 'rgba(5, 5, 20, 0.98)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: 'white', textAlign: 'center', padding: '20px'
                    }}>
                        <h1 style={{ color: '#F59E0B' }}>💰 Activar Siguiente Ronda</h1>
                        <p style={{ fontSize: '1.1rem', opacity: 0.8 }}>Para continuar jugando con este cartón:</p>

                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '15px', margin: '20px 0', width: '100%', maxWidth: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Costo Ronda:</span>
                                <strong>${(game.round_price || 5000).toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #555', paddingTop: '10px' }}>
                                <span>Tu Saldo:</span>
                                <span style={{ color: userCredits >= (game.round_price || 5000) ? '#4ade80' : '#ef4444' }}>
                                    ${userCredits.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {userCredits >= (game.round_price || 5000) ? (
                            <button
                                onClick={async () => {
                                    if (confirm('¿Confirmar pago de $' + (game.round_price || 5000) + '?')) {
                                        try {
                                            setLoading(true);
                                            const success = await payRoundFee(activeTicket.id, (game.round_price || 5000));
                                            if (success) {
                                                alert("¡Pago exitoso! Buena suerte.");
                                                handleLogin(null, phoneInput);
                                            } else {
                                                alert("Saldo insuficiente.");
                                            }
                                        } catch (e) { alert(e.message) }
                                        finally { setLoading(false); }
                                    }
                                }}
                                className="primary"
                                style={{ padding: '15px 30px', fontSize: '1.2rem', background: '#2563EB', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                PAGAR AHORA
                            </button>
                        ) : (
                            <div>
                                <p style={{ color: '#ef4444', fontWeight: 'bold' }}>Saldo Insuficiente</p>
                                <p style={{ fontSize: '0.9rem' }}>Por favor recarga con el administrador.</p>
                                <button onClick={() => handleLogin(null, phoneInput)} style={{ marginTop: '10px', background: 'transparent', border: '1px solid white', color: 'white', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>
                                    Ya Recargué (Actualizar)
                                </button>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default PlayerView;
