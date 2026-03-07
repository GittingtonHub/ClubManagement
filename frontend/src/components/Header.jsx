import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';


function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const currentUsername = user?.username || localStorage.getItem('userUsername') || 'Profile';

  const handleShowProfile = () => {
    navigate('/profile');
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
      localStorage.setItem('isAuthenticated',false)
      localStorage.setItem('authToken', 'loggedOut')
      navigate('/login');
    } else {
      navigate('/login');
    }

  };


  function RenderNavLink({destination, destText})
  {
    if (destText ==  "Home")
    {
       return <NavLink to= {destination} >{destText}</NavLink>
    }
    let auth = localStorage.getItem('isAuthenticated')
    console.log("isauth" + auth)
    if (auth == 'true')
    {
      return <NavLink to= {destination} >{destText}</NavLink>
    }
    else
    {
      return
    }
  };

  return (
    <header>
        <h1>Club Management</h1>

        <div className="topnav">
        {/* <NavLink 
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
        </NavLink> */}
         <RenderNavLink destination ="/" destText={"Home"}>

        </RenderNavLink>
         <RenderNavLink destination ="/inventory" destText={"Inventory"}>

        </RenderNavLink>
        <RenderNavLink destination ="/reservations" destText={"Reservations"}>

        </RenderNavLink>
         <RenderNavLink destination ="/users" destText={"Users"}>

        </RenderNavLink>
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