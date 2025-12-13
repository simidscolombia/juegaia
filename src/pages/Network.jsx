import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Share2, Coins } from 'lucide-react';
import { getProfile } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';

const Network = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [referrals, setReferrals] = useState([]); // This would come from an API
    const [commissions, setCommissions] = useState([]); // This would come from an API

    useEffect(() => {
        loadNetworkData();
    }, []);

    const loadNetworkData = async () => {
        const user = await getProfile();
        if (!user) return;
        setProfile(user);

        // 1. Fetch Referrals (People I invited)
        const { data: refs } = await supabase
            .from('profiles')
            .select('id, full_name, created_at')
            .eq('referred_by', user.id)
            .order('created_at', { ascending: false });

        if (refs) {
            setReferrals(refs.map(r => ({
                id: r.id,
                name: r.full_name || 'Usuario sin nombre',
                date: new Date(r.created_at).toLocaleDateString()
            })));
        }

        // 2. Fetch Commissions (Money I earned from them)
        const { data: comms } = await supabase
            .from('commissions')
            .select('amount')
            .eq('beneficiary_id', user.id);

        if (comms) {
            setCommissions(comms); // Store all commissions if needed later
            // Calculate total
            // const total = comms.reduce((sum, c) => sum + Number(c.amount), 0);
            // We can calculate total in render or state
        }
    };

    const copyLink = () => {
        const link = `${window.location.origin}/register?ref=${profile?.id}`;
        navigator.clipboard.writeText(link);
        alert('Enlace de referido copiado!');
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/dashboard')}
                style={{
                    background: 'transparent', border: 'none', color: 'var(--color-text)',
                    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginBottom: '2rem'
                }}
            >
                <ArrowLeft size={20} /> Volver
            </button>

            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Users size={32} color="var(--color-primary)" />
                    Mi Red de Referidos
                </h1>
                <p style={{ opacity: 0.7 }}>Invita a amigos y gana comisiones por sus recargas.</p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <Coins size={32} color="#fbbf24" style={{ marginBottom: '10px' }} />
                    <h2 style={{ margin: 0 }}>${commissions.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}</h2>
                    <p style={{ opacity: 0.7 }}>Ganancias Totales</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <Users size={32} color="#3b82f6" style={{ marginBottom: '10px' }} />
                    <h2 style={{ margin: 0 }}>{referrals.length}</h2>
                    <p style={{ opacity: 0.7 }}>Referidos Directos</p>
                </div>
            </div>

            {/* Invite Section */}
            <div className="card" style={{ marginBottom: '3rem', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <h3>Tu Enlace de Invitación</h3>
                <div style={{
                    background: 'rgba(0,0,0,0.2)', padding: '10px 20px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '100%', overflowX: 'auto'
                }}>
                    <code style={{ color: 'var(--color-primary)' }}>{window.location.origin}/register?ref={profile?.id}</code>
                </div>
                <button
                    onClick={copyLink}
                    className="primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Share2 size={18} /> Copiar Enlace
                </button>
            </div>

            {/* Network Tree / List */}
            <div>
                <h3>Últimos Referidos</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {referrals.map(ref => (
                        <div key={ref.id} style={{
                            padding: '1rem', background: 'var(--color-card)', border: '1px solid var(--color-border)',
                            borderRadius: '8px', display: 'flex', justifyContent: 'space-between'
                        }}>
                            <span>{ref.name}</span>
                            <span style={{ opacity: 0.5 }}>{ref.date}</span>
                        </div>
                    ))}
                    {referrals.length === 0 && <p style={{ opacity: 0.5, fontStyle: 'italic' }}>Aún no tienes referidos.</p>}
                </div>
            </div>
        </div>
    );
};

export default Network;
