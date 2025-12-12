import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import TVMode from './pages/TVMode'
import PlayerView from './pages/PlayerView'
import RaffleDashboard from './pages/RaffleDashboard'
import RaffleTV from './pages/RaffleTV'
import RafflePublic from './pages/RafflePublic'

import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Admin Routes - Protected */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                <Route path="/tv/:gameId" element={<TVMode />} />
                <Route path="/play/:token" element={<PlayerView />} />

                {/* Raffle Routes */}
                <Route path="/raffle-dashboard" element={
                    <ProtectedRoute>
                        <RaffleDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/raffle-tv/:raffleId" element={<RaffleTV />} />
                <Route path="/raffle/:raffleId" element={<RafflePublic />} />
            </Routes>
        </div>
    )
}

export default App
