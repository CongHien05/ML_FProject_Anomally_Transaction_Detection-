import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import QuickCheckPage from './pages/user/QuickCheckPage'
import AdvancedCheckPage from './pages/admin/AdvancedCheckPage'
import Navbar from './components/Navbar'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<QuickCheckPage />} />
            <Route path="/admin" element={<AdvancedCheckPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
