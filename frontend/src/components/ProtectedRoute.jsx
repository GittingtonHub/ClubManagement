import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  const token = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  const loggedIn = isAuthenticated || (token && userId);

  return loggedIn ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;