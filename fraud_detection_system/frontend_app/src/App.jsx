import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import QuickCheckPage from './pages/QuickCheckPage';
import AdvancedCheckPage from './pages/AdvancedCheckPage';

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar tạm thời */}
      <nav className="bg-white shadow px-8 py-4 flex items-center gap-6">
        <div className="flex items-center gap-2 mr-auto">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Fraud System</h2>
        </div>
        
        <Link 
          to="/" 
          className={`font-medium px-3 py-2 rounded-md transition-colors ${
            location.pathname === '/' 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          Quick Check
        </Link>
        <Link 
          to="/admin" 
          className={`font-medium px-3 py-2 rounded-md transition-colors ${
            location.pathname === '/admin' 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          Advanced Check
        </Link>
      </nav>

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<QuickCheckPage />} />
          <Route path="/admin" element={<AdvancedCheckPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
