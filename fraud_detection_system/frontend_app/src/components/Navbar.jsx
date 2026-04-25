import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  const location = useLocation()

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">FraudGuard</Link>
      </div>
      <ul className="nav-links">
        <li>
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Quick Check
          </Link>
        </li>
        <li>
          <Link 
            to="/admin" 
            className={location.pathname === '/admin' ? 'active' : ''}
          >
            Advanced Analysis
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar
