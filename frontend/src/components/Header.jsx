import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';

function Header() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Get email from localStorage and extract username
  const email = localStorage.getItem("userEmail");
  const username = email ? email.split("@")[0] : null;

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
      localStorage.clear();
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
        {isAuthenticated && username && (
          <span style={{ marginRight: "12px" }}>
            Hey <strong>{username}</strong> 👋
          </span>
        )}

        <button onClick={handleAuthClick}>
          {isAuthenticated ? 'Logout' : 'Login'}
        </button>
      </div>
        
    </header>
  );
}

export default Header;