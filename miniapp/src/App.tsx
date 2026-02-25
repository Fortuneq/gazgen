import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ExplorePage from './pages/ExplorePage'
import DetailPage from './pages/DetailPage'
import SearchPage from './pages/SearchPage'
import GeneratePage from './pages/GeneratePage'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/post/:id" element={<DetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/generate/:postId" element={<GeneratePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
