import { Navigate, useInRouterContext, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  const token = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  const loggedIn = isAuthenticated || (token != 'loggedOut' && userId);
  console.log("checking:")
  console.log(loggedIn)
  console.log("isauthent")
  console.log(isAuthenticated)
  console.log(token)
  console.log(userId)
  console.log(children.ProtectedRoute)
  console.log(location.pathname)
  //now remove reservations,inv,etc from header when not logged in
  if (location.pathname == "/")
  {
    return children;
  }

  return loggedIn ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;