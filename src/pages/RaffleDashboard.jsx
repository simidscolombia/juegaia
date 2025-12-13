import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash, ExternalLink, Ticket, DollarSign, Users, Wand2, Share2, MessageCircle, Calendar } from 'lucide-react';
import { createRaffle, getRaffles, getRaffleTickets, sellRaffleTicket, deleteRaffle } from '../utils/storage';
import { generateMagicCopy } from '../utils/aiWriter';
import { COMMON_LOTTERIES } from '../utils/lotteries';

const RaffleDashboard = () => {
    const navigate = useNavigate();
    const [raffles, setRaffles] = useState([]);
    const [selectedRaffle, setSelectedRaffle] = useState(null);
    const [form, setForm] = useState({
        name: '', min: 0, max: 999, price: 10000,
        lotteryName: 'Chontico Día', digits: 3, image: '',
        reservationMinutes: 15, drawDate: '', paymentInfo: ''
    });
    const [showCreate, setShowCreate] = useState(false);
    const [generatedCopy, setGeneratedCopy] = useState('');

    // Ticket Sale State
    const [saleForm, setSaleForm] = useState({ number: '', name: '', paymentDate: new Date().toISOString().split('T')[0] });
    const [tickets, setTickets] = useState([]);

    const fetchAllRaffles = async () => {
        try {
            const data = await getRaffles();
            setRaffles(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchAllRaffles();
    }, []);

    useEffect(() => {
        const fetchTickets = async () => {
            if (selectedRaffle) {
                const t = await getRaffleTickets(selectedRaffle.id);
                setTickets(t);
            }
        };
        fetchTickets();

        // Simple polling for realtime updates in MVP
        const interval = setInterval(fetchTickets, 5000);
        return () => clearInterval(interval);
    }, [selectedRaffle]);

    // Auto-configure range based on digits
    const handleDigitsChange = (d) => {
        const digits = Number(d);
        let max = 99;
        if (digits === 3) max = 999;
        if (digits === 4) max = 9999;

        setForm({ ...form, digits, min: 0, max });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createRaffle(form.name, form.min, form.max, form.price, form.lotteryName, form.digits, form.image, form.reservationMinutes, form.drawDate, form.paymentInfo);
            await fetchAllRaffles();
            setShowCreate(false);
            setForm({ name: '', min: 0, max: 999, price: 10000, lotteryName: 'Sinuano Noche', digits: 3, image: '', reservationMinutes: 15, drawDate: '', paymentInfo: '' });
        } catch (err) {
            alert('Error creando rifa: ' + err.message);
        }
    };

    const handleMagicImage = () => {
        if (!form.name) return alert('Escribe el nombre de la rifa primero');
        // Simple heuristic for demo: use loremflickr with keywords
        const keywords = form.name.split(' ').join(',');
        const magicUrl = `https://loremflickr.com/800/600/${keywords}/all`;
        setForm({ ...form, image: magicUrl });
    };

    const handleAICopy = () => {
        if (!form.name || !form.price) return alert('Llena Nombre y Precio primero');
        const copy = generateMagicCopy(form.name, form.price, form.lotteryName || 'Lotería Local', form.digits);
        setGeneratedCopy(copy);
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/raffle/${selectedRaffle.id}`;
        const text = `¡Participa en la rifa *${selectedRaffle.name}*! \nPremios espectaculares. \nJuega aquí: ${url}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: selectedRaffle.name,
                    text: text,
                    url: url
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(text);
            alert('Enlace copiado al portapapeles. ¡Pégalo en WhatsApp!');
        }
    };

    const handleWhatsApp = () => {
        const url = `${window.location.origin}/raffle/${selectedRaffle.id}`;
        const text = `¡Hola! Te invito a participar en la rifa *${selectedRaffle.name}*. \nValor boleta: $${selectedRaffle.price}. \nIngresa aquí para apartar tu número: ${url}`;
        const encoded = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const handleSell = async (e) => {
        e.preventDefault();
        try {
            // Validation: Payment Date cannot be after Draw Date (if set)
            if (selectedRaffle.draw_date) {
                const payDate = new Date(saleForm.paymentDate);
                const drawDate = new Date(selectedRaffle.draw_date);
                // Compare only dates properly? Assuming local time inputs mostly.
                // Simple comparison string based YYYY-MM-DD works if timezones match.
                if (saleForm.paymentDate > selectedRaffle.draw_date.split('T')[0]) {
                    return alert("ERROR: La fecha de pago no puede ser después de la fecha de juego (" + selectedRaffle.draw_date.split('T')[0] + ")");
                }
            }

            await sellRaffleTicket(selectedRaffle.id, saleForm.number, saleForm.name, '', saleForm.paymentDate);
            const updatedTickets = await getRaffleTickets(selectedRaffle.id);
            setTickets(updatedTickets);
            setSaleForm({ number: '', name: '', paymentDate: new Date().toISOString().split('T')[0] });
            alert('¡Boleta vendida!');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleDelete = async (e, r) => {
        e.stopPropagation(); // Prevent opening the raffle details
        if (!window.confirm(`¿Estás SEGURO de eliminar la rifa "${r.name}"?\nEsta acción no se puede deshacer.`)) return;

        try {
            await deleteRaffle(r.id);
            alert('Rifa eliminada correctamente.');
            if (selectedRaffle?.id === r.id) setSelectedRaffle(null);
            fetchAllRaffles();
        } catch (err) {
            alert('❌ ERROR: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '1rem', height: '100vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <style>{`
                .raffle-dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    gap: 2rem;
                }
                @media (max-width: 768px) {
                    .raffle-dashboard-grid {
                        display: flex;
                        flex-direction: column;
                    }
                    .hide-on-mobile {
                        display: none;
                    }
                }
            `}</style>

            {/* Header Removed (Handled by MainLayout) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button onClick={() => setShowCreate(!showCreate)} className="primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    <Plus size={18} /> <span className="hide-on-mobile">Nueva Rifa</span>
                </button>
            </div>

            <div className="raffle-dashboard-grid">
                {/* Left: List of Raffles */}
                <div className="card">
                    <h3>Mis Rifas</h3>
                    {raffles.map(r => (
                        <div
                            key={r.id}
                            onClick={() => setSelectedRaffle(r)}
                            style={{
                                padding: '1rem', margin: '0.5rem 0', borderRadius: '10px',
                                background: selectedRaffle?.id === r.id ? '#e94560' : 'rgba(255,255,255,0.05)',
                                cursor: 'pointer', transition: 'all 0.2s',
                                border: selectedRaffle?.id === r.id ? '2px solid white' : 'none',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{r.name}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                        {r.digits} Cifras - {r.lottery_name || r.lotteryName || 'Manual'}
                                    </div>
                                    {r.draw_date && (
                                        <div style={{ fontSize: '0.75rem', color: '#ffd166', marginTop: '5px' }}>
                                            Juega: {new Date(r.draw_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, r)}
                                    className="delete-btn"
                                    title="Eliminar Rifa"
                                    style={{
                                        background: 'transparent',
                                        color: '#ef4444',
                                        padding: '5px',
                                        marginLeft: '10px',
                                        zIndex: 10
                                    }}
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {showCreate && (
                        <form onSubmit={handleCreate} style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>Nueva Rifa</h4>

                            {/* Digits Select */}
                            <select
                                value={form.digits}
                                onChange={e => handleDigitsChange(e.target.value)}
                                style={{ width: '100%', marginBottom: '10px', padding: '8px', borderRadius: '5px' }}
                            >
                                <option value={2}>2 Cifras (00-99)</option>
                                <option value={3}>3 Cifras (000-999)</option>
                                <option value={4}>4 Cifras (0000-9999)</option>
                            </select>

                            <input placeholder="Nombre Rifa / Premio" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={{ width: '100%', marginBottom: '5px' }} />

                            {/* Lottery with Dropdown */}
                            <div style={{ marginBottom: '5px' }}>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Lotería / Sorteo</label>
                                <select
                                    value={form.lotteryName}
                                    onChange={e => setForm({ ...form, lotteryName: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '5px' }}
                                >
                                    {COMMON_LOTTERIES.map(l => <option key={l} value={l}>{l}</option>)}
                                    <option value="Manual">Otra / Manual</option>
                                </select>
                            </div>
                            {form.lotteryName === 'Manual' && (
                                <input placeholder="Escribe nombre de lotería" value={form.lotteryName} onChange={e => setForm({ ...form, lotteryName: e.target.value })} style={{ width: '100%', marginBottom: '5px' }} />
                            )}

                            {/* Payment Info */}
                            <div style={{ marginBottom: '5px' }}>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Métodos de Pago (Nequi/Daviplata)</label>
                                <textarea
                                    value={form.paymentInfo}
                                    onChange={e => setForm({ ...form, paymentInfo: e.target.value })}
                                    placeholder="Ej: Nequi 3001234567 - Titular..."
                                    style={{ width: '100%', padding: '8px', borderRadius: '5px', height: '60px' }}
                                />
                            </div>

                            {/* Draw Date & Time */}
                            <div style={{ marginBottom: '5px' }}>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Fecha de Juego</label>
                                <input
                                    type="datetime-local"
                                    value={form.drawDate}
                                    onChange={e => setForm({ ...form, drawDate: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', borderRadius: '5px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                <input type="number" placeholder="Precio ($)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ flex: 1 }} />
                                <input type="number" placeholder="Reserva (Min)" value={form.reservationMinutes} onChange={e => setForm({ ...form, reservationMinutes: e.target.value })} style={{ flex: 1 }} title="Tiempo reservation" />
                            </div>

                            {/* Image Section */}
                            <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                <input placeholder="URL Imagen" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} style={{ flex: 1 }} />
                                <button type="button" onClick={handleMagicImage} style={{ background: '#6c5ce7', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Buscar imagen mágica">
                                    <Wand2 size={16} />
                                </button>
                            </div>
                            {form.image && <img src={form.image} alt="Preview" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '5px', marginBottom: '5px' }} />}

                            {/* AI Copy Section */}
                            <div style={{ background: '#e94560', padding: '10px', marginTop: '10px', borderRadius: '5px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}><Wand2 size={14} /> IA Copywriter</span>
                                    <button type="button" onClick={handleAICopy} style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'white', color: 'black' }}>Generar</button>
                                </div>
                                {generatedCopy && (
                                    <textarea
                                        readOnly
                                        value={generatedCopy}
                                        style={{ width: '100%', height: '60px', marginTop: '5px', fontSize: '0.8rem', color: 'black' }}
                                    />
                                )}
                            </div>

                            <button type="submit" style={{ width: '100%', marginTop: '10px', background: '#06d6a0' }}>Crear Rifa</button>
                        </form>
                    )}
                </div>

                {/* Right: Raffle Details and Actions */}
                {selectedRaffle ? (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedRaffle.name}</h2>
                                <span style={{ opacity: 0.6 }}>Boletas vendidas: {tickets.length}</span>
                                {selectedRaffle.draw_date && (
                                    <div style={{ marginTop: '5px', color: '#ffd166', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Calendar size={16} /> Juega: {new Date(selectedRaffle.draw_date).toLocaleString()}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleShare}
                                    style={{ background: '#6c5ce7', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    title="Compartir enlace"
                                >
                                    <Share2 size={18} /> <span className="hide-on-mobile">Compartir</span>
                                </button>
                                <button
                                    onClick={handleWhatsApp}
                                    style={{ background: '#25D366', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    title="Enviar por WhatsApp"
                                >
                                    <MessageCircle size={18} /> <span className="hide-on-mobile">WhatsApp</span>
                                </button>
                                <button
                                    onClick={() => window.open(`/raffle-tv/${selectedRaffle.id}`, '_blank')}
                                    style={{ background: '#ffd166', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <ExternalLink size={18} /> TV
                                </button>
                                <button
                                    onClick={() => window.open(`/raffle/${selectedRaffle.id}`, '_blank')}
                                    style={{ background: '#0984e3', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <Ticket size={18} /> Ver
                                </button>
                            </div>
                        </div>

                        {/* Sell Ticket Area */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h4><DollarSign size={16} /> Vender Boleta</h4>
                                <form onSubmit={handleSell} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        placeholder={`Número (${selectedRaffle.min_number || selectedRaffle.min}-${selectedRaffle.max_number || selectedRaffle.max})`}
                                        value={saleForm.number}
                                        onChange={e => setSaleForm({ ...saleForm, number: e.target.value })}
                                        required
                                        min={selectedRaffle.min_number || selectedRaffle.min}
                                        max={selectedRaffle.max_number || selectedRaffle.max}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Nombre del Comprador"
                                        value={saleForm.name}
                                        onChange={e => setSaleForm({ ...saleForm, name: e.target.value })}
                                        required
                                    />
                                    {/* Payment Date Input */}
                                    <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Fecha de Pago</label>
                                    <input
                                        type="date"
                                        value={saleForm.paymentDate}
                                        onChange={e => setSaleForm({ ...saleForm, paymentDate: e.target.value })}
                                        required
                                        max={selectedRaffle.draw_date ? selectedRaffle.draw_date.split('T')[0] : undefined}
                                    />

                                    <button type="submit" style={{ background: '#06d6a0' }}>Registrar Venta</button>
                                </form>
                            </div>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <h4><Users size={16} /> Compradores ({tickets.length})</h4>
                                {tickets.length === 0 ? <p style={{ opacity: 0.5 }}>No hay ventas aún</p> : (
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #ffffff33' }}>
                                                <th style={{ padding: '5px' }}>#</th>
                                                <th>Nombre</th>
                                                <th>Fecha Pago</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tickets.map(t => (
                                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '8px', color: '#ffd166', fontWeight: 'bold' }}>{t.number}</td>
                                                    <td>{t.buyer_name || t.buyerName}</td>
                                                    <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                        {t.payment_date ? new Date(t.payment_date).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, background: '#16213e', borderRadius: '15px' }}>
                        Selecciona una rifa para gestionar
                    </div>
                )}
            </div>
        </div>
    );
};

export default RaffleDashboard;
