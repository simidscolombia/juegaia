import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGame, createTicket } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { Wallet, Check, AlertCircle } from 'lucide-react';
import { generateBingoCard } from '../utils/bingoLogic';

const BingoLobby = () => {
    const { gameId } = useParams();
    const navigate = useNavigate(); // Make sure to import useNavigate
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ name: '', phone: '', quantity: 1 });
    const [status, setStatus] = useState('idle'); // idle, submitting, success, error
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        loadData();
    }, [gameId]);

    const loadData = async () => {
        try {
            const [g, { data: { user } }] = await Promise.all([
                getGame(gameId),
                supabase.auth.getUser()
            ]);
            setGame(g);

            if (user) {
                setCurrentUser(user);
                // Pre-fill if has metadata
                if (user.user_metadata?.full_name) {
                    setFormData(prev => ({ ...prev, name: user.user_metadata.full_name }));
                }
                // Pre-fill phone if we had it stored in metadata, but usually we don't yet.
            }
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
                promises.push(createTicket(gameId, formData.name, card, pin, 'PENDING', formData.phone, currentUser?.id));
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
                        {game.admin_whatsapp ? game.admin_whatsapp : 'Consulta al Admin'}
                    </div>
                    {game.admin_whatsapp && (
                        <button
                            className="primary"
                            onClick={() => {
                                let phone = game.admin_whatsapp.replace(/\D/g, ''); // Remove non-digits
                                window.location.href = `https://wa.me/${phone}?text=Hola, acabo de pedir ${formData.quantity} cartones para el bingo ${game.name}. Mi nombre es ${formData.name}.`;
                            }}
                        >
                            Reportar Pago en WhatsApp
                        </button>
                    )}
                </div>

                {/* Upsell Card */}
                <div style={{ marginTop: '20px', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', borderRadius: '15px', padding: '20px', color: 'black' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>🎁 ¡Gana Dinero con JuegAIA!</h3>
                    <p style={{ margin: '0 0 15px 0' }}>Regístrate GRATIS para administrar tus cartones, compartirlos con tu familia y ganar comisiones invitando amigos.</p>
                    <button
                        onClick={() => window.location.href = '/register'}
                        style={{
                            background: 'white', color: 'black', border: 'none', padding: '12px 20px',
                            borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                    >
                        Crear Mi Cuenta <Check size={16} />
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

                {!currentUser ? (
                    <div style={{ marginTop: '15px', background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                        <span style={{ fontSize: '0.9rem', marginRight: '10px' }}>¿Ya tienes cuenta?</span>
                        <button
                            onClick={() => navigate(`/login?returnTo=/bingo/${gameId}/join`)}
                            style={{ background: 'var(--color-primary)', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                ) : (
                    <div style={{ marginTop: '10px', color: '#10B981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <Check size={16} style={{ marginBottom: '-3px' }} /> Logueado como {currentUser.email}
                    </div>
                )}
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
