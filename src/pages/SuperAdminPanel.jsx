import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Users, Settings, DollarSign, Search, Trash2, Gamepad2 } from 'lucide-react';
import { getSystemSettings, adminUpdateSettings, getAllProfiles, adminManualRecharge, getProfile, getAllAllGames, adminDeleteGame, adminDeleteUser } from '../utils/storage';

const SuperAdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'settings'
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Data State
    const [settings, setSettings] = useState({ bingo_price: '', raffle_price: '' });
    const [users, setUsers] = useState([]);
    const [games, setGames] = useState([]); // New state for games
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

    const [errorMsg, setErrorMsg] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            // Use allSettled to allow partial loading
            const results = await Promise.allSettled([
                getSystemSettings(),
                getAllProfiles(),
                getAllAllGames()
            ]);

            const [settingsRes, usersRes, gamesRes] = results;

            // Log for debugging (user can check console if directed, but we'll show UI error too)
            console.log("SuperAdmin Load Results:", results);

            if (settingsRes.status === 'fulfilled') {
                setSettings(prev => ({ ...prev, ...settingsRes.value }));
            } else {
                console.error("Settings failed:", settingsRes.reason);
                setErrorMsg(prev => (prev ? prev + "\n" : "") + "Error Settings: " + settingsRes.reason.message);
            }

            if (usersRes.status === 'fulfilled') {
                setUsers(usersRes.value || []);
            } else {
                console.error("Users failed:", usersRes.reason);
                setErrorMsg(prev => (prev ? prev + "\n" : "") + "Error Users: " + usersRes.reason.message);
            }

            if (gamesRes.status === 'fulfilled') {
                setGames(gamesRes.value || []);
            } else {
                console.error("Games failed:", gamesRes.reason);
                setErrorMsg(prev => (prev ? prev + "\n" : "") + "Error Games: " + gamesRes.reason.message);
            }

        } catch (error) {
            console.error(error);
            setErrorMsg("Critical Error: " + error.message);
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

    const handleDeleteGame = async (gameId, type) => {
        if (!confirm(`¿Estás seguro de ELIMINAR este juego? ¡No se puede deshacer!`)) return;
        try {
            await adminDeleteGame(gameId, type);
            alert('Juego eliminado');
            loadData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm(`⚠️ PELIGRO ⚠️\n¿Eliminar este usuario y TODOS sus datos?\nEsto borrará sus bingos, rifas y tickets.`)) return;
        try {
            await adminDeleteUser(userId);
            alert('Usuario eliminado');
            loadData();
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

            {/* Debug/Error Alert */}
            {errorMsg && (
                <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5', padding: '15px', borderRadius: '8px', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
                    <strong>⚠️ Error Cargando Datos:</strong><br />
                    {errorMsg}
                </div>
            )}

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
                    onClick={() => setActiveTab('games')}
                    style={{
                        background: 'none', border: 'none',
                        padding: '10px 20px',
                        borderBottom: activeTab === 'games' ? '3px solid var(--color-primary)' : 'none',
                        fontWeight: activeTab === 'games' ? 'bold' : 'normal',
                        cursor: 'pointer', color: 'var(--color-text)'
                    }}
                >
                    <Gamepad2 size={16} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Juegos ({games.length})
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
                                        <td style={{ padding: '10px', display: 'flex', gap: '5px' }}>
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
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                style={{
                                                    background: '#ef4444', border: 'none', color: 'white',
                                                    cursor: 'pointer', padding: '5px 10px', borderRadius: '4px'
                                                }}
                                                title="Eliminar Usuario"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'games' && (
                <div>
                    <h3 style={{ marginTop: 0 }}>Gestión de Juegos</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Juego</th>
                                    <th style={{ padding: '10px' }}>Dueño</th>
                                    <th style={{ padding: '10px' }}>Tipo</th>
                                    <th style={{ padding: '10px' }}>Estado</th>
                                    <th style={{ padding: '10px' }}>Creado</th>
                                    <th style={{ padding: '10px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {games.map(game => (
                                    <tr key={game.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{game.name}</td>
                                        <td style={{ padding: '10px' }}>
                                            {game.owner?.full_name || 'Desconocido'}<br />
                                            <small style={{ opacity: 0.7 }}>{game.owner?.email}</small>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{
                                                background: game.type === 'BINGO' ? '#8b5cf6' : '#ec4899',
                                                color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem'
                                            }}>
                                                {game.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px', fontSize: '0.9rem' }}>{game.status}</td>
                                        <td style={{ padding: '10px', fontSize: '0.8rem' }}>
                                            {new Date(game.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <button
                                                onClick={() => handleDeleteGame(game.id, game.type)}
                                                style={{
                                                    background: '#ef4444', border: 'none', color: 'white',
                                                    cursor: 'pointer', padding: '5px 10px', borderRadius: '4px',
                                                    display: 'flex', alignItems: 'center', gap: '5px'
                                                }}
                                            >
                                                <Trash2 size={14} /> Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {games.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                                            No hay juegos creados aún.
                                        </td>
                                    </tr>
                                )}
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
