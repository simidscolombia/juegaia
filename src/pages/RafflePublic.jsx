import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRaffle, getRaffleTickets, reserveTicket, submitPaymentProof } from '../utils/storage';
import { Clock, CheckCircle, Lock, Upload, Smartphone } from 'lucide-react';

const RafflePublic = () => {
    const { raffleId } = useParams();
    const [raffle, setRaffle] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [selectedNum, setSelectedNum] = useState(null);
    const [reserveName, setReserveName] = useState('');
    const [reservePhone, setReservePhone] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const loadRaffle = async () => {
            try {
                const r = await getRaffle(raffleId);
                if (r) {
                    setRaffle(r);
                }
                // Load tickets
                const t = await getRaffleTickets(raffleId);
                // Filter expired only on client for display? 
                // Or better: storage should filter them. 
                // Supabase doesn't filter expired unless we ask. 
                // For MVP: We will treat all RESERVED tickets as occupied in UI to prevent clicking.
                setTickets(t);
            } catch (e) {
                console.error("Error loading raffle", e);
            }
        };
        loadRaffle();

        // Polling for updates (Simplest realtime for MVP)
        const interval = setInterval(loadRaffle, 5000);
        return () => clearInterval(interval);
    }, [raffleId]);

    const handleReserve = async (e) => {
        e.preventDefault();
        try {
            await reserveTicket(raffleId, selectedNum, reserveName, reservePhone);
            setSelectedNum(null);
            setReserveName('');
            setReservePhone('');
            // Refetch
            const t = await getRaffleTickets(raffleId);
            setTickets(t);
            alert(`¡Número ${selectedNum} apartado con éxito! Tienes ${raffle.reservationMinutes} minutos para confirmar.`);
        } catch (err) {
            alert(err.message);
        }
    };

    const isAvailable = (num) => {
        return !tickets.some(t => {
            if (t.number !== num) return false;
            if (t.status === 'PAID') return true;
            // Reservation validity check
            if (t.status === 'RESERVED') {
                const updated = new Date(t.updated_at || t.updatedAt || t.created_at).getTime(); // Supabase uses created_at usually or updated_at
                const now = Date.now();
                const minutes = raffle.reservation_minutes || raffle.reservationMinutes || 15;
                if (now - updated < minutes * 60 * 1000) return true; // Valid reservation
            }
            return false; // Expired reservation is available
        });
    };

    // Helper to get status for styling
    // Helper to get status for styling and logic
    const getTicketStatus = (num) => {
        const t = tickets.find(t => t.number === num);
        if (!t) return 'AVAILABLE';

        // Expiration Logic for Reservations
        if (t.status === 'RESERVED') {
            const updated = new Date(t.updated_at || t.updatedAt || t.created_at).getTime();
            const minutes = raffle.reservation_minutes || raffle.reservationMinutes || 15;
            if (Date.now() - updated > minutes * 60 * 1000) return 'AVAILABLE'; // Expired
            return 'RESERVED';
        }

        if (t.status === 'PAID') return 'PAID';

        return 'AVAILABLE';
    };

    // Helper for detailed status (Color/Label)
    const getDetailedStatus = (num) => {
        const status = getTicketStatus(num);
        if (status === 'AVAILABLE') return { color: 'green', label: 'Disponible', hex: '#fff' };

        const t = tickets.find(t => t.number === num);
        if (status === 'RESERVED') return { color: 'grey', label: 'Apartado', hex: '#b2bec3' };
        if (status === 'PAID') {
            return t.payment_date ?
                { color: 'green', label: 'Pagado', hex: '#06d6a0' } :
                { color: 'yellow', label: 'Por Pagar', hex: '#ffd166' };
        }
    };

    if (!raffle) return <div style={{ color: 'white', padding: '2rem' }}>Cargando rifa...</div>;

    // Handle Supabase (snake_case) vs Local (camelCase)
    const min = raffle.min_number !== undefined ? raffle.min_number : raffle.min;
    const max = raffle.max_number !== undefined ? raffle.max_number : raffle.max;
    const lotteryName = raffle.lottery_name || raffle.lotteryName || 'Sorteo';
    const price = raffle.price;
    const drawDate = raffle.draw_date;

    const isGrid = (max - min) <= 100;

    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', paddingBottom: '2rem', overflowY: 'auto' }}>
            {/* Header / Banner */}
            <div style={{ background: '#fff', padding: '2rem', borderRadius: '0 0 30px 30px', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {raffle.image && <img src={raffle.image} alt="Premio" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '10px', marginBottom: '1rem', objectFit: 'contain' }} />}

                <h1 style={{ color: '#2d3436', margin: 0, fontSize: '2rem' }}>{raffle.name}</h1>
                <p style={{ color: '#636e72', margin: '0.5rem 0 1.5rem 0' }}>
                    Juega con <b>{lotteryName}</b>
                    {drawDate && <span> el {new Date(drawDate).toLocaleDateString()}</span>}
                </p>
                <div style={{ display: 'inline-block', background: '#00b894', color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 5px 15px rgba(0, 184, 148, 0.4)' }}>
                    ${price.toLocaleString()} COP / Boleta
                </div>
            </div>

            {/* Grid Display */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
                {isGrid ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                        gap: '10px'
                    }}>
                        {Array.from({ length: max - min + 1 }).map((_, i) => {
                            const num = min + i;
                            const status = getTicketStatus(num);
                            const isSelected = selectedNum === num;

                            let bg = '#fff';
                            let color = '#2d3436';
                            let border = '2px solid #dfe6e9';
                            let cursor = 'pointer';
                            let label = 'LIBRE';

                            if (status === 'PAID') {
                                bg = '#06d6a0'; // Green
                                border = '2px solid #06d6a0';
                                color = '#fff';
                                cursor = 'default';
                                label = 'PAGO';
                            } else if (status === 'RESERVED') {
                                bg = '#ffd166'; // Yellow
                                border = '2px solid #ffd166';
                                color = '#2d3436';
                                cursor = 'not-allowed';
                                label = 'APARTADO';
                            } else if (isSelected) {
                                bg = '#0984e3'; // Blue
                                border = '2px solid #0984e3';
                                color = '#fff';
                            }

                            return (
                                <button
                                    key={num}
                                    onClick={() => status === 'AVAILABLE' && setSelectedNum(num)}
                                    disabled={status !== 'AVAILABLE'}
                                    style={{
                                        aspectRatio: '1', borderRadius: '12px', background: bg, border: border,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        cursor: cursor, transition: 'all 0.1s',
                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                        boxShadow: isSelected ? '0 10px 20px rgba(9, 132, 227, 0.4)' : 'none',
                                        padding: 0
                                    }}
                                >
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: color }}>
                                        {num.toString().padStart((max.toString().length), '0')}
                                    </span>
                                    {status !== 'AVAILABLE' && (
                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: color, marginTop: '2px' }}>
                                            {label}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    // Large Raffle View (Search)
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <h3 style={{ color: '#636e72' }}>Busca tu número de la suerte</h3>
                        <input
                            type="number"
                            placeholder={`Escribe un número (${min}-${max})`}
                            style={{
                                padding: '1rem 2rem', fontSize: '1.5rem', borderRadius: '50px',
                                border: '2px solid #0984e3', textAlign: 'center', width: '100%', maxWidth: '300px',
                                outline: 'none'
                            }}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= min && val <= max) {
                                    setSelectedNum(val);
                                }
                            }}
                        />
                        {selectedNum !== null && (
                            <div style={{ marginTop: '2rem', animation: 'fadeIn 0.5s' }}>
                                <div style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#2d3436' }}>
                                    Estado del {selectedNum}: <strong>{getTicketStatus(selectedNum) === 'AVAILABLE' ? 'DISPONIBLE' : 'OCUPADO'}</strong>
                                </div>
                                {getTicketStatus(selectedNum) === 'AVAILABLE' && (
                                    <button
                                        onClick={() => { }} // Opens modal automatically because selectedNum is set
                                        style={{
                                            background: '#0984e3', color: 'white', padding: '1rem 3rem',
                                            borderRadius: '50px', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        ¡Lo quiero!
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reservation Modal (Mobile Friendly) */}
            {/* Modal for Reservation OR Payment Upload */}
            {selectedNum !== null && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '400px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <style>{`
                            @keyframes popIn {
                                from { transform: scale(0.8); opacity: 0; }
                                to { transform: scale(1); opacity: 1; }
                            }
                        `}</style>

                        <button onClick={() => setSelectedNum(null)} style={{ float: 'right', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>

                        {getTicketStatus(selectedNum) === 'AVAILABLE' ? (
                            // --- RESERVATION FLOW ---
                            <>
                                <h3 style={{ marginTop: 0, color: '#2d3436' }}>Apartar Boleta #{selectedNum}</h3>
                                <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                    Tu reserva durará <strong>{raffle.reservationMinutes} minutos</strong>.
                                </p>

                                <form onSubmit={handleReserve}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#636e72', marginBottom: '5px' }}>Tu Nombre</label>
                                        <input
                                            type="text" placeholder="Ej. Juan Pérez"
                                            value={reserveName} onChange={e => setReserveName(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '12px', border: '2px solid #dfe6e9', borderRadius: '10px', fontSize: '1rem' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#636e72', marginBottom: '5px' }}>WhatsApp / Celular</label>
                                        <input
                                            type="tel" placeholder="Ej. 300 123 4567"
                                            value={reservePhone} onChange={e => setReservePhone(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '12px', border: '2px solid #dfe6e9', borderRadius: '10px', fontSize: '1rem' }}
                                        />
                                    </div>

                                    <button type="submit" style={{ width: '100%', padding: '12px', border: 'none', background: '#0984e3', color: 'white', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Apartar Puesto</button>
                                </form>
                            </>
                        ) : getTicketStatus(selectedNum) === 'RESERVED' ? (
                            // --- PAYMENT UPLOAD FLOW ---
                            <>
                                <h3 style={{ marginTop: 0, color: '#e67e22' }}>¡Casi es tuyo! #{selectedNum}</h3>
                                <p style={{ fontSize: '0.9rem', color: '#636e72' }}>
                                    Este número está <strong>Apartado</strong>. Para confirmarlo, realiza el pago y sube el comprobante.
                                </p>

                                {/* Payment Info Box */}
                                {raffle.payment_info && (
                                    <div style={{ background: '#f1f2f6', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Smartphone size={16} /> Bancos / Nequi:
                                        </div>
                                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem' }}>
                                            {raffle.payment_info}
                                        </div>
                                    </div>
                                )}

                                <div style={{ textAlign: 'center' }}>
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
                                                        await submitPaymentProof(raffle.id, selectedNum, e.target.files[0]);
                                                        alert('¡Comprobante subido con éxito! El administrador verificará tu pago.');
                                                        setSelectedNum(null);
                                                        // Refresh
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
                                    <p style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '10px' }}>
                                        La imagen se comprimirá automáticamente.
                                    </p>
                                </div>
                            </>
                        ) : (
                            // --- PAID / LOCKED ---
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ color: '#06d6a0' }}>¡Felicitaciones!</h3>
                                <p>El número <strong>#{selectedNum}</strong> ya está pagado y confirmado.</p>
                                <Lock size={48} color="#06d6a0" style={{ margin: '1rem' }} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RafflePublic;
