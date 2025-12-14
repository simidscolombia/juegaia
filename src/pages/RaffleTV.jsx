import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getRaffle, getRaffleTickets, saveRaffleWinner } from '../utils/storage';
import { Trophy, Sparkles } from 'lucide-react';

const RaffleTV = () => {
    const { raffleId } = useParams();
    const [raffle, setRaffle] = useState(null);
    const [tickets, setTickets] = useState([]);

    // Animation State
    const [isRolling, setIsRolling] = useState(false);
    const [currentNumber, setCurrentNumber] = useState("000"); // Display string
    const [winner, setWinner] = useState(null); // { number, name }
    const [showConfetti, setShowConfetti] = useState(false);

    // Determines how many digits to show based on max range
    const [digits, setDigits] = useState(3);

    useEffect(() => {
        const load = () => {
            const r = getRaffle(raffleId);
            if (r) {
                setRaffle(r);
                setDigits(r.max.toString().length);
                setCurrentNumber("0".repeat(r.max.toString().length));
                // If already has winner in storage (future feature), load it
            }
            setTickets(getRaffleTickets(raffleId));
        };
        load();
        const interval = setInterval(load, 3000);
        return () => clearInterval(interval);
    }, [raffleId]);

    const startRoll = () => {
        if (isRolling) return;
        setIsRolling(true);
        setWinner(null);
        setShowConfetti(false);

        const duration = 4000; // 4 seconds of suspense
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;

            if (elapsed < duration) {
                // Generate random number in range
                const randomVal = Math.floor(Math.random() * (raffle.max - raffle.min + 1)) + raffle.min;
                setCurrentNumber(randomVal.toString().padStart(digits, '0'));
                requestAnimationFrame(animate);
            } else {
                // FINISH
                const finalNumber = Math.floor(Math.random() * (raffle.max - raffle.min + 1)) + raffle.min;
                setCurrentNumber(finalNumber.toString().padStart(digits, '0'));
                setIsRolling(false);

                // Check Winner
                const winningTicket = tickets.find(t => t.number === finalNumber);
                if (winningTicket) {
                    setWinner(winningTicket);
                    setShowConfetti(true);
                    saveRaffleWinner(raffleId, finalNumber).catch(console.error); // Persist!
                    speakText(`¡El ganador es el número ${finalNumber}! ${winningTicket.buyerName}`);
                } else {
                    speakText(`Número ${finalNumber}. Sin dueño.`);
                }
            }
        };

        requestAnimationFrame(animate);
    };

    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            window.speechSynthesis.speak(utterance);
        }
    };

    if (!raffle) return <div style={{ color: 'white', padding: '2rem' }}>Cargando Sorteo...</div>;

    return (
        <div style={{
            height: '100vh', background: '#0f172a', color: 'white',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Background Effects */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)',
                zIndex: 0
            }} />

            <div style={{ zIndex: 10, textAlign: 'center', width: '100%', maxWidth: '800px' }}>
                <h1 style={{
                    fontSize: '4rem', marginBottom: '2rem',
                    background: 'linear-gradient(to right, #ffd166, #ef476f)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 10px rgba(239, 71, 111, 0.5))'
                }}>
                    {raffle.name}
                </h1>

                {/* SLOT MACHINE DISPLAY */}
                <div style={{
                    display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem',
                    padding: '2rem', background: '#16213e', borderRadius: '20px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.5)',
                    border: '4px solid #30475e'
                }}>
                    {currentNumber.split('').map((digit, i) => (
                        <div key={i} style={{
                            width: '120px', height: '180px',
                            background: '#fff', color: '#000',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '8rem', fontWeight: '900',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
                            transform: isRolling ? `translateY(${Math.random() * 10 - 5}px)` : 'none'
                        }}>
                            {digit}
                        </div>
                    ))}
                </div>

                {/* WINNER ANNOUNCEMENT */}
                {winner ? (
                    <div className="winner-reveal" style={{
                        animation: 'popIn 0.5s forwards',
                        background: 'rgba(6, 214, 160, 0.2)', padding: '2rem', borderRadius: '20px',
                        border: '2px solid #06d6a0'
                    }}>
                        <div style={{ color: '#06d6a0', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            <Trophy size={40} style={{ marginBottom: '-10px' }} /> ¡TENEMOS GANADOR!
                        </div>
                        <div style={{ fontSize: '3.5rem', fontWeight: 'bold' }}>{winner.buyerName}</div>
                        <div style={{ opacity: 0.8 }}>Boleta #{winner.number}</div>
                    </div>
                ) : (
                    !isRolling && (
                        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                            {currentNumber !== "0".repeat(digits) ? "Número vacante" : "Listo para sortear"}
                        </div>
                    )
                )}

                {/* CONTROLS (Only visible if mouse moves usually, but always here for simplified MVP) */}
                <div style={{ marginTop: '3rem' }}>
                    <button
                        onClick={startRoll}
                        disabled={isRolling}
                        style={{
                            padding: '1.5rem 4rem', fontSize: '2rem', fontWeight: 'bold',
                            background: isRolling ? '#30475e' : '#e94560', color: 'white', border: 'none', borderRadius: '50px',
                            cursor: isRolling ? 'not-allowed' : 'pointer',
                            boxShadow: '0 10px 0 #9d1b32, 0 20px 20px rgba(0,0,0,0.4)',
                            transform: isRolling ? 'translateY(10px)' : 'translateY(0)',
                            transition: 'all 0.1s'
                        }}
                    >
                        {isRolling ? 'SORTEANDO...' : 'JUGAR'}
                    </button>
                </div>
            </div>

            {/* CONFETTI CSS SIMPLE IMPLEMENTATION */}
            {showConfetti && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                    {Array.from({ length: 50 }).map((_, i) => (
                        <div key={i} className="confetti" style={{
                            left: `${Math.random() * 100}%`,
                            top: `-10px`,
                            background: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'][Math.floor(Math.random() * 4)],
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }} />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes popIn {
                    0% { transform: scale(0); opacity: 0; }
                    80% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); }
                }
                .confetti {
                    position: absolute;
                    width: 10px; height: 10px;
                    animation: fall linear forwards;
                }
                @keyframes fall {
                    to { transform: translateY(100vh) rotate(720deg); }
                }
            `}</style>
        </div>
    );
};

export default RaffleTV;
