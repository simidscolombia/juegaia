import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
    midnight: {
        id: 'midnight',
        name: 'Midnight Slate',
        colors: {
            bg: '#0f172a',
            card: '#1e293b',
            primary: '#6366f1', // Indigo
            accent: '#10b981',  // Emerald
            text: '#f8fafc',
            textMuted: '#94a3b8',
            border: '#334155'
        }
    },
    ocean: {
        id: 'ocean',
        name: 'Ocean Blue',
        colors: {
            bg: '#0f2942',
            card: '#14425c',
            primary: '#0ea5e9', // Sky
            accent: '#f472b6',  // Pink
            text: '#f0f9ff',
            textMuted: '#bae6fd',
            border: '#1e5f7a'
        }
    },
    forest: {
        id: 'forest',
        name: 'Forest Essence',
        colors: {
            bg: '#052e16',
            card: '#14532d',
            primary: '#22c55e', // Green
            accent: '#fbbf24',  // Amber
            text: '#f0fdf4',
            textMuted: '#bbf7d0',
            border: '#166534'
        }
    },
    sunset: {
        id: 'sunset',
        name: 'Sunset Vibes',
        colors: {
            bg: '#2e1065',
            card: '#4c1d95',
            primary: '#f97316', // Orange
            accent: '#c084fc',  // Violet
            text: '#fff1f2',
            textMuted: '#fbcfe8',
            border: '#6d28d9'
        }
    },
    light: {
        id: 'light',
        name: 'Clean Light',
        colors: {
            bg: '#f8fafc',      // Slate-50
            card: '#ffffff',    // White
            primary: '#3b82f6', // Blue-500
            accent: '#ef4444',  // Red-500
            text: '#0f172a',    // Slate-900
            textMuted: '#64748b', // Slate-500
            border: '#e2e8f0'   // Slate-200
        }
    },
    pastel: {
        id: 'pastel',
        name: 'Pastel Dream',
        colors: {
            bg: '#fdf4ff',      // Fuschia-50 (Very light pink)
            card: '#ffffff',    // White
            primary: '#d8b4fe', // Purple-300 (Soft Lavender)
            accent: '#fb7185',  // Rose-400
            text: '#4c1d95',    // Violet-900
            textMuted: '#86198f', // Magenta-800
            border: '#f0abfc'   // Fuschia-300
        }
    }
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState(() => {
        const saved = localStorage.getItem('app-theme');
        return THEMES[saved] ? saved : 'midnight';
    });

    useEffect(() => {
        const theme = THEMES[currentTheme];
        const root = document.documentElement;

        // Apply CSS Variables
        root.style.setProperty('--color-bg', theme.colors.bg);
        root.style.setProperty('--color-card', theme.colors.card);
        root.style.setProperty('--color-primary', theme.colors.primary);
        root.style.setProperty('--color-accent', theme.colors.accent);
        root.style.setProperty('--color-text', theme.colors.text);
        root.style.setProperty('--color-text-muted', theme.colors.textMuted);
        root.style.setProperty('--color-border', theme.colors.border);

        localStorage.setItem('app-theme', currentTheme);
    }, [currentTheme]);

    return (
        <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
