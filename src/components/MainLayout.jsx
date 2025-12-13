import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getWallet, getProfile } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import {
    LayoutDashboard,
    Ticket,
    LogOut,
    Wallet,
    Menu,
    X,
    Palette
} from 'lucide-react';

const MainLayout = ({ children }) => {
    const { currentTheme, setCurrentTheme, themes } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop
    const [wallet, setWallet] = useState({ balance: 0 });
    const [profile, setProfile] = useState(null);

    // Refresh wallet on mount and when needed (simple polling or event could be added later)
    const loadUserData = async () => {
        try {
            const [w, p] = await Promise.all([getWallet(), getProfile()]);
            if (w) setWallet(w);
            if (p) setProfile(p);
        } catch (e) {
            console.error("Layout data error:", e);
        }
    };

    useEffect(() => {
        loadUserData();
        // Optional: Interval to refresh wallet
        const interval = setInterval(loadUserData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Bingo', icon: <LayoutDashboard size={20} /> },
        { path: '/raffle-dashboard', label: 'Rifas', icon: <Ticket size={20} /> },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>

            {/* Mobile Menu Toggle */}
            <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 1000, padding: '10px', display: 'none' }} // Visible only on mobile via CSS if needed
                className="mobile-toggle"
            >
                {isSidebarOpen ? <X /> : <Menu />}
            </button>

            {/* Sidebar */}
            <aside style={{
                width: isSidebarOpen ? '260px' : '0',
                transition: 'width 0.3s ease',
                overflow: 'hidden',
                background: 'var(--color-card)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                position: 'sticky',
                top: 0,
                height: '100vh'
            }}>
                <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>JuegAIA</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Admin Panel</p>
                </div>

                <nav style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: location.pathname === item.path ? 'white' : 'var(--color-text-muted)',
                                background: location.pathname === item.path ? 'var(--color-primary)' : 'transparent',
                                transition: 'all 0.2s',
                                fontWeight: 500
                            }}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                    {/* Theme Selector - Compact */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            <Palette size={16} /> Tema
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            {Object.values(themes).map(t => (
                                <button
                                    key={t.id}
                                    title={t.name}
                                    onClick={() => setCurrentTheme(t.id)}
                                    style={{
                                        width: '100%',
                                        aspectRatio: '1',
                                        background: t.colors.primary,
                                        border: currentTheme === t.id ? '2px solid white' : '2px solid transparent',
                                        padding: 0,
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        boxShadow: currentTheme === t.id ? '0 0 0 2px var(--color-accent)' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {themes[currentTheme].name}
                        </div>
                    </div>

                    {/* User Info */}
                    <div style={{ marginBottom: '1rem', background: 'var(--color-bg)', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{profile?.full_name || 'Usuario'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '4px' }}>
                            <Wallet size={14} />
                            {wallet.balance.toLocaleString()}
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--color-text)'
                        }}
                    >
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
