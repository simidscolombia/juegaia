import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Ticket } from 'lucide-react';

const Landing = () => (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
        <h1 style={{ fontSize: '4rem', margin: 0 }}>🎲 JuegAIA</h1>
        <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>La plataforma global de Bingos y Rifas</p>
        <Link to="/dashboard">
            <button style={{ fontSize: '1.2rem', padding: '1rem 2rem', background: '#e94560', color: 'white', marginRight: '1rem' }}>
                <Play size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                Bingo
            </button>
        </Link>
        <Link to="/raffle-dashboard">
            <button style={{ fontSize: '1.2rem', padding: '1rem 2rem', background: '#ffd166', color: 'black', fontWeight: 'bold' }}>
                <Ticket size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                Rifas
            </button>
        </Link>
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>¿Tienes un código de juego?</p>
            <input type="text" placeholder="Ingresa tu código aquí" style={{ marginTop: '0.5rem', padding: '0.5rem' }} disabled />
        </div>
    </div>
);

export default Landing;
