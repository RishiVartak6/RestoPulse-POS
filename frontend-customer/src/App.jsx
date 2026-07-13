import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import MenuPage from './pages/MenuPage'
import CartPage from './pages/CartPage'
import OrderStatusPage from './pages/OrderStatusPage'
import BillPage from './pages/BillPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60000 } },
})

function HomeRedirect() {
  const [searchParams] = useSearchParams()
  const table = searchParams.get('table')
  if (table) return <Navigate to={`/menu?table=${table}`} replace />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
      <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>📱</span>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>Scan the QR Code</h1>
      <p style={{ color: '#94a3b8' }}>Please scan the QR code on your table to view the menu and place an order.</p>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1a28',
              color: '#f1f5f9',
              border: '1px solid #2a2a3d',
              borderRadius: '12px',
              fontSize: '0.875rem',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/order-status" element={<OrderStatusPage />} />
          <Route path="/bill" element={<BillPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
