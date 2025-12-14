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
    Palette,
    Home
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
        { path: '/dashboard', label: 'Inicio', icon: <Home size={20} /> },
        { path: '/bingos', label: 'Bingos', icon: <LayoutDashboard size={20} /> },
        { path: '/raffles', label: 'Rifas', icon: <Ticket size={20} /> },
    ];

    return (
        <div style={{
            display: 'flex',
            height: '100vh', // Fixed height
            overflow: 'hidden', // Prevent body scroll
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            flexDirection: 'column'
        }}>

            {/* Desktop Sidebar */}
            <aside className="desktop-sidebar" style={{
                width: '260px',
                background: 'var(--color-card)',
                borderRight: '1px solid var(--color-border)',
                display: 'none',
                flexDirection: 'column',
                height: '100%', // Full height of container
                overflowY: 'auto' // Independent scroll
            }}>
                <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
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

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
                    {/* Theme Selector */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
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
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem', background: 'var(--color-bg)', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{profile?.full_name || 'Usuario'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '4px' }}>
                            <Wallet size={14} />
                            {wallet.balance.toLocaleString()}
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--color-border)', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', color: 'var(--color-text)' }}>
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="mobile-header" style={{
                padding: '1rem',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-card)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0 // Don't shrink
            }}>
                <div style={{ fontWeight: 'bold' }}>JuegAIA</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => {
                            const keys = Object.keys(themes);
                            const nextIndex = (keys.indexOf(currentTheme) + 1) % keys.length;
                            setCurrentTheme(keys[nextIndex]);
                        }}
                        style={{ padding: '5px', borderRadius: '50%', width: '30px', height: '30px', background: themes[currentTheme].colors.primary, border: '2px solid white' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <Wallet size={16} />
                        {wallet.balance.toLocaleString()}
                    </div>
                    <button onClick={handleLogout} style={{ background: 'transparent', padding: '5px' }}>
                        <LogOut size={20} color="var(--color-text-muted)" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1,
                padding: '1rem',
                paddingBottom: '80px',
                overflowY: 'auto', // Scroll ONLY here
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav" style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                background: 'var(--color-card)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-around',
                padding: '10px 0',
                zIndex: 100,
                boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
            }}>
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                            color: location.pathname === item.path ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            fontSize: '0.8rem',
                            fontWeight: 500
                        }}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                ))}
            </nav>

            <style>{`
                @media (min-width: 768px) {
                    /* Desktop Layout */
                    div[style*="flex-direction: column"] {
                        flex-direction: row !important;
                    }
                    .desktop-sidebar {
                        display: flex !important;
                    }
                    .mobile-header {
                        display: none !important;
                    }
                    .mobile-bottom-nav {
                        display: none !important;
                    }
                    main {
                        padding: 2rem !important;
                        padding-bottom: 2rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default MainLayout;
