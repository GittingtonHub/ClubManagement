import { createContext, useContext, useEffect, useState } from 'react';
import useReservationNotifications from '../hooks/useReservationNotifications';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // TODO: Replace with actual backend authentication state
  // Should check session/token with PHP backend on mount
  // This is just a bandaid fix for now, should be replaced with a more secure form of persistence
     let isCurrently = false;

    //console.log(localStorage.getItem('authToken') == null)
    if (localStorage.getItem('authToken') !== 'loggedOut')
    {
      isCurrently = true;
          //change
     // console.log("Authtoken isnt null! proof: :" , localStorage.getItem('authToken'));
      
    }
    else
    {
      //console.log("Authtoken is null!proof: :" , localStorage.getItem('authToken'))
    }
        
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(isCurrently);

  const login = (userData) => {
    // TODO: Replace with actual API call to PHP backend
    // Should send credentials to backend and receive token/session
    setIsAuthenticated(true);
    setUser(userData); //userdata = to user+pass I believe
    //console.log(userData)
  };

  const logout = async () => {
    try {
      // this is a placeholder for an actual API call to log out
      // Call CheckSession API and delete current cookie
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear client state regardless of API call success
      setIsAuthenticated(false);
      setUser(null);
      // This part clears the frontend
    }
  };


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/check-session.php', {
          credentials: 'include' // This sends the PHP session cookie
        });
        // Check if stored Cookie is equal to stored Cookie
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) { 
        setIsAuthenticated(false);
        setUser(null);

      }
    };
    
    checkAuth();
  }, []);

  useReservationNotifications({
    enabled: isAuthenticated && Boolean(user?.id)
  });

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
