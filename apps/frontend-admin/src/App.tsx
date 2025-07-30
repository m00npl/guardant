import { Routes, Route, Navigate } from 'react-router-dom'
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
import { Login } from './pages/Login'
import { useAuthStore } from './stores/authStore'

function App() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Login />
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