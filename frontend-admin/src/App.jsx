import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Menu from './pages/Menu'
import Categories from './pages/Categories'
import Tables from './pages/Tables'
import Orders from './pages/Orders'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import SalesRecords from './pages/SalesRecords'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
})

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a28',
              color: '#f1f5f9',
              border: '1px solid #2a2a3d',
              borderRadius: '10px',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/tables" element={<Tables />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/sales-records" element={<SalesRecords />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
