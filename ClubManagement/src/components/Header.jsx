import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';


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
    // The header should snap to the top of the page
    <header>
        <h1>Club Management</h1>

        <div className="topnav">
            <a className="" href="#home">Home</a>
            <a className="active" href="#inventory">Inventory</a>
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