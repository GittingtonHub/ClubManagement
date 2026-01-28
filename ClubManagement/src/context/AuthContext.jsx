import { createContext, useContext, useState } from 'react';

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

  const logout = () => {
    // TODO: Replace with actual API call to invalidate session
    // Should call PHP backend to destroy session
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);