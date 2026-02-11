import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';


function Header() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <header>
        <h1>Club Management</h1>

        <div className="topnav">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? "active" : ""}
        >
          Home
        </NavLink>
        <NavLink 
          to="/inventory" 
          className={({ isActive }) => isActive ? "active" : ""}
        >
          Inventory
        </NavLink>
        <NavLink 
          to="/reservations" 
          className={({ isActive }) => isActive ? "active" : ""}
        >
          Reservations
        </NavLink>
      </div>

        <div className="login">
        <button onClick={handleAuthClick}>
          {isAuthenticated ? 'Logout' : 'Login'}
        </button>
      </div>
        
    </header>
  );
}

export default Header;