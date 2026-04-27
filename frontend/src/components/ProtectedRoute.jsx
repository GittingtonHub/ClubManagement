import { Navigate, useInRouterContext, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({children, requiredRole}) {
  const { isAuthenticated } = useAuth();
  const normalizedRole = (localStorage.getItem("userRole") || "").toLowerCase();

  const token = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  let canProceed = isAuthenticated || (token != 'loggedOut' && userId);

  console.log("role", requiredRole);
  console.log(children);
  console.log(localStorage.getItem("userRole"));


  if (requiredRole == "staff" && normalizedRole != "staff")
  {
    canProceed = false;
  }

  if (normalizedRole == "admin")
  {
    console.log("erm");
    canProceed = true;
  }



  if (location.pathname == "/")
  {
    return children;
  }
  console.log("log= ",children)

  return canProceed ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
