import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRaffle, getRaffleTickets, reserveTicket, submitPaymentProof } from '../utils/storage';
import { Clock, CheckCircle, Lock, Upload, Smartphone, Trash2 } from 'lucide-react';

const RafflePublic = () => {
    const { raffleId } = useParams();
    const [raffle, setRaffle] = useState(null);
    const [tickets, setTickets] = useState([]);

    // Multi-selection state
    const [selectedNums, setSelectedNums] = useState([]);

    // Reservation Form State
    const [reserveName, setReserveName] = useState('');
    const [reservePhone, setReservePhone] = useState('');
    const [reserveDate, setReserveDate] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);

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

    const toggleNumber = (num) => {
        const status = getTicketStatus(num);
        if (status !== 'AVAILABLE') return;

        setSelectedNums(prev => {
            if (prev.includes(num)) {
                return prev.filter(n => n !== num);
            } else {
                return [...prev, num];
            }
        });
    };

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
            await reserveTicket(raffleId, selectedNums, reserveName, reservePhone, reserveDate || null);

            setSelectedNums([]);
            setReserveName('');
            setReservePhone('');
            setReserveDate('');
            setShowModal(false);

            // Refetch
            const t = await getRaffleTickets(raffleId);
            setTickets(t);
            alert(`¡${selectedNums.length} boletas apartadas con éxito!`);
        } catch (err) {
            alert(err.message);
        }
    };

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
            </div>

            {/* Grid */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px' }}>
                    {Array.from({ length: max - min + 1 }).map((_, i) => {
                        const num = min + i;
                        const status = getTicketStatus(num);
                        const isSelected = selectedNums.includes(num);

                        let bg = '#fff';
                        let color = '#2d3436';
                        let border = '2px solid #dfe6e9';
                        let cursor = 'pointer';

                        if (status === 'PAID') {
                            bg = '#06d6a0'; border = '2px solid #06d6a0'; color = '#fff'; cursor = 'default';
                        } else if (status === 'RESERVED') {
                            bg = '#ffd166'; border = '2px solid #ffd166'; color = '#2d3436'; cursor = 'not-allowed';
                        } else if (isSelected) {
                            bg = '#0984e3'; border = '2px solid #0984e3'; color = '#fff';
                        }

                        return (
                            <button
                                key={num}
                                onClick={() => toggleNumber(num)}
                                disabled={status !== 'AVAILABLE'}
                                style={{
                                    aspectRatio: '1', borderRadius: '10px', background: bg, border: border,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    cursor: cursor, transform: isSelected ? 'scale(0.95)' : 'scale(1)', transition: 'all 0.1s',
                                    fontSize: '1.1rem', fontWeight: 'bold', color: color
                                }}
                            >
                                {num.toString().padStart(max.toString().length, '0')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Floating Bar */}
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

            {/* Reservation Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0 }}>Confirmar Reserva</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        <div style={{ marginBottom: '1.5rem', background: '#f1f2f6', padding: '10px', borderRadius: '10px' }}>
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
                                value={reservePhone} onChange={e => setReservePhone(e.target.value)}
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
        </div>
    );
};

export default RafflePublic;
