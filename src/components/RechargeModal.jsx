import React, { useState, useEffect } from 'react';
import { CreditCard, X } from 'lucide-react';
import { getProfile } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';

const RechargeModal = ({ isOpen, onClose, onSuccess }) => {
    if (!isOpen) return null;

    const [selectedAmount, setSelectedAmount] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Use Environment Variable for Key
    const WOMPI_PUB_KEY = import.meta.env.VITE_WOMPI_PUB_KEY || "pub_test_ilaiOTiwq8EPNZpkPbg26V3gu0hVV60q";

    useEffect(() => {
        getProfile().then(p => setProfile(p));

        // Load widget script if not already present
        if (!document.querySelector('script[src="https://checkout.wompi.co/widget.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://checkout.wompi.co/widget.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const amounts = [
        { value: 10000, label: '$10.000 COP' },
        { value: 20000, label: '$20.000 COP' },
        { value: 50000, label: '$50.000 COP' },
        { value: 100000, label: '$100.000 COP' },
    ];

    const handleWompiPayment = async () => {
        if (!selectedAmount || !profile) return;

        if (typeof window.WidgetCheckout === 'undefined') {
            alert("El sistema de pagos está cargando. Intenta de nuevo en 5 segundos.");
            return;
        }

        setLoading(true);
        const reference = `RECHARGE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const amountInCents = selectedAmount.value * 100;

        try {
            // 1. Get Integrity Signature
            const { data: signature, error: sigError } = await supabase
                .rpc('get_wompi_signature', {
                    p_reference: reference,
                    p_amount_in_cents: amountInCents
                });

            if (sigError || !signature) throw new Error("Error de seguridad en pagos.");

            // 2. Open Widget
            const checkout = new window.WidgetCheckout({
                currency: 'COP',
                amountInCents: amountInCents,
                reference: reference,
                publicKey: WOMPI_PUB_KEY,
                signature: { integrity: signature },
                redirectUrl: window.location.href, // Stay on page (but widget might redirect?)
                // Actually Wompi widget often redirects. To stay on page we depend on the widget behavior. 
                // If redirectUrl is set, it redirects. If NOT set, it might just close and callback? 
                // Documentation says: if redirectUrl is present, it redirects.
                // WE WANT TO AVOID REDIRECT if possible, but Wompi usually enforces it or we need to handle the return.
                // However, for "seamless" experience, maybe we rely on the callback?
                // Wompi Widget documentation: "Si no envías redirectUrl, el widget mostrará el resultado en la misma ventana" (Sometimes).
                // Let's TRY without redirectUrl if we want to stay, OR handle the return param in Dashboard.
                // BUT user wants to "not lose thread". Redirecting RELOADS the page, losing state.
                // We should try OMITTING redirectUrl to see if it allows inline completion. 
                // If Wompi forces redirect, we are stuck. 
                // Alternative: Open in new window?
                customerData: {
                    email: profile.email,
                    fullName: profile.full_name,
                    phoneNumber: profile.phone || '3000000000',
                    phoneNumberPrefix: '+57',
                    legalId: profile.document_id || '123456789',
                    legalIdType: 'CC'
                }
            });

            checkout.open(async function (result) {
                const transaction = result.transaction;

                if (transaction.status === 'APPROVED') {
                    try {
                        const { error } = await supabase.rpc('process_recharge_with_mlm', {
                            p_user_id: profile.id,
                            p_amount: amountInCents / 100,
                            p_reference: transaction.reference,
                            p_wompi_id: transaction.id
                        });

                        if (!error) {
                            alert(`¡Recarga de $${selectedAmount.value} exitosa!`);
                            onSuccess(); // Refresh balance in parent
                            onClose();
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            });

        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'var(--color-bg)', padding: '2rem', borderRadius: '15px',
                maxWidth: '500px', width: '90%', position: 'relative',
                border: '1px solid var(--color-border)'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ textAlign: 'center', marginTop: 0 }}>Recarga Rápida ⚡</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '20px 0' }}>
                    {amounts.map((amt) => (
                        <div
                            key={amt.value}
                            onClick={() => setSelectedAmount(amt)}
                            style={{
                                padding: '15px',
                                border: `2px solid ${selectedAmount?.value === amt.value ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '8px',
                                background: selectedAmount?.value === amt.value ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                cursor: 'pointer', textAlign: 'center'
                            }}
                        >
                            {amt.label}
                        </div>
                    ))}
                </div>

                <button
                    disabled={!selectedAmount || loading}
                    onClick={handleWompiPayment}
                    style={{
                        width: '100%', padding: '15px',
                        background: selectedAmount ? 'var(--color-primary)' : 'gray',
                        color: 'white', border: 'none', borderRadius: '10px',
                        fontWeight: 'bold', cursor: selectedAmount ? 'pointer' : 'not-allowed'
                    }}
                >
                    {loading ? 'Procesando...' : 'Pagar con Wompi'}
                </button>
            </div>
        </div>
    );
};

export default RechargeModal;
