import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ExplorePage from './pages/ExplorePage'
import DetailPage from './pages/DetailPage'
import SearchPage from './pages/SearchPage'
import GeneratePage from './pages/GeneratePage'

const AnimatePage = lazy(() => import('./pages/AnimatePage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

const loadingFallback = (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    minBlockSize: '100dvh',
  }}>
    <div style={{
      width: 32,
      height: 32,
      borderRadius: '50%',
      border: '3px solid var(--border)',
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.7s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={loadingFallback}>
          <Routes>
            <Route path="/" element={<ExplorePage />} />
            <Route path="/post/:id" element={<DetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/generate/:postId" element={<GeneratePage />} />
            <Route path="/animate" element={<AnimatePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}
