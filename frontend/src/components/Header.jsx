import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';

function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  
  const currentUsername = user?.username || localStorage.getItem('userUsername') || 'Profile';
  // Grab the role so we know what to show them!
  const userRole = user?.role || localStorage.getItem('userRole');

  const handleShowProfile = () => {
    navigate('/profile');
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
      localStorage.setItem('isAuthenticated', false);
      localStorage.setItem('authToken', 'loggedOut');
      localStorage.removeItem('userRole'); // Crucial: clear the role on logout!
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <header>
        <h1>Club Management</h1>

        <div className="topnav">
          {/* EVERYONE SEES THIS */}
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? "active" : ""}
          >
            Home
          </NavLink>

          <NavLink 
            to="/reservations" 
            className={({ isActive }) => isActive ? "active" : ""}
            >
            Reservations
          </NavLink>
          
          {/* ONLY ADMINS SEE THESE */}
          {userRole === 'admin' && (
            <>
              <NavLink 
                to="/inventory" 
                className={({ isActive }) => isActive ? "active" : ""}
              >
                Inventory
              </NavLink>

              <NavLink 
                to="/users" 
                className={({ isActive }) => isActive ? "active" : ""}
              >
                Users
              </NavLink>
            </>
          )}

        </div>

          <div className="login">
          <button onClick={handleShowProfile} className="profile-title-button" type="button">
            <h2 className="profile-title-heading">Hi, {currentUsername}</h2>
          </button>

          <button onClick={handleAuthClick}>
            {isAuthenticated ? 'Logout' : 'Login'}
          </button>
        </div>
        
    </header>
  );
}

export default Header;
