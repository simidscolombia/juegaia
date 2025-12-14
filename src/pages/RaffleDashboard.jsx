import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash, ExternalLink, Ticket, DollarSign, Users, Wand2, Share2, MessageCircle, Calendar } from 'lucide-react';
import { createGameService, getRaffles, getRaffleTickets, sellRaffleTicket, deleteRaffle, getWallet, getSystemSettings } from '../utils/storage';
import { generateMagicCopy } from '../utils/aiWriter';
import { COMMON_LOTTERIES } from '../utils/lotteries';
import RechargeModal from '../components/RechargeModal';

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
    const [showRecharge, setShowRecharge] = useState(false);

    // Ticket Sale State
    const [saleForm, setSaleForm] = useState({ number: '', name: '', paymentDate: new Date().toISOString().split('T')[0] });
    const [tickets, setTickets] = useState([]);
    const [wallet, setWallet] = useState({ balance: 0 });
    const [prices, setPrices] = useState({ raffle_price: 10000 });

    const fetchAllRaffles = async () => {
        try {
            const [rafflesData, walletData, settingsData] = await Promise.all([
                getRaffles(),
                getWallet(),
                getSystemSettings()
            ]);
            setRaffles(rafflesData);
            if (walletData) setWallet(walletData);
            if (settingsData && settingsData.raffle_price) setPrices(prev => ({ ...prev, ...settingsData }));
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

        const cost = Number(prices.raffle_price);
        if (wallet.balance < cost) {
            // Open Modal instead of navigating
            if (window.confirm(`Saldo insuficiente ($${wallet.balance}).\nNecesitas $${cost} Coins.\n\n¿Quieres recargar aquí mismo?`)) {
                setShowRecharge(true);
            }
            return;
        }

        if (!window.confirm(`Crear esta Rifa costará $${cost} Coins.\n¿Deseas continuar?`)) return;

        try {
            // Updated to use Paid Service
            const config = {
                min: form.min, max: form.max, price: form.price,
                lottery: form.lotteryName, digits: form.digits,
                image: form.image, minutes: form.reservationMinutes,
                drawDate: form.drawDate, paymentInfo: form.paymentInfo
            };

            await createGameService('RAFFLE', form.name, config);
            await fetchAllRaffles();
            setShowCreate(false);
            setForm({ name: '', min: 0, max: 999, price: 10000, lotteryName: 'Sinuano Noche', digits: 3, image: '', reservationMinutes: 15, drawDate: '', paymentInfo: '' });
            alert(`¡Rifa creada! Se descontaron $${cost} Coins.`);
        } catch (err) {
            alert('Error creando rifa: ' + err.message);
        }
    };

    const handleMagicImage = () => {
        if (!form.name) return alert('Escribe el nombre de la rifa primero');
        // Heuristic: Remove common words to get better keywords
        const cleanName = form.name.replace(/(rifa|gran|espectacular|sorteo|premio|ganar)/gi, '').trim();
        const keywords = cleanName.split(' ').join(',');
        // Add random param to avoid cache and allow regeneration
        const magicUrl = `https://loremflickr.com/800/600/${keywords}/all?random=${Date.now()}`;
        setForm({ ...form, image: magicUrl });
    };

    const refreshImage = () => {
        if (!form.image) return;
        // Verify if it's a dynamic url
        const baseUrl = form.image.split('?')[0];
        setForm({ ...form, image: `${baseUrl}?random=${Date.now()}` });
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
                        <div className="card" style={{ marginTop: '1rem', background: '#1a1a2e', border: '1px solid #16213e' }}>
                            <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #ffffff1a', paddingBottom: '10px' }}>Nueva Rifa</h4>
                            <form onSubmit={handleCreate}>
                                {/* Digits Select */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '5px' }}>Cifras</label>
                                    <select
                                        value={form.digits}
                                        onChange={e => handleDigitsChange(e.target.value)}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            background: '#0f3460', border: '1px solid #533483', color: 'white'
                                        }}
                                    >
                                        <option value={2}>2 Cifras (00-99)</option>
                                        <option value={3}>3 Cifras (000-999)</option>
                                        <option value={4}>4 Cifras (0000-9999)</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '5px' }}>Nombre</label>
                                    <input
                                        placeholder="Ej. Rifa iPhone 15"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            background: '#0f3460', border: '1px solid #533483', color: 'white'
                                        }}
                                    />
                                </div>

                                {/* Lottery with Dropdown */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '5px' }}>Lotería / Sorteo</label>
                                    <select
                                        value={form.lotteryName}
                                        onChange={e => setForm({ ...form, lotteryName: e.target.value })}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            background: '#0f3460', border: '1px solid #533483', color: 'white',
                                            marginBottom: form.lotteryName === 'Manual' ? '10px' : '0'
                                        }}
                                    >
                                        {COMMON_LOTTERIES.map(l => <option key={l} value={l}>{l}</option>)}
                                        <option value="Manual">Otra / Manual</option>
                                    </select>
                                    {form.lotteryName === 'Manual' && (
                                        <input
                                            placeholder="Escribe nombre de lotería"
                                            value={form.manualLottery} // Changing to separate state if needed, but reusing lotteryName string for simplicity might bug if not careful. 
                                            onChange={e => setForm({ ...form, lotteryName: e.target.value })}
                                            style={{
                                                width: '100%', padding: '10px', borderRadius: '8px',
                                                background: '#0f3460', border: '1px solid #533483', color: 'white'
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Draw Date & Time */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '5px' }}>Fecha de Juego</label>
                                    <input
                                        type="datetime-local"
                                        value={form.drawDate}
                                        onChange={e => setForm({ ...form, drawDate: e.target.value })}
                                        required
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            background: '#0f3460', border: '1px solid #533483', color: 'white'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '5px' }}>Precio</label>
                                        <input
                                            type="number"
                                            placeholder="$"
                                            value={form.price}
                                            onChange={e => setForm({ ...form, price: e.target.value })}
                                            style={{
                                                width: '100%', padding: '10px', borderRadius: '8px',
                                                background: '#0f3460', border: '1px solid #533483', color: 'white'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '5px' }}>Reserva (Min)</label>
                                        <input
                                            type="number"
                                            placeholder="Minutos"
                                            value={form.reservationMinutes}
                                            onChange={e => setForm({ ...form, reservationMinutes: e.target.value })}
                                            style={{
                                                width: '100%', padding: '10px', borderRadius: '8px',
                                                background: '#0f3460', border: '1px solid #533483', color: 'white'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Image Section */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '5px' }}>Imagen del Premio</label>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <input
                                            placeholder="URL Imagen"
                                            value={form.image}
                                            onChange={e => setForm({ ...form, image: e.target.value })}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '8px',
                                                background: '#0f3460', border: '1px solid #533483', color: 'white'
                                            }}
                                        />
                                        <button type="button" onClick={handleMagicImage} style={{ background: '#e94560', color: 'white', border: 'none', borderRadius: '8px', width: '40px', cursor: 'pointer' }} title="Generar con IA">
                                            <Wand2 size={18} />
                                        </button>
                                    </div>
                                    {form.image && (
                                        <div style={{ marginTop: '10px', position: 'relative' }}>
                                            <img src={form.image} alt="Preview" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #533483' }} />
                                            <button
                                                type="button"
                                                onClick={refreshImage}
                                                style={{
                                                    position: 'absolute', bottom: '8px', right: '8px',
                                                    background: 'rgba(0,0,0,0.8)', color: 'white',
                                                    border: '1px solid white', borderRadius: '20px', padding: '5px 12px',
                                                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                                                }}
                                            >
                                                🔄 Cambiar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Payment Info */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '5px' }}>Datos para Pagos (Nequi/Davi...)</label>
                                    <textarea
                                        value={form.paymentInfo}
                                        onChange={e => setForm({ ...form, paymentInfo: e.target.value })}
                                        placeholder="Ej: Nequi 3001234567..."
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            background: '#0f3460', border: '1px solid #533483', color: 'white',
                                            height: '80px', fontFamily: 'inherit'
                                        }}
                                    />
                                </div>

                                {/* AI Copy Section - Improved UI */}
                                <div style={{ background: 'rgba(233, 69, 96, 0.1)', border: '1px solid #e94560', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#e94560', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Wand2 size={14} /> IA Copywriter
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleAICopy}
                                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#e94560', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer' }}
                                        >
                                            Generar Texto
                                        </button>
                                    </div>
                                    {generatedCopy && (
                                        <textarea
                                            readOnly
                                            value={generatedCopy}
                                            style={{
                                                width: '100%', height: '80px', fontSize: '0.9rem',
                                                background: 'transparent', border: 'none', color: '#e0e0e0',
                                                resize: 'none'
                                            }}
                                        />
                                    )}
                                </div>

                                <button type="submit" style={{ width: '100%', padding: '12px', background: '#06d6a0', color: '#0f3460', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>
                                    Confirmar y Crear
                                </button>
                            </form>
                        </div>
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
                                                <th>Estado</th>
                                                <th>Fecha Pago / Promesa</th>
                                                <th>Comprobante</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tickets.map(t => (
                                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '8px', color: '#ffd166', fontWeight: 'bold' }}>{t.number}</td>
                                                    <td>{t.buyer_name || t.buyerName}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem',
                                                            background: t.status === 'PAID' ? '#06d6a0' : '#ffd166',
                                                            color: '#000'
                                                        }}>
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                        {t.payment_date
                                                            ? new Date(t.payment_date).toLocaleDateString()
                                                            : t.payment_promise_date
                                                                ? <span style={{ color: '#fab1a0' }}>Promesa: {new Date(t.payment_promise_date).toLocaleString()}</span>
                                                                : 'N/A'
                                                        }
                                                    </td>
                                                    <td>
                                                        {t.payment_proof_url ? (
                                                            <a href={t.payment_proof_url} target="_blank" rel="noopener noreferrer" style={{ color: '#74b9ff', textDecoration: 'underline', fontSize: '0.8rem' }}>
                                                                Ver Foto
                                                            </a>
                                                        ) : '-'}
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


            <RechargeModal
                isOpen={showRecharge}
                onClose={() => setShowRecharge(false)}
                onSuccess={() => {
                    fetchAllRaffles();
                }}
            />
        </div >
    );
};

export default RaffleDashboard;
