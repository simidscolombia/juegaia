import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Users, Settings, DollarSign, Search } from 'lucide-react';
import { getSystemSettings, adminUpdateSettings, getAllProfiles, adminManualRecharge, getProfile } from '../utils/storage';

const SuperAdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'settings'
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Data State
    const [settings, setSettings] = useState({ bingo_price: '', raffle_price: '' });
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        checkAdmin();
        loadData();
    }, []);

    const checkAdmin = async () => {
        const p = await getProfile();
        if (p?.role !== 'admin') {
            alert('Acceso Denegado');
            navigate('/dashboard');
        }
        setCurrentUser(p);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [s, u] = await Promise.all([
                getSystemSettings(),
                getAllProfiles()
            ]);
            setSettings(prev => ({ ...prev, ...s }));
            setUsers(u || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await adminUpdateSettings(settings);
            alert('Precios actualizados');
        } catch (error) {
            alert('Error updating: ' + error.message);
        }
    };

    const handleRechargeUser = async (user) => {
        const amountStr = prompt(`Recargar saldo a ${user.full_name || user.email}.\nIngrese monto en Coins:`, '10000');
        if (!amountStr) return;

        const amount = Number(amountStr);
        if (isNaN(amount) || amount <= 0) return alert('Monto inválido');

        try {
            await adminManualRecharge(user.id, amount);
            alert(`¡Recarga de $${amount} exitosa!`);
            loadData(); // Refresh list to see new balance
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.email && u.email.toLowerCase().includes(filter.toLowerCase())) ||
        (u.full_name && u.full_name.toLowerCase().includes(filter.toLowerCase())) ||
        (u.role && u.role.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text)' }}>
                    <ArrowLeft size={20} /> Dashboard
                </button>
                <h1 style={{ margin: 0 }}>Super Admin</h1>
                <div style={{ width: '100px' }}></div> {/* Spacer */}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
                <button
                    onClick={() => setActiveTab('users')}
                    style={{
                        background: 'none', border: 'none',
                        padding: '10px 20px',
                        borderBottom: activeTab === 'users' ? '3px solid var(--color-primary)' : 'none',
                        fontWeight: activeTab === 'users' ? 'bold' : 'normal',
                        cursor: 'pointer', color: 'var(--color-text)'
                    }}
                >
                    <Users size={16} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Usuarios ({users.length})
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                        background: 'none', border: 'none',
                        padding: '10px 20px',
                        borderBottom: activeTab === 'settings' ? '3px solid var(--color-primary)' : 'none',
                        fontWeight: activeTab === 'settings' ? 'bold' : 'normal',
                        cursor: 'pointer', color: 'var(--color-text)'
                    }}
                >
                    <Settings size={16} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Configuración
                </button>
            </div>

            {/* Content */}
            {activeTab === 'users' && (
                <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, email..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                style={{ paddingLeft: '35px', width: '100%' }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Usuario</th>
                                    <th style={{ padding: '10px' }}>Rol</th>
                                    <th style={{ padding: '10px' }}>Saldo</th>
                                    <th style={{ padding: '10px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{user.full_name || 'Sin Nombre'}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user.email}</div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{
                                                background: user.role === 'admin' ? '#F59E0B' : '#3B82F6',
                                                color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#10B981' }}>
                                            ${user.balance?.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <button
                                                onClick={() => handleRechargeUser(user)}
                                                style={{
                                                    background: 'var(--color-card)', border: '1px solid var(--color-border)',
                                                    cursor: 'pointer', padding: '5px 10px', borderRadius: '4px',
                                                    display: 'flex', alignItems: 'center', gap: '5px'
                                                }}
                                            >
                                                <DollarSign size={14} /> Recargar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div style={{ maxWidth: '500px' }}>
                    <h3 style={{ marginTop: 0 }}>Precios del Sistema (SaaS)</h3>
                    <p style={{ opacity: 0.7 }}>Define cuánto cuesta crear cada tipo de evento.</p>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Precio Bingo (Coins)</label>
                        <input
                            type="number"
                            value={settings.bingo_price}
                            onChange={e => setSettings({ ...settings, bingo_price: e.target.value })}
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Precio Rifa (Coins)</label>
                        <input
                            type="number"
                            value={settings.raffle_price}
                            onChange={e => setSettings({ ...settings, raffle_price: e.target.value })}
                        />
                    </div>

                    <button onClick={handleSaveSettings} className="primary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Save size={18} /> Guardar Cambios
                    </button>
                </div>
            )}
        </div>
    );
};

export default SuperAdminPanel;
