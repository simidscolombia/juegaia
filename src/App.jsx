import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import BingoDashboard from './pages/BingoDashboard'
import TVMode from './pages/TVMode'
import PlayerView from './pages/PlayerView'
import RaffleDashboard from './pages/RaffleDashboard'
import RaffleTV from './pages/RaffleTV'
import RafflePublic from './pages/RafflePublic'
import GameAdmin from './pages/GameAdmin'
import BingoLobby from './pages/BingoLobby'

import Login from './pages/Login'
import Register from './pages/Register'
import Recharge from './pages/Recharge'
import Network from './pages/Network'
import SuperAdminPanel from './pages/SuperAdminPanel'
import PlayerLobby from './pages/PlayerLobby'
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

                <Route path="/bingos" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <BingoDashboard />
                        </MainLayout>
                    </ProtectedRoute>
                } />

                <Route path="/raffles" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <RaffleDashboard />
                        </MainLayout>
                    </ProtectedRoute>
                } />

                <Route path="/recharge" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Recharge />
                        </MainLayout>
                    </ProtectedRoute>
                } />

                <Route path="/network" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Network />
                        </MainLayout>
                    </ProtectedRoute>
                } />

                {/* Player Specific Routes */}
                <Route path="/my-lobby" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <PlayerLobby />
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
