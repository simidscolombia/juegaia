import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRaffle, getRaffleTickets, reserveTicket, submitPaymentProof } from '../utils/storage';
import { Clock, CheckCircle, Lock, Upload, Smartphone, Trash2, ArrowRight, Download } from 'lucide-react';

const RafflePublic = () => {
    // ... existing state ...

    const handleDownloadTicket = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Decoration
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(0, 0, canvas.width, 20);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('JuegAIA', 300, 80);

        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('COMPROBANTE DE RESERVA', 300, 110);

        // Raffle Info
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText(raffle?.name || 'Rifa', 300, 180);

        // Ticket Numbers
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 60px sans-serif';
        const nums = successData.tickets.join(', ');
        // Simple wrap logic or truncation for now
        ctx.fillText(nums.substring(0, 20) + (nums.length > 20 ? '...' : ''), 300, 260);

        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${successData.count} Boleta(s) Apartada(s)`, 300, 300);

        // Credentials Box
        ctx.fillStyle = '#334155';
        ctx.fillRect(50, 350, 500, 250);

        ctx.fillStyle = '#fb7185';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('TUS CREDENCIALES DE ACCESO', 300, 390);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '20px sans-serif';
        ctx.fillText(`📱 Usuario: ${successData.phone}`, 100, 450);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText(`🔑 PIN: ${successData.pin}`, 100, 500);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 16px sans-serif';
        ctx.fillText('Usa este PIN para entrar a ver tus boletas.', 100, 550);

        // Footer
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '16px sans-serif';
        ctx.fillText('Ingresa en: juegaia.vercel.app', 300, 750);

        // Convert and Download
        const link = document.createElement('a');
        link.download = `Ticket-JuegAIA-${successData.tickets[0]}.jpg`;
        link.href = canvas.toDataURL('image/jpeg');
        link.click();
    };
    const { raffleId } = useParams();
    const [raffle, setRaffle] = useState(null);
    const [tickets, setTickets] = useState([]);

    // Capture Referrer from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            localStorage.setItem('referral_code', ref);
        }
    }, []);

    // Multi-selection state (for Buying)
    const [selectedNums, setSelectedNums] = useState([]);

    // Single Ticket View State (for Uploading Payment)
    const [viewingTicket, setViewingTicket] = useState(null);

    // Reservation Form State
    const [reserveName, setReserveName] = useState('');
    const [reservePhone, setReservePhone] = useState('');
    const [reserveDate, setReserveDate] = useState('');

    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Success Modal State
    const [successData, setSuccessData] = useState(null);
    const navigate = useNavigate(); // Requires hook at top-level

    useEffect(() => {
        const loadRaffle = async () => {
            try {
                const r = await getRaffle(raffleId);
                if (r) setRaffle(r);
                const t = await getRaffleTickets(raffleId);
                setTickets(t);
            } catch (e) {
                console.error("Error loading raffle", e);
            }
        };
        loadRaffle();
        const interval = setInterval(loadRaffle, 5000);
        return () => clearInterval(interval);
    }, [raffleId]);

    const getTicketStatus = (num) => {
        const t = tickets.find(t => t.number === num);
        if (!t) return 'AVAILABLE';
        if (t.status === 'RESERVED') {
            const updated = new Date(t.updated_at || t.created_at).getTime();
            const minutes = raffle.reservation_minutes || 15;
            if (Date.now() - updated > minutes * 60 * 1000) return 'AVAILABLE';
            return 'RESERVED';
        }
        if (t.status === 'PAID') return 'PAID';
        return 'AVAILABLE';
    };

    const handleClickTicket = (num) => {
        const status = getTicketStatus(num);

        if (status === 'AVAILABLE') {
            // Toggle Selection for Availability
            setSelectedNums(prev => {
                if (prev.includes(num)) return prev.filter(n => n !== num);
                return [...prev, num];
            });
        } else if (status === 'RESERVED') {
            // View Details to Upload Payment
            setViewingTicket(num);
        } else if (status === 'PAID') {
            // View Details (Just to see it's paid)
            setViewingTicket(num);
        }
    };

    // Identity State
    const [existingPin, setExistingPin] = useState(null);

    useEffect(() => {
        const loadIdentity = async () => {
            // 1. Check Guest Session
            const guestStr = localStorage.getItem('juegaia_guest');
            if (guestStr) {
                const guest = JSON.parse(guestStr);
                if (guest.phone) setReservePhone(guest.phone);
                if (guest.pin) setExistingPin(guest.pin);
            }

            // 2. Check Real Auth (Overrides Guest Phone usually if verified)
            // We import supabase from storage indirectly or use direct client? 
            // We need to import 'getProfile' from storage ideally, but let's just peek localStorage or rely on guest for now since we are in Public view.
            // If user came from /lobby (which loads profile), they might be auth.
            // Let's keep it simple: "Smart fill" from localStorage is 90% of the win.
        };
        loadIdentity();
    }, []);

    const handleReserve = async (e) => {
        e.preventDefault();

        // 12-Hour Rule Validation
        if (raffle.draw_date) {
            if (!reserveDate) return alert("Debes comprometerte con una fecha de pago.");
            const drawTime = new Date(raffle.draw_date).getTime();
            const promiseTime = new Date(reserveDate).getTime();
            const twelveHours = 12 * 60 * 60 * 1000;
            if (promiseTime > (drawTime - twelveHours)) {
                return alert("⚠️ REGLA: El pago debe realizarse al menos 12 HORAS ANTES del sorteo.");
            }
        }

        try {
            // REUSE PIN if known, else Generate
            const finalPin = existingPin || Math.floor(1000 + Math.random() * 9000).toString();

            // Pass to reserveTicket
            await reserveTicket(raffleId, selectedNums, reserveName, reservePhone, reserveDate || null, finalPin);

            setSelectedNums([]);
            // Don't clear phone/name so they can buy again easily
            setReserveDate('');
            setShowModal(false);

            // Update Guest Session if NEW
            if (!existingPin) {
                localStorage.setItem('juegaia_guest', JSON.stringify({
                    phone: reservePhone,
                    pin: finalPin,
                    lastGame: raffleId
                }));
                setExistingPin(finalPin);
            }

            // Refetch
            const t = await getRaffleTickets(raffleId);
            setTickets(t);

            // Show Success Modal
            setSuccessData({
                phone: reservePhone,
                count: selectedNums.length,
                tickets: selectedNums,
                pin: finalPin
            });
        } catch (err) {
            alert(err.message);
        }
    };

    if (!raffle) return <div style={{ color: 'white', padding: '2rem' }}>Cargando rifa...</div>;

    const min = raffle.min_number !== undefined ? raffle.min_number : raffle.min;
    const max = raffle.max_number !== undefined ? raffle.max_number : raffle.max;
    const price = raffle.price;

    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', paddingBottom: '100px', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ background: '#fff', padding: '2rem', borderRadius: '0 0 30px 30px', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <h1 style={{ color: '#2d3436', margin: 0, fontSize: '2rem' }}>{raffle.name}</h1>
                <p style={{ color: '#636e72', margin: '0.5rem 0 1.5rem 0' }}>{raffle.lottery_name}</p>
                <div style={{ display: 'inline-block', background: '#00b894', color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 5px 15px rgba(0, 184, 148, 0.4)' }}>
                    ${price.toLocaleString()} COP / Boleta
                </div>

                {/* Countdown Timer */}
                <CountdownTimer targetDate={raffle.draw_date} />

                <div style={{ marginTop: '20px' }}>
                    <button
                        onClick={() => navigate('/lobby')}
                        style={{
                            background: 'transparent', border: '1px solid #dfe6e9', borderRadius: '50px',
                            padding: '8px 20px', color: '#636e72', cursor: 'pointer', fontWeight: 'bold',
                            display: 'inline-flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        &larr; Volver al Panel
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px' }}>
                    {Array.from({ length: Math.min((max - min + 1), 10000) }).map((_, i) => {
                        const num = min + i;
                        const status = getTicketStatus(num);
                        const isSelected = selectedNums.includes(num);

                        let bg = '#fff';
                        let color = '#2d3436';
                        let border = '2px solid #dfe6e9';
                        let cursor = 'pointer';

                        if (status === 'PAID') {
                            bg = '#06d6a0'; border = '2px solid #06d6a0'; color = '#fff';
                        } else if (status === 'RESERVED') {
                            bg = '#ffd166'; border = '2px solid #ffd166'; color = '#2d3436';
                        } else if (isSelected) {
                            bg = '#0984e3'; border = '2px solid #0984e3'; color = '#fff';
                        }

                        // Determine padding length based on 'digits' config or max number length
                        const padLength = raffle.digits || max.toString().length;

                        return (
                            <button
                                key={num}
                                onClick={() => handleClickTicket(num)}
                                style={{
                                    aspectRatio: '1', borderRadius: '10px', background: bg, border: border,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    cursor: cursor, transform: isSelected ? 'scale(0.95)' : 'scale(1)', transition: 'all 0.1s',
                                    fontSize: '1.1rem', fontWeight: 'bold', color: color
                                }}
                            >
                                {num.toString().padStart(padLength, '0')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Floating Bar (Only when selecting) */}
            {selectedNums.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, width: '100%',
                    background: 'white', padding: '20px', boxShadow: '0 -5px 20px rgba(0,0,0,0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50
                }}>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: '#636e72' }}>Has seleccionado:</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#2d3436' }}>
                            {selectedNums.length} boleta{selectedNums.length > 1 ? 's' : ''}
                        </div>
                        <div style={{ color: '#00b894', fontWeight: 'bold' }}>
                            Total: ${(selectedNums.length * price).toLocaleString()}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            background: '#0984e3', color: 'white', border: 'none', padding: '15px 30px',
                            borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
                            boxShadow: '0 5px 15px rgba(9, 132, 227, 0.4)'
                        }}
                    >
                        Apartar Ahora
                    </button>
                </div>
            )}

            {/* Reservation Modal (For BULK) */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{ background: 'white', color: '#2d3436', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, color: '#2d3436' }}>Confirmar Reserva</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#2d3436' }}>&times;</button>
                        </div>

                        <div style={{ marginBottom: '1.5rem', background: '#f1f2f6', padding: '10px', borderRadius: '10px', color: '#2d3436' }}>
                            <strong>Boletas:</strong> {selectedNums.join(', ')}
                            <br />
                            <strong>Total a Pagar:</strong> <span style={{ color: '#00b894' }}>${(selectedNums.length * price).toLocaleString()}</span>
                        </div>

                        <form onSubmit={handleReserve}>
                            <input
                                type="text" placeholder="Tu Nombre" required
                                value={reserveName} onChange={e => setReserveName(e.target.value)}
                                style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                            <input
                                type="tel" placeholder="WhatsApp / Celular" required
                                value={reservePhone} onChange={e => setReservePhone(e.target.value.replace(/\D/g, ''))}
                                style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                            />

                            {raffle.draw_date && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Promesa de Pago</label>
                                    <input
                                        type="datetime-local" required
                                        value={reserveDate} onChange={e => setReserveDate(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                                    />
                                </div>
                            )}

                            <button type="submit" style={{ width: '100%', padding: '15px', background: '#0984e3', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                Confirmar Apartado
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail/Upload Modal (For SINGLE Ticket) */}
            {viewingTicket !== null && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 101,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{ background: 'white', color: '#2d3436', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center' }}>
                        <button onClick={() => setViewingTicket(null)} style={{ float: 'right', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#2d3436' }}>&times;</button>

                        <h2 style={{ marginTop: 0, color: '#2d3436' }}>Boleta #{viewingTicket}</h2>

                        {getTicketStatus(viewingTicket) === 'RESERVED' ? (
                            <>
                                <p style={{ color: '#e67e22', fontWeight: 'bold' }}>🟡 APARTADA</p>
                                <p style={{ fontSize: '0.9rem', color: '#636e72', marginBottom: '20px' }}>
                                    Para confirmar tu boleta, realiza el pago y sube el comprobante aquí.
                                </p>

                                {raffle.payment_info && (
                                    <div style={{ background: '#f1f2f6', padding: '10px', borderRadius: '10px', marginBottom: '20px', textAlign: 'left', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                                        {raffle.payment_info}
                                    </div>
                                )}

                                <label style={{
                                    display: 'inline-block', background: uploading ? '#b2bec3' : '#00b894',
                                    color: 'white', padding: '12px 24px', borderRadius: '50px',
                                    cursor: uploading ? 'wait' : 'pointer', fontWeight: 'bold',
                                    boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                                }}>
                                    <input
                                        type="file" accept="image/*"
                                        style={{ display: 'none' }}
                                        disabled={uploading}
                                        onChange={async (e) => {
                                            if (e.target.files[0]) {
                                                setUploading(true);
                                                try {
                                                    await submitPaymentProof(raffle.id, viewingTicket, e.target.files[0]);
                                                    alert('¡Comprobante subido! Esperando verificación.');
                                                    setViewingTicket(null);
                                                    const t = await getRaffleTickets(raffleId);
                                                    setTickets(t);
                                                } catch (err) {
                                                    alert('Error: ' + err.message);
                                                } finally {
                                                    setUploading(false);
                                                }
                                            }
                                        }}
                                    />
                                    {uploading ? 'Subiendo...' : '📸 Subir Comprobante'}
                                </label>
                            </>
                        ) : (
                            <>
                                <p style={{ color: '#06d6a0', fontWeight: 'bold' }}>PAID / CONFIRMADA</p>
                                <Lock size={48} color="#06d6a0" style={{ marginTop: '10px' }} />
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* Success / Auto-Login Modal */}
            {successData && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 102,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{ background: 'white', color: '#2d3436', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center' }}>

                        <div style={{ color: '#00b894', marginBottom: '10px' }}>
                            <CheckCircle size={64} />
                        </div>

                        <h2 style={{ marginTop: 0, color: '#2d3436' }}>¡Reserva Exitosa!</h2>

                        <p style={{ color: '#636e72', fontSize: '1rem' }}>
                            Has apartado <strong>{successData.count}</strong> boletas.
                        </p>

                        <div style={{ background: '#f1f2f6', padding: '15px', borderRadius: '10px', margin: '20px 0', textAlign: 'left', color: '#2d3436' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#636e72' }}>Tus Credenciales de Acceso:</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <strong>Celular:</strong>
                                <span>{successData.phone}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>Tu PIN de Seguridad:</strong>
                                <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', color: '#d63031', fontWeight: 'bold' }}>
                                    {successData.pin}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#b2bec3', margin: '10px 0 0 0' }}>
                                *Guarda este código único para ingresar a gestionar tus boletas.
                            </p>
                        </div>

                        <button
                            onClick={handleDownloadTicket}
                            style={{
                                width: '100%', padding: '15px', background: '#3b82f6', color: 'white',
                                border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                marginBottom: '10px'
                            }}
                        >
                            <Download size={20} /> Descargar Ticket
                        </button>

                        <button
                            onClick={() => {
                                const text = `🔐 *MIS CREDENCIALES JUEGAIA*\n\nHola, guardo esto para no olvidarlo:\n📱 *Usuario:* ${successData.phone}\n🔑 *PIN:* ${successData.pin}\n\nIngresa aquí: ${window.location.origin}/login`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            style={{
                                width: '100%', padding: '15px', background: '#25D366', color: 'white',
                                border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                marginBottom: '10px'
                            }}
                        >
                            <Smartphone size={20} /> Guardar en WhatsApp
                        </button>

                        <button
                            onClick={() => {
                                // Auto-Login Logic with Derived PIN
                                localStorage.setItem('juegaia_guest', JSON.stringify({
                                    phone: successData.phone,
                                    pin: successData.pin,
                                    lastGame: raffleId
                                }));
                                navigate('/lobby');
                            }}
                            style={{
                                width: '100%', padding: '15px', background: '#e17055', color: 'white',
                                border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}
                        >
                            Ir a Mi Zona de Jugador <ArrowRight size={20} />
                        </button>

                        <button
                            onClick={() => {
                                setSuccessData(null);
                                setSelectedNums([]);
                                setReserveName('');
                                setReservePhone('');
                                setReserveDate('');
                                setShowModal(false);
                            }}
                            style={{
                                marginTop: '15px', background: 'transparent', border: 'none',
                                color: '#636e72', cursor: 'pointer', textDecoration: 'underline'
                            }}
                        >
                            Seguir Viendo la Rifa
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const CountdownTimer = ({ targetDate }) => {
    const calculateTimeLeft = () => {
        if (!targetDate) return {};
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                días: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hrs: Math.floor((difference / (1000 * 60 * 60)) % 24),
                min: Math.floor((difference / 1000 / 60) % 60),
                seg: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    });

    const timerComponents = [];

    // Force order
    ['días', 'hrs', 'min', 'seg'].forEach(interval => {
        if (timeLeft[interval] !== undefined) {
            timerComponents.push(
                <div key={interval} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: 'white', padding: '8px 12px', borderRadius: '8px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)', minWidth: '50px'
                }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3436' }}>
                        {timeLeft[interval] < 10 ? `0${timeLeft[interval]}` : timeLeft[interval]}
                    </span>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#b2bec3', letterSpacing: '1px' }}>
                        {interval}
                    </span>
                </div>
            );
        }
    });

    if (!targetDate) return null;
    if (Object.keys(timeLeft).length === 0) return (
        <div style={{ marginTop: '15px', padding: '10px 20px', background: '#e17055', color: 'white', fontWeight: 'bold', borderRadius: '50px', display: 'inline-block' }}>
            🏁 ¡Sorteo Finalizado!
        </div>
    );

    return (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {timerComponents}
        </div>
    );
};

export default RafflePublic;
