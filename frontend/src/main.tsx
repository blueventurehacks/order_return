import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import AppTest from './App_test'
import ReturnsByCompany from './pages/list_returns'
import './styles.css'

const container = document.getElementById('root')!
createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/returns" element={<ReturnsByCompany />} />
        <Route path="/test" element={<AppTest />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
