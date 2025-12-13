import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import TVMode from './pages/TVMode'
import PlayerView from './pages/PlayerView'
import RaffleDashboard from './pages/RaffleDashboard'
import RaffleTV from './pages/RaffleTV'
import RafflePublic from './pages/RafflePublic'
import GameAdmin from './pages/GameAdmin'
import BingoLobby from './pages/BingoLobby'

import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/MainLayout'

function App() {
    return (
        <div style={{ width: '100%', height: '100vh', background: 'var(--color-bg)' }}>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Admin Routes - Protected & Layout Wrapped */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Dashboard />
                        </MainLayout>
                    </ProtectedRoute>
                } />

                <Route path="/manage/:gameId" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <GameAdmin />
                        </MainLayout>
                    </ProtectedRoute>
                } />

                <Route path="/raffle-dashboard" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <RaffleDashboard />
                        </MainLayout>
                    </ProtectedRoute>
                } />

                <Route path="/tv/:gameId" element={<TVMode />} />
                <Route path="/play/:gameId" element={<PlayerView />} />

                {/* Raffle Routes - Public/TV no layout */}
                <Route path="/raffle-tv/:raffleId" element={<RaffleTV />} />
                <Route path="/raffle/:raffleId" element={<RafflePublic />} />

                {/* Public Bingo Lobby */}
                <Route path="/bingo/:gameId/join" element={<BingoLobby />} />
            </Routes>
        </div>
    )
}

export default App
