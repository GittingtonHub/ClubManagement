import { Navigate, useInRouterContext, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  // TODO: Add token/session validation with backend
  // Should verify token/session is still valid before rendering
  const { isAuthenticated } = useAuth();
  //console.log(isAuthenticated)
  //console.log(useLocation)
  //console.log(window.location.href)
  let path = window.location.href
  //console.log(path)
  //console.log(path.charAt(path.length-1))
 // console.log(path.charAt(path.length) == "/")
  if (path.charAt(path.length) == "/")
  {
   // console.log("check")
    return isAuthenticated ? children : <Navigate to="/" replace />;
  }

  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;