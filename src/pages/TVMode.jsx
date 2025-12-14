import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getGame, updateGame, generateBallSequence } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { Play, Pause, FastForward, Settings } from 'lucide-react';

const TVMode = () => {
    const { gameId } = useParams();
    const [game, setGame] = useState(null);
    const [ballSequence, setBallSequence] = useState([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [lastCall, setLastCall] = useState(null);
    const lastCallRef = useRef(null); // Ref to track lastCall in closures

    // Auto Play State
    const [autoPlay, setAutoPlay] = useState(false);
    const [speed, setSpeed] = useState(8); // Seconds
    const autoPlayRef = useRef(null);

    // Decoration Balls for "Physics"
    const [decoBalls, setDecoBalls] = useState([]);

    useEffect(() => {
        // Generate random balls for the visual drum (INCREASED COUNT)
        const balls = Array.from({ length: 60 }).map((_, i) => ({
            id: i,
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            color: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c'][Math.floor(Math.random() * 5)],
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2
        }));
        setDecoBalls(balls);
    }, []);

    // Load Game & Realtime Sync
    useEffect(() => {
        const fetchGame = async () => {
            try {
                const g = await getGame(gameId);
                if (g) {
                    setGame(g);
                    if (g.called_numbers && g.called_numbers.length > 0) {
                        setLastCall(g.called_numbers[g.called_numbers.length - 1]);
                    }
                }
            } catch (error) {
                console.error("Error fetching game:", error);
            }
        };

        fetchGame();

        // Realtime Subscription
        const channel = supabase
            .channel(`game_updates_${gameId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bingo_games',
                    filter: `id=eq.${gameId}`
                },
                (payload) => {
                    const newGameData = payload.new;
                    setGame(newGameData);

                    if (newGameData.called_numbers && newGameData.called_numbers.length > 0) {
                        const newLastCall = newGameData.called_numbers[newGameData.called_numbers.length - 1];

                        // If it's a NEW number we haven't shown yet (Correctly check against Ref)
                        if (newLastCall !== lastCallRef.current) {
                            // 1. Start Animation
                            setIsSpinning(true);

                            // 2. Wait for spin (Sync with CSS animation time)
                            setTimeout(() => {
                                setIsSpinning(false);
                                setLastCall(newLastCall);
                                lastCallRef.current = newLastCall; // Update Ref

                                // 3. Speak
                                const letter = getLetter(newLastCall);
                                speakNumber(newLastCall, letter);
                            }, 2500);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId]);

    // Init sequence
    useEffect(() => {
        if (!game) return;
        if (ballSequence.length === 0) {
            setBallSequence(generateBallSequence());
        }
    }, [game?.id]); // Only if game ID changes

    // Auto Play Logic
    useEffect(() => {
        // Safe check for called_numbers vs calledNumbers (snake_case from Supabase)
        const calledLen = game?.called_numbers?.length || 0;

        if (autoPlay && !isSpinning) {
            autoPlayRef.current = setTimeout(() => {
                drawBall();
            }, speed * 1000);
        }
        return () => clearTimeout(autoPlayRef.current);
    }, [autoPlay, isSpinning, game?.called_numbers?.length, speed]);

    // TTS Function
    const speakNumber = (num, letter) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(`${letter}... ${num}`);
            utterance.lang = 'es-ES'; // Spanish
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    };

    const getLetter = (num) => {
        if (num <= 15) return 'B';
        if (num <= 30) return 'I';
        if (num <= 45) return 'N';
        if (num <= 60) return 'G';
        return 'O';
    };

    const drawBall = async () => {
        if (!game || isSpinning) return;

        // Use called_numbers (snake_case)
        const currentCalled = game.called_numbers || [];
        const available = ballSequence.filter(b => !currentCalled.includes(b));

        if (available.length === 0) {
            setAutoPlay(false);
            alert("¡Se acabaron las balotas!");
            return;
        }

        setIsSpinning(true);

        // Animation time
        setTimeout(async () => {
            const nextBall = available[0];
            const updatedCalled = [...currentCalled, nextBall];

            try {
                // Update in DB (async)
                // Note: stored proc or backend usually handles appending, but here we read-modify-write.
                // Race condition possible if multi-admin, but for single host it's fine.
                const updatedGame = await updateGame(game.id, {
                    calledNumbers: updatedCalled, // Adapter might map this to snake_case? 
                    // Wait, I mapped it in storage.js manually:
                    // if (updates.calledNumbers !== undefined) dbUpdates.called_numbers = updates.calledNumbers;
                    // So passing camelCase calledNumbers is CORRECT for my storage.js API.

                    currentNumber: nextBall,
                    status: 'PLAYING',
                    lastCallTime: new Date().toISOString()
                });

                // Update local state (Optimistic or wait for DB return)
                setGame(updatedGame);
                setLastCall(nextBall);
                setIsSpinning(false); // Enable button again

                // Speak result
                const letter = getLetter(nextBall);
                speakNumber(nextBall, letter);

            } catch (err) {
                console.error("Error creating ball:", err);
                setIsSpinning(false);
            }
        }, 2500); // 2.5s spin
    };

    const toggleAutoPlay = () => {
        const newState = !autoPlay;
        setAutoPlay(newState);
        if (!newState) clearTimeout(autoPlayRef.current);
    };

    const getColor = (num) => {
        if (num <= 15) return '#ef476f';
        if (num <= 30) return '#ffd166';
        if (num <= 45) return '#06d6a0';
        if (num <= 60) return '#118ab2';
        return '#073b4c';
    };

    if (!game) return <div className="p-10">Cargando...</div>;

    return (
        <div style={{ padding: '2vh', height: '100vh', display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem', boxSizing: 'border-box', overflow: 'hidden' }}>

            {/* Sidebar: Drum & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#16213e', borderRadius: '20px', padding: '1.5rem', justifyContent: 'space-between' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', opacity: 0.8, marginBottom: '1rem' }}>
                    <h3>{game.name}</h3>
                </div>

                {/* PHYSICAL DRUM SIMULATION */}
                <div style={{
                    width: '300px', height: '300px', margin: '0 auto', position: 'relative',
                    borderRadius: '50%',
                    border: '8px solid #c0c0c0',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.5)',
                    // Mesh Pattern for Cage
                    background: `
                radial-gradient(circle at 40% 40%, rgba(255,255,255,0.1), transparent 60%),
                repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 20px),
                repeating-linear-gradient(-45deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 20px),
                linear-gradient(to bottom, #2a3b55, #0f172a)
            `,
                    overflow: 'hidden'
                }}>

                    {/* The Cage Spinner Layer (Rotates the whole cage texture slightly) */}
                    <div className={isSpinning ? 'cage-spin' : ''} style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}>
                        {/* Bouncing Balls Layer */}
                        {decoBalls.map((ball, i) => (
                            <div key={i} className={isSpinning ? `tumble-${i % 8}` : 'floating-ball'} style={{
                                position: 'absolute',
                                left: `${ball.x}%`, top: `${ball.y}%`, // Use random start pos
                                width: '28px', height: '28px',
                                margin: '-14px', // Centering
                                borderRadius: '50%',
                                background: `radial-gradient(circle at 35% 35%, white 5%, ${ball.color} 30%, #000 100%)`,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                opacity: isSpinning ? 1 : 0.8,
                                zIndex: Math.floor(Math.random() * 10),
                                // Important: Randomize animation details inline to avoid sync
                                animationDuration: isSpinning ? `${0.5 + Math.random() * 0.5}s` : '3s',
                                animationDelay: `-${Math.random() * 2}s`
                            }}>
                                <span style={{
                                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                    color: 'white', fontWeight: 'bold', fontSize: '10px', textShadow: '0 1px 2px black'
                                }}>
                                    {/* Fake Numbers for visual richness */}
                                    {Math.floor(Math.random() * 75) + 1}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* RESULT BALL POPUP */}
                    {lastCall && !isSpinning && (
                        <div className="pop-in" style={{
                            position: 'absolute', inset: 0, margin: 'auto',
                            width: '180px', height: '180px', borderRadius: '50%',
                            background: `radial-gradient(circle at 30% 30%, white 5%, ${getColor(lastCall)} 30%, #000 100%)`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                            zIndex: 20, border: '4px solid rgba(255,255,255,0.2)'
                        }}>
                            <span style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                {(game.called_numbers || []).length > 0 ? (lastCall <= 15 ? 'B' : lastCall <= 30 ? 'I' : lastCall <= 45 ? 'N' : lastCall <= 60 ? 'G' : 'O') : ''}
                            </span>
                            <span style={{ fontSize: '6rem', fontWeight: '900', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                {lastCall}
                            </span>
                        </div>
                    )}
                </div>

                {/* CONTROLS */}
                <div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
                    {/* Main Draw Button */}
                    {!autoPlay && (
                        <button
                            onClick={drawBall}
                            disabled={isSpinning}
                            style={{
                                padding: '1rem', fontSize: '1.2rem', background: isSpinning ? '#30475e' : '#e94560', color: 'white',
                                border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: isSpinning ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 0 rgba(0,0,0,0.3)', transform: isSpinning ? 'translateY(2px)' : 'none',
                                transition: 'all 0.1s'
                            }}
                        >
                            {isSpinning ? 'MEZCLANDO...' : 'SACAR BALOTA MANUAL'}
                        </button>
                    )}

                    {/* Auto Play Panel */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                                <Settings size={16} /> Modo Automático
                            </span>
                            <button
                                onClick={toggleAutoPlay}
                                style={{ background: autoPlay ? '#ef476f' : '#06d6a0', padding: '5px 15px', fontSize: '0.9rem' }}
                            >
                                {autoPlay ? <Pause size={16} /> : <Play size={16} />}
                                {autoPlay ? ' PAUSAR' : ' ACTIVAR'}
                            </button>
                        </div>

                        {autoPlay && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                                <span>Velocidad:</span>
                                <input
                                    type="range" min="4" max="15" step="1"
                                    value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                                    style={{ flex: 1 }}
                                />
                                <span>{speed}s</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Board */}
            <div style={{ background: '#16213e', borderRadius: '20px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>TABLERO DE CONTROL</span>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#4cc9f0' }}>
                        {(game.called_numbers || []).length} <span style={{ fontSize: '1rem', opacity: 0.5 }}>/ 75</span>
                    </div>
                </h2>

                <div style={{ display: 'grid', gridTemplateRows: 'repeat(5, 1fr)', gap: '8px', flex: 1 }}>
                    {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => (
                        <div key={letter} style={{ display: 'flex', gap: '8px' }}>
                            <div style={{
                                flex: '0 0 50px', fontSize: '2rem', fontWeight: '900',
                                background: getColor(idx * 15 + 1), borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {letter}
                            </div>
                            <div style={{ display: 'flex', flex: 1, gap: '5px' }}>
                                {Array.from({ length: 15 }, (_, i) => {
                                    const num = idx * 15 + i + 1;
                                    const isCalled = (game.called_numbers || []).includes(num);
                                    const isLast = num === lastCall;
                                    return (
                                        <div key={num} style={{
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: '4px', fontSize: '1.1rem', fontWeight: 'bold',
                                            background: isLast ? 'white' : (isCalled ? getColor(num) : 'rgba(255,255,255,0.05)'),
                                            color: isLast ? '#000' : (isCalled ? 'white' : 'rgba(255,255,255,0.1)'),
                                            transition: 'all 0.3s',
                                            transform: isLast ? 'scale(1.15) z-index(10)' : 'scale(1)'
                                        }}>
                                            {num}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        /* Enhanced Tumble Animations - More Chaos */
        @keyframes tumble-0 { 0% { transform: translate(0,0); } 100% { transform: translate(100px, -80px); } }
        @keyframes tumble-1 { 0% { transform: translate(0,0); } 100% { transform: translate(-90px, 90px); } }
        @keyframes tumble-2 { 0% { transform: translate(0,0); } 100% { transform: translate(60px, 80px); } }
        @keyframes tumble-3 { 0% { transform: translate(0,0); } 100% { transform: translate(-50px, -90px); } }
        @keyframes tumble-4 { 0% { transform: translate(0,0); } 100% { transform: translate(80px, -20px); } }
        @keyframes tumble-5 { 0% { transform: translate(0,0); } 100% { transform: translate(-70px, 40px); } }
        @keyframes tumble-6 { 0% { transform: translate(0,0); } 100% { transform: translate(30px, -100px); } }
        @keyframes tumble-7 { 0% { transform: translate(0,0); } 100% { transform: translate(-40px, -40px); } }

        /* Use alternate direction for bouncing effect */
        .tumble-0 { animation: tumble-0 0.6s infinite alternate ease-in-out; }
        .tumble-1 { animation: tumble-1 0.7s infinite alternate ease-in-out; }
        .tumble-2 { animation: tumble-2 0.8s infinite alternate ease-in-out; }
        .tumble-3 { animation: tumble-3 0.6s infinite alternate ease-in-out; }
        .tumble-4 { animation: tumble-4 0.9s infinite alternate ease-in-out; }
        .tumble-5 { animation: tumble-5 0.7s infinite alternate ease-in-out; }
        .tumble-6 { animation: tumble-6 0.5s infinite alternate ease-in-out; }
        .tumble-7 { animation: tumble-7 0.8s infinite alternate ease-in-out; }

        @keyframes spinCage {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .cage-spin {
            animation: spinCage 5s infinite linear;
        }

        @keyframes float {
             0% { transform: translate(var(--x, 0), var(--y, 0)); }
             50% { transform: translate(var(--x, 5px), var(--y, -5px)); }
             100% { transform: translate(var(--x, 0), var(--y, 0)); }
        }
        .floating-ball {
            /* We set random positions via inline content above,
               but subtle float adds life when static */
            animation: float 3s infinite ease-in-out;
        }

        @keyframes popIn {
             0% { transform: scale(0); opacity: 0; }
             60% { transform: scale(1.1); opacity: 1; }
             100% { transform: scale(1); }
        }
        .pop-in {
            animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
        </div>
    );
};
export default TVMode;
