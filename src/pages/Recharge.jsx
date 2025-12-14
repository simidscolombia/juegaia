import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeft, CreditCard } from 'lucide-react';
import { getProfile } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';

const Recharge = () => {
    const navigate = useNavigate();
    const [selectedAmount, setSelectedAmount] = useState(null);
    const [profile, setProfile] = useState(null);

    // Use Environment Variable for Key, fallback to a placeholder if missing
    const WOMPI_PUB_KEY = import.meta.env.VITE_WOMPI_PUB_KEY || "pub_test_ilaiOTiwq8EPNZpkPbg26V3gu0hVV60q";

    useEffect(() => {
        getProfile().then(p => setProfile(p));
    }, []);

    const amounts = [
        { value: 10000, label: '$10.000 COP' },
        { value: 20000, label: '$20.000 COP' },
        { value: 50000, label: '$50.000 COP' },
        { value: 100000, label: '$100.000 COP' },
    ];

    const [isWompiLoaded, setWompiLoaded] = useState(false);

    const [loadingPayment, setLoadingPayment] = useState(false);

    const handleWompiPayment = async () => {
        if (!selectedAmount || !profile) return;

        if (typeof window.WidgetCheckout === 'undefined') {
            alert("Error: El widget de pagos no cargó correctamente. Recarga la página.");
            return;
        }

        setLoadingPayment(true);
        const reference = `RECHARGE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const amountInCents = selectedAmount.value * 100;

        try {
            // 1. Get Integrity Signature from Backend
            const { data: signature, error: sigError } = await supabase
                .rpc('get_wompi_signature', {
                    p_reference: reference,
                    p_amount_in_cents: amountInCents
                });

            if (sigError) throw new Error("Error generando firma: " + sigError.message);
            if (!signature) throw new Error("No se pudo generar la firma de seguridad.");

            // 2. Prepare Data
            const customerData = {
                email: profile.email || 'user@example.com',
                fullName: profile.full_name || 'Usuario JuegAIA',
                phoneNumber: profile.phone || '3000000000',
                phoneNumberPrefix: '+57',
                legalId: profile.document_id || '123456789',
                legalIdType: 'CC'
            };

            // 3. Open Widget
            const checkout = new window.WidgetCheckout({
                currency: 'COP',
                amountInCents: amountInCents,
                reference: reference,
                publicKey: WOMPI_PUB_KEY,
                signature: { integrity: signature }, // NEW: Integrity Signature
                redirectUrl: window.location.origin + '/dashboard',
                customerData: customerData
            });

            checkout.open(async function (result) {
                const transaction = result.transaction;
                console.log('Transaction Result:', transaction);

                if (transaction.status === 'APPROVED') {
                    // Critical: Credit the wallet
                    try {
                        const { data, error } = await supabase.rpc('process_recharge_with_mlm', {
                            p_user_id: profile.id,
                            p_amount: amountInCents / 100, // Convert back to standard units
                            p_reference: transaction.reference,
                            p_wompi_id: transaction.id
                        });

                        if (error) {
                            console.error("Error crediting wallet:", error);
                            alert("Pago aprobado en Wompi pero hubo un error acreditando el saldo. Contacta soporte.");
                        } else {
                            alert(`¡Pago Exitoso! Se han recargado $${amountInCents / 100} Coins.`);
                            navigate('/dashboard');
                        }
                    } catch (err) {
                        console.error("Credit Error:", err);
                    }
                } else if (transaction.status === 'DECLINED') {
                    alert("El pago fue rechazado por el banco.");
                } else if (transaction.status === 'ERROR') {
                    alert("Ocurrió un error procesando el pago.");
                }
            });
        } catch (error) {
            console.error("Wompi Error:", error);
            alert("Error iniciando Wompi: " + error.message);
        } finally {
            setLoadingPayment(false);
        }
    };

    // Load Wompi Script dynamically
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.wompi.co/widget.js';
        script.async = true;
        script.onload = () => setWompiLoaded(true);
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <button
                onClick={() => navigate('/dashboard')}
                style={{
                    background: 'transparent', border: 'none', color: 'var(--color-text)',
                    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginBottom: '2rem'
                }}
            >
                <ArrowLeft size={20} /> Volver
            </button>

            <h1 style={{ marginBottom: '1rem' }}>Recargar Saldo 💎</h1>
            <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
                Selecciona un monto para recargar tu billetera automáticamente.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {amounts.map((amt) => (
                    <div
                        key={amt.value}
                        onClick={() => setSelectedAmount(amt)}
                        style={{
                            padding: '1.5rem',
                            border: `2px solid ${selectedAmount?.value === amt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            borderRadius: '12px',
                            background: selectedAmount?.value === amt.value ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <h3 style={{ margin: 0 }}>{amt.label}</h3>
                    </div>
                ))}
            </div>

            <button
                disabled={!selectedAmount || !profile}
                onClick={handleWompiPayment}
                style={{
                    width: '100%',
                    padding: '1rem',
                    background: selectedAmount ? 'var(--color-primary)' : 'gray',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    cursor: selectedAmount ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}
            >
                <CreditCard size={24} />
                {selectedAmount ? `Pagar ${selectedAmount.label} con Wompi` : 'Selecciona un monto'}
            </button>
        </div>
    );
};

export default Recharge;
