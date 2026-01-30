import { createContext, useContext, useState } from 'react';
import { useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // TODO: Replace with actual backend authentication state
  // Should check session/token with PHP backend on mount
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const login = (userData) => {
    // TODO: Replace with actual API call to PHP backend
    // Should send credentials to backend and receive token/session
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = async () => {
    try {
      // this is a placeholder for an actual API call to log out
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear client state regardless of API call success
      setIsAuthenticated(false);
      setUser(null);
    }
  };


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/check-session.php', {
          credentials: 'include' // This sends the PHP session cookie
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUser(data.user);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);