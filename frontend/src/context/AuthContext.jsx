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
      await fetch('/api/logout.php', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await fetch('/api/validate-session.php', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setIsAuthenticated(true);
            setUser(data.user);
          } else {
            localStorage.removeItem('authToken');
          }
        } catch (error) {
          localStorage.removeItem('authToken');
        }
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