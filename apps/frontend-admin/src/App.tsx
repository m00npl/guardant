import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Services } from './pages/Services'
import { CreateService } from './pages/CreateService'
import { EditService } from './pages/EditService'
import { Regions } from './pages/Regions'
import { Settings } from './pages/Settings'
import { Widget } from './pages/Widget'
import { Workers } from './pages/Workers'
import { Team } from './pages/Team'
import { ApiKeys } from './pages/ApiKeys'
import { Subscription } from './pages/Subscription'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { useAuthStore } from './stores/authStore'

function App() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  // Show login/register pages without authentication
  if (!isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/create" element={<CreateService />} />
          <Route path="/services/:id/edit" element={<EditService />} />
          <Route path="/regions" element={<Regions />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/team" element={<Team />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/widget" element={<Widget />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  )
}

export default App