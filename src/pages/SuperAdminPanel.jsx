import { ArrowLeft, Save, Users, Settings, DollarSign, Search, Trash2, Gamepad2, Edit, Link } from 'lucide-react';
import { getSystemSettings, adminUpdateSettings, getAllProfiles, adminManualRecharge, getProfile, getAllAllGames, adminDeleteGame, adminDeleteUser, adminUpdateUserReferrer, adminUpdateUserRole } from '../utils/storage';

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
        if (p?.role !== 'admin' && p?.email !== 'elkindanielcastillo@gmail.com') {
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

            if (settingsRes.status === 'fulfilled') {
                setSettings(prev => ({ ...prev, ...settingsRes.value }));
            }
            if (usersRes.status === 'fulfilled') {
                setUsers(usersRes.value || []);
            }
            if (gamesRes.status === 'fulfilled') {
                setGames(gamesRes.value || []);
            }

        } catch (error) {
            console.error("Critical Error Loading Data:", error);
            setErrorMsg("Critical Error: " + (error.message || 'Unknown error'));
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

    const handleLinkReferrer = async (user) => {
        const code = prompt(`Ingresa el CÓDIGO de Referido del PADRE para vincular a:\n${user.email}\n\nActualmente referido por: ${user.referred_by || 'NADIE'}`);
        if (!code) return;

        try {
            await adminUpdateUserReferrer(user.email, code);
            alert('¡Usuario vinculado exitosamente!');
            loadData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleChangeRole = async (user) => {
        const newRole = prompt(`Cambiar rol para ${user.email}.\nEscribe 'admin' o 'player':`, user.role);
        if (!newRole) return;
        if (newRole !== 'admin' && newRole !== 'player') return alert("Rol inválido. Usa 'admin' o 'player'");

        try {
            await adminUpdateUserRole(user.id, newRole);
            alert(`Rol actualizado a ${newRole}`);
            loadData();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.email && u.email.toLowerCase().includes(filter.toLowerCase())) ||
        (u.full_name && u.full_name.toLowerCase().includes(filter.toLowerCase())) ||
        (u.role && u.role.toLowerCase().includes(filter.toLowerCase())) ||
        (u.referral_code && u.referral_code.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
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
                                placeholder="Buscar por nombre, email, código..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                style={{ paddingLeft: '35px', width: '100%' }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', background: 'rgba(255,255,255,0.05)' }}>
                                    <th style={{ padding: '12px' }}>Usuario</th>
                                    <th style={{ padding: '12px' }}>Códigos</th>
                                    <th style={{ padding: '12px' }}>Rol</th>
                                    <th style={{ padding: '12px' }}>Saldo</th>
                                    <th style={{ padding: '12px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{user.full_name || 'Sin Nombre'}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user.email}</div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div title="Código Propio" style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', fontSize: '0.75rem' }}>
                                                    🆔 {user.referral_code || 'N/A'}
                                                </div>
                                                <div title="Referido Por (Padre)" style={{ background: user.referred_by ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', fontSize: '0.75rem' }}>
                                                    🔗 {user.referred_by || 'HUÉRFANO'}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <button
                                                onClick={() => handleChangeRole(user)}
                                                style={{
                                                    background: 'none', border: '1px dashed var(--color-border)',
                                                    color: user.role === 'admin' ? '#F59E0B' : '#3B82F6',
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '5px'
                                                }}
                                            >
                                                {user.role} <Edit size={12} />
                                            </button>
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#10B981' }}>
                                            ${user.balance?.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => handleLinkReferrer(user)}
                                                style={{
                                                    background: 'var(--color-secondary)', border: '1px solid var(--color-border)',
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    padding: '6px', borderRadius: '6px', cursor: 'pointer'
                                                }}
                                                title="Asignar Referido Manualmente"
                                            >
                                                <Link size={16} color="#8b5cf6" />
                                            </button>
                                            <button
                                                onClick={() => handleRechargeUser(user)}
                                                style={{
                                                    background: 'var(--color-secondary)', border: '1px solid var(--color-border)',
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    padding: '6px', borderRadius: '6px', cursor: 'pointer'
                                                }}
                                                title="Recargar Saldo"
                                            >
                                                <DollarSign size={16} color="#10B981" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444',
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    padding: '6px', borderRadius: '6px', cursor: 'pointer'
                                                }}
                                                title="Eliminar Usuario"
                                            >
                                                <Trash2 size={16} color="#ef4444" />
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
