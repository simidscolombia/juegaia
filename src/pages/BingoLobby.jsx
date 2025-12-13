import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getGame, createTicket } from '../utils/storage';
import { Wallet, Check, AlertCircle } from 'lucide-react';
import { generateBingoCard } from '../utils/bingoLogic';

const BingoLobby = () => {
    const { gameId } = useParams();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ name: '', phone: '', quantity: 1 });
    const [status, setStatus] = useState('idle'); // idle, submitting, success, error

    useEffect(() => {
        loadData();
    }, [gameId]);

    const loadData = async () => {
        try {
            const g = await getGame(gameId);
            setGame(g);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('submitting');

        try {
            // Validate
            if (!formData.name || !formData.phone || formData.quantity < 1) {
                throw new Error("Por favor completa todos los campos.");
            }

            // Create Requests (One ticket per quantity)
            // Note: We create them as 'PENDING'.
            // If the DB doesn't support status, we might need another strategy, but we try this.

            const promises = [];
            for (let i = 0; i < formData.quantity; i++) {
                const card = generateBingoCard();
                const pin = Math.floor(1000 + Math.random() * 9000).toString();
                // Passing 'PENDING' as status. We need to update storage.js to handle/pass this.
                promises.push(createTicket(gameId, formData.name, card, pin, 'PENDING', formData.phone));
            }

            await Promise.all(promises);
            setStatus('success');
        } catch (error) {
            console.error(error);
            setStatus('error');
            alert(error.message);
        }
    };

    if (loading) return <div className="p-4 text-center">Cargando evento...</div>;
    if (!game) return <div className="p-4 text-center">Evento no encontrado.</div>;

    if (status === 'success') {
        return (
            <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ background: '#25D366', color: 'white', padding: '2rem', borderRadius: '15px', marginBottom: '1rem' }}>
                    <Check size={48} style={{ display: 'block', margin: '0 auto 10px' }} />
                    <h2>¡Solicitud Enviada!</h2>
                    <p>Has pedido <strong>{formData.quantity} cartones</strong>.</p>
                </div>

                <div className="card">
                    <h3>¿Qué sigue?</h3>
                    <p style={{ opacity: 0.8 }}>Para activar tus cartones, realiza el pago y envía el comprobante al administrador.</p>
                    <div style={{ background: 'var(--color-bg)', padding: '10px', borderRadius: '8px', margin: '15px 0' }}>
                        <strong>Nequi / Daviplata</strong><br />
                        300 123 4567
                    </div>
                    <button
                        className="primary"
                        onClick={() => window.location.href = `https://wa.me/573001234567?text=Hola, acabo de pedir ${formData.quantity} cartones para el bingo ${game.name}. Mi nombre es ${formData.name}.`}
                    >
                        Reportar Pago en WhatsApp
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: 'var(--color-primary)', marginBottom: '5px' }}>{game.name}</h1>
                <p style={{ opacity: 0.7 }}>Compra tus cartones y participa</p>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Nombre Completo</label>
                        <input
                            type="text"
                            required
                            placeholder="Tu nombre"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            style={{ width: '100%', padding: '12px', marginTop: '5px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label>Celular (WhatsApp)</label>
                        <input
                            type="tel"
                            required
                            placeholder="300 123 4567"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            style={{ width: '100%', padding: '12px', marginTop: '5px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label>Cantidad de Cartones</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                                style={{ padding: '10px 15px', background: 'var(--color-secondary)' }}
                            >
                                -
                            </button>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formData.quantity}</span>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, quantity: Math.min(10, prev.quantity + 1) }))}
                                style={{ padding: '10px 15px', background: 'var(--color-secondary)' }}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(233, 69, 96, 0.1)', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                        <span>Total a Pagar:</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            ${(formData.quantity * 10000).toLocaleString()} COP
                        </div>
                        <small style={{ opacity: 0.7 }}>(Costo aprox: $10,000 / cartón)</small>
                    </div>

                    <button
                        type="submit"
                        className="primary"
                        style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}
                        disabled={status === 'submitting'}
                    >
                        {status === 'submitting' ? 'Procesando...' : 'Solicitar Cartones'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BingoLobby;
